import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {webcrypto} from 'node:crypto';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {WebSocket} from 'ws';
const ROOT=fileURLToPath(new URL('..',import.meta.url)),tmp=await fs.mkdtemp(path.join(os.tmpdir(),'guest-v237-'));
const delay=ms=>new Promise(r=>setTimeout(r,ms)),ORIGIN='https://naokingu123-cloud.github.io',ADMIN='isolated-guest-admin';
const listener=net.createServer();listener.listen(0,'127.0.0.1');await once(listener,'listening');const port=listener.address().port;await new Promise(r=>listener.close(r));
const base='http://127.0.0.1:'+port,sockets=new Set(),contexts=[];
let log='',child;
async function request(route,{session,body,headers={}}={}){
 const response=await fetch(base+route,{method:body===undefined?'GET':'POST',headers:{origin:ORIGIN,'content-type':'application/json',...(session?{authorization:'Bearer '+session.token,'x-player-id':session.player.id}:{}),...headers},body:body===undefined?undefined:JSON.stringify(body)});
 return {status:response.status,body:await response.json(),headers:response.headers};
}
async function until(fn,label,ms=12000){const end=Date.now()+ms;while(Date.now()<end){const value=await fn();if(value)return value;await delay(70);}throw Error(label+'\n'+log);}
const [entry,core,p221,p224]=await Promise.all(['assets/guest-entry-v237.js','assets/shared-machine-core-v196.js','assets/shared-core-patch-v221.js','assets/shared-core-patch-v224.js'].map(p=>fs.readFile(path.join(ROOT,p),'utf8')));
function guest(storage=new Map(),denied=false){
 const timers=new Set(),calls=[];let stopped=false;
 class Socket extends WebSocket{
  constructor(url){const u=new URL(url);u.protocol='ws:';u.host='127.0.0.1:'+port;super(u);sockets.add(this);this.on('error',()=>{});}
 }
 const c={console:{info(){},warn(){},error(){}},URL,URLSearchParams,AbortController,WebSocket:Socket,crypto:webcrypto,queueMicrotask,
  location:new URL(ORIGIN+'/cookie-link/'),badge(){},closeServerGate(){},
  setTimeout(fn,ms){if(stopped)return 0;const id=setTimeout(()=>{timers.delete(id);fn();},ms);timers.add(id);return id;},clearTimeout(id){timers.delete(id);clearTimeout(id);},
  localStorage:{getItem(k){if(denied)throw Error('blocked');return storage.get(k)??null;},setItem(k,v){if(denied)throw Error('blocked');storage.set(k,v);}},
  fetch:async(url,options={})=>{
   const u=new URL(url);calls.push({path:u.pathname,method:options.method||'GET',authorization:!!options.headers?.Authorization});
   if(u.pathname.endsWith('shared-endpoint.json'))return {ok:true,json:async()=>({machine:'public-01',server:'https://guest-test.example'})};
   assert.equal(u.origin,'https://guest-test.example');
   return fetch(base+u.pathname+u.search,{...options,headers:{...options.headers,origin:ORIGIN}});
  }
 };c.window=c;vm.createContext(c);vm.runInContext(entry,c);vm.runInContext(p221,c);vm.runInContext(p224,c);
 const patched=c.SweetsGuestEntryV237.patch(c.SweetsSharedCorePatchV224.patch(core));
 const start=patched.indexOf('class Client{'),end=patched.indexOf('\nlet blockedRoundId',start);
 assert.ok(start>0&&end>start);
 // Execute the real public entry preamble and real Client.initialize, not a mock login.
 const source=patched.slice(0,patched.indexOf('function clone('))+patched.slice(start,end)+'\nglobalThis.guestClient=new Client();\n})();';
 vm.runInContext(source,c);
 const result={client:c.guestClient,calls,storage,stop(){stopped=true;for(const t of timers)clearTimeout(t);timers.clear();}};contexts.push(result);return result;
}
try{
 child=spawn(process.execPath,['server.mjs'],{cwd:ROOT,env:{...process.env,PORT:String(port),SWEETS_DATA_DIR:tmp,SWEETS_DATA_FILE:path.join(tmp,'core.json'),SWEETS_ADMIN_TOKEN:ADMIN,SWEETS_BET_DURATION_MS:'2200',SWEETS_PLAYER_STABLE_MS:'500',SWEETS_ROUND_START_DELAY_MS:'300',SWEETS_RESULT_GRACE_MS:'350'},stdio:['ignore','pipe','pipe']});
 child.stdout.on('data',v=>log+=v);child.stderr.on('data',v=>log+=v);
 await until(async()=>{if(child.exitCode!==null)throw Error(log);try{return (await request('/api/health')).status===200;}catch{return false;}},'server readiness');
 const preflight=await fetch(base+'/api/session',{method:'OPTIONS',headers:{Origin:ORIGIN,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type'}});
 assert.equal(preflight.status,204);assert.equal(preflight.headers.get('access-control-allow-origin'),ORIGIN);
 const host=(await request('/api/session',{body:{displayName:'PHYSICAL HOST'}})).body;
 const hs=new WebSocket(`ws://127.0.0.1:${port}/ws?machineId=public-01&playerId=${host.player.id}&token=${host.token}`);sockets.add(hs);await once(hs,'open');
 assert.equal((await request('/api/admin/machines/public-01/host/register?adminToken='+ADMIN,{session:host,body:{}})).status,200);
 const guests=[];
 for(let i=0;i<7;i++){
  const g=guest(new Map(),i===5);assert.equal(await g.client.ready,true);guests.push(g);
  assert.ok(g.client.playerId&&g.client.token);assert.equal(g.client.role,'player');
  assert.ok(g.calls.some(call=>call.path==='/api/session'&&call.method==='POST'&&!call.authorization),'no account or prior token required');
  assert.ok(!g.calls.some(call=>call.path.includes('/admin/')),'guests never request host/admin privileges');
 }
 assert.equal(new Set(guests.map(g=>g.client.playerId)).size,7,'new devices receive separate identities');
 const states=await Promise.all(guests.map(g=>g.client.getState()));
 assert.deepEqual(states.slice(0,6).map(s=>s.stations.selfStation),[1,2,3,4,5,6]);
 assert.equal(states[6].stations.waiting,true);assert.equal(states[6].stations.selfStation,null);
 assert.ok(states.every(s=>s.stations.seats.every(row=>!row.test)),'no simulated users');
 assert.equal((await request('/api/admin/machines/public-01',{session:{player:{id:guests[0].client.playerId},token:guests[0].client.token}})).status,403);
 const publicView=JSON.stringify(states[0].stations);for(const g of guests)assert.ok(!publicView.includes(g.client.token),'public roster never exposes a session token');
 const resumed=guest(guests[0].storage);assert.equal(await resumed.client.ready,true);assert.equal(resumed.client.playerId,guests[0].client.playerId);assert.equal((await resumed.client.getState()).stations.selfStation,1);
 await guests[5].client.initialize();assert.equal(guests[5].client.playerId,states[5].stations.seats[5].playerId,'blocked storage retains one in-memory guest during retries');
 const first=await until(async()=>{const s=(await request('/api/machines/public-01/state',{session:host})).body;return s.round?.phase==='PLAYING'?s.round:null;},'physical round');
 await delay(Math.max(0,first.drawStartsAt-Date.now()+30));
 for(let i=1;i<=8;i++)assert.equal((await request('/api/machines/public-01/round/ball',{session:host,body:{roundId:first.id,ballIndex:i,number:i}})).status,200);
 const next=await until(async()=>{const s=await guests[0].client.getState();return s.round?.id!==first.id&&s.round?.canBet?s:null;},'next eligible BET');
 for(const g of guests.slice(0,6)){
  const joined=await g.client.join({roundId:next.round.id,bets:[10],locked:[10],enabled:[true],totalBet:10,creditBefore:1000000,creditAfterBet:999990,clientRoundToken:'guest-fixture'});
  assert.equal(joined.round.participant.playerId,g.client.playerId);
 }
 await assert.rejects(guests[6].client.join({roundId:next.round.id,bets:[10],totalBet:10}),error=>error.status===409&&error.data.reason==='machine_full');
 console.log('PUBLIC_GUEST_LOGIN_V237_PASS: seven fresh devices, automatic sessions, six ordered seats, spectator overflow, protected admin, preserved identity');
}finally{
 for(const c of contexts)c.stop();for(const s of sockets)try{s.terminate();}catch{}
 if(child&&child.exitCode===null){const done=once(child,'exit');child.kill('SIGTERM');await done;}
 await fs.rm(tmp,{recursive:true,force:true});
}

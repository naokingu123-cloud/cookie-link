import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import os from 'node:os';
import path from 'node:path';
import {WebSocket} from 'ws';

const root=fileURLToPath(new URL('..',import.meta.url));
const temp=await mkdtemp(path.join(os.tmpdir(),'sweets-shared-'));
const port=33000+Math.floor(Math.random()*2000);
const base='http://127.0.0.1:'+port;
const adminToken='test-admin-token';
const child=spawn(process.execPath,['server.mjs'],{
 cwd:root,
 env:{...process.env,PORT:String(port),SWEETS_DATA_FILE:path.join(temp,'db.json'),SWEETS_ADMIN_TOKEN:adminToken,SWEETS_ROUND_START_DELAY_MS:'300',SWEETS_BALL_INTERVAL_MS:'300',SWEETS_CHECKPOINT_WAIT_MS:'1200'},
 stdio:['ignore','pipe','pipe']
});
let stderr='';child.stderr.on('data',chunk=>stderr+=chunk);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function waitForHealth(){
 for(let i=0;i<80;i++){try{const response=await fetch(base+'/api/health');if(response.ok)return;}catch{}await sleep(100);}
 throw Error('server did not start: '+stderr);
}
async function json(url,{method='GET',body,token,playerId}={}){
 const response=await fetch(base+url,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token,'X-Player-Id':playerId}:{})},body:body===undefined?undefined:JSON.stringify(body)});
 const data=await response.json();if(!response.ok)throw Object.assign(Error(data.error||String(response.status)),{data,status:response.status});return data;
}
function createInbox(ws){
 const queue=[],waiters=[];
 ws.on('message',raw=>{let message;try{message=JSON.parse(String(raw));}catch{return;}const i=waiters.findIndex(w=>w.predicate(message));if(i>=0){const [w]=waiters.splice(i,1);clearTimeout(w.timer);w.resolve(message);}else queue.push(message);});
 return {next(predicate=()=>true,timeout=5000){const i=queue.findIndex(predicate);if(i>=0)return Promise.resolve(queue.splice(i,1)[0]);return new Promise((resolve,reject)=>{const w={predicate,resolve,reject,timer:null};w.timer=setTimeout(()=>{const p=waiters.indexOf(w);if(p>=0)waiters.splice(p,1);reject(Error('websocket message timeout'));},timeout);waiters.push(w);});}};
}
function openSocket(session){
 return new Promise((resolve,reject)=>{const url='ws://127.0.0.1:'+port+'/ws?machineId=public-01&playerId='+encodeURIComponent(session.player.id)+'&token='+encodeURIComponent(session.token);const ws=new WebSocket(url),inbox=createInbox(ws);ws.once('open',()=>resolve({ws,inbox}));ws.once('error',reject);});
}
async function expectHttpError(fn,status){try{await fn();assert.fail('expected HTTP '+status);}catch(error){assert.equal(error.status,status);}}

let socketA,socketB;
try{
 await waitForHealth();
 const sessionA=await json('/api/session',{method:'POST',body:{displayName:'PLAYER A'}});
 const sessionB=await json('/api/session',{method:'POST',body:{displayName:'PLAYER B'}});
 socketA=await openSocket(sessionA);socketB=await openSocket(sessionB);
 await socketA.inbox.next(m=>m.type==='snapshot');await socketB.inbox.next(m=>m.type==='snapshot');
 const authA={token:sessionA.token,playerId:sessionA.player.id},authB={token:sessionB.token,playerId:sessionB.player.id};
 const joinedA=await json('/api/machines/public-01/round/join',{...authA,method:'POST',body:{clientRoundToken:'a',bets:[100],locked:[100],enabled:[true],totalBet:100,creditAfterBet:900,appVersion:'test'}});
 const joinedB=await json('/api/machines/public-01/round/join',{...authB,method:'POST',body:{clientRoundToken:'b',bets:[200],locked:[200],enabled:[true],totalBet:200,creditAfterBet:800,appVersion:'test'}});
 assert.equal(joinedA.role,'player');assert.equal(joinedB.role,'player');assert.equal(joinedA.round.id,joinedB.round.id);
 const roundId=joinedA.round.id;

 await expectHttpError(()=>json('/api/machines/public-01/round/ball',{...authA,method:'POST',body:{roundId,ballIndex:1,number:7}}),403);

 const seen=[];
 for(let index=1;index<=8;index++){
  const [a,b]=await Promise.all([
   socketA.inbox.next(m=>m.type==='ball_result'&&m.roundId===roundId&&m.ball?.index===index),
   socketB.inbox.next(m=>m.type==='ball_result'&&m.roundId===roundId&&m.ball?.index===index)
  ]);
  assert.equal(a.ball.number,b.ball.number);seen.push(a.ball.number);
  await Promise.all([
   json('/api/machines/public-01/round/checkpoint',{...authA,method:'POST',body:{roundId,ballIndex:index,state:{draws:[...seen],credit:900,totalWin:index*10,roundWins:[index*10]}}}),
   json('/api/machines/public-01/round/checkpoint',{...authB,method:'POST',body:{roundId,ballIndex:index,state:{draws:[...seen],credit:800,totalWin:index*20,roundWins:[index*20]}}})
  ]);
 }
 assert.equal(new Set(seen).size,8);

 const monitor=await json('/api/admin/machines/public-01?adminToken='+adminToken);
 assert.equal(monitor.machine.source,'server');assert.equal(monitor.round.balls.length,8);assert.equal(monitor.round.players.length,2);
 assert.equal(monitor.round.players.find(p=>p.displayName==='PLAYER A').roundWin,80);
 assert.equal(monitor.round.players.find(p=>p.displayName==='PLAYER B').currentCredit,800);

 const settlement=await json('/api/machines/public-01/round/settle',{...authB,method:'POST',body:{roundId,totalWin:250,creditAfter:1050,digest:'abc'}});
 assert.equal(settlement.settlement.totalWin,250);
 const again=await json('/api/machines/public-01/round/settle',{...authB,method:'POST',body:{roundId,totalWin:999,creditAfter:9999,digest:'changed'}});
 assert.equal(again.idempotent,true);assert.equal(again.settlement.totalWin,250);

 const monitorAfter=await json('/api/admin/machines/public-01?adminToken='+adminToken);
 const pb=monitorAfter.round.players.find(p=>p.displayName==='PLAYER B');
 assert.equal(pb.settled,true);assert.equal(pb.currentCredit,1050);assert.equal(pb.roundWin,250);
 console.log('server-authoritative multi-client monitor smoke test passed');
}finally{
 try{socketA?.ws.close();}catch{}try{socketB?.ws.close();}catch{}child.kill('SIGTERM');await sleep(100);await rm(temp,{recursive:true,force:true});
}
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {WebSocket} from 'ws';

// Real server + HTTP payout middleware + multiple WebSocket clients. The
// deterministic WIN values are protocol fixtures, not simulated game odds.
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'sweets-e2e-v225-'));
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const ADMIN='v225-e2e-admin';
const MACHINE='public-01';
const sessions=[];
let child,logs='',base='',port;

async function freePort(){
 const listener=net.createServer();
 await new Promise((resolve,reject)=>{listener.once('error',reject);listener.listen(0,'127.0.0.1',resolve);});
 const result=listener.address().port;
 await new Promise(resolve=>listener.close(resolve));
 return result;
}

async function request(route,{session,body,method=body===undefined?'GET':'POST',ip}={}){
 const response=await fetch(base+route,{
  method,
  headers:{'content-type':'application/json','cf-connecting-ip':ip||session?.ip||'192.0.2.1',...(session?{authorization:'Bearer '+session.token,'x-player-id':session.player.id}:{})},
  body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(5000)
 });
 const data=await response.json();
 return {status:response.status,headers:response.headers,data};
}

async function json(route,options){
 const result=await request(route,options);
 if(result.status>=400)throw Object.assign(new Error(route+': '+result.data.error),result);
 return result.data;
}

async function until(predicate,label,timeout=7000,interval=25){
 const deadline=Date.now()+timeout;
 while(Date.now()<deadline){if(await predicate())return;await delay(interval);}
 throw new Error(label+' timed out\n'+logs);
}

async function session(name,ip){
 const result=await json('/api/session',{ip,body:{displayName:name}});
 Object.assign(result,{name,ip,sockets:[],socket:null,credit:1000000,lifetimeBet:0,lifetimeWin:0,walletRevision:0});
 sessions.push(result);return result;
}

async function connect(client){
 const socket=new WebSocket(`ws://127.0.0.1:${port}/ws?machineId=${MACHINE}&playerId=${encodeURIComponent(client.player.id)}&token=${encodeURIComponent(client.token)}`);
 const record={socket,messages:[]};client.sockets.push(record);client.socket=socket;
 socket.on('message',raw=>{try{record.messages.push(JSON.parse(String(raw)));}catch{}});
 socket.on('error',()=>{});
 await once(socket,'open');
 await until(()=>record.messages.some(message=>message.type==='snapshot'),client.name+' connection snapshot');
 return record;
}

async function disconnect(client){
 if(client.socket?.readyState===WebSocket.OPEN){const closed=once(client.socket,'close');client.socket.close();await closed;}
 client.socket=null;
}

const messages=(client,type,roundId)=>client.sockets.flatMap(record=>record.messages).filter(message=>message.type===type&&(!roundId||(message.roundId||message.round?.id)===roundId));
const state=client=>json(`/api/machines/${MACHINE}/state`,{session:client});
async function waitState(client,predicate,label){
 let latest;
 await until(async()=>{latest=await state(client);return predicate(latest);},label,7000,120);
 return latest;
}

const gameRows=(client,win=0)=>[
 {id:'cookie',bet:client.bet*.6,win:Math.floor(win*.6),appliedRate:client.rate},
 {id:'choco',bet:client.bet*.4,win:win-Math.floor(win*.6),appliedRate:client.rate}
];

async function join(client,round){
 const observed=await state(client);
 assert.equal(observed.round.id,round.id);
 assert.equal(observed.round.canBet,true,client.name+' must be eligible for the new BET');
 assert.equal(observed.payoutControlV3.wallet.credit,client.credit);
 client.credit-=client.bet;
 const result=await json(`/api/machines/${MACHINE}/round/join`,{session:client,body:{
  clientRoundToken:'v225-e2e-'+round.id+'-'+client.name,
  totalBet:client.bet,bets:[client.bet*.6,client.bet*.4],locked:[client.bet*.6,client.bet*.4],enabled:[true,true],creditAfterBet:client.credit,
  appVersion:'v225-end-to-end',payoutV3Bet:{version:3,games:gameRows(client)}
 }});
 assert.equal(result.round.id,round.id);
 assert.equal(result.round.participant.playerId,client.player.id);
 assert.equal(result.round.participant.creditAfterBet,client.credit);
 assert.equal(result.payoutControlV3.wallet.credit,client.credit);
 assert.equal(result.payoutControlV3.wallet.revision,observed.payoutControlV3.wallet.revision+1);
 client.walletRevision=result.payoutControlV3.wallet.revision;
 assert.equal(result.payoutControlV3.version,3);
 assert.equal(result.payoutControlV3.source,'per-player-common');
 assert.equal(result.payoutControlV3.lifetimeBet,client.lifetimeBet,'BET reservation must not double-count settled turnover');
 client.rate=result.payoutControlV3.effectiveRate;
 assert.ok(client.rate>=50&&client.rate<=150);
 return result;
}

async function checkpoint(client,round,index,numbers,win){
 const result=await json(`/api/machines/${MACHINE}/round/checkpoint`,{session:client,body:{roundId:round.id,ballIndex:index,state:{
  phase:'playing',credit:client.credit,bets:[client.bet*.6,client.bet*.4],locked:[client.bet*.6,client.bet*.4],enabled:[true,true],paid:[false,false],draws:numbers.slice(0,index),roundWins:gameRows(client,win).map(game=>game.win),totalWin:win,
  payoutV3:{version:3,ball:index,number:numbers[index-1]||null,complete:true,phase:'PLAYING',credit:client.credit,roundBet:client.bet,roundWin:win,games:gameRows(client,win)}
 }}});
 assert.equal(result.checkpointBall,index);
 assert.equal(result.payoutControlV3.currentRoundWin,win);
 assert.equal(result.payoutControlV3.lifetimeWin,client.lifetimeWin,'per-ball feedback must not prematurely add lifetime WIN');
}

async function settle(client,round,win){
 const beforeRevision=client.walletRevision;
 const body={roundId:round.id,totalWin:win,creditAfter:client.credit+win,digest:'v225-e2e:'+round.id+':'+client.name,payoutV3:{version:3,games:gameRows(client,win)}};
 const first=await json(`/api/machines/${MACHINE}/round/settle`,{session:client,body});
 assert.equal(first.idempotent,false);
 assert.equal(first.settlement.totalWin,win);
 client.lifetimeBet+=client.bet;client.lifetimeWin+=win;client.credit+=win;
 client.walletRevision=first.payoutControlV3.wallet.revision;
 assert.equal(first.payoutControlV3.lifetimeBet,client.lifetimeBet);
 assert.equal(first.payoutControlV3.lifetimeWin,client.lifetimeWin);
 assert.equal(first.payoutControlV3.wallet.credit,client.credit);
 assert.equal(client.walletRevision,beforeRevision+1);
 assert.equal(first.payoutControlV3.games.cookie.bet,client.lifetimeBet*.6);
 assert.equal(first.payoutControlV3.games.choco.bet,client.lifetimeBet*.4);
 assert.equal(first.payoutControlV3.games.cookie.win+first.payoutControlV3.games.choco.win,client.lifetimeWin);
 // A retried result, including a conflicting amount, cannot change either
 // core settlement or payout-control totals/wallet a second time.
 const duplicate=await json(`/api/machines/${MACHINE}/round/settle`,{session:client,body:{...body,totalWin:win+9999,creditAfter:client.credit+9999}});
 assert.equal(duplicate.idempotent,true);
 assert.equal(duplicate.settlement.id,first.settlement.id);
 assert.equal(duplicate.settlement.totalWin,win);
 assert.equal(duplicate.payoutControlV3.lifetimeBet,client.lifetimeBet);
 assert.equal(duplicate.payoutControlV3.lifetimeWin,client.lifetimeWin);
 assert.equal(duplicate.payoutControlV3.wallet.credit,client.credit);
 assert.equal(duplicate.payoutControlV3.wallet.revision,client.walletRevision);
 return first;
}

async function ball(host,round,index,number){
 const result=await json(`/api/machines/${MACHINE}/round/ball`,{session:host,body:{roundId:round.id,ballIndex:index,number,eventId:round.id+':'+index}});
 assert.equal(result.ball.index,index);assert.equal(result.ball.number,number);assert.equal(result.ball.reportedBy,host.player.id);
 return result;
}

try{
 for(const filename of ['server.mjs','server-core.mjs','server-core-loader-v220.mjs','server-startup-sanitize-v217.mjs','server-rtc-preload.mjs','server-payout-preload-v3.mjs','server-stations-v235.mjs','package.json'])await fs.copyFile(path.join(ROOT,filename),path.join(temporary,filename));
 await fs.mkdir(path.join(temporary,'assets'),{recursive:true});
 await fs.copyFile(path.join(ROOT,'assets','jelly-rules.js'),path.join(temporary,'assets','jelly-rules.js'));
 const require=createRequire(import.meta.url);
 await fs.cp(path.dirname(require.resolve('ws/package.json')),path.join(temporary,'node_modules','ws'),{recursive:true});
 port=await freePort();base='http://127.0.0.1:'+port;
 child=spawn(process.execPath,['server.mjs'],{cwd:temporary,env:{...process.env,PORT:String(port),SWEETS_DATA_DIR:path.join(temporary,'data'),SWEETS_DATA_FILE:path.join(temporary,'data','db.json'),SWEETS_ADMIN_TOKEN:ADMIN,SWEETS_CONTINUOUS_PHYSICAL_ROUNDS:'1',SWEETS_PLAYER_STABLE_MS:'500',SWEETS_BET_DURATION_MS:'1000',SWEETS_ROUND_START_DELAY_MS:'300',SWEETS_RESULT_GRACE_MS:'700'},stdio:['ignore','pipe','pipe']});
 child.stdout.on('data',chunk=>{logs+=chunk;});child.stderr.on('data',chunk=>{logs+=chunk;});
 await until(async()=>{if(child.exitCode!==null)throw new Error(logs);try{return (await request('/api/health')).status===200;}catch{return false;}},'server readiness');
 const host=await session('PHYSICAL HOST','192.0.2.11'),a=await session('CLIENT A','192.0.2.12'),b=await session('CLIENT B','192.0.2.13');
 a.bet=100;b.bet=200;
 await Promise.all([connect(host),connect(a),connect(b)]);
 await delay(600);
 // An abusive poller must be isolated: existing physical rounds and players
 // continue, and the same poller can recover after its advertised delay.
 const floodIp='192.0.2.99';
 const flood=await Promise.all(Array.from({length:241},()=>request('/api/health',{ip:floodIp})));
 const blocked=flood.find(result=>result.status===429);
 assert.ok(blocked,'a flood must still trigger API protection');
 const floodRetryAt=Date.now()+blocked.data.retryAfterMs;
 // Start the BET clock only after the burst has finished, so slower CI
 // machines cannot consume the first short test BET window during setup.
 await json(`/api/admin/machines/${MACHINE}/host/register?adminToken=${ADMIN}`,{session:host,body:{}});
 // Replacing one host transport must not declare the physical host offline
 // while its second socket is already alive (for example during a reconnect).
 const oldHostSocket=host.socket;
 await connect(host);
 const oldHostClosed=once(oldHostSocket,'close');oldHostSocket.close();await oldHostClosed;await delay(75);
 assert.equal((await state(a)).machine.hostConnected,true,'the surviving host socket must keep hostConnected true');
 assert.equal(messages(a,'host_status').filter(message=>message.online===false).length,0,'closing one of two host sockets must not broadcast a false offline status');

 const results=[[40,300],[180,0],[90,180]];
 const roundIds=[];
 let nextBet=await waitState(a,response=>response.round?.phase==='BETTING'&&response.round.canBet,'initial eligible BET');
 for(let cycle=0;cycle<3;cycle++){
  const round=nextBet.round;roundIds.push(round.id);
  assert.equal(round.drawSource,'physical');
  if(cycle)assert.equal(round.sequence,cycle+1,'server must advance exactly one round per completed cycle');
  await join(a,round);await join(b,round);
  if(cycle===0){assert.equal(a.rate,90);assert.equal(b.rate,90);}
  if(cycle===1){assert.ok(a.rate>90,'low previous WIN must feed into the next quote');assert.ok(b.rate<90,'high previous WIN must feed into the next quote');}
  const playing=await waitState(a,response=>response.round?.id===round.id&&response.round.phase==='PLAYING','round '+(cycle+1)+' playing');
  await delay(Math.max(0,Number(playing.round.drawStartsAt)-Date.now()+35));
  const numbers=Array.from({length:8},(_,index)=>(index*3+cycle)%25+1);
  await checkpoint(a,round,0,numbers,0);await checkpoint(b,round,0,numbers,0);
  let reconnected=null;
  for(let index=1;index<=8;index++){
   await ball(host,round,index,numbers[index-1]);
   await until(()=>messages(a,'ball_result',round.id).some(message=>message.ball.index===index),'A ball '+index);
   if(!(cycle===1&&(index===4||index===5)))await until(()=>messages(b,'ball_result',round.id).some(message=>message.ball.index===index),'B ball '+index);
   await checkpoint(a,round,index,numbers,Math.floor(results[cycle][0]*index/8));
   if(cycle!==1||index<=3)await checkpoint(b,round,index,numbers,Math.floor(results[cycle][1]*index/8));
   if(index===3){
    const repeated=await ball(host,round,index,numbers[index-1]);
    assert.equal(repeated.idempotent,true,'a retried host event must not append a second ball');
    if(cycle===1){
     await disconnect(b);
     await settle(b,round,0); // v224 interruption policy: loss, no client replay.
    }
   }
   if(cycle===1&&index===5){
    reconnected=await connect(b);
    const snapshot=reconnected.messages.find(message=>message.type==='snapshot');
    assert.equal(snapshot.round.id,round.id);
    assert.deepEqual(snapshot.round.balls.map(item=>item.index),[1,2,3,4,5]);
    assert.equal(snapshot.round.participant.settlement.totalWin,0,'reconnect must preserve the one-time loss settlement');
    const forbiddenJoin=await request(`/api/machines/${MACHINE}/round/join`,{session:b,body:{totalBet:b.bet}});
    assert.equal(forbiddenJoin.status,409,'a reconnect cannot join an already running round');
    await delay(600); // Be continuously connected before the next BET opens.
    assert.equal((await state(a)).round.balls.length,5,'a live physical host must never receive synthetic balls');
   }
  }
  assert.deepEqual(messages(a,'ball_result',round.id).map(message=>message.ball.index),[1,2,3,4,5,6,7,8]);
  assert.deepEqual(messages(a,'ball_result',round.id).map(message=>message.ball.number),numbers);
  if(cycle===1){
   assert.deepEqual(messages(b,'ball_result',round.id).map(message=>message.ball.index),[1,2,3,6,7,8]);
   assert.deepEqual(reconnected.messages.filter(message=>message.type==='ball_result'&&message.roundId===round.id).map(message=>message.ball.index),[6,7,8]);
  }else assert.deepEqual(messages(b,'ball_result',round.id).map(message=>message.ball.number),numbers);
  await until(()=>messages(a,'round_complete',round.id).length===1&&messages(b,'round_complete',round.id).length===1,'one completion per client');
  await settle(a,round,results[cycle][0]);
  if(cycle!==1)await settle(b,round,results[cycle][1]);
  const monitor=await json(`/api/admin/machines/${MACHINE}?adminToken=${ADMIN}`,{session:host});
  assert.equal(monitor.round.id,round.id);
  assert.equal(monitor.round.settlements,2,'two clients must produce exactly two core settlements');
  assert.equal(monitor.payoutControlV3.totals.bet,a.lifetimeBet+b.lifetimeBet);
  assert.equal(monitor.payoutControlV3.totals.win,a.lifetimeWin+b.lifetimeWin);
  for(const client of [a,b]){
   const observed=await state(client);
   assert.equal(observed.pendingRound,null,'settled rounds must not block or replay before the next BET');
   assert.equal(observed.payoutControlV3.wallet.credit,client.credit);
  }
  nextBet=await waitState(a,response=>response.round?.id!==round.id&&response.round?.phase==='BETTING'&&response.round.canBet,'next BET after cycle '+(cycle+1));
  assert.equal((await state(b)).round.canBet,true,'reconnected client must become eligible for subsequent BETs');
 }
 assert.equal(new Set(roundIds).size,3);
 assert.equal(nextBet.round.sequence,4,'three completed physical cycles must lead to a fourth BET');
 assert.equal(a.lifetimeBet,300);assert.equal(a.lifetimeWin,310);
 assert.equal(b.lifetimeBet,600);assert.equal(b.lifetimeWin,480);
 await delay(Math.max(0,floodRetryAt-Date.now())+100);
 assert.equal((await request('/api/health',{ip:floodIp})).status,200,'the throttled poller must recover without a server restart');
 console.log('[e2e-v225] PASS: host socket replacement, 3 physical cycles, 2 clients, ordered 8-ball delivery, reconnect eligibility, exactly-once settlement, payout feedback, fourth BET, rate-limit recovery');
}finally{
 for(const client of sessions)for(const record of client.sockets)try{record.socket.terminate();}catch{}
 if(child&&child.exitCode===null){child.kill('SIGTERM');await Promise.race([once(child,'exit'),delay(2000)]);if(child.exitCode===null){child.kill('SIGKILL');await once(child,'exit');}}
 await fs.rm(temporary,{recursive:true,force:true});
}

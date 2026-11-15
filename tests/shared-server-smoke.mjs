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
 env:{...process.env,PORT:String(port),SWEETS_DATA_FILE:path.join(temp,'db.json'),SWEETS_ADMIN_TOKEN:adminToken},
 stdio:['ignore','pipe','pipe']
});
let stderr='';child.stderr.on('data',chunk=>stderr+=chunk);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function waitForHealth(){
 for(let i=0;i<80;i++){try{const response=await fetch(base+'/api/health');if(response.ok){const h=await response.json();assert.equal(h.source,'physical-host');return;}}catch{}await sleep(100);}
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

let socketHost,socketA,socketB,socketC;
try{
 await waitForHealth();
 const sessionHost=await json('/api/session',{method:'POST',body:{displayName:'SERVER ROULETTE'}});
 const sessionA=await json('/api/session',{method:'POST',body:{displayName:'PLAYER A'}});
 const sessionB=await json('/api/session',{method:'POST',body:{displayName:'PLAYER B'}});
 const sessionC=await json('/api/session',{method:'POST',body:{displayName:'PLAYER RESET'}});
 socketHost=await openSocket(sessionHost);socketA=await openSocket(sessionA);socketB=await openSocket(sessionB);socketC=await openSocket(sessionC);
 await socketHost.inbox.next(m=>m.type==='snapshot');await socketA.inbox.next(m=>m.type==='snapshot');await socketB.inbox.next(m=>m.type==='snapshot');await socketC.inbox.next(m=>m.type==='snapshot');

 const authHost={token:sessionHost.token,playerId:sessionHost.player.id};
 const authA={token:sessionA.token,playerId:sessionA.player.id},authB={token:sessionB.token,playerId:sessionB.player.id},authC={token:sessionC.token,playerId:sessionC.player.id};
 const registered=await json('/api/admin/machines/public-01/host/register?adminToken='+encodeURIComponent(adminToken),{...authHost,method:'POST',body:{}});
 assert.equal(registered.role,'host');
 assert.equal(registered.machine.hostPlayerId,sessionHost.player.id);

 const joinedA=await json('/api/machines/public-01/round/join',{...authA,method:'POST',body:{clientRoundToken:'a',bets:[100],locked:[100],enabled:[true],totalBet:100,creditAfterBet:900,appVersion:'test'}});
 const joinedB=await json('/api/machines/public-01/round/join',{...authB,method:'POST',body:{clientRoundToken:'b',bets:[200],locked:[200],enabled:[true],totalBet:200,creditAfterBet:800,appVersion:'test'}});
 const joinedC=await json('/api/machines/public-01/round/join',{...authC,method:'POST',body:{clientRoundToken:'c',bets:[300],locked:[300],enabled:[true],totalBet:300,creditAfterBet:700,appVersion:'test'}});
 assert.equal(joinedA.role,'player');assert.equal(joinedB.role,'player');assert.equal(joinedC.role,'player');assert.equal(joinedA.round.id,joinedB.round.id);assert.equal(joinedA.round.id,joinedC.round.id);
 const roundId=joinedA.round.id;

 await expectHttpError(()=>json('/api/machines/public-01/round/ball',{...authA,method:'POST',body:{roundId,ballIndex:1,number:7}}),403);

 const physicalNumbers=[3,7,11,15,19,23,5,9],seen=[];
 for(let index=1;index<=8;index++){
  const number=physicalNumbers[index-1];
  const reported=await json('/api/machines/public-01/round/ball',{...authHost,method:'POST',body:{roundId,ballIndex:index,number,eventId:roundId+':'+index}});
  assert.equal(reported.ball.number,number);
  const [a,b]=await Promise.all([
   socketA.inbox.next(m=>m.type==='ball_result'&&m.roundId===roundId&&m.ball?.index===index),
   socketB.inbox.next(m=>m.type==='ball_result'&&m.roundId===roundId&&m.ball?.index===index)
  ]);
  assert.equal(a.ball.number,number);assert.equal(b.ball.number,number);seen.push(number);
  const checkpoints=[
   json('/api/machines/public-01/round/checkpoint',{...authA,method:'POST',body:{roundId,ballIndex:index,state:{draws:[...seen],credit:900,totalWin:index*10,roundWins:[index*10]}}}),
   json('/api/machines/public-01/round/checkpoint',{...authB,method:'POST',body:{roundId,ballIndex:index,state:{draws:[...seen],credit:800,totalWin:index*20,roundWins:[index*20]}}})
  ];
  if(index<=2){
   const c=await socketC.inbox.next(m=>m.type==='ball_result'&&m.roundId===roundId&&m.ball?.index===index);
   assert.equal(c.ball.number,number);
   checkpoints.push(json('/api/machines/public-01/round/checkpoint',{...authC,method:'POST',body:{roundId,ballIndex:index,state:{draws:[...seen],credit:700,totalWin:index*30,roundWins:[index*30]}}}));
  }
  await Promise.all(checkpoints);
  if(index===2){
   const left=await json('/api/machines/public-01/round/leave',{...authC,method:'POST',body:{roundId}});
   assert.equal(left.left,true);assert.equal(left.phase,'PLAYING');assert.equal(left.participantCount,2);
   await expectHttpError(()=>json('/api/machines/public-01/round/join',{...authC,method:'POST',body:{clientRoundToken:'c-reset',avoidRoundId:roundId,bets:[300],locked:[300],enabled:[true],totalBet:300,creditAfterBet:700,appVersion:'test'}}),409);
  }
 }
 assert.deepEqual(seen,physicalNumbers);

 const monitor=await json('/api/admin/machines/public-01?adminToken='+adminToken);
 assert.equal(monitor.machine.source,'physical-host');assert.equal(monitor.machine.hostConnected,true);assert.equal(monitor.round.balls.length,8);assert.equal(monitor.round.players.length,3);
 assert.equal(monitor.round.players.find(p=>p.displayName==='PLAYER A').roundWin,80);
 assert.equal(monitor.round.players.find(p=>p.displayName==='PLAYER B').currentCredit,800);

 const settlement=await json('/api/machines/public-01/round/settle',{...authB,method:'POST',body:{roundId,totalWin:250,creditAfter:1050,digest:'abc'}});
 assert.equal(settlement.settlement.totalWin,250);
 const again=await json('/api/machines/public-01/round/settle',{...authB,method:'POST',body:{roundId,totalWin:999,creditAfter:9999,digest:'changed'}});
 assert.equal(again.idempotent,true);assert.equal(again.settlement.totalWin,250);

 const monitorAfter=await json('/api/admin/machines/public-01?adminToken='+adminToken);
 const pb=monitorAfter.round.players.find(p=>p.displayName==='PLAYER B');
 assert.equal(pb.settled,true);assert.equal(pb.currentCredit,1050);assert.equal(pb.roundWin,250);
 const rejoinedC=await json('/api/machines/public-01/round/join',{...authC,method:'POST',body:{clientRoundToken:'c-next',avoidRoundId:roundId,bets:[300],locked:[300],enabled:[true],totalBet:300,creditAfterBet:700,appVersion:'test'}});
 assert.notEqual(rejoinedC.round.id,roundId);assert.equal(rejoinedC.round.balls.length,0);
 console.log('physical-host multi-client + reset isolation smoke test passed');
}finally{
 try{socketHost?.ws.close();}catch{}try{socketA?.ws.close();}catch{}try{socketB?.ws.close();}catch{}try{socketC?.ws.close();}catch{}child.kill('SIGTERM');await sleep(100);await rm(temp,{recursive:true,force:true});
}

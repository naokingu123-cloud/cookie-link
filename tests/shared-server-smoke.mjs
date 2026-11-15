import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import os from 'node:os';
import path from 'node:path';
import {WebSocket} from 'ws';

const root=fileURLToPath(new URL('..',import.meta.url));
const temp=await mkdtemp(path.join(os.tmpdir(),'sweets-shared-clock-'));
const port=35000+Math.floor(Math.random()*1000);
const base='http://127.0.0.1:'+port;
const adminToken='test-admin-token';
const child=spawn(process.execPath,['server.mjs'],{
 cwd:root,
 env:{
  ...process.env,PORT:String(port),SWEETS_DATA_FILE:path.join(temp,'db.json'),SWEETS_ADMIN_TOKEN:adminToken,
  SWEETS_BET_DURATION_MS:'700',SWEETS_ROUND_START_DELAY_MS:'350',SWEETS_RESULT_GRACE_MS:'400',
  SWEETS_HOST_FALLBACK_DELAY_MS:'400',SWEETS_BALL_INTERVAL_MS:'120'
 },
 stdio:['ignore','pipe','pipe']
});
let stderr='';child.stderr.on('data',chunk=>stderr+=chunk);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function waitForHealth(){
 for(let i=0;i<100;i++){try{const response=await fetch(base+'/api/health');if(response.ok){const h=await response.json();assert.equal(h.source,'physical-host');assert.equal(h.version,204);return;}}catch{}await sleep(80);}
 throw Error('server did not start: '+stderr);
}
async function json(url,{method='GET',body,token,playerId}={}){
 const response=await fetch(base+url,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token,'X-Player-Id':playerId}:{})},body:body===undefined?undefined:JSON.stringify(body)});
 const data=await response.json();if(!response.ok)throw Object.assign(Error(data.error||String(response.status)),{data,status:response.status});return data;
}
function createInbox(ws){
 const queue=[],waiters=[];
 ws.on('message',raw=>{
  let message;try{message=JSON.parse(String(raw));}catch{return;}
  const i=waiters.findIndex(w=>w.predicate(message));
  if(i>=0){const [w]=waiters.splice(i,1);clearTimeout(w.timer);w.resolve(message);}else queue.push(message);
 });
 return {next(predicate=()=>true,timeout=6000){
  const i=queue.findIndex(predicate);if(i>=0)return Promise.resolve(queue.splice(i,1)[0]);
  return new Promise((resolve,reject)=>{
   const w={predicate,resolve,reject,timer:null};
   w.timer=setTimeout(()=>{const p=waiters.indexOf(w);if(p>=0)waiters.splice(p,1);reject(Error('websocket message timeout'));},timeout);waiters.push(w);
  });
 }};
}
function openSocket(session){
 return new Promise((resolve,reject)=>{
  const url='ws://127.0.0.1:'+port+'/ws?machineId=public-01&playerId='+encodeURIComponent(session.player.id)+'&token='+encodeURIComponent(session.token);
  const ws=new WebSocket(url),inbox=createInbox(ws);ws.once('open',()=>resolve({ws,inbox}));ws.once('error',reject);
 });
}
async function expectHttpError(fn,status,errorName){
 try{await fn();assert.fail('expected HTTP '+status);}catch(error){assert.equal(error.status,status);if(errorName)assert.equal(error.data?.error,errorName);return error;}
}
async function waitState(auth,predicate,timeout=6000){
 const started=Date.now();let state;
 while(Date.now()-started<timeout){state=await json('/api/machines/public-01/state',auth);if(predicate(state))return state;await sleep(80);}
 throw Error('state wait timed out: '+JSON.stringify(state));
}

let socketHost,socketA,socketB;
try{
 await waitForHealth();
 const sessionHost=await json('/api/session',{method:'POST',body:{displayName:'SERVER ROULETTE'}});
 const sessionA=await json('/api/session',{method:'POST',body:{displayName:'PLAYER A'}});
 const sessionB=await json('/api/session',{method:'POST',body:{displayName:'PLAYER B'}});
 const authHost={token:sessionHost.token,playerId:sessionHost.player.id};
 const authA={token:sessionA.token,playerId:sessionA.player.id};
 const authB={token:sessionB.token,playerId:sessionB.player.id};

 socketHost=await openSocket(sessionHost);socketA=await openSocket(sessionA);
 await socketHost.inbox.next(m=>m.type==='snapshot');await socketA.inbox.next(m=>m.type==='snapshot');

 // Registering the physical host starts a server-owned BET window for players already online.
 const registered=await json('/api/admin/machines/public-01/host/register?adminToken='+encodeURIComponent(adminToken),{...authHost,method:'POST',body:{}});
 assert.equal(registered.role,'host');
 const bettingA=await waitState(authA,s=>s.round?.phase==='BETTING');
 assert.equal(bettingA.round.canBet,true);
 assert.ok(bettingA.round.betClosesAt>bettingA.serverTime);

 const joinedA=await json('/api/machines/public-01/round/join',{...authA,method:'POST',body:{clientRoundToken:'a-bet',bets:[100],locked:[100],enabled:[true],totalBet:100,creditAfterBet:900,appVersion:'test'}});
 assert.equal(joinedA.round.phase,'BETTING');assert.equal(joinedA.round.participant.totalBet,100);
 const firstRoundId=joinedA.round.id;

 // A player arriving after BET TIME opened must wait until the next BET TIME.
 socketB=await openSocket(sessionB);const firstB=await socketB.inbox.next(m=>m.type==='snapshot');
 assert.equal(firstB.round.id,firstRoundId);assert.equal(firstB.round.phase,'BETTING');assert.equal(firstB.round.canBet,false);
 await expectHttpError(()=>json('/api/machines/public-01/round/join',{...authB,method:'POST',body:{clientRoundToken:'late',bets:[200],locked:[200],enabled:[true],totalBet:200,creditAfterBet:800,appVersion:'test'}}),409,'wait_next_bet');

 // Host visual relay remains available while the server controls the round clock.
 const visualPayload='data:image/jpeg;base64,'+Buffer.from('mirror-frame').toString('base64');
 socketHost.ws.send(JSON.stringify({type:'visual_frame',roundId:firstRoundId,image:visualPayload,capturedAt:Date.now()}));
 const mirrored=await socketA.inbox.next(m=>m.type==='visual_frame'&&m.roundId===firstRoundId);
 assert.equal(mirrored.image,visualPayload);

 const startedA=await socketA.inbox.next(m=>m.type==='round_started'&&m.round?.id===firstRoundId);
 assert.equal(startedA.round.phase,'PLAYING');
 const playingA=await waitState(authA,s=>s.round?.id===firstRoundId&&s.round.phase==='PLAYING');
 assert.ok(playingA.round.drawStartsAt>=playingA.round.startedAt);
 const delay=Math.max(0,playingA.round.drawStartsAt-Date.now()+80);if(delay)await sleep(delay);

 const physicalNumbers=[3,7,11,15,19,23,5,9];
 for(let index=1;index<=8;index++){
  const number=physicalNumbers[index-1];
  const reported=await json('/api/machines/public-01/round/ball',{...authHost,method:'POST',body:{roundId:firstRoundId,ballIndex:index,number,eventId:firstRoundId+':'+index}});
  assert.equal(reported.ball.number,number);
 }
 const completedA=await waitState(authA,s=>s.round?.id===firstRoundId&&s.round.phase==='COMPLETE');
 assert.deepEqual(completedA.round.balls.map(b=>b.number),physicalNumbers);
 assert.equal(completedA.pendingRound.id,firstRoundId);

 // The global server clock opens the next BET without waiting for A's local result settlement.
 const secondB=await waitState(authB,s=>s.round?.phase==='BETTING'&&s.round.id!==firstRoundId,4000);
 assert.equal(secondB.round.canBet,true);
 const secondRoundId=secondB.round.id;

 // The completed previous round stays addressable after it has been archived.
 await json('/api/machines/public-01/round/checkpoint',{...authA,method:'POST',body:{roundId:firstRoundId,ballIndex:8,state:{draws:physicalNumbers,credit:900,totalWin:80,roundWins:[80]}}});
 const settled=await json('/api/machines/public-01/round/settle',{...authA,method:'POST',body:{roundId:firstRoundId,totalWin:80,creditAfter:980,digest:'first'}});
 assert.equal(settled.settlement.totalWin,80);
 const afterSettle=await json('/api/machines/public-01/state',authA);assert.equal(afterSettle.pendingRound,null);

 // B can participate in the next server BET because B was online when it opened.
 const joinedB=await json('/api/machines/public-01/round/join',{...authB,method:'POST',body:{clientRoundToken:'b-bet',bets:[200],locked:[200],enabled:[true],totalBet:200,creditAfterBet:800,appVersion:'test'}});
 assert.equal(joinedB.round.id,secondRoundId);assert.equal(joinedB.round.participant.totalBet,200);
 await socketB.inbox.next(m=>m.type==='round_started'&&m.round?.id===secondRoundId);

 // Simulate loss of the physical-host connection and the player connection.
 socketHost.ws.close();socketHost=null;
 socketB.ws.close();socketB=null;

 // Node completes the remaining eight-ball draw without presentation and persists it.
 const fallbackDone=await waitState(authB,s=>s.round?.id===secondRoundId&&s.round.phase==='COMPLETE',7000);
 assert.equal(fallbackDone.round.drawSource,'server-fallback');
 assert.equal(fallbackDone.round.balls.length,8);
 assert.equal(new Set(fallbackDone.round.balls.map(b=>b.number)).size,8);
 assert.equal(fallbackDone.pendingRound.id,secondRoundId);

 // On reconnect the same authenticated player sees the completed unsettled server result.
 socketB=await openSocket(sessionB);
 const recoveredSnapshot=await socketB.inbox.next(m=>m.type==='snapshot');
 assert.equal(recoveredSnapshot.pendingRound.id,secondRoundId);
 assert.equal(recoveredSnapshot.pendingRound.balls.length,8);
 assert.equal(recoveredSnapshot.pendingRound.participant.totalBet,200);

 console.log('server BET clock + late-login gate + offline fallback/recovery smoke test passed');
}finally{
 try{socketHost?.ws.close();}catch{}try{socketA?.ws.close();}catch{}try{socketB?.ws.close();}catch{}
 child.kill('SIGTERM');await sleep(120);await rm(temp,{recursive:true,force:true});
}

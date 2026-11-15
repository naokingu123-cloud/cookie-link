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
const base=`http://127.0.0.1:${port}`;
const child=spawn(process.execPath,['server.mjs'],{
 cwd:root,
 env:{...process.env,PORT:String(port),SWEETS_DATA_FILE:path.join(temp,'db.json')},
 stdio:['ignore','pipe','pipe']
});
let stderr='';child.stderr.on('data',chunk=>stderr+=chunk);

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function waitForHealth(){
 for(let i=0;i<80;i++){
  try{const response=await fetch(base+'/api/health');if(response.ok)return;}
  catch{}
  await sleep(100);
 }
 throw Error('server did not start: '+stderr);
}

async function json(url,{method='GET',body,token,playerId}={}){
 const response=await fetch(base+url,{
  method,
  headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`,'X-Player-Id':playerId}:{})},
  body:body===undefined?undefined:JSON.stringify(body)
 });
 const data=await response.json();
 if(!response.ok)throw Object.assign(Error(data.error||String(response.status)),{data,status:response.status});
 return data;
}

function createInbox(ws){
 const queue=[],waiters=[];
 ws.on('message',raw=>{
  let message;try{message=JSON.parse(String(raw));}catch{return;}
  const index=waiters.findIndex(waiter=>waiter.predicate(message));
  if(index>=0){const [waiter]=waiters.splice(index,1);clearTimeout(waiter.timer);waiter.resolve(message);}
  else queue.push(message);
 });
 return {
  next(predicate=()=>true,timeout=3000){
   const index=queue.findIndex(predicate);
   if(index>=0)return Promise.resolve(queue.splice(index,1)[0]);
   return new Promise((resolve,reject)=>{
    const waiter={predicate,resolve,reject,timer:null};
    waiter.timer=setTimeout(()=>{
     const position=waiters.indexOf(waiter);if(position>=0)waiters.splice(position,1);
     reject(Error('websocket message timeout'));
    },timeout);
    waiters.push(waiter);
   });
  }
 };
}

function openSocket(session){
 return new Promise((resolve,reject)=>{
  const url=`ws://127.0.0.1:${port}/ws?machineId=public-01&playerId=${encodeURIComponent(session.player.id)}&token=${encodeURIComponent(session.token)}`;
  const ws=new WebSocket(url),inbox=createInbox(ws);
  ws.once('open',()=>resolve({ws,inbox}));
  ws.once('error',reject);
 });
}

async function expectHttpError(fn,status){
 try{await fn();assert.fail(`expected HTTP ${status}`);}
 catch(error){assert.equal(error.status,status);return error;}
}

let socketA,socketB;
try{
 await waitForHealth();
 const sessionA=await json('/api/session',{method:'POST',body:{displayName:'HOST'}});
 const sessionB=await json('/api/session',{method:'POST',body:{displayName:'FOLLOW'}});
 assert.ok(sessionA.player.id&&sessionA.token&&sessionB.player.id&&sessionB.token);

 socketA=await openSocket(sessionA);
 socketB=await openSocket(sessionB);
 await socketA.inbox.next(message=>message.type==='snapshot');
 await socketB.inbox.next(message=>message.type==='snapshot');

 const authA={token:sessionA.token,playerId:sessionA.player.id};
 const authB={token:sessionB.token,playerId:sessionB.player.id};
 const joinedA=await json('/api/machines/public-01/round/join',{
  ...authA,method:'POST',body:{clientRoundToken:'host-1',bets:[100],locked:[100],enabled:[true],totalBet:100,creditAfterBet:900,initialState:{draws:[]},appVersion:'test'}
 });
 assert.equal(joinedA.role,'host');
 const roundId=joinedA.round.id;

 const joinedB=await json('/api/machines/public-01/round/join',{
  ...authB,method:'POST',body:{clientRoundToken:'follow-1',bets:[200],locked:[200],enabled:[true],totalBet:200,creditAfterBet:800,initialState:{draws:[]},appVersion:'test'}
 });
 assert.equal(joinedB.role,'follower');
 assert.equal(joinedB.round.id,roundId);

 const receivedA=socketA.inbox.next(message=>message.type==='ball_result'&&message.roundId===roundId);
 const receivedB=socketB.inbox.next(message=>message.type==='ball_result'&&message.roundId===roundId);
 const first=await json('/api/machines/public-01/round/ball',{
  ...authA,method:'POST',body:{roundId,ballIndex:1,number:7,eventId:`${roundId}:1`}
 });
 assert.equal(first.ball.number,7);
 assert.equal((await receivedA).ball.number,7);
 assert.equal((await receivedB).ball.number,7);

 const repeat=await json('/api/machines/public-01/round/ball',{
  ...authA,method:'POST',body:{roundId,ballIndex:1,number:7,eventId:`${roundId}:1`}
 });
 assert.equal(repeat.idempotent,true);

 await expectHttpError(()=>json('/api/machines/public-01/round/ball',{
  ...authB,method:'POST',body:{roundId,ballIndex:2,number:9,eventId:`${roundId}:2`}
 }),403);

 const checkpoint=await json('/api/machines/public-01/round/checkpoint',{
  ...authB,method:'POST',body:{roundId,ballIndex:1,state:{draws:[7],credit:800}}
 });
 assert.equal(checkpoint.checkpointBall,1);
 const stateForB=await json('/api/machines/public-01/state',authB);
 assert.deepEqual(stateForB.round.balls.map(ball=>ball.number),[7]);
 assert.equal(stateForB.round.participant.checkpoint.draws[0],7);

 const hostChanged=socketB.inbox.next(message=>message.type==='host_changed'&&message.hostPlayerId===sessionB.player.id,8000);
 socketA.ws.close();
 const changed=await hostChanged;
 assert.equal(changed.hostPlayerId,sessionB.player.id);

 const receivedSecond=socketB.inbox.next(message=>message.type==='ball_result'&&message.ball?.index===2);
 const second=await json('/api/machines/public-01/round/ball',{
  ...authB,method:'POST',body:{roundId,ballIndex:2,number:9,eventId:`${roundId}:2`}
 });
 assert.equal(second.ball.number,9);
 assert.equal((await receivedSecond).ball.number,9);

 const settlement=await json('/api/machines/public-01/round/settle',{
  ...authB,method:'POST',body:{roundId,totalWin:250,creditAfter:1050,digest:'abc'}
 });
 assert.equal(settlement.settlement.totalWin,250);
 const settlementAgain=await json('/api/machines/public-01/round/settle',{
  ...authB,method:'POST',body:{roundId,totalWin:999,creditAfter:9999,digest:'changed'}
 });
 assert.equal(settlementAgain.idempotent,true);
 assert.equal(settlementAgain.settlement.totalWin,250);

 console.log('shared server multi-client smoke test passed');
}finally{
 try{socketA?.ws.close();}catch{}
 try{socketB?.ws.close();}catch{}
 child.kill('SIGTERM');
 await sleep(100);
 await rm(temp,{recursive:true,force:true});
}

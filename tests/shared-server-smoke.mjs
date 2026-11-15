import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {WebSocket} from 'ws';

const temp=await mkdtemp(path.join(os.tmpdir(),'sweets-shared-'));
const port=33176;
const base=`http://127.0.0.1:${port}`;
const child=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port),SWEETS_DATA_FILE:path.join(temp,'db.json')},stdio:['ignore','pipe','pipe']});
let stderr='';child.stderr.on('data',chunk=>stderr+=chunk);

async function waitForHealth(){
 for(let i=0;i<50;i++){
  try{const response=await fetch(base+'/api/health');if(response.ok)return;}
  catch{}
  await new Promise(resolve=>setTimeout(resolve,100));
 }
 throw Error('server did not start: '+stderr);
}
async function json(url,{method='GET',body,token,playerId}={}){
 const response=await fetch(base+url,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`,'X-Player-Id':playerId}:{})},body:body===undefined?undefined:JSON.stringify(body)});
 const data=await response.json();
 if(!response.ok)throw Object.assign(Error(data.error||String(response.status)),{data,status:response.status});
 return data;
}
function openSocket(session){
 return new Promise((resolve,reject)=>{
  const url=`ws://127.0.0.1:${port}/ws?machineId=public-01&playerId=${encodeURIComponent(session.player.id)}&token=${encodeURIComponent(session.token)}`;
  const ws=new WebSocket(url);ws.once('open',()=>resolve(ws));ws.once('error',reject);
 });
}

let ws;
try{
 await waitForHealth();
 const session=await json('/api/session',{method:'POST',body:{displayName:'TEST'}});
 assert.ok(session.player.id&&session.token);
 ws=await openSocket(session);
 await new Promise(resolve=>ws.once('message',resolve));
 const auth={token:session.token,playerId:session.player.id};
 const joined=await json('/api/machines/public-01/round/join',{...auth,method:'POST',body:{clientRoundToken:'test-1',bets:[100],locked:[100],enabled:[true],totalBet:100,creditAfterBet:900,appVersion:'test'}});
 assert.equal(joined.role,'host');assert.equal(joined.round.balls.length,0);
 const roundId=joined.round.id;
 const ball=await json('/api/machines/public-01/round/ball',{...auth,method:'POST',body:{roundId,ballIndex:1,number:7,eventId:`${roundId}:1`}});
 assert.equal(ball.ball.number,7);
 const repeat=await json('/api/machines/public-01/round/ball',{...auth,method:'POST',body:{roundId,ballIndex:1,number:7,eventId:`${roundId}:1`}});
 assert.equal(repeat.idempotent,true);
 const checkpoint=await json('/api/machines/public-01/round/checkpoint',{...auth,method:'POST',body:{roundId,ballIndex:1,state:{draws:[7],credit:900}}});
 assert.equal(checkpoint.checkpointBall,1);
 const settlement=await json('/api/machines/public-01/round/settle',{...auth,method:'POST',body:{roundId,totalWin:250,creditAfter:1150,digest:'abc'}});
 assert.equal(settlement.settlement.totalWin,250);
 const settlementAgain=await json('/api/machines/public-01/round/settle',{...auth,method:'POST',body:{roundId,totalWin:999,creditAfter:9999,digest:'changed'}});
 assert.equal(settlementAgain.idempotent,true);assert.equal(settlementAgain.settlement.totalWin,250);
 console.log('shared server smoke test passed');
}finally{
 try{ws?.close();}catch{}
 child.kill('SIGTERM');
 await rm(temp,{recursive:true,force:true});
}

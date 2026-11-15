import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import os from 'node:os';
import path from 'node:path';
import {WebSocket} from 'ws';

const root=fileURLToPath(new URL('..',import.meta.url));
const temp=await mkdtemp(path.join(os.tmpdir(),'sweets-autonomous-'));
const port=38000+Math.floor(Math.random()*1000);
const base='http://127.0.0.1:'+port;
const adminToken='autonomous-admin';
const child=spawn(process.execPath,['server.mjs'],{
 cwd:root,
 env:{
  ...process.env,PORT:String(port),SWEETS_DATA_DIR:temp,SWEETS_DATA_FILE:path.join(temp,'shared.json'),SWEETS_ADMIN_TOKEN:adminToken,
  SWEETS_AUTONOMOUS_ROUNDS:'1',SWEETS_BET_DURATION_MS:'350',SWEETS_ROUND_START_DELAY_MS:'300',
  SWEETS_RESULT_GRACE_MS:'300',SWEETS_HOST_FALLBACK_DELAY_MS:'300',SWEETS_BALL_INTERVAL_MS:'300'
 },
 stdio:['ignore','pipe','pipe']
});
let stderr='';child.stderr.on('data',chunk=>stderr+=chunk);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function json(url,{method='GET',body,token,playerId}={}){
 for(let attempt=0;attempt<3;attempt++){
  const response=await fetch(base+url,{method,headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token,'x-player-id':playerId}:{})},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});
  const data=await response.json();
  if(response.status===429&&attempt<2){await sleep(250*(attempt+1));continue;}
  if(!response.ok)throw Object.assign(Error(data.error||String(response.status)),{status:response.status,data});
  return data;
 }
 throw Error('request retries exhausted');
}
async function waitHealth(){
 for(let i=0;i<120;i++){try{const response=await fetch(base+'/api/health',{cache:'no-store'});if(response.ok)return;}catch{}await sleep(80);}
 throw Error('server failed: '+stderr);
}
async function adminState(){return json('/api/admin/machines/public-01?adminToken='+encodeURIComponent(adminToken));}
async function waitFor(predicate,timeout=16000){
 const started=Date.now();let value;
 while(Date.now()-started<timeout){value=await adminState();if(predicate(value))return value;await sleep(160);}
 throw Error('state timeout: '+JSON.stringify(value)+'\n'+stderr);
}
function openSocket(session){
 return new Promise((resolve,reject)=>{
  const url='ws://127.0.0.1:'+port+'/ws?machineId=public-01&playerId='+encodeURIComponent(session.player.id)+'&token='+encodeURIComponent(session.token);
  const ws=new WebSocket(url);let first=null;
  ws.once('message',raw=>{try{first=JSON.parse(String(raw));}catch{}resolve({ws,first});});
  ws.once('error',reject);
 });
}

let lateSocket=null;
try{
 await waitHealth();
 const playing=await waitFor(state=>state.round?.phase==='PLAYING'&&Number(state.round.sequence)>=1);
 const firstSequence=Number(playing.round.sequence),firstRoundId=playing.round.id;
 assert.equal(playing.round.participantCount>=1,true,'server clock runner must keep an empty arcade round active');

 const fallback=await waitFor(state=>state.round?.id===firstRoundId&&state.round.drawSource==='server-fallback');
 assert.equal(fallback.machine.hostConnected,true,'server fallback sentinel must keep the machine clock alive');

 // A real client arriving after this round opened is not eligible for it.
 const lateSession=await json('/api/session',{method:'POST',body:{displayName:'LATE PLAYER'}});
 lateSocket=await openSocket(lateSession);
 assert.equal(lateSocket.first.round.id,firstRoundId);
 assert.equal(lateSocket.first.round.canBet,false);

 // The server completes all eight balls and opens the next 3-second BET even
 // though no real player was connected at the start of the previous round.
 const next=await waitFor(state=>Number(state.round?.sequence)>firstSequence&&state.round?.phase==='BETTING');
 assert.ok(Number(next.round.sequence)>firstSequence);
 const lateState=await json('/api/machines/public-01/state',{token:lateSession.token,playerId:lateSession.player.id});
 assert.equal(lateState.round.id,next.round.id);
 assert.equal(lateState.round.canBet,true,'late login must become eligible only at the next BET opening');
 assert.ok(Number(lateState.round.betClosesAt)-Number(lateState.serverTime)<=350);

 console.log('autonomous server clock continuously draws eight balls and late clients join the next BET');
}finally{
 try{lateSocket?.ws.close();}catch{}
 child.kill('SIGTERM');await sleep(180);await rm(temp,{recursive:true,force:true});
}

import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import os from 'node:os';
import path from 'node:path';
import {WebSocket} from 'ws';

const root=fileURLToPath(new URL('..',import.meta.url));
const temp=await mkdtemp(path.join(os.tmpdir(),'sweets-v220-clock-'));
const port=39000+Math.floor(Math.random()*800),base='http://127.0.0.1:'+port,adminToken='v220-admin';
const child=spawn(process.execPath,['server.mjs'],{
 cwd:root,
 env:{...process.env,PORT:String(port),SWEETS_DATA_FILE:path.join(temp,'db.json'),SWEETS_DATA_DIR:temp,SWEETS_ADMIN_TOKEN:adminToken,
  SWEETS_CONTINUOUS_PHYSICAL_ROUNDS:'1',SWEETS_PLAYER_STABLE_MS:'500',SWEETS_BET_DURATION_MS:'700',SWEETS_ROUND_START_DELAY_MS:'300',SWEETS_RESULT_GRACE_MS:'350',SWEETS_HOST_FALLBACK_DELAY_MS:'86400000'},
 stdio:['ignore','pipe','pipe']
});
let stderr='';child.stderr.on('data',chunk=>stderr+=chunk);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function waitHealth(){for(let i=0;i<140;i++){try{const response=await fetch(base+'/api/health');if(response.ok)return await response.json();}catch{}await sleep(50);}throw Error('server start failed: '+stderr);}
async function json(url,{method='GET',body,session}={}){
 const response=await fetch(base+url,{method,headers:{'content-type':'application/json',...(session?{authorization:'Bearer '+session.token,'x-player-id':session.player.id}:{})},body:body===undefined?undefined:JSON.stringify(body)});
 const data=await response.json();if(!response.ok)throw Object.assign(Error(data.error||String(response.status)),{status:response.status,data});return data;
}
function openSocket(session){return new Promise((resolve,reject)=>{const ws=new WebSocket(`ws://127.0.0.1:${port}/ws?machineId=public-01&playerId=${encodeURIComponent(session.player.id)}&token=${encodeURIComponent(session.token)}`);ws.once('open',()=>resolve(ws));ws.once('error',reject);});}
async function waitState(session,predicate,timeout=9000){const started=Date.now();let state;while(Date.now()-started<timeout){state=await json('/api/machines/public-01/state',{session});if(predicate(state))return state;await sleep(45);}throw Error('state timeout: '+JSON.stringify(state)+'\n'+stderr);}
async function reportEight(host,roundId,numbers){
 for(let index=1;index<=8;index++){
  const data=await json('/api/machines/public-01/round/ball',{method:'POST',session:host,body:{roundId,ballIndex:index,number:numbers[index-1],eventId:roundId+':physical:'+index}});
  assert.equal(data.ball.index,index);assert.equal(data.ball.number,numbers[index-1]);assert.equal(data.ball.reportedBy,host.player.id);
 }
}

let hostSocket=null,playerSocket=null;
try{
 const health=await waitHealth();assert.equal(health.source,'physical-host');
 const host=await json('/api/session',{method:'POST',body:{displayName:'SERVER ROULETTE'}});
 const player=await json('/api/session',{method:'POST',body:{displayName:'PLAYER'}});
 hostSocket=await openSocket(host);
 await json('/api/admin/machines/public-01/host/register?adminToken='+encodeURIComponent(adminToken),{method:'POST',body:{},session:host});

 // The server opens and plays a legitimate physical round with no player or
 // synthetic participant. This is the autonomous server clock.
 const emptyBet=await waitState(host,s=>s.round?.phase==='BETTING');
 assert.equal(emptyBet.round.participantCount,0);assert.equal(emptyBet.round.eligibleCount,0);
 const firstId=emptyBet.round.id;
 const emptyPlaying=await waitState(host,s=>s.round?.id===firstId&&s.round.phase==='PLAYING');
 assert.equal(emptyPlaying.round.participantCount,0);assert.equal(emptyPlaying.round.drawSource,'physical');

 // A client arriving after the round began only observes this round. It stays
 // connected long enough to become eligible when the next BET is created.
 playerSocket=await openSocket(player);await sleep(620);
 let observed=await json('/api/machines/public-01/state',{session:player});
 assert.equal(observed.round.id,firstId);assert.equal(observed.round.phase,'PLAYING');assert.equal(observed.round.participant,null);
 await reportEight(host,firstId,[1,4,7,10,13,16,19,22]);
 await waitState(host,s=>s.round?.id===firstId&&s.round.phase==='COMPLETE');

 // The same client is admitted only to the following BET window.
 const nextBet=await waitState(player,s=>s.round?.id!==firstId&&s.round?.phase==='BETTING'&&s.round.canBet===true);
 assert.equal(nextBet.round.participant,null);assert.ok(nextBet.round.eligibleCount>=1);
 const secondId=nextBet.round.id;
 const joined=await json('/api/machines/public-01/round/join',{method:'POST',session:player,body:{clientRoundToken:'v220-next-bet',bets:[100],locked:[100],enabled:[true],totalBet:100,creditAfterBet:900,appVersion:'v220-test'}});
 assert.equal(joined.round.id,secondId);assert.equal(joined.round.participant.playerId,player.player.id);
 const secondPlaying=await waitState(player,s=>s.round?.id===secondId&&s.round.phase==='PLAYING');
 assert.equal(secondPlaying.round.participant.playerId,player.player.id);assert.equal(secondPlaying.round.drawSource,'physical');
 await reportEight(host,secondId,[2,5,8,11,14,17,20,23]);
 await waitState(player,s=>s.round?.id===secondId&&s.round.phase==='COMPLETE');

 // The global server clock continues into another BET without recreating a
 // synthetic player, refreshing a page, or waiting for a new login.
 const thirdBet=await waitState(player,s=>s.round?.id!==secondId&&s.round?.phase==='BETTING');
 assert.notEqual(thirdBet.round.id,secondId);
 console.log('v220 empty physical clock + observe-current/join-next-BET integration passed');
}finally{
 try{hostSocket?.close();}catch{}try{playerSocket?.close();}catch{}
 child.kill('SIGTERM');await sleep(180);await rm(temp,{recursive:true,force:true});
}

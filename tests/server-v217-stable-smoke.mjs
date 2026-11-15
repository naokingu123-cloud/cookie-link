import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import os from 'node:os';
import path from 'node:path';
import {WebSocket} from 'ws';

const root=fileURLToPath(new URL('..',import.meta.url));
const temp=await mkdtemp(path.join(os.tmpdir(),'sweets-v217-stable-'));
const port=37000+Math.floor(Math.random()*1000),base='http://127.0.0.1:'+port,adminToken='v217-admin';
const child=spawn(process.execPath,['server.mjs'],{
 cwd:root,
 env:{...process.env,PORT:String(port),SWEETS_DATA_FILE:path.join(temp,'db.json'),SWEETS_DATA_DIR:temp,SWEETS_ADMIN_TOKEN:adminToken,
  SWEETS_CONTINUOUS_PHYSICAL_ROUNDS:'0',SWEETS_PLAYER_STABLE_MS:'500',SWEETS_BET_DURATION_MS:'900',SWEETS_ROUND_START_DELAY_MS:'300',SWEETS_RESULT_GRACE_MS:'400',SWEETS_HOST_FALLBACK_DELAY_MS:'500'},
 stdio:['ignore','pipe','pipe']
});
let stderr='';child.stderr.on('data',chunk=>stderr+=chunk);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function waitHealth(){for(let index=0;index<120;index++){try{const response=await fetch(base+'/api/health');if(response.ok)return await response.json();}catch{}await sleep(60);}throw Error('server start failed: '+stderr);}
async function json(url,{method='GET',body,session}={}){
 const response=await fetch(base+url,{method,headers:{'content-type':'application/json',...(session?{authorization:'Bearer '+session.token,'x-player-id':session.player.id}:{})},body:body===undefined?undefined:JSON.stringify(body)});
 const data=await response.json();if(!response.ok)throw Object.assign(Error(data.error||String(response.status)),{status:response.status,data});return data;
}
function openSocket(session){return new Promise((resolve,reject)=>{const ws=new WebSocket(`ws://127.0.0.1:${port}/ws?machineId=public-01&playerId=${encodeURIComponent(session.player.id)}&token=${encodeURIComponent(session.token)}`);let snapshot=null;ws.on('message',raw=>{try{const message=JSON.parse(String(raw));if(message.type==='snapshot')snapshot=message;}catch{}});ws.once('open',()=>{const wait=async()=>{for(let i=0;i<30;i++){if(snapshot)return resolve({ws,snapshot});await sleep(20);}resolve({ws,snapshot});};wait();});ws.once('error',reject);});}
async function waitState(session,predicate,timeout=6000){const started=Date.now();let state;while(Date.now()-started<timeout){state=await json('/api/machines/public-01/state',{session});if(predicate(state))return state;await sleep(60);}throw Error('state timeout: '+JSON.stringify(state));}

let hostSocket=null,playerSocket=null,momentarySocket=null;
try{
 const health=await waitHealth();assert.equal(health.source,'physical-host');
 const host=await json('/api/session',{method:'POST',body:{displayName:'SERVER ROULETTE'}});
 const player=await json('/api/session',{method:'POST',body:{displayName:'PLAYER'}});
 hostSocket=await openSocket(host);
 await json('/api/admin/machines/public-01/host/register?adminToken='+encodeURIComponent(adminToken),{method:'POST',body:{},session:host});

 // A socket that appears briefly must not create a BET window.
 momentarySocket=await openSocket(player);await sleep(120);momentarySocket.ws.close();momentarySocket=null;
 await sleep(750);
 let state=await json('/api/machines/public-01/state',{session:player});
 assert.equal(state.round,null,'momentary player must not start a round');

 // A continuously connected player becomes eligible only after 500 ms.
 playerSocket=await openSocket(player);
 await sleep(150);state=await json('/api/machines/public-01/state',{session:player});
 assert.equal(state.round,null,'BET must not open before stable connection duration');
 const betting=await waitState(player,s=>s.round?.phase==='BETTING');
 assert.equal(betting.round.canBet,true);
 const roundId=betting.round.id;
 const joined=await json('/api/machines/public-01/round/join',{method:'POST',session:player,body:{clientRoundToken:'stable-player',bets:[100],locked:[100],enabled:[true],totalBet:100,creditAfterBet:900,appVersion:'v217-test'}});
 assert.equal(joined.round.id,roundId);
 let playing=await waitState(player,s=>s.round?.id===roundId&&s.round.phase==='PLAYING');
 const drawDelay=Math.max(0,Number(playing.round.drawStartsAt)-Date.now()+50);if(drawDelay)await sleep(drawDelay);

 // Even an explicit old-host fallback request is ignored.
 hostSocket.ws.send(JSON.stringify({type:'host_fallback_request',roundId}));await sleep(650);
 playing=await json('/api/machines/public-01/state',{session:player});
 assert.equal(playing.round.phase,'PLAYING');assert.equal(playing.round.drawSource,'physical');assert.equal(playing.round.balls.length,0);

 // Losing the physical host pauses the round; it never fabricates eight balls.
 hostSocket.ws.close();hostSocket=null;await sleep(1100);
 playing=await json('/api/machines/public-01/state',{session:player});
 assert.equal(playing.round.phase,'PLAYING');assert.equal(playing.round.drawSource,'physical');assert.equal(playing.round.balls.length,0);

 // The same real host reconnects and completes the authoritative physical draw.
 hostSocket=await openSocket(host);await sleep(100);
 const numbers=[2,5,8,11,14,17,20,23];
 playerSocket.ws.close();playerSocket=null; // server continues after a legitimate participant disconnects
 for(let index=1;index<=8;index++){
  const report=await json('/api/machines/public-01/round/ball',{method:'POST',session:host,body:{roundId,ballIndex:index,number:numbers[index-1],eventId:roundId+':physical:'+index}});
  assert.equal(report.ball.number,numbers[index-1]);assert.equal(report.ball.reportedBy,host.player.id);
 }
 const completed=await waitState(player,s=>s.round?.id===roundId&&s.round.phase==='COMPLETE');
 assert.deepEqual(completed.round.balls.map(ball=>ball.number),numbers);
 assert.ok(completed.round.balls.every(ball=>ball.reportedBy===host.player.id));
 assert.equal(completed.pendingRound.id,roundId);

 console.log('v217 stable-player eligibility + physical-only no-random-fallback smoke test passed');
}finally{
 try{hostSocket?.ws.close();}catch{}try{playerSocket?.ws.close();}catch{}try{momentarySocket?.ws.close();}catch{}
 child.kill('SIGTERM');await sleep(150);await rm(temp,{recursive:true,force:true});
}

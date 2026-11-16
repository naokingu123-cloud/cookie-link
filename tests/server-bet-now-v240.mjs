import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {WebSocket} from 'ws';

// Integrates authenticated operator action into the real server clock and
// two real players' reserved BETs. Never fabricate physical balls on fallback.
const cwd=fileURLToPath(new URL('..',import.meta.url));
const dir=await mkdtemp(path.join(os.tmpdir(),'sweets-bet-v240-'));
const port=47000+Math.floor(Math.random()*1500),base='http://127.0.0.1:'+port,admin='v240-private-secret';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let child,log='';const sockets=[];
async function call(route,{method='GET',body,session,expected=200}={}){
 const response=await fetch(base+route,{method,headers:{'content-type':'application/json',...(session?{'authorization':'Bearer '+session.token,'x-player-id':session.player.id}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(5000)});
 const data=await response.json();assert.equal(response.status,expected,route+': '+JSON.stringify(data));return data;
}
async function until(session,predicate,label,timeout=14000){const started=Date.now();let last;while(Date.now()-started<timeout){last=await call('/api/machines/public-01/state',{session});if(predicate(last))return last;await sleep(50);}throw Error(label+' timed out '+JSON.stringify(last)+' '+log);}
async function session(name){return call('/api/session',{method:'POST',body:{displayName:name},expected:201});}
async function connect(s){const socket=new WebSocket('ws://127.0.0.1:'+port+'/ws?machineId=public-01&playerId='+encodeURIComponent(s.player.id)+'&token='+encodeURIComponent(s.token));sockets.push(socket);socket.on('error',()=>{});await once(socket,'open');return socket;}
const manual=()=>call('/api/admin/machines/public-01/bet-now?adminToken='+admin,{method:'POST',body:{}});
try{
 child=spawn(process.execPath,['server.mjs'],{cwd,env:{...process.env,PORT:String(port),SWEETS_ADMIN_TOKEN:admin,SWEETS_DATA_FILE:path.join(dir,'shared-machine.json'),SWEETS_DATA_DIR:dir,SWEETS_BET_DURATION_MS:'2300',SWEETS_PLAYER_STABLE_MS:'500',SWEETS_RESULT_GRACE_MS:'4500',SWEETS_ROUND_START_DELAY_MS:'300',SWEETS_CONTINUOUS_PHYSICAL_ROUNDS:'1'},stdio:['ignore','pipe','pipe']});
 child.stdout.on('data',b=>log+=b);child.stderr.on('data',b=>log+=b);
 for(let i=0;i<130;i++){if(child.exitCode!==null)throw Error('server exited: '+log);try{if((await fetch(base+'/api/health')).ok)break;}catch{}await sleep(55);if(i===129)throw Error('health timeout '+log);}
 assert.equal((await call('/api/admin/machines/public-01/bet-now',{method:'POST',body:{},expected:403})).error,'admin_required','private control may not be public');
 const host=await session('HOST'),a=await session('ST.1'),b=await session('ST.2');
 await connect(host);await connect(a);await connect(b);
 await call('/api/admin/machines/public-01/host/register?adminToken='+admin,{method:'POST',body:{},session:host});
 await sleep(650);
 let start=await manual();assert.ok(['started','extended'].includes(start.action),'manual BET starts/extends server clock');
 const first=await until(a,s=>s.round?.phase==='BETTING'&&s.round.canBet,'manual betting round');
 const firstId=first.round.id;
 assert.equal((await call('/api/machines/public-01/state',{session:b})).round.canBet,true,'both players eligible');
 const body=(roundId,amount)=>({roundId,totalBet:amount,bets:[amount],locked:[amount],enabled:[true],creditAfterBet:1000000-amount,clientRoundToken:'v240-'+amount,appVersion:'v240'});
 const aBet=await call('/api/machines/public-01/round/join',{method:'POST',session:a,body:body(firstId,100)});
 await call('/api/machines/public-01/round/join',{method:'POST',session:b,body:body(firstId,250)});
 assert.equal(aBet.round.participant.totalBet,100);
 const extended=await manual();assert.equal(extended.action,'extended');assert.equal(extended.roundId,firstId);
 assert.ok(extended.betClosesAt>Date.now()+1000);
 const aRetained=await call('/api/machines/public-01/state',{session:a});assert.equal(aRetained.round.participant.totalBet,100,'BET reservation remains untouched');
 assert.equal(aRetained.payoutControlV3.wallet.credit,999900,'no second debit on manual extension');
 const playing=await until(host,s=>s.round?.phase==='PLAYING'&&s.round.id===firstId,'physical draw start');
 assert.equal(playing.round.balls.length,0,'server creates no random local balls');
 const queued=await manual();assert.equal(queued.action,'queued');assert.equal(queued.roundId,firstId);
 assert.equal((await manual()).action,'queued','repeated click is idempotent');
 assert.equal((await call('/api/machines/public-01/state',{session:a})).round.id,firstId,'draw is not cut off');
 await sleep(Math.max(0,playing.round.drawStartsAt-Date.now()+60));
 for(let n=1;n<=8;n++){
  const out=await call('/api/machines/public-01/round/ball',{session:host,method:'POST',body:{roundId:firstId,ballIndex:n,number:n,eventId:firstId+':'+n}});
  assert.equal(out.ball.number,n);
 }
 await until(host,s=>s.round?.phase==='COMPLETE'&&s.round.id===firstId,'first draw COMPLETE');
 const next=await until(host,s=>s.round?.phase==='BETTING'&&s.round.id!==firstId,'queued next BET',8000);
 assert.equal(next.round.sequence,playing.round.sequence+1);
 assert.equal(next.round.balls.length,0,'no synthetic number');
 assert.ok(next.round.betClosesAt>Date.now());
 const archived=await call('/api/machines/public-01/state',{session:a});
 assert.equal(archived.pendingRound?.id,firstId,'previous draw still available for safe settlement');
 assert.equal(archived.payoutControlV3.wallet.credit,999900,'queued transition does not refund or double charge');
 // Complete->BET direct path: archive a round safely instead of dropping it.
 const reextended=await manual();assert.equal(reextended.action,'extended');assert.equal(reextended.roundId,next.round.id);
 console.log('SERVER_BET_NOW_V240_PASS',{firstId,nextId:next.round.id,actions:[start.action,extended.action,queued.action],reservedCredit:999900,protected:true});
}finally{
 for(const ws of sockets)try{ws.terminate();}catch{}
 if(child){const exited=child.exitCode!==null?Promise.resolve():once(child,'exit');child.kill('SIGTERM');await Promise.race([exited,sleep(1500)]);if(child.exitCode===null)child.kill('SIGKILL');}
 await rm(dir,{recursive:true,force:true});
}

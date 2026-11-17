import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {WebSocket} from 'ws';
const root=new URL('..',import.meta.url).pathname,temp=await fs.mkdtemp(path.join(os.tmpdir(),'operator-v242-')),dbFile=path.join(temp,'core.json'),admin='operator-test-242';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));let child,base,port,logs='';const sockets=[];
async function start(){const s=net.createServer();s.listen(0,'127.0.0.1');await once(s,'listening');port=s.address().port;await new Promise(r=>s.close(r));base='http://127.0.0.1:'+port;
 child=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,PORT:String(port),SWEETS_DATA_FILE:dbFile,SWEETS_DATA_DIR:temp,SWEETS_ADMIN_TOKEN:admin,SWEETS_PLAYER_STABLE_MS:'500',SWEETS_BET_DURATION_MS:'1800',SWEETS_ROUND_START_DELAY_MS:'300',SWEETS_RESULT_GRACE_MS:'5000'},stdio:['ignore','pipe','pipe']});child.stdout.on('data',x=>logs+=x);child.stderr.on('data',x=>logs+=x);
 for(let i=0;i<100;i++){if(child.exitCode!==null)throw Error(logs);try{if((await fetch(base+'/api/health')).ok)return;}catch{}await sleep(30);}throw Error('server readiness '+logs);}
async function stop(){for(const ws of sockets.splice(0))ws.terminate();if(child&&child.exitCode===null){const done=once(child,'exit');child.kill('SIGKILL');await done;}child=null;}
async function call(route,{session,body,expect=200,token=false}={}){const response=await fetch(base+route+(token?(route.includes('?')?'&':'?')+'adminToken='+admin:''),{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(session?{'X-Player-Id':session.player.id,Authorization:'Bearer '+session.token}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(5000)});const data=await response.json();assert.equal(response.status,expect,route+' '+JSON.stringify(data));return data;}
const state=s=>call('/api/machines/public-01/state',{session:s});
const session=displayName=>call('/api/session',{body:{displayName},expect:201});
async function connect(s){const ws=new WebSocket('ws://127.0.0.1:'+port+'/ws?machineId=public-01&playerId='+s.player.id+'&token='+s.token);const messages=[];ws.on('message',raw=>{try{messages.push(JSON.parse(String(raw)));}catch{}});ws.on('error',()=>{});sockets.push(ws);await once(ws,'open');return {ws,messages};}
async function until(fn,label){for(let i=0;i<180;i++){if(child.exitCode!==null)throw Error(logs);const value=await fn();if(value)return value;await sleep(40);}throw Error(label+' '+logs);}
const register=h=>call('/api/admin/machines/public-01/host/register',{session:h,body:{},token:true});
const force=(roundId,requestId)=>call('/api/admin/machines/public-01/bet-now',{body:{roundId,requestId},token:true});
async function join(s,id,bet){return call('/api/machines/public-01/round/join',{session:s,body:{roundId:id,clientRoundToken:'operator-'+id,bets:[bet],locked:[bet],enabled:[true],totalBet:bet,payoutV3Bet:{version:3,games:[{id:'cookie',bet}]}}});}
async function playing(h,id){return until(async()=>{const s=await state(h);return s.round?.id===id&&s.round.phase==='PLAYING'?s.round:null;},'playing');}
async function ball(h,r,index){await sleep(Math.max(0,r.drawStartsAt-Date.now()+5));return call('/api/machines/public-01/round/ball',{session:h,body:{roundId:r.id,ballIndex:index,number:index,eventId:r.id+':'+index}});}
const settle=(s,id,bet,win)=>call('/api/machines/public-01/round/settle',{session:s,body:{roundId:id,totalWin:win,digest:'operator-test',payoutV3:{version:3,games:[{id:'cookie',bet,win}]}}});
try{
 await start();const h=await session('SERVER ROULETTE'),a=await session('A'),b=await session('B');await connect(h);const aw=await connect(a),bw=await connect(b);await sleep(550);await register(h);
 let r=(await state(a)).round;await join(a,r.id,27000);await join(b,r.id,12000);r=await playing(h,r.id);for(let i=1;i<=3;i++)await ball(h,r,i);
 // B's disconnect policy has already committed a loss; the operator still refunds B.
 await settle(b,r.id,12000,0);bw.ws.terminate();await sleep(80);
 const before=JSON.parse(await fs.readFile(dbFile,'utf8'));
 await call('/api/admin/machines/public-01/bet-now',{session:a,body:{roundId:r.id,requestId:'unauthorized-242'},expect:403});
 await call('/api/admin/machines/public-01/bet-now',{body:{roundId:'stale',requestId:'stale-round-242'},token:true,expect:409});
 const command='refund-three-balls-242';const first=await force(r.id,command);assert.equal(first.action,'refunded');assert.equal(first.refundedTotal,39000);assert.equal(first.refundedPlayers,2);assert.notEqual(first.roundId,r.id);
 const sa=await state(a),sb=await state(b);for(const s of [sa,sb]){assert.equal(s.payoutControlV3.wallet.credit,1000000);assert.equal(s.payoutControlV3.lifetimeBet,0);assert.equal(s.payoutControlV3.lifetimeWin,0);assert.equal(s.pendingRound,null);assert.equal(s.round.phase,'BETTING');assert.equal(s.round.forcedFromRoundId,r.id);assert.equal(s.operatorRefundsV242.length,1);assert.ok(!s.payoutTrendV242);}
 const revision=sa.payoutControlV3.wallet.revision;const duplicates=await Promise.all([force(r.id,command),force(r.id,command)]);assert.ok(duplicates.every(d=>d.idempotent&&d.roundId===first.roundId));assert.equal((await state(a)).payoutControlV3.wallet.revision,revision);
 for(const action of ['checkpoint','settle'])await call('/api/machines/public-01/round/'+action,{session:a,body:{roundId:r.id,ballIndex:3,state:{totalWin:999999},totalWin:999999},expect:409});
 await call('/api/machines/public-01/round/ball',{session:h,body:{roundId:r.id,ballIndex:4,number:4},expect:409});assert.equal((await state(a)).payoutControlV3.wallet.credit,1000000);
 assert.ok(aw.messages.some(m=>m.type==='round_cancelled'&&m.cancelledRoundId===r.id));const publicCancel=aw.messages.find(m=>m.type==='round_cancelled');assert.equal(publicCancel.round.participant,null);assert.ok(!JSON.stringify(publicCancel).includes(b.token));
 // Simulate a crash after wallet rename but before the corresponding core save.
 await stop();await fs.writeFile(dbFile,JSON.stringify(before));await start();await connect(h);await connect(a);await connect(b);await register(h);await sleep(550);
 const recovered=await state(a);assert.notEqual(recovered.round.id,r.id);assert.equal(recovered.payoutControlV3.wallet.credit,1000000);assert.equal(recovered.payoutControlV3.wallet.revision,revision);assert.equal(recovered.operatorRefundsV242[0].refundedBet,27000);
 const retry=await force(r.id,command);assert.equal(retry.idempotent,true);assert.equal((await state(b)).payoutControlV3.wallet.credit,1000000);
 // Already-credited WIN in the interrupted current round is reversed once too.
 let fresh=await force((await state(h)).round.id,'fresh-before-credited-242');await join(a,fresh.roundId,100);await join(b,fresh.roundId,200);let play=await playing(h,fresh.roundId);await ball(h,play,1);await settle(a,play.id,100,40);await settle(b,play.id,200,300);
 assert.equal((await state(a)).payoutControlV3.wallet.credit,999940);assert.equal((await state(b)).payoutControlV3.wallet.credit,1000100);
 fresh=await force(play.id,'refund-credited-win-242');for(const s of [a,b]){const v=(await state(s)).payoutControlV3;assert.equal(v.wallet.credit,1000000);assert.equal(v.lifetimeBet,0);assert.equal(v.lifetimeWin,0);}
 // A normal finished game produces ONE chart point, not one per participant.
 await join(a,fresh.roundId,100);await join(b,fresh.roundId,200);play=await playing(h,fresh.roundId);for(let i=1;i<=8;i++)await ball(h,play,i);await settle(a,play.id,100,40);await settle(b,play.id,200,300);
 const monitor=await call('/api/admin/machines/public-01',{token:true});const points=monitor.payoutTrendV242.points;assert.equal(points.length,1);assert.equal(points[0].input,300);assert.equal(points[0].output,340);assert.equal(points[0].hg,-40);assert.equal(points[0].partial,false);assert.ok(Math.abs(points[0].po-340/300*100)<1e-9);
 await stop();await start();const afterRestart=await call('/api/admin/machines/public-01',{token:true});assert.deepEqual(afterRestart.payoutTrendV242.points,points);
 console.log('OPERATOR_REFUND_V242_PASS',JSON.stringify({twoPlayers:true,offlineRefund:true,refund:39000,retryOnce:true,staleResultsRejected:true,journalRecovery:true,creditedWinReversed:true,trendExactlyOneGame:true,persisted:true}));
}finally{await stop();await fs.rm(temp,{recursive:true,force:true});}

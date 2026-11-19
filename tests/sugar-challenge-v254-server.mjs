import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {spawn,spawnSync} from 'node:child_process';
import {once} from 'node:events';
import {WebSocket} from 'ws';
import '../assets/sugar-challenge-rules-v254.js';

// All traffic and all wallet files belong to this disposable local server.
// Exercise the production patch chain and HTTP/WS contracts, including the
// actual offline worker endpoint, rather than mocking the ledger callbacks.
const R=globalThis.SugarChallengeRulesV254,root=new URL('..',import.meta.url).pathname;
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'sugar-server-v254-'));
const coreFile=path.join(temp,'core.json'),walletFile=path.join(temp,'payout-control-v3.json'),admin='sugar-v254-test';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let child,port,base,logs='';const sockets=new Set();
async function start(){
 const listener=net.createServer();listener.listen(0,'127.0.0.1');await once(listener,'listening');port=listener.address().port;await new Promise(resolve=>listener.close(resolve));base='http://127.0.0.1:'+port;
 child=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,PORT:String(port),SWEETS_DATA_FILE:coreFile,SWEETS_DATA_DIR:temp,SWEETS_ADMIN_TOKEN:admin,SWEETS_PLAYER_STABLE_MS:'500',SWEETS_BET_DURATION_MS:'1800',SWEETS_ROUND_START_DELAY_MS:'300',SWEETS_RESULT_GRACE_MS:'3200',SWEETS_HOST_FALLBACK_DELAY_MS:'300'},stdio:['ignore','pipe','pipe']});
 child.stdout.on('data',bytes=>logs+=bytes);child.stderr.on('data',bytes=>logs+=bytes);
 for(let i=0;i<120;i++){if(child.exitCode!==null)throw Error(logs);try{if((await fetch(base+'/api/health')).ok)return;}catch{}await sleep(25);}throw Error('server startup '+logs);
}
async function stop(){
 for(const ws of sockets)ws.terminate();sockets.clear();
 if(child&&child.exitCode===null){const exited=once(child,'exit');child.kill('SIGKILL');await exited;}child=null;
}
async function call(route,{session,body,token=false,expect=200}={}){
 const response=await fetch(base+route+(token?(route.includes('?')?'&':'?')+'adminToken='+admin:''),{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json',...(session?{'x-player-id':session.player.id,Authorization:'Bearer '+session.token}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(5000)});
 const data=await response.json();assert.equal(response.status,expect,route+' '+JSON.stringify(data));return data;
}
const state=session=>call('/api/machines/public-01/state',{session});
const session=displayName=>call('/api/session',{body:{displayName},expect:201});
const wallet=async id=>JSON.parse(await fs.readFile(walletFile,'utf8')).machines['public-01'].players[id];
async function until(fn,label){
 for(let i=0;i<150;i++){if(child?.exitCode!==null)throw Error(logs);const value=await fn();if(value)return value;await sleep(120);}throw Error(label+' '+logs);
}
async function connect(session){
 const ws=new WebSocket('ws://127.0.0.1:'+port+'/ws?machineId=public-01&playerId='+session.player.id+'&token='+session.token),messages=[];
 ws.on('message',bytes=>{try{messages.push(JSON.parse(String(bytes)));}catch{}});ws.on('error',()=>{});sockets.add(ws);await once(ws,'open');return {ws,messages};
}
async function disconnect(connection){const closed=once(connection.ws,'close');connection.ws.close();await closed;sockets.delete(connection.ws);}
const register=host=>call('/api/admin/machines/public-01/host/register',{session:host,body:{},token:true});
const manual=player=>call('/api/admin/machines/public-01/payout-v3/players/'+player.player.id,{body:{mode:'manual',manualRate:100},token:true});
const join=(player,round)=>call('/api/machines/public-01/round/join',{session:player,body:{roundId:round.id,clientRoundToken:'sugar-'+round.id,bets:[100],locked:[100],enabled:[true],totalBet:100,payoutV3Bet:{version:3,games:[{id:'cookie',bet:100}]}}});
const playing=(host,id)=>until(async()=>{const s=await state(host);return s.round?.id===id&&s.round.phase==='PLAYING'?s.round:null;},'playing '+id);
const nextBet=(player,id)=>until(async()=>{const s=await state(player);return s.round?.id!==id&&s.round?.phase==='BETTING'?s:null;},'next BET');
async function ball(host,round,index,number,expect=200){await sleep(Math.max(0,round.drawStartsAt-Date.now()+2));return call('/api/machines/public-01/round/ball',{session:host,body:{roundId:round.id,ballIndex:index,number,eventId:round.id+':'+index},expect});}
const tokens=(round,count,owner)=>Array.from({length:count},(_,i)=>({id:i+1,sugarId:owner+':'+round.id+':'+i,sourceRoundId:round.id,game:0,sourceGame:'cookie',value:100,sourceBet:999999,challengeValue:999999}));
const checkpoint=(player,round,draws,bank,win=0)=>call('/api/machines/public-01/round/checkpoint',{session:player,body:{roundId:round.id,ballIndex:draws.length,state:{savedAt:Date.now(),draws,wonderBank:bank,engines:[],payoutV3:{version:3,ball:draws.length,complete:true,phase:'PLAYING',credit:999900,roundBet:100,roundWin:win,games:[{id:'cookie',bet:100,win,appliedRate:100}]}}}});
const settle=(player,round,win,bank)=>call('/api/machines/public-01/round/settle',{session:player,body:{roundId:round.id,totalWin:win,creditAfter:999900+win,sugarV254:{tokens:bank},payoutV3:{version:3,games:[{id:'cookie',bet:100,win}]}}});
const work=()=>call('/api/admin/machines/public-01/payout-v3/offline-work',{token:true});
const completeWork=(job,win,bank)=>call('/api/admin/machines/public-01/payout-v3/offline-work/complete',{token:true,body:{token:job.token,playerId:job.playerId,roundId:job.roundId,totalWin:win,creditAfter:999900+win,games:[{id:'cookie',bet:100,win}],sugarV254:{tokens:bank}}});
async function recoveryFixture(){
 const dir=path.join(temp,'receipt-recovery');await fs.mkdir(dir);
 const source='recovery-source',valid={id:1,sugarId:'recover-valid',sourceRoundId:source,game:0,value:25};
 const invalid={id:2,sugarId:'recover-zero-bet',sourceRoundId:source,game:1,value:999};
 const unknown={id:3,sugarId:'recover-unknown-round',sourceRoundId:'not-an-earned-round',game:0,value:999};
 const core={machines:{'public-01':{id:'public-01',round:{id:source,phase:'PLAYING',startedAt:1000,balls:[],participants:{recover:{totalBet:100,locked:[100,0],bets:[100,0],checkpoint:{wonderBank:[valid,invalid,unknown]}},legacy:{totalBet:100,locked:[100],checkpoint:{wonderBank:[{id:1,game:0,value:70}]}}}},history:[]}}};
 const makePlayer=playerId=>({playerId,mode:'manual',manualRate:100,effectiveRate:100,wallet:{credit:1000000,revision:1,initializationVersion:228},games:{},rounds:{[source]:{id:source,bet:100,quotedRate:100,games:{cookie:{bet:100,win:0}}}}});
 await fs.writeFile(path.join(dir,'payout-control-v3.json'),JSON.stringify({version:3,machines:{'public-01':{id:'public-01',players:{recover:makePlayer('recover'),legacy:makePlayer('legacy')}}}}));
 const moduleUrl=new URL('../server-payout-preload-v3.mjs',import.meta.url).href;
 const code=`import fs from 'node:fs';await import(${JSON.stringify(moduleUrl)});const core=JSON.parse(fs.readFileSync(0,'utf8'));const bridge=globalThis[Symbol.for('sweets-link.payout-v3.wallet')];bridge.attachCore(core);bridge.attachCore(core);`;
 const run=spawnSync(process.execPath,['--input-type=module','-e',code],{env:{...process.env,SWEETS_DATA_DIR:dir},input:JSON.stringify(core),encoding:'utf8',timeout:10000});
 assert.equal(run.status,0,run.stderr);const players=JSON.parse(await fs.readFile(path.join(dir,'payout-control-v3.json'),'utf8')).machines['public-01'].players;
 assert.equal(players.recover.sugarV254.bank.length,1,'recovery never imports v254 zero-BET/unknown-round tokens as legacy');
 const recovered=players.recover.sugarV254.bank[0];assert.equal(recovered.sourceRoundId,source);assert.equal(recovered.sourceBet,100);assert.equal(recovered.value,25);assert.equal(recovered.legacy,false);assert(recovered.challengeValue>=800&&recovered.challengeValue<=1200);
 assert.equal(players.legacy.sugarV254.bank.length,1);assert.equal(players.legacy.sugarV254.legacyImported,true);assert.equal(players.legacy.sugarV254.bank[0].sourceBet,70,'genuine pre-v254 Sugar retains one-time migration');
}

try{
 await start();const host=await session('SUGAR HOST'),a=await session('SUGAR A'),b=await session('SUGAR B');
 let hw=await connect(host),aw=await connect(a),bw=await connect(b);await manual(a);await manual(b);await sleep(550);await register(host);
 let round=(await state(a)).round;await join(a,round);await join(b,round);round=await playing(host,round.id);
 const sourceRound=round,atokens=tokens(round,5,'a'),btokens=tokens(round,5,'b');
 for(let i=1;i<=5;i++)await ball(host,round,i,i);
 let response=await checkpoint(a,round,[1,2,3,4,5],atokens,10);
 assert.equal(response.payoutControlV3.sugarV254.bank.length,5);assert.equal(response.payoutControlV3.sugarV254.challenge,null,'five Sugar cannot start in their earning round');
 assert(response.payoutControlV3.sugarV254.bank.every(t=>t.sourceBet===100&&t.challengeValue>=800&&t.challengeValue<=1200),'source BET and P/O are server-owned');
 await checkpoint(a,round,[1,2,3,4,5],atokens,10);
 assert.equal((await state(a)).sugarV254.bank.length,5,'replayed checkpoint does not duplicate Sugar');
 await checkpoint(b,round,[1,2,3,4,5],btokens.slice(0,4),20);await disconnect(bw);
 for(let i=6;i<=8;i++)await ball(host,round,i,i);
 response=await settle(a,round,10,atokens);assert.equal(response.payoutControlV3.wallet.credit,999910);await settle(a,round,10,atokens);
 const offline=await until(async()=>{const result=await work();return result.work;},'source worker');assert.equal(offline.playerId,b.player.id);
 await completeWork(offline,20,btokens);assert.equal((await state(b)).sugarV254.bank.length,5,'offline worker adds the final Sugar exactly once');
 bw=await connect(b);await sleep(550);

 // At the next shared BET both seated players start, even if one places no
 // new normal-game BET. Their five values/card/multiplier are already fixed.
 const next=await nextBet(a,round.id);round=next.round;
 const ac=next.sugarV254.challenge,bs=await state(b),bc=bs.sugarV254.challenge;
 assert.equal(ac.roundId,round.id);assert.equal(bc.roundId,round.id);assert.equal(ac.drawCount,0);assert.equal(next.sugarV254.bank.length,0);
 assert.equal(ac.sugarTokens.length,5);assert.deepEqual(ac.sugarTokens.map(t=>t.sourceRoundId),Array(5).fill(sourceRound.id));
 await join(a,round);round=await playing(host,round.id);const cashRound=round,cashDraws=[5,7,9,11,15,17,19,21],newTokens=tokens(round,5,'a-next');
 for(let i=0;i<5;i++)await ball(host,round,i+1,cashDraws[i]);
 await checkpoint(a,round,cashDraws.slice(0,5),newTokens,31);await disconnect(aw);await disconnect(bw);
 for(let i=5;i<7;i++)await ball(host,round,i+1,cashDraws[i]);
 const seven=await state(a),lockedIdentity=R.snapshot(ac);lockedIdentity.draws=cashDraws.slice(0,7);
 assert.deepEqual(R.snapshot(seven.sugarV254.challenge),lockedIdentity);
 await until(async()=>{try{return JSON.parse(await fs.readFile(coreFile,'utf8')).machines['public-01'].round.balls.length===7;}catch{return false;}},'durable seventh ball');
 await stop();await start();hw=await connect(host);await register(host);
 const restored=await state(a);assert.equal(restored.round.id,cashRound.id);assert.deepEqual(R.snapshot(restored.sugarV254.challenge),lockedIdentity,'restart retains locked quote and exactly seven shared results');
 assert.equal(restored.sugarV254.bank.length,5);assert(restored.sugarV254.bank.every(t=>t.sourceRoundId===cashRound.id),'restart retains the real source round');
 hw.ws.send(JSON.stringify({type:'host_fallback_request',roundId:round.id}));await sleep(350);
 assert.equal((await state(a)).round.balls.length,7,'host fallback never invents an eighth ball');
 await ball(host,restored.round,8,cashDraws[7]);
 const paidA=await state(a),paidB=await state(b),aCash=Math.floor(ac.jpAmount/100),bCash=Math.floor(bc.jpAmount/100);
 assert.equal(paidA.sugarV254.challenge.cashPaid,aCash);assert.equal(paidB.sugarV254.challenge.cashPaid,bCash);
 assert.equal(paidA.payoutControlV3.wallet.credit,999810+aCash,'Sugar cash settles while the normal round still awaits its worker');
 assert.equal(paidB.payoutControlV3.wallet.credit,999920+bCash,'a zero-new-BET player receives the carried challenge');
 const repeated=await ball(host,restored.round,8,cashDraws[7],409);assert.equal(repeated.error,'round_not_playing');
 assert.equal((await state(a)).payoutControlV3.wallet.credit,paidA.payoutControlV3.wallet.credit);
 const cashWork=await until(async()=>{const result=await work();return result.work;},'cash-round worker');assert.equal(cashWork.playerId,a.player.id);
 await completeWork(cashWork,31,newTokens);
 const settledA=await state(a);assert.equal(settledA.payoutControlV3.wallet.credit,999841+aCash);assert.equal(settledA.payoutControlV3.lifetimeWin,41+aCash,'native and Sugar WIN are added once each');
 assert.equal(settledA.sugarV254.bank.length,5);
 aw=await connect(a);bw=await connect(b);await sleep(550);

 // A third no-new-BET round qualifies JPC on its fourth ball for every card. No cash or JPC
 // game is fabricated; the persisted ticket carries the predetermined JP.
 const jpcNext=await nextBet(a,round.id);round=await playing(host,jpcNext.round.id);const jc=jpcNext.sugarV254.challenge;
 assert.equal(jc.roundId,round.id);assert.equal(jpcNext.sugarV254.bank.length,0);
 const earlyDraws=[25,24,23,16,1,2,3,4]; // 88 on ball 4 qualifies every card; final 98 is ordinary cash.
 for(let i=0;i<3;i++)await ball(host,round,i+1,earlyDraws[i]);
 const hostThree=await state(host);assert.equal(hostThree.sugarV254,null);
 const reaches=hostThree.sugarReachesV254;assert(reaches.some(row=>row.station===jc.station&&row.number===16&&row.status==='reach'),'lucky reach is published before ball 8');
 assert(reaches.every(row=>!('jpAmount' in row)&&!('playerId' in row)&&!('sugarTokens' in row)),'shared roulette receives station/number only');
 await ball(host,round,4,16);const early=await state(a),earlyHost=await state(host);
 assert.equal(early.sugarV254.challenge.phase,'drawing');assert.equal(early.sugarV254.challenge.jpcQualified,true);assert.equal(early.sugarV254.challenge.qualifyingDrawCount,4);assert.equal(early.sugarV254.jpcTickets.length,1);assert.equal(early.sugarV254.jpcTickets[0].number,16);assert.equal(early.sugarV254.jpcTickets[0].sum,88);assert.equal(early.sugarV254.challenge.cashPaid,0);
 assert(earlyHost.sugarReachesV254.some(row=>row.station===jc.station&&row.number===16&&row.status==='acquired'),'early acquisition reaches the physical roulette');
 for(let i=4;i<8;i++)await ball(host,round,i+1,earlyDraws[i]);const qualified=await state(a);
 assert.equal(qualified.sugarV254.challenge.sum,98);assert.equal(qualified.sugarV254.challenge.jpcQualified,true);assert.equal(qualified.sugarV254.challenge.cashPaid,0);assert.deepEqual(qualified.sugarV254.jpcTickets,early.sugarV254.jpcTickets);
 assert.equal(qualified.sugarV254.jpcTickets.length,1);assert.equal(qualified.sugarV254.jpcTickets[0].jpAmount,jc.jpAmount);assert.equal(qualified.sugarV254.jpcTickets[0].status,'pending-implementation');
 assert.equal(qualified.payoutControlV3.wallet.credit,999841+aCash);
 assert(aw.messages.filter(m=>m.type==='sugar_challenge_v254').every(m=>m.payoutControlV3?.playerId===a.player.id));
 assert(hw.messages.filter(m=>m.type==='sugar_challenge_v254').every(m=>!m.sugarV254&&!m.payoutControlV3));
 await until(async()=>{try{return (await wallet(a.player.id)).sugarV254.rounds[round.id]?.paid;}catch{return false;}},'durable JPC right');
 await stop();await start();
 const cold=await state(a);assert.equal(cold.sugarV254.jpcTickets.length,1);assert.equal(cold.sugarV254.jpcTickets[0].id,qualified.sugarV254.jpcTickets[0].id);assert.equal(cold.payoutControlV3.wallet.credit,999841+aCash);
 assert.equal((await state(b)).payoutControlV3.wallet.credit,999920+bCash);
 await recoveryFixture();
 console.log('SUGAR_SERVER_V254_PASS: production HTTP/WS, server source BET, duplicate receipts, next-BET activation, zero-new-BET challenge, offline worker awards, seven-ball cold recovery, no invented draws, one-time independent bonus, private state, station reaches, durable JPC entitlement and source-checked receipt recovery');
}finally{await stop();await fs.rm(temp,{recursive:true,force:true});}

import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import {createDownloadLedgerV255,DOWNLOAD_GAME_IDS_V255} from '../server-download-ledger-v255.mjs';
import {createSugarChallengeLedger} from '../server-sugar-challenge-v254.mjs';
import {computedFixtureV255} from './download-v255-fixture.mjs';
const {R,clone,NUMBERS,fullRound}=createRequire(import.meta.url)('./sixdrop-v283-history.cjs');
const prior={version:247,revision:4,roundId:'prior',bankUnits:123456,removed:99,feed:450};
const value=c=>({bankUnits:c.bankUnits,removed:c.removed,feed:c.feed});
const temp=await mkdtemp(path.join(os.tmpdir(),'sixdrop-v283-settlement-')),file=path.join(temp,'payout-control-v3.json');
const names=['positive','partial','zero','nonparticipant'];
await writeFile(file,JSON.stringify({version:3,machines:{isolated:{id:'isolated',players:Object.fromEntries(names.map(playerId=>[playerId,{playerId,sixDropV247:prior,rounds:{},games:{},wallet:{credit:1000000,revision:1,initializationVersion:228}}]))}}}));
process.env.SWEETS_DATA_DIR=temp;process.env.SWEETS_ADMIN_TOKEN='isolated-v283';
await import('../server-payout-preload-v3.mjs');
const bridge=globalThis[Symbol.for('sweets-link.payout-v3.wallet')];
bridge.attachCore({machines:{isolated:{id:'isolated',round:null,history:[]}}});
const read=async name=>JSON.parse(await readFile(file,'utf8')).machines.isolated.players[name];
const row=(win,bet,carry)=>({id:'candy',rulesVersion:247,win,bet,carryV247:carry});
const positive=fullRound(10,{bet:3000,carry:prior}),zero=fullRound(6,{bet:3000,carry:prior});
assert.equal(positive.win,72934);assert.equal(zero.win,0);
try{
 for(const name of names){
  const partial=name==='partial',passive=name==='nonparticipant',actual=name==='positive'?positive:zero;
  const candy=row(partial||passive?0:actual.win,passive?0:3000,partial?R.carryOut(positive.plans[6].state):R.carryOut(actual.state));
  const games=[candy,...(passive||name==='zero'?[{id:'cookie',bet:passive?3000:100,win:700}]:[])],totalBet=games.reduce((n,g)=>n+g.bet,0);
  const raw={id:'round-'+name,phase:'PLAYING',sequence:1,balls:NUMBERS.slice(0,partial?7:8).map((number,index)=>({number,index:index+1})),participants:{[name]:{totalBet,creditAfterBet:1000000-totalBet}}};
  bridge.reserve('isolated',name,raw,{totalBet,bets:games.map(g=>g.bet),enabled:games.map(g=>g.bet>0),payoutV3Bet:{version:3,games}});
  const body={roundId:raw.id,abandoned:partial,totalWin:games.reduce((n,g)=>n+g.win,0),payoutV3:{version:3,games}};
  bridge.settle('isolated',name,raw,body);
  const paid=await read(name),expected=name==='positive'?R.carryOut(actual.state):partial||passive?prior:R.cleanCarry(null);
  assert.deepEqual(value(paid.sixDropV247),value(expected),name+' carry follows completed own Eight-ball WIN');
  assert.equal(paid.wallet.credit,1000000-totalBet+body.totalWin);
  bridge.settle('isolated',name,raw,body);assert.deepEqual(await read(name),paid,'settlement receipt prevents a second award');
  if(name==='positive'){
   bridge.operatorCancel('isolated',raw,'isolated-cancel');const cancelled=await read(name);
   assert.equal(cancelled.wallet.credit,1000000);assert.deepEqual(value(cancelled.sixDropV247),value(prior));
  }
 }
}finally{await rm(temp,{recursive:true,force:true});}

// Persist actual v283 state at all nine single-ball checkpoints. The trusted
// recording envelope is a contract fixture; the host test runs the real worker.
let database={machines:{}},durable='',clock=1700000000000,id=0;
const getMachine=mid=>database.machines[mid]||(database.machines[mid]={id:mid,players:{}});
const getPlayer=(mid,pid)=>getMachine(mid).players[pid]||(getMachine(mid).players[pid]={playerId:pid,rounds:{},games:{},sixDropV247:clone(prior),lifetimeBet:0,lifetimeWin:0,wallet:{credit:1000000,revision:1,initializationVersion:228}});
function ledger(){return createDownloadLedgerV255({getPlayer,getMachine,listMachineIds:()=>Object.keys(database.machines),ensureWallet:()=>true,quoteRate:()=>90,coreRounds:()=>[],sugarLedger:createSugarChallengeLedger({randomSeed:()=>254}),now:()=>clock++,randomSeed:()=>10,newId:()=>`dl255-sixdrop-v283-session-${++id}`,transaction(mid,change){const before=clone(getMachine(mid));try{change();durable=JSON.stringify(database);}catch(error){database.machines[mid]=before;throw error;}}});}
let L=ledger();
const save=output=>{const text=JSON.stringify(output);return {file:'isolated.json',bytes:Buffer.byteLength(text),sha256:createHash('sha256').update(text).digest('hex')};};
const resultCases=[];
for(const [index,caseName] of ['positive','positive-bet-change','nonparticipant','zero'].entries()){
 const bet=caseName==='positive-bet-change'?333:caseName==='nonparticipant'?0:3000,bets=DOWNLOAD_GAME_IDS_V255.map(game=>game==='candy'?bet:game==='cookie'&&!bet?100:0);
 const before=clone(getPlayer('download','isolated').sixDropV247),prepared=L.prepare('download','isolated',{requestId:'sixdrop-v283-request-'+index,bets,gameIds:DOWNLOAD_GAME_IDS_V255});
 const input=L.work('download','isolated',prepared.id);assert.deepEqual(input.sixDropCarry,before);
 const actual=bet?fullRound(caseName==='zero'?6:10,{bet,carry:before}):null,output=computedFixtureV255(input,{numbers:NUMBERS,sugars:0});
 output.games=DOWNLOAD_GAME_IDS_V255.map((game,i)=>({id:game,bet:bets[i],win:game==='candy'&&actual?actual.win:0,...(game==='candy'?{rulesVersion:247,carryV247:actual?R.carryOut(actual.state,prepared.id):R.cleanCarry(before)}:{})}));
 output.totalWin=actual?.win||0;
 if(caseName==='zero')assert.equal(output.totalWin,0);
 for(const state of [output.initialState,...output.playback.checkpoints])if(actual){
  const ball=state.ballIndex;Object.assign(state.engines[2],{rulesVersion:247,drawMode:'single',reachMode:'single',processed:ball,accepted:ball,state:clone(ball?actual.plans[ball-1].state:actual.initial)});
  assert.equal(state.engines[2].state.draws.length,ball);
 }
 output.finalState={...output.playback.checkpoints[8],phase:'complete',credit:input.creditBefore-input.totalBet+output.totalWin,displayCredit:input.creditBefore-input.totalBet+output.totalWin};
 const finished=L.finish('download','isolated',prepared.id,output,save),stored=clone(getPlayer('download','isolated').sixDropV247);
 assert.equal(finished.wallet.credit,output.finalState.credit);assert.deepEqual(value(stored),actual?value(R.carryOut(actual.state)):value(before));
 const receipt=L.state('download','isolated');
 L.finish('download','isolated',prepared.id,output,()=>{throw Error('duplicate cannot republish');});assert.deepEqual(L.state('download','isolated'),receipt);
 L.complete('download','isolated',{sessionId:prepared.id});resultCases.push({caseName,bet,win:output.totalWin,...value(stored)});
 database=JSON.parse(durable);L=ledger();assert.deepEqual(getPlayer('download','isolated').sixDropV247,stored,'cold restart retains the exact committed carry');
 if(actual)assert.deepEqual(getPlayer('download','isolated').downloadV255.gameState.engines[2].state,actual.state);
}
assert.equal(resultCases.at(-1).bankUnits,0);assert.equal(resultCases.at(-1).removed,0);
console.log('SIXDROP_V283_SETTLEMENT_PASS',JSON.stringify({revision:283,streaming:['single-eight-ball positive','seven-ball interruption','own zero despite other-game WIN','nonparticipant','receipt retry','operator cancellation'],download:resultCases}));

import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {createDownloadLedgerV255,DOWNLOAD_GAME_IDS_V255} from '../server-download-ledger-v255.mjs';
import {createSugarChallengeLedger} from '../server-sugar-challenge-v254.mjs';
import {computedFixtureV255} from './download-v255-fixture.mjs';
const {R,clone,NUMBERS,fullRound:fixtureRound}=createRequire(import.meta.url)('./sixdrop-v278-fixture.cjs');
const rulesRevision=Number(process.env.SIXDROP_SETTLEMENT_REVISION||278);
assert([278,280].includes(rulesRevision));
const fullRound=(seed,options)=>fixtureRound(seed,{...options,rulesRevision});
const positiveSeed=rulesRevision===280?3:9;
const prior={version:247,revision:4,roundId:'prior',bankUnits:123456,removed:99,feed:450};
const value=c=>({bankUnits:c.bankUnits,removed:c.removed,feed:c.feed});
const temp=await mkdtemp(path.join(os.tmpdir(),'sixdrop-v278-settlement-')),file=path.join(temp,'payout-control-v3.json');
const names=['early-bridge','late-bridge','normal','passive','positive','early-http','late-http','unknown-http'];
await writeFile(file,JSON.stringify({version:3,machines:{'qa-machine':{id:'qa-machine',players:Object.fromEntries(names.map(playerId=>[playerId,{playerId,sixDropV247:prior,rounds:{},games:{},wallet:{credit:1000000,revision:1,initializationVersion:228}}]))}}}));
process.env.SWEETS_DATA_DIR=temp;process.env.SWEETS_ADMIN_TOKEN='isolated-v278';
await import('../server-payout-preload-v3.mjs');
const bridge=globalThis[Symbol.for('sweets-link.payout-v3.wallet')];
const core={machines:{'qa-machine':{id:'qa-machine',round:null,history:[]}}};bridge.attachCore(core);
const read=async name=>JSON.parse(await readFile(file,'utf8')).machines['qa-machine'].players[name];
const row=(win,bet=3000,carry=prior)=>({id:'candy',rulesVersion:247,bet,win,carryV247:carry});
const server=http.createServer(async(req,res)=>{if(req.method==='POST')for await(const _ of req){}res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({ok:true,settlement:{}}));});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
const round=(playerId,count,phase='PLAYING')=>({id:'round-'+playerId,phase,sequence:1,balls:NUMBERS.slice(0,count).map((number,index)=>({number,index:index+1})),participants:{[playerId]:{totalBet:3000,creditAfterBet:997000}}});
function reserve(playerId,raw){return bridge.reserve('qa-machine',playerId,raw,{totalBet:3000,bets:[3000],enabled:[true],payoutV3Bet:{version:3,games:[row(0)]}});}
function body(raw,{abandoned=false,games=[row(0)]}={}){return {roundId:raw.id,abandoned,totalWin:games.reduce((sum,g)=>sum+g.win,0),payoutV3:{version:3,games}};}
try{
 for(const item of [{name:'early-bridge',count:2,keep:true},{name:'late-bridge',count:8,keep:false},{name:'normal',count:8,keep:false,abandoned:false}]){
  const raw=round(item.name,item.count);reserve(item.name,raw);bridge.settle('qa-machine',item.name,raw,body(raw,{abandoned:item.abandoned??true}));
  const p=await read(item.name);assert.deepEqual(value(p.sixDropV247),item.keep?value(prior):{bankUnits:0,removed:0,feed:0},item.name);
  const settled=clone(p);bridge.settle('qa-machine',item.name,raw,body(raw,{abandoned:true}));assert.deepEqual(await read(item.name),settled,'duplicate settle cannot change carry or wallet');
 }
 for(const item of [{name:'early-http',count:4,keep:true},{name:'late-http',count:8,keep:false},{name:'unknown-http',count:4,keep:false,known:false}]){
  const raw=round(item.name,item.count);reserve(item.name,raw);core.machines['qa-machine'].round=item.known===false?null:raw;
  const response=await fetch(base+'/api/machines/qa-machine/round/settle',{method:'POST',headers:{'content-type':'application/json','x-player-id':item.name},body:JSON.stringify(body(raw,{abandoned:true,games:[row(0),{id:'cookie',bet:100,win:70}]}))});
  assert.equal(response.status,200);const payload=await response.json();assert(payload.payoutControlV3);
  assert.deepEqual(value((await read(item.name)).sixDropV247),item.keep?value(prior):{bankUnits:0,removed:0,feed:0},'HTTP '+item.name+' distinguishes authenticated incomplete round from a client flag');
 }
 const passive=round('passive',8);reserve('passive',passive);bridge.settle('qa-machine','passive',passive,body(passive,{games:[row(0,0),{id:'cookie',bet:3000,win:0}]}));
 assert.deepEqual(value((await read('passive')).sixDropV247),value(prior),'unbet Six Drop never resets even after eight balls');
 const win=fullRound(positiveSeed,{bet:3000,carry:R.cleanCarry(prior)}),positive=round('positive',8);reserve('positive',positive);
 if(rulesRevision===280)assert.equal(win.win,4500,'the new rounded payout reaches the authoritative settlement bridge');
 bridge.settle('qa-machine','positive',positive,body(positive,{games:[row(win.win,3000,R.carryOut(win.state,positive.id))]}));
 const paid=await read('positive');assert.equal(paid.wallet.credit,1000000-3000+win.win);assert.deepEqual(value(paid.sixDropV247),value(R.carryOut(win.state)));
 bridge.operatorCancel('qa-machine',positive,'qa-cancel');const cancelled=await read('positive');assert.equal(cancelled.wallet.credit,1000000);assert.deepEqual(value(cancelled.sixDropV247),value(prior),'operator cancel restores pre-BET bank and palette progress');
}finally{await new Promise(resolve=>server.close(resolve));await rm(temp,{recursive:true,force:true});}

// The download ledger receives actual grouped-rule Six Drop values. Its
// generic recording envelope is a contract fixture; the browser suite also
// runs the real download worker with physical input and nine checkpoints.
let database={machines:{}},durable='',clock=1700000000000,id=0;
const getMachine=mid=>database.machines[mid]||(database.machines[mid]={id:mid,players:{}});
const getPlayer=(mid,pid)=>getMachine(mid).players[pid]||(getMachine(mid).players[pid]={playerId:pid,rounds:{},games:{},sixDropV247:clone(prior),lifetimeBet:0,lifetimeWin:0,wallet:{credit:1000000,revision:1,initializationVersion:228}});
function ledger(){return createDownloadLedgerV255({getPlayer,getMachine,listMachineIds:()=>Object.keys(database.machines),ensureWallet:()=>true,quoteRate:()=>90,coreRounds:()=>[],sugarLedger:createSugarChallengeLedger({randomSeed:()=>254}),now:()=>clock++,randomSeed:()=>9,newId:()=>`dl255-sixdrop-v278-session-${++id}`,transaction(mid,change){const before=clone(getMachine(mid));try{change();durable=JSON.stringify(database);}catch(error){database.machines[mid]=before;throw error;}}});}
let L=ledger();
const save=output=>{const text=JSON.stringify(output);return {file:'isolated.json',bytes:Buffer.byteLength(text),sha256:createHash('sha256').update(text).digest('hex')};};
const resultCases=[];
for(const [index,caseName]of ['positive','positive-bet-change','nonparticipant','zero'].entries()){
 const bet=caseName==='positive-bet-change'?301:caseName==='nonparticipant'?0:3000,bets=DOWNLOAD_GAME_IDS_V255.map(game=>game==='candy'?bet:game==='cookie'&&!bet?100:0);
 const before=clone(getPlayer('download','qa').sixDropV247),prepared=L.prepare('download','qa',{requestId:'sixdrop-v278-request-'+index,bets,gameIds:DOWNLOAD_GAME_IDS_V255});
 const input=L.work('download','qa',prepared.id);assert.deepEqual(input.sixDropCarry,before,'download continuation comes from the committed server balance');
 const actual=bet?fullRound(caseName==='zero'?2:positiveSeed,{bet,carry:R.cleanCarry(before)}):null;
 const output=computedFixtureV255(input,{numbers:NUMBERS,sugars:0});
 output.games=DOWNLOAD_GAME_IDS_V255.map((game,i)=>({id:game,bet:bets[i],win:game==='candy'&&actual?actual.win:0,...(game==='candy'?{rulesVersion:247,carryV247:actual?R.carryOut(actual.state,prepared.id):R.cleanCarry(before)}:{})}));
 output.totalWin=actual?.win||0;
 for(const state of [output.initialState,...output.playback.checkpoints])if(actual){state.engines[2].state=clone(state.ballIndex===8?actual.state:actual.initial);state.engines[2].drawMode='grouped';}
 output.finalState={...output.playback.checkpoints[8],phase:'complete',credit:input.creditBefore-input.totalBet+output.totalWin,displayCredit:input.creditBefore-input.totalBet+output.totalWin};
 const finished=L.finish('download','qa',prepared.id,output,save),stored=clone(getPlayer('download','qa').sixDropV247);
 assert.equal(finished.wallet.credit,output.finalState.credit);
 assert.deepEqual(value(stored),actual?value(R.carryOut(actual.state)):value(before),caseName+' download settlement');
 const wallet=clone(finished.wallet);L.finish('download','qa',prepared.id,output,()=>{throw Error('retry cannot republish');});assert.deepEqual(L.state('download','qa').wallet,wallet);
 L.complete('download','qa',{sessionId:prepared.id});resultCases.push({caseName,bet,win:output.totalWin,...value(stored)});
 database=JSON.parse(durable);L=ledger();assert.deepEqual(getPlayer('download','qa').sixDropV247,stored,'cold restart preserves each carry transition');
}
assert.equal(resultCases.at(-1).bankUnits,0);assert.equal(resultCases.at(-1).removed,0);
console.log('SIXDROP_V'+rulesRevision+'_SETTLEMENT_PASS',JSON.stringify({rulesRevision,streaming:['early bridge + HTTP','eight-ball zero even with abandoned flag','unknown interruption denied','other-game WIN with own zero','nonparticipant','positive awards and carry','operator cancellation','idempotent retry'],download:resultCases}));

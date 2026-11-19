import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {createDownloadLedgerV255,DOWNLOAD_GAME_IDS_V255} from '../server-download-ledger-v255.mjs';
import {createSugarChallengeLedger} from '../server-sugar-challenge-v254.mjs';
import {computedFixtureV255} from './download-v255-fixture.mjs';

const clone=value=>JSON.parse(JSON.stringify(value));
const rules=globalThis.SugarChallengeRulesV254;
const bets=DOWNLOAD_GAME_IDS_V255.map(()=>100),machineId='ledger',playerId='alice';
function harness(serialized){
 let database=serialized?JSON.parse(serialized):{machines:{}},durable=JSON.stringify(database),clock=1700000000000,seedCalls=0;
 const getMachine=id=>database.machines[id]||(database.machines[id]={id,players:{}});
 const getPlayer=(mid,pid)=>getMachine(mid).players[pid]||(getMachine(mid).players[pid]={playerId:pid,rounds:{},games:{},lifetimeBet:0,lifetimeWin:0,wallet:{credit:1000000,revision:1,initializationVersion:228}});
 const sugarLedger=createSugarChallengeLedger({rules:{...rules,create:options=>rules.create({...options,cardId:'standard',multiplier:2})},randomSeed:()=>254,now:()=>clock++});
 const ledger=createDownloadLedgerV255({getPlayer,getMachine,listMachineIds:()=>Object.keys(database.machines),ensureWallet:()=>true,quoteRate:()=>100,coreRounds:()=>[],sugarLedger,now:()=>clock++,randomSeed:()=>{seedCalls++;return 25519+seedCalls;},newId:()=>`dl255-${randomUUID()}`,
  transaction(mid,change){const before=clone(getMachine(mid));try{change();durable=JSON.stringify(database);}catch(error){database.machines[mid]=before;throw error;}}
 });
 return {ledger,getPlayer,sugarLedger,durable:()=>durable,seeds:()=>seedCalls};
}
let h=harness(),L=h.ledger;
const prepare=(id='request-unit-000001',extra={})=>L.prepare(machineId,playerId,{requestId:id,bets,gameIds:DOWNLOAD_GAME_IDS_V255,profile:{name:'ALICE'},...extra});
const get=()=>L.state(machineId,playerId);
const save=value=>{const data=JSON.stringify(value);return {file:'test.json',bytes:Buffer.byteLength(data),sha256:createHash('sha256').update(data).digest('hex')};};

for(const changed of [{bets:[]},{bets:bets.map((n,i)=>i?-1:n)},{bets:bets.map(()=>0)},{requestId:'short'},{gameIds:['forged']},{bets:[Number.MAX_SAFE_INTEGER,...bets.slice(1)]}])assert.throws(()=>prepare(undefined,changed));
const p=h.getPlayer(machineId,playerId);p.rounds.forged={id:'forged',committed:true,stableState:{credit:999999999,draws:[25],forged:true}};p.sixDropV247={version:247,revision:2,bankUnits:900,removed:3,feed:4};
const first=prepare(),id=first.id;
assert.equal(first.wallet.credit,1000000);assert.equal(first.session.totalBet,1000);assert.equal(L.locked(machineId,playerId),true);
const input=L.work(machineId,playerId,id);assert.equal(input.previousState,null,'Streaming checkpoint is not a trusted continuation');assert.deepEqual(input.sixDropCarry,p.sixDropV247);
assert.equal(prepare().id,id);assert.equal(prepare('request-unit-000002',{bets:bets.map(n=>n+10)}).id,id,'one active request cannot reroll');assert.equal(h.seeds(),1);
assert.throws(()=>prepare(undefined,{bets:bets.map(n=>n+10)}),/download_request_conflict/);
assert.throws(()=>L.state(machineId,'bob',{sessionId:id}),/download_session_not_found/);

// A persisted preparing session reuses every frozen input after process loss.
const saved=h.durable();h=harness(saved);L=h.ledger;assert.deepEqual(L.work(machineId,playerId,id),input);assert.equal(h.seeds(),0);
L.failed(machineId,playerId,id,Error('worker stopped'));assert.equal(get().session.status,'failed');assert.deepEqual(L.work(machineId,playerId,id),input);
const valid=computedFixtureV255(input),before=get();
for(const corrupt of [
 {...valid,numbers:[1,1,3,8,20,21,24,25]},
 {...valid,totalWin:valid.totalWin+1},
 {...valid,games:[{...valid.games[0],win:-1},...valid.games.slice(1)]},
 {...valid,games:valid.games.slice(1)},
 {...valid,finalState:{...valid.finalState,draws:[25]}},
 {...valid,playback:{...valid.playback,recording:{...valid.playback.recording,hits:[]}}},
 {...valid,playback:{...valid.playback,checkpoints:valid.playback.checkpoints.slice(1)}}
]){assert.throws(()=>L.finish(machineId,playerId,id,corrupt,save));assert.deepEqual(get().wallet,before.wallet);}
assert.throws(()=>L.finish(machineId,playerId,id,valid,()=>{throw Error('disk unavailable');}),/disk unavailable/);
assert.deepEqual(get().wallet,before.wallet);assert.equal(get().sugarState.bank.length,0,'failed package persistence rolls back Sugar and credit together');
let packageValue;
const finished=L.finish(machineId,playerId,id,valid,value=>{packageValue=clone(value);return save(value);});
assert.equal(finished.wallet.credit,1004500);assert.equal(finished.stats.rounds,1);assert.equal(finished.stats.bet,1000);assert.equal(finished.stats.win,5500);assert.equal(finished.stats.games.dango.win,1000);
assert.equal(finished.sugarState.bank.length,5);assert.equal(finished.sugarState.queued,true);assert.equal(finished.sugarState.current,null);
assert.deepEqual(packageValue.playback.checkpoints[8],packageValue.finalState);assert.deepEqual(packageValue.finalState.sugarV254,finished.sugarState);
assert.equal(h.getPlayer(machineId,playerId).sixDropV247.bankUnits,1234);
const committed=clone(get());L.finish(machineId,playerId,id,valid,()=>{throw Error('duplicate must not store');});assert.deepEqual(get(),committed);
L.progress(machineId,playerId,{sessionId:id,seq:5,ballIndex:3,playbackMs:3100});L.progress(machineId,playerId,{sessionId:id,seq:4,ballIndex:2,playbackMs:2000});
assert.deepEqual(get().session.progress,{seq:5,ballIndex:3,playbackMs:3100});assert.deepEqual(get().wallet,committed.wallet);
L.complete(machineId,playerId,{sessionId:id});const acknowledged=get();L.complete(machineId,playerId,{sessionId:id});assert.deepEqual(get(),acknowledged);assert.equal(L.locked(machineId,playerId),false);

// Prior state, receipt IDs and old Sugar quotes carry on the server. Five
// earned tokens enter only the NEXT session and cash adds exactly once.
h=harness(h.durable());L=h.ledger;
const oldState=h.getPlayer(machineId,playerId).downloadV255.gameState;
const second=prepare('request-unit-next-0001'),secondInput=L.work(machineId,playerId,second.id);
assert.deepEqual(secondInput.previousState,oldState);assert.equal(secondInput.sugarState.bank.length,0);assert.equal(secondInput.sugarState.current.roundId,second.id);
const expectedCash=rules.cashFor(secondInput.sugarState.current.jpAmount,1),secondOutput=computedFixtureV255(secondInput,{sugars:0});
let sugarPackage;
const settled=L.finish(machineId,playerId,second.id,secondOutput,value=>{sugarPackage=clone(value);return save(value);});
assert.ok(expectedCash>0);assert.equal(settled.session.sugarWin,expectedCash);assert.equal(settled.wallet.credit,1004500-1000+5500+expectedCash);assert.equal(settled.stats.rounds,2);assert.equal(settled.stats.win,11000+expectedCash);assert.equal(settled.stats.sugarWin,expectedCash);assert.equal(settled.sugarState.bank.length,0);
assert.equal(sugarPackage.playback.sugarStates.length,9);
for(let index=0;index<=8;index++){
 const challenge=sugarPackage.playback.sugarStates[index].challenge;
 assert.deepEqual(challenge.draws,secondOutput.numbers.slice(0,index));
 assert.equal(challenge.sum,secondOutput.numbers.slice(0,index).reduce((sum,n)=>sum+n,0));
 assert.deepEqual(sugarPackage.playback.checkpoints[index].sugarV254,sugarPackage.playback.sugarStates[index]);
}
const storedInput=h.getPlayer(machineId,playerId).downloadV255.sessions[second.id].input;
assert.equal(storedInput.previousState,undefined);assert.equal(storedInput.sugarState,undefined);assert.equal(storedInput.previousSessionId,id);assert.equal(storedInput.previousStateHash,createHash('sha256').update(JSON.stringify(oldState)).digest('hex'));
const settledCopy=clone(settled);L.finish(machineId,playerId,second.id,secondOutput,save);assert.deepEqual(get(),settledCopy);

// An unresolved Streaming reservation cannot be converted into a private game.
const blocked=h.getPlayer('blocked','legacy');blocked.rounds.old={id:'old',committed:false,reservation:{status:'reserved',bet:100}};
assert.throws(()=>L.prepare('blocked','legacy',{requestId:'request-stream-00001',bets}),/streaming_round_unsettled/);
console.log('Download v255 ledger: immutable retries, safe rollback, native contract validation, one-time money/Sugar and trusted continuation passed');

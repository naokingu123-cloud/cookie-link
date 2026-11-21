'use strict';
// Run the production rules, native Arcade adapter, checkpoint restoration and
// actual worker entrypoints. Fixed hashes cover historical saves; the current
// revision is checked against its own core without assuming a particular win.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const {R,G,clone,NUMBERS,createHost,idle,installWorker,streamingCheckpoint,fullRound}=require('./sixdrop-v283-fixture.cjs');
require('../assets/recorded-round-v255.js');
const Recorder=globalThis.SweetsRecordedRoundV255;
globalThis.SweetsLineup={ids:['candy']};
const REVISION=285;
const prior={version:247,bankUnits:123456,removed:199,feed:450,roundId:'previous'};
const carryKey='sweets-local-debug-v258:sixdrop-carry-v278';
const carryValue=c=>{const value=R.cleanCarry(c);delete value.roundId;return value;};
const cellsKey=cells=>cells.map(([r,c])=>r+','+c).sort();
const sha=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');

// Collected from 77912d4b3ece89cd1610e89b7632323506cc81f9 before revision284.
// Hash inputs include the initial state, every full result/timeline, and carry.
const legacySpecs=[
 {seed:10,bet:3000,rate:90,carry:{version:247,bankUnits:123456,removed:99,feed:450,roundId:'previous'}},
 {seed:6,bet:100,rate:50,carry:null},
 {seed:73,bet:333,rate:150,carry:{version:247,bankUnits:98765,removed:399,feed:900,roundId:'carry'}}
];
const legacyHashes={
 248:['1bc52f36b69f06792be737d5e788db5f4552dc2efe0e455bfb34a72385980558','1762f99aaa3d020453f81dcc49bd2d58567faeaa43ad97cd0aabd8122c6aae53','c44fa3b4d4d0a67870fe5484948ca1e92dea0facebb58c3373a55e5cea349e24'],
 278:['eaf4ae5cb72c18b84b0f5399002c4b6303ce2dc0e6da9c610c3d7ac45e890199','40190f8e8e9aa1c4534183782b267f570a6a685f2068bc0539103156c14af10d','bf3dc603006915ade05a3b1e2c2356919ce58819bf9e1de0514776c0405c01bf'],
 280:['d2b088e1937e4dfa9618c82741a10aab89ec9bf08e8256d404cb72184d74e080','654987784d0f8aa8f231d7a1851b364e56ab1eacf3b91495e2ef648e5c2241a6','4e952ebfe905d010e8872889976905fb98beb31a04093bc9a0b11082d4fa105b'],
 283:['f288b3471777db13e99bd3f4f4197dd8310b3c9efee43462fc1c0c53233d0a42','23fcceb776ecc054fa4be90ad0171f92653a16281a332012d97c37b4bff65bc5','c60fbf59c8b82afd53056c6582dc5312869063fa7b38ca997cd02ae0f9fa170e']
};
function historicalWitnesses(){
 const results=[];
 for(const revision of [248,278,280,283])for(const [index,spec]of legacySpecs.entries()){
  const round=fullRound(spec.seed,{...spec,rulesRevision:revision});
  const fingerprint=sha({initial:round.initial,plans:round.plans,carry:R.carryOut(round.state,'finished')});
  assert.equal(fingerprint,legacyHashes[revision][index],'exact historical state, timeline, RNG and awards for '+revision+'/'+spec.seed);
  results.push({revision,seed:spec.seed,win:round.win,sha256:fingerprint});
 }
 return results;
}
function findRound(predicate,options={}){
 for(let seed=1;seed<=300;seed++){
  const round=fullRound(seed,{bet:3000,carry:prior,trace:false,...options});
  if(predicate(round))return fullRound(seed,{bet:3000,carry:prior,...options,trace:true});
 }
 throw Error('No integration witness found in 300 deterministic seeds');
}
function installDownloadWorker(host){
 host.window.SweetsRecordedRoundV255=Recorder;
 const noop=()=>{},scope={window:host.window,location:{search:'?downloadWorker=1'},app:host.app,SweetsLineup:host.window.SweetsLineup,rouletteDrawSource:host.app.drawSource,
  stopAutoRound:noop,stopResultAuto:noop,scheduleAutoRound:noop,syncResultAuto:noop,debugPayoutTarget:90,debugForceRainbowSugar:false,
  recordBook:{data:{},load(value){this.data=value;}},CustomEvent:class{constructor(type,options={}){this.type=type;this.detail=options.detail;}},URLSearchParams,setTimeout,clearTimeout,console};
 new Function(...Object.keys(scope),fs.readFileSync('assets/download-worker-v255.js','utf8'))(...Object.values(scope));
 return host.window.SweetsDownloadWorkerV255;
}

async function run(){
 const started=Date.now(),legacy=historicalWitnesses();
 assert.equal(R.CURRENT_REVISION,REVISION);
 const positive=findRound(round=>round.win>0),zero=findRound(round=>round.win===0);
 const h=createHost({seed:positive.seed,bet:3000});
 assert.equal(h.e.drawMode,'single');assert.equal(h.e.reachMode,'single');
 assert.equal(h.window.SixDropV247.describeV278().rulesRevision,REVISION);
 assert.deepEqual(h.window.SixDropV247.describeV278().batchSizes,Array(8).fill(1));
 h.window.SixDropV247.restoreLocalCarryV278(prior);h.start();
 assert.deepEqual(h.e.state,positive.initial);
 const boundaries=[];
 for(let ball=0;ball<8;ball++){
  const before=clone(h.e.state),context=h.reach(),eventCount=h.events.length;
  assert(context,'each single ball has a prediction context');assert.deepEqual(context.pending,[]);
  const preview=h.e.predict(NUMBERS[ball],context.pending);
  assert.equal(preview.total,R.asHundredths(positive.plans[ball].totalWin,3000));
  assert.deepEqual(h.e.state,before,'prediction does not advance state or RNG');
  await h.number(NUMBERS[ball]);
  assert.equal(h.e.processed,ball+1);assert.equal(h.e.accepted,ball+1);
  assert.deepEqual(h.e.state,positive.plans[ball].state);
  assert.equal(Recorder.stable(h.app,ball+1),true);assert.deepEqual([...h.e.pendingDraws],[]);
  const info=h.window.SixDropV247.describeV278();
  assert.equal(info.receivedBalls,ball+1);assert.equal(info.processedBalls,ball+1);
  const events=h.events.slice(eventCount),hit=events.find(event=>event.phase==='pyramidHit');
  if(hit){
   const expected=new Map();
   for(const cell of hit.cells)for(const p of [cell,...G.neighbors(...cell)])if(p&&before.grid[p[0]]?.[p[1]])expected.set(p.join(','),p);
   assert.deepEqual(cellsKey(hit.affectedCells),[...expected.keys()].sort());
   const removed=events.find(event=>event.phase==='pyramidBreak');
   assert.deepEqual(cellsKey(removed.removed.map(tile=>[tile.r,tile.c])),cellsKey(hit.affectedCells));
  }
  if(ball<7)assert.deepEqual(h.window.SixDropV247.carry,R.cleanCarry(prior),'unfinished accrual is not committed');
  boundaries.push({ball:ball+1,removed:h.e.state.removedTotal,bankUnits:h.e.state.bankUnits,win:R.totalMedals(h.e.state)});
 }
 assert.equal(h.app.totalWin,positive.win);
 assert.equal(h.events.filter(event=>event.phase==='complete').length,1);
 assert.deepEqual(h.events.filter(event=>event.phase==='settled').map(event=>event.numbers.length),Array(8).fill(1));
 assert.equal(h.app.acceptNumber(1,h.app.token),false,'ninth input cannot pay again');
 let committed=clone(h.window.SixDropV247.carry);
 assert.deepEqual(carryValue(committed),carryValue(R.carryOut(positive.state)));
 assert.deepEqual(JSON.parse(h.storage.getItem(carryKey)),committed);

 // A changed BET cannot reprice the old bank, and aborting a round cannot
 // overwrite a previously settled continuation.
 h.app.prepare();h.app.setBet(0,333);h.setSeed(positive.seed);h.start();
 assert.deepEqual(h.e.state.carryAtStart,committed);assert.equal(h.e.state.bankUnits,committed.bankUnits);
 const next=fullRound(positive.seed,{bet:333,carry:committed});await h.round();
 assert.deepEqual(h.e.state,next.state);assert.equal(h.app.totalWin,next.win);
 committed=clone(h.window.SixDropV247.carry);
 const reload=createHost({seed:positive.seed,bet:3000,storage:h.storage});
 assert.deepEqual(reload.window.SixDropV247.carry,committed);
 reload.start();for(const number of NUMBERS.slice(0,3))await reload.number(number);reload.app.prepare();
 assert.deepEqual(reload.window.SixDropV247.carry,committed);
 const zeroAfter=findRound(round=>round.win===0,{carry:committed});
 reload.setSeed(zeroAfter.seed);reload.start();await reload.round();
 assert.equal(reload.app.totalWin,0);assert.deepEqual(carryValue(reload.window.SixDropV247.carry),carryValue(null));
 assert.equal(reload.window.SixDropV247.describeV278().continuationActive,false);
 const passive=createHost({seed:zero.seed,bet:0,otherBet:100});
 passive.window.SixDropV247.restoreLocalCarryV278(prior);passive.start();await passive.round();
 assert.equal(passive.e.state,null);assert.deepEqual(passive.window.SixDropV247.carry,R.cleanCarry(prior));

 // A sparse test board exercises the real all-clear path even if a calibrated
 // production distribution makes a natural all-clear rare in a small sample.
 const clear=createHost({seed:positive.seed,bet:3000});clear.window.SixDropV247.restoreLocalCarryV278(prior);clear.start();
 clear.e.state.grid=G.empty(10);
 clear.e.state.grid[9][0]={id:++clear.e.state.uid,color:clear.e.state.palette[0],number:NUMBERS[0]};
 clear.e.afterCheckpointRestoreV247();
 const clearOracle=R.hit(clone(clear.e.state),NUMBERS[0],{trace:true});
 assert.equal(clearOracle.allClear,true);await clear.number(NUMBERS[0]);
 assert.deepEqual(clear.e.state,clearOracle.state);
 const clearEvent=clear.events.find(event=>event.phase==='pyramidAllClear');
 assert(clearEvent);assert.equal(clearEvent.winMedals,clearOracle.state.lastAllClearWin);
 assert.equal(clear.window.SixDropV247.describeV278().allClearWin,clearOracle.state.bonusMedals);

 const checkpointCases=[];
 for(let ball=1;ball<8;ball++){
  const a=createHost({seed:positive.seed,bet:3000,search:'?edition=streaming'});a.control(prior);a.start();
  for(const number of NUMBERS.slice(0,ball))await a.number(number);
  const saved=clone(Recorder.capture(a.app,{ballIndex:ball}));
  const b=createHost({seed:77,bet:3000,search:'?edition=streaming'});b.control(prior);b.start();b.app.credit=246810;
  Recorder.restore(b.app,saved,{wallet:false,random:false});await idle(b.e);
  assert.equal(b.app.credit,246810);assert.equal(b.e.processed,ball);assert.equal(b.e.drawMode,'single');
  assert.deepEqual(b.e.state,a.e.state);
  for(const number of NUMBERS.slice(ball))await b.number(number);
  assert.deepEqual(b.e.state,positive.state);assert.equal(b.app.totalWin,positive.win);
  assert.deepEqual(b.window.SixDropV247.carry,R.cleanCarry(prior));checkpointCases.push(ball);
 }
 const queueCases=[];
 for(const completed of [0,3]){
  const a=createHost({seed:positive.seed,bet:3000,search:'?edition=streaming'});a.control(prior);a.start();
  for(const number of NUMBERS.slice(0,completed))await a.number(number);
  const saved=clone(Recorder.capture(a.app));saved.draws=NUMBERS.slice(0,completed+2);
  Object.assign(saved.engines[0],{queue:NUMBERS.slice(completed,completed+2).map(number=>[number]),accepted:completed+2,busy:true});
  const b=createHost({seed:88,bet:3000,search:'?edition=streaming'});b.control(prior);b.start();
  Recorder.restore(b.app,saved,{random:false});await idle(b.e);assert.equal(b.e.processed,completed+2);
  for(const number of NUMBERS.slice(completed+2))await b.number(number);
  assert.deepEqual(b.e.state,positive.state);queueCases.push(completed);
 }
 const mid=createHost({seed:positive.seed,bet:3000,search:'?edition=streaming'});mid.control(prior);mid.start();
 const animated=clone(Recorder.capture(mid.app));animated.draws=[NUMBERS[0]];
 Object.assign(animated.engines[0],{state:clone(positive.plans[0].state),processed:0,accepted:1,busy:true,fx:clone(positive.plans[0].timeline[0]),queue:[]});
 Recorder.restore(mid.app,animated,{random:false});await idle(mid.e);assert.equal(mid.e.processed,1);
 for(const number of NUMBERS.slice(1))await mid.number(number);assert.deepEqual(mid.e.state,positive.state);
 const invalid=createHost({seed:positive.seed,bet:3000,search:'?edition=streaming'});invalid.control(prior);invalid.start();
 delete invalid.e.state.rng;assert.throws(()=>invalid.e.afterCheckpointRestoreV247(),/RNG cannot be recovered/);

 // Shared checkpoints preserve each old physical rule through its last input.
 // Only the following new round adopts the current revision.
 const compatibility=[];
 for(const revision of [248,278,280,283,REVISION])for(const ball of R.isGrouped(revision)?[2,4]:[2]){
  const a=createHost({seed:10,bet:3000,search:'?edition=streaming'});a.control(prior);a.start();
  a.e.state=R.newGame({seed:10,bet:3000,carry:prior,rulesRevision:revision});a.e.afterCheckpointRestoreV247();
  for(const number of NUMBERS.slice(0,ball))await a.number(number);
  const saved=clone(streamingCheckpoint(a).checkpoint(a.app));
  const b=createHost({seed:77,bet:3000,search:'?edition=streaming'});b.control(prior);b.start();
  streamingCheckpoint(b).restore(b.app,saved);await idle(b.e);
  assert.equal(b.e.state.rulesRevision,revision);assert.equal(b.e.drawMode,R.isGrouped(revision)?'grouped':'single');
  assert.deepEqual(b.e.state,a.e.state);
  for(const number of NUMBERS.slice(ball))await b.number(number);
  const expected=fullRound(10,{bet:3000,carry:prior,rulesRevision:revision});
  assert.deepEqual(b.e.state,expected.state);assert.equal(b.app.totalWin,expected.win);
  b.app.prepare();b.start();assert.equal(b.e.state.rulesRevision,REVISION);assert.equal(b.e.drawMode,'single');
  compatibility.push({revision,ball,win:expected.win});
 }

 const workerCases=[];
 for(const [revision,ball]of [[REVISION,0],[REVISION,1],[REVISION,7],[248,2],[278,2],[280,4],[283,2]]){
  const a=createHost({seed:positive.seed,bet:3000,search:'?edition=streaming'});a.control(prior);a.start();
  a.e.state=R.newGame({seed:positive.seed,bet:3000,carry:prior,rulesRevision:revision});a.e.afterCheckpointRestoreV247();
  for(const number of NUMBERS.slice(0,ball))await a.number(number);
  const saved=clone(Recorder.capture(a.app));
  const b=createHost({seed:88,bet:3000,search:'?edition=streaming&serverSettlementWorker=1'}),worker=installWorker(b);
  const timer=setTimeout(()=>{throw Error('offline worker stalled at '+revision+'/'+ball);},7000);timer.unref();
  try{await worker.settleWork({roundId:'worker-'+revision+'-'+ball,playerId:'isolated',token:'isolated-work',rate:90,stableBall:ball,state:saved,balls:NUMBERS.map((number,index)=>({number,index:index+1}))});}finally{clearTimeout(timer);}
  const expected=fullRound(positive.seed,{bet:3000,carry:prior,rulesRevision:revision}),requests=worker.requests.filter(request=>request.url.endsWith('/offline-work/complete'));
  assert.deepEqual(b.e.state,expected.state);assert.equal(requests.length,1);assert.equal(requests[0].body.totalWin,expected.win);
  assert.deepEqual(carryValue(requests[0].body.games[0].carryV247),carryValue(R.carryOut(expected.state)));
  workerCases.push({revision,ball,win:expected.win});
 }

 const downloadCases=[];
 const old=createHost({seed:9,bet:3000,search:'?edition=streaming',rulesRevision:280});old.control(prior);old.start();await old.round();
 for(const previousState of [null,clone(Recorder.capture(old.app))]){
  const b=createHost({bet:3000,search:'?edition=streaming&downloadWorker=1'}),worker=installDownloadWorker(b);
  const startCarry=previousState?R.carryOut(previousState.engines[0].state,'old-download'):prior;
  const input={version:255,sessionId:'isolated-v284-download-'+downloadCases.length,playerId:'isolated',gameIds:['candy'],bets:[3000],creditBefore:1000000,totalBet:3000,rate:90,seed:2840,createdAt:1700000000000,previousState,sixDropCarry:startCarry,recording:{hits:NUMBERS.map((number,index)=>({number,index:index+1}))}};
  const output=await worker.compute(input),actualSeed=output.initialState.engines[0].seed247;
  const expected=fullRound(actualSeed,{bet:3000,carry:startCarry});
  assert.equal(output.playback.checkpoints.length,9);assert.deepEqual(output.numbers,NUMBERS);
  for(const [ball,saved]of output.playback.checkpoints.entries()){
   const engine=saved.engines[0];assert.equal(engine.state.rulesRevision,REVISION);assert.equal(engine.drawMode,'single');
   assert.equal(engine.processed,ball);assert.deepEqual(engine.state,ball?expected.plans[ball-1].state:expected.initial);
  }
  assert.deepEqual(output.finalState.engines[0].state,expected.state);assert.equal(output.totalWin,expected.win);
  assert.deepEqual(carryValue(output.games[0].carryV247),carryValue(R.carryOut(expected.state)));
  downloadCases.push({priorRevision:previousState?280:null,checkpoints:9,win:expected.win});
 }
 console.log('SIXDROP_V284_HOST_PASS',JSON.stringify({revision:REVISION,elapsedMs:Date.now()-started,positiveSeed:positive.seed,zeroSeed:zero.seed,legacyWitnesses:legacy,drawBoundaries:boundaries,checkpointCases,queueCases,compatibility,workerCases,downloadCases,allClear:{win:clearEvent.winMedals,removed:clearOracle.removed}}));
}
run().catch(error=>{console.error(error);process.exitCode=1;});

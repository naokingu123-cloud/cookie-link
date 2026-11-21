'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {R,G,clone,NUMBERS,createHost,idle,installWorker,streamingCheckpoint,fullRound}=require('./sixdrop-v283-history.cjs');
require('../assets/recorded-round-v255.js');
const Recorder=globalThis.SweetsRecordedRoundV255;
globalThis.SweetsLineup={ids:['candy']};
const prior={version:247,bankUnits:123456,removed:99,feed:450,roundId:'previous'};
const carryKey='sweets-local-debug-v258:sixdrop-carry-v278';
const numericCarry=c=>({bankUnits:c.bankUnits,removed:c.removed,feed:c.feed});
const groupedProcessed=[0,0,0,3,3,5,6,7,8];
const cellsKey=cells=>cells.map(([r,c])=>r+','+c).sort();
function installDownloadWorker(host){
 host.window.SweetsRecordedRoundV255=Recorder;
 const noop=()=>{},scope={window:host.window,location:{search:'?downloadWorker=1'},app:host.app,SweetsLineup:host.window.SweetsLineup,rouletteDrawSource:host.app.drawSource,
  stopAutoRound:noop,stopResultAuto:noop,scheduleAutoRound:noop,syncResultAuto:noop,debugPayoutTarget:90,debugForceRainbowSugar:false,
  recordBook:{data:{},load(value){this.data=value;}},CustomEvent:class{constructor(type,options={}){this.type=type;this.detail=options.detail;}},URLSearchParams,setTimeout,clearTimeout,console};
 new Function(...Object.keys(scope),fs.readFileSync('assets/download-worker-v255.js','utf8'))(...Object.values(scope));
 return host.window.SweetsDownloadWorkerV255;
}

async function run(){
 assert.equal(R.CURRENT_REVISION,283);
 const h=createHost({seed:10,bet:3000});
 assert.equal(h.e.drawMode,'single');assert.equal(h.e.reachMode,'single');
 assert.equal(h.window.SixDropV247.describeV278().rulesRevision,283);
 assert.deepEqual(h.window.SixDropV247.describeV278().batchSizes,Array(8).fill(1));
 h.window.SixDropV247.restoreLocalCarryV278(prior);h.start();
 const oracle=fullRound(10,{bet:3000,carry:prior}),boundaries=[];
 assert.deepEqual(h.e.state,oracle.initial);
 for(let i=0;i<8;i++){
  const before=clone(h.e.state),context=h.reach(),eventsBefore=h.events.length;
  assert(context,'every next single ball opens its own reach preview');assert.deepEqual(context.pending,[]);
  const preview=h.e.predict(NUMBERS[i],context.pending);
  assert.equal(preview.total,R.asHundredths(oracle.plans[i].totalWin,3000));
  assert.deepEqual(h.e.state,before,'preview cannot advance the board, RNG or awards');
  await h.number(NUMBERS[i]);
  assert.equal(h.e.processed,i+1,'native Arcade resolves physical ball '+(i+1));
  assert.equal(h.e.accepted,i+1);assert.deepEqual(h.e.state,oracle.plans[i].state);
  assert.equal(Recorder.stable(h.app,i+1),true);assert.deepEqual([...h.e.pendingDraws],[]);
  const info=h.window.SixDropV247.describeV278();
  assert.equal(info.receivedBalls,i+1);assert.equal(info.processedBalls,i+1);assert.equal(info.nextBatchEnd,Math.min(8,i+2));
  const events=h.events.slice(eventsBefore),hit=events.find(e=>e.phase==='pyramidHit');
  if(hit){
   const expected=new Map();
   for(const cell of hit.cells)for(const p of [cell,...G.neighbors(...cell)])if(p&&before.grid[p[0]]?.[p[1]])expected.set(p.join(','),p);
   assert.deepEqual(cellsKey(hit.affectedCells),[...expected.keys()].sort(),'the real host emits the occupied HIT-neighbor union');
   const broken=events.find(e=>e.phase==='pyramidBreak');
   assert.deepEqual(cellsKey(broken.removed.map(t=>[t.r,t.c])),cellsKey(hit.affectedCells),'native break rendering receives every affected tile');
  }
  if(i<7)assert.deepEqual(h.window.SixDropV247.carry,R.cleanCarry(prior),'partial accrual is not committed');
  boundaries.push({received:i+1,processed:h.e.processed,removed:h.e.state.removedTotal,bank:h.e.state.bankUnits});
 }
 assert.equal(h.app.totalWin,72934);assert.equal(h.e.state.allClears,1);
 assert.deepEqual(h.events.filter(e=>e.phase==='settled').map(e=>e.numbers.length),Array(8).fill(1));
 assert.equal(h.events.filter(e=>e.phase==='complete').length,1);
 assert.equal(h.app.acceptNumber(1,h.app.token),false,'no ninth ball or second settlement');
 let committed=clone(h.window.SixDropV247.carry);
 assert.deepEqual(numericCarry(committed),{bankUnits:4443456,removed:387,feed:825});
 assert.deepEqual(JSON.parse(h.storage.getItem(carryKey)),committed);

 // A changed BET prices only new removals. It cannot revalue the settled bank.
 h.app.prepare();h.app.setBet(0,333);h.setSeed(10);h.start();
 assert.deepEqual(h.e.state.carryAtStart,committed);assert.equal(h.e.state.bankUnits,committed.bankUnits);
 const next=fullRound(10,{bet:333,carry:committed});await h.round();assert.deepEqual(h.e.state,next.state);
 assert.equal(h.app.totalWin,52392);committed=clone(h.window.SixDropV247.carry);
 const reload=createHost({seed:10,bet:3000,storage:h.storage});assert.deepEqual(reload.window.SixDropV247.carry,committed);
 reload.start();for(const n of NUMBERS.slice(0,3))await reload.number(n);reload.app.prepare();
 assert.deepEqual(reload.window.SixDropV247.carry,committed,'aborted three-ball accrual stays uncommitted');
 reload.setSeed(6);reload.start();await reload.round();assert.equal(reload.app.totalWin,0);
 assert.deepEqual(numericCarry(reload.window.SixDropV247.carry),{bankUnits:0,removed:0,feed:0});
 assert.equal(reload.window.SixDropV247.describeV278().continuationActive,false);
 const passive=createHost({seed:6,bet:0,otherBet:100});passive.window.SixDropV247.restoreLocalCarryV278(committed);
 passive.start();await passive.round();assert.equal(passive.e.state,null);assert.deepEqual(passive.window.SixDropV247.carry,committed);

 // All seven resumable boundaries retain the exact physical board, numeric RNG
 // cursor and payouts; loading a board does not authorize a wallet change.
 const checkpointCases=[];
 for(let ball=1;ball<8;ball++){
  const a=createHost({seed:10,bet:3000,search:'?edition=streaming'});a.control(prior);a.start();
  for(const n of NUMBERS.slice(0,ball))await a.number(n);
  const saved=clone(Recorder.capture(a.app,{ballIndex:ball}));
  const b=createHost({seed:77,bet:3000,search:'?edition=streaming'});b.control(prior);b.start();b.app.credit=246810;
  Recorder.restore(b.app,saved,{wallet:false,random:false});await idle(b.e);
  assert.equal(b.app.credit,246810);assert.equal(b.e.processed,ball);assert.equal(b.e.drawMode,'single');
  assert.equal(b.e.state.rng,a.e.state.rng);assert.deepEqual(b.e.state,a.e.state);
  for(const n of NUMBERS.slice(ball))await b.number(n);
  assert.deepEqual(b.e.state,oracle.state);assert.equal(b.app.totalWin,oracle.win);
  assert.deepEqual(b.window.SixDropV247.carry,R.cleanCarry(prior));checkpointCases.push(ball);
 }
 // A queued single and a canonical result saved during its animation must not
 // be lost or resolved twice when the real recorder calls the restore hook.
 const queueCases=[];
 for(const completed of [0,3]){
  const a=createHost({seed:10,bet:3000,search:'?edition=streaming'});a.control(prior);a.start();
  for(const n of NUMBERS.slice(0,completed))await a.number(n);
  const saved=clone(Recorder.capture(a.app));saved.draws=NUMBERS.slice(0,completed+2);
  Object.assign(saved.engines[0],{queue:NUMBERS.slice(completed,completed+2).map(n=>[n]),accepted:completed+2,busy:true});
  const b=createHost({seed:88,bet:3000,search:'?edition=streaming'});b.control(prior);b.start();
  Recorder.restore(b.app,saved,{random:false});await idle(b.e);assert.equal(b.e.processed,completed+2);
  for(const n of NUMBERS.slice(completed+2))await b.number(n);assert.deepEqual(b.e.state,oracle.state);queueCases.push(completed);
 }
 const mid=createHost({seed:10,bet:3000,search:'?edition=streaming'});mid.control(prior);mid.start();
 const animated=clone(Recorder.capture(mid.app));animated.draws=[NUMBERS[0]];
 Object.assign(animated.engines[0],{state:clone(oracle.plans[0].state),processed:0,accepted:1,busy:true,fx:clone(oracle.plans[0].timeline[0]),queue:[]});
 Recorder.restore(mid.app,animated,{random:false});await idle(mid.e);assert.equal(mid.e.processed,1);
 for(const n of NUMBERS.slice(1))await mid.number(n);assert.deepEqual(mid.e.state,oracle.state);
 const invalid=createHost({seed:10,bet:3000,search:'?edition=streaming'});invalid.control(prior);invalid.start();
 delete invalid.e.state.rng;assert.throws(()=>invalid.e.afterCheckpointRestoreV247(),/RNG cannot be recovered/,'283 never guesses a lost RNG cursor');

 // Restore real shared checkpoints under the new default. Legacy draws keep
 // their original 248 single or 278/280 grouped policy until the next game.
 const compatibility=[];
 for(const revision of [248,278,280,283]){
  for(const ball of revision===248||revision===283?[2]:[2,4]){
   const a=createHost({seed:10,bet:3000,search:'?edition=streaming'});a.control(prior);a.start();
   a.e.state=R.newGame({seed:10,bet:3000,carry:prior,rulesRevision:revision});a.e.afterCheckpointRestoreV247();
   for(const n of NUMBERS.slice(0,ball))await a.number(n);
   const saved=clone(streamingCheckpoint(a).checkpoint(a.app));
   const b=createHost({seed:77,bet:3000,search:'?edition=streaming'});b.control(prior);b.start();
   streamingCheckpoint(b).restore(b.app,saved);await idle(b.e);
   const grouped=revision===278||revision===280;
   assert.equal(b.e.state.rulesRevision,revision);assert.equal(b.e.drawMode,grouped?'grouped':'single');
   assert.equal(b.e.processed,grouped?groupedProcessed[ball]:ball);
   assert.deepEqual(b.e.state,a.e.state,'restore itself does not migrate a physical board');
   for(const n of NUMBERS.slice(ball))await b.number(n);
   const expected=fullRound(10,{bet:3000,carry:prior,rulesRevision:revision});
   assert.deepEqual(b.e.state,expected.state);assert.equal(b.app.totalWin,expected.win);
   b.app.prepare();b.start();assert.equal(b.e.state.rulesRevision,283);assert.equal(b.e.drawMode,'single');
   compatibility.push({revision,ball,win:expected.win});
  }
 }
 // Execute the real disconnected settlement worker for every rule policy.
 // It must restore old pending groups and finish all eight new single balls.
 const workerCases=[];
 for(const [revision,ball] of [[283,0],[283,1],[283,7],[248,2],[278,2],[280,4]]){
  const a=createHost({seed:10,bet:3000,search:'?edition=streaming'});a.control(prior);a.start();
  a.e.state=R.newGame({seed:10,bet:3000,carry:prior,rulesRevision:revision});a.e.afterCheckpointRestoreV247();
  for(const n of NUMBERS.slice(0,ball))await a.number(n);
  const saved=clone(Recorder.capture(a.app)),b=createHost({seed:88,bet:3000,search:'?edition=streaming&serverSettlementWorker=1'}),worker=installWorker(b);
  const timer=setTimeout(()=>{throw Error('offline worker stalled at '+revision+'/'+ball);},7000);timer.unref();
  try{await worker.settleWork({roundId:'worker-'+revision+'-'+ball,playerId:'isolated',token:'isolated-work',rate:90,stableBall:ball,state:saved,balls:NUMBERS.map((number,index)=>({number,index:index+1}))});}finally{clearTimeout(timer);}
  const expected=fullRound(10,{bet:3000,carry:prior,rulesRevision:revision}),requests=worker.requests.filter(x=>x.url.endsWith('/offline-work/complete'));
  assert.deepEqual(b.e.state,expected.state);assert.equal(requests.length,1);assert.equal(requests[0].body.totalWin,expected.win);
  assert.deepEqual(numericCarry(requests[0].body.games[0].carryV247),numericCarry(R.carryOut(expected.state)));
  workerCases.push({revision,ball,win:expected.win});
 }
 // The production download worker also waits and records after each native
 // input. Its next round must use 283 even if its prior package completed 280.
 const downloadCases=[];
 const oldHost=createHost({seed:9,bet:3000,search:'?edition=streaming',rulesRevision:280});oldHost.control(prior);oldHost.start();await oldHost.round();
 for(const previousState of [null,clone(Recorder.capture(oldHost.app))]){
  const b=createHost({bet:3000,search:'?edition=streaming&downloadWorker=1'}),worker=installDownloadWorker(b);
  const startCarry=previousState?R.carryOut(previousState.engines[0].state,'old-download'):prior;
  const input={version:255,sessionId:'isolated-download-'+downloadCases.length,playerId:'isolated',gameIds:['candy'],bets:[3000],creditBefore:1000000,totalBet:3000,rate:90,seed:2830,createdAt:1700000000000,previousState,sixDropCarry:startCarry,recording:{hits:NUMBERS.map((number,index)=>({number,index:index+1}))}};
  const output=await worker.compute(input),actualSeed=output.initialState.engines[0].seed247;
  const expected=fullRound(actualSeed,{bet:3000,carry:startCarry});
  assert.equal(output.playback.checkpoints.length,9);assert.deepEqual(output.numbers,NUMBERS);
  for(const [ball,saved] of output.playback.checkpoints.entries()){
   const engine=saved.engines[0];assert.equal(engine.state.rulesRevision,283);assert.equal(engine.drawMode,'single');
   assert.equal(engine.processed,ball);assert.equal(engine.state.draws.length,ball);
   assert.deepEqual(engine.state,ball?expected.plans[ball-1].state:expected.initial);
  }
  assert.deepEqual(output.finalState.engines[0].state,expected.state);assert.equal(output.totalWin,expected.win);
  assert.deepEqual(numericCarry(output.games[0].carryV247),numericCarry(R.carryOut(expected.state)));
  downloadCases.push({previousRevision:previousState?.engines[0].state.rulesRevision??null,revision:283,checkpoints:9,win:output.totalWin});
 }
 assert.equal(h.events.filter(e=>e.phase==='error').length,0);
 console.log('SIXDROP_V283_HOST_PASS',JSON.stringify({boundaries,payout:oracle.win,allClears:oracle.state.allClears,changedBetWin:next.win,checkpointCases,queueCases,animatedCheckpoint:true,compatibility,workerCases,downloadCases,scope:'Native Arcade single input + occupied-neighbor break events + carry + recorder + shared resume + offline settlement + actual download worker'}));
}
run().catch(error=>{console.error(error);process.exitCode=1;});

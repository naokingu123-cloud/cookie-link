'use strict';
const assert=require('node:assert/strict');
const {R,clone,NUMBERS,createHost,idle,installWorker,streamingCheckpoint,fullRound}=require('./sixdrop-v278-fixture.cjs');
require('../assets/recorded-round-v255.js');
const Recorder=globalThis.SweetsRecordedRoundV255;
globalThis.SweetsLineup={ids:['candy']};
const prior={version:247,bankUnits:123456,removed:99,feed:450,roundId:'previous'};
const key='sweets-local-debug-v258:sixdrop-carry-v278';
const expectedProcessed=[0,0,0,3,3,5,6,7,8];
const numericCarry=value=>({bankUnits:value.bankUnits,removed:value.removed,feed:value.feed});
async function run(){
 const h=createHost({seed:9,bet:3000});
 assert.equal(h.window.SixDropV247.restoreLocalCarryV278(prior),true);
 h.start();const original=clone(h.e.state),boundaries=[];
 for(let i=0;i<8;i++){
  const before=clone(h.e.state),eventsBefore=h.events.length;
  await h.number(NUMBERS[i]);
  assert.equal(h.e.processed,expectedProcessed[i+1],'native Arcade group boundary at physical ball '+(i+1));
  const info=h.window.SixDropV247.describeV278();assert.equal(info.receivedBalls,i+1);assert.equal(info.processedBalls,h.e.processed);
  assert.equal(Recorder.stable(h.app,i+1),true,'recording may save a pending 1st/2nd/4th ball');
  if([1,2,4].includes(i+1)){
   assert.deepEqual(h.e.state,before,'a previewed number cannot change grid, RNG, awards or bank');
   assert.equal(h.events.slice(eventsBefore).filter(e=>e.phase==='pyramidHit'||e.phase==='pyramidMiss').length,0);
  }
  if([2,4].includes(i+1)){
   const context=h.reach();assert(context,'reach opens immediately before a group boundary');
   const prediction=h.e.predict(NUMBERS[i+1],context.pending),actual=R.hitBatch(h.e.state,[...context.pending,NUMBERS[i+1]],{preview:true});
   assert.equal(prediction.total,R.asHundredths(actual.totalWin,3000));assert.equal(prediction.allClear,actual.allClear);
  }
  if(i<7)assert.deepEqual(h.window.SixDropV247.carry,R.cleanCarry(prior),'pending/positive/all-clear partial rounds leave committed carry untouched');
  boundaries.push({received:i+1,processed:h.e.processed,bank:h.e.state.bankUnits,allClears:h.e.state.allClears});
 }
 const oracle=fullRound(9,{bet:3000,carry:prior});
 assert.deepEqual(h.e.state,oracle.state,'native host uses the exact grouped rule result');
 assert.equal(h.app.totalWin,56618,'the actual native Arcade settles the real Six Drop medal total');
 assert.deepEqual(h.events.filter(e=>e.phase==='settled').map(e=>e.numbers.length),[3,2,1,1,1]);
 assert.equal(h.events.filter(e=>e.phase==='complete').length,1);
 let committed=clone(h.window.SixDropV247.carry);
 assert.deepEqual(numericCarry(committed),{bankUnits:2148456,removed:234,feed:671});
 assert.deepEqual(JSON.parse(h.storage.getItem(key)),committed,'completion persists the same carry under the private local namespace');
 assert(h.window.SixDropV247.describeV278().continuationActive);

 // Repeated successful games, changing BET, and page reload must all inherit
 // the settled medal balance. They must not recapitalize it using the new BET.
 const repeated=[];
 for(let round=0;round<3;round++){
  h.app.prepare();h.app.setBet(0,round===1?301:3000);h.setSeed(9);h.start();
  assert.deepEqual(h.e.state.carryAtStart,committed);assert.equal(h.e.state.bankUnits,committed.bankUnits);
  assert.deepEqual(h.e.state.palette,R.palette(committed.removed));assert.equal(h.e.state.normalHundredths,0);
  const expected=fullRound(9,{bet:h.app.bets[0],carry:committed});await h.round();assert.deepEqual(h.e.state,expected.state);assert(expected.win>0);
  committed=clone(h.window.SixDropV247.carry);assert.equal(committed.bankUnits,expected.state.bankUnits);repeated.push(numericCarry(committed));
 }
 const reload=createHost({seed:1,bet:3000,storage:h.storage});
 assert.deepEqual(reload.window.SixDropV247.carry,committed,'actual local-debug bootstrap restores after page reload');
 reload.start();assert.deepEqual(reload.e.state.carryAtStart,committed);
 for(const n of NUMBERS.slice(0,5))await reload.number(n);
 reload.app.prepare();assert.deepEqual(reload.window.SixDropV247.carry,committed,'aborting an unfinished round neither commits its accrual nor resets its history');
 assert.deepEqual(JSON.parse(reload.storage.getItem(key)),committed);
 reload.setSeed(2);reload.start();await reload.round();assert.equal(reload.app.totalWin,0);
 for(const name of ['bankUnits','removed','feed'])assert.equal(reload.window.SixDropV247.carry[name],0,'own zero WIN resets '+name);
 assert.equal(reload.window.SixDropV247.describeV278().continuationActive,false);
 const zeroSaved=JSON.parse(reload.storage.getItem(key));assert.equal(zeroSaved.bankUnits,0);assert.equal(zeroSaved.removed,0);

 // Native Arcade excludes an unbet game from start, number delivery and
 // settlement. Its saved progressive survives a complete eight-ball round.
 const passive=createHost({seed:2,bet:0,otherBet:100});passive.window.SixDropV247.restoreLocalCarryV278(committed);
 passive.start();await passive.round();assert.equal(passive.e.state,null);assert.equal(passive.app.draws.length,8);
 assert.deepEqual(passive.window.SixDropV247.carry,committed);passive.app.prepare();assert.deepEqual(passive.window.SixDropV247.carry,committed);

 // Exercise the real recorder restore and adapter hook at EVERY boundary,
 // including pending balls 1/2/4. Exact final state and payout must reproduce.
 const checkpointCases=[];
 for(const ball of [1,2,3,4,5,6,7]){
  const a=createHost({seed:9,bet:3000,search:'?edition=streaming'});a.control(prior);a.start();
  for(const n of NUMBERS.slice(0,ball))await a.number(n);
  const checkpoint=clone(Recorder.capture(a.app,{ballIndex:ball}));
  const b=createHost({seed:77,bet:3000,search:'?edition=streaming'});b.control(prior);b.start();b.app.credit=246810;
  Recorder.restore(b.app,checkpoint,{wallet:false,random:false});await idle(b.e);
  assert.equal(b.app.credit,246810,'restoring a board never authorizes a wallet change');assert.equal(b.e.processed,expectedProcessed[ball]);
  assert.deepEqual([...b.e.pendingDraws],NUMBERS.slice(expectedProcessed[ball],ball));assert.equal(Recorder.stable(b.app,ball),true);
  for(const n of NUMBERS.slice(ball))await b.number(n);
  assert.deepEqual(b.e.state,oracle.state,'resume from physical ball '+ball);assert.equal(b.app.totalWin,oracle.win);
  assert.deepEqual(b.window.SixDropV247.carry,R.cleanCarry(prior),'streaming page cannot self-commit a settlement');
  checkpointCases.push(ball);
 }
 // Queues captured before animation begins contain complete 3/2 groups, not
 // individual entries. The restore hook must not discard or duplicate them.
 for(const completed of [0,3]){
  const a=createHost({seed:9,bet:3000,search:'?edition=streaming'});a.control(prior);a.start();
  for(const n of NUMBERS.slice(0,completed))await a.number(n);
  const size=completed===0?3:2,checkpoint=clone(Recorder.capture(a.app));
  checkpoint.draws=NUMBERS.slice(0,completed+size);
  Object.assign(checkpoint.engines[0],{queue:[NUMBERS.slice(completed,completed+size)],accepted:completed+size,busy:true,phase:'queued'});
  const b=createHost({seed:111,bet:3000,search:'?edition=streaming'});b.control(prior);b.start();Recorder.restore(b.app,checkpoint,{random:false});await idle(b.e);
  assert.equal(b.e.processed,completed+size,'queued '+size+'-ball group survives restore');
  for(const n of NUMBERS.slice(completed+size))await b.number(n);assert.deepEqual(b.e.state,oracle.state);
  assert.deepEqual(b.events.filter(e=>e.phase==='settled').map(e=>e.numbers.length),completed?[2,1,1,1]:[3,2,1,1,1]);
 }
 // Old serialized single-HIT games keep their unfinished board and payout
 // revision until all eight balls settle, then the next game adopts current rules.
 const legacy=createHost({bet:3000,search:'?edition=streaming'});legacy.control(prior);legacy.start();
 let old=R.newGame({seed:9,bet:3000,carry:prior});for(const n of NUMBERS.slice(0,2))old=R.hit(old,n).state;
 legacy.e.state=clone(old);legacy.app.draws=NUMBERS.slice(0,2);legacy.e.queue=[];legacy.e.afterCheckpointRestoreV247();assert.equal(legacy.e.drawMode,'single');
 for(const n of NUMBERS.slice(2)){old=R.hit(old,n).state;await legacy.number(n);}
 assert.deepEqual(legacy.e.state,old);assert.equal(legacy.e.state.rulesRevision,248);legacy.app.prepare();legacy.start();assert.equal(legacy.e.state.rulesRevision,R.CURRENT_REVISION);

 // A saved grouped v278 game also keeps its original table and unresolved
 // 1st/2nd/4th-ball queue when restored by the newer payout revision.
 for(const ball of [2,4]){
  const a=createHost({seed:1,bet:101,search:'?edition=streaming'});a.control(prior);a.start();
  a.e.state=R.newGame({seed:1,bet:101,carry:prior,rulesRevision:278});a.e.afterCheckpointRestoreV247();
  assert.equal(a.e.drawMode,'grouped');
  for(const n of NUMBERS.slice(0,ball))await a.number(n);
  const checkpoint=clone(Recorder.capture(a.app,{ballIndex:ball}));
  const b=createHost({seed:77,bet:101,search:'?edition=streaming'});b.control(prior);b.start();Recorder.restore(b.app,checkpoint,{wallet:false,random:false});await idle(b.e);
  assert.equal(b.e.drawMode,'grouped');assert.equal(b.e.state.rulesRevision,278);
  assert.deepEqual([...b.e.pendingDraws],NUMBERS.slice(expectedProcessed[ball],ball));
  for(const n of NUMBERS.slice(ball))await b.number(n);
  const oldOracle=fullRound(1,{bet:101,carry:prior,rulesRevision:278});
  assert.deepEqual(b.e.state,oldOracle.state);assert.equal(b.app.totalWin,oldOracle.win);
  assert.notEqual(oldOracle.win,fullRound(1,{bet:101,carry:prior}).win,'this witness distinguishes the saved and current payout tables');
 }

 // A previously downloaded v248 package omitted numeric state.rng. Migration
 // may reconstruct that cursor only when the saved seed/history reproduce
 // the exact physical board and every prior award. It must never guess.
 let oldMid=R.newGame({seed:9,bet:333,carry:prior});for(const n of NUMBERS.slice(0,4))oldMid=R.hit(oldMid,n).state;
 const missingRng=clone(oldMid);delete missingRng.rng;
 const migration=createHost({seed:9,bet:333,search:'?edition=streaming'});migration.control(prior);migration.start();
 migration.e.state=clone(missingRng);migration.e.seed247=9;migration.app.draws=NUMBERS.slice(0,4);migration.e.queue=[];migration.e.afterCheckpointRestoreV247();
 assert.deepEqual(migration.e.state,oldMid,'legacy migration reconstructs only the missing RNG field');
 let oldFinal=oldMid;for(const n of NUMBERS.slice(4)){oldFinal=R.hit(oldFinal,n).state;await migration.number(n);}
 assert.deepEqual(migration.e.state,oldFinal);assert.equal(migration.app.totalWin,R.totalMedals(oldFinal));
 for(const corrupt of ['seed','board','award','modern']){
  const bad=createHost({seed:9,bet:333,search:'?edition=streaming'});bad.control(prior);bad.start();bad.e.state=clone(missingRng);bad.e.seed247=9;bad.app.draws=NUMBERS.slice(0,4);bad.e.queue=[];
  if(corrupt==='seed')delete bad.e.seed247;
  if(corrupt==='board')bad.e.state.grid.flat().find(Boolean).color=8;
  if(corrupt==='award')bad.e.state.bonusMedals++;
  if(corrupt==='modern')bad.e.state.rulesRevision=278;
  assert.throws(()=>bad.e.afterCheckpointRestoreV247(),/RNG cannot be recovered/,corrupt+' does not permit an invented RNG continuation');
 }

 const streamingCases=[];
 for(const scenario of [{ball:1},{ball:2},{ball:4},{ball:0,queued:3},{ball:3,queued:2},{ball:2,legacy:true}]){
  const a=createHost({seed:9,bet:3000,search:'?edition=streaming'});a.control(prior);a.start();
  if(scenario.legacy){a.e.state=R.newGame({seed:9,bet:3000,carry:prior});a.e.afterCheckpointRestoreV247();}
  for(const n of NUMBERS.slice(0,scenario.ball))await a.number(n);
  const shared=streamingCheckpoint(a),checkpoint=clone(shared.checkpoint(a.app));
  if(scenario.queued){checkpoint.draws=NUMBERS.slice(0,scenario.ball+scenario.queued);Object.assign(checkpoint.engines[0],{queue:[NUMBERS.slice(scenario.ball,scenario.ball+scenario.queued)],accepted:scenario.ball+scenario.queued,busy:true});}
  const b=createHost({seed:77,bet:3000,search:'?edition=streaming'});b.control(prior);b.start();
  let hookCalls=0,drawsAtHook;const hook=b.e.afterCheckpointRestoreV247;
  b.e.afterCheckpointRestoreV247=function(...args){hookCalls++;drawsAtHook=clone(b.app.draws);return Reflect.apply(hook,this,args);};
  assert.equal(streamingCheckpoint(b).restore(b.app,checkpoint),true);await idle(b.e);
  assert.equal(hookCalls,1,'explicit shared resume invokes the engine hook once');assert.deepEqual(drawsAtHook,checkpoint.draws,'app draw history is revived before the engine reconstructs pending numbers');
  assert.equal(b.e.drawMode,scenario.legacy?'single':'grouped');
  const resumedBall=scenario.ball+(scenario.queued||0);assert.equal(b.e.processed,scenario.legacy?resumedBall:expectedProcessed[resumedBall]);
  if(!scenario.legacy)assert.deepEqual([...b.e.pendingDraws],NUMBERS.slice(expectedProcessed[resumedBall],resumedBall));
  for(const n of NUMBERS.slice(resumedBall))await b.number(n);
  if(scenario.legacy){let expected=R.newGame({seed:9,bet:3000,carry:prior});for(const n of NUMBERS)expected=R.hit(expected,n).state;assert.deepEqual(b.e.state,expected);}
  else assert.deepEqual(b.e.state,oracle.state);
  streamingCases.push(scenario);
 }

 // Execute the real offline worker prepare/restore/replay/settle function.
 // It must pass early pending balls without waiting for a nonexistent HIT.
 const workerCases=[];
 for(const ball of [0,2,4]){
  const a=createHost({seed:9,bet:3000,search:'?edition=streaming'});a.control(prior);a.start();
  for(const n of NUMBERS.slice(0,ball))await a.number(n);
  const state=clone(Recorder.capture(a.app)),b=createHost({seed:20,bet:3000,search:'?edition=streaming&serverSettlementWorker=1'}),worker=installWorker(b);
  const timer=setTimeout(()=>{throw Error('offline worker stalled at grouped boundary '+ball);},7000);timer.unref();
  try{await worker.settleWork({roundId:'worker-'+ball,playerId:'isolated',token:'work-token-'+ball,rate:90,stableBall:ball,state,balls:NUMBERS.map((number,index)=>({number,index:index+1}))});}finally{clearTimeout(timer);}
  assert.deepEqual(b.e.state,oracle.state);const request=worker.requests.find(x=>x.url.endsWith('/offline-work/complete'));assert(request);
  assert.equal(request.body.totalWin,56618);assert.deepEqual(numericCarry(request.body.games[0].carryV247),numericCarry(R.carryOut(oracle.state)));
  workerCases.push(ball);
 }
 assert.equal(h.events.filter(e=>e.phase==='error').length,0);
 console.log('SIXDROP_V278_HOST_PASS',JSON.stringify({boundaries,repeated,checkpointCases,queuedGroups:[3,2],legacyMissingRng:'verified replay + 4 rejection cases',streamingCases,offlineWorkerCases:workerCases,payout:56618,scope:'Native Arcade + live Six adapter + recorder + local persistence + shared resume + offline settlement worker'}));
}
run().catch(error=>{console.error(error);process.exitCode=1;});

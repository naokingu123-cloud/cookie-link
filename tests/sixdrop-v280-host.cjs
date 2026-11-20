'use strict';
const assert=require('node:assert/strict');
const legacy=require('./fixtures/sixdrop-legacy-v280.json');
const {R,clone,NUMBERS,createHost,idle,installWorker,streamingCheckpoint,fullRound}=require('./sixdrop-v278-fixture.cjs');
require('../assets/recorded-round-v255.js');
const Recorder=globalThis.SweetsRecordedRoundV255;
globalThis.SweetsLineup={ids:['candy']};
const host=options=>createHost({rulesRevision:280,...options});
const prior=legacy.prior,key='sweets-local-debug-v258:sixdrop-carry-v278';
async function run(){
 const h=host({seed:9,bet:3000,hidden:false,reducedMotion:false});h.window.SixDropV247.restoreLocalCarryV278(prior);
 const samples=[];
 h.e.waitVisual=async(ms)=>{
  for(let step=0;step<4;step++){h.slot.candyTime+=ms/4;const info=h.window.SixDropV247.describeV278();samples.push({...info,phase:h.e.phase});}
  return true;
 };
 h.start();assert.equal(h.e.state.rulesRevision,280);
 assert.equal(h.window.SixDropV247.describeV278().displayRemoved,prior.removed);
 await h.round();
 const expected=fullRound(9,{bet:3000,carry:prior,rulesRevision:280});assert.deepEqual(h.e.state,expected.state);assert.equal(h.app.totalWin,expected.win);
 let last=prior.removed;
 for(const sample of samples){
  assert(Number.isSafeInteger(sample.displayRemoved));assert(sample.displayRemoved>=last,'displayed removal count never goes backwards during a winning round');
  assert(sample.displayRemoved<=sample.removedTotal);last=sample.displayRemoved;
 }
 // The final meter tween can outlive the last native HIT phase. Its existing
 // visual clock continues after settlement, and must reach the exact count.
 h.slot.candyTime+=1000;
 const earned=h.window.SixDropV247.describeV278();assert.equal(earned.removedTotal,234);assert.equal(earned.displayRemoved,234);assert.equal(earned.allClearCount,2);
 assert(samples.some(s=>s.displayRemoved>99&&s.displayRemoved<234),'the existing bank clock exposes intermediate integer removal counts');
 assert.equal(h.window.SixDropV247.carry.removed,234);assert.equal(JSON.parse(h.storage.getItem(key)).removed,234);
 h.app.prepare();h.app.setBet(0,301);h.setSeed(9);h.start();assert.equal(h.window.SixDropV247.describeV278().displayRemoved,234);
 assert.deepEqual(h.e.state.palette,R.palette(234));await h.round();const carried=clone(h.window.SixDropV247.carry);
 h.app.prepare();h.setSeed(2);h.start();await h.round();assert.equal(h.app.totalWin,0);
 assert.equal(h.window.SixDropV247.describeV278().removedTotal,0);assert.equal(h.window.SixDropV247.describeV278().displayRemoved,0);
 assert.equal(h.window.SixDropV247.carry.removed,0);assert.equal(JSON.parse(h.storage.getItem(key)).removed,0);
 const passive=host({seed:2,bet:0,otherBet:100});passive.window.SixDropV247.restoreLocalCarryV278(carried);passive.start();await passive.round();
 assert.equal(passive.window.SixDropV247.describeV278().displayRemoved,carried.removed,'an unbet game retains the same continuous count');

 // Exact published 278 checkpoints must retain their revision, grouping,
 // RNG and money when restored by the new 280 host, including pending balls.
 for(const checkpoint of legacy.recorded278.checkpoints){
  const resumed=host({seed:77,bet:3000,search:'?edition=streaming'});resumed.control(prior);resumed.start();resumed.app.credit=246810;
  Recorder.restore(resumed.app,clone(checkpoint),{wallet:false,random:false});await idle(resumed.e);
  assert.equal(resumed.app.credit,246810);assert.equal(resumed.e.state.rulesRevision,278);assert.equal(resumed.e.drawMode,'grouped');
  for(const n of NUMBERS.slice(checkpoint.ballIndex))await resumed.number(n);
  assert.deepEqual(resumed.e.state,legacy.recorded278.finalState);assert.equal(R.totalMedals(resumed.e.state),legacy.recorded278.win);
 }

 const oracle=fullRound(3,{bet:3000,carry:prior,rulesRevision:280});assert.equal(oracle.win,4500,'actual new native payout differs from the old 4200');
 const checkpoints=[],workerCases=[];
 for(const ball of [0,2,4,5,7]){
  const a=host({seed:3,bet:3000,search:'?edition=streaming'});a.control(prior);a.start();for(const n of NUMBERS.slice(0,ball))await a.number(n);
  const state=clone(Recorder.capture(a.app,{ballIndex:ball})),b=host({seed:20,bet:3000,search:'?edition=streaming'});b.control(prior);b.start();
  Recorder.restore(b.app,state,{wallet:false,random:false});await idle(b.e);for(const n of NUMBERS.slice(ball))await b.number(n);
  assert.deepEqual(b.e.state,oracle.state);assert.equal(b.app.totalWin,4500);checkpoints.push(ball);
  if(ball<=4){
   const c=host({seed:20,bet:3000,search:'?edition=streaming&serverSettlementWorker=1'}),worker=installWorker(c);
   const timer=setTimeout(()=>{throw Error('v280 native worker stalled at '+ball);},7000);timer.unref();
   try{await worker.settleWork({roundId:'worker-v280-'+ball,playerId:'isolated',token:'isolated-'+ball,rate:90,stableBall:ball,state,balls:NUMBERS.map((number,index)=>({number,index:index+1}))});}finally{clearTimeout(timer);}
   const request=worker.requests.find(x=>x.url.endsWith('/offline-work/complete'));assert(request);assert.equal(request.body.totalWin,4500);
   assert.deepEqual(c.e.state,oracle.state);workerCases.push(ball);
  }
 }
 const a=host({seed:3,bet:3000,search:'?edition=streaming'});a.control(prior);a.start();await a.number(NUMBERS[0]);await a.number(NUMBERS[1]);
 const checkpoint=clone(streamingCheckpoint(a).checkpoint(a.app)),b=host({seed:91,bet:3000,search:'?edition=streaming'});b.control(prior);b.start();
 assert.equal(streamingCheckpoint(b).restore(b.app,checkpoint),true);await idle(b.e);for(const n of NUMBERS.slice(2))await b.number(n);
 assert.deepEqual(b.e.state,oracle.state);assert.equal(b.app.totalWin,4500);
 console.log('SIXDROP_V280_HOST_PASS',JSON.stringify({animatedCountSamples:samples.length,allClearCount:earned.allClearCount,removedTotal:earned.removedTotal,old278Checkpoints:legacy.recorded278.checkpoints.map(s=>s.ballIndex),new280Checkpoints:checkpoints,offlineWorkerCases:workerCases,newPayout:oracle.win}));
}
run().catch(error=>{console.error(error);process.exitCode=1;});

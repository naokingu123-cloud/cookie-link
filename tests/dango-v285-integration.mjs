import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {R,read,plain,numbers,flush,host,installWorker,historyRound,downloadSource} from './dango-v285-fixture.mjs';

assert.equal(R.REVISION,285);
assert.equal(R.legacy268.REVISION,268);
const baseline=JSON.parse(await read('tests/dango-v285-legacy-fingerprints.json'));
for(const input of baseline.cases){
 const actual=createHash('sha256').update(JSON.stringify(historyRound(R,input))).digest('hex');
 assert.equal(actual,input.sha256,'unchanged full legacy trace '+JSON.stringify(input));
}

const fixed=api=>api.create({moldIndex:0,numbers,triggerCells:api.cells.filter(cell=>!api.molds[0].initialFreeCells.includes(cell.id)).slice(0,3).map(cell=>cell.id)});
const listFor=(s,hits)=>{
 const others=numbers.filter(n=>!s.triggerNumbers.includes(n));
 const early=[...s.triggerNumbers.slice(0,hits),...others.slice(0,5-hits)];
 const late=[...s.triggerNumbers.slice(hits),...numbers.filter(n=>!s.triggerNumbers.includes(n))].filter(n=>!early.includes(n)).slice(0,3);
 return [...early,...late];
};
let savedCheckpoints=0;

// All four real FREE budgets use the native one-ball scheduler. Every accepted
// ball survives the actual recorded checkpoint serializer and restore hook.
for(let hits=0;hits<=3;hits++){
 let h=host({seed:28520+hits});h.start();h.engine.state=fixed(h.R);
 let expected=fixed(R);const draws=listFor(expected,hits);
 assert.equal(expected.freeBudget,1);
 for(let i=0;i<8;i++){
  if(i===5){
   h.engine.finishThinkingV251({reason:'test-sixth-launch'});
   expected=R.commitFree(expected);
   assert.ok(h.events.filter(e=>e.type==='commit').every(e=>e.draws.length===5&&e.appDraws.length===5));
  }
  await h.number(draws[i]);expected=R.draw(expected,draws[i]);
  assert.deepEqual(plain(h.engine.state),plain(expected));
  assert.equal(h.engine.processed,i+1,'each native ball is accepted individually');
  if(i===4){
   assert.equal(expected.freeBudget,1+hits);
   assert.equal(expected.phase,'placing');
   assert.equal(expected.triggerActive,false);
   const chosen=expected.initialFreeCells[0];
   h.callbacks.onCell(chosen);expected=R.placeFree(expected,chosen);
   assert.deepEqual(plain(h.engine.state),plain(expected));
   const selected=plain(h.engine.state);h.callbacks.onCell(chosen);
   assert.equal(h.engine.state.manualFreeCells.length,0,'manual choice remains reversible');
   h.callbacks.onCell(chosen);assert.deepEqual(plain(h.engine.state),selected);
  }
  if(i>=5)assert.equal(h.engine.state.freeBudget,1+hits,'late cyan hits never grant another FREE');
  const saved=h.capture();savedCheckpoints++;
  assert.deepEqual(saved.engines[0].state.triggerCells,plain(expected.triggerCells));
  assert.equal(saved.engines[0].state.rulesRevision,285);
  const resumed=host({seed:29100+hits});resumed.start();await resumed.restore(saved);
  assert.deepEqual(plain(resumed.engine.state),plain(h.engine.state),'restore after ball '+(i+1));
  assert.deepEqual(plain(resumed.app.roundWins),plain(h.app.roundWins));
  if(i<7)h=resumed;
 }
 assert.equal(h.app.phase,'result');assert.equal(h.finished(),1);
 const win=Math.floor(h.app.locked[0]*R.payout(expected)/100);
 assert.equal(h.app.roundWins[0],win);assert.equal(h.app.totalWin,win);
 assert.deepEqual(plain(h.slot.reachResults),[],'live reach ends at eight balls');
 h.slot.paintDango(false);h.slot.paintDango(true);
 for(const frame of [h.frames.main.at(-1),h.frames.mini.at(-1)]){
  assert.equal(frame.state.draws.length,8);
  assert.deepEqual(plain(frame.options.reach),plain(h.slot.tabReachResults));
  assert.deepEqual(plain(frame.options.reach),plain(R.presentationReaches(expected).map(hit=>({...hit,total:hit.totalHundredths,gain:hit.gainHundredths,tier:0,kind:'reach'}))));
 }
 const credit=h.app.credit;h.engine.enqueueBatch([draws[7]]);h.engine.afterCheckpointRestoreV247();await flush();
 assert.equal(h.finished(),1,'duplicate completion cannot settle again');
 assert.equal(h.app.advanceResult(1800),true);assert.equal(h.app.credit,credit+win);
 assert.equal(h.app.beginPayout(),false);assert.equal(h.app.credit,credit+win,'native wallet awards once');
}

// The live fade uses a presentation clock; restored states show the completed
// fade instead of replaying it or putting a clock into deterministic game data.
const fading=host();fading.start();fading.engine.state=fixed(fading.R);
fading.draw(listFor(fading.engine.state,1).slice(0,5));
fading.slot.paintDango(false);assert.equal(fading.frames.main.at(-1).options.plusFreeFadeAge,0);
fading.context.document.hidden=true;fading.context.__sweetsSharedClientReady=true;
for(let i=0;i<9;i++)assert.equal(fading.engine.pumpHiddenV246(100),true);
fading.slot.paintDango(false);assert.equal(fading.frames.main.at(-1).options.plusFreeFadeAge,900);
const fadeSaved=fading.capture(),fadeResume=host();fadeResume.start();await fadeResume.restore(fadeSaved);
fadeResume.slot.paintDango(false);assert.equal(fadeResume.frames.main.at(-1).options.plusFreeFadeAge,Infinity);
assert.deepEqual(plain(fadeResume.engine.state),plain(fading.engine.state));
assert.ok(fading.events.some(e=>e.type==='announcement'&&e.message.includes('配置FREE＋1')));

// The actual offline settlement worker resumes each stable boundary, including
// partially chosen FREE at ball five. Its completion payload must equal the
// native host with the same saved board and prefix, with no future-ball input.
let workerCases=0;
const source=host();source.start();source.engine.state=fixed(source.R);
const workerDraws=listFor(source.engine.state,2),checkpoints=[source.capture()];
for(let i=0;i<8;i++){
 if(i===5)source.engine.finishThinkingV251({reason:'before-six'});
 await source.number(workerDraws[i]);
 if(i===4)source.callbacks.onCell(source.engine.state.initialFreeCells[1]);
 checkpoints.push(source.capture());
}
for(const stableBall of [0,1,4,5,6,7,8]){
 const worker=host({worker:true}),adapter=installWorker(worker),snapshot=checkpoints[stableBall];
 const nativeResume=host();nativeResume.start();await nativeResume.restore(snapshot);
 nativeResume.draw(workerDraws.slice(stableBall));await flush();
 await adapter.settleWork({roundId:'dango285-'+stableBall,playerId:'fixture',token:'fixture-token',rate:90,state:snapshot,stableBall,
  balls:workerDraws.map((number,index)=>({index:index+1,number}))});
 await flush();assert.equal(adapter.requests.length,1);
 const payload=adapter.requests[0].body;
 assert.deepEqual(plain(worker.engine.state),plain(nativeResume.engine.state),'worker state '+stableBall);
 assert.equal(payload.games.length,1);assert.equal(payload.games[0].id,'dango');
 assert.equal(payload.games[0].win,nativeResume.app.totalWin);assert.equal(payload.totalWin,nativeResume.app.totalWin);
 assert.equal(payload.creditAfter,snapshot.credit+nativeResume.app.totalWin);
 assert.ok(worker.events.filter(e=>e.type==='commit').every(e=>e.draws.length===5));
 workerCases++;
}

// Native recording tapes carry the trigger selection as part of round-start
// randomness. Replaying the tape recreates all 28 cells and three cyan cells.
const recorded=host(),controller=recorded.recording.installRecording(recorded.app,{seed:'dango285-tape'});
recorded.start();const startState=plain(recorded.engine.state),tapes=controller.export();
const replayed=host();replayed.recording.installReplayTapes(replayed.app,tapes);replayed.start();
assert.deepEqual(plain(replayed.engine.state),startState);

// Exercise production download playback: launch six commits the five-ball
// choice before even reading the future recorded HIT getter.
const replay=host();replay.start();replay.engine.state=fixed(replay.R);
const replayDraws=listFor(replay.engine.state,1);replay.draw(replayDraws.slice(0,5));
replay.callbacks.onCell(replay.engine.state.initialFreeCells[0]);
const expectedReplay=R.commitFree(replay.engine.state);
const launchStart=downloadSource.indexOf('function commitDangoBeforeRecordedLaunchV269('),launchEnd=downloadSource.indexOf('\nfunction reconcile(',launchStart);
const tickStart=downloadSource.indexOf('function tick(now){'),tickEnd=downloadSource.indexOf('\nfunction wake()',tickStart);
assert.ok(launchStart>=0&&launchEnd>launchStart&&tickStart>=0&&tickEnd>tickStart);
let futureReads=0,renderBeforeHit=false;
const sixth={atMs:12000,get number(){futureReads++;assert.equal(replay.engine.state.freeCommitted,true);return replayDraws[5];}};
Object.assign(replay.context,{cursor:5,pack:{playback:{recording:{hits:[{atMs:1000},{atMs:2000},{atMs:3000},{atMs:4000},{atMs:5000},sixth],launches:[{atMs:1000},{atMs:2000},{atMs:3000},{atMs:4000},{atMs:4500},{atMs:10000}],durationMs:20000}}},
 started:true,localComplete:false,playing:true,lastFrame:9990,playbackMs:9990,settling:false,settleStamp:0,frame:1,playbackTiming:{frames:0,activeMs:0,maxFrameMs:0,settlingMs:0},
 stopped:()=>false,renderer:{renderAt(){renderBeforeHit=replay.engine.state.freeCommitted;}},callbacks:{onNumber(n){assert.equal(renderBeforeHit,true);replay.draw([n]);return true;}},render:()=>{},wake:()=>{},persist:async()=>{},finishLocal:()=>{},reconcile:()=>{},syncProgress:()=>{}});
vm.runInContext(downloadSource.slice(launchStart,launchEnd)+'\n'+downloadSource.slice(tickStart,tickEnd),replay.context);
assert.equal(replay.context.commitDangoBeforeRecordedLaunchV269(9999),false);
replay.context.tick(10000);assert.equal(futureReads,0);assert.equal(renderBeforeHit,true);
assert.equal(replay.engine.state.draws.length,5);assert.deepEqual(plain(replay.engine.state),plain(expectedReplay));
replay.context.tick(12000);assert.equal(futureReads,1);assert.equal(replay.engine.state.draws.length,6);

// A saved v268 line-based FREE round remains exact through settlement. The
// next native round selects the current cyan trigger rules independently.
const historical=host({revision:268});historical.start();
historical.engine.state=historical.R.create({moldIndex:0,numbers});historical.draw([1,3,6,10,15]);
assert.equal(historical.engine.state.freeBudget,7);
const legacySave=historical.capture(),upgraded=host();upgraded.start();await upgraded.restore(legacySave);
assert.equal(upgraded.engine.state.rulesRevision,268);assert.equal(upgraded.engine.state.freeBudget,7);
assert.deepEqual(plain(upgraded.engine.state.triggerNumbers),[]);
for(const n of [2,4,5]){await historical.number(n);await upgraded.number(n);}
assert.deepEqual(plain(upgraded.engine.state),plain(historical.engine.state));
assert.equal(upgraded.app.totalWin,historical.app.totalWin);
upgraded.app.prepare();upgraded.start();assert.equal(upgraded.engine.state.rulesRevision,285);
assert.equal(upgraded.engine.state.triggerCells.length,3);assert.equal(upgraded.engine.state.freeBudget,1);

const excluded=host({bet:0});assert.equal(excluded.app.start(),false);assert.equal(excluded.engine.liveBoard,false);
console.log('DANGO_V285_INTEGRATION_PASS',JSON.stringify({legacyFingerprints:baseline.cases.length,savedCheckpoints,freeBudgets:[1,2,3,4],workerCases,recordedTriggerReplay:true,downloadNoFuturePeek:true,legacy268Rollover:true,transientFade:true,nativeWalletOnce:true}));

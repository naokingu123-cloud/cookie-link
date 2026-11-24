/* A visual release must retain the shipped native geometry, probabilities,
 * RNG consumption, exact payouts and pre-v232 checkpoint interpretation. */
import assert from 'node:assert/strict';
import {BASELINE_CORE_SHA256,nativeCore,sha256,loadGelato,random,buildWitnesses,decode,nativeState,drawNative} from './gelato-v297-fixture.mjs';

assert.equal(sha256(nativeCore()),BASELINE_CORE_SHA256,'the complete native engine remains byte-identical to main e829acc');
const q=loadGelato();
assert.deepEqual([q.P.length,q.EDGES.length,q.FACES.length],[19,42,24]);
assert.equal(new Set(q.EDGES.map(({a,b})=>[a,b].sort((a,b)=>a-b).join(':'))).size,42);
assert(q.FACES.every(face=>face.nodes.length===3&&face.edges.length===3));
assert.equal(q.fill(q.link(new Set([0,1,5,13,17,18]))).size,24,'the six native tips enclose all elementary cells');
assert.deepEqual(q.COUNT_MULT,[0,0,0,0,0,0,0,0,0,0,0.2,0.3,0.5,0.7,0.9,1.3,1.7,2.1,2.6,3.4,4.3,6.4,8.5,17,100]);
assert.deepEqual(q.LEGACY_COUNT_MULT,[0,0,0,0,0,0,0,0,0,0,0.2,0.4,0.6,0.8,1,1.5,2,2.5,3,4,5,7.5,10,20,100]);
assert.deepEqual(q.COLLECTOR_MULT,[0,1,3,5,10]);
assert.equal(q.PATTERNS.length,21);assert.equal(q.FACE_TRANSFORMS.length,12);
for(const pattern of q.PATTERNS){
 assert.deepEqual([0,1,2,3,4].map(color=>pattern.grades.filter(value=>value===color).length),[8,4,4,4,4]);
 for(const transform of q.FACE_TRANSFORMS){
  assert.equal(new Set(transform).size,24);
  const grades=Array(24);transform.forEach((to,from)=>grades[to]=pattern.grades[from]);
  const full=q.evaluatePrize(new Set(Array.from({length:24},(_,id)=>id)),grades);
  assert.deepEqual(full.counts,[8,4,4,4,4]);assert.equal(full.hundredths,11900);
 }
}

let calls=0;const rng=random(2977919),initial=new q.GelatoEngine(()=>{calls++;return rng();},()=>{},async()=>{});
assert.equal(calls,27,'one native board consumes exactly 24 shuffle + pattern + transform + Sugar RNG calls');
assert.equal(sha256(JSON.stringify(nativeState(initial))),'3ec0b80cfd60541d10816629c20cecb2ff0882a97b12c88c27d9a58027f7e04e','deterministic board and native fields retain the baseline fingerprint');
assert.equal(initial.drawMode,'single');assert.equal(initial.countPaytable,q.COUNT_MULT);
for(const target of [50,90,150]){
 const mix=q.patternMix(target);
 assert(mix.probability>=0&&mix.probability<=1);
 assert(Math.abs((1-mix.probability)*mix.low.expectedRate+mix.probability*mix.high.expectedRate-target)<1e-8);
}

const {witnesses,search}=await buildWitnesses();
assert.equal(search.drawsTried,15);
const expected={panel:{gain:20,total:20,filled:10,newlyCompleted:[]},collector:{gain:530,total:530,filled:20,newlyCompleted:[1]},collectorMultiple:{gain:1030,total:1030,filled:20,newlyCompleted:[1,3]},full:{gain:11370,total:11900,filled:24,newlyCompleted:[2,3,4]}};
for(const [key,fixture]of Object.entries(witnesses)){
 const proof=fixture.proof,want=expected[key];
 assert.equal(proof.gain,want.gain);assert.equal(proof.totalHundredths,want.total);assert.equal(proof.filledCount,want.filled);
 assert.deepEqual(proof.newlyCompleted,want.newlyCompleted);assert.equal(proof.sourceSha256,BASELINE_CORE_SHA256);
 assert(fixture.draws.length+1<=8&&new Set([...fixture.draws,fixture.next]).size===fixture.draws.length+1);
 const events=[],restored=new q.GelatoEngine(random(100),event=>events.push(event),async()=>{});
 Object.assign(restored,decode(fixture.fields));restored.wait=async()=>true;restored.running=true;
 assert.deepEqual(nativeState(restored),fixture.state,'fresh engine accepts genuine '+key+' checkpoint without changing its native state');
 const prediction=restored.predict(fixture.next);
 assert.equal(prediction.gain,proof.gain);assert.equal(prediction.total,proof.totalHundredths);
 await drawNative(restored,fixture.next);
 assert.deepEqual(nativeState(restored),proof.stateAfter,'checkpoint resumes exactly the same '+key+' native result');
 assert.equal(events.filter(event=>event.phase==='gelatoFill'&&event.gain>0).length,1);
}

// An old checkpoint replaces pattern as an object. A fresh constructor's v232
// defaults must not make that active old round silently use the new amounts.
for(const key of ['collector','full']){
 const fixture=witnesses[key],saved=decode(fixture.fields);delete saved.pattern.payoutVersion;
 const prior=q.evaluatePrize(saved.filled,saved.faceGrades,q.LEGACY_COUNT_MULT);
 Object.assign(saved,{totalHundredths:prior.hundredths,countMult:prior.countMult,collectorMult:prior.collectorMult,collectorCounts:prior.counts});
 const events=[],restored=new q.GelatoEngine(random(909),event=>events.push(event),async()=>{});
 assert.equal(restored.countPaytable,q.COUNT_MULT);Object.assign(restored,saved);
 assert.equal(restored.countPaytable,q.LEGACY_COUNT_MULT,'unversioned saved pattern retains historical paytable');
 restored.wait=async()=>true;restored.running=true;await drawNative(restored,fixture.next);
 const expectedLegacy=q.evaluatePrize(restored.filled,restored.faceGrades,q.LEGACY_COUNT_MULT),award=events.find(event=>event.phase==='gelatoFill');
 assert.equal(restored.totalHundredths,expectedLegacy.hundredths);
 assert.equal(award.gain,expectedLegacy.hundredths-prior.hundredths);
 assert.equal(award.gain,key==='collector'?600:11300);
}

// Complete a normal eight-ball game after the six-tip full board. Further
// draws do not pay completion twice; the next reset removes every acquired cell.
const events=[],game=new q.GelatoEngine(random(2977919),event=>events.push(event),async()=>{});
game.wait=async()=>true;game.start();const fullNumbers=[0,1,5,13,17,18].map(id=>game.nodeNumbers[id]);
const misses=Array.from({length:25},(_,id)=>id+1).filter(number=>!game.nodeNumbers.includes(number)).slice(0,2);
for(const number of [...fullNumbers,...misses])await drawNative(game,number);
assert.equal(game.processed,8);assert.equal(game.phase,'complete');assert.equal(game.totalHundredths,11900);
assert.equal(game.allClears,1);assert.equal(events.filter(event=>event.phase==='gelatoFill'&&event.full).length,1);
assert.equal(events.filter(event=>event.phase==='sugaraward').length,1);
assert.equal(game.enqueueBatch([misses[0]]),false,'finished or duplicate draws cannot enter a normal round');
const previousNumbers=game.nodeNumbers.slice();game.reset();
assert.notDeepEqual(game.nodeNumbers,previousNumbers);assert.equal(game.hits.size,0);assert.equal(game.links.size,0);assert.equal(game.filled.size,0);
assert.deepEqual(game.collectorCounts,[0,0,0,0,0]);assert.equal(game.totalHundredths,0);assert.equal(game.sugarAwarded,false);assert.equal(game.allComplete,false);
assert.equal(game.countPaytable,q.COUNT_MULT,'a new round returns to the current paytable');
console.log('GELATO_V297_RULES_PASS',JSON.stringify({sourceSha256:BASELINE_CORE_SHA256,geometry:[19,42,24],nativeWitnesses:4,drawsTried:search.drawsTried,fullHundredths:11900,legacyCheckpoints:true,rngCalls:27}));

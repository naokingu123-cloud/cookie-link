import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const random=initial=>{let seed=initial;return()=>((seed=Math.imul(seed,1664525)+1013904223)>>>0)/4294967296;};
const shuffle=(a,rng)=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const core=async path=>{const module={exports:{}};new Function('module',await read(path))(module);return module.exports;};

const gelatoSource=await read('assets/gelato-prism-v28.js');
const gelatoStart=gelatoSource.indexOf(' const H=106,'),gelatoEnd=gelatoSource.indexOf(' const path=nodes=>');
assert.ok(gelatoStart>=0&&gelatoEnd>gelatoStart,'load the actual Gelato engine and shared payout constants');
const G=new Function('wonderTier',gelatoSource.slice(gelatoStart,gelatoEnd)+';return {P,LINES,EDGES,FACES,PATTERNS,RATE_PATTERNS,FACE_TRANSFORMS,COUNT_MULT,LEGACY_COUNT_MULT,COLLECTOR_MULT,link,fill,evaluatePrize,patternMix,GelatoEngine};')(()=>1);
assert.equal(G.PATTERNS.length,21);
assert.equal(G.FACE_TRANSFORMS.length,12);
assert.equal(G.COUNT_MULT[24],100);
assert.deepEqual(G.COLLECTOR_MULT,[0,1,3,5,10]);
assert.ok(gelatoSource.includes('const countPaytable=e.countPaytable')&&gelatoSource.includes('countPaytable[n]*100'),'the visible award table reads the same versioned constants as settlement');
for(const pattern of G.PATTERNS){
 assert.deepEqual([0,1,2,3,4].map(c=>pattern.grades.filter(v=>v===c).length),[8,4,4,4,4]);
 for(const transform of G.FACE_TRANSFORMS)assert.equal(new Set(transform).size,24);
}

// Enumerate every feasible subset of the 19 unique board numbers. The six
// omitted roulette numbers supply C(6, 8-k) equivalent eight-ball outcomes.
// This is exactly all C(25,8)=1,081,575 combinations, not a fitted sample.
const choose6=[1,6,15,20,15,6,1],denominator=1081575,distribution=new Map();
for(let mask=0;mask<(1<<19);mask++){
 let count=0;for(let bits=mask;bits;bits&=bits-1)count++;
 if(count<2||count>8)continue;
 const hits=new Set();for(let i=0;i<19;i++)if(mask&(1<<i))hits.add(i);
 const filled=G.fill(G.link(hits));let faceMask=0;for(const face of filled)faceMask|=1<<face;
 distribution.set(faceMask,(distribution.get(faceMask)||0)+choose6[8-count]);
}
assert.equal([...distribution.values()].reduce((a,b)=>a+b,0),denominator);
const states=[...distribution].map(([mask,weight])=>{let count=0;for(let bits=mask;bits;bits&=bits-1)count++;return {mask,weight,count};});
const countReturn=states.reduce((sum,s)=>sum+G.COUNT_MULT[s.count]*100*s.weight/denominator,0);
const groupProbabilities=new Map();
function meanFor(grades){
 let result=countReturn;
 for(let color=1;color<=4;color++){
  let mask=0;grades.forEach((v,i)=>{if(v===color)mask|=1<<i;});
  if(!groupProbabilities.has(mask))groupProbabilities.set(mask,states.reduce((sum,s)=>sum+((s.mask&mask)===mask?s.weight/denominator:0),0));
  result+=G.COLLECTOR_MULT[color]*100*groupProbabilities.get(mask);
 }
 return result;
}
for(const pattern of G.PATTERNS)for(const transform of G.FACE_TRANSFORMS){
 const grades=Array(24);transform.forEach((to,from)=>grades[to]=pattern.grades[from]);
 assert.ok(Math.abs(meanFor(grades)-pattern.expectedRate)<1e-7,pattern.id+' exact anchor and transformed geometry');
}
for(const target of [50,65,90,100,125,150]){
 const mix=G.patternMix(target),mean=(1-mix.probability)*meanFor(mix.low.grades)+mix.probability*meanFor(mix.high.grades);
 assert.ok(mix.probability>=0&&mix.probability<=1);
 assert.ok(Math.abs(mean-target)<1e-7,'Gelato calibrated mean at '+target);
}
for(const target of [50,90,150])for(let trial=0;trial<30;trial++){
 const rng=random(231000+trial),events=[];
 const engine=new G.GelatoEngine(rng,event=>events.push(event),async()=>{});
 engine.payoutTarget=target;engine.reset();engine.wait=async()=>true;
 assert.equal(engine.pattern.payoutVersion,232);assert.equal(engine.countPaytable,G.COUNT_MULT);
 assert.equal(new Set(engine.nodeNumbers).size,19);
 assert.equal(engine.payoutTarget,target);
 const draws=shuffle(Array.from({length:25},(_,i)=>i+1),random(5911+trial)).slice(0,8);
 engine.running=true;engine.accepted=8;engine.seen=new Set(draws);engine.queue=[draws];
 await engine.drain();
 assert.equal(engine.processed,8);assert.equal(engine.phase,'complete');
 const hitNodes=new Set(engine.nodeNumbers.flatMap((n,i)=>draws.includes(n)?[i]:[]));
 const expected=G.evaluatePrize(G.fill(G.link(hitNodes)),engine.faceGrades);
 assert.equal(engine.totalHundredths,expected.hundredths,'actual engine follows the same visible board and paytable');
 assert.ok(!events.some(event=>event.phase==='error'));
}
// Shared and offline-worker recovery merge saved own fields into a fresh
// instance. An old pattern without a version must override the new defaults.
for(let trial=0;trial<12;trial++){
 const engine=new G.GelatoEngine(random(44910+trial),()=>{},async()=>{});
 delete engine.pattern.payoutVersion;engine.wait=async()=>true;
 assert.equal(engine.countPaytable,G.LEGACY_COUNT_MULT);
 const draws=shuffle(Array.from({length:25},(_,i)=>i+1),random(1382+trial)).slice(0,8);
 engine.running=true;engine.accepted=3;engine.seen=new Set(draws.slice(0,3));engine.queue=[draws.slice(0,3)];
 await engine.drain();
 const saved=structuredClone(Object.fromEntries(Object.entries(engine).filter(([,value])=>typeof value!=='function')));
 const restored=new G.GelatoEngine(random(7102+trial),()=>{},async()=>{});
 assert.equal(restored.countPaytable,G.COUNT_MULT);
 Object.assign(restored,saved);restored.wait=async()=>true;
 assert.equal(restored.countPaytable,G.LEGACY_COUNT_MULT);
 const predicted=restored.predict(draws[3]);
 const nextHits=new Set(restored.hits),nextNode=restored.nodeNumbers.indexOf(draws[3]);if(nextNode>=0)nextHits.add(nextNode);
 assert.equal(predicted.total,G.evaluatePrize(G.fill(G.link(nextHits)),restored.faceGrades,G.LEGACY_COUNT_MULT).hundredths);
 restored.accepted=8;restored.seen=new Set(draws);restored.queue=[draws.slice(3)];
 await restored.drain();
 assert.equal(restored.processed,8);assert.equal(restored.phase,'complete');
 assert.equal(restored.totalHundredths,G.evaluatePrize(restored.filled,restored.faceGrades,G.LEGACY_COUNT_MULT).hundredths);
 restored.reset();assert.equal(restored.countPaytable,G.COUNT_MULT);
}
console.log('Gelato v232: all 1,081,575 draw combinations, 21 anchors, 12 transforms, native awards and old-checkpoint continuation passed');

const P=await core('assets/popcorn-engine.js');
assert.equal(P.initialPatterns.length,6);
assert.deepEqual(P.popPay[0],[120,.1]);
assert.deepEqual(P.clearPay.map(([,award])=>award),[1,3,20,50,200,500,1000,2000]);
for(const pattern of P.initialPatterns){
 assert.deepEqual([0,1,2,3,4,5].map(power=>pattern.powers.filter(v=>v===power).length),[49,8,2,2,0,0]);
 for(let i=0;i<61;i++){
  const cell=P.cells[i],opposite=P.cells.findIndex(p=>p.q===-cell.q&&p.r===-cell.r);
  assert.equal(pattern.powers[i],pattern.powers[opposite],'opening template has half-turn symmetry');
 }
}
for(const target of [50,65,90,100,125,150]){
 const mix=P.patternMix(target);
 assert.ok(Math.abs((1-mix.probability)*mix.low.expectedRate+mix.probability*mix.high.expectedRate-target)<1e-7);
 assert.equal(P.firstForRate(target,.5),120,'rate never shifts the visible pop-count payout tiers');
}
for(const target of [50,90,150])for(let trial=0;trial<40;trial++){
 const rng=random(715512+trial),state=P.create({rate:target,rng,bet:100});
 assert.deepEqual([0,1,2,3,4,5].map(power=>state.board.filter(p=>p.power===power).length),[49,8,2,2,0,0]);
 assert.equal(state.firstPopAward,120);assert.equal(state.openingPatternChance,1);
 assert.equal(new Set(state.numbers).size,17);assert.equal(state.initialSymmetry,'rot180');
 assert.ok([230,240].includes(state.sugarTarget));
 assert.deepEqual(state.openingClearPorts,P.ports.flatMap((_,port)=>P.preview(state,state.numbers[port]).clear?[port]:[]));
 const draws=shuffle(Array.from({length:25},(_,i)=>i+1),random(81331+trial)).slice(0,8);
 for(const number of draws){
  const before=JSON.stringify(state),preview=P.preview(state,number);
  assert.equal(JSON.stringify(state),before,'reach prediction never changes the next outcome');
  const turn=P.draw(state,number,rng);
  assert.equal(turn.count,preview.count);assert.equal(turn.win,preview.win);
  assert.equal(new Set(turn.waves.flat()).size,turn.count);
  assert.ok(state.board.length===61&&state.board.filter(Boolean).length<=61);
  assert.equal(new Set(state.board.filter(Boolean).map(p=>p.id)).size,state.board.filter(Boolean).length);
 }
 assert.equal(state.turn,8);assert.equal(new Set(state.drawn).size,8);
 assert.equal(state.win,P.payout(state.popped,state.clears,state.bet,120));
 assert.equal(P.draw(state,draws[0],rng),null);
}
for(const first of [80,220]){
 const rng=random(701+first),state=P.create({rate:90,rng,bet:100});
 state.firstPopAward=first;
 assert.equal(P.popPayFor(state.firstPopAward)[0][0],first,'restored rounds retain their displayed first payout threshold');
 for(const number of [1,5,7,12,14,18,22,25]){
  const preview=P.preview(state,number),turn=P.draw(state,number,rng);
  assert.equal(turn.win,preview.win);assert.equal(state.firstPopAward,first);
  assert.equal(state.win,P.payout(state.popped,state.clears,state.bet,first));
 }
}
console.log('Popcorn v232: fixed payout tiers, identical bomb counts, six symmetric templates, pure preview and 120 actual eight-ball rounds passed');

const W=await core('assets/winery-pyramid-core-v1.js');
assert.deepEqual(W.PAY,[0,0,0,0,0,0,0,0,0,0,.3,.6,1,1.5,2,3,4,6,10,15,30,100]);
assert.equal(W.PREFILLS.length,8);assert.equal(W.PREFILL_FLAVORS.length,8);
for(let index=0;index<W.PREFILLS.length;index++){
 const board=W.initial(index),volume=board.reduce((sum,g)=>sum+g.volume,0);
 assert.equal(board.filter(g=>g.volume>0).length,6,'all opening templates contain six prefilled glasses');
 assert.ok(volume>=4.9-1e-8&&volume<=5.4+1e-8,'the total prefill stays within the bounded authored range');
 for(const cell of W.CELLS){
  const mirror=cell.r*(cell.r+1)/2+cell.r-cell.c;
  assert.equal(board[cell.id].volume,board[mirror].volume,'liquid placement is mirror-symmetric');
  assert.deepEqual(board[cell.id].layers,board[mirror].layers,'visible fruit colors share that symmetry');
 }
}
for(const target of [50,65,90,90.25,100,125,150]){
 const mix=W.patternMix(target);
 assert.ok(Math.abs(mix.low[1]*(1-mix.probability)+mix.high[1]*mix.probability-target)<1e-7);
 assert.equal(W.rateAnchor(target,()=>.5).scale,1,'PO never globally scales the opening liquid');
}
for(const target of [50,90,150])for(let trial=0;trial<30;trial++){
 const rng=random(98117+trial),events=[],engine=new W.WineryEngine({random:rng,sleep:async()=>{},onEvent:event=>events.push(event)});
 assert.equal(engine.setPayoutTarget(target),true);engine.wait=async()=>true;
 assert.equal(engine.fillScale,1);assert.equal(new Set([...engine.nodeNumbers,...engine.boostNumbers]).size,25);
 const draws=shuffle(Array.from({length:25},(_,i)=>i+1),random(88371+trial)).slice(0,8);
 let glasses=W.clone(engine.glasses),power=1;
 for(let i=0;i<8;i++){
  const pos=engine.nodeNumbers.indexOf(draws[i]);
  if(pos<0)power=Math.min(16,power*2);
  else{
   const before=glasses.reduce((sum,g)=>sum+g.volume,0),plan=W.pour(glasses,pos,power,W.flavorFor(i+1));
   assert.ok(Math.abs(before+power-plan.wasted-plan.glasses.reduce((sum,g)=>sum+g.volume,0))<1e-8);
   glasses=plan.glasses;
  }
 }
 engine.running=true;engine.accepted=8;engine.seen=new Set(draws);engine.queue=[draws];
 await engine.drain();
 assert.equal(engine.processed,8);assert.equal(engine.phase,'complete');
 const expected=W.prize(glasses);
 assert.equal(engine.totalHundredths,expected.hundredths,'native pouring/MIX award follows the visible initial fruit layers');
 assert.deepEqual(engine.glasses,glasses);assert.ok(!events.some(event=>event.phase==='error'));
 assert.equal(engine.totalHundredths,Math.round(W.PAY[engine.fullCount]*100*(10+engine.mixCount)/10));
}
console.log('Winery v232: fixed paytable/pour rules, eight mirrored six-glass templates, bounded liquid totals and 90 native rounds passed');

// Heavy independent Monte Carlo calibration is intentionally kept out of CI.
export {core,random,shuffle};

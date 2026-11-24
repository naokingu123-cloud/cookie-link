/* Native Popcorn invariants and reached-history evidence for v299 artwork. */
import assert from 'node:assert/strict';
import {
 BASELINE_CORE_SHA256,nativeCore,sha256,plain,loadPopcorn,random,ORACLE_CELLS,ORACLE_PORTS,CLEAR_MULTIPLIERS,
 independentBlast,independentPayout,independentProbabilities,verifyNativeStep,buildPopcornFixtures,replayPopcornFixture
} from './popcorn-v299-fixtures.mjs';

assert.equal(sha256(nativeCore()),BASELINE_CORE_SHA256,'all native core bytes stay identical to published v298 base 5fabe4f');
const K=loadPopcorn(nativeCore(),{forbidAmbientRandom:true});
assert.deepEqual(K.cells,ORACLE_CELLS);assert.equal(K.cells.length,61);
assert.deepEqual(Array.from({length:9},(_,row)=>K.cells.filter(p=>p.r===row-4).length),[5,6,7,8,9,8,7,6,5]);
assert.deepEqual(K.ports.map(port=>port.line),ORACLE_PORTS);
assert.deepEqual(K.ports.map(port=>port.line.length),[5,6,7,8,9,5,5,5,5,5,9,8,7,6,5]);
for(let power=1;power<=5;power++)for(let id=0;id<61;id++){
 assert.deepEqual(K.blastAreas[power][id].slice().sort((a,b)=>a-b),independentBlast(id,power),'six actual kernel grades preserve their exact axial blast geometry');
}
assert.deepEqual(K.clearPay.map(row=>row[1]),CLEAR_MULTIPLIERS);
assert.deepEqual(K.popPay[0],[120,.1]);
for(let level=1;level<=9;level++){
 const native=K.probabilitiesForLevel(level),oracle=independentProbabilities(level);
 native.forEach((p,i)=>assert(Math.abs(p-oracle[i])<1e-12,'rarer grades retain priority when total probability saturates'));
 assert(Math.abs(native.reduce((a,b)=>a+b,0)-1)<1e-12);assert(native.every(p=>p>=0&&p<=1));
}
for(const target of [50,90,150]){
 const rng=random(2997919),state=K.create({rng,bet:5,rate:target});
 assert.equal(rng.snapshot().calls,27);assert.equal(state.firstPopAward,120);assert.equal(K.firstForRate(target),120);
 assert.deepEqual(Array.from({length:6},(_,grade)=>state.board.filter(p=>p.power===grade).length),[49,8,2,2,0,0]);
 assert(state.board.every(Object.isFrozen));assert.equal(state.initialSymmetry,'rot180');
 assert.equal(state.openingPatternChance,1);assert([230,240].includes(state.sugarTarget));
}

// Every visible threshold, including old saved thresholds, is independently
// checked immediately before and after crossing with a selectable BET 5.
let payoutChecks=0;
for(const first of [80,120,220])for(const bet of [5,3000,300000])for(let clears=0;clears<=8;clears++){
 const boundaries=new Set([0,first-1,488]);
 for(let popped=first;popped<=488;popped+=10)for(const offset of [-1,0,1])boundaries.add(popped+offset);
 for(const popped of boundaries){assert.equal(K.payout(popped,clears,bet,first),independentPayout(popped,clears,bet,first));payoutChecks++;}
}

const fixtures=buildPopcornFixtures(),byId=Object.fromEntries(fixtures.map(f=>[f.id,f]));
const fingerprint=s=>sha256(JSON.stringify({...s,bet:100,win:independentPayout(s.popped,s.clears,100,s.firstPopAward)}));
const pinned={
 'pops-lowbet':{initial:'0d9fc46e03d71f0f819f938935888a34932ed65607c3442ad68d307db415bb8e',final:'ce274f4954bf158bf761fdc8c6d24337a44012e77eb112d473b428ff25803849',rng:[75,119,161,216,274,335,378,410],counts:[50,41,42,53,57,59,43,33],chains:[2,2,2,2,2,6,2,2]},
 'clear-ladder':{initial:'0d9fc46e03d71f0f819f938935888a34932ed65607c3442ad68d307db415bb8e',final:'d0024251f24325dfda5c5845fc697949890127ec3d4327dc0f606ad06e2ef228',rng:[28,29,77,139,201,263,325,387],counts:[0,0,50,58,61,61,61,61],chains:[0,0,2,5,7,4,4,6]},
 rainbow:{initial:'32c5c2e8b30c03c94a533e93a630dfa14bd745477e936c2edfe9659d252e3e27',final:'96e1a0baa997e09e3a863a4f47a7b430c91c0265dc15e9258207d5f7c367cbe7',rng:[82,135,197,259,317,372,425,475],counts:[59,50,58,61,60,54,51,50],chains:[6,4,5,2,2,2,2,2]}
};
for(const fixture of fixtures){
 const wanted=pinned[fixture.id];
 assert.equal(fixture.coreSha256,BASELINE_CORE_SHA256);
 assert.equal(fingerprint(fixture.initial),wanted.initial);assert.equal(fingerprint(fixture.steps.at(-1).after),wanted.final);
 assert.deepEqual(fixture.steps.map(s=>s.rngAfter.calls),wanted.rng);assert.deepEqual(fixture.steps.map(s=>s.oracle.count),wanted.counts);
 assert.deepEqual(fixture.steps.map(s=>s.oracle.chains),wanted.chains);assert.equal(fixture.steps.at(-1).after.turn,8);
 assert.equal(new Set(fixture.draws).size,8);
 assert.equal(fixture.steps.reduce((sum,s)=>sum+s.oracle.nativeWinDelta,0),fixture.steps.at(-1).after.win,'the actual event increments telescope to the exact native final result');
 assert.equal(fixture.steps.filter(s=>s.trace.sugarCrossed).length,1,'the reached Sugar threshold is crossed at most once in these eight-ball histories');
 const finished=plain(fixture.steps.at(-1).after),rng=random(fixture.seed,fixture.rngFinal),before=JSON.stringify(finished);
 for(const number of [fixture.draws[0],finished.numbers[0],0,26])assert.equal(K.draw(finished,number,rng),null);
 assert.equal(JSON.stringify(finished),before);assert.deepEqual(rng.snapshot(),fixture.rngFinal,'no ninth draw or duplicate consumes refill RNG');
}

const pops=byId['pops-lowbet'],ladder=byId['clear-ladder'],rainbow=byId.rainbow;
assert(pops.steps[0].trace.all&&!pops.steps[0].trace.clear&&!pops.steps[0].oracle.award,'an ALL ignition without a payable gain is not an ALL CLEAR award');
assert(pops.steps[2].oracle.award&&!pops.steps[2].trace.clear);assert(pops.steps[3].oracle.grades[4]>0,'a true blue/lightning piece is popped');
assert(!pops.steps[5].trace.all&&pops.steps[5].oracle.chains===6&&pops.steps[5].oracle.award,'an ordinary numbered lane reaches a paid six-wave POP');
assert.deepEqual(ladder.steps.slice(3).map(s=>s.after.clears),[1,2,3,4,5]);
assert.equal(ladder.steps[3].trace.count,58);assert.equal(ladder.steps[3].before.board.filter(Boolean).length,58,'a sparse board really clears without inventing three particles');
assert.deepEqual(ladder.steps.slice(3).map(s=>s.oracle.role),['clear','clear','grand','grand','grand']);
assert.deepEqual(rainbow.steps[2].oracle.grades,[42,12,1,1,1,1],'all six grades genuinely appear on one board and actually pop');
assert.equal(rainbow.steps[2].trace.clear,true);assert.equal(rainbow.steps[2].oracle.chains,5);
assert.deepEqual([pops.steps[4].oracle.nativeOldWin,pops.steps[4].oracle.nativeTotalWin,pops.steps[4].oracle.nativeWinDelta,pops.steps[4].oracle.legacyWin],[3,8,5,4]);
const lowGrand=replayPopcornFixture('clear-ladder',{bet:5}).steps[5];
assert.deepEqual([lowGrand.oracle.gain,lowGrand.oracle.nativeWinDelta,lowGrand.oracle.legacyWin],[2090,105,104],'a selectable BET 5 reaches the third-clear rounding boundary too');

// A legal all-UP round reaches Lv9 and still has zero POP and zero money.
const boostRng=random(7919),boost=K.create({rng:boostRng,bet:5,rate:90}),boostDraws=[];
for(let turn=0;turn<8;turn++){
 const number=boost.numbers[boost.boostIndex],before=plain(boost),rngBefore=boostRng.snapshot(),trace=K.draw(boost,number,boostRng);
 const oracle=verifyNativeStep(before,plain(boost),trace,number,rngBefore,boostRng.snapshot());boostDraws.push(number);
 assert(oracle.boost);assert.equal(oracle.newLevel,turn+2);assert.equal(oracle.spawned,0);assert.equal(oracle.rngCalls,1);assert.equal(oracle.nativeWinDelta,0);
 assert.deepEqual(boost.board,before.board,'UP improves future refill probabilities, never the existing pieces');
}
assert.equal(new Set(boostDraws).size,8);assert.equal(boost.level,9);assert.equal(boost.win,0);assert.equal(boostRng.snapshot().calls,35);

// Invalid inputs are rejected before any random value or native mutation.
const invalidRng=random(1909),invalid=K.create({rng:invalidRng,bet:5,rate:90}),invalidSaved=JSON.stringify(invalid),invalidPosition=invalidRng.snapshot();
for(const number of [undefined,null,'1',-1,0,26,1.5,NaN,Infinity]){
 assert.equal(K.draw(invalid,number,invalidRng),null);assert.equal(JSON.stringify(invalid),invalidSaved);assert.deepEqual(invalidRng.snapshot(),invalidPosition);
}
for(let number=1;number<=25;number++){
 const before=JSON.stringify(invalid);K.preview(invalid,number);assert.equal(JSON.stringify(invalid),before);assert.deepEqual(invalidRng.snapshot(),invalidPosition);
}

// Model the real host's queued state copy: future accepted draws cannot mutate
// the state/trace belonging to an earlier event which is still animating.
const queueRng=random(17);let previous=K.create({rng:queueRng,bet:5,rate:90});
for(let turn=0;turn<8;turn++){
 const saved=JSON.stringify(previous),next={...previous,drawn:previous.drawn.slice()},number=previous.numbers[turn%15];
 K.draw(next,number,queueRng);assert.equal(JSON.stringify(previous),saved,'an enqueued native state never changes its previous board, numbers or counters');previous=next;
}

// Saved pre-v232 first-payment thresholds survive a JSON checkpoint and the
// exact RNG cursor; a fresh constructor's default 120 must not leak into it.
for(const first of [80,220]){
 const legacy=replayPopcornFixture('clear-ladder',{bet:5,firstPopAward:first}),step=legacy.steps[4];
 const restored=plain(step.before),rng=random(legacy.seed,step.rngBefore),trace=K.draw(restored,step.number,rng);
 assert.deepEqual(restored,step.after);assert.deepEqual(plain(trace),step.trace);assert.deepEqual(rng.snapshot(),step.rngAfter);
 assert.equal(restored.firstPopAward,first);assert.equal(restored.win,independentPayout(restored.popped,restored.clears,5,first));
}
console.log('POPCORN_V299_RULES_PASS',JSON.stringify({sourceSha256:BASELINE_CORE_SHA256,geometry:[61,15,6],fixtures:fixtures.length,nativeDraws:24,
 payoutChecks,rngOpening:27,rounding5:{pop:[5,4],thirdClear:[105,104]},allSixGrades:rainbow.steps[2].oracle.grades,legacyThresholds:[80,220],maxBoostLevel:boost.level}));

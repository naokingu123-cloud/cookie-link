import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const ctx=vm.createContext({console});
vm.runInContext(await fs.readFile(new URL('../assets/dango-bingo-rules.js',import.meta.url),'utf8'),ctx);
const R=ctx.DangoBingoRules,P=value=>JSON.parse(JSON.stringify(value));
assert.equal(R.REVISION,288);assert.equal(R.legacy287.REVISION,287);
assert.equal(R.legacy285.REVISION,285);
assert.deepEqual(P([2,3,4,5,6,7].map(l=>R.tiers[l].slice(1))),[
 [0,20,2000],[20,100,3000],[50,400,10000],
 [100,5000,100000],[300,20000,200000],[500,50000,0]
]);
assert.equal(R.payRows.find(x=>x.length===7&&x.count===3).possible,false);
assert.ok(R.payRows.filter(x=>x.possible).every(x=>x.hundredths<=200000));

const expectedMax=[21978554300400,172980567455400,33170259982100];
const expectedUniform=[2294536465100,17005375295300,5038129059000];
for(let i=0;i<3;i++){
 assert.equal(R.molds[i].automaticNumerator,expectedMax[i]);
 assert.equal(R.molds[i].uniformNumerator,expectedUniform[i]);
}
for(let rate=50;rate<=150;rate++){
 const c=R.calibrationForTarget(rate);
 assert.ok(Math.abs(c.automaticReturnPercent-rate)<1e-10,'target '+rate);
 assert.deepEqual(P(c.weights.map(x=>x.weight)),[.650,.015,.335]);
 assert.ok(c.maxPolicyProbability>=0&&c.maxPolicyProbability<=1);
}
for(const rate of [50,90,150]){
 const c=R.calibrationForTarget(rate);
 assert.ok(c.minimumReturnPercent<50&&c.maximumReturnPercent>150);
 assert.ok(c.maxPolicyProbability>0&&c.maxPolicyProbability<1);
}

// Policies are decided before the first physical ball and survive serialization.
for(const moldIndex of [0,1,2])for(const placementPolicy of ['max','uniform']){
 let s=R.create({moldIndex,placementPolicy,seed:28800+moldIndex});
 assert.equal(s.rulesRevision,288);assert.equal(s.placementPolicy,placementPolicy);
 for(const n of s.triggerNumbers.slice(0,3).concat([1,2,3,4,5].filter(n=>!s.triggerNumbers.includes(n)).slice(0,2))){
  s=R.draw(s,n);assert.ok(s);
 }
 assert.equal(s.phase,'placing');assert.equal(s.freeBudget,4);
 const prior=JSON.stringify(s),a=R.autoPlace(s),b=R.autoPlace(s);
 assert.equal(JSON.stringify(s),prior);
 assert.deepEqual(P(a.manualFreeCells),P(b.manualFreeCells));
 assert.equal(a.manualFreeCells.length,4);
 assert.equal(a.placementPolicy,placementPolicy);
 assert.equal(R.commitFree(a,{autoFill:false}).phase,'draw-final');
}
// Verify uniform AUTO uses the published first-five-only unsigned hash.
const bits=a=>a.reduce((m,i)=>m|(1<<i),0);
let state=R.create({moldIndex:0,placementPolicy:'uniform',numbers:Array.from({length:25},(_,i)=>i+1),triggerCells:[1,2,3]});
for(const n of [1,2,3,4,5])state=R.draw(state,n);
const initial=bits(state.initialFreeCells),early=bits(state.hitCells);
let expected=[],remaining=R.availableCenters(state);
for(let step=0;step<4;step++){
 const salt=(Math.imul(initial,2654435761)^Math.imul(early,2246822519)^Math.imul(step,3266489917))>>>0;
 const chosen=remaining[salt%remaining.length];expected.push(chosen);remaining=remaining.filter(x=>x!==chosen);
}
const auto=R.autoPlace(state);assert.deepEqual(P(auto.manualFreeCells),expected);
assert.equal(R.autoPlace(state).totalHundredths,auto.totalHundredths);
assert.equal(R.draw(state,state.numbers[6]),null,'sixth ball cannot be drawn before placement');
for(const revision of [285,287]){
 const opts={rulesRevision:revision,seed:28811,target:90};
 const old=R.create(opts),historical=revision===285?R.legacy285:R.legacy287;
 assert.deepEqual(P(old),P(historical.create(opts)));
 for(let i=1,round=old;i<=5;i++)round=R.draw(round,round.numbers.find(n=>n>0&&!round.draws.includes(n)));
}
console.log('DANGO_V288_RULES_PASS',JSON.stringify({revision:R.REVISION,moldPolicyProfiles:6,calibratedSettings:101,payoutBaseMaximum:2000,legacy:[285,287],uniformDeterministic:true}));

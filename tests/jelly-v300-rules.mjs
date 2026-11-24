/* Independent native-state invariants for the v300 presentation-only release.
 * Real rounds, not edited boards, supply every award and recipe witness. */
import assert from 'node:assert/strict';
import {
 BASELINE_CORE_SHA256,BASELINE_HOST_SHA256,nativeCore,nativeHost,sha256,plain,
 loadJelly,random,serializeJellyState,reviveJellyState,serializeJellyTrace,
 ORACLE_LINES,ORACLE_EDGES,ORACLE_MOLDS,RECIPES,CURRENT_AWARDS,LEGACY_AWARDS,
 independentWeights,independentHundredths,independentPayout,independentStep,
 verifyNativeOpening,verifyNativeStep,buildJellyFixtures,replayJellyFixture,enumerateOpeningBounds
} from './jelly-v300-fixtures.mjs';

assert.equal(sha256(nativeCore()),BASELINE_CORE_SHA256,'the approved native core is byte-identical');
assert.equal(sha256(nativeHost()),BASELINE_HOST_SHA256,'input, clocks, settlement and save host stay byte-identical');
const K=loadJelly(nativeCore(),{forbidAmbientRandom:true});
assert.equal(K.PAYOUT_VERSION,232);assert.deepEqual(K.LINES,ORACLE_LINES);
assert.equal(ORACLE_EDGES.length,40);assert.equal(new Set(ORACLE_EDGES.flatMap(p=>p)).size,25);
for(const [a,b] of ORACLE_EDGES)assert.equal(Math.abs(a%5-b%5)+Math.abs(Math.floor(a/5)-Math.floor(b/5)),1);

// Return targets select geometric molds, never a new payment schedule. The
// independent maximum-entropy weights solve the mean-return constraint with
// a different iteration budget from the production selector.
let openingChecks=0;
for(const requested of [0,49,50,75,90,110,150,151,'90',undefined]){
 const target=Math.min(150,Math.max(50,Number(requested)||90)),weights=independentWeights(requested),balance=K.balance(requested);
 assert.equal(balance.target,target);assert.equal(balance.freeCount,4);assert.equal(balance.method,'exact-uniform-8-of-25');
 assert(Math.abs(weights.reduce((sum,w)=>sum+w,0)-1)<1e-12);
 assert(Math.abs(weights.reduce((sum,w,i)=>sum+w*ORACLE_MOLDS[i].returnPercent,0)-target)<1e-9);
 assert(Math.abs(balance.returnPercent-target)<1e-9);
 for(const seed of [1,2,3,5,13,88,1088,1314]){
  const rng=random(seed),state=K.create({rng,rate:requested});verifyNativeOpening(state,seed,requested,rng.snapshot());
  assert.equal(state.seeds.length,4);assert.equal(state.colors.filter(Boolean).length,4);
  assert.deepEqual([...state.numbers].sort((a,b)=>a-b),Array.from({length:25},(_,i)=>i+1));
  assert.equal(state.open.size,0);assert.equal(state.lines.length,0);openingChecks++;
 }
}

let payoutChecks=0;
for(const version of [0,231,232,233])for(const odds of [1,1.5,2,2.5])for(const bet of [5,100,3000,300000])for(let count=0;count<=12;count++){
 assert.equal(K.payout(count,odds,version),independentHundredths(count,odds,version));
 assert.equal(Math.floor(bet*K.payout(count,odds,version)/100),independentPayout(count,odds,bet,version));payoutChecks++;
}
assert.deepEqual(Array.from({length:13},(_,count)=>K.payout(count)),CURRENT_AWARDS);
assert.deepEqual(Array.from({length:13},(_,count)=>K.payout(count,1,0)),LEGACY_AWARDS);

const fixtures=buildJellyFixtures(),byId=Object.fromEntries(fixtures.map(f=>[f.id,f]));
const pinned={
 'all-line':['bb1fe71346c16707ba704845d57d42635d12a45043518cb4207df45a995cac20','c0f97a97bf98e6c89326888652c62e4c65e7f30f191e0098d9ea073692531fe5',[0,0,0,1,6,8,10,12]],
 'ten-line-odds':['bb1fe71346c16707ba704845d57d42635d12a45043518cb4207df45a995cac20','6442a61a67247bd59aea6c6add91f9e0a9b154477b7f8f6e9e5a48294e442276',[0,0,0,1,6,8,10,10]],
 'low-bet':['84a57025577f4722733c1a2a900ccf2316c6c3d55d0167b3a36bec32a68602a0','df6b6469abc7dcba462d6698824c3026e2869c05b2da1265d15759e1b8cea2c4',[0,0,0,0,1,1,1,2]],
 'four-color-odds':['b68806ba222819d9b4a2b547edec95a6e123f249ca83c5b2467e24ac5e4d5871','cba5bd34d013d80ba12a3d482eba0ebe39c2534169727e368262cedfd97e64c6',[0,1,1,1,2,2,2,2]],
 'multi-line':['6281706353ec51a6c2db17e5650a17305924109dc6f58ec8fc7ae9a45612b7ad','38685516263d8d8e731eb914df1edae28e156fc9f75f8018fc67fc00db11af2c',[0,0,1,1,3,4,4,4]]
};
for(const fixture of fixtures){
 const [initial,final,lines]=pinned[fixture.id];
 assert.equal(sha256(JSON.stringify(fixture.initial)),initial);assert.equal(sha256(JSON.stringify(fixture.steps.at(-1).after)),final);
 assert.deepEqual(fixture.steps.map(s=>s.oracle.totalLines),lines);assert.equal(new Set(fixture.draws).size,8);
 assert.deepEqual(fixture.rngFinal,fixture.rngInitial);assert.equal(fixture.rngFinal.calls,27);
 const last=reviveJellyState(fixture.steps.at(-1).after),saved=serializeJellyState(last);
 for(const number of last.numbers)assert.equal(K.draw(last,number),null,'a ninth ball is never accepted');
 assert.deepEqual(serializeJellyState(last),saved);
 // The settled eighth board deliberately retains hypothetical reach previews,
 // using the eighth ingredient; this is not permission for a ninth draw.
 for(const number of last.numbers){
  const preview=K.preview(last,number);
  if(last.draws.includes(number)){assert.equal(preview,null);continue;}
  const projected=independentStep({...saved,draws:saved.draws.slice(0,7)},number,fixture.bet);
  assert.deepEqual(preview,{lines:projected.totalLines,oddsReason:projected.oddsReason,oddsMultiplier:projected.oddsMultiplier,totalHundredths:projected.totalHundredths});
  assert.deepEqual(serializeJellyState(last),saved);
 }
}
const full=byId['all-line'].steps.at(-1),ten=byId['ten-line-odds'].steps.at(-1),low=byId['low-bet'];
assert.deepEqual(full.before,ten.before,'the 12-line and odds-only cases differ only at the final legal input');
assert.deepEqual([full.oracle.totalLines,full.oracle.wetCells,full.oracle.oddsMultiplier,full.oracle.payoutWin],[12,25,1,90000000]);
assert.deepEqual([ten.oracle.totalLines,ten.oracle.newLineCount,ten.oracle.oddsMultiplier,ten.oracle.payoutWin],[10,0,1.5,36000000]);
assert.equal(ten.oracle.award,false);assert.equal(ten.oracle.oddsReason,'color');
assert.deepEqual([low.steps[4].oracle.totalHundredths,low.steps[4].oracle.payoutWin,low.steps[4].oracle.award],[16,0,true],'a genuine 0 WIN line remains an award');
assert.deepEqual([low.steps[6].oracle.payoutWin,low.steps[6].oracle.award,low.steps[6].oracle.oddsReason],[1,false,'color']);
assert.deepEqual([low.steps[7].oracle.payoutWin,low.steps[7].oracle.previousTotalWin,low.steps[7].oracle.deltaWin,low.steps[7].oracle.award],[1,1,0,true],'retained total is 1 WIN even when its increment is 0');
assert.deepEqual(byId['multi-line'].steps[4].trace.newLines,[1,6]);
assert.deepEqual(byId['four-color-odds'].steps.slice(5).map(s=>s.after.oddsMultiplier),[1.5,2,2.5]);

// All fifteen ingredient subsets are witnessed by unmodified create/draw.
const recipes=new Map();let recipeDraws=0;
for(const seed of [1,2,3,5,13,15,88,213,1088]){
 const f=replayJellyFixture({id:'recipes-'+seed,seed,rate:90,bet:5,draws:[1,2,3,4,5,6,7,8],focusTurns:[]});
 for(const step of f.steps){recipeDraws++;for(const recipe of step.after.colors.filter(Boolean))if(!recipes.has(recipe))recipes.set(recipe,{seed,ball:step.ball});}
}
assert.deepEqual([...recipes.keys()].sort(),[...RECIPES].sort());

// An invalid or repeated input and every preview leave state and RNG alone.
const invalidRng=random(1909),invalid=K.create({rng:invalidRng}),beforeInvalid=serializeJellyState(invalid),position=invalidRng.snapshot();
for(const number of [undefined,null,'1',-1,0,26,1.5,NaN,Infinity]){
 assert.equal(K.draw(invalid,number),null);assert.equal(K.preview(invalid,number),null);
 assert.deepEqual(serializeJellyState(invalid),beforeInvalid);assert.deepEqual(invalidRng.snapshot(),position);
}
for(const number of invalid.numbers){K.preview(invalid,number);K.previewLines(invalid,number);assert.deepEqual(serializeJellyState(invalid),beforeInvalid);assert.deepEqual(invalidRng.snapshot(),position);}
const one=K.draw(invalid,1).state,savedOne=serializeJellyState(one);
assert.equal(K.draw(one,1),null);assert.equal(K.preview(one,1),null);assert.deepEqual(serializeJellyState(one),savedOne);

// Real queue/checkpoint boundaries must retain the exact Set contents, old
// table version, colors, earlier trace and random cursor. No fresh default may
// overwrite a saved pre-v232 paytable.
let saveChecks=0;
for(const mode of [{legacyCheckpoint:true},{payoutVersion:231},{payoutVersion:232}]){
 const f=replayJellyFixture('low-bet',mode);
 for(const step of f.steps){
  const restored=reviveJellyState(plain(step.before)),previous=serializeJellyState(restored),rng=random(f.seed,step.rngBefore),next=K.draw(restored,step.number);
  assert.deepEqual(serializeJellyState(next.state),step.after);assert.deepEqual(serializeJellyTrace(next.trace),step.trace);assert.deepEqual(serializeJellyState(restored),previous);
  assert.deepEqual(rng.snapshot(),step.rngAfter);assert.equal(next.state.payoutVersion,mode.legacyCheckpoint?undefined:mode.payoutVersion);
  assert.equal(K.payout(next.state.lines.length,next.state.oddsMultiplier,next.state.payoutVersion??0),step.oracle.totalHundredths);
  assert.equal(next.trace.before,restored);assert.equal(next.state.open===restored.open,step.ball>5,'only the first five inputs can alter partitions');saveChecks++;
 }
 if(mode.legacyCheckpoint||mode.payoutVersion<232)assert.deepEqual(f.steps.filter(s=>s.oracle.award).map(s=>s.oracle.totalHundredths),[20,45]);
}

// Every first-five subset is enumerated with DSU, not a Monte Carlo estimate.
// The only mold that can fill the board has exactly three dry sections left;
// all three later pours must fill new sections, so current full12 has ODDS1.0.
const bounds=enumerateOpeningBounds();assert.equal(bounds.combinations,53130);assert.deepEqual(bounds.minima.map(m=>m.minDry),[5,5,4,4,4,3]);
assert.equal(sha256(nativeCore()),BASELINE_CORE_SHA256);assert.equal(sha256(nativeHost()),BASELINE_HOST_SHA256);
console.log('JELLY_V300_RULES_PASS',JSON.stringify({coreSha256:BASELINE_CORE_SHA256,hostSha256:BASELINE_HOST_SHA256,
 geometry:{cells:25,partitions:40,lines:12},fixtures:fixtures.length,nativeFixtureDraws:40,openingChecks,payoutChecks,recipeDraws,recipeWitnesses:Object.fromEntries(recipes),
 saveChecks,rngOpening:27,rngPerDraw:0,full12:{win:90000000,odds:1,ball:8},tenLineOddsWin:36000000,lowBet:[0,1,0],openingBounds:bounds.minima.map(m=>({name:m.name,minDry:m.minDry})),enumeratedOpenings:bounds.combinations}));

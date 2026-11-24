/* Native invariants for a presentation-only Waffle release. Real generated
 * openings and actual legal draws supply every round/award fixture. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
 BASELINE_CORE_SHA256,BASELINE_HOST_SHA256,BASELINE_POW_PREFIX_SHA256,nativeCore,nativeHost,nativePow,nativePowPrefix,sha256,plain,
 loadWaffle,loadWaffleRuntime,random,BASE_RACK,TOP_PRIZES,REVERSAL_BONUS,ORACLE_MOLDS,clampTarget,independentWeights,independentMove,
 verifyNativeOpening,verifyNativeStep,buildWaffleFixtures,replayWaffleFixture,topPrize
} from './waffle-v301-fixtures.mjs';

assert.equal(sha256(nativeCore()),BASELINE_CORE_SHA256,'native geometry, RNG and base rule source stay byte-identical');
assert.equal(sha256(nativeHost()),BASELINE_HOST_SHA256,'input, worker clock, Sugar, checkpoint and settlement host stay byte-identical');
assert.equal(sha256(nativePowPrefix()),BASELINE_POW_PREFIX_SHA256,'the actual v232 rule wrapper stays byte-identical; only later UI may change');
const {R,window}=loadWaffleRuntime();
assert.equal(R.sweepBonusHundredths,REVERSAL_BONUS);assert.equal(R.sugarFlips,8);
assert.deepEqual(plain(R.payRows),BASE_RACK.slice(1).map((hundredths,i)=>({count:i+1,hundredths})));
assert.deepEqual(plain(R.topRefills),Array.from({length:64},(_,i)=>topPrize(i)));
for(let grade=0;grade<96;grade++)assert.equal(R.topPrizeHundredths(grade),topPrize(grade));
for(let count=0;count<=63;count++)assert.equal(R.award(count,BASE_RACK),BASE_RACK[Math.min(count,13)]);
assert.deepEqual(TOP_PRIZES,[2000,2500,3000,4000,5000,7500,10000]);

let openingChecks=0;const seenMolds=new Set(),powBySeed=new Map();
for(const requested of [undefined,null,0,49,50,75,90,'90',110,150,151,Infinity]){
 const target=clampTarget(requested),weights=independentWeights(requested),balance=R.balance(requested);
 assert.equal(window.WafflePowV159.expectedPowCount(requested),.95);
 assert(Math.abs(balance.totalPercent-target)<1e-8);assert.equal(balance.bonusHundredths,REVERSAL_BONUS);assert.equal(balance.powExpected,.95);
 assert(Math.abs(weights.reduce((a,b)=>a+b,0)-1)<1e-12);
 assert(Math.abs(weights.reduce((sum,w,i)=>sum+w*(ORACLE_MOLDS[i].normal+ORACLE_MOLDS[i].events/ORACLE_MOLDS[i].orders*REVERSAL_BONUS),0)-target)<1e-9);
 for(const seed of [1,7,38,100,790,1359,1641,1817,1906,1934,1947]){
  const rng=random(seed),state=R.create({target:requested,rng});verifyNativeOpening(state,seed,requested,rng.snapshot());seenMolds.add(state.patternName);openingChecks++;
  const saved=plain(state),schedule=plain(state.powTurns);
  if(powBySeed.has(seed))assert.deepEqual(schedule,powBySeed.get(seed),'POW schedule and selection probability are independent of RTP target');else powBySeed.set(seed,schedule);
  assert.equal(state.colors.filter(Boolean).length,44);assert.equal(state.numbers.filter(n=>n!==null).length,20);assert.equal(state.offBoardNumbers.length,5);
  assert.deepEqual([...state.numbers.filter(n=>n!==null),...state.offBoardNumbers].sort((a,b)=>a-b),Array.from({length:25},(_,i)=>i+1));
  assert([0,1].includes(schedule.filter(Boolean).length));
  for(let i=0;i<64;i++){
   assert.equal(state.colors[i],state.colors[Math.floor(i/8)*8+7-i%8]);assert.equal(state.colors[i],state.colors[(7-Math.floor(i/8))*8+i%8]);
   assert.equal(state.numbers[i]!==null,state.colors[i]===null);
  }
  for(let row=0;row<8;row++)assert([2,4].includes(state.numbers.slice(row*8,row*8+8).filter(n=>n!==null).length));
  for(let col=0;col<8;col++)assert([2,4].includes(state.numbers.filter((n,i)=>i%8===col&&n!==null).length));
  for(let q=0;q<4;q++)assert.equal(state.numbers.filter((n,i)=>n!==null&&Math.floor(i%8/4)+Math.floor(i/32)*2===q).length,5);
  for(let number=1;number<=25;number++){
   const prediction=R.project(state,number),oracle=independentMove(saved,number);assert(prediction&&oracle);
   assert.deepEqual(plain(prediction.flipped),oracle.flipped);assert.deepEqual(plain(prediction.counts),oracle.counts);
  }
  assert.deepEqual(plain(state),saved);assert.equal(rng.snapshot().calls,35);
 }
}
assert.deepEqual([...seenMolds].sort(),ORACLE_MOLDS.map(m=>m.name).sort());

const fixtures=buildWaffleFixtures(),byId=Object.fromEntries(fixtures.map(f=>[f.id,f]));
const pinned={
 'carry-seven':{flips:[0,0,0,0,1,0,2,2],total:100,win:7},
 'zero-one':{flips:[0,0,0,0,1,0,2,2],total:100,win:1},
 'pow-middle':{flips:[0,1,3,0,0,0,0,0],total:60,win:4},
 'pow-lower':{flips:[0,0,2,0,3,0,0,1],total:80,win:2400},
 'black-reversal':{flips:[0,0,2,0,4,0,6,0],total:300320,win:900960000},
 'white-reversal':{flips:[0,5,0,5,0,3,0,2],total:300260,win:9007800},
 'no-pow-half':{flips:[0,0,1,0,5,2,4,3],total:410,win:20}
};
let savedChecks=0,previewChecks=0,timingChecks=0;
const view=fs.readFileSync(new URL('../assets/bingo-stick-view.js',import.meta.url),'utf8'),motionStart=view.indexOf('function motion('),motionEnd=view.indexOf('function texture(',motionStart);
assert(motionStart>=0&&motionEnd>motionStart);
const motion=new Function('const clamp=x=>Math.max(0,Math.min(1,x));'+view.slice(motionStart,motionEnd)+';return motion;')();
for(const f of fixtures){
 const p=pinned[f.id];assert.deepEqual(f.steps.map(s=>s.oracle.flips),p.flips);assert.equal(f.steps.at(-1).after.totalHundredths,p.total);assert.equal(f.steps.at(-1).oracle.totalWin,p.win);
 assert.equal(f.opening.patternForced,false);assert.deepEqual(f.rngFinal,f.rngInitial);assert.equal(f.rngFinal.calls,35);
 for(const step of f.steps){
  const restored=plain(step.before),old=plain(restored),rng=random(f.seed,step.rngBefore),next=R.draw(restored,step.number);
  verifyNativeStep(old,plain(next),step.number,step.rngBefore,rng.snapshot(),f.bet);assert.deepEqual(plain(next),step.after);assert.deepEqual(restored,old);savedChecks++;
  // Exact sharing is intentional for off-board/zero-flip paths, and cannot
  // turn an immutable previous board into an animation target for later draws.
  assert.equal(next.colors===restored.colors,step.oracle.origin<0);assert.equal(next.rack===restored.rack,step.oracle.rows.length===0);
  assert.equal(next.lastRack,restored.rack);assert.equal(next.bonusEvents===restored.bonusEvents,!step.oracle.reversalThisMove);
  const o=step.oracle;
  for(let number=1;number<=25;number++){
   const projected=R.project(restored,number),expected=independentMove(old,number);
   if(!expected){assert.equal(projected,null);continue;}
   for(const key of ['placed','flipped','flipSteps','counts','lastFlips','lastBaseHundredths','lastReversal'])assert.deepEqual(plain(projected[key]),plain(expected[key]));
   assert.deepEqual(plain(projected.lastKnockRows),expected.knockRows);previewChecks++;
  }
  assert.deepEqual(restored,old);assert.deepEqual(rng.snapshot(),step.rngBefore);
  assert.equal(motion(step.after,0).duration,o.nativeDuration);assert.equal(motion(step.after,0).active,o.nativeDuration>0);
  for(const age of [0,90,179,180,o.lastFlipAt,o.delay,o.rankStart-.01,o.rankStart,o.dropStart-.01,o.dropStart,o.land-.01,o.land,o.nativeDuration]){
   const m=motion(step.after,age);assert.equal(m.duration,o.nativeDuration);assert.equal(m.active,age<o.nativeDuration);
   assert(m.beat>=0&&m.beat<=o.flips);timingChecks++;
  }
  if(o.flips){assert.equal(motion(step.after,o.delay).beat,o.flips);assert.equal(motion(step.after,o.rankStart-.01).rankStep,0);assert.equal(motion(step.after,o.rankStart).rankStep,1);
   assert.equal(motion(step.after,o.dropStart).rankStep,2);assert.equal(motion(step.after,o.land).rankStep,3);}
  assert.equal(step.after.phase,step.ball===8?'done':'playing');assert.equal(o.sugarCollected,step.ball===8&&o.sugarEligible);
 }
 const final=plain(f.steps.at(-1).after),saved=plain(final);
 for(let number=1;number<=25;number++)assert.equal(R.draw(final,number),null,'the ninth draw is always rejected');
 assert.deepEqual(final,saved);
}
const carry=byId['carry-seven'],zero=byId['zero-one'],middle=byId['pow-middle'].steps[2],lower=byId['pow-lower'].steps[7],black=byId['black-reversal'].steps[6],white=byId['white-reversal'].steps[7];
assert.deepEqual(carry.steps.filter(s=>s.oracle.award).map(s=>[s.oracle.gain,s.oracle.deltaWin,s.oracle.independentlyRoundedGain]),[[20,1,1],[40,3,2],[40,3,2]]);
assert.deepEqual(zero.steps.filter(s=>s.oracle.award).map(s=>[s.oracle.gain,s.oracle.deltaWin,s.oracle.independentlyRoundedGain]),[[20,0,0],[40,0,0],[40,1,0]]);
assert.deepEqual([middle.oracle.rows,middle.oracle.oldGrade,middle.oracle.grade,middle.oracle.baseGainHundredths,middle.oracle.deltaWin],[[4,3,2],1,4,40,3]);
assert.deepEqual([lower.oracle.rows,lower.oracle.oldGrade,lower.oracle.grade,lower.oracle.baseGainHundredths],[[2,1],2,4,20]);
assert.equal(middle.oracle.baseGainHundredths,middle.before.rack[3]);assert.notEqual(middle.oracle.baseGainHundredths,middle.oracle.rows.reduce((sum,row)=>sum+middle.before.rack[row],0));
assert.deepEqual([black.oracle.color,black.oracle.counts.white,black.oracle.bonusGainHundredths,black.oracle.deltaWin,black.oracle.sugarCollected],['black',0,300000,900600000,false]);
assert.deepEqual([white.oracle.color,white.oracle.counts.black,white.oracle.bonusGainHundredths,white.oracle.sugarCollected],['white',0,300000,true]);
const offboard=byId['black-reversal'].steps[3];assert.deepEqual([offboard.oracle.origin,offboard.oracle.pow,offboard.oracle.rows,offboard.oracle.award,offboard.oracle.nativeDuration],[-1,true,[],false,0]);
assert.equal(byId['black-reversal'].steps[7].oracle.reversalThisMove,false);assert.equal(byId['black-reversal'].steps[7].oracle.highestRole,true);
assert.equal(byId['no-pow-half'].initial.powTurns.some(Boolean),false);assert.equal(byId['no-pow-half'].steps[6].oracle.baseGainHundredths,150);
assert.equal(byId['no-pow-half'].steps.reduce((sum,s)=>sum+s.oracle.deltaWin,0),20);

// Every thirteen-row preview uses the existing fractional total, exactly as
// the native turn receipts do. These are arithmetic checks, not invented
// reachable high-flip artwork cases.
let tableChecks=0;
for(const f of fixtures)for(const step of f.steps)for(let row=1;row<=13;row++){
 const baseline=step.before.totalHundredths,amount=step.before.rack[row];
 const expected=Math.floor(f.bet*(baseline+amount)/100)-Math.floor(f.bet*baseline/100);
 assert(Number.isSafeInteger(expected)&&expected>=0);assert.equal(Math.floor(f.bet*(baseline+R.award(row,step.before.rack))/100)-Math.floor(f.bet*baseline/100),expected);tableChecks++;
}
const prefix=nativePowPrefix(),rowsStart=prefix.indexOf(' function knockRowsFor('),rowsEnd=prefix.indexOf(' function project(',rowsStart);
const knockRows=new Function(prefix.slice(rowsStart,rowsEnd)+';return knockRowsFor;')();
assert.deepEqual(knockRows(0,true),[]);assert.deepEqual(knockRows(1,true),[2,1]);assert.deepEqual(knockRows(13,true),[13,12]);
for(let row=1;row<=13;row++){
 assert.deepEqual(knockRows(row,false),[row]);assert.deepEqual(knockRows(row,true),Array.from({length:13},(_,i)=>13-i).filter(i=>Math.abs(i-row)<=1));
}

const invalidRng=random(23),invalid=R.create({rng:invalidRng}),beforeInvalid=plain(invalid),cursor=invalidRng.snapshot();
for(const number of [undefined,null,'1',-1,0,26,1.5,NaN,Infinity]){assert.equal(R.draw(invalid,number),null);assert.equal(R.project(invalid,number),null);assert.deepEqual(plain(invalid),beforeInvalid);assert.deepEqual(invalidRng.snapshot(),cursor);}
const played=R.draw(invalid,1),oldPlayed=plain(played);assert.equal(R.project(played,1),null);assert.equal(R.draw(played,1),null);assert.deepEqual(plain(played),oldPlayed);

// Installation on an actual in-flight checkpoint retains the saved rack,
// chosen mold, numbers, draw order and valid POW schedule without any RNG.
let installSaveChecks=0;
for(const f of fixtures)for(const step of f.steps.slice(0,7)){
 const saved=plain(step.after),runtime=loadWaffleRuntime({checkpoint:saved}),restored=plain(runtime.engine.state);
 assert.deepEqual(restored,{...saved,lastPowActive:false,lastHammerRange:0,lastKnockRows:[],lastPowerGain:false});
 const nextNumber=f.draws[step.ball],next=runtime.R.draw(runtime.engine.state,nextNumber);assert.deepEqual(plain(next),f.steps[step.ball].after);installSaveChecks++;
}
// A checkpoint predating the saved POW field follows the old wrapper's
// existing eight-roll schedule initialization, once, rather than being
// silently re-created from a new mold/number shuffle.
const oldCheckpoint=plain(carry.steps[1].after);delete oldCheckpoint.powTurns;
const restoreRng=random(77),restored=loadWaffleRuntime({checkpoint:oldCheckpoint,ambientRng:restoreRng});
assert.equal(restoreRng.snapshot().calls,8);assert.deepEqual(plain(restored.engine.state.numbers),oldCheckpoint.numbers);assert.deepEqual(plain(restored.engine.state.rack),oldCheckpoint.rack);
assert.deepEqual(plain(restored.engine.state.turnTotals),oldCheckpoint.turnTotals);assert([0,1].includes(restored.engine.state.powTurns.filter(Boolean).length));
const beforeRestoreDraw=restoreRng.snapshot();restored.R.draw(restored.engine.state,3);assert.deepEqual(restoreRng.snapshot(),beforeRestoreDraw);

const appSource=fs.readFileSync(new URL('../optimized/app-01.js',import.meta.url),'utf8');
assert(appSource.includes('>1 BET</button>'));assert(appSource.includes('s.oneBet.onclick=()=>app.setBet(i,app.bets[i]+1)'),'BET 1/7 fixtures are permitted by the actual one-BET UI');
assert.equal(sha256(nativeCore()),BASELINE_CORE_SHA256);assert.equal(sha256(nativeHost()),BASELINE_HOST_SHA256);assert.equal(sha256(nativePowPrefix()),BASELINE_POW_PREFIX_SHA256);
console.log('WAFFLE_V301_RULES_PASS',JSON.stringify({coreSha256:BASELINE_CORE_SHA256,hostSha256:BASELINE_HOST_SHA256,powPrefixSha256:BASELINE_POW_PREFIX_SHA256,
 fixtures:fixtures.length,nativeFixtureDraws:fixtures.reduce((n,f)=>n+f.steps.length,0),openingChecks,molds:[...seenMolds],savedChecks,installSaveChecks,previewChecks,timingChecks,tableChecks,
 geometry:{cells:64,initialPieces:44,boardNumbers:20,offBoardNumbers:5,paidRows:13},rngOpening:35,rngPerDraw:0,lowBetZero:[0,0,1],carrySeven:[1,3,3],reversalEventWin:900600000,
 boundaryCoverage:{reachablePow:[1,3],topRow13:'arithmetic helper only; no reachability claim'},sugarOnlyAtFinal:true}));

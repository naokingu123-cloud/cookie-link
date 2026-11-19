/* v254 randomized initial layouts, exact calibration vectors, independent
   highest-role geometry, and continuation of genuine revision253 snapshots. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const context=vm.createContext({Math,console});
vm.runInContext(read('assets/dango-bingo-rules.js'),context);
// This suite validates saved v254 rules; v262 has its own geometry/calibration tests.
const R=context.DangoBingoRules.legacy254,plain=value=>JSON.parse(JSON.stringify(value));
const calibration=JSON.parse(read('docs/dango-v254-calibration.json'));
const saved253=JSON.parse(read('tests/dango-v253-checkpoints.json'));
const identity=Array.from({length:25},(_,i)=>i+1),decode=mask=>R.helpers.idsOf(mask);
const create=initialFreeCells=>R.create({moldIndex:0,initialFreeCells,numbers:identity});
const hit=(state,numbers)=>numbers.reduce((s,n)=>{const next=R.draw(s,n);assert(next);return next;},state);
const mask=ids=>ids.reduce((m,id)=>m|(1<<id),0);
const oldFields=(actual,expected)=>Object.fromEntries(Object.keys(expected).filter(key=>key!=='highestRole').map(key=>[key,plain(actual)[key]]));
const oldExpected=expected=>Object.fromEntries(Object.entries(expected).filter(([key])=>key!=='highestRole'));

assert.equal(R.REVISION,254);
assert.equal(calibration.rulesRevision,254);
assert.equal(crypto.createHash('sha256').update(read(calibration.reproduction.source)).digest('hex'),calibration.reproduction.sourceSha256);
assert.deepEqual(plain(R.tiers),plain(R.legacy253.tiers),'v254 leaves every v253 payout tier unchanged');
assert.deepEqual(plain(R.highestRoleMinimums),{3:4,4:3,5:2,7:1,9:1});
assert(Object.isFrozen(R.highestRoleMinimums));
for(const [length,threshold] of [[3,4],[4,3],[5,2],[7,1],[9,1]]){
  assert.equal(R.isHighestRole(length,threshold-1),false);
  assert.equal(R.isHighestRole(length,threshold),true);
  assert.equal(R.isHighestRole(length,threshold+1),true);
}
assert.equal(R.isHighestRole(6,99),false);

// Read integer numerators from the separately compiled exhaustive enumerator,
// not from the JS aggregate rates. Every mirrored variant has the same EV and
// the same canonicalized simple-auto policy under reflection.
const exactByMask=new Map();
let currentCppVectors=0,mirroredCppVectors=0;
for(const layout of calibration.exactLayoutEnumerations){
  const e=layout.enumeration,initial=layout.initialCellsZeroBased;
  assert.equal(e.firstFiveSets,53130);assert.equal(e.outcomeDenominator,60568200);
  assert.equal(e.initialFreeMask,mask(initial));
  assert.equal(e.symmetryReduced,R.helpers.reflect(e.initialFreeMask)===e.initialFreeMask);
  exactByMask.set(e.initialFreeMask,e);exactByMask.set(R.helpers.reflect(e.initialFreeMask),e);
  const orientations=R.helpers.reflect(e.initialFreeMask)===e.initialFreeMask?[false]:[false,true];
  for(const reflected of orientations)for(const v of e.crossLanguageVectors){
    const transform=m=>reflected?R.helpers.reflect(m):m;
    let s=create(decode(transform(e.initialFreeMask)));
    s=hit(s,decode(transform(v.firstFiveMask)).map(id=>id+1));
    assert.equal(s.freeBudget,v.budget);
    s=R.autoPlace(s);assert.equal(s.manualMask,transform(v.manualMask));
    s=R.commitFree(s,{autoFill:false});
    s=hit(s,decode(transform(v.lastThreeMask)).map(id=>id+1));
    assert.equal(s.oddsMultiplier,v.multiplier);assert.equal(s.totalHundredths,v.hundredths);
    assert.equal(s.rulesRevision,254);
    if(reflected)mirroredCppVectors++;else currentCppVectors++;
  }
}
assert.equal(currentCppVectors,210);
const support={1:new Set(),2:new Set(),3:new Set()};
for(const m of R.molds){
  let optimal=0,automatic=0;
  assert.equal(m.layoutCount,m.variants.length);
  for(const variant of m.variants){
    const initial=variant.initialFreeCells,e=exactByMask.get(mask(initial));assert(e);
    assert.equal(variant.optimalNumeratorTenths,e.expectedPayoutTenthsNumerator);
    assert.equal(variant.automaticNumeratorTenths,e.automaticPayoutTenthsNumerator);
    optimal+=e.expectedPayoutTenthsNumerator;automatic+=e.automaticPayoutTenthsNumerator;
    assert(initial.length>=1&&initial.length<=3);assert.equal(new Set(initial).size,initial.length);
    support[initial.length].add(mask(initial));
  }
  assert.equal(m.optimalNumeratorSumTenths,optimal);assert.equal(m.automaticNumeratorSumTenths,automatic);
  assert.equal(m.poolOutcomeDenominator,60568200*m.layoutCount);
  assert.equal(m.optimalReturnPercent,10*optimal/m.poolOutcomeDenominator);
  assert.equal(m.automaticReturnPercent,10*automatic/m.poolOutcomeDenominator);
}
assert.deepEqual(Object.fromEntries(Object.entries(support).map(([n,layouts])=>[n,layouts.size])),{1:25,2:10,3:6});
assert(R.molds[1].optimalReturnPercent>50);
assert(Math.abs(R.molds[1].optimalReturnPercent-63.99560038436011)<1e-10);
assert(calibration.feasibility.minimumMixtureOptimalPercent<50);
assert(calibration.feasibility.maximumMixtureOptimalPercent>150);

// Exercise every layout through the actual two-stage RNG selector at every
// integer target, including low-target two/three-FREE floors. No Monte Carlo
// frequency tolerance can hide an unreachable layout or an incorrectly scaled pool.
let selectedBoards=0;
for(let target=50;target<=150;target++){
  const curve=R.calibrationForTarget(target);let cumulative=0,expectedReturn=0,automaticReturn=0;
  for(const weight of curve.weights){
    const m=R.molds[weight.moldIndex];assert(weight.weight>0);
    expectedReturn+=weight.weight*10*m.optimalNumeratorSumTenths/m.poolOutcomeDenominator;
    automaticReturn+=weight.weight*10*m.automaticNumeratorSumTenths/m.poolOutcomeDenominator;
    const poolRoll=cumulative+weight.weight/2;
    for(let vi=0;vi<m.variants.length;vi++){
      const rolls=[poolRoll,(vi+.5)/m.variants.length];let calls=0;
      const board=R.create({target,numbers:identity,rng:()=>{assert(calls<2);return rolls[calls++];}});
      assert.equal(calls,2);assert.equal(board.moldIndex,weight.moldIndex);assert.equal(board.initialVariantIndex,vi);
      assert.deepEqual(plain(board.initialFreeCells),plain(m.variants[vi].initialFreeCells));
      assert.equal(board.freeBudget,1);assert.equal(board.rulesRevision,254);selectedBoards++;
    }
    cumulative+=weight.weight;
  }
  assert(Math.abs(cumulative-1)<1e-12);assert(Math.abs(expectedReturn-target)<1e-10);
  assert(Math.abs(curve.automaticReturnPercent-automaticReturn)<1e-10);
  const documented=calibration.optimalCalibratedRows.find(row=>row.targetOptimalPercent===target);
  if(documented){assert(Math.abs(documented.optimalPercent-expectedReturn)<1e-10);assert(Math.abs(documented.actualAutoPercent-automaticReturn)<1e-10);}
}
assert.equal(selectedBoards,4343);
for(const invalid of [-1,1.5,999])assert.throws(()=>R.create({moldIndex:1,initialVariantIndex:invalid}));

// Geometric proof: five 3-cell lines require at least12 distinct marked cells.
// A three-initial-FREE round can reach12, and its initial cells must all lie in
// such a12-cell union. The old [5,6,7] mold fails this condition; five of the six
// randomized three-FREE layouts satisfy it.
const threes=R.lines.filter(l=>l.length===3),fiveUnions=[];
for(let a=0;a<3;a++)for(let b=a+1;b<4;b++)for(let c=b+1;c<5;c++)for(let d=c+1;d<6;d++)for(let e=d+1;e<7;e++){
  fiveUnions.push(threes[a].mask|threes[b].mask|threes[c].mask|threes[d].mask|threes[e].mask);
}
assert.equal(fiveUnions.length,21);
assert.equal(Math.min(...fiveUnions.map(R.helpers.popcount)),12);
const twelve=fiveUnions.filter(m=>R.helpers.popcount(m)===12);
assert.equal(twelve.length,5);
assert(!twelve.some(m=>(m&mask([5,6,7]))===mask([5,6,7])));
assert.equal([...support[3]].filter(initial=>twelve.some(m=>(m&initial)===initial)).length,5);

const witness=calibration.witnesses.threeCellFiveLines;
let five=create(witness.initialFree);five=hit(five,witness.firstFiveCells.map(id=>id+1));
assert.equal(five.freeBudget,1);
for(const id of witness.manualFree)five=R.placeFree(five,id);
five=R.commitFree(five,{autoFill:false});five=hit(five,witness.lastThreeCells.map(id=>id+1));
assert.deepEqual(plain(five.lineCounts),witness.lineCounts);assert.equal(five.totalHundredths,10000);
assert.equal(five.oddsMultiplier,1);assert.equal(five.markedCells.length,12);assert.equal(five.highestRole,true);
assert.deepEqual(plain(five.highestRoles),[3]);

// A real legal8-ball round first completes the7-cell line, then receives a
// reach for the separate3-cell-four-line role. A global boolean transition
// would miss this new highest role because highestRole is already true.
const multi=calibration.witnesses.separateHighestRoleReach;
let s=create(multi.initialFree);s=hit(s,multi.firstFiveCells.map(id=>id+1));
for(const id of multi.manualFree)s=R.placeFree(s,id);
s=R.commitFree(s,{autoFill:false});s=hit(s,multi.sixthAndSeventhCells.map(id=>id+1));
assert.equal(s.highestRole,true);assert.deepEqual(plain(s.highestRoles),[7]);
const before=plain(s),reach=R.reaches(s).find(row=>row.n===multi.eighthCell+1);assert(reach);
assert.equal(reach.allClear,true);assert.deepEqual(plain(reach.newHighestRoles),[3]);
assert.deepEqual(plain(reach.highestRoles),[3,7]);assert.equal(reach.gainHundredths,9950);
assert.deepEqual(plain(s),before,'forecasts never mutate the live board');
const stale253=plain(s);stale253.rulesRevision=253;stale253.highestRole=false;
delete stale253.highestRoles;delete stale253.newHighestRoles;
assert.deepEqual(plain(R.reaches(stale253).find(row=>row.n===multi.eighthCell+1).newHighestRoles),[3]);
assert.equal(R.reaches(stale253).find(row=>row.n===16).allClear,false,'old boolean metadata cannot re-award an already completed7-cell role');
s=R.draw(s,multi.eighthCell+1);assert.deepEqual(plain(s.newHighestRoles),[3]);assert.equal(s.totalHundredths,12500);

// All five genuine v253 saved molds continue with the exact old numbers,
// initial locations, manual choices and payout. Only classification metadata
// is newly derived; no current pool is reselected during a saved round.
let legacy253Rounds=0;
assert.equal(R.legacy253.revision,253);
for(let i=0;i<saved253.ready.length;i++){
  let resumed=hit(plain(saved253.ready[i]),[2,3,4,10,17]);
  assert.deepEqual(oldFields(resumed,saved253.placing[i]),oldExpected(saved253.placing[i]));
  const initial=plain(resumed.initialFreeCells),numbers=plain(resumed.numbers);
  resumed=R.commitFree(resumed);assert.deepEqual(oldFields(resumed,saved253.committed[i]),oldExpected(saved253.committed[i]));
  assert.equal(resumed.rulesRevision,253);assert.deepEqual(plain(resumed.initialFreeCells),initial);
  assert.deepEqual(plain(resumed.numbers),numbers);
  resumed=hit(resumed,[6,7,8]);assert.deepEqual(oldFields(resumed,saved253.done[i]),oldExpected(saved253.done[i]));
  assert.equal(R.payRowsFor(resumed)[0].hundredths,10*resumed.oddsMultiplier);
  legacy253Rounds++;
}

console.log('DANGO_V254_RULES_PASS',JSON.stringify({revision:254,exactLayouts:27,distinctLayouts:41,selectedBoards,
  currentCppVectors,mirroredCppVectors,calibratedTargets:101,payoutTableUnchanged:true,threeCellFiveLines:true,
  separateHighestRoleReach:true,legacy253Rounds,uniformSingleOptimalPercent:R.molds[1].optimalReturnPercent}));

import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context=vm.createContext({Math,console});
vm.runInContext(fs.readFileSync(new URL('../assets/dango-bingo-rules.js',import.meta.url),'utf8'),context);
const R=context.DangoBingoRules,plain=value=>JSON.parse(JSON.stringify(value));
const calibration=JSON.parse(fs.readFileSync(new URL('../docs/dango-v251-calibration.json',import.meta.url),'utf8'));
const identity=Array.from({length:25},(_,i)=>i+1);
const seeded=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
const freezeDeep=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freezeDeep);Object.freeze(value);}return value;};
const sorted=ids=>[...ids].sort((a,b)=>a-b);
const create=moldIndex=>R.create({moldIndex,numbers:identity,target:90});
const hit=(state,numbers)=>numbers.reduce((s,n)=>{const next=R.draw(s,n);assert(next);return next;},state);
const phase5=(moldIndex,numbers)=>hit(create(moldIndex),numbers);

assert.equal(R.REVISION,251);assert.equal(R.cells.length,25);assert.equal(R.lines.length,19);
assert.deepEqual(plain(R.geometry.rows),[1,3,5,7,9]);
assert.deepEqual(plain(R.lines.reduce((a,l)=>(a[l.length]=(a[l.length]||0)+1,a),{})),{3:7,4:6,5:4,7:1,9:1});
assert.deepEqual(plain(R.payRows.map(r=>[r.length,r.count,r.hundredths,r.atLeast])),[
  [3,1,20,false],[3,2,100,false],[3,3,500,false],[3,4,10000,true],
  [4,1,100,false],[4,2,300,false],[4,3,5000,false],[4,4,50000,true],
  [5,1,300,false],[5,2,10000,false],[5,3,200000,true],[7,1,2500,false],[9,1,10000,false]
]);
assert.equal(new Set(R.lines.map(l=>l.mask)).size,19);
for(const line of R.lines){assert.equal(line.cells.length,line.length);assert.equal(R.helpers.popcount(line.mask),line.length);}

// Validate the calibrated curve, including the small highest-role mold at every setting.
for(let target=50;target<=150;target++){
  const c=R.calibrationForTarget(target);
  assert(Math.abs(c.weights.reduce((sum,x)=>sum+x.weight,0)-1)<1e-12);
  assert.equal(c.weights[4].weight,.005);
  assert(c.weights.every(x=>x.weight>=0));
  assert(Math.abs(c.optimalReturnPercent-target)<1e-10);
  assert(c.automaticReturnPercent<=c.optimalReturnPercent);
  if(target>50)assert(c.automaticReturnPercent>R.calibrationForTarget(target-1).automaticReturnPercent);
}
for(const row of calibration.optimalCalibratedRows){
  const c=R.calibrationForTarget(row.targetOptimalPercent);
  assert(Math.abs(c.automaticReturnPercent-row.actualAutoPercent)<1e-10);
}
assert.equal(R.effectiveTarget(-100),50);assert.equal(R.effectiveTarget(999),150);assert.equal(R.effectiveTarget(NaN),90);
for(let i=0;i<R.molds.length;i++){
  const m=R.molds[i],doc=calibration.templates[i];
  assert.deepEqual(plain(m.initialFreeCells.map(x=>x+1)),doc.initialCellsOneBased);
  assert.equal(m.optimalNumeratorTenths,doc.optimalPayoutNumeratorTenths);
  assert.equal(m.automaticNumeratorTenths,doc.autoPayoutNumeratorTenths);
  assert.equal(R.helpers.reflect(R.helpers.maskOf(m.initialFreeCells)),R.helpers.maskOf(m.initialFreeCells));
}

// Layout choice consumes RNG once, and the number shuffle consumes it24 times.
// The round never reads layout RNG again, including automatic/forecast operations.
for(const target of [50,75,100,125,150])for(let seed=1;seed<=15;seed++){
  let calls=0,allowed=true;const nextRandom=seeded(seed+target*101);
  const s=R.create({target,rng:()=>{assert(allowed);calls++;return nextRandom();}});allowed=false;
  assert.equal(calls,25);assert.deepEqual(sorted(s.numbers),identity);
  assert.equal(s.initialFreeCells.length<=3,true);assert.equal(s.freeBudget,1);
  assert.deepEqual(plain(R.create({target,seed})),plain(R.create({target,seed})));
  let round=hit(s,[1,2,3,4,5]);round=R.commitFree(round,{autoFill:true});round=hit(round,[6,7,8]);
  assert.equal(round.phase,'done');assert.equal(calls,25);
}

// Completing a line does not grant FREE under the final rule.
let s=phase5(0,[2,3,4,10,17]);
assert.equal(s.lineCounts[3],1);assert.equal(s.freeBudget,1);assert.equal(s.phase,'placing');
assert.equal(R.draw(s,6),null,'6th ball cannot pass the placement boundary');
assert.equal(R.commitFree(s,{autoFill:false}),null,'unused quota must be resolved');
assert.equal(R.placeFree(s,1),null,'already hit cells cannot receive a retroactive odds FREE');
const old=plain(s);let placed=R.placeFree(s,5);assert(placed);assert.equal(placed.oddsMultiplier,1);
assert.deepEqual(plain(s),old,'placing does not mutate the previous checkpoint');
assert.equal(R.placeFree(placed,5),placed,'repeat placement is idempotent');
assert.equal(R.undoFree(placed,5).freeRemaining,1);assert.equal(placed.freeRemaining,0);
placed=R.commitFree(placed,{autoFill:false});assert.equal(placed.phase,'draw-final');
assert.equal(R.commitFree(placed),placed,'repeat commit is idempotent');
assert.equal(R.undoFree(placed,5),null);assert.equal(R.placeFree(placed,6),null);
placed=R.draw(placed,6);assert.equal(placed.oddsMultiplier,2);assert.equal(placed.lastOddsGain,1);
assert.equal(R.draw(placed,6),placed,'duplicate result cannot raise odds twice');

// All three initial FREE hits in first5 grant exactly three extra FREE, never odds.
s=phase5(4,[6,7,8,1,2]);
assert.equal(s.freeBudget,4);assert.equal(s.oddsMultiplier,1);assert.deepEqual(plain(s.bonusHits),[6,7,8]);
assert.equal(R.placeFree(s,5),null,'initial FREE never becomes an odds cell by stacking');
assert.equal(s.freeRemaining,4);
for(const id of [8,9,10,11])s=R.placeFree(s,id);
s=R.commitFree(s,{autoFill:false});s=hit(s,[9,10,11]);
assert.equal(s.oddsMultiplier,4);assert.equal(s.freeBudget,4);assert.equal(s.phase,'done');
assert.equal(R.draw(s,25),null);assert.equal(R.payout(s),s.totalHundredths);
assert.equal(R.payRowsFor(s)[0].hundredths,80);

// Initial FREE hits in last3 grant neither late quota nor odds.
s=phase5(4,[1,2,5,10,17]);s=R.placeFree(s,8);s=R.commitFree(s,{autoFill:false});
s=hit(s,[6,7,8]);assert.equal(s.freeBudget,1);assert.equal(s.oddsMultiplier,1);assert.deepEqual(plain(s.bonusHits),[]);
assert.deepEqual(plain(s.oddsHits),[]);

// Highest-role witness: a genuine three-five-cell-line outcome with the final rules.
s=phase5(4,[1,2,5,10,17]);s=R.autoPlace(s);
assert.deepEqual(plain(s.manualFreeCells),[8]);s=R.commitFree(s,{autoFill:false});
s=hit(s,[3,13,21]);assert.equal(s.lineCounts[5],3);assert.equal(s.highestRole,true);assert.equal(s.totalHundredths,200000);
assert.equal(s.oddsMultiplier,1);assert.equal(s.markedCells.length,12);

// Cases produced by the separately compiled C++ greedy enumerator (seed2510423).
// They cover all five production molds, reflection ties, FREE1..4, and late overlaps.
const CPP_VECTORS=[{"mold":0,"h":[0,2,7,10,14],"f":[23],"d":[4,8,24],"budget":1,"multiplier":1,"hundredths":100},{"mold":0,"h":[3,6,10,22,24],"f":[1],"d":[16,17,20],"budget":1,"multiplier":1,"hundredths":0},{"mold":0,"h":[3,4,6,14,20],"f":[11],"d":[2,7,8],"budget":1,"multiplier":1,"hundredths":20},{"mold":0,"h":[2,10,13,16,21],"f":[5],"d":[8,11,19],"budget":1,"multiplier":1,"hundredths":0},{"mold":0,"h":[0,2,6,10,21],"f":[12],"d":[8,23,24],"budget":1,"multiplier":1,"hundredths":0},{"mold":0,"h":[0,2,3,18,19],"f":[1],"d":[11,16,24],"budget":1,"multiplier":1,"hundredths":20},{"mold":0,"h":[2,8,11,14,24],"f":[22],"d":[4,17,19],"budget":1,"multiplier":1,"hundredths":20},{"mold":0,"h":[0,10,16,17,18],"f":[4],"d":[3,12,21],"budget":1,"multiplier":1,"hundredths":20},{"mold":0,"h":[0,2,4,11,16],"f":[20],"d":[6,8,14],"budget":1,"multiplier":1,"hundredths":20},{"mold":0,"h":[2,3,4,10,22],"f":[18],"d":[8,12,18],"budget":1,"multiplier":2,"hundredths":40},{"mold":0,"h":[0,11,14,16,24],"f":[8],"d":[8,10,13],"budget":1,"multiplier":2,"hundredths":0},{"mold":0,"h":[4,6,10,18,22],"f":[11],"d":[5,12,20],"budget":1,"multiplier":1,"hundredths":100},{"mold":1,"h":[0,6,12,15,20],"f":[2,3],"d":[2,10,22],"budget":2,"multiplier":2,"hundredths":600},{"mold":1,"h":[0,4,5,6,18],"f":[11],"d":[3,7,16],"budget":1,"multiplier":1,"hundredths":120},{"mold":1,"h":[6,7,12,14,22],"f":[8],"d":[0,16,19],"budget":1,"multiplier":1,"hundredths":100},{"mold":1,"h":[2,4,7,11,14],"f":[23],"d":[12,18,22],"budget":1,"multiplier":1,"hundredths":120},{"mold":1,"h":[0,2,6,8,20],"f":[12,13],"d":[10,16,22],"budget":2,"multiplier":1,"hundredths":320},{"mold":1,"h":[0,2,7,10,23],"f":[14],"d":[16,17,24],"budget":1,"multiplier":1,"hundredths":100},{"mold":1,"h":[7,8,14,15,18],"f":[13],"d":[13,21,22],"budget":1,"multiplier":2,"hundredths":200},{"mold":1,"h":[3,8,11,12,16],"f":[13],"d":[6,18,23],"budget":1,"multiplier":1,"hundredths":120},{"mold":1,"h":[0,2,4,8,16],"f":[13],"d":[3,7,13],"budget":1,"multiplier":2,"hundredths":40},{"mold":1,"h":[0,4,6,7,22],"f":[11],"d":[3,8,11],"budget":1,"multiplier":2,"hundredths":40},{"mold":1,"h":[6,12,14,18,20],"f":[0,2],"d":[1,7,10],"budget":2,"multiplier":1,"hundredths":300},{"mold":1,"h":[0,7,16,20,22],"f":[8,14],"d":[6,12,19],"budget":2,"multiplier":1,"hundredths":100},{"mold":2,"h":[4,15,19,21,24],"f":[5,7,12],"d":[8,12,23],"budget":3,"multiplier":2,"hundredths":200},{"mold":2,"h":[0,2,4,10,12],"f":[5],"d":[7,11,18],"budget":1,"multiplier":1,"hundredths":500},{"mold":2,"h":[4,8,10,18,20],"f":[13],"d":[1,12,17],"budget":1,"multiplier":1,"hundredths":100},{"mold":2,"h":[0,8,11,12,22],"f":[5],"d":[6,7,14],"budget":1,"multiplier":1,"hundredths":500},{"mold":2,"h":[0,4,10,22,23],"f":[18],"d":[2,3,20],"budget":1,"multiplier":1,"hundredths":20},{"mold":2,"h":[7,10,14,20,22],"f":[12],"d":[2,19,24],"budget":1,"multiplier":1,"hundredths":20},{"mold":2,"h":[0,2,4,6,16],"f":[12],"d":[7,8,20],"budget":1,"multiplier":1,"hundredths":320},{"mold":2,"h":[0,2,4,10,14],"f":[18],"d":[6,8,11],"budget":1,"multiplier":1,"hundredths":20},{"mold":2,"h":[2,8,10,16,24],"f":[5],"d":[1,4,14],"budget":1,"multiplier":1,"hundredths":0},{"mold":2,"h":[2,4,12,14,16],"f":[7],"d":[7,15,20],"budget":1,"multiplier":2,"hundredths":40},{"mold":2,"h":[0,4,6,18,20],"f":[11],"d":[8,11,21],"budget":1,"multiplier":2,"hundredths":40},{"mold":2,"h":[7,10,18,22,24],"f":[12],"d":[4,14,21],"budget":1,"multiplier":1,"hundredths":100},{"mold":3,"h":[10,12,14,16,22],"f":[5,8,21],"d":[4,5,6],"budget":3,"multiplier":2,"hundredths":200},{"mold":3,"h":[0,3,8,22,23],"f":[15],"d":[4,11,21],"budget":1,"multiplier":1,"hundredths":20},{"mold":3,"h":[0,4,8,15,16],"f":[18],"d":[1,2,11],"budget":1,"multiplier":1,"hundredths":20},{"mold":3,"h":[4,6,8,10,24],"f":[18,22],"d":[2,15,17],"budget":2,"multiplier":1,"hundredths":100},{"mold":3,"h":[8,12,13,22,24],"f":[20],"d":[3,15,16],"budget":1,"multiplier":1,"hundredths":100},{"mold":3,"h":[2,4,10,22,24],"f":[8,18],"d":[7,8,12],"budget":2,"multiplier":2,"hundredths":200},{"mold":3,"h":[2,4,6,14,21],"f":[5,18],"d":[8,18,23],"budget":2,"multiplier":2,"hundredths":40},{"mold":3,"h":[4,6,8,11,14],"f":[3,18],"d":[3,20,21],"budget":2,"multiplier":2,"hundredths":400},{"mold":3,"h":[0,2,8,13,14],"f":[20,22],"d":[4,10,24],"budget":2,"multiplier":1,"hundredths":100},{"mold":3,"h":[2,4,7,14,22],"f":[8,23],"d":[5,8,15],"budget":2,"multiplier":2,"hundredths":240},{"mold":3,"h":[0,8,10,14,24],"f":[3,15,22],"d":[5,7,20],"budget":3,"multiplier":1,"hundredths":320},{"mold":3,"h":[2,7,8,14,17],"f":[5,23],"d":[4,9,19],"budget":2,"multiplier":1,"hundredths":300},{"mold":4,"h":[5,6,7,11,12],"f":[1,4,19,21],"d":[3,4,8],"budget":4,"multiplier":2,"hundredths":1000},{"mold":4,"h":[2,10,18,19,24],"f":[17],"d":[0,5,8],"budget":1,"multiplier":1,"hundredths":100},{"mold":4,"h":[2,3,6,8,11],"f":[4,18],"d":[18,20,24],"budget":2,"multiplier":2,"hundredths":840},{"mold":4,"h":[2,6,14,16,21],"f":[12,23],"d":[0,8,11],"budget":2,"multiplier":1,"hundredths":120},{"mold":4,"h":[0,4,10,20,24],"f":[8],"d":[3,21,23],"budget":1,"multiplier":1,"hundredths":300},{"mold":4,"h":[2,7,12,19,20],"f":[0,21],"d":[8,14,18],"budget":2,"multiplier":1,"hundredths":400},{"mold":4,"h":[3,12,14,18,24],"f":[11],"d":[6,10,11],"budget":1,"multiplier":2,"hundredths":200},{"mold":4,"h":[0,2,3,8,13],"f":[4],"d":[4,18,22],"budget":1,"multiplier":2,"hundredths":600},{"mold":4,"h":[3,10,14,16,22],"f":[8],"d":[6,13,18],"budget":1,"multiplier":1,"hundredths":20},{"mold":4,"h":[4,16,20,23,24],"f":[8],"d":[2,8,18],"budget":1,"multiplier":2,"hundredths":600},{"mold":4,"h":[0,5,8,10,24],"f":[4,18],"d":[11,13,21],"budget":2,"multiplier":1,"hundredths":320},{"mold":4,"h":[2,5,8,14,16],"f":[4,23],"d":[3,10,12],"budget":2,"multiplier":1,"hundredths":400}];
for(const v of CPP_VECTORS){
  let state=phase5(v.mold,v.h.map(id=>id+1));
  assert.equal(state.freeBudget,v.budget);
  state=R.autoPlace(freezeDeep(plain(state)));
  assert.deepEqual(sorted(plain(state.manualFreeCells)),v.f,'JS uint32 hash agrees with independent C++ choice');
  assert.equal(state.markedCells.length,6+state.initialFreeCells.length);
  state=R.commitFree(state,{autoFill:false});state=hit(state,v.d.map(id=>id+1));
  assert.equal(state.oddsMultiplier,v.multiplier);assert.equal(state.totalHundredths,v.hundredths);
}

// Direct geometric oracle; it reads cells and actual numbers, not cached masks/counts.
function oracle(state){
  const initial=new Set(state.initialFreeCells),manual=new Set(state.manualFreeCells),hits=new Set(state.draws);
  const marks=new Set(state.cells.filter(c=>initial.has(c.id)||manual.has(c.id)||hits.has(c.number)).map(c=>c.id));
  const counts={3:0,4:0,5:0,7:0,9:0};
  const completed=R.lines.filter(line=>line.cells.every(id=>marks.has(id)));
  for(const line of completed)counts[line.length]++;
  const base=[3,4,5,7,9].reduce((sum,length)=>sum+(R.payRows.filter(row=>row.length===length&&row.count<=counts[length]).at(-1)?.hundredths||0),0);
  const quota=1+state.draws.slice(0,5).filter(n=>initial.has(state.numbers.indexOf(n))).length;
  const multiplier=1+state.draws.slice(5).filter(n=>manual.has(state.numbers.indexOf(n))&&!initial.has(state.numbers.indexOf(n))).length;
  return {counts,quota,multiplier,total:base*multiplier,highest:counts[5]>=3};
}
let games=0,forecasts=0;
for(let mold=0;mold<5;mold++)for(let seed=1;seed<=40;seed++){
  let state=R.create({moldIndex:mold,seed:seed*109+41});
  const rng=seeded(seed*251+mold*1777),deck=identity.slice();
  for(let i=24;i>0;i--){const j=Math.floor(rng()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
  for(let ball=0;ball<8;ball++){
    const snapshot=plain(state),frozen=freezeDeep(plain(state));
    const next=R.draw(frozen,deck[ball]);assert(next);assert.deepEqual(plain(state),snapshot);
    assert.deepEqual(plain(next),plain(R.draw(plain(state),deck[ball])),'JSON checkpoint restores the same next result');
    state=next;
    if(ball===4){
      assert.equal(state.phase,'placing');assert.deepEqual(plain(R.reaches(state)),[]);
      if(seed%2){
        const choice=state.cells.find(c=>!c.marked).id;state=R.placeFree(state,choice);
        if(seed%3===0)state=R.undoFree(state,choice);
      }
      state=R.commitFree(state,{autoFill:true});assert.equal(state.freeRemaining,0);
      assert.equal(state.markedCells.length,6+state.initialFreeCells.length);
    }
    const expected=oracle(state);
    assert.deepEqual(plain(state.lineCounts),expected.counts);assert.equal(state.freeBudget,expected.quota);
    assert.equal(state.oddsMultiplier,expected.multiplier);assert.equal(state.totalHundredths,expected.total);assert.equal(state.highestRole,expected.highest);
    if(state.phase==='draw-final'&&state.draws.length<8){
      const before=plain(state),forecast=new Map(R.reaches(freezeDeep(plain(state))).map(row=>[row.n,row]));
      assert.deepEqual(plain(state),before);
      for(const n of identity.filter(n=>!state.draws.includes(n))){
        const future=oracle(R.draw(state,n)),gain=future.total-state.totalHundredths,oddsUp=future.multiplier>state.oddsMultiplier;
        assert.equal(forecast.has(n),gain>0||oddsUp);
        if(forecast.has(n)){const row=forecast.get(n);assert.equal(row.gainHundredths,gain);assert.equal(row.totalHundredths,future.total);assert.equal(row.oddsUp,oddsUp);assert.equal(row.allClear,future.highest&&!state.highestRole);}
        forecasts++;
      }
    }
  }
  assert.equal(state.phase,'done');assert.equal(state.draws.length,8);assert(state.oddsMultiplier<=4);games++;
}
for(const invalid of [0,26,-1,NaN,1.5,'1'])assert.equal(R.draw(create(0),invalid),null);
assert.throws(()=>R.create({initialFreeCells:[0,1,2,3]}));assert.throws(()=>R.create({numbers:Array(25).fill(1)}));
console.log(JSON.stringify({ok:true,rule:'initial-hit-free-v4',molds:5,cppVectors:CPP_VECTORS.length,games,forecasts,calibrationTargets:101,highestRoleWitness:true}));

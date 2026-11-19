import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const context=vm.createContext({console});
vm.runInContext(await fs.readFile(new URL('../assets/dango-bingo-rules.js',import.meta.url),'utf8'),context);
const R=context.DangoBingoRules.legacy262,plain=value=>JSON.parse(JSON.stringify(value));
const lengths=[3,4,5,6,7],bit=id=>1<<id,mask=ids=>ids.reduce((m,id)=>m|bit(id),0);
assert.equal(R.REVISION,262);
assert.deepEqual(plain(R.geometry.rows),[1,2,3,4,5,6,7]);
assert.equal(R.cells.length,28);assert.equal(R.lines.length,15);
assert.equal(new Set(R.lines.map(line=>line.mask)).size,15);
for(const length of lengths){
 assert.equal(R.lines.filter(line=>line.length===length).length,3);
 assert.deepEqual(plain(R.payRows.filter(row=>row.length===length).map(row=>row.count)),[1,2,3]);
}
assert.equal(R.tiers[7][3],200000,'the user-approved 2,000x base jackpot is applied');

// The full line geometry is independently reconstructed from row/column axes.
const expectedLines=[];
for(let axis=0;axis<3;axis++)for(let key=0;key<7;key++){
 const ids=R.cells.filter(c=>(axis===0?c.row:axis===1?c.col:c.row-c.col)===key).map(c=>c.id);
 if(ids.length>=3)expectedLines.push(mask(ids));
}
assert.deepEqual([...R.lines.map(line=>line.mask)].sort((a,b)=>a-b),expectedLines.sort((a,b)=>a-b));

for(let target=50;target<=150;target++){
 const c=R.calibrationForTarget(target);
 assert.ok(c.weights.every(w=>w.weight>0&&w.weight<1));
 assert.ok(Math.abs(c.weights.reduce((sum,w)=>sum+w.weight,0)-1)<1e-14);
 assert.ok(Math.abs(c.optimalReturnPercent-target)<1e-10);
 assert.ok(Math.abs(c.automaticReturnPercent-target)<1e-10);
 assert.equal(c.weights[2].weight,3/200,'the AUTO-reachable jackpot layout remains available at every target');
 for(let moldIndex=0;moldIndex<R.molds.length;moldIndex++){
  const s=R.create({target,moldIndex,seed:262000+target});
  assert.equal(s.numbers.length,28);assert.equal(s.numbers.filter(n=>n===0).length,3);
  assert.deepEqual([...s.numbers.filter(n=>n>0)].sort((a,b)=>a-b),Array.from({length:25},(_,i)=>i+1));
  assert.equal(new Set(s.triggerNumbers).size,3);
  assert.ok(s.initialFreeCells.every(id=>s.numbers[id]===0&&s.cells[id].marked));
 }
}
assert.equal(R.calibrationForTarget(0).target,50);
assert.equal(R.calibrationForTarget(200).target,150);
assert.equal(R.calibrationForTarget(NaN).target,90);
assert.equal(R.calibrationForTarget(73.5).target,73.5);
const boundary=R.weightsForTarget(90)[0].weight;
assert.equal(R.create({target:90,rng:()=>boundary-1e-12}).moldIndex,0);
assert.equal(R.create({target:90,rng:()=>boundary}).moldIndex,1);
assert.equal(R.create({target:90,rng:()=>1}).moldIndex,2);

// This production layout must reach the advertised 2,000x role with AUTO,
// using only the first five hits, including at the lowest payout setting.
let jackpot=R.create({target:50,moldIndex:2,numbers:Array.from({length:25},(_,i)=>i+1)});
for(const number of [1,2,5,9,14])jackpot=R.draw(jackpot,number);
jackpot=R.autoPlace(jackpot);
assert.equal(jackpot.expansionCenter,27);
assert.equal(jackpot.lineCounts[7],3);
assert.ok(jackpot.baseHundredths>=200000);
jackpot=R.commitFree(jackpot,{autoFill:false});
for(const number of [3,4,6])jackpot=R.draw(jackpot,number);
assert.equal(jackpot.phase,'done');assert.equal(jackpot.lineCounts[7],3);
assert.ok(jackpot.totalHundredths>=200000,'the 2,000x role remains payable after all eight balls');
assert.throws(()=>R.create({initialFreeCells:[0,1]}),/three/);
assert.throws(()=>R.create({triggerNumbers:[1,1,2]}),/distinct/);
assert.throws(()=>R.create({numbers:Array(25).fill(1)}),/1–25/);

function fifth(k,seed=262,custom=false){
 let s=R.create({seed,...(custom?{initialFreeCells:[4,12,18],triggerCells:[0,1,2]}:{})});
 const ordinary=s.numbers.filter(n=>n>0&&!s.triggerNumbers.includes(n));
 const first=[...s.triggerNumbers.slice(0,k),...ordinary.slice(0,5-k)];
 for(const n of first)s=R.draw(s,n);
 assert.equal(s.phase,'placing');assert.equal(s.expansionLevel,k);
 assert.equal(s.oddsMultiplier,1,'trigger hits alone do not raise ODDS');
 return s;
}

// Exhaust all 1,140 actual last-three combinations for each candidate. This
// deliberately does not use the line-union moments used by production AUTO.
function bruteScore(s,center){
 const expansion=center===null?[]:plain(R.expansionCellsFor(s,center));
 const initial=mask(s.initialFreeCells),early=mask(s.draws.map(n=>s.numbers.indexOf(n))),free=mask(expansion);
 const base=initial|early|free,overlap=s.initialFreeCells.filter(id=>free&bit(id)).length;
 const remaining=R.cells.filter(c=>s.numbers[c.id]>0&&!(early&bit(c.id))).map(c=>c.id);
 let sum=0;
 for(let a=0;a<18;a++)for(let b=a+1;b<19;b++)for(let c=b+1;c<20;c++){
  const late=[remaining[a],remaining[b],remaining[c]],marked=base|mask(late);
  const counts=Object.fromEntries(lengths.map(length=>[length,0]));
  for(const line of R.lines)if((marked&line.mask)===line.mask)counts[line.length]++;
  const value=lengths.reduce((n,length)=>n+R.tiers[length][counts[length]],0);
  sum+=value*(1+overlap+late.filter(id=>free&bit(id)).length);
 }
 return sum;
}
let checkedCandidates=0,checkedLateOutcomes=0;
for(let k=0;k<=3;k++)for(let seed=262;seed<265;seed++){
 const s=fifth(k,seed),saved=JSON.stringify(s),centers=k?[...R.availableCenters(s)]:[null];
 let best=-1,bestCenter=null;
 for(const center of centers){
  const region=center===null?[]:plain(R.expansionCellsFor(s,center));
  assert.equal(region.length,[0,1,7,17][k]);assert.equal(new Set(region).size,region.length);
  if(k)assert.ok(region.includes(center),'the chosen center is FREE');
  const expected=bruteScore(s,center),actual=R.expectedNumeratorForCenter(s,center);
  assert.equal(actual,expected,`conditional ODDS mean K=${k}, seed=${seed}, center=${center}`);
  if(expected>best){best=expected;bestCenter=center;}
  checkedCandidates++;checkedLateOutcomes+=1140;
 }
 const automatic=R.autoPlace(s);
 assert.equal(automatic.expansionCenter,bestCenter);
 assert.equal(JSON.stringify(s),saved,'preview and AUTO never mutate the saved state');
 assert.deepEqual(plain(R.autoPlace(JSON.parse(saved))),plain(automatic),'AUTO is reproducible after reload and uses no future RNG');
 assert.equal(R.draw(s,26),null);assert.equal(R.draw(s,0),null);
 const n=s.numbers.find(n=>n>0&&!s.draws.includes(n));assert.equal(R.draw(s,n),null,'sixth cannot arrive before commitment');
 const committed=R.commitFree(s);assert.equal(committed.freeCommitted,true);
 assert.equal(committed.expansionCenter,bestCenter);
 assert.equal(R.placeFree(committed,centers[0]),null,'no placement after commitment');
 assert.equal(R.commitFree(committed),committed,'commit is idempotent');
}

for(let k=1;k<=3;k++){
 const s=fifth(k,962+k,true),initialCenter=R.availableCenters(s).find(id=>s.initialFreeCells.includes(id));
 assert.notEqual(initialCenter,undefined,'an existing FREE can be chosen as the center');
 const placed=R.placeFree(s,initialCenter),overlap=placed.initialFreeCells.filter(id=>placed.manualFreeCells.includes(id)).length;
 assert.equal(placed.oddsMultiplier,1+overlap);
 assert.equal(R.placeFree(placed,initialCenter),placed,'same center does not add another ODDS');
 const undone=R.undoFree(placed,initialCenter);assert.equal(undone.oddsMultiplier,1);assert.equal(undone.expansionCenter,null);
 assert.equal(R.placeFree(undone,initialCenter).oddsMultiplier,1+overlap,'repeated placement cannot farm ODDS');
 const other=R.availableCenters(s).find(id=>id!==initialCenter),moved=R.placeFree(placed,other);
 assert.equal(moved.oddsMultiplier,1+moved.initialFreeCells.filter(id=>moved.manualFreeCells.includes(id)).length);
 let committed=R.commitFree(placed),late=committed.numbers.filter(n=>n>0&&!committed.draws.includes(n));
 late.sort((a,b)=>Number(committed.manualFreeCells.includes(committed.numbers.indexOf(b)))-Number(committed.manualFreeCells.includes(committed.numbers.indexOf(a))));
 late=late.slice(0,3);
 for(const n of late){const previous=committed;committed=R.draw(committed,n);assert.equal(R.draw(committed,n),committed,'duplicate number never adds ODDS');assert.ok(committed.oddsMultiplier>=previous.oddsMultiplier);}
 assert.equal(committed.phase,'done');
 assert.equal(committed.oddsMultiplier,1+overlap+late.filter(n=>committed.manualFreeCells.includes(committed.numbers.indexOf(n))).length);
 assert.equal(R.payout(committed),committed.baseHundredths*committed.oddsMultiplier);
 assert.ok(R.payRowsFor(committed).every(row=>row.hundredths===row.baseHundredths*committed.oddsMultiplier));
 assert.equal(R.reaches(committed).length,0);
}

// Forecasts execute precisely the same draw rule, including late FREE hits.
let s=R.commitFree(fifth(3,910));
for(const reach of R.reaches(s)){
 const next=R.draw(s,reach.number);
 assert.equal(next.totalHundredths,reach.totalHundredths);
 assert.equal(next.totalHundredths-s.totalHundredths,reach.gainHundredths);
 assert.equal(next.oddsMultiplier>s.oddsMultiplier,reach.oddsUp);
}
const legacy=R.create({rulesRevision:254,seed:254});
assert.equal(legacy.rulesRevision,254);assert.equal(R.geometryFor(legacy).cells.length,25);
assert.deepEqual(plain(R.payRowsBaseFor(legacy)),plain(R.legacy254.payRowsBaseFor(legacy)));
assert.deepEqual(plain(R.draw(legacy,1)),plain(R.legacy254.draw(legacy,1)));
console.log('DANGO_V262_RULES_PASS',JSON.stringify({targets:101,geometryCells:28,lines:15,checkedCandidates,checkedLateOutcomes,
 overlapAndHitOdds:true,noReselectionFarming:true,noFutureLookahead:true,legacyDispatch:true}));

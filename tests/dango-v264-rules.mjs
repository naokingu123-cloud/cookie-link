import assert from 'node:assert/strict';
import fs from 'node:fs/promises';import vm from 'node:vm';
const context=vm.createContext({console});
vm.runInContext(await fs.readFile(new URL('../assets/dango-bingo-rules.js',import.meta.url),'utf8'),context);
const R=context.DangoBingoRules,P=x=>JSON.parse(JSON.stringify(x));
const bit=id=>1<<id,mask=ids=>ids.reduce((m,id)=>m|bit(id),0),L=[3,4,5,6,7],numbers=Array.from({length:25},(_,i)=>i+1);
assert.equal(R.REVISION,264);assert.equal(R.legacy263.REVISION,263);assert.equal(R.legacy262.REVISION,262);
assert.equal(Math.min(...R.payRows.map(row=>row.hundredths)),20);
assert.deepEqual(P(L.map(l=>R.tiers[l].slice(1))),[[20,80,1200],[30,120,600],[40,400,3000],[100,2000,20000],[200,5000,500000]]);
for(let target=50;target<=150;target++){
 const c=R.calibrationForTarget(target);
 assert.ok(c.weights.every(x=>x.weight>0&&x.weight<1));
 assert.ok(Math.abs(c.automaticReturnPercent-target)<1e-10);
 assert.ok(Math.abs(c.weights.reduce((n,x)=>n+x.weight,0)-1)<1e-14);
 assert.equal(c.weights[2].weight,.015);
}
function five(moldIndex,draws){let s=R.create({moldIndex,numbers});for(const n of draws)s=R.draw(s,n);return s;}
function early(moldIndex,selectedCells){
 const original=R.create({moldIndex,numbers}),numberHits=selectedCells.map(id=>original.numbers[id]);
 assert.ok(numberHits.every(n=>n>0));
 const rest=numbers.filter(n=>!numberHits.includes(n));
 return five(moldIndex,[...numberHits,...rest].slice(0,5));
}
const none=five(0,[20,21,22,23,24]);
assert.equal(none.expansionLevel,0);assert.deepEqual(P(none.qualifiedEarlyLengths),[]);
assert.equal(none.freeBudget,0);assert.equal(R.availableCenters(none).length,0);
const emptyCommit=R.commitFree(none);assert.equal(emptyCommit.phase,'draw-final');assert.equal(emptyCommit.manualFreeCells.length,0);
const one=early(0,[3,4,5]),two=early(1,[9]),three=early(2,[13,14]);
for(const [s,grade,length,full] of [[one,1,3,1],[two,2,4,7],[three,3,5,19]]){
 assert.equal(s.draws.length,5);assert.equal(s.phase,'placing');assert.equal(s.expansionLevel,grade);
 assert.ok(s.qualifiedEarlyLengths.includes(length));assert.equal(s.triggerNumbers.length,0);
 assert.equal(R.availableCenters(s).length,23);assert.equal(R.expansionCellsFor(s,12).length,full);
 assert.equal(s.oddsMultiplier,1,'early line completion alone never adds ODDS');
 assert.ok(s.initialFreeCells.every(id=>s.numbers[id]===0));
 const automatic=R.autoPlace(s);
 assert.ok(Number.isInteger(automatic.expansionCenter));
 assert.equal(automatic.expansionCells.length,R.expansionCellsFor(s,automatic.expansionCenter).length);
 assert.equal(R.autoPlace(P(s)).expansionCenter,automatic.expansionCenter,'AUTO must be deterministic after serialization');
}
assert.equal(R.expansionCellsFor(two,0).length,3,'radius1 clipped at apex');
assert.equal(R.expansionCellsFor(three,0).length,6,'radius2 clipped at apex');
assert.equal(R.expansionCellsFor(three,12).length,19);
const selected=R.placeFree(three,12);
assert.equal(selected.expansionCells.length,19);assert.ok(selected.expansionCells.includes(12));
const overlapped=three.initialFreeCells.filter(id=>selected.expansionCells.includes(id)).length;
assert.equal(selected.oddsMultiplier,1+overlapped);
assert.equal(R.undoFree(selected,12).expansionCenter,null);
let committed=R.commitFree(selected,{autoFill:false});
assert.equal(committed.phase,'draw-final');assert.equal(committed.freeCommitted,true);
const final= numbers.filter(n=>!committed.draws.includes(n)).slice(0,3);
for(const n of final)committed=R.draw(committed,n);
assert.equal(committed.phase,'done');
assert.equal(committed.oddsMultiplier,1+overlapped+final.filter(n=>selected.expansionCells.includes(selected.numbers.indexOf(n))).length);
assert.equal(R.payout(committed),committed.totalHundredths);
assert.equal(R.draw(committed,final[2]),committed,'duplicate final ball has no payout side effect');
for(const rev of [262,263]){
 const old=R.create({rulesRevision:rev,moldIndex:0,numbers});
 assert.equal(old.rulesRevision,rev);
 assert.equal(R.tiersFor(old)[7][3],rev===262?200000:500000);
 assert.equal(R.geometryFor(old).cells.length,28);
}
assert.equal(R.create({rulesRevision:254}).rulesRevision,254);
function brute(state,center){
 const footprint=center===null?[]:R.expansionCellsFor(state,center),earlyMask=mask(state.draws.map(n=>state.numbers.indexOf(n))),base=mask(state.initialFreeCells)|earlyMask|mask(footprint),f=mask(footprint),overlap=state.initialFreeCells.filter(id=>f&bit(id)).length;
 const rest=R.cells.filter(c=>state.numbers[c.id]>0&&!(earlyMask&bit(c.id))).map(c=>c.id);
 let sum=0;
 for(let i=0;i<18;i++)for(let j=i+1;j<19;j++)for(let k=j+1;k<20;k++){
  const last=[rest[i],rest[j],rest[k]],marked=base|mask(last),counts=Object.fromEntries(L.map(l=>[l,0]));
  for(const line of R.lines)if((line.mask&marked)===line.mask)counts[line.length]++;
  const pay=L.reduce((a,l)=>a+R.tiers[l][counts[l]],0);
  sum+=pay*(1+overlap+last.filter(id=>f&bit(id)).length);
 }
 return sum;
}
let checked=0;for(const s of [none,one,two,three]){
 const choices=s.expansionLevel?R.availableCenters(s).slice(0,4):[null];
 for(const center of choices){assert.equal(R.expectedNumeratorForCenter(s,center),brute(s,center));checked++;}
}
console.log('DANGO_V264_RULES_PASS',JSON.stringify({grades:[none.expansionLevel,one.expansionLevel,two.expansionLevel,three.expansionLevel],areas:[1,7,19],clip:[3,6],checked,restoreLegacy:[262,263],minPayout:.2}));

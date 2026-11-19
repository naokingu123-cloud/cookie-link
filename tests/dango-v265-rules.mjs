import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const ctx=vm.createContext({console});
vm.runInContext(await fs.readFile(new URL('../assets/dango-bingo-rules.js',import.meta.url),'utf8'),ctx);
const R=ctx.DangoBingoRules,P=x=>JSON.parse(JSON.stringify(x));
const numbers=Array.from({length:25},(_,i)=>i+1),bit=id=>1<<id,maskOf=ids=>ids.reduce((m,id)=>m|bit(id),0),lengths=[3,4,5,6,7];
assert.equal(R.REVISION,265);assert.equal(R.legacy264.REVISION,264);
assert.equal(R.shortLines.length,3);assert.equal(R.gradeLines.length,18);assert.equal(R.lines.length,15);
assert.deepEqual(P(R.shortLines.map(line=>line.cells)),[[1,2],[20,26],[15,22]]);
assert.equal(Math.min(...R.payRows.map(row=>row.hundredths)),20);
assert.equal(R.tiers[7][3],500000);
for(let target=50;target<=150;target++){
 const c=R.calibrationForTarget(target);
 assert.equal(c.weights.length,3);assert.equal(c.weights[2].weight,.015);
 assert.ok(c.weights.every(w=>w.weight>0&&w.weight<1));
 assert.ok(Math.abs(c.weights.reduce((a,w)=>a+w.weight,0)-1)<1e-14);
 assert.ok(Math.abs(c.automaticReturnPercent-target)<1e-10);
}
for(let moldIndex=0;moldIndex<3;moldIndex++){
 const s=R.create({moldIndex,numbers});assert.equal(s.rulesRevision,265);
 assert.equal(s.initialFreeCells.length,3);assert.equal(s.manualFreeCells.length,0);
 assert.equal(s.triggerNumbers.length,0);assert.equal(s.numbers.filter(n=>n>0).length,25);
}
// Find actual first-five draw combinations for every possible FREE quota.
const witnesses=new Map();
for(let mold=0;mold<3;mold++){
 const start=R.create({moldIndex:mold,numbers}),pool=start.cells.filter(c=>c.number>0).map(c=>c.id),freeMask=maskOf(start.initialFreeCells);
 for(let a=0;a<21;a++)for(let b=a+1;b<22;b++)for(let c=b+1;c<23;c++)for(let d=c+1;d<24;d++)for(let e=d+1;e<25;e++){
  const ids=[pool[a],pool[b],pool[c],pool[d],pool[e]],grade=R.gradeFor(freeMask|maskOf(ids));
  if(!witnesses.has(grade))witnesses.set(grade,{mold,ids});
 }
}
assert.deepEqual([...witnesses.keys()].sort((a,b)=>a-b),[1,2,3,4,5,6,7]);
for(let grade=1;grade<=7;grade++){
 const {mold,ids}=witnesses.get(grade);
 let s=R.create({moldIndex:mold,numbers});
 for(const id of ids)s=R.draw(s,s.numbers[id]);
 assert.equal(s.phase,'placing');assert.equal(s.draws.length,5);
 assert.equal(s.expansionLevel,grade);assert.equal(s.freeBudget,grade);
 assert.equal(s.freeRemaining,grade);assert.equal(R.availableCenters(s).length,23);
 assert.equal(s.triggerNumbers.length,0);
 let selected=s;
 const candidates=R.availableCenters(s);
 for(let k=0;k<grade;k++){
  selected=R.placeFree(selected,candidates[k]);
  assert.equal(selected.manualFreeCells.length,k+1);assert.equal(selected.freeRemaining,grade-(k+1));
 }
 assert.equal(R.availableCenters(selected).length,0);
 assert.equal(R.placeFree(selected,candidates.at(-1)),null);
 const stored=P(selected);
 assert.deepEqual(P(R.undoFree(stored,candidates[0]).manualFreeCells),P(selected.manualFreeCells.slice(1)));
 assert.equal(R.commitFree(selected,{autoFill:false}).phase,'draw-final');
 const auto=R.autoPlace(s);assert.equal(auto.manualFreeCells.length,grade);
 assert.equal(new Set(auto.manualFreeCells).size,grade);
 assert.equal(R.autoPlace(P(s)).totalHundredths,auto.totalHundredths);
}
// Jackpot witness: all three 7-cell lines exactly completed using three
// starting FREE, 5 early, 7 manually placed, and 3 late.
let jp=R.create({moldIndex:0,numbers}),seven=[1,3,6,10,15].map(id=>jp.numbers[id]);
for(const n of seven)jp=R.draw(jp,n);
assert.equal(jp.expansionLevel,7);
const manual=R.autoPlace(jp);
assert.equal(manual.manualFreeCells.length,7);
const outer=R.lines.filter(line=>line.length===7).reduce((a,l)=>a|l.mask,0);
const already=maskOf([...manual.initialFreeCells,...manual.hitCells,...manual.manualFreeCells]);
const lateCells=R.cells.filter(c=>(outer&bit(c.id))&&!(already&bit(c.id))).map(c=>c.id);
assert.equal(lateCells.length,3,'AUTO selects a jackpot-completable perimeter footprint');
let complete=R.commitFree(manual,{autoFill:false});
for(const id of lateCells)complete=R.draw(complete,complete.numbers[id]);
assert.equal(complete.phase,'done');assert.equal(complete.lineCounts[7],3);
assert.ok(complete.baseHundredths>=500000);
assert.equal(R.draw(complete,complete.draws.at(-1)),complete);
assert.equal(R.payout(complete),complete.totalHundredths);
// Partial manual choice, initial-FREE overlap, end-state restore and ODDS.
let s=R.create({moldIndex:1,numbers});const init=s.initialFreeCells[0],firstFive=numbers.slice(0,5).filter(n=>n!==s.numbers[init]);
for(const n of firstFive)s=R.draw(s,n);
if(s.draws.length<5){for(const n of numbers)if(!s.draws.includes(n)&&s.draws.length<5)s=R.draw(s,n);}
if(!s.hitMask.toString)throw Error('missing hit mask');
const overlap=R.availableCenters(s).find(id=>s.initialFreeCells.includes(id));
assert.ok(Number.isInteger(overlap));s=R.placeFree(s,overlap);
assert.equal(s.oddsMultiplier,2);
const restored=P(s);assert.equal(R.autoPlace(restored).manualFreeCells.length,s.freeBudget);
let finished=R.commitFree(s);const remaining=numbers.filter(n=>!finished.draws.includes(n));
for(const n of remaining.slice(0,3))finished=R.draw(finished,n);
assert.equal(finished.phase,'done');assert.equal(finished.freeCommitted,true);
assert.equal(finished.oddsMultiplier,1+finished.overlapFreeCells.length+finished.oddsHits.length);
for(const rev of [262,263,264]){
 const old=R.create({rulesRevision:rev,moldIndex:0,numbers});
 assert.equal(old.rulesRevision,rev);assert.equal(R.geometryFor(old).cells.length,28);
 assert.equal(R.tiersFor(old)[7][3],rev===262?200000:500000);
}
assert.equal(R.create({rulesRevision:254}).rulesRevision,254);
function bruteScore(s,manual){
 const first=maskOf(s.draws.map(n=>s.numbers.indexOf(n))),start=maskOf(s.initialFreeCells),free=maskOf(manual),rest=R.cells.filter(c=>s.numbers[c.id]>0&&!(first&bit(c.id))).map(c=>c.id);
 let sum=0;
 for(let a=0;a<18;a++)for(let b=a+1;b<19;b++)for(let c=b+1;c<20;c++){
  const last=[rest[a],rest[b],rest[c]],marked=first|start|free|maskOf(last),cnt=Object.fromEntries(lengths.map(l=>[l,0]));
  for(const line of R.lines)if((marked&line.mask)===line.mask)cnt[line.length]++;
  const payout=lengths.reduce((n,l)=>n+R.tiers[l][cnt[l]],0),odds=1+manual.filter(id=>s.initialFreeCells.includes(id)).length+last.filter(id=>free&bit(id)).length;
  sum+=payout*odds;
 }
 return sum;
}
const g=witnesses.get(2);let sample=R.create({moldIndex:g.mold,numbers});
for(const id of g.ids)sample=R.draw(sample,sample.numbers[id]);
assert.equal(R.expectedNumeratorForPlacement(sample,[]),bruteScore(sample,[]));
for(const id of R.availableCenters(sample).slice(0,7))
 assert.equal(R.expectedNumeratorForCenter(sample,id),bruteScore(sample,[id]));
console.log('DANGO_V265_RULES_PASS',JSON.stringify({grades:[...witnesses.keys()].sort((a,b)=>a-b),sevenJackpot:true,minimumPayout:.2,legacy:[262,263,264],fullFreeManual:true,allTargets:101}));

import assert from 'node:assert/strict';import fs from 'node:fs/promises';import vm from 'node:vm';
const ctx=vm.createContext({console});vm.runInContext(await fs.readFile(new URL('../assets/dango-bingo-rules.js',import.meta.url),'utf8'),ctx);
const R=ctx.DangoBingoRules,old=R.legacy265,P=x=>JSON.parse(JSON.stringify(x));
const L=[2,3,4,5,6,7],bit=id=>1<<id,mask=ids=>ids.reduce((m,id)=>m|bit(id),0);
assert.equal(R.REVISION,266);assert.equal(old.REVISION,265);assert.equal(R.legacy264.REVISION,264);
assert.deepEqual(P(L.map(l=>R.tiers[l].slice(1))),[[0,20,1000],[20,80,2000],[40,120,5000],[80,300,10000],[150,500,50000],[200,2000,200000]]);
assert.deepEqual(P(L.map(l=>R.tiers[l][3])),[1000,2000,5000,10000,50000,200000]);
assert.equal(R.payRows.length,18);assert.equal(R.shortLines.length,3);
assert.equal(R.isHighestRole(2,3,{rulesRevision:266}),false);
for(let target=50;target<=150;target++){
 const c=R.calibrationForTarget(target);
 assert.ok(c.weights.every(w=>w.weight>0&&w.weight<1));
 assert.ok(Math.abs(c.optimalReturnPercent-target)<1e-9);
 assert.equal(c.weights[2].weight,.015);
 assert.ok(Math.abs(c.weights.reduce((n,w)=>n+w.weight,0)-1)<1e-13);
}
const numbers=Array.from({length:25},(_,i)=>i+1);
for(let m=0;m<3;m++){
 const s=R.create({moldIndex:m,numbers}),v=old.create({moldIndex:m===2?0:m,numbers});
 assert.equal(s.rulesRevision,266);assert.equal(v.rulesRevision,265);
 assert.ok(s.freeBudget>=1&&s.freeBudget<=7);assert.equal(s.manualFreeCells.length,0);
 assert.equal(s.numbers.filter(x=>x>0).length,25);
}
const early=R.create({moldIndex:0,numbers});
let s=early;for(const n of [1,3,6,10,15])s=R.draw(s,n);
assert.equal(s.phase,'placing');assert.equal(s.expansionLevel,7);
const after=R.autoPlace(s);assert.equal(after.manualFreeCells.length,7);assert.equal(after.freeRemaining,0);
const perimeter=R.lines.filter(line=>line.length===7).reduce((m,line)=>m|line.mask,0);
const covered=mask([...after.initialFreeCells,...after.hitCells,...after.manualFreeCells]);
const rest=R.cells.filter(c=>(perimeter&bit(c.id))&&!(covered&bit(c.id))).map(c=>after.numbers[c.id]);
assert.equal(rest.length,3);
let final=R.commitFree(after,{autoFill:false});for(const n of rest)final=R.draw(final,n);
assert.equal(final.phase,'done');assert.equal(final.lineCounts[7],3);
assert.ok(final.baseHundredths>=200000);
const paidTwo=R.payRowsFor(final).filter(row=>row.length===2);
assert.deepEqual(P(paidTwo.map(row=>row.hundredths)),[0,20,1000].map(x=>x*final.oddsMultiplier));
const reverse=R.undoFree(after,after.manualFreeCells[0]);
assert.equal(reverse.manualFreeCells.length,6);assert.equal(reverse.freeRemaining,1);
let low=R.create({moldIndex:1,numbers});for(const n of [1,2,3,4,5])low=R.draw(low,n);
const centers=R.availableCenters(low);assert.ok(centers.length>=20);
for(const center of centers.slice(0,3)){
 const manual=R.placeFree(low,center);const exp=R.expectedNumeratorForPlacement(low,manual.manualFreeCells);
 const scored=R.expectedNumeratorForCenter(low,center);
 assert.equal(exp,scored);
}
for(const rev of [262,263,264,265]){const prior=R.create({rulesRevision:rev,moldIndex:0,numbers});assert.equal(prior.rulesRevision,rev);assert.equal(R.tiersFor(prior)[7][3],rev===262?200000:rev===263?500000:rev===264?500000:500000);}
console.log('DANGO_V266_RULES_PASS',JSON.stringify({current:266,legacy:[262,263,264,265],sixRows:true,threeLineTiersUnchanged:true,rareJackpot:true,allTargets:101}));

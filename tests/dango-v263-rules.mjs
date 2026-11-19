import assert from 'node:assert/strict';
import fs from 'node:fs/promises';import vm from 'node:vm';
const ctx=vm.createContext({console});vm.runInContext(await fs.readFile(new URL('../assets/dango-bingo-rules.js',import.meta.url),'utf8'),ctx);
const R=ctx.DangoBingoRules.legacy263,old=R.legacy262,P=x=>JSON.parse(JSON.stringify(x));
const lens=[3,4,5,6,7],bit=id=>1<<id,mask=ids=>ids.reduce((m,id)=>m|bit(id),0);
assert.equal(R.REVISION,263);assert.equal(old.REVISION,262);assert.equal(R.legacy254.REVISION,254);
assert.deepEqual(P(lens.map(n=>R.tiers[n].slice(1))),[[20,80,1200],[30,120,600],[40,400,3000],[100,2000,20000],[200,5000,500000]]);
assert.equal(Math.min(...R.payRows.map(r=>r.hundredths)),20);assert.equal(old.tiers[7][3],200000);
for(let t=50;t<=150;t++){const c=R.calibrationForTarget(t);assert.ok(c.weights.every(w=>w.weight>0));assert.equal(c.weights[2].weight,.015);assert.ok(Math.abs(c.automaticReturnPercent-t)<1e-10);}
for(let i=0;i<3;i++){const s=R.create({moldIndex:i,seed:263});assert.equal(s.rulesRevision,263);assert.equal(s.cells.length,28);assert.equal(s.numbers.filter(n=>n>0).length,25);}
const oldState=R.create({rulesRevision:262,moldIndex:2,numbers:Array.from({length:25},(_,i)=>i+1)});
assert.equal(oldState.rulesRevision,262);assert.equal(R.tiersFor(oldState)[7][3],200000);
let prev=oldState;for(const n of [1,2,5,9,14])prev=R.draw(prev,n);
assert.equal(R.autoPlace(prev).lineCounts[7],3);assert.equal(R.geometryFor(prev).cells.length,28);
let jp=R.create({moldIndex:2,numbers:Array.from({length:25},(_,i)=>i+1)});
for(const n of [1,2,5,9,14])jp=R.draw(jp,n);
jp=R.autoPlace(jp);assert.equal(jp.expansionCenter,27);assert.equal(jp.lineCounts[7],3);assert.ok(jp.baseHundredths>=500000);
jp=R.commitFree(jp,{autoFill:false});for(const n of [3,4,6])jp=R.draw(jp,n);
assert.equal(jp.phase,'done');assert.ok(jp.totalHundredths>=500000);
const a=R.create({seed:263041,moldIndex:0});
let fifth=a;const seq=[...a.triggerNumbers,...a.numbers.filter(n=>n>0&&!a.triggerNumbers.includes(n)).slice(0,2)];
for(const n of seq)fifth=R.draw(fifth,n);
const early=mask(fifth.draws.map(n=>fifth.numbers.indexOf(n))),remaining=R.cells.filter(c=>fifth.numbers[c.id]>0&&!(early&bit(c.id))).map(c=>c.id);
assert.equal(remaining.length,20);let checks=0;
for(const center of R.availableCenters(fifth).slice(0,6)){
 const fp=mask(R.expansionCellsFor(fifth,center)),initial=mask(fifth.initialFreeCells),marked=initial|early|fp,overlap=fifth.initialFreeCells.filter(id=>fp&bit(id)).length;
 let value=0;for(let i=0;i<18;i++)for(let j=i+1;j<19;j++)for(let k=j+1;k<20;k++){
  const late=[remaining[i],remaining[j],remaining[k]],bits=marked|mask(late),cnt=Object.fromEntries(lens.map(n=>[n,0]));
  for(const line of R.lines)if((bits&line.mask)===line.mask)cnt[line.length]++;
  value+=lens.reduce((sum,n)=>sum+R.tiers[n][cnt[n]],0)*(1+overlap+late.filter(id=>fp&bit(id)).length);
 }
 assert.equal(R.expectedNumeratorForCenter(fifth,center),value);checks++;
}
console.log('DANGO_V263_RULES_PASS',JSON.stringify({min:.2,jackpot:5000,oldJackpot:2000,bruteCenters:checks,settings:101}));

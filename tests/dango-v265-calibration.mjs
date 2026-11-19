import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const root=new URL('..',import.meta.url);
const data=JSON.parse(await fs.readFile(new URL('docs/dango-v265-calibration.json',root),'utf8'));
const ctx=vm.createContext({console});
vm.runInContext(await fs.readFile(new URL('assets/dango-bingo-rules.js',root),'utf8'),ctx);
const R=ctx.DangoBingoRules,P=x=>JSON.parse(JSON.stringify(x)),D=BigInt(data.model.denominator),N=data.profiles.map(p=>BigInt(p.optimalNumerator));
assert.equal(R.REVISION,265);assert.equal(data.rulesRevision,265);
assert.equal(data.status,'approved-for-production');assert.equal(data.profiles.length,3);
assert.deepEqual([3,4,5,6,7].map(l=>P(R.tiers[l].slice(1))),data.paytableHundredths);
for(let i=0;i<3;i++){
 const p=data.profiles[i],m=R.molds[i];
 assert.equal(m.id,p.id);assert.deepEqual(P(m.initialFreeCells),p.initialFreeCells);
 assert.equal(m.optimalNumerator,p.optimalNumerator);
 assert.equal(m.optimalReturnPercent,p.optimalNumerator/Number(D));
 assert.equal(p.gradeCounts.reduce((a,b)=>a+b),53130);
 assert.equal(p.earlyTwoLineCounts.reduce((a,b)=>a+b),53130);
 assert.equal(p.finalLineCounts.length,6);
 for(const row of p.finalLineCounts)assert.equal(row.reduce((a,b)=>a+b),Number(D));
 assert.equal(p.finalLineCounts[5][3],i===0?3:0,'only the perimeter layout enables the full 7x3 jackpot');
}
assert.equal(data.settings.length,101);
for(const entry of data.settings){
 const lo=BigInt(entry.lowWeightNumerator),hi=BigInt(entry.highWeightNumerator),mid=BigInt(entry.featuredWeightNumerator),den=BigInt(entry.weightDenominator);
 assert.ok(lo>0n&&hi>0n&&mid>0n);
 assert.equal(lo+hi+mid,den);
 assert.equal(mid*200n,den*3n);
 assert.equal(lo*N[0]+hi*N[1]+mid*N[2],BigInt(entry.targetPercent)*D*den);
 const weights=R.calibrationForTarget(entry.targetPercent);
 assert.ok(Math.abs(weights.automaticReturnPercent-entry.targetPercent)<1e-10);
 assert.ok(Math.abs(weights.weights[0].weight-entry.lowWeight)<1e-12);
 assert.ok(Math.abs(weights.weights[1].weight-entry.highWeight)<1e-12);
 assert.equal(weights.weights[2].weight,.015);
}
for(const t of [50,90,150]){
 const reported=data.probabilityAtTargets[t],w=R.weightsForTarget(t).map(x=>x.weight);
 assert.deepEqual(w.map(x=>+x.toPrecision(12)),reported.profileWeights.map(x=>+x.toPrecision(12)));
 for(let len=2;len<=7;len++){
  const row=reported.finalLineCountProbability.find(r=>r.length===len);
  assert.ok(row);assert.equal(row.exactCountProbabilities.length,4);
  for(let k=0;k<4;k++){
   const actual=data.profiles.reduce((sum,p,i)=>sum+w[i]*p.finalLineCounts[len-2][k]/Number(D),0);
   assert.ok(Math.abs(actual-row.exactCountProbabilities[k])<1e-13);
  }
  assert.ok(Math.abs(row.exactCountProbabilities.reduce((a,b)=>a+b)-1)<1e-12);
 }
 for(let k=0;k<4;k++){
  const expected=data.profiles.reduce((sum,p,i)=>sum+w[i]*p.earlyTwoLineCounts[k]/53130,0);
  assert.ok(Math.abs(expected-reported.earlyTwoCountProbability[k])<1e-13);
 }
 for(let k=1;k<=7;k++){
  const expected=data.profiles.reduce((sum,p,i)=>sum+w[i]*p.gradeCounts[k]/53130,0);
  assert.ok(Math.abs(expected-reported.gradeProbability[k-1])<1e-13);
 }
 assert.ok(Math.abs(reported.jackpotProbability-w[0]*3/Number(D))<1e-15);
}
let enumerated=false;
if(process.argv[2]){
 const independent=JSON.parse(await fs.readFile(process.argv[2],'utf8'));
 assert.equal(independent.revision,265);assert.equal(independent.denominator,Number(D));
 assert.equal(independent.profiles.length,3);
 for(let i=0;i<3;i++){
  const a=independent.profiles[i],p=data.profiles[i];
  assert.deepEqual(a.initialFreeCells,p.initialFreeCells);
  assert.equal(a.optimalNumerator,p.optimalNumerator);
  assert.equal(a.jackpotOutcomeCount,i===0?3:0);
  assert.deepEqual(a.gradeCounts,p.gradeCounts);
  assert.deepEqual(a.earlyTwoLineCounts,p.earlyTwoLineCounts);
  assert.deepEqual(a.finalLineCounts,p.finalLineCounts);
 }
 enumerated=true;
}
console.log('DANGO_V265_CALIBRATION_PASS',JSON.stringify({molds:3,settings:101,exactCasesPerMold:Number(D),twoCellEarlyAny:1-data.profiles[0].earlyTwoLineCounts[0]/53130,rareJackpot:true,independentRecompiled:enumerated}));

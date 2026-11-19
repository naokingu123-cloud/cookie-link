import assert from 'node:assert/strict';import fs from 'node:fs/promises';import vm from 'node:vm';
const root=new URL('..',import.meta.url),data=JSON.parse(await fs.readFile(new URL('docs/dango-v266-calibration.json',root),'utf8'));
const ctx=vm.createContext({console});vm.runInContext(await fs.readFile(new URL('assets/dango-bingo-rules.js',root),'utf8'),ctx);
const R=ctx.DangoBingoRules.legacy266,D=BigInt(data.probabilityDenominator),N=data.profiles.map(p=>BigInt(p.optimalNumerator)),P=x=>JSON.parse(JSON.stringify(x));
assert.equal(R.REVISION,266);assert.equal(data.revision,266);assert.equal(data.profiles.length,3);
assert.deepEqual([2,3,4,5,6,7].map(l=>P(R.tiers[l].slice(1))),data.approvedPaytableHundredths);
for(let i=0;i<3;i++){const p=data.profiles[i],m=R.molds[i];assert.equal(m.id,p.id);assert.equal(m.optimalNumerator,p.optimalNumerator);assert.deepEqual(P(m.initialFreeCells),p.initialFreeCells);
 for(const row of p.finalLineCounts)assert.equal(row.reduce((a,b)=>a+b),Number(D));
 assert.equal(p.gradeCounts.slice(1).reduce((a,b)=>a+b),53130);
 assert.equal(p.jackpotOutcomeCount,i===0?3:0);
}
assert.equal(data.settings.length,101);
for(const item of data.settings){
 const lo=BigInt(item.lowWeightNumerator),hi=BigInt(item.highWeightNumerator),mid=BigInt(item.featuredWeightNumerator),den=BigInt(item.weightDenominator);
 assert.equal(lo+hi+mid,den);assert.equal(mid*200n,3n*den);
 assert.equal(lo*N[0]+hi*N[1]+mid*N[2],BigInt(item.target)*D*den);
 const c=R.calibrationForTarget(item.target);
 assert.ok(Math.abs(c.optimalReturnPercent-item.target)<1e-10);
 assert.ok(Math.abs(c.weights[1].weight-item.weights[1])<1e-13);
}
for(const target of [50,90,150]){
 const e=data.exampleProbabilities[target],w=R.weightsForTarget(target).map(x=>x.weight);
 assert.deepEqual(P(w.map(v=>v.toPrecision(13))),e.weights.map(v=>v.toPrecision(13)));
 for(const row of e.rows)for(const [count,key]of [[1,'one'],[2,'two'],[3,'three']]){
  const p=data.profiles.reduce((sum,profile,i)=>sum+w[i]*profile.finalLineCounts[row.length-2][count]/Number(D),0);
  assert.ok(Math.abs(p-row[key])<1e-14,row.length+' '+count);
 }
}
if(process.argv[2]){
 const fresh=JSON.parse(await fs.readFile(process.argv[2],'utf8'));assert.equal(fresh.revision,266);
 assert.equal(fresh.denominator,Number(D));assert.equal(fresh.profiles.length,3);
 for(let i=0;i<3;i++){const f=fresh.profiles[i],p=data.profiles[i];assert.deepEqual(f.initialFreeCells,p.initialFreeCells);assert.equal(f.optimalNumerator,p.optimalNumerator);assert.deepEqual(f.finalLineCounts,p.finalLineCounts);assert.equal(f.jackpotOutcomeCount,p.jackpotOutcomeCount);}
}
console.log('DANGO_V266_CALIBRATION_PASS',JSON.stringify({settings:101,molds:3,casesPerMold:Number(D),independent:!!process.argv[2]}));

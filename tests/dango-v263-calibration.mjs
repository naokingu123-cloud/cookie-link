import assert from 'node:assert/strict';import fs from 'node:fs/promises';import vm from 'node:vm';
const root=new URL('..',import.meta.url),data=JSON.parse(await fs.readFile(new URL('docs/dango-v263-calibration.json',root),'utf8'));
const ctx=vm.createContext({console});vm.runInContext(await fs.readFile(new URL('assets/dango-bingo-rules.js',root),'utf8'),ctx);
const R=ctx.DangoBingoRules,P=x=>JSON.parse(JSON.stringify(x)),D=BigInt(data.drawSpaceDenominator),nums=data.profiles.map(p=>BigInt(p.optimalNumerator));
assert.equal(R.REVISION,263);assert.deepEqual([3,4,5,6,7].map(n=>P(R.tiers[n].slice(1))),data.paytableHundredths);
assert.equal(data.profiles.length,3);assert.equal(data.settings.length,101);
for(let i=0;i<3;i++){const m=R.molds[i],p=data.profiles[i];assert.equal(m.id,p.id);assert.deepEqual(P(m.initialFreeCells),p.initialFreeCells);assert.equal(m.optimalNumerator,p.optimalNumerator);assert.equal(m.optimalReturnPercent,p.optimalNumerator/Number(D));for(const row of p.lineOutcomeCounts)assert.equal(row.reduce((a,b)=>a+b),Number(D));}
for(const s of data.settings){const low=BigInt(s.lowWeightNumerator),high=BigInt(s.highWeightNumerator),jp=BigInt(s.jackpotWeightNumerator),den=BigInt(s.weightDenominator);
 assert.equal(low+high+jp,den);assert.ok(low>0n&&high>0n);assert.equal(jp*200n,3n*den);assert.equal(low*nums[0]+high*nums[1]+jp*nums[2],BigInt(s.targetPercent)*D*den);
 const c=R.calibrationForTarget(s.targetPercent);assert.ok(Math.abs(c.weights[1].weight-s.highWeight)<1e-13);assert.ok(Math.abs(c.automaticReturnPercent-s.targetPercent)<1e-10);
}
assert.equal(data.fixedJackpotProfile.perJackpotLayoutOutcomeCount,10770);
assert.ok(data.fixedJackpotProfile.minimumMixedReturnPercent<50&&data.fixedJackpotProfile.maximumMixedReturnPercent>150);
let vectors=0,centers=0;
if(process.argv[2]){
 const fresh=JSON.parse(await fs.readFile(process.argv[2],'utf8'));
 assert.equal(fresh.rulesRevision,263);assert.equal(fresh.jackpotMultiplier,5000);assert.deepEqual(fresh.candidatePaytableHundredths,data.paytableHundredths);
 for(let i=0;i<3;i++){assert.equal(fresh.profiles[i].optimalNumerator,data.profiles[i].optimalNumerator);assert.equal(fresh.profiles[i].jackpotOutcomeCount,i===2?10770:0);}
 assert.equal(fresh.crossLanguageVectors.length,48);
 for(const v of fresh.crossLanguageVectors){
  let s=R.create({moldIndex:v.moldIndex,numbers:v.numbers,seed:263});
  for(const n of v.firstFiveNumbers)s=R.draw(s,n);
  for(const x of v.allCenterNumerators){assert.equal(R.expectedNumeratorForCenter(s,x.center),x.numerator,v.id+' center '+x.center);centers++;}
  assert.equal(R.autoPlace(s).expansionCenter,v.bestCenter,v.id+' best center');
  if(v.center!==null)s=R.placeFree(s,v.center);
  assert.deepEqual([...s.expansionCells].sort((a,b)=>a-b),[...v.footprint].sort((a,b)=>a-b));
  s=R.commitFree(s,{autoFill:false});for(const n of v.lateNumbers)s=R.draw(s,n);
  assert.equal(s.oddsMultiplier,v.finalOdds);assert.deepEqual([3,4,5,6,7].map(n=>s.lineCounts[n]),v.lineCounts);
  assert.equal(s.totalHundredths,v.payoutHundredths);vectors++;
 }
}
console.log('DANGO_V263_CALIBRATION_PASS',JSON.stringify({settings:101,vectors,centers,independent:!!process.argv[2]}));

import assert from 'node:assert/strict';import fs from 'node:fs/promises';import vm from 'node:vm';
const root=new URL('..',import.meta.url),data=JSON.parse(await fs.readFile(new URL('docs/dango-v264-calibration.json',root),'utf8'));
const context=vm.createContext({console});vm.runInContext(await fs.readFile(new URL('assets/dango-bingo-rules.js',root),'utf8'),context);
const R=context.DangoBingoRules.legacy264,P=x=>JSON.parse(JSON.stringify(x)),D=BigInt(data.drawSpaceDenominator),N=data.profiles.map(p=>BigInt(p.optimalNumerator)),L=[3,4,5,6,7];
assert.equal(data.rulesRevision,264);assert.equal(R.REVISION,264);
assert.deepEqual(P(L.map(l=>R.tiers[l].slice(1))),data.paytableHundredths);
assert.equal(data.profiles.length,3);
for(let i=0;i<3;i++){
 const p=data.profiles[i],m=R.molds[i];assert.equal(m.id,p.id);assert.equal(m.optimalNumerator,p.optimalNumerator);
 assert.equal(p.optimalReturnPercent,p.optimalNumerator/Number(D));
 assert.deepEqual(P(m.initialFreeCells),p.initialFreeCells);
 assert.equal(p.activationSetCounts.reduce((a,b)=>a+b),53130);
 assert.equal(p.lineOutcomeCounts.length,5);
 for(const row of p.lineOutcomeCounts)assert.equal(row.reduce((a,b)=>a+b),Number(D));
 assert.equal(p.lineOutcomeCounts[4][3],0);
}
assert.equal(data.settings.length,101);assert.equal(data.featuredProfile.weight,.015);
assert.ok(data.featuredProfile.minimumMixedReturnPercent<50);
assert.ok(data.featuredProfile.maximumMixedReturnPercent>150);
for(const s of data.settings){
 const low=BigInt(s.lowWeightNumerator),high=BigInt(s.highWeightNumerator),featured=BigInt(s.featuredWeightNumerator),den=BigInt(s.weightDenominator);
 assert.ok(low>0n&&high>0n);assert.equal(low+high+featured,den);assert.equal(featured*200n,den*3n);
 assert.equal(low*N[0]+high*N[1]+featured*N[2],BigInt(s.targetPercent)*D*den);
 const c=R.calibrationForTarget(s.targetPercent);
 assert.ok(Math.abs(c.weights[1].weight-s.highWeight)<1e-13);
 assert.ok(Math.abs(c.automaticReturnPercent-s.targetPercent)<1e-10);
}
let vectors=0,centers=0;
if(process.argv[2]){
 const fresh=JSON.parse(await fs.readFile(process.argv[2],'utf8'));
 assert.equal(fresh.rulesRevision,264);
 assert.deepEqual(fresh.candidatePaytableHundredths,data.paytableHundredths);
 assert.equal(fresh.profiles.length,3);assert.equal(fresh.crossLanguageVectors.length,48);
 for(let i=0;i<3;i++){
  assert.equal(fresh.profiles[i].optimalNumerator,data.profiles[i].optimalNumerator);
  assert.equal(fresh.profiles[i].jackpotOutcomeCount,0);
  assert.deepEqual(fresh.profiles[i].activationSetCounts,data.profiles[i].activationSetCounts);
 }
 for(const v of fresh.crossLanguageVectors){
  let s=R.create({moldIndex:v.moldIndex,numbers:v.numbers,seed:264});
  for(const n of v.firstFiveNumbers)s=R.draw(s,n);
  assert.equal(s.expansionLevel,v.activationCount,v.id);
  for(const x of v.allCenterNumerators){assert.equal(R.expectedNumeratorForCenter(s,x.center),x.numerator,v.id+' candidate '+x.center);centers++;}
  assert.equal(R.autoPlace(s).expansionCenter,v.bestCenter,v.id+' chosen center');
  if(v.center!==null)s=R.placeFree(s,v.center);
  assert.deepEqual([...s.expansionCells].sort((a,b)=>a-b),[...v.footprint].sort((a,b)=>a-b),v.id+' region');
  s=R.commitFree(s,{autoFill:false});
  for(const n of v.lateNumbers)s=R.draw(s,n);
  assert.deepEqual(L.map(l=>s.lineCounts[l]),v.lineCounts,v.id+' counts');
  assert.equal(s.oddsMultiplier,v.finalOdds,v.id+' odds');
  assert.equal(s.totalHundredths,v.payoutHundredths,v.id+' payout');
  vectors++;
 }
}
console.log('DANGO_V264_CALIBRATION_PASS',JSON.stringify({profiles:3,exactSettings:101,vectors,centers,oldJackpotUnreachable:true,independent:!!process.argv[2]}));

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const base=new URL('../',import.meta.url),read=p=>fs.readFile(new URL(p,base),'utf8');
const ctx=vm.createContext({console});vm.runInContext(await read('assets/dango-bingo-rules.js'),ctx);
const R=ctx.DangoBingoRules,doc=JSON.parse(await read('docs/dango-v288-calibration.json'));
const P=x=>JSON.parse(JSON.stringify(x)),D=doc.denominator;
assert.equal(R.REVISION,288);assert.equal(doc.revision,288);
assert.deepEqual(P(doc.paytableHundredths),P([2,3,4,5,6,7].map(l=>R.tiers[l].slice(1))));
assert.equal(D,53130*1140*2300);
const [w0,w1,w2]=doc.layoutWeights;
assert.equal(w0+w1+w2,1);
for(let i=0;i<3;i++){
 const p=doc.profiles[i],m=R.molds[i],weights=doc.cyanWeights;
 assert.equal(p.maxNumerator,m.automaticNumerator);
 assert.equal(p.uniformNumerator,m.uniformNumerator);
 assert.deepEqual(P(p.initialFreeCells),P(m.initialFreeCells));
 assert.equal(p.maxNumerator,p.byQuotaMax.reduce((s,n,j)=>s+n*weights[j],0));
 assert.equal(p.uniformNumerator,p.byQuotaUniform.reduce((s,n,j)=>s+n*weights[j],0));
}
const lo=doc.profiles.reduce((s,p,i)=>s+doc.layoutWeights[i]*p.uniformNumerator/D,0);
const hi=doc.profiles.reduce((s,p,i)=>s+doc.layoutWeights[i]*p.maxNumerator/D,0);
assert.ok(lo<50&&hi>150);
for(const entry of doc.settings){
 const c=R.calibrationForTarget(entry.target);
 assert.ok(Math.abs(c.minimumReturnPercent-lo)<1e-12);
 assert.ok(Math.abs(c.maximumReturnPercent-hi)<1e-12);
 assert.ok(Math.abs(c.maxPolicyProbability-entry.maxPolicyProbability)<1e-13);
 assert.ok(Math.abs(c.automaticReturnPercent-entry.target)<1e-10);
 assert.deepEqual(P(c.weights.map(x=>x.weight)),P(doc.layoutWeights));
}
for(const seed of [10,20,30,40,50])for(const placementPolicy of ['max','uniform']){
 const a=R.create({seed,placementPolicy,target:90}),b=R.create({seed,placementPolicy,target:150});
 // Target is chosen before drawing and can only affect the policy mixture,
 // not the distributions within either policy or what happens to a given seed.
 assert.deepEqual(P(a.numbers),P(b.numbers));
 assert.deepEqual(P(a.triggerCells),P(b.triggerCells));
 assert.equal(a.placementPolicy,placementPolicy);
 assert.equal(b.placementPolicy,placementPolicy);
}
const old=R.create({rulesRevision:287,seed:28810,target:90});
assert.equal(old.rulesRevision,287);assert.deepEqual(P(old),P(R.legacy287.create({rulesRevision:287,seed:28810,target:90})));
if(process.argv[2]){
 const fresh=JSON.parse(await fs.readFile(process.argv[2],'utf8'));
 assert.equal(fresh.revision,288);assert.equal(fresh.denominator,D);
 assert.equal(fresh.profiles.length,3);
 for(let i=0;i<3;i++)for(const k of ['initialFreeCells','maxNumerator','uniformNumerator','byQuotaMax','byQuotaUniform'])
  assert.deepEqual(fresh.profiles[i][k],doc.profiles[i][k],`independent C++ ${i} ${k}`);
}
console.log('DANGO_V288_CALIBRATION_PASS',JSON.stringify({targets:101,molds:3,minimum:lo,maximum:hi,cppVerified:!!process.argv[2],oldRoundsIntact:true}));

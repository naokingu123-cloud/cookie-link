'use strict';
// Revalue the already recorded v278 BET-100 samples. No new game is sampled,
// and these reused observations are not an independent validation sample.
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {R}=require('../tests/sixdrop-v247-fixture.cjs');
const inputPath='docs/qa-v278/sixdrop-payout-validation.json',input=fs.readFileSync(inputPath),prior=JSON.parse(input);
const roles=['line','triangle','hexagon'],runs=[];
for(const run of prior.holdout.runs){
 assert.equal(run.bet,100);assert.equal(run.rulesRevision,278);
 let oldNormal=0,newNormal=0;
 for(const role of roles){
  assert.equal(Object.values(run.counts[role]).reduce((sum,n)=>sum+n,0),run.N);
  for(const [count,n]of Object.entries(run.counts[role])){
   const old=R.roleTotal(role,Number(count),278),current=R.roleTotal(role,Number(count),280);
   assert.equal(old>0,current>0,'BET 100 keeps every positive/zero carry boundary unchanged');
   oldNormal+=n*old;newNormal+=n*current;
  }
 }
 assert(Math.abs(oldNormal/run.N-run.normal)<1e-10,'the archived role histogram reproduces its original recorded payout');
 const newPercent=newNormal/run.N+run.bonus;
 runs.push({rate:run.rate,games:run.N,seed:run.seed,drawSeed:run.drawSeed,previousPercent:run.actual,revaluedPercent:newPercent,differencePercentagePoints:newPercent-run.actual,rolePercent:newNormal/run.N,unchangedAllClearPercent:run.bonus});
}
const summary=[50,90,100,150].map(rate=>{
 const selected=runs.filter(r=>r.rate===rate),games=selected.reduce((sum,r)=>sum+r.games,0),average=key=>selected.reduce((sum,r)=>sum+r[key]*r.games,0)/games;
 return {rate,games,previousPercent:average('previousPercent'),revaluedPercent:average('revaluedPercent'),differencePercentagePoints:average('differencePercentagePoints')};
});
const output={version:280,coreSha256:crypto.createHash('sha256').update(fs.readFileSync('assets/sixdrop-progressive-core-v247.js')).digest('hex'),source:{path:inputPath,sha256:crypto.createHash('sha256').update(input).digest('hex')},method:'Paired revaluation of existing role-count histograms at BET 100. New payout tables do not change initial boards, RNG, shape counts, support probability, all-clear awards or positive/zero carry boundaries at this BET. Historical samples are reused, not newly generated or independent validation. No confidence interval is inferred for the revalued samples.',scope:'Direct Six Drop role and all-clear payouts; shared Sugar/JPC, physical roulette bias and adaptive payout feedback are excluded.',games:runs.reduce((sum,r)=>sum+r.games,0),payouts:roles.map(role=>({role,multipliers:Array.from({length:10},(_,i)=>R.roleTotal(role,i+1,280)/100)})),unchangedSupportProbabilityAnchors:R.SUPPORT_TABLE_V278,summary,runs};
process.stdout.write(JSON.stringify(output,null,2)+'\n');

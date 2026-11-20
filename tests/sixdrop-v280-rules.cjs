'use strict';
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {R,clone,batches,NUMBERS,fullRound}=require('./sixdrop-v278-fixture.cjs');
assert.equal(R.CURRENT_REVISION,280);assert.equal(R.GROUPED_REVISION,278);
const totals={
 line:[0,20,50,150,250,400,550,750,950,1200,1450],
 triangle:[0,50,200,400,750,1250,1750,2500,3250,4250,5250],
 hexagon:[0,100,400,800,1500,2500,3500,5000,6500,8500,10500]
};
for(const [role,table]of Object.entries(totals)){
 assert.deepEqual(table.map((_value,n)=>R.roleTotal(role,n,280)),table,role+' has the approved readable cumulative payouts');
 let previous=0;
 for(let n=1;n<=120;n++){
  const gain=R.roleAward(role,n-1,1,280);
  assert(Number.isInteger(gain)&&gain>0&&gain>=previous,'successive '+role+' gains never decrease at count '+n);
  if(n>=5)assert.equal(R.roleTotal(role,n,280)%50,0,'larger totals use half-BET units');
  previous=gain;
 }
}

// Captured from the deployed v279 core before the payout edit. These compare
// every saved field, timeline stage, RNG cursor and medal amount, rather than
// recomputing old expected values with the new implementation.
const historical=[
 {revision:248,seed:9,rate:90,bet:3000,removed:99,hash:'685d41a44f7365a747cc5add6b3bb74034f125b20ee186193b3cffe80253fb6e'},
 {revision:248,seed:31,rate:50,bet:101,removed:499,hash:'f5b298e03793cb7a5ae611e0b978d87bff60d5ec71f9833ebcc98d6c16834dfc'},
 {revision:248,seed:207,rate:150,bet:5,removed:199,hash:'9ed836e5d7ac637df226aaface287bcb548f0707e18508e4c797708aca141827'},
 {revision:278,seed:9,rate:90,bet:3000,removed:99,hash:'c27c189b66c419e7ac56b4d6653be430de728583556f8094ff98936dd8f5f2f2'},
 {revision:278,seed:31,rate:50,bet:101,removed:499,hash:'691bf364c450a1998d07cb9f1cd2802ed0f23ed3fddfc85ff4854f85050fb7bb'},
 {revision:278,seed:207,rate:150,bet:5,removed:199,hash:'b2c50420d2999bf94169d325b0868838889312dc165c747379afeade2910e616'}
];
for(const sample of historical){
 const {revision,seed,rate,bet,removed}=sample;
 let state=R.newGame({seed,rate,bet,rulesRevision:revision,carry:{bankUnits:123456,removed,feed:450,roundId:'prior-completed'}});
 const initial=clone(state),plans=[];
 for(const group of revision===278?batches(NUMBERS):NUMBERS.map(n=>[n])){
  const plan=revision===278?R.hitBatch(state,group,{trace:true}):R.hit(state,group[0],{trace:true});
  assert(plan);plans.push(plan);state=plan.state;assert.equal(state.rulesRevision,revision,'resolving a saved game does not upgrade its payouts');
 }
 const digest=crypto.createHash('sha256').update(JSON.stringify({initial,state,plans})).digest('hex');
 assert.equal(digest,sample.hash,'deployed revision '+revision+' replay is byte-for-byte unchanged');
}

const shapeKeys=['grid','rng','uid','draws','processed','feed','removedTotal','bankUnits','roundRemoved','counts','allClears','maxChain','palette','sugarAwarded','sugarTarget','carryAtStart','lastAllClearWin','bonusMedals'];
let games=0,groups=0,clears=0;
for(const rate of [50,90,150])for(const bet of [1,7,100,301])for(const seed of [1,3,9,19,31,207]){
 const carry={bankUnits:123456,removed:99,feed:450,roundId:'prior-completed'};
 let current=R.newGame({seed,bet,rate,carry,rulesRevision:280}),previous=R.newGame({seed,bet,rate,carry,rulesRevision:278});
 for(const key of shapeKeys)assert.deepEqual(current[key],previous[key],'the payout revision cannot change initial '+key);
 for(const batch of batches(NUMBERS)){
  const start=clone(current),plan=R.hitBatch(current,batch,{trace:true});
  const replay=R.hitBatch(clone(current),batch,{trace:true});assert.deepEqual(plan,replay,'current rules restore with exactly the same RNG and payout');
  previous=R.hitBatch(previous,batch,{trace:true}).state;current=plan.state;
  for(const key of shapeKeys)assert.deepEqual(current[key],previous[key],'the payout revision cannot change '+key);
  assert.equal(current.rulesRevision,280);
  const ordinary=Object.entries(current.counts).reduce((sum,[role,n])=>{assert(n<totals[role].length);return sum+Math.floor(bet*totals[role][n]/100);},0);
  assert.equal(R.totalMedals(current),ordinary+current.bonusMedals,'settlement sums the separately rounded displayed role totals');
  assert.equal(plan.gain,R.totalMedals(current)-R.totalMedals(start));
  const traceWin=plan.timeline.reduce((sum,stage)=>sum+(stage.winMedals||0),0);
  assert.equal(traceWin,plan.gain,'award animations and all-clear events conserve the settled WIN');
  if(current.processed<8)assert.deepEqual(R.carryOut(current),R.cleanCarry(carry),'unfinished current games retain their committed carry');
  groups++;
 }
 if(R.totalMedals(current)>0)assert.equal(R.carryOut(current).bankUnits,current.bankUnits);else assert.equal(R.carryOut(current).bankUnits,0);
 clears+=current.allClears;games++;
}
const twoLines=fullRound(1,{bet:101});assert.deepEqual(twoLines.state.counts,{line:2,triangle:0,hexagon:0});assert.equal(twoLines.win,50);
const mixed=fullRound(19,{bet:101});assert.deepEqual(mixed.state.counts,{line:2,triangle:1,hexagon:0});assert.equal(mixed.win,100,'two 0.5 BET role totals round separately');
assert.equal(fullRound(19,{bet:101,rulesRevision:278}).win,120,'the same saved v278 game keeps its old table');
console.log('SIXDROP_V280_RULES_PASS',JSON.stringify({historicalSnapshots:historical.length,games,groups,allClears:clears,roles:totals}));

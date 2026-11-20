'use strict';
const assert=require('node:assert/strict');
const legacy=require('./fixtures/sixdrop-legacy-v280.json');
const {R,clone,batches,NUMBERS,fullRound}=require('./sixdrop-v278-fixture.cjs');
const expected={
 line:[0,20,50,150,250,400,550,750,950,1200,1500,1800,2150,2550,2950,3400,3850,4350,4850,5400,6000],
 triangle:[0,50,200,400,700,1100,1600,2200,2900,3700,4500,5500,6500,7600,8800,10100,11500,13000,14600,16300,18000],
 hexagon:[0,100,400,800,1400,2200,3200,4400,5800,7400,9000,11000,13000,15200,17600,20200,23000,26000,29200,32600,36000]
};
assert.equal(R.CURRENT_REVISION,280);assert.equal(R.GROUPED_REVISION,278);
assert.deepEqual(R.BATCH_SIZES,[3,2,1,1,1]);
for(const [type,table]of Object.entries(expected)){
 assert.deepEqual(table.map((_value,n)=>R.roleTotal(type,n,280)),table,type+' approved cumulative table and continuation past ten');
 let previous=0;
 for(let n=1;n<=300;n++){
  const amount=R.roleAward(type,n-1,1,280);
  assert(amount>=previous,type+' successive marginal awards never decrease at count '+n);previous=amount;
  assert(Number.isSafeInteger(amount));
  if(n>=3)assert.equal(amount%({line:50,triangle:100,hexagon:200}[type]),0,'later marginal awards use clean steps');
  if(n%10===0)assert.equal(R.roleTotal(type,n,280),R.roleTotal(type,n,278),'each ten-count total retains the previous long-run growth');
 }
 assert.equal(R.roleAward(type,2,3,280),table[5]-table[2],'simultaneous roles pay only the cumulative difference');
}

// Captured from the published v278 core before this edit. Compare complete
// state, RNG, grids and awards at every old single/grouped boundary.
assert.equal(legacy.coreSha256,'a6596177ea77f1686a8117c1730cb3ba63108f18375c11c35543b0fc5be397dd');
for(const sample of legacy.cases){
 let state=R.newGame({...sample.options,carry:legacy.prior});assert.deepEqual(state,sample.states[0]);
 const groups=sample.options.rulesRevision===248?sample.numbers.map(n=>[n]):batches(sample.numbers);
 for(const [index,numbers]of groups.entries()){
  state=(sample.options.rulesRevision===248?R.hit(state,numbers[0]):R.hitBatch(state,numbers)).state;
  assert.deepEqual(state,sample.states[index+1],'published revision '+sample.options.rulesRevision+' checkpoint '+state.draws.length);
 }
 assert.equal(R.totalMedals(state),sample.win);assert.deepEqual(R.carryOut(state,'legacy-finished'),sample.carry);
}

const geometryKeys=['grid','rng','uid','draws','processed','feed','removedTotal','bankUnits','roundRemoved','bonusMedals','counts','allClears','maxChain','palette','sugarAwarded'];
let rounds=0,groups=0,changed=0,allClears=0;
for(const rate of [50,90,100,150])for(const bet of [1,333])for(let seed=1;seed<=8;seed++){
 let state=R.newGame({seed,bet,rate,carry:legacy.prior,rulesRevision:280});
 let old=R.newGame({seed,bet,rate,carry:legacy.prior,rulesRevision:278});
 const initial=clone(state);
 for(const numbers of batches(NUMBERS)){
  const before=state,plan=R.hitBatch(state,numbers,{trace:true}),previous=R.totalMedals(before);
  state=plan.state;old=R.hitBatch(old,numbers).state;groups++;
  assert.equal(state.rulesRevision,280);assert.equal(old.rulesRevision,278);
  for(const key of geometryKeys)assert.deepEqual(state[key],old[key],'rounded money must not change '+key);
  const normal=Object.keys(expected).reduce((sum,type)=>sum+Math.floor(bet*R.roleTotal(type,state.counts[type],280)/100),0);
  assert.equal(plan.totalWin,normal+state.bonusMedals);assert.equal(plan.gain,plan.totalWin-previous);
  for(const event of plan.timeline){
   if(event.phase==='pyramidAllClear')assert.equal(event.winMedals,Math.floor(event.bankUnits/100),'all-clear pays the retained canonical meter');
   for(const credit of event.progressiveCredits||[])assert.equal(credit.deltaUnits,bet*5,'one removal always adds BET × 0.05');
  }
  assert.equal(state.bankUnits,initial.bankUnits+state.roundRemoved*bet*5);
  assert.equal(state.removedTotal,initial.removedTotal+state.roundRemoved);
  assert.deepEqual(state.palette,initial.palette,'the four-color window stays fixed during the round');
  if(state.processed<8)assert.deepEqual(R.carryOut(state),initial.carryAtStart);
 }
 changed+=Number(R.totalMedals(state)!==R.totalMedals(old));allClears+=state.allClears;rounds++;
 assert.equal(R.totalMedals(state)>0,R.totalMedals(old)>0,'clean table preserves the existing continuation/reset classification');
 assert.deepEqual(R.carryOut(state),R.carryOut(old),'the existing continuous removal count and bank are preserved');
}
assert(changed>0,'the new table changes actual awards, not just their labels');
for(const [seed,oldWin,newWin]of [[1,60,50],[3,140,150]]){
 const old=fullRound(seed,{bet:100,carry:legacy.prior}),fresh=fullRound(seed,{bet:100,carry:legacy.prior,rulesRevision:280});
 assert.equal(old.win,oldWin);assert.equal(fresh.win,newWin);
}
const clear=fullRound(9,{bet:3000,carry:legacy.prior,rulesRevision:280});assert.equal(clear.state.allClears,2);
assert.equal(clear.state.removedTotal,234);assert.equal(R.carryOut(clear.state).removed,234);
const next=R.newGame({seed:9,bet:301,carry:R.carryOut(clear.state),rulesRevision:280});
assert.equal(next.removedTotal,234);assert.equal(next.roundRemoved,0);assert.deepEqual(next.palette,R.palette(234));
assert.equal(R.carryOut(fullRound(2,{carry:R.carryOut(clear.state),rulesRevision:280}).state).removed,0);
console.log('SIXDROP_V280_RULES_PASS',JSON.stringify({rounds,groups,changedAwards:changed,allClears,legacyCases:legacy.cases.length,table:expected}));

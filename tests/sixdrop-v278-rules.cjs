'use strict';
const assert=require('node:assert/strict');
const {R,G,clone,batches,NUMBERS,fullRound}=require('./sixdrop-v278-fixture.cjs');
const carry={version:247,bankUnits:123456,removed:99,feed:450,roundId:'prior-completed'};
const lineTotals=[0,20,60,140,240,380,540,740,960];
const roleScales={line:1,triangle:3,hexagon:6};
const roleWin=(bet,counts)=>Object.entries(counts).reduce((sum,[role,count])=>sum+Math.floor(bet*(count<lineTotals.length?lineTotals[count]*roleScales[role]:R.roleTotal(role,count,278))/100),0);
assert.equal(R.GROUPED_REVISION,278);
assert(R.CURRENT_REVISION>=R.GROUPED_REVISION);
assert.deepEqual(R.BATCH_SIZES,[3,2,1,1,1]);
for(const [role,scale]of Object.entries(roleScales)){
 assert.deepEqual(lineTotals.map((_n,count)=>R.roleTotal(role,count,278)),lineTotals.map(n=>n*scale),role+' cumulative count table');
 assert.deepEqual(lineTotals.slice(1).map((_n,index)=>R.roleAward(role,index,1,278)),[20,40,80,100,140,160,200,220].map(n=>n*scale),'successive role awards become larger');
 assert.equal(R.roleAward(role,2,3,278),320*scale,'three simultaneous roles pay the difference from count 2 to count 5');
 assert.equal(R.roleTotal(role,3,248),60*scale,'old saved rounds keep the old payout table');
}
const initial=R.newGame({seed:9,bet:3000,carry,rulesRevision:278}),unchanged=JSON.stringify(initial);
assert.deepEqual(initial.carryAtStart,R.cleanCarry(carry));
assert.deepEqual(R.carryOut(initial),R.cleanCarry(carry),'an unfinished zero-WIN board cannot erase a saved carry');
for(const bad of [[1],[1,2],[1,1,2],[0,1,2],[1,2,26],[1,2,2.5],[1,2,3,4],[],null]){
 assert.equal(R.hitBatch(initial,bad,{trace:true}),null,'invalid first group is rejected atomically');
 assert.equal(JSON.stringify(initial),unchanged);
}
assert.equal(R.hit(initial,6),null,'the old single-HIT API cannot partially resolve a modern group');
const first=R.hitBatch(initial,NUMBERS.slice(0,3),{trace:true});
assert.deepEqual(first.state.draws,NUMBERS.slice(0,3));assert.equal(first.state.processed,3);
assert.equal(JSON.stringify(initial),unchanged,'a planned group leaves its source intact');
assert.deepEqual(first,R.hitBatch(clone(initial),NUMBERS.slice(0,3),{trace:true}),'serialized RNG reproduces every phase');
for(const bad of [[14],[14,18,22],[6,14],[14,14]])assert.equal(R.hitBatch(first.state,bad),null,'second group has exactly two fresh numbers');
const permuted=R.hitBatch(initial,[10,6,2],{trace:true});
for(const key of ['grid','rng','bankUnits','roundRemoved','normalHundredths','bonusMedals','counts'])assert.deepEqual(permuted.state[key],first.state[key],'group order cannot insert a refill between simultaneous balls: '+key);
const hit=first.timeline.find(e=>e.phase==='pyramidHit'),broken=first.timeline.find(e=>e.phase==='pyramidBreak');
const numbered=initial.grid.flat().filter(tile=>tile&&NUMBERS.slice(0,3).includes(tile.number));
assert.equal(hit.cells.length,numbered.length);assert.deepEqual(hit.numbers,NUMBERS.slice(0,3));
assert.deepEqual(broken.removed.map(x=>x.tile.id).sort((a,b)=>a-b),numbered.map(x=>x.id).sort((a,b)=>a-b),'the first break removes all three numbers from the same original board');
assert.equal(first.timeline.filter(e=>e.phase==='pyramidHit'||e.phase==='pyramidMiss').length,1,'one HIT phase per group');
assert(first.timeline.filter(e=>e.phase==='pyramidTopUp').length<=1,'at most one refill after a group');
let sequential=clone(initial);sequential.rulesRevision=248;
for(const n of NUMBERS.slice(0,3))sequential=R.hit(sequential,n).state;
assert.notDeepEqual(first.state.grid,sequential.grid,'fixture distinguishes simultaneous resolution from three single-HIT refills');

function audit(plan,before){
 let bank=before.bankUnits,removed=0,normal=before.normalHundredths,bonus=before.bonusMedals,counts={...before.counts};
 const credited=new Set();
 for(const event of plan.timeline){
  if(event.removed?.length){
   assert.equal(event.bankUnitsBefore,bank);assert.equal(event.progressiveCredits.length,event.removed.length);
   for(const [i,credit]of event.progressiveCredits.entries()){
    assert.equal(credit.tileId,event.removed[i].tile.id);assert(!credited.has(credit.tileId),'a candy contributes only once');credited.add(credit.tileId);
    assert.equal(credit.deltaUnits,before.bet*5,'BET × 0.05 medal exactly, in hundredth-medal units');
    bank+=before.bet*5;removed++;assert.equal(credit.bankUnits,bank);
   }
   assert.equal(event.bankUnits,bank);
  }
  if(event.phase==='pyramidAward'){
   const previousRoleWin=roleWin(before.bet,counts);
   for(const type of Object.keys(roleScales)){
    const amount=event.forms.filter(f=>f.type===type).length;assert.equal(event[{line:'lines',triangle:'triangles',hexagon:'hexagons'}[type]],amount);
    counts[type]+=amount;
   }
   normal=Object.values(counts).every(n=>n<lineTotals.length)?Object.entries(counts).reduce((sum,[type,n])=>sum+lineTotals[n]*roleScales[type],0):event.normalHundredths;
   assert.equal(event.normalHundredths,normal);
   assert.equal(event.winMedals,roleWin(before.bet,counts)-previousRoleWin,'event pays the sum of each role table difference with separate medal rounding');
   assert(Number.isSafeInteger(event.winMedals)&&event.winMedals>=0);assert.equal(Math.floor(before.bet*event.gain/100),event.winMedals,'native event uses the actual medal delta');
   assert.equal(event.counts.line,counts.line);assert.equal(event.counts.triangle,counts.triangle);assert.equal(event.counts.hexagon,counts.hexagon);
  }
  if(event.phase==='pyramidAllClear'){
   assert.equal(G.count(event.grid),0,'all-clear event paints the truly empty board');
   assert.equal(event.winMedals,Math.floor(bank/100),'all-clear wins the complete progressive, once');
   bonus+=event.winMedals;assert.equal(event.bonusMedals,bonus);assert.equal(event.bankUnits,bank,'collecting the progressive does not spend its balance');
  }
 }
 assert.equal(removed,plan.removed);assert.equal(plan.state.bankUnits,bank);
 assert.equal(plan.state.removedTotal-before.removedTotal,removed);assert.equal(plan.state.roundRemoved-before.roundRemoved,removed);
 assert.equal(plan.state.bonusMedals,bonus);assert.equal(plan.totalWin,roleWin(before.bet,plan.state.counts)+bonus);
 assert.equal(plan.gain,plan.totalWin-R.totalMedals(before));
 assert.equal(plan.timeline.filter(e=>e.phase==='pyramidHit'||e.phase==='pyramidMiss').length,1);
 assert(plan.timeline.filter(e=>e.phase==='pyramidTopUp').length<=1);
 const refillIndex=plan.timeline.findIndex(e=>e.phase==='pyramidTopUp');
 if(refillIndex>=0)assert.equal(refillIndex,plan.timeline.length-1,'no match resolves after replenishment in the same group');
 assert.equal(G.drop(G.clone(plan.state.grid)).moves.length,0,'the replenished board remains physically supported');
 assert.equal(G.findShapes(plan.state.grid).length,0);assert.equal(R.connectedGroups(plan.state.grid).length,0);
 assert.deepEqual(plan.state.palette,before.palette,'crossing a 100-removal boundary keeps the current four colors');
 assert(plan.state.grid.flat().filter(Boolean).every(tile=>before.palette.includes(tile.color)));
 assert(plan.state.grid.flat().filter(Boolean).every(tile=>!plan.state.draws.includes(tile.number)),'new labels exclude every consumed group number');
}
let groups=0,rounds=0,clears=0,positive=0,zero=0;
for(const removed of [0,99,199,499])for(const rate of [50,90,150])for(let seed=1;seed<=9;seed++){
 let state=R.newGame({seed,bet:seed%2?301:3000,rate,carry:{...carry,removed},rulesRevision:278});
 const start=clone(state),fixed=[...state.palette];
 for(const group of batches(NUMBERS)){
  const before=state,plan=R.hitBatch(state,group,{trace:true});assert(plan);audit(plan,before);groups++;
  const preview=R.hitBatch(before,group,{preview:true});
  for(const key of ['bankUnits','normalHundredths','bonusMedals','counts','allClears','roundRemoved'])assert.deepEqual(preview.state[key],plan.state[key],'reach projection matches actual resolution: '+key);
  assert.equal(preview.state.rng,before.rng,'prediction consumes no refill randomness');state=plan.state;assert.deepEqual(state.palette,fixed);
  if(state.processed<8)assert.deepEqual(R.carryOut(state),start.carryAtStart,'an unfinished positive/all-clear round is not committed early');
 }
 assert.equal(state.processed,8);assert.equal(R.hitBatch(state,[1]),null);assert.equal(new Set(state.draws).size,8);
 assert.equal(state.bankUnits,start.bankUnits+state.roundRemoved*state.bet*5);assert.equal(state.removedTotal,removed+state.roundRemoved);
 const out=R.carryOut(state,'finished');
 if(R.totalMedals(state)>0){positive++;assert.equal(out.bankUnits,state.bankUnits);assert.equal(out.removed,state.removedTotal);}else{zero++;assert.equal(out.bankUnits,0);assert.equal(out.removed,0);assert.equal(out.feed,0);}
 clears+=state.allClears;rounds++;
}
assert(positive>0&&zero>0&&clears>0,'the sample exercises winning, zero and all-clear state branches');

// This full real-rule witness produces TWO all-clear awards. It also reaches
// the seventh line count, where the new convex payout differs materially.
const witness=fullRound(9,{bet:3000,carry,rulesRevision:278});
assert.deepEqual(witness.state.counts,{line:7,triangle:1,hexagon:0});assert.equal(witness.state.normalHundredths,800);
assert.equal(witness.win,56618);assert.equal(witness.state.allClears,2);assert.equal(witness.state.bonusMedals,32618);
const clearEvents=witness.plans.flatMap(p=>p.timeline).filter(e=>e.phase==='pyramidAllClear');
assert.deepEqual(clearEvents.map(e=>e.winMedals),[11284,21334]);
assert.equal(witness.state.lastAllClearWin,21334);
const saved=R.carryOut(witness.state,'two-clears'),next=R.newGame({seed:9,bet:301,carry:saved,rulesRevision:278});
assert.equal(next.bankUnits,witness.state.bankUnits,'a BET change leaves the carried medal value intact');
assert.deepEqual(next.palette,R.palette(witness.state.removedTotal),'only the next game uses the new four colors');
assert.notDeepEqual(next.palette,witness.initial.palette);assert.equal(next.roundRemoved,0);assert.equal(next.normalHundredths,0);assert.equal(next.bonusMedals,0);
const noWin=fullRound(2,{bet:3000,carry:saved,rulesRevision:278});assert.equal(noWin.win,0);assert.equal(R.carryOut(noWin.state).bankUnits,0);assert.equal(R.carryOut(noWin.state).removed,0);
for(const bet of [1,3,7,301,333]){
 const mixed=fullRound(9,{bet,carry,rulesRevision:278}),tableWin=Math.floor(bet*740/100)+Math.floor(bet*60/100);
 assert.deepEqual(mixed.state.counts,{line:7,triangle:1,hexagon:0});
 assert.equal(mixed.win-mixed.state.bonusMedals,tableWin,'BET '+bet+': sum of displayed role amounts is the actual settled ordinary WIN');
 let previous=mixed.initial;for(const plan of mixed.plans){audit(plan,previous);previous=plan.state;}
 if(bet===1)assert.notEqual(tableWin,Math.floor(bet*800/100),'mixed-role BET 1 distinguishes separate table rounding from the obsolete combined floor');
}
console.log('SIXDROP_V278_RULES_PASS',JSON.stringify({rounds,groups,positive,zero,allClears:clears,witness:{seed:9,win:witness.win,counts:witness.state.counts,clearWins:clearEvents.map(e=>e.winMedals)}}));

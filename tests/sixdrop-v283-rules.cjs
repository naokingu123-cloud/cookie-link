'use strict';
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {R,G,clone,NUMBERS,batches,fullRound}=require('./sixdrop-v283-history.cjs');
assert.equal(R.CURRENT_REVISION,283);assert.equal(R.SINGLE_REVISION,283);
assert.equal(R.GROUPED_REVISION,278);assert.equal(R.ROUNDED_REVISION,280);
assert.deepEqual(R.BATCH_SIZES,[3,2,1,1,1],'the historic grouped schedule remains available');
for(const revision of [248,278,280,283]){
 const grouped=revision===278||revision===280;
 assert.equal(R.isGrouped(revision),grouped);assert.equal(R.isGrouped({rulesRevision:revision}),grouped);
 assert.deepEqual(batches(NUMBERS,revision).map(group=>group.length),grouped?[3,2,1,1,1]:[1,1,1,1,1,1,1,1]);
 assert.equal(R.batchSize(8,revision),0);
}
assert.equal(R.batchSize(0),3,'omitting revision preserves the historical helper contract');
for(const role of ['line','triangle','hexagon'])for(let count=0;count<=120;count++)assert.equal(R.roleTotal(role,count,283),R.roleTotal(role,count,280),'283 retains the rounded '+role+' table');

// Captured BEFORE this change from main 3d706b73. The digest covers every
// serialized state field, complete timeline, RNG cursor and actual medal WIN.
// Baseline core SHA-256: 7be0268b8598e308d54b355b980e61c292017aeefd56249e628832c076c14fe8.
const historical=[
 [248,9,90,3000,99,'685d41a44f7365a747cc5add6b3bb74034f125b20ee186193b3cffe80253fb6e'],
 [248,31,50,101,499,'f5b298e03793cb7a5ae611e0b978d87bff60d5ec71f9833ebcc98d6c16834dfc'],
 [248,207,150,5,199,'9ed836e5d7ac637df226aaface287bcb548f0707e18508e4c797708aca141827'],
 [278,9,90,3000,99,'c27c189b66c419e7ac56b4d6653be430de728583556f8094ff98936dd8f5f2f2'],
 [278,31,50,101,499,'691bf364c450a1998d07cb9f1cd2802ed0f23ed3fddfc85ff4854f85050fb7bb'],
 [278,207,150,5,199,'b2c50420d2999bf94169d325b0868838889312dc165c747379afeade2910e616'],
 [280,9,90,3000,99,'b4f7440cf3bdf8ac354cce35f7bdc57c3921f809e23974e3e221f4ffd5439c04'],
 [280,31,50,101,499,'3889d30bf82477d22b34c5541ad6210825095faf6415c48edafe763b66c0b497'],
 [280,207,150,5,199,'dd1e938d10313a8d8d735d8c150449b7a8680e72a149660ebf67c44770e626e3']
];
for(const [rulesRevision,seed,rate,bet,removed,hash]of historical){
 const result=fullRound(seed,{rulesRevision,rate,bet,carry:{bankUnits:123456,removed,feed:450,roundId:'prior-completed'}});
 assert.equal(crypto.createHash('sha256').update(JSON.stringify({initial:result.initial,state:result.state,plans:result.plans})).digest('hex'),hash,'saved revision '+rulesRevision+' stays byte-identical');
 let before=result.initial;
 for(const plan of result.plans){
  assert.equal(plan.state.rulesRevision,rulesRevision);
  assert(!Object.hasOwn(plan.timeline[0],'affectedCells'),'historic timeline fields remain unchanged');
  const input=plan.state.draws.slice(before.draws.length);
  const replay=R.isGrouped(before)?R.hitBatch(clone(before),input,{trace:true}):R.hit(clone(before),input[0],{trace:true});
  assert.deepEqual(replay,plan,'every historical processing boundary resumes identically');before=plan.state;
 }
}

// Independently derive hex adjacency from the shipped lattice's real circle
// centres, rather than copying the production neighbour function into a test.
const positions=G.empty(10).flatMap((row,r)=>row.map((_,c)=>({r,c,key:r*16+c,...G.point(r,c,10)})));
const keyOf=([r,c])=>r*16+c;
function expectedArea(grid,centres){
 return positions.filter(p=>grid[p.r][p.c]&&centres.some(([r,c])=>{
  const q=G.point(r,c,10),distance=Math.hypot(p.x-q.x,p.y-q.y);
  return distance<1e-8||Math.abs(distance-1)<1e-8;
 })).map(p=>[p.r,p.c]);
}
const base=R.newGame({seed:179,bet:101,rulesRevision:283});base.grid=G.empty(10);base.uid=positions.length;
for(const [index,p]of positions.entries())base.grid[p.r][p.c]={id:index+1,color:base.palette[(p.r*3+p.c)%4],number:null};
const degrees={};
function verifyPrimary(state,centres,label){
 for(const [r,c]of centres)state.grid[r][c].number=1;
 const json=JSON.stringify(state),expected=expectedArea(state.grid,centres),plan=R.hit(state,1,{trace:true,preview:true});
 assert(plan);assert.equal(JSON.stringify(state),json,label+': planning preserves input');
 const hit=plan.timeline[0],broken=plan.timeline[1];
 assert.equal(hit.phase,'pyramidHit');assert.deepEqual(hit.cells,centres);assert.deepEqual(hit.numbers,[1]);
 assert.deepEqual(hit.affectedCells,expected,label+': exactly the occupied centre and radius-one neighbours');
 assert.equal(broken.phase,'pyramidBreak');assert.deepEqual(broken.removed.map(drop=>[drop.r,drop.c]),expected,label+': first break is that same finite union');
 assert.equal(new Set(broken.removed.map(drop=>drop.tile.id)).size,expected.length,label+': overlapping neighbourhoods never double remove');
 assert.equal(broken.progressiveCredits.length,expected.length);
 assert.equal(broken.bankUnits-state.bankUnits,expected.length*state.bet*5,label+': one original 0.05 BET contribution per actual drop');
 assert.equal(plan.state.rng,state.rng,'preview consumes no refill RNG');
 return expected.length;
}
for(const p of positions){
 const count=verifyPrimary(clone(base),[[p.r,p.c]],'cell '+p.r+'/'+p.c);degrees[count]=(degrees[count]||0)+1;
}
assert(degrees[7]>0&&Object.keys(degrees).some(n=>Number(n)<7),'interior and cabinet-edge cells are exercised');
const overlapping=clone(base);verifyPrimary(overlapping,[[4,3],[4,4]],'overlapping HIT rings');
const holes=clone(base);for(const [r,c]of [[3,3],[4,2],[5,3]])holes.grid[r][c]=null;
verifyPrimary(holes,[[4,3]],'empty neighbours are excluded');

const start=R.newGame({seed:10,bet:3000,rulesRevision:283,carry:{bankUnits:123456,removed:99,feed:450,roundId:'prior-completed'}}),beforeStart=JSON.stringify(start);
for(const bad of [0,26,-1,1.5,null,undefined,'1',NaN])assert.equal(R.hit(start,bad),null,'invalid single number is rejected');
for(const bad of [[1],[1,2,3],[],null])assert.equal(R.hitBatch(start,bad),null,'283 cannot be resolved through the grouped API');
assert.equal(JSON.stringify(start),beforeStart);
const miss=clone(start);for(const tile of miss.grid.flat())if(tile?.number===1)tile.number=null;
const missed=R.hit(miss,1,{trace:true});assert.equal(missed.timeline[0].phase,'pyramidMiss');assert.deepEqual(missed.timeline[0].cells,[]);assert.deepEqual(missed.timeline[0].affectedCells,[]);
assert(!missed.timeline.some(event=>event.phase==='pyramidBreak'),'a miss causes no primary removal');assert.equal(missed.state.processed,1);assert.deepEqual(missed.state.draws,[1]);

function roleWin(state,counts=state.counts){return Object.entries(counts).reduce((sum,[type,n])=>sum+Math.floor(state.bet*R.roleTotal(type,n,state)/100),0);}
function audit(plan,before){
 let bank=before.bankUnits,removed=0,bonus=before.bonusMedals,counts={...before.counts};const credited=new Set();
 for(const event of plan.timeline){
  if(event.removed?.length){
   assert.equal(event.bankUnitsBefore,bank);assert.equal(event.progressiveCredits.length,event.removed.length);
   event.progressiveCredits.forEach((credit,index)=>{
    assert.equal(credit.tileId,event.removed[index].tile.id);assert(!credited.has(credit.tileId),'a drop earns progressive credit only once');credited.add(credit.tileId);
    assert.equal(credit.deltaUnits,before.bet*5);bank+=credit.deltaUnits;removed++;assert.equal(credit.bankUnits,bank);
   });assert.equal(event.bankUnits,bank);
  }
  if(event.phase==='pyramidAward'){
   const old=roleWin(before,counts);for(const form of event.forms)counts[form.type]++;
   assert.deepEqual(event.counts,counts);assert.equal(event.winMedals,roleWin(before,counts)-old,'the displayed rounded role tables pay the real medal increment');
   assert.equal(Math.floor(before.bet*event.gain/100),event.winMedals);
  }
  if(event.phase==='pyramidAllClear'){
   assert.equal(G.count(event.grid),0);assert.equal(event.winMedals,Math.floor(bank/100));bonus+=event.winMedals;
   assert.equal(event.bonusMedals,bonus);assert.equal(event.bankUnits,bank,'all-clear pays without consuming the progressive');
  }
 }
 assert.equal(plan.removed,removed);assert.equal(plan.state.bankUnits,bank);assert.equal(plan.state.removedTotal-before.removedTotal,removed);
 assert.equal(plan.totalWin,roleWin(plan.state)+bonus);assert.equal(plan.gain,plan.totalWin-R.totalMedals(before));
 assert.equal(plan.timeline.reduce((sum,event)=>sum+(event.winMedals||0),0),plan.gain,'timeline and actual settlement conserve WIN');
 assert.equal(plan.timeline.filter(event=>event.phase==='pyramidHit'||event.phase==='pyramidMiss').length,1);
 assert(plan.timeline.filter(event=>event.phase==='pyramidTopUp').length<=1);
 const topUp=plan.timeline.findIndex(event=>event.phase==='pyramidTopUp');if(topUp>=0)assert.equal(topUp,plan.timeline.length-1,'refill ends the single draw');
 assert.equal(G.drop(G.clone(plan.state.grid)).moves.length,0);assert.equal(G.findShapes(plan.state.grid).length,0);assert.equal(R.connectedGroups(plan.state.grid).length,0);
 assert.deepEqual(plan.state.palette,before.palette);assert(plan.state.grid.flat().filter(Boolean).every(tile=>before.palette.includes(tile.color)&&!plan.state.draws.includes(tile.number)));
}
let games=0,steps=0,clears=0,positive=0,zero=0;
for(const rate of [50,90,150])for(const bet of [1,101,3000])for(const seed of [1,6,10,31])for(const removed of [99,499]){
 const carry={bankUnits:123456,removed,feed:450,roundId:'prior-completed'};let state=R.newGame({seed,rate,bet,carry,rulesRevision:283});
 for(const [index,number]of NUMBERS.entries()){
  const before=state,plan=R.hit(before,number,{trace:true});assert(plan);audit(plan,before);
  assert.deepEqual(plan,R.hit(clone(before),number,{trace:true}),'serialized new-game RNG resumes every single ball');
  const preview=R.hit(before,number,{trace:true,preview:true});assert.equal(preview.state.rng,before.rng);
  for(const key of ['bankUnits','normalHundredths','bonusMedals','counts','allClears','roundRemoved','removedTotal','draws','processed'])assert.deepEqual(preview.state[key],plan.state[key],'next-ball projection matches '+key);
  state=plan.state;assert.equal(state.processed,index+1);assert.equal(state.draws.length,index+1);assert.equal(state.rulesRevision,283);
  assert.equal(R.hit(state,number),null,'a received number cannot be replayed');
  if(index<7)assert.deepEqual(R.carryOut(state),R.cleanCarry(carry),'unfinished single games keep the committed starting carry');
  steps++;
 }
 assert.equal(R.hit(state,1),null,'eight balls end the round');
 const out=R.carryOut(state,'complete');
 if(R.totalMedals(state)>0){positive++;assert.equal(out.bankUnits,state.bankUnits);assert.equal(out.removed,state.removedTotal);}
 else{zero++;assert.equal(out.bankUnits,0);assert.equal(out.removed,0);assert.equal(out.feed,0);}
 clears+=state.allClears;games++;
}
assert(positive&&zero&&clears,'new mechanics exercise positive, own-zero and all-clear outcomes');
const carry={bankUnits:123456,removed:99,feed:450,roundId:'prior-completed'},winning=fullRound(10,{bet:3000,carry}),losing=fullRound(6,{bet:3000,carry});
assert(winning.state.allClears>0);assert.equal(losing.win,0);assert.equal(R.carryOut(losing.state).bankUnits,0);
const next=R.newGame({seed:10,bet:301,carry:R.carryOut(winning.state),rulesRevision:283});assert.equal(next.bankUnits,winning.state.bankUnits);assert.deepEqual(next.palette,R.palette(winning.state.removedTotal));
console.log('SIXDROP_V283_RULES_PASS',JSON.stringify({historicalSnapshots:historical.length,primaryPositions:positions.length,primaryAreaSizes:degrees,overlapAndEmptyNeighbours:true,games,steps,positive,zero,allClears:clears,witnesses:{allClear:{seed:10,win:winning.win,clears:winning.state.allClears},zero:{seed:6,win:losing.win}}}));

'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const {R,G}=require('./sixdrop-v247-fixture.cjs');
const {G:fastGeometry}=require('../scripts/sixdrop-v284-geometry.cjs');
const fastRules=globalThis.SweetsSixDropV247.create(fastGeometry),clone=value=>JSON.parse(JSON.stringify(value));
assert.equal(R.CURRENT_REVISION,284);assert.equal(R.BALANCED_REVISION,284);assert.equal(R.SINGLE_REVISION,283);
const progress=[0,1,2,3,4,5,6,8,7];
for(const removed of [0,1,99,100,199,200,201,399,400,999,1000,1599,1600,1799,1800,1999,2000,1000000000]){
 const band=Math.floor(removed/200)%9,expected=Array.from({length:4},(_,i)=>progress[(band+i)%9]).reverse();
 assert.deepEqual(R.palette(removed,284),expected,'every cumulative200 boundary uses cyclic four-color window');
 const state=R.newGame({seed:103,rate:90,carry:{removed},rulesRevision:284});
 assert.deepEqual(state.palette,expected);assert(state.grid.flat().filter(Boolean).every(t=>expected.includes(t.color)));
}
assert.deepEqual(R.palette(99),R.palette(99,248),'omitted palette revision keeps historical helper contract');
assert.equal(R.creditPerDrop(284),.2);for(const revision of [248,278,280,283])assert.equal(R.creditPerDrop(revision),5);
for(const bet of [1,2,3,5,10,101,3000,10000000000])for(const start of [0,1,2,3,4,199,200,499,1000000000]){
 let actual=0;for(let n=0;n<25;n++){const delta=R.creditUnitsForDrop(bet,start+n,284);assert(Number.isSafeInteger(delta)&&delta>=0);actual+=delta;}
 assert.equal(actual,bet*5,'25 actual removals accrue exactly0.05BET, including fractional-credit bets');
 assert.equal(R.creditUnitsForDrop(bet,start,283),bet*5);
}
for(const role of ['line','triangle','hexagon']){
 let last=0,lastGain=0;
 for(let n=1;n<=100;n++){
  const pay=R.roleTotal(role,n,284),gain=pay-last;assert(pay>last&&gain>=lastGain,'multi-role rewards grow with nondecreasing increments');last=pay;lastGain=gain;
  for(const target of [50,75,90,100,125,150])assert.equal(R.roleTotal(role,n,{rulesRevision:284,target}),pay,'P/O cannot change displayed payouts');
 }
}
for(const rate of [50,75,90,100,125,150])assert.equal(R.numberPlacementBias(rate),R.numberPlacementBias(90),'P/O cannot visibly concentrate numbers in a different region');
for(let rate=50;rate<=150;rate++){
 assert.equal(R.colorCohesion(rate,2),R.colorCohesion(rate,4),'2and4BET share proportional whole-medal floors');
 for(const bet of [6,7,8,9])assert.equal(R.colorCohesion(rate,bet),R.colorCohesion(rate,5),'5–9BET share carry threshold correction');
 assert(R.colorCohesion(rate,3)>R.colorCohesion(rate,2),'3BET receives compensation for its half-medal award loss');
 for(const bet of [1,2,3,4,5,7,10,100,3000]){
  const probability=R.colorCohesion(rate,bet);assert(probability>=0&&probability<=1);
  if(rate>50)assert(probability>=R.colorCohesion(rate-1,bet),'targetinterpolation must be monotone within each floorclass');
 }
}
// A precise boundary case isolates primary removal from chance cascades.
for(const removedBefore of [199,399,1599,1799])for(const bet of [1,5,101]){
 const state=R.newGame({seed:73,bet,rate:90,carry:{bankUnits:12345,removed:removedBefore},rulesRevision:284});
 state.grid=G.empty(10);state.grid[9][0]={id:1,color:state.palette[0],number:1};state.uid=1;
 const before=clone(state),plan=R.hit(state,1,{trace:true});assert.equal(plan.removed,1);assert.equal(plan.state.removedTotal,removedBefore+1);
 assert.deepEqual(state,before,'planning never mutates its input');assert.deepEqual(plan.state.palette,R.palette(removedBefore+1,284));
 const credit=plan.timeline.find(e=>e.phase==='pyramidBreak').progressiveCredits[0];
 assert.equal(credit.deltaUnits,R.creditUnitsForDrop(bet,removedBefore,284));assert.equal(credit.removedTotal,removedBefore+1);
 for(const event of plan.timeline)assert(Number.isSafeInteger(event.removedTotal));
 assert.equal(plan.state.bankUnits,before.bankUnits+credit.deltaUnits);
 assert.equal(plan.state.lastAllClearWin,Math.floor(plan.state.bankUnits/100));
 assert(plan.state.grid.flat().filter(Boolean).every(t=>plan.state.palette.includes(t.color)));
 const preview=R.hit(state,1,{trace:true,preview:true});assert.equal(preview.state.rng,state.rng);assert.equal(preview.totalWin,plan.totalWin);
}
// Independently measure the hex radius-one neighborhood at every one of75
// positions, including edges. The primary hit still clears exactly that set.
const positions=G.empty(10).flatMap((row,r)=>row.map((_,c)=>({r,c,...G.point(r,c,10)}))),degrees={};
const primary=R.newGame({seed:73,bet:1,rulesRevision:284});primary.grid=G.empty(10);
for(const [i,p]of positions.entries())primary.grid[p.r][p.c]={id:i+1,color:primary.palette[(p.r*3+p.c)%4],number:null};
for(const centre of positions){
 const state=clone(primary);state.grid[centre.r][centre.c].number=1;
 const expected=positions.filter(p=>{const distance=Math.hypot(p.x-centre.x,p.y-centre.y);return distance<1e-8||Math.abs(distance-1)<1e-8;}).map(p=>[p.r,p.c]);
 const plan=R.hit(state,1,{trace:true,preview:true}),hit=plan.timeline[0],removed=plan.timeline[1];
 assert.deepEqual(hit.affectedCells,expected);assert.deepEqual(removed.removed.map(t=>[t.r,t.c]),expected);
 assert.equal(removed.progressiveCredits.length,expected.length);assert.equal(new Set(removed.progressiveCredits.map(t=>t.tileId)).size,expected.length);
 degrees[expected.length]=(degrees[expected.length]||0)+1;
}
assert(degrees[7]>0&&Object.keys(degrees).some(n=>Number(n)<7));
let preservedSurvivors=0,zeroCreditSteps=0,geometryGames=0;
for(let seed=1;seed<=96;seed++){
 const rate=[50,75,90,100,125,150][seed%6],bet=[1,5,10,100,3000][seed%5],carry={bankUnits:19400,removed:[0,199,399,1799][seed%4],feed:75};
 let raw=R.newGame({seed,rate,bet,carry,rulesRevision:284}),fast=fastRules.newGame({seed,rate,bet,carry,rulesRevision:284});assert.deepEqual(fast,raw);
 let draw=(seed*456787+9191)>>>0;const numbers=Array.from({length:25},(_,i)=>i+1);
 for(let i=24;i>0;i--){draw=(Math.imul(draw,1664525)+1013904223)>>>0;const j=Math.floor(draw/4294967296*(i+1));[numbers[i],numbers[j]]=[numbers[j],numbers[i]];}
 for(const number of numbers.slice(0,8)){
  const prior=raw,oldColors=new Map(prior.grid.flat().filter(Boolean).map(t=>[t.id,t.color]));
  const rawPlan=R.hit(raw,number,{trace:true}),fastPlan=fastRules.hit(fast,number,{trace:true});assert.deepEqual(fastPlan,rawPlan,'cached collision geometry reproduces full canonical state and animation timeline');
  raw=rawPlan.state;fast=fastPlan.state;
  for(const tile of raw.grid.flat().filter(Boolean))if(oldColors.has(tile.id)){assert.equal(tile.color,oldColors.get(tile.id),'window changes never recolor survivors');preservedSurvivors++;}
  const beforeBank=prior.bankUnits,credits=rawPlan.timeline.flatMap(e=>e.progressiveCredits||[]);
  assert.equal(credits.length,rawPlan.removed);assert.equal(credits.reduce((sum,e)=>sum+e.deltaUnits,beforeBank),raw.bankUnits);
  for(const credit of credits){assert(Number.isSafeInteger(credit.bankUnits));zeroCreditSteps+=Number(credit.deltaUnits===0);}
  assert.equal(rawPlan.timeline.reduce((sum,e)=>sum+(e.winMedals||0),0),rawPlan.gain);
  if(raw.draws.length<8)assert.deepEqual(R.carryOut(raw),R.cleanCarry(carry));
  assert.equal(G.count(raw.grid),fastGeometry.count(fast.grid));
 }
 const out=R.carryOut(raw),win=R.totalMedals(raw);assert.equal(out.removed,win>0?raw.removedTotal:0);assert.equal(out.bankUnits,win>0?raw.bankUnits:0);geometryGames++;
}
assert(preservedSurvivors>0&&zeroCreditSteps>0);
const result={revision:284,primaryPositions:positions.length,primaryAreaSizes:degrees,colorBoundaries:true,cyclicBeyond1800:true,survivorColorsUnchanged:preservedSurvivors,integerCreditsAtFractionalBets:true,zeroCreditSteps,unchangedRateIndependentPayouts:true,rateIndependentNumberSpread:true,rawAndCachedGeometryEquivalentGames:geometryGames,comparedBallTimelines:geometryGames*8,coreSha256:crypto.createHash('sha256').update(fs.readFileSync('assets/sixdrop-progressive-core-v247.js')).digest('hex')};
console.log('SIXDROP_V284_RULES_PASS '+JSON.stringify(result));

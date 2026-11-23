'use strict';
const assert=require('node:assert/strict');
const {R,G}=require('./sixdrop-v247-fixture.cjs');
const clone=value=>JSON.parse(JSON.stringify(value));
assert.equal(R.CURRENT_REVISION,285);
assert.equal(R.FIXED_PALETTE_REVISION,285);
assert.equal(R.BALANCED_REVISION,284);
assert.equal(R.creditPerDrop(285),.4);
assert.equal(R.creditPerDrop(284),.2);
assert.equal(R.numberPlacementBias(90,285),.06);
assert.equal(R.NUMBER_EDGE_BIAS_V285,.4);
assert.ok(R.numberPlacementBias(50,285)<R.numberPlacementBias(90,284));
for(const rate of [50,90,150])assert.ok(R.colorCohesion(rate,100,285)<=.075);
assert.equal(R.numberPlacementBias(90,284),.16);
const progress=[0,1,2,3,4,5,6,8,7];
for(const removed of [0,1,198,199,200,201,399,400,1600,1800,2000,4001]){
 const expected=Array.from({length:4},(_,i)=>progress[(Math.floor(removed/200)+i)%9]).reverse();
 let state=R.newGame({seed:7,bet:100,rate:90,carry:{removed},rulesRevision:285});
 assert.deepEqual(state.palette,expected,'new game picks band from prior cleared total');
 const starting=clone(state);
 state.grid=G.empty(10);state.uid=1;state.grid[9][0]={id:1,color:expected[0],number:1};
 const next=R.hit(state,1,{trace:true});
 assert.equal(next.state.removedTotal,removed+1);
 assert.deepEqual(next.state.palette,expected,'palette cannot change during refill, even crossing 200');
 assert.ok(next.state.grid.flat().filter(Boolean).every(t=>expected.includes(t.color)));
 assert.deepEqual(starting.palette,expected);
 const newer=R.newGame({seed:7,bet:100,rate:90,carry:{removed:removed+1},rulesRevision:285});
 assert.deepEqual(newer.palette,R.palette(removed+1,285),'next round may change band');
}
// Meter uses bankUnits (1/100 medal). Five drops accrue exactly 0.02 BET,
// twice the former 0.01 BET over five drops, including fractional small BETs.
for(const bet of [1,2,3,5,7,10,100,3000])for(const removed of [0,1,3,4,199,201]){
 let s=0;for(let i=0;i<5;i++)s+=R.creditUnitsForDrop(bet,removed+i,285);
 assert.equal(s,bet*2);
 let old=0;for(let i=0;i<5;i++)old+=R.creditUnitsForDrop(bet,removed+i,284);
 assert.equal(old,bet);
}
const a=R.newGame({seed:12,bet:100,rulesRevision:284,carry:{removed:199}});
a.grid=G.empty(10);a.uid=1;a.grid[9][0]={id:1,color:a.palette[0],number:1};
const old=R.hit(a,1);assert.deepEqual(old.state.palette,R.palette(200,284),'v284 saved rounds preserve prior midgame band switch');
assert.equal(old.state.bankUnits,20,'v284 still earns 0.002 BET per removed');
console.log('SIXDROP_V285_RULES_PASS',JSON.stringify({bandLocked:true,stageChangesBetweenRounds:true,firstBoundary:200,numberBias:'small row + symmetric edge',creditPerDrop:.004,legacy284:true}));

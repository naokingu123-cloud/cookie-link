'use strict';
const assert=require('node:assert/strict');
const {R,G}=require('./sixdrop-v247-fixture.cjs');
const expected=[[0,['lime','green','aqua','navy']],[75,['yellow','lime','green','aqua']],[150,['orange','yellow','lime','green']],[225,['red','orange','yellow','lime']],[300,['violet','red','orange','yellow']]];
for(const [feed,names]of expected)assert.deepEqual(R.palette(feed).map(i=>R.RING[i]),names);
assert.equal(R.roleAward('line',0),10);assert.equal(R.roleAward('line',1),20);assert.equal(R.roleAward('triangle',0),30);assert.equal(R.roleAward('hexagon',0),60);
assert.equal(R.roleAward('hexagon',2,3),60*(3+4+5));
for(const bet of [1,3,7,100,27000,1000003])for(const n of [0,1,2,11,9881,1e9])assert.equal(Math.floor(bet*R.asHundredths(n,bet)/100),n,'exact medal normalization');
const t0=Date.now();let cases=0,movableLow=0,movableHigh=0,allClears=0,positive=0;
for(const rate of [50,90,150])for(let seed=1;seed<=100;seed++){
 const s=R.newGame({bet:3000,rate,seed:Math.imul(seed,875623)});
 assert.equal(s.grid.length,10);assert.ok(s.grid[0].some(Boolean));assert.equal(G.drop(G.clone(s.grid)).moves.length,0);assert.equal(G.findShapes(s.grid).length,0);
 const labels=s.grid.flat().filter(v=>v?.number!=null).map(v=>v.number).sort((a,b)=>a-b);assert.deepEqual(labels,Array.from({length:25},(_,i)=>i+1));
 const mobile=s.grid.reduce((n,row,r)=>n+row.filter((v,c)=>v?.number!=null&&R.mobility(s.grid,r,c)>0).length,0);if(rate===50)movableLow+=mobile;if(rate===150)movableHigh+=mobile;
 const before=JSON.stringify(s);const preview=R.hit(s,6,{preview:true}),live=R.hit(s,6,{trace:true});
 assert.equal(JSON.stringify(s),before,'preview/live plan does not mutate input');assert.equal(preview.totalWin,live.totalWin);assert.equal(preview.allClear,live.allClear);assert.equal(JSON.stringify(live),JSON.stringify(R.hit(s,6,{trace:true})),'seeded prediction is reproducible');
 assert.equal(live.state.processed,1);assert.equal(R.hit(live.state,6),null);assert.ok(live.state.grid[0].some(Boolean),'refill retains ten-row height');
 let state=live.state;
 for(const n of [2,10,14,18,22,25,5]){const p=R.hit(state,n);assert.ok(p);assert.ok(p.chain<=8);state=p.state;assert.equal(G.drop(G.clone(state.grid)).moves.length,0);assert.equal(G.findShapes(state.grid).length,0);const numbers=state.grid.flat().filter(v=>v?.number!=null).map(v=>v.number);assert.equal(numbers.length,new Set(numbers).size);assert.ok(numbers.every(n=>!state.draws.includes(n)));}
 assert.equal(state.processed,8);assert.equal(R.hit(state,1),null);allClears+=state.allClears;positive+=Number(R.totalMedals(state)>0);cases++;
 const carry=R.carryOut(state,'r'+cases);
 if(R.totalMedals(state)>0){assert.equal(carry.bankUnits,state.bankUnits);assert.equal(carry.removed,state.removedTotal);}else{assert.equal(carry.bankUnits,0);assert.equal(carry.feed,0);assert.equal(carry.removed,0);}
}
assert.ok(movableHigh>movableLow,'higher settings increase prepared numbered support positions');
// A winning line clears disconnected candies of that color too. Every removed
// tile contributes once, and an all-clear claims the full meter WITHOUT resetting it.
let special=R.newGame({bet:100,seed:6});special.grid=G.empty(10);special.bankUnits=12500;special.removedTotal=125;special.normalHundredths=0;special.counts.line=2;
for(let c=0;c<7;c++)special.grid[9][c]={id:c+1,color:3,number:null};special.grid[9][7]={id:8,color:1,number:1};special.uid=8;
const clear=R.hit(special,1,{trace:true});assert.equal(clear.allClear,true);assert.equal(clear.removed,8);assert.equal(clear.state.bankUnits,13300);assert.equal(clear.state.bonusMedals,133);assert.equal(clear.state.normalHundredths,30);assert.equal(clear.totalWin,163);assert.equal(clear.state.counts.line,3);
const saved=R.carryOut(clear.state,'won');assert.equal(saved.bankUnits,13300);
const higherBet=R.newGame({bet:27000,rate:90,seed:515,carry:saved});assert.equal(higherBet.bankUnits,13300,'changing BET does not reprice the previous bank');assert.equal(higherBet.removedTotal,133);
const empty=R.newGame({bet:100,seed:72,carry:saved});assert.equal(R.carryOut(empty).bankUnits,0,'zero-WIN finished game resets');
assert.equal(special.bankUnits,12500,'preview never consumes a carried pool');
console.log('SIXDROP_PROGRESSIVE_V247_PASS',JSON.stringify({cases,positive,allClears,movableLow,movableHigh,ms:Date.now()-t0}));

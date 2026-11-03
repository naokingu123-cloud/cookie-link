/* v75 regression: 8th-ball reach, Six Drop last refill row, selected Winery */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');
const html=read('index.html'),compiled=read('optimized/app-01.js');
const gelato=read('assets/gelato-prism-v28.js');
const winery=read('assets/winery-pyramid-v1.js');
const core=require('../../assets/winery-pyramid-core-v1.js');
const selected=read('assets/winery-tab-selected-v75.css');
assert.match(html,/const sixOldTopGuard='if\(missed\.length&&!plan\.advance\)\{';/);
assert.match(html,/topRowNeedsRefill/);
assert.match(html,/sixNewTopGuard/);
assert.match(html,/assets\/gelato-prism-v28\.js\?v=75/);
assert.match(html,/assets\/winery-pyramid-v1\.js\?v=75/);
assert.match(html,/assets\/winery-pyramid-core-v1\.js\?v=75/);
assert.match(selected,/aria-selected="true"/);
assert.match(selected,/選択中/);
new Function(gelato);
new Function(winery);
assert.match(gelato,/engine\.processed===8/);
assert.match(gelato,/finishGamePresentation\(slot,e,app,token\)/);
assert.match(gelato,/engine\.processed>8/);
assert.match(winery,/e\.processed===8/);
assert.match(winery,/finishGamePresentation\(S,engine,app,token\)/);
assert.equal(core.PAY[10],.3);
assert.equal(core.PAY[11],.6);
const rng=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const e=new core.WineryEngine({random:rng(99),onEvent:()=>{}});
e.processed=8;e.accepted=8;e.running=false;e.phase='complete';
for(const n of e.nodeNumbers.filter(n=>!e.seen.has(n)).slice(0,4)){
 const p=e.predict(n);
 assert.equal(p.number,n);
 assert.equal(typeof p.gain,'number');
}
const oldGuard='if(missed.length&&!plan.advance){';
const start=compiled.indexOf('const SIX_ROWS=10,SIX_SQRT3_2');
const stop=compiled.indexOf('const CandyCarnivalEngine=SixBallCandyEngine;',start);
assert(start>0&&stop>start,'six original rules available');
const source=compiled.slice(start,stop);
const topGuard='const topRowNeedsRefill=!!this.initialPyramid&&this.pyramid[0].filter(Boolean).length<this.initialPyramid[0].filter(Boolean).length;'+
 'if((missed.length||topRowNeedsRefill)&&!plan.advance){';
assert(source.includes(oldGuard),'unpatched original guard unique');
assert.equal(source.split(oldGuard).length,2);
const compiledPatch=source.replace(oldGuard,topGuard);
const sandbox={Math,Array,Set,Map,Number,Object,console};
vm.createContext(sandbox);
vm.runInContext('class Engine{}; const motionReduced=false; const debugEconomyProfile=()=>({sixSpread:.30});'+compiledPatch+
  ';globalThis.sixQA={SIX_ROWS,sixMakeBoard,sixPickGapTemplate,sixPlan,sixRefillBoard};',sandbox);
const q=sandbox.sixQA;assert.equal(q.SIX_ROWS,10);
let restored=0,missingTop=0;
for(let seed=1;seed<=140;seed++){
 const random=rng(seed),holes=q.sixPickGapTemplate(random,1);
 const made=q.sixMakeBoard(10,4,random,0,{holes});
 const startingTop=made.grid[0].filter(Boolean).length;
 const nums=made.grid.flat().filter(t=>t?.number!=null).map(t=>t.number);
 const number=nums[Math.floor(random()*nums.length)];
 const plan=q.sixPlan(made.grid,[number]);
 if(plan.advance)continue;
 const currentTop=plan.grid[0].filter(Boolean).length;
 if(currentTop>=startingTop)continue;
 missingTop++;
 const need=currentTop<startingTop;
 assert(need,'the new guard must refill the lost top');
 const refill=q.sixRefillBoard(plan.grid,4,random,made.lastId,new Set([number]));
 assert(refill.added.length>0,'refill adds at least one tile');
 assert(refill.grid[0].filter(Boolean).length>=startingTop,
  'refill raises the top row back to initial height');
 restored++;
}
assert(restored>20,'many HIT-caused missing rows must be corrected');
console.log('V75_PASS',JSON.stringify({sixRows:10,hitTopRowsRestored:restored,missingTop,post8Reach:'enabled',selectedWinery:'overlay active'}));
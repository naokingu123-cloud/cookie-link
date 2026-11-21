/* Pure checks of the production layout against real current and saved rounds. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const context=vm.createContext({});
vm.runInContext(await fs.readFile(new URL('../assets/dango-bingo-rules.js',import.meta.url),'utf8'),context);
const source=await fs.readFile(new URL('../assets/dango-bingo-view.js',import.meta.url),'utf8');
const helpers=source.slice(source.indexOf('const isCurrent='),source.indexOf('const highestRoleCell='));
const geometry=source.slice(source.indexOf('function legacyGeometry('),source.indexOf('function disc('));
assert(helpers.includes('const isPlusFree=')&&geometry.includes('function payoutLayout('),'production geometry boundaries exist');
vm.runInContext('const R=DangoBingoRules;'+helpers+geometry+';this.layout={geometry,payoutLayout,showFreeRail};',context);
const R=context.DangoBingoRules,V=context.layout,plain=value=>JSON.parse(JSON.stringify(value));
const numbers=Array.from({length:25},(_,i)=>i+1);
let state=R.create({rulesRevision:285,moldIndex:0,numbers,seed:285});
assert.equal(state.rulesRevision,285);
const states=[state],firstFive=[...state.triggerNumbers,...numbers.filter(n=>!state.triggerNumbers.includes(n)).slice(0,2)];
for(const n of firstFive){state=R.draw(state,n);states.push(state);}
assert.equal(state.phase,'placing');
state=R.placeFree(state,state.initialFreeCells[0]);assert.equal(state.oddsMultiplier,2);states.push(state);
while(state.freeRemaining)state=R.placeFree(state,R.availableCenters(state)[0]);
state=R.commitFree(state,{autoFill:false});assert.equal(state.phase,'draw-final');states.push(state);
for(const n of numbers.filter(n=>!state.draws.includes(n)).slice(0,3)){state=R.draw(state,n);states.push(state);}
assert.equal(state.phase,'done');
const legacy=R.create({rulesRevision:268,moldIndex:0,numbers});
const viewports=[[430,366],[430,372],[1366,750],[844,340],[844,250],[1366,250],[390,844],[390,540],[390,300],[320,480],[320,270]];
const distance=(rect,point)=>Math.hypot(point.x-Math.max(rect.x,Math.min(rect.x+rect.width,point.x)),point.y-Math.max(rect.y,Math.min(rect.y+rect.height,point.y)));
const contains=(rect,width,height)=>rect.x>=-1e-7&&rect.y>=-1e-7&&rect.x+rect.width<=width+1e-7&&rect.y+rect.height<=height+1e-7;
const witnesses=[];
for(const [width,height]of viewports){
 const before=JSON.stringify(states),initial=V.geometry(width,height,{state:states[0]}),old=V.geometry(width,height,{state:legacy});
 assert(initial.unit>=old.unit,'the enlarged board does not shrink at '+width+'x'+height);
 for(const round of states){
  const g=V.geometry(width,height,{state:round}),p=V.payoutLayout(width,height,round),label=width+'x'+height+' '+round.phase;
  assert.deepEqual(plain(g),plain(initial),'phase, FREE count and Odds preserve all board/FREE coordinates: '+label);
  assert.equal(V.showFreeRail(round),false);assert.equal(p.railVisible,false);assert.equal(p.railWidth,0);assert(!p.rects.some(r=>r.kind==='free-icons'));
  assert.equal(g.centers.length,28);assert(contains(g.free,width,height),'FREE card fits: '+label);assert(contains(g.stand,width,height),'generated stand fits: '+label);
  assert(p.rects.every(r=>contains(r,width,height)),'payout and full Odds row fit: '+label);
  for(const point of g.centers){
   assert(contains({x:point.x-g.radius,y:point.y-g.radius,width:g.unit,height:g.unit},width,height),'mochi fits: '+label);
   assert(distance(g.free,point)>=g.unit*.58-1e-6,'thinking controls stay clear of every mochi: '+label);
   assert(p.rects.every(r=>distance(r,point)>=g.unit*.58-1e-6),'table and Odds stay clear of every mochi: '+label);
  }
  assert(p.unit*.4>=14,'full numeral height is retained');
  const numeralTop=p.rowHeight*.65-p.unit*.4/2,numeralBottom=p.rowHeight*.65+p.unit*.4/2,captionBottom=p.rowHeight*.025+p.unit*.20;
  assert(captionBottom<numeralTop&&numeralBottom<p.rowHeight,'separate caption/number bands fit each payout row');
 }
 assert.equal(JSON.stringify(states),before,'layout never mutates game state');
 witnesses.push({width,height,oldUnit:old.unit,unit:initial.unit,cx:initial.cx,top:initial.top});
}
const cabinet=witnesses.find(row=>row.width===430&&row.height===366);
assert(cabinet.unit>40&&cabinet.unit<42&&cabinet.cx>270,'the native cabinet uses the freed right-side room');
// Saved 268 boards retain the measured pre-285 layout, not just their rules.
for(const [width,height,unit,cx,top]of [[430,366,28.645816197998286,215,178.36990390311124],[1366,750,103.44827586206897,874.24,72.41379310344826],[320,270,15.724860879904872,160,167.0021612366231]]){
 const old=V.geometry(width,height,{state:legacy});for(const [key,value]of Object.entries({unit,cx,top}))assert(Math.abs(old[key]-value)<1e-9,'saved268 '+key+' remains unchanged');
}
assert.equal(V.showFreeRail(legacy),true);
console.log('DANGO_V285_GEOMETRY_PASS',JSON.stringify({viewports:viewports.length,realRoundStages:states.length,cabinet,saved268Preserved:true}));

'use strict';
const assert=require('node:assert/strict');
const {R,G}=require('./sixdrop-v247-fixture.cjs');

// Use actual circle positions to independently check contact on both staggered
// row parities, without reusing the production connected-component predicate.
const cells=G.empty(10).flatMap((row,r)=>row.map((_,c)=>({r,c,key:r*16+c,...G.point(r,c,10)})));
const touching=new Map(cells.map(a=>[a.key,cells.filter(b=>Math.abs(Math.hypot(a.x-b.x,a.y-b.y)-1)<1e-8).map(b=>b.key)]));
function components(grid){
 const occupied=new Map(cells.filter(p=>grid[p.r][p.c]).map(p=>[p.key,grid[p.r][p.c]]));
 const seen=new Set(),groups=[];
 for(const [key,tile]of occupied){
  if(seen.has(key))continue;
  const group=[],queue=[key];seen.add(key);
  for(let i=0;i<queue.length;i++){
   const k=queue[i];group.push(k);
   for(const next of touching.get(k))if(!seen.has(next)&&occupied.get(next)?.color===tile.color){seen.add(next);queue.push(next);}
  }
  groups.push({color:tile.color,cells:group});
 }
 return groups;
}
function stable(grid,label){
 assert.equal(G.drop(G.clone(grid)).moves.length,0,label+': supported');
 assert.equal(G.findShapes(grid).length,0,label+': no paid shape');
 assert.ok(components(grid).every(g=>g.cells.length<4),label+': no connected four');
}
function fixture(bottom,upper=[]){
 const s=R.newGame({bet:100,rate:90,seed:179});s.grid=G.empty(10);s.uid=0;
 bottom.forEach((color,c)=>{if(color!==null)s.grid[9][c]={id:++s.uid,color,number:c===7?1:null};});
 for(const [r,c,color]of upper)s.grid[r][c]={id:++s.uid,color,number:null};
 assert.equal(G.drop(G.clone(s.grid)).moves.length,0,'fixture is physically settled');
 return s;
}
function ids(grid){return new Set(grid.flat().filter(Boolean).map(t=>t.id));}
function credits(plan,before){
 let bank=before.bankUnits,total=0;const seen=new Set();
 for(const event of plan.timeline){
  if(!event.removed?.length)continue;
  assert.equal(event.bankUnitsBefore,bank,'per-drop credits start from the previous visible balance');
  assert.equal(event.progressiveCredits.length,event.removed.length,'one progressive credit for every removed candy');
  for(let i=0;i<event.removed.length;i++){
   const drop=event.removed[i],credit=event.progressiveCredits[i];
   assert.equal(credit.tileId,drop.tile.id);assert.equal(credit.r,drop.r);assert.equal(credit.c,drop.c);
   assert.ok(!seen.has(credit.tileId),'a candy contributes at most once');seen.add(credit.tileId);
   assert.equal(credit.deltaUnits,before.bet*5);bank+=credit.deltaUnits;
   assert.equal(credit.bankUnits,bank,'count-up target increases after each individual drop');total++;
  }
  assert.equal(event.bankUnits,bank,'phase result matches the last individual credit');
 }
 assert.equal(total,plan.removed);assert.equal(bank,plan.state.bankUnits,'animation and authoritative balance agree');
}
const t0=Date.now();

// A bent/diamond four is connected but neither a four-ball line nor a paid
// triangle/hexagon. It must still clear; a disconnected tile stays intact.
const bent=fixture([2,0,0,3,2,0,2,1],[[8,1,0],[8,2,0]]);
assert.equal(G.findShapes(bent.grid).length,0);
assert.equal(components(bent.grid).filter(g=>g.cells.length>=4).length,1);
const bentIds=[bent.grid[9][1].id,bent.grid[9][2].id,bent.grid[8][1].id,bent.grid[8][2].id];
const disconnectedId=bent.grid[9][5].id,bentJson=JSON.stringify(bent);
const cleared=R.hit(bent,1,{trace:true,preview:true});
credits(cleared,bent);
assert.equal(JSON.stringify(bent),bentJson,'planning does not mutate the source board');
assert.equal(cleared.removed,5,'one numbered HIT plus all four connected candies');
assert.equal(cleared.chain,1);assert.equal(cleared.totalWin,0,'an ordinary cluster has no geometric role award');
assert.deepEqual(cleared.counts,{line:0,triangle:0,hexagon:0});
assert.equal(cleared.state.bankUnits-bent.bankUnits,5*100*5,'every cleared drop adds BET x0.05');
for(const id of bentIds)assert.ok(!ids(cleared.state.grid).has(id),'bent cluster candy cleared');
assert.ok(ids(cleared.state.grid).has(disconnectedId),'ordinary cluster does not clear a disconnected same-color candy');

// Three adjacent candies survive until a fourth makes contact.
const triple=fixture([2,0,0,3,2,0,2,1],[[8,1,0]]);
assert.equal(Math.max(...components(triple.grid).map(g=>g.cells.length)),3);
const tripleIds=[triple.grid[9][1].id,triple.grid[9][2].id,triple.grid[8][1].id];
const stayed=R.hit(triple,1,{trace:true,preview:true});
credits(stayed,triple);
assert.equal(stayed.removed,1);assert.equal(stayed.chain,0);
for(const id of tripleIds)assert.ok(ids(stayed.state.grid).has(id),'three adjacent candies survive');
const five=fixture([0,0,0,3,2,0,2,1],[[8,0,0],[8,1,0]]);
assert.equal(G.findShapes(five.grid).length,0);
const fivePlan=R.hit(five,1,{trace:true,preview:true});credits(fivePlan,five);
assert.equal(fivePlan.removed,6,'the connected rule applies to groups larger than four too');
assert.deepEqual(fivePlan.counts,{line:0,triangle:0,hexagon:0});
const refillTriple=JSON.parse(JSON.stringify(triple));refillTriple.grid[9][7]=null;
const oldTriple=new Map(refillTriple.grid.flat().filter(Boolean).map(t=>[t.id,{...t}]));
R.refill(refillTriple);stable(refillTriple.grid,'explicit refill beside existing three');
for(const tile of refillTriple.grid.flat().filter(Boolean))if(oldTriple.has(tile.id))assert.deepEqual(tile,oldTriple.get(tile.id));

// A legal settled remnant can forbid all four colors at one exposed cell:
// each choice at row5/column3 would touch an existing triple. Keep a supported
// pocket open; never recolor a survivor, crash, or create an automatic refill
// clear. New candies above that pocket must remain physically supported.
const trapped=R.newGame({bet:100,seed:123});trapped.grid=G.empty(10);trapped.uid=0;
const put=(r,c,color)=>trapped.grid[r][c]={id:++trapped.uid,color,number:null};
for(let r=7;r<10;r++)for(let c=0;c<trapped.grid[r].length;c++)put(r,c,(r===8?2:0)+(c%2));
for(let c=0;c<7;c++)put(6,c,c<3?2:c<6?3:2);
for(const c of [0,1,2])put(5,c,0);for(const c of [4,5,6])put(5,c,1);
stable(trapped.grid,'four-color blocked remnant');
const trappedSurvivors=new Map(trapped.grid.flat().filter(Boolean).map(t=>[t.id,{...t}]));
const trappedBefore=G.clone(trapped.grid),trappedBank=trapped.bankUnits;
const partial=R.refill(trapped);
assert.ok(partial.added.length,'safe exposed positions still refill');
assert.equal(trapped.grid[5][3],null,'uncolorable pocket stays open');
assert.ok(trapped.grid[0].some(Boolean),'safe refill reaches the original ten-row height');
assert.equal(trapped.bankUnits,trappedBank,'refill never manufactures progressive credits');
for(const tile of trapped.grid.flat().filter(Boolean))if(trappedSurvivors.has(tile.id))assert.deepEqual(tile,trappedSurvivors.get(tile.id));
for(const {r,c}of partial.added){
 const x=G.point(r,c,10).x;
 assert.ok(!trappedBefore.slice(0,r).some((row,y)=>row.some((t,k)=>t&&Math.abs(G.point(y,k,10).x-x)<.999)),'every new candy is reachable from above');
}
stable(trapped.grid,'refill with a blocked color pocket');
R.refill(trapped);stable(trapped.grid,'a second refill leaves the blocked pocket stable');

// A geometric line retains the earlier rule: all candies of its color clear,
// including a disconnected candy, and it earns the normal line payout.
const line=fixture([0,0,0,0,2,3,0,1]);const farLineId=line.grid[9][6].id;
const paid=R.hit(line,1,{trace:true,preview:true});
credits(paid,line);
assert.equal(paid.counts.line,1);assert.equal(paid.totalWin,10);assert.equal(paid.removed,6);
assert.ok(!ids(paid.state.grid).has(farLineId),'paid shape clears every candy of its color');

// Palette boundaries depend on cumulative removals at GAME START, never feed
// height, refill count, or removal count changing in the middle of a game.
const windows=[['blue','aqua','green','lime'],['aqua','green','lime','yellow'],['green','lime','yellow','orange'],['lime','yellow','orange','red'],['yellow','orange','red','pink'],['orange','red','pink','violet']];
for(let band=0;band<windows.length;band++)for(const removed of [band*100,band*100+99]){
 assert.deepEqual(R.palette(removed).map(i=>R.RING[i]).sort(),[...windows[band]].sort(),'palette at '+removed+' removed');
}
assert.deepEqual(R.palette(1e9),R.palette(500),'purple window saturates rather than wrapping');
let cases=0,hits=0,refilled=0,retained=0;
for(const removed of [0,99,100,199,200,299,300,399,400,499,500,999])for(const rate of [50,90,150])for(let seed=1;seed<=8;seed++){
 let state=R.newGame({bet:3000,rate,seed:Math.imul(seed+removed,875623),carry:{bankUnits:123456,removed,feed:987654}});
 const allowed=new Set(R.palette(removed)),fixed=[...state.palette];
 assert.equal(fixed.length,4);assert.equal(new Set(fixed).size,4);
 assert.ok(state.grid.flat().filter(Boolean).every(t=>allowed.has(t.color)),'initial board uses the four-color window');
 stable(state.grid,'initial '+cases);
 for(const number of [6,2,10,14,18,22,25,5]){
  const before=state,plan=R.hit(state,number,{trace:true});assert.ok(plan);state=plan.state;
  credits(plan,before);
  assert.deepEqual(state.palette,fixed,'palette stays locked through all eight HITs');
  assert.ok(state.grid.flat().filter(Boolean).every(t=>allowed.has(t.color)),'refill uses only this game\'s palette');
  assert.equal(state.bankUnits-before.bankUnits,plan.removed*state.bet*5,'precise accrual on every HIT');
  assert.equal(state.removedTotal-before.removedTotal,plan.removed,'removal threshold count is exact');
  assert.equal(state.roundRemoved-before.roundRemoved,plan.removed);
  stable(state.grid,'refill '+cases+'/'+number);
  const topUp=plan.timeline.findIndex(e=>e.phase==='pyramidTopUp');
  if(topUp>=0){
   const after=new Map(state.grid.flat().filter(Boolean).map(t=>[t.id,t]));
   const beforeFill=plan.timeline[topUp-1].grid.flat().filter(Boolean);
   for(const tile of beforeFill){assert.deepEqual(after.get(tile.id),tile,'refill preserves a surviving candy identity, color and number');retained++;}
   refilled++;
  }
  hits++;
 }
 cases++;
}

// Explicitly cross 100 within a HIT, then verify the new color is first used in
// the next game. A winning state is used so the existing zero-WIN reset rule
// does not intentionally reset the carry before that next game.
const boundary=R.newGame({bet:100,seed:614,carry:{bankUnits:700,removed:99,feed:20000}});
boundary.grid=G.clone(bent.grid);boundary.uid=bent.uid;boundary.normalHundredths=10;
const cross=R.hit(boundary,1,{trace:true});
assert.ok(cross.state.removedTotal>=100);assert.deepEqual(cross.state.palette,boundary.palette);
assert.ok(cross.state.grid.flat().filter(Boolean).every(t=>boundary.palette.includes(t.color)),'no yellow appears midway through a game');
const next=R.newGame({bet:100,seed:819,carry:R.carryOut(cross.state,'cross-100')});
assert.deepEqual(next.palette,R.palette(cross.state.removedTotal),'next game adopts the newly unlocked window');
assert.ok(next.palette.includes(R.RING.indexOf('yellow')));
const legacy=JSON.parse(JSON.stringify(cross.state));delete legacy.palette;delete legacy.rulesRevision;
const resumed=R.hit(legacy,2,{trace:true});
assert.deepEqual(resumed.state.palette,boundary.palette,'a resumed older game reconstructs its start palette rather than advancing mid-game');
credits(resumed,legacy);

// Fractions are retained internally instead of rounding each drop. BET=3 adds
// exactly 0.15 medals per drop, so eight drops add 1.20 medals to the bank.
const fractional=fixture([0,0,0,0,0,0,0,1]);fractional.bet=3;fractional.bankUnits=9;
const fractionPlan=R.hit(fractional,1,{trace:true});credits(fractionPlan,fractional);
assert.equal(fractionPlan.removed,8);assert.equal(fractionPlan.state.bankUnits,129);
assert.equal(fractionPlan.state.bonusMedals,1,'all-clear payout floors only at collection');
assert.equal(fractionPlan.state.bankUnits,129,'collecting the bank does not consume accumulated progressive value');
console.log('SIXDROP_CONNECTED_V248_PASS',JSON.stringify({cases,hits,refilled,retained,ms:Date.now()-t0}));

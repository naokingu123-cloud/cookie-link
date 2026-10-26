'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const load=path=>{const s=fs.readFileSync(path,'utf8');return vm.runInNewContext(s.slice(0,s.indexOf('class SixBallCandyEngine'))+';({sixEmpty,sixClone,sixPoint,sixMotionPoint,sixDrop,sixFallOptions,sixMakeBoard,sixPlan,sixCount})',{motionReduced:false});};
const old=load('/tmp/six-empty-support-before-engine.js'),q=load('assets/six-candy-rounds-engine.js');
const rng=seed=>{let s=seed;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;}};
const equal=(a,b,m)=>assert.equal(JSON.stringify(a),JSON.stringify(b),m);
const floating=g=>{const cells=[];for(let r=0;r<g.length-1;r++)for(let c=0;c<=r;c++)if(g[r][c]&&!g[r+1][c]&&!g[r+1][c+1])cells.push([r,c]);return cells;};
const stats={baselineBoards:600,baselineUnsupported:0,baselineBottomGap:0,baselineLowerSupportGap:0,fixedUnsupported:0,fixtures:0,randomBoards:0,pathSamples:0,frames:0,gapMoves:0,predictions:0};
function replay(initial,fall,final){
 const ids=g=>g.flat().filter(Boolean).map(t=>t.id).sort((a,b)=>a-b);
 equal(ids(initial),ids(final),'A falling candy disappeared or duplicated');
 let prev=q.sixClone(initial);
 for(const f of fall.steps){
  stats.frames++;const moved=new Set(f.moves.map(m=>m.id)),targets=new Set();const rebuilt=q.sixClone(prev);
  for(const m of f.moves){assert.equal(prev[m.from[0]][m.from[1]]?.id,m.id);assert(m.to[0]>m.from[0]);assert(!targets.has(m.to.join(',')));targets.add(m.to.join(','));rebuilt[m.from[0]][m.from[1]]=null;if(m.gap)stats.gapMoves++;}
  for(const m of f.moves){assert.equal(rebuilt[m.to[0]][m.to[1]],null);rebuilt[m.to[0]][m.to[1]]=m.tile;equal(q.sixMotionPoint(m,0),q.sixPoint(...m.from));equal(q.sixMotionPoint(m,1),q.sixPoint(...m.to));}
  equal(rebuilt,f.grid,'Animation cannot reproduce gameplay state');
  for(let k=0;k<=64;k++){
   const points=[];for(let r=0;r<prev.length;r++)for(let c=0;c<=r;c++)if(prev[r][c]&&!moved.has(prev[r][c].id))points.push({...q.sixPoint(r,c),id:prev[r][c].id});
   for(const m of f.moves){const p=q.sixMotionPoint(m,k/64);assert(Number.isFinite(p.x)&&Number.isFinite(p.y));if(k){const last=q.sixMotionPoint(m,(k-1)/64);assert(p.y>=last.y-1e-8,'Escape moves upward');assert(Math.hypot(p.x-last.x,p.y-last.y)<.07,'Path jumps');}points.push({...p,id:m.id});}
   for(let a=0;a<points.length;a++)for(let b=a+1;b<points.length;b++){const p=points[a],t=points[b];assert((p.x-t.x)**2+(p.y-t.y)**2>=.9999,'Candy path overlaps '+JSON.stringify({a:p,b:t,k,moves:f.moves}));}stats.pathSamples++;
  }
  prev=q.sixClone(f.grid);
 }
 equal(prev,final,'Final animation and game board differ');
 assert.equal(floating(final).length,0,'Unsupported candy remains: '+JSON.stringify(floating(final)));
 assert.equal(q.sixDrop(q.sixClone(final),{trace:true}).steps.length,0,'Not settled');
}
function fixture(rows,lowerSupport){
 const g=q.sixEmpty(rows),r=rows-(lowerSupport?3:2),c=2;let id=0;
 const add=(y,x)=>g[y][x]={id:++id,color:id%5,number:id};
 for(const [y,x] of [[r,c-1],[r,c],[r,c+1],[r+1,c-1],[r+1,c+2]])add(y,x);
 if(lowerSupport)for(let x=0;x<rows;x++)add(rows-1,x);
 const before=q.sixClone(g),broken=old.sixClone(g);old.sixDrop(broken);
 assert(floating(broken).length>0,'Fixture did not reproduce old bug');
 const fall=q.sixDrop(g,{trace:true});assert(fall.steps.length>0,'Bridge remained motionless');replay(before,fall,g);assert(fall.steps.some(f=>f.moves.some(m=>m.gap)),'Gap trajectory not exercised');stats.fixtures++;
}
for(const rows of [7,8,9,10])for(const lowerSupport of [false,true])fixture(rows,lowerSupport);
// Reproduce exactly the independent 600-board diagnosis, including final-row holes.
for(const rows of [7,8,9,10])for(let seed=1;seed<=150;seed++){
 const random=rng(seed*987+rows),g=q.sixMakeBoard(rows,5,random).grid;
 for(let r=0;r<rows;r++)for(let c=0;c<=r;c++)if(random()<.35)g[r][c]=null;
 const broken=q.sixClone(g),fixed=q.sixClone(g);old.sixDrop(broken);q.sixDrop(fixed);
 for(const [r,c] of floating(broken)){stats.baselineUnsupported++;if(r===rows-2)stats.baselineBottomGap++;else stats.baselineLowerSupportGap++;}
 stats.fixedUnsupported+=floating(fixed).length;
}
assert.equal(stats.baselineUnsupported,206,'Baseline no longer matches diagnosed version');assert.equal(stats.fixedUnsupported,0,'Fix still leaves diagnosed air bridges');
// Broader randomized cases: independent support invariant, continuous non-overlap,
// final occupancy replay, tracing equivalence, identity invariance and prediction.
for(const rows of [7,8,9,10])for(let seed=1;seed<=75;seed++){
 const random=rng(seed*4793+rows),g=q.sixMakeBoard(rows,3+seed%3,random).grid;
 for(let r=0;r<rows;r++)for(let c=0;c<=r;c++)if(random()<[.15,.35,.65][seed%3])g[r][c]=null;
 const before=q.sixClone(g),plain=q.sixClone(g),fall=q.sixDrop(g,{trace:true});q.sixDrop(plain);equal(plain,g);replay(before,fall,g);
 const renamed=q.sixClone(before);renamed.flat().filter(Boolean).forEach(t=>{t.id=1000-t.id;t.lean=-t.lean;});q.sixDrop(renamed);
 const project=g=>g.map(row=>row.map(t=>t?{color:t.color,number:t.number}:null));equal(project(g),project(renamed),'ID/lean affects landing');
 for(const n of [1,13,25]){const snapshot=JSON.stringify(g),a=q.sixPlan(g,[n]),b=q.sixPlan(g,[n],{trace:true});equal(a.grid,b.grid);assert.equal(a.gain,b.gain);assert.equal(JSON.stringify(g),snapshot);assert.equal(floating(a.grid).length,0);stats.predictions++;}
 stats.randomBoards++;
}
// A genuinely supported hollow hexagon must not be collapsed by the repair.
let ring=q.sixEmpty();let id=0;[[7,3],[7,4],[8,3],[8,5],[9,3],[9,4],[9,5],[9,6]].forEach(([r,c])=>ring[r][c]={id:++id,color:0,number:null});const original=JSON.stringify(ring);q.sixDrop(ring);assert.equal(JSON.stringify(ring),original,'Supported hollow shape collapsed');
assert(stats.gapMoves>0);fs.writeFileSync('/tmp/six-empty-support-stats.json',JSON.stringify(stats,null,2));console.log('EMPTY_SUPPORT_FIX_REGRESSION_OK',JSON.stringify(stats));

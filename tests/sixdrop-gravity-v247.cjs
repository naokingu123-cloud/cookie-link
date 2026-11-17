'use strict';
/* Regression of the shared, support-based Six Ball Puzzle style gravity.
   Uses the actual shipped lattice and trajectories, not a mock/vertical packer.
   Nintendo does not publish its internal tie-breaking algorithm; the symmetric
   tie stays deterministic so host replay and next-HIT prediction cannot diverge. */
const fs=require('node:fs'),assert=require('node:assert/strict');
const src=fs.readFileSync('optimized/app-01.js','utf8');
const block=src.slice(src.indexOf('const SIX_ROWS=10'),src.indexOf('class SixBallCandyEngine'));
const G=new Function('const motionReduced=false;'+block+';return {empty:sixEmpty,clone:sixClone,count:sixCount,valid:sixValid,step:sixStep,point:sixPoint,options:sixFallOptions,motion:sixMotionPoint,drop:sixDrop};')();
const eq=(a,b,label)=>assert.equal(JSON.stringify(a),JSON.stringify(b),label);
const tile=(id)=>({id,color:id%4,number:id<=25?id:null});
let fixtures=0,boards=0,frames=0,samples=0,gapMoves=0;
for(const rows of [7,8,9,10]){
 const pos=[2,3],dl=G.step(...pos,1,-.5,rows),dr=G.step(...pos,1,.5,rows),down=G.step(...pos,2,0,rows);
 let g=G.empty(rows);g[2][3]=tile(1);eq(G.options(g,2,3)[0].to,down,'free shaft goes straight down');fixtures++;
 g[2][2]=tile(2);eq(G.options(g,2,3)[0].to,dr,'left neighbour directs free ball right');fixtures++;
 g[2][2]=null;g[2][4]=tile(2);eq(G.options(g,2,3)[0].to,dl,'right neighbour directs free ball left');fixtures++;
 g=G.empty(rows);g[2][3]=tile(1);g[dl[0]][dl[1]]=tile(2);const roll=G.options(g,2,3)[0];eq(roll.to,dr,'one support rolls to open side');eq(roll.pivot,dl);fixtures++;
 g[dr[0]][dr[1]]=tile(3);eq(G.options(g,2,3),[],'two lower supports hold a ball');fixtures++;
 // A wall supports the edge, it is not a hole outside the cabinet.
 g=G.empty(rows);const r=rows-3;g[r][0]=tile(1);const inward=G.step(r,0,1,.5,rows);g[inward[0]][inward[1]]=tile(2);eq(G.options(g,r,0),[],'left wall and inward lower support hold');fixtures++;
 // A side-to-side bridge with no supports underneath must not hover forever.
 g=G.empty(rows);const above=rows-2;for(const [i,c]of [2,3,4].entries())g[above][c]=tile(i+1);g[rows-1][2]=tile(4);g[rows-1][5]=tile(5);
 const f=G.drop(g,{trace:true});assert.ok(f.moves.length,'unsupported bridge falls');assert.ok(f.steps.some(s=>s.moves.some(m=>m.gap)),'bridge uses a continuous gap trajectory');fixtures++;
}
// This is a genuinely supported hollow hexagon, not an unsupported bridge.
let ring=G.empty(10);[[7,3],[7,4],[8,2],[8,4],[9,2],[9,3],[9,4],[9,5]].forEach(([r,c],i)=>ring[r][c]=tile(i+1));
const ringBefore=JSON.stringify(ring);G.drop(ring);assert.equal(JSON.stringify(ring),ringBefore,'supported ring is not collapsed by vertical packing');fixtures++;
let randomState=247;function random(){randomState=(Math.imul(randomState,1664525)+1013904223)>>>0;return randomState/4294967296;}
function replay(initial,fall,final){
 const ids=g=>g.flat().filter(Boolean).map(x=>x.id).sort((a,b)=>a-b);eq(ids(initial),ids(final),'no lost or duplicated balls');
 let previous=G.clone(initial);
 for(const step of fall.steps){
  const movers=new Set(step.moves.map(m=>m.id)),targets=new Set();const rebuilt=G.clone(previous);
  for(const m of step.moves){assert.equal(rebuilt[m.from[0]][m.from[1]]?.id,m.id);assert.ok(m.to[0]>m.from[0]);assert.ok(G.valid(...m.to,previous.length));assert.ok(!targets.has(m.to.join(',')));targets.add(m.to.join(','));rebuilt[m.from[0]][m.from[1]]=null;if(m.gap)gapMoves++;}
  for(const m of step.moves){assert.equal(rebuilt[m.to[0]][m.to[1]],null);rebuilt[m.to[0]][m.to[1]]=m.tile;eq(G.motion(m,0),G.point(...m.from,previous.length));eq(G.motion(m,1),G.point(...m.to,previous.length));}
  eq(rebuilt,step.grid,'animation and logical destination agree');
  for(let k=0;k<=24;k++){
   const points=[];for(let r=0;r<previous.length;r++)for(let c=0;c<previous[r].length;c++)if(previous[r][c]&&!movers.has(previous[r][c].id))points.push(G.point(r,c,previous.length));
   for(const m of step.moves){const p=G.motion(m,k/24);assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));assert.ok(p.x>=-3.50001&&p.x<=3.50001,'no wall penetration');if(k){const q=G.motion(m,(k-1)/24);assert.ok(p.y>=q.y-1e-8,'no upward jump');}points.push(p);}
   for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++)assert.ok((points[i].x-points[j].x)**2+(points[i].y-points[j].y)**2>=.9998,'no crossing/overlapping ball paths');samples++;
  }
  previous=G.clone(step.grid);frames++;
 }
 eq(previous,final,'last visual frame equals settled board');assert.equal(G.drop(G.clone(final)).moves.length,0,'settled board cannot continue falling');
}
for(const rows of [7,8,9,10])for(let n=0;n<30;n++){
 let id=0;const initial=G.empty(rows);for(let r=0;r<rows;r++)for(let c=0;c<initial[r].length;c++)if(random()<.25+(n%3)*.22)initial[r][c]=tile(++id);
 const plain=G.clone(initial),shown=G.clone(initial),trace=G.drop(shown,{trace:true});G.drop(plain);eq(shown,plain,'tracing does not alter a result');replay(initial,trace,shown);
 const renamed=G.clone(initial);renamed.flat().filter(Boolean).forEach(t=>{t.id=5000-t.id;t.lean=1;});G.drop(renamed);const project=g=>g.map(row=>row.map(t=>t?{color:t.color,number:t.number}:null));eq(project(renamed),project(plain),'tile IDs and obsolete lean never change gravity');boards++;
}
const host=fs.readFileSync('assets/sixdrop-progressive-host-v247.js','utf8');assert.ok(host.includes('drop:sixDrop'),'new single-HIT rules must inject the same validated gravity');
console.log('SIXDROP_GRAVITY_V247_PASS',JSON.stringify({fixtures,boards,frames,samples,gapMoves}));

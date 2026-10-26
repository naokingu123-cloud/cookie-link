'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const src=fs.readFileSync('assets/six-candy-rounds-engine.js','utf8');
const api=vm.runInNewContext(src.slice(0,src.indexOf('class SixBallCandyEngine'))+';({sixEmpty,sixClone,sixPoint,sixMotionPoint,sixDrop,sixFallOptions,sixMakeBoard,sixPlan,sixCount,SIX_FALL_RULES});',{motionReduced:false});
const q=api,eq=(a,b,msg)=>assert.equal(JSON.stringify(a),JSON.stringify(b),msg),tile=(id,color=0,number=null)=>({id,color,number,lean:-1});
assert.equal(q.SIX_FALL_RULES,'grid-support-synchronous-v3');
const rng=seed=>{let state=seed;return()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};};
// Lower-empty cells follow the side-neighbour rule, before considering vertical.
let g=q.sixEmpty();g[3][1]=tile(1);g[3][0]=tile(2);eq(q.sixFallOptions(g,3,1)[0].to,[4,2],'Left neighbour must direct right');
g=q.sixEmpty();g[3][1]=tile(1);g[3][2]=tile(2);eq(q.sixFallOptions(g,3,1)[0].to,[4,1],'Right neighbour must direct left');
g=q.sixEmpty();g[3][1]=tile(1);eq(q.sixFallOptions(g,3,1)[0].to,[5,2],'Unbiased shaft must be vertical');
for(const lean of [-1,1])for(const id of [1,2,300,999]){g[3][1].id=id;g[3][1].lean=lean;eq(q.sixFallOptions(g,3,1)[0].to,[5,2],'Id or obsolete lean changed path');}
// One supported side, two supported sides, and an anchored hollow ring.
g=q.sixEmpty();g[5][2]=tile(1);g[6][3]=tile(2);eq(q.sixFallOptions(g,5,2)[0].to,[6,2]);assert(q.sixFallOptions(g,5,2)[0].pivot);
g[6][2]=tile(3);eq(q.sixFallOptions(g,5,2),[],'Two supports must hold');
g=q.sixEmpty();[[7,3],[7,4],[8,3],[8,5],[9,3],[9,4],[9,5],[9,6]].forEach(([r,c],i)=>g[r][c]=tile(i+1));const ring=JSON.stringify(g);q.sixDrop(g);assert.equal(JSON.stringify(g),ring,'Hollow supported hexagon collapsed');
// Following a departing support must share one timeline beat, not wait for a row.
g=q.sixEmpty();g[2][1]=tile(10);g[4][2]=tile(20);let f=q.sixDrop(g,{trace:true});
eq(f.steps[0].moves.map(m=>m.from[0]).sort((a,b)=>a-b),[2,4],'Stack was animated one row at a time');assert.equal(q.sixCount(g),2);
// Inverted three-ball group: upper pair separates outward while the bottom drops.
g=q.sixEmpty();g[3][1]=tile(10);g[3][2]=tile(11);g[4][2]=tile(12);f=q.sixDrop(g,{trace:true});
const first=new Map(f.steps[0].moves.map(m=>[m.id,m]));eq(first.get(10).to,[4,1],'Upper-left ball did not spread left');eq(first.get(11).to,[4,3],'Upper-right ball did not spread right');
const stats={logicalFixtures:6,boards:0,frames:0,samples:0,synchronousFrames:0,predictions:0};
function replay(initial,fall,final){
 let previous=q.sixClone(initial);const ids=initial.flat().filter(Boolean).map(t=>t.id).sort((a,b)=>a-b);
 for(const frame of fall.steps){
  const moving=new Set(frame.moves.map(m=>m.id)),targets=frame.moves.map(m=>m.to.join(','));assert.equal(moving.size,frame.moves.length);assert.equal(new Set(targets).size,targets.length);
  const rebuilt=q.sixClone(previous);
  for(const m of frame.moves){assert.equal(previous[m.from[0]][m.from[1]]?.id,m.id);assert(m.to[0]>m.from[0]);rebuilt[m.from[0]][m.from[1]]=null;}
  for(const m of frame.moves){assert.equal(rebuilt[m.to[0]][m.to[1]],null);rebuilt[m.to[0]][m.to[1]]=m.tile;}
  eq(rebuilt,frame.grid,'Timeline did not reproduce actual occupancy');
  for(let k=0;k<=24;k++){
   const positions=[];for(let r=0;r<previous.length;r++)for(let c=0;c<=r;c++)if(previous[r][c]&&!moving.has(previous[r][c].id))positions.push(q.sixPoint(r,c));
   for(const m of frame.moves){const p=q.sixMotionPoint(m,k/24);assert(Number.isFinite(p.x)&&Number.isFinite(p.y));positions.push(p);}
   for(let i=0;i<positions.length;i++)for(let j=i+1;j<positions.length;j++){const a=positions[i],b=positions[j];assert((a.x-b.x)**2+(a.y-b.y)**2>=.9999,'Visual candy overlap');}
   stats.samples++;
  }
  if(new Set(frame.moves.map(m=>m.from[0])).size>1)stats.synchronousFrames++;
  previous=q.sixClone(frame.grid);stats.frames++;
 }
 eq(previous,final,'Last animation frame differs from game state');eq(ids,final.flat().filter(Boolean).map(t=>t.id).sort((a,b)=>a-b),'Candy lost or duplicated');
 assert.equal(q.sixDrop(q.sixClone(final),{trace:true}).steps.length,0,'Final state still moves');
}
for(const rows of [7,8,9,10])for(let seed=1;seed<=20;seed++){
 const random=rng(seed*921+rows),board=q.sixMakeBoard(rows,3+seed%3,random).grid;
 for(let r=0;r<rows;r++)for(let c=0;c<=r;c++)if(random()<.28)board[r][c]=null;
 const original=q.sixClone(board),plain=q.sixClone(board),fall=q.sixDrop(board,{trace:true});q.sixDrop(plain);
 eq(plain,board,'Tracing changed game result');replay(original,fall,board);
 // Swapping all ids/old lean bits must not affect a geometrically identical board.
 const renamed=q.sixClone(original);renamed.flat().filter(Boolean).forEach(t=>{t.id=1000-t.id;t.lean=-t.lean;});q.sixDrop(renamed);
 const project=g=>g.map(row=>row.map(t=>t?{color:t.color,number:t.number}:null));eq(project(renamed),project(board),'Identity changed landing');
 const before=JSON.stringify(original);for(const n of [1,13,25]){const a=q.sixPlan(original,[n]),b=q.sixPlan(original,[n],{trace:true});eq(a.grid,b.grid);assert.equal(a.gain,b.gain);assert.equal(JSON.stringify(original),before,'Prediction mutated live board');stats.predictions++;}
 stats.boards++;
}
assert(stats.synchronousFrames>0);
console.log('GRID_DIRECTION_SUPPORT_SYNCHRONOUS_REPLAY_ID_INVARIANCE_OK',JSON.stringify(stats));
fs.writeFileSync('/tmp/six-fall-rules-stats.json',JSON.stringify(stats,null,2));

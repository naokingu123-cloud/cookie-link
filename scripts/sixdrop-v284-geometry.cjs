'use strict';
// Simulation-only geometry acceleration. Cache exact sampled collision paths;
// the production staggered gravity, selection order and grid rules stay intact.
// tests/sixdrop-v284-rules.cjs compares full trajectories against raw geometry.
const fs=require('node:fs'),vm=require('node:vm');
const context={window:{},console:{info(){},warn(){}}};
vm.runInNewContext(fs.readFileSync('assets/cookie-upgrade-patches.js','utf8'),context);
const bundle=context.window.CookieUpgradePatch.patch(fs.readFileSync('optimized/app-01.js','utf8'));
const geometry=bundle.slice(bundle.indexOf('const SIX_ROWS=10'),bundle.indexOf('class SixBallCandyEngine'));
const caches=`
const pathCellsCache=new Map(),motionPairCache=new Map(),neighborCellsCache=new Map();
function motionKey(m){return [m.rows||SIX_ROWS,m.from.join(','),m.to.join(','),m.pivot?.join(',')||'',m.turn||0,m.gap?1:0,m.gapPivot?.join(',')||''].join('/');}
function sixPathClear(grid,move,vacating=new Set()){
 const key=motionKey(move);let cells=pathCellsCache.get(key);
 if(!cells){
  const blocked=new Set();
  for(let k=1;k<=16;k++){
   const p=sixMotionPoint(move,k/16);
   for(let r=Math.max(0,move.from[0]-1);r<=Math.min(grid.length-1,move.to[0]+1);r++)for(let c=0;c<grid[r].length;c++){
    const q=sixPoint(r,c,grid.length);if((p.x-q.x)**2+(p.y-q.y)**2<.999999)blocked.add(r*16+c);
   }
  }
  cells=[...blocked].map(n=>[Math.floor(n/16),n%16]);pathCellsCache.set(key,cells);
 }
 for(const [r,c]of cells){const t=grid[r][c];if(t&&t.id!==move.id&&!vacating.has(t.id))return false;}
 return true;
}
function sixMotionsClear(a,b){
 const ak=motionKey(a),bk=motionKey(b),key=ak<bk?ak+'|'+bk:bk+'|'+ak;
 if(motionPairCache.has(key))return motionPairCache.get(key);
 for(let k=0;k<=16;k++){const p=sixMotionPoint(a,k/16),q=sixMotionPoint(b,k/16);if((p.x-q.x)**2+(p.y-q.y)**2<.999999){motionPairCache.set(key,false);return false;}}
 motionPairCache.set(key,true);return true;
}
function sixNeighbors(r,c,rows=SIX_ROWS){
 const key=rows+'/'+r+'/'+c;let cells=neighborCellsCache.get(key);
 if(!cells){cells=[[0,-1],[0,1],[-1,-.5],[-1,.5],[1,-.5],[1,.5]].map(([dr,dx])=>sixStep(r,c,dr,dx,rows));neighborCellsCache.set(key,cells);}
 return cells;
}
`;
const G=new Function('const motionReduced=false;'+geometry+caches+';return {empty:sixEmpty,clone:sixClone,count:sixCount,valid:sixValid,step:sixStep,neighbors:sixNeighbors,patterns:sixPatterns,findShapes:sixFindShapes,drop:sixDrop,point:sixPoint,gapTemplates:SIX_START_GAP_TEMPLATES};')();
module.exports={G};

const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const ctx={Engine:class{},motionReduced:false,console};vm.createContext(ctx);
vm.runInContext(fs.readFileSync('assets/six-candy-rounds-engine.js','utf8')+`\nglobalThis.q={sixEmpty,sixCapacity,sixPoint,sixValid,sixStep,sixNeighbors,sixLayout,sixXY,sixPatterns,sixLines,sixResolve,sixComponents,sixMakeBoard,sixCount,sixDrop,sixClone,sixFallOptions,sixMotionPoint,sixPlan,sixFindShapes,SIX_PAY,SIX_START_GAP_TEMPLATES,SIX_ROUND_THEMES,sixRoundClearBonus,sixPickSugarRound,SixBallCandyEngine};`,ctx);
const q=ctx.q,rng=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296),rows=10;
let boards=0,frames=0,samples=0,forms=0;
assert.equal(q.sixCapacity(10),75);assert.equal(q.sixLayout(10).step,35);
const expected=[['lime','green','aqua','navy'],['yellow','lime','green','aqua'],['orange','yellow','lime','green'],['red','orange','yellow','lime'],['violet','red','orange','yellow']];
assert.equal(JSON.stringify(q.SIX_ROUND_THEMES.map(t=>t.colors)),JSON.stringify(expected));
assert.equal(q.SIX_PAY.allClear,10000);assert.equal([1,2,3].reduce((s,r)=>s+q.sixRoundClearBonus(r),0),160);assert.equal(q.SIX_START_GAP_TEMPLATES.length,6);
for(const [pi,holes] of q.SIX_START_GAP_TEMPLATES.entries())for(const colors of [3,4])for(let seed=1;seed<=3;seed++){
 const random=rng(1000*pi+seed*100+colors),g=q.sixMakeBoard(rows,colors,random,0,{holes}).grid;
 assert.equal(q.sixCount(g),75-holes.length);assert.equal(g.at(-1).length,8);assert.equal(g[0].length,7);
 const hs=new Set(holes.map(p=>p.join(',')));for(const [r,c] of holes)assert(hs.has([r,g[r].length-1-c].join(',')),'Holes not symmetric');
 assert.equal(q.sixDrop(q.sixClone(g)).moves.length,0,'Initial board moved before a HIT');assert.equal(q.sixResolve(g).cells.length,0);
 assert.equal(JSON.stringify(g.flat().filter(t=>t?.number!=null).map(t=>t.number).sort((a,b)=>a-b)),JSON.stringify(Array.from({length:25},(_,i)=>i+1)));
 for(let r=0;r<rows;r++)for(let c=0;c<g[r].length;c++)if(random()<.42)g[r][c]=null;
 const before=q.sixClone(g),ids=g.flat().filter(Boolean).map(t=>t.id).sort((a,b)=>a-b),drop=q.sixDrop(g,{trace:true});
 assert.equal(JSON.stringify(g.flat().filter(Boolean).map(t=>t.id).sort((a,b)=>a-b)),JSON.stringify(ids));assert.equal(q.sixDrop(q.sixClone(g)).moves.length,0);
 for(let r=0;r<rows-1;r++)for(let c=0;c<g[r].length;c++)if(g[r][c]){const under=[-.5,.5].map(dx=>q.sixStep(r,c,1,dx,rows));assert(!under.every(([a,b])=>!g[a]?.[b]),'Unsupported floating candy');}
 for(const f of drop.steps){frames++;const byId=new Map(f.moves.map(m=>[m.id,m]));assert.equal(new Set(f.moves.map(m=>m.to.join(','))).size,f.moves.length);const stationary=[];for(let r=0;r<rows;r++)for(let c=0;c<f.grid[r].length;c++)if(f.grid[r][c]&&!byId.has(f.grid[r][c].id))stationary.push(q.sixPoint(r,c,rows));
  for(let k=0;k<=32;k++){samples++;const moving=f.moves.map(m=>q.sixMotionPoint(m,k/32));for(let i=0;i<moving.length;i++){const p=moving[i];assert(p.x>=-3.50001&&p.x<=3.50001);for(const z of stationary.concat(moving.slice(i+1)))assert((p.x-z.x)**2+(p.y-z.y)**2>.9999,'Swept-circle collision');}}
 }
 for(const n of [1,13,25]){const a=q.sixPlan(before,[n]),b=q.sixPlan(before,[n],{trace:true});assert.equal(JSON.stringify(a.grid),JSON.stringify(b.grid));assert.equal(a.gain,b.gain);assert.equal(a.gain,a.hexagons*300+a.triangles*150+a.lines*10+(a.cleared?10000:0));}
 boards++;
}
for(const form of q.sixPatterns(rows)){const g=q.sixEmpty(rows);form.cells.forEach(([r,c],i)=>g[r][c]={id:i+1,color:0,number:null});const found=q.sixFindShapes(g);assert.equal(found.length,1);assert.equal(found[0].type,form.type);forms++;}
for(const [dr,dx] of [[0,1],[1,-.5],[1,.5]]){const g=q.sixEmpty(rows);let p=[1,3];for(let i=0;i<4;i++){g[p[0]][p[1]]={id:i+1,color:0,number:null};p=q.sixStep(...p,dr,dx,rows);}assert.equal(q.sixResolve(g).lines,1);forms++;}
const uniform=q.sixEmpty(rows);let id=0;for(const row of uniform)for(let c=0;c<row.length;c++)row[c]={id:++id,color:0,number:null};const resolved=q.sixResolve(uniform),used=resolved.forms.flatMap(f=>f.cells.map(p=>p.join(',')));assert.equal(used.length,new Set(used).size);assert.equal(resolved.forms[0].type,'hexagon');
console.log('ROUNDS_V4_RULES_PASS',JSON.stringify({boards,frames,samples,forms,templates:6,initialFalls:0,firstThreeBonus:1.6,allClear:100,maxRounds:5}));
// New refill rules: fixed mirrored positions, top-filled safe grids, preserved identities.
vm.runInContext('globalThis.refillQA={SIX_NUMBER_CELLS,sixRefillBoard};',ctx);
const f=ctx.refillQA,mask=new Set(f.SIX_NUMBER_CELLS.map(p=>p.join(',')));
assert.equal(mask.size,25);const rowCounts=Array.from({length:10},(_,r)=>f.SIX_NUMBER_CELLS.filter(p=>p[0]===r).length);assert(rowCounts.every(n=>n>=2&&n<=4));assert.equal(f.SIX_NUMBER_CELLS.filter(p=>p[0]<5).length,13);for(const [r,c] of f.SIX_NUMBER_CELLS)assert(mask.has([r,8-((9-r)&1)-1-c].join(',')));
let topUps=0;
for(let seed=1;seed<=200;seed++){
 const random=rng(seed),colors=seed%2?3:4,b=q.sixMakeBoard(10,colors,random,0,{holes:q.SIX_START_GAP_TEMPLATES[seed%6]});
 for(let r=0;r<10;r++)for(let c=0;c<b.grid[r].length;c++)assert.equal(b.grid[r][c]?.number!=null,mask.has([r,c].join(',')));
 const plan=q.sixPlan(b.grid,[1,2,3]);if(plan.advance)continue;
 const before=q.sixClone(plan.grid),fill=f.sixRefillBoard(before,colors,random,b.lastId,new Set([1,2,3]));
 assert.equal(q.sixCount(fill.grid),q.sixCount(before)+fill.added.length);assert.equal(q.sixResolve(fill.grid).cells.length,0);assert.equal(q.sixDrop(q.sixClone(fill.grid)).moves.length,0);
 const tiles=fill.grid.flat().filter(Boolean);assert.equal(new Set(tiles.map(t=>t.id)).size,tiles.length);const nums=tiles.filter(t=>t.number!=null).map(t=>t.number);assert.equal(new Set(nums).size,nums.length);
 for(let r=0;r<10;r++)for(let c=0;c<before[r].length;c++)if(before[r][c]){assert.equal(fill.grid[r][c].id,before[r][c].id);assert.equal(fill.grid[r][c].number,before[r][c].number);assert.equal(fill.grid[r][c].sugar,before[r][c].sugar);}
 for(const a of fill.added)if(a.tile.number!=null){assert(![1,2,3].includes(a.tile.number));}
 for(let r=0;r<10;r++)for(let c=0;c<before[r].length;c++)if(!before[r][c]){const x=q.sixPoint(r,c,10).x;let covered=false;for(let y=0;y<r;y++)for(let k=0;k<before[y].length;k++)if(before[y][k]&&Math.abs(q.sixPoint(y,k,10).x-x)<.999)covered=true;if(covered)assert.equal(fill.grid[r][c],null,'Interior hole filled');}
 topUps++;
}
assert(topUps>10);console.log('REFILL_RULES_PASS',{topUps});

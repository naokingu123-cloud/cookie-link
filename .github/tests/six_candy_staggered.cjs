const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const ctx={Engine:class{},motionReduced:false,console};vm.createContext(ctx);
vm.runInContext(fs.readFileSync('assets/six-candy-rounds-engine.js','utf8')+`\nglobalThis.q={sixEmpty,sixCapacity,sixPoint,sixValid,sixStep,sixNeighbors,sixLayout,sixXY,sixPatterns,sixLines,sixResolve,sixComponents,sixMakeBoard,sixCount,sixDrop,sixClone,sixFallOptions,sixMotionPoint,sixPlan,sixFindShapes,SIX_PAY,SixBallCandyEngine};`,ctx);
const q=ctx.q; const rng=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
let boards=0,frames=0,pathSamples=0,ghosts=0,shapeFixtures=0;
for(const rows of [7,8,9,10])for(const colors of [3,4,5])for(let seed=1;seed<=(Number(process.env.SIX_SEEDS)||12);seed++){
 const r=rng(seed*711+rows*11+colors),g=q.sixMakeBoard(rows,colors,r).grid;
 assert.equal(g.at(-1).length,8);assert.equal(g.at(-2).length,7);assert.equal(q.sixCount(g),q.sixCapacity(rows));
 assert.deepEqual([...g.flat().filter(t=>t.number!=null).map(t=>t.number).sort((a,b)=>a-b)],Array.from({length:25},(_,i)=>i+1));
 assert.equal(q.sixResolve(g).cells.length,0);assert(g.flat().every(t=>t.color>=0&&t.color<colors));
 if(rows===8){assert.equal(g.flat().length,60);assert.equal(g.flat().filter(t=>t.number==null).length,35);}
 for(let y=0;y<rows;y++)for(let x=0;x<g[y].length;x++)if(r()<.48)g[y][x]=null;
 const before=q.sixClone(g),ids=g.flat().filter(Boolean).map(t=>t.id).sort((a,b)=>a-b),trace=q.sixDrop(g,{trace:true});
 assert.deepEqual([...g.flat().filter(Boolean).map(t=>t.id).sort((a,b)=>a-b)], [...ids]);
 assert.equal(q.sixDrop(q.sixClone(g)).moves.length,0);
 for(let y=0;y<rows-1;y++)for(let x=0;x<g[y].length;x++){
  if(!g[y][x])continue;const below=[-.5,.5].map(dx=>q.sixStep(y,x,1,dx,rows));
  if(below.every(([a,b])=>!g[a]?.[b])){ghosts++;throw Error('Unsupported candy at '+JSON.stringify({rows,y,x,g}));}
 }
 // Repeat at 33 points per beat; destinations, static contacts and concurrent paths agree.
 for(const f of trace.steps){
  frames++;const byId=new Map(f.moves.map(m=>[m.id,m]));
  assert.equal(new Set(f.moves.map(m=>m.to.join(','))).size,f.moves.length);
  for(const m of f.moves)assert(q.sixValid(...m.to,rows));
  const stationary=[];for(let y=0;y<rows;y++)for(let x=0;x<f.grid[y].length;x++)if(f.grid[y][x]&&!byId.has(f.grid[y][x].id))stationary.push(q.sixPoint(y,x,rows));
  for(let k=0;k<=32;k++){
   const moving=f.moves.map(m=>q.sixMotionPoint(m,k/32));pathSamples++;
   for(let i=0;i<moving.length;i++){
    const p=moving[i];assert(p.x>=-3.50001&&p.x<=3.50001);
    for(const z of stationary.concat(moving.slice(i+1)))assert((p.x-z.x)**2+(p.y-z.y)**2>.9999,'Collision '+JSON.stringify({rows,k,p,z,moves:f.moves}));
   }
  }
 }
 for(const n of [1,13,25]){const a=q.sixPlan(before,[n]),b=q.sixPlan(before,[n],{trace:true});assert.equal(JSON.stringify(a.grid),JSON.stringify(b.grid));assert.equal(a.gain,b.gain);assert.equal(a.gain,a.hexagons*50+a.triangles*30+a.lines*10+(a.cleared?6000:0));}
 boards++;
}
for(const rows of [7,8,9,10]){
 const pats=q.sixPatterns(rows);for(const type of ['hexagon','triangle']){
  const fixtures=pats.filter(p=>p.type===type);assert(fixtures.length>0);
  for(const form of fixtures){const g=q.sixEmpty(rows);form.cells.forEach(([r,c],i)=>g[r][c]={id:i+1,number:null,color:0});const found=q.sixFindShapes(g);assert.equal(found.length,1);assert.equal(found[0].type,type);shapeFixtures++;}
 }
 for(const [dr,dx] of [[0,1],[1,-.5],[1,.5]]){
  const g=q.sixEmpty(rows);let p=[1,3];for(let i=0;i<4;i++){assert(q.sixValid(...p,rows));g[p[0]][p[1]]={id:i+1,number:null,color:0};p=q.sixStep(...p,dr,dx,rows);}
  assert.equal(q.sixResolve(g).lines,1);shapeFixtures++;
 }
 const g=q.sixEmpty(rows);let id=1;g.forEach(row=>row.fill(null));for(let r=0;r<rows;r++)for(let c=0;c<g[r].length;c++)g[r][c]={id:id++,color:0,number:null};
 const res=q.sixResolve(g),used=res.forms.flatMap(f=>f.cells.map(p=>p.join(',')));assert.equal(used.length,new Set(used).size);
 assert.equal(res.forms[0].type,'hexagon');
}
console.log('STAGGERED_RULES_PASS',JSON.stringify({boards,frames,pathSamples,ghosts,shapeFixtures}));

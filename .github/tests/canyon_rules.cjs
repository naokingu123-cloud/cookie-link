const fs=require('fs'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8'),source=fs.readFileSync('assets/choco-dig.js','utf8'),base=html.slice(html.indexOf('class Engine{'),html.indexOf('/* Chocolate Canyon:',html.indexOf('class Engine{')));
const q=new Function('SIZE','wonderTier',base+source.split('const chocoSprites=')[0]+';return {ChocoDigEngine,chocoGroups,chocoFallStep,chocoPlan,chocoClone,CHOCO_PRIZES,CHOCO_SAVE_KEY};')(5,()=>0);
const empty=()=>Array.from({length:12},()=>Array(7).fill(null)),tile=(id,color,number=null,prize=null)=>({id,color,number,prize}),rng=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
let g=empty();g[0][0]=tile(1,0,1);g[0][1]=tile(2,0,2);g[1][1]=tile(3,0);g[1][2]=tile(4,1,3);let p=q.chocoPlan(g,[1,2]);assert.equal(p.removed.length,3);assert.equal(p.gain,0);assert.equal(q.chocoGroups(g).groups.length,2);
g=empty();g[9][1]=tile(1,0);g[10][0]=tile(2,0);g[11][0]=tile(3,0);let step=q.chocoFallStep(g);assert.equal(step.moves.length,1);assert.equal(step.grid[10][1].id,1);assert.equal(step.merged.length,3);assert.equal(q.chocoFallStep(step.grid).moves.length,0,'Merged floating arm must stop with anchored cake');
g=empty();g[9][1]=tile(1,0);g[10][1]=tile(2,1);step=q.chocoFallStep(g);assert.equal(step.moves.length,2);assert.equal(step.grid[10][1].id,1);assert.equal(step.grid[11][1].id,2);
g=empty();g[0][0]=tile(1,1,1);g[2][0]=tile(2,0,2,'silver');p=q.chocoPlan(g,[2],{trace:true});assert.equal(p.gain,0,'Buried foil paid too early');assert.equal(p.grid[11][0].color,-1);assert.equal(p.grid[11][0].id,2);p=q.chocoPlan(p.grid,[1],{trace:true});assert.equal(p.gain,q.CHOCO_PRIZES.silver);assert.equal(p.prizes.length,1);assert.equal(q.chocoPlan(p.grid,[1]).gain,0,'Double reward');
g=empty();g[0][2]=tile(1,0,null,'gold');assert.equal(q.chocoPlan(g,[25]).gain,q.CHOCO_PRIZES.gold);
// All four-cake clears must occur after gravity stops, including subsequent cascades.
g=empty();g[0][0]=tile(1,0);g[0][1]=tile(2,0);g[1][0]=tile(3,0);g[1][1]=tile(4,0);
p=q.chocoPlan(g,[25],{trace:true});assert.equal(p.removed.length,4);assert(p.timeline.findIndex(s=>s.phase==='canyonFall')<p.timeline.findIndex(s=>s.chain));
for(let i=0;i<p.timeline.length;i++)if(p.timeline[i].chain){assert.equal(q.chocoFallStep(p.timeline[i-1].grid).moves.length,0,'Chain cleared before all falling cakes settled');}
g=empty();g[11][0]=tile(1,0);g[11][1]=tile(2,0);g[11][2]=tile(3,0);assert.equal(q.chocoPlan(g,[25]).removed.length,0,'Three cakes auto-cleared');
// Refills randomly restore only a subset of absent, undrawn numbers.
const refill=new q.ChocoDigEngine({random:rng(765),sleep:()=>Promise.resolve()});refill.strata.flat().forEach(t=>t.number=null);refill.assignNumbers(new Set([1,2,3]));const restored=refill.strata.flat().map(t=>t.number).filter(Boolean);assert(restored.length>0&&restored.length<22);assert(!restored.some(n=>n<=3));assert.equal(new Set(restored).size,restored.length);
async function idle(e){for(let i=0;i<20000;i++){if(!e.busy&&!e.queue.length)return;await Promise.resolve();}throw Error('Engine did not drain');}
(async()=>{
 let games=0;for(let seed=1;seed<=80;seed++){
  const e=new q.ChocoDigEngine({random:rng(seed),sleep:()=>Promise.resolve(),onEvent:ev=>{if(ev.phase==='error')throw Error(ev.message)}});e.visualWait=async(ms,token)=>token===e.version;
  assert.equal(e.strata.length,12);assert(e.strata.every(r=>r.length===7));assert.equal(new Set(e.strata.flat().map(t=>t.number).filter(Boolean)).size,25);const original=e.world();assert(e.validWorld(original));const bad=structuredClone(original);bad.strata[0][1].id=bad.strata[0][0].id;assert(!e.validWorld(bad));
  e.start();for(const batch of [[1,2,3],[4,5],[6],[7],[8]]){e.enqueueBatch(batch);await idle(e);const tiles=e.strata.flat().filter(Boolean),ids=tiles.map(t=>t.id),nums=tiles.map(t=>t.number).filter(Boolean);assert.equal(new Set(ids).size,ids.length);assert.equal(new Set(nums).size,nums.length);assert(!nums.some(n=>e.drawn.has(n)));assert.equal(q.chocoFallStep(e.strata).moves.length,0,'Final grid unstable');}
  assert.equal(e.processed,8);assert.equal(e.phase,'complete');assert.equal(e.totalHundredths%10,0);const old=e.depth,win=e.totalHundredths;e.reset();assert.equal(e.depth,win>0?old:0);games++;
 }
 const e=new q.ChocoDigEngine({random:rng(991),sleep:()=>Promise.resolve()});e.depth=37;e.continueDepth=true;e.phase='complete';e.reset();assert.equal(e.depth,37);e.depth=42;e.continueDepth=false;e.phase='complete';e.reset();assert.equal(e.depth,0);
 const before=JSON.stringify(e.world());e.roundBet=0;e.start();assert(!e.running);assert.equal(JSON.stringify(e.world()),before);
 e.roundBet=100;e.start();const checkpoint=JSON.stringify(e.checkpoint);e.depth+=5;e.reset();assert.equal(JSON.stringify(e.world()),checkpoint);assert(!e.running&&!e.busy);
 const store={raw:null,getItem(){return this.raw},setItem(k,v){this.raw=v},removeItem(){this.raw=null}};e.enablePersistence(store);e.depth=24;e.continueDepth=true;e.persist();const loaded=new q.ChocoDigEngine({random:rng(3),sleep:()=>Promise.resolve()});loaded.enablePersistence(store);assert.equal(loaded.depth,24);assert(loaded.validWorld(loaded.world()));e.continueDepth=false;e.persist();assert.equal(store.raw,null);
 console.log('CANYON_RULES_PASS',JSON.stringify({games,cols:7,rows:12,colors:4,midFallMerge:true,buriedPrizeRetained:true,exposureOnly:true,continuation:true,zeroBet:true,persistence:true,checkpoint:true}));
})().catch(e=>{console.error(e);process.exit(1)});

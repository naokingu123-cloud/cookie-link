const fs=require('fs'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8'),source=fs.readFileSync('assets/choco-dig.js','utf8'),base=html.slice(html.indexOf('class Engine{'),html.indexOf('/* Chocolate Canyon:',html.indexOf('class Engine{')));
assert(html.includes(source.trim()),'Shipped engine and dedicated source differ');
const q=new Function('SIZE','wonderTier',base+source.split('const chocoSprites=')[0]+';return {ChocoDigEngine,chocoGroups,chocoFallStep,chocoPlan,chocoExcavate,chocoClone,chocoDrillLevel,CHOCO_DRILL_POWER,CHOCO_PRIZES,CHOCO_SAVE_KEY};')(5,()=>0);
const empty=()=>Array.from({length:12},()=>Array(7).fill(null)),tile=(id,color,prize=null)=>({id,color,number:null,prize}),rng=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const full=()=>Array.from({length:12},(_,r)=>Array.from({length:7},(_,c)=>tile(r*7+c+1,(r+c)%4)));
const state=()=>({drills:Array.from({length:7},(_,c)=>({numbers:[c*3+1,c*3+2,c*3+3],hits:[]})),lucky:{numbers:[22,23,24],hits:[]}});
// One connected component is one stratum, regardless of its cell count.
assert.deepEqual(q.CHOCO_DRILL_POWER,[0,1,2,3,4,5]);
for(let level=1;level<=5;level++){
 const grid=full(),p=q.chocoExcavate(grid,[{column:3,level}],{trace:true,refill:false}),impacts=p.timeline.filter(s=>s.phase==='canyonImpact');assert.equal(impacts.length,level);assert(impacts.every(s=>s.targets.length===1));assert.deepEqual(grid,full(),'Planning mutated input');
}
let grid=full();grid[0][0].color=grid[0][1].color;let p=q.chocoExcavate(grid,[{column:0,level:1}],{trace:true,refill:false});let impact=p.timeline.find(s=>s.phase==='canyonImpact');assert.equal(impact.targets.length,3);assert.deepEqual(impact.targets.map(t=>t.wave).sort(),[0,1,1]);assert.equal(impact.impacts.length,1);
p=q.chocoExcavate(grid,[{column:0,level:1},{column:1,level:1}],{trace:true,refill:false});assert.equal(p.timeline.find(s=>s.phase==='canyonImpact').impacts.length,1,'Same stratum hit twice');
const levels=p=>p.timeline.filter(s=>s.phase==='canyonLevel').map(s=>s.level);
p=q.chocoPlan(full(),[1,2,3],{...state(),trace:true});assert.deepEqual(levels(p),[1,2,3]);assert.equal(q.chocoDrillLevel(p.drills[0],p.lucky),3);
p=q.chocoPlan(full(),[22,23,1,2,3],{...state(),trace:true});assert.deepEqual(levels(p),[3,4,5]);assert.equal(q.chocoDrillLevel(p.drills[0],p.lucky),5);
p=q.chocoPlan(full(),[22,23],{...state(),trace:true});assert.deepEqual(p.grid,full());assert.equal(p.gain,0);
p=q.chocoPlan(full(),[24],{...state(),trace:true});assert.equal(p.timeline.find(s=>s.phase==='canyonDrill').attacks.length,7);assert(p.drills.every(d=>q.chocoDrillLevel(d,p.lucky)===0));
p=q.chocoPlan(full(),[25],{...state(),trace:true});assert.deepEqual(p.grid,full());assert.equal(p.timeline[0].phase,'canyonMiss');
let first=q.chocoPlan(full(),[1,22],{...state()});p=q.chocoPlan(first.grid,[1,22],{drills:first.drills,lucky:first.lucky,trace:true});assert.deepEqual(p.grid,first.grid);assert.equal(p.timeline.length,0);
// Falling four-cell groups melt midair, immediately after the first row of travel.
grid=empty();for(let c=0;c<4;c++)grid[0][c]=tile(c+1,0);grid[11][6]=tile(90,2);
p=q.chocoExcavate(grid,[{column:6,level:1}],{trace:true,refill:false});const auto=p.timeline.find(s=>s.phase==='canyonMelt'&&!s.drill);assert(auto);assert(auto.targets.every(v=>v.r===1));assert.equal(p.timeline.filter(s=>s.phase==='canyonImpact').length,1);assert.equal(p.removed.length,5);
// An anchored static four does not clear; any falling merger to four does.
grid=empty();for(let c=0;c<4;c++)grid[11][c]=tile(c+1,0);grid[11][6]=tile(90,2);p=q.chocoExcavate(grid,[{column:6,level:1}],{trace:true,refill:false});assert.equal(p.removed.length,1);
grid=empty();for(let r=9;r<12;r++)grid[r][0]=tile(r,0);grid[8][1]=tile(20,0);grid[11][6]=tile(90,2);p=q.chocoExcavate(grid,[{column:6,level:1}],{trace:true,refill:false});assert.equal(p.timeline.find(s=>s.phase==='canyonMelt'&&!s.drill).targets.length,4);
grid=empty();grid[9][1]=tile(1,0);grid[10][0]=tile(2,0);grid[11][0]=tile(3,0);let step=q.chocoFallStep(grid);assert.equal(step.moves.length,1);assert.equal(step.merged.length,3);assert.equal(q.chocoFallStep(step.grid).moves.length,0);
// Singleton rewards never merge. Exposed odds apply to current ore before collection.
const ore=(id,kind,value)=>({...tile(id,-1),item:'ore',ore:kind,baseValue:value,value,multiplier:1});
grid=full();grid[0][0]=ore(1,'copper',20);grid[0][1]={...tile(2,-1),item:'odds'};grid[0][2]={...tile(3,-1),item:'sugar'};grid[5][4]=ore(40,'gold',300);
p=q.chocoExcavate(grid,[{column:6,level:1}],{trace:true,refill:false});assert.equal(p.gain,40);assert.equal(p.sugarCount,1);assert.equal(p.oddsCount,1);assert.equal(p.grid.flat().find(t=>t?.id===40).value,600);assert.equal(p.timeline.find(s=>s.phase==='canyonOdds').factor,2);assert.equal(q.chocoExcavate(p.grid,[{column:6,level:1}],{refill:false}).gain,0);
grid=empty();grid[11][0]=ore(1,'silver',70);grid[11][1]=ore(2,'silver',70);assert.equal(q.chocoGroups(grid).groups.length,2);
// The top row scrolls during a cascade and may scroll simultaneously with midair melt.
grid=empty();for(let c=0;c<4;c++)grid[0][c]=tile(c+1,0);grid[11][6]=tile(90,2);p=q.chocoExcavate(grid,[{column:6,level:1}],{trace:true});const simultaneous=p.timeline.find(s=>s.phase==='canyonMelt'&&!s.drill&&s.scroll);assert(simultaneous);assert.equal(simultaneous.scroll.advanced,1);assert(p.timeline.slice(p.timeline.indexOf(simultaneous)+1).some(s=>s.phase==='canyonFall'));
for(let seed=1;seed<=25;seed++){const e=new q.ChocoDigEngine({random:rng(seed)}),before=JSON.stringify(e.world()),a=e.plan([...e.lucky.numbers,...e.drills[0].numbers],{trace:true}),b=e.plan([...e.lucky.numbers,...e.drills[0].numbers]);assert.deepEqual(a.grid,b.grid);assert.equal(a.gain,b.gain);assert.equal(a.seed,b.seed);assert.equal(JSON.stringify(e.world()),before);}
// Collection and camera advance share a stage: no wait for flight or remaining cascades.
grid=full();for(let c=0;c<7;c++)grid[0][c]=ore(c+1,'copper',10);p=q.chocoExcavate(grid,[{column:6,level:1}],{trace:true});const collect=p.timeline.find(s=>s.phase==='canyonCollect');assert.equal(collect.scroll.advanced,1);assert.equal(collect.depth,1);assert.equal(collect.items.length,7);
for(let seed=1;seed<=80;seed++){grid=full();for(let c=0;c<7;c++)grid[0][c]={...tile(c+1,-1),item:'odds'};p=q.chocoExcavate(grid,[{column:6,level:1}],{trace:true,seed});const up=p.timeline.find(s=>s.phase==='canyonOdds');assert.equal(up.scroll.advanced,1);for(const t of up.grid.flat())if(t?.item==='ore'&&t.id>84)assert.equal(t.multiplier,1,'Future ore received past odds upgrade');}
async function idle(e){for(let i=0;i<30000;i++){if(!e.busy&&!e.queue.length)return;await Promise.resolve();}throw Error('Engine did not drain');}
function assigned(e){assert(e.strata.flat().filter(Boolean).every(t=>t.number==null));assert.equal(e.drills.length,7);const all=[...e.drills.flatMap(d=>d.numbers),...e.lucky.numbers,e.missNumber];assert.deepEqual([...all].sort((a,b)=>a-b),Array.from({length:25},(_,i)=>i+1));}
(async()=>{
 let games=0;for(let seed=1;seed<=80;seed++){
  const events=[],e=new q.ChocoDigEngine({random:rng(seed),sleep:()=>Promise.resolve(),onEvent:ev=>{events.push(ev);if(ev.phase==='error')throw Error(ev.message)}});e.visualWait=async(ms,token)=>token===e.version;
  assigned(e);const original=e.world();assert(e.validWorld(original));const bad=structuredClone(original);bad.drills[0].numbers[0]=bad.drills[1].numbers[0];assert(!e.validWorld(bad));const badTile=structuredClone(original);badTile.strata[0][1].id=badTile.strata[0][0].id;assert(!e.validWorld(badTile));
  e.start();for(const batch of [[1,2,3],[4,5],[6],[7],[8]]){e.enqueueBatch(batch);await idle(e);assigned(e);const ids=e.strata.flat().filter(Boolean).map(t=>t.id);assert.equal(new Set(ids).size,ids.length);assert.equal(q.chocoFallStep(e.strata).moves.length,0);}
  assert.equal(e.processed,8);assert.equal(e.phase,'complete');assert.equal(e.totalHundredths%10,0);const old=e.depth,win=e.totalHundredths;e.reset();assert.equal(e.depth,win>0?old:0);assert.equal(e.strata.flat().filter(Boolean).length,84);assigned(e);assert(e.drills.every(d=>!d.hits.length));assert.equal(e.lucky.hits.length,0);games++;
 }
 const e=new q.ChocoDigEngine({random:rng(991),sleep:()=>Promise.resolve()});e.depth=37;e.continueDepth=true;e.phase='complete';e.reset();assert.equal(e.depth,37);e.depth=42;e.continueDepth=false;e.phase='complete';e.reset();assert.equal(e.depth,0);
 const before=JSON.stringify(e.world());e.roundBet=0;e.start();assert(!e.running);assert.equal(JSON.stringify(e.world()),before);
 e.roundBet=100;e.start();const checkpoint=JSON.stringify(e.checkpoint);e.depth+=5;e.drills[0].hits.push(e.drills[0].numbers[0]);e.reset();assert.equal(JSON.stringify(e.world()),checkpoint);assert(!e.running&&!e.busy);
 const store={raw:null,getItem(){return this.raw},setItem(k,v){this.raw=v},removeItem(){this.raw=null}};e.enablePersistence(store);e.depth=24;e.continueDepth=true;e.persist();const loaded=new q.ChocoDigEngine({random:rng(3),sleep:()=>Promise.resolve()});loaded.enablePersistence(store);assert.equal(loaded.depth,24);assert(loaded.validWorld(loaded.world()));assigned(loaded);assert(loaded.drills.every(d=>!d.hits.length));e.continueDepth=false;e.persist();assert.equal(store.raw,null);
 const legacy={...e.world(),version:2,depth:36};delete legacy.drills;delete legacy.lucky;delete legacy.missNumber;legacy.strata.flat().filter(t=>t.color>=0).forEach((t,i)=>t.number=i<25?i+1:null);store.raw=JSON.stringify(legacy);loaded.enablePersistence(store);assert.equal(loaded.depth,36);assigned(loaded);
 let cancelled=false,f;f=new q.ChocoDigEngine({random:rng(31),sleep:()=>Promise.resolve(),onEvent:ev=>{if(ev.phase==='canyonDrill'&&!cancelled){cancelled=true;f.reset();}}});f.visualWait=async(ms,token)=>token===f.version;const start=JSON.stringify(f.world());f.start();f.enqueue(f.drills[0].numbers[0]);await idle(f);assert(cancelled);assert.equal(JSON.stringify(f.world()),start);assert.equal(f.processed,0);
 let queued=false,g;g=new q.ChocoDigEngine({random:rng(39),sleep:()=>Promise.resolve(),onEvent:ev=>{if(ev.phase==='canyonDrill'&&!queued){queued=true;g.enqueue(g.drills[1].numbers[0]);}}});g.visualWait=async(ms,token)=>token===g.version;g.start();const n=g.drills[0].numbers[0];assert(g.enqueue(n));assert(!g.enqueue(n));await idle(g);assert.equal(g.processed,2);assert.equal(g.drills[0].hits.length,1);assert.equal(g.drills[1].hits.length,1);
 console.log('CANYON_DRILLS_PASS',JSON.stringify({games,columns:7,powers:q.CHOCO_DRILL_POWER.slice(1),numberlessTiles:true,luckyBoosts:2,allColumns:true,orderedBatch:true,legacyMigration:true,checkpoint:true,resetCancellation:true,queueSafety:true}));
})().catch(e=>{console.error(e);process.exit(1)});

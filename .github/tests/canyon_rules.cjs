const fs=require('fs'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8'),source=fs.readFileSync('assets/choco-dig.js','utf8'),base=html.slice(html.indexOf('class Engine{'),html.indexOf('/* Chocolate Canyon:',html.indexOf('class Engine{')));
assert(html.includes(source.trim()),'Shipped engine and dedicated source differ');
const q=new Function('SIZE','wonderTier',base+source.split('const chocoSprites=')[0]+';return {ChocoDigEngine,chocoGroups,chocoFallStep,chocoPlan,chocoExcavate,chocoClone,chocoJoinMotion,chocoDrillRoute,chocoDrillLevel,CHOCO_DRILL_POWER,CHOCO_PRIZES,CHOCO_SAVE_KEY,chocoFillRows,chocoOreRates,CHOCO_FRUIT_DEPTH,chocoFruitWin,chocoFallDuration,chocoBonusKind};')(5,()=>0);
const empty=()=>Array.from({length:12},()=>Array(7).fill(null)),tile=(id,color,prize=null)=>({id,color,number:null,prize}),rng=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const full=()=>Array.from({length:12},(_,r)=>Array.from({length:7},(_,c)=>tile(r*7+c+1,(r+c)%4)));
const state=()=>({drills:Array.from({length:13},(_,c)=>({numbers:[c+1],hits:[],level:1})),lucky:{numbers:[14,15,16],hits:[],drawn:[]}});
// Consecutive fall steps become one accelerated movement without resetting at each metre.
{const a=empty(),b=empty(),c=empty();a[0][0]=tile(1,0);b[1][0]=tile(1,0);c[2][0]=tile(1,0);const joined=q.chocoJoinMotion([{phase:'canyonFall',before:a,grid:b,depth:0,ms:180},{phase:'canyonFall',before:b,grid:c,depth:0,ms:180}]);assert.equal(joined.length,1);assert.equal(joined[0].ms,q.chocoFallDuration(2));assert.deepEqual(joined[0].moves[0].from,[0,0]);assert.deepEqual(joined[0].moves[0].to,[2,0]);}
// One connected component is one stratum, regardless of its cell count.
assert.deepEqual(q.CHOCO_DRILL_POWER,[0,1,2,3,4,5]);
for(let level=1;level<=5;level++){
 const grid=full(),p=q.chocoExcavate(grid,[{column:3,level}],{trace:true,refill:false}),impacts=p.timeline.filter(s=>s.phase==='canyonSoften');assert.equal(impacts.length,level);assert(impacts.every(s=>s.targets.length===1));assert.deepEqual(grid,full(),'Planning mutated input');
}
let grid=full();grid[0][0].color=grid[0][1].color;let p=q.chocoExcavate(grid,[{column:0,level:1}],{trace:true,refill:false});let impact=p.timeline.find(s=>s.phase==='canyonSoften');assert.equal(impact.targets.length,3);assert.deepEqual(impact.targets.map(t=>t.wave).sort(),[0,1,1]);assert.equal(impact.impacts.length,1);
p=q.chocoExcavate(grid,[{column:0,level:1},{column:1,level:1}],{trace:true,refill:false});assert.equal(p.timeline.find(s=>s.phase==='canyonSoften').impacts.length,1,'Same stratum hit twice');
// A single number per drill, Lv.1 start, current-level excavation BEFORE upgrade.
p=q.chocoPlan(full(),[1],{...state(),trace:true,refill:false});assert.equal(p.timeline[0].phase,'canyonDrill');assert.equal(p.timeline[0].attacks[0].level,1);assert.equal(p.drills[0].level,2);assert.equal(p.timeline.at(-2).phase,'canyonUpgrade');assert(p.timeline.at(-2).afterDig);
let st=state();st.drills[0].level=3;p=q.chocoPlan(full(),[1],{...st,trace:true,refill:false});assert.equal(p.timeline.filter(s=>s.phase==='canyonDrill').length,1);assert.equal(p.timeline.filter(s=>s.phase==='canyonBore').length,2);assert.equal(p.timeline.filter(s=>s.phase==='canyonSoften').length,3);assert.equal(p.drills[0].level,4);assert(p.timeline.filter(s=>['canyonDrill','canyonBore','canyonSoften','canyonReturn'].includes(s.phase)).every(s=>s.flights.length===1));
const bores=p.timeline.filter(s=>['canyonDrill','canyonBore'].includes(s.phase));assert(bores[0].flights[0].launch);for(let i=1;i<bores.length;i++){assert(!bores[i].flights[0].launch);assert.equal(bores[i].flights[0].from,bores[i-1].flights[0].to);}
// Mixed-depth drills all finish and return home before gravity or chain melting starts.
{const grid=full();grid[1][5]=null;const p=q.chocoExcavate(grid,[{...q.chocoDrillRoute(0),level:1},{...q.chocoDrillRoute(3),level:3}],{trace:true,refill:false});
 const ret=p.timeline.findIndex(s=>s.phase==='canyonReturn');assert(ret>0);assert.equal(p.timeline.filter(s=>s.phase==='canyonSoften').length,3);
 assert.deepEqual(p.timeline[ret].flights.map(f=>f.index).sort(),[0,3]);
 assert(!p.timeline.slice(0,ret).some(s=>s.phase==='canyonFall'||(s.phase==='canyonMelt'&&!s.drill)));
 assert(p.timeline.slice(ret+1).some(s=>s.phase==='canyonFall'));assert(p.timeline.slice(ret+1).every(s=>s.flights.length===0));
 const short=p.timeline[ret].flights.find(f=>f.index===0);assert.equal(short.toY,p.timeline.find(s=>s.phase==='canyonDrill').flights.find(f=>f.index===0).toY);
}
// Digging never scrolls, and the next bore overlaps the previous stratum's melt.
{const board=full();for(let c=0;c<7;c++)board[0][c].color=0;const p=q.chocoExcavate(board,[{column:0,level:3}],{trace:true});const ret=p.timeline.findIndex(s=>s.phase==='canyonReturn');assert(ret>0);assert(p.timeline.slice(0,ret+1).every(s=>s.depth===0&&!s.scroll&&s.phase!=='canyonScroll'));const bore=p.timeline.find(s=>s.phase==='canyonBore');assert(bore.digEffects.some(e=>bore.digTime<e.start+e.duration));assert(p.timeline.filter(s=>s.phase==='canyonMelt'&&s.drill).every(s=>s.ms===0));assert(p.timeline.findIndex(s=>s.scroll||s.phase==='canyonScroll')>ret);}
// Misses do nothing. Every hit renews only its number; all 16 remain unhit and unique.
st=state();p=q.chocoPlan(full(),[17],{...st,trace:true});assert.deepEqual(p.drills,st.drills);assert.deepEqual(p.grid,full());assert.equal(p.timeline.length,0);
for(const li of [0,1,2]){p=q.chocoPlan(full(),[14+li],{...state(),trace:true,refill:false});const attack=p.timeline.find(s=>s.phase==='canyonDrill').attacks;assert.equal(attack.length,li===0?7:3);assert(attack.every(a=>a.direction===['top','left','right'][li]));for(let i=0;i<13;i++)assert.equal(p.drills[i].level,((li===0&&i<7)||(li===1&&i>=7&&i<10)||(li===2&&i>=10))?2:1);assert(!p.lucky.numbers.includes(14+li));assert.equal(p.timeline.at(-1).phase,'canyonNumberRenew');}
for(const index of [7,8,9,10,11,12]){st=state();st.drills[index].level=3;p=q.chocoPlan(full(),[index+1],{...st,trace:true,refill:false});const stages=p.timeline.filter(s=>['canyonDrill','canyonBore'].includes(s.phase));assert(stages.length>0);assert.equal(stages.filter(s=>s.phase==='canyonDrill').length,1);for(const s of stages){const f=s.flights[0];assert.equal(f.direction,index<10?'left':'right');assert(index<10?f.toX>=f.fromX:f.toX<=f.fromX);assert.equal(f.toY,f.fromY);}assert.equal(p.drills[index].level,4);assert.notEqual(p.drills[index].numbers[0],index+1);}
st=state();st.drills[0].level=5;p=q.chocoPlan(full(),[1],{...st,trace:true});assert.equal(p.drills[0].level,5);assert.notEqual(p.drills[0].numbers[0],1);
let first=q.chocoPlan(full(),[1,14],{...state()});p=q.chocoPlan(first.grid,[1,14],{drills:first.drills,lucky:first.lucky,trace:true});assert.deepEqual(p.grid,first.grid);assert.equal(p.timeline.length,0);
// Even eight consecutive hits leave sixteen distinct unhit numbers.
st=state();let seen=[];for(let i=0;i<8;i++){const n=st.drills[0].numbers[0];seen.push(n);const z=q.chocoPlan(full(),[n],{...st,seed:81+i});st={drills:z.drills,lucky:z.lucky};const all=[...st.drills.flatMap(d=>d.numbers),...st.lucky.numbers];assert.equal(new Set(all).size,16);assert(all.every(n=>!seen.includes(n)));}
// Existing groups of four or more clear after a fall step, even without a new join.
for(const size of [3,4,5,6]){
 grid=empty();for(let c=0;c<size;c++)grid[0][c]=tile(c+1,0);grid[11][6]=tile(90,2);
 p=q.chocoExcavate(grid,[{column:6,level:1}],{trace:true,refill:false});
 const at=p.timeline.findIndex(s=>s.phase==='canyonMelt'&&!s.drill);
 if(size<4){assert.equal(at,-1);assert.equal(p.grid[11].filter(t=>t?.color===0).length,size);}
 else{assert(at>0);assert.equal(p.timeline[at-1].phase,'canyonFall');assert.equal(p.timeline[at-1].merged.length,0);assert.equal(p.timeline[at].targets.length,size);assert(p.timeline[at].targets.every(v=>v.r===11));assert.equal(p.timeline[at-1].ms,q.chocoFallDuration(11));assert.equal(p.removed.length,size+1);assert(!p.grid.flat().some(t=>t?.color===0));}
}
// Two existing large groups joining are still a new merger and clear together.
grid=empty();for(let c=0;c<4;c++){grid[9][c]=tile(c+1,0);grid[11][c]=tile(c+20,0);}grid[11][6]=tile(90,2);p=q.chocoExcavate(grid,[{column:6,level:1}],{trace:true,refill:false});assert.equal(p.timeline.find(s=>s.phase==='canyonMelt'&&!s.drill).targets.length,8);
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
grid=empty();for(let c=0;c<4;c++)grid[0][c]=tile(c+1,0);grid[11][6]=tile(90,2);p=q.chocoExcavate(grid,[{column:6,level:1}],{trace:true});const simultaneous=p.timeline.find(s=>s.phase==='canyonFall'&&s.scroll);assert(simultaneous);assert(simultaneous.scroll.advanced>=1);assert(simultaneous.moves.length>0);assert(simultaneous.ms>=125);assert.equal(simultaneous.scroll.before[0][0].id,1);
for(let seed=1;seed<=25;seed++){const e=new q.ChocoDigEngine({random:rng(seed)}),before=JSON.stringify(e.world()),a=e.plan([...e.lucky.numbers,...e.drills[0].numbers],{trace:true}),b=e.plan([...e.lucky.numbers,...e.drills[0].numbers]);assert.deepEqual(a.grid,b.grid);assert.equal(a.gain,b.gain);assert.equal(a.seed,b.seed);assert.equal(JSON.stringify(e.world()),before);}
// Collection and camera advance share a stage: no wait for flight or remaining cascades.
grid=full();for(let c=0;c<7;c++)grid[0][c]=ore(c+1,'copper',10);p=q.chocoExcavate(grid,[{column:6,level:1}],{trace:true});const collect=p.timeline.find(s=>s.phase==='canyonCollect');assert(!collect.scroll);assert.equal(collect.depth,0);assert.equal(collect.items.length,7);assert(p.timeline.findIndex(s=>s.scroll||s.phase==='canyonScroll')>p.timeline.findIndex(s=>s.phase==='canyonReturn'));
for(let seed=1;seed<=80;seed++){grid=full();for(let c=0;c<7;c++)grid[0][c]={...tile(c+1,-1),item:'odds'};p=q.chocoExcavate(grid,[{column:6,level:1}],{trace:true,seed});const up=p.timeline.find(s=>s.phase==='canyonOdds');assert(!up.scroll);assert.equal(up.depth,0);for(const t of up.grid.flat())if(t?.item==='ore'&&t.id>84)assert.equal(t.multiplier,1,'Future ore received past odds upgrade');}
// Refills can extend the old bottom section without treating generation as a match.
{let continued=0;for(let seed=1;seed<=200;seed++){const board=full();board[0].fill(null);const p=q.chocoExcavate(board,[],{trace:true,seed});const extensions=p.grid.flat().filter(t=>t?.extension);if(!extensions.length)continue;continued++;for(const t of extensions){const group=q.chocoGroups(p.grid).groups.find(g=>g.some(v=>v.tile.id===t.id));assert(group.some(v=>v.tile.id<=84));assert(group.length<=9);assert(!p.removed.some(v=>v.tile.id===t.id));}assert(!p.timeline.some(s=>s.phase==='canyonMelt'));}assert(continued>=20);}
// Ore and sugar remain inside their cake until its shell is broken, including side digs.
{const board=full();board[2][0]={...ore(15,'gold',300),color:2,encased:true};const p=q.chocoExcavate(board,[{...q.chocoDrillRoute(7),level:1}],{trace:true,refill:false});assert(p.collected.some(v=>v.tile.id===15));assert(p.timeline.findIndex(s=>s.phase==='canyonMelt'&&s.targets.some(v=>v.tile.id===15))<p.timeline.findIndex(s=>s.phase==='canyonCollect'&&s.items.some(v=>v.tile.id===15)));assert(!p.grid.flat().some(t=>t?.id===15));}
{const board=full();board[0][0]={...ore(1,'gold',300),color:0,encased:true};const p=q.chocoExcavate(board,[],{trace:true,refill:false});assert.equal(p.gain,0);assert(p.grid[0][0].encased);}
// An exposed all-clear after drilling scrolls during the same chain-melt animation.
{const board=full();board[1][0]={...tile(8,-1),item:'clear'};const p=q.chocoExcavate(board,[{column:0,level:1}],{trace:true});const melt=p.timeline.find(s=>s.phase==='canyonMelt'&&!s.drill);assert(melt?.scroll);assert(melt.scroll.advanced>0);assert(melt.before[0].some(Boolean));}
// Rare items activate on exposure and operate on whole connected sections.
for(const kind of ['clear','random','transmute']){
 const board=full();board[0][0]={...tile(1,-1),item:kind};board[5][5]=ore(41,'diamond',500);const before=q.chocoGroups(board),p=q.chocoExcavate(board,[{column:6,level:1}],{trace:true,refill:false,seed:93});const effect=p.timeline.find(s=>s.phase==='canyonPower');assert.equal(effect.kind,kind);assert(!effect.targets.some(v=>v.tile.id===41));
 if(kind==='clear'){assert.equal(effect.targets.length,82);assert(p.collected.some(v=>v.tile.id===41));assert(!p.removed.some(v=>v.tile.id===41));}
 else{assert.equal(new Set(effect.targets.map(v=>before.byId.get(v.tile.id))).size,kind==='random'?3:1);if(kind==='transmute'){const transformed=p.timeline.find(s=>s.phase==='canyonTransform');for(const v of effect.targets)assert.equal(transformed.grid[v.r][v.c].item,'ore');}}
}
// Rarity follows this game's distance, never accumulated lifetime depth.
for(const key of ['silver','gold','diamond'])assert(q.chocoOreRates(60)[key]>q.chocoOreRates(30)[key]&&q.chocoOreRates(30)[key]>q.chocoOreRates(0)[key]);
// Absolute world rows, independent of per-game start depth. The layer is visible before the camera reaches it.
const bonusWins=[300,500,1000,2000,3000,5000,7500,10000,20000,30000,30000,30000];
assert.deepEqual(bonusWins.map((_,i)=>q.chocoFruitWin(i+1)),bonusWins);
for(let index=1;index<=12;index++)for(const startDepth of [0,index*100-20]){
 const depth=index*100-6,w={strata:[],seed:71,uid:0,depth,startDepth,nextSugar:10000,fruitCount:0,bonusResolvedDepth:0};q.chocoFillRows(w);
 const rows=w.strata.map((row,r)=>row.some(t=>t.item==='fruit')?r:-1).filter(r=>r>=0);assert.deepEqual(rows,[6]);assert(w.strata[6].every(t=>t.bonusDepth===index*100&&t.fruitIndex===index&&t.fruitValue===bonusWins[index-1]&&t.bonusKind===q.chocoBonusKind(index)));
 const resolved={...w,strata:[],bonusResolvedDepth:index*100};q.chocoFillRows(resolved);assert(!resolved.strata.flat().some(t=>t.item==='fruit'));
}
for(const depth of [0,10,20,30,40,50,60,70,80,101,125,150]){const w={strata:[],seed:9,uid:0,depth,startDepth:depth,nextSugar:10000};q.chocoFillRows(w);assert(!w.strata.flat().some(t=>t.item==='fruit'));}
// Refill crosses 100 m precisely, with normal cake above and below the single row.
{const w={strata:full().slice(0,10),seed:71,uid:84,depth:90,startDepth:90,nextSugar:10000};q.chocoFillRows(w);assert(w.strata[10].every(t=>t.bonusDepth===100));assert(w.strata[11].every(t=>t.item!=='fruit'));}
// Each milestone awards once, including seven simultaneous drills; diamond remains capped at 300x.
for(let index=1;index<=12;index++){
 const board=full();for(let c=0;c<7;c++)board[0][c]={...tile(c+1,4),item:'fruit',fruitIndex:index,bonusDepth:index*100,bonusKind:q.chocoBonusKind(index),fruitValue:q.chocoFruitWin(index)};
 const p=q.chocoExcavate(board,Array.from({length:7},(_,column)=>({column,level:1})),{trace:true,refill:false,depth:index*100});assert.equal(p.gain,bonusWins[index-1]);assert.equal(p.bonusResolvedDepth,index*100);assert.equal(p.timeline.filter(s=>s.phase==='canyonBonus').length,1);assert.equal(p.removed.length,7);
 const again=q.chocoExcavate(p.grid,[],{trace:true,refill:false,depth:p.depth,bonusResolvedDepth:p.bonusResolvedDepth});assert.equal(again.gain,0);
}
// Different milestone layers remain separate even if gravity brings them together.
{const board=empty();for(let r=0;r<2;r++)for(let c=0;c<7;c++)board[r][c]={...tile(r*7+c+1,4),item:'fruit',fruitIndex:r+1};assert.deepEqual(q.chocoGroups(board).groups.map(g=>g.length),[7,7]);}
// A seven-cell bonus layer clears only after landing and awards its own tier.
{const board=empty();for(let c=0;c<7;c++)board[8][c]={...tile(c+1,4),item:'fruit',fruitIndex:3,bonusDepth:300,fruitValue:1000};board[0][6]=tile(90,0);const p=q.chocoExcavate(board,[{column:6,level:1}],{trace:true,refill:false});assert.equal(p.gain,1000);assert(!p.grid.flat().some(t=>t?.item==='fruit'));const melt=p.timeline.find(s=>s.phase==='canyonMelt'&&!s.drill);assert(melt.targets.every(v=>v.r===11));assert.equal(p.timeline.filter(s=>s.phase==='canyonBonus').length,1);}
async function idle(e){for(let i=0;i<30000;i++){if(!e.busy&&!e.queue.length)return;await Promise.resolve();}throw Error('Engine did not drain');}
function assigned(e){assert(e.strata.flat().filter(Boolean).every(t=>t.number==null));assert.equal(e.drills.length,13);const all=[...e.drills.flatMap(d=>d.numbers),...e.lucky.numbers];assert.equal(all.length,16);assert.equal(new Set(all).size,16);assert(e.drills.every(d=>d.numbers.length===1&&d.level>=1&&d.level<=5));assert(e.lucky.drawn.every(n=>n>=1&&n<=25));}
(async()=>{
 // Only the first positive award triggers the continuation announcement.
 {const flags=[];let e;e=new q.ChocoDigEngine({random:rng(82),sleep:()=>Promise.resolve(),onEvent:ev=>{if(['canyonCollect','canyonBonus'].includes(ev.phase))flags.push(e.fx.continueConfirmed);}});e.visualWait=async(ms,token)=>token===e.version;e.strata=full();e.strata[0][0]=ore(1,'gold',300);e.strata[1][6]=ore(14,'gold',300);e.start();e.enqueue(e.drills[6].numbers[0]);await idle(e);assert.deepEqual(flags,[true,false]);assert.equal(e.totalHundredths,600);e.reset();assert.equal(e.totalHundredths,0);}
 {const e=new q.ChocoDigEngine({random:rng(41),sleep:()=>Promise.resolve()});e.visualWait=async(ms,token)=>token===e.version;e.strata=empty();for(let c=0;c<7;c++)e.strata[0][c]={...tile(c+1,4),item:'fruit'};e.uid=7;e.fruitState=1;e.start();const n=e.drills[0].numbers[0];const plan=e.plan([n]);e.enqueue(n);await idle(e);assert.equal(e.totalHundredths,plan.gain);assert(e.totalHundredths>=300);assert.equal(e.bonusResolvedDepth,100);assert(e.validWorld(e.world()));e.freshBoard();assert.equal(e.fruitState,0);assert.equal(e.startDepth,e.depth);assert.equal(e.bonusResolvedDepth,100);e.depth=95;e.freshBoard();assert(!e.strata.flat().some(t=>t.item==='fruit'));const saved=e.world();e.restoreWorld(saved);assert.equal(e.bonusResolvedDepth,100);}
 let games=0;for(let seed=1;seed<=80;seed++){
  const events=[],e=new q.ChocoDigEngine({random:rng(seed),sleep:()=>Promise.resolve(),onEvent:ev=>{events.push(ev);if(ev.phase==='error')throw Error(ev.message)}});e.visualWait=async(ms,token)=>token===e.version;
  assigned(e);const original=e.world();assert(e.validWorld(original));const bad=structuredClone(original);bad.drills[0].numbers[0]=bad.drills[1].numbers[0];assert(!e.validWorld(bad));const badTile=structuredClone(original);badTile.strata[0][1].id=badTile.strata[0][0].id;assert(!e.validWorld(badTile));
  assert.equal(e.drawMode,'single');e.start();for(const batch of [[1],[2],[3],[4],[5],[6],[7],[8]]){e.enqueueBatch(batch);await idle(e);assigned(e);const ids=e.strata.flat().filter(Boolean).map(t=>t.id);assert.equal(new Set(ids).size,ids.length);assert.equal(q.chocoFallStep(e.strata).moves.length,0);}
  assert.equal(e.processed,8);assert.equal(e.phase,'complete');assert.equal(e.totalHundredths%10,0);const old=e.depth,win=e.totalHundredths;e.reset();assert.equal(e.depth,win>0?old:0);assert.equal(e.strata.flat().filter(Boolean).length,84);assigned(e);assert(e.drills.every(d=>!d.hits.length));assert.equal(e.lucky.hits.length,0);games++;
 }
 const e=new q.ChocoDigEngine({random:rng(991),sleep:()=>Promise.resolve()});e.depth=37;e.continueDepth=true;e.phase='complete';e.reset();assert.equal(e.depth,37);e.depth=42;e.continueDepth=false;e.phase='complete';e.reset();assert.equal(e.depth,0);
 const before=JSON.stringify(e.world());e.roundBet=0;e.start();assert(!e.running);assert.equal(JSON.stringify(e.world()),before);
 e.roundBet=100;e.start();const checkpoint=JSON.stringify(e.checkpoint);e.depth+=5;e.drills[0].hits.push(e.drills[0].numbers[0]);e.reset();assert.equal(JSON.stringify(e.world()),checkpoint);assert(!e.running&&!e.busy);
 const store={raw:null,getItem(){return this.raw},setItem(k,v){this.raw=v},removeItem(){this.raw=null}};e.enablePersistence(store);e.depth=24;e.continueDepth=true;e.persist();const loaded=new q.ChocoDigEngine({random:rng(3),sleep:()=>Promise.resolve()});loaded.enablePersistence(store);assert.equal(loaded.depth,24);assert(loaded.validWorld(loaded.world()));assigned(loaded);assert(loaded.drills.every(d=>!d.hits.length));e.continueDepth=false;e.persist();assert.equal(store.raw,null);
 const legacy={...e.world(),version:2,depth:36};delete legacy.drills;delete legacy.lucky;delete legacy.missNumber;legacy.strata.flat().filter(t=>t.color>=0).forEach((t,i)=>t.number=i<25?i+1:null);store.raw=JSON.stringify(legacy);loaded.enablePersistence(store);assert.equal(loaded.depth,36);assigned(loaded);
 let cancelled=false,f;f=new q.ChocoDigEngine({random:rng(31),sleep:()=>Promise.resolve(),onEvent:ev=>{if(ev.phase==='canyonDrill'&&!cancelled){cancelled=true;f.reset();}}});f.visualWait=async(ms,token)=>token===f.version;const start=JSON.stringify(f.world());f.start();f.enqueue(f.drills[0].numbers[0]);await idle(f);assert(cancelled);assert.equal(JSON.stringify(f.world()),start);assert.equal(f.processed,0);
 let queued=false,g;g=new q.ChocoDigEngine({random:rng(39),sleep:()=>Promise.resolve(),onEvent:ev=>{if(ev.phase==='canyonDrill'&&!queued){queued=true;g.enqueue(g.drills[1].numbers[0]);}}});g.visualWait=async(ms,token)=>token===g.version;g.start();const n=g.drills[0].numbers[0];assert(g.enqueue(n));assert(!g.enqueue(n));await idle(g);assert.equal(g.processed,2);assert.equal(g.drills[0].hits.length,1);assert.equal(g.drills[1].hits.length,1);
 // A queued ball may match the renewed number and hit the same drill again.
 let late=false,h,predicted;h=new q.ChocoDigEngine({random:rng(77),sleep:()=>Promise.resolve(),onEvent:ev=>{if(ev.phase==='canyonDrill'&&!late){late=true;h.enqueue(predicted);}}});h.visualWait=async(ms,token)=>token===h.version;const hn=h.drills[0].numbers[0];predicted=h.plan([hn]).drills[0].numbers[0];h.start();h.enqueue(hn);await idle(h);assert.equal(h.processed,2);assert.equal(h.drills[0].level,3);assert.deepEqual(h.drills[0].hits,[hn,predicted]);assert(h.drills.every(d=>!h.seen.has(d.numbers[0])));assert(h.lucky.numbers.every(n=>!h.seen.has(n)));
 // Sugar countdown describes a scheduled tile; it never awards from depth alone.
 const sugarEngine=new q.ChocoDigEngine({random:rng(2)});sugarEngine.depth=18;sugarEngine.strata=[];sugarEngine.nextSugar=18;sugarEngine.ensureRows();assert(sugarEngine.strata.flat().some(t=>t.item==='sugar'));assert(sugarEngine.nextSugar>18);
 console.log('CANYON_DRILLS_PASS',JSON.stringify({games,columns:7,powers:q.CHOCO_DRILL_POWER.slice(1),numberlessTiles:true,luckyBoosts:0,directionalAll:3,singleBall:true,allColumns:true,orderedBatch:true,legacyMigration:true,checkpoint:true,resetCancellation:true,queueSafety:true}));
})().catch(e=>{console.error(e);process.exit(1)});

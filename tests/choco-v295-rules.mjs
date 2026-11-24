import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import {loadChoco,nativeCore,worldFor,empty,cake,plain,random} from './choco-v295-fixture.mjs';

const q=loadChoco({source:nativeCore({runtime:false})}),hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const resolve=(grid,options={})=>q.chocoExcavate(grid,[],{rulesRevision:9,refill:false,seed:295,trace:true,...options});
const chain=plan=>plan.timeline.filter(s=>s.phase==='canyonMelt'&&s.cause==='gravity');
const ids=group=>group.map(v=>v.tile.id).sort((a,b)=>a-b);
const fruit=(id,kind='apple',value=q.CHOCO_FRUITS[kind].min)=>({...cake(id,-1),item:'fruit-prize',fruit:kind,baseValue:value,value,multiplier:1});
function landedOnly(plan){for(const stage of chain(plan)){const moving=new Set(q.chocoFallStep(stage.before,9).moves.map(v=>v.id));assert(stage.targets.every(v=>!moving.has(v.tile.id)),'every cleared tile belongs to a landed rigid group');}}

assert.equal(q.CHOCO_WORLD_REVISION,9);
assert.deepEqual(Object.keys(q.CHOCO_FRUITS),['apple','mandarin','lemon','blueberry','grape','melon']);
assert.deepEqual(Object.values(q.CHOCO_FRUITS).map(v=>v.name),['りんご','みかん','レモン','ブルーベリー','ぶどう','メロン']);

// Explicit legacy versions reproduce full pre-change generation and traces,
// including refills, RNG state, fruit/ore identities and old landing behavior.
const historical=[
 [7,902,'cbca074429e17726c0021c81e5b133c58f823be83cb3d0656c5914e40b56f91a','5ff9731036b079c9621561b06888848bd4b45c67b5e86f25b58e39970915abe1'],
 [7,7919,'0287817aa5279d5624fb328cd24a046c0867cd78ac2d95a6962f7a8836a09d15','e46aefd80137a9ab44a1620ed0b85693f1daff8fa9adb800b07b2e7e51c51552'],
 [7,75319,'41827a664445f5b5af944d63f2a4d6a8798f64377cc8e0242a6e845c3a995be6','5f294d8bd04de9a759076d4c54245f51e9a0e822a195f199d91eb40b4b5e7b18'],
 [8,902,'e825dce9a7a807eecd1191d54acfbc913914209fc97813e0259a351ac4e3f673','08114b863d0fedc03d5e50db4c2290e5be6ffc951f45b0437f4323be995993b9'],
 [8,7919,'e9a795041e6398fd5343aed63e664b0c0486a0455183be785365107009628e49','d9c75582d3d46d00f1817111d558d59e10f3d31083cbd93bd7b5e28f379483e8'],
 [8,75319,'1bd979f006504ebb1f75b107b19161d49f96fd5fc5d501c8419dbb6596a05394','3167023fa8a61bafd541f8e70fe99adc79c66060ebdc197bec6ac92d0d3fc1ac']
];
for(const [revision,seed,worldHash,planHash]of historical){
 const e=worldFor(q,seed,revision),world=e.world();assert(e.validWorld(world));assert.equal(hash(world),worldHash);
 const restored=worldFor(q,1,9);restored.restoreWorld(world);assert.equal(restored.rulesRevision,revision);assert.deepEqual(restored.world(),world);
 assert.equal(hash(restored.plan([1,2,3,4,5,6,7,8],{trace:true})),planHash,'historical v'+revision+' trace is byte-for-byte deterministic');
}

// Orthogonal contacts join across original section IDs; diagonals and colors
// remain distinct. Bonus layers retain their own fruitIndex boundary.
{
 const grid=empty();grid[11][0]=cake(1);grid[11][1]=cake(2);grid[10][2]=cake(3);grid[11][3]=cake(4,1);
 assert.deepEqual(q.chocoGroups(grid,9).groups.map(ids),[[3],[1,2],[4]]);
 assert.deepEqual(q.chocoGroups(grid,8).groups.map(ids),[[3],[1],[2],[4]]);
 const anchored=empty();for(let c=0;c<4;c++)anchored[11][c]=cake(c+1);
 const before=plain(anchored),plan=resolve(anchored);assert.deepEqual(plan.grid,before);assert.equal(plan.removed.length,0);assert.equal(chain(plan).length,0,'static 4+ never clears without fall/contact');
}
for(const size of [1,2,3]){
 const grid=empty();for(let c=0;c<size;c++)grid[3][c+1]=cake(c+1,0,'one-section');
 const before=plain(grid),plan=resolve(grid);assert.deepEqual(grid,before);assert.equal(plan.removed.length,0);assert.equal(chain(plan).length,0);assert.equal(plan.grid[11].filter(Boolean).length,size);
 assert.equal(resolve(grid,{rulesRevision:8}).removed.length,size,'v8 retains its explicit small-section melt');
 assert.equal(resolve(grid,{rulesRevision:7}).removed.length,0,'v7 retains its explicit threshold');
}
for(const size of [4,5,6]){
 const grid=empty();for(let c=0;c<size;c++)grid[2][c]=cake(c+1);
 const plan=resolve(grid);assert.equal(chain(plan).length,1);assert.equal(chain(plan)[0].targets.length,size);assert(chain(plan)[0].targets.every(v=>v.r===11));assert.equal(plan.grid.flat().filter(Boolean).length,0);landedOnly(plan);
 const melt=plan.timeline.findIndex(s=>s.phase==='canyonMelt');assert(melt>0);assert.equal(plan.timeline[melt-1].phase,'canyonFall');
}

// A side collision part way down immediately joins the grounded section.
// The 3+1 result clears, while 2+1 stays intact in its hanging shape.
for(const grounded of [2,3]){
 const grid=empty();for(let n=0;n<grounded;n++)grid[12-grounded+n][0]=cake(n+1,0,'ground');
 grid[11-grounded][1]=cake(10,0,'fall');const before=plain(grid),step=q.chocoFallStep(grid,9);
 assert.deepEqual(grid,before,'one fall step is pure');assert.deepEqual(step.moves.map(v=>v.id),[10]);assert.equal(step.merged.length,grounded+1);assert.equal(q.chocoFallStep(step.grid,9).moves.length,0,'side connection supports the entire joined group');
 const plan=resolve(grid);landedOnly(plan);
 if(grounded===3){assert.equal(chain(plan)[0].targets.length,4);assert.equal(plan.grid.flat().filter(Boolean).length,0);}
 else{assert.equal(chain(plan).length,0);assert.equal(plan.grid.flat().filter(Boolean).length,3);}
}

// Different original sections connected in the air fall as one rigid body.
// Support under one column stops its overhanging cells as well.
{
 let grid=empty();grid[2][0]=cake(1);grid[2][1]=cake(2);grid[3][1]=cake(3);grid[10][0]=cake(90,1);grid[11][0]=cake(91,1);
 const before=plain(grid);let falls=0;
 for(;;){const step=q.chocoFallStep(grid,9);if(!step.moves.length)break;assert.deepEqual(step.moves.map(v=>v.id).sort((a,b)=>a-b),[1,2,3]);assert(step.moves.every(v=>v.to[0]-v.from[0]===1&&v.to[1]===v.from[1]));grid=step.grid;falls++;assert(falls<12);}
 assert.equal(falls,7);assert.equal(grid[9][0].id,1);assert.equal(grid[10][1].id,3);assert.equal(grid[11][1],null);assert.deepEqual(resolve(before).grid,grid);
}
{
 const grid=empty();for(let c=0;c<4;c++){grid[8][c]=cake(c+1,0,'falling');grid[11][c]=cake(c+5,0,'static');}
 const plan=resolve(grid);assert.equal(chain(plan)[0].targets.length,8);landedOnly(plan);
}

// Both groups start falling. One lands after one step; the second continues
// two more steps, then glues to its side. The coalesced animation must use one
// common travelled distance capped at each tile's landing, not separately
// normalized progress that would delay the early landing and side contact.
{
 const grid=empty();for(let r=6;r<=8;r++)grid[r][0]=cake(r-5,0,'lower');grid[4][1]=cake(4,0,'upper');grid[10][0]=cake(90,1,'support');grid[11][0]=cake(91,1,'support');
 const frames=[];let current=grid;for(let n=0;n<3;n++){const step=q.chocoFallStep(current,9);assert(step.moves.length);frames.push(step);current=step.grid;}
 assert.deepEqual(frames.map(f=>f.moves.map(m=>m.id).sort((a,b)=>a-b)),[[1,2,3,4],[4],[4]]);
 assert.deepEqual([...frames[2].merged].sort((a,b)=>a-b),[1,2,3,4]);
 const plan=resolve(grid),motion=plan.timeline.find(s=>s.phase==='canyonFall');assert.equal(motion.motionSteps,3);assert.equal(motion.fallDistance,3);
 assert.deepEqual(motion.motionContacts,[{distance:3,ids:frames[2].merged}]);assert.deepEqual([...motion.merged].sort((a,b)=>a-b),[1,2,3,4]);
 for(let distance=1;distance<=3;distance++)for(const move of motion.moves){
  const row=frames[distance-1].grid.findIndex(r=>r.some(t=>t?.id===move.id));
  assert.equal(move.from[0]+Math.min(move.to[0]-move.from[0],distance),row,'shared travel reproduces actual contact positions');
 }
 const atContact=chain(plan)[0];assert.deepEqual(ids(atContact.targets),[1,2,3,4]);assert.equal(atContact.targets.find(v=>v.tile.id===4).r,7);landedOnly(plan);
}

// Cascades first break the shell, retain the encased fruit under a blocker,
// then collect the exact reward once the second landed group clears.
{
 const grid=empty();for(let c=0;c<4;c++){grid[5][c]=cake(c+5,1);grid[8][c]=cake(c+1);}
 grid[8][0]={...fruit(1,'apple',20),color:0,encased:true};const before=plain(grid),plan=resolve(grid);
 assert.deepEqual(grid,before);assert.equal(chain(plan).length,2);landedOnly(plan);
 const first=chain(plan)[0],held=first.grid.flat().find(t=>t?.id===1);assert(held&&held.fruit==='apple'&&!held.encased&&held.revealed&&held.color===-1);
 assert.deepEqual(chain(plan).map(s=>s.chainIndex),[1,2]);
 assert.equal(plan.prizes.length,1);assert.equal(plan.prizes[0].tile.fruit,'apple');assert.equal(plan.gain,20);
 assert.equal(plan.timeline.filter(s=>s.phase==='canyonCollect').length,1);assert.equal(resolve(plan.grid).gain,0,'a collected fruit cannot pay twice');
}

// Only gravity is a chain. Powers and drills explicitly identify their cause;
// awarded milestones describe the actual destroyed layers, not scroll depth.
{
 const grid=empty();for(let c=0;c<4;c++)grid[11][c]=cake(c+1);grid[0][6]={...cake(90,-1),item:'clear'};
 const plan=resolve(grid),power=plan.timeline.find(s=>s.phase==='canyonMelt');assert.equal(power.cause,'power');assert.equal(power.chainIndex,undefined);assert.equal(chain(plan).length,0);
 const bonus=empty();for(const [r,index]of [[7,1],[10,5]])for(let c=0;c<4;c++)bonus[r][c]={...cake(index*10+c,4),item:'fruit',fruitIndex:index,fruitValue:index===1?300:3000,bonusDepth:index*100,bonusKind:index===1?'fruit':'sapphire'};
 const drilled=q.chocoExcavate(bonus,[{column:0,level:2}],{rulesRevision:9,refill:false,trace:true}),award=drilled.timeline.find(s=>s.phase==='canyonBonus');
 assert(drilled.timeline.filter(s=>s.phase==='canyonMelt').every(s=>s.cause==='drill'&&s.chainIndex===undefined));
 assert.deepEqual(award.bonusDepths,[100,500]);assert.equal(award.bonusDepth,500);assert.equal(award.bonusIndex,5);assert.equal(award.bonusKind,'sapphire');assert.equal(award.gain,3300);assert.equal(drilled.gain,3300);
 const noAward=empty();for(let c=0;c<4;c++)noAward[11][c]={...cake(c+1,4),item:'fruit',fruitIndex:1,fruitValue:300,bonusDepth:100,bonusKind:'fruit'};noAward[0][6]={...cake(90,-1),item:'clear'};
 const cleared=resolve(noAward);assert.equal(cleared.gain,0);assert(!cleared.timeline.some(s=>s.phase==='canyonBonus'),'a power-destroyed milestone never invents an award');
}

// A later rank-up must not rewrite the identity/value already captured in an
// earlier native visual stage. Frozen caller-owned grids are valid inputs.
{
 const grid=empty();for(let c=0;c<4;c++){grid[5][c]=cake(c+5,1);grid[8][c]=cake(c+1);}
 grid[8][0]={...fruit(1,'apple',20),color:0,encased:true};grid[5][1]={...cake(6,1),item:'odds',encased:true};
 for(const row of grid){for(const tile of row)if(tile)Object.freeze(tile);Object.freeze(row);}Object.freeze(grid);
 const plan=resolve(grid),held=chain(plan)[0].grid.flat().find(t=>t?.id===1),collected=plan.prizes.find(v=>v.tile.id===1);
 assert.equal(held.fruit,'apple');assert.equal(held.value,20);assert.equal(collected.tile.fruit,'mandarin');assert.equal(collected.tile.value,40);assert.notEqual(held,collected.tile);assert.equal(grid[8][0].fruit,'apple');
}

// Every tier has a real exact-valued distribution and one-step rank-up.
for(const [kind,def]of Object.entries(q.CHOCO_FRUITS)){
 const entries=q.CHOCO_FRUIT_DISTRIBUTIONS[kind];assert.equal(entries.reduce((n,[,weight])=>n+weight,0),1000);
 const counts=new Map();for(let i=0;i<1000;i++){const value=q.chocoFruitQuantile(kind,(i+.5)/1000);assert(value>=def.min&&value<=def.max&&Number.isSafeInteger(value));assert.equal((value-def.min)%def.step,0);counts.set(value,(counts.get(value)||0)+1);}assert.deepEqual([...counts],entries);
 const grid=empty();grid[1][2]=fruit(1,kind);const plan=resolve(grid);assert.equal(plan.gain,def.min);assert.equal(plan.timeline[0].phase,'canyonCollect');assert.equal(plan.prizes[0].tile.fruit,kind);
 assert.equal(q.chocoPrizeDefinition(grid[1][2]).name,def.name);assert.equal(q.chocoPrizeKind(grid[1][2]),kind);
}
{
 const prize=fruit(1);for(const kind of Object.keys(q.CHOCO_FRUITS).slice(1)){const old=prize.value;assert(q.chocoRankOre(prize));assert.equal(prize.fruit,kind);assert(prize.value>=old);assert.equal(prize.value,prize.baseValue);assert.equal(prize.multiplier,1);}assert.equal(q.chocoRankOre(prize),false);
 const grid=empty();grid[0][0]=fruit(1);grid[0][1]={...cake(2,-1),item:'odds'};const plan=resolve(grid);assert.equal(plan.prizes[0].tile.fruit,'mandarin');assert.equal(plan.gain,q.CHOCO_FRUITS.mandarin.min);assert.equal(plan.oddsCount,1);
}

// Generated v9 fruit stays visibly encased in four-color terrain. Rendering
// never supplies a treasure identity, value or outcome to the rules.
for(let seed=1;seed<=80;seed++){
 const e=worldFor(q,seed*7919,9),world=e.world(),before=plain(world);assert(e.validWorld(world));assert.equal(world.version,9);
 for(const tile of world.strata.flat())if(tile.item==='fruit-prize'){assert(tile.encased&&tile.color>=0&&tile.color<4);assert(q.CHOCO_FRUITS[tile.fruit]);assert.equal(tile.ore,undefined);}
 const a=e.plan([1,2,3,4,5,6,7,8],{trace:true}),b=e.plan([1,2,3,4,5,6,7,8]);
 const chainNumbers=new Map();for(const stage of chain(a)){const next=(chainNumbers.get(stage.number)||0)+1;assert.equal(stage.chainIndex,next,'gravity chain numbering resets for each resolved ball');chainNumbers.set(stage.number,next);}
 assert.deepEqual({...a,timeline:[]},b,'tracing never changes physics, RNG or reward');assert.deepEqual(e.world(),before,'planning does not mutate the engine');
 assert.equal(q.chocoFallStep(a.grid,9).moves.length,0,'every final board is stable');
 const restored=worldFor(q,1,9);restored.restoreWorld(world);assert.deepEqual(restored.plan([1,2,3,4,5,6,7,8]),b,'v9 checkpoint replay is deterministic');
 const bad=plain(world),prize=bad.strata.flat().find(t=>t.item==='fruit-prize');if(prize){prize.fruit='unknown';assert(!e.validWorld(bad));}
}

// Exercise the actual engine event path, using only its injectable wait to
// omit wall-clock presentation delays. No number, rule or payout is replaced.
{
 const events=[],e=new q.ChocoDigEngine({random:random(2957919),sleep:()=>Promise.resolve(),onEvent:event=>{events.push(event);if(event.phase==='error')throw Error(event.message);}});
 e.visualWait=async(_ms,token)=>token===e.version;const expected=e.plan([1,2,3,4,5,6,7,8]);e.start();e.enqueueBatch([1,2,3,4,5,6,7,8]);
 for(let n=0;n<100000&&(e.busy||e.queue.length);n++)await Promise.resolve();
 assert.equal(e.processed,8);assert.equal(e.phase,'complete');assert.equal(e.totalHundredths,expected.gain);assert.deepEqual(e.strata,expected.grid);assert.equal(e.seed,expected.seed);assert(e.validWorld(e.world()));assert(events.some(e=>e.phase==='canyonDrill'));assert(!events.some(e=>e.phase==='error'));
}
// Exercise the actual chunked main/tab reach caller, not only engine.plan.
// world() stores its revision as `version`; the planner needs `rulesRevision`.
// An omitted revision hides real v9 wins and also changes explicit v8 replays.
const source=fs.readFileSync(new URL('../assets/choco-dig.js',import.meta.url),'utf8');
const reachBegin=source.indexOf('function chocoRequestReach('),reachEnd=source.indexOf('const chocoItemCakeCache=',reachBegin);
assert(reachBegin>=0&&reachEnd>reachBegin,'native reach function boundary exists');
const makeReach=new Function('chocoPlan','reachTier','setTimeout','chocoQueueFrame','scheduleUI','failReachPreview',
 source.slice(reachBegin,reachEnd)+';return chocoRequestReach;');
let reachPredictions=0;
for(const revision of [9,8,7]){
 const e=worldFor(q,7919,revision);e.visualWait=async(_ms,token)=>token===e.version;
 e.start();assert(e.enqueueBatch([1]));
 for(let n=0;n<100000&&(e.busy||e.queue.length);n++)await Promise.resolve();
 assert.equal(e.processed,1);assert(!e.busy&&!e.queue.length);
 const before=plain(e.world()),base=e.totalHundredths,numbers=[...e.drills.flatMap(d=>d.numbers),...e.lucky.numbers].filter(n=>n!==1);
 const tier=total=>total>=1000?3:total>=300?2:1;
 const expected=numbers.map(number=>{const p=e.plan([number]);return {number,gain:p.gain,total:base+p.gain,tier:tier(base+p.gain)};})
  .filter(result=>result.gain>0).sort((a,b)=>a.number-b.number);
 const pending=[],usedRevisions=[],slot={i:1},host={phase:'playing',bet:()=>100,draws:[1]};
 const request=makeReach((grid,draws,options)=>{
  usedRevisions.push(options.rulesRevision);reachPredictions++;
  return q.chocoPlan(grid,draws,options);
 },tier,callback=>pending.push(callback),()=>{},()=>{},(_slot,_epoch,error)=>{throw error;});
 request(slot,e,host);assert.equal(slot.reachStatus,'pending');
 for(let n=0;pending.length&&n<32;n++)pending.shift()();
 assert.equal(pending.length,0,'bounded reach chunks complete');assert.equal(slot.reachStatus,'ready');
 assert.deepEqual(slot.reachResults,expected,'main/tab reach exactly matches native v'+revision+' outcomes');
 assert(usedRevisions.every(actual=>actual===revision),'reach selects the explicit saved rules revision');
 assert.deepEqual(e.world(),before,'reach consumes no board RNG and does not mutate saved state');
 if(revision===9)assert.equal(slot.reachResults.find(result=>result.number===24)?.gain,90,'known false-negative reach is restored');
}
console.log('CHOCO_V295_RULES_PASS',JSON.stringify({historicalGoldenReplays:historical.length,newReplaySeeds:80,fruitTiers:6,rigidContacts:true,smallGroupsRetained:true,landingThreshold:4,midairClears:false,actualEngine:true,reachRevisions:[7,8,9],reachPredictions}));

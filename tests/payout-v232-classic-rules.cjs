const assert=require('node:assert/strict');
const fs=require('node:fs');
const {load,sixRound}=require('./payout-v232-classic-sample.cjs');
const q=load();
const rng=value=>()=>((value=(Math.imul(value,1664525)+1013904223)>>>0)/4294967296);
const clone=value=>JSON.parse(JSON.stringify(value));
const tally=grid=>grid.flat().filter(t=>t?.item).reduce((out,t)=>{const k=t.item==='ore'?'ore:'+t.ore:t.item;out[k]=(out[k]||0)+1;return out;},{});

// No density or visible-bonus quantity is tied to the player's target rate.
const rates=[50,90,150],oreRates=rates.map(rate=>{q.setRate(rate);return q.chocoOreRates(42,345);});
assert.deepEqual(oreRates[0],oreRates[1]);assert.deepEqual(oreRates[1],oreRates[2]);
for(const randomValue of [.005,.02,.04]){
 const observations=rates.map(rate=>{q.setRate(rate);const e=new q.Engine({random:()=>randomValue,colorCount:5});return {wild:e.board.flat().filter(t=>t?.wild).length,forecast:e.hammerForecast.filter(Boolean).length};});
 assert.deepEqual(observations[0],observations[1]);assert.deepEqual(observations[1],observations[2]);
 assert.equal(observations[0].wild,randomValue<.006?1:0);
 assert.equal(observations[0].forecast,randomValue<.035?8:0);
}

// Twelve complete symmetric terrain families, all using the established
// compact section sizes; palette replacement cannot merge adjoining sections.
assert.equal(q.CHOCO_INITIAL_PATTERNS.length,12);
for(const pattern of q.CHOCO_INITIAL_PATTERNS){
 assert.equal(pattern.length,12);
 const grid=pattern.map((row,r)=>{assert.equal(row.length,7);assert.equal(row,[...row].reverse().join(''));return [...row].map((color,c)=>({id:r*7+c+1,color:Number(color)}));});
 assert(q.chocoGroups(grid).groups.every(group=>group.length>=3&&group.length<=6));
}
function patternMatches(grid,pattern){
 const map=new Map(),used=new Set();
 for(let r=0;r<12;r++)for(let c=0;c<7;c++){
  const color=grid[r][c].color;if(color<0)continue;const source=pattern[r][c];
  if(map.has(source)){if(map.get(source)!==color)return false;}
  else{if(used.has(color))return false;map.set(source,color);used.add(color);}
 }
 return true;
}
const familiesSeen=new Set();
for(let seed=1;seed<=180;seed++){
 const worlds=rates.map(rate=>{q.setRate(rate);const e=new q.ChocoDigEngine({random:rng(seed*7919),colorCount:5});assert(e.validWorld(e.world()));return e.world();});
 for(let index=1;index<worlds.length;index++){
  assert.deepEqual(tally(worlds[index].strata),tally(worlds[0].strata),'inventory changes at a different target');
  assert.deepEqual(worlds[index].strata.map(row=>row.map(t=>t.color)),worlds[0].strata.map(row=>row.map(t=>t.color)));
  assert.deepEqual(worlds[index].drills,worlds[0].drills);assert.deepEqual(worlds[index].lucky,worlds[0].lucky);
  assert.equal(worlds[index].seed,worlds[0].seed,'placement consumes target-dependent RNG counts');
 }
 const family=q.CHOCO_INITIAL_PATTERNS.findIndex(p=>patternMatches(worlds[0].strata,p)||patternMatches(worlds[0].strata,[...p].reverse()));
 assert(family>=0,'initial Canyon terrain did not come from a geometric family');familiesSeen.add(family);
}
assert.equal(familiesSeen.size,12);

// The gap families and numbered stencil remain independent of the setting.
assert.equal(q.SIX_START_GAP_TEMPLATES.length,6);
const numbered=new Set(q.SIX_NUMBER_CELLS.map(p=>p.join(',')));
for(const template of q.SIX_START_GAP_TEMPLATES){
 const cells=new Set(template.map(p=>p.join(',')));
 for(const [r,c]of template){const width=r%2?8:7;assert(cells.has([r,width-1-c].join(',')));assert(!numbered.has([r,c].join(',')));}
 for(const rate of rates)for(const colorCount of [3,4]){
  q.setRate(rate);const b=q.sixMakeBoard(10,colorCount,rng(98761+rate),0,{holes:template});
  assert.equal(q.sixDrop(q.sixClone(b.grid)).moves.length,0);
  assert.equal(q.sixResolve(b.grid).cells.length,0);
  const numbers=b.grid.flat().filter(t=>t?.number!=null).map(t=>t.number).sort((a,b)=>a-b);
  assert.deepEqual(numbers,Array.from({length:25},(_,i)=>i+1));
 }
}

for(const rate of rates){
 q.setRate(rate);
 for(let seed=1;seed<=20;seed++){
  const e=new q.Engine({random:rng(seed*18731),colorCount:5});
  assert.equal(q.groups(e.board).length,0);
  const numbers=e.board.flat().filter(t=>t?.number!=null).map(t=>t.number).sort((a,b)=>a-b);
  assert.deepEqual(numbers,Array.from({length:25},(_,i)=>i+1));
  const before=clone(e.board),order=q.debugCookieColorOrder([0,1,2,3,4],e.board,3,3,()=>0);
  assert.deepEqual(e.board,before);assert.deepEqual([...order].sort(),[0,1,2,3,4]);
 }
}

// Make sure the checked-in source copies and actual browser bundle agree.
const raw=fs.readFileSync('optimized/app-01.js','utf8');
assert(raw.includes(fs.readFileSync('assets/debug-economy.js','utf8').trim()),'debug economy source is not mirrored in app-01');
assert(raw.includes(fs.readFileSync('assets/choco-dig.js','utf8').split('const chocoSprites=')[0].trim()),'Canyon source is not mirrored in app-01');
async function checkSixSampler(){
 for(const target of rates)for(const seed of [179,2971,9139,27631]){
  q.setRate(target);const drawRng=rng(seed^0x9e3779b9),numbers=Array.from({length:25},(_,i)=>i+1);
  for(let i=24;i>0;i--){const j=Math.floor(drawRng()*(i+1));[numbers[i],numbers[j]]=[numbers[j],numbers[i]];}
  const expected=sixRound(q,rng(seed),numbers),engine=new q.SixBallCandyEngine({random:rng(seed),onEvent:event=>{if(event.phase==='error')throw Error(event.message);}});
  engine.wait=engine.waitVisual=async()=>true;engine.start();engine.accepted=8;engine.queue=[numbers.slice(0,3),numbers.slice(3,5),...numbers.slice(5,8).map(n=>[n])];await engine.drain();
  assert.equal(engine.processed,8);assert.equal(engine.totalHundredths,Math.round(expected.gain*100));
  assert.equal(engine.roundIndex,expected.roundIndex);assert.equal(engine.uid,expected.uid);assert.equal(engine.wonderCollected,expected.collected);assert.deepEqual(engine.pyramid,expected.grid);
 }
}
checkSixSampler().then(()=>console.log('Classic payout: fixed visible features/inventories, twelve symmetric Canyon families, six stable Six families, all 25 numbers and actual browser Engine/sampler equivalence passed')).catch(error=>{console.error(error);process.exitCode=1;});

import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=file=>fs.readFileSync(path.join(root,file),'utf8');
const random=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const plain=value=>JSON.parse(JSON.stringify(value));
const context={console,Math,performance:{now:()=>0},document:{getElementById:()=>null,querySelector:()=>null,createElement:()=>({}),head:{append(){}}},setTimeout:()=>1,clearTimeout(){},setInterval:()=>1};
context.window=context;vm.createContext(context);
for(const file of ['assets/jelly-rules.js','assets/bingo-stick-rules.js','assets/party-castella-rules.js'])vm.runInContext(source(file),context,{filename:file});
const J=context.JellyRules,R=context.BingoStickRules;
context.BingoStick={engine:{version:0,roundBet:100,reset(){this.state=R.create({target:90});}}};
vm.runInContext(source('assets/waffle-pow-v159.js'),context,{filename:'assets/waffle-pow-v159.js'});

// An independent union-of-open-partitions oracle matches the actual eight-ball
// engine. It is also the model used by the exact enumeration calibration.
function jellyOracle(initial,draws){
 const parents=Array.from({length:25},(_,i)=>i),find=i=>{while(parents[i]!==i)i=parents[i];return i;};
 const join=(a,b)=>{parents[find(a)]=find(b);};
 for(const number of draws.slice(0,5)){
  const i=initial.numbers.indexOf(number);
  if(i%5)join(i,i-1);if(i%5<4)join(i,i+1);if(i>=5)join(i,i-5);if(i<20)join(i,i+5);
 }
 const wet=new Set(initial.seeds.map(find));let odds=1;
 for(const number of draws.slice(5)){const component=find(initial.numbers.indexOf(number));if(wet.has(component))odds+=.5;wet.add(component);}
 const filled=parents.map((_,i)=>wet.has(find(i))),lines=J.LINES.filter(line=>line.every(i=>filled[i])).length;
 return {lines,odds,total:J.payout(lines,odds)};
}
assert.deepEqual(Array.from({length:13},(_,n)=>J.payout(n)),[0,16,24,40,80,160,400,800,1600,4000,8000,0,30000]);
for(const rate of [50,90,150]){
 assert(Math.abs(J.balance(rate).returnPercent-rate)<1e-8);
 for(let seed=1;seed<=180;seed++){
  let allow=true;const rng=random(seed),start=J.create({rate,rng:()=>{assert(allow,'draws must not resample the opening');return rng();}});allow=false;
  assert.equal(start.payoutVersion,232);
  assert.equal(start.seeds.length,4);assert.equal(new Set(start.numbers).size,25);
  const seedSet=new Set(start.seeds);
  for(const i of seedSet){assert(seedSet.has(Math.floor(i/5)*5+4-i%5));assert(seedSet.has((4-Math.floor(i/5))*5+i%5));}
  assert(start.sugarLines>=3&&start.sugarLines<=6);
  const saved=JSON.stringify({...start,open:[...start.open]});let s=start;
  for(let number=1;number<=8;number++)s=J.draw(s,number).state;
  const expected=jellyOracle(start,[1,2,3,4,5,6,7,8]);
  assert.equal(s.lines.length,expected.lines);assert.equal(s.oddsMultiplier,expected.odds);assert.equal(J.payout(s.lines.length,s.oddsMultiplier),expected.total);
  assert.equal(JSON.stringify({...start,open:[...start.open]}),saved,'opening snapshot must remain immutable');
 }
}
// A checkpoint created before this release keeps its original common paytable
// until the next opening is generated. Preview and WIN use the same version.
{
 const current=J.create({rate:90,rng:random(31)}),legacy={...current};delete legacy.payoutVersion;
 let oldState=legacy,newState=current;
 for(let number=1;number<=7;number++){oldState=J.draw(oldState,number).state;newState=J.draw(newState,number).state;}
 const oldPreview=J.preview(oldState,8),newPreview=J.preview(newState,8);
 assert.equal(oldPreview.lines,newPreview.lines);assert(oldPreview.lines>0&&oldPreview.lines<12);
 assert.equal(oldPreview.totalHundredths,J.payout(oldPreview.lines,oldPreview.oddsMultiplier,0));
 assert.equal(newPreview.totalHundredths,J.payout(newPreview.lines,newPreview.oddsMultiplier,232));
 assert.equal(newPreview.totalHundredths,oldPreview.totalHundredths*.8);
 assert.equal(oldState.payoutVersion,undefined);assert.equal(newState.payoutVersion,232);
}
// A legal four-FREE board still reaches ALL LINE. The highest award is not
// removed to make the lower target possible.
{
 const seeds=[0,4,20,24];let s={numbers:Array.from({length:25},(_,i)=>i+1),seeds,colors:Array.from({length:25},(_,i)=>seeds.includes(i)?'blue':null),draws:[],open:new Set(),lines:[],oddsMultiplier:1};
 for(const number of [2,9,12,17,19,6,15,23])s=J.draw(s,number).state;
 assert.equal(s.lines.length,12);assert.equal(J.payout(12,s.oddsMultiplier),30000);
}

// Waffle keeps the visible POW schedule independent of the target. All molds
// retain 44 starting stones, 20 board numbers and five off-board numbers.
for(let seed=1;seed<=120;seed++){
 let reference=null;
 for(const rate of [50,90,150]){
  const start=R.create({target:rate,rng:random(seed)}),pow=plain(start.powTurns);
  if(reference)assert.deepEqual(pow,reference);else reference=pow;
  assert.equal(start.colors.filter(Boolean).length,44);assert.equal(start.numbers.filter(n=>n!==null).length,20);assert.equal(start.offBoardNumbers.length,5);
  for(let i=0;i<64;i++){assert.equal(start.colors[i],start.colors[(i>>3)*8+7-i%8]);assert.equal(start.colors[i],start.colors[(7-(i>>3))*8+i%8]);}
  let s=start;for(let number=1;number<=8;number++)s=R.draw(s,number);
  assert.equal(s.totalHundredths,s.baseHundredths+s.reversalCount*300000);
 }
}
for(const rate of [50,90,150]){assert.equal(context.WafflePowV159.expectedPowCount(rate),.95);assert(Math.abs(R.balance(rate).totalPercent-rate)<1e-8);}
assert.deepEqual(plain(R.payRows.map(row=>row.hundredths)),[20,20,40,40,100,100,150,200,300,400,500,1000,1500]);

// Keep the v232 37-hole oracle as an in-flight checkpoint compatibility check.
// The 61-hole v250 generator and payout have their own current-rule regression.
const C=context.PartyCastellaRules.legacy||context.PartyCastellaRules;
const distance=(a,b)=>Math.max(Math.abs(a.q-b.q),Math.abs(a.r-b.r),Math.abs(a.q+a.r-b.q-b.r));
const edgeKey=(a,b)=>Math.min(a,b)+':'+Math.max(a,b);
function castellaOracle(start,draws){
 const neighbors=Array.from({length:37},()=>[]);for(const [a,b] of start.edges){neighbors[a].push(b);neighbors[b].push(a);}
 const wet=start.wet.slice();
 for(const number of draws.slice(0,5)){
  const id=start.cells.find(c=>c.number===number).id;wet[id]=true;
  for(const a of neighbors[id]){wet[a]=true;for(const b of neighbors[a])wet[b]=true;}
 }
 const level=1+start.specials.fire.filter(id=>wet[id]).length,odds=start.specials.odds.filter(id=>wet[id]).length;
 const anchors=draws.slice(5).map(number=>start.cells.find(c=>c.number===number));
 const baked=start.cells.filter(c=>wet[c.id]&&anchors.some(a=>distance(c,a)<=level)).length;
 return {baked,wet:wet.filter(Boolean).length,level,odds,total:C.payout(baked,odds)};
}
assert.deepEqual(plain(C.payRows.map(row=>row.hundredths)),[20,40,60,80,100,120,140,160,180,200,250,300,400,500,750,1000,2000,5000]);
assert.equal(C.effectiveTarget(50),50);assert.equal(C.effectiveTarget(150),150);
assert(C.minReturn<50&&C.maxReturn>150);
for(let mold=0;mold<C.molds.length;mold++)for(let orientation=0;orientation<12;orientation++){
 const state=C.createBoard(mold,90,random(321),90,orientation),edges=new Set(state.edges.map(([a,b])=>edgeKey(a,b)));
 assert.equal(edges.size,54);
 for(const [a,b] of state.edges)assert.equal(distance(state.cells[a],state.cells[b]),1);
}
for(const target of [50,90,150])for(let seed=1;seed<=160;seed++){
 let allow=true;const rng=random(seed),start=C.create({target,rng:()=>{assert(allow);return rng();}});allow=false;
 assert.equal(start.target,target);assert.equal(start.wetCount,6);assert.equal(start.specials.fire.length,1);assert.equal(start.specials.odds.length,2);
 const ids=start.cells.filter(c=>c.number!==null).map(c=>c.id),numSet=new Set(ids),wetSet=new Set(start.cells.filter(c=>start.wet[c.id]).map(c=>c.id));
 assert.equal(ids.length,25);assert.equal(new Set(start.cells.filter(c=>c.number!==null).map(c=>c.number)).size,25);
 for(const c of start.cells){
  if(c.q===0||c.r===0||c.q+c.r===0)assert(numSet.has(c.id),'all 18 diagonal positions plus centre remain numbered');
  const opposite=start.cells.find(v=>v.q===-c.q&&v.r===-c.r).id;
  assert.equal(numSet.has(c.id),numSet.has(opposite));assert.equal(wetSet.has(c.id),wetSet.has(opposite));
 }
 const edgeSet=new Set(start.edges.map(([a,b])=>edgeKey(a,b)));assert.equal(start.edges.length,54);assert.equal(edgeSet.size,54);
 for(const [a,b] of start.edges)assert.equal(distance(start.cells[a],start.cells[b]),1,'drawn channels must be adjacent hex-side-parallel links');
 const connected=new Set([0]);let last=-1;
 while(last!==connected.size){last=connected.size;for(const [a,b] of start.edges)if(connected.has(a)||connected.has(b)){connected.add(a);connected.add(b);}}
 assert.equal(connected.size,37,'every well is connected');
 let state=start;for(let number=1;number<=8;number++){
  state=C.draw(state,number);
  for(const [a,b] of state.flow)assert(edgeSet.has(edgeKey(a,b)),'animated flow must follow a visible channel');
 }
 const expected=castellaOracle(start,[1,2,3,4,5,6,7,8]);
 assert.equal(state.wetCount,expected.wet);assert.equal(state.bakedCount,expected.baked);assert.equal(state.fireLevel,expected.level);assert.equal(state.oddsHits,expected.odds);assert.equal(state.totalHundredths,expected.total);
 assert.equal(C.draw(state,9),null);
}
{
 const demo=C.createDemo();let state=demo.state;for(const number of demo.draws)state=C.draw(state,number);
 assert.equal(state.bakedCount,37);assert.equal(state.oddsHits,2);assert.equal(state.totalHundredths,10000);assert(state.highestRole);
}
console.log('Late-game payout: fixed visible budgets, symmetric templates, displayed/actual channel equivalence, independent payout oracles, top-award witnesses, and target-independent Waffle POW passed');

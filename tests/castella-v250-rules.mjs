import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {buildModel,evaluateAnchors,weights} from '../scripts/castella-v250-sample.mjs';
const context=vm.createContext({Math,console});
vm.runInContext(fs.readFileSync(new URL('../assets/party-castella-rules.js',import.meta.url),'utf8'),context);
const R=context.PartyCastellaRules,plain=v=>JSON.parse(JSON.stringify(v));
const rng=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
const edgeKey=(a,b)=>Math.min(a,b)+':'+Math.max(a,b);
const distance=(a,b)=>Math.max(Math.abs(a.q-b.q),Math.abs(a.r-b.r),Math.abs(a.q+a.r-b.q-b.r));
const lookup=(s,q,r)=>s.cells.find(c=>c.q===q&&c.r===r).id;
assert.equal(R.REVISION,250);assert.equal(R.cells.length,61);assert.equal(R.originalEdges.length,84);
assert.equal(R.effectiveTarget(0),50);assert.equal(R.effectiveTarget(999),150);
assert(R.minReturn<50&&R.maxReturn>150);
assert.deepEqual(plain(R.payRows),[[14,20],[18,40],[22,60],[26,100],[30,200],[34,500],[38,1000],[42,2000],[46,3000],[50,5000],[54,7500],[58,10000],[61,20000]].map(([count,hundredths])=>({count,hundredths})));
for(let count=0;count<=61;count++){
 const expected=R.payRows.filter(row=>row.count<=count).at(-1)?.hundredths||0;
 assert.equal(R.payout(count),expected);assert.equal(R.payout(count,99),expected,'removed ODDS cannot alter v250 awards');
}
function flowMask(s,anchor,range){
 const neighbors=s.cells.map(()=>[]);for(const [a,b]of s.edges){neighbors[a].push(b);neighbors[b].push(a);}
 let frontier=new Set([anchor]),seen=new Set(frontier);
 for(let k=0;k<range;k++){const next=new Set();for(const a of frontier)for(const b of neighbors[a])if(!seen.has(b)){seen.add(b);next.add(b);}frontier=next;}
 return seen;
}
function oracle(start,numbers){
 const wet=start.wet.slice(),baked=start.baked.slice();let pourLevel=1,fireLevel=1;const pours=new Set(),fires=new Set();
 for(let ball=0;ball<numbers.length;ball++){
  const id=start.cells.find(c=>c.number===numbers[ball]).id;
  if(ball<5){for(const i of flowMask(start,id,pourLevel)){if(!wet[i]&&start.specials.fire.includes(i))fires.add(i);wet[i]=true;}
   if(start.specials.pour.includes(id))pours.add(id);pourLevel=1+pours.size;fireLevel=1+fires.size;
  }else for(const cell of start.cells)if(wet[cell.id]&&distance(cell,start.cells[id])<=fireLevel)baked[cell.id]=true;
 }
 const count=baked.filter(Boolean).length;return {wet,baked,pourLevel,fireLevel,count,sugar:start.specials.sugar.some(id=>baked[id]),total:R.payout(count)};
}
for(let mold=0;mold<R.molds.length;mold++)for(let orientation=0;orientation<12;orientation++){
 const s=R.createBoard(mold,90,rng(321),90,orientation),edges=new Set(s.edges.map(([a,b])=>edgeKey(a,b)));
 assert.equal(s.rulesRevision,250);assert.equal(s.cells.length,61);assert.equal(s.wetCount,19);assert.equal(s.edges.length,84);assert.equal(edges.size,84);
 const numbered=s.cells.filter(c=>c.number!==null).map(c=>c.id),numSet=new Set(numbered),wetSet=new Set(s.cells.filter(c=>s.wet[c.id]).map(c=>c.id));
 assert.equal(numbered.length,25);assert.equal(new Set(s.cells.filter(c=>c.number!==null).map(c=>c.number)).size,25);
 for(const c of s.cells){
  for(const [q,r]of [[-c.q,-c.r],[c.q+c.r,-c.q],[-c.q-c.r,c.r]]){
   const mapped=lookup(s,q,r);assert.equal(numSet.has(c.id),numSet.has(mapped));assert.equal(wetSet.has(c.id),wetSet.has(mapped));
  }
 }
 assert.equal(s.specials.pour.length,2);assert.equal(s.specials.fire.length,2);assert.equal(s.specials.sugar.length,1);assert.equal(s.specials.odds.length,0);
 assert(s.specials.pour.every(id=>numSet.has(id)));assert(s.specials.fire.every(id=>!s.wet[id]));
 assert.equal(new Set([...s.specials.pour,...s.specials.fire,...s.specials.sugar]).size,5);
 for(const [a,b]of s.edges)assert.equal(distance(s.cells[a],s.cells[b]),1,'visible ring/spoke edges connect neighboring wells');
 const connected=new Set([0]);let previous=-1;while(previous!==connected.size){previous=connected.size;for(const [a,b]of s.edges)if(connected.has(a)||connected.has(b)){connected.add(a);connected.add(b);}}
 assert.equal(connected.size,61);
}
let replayed=0,forecasts=0,sugarAwards=0,pourUps=0,fireUps=0;
for(const target of [50,70,90,110,130,150])for(let seed=1;seed<=120;seed++){
 let allowed=true;const boardRng=rng(seed+target*137);const start=R.create({target,rng:()=>{assert(allowed,'only board creation may consume layout RNG');return boardRng();}});allowed=false;
 const drawRng=rng(seed*31991+99173),numbers=Array.from({length:25},(_,i)=>i+1);for(let i=24;i>0;i--){const j=Math.floor(drawRng()*(i+1));[numbers[i],numbers[j]]=[numbers[j],numbers[i]];}
 let s=start;
 for(let i=0;i<8;i++){
  const old=plain(s),next=R.draw(s,numbers[i]);assert.deepEqual(plain(s),old,'draw is immutable');assert(next);
  assert.deepEqual(plain(R.draw(old,numbers[i])),plain(next),'JSON checkpoint resumes with the same next outcome');
  if(i<5){
   const anchor=s.cells.find(c=>c.number===numbers[i]).id,mask=flowMask(s,anchor,s.pourLevel);
   assert.equal(next.lastPourLevel,s.pourLevel,'UP applies only to the following pour');
   for(const c of s.cells)assert.equal(next.wet[c.id],s.wet[c.id]||mask.has(c.id));
   assert.equal(next.pourLevel,s.pourLevel+Number(s.specials.pour.includes(anchor)&&!s.pourTriggered.includes(anchor)));
   assert.equal(next.fireLevel,1+next.fireTriggered.length);assert(next.fireLevel<=3);assert(next.pourLevel<=3);
   for(const [a,b,depth]of next.flow){assert(new Set(s.edges.map(([x,y])=>edgeKey(x,y))).has(edgeKey(a,b)));assert(depth<=s.pourLevel);}
   assert.equal(next.sugarEarned,false,'wet sugar is not yet earned');
   if(i<4)assert.deepEqual(plain(R.reaches(next)),[],'pouring has no payout or ODDS reach');
   if(i===4){assert.equal(next.zones.length,20);for(const z of next.zones)assert.equal(start.cells[z.anchor].number,z.numbers[0],'bake number stays at its original well');}
   pourUps+=next.newPourTriggers.length;fireUps+=next.newFireTriggers.length;
  }else{
   assert.deepEqual(plain(next.wet),plain(s.wet));assert.equal(next.fireLevel,s.fireLevel);
   assert.equal(next.sugarNew,!s.sugarEarned&&next.sugarEarned);sugarAwards+=Number(next.sugarNew);
  }
  s=next;
  const expected=oracle(start,numbers.slice(0,i+1));assert.deepEqual(plain(s.wet),plain(expected.wet));assert.deepEqual(plain(s.baked),plain(expected.baked));assert.equal(s.fireLevel,expected.fireLevel);assert.equal(s.pourLevel,expected.pourLevel);assert.equal(s.sugarEarned,expected.sugar);
  if(i>=4&&i<7){
   const snapshot=plain(s),hits=R.reaches(s);assert.deepEqual(plain(s),snapshot,'forecast does not mutate state');
   const forecast=new Map(hits.map(hit=>[hit.number,hit]));
   for(const number of numbers.filter(n=>!s.draws.includes(n))){const future=oracle(start,[...s.draws,number]),gain=future.total-R.payout(s.bakedCount),hit=forecast.get(number);assert.equal(!!hit,gain>0);if(hit){assert.equal(hit.total,future.total);assert.equal(hit.gain,gain);assert.equal(hit.allClear,future.count===61&&s.bakedCount<61);assert.equal(hit.oddsUp,false);}forecasts++;}
  }
 }
 assert.equal(s.totalHundredths,oracle(start,numbers.slice(0,8)).total);assert.equal(s.highestRole,s.bakedCount===61);assert.equal(R.draw(s,9),null);
 assert.equal(R.draw(start,0),null);assert.equal(R.draw(start,26),null);assert.equal(R.draw(start,1.2),null);assert.equal(R.draw(R.draw(start,1),1),null);
 replayed++;
}
assert(pourUps>0&&fireUps>0&&sugarAwards>0);
{
 const {state,draws}=R.createDemo();let s=state;for(const n of draws)s=R.draw(s,n);
 assert.equal(s.wetCount,61);assert.equal(s.bakedCount,61);assert.equal(s.totalHundredths,20000);assert(s.highestRole);assert(s.sugarEarned);assert.equal(s.fireLevel,3);assert.equal(s.pourLevel,3);
 const legacyDemo=R.legacy.createDemo();let original=legacyDemo.state,resumed=plain(legacyDemo.state);
 for(const n of legacyDemo.draws){original=R.legacy.draw(original,n);resumed=R.draw(resumed,n);assert.deepEqual(plain(resumed),plain(original));assert.equal(R.payoutState(resumed),R.legacy.payout(resumed.bakedCount,resumed.oddsHits));assert.deepEqual(plain(R.reaches(resumed)),plain(R.legacy.reaches(original)));}
 assert.equal(resumed.bakedCount,37);assert.equal(resumed.totalHundredths,10000);assert.equal(R.payRowsFor(resumed).length,18);assert.equal(R.payRowsFor(s).length,13);
}
// Independently written bitmask estimator must reproduce actual shipped draw.
let estimatorComparisons=0;
for(let mold=0;mold<R.molds.length;mold++){
 const model=buildModel(R,mold);
 for(let seed=1;seed<=120;seed++){
  const randomDraw=rng(seed*123761),anchors=model.numbered.slice();
  for(let i=24;i>0;i--){const j=Math.floor(randomDraw()*(i+1));[anchors[i],anchors[j]]=[anchors[j],anchors[i]];}
  const chosen=anchors.slice(0,8),fast=evaluateAnchors(model,chosen);
  let s=model.state;for(const id of chosen)s=R.draw(s,model.state.cells[id].number);
  assert.equal(fast.baked,s.bakedCount);assert.equal(fast.wet,s.wetCount);assert.equal(fast.pourLevel,s.pourLevel);assert.equal(fast.fireLevel,s.fireLevel);assert.equal(fast.sugar,s.sugarEarned);estimatorComparisons++;
 }
}
for(const target of Array.from({length:101},(_,i)=>50+i)){
 const distribution=weights(R,target),sum=distribution.reduce((a,b)=>a+b,0),expected=distribution.reduce((a,p,i)=>a+p*R.molds[i].returnPercent,0);
 assert(Math.abs(sum-1)<1e-12);assert(Math.abs(expected-target)<1e-10);assert(distribution.every(p=>p>=0));
 assert.equal(distribution[R.molds.findIndex(m=>m.festival)],R.FESTIVAL_SHARE,'full-bake-capable mold rate is the same at every P/O');
}
console.log(JSON.stringify({test:'castella-v250-rules',molds:R.molds.length,orientations:12,replayed,forecasts,sugarAwards,pourUps,fireUps,fullBakeWitness:true,legacyCheckpointReplay:true,estimatorComparisons}));

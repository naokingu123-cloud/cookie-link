'use strict';
const assert=require('node:assert/strict');
const R=require('../../assets/party-castella-rules.js');
const ids=R.cells.map(c=>c.id),numbers=Array.from({length:25},(_,i)=>i+1);
const diameters=[0,1,2,3,4,5,6,7,9,11,13,15,17,19,22,25,28,31,34];
const sorted=values=>[...values].sort((a,b)=>a-b);
function rng(seed){return ()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);}
function board(target,first,seed){
  const rest=rng(seed);let used=false;
  return R.create({target,rng:()=>{if(used)return rest();used=true;return first;}});
}
const names=['花びら型','花冠型','輪飾り型'];
const expectedRates=[2958797460,5489311790,9202690980].map(v=>v/60568200);
function hexDistance(a,b){
  return Math.max(Math.abs(a.q-b.q),Math.abs(a.r-b.r),Math.abs(a.q+a.r-b.q-b.r));
}
function symmetric(s,ids,rotation){
  const positions=new Set(ids.map(i=>[s.cells[i].q,s.cells[i].r].join(',')));
  for(const i of ids){
    const {q,r}=s.cells[i];
    assert(positions.has([-q-r,r].join(','))); // left-right reflection
    const turned=rotation===60?[-r,q+r]:rotation===120?[-q-r,q]:[-q,-r];
    if(rotation)assert(positions.has(turned.join(',')));
  }
}
function assertDeal(s){
  assert.deepEqual(s.zones.map(z=>z.numbers.length),Array(20).fill(1));
  const opening=s.draws.slice(0,5),remaining=numbers.filter(n=>!opening.includes(n));
  assert.deepEqual(sorted(s.zones.flatMap(z=>z.numbers)),remaining);
  for(const n of remaining)assert(s.zones[R.zoneFor(n,s)-1].numbers.includes(n));
  for(const n of opening)assert.equal(s.zoneByNumber[n],null);
  assert.equal(new Set(s.zones.map(z=>z.anchor)).size,20);
  symmetric(s,s.zones.map(z=>z.anchor),s.moldIndex===0?0:180);
  for(const z of s.zones){
    const area=ids.filter(id=>hexDistance(s.cells[z.anchor],s.cells[id])<=2);
    assert.deepEqual(sorted(z.cells),area);
    const next=R.draw(s,z.numbers[0]);
    assert.deepEqual(next.sources,[z.anchor]);
    assert.deepEqual(sorted(next.wave.flat()),area.filter(id=>s.wet[id]));
  }
}
const examples=[board(50,.999,7),board(50,0,33),board(150,0,100)];
assert.deepEqual(examples.map(s=>s.boardName),names);
const variants=[...examples,board(50,.999,1),board(50,0,1)];
assert.equal(new Set(variants.map(s=>JSON.stringify([s.cells.filter(c=>c.number).map(c=>c.id),s.zones.map(z=>z.anchor)]))).size,5);
for(const s of variants){
  const k=s.moldIndex;
  assert.equal(s.target,k===2?150:50);
  assert.equal(s.cells.filter(c=>c.number===null).length,12);
  assert.deepEqual(sorted(s.cells.map(c=>c.number).filter(Boolean)),numbers);
  assert(diameters.every(id=>s.cells[id].number));
  assert.equal(s.edges.length,54);
  assert.deepEqual(s.edges,R.originalEdges);
  const edgeSet=new Set(s.edges.map(([a,b])=>sorted([a,b]).join(',')));
  assert.equal(edgeSet.size,54);
  assert.equal(s.wetCount,[4,6,8][k]);assert.equal(s.wet.filter(Boolean).length,s.wetCount);
  assert(s.baked.every(v=>v===false));
  const rotation=[180,120,180][k];
  symmetric(s,ids.filter(i=>s.wet[i]),rotation);symmetric(s,ids.filter(i=>s.cells[i].number),rotation);
  // Every concrete layout must admit a legal full pour AND full bake with eight distinct draws.
  const inlets=[[18,1,22,12,31],[s.cells[21].number?21:23,19,25,0,31],[0,9,12,15,18]][k];
  const full=inlets.map(i=>s.cells[i].number).reduce(R.draw,s);
  assert.equal(full.wetCount,37);
  const ovens=full.zones.some(z=>z.anchor===8)?[8,12,16]:[10,14,18];
  const result=ovens.map(i=>full.zones.find(z=>z.anchor===i).numbers[0]).reduce(R.draw,full);
  assert.equal(result.bakedCount,37);assert.equal(result.totalHundredths,5000);assert(result.highestRole);
  const neighbors=ids.map(()=>[]);
  for(const [a,b] of s.edges){
    neighbors[a].push(b);neighbors[b].push(a);
    assert(s.cells[a].ring===s.cells[b].ring||(diameters.includes(a)&&diameters.includes(b)));
    assert(Math.abs(Math.hypot(s.cells[a].x-s.cells[b].x,s.cells[a].y-s.cells[b].y)-1)<1e-9);
  }
  for(const n of numbers){
    const id=s.cells.find(c=>c.number===n).id;
    // Compute graph distances independently, including bends at any junction.
    const depth=ids.map(()=>Infinity),queue=[id];depth[id]=0;
    for(let j=0;j<queue.length;j++){
      const a=queue[j];if(depth[a]===2)continue;
      for(const b of neighbors[a])if(depth[b]===Infinity){depth[b]=depth[a]+1;queue.push(b);}
    }
    const first=R.draw(s,n);
    assert.deepEqual(first.sources,[id]);
    for(let t=0;t<=2;t++)assert.deepEqual(sorted(first.wave[t]),ids.filter(i=>depth[i]===t&&!s.wet[i]));
    const expectedFlow=s.edges.flatMap(([a,b])=>{
      if(depth[a]>depth[b])[a,b]=[b,a];
      return depth[b]===depth[a]+1&&depth[b]<=2?[[a,b,depth[b]].join(',')]:[];
    });
    assert.deepEqual(first.flow.map(edge=>edge.join(',')).sort(),expectedFlow.sort());
    assert.equal(R.draw(first,n),null);
  }
  assert(s.zones.every(z=>z.numbers.length===0));assert(s.zoneByNumber.every(z=>z===null));
  for(const opening of [[1,2,3,4,5],[3,21,12,9,25],[16,5,10,17,23]]){
    const dealt=opening.reduce(R.draw,s);assertDeal(dealt);
    const onlyOneZone=R.draw(dealt,dealt.zones[0].numbers[0]);
    assert.equal(onlyOneZone.highestRole,false);
    assert.equal(onlyOneZone.bakedCount,dealt.zones[0].cells.filter(i=>dealt.wet[i]).length);
    assert.equal(onlyOneZone.totalHundredths,0);
  }
}
// Verify both quantile cutoffs against the actual selector, including intermediate
// settings. The lengths of those intervals are the mold probabilities.
function boundary(rate,from){
  let low=0,high=1;
  for(let step=0;step<38;step++){
    const probe=(low+high)/2;
    if(board(rate,probe,42).moldIndex>=from)low=probe;else high=probe;
  }
  return (low+high)/2;
}
for(const rate of [50,65,85,90,92,95,96,100,125,150]){
  const crown=boundary(rate,2),petalOrCrown=boundary(rate,1);
  const mix=[1-petalOrCrown,petalOrCrown-crown,crown];
  const mean=mix.reduce((sum,p,k)=>sum+p*expectedRates[k],0);
  assert(Math.abs(mean-rate)<1e-7);
  assert.equal(R.effectiveTarget(rate),rate);
}
for(const n of [0,26,1.5,NaN,'1'])assert.equal(R.draw(examples[0],n),null);
const lesson=R.createDemo();let state=lesson.state;
for(const [k,n] of lesson.draws.entries()){
  const prev=state;state=R.draw(state,n);
  assert(state.baked.every((b,i)=>!b||state.wet[i]));
  assert.deepEqual(sorted(state.wave.flat()),ids.filter(i=>k<5?state.wet[i]&&!prev.wet[i]:state.baked[i]&&!prev.baked[i]));
  assert.equal(state.totalHundredths,k===7?5000:0);
  assert.equal(state.highestRole,k===7);
  assert.equal(state.sources.length,1);
  assert(state.wave.flat().length>0);
}
assert.deepEqual(lesson,R.createDemo());assert.equal(R.draw(state,25),null);
const table=[20,40,60,80,100,120,140,160,180,200,250,300,400,500,750,1000,2000,5000];
assert.deepEqual(R.payRows.map(r=>[r.count,r.hundredths]),table.map((mult,i)=>[20+i,mult]));
for(let i=0;i<=37;i++)assert.equal(R.payout(i),table[i-20]||0);
console.log('Party Castella: symmetric starts, all two-hop branches, radius-two heat, 20 unique oven numbers, exact payout table and target mix passed.');

// Enumerate all opening sets and all oven triples. The five used labels are excluded
// from the oven deal, so each opening set always has exactly the same 1,140 heat masks
// with multiplicity. This is exhaustive, independent of either shuffle or cup labels.
if(process.argv.includes('--balance')){
  const base=2**30,mask=ids=>ids.reduce((m,i)=>m+2**i,0);
  const lo=m=>m%base,hi=m=>Math.floor(m/base);
  const bits=v=>{v-=(v>>>1)&0x55555555;v=(v&0x33333333)+((v>>>2)&0x33333333);return (((v+(v>>>4))&0x0f0f0f0f)*0x01010101)>>>24;};
  const union=(a,b)=>(lo(a)|lo(b))+(hi(a)|hi(b))*base;
  for(const s of variants){
    const k=s.moldIndex;
    const inlet=numbers.map(n=>{const {wet}=R.draw(s,n);return mask(ids.filter(i=>wet[i]));});
    const wlo=inlet.map(lo),whi=inlet.map(hi);
    const dealt=[1,2,3,4,5].reduce(R.draw,s),oven=dealt.zones.flatMap(z=>z.numbers.map(()=>mask(z.cells)));
    const frequency=new Map();
    for(let a=0;a<20;a++)for(let b=0;b<a;b++)for(let c=0;c<b;c++){
      const area=union(union(oven[a],oven[b]),oven[c]);
      frequency.set(area,(frequency.get(area)||0)+1);
    }
    const shots=Array.from(frequency,([m,f])=>[lo(m),hi(m),f]);
    const histogram=Array(38).fill(0);let maxWet=0;
    for(let a=0;a<25;a++)for(let b=0;b<a;b++)for(let c=0;c<b;c++)for(let d=0;d<c;d++)for(let e=0;e<d;e++){
      const L=wlo[a]|wlo[b]|wlo[c]|wlo[d]|wlo[e],H=whi[a]|whi[b]|whi[c]|whi[d]|whi[e];
      maxWet=Math.max(maxWet,bits(L)+bits(H));
      for(const [l,h,count] of shots)histogram[bits(L&l)+bits(H&h)]+=count;
    }
    const cases=histogram.reduce((a,b)=>a+b),rtp=histogram.reduce((sum,n,i)=>sum+n*R.payout(i),0)/cases;
    assert.equal(cases,60568200);assert.equal(maxWet,37);
    assert.equal(histogram[37],[45,222,384][k]);
    assert(Math.abs(rtp-expectedRates[k])<1e-8);
    console.log(JSON.stringify({board:s.boardName,cases,maxWet,sweeps:histogram[37],boardRtpPercent:rtp}));
  }
}

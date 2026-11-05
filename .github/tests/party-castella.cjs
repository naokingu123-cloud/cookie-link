'use strict';
const assert=require('node:assert/strict');
const R=require('../../assets/party-castella-rules.js');
const ids=R.cells.map(c=>c.id),numbers=Array.from({length:25},(_,i)=>i+1);
const labels=R.cells.map(c=>c.number),blank=R.create();
assert.deepEqual([...new Set(labels.filter(Boolean))].sort((a,b)=>a-b),numbers);
for(const n of numbers)assert.equal(labels.filter(label=>label===n).length,n>=20?2:1);
assert.deepEqual(R.cells.map(c=>c.ring).reduce((counts,r)=>(counts[r]++,counts),[0,0,0,0]),[1,6,12,18]);
assert.equal(labels.filter(n=>n===null).length,6);
assert.equal(R.edges.length,54);
const neighbors=ids.map(()=>[]);
for(const [a,b] of R.edges){neighbors[a].push(b);neighbors[b].push(a);}
assert.deepEqual(neighbors[0].map(i=>labels[i]).sort((a,b)=>a-b),[14,15,16,17,18,19]);
assert.deepEqual(neighbors[labels.indexOf(8)].map(i=>labels[i]).sort((a,b)=>a-b),[1,14,20,21]);
assert.deepEqual(neighbors[labels.indexOf(20)].map(i=>labels[i]).sort((a,b)=>a-b),[8,9]);
assert.deepEqual(R.zones.map(z=>new Set(z.cells).size),Array(6).fill(16));
function heated(zoneIds){return new Set(zoneIds.flatMap(id=>R.zones[id-1].cells));}
for(let i=1;i<=6;i++)for(let j=i;j<=6;j++)assert(heated([i,j]).size<37);
assert.equal(heated([1,3,5]).size,37);
assert.equal(heated([2,4,6]).size,37);
for(const invalid of [0,26,1.5,'1',NaN])assert.equal(R.draw(blank,invalid),null);

let state=blank;
const trace=[];
for(const n of R.fullBakeDraws){
  const prev=state;state=R.draw(prev,n);
  assert.equal(R.draw(state,n),null);
  assert(state.baked.every((b,i)=>!b||state.wet[i]));
  assert.deepEqual(state.wave.flat().slice().sort((a,b)=>a-b),ids.filter(i=>state.draws.length<=5?state.wet[i]&&!prev.wet[i]:state.baked[i]&&!prev.baked[i]));
  trace.push([state.wetCount,state.bakedCount,state.totalHundredths]);
}
assert.deepEqual(trace,[[9,0,0],[15,0,0],[21,0,0],[29,0,0],[37,0,0],[37,16,0],[37,28,0],[37,37,50000]]);
assert(state.highestRole);
assert.equal(R.draw(state,25),null);
assert.deepEqual(blank,R.create());
const repeated=[1,2,3,12,24,4,10,16].reduce(R.draw,R.create());
assert.equal(repeated.wetCount,37);
assert.equal(repeated.bakedCount,16);
assert.equal(repeated.highestRole,false);
assert.equal(repeated.totalHundredths,0);
const dry=[1,2,3,4,7,9,13,17].reduce(R.draw,R.create());
assert.deepEqual(dry.sources,[]);
assert(dry.wetCount<37);
assert.equal(dry.wetCount,dry.bakedCount);
assert.equal(dry.highestRole,false);
assert.equal(dry.totalHundredths,R.payout(dry.bakedCount));
assert.deepEqual([1,2,3,4,7].reduce(R.draw,R.create()).sources,[0]);
// First and fifth use exactly the same inlet assignment; no designated double-shot ball.
const reordered=[24,12,3,2,1].reduce(R.draw,R.create());
assert.equal(reordered.wetCount,37);
assert.deepEqual(reordered.sources,[labels.indexOf(1)]);
assert.deepEqual(R.draw(blank,24).sources,ids.filter(i=>labels[i]===24));
console.log('Party Castella graph, eight-ball phases, repeated heat, and full-bake settlement passed.');

// Exact paytable audit: choose five of 25 opening balls, then three of the remaining
// 20. All 60,568,200 cases occur with equal probability.
if(process.argv.includes('--balance')){
  const lowBit=2**30;
  const mask=ids=>ids.reduce((m,i)=>m+2**i,0);
  const lo=m=>m%lowBit,hi=m=>Math.floor(m/lowBit);
  const bits=v=>{v-=(v>>>1)&0x55555555;v=(v&0x33333333)+((v>>>2)&0x33333333);return (((v+(v>>>4))&0x0f0f0f0f)*0x01010101)>>>24;};
  const pour=n=>mask(R.draw(blank,n).wave.flat());
  const original=numbers.map(pour),wlo=original.map(lo),whi=original.map(hi);
  // All 37 cups as candidate single inlets: no label permutation alone can cover the mold.
  const single=ids.map(i=>mask([...new Set([i,...neighbors[i],...neighbors[i].flatMap(n=>neighbors[n])])]));
  let singleMax=0,fiveSingleCases=0;
  for(let a=0;a<37;a++)for(let b=0;b<a;b++)for(let c=0;c<b;c++)for(let d=0;d<c;d++)for(let e=0;e<d;e++){
    const L=lo(single[a])|lo(single[b])|lo(single[c])|lo(single[d])|lo(single[e]);
    const H=hi(single[a])|hi(single[b])|hi(single[c])|hi(single[d])|hi(single[e]);
    singleMax=Math.max(singleMax,bits(L)+bits(H));fiveSingleCases++;
  }
  const triples=[];
  for(let a=0;a<6;a++)for(let b=0;b<=a;b++)for(let c=0;c<=b;c++){
    const hot=mask([...heated([a+1,b+1,c+1])]);
    triples.push({a,b,c,lo:lo(hot),hi:hi(hot),div:a===c?6:a===b||b===c?2:1});
  }
  const counts=R.zones.map(z=>numbers.filter(n=>R.zoneFor(n)===z.id).length);
  const histogram=Array(38).fill(0);
  let mainCases=0,completePour=0;
  for(let a=0;a<25;a++)for(let b=0;b<a;b++)for(let c=0;c<b;c++)for(let d=0;d<c;d++){
    const four=[a,b,c,d],free=counts.slice();
    let l=0,h=0;
    for(const i of four){l|=wlo[i];h|=whi[i];free[R.zoneFor(i+1)-1]--;}
    for(let fifth=0;fifth<d;fifth++){
      mainCases++;const z=R.zoneFor(fifth+1)-1;free[z]--;
      const L=l|wlo[fifth],H=h|whi[fifth];
      if(bits(L)+bits(H)===37)completePour++;
      for(const t of triples){
        const count=free[t.a]*(free[t.b]-Number(t.a===t.b))*(free[t.c]-Number(t.c===t.b)-Number(t.c===t.a))/t.div;
        histogram[bits(L&t.lo)+bits(H&t.hi)]+=count;
      }
      free[z]++;
    }
  }
  const total=histogram.reduce((s,n)=>s+n),rtp=histogram.reduce((s,n,i)=>s+n*R.payout(i),0)/total;
  assert.equal(singleMax,35);assert.equal(fiveSingleCases,435897);assert.equal(mainCases,53130);assert.equal(completePour,177);
  assert.equal(total,60568200);assert.equal(histogram[37],12673);assert(Math.abs(rtp-90.0046526065)<1e-6);
  console.log(JSON.stringify({cases:total,completePour,mainCases,sweeps:histogram[37],boardRtpPercent:rtp,singleMax}));
}

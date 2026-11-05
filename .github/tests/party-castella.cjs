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
const names=['風車型','花びら型','王冠型'];
const expectedRates=[48.1352982258,84.6664254510,274.7920383964];
function assertDeal(s){
  assert.deepEqual(s.zones.map(z=>z.numbers.length),[3,3,3,3,3,3,1,1]);
  const opening=s.draws.slice(0,5),remaining=numbers.filter(n=>!opening.includes(n));
  assert.deepEqual(sorted(s.zones.flatMap(z=>z.numbers)),remaining);
  for(const n of remaining)assert(s.zones[R.zoneFor(n,s)-1].numbers.includes(n));
  for(const n of opening)assert.equal(s.zoneByNumber[n],null);
  for(const id of ids)assert.equal(remaining.filter(n=>s.zones[R.zoneFor(n,s)-1].cells.includes(id)).length,7);
}
const examples=[board(50,.999,7),board(50,0,33),board(150,0,100)];
assert.deepEqual(examples.map(s=>s.boardName),names);
for(const [k,s] of examples.entries()){
  assert.equal(s.target,k===2?150:50);
  assert.equal(s.cells.filter(c=>c.number===null).length,12);
  assert.deepEqual(sorted(s.cells.map(c=>c.number).filter(Boolean)),numbers);
  assert(diameters.every(id=>s.cells[id].number));
  assert.equal(s.edges.length,k===0?60:66);
  assert.deepEqual(s.edges.slice(0,54),R.originalEdges);
  const neighbors=ids.map(()=>[]);
  for(const [a,b] of s.edges){
    neighbors[a].push(b);neighbors[b].push(a);
    assert(Math.abs(Math.hypot(s.cells[a].x-s.cells[b].x,s.cells[a].y-s.cells[b].y)-1)<1e-9);
  }
  for(const n of numbers){
    const id=s.cells.find(c=>c.number===n).id;
    const expected=new Set([id,...neighbors[id],...neighbors[id].flatMap(j=>neighbors[j])]);
    const first=R.draw(s,n);assert.deepEqual(first.sources,[id]);assert.deepEqual(sorted(first.wave.flat()),sorted(expected));
    assert.equal(R.draw(first,n),null);
  }
  assert(s.zones.every(z=>z.numbers.length===0));assert(s.zoneByNumber.every(z=>z===null));
  for(const opening of [[1,2,3,4,5],[3,21,12,9,25],[16,5,10,17,23]]){
    const dealt=opening.reduce(R.draw,s);assertDeal(dealt);
    const onlyOneZone=dealt.zones[0].numbers.reduce(R.draw,dealt);
    assert.equal(onlyOneZone.highestRole,false);
    assert.equal(onlyOneZone.bakedCount,dealt.zones[0].cells.filter(i=>dealt.wet[i]).length);
    assert.equal(onlyOneZone.totalHundredths,R.payout(onlyOneZone.bakedCount));
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
for(const rate of [50,65,85,90,100,125,150]){
  const crown=boundary(rate,2),petalOrCrown=boundary(rate,1);
  const mix=[1-petalOrCrown,petalOrCrown-crown,crown];
  const mean=mix.reduce((sum,p,k)=>sum+p*expectedRates[k],0);
  assert(Math.abs(mean-rate)<1e-7);
  if(rate===90){
    assert(Math.abs(mix[0]-.25)<1e-8);
    assert(mix[1]>.65&&mix[2]>.075);
  }
}
for(const n of [0,26,1.5,NaN,'1'])assert.equal(R.draw(examples[0],n),null);
const lesson=R.createDemo();let state=lesson.state;
for(const [k,n] of lesson.draws.entries()){
  const prev=state;state=R.draw(state,n);
  assert(state.baked.every((b,i)=>!b||state.wet[i]));
  assert.deepEqual(sorted(state.wave.flat()),ids.filter(i=>k<5?state.wet[i]&&!prev.wet[i]:state.baked[i]&&!prev.baked[i]));
  assert.equal(state.totalHundredths,k===7?50000:0);
  assert.equal(state.highestRole,k===7);
  assert.equal(k<5?state.wetCount:state.bakedCount,[13,20,27,32,37,12,25,37][k]);
}
assert.deepEqual(lesson,R.createDemo());assert.equal(R.draw(state,25),null);
const full=lesson.draws.slice(0,5).reduce(R.draw,lesson.state);
const early=[full.zones[6].numbers[0],full.zones[7].numbers[0]].reduce(R.draw,full);
assert.equal(early.bakedCount,37);assert.equal(early.totalHundredths,0);assert.equal(early.highestRole,false);
const finish=R.draw(early,full.zones[0].numbers[0]);assert.equal(finish.totalHundredths,50000);assert(finish.highestRole);
console.log('Party Castella: unique layouts, two-step channels, 7/20 on all 37 cups, target mix and 8th-ball settlement passed.');

// Enumerate all opening sets and all oven triples. The five used labels are excluded
// from the oven deal, so each opening set always has exactly the same 1,140 heat masks
// with multiplicity. This is exhaustive, independent of either shuffle or cup labels.
if(process.argv.includes('--balance')){
  const base=2**30,mask=ids=>ids.reduce((m,i)=>m+2**i,0);
  const lo=m=>m%base,hi=m=>Math.floor(m/base);
  const bits=v=>{v-=(v>>>1)&0x55555555;v=(v&0x33333333)+((v>>>2)&0x33333333);return (((v+(v>>>4))&0x0f0f0f0f)*0x01010101)>>>24;};
  const union=(a,b)=>(lo(a)|lo(b))+(hi(a)|hi(b))*base;
  for(const [k,s] of examples.entries()){
    const inlet=numbers.map(n=>mask(R.draw(s,n).wave.flat())),wlo=inlet.map(lo),whi=inlet.map(hi);
    const dealt=[1,2,3,4,5].reduce(R.draw,s),oven=dealt.zones.flatMap(z=>z.numbers.map(()=>mask(z.cells)));
    const frequency=new Map();
    for(let a=0;a<20;a++)for(let b=0;b<a;b++)for(let c=0;c<b;c++){
      const area=union(union(oven[a],oven[b]),oven[c]);
      frequency.set(area,(frequency.get(area)||0)+1);
    }
    assert.equal(frequency.get(2**37-1),72);
    const shots=Array.from(frequency,([m,f])=>[lo(m),hi(m),f]);
    const histogram=Array(38).fill(0);let fullFill=0;
    for(let a=0;a<25;a++)for(let b=0;b<a;b++)for(let c=0;c<b;c++)for(let d=0;d<c;d++)for(let e=0;e<d;e++){
      const L=wlo[a]|wlo[b]|wlo[c]|wlo[d]|wlo[e],H=whi[a]|whi[b]|whi[c]|whi[d]|whi[e];
      if(bits(L)+bits(H)===37)fullFill++;
      for(const [l,h,count] of shots)histogram[bits(L&l)+bits(H&h)]+=count;
    }
    const cases=histogram.reduce((a,b)=>a+b),rtp=histogram.reduce((sum,n,i)=>sum+n*R.payout(i),0)/cases;
    assert.equal(cases,60568200);assert.equal(fullFill,[3,294,2856][k]);
    assert.equal(histogram[37],72*fullFill);
    assert(Math.abs(rtp-expectedRates[k])<1e-8);
    console.log(JSON.stringify({board:s.boardName,cases,fullFill,sweeps:histogram[37],boardRtpPercent:rtp}));
  }
}

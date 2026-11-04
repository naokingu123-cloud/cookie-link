const assert=require('node:assert/strict');
const R=require('../../assets/bingo-stick-rules.js');
const rng=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
const cells=Array.from({length:64},(_,i)=>i);
const lengths=[5,6,7,8];
const start=R.create({rng:rng(21)});
function withHits(hit){return R.evaluate({...start,hits:hit,initialFree:[],placedFree:[]});}
const horizontal=withHits([0,1,2,3,4,5,6,7]);
assert.equal(horizontal.longest,8);assert.equal(horizontal.totalHundredths,1000);
assert.deepEqual(horizontal.counts,{5:0,6:0,7:0,8:1});
assert.equal(withHits([6,7,8,9,10]).longest,3);
assert.equal(withHits([0,9,18,27,36,45]).longest,1);
assert.equal(withHits([7,14,21,28,35,42,49]).longest,1);
assert.equal(withHits([0,1,2,3,4,8,16,24,32]).counts[5],2);
for(const [i,k] of lengths.entries()){
 assert.equal(R.award(k,1),[20,100,500,1000][i]);assert.equal(R.award(k,0),0);
 for(let n=1;n<18;n++){
  const increment=R.award(k,n)-R.award(k,n-1);
  assert(R.award(k,n+1)-R.award(k,n)>=increment);if(k<8)assert(increment<=R.award(k+1,1));
 }
}
function beforeSix(s){
 for(let n=1;n<=5;n++)s=R.draw(s,n);
 assert.equal(s.phase,'thinking');assert.equal(s.freeBudget,s.longest);
 return s;
}
{
 const s=beforeSix(start),open=cells.filter(i=>!s.hits.includes(i)&&!s.initialFree.includes(i));
 assert.equal(R.draw(s,6),null);assert.equal(R.place(s,s.hits[0]),null);assert.equal(R.draw(start,26),null);
 assert.equal(R.draw(R.draw(start,1),1),null);
 assert.deepEqual(R.place(R.place(s,open[0]),open[0]),s);
 let placed=s;
 for(const i of open.slice(0,s.freeBudget))placed=R.place(placed,i);
 assert.equal(R.place(placed,open[s.freeBudget]),null);
 const partial=R.place(s,open[2]),fixed=R.confirm(partial);
 assert(fixed.placedFree.includes(open[2]));assert.equal(fixed.placedFree.length,s.freeBudget);
 assert.equal(R.place(fixed,open[2]),null);assert.deepEqual(partial.placedFree,[open[2]]);
 const auto=R.confirm(s);assert.deepEqual(auto,R.confirm(s));assert.equal(auto.phase,'last');assert.equal(auto.placedFree.length,s.freeBudget);
 let last=auto;
 for(const n of [6,7,8]){const next=R.draw(last,n);assert(next.totalHundredths>=last.totalHundredths);last=next;}
 assert.equal(last.phase,'done');assert.equal(R.draw(last,9),null);assert.equal(R.confirm(last),null);
}

// Two initial FREEs with the same number, then a confirmed player FREE on ball 8.
{
 const numbers=cells.map(i=>20+i%6);numbers[0]=numbers[1]=1;numbers[2]=2;numbers[3]=3;numbers[4]=4;numbers[5]=8;
 const original=R.evaluate({...start,numbers,initialFree:[0,1]});
 const preview=R.draw(original,1);assert.deepEqual(preview.oddsUpCells,[0,1]);assert.equal(preview.oddsMultiplier,2);
 assert.equal(original.oddsMultiplier,1);assert.deepEqual(original.oddsUpCells,[]);
 const thinking=beforeSix(original);assert.deepEqual(thinking.oddsUpCells,[]);assert.equal(thinking.oddsMultiplier,2);
 const partial=R.place(thinking,5);assert.equal(partial.oddsMultiplier,2);
 const last=R.confirm(partial);assert.equal(last.oddsMultiplier,2);
 const final=R.draw(R.draw(R.draw(last,6),7),8);assert.deepEqual(final.oddsUpCells,[5]);assert.equal(final.oddsMultiplier,2.5);
 assert(final.baseHundredths>0);assert.equal(final.totalHundredths,final.baseHundredths*2.5);
}

const maxWindows=[];
for(const k of lengths)for(const [dx,dy] of [[1,0],[0,1]])for(const i of cells){
 const ex=i%8+(k-1)*dx,ey=(i>>3)+(k-1)*dy;
 if(ex>=0&&ex<8&&ey<8)maxWindows.push(Array.from({length:k},(_,j)=>i+j*(dy*8+dx)));
}
function randomFree(s,random){
 const open=cells.filter(i=>!s.hits.includes(i)&&!s.initialFree.includes(i));
 for(let i=0;i<s.freeBudget;i++){
  const j=i+Math.floor(random()*(open.length-i));[open[i],open[j]]=[open[j],open[i]];
  s=R.place(s,open[i]);
 }
 return R.confirm(s);
}
// A one-line lookahead comparison. Guarantee the longest immediately affordable
// paid row/column, breaking ties by the fewest FREEs; then use auto.
function targetedFree(s){
 const wet=new Uint8Array(64);for(const i of [...s.initialFree,...s.hits])wet[i]=1;
 let best=[],bestLength=s.longest;
 for(const window of maxWindows){
  if(window.length<bestLength)continue;
  const gaps=window.filter(i=>!wet[i]);
  if(!gaps.length||gaps.length>s.freeBudget)continue;
  if(window.length>bestLength||gaps.length<best.length){bestLength=window.length;best=gaps;}
 }
 for(const i of best)s=R.place(s,i);
 return R.confirm(s);
}
// Reproduce the launch-rate sample with: node .github/tests/bingo-stick.cjs 500000 810943
const rounds=Number(process.argv[2]||100),seed=Number(process.argv[3]||810943);
const random=rng(seed),picks=rng(seed+1),patterns=new Set(),budgets=Array(9).fill(0);
const stats=Object.fromEntries(['random','auto','targeted'].map(name=>[name,{total:0,squares:0,base:0,odds:0,anyOdds:0,counts:Object.fromEntries(lengths.map(k=>[k,Array(19).fill(0)]))}]));
for(let g=0;g<rounds;g++){
 const initial=R.create({rng:random}),counts=Array(26).fill(0);
 for(const n of initial.numbers)counts[n]++;
 assert.equal(counts.filter(n=>n===3).length,14);assert.equal(counts.filter(n=>n===2).length,11);
 assert.equal(new Set(initial.initialFree).size,2);patterns.add(initial.patternName);
 // Labels are assigned uniformly to the board, so a fixed draw sequence gives
 // uniform board/draw pairs without entangling a strategy's RNG with future draws.
 const thinking=beforeSix(initial);budgets[thinking.freeBudget]++;
 for(const [strategy,placed] of [['auto',R.confirm(thinking)],['random',randomFree(thinking,picks)],['targeted',targetedFree(thinking)]]){
  let s=placed;for(const n of [6,7,8])s=R.draw(s,n);
  const b=stats[strategy],pay=s.totalHundredths;
  b.total+=pay;b.squares+=pay*pay;b.base+=s.baseHundredths;b.odds+=s.oddsMultiplier;if(s.oddsMultiplier>1)b.anyOdds++;
  for(const k of lengths)b.counts[k][s.counts[k]]++;
 }
}
if(rounds>=100)assert.equal(patterns.size,4);
for(const s of Object.values(stats)){
 s.rtp=s.total/rounds;s.se=Math.sqrt((s.squares/rounds-s.rtp**2)/rounds);
 s.base/=rounds;s.odds/=rounds;s.anyOdds/=rounds;delete s.total;delete s.squares;
 for(const k of lengths){const row=s.counts[k];while(row.at(-1)===0)row.pop();}
}
console.log(JSON.stringify({rounds,seed,budgets,stats},null,2));

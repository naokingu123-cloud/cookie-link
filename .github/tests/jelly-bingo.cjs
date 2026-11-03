const assert=require('node:assert/strict');
const J=require('../../assets/jelly-rules.js');

const rng=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
const cells=Array.from({length:25},(_,i)=>i);
const board=(seeds=[])=>({
  numbers:cells.map(i=>i+1),seeds,colors:cells.map(i=>seeds.includes(i)?'blue':null),
  draws:[],open:new Set(),lines:[]
});
const step=(state,cell)=>J.draw(state,state.numbers[cell]);
const play=(state,path)=>path.reduce((s,i)=>step(s,i).state,state);
const covered=s=>s.colors.flatMap((c,i)=>c?[i]:[]);
assert.equal(new Set(J.LINES.map(l=>l.join(','))).size,12);
assert(J.LINES.every(line=>line.length===5));

{
  const start=board([3]);
  const {state:a,trace:corner}=step(start,0);
  assert.deepEqual(corner.opened,[[0,1],[0,5]]);
  assert.deepEqual(covered(a),[3]); // dry hit only opens doors
  assert.equal(start.open.size,0);
  assert(!J.isOpen(a,0,4)); // board edges never wrap
  const {state:b,trace:flow}=step(a,2);
  assert.deepEqual(flow.wave,[[2],[1,7],[0],[5]]);
  assert.deepEqual(covered(b),[0,1,2,3,5,7]);
  assert.deepEqual(covered(a),[3]); // prior snapshot is usable for animation
  assert(!J.isOpen(b,0,6));
  const c=play(b,[20,22,24]);
  const {state:d,trace:red}=step(c,6);
  assert.deepEqual(red.wave,[[6]]); // diagonally touching wet corners don't leak
  assert.equal(d.colors[6],'red');assert.equal(d.colors[0],'blue');
  const {state:e,trace:yellow}=step(d,5);
  assert.equal(yellow.color,'yellow');
  assert.deepEqual(yellow.wave,[[5],[0],[1],[2],[3,7]]);
  assert.equal(e.colors[3],'yellow');
  const {state:f,trace:green}=step(e,7);
  assert.equal(green.color,'green');
  assert.deepEqual(covered(e),covered(f));
  assert.equal(f.colors[3],'green');assert.equal(f.colors[6],'red');
  assert.equal(f.open,c.open);
  assert.equal(J.draw(f,9),null);assert.equal(J.draw(a,1),null);
  assert.equal(J.draw(a,26),null);
}

{
  // The fifth opening, then a later refill of the same row, must pay only once.
  const s=board([0]);
  const a=play(s,[0,21,23,2]);
  assert.deepEqual(a.lines,[]);
  const {state:b,trace:r}=step(a,4);
  assert.deepEqual(r.newLines,[0]);assert.equal(J.payout(b.lines.length),20);
  const {state:c,trace:red}=step(b,3);
  assert.deepEqual(red.newLines,[]);assert.equal(J.payout(c.lines.length),20);
  assert.equal(J.payout(12),30000);
}

{
  // All eight disconnected sections must fill; this valid five-seed board
  // reaches 12 lines only on ball eight (11 cannot be an intermediate award).
  const a=play(board([4,10,14,20,22]),[0,7,8,16,18,24,1]);
  const {state,trace}=step(a,12);
  assert.equal(covered(state).length,25);
  assert.equal(state.lines.length,12);
  assert.equal(trace.newLines.length,12-a.lines.length);
  assert.equal(J.payout(state.lines.length),30000);
}

// Optional independent check using the shipped engine itself:
// node .github/tests/jelly-bingo.cjs [rounds] [rng seed] [target %].
const rounds=Number(process.argv[2]||100),random=rng(Number(process.argv[3]||39507));
const target=Number(process.argv[4]||90),counts=Array(13).fill(0);
for(let t=0;t<rounds;t++){
  // A uniform number permutation on the initial board makes a fixed sequence
  // of eight distinct roulette numbers an independent uniform cell sample.
  let s=J.create({rng:random,rate:target}),total=J.payout(s.lines.length);
  assert.equal(new Set(s.numbers).size,25);
  for(let n=1;n<=8;n++){
    const {state:next,trace}=J.draw(s,n);
    const win=J.payout(next.lines.length);
    assert.equal(trace.newLines.length,next.lines.length-s.lines.length);
    assert(win>=total);
    if(!trace.newLines.length)assert.equal(win,total);
    total=win;s=next;
  }
  assert.notEqual(s.lines.length,11);counts[s.lines.length]++;
}
const rate=counts.reduce((sum,n,i)=>sum+n*J.payout(i),0)/rounds;
console.log('Jelly Bingo rules OK',JSON.stringify({rounds,counts,returnPercent:rate}));

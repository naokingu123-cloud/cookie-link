const assert=require('node:assert/strict');
const J=require('../../assets/jelly-rules.js');

const rng=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
const cells=Array.from({length:25},(_,i)=>i);
const board=(seeds=[])=>({
  numbers:cells.map(i=>i+1),seeds,colors:cells.map(i=>seeds.includes(i)?'white':null),
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
  assert.deepEqual(corner.wave,[[0],[1,5]]);
  assert.deepEqual(covered(a),[0,1,3,5]);
  assert.deepEqual(a.draws,[1]); // wet neighbors and the FREE are unstamped
  assert.equal(start.open.size,0);
  assert(!J.isOpen(a,0,4)); // board edges never wrap
  assert.equal(J.draw(a,1),null);assert.equal(J.draw(a,26),null);

  const b=play(a,[20,24,4,18]);
  assert.equal(b.colors[3],'white+yellow');
  assert.equal(b.colors[18],'red+yellow');
  const saved=structuredClone(b);
  const {state:c,trace:green}=step(b,2);
  assert.deepEqual(green.opened,[[2,1],[2,3],[2,7]]);
  assert.deepEqual(green.wave,[[2],[1,3,7],[0,4],[5,9]]);
  for(const i of green.wave.flat())assert.equal(c.colors[i],'white+red+yellow+green');
  assert.equal(c.colors[18],'red+yellow'); // still separated by intact walls
  assert.deepEqual(green.newLines,[0]); // wet, undrawn numbers 2 and 4 complete this row
  assert(!c.draws.includes(2));assert(!c.draws.includes(4));

  const {state:d,trace:blue}=step(c,7);
  assert.equal(blue.opened.length,3); // one wall already broke on ball six
  assert.equal(d.colors[3],'white+red+yellow+green+blue');
  assert.equal(J.payout(d.lines.length),10);
  const {state:e,trace:purple}=step(d,12);
  assert.equal(purple.opened.length,3);
  assert.equal(e.colors[18],'white+red+yellow+green+blue+purple');
  assert.equal(e.colors[20],'red');
  assert.deepEqual(purple.newLines,[]);assert.equal(J.payout(e.lines.length),10);
  assert.deepEqual(b,saved);
  for(const edge of b.open)assert(e.open.has(edge));
  assert.equal(J.draw(e,9),null);
  assert.deepEqual(e.draws,[1,21,25,5,19,3,8,13]);
}

{
  const seven=play(board([6,22,5,21,15,20]),[20,23,4,0,7,18,14]);
  assert(seven.lines.length<10);
  const {state,trace}=step(seven,11);
  assert.equal(covered(state).length,25);assert.equal(state.lines.length,12);
  assert.equal(trace.newLines.length,12-seven.lines.length);
  assert.equal(J.previewLines(seven,12),12);
  assert.equal(J.previewLines(seven,21),null);
  const ten=step(seven,15).state;
  assert.equal(ten.lines.length,10);assert.equal(J.previewLines(seven,16),10);
  const before=structuredClone(ten);
  assert.equal(J.previewLines(ten,12),12); // reach preview on the settled eighth board
  assert.deepEqual(ten,before);assert.equal(J.draw(ten,12),null);
  assert.deepEqual(J.paidLines,[4,5,6,7,8,9,10,12]);
  assert.deepEqual(J.paidLines.map(J.payout),[10,20,30,50,100,200,500,3000]);
}

// Different sugar rolls may mark different rows on exactly the same ready board.
{
  const sample=rng(913),tape=[];
  J.create({rng:()=>{const r=sample();tape.push(r);return r;}});
  const replay=goalRoll=>{
    const values=tape.slice();values[values.length-1]=goalRoll;
    return J.create({rng:()=>values.shift()});
  };
  const easy=replay(0),hard=replay(.999);
  assert.deepEqual(easy.numbers,hard.numbers);assert.deepEqual(easy.seeds,hard.seeds);
  assert(easy.sugarLines<hard.sugarLines);
}

// Optional independent check using the shipped engine itself:
// node .github/tests/jelly-bingo.cjs [rounds] [rng seed] [target %].
const rounds=Number(process.argv[2]||100),random=rng(Number(process.argv[3]||39507));
const target=Number(process.argv[4]||90),counts=Array(13).fill(0),sugarGoals=Array(13).fill(0);
let sugarWins=0;
for(let t=0;t<rounds;t++){
  // A uniform number permutation on the initial board makes a fixed sequence
  // of eight distinct roulette numbers an independent uniform cell sample.
  let s=J.create({rng:random,rate:target}),total=J.payout(s.lines.length);
  const sugarLines=s.sugarLines;
  assert([8,9,10,12].includes(sugarLines));
  if(target===90)assert([5,6].includes(s.seeds.length)&&sugarLines<=10);
  assert(s.seeds.every(i=>s.colors[i]==='white'));
  sugarGoals[sugarLines]++;
  assert.equal(new Set(s.numbers).size,25);
  for(let n=1;n<=8;n++){
    const {state:next,trace}=J.draw(s,n);
    const win=J.payout(next.lines.length);
    assert.equal(trace.color,['red','red','red','yellow','yellow','green','blue','purple'][n-1]);
    assert.equal(next.sugarLines,sugarLines);
    assert.equal(trace.newLines.length,next.lines.length-s.lines.length);
    assert(win>=total);
    if(!trace.newLines.length)assert.equal(win,total);
    total=win;s=next;
  }
  assert.notEqual(s.lines.length,11);counts[s.lines.length]++;
  if(s.lines.length>=sugarLines)sugarWins++;
}
const rate=counts.reduce((sum,n,i)=>sum+n*J.payout(i),0)/rounds;
console.log('Jelly Bingo rules OK',JSON.stringify({rounds,counts,returnPercent:rate,sugarGoals,sugarWins,sugarPercent:100*sugarWins/rounds}));

const assert=require('node:assert/strict');
const J=require('../../assets/jelly-rules.js');

const rng=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
const cells=Array.from({length:25},(_,i)=>i);
const board=(seeds=[])=>({
  numbers:cells.map(i=>i+1),seeds,colors:cells.map(i=>seeds.includes(i)?'blue':null),
  draws:[],open:new Set(),lines:[],oddsMultiplier:1
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
  assert.equal(e.colors[3],'blue+yellow');
  const {state:f,trace:green}=step(e,7);
  assert.equal(green.color,'green');
  assert.deepEqual(covered(e),covered(f));
  assert.equal(f.colors[3],'blue+yellow+green');assert.equal(f.colors[6],'red');
  assert.equal(f.open,c.open);
  assert.equal(J.draw(f,9),null);assert.equal(J.draw(a,1),null);
  assert.equal(J.draw(a,26),null);
}

// Overlaps use pre-draw section boundaries, including blue FREE + blue FREE.
{
  const a=step(board([0]),1);                    // one blue spreads into dry neighbors
  assert.equal(a.trace.oddsReason,null);assert.equal(a.state.oddsMultiplier,1);
  const b=step(a.state,2);                        // previously covered by blue
  assert.equal(b.trace.oddsReason,'blue');assert.equal(b.state.oddsMultiplier,1.5);
  const c=step(board([0,2]),1);                 // a dry landing joins two blue FREE cells
  assert.equal(c.trace.oddsReason,'blue');assert.equal(c.state.oddsMultiplier,1.5);
  const d=step(board([0,1,2]),1);               // direct blue + merge on one ball
  assert.equal(d.state.oddsMultiplier,1.5);
  const e=step(step(board([0]),1).state,7);      // neighbors 2 and 6 already share the blue section
  assert.equal(e.trace.oddsReason,null);assert.equal(e.state.oddsMultiplier,1);
  const f=step(step(board([]),0).state,1);       // another number in a previously opened dry section
  assert.equal(f.trace.oddsReason,'section');assert.equal(f.state.oddsMultiplier,1.5);
}
{
  // Three successive colored pours on an already blue component each advance the odds once.
  let a=play(board([0]),[0,2,4,21,23]);let odds=a.oddsMultiplier;
  for(const i of [5,7,9]){
    const seen=structuredClone(a),n=a.numbers[i],p=J.preview(a,n),{state:b,trace}=J.draw(a,n);
    odds+=.5;assert.equal(b.oddsMultiplier,odds);assert(trace.oddsReason);
    assert.equal(p.oddsMultiplier,odds);assert.equal(p.totalHundredths,J.payout(b.lines.length,odds));
    assert.equal(p.oddsReason,trace.oddsReason);assert.deepEqual(a,seen);a=b;
  }
  assert.equal(J.draw(a,25),null);assert.equal(J.preview(a,a.draws[0]),null);
}

// All 15 nonempty recipes can occur in legal eight-ball play. The same
// section can be filled repeatedly while other pours land behind closed walls.
{
  const pigments=['blue','red','yellow','green'];
  for(let mask=0;mask<16;mask++){
    const start=play(board(mask&1?[0]:[19]),[0,2,4,21,23]);
    const saved=structuredClone(start);
    const result=play(start,[mask&2?5:10,mask&4?7:11,mask&8?9:13]);
    const expected=pigments.filter((_,i)=>mask&(1<<i)).join('+')||null;
    for(const cell of [0,1,2,3,4,5,7,9])assert.equal(result.colors[cell],expected);
    assert.deepEqual(start,saved);
  }
}

{
  // The same completed row is counted once; a re-hit can still increase its WIN.
  const s=board([0]);
  const a=play(s,[0,21,23,2]);
  assert.deepEqual(a.lines,[]);
  const {state:b,trace:r}=step(a,4);
  assert.deepEqual(r.newLines,[0]);assert.equal(J.payout(b.lines.length),20);
  const {state:c,trace:red}=step(b,3);
  assert.deepEqual(red.newLines,[]);assert.equal(J.payout(c.lines.length),20);
  const before=J.payout(b.lines.length,b.oddsMultiplier),after=J.payout(c.lines.length,c.oddsMultiplier);
  assert.equal(after-before,10);assert.equal(J.preview(b,4).totalHundredths,after);
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
  assert.equal(J.previewLines(a,13),12);
  assert.equal(J.previewLines(a,1),null); // already drawn
  const last=step(a,4).state;
  const before=structuredClone(last);
  assert.equal(J.previewLines(last,13),12); // projected on the settled eighth board
  assert.deepEqual(last,before);
  assert.equal(J.draw(last,13),null);

  const ten=play(board([4,14,20,22,0]),[0,7,8,16,18,24,1]);
  assert.equal(J.previewLines(ten,13),10); // 100× is not an all-line result
}

// A real standard-rate lucky board can still collect all 25 cells in eight distinct draws.
{
  let s=J.create({rng:rng(1972),rate:90});
  assert.equal(s.seeds.length,5);
  for(const n of [15,17,9,2,11,16,24])s=J.draw(s,n).state;
  assert(s.lines.length<12);assert.equal(J.preview(s,21).lines,12);
  s=J.draw(s,21).state;
  assert.equal(s.colors.filter(Boolean).length,25);assert.equal(s.lines.length,12);
}
// The seed-count roll uses a fixed lucky tail while the ordinary counts respond to the rate.
{
  function seedCount(rate,roll){
    const random=rng(11);
    let first=true;
    return J.create({rate,rng:()=>{if(first){first=false;return roll;}return random();}}).seeds.length;
  }
  for(const target of [50,90,150]){
    assert.equal(seedCount(target,.005),5);assert.equal(seedCount(target,.025),6);
  }
  assert.equal(seedCount(50,.999),0);assert.equal(seedCount(50,.04),1);
  assert.equal(seedCount(90,.999),2);assert.equal(seedCount(90,.04),3);
  assert.equal(seedCount(150,.999),3);assert.equal(seedCount(150,.04),4);
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
  assert.equal(hard.sugarLines,easy.sugarLines+1);
}

// Optional independent check using the shipped engine itself:
// node .github/tests/jelly-bingo.cjs [rounds] [rng seed] [target %].
const rounds=Number(process.argv[2]||100),random=rng(Number(process.argv[3]||39507));
const target=Number(process.argv[4]||90),counts=Array(13).fill(0),sugarGoals=Array(8).fill(0);
const seedCounts=Array(7).fill(0);
let sugarWins=0,stackedTotal=0,oddsTotal=0;
for(let t=0;t<rounds;t++){
  // A uniform number permutation on the initial board makes a fixed sequence
  // of eight distinct roulette numbers an independent uniform cell sample.
  let s=J.create({rng:random,rate:target}),total=J.payout(s.lines.length);
  const sugarLines=s.sugarLines;
  assert(Number.isInteger(sugarLines)&&sugarLines>=2&&sugarLines<=6);
  if(target===90)assert([2,3,5,6].includes(s.seeds.length)&&sugarLines>=3);
  seedCounts[s.seeds.length]++;
  sugarGoals[sugarLines]++;
  assert.equal(new Set(s.numbers).size,25);
  for(let n=1;n<=8;n++){
    const {state:next,trace}=J.draw(s,n);
    const win=J.payout(next.lines.length);
    assert.equal(next.sugarLines,sugarLines);
    assert.equal(trace.newLines.length,next.lines.length-s.lines.length);
    assert(win>=total);
    if(!trace.newLines.length)assert.equal(win,total);
    total=win;s=next;
  }
  assert.notEqual(s.lines.length,11);counts[s.lines.length]++;
  stackedTotal+=J.payout(s.lines.length,s.oddsMultiplier);oddsTotal+=s.oddsMultiplier;
  if(s.lines.length>=sugarLines)sugarWins++;
}
const rate=counts.reduce((sum,n,i)=>sum+n*J.payout(i),0)/rounds;
console.log('Jelly Bingo rules OK',JSON.stringify({rounds,counts,returnPercent:stackedTotal/rounds,baseReturnPercent:rate,meanOdds:oddsTotal/rounds,seedCounts,sugarGoals,sugarWins,sugarPercent:100*sugarWins/rounds}));

'use strict';
const assert=require('node:assert/strict');
const R=require('../../assets/bingo-stick-rules.js');
const rng=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
const cells=Array.from({length:64},(_,i)=>i),labels=Array.from({length:25},(_,i)=>i+1);
const base=[0,...R.payRows.filter(row=>row.count>0).map(row=>row.hundredths)];
assert.deepEqual(R.payRows.filter(row=>row.count>0).map(row=>row.count),Array.from({length:13},(_,i)=>i+1));
assert.equal(R.sweepBonusHundredths,5000);
assert.equal(R.topRefills.length,8);
for(const odds of [...base,...R.topRefills])assert(Number.isInteger(odds/10)&&odds>=0);
assert(base.every((v,i)=>!i||v>=base[i-1]));
assert.equal(new Set(base.slice(1)).size,13);
assert(R.topRefills.every((v,i)=>v>(i?R.topRefills[i-1]:base.at(-1))));
assert(R.topRefills.some(v=>v>=5000));
const expected=(flips,rack)=>rack[Math.min(flips,13)];

function nextRack(rack,flips,turn){
 const result=rack.slice();result.splice(Math.max(1,Math.min(13,flips)),1);
 return [...result,R.topRefills[turn]];
}
function checkKnock(prev,s){
 const row=Math.min(s.lastFlips,13),rack=prev.rack;
 assert.deepEqual(s.lastRack,rack);assert.equal(s.lastKnockRow,row||null);
 assert.equal(s.grade,prev.grade+Number(row>0));
 if(!row){assert.equal(s.rack,rack);assert.equal(s.lastBaseHundredths,0);return;}
 assert.deepEqual(s.rack,nextRack(rack,row,prev.grade));assert.notEqual(s.rack,rack);
 assert.equal(s.lastBaseHundredths,expected(s.lastFlips,rack));
 for(let f=0;f<=17;f++)assert.equal(R.award(f,s.rack),expected(f,s.rack));
}

for(let target=50;target<=150;target++){
 const balance=R.balance(target);
 assert(Math.abs(balance.normalPercent-(target-5))<.5);
 assert(Number.isFinite(balance.bonusPercent)&&balance.bonusPercent>=0);
}

function fixture(origin,black,white,otherNumber){
 const s=R.create({rng:rng(17)}),colors=Array(64).fill(null),numbers=Array(64).fill(null);
 for(const i of black)colors[i]='black';for(const i of white)colors[i]='white';
 numbers[origin]=1;if(otherNumber!==undefined)numbers[otherNumber]=2;
 return {...s,numbers,colors,offBoardNumbers:[21,22,23,24,25],counts:{black:black.length,white:white.length}};
}
// Eight bounded rays. Flips are ordered by distance, then by stable direction.
{
 const vectors=[-9,-8,-7,-1,1,7,8,9],black=vectors.map(d=>27+3*d),white=vectors.flatMap(d=>[27+d,27+2*d]);
 const start=fixture(27,black,white),before=structuredClone(start),s=R.draw(start,1);
 assert.deepEqual(s.placed,[27]);assert.deepEqual(s.flipped,[...vectors.map(d=>27+d),...vectors.map(d=>27+2*d)]);
 for(const step of s.flipSteps)assert.equal(step.id,27+step.distance*(step.dx+step.dy*8));
 checkKnock(start,s);assert.equal(s.maxFlips,16);assert.equal(s.baseHundredths,base.at(-1));assert.equal(s.bonusHundredths,5000);assert.deepEqual(start,before);
}
// Hitting 8 knocks that exact prize; 1–7 survive, 9–13 fall and a new top prize enters.
{
 const vectors=[-9,-8,-7,-1,1,7,8,9],start=fixture(27,vectors.map(d=>27+2*d),vectors.map(d=>27+d));
 const s=R.draw(start,1);assert.equal(s.lastFlips,8);checkKnock(start,s);
 assert.deepEqual(s.rack.slice(1,8),start.rack.slice(1,8));
 assert.deepEqual(s.rack.slice(8,13),start.rack.slice(9,14));
}
// Gaps block, own stones capture nothing, no edge wrapping or branching rays.
for(const s of [fixture(0,[3],[2]),fixture(0,[3],[2],1),fixture(7,[9],[8]),fixture(0,[1],[])]){
 const d=R.draw(s,1);checkKnock(s,d);assert.deepEqual(d.flipped,[]);assert.equal(d.colors[s.numbers.indexOf(1)],'black');
 assert.equal(d.reversalCount,0);assert.equal(d.grade,0);assert.equal(d.lastBaseHundredths,0);
}
assert.deepEqual(R.draw(fixture(9,[11,26],[10,18]),1).flipped,[10]);
// The color wiped on ball one returns, so ball three can earn a fresh flat 50x.
{
 let s=fixture(0,[2,6],[1],5);s.numbers[4]=3;
 s=R.draw(s,1);assert.equal(s.reversalCount,1);
 s=R.draw(s,2);assert.equal(s.reversalCount,1);assert.equal(s.reversalThisMove,false);
 s=R.draw(s,3);assert.deepEqual(s.bonusEvents.map(e=>e.ball),[1,3]);assert.equal(s.bonusHundredths,10000);
 assert.equal(s.grade,2);assert.equal(s.lastBaseHundredths,s.lastRack[1]);
 for(const n of s.offBoardNumbers)s=R.draw(s,n);
 assert.equal(s.grade,2);assert.equal(s.phase,'done');assert.equal(s.reversalCount,2);
 assert.equal(s.bonusHundredths,10000);assert.equal(s.lastBaseHundredths,0);
}

const patterns=new Set();
for(let seed=0;seed<300;seed++){
 let s=R.create({rng:rng(Math.imul(seed+1,2654435761)),target:50+seed%101});patterns.add(s.patternName);
 assert.equal(s.colors.filter(Boolean).length,44);assert.equal(s.numbers.filter(Boolean).length,20);assert.equal(s.grade,0);assert.deepEqual(s.rack,base);
 assert.deepEqual(s.offBoardNumbers,labels.filter(n=>!s.numbers.includes(n)));assert.equal(s.offBoardNumbers.length,5);
 for(const i of cells){
  for(const j of [63-i,(i&56)+7-i%8]){
   assert.equal(s.colors[i],s.colors[j]);assert.equal(Boolean(s.numbers[i]),Boolean(s.numbers[j]));
  }
  assert.notEqual(Boolean(s.numbers[i]),Boolean(s.colors[i]));
 }
 const numbered=i=>Number(s.numbers[i]!==null);
 for(let i=0;i<8;i++){
  const row=cells.filter(v=>(v>>3)===i).reduce((n,j)=>n+numbered(j),0);
  const col=cells.filter(v=>v%8===i).reduce((n,j)=>n+numbered(j),0);
  assert([2,4].includes(row)&&[2,4].includes(col));
 }
 const boxes=Array(16).fill(0),quarters=Array(4).fill(0);
 for(const i of cells)if(numbered(i)){boxes[4*(i>>4)+((i%8)>>1)]++;quarters[2*(i>>5)+((i%8)>>2)]++;}
 assert.deepEqual(quarters,[5,5,5,5]);assert(boxes.filter(Boolean).length>=12);
 for(const n of s.offBoardNumbers){
  const miss=R.draw(s,n);checkKnock(s,miss);assert.deepEqual(miss.placed,[]);assert.deepEqual(miss.colors,s.colors);assert.deepEqual(miss.counts,s.counts);
  assert.equal(miss.lastBaseHundredths,0);assert.equal(miss.lastColor,'black');assert.equal(miss.grade,0);assert.equal(miss.lastGrade,0);
  assert.equal(R.draw(miss,s.numbers.find(Boolean)).lastColor,'white');assert.equal(R.draw(miss,n),null);
 }
 for(const n of [0,26,1.5])assert.equal(R.draw(s,n),null);
 for(let n=1;n<=8;n++){
  const last=s;s=R.draw(s,n);assert.equal(s.lastColor,n%2?'black':'white');assert.equal(s.lastFlips,s.flipped.length);
  assert.equal(s.maxFlips,Math.max(last.maxFlips,s.lastFlips));assert.equal(s.previousMaxFlips,last.maxFlips);
  assert.equal(s.lastGrade,last.grade);checkKnock(last,s);assert.deepEqual(s.turnTotals,[...last.turnTotals,s.totalHundredths]);
  assert.equal(s.baseHundredths,last.baseHundredths+s.lastBaseHundredths);
  assert.equal(s.totalHundredths,s.baseHundredths+s.reversalCount*5000);
  for(const value of [s.lastBaseHundredths,s.baseHundredths,s.bonusHundredths,s.totalHundredths])assert(Number.isInteger(value/10));
  assert.equal(s.phase,n===8?'done':'playing');
  assert.equal(s.counts.black+s.counts.white,44+s.draws.filter(v=>!s.offBoardNumbers.includes(v)).length);
  assert(s.colors.every((color,i)=>color||s.numbers[i]));
  for(const c of ['black','white'])assert.equal(s.counts[c],s.colors.filter(v=>v===c).length);
  if(s.offBoardNumbers.includes(n)){assert.deepEqual(s.placed,[]);assert.deepEqual(s.colors,last.colors);}
  else{assert.equal(s.colors[s.placed[0]],s.lastColor);assert.equal(s.numbers[s.placed[0]],n);}
  assert.equal(R.draw(s,n),null);
 }
 assert.equal(R.draw(s,9),null);
 const before=structuredClone(s);for(const n of labels.filter(n=>!s.draws.includes(n))){assert(R.project(s,n));}assert.deepEqual(s,before);
}

// Replay an actual sequence of printed labels in every mold, with 64 as
// the next unused off-board label. These are geometry witnesses, not random odds.
const witnesses=[
 ['千鳥',[42,18,21,33,45,64,25]],
 ['小花',[55,15,22,29,8,48,64,26]],
 ['飛石',[0,64,56,64,7,64,63]],
 ['小紋',[51,21,45,42,18]],
 ['双葉',[64,7,64,63,64,0,64,56]],
 ['花菱',[30,25,16,64,38,64,33]],
 ['風車',[8,48,55,15,30,25,33,38]],
 ['花窓',[46,29,22,34,26,41,17]],
 ['組市松',[31,39,32,24,43,19,64,44]]
];
assert.deepEqual([...patterns].sort(),witnesses.map(([name])=>name).sort());
for(const [name,positions] of witnesses){
 let s=R.create({rng:()=>.9,patternName:name});assert.equal(s.patternName,name);
 const extras=s.offBoardNumbers.slice(),path=positions.map(i=>i===64?extras.shift():s.numbers[i]);
 assert.equal(new Set(path).size,path.length);
 for(const n of path){const before=s;s=R.draw(s,n);checkKnock(before,s);}
 assert(s.reversalThisMove);assert(s.bonusHundredths>=5000);
}
{
 const demo=R.createDemo();let s=demo.state;
 assert.equal(demo.draws.length,8);assert.equal(new Set(demo.draws).size,8);
 const demoFlips=[];
 for(const n of demo.draws){const last=s;s=R.draw(s,n);checkKnock(last,s);demoFlips.push(s.lastFlips);}
 assert.deepEqual(demoFlips,[2,0,2,7,8,6,5,0]);assert.equal(s.totalHundredths,410);
 assert.equal(s.grade,6);assert.equal(s.phase,'done');assert.equal(s.totalHundredths,s.baseHundredths+s.bonusHundredths);
}

// Exercise production create/draw independently of the calibration model and seed.
// Only regular WIN is calibrated. The flat provisional prize contributes its own empirical rate.
if(process.argv.includes('--balance')){
 for(const target of [50,90,150]){
  const random=rng(955712+target),games=100000;let baseSum=0,squares=0,bonus=0,total=0,reversals=0;
  for(let g=0;g<games;g++){
   let s=R.create({rng:random,target});const deck=labels.slice();
   for(let j=0;j<8;j++){const k=j+Math.floor(random()*(25-j));[deck[j],deck[k]]=[deck[k],deck[j]];s=R.draw(s,deck[j]);}
   baseSum+=s.baseHundredths;squares+=s.baseHundredths**2;bonus+=s.bonusHundredths;total+=s.totalHundredths;reversals+=s.reversalCount;
  }
  const ordinary=baseSum/games,se=Math.sqrt((squares/games-ordinary**2)/games);
  assert.equal(bonus,5000*reversals);assert.equal(total,baseSum+bonus);
  console.log({target,games,ordinaryTarget:target-5,ordinary,ordinarySE:se,provisionalBonus:bonus/games,total:total/games,reversals});
  assert(Math.abs(ordinary-(target-5))<5*se+0.4);
 }
}
console.log('Waffle Reversi rules passed');

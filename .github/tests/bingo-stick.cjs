'use strict';
const assert=require('node:assert/strict');
const R=require('../../assets/bingo-stick-rules.js');
const rng=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
const cells=Array.from({length:64},(_,i)=>i),labels=Array.from({length:25},(_,i)=>i+1);
const base=[0,0,0,10,10,10,20,20,30,50,100,200,400,800];
assert.deepEqual(R.payRows.filter(row=>row.count>0).map(row=>row.hundredths),base.slice(1));
const expected=(flips,grade)=>flips?base[Math.min(flips+grade,base.length-1)]:0;
assert.deepEqual(R.payRows.filter(row=>row.count>0).map(row=>row.count),Array.from({length:13},(_,i)=>i+1));
assert.equal(R.sweepBonusHundredths,5000);
for(let i=0;i<base.length;i++){
 assert(Number.isInteger(base[i]/10)&&base[i]>=0);
 if(i)assert(base[i]>=base[i-1]);
 assert.equal(R.award(i),base[i]);
}
for(let grade=0;grade<=8;grade++)for(let flips=0;flips<=18;flips++)assert.equal(R.award(flips,grade),expected(flips,grade));

for(let target=50;target<=150;target++){
 const balance=R.balance(target);
 assert(Math.abs(balance.normalPercent-(target-5))<.5);
 assert(Number.isFinite(balance.bonusPercent)&&balance.bonusPercent>0);
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
 assert.equal(s.maxFlips,16);assert.equal(s.baseHundredths,base.at(-1));assert.equal(s.bonusHundredths,5000);assert.deepEqual(start,before);
}
// Gaps block, own stones capture nothing, no edge wrapping or branching rays.
for(const s of [fixture(0,[3],[2]),fixture(0,[3],[2],1),fixture(7,[9],[8]),fixture(0,[1],[])]){
 const d=R.draw(s,1);assert.deepEqual(d.flipped,[]);assert.equal(d.colors[s.numbers.indexOf(1)],'black');
 assert.equal(d.reversalCount,0);assert.equal(d.grade,1);assert.equal(d.lastBaseHundredths,0);
}
assert.deepEqual(R.draw(fixture(9,[11,26],[10,18]),1).flipped,[10]);
// The color wiped on ball one returns, so ball three can earn a fresh flat 50x.
{
 let s=fixture(0,[2,6],[1],5);s.numbers[4]=3;
 s=R.draw(s,1);assert.equal(s.reversalCount,1);
 s=R.draw(s,2);assert.equal(s.reversalCount,1);assert.equal(s.reversalThisMove,false);
 s=R.draw(s,3);assert.deepEqual(s.bonusEvents.map(e=>e.ball),[1,3]);assert.equal(s.bonusHundredths,10000);
 assert.equal(s.grade,3);assert.equal(s.lastBaseHundredths,expected(1,2));
 for(const n of s.offBoardNumbers)s=R.draw(s,n);
 assert.equal(s.grade,8);assert.equal(s.phase,'done');assert.equal(s.reversalCount,2);
 assert.equal(s.bonusHundredths,10000);assert.equal(s.lastBaseHundredths,0);
}

const patterns=new Set();
for(let seed=0;seed<300;seed++){
 let s=R.create({rng:rng(Math.imul(seed+1,2654435761)),target:50+seed%101});patterns.add(s.patternName);
 assert.equal(s.colors.filter(Boolean).length,44);assert.equal(s.numbers.filter(Boolean).length,20);assert.equal(s.grade,0);
 assert.deepEqual(s.offBoardNumbers,labels.filter(n=>!s.numbers.includes(n)));assert.equal(s.offBoardNumbers.length,5);
 for(const i of cells){
  for(const j of [63-i,(i&56)+7-i%8]){
   assert.equal(s.colors[i],s.colors[j]);assert.equal(Boolean(s.numbers[i]),Boolean(s.numbers[j]));
  }
  assert.notEqual(Boolean(s.numbers[i]),Boolean(s.colors[i]));
 }
 for(const n of s.offBoardNumbers){
  const miss=R.draw(s,n);assert.deepEqual(miss.placed,[]);assert.deepEqual(miss.colors,s.colors);assert.deepEqual(miss.counts,s.counts);
  assert.equal(miss.lastBaseHundredths,0);assert.equal(miss.lastColor,'black');assert.equal(miss.grade,1);assert.equal(miss.lastGrade,0);
  assert.equal(R.draw(miss,s.numbers.find(Boolean)).lastColor,'white');assert.equal(R.draw(miss,n),null);
 }
 for(const n of [0,26,1.5])assert.equal(R.draw(s,n),null);
 for(let n=1;n<=8;n++){
  const last=s;s=R.draw(s,n);assert.equal(s.lastColor,n%2?'black':'white');assert.equal(s.lastFlips,s.flipped.length);
  assert.equal(s.maxFlips,Math.max(last.maxFlips,s.lastFlips));assert.equal(s.previousMaxFlips,last.maxFlips);
  assert.equal(s.grade,n);assert.equal(s.lastGrade,n-1);assert.equal(s.lastBaseHundredths,expected(s.lastFlips,n-1));
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
}

// Coordinates refer to physical cells. 64 consumes one unused off-board label.
// Fix the orientation and replay legal printed numbers from each production mold.
const witnesses=[
 ['小格子',[20,44,19,52,43,64,45],20],
 ['格子',[34,64,29,64,37,64,26],20],
 ['双菱',[14,64,26,37,29,46,41],20],
 ['市松',[57,56,1,0,30,38,33,25],20],
 ['花窓',[11,51,58,12,52,64,5],20],
 ['蜜格子',[30,19,43,36,27],16]
];
assert.deepEqual([...patterns].sort(),witnesses.map(([name])=>name).sort());
for(const [name,positions,openings] of witnesses){
 let s=R.create({rng:()=>.9,target:90,patternName:name});
 assert.equal(s.patternName,name);
 assert.equal(s.numbers.filter(n=>n&&R.draw(s,n).lastFlips>0).length,openings);
 const extras=s.offBoardNumbers.slice();
 const path=positions.map(i=>i===64?extras.shift():s.numbers[i]);
 assert(path.every(n=>labels.includes(n)));assert.equal(new Set(path).size,path.length);
 const draws=[...path,...labels.filter(n=>!path.includes(n))].slice(0,8);
 for(const [i,n] of draws.entries()){
  s=R.draw(s,n);
  if(i+1===path.length){
   const color=i%2?'white':'black';
   assert.deepEqual(s.lastReversal,{ball:i+1,number:n,color});
   assert.equal(s.counts[color==='black'?'white':'black'],0);
   assert(s.reversalThisMove);assert.equal(s.bonusHundredths,5000*s.reversalCount);
  }
 }
 assert.equal(s.phase,'done');assert(s.highestRole);assert(s.bonusEvents.some(e=>e.ball===path.length));
}
{
 const demo=R.createDemo();let s=demo.state;
 assert.equal(demo.draws.length,8);assert.equal(new Set(demo.draws).size,8);
 const flips=[],paid=[];
 for(const n of demo.draws){s=R.draw(s,n);flips.push(s.lastFlips);paid.push(s.lastBaseHundredths);}
 assert.deepEqual(flips,[8,0,9,2,4,0,7,0]);assert.deepEqual(paid,[30,0,200,10,30,0,800,0]);
 assert.equal(s.grade,8);assert.deepEqual(s.bonusEvents.map(e=>e.ball),[7]);assert.equal(s.totalHundredths,6070);
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

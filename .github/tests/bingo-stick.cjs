'use strict';
const assert=require('node:assert/strict');
const R=require('../../assets/bingo-stick-rules.js');
const rng=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
const cells=Array.from({length:64},(_,i)=>i);
function fixture(origin,black,white,otherNumber){
 const s=R.create({rng:rng(17)}),colors=Array(64).fill(null),numbers=Array(64).fill(null);
 for(const i of black)colors[i]='black';for(const i of white)colors[i]='white';
 numbers[origin]=1;if(otherNumber!==undefined)numbers[otherNumber]=2;
 return {...s,numbers,colors,counts:{black:black.length,white:white.length}};
}
const odds=[0,10,10,20,50,100,200,500,1000,1500,2000,3000,4000,5000,5000];
assert.deepEqual(odds.map((_,n)=>R.award(n)),odds);
assert(R.payRows.every(({hundredths})=>hundredths>=10&&Number.isInteger(hundredths/10)));
assert.equal(R.sweepBonusHundredths,3000);
// Eight bounded rays. Flips are ordered by distance, then by stable direction.
{
 const vectors=[-9,-8,-7,-1,1,7,8,9],black=vectors.map(d=>27+3*d),white=vectors.flatMap(d=>[27+d,27+2*d]);
 const start=fixture(27,black,white),before=structuredClone(start),s=R.draw(start,1);
 assert.deepEqual(s.placed,[27]);assert.deepEqual(s.flipped,[...vectors.map(d=>27+d),...vectors.map(d=>27+2*d)]);
 for(const step of s.flipSteps)assert.equal(step.id,27+step.distance*(step.dx+step.dy*8));
 assert.equal(s.maxFlips,16);assert.equal(s.baseHundredths,5000);assert.equal(s.bonusHundredths,3000);assert.deepEqual(start,before);
}
// Empty squares of either kind block, a neighboring own stone captures nothing,
// the right edge cannot wrap, and a capture cannot launch a perpendicular ray.
for(const s of [fixture(0,[3],[2]),fixture(0,[3],[2],1),fixture(7,[9],[8]),fixture(0,[1],[])]){
 const d=R.draw(s,1);assert.deepEqual(d.flipped,[]);assert.equal(d.colors[s.numbers.indexOf(1)],'black');
 assert.equal(d.reversalCount,0);
}
assert.deepEqual(R.draw(fixture(9,[11,26],[10,18]),1).flipped,[10]);
// An opponent returns on ball two. Capturing that new stone awards a second event.
{
 let s=fixture(0,[2,6],[1],5);s.numbers[4]=3;
 s=R.draw(s,1);assert.equal(s.reversalCount,1);
 s=R.draw(s,2);assert.equal(s.reversalCount,1);assert.equal(s.reversalThisMove,false);
 s=R.draw(s,3);assert.deepEqual(s.bonusEvents.map(e=>e.ball),[1,3]);assert.equal(s.bonusHundredths,6000);
}
const patterns=new Set();
for(let seed=0;seed<300;seed++){
 let s=R.create({rng:rng(Math.imul(seed+1,2654435761)),target:seed%2?50:150});patterns.add(s.patternName);
 assert.equal(s.colors.filter(Boolean).length,40);assert.equal(s.numbers.filter(Boolean).length,24);
 assert.deepEqual([...s.numbers.filter(Boolean),s.missingNumber].sort((a,b)=>a-b),Array.from({length:25},(_,i)=>i+1));
 for(const i of cells){
  for(const j of [63-i,(i&56)+7-i%8]){
   assert.equal(s.colors[i],s.colors[j]);
   assert.equal(Boolean(s.numbers[i]),Boolean(s.numbers[j]));
  }
  assert.notEqual(Boolean(s.numbers[i]),Boolean(s.colors[i])); // Every square starts as a stone or a number.
 }
 // All numbered openings capture. Exactly one roulette label is a pass.
 for(const n of s.numbers.filter(Boolean))assert(R.draw(s,n).lastFlips>0);
 const miss=R.draw(s,s.missingNumber);
 assert.deepEqual(miss.placed,[]);assert.deepEqual(miss.colors,s.colors);assert.deepEqual(miss.counts,s.counts);
 assert.equal(miss.lastBaseHundredths,0);assert.equal(miss.lastColor,'black');assert.equal(miss.draws.length,1);
 const reply=s.numbers.find(Boolean);assert.equal(R.draw(miss,reply).lastColor,'white');assert.equal(R.draw(miss,s.missingNumber),null);
 for(let n=1;n<=8;n++){
  const last=s;s=R.draw(s,n);assert.equal(s.lastColor,n%2?'black':'white');assert.equal(s.lastFlips,s.flipped.length);
  assert.equal(s.maxFlips,Math.max(last.maxFlips,s.lastFlips));assert.equal(s.previousMaxFlips,last.maxFlips);
  assert.equal(s.lastBaseHundredths,R.award(s.lastFlips));
  assert.equal(s.baseHundredths,last.baseHundredths+s.lastBaseHundredths);
  assert.equal(s.totalHundredths,s.baseHundredths+s.reversalCount*R.sweepBonusHundredths);
  for(const value of [s.lastBaseHundredths,s.baseHundredths,s.bonusHundredths,s.totalHundredths])assert(Number.isInteger(value/10));
  assert.equal(s.phase,n===8?'done':'playing');assert.equal(s.counts.black+s.counts.white,40+n-Number(s.draws.includes(s.missingNumber)));
  assert(s.colors.every((color,i)=>color||s.numbers[i]));
  for(const c of ['black','white'])assert.equal(s.counts[c],s.colors.filter(v=>v===c).length);
  if(n!==s.missingNumber){assert.equal(s.colors[s.placed[0]],s.lastColor);assert.equal(s.numbers[s.placed[0]],n);}
  else{assert.deepEqual(s.placed,[]);assert.deepEqual(s.colors,last.colors);}
  assert.equal(R.draw(s,n),null);
 }
 assert.equal(R.draw(s,9),null);
}
assert.equal(patterns.size,5);
// Every production mold has a legal eight-number game that earns the reversal bonus.
const reversals=[
 [2654435761,50,'小格子',[6,22,17,23,10,1,18,3],7,'black'],
 [2710938419,50,'格子',[2,20,9,5,8,1,17,4],7,'black'],
 [2654435761,90,'双菱',[7,1,24,6,25,17,13,22],7,'black'],
 [3668339987,90,'市松',[5,7,11,16,14,13,24,25],8,'white'],
 [2654435761,150,'花窓',[18,1,16,9,6,22,19,2],7,'black']
];
for(const [seed,target,name,draws,ball,color] of reversals){
 let s=R.create({rng:rng(seed),target});assert.equal(s.patternName,name);
 for(const [i,n] of draws.entries()){
  s=R.draw(s,n);if(i+1===ball){assert.deepEqual(s.lastReversal,{ball,number:n,color});assert.equal(s.counts[color],40+ball-Number(s.draws.includes(s.missingNumber)));}
  if(i+1>ball){assert(s.highestRole);assert(s.bonusEvents.some(e=>e.ball===ball));}
 }
 assert.equal(s.phase,'done');
}
{
 let {state,draws}=R.createDemo();const flips=[],paid=[];
 for(const v of draws){state=R.draw(state,v);flips.push(state.lastFlips);paid.push(state.lastBaseHundredths);}
 assert.deepEqual(paid,[10,10,200,10,200,0,20,0]); // repeat 6 and smaller 1 or 3 are paid again.
 assert.equal(state.missingNumber,draws[7]);assert.equal(state.baseHundredths,450);assert.equal(state.totalHundredths,3450);
 assert.deepEqual(flips,[2,1,6,1,6,0,3,0]);assert.equal(state.bonusEvents[0].ball,7);
}
// Independent production-engine holdout. Number assignment is exchangeable so fixed
// labels 1–8 are a uniform eight-draw sequence. A single stream covers all game actions.
if(process.argv.includes('--balance')){
 for(const target of [50,90,150]){
  const random=rng(955712+target),games=100000;let total=0,squares=0,reversals=0;
  for(let g=0;g<games;g++){
   let s=R.create({rng:random,target});for(let i=1;i<=8;i++)s=R.draw(s,i);
   total+=s.totalHundredths;squares+=s.totalHundredths**2;reversals+=s.reversalCount;
  }
  const mean=total/games,se=Math.sqrt((squares/games-mean**2)/games);
  console.log({target,games,mean,standardError:se,reversals});assert(Math.abs(mean-target)<5*se+0.4);
 }
}
console.log('Waffle Reversi rules passed');

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
const odds=[0,0,20,50,100,200,400,600,1000,1500,2000,3000,4000,5000,5000];
assert.deepEqual(odds.map((_,n)=>R.award(n)),odds);
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
 assert.equal(s.colors.filter(Boolean).length,36);assert.equal(s.numbers.filter(Boolean).length,25);
 assert.deepEqual(s.numbers.filter(Boolean).sort((a,b)=>a-b),Array.from({length:25},(_,i)=>i+1));
 for(const i of cells){assert.equal(s.colors[i],s.colors[63-i]);assert.equal(s.colors[i],s.colors[(i&56)+7-i%8]);if(s.numbers[i])assert(!s.colors[i]);}
 for(let n=1;n<=8;n++){
  const last=s;s=R.draw(s,n);assert.equal(s.lastColor,n%2?'black':'white');assert.equal(s.lastFlips,s.flipped.length);
  assert.equal(s.maxFlips,Math.max(last.maxFlips,s.lastFlips));assert.equal(s.previousMaxFlips,last.maxFlips);
  assert.equal(s.totalHundredths,R.award(s.maxFlips)+s.reversalCount*R.sweepBonusHundredths);
  assert.equal(s.phase,n===8?'done':'playing');assert.equal(s.counts.black+s.counts.white,36+n);
  for(const c of ['black','white'])assert.equal(s.counts[c],s.colors.filter(v=>v===c).length);
  assert.equal(s.colors[s.placed[0]],s.lastColor);assert.equal(s.numbers[s.placed[0]],n);assert.equal(R.draw(s,n),null);
 }
 assert.equal(R.draw(s,9),null);
}
assert.equal(patterns.size,3);
// Every mold admits a real monochrome transition for either color. Record it on the
// triggering ball, preserve it through the next opponent placement, and finish all eight.
for(const [seed,target,ball,color] of [[417,50,4,'white'],[4971,50,3,'black'],[10939,90,5,'black'],[33028,90,6,'white'],[13973,150,4,'white'],[17945,150,3,'black']]){
 let s=R.create({rng:rng(seed),target});for(let n=1;n<=8;n++){
  s=R.draw(s,n);if(n===ball){assert.deepEqual(s.lastReversal,{ball,number:n,color});assert.equal(s.counts[color],36+n);}
  if(n>ball){assert(s.highestRole);assert(s.bonusEvents.some(e=>e.ball===ball));}
  if(n===ball+1){assert(s.counts.black&&s.counts.white);assert.equal(s.reversalThisMove,false);}
 }
}
{
 let {state,draws}=R.createDemo();const flips=[];for(const v of draws){state=R.draw(state,v);flips.push(state.lastFlips);}
 assert.deepEqual(flips,[3,0,6,0,0,6,2,3]);assert.equal(state.bonusEvents[0].ball,3);
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

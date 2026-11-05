'use strict';
const assert=require('node:assert/strict');
const R=require('../../assets/bingo-stick-rules.js');
const rng=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
const cells=Array.from({length:64},(_,i)=>i),base=R.create({rng:rng(302)});
const other=c=>c==='black'?'white':'black';
function fixture(direct,black){
 const colors=cells.map(i=>black.includes(i)?'black':'white');
 return {...base,numbers:cells.map(i=>direct.includes(i)?1:2),colors,counts:{black:black.length,white:64-black.length},firstColor:'black'};
}
function take(s,first,last){
 for(let n=first;n<=last;n++)s=R.draw(s,n);
 return s;
}
assert.equal(R.award(43),0);
assert.deepEqual([44,48,52,56,58,60,62,63,64].map(R.award),[10,20,30,50,100,200,500,1000,5000]);
assert.equal(R.award(64),R.payRows.at(-1).hundredths+R.sweepBonusHundredths);
assert.equal(R.sweepBonusHundredths,3000);
for(let n=1;n<=64;n++)assert(R.award(n)>=R.award(n-1));

// Each of the eight rays is bracketed, including the two diagonals.
{
 const dirs=[-9,-8,-7,-1,1,7,8,9],s=fixture([27],dirs.map(d=>27+2*d)),before=structuredClone(s);
 const next=R.draw(s,1);
 assert.deepEqual(next.placed,[27]);assert.deepEqual(new Set(next.flipped),new Set(dirs.map(d=>27+d)));
 assert.equal(next.counts.black,17);assert.equal(next.lastColor,'black');assert.deepEqual(s,before);
}
// Two direct matching squares bracket one another. Reverse-direction captures count once.
// 0 is black before the draw but is still a placement origin.
{
 const s=fixture([0,4],[0]),next=R.draw(s,1);
 assert.deepEqual(next.placed,[0,4]);assert.deepEqual(new Set(next.flipped),new Set([1,2,3]));
 assert.equal(next.counts.black,5);assert(!R.draw(next,1));assert(!R.draw(s,26));
}
// No row wrap, no cascade through a newly flipped square, and a non-capturing placement is accepted.
assert.deepEqual(R.draw(fixture([7],[9]),1).flipped,[]);
assert.deepEqual(R.draw(fixture([9],[11,26]),1).flipped,[10]);
assert.deepEqual(R.draw(fixture([3],[3]),1).placed,[3]);

// A real board sweeps only on the eighth draw. Recommendation and forecasts do not consume a draw.
{
 let s=R.create({rng:rng(3671)});assert.deepEqual(s.counts,{black:32,white:32});assert(!R.choose(s,'black'));
 for(let n=1;n<=5;n++){
  const expected=n%2?s.firstColor:other(s.firstColor);s=R.draw(s,n);
  assert.equal(s.lastColor,expected);assert.equal(s.totalHundredths,0);assert(!s.chosen);
 }
 assert.equal(s.phase,'thinking');assert.deepEqual(s.counts,{black:20,white:44});assert.equal(R.recommend(s),'white');
 assert(!R.draw(s,6));assert(!R.choose(s,'red'));
 const saved=structuredClone(s),black=R.choose(s,'black'),white=R.choose(s,'white');
 assert.equal(black.countChosen,20);assert(!R.choose(white,'black'));assert.deepEqual(s,saved);s=white;
 for(const [n,count] of [[6,52],[7,60],[8,64]]){
  s=R.draw(s,n);assert.equal(s.countChosen,count);assert.equal(s.lastColor,'white');assert.equal(s.highestRole,count===64);
 }
 assert.equal(s.phase,'done');assert.equal(s.totalHundredths,5000);assert(!R.draw(s,9));
}

// Symmetry, shuffled label multiplicities, and starting color are independent of the future roulette.
{
 const used=new Set(),opening=new Set(),random=rng(884);
 for(let t=0;t<500;t++){
  const s=R.create({rng:random});const freq=Array(26).fill(0);
  for(const n of s.numbers){assert(n>=1&&n<=25);freq[n]++;}
  assert.equal(freq.filter(n=>n===3).length,14);assert.equal(freq.filter(n=>n===2).length,11);
  assert.equal(s.counts.black+s.counts.white,64);assert(s.counts.black&&s.counts.white);
  assert(s.colors.every((c,i)=>c===s.colors[63-i]));used.add(s.patternName);opening.add(s.firstColor);
 }
 assert.equal(used.size,10);assert.equal(opening.size,2);
}

// Sample the production rules with independent uniformly shuffled number positions, so draws 1..8
// are exchangeable with a random order of eight distinct numbers. Optional: compare a player who
// also surveys the projected territory from all 20 possible sixth balls before choosing a color.
// node .github/tests/bingo-stick.cjs [rounds=100] [seed=720411] [target=90] [--lookahead|--fit]
// --fit samples both pattern families equally and reports their independent gross-return anchors.
const rounds=Number(process.argv[2]||100),seed=Number(process.argv[3]||720411),target=Number(process.argv[4]||90);
const ahead=process.argv.includes('--lookahead'),fit=process.argv.includes('--fit'),random=rng(seed),choiceRand=rng(seed+1);
function group(){return {n:0,sum:0,sq:0,sweeps:0};}
function tally(g,s){const v=s.totalHundredths;g.n++;g.sum+=v;g.sq+=v*v;g.sweeps+=Number(s.highestRole);}
const metrics={majority:group(),random:group(),...(ahead?{lookahead:group()}:{}),...(fit?{fine:group(),bold:group()}:{})};
for(let t=0;t<rounds;t++){
 let initialRoll=false;
 const generate=fit?()=>{const r=random();if(initialRoll)return r;initialRoll=true;return t%2===0?1-Number.EPSILON:0;}:random;
 const s=take(R.create({rng:generate,target}),1,5),major=R.recommend(s),minor=other(major);
 const majorEnd=take(R.choose(s,major),6,8),minorEnd=take(R.choose(s,minor),6,8);
 tally(metrics.majority,majorEnd);tally(metrics.random,choiceRand()<.5?majorEnd:minorEnd);
 if(fit)tally(t%2===0?metrics.fine:metrics.bold,majorEnd);
 if(ahead){
  const expected=color=>{const pick=R.choose(s,color);let sum=0;for(let n=6;n<=25;n++)sum+=R.draw(pick,n).countChosen;return sum;};
  tally(metrics.lookahead,expected(major)>=expected(minor)?majorEnd:minorEnd);
 }
}
for(const [name,g] of Object.entries(metrics)){
 const mean=g.sum/g.n,se=Math.sqrt((g.sq/g.n-mean*mean)/g.n);
 console.log(name,JSON.stringify({rounds:g.n,seed,target,returnPercent:mean,standardErrorPP:se,sweeps:g.sweeps,sweepPercent:100*g.sweeps/g.n}));
}

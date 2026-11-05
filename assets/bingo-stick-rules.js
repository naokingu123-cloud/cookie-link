/* Waffle Reversi. The eight numbered draws share one board and alternate colors. */
(function(root){
 'use strict';
 const cells=Array.from({length:64},(_,i)=>i);
 const payRows=[[2,20],[3,50],[4,100],[5,200],[6,400],[7,600],[8,1000],[9,1500],[10,2000],[11,3000],[12,4000],[13,5000]]
  .map(([count,hundredths])=>({count,hundredths}));
 const sweepBonusHundredths=3000,sugarFlips=8;
 function award(count){return payRows.findLast(row=>row.count<=count)?.hundredths||0;}
 // Each quarter contains nine stones. Mirroring it horizontally and vertically leaves 28 open squares.
 // Rates are measured with independent uniform draws, including both color orientations and reversal bonuses.
 const molds=[
  {name:'格子',quarter:'.B.B.BBBBB.W.B..',rate:44.59602},
  {name:'双菱',quarter:'B.BB.B.W.B...BBW',rate:94.78797},
  {name:'花窓',quarter:'B....B.W.BBB.BBB',rate:167.72330}
 ];
 function shuffle(values,rng){
  for(let i=values.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[values[i],values[j]]=[values[j],values[i]];}
  return values;
 }
 function create({rng=Math.random,target=90}={}){
  const rate=Math.max(50,Math.min(150,Number.isFinite(target)?target:90));
  const high=rate<=molds[1].rate?1:2,lo=molds[high-1],hi=molds[high];
  const mold=rng()<(rate-lo.rate)/(hi.rate-lo.rate)?hi:lo;
  const transpose=rng()<.5,invert=rng()<.5;
  const colors=cells.map(i=>{
   const x=Math.min(i%8,7-i%8),y=Math.min(i>>3,7-(i>>3));
   const stone=mold.quarter[transpose?4*x+y:4*y+x];
   return stone==='.'?null:((stone==='B')!==invert?'black':'white');
  });
  const numbers=Array(64).fill(null),open=shuffle(cells.filter(i=>!colors[i]),rng);
  for(let i=0;i<25;i++)numbers[open[i]]=i+1;
  const black=colors.filter(color=>color==='black').length;
  return {colors,numbers,counts:{black,white:36-black},phase:'playing',draws:[],target:rate,patternName:mold.name,
   placed:[],flipped:[],flipSteps:[],lastColor:null,lastFlips:0,previousMaxFlips:0,maxFlips:0,
   bonusEvents:[],lastReversal:null,reversalCount:0,reversalThisMove:false,highestRole:false,
   baseHundredths:0,bonusHundredths:0,totalHundredths:0};
 }
 const rays=cells.map(i=>{
  const directions=[];
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
   if(!dx&&!dy)continue;
   const ids=[];
   for(let x=i%8+dx,y=(i>>3)+dy;x>=0&&x<8&&y>=0&&y<8;x+=dx,y+=dy)ids.push(8*y+x);
   if(ids.length>=2)directions.push({dx,dy,ids});
  }
  return directions;
 });
 function draw(s,number){
  if(s.phase!=='playing'||!Number.isInteger(number)||number<1||number>25||s.draws.includes(number))return null;
  const origin=s.numbers.indexOf(number);
  if(origin<0||s.colors[origin])return null;
  const color=s.draws.length%2?'white':'black',other=color==='black'?'white':'black',flipSteps=[];
  // Read the snapshot before all flips. Either kind of open square breaks the bracket.
  for(const {dx,dy,ids} of rays[origin]){
   let n=0;while(n<ids.length&&s.colors[ids[n]]===other)n++;
   if(n&&n<ids.length&&s.colors[ids[n]]===color){
    for(let i=0;i<n;i++)flipSteps.push({id:ids[i],distance:i+1,dx,dy});
   }
  }
  flipSteps.sort((a,b)=>a.distance-b.distance);
  const flipped=flipSteps.map(step=>step.id),colors=s.colors.slice(),lastFlips=flipped.length;
  colors[origin]=color;for(const i of flipped)colors[i]=color;
  const counts={...s.counts,[color]:s.counts[color]+1+lastFlips,[other]:s.counts[other]-lastFlips};
  const draws=[...s.draws,number],maxFlips=Math.max(s.maxFlips,lastFlips),baseHundredths=award(maxFlips);
  const lastReversal=counts[other]===0&&s.counts[other]>0?{ball:draws.length,number,color}:null;
  const bonusEvents=lastReversal?[...s.bonusEvents,lastReversal]:s.bonusEvents,bonusHundredths=bonusEvents.length*sweepBonusHundredths;
  return {...s,colors,counts,draws,lastColor:color,placed:[origin],flipped,flipSteps,lastFlips,previousMaxFlips:s.maxFlips,maxFlips,
   bonusEvents,lastReversal,reversalCount:bonusEvents.length,reversalThisMove:!!lastReversal,highestRole:bonusEvents.length>0,
   baseHundredths,bonusHundredths,totalHundredths:baseHundredths+bonusHundredths,phase:draws.length===8?'done':'playing'};
 }
 function createDemo(){
  let seed=98689;
  const rng=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
  const state=create({rng});
  const draws=[1,2,3,4,5,6,7,8];return {state,draws,balls:draws};
 }
 const api={create,draw,createDemo,award,payRows,sweepBonusHundredths,sugarFlips};
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.BingoStickRules=api;
})(globalThis);

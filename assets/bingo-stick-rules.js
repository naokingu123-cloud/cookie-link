/* Waffle Reversi. The eight numbered draws share one board and alternate colors. */
(function(root){
 'use strict';
 const cells=Array.from({length:64},(_,i)=>i);
 const payRows=[[1,5],[2,10],[3,20],[4,50],[5,100],[6,200],[7,500],[8,1000],[9,1500],[10,2000],[11,3000],[12,4000],[13,5000]]
  .map(([count,hundredths])=>({count,hundredths}));
 const sweepBonusHundredths=3000,sugarFlips=8;
 function award(count){return payRows.findLast(row=>row.count<=count)?.hundredths||0;}
 // Each 4×4 quarter contains ten stones. The other 24 mirrored squares all carry numbers.
 // Every open square brackets at least one white stone on black's first move.
 // Keep the color orientation fixed. Each rate is a gross return estimate from uniform draws.
 const molds=[
  {rate:48.199033,patterns:[{name:'格子',quarter:'BBB.BW.W.B.BB.W.'}]},
  {rate:86.004445,patterns:[{name:'双菱',quarter:'B.B..BW..WBBB.BW'},{name:'市松',quarter:'W.W.BWW.BBB..WW.'}]},
  {rate:157.934716,patterns:[{name:'花窓',quarter:'..B.BWW..BBW.WBB'}]}
 ];
 function shuffle(values,rng){
  for(let i=values.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[values[i],values[j]]=[values[j],values[i]];}
  return values;
 }
 function create({rng=Math.random,target=90}={}){
  const rate=Math.max(50,Math.min(150,Number.isFinite(target)?target:90));
  const high=rate<=molds[1].rate?1:2,lo=molds[high-1],hi=molds[high];
  const group=rng()<(rate-lo.rate)/(hi.rate-lo.rate)?hi:lo;
  const mold=group.patterns[Math.floor(rng()*group.patterns.length)],transpose=rng()<.5;
  const colors=cells.map(i=>{
   const x=Math.min(i%8,7-i%8),y=Math.min(i>>3,7-(i>>3));
   const stone=mold.quarter[transpose?4*x+y:4*y+x];
   return stone==='.'?null:(stone==='B'?'black':'white');
  });
  const numbers=Array(64).fill(null),deck=shuffle(Array.from({length:25},(_,i)=>i+1),rng);
  for(const i of cells)if(!colors[i])numbers[i]=deck.pop();
  const black=colors.filter(color=>color==='black').length;
  return {colors,numbers,missingNumber:deck[0],counts:{black,white:40-black},phase:'playing',draws:[],target:rate,patternName:mold.name,
   placed:[],flipped:[],flipSteps:[],lastColor:null,lastFlips:0,previousMaxFlips:0,maxFlips:0,
   bonusEvents:[],lastReversal:null,reversalCount:0,reversalThisMove:false,highestRole:false,
   lastBaseHundredths:0,baseHundredths:0,bonusHundredths:0,totalHundredths:0};
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
  if(origin<0?number!==s.missingNumber:s.colors[origin])return null;
  const color=s.draws.length%2?'white':'black',other=color==='black'?'white':'black',flipSteps=[];
  // Read the snapshot before all flips. Unoccupied numbered squares break the bracket.
  for(const {dx,dy,ids} of rays[origin]||[]){
   let n=0;while(n<ids.length&&s.colors[ids[n]]===other)n++;
   if(n&&n<ids.length&&s.colors[ids[n]]===color){
    for(let i=0;i<n;i++)flipSteps.push({id:ids[i],distance:i+1,dx,dy});
   }
  }
  flipSteps.sort((a,b)=>a.distance-b.distance);
  const flipped=flipSteps.map(step=>step.id),colors=s.colors.slice(),lastFlips=flipped.length;
  if(origin>=0)colors[origin]=color;
  for(const i of flipped)colors[i]=color;
  const counts={...s.counts,[color]:s.counts[color]+Number(origin>=0)+lastFlips,[other]:s.counts[other]-lastFlips};
  const draws=[...s.draws,number],maxFlips=Math.max(s.maxFlips,lastFlips);
  const lastBaseHundredths=award(lastFlips),baseHundredths=s.baseHundredths+lastBaseHundredths;
  const lastReversal=counts[other]===0&&s.counts[other]>0?{ball:draws.length,number,color}:null;
  const bonusEvents=lastReversal?[...s.bonusEvents,lastReversal]:s.bonusEvents,bonusHundredths=bonusEvents.length*sweepBonusHundredths;
  return {...s,colors,counts,draws,lastColor:color,placed:origin>=0?[origin]:[],flipped,flipSteps,lastFlips,previousMaxFlips:s.maxFlips,maxFlips,
   bonusEvents,lastReversal,reversalCount:bonusEvents.length,reversalThisMove:!!lastReversal,highestRole:bonusEvents.length>0,
   lastBaseHundredths,baseHundredths,bonusHundredths,totalHundredths:baseHundredths+bonusHundredths,phase:draws.length===8?'done':'playing'};
 }
 function createDemo(){
  let seed=2654435761;
  const rng=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
  const state=create({rng});
  const draws=[7,1,24,6,25,17,13,22];return {state,draws,balls:draws};
 }
 const api={create,draw,createDemo,award,payRows,sweepBonusHundredths,sugarFlips};
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.BingoStickRules=api;
})(globalThis);

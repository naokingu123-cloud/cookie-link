/* Waffle Reversi. The eight numbered draws share one board and alternate colors. */
(function(root){
 'use strict';
 const cells=Array.from({length:64},(_,i)=>i);
 const payouts=[0,0,0,10,10,10,20,20,30,50,100,200,400,800];
 const payRows=payouts.slice(1).map((hundredths,i)=>({count:i+1,hundredths}));
 const sweepBonusHundredths=5000,sugarFlips=8;
 function award(count,grade=0){return count>0?payouts[Math.min(count+grade,payouts.length-1)]:0;}
 // Per-mold Monte Carlo calibration of ordinary return (%), reversal events and games
 // with at least one reversal. Multiple eliminations in a game each pay independently.
 // Holdout: 5M games at each 10-point setting, 50–150. 54,792 events in 53,854 games.
 // Replay all six sweep paths and sample live rules with node .github/tests/bingo-stick.cjs --balance.
 const samples=9500000;
 const molds=[
  {name:'小格子',quarter:'BBB.BBW.BB..BBW.',normal:43.45951,events:4261/samples,games:4174/samples},
  {name:'格子',quarter:'BBB.BBW.BBW.BB..',normal:42.51666,events:10458/samples,games:10205/samples},
  {name:'双菱',quarter:'B.BBB.WBB.WBB..B',normal:106.88139,events:19044/(2*samples),games:18928/(2*samples)},
  {name:'市松',quarter:'..WWWW..WBBWW.WB',normal:144.39896,events:0,games:0},
  {name:'花窓',quarter:'...BBWW.B.WWBWWB',normal:301.14573,events:1/samples,games:1/samples},
  {name:'蜜格子',quarter:'B.BBBBBBBBW.B...',normal:37.93827,events:55847/samples,games:54812/samples}
 ];
 // Each pair targets the same event frequency. The outer weights set ordinary RTP.
 // Selection is complete before numbering the board or drawing the first ball.
 const desiredEvents=.001;
 const pairs=[[0,1],[2,0],[3,5],[4,5]].map(([a,b])=>{
  const share=(desiredEvents-molds[a].events)/(molds[b].events-molds[a].events);
  return {a,b,share,normal:molds[a].normal*(1-share)+molds[b].normal*share};
 });
 function shuffle(values,rng){
  for(let i=values.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[values[i],values[j]]=[values[j],values[i]];}
  return values;
 }
 function targetRate(target){return Math.max(50,Math.min(150,Number.isFinite(target)?target:90));}
 function mixtureFor(target){
  let left=-1,right=1;
  for(let i=0;i<40;i++){
   const t=(left+right)/2, weights=pairs.map(pair=>Math.exp((pair.normal-100)*t));
   const total=weights.reduce((a,b)=>a+b,0);
   const normal=weights.reduce((sum,w,j)=>sum+w*pairs[j].normal,0)/total;
   if(normal<target-5)left=t;else right=t;
  }
  const shares=pairs.map(pair=>Math.exp((pair.normal-100)*(left+right)/2));
  const total=shares.reduce((a,b)=>a+b,0),weights=Array(molds.length).fill(0);
  pairs.forEach(({a,b,share},i)=>{
   weights[a]+=shares[i]*(1-share)/total;weights[b]+=shares[i]*share/total;
  });
  return weights;
 }
 const mixtures=Array.from({length:101},(_,i)=>mixtureFor(i+50));
 function weightsFor(rate){return Number.isInteger(rate)?mixtures[rate-50]:mixtureFor(rate);}
 function balance(target=90){
  const weights=weightsFor(targetRate(target));
  const mean=key=>molds.reduce((sum,m,i)=>sum+m[key]*weights[i],0);
  const normalPercent=mean('normal'),eventsPerGame=mean('events'),gameProbability=mean('games');
  const bonusPercent=eventsPerGame*sweepBonusHundredths;
  return {normalPercent,bonusPercent,totalPercent:normalPercent+bonusPercent,eventsPerGame,gameProbability,fairMultiplier:.05/eventsPerGame};
 }
 function create({rng=Math.random,target=90,patternName=null}={}){
  const rate=targetRate(target),weights=weightsFor(rate);
  let pick=rng(),mold=molds[molds.length-1];
  for(let i=0;i<molds.length;i++){
   pick-=weights[i];if(pick<0){mold=molds[i];break;}
  }
  if(patternName)mold=molds.find(m=>m.name===patternName)||mold;
  const transpose=rng()<.5;
  const colors=cells.map(i=>{
   const x=Math.min(i%8,7-i%8),y=Math.min(i>>3,7-(i>>3));
   const stone=mold.quarter[transpose?4*x+y:4*y+x];
   return stone==='.'?null:(stone==='B'?'black':'white');
  });
  const numbers=Array(64).fill(null),deck=shuffle(Array.from({length:25},(_,i)=>i+1),rng);
  for(const i of cells)if(!colors[i])numbers[i]=deck.pop();
  const black=colors.filter(color=>color==='black').length;
  return {colors,numbers,offBoardNumbers:deck.sort((a,b)=>a-b),counts:{black,white:44-black},phase:'playing',draws:[],target:rate,patternName:mold.name,
   grade:0,lastGrade:0,placed:[],flipped:[],flipSteps:[],lastColor:null,lastFlips:0,previousMaxFlips:0,maxFlips:0,
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
  if(origin<0?!s.offBoardNumbers.includes(number):s.colors[origin])return null;
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
  const lastGrade=s.grade,lastBaseHundredths=award(lastFlips,lastGrade),baseHundredths=s.baseHundredths+lastBaseHundredths;
  const lastReversal=counts[other]===0&&s.counts[other]>0?{ball:draws.length,number,color}:null;
  const bonusEvents=lastReversal?[...s.bonusEvents,lastReversal]:s.bonusEvents,bonusHundredths=bonusEvents.length*sweepBonusHundredths;
  return {...s,colors,counts,draws,lastGrade,grade:lastGrade+1,lastColor:color,placed:origin>=0?[origin]:[],flipped,flipSteps,lastFlips,previousMaxFlips:s.maxFlips,maxFlips,
   bonusEvents,lastReversal,reversalCount:bonusEvents.length,reversalThisMove:!!lastReversal,highestRole:bonusEvents.length>0,
   lastBaseHundredths,baseHundredths,bonusHundredths,totalHundredths:baseHundredths+bonusHundredths,phase:draws.length===8?'done':'playing'};
 }
 function createDemo(){
  let seed=2654435761;
  const rng=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
  const state=create({rng,patternName:'花窓'});
  const draws=[8,23,5,11,6,4,24,20];return {state,draws,balls:draws};
 }
 const api={create,draw,createDemo,award,balance,payRows,sweepBonusHundredths,sugarFlips};
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.BingoStickRules=api;
})(globalThis);

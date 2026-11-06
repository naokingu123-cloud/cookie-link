/* Waffle Reversi. The eight numbered draws share one board and alternate colors. */
(function(root){
 'use strict';
 const cells=Array.from({length:64},(_,i)=>i);
 const payouts=[0,10,20,30,40,50,60,70,80,90,100,120,140,150];
 const topRefills=[200,500,1000,2000,5000,7500,10000,15000];
 const payRows=payouts.slice(1).map((hundredths,i)=>({count:i+1,hundredths}));
 const sweepBonusHundredths=5000,sugarFlips=8;
 function award(count,rack=payouts){return rack[Math.min(count,13)];}
 function nextRack(rack,row,turn){
  const next=rack.slice();
  next.splice(row,1);next.push(topRefills[turn]);return next;
 }
 // A quarter reflects into the other three, with optional transposition. Each
 // board row and column has 2–4 labels. Only ordinary WIN enters the mold mix.
 // Uniform 25P8 draw orders; event counts include repeat eliminations. The
 // normal rates were measured on 4,500,000 independent games per mold.
 const drawOrders=43609104000;
 const molds=[
  {name:'千鳥',quarter:'BBB.BBB.BB.W..WW',normal:24.1573644,events:233424/drawOrders,games:233424/drawOrders},
  {name:'小花',quarter:'W.WW.WWWB.WWBB..',normal:26.3075933,events:14512/drawOrders,games:14512/drawOrders},
  {name:'飛石',quarter:'.WBBWW.BB.B.B.BB',normal:42.7488444,events:25920/drawOrders,games:25920/drawOrders},
  {name:'小紋',quarter:'BBB.BBW..B.WB.WB',normal:82.5075244,events:979056/drawOrders,games:967464/drawOrders},
  {name:'双葉',quarter:'.BWWBB.WBWW.B..W',normal:98.1627400,events:2880/drawOrders,games:2880/drawOrders},
  {name:'花菱',quarter:'.BBBBW.B.WWWB.W.',normal:126.4547733,events:171720/drawOrders,games:171720/drawOrders},
  {name:'風車',quarter:'WW...BWWBWW.B.BB',normal:166.5294800,events:8/drawOrders,games:8/drawOrders},
  {name:'花窓',quarter:'.BBBBWW.B.BW.W.W',normal:187.7290689,events:720/drawOrders,games:720/drawOrders},
  {name:'組市松',quarter:'WW..B.WWBWB..BWB',normal:164.4868044,events:4844/drawOrders,games:4844/drawOrders}
 ];
 function shuffle(values,rng){
  for(let i=values.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[values[i],values[j]]=[values[j],values[i]];}
  return values;
 }
 function targetRate(target){return Math.max(50,Math.min(150,Number.isFinite(target)?target:90));}
 function mixtureFor(target){
  let left=-1,right=1;
  for(let i=0;i<40;i++){
   const t=(left+right)/2, weights=molds.map(m=>Math.exp((m.normal-90)*t));
   const total=weights.reduce((a,b)=>a+b,0);
   const normal=weights.reduce((sum,w,j)=>sum+w*molds[j].normal,0)/total;
   if(normal<target-5)left=t;else right=t;
  }
  const raw=molds.map(m=>Math.exp((m.normal-90)*(left+right)/2));
  const total=raw.reduce((a,b)=>a+b,0);return raw.map(w=>w/total);
 }
 const mixtures=Array.from({length:101},(_,i)=>mixtureFor(i+50));
 function weightsFor(rate){return Number.isInteger(rate)?mixtures[rate-50]:mixtureFor(rate);}
 function balance(target=90){
  const weights=weightsFor(targetRate(target));
  const mean=key=>molds.reduce((sum,m,i)=>sum+m[key]*weights[i],0);
  const normalPercent=mean('normal'),eventsPerGame=mean('events'),gameProbability=mean('games');
  const bonusPercent=eventsPerGame*sweepBonusHundredths;
  return {normalPercent,bonusPercent,totalPercent:normalPercent+bonusPercent,eventsPerGame,gameProbability,fairMultiplier:eventsPerGame ? 0.05/eventsPerGame : null};
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
   rack:payouts.slice(),lastRack:payouts.slice(),lastKnockRow:null,grade:0,lastGrade:0,turnTotals:[],placed:[],flipped:[],flipSteps:[],lastColor:null,lastFlips:0,previousMaxFlips:0,maxFlips:0,
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
 function project(s,number){
  if(!Number.isInteger(number)||number<1||number>25||s.draws.includes(number))return null;
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
  const flipped=flipSteps.map(step=>step.id),lastFlips=flipped.length,placed=origin>=0?[origin]:[];
  const counts=origin<0?s.counts:{...s.counts,[color]:s.counts[color]+1+lastFlips,[other]:s.counts[other]-lastFlips};
  const lastReversal=counts[other]===0&&s.counts[other]>0?{ball:s.draws.length+1,number,color}:null;
  const lastBaseHundredths=award(lastFlips,s.rack);
  return {placed,flipSteps,flipped,counts,lastColor:color,lastFlips,lastBaseHundredths,lastReversal};
 }
 function draw(s,number){
  if(s.phase!=='playing')return null;
  const move=project(s,number);if(!move)return null;
  const {placed,flipped,lastFlips,lastColor,lastReversal,lastBaseHundredths}=move;
  const lastGrade=s.grade,lastRack=s.rack,lastKnockRow=lastFlips?Math.min(13,lastFlips):null;
  const rack=lastFlips?nextRack(lastRack,lastKnockRow,lastGrade):lastRack;
  const colors=placed.length?s.colors.slice():s.colors;
  if(placed.length)colors[placed[0]]=lastColor;
  for(const i of flipped)colors[i]=lastColor;
  const draws=[...s.draws,number],baseHundredths=s.baseHundredths+lastBaseHundredths;
  const bonusEvents=lastReversal?[...s.bonusEvents,lastReversal]:s.bonusEvents,bonusHundredths=bonusEvents.length*sweepBonusHundredths;
  const totalHundredths=baseHundredths+bonusHundredths;
  return {...s,...move,colors,draws,rack,lastRack,lastKnockRow,lastGrade,grade:lastGrade+Number(lastFlips>0),turnTotals:[...s.turnTotals,totalHundredths],previousMaxFlips:s.maxFlips,maxFlips:Math.max(s.maxFlips,lastFlips),
   bonusEvents,reversalCount:bonusEvents.length,reversalThisMove:!!lastReversal,highestRole:bonusEvents.length>0,
   baseHundredths,bonusHundredths,totalHundredths,phase:draws.length===8?'done':'playing'};
 }
 function createDemo(){
  let seed=2654435761;
  const rng=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
  const state=create({rng,patternName:'風車'});
  const draws=[8,7,22,5,6,3,19,15];return {state,draws,balls:draws};
 }
 const api={create,draw,project,createDemo,award,balance,payRows,topRefills,sweepBonusHundredths,sugarFlips};
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.BingoStickRules=api;
})(globalThis);

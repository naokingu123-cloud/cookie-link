/* Waffle Reversi. The eight numbered draws share one board and alternate colors. */
(function(root){
 'use strict';
 const cells=Array.from({length:64},(_,i)=>i);
 const payRows=[[1,0],[2,0],[3,20],[4,60],[5,120],[6,250],[7,600],[8,1200],[9,1800],[10,2400],[11,3600],[12,4800],[13,6000]]
  .map(([count,hundredths])=>({count,hundredths}));
 const sweepBonusHundredths=300000,sugarFlips=8; // 3000x reversal prize, common to every mold.
 function award(count){return payRows.findLast(row=>row.count<=count)?.hundredths||0;}
 // Each 4×4 quarter contains ten stones. The other 24 mirrored squares all carry numbers.
 // Every open square brackets at least one white stone on black's first move.
 // Keep the color orientation fixed. Rates include the rarity-weighted 3000x reversal prize.
 // Small lattice: 18 reversals / 1.5m; remaining molds had none in 0.7m each.
 const molds=[
  {rate:11.01,patterns:[{name:'小格子',quarter:'BB.BBW.BB..WBB..'}]},
  {rate:25.55,patterns:[{name:'格子',quarter:'BBB.BW.W.B.BB.W.'}]},
  {rate:64.50,patterns:[{name:'双菱',quarter:'B.B..BW..WBBB.BW'},{name:'市松',quarter:'W.W.BWW.BBB..WW.'}]},
  {rate:155.28,patterns:[{name:'花窓',quarter:'..B.BWW..BBW.WBB'}]}
 ];
 function shuffle(values,rng){
  for(let i=values.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[values[i],values[j]]=[values[j],values[i]];}
  return values;
 }
 // Maximum-entropy mixing keeps all five visual patterns available at every RTP
 // setting while matching the target by an expected-value-weighted mold choice.
 function mixtureFor(target){
  let left=-1,right=1;
  for(let i=0;i<38;i++){
   const t=(left+right)/2, raw=molds.map(m=>Math.exp((m.rate-80)*t));
   const total=raw.reduce((a,b)=>a+b,0);
   const mean=raw.reduce((sum,p,j)=>sum+p*molds[j].rate,0)/total;
   if(mean<target)left=t;else right=t;
  }
  const raw=molds.map(m=>Math.exp((m.rate-80)*(left+right)/2));
  const total=raw.reduce((a,b)=>a+b,0);
  return raw.map(w=>w/total);
 }
 const mixtures=Array.from({length:101},(_,i)=>mixtureFor(i+50));
 function create({rng=Math.random,target=90,patternName=null}={}){
  const rate=Math.max(50,Math.min(150,Number.isFinite(target)?target:90));
  const weights=Number.isInteger(rate)?mixtures[rate-50]:mixtureFor(rate);
  let pick=rng(),selected=molds[molds.length-1];
  for(let i=0;i<molds.length;i++){
   pick-=weights[i];if(pick<0){selected=molds[i];break;}
  }
  // Debug/reproducibility-only override; regular play always uses weighted selection.
  const group=patternName?molds.find(g=>g.patterns.some(p=>p.name===patternName))||selected:selected;
  const picked=group.patterns[Math.floor(rng()*group.patterns.length)];
  const mold=patternName?group.patterns.find(p=>p.name===patternName):picked,transpose=rng()<.5;
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
  const state=create({rng,patternName:'双菱'});
  const draws=[7,1,24,6,25,17,13,22];return {state,draws,balls:draws};
 }
 const api={create,draw,createDemo,award,payRows,sweepBonusHundredths,sugarFlips};
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.BingoStickRules=api;
})(globalThis);

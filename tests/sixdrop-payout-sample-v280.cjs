'use strict';
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {R}=require('./sixdrop-v247-fixture.cjs');
const coreSha256=crypto.createHash('sha256').update(fs.readFileSync('assets/sixdrop-progressive-core-v247.js')).digest('hex');
const initialSeed=Number(process.env.SIXDROP_SEED||2967841)>>>0,drawSeed=Number(process.env.SIXDROP_DRAW_SEED||5012773)>>>0;
const N=Number(process.env.SIXDROP_SAMPLES||2000),blockSize=200;
for(const rate of (process.argv.length>2?process.argv.slice(2).map(Number):[50,90,100,150])){
 let board=initialSeed,draw=drawSeed,carry=null,total=0,squares=0,normal=0,bonus=0,winning=0,allClears=0,removed=0,blockSum=0,reference=0,maxBank=0;
 const boardRandom=()=>((board=(Math.imul(board,1664525)+1013904223)>>>0)/4294967296),drawRandom=()=>((draw=(Math.imul(draw,22695477)+1)>>>0)/4294967296);
 const blockMeans=[],counts={line:{},triangle:{},hexagon:{}},started=Date.now();
 for(let game=0;game<N;game++){
  let state=R.newGame({seed:boardRandom()*4294967296>>>0,rate,bet:100,carry,rulesRevision:280});
  const numbers=Array.from({length:25},(_,index)=>index+1);
  for(let index=24;index>0;index--){const other=Math.floor(drawRandom()*(index+1));[numbers[index],numbers[other]]=[numbers[other],numbers[index]];}
  let offset=0;for(const size of R.BATCH_SIZES){state=R.hitBatch(state,numbers.slice(offset,offset+size)).state;offset+=size;}
  const win=R.totalMedals(state),oldWin=R.totalMedals({...state,rulesRevision:278});
  assert.equal(win>0,oldWin>0,'the paired old payout retains the same carry/reset decision');
  total+=win;reference+=oldWin;squares+=win*win;blockSum+=win;normal+=win-state.bonusMedals;bonus+=state.bonusMedals;winning+=Number(win>0);allClears+=state.allClears;removed+=state.roundRemoved;
  for(const type of Object.keys(counts))counts[type][state.counts[type]]=(counts[type][state.counts[type]]||0)+1;
  carry=R.carryOut(state);maxBank=Math.max(maxBank,carry.bankUnits);
  if((game+1)%blockSize===0){blockMeans.push(blockSum/blockSize);blockSum=0;}
 }
 const mean=total/N,blockMean=blockMeans.reduce((sum,value)=>sum+value,0)/Math.max(1,blockMeans.length);
 const blockSE=blockMeans.length>1?Math.sqrt(blockMeans.reduce((sum,value)=>sum+(value-blockMean)**2,0)/(blockMeans.length-1)/blockMeans.length):null;
 console.log(JSON.stringify({rate,N,seed:initialSeed,drawSeed,bet:100,rulesRevision:280,coreSha256,batchSizes:R.BATCH_SIZES,payoutTable:R.ROLE_TOTALS_V280,supportProbability:R.supportProbability(rate,280),geometry:'browser CookieUpgradePatch',scope:'Independent board and uniform 8/25 draw streams; continuous positive-game carry; own zero resets; shared Sugar/JPC excluded; no retuning to validation samples',actual:mean,reference278Actual:reference/N,pairedPayoutDelta:(total-reference)/N,naiveSE:Math.sqrt(Math.max(0,squares/N-mean*mean)/N),blockSize,blockSE,blockMeans,normal:normal/N,bonus:bonus/N,winning:winning/N,allClear:allClears/N,removed:removed/N,maximumCommittedBank:maxBank/100,counts,ms:Date.now()-started}));
}

'use strict';
const fs=require('node:fs'),crypto=require('node:crypto');
const arg=(name,fallback)=>process.argv.find(v=>v.startsWith('--'+name+'='))?.slice(name.length+3)??fallback;
const N=Number(arg('samples','4096')),blockSize=Number(arg('block-size','256')),seed=Number(arg('seed','876193'))>>>0,drawSeed=Number(arg('draw-seed','692317'))>>>0;
const rates=String(arg('rates','50,75,90,100,125,150')).split(',').map(Number),bet=Number(arg('bet','100'));
const profile=arg('bias',''),cluster=arg('cluster',''),fast=arg('geometry','cached')==='cached';
if(!(Number.isSafeInteger(N)&&N>0&&Number.isSafeInteger(blockSize)&&blockSize>0&&N%blockSize===0&&rates.every(x=>x>=50&&x<=150)))throw Error('Invalid sample configuration');
const {G}=require(fast?'./sixdrop-v284-geometry.cjs':'../tests/sixdrop-v247-fixture.cjs');
const core=fs.readFileSync('assets/sixdrop-progressive-core-v247.js','utf8');let source=core;
if(profile!==''){
 if(!(Number(profile)>=0))throw Error('Invalid research placement bias');
 const old='const bias=numberPlacementBias(target,state),scores=';if(source.split(old).length!==2)throw Error('Research override mismatch');
 source=source.replace(old,'const bias='+Number(profile)+',scores=');
}
if(cluster!==''){
 if(!Number.isFinite(Number(cluster))||Number(cluster)<0||Number(cluster)>1)throw Error('Invalid research cohesion');
 const old='colorCohesion(target,state.bet)';if(source.split(old).length!==2)throw Error('Research cohesion override mismatch');
 source=source.replace(old,String(Number(cluster)));
}
new Function(source)();const R=globalThis.SweetsSixDropV247.create(G),sha=s=>crypto.createHash('sha256').update(s).digest('hex');
function stat(values){const mean=values.reduce((s,n)=>s+n,0)/values.length;return {mean,se:values.length>1?Math.sqrt(values.reduce((s,n)=>s+(n-mean)**2,0)/(values.length-1)/values.length):null};}
for(const rate of rates){
 let board=seed,draw=drawSeed,carry=null,normal=0,bonus=0,total=0,winning=0,allClears=0,removed=0,block=0,streak=0,maxStreak=0,maxBank=0,maxWin=0,terminal=0;
 const blocks=[],counts={line:{},triangle:{},hexagon:{}},started=Date.now();
 for(let game=0;game<N;game++){
  board=(Math.imul(board,1664525)+1013904223)>>>0;
  let state=R.newGame({seed:board,rate,bet,carry,rulesRevision:R.FIXED_PALETTE_REVISION});
  const numbers=Array.from({length:25},(_,i)=>i+1);
  for(let i=24;i>0;i--){draw=(Math.imul(draw,22695477)+1)>>>0;const j=Math.floor(draw/4294967296*(i+1));[numbers[i],numbers[j]]=[numbers[j],numbers[i]];}
  for(const number of numbers.slice(0,8))state=R.hit(state,number).state;
  const win=R.totalMedals(state);total+=win;block+=win;normal+=win-state.bonusMedals;bonus+=state.bonusMedals;winning+=+(win>0);allClears+=state.allClears;removed+=state.roundRemoved;
  carry=R.carryOut(state);streak=win>0?streak+1:0;maxStreak=Math.max(maxStreak,streak);maxBank=Math.max(maxBank,carry.bankUnits);maxWin=Math.max(maxWin,win);terminal=state.removedTotal;
  for(const role of Object.keys(counts))counts[role][state.counts[role]]=(counts[role][state.counts[role]]||0)+1;
  if((game+1)%blockSize===0){blocks.push(block/blockSize/bet*100);block=0;}
 }
 const observed=total/N/bet*100,se=stat(blocks).se;
 console.log(JSON.stringify({revision:R.FIXED_PALETTE_REVISION,rate,bet,games:N,seed,drawSeed,bias:profile!==''?Number(profile):R.numberPlacementBias(rate,R.FIXED_PALETTE_REVISION),cohesion:cluster!==''?Number(cluster):R.colorCohesion(rate,bet),researchOverride:profile!==''||cluster!==''?{numberPlacementBias:profile!==''?Number(profile):null,colorCohesion:cluster!==''?Number(cluster):null}:null,geometry:fast?'exact cached collision paths':'unmodified production geometry',coreSha256:sha(core),executedCoreSha256:sha(source),rtp:observed,normalRtp:normal/N/bet*100,allClearRtp:bonus/N/bet*100,winningRate:winning/N,allClearsPerGame:allClears/N,removedPerGame:removed/N,maxConsecutivePositiveGames:maxStreak,maximumCommittedBank:maxBank/100,maxWin,terminalCarry:carry,terminalRemovedTotal:terminal,blockSize,blockMeans:blocks,blockSE:se,diagnostic95Percent:se==null?null:[observed-1.96*se,observed+1.96*se],roleCounts:counts,elapsedMs:Date.now()-started,scope:'Uniform independent 8-of-25 draw stream, actual revision285 rules, continuous carry across all games; own zero WIN resets. Direct Six Drop payouts only; shared Sugar/JPC and adaptive feedback excluded. Block errors are empirical diagnostics, not exact target guarantees.'}));
}

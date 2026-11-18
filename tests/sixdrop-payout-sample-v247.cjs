'use strict';
const {R}=require('./sixdrop-v247-fixture.cjs');
const initialSeed=Number(process.env.SIXDROP_SEED||876193)>>>0;
const drawSeed=Number(process.env.SIXDROP_DRAW_SEED||692317)>>>0;
const N=Number(process.env.SIXDROP_SAMPLES||2000),blockSize=200;
for(const rate of (process.argv.length>2?process.argv.slice(2).map(Number):[50,90,150])){
 let x=initialSeed,d=drawSeed;
 const rng=()=>((x=(Math.imul(x,1664525)+1013904223)>>>0)/4294967296),dr=()=>((d=(Math.imul(d,22695477)+1)>>>0)/4294967296);
 let sum=0,sq=0,win=0,all=0,normal=0,bonus=0,mob=0,removed=0,carry=null,t=Date.now(),blockSum=0;
 const blockMeans=[];
 for(let i=0;i<N;i++){
  let s=R.newGame({seed:rng()*4294967296>>>0,rate,bet:100,carry});
  mob+=s.grid.flatMap((row,r)=>row.map((v,c)=>v?.number!=null&&R.mobility(s.grid,r,c)>0)).filter(Boolean).length;
  const ns=Array.from({length:25},(_,j)=>j+1);
  for(let j=24;j>0;j--){const k=Math.floor(dr()*(j+1));[ns[j],ns[k]]=[ns[k],ns[j]];}
  for(const n of ns.slice(0,8))s=R.hit(s,n).state;
  const w=R.totalMedals(s);sum+=w;sq+=w*w;blockSum+=w;if(w)win++;
  normal+=s.normalHundredths;bonus+=s.bonusMedals;all+=s.allClears;removed+=s.roundRemoved;carry=R.carryOut(s);
  if((i+1)%blockSize===0){blockMeans.push(blockSum/blockSize);blockSum=0;}
 }
 const blockMean=blockMeans.reduce((a,b)=>a+b,0)/Math.max(1,blockMeans.length);
 const blockSE=blockMeans.length>1?Math.sqrt(blockMeans.reduce((a,b)=>a+(b-blockMean)**2,0)/(blockMeans.length-1)/blockMeans.length):null;
 console.log(JSON.stringify({rate,N,seed:initialSeed,drawSeed,rulesRevision:R.REVISION,geometry:'browser CookieUpgradePatch',scope:'Independent board and 8/25 draw RNG streams; direct Six Drop payouts, positive-game carry retained, shared Sugar/JPC excluded',actual:sum/N,se:Math.sqrt((sq/N-(sum/N)**2)/N),blockSize,blockSE,blockMeans,normal:normal/N,bonus:bonus/N,winning:win/N,allClear:all/N,removed:removed/N,mobility:mob/N,ms:Date.now()-t}));
}

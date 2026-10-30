// Production-rule Monte Carlo. Equal BET, uniform 8/25 draws, ordinary 5-colour mode.
// Direct game payouts only: the shared Wonder Sugar/JPC is reported separately, not valued here.
// node .github/tests/economy_balance.cjs canyon|cookie [rounds=50000] [seed=834917]
const fs=require('fs'),assert=require('assert');
const html=fs.readFileSync('index.html','utf8');
const cookieSource=html.slice(html.indexOf('const SPECIAL_RATE='),html.indexOf('const elixirGlyphs='));
const canyonSource=fs.readFileSync('assets/choco-dig.js','utf8').split('const chocoSprites=')[0];
const {Engine,ChocoDigEngine,groups}=new Function(cookieSource+canyonSource+';return {Engine,ChocoDigEngine,groups};')();
const kind=process.argv[2]||'canyon',N=+(process.argv[3]||50000),initialSeed=+(process.argv[4]||834917);
assert(['canyon','cookie'].includes(kind));let seed=initialSeed;
const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const e=new (kind==='canyon'?ChocoDigEngine:Engine)({random,colorCount:5,onEvent:ev=>{if(ev.phase==='error')throw Error(ev.message);}});e.wait=async()=>true;
const thresholds=[10,20,30,50,75,100,150,200,300,400,500,600,700,800,900,1000],reached=thresholds.map(()=>0),hist={},collected={},oreReturn={},blocks=[];
let sum=0,bonus=0,winning=0,episodes=0,episodeDepth=0,maxDepth=0,clears=0,sugars=0,blockSum=0;
(async()=>{
 for(let round=0;round<N;round++){
  if(kind==='cookie')e.reset();
  const numbers=Array.from({length:25},(_,i)=>i+1);for(let j=24;j>0;j--){const k=Math.floor(random()*(j+1));[numbers[k],numbers[j]]=[numbers[j],numbers[k]];}
  let gain;
  if(kind==='canyon'){
   const plan=e.plan(numbers.slice(0,8));gain=plan.gain/100;
   bonus+=(plan.gain-plan.prizes.reduce((n,item)=>n+item.gain,0))/100;
   for(const p of plan.collected){const k=p.tile.item==='ore'?p.tile.ore:p.tile.item;collected[k]=(collected[k]||0)+1;}
   for(const p of plan.prizes){const k=p.tile.ore||p.tile.item;oreReturn[k]=(oreReturn[k]||0)+p.gain/100;}
   sugars+=plan.sugarCount;maxDepth=Math.max(maxDepth,plan.depth);episodeDepth=Math.max(episodeDepth,plan.depth);
   e.strata=plan.grid;for(const key of ['seed','uid','depth','nextSugar','fruitCount','fruitState','bonusResolvedDepth'])e[key]=plan[key];
   e.phase='complete';e.continueDepth=gain>0;e.reset();
   if(!gain){episodes++;thresholds.forEach((m,i)=>{if(episodeDepth>=m)reached[i]++;});episodeDepth=0;}
  }else{
   e.running=true;e.queue=[numbers.slice(0,3),numbers.slice(3,5),...numbers.slice(5,8).map(n=>[n])];e.accepted=8;await e.drain();assert.equal(e.processed,8);gain=e.totalHundredths/100;
   clears+=e.allClears;sugars+=e.roundSteps;hist[e.maxLink]=(hist[e.maxLink]||0)+1;
  }
  sum+=gain;blockSum+=gain;if(gain)winning++;
  if((round+1)%1000===0){blocks.push(blockSum/1000);blockSum=0;}
 }
 const mean=blocks.reduce((a,b)=>a+b,0)/blocks.length,se=blocks.length>1?Math.sqrt(blocks.reduce((a,b)=>a+(b-mean)**2,0)/(blocks.length-1)/blocks.length):null;
 const wilson=(k,n)=>{const z=1.96,p=k/n,d=1+z*z/n,center=(p+z*z/(2*n))/d,half=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d;return [center-half,center+half];};
 console.log(JSON.stringify({kind,rounds:N,seed:initialSeed,scope:'Direct game payouts; excludes shared Wonder Sugar/JPC',rtp:sum/N,rtp95:se===null?null:[sum/N-1.96*se,sum/N+1.96*se],blockMeans:blocks,winningRate:winning/N,sugarsPerRound:sugars/N,...(kind==='canyon'?{bonusReturn:bonus/N,collected,oreReturn,completedExpeditions:episodes,maxDepth,unfinishedExpeditionDepth:episodeDepth,reach:thresholds.map((depth,i)=>({depth,count:reached[i],rate:reached[i]/episodes,ci95:wilson(reached[i],episodes)}))}:{allClears:clears,maxLinkHistogram:hist})},null,2));
})();

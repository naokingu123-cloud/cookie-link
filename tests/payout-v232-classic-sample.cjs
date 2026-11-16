const fs=require('fs'),vm=require('vm');
// Exercise both browser transformations: CookieUpgradePatch and the Six
// top-row refill patch in index.html, in the same order as the live loader.
// Ball RNG is separate from board RNG, so no generator can anticipate a draw.
function load({profile={}}={}){
 const ctx={window:{},console:{info(){},warn(){}}};vm.runInNewContext(fs.readFileSync('assets/cookie-upgrade-patches.js','utf8'),ctx);
 let src=ctx.window.CookieUpgradePatch.patch(fs.readFileSync('optimized/app-01.js','utf8'));
 const html=fs.readFileSync('index.html','utf8'),patchStart=html.indexOf('  const sixOldTopGuard='),patchEnd=html.indexOf('  const end=game.lastIndexOf(',patchStart);
 if(patchStart<0||patchEnd<0)throw Error('Six browser post-patch source is missing');
 const scope={game:src};vm.runInNewContext(html.slice(patchStart,patchEnd),scope);src=scope.game;
 const cookie=src.slice(src.indexOf('const SPECIAL_RATE='),src.indexOf('const elixirGlyphs='));
 const choco=src.slice(src.indexOf('const CHOCO_SAVE_KEY='),src.indexOf('const chocoSprites='));
 const six=src.slice(src.indexOf('const SIX_ROWS=10'),src.indexOf('const CandyCarnivalEngine=SixBallCandyEngine;')+'const CandyCarnivalEngine=SixBallCandyEngine;'.length);
 const extra=Object.keys(profile).length?'const originalProfile=debugEconomyProfile;debugEconomyProfile=()=>({...originalProfile(),...'+JSON.stringify(profile)+'});':'';
 return new Function('const motionReduced=false;'+cookie+choco+six+';'+extra+';return {Engine,ChocoDigEngine,SixBallCandyEngine,groups,chocoFillRows,chocoGroups,chocoOreRates,CHOCO_INITIAL_PATTERNS,debugCookieColorOrder,sixPickChanceRound,sixPickSugarRound,sixPickGapTemplate,sixMakeBoard,sixPlan,sixRoundClearBonus,sixRefillBoard,sixDrop,sixClone,sixResolve,SIX_START_GAP_TEMPLATES,SIX_NUMBER_CELLS,debugEconomyProfile,setRate:v=>debugPayoutTarget=v};')();
}
function sixRound(q,random,nums){
 const chance=q.sixPickChanceRound(random),sugar=q.sixPickSugarRound(random),drawn=new Set(),clearedRounds=new Set();let r=1,g,uid=0,collected=false,initialTop=0,gain=0;
 function board(){const b=q.sixMakeBoard(10,chance===r?3:4,random,uid,{holes:q.sixPickGapTemplate(random,r)});g=b.grid;uid=b.lastId;if(!collected&&r===sugar){const a=g.flat().filter(t=>t&&t.number==null);a[Math.floor(random()*a.length)].sugar=true;}initialTop=g[0].filter(Boolean).length;}
 board();let pos=0;
 for(const n of [3,2,1,1,1]){const batch=nums.slice(pos,pos+n),present=new Set(g.flat().filter(t=>t?.number!=null).map(t=>t.number)),miss=batch.some(n=>!present.has(n));batch.forEach(n=>drawn.add(n));const p=q.sixPlan(g,batch);pos+=n;g=p.grid;gain+=p.gain/100;collected||=p.sugarAward;if(p.advance){if(!clearedRounds.has(r)){gain+=q.sixRoundClearBonus(r)/100;clearedRounds.add(r);}if(r<5){r++;board();}}else if(miss||g[0].filter(Boolean).length<initialTop){const f=q.sixRefillBoard(g,chance===r?3:4,random,uid,drawn);g=f.grid;uid=f.lastId;}}
 return {gain,collected,grid:g,roundIndex:r,uid};
}
async function sample(kind,N,target,initialSeed=619218,options={}){
 const q=load(options);q.setRate(target);let seed=initialSeed,drawSeed=(initialSeed^0x9e3779b9)>>>0;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296),drawRandom=()=>((drawSeed=(Math.imul(drawSeed,1664525)+1013904223)>>>0)/4294967296);
 const e=kind==='six'?null:new (kind==='canyon'?q.ChocoDigEngine:q.Engine)({random,colorCount:5,onEvent:ev=>{if(ev.phase==='error')throw Error(ev.message);}});if(e)e.wait=async()=>true;
 let sum=0,sq=0,winning=0,bonus=0,sugars=0,forecast=0,wild=0,ores=0,blockSum=0;const blockMeans=[];
 const started=Date.now();
 for(let round=0;round<N;round++){
  if(kind==='cookie')e.reset();
  const nums=Array.from({length:25},(_,i)=>i+1);for(let i=24;i>0;i--){const j=Math.floor(drawRandom()*(i+1));[nums[i],nums[j]]=[nums[j],nums[i]];}
  let gain=0;
  if(kind==='canyon'){
   ores+=e.strata.flat().filter(t=>t?.item==='ore').length;
   const plan=e.plan(nums.slice(0,8));gain=plan.gain/100;bonus+=(plan.gain-plan.prizes.reduce((n,p)=>n+p.gain,0))/100;sugars+=plan.sugarCount;
   e.strata=plan.grid;for(const k of ['seed','uid','depth','nextSugar','fruitCount','fruitState','bonusResolvedDepth'])e[k]=plan[k];e.phase='complete';e.continueDepth=gain>0;e.reset();
  }else if(kind==='cookie'){
   forecast+=e.hammerForecast?.filter(Boolean).length||0;wild+=e.board.flat().filter(t=>t?.wild).length;
   e.running=true;e.queue=[nums.slice(0,3),nums.slice(3,5),...nums.slice(5,8).map(n=>[n])];e.accepted=8;await e.drain();if(e.processed!==8)throw Error('Cookie processed '+e.processed);gain=e.totalHundredths/100;sugars+=e.roundSteps;
  }else{
   const result=sixRound(q,random,nums);gain=result.gain;sugars+=result.collected?1:0;
  }
  sum+=gain;sq+=gain*gain;blockSum+=gain;if(gain)winning++;if((round+1)%200===0){blockMeans.push(blockSum/200*100);blockSum=0;}
 }
 const blockMean=blockMeans.reduce((a,b)=>a+b,0)/Math.max(1,blockMeans.length),blockSE=blockMeans.length>1?Math.sqrt(blockMeans.reduce((a,b)=>a+(b-blockMean)**2,0)/(blockMeans.length-1)/blockMeans.length):null;
 const rate=sum/N*100,se=Math.sqrt((sq/N-(sum/N)**2)/N)*100;
 // Six starts afresh each game. Cookie/Canyon carry state across games, so
 // their per-round SE alone does not establish an independence-based CI.
 const approxCi95=kind==='six'?[rate-1.96*se,rate+1.96*se]:null;
 return {kind,N,target,seed:initialSeed,scope:'Uniform independent 8/25 draw stream; direct game payouts only, shared Sugar/JPC excluded',rate,se,approxCi95,blockSE,blockMeans,winning:winning/N,bonus:bonus/N*100,sugars:sugars/N,initialForecast:forecast/N,initialWild:wild/N,initialOres:ores/N,milliseconds:Date.now()-started};
}
module.exports={load,sample,sixRound};
if(require.main===module){const options=process.argv[6]?JSON.parse(process.argv[6]):{};sample(process.argv[2]||'canyon',+(process.argv[3]||1000),+(process.argv[4]||90),+(process.argv[5]||619218),options).then(v=>console.log(JSON.stringify(v)));}

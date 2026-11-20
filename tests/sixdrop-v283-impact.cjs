'use strict';
// Research only: execute actual old/new rules, rather than revalue a histogram
// after a change that also changes gravity, refill timing and carry history.
const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {G}=require('./sixdrop-v247-fixture.cjs');
const source=fs.readFileSync('assets/sixdrop-progressive-core-v247.js','utf8');
const sha=text=>crypto.createHash('sha256').update(text).digest('hex');
const argument=(name,fallback)=>process.argv.find(value=>value.startsWith('--'+name+'='))?.slice(name.length+3)??fallback;
const N=Number(argument('samples','256')),blockSize=Number(argument('block-size','64'));
const rates=String(argument('rates','50,90,100,150')).split(',').map(Number);
const boardSeed=Number(argument('board-seed','876193'))>>>0,drawSeed=Number(argument('draw-seed','692317'))>>>0;
const modes=String(argument('modes','production,unassisted')).split(',');
assert(Number.isSafeInteger(N)&&N>0&&N<=100000);assert(Number.isSafeInteger(blockSize)&&blockSize>0&&N%blockSize===0);
assert(rates.every(rate=>Number.isFinite(rate)&&rate>=50&&rate<=150));assert(modes.every(mode=>['production','unassisted'].includes(mode)));
const noAssistChanges=[
 ['const prepared=supportProbability(target,state),templates=G.gapTemplates||[];','const prepared=0,templates=[];'],
 ['targets.sort((a,b)=>(mobility(grid,...a)-mobility(grid,...b))*(prefer?-1:1));','/* Research variant: retain the already shuffled target order. */']
];
function rules(mode){
 let code=source;
 if(mode==='unassisted')for(const [from,to]of noAssistChanges){assert.equal(code.split(from).length,2,'the research-only assistance override has one exact site');code=code.replace(from,to);}
 const context={};vm.runInNewContext(code,context);return {R:context.SweetsSixDropV247.create(G),variantSha256:sha(code)};
}
function statistics(values){
 const mean=values.reduce((sum,x)=>sum+x,0)/values.length;
 return {mean,standardError:values.length>1?Math.sqrt(values.reduce((sum,x)=>sum+(x-mean)**2,0)/(values.length-1)/values.length):null};
}
function run(mode,revision,rate){
 const {R,variantSha256}=rules(mode);let board=boardSeed,draw=drawSeed,carry=null;
 const boardRandom=()=>((board=(Math.imul(board,1664525)+1013904223)>>>0)/4294967296);
 const drawRandom=()=>((draw=(Math.imul(draw,22695477)+1)>>>0)/4294967296);
 let total=0,normal=0,bonus=0,winning=0,allClears=0,allClearGames=0,removed=0,primaryRemoved=0,hitBalls=0,maxBank=0,streak=0,maxStreak=0,blockTotal=0;
 const blocks=[],counts={line:{},triangle:{},hexagon:{}},started=Date.now();
 for(let game=0;game<N;game++){
  let state=R.newGame({seed:boardRandom()*4294967296>>>0,rate,bet:100,carry,rulesRevision:revision});
  const numbers=Array.from({length:25},(_,i)=>i+1);
  for(let i=24;i>0;i--){const j=Math.floor(drawRandom()*(i+1));[numbers[i],numbers[j]]=[numbers[j],numbers[i]];}
  let offset=0;
  while(offset<8){
   const size=R.batchSize(offset,state),batch=numbers.slice(offset,offset+size),set=new Set(batch),hitNumbers=new Set(),area=new Set();
   for(let r=0;r<state.grid.length;r++)for(let c=0;c<state.grid[r].length;c++)if(set.has(state.grid[r][c]?.number)){
    hitNumbers.add(state.grid[r][c].number);area.add(r*16+c);
    if(revision>=R.SINGLE_REVISION)for(const [y,x]of G.neighbors(r,c,10))if(state.grid[y]?.[x])area.add(y*16+x);
   }
   hitBalls+=hitNumbers.size;primaryRemoved+=area.size;
   const plan=R.isGrouped(state)?R.hitBatch(state,batch):R.hit(state,batch[0]);assert(plan);state=plan.state;offset+=size;
  }
  const win=R.totalMedals(state);total+=win;blockTotal+=win;normal+=win-state.bonusMedals;bonus+=state.bonusMedals;
  winning+=Number(win>0);allClears+=state.allClears;allClearGames+=Number(state.allClears>0);removed+=state.roundRemoved;
  streak=win>0?streak+1:0;maxStreak=Math.max(maxStreak,streak);
  for(const role of Object.keys(counts))counts[role][state.counts[role]]=(counts[role][state.counts[role]]||0)+1;
  carry=R.carryOut(state);maxBank=Math.max(maxBank,carry.bankUnits);
  if((game+1)%blockSize===0){blocks.push(blockTotal/blockSize);blockTotal=0;}
 }
 const run={mode,revision,rate,games:N,bet:100,boardSeed,drawSeed,variantSha256,actualPercent:total/N,ordinaryPercent:normal/N,allClearPercent:bonus/N,winRate:winning/N,zeroWinGames:N-winning,allClearsPerGame:allClears/N,allClearGameRate:allClearGames/N,removedPerGame:removed/N,primaryRemovedPerGame:primaryRemoved/N,hitBallRate:hitBalls/(N*8),maxConsecutivePositiveGames:maxStreak,maximumCommittedBank:maxBank/100,terminalCarry:carry,blockSize,blockMeans:blocks,empiricalBlockSE:statistics(blocks).standardError,roleCounts:counts,elapsedMs:Date.now()-started};
 process.stderr.write('SIXDROP_V283_IMPACT_RUN '+JSON.stringify({mode,revision,rate,games:N,actualPercent:run.actualPercent,ordinaryPercent:run.ordinaryPercent,allClearPercent:run.allClearPercent,winRate:run.winRate,allClearsPerGame:run.allClearsPerGame,removedPerGame:run.removedPerGame,ms:run.elapsedMs})+'\n');
 return run;
}
const runs=[];for(const mode of modes)for(const rate of rates)for(const revision of [280,283])runs.push(run(mode,revision,rate));
const comparisons=[];
for(const mode of modes)for(const rate of rates){
 const old=runs.find(row=>row.mode===mode&&row.rate===rate&&row.revision===280),next=runs.find(row=>row.mode===mode&&row.rate===rate&&row.revision===283);
 const differences=next.blockMeans.map((value,index)=>value-old.blockMeans[index]);
 comparisons.push({mode,rate,gamesPerRevision:N,previousPercent:old.actualPercent,newPercent:next.actualPercent,differencePercentagePoints:next.actualPercent-old.actualPercent,ordinaryDifference:next.ordinaryPercent-old.ordinaryPercent,allClearDifference:next.allClearPercent-old.allClearPercent,pairedBlockDifferences:differences,empiricalPairedBlockSE:statistics(differences).standardError});
}
const output={version:283,coreSha256:sha(source),method:'Paired board-seed and uniform 8-of-25 draw RNG streams. Each mode/revision retains its own continuous positive-game carry; only an actual completed own-zero game resets it. New board/removal trajectories are fully simulated, not revalued from old role histograms.',scope:'Direct Six Drop role and all-clear payouts at BET 100. Shared Sugar/JPC, physical roulette bias and adaptive payout feedback are excluded.',sampleCaution:'These are deterministic pilot observations, not calibrated target guarantees. Block errors are empirical diagnostics; carry induces dependence and long positive streaks can dominate short runs. No population confidence claim is inferred.',assistance:{production:'Unchanged support-probability table and 95% mobility-preferred numbered-target ordering.',unassisted:'Research-only source variant: no support-gap templates and no mobility preference for number placement. Existing colour constraints, four-colour palette, gravity, roles, rounded payouts and 0.05 BET progressive credits remain unchanged.',sourceOverrides:noAssistChanges},samplesPerScenario:N,blockSize,rates,modes,boardSeed,drawSeed,totalGames:runs.length*N,comparisons,runs};
process.stdout.write(JSON.stringify(output,null,2)+'\n');

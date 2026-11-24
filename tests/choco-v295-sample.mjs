/* Bounded direct-return comparison; shared Sugar/JPC is excluded. Historical
 * reference can be supplied with --source after extracting its committed core. */
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {loadChoco,nativeCore,random} from './choco-v295-fixture.mjs';
const args=process.argv.slice(2),arg=(name,fallback)=>{const i=args.indexOf(name);return i<0?fallback:args[i+1];};
const rounds=Number(arg('--rounds',4000)),seed=Number(arg('--seed',832771)),target=Number(arg('--target',90)),file=arg('--source',null);
if(!Number.isInteger(rounds)||rounds<200||rounds>100000||!Number.isInteger(seed)||!Number.isFinite(target)||target<50||target>150)throw Error('Invalid bounded sample parameters');
const source=file?fs.readFileSync(file,'utf8').split('const chocoSprites=')[0]:nativeCore();
const q=loadChoco({source,target}),boardRandom=random(seed),drawRandom=random(seed^0x9e3779b9),e=new q.ChocoDigEngine({random:boardRandom});
let sum=0,bonus=0,winning=0,sugars=0,blockSum=0,blocks=[],maxDepth=0,falls=0,merges=0;
const counts={},returns={},initial={},started=Date.now();
for(let round=0;round<rounds;round++){
 for(const tile of e.strata.flat())if(tile?.item==='ore'||tile?.item==='fruit-prize'){const key=tile.fruit||tile.ore;initial[key]=(initial[key]||0)+1;}
 const nums=Array.from({length:25},(_,i)=>i+1);for(let i=24;i>0;i--){const j=Math.floor(drawRandom()*(i+1));[nums[i],nums[j]]=[nums[j],nums[i]];}
 const plan=e.plan(nums.slice(0,8)),gain=plan.gain;sum+=gain;blockSum+=gain;if(gain>0)winning++;
 bonus+=gain-plan.prizes.reduce((n,item)=>n+item.gain,0);sugars+=plan.sugarCount;maxDepth=Math.max(maxDepth,plan.depth);falls+=plan.fallSteps;merges+=plan.merges;
 for(const prize of plan.prizes){const key=prize.tile.fruit||prize.tile.ore;counts[key]=(counts[key]||0)+1;returns[key]=(returns[key]||0)+prize.gain;}
 e.strata=plan.grid;for(const key of ['seed','uid','depth','nextSugar','fruitCount','fruitState','bonusResolvedDepth'])e[key]=plan[key];e.phase='complete';e.continueDepth=gain>0;e.reset();
 if((round+1)%200===0){blocks.push(blockSum/200);blockSum=0;}
}
const mean=blocks.reduce((a,b)=>a+b,0)/blocks.length,se=blocks.length>1?Math.sqrt(blocks.reduce((n,b)=>n+(b-mean)**2,0)/(blocks.length-1)/blocks.length):null;
console.log(JSON.stringify({revision:q.CHOCO_WORLD_REVISION,rounds,seed,target,sourceSha256:createHash('sha256').update(source).digest('hex'),scope:'Uniform independent 8/25 draws; native carried depth; direct payouts only; shared Sugar/JPC excluded',rtpPercent:sum/rounds,bonusPercent:bonus/rounds,approxBlockCi95:se===null?null:[sum/rounds-1.96*se,sum/rounds+1.96*se],blockMeans:blocks,winningRate:winning/rounds,sugarsPerRound:sugars/rounds,fallStepsPerRound:falls/rounds,mergesPerRound:merges/rounds,maxDepth,initial,counts,returns,elapsedMs:Date.now()-started}));

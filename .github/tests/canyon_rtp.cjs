// Reproducible direct-payout estimate. Includes cumulative continuation/reset.
// Usage: node .github/tests/canyon_rtp.cjs [rounds=10000] [seed=91827]
const fs=require('fs');
const html=fs.readFileSync('index.html','utf8');
const source=fs.readFileSync('assets/choco-dig.js','utf8').split('const chocoSprites=')[0];
const base=html.slice(html.indexOf('class Engine{'),html.indexOf('/* Chocolate Canyon:',html.indexOf('class Engine{')));
const Engine=new Function('SIZE','wonderTier',base+source+';return ChocoDigEngine')(5,()=>0);
const initialSeed=+(process.argv[3]||91827);let seed=initialSeed;
const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const engine=new Engine({random});
const N=+(process.argv[2]||10000);let sum=0,squares=0,bonus=0,maxDepth=0,winning=0;
for(let round=0;round<N;round++){
 const numbers=Array.from({length:25},(_,i)=>i+1);
 for(let j=24;j>0;j--){const k=Math.floor(random()*(j+1));[numbers[k],numbers[j]]=[numbers[j],numbers[k]];}
 const plan=engine.plan(numbers.slice(0,8)),payout=plan.gain/100;
 sum+=payout;squares+=payout*payout;maxDepth=Math.max(maxDepth,plan.depth);
 bonus+=plan.gain-plan.prizes.reduce((n,item)=>n+item.gain,0);if(plan.gain)winning++;
 engine.strata=plan.grid;
 for(const key of ['seed','uid','depth','nextSugar','fruitCount','fruitState','bonusResolvedDepth'])engine[key]=plan[key];
 engine.phase='complete';engine.continueDepth=plan.gain>0;engine.reset();
}
console.log(JSON.stringify({rounds:N,seed:initialSeed,rtp:sum/N,roundStandardError:Math.sqrt((squares/N-(sum/N)**2)/N),bonusReturn:bonus/100/N,maxDepth,winningRate:winning/N}));

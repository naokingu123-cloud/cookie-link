// Direct Canyon RTP and cumulative expedition reach. Shared Sugar/JPC excluded.
// A completed expedition begins at 0m and ends on the first zero-payout round.
// Usage: node .github/tests/canyon_rtp.cjs [rounds=50000] [drawSeed=612937]
const fs=require('fs');
const html=fs.readFileSync('index.html','utf8');
const source=fs.readFileSync('assets/choco-dig.js','utf8').split('const chocoSprites=')[0];
const base=html.slice(html.indexOf('class Engine{'),html.indexOf('/* Chocolate Canyon:',html.indexOf('class Engine{')));
const Engine=new Function('SIZE','wonderTier',base+source+';return ChocoDigEngine')(5,()=>0);
const initialSeed=+(process.argv[3]||612937);let seed=initialSeed;
const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const engine=new Engine({random}),rounds=+(process.argv[2]||50000);
const thresholds=[10,20,30,50,75,100,150,200,300,400,500,600,700,800,900,1000],reached=thresholds.map(()=>0);
let payout=0,bonus=0,winning=0,episodes=0,episodeDepth=0,maxDepth=0;
for(let round=0;round<rounds;round++){
 const numbers=Array.from({length:25},(_,i)=>i+1);
 for(let j=24;j>0;j--){const k=Math.floor(random()*(j+1));[numbers[k],numbers[j]]=[numbers[j],numbers[k]];}
 const plan=engine.plan(numbers.slice(0,8));payout+=plan.gain/100;
 bonus+=(plan.gain-plan.prizes.reduce((n,item)=>n+item.gain,0))/100;
 if(plan.gain)winning++;maxDepth=Math.max(maxDepth,plan.depth);episodeDepth=Math.max(episodeDepth,plan.depth);
 engine.strata=plan.grid;
 for(const key of ['seed','uid','depth','nextSugar','fruitCount','fruitState','bonusResolvedDepth'])engine[key]=plan[key];
 engine.phase='complete';engine.continueDepth=plan.gain>0;engine.reset();
 if(!plan.gain){episodes++;thresholds.forEach((m,i)=>{if(episodeDepth>=m)reached[i]++;});episodeDepth=0;}
}
console.log(JSON.stringify({rounds,seed:initialSeed,rtp:payout/rounds,bonusReturn:bonus/rounds,winningRate:winning/rounds,completedExpeditions:episodes,maxDepth,reach:thresholds.map((depth,i)=>({depth,count:reached[i],rate:reached[i]/episodes}))},null,2));

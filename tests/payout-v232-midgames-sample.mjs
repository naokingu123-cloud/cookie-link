// Reproduce the offline estimates with the production rules:
// node tests/payout-v232-midgames-sample.mjs popcorn targets 30000 581332
// node tests/payout-v232-midgames-sample.mjs popcorn patterns 30000 231761
// node tests/payout-v232-midgames-sample.mjs winery targets 150000 581332
// node tests/payout-v232-midgames-sample.mjs winery patterns 200000 231995
// Heavy sampling is separate from the ordinary regression test command.
import {readFile} from 'node:fs/promises';
const game=process.argv[2]||'popcorn',mode=process.argv[3]||'targets';
const rounds=Math.max(100,Math.floor(Number(process.argv[4])||30000));
const seed=Number(process.argv[5])||581332;
if(!['popcorn','winery'].includes(game)||!['patterns','targets'].includes(mode))throw Error('Expected popcorn|winery and targets|patterns');
const path=game==='popcorn'?'assets/popcorn-engine.js':'assets/winery-pyramid-core-v1.js';
const module={exports:{}};new Function('module',await readFile(new URL('../'+path,import.meta.url),'utf8'))(module);const K=module.exports;
const random=initial=>{let x=initial;return()=>((x=Math.imul(x,1664525)+1013904223)>>>0)/4294967296;};
const shuffle=(a,rng)=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const points=mode==='targets'?[50,90,150]:game==='popcorn'?K.initialPatterns:K.PREFILLS.map((_,i)=>i);
const results=[];
for(const point of points){
 const rng=random(seed),drawRng=random(seed+113),target=mode==='targets'?point:90;
 let sum=0,sum2=0,sugars=0;const clearCounts=Array(9).fill(0),fullCounts=Array(22).fill(0),patterns={};
 const volumeRange=[Infinity,-Infinity],nonemptyRange=[Infinity,-Infinity];
 const winery=game==='winery'?new K.WineryEngine({random:rng,onEvent:()=>{},sleep:async()=>{}}):null;
 for(let trial=0;trial<rounds;trial++){
  const draws=shuffle(Array.from({length:25},(_,i)=>i+1),drawRng).slice(0,8);
  let value;
  if(game==='popcorn'){
   const state=K.create({rng,rate:target,bet:100});
   if(mode==='patterns')state.board=K.patternBoard(point,rng()<.5);
   const name=mode==='patterns'?point.name:state.initialPattern;patterns[name]=(patterns[name]||0)+1;
   for(const number of draws)K.draw(state,number,rng);
   value=state.win;clearCounts[state.clears]++;sugars+=Number(state.sugarAwarded);
  }else{
   winery.payoutTarget=target;winery.reset();
   const pattern=mode==='patterns'?point:winery.pattern;
   let glasses=mode==='patterns'?K.initial(pattern):winery.glasses,power=1;
   const volume=glasses.reduce((sum,g)=>sum+g.volume,0),nonempty=glasses.filter(g=>g.volume>0).length;
   volumeRange[0]=Math.min(volumeRange[0],volume);volumeRange[1]=Math.max(volumeRange[1],volume);
   nonemptyRange[0]=Math.min(nonemptyRange[0],nonempty);nonemptyRange[1]=Math.max(nonemptyRange[1],nonempty);
   patterns[K.NAMES[pattern]]=(patterns[K.NAMES[pattern]]||0)+1;
   for(let ball=0;ball<8;ball++){
    const pos=winery.nodeNumbers.indexOf(draws[ball]);
    if(pos<0)power=Math.min(16,power*2);
    else glasses=K.pour(glasses,pos,power,K.flavorFor(ball+1)).glasses;
   }
   const prize=K.prize(glasses);value=prize.hundredths;fullCounts[prize.full]++;
   if(mode==='targets')sugars+=Number(prize.full>=winery.sugarTarget);
  }
  sum+=value;sum2+=value*value;
 }
 const mean=sum/rounds,se=Math.sqrt(Math.max(0,sum2/rounds-mean*mean)/rounds);
 const row={...(mode==='targets'?{target}:{pattern:game==='popcorn'?point.name:K.NAMES[point]}),rounds,seed,mean,se,ci95:[mean-1.96*se,mean+1.96*se],patterns};
 if(game==='popcorn')Object.assign(row,{clearCounts,sugarRate:sugars/rounds});
 else Object.assign(row,{fullCounts,initialVolumeRange:volumeRange,nonemptyRange,...(mode==='targets'?{sugarRate:sugars/rounds}:{})});
 results.push(row);console.error(game+' '+(row.target??row.pattern)+': '+mean.toFixed(4)+'%, SE '+se.toFixed(4));
}
console.log(JSON.stringify({game,mode,model:'8 uniformly sampled distinct roulette numbers out of 25; direct game payout excludes separate Sugar/JPC value',results},null,2));

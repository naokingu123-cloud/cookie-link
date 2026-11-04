/* Jelly Bingo. The 5 × 5 mold opens on balls 1–5 and holds its shape on 6–8. */
(function(root){
  'use strict';
  const cells=Array.from({length:25},(_,i)=>i);
  const neighbors=cells.map(i=>[
    ...(i%5>0?[i-1]:[]), ...(i%5<4?[i+1]:[]),
    ...(i>=5?[i-5]:[]), ...(i<20?[i+5]:[])
  ]);
  const LINES=[
    ...Array.from({length:5},(_,r)=>cells.slice(r*5,r*5+5)),
    ...Array.from({length:5},(_,c)=>cells.filter(i=>i%5===c)),
    [0,6,12,18,24],[4,8,12,16,20]
  ];
  const awards=[0,20,30,50,100,200,500,1000,2000,5000,10000,null,30000];
  // A missing cell always breaks both a row and a column, so 11 lines cannot occur.
  const payout=(lineCount,oddsMultiplier=1)=>(awards[lineCount]??0)*oddsMultiplier;
  const completed=colors=>LINES.flatMap((line,id)=>line.every(i=>colors[i])?[id]:[]);
  const key=(a,b)=>a<b?a+'-'+b:b+'-'+a;
  const isOpen=(state,a,b)=>state.open.has(key(a,b));

  function shuffled(rng) {
    const result=cells.slice();
    for(let i=result.length-1;i>0;i--){
      const j=Math.floor(rng()*(i+1));
      [result[i],result[j]]=[result[j],result[i]];
    }
    return result;
  }

  // Measured gross line returns (%), including color-change awards, for 0–6 FREE.
  // Each count uses the same 30M sets of eight distinct draws and uniform seed placements.
  const seedRates=[19.510013,32.002347,46.471689,64.412045,88.035295,120.609027,166.752240];
  const luckyFive=.05,luckySix=.05,ordinaryShare=1-luckyFive-luckySix;
  function freeCount(target,roll){
    // Five- and six-FREE boards keep ALL LINE reachable. The remaining board
    // mix must account for those awards to meet the overall payout target.
    if(roll<luckyFive)return 5;
    if(roll<luckyFive+luckySix)return 6;
    const ordinaryTarget=(target-luckyFive*seedRates[5]-luckySix*seedRates[6])/ordinaryShare;
    const high=seedRates.findIndex(rate=>rate>=ordinaryTarget),low=high-1;
    const highShare=(ordinaryTarget-seedRates[low])/(seedRates[high]-seedRates[low]);
    return roll<luckyFive+luckySix+ordinaryShare*highShare?high:low;
  }
  // [lower line goal, probability of placing sugar there]; otherwise one line higher.
  // For each seed count, the two measured tail probabilities interpolate to 10%.
  const sugarGoals=[
    [2,.12706287],[3,.61542494],[3,.20887231],[4,.82364984],
    [4,.37861622],[4,.06031110],[5,.59236717]
  ];
  function create({rng=Math.random,rate=90}={}) {
    const target=Math.min(150,Math.max(50,Number(rate)||90));
    const count=freeCount(target,rng());
    const seeds=shuffled(rng).slice(0,count);
    const colors=Array(25).fill(null);
    for(const i of seeds)colors[i]='blue';
    const numbers=shuffled(rng).map(i=>i+1);
    const [first,lowChance]=sugarGoals[count];
    const sugarLines=first+Number(rng()>=lowChance);
    return {numbers,seeds,sugarLines,colors,draws:[],open:new Set(),lines:completed(colors),oddsMultiplier:1};
  }

  // Return distance layers through the open partitions. Walls between two
  // otherwise connected neighbors still block a direct step across that edge.
  function layers(open,sources) {
    const seen=new Set(sources), result=[];
    let layer=sources;
    while(layer.length){
      result.push(layer);
      const next=[];
      for(const i of layer)for(const j of neighbors[i]){
        if(seen.has(j)||!open.has(key(i,j)))continue;
        seen.add(j);next.push(j);
      }
      layer=next;
    }
    return result;
  }

  function project(previous,number,ball) {
    const index=previous.numbers.indexOf(number);
    if(index<0||previous.draws.includes(number))return null;
    const opened=[],opening=ball<=5;
    const open=opening?new Set(previous.open):previous.open;
    let color='blue',wave;
    if(opening){
      for(const j of neighbors[index]){
        if(!open.has(key(index,j))){
          open.add(key(index,j));opened.push([index,j]);
        }
      }
      // Existing blue liquid is present at every wet cell. Opening a
      // partition can extend it simultaneously into multiple dry branches.
      const wet=previous.colors.flatMap((c,i)=>c?[i]:[]);
      wave=layers(open,wet).slice(1);
    }else{
      color=['red','yellow','green'][ball-6];
      wave=layers(open,[index]);
    }
    const colors=previous.colors.slice();
    let oddsReason=null;
    // The four ingredients enter in a fixed order; e.g. a purple section is 'blue+red'.
    for(const group of wave)for(const i of group){
      const recipe=colors[i];
      if(!recipe)colors[i]=color;
      else if(!recipe.includes(color)){
        colors[i]=recipe+'+'+color;
        oddsReason='color'; // Any number of recolored cells makes one color change for this pour.
      }
    }
    const oddsMultiplier=previous.oddsMultiplier+(oddsReason ? .5 : 0);
    return {index,color,opened,wave,open,colors,lines:completed(colors),oddsReason,oddsMultiplier};
  }

  function preview(state,number) {
    // Show hypothetical reaches on the eighth settled board without accepting a ninth ball.
    const hit=project(state,number,Math.min(8,state.draws.length+1));
    if(!hit)return null;
    const lines=hit.lines.length;
    return {lines,oddsReason:hit.oddsReason,oddsMultiplier:hit.oddsMultiplier,totalHundredths:payout(lines,hit.oddsMultiplier)};
  }
  const previewLines=(state,number)=>preview(state,number)?.lines??null;

  function draw(previous,number) {
    const ball=previous.draws.length+1;
    if(ball>8)return null;
    const projected=project(previous,number,ball);
    if(!projected)return null;
    const {index,color,opened,wave,open,colors,lines,oddsReason,oddsMultiplier}=projected;
    const state={...previous,open,draws:[...previous.draws,number],colors,lines,oddsMultiplier};
    const newLines=lines.filter(id=>!previous.lines.includes(id));
    return {state,trace:{before:previous,number,index,ball,color,opened,wave,newLines,oddsReason}};
  }

  const api={create,draw,preview,previewLines,LINES,isOpen,payout};
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.JellyRules=api;
})(globalThis);

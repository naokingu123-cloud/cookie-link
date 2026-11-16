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
  // One common paytable for every target; the 12-line top award stays 300x.
  const PAYOUT_VERSION=232,awards=[0,16,24,40,80,160,400,800,1600,4000,8000,null,30000];
  const legacyAwards=[0,20,30,50,100,200,500,1000,2000,5000,10000,null,30000];
  // A missing cell always breaks both a row and a column, so 11 lines cannot occur.
  const payout=(lineCount,oddsMultiplier=1,version=PAYOUT_VERSION)=>((version>=PAYOUT_VERSION?awards:legacyAwards)[lineCount]??0)*oddsMultiplier;
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

  // Every target starts with exactly four blue FREE cells. Only the geometric
  // arrangement changes. These anchors enumerate all 60,568,200 unordered
  // 5-pour / 3-color outcomes per mold, including color-change multipliers.
  const molds=[
    {name:"四葉",seeds:[7,11,13,17],returnPercent:48.233743779739,sugarGoal:[3,0.026460628610656782]},
    {name:"小窓",seeds:[6,8,16,18],returnPercent:61.98506833619,sugarGoal:[4,0.5872723073388691]},
    {name:"十字",seeds:[2,11,13,22],returnPercent:64.457063343471,sugarGoal:[4,0.5996524515041127]},
    {name:"双翼",seeds:[5,9,15,19],returnPercent:79.111849584435,sugarGoal:[4,0.23002501632581554]},
    {name:"格子",seeds:[1,3,21,23],returnPercent:79.111849584435,sugarGoal:[4,0.23002501632581554]},
    {name:"四隅",seeds:[0,4,20,24],returnPercent:155.23668750268,sugarGoal:[5,0.2451171906601272]}
  ];
  const targetRate=value=>Math.min(150,Math.max(50,Number(value)||90));
  function mixtureFor(rate){
    let low=-1,high=1;
    for(let i=0;i<48;i++){
      const t=(low+high)/2,weights=molds.map(m=>Math.exp((m.returnPercent-90)*t));
      const total=weights.reduce((a,b)=>a+b,0),mean=weights.reduce((a,w,j)=>a+w*molds[j].returnPercent,0)/total;
      if(mean<rate)low=t;else high=t;
    }
    const weights=molds.map(m=>Math.exp((m.returnPercent-90)*(low+high)/2)),total=weights.reduce((a,b)=>a+b,0);
    return weights.map(w=>w/total);
  }
  let cachedRate=null,cachedWeights=null;
  function weightsFor(rate){if(rate!==cachedRate){cachedRate=rate;cachedWeights=mixtureFor(rate);}return cachedWeights;}
  function balance(value=90){
    const rate=targetRate(value),weights=weightsFor(rate);
    return {target:rate,returnPercent:weights.reduce((n,w,i)=>n+w*molds[i].returnPercent,0),freeCount:4,method:'exact-uniform-8-of-25'};
  }
  function transformedSeeds(seeds,code){
    return seeds.map(i=>{let x=i%5,y=Math.floor(i/5);if(code&1)x=4-x;for(let k=0;k<(code>>1);k++){const nx=4-y;y=x;x=nx;}return y*5+x;}).sort((a,b)=>a-b);
  }
  function create({rng=Math.random,rate=90}={}) {
    const target=targetRate(rate),weights=weightsFor(target);let pick=rng(),mold=molds[molds.length-1];
    for(let i=0;i<molds.length;i++){pick-=weights[i];if(pick<0){mold=molds[i];break;}}
    const seeds=transformedSeeds(mold.seeds,Math.floor(rng()*8)),colors=Array(25).fill(null);
    for(const i of seeds)colors[i]='blue';
    const numbers=shuffled(rng).map(i=>i+1),[first,lowChance]=mold.sugarGoal;
    const sugarLines=first+Number(rng()>=lowChance);
    return {numbers,seeds,sugarLines,colors,draws:[],open:new Set(),lines:completed(colors),oddsMultiplier:1,target,patternName:mold.name,payoutVersion:PAYOUT_VERSION};
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
    return {lines,oddsReason:hit.oddsReason,oddsMultiplier:hit.oddsMultiplier,totalHundredths:payout(lines,hit.oddsMultiplier,state.payoutVersion??0)};
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

  const api={create,draw,preview,previewLines,LINES,isOpen,payout,molds,balance,PAYOUT_VERSION};
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.JellyRules=api;
})(globalThis);

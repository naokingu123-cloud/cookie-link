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
  const payout=lineCount=>awards[lineCount]??0;
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

  // Gross line return (%) at 3–8 uniformly placed blue seeds, from 15M boards
  // with eight distinct draws. Interpolate by mixing adjacent initial seed counts.
  const seedRates=[40.0772,52.8314,70.3233,94.8536,129.5476,178.7747];
  // For each blue seed count (3–8), choose one of three consecutive line goals.
  // The cutoffs fit a 10% sugar win rate to the same 15M eight-ball boards.
  const sugarGoals=[
    [3,.100,.600], [4,.433,.850], [4,.104,.900],
    [5,.611,.950], [5,.276,.850], [5,.100,.616]
  ];
  function create({rng=Math.random,rate=90}={}) {
    const target=Math.min(150,Math.max(50,Number(rate)||90));
    const high=seedRates.findIndex(value=>value>=target);
    const fraction=(target-seedRates[high-1])/(seedRates[high]-seedRates[high-1]);
    const count=3+high-1+Number(rng()<fraction);
    const seeds=shuffled(rng).slice(0,count);
    const colors=Array(25).fill(null);
    for(const i of seeds)colors[i]='blue';
    const numbers=shuffled(rng).map(i=>i+1);
    const [first,lowCut,midCut]=sugarGoals[count-3],roll=rng();
    const sugarLines=first+(roll<lowCut?0:roll<midCut?1:2);
    return {numbers,seeds,sugarLines,colors,draws:[],open:new Set(),lines:completed(colors)};
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
    for(const group of wave)for(const i of group)colors[i]=color;
    return {index,color,opened,wave,open,colors,lines:completed(colors)};
  }

  function previewLines(state,number) {
    // The settled eighth board can still show what an unused pocket would fill.
    // Project its final pour without adding a draw or changing the real state.
    return project(state,number,Math.min(8,state.draws.length+1))?.lines.length??null;
  }

  function draw(previous,number) {
    const ball=previous.draws.length+1;
    if(ball>8)return null;
    const projected=project(previous,number,ball);
    if(!projected)return null;
    const {index,color,opened,wave,open,colors,lines}=projected;
    const state={...previous,open,draws:[...previous.draws,number],colors,lines};
    const newLines=lines.filter(id=>!previous.lines.includes(id));
    return {state,trace:{before:previous,number,index,ball,color,opened,wave,newLines}};
  }

  const api={create,draw,previewLines,LINES,isOpen,payout};
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.JellyRules=api;
})(globalThis);

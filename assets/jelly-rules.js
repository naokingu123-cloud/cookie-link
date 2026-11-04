/* Jelly Bingo. All eight pours open the neighboring partitions of the drawn number. */
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
  const BALL_COLORS=['red','red','red','yellow','yellow','green','blue','purple'];
  const ingredients=['white','red','yellow','green','blue','purple'];
  const awards=[0,0,0,0,10,20,30,50,100,200,500,0,3000];
  const paidLines=awards.flatMap((award,i)=>award?[i]:[]);
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

  // With eight different draws the wet set is exactly their orthogonal neighborhoods
  // (including the draws themselves), plus the chosen FREE cells. Enumerate every
  // 8-of-25 draw set and weight each subset of remaining dry cells by the number
  // of compatible seed placements. These are the exact gross line returns (%),
  // rounded to six decimals, for 2 through 9 uniformly placed white FREE cells.
  const seedRates=[47.459608,56.520122,67.509996,80.839509,96.998585,116.570859,140.250027,168.858830];
  // [lower goal, higher goal, probability of the lower goal]. Each seed count
  // independently gives a 10% sugar chance, including a jump over the goal.
  const sugarGoals=[
    [8,9,.83737419], [8,9,.56193557], [8,9,.31975266], [8,9,.10225095],
    [9,10,.81897185], [9,10,.49431611], [9,10,.21151544], [10,12,.95573904]
  ];
  function create({rng=Math.random,rate=90}={}) {
    const target=Math.min(150,Math.max(50,Number(rate)||90));
    const high=seedRates.findIndex(value=>value>=target);
    const fraction=(target-seedRates[high-1])/(seedRates[high]-seedRates[high-1]);
    const count=2+high-1+Number(rng()<fraction);
    const seeds=shuffled(rng).slice(0,count);
    const colors=Array(25).fill(null);
    for(const i of seeds)colors[i]='white';
    const numbers=shuffled(rng).map(i=>i+1);
    const [lowGoal,highGoal,lowChance]=sugarGoals[count-2];
    const sugarLines=rng()<lowChance?lowGoal:highGoal;
    return {numbers,seeds,sugarLines,colors,draws:[],open:new Set(),lines:completed(colors)};
  }

  // Return distance layers through the open partitions. Walls between two
  // otherwise connected neighbors still block a direct step across that edge.
  function layers(open,source) {
    const seen=new Set([source]), result=[];
    let layer=[source];
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
    const opened=[],open=new Set(previous.open);
    for(const j of neighbors[index]){
      if(!open.has(key(index,j))){
        open.add(key(index,j));opened.push([index,j]);
      }
    }
    const color=BALL_COLORS[ball-1],wave=layers(open,index);
    const component=wave.flat(),dyes=new Set([color]);
    for(const i of component){
      if(previous.colors[i])for(const dye of previous.colors[i].split('+'))dyes.add(dye);
    }
    const recipe=ingredients.filter(dye=>dyes.has(dye)).join('+');
    const colors=previous.colors.slice();
    for(const i of component)colors[i]=recipe;
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

  const api={create,draw,previewLines,LINES,BALL_COLORS,paidLines,isOpen,payout};
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.JellyRules=api;
})(globalThis);

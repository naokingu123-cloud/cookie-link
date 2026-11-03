/* Popcorn Splash: 61 kernels, three banks of five outward-facing fuses. */
(function(root){
  'use strict';
  const S = Math.sqrt(3) / 2;
  const radius = 4.6;
  const outline = [
    {x:-radius, y:0}, {x:-radius/2, y:-radius*S}, {x:radius/2, y:-radius*S},
    {x:radius, y:0}, {x:radius/2, y:radius*S}, {x:-radius/2, y:radius*S}
  ];
  // Axial coordinates project to nine horizontal rows of 5,6,7,8,9,8,7,6,5.
  // Equal x positions form true vertical gravity tracks on this staggered grid.
  const cells=[], columns=[], ports=[], indices=new Map(), byX=new Map();
  for(let r=-4; r<=4; r++){
    for(let q=Math.max(-4,-4-r); q<=Math.min(4,4-r); q++){
      const i=cells.length, x=q+r/2;
      indices.set(q+','+r,i);
      if(!byX.has(x)) byX.set(x,[]);
      byX.get(x).push(i);
      cells.push({q,r,x,y:r*S});
    }
  }
  columns.push(...[...byX.keys()].sort((a,b)=>a-b).map(x=>byX.get(x)));
  const neighbors=cells.map(({q,r})=>
    [[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]]
      .map(([dq,dr])=>indices.get([q+dq,r+dr].join(','))).filter(i=>i!==undefined)
  );
  function port(line,dx,dy){
    const start=cells[line[0]];
    ports.push({x:start.x-1.12*dx,y:start.y-1.12*dy,dx,dy,line});
  }
  // The inward normal of a sloping bank passes between two equidistant
  // centers in alternate layers. Take the upper cell of each tie, mirrored
  // on the right. The beam touches every selected cell and never double-hits.
  function sidePort(level,mirror){
    const line=[];
    for(let k=0;k<5+level;k++){
      const q=-4+k, r=level-Math.ceil(k/2);
      line.push(indices.get((mirror?-q-r:q)+','+r));
    }
    port(line,mirror?-S:S,-.5);
  }
  for(let level=0;level<=4;level++) sidePort(level,false);
  for(let q=-4;q<=0;q++){
    const line=Array.from({length:5},(_,k)=>indices.get((q+k)+','+(4-2*k)));
    port(line,0,-1);
  }
  for(let level=4;level>=0;level--) sidePort(level,true);
  const colorStarts = [0,1,26,51,76,101,126];
  const popPay = [[40,.1],[65,.2],[85,.4],[105,.7],[125,1],[150,1.5],[180,2.5],[220,5],[260,10],[320,25]];
  const clearPay = [[1,1],[2,3],[3,8],[4,20],[5,50],[6,100],[7,200],[8,400]];
  // 65,000 rounds per fixed bomb chance (285,000 at .30 and .34); eight balls
  // without replacement at 100 BET. Interpolate by mixing complete rounds so
  // the published payout table stays fixed across the 50–150% debug range.
  const rateAnchors = [[.17,35.564],[.22,56.523],[.26,81.248],[.30,118.570],[.34,178.309]];
  function multiplier(count,table){
    let award = 0;
    for (const [min,value] of table){
      if (count<min) break;
      award = value;
    }
    return award;
  }
  function payout(popped,clears,bet=100){
    return Math.floor((multiplier(popped,popPay)+multiplier(clears,clearPay))*bet+1e-8);
  }
  function colorFor(serial){
    let color=0;
    while(color<colorStarts.length-1 && serial>=colorStarts[color+1]) color++;
    return color;
  }
  function chanceFor(target,rng){
    const rate=Math.max(50,Math.min(150,Number(target)||90));
    let i=1;
    while(i<rateAnchors.length-1 && rateAnchors[i][1]<rate) i++;
    const [lo,a]=rateAnchors[i-1], [hi,b]=rateAnchors[i];
    return rng()<(rate-a)/(b-a)?hi:lo;
  }
  function shuffle(values,rng){
    for(let i=values.length-1; i>0; i--){
      const j=Math.floor(rng()*(i+1));
      [values[i],values[j]]=[values[j],values[i]];
    }
    return values;
  }
  function create({rng=Math.random,bet=100,rate=90}={}){
    const numbers=shuffle(Array.from({length:25},(_,i)=>i+1),rng).slice(0,15);
    const allIndex=Math.floor(rng()*ports.length);
    const bombChance=chanceFor(rate,rng);
    // A few opening batches are rich in ignition kernels, so natural clears
    // can still occur before ordinary refills establish the target bomb rate.
    const openingChance = rng()<.05 ? .5 : bombChance;
    const board=cells.map((_,id)=>({id,color:0,bomb:rng()<openingChance}));
    if (!board.some(piece=>piece.bomb)) board[Math.floor(rng()*board.length)].bomb=true;
    if (board.every(piece=>piece.bomb)) board[Math.floor(rng()*board.length)].bomb=false;
    return {board,numbers,drawn:[],allIndex,bombChance,turn:0,popped:0,refilled:0,clears:0,win:0,bet};
  }
  function ignition(state,number){
    const port=state.numbers.indexOf(number);
    const all=port!==-1 && port===state.allIndex;
    const first=all?state.board.reduce((seeds,piece,i)=>{
      if(piece.bomb) seeds.push(i);
      return seeds;
    },[]):port<0?[]:ports[port].line;
    const marked=new Set(first), waves=[];
    let frontier=first;
    while(frontier.length){
      waves.push(frontier);
      const next=[];
      for(const index of frontier){
        if(!state.board[index].bomb) continue;
        for(const adjacent of neighbors[index]){
          if(!marked.has(adjacent)){
            marked.add(adjacent);
            next.push(adjacent);
          }
        }
      }
      frontier=next;
    }
    const count=marked.size, clear=count===cells.length;
    return {port,all,waves,marked,count,clear,win:payout(state.popped+count,state.clears+Number(clear),state.bet)};
  }
  function preview(state,number){
    const {count,clear,win}=ignition(state,number);
    return {count,clear,win};
  }
  function draw(state,number,rng=Math.random){
    if(state.turn>=8 || !Number.isInteger(number) || number<1 || number>25 || state.drawn.includes(number)) return null;
    const {port,all,waves,marked,count,clear,win}=ignition(state,number);
    const before=state.board, after=before.slice(), moves=[], oldWin=state.win;
    if(count){
      for(const column of columns){
        const survivors=column.filter(index=>!marked.has(index));
        const empty=column.length-survivors.length;
        for(let row=0; row<column.length; row++){
          const to=column[row], from=row<empty?-1:survivors[row-empty];
          if(from===to) continue;
          const src=cells[from]||{x:cells[to].x,y:cells[to].y-empty*2*S};
          const piece=from<0
            ? {id:cells.length+state.refilled,color:colorFor(++state.refilled),bomb:rng()<state.bombChance}
            : before[from];
          after[to]=piece;
          moves.push({from,to,x:src.x,y:src.y,piece});
        }
      }
    }
    const beforeNumbers=state.numbers;
    let afterNumbers=beforeNumbers, newNumber=null;
    state.drawn.push(number);
    if(port>=0){
      const pool=[];
      for(let n=1;n<=25;n++) if(!state.drawn.includes(n) && !beforeNumbers.includes(n)) pool.push(n);
      newNumber=pool[Math.floor(rng()*pool.length)];
      afterNumbers=beforeNumbers.slice();
      afterNumbers[port]=newNumber;
      state.numbers=afterNumbers;
    }
    state.board=after;
    state.turn++;
    state.popped+=count;
    state.clears+=Number(clear);
    state.win=win;
    return {before,after,port,all,beforeNumbers,afterNumbers,oldNumber:port<0?null:number,newNumber,waves,moves,count,clear,oldWin,win};
  }
  const api={cells,ports,outline,columns,neighbors,colorStarts,popPay,clearPay,payout,colorFor,create,preview,draw};
  root.PopcornEngine=api;
  if(typeof module!=='undefined' && module.exports) module.exports=api;
})(typeof window==='undefined'?globalThis:window);

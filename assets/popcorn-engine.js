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
  const radiusTwo=neighbors.map((first,i)=>{
    const area=new Set(first);
    for(const j of first) for(const k of neighbors[j]) if(k!==i) area.add(k);
    return Array.from(area);
  });
  // Six Drop's synchronized support/pivot/gap rule adapted to these nine rows.
  // Only the board silhouette changes. Paths and collision pairs are static,
  // so repeated draws can reuse their 16-sample clearance checks.
  const at=(q,r)=>indices.get(q+','+r)??-1;
  const support=cells.map(({q,r})=>({
    dl:at(q-1,r+1),dr:at(q,r+1),down:at(q-1,r+2),left:at(q-1,r),right:at(q+1,r)
  }));
  const paths=[];
  function motionPoint(move,t){
    const {from,to,pivot,gap,gapPivot,turn}=move.path||move, a=cells[from],b=cells[to];
    if(t<=0)return a;if(t>=1)return b;
    const sign=Math.sign(b.x-a.x);
    if(gap){
      if(gapPivot>=0){
        const p=cells[gapPivot], vertical=p.y-1-a.y,d=t*(vertical+Math.PI/6);
        if(d<=vertical)return {x:a.x,y:a.y+d};
        const angle=-Math.PI/2+sign*(d-vertical);
        return {x:p.x+Math.cos(angle),y:p.y+Math.sin(angle)};
      }
      const height=b.y-a.y,d=t*(height+Math.abs(b.x-a.x));
      return d<=height?{x:a.x,y:a.y+d}:{x:a.x+sign*(d-height),y:b.y};
    }
    if(pivot<0)return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
    const p=cells[pivot], angle=Math.atan2(a.y-p.y,a.x-p.x)+turn*t;
    return {x:p.x+Math.cos(angle),y:p.y+Math.sin(angle)};
  }
  function template(from,to,pivot=-1,turn=0,gap=false,gapPivot=-1){
    if(to<0)return null;
    const p={from,to,pivot,turn,gap,gapPivot,id:paths.length};
    p.samples=Array.from({length:17},(_,k)=>motionPoint(p,k/16));
    const tooNear=(a,b)=>(a.x-b.x)**2+(a.y-b.y)**2<.999999;
    p.blockers=cells.flatMap((cell,i)=>from!==i&&p.samples.some((a,k)=>k>0&&tooNear(a,cell))?[i]:[]);
    paths.push(p);
    return p;
  }
  const choices=support.map(({dl,dr,down},i)=>({
    vertical:template(i,down),
    l:template(i,dl),r:template(i,dr),
    rollL:dr<0?null:template(i,dl,dr,-Math.PI/3),rollR:dl<0?null:template(i,dr,dl,Math.PI/3),
    gapL:template(i,dl,-1,0,true),gapR:template(i,dr,-1,0,true),
    bridgeL:down<0?null:template(i,dl,-1,0,true,down),bridgeR:down<0?null:template(i,dr,-1,0,true,down)
  }));
  const conflicts=paths.map(()=>new Uint8Array(paths.length));
  for(const a of paths) for(let j=0;j<a.id;j++){
    const b=paths[j];
    if(Math.abs(cells[a.from].x-cells[b.from].x)>2 || Math.abs(cells[a.from].y-cells[b.from].y)>3)continue;
    if(a.samples.some((p,k)=>(p.x-b.samples[k].x)**2+(p.y-b.samples[k].y)**2<.999999)){
      conflicts[a.id][j]=conflicts[j][a.id]=1;
    }
  }
  const rowIndices=Array.from({length:9},(_,r)=>cells.flatMap((c,i)=>c.r===r-4?[i]:[]));
  function settle(input,trace=true){
    const board=input.slice(), steps=[];
    for(;;){
      const moving=new Uint8Array(61),reserved=new Uint8Array(61),pinned=new Uint8Array(61),accepted=[];
      const occupied=i=>i>=0&&board[i]&&!moving[i];
      const clear=m=>m&&!m.blockers.some(occupied);
      const room=i=>i<0?-1:Number(support[i].dl>=0&&!occupied(support[i].dl))+Number(support[i].dr>=0&&!occupied(support[i].dr));
      let previous;
      do{
        previous=accepted.length;
        for(let row=7;row>=0;row--){
          const proposals=[];
          for(const i of rowIndices[row]){
            if(!board[i]||moving[i]||pinned[i])continue;
            const g=support[i],m=choices[i], left=occupied(g.dl),right=occupied(g.dr);
            if(left&&right)continue;
            const sl=occupied(g.left),sr=occupied(g.right),mid=occupied(g.down);
            const l=left?null:!sl?(right?m.rollL:m.l):!right?(mid?m.bridgeL:m.gapL):null;
            const r=right?null:!sr?(left?m.rollR:m.r):!left?(mid?m.bridgeR:m.gapR):null;
            const v=!left&&!right&&!mid?m.vertical:null;
            let options;
            if(left)options=[r];
            else if(right)options=[l];
            else if(board[g.left]&&!board[g.right])options=[r,v,l];
            else if(board[g.right]&&!board[g.left])options=[l,v,r];
            else if(v)options=[v];
            else options=room(r?.to??-1)>room(l?.to??-1)?[r,l]:[l,r];
            options=options.filter(clear);
            if(options.length)proposals.push(options);
          }
          proposals.sort((a,b)=>a.length-b.length);
          for(const options of proposals)for(const m of options){
            if(moving[m.from]||pinned[m.from]||reserved[m.to]||!clear(m)||accepted.some(p=>conflicts[m.id][p.id]))continue;
            accepted.push(m);moving[m.from]=reserved[m.to]=1;
            if(m.pivot>=0)pinned[m.pivot]=1;
            if(m.gapPivot>=0)pinned[m.gapPivot]=1;
            break;
          }
        }
      }while(accepted.length!==previous);
      if(!accepted.length)break;
      const before=board.slice();
      for(const m of accepted)board[m.from]=null;
      for(const m of accepted)board[m.to]=before[m.from];
      if(trace)steps.push({before,after:board.slice(),
        moves:accepted.map(path=>({from:path.from,to:path.to,piece:before[path.from],path})),
        ms:accepted.some(p=>p.gap)?160:accepted.some(p=>cells[p.to].r-cells[p.from].r===2)?120:90});
    }
    return {board,steps};
  }
  function port(line,dx,dy,offset=1.12){
    const start=cells[line[0]];
    ports.push({x:start.x-offset*dx,y:start.y-offset*dy,dx,dy,line});
  }
  // Each diagonal lane runs parallel to the opposite sloping bank.
  function sidePort(level,mirror){
    const line=[];
    for(let k=0;k<5+level;k++){
      const q=-4+k, r=level-k;
      line.push(indices.get((mirror?-q-r:q)+','+r));
    }
    port(line,mirror?-.5:.5,-S,1.44);
  }
  for(let level=0;level<=4;level++) sidePort(level,false);
  for(let q=-4;q<=0;q++){
    const line=Array.from({length:5},(_,k)=>indices.get((q+k)+','+(4-2*k)));
    port(line,0,-1);
  }
  for(let level=4;level>=0;level--) sidePort(level,true);
  const strongBombChance = 1/32;
  const popPay = [[40,.1],[65,.2],[85,.4],[105,.7],[125,1],[150,1.5],[180,2.5],[220,5],[260,10],[320,25]];
  const clearPay = [[1,5],[2,20],[3,50],[4,100],[5,200],[6,300],[7,500],[8,1000]];
  const clearTotals=[0];
  for(const [,award] of clearPay) clearTotals.push(clearTotals[clearTotals.length-1]+award);
  // 24,000 rounds per fixed bomb chance with enhanced bombs, sloping lanes,
  // rolling gravity, and the separate ALL igniter. Eight balls
  // without replacement at 100 BET. Interpolate by mixing complete rounds so
  // the published payout table stays fixed across the 50–150% debug range.
  const rateAnchors = [[.155,38.433],[.21,64.175],[.255,97.785],[.285,131.361],[.325,203.287]];
  function multiplier(count,table){
    let award = 0;
    for (const [min,value] of table){
      if (count<min) break;
      award = value;
    }
    return award;
  }
  function payout(popped,clears,bet=100){
    return Math.floor((multiplier(popped,popPay)+clearTotals[Math.min(clears,clearPay.length)])*bet+1e-8);
  }
  function kernel(id,bomb,rng){
    const power=bomb?(rng()<strongBombChance?2:1):0;
    return Object.freeze({id,bomb,power,color:bomb?1:0});
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
    const numbers=shuffle(Array.from({length:25},(_,i)=>i+1),rng).slice(0,ports.length+1);
    const allIndex=ports.length;
    const bombChance=chanceFor(rate,rng);
    // A few opening batches are rich in ignition kernels, so natural clears
    // can still occur before ordinary refills establish the target bomb rate.
    const openingChance = rng()<.05 ? .5 : bombChance;
    const board=cells.map((_,id)=>kernel(id,rng()<openingChance,rng));
    if(!board.some(p=>p.bomb)||board.every(p=>p.bomb)){
      const i=Math.floor(rng()*board.length);
      board[i]=kernel(i,!board[i].bomb,rng);
    }
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
        for(const adjacent of (state.board[index].power===2?radiusTwo:neighbors)[index]){
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
    const before=state.board, moves=[], oldWin=state.win;
    const fall=count?settle(before.map((p,i)=>marked.has(i)?null:p)):{board:before,steps:[]};
    const settled=fall.board, after=settled.slice(), fallSteps=fall.steps;
    if(count){
      for(const column of columns){
        let supplyY=-4.9;
        for(let row=column.length-1;row>=0;row--){
          const to=column[row];
          if(settled[to])continue;
          const piece=kernel(cells.length+state.refilled++,rng()<state.bombChance,rng);
          after[to]=piece;
          moves.push({from:-1,to,x:cells[to].x,y:supplyY,piece});
          supplyY-=2*S;
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
    return {before,after,port,all,beforeNumbers,afterNumbers,oldNumber:port<0?null:number,newNumber,waves,settled,fallSteps,moves,count,clear,oldWin,win};
  }
  const api={cells,ports,outline,columns,neighbors,radiusTwo,settle,motionPoint,strongBombChance,popPay,clearPay,payout,create,preview,draw};
  root.PopcornEngine=api;
  if(typeof module!=='undefined' && module.exports) module.exports=api;
})(typeof window==='undefined'?globalThis:window);

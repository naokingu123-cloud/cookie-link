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
  const blastAreas=[[],neighbors];
  for(let radius=2;radius<=3;radius++){
    blastAreas.push(cells.map((a,i)=>cells.flatMap((b,j)=>{
      const dq=b.q-a.q,dr=b.r-a.r;
      return i!==j&&Math.max(Math.abs(dq),Math.abs(dr),Math.abs(dq+dr))<=radius?[j]:[];
    })));
  }
  const radiusTwo=blastAreas[2],radiusThree=blastAreas[3];
  // Each through-line is ordered end to end and includes the center. Gaps in
  // the popcorn cannot block electricity on these fixed board coordinates.
  const lightningAxes=cells.map(a=>[
    cells.flatMap((b,j)=>b.q===a.q?[j]:[]),
    cells.flatMap((b,j)=>2*b.q+b.r===2*a.q+a.r?[j]:[]),
    cells.flatMap((b,j)=>b.q+b.r===a.q+a.r?[j]:[])
  ]);
  blastAreas[4]=lightningAxes.map((axes,i)=>[...new Set(axes.flat())].filter(j=>j!==i));
  blastAreas[5]=cells.map((_,i)=>cells.flatMap((cell,j)=>j===i?[]:[j]));
  // Six Drop's synchronized support/pivot/gap rule adapted to these nine rows.
  // Only the board silhouette changes. Paths and collision pairs are static,
  // so repeated draws can reuse their 16-sample clearance checks.
  const at=(q,r)=>indices.get(q+','+r)??-1;
  const support=cells.map(({q,r})=>({
    dl:at(q-1,r+1),dr:at(q,r+1),down:at(q-1,r+2),left:at(q-1,r),right:at(q+1,r)
  }));
  const paths=[];
  function motionPoint(move,t){
    if(move.from<0){
      const b=cells[move.to],u=Math.max(0,Math.min(t,1));
      return {x:move.x+(b.x-move.x)*u,y:move.y+(b.y-move.y)*u};
    }
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
    // At the angled carton walls a gap escape around a support can leave the
    // hexagon mid-path despite both endpoints being valid. Keep the whole
    // kernel inside the brass edge throughout its roll.
    const innerWall=radius*1.045*S-.5; // outer carton lip, minus one kernel radius
    if(p.samples.some(({x,y})=>Math.max(Math.abs(y),Math.abs(x)*S+Math.abs(y)/2)>innerWall+1e-8))return null;
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
  // At opening and each subsequent refill, these are conditional on a bomb.
  // Existing kernels retain their original color and radius throughout a game.
  const rainbowBombChance=1/4800; // conditional on a newly generated kernel being a bomb
  const bombGrades=Array.from({length:9},(_,ball)=>{
    const red=.045+.025*ball;
    return {red,purple:.006+.012*ball,lightning:red,rainbow:rainbowBombChance};
  });
  const firstPopAward=80;
  const levels=[];
  for(const [start,end,step] of [[.1,1,.1],[1.2,2,.2],[2.5,5,.5],[6,10,1],[12.5,30,2.5],[35,50,5]]){
    for(let value=start;value<=end+.00001;value+=step)levels.push(Math.round(value*10)/10);
  }
  while(firstPopAward+10*(levels.length-1)<61*8)levels.push(levels[levels.length-1]+5);
  const popPay=levels.map((level,i)=>[firstPopAward+10*i,level]);
  // Per occurrence. Higher tiers follow the decreasing chance of reaching
  // that clear count, with a deliberately softer rise than inverse odds.
  const clearPay=[[1,10],[2,80],[3,600],[4,4000],[5,30000],[6,200000],[7,1500000],[8,10000000]];
  const clearTotals=[0];
  for(const [,award] of clearPay) clearTotals.push(clearTotals[clearTotals.length-1]+award);
  // [bomb chance, RTP percent, lower sugar threshold, probability of lower].
  // Rates use complete eight-ball rounds with the fixed visible prize table.
  // The default uses exactly .1907. The sugar targets bracket the measured 90th
  // percentile at each bomb chance; one target is drawn before the first ball.
  const rateAnchors=[[.143,41.12,140,.53561],[.168,61.21,160,.35880],
    [.1907,90,180,.38092],[.2035,117.49,190,.17609],[.2225,179.78,210,.30586]];
  function multiplier(count,table){
    let award = 0;
    for (const [min,value] of table){
      if (count<min) break;
      award = value;
    }
    return award;
  }
  function payout(popped,clears,bet=100){
    const [lastCount,lastMultiplier]=popPay[popPay.length-1];
    const popWin=popped>lastCount?lastMultiplier+5*Math.floor((popped-lastCount)/10):multiplier(popped,popPay);
    return Math.floor((popWin+clearTotals[Math.min(clears,clearPay.length)])*bet+1e-8);
  }
  function bombPower(roll,ball=0){
    const {red,purple,lightning,rainbow}=bombGrades[ball];
    if(roll>=1-rainbow)return 5;
    if(roll<purple)return 3;
    if(roll<purple+red)return 2;
    if(roll<purple+red+lightning)return 4;
    return 1;
  }
  function kernel(id,bomb,rng,ball=0){
    const power=bomb?bombPower(rng(),ball):0;
    return Object.freeze({id,bomb,power,color:power});
  }
  function anchorFor(target,rng){
    const rate=Math.max(50,Math.min(150,Number(target)||90));
    let i=1;
    while(i<rateAnchors.length-1 && rateAnchors[i][1]<rate) i++;
    const lo=rateAnchors[i-1],hi=rateAnchors[i];
    return rng()<(rate-lo[1])/(hi[1]-lo[1])?hi:lo;
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
    const anchor=anchorFor(rate,rng);
    const bombChance=anchor[0];
    // A few opening batches are rich in ignition kernels, so natural clears
    // can still occur before ordinary refills establish the target bomb rate.
    const openingChance = rng()<.05 ? .5 : bombChance;
    const board=cells.map((_,id)=>kernel(id,rng()<openingChance,rng));
    if(!board.some(p=>p.bomb)||board.every(p=>p.bomb)){
      const i=Math.floor(rng()*board.length);
      board[i]=kernel(i,!board[i].bomb,rng);
    }
    const sugarTarget=anchor[2]+(rng()<anchor[3]?0:10);
    return {board,numbers,drawn:[],allIndex,bombChance,sugarTarget,sugarAwarded:false,turn:0,popped:0,refilled:0,clears:0,win:0,bet};
  }
  function ignition(state,number){
    const port=state.numbers.indexOf(number);
    const all=port!==-1 && port===state.allIndex;
    const first=all?state.board.reduce((seeds,piece,i)=>{
      if(piece?.bomb) seeds.push(i);
      return seeds;
    },[]):port<0?[]:ports[port].line.filter(i=>state.board[i]);
    const marked=new Set(first), waves=[];
    let frontier=first;
    while(frontier.length){
      waves.push(frontier);
      const next=[];
      for(const index of frontier){
        if(!state.board[index].bomb) continue;
        for(const adjacent of blastAreas[state.board[index].power][index]){
          if(state.board[adjacent] && !marked.has(adjacent)){
            marked.add(adjacent);
            next.push(adjacent);
          }
        }
      }
      frontier=next;
    }
    const count=marked.size, clear=count>0 && count===state.board.filter(Boolean).length;
    return {port,all,waves,marked,count,clear,win:payout(state.popped+count,state.clears+Number(clear),state.bet)};
  }
  function preview(state,number){
    const {count,clear,win,waves}=ignition(state,number);
    return {count,clear,win,waves};
  }
  // The horizontal mouth has five entry sockets. The carton walls never
  // admit a kernel from the side. Inject a batch, let Six Drop settle it and
  // repeat until the mouth is blocked; a sealed pocket remains empty.
  function topUp(input,state,rng){
    let board=input;
    const steps=[],added=[];
    // On a clear the first center kernel settles on the floor before the
    // five-socket flow starts, so a freshly emptied carton can fill all 61.
    let firstEmpty=!board.some(Boolean);
    for(;;){
      const inlets=firstEmpty?[rowIndices[0][2]]:rowIndices[0];
      firstEmpty=false;
      const entries=inlets.filter(i=>!board[i]);
      if(!entries.length)break;
      const before=board;
      board=board.slice();
      const moves=entries.map(to=>{
        const piece=kernel(cells.length+state.refilled++,rng()<state.bombChance,rng,state.turn+1);
        const entry={from:-1,to,x:cells[to].x,y:-5.0,piece};
        board[to]=piece;added.push(entry);
        return entry;
      });
      steps.push({kind:'spawn',before,after:board,moves,ms:110});
      const fall=settle(board);
      board=fall.board;
      for(const frame of fall.steps)steps.push({kind:'fall',...frame});
    }
    if(!added.length)return {board,steps,moves:[]};
    const landings=new Map(board.flatMap((p,i)=>p?[[p.id,i]]:[]));
    return {board,steps,moves:added.map(m=>({...m,to:landings.get(m.piece.id)}))};
  }
  function draw(state,number,rng=Math.random){
    if(state.turn>=8 || !Number.isInteger(number) || number<1 || number>25 || state.drawn.includes(number)) return null;
    const {port,all,waves,marked,count,clear,win}=ignition(state,number);
    const before=state.board, oldWin=state.win;
    const fall=count?settle(before.map((p,i)=>marked.has(i)?null:p)):{board:before,steps:[]};
    const settled=fall.board, fallSteps=fall.steps;
    const {board:after,steps:refillSteps,moves}=topUp(settled,state,rng);
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
    const sugarCrossed=!state.sugarAwarded&&state.popped<state.sugarTarget&&state.popped+count>=state.sugarTarget;
    if(sugarCrossed)state.sugarAwarded=true;
    state.popped+=count;
    state.clears+=Number(clear);
    state.win=win;
    return {before,after,port,all,sugarTarget:state.sugarTarget,sugarCrossed,beforeNumbers,afterNumbers,oldNumber:port<0?null:number,newNumber,waves,settled,fallSteps,refillSteps,moves,count,clear,oldWin,win};
  }
  const api={cells,ports,outline,columns,neighbors,radiusTwo,radiusThree,blastAreas,lightningAxes,settle,motionPoint,bombGrades,bombPower,rainbowBombChance,popPay,clearPay,payout,create,preview,draw};
  root.PopcornEngine=api;
  if(typeof module!=='undefined' && module.exports) module.exports=api;
})(typeof window==='undefined'?globalThis:window);

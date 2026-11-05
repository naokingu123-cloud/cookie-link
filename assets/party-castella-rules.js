/* One fixed griddle: three concentric hexagons and three diameters. */
(function(root){
  'use strict';
  const h=Math.sqrt(3)/2,corners=[[0,-1],[-1,0],[-1,1],[0,1],[1,0],[1,-1]];
  const cells=[{id:0,q:0,r:0,x:0,y:0,ring:0}],rings=[[0]],originalEdges=[],spokes=[0];
  const numbers=Array.from({length:25},(_,i)=>i+1);
  for(let ring=1;ring<=3;ring++){
    const first=cells.length,row=[];
    for(let k=0;k<6*ring;k++){
      const side=Math.floor(k/ring),t=k%ring,a=corners[side],b=corners[(side+1)%6],id=first+k;
      const q=(ring-t)*a[0]+t*b[0],r=(ring-t)*a[1]+t*b[1];
      cells.push({id,q,r,ring,x:q+r/2,y:r*h});row.push(id);
      originalEdges.push([id,first+(k+1)%(6*ring)]);
      if(!t){
        spokes.push(id);
        originalEdges.push([id,rings[ring-1][side*(ring-1)]]);
      }
    }
    rings.push(row);
  }
  const neighbours=cells.map(()=>[]);
  for(const [a,b] of originalEdges){neighbours[a].push(b);neighbours[b].push(a);}
  // Record all incoming passages at each depth. Two branches can fill the same well once.
  const pours=cells.map(({id})=>{
    const first=neighbours[id],near=new Set([id,...first]),second=new Set();
    const flow=first.map(a=>[id,a,1]);
    for(const a of first)for(const b of neighbours[a]){
      if(near.has(b))continue;
      second.add(b);flow.push([a,b,2]);
    }
    return {layers:[[id],first,[...second]],flow};
  });
  function distance(a,b){
    const q=a.q-b.q,r=a.r-b.r;
    return Math.max(Math.abs(q),Math.abs(r),Math.abs(q+r));
  }
  // Heat travels in every direction irrespective of the pouring channels.
  // The opening grid retains 19 fixed diagonal locations. Six extra number sites,
  // six initially filled wells and every special tile are chosen before drawing.
  // The number sites and starter wells are both reflection- and rotation-symmetric.
  const EX0=[8,10,12,14,16,18],EX2=[12,18,21,23,30,32],EX3=[12,18,26,27,35,36];
  const G1=[20,24,29,33],G2=[21,23,30,32],G3=[26,27,35,36];
  // Exact return percent: all 53,130 opening combinations × 1,140 baking triples.
  const molds=[
    {name:'花車',starter:[2,5,9,15,22,31],extras:EX0,flames:[21,30],odds:G3,returnPercent:184.01580136},
    {name:'星影',starter:[9,12,15,18,22,31],extras:EX0,flames:[26,35],odds:G1,returnPercent:194.00156353},
    {name:'花束',starter:[9,15,19,25,28,34],extras:EX0,flames:[26,35],odds:G2,returnPercent:196.25516459},
    {name:'双葉',starter:[2,5,19,25,28,34],extras:EX0,flames:[27,36],odds:G1,returnPercent:197.20979293},
    {name:'雪風',starter:[2,5,9,12,15,18],extras:EX3,flames:[23,32],odds:G1,returnPercent:202.30057093},
    {name:'琥珀',starter:[12,18,19,25,28,34],extras:EX0,flames:[27,36],odds:G2,returnPercent:194.75615752},
    {name:'花冠',starter:[1,3,4,6,12,18],extras:EX3,flames:[23,32],odds:G1,returnPercent:199.66070512},
    {name:'雪華',starter:[8,10,12,14,16,18],extras:EX3,flames:[21,30],odds:G1,returnPercent:205.07326155},
    {name:'六華',starter:[8,10,14,16,22,31],extras:EX2,flames:[26,35],odds:G1,returnPercent:217.32889305},
    {name:'金華',starter:[19,22,25,28,31,34],extras:EX0,flames:[20,29],odds:G2,returnPercent:217.23334126}
  ];
  const heatRadii=[null,1,2,3].map(r=>r?cells.map(a=>cells.filter(b=>distance(a,b)<=r).map(b=>b.id)):null);
  const ODDS_STEP=50; // Each activated honey tile adds +0.5x to the final base odds.
  // The previous payout-calibration samples assumed separate oven sites. Under the
  // corrected rule (20 original numbered sites), exhaustively recomputed returns
  // range from 184% to 217% for these six-batter symmetry-preserving layouts.
  // Map the 50–150 selection to progressively richer layouts while exposing the
  // ACTUAL theoretical return; never mislabel it as an achieved 50–150% RTP.
  const minReturn=Math.min(...molds.map(x=>x.returnPercent));
  const maxReturn=Math.max(...molds.map(x=>x.returnPercent));
  function effectiveTarget(requested){
    const input=Math.max(50,Math.min(150,Number.isFinite(requested)?requested:90));
    return minReturn+(input-50)*(maxReturn-minReturn)/100;
  }
  function isSymmetric(ids){
    const set=new Set(ids),lookup=new Map(cells.map(c=>[c.q+','+c.r,c.id]));
    return ids.every(i=>{
      const {q,r}=cells[i],reflection=lookup.get((-q-r)+','+r),turn=lookup.get((-q)+','+(-r));
      return set.has(reflection)&&set.has(turn);
    });
  }
  function verifyMolds(){
    for(const board of molds){
      const markers=[...board.flames,...board.odds],numbered=new Set([...spokes,...board.extras]);
      if(board.starter.length!==6||board.extras.length!==6||
         board.flames.length!==2||board.odds.length!==4||new Set(markers).size!==6||
         markers.some(i=>numbered.has(i)||board.starter.includes(i))||
         !isSymmetric(board.starter)||!isSymmetric([...numbered]))
        throw new Error('Invalid Party Castella layout: '+board.name);
    }
  }
  verifyMolds();
  const rates=[20,40,60,80,100,120,140,160,180,200,250,300,400,500,750,1000,2000,5000];
  const payRows=rates.map((hundredths,i)=>({count:20+i,hundredths}));
  function payout(count,oddsHits=0){return count<20?0:(rates[count-20]||0)+ODDS_STEP*oddsHits;}
  function shuffled(rng){
    const list=numbers.slice();
    for(let i=list.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[list[i],list[j]]=[list[j],list[i]];}
    return list;
  }
  function create({rng=Math.random,target=90}={}){
    const rate=effectiveTarget(target);
    const lower=molds.map((m,i)=>({m,i})).filter(x=>x.m.returnPercent<=rate+1e-8);
    const upper=molds.map((m,i)=>({m,i})).filter(x=>x.m.returnPercent>=rate-1e-8);
    // Pick a random bracketing PAIR rather than adjacent tiers so more than two
    // symmetric designs can appear at a given middle setting without changing
    // the expected return of that setting.
    const lo=lower[Math.floor(rng()*lower.length)],hi=upper[Math.floor(rng()*upper.length)];
    const weight=lo.i===hi.i?0:(rate-lo.m.returnPercent)/(hi.m.returnPercent-lo.m.returnPercent);
    return createBoard(rng()<weight?hi.i:lo.i,rate,rng,target);
  }
  function createBoard(moldIndex,target,rng,requestedTarget=target){
    const board=molds[moldIndex],labels=Array(37).fill(null),deck=shuffled(rng);
    [...spokes,...board.extras].forEach((id,i)=>{labels[id]=deck[i];});
    return {draws:[],phase:'pour',cells:cells.map(c=>({...c,number:labels[c.id]})),
      edges:originalEdges,boardName:board.name,moldIndex,target,requestedTarget,
      zones:[],zoneByNumber:Array(26).fill(null),
      specials:{fire:board.flames.slice(),odds:board.odds.slice()},
      wet:cells.map(c=>board.starter.includes(c.id)),baked:Array(37).fill(false),
      wetCount:6,bakedCount:0,fireLevel:1,oddsHits:0,oddsBonus:0,
      lastNumber:null,lastZone:null,sources:[],flow:[],wave:[],
      totalHundredths:0,highestRole:false};
  }
  function deal(state,draws,fireLevel){
    // Reuse the ORIGINAL numbered wells: five pouring hits vanish, twenty keep positions.
    const remaining=state.cells.filter(c=>c.number!==null&&!draws.includes(c.number));
    const zoneByNumber=Array(26).fill(null);
    const zones=remaining.map((cell,i)=>{
      const zone={id:i+1,name:'焼き型',anchor:cell.id,numbers:[cell.number],
        radius:fireLevel,cells:heatRadii[fireLevel][cell.id]};
      zoneByNumber[cell.number]=zone.id;
      return zone;
    });
    return {zones,zoneByNumber};
  }
  function zoneFor(number,state){return state?.zoneByNumber[number]??null;}
  function draw(state,number){
    if(state.draws.length>=8||!Number.isInteger(number)||number<1||number>25||state.draws.includes(number))return null;
    const draws=[...state.draws,number],ball=draws.length;
    if(ball<=5){
      const id=state.cells.find(c=>c.number===number).id,wet=state.wet.slice(),{flow,layers}=pours[id];
      const wave=layers.map(layer=>layer.filter(i=>!wet[i]));
      for(const layer of wave)for(const i of layer)wet[i]=true;
      const fireLevel=1+state.specials.fire.filter(i=>wet[i]).length;
      const oddsHits=state.specials.odds.filter(i=>wet[i]).length;
      return {...state,...(ball===5?deal(state,draws,fireLevel):{}),draws,
        phase:ball===5?'bake':'pour',lastNumber:number,fireLevel,oddsHits,
        oddsBonus:ODDS_STEP*oddsHits,
        sources:[id],flow,wave,wet,wetCount:wet.filter(Boolean).length};
    }
    const lastZone=zoneFor(number,state),zone=state.zones[lastZone-1],baked=state.baked.slice(),wave=[[],[],[],[]];
    for(const id of zone.cells){
      if(!state.wet[id]||baked[id])continue;
      baked[id]=true;wave[distance(cells[id],cells[zone.anchor])].push(id);
    }
    const bakedCount=baked.filter(Boolean).length,done=ball===8;
    return {...state,draws,phase:done?'done':'bake',lastNumber:number,lastZone,sources:[zone.anchor],flow:[],wave,
      baked,bakedCount,totalHundredths:done?payout(bakedCount,state.oddsHits):0,highestRole:done&&bakedCount===37};
  }
  function createDemo(){
    let seed=1015568748;
    const state=createBoard(0,90,()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32));
    const opening=[0,19,25,28,34].map(id=>state.cells[id].number);
    const bakedBoard=opening.reduce(draw,state);
    let closing=null;
    outer:for(let a=0;a<20;a++)for(let b=a+1;b<20;b++)for(let c=b+1;c<20;c++){
      const zones=[bakedBoard.zones[a],bakedBoard.zones[b],bakedBoard.zones[c]];
      const mask=new Set(zones.flatMap(z=>z.cells));
      if(mask.size===37){
        closing=zones.map(z=>z.numbers[0]);break outer;
      }
    }
    return {state,draws:[...opening,...(closing||bakedBoard.zones.slice(0,3).map(z=>z.numbers[0]))]};
  }
  const api={cells,originalEdges,zoneFor,effectiveTarget,create,createBoard,createDemo,draw,payRows,payout,molds,ODDS_STEP,minReturn,maxReturn};
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.PartyCastellaRules=api;
})(globalThis);

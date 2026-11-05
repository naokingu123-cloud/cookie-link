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
  const heat=cells.map(a=>cells.filter(b=>distance(a,b)<=2).map(b=>b.id));
  // The opening grid retains 19 fixed diagonal locations. Six extra number sites,
  // six initially filled wells and every special tile are chosen before drawing.
  // The number sites and starter wells are both reflection- and rotation-symmetric.
  const EX0=[8,10,12,14,16,18],EX2=[12,18,21,23,30,32],EX3=[12,18,26,27,35,36];
  const O265=[12,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36];
  const O260=[8,10,12,14,16,18,19,21,22,23,25,26,27,28,30,31,32,34,35,36];
  const O255=[8,9,10,14,15,16,19,20,22,24,25,26,27,28,29,31,33,34,35,36];
  const O245=[7,11,12,13,17,18,19,20,21,22,23,24,25,28,29,30,31,32,33,34];
  const O205=[2,5,8,10,14,16,19,20,22,24,25,26,27,28,29,31,33,34,35,36];
  const G1=[20,24,29,33],G2=[21,23,30,32],G3=[26,27,35,36];
  // Exact return percent: all 53,130 opening combinations × 1,140 baking triples.
  const molds=[
    {name:'花車',starter:[2,5,9,15,22,31],extras:EX0,ovens:O265,flames:[21,30],odds:G3,returnPercent:100.329207274},
    {name:'星影',starter:[9,12,15,18,22,31],extras:EX0,ovens:O265,flames:[26,35],odds:G1,returnPercent:106.956627207},
    {name:'花束',starter:[9,15,19,25,28,34],extras:EX0,ovens:O265,flames:[26,35],odds:G2,returnPercent:111.914012832},
    {name:'双葉',starter:[2,5,19,25,28,34],extras:EX0,ovens:O265,flames:[27,36],odds:G1,returnPercent:112.097422872},
    {name:'雪風',starter:[2,5,9,12,15,18],extras:EX3,ovens:O265,flames:[23,32],odds:G1,returnPercent:116.196845671},
    {name:'琥珀',starter:[12,18,19,25,28,34],extras:EX0,ovens:O260,flames:[27,36],odds:G2,returnPercent:131.510620292},
    {name:'花冠',starter:[1,3,4,6,12,18],extras:EX3,ovens:O255,flames:[23,32],odds:G1,returnPercent:133.323314214},
    {name:'雪華',starter:[8,10,12,14,16,18],extras:EX3,ovens:O245,flames:[21,30],odds:G1,returnPercent:134.965883748},
    {name:'六華',starter:[8,10,14,16,22,31],extras:EX2,ovens:O245,flames:[26,35],odds:G1,returnPercent:148.456562222},
    {name:'金華',starter:[19,22,25,28,31,34],extras:EX0,ovens:O205,flames:[20,29],odds:G2,returnPercent:160.042278423}
  ];
  const heatRadii=[null,1,2,3].map(r=>r?cells.map(a=>cells.filter(b=>distance(a,b)<=r).map(b=>b.id)):null);
  const ODDS_STEP=20; // Each activated honey tile increases all final odds by +0.2x.
  function effectiveTarget(requested){
    return Math.max(molds[0].returnPercent,Math.min(molds[molds.length-1].returnPercent,
      Number.isFinite(requested)?requested:90));
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
      if(board.starter.length!==6||board.extras.length!==6||board.ovens.length!==20||
         board.flames.length!==2||board.odds.length!==4||new Set(markers).size!==6||
         markers.some(i=>numbered.has(i)||board.starter.includes(i))||
         !isSymmetric(board.starter)||!isSymmetric([...numbered])||!isSymmetric(board.ovens))
        throw new Error('Invalid Party Castella layout: '+board.name);
    }
  }
  verifyMolds();
  const rates=[20,40,60,80,100,120,140,160,180,200,250,300,400,500,750,1000,2000,5000];
  const payRows=rates.map((hundredths,i)=>({count:20+i,hundredths}));
  function payout(count,oddsHits=0){return Math.round((rates[count-20]||0)*(100+ODDS_STEP*oddsHits)/100);}
  function shuffled(rng){
    const list=numbers.slice();
    for(let i=list.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[list[i],list[j]]=[list[j],list[i]];}
    return list;
  }
  function create({rng=Math.random,target=90}={}){
    const rate=effectiveTarget(target);
    let index=0;
    while(index<molds.length-2&&molds[index+1].returnPercent<rate)index++;
    const lo=molds[index].returnPercent,hi=molds[index+1].returnPercent;
    return createBoard(index+Number(rng()<(rate-lo)/(hi-lo)),rate,rng,target);
  }
  function createBoard(moldIndex,target,rng,requestedTarget=target){
    const board=molds[moldIndex],labels=Array(37).fill(null),deck=shuffled(rng);
    [...spokes,...board.extras].forEach((id,i)=>{labels[id]=deck[i];});
    const zones=board.ovens.map((anchor,i)=>({id:i+1,name:'焼き型',anchor,
      cells:heatRadii[1][anchor],numbers:[],radius:1}));
    return {draws:[],phase:'pour',cells:cells.map(c=>({...c,number:labels[c.id]})),
      edges:originalEdges,boardName:board.name,moldIndex,target,requestedTarget,
      ovenDeck:shuffled(rng),zones,zoneByNumber:Array(26).fill(null),
      specials:{fire:board.flames.slice(),odds:board.odds.slice()},
      wet:cells.map(c=>board.starter.includes(c.id)),baked:Array(37).fill(false),
      wetCount:6,bakedCount:0,fireLevel:1,oddsHits:0,oddsMultiplier:100,
      lastNumber:null,lastZone:null,sources:[],flow:[],wave:[],
      totalHundredths:0,highestRole:false};
  }
  function deal(state,draws,fireLevel){
    const remaining=state.ovenDeck.filter(n=>!draws.includes(n)),zoneByNumber=Array(26).fill(null);
    const zones=state.zones.map((zone,i)=>{
      const n=remaining[i];zoneByNumber[n]=zone.id;
      return {...zone,numbers:[n],radius:fireLevel,cells:heatRadii[fireLevel][zone.anchor]};
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
        oddsMultiplier:100+ODDS_STEP*oddsHits,
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
  const api={cells,originalEdges,zoneFor,effectiveTarget,create,createDemo,draw,payRows,payout,molds,ODDS_STEP};
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.PartyCastellaRules=api;
})(globalThis);

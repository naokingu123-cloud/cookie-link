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
  const sideMids=rings[2].filter((_,i)=>i%2===1);
  const outerAxis=rings[3].filter(i=>cells[i].r===0);
  const outerQuartet=rings[3].filter(i=>Math.abs(cells[i].x)===2.5);
  // The 19 diagonal number sites are common to every board. Each opening pattern adds six.
  const polarSix=[...sideMids.filter(i=>cells[i].x===0),...rings[3].filter(i=>Math.abs(cells[i].x)===.5)];
  const alternateSides=[0,1].map(side=>rings[3].filter((_,i)=>i%3!==0&&Math.floor(i/3)%2===side));
  // Each sum is the total payout in hundredths over C(25,5) × C(20,3) equiprobable outcomes.
  // Both number-site patterns are selected before the first draw.
  const outcomes=53130*1140;
  const molds=[
    {name:'花びら型',extras:[sideMids],ovens:[...sideMids,...rings[3].filter(i=>!outerQuartet.includes(i))],returnPercent:3007002940/outcomes},
    {name:'花冠型',extras:[polarSix],ovens:[...rings[1],...rings[2],...outerAxis],returnPercent:5515915680/outcomes},
    {name:'輪飾り型',extras:alternateSides,ovens:[...rings[1],...rings[2].filter(i=>cells[i].r!==0),...outerQuartet],returnPercent:5852976590/outcomes}
  ];
  function effectiveTarget(requested){
    return Math.max(50,Math.min(molds[2].returnPercent,Number.isFinite(requested)?requested:90));
  }
  const rates=[20,40,60,80,100,120,140,160,180,200,250,300,400,500,750,1000,2000,5000];
  const payRows=rates.map((hundredths,i)=>({count:20+i,hundredths}));
  function payout(count){return rates[count-20]||0;}
  function shuffled(rng){
    const list=numbers.slice();
    for(let i=list.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[list[i],list[j]]=[list[j],list[i]];}
    return list;
  }
  function create({rng=Math.random,target=90}={}){
    const rate=effectiveTarget(target);
    const i=rate<molds[1].returnPercent?0:1,lo=molds[i].returnPercent,hi=molds[i+1].returnPercent;
    return createBoard(i+Number(rng()<(rate-lo)/(hi-lo)),rate,rng);
  }
  function createBoard(moldIndex,target,rng){
    const board=molds[moldIndex],labels=Array(37).fill(null),deck=shuffled(rng);
    const extras=board.extras.length===1?board.extras[0]:board.extras[Math.floor(rng()*board.extras.length)];
    [...spokes,...extras].forEach((id,i)=>{labels[id]=deck[i];});
    const zones=board.ovens.map((anchor,i)=>({id:i+1,name:'焼き型',anchor,cells:heat[anchor],numbers:[]}));
    return {draws:[],phase:'pour',cells:cells.map(c=>({...c,number:labels[c.id]})),edges:originalEdges,
      boardName:board.name,moldIndex,target,ovenDeck:shuffled(rng),zones,zoneByNumber:Array(26).fill(null),
      wet:Array(37).fill(false),baked:Array(37).fill(false),wetCount:0,bakedCount:0,lastNumber:null,lastZone:null,
      sources:[],flow:[],wave:[],totalHundredths:0,highestRole:false};
  }
  function deal(state,draws){
    const remaining=state.ovenDeck.filter(n=>!draws.includes(n)),zoneByNumber=Array(26).fill(null);
    const zones=state.zones.map((zone,i)=>{
      const n=remaining[i];zoneByNumber[n]=zone.id;
      return {...zone,numbers:[n]};
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
      return {...state,...(ball===5?deal(state,draws):{}),draws,phase:ball===5?'bake':'pour',lastNumber:number,
        sources:[id],flow,wave,wet,wetCount:wet.filter(Boolean).length};
    }
    const lastZone=zoneFor(number,state),zone=state.zones[lastZone-1],baked=state.baked.slice(),wave=[[],[],[]];
    for(const id of zone.cells){
      if(!state.wet[id]||baked[id])continue;
      baked[id]=true;wave[distance(cells[id],cells[zone.anchor])].push(id);
    }
    const bakedCount=baked.filter(Boolean).length,done=ball===8;
    return {...state,draws,phase:done?'done':'bake',lastNumber:number,lastZone,sources:[zone.anchor],flow:[],wave,
      baked,bakedCount,totalHundredths:done?payout(bakedCount):0,highestRole:done&&bakedCount===37};
  }
  function createDemo(){
    let seed=1015568748;
    const state=createBoard(1,90,()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32));
    const opening=[26,22,19,0,31].map(id=>state.cells[id].number);
    const bakedBoard=opening.reduce(draw,state);
    const closing=[8,12,16].map(id=>bakedBoard.zones.find(z=>z.anchor===id).numbers[0]);
    return {state,draws:[...opening,...closing]};
  }
  const api={cells,originalEdges,zoneFor,effectiveTarget,create,createDemo,draw,payRows,payout};
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.PartyCastellaRules=api;
})(globalThis);

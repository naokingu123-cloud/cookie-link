/* Party Castella. Each numbered well pours two passages on its round's hexagonal mold. */
(function(root){
  'use strict';
  // Ring order follows the drawing, anticlockwise from the upper-left corner.
  const h=Math.sqrt(3)/2,corners=[[-.5,-h],[-1,0],[-.5,h],[.5,h],[1,0],[.5,-h]];
  const cells=[{id:0,x:0,y:0,ring:0}],rings=[[0]],originalEdges=[],spokes=[0];
  const numbers=Array.from({length:25},(_,i)=>i+1);
  for(let r=1;r<=3;r++){
    const first=cells.length,ring=[];
    for(let k=0;k<6*r;k++){
      const side=Math.floor(k/r),t=k%r,a=corners[side],b=corners[(side+1)%6],id=first+k;
      cells.push({id,ring:r,x:(r-t)*a[0]+t*b[0],y:(r-t)*a[1]+t*b[1]});
      ring.push(id);
      originalEdges.push([id,first+(k+1)%(6*r)]);
      if(!t){
        spokes.push(id);
        originalEdges.push([id,r===1?0:rings[r-1][side*(r-1)]]);
      }
    }
    rings.push(ring);
  }

  // One connector motif per side. The original 54 channels remain on every mold.
  // Put 19 numbers on the three diameters (center counted once), plus one orbit of six.
  function mold(name,kind,returnPercent){
    const edges=originalEdges.slice(),places=spokes.slice();
    for(let side=0;side<6;side++){
      const mid=rings[2][2*side+1],outerA=rings[3][3*side+1],outerB=rings[3][3*side+2];
      if(kind==='crown'){
        const corner=rings[2][2*side];
        edges.push([corner,outerA],[corner,rings[3][(3*side+17)%18]]);
        places.push(mid);
      }else{
        edges.push([mid,outerA]);
        if(kind==='petal')edges.push([mid,outerB]);
        places.push(kind==='petal'?outerA:outerB);
      }
    }
    const adjacent=cells.map(()=>[]);
    for(const [a,b] of edges){adjacent[a].push(b);adjacent[b].push(a);}
    const layers=cells.map(({id})=>{
      const one=adjacent[id],two=new Set(one.flatMap(i=>adjacent[i]));
      two.delete(id);for(const i of one)two.delete(i);
      return [[id],one,[...two]];
    });
    return {name,edges,places,returnPercent,layers};
  }
  // Exact returns from C(25,5) × C(20,3) for each mold; see party-castella.cjs --balance.
  const molds=[mold('風車型','pinwheel',48.1352982258),mold('花びら型','petal',84.6664254510),mold('王冠型','crown',274.7920383964)];
  const fullBonusHundredths=45000;
  const payRows=[[20,20],[24,30],[27,100],[30,120],[32,200],[33,400],[34,1000],[35,2500],[36,5000],[37,5000+fullBonusHundredths]]
    .map(([count,hundredths])=>({count,hundredths}));
  function payout(count){return payRows.findLast(row=>count>=row.count)?.hundredths||0;}
  function shuffled(rng){
    const list=numbers.slice();
    for(let i=list.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[list[i],list[j]]=[list[j],list[i]];}
    return list;
  }

  // The three ordinary oven numbers cover two lobes, each of six cells. Both boundary
  // rays belong to exactly one lobe each. A cup belongs to two ordinary ovens and one
  // of the special three-petal ovens, hence exactly 3+3+1 of 20 numbers cover it.
  const lobes=corners.map((_,side)=>rings.slice(1).flatMap((r,k)=>r.slice(side*(k+1),(side+1)*(k+1))));
  const zoneNames=['左上','左','左下','右下','右','右上','三つ葉・朱','三つ葉・藍'];
  function ovens(axis,parity){
    return zoneNames.map((name,i)=>{
      const ids=i<6?[...lobes[(i+5)%6],...lobes[i]]:[...lobes[i-6],...lobes[i-4],...lobes[i-2]];
      if(i<6?i%3===axis:i-6===parity)ids.unshift(0);
      return {id:i+1,name,cells:ids,numbers:[]};
    });
  }
  function deal(state,draws){
    const remaining=state.ovenDeck.filter(n=>!draws.includes(n));
    const zoneByNumber=Array(26).fill(null);
    const zones=state.zones.map((zone,i)=>{
      const group=remaining.slice(i<6?3*i:18+i-6,i<6?3*i+3:19+i-6).sort((a,b)=>a-b);
      for(const n of group)zoneByNumber[n]=zone.id;
      return {...zone,numbers:group};
    });
    return {zones,zoneByNumber};
  }
  // Anchor the normal setting at 25% pinwheels so that all three molds appear.
  // Interpolating two calibrated mixes also interpolates their exact expected return.
  const [windRate,petalRate,crownRate]=molds.map(m=>m.returnPercent);
  const mixes=[
    {target:50,wind:(petalRate-50)/(petalRate-windRate),crown:0},
    {target:90,wind:.25,crown:(90-(.25*windRate+.75*petalRate))/(crownRate-petalRate)},
    {target:150,wind:0,crown:(150-petalRate)/(crownRate-petalRate)}
  ];
  function create({rng=Math.random,target=90}={}){
    const rate=Math.max(50,Math.min(150,Number.isFinite(target)?target:90));
    const i=rate<=90?0:1,a=mixes[i],b=mixes[i+1],t=(rate-a.target)/(b.target-a.target);
    const wind=a.wind+(b.wind-a.wind)*t,crown=a.crown+(b.crown-a.crown)*t;
    const roll=rng();
    return createBoard(roll<crown?2:roll<1-wind?1:0,rate,rng);
  }
  function createBoard(moldIndex,rate,rng){
    const board=molds[moldIndex],labels=Array(37).fill(null),deck=shuffled(rng);
    board.places.forEach((id,i)=>{labels[id]=deck[i];});
    return {draws:[],phase:'pour',cells:cells.map(c=>({...c,number:labels[c.id]})),edges:board.edges,
      boardName:board.name,moldIndex,target:rate,ovenDeck:shuffled(rng),zones:ovens(Math.floor(rng()*3),Math.floor(rng()*2)),
      zoneByNumber:Array(26).fill(null),wet:Array(37).fill(false),baked:Array(37).fill(false),wetCount:0,bakedCount:0,
      lastNumber:null,lastZone:null,sources:[],wave:[],totalHundredths:0,highestRole:false};
  }
  function zoneFor(number,state){return state?.zoneByNumber[number]??null;}
  function draw(state,number){
    if(state.draws.length>=8||!Number.isInteger(number)||number<1||number>25||state.draws.includes(number))return null;
    const draws=[...state.draws,number],ball=draws.length;
    if(ball<=5){
      const id=state.cells.find(c=>c.number===number).id,wet=state.wet.slice();
      const wave=molds[state.moldIndex].layers[id].map(layer=>layer.filter(i=>!wet[i]));
      for(const layer of wave)for(const i of layer)wet[i]=true;
      return {...state,...(ball===5?deal(state,draws):{}),draws,phase:ball===5?'bake':'pour',lastNumber:number,
        sources:[id],wave,wet,wetCount:wet.filter(Boolean).length};
    }
    const lastZone=zoneFor(number,state),baked=state.baked.slice(),wave=[[],[],[],[]];
    for(const id of state.zones[lastZone-1].cells){
      if(!state.wet[id]||baked[id])continue;
      baked[id]=true;wave[3-cells[id].ring].push(id);
    }
    const bakedCount=baked.filter(Boolean).length,done=ball===8;
    return {...state,draws,phase:done?'done':'bake',lastNumber:number,lastZone,sources:[],wave,baked,bakedCount,
      totalHundredths:done?payout(bakedCount):0,highestRole:done&&state.wetCount===37&&bakedCount===37};
  }
  function createDemo(){
    let seed=1015568748;
    const state=createBoard(1,90,()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32));
    const opening=[0,7,13,23,32].map(id=>state.cells[id].number);
    const bakedBoard=opening.reduce(draw,state);
    return {state,draws:[...opening,...[0,2,4].map(i=>bakedBoard.zones[i].numbers[0])]};
  }
  const api={cells,originalEdges,zoneFor,create,createDemo,draw,payRows,payout,fullBonusHundredths};
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.PartyCastellaRules=api;
})(globalThis);

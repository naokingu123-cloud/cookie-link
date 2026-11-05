/* Party Castella: concentric channels and six radial spokes on a 37-cup mold. */
(function(root){
  'use strict';
  // Start at the upper left and walk anticlockwise, following the six arrows on the drawing.
  const corners=[[-.5,-Math.sqrt(3)/2],[-1,0],[-.5,Math.sqrt(3)/2],[.5,Math.sqrt(3)/2],[1,0],[.5,-Math.sqrt(3)/2]];
  const labels=[
    [7],
    [14,16,18,19,17,15],
    [8,21,10,23,12,25,13,24,11,22,9,20],
    [1,21,null,3,23,null,5,25,null,6,24,null,4,22,null,2,20,null]
  ];
  const cells=[{id:0,x:0,y:0,ring:0,number:7}],edges=[];
  const rings=[[0]];
  for(let ring=1;ring<=3;ring++){
    const first=cells.length,ids=[];
    for(let step=0;step<6*ring;step++){
      const side=Math.floor(step/ring),offset=step%ring,id=first+step;
      const a=corners[side],b=corners[(side+1)%6];
      cells.push({id,ring,x:(ring-offset)*a[0]+offset*b[0],y:(ring-offset)*a[1]+offset*b[1],number:labels[ring][step]});
      ids.push(id);
      edges.push([id,first+(step+1)%(6*ring)]);
      if(offset===0)edges.push([id,ring===1?0:rings[ring-1][side*(ring-1)]]);
    }
    rings.push(ids);
  }
  const adjacent=cells.map(()=>[]),inlets=Array.from({length:26},()=>[]);
  for(const [a,b] of edges){adjacent[a].push(b);adjacent[b].push(a);}
  for(const c of cells)if(c.number!==null)inlets[c.number].push(c.id);

  // Six 120-degree wedges, including both bounding rays. Alternating ovens cover all cups.
  const zones=['左上','左','左下','右下','右','右上'].map((name,side)=>{
    const ids=[0];
    for(let r=1;r<=3;r++)for(let i=-r;i<=r;i++){
      ids.push(rings[r][(side*r+i+6*r)%(6*r)]);
    }
    return {id:side+1,name,cells:ids};
  });
  const zoneFor=number=>1+(number-1)%6;
  const fullBakeDraws=Object.freeze([1,2,3,12,24,7,9,11]);
  const fullBonusHundredths=45000;
  const payRows=[[20,20],[24,30],[27,100],[30,120],[32,200],[33,400],[34,1000],[35,2500],[36,5000],[37,5000+fullBonusHundredths]]
    .map(([count,hundredths])=>({count,hundredths}));
  function payout(count){
    return payRows.findLast(row=>count>=row.count)?.hundredths||0;
  }

  // Two steps from this draw's source(s), using ONLY the inked channels. Already-wet
  // neighbors transmit, but cannot restart the two-step range. Multi-source waves meet once.
  function pourLayers(sources){
    const seen=new Set(sources),layers=[sources];
    for(let step=1;step<=2;step++){
      const next=[];
      for(const id of layers[step-1])for(const neighbor of adjacent[id]){
        if(!seen.has(neighbor)){seen.add(neighbor);next.push(neighbor);}
      }
      layers.push(next);
    }
    return layers;
  }
  const emptyMask=()=>Array(37).fill(false);
  function create(){
    return {draws:[],phase:'pour',wet:emptyMask(),baked:emptyMask(),wetCount:0,bakedCount:0,
      lastNumber:null,lastZone:null,sources:[],wave:[],totalHundredths:0,highestRole:false};
  }
  function draw(state,number){
    if(state.draws.length>=8||!Number.isInteger(number)||number<1||number>25||state.draws.includes(number))return null;
    const draws=[...state.draws,number],ball=draws.length;
    if(ball<=5){
      const sources=inlets[number].slice();
      const wet=state.wet.slice(),wave=pourLayers(sources).map(layer=>layer.filter(i=>!wet[i]));
      for(const layer of wave)for(const i of layer)wet[i]=true;
      return {...state,draws,phase:ball===5?'bake':'pour',lastNumber:number,sources,wave,wet,wetCount:wet.filter(Boolean).length};
    }
    const lastZone=zoneFor(number),baked=state.baked.slice(),wave=[[],[],[],[]];
    for(const id of zones[lastZone-1].cells){
      if(!state.wet[id]||baked[id])continue;
      baked[id]=true;wave[3-cells[id].ring].push(id);
    }
    const bakedCount=baked.filter(Boolean).length,done=ball===8;
    return {...state,draws,phase:done?'done':'bake',lastNumber:number,lastZone,sources:[],wave,baked,bakedCount,
      totalHundredths:done?payout(bakedCount):0,highestRole:done&&state.wetCount===37&&bakedCount===37};
  }
  const api={cells,edges,zones,zoneFor,create,draw,payRows,payout,fullBonusHundredths,fullBakeDraws};
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.PartyCastellaRules=api;
})(globalThis);

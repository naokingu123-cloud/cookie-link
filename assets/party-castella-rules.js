/* Ten geometric griddles: fixed visible budgets, calibrated number/channel layouts. */
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
  const coordinateIds=new Map(cells.map(c=>[c.q+','+c.r,c.id]));
  function transformId(id,orientation=0){
    let {q,r}=cells[id];if(orientation&1)q=-q-r;
    for(let k=0;k<(orientation>>1);k++){const next=q+r;r=-q;q=next;}
    return coordinateIds.get(q+','+r);
  }
  const channelCache=new Map(),flowCache=new WeakMap();
  // Every family has the same 36 perimeter and 18 radial links. Each segment
  // connects adjacent hex cells; the renderer draws these exact state.edges.
  function channelEdges(pattern=0,orientation=0){
    const key=pattern+':'+orientation;if(channelCache.has(key))return channelCache.get(key);
    const edges=[];for(let ring=1;ring<=3;ring++)for(let k=0;k<rings[ring].length;k++)edges.push([rings[ring][k],rings[ring][(k+1)%rings[ring].length]]);
    for(let id=1;id<=6;id++)edges.push([0,id]);
    const inner=[[1,7],[1,8],[1,18]][Math.floor(pattern/5)],outer=[[7,19],[7,20],[7,36],[8,20],[8,21]][pattern%5];
    for(const pair of [inner,outer])for(let k=0;k<6;k++)edges.push(pair.map(id=>transformId(id,k*2)));
    const mapped=edges.map(pair=>pair.map(id=>transformId(id,orientation)));channelCache.set(key,mapped);return mapped;
  }
  function passages(edges){
    if(flowCache.has(edges))return flowCache.get(edges);
    const neighbours=cells.map(()=>[]);for(const [a,b] of edges){neighbours[a].push(b);neighbours[b].push(a);}
    const result=cells.map(({id})=>{
      const first=neighbours[id],near=new Set([id,...first]),second=new Set(),flow=first.map(a=>[id,a,1]);
      for(const a of first)for(const b of neighbours[a]){if(near.has(b))continue;second.add(b);flow.push([a,b,2]);}
      return {layers:[[id],first,[...second]],flow};
    });flowCache.set(edges,result);return result;
  }
  function distance(a,b){
    const q=a.q-b.q,r=a.r-b.r;
    return Math.max(Math.abs(q),Math.abs(r),Math.abs(q+r));
  }
  // Heat keeps the original hex-radius rule. All settings have six initially
  // filled wells, one FIRE and two ODDS tiles. The 25 unique number locations
  // retain the centre plus all 18 diagonal locations; number sites and starter
  // wells have half-turn symmetry. No future roulette draw is consulted.
  // Exact gross RTP per mold enumerates C(25,5) * C(20,3)=60,568,200 outcomes.
  const molds=[
    {"name":"花車","starter":[2,5,9,15,22,31],"extras":[8,10,12,14,16,18],"flames":[21],"odds":[26,35],"channelPattern":0,"returnPercent":74.485511208852},
    {"name":"星影","starter":[1,4,8,12,14,18],"extras":[20,26,27,29,35,36],"flames":[32],"odds":[10,16],"channelPattern":14,"returnPercent":40.306441168798},
    {"name":"花束","starter":[3,6,7,10,13,16],"extras":[12,18,24,27,33,36],"flames":[21],"odds":[8,14],"channelPattern":3,"returnPercent":45.715922216609},
    {"name":"双葉","starter":[1,3,4,6,9,15],"extras":[8,14,21,27,30,36],"flames":[33],"odds":[20,29],"channelPattern":1,"returnPercent":62.857485941468},
    {"name":"雪風","starter":[3,6,8,12,14,18],"extras":[8,12,14,18,26,35],"flames":[30],"odds":[10,16],"channelPattern":1,"returnPercent":79.08057313904},
    {"name":"琥珀","starter":[12,18,23,27,32,36],"extras":[8,14,23,27,32,36],"flames":[26],"odds":[10,16],"channelPattern":6,"returnPercent":96.44431591165},
    {"name":"花冠","starter":[1,4,7,13,27,36],"extras":[8,14,24,27,33,36],"flames":[10],"odds":[26,35],"channelPattern":12,"returnPercent":115.63653526108},
    {"name":"雪華","starter":[3,6,9,15,20,29],"extras":[10,16,24,27,33,36],"flames":[18],"odds":[8,14],"channelPattern":0,"returnPercent":133.51669052407},
    {"name":"六華","starter":[19,23,25,28,32,34],"extras":[12,18,23,24,32,33],"flames":[8],"odds":[10,16],"channelPattern":9,"returnPercent":154.89629946077},
    {"name":"金華","starter":[19,21,25,28,30,34],"extras":[12,18,20,23,29,32],"flames":[14],"odds":[10,16],"channelPattern":13,"returnPercent":168.43139502247}
  ];
  const heatRadii=[null,1,2,3].map(r=>r?cells.map(a=>cells.filter(b=>distance(a,b)<=r).map(b=>b.id)):null);
  const ODDS_STEP=50; // Each honey tile adds 50% of the BASE payout: ×(1+0.5*n).
  const FIRE_COUNT=1,ODDS_COUNT=2;
  const minReturn=Math.min(...molds.map(x=>x.returnPercent)),maxReturn=Math.max(...molds.map(x=>x.returnPercent));
  function effectiveTarget(requested){return Math.max(50,Math.min(150,Number.isFinite(Number(requested))?Number(requested):90));}
  function isSymmetric(ids){
    const set=new Set(ids);return ids.every(id=>set.has(transformId(id,6)));
  }
  function verifyMolds(){
    for(const board of molds){
      const markers=[...board.flames,...board.odds],numbered=new Set([...spokes,...board.extras]);
      if(board.starter.length!==6||board.extras.length!==6||
         board.flames.length!==FIRE_COUNT||board.odds.length!==ODDS_COUNT||new Set(markers).size!==FIRE_COUNT+ODDS_COUNT||
         markers.some(i=>numbered.has(i)||board.starter.includes(i))||
         !isSymmetric(board.starter)||!isSymmetric([...numbered]))
        throw new Error('Invalid Party Castella layout: '+board.name);
    }
  }
  verifyMolds();
  const rates=[20,40,60,80,100,120,140,160,180,200,250,300,400,500,750,1000,2000,5000];
  const payRows=rates.map((hundredths,i)=>({count:20+i,hundredths}));
  function payout(count,oddsHits=0){
    const base=count>=20&&count<=37?rates[count-20]:0;
    return Math.round(base*(100+ODDS_STEP*oddsHits)/100);
  }
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
  function createBoard(moldIndex,target,rng=Math.random,requestedTarget=target,forcedOrientation=null){
    const board=molds[moldIndex],orientation=forcedOrientation??Math.floor(rng()*12),labels=Array(37).fill(null),deck=shuffled(rng);
    const mapped=ids=>ids.map(id=>transformId(id,orientation)),starter=mapped(board.starter);
    [...spokes,...board.extras].forEach((id,i)=>{labels[transformId(id,orientation)]=deck[i];});
    return {draws:[],phase:'pour',cells:cells.map(c=>({...c,number:labels[c.id]})),
      edges:channelEdges(board.channelPattern,orientation),boardName:board.name,moldIndex,target,requestedTarget,channelPattern:board.channelPattern,orientation,
      zones:[],zoneByNumber:Array(26).fill(null),
      specials:{fire:mapped(board.flames),odds:mapped(board.odds)},
      wet:cells.map(c=>starter.includes(c.id)),baked:Array(37).fill(false),
      wetCount:6,bakedCount:0,fireLevel:1,oddsHits:0,oddsBonus:0,oddsMultiplier:100,
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
      const id=state.cells.find(c=>c.number===number).id,wet=state.wet.slice(),{flow,layers}=passages(state.edges||originalEdges)[id];
      const wave=layers.map(layer=>layer.filter(i=>!wet[i]));
      for(const layer of wave)for(const i of layer)wet[i]=true;
      const fireLevel=1+state.specials.fire.filter(i=>wet[i]).length;
      const oddsHits=state.specials.odds.filter(i=>wet[i]).length;
      return {...state,...(ball===5?deal(state,draws,fireLevel):{}),draws,
        phase:ball===5?'bake':'pour',lastNumber:number,fireLevel,oddsHits,
        oddsBonus:ODDS_STEP*oddsHits,oddsMultiplier:100+ODDS_STEP*oddsHits,
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
  // Read-only prediction. A completed game uses the same oven zones as its eighth ball.
  function reaches(s){
    const base=payout(s.bakedCount,s.oddsHits),hits=[];
    for(const cell of s.cells){
      const number=cell.number;
      if(number===null||s.draws.includes(number))continue;
      if(s.phase==='pour'){
        const {layers}=passages(s.edges||originalEdges)[cell.id];
        const oddsUp=s.specials.odds.some(id=>!s.wet[id]&&layers.some(layer=>layer.includes(id)));
        if(oddsUp)hits.push({number,anchor:cell.id,total:base,gain:0,allClear:false,oddsUp});
      }else{
        const zone=s.zones[s.zoneByNumber[number]-1];let count=s.bakedCount;
        for(const id of zone.cells)if(s.wet[id]&&!s.baked[id])count++;
        const total=payout(count,s.oddsHits);
        if(total>base)hits.push({number,anchor:cell.id,zone:zone.id,total,gain:total-base,
          allClear:count===37&&s.bakedCount<37,oddsUp:false});
      }
    }
    return hits.sort((a,b)=>a.number-b.number);
  }
  function createDemo(){
    let seed=1015568748;
    const state=createBoard(0,90,()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32),90,0);
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
  const api={cells,originalEdges,zoneFor,effectiveTarget,create,createBoard,createDemo,draw,reaches,payRows,payout,molds,ODDS_STEP,FIRE_COUNT,ODDS_COUNT,minReturn,maxReturn};
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.PartyCastellaRules=api;
})(globalThis);

/* v250: 61-well concentric griddle. Legacy 37-well checkpoints above remain replayable. */
(function(root){
 'use strict';
 const legacy=typeof module==='object'&&module.exports?module.exports:root.PartyCastellaRules;
 const REVISION=250,RADIUS=4,STARTER_COUNT=19,POUR_COUNT=2,FIRE_COUNT=2,SUGAR_COUNT=1,FESTIVAL_SHARE=.03;
 const h=Math.sqrt(3)/2,corners=[[0,-1],[-1,0],[-1,1],[0,1],[1,0],[1,-1]];
 const cells=[{id:0,q:0,r:0,x:0,y:0,ring:0}],rings=[[0]],originalEdges=[];
 for(let ring=1;ring<=RADIUS;ring++){
  const first=cells.length,row=[];
  for(let k=0;k<6*ring;k++){
   const side=Math.floor(k/ring),t=k%ring,a=corners[side],b=corners[(side+1)%6],id=first+k;
   const q=(ring-t)*a[0]+t*b[0],r=(ring-t)*a[1]+t*b[1];
   cells.push({id,q,r,ring,x:q+r/2,y:r*h});row.push(id);
   originalEdges.push([id,first+(k+1)%(6*ring)]);
   if(!t)originalEdges.push([id,rings[ring-1][side*(ring-1)]]);
  }
  rings.push(row);
 }
 const coordinateIds=new Map(cells.map(c=>[c.q+','+c.r,c.id]));
 function transformId(id,orientation=0){
  let {q,r}=cells[id];if(orientation&1)q=-q-r;
  for(let k=0;k<(orientation>>1);k++){const next=q+r;r=-q;q=next;}
  return coordinateIds.get(q+','+r);
 }
 function distance(a,b){const q=a.q-b.q,r=a.r-b.r;return Math.max(Math.abs(q),Math.abs(r),Math.abs(q+r));}
 const neighbours=cells.map(()=>[]);for(const [a,b]of originalEdges){neighbours[a].push(b);neighbours[b].push(a);}
 const passages=cells.map(({id})=>{
  const layers=[[id]],flow=[],seen=new Set([id]);
  for(let depth=1;depth<=3;depth++){
   const layer=[];
   for(const a of layers[depth-1])for(const b of neighbours[a])if(!seen.has(b)){seen.add(b);layer.push(b);flow.push([a,b,depth]);}
   layers.push(layer);
  }
  return {layers,flow};
 });
 const heatRadii=[null,1,2,3].map(r=>r?cells.map(a=>cells.filter(b=>distance(a,b)<=r).map(b=>b.id)):null);
 const payRows=[[14,20],[18,40],[22,60],[26,100],[30,200],[34,500],[38,1000],[42,2000],[46,3000],[50,5000],[54,7500],[58,10000],[61,20000]].map(([count,hundredths])=>Object.freeze({count,hundredths}));
 function payout(count){let amount=0;for(const row of payRows)if(count>=row.count)amount=row.hundredths;return amount;}
 const molds=[{"numbered":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,39,43,47,51,55,59],"starter":[0,1,2,3,4,5,6,7,9,11,13,15,17,37,41,45,49,53,57],"pour":[11,17],"fire":[8,14],"returnPercent":47.68105,"winFrequency":0.8132615,"name":"蜜輪","sugar":[38],"sampleCount":2000000,"sourceCandidate":4381,"calibrationSeed":1395741352},{"numbered":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,37,41,45,49,53,57],"starter":[0,1,2,3,4,5,6,7,9,11,13,15,17,19,22,25,28,31,34],"pour":[8,14],"fire":[12,18],"returnPercent":49.99135,"winFrequency":0.7918585,"name":"花籠","sugar":[37],"sampleCount":2000000,"sourceCandidate":3731,"calibrationSeed":2409645575},{"numbered":[0,1,2,3,4,5,6,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36],"starter":[0,1,2,3,4,5,6,20,21,23,24,26,27,29,30,32,33,35,36],"pour":[1,4],"fire":[22,31],"returnPercent":57.5042,"winFrequency":0.784762,"name":"六花","sugar":[37],"sampleCount":2000000,"sourceCandidate":108,"calibrationSeed":3423549798},{"numbered":[0,8,10,12,14,16,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36],"starter":[0,1,2,3,4,5,6,20,21,23,24,26,27,29,30,32,33,35,36],"pour":[26,35],"fire":[7,13],"returnPercent":69.9694,"winFrequency":0.7926295,"name":"風車","sugar":[37],"sampleCount":2000000,"sourceCandidate":1080,"calibrationSeed":142486725},{"numbered":[0,1,2,3,4,5,6,20,21,23,24,26,27,29,30,32,33,35,36,39,43,47,51,55,59],"starter":[0,7,9,11,13,15,17,37,39,41,43,45,47,49,51,53,55,57,59],"pour":[3,6],"fire":[1,4],"returnPercent":78.76997,"winFrequency":0.7994445,"name":"星屑","sugar":[38],"sampleCount":2000000,"sourceCandidate":10235,"calibrationSeed":1156390948},{"numbered":[0,8,10,12,14,16,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36],"starter":[0,1,2,3,4,5,6,19,22,25,28,31,34,39,43,47,51,55,59],"pour":[26,35],"fire":[20,29],"returnPercent":89.94525,"winFrequency":0.799776,"name":"花冠","sugar":[37],"sampleCount":2000000,"sourceCandidate":1859,"calibrationSeed":2170295171},{"numbered":[0,7,8,9,10,11,12,13,14,15,16,17,18,19,22,25,28,31,34,37,41,45,49,53,57],"starter":[0,1,2,3,4,5,6,8,10,12,14,16,18,37,41,45,49,53,57],"pour":[8,14],"fire":[7,13],"returnPercent":97.18609,"winFrequency":0.8122975,"name":"金平糖","sugar":[38],"sampleCount":2000000,"sourceCandidate":5277,"calibrationSeed":3184199394},{"numbered":[0,1,2,3,4,5,6,20,21,23,24,26,27,29,30,32,33,35,36,39,43,47,51,55,59],"starter":[0,20,21,23,24,26,27,29,30,32,33,35,36,37,41,45,49,53,57],"pour":[39,51],"fire":[3,6],"returnPercent":119.35151,"winFrequency":0.7853705,"name":"雪華","sugar":[38],"sampleCount":2000000,"sourceCandidate":11218,"calibrationSeed":4198103617},{"numbered":[0,7,8,9,10,11,12,13,14,15,16,17,18,37,39,41,43,45,47,49,51,53,55,57,59],"starter":[0,20,21,23,24,26,27,29,30,32,33,35,36,37,41,45,49,53,57],"pour":[47,59],"fire":[9,15],"returnPercent":131.78512,"winFrequency":0.796294,"name":"飾り窓","sugar":[38],"sampleCount":2000000,"sourceCandidate":11731,"calibrationSeed":917040544},{"numbered":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,37,41,45,49,53,57],"starter":[0,38,39,40,42,43,44,46,47,48,50,51,52,54,55,56,58,59,60],"pour":[1,4],"fire":[10,16],"returnPercent":143.85287,"winFrequency":0.8064915,"name":"花火","sugar":[37],"sampleCount":2000000,"sourceCandidate":1972,"calibrationSeed":1930944767},{"numbered":[0,1,2,3,4,5,6,20,21,23,24,26,27,29,30,32,33,35,36,37,41,45,49,53,57],"starter":[0,8,10,12,14,16,18,20,21,23,24,26,27,29,30,32,33,35,36],"pour":[41,53],"fire":[1,4],"returnPercent":160.86166,"winFrequency":0.807727,"name":"祝祭","sugar":[37],"sampleCount":2000000,"sourceCandidate":5977,"calibrationSeed":2944848990},{"numbered":[0,7,8,9,10,11,12,13,14,15,16,17,18,19,22,25,28,31,34,37,41,45,49,53,57],"starter":[0,38,39,40,42,43,44,46,47,48,50,51,52,54,55,56,58,59,60],"pour":[41,53],"fire":[10,16],"returnPercent":182.68213,"winFrequency":0.805698,"name":"万華鏡","sugar":[37],"sampleCount":2000000,"sourceCandidate":3534,"calibrationSeed":3958753213},{"numbered":[0,8,10,12,14,16,18,20,21,23,24,26,27,29,30,32,33,35,36,37,41,45,49,53,57],"starter":[0,38,39,40,42,43,44,46,47,48,50,51,52,54,55,56,58,59,60],"pour":[20,29],"fire":[7,13],"returnPercent":88.77254,"winFrequency":0.6350085,"name":"大宴会","sugar":[37],"sampleCount":2000000,"sourceCandidate":1230,"festival":true,"calibrationSeed":677690140}];
 const ordinary=molds.map((m,i)=>({m,i})).filter(x=>!x.m.festival),festivalIndex=molds.findIndex(m=>m.festival);
 const festival=molds[festivalIndex];
 const minReturn=(1-FESTIVAL_SHARE)*ordinary[0].m.returnPercent+FESTIVAL_SHARE*festival.returnPercent;
 const maxReturn=(1-FESTIVAL_SHARE)*ordinary[ordinary.length-1].m.returnPercent+FESTIVAL_SHARE*festival.returnPercent;
 function effectiveTarget(requested){return Math.max(50,Math.min(150,Number.isFinite(Number(requested))?Number(requested):90));}
 function selectMold(target,rng=Math.random){
  if(rng()<FESTIVAL_SHARE)return festivalIndex;
  const adjusted=(effectiveTarget(target)-FESTIVAL_SHARE*festival.returnPercent)/(1-FESTIVAL_SHARE);
  const lower=ordinary.filter(x=>x.m.returnPercent<=adjusted),upper=ordinary.filter(x=>x.m.returnPercent>=adjusted);
  const lo=lower[Math.floor(rng()*lower.length)]||ordinary[0],hi=upper[Math.floor(rng()*upper.length)]||ordinary[ordinary.length-1];
  const probability=lo.i===hi.i?0:(adjusted-lo.m.returnPercent)/(hi.m.returnPercent-lo.m.returnPercent);
  return rng()<probability?hi.i:lo.i;
 }
 function verifyMolds(){
  for(const m of molds){
   const numbered=new Set(m.numbered),wet=new Set(m.starter),special=[...m.pour,...m.fire,...m.sugar];
   if(numbered.size!==25||wet.size!==STARTER_COUNT||m.pour.length!==POUR_COUNT||m.fire.length!==FIRE_COUNT||m.sugar.length!==SUGAR_COUNT||
      new Set(special).size!==special.length||m.pour.some(id=>!numbered.has(id))||m.fire.some(id=>wet.has(id))||
      special.some(id=>!cells[id]))throw new Error('Invalid v250 Party Castella mold: '+m.name);
   for(const ids of [m.numbered,m.starter])for(let orientation=0;orientation<12;orientation++){
    const set=new Set(ids);if(ids.some(id=>!set.has(transformId(id,orientation))))throw new Error('Non-symmetric Party Castella mold: '+m.name);
   }
   for(const ids of [m.pour,m.fire]){const set=new Set(ids);if(ids.some(id=>!set.has(transformId(id,6))))throw new Error('Unpaired Party Castella switches: '+m.name);}
  }
 }
 verifyMolds();
 function shuffled(rng){const list=Array.from({length:25},(_,i)=>i+1);for(let i=list.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[list[i],list[j]]=[list[j],list[i]];}return list;}
 function createBoard(moldIndex,target=90,rng=Math.random,requestedTarget=target,forcedOrientation=null){
  const m=molds[moldIndex];if(!m)throw new RangeError('Unknown Party Castella mold');
  const orientation=forcedOrientation??Math.floor(rng()*12),map=ids=>ids.map(id=>transformId(id,orientation));
  const labels=Array(61).fill(null),deck=shuffled(rng),starter=new Set(map(m.starter));
  m.numbered.forEach((id,i)=>{labels[transformId(id,orientation)]=deck[i];});
  return {rulesRevision:REVISION,radius:RADIUS,draws:[],phase:'pour',cells:cells.map(c=>({...c,number:labels[c.id]})),
   edges:originalEdges,boardName:m.name,moldIndex,target:effectiveTarget(target),requestedTarget,channelPattern:0,orientation,
   zones:[],zoneByNumber:Array(26).fill(null),specials:{pour:map(m.pour),fire:map(m.fire),sugar:map(m.sugar),odds:[]},
   wet:cells.map(c=>starter.has(c.id)),baked:Array(61).fill(false),wetCount:STARTER_COUNT,bakedCount:0,
   pourLevel:1,fireLevel:1,pourTriggered:[],fireTriggered:[],lastPourLevel:1,newPourTriggers:[],newFireTriggers:[],
   sugarEarned:false,sugarNew:false,oddsHits:0,oddsBonus:0,oddsMultiplier:100,
   lastNumber:null,lastZone:null,sources:[],flow:[],wave:[],totalHundredths:0,highestRole:false};
 }
 function create({rng=Math.random,target=90}={}){return createBoard(selectMold(target,rng),target,rng,target);}
 const isLegacy=s=>s?.cells?.length===37;
 function payoutState(s,count=s.bakedCount){return isLegacy(s)?legacy.payout(count,s.oddsHits):payout(count);}
 function payRowsFor(s){return isLegacy(s)?legacy.payRows:payRows;}
 function deal(s,draws,fireLevel){
  const remaining=s.cells.filter(c=>c.number!==null&&!draws.includes(c.number)),zoneByNumber=Array(26).fill(null);
  const zones=remaining.map((cell,i)=>{const zone={id:i+1,name:'焼き型',anchor:cell.id,numbers:[cell.number],radius:fireLevel,cells:heatRadii[fireLevel][cell.id]};zoneByNumber[cell.number]=zone.id;return zone;});
  return {zones,zoneByNumber};
 }
 function zoneFor(number,s){return isLegacy(s)?legacy.zoneFor(number,s):s?.zoneByNumber[number]??null;}
 function draw(s,number){
  if(isLegacy(s))return legacy.draw(s,number);
  if(s.draws.length>=8||!Number.isInteger(number)||number<1||number>25||s.draws.includes(number))return null;
  const anchor=s.cells.find(c=>c.number===number);if(!anchor)return null;
  const draws=[...s.draws,number],ball=draws.length;
  if(ball<=5){
   const id=anchor.id,wet=s.wet.slice(),power=Math.max(1,Math.min(3,s.pourLevel||1)),path=passages[id];
   const wave=path.layers.slice(0,power+1).map(layer=>layer.filter(i=>!wet[i]));
   for(const layer of wave)for(const i of layer)wet[i]=true;
   const newPourTriggers=s.specials.pour.includes(id)&&!s.pourTriggered.includes(id)?[id]:[];
   const newFireTriggers=s.specials.fire.filter(i=>!s.fireTriggered.includes(i)&&!s.wet[i]&&wet[i]);
   const pourTriggered=s.pourTriggered.concat(newPourTriggers),fireTriggered=s.fireTriggered.concat(newFireTriggers);
   const pourLevel=1+pourTriggered.length,fireLevel=1+fireTriggered.length;
   return {...s,...(ball===5?deal(s,draws,fireLevel):{}),draws,phase:ball===5?'bake':'pour',lastNumber:number,lastZone:null,
    pourLevel,fireLevel,pourTriggered,fireTriggered,lastPourLevel:power,newPourTriggers,newFireTriggers,sugarNew:false,
    sources:[id],flow:path.flow.filter(([, ,depth])=>depth<=power),wave,wet,wetCount:wet.filter(Boolean).length};
  }
  const lastZone=zoneFor(number,s),zone=s.zones[lastZone-1];if(!zone)return null;
  const baked=s.baked.slice(),wave=[[],[],[],[]];
  for(const id of zone.cells)if(s.wet[id]&&!baked[id]){baked[id]=true;wave[distance(cells[id],cells[zone.anchor])].push(id);}
  const bakedCount=baked.filter(Boolean).length,done=ball===8,sugarEarned=s.sugarEarned||s.specials.sugar.some(id=>baked[id]);
  return {...s,draws,phase:done?'done':'bake',lastNumber:number,lastZone,sources:[zone.anchor],flow:[],wave,baked,bakedCount,
   newPourTriggers:[],newFireTriggers:[],sugarEarned,sugarNew:sugarEarned&&!s.sugarEarned,
   totalHundredths:done?payout(bakedCount):0,highestRole:done&&bakedCount===cells.length};
 }
 function reaches(s){
  if(isLegacy(s))return legacy.reaches(s);
  if(s.phase==='pour')return [];
  const base=payout(s.bakedCount),hits=[];
  for(const cell of s.cells){
   const number=cell.number;if(number===null||s.draws.includes(number))continue;
   const zone=s.zones[s.zoneByNumber[number]-1];if(!zone)continue;
   let count=s.bakedCount;for(const id of zone.cells)if(s.wet[id]&&!s.baked[id])count++;
   const total=payout(count);if(total>base)hits.push({number,anchor:cell.id,zone:zone.id,total,gain:total-base,allClear:count===61&&s.bakedCount<61,oddsUp:false});
  }
  return hits.sort((a,b)=>a.number-b.number);
 }
 function createDemo(){
  let seed=1015568748;const state=createBoard(festivalIndex,90,()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32),90,0);
  const anchors=[20,29,26,8,16,24,18,30];return {state,draws:anchors.map(id=>state.cells[id].number)};
 }
 const api={REVISION,RADIUS,STARTER_COUNT,POUR_COUNT,FIRE_COUNT,SUGAR_COUNT,FESTIVAL_SHARE,cells,rings,originalEdges,transformId,distance,
  zoneFor,effectiveTarget,selectMold,create,createBoard,createDemo,draw,reaches,payRows,payout,payoutState,payRowsFor,
  molds,ODDS_STEP:0,ODDS_COUNT:0,minReturn,maxReturn,legacy,legacyPayRows:legacy.payRows};
 if(typeof module==='object'&&module.exports)module.exports=api;else root.PartyCastellaRules=api;
})(globalThis);

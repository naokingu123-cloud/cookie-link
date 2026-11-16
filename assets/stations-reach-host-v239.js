/* v239: Color the real rotating 3D number panels for each station's
 * highest-role reach, using only authenticated server roster metadata.
 * This adds no physics, canvas, video stream, or extra game simulation. */
(()=>{
 'use strict';
 if(window.SweetsStationReachHostV239||new URLSearchParams(location.search).get('serverHost')!=='1')return;
 const COLORS=['#ff5d9e','#39d5f5','#ffd363','#b38bff','#66e7b4','#ff9a65'];
 const PERIOD=950;
 let client=null,driver=null,roster=null,rosterVersion=-1,roundKey='',highlight=new Map(),timer=0,panelCount=0;
 const selected=(value,time=Date.now())=>{
  const owners=highlight.get(Number(value));
  return owners?.length?owners[Math.floor(time/PERIOD)%owners.length]:null;
 };
 function refreshHighlights(){
  const round=client?.round;
  const roundId=String(round?.id||''),balls=Array.isArray(round?.balls)?round.balls:[];
  const used=new Set(balls.map(item=>Number(item.number)));
  const next=new Map();
  if(roundId&&round.phase==='PLAYING'&&Array.isArray(roster?.seats)){
   for(const row of roster.seats){
    const d=row?.detail,station=Number(row?.station);
    if(!row||row.empty||row.test||!row.connected||row.settled||row.phase!=='PLAYING'||row.roundId!==roundId||
       !Number.isInteger(station)||station<1||station>6||d?.version!==238||d.roundId!==roundId||
       d.prediction!=='ready'||d.ballCount!==balls.length)continue;
    const reach=Array.isArray(d.highestReachNumbers)?d.highestReachNumbers:[];
    for(const n of reach){
     if(!Number.isInteger(n)||n<1||n>25||used.has(n))continue;
     let owners=next.get(n);if(!owners){owners=[];next.set(n,owners);}
     if(!owners.some(entry=>entry.station===station))owners.push({station,color:COLORS[station-1]});
    }
   }
  }
  for(const owners of next.values())owners.sort((a,b)=>a.station-b.station);
  highlight=next;roundKey=roundId;
 }
 function accept(value){
  if(!value||Number(value.version)<235||!Array.isArray(value.seats))return;
  if(roster&&value.machineId!==roster.machineId)return;
  if(roster&&Number(value.revision)<rosterVersion)return;
  rosterVersion=Number(value.revision)||0;roster=value;refreshHighlights();
 }
 function colorFor(number,time=Date.now()){
  if(!driver||driver.draw?.mode!=='eight'||client?.round?.phase!=='PLAYING'||
     String(client?.round?.id||'')!==roundKey)return null;
  // The physical ball may have entered a pocket before its HTTP report arrives.
  if(driver.physics?.hits?.some(hit=>Number(hit.pocket)===number))return null;
  return selected(number,time);
 }
 function bindDriver(){
  const active=document.getElementById('cookie-roulette')?.anima8;
  if(!active||active===driver)return;
  if(!active.scene||typeof active.scene.traverse!=='function')return;
  const found=new Map(),step=Math.PI*2/25;
  active.scene.traverse(mesh=>{
   const uniforms=mesh?.material?.uniforms;
   if(!mesh?.isMesh||Number(uniforms?.gridSize?.value)!==20)return;
   const group=mesh.parent,angle=Number(group?.rotation?.y);
   if(!Number.isFinite(angle))return;
   const index=Math.round(-angle/step);
   if(index>=0&&index<25&&Math.abs(angle+index*step)<.002)found.set(index+1,{face:mesh,
    scatter:group.children?.find(child=>child?.name==='Acrylic digit light scatter')});
  });
  if(found.size!==25)return; // Renderer may still be constructing its LEDs.
  driver=active;panelCount=found.size;
  function install(mesh,number){
   if(!mesh?.material?.uniforms?.lightTint)return;
   const old=mesh.onBeforeRender;
   mesh.onBeforeRender=function(...args){
    if(typeof old==='function')old.apply(this,args);
    const tint=colorFor(number);
    if(!tint)return;
    const uniforms=mesh.material.uniforms;
    uniforms.lightTint.value.set(tint.color);
    const base=Number(uniforms.brightness?.value)||1;
    uniforms.brightness.value=Math.max(base,2.65);
    if(uniforms.flash)uniforms.flash.value=Math.max(Number(uniforms.flash.value)||0,.7);
   };
  }
  for(const [number,parts] of found){install(parts.face,number);install(parts.scatter,number);}
  console.info('[StationReachHost239] live 3D number panels bound:',panelCount);
 }
 function bindClient(){
  const current=window.SweetsSharedMachine?.client;
  if(!current||current===client)return;
  client=current;
  client.on(message=>{if(message?.stations)accept(message.stations);if(message?.round||message?.type==='ball_result')refreshHighlights();});
  client.getState?.().then(message=>{if(message?.stations)accept(message.stations);}).catch(()=>{});
 }
 function pulse(){bindClient();bindDriver();refreshHighlights();}
 window.SweetsStationReachHostV239={accept,colorFor,get colors(){return COLORS.slice();},get panelCount(){return panelCount;},get highlightedNumbers(){return [...highlight.keys()].sort((a,b)=>a-b);},pulse};
 pulse();timer=setInterval(pulse,700);
 addEventListener('beforeunload',()=>clearInterval(timer),{once:true});
})();

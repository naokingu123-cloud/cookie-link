/* Color the real streamed 3D number faces, not a second client-side roulette.
 * The server publishes only reachable final numbers or a confirmed JPC. */
(()=>{
'use strict';
if(window.SweetsSugarRouletteV254||new URLSearchParams(location.search).get('serverHost')!=='1')return;
const COLORS=['#ff5d9e','#39d5f5','#ffd363','#b38bff','#66e7b4','#ff9a65'];
let client=null,driver=null,roundId='',lastServerTime=0,rows=[],faces=[],timer;
function accept(message){
 if(!Array.isArray(message?.sugarReachesV254))return;
 const id=String(message.roundId||message.round?.id||client?.round?.id||'');if(!id)return;
 if(client?.round?.id&&id!==client.round.id)return;
 const serverTime=Number(message.serverTime)||0;
 if(id===roundId&&serverTime&&serverTime<lastServerTime)return;
 if(id!==roundId)lastServerTime=0;
 lastServerTime=Math.max(lastServerTime,serverTime);
 rows=message.sugarReachesV254.filter(r=>r.roundId===id&&Number.isInteger(r.station)&&r.station>=1&&r.station<=6&&Number.isInteger(r.number)&&r.number>=1&&r.number<=25&&['reach','acquired'].includes(r.status)).map(r=>({...r}));roundId=id;
}
function colorFor(number,time=Date.now()){
 if(!driver||driver.draw?.mode!=='eight'||String(client?.round?.id||'')!==roundId||!['PLAYING','COMPLETE'].includes(client?.round?.phase))return null;
 const candidates=rows.filter(r=>r.number===number&&((r.status==='acquired')||(client.round.phase==='PLAYING'&&(client.round.balls||[]).length===7)));
 if(!candidates.length)return null;const row=candidates[Math.floor(time/950)%candidates.length];return {...row,color:COLORS[row.station-1]};
}
function bindDriver(){
 const current=document.getElementById('cookie-roulette')?.anima8;if(!current||current===driver||!current.scene?.traverse)return;
 const found=[],step=Math.PI*2/25;
 current.scene.traverse(mesh=>{const u=mesh?.material?.uniforms,angle=Number(mesh?.parent?.rotation?.y);if(!mesh?.isMesh||u?.gridSize?.value!==20||!Number.isFinite(angle))return;const i=Math.round(-angle/step);if(i<0||i>=25||Math.abs(angle+i*step)>.002)return;found.push({mesh,number:i+1});});
 if(found.length!==25)return;
 for(const {mesh,number} of found){
  const material=mesh.material,u=material.uniforms;
  const needle='gl_FragColor=vec4(light*lightTint*brightness,1.0);';if(!material.fragmentShader.includes(needle))return;
  u.sugarModeV254={value:0};u.sugarTimeV254={value:0};u.sugarFrameV254={value:u.lightTint.value.clone()};
  material.fragmentShader='uniform float sugarModeV254;uniform float sugarTimeV254;uniform vec3 sugarFrameV254;\n'+material.fragmentShader.replace(needle,`
    vec3 sugarColor=light*lightTint*brightness;
    if(sugarModeV254>0.5){
     vec3 ink=vec3(1.0,0.006,0.018);
     if(sugarModeV254>1.5)ink=0.57+0.43*cos(6.2831853*(vec3(0.0,0.333,0.667)+panelUV.x*0.7+panelUV.y*0.4+sugarTimeV254*0.5));
     sugarColor=mix(sugarColor,ink*lens*11.0,digit);
     float edge=min(min(panelUV.x,1.0-panelUV.x),min(panelUV.y,1.0-panelUV.y));
     float frame=1.0-smoothstep(0.045,0.085,edge);
     sugarColor=mix(sugarColor,sugarFrameV254*3.8,frame);
    }
    gl_FragColor=vec4(sugarColor,1.0);`);
  material.needsUpdate=true;
  const native=mesh.onBeforeRender;mesh.onBeforeRender=function(...args){native?.apply(this,args);const row=colorFor(number);u.sugarModeV254.value=row?(row.status==='acquired'?2:1):0;u.sugarTimeV254.value=Date.now()/1000;if(row)u.sugarFrameV254.value.set(row.color);};
 }
 driver=current;faces=found;
}
function pulse(){
 const c=window.SweetsSharedMachine?.client;if(c&&c!==client){client=c;c.on(accept);c.getState?.().then(accept).catch(()=>{});}
 bindDriver();
}
window.SweetsSugarRouletteV254={version:254,accept,colorFor,pulse,describe:()=>({version:254,panelCount:faces.length,roundId,rows:rows.map(r=>({...r})),colors:COLORS.slice(),redDigit:'#ff0205',panels:faces.map(({mesh,number})=>({number,mode:mesh.material.uniforms.sugarModeV254.value,frame:mesh.material.uniforms.sugarFrameV254.value.getHexString()}))})};
pulse();timer=setInterval(pulse,700);addEventListener('beforeunload',()=>clearInterval(timer),{once:true});
})();

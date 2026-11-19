/* Color the real streamed 3D number faces, not a second client-side roulette.
 * The server publishes next-ball lucky reaches at every draw and confirmed JPC. */
(()=>{
'use strict';
const host=new URLSearchParams(location.search).get('serverHost')==='1';
const local=['local','download'].includes(window.SweetsEditionV255?.value);
if(window.SweetsSugarRouletteV254||!host&&!local)return;
const COLORS=['#ff5d9e','#39d5f5','#ffd363','#b38bff','#66e7b4','#ff9a65'];
let client=null,driver=null,roundId='',lastServerTime=0,rows=[],faces=[],timer;
let localKey='',localStamp=-Infinity;
function localState(){
 if(!local)return;
 const now=Date.now();if(now-localStamp<60)return;localStamp=now;
 const s=window.SweetsSugarChallengeV254?.describe?.().challenge,R=window.SugarChallengeRulesV254;
 if(!s||!R){rows=[];roundId='';return;}
 const phase=app.phase==='ready'?'BETTING':s.phase==='complete'?'COMPLETE':'PLAYING';
 client={round:{id:s.roundId,phase,balls:s.draws.map(number=>({number}))}};
 const key=s.id+'/'+s.draws.join(',')+'/'+phase;if(key===localKey)return;localKey=key;
 const reaches=s.jpcQualified?[{number:s.jpcTicket?.number??s.qualifyingNumber??s.draws.at(-1),station:s.station,status:'acquired'}]:R.reaches(s).map(r=>({...r,status:'reach'}));
 accept({roundId:s.roundId,serverTime:Date.now(),sugarReachesV254:reaches.map(r=>({...r,roundId:s.roundId}))});
}
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
 localState();
 if(!driver||driver.draw?.mode!=='eight'||String(client?.round?.id||'')!==roundId||!['PLAYING','COMPLETE'].includes(client?.round?.phase))return null;
 const balls=client.round.balls||[],used=balls.some(ball=>Number(ball?.number??ball)===number);
 const candidates=rows.filter(r=>r.number===number&&(r.status==='acquired'||client.round.phase==='PLAYING'&&balls.length<8&&!used));
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
     // The outside edge stays in the station color. A separate inner edge
     // cycles smoothly through the spectrum every 720ms, without blank flashes.
     float outerFrame=1.0-smoothstep(0.018,0.043,edge);
     float innerFrame=(1.0-smoothstep(0.055,0.09,edge))*(1.0-outerFrame);
     float spectrumPhase=sugarTimeV254/0.72;
     vec3 spectrum=0.57+0.43*cos(6.2831853*(vec3(0.0,0.333,0.667)-spectrumPhase+panelUV.x*0.12+panelUV.y*0.12));
     float shimmer=0.82+0.18*sin(6.2831853*spectrumPhase);
     sugarColor=mix(sugarColor,spectrum*4.5*shimmer,innerFrame);
     sugarColor=mix(sugarColor,sugarFrameV254*4.2,outerFrame);
    }
    gl_FragColor=vec4(sugarColor,1.0);`);
  material.needsUpdate=true;
  // Keep the shader clock small: epoch seconds lose sub-second precision in
  // WebGL float32. The 720s wrap is a whole number of both color cycles.
  const native=mesh.onBeforeRender;mesh.onBeforeRender=function(...args){native?.apply(this,args);const row=colorFor(number);u.sugarModeV254.value=row?(row.status==='acquired'?2:1):0;u.sugarTimeV254.value=(Date.now()%720000)/1000;if(row)u.sugarFrameV254.value.set(row.color);};
 }
 driver=current;faces=found;
}
function pulse(){
 localState();
 const c=host&&window.SweetsSharedMachine?.client;if(c&&c!==client){client=c;c.on(accept);c.getState?.().then(accept).catch(()=>{});}
 bindDriver();
}
window.SweetsSugarRouletteV254={version:254,presentationRevision:268,spectrumPeriodMs:720,accept,colorFor,pulse,describe:()=>({version:254,presentationRevision:268,spectrumPeriodMs:720,panelCount:faces.length,roundId,rows:rows.map(r=>({...r})),colors:COLORS.slice(),redDigit:'#ff0205',panels:faces.map(({mesh,number})=>({number,mode:mesh.material.uniforms.sugarModeV254.value,frame:mesh.material.uniforms.sugarFrameV254.value.getHexString()}))})};
pulse();timer=setInterval(pulse,700);addEventListener('beforeunload',()=>clearInterval(timer),{once:true});
})();

(()=>{
'use strict';
if(window.__sweetsHostKeepAliveV206)return;
window.__sweetsHostKeepAliveV206=true;
if(new URLSearchParams(location.search).get('serverHost')!=='1')return;

function install(){
 if(typeof app==='undefined'||!app||typeof rouletteDrawSource==='undefined'){setTimeout(install,60);return;}
 const nativeAppPause=typeof app.pause==='function'?app.pause.bind(app):null;
 const nativeDrawPause=typeof rouletteDrawSource.pause==='function'?rouletteDrawSource.pause.bind(rouletteDrawSource):null;
 let worker=null,workerUrl='',activeRoundId='',driverRunning=false;

 function physicalRound(){
  const round=window.SweetsSharedMachine?.client?.round;
  return round&&round.phase==='PLAYING'&&round.drawSource!=='server-fallback'?round:null;
 }
 function keepAwake({resumeDriver=false,pumpFrame=true}={}){
  const round=physicalRound();
  if(!round){activeRoundId='';driverRunning=false;return false;}
  const roundId=String(round.id||'');
  const newRound=!!roundId&&roundId!==activeRoundId;
  if(roundId)activeRoundId=roundId;
  try{app.paused=false;}catch{}
  try{for(const engine of app.engines||[])engine.paused=false;}catch{}
  // setPaused(false) resets the roulette render clock and accumulator. Calling it
  // from every 24 fps capture heartbeat caused the physical draw to run in slow motion.
  // Resume the driver only on a real pause/visibility transition or a new round.
  if(resumeDriver||newRound||!driverRunning){
   try{
    if(typeof rouletteDriver!=='undefined'&&rouletteDriver){rouletteDriver.setPaused(false);driverRunning=true;}
   }catch{}
  }
  if(pumpFrame)try{window.__sweetsHostCaptureTrackV206?.requestFrame?.();}catch{}
  return true;
 }

 if(nativeAppPause){
  app.pause=function(value){
   if(physicalRound()){keepAwake({resumeDriver:true,pumpFrame:true});return;}
   driverRunning=false;return nativeAppPause(value);
  };
 }
 if(nativeDrawPause){
  rouletteDrawSource.pause=function(value){
   if(physicalRound()){keepAwake({resumeDriver:true,pumpFrame:true});return;}
   driverRunning=false;return nativeDrawPause(value);
  };
 }

 const nativeCapture=HTMLCanvasElement.prototype.captureStream;
 if(typeof nativeCapture==='function'&&!nativeCapture.__sweetsManualCaptureV206){
  const patched=function(rate){
   let stream;
   try{stream=nativeCapture.call(this,0);}catch{return nativeCapture.call(this,rate);}
   const track=stream?.getVideoTracks?.()[0];
   if(track&&typeof track.requestFrame==='function'){
    window.__sweetsHostCaptureTrackV206=track;
    try{track.contentHint='motion';}catch{}
    return stream;
   }
   try{track?.stop?.();}catch{}
   return nativeCapture.call(this,rate);
  };
  Object.defineProperty(patched,'__sweetsManualCaptureV206',{value:true});
  HTMLCanvasElement.prototype.captureStream=patched;
 }

 try{
  const blob=new Blob(["setInterval(()=>postMessage('frame'),42)"],{type:'text/javascript'});
  workerUrl=URL.createObjectURL(blob);worker=new Worker(workerUrl);
  // Capture at about 24 fps without repeatedly resetting the physics clock.
  worker.onmessage=()=>keepAwake({resumeDriver:false,pumpFrame:true});
 }catch(error){console.warn('[HostKeepAlive206] worker unavailable',error?.message||error);}

 const hardWake=()=>keepAwake({resumeDriver:true,pumpFrame:true});
 document.addEventListener('visibilitychange',hardWake,true);
 addEventListener('blur',hardWake,true);
 addEventListener('focus',hardWake,true);
 const attachClient=()=>{
  const client=window.SweetsSharedMachine?.client;
  if(!client){setTimeout(attachClient,100);return;}
  client.on(()=>{
   const round=physicalRound();
   if(round)keepAwake({resumeDriver:String(round.id||'')!==activeRoundId,pumpFrame:true});
   else{activeRoundId='';driverRunning=false;}
  });
  hardWake();
 };
 attachClient();
 addEventListener('beforeunload',()=>{
  try{worker?.terminate();}catch{}
  try{if(workerUrl)URL.revokeObjectURL(workerUrl);}catch{}
 },{once:true});
 console.info('[HostKeepAlive206] background guard enabled; physics clock is independent from the manual 24fps capture pump');
}
install();
})();

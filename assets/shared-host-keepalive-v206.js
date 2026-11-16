(()=>{
'use strict';
if(window.__sweetsHostKeepAliveV206)return;
window.__sweetsHostKeepAliveV206=true;
if(new URLSearchParams(location.search).get('serverHost')!=='1')return;

function install(){
 if(typeof app==='undefined'||!app||typeof rouletteDrawSource==='undefined'){setTimeout(install,60);return;}
 const nativeAppPause=typeof app.pause==='function'?app.pause.bind(app):null;
 const nativeDrawPause=typeof rouletteDrawSource.pause==='function'?rouletteDrawSource.pause.bind(rouletteDrawSource):null;
 let worker=null,workerUrl='',activeRoundId='',driverRunning=false,captureFps=24;
 function setCaptureFps(value){
  const fps=Number(value)>=45?60:Number(value)>=26?30:24;
  if(fps===captureFps)return;
  captureFps=fps;
  try{worker?.postMessage({fps});}catch{}
 }

 function physicalRound(){
  const round=window.SweetsSharedMachine?.client?.round;
  // BET uses the same host canvas with the draw still ready. Keep its existing
  // lights/rotor awake on focus changes; this never starts a draw or a timer.
  return round&&(round.phase==='BETTING'||round.phase==='PLAYING'&&round.drawSource!=='server-fallback')?round:null;
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
  const workerSource="let timer=null;function setRate(value){const fps=Math.max(24,Math.min(60,Number(value)||24));if(timer)clearInterval(timer);timer=setInterval(()=>postMessage('frame'),Math.round(1000/fps));}onmessage=event=>{if(event.data&&event.data.fps)setRate(event.data.fps);};setRate(24);";
  const blob=new Blob([workerSource],{type:'text/javascript'});
  workerUrl=URL.createObjectURL(blob);worker=new Worker(workerUrl);
  // Keep 24fps idle, use 60fps only for WebRTC viewers, downshift to 30fps
  // under sustained encoder/network pressure. This never resets the physics.
  worker.onmessage=()=>{
   const running=keepAwake({resumeDriver:false,pumpFrame:false});
   if(!running)return;
   // The native RAF is suspended in hidden tabs. Advance the real host's
   // existing physics in this *same* 24/30/60fps worker tick, then capture.
   // Never create a second local draw or alter the 1x physical time scale.
   if(document.hidden)try{document.getElementById('cookie-roulette')?.anima8?.pumpBackground?.();}catch{}
   try{window.__sweetsHostCaptureTrackV206?.requestFrame?.();}catch{}
  };
  worker.postMessage({fps:captureFps});
 }catch(error){console.warn('[HostKeepAlive206] worker unavailable',error?.message||error);}

 // Graceful fallback on older browsers without a worker. This timer can be
 // throttled by the OS; the server still owns BET time and ball ordering.
 const fallbackClock=worker||typeof setInterval!=='function'?null:setInterval(()=>{
  if(!document.hidden)return;
  const running=keepAwake({resumeDriver:false,pumpFrame:false});
  if(running)try{document.getElementById('cookie-roulette')?.anima8?.pumpBackground?.();}catch{}
 },42);
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
 window.SweetsHostKeepAliveV206={setCaptureFps,get capturePumpActive(){return !!worker;},get captureFps(){return captureFps;}};
 addEventListener('beforeunload',()=>{
  if(fallbackClock)clearInterval(fallbackClock);
  try{worker?.terminate();}catch{}
  try{if(workerUrl)URL.revokeObjectURL(workerUrl);}catch{}
 },{once:true});
 console.info('[HostKeepAlive206] adaptive manual video capture 24/30/60fps; physical clock independent');
}
install();
})();

(()=>{
'use strict';
if(window.__sweetsHostKeepAliveV205)return;
window.__sweetsHostKeepAliveV205=true;
if(new URLSearchParams(location.search).get('serverHost')!=='1')return;

function install(){
 if(typeof app==='undefined'||!app||typeof rouletteDrawSource==='undefined'){setTimeout(install,60);return;}
 const nativeAppPause=typeof app.pause==='function'?app.pause.bind(app):null;
 const nativeDrawPause=typeof rouletteDrawSource.pause==='function'?rouletteDrawSource.pause.bind(rouletteDrawSource):null;
 let worker=null,workerUrl='';

 function physicalRoundActive(){
  const round=window.SweetsSharedMachine?.client?.round;
  return !!round&&round.phase==='PLAYING'&&round.drawSource!=='server-fallback';
 }
 function wake(){
  if(!physicalRoundActive())return;
  try{app.paused=false;}catch{}
  try{for(const engine of app.engines||[])engine.paused=false;}catch{}
  try{if(typeof rouletteDriver!=='undefined')rouletteDriver?.setPaused(false);}catch{}
  try{window.__sweetsHostCaptureTrackV205?.requestFrame?.();}catch{}
 }

 if(nativeAppPause){
  app.pause=function(value){
   if(physicalRoundActive()){wake();return;}
   return nativeAppPause(value);
  };
 }
 if(nativeDrawPause){
  rouletteDrawSource.pause=function(value){
   if(physicalRoundActive()){wake();return;}
   return nativeDrawPause(value);
  };
 }

 const nativeCapture=HTMLCanvasElement.prototype.captureStream;
 if(typeof nativeCapture==='function'&&!nativeCapture.__sweetsManualCaptureV205){
  const patched=function(rate){
   let stream;
   try{stream=nativeCapture.call(this,0);}catch{return nativeCapture.call(this,rate);}
   const track=stream?.getVideoTracks?.()[0];
   if(track&&typeof track.requestFrame==='function'){
    window.__sweetsHostCaptureTrackV205=track;
    try{track.contentHint='motion';}catch{}
    return stream;
   }
   try{track?.stop?.();}catch{}
   return nativeCapture.call(this,rate);
  };
  Object.defineProperty(patched,'__sweetsManualCaptureV205',{value:true});
  HTMLCanvasElement.prototype.captureStream=patched;
 }

 try{
  const blob=new Blob(["setInterval(()=>postMessage(0),42)"],{type:'text/javascript'});
  workerUrl=URL.createObjectURL(blob);worker=new Worker(workerUrl);worker.onmessage=wake;
 }catch(error){console.warn('[HostKeepAlive205] worker unavailable',error?.message||error);}

 document.addEventListener('visibilitychange',()=>{wake();setTimeout(wake,0);},true);
 addEventListener('blur',()=>{wake();setTimeout(wake,0);},true);
 addEventListener('focus',wake,true);
 const attachClient=()=>{
  const client=window.SweetsSharedMachine?.client;
  if(!client){setTimeout(attachClient,100);return;}
  client.on(()=>wake());wake();
 };
 attachClient();
 addEventListener('beforeunload',()=>{try{worker?.terminate();}catch{}try{if(workerUrl)URL.revokeObjectURL(workerUrl);}catch{}},{once:true});
 console.info('[HostKeepAlive205] background throttling guard and manual 24fps frame pump enabled');
}
install();
})();

(()=>{
'use strict';
if(window.__sweetsRouletteClientWatchdogV205)return;
window.__sweetsRouletteClientWatchdogV205=true;
if(new URLSearchParams(location.search).get('serverHost')==='1')return;

function boot(){
 const shared=window.SweetsSharedMachine,client=shared?.client;
 if(!client){setTimeout(boot,80);return;}
 let lastFrames=-1,lastTime=-1,lastProgress=Date.now(),lastRequest=0,roundId='';
 const liveVideo=()=>document.querySelector('#cookie-roulette .shared-roulette-webrtc');
 const activeRound=()=>{
  const round=client.round;
  return round&&round.phase==='PLAYING'?round:null;
 };
 function frameCount(video){
  try{return Number(video.getVideoPlaybackQuality?.().totalVideoFrames??video.webkitDecodedFrameCount??-1);}catch{return -1;}
 }
 function showLive(video){
  if(!video)return;
  video.dataset.live='1';document.body.classList.add('shared-roulette-webrtc-live');
  try{if(typeof rouletteDriver!=='undefined')rouletteDriver?.setPaused(true);}catch{}
 }
 function showLocal(video){
  if(video)video.dataset.live='0';document.body.classList.remove('shared-roulette-webrtc-live');
  try{if(typeof rouletteDriver!=='undefined'&&!app?.paused)rouletteDriver?.setPaused(false);}catch{}
 }
 function requestRelay(round){
  const now=Date.now();if(now-lastRequest<1100)return;lastRequest=now;
  const base={protocol:197,roundId:String(round?.id||'')};
  client.send({...base,type:'rtc_watch'});
  client.send({...base,type:'rtc_fallback_request'});
 }
 function tick(){
  const round=activeRound(),video=liveVideo(),now=Date.now();
  if(!round){roundId='';lastFrames=-1;lastTime=-1;lastProgress=now;setTimeout(tick,350);return;}
  if(roundId!==round.id){roundId=round.id;lastFrames=-1;lastTime=-1;lastProgress=now;lastRequest=0;}
  if(video){
   const frames=frameCount(video),time=Number(video.currentTime)||0;
   if((frames>=0&&frames!==lastFrames)||(lastTime>=0&&time-lastTime>.015)){
    lastProgress=now;showLive(video);
   }
   lastFrames=frames;lastTime=time;
   try{
    const ranges=video.buffered;
    if(ranges?.length){
     const end=ranges.end(ranges.length-1),lag=end-time;
     if(lag>.75)video.currentTime=Math.max(0,end-.08);
     video.playbackRate=lag>.28?1.06:1;
    }
    if(video.paused)video.play().catch(()=>{});
   }catch{}
  }
  const stale=now-lastProgress;
  if(stale>1000)requestRelay(round);
  if(stale>1500)showLocal(video);
  setTimeout(tick,350);
 }
 client.on(message=>{
  if(['round_started','server_fallback_started','rtc_host_ready','rtc_media'].includes(message.type)){
   lastProgress=Date.now();setTimeout(tick,0);
  }
 });
 tick();
 console.info('[RouletteClientWatchdog205] stalled P2P detection and relay recovery enabled');
}
boot();
})();

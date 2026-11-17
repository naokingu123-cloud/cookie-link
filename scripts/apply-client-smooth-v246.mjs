import fs from 'node:fs';
const changes=new Map();
const read=p=>changes.get(p)??fs.readFileSync(p,'utf8');
function edit(p,a,b,label){let s=read(p);const n=s.split(a).length-1;if(n!==1)throw Error(label+' target '+n);changes.set(p,s.replace(a,b));}
const video='assets/shared-roulette-client-v224.js';
edit(video," const framesSupported=typeof Image==='function';",` let resumeGraceUntilV246=0,framePaintV246=0,frameReadyV246=null;
 const videoStatsV246={fps:0,presented:0,stamp:0,kind:''};
 const framesSupported=typeof Image==='function';`, 'video state');
edit(video,' function receiveFrame(message){\n  if(!framesSupported', ' function receiveFrame(message){\n  if(document.hidden)return;\n  if(!framesSupported', 'hidden JPEG decode');
edit(video,'  const pending=new Image();framePending=pending;',"  const pending=new Image();pending.decoding='async';framePending=pending;",'async image decode');
const from=`    const root=stage();if(root){
     if(!frameImage?.isConnected){
      pending.className='shared-roulette-v224 shared-roulette-frame-v231';pending.dataset.active='0';pending.alt='サーバー配信の抽選機';pending.draggable=false;
      root.append(pending);frameImage=pending;
     }else frameImage.src=pending.src;
     frameAt=Date.now();lastGood='frame';lastGoodAt=frameAt;
     if(!(decoded(p2pVideo)&&p2pFrameAt&&frameAt-p2pFrameAt<1500))activate('frame');
    }`;
const to=`    frameReadyV246={job,pending};
    if(!framePaintV246){
     if(typeof requestAnimationFrame==='function')framePaintV246=requestAnimationFrame(paintFrameV246);
     else paintFrameV246();
    }`;
edit(video,from,to,'frame aligned latest image');
edit(video,' function stopFrameWatch(kind){',` function paintFrameV246(){
  framePaintV246=0;const value=frameReadyV246;frameReadyV246=null;
  if(!value||document.hidden||value.job.host!==frameHost||lastHostKey&&value.job.host!==lastHostKey)return;
  const {pending}=value,root=stage();if(!root)return;
  // Retain one stable DOM image. Replacing it each packet would wake the
  // cabinet's child-list observers and cause additional full-layout work.
  if(!frameImage?.isConnected){
   pending.className='shared-roulette-v224 shared-roulette-frame-v231';pending.dataset.active='0';pending.alt='サーバー配信の抽選機';pending.draggable=false;
   root.append(pending);frameImage=pending;
  }else if(frameImage.src!==pending.src)frameImage.src=pending.src;
  frameAt=Date.now();lastGood='frame';lastGoodAt=frameAt;
  if(!(decoded(p2pVideo)&&p2pFrameAt&&frameAt-p2pFrameAt<1500))activate('frame');
 }
 function stopFrameWatch(kind){`, 'bounded image presentation');
edit(video,"const tick=()=>{if(!current())return;watch.mark();watch.frameId=video.requestVideoFrameCallback(tick);};",`const tick=(timestamp,metadata)=>{
   if(!current())return;watch.mark();
   if(kind==='p2p'&&metadata&&Number.isFinite(metadata.presentedFrames)){
    const at=Date.now();
    if(videoStatsV246.kind!==kind||metadata.presentedFrames<videoStatsV246.presented){videoStatsV246.stamp=at;videoStatsV246.presented=metadata.presentedFrames;videoStatsV246.kind=kind;}
    if(!videoStatsV246.stamp){videoStatsV246.stamp=at;videoStatsV246.presented=metadata.presentedFrames;}
    else if(at-videoStatsV246.stamp>=1500){videoStatsV246.fps=Math.max(0,1000*(metadata.presentedFrames-videoStatsV246.presented)/(at-videoStatsV246.stamp));videoStatsV246.stamp=at;videoStatsV246.presented=metadata.presentedFrames;}
   }
   watch.frameId=video.requestVideoFrameCallback(tick);
  };`, 'measured decoded FPS');
edit(video,"pc.ontrack=event=>{if(peer!==session)return;const stream=", "pc.ontrack=event=>{if(peer!==session)return;try{if(event.receiver&&'jitterBufferTarget' in event.receiver)event.receiver.jitterBufferTarget=80;}catch{}const stream=", 'small optional network-jitter buffer');
edit(video,"if(end-video.currentTime>.9)video.currentTime=Math.max(0,end-.08);", "const lag=end-video.currentTime;if(lag>1.8){video.currentTime=Math.max(0,end-.22);video.playbackRate=1;}else video.playbackRate=lag>.55?1.04:1;", 'avoid repeated small relay jumps');
edit(video,'   if(!client.online)return;const now=Date.now(),remaining=650-', '   if(!client.online||document.hidden)return;const now=Date.now(),remaining=650-', 'do not renegotiate hidden video');
edit(video,' function health(){\n  cleanLegacy();const now=Date.now(),p2pFresh=',` function health(){
  if(document.hidden){
   if(frameWatching){send({type:'rtc_frame_stop'});frameWatching=false;}
   return;
  }
  if(Date.now()<resumeGraceUntilV246)return;
  cleanLegacy();const now=Date.now(),p2pFresh=`, 'hidden decoder callbacks are not a network outage');
edit(video,' client.on(value=>{onMessage(value);',` function visibilityV246(){
  frameReadyV246=null;
  if(framePaintV246&&typeof cancelAnimationFrame==='function')cancelAnimationFrame(framePaintV246);framePaintV246=0;
  if(document.hidden){
   if(frameWatching){send({type:'rtc_frame_stop'});frameWatching=false;}
   frameNext=null;return;
  }
  resumeGraceUntilV246=Date.now()+1800;videoStatsV246.stamp=0;
  for(const video of [p2pVideo,relayVideo])play(video);
  // Existing peers survive. A fresh decoded frame, not focus itself, proves
  // playback health; the normal watchdog runs only after the wake-up grace.
 }
 document.addEventListener?.('visibilitychange',visibilityV246);
 client.on(value=>{onMessage(value);`, 'visibility handler');
edit(video,"addEventListener('beforeunload',()=>{clearTimeout(requestTimer);", "addEventListener('beforeunload',()=>{document.removeEventListener?.('visibilitychange',visibilityV246);if(framePaintV246&&typeof cancelAnimationFrame==='function')cancelAnimationFrame(framePaintV246);frameReadyV246=null;clearTimeout(requestTimer);", 'cleanup presentation resources');
edit(video,"source,peerState:peer?.pc.connectionState||'none',", "source,decodedFps:Math.round(videoStatsV246.fps*10)/10,hidden:!!document.hidden,peerState:peer?.pc.connectionState||'none',", 'video diagnostics');
edit('index.html','<script src="assets/cookie-upgrade-patches.js?v=232"></script>', '<script src="assets/cookie-upgrade-patches.js?v=232"></script>\n<script src="assets/client-render-patch-v246.js?v=246"></script>', 'load visual-only patch');
edit('index.html','  game=window.CookieUpgradePatch.patch(game);','  game=window.CookieUpgradePatch.patch(game);\n  game=window.SweetsRenderPatchV246.patch(game);', 'patch native frame gates');
// Existing non-active nudge respected manual pause, but only unpaused PLAYING.
// Result/payout must also recover from a tab pause without a local restart.
edit('assets/shared-client-background-v240.js',"a.phase!=='playing')return false;", "!['playing','result','paying'].includes(a.phase))return false;", 'allow result/payout unpause');
// Sample elapsed time from the previous payout advance, not from every worker
// pulse (60ms). Otherwise the 160ms gate unintentionally slows the result.
edit('assets/shared-client-hidden-v246.js',' lastAdvance=at;\n if(a.phase===\'result\'){', " const advanceMs=lastAdvance?Math.max(0,at-lastAdvance):RESULT_PULSE_MS;lastAdvance=at;\n if(a.phase==='result'){", 'hidden result elapsed');
let hidden=read('assets/shared-client-hidden-v246.js');
hidden=hidden.replaceAll('Math.max(RESULT_PULSE_MS,elapsed)','Math.max(RESULT_PULSE_MS,advanceMs)');changes.set('assets/shared-client-hidden-v246.js',hidden);
// All revised monitor modules require new cache keys, including the preserved
// API names. The release integer stays 246 for the unpublished combined build.
let monitor=read('monitor.html').replaceAll('?v=245','?v=246');changes.set('monitor.html',monitor);
changes.set('app-version.json',JSON.stringify({version:'20261117-v246-progressive-hidden-smooth'})+'\n');
for(const [p,s] of changes){fs.writeFileSync(p,s);console.log('SMOOTH_PATCH',p,s.length);}

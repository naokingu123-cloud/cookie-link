(()=>{
'use strict';
if(window.__sweetsRouletteHostV224)return;
window.__sweetsRouletteHostV224=true;
// WebRTC caps the transmitted picture, not the original 3D physics loop.
const PROTOCOL=197,FPS=60,BITRATE=3000000,SAFE_FPS=30,SAFE_BITRATE=1600000;
const STREAM_MAX_WIDTH=1280,STREAM_MAX_HEIGHT=720;
const instanceId=(crypto.randomUUID?.()||Date.now()+''+Math.random()).replace(/\W/g,'').slice(0,24);
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const rtcConfig={iceServers:[{urls:'stun:stun.cloudflare.com:3478'},{urls:'stun:stun.l.google.com:19302'}],iceCandidatePoolSize:3,bundlePolicy:'max-bundle'};

function boot(){
 const shared=window.SweetsSharedMachine,client=shared?.client;
 if(!client){setTimeout(boot,80);return;}
 const peers=new Map(),offers=new Map(),subscribers=new Map(),frameSubscribers=new Map();
 let stream=null,track=null,canvas=null,recorder=null,recorderTask=null,streamId='',sequence=0,sendChain=Promise.resolve(),captureBusy=null,sourceEpoch=0,lastAnnounceAt=0,announcedSocket=null;
 let frameCanvas=null,frameContext=null,frameJob=null,frameSequence=0,disposed=false;
 let videoFps=FPS,badStats=0,goodStats=0,jpegFallbackLowUntil=0,manualCaptureDue=0;
 const previousEncodeStats=new WeakMap();
 const roundId=()=>String(client.round?.id||'');
 const send=message=>client.send({...message,protocol:PROTOCOL,instanceId,roundId:roundId()});
 const key=(id,instance='')=>String(id)+':'+String(instance||'default');
 const remote=(id,instance='')=>!!id&&(id!==client.playerId||!!instance&&instance!==instanceId);
 function source(){
  // The visible Three.js canvas is authoritative. rouletteDriver.mirrorCanvas
  // can be a one-frame helper and previously caused the first-HIT freeze.
  const visible=document.querySelector('#cookie-roulette .a8-stage>canvas')||document.querySelector('#cookie-roulette canvas');
  if(visible?.isConnected&&visible.width>1&&visible.height>1)return visible;
  try{const mirror=typeof rouletteDriver!=='undefined'&&rouletteDriver?.mirrorCanvas;if(mirror?.isConnected&&mirror.width>1&&mirror.height>1)return mirror;}catch{}
  return null;
 }
 // Only the KeepAlive worker pumps manual capture while it is running.
 // The former overlapping 24fps and 30fps timers encoded duplicate pictures.
 function updateCaptureRate(){
  const active=peers.size>0||subscribers.size>0;
  try{window.SweetsHostKeepAliveV206?.setCaptureFps?.(active?videoFps:24);}catch{}
 }
 function tune(sender){
  try{
   const parameters=sender.getParameters();
   if(!parameters.encodings?.length)parameters.encodings=[{}];
   const scale=Math.max(1,(canvas?.width||STREAM_MAX_WIDTH)/STREAM_MAX_WIDTH,(canvas?.height||STREAM_MAX_HEIGHT)/STREAM_MAX_HEIGHT);
   Object.assign(parameters.encodings[0],{
    maxBitrate:videoFps===FPS?BITRATE:SAFE_BITRATE,
    maxFramerate:videoFps,
    scaleResolutionDownBy:Math.min(8,scale)
   });
   parameters.degradationPreference='maintain-framerate';
   Promise.resolve(sender.setParameters(parameters)).catch(()=>{});
  }catch{}
 }
 function setVideoFps(next){
  const value=next>=FPS?FPS:SAFE_FPS;
  if(value===videoFps)return;
  videoFps=value;badStats=0;goodStats=0;
  for(const session of peers.values()){
   const sender=session.pc.getSenders?.().find(item=>item.track?.kind==='video');
   if(sender)tune(sender);
  }
  updateCaptureRate();
  console.info('[RouletteHost234] outgoing video',videoFps,'fps; physics rate unchanged');
 }
 // Five-second encoder feedback with hysteresis: sustained CPU/network
 // pressure lowers the VIDEO frame rate; a long stable period restores 60.
 async function probeVideoQuality(){
  if(disposed||!peers.size)return;
  let count=0,congested=false,allHealthy=true;
  for(const session of [...peers.values()].slice(0,4)){
   if(session.pc.connectionState!=='connected')continue;
   const sender=session.pc.getSenders?.().find(item=>item.track?.kind==='video');
   if(!sender||typeof sender.getStats!=='function')continue;
   let report=null;
   try{
    const stats=await sender.getStats();
    stats.forEach(item=>{if(item.type==='outbound-rtp'&&(item.kind==='video'||item.mediaType==='video')&&!item.isRemote)report=item;});
   }catch{continue;}
   if(!report)continue;
   const stamp=Number(report.timestamp)||Date.now(),frames=Number(report.framesEncoded);
   const prev=previousEncodeStats.get(sender);
   if(Number.isFinite(frames))previousEncodeStats.set(sender,{stamp,frames});
   let rate=Number(report.framesPerSecond);
   if(!(rate>0)&&prev&&Number.isFinite(frames)&&stamp-prev.stamp>=2500)
    rate=Math.max(0,(frames-prev.frames)*1000/(stamp-prev.stamp));
   const reason=String(report.qualityLimitationReason||'none');
   if(!(rate>0)&&reason==='none')continue;
   count++;
   if(reason==='cpu'||reason==='bandwidth'||rate>0&&rate<videoFps*.70)congested=true;
   if(reason!=='none'||!(rate>=SAFE_FPS*.83))allHealthy=false;
  }
  if(!count)return;
  if(videoFps===FPS){
   if(congested){badStats++;goodStats=0;}
   else badStats=Math.max(0,badStats-1);
   if(badStats>=2)setVideoFps(SAFE_FPS);
  }else{
   if(!congested&&allHealthy)goodStats++;
   else goodStats=0;
   if(goodStats>=10)setVideoFps(FPS);
  }
 }
 function stopRecorder(notify=false){
  const old=recorder,oldId=streamId;recorder=null;streamId='';sendChain=Promise.resolve();
  if(notify&&oldId)for(const subscriber of subscribers.values())send({type:'rtc_media_stop',targetPlayerId:subscriber.id,targetInstanceId:subscriber.instance,streamId:oldId});
  try{if(old&&old.state!=='inactive')old.stop();}catch{}
 }
 async function replacePeerTracks(){
  for(const session of peers.values()){
   try{const sender=session.pc.getSenders().find(item=>item.track?.kind==='video');if(sender){await sender.replaceTrack(track);tune(sender);}}
   catch(error){console.warn('[RouletteHost224] replaceTrack',error?.message||error);}
  }
 }
 async function rebuild(next){
  if(!next||next.width<2||next.height<2)throw Error('roulette_canvas_missing');
  const oldTrack=track;canvas=next;stream=next.captureStream(FPS);track=stream.getVideoTracks()[0];sourceEpoch++;
  if(!track)throw Error('capture_track_missing');
  try{track.contentHint='motion';await track.applyConstraints({frameRate:{ideal:FPS,max:FPS}});}catch{}
  await replacePeerTracks();try{oldTrack?.stop();}catch{}
  if(subscribers.size&&recorder){stopRecorder(true);setTimeout(()=>ensureRecorder().catch(error=>console.warn('[RouletteHost224] relay rebuild',error?.message||error)),0);}
  return stream;
 }
 async function capture(force=false){
  if(captureBusy)return captureBusy;
  captureBusy=(async()=>{
   for(let attempt=0;attempt<180;attempt++){
    const next=source();
    if(next){if(!force&&stream&&track?.readyState==='live'&&canvas===next)return stream;return rebuild(next);}
    await wait(100);
   }
   throw Error('roulette_canvas_missing');
  })().finally(()=>{captureBusy=null;});
  return captureBusy;
 }
 async function flushIce(session){if(!session.pc.remoteDescription)return;while(peers.get(key(session.id,session.instance))===session&&session.ice.length)try{await session.pc.addIceCandidate(session.ice.shift());}catch{}}
 function closePeer(peerKey,expected=null){const session=peers.get(peerKey);if(!session||expected&&session!==expected)return;peers.delete(peerKey);clearTimeout(session.timer);try{session.pc.close();}catch{}updateCaptureRate();}
 function base64(buffer){const bytes=new Uint8Array(buffer);let text='';for(let index=0;index<bytes.length;index+=32768)text+=String.fromCharCode(...bytes.subarray(index,index+32768));return btoa(text);}
 function captureFrame(){
  if(disposed||!client.online||!frameSubscribers.size||Number(client.ws?.bufferedAmount)>384*1024)return;
  if(frameJob&&Date.now()-frameJob.at<2000)return;
  const visible=source();if(!visible)return;
  if(!frameCanvas){frameCanvas=document.createElement('canvas');frameContext=frameCanvas.getContext('2d',{alpha:false});}
  if(!frameContext||typeof frameCanvas.toBlob!=='function')return;
  // A single uncongested JPEG viewer can use 960x540. More viewers, slow
  // encoding or a full socket revert to 720x405 at the original 15fps.
  const clearFrame=frameSubscribers.size===1&&Date.now()>=jpegFallbackLowUntil;
  const maxWidth=clearFrame?960:720,maxHeight=clearFrame?540:405;
  const scale=Math.min(1,maxWidth/visible.width,maxHeight/visible.height),width=Math.max(2,Math.round(visible.width*scale)),height=Math.max(2,Math.round(visible.height*scale));
  if(frameCanvas.width!==width)frameCanvas.width=width;if(frameCanvas.height!==height)frameCanvas.height=height;
  const job={at:Date.now(),source:visible};frameJob=job;
  try{
   frameContext.drawImage(visible,0,0,width,height);
   frameCanvas.toBlob(async blob=>{
    try{
     if(!blob||frameJob!==job||disposed||!client.online||source()!==visible)return;
     const bytes=await blob.arrayBuffer(),buffer=Number(client.ws?.bufferedAmount)||0;
     if(Date.now()-job.at>90||bytes.byteLength>140000||buffer>128*1024)
      jpegFallbackLowUntil=Date.now()+12000;
     if(frameJob!==job||disposed||bytes.byteLength>180000||buffer>384*1024)return;
     const data=base64(bytes),sequence=frameSequence++;
     // Each JPEG is independently decodable. A new or slow viewer cannot
     // force a recorder restart or invalidate another viewer's live picture.
     for(const subscriber of frameSubscribers.values()){
      if(Number(client.ws?.bufferedAmount)>384*1024)break;
      send({type:'rtc_frame',targetPlayerId:subscriber.id,targetInstanceId:subscriber.instance,mime:'image/jpeg',sequence,capturedAt:job.at,data});
     }
    }catch{}finally{if(frameJob===job)frameJob=null;}
   },'image/jpeg',clearFrame?.77:.70);
  }catch{if(frameJob===job)frameJob=null;}
 }
 function supportedMime(){if(typeof MediaRecorder!=='function')return'';for(const mime of ['video/webm;codecs=vp8','video/webm'])if(!MediaRecorder.isTypeSupported||MediaRecorder.isTypeSupported(mime))return mime;return'';}
 function stopRecorderIfUnused(){if(subscribers.size||!recorder)return;stopRecorder();}
 function dropSubscriber(peerKey,notify=false){const subscriber=subscribers.get(peerKey);if(!subscriber)return;subscribers.delete(peerKey);if(notify)send({type:'rtc_media_stop',targetPlayerId:subscriber.id,targetInstanceId:subscriber.instance,streamId});stopRecorderIfUnused();updateCaptureRate();}
 async function ensureRecorder(restart=false){
  if(restart)stopRecorder(true);
  if(recorderTask){await recorderTask;return ensureRecorder();}
  if(recorder?.state==='recording'||!subscribers.size)return;const mime=supportedMime();if(!mime)return;
  recorderTask=(async()=>{
   const media=await capture();if(!subscribers.size)return;
   const currentId=(crypto.randomUUID?.()||Date.now()+''+Math.random()).replace(/\W/g,'').slice(0,24);streamId=currentId;sequence=0;
   try{recorder=new MediaRecorder(media,{mimeType:mime,videoBitsPerSecond:1000000});}catch{recorder=new MediaRecorder(media);}
   const current=recorder;
   current.ondataavailable=event=>{
    if(current!==recorder||!event.data?.size||!subscribers.size)return;const currentSequence=sequence++;
    sendChain=sendChain.then(async()=>{
     if(current!==recorder||streamId!==currentId)return;
     const buffer=await event.data.arrayBuffer();if(current!==recorder||streamId!==currentId)return;
     if(buffer.byteLength>180000){stopRecorder(true);setTimeout(()=>ensureRecorder().catch(()=>{}),250);return;}
     const data=base64(buffer);
     for(const subscriber of subscribers.values())send({type:'rtc_media',targetPlayerId:subscriber.id,targetInstanceId:subscriber.instance,streamId:currentId,mime:current.mimeType||mime,sequence:currentSequence,data});
    }).catch(()=>{});
   };
   current.onerror=()=>{if(current!==recorder)return;stopRecorder(true);setTimeout(()=>ensureRecorder().catch(()=>{}),250);};current.start(180);
  })();
  const task=recorderTask;try{await task;}finally{if(recorderTask===task)recorderTask=null;}
 }
 async function offer(id,instance='',restart=false){
  if(typeof RTCPeerConnection!=='function'||!HTMLCanvasElement.prototype.captureStream)return;
  const peerKey=key(id,instance);if(offers.has(peerKey))return offers.get(peerKey).promise;
  const job={cancelled:false,promise:null};offers.set(peerKey,job);
  job.promise=(async()=>{
   const previous=peers.get(peerKey);if(previous&&['new','connecting','connected'].includes(previous.pc.connectionState)&&!restart)return;
   if(previous)closePeer(peerKey,previous);const media=await capture();if(job.cancelled||offers.get(peerKey)!==job)return;
   const pc=new RTCPeerConnection(rtcConfig),session={pc,id:String(id),instance:String(instance||''),ice:[],timer:0,epoch:sourceEpoch};peers.set(peerKey,session);
   try{
    tune(pc.addTrack(track,media));updateCaptureRate();
    pc.onicecandidate=event=>{if(peers.get(peerKey)===session&&event.candidate)send({type:'rtc_ice',targetPlayerId:session.id,targetInstanceId:session.instance,candidate:event.candidate.toJSON?.()||event.candidate});};
    pc.onconnectionstatechange=()=>{
     if(peers.get(peerKey)!==session)return;
     const state=pc.connectionState;if(state==='connected')clearTimeout(session.timer);
     else if(state==='failed'||state==='closed')closePeer(peerKey,session);
     else if(state==='disconnected'){clearTimeout(session.timer);session.timer=setTimeout(()=>{if(pc.connectionState==='disconnected')closePeer(peerKey,session);},2200);}
    };
    const description=await pc.createOffer({iceRestart:restart});if(peers.get(peerKey)!==session)return;
    await pc.setLocalDescription(description);if(peers.get(peerKey)!==session)return;
    send({type:'rtc_offer',targetPlayerId:session.id,targetInstanceId:session.instance,description:pc.localDescription.toJSON?.()||pc.localDescription});
   }catch(error){closePeer(peerKey,session);throw error;}
  })().finally(()=>{if(offers.get(peerKey)===job)offers.delete(peerKey);});
  return job.promise;
 }
 async function onMessage(message){
  const id=String(message.fromPlayerId||''),instance=String(message.fromInstanceId||''),peerKey=key(id,instance);
  if(message.type==='rtc_frame_watch'){if(remote(id,instance)){frameSubscribers.set(peerKey,{id,instance});captureFrame();}return;}
  if(message.type==='rtc_frame_stop'){frameSubscribers.delete(peerKey);return;}
  if(message.type==='rtc_watch'){if(remote(id,instance))offer(id,instance).catch(error=>console.warn('[RouletteHost224] offer',error?.message||error));return;}
  if(message.type==='rtc_peer_list'){const present=new Set((message.peers||[]).map(peer=>key(peer.playerId,peer.instanceId)));for(const subscriber of frameSubscribers.keys())if(!present.has(subscriber))frameSubscribers.delete(subscriber);for(const peer of message.peers||[])if(remote(String(peer?.playerId||''),String(peer?.instanceId||'')))offer(String(peer.playerId),String(peer.instanceId||'')).catch(()=>{});return;}
  if(message.type==='rtc_fallback_request'){if(remote(id,instance)){const fresh=!subscribers.has(peerKey);subscribers.set(peerKey,{id,instance});updateCaptureRate();ensureRecorder(fresh&&!!recorder).catch(error=>console.warn('[RouletteHost224] relay',error?.message||error));}return;}
  if(message.type==='rtc_fallback_stop'||message.type==='rtc_peer_left'){dropSubscriber(peerKey,false);if(message.type==='rtc_peer_left'){frameSubscribers.delete(peerKey);const job=offers.get(peerKey);if(job){job.cancelled=true;offers.delete(peerKey);}closePeer(peerKey);}return;}
  const session=peers.get(peerKey);if(!session)return;
  if(message.type==='rtc_answer'&&message.description){try{await session.pc.setRemoteDescription(message.description);if(peers.get(peerKey)===session)await flushIce(session);}catch{closePeer(peerKey,session);}}
  else if(message.type==='rtc_ice'){if(session.pc.remoteDescription)try{await session.pc.addIceCandidate(message.candidate);}catch{}else session.ice.push(message.candidate);}
  else if(message.type==='rtc_restart')offer(id,instance,true).catch(()=>{});
 }
 const announce=()=>{
  if(!client.online||shared.role!=='host'&&client.role!=='host'){lastAnnounceAt=0;announcedSocket=null;return;}
  const now=Date.now();if(announcedSocket===client.ws&&now-lastAnnounceAt<3000)return;
  if(send({type:'rtc_host_ready',frameRelay:1})){lastAnnounceAt=now;announcedSocket=client.ws;}
 };
 client.on(message=>{onMessage(message);if(['snapshot','host_changed','host_status'].includes(message.type))announce();});
 client.ready.then(ok=>{if(ok){announce();capture().catch(error=>console.warn('[RouletteHost224]',error?.message||error));}});
 const announceTimer=setInterval(announce,3000);
 const imageTimer=setInterval(captureFrame,Math.round(1000/15));
 // If the worker cannot launch, this is the only manual capture fallback.
 const frameTimer=setInterval(()=>{
  if(window.SweetsHostKeepAliveV206?.capturePumpActive||!peers.size&&!subscribers.size)return;
  const now=Date.now();if(now<manualCaptureDue)return;
  manualCaptureDue=now+1000/videoFps;
  try{track?.requestFrame?.();}catch{}
 },17);
 const qualityTimer=setInterval(()=>{probeVideoQuality().catch(()=>{});},5000);
 const sourceTimer=setInterval(()=>{
  const next=source();if(!next)return;
  if(next!==canvas||track?.readyState!=='live')capture(true).then(announce).catch(error=>console.warn('[RouletteHost224] source refresh',error?.message||error));
 },650);
 addEventListener('beforeunload',()=>{
  disposed=true;frameJob=null;frameSubscribers.clear();clearInterval(imageTimer);clearInterval(announceTimer);clearInterval(frameTimer);clearInterval(qualityTimer);clearInterval(sourceTimer);subscribers.clear();stopRecorder();for(const job of offers.values())job.cancelled=true;offers.clear();for(const peerKey of [...peers.keys()])closePeer(peerKey);try{track?.stop();}catch{}
 },{once:true});
 window.SweetsRouletteHostV224={capture,captureFrame,get frameCount(){return frameSubscribers.size;},get peerCount(){return peers.size;},get relayCount(){return subscribers.size;},get sourceEpoch(){return sourceEpoch;},get fps(){return videoFps;},probeVideoQuality};
 console.info('[RouletteHost234] adaptive 720p / 60fps WebRTC, 30fps safety and budgeted JPEG fallback ready');
}
boot();
})();


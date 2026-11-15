(()=>{
'use strict';
if(window.__sweetsRouletteHostV217)return;
window.__sweetsRouletteHostV217=true;
const PROTOCOL=197,FPS=24,BITRATE=800000;
const instanceId=(crypto.randomUUID?.()||Date.now()+''+Math.random()).replace(/\W/g,'').slice(0,24);
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const rtcConfig={iceServers:[{urls:'stun:stun.cloudflare.com:3478'},{urls:'stun:stun.l.google.com:19302'}],iceCandidatePoolSize:3,bundlePolicy:'max-bundle'};

function boot(){
 const shared=window.SweetsSharedMachine,client=shared?.client;
 if(!client){setTimeout(boot,80);return;}
 if(typeof RTCPeerConnection!=='function'||!HTMLCanvasElement.prototype.captureStream){console.warn('[RouletteHost217] WebRTC unsupported');return;}
 const peers=new Map(),subscribers=new Map();
 let stream=null,track=null,canvas=null,recorder=null,streamId='',sequence=0,sendChain=Promise.resolve();
 const roundId=()=>String(client.round?.id||'');
 const send=message=>client.send({...message,protocol:PROTOCOL,instanceId,roundId:roundId()});
 const key=(id,instance='')=>String(id)+':'+String(instance||'default');
 function source(){
  try{if(typeof rouletteDriver!=='undefined'&&rouletteDriver?.mirrorCanvas)return rouletteDriver.mirrorCanvas;}catch{}
  return document.querySelector('#cookie-roulette .a8-stage>canvas,#cookie-roulette canvas');
 }
 async function capture(){
  for(let attempt=0;attempt<180;attempt++){
   const next=source();
   if(next&&next.width>1&&next.height>1){
    if(stream&&track?.readyState==='live'&&canvas===next)return stream;
    try{track?.stop();}catch{}
    canvas=next;stream=next.captureStream(FPS);track=stream.getVideoTracks()[0];
    if(!track)throw Error('capture_track_missing');
    try{track.contentHint='motion';await track.applyConstraints({frameRate:{ideal:FPS,max:FPS}});}catch{}
    return stream;
   }
   await wait(100);
  }
  throw Error('roulette_canvas_missing');
 }
 function tune(sender){
  try{
   const parameters=sender.getParameters();if(!parameters.encodings?.length)parameters.encodings=[{}];
   const scale=Math.max(1,(canvas?.width||640)/640,(canvas?.height||360)/360);
   Object.assign(parameters.encodings[0],{maxBitrate:BITRATE,maxFramerate:FPS,scaleResolutionDownBy:Math.min(4,scale)});
   parameters.degradationPreference='maintain-framerate';sender.setParameters(parameters).catch(()=>{});
  }catch{}
 }
 async function flushIce(session){
  if(!session.pc.remoteDescription)return;
  while(session.ice.length)try{await session.pc.addIceCandidate(session.ice.shift());}catch{}
 }
 function closePeer(peerKey){
  const session=peers.get(peerKey);if(!session)return;
  peers.delete(peerKey);clearTimeout(session.timer);try{session.pc.close();}catch{}
 }
 function base64(buffer){
  const bytes=new Uint8Array(buffer);let text='';
  for(let index=0;index<bytes.length;index+=32768)text+=String.fromCharCode(...bytes.subarray(index,index+32768));
  return btoa(text);
 }
 function supportedMime(){
  if(typeof MediaRecorder!=='function')return'';
  for(const mime of ['video/webm;codecs=vp8','video/webm'])if(!MediaRecorder.isTypeSupported||MediaRecorder.isTypeSupported(mime))return mime;
  return'';
 }
 function stopRecorderIfUnused(){
  if(subscribers.size||!recorder)return;
  try{if(recorder.state!=='inactive')recorder.stop();}catch{}
  recorder=null;streamId='';
 }
 function dropSubscriber(peerKey,notify=false){
  const subscriber=subscribers.get(peerKey);if(!subscriber)return;
  subscribers.delete(peerKey);
  if(notify)send({type:'rtc_media_stop',targetPlayerId:subscriber.id,targetInstanceId:subscriber.instance,streamId});
  stopRecorderIfUnused();
 }
 async function ensureRecorder(){
  if(recorder?.state==='recording')return;
  const mime=supportedMime();if(!mime)return;
  const media=await capture();streamId=(crypto.randomUUID?.()||Date.now()+''+Math.random()).replace(/\W/g,'').slice(0,24);sequence=0;
  try{recorder=new MediaRecorder(media,{mimeType:mime,videoBitsPerSecond:520000});}catch{recorder=new MediaRecorder(media);}
  recorder.ondataavailable=event=>{
   if(!event.data?.size||!subscribers.size)return;
   const currentSequence=sequence++;
   sendChain=sendChain.then(async()=>{
    const buffer=await event.data.arrayBuffer();if(buffer.byteLength>170000)return;
    const data=base64(buffer);if(data.length>230000)return;
    for(const subscriber of subscribers.values())send({type:'rtc_media',targetPlayerId:subscriber.id,targetInstanceId:subscriber.instance,streamId,mime:recorder?.mimeType||mime,sequence:currentSequence,data});
   }).catch(()=>{});
  };
  recorder.onerror=()=>{for(const peerKey of [...subscribers.keys()])dropSubscriber(peerKey,true);};
  recorder.start(220);
 }
 async function offer(id,instance='',restart=false){
  const peerKey=key(id,instance),previous=peers.get(peerKey);
  if(previous&&['new','connecting','connected'].includes(previous.pc.connectionState)&&!restart)return;
  if(previous)closePeer(peerKey);
  const media=await capture(),pc=new RTCPeerConnection(rtcConfig),session={pc,id:String(id),instance:String(instance||''),ice:[],timer:0};
  peers.set(peerKey,session);tune(pc.addTrack(track,media));
  pc.onicecandidate=event=>{if(event.candidate)send({type:'rtc_ice',targetPlayerId:session.id,targetInstanceId:session.instance,candidate:event.candidate.toJSON?.()||event.candidate});};
  pc.onconnectionstatechange=()=>{
   const state=pc.connectionState;
   if(state==='connected'){
    clearTimeout(session.timer);
    // Do not drop the relay merely because ICE connected. The client stops the
    // warm relay only after decoded P2P frames have advanced continuously.
   }else if(state==='failed'||state==='closed')closePeer(peerKey);
   else if(state==='disconnected'){
    clearTimeout(session.timer);session.timer=setTimeout(()=>{if(pc.connectionState==='disconnected')closePeer(peerKey);},2200);
   }
  };
  await pc.setLocalDescription(await pc.createOffer({iceRestart:restart}));
  send({type:'rtc_offer',targetPlayerId:session.id,targetInstanceId:session.instance,description:pc.localDescription.toJSON?.()||pc.localDescription});
 }
 async function onMessage(message){
  const id=String(message.fromPlayerId||''),instance=String(message.fromInstanceId||''),peerKey=key(id,instance);
  if(message.type==='rtc_watch'){
   if(id&&id!==client.playerId)offer(id,instance).catch(error=>console.warn('[RouletteHost217] offer',error?.message||error));
   return;
  }
  if(message.type==='rtc_peer_list'){
   for(const peer of message.peers||[])if(peer?.playerId&&peer.playerId!==client.playerId)offer(String(peer.playerId),String(peer.instanceId||'')).catch(()=>{});
   return;
  }
  if(message.type==='rtc_fallback_request'){
   if(id&&id!==client.playerId){subscribers.set(peerKey,{id,instance});ensureRecorder().catch(error=>console.warn('[RouletteHost217] relay',error?.message||error));}
   return;
  }
  if(message.type==='rtc_fallback_stop'||message.type==='rtc_peer_left'){
   dropSubscriber(peerKey,false);if(message.type==='rtc_peer_left')closePeer(peerKey);return;
  }
  const session=peers.get(peerKey);if(!session)return;
  if(message.type==='rtc_answer'&&message.description){
   try{await session.pc.setRemoteDescription(message.description);await flushIce(session);}catch{closePeer(peerKey);}
  }else if(message.type==='rtc_ice'){
   if(session.pc.remoteDescription)try{await session.pc.addIceCandidate(message.candidate);}catch{}else session.ice.push(message.candidate);
  }else if(message.type==='rtc_restart')offer(id,instance,true).catch(()=>{});
 }
 const announce=()=>{if(client.online&&(shared.role==='host'||client.role==='host'))send({type:'rtc_host_ready'});};
 client.on(message=>{onMessage(message);if(['snapshot','host_changed','host_status'].includes(message.type))setTimeout(announce,0);});
 client.ready.then(ok=>{if(ok){announce();capture().catch(error=>console.warn('[RouletteHost217]',error?.message||error));}});
 const announceTimer=setInterval(announce,3000);
 addEventListener('beforeunload',()=>{
  clearInterval(announceTimer);subscribers.clear();stopRecorderIfUnused();
  for(const peerKey of [...peers.keys()])closePeer(peerKey);try{track?.stop();}catch{}
 },{once:true});
 window.SweetsRouletteHostV217={capture,get peerCount(){return peers.size;},get relayCount(){return subscribers.size;}};
 console.info('[RouletteHost217] persistent 24fps P2P + warm relay stream enabled');
}
boot();
})();

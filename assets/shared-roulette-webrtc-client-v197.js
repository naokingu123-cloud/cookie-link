(()=>{
'use strict';
if(window.__sweetsRouletteClientV216)return;
window.__sweetsRouletteClientV216=true;
const PROTOCOL=197;
const query=new URLSearchParams(location.search);
if(query.get('serverHost')==='1'||query.get('serverSettlementWorker')==='1')return;
const instanceId=(crypto.randomUUID?.()||Date.now()+''+Math.random()).replace(/\W/g,'').slice(0,24);
const rtcConfig={
 iceServers:[{urls:'stun:stun.cloudflare.com:3478'},{urls:'stun:stun.l.google.com:19302'}],
 iceCandidatePoolSize:3,bundlePolicy:'max-bundle'
};

function boot(){
 const shared=window.SweetsSharedMachine,client=shared?.client;
 if(!client){setTimeout(boot,80);return;}
 if(typeof RTCPeerConnection!=='function'){console.warn('[RouletteClient216] WebRTC unsupported; relay only');}
 let peer=null,offerTimer=0,healthTimer=0,generation=0;
 let p2pVideo=null,relayVideo=null,relay=null;
 let p2pLastFrame=0,relayLastFrame=0,p2pStableSince=0,lastRelayChunk=0,lastRequest=0,activeSource='';
 const roundId=()=>String(client.round?.id||'');
 const send=message=>client.send({...message,protocol:PROTOCOL,instanceId,roundId:roundId()});

 function css(){
  if(document.getElementById('shared-roulette-webrtc-v216-css'))return;
  const style=document.createElement('style');style.id='shared-roulette-webrtc-v216-css';style.textContent=`
   #cookie-roulette .a8-stage{position:relative!important;overflow:hidden!important;isolation:isolate}
   #cookie-roulette .shared-roulette-webrtc{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;object-fit:contain!important;object-position:50% 50%!important;background:#02070b!important;pointer-events:none!important;opacity:0;transition:opacity .09s linear;transform:translateZ(0)}
   #cookie-roulette .shared-roulette-relay{z-index:10010!important}
   #cookie-roulette .shared-roulette-p2p{z-index:10011!important}
   #cookie-roulette .shared-roulette-webrtc[data-active="1"]{opacity:1!important}
   body.shared-roulette-webrtc-live #cookie-roulette .a8-stage>canvas{visibility:hidden!important}
   body.shared-roulette-webrtc-live #cookie-roulette .shared-roulette-mirror{display:none!important}
   #cookie-roulette .shared-roulette-reconnecting{position:absolute;right:8px;bottom:8px;z-index:10012;padding:3px 7px;border-radius:8px;background:#06121dc9;color:#d8f4ff;font:800 9px/1.2 system-ui;opacity:0;pointer-events:none}
   #cookie-roulette .shared-roulette-reconnecting[data-show="1"]{opacity:1}
  `;document.head.append(style);
 }
 function root(){css();return document.querySelector('#cookie-roulette .a8-stage');}
 function makeVideo(kind){
  const stage=root();if(!stage)return null;
  const video=document.createElement('video');
  Object.assign(video,{autoplay:true,muted:true,playsInline:true,disablePictureInPicture:true});
  video.className=`shared-roulette-webrtc shared-roulette-${kind}`;
  video.dataset.active='0';video.setAttribute('aria-label',kind==='p2p'?'サーバー物理抽選機の低遅延映像':'サーバー物理抽選機の予備映像');
  stage.append(video);return video;
 }
 function view(kind){
  if(kind==='p2p'){
   if(p2pVideo?.isConnected)return p2pVideo;p2pVideo=makeVideo('p2p');return p2pVideo;
  }
  if(relayVideo?.isConnected)return relayVideo;relayVideo=makeVideo('relay');return relayVideo;
 }
 function indicator(show){
  const stage=root();if(!stage)return;let node=stage.querySelector('.shared-roulette-reconnecting');
  if(!node){node=document.createElement('span');node.className='shared-roulette-reconnecting';node.textContent='映像再接続中';stage.append(node);}
  node.dataset.show=show?'1':'0';
 }
 function setActive(kind){
  const video=kind==='p2p'?p2pVideo:kind==='relay'?relayVideo:null;
  if(!video)return showLocal(true);
  activeSource=kind;
  if(p2pVideo)p2pVideo.dataset.active=kind==='p2p'?'1':'0';
  if(relayVideo)relayVideo.dataset.active=kind==='relay'?'1':'0';
  document.body.classList.add('shared-roulette-webrtc-live');indicator(false);
  try{if(typeof rouletteDriver!=='undefined')rouletteDriver?.setPaused(true);}catch{}
 }
 function showLocal(reconnecting=false){
  activeSource='';if(p2pVideo)p2pVideo.dataset.active='0';if(relayVideo)relayVideo.dataset.active='0';
  document.body.classList.remove('shared-roulette-webrtc-live');indicator(reconnecting);
  try{if(typeof rouletteDriver!=='undefined'&&!app?.paused)rouletteDriver?.setPaused(false);}catch{}
 }
 function trackFrames(video,kind){
  if(!video||video.dataset.frameWatch==='1')return;video.dataset.frameWatch='1';
  const mark=()=>{
   const now=Date.now();
   if(kind==='p2p'){
    if(!p2pLastFrame||now-p2pLastFrame>1400)p2pStableSince=now;
    p2pLastFrame=now;if(!p2pStableSince)p2pStableSince=now;
   }else relayLastFrame=now;
  };
  video.addEventListener('playing',mark);video.addEventListener('timeupdate',mark);
  if(typeof video.requestVideoFrameCallback==='function'){
   const localGeneration=++generation;
   const tick=()=>{
    if(!video.isConnected||localGeneration>generation+100000)return;
    mark();video.requestVideoFrameCallback(tick);
   };
   video.requestVideoFrameCallback(tick);
  }
 }
 function clearPeer({retry=false}={}){
  const current=peer;peer=null;if(current){clearTimeout(current.timer);try{current.pc.close();}catch{}}
  p2pStableSince=0;p2pLastFrame=0;
  if(p2pVideo){try{p2pVideo.srcObject=null;p2pVideo.removeAttribute('src');p2pVideo.load();}catch{}}
  if(retry)request(180);
 }
 function clearRelay(){
  const current=relay;relay=null;if(!current)return;
  try{if(current.mediaSource.readyState==='open')current.mediaSource.endOfStream();}catch{}
  try{URL.revokeObjectURL(current.url);}catch{}
  if(relayVideo){try{relayVideo.removeAttribute('src');relayVideo.load();}catch{}}
  relayLastFrame=0;lastRelayChunk=0;
 }
 function decode(data){const binary=atob(data),bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return bytes;}
 function pump(current){
  if(relay!==current||!current.buffer||current.buffer.updating||!current.queue.length)return;
  try{current.buffer.appendBuffer(current.queue.shift());}catch(error){console.warn('[RouletteClient216] relay append',error?.message||error);clearRelay();request(100);}
 }
 function startRelay(message){
  const mime=String(message.mime||'video/webm;codecs=vp8');
  if(typeof MediaSource!=='function'||!MediaSource.isTypeSupported(mime))return false;
  clearRelay();const video=view('relay');if(!video)return false;
  const mediaSource=new MediaSource(),url=URL.createObjectURL(mediaSource);
  const current={id:String(message.streamId||''),mime,mediaSource,url,buffer:null,queue:[],sequence:-1,ready:false};relay=current;
  try{video.srcObject=null;}catch{}video.src=url;video.play().catch(()=>{});trackFrames(video,'relay');
  mediaSource.addEventListener('sourceopen',()=>{
   if(relay!==current)return;
   try{
    current.buffer=mediaSource.addSourceBuffer(mime);try{current.buffer.mode='sequence';}catch{}
    current.buffer.addEventListener('updateend',()=>{
     if(relay!==current)return;current.ready=true;
     try{const ranges=video.buffered;if(ranges.length){const end=ranges.end(ranges.length-1);if(end-video.currentTime>.9)video.currentTime=Math.max(0,end-.08);}}catch{}
     pump(current);
    });pump(current);
   }catch(error){console.warn('[RouletteClient216] relay source',error?.message||error);clearRelay();}
  },{once:true});
  return true;
 }
 function relayChunk(message){
  if(!message.streamId||!message.data)return;
  if(!relay||relay.id!==String(message.streamId))startRelay(message);
  const current=relay;if(!current)return;
  const sequence=Number(message.sequence)||0;if(sequence<=current.sequence)return;current.sequence=sequence;
  try{current.queue.push(decode(message.data));}catch{return;}
  if(current.ready&&current.queue.length>12)current.queue.splice(0,current.queue.length-6);
  lastRelayChunk=Date.now();pump(current);
 }
 async function flushIce(session){
  if(!session.pc.remoteDescription)return;
  while(session.ice.length)try{await session.pc.addIceCandidate(session.ice.shift());}catch{}
 }
 async function offer(message){
  const host=String(message.fromPlayerId||''),hostInstance=String(message.fromInstanceId||'');
  if(!host||!message.description||typeof RTCPeerConnection!=='function')return;
  clearPeer();const pc=new RTCPeerConnection(rtcConfig),session={pc,host,hostInstance,ice:[],timer:0};peer=session;
  pc.onicecandidate=event=>{if(event.candidate)send({type:'rtc_ice',targetPlayerId:host,targetInstanceId:hostInstance,candidate:event.candidate.toJSON?.()||event.candidate});};
  pc.ontrack=event=>{
   if(peer!==session)return;
   try{if('playoutDelayHint'in event.receiver)event.receiver.playoutDelayHint=0;}catch{}
   const stream=event.streams?.[0]||new MediaStream([event.track]);
   const attach=()=>{
    if(peer!==session)return;const video=view('p2p');if(!video){setTimeout(attach,80);return;}
    try{video.removeAttribute('src');video.srcObject=stream;}catch{}video.play().catch(()=>{});trackFrames(video,'p2p');
    // Do not stop the relay here. It remains warm until real decoded P2P frames
    // have advanced continuously, avoiding the black gap seen on connection.
   };attach();
  };
  pc.onconnectionstatechange=()=>{
   if(peer!==session)return;const state=pc.connectionState;
   if(state==='connected')clearTimeout(session.timer);
   else if(state==='failed'||state==='closed')clearPeer({retry:true});
   else if(state==='disconnected'){
    clearTimeout(session.timer);session.timer=setTimeout(()=>{if(peer===session&&pc.connectionState==='disconnected')clearPeer({retry:true});},1800);
   }
  };
  try{
   await pc.setRemoteDescription(message.description);await pc.setLocalDescription(await pc.createAnswer());
   send({type:'rtc_answer',targetPlayerId:host,targetInstanceId:hostInstance,description:pc.localDescription.toJSON?.()||pc.localDescription});await flushIce(session);
  }catch(error){console.warn('[RouletteClient216] offer',error?.message||error);clearPeer({retry:true});}
 }
 function request(delay=0,{relayToo=true}={}){
  clearTimeout(offerTimer);offerTimer=setTimeout(()=>{
   if(!client.online)return;const now=Date.now();if(now-lastRequest<180&&delay===0)return;lastRequest=now;
   send({type:'rtc_watch'});if(relayToo)send({type:'rtc_fallback_request'});
  },delay);
 }
 async function onMessage(message){
  if(message.type==='rtc_host_ready'){request(0);return;}
  if(message.type==='rtc_host_offline'){clearPeer();clearRelay();showLocal(true);return;}
  if(message.targetInstanceId&&message.targetInstanceId!==instanceId)return;
  if(message.type==='rtc_offer'){await offer(message);return;}
  if(message.type==='rtc_ice'){
   const session=peer;if(!session)return;
   if(session.pc.remoteDescription)try{await session.pc.addIceCandidate(message.candidate);}catch{}else session.ice.push(message.candidate);return;
  }
  if(message.type==='rtc_media'){relayChunk(message);return;}
  if(message.type==='rtc_media_stop'&&(!message.streamId||relay?.id===message.streamId)){
   const p2pFresh=Date.now()-p2pLastFrame<1000;
   if(p2pFresh)clearRelay();else request(80);
  }
 }
 function health(){
  const now=Date.now(),round=client.round,playing=round?.phase==='PLAYING';
  if(!playing){showLocal(false);return;}
  const p2pFresh=!!p2pLastFrame&&now-p2pLastFrame<1100;
  const relayFresh=!!relayLastFrame&&now-relayLastFrame<1500;
  if(p2pFresh){
   setActive('p2p');
   if(relay&&p2pStableSince&&now-p2pStableSince>3200){
    send({type:'rtc_fallback_stop',targetPlayerId:peer?.host,targetInstanceId:peer?.hostInstance});
    // Keep the already buffered relay for a short overlap before releasing it.
    setTimeout(()=>{if(Date.now()-p2pLastFrame<1000)clearRelay();},700);
   }
  }else if(relayFresh){setActive('relay');}
  else{
   showLocal(true);request(0);
   if(peer?.pc?.connectionState==='connected'&&now-p2pLastFrame>2600)clearPeer({retry:true});
  }
  if(!relay||now-lastRelayChunk>1700){
   if(!p2pFresh)request(0);
  }
  for(const video of [p2pVideo,relayVideo])if(video?.paused)video.play().catch(()=>{});
 }
 client.on(message=>{
  onMessage(message);
  if(['snapshot','host_changed','host_status','round_started','participant_joined','ball_result','server_fallback_started'].includes(message.type))request(50,{relayToo:true});
 });
 client.ready.then(ok=>{if(ok){view('p2p');view('relay');request(80);}});
 healthTimer=setInterval(health,400);
 addEventListener('beforeunload',()=>{clearTimeout(offerTimer);clearInterval(healthTimer);clearPeer();clearRelay();},{once:true});
 window.SweetsRouletteClientV216={request,health,showLocal,get source(){return activeSource;}};
 console.info('[RouletteClient216] dual-path seamless physical roulette video enabled');
}
boot();
})();

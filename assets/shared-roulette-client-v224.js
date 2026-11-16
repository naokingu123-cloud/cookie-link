(()=>{
'use strict';
if(window.__sweetsRouletteClientV224)return;
window.__sweetsRouletteClientV224=true;
const params=new URLSearchParams(location.search);
if(params.get('serverHost')==='1'||params.get('serverSettlementWorker')==='1')return;
const PROTOCOL=197;
const instanceId=(crypto.randomUUID?.()||Date.now()+''+Math.random()).replace(/\W/g,'').slice(0,24);
const rtcConfig={iceServers:[{urls:'stun:stun.cloudflare.com:3478'},{urls:'stun:stun.l.google.com:19302'}],iceCandidatePoolSize:3,bundlePolicy:'max-bundle'};

function boot(){
 const client=window.SweetsSharedMachine?.client;
 if(!client){setTimeout(boot,70);return;}
 let peer=null,relay=null,p2pVideo=null,relayVideo=null,healthTimer=0,requestTimer=0;
 let p2pFrameAt=0,relayFrameAt=0,lastRelayChunk=0,lastRequest=0,source='',lastGood='',lastGoodAt=0;
 let requestRelayPending=false,relayRestartPending=false;
 const retiredStreams=new Set(),blockedVideos=new Set(),frameWatches={p2p:null,relay:null};
 const roundId=()=>String(client.round?.id||'');
 const send=message=>client.send({...message,protocol:PROTOCOL,instanceId,roundId:roundId()});
 function css(){
  if(document.getElementById('shared-roulette-v224-css'))return;
  const style=document.createElement('style');style.id='shared-roulette-v224-css';style.textContent=`
   #cookie-roulette .a8-stage{position:absolute!important;overflow:hidden!important;isolation:isolate}
   #cookie-roulette .shared-roulette-v224{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;object-fit:contain!important;background:#02070b!important;pointer-events:none!important;opacity:0;transition:opacity .08s linear;transform:translateZ(0)}
   #cookie-roulette .shared-roulette-v224[data-active="1"]{opacity:1!important}
   #cookie-roulette .shared-roulette-relay-v224{z-index:10010!important}
   #cookie-roulette .shared-roulette-p2p-v224{z-index:10011!important}
   body.shared-roulette-v224-live #cookie-roulette .a8-stage>canvas{visibility:hidden!important}
   body.shared-roulette-v224-live #cookie-roulette .shared-roulette-mirror,body.shared-roulette-v224-live #cookie-roulette .shared-roulette-hold-v222{display:none!important}
   #cookie-roulette .roulette-reconnect-v224{position:absolute;right:8px;bottom:8px;z-index:10012;padding:3px 7px;border:1px solid #90bddc88;border-radius:8px;background:#06121dcc;color:#d8f4ff;font:800 9px/1.2 system-ui;opacity:0;pointer-events:none;transition:opacity .15s}
   #cookie-roulette .roulette-reconnect-v224[data-show="1"]{opacity:1;pointer-events:auto;cursor:pointer}`;
  document.head.append(style);
 }
 function cleanLegacy(){
  try{for(const node of document.querySelectorAll('.shared-roulette-hold-v222,.shared-roulette-mirror'))node.remove();}catch{}
  try{document.body.classList.remove('shared-roulette-hold-v222-live','shared-roulette-live','shared-roulette-v219-live');}catch{}
 }
 function stage(){css();cleanLegacy();return document.querySelector('#cookie-roulette .a8-stage');}
 function make(kind){
  const root=stage();if(!root)return null;const video=document.createElement('video');Object.assign(video,{autoplay:true,muted:true,playsInline:true,disablePictureInPicture:true});
  video.className=`shared-roulette-v224 shared-roulette-${kind}-v224`;video.dataset.active='0';root.append(video);return video;
 }
 function view(kind){if(kind==='p2p'){if(!p2pVideo?.isConnected)p2pVideo=make('p2p');return p2pVideo;}if(!relayVideo?.isConnected)relayVideo=make('relay');return relayVideo;}
 function indicator(show){
  const root=stage();if(!root)return;let node=root.querySelector('.roulette-reconnect-v224');
  if(!node){node=document.createElement('button');node.type='button';node.className='roulette-reconnect-v224';node.onclick=retryView;root.append(node);}
  node.textContent=blockedVideos.size?'映像を再生':lastGood?'映像再接続中・再試行':'映像接続中・再試行';node.dataset.show=show?'1':'0';
 }
 function play(video){
  const attached=video?.srcObject||video?.src;if(!attached)return;
  const failed=error=>{if((video.srcObject||video.src)!==attached)return;if(error?.name==='NotAllowedError'){blockedVideos.add(video);indicator(true);}else blockedVideos.delete(video);};
  try{Promise.resolve(video.play()).then(()=>{if((video.srcObject||video.src)===attached)blockedVideos.delete(video);}).catch(failed);}catch(error){failed(error);}
 }
 function retryView(){
  const blocked=blockedVideos.size>0;blockedVideos.clear();for(const video of [p2pVideo,relayVideo])play(video);
  // A user gesture can release autoplay without discarding an otherwise good
  // connection. Other retries rebuild only the failed video transports.
  if(!blocked){if(peer)retryPeer(peer,0);closeRelay();request(0,true,true);}indicator(true);
 }
 const decoded=video=>!!video&&video.readyState>=2&&video.videoWidth>0&&video.videoHeight>0;
 function setVisible(kind,reconnecting=false){
  const video=kind==='p2p'?p2pVideo:relayVideo;if(!decoded(video))return false;source=kind;
  if(p2pVideo)p2pVideo.dataset.active=kind==='p2p'?'1':'0';if(relayVideo)relayVideo.dataset.active=kind==='relay'?'1':'0';
  document.body.classList.add('shared-roulette-v224-live');indicator(reconnecting);try{rouletteDriver?.setPaused?.(true);}catch{}return true;
 }
 function activate(kind){if(setVisible(kind,false)){lastGood=kind;lastGoodAt=Date.now();}}
 function holdLast(){return lastGood&&setVisible(lastGood,true);}
 function showLocal(reconnecting=false){
  source='';if(p2pVideo)p2pVideo.dataset.active='0';if(relayVideo)relayVideo.dataset.active='0';document.body.classList.remove('shared-roulette-v224-live');indicator(reconnecting);
  try{rouletteDriver?.setPaused?.(true);}catch{}
 }
 function stopFrameWatch(kind){
  const watch=frameWatches[kind];frameWatches[kind]=null;if(!watch)return;watch.stopped=true;blockedVideos.delete(watch.video);
  for(const event of ['playing','loadeddata','timeupdate'])watch.video.removeEventListener?.(event,watch.mark);
  if(watch.frameId!=null)try{watch.video.cancelVideoFrameCallback?.(watch.frameId);}catch{}
 }
 function watchFrames(video,kind,owner){
  if(!video)return;stopFrameWatch(kind);const watch={video,owner,stopped:false,frameId:null,mark:null};frameWatches[kind]=watch;
  const current=()=>!watch.stopped&&frameWatches[kind]===watch&&video.isConnected&&(kind==='p2p'?peer===owner&&video.srcObject===owner.stream:relay===owner&&video.src===owner.url);
  watch.mark=()=>{
   if(!current()||!decoded(video))return;
   const now=Date.now();if(kind==='p2p')p2pFrameAt=now;else relayFrameAt=now;lastGood=kind;lastGoodAt=now;blockedVideos.delete(video);
  };
  for(const event of ['playing','loadeddata','timeupdate'])video.addEventListener(event,watch.mark);
  if(typeof video.requestVideoFrameCallback==='function'){const tick=()=>{if(!current())return;watch.mark();watch.frameId=video.requestVideoFrameCallback(tick);};watch.frameId=video.requestVideoFrameCallback(tick);}
  watch.mark();
 }
 function closePeer(expected=null){if(expected&&peer!==expected)return;stopFrameWatch('p2p');const current=peer;peer=null;if(current){clearTimeout(current.timer);try{current.pc.close();}catch{}}p2pFrameAt=0;}
 function retryPeer(current,delay=100){
  if(peer!==current)return;closePeer(current);
  // rtc_watch alone leaves a still-connected peer on the host untouched.
  // Request an explicit replacement when our decoder/negotiation has failed.
  send({type:'rtc_restart',targetPlayerId:current.host,targetInstanceId:current.hostInstance});request(delay,true);
 }
 function closeRelay(expected=null){
  if(expected&&relay!==expected)return;stopFrameWatch('relay');const current=relay;relay=null;
  if(current){retiredStreams.add(current.id);while(retiredStreams.size>24)retiredStreams.delete(retiredStreams.values().next().value);try{if(current.ms.readyState==='open')current.ms.endOfStream();}catch{}try{URL.revokeObjectURL(current.url);}catch{}}
  relayFrameAt=0;lastRelayChunk=0;if(relayVideo)try{relayVideo.removeAttribute('src');relayVideo.load();}catch{}
 }
 function decode(data){const binary=atob(data),bytes=new Uint8Array(binary.length);for(let index=0;index<binary.length;index++)bytes[index]=binary.charCodeAt(index);return bytes;}
 function pump(current){if(relay!==current||!current.sb||current.sb.updating||!current.queue.length)return;try{current.sb.appendBuffer(current.queue.shift());}catch(error){console.warn('[RouletteClient224] relay append',error?.message||error);closeRelay(current);request(100,true,true);}}
 function startRelay(message){
  const mime=String(message.mime||'video/webm;codecs=vp8');if(typeof MediaSource!=='function'||!MediaSource.isTypeSupported(mime))return false;closeRelay();const video=view('relay');if(!video)return false;
  const ms=new MediaSource(),url=URL.createObjectURL(ms),current={id:String(message.streamId||''),ms,url,sb:null,queue:[],seq:-1,createdAt:Date.now()};relay=current;
  try{video.srcObject=null;}catch{}video.src=url;play(video);watchFrames(video,'relay',current);
  ms.addEventListener('sourceopen',()=>{
   if(relay!==current)return;
   try{
    current.sb=ms.addSourceBuffer(mime);try{current.sb.mode='sequence';}catch{}
    current.sb.addEventListener('error',()=>{if(relay!==current)return;closeRelay(current);request(100,true,true);});
    current.sb.addEventListener('updateend',()=>{
     if(relay!==current)return;
     try{const ranges=video.buffered;if(ranges.length){const end=ranges.end(ranges.length-1);if(end-video.currentTime>.9)video.currentTime=Math.max(0,end-.08);if(video.currentTime-ranges.start(0)>12){current.sb.remove(0,Math.max(0,video.currentTime-4));return;}}}catch{}
     pump(current);
    });pump(current);
   }catch(error){console.warn('[RouletteClient224] relay source',error?.message||error);closeRelay(current);request(100,true,true);}
  },{once:true});return true;
 }
 function relayChunk(message){
  const id=String(message.streamId||''),seq=Number(message.sequence);if(!id||!message.data||!Number.isInteger(seq)||seq<0||retiredStreams.has(id))return;
  // Every new MediaSource needs the recorder's first WebM chunk. Mid-stream
  // reconnects and missing chunks request a new stream instead of decoding junk.
  if(!relay||relay.id!==id){if(seq!==0){request(0,true,true);return;}if(!startRelay(message))return;}
  const current=relay;if(!current||seq<=current.seq)return;
  if(seq!==current.seq+1){closeRelay(current);request(100,true,true);return;}
  try{current.queue.push(decode(message.data));current.seq=seq;}catch{closeRelay(current);request(100,true,true);return;}
  if(current.queue.length>14){closeRelay(current);request(100,true,true);return;}
  lastRelayChunk=Date.now();pump(current);
 }
 async function flushIce(session){if(!session.pc.remoteDescription)return;while(peer===session&&session.ice.length)try{await session.pc.addIceCandidate(session.ice.shift());}catch{}}
 async function offer(message){
  const now=Date.now(),host=String(message.fromPlayerId||''),hostInstance=String(message.fromInstanceId||'');if(peer?.host===host&&peer?.hostInstance===hostInstance&&peer?.pc?.connectionState==='connected'&&now-p2pFrameAt<1000)return;
  if(!host||!message.description||typeof RTCPeerConnection!=='function')return;closePeer();const pc=new RTCPeerConnection(rtcConfig),session={pc,host,hostInstance,ice:[],timer:0,createdAt:Date.now()};peer=session;
  pc.onicecandidate=event=>{if(peer===session&&event.candidate)send({type:'rtc_ice',targetPlayerId:host,targetInstanceId:hostInstance,candidate:event.candidate.toJSON?.()||event.candidate});};
  pc.ontrack=event=>{if(peer!==session)return;const stream=event.streams?.[0]||new MediaStream([event.track]);session.stream=stream;const attach=()=>{if(peer!==session)return;const video=view('p2p');if(!video){setTimeout(attach,70);return;}video.srcObject=stream;play(video);watchFrames(video,'p2p',session);};attach();};
  pc.onconnectionstatechange=()=>{if(peer!==session)return;const state=pc.connectionState;if(state==='failed'||state==='closed'){retryPeer(session,100);}else if(state==='disconnected'){clearTimeout(session.timer);session.timer=setTimeout(()=>{if(peer===session&&pc.connectionState==='disconnected')retryPeer(session,0);},1800);}};
  try{
   await pc.setRemoteDescription(message.description);if(peer!==session)return;
   const description=await pc.createAnswer();if(peer!==session)return;
   await pc.setLocalDescription(description);if(peer!==session)return;
   send({type:'rtc_answer',targetPlayerId:host,targetInstanceId:hostInstance,description:pc.localDescription.toJSON?.()||pc.localDescription});await flushIce(session);
  }catch(error){if(peer!==session)return;console.warn('[RouletteClient224] offer',error?.message||error);retryPeer(session,160);}
 }
 function request(delay=0,relayToo=true,restartRelay=false){
  requestRelayPending=requestRelayPending||relayToo;relayRestartPending=relayRestartPending||restartRelay;clearTimeout(requestTimer);
  const run=()=>{
   if(!client.online)return;const now=Date.now(),remaining=650-(now-lastRequest);if(remaining>0){requestTimer=setTimeout(run,remaining);return;}
   lastRequest=now;send({type:'rtc_watch'});
   if(requestRelayPending||relayRestartPending){if(relayRestartPending)send({type:'rtc_fallback_stop'});send({type:'rtc_fallback_request'});requestRelayPending=false;relayRestartPending=false;}
  };
  requestTimer=setTimeout(run,Math.max(0,delay));
 }
 async function onMessage(value){
  if(value.type==='rtc_host_ready'){request(0,true);return;}if(value.type==='rtc_host_offline'){holdLast()||showLocal(true);request(500,true);return;}
  if(value.targetInstanceId&&value.targetInstanceId!==instanceId)return;if(value.type==='rtc_offer'){await offer(value);return;}
  if(value.type==='rtc_ice'){const session=peer;if(!session||value.fromPlayerId&&value.fromPlayerId!==session.host||value.fromInstanceId&&value.fromInstanceId!==session.hostInstance)return;if(session.pc.remoteDescription)try{await session.pc.addIceCandidate(value.candidate);}catch{}else session.ice.push(value.candidate);return;}
  if(value.type==='rtc_media'){relayChunk(value);return;}if(value.type==='rtc_media_stop'&&(!value.streamId||relay?.id===value.streamId)){closeRelay();if(Date.now()-p2pFrameAt>1200)request(80,true);}
 }
 function isFresh(){const now=Date.now();return !!((decoded(p2pVideo)&&p2pFrameAt&&now-p2pFrameAt<1500)||(decoded(relayVideo)&&relayFrameAt&&now-relayFrameAt<1900));}
 function health(){
  cleanLegacy();const now=Date.now(),p2pFresh=decoded(p2pVideo)&&!!p2pFrameAt&&now-p2pFrameAt<1500,relayFresh=decoded(relayVideo)&&!!relayFrameAt&&now-relayFrameAt<1900;
  // Ball messages and round boundaries never rebuild the video. A short frame
  // stall keeps the last decoded remote frame visible while P2P/relay recover.
  if(p2pFresh)activate('p2p');else if(relayFresh)activate('relay');else if(!(lastGoodAt&&now-lastGoodAt<6000&&holdLast()))showLocal(true);
  if(peer&&!blockedVideos.has(p2pVideo)){const connected=peer.pc.connectionState==='connected',age=now-(p2pFrameAt||peer.createdAt);if(connected&&age>3500||!connected&&age>8000)retryPeer(peer,100);}
  // Receiving chunks is not proof of successful decoding. A silent MediaSource
  // stall must obtain a fresh WebM header even while packets keep arriving.
  if(relay&&now-(relayFrameAt||relay.createdAt)>5000&&!blockedVideos.has(relayVideo)){closeRelay(relay);request(0,true,true);}
  if(!relay||now-lastRelayChunk>2400)request(0,true);
  for(const video of [p2pVideo,relayVideo])if(video?.paused)play(video);
 }
 client.on(value=>{onMessage(value);if(['host_changed','host_status'].includes(value?.type))request(80,true);});
 client.ready.then(ok=>{if(ok){view('p2p');view('relay');request(60,true);}});healthTimer=setInterval(health,300);
 addEventListener('beforeunload',()=>{clearTimeout(requestTimer);clearInterval(healthTimer);closePeer();closeRelay();},{once:true});
 window.SweetsRouletteClientV224={request,retry:retryView,health,isFresh,describe:()=>({state:isFresh()?'playing':blockedVideos.size?'playback-blocked':lastGood?'reconnecting':'connecting',source,peerState:peer?.pc.connectionState||'none',relayStreamId:relay?.id||'',p2pFrameAt,relayFrameAt,lastRelayChunk}),get source(){return source;},get lastGoodAt(){return lastGoodAt;}};
 console.info('[RouletteClient224] continuous cross-round P2P/relay stream with last-frame hold enabled');
}
boot();
})();


(()=>{
'use strict';
if(window.__sweetsRouletteClientV218)return;
window.__sweetsRouletteClientV218=true;
const params=new URLSearchParams(location.search);
if(params.get('serverHost')==='1'||params.get('serverSettlementWorker')==='1')return;
const PROTOCOL=197,instanceId=(crypto.randomUUID?.()||Date.now()+''+Math.random()).replace(/\W/g,'').slice(0,24);
const rtcConfig={iceServers:[{urls:'stun:stun.cloudflare.com:3478'},{urls:'stun:stun.l.google.com:19302'}],iceCandidatePoolSize:3,bundlePolicy:'max-bundle'};

function boot(){
 const client=window.SweetsSharedMachine?.client;if(!client){setTimeout(boot,70);return;}
 let peer=null,relay=null,p2pVideo=null,relayVideo=null,healthTimer=0,requestTimer=0;
 let p2pFrameAt=0,relayFrameAt=0,lastRelayChunk=0,lastRequest=0,source='';
 const roundId=()=>String(client.round?.id||'');
 const send=message=>client.send({...message,protocol:PROTOCOL,instanceId,roundId:roundId()});
 function css(){
  if(document.getElementById('shared-roulette-v218-css'))return;
  const style=document.createElement('style');style.id='shared-roulette-v218-css';style.textContent=`
  #cookie-roulette .a8-stage{position:relative!important;overflow:hidden!important;isolation:isolate}
  #cookie-roulette .shared-roulette-v218{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;object-fit:contain!important;background:#02070b!important;pointer-events:none!important;opacity:0;transition:opacity .06s linear;transform:translateZ(0)}
  #cookie-roulette .shared-roulette-v218[data-active="1"]{opacity:1!important}
  #cookie-roulette .shared-roulette-relay-v218{z-index:10010!important}#cookie-roulette .shared-roulette-p2p-v218{z-index:10011!important}
  body.shared-roulette-v218-live #cookie-roulette .a8-stage>canvas{visibility:hidden!important}
  body.shared-roulette-v218-live #cookie-roulette .shared-roulette-mirror{display:none!important}
  #cookie-roulette .roulette-reconnect-v218{position:absolute;right:8px;bottom:8px;z-index:10012;padding:3px 7px;border-radius:8px;background:#06121dcc;color:#d8f4ff;font:800 9px/1.2 system-ui;display:none}
  #cookie-roulette .roulette-reconnect-v218[data-show="1"]{display:block}`;document.head.append(style);
 }
 function stage(){css();return document.querySelector('#cookie-roulette .a8-stage');}
 function make(kind){
  const root=stage();if(!root)return null;const video=document.createElement('video');
  Object.assign(video,{autoplay:true,muted:true,playsInline:true,disablePictureInPicture:true});
  video.className=`shared-roulette-v218 shared-roulette-${kind}-v218`;video.dataset.active='0';root.append(video);return video;
 }
 function view(kind){if(kind==='p2p'){if(!p2pVideo?.isConnected)p2pVideo=make('p2p');return p2pVideo;}if(!relayVideo?.isConnected)relayVideo=make('relay');return relayVideo;}
 function indicator(show){const root=stage();if(!root)return;let node=root.querySelector('.roulette-reconnect-v218');if(!node){node=document.createElement('span');node.className='roulette-reconnect-v218';node.textContent='映像再接続中';root.append(node);}node.dataset.show=show?'1':'0';}
 function activate(kind){
  const video=kind==='p2p'?p2pVideo:relayVideo;if(!video)return local(true);source=kind;
  if(p2pVideo)p2pVideo.dataset.active=kind==='p2p'?'1':'0';if(relayVideo)relayVideo.dataset.active=kind==='relay'?'1':'0';
  document.body.classList.add('shared-roulette-v218-live');indicator(false);
  try{rouletteDriver?.setPaused?.(true);}catch{}
 }
 function local(reconnecting=false){
  source='';if(p2pVideo)p2pVideo.dataset.active='0';if(relayVideo)relayVideo.dataset.active='0';document.body.classList.remove('shared-roulette-v218-live');indicator(reconnecting);
  try{if(!app?.paused)rouletteDriver?.setPaused?.(false);}catch{}
 }
 function watchFrames(video,kind){
  if(!video||video.dataset.watchV218)return;video.dataset.watchV218='1';
  const mark=()=>{if(kind==='p2p')p2pFrameAt=Date.now();else relayFrameAt=Date.now();};
  video.addEventListener('playing',mark);video.addEventListener('timeupdate',mark);
  if(typeof video.requestVideoFrameCallback==='function'){const tick=()=>{if(!video.isConnected)return;mark();video.requestVideoFrameCallback(tick);};video.requestVideoFrameCallback(tick);}
 }
 function closePeer(){const current=peer;peer=null;if(current){clearTimeout(current.timer);try{current.pc.close();}catch{}}p2pFrameAt=0;if(p2pVideo)try{p2pVideo.srcObject=null;}catch{}}
 function closeRelay(){const current=relay;relay=null;if(current){try{if(current.ms.readyState==='open')current.ms.endOfStream();}catch{}try{URL.revokeObjectURL(current.url);}catch{}}relayFrameAt=0;lastRelayChunk=0;if(relayVideo)try{relayVideo.removeAttribute('src');relayVideo.load();}catch{}}
 function decode(data){const binary=atob(data),bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return bytes;}
 function pump(current){if(relay!==current||!current.sb||current.sb.updating||!current.queue.length)return;try{current.sb.appendBuffer(current.queue.shift());}catch{closeRelay();request(80,true);}}
 function startRelay(message){
  const mime=String(message.mime||'video/webm;codecs=vp8');if(typeof MediaSource!=='function'||!MediaSource.isTypeSupported(mime))return false;
  closeRelay();const video=view('relay');if(!video)return false;const ms=new MediaSource(),url=URL.createObjectURL(ms),current={id:String(message.streamId||''),ms,url,sb:null,queue:[],seq:-1};relay=current;
  try{video.srcObject=null;}catch{}video.src=url;video.play().catch(()=>{});watchFrames(video,'relay');
  ms.addEventListener('sourceopen',()=>{if(relay!==current)return;try{current.sb=ms.addSourceBuffer(mime);try{current.sb.mode='sequence';}catch{}current.sb.addEventListener('updateend',()=>{if(relay!==current)return;try{const ranges=video.buffered;if(ranges.length){const end=ranges.end(ranges.length-1);if(end-video.currentTime>.85)video.currentTime=Math.max(0,end-.07);}}catch{}pump(current);});pump(current);}catch{closeRelay();}},{once:true});return true;
 }
 function relayChunk(message){
  if(!message.streamId||!message.data)return;if(!relay||relay.id!==String(message.streamId))startRelay(message);const current=relay;if(!current)return;
  const seq=Number(message.sequence)||0;if(seq<=current.seq)return;current.seq=seq;try{current.queue.push(decode(message.data));}catch{return;}
  if(current.queue.length>14)current.queue.splice(0,current.queue.length-7);lastRelayChunk=Date.now();pump(current);
 }
 async function flushIce(session){if(!session.pc.remoteDescription)return;while(session.ice.length)try{await session.pc.addIceCandidate(session.ice.shift());}catch{}}
 async function offer(message){
  const now=Date.now();if(peer?.pc?.connectionState==='connected'&&now-p2pFrameAt<900)return;
  const host=String(message.fromPlayerId||''),hostInstance=String(message.fromInstanceId||'');if(!host||!message.description||typeof RTCPeerConnection!=='function')return;
  closePeer();const pc=new RTCPeerConnection(rtcConfig),session={pc,host,hostInstance,ice:[],timer:0};peer=session;
  pc.onicecandidate=event=>{if(event.candidate)send({type:'rtc_ice',targetPlayerId:host,targetInstanceId:hostInstance,candidate:event.candidate.toJSON?.()||event.candidate});};
  pc.ontrack=event=>{if(peer!==session)return;const stream=event.streams?.[0]||new MediaStream([event.track]);const attach=()=>{if(peer!==session)return;const video=view('p2p');if(!video){setTimeout(attach,70);return;}video.srcObject=stream;video.play().catch(()=>{});watchFrames(video,'p2p');};attach();};
  pc.onconnectionstatechange=()=>{if(peer!==session)return;const state=pc.connectionState;if(state==='failed'||state==='closed')closePeer();else if(state==='disconnected'){clearTimeout(session.timer);session.timer=setTimeout(()=>{if(peer===session&&pc.connectionState==='disconnected'){closePeer();request(0,true);}},1600);}};
  try{await pc.setRemoteDescription(message.description);await pc.setLocalDescription(await pc.createAnswer());send({type:'rtc_answer',targetPlayerId:host,targetInstanceId:hostInstance,description:pc.localDescription.toJSON?.()||pc.localDescription});await flushIce(session);}catch{closePeer();request(120,true);}
 }
 function request(delay=0,relayToo=true){
  clearTimeout(requestTimer);requestTimer=setTimeout(()=>{if(!client.online)return;const now=Date.now();if(now-lastRequest<350)return;lastRequest=now;send({type:'rtc_watch'});if(relayToo)send({type:'rtc_fallback_request'});},delay);
 }
 async function message(value){
  if(value.type==='rtc_host_ready'){request(0,true);return;}if(value.type==='rtc_host_offline'){local(true);return;}
  if(value.targetInstanceId&&value.targetInstanceId!==instanceId)return;
  if(value.type==='rtc_offer'){await offer(value);return;}
  if(value.type==='rtc_ice'){const session=peer;if(!session)return;if(session.pc.remoteDescription)try{await session.pc.addIceCandidate(value.candidate);}catch{}else session.ice.push(value.candidate);return;}
  if(value.type==='rtc_media'){relayChunk(value);return;}
  if(value.type==='rtc_media_stop'&&(!value.streamId||relay?.id===value.streamId)){closeRelay();if(client.round?.phase==='PLAYING')request(50,true);}
 }
 function health(){
  const now=Date.now(),playing=client.round?.phase==='PLAYING';
  if(!playing){local(false);return;}
  const p2pFresh=p2pFrameAt&&now-p2pFrameAt<1050,relayFresh=relayFrameAt&&now-relayFrameAt<1550;
  if(p2pFresh)activate('p2p');else if(relayFresh)activate('relay');else local(true);
  // Relay remains warm for the entire PLAYING phase. Never stop it merely because
  // P2P became connected; this removes the intermittent blank/refresh gap.
  if(!p2pFresh)request(0,!relayFresh||now-lastRelayChunk>1000);
  else if(!relayFresh||now-lastRelayChunk>1800)request(0,true);
  for(const video of [p2pVideo,relayVideo])if(video?.paused)video.play().catch(()=>{});
 }
 client.on(value=>{message(value);if(['round_started','server_fallback_started','host_changed','host_status'].includes(value?.type))request(40,true);});
 client.ready.then(ok=>{if(ok){view('p2p');view('relay');request(80,true);}});healthTimer=setInterval(health,300);
 addEventListener('beforeunload',()=>{clearTimeout(requestTimer);clearInterval(healthTimer);closePeer();closeRelay();},{once:true});
 window.SweetsRouletteClientV218={request,health,get source(){return source;}};
 console.info('[RouletteClientV218] persistent warm relay and decoded-frame failover enabled');
}
boot();
})();

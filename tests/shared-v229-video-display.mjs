import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const [clientSource,hostSource,previousTests]=await Promise.all([
 readFile(process.env.VIDEO_CLIENT_SOURCE||new URL('../assets/shared-roulette-client-v224.js',import.meta.url),'utf8'),
 readFile(process.env.VIDEO_HOST_SOURCE||new URL('../assets/shared-roulette-webrtc-host-v224.js',import.meta.url),'utf8'),
 readFile(new URL('./shared-v225-video-reconnect.mjs',import.meta.url),'utf8')
]);
const flush=async()=>{for(let i=0;i<35;i++)await Promise.resolve();};
function section(source,start,end){const a=source.indexOf(start),b=source.indexOf(end,a);assert.ok(a>=0&&b>a,'existing fixture boundary: '+start);return source.slice(a,b);}
const common=section(previousTests,'function deferred(){','function makeHost(){');
const buildClient=new Function('clientSource','vm','assert','flush',common+section(previousTests,'function makeClient(){','\nconst viewer=makeClient();')+'\nreturn makeClient();');
const buildHost=new Function('hostSource','vm','assert','flush',common+section(previousTests,'function makeHost(){','\nconst host=makeHost();')+'\nreturn makeHost();');
const chunk=(streamId,sequence)=>({type:'rtc_media',streamId,sequence,mime:'video/webm;codecs=vp8',data:Buffer.from([0x1a,0x45,sequence]).toString('base64')});

function viewer(){
 let context;const flags={blockPlayback:false},pauses=[],classes=new Set();
 const h=buildClient(clientSource,{runInNewContext(source,c,options){
  context=c;const create=c.document.createElement;
  c.document.body.classList={add(...names){names.forEach(name=>classes.add(name));},remove(...names){names.forEach(name=>classes.delete(name));}};
  c.rouletteDriver.setPaused=value=>pauses.push(value);
  c.document.createElement=tag=>{
   const node=create(tag);if(tag!=='video')return node;
   node.readyState=0;node.videoWidth=0;node.videoHeight=0;node.paused=true;node.frames=new Map();let frameId=0;
   node.removeEventListener=(name,fn)=>node.listeners.set(name,(node.listeners.get(name)||[]).filter(callback=>callback!==fn));
   node.requestVideoFrameCallback=fn=>{node.frames.set(++frameId,fn);return frameId;};node.cancelVideoFrameCallback=id=>node.frames.delete(id);
   node.play=()=>{if(flags.blockPlayback)return Promise.reject(Object.assign(Error('gesture required'),{name:'NotAllowedError'}));node.paused=false;return Promise.resolve();};
   node.load=()=>{node.readyState=0;node.videoWidth=node.videoHeight=0;};
   node.frame=()=>{
    node.readyState=4;node.videoWidth=720;node.videoHeight=405;node.currentTime+=1/30;
    const pending=[...node.frames.values()];node.frames.clear();for(const callback of pending)callback();node.emit('timeupdate');
   };
   return node;
  };
  return vm.runInNewContext(source,c,options);
 }},assert,flush);
 return Object.assign(h,{context,flags,pauses,classes,video:kind=>h.stage.children.find(node=>node.className?.includes('shared-roulette-'+kind+'-v224'))});
}
async function attach(h,sdp='test-offer'){
 h.dispatch({type:'rtc_offer',fromPlayerId:'host',fromInstanceId:'host-tab',description:{type:'offer',sdp}});await flush();
 const peer=h.peers.at(-1),stream={getVideoTracks:()=>[{kind:'video',readyState:'live'}]};peer.connectionState='connected';peer.ontrack({streams:[stream]});await flush();return peer;
}
const cases=[];
async function check(name,test){if(process.env.VIDEO_DISPLAY_CASE&&process.env.VIDEO_DISPLAY_CASE!==name)return;await test();cases.push(name);}

await check('layout',async()=>{
 const h=viewer();await flush();const css=h.context.document.getElementById('shared-roulette-v224-css').textContent;
 const stageRule=css.match(/#cookie-roulette \.a8-stage\{([^}]+)\}/)?.[1]||'';
 // Native inset rules establish the viewport even without a local canvas.
 // A relative auto-height stage collapses because both loading/video are absolute.
 assert.match(stageRule,/position:absolute!important/,'video must retain the native absolute stage viewport');
 assert.doesNotMatch(stageRule,/(?:height|inset):/,'responsive native insets determine the stage size');
});

await check('decoded-frames',async()=>{
 const h=viewer();await flush();const first=await attach(h),video=h.video('p2p');
 video.emit('playing');video.emit('timeupdate');h.api.health();
 assert.equal(h.api.isFresh(),false,'playing/timeupdate with no decoded video dimensions cannot hide the waiting display');
 assert.equal(video.dataset.active,'0');assert.equal(h.classes.has('shared-roulette-v224-live'),false);
 video.frame();h.api.health();assert.equal(h.api.isFresh(),true);assert.equal(video.dataset.active,'1');assert.equal(h.api.source,'p2p');
 const lateEvent=video.listeners.get('timeupdate')[0],lateFrame=[...video.frames.values()][0];
 first.connectionState='failed';first.onconnectionstatechange();
 video.readyState=0;video.videoWidth=video.videoHeight=0;await attach(h,'replacement-offer');
 video.readyState=4;video.videoWidth=720;video.videoHeight=405;
 lateEvent();lateFrame();h.api.health();assert.equal(h.api.isFresh(),false,'retired video event/frame callbacks cannot make a replacement fresh');
 video.frame();h.api.health();assert.equal(h.api.source,'p2p');assert.equal(h.api.isFresh(),true);
 const peerCount=h.peers.length,sourceCount=h.sources.length;
 h.client.round={id:'round-2'};for(const type of ['snapshot','round_complete','round_started'])h.dispatch({type,round:h.client.round});await flush();
 assert.equal(h.peers.length,peerCount);assert.equal(h.sources.length,sourceCount);assert.equal(video.dataset.active,'1','round boundaries retain the same remote video');
 assert.ok(h.pauses.every(value=>value===true),'waiting or reconnecting video must never unpause the local physical roulette');
});

await check('decoder-stall',async()=>{
 const h=viewer();await flush();h.dispatch(chunk('undecodable',0));h.sources[0].open();
 for(let sequence=1;sequence<=12;sequence++){
  await h.clock.advance(450);h.dispatch(chunk('undecodable',sequence));h.api.health();await h.clock.advance(0);
 }
 assert.equal(h.sources[0].readyState,'ended','continuous packets without a decoded frame must retire the stalled decoder');
 assert.ok(h.messages.some(message=>message.type==='rtc_fallback_stop'),'a silent decode stall must request a new WebM header');
 assert.equal(h.api.isFresh(),false);
 h.dispatch(chunk('recovered',0));const source=h.sources.at(-1);source.open();h.video('relay').frame();h.api.health();
 assert.equal(h.api.isFresh(),true);assert.equal(h.api.source,'relay');assert.equal(h.video('relay').dataset.active,'1');
 assert.equal(h.api.describe().state,'playing');
 const count=h.sources.length;h.client.round={id:'round-2'};h.dispatch({type:'round_started'});h.dispatch(chunk('recovered',1));await flush();
 assert.equal(h.sources.length,count,'a recovered stream continues into the next game without another recorder/header restart');
 h.dispatch({type:'rtc_media_stop',streamId:'recovered'});h.api.health();
 assert.equal(h.api.isFresh(),false);assert.equal(h.video('relay').dataset.active,'0','last-frame hold must not reactivate a cleared decoder with no image');
 assert.equal(h.classes.has('shared-roulette-v224-live'),false);
});

await check('playback-gesture',async()=>{
 const h=viewer();h.flags.blockPlayback=true;await flush();await attach(h);h.api.health();await flush();
 const indicator=h.stage.querySelector('.roulette-reconnect-v224');
 assert.equal(indicator.textContent,'映像を再生','autoplay rejection must provide an actionable playback state');
 assert.equal(indicator.dataset.show,'1');assert.equal(h.api.describe().state,'playback-blocked');
 await h.clock.advance(9000);h.api.health();await flush();assert.equal(h.peers[0].closed,false,'waiting for a playback gesture must not destroy the connected track');
 const count=h.peers.length;h.flags.blockPlayback=false;indicator.onclick();await flush();h.video('p2p').frame();h.api.health();
 assert.equal(h.peers.length,count,'a playback gesture must preserve the connected peer');assert.equal(h.api.isFresh(),true);assert.equal(indicator.dataset.show,'0');
});

await check('same-player-tab',async()=>{
 const h=buildHost(hostSource,vm,assert,flush);h.gate.resolve();await flush();
 const identity=h.messages.find(message=>message.type==='rtc_host_ready');assert.ok(identity);
 h.dispatch({type:'rtc_watch',fromPlayerId:'host',fromInstanceId:identity.instanceId});
 h.dispatch({type:'rtc_fallback_request',fromPlayerId:'host',fromInstanceId:identity.instanceId});await flush();
 assert.equal(h.api.peerCount,0);assert.equal(h.api.relayCount,0,'the host must not stream to its own exact instance');
 h.dispatch({type:'rtc_watch',fromPlayerId:'host',fromInstanceId:'separate-viewer-tab'});
 h.dispatch({type:'rtc_fallback_request',fromPlayerId:'host',fromInstanceId:'separate-viewer-tab'});await flush();
 assert.equal(h.api.peerCount,1,'a separate viewing instance must not be discarded solely because its saved player ID matches');
 assert.equal(h.api.relayCount,1);h.recorders[0].emit([0x1a,0x45]);await flush();
 assert.ok(h.messages.some(message=>message.type==='rtc_media'&&message.targetInstanceId==='separate-viewer-tab'&&message.sequence===0));
 h.dispatch({type:'rtc_peer_list',peers:[{playerId:'host',instanceId:'another-viewer-tab'}]});await flush();assert.equal(h.api.peerCount,2);
});

console.log('v229 video display: '+cases.join(', ')+' passed');

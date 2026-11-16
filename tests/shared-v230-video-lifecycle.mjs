import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const [clientSource,hostSource,displayTests,previousTests,bundle]=await Promise.all([
 readFile(process.env.VIDEO_CLIENT_SOURCE||new URL('../assets/shared-roulette-client-v224.js',import.meta.url),'utf8'),
 readFile(process.env.VIDEO_HOST_SOURCE||new URL('../assets/shared-roulette-webrtc-host-v224.js',import.meta.url),'utf8'),
 readFile(new URL('./shared-v229-video-display.mjs',import.meta.url),'utf8'),
 readFile(new URL('./shared-v225-video-reconnect.mjs',import.meta.url),'utf8'),
 readFile(new URL('../optimized/app-01.js',import.meta.url),'utf8')
]);
function section(source,start,end){const a=source.indexOf(start),b=source.indexOf(end,a);assert.ok(a>=0&&b>a,'fixture boundary: '+start);return source.slice(a,b);}
const fixture=new Function('assert','vm','clientSource','hostSource','previousTests',section(displayTests,'const flush=','const cases=[]')+'\nreturn {viewer,attach,flush,buildHost,chunk};');
const make=runner=>fixture(assert,runner||vm,clientSource,hostSource,previousTests),fx=make();
const nativePauseFactory=new Function('performance','cancelAnimationFrame','candyGame','jpcAudio','el','wake',
 'let paused=false,last=0,accumulator=0,frame=0;\n'+section(bundle,'function setPaused(value)','\n function startOrStop')+'\nreturn setPaused;');

function profile(h){
 const counts={pause:0,pauseText:0,pauseAttributes:0,indicatorText:0,dataset:0,classes:0,scans:0},seen=new WeakSet();
 function node(target){
  if(!target||seen.has(target))return target;seen.add(target);let text=target.textContent;
  Object.defineProperty(target,'textContent',{configurable:true,get:()=>text,set:value=>{counts.indicatorText++;text=value;}});
  if(target.dataset)target.dataset=new Proxy(target.dataset,{set(object,key,value){counts.dataset++;object[key]=value;return true;}});
  for(const child of target.children||[])node(child);return target;
 }
 node(h.stage);const doc=h.context.document,create=doc.createElement,scan=doc.querySelectorAll;
 doc.createElement=tag=>node(create(tag));doc.querySelectorAll=(...args)=>{counts.scans++;return scan(...args);};
 for(const method of ['add','remove']){const original=doc.body.classList[method];doc.body.classList[method]=(...args)=>{counts.classes++;return original(...args);};}
 function driver(){
  const button={set textContent(value){counts.pauseText++;},setAttribute(){counts.pauseAttributes++;}};
  // The production setter updates its audio/animation clock and writes its
  // native pause button even when true was already set on the previous tick.
  const native=nativePauseFactory({now:()=>h.clock.Date.now()},()=>{}, {pause(){}},{pause(){}},()=>button,()=>{});
  return {setPaused(value){counts.pause++;return native(value);}};
 }
 h.context.rouletteDriver=driver();
 return {counts,driver,reset(){for(const key of Object.keys(counts))counts[key]=0;}};
}
const completed=[];
async function check(name,test){if(process.env.VIDEO_LIFECYCLE_CASE&&process.env.VIDEO_LIFECYCLE_CASE!==name)return;await test();completed.push(name);}

await check('quiet-health',async()=>{
 const h=fx.viewer(),p=profile(h);await fx.flush();await fx.attach(h);const video=h.video('p2p');
 video.frame();h.api.health();await h.clock.advance(700);video.frame();h.api.health();p.reset();const sent=h.messages.length;
 for(let tick=0;tick<200;tick++){
  await h.clock.advance(300);video.frame();h.api.health();
  if(tick===99){h.client.round={id:'second-round'};h.dispatch({type:'round_complete'});h.dispatch({type:'snapshot',round:h.client.round});}
 }
 if(process.env.VIDEO_LIFECYCLE_METRICS)console.log('60 seconds / two rounds',JSON.stringify(p.counts));
 assert.equal(p.counts.pause,0,'healthy 300ms checks must not repeat native pause/audio/clock work');
 assert.equal(p.counts.indicatorText,0,'unchanged reconnect text must not generate child-list mutations');
 assert.equal(p.counts.dataset,0);assert.equal(p.counts.classes,0);assert.equal(p.counts.scans,0,'retired overlays need one cleanup, not repeated full-document scans');
 assert.equal(h.messages.length,sent,'healthy P2P without a relay must not request the same fallback every 650ms');
 assert.equal(h.api.isFresh(),true);assert.equal(h.peers.filter(peer=>!peer.closed).length,1);assert.equal(video.frames.size,1);
 for(const name of ['playing','loadeddata','timeupdate'])assert.equal(video.listeners.get(name).length,1);
 h.context.rouletteDriver.setPaused(false);assert.equal(p.counts.pause,1);h.api.health();assert.equal(p.counts.pause,2,'an external unpause still needs an immediate re-pause');
 h.api.health();assert.equal(p.counts.pause,2);
 h.context.rouletteDriver=p.driver();h.api.health();assert.equal(p.counts.pause,3,'a replacement local driver must be paused once');h.api.health();assert.equal(p.counts.pause,3);
 h.context.rouletteDriver.setPaused=p.driver().setPaused;h.api.health();assert.equal(p.counts.pause,4,'replacing only the native setter must refresh pause tracking');h.api.health();assert.equal(p.counts.pause,4);
});

await check('bounded-resources',async()=>{
 const h=fx.viewer();await fx.flush();await fx.attach(h);h.video('p2p').frame();h.api.health();
 for(let attempt=0;attempt<12;attempt++){
  const old=h.peers.at(-1);old.connectionState='failed';old.onconnectionstatechange();await fx.attach(h,'reconnect-'+attempt);h.video('p2p').frame();h.api.health();
  h.dispatch(fx.chunk('relay-'+attempt,0));h.sources.at(-1).open();h.video('relay').frame();h.api.health();
  assert.equal(h.peers.filter(peer=>!peer.closed).length,1);assert.equal(h.sources.filter(source=>source.readyState==='open').length,1);
  for(const kind of ['p2p','relay']){
   const video=h.video(kind);assert.equal(video.frames.size,1,'one frame callback per live video after repeated reconnects');
   for(const name of ['playing','loadeddata','timeupdate'])assert.equal(video.listeners.get(name).length,1,'video listeners cannot accumulate after reconnect');
  }
 }
 assert.equal(h.stage.children.filter(node=>node.tagName==='video').length,2,'reuse the two display elements instead of accumulating hidden decoders');
 assert.equal(h.stage.children.filter(node=>node.className==='roulette-reconnect-v224').length,1);
});

await check('host-announcements',async()=>{
 const h=fx.buildHost(hostSource,vm,assert,fx.flush);h.gate.resolve();await fx.flush();const initial=h.messages.length;
 for(let i=0;i<100;i++)h.dispatch({type:'snapshot'});await h.clock.advance(0);
 const count=()=>h.messages.slice(initial).filter(message=>message.type==='rtc_host_ready').length;
 if(process.env.VIDEO_LIFECYCLE_METRICS)console.log('100 same-tick snapshots',JSON.stringify({announcements:count()}));
 assert.equal(count(),0,'snapshot bursts must not each rebroadcast host readiness');
 await h.clock.advance(3000);h.dispatch({type:'snapshot'});assert.equal(count(),1,'periodic availability must still be announced');
 h.shared.client.ws={readyState:1};h.dispatch({type:'snapshot'});assert.equal(count(),2,'a new socket must announce immediately even inside the cooldown');
 for(let i=0;i<100;i++)h.dispatch({type:'snapshot'});await h.clock.advance(0);assert.equal(count(),2);
 h.dispatch({type:'rtc_watch',fromPlayerId:'viewer',fromInstanceId:'viewer-tab'});h.dispatch({type:'rtc_fallback_request',fromPlayerId:'viewer',fromInstanceId:'viewer-tab'});await fx.flush();
 const peerCount=h.peers.length,recorderCount=h.recorders.length;
 h.shared.client.round={id:'next-game'};h.dispatch({type:'snapshot'});await h.clock.advance(0);
 assert.equal(h.peers.length,peerCount);assert.equal(h.recorders.length,recorderCount,'availability throttling must not recreate the round-spanning recorder');
});

await check('healthy-viewer-announcements',async()=>{
 const h=fx.viewer();await fx.flush();await fx.attach(h);h.video('p2p').frame();h.api.health();await h.clock.advance(700);const initial=h.messages.length;
 for(let i=0;i<30;i++){
  h.video('p2p').frame();h.dispatch({type:'rtc_host_ready',fromPlayerId:'host',fromInstanceId:'host-tab'});await h.clock.advance(650);
 }
 assert.equal(h.messages.length,initial,'a healthy viewer must not answer every heartbeat with watch and fallback requests');
 h.video('p2p').frame();h.dispatch({type:'rtc_host_ready',fromPlayerId:'host',fromInstanceId:'replacement-host-tab'});await h.clock.advance(700);
 assert.ok(h.messages.slice(initial).some(message=>message.type==='rtc_watch'),'a host instance change must still request its new stream');
});

await check('unsupported-relay',async()=>{
 const limited=make({runInNewContext(source,context,options){context.MediaSource=class{static isTypeSupported(){return false;}};return vm.runInNewContext(source,context,options);}});
 const h=limited.viewer();await limited.flush();await h.clock.advance(700);
 assert.ok(h.messages.some(message=>message.type==='rtc_watch'));
 assert.equal(h.messages.filter(message=>message.type==='rtc_fallback_request').length,0,'a browser that cannot decode WebM must not subscribe to that continuous encoded stream');
});

console.log('v230 video lifecycle: '+completed.join(', ')+' passed');

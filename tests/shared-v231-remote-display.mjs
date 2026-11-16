import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const [clientSource,hostSource,displayTests,previousTests,bundle]=await Promise.all([
 readFile(new URL('../assets/shared-roulette-client-v224.js',import.meta.url),'utf8'),
 readFile(new URL('../assets/shared-roulette-webrtc-host-v224.js',import.meta.url),'utf8'),
 readFile(new URL('./shared-v229-video-display.mjs',import.meta.url),'utf8'),
 readFile(new URL('./shared-v225-video-reconnect.mjs',import.meta.url),'utf8'),
 readFile(new URL('../optimized/app-01.js',import.meta.url),'utf8')
]);
function section(source,start,end){const a=source.indexOf(start),b=source.indexOf(end,a);assert.ok(a>=0&&b>a,start);return source.slice(a,b);}
const fixture=new Function('assert','vm','clientSource','hostSource','previousTests',section(displayTests,'const flush=','const cases=[]')+'\nreturn {viewer,attach,flush,buildHost};');
const fx=fixture(assert,vm,clientSource,hostSource,previousTests);

// Invoke the real loader, including a second explicit retry. Player pages must
// not enter the module loader, create a renderer/physics world, or start a draw.
for(const host of [false,true]){
 const loading={},retry={},root={isConnected:true,dataset:{},querySelector:selector=>selector==='.a8-loading'?loading:{replaceChildren(){},textContent:''},querySelectorAll:()=>[]};
 const counts={modules:0,renderer:0,dispose:0,remote:0};
 const context={LOCAL_EIGHT_DRAW_ALLOWED:host,console:{error(){}},app:{phase:'ready',paused:false},window:{SweetsRouletteClientV224:{retry(){counts.remote++;}}},
  $:id=>id==='cookie-roulette'?root:retry,scheduleUI(){},scheduleAutoRound(){},sceneSound(){},jpcSession:{active:false},rouletteAllClearNumbers(){},rouletteReachTiers(){},rouletteSelectedBoard(){},
  loadRouletteModules:async()=>{counts.modules++;return [{},{}];},createCookieRoulette(){counts.renderer++;return{draw:{mode:'eight'},setPaused(){},dispose(){counts.dispose++;}};}};
 const code='let rouletteLoadEpoch=0,rouletteDriver=null,rouletteReady=false,manualNumbers=false;const rouletteDrawSource={number(){},fail(){}};\n'+section(bundle,'async function loadCookieRoulette(){','\nfunction rouletteReachTiers(){')+'\n(async()=>{await loadCookieRoulette();await loadCookieRoulette();return {rouletteDriver,rouletteReady};})()';
 const result=await vm.runInNewContext(code,context);
 if(host){assert.equal(counts.modules,2);assert.equal(counts.renderer,2);assert.equal(result.rouletteReady,true);}
 else{assert.equal(counts.modules,0);assert.equal(counts.renderer,0);assert.equal(counts.remote,2);assert.equal(result.rouletteDriver,null);assert.equal(result.rouletteReady,false);assert.match(loading.textContent,/サーバー/);assert.equal(retry.hidden,true);}
}

const images=[];
const frameVm={runInNewContext(source,c,options){
 c.Image=class{
  constructor(){this.naturalWidth=0;this.naturalHeight=0;this.dataset={};this.isConnected=false;this.tagName='img';images.push(this);}
  completeFrame(ok=true){if(ok){this.naturalWidth=720;this.naturalHeight=405;this.onload?.();}else this.onerror?.();}
  remove(){const list=c.document.querySelector('#cookie-roulette .a8-stage').children,index=list.indexOf(this);if(index>=0)list.splice(index,1);this.isConnected=false;}
 };
 return vm.runInNewContext(source,c,options);
}};
const frameFx=fixture(assert,frameVm,clientSource,hostSource,previousTests),viewer=frameFx.viewer();await fx.flush();
const ready={type:'rtc_host_ready',fromPlayerId:'host',fromInstanceId:'host-tab',frameRelay:1};
const frame=(sequence,fromInstanceId='host-tab')=>({type:'rtc_frame',fromPlayerId:'host',fromInstanceId,mime:'image/jpeg',sequence,data:Buffer.from('frame-'+sequence).toString('base64')});
viewer.dispatch(ready);await viewer.clock.advance(700);
assert.ok(viewer.messages.some(message=>message.type==='rtc_frame_watch'));
assert.equal(viewer.recorders?.length||0,0);
viewer.dispatch(frame(0));assert.equal(viewer.api.isFresh(),false,'only a decoded remote image is a displayed frame');
images.at(-1).completeFrame();assert.equal(viewer.api.source,'frame');assert.equal(viewer.api.isFresh(),true);
assert.equal(viewer.stage.children.filter(node=>node.tagName==='img').length,1);
const firstImage=images.at(-1);
viewer.dispatch(frame(1));const pending=images.at(-1);
for(let n=2;n<=100;n++)viewer.dispatch(frame(n));
assert.equal(images.length,2,'slow decoding retains just one pending image and the newest waiting packet');
pending.completeFrame();assert.equal(images.length,3);images.at(-1).completeFrame();
assert.equal(viewer.stage.children.filter(node=>node.tagName==='img').length,1);assert.equal(firstImage.isConnected,true,'reuse the display node without triggering a whole-page child-list mutation each frame');
const count=images.length;viewer.dispatch(frame(99));viewer.dispatch(frame(101,'retired-host'));assert.equal(images.length,count,'stale sequences and other hosts must not replace the displayed image');
viewer.client.round={id:'round-2'};viewer.dispatch({type:'snapshot',round:viewer.client.round});viewer.dispatch(frame(102));images.at(-1).completeFrame();
assert.equal(viewer.api.isFresh(),true,'server BET TIME and the next draw use the same live display');
await viewer.clock.advance(2500);viewer.api.health();
assert.equal(viewer.api.source,'frame','retain the last real server picture with a reconnect indicator');
assert.equal(viewer.stage.children.find(node=>node.className==='roulette-reconnect-v224').dataset.show,'1');
const css=viewer.context.document.getElementById('shared-roulette-v224-css').textContent;
assert.match(css,/#cookie-roulette \.a8-stage>canvas\{display:none!important\}/,'an old canvas can never become the fallback display');
await frameFx.attach(viewer);viewer.video('p2p').frame();viewer.api.health();
assert.equal(viewer.api.source,'p2p');assert.ok(viewer.messages.some(message=>message.type==='rtc_frame_stop'),'healthy direct video stops redundant JPEG traffic');

const encodes=[],draws=[];
const hostVm={runInNewContext(source,c,options){
 c.document.createElement=()=>({width:0,height:0,getContext:()=>({drawImage(...args){draws.push(args);}}),toBlob(callback){encodes.push(callback);}});
 return vm.runInNewContext(source,c,options);
}};
const host=fx.buildHost(hostSource,hostVm,assert,fx.flush);host.gate.resolve();await fx.flush();
host.shared.client.ws={bufferedAmount:0};
const watch=(id,instance)=>({type:'rtc_frame_watch',fromPlayerId:id,fromInstanceId:instance});
host.dispatch(watch('viewer-a','a'));host.dispatch(watch('viewer-b','b'));
assert.equal(encodes.length,1,'multiple viewers share one JPEG encode');assert.equal(host.api.frameCount,2);
const finish=async()=>{const bytes=Uint8Array.from([255,216,255,217]);encodes.shift()({arrayBuffer:async()=>bytes.buffer});await fx.flush();};
await finish();
let packets=host.messages.filter(message=>message.type==='rtc_frame');assert.equal(packets.length,2);assert.equal(packets[0].sequence,packets[1].sequence);assert.equal(host.recorders.length,0);
host.dispatch(watch('viewer-c','c'));await finish();
assert.equal(host.api.frameCount,3);assert.equal(host.recorders.length,0);assert.equal(host.messages.filter(message=>message.type==='rtc_media_stop').length,0,'a late viewer does not interrupt any existing viewer');
host.shared.client.round={id:'round-2'};host.api.captureFrame();await finish();
packets=host.messages.filter(message=>message.type==='rtc_frame');assert.ok(packets.slice(-3).every(message=>message.roundId==='round-2'));
host.shared.client.ws.bufferedAmount=500*1024;host.api.captureFrame();assert.equal(encodes.length,0,'backpressure skips images instead of queueing stale frames');
host.shared.client.ws.bufferedAmount=0;host.dispatch({type:'rtc_frame_stop',fromPlayerId:'viewer-b',fromInstanceId:'b'});host.dispatch({type:'rtc_peer_left',fromPlayerId:'viewer-c',fromInstanceId:'c'});
assert.equal(host.api.frameCount,1);
host.api.captureFrame();await finish();assert.equal(host.messages.at(-1).targetPlayerId,'viewer-a');
assert.ok(draws.every(args=>args[1]===0&&args[2]===0),'all relayed images come from the visible host canvas');
console.log('v231 remote-only loader, decoded image display, bounded decode/backpressure, shared encoding and uninterrupted late joins passed');

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const hostSource=await fs.readFile(process.env.VIDEO_HOST_SOURCE||new URL('../assets/shared-roulette-webrtc-host-v224.js',import.meta.url),'utf8');
const clientSource=await fs.readFile(process.env.VIDEO_CLIENT_SOURCE||new URL('../assets/shared-roulette-client-v224.js',import.meta.url),'utf8');
const flush=async()=>{for(let i=0;i<35;i++)await Promise.resolve();};
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};}
function timers(){
 let now=10000,nextId=0;const pending=new Map();
 return{
  Date:class extends Date{static now(){return now;}},
  setTimeout(fn,delay=0){const id=++nextId;pending.set(id,{fn,at:now+Math.max(0,Number(delay)||0)});return id;},
  clearTimeout(id){pending.delete(id);},setInterval(){return ++nextId;},clearInterval(){},
  async advance(ms){const end=now+ms;let steps=0;while(true){const item=[...pending.entries()].filter(([,v])=>v.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!item)break;assert.ok(++steps<500,'timer loop must remain bounded');pending.delete(item[0]);now=item[1].at;item[1].fn();await flush();}now=end;await flush();}
 };
}
function peerClass(peers,remoteGate=null){
 return class{
  constructor(){this.id=peers.length+1;this.connectionState='new';this.remoteDescription=null;this.localDescription=null;this.closed=false;this.senders=[];peers.push(this);}
  addTrack(track){const sender={track,getParameters:()=>({encodings:[{}]}),setParameters:async()=>{},replaceTrack:async next=>{sender.track=next;}};this.senders.push(sender);return sender;}
  getSenders(){return this.senders;}
  async createOffer(){return{type:'offer',sdp:'offer-'+this.id};}
  async createAnswer(){return{type:'answer',sdp:'answer-'+this.id};}
  async setLocalDescription(value){this.localDescription=value;}
  async setRemoteDescription(value){if(remoteGate&&value.sdp==='defer-old')await remoteGate.promise;this.remoteDescription=value;}
  async addIceCandidate(){}
  close(){this.closed=true;this.connectionState='closed';this.onconnectionstatechange?.();}
 };
}
function makeHost(){
 const clock=timers(),gate=deferred(),peers=[],recorders=[],messages=[],listeners=[];let uuid=0;
 const track={kind:'video',readyState:'live',applyConstraints:()=>gate.promise,requestFrame(){},stop(){this.readyState='ended';}};
 const stream={getVideoTracks:()=>[track]};
 class Canvas{constructor(){this.isConnected=true;this.width=720;this.height=405;}captureStream(){return stream;}}
 const canvas=new Canvas();
 class Recorder{
  static isTypeSupported(){return true;}
  constructor(media,options={}){this.state='inactive';this.mimeType=options.mimeType||'video/webm';recorders.push(this);}
  start(){this.state='recording';}stop(){this.state='inactive';}
  emit(bytes,read=null){const data=Uint8Array.from(bytes);this.ondataavailable?.({data:{size:data.length,arrayBuffer:()=>read||Promise.resolve(data.buffer)}});}
 }
 const client={online:true,role:'host',playerId:'host',round:{id:'round-1'},ready:Promise.resolve(true),on(fn){listeners.push(fn);},send(message){messages.push(message);return true;}};
 const shared={client,role:'host'},window={SweetsSharedMachine:shared};
 const context={window,document:{querySelector:()=>canvas},console:{info(){},warn(){}},crypto:{randomUUID:()=>String(++uuid)},HTMLCanvasElement:Canvas,RTCPeerConnection:peerClass(peers),MediaRecorder:Recorder,Uint8Array,Map,Promise,URLSearchParams,location:{search:'?serverHost=1'},btoa:value=>Buffer.from(value,'binary').toString('base64'),addEventListener(){},...clock};
 vm.runInNewContext(hostSource,context,{filename:'roulette-host.js'});
 return{clock,gate,peers,recorders,messages,shared,dispatch(message){for(const fn of listeners)fn(message);},api:window.SweetsRouletteHostV224};
}

const host=makeHost();
host.dispatch({type:'rtc_watch',fromPlayerId:'viewer-a',fromInstanceId:'instance-a'});
host.dispatch({type:'rtc_peer_list',peers:[{playerId:'viewer-a',instanceId:'instance-a'}]});
host.gate.resolve();await flush();
assert.equal(host.peers.length,1,'simultaneous peer-list/watch requests must share one offer');
assert.equal(host.api.peerCount,1);
const oldPeer=host.peers[0];
host.dispatch({type:'rtc_restart',fromPlayerId:'viewer-a',fromInstanceId:'instance-a'});await flush();
assert.equal(host.peers.length,2);const livePeer=host.peers[1];
oldPeer.connectionState='failed';oldPeer.onconnectionstatechange();
assert.equal(livePeer.closed,false,'a stale peer failure must not close its replacement');
const iceCount=host.messages.filter(message=>message.type==='rtc_ice').length;
oldPeer.onicecandidate({candidate:{candidate:'stale'}});
assert.equal(host.messages.filter(message=>message.type==='rtc_ice').length,iceCount,'stale ICE events must not escape');

host.dispatch({type:'rtc_fallback_request',fromPlayerId:'viewer-a',fromInstanceId:'instance-a'});await flush();
assert.equal(host.recorders.length,1);const firstRecorder=host.recorders[0];
firstRecorder.emit([0x1a,0x45,0xdf,0xa3]);await flush();firstRecorder.emit([1,2,3]);await flush();
const firstStream=host.messages.find(message=>message.type==='rtc_media').streamId;
host.dispatch({type:'rtc_fallback_request',fromPlayerId:'viewer-a',fromInstanceId:'instance-a'});await flush();
assert.equal(host.recorders.length,1,'repeated healthy watch requests must not restart video');
host.dispatch({type:'rtc_fallback_request',fromPlayerId:'viewer-b',fromInstanceId:'instance-b'});await flush();
assert.equal(host.recorders.length,2,'a late subscriber must receive a fresh WebM stream');
assert.equal(firstRecorder.state,'inactive');
const secondRecorder=host.recorders[1];secondRecorder.emit([0x1a,0x45,0xdf,0xa3]);await flush();
const firstForB=host.messages.find(message=>message.type==='rtc_media'&&message.targetPlayerId==='viewer-b');
assert.equal(firstForB.sequence,0);assert.notEqual(firstForB.streamId,firstStream);
assert.ok(host.messages.some(message=>message.type==='rtc_media_stop'&&message.targetPlayerId==='viewer-a'&&message.streamId===firstStream));
const delayed=deferred();secondRecorder.emit([9,9,9],delayed.promise);await flush();
host.dispatch({type:'rtc_fallback_stop',fromPlayerId:'viewer-a',fromInstanceId:'instance-a'});
host.dispatch({type:'rtc_fallback_request',fromPlayerId:'viewer-a',fromInstanceId:'instance-a'});await flush();
assert.equal(host.recorders.length,3);host.recorders[2].emit([0x1a,0x45,0xdf,0xa3]);await flush();
delayed.resolve(Uint8Array.from([9,9,9]).buffer);await flush();
assert.ok(!host.messages.some(message=>message.type==='rtc_media'&&message.data===Buffer.from([9,9,9]).toString('base64')),'queued old chunks must not be relabelled as a new stream');
const recorderCount=host.recorders.length,peerCount=host.peers.length;
host.shared.client.round={id:'round-2'};host.dispatch({type:'snapshot',round:host.shared.client.round});await host.clock.advance(1);
assert.equal(host.recorders.length,recorderCount,'round transitions must retain the recorder');assert.equal(host.peers.length,peerCount,'round transitions must retain peers');
const coldHost=makeHost();
coldHost.dispatch({type:'rtc_fallback_request',fromPlayerId:'viewer-a',fromInstanceId:'instance-a'});
coldHost.dispatch({type:'rtc_fallback_request',fromPlayerId:'viewer-b',fromInstanceId:'instance-b'});
coldHost.gate.resolve();await flush();assert.equal(coldHost.recorders.length,1,'simultaneous subscribers must share one pending recorder initialization');
coldHost.recorders[0].emit([0x1a,0x45]);await flush();
assert.equal(coldHost.messages.filter(message=>message.type==='rtc_media'&&message.sequence===0).length,2,'both initial subscribers must receive the first chunk');

function makeClient(){
 const clock=timers(),remoteGate=deferred(),peers=[],sources=[],messages=[],listeners=[];let uuid=0;
 class Node{
  constructor(tag){this.tagName=tag;this.isConnected=true;this.dataset={};this.listeners=new Map();this.children=[];this.paused=false;this.currentTime=0;this.buffered={length:0};}
  append(node){this.children.push(node);node.isConnected=true;}
  addEventListener(name,fn){const list=this.listeners.get(name)||[];list.push(fn);this.listeners.set(name,list);}
  emit(name){for(const fn of this.listeners.get(name)||[])fn();}
  play(){this.paused=false;return Promise.resolve();}load(){}removeAttribute(name){delete this[name];}
  querySelector(){return this.children.find(node=>node.className==='roulette-reconnect-v224')||null;}
 }
 const stage=new Node('div'),head=new Node('head'),body={classList:{add(){},remove(){}}};
 const document={head,body,getElementById:id=>head.children.find(node=>node.id===id)||null,createElement:tag=>new Node(tag),querySelector:selector=>selector==='#cookie-roulette .a8-stage'?stage:null,querySelectorAll:()=>[]};
 class SourceBuffer extends Node{constructor(){super('buffer');this.updating=false;this.appended=[];}appendBuffer(bytes){this.appended.push([...bytes]);}remove(){}}
 class MediaSource extends Node{
  static isTypeSupported(){return true;}
  constructor(){super('source');this.readyState='closed';this.buffer=null;sources.push(this);}
  addSourceBuffer(){return this.buffer=new SourceBuffer();}endOfStream(){this.readyState='ended';}
  open(){this.readyState='open';this.emit('sourceopen');}
 }
 const client={online:true,round:{id:'round-1'},ready:Promise.resolve(true),on(fn){listeners.push(fn);},send(message){messages.push(message);return true;}};
 const window={SweetsSharedMachine:{client}};
 const context={window,document,console:{info(){},warn(){}},crypto:{randomUUID:()=>String(++uuid)},RTCPeerConnection:peerClass(peers,remoteGate),MediaSource,MediaStream:class{},Uint8Array,Set,Promise,URLSearchParams,location:{search:''},URL:{createObjectURL:()=> 'blob:'+sources.length,revokeObjectURL(){}},atob:value=>Buffer.from(value,'base64').toString('binary'),addEventListener(){},rouletteDriver:{setPaused(){}},app:{paused:false},...clock};
 vm.runInNewContext(clientSource,context,{filename:'roulette-client.js'});
 return{clock,remoteGate,peers,sources,messages,stage,client,dispatch(message){for(const fn of listeners)fn(message);},api:window.SweetsRouletteClientV224};
}
const viewer=makeClient();await flush();
const chunk=(streamId,sequence)=>({type:'rtc_media',streamId,sequence,mime:'video/webm;codecs=vp8',data:Buffer.from([0x1a,0x45,sequence]).toString('base64')});
viewer.dispatch(chunk('orphan',8));await viewer.clock.advance(0);
assert.equal(viewer.sources.length,0,'an orphan middle chunk must never initialize MediaSource');
let types=viewer.messages.map(message=>message.type);
assert.ok(types.indexOf('rtc_fallback_stop')<types.indexOf('rtc_fallback_request'),'decoder recovery must unsubscribe before requesting a fresh stream');
assert.ok(types.includes('rtc_fallback_stop'));
viewer.dispatch(chunk('stream-a',0));viewer.sources[0].open();viewer.dispatch(chunk('stream-a',1));await flush();
assert.equal(viewer.sources[0].buffer.appended.length,2);
const staleSource=viewer.sources[0],staleBuffer=staleSource.buffer;
viewer.dispatch(chunk('stream-a',3));await viewer.clock.advance(700);
assert.equal(staleSource.readyState,'ended','a sequence gap must retire the corrupted decoder');
viewer.dispatch(chunk('stream-a',2));viewer.dispatch(chunk('stream-a',0));
assert.equal(viewer.sources.length,1,'late chunks from retired streams must not resurrect them');
viewer.dispatch(chunk('stream-b',0));viewer.sources[1].open();const goodSource=viewer.sources[1];
staleBuffer.emit('error');staleBuffer.emit('updateend');staleSource.emit('sourceopen');
viewer.dispatch(chunk('stream-b',1));assert.equal(goodSource.readyState,'open');assert.equal(goodSource.buffer.appended.length,2,'stale callbacks must leave the new decoder intact');
viewer.dispatch({type:'rtc_offer',fromPlayerId:'host',fromInstanceId:'host-instance',description:{type:'offer',sdp:'defer-old'}});await flush();
viewer.dispatch({type:'rtc_offer',fromPlayerId:'host',fromInstanceId:'host-instance',description:{type:'offer',sdp:'new-offer'}});await flush();
assert.equal(viewer.peers.length,2);const replacement=viewer.peers[1];
viewer.remoteGate.reject(Error('late failure from old peer'));await flush();
assert.equal(replacement.closed,false,'old async negotiation failure must not close the new peer');
assert.equal(viewer.messages.filter(message=>message.type==='rtc_answer').length,1,'only the current negotiation may answer');
const clientPeerCount=viewer.peers.length,sourceCount=viewer.sources.length;
viewer.client.round={id:'round-2'};viewer.dispatch({type:'snapshot',round:viewer.client.round});viewer.dispatch({type:'round_complete'});await flush();
assert.equal(viewer.peers.length,clientPeerCount);assert.equal(viewer.sources.length,sourceCount,'round changes must not rebuild client video');
replacement.connectionState='connected';await viewer.clock.advance(3600);viewer.api.health();
assert.equal(replacement.closed,true,'a connected peer without any decoded frames must be replaced');
assert.ok(viewer.messages.some(message=>message.type==='rtc_restart'&&message.targetPlayerId==='host'),'the host must receive an explicit restart instead of ignoring another watch');
console.log('v225 video reconnect: single-flight offers, stale-event isolation, fresh WebM headers, missing-chunk recovery and cross-round continuity passed');

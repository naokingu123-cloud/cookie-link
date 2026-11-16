import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const [controllerSource,videoSource,controllerTests,videoTests]=await Promise.all([
 fs.readFile(process.env.REGISTRATION_CONTROLLER||new URL('../assets/shared-client-controller-v224.js',import.meta.url),'utf8'),
 fs.readFile(new URL('../assets/shared-roulette-client-v224.js',import.meta.url),'utf8'),
 fs.readFile(new URL('./shared-client-http-backoff.mjs',import.meta.url),'utf8'),
 fs.readFile(new URL('./shared-v225-video-reconnect.mjs',import.meta.url),'utf8')
]);
const flush=async()=>{for(let i=0;i<35;i++)await Promise.resolve();};
function section(source,start,end){
 const a=source.indexOf(start),b=source.indexOf(end,a);
 assert.ok(a>=0&&b>a,'existing VM fixture boundaries must remain available: '+start);
 return source.slice(a,b);
}

// Reuse the existing clock/DOM/transport fixtures without copying the suites
// or executing their unrelated assertions. Production controller and video
// sources run unchanged, share one result client, and use the real isFresh().
const controllerFixture=section(controllerTests,'function harness(','\nconst bounded=');
const videoFixtures=section(videoTests,'function deferred(){','function makeHost(){')+
 section(videoTests,'function makeClient(){','\nconst viewer=makeClient();');
const buildController=new Function('source','vm','assert','flush',controllerFixture+'\nreturn harness();');
const buildVideo=new Function('clientSource','vm','assert','flush',videoFixtures+'\nreturn makeClient();');

function harness({unsupportedVideo=false}={}){
 let controllerContext;
 const flow=buildController(controllerSource,{runInNewContext(source,context,options){
  controllerContext=context;return vm.runInNewContext(source,context,options);
 }},assert,()=>new Promise(resolve=>setImmediate(resolve)));
 const sent=[];flow.client.ready=Promise.resolve(true);
 flow.client.send=message=>{sent.push(message);return true;};
 const video=buildVideo(videoSource,{runInNewContext(source,context,options){
  context.window.SweetsSharedMachine.client=flow.client;
  if(unsupportedVideo){
   context.RTCPeerConnection=undefined;
   context.MediaSource=class{static isTypeSupported(){return false;}};
  }
  return vm.runInNewContext(source,context,options);
 }},assert,flush);
 controllerContext.SweetsRouletteClientV224=video.api;
 return{flow,video,sent};
}

async function openBet(flow,id){
 flow.setRound({id,phase:'BETTING',canBet:true,betClosesAt:flow.now+10000,participant:null,balls:[]});
 flow.emit({type:'betting_started'});await flow.advance(1000);
 assert.equal(flow.joins.filter(join=>join.roundId===id).length,1,'healthy result data must register the BET even without remote video');
 assert.equal(flow.round.participant?.playerId,'PLAYER');
}
async function start(flow,id){
 flow.setRound({...flow.round,phase:'PLAYING',canBet:false,drawStartsAt:flow.now});
 flow.emit({type:'round_started'});await flow.advance(1000);
 assert.equal(flow.active?.roundId,id,'a registered participant must start instead of remaining at NEXT');
 assert.equal(flow.app.phase,'playing');
 assert.equal(flow.starts.filter(roundId=>roundId===id).length,1);
}
async function complete(flow,id){
 const numbers=[3,7,11,15,19,23,4,8];
 flow.active.delivered=8;flow.app.draws=numbers;flow.app.phase='complete';flow.app.totalWin=25;
 flow.app.payout={};flow.app.result={};flow.resultLayer.hidden=false;
 flow.setRound({...flow.round,phase:'COMPLETE',balls:numbers.map((number,index)=>({index:index+1,number}))});
 flow.emit({type:'round_complete'});await flow.advance(2000);
 assert.equal(flow.settlements.filter(result=>result.roundId===id&&result.totalWin===25).length,1);
 assert.equal(flow.active,null);assert.equal(flow.app.phase,'ready');assert.equal(flow.control.isReady(),true);
}

const withoutVideo=harness({unsupportedVideo:true}),flow=withoutVideo.flow;
await flow.advance(4500);await flush();
flow.emit({type:'rtc_offer',fromPlayerId:'host',fromInstanceId:'host-instance',description:{type:'offer',sdp:'host-offer'}});
flow.emit({type:'rtc_media',streamId:'host-stream',sequence:0,mime:'video/webm;codecs=vp8',data:Buffer.from([0x1a,0x45]).toString('base64')});
await withoutVideo.video.clock.advance(100);await flush();
assert.equal(withoutVideo.video.peers.length,0);assert.equal(withoutVideo.video.sources.length,0);
assert.equal(withoutVideo.video.api.isFresh(),false,'unsupported video must use the production freshness result, not a constant mock');
assert.equal(flow.control.stable(),true);assert.equal(flow.control.isReady(),true);
for(const id of ['data-only-1','data-only-2']){
 await openBet(flow,id);await start(flow,id);
 assert.equal(withoutVideo.video.api.isFresh(),false,'result participation must not invent a healthy video stream');
 await complete(flow,id);
}
assert.deepEqual(flow.starts,['data-only-1','data-only-2']);assert.equal(flow.joins.length,2);
assert.equal(flow.app.credit,1010,'each round must deduct the real BET and settle its normal result once');
assert.ok(!flow.settlements.some(result=>result.abandoned),'missing video must not become a zero-WIN abandonment');
assert.ok(withoutVideo.sent.some(message=>message.type==='rtc_watch'),'video recovery remains independent and active');

const interrupted=harness(),next=interrupted.flow;
await next.advance(4500);await flush();
next.emit({type:'rtc_offer',fromPlayerId:'host',fromInstanceId:'host-instance',description:{type:'offer',sdp:'live-host-offer'}});
await flush();assert.equal(interrupted.video.peers.length,1);
const peer=interrupted.video.peers[0];peer.connectionState='connected';peer.ontrack({streams:[{}]});await flush();
const nativeVideo=interrupted.video.stage.children.find(node=>String(node.className||'').includes('shared-roulette-p2p-v224'));
assert.ok(nativeVideo);Object.assign(nativeVideo,{readyState:4,videoWidth:720,videoHeight:405});nativeVideo.emit('playing');assert.equal(interrupted.video.api.isFresh(),true);
await openBet(next,'video-lost-before-start');
peer.connectionState='failed';peer.onconnectionstatechange();await flush();
assert.equal(interrupted.video.api.isFresh(),false,'losing the actual peer must clear video freshness before PLAYING');
assert.equal(next.control.stable(),true);
assert.ok(interrupted.sent.some(message=>message.type==='rtc_restart'),'video failure must request repair without dropping the registered BET');
await start(next,'video-lost-before-start');await complete(next,'video-lost-before-start');
assert.ok(!next.settlements.some(result=>result.abandoned));

console.log('v227 registration passed: real video unavailable for two normal rounds, and peer loss between accepted BET and PLAYING preserves participation and settlement');

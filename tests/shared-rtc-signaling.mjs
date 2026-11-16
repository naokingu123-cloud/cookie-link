import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import os from 'node:os';
import path from 'node:path';
import {WebSocket} from 'ws';

const root=fileURLToPath(new URL('..',import.meta.url));
const temp=await mkdtemp(path.join(os.tmpdir(),'sweets-rtc-'));
const port=35000+Math.floor(Math.random()*2000);
const base='http://127.0.0.1:'+port;
const adminToken='rtc-admin-token';
const child=spawn(process.execPath,['server.mjs'],{
 cwd:root,
 env:{...process.env,PORT:String(port),SWEETS_DATA_FILE:path.join(temp,'db.json'),SWEETS_ADMIN_TOKEN:adminToken},
 stdio:['ignore','pipe','pipe']
});
let stderr='';child.stderr.on('data',chunk=>stderr+=chunk);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function waitForHealth(){
 for(let i=0;i<100;i++){
  try{const response=await fetch(base+'/api/health');if(response.ok)return;}
  catch{}
  await sleep(100);
 }
 throw Error('server did not start: '+stderr);
}
async function json(url,{method='GET',body,token,playerId}={}){
 const response=await fetch(base+url,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token,'X-Player-Id':playerId}:{})},body:body===undefined?undefined:JSON.stringify(body)});
 const data=await response.json();if(!response.ok)throw Object.assign(Error(data.error||String(response.status)),{status:response.status,data});return data;
}
function inbox(ws){
 const queue=[],waiters=[];
 ws.on('message',raw=>{
  let message;try{message=JSON.parse(String(raw));}catch{return;}
  const index=waiters.findIndex(item=>item.predicate(message));
  if(index>=0){const [item]=waiters.splice(index,1);clearTimeout(item.timer);item.resolve(message);}else queue.push(message);
 });
 return {
  next(predicate=()=>true,timeout=4000){
   const index=queue.findIndex(predicate);if(index>=0)return Promise.resolve(queue.splice(index,1)[0]);
   return new Promise((resolve,reject)=>{
    const item={predicate,resolve,reject,timer:null};
    item.timer=setTimeout(()=>{const i=waiters.indexOf(item);if(i>=0)waiters.splice(i,1);reject(Error('message timeout'));},timeout);
    waiters.push(item);
   });
  }
 };
}
function openSocket(session){
 return new Promise((resolve,reject)=>{
  const url='ws://127.0.0.1:'+port+'/ws?machineId=public-01&playerId='+encodeURIComponent(session.player.id)+'&token='+encodeURIComponent(session.token);
  const ws=new WebSocket(url),messages=inbox(ws);
  ws.once('open',()=>resolve({ws,messages}));ws.once('error',reject);
 });
}

let host,player,other;
try{
 await waitForHealth();
 assert.equal((await fetch(base+'/server-core.mjs')).status,404,'private server core must not be served');
 assert.equal((await fetch(base+'/server-rtc-preload.mjs')).status,404,'RTC relay source must not be served');
 const hostSession=await json('/api/session',{method:'POST',body:{displayName:'RTC HOST'}});
 const playerSession=await json('/api/session',{method:'POST',body:{displayName:'RTC PLAYER'}});
 const otherSession=await json('/api/session',{method:'POST',body:{displayName:'RTC OTHER'}});
 host=await openSocket(hostSession);player=await openSocket(playerSession);other=await openSocket(otherSession);
 await host.messages.next(m=>m.type==='snapshot');
 await player.messages.next(m=>m.type==='snapshot');
 await other.messages.next(m=>m.type==='snapshot');
 player.ws.send(JSON.stringify({type:'rtc_host_ready',protocol:197,instanceId:'rogue'}));
 await assert.rejects(other.messages.next(m=>m.type==='rtc_host_ready',250),/timeout/);
 const auth={token:hostSession.token,playerId:hostSession.player.id};
 await json('/api/admin/machines/public-01/host/register?adminToken='+adminToken,{...auth,method:'POST',body:{}});

 host.ws.send(JSON.stringify({type:'rtc_host_ready',protocol:197,instanceId:'hostA',frameRelay:1}));
 const ready=await player.messages.next(m=>m.type==='rtc_host_ready');
 assert.equal(ready.fromPlayerId,hostSession.player.id);assert.equal(ready.fromInstanceId,'hostA');
 assert.equal(ready.frameRelay,1,'the registered host advertises independently decodable image frames');

 player.ws.send(JSON.stringify({type:'rtc_watch',protocol:197,instanceId:'playerA',roundId:'round-test'}));
 const watch=await host.messages.next(m=>m.type==='rtc_watch');
 assert.equal(watch.fromPlayerId,playerSession.player.id);assert.equal(watch.fromInstanceId,'playerA');

 const offer={type:'offer',sdp:'v=0\r\no=rtc-host 1 1 IN IP4 127.0.0.1\r\n'};
 host.ws.send(JSON.stringify({type:'rtc_offer',protocol:197,instanceId:'hostA',targetPlayerId:playerSession.player.id,targetInstanceId:'playerA',description:offer}));
 const receivedOffer=await player.messages.next(m=>m.type==='rtc_offer');
 assert.deepEqual(receivedOffer.description,offer);assert.equal(receivedOffer.targetInstanceId,'playerA');
 await assert.rejects(other.messages.next(m=>m.type==='rtc_offer',250),/timeout/);
  other.ws.send(JSON.stringify({type:'rtc_offer',protocol:197,instanceId:'otherA',targetPlayerId:playerSession.player.id,targetInstanceId:'playerA',description:offer}));
  await assert.rejects(player.messages.next(m=>m.type==='rtc_offer'&&m.fromPlayerId===otherSession.player.id,150),/timeout/,'only the registered physical host can offer roulette video');

 const answer={type:'answer',sdp:'v=0\r\no=rtc-player 1 1 IN IP4 127.0.0.1\r\n'};
 player.ws.send(JSON.stringify({type:'rtc_answer',protocol:197,instanceId:'playerA',targetPlayerId:hostSession.player.id,targetInstanceId:'hostA',description:answer}));
 const receivedAnswer=await host.messages.next(m=>m.type==='rtc_answer');
 assert.deepEqual(receivedAnswer.description,answer);assert.equal(receivedAnswer.fromInstanceId,'playerA');

 const candidate={candidate:'candidate:1 1 UDP 2122260223 192.0.2.1 50000 typ host',sdpMid:'0',sdpMLineIndex:0,usernameFragment:'test'};
 host.ws.send(JSON.stringify({type:'rtc_ice',protocol:197,instanceId:'hostA',targetPlayerId:playerSession.player.id,targetInstanceId:'playerA',candidate}));
 const receivedIce=await player.messages.next(m=>m.type==='rtc_ice');
 assert.equal(receivedIce.candidate.candidate,candidate.candidate);

 player.ws.send(JSON.stringify({type:'rtc_fallback_request',protocol:197,instanceId:'playerA'}));
 const fallbackRequest=await host.messages.next(m=>m.type==='rtc_fallback_request');
 assert.equal(fallbackRequest.fromInstanceId,'playerA');
 const mediaData=Buffer.from('webm-chunk').toString('base64');
 host.ws.send(JSON.stringify({type:'rtc_media',protocol:197,instanceId:'hostA',targetPlayerId:playerSession.player.id,targetInstanceId:'playerA',streamId:'streamA',mime:'video/webm;codecs=vp8',sequence:0,data:mediaData}));
 const media=await player.messages.next(m=>m.type==='rtc_media');
 assert.equal(media.data,mediaData);assert.equal(media.streamId,'streamA');
  other.ws.send(JSON.stringify({type:'rtc_media',protocol:197,instanceId:'otherA',targetPlayerId:playerSession.player.id,targetInstanceId:'playerA',streamId:'rogueStream',mime:'video/webm;codecs=vp8',sequence:0,data:mediaData}));
  await assert.rejects(player.messages.next(m=>m.type==='rtc_media'&&m.streamId==='rogueStream',150),/timeout/,'legacy WebM relay must also require the registered host');
  other.ws.send(JSON.stringify({type:'rtc_media_stop',protocol:197,instanceId:'otherA',targetPlayerId:playerSession.player.id,targetInstanceId:'playerA',streamId:'streamA'}));
  await assert.rejects(player.messages.next(m=>m.type==='rtc_media_stop',150),/timeout/,'another player cannot stop the host video');
 player.ws.send(JSON.stringify({type:'rtc_fallback_stop',protocol:197,instanceId:'playerA',targetPlayerId:hostSession.player.id,targetInstanceId:'hostA'}));
 const fallbackStop=await host.messages.next(m=>m.type==='rtc_fallback_stop');
 assert.equal(fallbackStop.fromPlayerId,playerSession.player.id);

 player.ws.send(JSON.stringify({type:'rtc_frame_watch',protocol:197,instanceId:'playerA'}));
 const frameWatch=await host.messages.next(m=>m.type==='rtc_frame_watch');assert.equal(frameWatch.fromInstanceId,'playerA');
 const frameData=Buffer.from([255,216,255,217]).toString('base64');
 const framePacket={type:'rtc_frame',protocol:197,instanceId:'hostA',targetPlayerId:playerSession.player.id,targetInstanceId:'playerA',mime:'image/jpeg',sequence:17,data:frameData};
 host.ws.send(JSON.stringify(framePacket));
 const frame=await player.messages.next(m=>m.type==='rtc_frame');assert.equal(frame.data,frameData);assert.equal(frame.sequence,17);
 await assert.rejects(other.messages.next(m=>m.type==='rtc_frame',150),/timeout/);
 other.ws.send(JSON.stringify({...framePacket,instanceId:'otherA',sequence:18}));
 await assert.rejects(player.messages.next(m=>m.type==='rtc_frame'&&m.sequence===18,150),/timeout/,'only the registered physical host can supply image frames');
 player.ws.send(JSON.stringify({type:'rtc_frame_stop',protocol:197,instanceId:'playerA'}));
 assert.equal((await host.messages.next(m=>m.type==='rtc_frame_stop')).fromInstanceId,'playerA');

 player.ws.close();
 const left=await host.messages.next(m=>m.type==='rtc_peer_left');
 assert.equal(left.fromPlayerId,playerSession.player.id);assert.equal(left.fromInstanceId,'playerA');
 console.log('WebRTC roulette signaling relay test passed');
}finally{
 try{host?.ws.close();}catch{}try{player?.ws.close();}catch{}try{other?.ws.close();}catch{}
 child.kill('SIGTERM');await sleep(120);await rm(temp,{recursive:true,force:true});
}

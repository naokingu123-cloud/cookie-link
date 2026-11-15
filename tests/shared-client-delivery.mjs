import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const wrapper=await readFile(new URL('../assets/shared-machine-v176.js',import.meta.url),'utf8');
const shared=await readFile(new URL('../assets/shared-machine-core-v196.js',import.meta.url),'utf8');
const host=await readFile(new URL('../assets/shared-roulette-webrtc-host-v197.js',import.meta.url),'utf8');
const client=await readFile(new URL('../assets/shared-roulette-webrtc-client-v197.js',import.meta.url),'utf8');
const app=await readFile(new URL('../optimized/app-01.js',import.meta.url),'utf8');
const patches=await readFile(new URL('../assets/cookie-upgrade-patches.js',import.meta.url),'utf8');

assert.ok(wrapper.includes("shared-machine-core-v196.js?v=200"),'shared wrapper must synchronously load the guarded core');
assert.ok(wrapper.includes("shared-roulette-webrtc-host-v197.js?v=200"),'server host must load the smooth transmitter');
assert.ok(wrapper.includes("shared-roulette-webrtc-client-v197.js?v=200"),'players must load the smooth receiver');
assert.ok(wrapper.includes('eval(load'),'extensions must execute inside the game private scope');

assert.ok(shared.includes("current.callbacks.onNumber?.(item.number)!==false"),'shared delivery must observe Arcade.acceptNumber result');
assert.ok(shared.includes("if(!current||current.stopped||!accepted)break;"),'shared delivery must retain a rejected ball');
const deletePos=shared.indexOf("current.queue.delete(item.index)");
const acceptedPos=shared.indexOf("if(!current||current.stopped||!accepted)break;");
assert.ok(deletePos>acceptedPos,'shared queue must delete a ball only after acceptance');
assert.ok(shared.includes("!app.paused&&!app.drawHeld&&Number(app.draws?.length||0)===current.delivered"),'shared delivery must wait through draw holds');
assert.ok(shared.includes("ABANDONED_ROUND_KEY='sweets-shared-abandoned-round-v194'"),'reset round block must persist');
assert.ok(shared.includes("localStorage.setItem(ABANDONED_ROUND_KEY"),'abandoned round must survive reload/restart');
assert.ok(shared.includes("if(query.get('resumeShared')!=='1')return;"),'old round recovery must be explicit opt-in');
assert.ok(shared.includes("pendingStart={callbacks,nativeReset};current.stopped=true"),'fresh starts must wait for a clean round instead of replaying existing balls');
assert.ok(!shared.includes("client.leave({roundId}).catch"),'client reset must not send leave to the physical round');
assert.ok(!shared.includes("setInterval(()=>captureMirrorFrame"),'JPEG fallback must not continuously read back WebGL frames');
assert.ok(shared.includes("setTimeout(()=>captureMirrorFrame(true),120)"),'JPEG fallback should refresh only around physical HIT events');

assert.ok(app.includes("preserveDrawingBuffer:serverHostRender"),'server host WebGL frame must remain readable');
assert.ok(app.includes("get mirrorCanvas(){return renderer.domElement;}"),'roulette must expose its actual WebGL canvas');
assert.ok(shared.includes("rouletteDriver?.mirrorCanvas||document.querySelector('#cookie-roulette canvas')"),'last-resort keyframes must use the real roulette canvas');

assert.ok(host.includes('captureStream(FPS)'),'smooth host must use a browser video track, not JPEG polling');
assert.ok(host.includes('new RTCPeerConnection(cfg)'),'smooth host must create WebRTC peers');
assert.ok(host.includes('maxFramerate:FPS'),'sender must preserve 24 fps under congestion');
assert.ok(host.includes("degradationPreference='maintain-framerate'"),'frame rate must be prioritized over resolution');
assert.ok(host.includes("Q.get('lightRoulette')==='1'"),'legacy 10 fps host must reload into smooth mode');
assert.ok(!host.includes('.toBlob('),'live transport must not repeatedly encode canvas JPEGs');
assert.ok(host.includes('new MediaRecorder(media'),'NAT-restricted clients must have one continuous WebM fallback');
assert.ok(host.includes('const peers=new Map(),subs=new Map();let stream,track,canvas,recorder'),'fallback encoding must be shared rather than duplicated per subscriber');

assert.ok(client.includes('requestVideoFrameCallback'),'client must track actually rendered video frames');
assert.ok(client.includes('MediaSource.isTypeSupported'),'WebSocket fallback must play as a continuous stream rather than image swaps');
assert.ok(client.includes("playoutDelayHint'in e.receiver"),'receiver should request the lowest available playout delay');
assert.ok(client.includes("send({type:'rtc_fallback_request'})"),'client must automatically recover when direct WebRTC cannot connect');

console.log('shared delivery + reset isolation + smooth roulette video guards passed');

assert.ok(patches.includes("shared client BET countdown uses server readiness"),'shared client countdown must use server readiness');
assert.ok(patches.includes("shared client start does not depend on local roulette renderer"),'shared client start must not wait for local WebGL roulette');
assert.ok(patches.includes("shared client debug start uses server readiness"),'shared immediate-start button must use server readiness');
console.log('shared-ready auto-start guards passed');

assert.ok(patches.includes("shared client can start while tab is background"),'shared round must start even when the player tab is backgrounded');
assert.ok(patches.includes("shared client countdown continues while tab is background"),'shared BET countdown must not freeze when monitor tab is foreground');
console.log('background shared-client autostart guards passed');

assert.ok(patches.includes("finish eighth-ball processing immediately"),'8th-ball result processing must fast-forward immediately');
assert.ok(patches.includes("single-commit instant payout"),'CREDIT must be committed once without a gating payout animation');
assert.ok(patches.includes("short non-blocking result display"),'result screen must not hold the next game for eight seconds');
assert.ok(patches.includes("shared game logic continues in background"),'shared result processing must continue while monitor is foreground');
assert.ok(shared.includes("A settled server round is historical"),'startup must never replay a settled payout');
assert.ok(shared.includes("CREDIT is owned by the"),'server settlement must not overwrite local CREDIT');
assert.ok(shared.includes("get:()=>!!client.online"),'previous physical round must not block local next-game readiness');
console.log('non-blocking result + single-credit settlement guards passed');

import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const wrapper=await readFile(new URL('../assets/shared-machine-v176.js',import.meta.url),'utf8');
const shared=await readFile(new URL('../assets/shared-machine-core-v196.js',import.meta.url),'utf8');
const host=await readFile(new URL('../assets/shared-roulette-webrtc-host-v197.js',import.meta.url),'utf8');
const client=await readFile(new URL('../assets/shared-roulette-webrtc-client-v197.js',import.meta.url),'utf8');
const hostKeepAlive=await readFile(new URL('../assets/shared-host-keepalive-v206.js',import.meta.url),'utf8');
const clientWatchdog=await readFile(new URL('../assets/shared-roulette-client-watchdog-v205.js',import.meta.url),'utf8');
const recoveryCompletion=await readFile(new URL('../assets/shared-recovery-completion-v206.js',import.meta.url),'utf8');
const server=await readFile(new URL('../server-core.mjs',import.meta.url),'utf8');
const app=await readFile(new URL('../optimized/app-01.js',import.meta.url),'utf8');
const patches=await readFile(new URL('../assets/cookie-upgrade-patches.js',import.meta.url),'utf8');
const menu=await readFile(new URL('../assets/game-menu-v91.js',import.meta.url),'utf8');
const titles=await readFile(new URL('../assets/game-titles-v91.js',import.meta.url),'utf8');
const recovery=await readFile(new URL('../assets/round-recovery-v1.js',import.meta.url),'utf8');
const precomputed=await readFile(new URL('../assets/precomputed-round-v174.js',import.meta.url),'utf8');
const index=await readFile(new URL('../index.html',import.meta.url),'utf8');
const launcher=await readFile(new URL('../scripts/launch-host-browser-v205.ps1',import.meta.url),'utf8');
const launcherWrapper=await readFile(new URL('../scripts/start-shared-machine-v205.ps1',import.meta.url),'utf8');
const launcherCmd=await readFile(new URL('../start-shared-machine-tunnel.cmd',import.meta.url),'utf8');

assert.ok(wrapper.includes("shared-machine-core-v196.js?v=206"),'shared wrapper must load v206 authoritative client');
assert.ok(wrapper.includes("shared-host-keepalive-v206.js?v=206"),'server host must load the clock-safe keepalive before video capture');
assert.ok(wrapper.includes("shared-roulette-webrtc-host-v197.js?v=206"),'server host must load current smooth transmitter');
assert.ok(wrapper.includes("shared-roulette-webrtc-client-v197.js?v=206"),'players must load current smooth receiver');
assert.ok(wrapper.includes("shared-roulette-client-watchdog-v205.js?v=206"),'players must load stalled-stream watchdog');
assert.ok(wrapper.includes("shared-recovery-completion-v206.js?v=206"),'players must load the completed-round recovery finalizer');
assert.ok(wrapper.includes('eval(load'),'extensions must execute inside the game private scope');

assert.ok(server.includes("phase:'BETTING'"),'server must own a BETTING phase');
assert.ok(server.includes('BET_DURATION_MS'),'server must own BET duration');
assert.ok(server.includes("type:'betting_started'"),'server must broadcast BET opening');
assert.ok(server.includes("error:'wait_next_bet'"),'late players must be rejected until next BET');
assert.ok(server.includes("drawSource='server-fallback'"),'server must support presentation-free fallback draws');
assert.ok(server.includes('pendingRoundForPlayer'),'server must retain unresolved completed rounds for reconnect recovery');
assert.ok(server.includes('lookupRound(m,input.roundId)'),'archived rounds must remain checkpoint/settlement addressable');

assert.ok(shared.includes("countdownText((ms/1000).toFixed(1)+'秒','SERVER BET TIME')"),'client countdown must display server BET clock');
assert.ok(shared.includes('syncBetReservation'),'client must continuously synchronize BET state during server BETTING');
assert.ok(shared.includes("round.phase==='BETTING'"),'client must distinguish server BETTING state');
assert.ok(shared.includes("startPermitId&&client.round?.id===startPermitId"),'client start must require server permission');
assert.ok(shared.includes('refreshAndMaybeStart'),'server round_started must trigger client game start');
assert.ok(shared.includes('client.pendingRound'),'client must track unresolved server rounds');
assert.ok(shared.includes('presentationRate=60'),'reconnect catch-up must replay without normal presentation timing');
assert.ok(shared.includes("status('切断中のサーバー抽選結果を高速反映中'"),'reconnect recovery must be explicit');
assert.ok(shared.includes("client.send({type:'host_fallback_request'"),'physical host reload/error must hand remaining draw to the server');
assert.ok(shared.includes("round.drawSource==='server-fallback'"),'physical host must stop when server fallback owns the draw');
assert.ok(!shared.includes("client.leave({roundId}).catch"),'client reset must not cancel a server-owned round');

assert.ok(shared.includes("current.callbacks.onNumber?.(item.number)!==false"),'shared delivery must observe Arcade.acceptNumber result');
assert.ok(shared.includes("if(!current||current.stopped||!accepted)break;"),'shared delivery must retain a rejected server ball');
const deletePos=shared.indexOf("current.queue.delete(item.index)");
const acceptedPos=shared.indexOf("if(!current||current.stopped||!accepted)break;");
assert.ok(deletePos>acceptedPos,'shared queue must delete a ball only after acceptance');

assert.ok(app.includes("preserveDrawingBuffer:serverHostRender"),'server host WebGL frame must remain readable');
assert.ok(app.includes("get mirrorCanvas(){return renderer.domElement;}"),'roulette must expose its actual WebGL canvas');
assert.ok(host.includes('captureStream(FPS)'),'smooth host must use a browser video track');
assert.ok(host.includes('new RTCPeerConnection(cfg)'),'smooth host must create WebRTC peers');
assert.ok(host.includes('maxFramerate:FPS'),'sender must preserve target frame rate');
assert.ok(host.includes("degradationPreference='maintain-framerate'"),'frame rate must be prioritized over resolution');
assert.ok(!host.includes('.toBlob('),'live transport must not repeatedly encode canvas JPEGs');
assert.ok(host.includes('new MediaRecorder(media'),'NAT-restricted clients must have continuous WebM fallback');
assert.ok(host.includes("recorder.start(220)"),'relay chunks must stay responsive');
assert.ok(client.includes('requestVideoFrameCallback'),'client must track rendered live frames');
assert.ok(client.includes('MediaSource.isTypeSupported'),'WebSocket fallback must play continuously');
assert.ok(clientWatchdog.includes("type:'rtc_fallback_request'"),'stalled connected WebRTC must request relay fallback too');
assert.ok(clientWatchdog.includes('getVideoPlaybackQuality'),'watchdog must verify actual decoded-frame progress');
assert.ok(clientWatchdog.includes("video.dataset.live='0'"),'a frozen remote frame must expose the responsive local canvas while recovering');

assert.ok(hostKeepAlive.includes("app.pause=function(value)"),'host must ignore page-visibility pause during a physical round');
assert.ok(hostKeepAlive.includes("rouletteDrawSource.pause=function(value)"),'draw source pause must be ignored during a physical round');
assert.ok(hostKeepAlive.includes("nativeCapture.call(this,0)"),'host canvas capture must use manual frame requests');
assert.ok(hostKeepAlive.includes("setInterval(()=>postMessage('frame'),42)"),'host frame pump must target about 24 fps');
assert.ok(hostKeepAlive.includes("worker.onmessage=()=>keepAwake({resumeDriver:false,pumpFrame:true})"),'capture heartbeat must not restart the roulette driver');
assert.ok(hostKeepAlive.includes("if(resumeDriver||newRound||!driverRunning)"),'roulette driver must resume only for a real transition');
assert.ok(hostKeepAlive.includes('physics clock is independent'),'host keepalive must document the separated physics and capture clocks');

assert.ok(recoveryCompletion.includes("round.phase!=='COMPLETE'"),'result finalizer must only operate on a completed server round');
assert.ok(recoveryCompletion.includes('Number(engine?.presentationRate)>=50'),'result finalizer must be limited to explicit fast recovery');
assert.ok(recoveryCompletion.includes('processed<8&&!savedPaid'),'unfinished engines must not be paid early');
assert.ok(recoveryCompletion.includes('medalWin('),'recovered engine totals must use the normal payout calculation');
assert.ok(recoveryCompletion.includes('app.finishRound()'),'eight recovered balls must enter the normal result flow');
assert.ok(recoveryCompletion.includes("engine.presentationRate=1"),'normal presentation timing must be restored before results');

for(const flag of ['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows','CalculateNativeWinOcclusion']){
 assert.ok(launcher.includes(flag),'dedicated host browser must include '+flag);
}
assert.ok(launcher.includes("--app=$LocalUrl"),'dedicated browser must open the local monitor app');
assert.ok(launcherWrapper.includes("-NoBrowser"),'legacy launcher must not also open a throttled default-browser tab');
assert.ok(launcherCmd.includes('start-shared-machine-v205.ps1'),'CMD launcher must use the dedicated-browser wrapper');

assert.ok(patches.includes("shared client start does not depend on local roulette renderer"),'server-controlled start must not depend on local roulette readiness');
assert.ok(patches.includes("shared client can start while tab is background"),'server-authorized round must not freeze only because monitor is foreground');

assert.ok(!menu.includes("fetch('assets/precomputed-round-v174.js"),'menu must not load legacy synthetic precomputed rounds');
assert.ok(!titles.includes("request.open('GET','assets/round-recovery-v1.js"),'titles must not load legacy local round recovery');
assert.ok(recovery.includes("__sweetsDisableLegacyRoundRecovery===true"),'legacy recovery file must have a hard kill switch');
assert.ok(precomputed.includes("__sweetsDisableLegacyPrecomputedRound===true"),'legacy precomputed file must have a hard kill switch');
assert.ok(index.includes("localStorage.removeItem('sweets-link-pending-round-v1')"),'stale synthetic round must be cleared before game boot');
assert.ok(index.includes("localStorage.removeItem('sweets-link-credit-v1')"),'legacy synthetic credit cache must be cleared before game boot');
assert.ok(!patches.includes("single-commit instant payout"),'normal physical result flow must remain unchanged');

console.log('server BET clock + clock-safe host + reconnect result completion + smooth client roulette guards passed');

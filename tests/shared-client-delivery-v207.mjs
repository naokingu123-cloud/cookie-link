import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const wrapper=await readFile(new URL('../assets/shared-machine-v176.js',import.meta.url),'utf8');
const corePatch=await readFile(new URL('../assets/shared-core-patch-v215.js',import.meta.url),'utf8');
const flow=await readFile(new URL('../assets/shared-client-flow-v212.js',import.meta.url),'utf8');
const lateJoin=await readFile(new URL('../assets/shared-next-bet-join-v215.js',import.meta.url),'utf8');
const hostKeepAlive=await readFile(new URL('../assets/shared-host-keepalive-v206.js',import.meta.url),'utf8');
const client=await readFile(new URL('../assets/shared-roulette-webrtc-client-v197.js',import.meta.url),'utf8');
const watchdog=await readFile(new URL('../assets/shared-roulette-client-watchdog-v205.js',import.meta.url),'utf8');
const server=await readFile(new URL('../server-core.mjs',import.meta.url),'utf8');
const app=await readFile(new URL('../optimized/app-01.js',import.meta.url),'utf8');

assert.ok(wrapper.includes("shared-core-patch-v215.js?v=215"),'v215 loader must install the authoritative core patch');
assert.ok(wrapper.includes("SweetsSharedCorePatchV215.patch"),'raw shared core must be patched before evaluation');
assert.ok(wrapper.includes("server-payout-control-v3.js?v=215"),'players must retain common payout control');
assert.ok(wrapper.includes("shared-client-flow-v212.js?v=215"),'players must retain explicit post-result reset');
assert.ok(wrapper.includes("shared-next-bet-join-v215.js?v=215"),'players must load the direct next-BET attach loop');
assert.ok(wrapper.includes("shared-roulette-webrtc-client-v197.js?v=215"),'players must retain smooth roulette video');
assert.ok(wrapper.includes("shared-roulette-client-watchdog-v205.js?v=215"),'players must retain stalled-stream recovery');
assert.ok(wrapper.includes("server-offline-settlement-worker-v3.js?v=215"),'server settlement worker must remain available');
assert.ok(!wrapper.includes('shared-recovery-replay-v207.js'),'normal startup must not replay an old completed eight-ball round');
assert.ok(!wrapper.includes('shared-recovery-completion-v206.js'),'normal clients must not reconstruct old results locally');

assert.ok(corePatch.includes("round.phase!=='PLAYING')throw Error('server round not playing')"),'server participant state must replace the transient start permit');
assert.ok(corePatch.includes("client.round?.phase==='PLAYING'&&client.round?.participant?.playerId"),'ready state must follow the authoritative participating round');
assert.ok(corePatch.includes('app.locked=[...(round.participant.locked||round.participant.bets'),'server start must restore locked BET values');
assert.ok(corePatch.includes('try{app.start();}'),'server-controlled start must call the game directly');
assert.ok(corePatch.includes('disable startup pending-round replay'),'startup pending history must be ignored by the client');

assert.ok(flow.includes("engine.kind='cookie'"),'GAME0 must map to Cookie Link');
assert.ok(flow.includes('client.settle({roundId:active.roundId,totalWin,creditAfter,immediateReset:true})'),'immediate reset must send authoritative settlement');
assert.ok(flow.includes('rouletteDrawSource?.reset?.()'),'post-result reset must release shared current');
assert.ok(flow.includes('refreshServerState(shared)'),'post-result flow must fetch the next server state');

assert.ok(lateJoin.includes("round.phase==='BETTING'"),'late client loop must recognize the next BET window');
assert.ok(lateJoin.includes('client.join(payload)'),'eligible client must reserve the next BET');
assert.ok(lateJoin.includes('app.start();'),'participating PLAYING round must start directly');
assert.ok(lateJoin.includes('applyParticipant(round.participant)'),'authoritative BET and enabled state must be restored before start');
assert.ok(!lateJoin.includes("type:'round_started'"),'v215 must not depend on a synthetic round_started event');

assert.ok(server.includes('pendingRoundForPlayer'),'server must retain unsettled rounds for its offline settlement worker');
assert.ok(server.includes('lookupRound(m,input.roundId)'),'archived rounds must remain settlement-addressable');
assert.ok(app.includes("if(this.draws.length===8){this.dealing=false;this.boostAfterDraws(token);}"),'live eighth ball must retain the normal result calculation path');
assert.ok(hostKeepAlive.includes("worker.onmessage=()=>keepAwake({resumeDriver:false,pumpFrame:true})"),'video capture must remain independent of roulette physics');
assert.ok(client.includes('requestVideoFrameCallback'),'smooth remote roulette playback must remain enabled');
assert.ok(watchdog.includes("type:'rtc_fallback_request'"),'a stalled stream must still request relay fallback');

console.log('v215 authoritative next-round attach, no startup replay, reset and smooth roulette guards passed');

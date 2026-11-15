import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const wrapper=await readFile(new URL('../assets/shared-machine-v176.js',import.meta.url),'utf8');
const corePatch=await readFile(new URL('../assets/shared-core-patch-v216.js',import.meta.url),'utf8');
const flow=await readFile(new URL('../assets/shared-client-flow-v212.js',import.meta.url),'utf8');
const lifecycle=await readFile(new URL('../assets/shared-client-lifecycle-v216.js',import.meta.url),'utf8');
const lateJoin=await readFile(new URL('../assets/shared-next-bet-join-v215.js',import.meta.url),'utf8');
const hostKeepAlive=await readFile(new URL('../assets/shared-host-keepalive-v206.js',import.meta.url),'utf8');
const client=await readFile(new URL('../assets/shared-roulette-webrtc-client-v197.js',import.meta.url),'utf8');
const server=await readFile(new URL('../server-core.mjs',import.meta.url),'utf8');
const app=await readFile(new URL('../optimized/app-01.js',import.meta.url),'utf8');

assert.ok(wrapper.includes("shared-core-patch-v216.js?v=216"),'v216 loader must install the authoritative core patch');
assert.ok(wrapper.includes("SweetsSharedCorePatchV216.patch"),'raw shared core must be patched before evaluation');
assert.ok(wrapper.includes("server-payout-control-v3.js?v=216"),'players must retain common payout control');
assert.ok(wrapper.includes("shared-client-flow-v212.js?v=216"),'players must retain explicit settlement capture');
assert.ok(wrapper.includes("shared-client-lifecycle-v216.js?v=216"),'players must load hard local-draw and result-reset lifecycle control');
assert.ok(wrapper.includes("shared-next-bet-join-v215.js?v=216"),'players must retain direct next-BET attachment');
assert.ok(wrapper.includes("shared-roulette-webrtc-client-v197.js?v=216"),'players must load dual-path roulette video');
assert.ok(wrapper.includes("server-offline-settlement-worker-v3.js?v=216"),'server settlement worker must remain available');
assert.ok(!wrapper.includes('shared-recovery-replay-v207.js'),'normal startup must not replay an old completed eight-ball round');
assert.ok(!wrapper.includes('shared-recovery-completion-v206.js'),'normal clients must not reconstruct old results locally');
assert.ok(!wrapper.includes('shared-roulette-client-watchdog-v205.js'),'old single-video watchdog must not conflict with dual-path video');

assert.ok(corePatch.includes('disable client local auto scheduler'),'server sync must cancel first-load local auto rounds');
assert.ok(corePatch.includes("round.phase!=='PLAYING')throw Error('server round not playing')"),'server participant state must replace transient start permission');
assert.ok(corePatch.includes("client.round?.phase==='PLAYING'&&client.round?.participant?.playerId"),'ready state must follow the authoritative participating round');
assert.ok(corePatch.includes('app.locked=[...(round.participant.locked||round.participant.bets'),'server start must restore locked BET values');
assert.ok(corePatch.includes('disable startup pending-round replay'),'startup pending history must be ignored by the client');

assert.ok(flow.includes("engine.kind='cookie'"),'GAME0 must map to Cookie Link');
assert.ok(flow.includes('client.settle({roundId:active.roundId,totalWin,creditAfter,immediateReset:true})'),'immediate reset must send authoritative settlement');
assert.ok(flow.includes('rouletteDrawSource?.reset?.()'),'post-result reset must release shared current');

assert.ok(lifecycle.includes('proto.start=function(...args)'),'all game starts must pass through the authoritative hard guard');
assert.ok(lifecycle.includes("if(!canStart(this))"),'non-authoritative first-load starts must be rejected');
assert.ok(lifecycle.includes("scheduleAutoRound=function(){stopLocalAuto();return false;}"),'local auto-round scheduling must remain disabled');
assert.ok(lifecycle.includes("if(typeof target.prepare==='function')target.prepare()"),'completed results must return through the normal prepare path');
assert.ok(lifecycle.includes("if(target.phase!=='ready'||target.draws?.length||needsEngineReset(target))"),'dirty result state must be repaired until truly initial');
assert.ok(lifecycle.includes("for(const delay of [60,220,600,1200])"),'post-result state must be rechecked after later callbacks can overwrite it');

assert.ok(lateJoin.includes("round.phase==='BETTING'"),'late client loop must recognize the next BET window');
assert.ok(lateJoin.includes('client.join(payload)'),'eligible client must reserve the next BET');
assert.ok(lateJoin.includes('app.start();'),'participating PLAYING round must start directly through the guard');
assert.ok(lateJoin.includes('applyParticipant(round.participant)'),'authoritative BET state must be restored before start');

assert.ok(server.includes('pendingRoundForPlayer'),'server must retain unsettled rounds for its offline settlement worker');
assert.ok(server.includes('lookupRound(m,input.roundId)'),'archived rounds must remain settlement-addressable');
assert.ok(app.includes("if(this.draws.length===8){this.dealing=false;this.boostAfterDraws(token);}"),'live eighth ball must retain normal result calculation');
assert.ok(hostKeepAlive.includes("worker.onmessage=()=>keepAwake({resumeDriver:false,pumpFrame:true})"),'video capture must remain independent of roulette physics');
assert.ok(client.includes('shared-roulette-p2p'),'client must keep a dedicated low-latency stream');
assert.ok(client.includes('shared-roulette-relay'),'client must keep a warm relay stream');
assert.ok(client.includes("setActive('relay')"),'stalled P2P must switch to relay without a black gap');

console.log('v216 authoritative start, hard local draw block, stable result reset and seamless roulette guards passed');

import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=name=>readFile(new URL('../'+name,import.meta.url),'utf8');
const [entry,sanitizer,loader,wrapper,patch,gate,flow,lifecycle,nextJoin,hostSpeed,hostVideo,clientVideo,monitorGuard,monitorHtml,version]=await Promise.all([
 read('server.mjs'),read('server-startup-sanitize-v217.mjs'),read('server-core-loader-v217.mjs'),read('assets/shared-machine-v176.js'),
 read('assets/shared-core-patch-v216.js'),read('assets/shared-connection-gate-v217.js'),read('assets/shared-client-flow-v212.js'),
 read('assets/shared-client-lifecycle-v217.js'),read('assets/shared-next-bet-join-v217.js'),read('assets/shared-host-speed-v217.js'),
 read('assets/shared-roulette-webrtc-host-v217.js'),read('assets/shared-roulette-webrtc-client-v197.js'),
 read('assets/server-monitor-host-stability-v217.js'),read('monitor.html'),read('app-version.json')
]);

assert.ok(entry.includes("SWEETS_AUTONOMOUS_ROUNDS='0'"),'synthetic autonomous runner must be disabled');
assert.ok(!entry.includes("server-autonomous-rounds-v213.mjs"),'legacy SERVER CLOCK runner must not load');
assert.ok(entry.includes("SWEETS_PLAYER_STABLE_MS??='2800'"),'server must require a stable player connection');
assert.ok(entry.includes('server-startup-sanitize-v217.mjs'),'legacy fake sessions must be removed before core boot');
assert.ok(entry.includes('server-core-loader-v217.mjs'),'stable core transformation must own server startup');
assert.ok(sanitizer.includes("'SERVER CLOCK','SERVER FALLBACK HOST'"),'legacy synthetic players must be recognized');
assert.ok(sanitizer.includes("appVersion||'').startsWith('server-autonomous-')"),'legacy epsilon participants must be removed');
assert.ok(loader.includes('stablyConnected'),'BET eligibility must use a continuously open socket');
assert.ok(loader.includes('time-Number(ws.connectedAt)>=PLAYER_STABLE_MS'),'momentary sockets must be rejected');
assert.ok(loader.includes('never create random balls'),'automatic random fallback must be disabled');
assert.ok(loader.includes("if(msg.type==='host_fallback_request')"),'requested fallback must be intercepted');
assert.ok(!entry.includes("SWEETS_AUTONOMOUS_ROUNDS??='1'"));

assert.ok(wrapper.includes('shared-connection-gate-v217.js?v=217'));
assert.ok(wrapper.includes('shared-client-lifecycle-v217.js?v=217'));
assert.ok(wrapper.includes('shared-next-bet-join-v217.js?v=217'));
assert.ok(wrapper.includes('shared-host-speed-v217.js?v=217'));
assert.ok(wrapper.includes('shared-roulette-webrtc-host-v217.js?v=217'));
assert.ok(wrapper.indexOf('shared-connection-gate-v217.js')<wrapper.indexOf('shared-client-flow-v212.js'),'connection gate must install before any result/start hooks');
assert.ok(wrapper.indexOf('shared-client-lifecycle-v217.js')<wrapper.indexOf('shared-next-bet-join-v217.js'),'full reset must install before next-BET join');

assert.ok(patch.includes('never convert a partially physical round into random fallback'));
assert.ok(patch.includes('physical draw errors must stop instead of generating random balls'));
assert.ok(patch.includes("nativeStart({onNumber:reportPhysical,onError:message=>{stopHost(message||'抽選機エラー');}})"),'patched target must stop instead of requesting server fallback');
assert.ok(patch.includes("hostRunning=false;stopHost('抽選機起動エラー')"),'host startup failure must stop the physical round');
assert.ok(gate.includes('const STABLE_MS=2800'));
assert.ok(gate.includes('const MIN_BET_REMAIN_MS=2600'));
assert.ok(gate.includes('stable_connection_required'));

assert.ok(flow.includes('const began=nativeBegin.apply(this,args)'),'native payout must add WIN to CREDIT');
assert.ok(flow.includes('lifecycle owns the only full reset'));
assert.ok(!flow.includes('forceNextBet('),'partial reset path must be retired');
assert.ok(lifecycle.includes("if(typeof target.prepare==='function')target.prepare()"),'canonical Arcade.prepare must run');
assert.ok(lifecycle.includes("if(typeof engine.reset==='function')engine.reset({keepWonder:true})"),'every game engine must be forcibly regenerated');
assert.ok(lifecycle.includes('slot.dirtyMain=true;slot.dirtyMini=true'),'main and mini tab caches must be invalidated');
assert.ok(lifecycle.includes("layer.hidden=true"),'old result layer must be hidden');
assert.ok(lifecycle.includes('target.locked=(target.engines||[]).map(()=>0)'),'old locked BET state must be cleared');
assert.ok(lifecycle.includes('isPristine:()=>isPristineAfterReset(app)&&!resetBusy'),'verified initial state must be exposed');
assert.ok(nextJoin.includes("await ensurePristine('before-bet-reservation')"),'BET must wait for a fully rebuilt board');
assert.ok(nextJoin.includes("await ensurePristine('before-next-game-start')"),'PLAYING must wait for a fully rebuilt board');
assert.ok(nextJoin.includes('if(!live||live.id!==round.id'),'server round must be revalidated after reset');

assert.ok(hostSpeed.includes("button.click()"),'server host must select the built-in two-times physics mode');
assert.ok(hostSpeed.includes("dataset.serverLockedSpeed='2'"));
assert.ok(hostVideo.includes('Do not drop the relay merely because ICE connected'));
assert.ok(!hostVideo.includes("if(state==='connected'){clearTimeout(session.timer);dropSubscriber"),'P2P connection alone must not kill the warm relay');
assert.ok(clientVideo.includes('shared-roulette-p2p'));
assert.ok(clientVideo.includes('shared-roulette-relay'));
assert.ok(clientVideo.includes('now-p2pStableSince>3200'));
assert.ok(monitorGuard.includes('if(booted)return'),'monitor must ignore periodic iframe src reassignment');
assert.ok(monitorGuard.includes("url.searchParams.delete('lightRoulette')"),'host canvas must not be forced into the 10fps ultra-light mode');
assert.ok(monitorGuard.includes("url.searchParams.set('smoothRoulette','1')"));
assert.ok(monitorHtml.includes('server-monitor-host-stability-v217.js?v=217'));
assert.equal(JSON.parse(version).version,'20261116-v217-full-board-reset-stable-link-2x');

console.log('v217 static full-reset, stable-link, no-random-draw and continuous-video guards passed');

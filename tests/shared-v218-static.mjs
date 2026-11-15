import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const wrapper=await readFile(new URL('../assets/shared-machine-v176.js',import.meta.url),'utf8');
const gate=await readFile(new URL('../assets/shared-connection-gate-v218.js',import.meta.url),'utf8');
const lifecycle=await readFile(new URL('../assets/shared-client-lifecycle-v218-final.js',import.meta.url),'utf8');
const join=await readFile(new URL('../assets/shared-next-bet-join-v218.js',import.meta.url),'utf8');
const speed=await readFile(new URL('../assets/shared-host-speed-v218.js',import.meta.url),'utf8');
const video=await readFile(new URL('../assets/shared-roulette-client-v218.js',import.meta.url),'utf8');

assert.ok(wrapper.includes('shared-connection-gate-v218.js?v=218'));
assert.ok(wrapper.includes('shared-client-lifecycle-v218-final.js?v=218'));
assert.ok(wrapper.includes('shared-next-bet-join-v218.js?v=218'));
assert.ok(wrapper.includes('shared-host-speed-v218.js?v=218'));
assert.ok(wrapper.includes('shared-roulette-client-v218.js?v=218'));
assert.ok(!wrapper.includes('shared-client-flow-v212.js'),'only the v218 lifecycle may own settlement/reset');
assert.ok(!wrapper.includes('shared-client-lifecycle-v217.js'));

assert.ok(gate.includes("blockedRoundId=String(client()?.round?.id||'')"),'round visible at login must be observation-only');
assert.ok(gate.includes("String(round.id||'')===blockedRoundId"),'the first visible round must never become joinable later');
assert.ok(gate.includes('joinedRounds.has'),'PLAYING may start only after this connection reserved the round');
assert.ok(gate.includes('MIN_BET_REMAIN_MS'),'a nearly closed BET must not be joined');

const resetBeforePrepare=lifecycle.indexOf('resetEngines(target);clearApp(target,credit,bet);');
const prepare=lifecycle.indexOf('target.prepare?.()',resetBeforePrepare);
const render=lifecycle.indexOf('render(target)',prepare);
assert.ok(resetBeforePrepare>=0&&prepare>resetBeforePrepare&&render>prepare,'model reset -> canonical prepare -> final render ordering is mandatory');
assert.ok(lifecycle.includes("engine.reset({keepWonder:false,forceNew:true})"),'old game boards must not be preserved');
assert.ok(lifecycle.includes("rouletteDrawSource.start=function"),'local eight-ball source must be guarded too');
assert.ok(lifecycle.includes("if(typeof scheduleAutoRound==='function')"),'legacy first-load auto scheduler must be disabled');
assert.ok(lifecycle.includes("phase==='complete'&&age>100"),'native result completion must immediately return to initial state');
assert.ok(lifecycle.includes("engine.kind='cookie'"),'GAME0 must remain Cookie Link');
assert.ok(lifecycle.includes('function modelPristine'),'reset verification must ignore only its own lock, not rebuild repeatedly');

assert.ok(join.includes('startedRounds.has(round.id)'),'a server round must start at most once');
assert.ok(join.includes('gate()?.noteJoined?.(response.round.id)'),'only a successful server reservation may arm start');
assert.ok(join.includes("await clean('before-authoritative-start')"),'the next round must wait for a clean new board');

assert.ok(speed.includes("round?.phase==='PLAYING'"));
assert.ok(speed.includes("button.click()"));
assert.ok(speed.includes("serverLockedSpeed='2'"));

assert.ok(video.includes('shared-roulette-p2p-v218'));
assert.ok(video.includes('shared-roulette-relay-v218'));
assert.ok(video.includes('Relay remains warm for the entire PLAYING phase'));
assert.ok(!video.includes("type:'rtc_fallback_stop'"),'client must not tear down the warm relay during a live round');
assert.ok(video.includes("if(p2pFresh)activate('p2p');else if(relayFresh)activate('relay')"));
assert.ok(video.includes('local(true)'));

console.log('v218 single-owner lifecycle, next-window gate, 2x host and persistent video guards passed');

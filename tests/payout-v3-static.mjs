import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const server=await readFile(new URL('../server-payout-preload-v3.mjs',import.meta.url),'utf8');
const client=await readFile(new URL('../assets/server-payout-control-v3.js',import.meta.url),'utf8');
const flow=await readFile(new URL('../assets/shared-client-flow-v212.js',import.meta.url),'utf8');
const lifecycle=await readFile(new URL('../assets/shared-client-lifecycle-v216.js',import.meta.url),'utf8');
const corePatch=await readFile(new URL('../assets/shared-core-patch-v216.js',import.meta.url),'utf8');
const nextJoin=await readFile(new URL('../assets/shared-next-bet-join-v215.js',import.meta.url),'utf8');
const worker=await readFile(new URL('../assets/server-offline-settlement-worker-v3.js',import.meta.url),'utf8');
const monitor=await readFile(new URL('../assets/server-monitor-payout-v3.js',import.meta.url),'utf8');
const html=await readFile(new URL('../monitor.html',import.meta.url),'utf8');
const css=await readFile(new URL('../assets/server-monitor-payout-v1.css',import.meta.url),'utf8');
const wrapper=await readFile(new URL('../assets/shared-machine-v176.js',import.meta.url),'utf8');
const entry=await readFile(new URL('../server.mjs',import.meta.url),'utf8');

assert.ok(server.includes("source:'per-player-common'"),'control must expose one common player rate');
assert.ok(server.includes('function monetaryDebt(p)'),'automatic control must use player monetary payout debt');
assert.ok(server.includes('desiredForBet(p,bet)'),'rate must be repriced against current BET');
assert.ok(server.includes('p.effectiveRate=desired'),'BET shocks must snap to the newly calculated exposure rate');
assert.ok(!server.includes("source:'per-player-game'"),'game-specific control must remain retired');
assert.ok(server.includes('function commitSettlement'),'lifetime totals must be committed at settlement');
assert.ok(server.includes("source:'server-worker'"),'offline completion must be identifiable as server settlement');

assert.ok(client.includes('const commonRate=()'),'all game generators must receive one player-common rate');
assert.ok(client.includes("for(const method of ['reset','freshBoard'])"),'all board generators must use the common server rate');
assert.ok(client.includes('client.settle=async function'),'final settlement must send final game telemetry');
assert.ok(client.includes('payoutV3:final'),'last WIN must be committed with settle');
assert.ok(client.includes('resetToServerWaiting'),'server-settled clients must reset and wait');
assert.ok(!client.includes('hammer'),'payout control must not be hidden in cosmetic hammer colors');

assert.ok(flow.includes("engine.kind='cookie'"),'GAME0 must be identified as Cookie Link');
assert.ok(flow.includes('immediateReset:true'),'normal settlement must use immediate reset');
assert.ok(flow.includes('rouletteDrawSource?.reset?.()'),'shared current must be explicitly released');
assert.ok(flow.includes('refreshServerState(shared)'),'the next authoritative state must be fetched after reset');
assert.ok(lifecycle.includes('settleCredit(target,sharedRound)'),'lifecycle fallback must preserve authoritative CREDIT when result reset is delayed');
assert.ok(lifecycle.includes('releaseToInitial(app,credit,bets)'),'result completion must always restore the initial state');

assert.ok(corePatch.includes('remove transient start permit gate'),'v216 must remove the one-shot start permission race');
assert.ok(corePatch.includes('disable client local auto scheduler'),'v216 must suppress the first-load local draw timer');
assert.ok(corePatch.includes('disable startup pending-round replay'),'v216 must suppress old eight-ball replay on startup');
assert.ok(nextJoin.includes('app.start();'),'v216 must directly start an authoritative participating round');
assert.ok(nextJoin.includes('client.join(payload)'),'v216 must reserve the next BET');
assert.ok(!nextJoin.includes("type:'round_started'"),'v216 must not rely on a synthetic start event');

assert.ok(worker.includes("serverSettlementWorker')!=='1'"),'offline calculator must run only in its dedicated iframe');
assert.ok(worker.includes('presentationRate=100'),'offline settlement must skip normal presentation timing');
assert.ok(worker.includes('app.finishRound()'),'offline calculation must use normal result calculation');
assert.ok(wrapper.includes("server-offline-settlement-worker-v3.js?v=216"),'dedicated worker must remain in v216 loader');
assert.ok(wrapper.includes("server-payout-control-v3.js?v=216"),'normal players must load common payout control');
assert.ok(wrapper.includes("shared-client-lifecycle-v216.js?v=216"),'normal players must load stable result lifecycle');
assert.ok(wrapper.includes("shared-next-bet-join-v215.js?v=216"),'normal players must load direct next-BET attachment');
assert.ok(!wrapper.includes('shared-recovery-replay-v207.js'),'normal players must not replay stale completed history');
assert.ok(entry.includes("process.env.SWEETS_BET_DURATION_MS??='10000'"),'shared BET time must default to ten seconds');
assert.ok(entry.includes("server-payout-preload-v3.mjs"),'server entry must load payout v3');

assert.ok(monitor.includes('function rateBar'),'monitor must render horizontal payout bars');
assert.ok(monitor.includes('今回WIN'),'monitor must label live round WIN separately');
assert.ok(monitor.includes('累計WIN'),'monitor must label settled cumulative WIN separately');
assert.ok(html.includes('プレイヤー単位・全ゲーム共通設定'),'monitor must explain common game control in Japanese');
assert.ok(css.includes('.host-frame{display:block;width:100%;height:248px'),'roulette view must remain compact');
assert.ok(css.includes('.rate-track'),'horizontal rate chart styles must exist');
console.log('v216 common payout, hard local draw block, stable initial reset and 10-second BET guards passed');

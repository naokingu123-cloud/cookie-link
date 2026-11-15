import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const server=await readFile(new URL('../server-payout-preload-v3.mjs',import.meta.url),'utf8');
const client=await readFile(new URL('../assets/server-payout-control-v3.js',import.meta.url),'utf8');
const flow=await readFile(new URL('../assets/shared-client-flow-v211.js',import.meta.url),'utf8');
const worker=await readFile(new URL('../assets/server-offline-settlement-worker-v3.js',import.meta.url),'utf8');
const monitor=await readFile(new URL('../assets/server-monitor-payout-v3.js',import.meta.url),'utf8');
const html=await readFile(new URL('../monitor.html',import.meta.url),'utf8');
const css=await readFile(new URL('../assets/server-monitor-payout-v1.css',import.meta.url),'utf8');
const wrapper=await readFile(new URL('../assets/shared-machine-v176.js',import.meta.url),'utf8');
const entry=await readFile(new URL('../server.mjs',import.meta.url),'utf8');

assert.ok(server.includes("source:'per-player-common'"),'control must expose one common player rate');
assert.ok(server.includes('function monetaryDebt(p)'),'automatic control must use the player monetary payout debt');
assert.ok(server.includes('desiredForBet(p,bet)'),'the rate must be repriced against the current BET');
assert.ok(server.includes('ratio>=Math.max(1.01,finite(db.config.betShockRatio))'),'a major BET change must discard the prior low-stake quote');
assert.ok(server.includes('p.effectiveRate=desired'),'BET shocks must snap to the newly calculated exposure rate');
assert.ok(!server.includes("source:'per-player-game'"),'game-specific rate control must be retired');
assert.ok(server.includes('function commitSettlement'),'lifetime totals must be committed at settlement');
assert.ok(server.indexOf('p.lifetimeWin+=win')>server.indexOf('function commitSettlement'),'cumulative WIN must not be increased by per-ball telemetry');
assert.ok(server.includes("source:'server-worker'"),'offline completion must be identifiable as server settlement');
assert.ok(server.includes("round.wasOffline&&!round.committed"),'only interrupted unsettled rounds may enter the worker queue');
assert.ok(server.includes("ws.on('close',()=>markOffline"),'client disconnect must be detected by the server itself');

assert.ok(client.includes('const commonRate=()'),'all game generators must receive one player-common rate');
assert.ok(client.includes("for(const method of ['reset','freshBoard'])"),'all board generators must use the common server rate');
assert.ok(client.includes('client.settle=async function'),'final settlement must send final game WIN telemetry');
assert.ok(client.includes('payoutV3:final'),'the last WIN must be committed with the settle request');
assert.ok(client.includes('payoutV3Bet:{version:3,games:gameBetRows()}'),'BET changes must be sent with game allocation before board lock');
assert.ok(client.includes('resetToServerWaiting'),'server-settled clients must reset and wait for the next BET time');
assert.ok(!client.includes('hammer'),'payout control must not be hidden in cosmetic hammer colors');

assert.ok(flow.includes("engine.kind='cookie'"),'GAME0 must be identified as Cookie Link');
assert.ok(flow.includes('immediateReset:true'),'normal server settlement must use the immediate reset path');
assert.ok(flow.includes("machine.phase='complete'"),'immediate reset must close the result phase');
assert.ok(flow.includes("typeof machine.prepare==='function'"),'immediate reset must return the game to ready state');
assert.ok(flow.includes('machine.credit=finite(creditAfter)'),'CREDIT must be applied before the next BET window');

assert.ok(worker.includes("serverSettlementWorker')!=='1'"),'offline calculator must run only in the dedicated server iframe');
assert.ok(worker.includes('presentationRate=100'),'offline settlement must skip normal presentation timing');
assert.ok(worker.includes('app.finishRound()'),'offline calculation must use the normal result calculation path');
assert.ok(worker.includes('/offline-work/complete'),'calculated WIN must be returned to the server');
assert.ok(wrapper.includes("server-offline-settlement-worker-v3.js?v=211"),'the dedicated worker must bypass the normal player client');
assert.ok(wrapper.includes("server-payout-control-v3.js?v=211"),'normal players must load common payout v3');
assert.ok(wrapper.includes("shared-client-flow-v211.js?v=211"),'normal players must load immediate settlement flow');
assert.ok(entry.includes("process.env.SWEETS_BET_DURATION_MS??='3000'"),'shared BET time must default to three seconds');
assert.ok(entry.includes("server-payout-preload-v3.mjs"),'server entry must load payout v3');

assert.ok(monitor.includes('function rateBar'),'monitor must render horizontal payout bars');
assert.ok(monitor.includes('今回WIN'),'monitor must label live round WIN separately');
assert.ok(monitor.includes('累計WIN'),'monitor must label settled cumulative WIN separately');
assert.ok(monitor.includes('savePlayer'),'manual control must be player-wide rather than game-wide');
assert.ok(html.includes('プレイヤー単位・全ゲーム共通設定'),'monitor must explain common game control in Japanese');
assert.ok(html.includes('settlement-worker'),'monitor must host the server-side settlement calculator');
assert.ok(css.includes('.host-frame{display:block;width:100%;height:248px'),'roulette view must be compact enough for one-screen monitoring');
assert.ok(css.includes('.rate-track'),'horizontal rate chart styles must exist');
console.log('common player payout, immediate CREDIT reset, GAME0 mapping, 3-second BET, compact monitor and offline settlement static guards passed');

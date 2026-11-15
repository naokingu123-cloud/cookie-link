import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const wrapper=await readFile(new URL('../assets/shared-machine-v176.js',import.meta.url),'utf8');
const core=await readFile(new URL('../assets/shared-machine-core-v196.js',import.meta.url),'utf8');
const flow=await readFile(new URL('../assets/shared-client-flow-v212.js',import.meta.url),'utf8');
const replay=await readFile(new URL('../assets/shared-recovery-replay-v207.js',import.meta.url),'utf8');
const completion=await readFile(new URL('../assets/shared-recovery-completion-v206.js',import.meta.url),'utf8');
const hostKeepAlive=await readFile(new URL('../assets/shared-host-keepalive-v206.js',import.meta.url),'utf8');
const client=await readFile(new URL('../assets/shared-roulette-webrtc-client-v197.js',import.meta.url),'utf8');
const watchdog=await readFile(new URL('../assets/shared-roulette-client-watchdog-v205.js',import.meta.url),'utf8');
const server=await readFile(new URL('../server-core.mjs',import.meta.url),'utf8');
const app=await readFile(new URL('../optimized/app-01.js',import.meta.url),'utf8');

assert.ok(wrapper.includes("shared-machine-core-v196.js?v=212"),'v212 loader must load the authoritative core');
assert.ok(wrapper.includes("server-payout-control-v3.js?v=212"),'players must load the common payout controller before recovery');
assert.ok(wrapper.includes("shared-client-flow-v212.js?v=212"),'players must load the explicit next-game flow');
assert.ok(wrapper.includes("shared-recovery-replay-v207.js?v=212"),'players must retain stable recovery replay for non-offline-managed cases');
assert.ok(wrapper.includes("shared-roulette-webrtc-client-v197.js?v=212"),'players must retain smooth roulette video');
assert.ok(wrapper.includes("shared-roulette-client-watchdog-v205.js?v=212"),'players must retain stalled-stream recovery');
assert.ok(wrapper.includes("shared-recovery-completion-v206.js?v=212"),'players must retain the result completion fallback');
assert.ok(wrapper.includes("server-offline-settlement-worker-v3.js?v=212"),'dedicated server iframe must load the offline result worker');
assert.ok(wrapper.indexOf('server-payout-control-v3.js')<wrapper.indexOf('shared-client-flow-v212.js'),'payout telemetry must capture settlement before reset is installed');
assert.ok(wrapper.indexOf('shared-client-flow-v212.js')<wrapper.indexOf('shared-recovery-replay-v207.js'),'explicit reset must be installed before client recovery starts');
assert.ok(wrapper.indexOf('shared-recovery-replay-v207.js')<wrapper.indexOf('shared-roulette-webrtc-client-v197.js'),'stable replay must patch state retrieval before client recovery starts');
assert.ok(wrapper.indexOf('if(worker)')<wrapper.indexOf("shared-machine-core-v196.js"),'settlement worker must bypass the normal shared client core');

assert.ok(flow.includes("engine.kind='cookie'"),'GAME0 must map to Cookie Link');
assert.ok(flow.includes('client.settle({roundId:active.roundId,totalWin,creditAfter,immediateReset:true})'),'immediate reset must still send authoritative settlement');
assert.ok(flow.includes('rouletteDrawSource?.reset?.()'),'the working immediate-reset path must explicitly release shared current');
assert.ok(flow.includes("machine.phase='complete';\n  if(typeof machine.prepare==='function')machine.prepare()"),'prepare must run after forcing a valid complete state');
assert.ok(flow.includes('setTimeout(()=>forceNextBet'),'next-game reset must run after the eighth-ball call stack');
assert.ok(!flow.includes("if(machine.phase!=='complete')return"),'later phase mutations must not cancel the next-game transition');
assert.ok(flow.includes('refreshServerState(shared)'),'client must refresh the authoritative next BET state');

assert.ok(server.includes('pendingRoundForPlayer'),'unsettled completed rounds must remain recoverable in the core');
assert.ok(server.includes('out.initialState=participant.initialState||null'),'the stable zero-ball state must be returned when ordinary recovery is used');
assert.ok(server.includes('if(ballIndex===0&&!participant.initialState)participant.initialState=input.state'),'the first stable state must be preserved');
assert.ok(server.includes('lookupRound(m,input.roundId)'),'archived completed rounds must remain checkpoint and settlement addressable');

assert.ok(core.includes('client.save({roundId:round.id,ballIndex:0,state})'),'the stable state must be captured before any server ball is delivered');
assert.ok(core.includes('const savedBall=Math.max(0,Math.min(8,Number(participant.checkpointBall)||0))'),'normal recovery must honor the supplied checkpoint boundary');
assert.ok(core.includes('for(const ball of balls)if(ball.index>current.delivered)queueBall(ball,true)'),'ordinary recovery must redeliver authoritative balls after that boundary');
assert.ok(core.includes("current.callbacks.onNumber?.(item.number)!==false"),'server balls must advance only after Arcade accepts them');
assert.ok(core.includes("if(!current||current.stopped||!accepted)break;"),'rejected balls must remain queued');

assert.ok(replay.includes("round.phase==='COMPLETE'"),'rewind fallback must be restricted to completed rounds');
assert.ok(replay.includes('round.balls.length>=8'),'rewind fallback must require all eight authoritative balls');
assert.ok(replay.includes('!participant.settlement'),'settled rounds must never be replayed');
assert.ok(completion.includes("round.phase!=='COMPLETE'"),'the fallback finalizer must remain limited to completed rounds');
assert.ok(completion.includes('processed<8&&!savedPaid'),'the fallback must not pay an unfinished engine');
assert.ok(completion.includes('app.finishRound()'),'fully recovered games must enter the normal result phase');
assert.ok(app.includes("if(this.draws.length===8){this.dealing=false;this.boostAfterDraws(token);}"),'the eighth ball must retain the normal end-of-round path');
assert.ok(app.includes("if(ev.phase==='complete'&&!this.paid[i]"),'engine completion must calculate each game result normally');

assert.ok(hostKeepAlive.includes("worker.onmessage=()=>keepAwake({resumeDriver:false,pumpFrame:true})"),'video capture must remain independent of the roulette physics clock');
assert.ok(client.includes('requestVideoFrameCallback'),'smooth remote roulette playback must remain enabled');
assert.ok(watchdog.includes("type:'rtc_fallback_request'"),'a stalled stream must still request relay fallback');
console.log('v212 retains recovery, explicit next-game reset, host timing and smooth roulette guards');

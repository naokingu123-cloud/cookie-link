import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const wrapper=await readFile(new URL('../assets/shared-machine-v176.js',import.meta.url),'utf8');
const core=await readFile(new URL('../assets/shared-machine-core-v196.js',import.meta.url),'utf8');
const replay=await readFile(new URL('../assets/shared-recovery-replay-v207.js',import.meta.url),'utf8');
const completion=await readFile(new URL('../assets/shared-recovery-completion-v206.js',import.meta.url),'utf8');
const hostKeepAlive=await readFile(new URL('../assets/shared-host-keepalive-v206.js',import.meta.url),'utf8');
const client=await readFile(new URL('../assets/shared-roulette-webrtc-client-v197.js',import.meta.url),'utf8');
const watchdog=await readFile(new URL('../assets/shared-roulette-client-watchdog-v205.js',import.meta.url),'utf8');
const server=await readFile(new URL('../server-core.mjs',import.meta.url),'utf8');
const app=await readFile(new URL('../optimized/app-01.js',import.meta.url),'utf8');

assert.ok(wrapper.includes("shared-machine-core-v196.js?v=207"),'v207 loader must load the authoritative core');
assert.ok(wrapper.includes("shared-recovery-replay-v207.js?v=207"),'players must load stable recovery replay');
assert.ok(wrapper.includes("shared-roulette-webrtc-client-v197.js?v=207"),'players must retain smooth roulette video');
assert.ok(wrapper.includes("shared-roulette-client-watchdog-v205.js?v=207"),'players must retain stalled-stream recovery');
assert.ok(wrapper.includes("shared-recovery-completion-v206.js?v=207"),'players must retain the result completion fallback');
assert.ok(wrapper.indexOf('shared-recovery-replay-v207.js')<wrapper.indexOf('shared-roulette-webrtc-client-v197.js'),'stable replay must patch state retrieval before client recovery starts');

assert.ok(server.includes('pendingRoundForPlayer'),'unsettled completed rounds must remain recoverable');
assert.ok(server.includes('out.initialState=participant.initialState||null'),'the stable zero-ball state must be returned to the reconnecting player');
assert.ok(server.includes('if(ballIndex===0&&!participant.initialState)participant.initialState=input.state'),'the first stable state must be preserved instead of overwritten by later checkpoints');
assert.ok(server.includes('lookupRound(m,input.roundId)'),'archived completed rounds must remain checkpoint and settlement addressable');

assert.ok(core.includes('client.save({roundId:round.id,ballIndex:0,state})'),'the stable state must be captured before any server ball is delivered');
assert.ok(core.includes('const savedBall=Math.max(0,Math.min(8,Number(participant.checkpointBall)||0))'),'normal recovery must honor the locally supplied checkpoint boundary');
assert.ok(core.includes('for(const ball of balls)if(ball.index>current.delivered)queueBall(ball,true)'),'recovery must redeliver every authoritative ball after that boundary');
assert.ok(core.includes("current.callbacks.onNumber?.(item.number)!==false"),'server balls must advance only after Arcade accepts them');
assert.ok(core.includes("if(!current||current.stopped||!accepted)break;"),'rejected balls must remain queued');

assert.ok(replay.includes("round.phase==='COMPLETE'"),'rewind must be restricted to completed rounds');
assert.ok(replay.includes('round.balls.length>=8'),'rewind must require all eight authoritative balls');
assert.ok(replay.includes('!participant.settlement'),'settled rounds must never be replayed');
assert.ok(replay.includes("participant.initialState&&typeof participant.initialState==='object'"),'rewind must require the stable zero-ball snapshot');
assert.ok(replay.includes('checkpoint:participant.initialState'),'the transient checkpoint must be replaced locally by the stable snapshot');
assert.ok(replay.includes('checkpointBall:0'),'all eight authoritative balls must be redelivered after a page-close recovery');
assert.ok(replay.includes('if(active?.roundId===round.id)return data'),'an attached recovery must not be rewound a second time');
assert.ok(replay.includes('client.getState=patchedGetState'),'state rewriting must occur before the core attaches the pending round');

assert.ok(completion.includes("round.phase!=='COMPLETE'"),'the fallback finalizer must remain limited to completed rounds');
assert.ok(completion.includes('processed<8&&!savedPaid'),'the fallback must not pay an unfinished engine');
assert.ok(completion.includes('app.finishRound()'),'fully recovered games must enter the normal result phase');
assert.ok(app.includes("if(this.draws.length===8){this.dealing=false;this.boostAfterDraws(token);}"),'redelivering the eighth ball must restart the normal end-of-round path');
assert.ok(app.includes("if(ev.phase==='complete'&&!this.paid[i]"),'engine completion must calculate each game result normally');

assert.ok(hostKeepAlive.includes("worker.onmessage=()=>keepAwake({resumeDriver:false,pumpFrame:true})"),'video capture must remain independent of the roulette physics clock');
assert.ok(client.includes('requestVideoFrameCallback'),'smooth remote roulette playback must remain enabled');
assert.ok(watchdog.includes("type:'rtc_fallback_request'"),'a stalled stream must still request relay fallback');

console.log('v207 stable reconnect replay + normal result path static guards passed');

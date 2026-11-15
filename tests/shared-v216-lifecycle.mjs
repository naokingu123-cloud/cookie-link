import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const rawCore=await readFile(new URL('../assets/shared-machine-core-v196.js',import.meta.url),'utf8');
const patchSource=await readFile(new URL('../assets/shared-core-patch-v216.js',import.meta.url),'utf8');
const lifecycleSource=await readFile(new URL('../assets/shared-client-lifecycle-v216.js',import.meta.url),'utf8');
const videoSource=await readFile(new URL('../assets/shared-roulette-webrtc-client-v197.js',import.meta.url),'utf8');
const wrapper=await readFile(new URL('../assets/shared-machine-v176.js',import.meta.url),'utf8');

const patchContext={window:null,console};patchContext.window=patchContext;
vm.runInNewContext(patchSource,patchContext);
const patchedCore=patchContext.SweetsSharedCorePatchV216.patch(rawCore);
new Function(patchedCore);
assert.ok(!patchedCore.includes("scheduleAutoRound();}catch{}"),'client sync must never arm the local auto-round timer');
assert.ok(patchedCore.includes("if(typeof stopAutoRound==='function')stopAutoRound()"),'every shared sync must cancel a pre-existing first-load timer');
assert.ok(!patchedCore.includes("startPermitId!==round.id"),'authoritative participant must not be rejected by a transient permit race');
assert.ok(!patchedCore.includes("const candidate=client.pendingRound||"),'startup must not replay a previous eight-ball history');

assert.ok(wrapper.includes("shared-core-patch-v216.js?v=216"),'v216 core hard guard must load');
assert.ok(wrapper.includes("shared-client-lifecycle-v216.js?v=216"),'stable lifecycle guard must load');
assert.ok(wrapper.indexOf('shared-client-flow-v212.js')<wrapper.indexOf('shared-client-lifecycle-v216.js'),'settlement capture must install before lifecycle enforcement');
assert.ok(wrapper.indexOf('shared-client-lifecycle-v216.js')<wrapper.indexOf('shared-next-bet-join-v215.js'),'initial-state enforcement must install before next-BET start');
assert.ok(!wrapper.includes('shared-roulette-client-watchdog-v205.js'),'old single-video watchdog must not fight the dual-path receiver');

let startCalls=0,resetCalls=0,prepareCalls=0,stopCalls=0,engineResetCalls=0;
let activeRound=null;
class Arcade{
 start(){startCalls++;this.phase='playing';return true;}
 prepare(){prepareCalls++;this.phase='ready';this.draws=[];this.paid=[false];this.roundWins=[0];this.totalWin=0;}
}
const app=new Arcade();
Object.assign(app,{
 phase:'ready',credit:900,displayCredit:900,bets:[100],locked:[100],enabled:[true],draws:[],paid:[false],roundWins:[0],totalWin:0,
 payout:null,result:null,dealing:false,fastForward:false,drawHeld:false,paused:false,
 engines:[{processed:0,accepted:0,busy:false,running:false,presentationRate:1,reset(){engineResetCalls++;this.processed=0;this.accepted=0;this.busy=false;this.running=false;}}],
 onChange(){}
});
let serverRound={id:'round-bet',phase:'BETTING',participant:null,balls:[]};
const client={
 online:true,round:serverRound,
 async settle(payload){assert.equal(payload.roundId,'round-result');assert.equal(payload.totalWin,50);return {settlement:{creditAfter:950,totalWin:50}};},
 async getState(){return {serverTime:Date.now(),round:serverRound,pendingRound:null};},
 accept(message){if(Object.prototype.hasOwnProperty.call(message||{},'round'))this.round=message.round;}
};
const shared={client,get active(){return activeRound;}};
const scheduled=[];
const context={
 window:null,location:{search:''},URLSearchParams,console,Arcade,app,SweetsSharedMachine:shared,
 rouletteDrawSource:{reset(){resetCalls++;activeRound=null;}},
 stopAutoRound(){stopCalls++;},scheduleAutoRound(){throw Error('local schedule must be replaced');},startReadyRound(){return app.start();},autoRoundStamp:123,
 countdownText(){},renderRoundResult(){},scheduleUI(){},
 setTimeout(callback,delay){scheduled.push({callback,delay});return scheduled.length;},clearTimeout(){},addEventListener(){}
};
context.window=context;
vm.runInNewContext(lifecycleSource,context);
assert.ok(context.SweetsSharedLifecycleV216,'v216 lifecycle diagnostics must be exposed');

assert.equal(app.start(),false,'BETTING must not allow a local first-load start');
assert.equal(startCalls,0,'blocked first-load start must not reach the game engine');
assert.ok(stopCalls>0,'a pre-existing local auto timer must be cancelled');

serverRound={id:'round-live',phase:'PLAYING',participant:{playerId:'PLAYER',bets:[100],locked:[100],enabled:[true]},balls:[]};client.round=serverRound;
assert.equal(app.start(),true,'authoritative participating PLAYING round must start normally');
assert.equal(startCalls,1);

app.phase='result';app.credit=900;app.displayCredit=900;app.totalWin=50;app.draws=[1,2,3,4,5,6,7,8];
app.paid=[true];app.roundWins=[50];app.payout={};app.result={};app.engines[0].processed=8;app.engines[0].accepted=8;app.engines[0].busy=true;
activeRound={roundId:'round-result',participant:{playerId:'PLAYER',creditAfterBet:900,settlement:null},settleSent:false};
serverRound={id:'next-bet',phase:'BETTING',participant:null,balls:[]};client.round=serverRound;
assert.equal(await context.SweetsSharedLifecycleV216.forceInitial('test-result'),true);
assert.equal(app.phase,'ready','completed result must always return to the initial READY state');
assert.equal(app.credit,950,'authoritative settlement CREDIT must survive initialization');
assert.equal(app.displayCredit,950);
assert.deepEqual(Array.from(app.draws),[]);
assert.equal(app.totalWin,0);
assert.equal(app.payout,null);assert.equal(app.result,null);
assert.ok(resetCalls>=1,'the same shared reset path as the working immediate reset must run');
assert.ok(prepareCalls>=1,'the game must run its normal prepare path');
assert.ok(engineResetCalls>=1,'stale processed engine state must not leak into the next game');

assert.ok(videoSource.includes('shared-roulette-p2p'),'receiver must keep a dedicated P2P video');
assert.ok(videoSource.includes('shared-roulette-relay'),'receiver must keep a separate warm relay video');
assert.ok(videoSource.includes('Do not stop the relay here'),'relay must not be removed merely because an RTC track object arrived');
assert.ok(videoSource.includes('now-p2pStableSince>3200'),'relay may stop only after sustained decoded P2P progress');
assert.ok(videoSource.includes("setActive('relay')"),'a stalled P2P stream must switch immediately to relay playback');
assert.ok(videoSource.includes("showLocal(true);request(0)"),'complete remote interruption must retain a visible moving fallback while reconnecting');

console.log('v216 local draw block, stable READY reset and seamless roulette failover passed');

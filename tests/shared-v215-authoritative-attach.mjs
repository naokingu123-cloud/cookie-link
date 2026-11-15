import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const rawCore=await readFile(new URL('../assets/shared-machine-core-v196.js',import.meta.url),'utf8');
const patchSource=await readFile(new URL('../assets/shared-core-patch-v215.js',import.meta.url),'utf8');
const wrapper=await readFile(new URL('../assets/shared-machine-v176.js',import.meta.url),'utf8');
const joinSource=await readFile(new URL('../assets/shared-next-bet-join-v215.js',import.meta.url),'utf8');

const patchContext={window:null,console};patchContext.window=patchContext;
vm.runInNewContext(patchSource,patchContext);
const core=patchContext.SweetsSharedCorePatchV215.patch(rawCore);
new Function(core);
assert.ok(!core.includes("startPermitId!==round.id"),'authoritative participant must not be rejected by a transient permit race');
assert.ok(core.includes("client.round?.phase==='PLAYING'&&client.round?.participant?.playerId"),'draw readiness must follow the authoritative participating round');
assert.ok(!core.includes("if(data.pendingRound?.participant&&!data.pendingRound.participant.settlement"),'startup must not replay an old completed round on the client');
assert.ok(!core.includes("const candidate=client.pendingRound||"),'client-ready path must not replay pending eight-ball history');
assert.ok(core.includes('app.locked=[...(round.participant.locked||round.participant.bets'),'server start must restore locked BET state');
assert.ok(core.includes('try{app.start();}'),'authoritative start must call the game directly');
assert.ok(!wrapper.includes('shared-recovery-replay-v207.js'),'normal clients must not load legacy completed-round replay');
assert.ok(!wrapper.includes('shared-recovery-completion-v206.js'),'normal clients must not run client-side result reconstruction');

let state={serverTime:1000,round:{id:'round-2',phase:'BETTING',canBet:true,participant:null,betClosesAt:11000}};
let joinCalls=0,startCalls=0,resetCalls=0,prepareCalls=0;
const listeners=[],scheduled=[];
const client={
 online:true,clockOffset:0,round:state.round,
 async getState(){return structuredClone(state);},
 async join(payload){
  joinCalls++;assert.equal(payload.totalBet,100);assert.deepEqual(payload.bets,[100]);
  state={...state,round:{...state.round,participant:{playerId:'PLAYER',totalBet:100,bets:[100],locked:[100],enabled:[true]}}};
  return {type:'snapshot',...structuredClone(state)};
 },
 accept(message){if(Object.prototype.hasOwnProperty.call(message,'round'))this.round=message.round;},
 on(listener){listeners.push(listener);return()=>{};}
};
const machine={client,get active(){return null;}};
const app={
 phase:'ready',bets:[100],locked:[100],enabled:[true],credit:900,token:2,draws:[],paid:[false],roundWins:[0],totalWin:0,paused:false,onChange(){},
 start(){startCalls++;this.phase='playing';}
};
const context={
 window:null,location:{search:''},URLSearchParams,console,app,
 rouletteDrawSource:{reset(){resetCalls++;}},countdownText(){},SweetsSharedMachine:machine,
 setTimeout(callback,delay){scheduled.push({callback,delay});return scheduled.length;},clearTimeout(){},structuredClone
};
context.window=context;
vm.runInNewContext(joinSource,context);
assert.ok(context.SweetsNextBetJoinV215,'v215 diagnostic control must be exposed');
await context.SweetsNextBetJoinV215.syncNow();
assert.equal(joinCalls,1,'eligible late client must reserve the next BET');
assert.equal(client.round.participant.playerId,'PLAYER');

state={serverTime:12000,round:{...state.round,phase:'PLAYING',canBet:false,drawStartsAt:12000}};client.round=state.round;
await context.SweetsNextBetJoinV215.syncNow();
assert.equal(startCalls,1,'participating PLAYING round must start the game directly');
assert.equal(app.phase,'playing');
assert.deepEqual(app.locked,[100]);

state={serverTime:20000,round:{id:'round-3',phase:'BETTING',canBet:true,participant:null,betClosesAt:30000}};client.round=state.round;
app.phase='complete';app.prepare=function(){prepareCalls++;this.phase='ready';};
await context.SweetsNextBetJoinV215.syncNow();
assert.ok(resetCalls>=1,'stale result state must release the previous shared draw');
assert.ok(prepareCalls>=1,'stale result must return to READY before the next BET');
assert.equal(joinCalls,2);

console.log('v215 authoritative attach, direct next-round start and startup replay removal passed');

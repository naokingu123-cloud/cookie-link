import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source=await readFile(new URL('../assets/shared-next-bet-join-v214.js',import.meta.url),'utf8');
let state={serverTime:1000,round:{id:'round-2',phase:'BETTING',canBet:true,participant:null,betClosesAt:11000}};
let joinCalls=0,resetCalls=0,prepareCalls=0;
const accepted=[],listeners=[],scheduled=[];
const client={
 online:true,clockOffset:0,round:state.round,
 async getState(){return structuredClone(state);},
 async join(payload){
  joinCalls++;
  assert.equal(payload.totalBet,100);
  assert.deepEqual(payload.bets,[100]);
  state={...state,round:{...state.round,participant:{playerId:'PLAYER',totalBet:100,bets:[100],enabled:[true]}}};
  return {type:'snapshot',...structuredClone(state)};
 },
 accept(message){accepted.push(message);if(Object.prototype.hasOwnProperty.call(message,'round'))this.round=message.round;},
 on(listener){listeners.push(listener);return()=>{};}
};
const machine={client,get active(){return null;}};
const context={
 window:null,location:{search:''},URLSearchParams,console,
 app:{phase:'ready',bets:[100],locked:[100],enabled:[true],credit:900,token:2,draws:[],paid:[false],roundWins:[0],totalWin:0,onChange(){}},
 rouletteDrawSource:{reset(){resetCalls++;}},
 countdownText(){},
 SweetsSharedMachine:machine,
 setTimeout(callback,delay){scheduled.push({callback,delay});return scheduled.length;},
 clearTimeout(){},structuredClone
};
context.window=context;
vm.runInNewContext(source,context);
assert.ok(context.SweetsNextBetJoinV214,'diagnostic control must be exposed');

await context.SweetsNextBetJoinV214.syncNow();
assert.equal(joinCalls,1,'eligible late client must reserve its BET during the next BET window');
assert.equal(client.round.participant.playerId,'PLAYER');

state={serverTime:12000,round:{...state.round,phase:'PLAYING',canBet:false,drawStartsAt:12000}};
client.round=state.round;
await context.SweetsNextBetJoinV214.syncNow();
const synthetic=accepted.find(message=>message.type==='round_started');
assert.ok(synthetic,'missed round_started must be re-emitted until the shared core attaches the game');
assert.equal(synthetic.round.id,'round-2');
assert.equal(synthetic.round.participant.playerId,'PLAYER');

// A stale result/complete screen must be returned to READY before the next BET
// is reserved, matching the working immediate-reset behavior.
state={serverTime:20000,round:{id:'round-3',phase:'BETTING',canBet:true,participant:null,betClosesAt:30000}};
client.round=state.round;
context.app.phase='complete';
context.app.prepare=function(){prepareCalls++;this.phase='ready';};
await context.SweetsNextBetJoinV214.syncNow();
assert.ok(resetCalls>=1,'stale shared draw state must be released before joining');
assert.ok(prepareCalls>=1,'stale result state must be prepared for the next BET');
assert.equal(context.app.phase,'ready');
assert.equal(joinCalls,2);

console.log('late client joins the next BET and retries authoritative game start');

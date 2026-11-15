import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const controllerSource=await readFile(new URL('../assets/shared-client-controller-v222.js',import.meta.url),'utf8');
const loader=await readFile(new URL('../assets/shared-machine-v176.js',import.meta.url),'utf8');
const speed=await readFile(new URL('../assets/shared-host-speed-v219.js',import.meta.url),'utf8');
const video=await readFile(new URL('../assets/shared-roulette-client-v219.js',import.meta.url),'utf8');
const hold=await readFile(new URL('../assets/shared-roulette-client-hold-v222.js',import.meta.url),'utf8');

assert.ok(loader.includes('shared-client-controller-v222.js?v=222'),'one v222 controller stack must own start/reset/reconnect');
assert.ok(loader.includes('shared-core-patch-v222.js?v=222'),'v222 catch-up patch must load');
assert.ok(!loader.includes('shared-client-controller-v219.js?v=222'),'retired v219 controller must not race v222');
assert.ok(controllerSource.includes('target.prepare?.()'),'controller must construct a fresh board through prepare');
assert.ok(!controllerSource.includes('for(const engine of target.engines||[])clearEngine(engine)'),'prepared engine model must never be erased');
assert.ok(controllerSource.includes("serverOwnsRound"),'only an authoritative participant round may start');
assert.ok(controllerSource.includes("SERVER再接続中・現在ゲームを保持"),'transient reconnect must preserve the active game');
assert.ok(speed.includes('rouletteTimeScale=2'),'physical simulation must receive 2x time scale');
assert.ok(!speed.includes('performance.now='),'2x must not alter browser/WebRTC clocks');
assert.ok(!speed.includes('Date.now='),'2x must not alter server timing clocks');
assert.ok(video.includes('Round'),'roulette receiver must document round continuity');
assert.ok(video.includes('boundaries must not blank'),'roulette must stay visible across RESULT and BET');
assert.ok(!video.includes("'ball_result'"),'each ball must not renegotiate the video path');
assert.ok(video.includes("activate('relay')"),'warm relay must replace a stalled P2P stream');
assert.ok(hold.includes('last-good remote frame continuity'),'last decoded frame must remain visible while reconnecting');

const events=[];
let activeRound=null,settleCount=0,drawResetCount=0,prepareCount=0,startCount=0;
class Engine{
 constructor(index){this.kind=index===0?'game0':'game-'+index;this.processed=0;this.accepted=0;this.busy=false;this.running=false;this.queue=[];this.boardVersion=0;this.mainPayout=0;}
 reset(){this.processed=0;this.accepted=0;this.busy=false;this.running=false;this.queue.length=0;events.push('engine-reset');}
}
class Arcade{
 start(){startCount++;this.phase='playing';return true;}
 prepare(){
  prepareCount++;this.phase='ready';this.draws=[];this.payout=null;this.result=null;
  for(const engine of this.engines){engine.processed=0;engine.accepted=0;engine.busy=false;engine.running=false;engine.queue.length=0;engine.boardVersion++;engine.mainPayout=1000+engine.boardVersion;}
  events.push('prepare-'+prepareCount);
 }
}
const app=new Arcade();
Object.assign(app,{token:1,phase:'ready',credit:900,displayCredit:900,bets:[100,100],locked:[100,100],enabled:[true,true],draws:[],payout:null,result:null,dealing:false,fastForward:false,drawHeld:false,paused:false,totalWin:0,paid:[false,false],roundWins:[0,0],engines:[new Engine(0),new Engine(1)],onChange(){events.push('change');}});
const slots=app.engines.map(()=>({dirtyMain:false,dirtyMini:false,lastState:{stale:true},lastMainState:{},lastMiniState:{},particles:{replaceChildren(){}},displayedPayout:0}));
const resultLayer={hidden:true,classList:{remove(){}}};
let serverRound={id:'server-round-0',phase:'BETTING',canBet:true,betClosesAt:Date.now()+10000,participant:null,balls:[]};
const client={
 online:true,ws:{readyState:1},clockOffset:0,round:serverRound,
 async getState(){return {serverTime:Date.now(),round:serverRound,pendingRound:null,payoutControlV3:{wallet:{}}};},
 accept(state){if(Object.prototype.hasOwnProperty.call(state||{},'round'))this.round=state.round;},
 async settle(payload){settleCount++;return {settlement:{creditAfter:Number(payload.creditAfter),totalWin:Number(payload.totalWin)}};},
 on(){},
};
const context={
 window:null,globalThis:null,location:{search:''},URLSearchParams,console,WebSocket:{OPEN:1},Arcade,app,slots,
 SweetsSharedMachine:{client,get active(){return activeRound;},syncRound(){return false;}},
 rouletteDrawSource:{reset(){drawResetCount++;activeRound=null;}},
 stopAutoRound(){},stopResultAuto(){},autoRoundStamp:null,resultAutoToken:0,roundStarting:false,countdownText(){},
 document:{getElementById(id){return id==='round-result-layer'?resultLayer:null;},querySelectorAll(){return[];}},
 getComputedStyle(node){return {display:node.hidden?'none':'block',visibility:node.hidden?'hidden':'visible'};},
 scheduleUI(){for(let i=0;i<slots.length;i++)slots[i].displayedPayout=app.engines[i].mainPayout;},
 renderRoundResult(){},renderGameTabs(){},requestFit(){},requestAnimationFrame(callback){callback();return 1;},
 setTimeout(callback,delay){
  if(['poll','monitor','boot'].includes(callback?.name)||delay===0)return 1;
  queueMicrotask(callback);return 1;
 },clearTimeout(){},addEventListener(){},
};
context.window=context;context.globalThis=context;
vm.runInNewContext(controllerSource,context);
assert.ok(context.SweetsSharedControllerV222,'v222 controller diagnostics must be exposed');
assert.equal(app.start(),false,'BET state must never start a local draw');
assert.equal(startCount,0);

for(let roundIndex=1;roundIndex<=3;roundIndex++){
 const beforeBoards=app.engines.map(engine=>engine.boardVersion);
 app.phase='complete';app.credit=900+(roundIndex-1)*50;app.displayCredit=app.credit;app.totalWin=50;
 app.draws=[1,2,3,4,5,6,7,8];app.payout={old:true};app.result={old:true};app.paid=[true,true];app.roundWins=[20,30];
 for(const engine of app.engines){engine.processed=8;engine.accepted=8;engine.busy=true;engine.running=true;engine.mainPayout=777;}
 resultLayer.hidden=false;
 activeRound={roundId:'played-'+roundIndex,participant:{playerId:'PLAYER',creditAfterBet:app.credit}};
 serverRound={id:'bet-'+roundIndex,phase:'BETTING',canBet:true,betClosesAt:Date.now()+10000,participant:null,balls:[]};client.round=serverRound;
 const reset=await context.SweetsSharedControllerV222.forceInitial('round-'+roundIndex);
 assert.equal(reset,true,'round '+roundIndex+' must reach a pristine initial state');
 assert.equal(app.phase,'ready');assert.deepEqual(Array.from(app.draws),[]);assert.equal(app.payout,null);assert.equal(app.result,null);assert.equal(app.totalWin,0);
 assert.equal(resultLayer.hidden,true);assert.equal(activeRound,null);assert.equal(app.engines[0].kind,'cookie');
 for(let i=0;i<app.engines.length;i++){
  assert.ok(app.engines[i].boardVersion>beforeBoards[i],'round '+roundIndex+' must generate a new board');
  assert.ok(app.engines[i].mainPayout>=1001,'final prepared payout must survive reset');
  assert.equal(slots[i].displayedPayout,app.engines[i].mainPayout,'main-tab payout must redraw from the new board');
  assert.equal(slots[i].dirtyMain,true);assert.equal(slots[i].lastState,null);
 }
}
assert.equal(settleCount,3,'each completed round must settle exactly once');
assert.equal(drawResetCount,3,'each completed round must release the shared draw exactly once');
assert.ok(prepareCount>=3,'three consecutive rounds must each construct a new board');
console.log('v222 three-round fresh-board reset, reconnect preservation, isolated 2x and continuous video guards passed');

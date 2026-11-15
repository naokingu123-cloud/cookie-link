import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source=await readFile(new URL('../assets/shared-client-controller-v219.js',import.meta.url),'utf8');
let now=100000,activeRound=null,serverRound=null,joinCount=0,startCount=0,settleCount=0,prepareCount=0;
class FakeDate extends Date{static now(){return now;}}
class Engine{
 constructor(){this.processed=0;this.accepted=0;this.busy=false;this.running=false;this.queue=[];this.boardVersion=0;}
 reset(){this.processed=0;this.accepted=0;this.busy=false;this.running=false;this.queue.length=0;}
}
class Arcade{
 start(){startCount++;this.phase='playing';activeRound={roundId:serverRound.id,participant:serverRound.participant};return true;}
 prepare(){prepareCount++;this.phase='ready';this.draws=[];this.payout=null;this.result=null;for(const engine of this.engines){engine.reset();engine.boardVersion++;engine.mainPayout=100+engine.boardVersion;}}
}
const app=new Arcade();
Object.assign(app,{token:1,phase:'ready',credit:1000,displayCredit:1000,bets:[10],locked:[10],enabled:[true],draws:[],payout:null,result:null,dealing:false,fastForward:false,drawHeld:false,paused:false,totalWin:0,paid:[false],roundWins:[0],engines:[new Engine()],onChange(){}});
const resultLayer={hidden:true,classList:{remove(){}}};
serverRound={id:'observed-first',phase:'BETTING',canBet:true,betClosesAt:now+10000,participant:null,balls:[]};
const client={
 online:true,ws:{readyState:1},clockOffset:0,round:serverRound,
 async getState(){return {serverTime:now,round:serverRound,pendingRound:null};},
 accept(value){if(Object.prototype.hasOwnProperty.call(value||{},'round'))this.round=value.round;},
 async join(payload){
  joinCount++;assert.equal(payload.roundId,serverRound.id);assert.equal(payload.totalBet,10);
  const participant={playerId:'PLAYER',bets:[10],locked:[10],enabled:[true],totalBet:10,creditAfterBet:app.credit-10};
  serverRound={...serverRound,participant};this.round=serverRound;return {serverTime:now,round:serverRound};
 },
 async settle(payload){settleCount++;return {settlement:{totalWin:payload.totalWin,creditAfter:payload.creditAfter}};},
 on(){},
};
const context={
 window:null,globalThis:null,location:{search:''},URLSearchParams,console,Date:FakeDate,WebSocket:{OPEN:1},Arcade,app,
 SweetsSharedMachine:{client,get active(){return activeRound;}},
 rouletteDrawSource:{reset(){activeRound=null;}},stopAutoRound(){},stopResultAuto(){},autoRoundStamp:null,resultAutoToken:0,roundStarting:false,countdownText(){},
 document:{getElementById(id){return id==='round-result-layer'?resultLayer:null;},querySelectorAll(){return[];}},
 getComputedStyle(node){return {display:node.hidden?'none':'block',visibility:node.hidden?'hidden':'visible'};},
 scheduleUI(){},renderRoundResult(){},requestAnimationFrame(callback){callback();return 1;},
 setTimeout(callback,delay){
  if(callback?.name==='poll'||callback?.name==='monitorResults'||callback?.name==='boot'||delay===0)return 1;
  queueMicrotask(callback);return 1;
 },clearTimeout(){},addEventListener(){},
};
context.window=context;context.globalThis=context;
vm.runInNewContext(source,context);
await new Promise(resolve=>setImmediate(resolve));
const controller=context.SweetsSharedControllerV219;
assert.ok(controller);

// Two fresh snapshots make the transport stable, but the first observed round
// remains observation-only and cannot take a BET.
now+=800;await controller.refreshNow();
assert.equal(joinCount,0);assert.equal(startCount,0);
assert.equal(controller.describe().blockedRoundId,'observed-first');

for(let cycle=1;cycle<=3;cycle++){
 serverRound={id:'round-'+cycle,phase:'BETTING',canBet:true,betOpenedAt:now,betClosesAt:now+10000,participant:null,balls:[]};client.round=serverRound;
 now+=200;await controller.refreshNow();
 assert.equal(joinCount,cycle,'cycle '+cycle+' must reserve the authoritative BET');
 assert.equal(client.round.participant.playerId,'PLAYER');
 serverRound={...serverRound,phase:'PLAYING',canBet:false,drawStartsAt:now,participant:client.round.participant};client.round=serverRound;
 now+=100;await controller.refreshNow();
 assert.equal(startCount,cycle,'cycle '+cycle+' must start after its successful join');
 assert.equal(app.phase,'playing');assert.equal(activeRound.roundId,'round-'+cycle);

 app.phase='complete';app.totalWin=5;app.draws=[1,2,3,4,5,6,7,8];app.payout={};app.result={};app.paid=[true];app.roundWins=[5];
 app.engines[0].processed=8;app.engines[0].accepted=8;app.engines[0].busy=true;resultLayer.hidden=false;
 serverRound={id:'between-'+cycle,phase:'COMPLETE',canBet:false,participant:null,balls:[1,2,3,4,5,6,7,8]};client.round=serverRound;
 now+=200;assert.equal(await controller.forceInitial('cycle-'+cycle),true);
 assert.equal(app.phase,'ready');assert.equal(activeRound,null);assert.deepEqual(Array.from(app.draws),[]);assert.equal(app.totalWin,0);
 assert.ok(app.engines[0].boardVersion>=cycle,'cycle '+cycle+' must prepare a fresh board');
}
assert.equal(joinCount,3);assert.equal(startCount,3);assert.equal(settleCount,3);assert.ok(prepareCount>=3);
console.log('v219 first-round observation plus three live join/start/result/fresh-board cycles passed');

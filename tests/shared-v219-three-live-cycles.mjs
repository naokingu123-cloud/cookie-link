import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source=await readFile(new URL('../assets/shared-client-controller-v222.js',import.meta.url),'utf8');
let activeRound=null,serverRound=null,startCount=0,settleCount=0,prepareCount=0;
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
serverRound={id:'wait',phase:'BETTING',participant:null,balls:[]};
const client={
 online:true,ws:{readyState:1},round:serverRound,
 async getState(){return {round:serverRound,pendingRound:null,payoutControlV3:{wallet:{}}};},
 accept(value){if(Object.prototype.hasOwnProperty.call(value||{},'round'))this.round=value.round;},
 async settle(payload){settleCount++;return {settlement:{totalWin:payload.totalWin,creditAfter:payload.creditAfter}};},
 on(){},
};
const synced=[];
const context={
 window:null,globalThis:null,location:{search:''},URLSearchParams,console,WebSocket:{OPEN:1},Arcade,app,
 SweetsSharedMachine:{client,get active(){return activeRound;},syncRound(round){if(round)synced.push(round.id);return true;}},
 rouletteDrawSource:{reset(){activeRound=null;}},stopAutoRound(){},stopResultAuto(){},autoRoundStamp:null,resultAutoToken:0,roundStarting:false,countdownText(){},slots:[],
 document:{getElementById(id){return id==='round-result-layer'?resultLayer:null;},querySelectorAll(){return[];}},
 getComputedStyle(node){return {display:node.hidden?'none':'block',visibility:node.hidden?'hidden':'visible'};},
 scheduleUI(){},renderRoundResult(){},requestAnimationFrame(callback){callback();return 1;},
 setTimeout(callback,delay){if(['poll','monitor','boot'].includes(callback?.name)||delay===0)return 1;queueMicrotask(callback);return 1;},clearTimeout(){},addEventListener(){},
};
context.window=context;context.globalThis=context;
vm.runInNewContext(source,context);
await new Promise(resolve=>setImmediate(resolve));
const controller=context.SweetsSharedControllerV222;assert.ok(controller);
assert.equal(app.start(),false,'BET/wait state must not start a local game');

for(let cycle=1;cycle<=3;cycle++){
 const participant={playerId:'PLAYER',bets:[10],locked:[10],enabled:[true],creditAfterBet:app.credit-10};
 serverRound={id:'round-'+cycle,phase:'PLAYING',participant,balls:[]};client.round=serverRound;
 await controller.refreshNow();
 assert.equal(startCount,cycle,'cycle '+cycle+' must start from authoritative PLAYING state');
 assert.equal(app.phase,'playing');assert.equal(activeRound.roundId,'round-'+cycle);

 if(cycle===2){
  client.online=false;client.ws={readyState:3};await controller.refreshNow();
  assert.equal(app.phase,'playing','transient disconnect must not reset cycle 2');
  client.online=true;client.ws={readyState:1};serverRound={...serverRound,balls:[{index:1,number:3},{index:2,number:7}]};client.round=serverRound;await controller.refreshNow();
  assert.ok(synced.includes('round-2'),'cycle 2 must reconcile after reconnect');
 }

 app.phase='complete';app.totalWin=5;app.draws=[1,2,3,4,5,6,7,8];app.payout={};app.result={};app.paid=[true];app.roundWins=[5];app.engines[0].processed=8;app.engines[0].accepted=8;app.engines[0].busy=true;resultLayer.hidden=false;
 serverRound={id:'between-'+cycle,phase:'COMPLETE',participant:null,balls:[1,2,3,4,5,6,7,8]};client.round=serverRound;
 assert.equal(await controller.forceInitial('cycle-'+cycle),true);
 assert.equal(app.phase,'ready');assert.equal(activeRound,null);assert.deepEqual(Array.from(app.draws),[]);assert.equal(app.totalWin,0);assert.ok(app.engines[0].boardVersion>=cycle);
}
assert.equal(startCount,3);assert.equal(settleCount,3);assert.ok(prepareCount>=3);
console.log('v222 three live start/reconnect/result/fresh-board cycles passed');

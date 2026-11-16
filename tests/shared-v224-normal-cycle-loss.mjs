import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const controllerSource=await readFile(new URL('../assets/shared-client-controller-v224.js',import.meta.url),'utf8');
const loader=await readFile(new URL('../assets/shared-machine-v176.js',import.meta.url),'utf8');
const release=JSON.parse(await readFile(new URL('../app-version.json',import.meta.url),'utf8')).version.match(/-v(\d+)-/)[1];
const patch=await readFile(new URL('../assets/shared-core-patch-v224.js',import.meta.url),'utf8');
assert.ok(loader.includes('shared-client-controller-v224.js?v='+release));
assert.ok(loader.includes('shared-roulette-client-v224.js?v='+release));
assert.ok(!loader.includes('shared-client-controller-v222.js'));
assert.ok(!loader.includes('shared-core-patch-v222.js'));
assert.ok(!loader.includes('shared-roulette-client-hold-v222.js'));
assert.ok(patch.includes('One owner only'));
assert.ok(patch.includes('disable first-hit JPEG freeze overlay'));

let now=100000,activeRound=null,serverRound=null,joinCount=0,startCount=0,settleCount=0,prepareCount=0;
const settlePayloads=[];
class FakeDate extends Date{static now(){return now;}}
class Engine{
 constructor(index){this.kind=index===0?'game0':'game-'+index;this.processed=0;this.accepted=0;this.busy=false;this.running=false;this.queue=[];this.boardVersion=0;this.mainPayout=0;}
 reset(){this.processed=0;this.accepted=0;this.busy=false;this.running=false;this.queue.length=0;}
}
class Arcade{
 start(){startCount++;this.phase='playing';activeRound={roundId:serverRound.id,participant:serverRound.participant};return true;}
 prepare(){prepareCount++;this.phase='ready';this.draws=[];this.payout=null;this.result=null;for(const engine of this.engines){engine.reset();engine.boardVersion++;engine.mainPayout=1000+engine.boardVersion;}}
}
const app=new Arcade();
Object.assign(app,{token:1,phase:'ready',credit:1000,displayCredit:1000,bets:[10,10],locked:[10,10],enabled:[true,true],draws:[],payout:null,result:null,dealing:false,fastForward:false,drawHeld:false,paused:false,totalWin:0,paid:[false,false],roundWins:[0,0],engines:[new Engine(0),new Engine(1)],onChange(){}});
const slots=app.engines.map(()=>({dirtyMain:false,dirtyMini:false,lastState:{},lastMainState:{},lastMiniState:{},particles:{replaceChildren(){}}}));
const resultLayer={hidden:true,classList:{remove(){}}};
let listeners=[];
const client={
 online:true,ws:{readyState:1},clockOffset:0,round:null,
 async getState(){return {serverTime:now,round:serverRound,pendingRound:null};},
 accept(value){if(Object.prototype.hasOwnProperty.call(value||{},'round')){this.round=value.round;serverRound=value.round;}},
 async join(payload){
  joinCount++;assert.equal(payload.totalBet,20);assert.equal(payload.creditAfterBet,app.credit);assert.equal(payload.creditAfterBet,payload.creditBefore-20);
  const participant={playerId:'PLAYER',bets:[10,10],locked:[10,10],enabled:[true,true],totalBet:20,creditAfterBet:payload.creditAfterBet};
  serverRound={...serverRound,participant};this.round=serverRound;return {serverTime:now,round:serverRound};
 },
 async settle(payload){settleCount++;settlePayloads.push({...payload});return {settlement:{totalWin:payload.totalWin,creditAfter:payload.creditAfter}};},
 on(listener){listeners.push(listener);return()=>{};}
};
const storage=new Map();
const context={
 window:null,globalThis:null,location:{search:''},URLSearchParams,console,Date:FakeDate,WebSocket:{OPEN:1},Arcade,app,slots,
 SweetsSharedMachine:{client,get active(){return activeRound;}},SweetsRouletteClientV224:{isFresh:()=>true},
 rouletteDrawSource:{reset(){activeRound=null;}},stopAutoRound(){},stopResultAuto(){},autoRoundStamp:null,resultAutoToken:0,roundStarting:false,countdownText(){},
 localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)},
 document:{body:{classList:{add(){},remove(){}}},getElementById(id){return id==='round-result-layer'?resultLayer:null;},querySelectorAll(){return[];},querySelector(){return null;}},
 getComputedStyle(node){return {display:node.hidden?'none':'block',visibility:node.hidden?'hidden':'visible'};},
 scheduleUI(){},renderRoundResult(){},renderGameTabs(){},requestFit(){},requestAnimationFrame(callback){callback();return 1;},
 setTimeout(callback,delay){if(['poll','monitorResults','boot'].includes(callback?.name)||delay===0)return 1;queueMicrotask(callback);return 1;},clearTimeout(){},addEventListener(){},
};
context.window=context;context.globalThis=context;
vm.runInNewContext(controllerSource,context,{filename:'shared-client-controller-v224.js'});
await new Promise(resolve=>setImmediate(resolve));
const control=context.SweetsSharedControllerV224;assert.ok(control);

for(let index=0;index<4;index++){now+=1100;await control.refreshNow();}
assert.equal(control.stable(),true);assert.equal(startCount,0);assert.equal(joinCount,0);

for(let cycle=1;cycle<=3;cycle++){
 const beforeBoards=app.engines.map(engine=>engine.boardVersion);
 serverRound={id:'round-'+cycle,phase:'BETTING',canBet:true,betClosesAt:now+10000,participant:null,balls:[]};client.round=serverRound;
 await control.refreshNow();assert.equal(joinCount,cycle,'cycle '+cycle+' must join once');
 serverRound={...serverRound,phase:'PLAYING',canBet:false,drawStartsAt:now+1000};client.round=serverRound;
 await control.refreshNow();assert.equal(startCount,cycle,'cycle '+cycle+' must start once');assert.equal(activeRound.roundId,'round-'+cycle);
 app.phase='complete';app.totalWin=5;app.draws=[1,2,3,4,5,6,7,8];app.payout={};app.result={};app.roundWins=[2,3];resultLayer.hidden=false;
 serverRound={...serverRound,phase:'COMPLETE',balls:[1,2,3,4,5,6,7,8].map((number,index)=>({index:index+1,number}))};client.round=serverRound;
 assert.equal(await control.finishNormal('cycle-'+cycle),true);assert.equal(app.phase,'ready');assert.equal(activeRound,null);assert.equal(resultLayer.hidden,true);
 for(let index=0;index<app.engines.length;index++)assert.ok(app.engines[index].boardVersion>beforeBoards[index],'cycle '+cycle+' must prepare a fresh board');
 now+=500;
}
assert.equal(settlePayloads.filter(item=>item.totalWin===5).length,3);

serverRound={id:'loss-round',phase:'BETTING',canBet:true,betClosesAt:now+10000,participant:null,balls:[]};client.round=serverRound;
await control.refreshNow();assert.equal(joinCount,4);
serverRound={...serverRound,phase:'PLAYING',canBet:false,drawStartsAt:now+1000};client.round=serverRound;
await control.refreshNow();assert.equal(startCount,4);const lossCredit=serverRound.participant.creditAfterBet;
client.online=false;client.ws={readyState:3};
assert.equal(await control.abandonRound('test-disconnect'),true);assert.equal(app.phase,'ready');assert.equal(activeRound,null);assert.equal(app.credit,lossCredit);
client.online=true;client.ws={readyState:1};serverRound={id:'after-loss-observe',phase:'PLAYING',canBet:false,participant:null,balls:[]};client.round=serverRound;now+=100;
await control.refreshNow();
assert.ok(settlePayloads.some(item=>item.roundId==='loss-round'&&item.totalWin===0&&item.creditAfter===lossCredit),'disconnect must settle zero WIN at post-BET credit');
assert.ok(!settlePayloads.some(item=>item.roundId==='loss-round'&&item.totalWin>0));
console.log('v224 three normal cycles + disconnect-as-loss + no legacy replay passed');


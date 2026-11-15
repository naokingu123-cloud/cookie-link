import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const basePatch=await readFile(new URL('../assets/shared-core-patch-v221.js',import.meta.url),'utf8');
const reconnectPatch=await readFile(new URL('../assets/shared-core-patch-v222.js',import.meta.url),'utf8');
const core=await readFile(new URL('../assets/shared-machine-core-v196.js',import.meta.url),'utf8');
const controller=await readFile(new URL('../assets/shared-client-controller-v222.js',import.meta.url),'utf8');
const loader=await readFile(new URL('../assets/shared-machine-v176.js',import.meta.url),'utf8');
const hold=await readFile(new URL('../assets/shared-roulette-client-hold-v222.js',import.meta.url),'utf8');

const patchContext={window:{},console};
vm.runInNewContext(basePatch,patchContext);
vm.runInNewContext(reconnectPatch,patchContext);
const patched=patchContext.window.SweetsSharedCorePatchV222.patch(core);
new vm.Script(patched,{filename:'shared-machine-core-v196-v223-patched.js'});
assert.ok(patched.includes('function syncAuthoritativeRound(round)'),'core must reconcile authoritative ball history');
assert.ok(patched.includes('syncRound:syncAuthoritativeRound'),'controller must be able to request catch-up');
assert.ok(patched.includes("if(message.type==='visual_frame'){hideRouletteMirror();return;}"),'legacy first-HIT JPEG mirror must be disabled');
assert.ok(loader.includes('shared-client-controller-v222.js?v=223'));
assert.ok(loader.includes('shared-roulette-client-hold-v222.js?v=223'));
assert.ok(!loader.includes('shared-client-controller-v219.js?v=223'));
assert.ok(controller.includes('creditOverride!==null&&creditOverride!==undefined'),'normal result must not mistake null for a zero-credit override');
assert.ok(hold.includes('last-good remote frame continuity'));

let activeRound=null,startCount=0,prepareCount=0,settleCount=0;
const synced=[];
class Engine{constructor(){this.processed=0;this.accepted=0;this.busy=false;this.running=false;this.queue=[];this.boardVersion=0;}reset(){this.processed=0;this.accepted=0;this.busy=false;this.running=false;this.queue.length=0;}}
class Arcade{
 start(){startCount++;this.phase='playing';activeRound={roundId:serverRound.id,participant:serverRound.participant};return true;}
 prepare(){prepareCount++;this.phase='ready';this.draws=[];this.payout=null;this.result=null;for(const engine of this.engines){engine.reset();engine.boardVersion++;}}
}
const app=new Arcade();Object.assign(app,{phase:'ready',token:1,credit:900,displayCredit:900,bets:[100],locked:[100],enabled:[true],draws:[],payout:null,result:null,dealing:false,fastForward:false,drawHeld:false,paused:false,totalWin:0,paid:[false],roundWins:[0],engines:[new Engine()],onChange(){}});
let serverRound={id:'round-reconnect',phase:'PLAYING',participant:{playerId:'PLAYER',bets:[100],locked:[100],enabled:[true],creditAfterBet:900},balls:[]};
const client={online:true,ws:{readyState:1},round:serverRound,async getState(){return {round:serverRound,pendingRound:null,payoutControlV3:{wallet:{}}};},accept(state){if(Object.prototype.hasOwnProperty.call(state||{},'round'))this.round=state.round;},async settle(payload){settleCount++;return {settlement:{creditAfter:payload.creditAfter}};},on(){}};
const resultLayer={hidden:true,classList:{remove(){}}};
const context={window:null,globalThis:null,location:{search:''},URLSearchParams,console,WebSocket:{OPEN:1},Arcade,app,
 SweetsSharedMachine:{client,get active(){return activeRound;},syncRound(round){if(round)synced.push({id:round.id,count:round.balls?.length||0,phase:round.phase});return true;}},
 rouletteDrawSource:{reset(){activeRound=null;}},stopAutoRound(){},stopResultAuto(){},autoRoundStamp:null,resultAutoToken:0,roundStarting:false,countdownText(){},slots:[],
 document:{body:{classList:{add(){},remove(){}}},head:{append(){}},getElementById(id){return id==='round-result-layer'?resultLayer:null;},querySelectorAll(){return[];}},
 getComputedStyle(node){return {display:node.hidden?'none':'block',visibility:node.hidden?'hidden':'visible'};},scheduleUI(){},renderRoundResult(){},requestAnimationFrame(fn){fn();return 1;},
 setTimeout(fn,delay){if(['poll','monitor','boot'].includes(fn?.name)||delay===0)return 1;queueMicrotask(fn);return 1;},clearTimeout(){},addEventListener(){},
};context.window=context;context.globalThis=context;
vm.runInNewContext(controller,context,{filename:'shared-client-controller-v222.js'});
await new Promise(resolve=>setImmediate(resolve));
const control=context.SweetsSharedControllerV222;assert.ok(control);
await control.refreshNow();assert.equal(startCount,1,'authoritative participant must start exactly once');assert.equal(app.phase,'playing');assert.equal(activeRound.roundId,'round-reconnect');
client.online=false;client.ws={readyState:3};await control.refreshNow();assert.equal(app.phase,'playing');assert.equal(prepareCount,0);
client.online=true;client.ws={readyState:1};serverRound={...serverRound,balls:[{index:1,number:4},{index:2,number:9},{index:3,number:15}]};client.round=serverRound;
await control.refreshNow();assert.equal(app.phase,'playing');assert.equal(prepareCount,0);assert.ok(synced.some(item=>item.id==='round-reconnect'&&item.count===3),'missed balls must be reconciled after reconnect');
serverRound={...serverRound,phase:'COMPLETE',balls:[1,2,3,4,5,6,7,8].map((number,index)=>({index:index+1,number}))};client.round=serverRound;
await control.refreshNow();assert.ok(synced.some(item=>item.phase==='COMPLETE'&&item.count===8));
app.phase='complete';app.draws=[1,2,3,4,5,6,7,8];app.totalWin=50;app.payout={};app.result={};resultLayer.hidden=false;
assert.equal(await control.forceInitial('test-result'),true);assert.equal(settleCount,1);assert.equal(app.phase,'ready');assert.equal(activeRound,null);assert.deepEqual(Array.from(app.draws),[]);assert.ok(prepareCount>=1);
console.log('v222 reconnect keeps PLAY alive, catches missed balls, disables static mirror and resets after result');

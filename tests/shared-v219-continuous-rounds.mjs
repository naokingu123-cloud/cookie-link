import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source=await readFile(new URL('../assets/shared-client-controller-v222.js',import.meta.url),'utf8');
const loader=await readFile(new URL('../assets/shared-machine-v176.js',import.meta.url),'utf8');
const speed=await readFile(new URL('../assets/shared-host-speed-v219.js',import.meta.url),'utf8');
const video=await readFile(new URL('../assets/shared-roulette-client-v219.js',import.meta.url),'utf8');
const hold=await readFile(new URL('../assets/shared-roulette-client-hold-v222.js',import.meta.url),'utf8');
assert.ok(loader.includes('shared-client-controller-v222.js?v=223'));
assert.ok(loader.includes('shared-core-patch-v222.js?v=223'));
assert.ok(!loader.includes('shared-client-controller-v219.js?v=223'));
assert.ok(source.includes('target.prepare?.()'));
assert.ok(source.includes('SERVER再接続中・現在ゲームを保持'));
assert.ok(source.includes('creditOverride!==null&&creditOverride!==undefined'));
assert.ok(speed.includes('rouletteTimeScale=2'));
assert.ok(!speed.includes('performance.now=')&&!speed.includes('Date.now='));
assert.ok(video.includes('boundaries must not blank'));
assert.ok(hold.includes('last-good remote frame continuity'));

let activeRound=null,prepareCount=0,drawResetCount=0;
class Engine{constructor(index){this.kind=index===0?'game0':'game-'+index;this.processed=0;this.accepted=0;this.busy=false;this.running=false;this.queue=[];this.boardVersion=0;this.mainPayout=0;}reset(){this.processed=0;this.accepted=0;this.busy=false;this.running=false;this.queue.length=0;}}
class Arcade{start(){this.phase='playing';return true;}prepare(){prepareCount++;this.phase='ready';this.draws=[];this.payout=null;this.result=null;for(const engine of this.engines){engine.reset();engine.boardVersion++;engine.mainPayout=1000+engine.boardVersion;}}}
const app=new Arcade();Object.assign(app,{token:1,phase:'ready',credit:900,displayCredit:900,bets:[100,100],locked:[100,100],enabled:[true,true],draws:[],payout:null,result:null,dealing:false,fastForward:false,drawHeld:false,paused:false,totalWin:0,paid:[false,false],roundWins:[0,0],engines:[new Engine(0),new Engine(1)],onChange(){}});
const slots=app.engines.map(()=>({dirtyMain:false,dirtyMini:false,lastState:{old:true},lastMainState:{},lastMiniState:{},particles:{replaceChildren(){}},displayedPayout:0}));
const resultLayer={hidden:true,classList:{remove(){}}};
let serverRound={id:'wait',phase:'BETTING',participant:null,balls:[]};
const client={online:true,ws:{readyState:1},round:serverRound,async getState(){return {round:serverRound,pendingRound:null,payoutControlV3:{wallet:{}}};},accept(v){if(Object.prototype.hasOwnProperty.call(v||{},'round'))this.round=v.round;},async settle(payload){return {settlement:{creditAfter:payload.creditAfter}};},on(){}};
const context={window:null,globalThis:null,location:{search:''},URLSearchParams,console,WebSocket:{OPEN:1},Arcade,app,slots,SweetsSharedMachine:{client,get active(){return activeRound;},syncRound(){return false;}},rouletteDrawSource:{reset(){drawResetCount++;activeRound=null;}},stopAutoRound(){},stopResultAuto(){},autoRoundStamp:null,resultAutoToken:0,roundStarting:false,countdownText(){},document:{getElementById(id){return id==='round-result-layer'?resultLayer:null;},querySelectorAll(){return[];}},getComputedStyle(node){return {display:node.hidden?'none':'block',visibility:node.hidden?'hidden':'visible'};},scheduleUI(){for(let i=0;i<slots.length;i++)slots[i].displayedPayout=app.engines[i].mainPayout;},renderRoundResult(){},renderGameTabs(){},requestFit(){},requestAnimationFrame(fn){fn();return 1;},setTimeout(fn,delay){if(['poll','monitor','boot'].includes(fn?.name)||delay===0)return 1;queueMicrotask(fn);return 1;},clearTimeout(){},addEventListener(){}};
context.window=context;context.globalThis=context;vm.runInNewContext(source,context);
const controller=context.SweetsSharedControllerV222;assert.ok(controller);assert.equal(app.start(),false);
for(let roundIndex=1;roundIndex<=3;roundIndex++){
 const before=app.engines.map(engine=>engine.boardVersion);app.phase='complete';app.credit=900;app.displayCredit=900;app.totalWin=50;app.draws=[1,2,3,4,5,6,7,8];app.payout={};app.result={};app.paid=[true,true];app.roundWins=[20,30];for(const engine of app.engines){engine.processed=8;engine.accepted=8;engine.busy=true;engine.running=true;engine.mainPayout=777;}resultLayer.hidden=false;activeRound={roundId:'played-'+roundIndex,participant:{playerId:'PLAYER',creditAfterBet:900}};serverRound={id:'wait-'+roundIndex,phase:'BETTING',participant:null,balls:[]};client.round=serverRound;
 assert.equal(await controller.forceInitial('round-'+roundIndex),true);assert.equal(app.phase,'ready');assert.equal(activeRound,null);assert.deepEqual(Array.from(app.draws),[]);assert.equal(resultLayer.hidden,true);assert.equal(app.engines[0].kind,'cookie');
 for(let i=0;i<app.engines.length;i++){assert.ok(app.engines[i].boardVersion>before[i]);assert.ok(app.engines[i].mainPayout>=1001);assert.equal(slots[i].displayedPayout,app.engines[i].mainPayout);assert.equal(slots[i].dirtyMain,true);assert.equal(slots[i].lastState,null);}
}
assert.equal(drawResetCount,3);assert.ok(prepareCount>=3);
console.log('v223 three-round fresh-board reset, reconnect preservation, settlement and continuous video guards passed');

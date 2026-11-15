import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const lifecycleSource=await readFile(new URL('../assets/shared-client-lifecycle-v217.js',import.meta.url),'utf8');
const flowSource=await readFile(new URL('../assets/shared-client-flow-v212.js',import.meta.url),'utf8');
const speedSource=await readFile(new URL('../assets/shared-host-speed-v217.js',import.meta.url),'utf8');

const resultLayer={hidden:true,classList:{remove(){}}};
let activeRound=null,startCalls=0,prepareCalls=0,drawResetCalls=0,settleCalls=0,stopAutoCalls=0;
class Engine{
 constructor(id){this.id=id;this.kind=id===0?'game0':'game-'+id;this.processed=0;this.accepted=0;this.busy=false;this.running=false;this.queue=[];this.boardVersion=1;this.totalHundredths=0;this.resetCalls=0;}
 reset(){this.resetCalls++;this.boardVersion++;this.processed=0;this.accepted=0;this.busy=false;this.running=false;this.queue.length=0;this.totalHundredths=0;}
}
class Arcade{
 start(){startCalls++;this.phase='playing';return true;}
 prepare(){
  prepareCalls++;this.token++;drawSource.reset();this.phase='ready';this.draws=[];this.payout=null;this.result=null;this.dealing=false;this.fastForward=false;
  this.totalWin=0;this.roundWins=this.engines.map(()=>0);this.paid=this.engines.map(()=>false);this.locked=this.engines.map(()=>0);this.enabled=this.bets.map(value=>value>0);
  for(const engine of this.engines)engine.reset({keepWonder:true});
 }
}
const app=new Arcade();
Object.assign(app,{
 token:1,phase:'ready',credit:900,displayCredit:900,bets:[100,100],locked:[0,0],enabled:[true,true],draws:[],paid:[false,false],roundWins:[0,0],totalWin:0,
 payout:null,result:null,dealing:false,fastForward:false,drawHeld:false,paused:false,engines:[new Engine(0),new Engine(1)],onChange(){}
});
const slots=app.engines.map((engine,index)=>({engine,index,particles:{replaceChildren(){this.cleared=true;}},miniTween:{},miniPositions:new Map([['old',1]]),dirtyMain:false,dirtyMini:false,lastState:{old:true},displayedPayout:999}));
const drawSource={reset(){drawResetCalls++;activeRound=null;}};
let serverRound={id:'next-bet',phase:'BETTING',canBet:true,participant:null,balls:[],betClosesAt:Date.now()+10000};
const client={
 online:true,round:serverRound,
 async settle(payload){settleCalls++;assert.equal(payload.roundId,'result-round');assert.equal(payload.totalWin,50);assert.equal(payload.creditAfter,950);return {settlement:{roundId:'result-round',totalWin:50,creditAfter:950}};},
 async getState(){return {type:'snapshot',serverTime:Date.now(),machine:{hostConnected:true},round:serverRound,pendingRound:null};},
 accept(state){if(Object.prototype.hasOwnProperty.call(state||{},'round'))this.round=state.round;}
};
const shared={client,get active(){return activeRound;}};
const beforeUnload=[];
const context={
 window:null,location:{search:''},URLSearchParams,console,Arcade,app,slots,SweetsSharedMachine:shared,SweetsConnectionGateV217:{stable(){return true;},canStart(round){return round?.phase==='PLAYING'&&!!round.participant;},noteState(){}},
 rouletteDrawSource:drawSource,stopAutoRound(){stopAutoCalls++;},autoRoundStamp:123,countdownText(){},
 stopResultAuto(){},resultAutoToken:4,stopBetPreview(){},stopBgm(){},stopSounds(){},userPaused:true,payoutStamp:{},roundStarting:true,
 stopShatter(slot){slot.shatterStopped=true;},stopPour(slot){slot.pourStopped=true;},stopSugarAward(slot){slot.sugarStopped=true;},stopHammerTransfer(slot){slot.hammerStopped=true;},stopPayClimb(slot){slot.payStopped=true;},clearMarks(slot){slot.marksCleared=true;},
 renderRoundResult(target){if(target.phase==='ready')resultLayer.hidden=true;},syncPause(){},scheduleUI(){for(const slot of slots)slot.displayedPayout=slot.engine.totalHundredths;},requestFit(){},
 document:{getElementById(id){return id==='round-result-layer'?resultLayer:null;}},getComputedStyle(){return {display:resultLayer.hidden?'none':'block'};},
 setTimeout,clearTimeout,addEventListener(type,handler){if(type==='beforeunload')beforeUnload.push(handler);}
};
context.window=context;
vm.runInNewContext(lifecycleSource,context);
assert.ok(context.SweetsSharedLifecycleV217,'lifecycle diagnostics must install');

// Reproduce the reported stuck state: counters look resettable, but the board,
// main-tab payout cache and result layer still contain the previous game.
app.phase='complete';app.credit=950;app.displayCredit=950;app.totalWin=50;app.roundWins=[20,30];app.draws=[1,2,3,4,5,6,7,8];app.paid=[true,true];app.payout={to:950};app.result={};
for(const engine of app.engines){engine.processed=0;engine.accepted=0;engine.busy=false;engine.running=false;engine.totalHundredths=777;}
for(const slot of slots){slot.displayedPayout=777;slot.dirtyMain=false;slot.dirtyMini=false;slot.lastState={old:true};}
resultLayer.hidden=false;
activeRound={roundId:'result-round',participant:{playerId:'PLAYER',creditAfterBet:900,settlement:null},settleSent:false};

const oldBoards=app.engines.map(engine=>engine.boardVersion);
assert.equal(await context.SweetsSharedLifecycleV217.forceInitial('runtime-regression'),true);
assert.equal(settleCalls,1);
assert.equal(app.phase,'ready');
assert.equal(app.credit,950);assert.equal(app.displayCredit,950);
assert.deepEqual(Array.from(app.draws),[]);assert.deepEqual(Array.from(app.roundWins),[0,0]);assert.deepEqual(Array.from(app.locked),[0,0]);
assert.equal(app.totalWin,0);assert.equal(app.payout,null);assert.equal(app.result,null);
assert.equal(activeRound,null,'shared draw must be released');
assert.equal(resultLayer.hidden,true,'result layer must be removed before next BET');
assert.ok(prepareCalls>=1,'Arcade.prepare must run');
assert.ok(drawResetCalls>=1,'shared roulette reset must run');
for(let index=0;index<app.engines.length;index++){
 const engine=app.engines[index],slot=slots[index];
 assert.ok(engine.resetCalls>=2,'every engine must be rebuilt by prepare and hard reset');
 assert.ok(engine.boardVersion>=oldBoards[index]+2,'the old board must not survive');
 assert.equal(engine.totalHundredths,0);
 assert.equal(slot.displayedPayout,0,'main-tab payout cache must redraw from the new board');
 assert.equal(slot.dirtyMain,true);assert.equal(slot.dirtyMini,true);
 assert.equal(slot.lastState,null);assert.equal(slot.particles.cleared,true);assert.equal(slot.marksCleared,true);
}
assert.equal(context.SweetsSharedLifecycleV217.isPristine(),true,'next BET must see a verified pristine game');
assert.ok(stopAutoCalls>0,'legacy local scheduling must stay cancelled');

serverRound={id:'next-playing',phase:'PLAYING',participant:{playerId:'PLAYER',bets:[100,100],locked:[100,100],enabled:[true,true]},balls:[]};client.round=serverRound;
assert.equal(app.start(),true,'a clean board may start the next authoritative round');
assert.equal(startCalls,1);assert.equal(app.phase,'playing');
for(const handler of beforeUnload)handler();

// Native payout must be allowed to commit WIN to CREDIT. The flow module must
// not run its own partial prepare/reset before the lifecycle's complete reset.
let flowPrepareCalls=0,flowSettles=0;
class FlowArcade{
 beginPayout(){if(this.phase!=='result')return false;this.credit+=this.totalWin;this.displayCredit=this.credit-this.totalWin;this.phase='paying';return true;}
 prepare(){flowPrepareCalls++;}
}
const flowApp=new FlowArcade();Object.assign(flowApp,{phase:'result',credit:900,displayCredit:900,totalWin:50,engines:[{kind:'game0'}]});
const flowActive={roundId:'flow-round',participant:{settlement:null},settleSent:false};
const flowClient={online:true,async settle(payload){flowSettles++;assert.equal(payload.creditAfter,950);return {settlement:{creditAfter:950}};},async getState(){return {round:null};},accept(){},syncReady(){}};
const flowContext={window:null,console,Arcade:FlowArcade,app:flowApp,SweetsSharedMachine:{client:flowClient,get active(){return flowActive;}},SweetsConnectionGateV217:{noteState(){}},setTimeout,clearTimeout};flowContext.window=flowContext;
vm.runInNewContext(flowSource,flowContext);
assert.equal(flowApp.beginPayout(),true);assert.equal(flowApp.credit,950);assert.equal(flowApp.phase,'paying');assert.equal(flowPrepareCalls,0);
await new Promise(resolve=>setTimeout(resolve,0));assert.equal(flowSettles,1);

// Host speed uses the game's built-in speed button, so physics—not video
// playback—is actually doubled.
let clicks=0,scheduled=[];
const speedButton={dataset:{},style:{},textContent:'1×',attrs:new Map([['aria-pressed','false']]),getAttribute(name){return this.attrs.get(name)||null;},setAttribute(name,value){this.attrs.set(name,String(value));},click(){clicks++;this.textContent='2×';this.attrs.set('aria-pressed','true');}};
const speedContext={window:null,location:{search:'?serverHost=1'},URLSearchParams,console,document:{getElementById(id){return id==='roulette-speed'?speedButton:null;}},setTimeout(callback,delay){scheduled.push({callback,delay});return scheduled.length;},clearTimeout(){},addEventListener(){}};speedContext.window=speedContext;
vm.runInNewContext(speedSource,speedContext);
assert.equal(clicks,1);assert.equal(speedButton.getAttribute('aria-pressed'),'true');assert.equal(speedButton.dataset.serverLockedSpeed,'2');

console.log('v217 full board/tab rebuild, native CREDIT payout and physical 2x runtime regressions passed');

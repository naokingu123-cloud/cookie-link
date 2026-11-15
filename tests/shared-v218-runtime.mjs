import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source=await readFile(new URL('../assets/shared-client-lifecycle-v218-final.js',import.meta.url),'utf8');
const events=[];let activeRound=null,settles=0,drawResets=0,startCalls=0;
class Engine{
 constructor(index){this.kind=index===0?'game0':'game-'+index;this.processed=0;this.accepted=0;this.busy=false;this.running=false;this.queue=[];this.totalHundredths=0;this.boardVersion=1;}
 reset(options){events.push('engine-reset-'+String(options?.keepWonder));this.boardVersion++;this.processed=0;this.accepted=0;this.busy=false;this.running=false;this.queue.length=0;this.totalHundredths=0;}
}
class Arcade{
 start(){events.push('start');startCalls++;this.phase='playing';return true;}
 prepare(){events.push('prepare');this.phase='ready';this.draws=[];this.payout=null;this.result=null;for(const engine of this.engines)engine.reset({keepWonder:false});}
}
const app=new Arcade();Object.assign(app,{token:1,phase:'ready',credit:900,displayCredit:900,bets:[100,100],locked:[100,100],enabled:[true,true],draws:[],payout:null,result:null,dealing:false,fastForward:false,drawHeld:false,paused:false,totalWin:0,paid:[false,false],roundWins:[0,0],engines:[new Engine(0),new Engine(1)],onChange(){events.push('onChange');}});
const slots=app.engines.map(()=>({dirtyMain:false,dirtyMini:false,lastState:{old:true},miniTween:{},particles:{replaceChildren(){}},displayedPayout:777}));
const resultLayer={hidden:true,classList:{remove(){}}};
let serverRound={id:'next-bet',phase:'BETTING',participant:null,balls:[]};
const client={online:true,round:serverRound,async settle(payload){settles++;assert.equal(payload.totalWin,50);return {settlement:{creditAfter:950,totalWin:50}};},async getState(){return {serverTime:Date.now(),round:serverRound};},accept(state){if(Object.hasOwn(state,'round'))this.round=state.round;}};
const gate={stable(){return true;},canStart(round){return round?.phase==='PLAYING'&&!!round.participant;},noteState(){}};
const scheduled=[];
const context={window:null,globalThis:null,location:{search:''},URLSearchParams,console,Arcade,app,slots,SweetsSharedMachine:{client,get active(){return activeRound;}},SweetsConnectionGateV218:gate,
 rouletteDrawSource:{start(){return true;},reset(){drawResets++;activeRound=null;}},stopAutoRound(){},stopResultAuto(){},autoRoundStamp:null,resultAutoToken:0,roundStarting:false,countdownText(){},
 document:{getElementById(id){return id==='round-result-layer'?resultLayer:null;},querySelectorAll(){return[];}},getComputedStyle(){return {display:resultLayer.hidden?'none':'block'};},
 scheduleUI(){for(let i=0;i<slots.length;i++)slots[i].displayedPayout=app.engines[i].totalHundredths;},renderRoundResult(){},syncPause(){},requestFit(){},
 setTimeout(callback,delay){if(callback?.name==='monitor')return 1;if(delay<=10){scheduled.push(callback);return scheduled.length;}return global.setTimeout(callback,delay);},clearTimeout(id){global.clearTimeout(id);},addEventListener(){}}
context.window=context;context.globalThis=context;
vm.runInNewContext(source,context);
assert.ok(context.SweetsSharedLifecycleV218);

app.phase='complete';app.credit=900;app.displayCredit=900;app.totalWin=50;app.draws=[1,2,3,4,5,6,7,8];app.payout={};app.result={};app.paid=[true,true];app.roundWins=[20,30];
for(const engine of app.engines){engine.processed=8;engine.accepted=8;engine.busy=true;engine.totalHundredths=777;}
resultLayer.hidden=false;activeRound={roundId:'round-1',participant:{playerId:'PLAYER',creditAfterBet:900}};
const oldBoards=app.engines.map(engine=>engine.boardVersion);
assert.equal(await context.SweetsSharedLifecycleV218.forceInitial('two-round-regression'),true);
assert.equal(settles,1);assert.equal(drawResets,1);assert.equal(app.phase,'ready');assert.equal(app.credit,950);assert.equal(app.displayCredit,950);
assert.deepEqual(Array.from(app.draws),[]);assert.deepEqual(Array.from(app.roundWins),[0,0]);assert.deepEqual(Array.from(app.locked),[100,100]);
assert.equal(app.totalWin,0);assert.equal(app.payout,null);assert.equal(app.result,null);assert.equal(resultLayer.hidden,true);assert.equal(activeRound,null);
assert.ok(events.indexOf('engine-reset-false')<events.indexOf('prepare'),'engine model must reset before prepare renders');
for(let i=0;i<app.engines.length;i++){assert.ok(app.engines[i].boardVersion>oldBoards[i]);assert.equal(slots[i].displayedPayout,0);assert.equal(slots[i].dirtyMain,true);assert.equal(slots[i].lastState,null);}
assert.equal(app.engines[0].kind,'cookie');assert.equal(context.SweetsSharedLifecycleV218.isPristine(),true);

serverRound={id:'round-2',phase:'PLAYING',participant:{playerId:'PLAYER',bets:[100,100],locked:[100,100],enabled:[true,true]},balls:[]};client.round=serverRound;
assert.equal(app.start(),true);assert.equal(startCalls,1);assert.equal(app.phase,'playing');
console.log('v218 game1 result -> full board/tab reset -> game2 start regression passed');

import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const [rulesSource,hostSource,recordingSource]=await Promise.all([
 read('assets/dango-bingo-rules.js'),read('assets/dango-bingo-host.js'),read('assets/recorded-round-v255.js')
]);
const plain=value=>JSON.parse(JSON.stringify(value));
const noop=()=>{};
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};

function host({worker=false,target=90,seed=26201}={}){
 const events=[],callbacks={},labels={},elements=new Map();
 const classList={add:noop,toggle:noop};
 const element=()=>({classList,dataset:{},hidden:false,after:noop,addEventListener:noop,setAttribute:noop});
 const panel=element(),slot={panel,holder:element(),mini:{canvas:{}},reachResults:[]};
 let finished=0;
 const app={engines:[],enabled:[true],paid:[false],bets:[100],locked:[100],roundWins:[0],draws:[],
  credit:1000000,displayCredit:1000000,totalWin:0,phase:'playing',token:1,paused:false,
  bet:()=>100,wait:async()=>true,finishRound(){finished++;this.totalWin=this.roundWins[0];this.phase='complete';}};
 const context=vm.createContext({console,Math,Set,Map,URLSearchParams,Promise,Date,Number,Intl,
  location:{search:worker?'?serverSettlementWorker=1':''},app,slots:[slot],
  SweetsLineup:{ids:['dango'],catalog:{dango:{name:'ダンゴデビンゴ',record:10}}},
  debugPayoutTarget:target,active:0,inView:true,allNineMode:false,motionReduced:true,jpcSession:{active:false},
  menuOpen:false,userPaused:false,document:{hidden:false,body:{classList},
   createElement:element,getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);},addEventListener:noop},
  ResizeObserver:class{observe(){}},requestAnimationFrame:()=>1,setTimeout:()=>1,clearTimeout:noop,
  stopSugarAward:noop,invalidateReach:noop,scheduleUI:noop,sceneSound:noop,recordChanged:noop,
  announceAchievement:message=>events.push({type:'announcement',message}),
  reachContext:engine=>({key:JSON.stringify(engine.state),count:engine.processed}),reachTier:()=>0,
  finishGamePresentation:async()=>{},num:String,medalWin:(bet,hundredths)=>Math.floor(bet*hundredths/100),
  select:noop,syncPause:noop,hud:noop,renderRoundResult:noop,put:(key,value)=>{labels[key]=value;},$:()=>null
 });
 context.window=context;context.addEventListener=noop;
 context.DangoBingoView={mount:()=>({setCallbacks(value){Object.assign(callbacks,value);},draw:noop,drawMini:noop})};
 context.SweetsDangoThinkingV251={state:()=>({enabled:true,active:true,ballCount:5,remainingMs:15000,closesAt:Date.now()+15000}),checkpointPlacement:async()=>({ok:true})};
 vm.runInContext(rulesSource,context);
 const native=context.DangoBingoRules;
 app.random=native.seededRandom(seed);
 context.DangoBingoRules={...native,commitFree(state,options){events.push({type:'commit',draws:plain(state.draws)});return native.commitFree(state,options);}};
 vm.runInContext(hostSource,context);
 vm.runInContext(recordingSource,context);
 const engine=context.DangoBingo.engine;
 return {context,app,engine,R:context.DangoBingoRules,recording:context.SweetsRecordedRoundV255,
  callbacks,events,labels,finished:()=>finished,
  draw(numbers){app.draws.push(...numbers);engine.enqueueBatch(numbers);}};
}

const live=host({seed:26801});
assert.equal(live.R.REVISION,268);
live.engine.start();
live.engine.state=live.R.create({moldIndex:0,numbers:Array.from({length:25},(_,i)=>i+1)});
const early=[1,3,6,10,15].map(id=>live.engine.state.numbers[id]);
live.draw(early);
assert.equal(live.engine.state.phase,'placing');assert.equal(live.engine.state.expansionLevel,7);
assert.equal(live.engine.state.freeBudget,7);assert.deepEqual(plain(live.engine.state.triggerNumbers),[]);
const available=plain(live.R.availableCenters(live.engine.state));assert.equal(available.length,23);
const cells=available.slice(0,7);
for(const id of cells)live.callbacks.onCell(id);
assert.equal(live.engine.state.manualFreeCells.length,7);assert.equal(live.engine.state.freeRemaining,0);
live.callbacks.onCell(cells[2]);assert.equal(live.engine.state.manualFreeCells.length,6);
live.callbacks.onCell(cells[2]);assert.equal(live.engine.state.manualFreeCells.length,7);
const snapshot=plain(live.recording.capture(live.app,{ballIndex:5}));
assert.equal(snapshot.engines[0].state.rulesRevision,268);
const resumed=host({seed:26801});resumed.engine.start();
resumed.recording.restore(resumed.app,snapshot,{notify:false,random:false});await flush();
assert.deepEqual(plain(resumed.engine.state),plain(live.engine.state),'restores seven manual FREE choices');
const late=Array.from({length:25},(_,i)=>i+1).filter(n=>!early.includes(n)).slice(0,3);
live.draw(late);resumed.draw(late);await flush();
assert.equal(live.engine.state.phase,'done');assert.equal(resumed.engine.state.phase,'done');
assert.deepEqual(plain(live.engine.state),plain(resumed.engine.state));
assert.deepEqual(live.app.roundWins,resumed.app.roundWins);
assert.equal(live.finished(),1);assert.equal(resumed.finished(),1);
live.engine.enqueueBatch([late.at(-1)]);live.engine.afterCheckpointRestoreV247();await flush();
assert.equal(live.finished(),1);
assert.ok(live.events.filter(e=>e.type==='commit').every(e=>e.draws.length===5));

const source=host({seed:26803});source.engine.start();
source.engine.state=source.R.create({moldIndex:0,numbers:Array.from({length:25},(_,i)=>i+1)});
const ready=source.engine.state,pool=ready.cells.filter(c=>c.number>0).map(c=>c.id),free=ready.initialFreeCells.reduce((m,id)=>m|(1<<id),0);
let prefix=null;
outer:for(let a=0;a<21;a++)for(let b=a+1;b<22;b++)for(let c=b+1;c<23;c++)for(let d=c+1;d<24;d++)for(let e=d+1;e<25;e++){
 const ids=[pool[a],pool[b],pool[c],pool[d],pool[e]],m=ids.reduce((m,id)=>m|(1<<id),free);
 if(source.R.gradeFor(m)===2){prefix=ids.map(id=>ready.numbers[id]);break outer;}
}
assert.ok(prefix);
source.draw(prefix);assert.equal(source.engine.state.freeBudget,2);
const firstChoice=source.R.availableCenters(source.engine.state)[0];source.callbacks.onCell(firstChoice);
assert.equal(source.engine.state.freeRemaining,1);
const checkpoint=plain(source.recording.capture(source.app,{ballIndex:5}));
const expected=source.R.commitFree(source.engine.state,{autoFill:true});
const worker=host({worker:true,seed:26804});worker.engine.start();
worker.recording.restore(worker.app,checkpoint,{notify:false,random:false});await flush();
assert.equal(worker.engine.state.freeCommitted,true);
assert.deepEqual(plain(worker.engine.state.manualFreeCells),plain(expected.manualFreeCells));
const rest=Array.from({length:25},(_,i)=>i+1).filter(n=>!prefix.includes(n)).slice(0,3);
worker.draw(rest);await flush();
assert.equal(worker.engine.state.phase,'done');assert.equal(worker.finished(),1);
const done=worker.engine.state,overlap=done.initialFreeCells.filter(id=>done.manualFreeCells.includes(id)).length,hits=rest.filter(n=>done.manualFreeCells.includes(done.numbers.indexOf(n))).length;
assert.equal(done.oddsMultiplier,1+overlap+hits);
// A new native host restores a v266 checkpoint with its original payout and
// starting FREE, then starts a fresh v268 board on the next round.
const oldGame=host({seed:26619});oldGame.engine.start();
oldGame.engine.state=oldGame.R.create({rulesRevision:266,moldIndex:1,numbers:Array.from({length:25},(_,i)=>i+1)});
oldGame.draw([1,2,3,4,5]);
assert.equal(oldGame.engine.state.lineCounts[3]>=1,true);
const oldSaved=plain(oldGame.recording.capture(oldGame.app,{ballIndex:5}));
const upgraded=host({seed:26819});upgraded.engine.start();
upgraded.recording.restore(upgraded.app,oldSaved,{notify:false,random:false});await flush();
assert.equal(upgraded.engine.state.rulesRevision,266);
assert.equal(upgraded.R.tiersFor(upgraded.engine.state)[6][2],500);
assert.deepEqual(plain(upgraded.engine.state.initialFreeCells),[3,4,5]);
oldGame.draw([6,7,8]);upgraded.draw([6,7,8]);await flush();
assert.deepEqual(plain(upgraded.engine.state),plain(oldGame.engine.state));
assert.equal(upgraded.finished(),1);
assert.deepEqual(upgraded.app.roundWins,oldGame.app.roundWins);
upgraded.app.phase='playing';upgraded.app.paid[0]=false;upgraded.app.token++;
upgraded.engine.reset();upgraded.engine.start();
assert.equal(upgraded.engine.state.rulesRevision,268);
assert.equal(upgraded.R.isValidInitialFree(plain(upgraded.engine.state.initialFreeCells)),true);
assert.equal(upgraded.engine.state.completedLines.length,0);

// Manual choices stay reversible. A top role is announced on commitment even
// when it was completed several individual placements before the last choice.
const placed=host({seed:26825});placed.engine.start();
placed.engine.state=placed.R.create({moldIndex:1,numbers:Array.from({length:25},(_,i)=>i+1)});
placed.draw([2,7,11,16,22].map(id=>placed.engine.state.numbers[id]));
for(const id of [15,17,18,19,20,3])placed.callbacks.onCell(id);
assert.equal(placed.engine.state.lineCounts[6],2);
assert.equal(placed.events.filter(e=>e.type==='announcement'&&e.message.includes('最高役')).length,0);
placed.engine.finishThinkingV251({reason:'test'});
assert.ok(placed.events.some(e=>e.type==='announcement'&&e.message.includes('最高役')&&e.message.includes('6個ライン 2本')));

// Both the two-line and three-line top roles must be announced.
const promoted=host({seed:26826});promoted.engine.start();
promoted.engine.state=promoted.R.create({moldIndex:1,numbers:Array.from({length:25},(_,i)=>i+1)});
promoted.draw([2,7,11,16,22].map(id=>promoted.engine.state.numbers[id]));
for(const id of [1,8,13,15,17,18])promoted.callbacks.onCell(id);
promoted.engine.finishThinkingV251({reason:'test'});
promoted.draw([19,20,26].map(id=>promoted.engine.state.numbers[id]));await flush();
const announcements=promoted.events.filter(e=>e.type==='announcement').map(e=>e.message);
assert.ok(announcements.some(message=>message.includes('最高役')&&message.includes('6個ライン 2本')));
assert.ok(announcements.some(message=>message.includes('最高役')&&message.includes('6個ライン 3本')));
assert.equal(promoted.finished(),1);
console.log('DANGO_V268_INTEGRATION_PASS',JSON.stringify({manualSeven:true,savedRound:true,workerTwo:true,duplicatePayout:false,legacy266Restore:true,current268Rollover:true,highestRoleUpgrade:true}));

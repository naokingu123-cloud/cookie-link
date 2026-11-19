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

const live=host();
assert.equal(live.R.REVISION,263);
live.engine.start();
const ready=live.engine.state;
assert.equal(ready.numbers.length,28);
assert.equal(new Set(ready.numbers.filter(n=>n>0)).size,25);
const triggers=plain(ready.triggerNumbers),ordinary=Array.from({length:25},(_,i)=>i+1).filter(n=>!triggers.includes(n));
const firstFive=[...triggers,...ordinary.slice(0,2)],lastThree=ordinary.slice(2,5);
live.draw(firstFive);
assert.equal(live.engine.state.phase,'placing');
assert.equal(live.engine.state.expansionLevel,3);
const centers=plain(live.R.availableCenters(live.engine.state));
assert.ok(centers.length>1);
live.callbacks.onCell(centers[0]);
assert.equal(live.engine.state.expansionCenter,centers[0]);
const other=centers.find(id=>id!==centers[0]&&live.engine.state.manualFreeCells.includes(id))??centers[1];
live.callbacks.onCell(other);
assert.equal(live.engine.state.expansionCenter,other,'a selected footprint cell can become the new center');
live.callbacks.onCell(other);
assert.equal(live.engine.state.expansionCenter,null,'only the selected center toggles the placement off');
live.callbacks.onCell(centers[0]);

const snapshot=plain(live.recording.capture(live.app,{ballIndex:5}));
assert.equal(snapshot.engines[0].state.expansionCenter,centers[0]);
assert.deepEqual(snapshot.engines[0].state.triggerNumbers,triggers);
assert.equal(snapshot.engines[0].state.rulesRevision,263);
const resumed=host();resumed.engine.start();
resumed.recording.restore(resumed.app,snapshot,{notify:false,random:false});
await flush();
assert.deepEqual(plain(resumed.engine.state),plain(live.engine.state),'server-recording checkpoint restores every new field');
assert.equal(resumed.engine.liveBoard,true);
const lockedCenter=live.engine.state.expansionCenter;
live.draw(lastThree);resumed.draw(lastThree);await flush();
assert.equal(live.engine.state.phase,'done');
assert.equal(resumed.engine.state.phase,'done');
assert.equal(live.engine.state.expansionCenter,lockedCenter,'manual center survives automatic commitment before sixth');
assert.deepEqual(plain(resumed.engine.state),plain(live.engine.state));
assert.deepEqual(resumed.app.roundWins,live.app.roundWins);
assert.equal(live.finished(),1);assert.equal(resumed.finished(),1);
assert.ok(live.events.filter(e=>e.type==='commit').every(e=>e.draws.length===5),'host commits before exposing sixth to rules');
live.engine.enqueueBatch([lastThree.at(-1)]);live.engine.afterCheckpointRestoreV247();await flush();
assert.equal(live.finished(),1,'repeated last ball or completed checkpoint never pays twice');

// Restoring an unfinished recording into the headless worker resolves its
// unselected center using only the stored first five, then resumes normally.
const source=host({seed:26290});source.engine.start();
const sourceTriggers=plain(source.engine.state.triggerNumbers),sourceOthers=Array.from({length:25},(_,i)=>i+1).filter(n=>!sourceTriggers.includes(n));
const prefix=[...sourceTriggers.slice(0,2),...sourceOthers.slice(0,3)],suffix=sourceOthers.slice(3,6);
source.draw(prefix);assert.equal(source.engine.state.expansionLevel,2);
const unfinished=plain(source.recording.capture(source.app,{ballIndex:5}));
const expected=source.R.commitFree(source.engine.state,{autoFill:true});
const worker=host({worker:true});worker.engine.start();
worker.recording.restore(worker.app,unfinished,{notify:false,random:false});await flush();
assert.equal(worker.engine.state.freeCommitted,true);
assert.equal(worker.engine.state.expansionCenter,expected.expansionCenter);
assert.deepEqual(plain(worker.engine.state.draws),prefix);
worker.draw(suffix);await flush();assert.equal(worker.finished(),1);
assert.equal(worker.engine.state.phase,'done');
assert.ok(worker.events.filter(e=>e.type==='commit').every(e=>e.draws.length===5));
const completed=worker.engine.state;
const overlaps=completed.initialFreeCells.filter(id=>completed.manualFreeCells.includes(id)).length;
const lateHits=suffix.filter(n=>completed.manualFreeCells.includes(completed.numbers.indexOf(n))).length;
assert.equal(completed.oddsMultiplier,1+overlaps+lateHits,'ODDS counts committed FREE overlaps and later hits once');
assert.ok(live.R.geometryFor(worker.engine.state).lines.every(line=>line.length>=3&&line.length<=7));

console.log('DANGO_V262_INTEGRATION_PASS',JSON.stringify({newBoardCells:28,streamingCenterSelection:true,
 recordedCheckpointPreserved:true,headlessResumeBeforeSixth:true,duplicatePayout:false,overlapOddsPreserved:true}));

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
 const events=[],callbacks={},labels={},elements=new Map(),frames={main:[],mini:[]};
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
 context.DangoBingoView={mount:()=>({setCallbacks(value){Object.assign(callbacks,value);},draw:(state,options)=>frames.main.push({state,options}),drawMini:(ctx,state,options)=>frames.mini.push({state,options})})};
 context.SweetsDangoThinkingV251={state:()=>({enabled:true,active:true,ballCount:5,remainingMs:15000,closesAt:Date.now()+15000}),checkpointPlacement:async()=>({ok:true})};
 vm.runInContext(rulesSource,context);
 const native=context.DangoBingoRules.legacy268??context.DangoBingoRules;
 app.random=native.seededRandom(seed);
 context.DangoBingoRules={...native,commitFree(state,options){events.push({type:'commit',draws:plain(state.draws),appDraws:plain(app.draws)});return native.commitFree(state,options);}};
 vm.runInContext(hostSource,context);
 vm.runInContext(recordingSource,context);
 const engine=context.DangoBingo.engine;
 return {context,app,engine,slot,frames,native,R:context.DangoBingoRules,recording:context.SweetsRecordedRoundV255,
  callbacks,events,labels,finished:()=>finished,
  draw(numbers){app.draws.push(...numbers);engine.enqueueBatch(numbers);}};
}

const [nativeSource,localSource,downloadSource,thinkingSource]=await Promise.all([
 read('optimized/app-01.js'),read('assets/local-debug-game-v258.js'),read('assets/download-mode-v255.js'),read('assets/dango-thinking-v251.js')
]);
const prepareFive=h=>{
 h.engine.start();h.engine.state=h.R.create({moldIndex:0,numbers:Array.from({length:25},(_,i)=>i+1)});
 h.draw([1,3,6,10,15]);assert.equal(h.engine.state.phase,'placing');
 const chosen=h.R.availableCenters(h.engine.state)[0];h.callbacks.onCell(chosen);
 assert.deepEqual(plain(h.engine.state.manualFreeCells),[chosen]);return chosen;
};
function installLocal(h,{manual=false}={}){
 const c=h.context,values=new Map();
 c.SweetsEditionV255={value:'local'};c.SweetsLocalDebugV258={storage:{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v))}};
 c.LOCAL_EIGHT_DRAW_ALLOWED=true;c.localEightAllowed=true;c.manualNumbers=manual;c.rouletteReady=true;
 c.loadCookieRoulette=async()=>{};c.document.body.append=noop;
 h.app.onChange=noop;h.app.start=()=>true;h.app.drawHeld=false;h.app.boostAfterDraws=noop;
 const accept=nativeSource.slice(nativeSource.indexOf(' acceptNumber(n,token){'),nativeSource.indexOf('\n failDraw(message,token){'));
 vm.runInContext('app.acceptNumber=function '+accept.trim()+';',c);
 const drawStart=nativeSource.indexOf('const DRAW=(()=>{'),drawEnd=nativeSource.indexOf('\nconst PIXELS=',drawStart);
 vm.runInContext('const NORMAL_DRAW_GROUPS=Object.freeze([3,2,1,1,1]);\n'+nativeSource.slice(drawStart,drawEnd)+'\nglobalThis.NativeDraw269=DRAW.DrawController;',c);
 let launches=0,gate=true;
 const physics={settings:{},active:0,time:4.9,hits:Array.from({length:5},()=>({time:0})),reset(){},launch(){
  assert.equal(h.engine.state.freeCommitted,true,'FREE commits before physics.launch');
  assert.equal(h.app.draws.length,5,'physical launch has no sixth result');
  launches++;return {id:5+launches};
 }};
 const draw=new c.NativeDraw269(physics);draw.state='running';draw.group=2;draw.next=5;
 draw.canLaunchNormal=()=>gate;c.rouletteDriver={draw,physics};
 vm.runInContext(localSource,c);
 return {draw,physics,launches:()=>launches,setGate:value=>gate=value};
}

// Native production scheduling leaves the choice editable during cooldown and
// a closed upstream gate, then commits before the successful sixth launch.
const physical=host(),physicalChoice=prepareFive(physical),expectedPhysical=physical.native.commitFree(physical.engine.state);
const local=installLocal(physical);
assert.equal(physical.context.SweetsDangoThinkingV251.state().active,true);
local.draw.update();assert.equal(local.launches(),0);assert.equal(physical.engine.state.freeCommitted,false);
local.physics.time=5;local.setGate(false);local.draw.update();
assert.equal(local.launches(),0);assert.equal(physical.engine.state.freeCommitted,false);
assert.equal(physical.context.SweetsDangoThinkingV251.state().active,true);
local.setGate(true);local.draw.update();
assert.equal(local.launches(),1);assert.equal(physical.engine.state.phase,'draw-final');
assert.deepEqual(plain(physical.engine.state.manualFreeCells),plain(expectedPhysical.manualFreeCells));
assert.ok(physical.engine.state.manualFreeCells.includes(physicalChoice));
assert.equal(physical.engine.placementReason,'sixth-launch');
assert.equal(physical.app.draws.length,5);assert.equal(physical.finished(),0);assert.equal(physical.app.credit,1000000);

// Manual number mode has no timer expiry. The explicit sixth input freezes the
// five-ball plan before Arcade.acceptNumber can append the chosen result.
const manual=host(),manualChoice=prepareFive(manual),expectedManual=manual.native.commitFree(manual.engine.state);
installLocal(manual,{manual:true});
assert.equal(manual.context.SweetsDangoThinkingV251.state().remainingMs,Infinity);
assert.equal(manual.engine.state.freeCommitted,false);
assert.equal(manual.app.acceptNumber(2,manual.app.token),true);
assert.equal(manual.engine.placementReason,'manual-sixth-launch');
assert.deepEqual(plain(manual.engine.state.manualFreeCells),plain(expectedManual.manualFreeCells));
assert.ok(manual.engine.state.manualFreeCells.includes(manualChoice));
assert.ok(manual.events.filter(e=>e.type==='commit').every(e=>e.draws.length===5&&e.appDraws.length===5));
assert.equal(manual.engine.state.draws.length,6);

// Exercise the actual replay tick. Its launch timestamp precedes the sixth
// HIT, whose number getter cannot be consulted until the five-ball plan froze.
const replay=host(),replayChoice=prepareFive(replay),expectedReplay=replay.native.commitFree(replay.engine.state);
const launchStart=downloadSource.indexOf('function commitDangoBeforeRecordedLaunchV269('),launchEnd=downloadSource.indexOf('\nfunction reconcile(',launchStart);
const tickStart=downloadSource.indexOf('function tick(now){'),tickEnd=downloadSource.indexOf('\nfunction wake()',tickStart);
let futureReads=0,renderBeforeHit=false;
const sixth={atMs:12000,get number(){futureReads++;assert.equal(replay.engine.state.freeCommitted,true);return 2;}};
Object.assign(replay.context,{cursor:5,pack:{playback:{recording:{hits:[{atMs:1000},{atMs:2000},{atMs:3000},{atMs:4000},{atMs:5000},sixth],launches:[{atMs:1000},{atMs:2000},{atMs:3000},{atMs:4000},{atMs:4500},{atMs:10000}],durationMs:20000}}},
 started:true,localComplete:false,playing:true,lastFrame:9990,playbackMs:9990,settling:false,settleStamp:0,frame:1,playbackTiming:{frames:0,activeMs:0,maxFrameMs:0,settlingMs:0},
 stopped:()=>false,renderer:{renderAt(){renderBeforeHit=replay.engine.state.freeCommitted;}},callbacks:{onNumber(n){assert.equal(renderBeforeHit,true);replay.draw([n]);return true;}},render:noop,wake:noop,
 persist:async()=>{},finishLocal:noop,reconcile:noop,syncProgress:noop});
vm.runInContext(downloadSource.slice(launchStart,launchEnd)+'\n'+downloadSource.slice(tickStart,tickEnd),replay.context);
assert.equal(replay.context.commitDangoBeforeRecordedLaunchV269(9999),false);
replay.context.tick(10000);
assert.equal(futureReads,0);assert.equal(renderBeforeHit,true);assert.equal(replay.engine.state.draws.length,5);
assert.deepEqual(plain(replay.engine.state.manualFreeCells),plain(expectedReplay.manualFreeCells));assert.ok(replay.engine.state.manualFreeCells.includes(replayChoice));
assert.equal(replay.engine.placementReason,'download-sixth-launch');
replay.context.tick(12000);assert.equal(futureReads,1);assert.equal(replay.engine.state.draws.length,6);

// Restoring an expired shared five-ball checkpoint commits immediately; a
// replay's five-ball checkpoint uses the saved playback launch timestamp.
const savedSource=host();prepareFive(savedSource);
const saved=plain(savedSource.recording.capture(savedSource.app,{ballIndex:5})),expectedRestored=savedSource.native.commitFree(savedSource.engine.state);
const restored=host();restored.engine.start();
restored.context.SweetsDangoThinkingV251.state=()=>({enabled:true,active:false,ballCount:5,remainingMs:0,closesAt:1000,serverNow:1001});
restored.recording.restore(restored.app,saved,{notify:false,random:false});await flush();
assert.equal(restored.engine.placementReason,'thinking-restore');assert.equal(restored.engine.state.draws.length,5);
assert.deepEqual(plain(restored.engine.state.manualFreeCells),plain(expectedRestored.manualFreeCells));
const restoredReplay=host();restoredReplay.engine.start();restoredReplay.recording.restore(restoredReplay.app,saved,{notify:false,random:false});await flush();
Object.assign(restoredReplay.context,{pack:replay.context.pack,cursor:5});
vm.runInContext(downloadSource.slice(launchStart,launchEnd),restoredReplay.context);
assert.equal(restoredReplay.context.commitDangoBeforeRecordedLaunchV269(11000,5),true);
assert.deepEqual(plain(restoredReplay.engine.state.manualFreeCells),plain(expectedRestored.manualFreeCells));

// Shared expiry renders AUTO immediately even while checkpoint persistence is
// waiting on another enabled game and then a durable server acknowledgement.
const shared=host();prepareFive(shared);const expectedShared=shared.native.commitFree(shared.engine.state);
const pendingOther={kind:'cookie',processed:4};shared.app.engines.push(pendingOther);shared.app.enabled.push(true);shared.app.locked.push(100);
let savedBody=null,acknowledge,releaseWait;const timers=[];
const client={online:true,clockOffset:0,round:{id:'expiry',phase:'PLAYING',thinkingEnabled:true,thinkingClosesAt:Date.now()-1,balls:[1,2,3,4,5]},on:noop,save(body){savedBody=body;return new Promise(resolve=>acknowledge=resolve);}};
Object.assign(shared.context,{client,current:{roundId:'expiry',stopped:false},setTimeout:fn=>{timers.push(fn);return timers.length;},clearTimeout:noop,CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}},dispatchEvent:noop,
 wait:()=>new Promise(resolve=>releaseWait=resolve),checkpoint:()=>({draws:[...shared.app.draws],free:plain(shared.engine.state.manualFreeCells),committed:shared.engine.state.freeCommitted})});
delete shared.context.SweetsDangoThinkingV251;
const checkpointStart=thinkingSource.indexOf('function checkpointNowV251(options={}){'),checkpointEnd=thinkingSource.indexOf('\nfunction allowHostLaunchV251(){');
vm.runInContext(thinkingSource.slice(checkpointStart,checkpointEnd)+'\nwindow.SweetsSharedMachine={client,active:current,checkpointNowV251};\n'+thinkingSource,shared.context);
timers.shift()();assert.equal(shared.engine.state.freeCommitted,true);assert.equal(savedBody,null);await flush();
assert.deepEqual(plain(shared.engine.state.manualFreeCells),plain(expectedShared.manualFreeCells));
pendingOther.processed=5;releaseWait();await flush();assert.ok(savedBody);assert.equal(savedBody.state.committed,true);
assert.equal(savedBody.ballIndex,5);assert.equal(shared.app.draws.length,5);acknowledge({ok:true});await flush();

// Main, mini and tab presentation all use the final board. Ordinary gameplay
// reach data stays empty and settlement is identical to the native rules.
const final=host();final.engine.start();final.engine.state=final.R.create({moldIndex:1,numbers:Array.from({length:25},(_,i)=>i+1)});
final.draw([2,7,11,16,22].map(id=>final.engine.state.numbers[id]));
for(const id of [1,8,13,15,17,18])final.callbacks.onCell(id);
final.engine.finishThinkingV251({reason:'test-launch'});
final.draw([19,20].map(id=>final.engine.state.numbers[id]));
const seventhNumbers=new Set(final.slot.reachResults.map(hit=>hit.number));
final.draw([final.engine.state.numbers[6]]);await flush();
const finalState=JSON.stringify(final.engine.state),expectedWin=final.R.payout(final.engine.state);
assert.equal(final.engine.state.draws.length,8);assert.deepEqual(plain(final.slot.reachResults),[]);
assert.ok(final.slot.tabReachResults.every(hit=>hit.visualOnly&&hit.afterFinal));
assert.ok(final.slot.tabReachResults.some(hit=>!seventhNumbers.has(hit.number)));
final.slot.paintDango(false);final.slot.paintDango(true);
for(const frame of [final.frames.main.at(-1),final.frames.mini.at(-1)]){
 assert.equal(frame.state.draws.length,8);assert.deepEqual(plain(frame.options.reach),plain(final.slot.tabReachResults));
}
assert.equal(final.app.roundWins[0],expectedWin);assert.equal(final.finished(),1);
assert.equal(JSON.stringify(final.engine.state),finalState);assert.equal(final.app.credit,1000000);
final.engine.enqueueBatch([final.engine.state.draws.at(-1)]);await flush();assert.equal(final.finished(),1);
console.log('DANGO_V269_LIFECYCLE_PASS',JSON.stringify({physicalPrelaunch:true,falseGatePreserved:true,manualUntimed:true,replayLaunchBeforeLanding:true,noFutureNumberLeak:true,manualPreserved:true,expiredRestore:true,sharedDeadlineBeforeAck:true,finalBoardMainMiniTab:true,settlementUnchanged:true}));


import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const [bundle,controller,core,patch221,patch224]=await Promise.all(['optimized/app-01.js','assets/shared-client-controller-v224.js','assets/shared-machine-core-v196.js','assets/shared-core-patch-v221.js','assets/shared-core-patch-v224.js'].map(read));
const classStart=bundle.indexOf('class Arcade{'),classEnd=bundle.indexOf('// Only the next HIT is simulated.',classStart);
assert.ok(classStart>=0&&classEnd>classStart);
const arcadeSource=bundle.slice(classStart,classEnd);
const flush=()=>new Promise(resolve=>setImmediate(resolve));

function patched(source){
 const context={window:{},console};vm.createContext(context);vm.runInContext(patch221,context);vm.runInContext(patch224,context);
 return context.window.SweetsSharedCorePatchV224.patch(source);
}

function harness({controllerSource=controller,coreSource=core,attachDelay=4000}={}){
 let now=100000,nextTimer=0,videoFresh=true,startedAt=0;
 const timers=new Map(),events=[],errors=[],listeners=[],storage=new Map();
 let serverRound={id:'observed-round',phase:'PLAYING',participant:null,canBet:false,balls:[]};
 const later=(callback,delay=0)=>{const id=++nextTimer;timers.set(id,{callback,at:now+Math.max(0,Number(delay)||0)});return id;};
 class ClockDate extends Date{static now(){return now;}}
 class QuietEngine{
  constructor(){this.kind='cookie';this.processed=0;this.accepted=0;this.queue=[];this.running=false;this.busy=false;this.holdDraws=false;this.totalHundredths=0;}
  reset(){this.processed=0;this.accepted=0;this.queue.length=0;this.running=false;this.busy=false;this.holdDraws=false;}
  start(){this.running=true;}
  previewDraw(){}
  enqueueBatch(values){this.accepted+=values.length;this.processed+=values.length;}
 }
 const resultLayer={hidden:true,classList:{remove(){}}};
 const context={
  window:null,globalThis:null,Date:ClockDate,URLSearchParams,location:{search:''},WebSocket:{OPEN:1},
  console:{info(...args){events.push({at:now,kind:'log',args});},warn(...args){events.push({at:now,kind:'warn',args});},error(...args){errors.push(args);}},
  setTimeout:later,clearTimeout:id=>timers.delete(id),requestAnimationFrame:callback=>{callback();return 1;},addEventListener(){},
  localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)},
  document:{body:{classList:{add(){},remove(){}}},getElementById:id=>id==='round-result-layer'?resultLayer:null,querySelectorAll:()=>[],querySelector:()=>null},
  getComputedStyle:node=>({display:node.hidden?'none':'block',visibility:node.hidden?'hidden':'visible'}),
  debugForceRainbowSugar:false,RAINBOW_SUGAR_CHANCE:0,LOCAL_EIGHT_DRAW_ALLOWED:false,medalWin:(bet,hundredths)=>bet*hundredths/100,
  stopAutoRound(){},stopResultAuto(){},autoRoundStamp:null,resultAutoToken:0,roundStarting:false,
  countdownText(text,label){events.push({at:now,kind:'status',text,label});},scheduleUI(){},renderRoundResult(){},renderGameTabs(){},requestFit(){},
  current:null,pendingStart:null,resumeId:null,recoveryOpen:false,startPermitId:null,
  closeServerGate(){},serverRequired(message){events.push({at:now,kind:'server-required',message});},
  rouletteDriver:{setPaused(){}},checkpoint:target=>({phase:target.phase,draws:[...target.draws]}),
  status(text,label){events.push({at:now,kind:'core-status',text,label});},wait:milliseconds=>new Promise(resolve=>later(resolve,milliseconds)),
 };
 context.window=context;context.globalThis=context;vm.createContext(context);
 vm.runInContext(arcadeSource+'\nglobalThis.Arcade=Arcade;',context);
 const app=new context.Arcade({initialEngines:[QuietEngine],random:()=>1,sleep:context.wait,onChange(target){events.push({at:now,kind:'phase',phase:target.phase,draws:target.draws.length});}});
 app.bets=[10];app.locked=[10];context.app=app;context.slots=[];
 const client={
  online:true,ws:{readyState:1},ready:Promise.resolve(true),clockOffset:0,playerId:'PLAYER',round:serverRound,pendingRound:null,
  async getState(){
   const attaching=app.phase==='playing'&&!context.current;
   await new Promise(resolve=>later(resolve,attaching?attachDelay:5));
   return {type:'snapshot',serverTime:now,round:serverRound,pendingRound:null};
  },
  accept(message){if(Object.hasOwn(message||{},'round'))this.round=message.round;for(const listener of listeners)listener(message);return true;},
  async join(payload){serverRound={...serverRound,participant:{playerId:'PLAYER',bets:[10],locked:[10],enabled:[true],creditAfterBet:payload.creditAfterBet}};events.push({at:now,kind:'join',roundId:serverRound.id});return {type:'snapshot',serverTime:now,round:serverRound};},
  async settle(payload){events.push({at:now,kind:'settle',payload});return {settlement:{totalWin:payload.totalWin,creditAfter:payload.creditAfter}};},
  async save(){return {ok:true};},on(listener){listeners.push(listener);return()=>{};},
 };
 context.client=client;
 const nativeReset=()=>{events.push({at:now,kind:'reset',phase:app.phase,draws:app.draws.length});context.pendingStart=null;context.current=null;app.__sharedRound=null;};
 const patchedCore=patched(coreSource),start=patchedCore.indexOf('function queueBall('),end=patchedCore.indexOf('function serverSettlement()',start);
 vm.runInContext(patchedCore.slice(start,end),context);
 context.rouletteDrawSource={get ready(){return !!client.online&&client.round?.phase==='PLAYING'&&!!client.round?.participant;},start(callbacks){startedAt=now;events.push({at:now,kind:'source-start',token:callbacks.token});return context.startShared(callbacks,nativeReset);},reset:nativeReset,pause(){}};
 app.drawSource=context.rouletteDrawSource;
 context.SweetsSharedMachine={client,get active(){return context.current;},get pendingStart(){return context.pendingStart;}};
 context.SweetsRouletteClientV224={isFresh:()=>videoFresh};
 vm.runInContext(controllerSource,context);
 async function advance(milliseconds){
  const until=now+milliseconds;let count=0;
  for(;;){
   await flush();
   const next=[...timers].filter(([,value])=>value.at<=until).sort((a,b)=>a[1].at-b[1].at||a[0]-b[0])[0];
   if(!next)break;assert.ok(++count<20000,'timer loop');now=next[1].at;timers.delete(next[0]);
   const result=next[1].callback();if(result?.catch)result.catch(error=>errors.push(error));
  }
  now=until;await flush();
 }
 return {
  app,client,context,events,errors,advance,control:context.SweetsSharedControllerV224,
  setVideoFresh(value){videoFresh=value;},
  setRound(round){serverRound=round;client.round=round;},get round(){return serverRound;},get now(){return now;},get startedAt(){return startedAt;},
  emit(message){client.accept(message);},
  ball(index,number){const ball={index,number};serverRound.balls.push(ball);if(context.current)context.queueBall(ball);},
 };
}

async function reserve(h,id){
 await h.advance(4500);
 h.setRound({id,phase:'BETTING',canBet:true,betClosesAt:h.now+20000,participant:null,balls:[]});h.emit({type:'betting_started'});
 await h.advance(1000);assert.equal(h.events.filter(event=>event.kind==='join').length,1);
}
function start(h){h.setRound({...h.round,phase:'PLAYING',canBet:false,drawStartsAt:h.now-3000});h.emit({type:'round_started'});}

const normal=harness();await reserve(normal,'normal-start');start(normal);
await normal.advance(3500);
assert.equal(normal.app.phase,'playing','an ordinary 4-second state response must not cause a 3-second attach failure');
assert.ok(normal.context.pendingStart,'the actual shared start must identify its in-flight attachment');
assert.equal(normal.events.filter(event=>event.kind==='reset').length,0);
await normal.advance(1500);
assert.equal(normal.context.current?.roundId,'normal-start');
normal.ball(1,4);normal.ball(2,8);normal.ball(3,13);await normal.advance(100);
assert.equal(JSON.stringify(normal.app.draws),'[4,8,13]');assert.equal(normal.app.engines[0].processed,3);
assert.equal(normal.events.filter(event=>event.kind==='reset').length,0,'the first three authoritative balls must be accepted without reset');
const descriptor=Object.getOwnPropertyDescriptor(normal.context.Arcade.prototype,'drawHeld');
assert.equal(typeof descriptor.get,'function');assert.equal(descriptor.set,undefined,'test must use the real getter-only Arcade property');
const reset=normal.control.abandonRound('real-arcade-regression');await normal.advance(1400);assert.equal(await reset,true);
assert.equal(normal.app.phase,'ready');assert.equal(normal.app.drawHeld,false);assert.equal(normal.errors.length,0);

const video=harness({attachDelay:10});await reserve(video,'video-dip');video.setVideoFresh(false);start(video);await video.advance(1500);
assert.equal(video.context.current?.roundId,'video-dip','a reserved round must start from the result channel during a temporary video stall');
assert.ok(!video.events.some(event=>event.kind==='settle'&&event.payload.abandoned));

const canceled=harness();await reserve(canceled,'canceled-start');start(canceled);await canceled.advance(1000);
const oldToken=canceled.app.token;
const cancel=canceled.control.abandonRound('cancel-pending-start');await canceled.advance(1500);await cancel;
await canceled.advance(4000);
assert.ok(canceled.app.token>oldToken);assert.equal(canceled.app.phase,'ready');assert.equal(canceled.context.current,null,'a late old-token response must not create an active round after reset');
assert.equal(canceled.context.pendingStart,null);assert.equal(canceled.errors.length,0);

const changed=harness();await reserve(changed,'old-server-round');start(changed);await changed.advance(1000);
changed.setRound({id:'new-server-round',phase:'BETTING',canBet:true,betClosesAt:changed.now+20000,participant:null,balls:[]});
await changed.advance(5000);
assert.equal(changed.context.current,null,'a changed authoritative round must invalidate a pending old attachment');

const expired=harness({attachDelay:20000});await reserve(expired,'expired-start');start(expired);await expired.advance(14500);
assert.equal(expired.app.phase,'ready','an attachment that really exceeds its deadline must still recover');
assert.equal(expired.context.pendingStart,null);await expired.advance(9000);
assert.equal(expired.context.current,null,'even a response after the attachment deadline cannot revive the discarded round');

const transient=harness();await reserve(transient,'http-confirmation-unavailable');
transient.client.getState=async()=>{throw Object.assign(Error('rate_limited'),{status:429,retryAfterMs:3000});};
// Simulate the accepted round_started state and the controller's next scheduled
// reconciliation using a successful first read, then throttle only confirmation.
const rejectedRead=transient.client.getState;let confirmationReads=0;
transient.client.getState=async()=>++confirmationReads===1?{type:'snapshot',round:transient.round,serverTime:transient.now}:rejectedRead();
start(transient);await transient.advance(1000);
assert.equal(transient.context.current?.roundId,'http-confirmation-unavailable','the accepted WS reservation remains usable during a redundant HTTP failure');

// Optional local baseline repro uses the original v225 source without changing
// tracked files, proving these checks cover the reported pre-first-ball reset.
if(process.env.CLIENT_START_BASELINE==='1'){
 const [oldController,oldCore]=await Promise.all(['/tmp/shared-client-controller-v225-before-start-fix.js','/tmp/shared-machine-core-v225-before-start-fix.js'].map(path=>readFile(path,'utf8')));
 const old=harness({controllerSource:oldController,coreSource:oldCore});await reserve(old,'baseline-early-reset');start(old);await old.advance(3500);
 assert.ok(old.events.some(event=>event.kind==='reset'),'old source must reproduce the reset before the first ball');
 assert.notEqual(old.app.phase,'playing');
 await assert.rejects(old.control.hardReset(990,'baseline-getter-write'),error=>/drawHeld/.test(error.message));
 console.log('v225 baseline reproduced: reset before first ball and getter-only drawHeld reset failure');
}
console.log('Real Arcade + patched core: first three balls, getter-only reset, pending attach, video dip and stale-start invalidation passed');

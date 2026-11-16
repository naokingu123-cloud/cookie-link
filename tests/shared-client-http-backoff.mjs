import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source=await readFile(new URL('../assets/shared-client-controller-v224.js',import.meta.url),'utf8');
const core=await readFile(new URL('../assets/shared-machine-core-v196.js',import.meta.url),'utf8');
const flush=()=>new Promise(resolve=>setImmediate(resolve));

// Exercise the real controller with a clock and HTTP snapshots that are actually
// dispatched to its listeners. Older lifecycle mocks did not emit accept().
function harness({latency=10,failures=[],settleFailures=[],initialStorage=[]}={}){
 let now=100000,timerId=0,active=null,pending=null,inFlight=0,maxInFlight=0;
 let round={id:'observe',phase:'PLAYING',canBet:false,participant:null,balls:[]};
 const timers=new Map(),listeners=[],requests=[],joins=[],starts=[],settlements=[],errors=[];
 const failureQueue=[...failures],settleFailureQueue=[...settleFailures],storage=new Map(initialStorage);
 const later=(callback,delay=0)=>{const id=++timerId;timers.set(id,{callback,at:now+Math.max(0,Number(delay)||0)});return id;};
 class ClockDate extends Date{static now(){return now;}}
 class Engine{
  constructor(index){this.kind=index?'game-'+index:'cookie';this.processed=0;this.accepted=0;this.busy=false;this.running=false;this.queue=[];this.boardVersion=0;}
  reset(){this.processed=0;this.accepted=0;this.busy=false;this.running=false;this.queue.length=0;}
 }
 class Arcade{
  start(){starts.push(round.id);this.phase='playing';active={roundId:round.id,participant:round.participant};return true;}
  prepare(){this.phase='ready';this.draws=[];this.payout=null;this.result=null;for(const engine of this.engines){engine.reset();engine.boardVersion++;}}
 }
 const app=new Arcade();
 Object.assign(app,{token:1,phase:'ready',credit:1000,displayCredit:1000,bets:[10,10],locked:[10,10],enabled:[true,true],draws:[],payout:null,result:null,dealing:false,fastForward:false,drawHeld:false,paused:false,totalWin:0,paid:[false,false],roundWins:[0,0],engines:[new Engine(0),new Engine(1)],onChange(){}});
 const resultLayer={hidden:true,classList:{remove(){}}};
 const snapshot=()=>({type:'snapshot',serverTime:now,round,pendingRound:pending});
 const client={
  online:true,ws:{readyState:1},clockOffset:0,round,
  async getState(){
   requests.push(now);maxInFlight=Math.max(maxInFlight,++inFlight);
   const failure=failureQueue.shift();
   try{
    await new Promise(resolve=>later(resolve,latency));
    if(failure)throw Object.assign(Error('rate_limited'),failure);
    return snapshot();
   }finally{inFlight--;}
  },
  accept(value){if(Object.hasOwn(value||{},'round'))this.round=value.round;for(const listener of listeners)listener(value);},
  async join(payload){
   joins.push({...payload});
   round={...round,participant:{playerId:'PLAYER',bets:payload.bets,locked:payload.locked,enabled:payload.enabled,creditAfterBet:payload.creditAfterBet}};
   return snapshot();
  },
  async settle(payload){
   settlements.push({...payload,at:now});
   const failure=settleFailureQueue.shift();if(failure)throw Object.assign(Error('rate_limited'),failure);
   const settlement={totalWin:payload.totalWin,creditAfter:payload.creditAfter};
   if(pending?.id===payload.roundId)pending={...pending,participant:{...pending.participant,settlement}};
   if(round?.id===payload.roundId)round={...round,participant:{...round.participant,settlement}};
   return {settlement};
  },
  prepareSettlement(payload){return {...payload,payoutV3:{version:3,ball:8,complete:true,phase:app.phase,roundWin:payload.totalWin,capturedAt:now,games:[{id:app.engines[0].kind,win:payload.totalWin,bet:20,appliedRate:90}]}};},
  on(listener){listeners.push(listener);return()=>{};},
 };
 const context={
  window:null,globalThis:null,location:{search:''},URLSearchParams,Date:ClockDate,WebSocket:{OPEN:1},Arcade,app,
  console:{info(){},warn(){},error(...args){errors.push(args);}},
  slots:app.engines.map(()=>({particles:{replaceChildren(){}}})),
  SweetsSharedMachine:{client,get active(){return active;}},SweetsRouletteClientV224:{isFresh:()=>true},
  rouletteDrawSource:{reset(){active=null;}},stopAutoRound(){},stopResultAuto(){},autoRoundStamp:null,resultAutoToken:0,roundStarting:false,countdownText(){},
  localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)},
  document:{body:{classList:{add(){},remove(){}}},getElementById(id){return id==='round-result-layer'?resultLayer:null;},querySelectorAll(){return[];},querySelector(){return null;}},
  getComputedStyle(node){return {display:node.hidden?'none':'block',visibility:node.hidden?'hidden':'visible'};},
  scheduleUI(){},renderRoundResult(){},renderGameTabs(){},requestFit(){},requestAnimationFrame(callback){callback();return 1;},
  setTimeout:later,clearTimeout:id=>timers.delete(id),addEventListener(){},
 };
 context.window=context;context.globalThis=context;
 vm.runInNewContext(source,context,{filename:'shared-client-controller-v224.js'});
 async function advance(milliseconds){
  const target=now+milliseconds;let executions=0;
  for(;;){
   await flush();
   const next=[...timers].filter(([,timer])=>timer.at<=target).sort((a,b)=>a[1].at-b[1].at||a[0]-b[0])[0];
   if(!next)break;
   assert.ok(++executions<20000,'timer feedback loop');
   now=next[1].at;timers.delete(next[0]);
   const value=next[1].callback();if(value?.catch)value.catch(error=>errors.push(error));
  }
  now=target;await flush();assert.equal(errors.length,0,'controller must not throw during scheduled work');
 }
 return {
  advance,client,app,requests,joins,starts,settlements,resultLayer,storage,control:context.SweetsSharedControllerV224,
  emit(message){client.accept(message);},
  setRound(value){round=value;client.round=value;},setPending(value){pending=value;},
  get now(){return now;},get round(){return round;},get active(){return active;},get maxInFlight(){return maxInFlight;},
 };
}

const bounded=harness({latency:5});
await bounded.advance(10000);
assert.ok(bounded.requests.length>=10&&bounded.requests.length<=14,'successful snapshot responses must not immediately re-poll');
assert.equal(bounded.control.stable(),true,'800 ms reconciliation must satisfy the 1800 ms freshness gate');
for(let index=0;index<100;index++)bounded.emit({type:'host_status',online:true});
await bounded.advance(4000);
assert.equal(bounded.maxInFlight,1,'event bursts must not overlap state HTTP requests');
for(let index=1;index<bounded.requests.length;index++)assert.ok(bounded.requests[index]-bounded.requests[index-1]>=800,'events must respect the minimum polling interval');

const shared=harness({latency:50});
const refreshes=[shared.control.refreshNow(),shared.control.refreshNow()];
await shared.advance(60);await Promise.all(refreshes);
assert.equal(shared.requests.length,1,'manual and scheduled state refreshes must share the in-flight request');

const throttled=harness({latency:5,failures:[{status:429,retryAfterMs:4200},{status:429},{status:429}]});
const originalSocket=throttled.client.ws;
await throttled.advance(10);
for(let index=0;index<100;index++)throttled.emit({type:'ball_result'});
await throttled.advance(4190);
assert.equal(throttled.requests.length,1,'Retry-After must also block event-triggered requests');
await throttled.advance(11000);
assert.ok(throttled.requests[1]-throttled.requests[0]>=4200,'server delay must be honored');
assert.ok(throttled.requests[2]-throttled.requests[1]>=2000,'repeated throttling must increase fallback delay');
assert.ok(throttled.requests[3]-throttled.requests[2]>=4000,'third failure must increase fallback delay again');
assert.equal(throttled.client.ws,originalSocket,'HTTP throttling must not replace the live WebSocket');
assert.equal(throttled.client.online,true);
assert.equal(throttled.control.stable(),true,'successful responses must restore readiness after throttling');

// A real scheduled disconnect, cleanup, reconnect, and fresh BET must work
// without manual refresh/reset, resuming old draws, or inventing local results.
const flow=harness();
await flow.advance(4500);
function betting(id){flow.setRound({id,phase:'BETTING',canBet:true,betClosesAt:flow.now+10000,participant:null,balls:[]});flow.emit({type:'betting_started'});}
function playing(){flow.setRound({...flow.round,phase:'PLAYING',canBet:false,drawStartsAt:flow.now+1000});flow.emit({type:'round_started'});}
betting('before-loss');await flow.advance(1000);playing();await flow.advance(1000);
assert.deepEqual(flow.starts,['before-loss']);
const interrupted=flow.round,lossCredit=interrupted.participant.creditAfterBet;
flow.app.draws=[7,11];flow.client.online=false;flow.client.ws.readyState=3;
await flow.advance(1800);
assert.equal(flow.active,null);assert.equal(flow.app.phase,'ready');assert.equal(flow.app.credit,lossCredit);
flow.setPending(interrupted);
flow.setRound({id:'reconnected-mid-round',phase:'PLAYING',canBet:false,participant:null,balls:[{index:1,number:2}]});
flow.client.online=true;flow.client.ws={readyState:1};
await flow.advance(4500);
assert.equal(flow.control.stable(),true);assert.deepEqual(flow.starts,['before-loss'],'an interrupted or already-playing round must never replay');
assert.ok(flow.settlements.some(value=>value.roundId==='before-loss'&&value.totalWin===0&&value.creditAfter===lossCredit));
for(const id of ['after-loss-1','after-loss-2']){
 betting(id);await flow.advance(1000);playing();await flow.advance(1000);
 assert.equal(flow.active?.roundId,id,'reconnection must join a later BET automatically');
 flow.app.phase='complete';flow.app.totalWin=5;flow.app.draws=[1,2,3,4,5,6,7,8];flow.app.payout={};flow.app.result={};flow.resultLayer.hidden=false;
 flow.setRound({...flow.round,phase:'COMPLETE',balls:flow.app.draws.map((number,index)=>({index:index+1,number}))});flow.emit({type:'round_complete'});
 await flow.advance(2000);
 assert.equal(flow.app.phase,'ready');assert.equal(flow.active,null);assert.equal(flow.control.isReady(),true);
 assert.equal(flow.settlements.filter(value=>value.roundId===id&&value.totalWin===5).length,1,'normal payout must settle once');
}
assert.deepEqual(flow.starts,['before-loss','after-loss-1','after-loss-2']);
assert.equal(flow.joins.length,3);assert.equal(flow.app.credit,950);

const ack=harness({settleFailures:[{status:429,retryAfterMs:3000}]});
await ack.advance(4500);
ack.setRound({id:'await-normal-ack',phase:'BETTING',canBet:true,betClosesAt:ack.now+10000,participant:null,balls:[]});ack.emit({type:'betting_started'});await ack.advance(1000);
ack.setRound({...ack.round,phase:'PLAYING',canBet:false,drawStartsAt:ack.now+1000});ack.emit({type:'round_started'});await ack.advance(1000);
ack.active.delivered=8;ack.app.draws=[1,2,3,4,5,6,7,8];
ack.setPending({...ack.round,phase:'COMPLETE',balls:ack.app.draws.map((number,index)=>({index:index+1,number}))});
ack.setRound({id:'next-bet-during-animation',phase:'BETTING',canBet:true,betClosesAt:ack.now+20000,participant:null,balls:[]});ack.emit({type:'betting_started'});
await ack.advance(2000);
assert.equal(ack.active?.roundId,'await-normal-ack','next server BET must not abandon an eight-ball result still animating');
assert.equal(ack.settlements.length,0);
ack.app.phase='complete';ack.app.totalWin=25;ack.app.payout={};ack.app.result={};ack.resultLayer.hidden=false;
await ack.advance(1000);
assert.equal(ack.settlements.length,1);assert.equal(ack.active?.roundId,'await-normal-ack','failed settlement must retain the normal result');
const storedNormal=ack.storage.get('sweets-shared-normal-settlements-v225');
assert.equal(JSON.parse(storedNormal)['await-normal-ack'].payoutV3.games[0].id,'cookie','the complete original payout snapshot must be persisted');
ack.app.engines[0].kind='changed-after-capture';
await ack.advance(1500);assert.equal(ack.settlements.length,1,'429 ACK retries must respect Retry-After');
await ack.advance(3500);
const normalAttempts=ack.settlements.filter(value=>value.roundId==='await-normal-ack');
assert.equal(normalAttempts.length,2);assert.ok(normalAttempts[1].at-normalAttempts[0].at>=3000);
assert.equal(normalAttempts[0].totalWin,25);assert.equal(normalAttempts[1].totalWin,25);
assert.equal(normalAttempts[0].creditAfter,1005);assert.equal(normalAttempts[1].creditAfter,1005);
assert.deepEqual(normalAttempts[0].payoutV3,normalAttempts[1].payoutV3,'retry must use the original payout telemetry');
assert.ok(!ack.settlements.some(value=>value.abandoned),'a normal pending ACK must never be converted to a zero-WIN loss');
assert.equal(ack.joins.length,2,'successful ACK must release the next BET automatically');

const restored=harness({initialStorage:[['sweets-shared-normal-settlements-v225',storedNormal]]});
await restored.advance(100);
assert.equal(restored.settlements.length,1,'a saved normal result must retry immediately without waiting for a fresh board to reach ball eight');
assert.equal(JSON.stringify(restored.settlements[0].payoutV3),JSON.stringify(normalAttempts[0].payoutV3));

async function beginRound(h,id){
 await h.advance(4500);
 h.setRound({id,phase:'BETTING',canBet:true,betClosesAt:h.now+10000,participant:null,balls:[]});h.emit({type:'betting_started'});await h.advance(1000);
 h.setRound({...h.round,phase:'PLAYING',canBet:false,drawStartsAt:h.now+1000});h.emit({type:'round_started'});await h.advance(1000);
 assert.equal(h.active?.roundId,id);
}
for(const failure of [{status:404,data:{error:'not_participating'}},{status:409,data:{error:'round_mismatch'}}]){
 failure.data.payoutControlV3={playerId:'PLAYER',wallet:{revision:4,credit:777}};
 const terminal=harness({settleFailures:[failure]});await beginRound(terminal,'terminal-'+failure.status);
 terminal.app.draws=[1,2,3,4,5,6,7,8];terminal.app.phase='complete';terminal.app.totalWin=25;
 terminal.setRound({...terminal.round,phase:'COMPLETE',balls:terminal.app.draws.map((number,index)=>({index:index+1,number}))});terminal.emit({type:'round_complete'});
 await terminal.advance(2000);
 assert.equal(terminal.active,null);assert.equal(terminal.app.credit,777,'terminal errors must prefer server-confirmed credit without adding WIN again');
 const retained=JSON.parse(terminal.storage.get('sweets-shared-settlement-review-v225'))['terminal-'+failure.status];
 assert.equal(retained.payload.totalWin,25);assert.equal(retained.payload.payoutV3.roundWin,25,'terminal failure must retain the complete payload for review');
 assert.equal(terminal.control.describe().losses.length,0);
 terminal.setRound({id:'after-terminal',phase:'BETTING',canBet:true,betClosesAt:terminal.now+10000,participant:null,balls:[]});terminal.emit({type:'betting_started'});await terminal.advance(1000);
 assert.equal(terminal.joins.length,2,'a permanent settlement rejection must not block future BETs');
}

const stalled=harness();await beginRound(stalled,'engine-stall');
stalled.active.delivered=8;stalled.app.draws=[1,2,3,4,5,6,7,8];stalled.app.engines[0].busy=true;
stalled.setRound({...stalled.round,phase:'COMPLETE',balls:stalled.app.draws.map((number,index)=>({index:index+1,number}))});stalled.emit({type:'round_complete'});
await stalled.advance(30000);stalled.app.engines[0].processed++;
await stalled.advance(45000);assert.equal(stalled.active?.roundId,'engine-stall','real engine progress must renew the timeout even after sixty total seconds');
await stalled.advance(17000);
assert.equal(stalled.active,null);assert.equal(stalled.app.phase,'ready','a truly stalled engine must eventually return to a fresh board');
assert.ok(stalled.settlements.some(payload=>payload.roundId==='engine-stall'&&payload.abandoned&&payload.totalWin===0));

// Use the real HTTP Client methods for header parsing and cross-caller dedupe.
const start=core.indexOf('class Client{'),end=core.indexOf('\nlet blockedRoundId',start);
assert.ok(start>=0&&end>start);
let fetchCalls=0,resolveFetch;
const clientContext={
 BASE:'https://shared.example',MACHINE:'public-01',AbortController,setTimeout,clearTimeout,Date,
 fetch(){fetchCalls++;return new Promise(resolve=>{resolveFetch=resolve;});},
};
vm.createContext(clientContext);
vm.runInContext(core.slice(start,end)+'\nglobalThis.TestClient=Client;',clientContext);
const httpClient=Object.create(clientContext.TestClient.prototype);Object.assign(httpClient,{token:'token',playerId:'player',stateRequest:null});
const first=httpClient.getState(),second=httpClient.getState();
assert.equal(first,second);assert.equal(fetchCalls,1);
resolveFetch({ok:true,status:200,json:async()=>({type:'snapshot'}),headers:{get:()=>null}});
await Promise.all([first,second]);assert.equal(httpClient.stateRequest,null);
for(const [header,bodyDelay,minimum] of [['4',2000,4000],[new Date(Date.now()+8000).toUTCString(),0,6000],['invalid',3500,3500]]){
 httpClient.httpRetryAt=0;
 const request=httpClient.getState();
 resolveFetch({ok:false,status:429,json:async()=>({ok:false,error:'rate_limited',retryAfterMs:bodyDelay}),headers:{get:()=>header}});
 await assert.rejects(request,error=>error.status===429&&error.retryAfterMs>=minimum);
 assert.equal(httpClient.stateRequest,null,'failed requests must release the single-flight slot');
 const before=fetchCalls;await assert.rejects(httpClient.getState(),error=>error.status===429&&error.deferred===true);
 assert.equal(fetchCalls,before,'shared cooldown must block HTTP attempts from every getState caller');
}

const saved=[],scheduled=[],idle=[];
const saveContext={current:{roundId:'old',stopped:false},client:{online:true,save:async payload=>saved.push(payload)},app:{},checkpoint:()=>({phase:'playing'}),console,window:{requestIdleCallback:true},requestIdleCallback:callback=>idle.push(callback),setTimeout:callback=>scheduled.push(callback),clearTimeout(){}};
vm.createContext(saveContext);
vm.runInContext(core.slice(core.indexOf('function saveLater('),core.indexOf('async function startShared(')),saveContext);
saveContext.saveLater(7);scheduled.shift()();saveContext.current={roundId:'new',stopped:false};idle.shift()();
assert.equal(saved.length,0,'an old idle callback must never write a checkpoint into a newer round');
saveContext.saveLater(1);scheduled.shift()();idle.shift()();await flush();
assert.equal(saved[0].roundId,'new');assert.equal(saved[0].ballIndex,1);

console.log('Bounded HTTP, retry/cooldown, reconnect, fixed payout snapshots/ACK, terminal quarantine, progress watchdog and checkpoint isolation passed');

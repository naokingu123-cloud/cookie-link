import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const read=path=>readFile(path==='assets/shared-client-controller-v224.js'&&process.env.CLIENT_INSTALL_CONTROLLER?process.env.CLIENT_INSTALL_CONTROLLER:new URL('../'+path,import.meta.url),'utf8');
const [bundle,core,controller,patch221,patch224,payout,upgrade]=await Promise.all([
 'optimized/app-01.js','assets/shared-machine-core-v196.js','assets/shared-client-controller-v224.js',
 'assets/shared-core-patch-v221.js','assets/shared-core-patch-v224.js','assets/server-payout-control-v3.js',
 'assets/cookie-upgrade-patches.js'
].map(read));
const patchContext={window:{},console:{info(){},warn(){}}};vm.createContext(patchContext);
vm.runInContext(upgrade,patchContext);vm.runInContext(patch221,patchContext);vm.runInContext(patch224,patchContext);
const game=patchContext.window.CookieUpgradePatch.patch(bundle);
const coreSource=patchContext.window.SweetsSharedCorePatchV224.patch(core);
const engineStart=game.indexOf('const SPECIAL_RATE='),engineEnd=game.indexOf('// Only the next HIT is simulated.');
const drawStart=game.indexOf('const LOCAL_EIGHT_DRAW_ALLOWED='),drawEnd=game.indexOf('async function loadCookieRoulette()',drawStart);
assert.ok(engineStart>=0&&engineEnd>engineStart&&drawStart>=0&&drawEnd>drawStart);
const engineSource=game.slice(engineStart,engineEnd);
const drawSource=game.slice(drawStart,drawEnd);
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const copy=value=>JSON.parse(JSON.stringify(value));

function harness({joinDelay=5,loseJoinAck=false,foreignParticipant=false}={}){
 let now=100000,timerId=0,revision=1,seed=8191;
 let round={id:'observed-round',sequence:1,phase:'PLAYING',participant:null,canBet:false,balls:[]};
 const timers=new Map(),storage=new Map(),nodes=new Map(),events=[],errors=[],sockets=[];
 const later=(callback,delay=0)=>{const id=++timerId;timers.set(id,{callback,at:now+Math.max(0,Number(delay)||0)});return id;};
 const node=tag=>({tagName:String(tag).toUpperCase(),hidden:false,dataset:{},style:{setProperty(){}},classList:{add(){},remove(){},toggle(){},contains(){return false;}},
  append(...children){for(const child of children)if(child.id)nodes.set(child.id,child);},appendChild(child){this.append(child);return child;},
  remove(){if(this.id)nodes.delete(this.id);},setAttribute(){},addEventListener(){},querySelector(){return null;},querySelectorAll(){return[];},
  replaceChildren(){},getContext(){return{};}
 });
 const result=node('div');result.hidden=true;nodes.set('round-result-layer',result);
 const document={head:node('head'),body:node('body'),hidden:false,createElement:node,getElementById:id=>nodes.get(id)||null,querySelector:()=>null,querySelectorAll:()=>[]};
 const snapshot=()=>({type:'snapshot',role:'player',serverTime:now,machine:{revision,hostConnected:true},round:copy(round),pendingRound:null});
 class Socket{
  static OPEN=1;
  constructor(){this.readyState=0;sockets.push(this);later(()=>{this.readyState=1;this.onopen?.();this.deliver(snapshot());},1);}
  deliver(message){this.onmessage?.({data:JSON.stringify(message)});}
  send(){}
  close(){this.readyState=3;this.onclose?.();}
 }
 const context={
  window:null,globalThis:null,document,Image:class{constructor(){this.complete=false;this.naturalWidth=0;}addEventListener(){}},
  Date:class extends Date{static now(){return now;}},URL,URLSearchParams,AbortController,WebSocket:Socket,queueMicrotask,
  location:{search:'',hostname:'localhost',origin:'http://localhost:3000',href:'http://localhost:3000/'},
  localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)},
  crypto:{randomUUID:()=> 'test-uuid'},performance:{now:()=>now},
  setTimeout:later,clearTimeout:id=>timers.delete(id),setInterval:()=>0,clearInterval(){},
  requestAnimationFrame:callback=>later(()=>callback(now),16),cancelAnimationFrame:id=>timers.delete(id),
  addEventListener(){},dispatchEvent(){},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail;}},
  getComputedStyle:target=>({display:target.hidden?'none':'block',visibility:target.hidden?'hidden':'visible'}),
  console:{info(...args){events.push({at:now,kind:'info',args});},warn(...args){events.push({at:now,kind:'warn',args});},error(...args){errors.push(args);}},
  stopAutoRound(){},stopResultAuto(){},scheduleAutoRound(){},syncDebugButtons(){},syncManualNumbers(){},
  autoRoundStamp:null,resultAutoToken:0,roundStarting:false,jpcSession:{active:false},motionReduced:false,
  countdownText(text,label){events.push({at:now,kind:'status',text,label});},scheduleUI(){},renderRoundResult(){},
  onGameChange(target){events.push({at:now,kind:'phase',phase:target.phase,draws:target.draws.length});},
  onGameEvent(index,event){if(event.phase==='error')errors.push({index,event});},
  random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/0x100000000;},
  async fetch(url,options={}){
   const path=new URL(url).pathname;let data,delay=5,status=200;
   if(path==='/api/health')data={ok:true};
   else if(path==='/api/session')data={player:{id:'PLAYER',displayName:'PLAYER'},token:'TOKEN'};
   else if(path.endsWith('/state')){data=snapshot();events.push({at:now,kind:'state-request',roundId:round.id});}
   else if(path.endsWith('/round/join')){
    const payload=JSON.parse(options.body);events.push({at:now,kind:'join',payload});
    assert.equal(payload.roundId,round.id);
    round={...round,participant:{playerId:'PLAYER',clientRoundToken:foreignParticipant?'previous-session-token':payload.clientRoundToken,bets:payload.bets,locked:payload.locked,enabled:payload.enabled,creditAfterBet:payload.creditAfterBet}};revision++;
    data=snapshot();delay=joinDelay;
    // The server can accept the reservation and notify other consumers before
    // the request's HTTP acknowledgement reaches this controller.
    later(()=>sockets.at(-1)?.deliver({...snapshot(),type:'bet_updated'}),1);
    if(loseJoinAck){status=503;data={ok:false,error:'gateway_unavailable'};}
   }else if(path.endsWith('/round/settle')){
    const payload=JSON.parse(options.body);events.push({at:now,kind:'settle',payload});
    const settlement={totalWin:payload.totalWin,creditAfter:payload.creditAfter};
    if(round.id===payload.roundId&&round.participant)round={...round,participant:{...round.participant,settlement}};
    data={ok:true,settlement};
   }else if(path.endsWith('/round/checkpoint'))data={ok:true};
   else throw Error('Unexpected test request: '+path);
   await new Promise((resolve,reject)=>{later(resolve,delay);options.signal?.addEventListener('abort',()=>reject(Object.assign(Error('aborted'),{name:'AbortError'})),{once:true});});
   return {ok:status===200,status,headers:{get(){return null;}},json:async()=>copy(data)};
  }
 };
 context.window=context;context.globalThis=context;vm.createContext(context);
 // These are the actual production Engine, ChocoDigEngine, CandyCarnivalEngine,
 // Arcade and native draw-source definitions, including the normal app patch.
 vm.runInContext(engineSource+'\nglobalThis.Arcade=Arcade;',context,{timeout:10000});
 vm.runInContext("globalThis.app=new Arcade({random,sleep:ms=>new Promise(resolve=>setTimeout(resolve,ms)),onChange:onGameChange,onEvent:onGameEvent});app.credit=1000;app.bets=[10,10,10];app.locked=[0,0,0];",context,{timeout:10000});
 vm.runInContext(drawSource+"\nrouletteDriver={setPaused(){},reset(){},start(){throw Error('local physical draw must never run on the client');}};rouletteReady=false;app.drawSource=rouletteDrawSource;globalThis.rouletteDrawSource=rouletteDrawSource;",context);
 context.slots=[];context.SweetsRouletteClientV224={isFresh:()=>true};
 // Execute all of install(): do not substitute drawSource.ready/start, Client,
 // getState single-flight, source-patch start permits or prototype wrappers.
 vm.runInContext(coreSource,context);vm.runInContext(payout,context);vm.runInContext(controller,context);
 async function advance(milliseconds){
  const end=now+milliseconds;let steps=0;
  for(;;){
   await flush();const next=[...timers].filter(([,timer])=>timer.at<=end).sort((a,b)=>a[1].at-b[1].at||a[0]-b[0])[0];
   if(!next)break;assert.ok(++steps<30000,'timer execution must stay bounded');now=next[1].at;timers.delete(next[0]);
   try{const value=next[1].callback();if(value?.catch)value.catch(error=>errors.push(error));}catch(error){errors.push(error);}
  }
  now=end;await flush();
 }
 return {
  context,events,errors,advance,get now(){return now;},get round(){return round;},get app(){return context.app;},
  get machine(){return context.SweetsSharedMachine;},get control(){return context.SweetsSharedControllerV224;},
  betting(id){round={id,sequence:round.sequence+1,phase:'BETTING',canBet:true,betClosesAt:now+12000,participant:null,balls:[]};revision++;sockets.at(-1).deliver({...snapshot(),type:'betting_started'});},
  playing(){round={...round,phase:'PLAYING',canBet:false,drawStartsAt:now};revision++;sockets.at(-1).deliver({...snapshot(),type:'round_started'});},
  ball(number){const ball={index:round.balls.length+1,number};round={...round,balls:[...round.balls,ball]};sockets.at(-1).deliver({type:'ball_result',serverTime:now,roundId:round.id,ball,phase:'PLAYING'});},
  supersedeReservation({settled=false,credit=1500}={}){
   const participant=settled?{...round.participant,settlement:{totalWin:credit-round.participant.creditAfterBet,creditAfter:credit}}:{...round.participant,clientRoundToken:'superseding-reservation-token'};
   round={...round,phase:settled?'COMPLETE':round.phase,canBet:!settled,participant};revision++;
   sockets.at(-1).deliver({...snapshot(),payoutControlV3:{version:3,playerId:'PLAYER',updatedAt:now,effectiveRate:90,wallet:{revision,credit,lastRoundId:round.id,source:'server-worker'}}});
  },
  disconnect(){sockets.at(-1).close();},
  snapshot(){sockets.at(-1).deliver(snapshot());}
 };
}

async function stable(h){
 await h.advance(5000);assert.equal(h.control.stable(),true,'the real Client must have stable accepted snapshots');
 assert.equal(h.control.isReady(),true,'default production engines must pass initial controller readiness');
 assert.deepEqual(Array.from(h.app.engines,e=>e.kind||'cookie'),['cookie','choco','candy']);
 assert.equal(h.context.rouletteDrawSource.ready,false,'a connected client cannot start before an authoritative participant');
}

const delayed=harness({joinDelay:2500});await stable(delayed);delayed.betting('delayed-ack');await delayed.advance(1000);
assert.equal(delayed.events.filter(event=>event.kind==='join').length,1);
assert.ok(delayed.machine.client.round.participant,'the real core state listener can observe the accepted reservation before its HTTP ACK');
assert.equal(delayed.control.describe().joinedRoundId,'','the reservation is still awaiting its HTTP ACK');
assert.ok(delayed.events.some(event=>event.kind==='status'&&event.label==='BET登録を確認中'),'the installed core clock must show that registration is still pending');
const pendingRefresh=delayed.control.refreshNow();delayed.playing();await delayed.advance(2200);await pendingRefresh;
assert.equal(delayed.events.filter(event=>event.kind==='settle').length,0,'an in-flight join must not be mistaken for an interrupted round');
assert.equal(delayed.app.phase,'playing','real core install readiness must allow the controller-authorized start');
assert.equal(delayed.machine.active?.roundId,'delayed-ack');
assert.ok(delayed.app.engines.every(engine=>engine.running),'all production engines must enter their real running state');
delayed.ball(4);delayed.ball(8);delayed.ball(13);await delayed.advance(3500);
assert.deepEqual(Array.from(delayed.app.draws),[4,8,13],'the real installed queue delivers only the authoritative balls');
assert.ok(delayed.app.engines.every(engine=>engine.accepted===3),'the actual default engine batches must receive the first three balls');
assert.equal(delayed.errors.length,0,JSON.stringify(delayed.errors));

const lost=harness({loseJoinAck:true});await stable(lost);lost.betting('lost-ack');await lost.advance(2000);
assert.equal(lost.events.filter(event=>event.kind==='settle'&&event.payload.abandoned).length,0,'a same-epoch token-matched reservation must survive a lost HTTP ACK');
assert.equal(lost.control.describe().joinedRoundId,'lost-ack','the authoritative participant must reconcile our own outstanding join token');
assert.ok(lost.events.some(event=>event.kind==='status'&&event.label==='SERVER BET TIME・BET登録済み'),'the installed core clock must distinguish a confirmed BET');
lost.playing();await lost.advance(1400);
assert.equal(lost.machine.active?.roundId,'lost-ack','a recovered current-session BET must start via the full production core');
assert.equal(lost.app.phase,'playing');assert.equal(lost.errors.length,0,JSON.stringify(lost.errors));

for(const settled of [false,true]){
 const stale=harness({joinDelay:2500});await stable(stale);
 stale.betting(settled?'settled-before-ack':'replaced-before-ack');await stale.advance(1000);
 const request=stale.events.find(event=>event.kind==='join');assert.ok(request);
 assert.equal(stale.control.describe().joinedRoundId,'');
 const credit=settled?1580:1640;
 stale.supersedeReservation({settled,credit});
 assert.equal(stale.app.credit,credit,'the newer authoritative wallet must be applied before the old join response arrives');
 assert.equal(stale.machine.client.round.phase,settled?'COMPLETE':'BETTING');
 await stale.advance(request.at+2500-stale.now+10);
 assert.equal(stale.control.describe().joinedRoundId,'','an older successful join ACK must not override a newer '+(settled?'settled COMPLETE state':'reservation token'));
 assert.equal(stale.app.credit,credit,'the rejected ACK must not restore its old creditAfterBet');
 assert.equal(stale.app.displayCredit,credit);assert.equal(stale.machine.active,null);assert.equal(stale.app.phase,'ready');
 assert.equal(stale.errors.length,0,JSON.stringify(stale.errors));
}

const foreign=harness({loseJoinAck:true,foreignParticipant:true});await stable(foreign);foreign.betting('foreign-reservation');await foreign.advance(2000);
assert.equal(foreign.control.describe().joinedRoundId,'','another attempt token must never restore an interrupted reservation');
assert.ok(foreign.events.some(event=>event.kind==='settle'&&event.payload.abandoned),'an unrelated participant must retain the zero-WIN abandonment policy');
foreign.playing();await foreign.advance(1400);assert.equal(foreign.machine.active,null);assert.equal(foreign.app.phase,'ready');
assert.equal(foreign.errors.length,0,JSON.stringify(foreign.errors));

const reconnected=harness({loseJoinAck:true,joinDelay:3500});await stable(reconnected);reconnected.betting('disconnected-attempt');await reconnected.advance(1000);
assert.equal(reconnected.events.filter(event=>event.kind==='join').length,1);
const epoch=reconnected.control.describe().connectionEpoch;reconnected.disconnect();await reconnected.advance(5000);
assert.ok(reconnected.control.describe().connectionEpoch>epoch,'the real Client must reconnect on a new connection epoch');
assert.equal(reconnected.control.describe().joinedRoundId,'','a previous connection attempt must not be recovered after reconnect');
assert.ok(reconnected.events.some(event=>event.kind==='settle'&&event.payload.abandoned));
reconnected.playing();await reconnected.advance(1400);assert.equal(reconnected.machine.active,null);assert.equal(reconnected.app.phase,'ready');
assert.equal(reconnected.errors.length,0,JSON.stringify(reconnected.errors));

console.log('Full client install: real Arcade/default engines, delayed/lost/stale join ACK, shared state flight and rejected foreign/disconnected attempts passed');

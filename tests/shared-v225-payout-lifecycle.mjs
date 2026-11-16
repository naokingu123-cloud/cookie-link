import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source=await readFile(process.env.SWEETS_TEST_PAYOUT_SOURCE||new URL('../assets/server-payout-control-v3.js',import.meta.url),'utf8');
const plain=value=>JSON.parse(JSON.stringify(value));
const flush=()=>new Promise(resolve=>setImmediate(resolve));

function control(roundId,credit,revision=1,source='client'){
 return {version:3,playerId:'PLAYER',effectiveRate:90,targetRate:90,mode:'auto',games:{},currentRoundId:roundId,offlinePending:false,wallet:{credit,revision,lastRoundId:roundId,source}};
}

function fixture(){
 let now=100000,timerId=0,active={roundId:'round-1',participant:{playerId:'PLAYER',creditAfterBet:900}},joinedRoundId='round-1';
 const timers=new Map(),storage=new Map(),listeners=[];
 const calls={save:[],settle:[],join:[],warnings:[],state:0,reset:0,abandon:0,prepare:0,engineReset:0,change:0};
 const behavior={settleResponse:{ok:true},saveResponse:{ok:true},stateResponse:{ok:true}};
 class FakeDate extends Date{constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}}
 const engines=['cookie','choco'].map(kind=>({kind,processed:0,accepted:0,draws:[],totalHundredths:200,reset(){calls.engineReset++;this.processed=0;this.accepted=0;},freshBoard(){calls.engineReset++;}}));
 // Arcade exposes a computed getter without a setter. A plain writable mock
 // would hide strict-mode writes that abort wallet restoration in the game.
 class ArcadeMock{get drawHeld(){return this.phase==='playing'&&this.engines.some((engine,index)=>this.enabled[index]&&engine.holdDraws);}}
 const app=Object.assign(new ArcadeMock(),{token:1,phase:'playing',credit:900,displayCredit:900,bets:[60,40],locked:[60,40],enabled:[true,true],paid:[false,false],roundWins:[20,10],totalWin:30,draws:[1,2,3],engines,result:{keep:'result'},payout:{keep:'payout'},dealing:false,paused:false,
  prepare(){calls.prepare++;this.phase='ready';this.draws=[];this.totalWin=0;this.roundWins=[0,0];for(const engine of engines)engine.reset();},
  onChange(){calls.change++;}
 });
 const client={online:true,round:{id:'round-1',phase:'PLAYING',participant:{playerId:'PLAYER',creditAfterBet:900}},
  async save(payload){calls.save.push(plain(payload));return behavior.saveResponse;},
  async settle(payload){calls.settle.push(plain(payload));return behavior.settleResponse;},
  async join(payload){calls.join.push(plain(payload));return {ok:true};},
  async getState(){calls.state++;return behavior.stateResponse;},
  on(listener){listeners.push(listener);return()=>{};}
 };
 const schedule=(callback,ms,interval=false)=>{const id=++timerId;timers.set(id,{callback,at:now+Math.max(0,Number(ms)||0),interval:interval?Math.max(1,Number(ms)||1):0});return id;};
 const context={window:null,globalThis:null,app,debugPayoutTarget:90,jpcSession:null,location:{search:''},URLSearchParams,Date:FakeDate,console:{info(){},warn(...args){calls.warnings.push(args.map(value=>String(value?.message||value)).join(' '));},error:console.error},
  medalWin:(bet,hundredths)=>Math.floor(bet*hundredths/100),
  document:{getElementById(){return null;}},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail;}},
  localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,String(value))},
  SweetsSharedMachine:{client,get active(){return active;}},
  SweetsSharedControllerV224:{describe:()=>({activeRound:active?.roundId||null,joinedRoundId,startedRoundId:active?.roundId||null}),abandonRound(){calls.abandon++;return Promise.resolve(true);}},
  rouletteDrawSource:{reset(){calls.reset++;active=null;}},
  countdownText(){},dispatchEvent(){},queueMicrotask,
  setTimeout:(callback,ms)=>schedule(callback,ms),clearTimeout:id=>timers.delete(id),
  setInterval:(callback,ms)=>schedule(callback,ms,true),clearInterval:id=>timers.delete(id)
 };
 context.window=context;context.globalThis=context;
 vm.runInNewContext(source,context,{filename:'server-payout-control-v3.js'});
 return {app,engines,client,calls,behavior,storage,context,
  emit(value){for(const listener of listeners)listener({payoutControlV3:value});},
  active:()=>active,
  setRound(id,{phase='PLAYING',reserved=true,running=true,credit=800}={}){
   client.round={id,phase,participant:reserved?{playerId:'PLAYER',creditAfterBet:credit}:null};
   active=running?{roundId:id,participant:client.round.participant}:null;joinedRoundId=reserved?id:'';
   app.token++;app.phase=phase==='BETTING'?'ready':'playing';app.credit=credit;app.displayCredit=credit;
  },
  async advance(ms){
   await flush();const target=now+ms;
   for(let step=0;step<5000;step++){
    const next=[...timers.entries()].filter(([,timer])=>timer.at<=target).sort((a,b)=>a[1].at-b[1].at)[0];
    if(!next){now=target;await flush();return;}
    const [id,timer]=next;now=timer.at;
    if(timer.interval)timer.at=now+timer.interval;else timers.delete(id);
    timer.callback();await flush();
   }
   throw new Error('timer loop did not converge');
  }
 };
}

await test('abandoned zero-WIN settlement is sent immediately with consistent per-game zeros',async()=>{
 const f=fixture();await flush();
 // A disconnect already reset the board. Waiting for eight processed balls
 // here would keep the settlement/next-round path blocked for 18 seconds.
 f.setRound('round-2',{phase:'BETTING',reserved:false,running:false,credit:900});
 for(const engine of f.engines){engine.processed=0;engine.totalHundredths=500;}
 const pending=f.client.settle({roundId:'round-1',abandoned:true,totalWin:0,creditAfter:900});
 await flush();
 assert.equal(f.calls.settle.length,1,'abandonment must reach the server without advancing any timers');
 const payload=f.calls.settle[0];
 assert.equal(payload.totalWin,0);assert.equal(payload.payoutV3.roundWin,0);
 assert.ok(payload.payoutV3.games.length>0);
 assert.ok(payload.payoutV3.games.every(game=>game.win===0),'individual game WIN must agree with the zero-WIN loss');
 await pending;
});

await test('normal settlement wallet acknowledgement preserves the normal result and active round',async()=>{
 const f=fixture();await flush();
 f.app.phase='result';f.app.credit=1020;f.app.displayCredit=1020;f.app.totalWin=120;f.app.paid=[true,true];f.app.roundWins=[70,50];f.app.draws=[1,2,3,4,5,6,7,8];
 for(const engine of f.engines)engine.processed=8;
 f.behavior.settleResponse={ok:true,settlement:{totalWin:120,creditAfter:1020},payoutControlV3:control('round-1',1020)};
 const result=f.app.result,payout=f.app.payout;
 await f.client.settle({roundId:'round-1',totalWin:120,creditAfter:1020});
 assert.equal(f.calls.reset,0,'a normal client ACK must not reset rouletteDrawSource');
 assert.equal(f.calls.abandon,0,'a normal client ACK must not abandon the round');
 assert.equal(f.calls.prepare,0,'the lifecycle controller owns normal result completion');
 assert.equal(f.app.phase,'result');assert.equal(f.app.result,result);assert.equal(f.app.payout,payout);
 assert.equal(f.active().roundId,'round-1');assert.equal(f.app.totalWin,120);
 assert.equal(JSON.parse(f.storage.get('sweets-payout-wallet-v3')).revision,1,'the wallet ACK should still be recorded');
 assert.deepEqual(f.calls.warnings,[],'normal acknowledgement must not trigger a swallowed reset exception');
});

await test('wallet restoration completes with the real Arcade getter-only drawHeld contract',async()=>{
 for(const source of ['client','server-worker']){
  const f=fixture();await flush();
  f.setRound('round-2',{reserved:false,running:false,credit:800});
  f.engines[0].holdDraws=true;
  const descriptor=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(f.app),'drawHeld');
  assert.equal(typeof descriptor.get,'function');assert.equal(descriptor.set,undefined);
  assert.equal(f.app.drawHeld,true,'drawHeld is computed from the enabled engines while playing');

  // No active or reserved round remains. Applying the server wallet must
  // prepare the abandoned board and finish restoring credit, even if an old
  // engine still holds draws. Exceptions inside this path are caught by the
  // production wrapper, so verify both its warning output and final state.
  f.emit(control('round-1',1100,2,source));await flush();
  assert.deepEqual(f.calls.warnings,[],source+' wallet restoration must not write to a getter-only property');
  assert.equal(f.calls.reset,1);assert.equal(f.calls.prepare,1);
  assert.equal(f.app.phase,'ready');assert.equal(f.app.drawHeld,false);
  assert.equal(f.app.credit,1100);assert.equal(f.app.displayCredit,1100);
  assert.equal(f.app.result,null);assert.equal(f.app.payout,null);assert.equal(f.app.totalWin,0);
  assert.equal(f.active(),null);
  assert.equal(JSON.parse(f.storage.get('sweets-payout-wallet-v3')).revision,2);
 }
});

await test('an old wallet does not roll back a different active or reserved round',async()=>{
 for(const current of [{phase:'PLAYING',running:true},{phase:'BETTING',running:false}]){
  for(const source of ['client','server-worker']){
   const f=fixture();await flush();
   f.setRound('round-2',{...current,reserved:true,credit:800});
   f.emit(control('round-1',1100,2,source));await flush();
   assert.equal(f.app.credit,800,current.phase+' must keep its post-BET credit');
   assert.equal(f.app.displayCredit,800);
   assert.equal(f.calls.reset,0);assert.equal(f.calls.prepare,0);assert.equal(f.calls.abandon,0);
   assert.equal(f.client.round.id,'round-2');
   if(current.running)assert.equal(f.active().roundId,'round-2');
  }
 }
});

await test('queued checkpoints are discarded if the board changes while waiting for processing',async()=>{
 const f=fixture();await flush();
 const first=f.client.save({roundId:'round-1',ballIndex:3,state:{origin:'old-round'}});
 const second=f.client.save({roundId:'round-1',ballIndex:4,state:{origin:'old-round-queued'}});
 await flush();assert.equal(f.calls.save.length,0,'the first old board is still processing');
 f.setRound('round-2',{credit:800});
 for(const engine of f.engines){engine.processed=8;engine.accepted=8;engine.totalHundredths=9999;}
 f.app.draws=[25,24,23,22,21,20,19,18];
 await f.advance(100);
 await Promise.all([first,second]);
 assert.equal(f.calls.save.length,0,'new-board telemetry must never be posted under the old round ID');
 const current=f.client.save({roundId:'round-2',ballIndex:2,state:{origin:'current-round'}});
 await flush();await current;
 assert.equal(f.calls.save.length,1,'valid checkpoints for the new round must still work');
 assert.equal(f.calls.save[0].roundId,'round-2');assert.equal(f.calls.save[0].state.payoutV3.number,24);
});

await test('payout control leaves periodic state retrieval to the shared synchronization controller',async()=>{
 const f=fixture();await flush();const startupReads=f.calls.state;
 await f.advance(6000);
 assert.equal(f.calls.state,startupReads,'payout control must not run a second HTTP polling loop');
 f.behavior.stateResponse={ok:true,payoutControlV3:control('round-1',900,0)};
 await f.client.getState();
 assert.equal(f.calls.state,startupReads+1,'the synchronization controller can still request and apply state');
});

await test('a persisted settlement snapshot retries immediately after reload without using the new board',async()=>{
 const first=fixture();await flush();
 first.app.phase='complete';first.app.credit=1020;first.app.displayCredit=1020;first.app.totalWin=120;
 first.app.paid=[true,true];first.app.roundWins=[70,50];first.app.draws=[1,2,3,4,5,6,7,8];
 for(const engine of first.engines)engine.processed=8;
 first.emit({...control('round-1',1020,0),effectiveRate:87.5});await flush();
 assert.equal(typeof first.client.prepareSettlement,'function');
 const body={roundId:'round-1',totalWin:120,creditAfter:1020,digest:'saved-normal-result'};
 const captured=first.client.prepareSettlement(body);
 assert.equal(typeof captured?.then,'undefined','the result must be captured synchronously before a reset/unload');
 assert.equal(captured.payoutV3.version,3);assert.equal(captured.payoutV3.roundWin,120);
 assert.deepEqual(plain(captured.payoutV3.games).map(game=>[game.id,game.bet,game.win,game.appliedRate]),[['cookie',60,70,87.5],['choco',40,50,87.5]]);
 const serialized=JSON.stringify(captured),expected=JSON.parse(serialized);

 // This is a new JavaScript context, as after reload. Its current BET, WIN,
 // payout setting, and timestamp are deliberately different from the result.
 const reloaded=fixture();await flush();
 reloaded.setRound('round-2',{phase:'BETTING',reserved:true,running:false,credit:700});
 reloaded.app.bets=[600,400];reloaded.app.locked=[600,400];reloaded.app.roundWins=[999,888];reloaded.app.totalWin=1887;
 for(const engine of reloaded.engines){engine.processed=0;engine.accepted=0;engine.draws=[];engine.totalHundredths=9999;}
 reloaded.emit({...control('round-2',700,0),effectiveRate:125});
 await reloaded.advance(3500);
 const restored=JSON.parse(serialized);
 const preparedAgain=reloaded.client.prepareSettlement(restored);
 assert.deepEqual(plain(preparedAgain),expected,'preparing an existing snapshot must preserve the original per-game data and capture time');
 assert.notEqual(preparedAgain.payoutV3,restored.payoutV3,'a retry must own a copy rather than mutate the persisted snapshot');
 assert.notEqual(preparedAgain.payoutV3.games,restored.payoutV3.games);
 const pending=reloaded.client.settle(restored);
 await flush();
 assert.equal(reloaded.calls.settle.length,1,'a saved result must be sent without waiting for the new board to process eight balls');
 assert.deepEqual(reloaded.calls.settle[0],expected,'reload retry must send exactly the captured settlement');
 assert.deepEqual(restored,expected,'sending the retry must not alter the saved payload');
 assert.equal(reloaded.app.phase,'ready');assert.equal(reloaded.app.credit,700);
 await pending;
 const normalized=reloaded.client.prepareSettlement({...restored,totalWin:121});
 assert.equal(normalized.payoutV3.roundWin,121,'snapshot total WIN must agree with the authoritative settlement amount');
 assert.deepEqual(plain(normalized.payoutV3.games),expected.payoutV3.games,'normalization must not sample the current board again');
});

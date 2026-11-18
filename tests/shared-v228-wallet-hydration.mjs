import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source=await readFile(process.env.SWEETS_TEST_PAYOUT_SOURCE||new URL('../assets/server-payout-control-v3.js',import.meta.url),'utf8');
const bundle=await readFile(new URL('../optimized/app-01.js',import.meta.url),'utf8');
const lineupSource=await readFile(new URL('../assets/lineups-v91.js',import.meta.url),'utf8');
const lineupContext={window:{},location:{search:''},URLSearchParams,
 document:{documentElement:{dataset:{},toggleAttribute(){}},addEventListener(){},head:{}},
 MutationObserver:class{observe(){}}};
vm.runInNewContext(lineupSource,lineupContext);
const lineup=Array.from(lineupContext.window.SweetsLineup.ids);
assert.equal(lineup.length,10);assert.equal(lineup.at(-1),'dango');
const begin=bundle.indexOf('class Arcade{'),end=bundle.indexOf('// Only the next HIT is simulated.',begin);
assert.ok(begin>=0&&end>begin);
const arcadeSource=bundle.slice(begin,end);
const plain=value=>JSON.parse(JSON.stringify(value));
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const control=(credit,revision,{source='initial',roundId=null,playerId='PLAYER'}={})=>({version:3,playerId,updatedAt:revision*1000,effectiveRate:90,mode:'auto',games:{},currentRoundId:roundId,wallet:{credit,revision,source,lastRoundId:roundId,reservedRoundId:source==='bet'?roundId:null}});

function fixture({savedWallet=null,startupControl=null}={}){
 const storage=new Map(),listeners=[],calls={reset:0,prepare:0,change:0,refresh:0,join:[],settle:[],warnings:[]};
 if(savedWallet)storage.set('sweets-payout-wallet-v3',JSON.stringify(savedWallet));
 let active=null,joinedRoundId='',pendingBetRoundId='';
 const behavior={state:{round:{id:'round-1',phase:'BETTING',participant:null},payoutControlV3:startupControl},join:{ok:true},settle:{ok:true}};
 class Engine{
  constructor(){this.kind='cookie';this.reset();}
  reset(){this.processed=this.accepted=this.totalHundredths=0;this.busy=this.running=false;this.queue=[];}
 }
 const client={online:true,playerId:'PLAYER',ws:{readyState:1},round:behavior.state.round,
  async save(){return {ok:true};},async settle(payload){calls.settle.push(plain(payload));return behavior.settle;},
  async join(payload){calls.join.push(plain(payload));if(behavior.join instanceof Error)throw behavior.join;return behavior.join;},
  async getState(){return behavior.state;},isStaleState:state=>state?.staleForTest===true,
  on(listener){listeners.push(listener);return()=>{};}
 };
 const context={window:null,globalThis:null,console:{info(){},warn(...args){calls.warnings.push(args);},error:console.error},
  URLSearchParams,location:{search:''},Date,setTimeout,clearTimeout,queueMicrotask,
  Engine,SweetsLineup:{ids:lineup},medalWin:(bet,hundredths)=>Math.floor(bet*hundredths/100),debugPayoutTarget:90,
  document:{getElementById(){return null;}},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail;}},dispatchEvent(){},
  localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,String(value))},
  SweetsSharedMachine:{client,get active(){return active;}},
  SweetsSharedControllerV224:{describe:()=>({joinedRoundId,startedRoundId:active?.roundId||'',pendingBetRoundId}),refreshBetControls(){calls.refresh++;}},
  rouletteDrawSource:{reset(){calls.reset++;active=null;}},countdownText(){},
  changed(){calls.change++;}
 };
 context.window=context;context.globalThis=context;vm.createContext(context);
 vm.runInContext(arcadeSource+'\nglobalThis.app=new Arcade({initialEngines:SweetsLineup.ids.map(()=>Engine),onChange:changed});app.credit=1000000;app.displayCredit=1000000;app.drawSource=rouletteDrawSource;',context);
 const app=context.app,nativePrepare=app.prepare;app.prepare=function(...args){calls.prepare++;return nativePrepare.apply(this,args);};
 vm.runInContext(source,context);
 return {app,client,behavior,calls,storage,context,
  emit(value){for(const listener of listeners)listener({payoutControlV3:value});},
  setRound(id,{phase='ready',joined=false,pending=false,running=false,credit=app.credit}={}){
   joinedRoundId=joined?id:'';pendingBetRoundId=pending?id:'';active=running?{roundId:id}:null;
   client.round={id,phase:phase==='ready'?'BETTING':phase==='playing'?'PLAYING':'COMPLETE',participant:joined||running?{playerId:'PLAYER',clientRoundToken:'token-'+id,creditAfterBet:credit}:null};
   app.phase=phase;app.credit=credit;app.displayCredit=credit;
  }
 };
}

await test('a fresh Arcade hydrates an already cached wallet revision exactly once',async()=>{
 const value=control(500000,12),f=fixture({startupControl:value,savedWallet:{...value.wallet,playerId:'PLAYER'}});await flush();
 assert.equal(f.app.credit,500000,'a persisted revision must not leave the new app at its constructor balance');
 assert.equal(f.app.displayCredit,500000);assert.equal(f.calls.change,1);assert.equal(f.calls.refresh,1);
 assert.equal(f.calls.reset,0,'hydrating a fresh ready board must not reset it');
 await f.client.getState();f.emit(value);await flush();
 assert.equal(f.calls.change,1,'repeated snapshots of this revision must not repeatedly restore the wallet');
 assert.equal(f.calls.reset,0);assert.deepEqual(f.calls.warnings,[]);
});

await test('a successful 30000 BET synchronizes 970000 without another debit or reset',async()=>{
 const f=fixture({startupControl:control(1000000,1)});await flush();f.setRound('round-1',{pending:true});
 const value=control(970000,2,{source:'bet',roundId:'round-1'});
 f.behavior.join={round:{id:'round-1',phase:'BETTING',participant:{playerId:'PLAYER',clientRoundToken:'token-round-1',creditAfterBet:970000}},payoutControlV3:value};
 const payload={roundId:'round-1',clientRoundToken:'token-round-1',totalBet:30000};
 await f.client.join(payload);
 assert.equal(f.app.credit,970000);assert.equal(f.app.displayCredit,970000);assert.equal(f.calls.reset,0);assert.equal(f.calls.prepare,0);
 await f.client.join(payload);f.emit(value);await flush();
 assert.equal(f.app.credit,970000,'an idempotent BET response must not debit the stake twice');
 assert.equal(JSON.parse(f.storage.get('sweets-payout-wallet-v3')).revision,2);
 assert.equal(f.app.bets.reduce((sum,value)=>sum+value,0),30000);
});

await test('per-game BET telemetry follows the normalized reservation payload rather than old app flags',async()=>{
 const f=fixture();await flush();f.app.engines=f.app.engines.slice(0,2);f.app.engines[1].kind='choco';
 f.app.bets=[3000,900];f.app.locked=[3000,0];f.app.enabled=[true,false];
 await f.client.join({roundId:'round-1',clientRoundToken:'token-round-1',bets:[3000,3000],locked:[3000,3000],enabled:[true,true],totalBet:6000});
 assert.deepEqual(f.calls.join[0].payoutV3Bet.games,[{id:'cookie',bet:3000},{id:'choco',bet:3000}]);
 assert.deepEqual(Array.from(f.app.enabled),[true,false],'preparing the request must not mutate the currently displayed model');
});

await test('the production ten-game reservation preserves Dango identity and its 3000 BET',async()=>{
 const f=fixture();await flush();f.app.engines.forEach((engine,index)=>{engine.kind=lineup[index];});
 const bets=lineup.map(()=>3000),enabled=lineup.map(()=>true);
 await f.client.join({roundId:'round-1',clientRoundToken:'token-round-1',bets,locked:bets,enabled,totalBet:30000});
 assert.deepEqual(f.calls.join[0].payoutV3Bet.games,lineup.map(id=>({id,bet:3000})));
 assert.equal(f.calls.join[0].payoutV3Bet.games.reduce((sum,row)=>sum+row.bet,0),30000);
 assert.deepEqual(f.calls.join[0].payoutV3Bet.games.at(-1),{id:'dango',bet:3000});
});

await test('a matching reservation snapshot can synchronize a lost BET ACK without reset',async()=>{
 const f=fixture({startupControl:control(1000000,1)});await flush();f.setRound('round-1',{pending:true});
 f.emit(control(970000,2,{source:'bet',roundId:'round-1'}));await flush();
 assert.equal(f.app.credit,970000);assert.equal(f.app.displayCredit,970000);assert.equal(f.calls.reset,0);
 f.setRound('round-1',{phase:'playing',joined:true,running:true,credit:970000});
 f.emit(control(1000000,1));await flush();assert.equal(f.app.credit,970000);assert.equal(f.calls.reset,0);
});

await test('old wallets do not overwrite active, reserved or pending BET balances',async()=>{
 for(const state of [{phase:'playing',running:true,joined:true},{joined:true},{pending:true}]){
  const f=fixture();await flush();f.setRound('round-2',{...state,credit:940000});
  for(const source of ['bet','client','server-worker'])f.emit(control(980000,8,{source,roundId:'round-1'}));
  await flush();assert.equal(f.app.credit,940000);assert.equal(f.app.displayCredit,940000);assert.equal(f.calls.reset,0);assert.equal(f.calls.change,0);
 }
});

await test('an expired pending attempt cannot prevent the next authoritative wallet from hydrating',async()=>{
 for(const changed of [false,true]){
  const f=fixture();await flush();f.setRound('round-1',{pending:true,credit:970000});
  f.client.round=changed?{id:'round-2',phase:'BETTING',participant:null}:{id:'round-1',phase:'COMPLETE',participant:{playerId:'PLAYER',settlement:{creditAfter:980000}}};
  f.emit(control(980000,3,{source:'server-worker',roundId:'round-1'}));await flush();
  assert.equal(f.app.credit,980000);assert.equal(f.app.displayCredit,980000);assert.equal(f.calls.reset,0);
 }
});

await test('a late reservation balance cannot rewind an already calculated payout',async()=>{
 const f=fixture();await flush();f.setRound('round-1',{phase:'paying',joined:true,running:true,credit:980000});
 f.app.totalWin=10000;f.app.displayCredit=974000;f.app.payout={from:970000,to:980000,amount:10000,elapsed:400,duration:1000};
 f.emit(control(970000,2,{source:'bet',roundId:'round-1'}));await flush();
 assert.equal(f.app.credit,980000);assert.equal(f.app.displayCredit,974000);assert.equal(f.app.phase,'paying');assert.equal(f.calls.reset,0);
});

await test('own normal settlement ACK records the wallet while preserving result animation',async()=>{
 const f=fixture();await flush();f.setRound('round-1',{phase:'result',joined:true,running:true,credit:970000});
 f.app.totalWin=10000;f.app.result={elapsed:100,duration:1800};
 f.behavior.settle={settlement:{totalWin:10000,creditAfter:980000},payoutControlV3:control(980000,3,{source:'client',roundId:'round-1'})};
 const result=f.app.result;await f.client.settle({roundId:'round-1',totalWin:10000,creditAfter:980000});
 assert.equal(f.app.phase,'result');assert.equal(f.app.result,result);assert.equal(f.app.totalWin,10000);
 assert.equal(f.calls.reset,0);assert.equal(f.calls.prepare,0);assert.equal(f.app.credit,970000,'the lifecycle controller owns payout application after its ACK');
 assert.equal(JSON.parse(f.storage.get('sweets-payout-wallet-v3')).credit,980000);
});

await test('a current pending BET rejected for funds synchronizes the authoritative balance',async()=>{
 const f=fixture({startupControl:control(1000000,1)});await flush();f.setRound('round-2',{pending:true});
 f.behavior.join=Object.assign(Error('insufficient_credit'),{status:409,data:{ok:false,error:'insufficient_credit',payoutControlV3:control(26000,3,{source:'client',roundId:'round-1'})}});
 await assert.rejects(f.client.join({roundId:'round-2',clientRoundToken:'token-round-2'}),/insufficient_credit/);
 assert.equal(f.app.credit,26000);assert.equal(f.app.displayCredit,26000);assert.equal(f.calls.reset,0);assert.equal(f.calls.refresh,2);
});

await test('stale successful BET responses cannot roll back a newer authoritative wallet',async()=>{
 const f=fixture({startupControl:control(980000,3,{source:'client',roundId:'round-1'})});await flush();
 f.setRound('round-2',{pending:true,credit:980000});
 f.behavior.join={staleForTest:true,round:{id:'round-2',phase:'BETTING',participant:{playerId:'PLAYER',clientRoundToken:'token-round-2'}},payoutControlV3:control(950000,4,{source:'bet',roundId:'round-2'})};
 await f.client.join({roundId:'round-2',clientRoundToken:'token-round-2'});
 assert.equal(f.app.credit,980000);assert.equal(f.calls.reset,0);
 f.behavior.state=f.behavior.join;await f.client.getState();assert.equal(f.app.credit,980000);
 assert.equal(JSON.parse(f.storage.get('sweets-payout-wallet-v3')).revision,3);
});

await test('invalid credits, lower revisions and a different player cannot hydrate the wallet',async()=>{
 const f=fixture({startupControl:control(500000,12)});await flush();
 for(const value of [control(600000,11),control(null,13),control(-1,13),control('bad',13),control(900000,14,{playerId:'OTHER'})])f.emit(value);
 await flush();assert.equal(f.app.credit,500000);assert.equal(f.app.displayCredit,500000);assert.equal(f.calls.change,1);
 assert.equal(JSON.parse(f.storage.get('sweets-payout-wallet-v3')).revision,12);
});

/* Exercise the real Dango host, common checkpoint serializer and offline worker
   restore against genuine revision251 snapshots and new revision253 rounds. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const rulesSource=read('assets/dango-bingo-rules.js');
const hostSource=read('assets/dango-bingo-host.js');
const coreSource=read('assets/shared-machine-core-v196.js');
const workerSource=read('assets/server-offline-settlement-worker-v3.js');
const snapshots=JSON.parse(read('tests/dango-v251-checkpoints.json'));
const workerEntry=workerSource.lastIndexOf('install();');
const serializerStart=coreSource.indexOf('const CONTROLS='),serializerEnd=coreSource.indexOf('function totalBet(');
assert(workerEntry>0&&serializerStart>0&&serializerEnd>serializerStart);
const plain=value=>JSON.parse(JSON.stringify(value));
const flush=async()=>{for(let i=0;i<16;i++)await Promise.resolve();};

function fixture(){
 const counters={finish:0,records:0,presentations:0,waits:0};
 const element=()=>({classList:{add(){},toggle(){}},style:{},hidden:false,after(){},dataset:{},setAttribute(){},querySelector(){return null;}});
 const slot={i:0,panel:element(),holder:element(),tab:element(),mini:{}};
 const app={token:91,phase:'ready',paused:false,credit:999900,displayCredit:999900,bets:[100],locked:[100],enabled:[true],paid:[false],draws:[],roundWins:[0],totalWin:0,wonderBank:[],wonderSteps:0,wonderValue:0,engines:[],
  random:()=>.25,bet:()=>100,wait(){counters.waits++;throw Error('Hidden settlement must not wait for presentation');},
  finishRound(){counters.finish++;this.phase='result';this.totalWin=this.roundWins.reduce((a,b)=>a+b,0);}
 };
 const context={console,URLSearchParams,location:{search:'?serverSettlementWorker=1'},Intl,Math,Promise,
  document:{hidden:true,body:{classList:{toggle(){}}},createElement:element,getElementById:()=>null,addEventListener(){}},
  addEventListener(){},ResizeObserver:class{observe(){}},requestAnimationFrame(){throw Error('Hidden restore must not draw');},clearTimeout(){},setTimeout,
  app,slots:[slot],SweetsLineup:{ids:['dango'],catalog:{dango:{name:'ダンゴデビンゴ',record:10}}},
  DangoBingoView:{mount:()=>({draw(){},drawMini(){},setCallbacks(){}})},debugPayoutTarget:90,active:0,inView:false,motionReduced:false,allNineMode:true,jpcSession:{active:false},
  $:element,stopSugarAward(){},invalidateReach(s){s.reachStatus='inactive';s.reachBoardKey=null;s.reachResults=[];},scheduleUI(){},
  reachContext:()=>null,reachTier:(rate,all)=>all?3:rate>=1000?2:rate>=300?1:0,medalWin:(bet,rate)=>Math.floor(bet*rate/100),
  num:String,announceAchievement(){},sceneSound(){},select(){},syncPause(){},hud(){},renderRoundResult(){},put(){},recordChanged(){counters.records++;},
  async finishGamePresentation(){counters.presentations++;}
 };
 context.window=context;vm.createContext(context);
 vm.runInContext(rulesSource,context,{filename:'dango-bingo-rules.js'});
 vm.runInContext(hostSource,context,{filename:'dango-bingo-host.js'});
 vm.runInContext(coreSource.slice(serializerStart,serializerEnd)+'\nglobalThis.testCheckpoint=checkpoint;',context,{filename:'actual-shared-checkpoint.js'});
 vm.runInContext(workerSource.slice(0,workerEntry)+'window.testRestore=restore;\n})();',context,{filename:'actual-worker-restore.js'});
 const engine=context.DangoBingo.engine;app.phase='playing';engine.start();
 return {context,app,engine,counters,R:context.DangoBingoRules,
  restore(state,paid=false){
   const saved={credit:app.credit,displayCredit:app.displayCredit,bets:[100],locked:[100],enabled:[true],paid:[paid],draws:state.draws.slice(),roundWins:[paid?state.totalHundredths:0],totalWin:paid?state.totalHundredths:0,
    wonderBank:[],wonderSteps:0,wonderValue:0,engines:[{kind:'dango',state:plain(state),version:engine.version,liveBoard:true,running:!paid,processed:state.draws.length,accepted:state.draws.length}]};
   app.phase='ready';context.testRestore(app,saved);app.phase='playing';
  },
  checkpoint(){return context.testCheckpoint(app);},
  receive(n){app.draws.push(n);engine.enqueueBatch([n]);}
 };
}

// The manual FREE and old0.2 tier survive serialization, worker restoration,
// its late HIT, and the delayed eighth-ball completion exactly once.
const resumed=fixture();resumed.restore(snapshots.committed);await flush();
assert.equal(resumed.engine.state.rulesRevision,251);
assert.equal(resumed.engine.state.initialFreeCells.length,0);
const saved=plain(resumed.checkpoint());
assert.equal(saved.engines[0].state.rulesRevision,251);
assert.deepEqual(saved.engines[0].state.manualFreeCells,[5]);
const afterWire=fixture();afterWire.context.testRestore(afterWire.app,saved);afterWire.app.phase='playing';await flush();
for(const n of [6,7,8])afterWire.receive(n);await flush();
assert.deepEqual(plain(afterWire.engine.state),snapshots.final);
assert.equal(afterWire.app.roundWins[0],40,'legacy two-times0.2 pays0.4 rather than new0.2');
assert.equal(afterWire.app.paid[0],true);assert.equal(afterWire.counters.finish,1);assert.equal(afterWire.counters.records,1);
assert.equal(afterWire.counters.waits,0);assert.equal(afterWire.counters.presentations,0);
afterWire.engine.afterCheckpointRestoreV247();afterWire.receive(8);await flush();
assert.equal(afterWire.counters.finish,1);assert.equal(afterWire.app.roundWins[0],40);

// A checkpoint captured before placement commitment is auto-filled by the
// actual worker host without changing its revision or creating an initial FREE.
const placing=fixture();placing.restore(snapshots.placing);await flush();
assert.equal(placing.engine.state.rulesRevision,251);
assert.equal(placing.engine.state.initialFreeCells.length,0);
assert.equal(placing.engine.state.freeCommitted,true);
assert.equal(placing.engine.state.manualFreeCells.length,1);
for(const n of [6,7,8])placing.receive(n);await flush();
assert.equal(placing.engine.state.rulesRevision,251);assert.equal(placing.app.paid[0],true);

// The eighth-ball checkpoint must settle from its saved total, even when no
// further draw arrives; an already-paid checkpoint must not pay again.
const finished=fixture();finished.restore(snapshots.final);await flush();
assert.equal(finished.app.roundWins[0],40);assert.equal(finished.counters.finish,1);
assert.equal(finished.engine.state.rulesRevision,251);
const paid=fixture();paid.restore(snapshots.final,true);await flush();assert.equal(paid.counters.finish,0);

// A new board remains revision253 through the same shared serializer/worker,
// has at least one initial FREE, and uses the adjusted table when settled.
const current=fixture();let s=current.R.create({moldIndex:0,initialFreeCells:[17],numbers:Array.from({length:25},(_,i)=>i+1)});
s=[2,3,4,10,17].reduce((state,n)=>current.R.draw(state,n),s);
s=current.R.commitFree(current.R.placeFree(s,5),{autoFill:false});
current.restore(s);await flush();const currentSaved=current.checkpoint();
assert.equal(currentSaved.engines[0].state.rulesRevision,253);
for(const n of [6,7,8])current.receive(n);await flush();
assert.equal(current.engine.state.rulesRevision,253);assert.equal(current.engine.state.initialFreeCells.length,1);
assert.equal(current.app.roundWins[0],20);assert.equal(current.counters.finish,1);

console.log('DANGO_V253_CHECKPOINT_PASS',JSON.stringify({legacyRevision:251,newRevision:253,oldEmptyInitialContinued:true,
 realSharedSerializer:true,realWorkerRestore:true,realHostFinish:true,legacyWin:40,currentWin:20,
 uncommittedLegacyAutoFill:true,eighthBallNoReplay:true,paidGuard:true,noPresentationWait:true}));

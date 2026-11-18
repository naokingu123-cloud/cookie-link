/* Reproduce a checkpoint captured after logical ball 8 but before its delayed
   Sugar/paid writes. Run the real Castella host and real worker restore helper. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const rulesSource=await fs.readFile(new URL('../assets/party-castella-rules.js',import.meta.url),'utf8');
const hostSource=await fs.readFile(new URL('../assets/party-castella-host.js',import.meta.url),'utf8');
const workerSource=await fs.readFile(new URL('../assets/server-offline-settlement-worker-v3.js',import.meta.url),'utf8');
const workerEntry=workerSource.lastIndexOf('install();');assert.ok(workerEntry>0);
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
const plain=value=>JSON.parse(JSON.stringify(value));

function fixture(worker=false){
 const counters={waits:0,presentations:0,finish:0,records:0,sugarArt:0};const waiters=[];
 const element=()=>({classList:{add(){},toggle(){}},style:{},hidden:false,after(){},replaceChildren(){},setAttribute(){},querySelector(){return element();}});
 const slot={i:0,panel:element(),holder:element(),tab:element(),mini:{}};
 let seed=8133;const app={token:91,phase:'ready',paused:false,credit:999900,displayCredit:999900,bets:[100],locked:[100],enabled:[true],paid:[false],draws:[],roundWins:[0],totalWin:0,wonderBank:[],wonderSteps:0,wonderValue:0,engines:[],
  random:()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32),bet:()=>100,
  wait(ms,token){counters.waits++;assert.equal(ms,1500);return new Promise(resolve=>waiters.push(()=>resolve(token===app.token)));},
  finishRound(){counters.finish++;this.phase='result';this.totalWin=this.roundWins.reduce((a,b)=>a+b,0);}
 };
 const context={console,URLSearchParams,location:{search:worker?'?serverSettlementWorker=1':''},Intl,Math,Promise,Set,Map,Array,
  document:{hidden:true,body:{classList:{toggle(){}}},createElement:element,addEventListener(){}},
  Image:class{},ResizeObserver:class{observe(){}},requestAnimationFrame(){throw Error('Hidden restore must not draw');},clearTimeout(){},setTimeout,
  app,slots:[slot],SweetsLineup:{ids:['castella'],catalog:{castella:{name:'パーティカステラ',record:'castella',logo:'fixture.webp'}}},
  PartyCastellaView:{mount:()=>({draw(){},drawMini(){}})},debugPayoutTarget:90,active:0,inView:false,motionReduced:false,allNineMode:true,jpcSession:{active:false},
  $:element,stopSugarAward(){},invalidateReach(s){s.reachStatus='inactive';s.reachBoardKey=null;s.reachResults=[];},scheduleUI(){},
  reachContext:()=>null,reachTier:(rate,all)=>all?3:rate>=1000?2:rate>=300?1:0,medalWin:(bet,rate)=>Math.floor(bet*rate/100),
  num:String,sugarVisualTier:()=>1,getSugarSprite:()=>null,DIRECT_JPC_SUGAR_TIER:6,isDirectJpcSugar:()=>false,
  showSugarAward(){counters.sugarArt++;},showSugarCutin(){},announceAchievement(){},sceneSound(){},
  select(){},hud(){},renderRoundResult(){},put(){},recordChanged(){counters.records++;},
  async finishGamePresentation(){counters.presentations++;}
 };
 context.window=context;vm.createContext(context);
 vm.runInContext(rulesSource,context,{filename:'party-castella-rules.js'});
 vm.runInContext(hostSource,context,{filename:'party-castella-host.js'});
 const prior=context.location.search;context.location.search='?serverSettlementWorker=1';
 vm.runInContext(workerSource.slice(0,workerEntry)+'window.testRestore=restore;\n})();',context,{filename:'actual-worker-restore.js'});
 context.location.search=prior;
 const engine=context.PartyCastella.engine;engine.roundBet=100;app.phase='playing';engine.start();
 return {context,app,engine,slot,counters,waiters,R:context.PartyCastellaRules,
  restore(saved){app.phase='ready';context.testRestore(app,plain(saved));app.phase='playing';},
  release(){for(const resolve of waiters.splice(0))resolve();}
 };
}
function snapshot(f){
 const saved={};for(const key of ['credit','displayCredit','bets','locked','enabled','paid','draws','roundWins','totalWin','wonderBank','wonderSteps','wonderValue'])saved[key]=plain(f.app[key]);
 saved.engines=[plain(f.engine)];return saved;
}
function receive(f,n){f.app.draws.push(n);f.engine.enqueueBatch([n]);}

// Capture the actual foreground host while both delayed jobs remain pending.
const foreground=fixture(),demo=foreground.R.createDemo();foreground.engine.state=demo.state;
for(const n of demo.draws)receive(foreground,n);
assert.equal(foreground.engine.state.phase,'done');assert.equal(foreground.engine.state.sugarEarned,true);
assert.equal(foreground.engine.wonderCollected,false);assert.equal(foreground.app.paid[0],false);
assert.equal(foreground.app.wonderBank.length,0);assert.ok(foreground.counters.waits>=1);
const pending=snapshot(foreground),expected=foreground.engine.totalHundredths;

const recovered=fixture(true);recovered.restore(pending);
recovered.engine.afterCheckpointRestoreV247(); // A second hook must reuse pending work.
await flush();
assert.equal(recovered.counters.waits,0,'hidden settlement never waits for visible browning');
assert.equal(recovered.counters.presentations,0,'hidden settlement never enters visible final-board wait');
assert.equal(recovered.app.paid[0],true);assert.equal(recovered.app.roundWins[0],expected);
assert.equal(recovered.app.totalWin,expected);assert.equal(recovered.counters.finish,1);assert.equal(recovered.counters.records,1);
assert.equal(recovered.engine.processed,8);assert.equal(recovered.engine.running,false);
assert.equal(recovered.engine.wonderCollected,true);assert.equal(recovered.engine.roundSteps,1);
assert.equal(recovered.app.wonderBank.length,1);assert.equal(recovered.app.wonderValue,100);assert.equal(recovered.app.wonderSteps,1);
assert.equal(recovered.counters.sugarArt,0,'offline award changes the ledger without a cut-in');
assert.deepEqual(plain(recovered.engine.state),pending.engines[0].state,'recovery does not replay draws or change their outcome');
recovered.engine.afterCheckpointRestoreV247();await flush();assert.equal(recovered.app.wonderBank.length,1);assert.equal(recovered.counters.finish,1);

// A sixth-ball award resumes without prematurely paying the unfinished game.
const during=fixture(),example=during.R.createDemo();let five=example.draws.slice(0,5).reduce((s,n)=>during.R.draw(s,n),example.state);
const sugar=five.specials.sugar[0],zone=five.zones.find(z=>z.cells.includes(sugar));assert.ok(five.wet[sugar]&&zone);
during.engine.state=five;during.engine.processed=during.engine.accepted=5;during.app.draws=[...five.draws];
receive(during,zone.numbers[0]);assert.equal(during.engine.state.sugarEarned,true);assert.equal(during.engine.wonderCollected,false);
const middle=fixture(true);middle.restore(snapshot(during));middle.engine.afterCheckpointRestoreV247();await flush();
assert.equal(middle.engine.processed,6);assert.equal(middle.app.paid[0],false);assert.equal(middle.app.phase,'playing');
assert.equal(middle.app.wonderBank.length,1);assert.equal(middle.counters.finish,0);
for(let n=1;middle.engine.processed<8;n++)if(!middle.engine.state.draws.includes(n))receive(middle,n);
await flush();assert.equal(middle.app.paid[0],true);assert.equal(middle.app.wonderBank.length,1);assert.equal(middle.counters.finish,1);

// Already-collected, paid, not-participating and ready checkpoints are distinct.
const collected=plain(pending);collected.engines[0].wonderCollected=true;collected.engines[0].roundSteps=1;
collected.wonderBank=[{...collected.engines[0].wonderToken,game:0}];collected.wonderSteps=1;collected.wonderValue=100;
const collectedWorker=fixture(true);collectedWorker.restore(collected);await flush();assert.equal(collectedWorker.app.wonderBank.length,1);assert.equal(collectedWorker.counters.finish,1);
const paid=plain(collected);paid.paid=[true];paid.roundWins=[expected];paid.totalWin=expected;
const paidWorker=fixture(true);paidWorker.restore(paid);await flush();assert.equal(paidWorker.counters.finish,0);assert.equal(paidWorker.app.wonderBank.length,1);
const noBet=plain(pending);noBet.enabled=[false];
const noBetWorker=fixture(true);noBetWorker.restore(noBet);await flush();assert.equal(noBetWorker.app.wonderBank.length,0);assert.equal(noBetWorker.counters.finish,0);
const ready=fixture(true);ready.engine.reset();ready.app.phase='ready';assert.equal(ready.engine.afterCheckpointRestoreV247(),false);await flush();assert.equal(ready.counters.waits,0);assert.equal(ready.app.wonderBank.length,0);

// A foreground restore still waits for real browning. Cancellation invalidates it.
const cancelled=fixture();cancelled.restore(pending);await flush();assert.equal(cancelled.counters.waits,1);assert.equal(cancelled.app.wonderBank.length,0);
cancelled.engine.reset();cancelled.app.token++;cancelled.app.phase='ready';cancelled.release();await flush();
assert.equal(cancelled.app.wonderBank.length,0);assert.equal(cancelled.app.paid[0],false);assert.equal(cancelled.counters.finish,0);

// The same host resumes an old 37-hole checkpoint with its former Sugar rule.
const old=fixture(true),oldStart=old.R.legacy.createDemo();let oldState=oldStart.draws.reduce((s,n)=>old.R.legacy.draw(s,n),oldStart.state);
assert.ok(oldState.bakedCount>=30);const legacy=plain(pending);legacy.engines[0].state=plain(oldState);legacy.draws=[...oldState.draws];
old.restore(legacy);await flush();assert.equal(old.engine.state.cells.length,37);assert.equal(old.app.wonderBank.length,1);assert.equal(old.app.paid[0],true);assert.equal(old.app.roundWins[0],oldState.totalHundredths);

console.log('CASTELLA_V250_CHECKPOINT_PASS',JSON.stringify({eighthBallNoReplay:true,sixthBallSugar:true,oneAward:true,paidAndNoBetGuards:true,cancelledForeground:true,legacy37:true,win:expected}));

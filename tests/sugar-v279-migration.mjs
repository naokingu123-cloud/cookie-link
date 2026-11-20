import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import '../assets/sugar-challenge-rules-v254.js';
import {createSugarChallengeLedger} from '../server-sugar-challenge-v254.mjs';

const R=globalThis.SugarChallengeRulesV254,copy=value=>JSON.parse(JSON.stringify(value));
const LOW=[1,2,3,4,5,6,7,8],LUCKY=[20,19,18,15,5,3,7,17],HIGH=[25,24,23,22,21,20,4,1];
const old=(revision=270,extra={})=>R.create({id:'old-quote',roundId:'old-round',station:1,sugarValues:[721,1,1,1,1],cardId:'standard',multiplier:3,rulesRevision:revision,seed:279,...extra});
const draw=(state,numbers)=>numbers.reduce((s,n)=>R.advance(s,n,{roundId:s.roundId,ballIndex:s.draws.length+1}),state);

// The old zero-ball template reproduces the reported low-gauge JPC. Updating
// its entry conditions must keep its announced identity, selected card, JP,
// multiplier and quoted Sugar values, including pre-500-step amounts.
for(const revision of [254,268,270])for(const cardId of ['standard','lucky','wide']){
 const before=old(revision,{cardId}),saved=R.snapshot(before),updated=R.upgradeUnstarted(saved);
 assert.equal(draw(before,LOW).jpcQualified,true,'legacy reproduction');
 assert.equal(updated.rulesRevision,271);assert.equal(updated.quoteRevision,revision);
 for(const key of ['id','roundId','station','seed','cardId','multiplier','sugarValues','jpBase','jpAmount'])assert.deepEqual(updated[key],before[key],key+' remains issued');
 assert.equal(updated.cashBase,updated.jpBase,'new unstarted entry uses the current unmultiplied cash basis');
 assert.equal(R.cardFor(updated).lowMax,null);
 assert.equal(R.cardFor(updated).highMin,cardId==='wide'?130:139);
 assert.deepEqual(R.cardFor(updated).luckySums,cardId==='lucky'?[77,88]:[77]);
 const low=draw(updated,LOW);assert.equal(low.jpcQualified,false);assert.equal(low.cashWin,Math.floor(before.jpBase/5));
 const early=draw(updated,LUCKY.slice(0,5));assert.equal(early.qualifyingSum,77);assert.equal(early.qualifyingDrawCount,5);
 assert.deepEqual(draw(early,LUCKY.slice(5)).jpcTicket,early.jpcTicket);
 assert.deepEqual(R.restore(R.snapshot(updated)),updated);assert.deepEqual(R.upgradeUnstarted(updated),updated,'migration is idempotent');
 assert.deepEqual(R.snapshot(before),saved,'the old immutable snapshot is untouched');
 const started=draw(before,[1]),finished=draw(before,LOW);
 for(const issued of [started,finished])assert.deepEqual(R.upgradeUnstarted(R.snapshot(issued)),issued,'issued old histories remain exact');
 assert.deepEqual(R.restore({...updated,jpBase:999999,jpAmount:999999,cashWin:999999}),updated,'cached monetary values cannot change the quote');
}
assert.equal(draw(R.upgradeUnstarted(old()),HIGH.slice(0,7)).qualifyingSum,139);
assert.equal(draw(R.upgradeUnstarted(old(270,{cardId:'wide'})),[25,24,23,22,21,14,1]).qualifyingSum,130);
assert.equal(draw(R.upgradeUnstarted(old()),[25,24,23,16]).jpcQualified,false);
assert.equal(draw(R.upgradeUnstarted(old(270,{cardId:'lucky'})),[25,24,23,16]).qualifyingSum,88);
assert.equal(R.upgradeUnstarted(null),null);
assert.equal(R.restore({...R.snapshot(old()),quoteRevision:254}),null);
assert.equal(R.restore({...R.snapshot(R.upgradeUnstarted(old())),quoteRevision:999}),null);

// Exercise the actual local bridge around the native Arcade class, not a
// synthetic setter: page restore, BET preparation, native balls and payout.
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const bundle=read('optimized/app-01.js'),begin=bundle.indexOf('class Arcade{'),end=bundle.indexOf('// Only the next HIT is simulated.',begin);
const arcadeSource=bundle.slice(begin,end)+'\nglobalThis.NativeArcade=Arcade;';
const KEY='local-sugar-challenge-v267';
const tokens=Array.from({length:5},(_,i)=>({id:i,sugarId:'saved:'+i,sourceRoundId:'source',game:0,value:100,challengeValue:i?1:721}));
const localStore=(state,extra={})=>new Map([[KEY,JSON.stringify({schema:268,bank:[],consumed:tokens,challenge:R.snapshot(state),settled:false,awardCount:0,openedAt:1000,roundSequence:1,tokenSequence:5,...extra})]]);
function boot(storage=new Map()){
 let randomCalls=0,visible=null;
 const store={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
 class Engine{constructor(){this.kind='fixture';}start(){}reset(){}previewDraw(){}enqueueBatch(){}}
 const context=vm.createContext({console,window:{SweetsEditionV255:{value:'local'},SweetsLocalDebugV258:{storage:store}},document:{getElementById:()=>null},debugForceRainbowSugar:false,RAINBOW_SUGAR_CHANCE:0,debugPayoutTarget:100,medalWin:(bet,h)=>Math.floor(bet*h/100),Date,Math,Number,Map});
 vm.runInContext(arcadeSource,context);
 const app=new context.NativeArcade({random:()=>{randomCalls++;return .25;},initialEngines:[Engine]});
 app.bets=[100];app.credit=10000;app.drawSource={ready:true,start({onNumber}){this.onNumber=onNumber;},reset(){},pause(){}};app.boostAfterDraws=()=>{};context.app=app;
 context.window.SweetsSugarChallengeV254={stampBank(){for(const [i,t]of app.wonderBank.entries())if(!t.sugarId)t.sugarId='native:'+i;},accept(s){visible=copy(s);},setExpanded(){}};
 vm.runInContext(read('assets/sugar-challenge-rules-v254.js'),context);context.window.SugarChallengeRulesV254=context.SugarChallengeRulesV254;
 vm.runInContext(read('assets/local-sugar-v267.js'),context);
 return {app,L:context.window.SweetsLocalSugarV267,storage,visible:()=>visible,randomCalls:()=>randomCalls};
}
function localFinish(h,numbers=LOW){
 assert.equal(h.app.start(),true);for(const number of numbers)assert.equal(h.app.drawSource.onNumber(number),true);
 h.app.roundWins=[25];h.app.finishRound();return h.L.describe();
}
for(const revision of [254,268,270]){
 const before=old(revision),storage=localStore(before);let h=boot(storage);
 assert.equal(h.randomCalls(),0,'restoring an unstarted quote does not reroll');
 assert.equal(h.L.describe().rulesRevision,271);assert.equal(h.L.describe().jpAmount,before.jpAmount);
 assert.deepEqual(JSON.parse(storage.get(KEY)).consumed,tokens);assert.equal(h.L.describe().bankCount,0);
 h=boot(storage);assert.equal(h.randomCalls(),0);assert.equal(h.L.describe().rulesRevision,271);
 const atBet=copy(h.visible().challenge);h.app.prepare();assert.deepEqual(h.visible().challenge,atBet,'manual-mode preparation keeps the updated quote');
 const result=localFinish(h);assert.equal(result.jpcQualified,false);assert.equal(result.cashWin,Math.floor(before.jpBase/5));
 assert.equal(h.app.totalWin,25+result.cashWin);const win=h.app.totalWin;h.app.finishRound();assert.equal(h.app.totalWin,win);
 assert.equal(h.app.beginPayout(),true);assert.equal(h.app.credit,10000+win);assert.equal(h.app.beginPayout(),false);assert.equal(h.app.credit,10000+win);
 assert.equal(JSON.parse(storage.get(KEY)).started,true);
 // An interrupted old local board retains its old issued quote. The local
 // board's existing restart policy clears its draw list; persist the fact it
 // already started so a second reload cannot mistake it for a new template.
 const pending=localStore(draw(before,[1,2]));const first=boot(pending),second=boot(pending);
 for(const resumed of [first,second]){assert.equal(resumed.L.describe().rulesRevision,revision);assert.equal(resumed.L.describe().started,true);assert.equal(resumed.randomCalls(),0);}
 const complete=boot(localStore(draw(before,LOW),{settled:true,awardCount:1}));
 assert.equal(complete.L.describe().active,false);assert.equal(complete.app.credit,10000);assert.equal(complete.L.describe().bankCount,0,'completed tokens are not reissued');
}
const fresh=boot();fresh.L.grantTestSugar();assert.equal(fresh.L.describe().rulesRevision,271);assert.equal(localFinish(fresh).jpcQualified,false);

// A server owner opts in only at an authoritative zero-ball BET boundary.
// Public reads and ordinary retry remain immutable; the update changes no
// wallet, receipt, FIFO token, chosen card/multiplier or random seed.
let seedCalls=0;
const ledger=(revision=null)=>createSugarChallengeLedger({now:()=>2000,randomSeed:()=>{seedCalls++;return 254;},...(revision?{rules:{...R,create:o=>R.create({...o,rulesRevision:revision,cardId:'standard',multiplier:3})}}:{})});
function oldPlayer(revision=270,roundId='old-round'){
 const p={playerId:'migration-player',wallet:{credit:10000,revision:7,initializationVersion:228},games:{},lifetimeWin:0,rounds:{}};
 const L=ledger(revision),source='earned';
 L.ingest(p,{roundId:source,locked:[101],tokens:tokens.map((t,i)=>({...t,sugarId:'earned:'+i,sourceRoundId:source}))});
 L.start(p,{roundId,station:1});return p;
}
for(const revision of [254,268,270]){
 const p=oldPlayer(revision),L=ledger(),before=copy(p),issued=L.publicState(p).challenge,seeds=seedCalls;
 assert.equal(L.start(p,{roundId:'old-round'}).changed,false);assert.deepEqual(p,before);
 const updated=L.start(p,{roundId:'old-round',refreshUnstarted:true});
 assert.equal(updated.changed,true);assert.equal(updated.upgraded,true);assert.equal(updated.started,false);assert.equal(updated.challenge.rulesRevision,271);
 assert.equal(updated.challenge.jpAmount,issued.jpAmount);assert.equal(seedCalls,seeds);
 assert.deepEqual(p.wallet,before.wallet);assert.deepEqual(p.sugarV254.receipts,before.sugarV254.receipts);assert.deepEqual(p.sugarV254.rounds['old-round'].consumed,before.sugarV254.rounds['old-round'].consumed);
 assert.equal(p.sugarV254.challengeSequence,before.sugarV254.challengeSequence);
 const once=copy(p);assert.equal(L.start(p,{roundId:'old-round',refreshUnstarted:true}).changed,false);assert.deepEqual(p,once);
 const paid=L.advance(p,{roundId:'old-round',balls:LOW}),cash=Math.floor(issued.jpBase/5);
 assert.equal(paid.cashPaid,cash);assert.equal(paid.challenge.jpcQualified,false);assert.equal(p.wallet.credit,10000+cash);
 assert.equal(L.advance(p,{roundId:'old-round',balls:LOW}).changed,false);assert.equal(p.wallet.credit,10000+cash);
 const completed=copy(p);assert.equal(L.start(p,{roundId:'old-round',refreshUnstarted:true}).changed,false);assert.deepEqual(p,completed);
 const cancelled=L.cancel(p,'old-round');assert.equal(cancelled.cashReversed,cash);assert.equal(cancelled.restoredCount,5);assert.equal(p.wallet.credit,10000);
 assert.equal(L.start(p,{roundId:'next-round'}).challenge.rulesRevision,271);
 const mid=oldPlayer(revision);ledger(revision).advance(mid,{roundId:'old-round',balls:[1,2]});const frozen=copy(mid);
 assert.equal(L.start(mid,{roundId:'old-round',refreshUnstarted:true}).changed,false);assert.deepEqual(mid,frozen);
 assert.equal(L.advance(mid,{roundId:'old-round',balls:LOW}).challenge.jpcQualified,true,'issued old history keeps its legacy outcome');
}

// The real payout bridge supplies the opt-in from the physical round, including
// cold-start hydration. A PLAYING round with zero reported balls must not be
// silently retargeted merely because the Sugar snapshot is still ready.
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'sugar-v279-'));
try{
 const cases=[{id:'bet-empty',phase:'BETTING',balls:[],expected:271},{id:'playing-empty',phase:'PLAYING',balls:[],expected:270},{id:'playing-history',phase:'PLAYING',balls:[1,2],expected:270}];
 const machines={},core={machines:{}};
 for(const scenario of cases){
  const p=oldPlayer(270,scenario.id);machines[scenario.id]={id:scenario.id,players:{[p.playerId]:p}};
  core.machines[scenario.id]={id:scenario.id,stationsV235:{seats:[{kind:'human',playerId:p.playerId}]},history:[],round:{id:scenario.id,phase:scenario.phase,balls:scenario.balls.map((number,index)=>({number,index:index+1})),eligiblePlayerIds:[p.playerId],betOpenedAt:1000,participants:{}}};
 }
 fs.writeFileSync(path.join(directory,'payout-control-v3.json'),JSON.stringify({version:3,machines}));
 process.env.SWEETS_DATA_DIR=directory;
 await import('../server-payout-preload-v3.mjs');
 const bridge=globalThis[Symbol.for('sweets-link.payout-v3.wallet')];bridge.attachCore(core);
 for(const scenario of cases){
  const view=bridge.sugarState(scenario.id,'migration-player').challenge;
  assert.equal(view.rulesRevision,scenario.expected,scenario.id+' authoritative hydrate');assert.deepEqual(view.draws,scenario.balls);
 }
 const persisted=JSON.parse(fs.readFileSync(path.join(directory,'payout-control-v3.json'),'utf8'));
 assert.equal(persisted.machines['bet-empty'].players['migration-player'].sugarV254.rounds['bet-empty'].state.rulesRevision,271,'migration commits before a later reconnect');
 const current=core.machines['bet-empty'];current.round.phase='PLAYING';current.round.balls=LOW.map((number,index)=>({number,index:index+1}));bridge.sugarBall(current,current.round);
 const paid=bridge.publicControl('bet-empty','migration-player');assert.equal(paid.sugarV254.challenge.jpcQualified,false);assert(paid.sugarV254.challenge.cashPaid>0);
 const credit=paid.wallet.credit;bridge.sugarBall(current,current.round);assert.equal(bridge.publicControl('bet-empty','migration-player').wallet.credit,credit);
}finally{fs.rmSync(directory,{recursive:true,force:true});}

console.log('SUGAR_V279_MIGRATION_PASS: old-ready low-JPC reproduction, zero-ball owner migration without JP reroll/reprice, native local payout/reload, issued-history preservation, real server BET/PLAYING hydration, idempotent settlement and cancellation');

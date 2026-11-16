import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const [bundle,core,patch221,patch224,upgrade,payout,controller,installFixture,creditFixture]=await Promise.all([
 read('optimized/app-01.js'),read('assets/shared-machine-core-v196.js'),read('assets/shared-core-patch-v221.js'),
 read('assets/shared-core-patch-v224.js'),read('assets/cookie-upgrade-patches.js'),
 process.env.IMMEDIATE_BET_PAYOUT?readFile(process.env.IMMEDIATE_BET_PAYOUT,'utf8'):read('assets/server-payout-control-v3.js'),
 process.env.IMMEDIATE_BET_CONTROLLER?readFile(process.env.IMMEDIATE_BET_CONTROLLER,'utf8'):read('assets/shared-client-controller-v224.js'),
 read('tests/shared-v227-client-install.mjs'),read('tests/shared-v228-credit-rebet.mjs')
]);
function section(source,start,end){
 const a=source.indexOf(start),b=source.indexOf(end,a);assert.ok(a>=0&&b>a,'fixture/source boundary: '+start);return source.slice(a,b);
}
const patches={window:{},console:{info(){},warn(){}}};vm.createContext(patches);
for(const source of [upgrade,patch221,patch224])vm.runInContext(source,patches);
const game=patches.window.CookieUpgradePatch.patch(bundle),coreSource=patches.window.SweetsSharedCorePatchV224.patch(core);
const engineSource=section(game,'const SPECIAL_RATE=','// Only the next HIT is simulated.');
const drawSource=section(game,'const LOCAL_EIGHT_DRAW_ALLOWED=','async function loadCookieRoulette()');
const flush=()=>new Promise(resolve=>setImmediate(resolve)),copy=value=>JSON.parse(JSON.stringify(value));
const lineup=['cookie','choco','candy','gelato','winery','popcorn','jelly','stick','castella'];
// The v227 fixture runs actual Arcade, default engines, Client.install, source
// patches, payout and controller. v228 adds the actual nine-slot controls and a
// server wallet ledger. Only transport timing/errors are replaced below.
const fullInstall=new Function('assert','vm','engineSource','drawSource','coreSource','payout','controller','flush','copy','options',
 section(installFixture,'function harness(','\nasync function stable(')+'\nreturn harness(options);');
const nineSlots=new Function('assert','vm','build','lineup','engineSource','drawSource','coreSource','payout','controller','flush','copy','options',
 section(creditFixture,'\nfunction harness(','\nconst joins=')+'\nreturn harness(options);');
function harness(options={}){
 let h,releaseSettlement=null,joinFailure=options.joinFailure||'',failures=options.failures??1;
 const sent=[];
 function build(...args){
  const runner=args[1],originalCreate=runner.createContext;
  args[1]={...runner,createContext(context){
   const result=originalCreate.call(runner,context),fetch=context.fetch;
   if(options.oldSettlement)context.localStorage.setItem('sweets-shared-normal-settlements-v225',JSON.stringify({
    'previous-round':{roundId:'previous-round',totalWin:20,creditAfter:1000020,digest:'previous',payoutV3:{version:3,roundBet:27000,roundWin:20,games:[]}}
   }));
   context.fetch=async(url,request={})=>{
    const path=new URL(url).pathname,payload=request.body?JSON.parse(request.body):null;
    if(path.endsWith('/round/settle')&&payload.roundId==='previous-round'&&options.oldSettlement){
     await new Promise(resolve=>{releaseSettlement=resolve;});
    }
    if(path.endsWith('/round/join')){
     sent.push({at:context.Date.now(),payload:copy(payload)});
     if(joinFailure&&failures-->0){
      const code=joinFailure,status=code==='gateway_unavailable'?503:409;
      await new Promise(resolve=>context.setTimeout(resolve,options.failureDelay||20));
      const data={ok:false,error:code};
      if(code==='insufficient_credit')Object.assign(data,{serverTime:context.Date.now(),round:copy(h.round),payoutControlV3:{version:3,playerId:'PLAYER',updatedAt:context.Date.now(),effectiveRate:90,wallet:{...h.getWallet(),source:'initial',lastRoundId:null,reservedRoundId:null}}});
      return {ok:false,status,headers:{get(){return null;}},json:async()=>copy(data)};
     }
     const response=await fetch(url,request);
     if(options.loseSuccessfulAck){return {ok:false,status:503,headers:{get(){return null;}},json:async()=>({ok:false,error:'gateway_unavailable'})};}
     return response;
    }
    return fetch(url,request);
   };
   return result;
  }};
  return fullInstall(...args,{joinDelay:options.joinDelay||5});
 }
 h=nineSlots(assert,vm,build,lineup,engineSource,drawSource,coreSource,payout,controller,flush,copy,options);
 return Object.assign(h,{sent,releaseOldSettlement(){assert.ok(releaseSettlement,'old settlement is waiting');releaseSettlement();}});
}
async function ready(h){await h.advance(5000);assert.equal(h.control.stable(),true);assert.equal(h.control.isReady(),true);assert.equal(h.errors.length,0);}
async function editableBet(h,id){h.control.setAutoRebet(false);h.betting(id);await h.advance(100);assert.equal(h.control.canEditBets(h.app),true);}
const balance=(h,value)=>{assert.equal(h.app.credit,value,'available CREDIT');assert.equal(h.app.displayCredit,value,'displayed CREDIT');};
const reservation=(h,value)=>assert.equal(h.control.describe().localReserved,value,'only one local reservation');
const button=h=>h.context.document.getElementById('shared-bet-v228');

const manual=harness({joinDelay:2500});await ready(manual);await editableBet(manual,'manual-immediate');
manual.context.slots[0].addBet.click();balance(manual,999900);reservation(manual,100);
assert.equal(manual.app.bets[0],3100,'native 100 BET button changes the selected amount');
manual.context.slots[1].oneBet.click();balance(manual,999899);reservation(manual,101);
assert.equal(manual.app.setBet(0,3050),true);balance(manual,999949);reservation(manual,51);
// Even another GET with the same wallet revision must keep the draft withheld.
const refresh=manual.control.refreshNow();await manual.advance(20);await refresh;
balance(manual,999949);reservation(manual,51);
const clickAt=manual.now;button(manual).click();
balance(manual,972949);reservation(manual,27051);
assert.equal(manual.sent.length,1,'manual click submits immediately without waiting for another GET/poll');
assert.equal(manual.sent[0].at,clickAt);assert.equal(manual.sent[0].payload.creditBefore,1000000);
assert.equal(manual.sent[0].payload.creditAfterBet,972949);assert.equal(manual.sent[0].payload.totalBet,27051);
assert.equal(manual.app.setBet(0,1),false,'an in-flight submitted reservation is locked');
await manual.advance(1000);balance(manual,972949);
await manual.advance(2000);balance(manual,972949);reservation(manual,0);
assert.equal(manual.control.describe().joinedRoundId,'manual-immediate');
const repeat=manual.machine.client.join(copy(manual.sent[0].payload));await manual.advance(2600);manual.machine.client.accept(await repeat);
balance(manual,972949);assert.equal(manual.getWallet().credit,972949,'same server reservation is not charged twice');
manual.playing();await manual.advance(1400);assert.equal(manual.app.phase,'playing');balance(manual,972949);
assert.equal(manual.machine.active?.roundId,'manual-immediate');assert.equal(manual.errors.length,0,JSON.stringify(manual.errors));

const auto=harness({joinDelay:2500});await ready(auto);assert.equal(auto.control.describe().autoRebet,true,'AUTO REBET starts ON');
await editableBet(auto,'auto-immediate');auto.context.slots[0].addBet.click();balance(auto,999900);
auto.control.setAutoRebet(true);balance(auto,972900);reservation(auto,27100);
assert.equal(auto.sent.length,1,'turning AUTO on reserves only the unreserved remainder immediately');
assert.equal(auto.sent[0].payload.totalBet,27100);await auto.advance(3000);balance(auto,972900);reservation(auto,0);
const defaultAuto=harness({joinDelay:2500});await ready(defaultAuto);defaultAuto.betting('default-auto');await defaultAuto.advance(1000);
assert.equal(defaultAuto.sent.length,1);balance(defaultAuto,973000);assert.equal(defaultAuto.sent[0].payload.totalBet,27000);

const refund=harness();await ready(refund);await editableBet(refund,'refund-draft');
refund.context.slots[0].addBet.click();refund.context.slots[1].oneBet.click();balance(refund,999899);
assert.equal(refund.app.setBet(0,3000),true);balance(refund,999999);reservation(refund,1);
assert.equal(refund.app.setBet(1,0),true);balance(refund,1000000);reservation(refund,0);
assert.equal(refund.app.setBet(0,0),true);balance(refund,1000000,'reducing an unreserved default stake cannot invent credit');
refund.context.slots[0].addBet.click();balance(refund,999900);reservation(refund,100);
refund.round.betClosesAt=refund.now+30;refund.snapshot();await refund.advance(150);
balance(refund,1000000);reservation(refund,0);assert.equal(refund.sent.length,0,'unsubmitted expired draft is refunded locally');

const low=harness({openingCredit:100});await ready(low);await editableBet(low,'exact-budget');
for(let index=0;index<9;index++)assert.equal(low.app.setBet(index,0),true);
low.context.slots[0].addBet.click();balance(low,0);reservation(low,100);
assert.equal(low.context.slots[0].oneBet.disabled,true);assert.equal(low.context.slots[0].addBet.disabled,true);
assert.equal(low.app.setBet(0,101),false);assert.equal(button(low).disabled,false,'reserved funds still fund their own submission');
button(low).click();balance(low,0);await low.advance(1000);balance(low,0);assert.equal(low.getWallet().credit,0);

for(const code of ['insufficient_credit','wait_next_bet']){
 const rejected=harness({joinFailure:code});await ready(rejected);await editableBet(rejected,'rejected-'+code);
 rejected.context.slots[0].addBet.click();balance(rejected,999900);button(rejected).click();balance(rejected,972900);
 await rejected.advance(50);balance(rejected,1000000);reservation(rejected,0);
 assert.equal(rejected.control.canEditBets(rejected.app),true);assert.equal(rejected.getWallet().credit,1000000);
 assert.equal(rejected.app.setBet(0,3000),true);balance(rejected,1000000,'a rejected reservation cannot be refunded a second time');
}

const retry=harness({joinFailure:'gateway_unavailable'});await ready(retry);await editableBet(retry,'retry-reservation');
button(retry).click();balance(retry,973000);await retry.advance(50);balance(retry,973000);reservation(retry,27000);
assert.equal(retry.control.canEditBets(retry.app),false,'an ambiguous HTTP failure keeps its money reserved');
await retry.advance(2500);balance(retry,973000);reservation(retry,0);
assert.equal(retry.sent.length,2);assert.deepEqual(retry.sent[1].payload,retry.sent[0].payload,'retry uses the identical stake and ownership token');
assert.equal(retry.ledger.filter(row=>row.kind==='bet').reduce((sum,row)=>sum+row.delta,0),27000);

const lost=harness({loseSuccessfulAck:true});await ready(lost);await editableBet(lost,'lost-success-ack');
button(lost).click();balance(lost,973000);await lost.advance(1800);balance(lost,973000);reservation(lost,0);
assert.equal(lost.control.describe().joinedRoundId,'lost-success-ack','the matching server snapshot confirms an accepted debit once');

const expired=harness({joinFailure:'gateway_unavailable',failures:20});await ready(expired);await editableBet(expired,'expired-unknown');
button(expired).click();balance(expired,973000);await expired.advance(50);expired.playing();await expired.advance(1400);
balance(expired,1000000);reservation(expired,0);assert.equal(expired.control.describe().pendingBetRoundId,null);
assert.equal(expired.control.canEditBets(expired.app),true,'authoritative closed round without a participant releases an unaccepted attempt');

const restored=harness({oldSettlement:true});await restored.advance(1500);restored.control.setAutoRebet(false);
restored.context.slots[0].addBet.click();balance(restored,999900);reservation(restored,100);
restored.releaseOldSettlement();await restored.advance(1500);balance(restored,999920);reservation(restored,100);
assert.equal(restored.app.setBet(0,3000),true);balance(restored,1000020);reservation(restored,0);
assert.equal(restored.getWallet().credit,1000020,'old settlement ACK plus a new draft cannot manufacture a second refund');

for(const h of [manual,auto,defaultAuto,refund,low,retry,lost,expired,restored])assert.equal(h.errors.length,0,JSON.stringify(h.errors));
console.log('Immediate BET: actual slot buttons/manual/AUTO, single debit, delayed/lost ACK, retry, rejection/expiry refund, exact budget and restored settlement wallet passed');

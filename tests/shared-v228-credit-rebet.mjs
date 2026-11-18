import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const [bundle,core,patch221,patch224,payout,fixtureSource,upgrade,controller,lineupSource]=await Promise.all([
 read('optimized/app-01.js'),read('assets/shared-machine-core-v196.js'),read('assets/shared-core-patch-v221.js'),
 read('assets/shared-core-patch-v224.js'),read('assets/server-payout-control-v3.js'),read('tests/shared-v227-client-install.mjs'),
 process.env.CREDIT_REBET_UPGRADE?readFile(process.env.CREDIT_REBET_UPGRADE,'utf8'):read('assets/cookie-upgrade-patches.js'),
 process.env.CREDIT_REBET_CONTROLLER?readFile(process.env.CREDIT_REBET_CONTROLLER,'utf8'):read('assets/shared-client-controller-v224.js'),
 read('assets/lineups-v91.js')
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
// Reuse the existing full-install clock, DOM and real Client fixture. The only
// adaptations are ten production engine slots and the server wallet contract;
// the actual Arcade, core patches, controller and payout module run unchanged.
const build=new Function('assert','vm','engineSource','drawSource','coreSource','payout','controller','flush','copy',
 section(fixtureSource,'function harness(','\nasync function stable(')+'\nreturn harness();');
const lineupContext={window:{},location:{search:''},URLSearchParams,
 document:{documentElement:{dataset:{},toggleAttribute(){}},addEventListener(){},head:{}},
 MutationObserver:class{observe(){}}};
vm.runInNewContext(lineupSource,lineupContext);
const lineup=Array.from(lineupContext.window.SweetsLineup.ids);
assert.equal(lineup.length,10,'the production ALL lineup includes ten games');
assert.equal(lineup.at(-1),'dango');assert.equal(lineupContext.window.SweetsLineup.catalog.dango.record,10);

function harness({openingCredit=1000000}={}){
 let initial,installed=false,credit=openingCredit,revision=1,lastRoundId=null,reservedRoundId=null,source='initial';
 const reservations=new Map(),settled=new Map(),ledger=[];
 function decorate(node){
  const classes=new Set(),attributes=new Map(),nativeAppend=node.append.bind(node);node.children=[];
  node.append=(...children)=>{for(const child of children){node.children.push(child);if(child&&typeof child==='object')child.parentNode=node;}nativeAppend(...children);};
  node.setAttribute=(key,value)=>attributes.set(key,String(value));node.getAttribute=key=>attributes.get(key)??null;
  node.classList={add(...items){items.forEach(item=>classes.add(item));},remove(...items){items.forEach(item=>classes.delete(item));},contains:item=>classes.has(item),
   toggle(item,force){const present=force??!classes.has(item);if(present)classes.add(item);else classes.delete(item);return present;}};
  node.click=()=>{if(!node.disabled)node.onclick?.();};return node;
 }
 const runner={
  createContext(context){
   const create=context.document.createElement;context.document.createElement=tag=>decorate(create(tag));
   decorate(context.document.body);decorate(context.document.head);
   for(const id of ['bet-countdown','credit','total-bet']){const node=context.document.createElement('div');node.id=id;context.document.body.append(node);}
   context.SweetsLineup={ids:[...lineup],chosen:[...lineup]};context.units=[5,10,20,50,100,500];context.unit=Array(lineup.length).fill(4);
   // Match the native HUD's disabled assignment. The installed controller must
   // restore the budget guard after every redraw, not only on the initial click.
   context.hud=target=>{for(const slot of context.slots||[])for(const button of [slot.cycle,slot.addBet,slot.oneBet])button.disabled=target.phase!=='ready';};
   const onChange=context.onGameChange;context.onGameChange=target=>{onChange(target);context.hud(target);};
   context.scheduleUI=target=>context.hud(target||context.app);
   const fetch=context.fetch;
   context.fetch=async(url,options={})=>{
    const path=new URL(url).pathname,payload=options.body?JSON.parse(options.body):null;
    if(path.endsWith('/round/join')){
     const before=reservations.get(payload.roundId)||0,delta=payload.totalBet-before;
     assert.ok(credit>=delta,'the client must never submit an unaffordable reservation');
     if(delta){credit-=delta;revision++;}reservations.set(payload.roundId,payload.totalBet);
     source='bet';lastRoundId=reservedRoundId=payload.roundId;ledger.push({kind:'bet',roundId:payload.roundId,delta,credit});
    }else if(path.endsWith('/round/settle')){
     if(!settled.has(payload.roundId)){credit+=payload.totalWin;revision++;settled.set(payload.roundId,credit);}
     source='client';lastRoundId=payload.roundId;reservedRoundId=null;ledger.push({kind:'settle',roundId:payload.roundId,credit});
    }
    const control={version:3,playerId:'PLAYER',effectiveRate:90,mode:'auto',updatedAt:context.Date.now(),wallet:{credit,revision,source,lastRoundId,reservedRoundId}};
    const response=await fetch(url,options),data=await response.json();
    if(path.endsWith('/state')||path.endsWith('/round/join')||path.endsWith('/round/settle'))data.payoutControlV3=control;
    if(path.endsWith('/round/join'))data.round.participant.creditAfterBet=control.wallet.credit;
    if(path.endsWith('/round/settle'))data.settlement.creditAfter=control.wallet.credit;
    return {...response,json:async()=>copy(data)};
   };
   return vm.createContext(context);
  },
  runInContext(code,context,options){
   if(code.startsWith('globalThis.app=new Arcade(')){
    const result=vm.runInContext('globalThis.app=new Arcade({random,sleep:ms=>new Promise(resolve=>setTimeout(resolve,ms)),onChange:onGameChange,onEvent:onGameEvent,initialEngines:SweetsLineup.ids.map(id=>id==="choco"?ChocoDigEngine:id==="candy"?CandyCarnivalEngine:Engine)});',context,options);
    initial={credit:context.app.credit,displayCredit:context.app.displayCredit,bets:Array.from(context.app.bets)};return result;
   }
   if(code===coreSource&&!installed){
    installed=true;
    context.slots=lineup.map((id,i)=>{
     const button=()=>context.document.createElement('button'),slot={i,cycle:button(),addBet:button(),oneBet:button(),particles:{replaceChildren(){}}};
     slot.cycle.onclick=()=>{context.unit[i]=(context.unit[i]+1)%context.units.length;context.scheduleUI(context.app);};
     slot.addBet.onclick=()=>context.app.setBet(i,context.app.bets[i]+context.units[context.unit[i]]);
     slot.oneBet.onclick=()=>context.app.setBet(i,context.app.bets[i]+1);return slot;
    });
   }
   return vm.runInContext(code,context,options);
  }
 };
 const h=build(assert,runner,engineSource,drawSource,coreSource,payout,controller,flush,copy);
 return Object.assign(h,{initial,ledger,getWallet:()=>({credit,revision}),
  serverCompletesBeforeStart(win){
   assert.equal(h.app.phase,'ready');assert.equal(h.machine.active,null);
   credit+=win;revision++;source='server-worker';lastRoundId=h.round.id;reservedRoundId=null;settled.set(h.round.id,credit);
   h.round.phase='COMPLETE';h.round.canBet=false;h.round.participant.settlement={totalWin:win,creditAfter:credit};h.snapshot();
  }
 });
}

const joins=h=>h.events.filter(event=>event.kind==='join');
async function ready(h){
 await h.advance(5000);assert.equal(h.control.stable(),true);assert.equal(h.control.isReady(),true);
 assert.equal(h.app.engines.length,lineup.length);assert.equal(h.errors.length,0,JSON.stringify(h.errors));
}
async function bet(h,id,expectedCredit,expectedTotal=30000){
 h.betting(id);await h.advance(1200);
 const requests=joins(h).filter(event=>event.payload.roundId===id);assert.equal(requests.length,1,'one automatic reservation per round');
 assert.equal(requests[0].payload.totalBet,expectedTotal);assert.equal(requests[0].payload.bets.length,lineup.length);assert.equal(h.control.describe().joinedRoundId,id);
 assert.equal(h.app.credit,expectedCredit);assert.equal(h.app.displayCredit,expectedCredit);
 return requests[0].payload;
}
async function finish(h,id,win,expectedCredit){
 h.playing();await h.advance(1400);assert.equal(h.machine.active?.roundId,id);assert.equal(h.app.phase,'playing');
 assert.equal(h.app.credit,expectedCredit-win,'starting the accepted round must not debit its BET again');
 // Fix the game outcomes, then use the real Arcade result and payout methods.
 // The engine-animation and eight-ball transport tests live in the existing suite.
 h.app.roundWins=[win,...Array(lineup.length-1).fill(0)];h.app.paid=Array(lineup.length).fill(true);h.app.draws=[3,7,11,15,19,23,4,8];
 h.machine.active.delivered=8;h.round.phase='COMPLETE';h.round.balls=h.app.draws.map((number,index)=>({index:index+1,number}));
 h.app.finishRound();assert.equal(h.app.phase,'result');h.app.advanceResult(1800);h.app.advancePayout(10000);
 assert.equal(h.app.credit,expectedCredit,'native payout must add WIN exactly once');assert.equal(h.app.displayCredit,expectedCredit);
 assert.equal(h.app.beginPayout(),false,'repeated payout must not add WIN again');
 await h.advance(2200);
 const settlements=h.events.filter(event=>event.kind==='settle'&&event.payload.roundId===id);
 assert.equal(settlements.length,1);assert.equal(settlements[0].payload.totalWin,win);assert.equal(settlements[0].payload.creditAfter,expectedCredit);
 assert.equal(h.getWallet().credit,expectedCredit);assert.equal(h.app.credit,expectedCredit);assert.equal(h.app.displayCredit,expectedCredit);
 assert.equal(h.app.phase,'ready');assert.equal(h.machine.active,null);assert.equal(h.control.isReady(),true);
 assert.equal(h.errors.length,0,JSON.stringify(h.errors));
}

const h=harness();
assert.deepEqual(h.initial,{credit:1000000,displayCredit:1000000,bets:Array(lineup.length).fill(3000)},'the real patched constructor must show one million and ten default 3,000 BETs before any server hydration');
await ready(h);
const first=await bet(h,'credit-first',970000);
const walletRevision=h.getWallet().revision,retry=h.machine.client.join(copy(first));await h.advance(20);h.machine.client.accept(await retry);
assert.equal(h.getWallet().credit,970000);assert.equal(h.getWallet().revision,walletRevision);
assert.equal(h.ledger.filter(row=>row.roundId==='credit-first'&&row.kind==='bet').reduce((sum,row)=>sum+row.delta,0),30000);
assert.equal(h.app.credit,970000,'replaying the same acknowledged reservation must preserve its authoritative balance');
assert.equal(h.app.setBet(0,1),false,'accepted reservations lock the editable BET controls');
await finish(h,'credit-first',5000,975000);
await bet(h,'credit-second',945000);await finish(h,'credit-second',7000,952000);

for(let i=0;i<lineup.length;i++)assert.equal(h.app.setBet(i,0),true);
const beforeZero=joins(h).length;h.betting('explicit-zero');await h.advance(1200);
assert.equal(joins(h).length,beforeZero,'setting all ten BETs to zero must not restore the previous 30,000 stake');
assert.equal(h.app.credit,952000);assert.deepEqual(Array.from(h.app.bets),Array(lineup.length).fill(0));
assert.equal(h.control.betStatus().label,'BETを設定してください');
assert.equal(h.control.describe().autoRebet,true,'automatic REBET is on by default');
assert.equal(h.context.document.getElementById('shared-auto-rebet-v228').checked,true);

assert.equal(h.app.setBet(0,100),true);assert.equal(h.app.setBet(1,200),true);
h.app.locked=Array(lineup.length).fill(9999);h.app.enabled=Array(lineup.length).fill(false);
const canonical=await bet(h,'canonical-selection',951700,300);
assert.deepEqual(Array.from(canonical.bets),[100,200,...Array(lineup.length-2).fill(0)]);
assert.deepEqual(Array.from(canonical.locked),Array.from(canonical.bets),'previous round locks cannot inflate the next BET');
assert.deepEqual(Array.from(canonical.enabled),[true,true,...Array(lineup.length-2).fill(false)],'stale enabled flags cannot hide the displayed BET');

const low=harness({openingCredit:100});await ready(low);
assert.equal(low.app.credit,100);assert.equal(low.app.displayCredit,100);
low.control.setAutoRebet(false);assert.equal(low.control.describe().autoRebet,false);
assert.equal(low.context.document.getElementById('shared-auto-rebet-v228').checked,false);
low.betting('manual-budget');await low.advance(1200);assert.equal(joins(low).length,0);
const manual=low.context.document.getElementById('shared-bet-v228');
assert.equal(manual.disabled,true,'the 30,000 BET button is disabled at CREDIT 100');
low.context.hud(low.app);
for(const slot of low.context.slots)for(const button of [slot.addBet,slot.oneBet]){
 assert.equal(button.disabled,true,'native HUD redraw must not re-enable an unaffordable increase');
 assert.equal(button.getAttribute('aria-disabled'),'true');assert.equal(button.classList.contains('shared-bet-disabled'),true);
}
assert.ok(low.context.document.head.children.some(node=>node.textContent?.includes('.shared-bet-disabled{filter:grayscale(1)')),'disabled budget buttons receive the installed gray style');
for(let i=0;i<lineup.length;i++)assert.equal(low.app.setBet(i,0),true,'reducing an already unaffordable selection remains possible');
assert.equal(low.app.setBet(0,-1),false);assert.equal(low.app.setBet(0,90),true);assert.equal(low.app.setBet(1,11),false);
assert.equal(low.app.setBet(1,9),true);assert.equal(low.context.slots[1].oneBet.disabled,false);
low.context.slots[1].oneBet.click();assert.equal(low.app.bets[1],10);
assert.equal(low.context.slots[1].oneBet.disabled,true);low.context.slots[1].oneBet.click();assert.equal(low.app.bets[1],10,'disabled click cannot exceed CREDIT');
assert.equal(low.app.setBet(0,91),false);assert.equal(low.app.setBet(0,Number.MAX_SAFE_INTEGER),false);
low.context.hud(low.app);assert.equal(manual.disabled,false,'an exactly affordable selection can be submitted explicitly with AUTO REBET off');
assert.equal(joins(low).length,0);manual.click();await low.advance(1200);
assert.equal(joins(low).length,1);assert.equal(joins(low)[0].payload.totalBet,100);
assert.equal(low.app.credit,0);assert.equal(low.app.displayCredit,0);assert.equal(low.getWallet().credit,0);
assert.equal(low.app.setBet(0,0),false,'reservation lock also rejects reductions after acknowledgement');
assert.equal(low.control.requestBet(),false,'a second manual request cannot reserve the same round again');
assert.equal(low.errors.length,0,JSON.stringify(low.errors));

const ended=harness();await ready(ended);await bet(ended,'ended-before-local-start',970000);
ended.control.setAutoRebet(false);ended.serverCompletesBeforeStart(1000);await ended.advance(2000);
ended.betting('manual-after-completed-reservation');await ended.advance(1200);
assert.equal(ended.machine.active,null);assert.equal(ended.app.phase,'ready');
assert.equal(ended.control.describe().joinedRoundId,'','a server-completed reservation cannot keep the next manual BET locked');
assert.equal(ended.control.canEditBets(ended.app),true);assert.equal(joins(ended).length,1,'AUTO REBET off waits for an explicit request');
assert.equal(ended.app.credit,971000,'the completed server wallet must replace the old reserved balance');
assert.equal(ended.control.requestBet(),true,'manual BET must recover even if the previous game never started locally');
await ended.advance(1200);assert.equal(joins(ended).length,2);assert.equal(ended.app.credit,941000);
assert.equal(ended.control.describe().joinedRoundId,'manual-after-completed-reservation');
assert.equal(ended.errors.length,0,JSON.stringify(ended.errors));

console.log('CREDIT/REBET: real ten-slot Arcade 1,000,000 -> 970,000, duplicate reservation, two WIN cycles, explicit zero, canonical selection, manual BET recovery and gray budget controls passed');

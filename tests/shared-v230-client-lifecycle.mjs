import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const [bundle,core,patch221,patch224,upgrade,payout,controller,installFixture,creditFixture,lineupSource]=await Promise.all([
 read('optimized/app-01.js'),read('assets/shared-machine-core-v196.js'),read('assets/shared-core-patch-v221.js'),
 read('assets/shared-core-patch-v224.js'),read('assets/cookie-upgrade-patches.js'),
 process.env.CLIENT_LIFECYCLE_PAYOUT?readFile(process.env.CLIENT_LIFECYCLE_PAYOUT,'utf8'):read('assets/server-payout-control-v3.js'),
 process.env.CLIENT_LIFECYCLE_CONTROLLER?readFile(process.env.CLIENT_LIFECYCLE_CONTROLLER,'utf8'):read('assets/shared-client-controller-v224.js'),
 read('tests/shared-v227-client-install.mjs'),read('tests/shared-v228-credit-rebet.mjs'),read('assets/lineups-v91.js')
]);
function section(source,start,end){
 const a=source.indexOf(start),b=source.indexOf(end,a);assert.ok(a>=0&&b>a,'fixture/source boundary: '+start);return source.slice(a,b);
}
const patches={window:{},console:{info(){},warn(){}}};vm.createContext(patches);
for(const source of [upgrade,patch221,patch224])vm.runInContext(source,patches);
const game=patches.window.CookieUpgradePatch.patch(bundle),coreSource=patches.window.SweetsSharedCorePatchV224.patch(core);
const engineSource=section(game,'const SPECIAL_RATE=','// Only the next HIT is simulated.');
const drawSource=section(game,'const LOCAL_EIGHT_DRAW_ALLOWED=','async function loadCookieRoulette()');
const resultRenderer=section(game,'function renderRoundResult(','function nextFromResult(');
const recordMenu=section(game,'function openRecordMenu(','function paintRecordNumbers(');
const flush=()=>new Promise(resolve=>setImmediate(resolve)),copy=value=>JSON.parse(JSON.stringify(value));
const lineupContext={window:{},location:{search:''},URLSearchParams,
 document:{documentElement:{dataset:{},toggleAttribute(){}},addEventListener(){},head:{}},
 MutationObserver:class{observe(){}}};
vm.runInNewContext(lineupSource,lineupContext);
const lineup=Array.from(lineupContext.window.SweetsLineup.ids);
assert.equal(lineup.length,10,'the production ALL lineup includes ten games');
assert.equal(lineup.at(-1),'dango');
const fullInstall=new Function('assert','vm','engineSource','drawSource','coreSource','payout','controller','flush','copy',
 section(installFixture,'function harness(','\nasync function stable(')+'\nreturn harness();');
const allSlots=new Function('assert','vm','build','lineup','engineSource','drawSource','coreSource','payout','controller','flush','copy',
 section(creditFixture,'\nfunction harness(','\nconst joins=')+'\nreturn harness();');

function harness(){
 const stats={controlWrites:0,paints:0,clicks:0},panels=[];let context;
 function track(node,properties=['disabled','title','textContent'],attributes=true){
  for(const property of properties){let value=node[property];Object.defineProperty(node,property,{configurable:true,get:()=>value,set(next){stats.controlWrites++;value=next;}});}
  if(!attributes)return;
  const setAttribute=node.setAttribute;node.setAttribute=(...values)=>{stats.controlWrites++;return setAttribute(...values);};
  const toggle=node.classList.toggle;node.classList.toggle=(...values)=>{stats.controlWrites++;return toggle(...values);};
 }
 function build(...args){
  const runner=args[1];
  args[1]={...runner,runInContext(code,current,options){
   if(code===controller){
    context=current;
    const make=(id,classes=[])=>{const node=context.document.createElement('div');node.id=id;node.inert=false;node.classList.add(...classes);node.focus=()=>{};context.document.body.append(node);return node;};
    const screen=make('screen'),result=context.document.getElementById('round-result-layer');screen.append(result);
    for(const name of ['arena','games-deck','game','play-controls']){const panel=make('panel-'+name,[name]);screen.append(panel);panels.push(panel);}
    const protectedPanel=make('previously-inert',['game']);protectedPanel.inert=true;screen.append(protectedPanel);panels.push(protectedPanel);
    for(const id of ['result-games','result-status','result-next','record-menu-layer','record-close-top','open-record-menu']){const node=make(id);screen.append(node);}
    const click=node=>{for(let target=node;target;target=target.parentNode)if(target.inert)return false;if(node.disabled)return false;node.onclick?.();return true;};
    const tab=make('test-game-tab');tab.onclick=()=>stats.clicks++;tab.click=()=>click(tab);panels[1].append(tab);
    for(const slot of context.slots)for(const node of [slot.cycle,slot.addBet,slot.oneBet]){
     panels[3].append(node);node.click=()=>click(node);track(node);
    }
    Object.assign(context,{$:id=>context.document.getElementById(id),put:(id,value)=>{context.document.getElementById(id).textContent=String(value);},num:String,fitGoldenNumber(){},fitResultTotal(){},syncResultAuto(){},
     resultInert:[],recordInert:[],menuOpen:false,recordOffset:0,selectedTitle:'hello',recordBook:{data:{equipped:null}},playerLounge:null,
     renderRecordMenu(){},ensureNumberVoiceCredit(){},syncPause(){},isDirectJpcSugar:()=>false});
    vm.runInContext(resultRenderer+'\n'+recordMenu,context);
    // Native onGameChange coalesces result rendering into requestAnimationFrame.
    // Keep that ordering: an immediate render would hide the production bug.
    const previous=context.app.onChange;let paintPending=false;
    context.app.onChange=target=>{previous(target);if(paintPending)return;paintPending=true;context.requestAnimationFrame(()=>{paintPending=false;stats.paints++;context.renderRoundResult(target);});};
   }
   const evaluated=runner.runInContext(code,current,options);
   if(code===controller){track(context.document.getElementById('shared-bet-v228'));track(context.document.getElementById('shared-auto-rebet-v228'),['checked'],false);}
   return evaluated;
  }};
  return fullInstall(...args);
 }
 const h=allSlots(assert,vm,build,lineup,engineSource,drawSource,coreSource,payout,controller,flush,copy);
 return Object.assign(h,{stats,panels,tab:()=>context.document.getElementById('test-game-tab')});
}
async function ready(h){await h.advance(5000);assert.equal(h.control.stable(),true);assert.equal(h.control.isReady(),true);}
async function result(h,id,win=5000){
 h.betting(id);await h.advance(1200);h.playing();await h.advance(1400);assert.equal(h.app.phase,'playing');
 h.app.roundWins=[win,...Array(lineup.length-1).fill(0)];h.app.paid=Array(lineup.length).fill(true);h.app.draws=[3,7,11,15,19,23,4,8];
 h.machine.active.delivered=8;h.round.phase='COMPLETE';h.round.balls=h.app.draws.map((number,index)=>({index:index+1,number}));
 h.app.finishRound();await h.advance(20);
 assert.equal(h.context.document.getElementById('round-result-layer').hidden,false);
 assert.ok(h.panels.every(panel=>panel.inert),'the real result renderer owns the input lock');
 assert.equal(h.tab().click(),false,'the result modal correctly blocks background input while visible');
 h.app.advanceResult(1800);h.app.advancePayout(10000);
}
function unlocked(h){
 assert.equal(h.app.phase,'ready');assert.equal(h.context.document.getElementById('round-result-layer').hidden,true);
 assert.ok(h.panels.slice(0,4).every(panel=>!panel.inert),'ending a result must restore all main screen input');
 assert.equal(h.panels[4].inert,true,'a pre-existing unrelated input lock must stay in place');
 const before=h.stats.clicks;assert.equal(h.tab().click(),true);assert.equal(h.stats.clicks,before+1,'a real background tab receives its click again');
 assert.equal(h.control.canEditBets(h.app),true);assert.equal(h.context.resultInert.length,0);
}

const h=harness();await ready(h);
if(process.env.CLIENT_LIFECYCLE_CASE!=='controls'){
 for(let cycle=1;cycle<=3;cycle++){
  await result(h,'normal-'+cycle);await h.advance(2200);unlocked(h);
  assert.equal(h.getWallet().credit,1000000+cycle*(5000-30000),'normal BET and WIN stay exactly once per cycle');
  assert.equal(h.app.credit,h.getWallet().credit);assert.equal(h.control.describe().resetBusy,false);
 }
 const menu=harness();await ready(menu);await result(menu,'result-then-menu');menu.context.openRecordMenu();
 assert.equal(menu.context.menuOpen,true);await menu.advance(2200);
 assert.equal(menu.app.phase,'ready');assert.equal(menu.context.resultInert.length,0);
 assert.ok(menu.panels.every(panel=>panel.inert),'finishing a result cannot unlock the player menu background');
 assert.equal(menu.tab().click(),false);menu.context.closeRecordMenu();unlocked(menu);
 assert.equal(menu.errors.length,0,JSON.stringify(menu.errors.map(error=>error?.stack||error)));

 const previousMenu=harness();await ready(previousMenu);previousMenu.context.openRecordMenu();await result(previousMenu,'menu-before-result');await previousMenu.advance(2200);
 assert.ok(previousMenu.panels.every(panel=>panel.inert),'a menu that already owned input keeps its original restoration values');
 previousMenu.context.closeRecordMenu();unlocked(previousMenu);
 assert.equal(previousMenu.errors.length,0,JSON.stringify(previousMenu.errors.map(error=>error?.stack||error)));

 const nested=harness();await ready(nested);await result(nested,'result-jpc-menu');
 const jpc=nested.context.jpcSession;jpc.active=true;
 jpc.inert=nested.panels.slice(1,3).map(panel=>[panel,panel.inert]);nested.context.openRecordMenu();await nested.advance(2200);
 nested.context.closeRecordMenu();assert.ok(nested.panels.slice(1,3).every(panel=>panel.inert),'closing the outer menu preserves the JPC owner');
 assert.equal(nested.panels[0].inert,false);
 // This is the native JPC close contract, using the ownership records updated
 // by shared result completion, without creating a local JPC physical draw.
 for(const [panel,previous] of jpc.inert)panel.inert=previous;jpc.inert=[];jpc.active=false;unlocked(nested);
 assert.equal(nested.errors.length,0,JSON.stringify(nested.errors.map(error=>error?.stack||error)));
}
const before=h.stats.controlWrites;
for(let index=0;index<100;index++)h.control.refreshBetControls(h.app);
assert.equal(h.stats.controlWrites-before,0,'unchanged budget checks must not rewrite all button DOM attributes');
h.context.slots[0].addBet.disabled=true;h.control.refreshBetControls(h.app);
assert.equal(h.context.slots[0].addBet.disabled,false,'a native HUD change must still be corrected immediately');
assert.equal(h.errors.length,0,JSON.stringify(h.errors.map(error=>error?.stack||error)));
console.log('Client lifecycle: real result/menu rendering, three normal cycles, nested input ownership and zero redundant budget DOM writes passed');

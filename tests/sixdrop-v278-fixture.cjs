'use strict';
// Test-only adapters. Rules, geometry, native Arcade scheduling, the Six Drop
// adapter, and checkpoint/worker code are read from the production sources.
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {R,G}=require('./sixdrop-v247-fixture.cjs');
const clone=value=>JSON.parse(JSON.stringify(value));
const batches=numbers=>[numbers.slice(0,3),numbers.slice(3,5),...numbers.slice(5,8).map(n=>[n])];
const NUMBERS=Object.freeze([6,2,10,14,18,22,25,5]);
let native;
function memoryStorage(initial={}){
 const values=new Map(Object.entries(initial));
 return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key),dump:()=>Object.fromEntries(values)};
}
class NodeStub{
 constructor(){this.dataset={};this.style={setProperty(){}};this.classList={add(){},remove(){},toggle(){}};this.nodes=new Map();this.textContent='';this.parentElement=this;this.hidden=false;}
 querySelector(selector){if(!this.nodes.has(selector))this.nodes.set(selector,new NodeStub());return this.nodes.get(selector);}
 querySelectorAll(){return [];}
 setAttribute(){} removeAttribute(){} append(){} appendChild(){} addEventListener(){} remove(){}
 getBoundingClientRect(){return {x:0,y:0,width:320,height:320,left:0,top:0,right:320,bottom:320};}
}
function createHost({seed=1,bet=100,otherBet=null,search='?edition=local',storage=memoryStorage()}={}){
 native??=require('./payout-v232-classic-sample.cjs').load();
 const source=fs.readFileSync('optimized/app-01.js','utf8');
 const start=source.indexOf('class Arcade{'),end=source.indexOf('// Only the next HIT is simulated.',start);
 assert(start>=0&&end>start,'production Arcade class exists');
 const listeners=new Map(),nodes=new Map(),events=[];
 const edition=new URLSearchParams(search).get('edition')||'streaming';
 const window={SweetsEditionV255:{value:edition},SweetsLineup:{ids:otherBet===null?['candy']:['candy','cookie']},SweetsSixDropV247:globalThis.SweetsSixDropV247,localStorage:storage,
  addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(fn);},
  dispatchEvent(event){for(const fn of listeners.get(event.type)||[])fn(event);return true;}};
 const document={hidden:true,body:new NodeStub(),head:new NodeStub(),documentElement:new NodeStub(),
  getElementById(id){if(!nodes.has(id))nodes.set(id,new NodeStub());return nodes.get(id);},createElement(){return new NodeStub();}};
 const medalWin=(w,h)=>Math.floor(w*h/100),noop=()=>{};
 const Arcade=new Function('Engine','ChocoDigEngine','CandyCarnivalEngine','window','medalWin',
  'const debugForceRainbowSugar=false,RAINBOW_SUGAR_CHANCE=0;'+source.slice(start,end)+';return Arcade;')
  (native.Engine,native.ChocoDigEngine,native.SixBallCandyEngine,window,medalWin);
 const app=new Arcade({initialEngines:otherBet===null?[native.SixBallCandyEngine]:[native.SixBallCandyEngine,native.Engine],random:()=>seed/4294967296,sleep:async()=>{},onEvent:(gameIndex,event)=>events.push({...clone(event),gameIndex})});
 app.bets=otherBet===null?[bet]:[bet,otherBet];app.credit=app.displayCredit=1000000;app.drawSource={ready:true,start(callbacks){this.callbacks=callbacks;},reset(){},pause(){}};
 const e=app.engines[0],slot={i:0,engine:e,sixOdds:new NodeStub(),tab:new NodeStub(),candyReward:new NodeStub(),candyCanvas:new NodeStub(),candyTime:0};
 const scope={window,document,location:{search,origin:'http://isolated.test'},localStorage:storage,app,slots:[slot],
  sixEmpty:G.empty,sixClone:G.clone,sixCount:G.count,sixValid:G.valid,sixStep:G.step,sixNeighbors:G.neighbors,sixPatterns:G.patterns,sixFindShapes:G.findShapes,sixDrop:G.drop,sixPoint:G.point,SIX_START_GAP_TEMPLATES:G.gapTemplates,
  carnivalEvent:noop,drawCarnival:noop,sixArtCandySprite:noop,sixGlassPose:noop,requestSixSparkles:noop,reachContext:noop,carnivalHud:noop,sixDrawTutorial:noop,renderRoundResult:noop,
  setupCarnivalSlot:noop,fitGoldenNumber:noop,carnivalQueueFrame:noop,scheduleUI:noop,put:noop,$:id=>document.getElementById(id),motionReduced:true,active:0,debugPayoutTarget:90,reachTier:(total,clear)=>clear?3:total>=1000?2:total>=300?1:0,wonderTier:()=>1,
  CustomEvent:class{constructor(type,options={}){this.type=type;this.detail=options.detail;}},setTimeout,clearTimeout,URLSearchParams,console};
 const adapter=new Function(...Object.keys(scope),fs.readFileSync('assets/sixdrop-progressive-host-v247.js','utf8')+'\nreturn {reachContext};')(...Object.values(scope));
 if(edition==='local'){
  new Function('window',fs.readFileSync('assets/local-debug-v258.js','utf8'))(window);
  const localScope={...scope,LOCAL_EIGHT_DRAW_ALLOWED:true,manualNumbers:true,rouletteDriver:null,rouletteReady:true,loadCookieRoulette:noop,confirm:()=>false};
  new Function(...Object.keys(localScope),fs.readFileSync('assets/local-debug-game-v258.js','utf8'))(...Object.values(localScope));
 }
 return {app,e,events,window,document,storage,slot,
  reach(){return adapter.reachContext(e,app);},
  setSeed(value){app.random=e.random=()=>value/4294967296;},
  control(value,{playerId='qa-player',revision=1}={}){window.dispatchEvent({type:'sweets:payout-control-v3',detail:{playerId,sixDropV247:{...value,version:247,revision}}});},
  start(){assert.equal(app.start(),true);assert.equal(e.running,app.bets[0]>0);return e.state;},
  async number(number){assert.equal(app.acceptNumber(number,app.token),true,'real Arcade accepts unique number '+number);await idle(e);return e.state;},
  async round(numbers=NUMBERS){for(const number of numbers)await this.number(number);for(const engine of app.engines)await idle(engine);assert.equal(e.processed,app.enabled[0]?8:0);assert.equal(app.phase,'result');return e.state;}
 };
}
async function idle(e){
 // No animation runs in this VM. Resolve asynchronous completion hooks without
 // imposing timers or replacing the adapter's drain/complete implementations.
 for(let i=0;i<1000&&e.busy;i++)await Promise.resolve();
 assert.equal(e.busy,false,'production drain finishes');assert.notEqual(e.phase,'error');
}
function installWorker(host){
 const source=fs.readFileSync('assets/server-offline-settlement-worker-v3.js','utf8'),at=source.lastIndexOf('install();');
 assert(at>0,'production offline worker entry exists');
 const requests=[];
 const scope={window:host.window,location:{search:'?serverSettlementWorker=1',origin:'http://isolated.test'},document:host.document,app:host.app,rouletteDrawSource:host.app.drawSource,debugPayoutTarget:90,medalWin:(b,h)=>Math.floor(b*h/100),URL,URLSearchParams,setTimeout,clearTimeout,console,
  fetch:async(url,options)=>{requests.push({url:String(url),...options,body:options?.body?JSON.parse(options.body):null});return {ok:true,json:async()=>({ok:true})};}};
 // The install loop polls real servers, so expose only its existing pure
 // entrypoints; all real prepare/replay/final settlement logic remains intact.
 new Function(...Object.keys(scope),source.slice(0,at)+'window.__qaWorker278={restore,settleWork,processed,waitProcessed,installDrawCapture};\n})();')(...Object.values(scope));
 host.window.__qaWorker278.installDrawCapture();
 return {...host.window.__qaWorker278,requests};
}
function fullRound(seed,{bet=100,carry=null,numbers=NUMBERS}={}){
 let state=R.newGame({seed,bet,carry,rulesRevision:278});
 const initial=clone(state),plans=[];
 for(const group of batches(numbers)){
  const plan=R.hitBatch(state,group,{trace:true});assert(plan,'valid 3 / 2 / 1 / 1 / 1 group');plans.push(plan);state=plan.state;
 }
 return {seed,bet,carry,initial,state,plans,numbers:[...numbers],win:R.totalMedals(state)};
}
module.exports={R,G,clone,batches,NUMBERS,memoryStorage,createHost,idle,installWorker,fullRound};

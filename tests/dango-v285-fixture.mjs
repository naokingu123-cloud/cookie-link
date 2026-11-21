/* Test-only environment. Arcade, Dango host, checkpoint and worker code are
 * production sources; rendering and network endpoints are isolated adapters. */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

export const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
export const [rulesSource,hostSource,recordingSource,nativeSource,workerSource,downloadSource]=await Promise.all([
 read('assets/dango-bingo-rules.js'),read('assets/dango-bingo-host.js'),read('assets/recorded-round-v255.js'),
 read('optimized/app-01.js'),read('assets/server-offline-settlement-worker-v3.js'),read('assets/download-mode-v255.js')
]);
export const plain=value=>JSON.parse(JSON.stringify(value));
export const numbers=Object.freeze(Array.from({length:25},(_,i)=>i+1));
export const flush=async()=>{for(let i=0;i<400;i++)await Promise.resolve();};
const noop=()=>{};

export function loadRules(source=rulesSource){const c=vm.createContext({console});vm.runInContext(source,c);return c.DangoBingoRules;}
export const R=loadRules();

export function host({worker=false,target=90,seed=28501,bet=100,revision=null}={}){
 const events=[],callbacks={},labels={},elements=new Map(),frames={main:[],mini:[]};
 const classList={add:noop,remove:noop,toggle:noop};
 const element=()=>({classList,dataset:{},hidden:false,style:{setProperty:noop},after:noop,append:noop,addEventListener:noop,setAttribute:noop});
 const panel=element(),slot={panel,holder:element(),mini:{canvas:{}},reachResults:[]};
 const c=vm.createContext({console,Math,Set,Map,URL,URLSearchParams,Promise,Date,Number,Intl,
  location:{search:worker?'?serverSettlementWorker=1':'?edition=local',origin:'http://isolated.test'},slots:[slot],
  SweetsLineup:{ids:['dango'],catalog:{dango:{name:'ダンゴデビンゴ',record:10}}},
  debugPayoutTarget:target,debugForceRainbowSugar:false,RAINBOW_SUGAR_CHANCE:0,
  active:0,inView:true,allNineMode:false,motionReduced:true,jpcSession:{active:false},menuOpen:false,userPaused:false,
  document:{hidden:false,body:{classList},createElement:element,
   getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);},addEventListener:noop},
  ResizeObserver:class{observe(){}},requestAnimationFrame:()=>1,setTimeout:()=>1,clearTimeout:noop,
  stopSugarAward:noop,invalidateReach:noop,scheduleUI:noop,sceneSound:noop,recordChanged:noop,
  announceAchievement:message=>events.push({type:'announcement',message}),
  reachContext:engine=>({key:JSON.stringify(engine.state),count:engine.processed}),reachTier:()=>0,
  finishGamePresentation:async()=>{},num:String,medalWin:(w,h)=>Math.floor(w*h/100),
  select:noop,syncPause:noop,hud:noop,renderRoundResult:noop,put:(key,value)=>{labels[key]=value;},$:()=>null
 });
 c.window=c;c.addEventListener=noop;
 c.DangoBingoView={mount:()=>({setCallbacks(value){Object.assign(callbacks,value);},draw:(state,options)=>frames.main.push({state,options}),drawMini:(ctx,state,options)=>frames.mini.push({state,options})})};
 c.SweetsDangoThinkingV251={state:()=>({enabled:true,active:true,ballCount:5,remainingMs:15000,closesAt:Date.now()+15000}),checkpointPlacement:async()=>({ok:true})};
 vm.runInContext(rulesSource,c);
 const native=revision===null?c.DangoBingoRules:c.DangoBingoRules['legacy'+revision];
 assert.ok(native,'requested historical engine exists');
 c.DangoBingoRules={...native,commitFree(state,options){events.push({type:'commit',draws:plain(state.draws),appDraws:plain(c.app.draws)});return native.commitFree(state,options);}};
 const start=nativeSource.indexOf('class Arcade{'),end=nativeSource.indexOf('// Only the next HIT is simulated.',start);
 assert.ok(start>=0&&end>start,'native Arcade source exists');
 vm.runInContext('class FixtureEngine {}\n'+nativeSource.slice(start,end)+'\nglobalThis.app=new Arcade({initialEngines:[FixtureEngine],sleep:async()=>{}});',c);
 const app=c.app;app.random=native.seededRandom(seed);app.bets=[bet];app.credit=app.displayCredit=1000000;
 app.drawSource={ready:true,start(callbacks){this.callbacks=callbacks;},reset:noop,pause:noop};
 let finished=0;const finish=app.finishRound;
 app.finishRound=function(){if(this.phase==='playing')finished++;return finish.call(this);};
 vm.runInContext(hostSource,c);vm.runInContext(recordingSource,c);
 const engine=c.DangoBingo.engine;
 return {context:c,app,engine,R:c.DangoBingoRules,native,slot,frames,callbacks,events,labels,
  recording:c.SweetsRecordedRoundV255,finished:()=>finished,
  start(){assert.equal(app.start(),true);return engine.state;},
  draw(list){for(const n of list)assert.equal(app.acceptNumber(n,app.token),true,'native Arcade accepts '+n);return engine.state;},
  async number(n){this.draw([n]);await flush();return engine.state;},
  capture(){return plain(this.recording.capture(app,{ballIndex:app.draws.length}));},
  async restore(saved){this.recording.restore(app,saved,{notify:false,random:false});await flush();return engine.state;}
 };
}

export function installWorker(h){
 const at=workerSource.lastIndexOf('install();');assert.ok(at>0,'production worker entry exists');
 const requests=[];
 Object.assign(h.context,{rouletteDrawSource:h.app.drawSource,setTimeout,clearTimeout,
  fetch:async(url,options)=>{requests.push({url:String(url),body:options?.body?JSON.parse(options.body):null});return {ok:true,json:async()=>({ok:true})};}});
 vm.runInContext(workerSource.slice(0,at)+'window.__dangoWorker285={restore,settleWork,processed,installDrawCapture};\n})();',h.context);
 h.context.__dangoWorker285.installDrawCapture();
 return {...h.context.__dangoWorker285,requests};
}

// This deterministic trace is shared by the pre-v285 fingerprint generator
// and the current dispatch regression; it never depends on current defaults.
export function historyRound(api,{revision,seed,target}){
 let state=api.create({rulesRevision:revision,seed,target});const trace=[plain(state)];
 const rng=api.seededRandom(seed^0x517cc1b7),draws=[...numbers];
 for(let i=draws.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[draws[i],draws[j]]=[draws[j],draws[i]];}
 for(const number of draws.slice(0,8)){
  if(state.phase==='placing'){state=api.commitFree(state);assert.ok(state);trace.push(plain(state));}
  state=api.draw(state,number);assert.ok(state);trace.push(plain(state));
 }
 return {trace,reaches:plain(api.reaches(state)),presentationReaches:plain(api.presentationReaches(state)),payRows:plain(api.payRowsFor(state)),payout:api.payout(state)};
}

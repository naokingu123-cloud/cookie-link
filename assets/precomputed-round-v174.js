(()=>{
'use strict';
if(window.__sweetsPrecomputedRoundV174)return;
window.__sweetsPrecomputedRoundV174=true;

const VERSION='v174';
const ROUND_KEY='sweets-link-precomputed-round-v174';
const LEDGER_KEY='sweets-link-precomputed-ledger-v174';
const OLD_ROUND_KEY='sweets-link-pending-round-v1';
const MAX_LEDGER=160;
const PURE_KINDS=new Set(['stick','jelly','castella','popcorn']);
const CONTROL_KEYS=new Set([
 'onEvent','beforeComplete','sleep','random','presentationRate','speed','paused',
 'enablePersistence','persistence','storage','view','canvas','ctx','context'
]);

const realSleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const readJSON=(key,fallback)=>{try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback;}catch{return fallback;}};
const writeJSON=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}};
const removeKey=key=>{try{localStorage.removeItem(key);}catch{}};
const readRound=()=>readJSON(ROUND_KEY,null);
const saveRound=value=>writeJSON(ROUND_KEY,value);
const getLedger=()=>{const v=readJSON(LEDGER_KEY,[]);return Array.isArray(v)?v.filter(x=>typeof x==='string').slice(-MAX_LEDGER):[];};
const hasLedger=id=>!!id&&getLedger().includes(id);
const addLedger=id=>{if(!id)return;const list=getLedger();if(!list.includes(id))list.push(id);writeJSON(LEDGER_KEY,list.slice(-MAX_LEDGER));};
const makeId=token=>`${Date.now().toString(36)}-${Number(token||0).toString(36)}-${Math.random().toString(36).slice(2,10)}`;
const randomSeed=()=>{try{const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]||1;}catch{return (Date.now()^Math.floor(Math.random()*0xffffffff))>>>0||1;}};
const mulberry32=seed=>{let x=seed>>>0;return()=>{x=(x+0x6d2b79f5)>>>0;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};};
const makePlan=()=>{
 const pool=Array.from({length:25},(_,i)=>i+1),out=[];
 let seed=randomSeed(),rng=mulberry32(seed);
 while(out.length<8){const i=Math.floor(rng()*pool.length);out.push(pool.splice(i,1)[0]);}
 return {seed,values:out};
};

function isAtomic(value){
 if(value==null||typeof value!=='object')return true;
 if(typeof Node!=='undefined'&&value instanceof Node)return true;
 const name=value.constructor?.name||'';
 return /^(Window|Document|Audio|AudioContext|BaseAudioContext|CanvasRenderingContext2D|WebGL|ResizeObserver|MutationObserver|Promise|WeakMap|WeakSet)$/i.test(name);
}
function cloneValue(value,memo=new WeakMap()){
 if(value==null||typeof value!=='object')return value;
 if(isAtomic(value))return value;
 if(memo.has(value))return memo.get(value);
 if(value instanceof Date)return new Date(value.getTime());
 if(value instanceof RegExp)return new RegExp(value.source,value.flags);
 if(value instanceof Map){const out=new Map();memo.set(value,out);for(const [k,v] of value)out.set(cloneValue(k,memo),cloneValue(v,memo));return out;}
 if(value instanceof Set){const out=new Set();memo.set(value,out);for(const v of value)out.add(cloneValue(v,memo));return out;}
 if(ArrayBuffer.isView(value)){try{return new value.constructor(value);}catch{return value;}}
 if(value instanceof ArrayBuffer)return value.slice(0);
 const proto=Object.getPrototypeOf(value);
 if(proto!==Object.prototype&&proto!==null&&!Array.isArray(value))return value;
 const out=Array.isArray(value)?[]:{};memo.set(value,out);
 for(const key of Reflect.ownKeys(value)){
  const d=Object.getOwnPropertyDescriptor(value,key);if(!d||!('value'in d))continue;
  try{out[key]=cloneValue(d.value,memo);}catch{}
 }
 return out;
}
function snapshotEngine(engine){
 const out={};
 for(const key of Reflect.ownKeys(engine||{})){
  if(typeof key!=='string'||CONTROL_KEYS.has(key))continue;
  const d=Object.getOwnPropertyDescriptor(engine,key);if(!d||!('value'in d)||typeof d.value==='function')continue;
  try{out[key]=cloneValue(d.value);}catch{}
 }
 return out;
}
function applySnapshot(engine,snapshot,{remove=true}={}){
 if(!engine||!snapshot)return;
 if(remove){
  for(const key of Reflect.ownKeys(engine)){
   if(typeof key!=='string'||CONTROL_KEYS.has(key)||Object.hasOwn(snapshot,key))continue;
   const d=Object.getOwnPropertyDescriptor(engine,key);
   if(d&&'value'in d&&typeof d.value!=='function'&&d.configurable){try{delete engine[key];}catch{}}
  }
 }
 for(const [key,value] of Object.entries(snapshot)){
  try{engine[key]=cloneValue(value);}catch{}
 }
}
function replaceObject(target,source){
 if(!target||!source)return source;
 for(const key of Object.keys(target))if(!Object.hasOwn(source,key))try{delete target[key];}catch{}
 for(const [key,value] of Object.entries(source))target[key]=cloneValue(value);
 return target;
}
function engineSummary(engine){
 const keys=[
  'kind','recordGame','totalHundredths','maxLink','maxChain','allClears','roundSteps','roundHammers','roundCleared',
  'wonderCollected','wonderToken','depth','roundDepth','roundBlocks','roundChests','roundIndex','roundsCleared',
  'hexagons','triangles','lines','processed','accepted','allReachName'
 ];
 const out={};
 for(const key of keys){
  try{const v=engine?.[key];if(v==null||['string','number','boolean'].includes(typeof v))out[key]=v;else out[key]=cloneValue(v);}catch{}
 }
 const state=engine?.state;
 if(state&&typeof state==='object'){
  const stateKeys=['phase','draws','lines','oddsMultiplier','colors','wetCount','bakedCount','fireLevel','oddsHits','highestRole','popped','clears','level','baseHundredths','bonusHundredths','reversalCount','maxFlips','totalHundredths','firstPopAward'];
  out.state={};for(const key of stateKeys)if(key in state)try{out.state[key]=cloneValue(state[key]);}catch{}
 }
 return out;
}
function restoreSummary(engine,data){
 if(!engine||!data)return;
 for(const [key,value] of Object.entries(data)){
  if(key==='state'){if(engine.state&&value)replaceObject(engine.state,value);continue;}
  try{engine[key]=cloneValue(value);}catch{}
 }
}
function safeWin(bet,hundredths){
 try{return typeof medalWin==='function'?medalWin(Number(bet)||0,Number(hundredths)||0):Math.max(0,Math.floor((Number(bet)||0)*(Number(hundredths)||0)/10000));}
 catch{return 0;}
}
function totalForState(engine,state){
 if(!engine||!state)return Number(engine?.totalHundredths)||0;
 const previous=engine.state;
 try{engine.state=cloneValue(state);return Number(engine.totalHundredths)||Number(state.totalHundredths)||0;}
 catch{return Number(state.totalHundredths)||0;}
 finally{engine.state=previous;}
}
function persistentFrom(round,status=round.status){
 return {
  version:174,runtime:VERSION,id:round.id,token:round.token,status,savedAt:Date.now(),
  plan:[...round.plan],played:Number(round.played)||0,creditBefore:Number(round.creditBefore)||0,
  creditAfter:Number(round.creditAfter)||0,bets:[...round.bets],locked:[...round.locked],enabled:[...round.enabled],
  roundWins:[...round.roundWins],totalWin:Number(round.totalWin)||0,engineSummaries:cloneValue(round.engineSummaries||[]),
  wonderAwards:cloneValue(round.wonderAwards||[]),targetAdapter:round.targetAdapter||'callback-map'
 };
}
function persist(round,status){round.status=status||round.status;return saveRound(persistentFrom(round,round.status));}
function repaint(a){
 try{typeof renderRoundResult==='function'&&renderRoundResult(a);}catch{}
 try{typeof scheduleUI==='function'&&scheduleUI(a);}catch{}
 try{a.onChange?.(a);}catch{}
}
function statusText(text,label='先行計算'){
 try{typeof countdownText==='function'&&countdownText(text,label);}catch{}
 const root=document.querySelector('#cookie-roulette [data-status]');if(root)root.textContent=label+'：'+text;
}

const ruleAdapters={};
function installRuleAdapter(kind,core,type){
 if(!core||typeof core.draw!=='function'||ruleAdapters[kind])return;
 const original=core.draw;
 ruleAdapters[kind]={core,original,type};
 core.draw=function(state,number,...args){
  const round=typeof app!=='undefined'?app?.__precomputedRound:null;
  const list=round?.pureTransitions?.[kind];
  const pos=round?.pureCursor?.[kind]||0;
  const item=list?.[pos];
  if(round?.mode==='replay'&&!round.shadowing&&app.phase==='playing'&&item&&item.number===number){
   round.pureCursor[kind]=pos+1;
   if(type==='popcorn'){
    replaceObject(state,item.state);
    return cloneValue(item.trace);
   }
   if(type==='jelly')return cloneValue(item.result);
   return cloneValue(item.state);
  }
  return original.call(this,state,number,...args);
 };
}
function installRuleAdapters(){
 installRuleAdapter('stick',window.BingoStickRules,'state');
 installRuleAdapter('jelly',window.JellyRules,'jelly');
 installRuleAdapter('castella',window.PartyCastellaRules,'state');
 installRuleAdapter('popcorn',window.PopcornEngine,'popcorn');
}
function precomputePure(round,a){
 round.pureTransitions={};round.pureCursor={stick:0,jelly:0,castella:0,popcorn:0};
 for(let i=0;i<a.engines.length;i++){
  if(!round.enabled[i])continue;
  const engine=a.engines[i],kind=engine?.kind;if(!PURE_KINDS.has(kind))continue;
  const adapter=ruleAdapters[kind];if(!adapter)throw Error(kind+' の先行計算ルールが見つかりません');
  const list=[];let state=cloneValue(engine.state);
  if(kind==='popcorn'){
   const rng=mulberry32((round.seed^(0x9e3779b9*(i+1)))>>>0);
   for(const number of round.plan){
    const next=cloneValue(state);if(Array.isArray(next.drawn))next.drawn=next.drawn.slice();
    const trace=adapter.original.call(adapter.core,next,number,rng);
    if(!trace)throw Error('popcorn '+number+' の計算に失敗');
    state=next;list.push({number,state:cloneValue(state),trace:cloneValue(trace)});
   }
  }else if(kind==='jelly'){
   for(const number of round.plan){
    const result=adapter.original.call(adapter.core,state,number);
    if(!result)throw Error('jelly '+number+' の計算に失敗');
    state=cloneValue(result.state);list.push({number,result:cloneValue(result)});
   }
  }else{
   for(const number of round.plan){
    const next=adapter.original.call(adapter.core,state,number);
    if(!next)throw Error(kind+' '+number+' の計算に失敗');
    state=cloneValue(next);list.push({number,state:cloneValue(state)});
   }
  }
  round.pureTransitions[kind]=list;
  round.finalStates[i]=cloneValue(state);
  const total=totalForState(engine,state);round.totalHundredths[i]=total;
  const old=engine.state;try{engine.state=cloneValue(state);round.engineSummaries[i]=engineSummary(engine);}finally{engine.state=old;}
  let sugar=false;
  if(kind==='stick')sugar=Number(state.maxFlips||0)>=Number(adapter.core.sugarFlips||Infinity)||Number(state.reversalCount||0)>0;
  else if(kind==='jelly')sugar=(state.lines?.length||0)>=Number(state.sugarLines||Infinity);
  else if(kind==='castella')sugar=Number(state.bakedCount||0)>=30;
  else if(kind==='popcorn')sugar=Number(state.popped||0)>=Number(state.sugarTarget||Infinity)||list.some(x=>x.trace?.sugarCrossed);
  if(sugar&&engine.wonderToken)round.wonderAwards.push({game:i,token:cloneValue(engine.wonderToken)});
 }
}

function classBusy(engine){
 try{
  if(engine?.opening||engine?.processing||engine?.animating||engine?.holdDraws)return true;
  if(engine?.idle===false)return true;
  if(Array.isArray(engine?.queue)&&engine.queue.length)return true;
  if(Number.isFinite(engine?.accepted)&&Number.isFinite(engine?.processed)&&engine.processed<engine.accepted)return true;
 }catch{}
 return false;
}
async function waitClassSettled(engines,completeFlags,{needComplete=false,timeout=9000}={}){
 const start=Date.now();let spins=0;
 while(Date.now()-start<timeout){
  const done=engines.every(({engine,index})=>needComplete?completeFlags[index]===true:!classBusy(engine));
  if(done)return true;
  await Promise.resolve();if(++spins%80===0)await realSleep(0);
 }
 return false;
}
async function precomputeClasses(round,a){
 const classEntries=[];
 for(let i=0;i<a.engines.length;i++)if(round.enabled[i]&&!PURE_KINDS.has(a.engines[i]?.kind))classEntries.push({engine:a.engines[i],index:i});
 if(!classEntries.length)return;
 const appState={
  paid:cloneValue(a.paid),roundWins:cloneValue(a.roundWins),totalWin:a.totalWin,payout:cloneValue(a.payout),result:cloneValue(a.result),
  phase:a.phase,dealing:a.dealing,fastForward:a.fastForward,draws:cloneValue(a.draws),wonderBank:cloneValue(a.wonderBank),wonderSteps:a.wonderSteps,wonderValue:a.wonderValue
 };
 const originals={sleep:a.sleep,random:a.random,finishRound:a.finishRound,uiApp:typeof uiApp!=='undefined'?uiApp:null};
 const completeFlags={},controls={};round.classLogs={};round.classOriginalEvents={};round.initialStates={};
 let shadowBall=0;
 try{
  round.shadowing=true;a.__precomputedShadow=true;
  if(typeof uiApp!=='undefined')uiApp=null;
  a.sleep=async()=>Promise.resolve();a.random=mulberry32((round.seed^0xa511e9b3)>>>0);a.finishRound=()=>{};
  for(const {engine,index} of classEntries){
   round.initialStates[index]=snapshotEngine(engine);round.classLogs[index]=Array.from({length:8},()=>[]);
   controls[index]={onEvent:engine.onEvent,beforeComplete:engine.beforeComplete,sleep:engine.sleep,random:engine.random,presentationRate:engine.presentationRate,speed:engine.speed,paused:engine.paused};
   round.classOriginalEvents[index]=engine.onEvent;
   engine.sleep=async()=>Promise.resolve();engine.random=mulberry32((round.seed^(0x85ebca6b*(index+1)))>>>0);engine.beforeComplete=async()=>{};
   engine.onEvent=(event,current)=>{
    const target=Math.max(0,Math.min(7,shadowBall-1));
    round.classLogs[index][target].push({event:cloneValue(event),state:snapshotEngine(current||engine)});
    if(event?.phase==='stepcollect')for(const step of event.steps||[])round.wonderAwards.push({game:index,token:cloneValue(step)});
    if(event?.phase==='complete')completeFlags[index]=true;
   };
  }
  for(let pos=0;pos<round.plan.length;pos++){
   shadowBall=pos+1;const number=round.plan[pos];
   for(const {engine} of classEntries)try{engine.previewDraw?.(number);}catch(error){throw Error((engine.kind||'game')+' preview: '+error.message);}
   const release=shadowBall===3?round.plan.slice(0,3):shadowBall===5?round.plan.slice(3,5):shadowBall>5?[number]:[];
   for(const {engine} of classEntries){
    const values=engine.drawMode==='single'?[number]:release;
    if(values.length)engine.enqueueBatch(values);
   }
   const settled=await waitClassSettled(classEntries,completeFlags,{timeout:9000});
   if(!settled)throw Error(shadowBall+'球目の先行計算が完了しませんでした');
  }
  const completed=await waitClassSettled(classEntries,completeFlags,{needComplete:true,timeout:12000});
  if(!completed)throw Error('クラス型ゲームの完了イベントを確認できませんでした');
  for(const {engine,index} of classEntries){
   round.finalStates[index]=snapshotEngine(engine);round.totalHundredths[index]=Number(engine.totalHundredths)||0;round.engineSummaries[index]=engineSummary(engine);
  }
 }finally{
  for(const {engine,index} of classEntries){
   const initial=round.initialStates[index];if(initial)applySnapshot(engine,initial);
   const control=controls[index]||{};
   try{engine.onEvent=control.onEvent;}catch{}try{engine.beforeComplete=control.beforeComplete;}catch{}try{engine.sleep=control.sleep;}catch{}try{engine.random=control.random;}catch{}
   try{engine.presentationRate=control.presentationRate;}catch{}try{engine.speed=control.speed;}catch{}try{engine.paused=control.paused;}catch{}
  }
  a.sleep=originals.sleep;a.random=originals.random;a.finishRound=originals.finishRound;
  a.paid=appState.paid;a.roundWins=appState.roundWins;a.totalWin=appState.totalWin;a.payout=appState.payout;a.result=appState.result;
  a.phase=appState.phase;a.dealing=appState.dealing;a.fastForward=appState.fastForward;a.draws=appState.draws;
  a.wonderBank=appState.wonderBank;a.wonderSteps=appState.wonderSteps;a.wonderValue=appState.wonderValue;
  a.__precomputedShadow=false;round.shadowing=false;
  if(typeof uiApp!=='undefined')uiApp=originals.uiApp||a;
  repaint(a);
 }
}
function dedupeAwards(list){
 const seen=new Set(),out=[];
 for(const item of list||[]){const key=`${item.game}:${item.token?.id??''}:${item.token?.kind??''}`;if(seen.has(key))continue;seen.add(key);out.push(item);}
 return out;
}
async function precomputeRound(a,token){
 const generated=makePlan();
 const round={
  id:makeId(token),token,seed:generated.seed,plan:generated.values,played:0,status:'planning',mode:'planning',
  creditBefore:Number(a.credit)||0,creditAfter:Number(a.credit)||0,bets:[...a.bets],locked:[...a.locked],enabled:[...a.enabled],
  roundWins:a.bets.map(()=>0),totalWin:0,totalHundredths:a.bets.map(()=>0),engineSummaries:[],finalStates:[],wonderAwards:[],
  arrivals:[],draining:false,cancelled:false,targetAdapter:'callback-map'
 };
 a.__precomputedRound=round;persist(round,'planning');statusText('8球と全ゲーム結果を計算中…');
 const started=performance.now();
 precomputePure(round,a);
 await precomputeClasses(round,a);
 if(token!==a.token||a.phase!=='playing')throw Error('ラウンドが変更されました');
 for(let i=0;i<round.roundWins.length;i++)round.roundWins[i]=round.enabled[i]?safeWin(round.locked[i],round.totalHundredths[i]):0;
 round.totalWin=round.roundWins.reduce((sum,n)=>sum+(Number(n)||0),0);
 round.creditAfter=round.creditBefore+round.totalWin;round.wonderAwards=dedupeAwards(round.wonderAwards);
 round.mode='replay';round.status='precomputed';round.precomputeMs=Math.round(performance.now()-started);
 persist(round,'precomputed');statusText('確定済み · 1球目を待機','RESULT LOCK');
 return round;
}

function phaseDelay(event){
 const phase=event?.phase;
 const explicit=Math.max(0,Number(event?.duration||event?.recordDuration||0));
 if(explicit)return Math.min(850,Math.max(45,explicit));
 return ({drawpending:35,queued:20,hit:180,vanish:220,link:300,remove:160,fall:210,refill:230,settled:90,waiting:45,stepcollect:220,sugaraward:280,allclear:500,hammergift:180,complete:35,error:20})[phase]??90;
}
async function playbackWait(ms,a,round){
 let left=Math.max(0,ms);
 while(left>0&&a.token===round.token&&a.phase==='playing'){
  if(a.paused||document.hidden){await realSleep(40);continue;}
  const slice=Math.min(40,left);await realSleep(slice);left-=slice;
 }
 return a.token===round.token;
}
async function replayClassStream(round,a,index,ball){
 const engine=a.engines[index],callback=round.classOriginalEvents[index]||engine.onEvent;
 for(const entry of round.classLogs?.[index]?.[ball-1]||[]){
  if(a.token!==round.token||a.phase!=='playing')return;
  applySnapshot(engine,entry.state);try{callback?.(cloneValue(entry.event),engine);}catch(error){console.error('[PrecomputedRound] event replay',index,error);}
  repaint(a);if(!await playbackWait(phaseDelay(entry.event),a,round))return;
 }
}
async function waitPureBall(a,round,ball){
 const start=Date.now();
 while(Date.now()-start<9000&&a.token===round.token&&a.phase==='playing'){
  let done=true;
  for(let i=0;i<a.engines.length;i++){
   if(!round.enabled[i]||!PURE_KINDS.has(a.engines[i]?.kind))continue;
   const engine=a.engines[i];
   if(Number(engine.processed||0)<ball||classBusy(engine)){done=false;break;}
  }
  if(done)return true;
  await realSleep(25);
 }
 return false;
}
async function replayBall(a,round,number){
 if(a.token!==round.token||a.phase!=='playing'||round.played>=8)return false;
 const ball=round.played+1;a.draws.push(number);a.dealing=ball<8;
 const classTasks=[];
 for(let i=0;i<a.engines.length;i++){
  if(!round.enabled[i])continue;const engine=a.engines[i];
  if(PURE_KINDS.has(engine?.kind)){
   try{engine.previewDraw?.(number);engine.enqueueBatch?.([number]);}catch(error){console.error('[PrecomputedRound] pure replay',engine?.kind,error);}
  }else classTasks.push(replayClassStream(round,a,i,ball));
 }
 round.played=ball;persist(round,'playing');repaint(a);
 await Promise.all(classTasks);
 await waitPureBall(a,round,ball);
 if(ball===8)a.dealing=false;
 statusText(ball===8?'全結果確定済み':`${ball} / 8球 · 次も確定済み`,'RESULT LOCK');
 repaint(a);return true;
}
async function drainArrivals(a,round){
 if(round.draining)return;round.draining=true;
 try{
  while(round.arrivals.length&&a.token===round.token&&a.phase==='playing'&&round.played<8){
   round.arrivals.shift();const planned=round.plan[round.played];
   if(!await replayBall(a,round,planned))break;
  }
 }finally{round.draining=false;}
}
function receivePhysical(a,round,actual){
 if(a.token!==round.token||a.phase!=='playing')return false;
 round.arrivals.push(actual);drainArrivals(a,round);return true;
}
function applyDriverPlan(round){
 const candidates=[typeof rouletteDriver!=='undefined'?rouletteDriver:null,typeof rouletteDriver!=='undefined'?rouletteDriver?.draw:null,typeof rouletteDriver!=='undefined'?rouletteDriver?.machine:null].filter(Boolean);
 const methods=['setNumberQueue','setTargetNumbers','setForcedNumbers','setScriptedNumbers','setOutcomeQueue','queueNumbers','setTargets'];
 for(const target of candidates)for(const name of methods)if(typeof target?.[name]==='function'){
  try{target[name](round.plan.slice());round.targetAdapter=name;persist(round,round.status);return name;}catch{}
 }
 const props=['numberQueue','targetNumbers','forcedNumbers','scriptedNumbers','outcomeQueue','targets'];
 for(const target of candidates)for(const name of props)if(name in target){
  try{target[name]=round.plan.slice();round.targetAdapter=name;persist(round,round.status);return name;}catch{}
 }
 round.targetAdapter='callback-map';persist(round,round.status);return round.targetAdapter;
}
function awardPendingWonder(a,round){
 for(const item of round.wonderAwards||[]){
  const token=item.token;if(!token)continue;
  const exists=(a.wonderBank||[]).some(x=>x.id===token.id&&x.game===item.game);if(exists)continue;
  a.wonderBank.push({...cloneValue(token),game:item.game});a.wonderValue+=Number(token.value)||0;
 }
 a.wonderSteps=a.wonderBank.length;
}
function settlePrecomputed(a,{credit=false}={}){
 const round=a?.__precomputedRound;if(!round||!['planning','precomputed','playing'].includes(round.status))return false;
 round.arrivals.length=0;round.played=8;a.dealing=false;
 for(let i=0;i<a.engines.length;i++){
  if(!round.enabled[i])continue;
  if(round.finalStates[i]){
   if(PURE_KINDS.has(a.engines[i]?.kind))a.engines[i].state=cloneValue(round.finalStates[i]);
   else applySnapshot(a.engines[i],round.finalStates[i]);
  }
  restoreSummary(a.engines[i],round.engineSummaries[i]);
  try{a.engines[i].processed=a.engines[i].accepted=8;a.engines[i].running=false;}catch{}
 }
 awardPendingWonder(a,round);
 a.paid=round.enabled.map(Boolean);a.roundWins=[...round.roundWins];a.totalWin=round.totalWin;a.displayCredit=a.credit;
 a.payout=null;a.result={elapsed:0,duration:1800};a.phase='result';round.status='result';persist(round,'result');repaint(a);
 if(credit){a.beginPayout();if(a.phase==='paying'&&a.payout)a.advancePayout(a.payout.duration+1);}
 return true;
}

function install(){
 if(typeof Arcade!=='function'||typeof app==='undefined'||!app||typeof rouletteDrawSource==='undefined'){setTimeout(install,60);return;}
 installRuleAdapters();
 const proto=Arcade.prototype;if(proto.__precomputedRoundV174)return;
 Object.defineProperty(proto,'__precomputedRoundV174',{value:true});
 const native={
  drawStart:rouletteDrawSource.start.bind(rouletteDrawSource),drawReset:rouletteDrawSource.reset.bind(rouletteDrawSource),
  beginPayout:proto.beginPayout,advancePayout:proto.advancePayout,prepare:proto.prepare
 };
 rouletteDrawSource.start=function(callbacks){
  if(typeof manualNumbers!=='undefined'&&manualNumbers)return native.drawStart(callbacks);
  const a=app,token=callbacks.token;
  precomputeRound(a,token).then(round=>{
   if(a.token!==token||a.phase!=='playing'||round.cancelled)return;
   applyDriverPlan(round);
   native.drawStart({...callbacks,onNumber:actual=>receivePhysical(a,round,actual)});
   try{rouletteDriver?.setPaused(a.paused);}catch{}
  }).catch(error=>{
   console.error('[PrecomputedRound] precompute failed',error);
   const round=a.__precomputedRound;if(round){round.mode='fallback';round.status='fallback';persist(round,'fallback');}
   if(a.token===token&&a.phase==='playing')native.drawStart(callbacks);
  });
 };
 rouletteDrawSource.reset=function(...args){const round=app?.__precomputedRound;if(round)round.cancelled=true;return native.drawReset(...args);};

 proto.beginPayout=function(...args){
  const round=this.__precomputedRound;
  if(!round||this.phase!=='result')return native.beginPayout.apply(this,args);
  if(hasLedger(round.id)){
   this.credit=Number(round.creditAfter)||this.credit;this.displayCredit=this.credit;this.payout=null;this.phase='complete';round.status='paid';persist(round,'paid');repaint(this);return true;
  }
  round.creditBefore=Number(this.credit)||0;round.creditAfter=round.creditBefore+(Number(this.totalWin)||0);persist(round,'crediting');
  const result=native.beginPayout.apply(this,args);
  if(result){addLedger(round.id);round.creditAfter=Number(this.credit)||round.creditAfter;persist(round,'paid');}
  return result;
 };
 proto.advancePayout=function(...args){const result=native.advancePayout.apply(this,args);const round=this.__precomputedRound;if(round&&this.phase==='complete')persist(round,'paid');return result;};
 proto.prepare=function(...args){
  const round=this.__precomputedRound,previous=this.phase;
  if(round&&previous==='playing'&&round.mode==='replay')settlePrecomputed(this,{credit:true});
  else if(round&&previous==='result')this.beginPayout();
  const result=native.prepare.apply(this,args);
  if(round&&['complete','ready'].includes(previous)){const saved=readRound();if(saved?.id===round.id)removeKey(ROUND_KEY);}
  this.__precomputedRound=null;return result;
 };

 try{
  if(typeof debugResetRound==='function'){
   const originalReset=debugResetRound;
   debugResetRound=function(...args){
    if(app?.phase==='playing'&&app?.__precomputedRound?.mode==='replay'){
     settlePrecomputed(app,{credit:true});setTimeout(()=>originalReset.apply(this,args),0);return;
    }
    return originalReset.apply(this,args);
   };
  }
 }catch(error){console.warn('[PrecomputedRound] reset hook unavailable',error);}

 const pending=readRound();
 if(pending&&app.phase==='ready'&&['precomputed','playing','result','crediting','paid'].includes(pending.status)){
  const round={...pending,mode:'recovered',arrivals:[],draining:false,cancelled:false};app.__precomputedRound=round;
  app.bets=[...(pending.bets||app.bets)];app.locked=[...(pending.locked||app.bets)];app.enabled=[...(pending.enabled||app.bets.map(n=>n>0))];
  app.paid=app.enabled.map(Boolean);app.draws=[...(pending.plan||[])];app.roundWins=[...(pending.roundWins||app.bets.map(()=>0))];app.totalWin=Number(pending.totalWin)||0;
  (pending.engineSummaries||[]).forEach((data,i)=>restoreSummary(app.engines[i],data));
  const paid=pending.status==='paid'||hasLedger(pending.id);
  if(paid){app.credit=Number(pending.creditAfter)||app.credit;app.displayCredit=app.credit;app.payout=null;app.result={elapsed:1800,duration:1800};app.phase='complete';}
  else{app.credit=Number(pending.creditBefore)||app.credit;app.displayCredit=app.credit;app.payout=null;app.result={elapsed:0,duration:2200};app.phase='result';}
  app.paused=false;app.dealing=false;requestAnimationFrame(()=>repaint(app));
 }
 removeKey(OLD_ROUND_KEY);
 window.SweetsPrecomputedRound={
  version:VERSION,get current(){return app?.__precomputedRound||null;},get pending(){return readRound();},
  settle:()=>settlePrecomputed(app,{credit:true}),clear:()=>removeKey(ROUND_KEY)
 };
 console.info('[PrecomputedRoundV174] precompute, deterministic replay, journal and idempotent payout enabled');
}
install();
})();

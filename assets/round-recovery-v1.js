/* BET-close round plan, deterministic playback and interruption settlement. */
(()=>{
'use strict';
if(typeof app==='undefined'||typeof Arcade==='undefined'||!app||!Array.isArray(app.engines))return;
const ROUND_KEY='sweets-link-pending-round-v1';
const CREDIT_KEY='sweets-link-credit-v1';
const BUILD='round-plan-v1';
const OMIT=new Set(['random','sleep','onEvent','beforeComplete','storage','recordStorage','worker','abortController','version']);
let active=null,simulationTask=null,recovering=false,bypassPrepare=false,lastCredit=null;

function seed32(){
 try{const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]||0x6d2b79f5;}catch(_){return ((Date.now()^Math.floor(Math.random()*0xffffffff))>>>0)||0x6d2b79f5;}
}
function rng32(seed){
 let a=seed>>>0;
 return function(){a=(a+0x6d2b79f5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
}
function plannedDraws(seed){
 const random=rng32(seed),pool=Array.from({length:25},(_,i)=>i+1);
 for(let i=pool.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
 return pool.slice(0,8);
}
function id(){return Date.now().toString(36)+'-'+seed32().toString(36);}
function isDom(value){return typeof Node!=='undefined'&&value instanceof Node;}
function pack(value,seen=new WeakSet()){
 if(value==null||typeof value==='string'||typeof value==='boolean')return value;
 if(typeof value==='number')return Number.isFinite(value)?value:0;
 if(typeof value==='bigint')return {__rr:'BigInt',v:String(value)};
 if(typeof value==='function'||typeof value==='symbol'||isDom(value)||value instanceof Promise)return undefined;
 if(typeof value!=='object')return undefined;
 if(seen.has(value))return undefined;seen.add(value);
 if(value instanceof Date)return {__rr:'Date',v:value.toISOString()};
 if(value instanceof Set)return {__rr:'Set',v:[...value].map(v=>pack(v,seen)).filter(v=>v!==undefined)};
 if(value instanceof Map)return {__rr:'Map',v:[...value].map(([k,v])=>[pack(k,seen),pack(v,seen)]).filter(([k,v])=>k!==undefined&&v!==undefined)};
 if(ArrayBuffer.isView(value))return {__rr:'Typed',n:value.constructor.name,v:Array.from(value)};
 if(Array.isArray(value))return value.map(v=>pack(v,seen));
 const proto=Object.getPrototypeOf(value);if(proto!==Object.prototype&&proto!==null)return undefined;
 const out={};
 for(const key of Object.keys(value)){
  if(OMIT.has(key))continue;
  let next;try{next=pack(value[key],seen);}catch(_){continue;}
  if(next!==undefined)out[key]=next;
 }
 return {__rr:'Object',v:out};
}
function unpack(value){
 if(value==null||typeof value!=='object')return value;
 if(Array.isArray(value))return value.map(unpack);
 if(value.__rr==='Date')return new Date(value.v);
 if(value.__rr==='BigInt')return BigInt(value.v);
 if(value.__rr==='Set')return new Set((value.v||[]).map(unpack));
 if(value.__rr==='Map')return new Map((value.v||[]).map(([k,v])=>[unpack(k),unpack(v)]));
 if(value.__rr==='Typed'){
  const C=globalThis[value.n];return typeof C==='function'?new C(value.v||[]):value.v||[];
 }
 if(value.__rr==='Object'){
  const out={};for(const [k,v] of Object.entries(value.v||{}))out[k]=unpack(v);return out;
 }
 const out={};for(const [k,v] of Object.entries(value))out[k]=unpack(v);return out;
}
function engineSnapshot(engine){
 const data={};
 for(const key of Object.keys(engine)){
  if(OMIT.has(key))continue;
  let value;try{value=pack(engine[key]);}catch(_){continue;}
  if(value!==undefined)data[key]=value;
 }
 return {kind:engine.kind||'',ctor:engine.constructor?.name||'',data};
}
function restoreEngine(engine,snapshot){
 if(!engine||!snapshot?.data)return;
 for(const [key,value] of Object.entries(snapshot.data)){
  if(OMIT.has(key))continue;
  try{engine[key]=unpack(value);}catch(error){console.warn('[round-plan] restore skipped',key,error);}
 }
}
function arcadeSnapshot(a){
 return {
  credit:Number(a.credit)||0,displayCredit:Number(a.displayCredit)||0,totalWin:Number(a.totalWin)||0,
  bets:[...a.bets],locked:[...a.locked],paid:[...a.paid],enabled:[...a.enabled],roundWins:[...a.roundWins],draws:[...a.draws],
  wonderSteps:Number(a.wonderSteps)||0,wonderValue:Number(a.wonderValue)||0,wonderBank:pack(a.wonderBank)||[],
  engines:a.engines.map(engineSnapshot)
 };
}
function restoreArcadeState(a,snapshot,{engines=true,credit=true}={}){
 if(!snapshot)return;
 if(engines)snapshot.engines?.forEach((state,i)=>restoreEngine(a.engines[i],state));
 for(const key of ['bets','locked','paid','enabled','roundWins','draws'])if(Array.isArray(snapshot[key]))a[key]=[...snapshot[key]];
 a.totalWin=Number(snapshot.totalWin)||0;
 a.wonderSteps=Number(snapshot.wonderSteps)||0;a.wonderValue=Number(snapshot.wonderValue)||0;a.wonderBank=unpack(snapshot.wonderBank)||[];
 if(credit){a.credit=Number(snapshot.credit)||0;a.displayCredit=Number(snapshot.displayCredit)||a.credit;}
}
function readRound(){
 try{const data=JSON.parse(localStorage.getItem(ROUND_KEY)||'null');return data&&data.build===BUILD?data:null;}catch(_){return null;}
}
function saveRound(round){
 active=round;
 try{localStorage.setItem(ROUND_KEY,JSON.stringify(round));return true;}
 catch(error){console.error('[round-plan] save failed',error);notice('復旧データを保存できません（容量不足）');return false;}
}
function clearRound(){active=null;simulationTask=null;try{localStorage.removeItem(ROUND_KEY);}catch(_){} }
function saveCredit(value){
 const n=Number(value);if(!Number.isFinite(n)||n===lastCredit)return;lastCredit=n;
 try{localStorage.setItem(CREDIT_KEY,String(n));}catch(_){ }
}
function loadCredit(){
 try{const raw=localStorage.getItem(CREDIT_KEY);if(raw==null||raw==='')return null;const n=Number(raw);return Number.isFinite(n)?n:null;}catch(_){return null;}
}
function notice(text){
 const status=document.getElementById('payout-note')||document.getElementById('status');
 if(status)status.textContent=text;
}
function currentLineup(){return app.engines.map(e=>e.kind||e.constructor?.name||'engine');}
function canShadow(){
 return app.engines.every(engine=>{
  const C=engine?.constructor;return typeof C==='function'&&C!==Object&&C.prototype&&typeof C.prototype.reset==='function'&&typeof C.prototype.start==='function';
 });
}
function makeRound(){
 const drawSeed=seed32();
 return {
  build:BUILD,id:id(),createdAt:Date.now(),status:'planned',lineup:currentLineup(),shadow:canShadow(),
  appSeed:seed32(),engineSeeds:app.engines.map(()=>seed32()),drawSeed,draws:plannedDraws(drawSeed),
  start:arcadeSnapshot(app),final:null,settledCredit:null,error:null
 };
}
function installRng(a,round){
 a.random=rng32(round.appSeed);
 a.engines.forEach((engine,i)=>{engine.random=rng32(round.engineSeeds[i]||round.appSeed);});
}
function buildShadow(round){
 const constructors=app.engines.map(e=>e.constructor);
 const shadow=new Arcade({
  random:()=>.5,sleep:()=>Promise.resolve(),onEvent:()=>{},onChange:()=>{},speed:1000,colorCount:app.colorCount,initialEngines:constructors
 });
 restoreArcadeState(shadow,round.start,{engines:true,credit:true});
 shadow.phase='ready';shadow.paused=false;shadow.token=0;shadow.dealing=false;shadow.draws=[];shadow.paid=shadow.bets.map(()=>false);shadow.locked=shadow.bets.map(()=>0);shadow.enabled=shadow.bets.map(n=>n>0);
 shadow.engines.forEach(e=>{e.paused=false;e.presentationRate=1000;e.beforeComplete=null;e.sleep=()=>Promise.resolve();});
 installRng(shadow,round);
 shadow.drawSource={
  ready:true,callbacks:null,
  start(callbacks){this.callbacks=callbacks;queueMicrotask(()=>{try{for(const n of round.draws)callbacks.onNumber(n);}catch(error){callbacks.onError?.(error.message);}});},
  pause(){},reset(){this.callbacks=null;}
 };
 return shadow;
}
async function simulate(round){
 if(round.final)return round.final;
 const shadow=buildShadow(round);
 if(!shadow.start())throw new Error('事前計算を開始できませんでした');
 const started=performance.now();
 while(shadow.phase!=='result'&&shadow.phase!=='complete'&&shadow.phase!=='error'&&performance.now()-started<15000){
  await new Promise(resolve=>setTimeout(resolve,0));
 }
 if(shadow.phase==='error')throw new Error(shadow.drawError||'事前計算でエラーが発生しました');
 if(shadow.phase!=='result'&&shadow.phase!=='complete')throw new Error('事前計算が時間内に完了しませんでした');
 round.final=arcadeSnapshot(shadow);round.final.draws=[...round.draws];round.status='simulated';round.simulatedAt=Date.now();round.error=null;saveRound(round);
 return round.final;
}
function ensureSimulation(round){
 if(round.final)return Promise.resolve(round.final);
 if(simulationTask)return simulationTask;
 simulationTask=simulate(round).catch(error=>{
  round.error=String(error?.message||error);saveRound(round);console.error('[round-plan] simulation failed',error);throw error;
 }).finally(()=>{simulationTask=null;});
 return simulationTask;
}
function remapPhysicsHit(physics,hit,target){
 target=Number(target);if(!Number.isInteger(target)||target<1||target>25||!hit)return;
 const original=Number(hit.pocket);if(!Number.isInteger(original)||original===target){hit.pocket=target;return;}
 const from=original-1,to=target-1,ball=physics.balls?.find(b=>b.id===hit.ball);
 if(ball){
  if(Array.isArray(physics.occupied)){physics.occupied[from]=false;physics.occupied[to]=true;}
  ball.pocket=to;
  if(ball.held&&ball.local){
   const delta=(to-from)*Math.PI*2/25,c=Math.cos(delta),s=Math.sin(delta),x=ball.local.x,z=ball.local.z;
   ball.local.x=x*c-z*s;ball.local.z=x*s+z*c;
   const shapeIndex=physics.rotor?.shapes?.indexOf(ball.holdShape)??-1;
   const offset=shapeIndex>=0?physics.rotor?.shapeOffsets?.[shapeIndex]:null;
   if(offset){offset.x=ball.local.x;offset.y=ball.local.y;offset.z=ball.local.z;}
   try{physics.rotor?.quaternion?.vmult(ball.local,ball.body.position);}catch(_){ }
   if(physics.rotor)physics.rotor.aabbNeedsUpdate=true;
  }
 }
 hit.pocket=target;
 const last=physics.hits?.[physics.hits.length-1];if(last&&last.ball===hit.ball)last.pocket=target;
}
function hookRoulette(){
 const root=document.getElementById('cookie-roulette'),driver=root?.anima8,physics=driver?.physics;
 if(!physics||physics.__roundPlanHooked)return !!physics;
 const original=physics.onHit;
 physics.onHit=function(hit){
  const round=active||readRound();
  if(round&&round.status!=='settled'&&app.phase==='playing'&&driver.draw?.mode==='eight'){
   const target=round.draws?.[app.draws.length];if(target)remapPhysicsHit(physics,hit,target);
  }
  return original?.call(this,hit);
 };
 physics.__roundPlanHooked=true;return true;
}
function markUi(){
 try{for(const slot of slots){slot.dirtyMain=true;slot.dirtyMini=true;slot.catchUp=false;}scheduleUI(app);}catch(_){try{app.onChange(app);}catch(__){}}
}
function applyFinalForFinish(final){
 restoreArcadeState(app,final,{engines:true,credit:true});
 app.phase='playing';app.paused=false;app.dealing=false;app.draws=[...(active?.draws||final.draws||[])];
}
function canonicalSettlement(round,final){
 const base=Number(final.credit)||0,total=Number(final.totalWin)||0;return base+total;
}
async function replayActual(round){
 if(round.final)return round.final;
 const savedSource=app.drawSource,sound=document.getElementById('sound'),soundWas=sound?.checked;
 const source={ready:true,callbacks:null,start(callbacks){this.callbacks=callbacks;queueMicrotask(()=>{try{for(const n of round.draws)callbacks.onNumber(n);}catch(error){callbacks.onError?.(error.message);}});},pause(){},reset(){this.callbacks=null;}};
 try{
  savedSource?.pause?.(true);if(sound)sound.checked=false;document.body?.classList.add('round-recovery-replay');
  bypassPrepare=true;originalPrepare();bypassPrepare=false;
  restoreArcadeState(app,round.start,{engines:true,credit:true});
  app.phase='ready';app.paused=false;app.dealing=false;app.draws=[];app.payout=null;app.result=null;app.fastForward=true;
  installRng(app,round);app.drawSource=source;
  if(!originalStart())throw new Error('中断結果の再計算を開始できませんでした');
  app.engines.forEach(engine=>{engine.presentationRate=1000;try{engine.paused=false;}catch(_){ }});
  const started=performance.now();
  while(app.phase!=='result'&&app.phase!=='complete'&&app.phase!=='error'&&performance.now()-started<15000){
   await new Promise(resolve=>setTimeout(resolve,0));
  }
  if(app.phase==='error')throw new Error(app.drawError||'中断結果の再計算でエラーが発生しました');
  if(app.phase!=='result'&&app.phase!=='complete')throw new Error('中断結果の再計算が時間内に完了しませんでした');
  app.paused=true;
  if(!round.final){round.final=arcadeSnapshot(app);round.final.draws=[...round.draws];round.status='simulated';round.simulatedAt=Date.now();saveRound(round);}
  return round.final;
 }finally{
  bypassPrepare=false;app.drawSource=savedSource;if(sound)sound.checked=!!soundWas;document.body?.classList.remove('round-recovery-replay');
 }
}
async function recoveryFinal(round){
 if(round.final)return round.final;
 if(round.shadow){try{return await ensureSimulation(round);}catch(error){console.warn('[round-plan] shadow fallback',error);}}
 return replayActual(round);
}
async function recover(round,reason='reload'){
 if(recovering||!round||round.status==='settled')return;recovering=true;
 notice('中断されたゲームの結果を復旧しています…');
 try{
  const final=await recoveryFinal(round);
  const settled=canonicalSettlement(round,final);
  // Commit the ledger first. A crash after this point restores this exact credit.
  round.status='settled';round.settledAt=Date.now();round.settledCredit=settled;round.recoveryReason=reason;saveRound(round);saveCredit(settled);
  try{app.token++;app.dealing=false;app.paused=false;app.drawSource?.reset?.();}catch(_){ }
  restoreArcadeState(app,final,{engines:true,credit:true});
  app.draws=[...round.draws];app.totalWin=Number(final.totalWin)||0;app.credit=settled;app.displayCredit=settled;app.payout=null;app.result={elapsed:1800,duration:1800};app.phase='complete';app.fastForward=true;
  markUi();
  queueMicrotask(()=>{const resultStatus=document.getElementById('result-status');if(resultStatus)resultStatus.textContent='前回中断分の結果を精算しました';notice('中断分 '+app.totalWin.toLocaleString('ja-JP')+' WIN をCREDITへ加算しました');});
 }catch(error){
  round.error=String(error?.message||error);saveRound(round);notice('中断結果を復旧できませんでした：'+round.error);console.error('[round-plan] recovery failed',error);
 }finally{recovering=false;}
}

const persistedCredit=loadCredit();
if(persistedCredit!=null&&app.phase==='ready'){app.credit=persistedCredit;app.displayCredit=persistedCredit;lastCredit=persistedCredit;}
active=readRound();

const originalOnChange=app.onChange;
app.onChange=function(a){if(a&&Number.isFinite(a.credit)&&['ready','paying','complete'].includes(a.phase))saveCredit(a.credit);return originalOnChange.call(this,a);};

const originalStart=app.start.bind(app);
app.start=function(){
 const pending=active||readRound();
 if(this.phase==='ready'&&pending&&pending.status!=='settled'){recover(pending,'start');return false;}
 if(recovering)return false;
 if(this.phase==='ready'&&this.bets.some(n=>n>0)&&!(typeof manualNumbers!=='undefined'&&manualNumbers)){
  if(active?.status==='settled')clearRound();
  const round=makeRound();active=round;
  if(saveRound(round)){
   installRng(this,round);hookRoulette();if(round.shadow)ensureSimulation(round).catch(()=>{});
   notice('抽選結果を確定しました');
  }
 }
 const ok=originalStart();
 if(!ok&&active?.status==='planned'&&this.phase==='ready')clearRound();
 return ok;
};

const originalFinish=app.finishRound.bind(app);
app.finishRound=function(){
 const round=active||readRound();
 if(round&&round.status!=='settled'){
  if(round.final)applyFinalForFinish(round.final);
  else{
   // The actual run is a safe fallback if a device could not finish the shadow simulation.
   this.totalWin=this.roundWins.reduce((sum,n)=>sum+n,0);
  }
 }
 const result=originalFinish();
 if(round&&round.status!=='settled'){
  if(!round.final){round.final=arcadeSnapshot(this);round.final.draws=[...round.draws];round.status='simulated';round.simulatedAt=Date.now();}
  round.actualFinishedAt=Date.now();saveRound(round);
 }
 return result;
};

const originalBeginPayout=app.beginPayout.bind(app);
app.beginPayout=function(){
 const round=active||readRound();
 if(round&&round.status!=='settled'){
  const final=round.final||arcadeSnapshot(this),settled=canonicalSettlement(round,final);
  round.final=final;round.status='settled';round.settledAt=Date.now();round.settledCredit=settled;saveRound(round);saveCredit(settled);
 }
 const result=originalBeginPayout();
 if(round?.status==='settled'&&Number.isFinite(round.settledCredit)){
  this.credit=round.settledCredit;if(this.phase==='complete')this.displayCredit=this.credit;
 }
 return result;
};

const originalPrepare=app.prepare.bind(app);
app.prepare=function(){
 const round=active||readRound(),debugReset=(typeof debugResetting!=='undefined'&&debugResetting)||this.clearingWonder;
 if(!bypassPrepare&&!debugReset&&round&&round.status!=='settled'&&['playing','error','result','paying'].includes(this.phase)){
  try{this.pause(true);}catch(_){ }
  recover(round,'reset');return false;
 }
 if(round?.status==='settled'){saveCredit(Number(round.settledCredit));clearRound();}
 return originalPrepare();
};

const observer=new MutationObserver(()=>hookRoulette());
observer.observe(document.documentElement,{childList:true,subtree:true});
hookRoulette();

const bootRound=active;
queueMicrotask(()=>{
 const round=bootRound;
 if(!round)return;
 if(round.status==='settled'){
  if(Number.isFinite(round.settledCredit)){app.credit=round.settledCredit;app.displayCredit=round.settledCredit;saveCredit(round.settledCredit);markUi();}
  clearRound();return;
 }
 const same=JSON.stringify(round.lineup||[])===JSON.stringify(currentLineup());
 if(!same){notice('中断データのゲーム構成が異なるため復旧を保留しました');return;}
 recover(round,'reload');
});

window.SweetsRoundRecovery={
 get active(){return active||readRound();},
 forceRecover(){const round=active||readRound();return round?recover(round,'manual'):Promise.resolve();},
 clear(){clearRound();},
 hookRoulette
};
})();

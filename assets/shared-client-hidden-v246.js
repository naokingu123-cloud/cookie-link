/* v246: hidden-tab gameplay clock for the server-authoritative browser player.
 * Physics and number selection remain on the Windows host. This worker only
 * wakes timers and advances the EXISTING result/payout phase machine. */
(()=>{
'use strict';
if(window.SweetsHiddenGameV246)return;
const query=new URLSearchParams(location.search);
if(query.get('serverHost')==='1'||query.get('serverSettlementWorker')==='1')return;
const WAKE_MS=60,RESULT_PULSE_MS=160,MAX_RESULT_STEP_MS=1200;
const originalSleeps=new WeakMap(),waiters=new Map();
let worker=null,workerUrl='',serial=0,seenAt=Date.now(),lastAdvance=0,visibleTimer=0,unloading=false;
const client=()=>window.SweetsSharedMachine?.client;
const currentApp=()=>typeof app==='undefined'?null:app;
const mayRun=()=>!!client()?.online&&!!window.__sweetsSharedClientReady&&!(typeof userPaused!=='undefined'&&userPaused);
function makeWorker(){
 if(typeof Worker!=='function'||typeof Blob!=='function'||typeof URL?.createObjectURL!=='function')return null;
 const code=`
 const jobs=new Map();let hidden=false;
 self.onmessage=event=>{
  const data=event.data||{};
  if(data.type==='visibility'){hidden=!!data.hidden;return;}
  if(data.type==='sleep'&&Number.isSafeInteger(data.id)){jobs.set(data.id,Date.now()+Math.max(0,Math.min(300000,Number(data.ms)||0)));return;}
  if(data.type==='cancel')jobs.delete(data.id);
 };
 setInterval(()=>{
  const now=Date.now(),due=[];
  for(const [id,at] of jobs)if(now>=at){due.push(id);jobs.delete(id);}
  if(hidden||due.length)postMessage({type:'pulse',at:now,due});
 },60);
 `;
 try{
  workerUrl=URL.createObjectURL(new Blob([code],{type:'application/javascript'}));
  const w=new Worker(workerUrl);w.onmessage=event=>{
   const data=event.data||{};
   for(const id of Array.isArray(data.due)?data.due:[]){
    const done=waiters.get(id);if(done){waiters.delete(id);done();}
   }
   if(data.type==='pulse')pump(Number(data.at)||Date.now());
  };
  w.onerror=error=>{console.warn('[HiddenGame246] worker unavailable',error?.message||error);};
  w.postMessage({type:'visibility',hidden:document.hidden});
  return w;
 }catch(error){console.warn('[HiddenGame246] use native timers',error?.message||error);return null;}
}
function installSleeps(){
 const a=currentApp();if(!a)return;
 for(const target of [a,...(a.engines||[])]){
  if(!target||originalSleeps.has(target)||typeof target.sleep!=='function')continue;
  const original=target.sleep.bind(target);
  originalSleeps.set(target,original);
  target.sleep=function(ms){
   if(!document.hidden||!worker||!mayRun()||!Number.isFinite(Number(ms))||Number(ms)<=0)return original(ms);
   const id=++serial;
   const wake=new Promise(resolve=>{waiters.set(id,resolve);try{worker.postMessage({type:'sleep',id,ms:Number(ms)});}catch{waiters.delete(id);resolve();}});
   // Preserve the normal timer as fail-safe. Only the first resolution counts.
   return Promise.race([Promise.resolve().then(()=>original(ms)),wake]).finally(()=>{
    waiters.delete(id);
    try{worker.postMessage({type:'cancel',id});}catch{}
   });
  };
 }
}
function pump(at=Date.now()){
 if(unloading)return false;
 installSleeps();
 const a=currentApp(),elapsed=Math.max(0,at-seenAt);seenAt=at;
 if(!document.hidden||!a||!mayRun()||a.phase==='ready')return false;
 if(a.paused){try{window.SweetsClientBackgroundV240?.nudge?.();}catch{}}
 if(a.paused||at-lastAdvance<RESULT_PULSE_MS)return false;
 lastAdvance=at;
 if(a.phase==='result'){
  try{return !!a.advanceResult(Math.min(MAX_RESULT_STEP_MS,Math.max(RESULT_PULSE_MS,elapsed)));}catch(error){console.warn('[HiddenGame246] result',error);return false;}
 }
 if(a.phase==='paying'){
  try{return !!a.advancePayout(Math.min(MAX_RESULT_STEP_MS,Math.max(RESULT_PULSE_MS,elapsed)));}catch(error){console.warn('[HiddenGame246] payout',error);return false;}
 }
 return false;
}
function changed(){
 seenAt=Date.now();lastAdvance=0;
 try{worker?.postMessage({type:'visibility',hidden:document.hidden});}catch{}
 installSleeps();
 if(document.hidden)pump();
 else{try{window.SweetsClientBackgroundV240?.restore?.();}catch{}}
}
worker=makeWorker();
document.addEventListener('visibilitychange',changed,true);
addEventListener('pageshow',changed,true);
visibleTimer=setInterval(()=>{
 installSleeps();
 if(!worker&&document.hidden)pump();
},650);
addEventListener('beforeunload',()=>{
 unloading=true;clearInterval(visibleTimer);document.removeEventListener?.('visibilitychange',changed,true);
 try{worker?.terminate();}catch{}try{if(workerUrl)URL.revokeObjectURL(workerUrl);}catch{}
 waiters.clear();
},{once:true});
installSleeps();
window.SweetsHiddenGameV246={pump,installSleeps,get workerActive(){return !!worker;},get outstandingSleeps(){return waiters.size;}};
})();

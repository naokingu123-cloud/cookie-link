/* Keep server-driven game logic alive in an unfocused browser whenever the
 * browser still executes JavaScript. Mobile OS suspension cannot be prevented:
 * authoritative recovery is performed when the page becomes runnable. */
(()=>{
 'use strict';
 if(window.SweetsClientBackgroundV240)return;
 const qs=new URLSearchParams(location.search);
 if(qs.get('serverHost')==='1'||qs.get('serverSettlementWorker')==='1')return;
 let lastRefresh=0,lastSocket=null,lastRun=0;
 const client=()=>window.SweetsSharedMachine?.client;
 function nudge(){
  const c=client();if(!c?.online||!window.__sweetsSharedClientReady)return false;
  const a=typeof app==='undefined'?null:app;
  // An explicit manual pause remains respected. Never start local draws.
  if(!a||typeof userPaused!=='undefined'&&userPaused||!['playing','result','paying'].includes(a.phase))return false;
  if(a.paused){try{a.pause(false);}catch{}}
  lastRun=Date.now();return !a.paused;
 }
 function restore(){
  nudge();
  const c=client(),now=Date.now();
  if(!c?.online||now-lastRefresh<2300)return;
  lastRefresh=now;
  // Controller performs snapshot reconciliation; this is not a new polling
  // loop and cannot fabricate any ball or mutate another player's credit.
  Promise.resolve(window.SweetsSharedControllerV224?.refreshNow?.()).catch(()=>{});
 }
 function changed(){if(document.hidden)nudge();else restore();}
 document.addEventListener('visibilitychange',changed,true);
 addEventListener('focus',restore,true);
 addEventListener('pageshow',restore,true);
 // Background browsers sometimes return from a suspended socket without
 // dispatching focus immediately. A throttled safety tick only unpauses.
 const timer=setInterval(()=>{
  const c=client();if(c?.ws!==lastSocket){lastSocket=c?.ws;if(!document.hidden)restore();}
  if(document.hidden)nudge();
 },1200);
 addEventListener('beforeunload',()=>clearInterval(timer),{once:true});
 window.SweetsClientBackgroundV240={nudge,restore,get lastRun(){return lastRun;}};
})();

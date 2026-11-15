(()=>{
'use strict';
if(window.__sweetsSharedClientLifecycleV217)return;
window.__sweetsSharedClientLifecycleV217=true;
const params=new URLSearchParams(location.search);
if(params.get('serverHost')==='1'||params.get('serverSettlementWorker')==='1')return;

const finite=value=>Number.isFinite(Number(value))?Number(value):0;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let monitorTimer=0,resultSince=0,resetBusy=false,lastResetRound='',lastBlockedAt=0,resetGeneration=0,resetCompletedAt=0;
let nativeStartReady=null;

function machine(){return window.SweetsSharedMachine;}
function client(){return machine()?.client;}
function active(){return machine()?.active;}
function gate(){return window.SweetsConnectionGateV217;}
function currentRound(){return client()?.round||null;}
function authorisedRound(){
 const round=currentRound();
 return round?.phase==='PLAYING'&&round?.participant?.playerId?round:null;
}
function stopLocalAuto(){
 try{if(typeof stopAutoRound==='function')stopAutoRound();}catch{}
 try{if(typeof autoRoundStamp!=='undefined')autoRoundStamp=null;}catch{}
}
function status(text,label='共有抽選'){try{typeof countdownText==='function'&&countdownText(text,label);}catch{}}
function positive(values){return Array.isArray(values)&&values.some(value=>finite(value)>0);}
function snapshotBet(target){
 const bets=Array.isArray(target?.bets)?target.bets.map(value=>Math.max(0,finite(value))):[];
 return {bets,enabled:bets.map(value=>value>0)};
}
function queueLength(engine){
 const queue=engine?.queue;
 if(Array.isArray(queue))return queue.length;
 if(queue&&Number.isFinite(Number(queue.size)))return Number(queue.size);
 return 0;
}
function engineClean(engine){
 return finite(engine?.processed)===0&&finite(engine?.accepted)===0&&!engine?.busy&&!engine?.running&&queueLength(engine)===0;
}
function resultLayerHidden(){
 const layer=document.getElementById('round-result-layer');
 return !layer||layer.hidden===true||getComputedStyle(layer).display==='none';
}
function isPristine(target=window.app){
 if(!target||resetBusy)return false;
 return target.phase==='ready'&&!(target.draws?.length)&&!target.payout&&!target.result&&!target.dealing&&!target.fastForward&&!active()&&
  (target.engines||[]).every(engineClean)&&resultLayerHidden();
}
function stopRoundPresentation(){
 stopLocalAuto();
 try{typeof stopResultAuto==='function'&&stopResultAuto();}catch{}
 try{if(typeof resultAutoToken!=='undefined')resultAutoToken=-1;}catch{}
 try{typeof stopBetPreview==='function'&&stopBetPreview();}catch{}
 try{typeof stopBgm==='function'&&stopBgm();}catch{}
 try{typeof stopSounds==='function'&&stopSounds();}catch{}
 try{if(typeof userPaused!=='undefined')userPaused=false;}catch{}
 try{if(typeof payoutStamp!=='undefined')payoutStamp=null;}catch{}
 try{if(typeof roundStarting!=='undefined')roundStarting=false;}catch{}
}
function clearSlotVisuals(){
 try{
  if(typeof slots==='undefined'||!Array.isArray(slots))return;
  for(const slot of slots){
   for(const fn of [
    typeof stopShatter==='function'?stopShatter:null,
    typeof stopPour==='function'?stopPour:null,
    typeof stopSugarAward==='function'?stopSugarAward:null,
    typeof stopHammerTransfer==='function'?stopHammerTransfer:null,
    typeof stopPayClimb==='function'?stopPayClimb:null,
    typeof clearMarks==='function'?clearMarks:null
   ])try{fn?.(slot);}catch{}
   try{slot.particles?.replaceChildren?.();}catch{}
   slot.miniTween=null;slot.miniPositions=new Map();slot.dirtyMain=true;slot.dirtyMini=true;
   try{if('lastState'in slot)slot.lastState=null;}catch{}
  }
 }catch(error){console.warn('[SharedLifecycle217] slot cleanup',error?.message||error);}
}
function hideResultLayer(){
 try{
  const layer=document.getElementById('round-result-layer');
  if(layer){layer.hidden=true;layer.classList.remove('show','active','is-visible');}
 }catch{}
}
function repaint(target){
 try{typeof renderRoundResult==='function'&&renderRoundResult(target);}catch{}
 try{typeof syncPause==='function'&&syncPause();}catch{}
 try{typeof scheduleUI==='function'&&scheduleUI(target);}catch{}
 try{typeof requestFit==='function'&&requestFit();}catch{}
 try{target.onChange?.(target);}catch{}
}
function clearPresentation(target){
 target.payout=null;target.result=null;target.dealing=false;target.fastForward=false;target.drawHeld=false;target.paused=false;
 for(const engine of target.engines||[]){
  try{engine.paused=false;engine.presentationRate=1;engine.busy=false;engine.running=false;}catch{}
 }
}
function hardRebuild(target,credit,bets,reason){
 resetGeneration++;
 stopRoundPresentation();clearSlotVisuals();
 try{rouletteDrawSource?.reset?.();}catch(error){console.warn('[SharedLifecycle217] draw reset',error?.message||error);}
 clearPresentation(target);
 target.credit=credit;target.displayCredit=credit;
 if(positive(bets.bets))target.bets=[...bets.bets];
 target.phase='complete';
 // Arcade.prepare is the canonical new-game path: it increments token (which
 // invalidates every old async callback), clears result data and resets every
 // engine. It must run even when processed was already changed back to zero.
 try{
  if(typeof target.prepare==='function')target.prepare();
  else throw Error('prepare_missing');
 }catch(error){
  console.warn('[SharedLifecycle217] prepare',error?.message||error);
  target.token=finite(target.token)+1;target.phase='ready';target.draws=[];
 }
 // Force every game engine to generate a completely new board a second time.
 // This intentionally does not depend on processed/busy because those flags can
 // already be zero while the old board and tab payout cache are still visible.
 for(const engine of target.engines||[]){
  try{if(typeof engine.reset==='function')engine.reset({keepWonder:true});}catch(error){console.warn('[SharedLifecycle217] engine rebuild',error?.message||error);}
  try{
   engine.paused=false;engine.presentationRate=1;engine.busy=false;engine.running=false;
   if(Array.isArray(engine.queue))engine.queue.length=0;
   else if(engine.queue?.clear)engine.queue.clear();
  }catch{}
 }
 target.phase='ready';target.draws=[];target.payout=null;target.result=null;target.dealing=false;target.fastForward=false;target.drawHeld=false;target.paused=false;
 target.paid=(target.engines||[]).map(()=>false);target.roundWins=(target.engines||[]).map(()=>0);target.totalWin=0;
 if(positive(bets.bets))target.bets=[...bets.bets];
 target.locked=(target.engines||[]).map(()=>0);
 target.enabled=(target.bets||[]).map(value=>finite(value)>0);
 target.credit=credit;target.displayCredit=credit;
 clearSlotVisuals();hideResultLayer();repaint(target);
 console.info('[SharedLifecycle217] complete board/tab rebuild',reason,'generation',resetGeneration);
}
async function settleCredit(target,sharedRound){
 const c=client(),roundId=String(sharedRound?.roundId||'');
 const participant=sharedRound?.participant||{};
 const saved=participant.settlement;
 if(Number.isFinite(Number(saved?.creditAfter)))return Number(saved.creditAfter);
 const base=Number.isFinite(Number(participant.creditAfterBet))?Number(participant.creditAfterBet):finite(target.credit);
 const totalWin=Math.max(0,finite(target.totalWin));
 const expected=base+totalWin;
 if(!c?.online||!roundId)return expected;
 if(!sharedRound.settleSent){
  sharedRound.settleSent=true;
  try{
   const response=await c.settle({roundId,totalWin,creditAfter:expected,immediateReset:true});
   if(response?.settlement){sharedRound.participant={...participant,settlement:response.settlement};return finite(response.settlement.creditAfter);}
  }catch(error){
   sharedRound.settleSent=false;
   console.warn('[SharedLifecycle217] settlement retry',error?.message||error);
  }
 }
 try{
  const state=await c.getState();c.accept?.(state);
  for(const round of [state?.pendingRound,state?.round]){
   if(round?.id===roundId&&Number.isFinite(Number(round.participant?.settlement?.creditAfter)))return Number(round.participant.settlement.creditAfter);
  }
 }catch{}
 return expected;
}
async function forceInitial(reason='result-complete'){
 if(resetBusy||typeof app==='undefined')return false;
 const sharedRound=active(),serverRound=currentRound();
 if(serverRound?.phase==='PLAYING'&&serverRound?.participant?.playerId&&sharedRound?.roundId===serverRound.id)return false;
 resetBusy=true;
 const roundId=String(sharedRound?.roundId||serverRound?.id||'');
 const bets=snapshotBet(app);
 try{
  const credit=await settleCredit(app,sharedRound);
  hardRebuild(app,credit,bets,reason);
  // Late result callbacks can repaint the old board after prepare(). Recheck the
  // actual engine and DOM state and rebuild again until it remains pristine.
  for(const delay of [70,180,360,720]){
   await sleep(delay);
   if(isPristineAfterReset(app))continue;
   hardRebuild(app,credit,bets,reason+'-verify');
  }
  if(!isPristineAfterReset(app))hardRebuild(app,credit,bets,reason+'-final');
  lastResetRound=roundId;resultSince=0;resetCompletedAt=Date.now();
  status('WAIT','新盤面初期化完了・次のSERVER BET TIME待機');
  try{
   const c=client(),state=await c?.getState?.();
   if(state){gate()?.noteState?.(state);c.accept?.(state);}
  }catch(error){console.warn('[SharedLifecycle217] next state refresh',error?.message||error);}
  setTimeout(()=>window.SweetsNextBetJoinV217?.syncNow?.(),0);
  return true;
 }finally{resetBusy=false;}
}
function isPristineAfterReset(target=window.app){
 if(!target)return false;
 return target.phase==='ready'&&!(target.draws?.length)&&!target.payout&&!target.result&&!target.dealing&&!target.fastForward&&!active()&&
  (target.engines||[]).every(engineClean)&&resultLayerHidden();
}
function canStart(target){
 const round=authorisedRound(),shared=machine(),connectionGate=gate();
 return !!(client()?.online&&round&&connectionGate?.canStart?.(round)&&(!shared?.active||shared.active.roundId===round.id)&&isPristineAfterReset(target)&&!resetBusy);
}
function installStartGuard(){
 if(typeof Arcade!=='function'||!Arcade.prototype)return false;
 const proto=Arcade.prototype;if(proto.__sharedLifecycleStartV217)return true;
 const nativeStart=proto.start;if(typeof nativeStart!=='function')return false;
 Object.defineProperty(proto,'__sharedLifecycleStartV217',{value:true});
 proto.start=function(...args){
  stopLocalAuto();
  if(!canStart(this)){
   const time=Date.now();if(time-lastBlockedAt>1500){lastBlockedAt=time;console.info('[SharedLifecycle217] blocked dirty/unstable/non-authoritative start',currentRound()?.phase||'no-round');}
   status(gate()?.stable?.()?'NEXT':'WAIT',gate()?.stable?.()?'新盤面または次のBET待機':'安定接続を確認中');
   return false;
  }
  return nativeStart.apply(this,args);
 };
 if(typeof startReadyRound==='function'){
  nativeStartReady=startReadyRound;
  try{startReadyRound=function(...args){stopLocalAuto();return canStart(app)?nativeStartReady.apply(this,args):false;};}catch{}
 }
 if(typeof scheduleAutoRound==='function'){
  try{scheduleAutoRound=function(){stopLocalAuto();return false;};}catch{}
 }
 return true;
}
function monitor(){
 monitorTimer=0;stopLocalAuto();
 if(typeof app==='undefined'||!installStartGuard()){monitorTimer=setTimeout(monitor,60);return;}
 const phase=String(app.phase||''),sharedRound=active(),round=currentRound();
 if(phase==='playing'&&!sharedRound&&!gate()?.canStart?.(round)){
  forceInitial('unauthorised-playing');monitorTimer=setTimeout(monitor,80);return;
 }
 if(['result','paying','complete','error'].includes(phase)){
  if(!resultSince)resultSince=Date.now();
  const age=Date.now()-resultSince,serverDone=round?.phase!=='PLAYING'||(round?.balls?.length||0)>=8;
  // Preserve the normal result and payout. Reset immediately after native
  // COMPLETE; result/paying thresholds are watchdogs only.
  if(serverDone&&((phase==='complete'&&age>160)||(phase==='paying'&&age>9000)||(phase==='result'&&age>15000)||(phase==='error'&&age>1200)))forceInitial('phase-'+phase);
 }else resultSince=0;
 if(phase==='ready'&&!sharedRound&&!isPristineAfterReset(app))forceInitial('dirty-ready');
 monitorTimer=setTimeout(monitor,100);
}
function boot(){
 if(typeof app==='undefined'||!window.SweetsSharedMachine?.client||!window.SweetsConnectionGateV217){setTimeout(boot,50);return;}
 stopLocalAuto();installStartGuard();monitor();
 window.SweetsSharedLifecycleV217={forceInitial,canStart,stopLocalAuto,isPristine:()=>isPristineAfterReset(app)&&!resetBusy,get resetBusy(){return resetBusy;},get resetGeneration(){return resetGeneration;},get resetCompletedAt(){return resetCompletedAt;},get lastResetRound(){return lastResetRound;}};
 addEventListener('beforeunload',()=>clearTimeout(monitorTimer),{once:true});
 console.info('[SharedLifecycle217] full engine/board/tab rebuild and stable next-game guard enabled');
}
boot();
})();

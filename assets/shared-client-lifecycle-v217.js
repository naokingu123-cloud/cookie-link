(()=>{
'use strict';
if(window.__sweetsSharedClientLifecycleV217)return;
window.__sweetsSharedClientLifecycleV217=true;
const params=new URLSearchParams(location.search);
if(params.get('serverHost')==='1'||params.get('serverSettlementWorker')==='1')return;

const finite=value=>Number.isFinite(Number(value))?Number(value):0;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let monitorTimer=0,resultSince=0,resetBusy=false,lastResetRound='',lastBlockedAt=0;
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
function repaint(target){
 try{typeof renderRoundResult==='function'&&renderRoundResult(target);}catch{}
 try{typeof scheduleUI==='function'&&scheduleUI(target);}catch{}
 try{target.onChange?.(target);}catch{}
}
function positive(values){return Array.isArray(values)&&values.some(value=>finite(value)>0);}
function snapshotBet(target){
 const bets=Array.isArray(target?.bets)?target.bets.map(value=>Math.max(0,finite(value))):[];
 const locked=Array.isArray(target?.locked)?target.locked.map(value=>Math.max(0,finite(value))):[...bets];
 const enabled=Array.isArray(target?.enabled)?target.enabled.map(Boolean):bets.map(value=>value>0);
 return {bets,locked,enabled};
}
function clearPresentation(target){
 target.payout=null;target.result=null;target.dealing=false;target.fastForward=false;target.drawHeld=false;target.paused=false;
 for(const engine of target.engines||[]){
  try{engine.paused=false;engine.presentationRate=1;engine.busy=false;engine.running=false;}catch{}
 }
}
function manualReady(target,bets){
 clearPresentation(target);target.phase='ready';target.draws=[];
 target.paid=(target.paid||[]).map(()=>false);
 target.roundWins=(target.roundWins||[]).map(()=>0);target.totalWin=0;
 if(positive(bets.bets))target.bets=[...bets.bets];
 if(positive(bets.locked))target.locked=[...bets.locked];
 if(Array.isArray(bets.enabled)&&bets.enabled.length)target.enabled=[...bets.enabled];
}
function needsEngineReset(target){
 return (target.engines||[]).some(engine=>finite(engine?.processed)>0||finite(engine?.accepted)>0||engine?.busy||engine?.running);
}
function releaseToInitial(target,credit,bets){
 stopLocalAuto();
 try{rouletteDrawSource?.reset?.();}catch(error){console.warn('[SharedLifecycle217] draw reset',error?.message||error);}
 clearPresentation(target);target.phase='complete';
 try{if(typeof target.prepare==='function')target.prepare();}catch(error){console.warn('[SharedLifecycle217] prepare',error?.message||error);}
 if(target.phase!=='ready'||target.draws?.length||needsEngineReset(target)){
  for(const engine of target.engines||[]){
   if(!(finite(engine?.processed)>0||finite(engine?.accepted)>0||engine?.busy||engine?.running))continue;
   try{if(typeof engine.reset==='function')engine.reset();}catch(error){console.warn('[SharedLifecycle217] engine reset',error?.message||error);}
  }
  manualReady(target,bets);
 }
 target.credit=credit;target.displayCredit=credit;
 clearPresentation(target);repaint(target);
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
  releaseToInitial(app,credit,bets);
  lastResetRound=roundId;resultSince=0;
  status('WAIT','初期化完了・次の安定したSERVER BET TIME待機');
  const verify=async()=>{
   for(const delay of [60,220,600,1200]){
    await sleep(delay);
    const nowRound=authorisedRound(),nowActive=active();
    if(nowRound&&nowActive?.roundId===nowRound.id&&gate()?.canStart?.(nowRound))return;
    if(app.phase!=='ready'||app.draws?.length||app.payout||app.result)releaseToInitial(app,credit,bets);
   }
   try{
    const c=client(),state=await c?.getState?.();if(state)c.accept?.(state);
    window.SweetsNextBetJoinV217?.syncNow?.();
   }catch(error){console.warn('[SharedLifecycle217] next BET refresh',error?.message||error);}
  };
  verify();
  console.info('[SharedLifecycle217] returned to stable initial state',reason,roundId||'(no round)');
  return true;
 }finally{resetBusy=false;}
}
function canStart(target){
 const round=authorisedRound(),shared=machine(),connectionGate=gate();
 return !!(client()?.online&&round&&connectionGate?.canStart?.(round)&&(!shared?.active||shared.active.roundId===round.id)&&target.phase==='ready');
}
function installStartGuard(){
 if(typeof Arcade!=='function'||!Arcade.prototype)return false;
 const proto=Arcade.prototype;if(proto.__sharedLifecycleStartV217)return true;
 const nativeStart=proto.start;if(typeof nativeStart!=='function')return false;
 Object.defineProperty(proto,'__sharedLifecycleStartV217',{value:true});
 proto.start=function(...args){
  stopLocalAuto();
  if(!canStart(this)){
   const time=Date.now();if(time-lastBlockedAt>1500){lastBlockedAt=time;console.info('[SharedLifecycle217] blocked unstable/non-authoritative local start',currentRound()?.phase||'no-round');}
   status(gate()?.stable?.()?'NEXT':'WAIT',gate()?.stable?.()?'次のSERVER BET TIME待機':'安定接続を確認中');
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
  forceInitial('unauthorised-playing');
  monitorTimer=setTimeout(monitor,80);return;
 }
 const resultLike=['result','paying','complete','error'].includes(phase);
 if(resultLike){
  if(!resultSince)resultSince=Date.now();
  const age=Date.now()-resultSince;
  const serverDone=round?.phase!=='PLAYING'||(round?.balls?.length||0)>=8;
  if(serverDone&&((phase==='complete'&&age>120)||(phase!=='complete'&&age>3200)))forceInitial('phase-'+phase);
 }else resultSince=0;
 if(phase==='ready'&&!sharedRound&&(app.draws?.length||app.payout||app.result))forceInitial('dirty-ready');
 monitorTimer=setTimeout(monitor,100);
}
function boot(){
 if(typeof app==='undefined'||!window.SweetsSharedMachine?.client||!window.SweetsConnectionGateV217){setTimeout(boot,50);return;}
 stopLocalAuto();installStartGuard();monitor();
 window.SweetsSharedLifecycleV217={forceInitial,canStart,stopLocalAuto,get lastResetRound(){return lastResetRound;}};
 addEventListener('beforeunload',()=>clearTimeout(monitorTimer),{once:true});
 console.info('[SharedLifecycle217] unstable/local eight-ball hard block and stable post-result reset enabled');
}
boot();
})();

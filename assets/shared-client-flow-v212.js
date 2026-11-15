(()=>{
'use strict';
if(window.__sweetsSharedClientFlowV212)return;
window.__sweetsSharedClientFlowV212=true;

const finite=value=>Number.isFinite(Number(value))?Number(value):0;
const resetJobs=new WeakMap();

function markGameZero(){
 try{
  const engine=app?.engines?.[0];
  if(!engine)return;
  const raw=String(engine.kind||engine.id||'').toLowerCase();
  if(!raw||raw==='game0'||raw==='game-0'||raw==='game_0')engine.kind='cookie';
 }catch(error){console.warn('[SharedClientFlowV212] GAME0 mapping',error);}
}

function applyCredit(machine,creditAfter){
 const credit=finite(creditAfter);
 machine.credit=credit;
 machine.displayCredit=credit;
 return credit;
}

function clearRoundPresentation(machine){
 machine.payout=null;
 machine.result=null;
 machine.dealing=false;
 machine.fastForward=false;
 machine.drawHeld=false;
 for(const engine of machine.engines||[]){
  try{engine.paused=false;engine.presentationRate=1;}catch{}
 }
}

function manualReady(machine){
 machine.phase='ready';
 machine.draws=[];
 machine.paid=(machine.paid||[]).map(()=>false);
 machine.roundWins=(machine.roundWins||[]).map(()=>0);
 machine.totalWin=0;
}

function repaint(machine){
 try{typeof renderRoundResult==='function'&&renderRoundResult(machine);}catch{}
 try{typeof scheduleUI==='function'&&scheduleUI(machine);}catch{}
 try{machine.onChange?.(machine);}catch{}
}

function refreshServerState(shared){
 const client=shared?.client;
 if(!client?.online||typeof client.getState!=='function')return;
 Promise.resolve(client.getState()).then(state=>{
  try{client.accept?.(state);}catch{}
  try{client.syncReady?.();}catch{}
 }).catch(error=>console.warn('[SharedClientFlowV212] state refresh',error?.message||error));
}

function forceNextBet(machine,creditAfter,shared,active,attempt=0){
 const job=resetJobs.get(machine);
 if(!job||job.active!==active||job.finished)return;
 try{
  applyCredit(machine,creditAfter);
  clearRoundPresentation(machine);

  // Always restore COMPLETE immediately before reset/prepare. The normal
  // eighth-ball call stack may overwrite phase after beginPayout returns.
  machine.phase='complete';

  // This is the same path as the working immediate-reset operation. In the
  // shared-machine core it releases `current` and app.__sharedRound.
  try{rouletteDrawSource?.reset?.();}catch(error){console.warn('[SharedClientFlowV212] draw reset',error);}

  machine.phase='complete';
  if(typeof machine.prepare==='function')machine.prepare();
  else manualReady(machine);
  if(machine.phase!=='ready')manualReady(machine);

  applyCredit(machine,creditAfter);
  clearRoundPresentation(machine);
  repaint(machine);
  try{shared?.client?.syncReady?.();}catch{}
  try{typeof countdownText==='function'&&countdownText('WAIT','即時精算完了・次のSERVER BET TIME待機');}catch{}

  job.finished=true;
  refreshServerState(shared);
 }catch(error){
  console.warn('[SharedClientFlowV212] force next BET',error);
  if(attempt<6)setTimeout(()=>forceNextBet(machine,creditAfter,shared,active,attempt+1),50);
  else{
   try{manualReady(machine);applyCredit(machine,creditAfter);repaint(machine);}catch{}
   job.finished=true;
   refreshServerState(shared);
  }
 }
}

function finishImmediately(machine,creditAfter,shared,active){
 try{
  applyCredit(machine,creditAfter);
  clearRoundPresentation(machine);
  machine.phase='complete';
  repaint(machine);
  try{typeof countdownText==='function'&&countdownText('NEXT','即時精算・共有ラウンド解放中');}catch{}

  const previous=resetJobs.get(machine);
  if(previous)previous.finished=true;
  resetJobs.set(machine,{active,finished:false});

  // Use a macrotask and do not require phase to remain COMPLETE. This runs
  // after the eighth-ball/result caller has finished changing app state.
  setTimeout(()=>forceNextBet(machine,creditAfter,shared,active,0),0);
  return true;
 }catch(error){console.warn('[SharedClientFlowV212] immediate finish',error);return false;}
}

function install(){
 if(typeof Arcade!=='function'||typeof app==='undefined'||!app?.engines||!window.SweetsSharedMachine?.client){setTimeout(install,60);return;}
 markGameZero();
 const proto=Arcade.prototype;
 if(proto.__sharedClientFlowV212)return;
 Object.defineProperty(proto,'__sharedClientFlowV212',{value:true});
 const nativeBegin=proto.beginPayout;

 proto.beginPayout=function(...args){
  markGameZero();
  const shared=window.SweetsSharedMachine,active=shared?.active,client=shared?.client;
  if(!active||!client?.online)return nativeBegin.apply(this,args);

  const saved=active.participant?.settlement;
  const totalWin=Math.max(0,finite(this.totalWin));
  const creditAfter=Number.isFinite(Number(saved?.creditAfter))?Number(saved.creditAfter):finite(this.credit)+totalWin;

  if(!saved&&!active.settleSent){
   active.settleSent=true;
   Promise.resolve(client.settle({roundId:active.roundId,totalWin,creditAfter,immediateReset:true})).then(response=>{
    const settlement=response?.settlement;
    if(settlement&&window.SweetsSharedMachine?.active===active)active.participant={...(active.participant||{}),settlement};
    refreshServerState(shared);
   }).catch(error=>{
    if(window.SweetsSharedMachine?.active===active)active.settleSent=false;
    console.warn('[SharedClientFlowV212] immediate settlement',error?.message||error);
   });
  }

  finishImmediately(this,creditAfter,shared,active);
  return true;
 };
 console.info('[SharedClientFlowV212] GAME0=Cookie Link; authoritative settlement, explicit shared reset and next-BET sync enabled');
}
install();
})();

(()=>{
'use strict';
if(window.__sweetsSharedClientFlowV211)return;
window.__sweetsSharedClientFlowV211=true;

const finite=value=>Number.isFinite(Number(value))?Number(value):0;

function markGameZero(){
 try{
  const engine=app?.engines?.[0];
  if(!engine)return;
  const raw=String(engine.kind||engine.id||'').toLowerCase();
  if(!raw||raw==='game0'||raw==='game-0'||raw==='game_0')engine.kind='cookie';
 }catch(error){console.warn('[SharedClientFlowV211] GAME0 mapping',error);}
}

function finishImmediately(machine,creditAfter,reason='サーバー精算を送信済み'){
 try{
  machine.credit=finite(creditAfter);
  machine.displayCredit=machine.credit;
  machine.payout=null;
  machine.result=null;
  machine.dealing=false;
  machine.fastForward=false;
  machine.drawHeld=false;
  machine.phase='complete';
  for(const engine of machine.engines||[]){try{engine.paused=false;engine.presentationRate=1;}catch{}}
  try{typeof renderRoundResult==='function'&&renderRoundResult(machine);}catch{}
  try{typeof scheduleUI==='function'&&scheduleUI(machine);}catch{}
  try{machine.onChange?.(machine);}catch{}
  try{typeof countdownText==='function'&&countdownText('NEXT',reason+'・次のBET TIME待機');}catch{}
  queueMicrotask(()=>{
   try{
    if(machine.phase!=='complete')return;
    if(typeof machine.prepare==='function')machine.prepare();
    else machine.phase='ready';
    machine.credit=finite(creditAfter);
    machine.displayCredit=machine.credit;
    machine.onChange?.(machine);
   }catch(error){console.warn('[SharedClientFlowV211] immediate prepare',error);}
  });
  return true;
 }catch(error){console.warn('[SharedClientFlowV211] immediate finish',error);return false;}
}

function install(){
 if(typeof Arcade!=='function'||typeof app==='undefined'||!app?.engines||!window.SweetsSharedMachine?.client){setTimeout(install,60);return;}
 markGameZero();
 const proto=Arcade.prototype;
 if(proto.__sharedClientFlowV211)return;
 Object.defineProperty(proto,'__sharedClientFlowV211',{value:true});
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
   client.settle({roundId:active.roundId,totalWin,creditAfter,immediateReset:true}).then(response=>{
    const settlement=response?.settlement;
    if(settlement&&window.SweetsSharedMachine?.active===active)active.participant={...(active.participant||{}),settlement};
   }).catch(error=>{
    if(window.SweetsSharedMachine?.active===active)active.settleSent=false;
    console.warn('[SharedClientFlowV211] immediate settlement',error?.message||error);
   });
  }
  finishImmediately(this,creditAfter,saved?'サーバー精算済み':'即時精算');
  return true;
 };
 console.info('[SharedClientFlowV211] GAME0=Cookie Link; immediate CREDIT settlement and reset enabled');
}
install();
})();

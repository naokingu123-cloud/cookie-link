(()=>{
'use strict';
if(window.__sweetsSharedClientFlowV217)return;
window.__sweetsSharedClientFlowV217=true;

const finite=value=>Number.isFinite(Number(value))?Number(value):0;

function markGameZero(){
 try{
  const engine=app?.engines?.[0];
  if(!engine)return;
  const raw=String(engine.kind||engine.id||'').toLowerCase();
  if(!raw||raw==='game0'||raw==='game-0'||raw==='game_0')engine.kind='cookie';
 }catch(error){console.warn('[SharedClientFlowV217] GAME0 mapping',error);}
}
function refreshServerState(shared){
 const client=shared?.client;
 if(!client?.online||typeof client.getState!=='function')return;
 Promise.resolve(client.getState()).then(state=>{
  try{window.SweetsConnectionGateV217?.noteState?.(state);}catch{}
  try{client.accept?.(state);}catch{}
  try{client.syncReady?.();}catch{}
 }).catch(error=>console.warn('[SharedClientFlowV217] state refresh',error?.message||error));
}
function install(){
 if(typeof Arcade!=='function'||typeof app==='undefined'||!app?.engines||!window.SweetsSharedMachine?.client){setTimeout(install,50);return;}
 markGameZero();
 const proto=Arcade.prototype;
 if(proto.__sharedClientFlowV217)return;
 Object.defineProperty(proto,'__sharedClientFlowV217',{value:true});
 const nativeBegin=proto.beginPayout;
 if(typeof nativeBegin!=='function')return;

 proto.beginPayout=function(...args){
  markGameZero();
  // Always execute the game's native payout. It is the authoritative path that
  // commits totalWin into CREDIT and advances paying -> complete.
  const began=nativeBegin.apply(this,args);
  if(!began)return began;

  const shared=window.SweetsSharedMachine,active=shared?.active,client=shared?.client;
  if(!active||!client?.online)return began;
  const totalWin=Math.max(0,finite(this.totalWin));
  const creditAfter=finite(this.credit);
  const saved=active.participant?.settlement;
  if(!saved&&!active.settleSent){
   active.settleSent=true;
   Promise.resolve(client.settle({roundId:active.roundId,totalWin,creditAfter,immediateReset:true})).then(response=>{
    const settlement=response?.settlement;
    if(settlement&&window.SweetsSharedMachine?.active===active)active.participant={...(active.participant||{}),settlement};
    refreshServerState(shared);
   }).catch(error=>{
    if(window.SweetsSharedMachine?.active===active)active.settleSent=false;
    console.warn('[SharedClientFlowV217] settlement',error?.message||error);
   });
  }
  // Lifecycle v217 observes native COMPLETE and performs one full visual and
  // engine reset. Do not run a second partial prepare() here.
  return began;
 };
 console.info('[SharedClientFlowV217] native payout + authoritative settlement enabled; lifecycle owns the only full reset');
}
install();
})();

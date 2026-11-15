(()=>{
'use strict';
if(window.__sweetsSharedClientControllerV222)return;
window.__sweetsSharedClientControllerV222=true;
const params=new URLSearchParams(location.search);
if(params.get('serverHost')==='1'||params.get('serverSettlementWorker')==='1')return;

const POLL_MS=180,ORPHAN_GRACE_MS=15000;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const finite=value=>Number.isFinite(Number(value))?Number(value):0;
const machine=()=>window.SweetsSharedMachine;
const client=()=>machine()?.client;
const active=()=>machine()?.active;
let nativeStart=null,pollTimer=0,pollBusy=false,resetBusy=false,startBusy=false;
let resultSince=0,orphanSince=0,lastStatus='',generation=0,lastBet=[];

function stopLocal(){
 try{if(typeof stopAutoRound==='function')stopAutoRound();}catch{}
 try{if(typeof autoRoundStamp!=='undefined')autoRoundStamp=null;}catch{}
 try{if(typeof stopResultAuto==='function')stopResultAuto();}catch{}
 try{if(typeof resultAutoToken!=='undefined')resultAutoToken=-1;}catch{}
 try{if(typeof roundStarting!=='undefined')roundStarting=false;}catch{}
}
function status(text,label='共有抽選'){
 const key=label+'|'+text;if(lastStatus===key)return;lastStatus=key;
 try{if(typeof countdownText==='function')countdownText(text,label);}catch{}
}
function socketOpen(c=client()){
 if(!c?.online)return false;const ws=c.ws;if(!ws)return true;
 const OPEN=typeof WebSocket==='function'?WebSocket.OPEN:1;return ws.readyState===OPEN;
}
function selected(target=window.app){
 const bets=Array.isArray(target?.bets)?target.bets.map(value=>Math.max(0,finite(value))):[];
 const locked=Array.isArray(target?.locked)?target.locked.map(value=>Math.max(0,finite(value))):[...bets];
 const enabled=Array.isArray(target?.enabled)?target.enabled.map(Boolean):bets.map(value=>value>0);
 if(bets.some(value=>value>0))lastBet=[...bets];else if(lastBet.length)for(let i=0;i<lastBet.length;i++)bets[i]=Math.max(0,finite(lastBet[i]));
 return {bets,locked:locked.some(value=>value>0)?locked:[...bets],enabled:enabled.length?enabled:bets.map(value=>value>0)};
}
function queueSize(engine){const q=engine?.queue;if(Array.isArray(q))return q.length;if(q&&Number.isFinite(Number(q.size)))return Number(q.size);return 0;}
function engineClean(engine){return finite(engine?.processed)===0&&finite(engine?.accepted)===0&&!engine?.busy&&!engine?.running&&queueSize(engine)===0;}
function resultHidden(){
 const node=document.getElementById('round-result-layer');if(!node)return true;
 try{return node.hidden||getComputedStyle(node).display==='none'||getComputedStyle(node).visibility==='hidden';}catch{return !!node.hidden;}
}
function modelReady(target=window.app){return !!target&&target.phase==='ready'&&!(target.draws?.length)&&!target.payout&&!target.result&&!target.dealing&&!target.fastForward&&!active()&&(target.engines||[]).every(engineClean)&&resultHidden();}
function hideResults(){
 const direct=document.getElementById('round-result-layer');if(direct){direct.hidden=true;direct.classList?.remove?.('show','active','is-visible');}
 try{for(const selector of ['.round-result','.result-overlay','.payout-overlay','[data-result-overlay]'])for(const node of document.querySelectorAll(selector)){node.hidden=true;node.classList?.remove?.('show','active','is-visible');}}catch{}
}
function markDirty(){
 try{if(typeof slots!=='undefined'&&Array.isArray(slots))for(const slot of slots){slot.dirtyMain=true;slot.dirtyMini=true;slot.lastState=null;slot.lastMainState=null;slot.lastMiniState=null;slot.miniTween=null;slot.mainTween=null;try{slot.particles?.replaceChildren?.();}catch{}}}catch{}
}
function renderAll(target){
 hideResults();markDirty();
 for(const name of ['renderGameTabs','renderTabs','renderSlots','renderMain','renderAll','renderGames','renderRoundResult','syncPause','requestFit'])try{const fn=globalThis[name];if(typeof fn==='function')fn(target);}catch{}
 try{if(typeof scheduleUI==='function')scheduleUI(target);}catch{}
 try{target.onChange?.(target);}catch{}
 try{requestAnimationFrame(()=>{markDirty();try{if(typeof scheduleUI==='function')scheduleUI(target);}catch{}try{target.onChange?.(target);}catch{}});}catch{}
}
function clearTop(target,credit,bet,phase){
 target.token=finite(target.token)+1;target.phase=phase;target.draws=[];target.payout=null;target.result=null;target.dealing=false;target.fastForward=false;target.drawHeld=false;target.paused=false;target.totalWin=0;
 target.paid=(target.engines||[]).map(()=>false);target.roundWins=(target.engines||[]).map(()=>0);target.bets=[...bet.bets];target.locked=[...bet.locked];target.enabled=[...bet.enabled];target.credit=credit;target.displayCredit=credit;
}
function resetEngines(target){
 for(const [index,engine] of (target.engines||[]).entries()){
  if(index===0&&(!engine.kind||/^game[-_ ]?0$/i.test(String(engine.kind))))engine.kind='cookie';
  try{engine.paused=false;engine.presentationRate=1;engine.busy=false;engine.running=false;}catch{}
  try{if(Array.isArray(engine.queue))engine.queue.length=0;else engine.queue?.clear?.();}catch{}
  try{if(typeof engine.reset==='function'){try{engine.reset({keepWonder:false,forceNew:true,newRound:true});}catch{engine.reset();}}}catch(error){console.warn('[SharedController222] engine reset',index,error?.message||error);}
 }
}
function rebuild(target,credit,bet,reason){
 generation++;stopLocal();try{rouletteDrawSource?.reset?.();}catch{}
 clearTop(target,credit,bet,'complete');resetEngines(target);
 try{target.prepare?.();}catch(error){console.warn('[SharedController222] prepare',error?.message||error);}
 clearTop(target,credit,bet,'ready');
 if(!(target.engines||[]).every(engineClean)){clearTop(target,credit,bet,'complete');resetEngines(target);try{target.prepare?.();}catch{}clearTop(target,credit,bet,'ready');}
 hideResults();renderAll(target);console.info('[SharedController222] fresh board',reason,'generation',generation);
}
async function settleCredit(target,shared){
 const c=client(),roundId=String(shared?.roundId||''),participant=shared?.participant||{};
 if(Number.isFinite(Number(participant.settlement?.creditAfter)))return Number(participant.settlement.creditAfter);
 const base=Number.isFinite(Number(participant.creditAfterBet))?Number(participant.creditAfterBet):finite(target.credit),totalWin=Math.max(0,finite(target.totalWin)),expected=base+totalWin;
 if(!c?.online||!roundId)return expected;
 try{const response=await c.settle({roundId,totalWin,creditAfter:expected,immediateReset:true});if(response?.settlement)return finite(response.settlement.creditAfter);}catch(error){console.warn('[SharedController222] settle',error?.message||error);}
 return expected;
}
async function forceInitial(reason='result-complete',creditOverride=null){
 if(resetBusy||typeof app==='undefined')return false;resetBusy=true;
 const shared=active(),bet=selected(app);
 try{
  // null/undefined means normal result settlement. Number(null) is 0, so an
  // explicit presence check is mandatory; otherwise every normal result skips
  // the server settle call and can leave the participant permanently pending.
  const hasOverride=creditOverride!==null&&creditOverride!==undefined&&Number.isFinite(Number(creditOverride));
  const credit=hasOverride?Number(creditOverride):await settleCredit(app,shared);
  rebuild(app,credit,bet,reason);
  for(const delay of [80,240,620,1200]){await sleep(delay);if(!modelReady(app))rebuild(app,credit,bet,reason+'-late');}
  resultSince=0;orphanSince=0;status('WAIT','初期盤面へ復帰・次のSERVER BET TIME待機');
  return modelReady(app);
 }finally{resetBusy=false;}
}
function serverOwnsRound(round=client()?.round){return !!(round?.phase==='PLAYING'&&round?.participant?.playerId);}
function canStart(target=window.app){return !!(!resetBusy&&target?.phase==='ready'&&modelReady(target)&&socketOpen()&&serverOwnsRound());}
function applyParticipant(participant){
 if(!participant||typeof app==='undefined')return;const bets=Array.isArray(participant.bets)?participant.bets.map(v=>Math.max(0,finite(v))):[],locked=Array.isArray(participant.locked)?participant.locked.map(v=>Math.max(0,finite(v))):[...bets],enabled=Array.isArray(participant.enabled)?participant.enabled.map(Boolean):bets.map(v=>v>0);
 app.bets=[...bets];app.locked=[...locked];app.enabled=[...enabled];if(bets.some(v=>v>0))lastBet=[...bets];if(Number.isFinite(Number(participant.creditAfterBet))){app.credit=Number(participant.creditAfterBet);app.displayCredit=app.credit;}
}
function installGuard(){
 if(typeof Arcade!=='function'||!Arcade.prototype)return false;const proto=Arcade.prototype;if(proto.__sharedControllerStartV222)return true;
 nativeStart=proto.start;if(typeof nativeStart!=='function')return false;Object.defineProperty(proto,'__sharedControllerStartV222',{value:true});
 proto.start=function(...args){stopLocal();if(!canStart(this)){status(socketOpen()?'NEXT':'WAIT',socketOpen()?'次のSERVER BET TIME待機':'SERVER再接続待機');return false;}return nativeStart.apply(this,args);};
 if(typeof startReadyRound==='function')try{startReadyRound=function(){stopLocal();return canStart(app)?app.start():false;};}catch{}
 if(typeof scheduleAutoRound==='function')try{scheduleAutoRound=function(){stopLocal();return false;};}catch{}
 return true;
}
async function startRound(round){
 if(startBusy||!round?.participant?.playerId||app.phase!=='ready'||active())return false;startBusy=true;
 try{applyParticipant(round.participant);const began=app.start();if(began!==false&&app.phase==='playing'){status('PLAY','SERVER抽選に参加中');return true;}}finally{startBusy=false;}return false;
}
function sameRound(round,id){return !!(round&&String(round.id||'')===String(id||''));}
async function processState(state){
 const m=machine(),shared=active(),activeId=String(shared?.roundId||''),round=state?.round,pending=state?.pendingRound,control=state?.payoutControlV3;
 if(activeId){
  const authoritative=sameRound(round,activeId)?round:(sameRound(pending,activeId)?pending:null);
  if(authoritative){orphanSince=0;m?.syncRound?.(authoritative);if(!socketOpen())status('WAIT','SERVER再接続中・ゲーム状態を保持');return;}
  if(String(control?.wallet?.lastRoundId||'')===activeId&&Number.isFinite(Number(control?.wallet?.credit))){await forceInitial('server-settled-reconnect',Number(control.wallet.credit));return;}
  if(!socketOpen()){status('WAIT','SERVER再接続中・現在ゲームを保持');return;}
  if(control?.offlinePending){status('WAIT','切断中ラウンドをサーバー精算中');return;}
  if(!orphanSince)orphanSince=Date.now();
  if(Date.now()-orphanSince>ORPHAN_GRACE_MS&&round?.id!==activeId)await forceInitial('orphaned-active-round');
  return;
 }
 orphanSince=0;
 if(round?.phase==='PLAYING'&&round.participant?.playerId&&app.phase==='ready')await startRound(round);
}
async function refresh(){
 const c=client();if(!socketOpen(c))return null;const state=await c.getState();c.accept?.(state);machine()?.syncRound?.(state.round);machine()?.syncRound?.(state.pendingRound);await processState(state);return state;
}
async function poll(){
 clearTimeout(pollTimer);stopLocal();installGuard();
 if(pollBusy){pollTimer=setTimeout(poll,POLL_MS);return;}pollBusy=true;
 try{if(socketOpen())await refresh();else if(active())status('WAIT','SERVER再接続中・現在ゲームを保持');else status('WAIT','SERVER再接続待機');}catch(error){if(socketOpen())console.warn('[SharedController222] poll',error?.message||error);}
 finally{pollBusy=false;pollTimer=setTimeout(poll,POLL_MS);}
}
function monitor(){
 if(typeof app==='undefined'){setTimeout(monitor,60);return;}stopLocal();const phase=String(app.phase||''),round=client()?.round,shared=active();
 if(phase==='playing'){
  if(shared){resultSince=0;if(!socketOpen())status('WAIT','SERVER再接続中・ゲーム状態を保持');}
  else if(!serverOwnsRound(round)){if(!orphanSince)orphanSince=Date.now();if(Date.now()-orphanSince>ORPHAN_GRACE_MS)forceInitial('unauthorised-playing');}
 }else if(['result','paying','complete','error'].includes(phase)){
  if(!resultSince)resultSince=Date.now();const age=Date.now()-resultSince,done=round?.phase!=='PLAYING'||(round?.balls?.length||0)>=8,overlayGone=resultHidden();
  if(done&&((phase==='complete'&&age>150)||(overlayGone&&age>700)||(phase==='error'&&age>900)||age>4600))forceInitial('phase-'+phase);
 }else resultSince=0;
 if(phase==='ready'&&!active()&&!modelReady(app))forceInitial('dirty-ready');setTimeout(monitor,100);
}
function boot(){
 if(typeof app==='undefined'||!client()||typeof Arcade!=='function'){setTimeout(boot,50);return;}
 if(app.engines?.[0]&&(!app.engines[0].kind||/^game[-_ ]?0$/i.test(String(app.engines[0].kind))))app.engines[0].kind='cookie';
 stopLocal();installGuard();poll();monitor();
 client().on?.(message=>{if(['snapshot','ball_result','round_started','round_complete','betting_started','host_changed','host_status'].includes(message?.type))setTimeout(poll,0);});
 window.SweetsSharedControllerV222={forceInitial,canStart,refreshNow:refresh,isReady:()=>modelReady(app),describe:()=>({socketOpen:socketOpen(),activeRound:active()?.roundId||null,orphanSince,resetBusy,generation})};
 addEventListener('beforeunload',()=>clearTimeout(pollTimer),{once:true});console.info('[SharedController222] reconnect-safe authoritative rounds enabled');
}
boot();
})();

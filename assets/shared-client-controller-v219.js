(()=>{
'use strict';
if(window.__sweetsSharedClientControllerV219)return;
window.__sweetsSharedClientControllerV219=true;
const params=new URLSearchParams(location.search);
if(params.get('serverHost')==='1'||params.get('serverSettlementWorker')==='1')return;

const SNAPSHOT_MIN_COUNT=2;
const SNAPSHOT_STABLE_MS=700;
const SNAPSHOT_FRESH_MS=1800;
const MIN_BET_REMAIN_MS=1500;
const POLL_MS=180;
const finite=value=>Number.isFinite(Number(value))?Number(value):0;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const machine=()=>window.SweetsSharedMachine;
const client=()=>machine()?.client;
const active=()=>machine()?.active;

let socketRef=null,connectionEpoch=0,onlineSince=0,firstSnapshotAt=0,lastSnapshotAt=0,snapshotCount=0;
let blockedRoundId='',joinedRoundId='',lastRoundId='',pollTimer=0,pollBusy=false,resetBusy=false,startBusy=false,joinBusy=false;
let resultSince=0,lastStatus='',lastBet=[],lastResetRound='',generation=0;
const joinedRounds=new Set(),settlePromises=new Map();
let nativeStart=null;

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
 if(!c?.online)return false;
 const ws=c.ws;if(!ws)return true;
 const OPEN=typeof WebSocket==='function'?WebSocket.OPEN:1;
 return ws.readyState===OPEN;
}
function resetConnection(reason='offline'){
 connectionEpoch++;onlineSince=0;firstSnapshotAt=0;lastSnapshotAt=0;snapshotCount=0;
 blockedRoundId='';joinedRoundId='';joinedRounds.clear();lastRoundId='';stopLocal();
 if(typeof app!=='undefined'&&app?.phase==='ready')status('WAIT',reason==='socket-change'?'接続状態を確認中':'SERVER再接続待機');
}
function inspectSocket(){
 const c=client(),next=c?.ws||null;
 if(next!==socketRef){socketRef=next;resetConnection('socket-change');}
 if(!socketOpen(c)){if(onlineSince)resetConnection('offline');return false;}
 if(!onlineSince)onlineSince=Date.now();
 return true;
}
function stable(){
 const now=Date.now();
 return inspectSocket()&&snapshotCount>=SNAPSHOT_MIN_COUNT&&firstSnapshotAt>0&&now-firstSnapshotAt>=SNAPSHOT_STABLE_MS&&now-lastSnapshotAt<=SNAPSHOT_FRESH_MS;
}
function noteSnapshot(state){
 const now=Date.now(),round=state?.round;
 if(!firstSnapshotAt)firstSnapshotAt=now;
 lastSnapshotAt=now;snapshotCount++;
 // Until the connection is proven stable, every observed round remains
 // observation-only. This prevents a one-frame connection from entering BET.
 if(!stable()&&round?.id)blockedRoundId=String(round.id);
 if(round?.id)lastRoundId=String(round.id);
}
function selected(target=window.app){
 const bets=Array.isArray(target?.bets)?target.bets.map(value=>Math.max(0,finite(value))):[];
 const locked=Array.isArray(target?.locked)?target.locked.map(value=>Math.max(0,finite(value))):[...bets];
 const enabled=Array.isArray(target?.enabled)?target.enabled.map(Boolean):bets.map(value=>value>0);
 if(bets.some(value=>value>0))lastBet=[...bets];
 else if(lastBet.length)for(let i=0;i<lastBet.length;i++)bets[i]=Math.max(0,finite(lastBet[i]));
 return {bets,locked:locked.some(value=>value>0)?locked:[...bets],enabled:enabled.length?enabled:bets.map(value=>value>0)};
}
function queueSize(engine){
 const queue=engine?.queue;
 if(Array.isArray(queue))return queue.length;
 if(queue&&Number.isFinite(Number(queue.size)))return Number(queue.size);
 return 0;
}
function engineRuntimeClean(engine){
 return finite(engine?.processed)===0&&finite(engine?.accepted)===0&&!engine?.busy&&!engine?.running&&queueSize(engine)===0;
}
function resultLayerHidden(){
 const node=document.getElementById('round-result-layer');
 if(!node)return true;
 try{return node.hidden||getComputedStyle(node).display==='none'||getComputedStyle(node).visibility==='hidden';}catch{return !!node.hidden;}
}
function modelReady(target=window.app){
 return !!target&&target.phase==='ready'&&!(target.draws?.length)&&!target.payout&&!target.result&&!target.dealing&&!target.fastForward&&!active()&&(target.engines||[]).every(engineRuntimeClean)&&resultLayerHidden();
}
function hideResults(){
 const direct=document.getElementById('round-result-layer');
 if(direct){direct.hidden=true;direct.classList?.remove?.('show','active','is-visible');}
 try{for(const selector of ['.round-result','.result-overlay','.payout-overlay','[data-result-overlay]'])for(const node of document.querySelectorAll(selector)){node.hidden=true;node.classList?.remove?.('show','active','is-visible');}}catch{}
}
function markDirty(){
 try{if(typeof slots!=='undefined'&&Array.isArray(slots))for(const slot of slots){slot.dirtyMain=true;slot.dirtyMini=true;slot.lastState=null;slot.lastMainState=null;slot.lastMiniState=null;slot.miniTween=null;slot.mainTween=null;try{slot.particles?.replaceChildren?.();}catch{}}}catch{}
}
function renderAll(target){
 hideResults();markDirty();
 for(const name of ['renderGameTabs','renderTabs','renderSlots','renderMain','renderAll','renderGames','renderRoundResult','syncPause','requestFit']){
  try{const fn=globalThis[name];if(typeof fn==='function')fn(target);}catch{}
 }
 try{if(typeof scheduleUI==='function')scheduleUI(target);}catch{}
 try{target.onChange?.(target);}catch{}
 try{requestAnimationFrame(()=>{markDirty();try{if(typeof scheduleUI==='function')scheduleUI(target);}catch{}try{target.onChange?.(target);}catch{}});}catch{}
}
function clearTopLevel(target,credit,bet,phase='complete'){
 target.token=finite(target.token)+1;target.phase=phase;target.draws=[];target.payout=null;target.result=null;
 target.dealing=false;target.fastForward=false;target.drawHeld=false;target.paused=false;target.totalWin=0;
 target.paid=(target.engines||[]).map(()=>false);target.roundWins=(target.engines||[]).map(()=>0);
 target.bets=[...bet.bets];target.locked=[...bet.locked];target.enabled=[...bet.enabled];
 target.credit=credit;target.displayCredit=credit;
}
function preResetEngines(target){
 for(const [index,engine] of (target.engines||[]).entries()){
  if(index===0&&(!engine.kind||/^game[-_ ]?0$/i.test(String(engine.kind))))engine.kind='cookie';
  try{engine.paused=false;engine.presentationRate=1;engine.busy=false;engine.running=false;}catch{}
  try{if(Array.isArray(engine.queue))engine.queue.length=0;else engine.queue?.clear?.();}catch{}
  try{
   if(typeof engine.reset==='function'){
    try{engine.reset({keepWonder:false,forceNew:true,newRound:true});}
    catch{engine.reset();}
   }
  }catch(error){console.warn('[SharedController219] engine reset',index,error?.message||error);}
 }
}
function rebuildFreshBoard(target,credit,bet,reason){
 generation++;stopLocal();
 try{rouletteDrawSource?.reset?.();}catch(error){console.warn('[SharedController219] shared reset',error?.message||error);}
 clearTopLevel(target,credit,bet,'complete');
 preResetEngines(target);
 // prepare() is the authoritative board/main-tab constructor. Nothing may
 // clear engine model state after this call; doing so caused the stale board.
 try{target.prepare?.();}catch(error){console.warn('[SharedController219] prepare',error?.message||error);}
 clearTopLevel(target,credit,bet,'ready');
 if(!(target.engines||[]).every(engineRuntimeClean)){
  // A late async engine may have survived. Rebuild once more, but again leave
  // the final prepared board untouched afterwards.
  clearTopLevel(target,credit,bet,'complete');preResetEngines(target);
  try{target.prepare?.();}catch(error){console.warn('[SharedController219] second prepare',error?.message||error);}
  clearTopLevel(target,credit,bet,'ready');
 }
 hideResults();renderAll(target);
 console.info('[SharedController219] fresh board prepared',reason,'generation',generation);
}
async function settleCredit(target,sharedRound){
 const c=client(),roundId=String(sharedRound?.roundId||''),participant=sharedRound?.participant||{};
 if(Number.isFinite(Number(participant.settlement?.creditAfter)))return Number(participant.settlement.creditAfter);
 const base=Number.isFinite(Number(participant.creditAfterBet))?Number(participant.creditAfterBet):finite(target.credit);
 const totalWin=Math.max(0,finite(target.totalWin)),expected=base+totalWin;
 if(!c?.online||!roundId)return expected;
 if(!settlePromises.has(roundId))settlePromises.set(roundId,(async()=>{
  try{
   const response=await c.settle({roundId,totalWin,creditAfter:expected,immediateReset:true});
   if(response?.settlement)return finite(response.settlement.creditAfter);
  }catch(error){console.warn('[SharedController219] settle',error?.message||error);}
  try{
   const state=await c.getState();c.accept?.(state);
   for(const round of [state?.pendingRound,state?.round])if(round?.id===roundId&&Number.isFinite(Number(round.participant?.settlement?.creditAfter)))return Number(round.participant.settlement.creditAfter);
  }catch{}
  return expected;
 })());
 return settlePromises.get(roundId);
}
async function forceInitial(reason='result-complete'){
 if(resetBusy||typeof app==='undefined')return false;
 resetBusy=true;const sharedRound=active(),roundId=String(sharedRound?.roundId||''),bet=selected(app);
 try{
  const credit=await settleCredit(app,sharedRound);
  rebuildFreshBoard(app,credit,bet,reason);
  for(const delay of [80,240,620,1200]){
   await sleep(delay);
   // Repair only top-level/visual late callbacks. Re-run prepare only if the
   // engine itself became dirty again; never erase a freshly prepared board.
   if(!modelReady(app))rebuildFreshBoard(app,credit,bet,reason+'-late');
  }
  lastResetRound=roundId;resultSince=0;status('WAIT','初期盤面へ復帰・次のSERVER BET TIME待機');
  await refreshState();setTimeout(()=>poll(),0);
  return modelReady(app);
 }finally{resetBusy=false;}
}
function allowedRound(round=client()?.round){
 return !!(stable()&&round?.phase==='PLAYING'&&round?.participant?.playerId&&String(round.id)!==blockedRoundId&&joinedRounds.has(String(round.id)));
}
function canStart(target=window.app){return !!(!resetBusy&&target?.phase==='ready'&&modelReady(target)&&allowedRound());}
function applyParticipant(participant){
 if(!participant||typeof app==='undefined')return;
 const bets=Array.isArray(participant.bets)?participant.bets.map(value=>Math.max(0,finite(value))):[];
 const locked=Array.isArray(participant.locked)?participant.locked.map(value=>Math.max(0,finite(value))):[...bets];
 const enabled=Array.isArray(participant.enabled)?participant.enabled.map(Boolean):bets.map(value=>value>0);
 app.bets=[...bets];app.locked=[...locked];app.enabled=[...enabled];if(bets.some(value=>value>0))lastBet=[...bets];
 if(Number.isFinite(Number(participant.creditAfterBet))){app.credit=Number(participant.creditAfterBet);app.displayCredit=Number(participant.creditAfterBet);}
}
function installStartGuard(){
 if(typeof Arcade!=='function'||!Arcade.prototype)return false;
 const proto=Arcade.prototype;if(proto.__sharedControllerStartV219)return true;
 nativeStart=proto.start;if(typeof nativeStart!=='function')return false;
 Object.defineProperty(proto,'__sharedControllerStartV219',{value:true});
 proto.start=function(...args){
  stopLocal();
  if(!canStart(this)){
   status(stable()?'NEXT':'WAIT',stable()?'次のSERVER BET TIME待機':'安定接続を確認中');return false;
  }
  return nativeStart.apply(this,args);
 };
 if(typeof startReadyRound==='function'){
  try{startReadyRound=function(){stopLocal();return canStart(app)?app.start():false;};}catch{}
 }
 if(typeof scheduleAutoRound==='function')try{scheduleAutoRound=function(){stopLocal();return false;};}catch{}
 return true;
}
async function refreshState(){
 const c=client();if(!socketOpen(c))return null;
 const state=await c.getState();noteSnapshot(state);c.accept?.(state);return state;
}
async function joinBet(round){
 if(joinBusy||!stable()||!modelReady(app)||!round||round.phase!=='BETTING'||round.canBet!==true)return false;
 const id=String(round.id||'');if(!id||id===blockedRoundId||joinedRounds.has(id))return false;
 const serverNow=Date.now()+finite(client()?.clockOffset),remaining=finite(round.betClosesAt)-serverNow;
 if(remaining<MIN_BET_REMAIN_MS)return false;
 const bet=selected(app),totalBet=bet.bets.reduce((sum,value,index)=>sum+(bet.enabled[index]!==false?Math.max(0,finite(value)):0),0);
 if(totalBet<=0){status('BET','BETを設定してください');return false;}
 joinBusy=true;
 try{
  const result=await client().join({roundId:id,bets:bet.bets,locked:bet.locked,enabled:bet.enabled,totalBet,creditBefore:finite(app.credit)});
  if(result?.round)client().accept?.(result);
  const participant=result?.round?.participant||client()?.round?.participant;
  if(participant?.playerId){joinedRounds.add(id);joinedRoundId=id;applyParticipant(participant);status('BET','BET登録済み');return true;}
 }catch(error){if(!['wait_next_bet','next_stable_bet_required'].includes(String(error?.code||error?.message||'')))console.warn('[SharedController219] join',error?.message||error);}
 finally{joinBusy=false;}
 return false;
}
async function startRound(round){
 if(startBusy||!round||String(round.id)!==joinedRoundId||!allowedRound(round))return false;
 if(app.phase!=='ready'||!modelReady(app)){if(['result','paying','complete','error'].includes(String(app.phase||''))||app.draws?.length)await forceInitial('before-next-start');else return false;}
 startBusy=true;
 try{applyParticipant(round.participant);const began=app.start();if(began!==false&&app.phase==='playing'){status('PLAY','SERVER抽選に参加中');return true;}}
 finally{startBusy=false;}
 return false;
}
async function processState(state){
 const round=state?.round||client()?.round;if(!round)return;
 if(round.phase==='BETTING')await joinBet(round);
 else if(round.phase==='PLAYING'&&round.participant?.playerId)await startRound(round);
 else if(String(round.id)!==joinedRoundId&&round.phase!=='PLAYING')joinedRoundId='';
}
async function poll(){
 clearTimeout(pollTimer);stopLocal();installStartGuard();
 if(pollBusy){pollTimer=setTimeout(poll,POLL_MS);return;}
 if(!inspectSocket()){pollTimer=setTimeout(poll,300);return;}
 pollBusy=true;
 try{const state=await refreshState();await processState(state);}catch(error){if(socketOpen())console.warn('[SharedController219] poll',error?.message||error);}
 finally{pollBusy=false;pollTimer=setTimeout(poll,POLL_MS);}
}
function monitorResults(){
 if(typeof app==='undefined'){setTimeout(monitorResults,60);return;}
 stopLocal();const phase=String(app.phase||''),round=client()?.round;
 if(phase==='playing'&&!allowedRound(round)){forceInitial('unauthorised-playing');setTimeout(monitorResults,100);return;}
 if(['result','paying','complete','error'].includes(phase)){
  if(!resultSince)resultSince=Date.now();const age=Date.now()-resultSince;
  const done=round?.phase!=='PLAYING'||(round?.balls?.length||0)>=8;
  const overlayGone=resultLayerHidden();
  if(done&&((phase==='complete'&&age>150)||(overlayGone&&age>700)||(phase==='error'&&age>900)||(age>4600)))forceInitial('phase-'+phase);
 }else resultSince=0;
 if(phase==='ready'&&!active()&&!modelReady(app))forceInitial('dirty-ready');
 setTimeout(monitorResults,100);
}
function boot(){
 if(typeof app==='undefined'||!client()||typeof Arcade!=='function'){setTimeout(boot,50);return;}
 if(app.engines?.[0]&&(!app.engines[0].kind||/^game[-_ ]?0$/i.test(String(app.engines[0].kind))))app.engines[0].kind='cookie';
 stopLocal();installStartGuard();inspectSocket();poll();monitorResults();
 client().on?.(message=>{
  if(message?.type==='snapshot')noteSnapshot(message);
  if(['round_started','betting_started','round_complete','host_changed','host_status'].includes(message?.type))setTimeout(poll,0);
 });
 window.SweetsSharedControllerV219={forceInitial,canStart,stable,joinBet,startRound,refreshNow:poll,isReady:()=>modelReady(app),describe:()=>({connectionEpoch,onlineSince,firstSnapshotAt,lastSnapshotAt,snapshotCount,blockedRoundId,joinedRoundId,joined:[...joinedRounds],resetBusy,generation,lastResetRound})};
 addEventListener('beforeunload',()=>clearTimeout(pollTimer),{once:true});
 console.info('[SharedController219] authoritative connection, fresh-board reset and continuous rounds enabled');
}
boot();
})();

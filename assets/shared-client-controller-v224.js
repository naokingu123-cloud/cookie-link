(()=>{
'use strict';
if(window.__sweetsSharedClientControllerV224)return;
window.__sweetsSharedClientControllerV224=true;
const params=new URLSearchParams(location.search);
if(params.get('serverHost')==='1'||params.get('serverSettlementWorker')==='1')return;

const POLL_MS=160;
const STABLE_MS=3200;
const SNAPSHOT_MIN=3;
const SNAPSHOT_FRESH_MS=1800;
const MIN_BET_REMAIN_MS=2200;
const RESULT_MAX_MS=5200;
const COMPLETE_STALL_MS=16000;
const LOSS_KEY='sweets-shared-loss-v224';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const finite=value=>Number.isFinite(Number(value))?Number(value):0;
const machine=()=>window.SweetsSharedMachine;
const client=()=>machine()?.client;
const active=()=>machine()?.active;

let nativeStart=null,nativeSharedReset=null,internalReset=false;
let socketRef=null,socketWasOpen=false,connectionEpoch=0,onlineSince=0,firstSnapshotAt=0,lastSnapshotAt=0,snapshotCount=0;
let blockedRoundId='',joinedRoundId='',startedRoundId='',startingRoundId='';
let pollTimer=0,pollBusy=false,joinBusy=false,startBusy=false,resetBusy=false,abandonBusy=false;
let resultSince=0,completeSeenAt=0,lastStatus='',generation=0,lastBet=[],lastParticipant=null;
const joinedRounds=new Set(),normalSettled=new Set(),abandonedRounds=new Set();

function readLosses(){
 try{const value=JSON.parse(localStorage.getItem(LOSS_KEY)||'{}');return value&&typeof value==='object'?value:{};}catch{return {};}
}
let lossQueue=readLosses();
function saveLosses(){try{localStorage.setItem(LOSS_KEY,JSON.stringify(lossQueue));}catch{}}
function queueLoss(roundId,creditAfterBet){
 if(!roundId)return;abandonedRounds.add(String(roundId));
 lossQueue[String(roundId)]={roundId:String(roundId),creditAfterBet:Math.max(0,finite(creditAfterBet)),at:Date.now()};saveLosses();
}
function dropLoss(roundId){delete lossQueue[String(roundId)];saveLosses();}
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
function wsOpen(c=client()){
 if(!c?.online)return false;const ws=c.ws;if(!ws)return true;
 const OPEN=typeof WebSocket==='function'?WebSocket.OPEN:1;return ws.readyState===OPEN;
}
function resetStability(){connectionEpoch++;onlineSince=0;firstSnapshotAt=0;lastSnapshotAt=0;snapshotCount=0;blockedRoundId='';joinedRoundId='';startedRoundId='';startingRoundId='';joinedRounds.clear();}
function stable(){const now=Date.now();return wsOpen()&&onlineSince>0&&snapshotCount>=SNAPSHOT_MIN&&firstSnapshotAt>0&&now-firstSnapshotAt>=STABLE_MS&&now-lastSnapshotAt<=SNAPSHOT_FRESH_MS;}
function noteSnapshot(state){
 const now=Date.now(),round=state?.round;if(!firstSnapshotAt)firstSnapshotAt=now;lastSnapshotAt=now;snapshotCount++;
 if(!stable()&&round?.id)blockedRoundId=String(round.id);
}
function selected(target=window.app){
 const bets=Array.isArray(target?.bets)?target.bets.map(value=>Math.max(0,finite(value))):[];
 const locked=Array.isArray(target?.locked)?target.locked.map(value=>Math.max(0,finite(value))):[...bets];
 const enabled=Array.isArray(target?.enabled)?target.enabled.map(Boolean):bets.map(value=>value>0);
 if(bets.some(value=>value>0))lastBet=[...bets];else if(lastBet.length)for(let index=0;index<lastBet.length;index++)bets[index]=Math.max(0,finite(lastBet[index]));
 return {bets,locked:locked.some(value=>value>0)?locked:[...bets],enabled:enabled.length?enabled:bets.map(value=>value>0)};
}
function queueSize(engine){const queue=engine?.queue;if(Array.isArray(queue))return queue.length;if(queue&&Number.isFinite(Number(queue.size)))return Number(queue.size);return 0;}
function engineRuntimeClean(engine){return finite(engine?.processed)===0&&finite(engine?.accepted)===0&&!engine?.busy&&!engine?.running&&queueSize(engine)===0;}
function resultLayerHidden(){
 const node=document.getElementById('round-result-layer');if(!node)return true;
 try{return node.hidden||getComputedStyle(node).display==='none'||getComputedStyle(node).visibility==='hidden';}catch{return !!node.hidden;}
}
function modelReady(target=window.app){
 return !!target&&target.phase==='ready'&&!(target.draws?.length)&&!target.payout&&!target.result&&!target.dealing&&!target.fastForward&&!active()&&(target.engines||[]).every(engineRuntimeClean)&&resultLayerHidden();
}
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
  try{if(typeof engine.reset==='function'){try{engine.reset({keepWonder:false,forceNew:true,newRound:true});}catch{engine.reset();}}}catch(error){console.warn('[SharedController224] engine reset',index,error?.message||error);}
 }
}
function releaseShared(){
 if(!nativeSharedReset)return;internalReset=true;
 try{nativeSharedReset();}catch(error){console.warn('[SharedController224] shared reset',error?.message||error);}finally{internalReset=false;}
}
function rebuildFreshBoard(target,credit,bet,reason){
 generation++;stopLocal();releaseShared();clearTop(target,credit,bet,'complete');resetEngines(target);
 try{target.prepare?.();}catch(error){console.warn('[SharedController224] prepare',error?.message||error);}
 // prepare() owns construction of the new game board. Only top-level round
 // fields are cleared after it; engine board models are deliberately preserved.
 clearTop(target,credit,bet,'ready');hideResults();renderAll(target);
 console.info('[SharedController224] fresh board prepared',reason,'generation',generation);
}
async function hardReset(credit,reason){
 if(resetBusy||typeof app==='undefined')return false;resetBusy=true;const bet=selected(app);
 try{
  rebuildFreshBoard(app,Math.max(0,finite(credit)),bet,reason);
  for(const delay of [100,320,850]){
   await sleep(delay);
   if(['result','paying','complete','error','playing'].includes(String(app.phase||''))||app.draws?.length||app.payout||app.result||active())rebuildFreshBoard(app,Math.max(0,finite(credit)),bet,reason+'-late');
   else{hideResults();renderAll(app);}
  }
  resultSince=0;completeSeenAt=0;lastParticipant=null;status('WAIT','次のSERVER BET TIME待機');return modelReady(app);
 }finally{resetBusy=false;}
}
async function settleZero(roundId,creditAfterBet){
 roundId=String(roundId||'');if(!roundId)return false;const credit=Math.max(0,finite(creditAfterBet));queueLoss(roundId,credit);
 const c=client();if(!wsOpen(c))return false;
 try{await c.settle({roundId,totalWin:0,creditAfter:credit,digest:'abandoned-v224:'+roundId,abandoned:true});dropLoss(roundId);return true;}
 catch(error){if([404,409].includes(Number(error?.status))){dropLoss(roundId);return true;}return false;}
}
async function flushLosses(){
 if(!wsOpen())return;for(const item of Object.values(lossQueue)){if(!item?.roundId)continue;await settleZero(item.roundId,item.creditAfterBet);}
}
function participantFor(roundId){
 const shared=active();if(shared?.roundId===roundId&&shared.participant)return shared.participant;
 const round=client()?.round;if(round?.id===roundId&&round.participant)return round.participant;
 return lastParticipant||{};
}
async function abandonRound(reason='connection-lost'){
 if(abandonBusy||resetBusy||typeof app==='undefined')return false;
 const shared=active(),roundId=String(shared?.roundId||startedRoundId||client()?.round?.id||'');
 if(!roundId||abandonedRounds.has(roundId)&&!shared&&app.phase==='ready')return false;
 abandonBusy=true;
 try{
  const participant=participantFor(roundId),credit=Number.isFinite(Number(participant?.creditAfterBet))?Number(participant.creditAfterBet):finite(app.credit);
  queueLoss(roundId,credit);joinedRounds.delete(roundId);if(joinedRoundId===roundId)joinedRoundId='';if(startedRoundId===roundId)startedRoundId='';if(startingRoundId===roundId)startingRoundId='';
  await hardReset(credit,'abandon-'+reason);settleZero(roundId,credit).catch(()=>{});
  status('LOSS','接続中断のため当該ゲームは0WINで終了');return true;
 }finally{abandonBusy=false;}
}
function inspectSocket(){
 const c=client(),next=c?.ws||null,open=wsOpen(c);
 if(next!==socketRef){
  const had=socketRef;socketRef=next;if(had&&(active()||app?.phase==='playing'))abandonRound('socket-replaced').catch(()=>{});resetStability();
 }
 if(!open){
  if(socketWasOpen&&(active()||app?.phase==='playing'))abandonRound('socket-closed').catch(()=>{});socketWasOpen=false;onlineSince=0;return false;
 }
 if(!socketWasOpen){socketWasOpen=true;onlineSince=Date.now();}
 return true;
}
function remoteReady(){
 const video=window.SweetsRouletteClientV224;if(video?.isFresh)return !!video.isFresh();
 const activeVideo=document.querySelector?.('#cookie-roulette video.shared-roulette-v224[data-active="1"]');
 return !!(activeVideo&&activeVideo.readyState>=2&&!activeVideo.paused);
}
function applyParticipant(participant){
 if(!participant||typeof app==='undefined')return;
 const bets=Array.isArray(participant.bets)?participant.bets.map(value=>Math.max(0,finite(value))):[];
 const locked=Array.isArray(participant.locked)?participant.locked.map(value=>Math.max(0,finite(value))):[...bets];
 const enabled=Array.isArray(participant.enabled)?participant.enabled.map(Boolean):bets.map(value=>value>0);
 app.bets=[...bets];app.locked=[...locked];app.enabled=[...enabled];if(bets.some(value=>value>0))lastBet=[...bets];
 if(Number.isFinite(Number(participant.creditAfterBet))){app.credit=Number(participant.creditAfterBet);app.displayCredit=app.credit;}
 lastParticipant=participant;
}
function canStart(target=window.app){
 const round=client()?.round,id=String(round?.id||'');
 return !!(!resetBusy&&!abandonBusy&&target?.phase==='ready'&&modelReady(target)&&stable()&&remoteReady()&&round?.phase==='PLAYING'&&round?.participant?.playerId&&id===startingRoundId&&joinedRounds.has(id)&&!abandonedRounds.has(id));
}
function installGuards(){
 if(typeof Arcade!=='function'||!Arcade.prototype||typeof rouletteDrawSource==='undefined')return false;
 const proto=Arcade.prototype;
 if(!proto.__sharedControllerStartV224){
  nativeStart=proto.start;if(typeof nativeStart!=='function')return false;Object.defineProperty(proto,'__sharedControllerStartV224',{value:true});
  proto.start=function(...args){stopLocal();if(!canStart(this)){status(stable()?'NEXT':'WAIT',stable()?'次のSERVER BET TIME待機':'安定接続を確認中');return false;}return nativeStart.apply(this,args);};
 }
 if(!nativeSharedReset){
  nativeSharedReset=rouletteDrawSource.reset.bind(rouletteDrawSource);
  rouletteDrawSource.reset=function(...args){
   if(internalReset)return nativeSharedReset(...args);
   if(active()||app?.phase==='playing'){abandonRound('manual-reset').catch(()=>{});return true;}
   return nativeSharedReset(...args);
  };
 }
 if(typeof startReadyRound==='function')try{startReadyRound=function(){stopLocal();return canStart(app)?app.start():false;};}catch{}
 if(typeof scheduleAutoRound==='function')try{scheduleAutoRound=function(){stopLocal();return false;};}catch{}
 return true;
}
async function joinBet(round){
 if(joinBusy||resetBusy||!stable()||!remoteReady()||!modelReady(app)||!round||round.phase!=='BETTING'||round.canBet!==true)return false;
 const id=String(round.id||'');if(!id||id===blockedRoundId||joinedRounds.has(id)||abandonedRounds.has(id))return false;
 const serverNow=Date.now()+finite(client()?.clockOffset),remaining=finite(round.betClosesAt)-serverNow;if(remaining<MIN_BET_REMAIN_MS)return false;
 const bet=selected(app),totalBet=bet.bets.reduce((sum,value,index)=>sum+(bet.enabled[index]!==false?Math.max(0,finite(value)):0),0),creditBefore=Math.max(0,finite(app.credit));
 if(totalBet<=0){status('BET','BETを設定してください');return false;}if(creditBefore<totalBet){status('CREDIT','CREDIT不足');return false;}
 joinBusy=true;
 try{
  const response=await client().join({roundId:id,clientRoundToken:'v224-'+connectionEpoch+'-'+id,bets:bet.bets,locked:bet.locked,enabled:bet.enabled,totalBet,creditBefore,creditAfterBet:creditBefore-totalBet,initialState:null,appVersion:'v224-normal-cycle'});
  client().accept?.(response);const participant=response?.round?.participant||client()?.round?.participant;
  if(participant?.playerId){joinedRounds.add(id);joinedRoundId=id;applyParticipant(participant);status('BET','BET登録済み');return true;}
 }catch(error){if(![409].includes(Number(error?.status)))console.warn('[SharedController224] join',error?.message||error);}
 finally{joinBusy=false;}
 return false;
}
async function startRound(round){
 const id=String(round?.id||'');if(startBusy||resetBusy||!id||id!==joinedRoundId||!joinedRounds.has(id)||abandonedRounds.has(id)||!round?.participant?.playerId)return false;
 if(active()?.roundId===id){startedRoundId=id;return true;}
 if(app.phase!=='ready'||!modelReady(app))return false;
 if(!remoteReady()){
  const deadline=finite(round.drawStartsAt)+1800;if(deadline&&Date.now()+finite(client()?.clockOffset)>deadline)await abandonRound('video-not-ready');
  else status('VIDEO','抽選機映像の同期待ち');return false;
 }
 startBusy=true;startingRoundId=id;
 try{
  applyParticipant(round.participant);const began=app.start();
  if(began!==false&&app.phase==='playing'){startedRoundId=id;status('PLAY','SERVER抽選に参加中');return true;}
 }catch(error){console.warn('[SharedController224] start',error?.message||error);}
 finally{startingRoundId='';startBusy=false;}
 return false;
}
async function settleNormal(shared){
 const roundId=String(shared?.roundId||startedRoundId||'');if(!roundId||normalSettled.has(roundId))return finite(app.credit);
 normalSettled.add(roundId);const participant=shared?.participant||lastParticipant||{},base=Number.isFinite(Number(participant.creditAfterBet))?Number(participant.creditAfterBet):finite(app.credit),win=Math.max(0,finite(app.totalWin)),credit=base+win;
 if(wsOpen()){
  try{const response=await client().settle({roundId,totalWin:win,creditAfter:credit,digest:'complete-v224:'+roundId});if(response?.settlement&&Number.isFinite(Number(response.settlement.creditAfter)))return Number(response.settlement.creditAfter);}
  catch(error){if(![409].includes(Number(error?.status)))console.warn('[SharedController224] settle',error?.message||error);}
 }
 return credit;
}
async function finishNormal(reason='result-complete'){
 if(resetBusy||abandonBusy)return false;const shared=active(),roundId=String(shared?.roundId||startedRoundId||'');
 if(!roundId)return hardReset(finite(app.credit),reason+'-no-round');
 const credit=await settleNormal(shared);joinedRounds.delete(roundId);if(joinedRoundId===roundId)joinedRoundId='';if(startedRoundId===roundId)startedRoundId='';return hardReset(credit,reason);
}
async function flushStaleState(state){
 await flushLosses();const currentId=String(active()?.roundId||'');
 for(const round of [state?.pendingRound,state?.round]){
  const id=String(round?.id||'');if(!id||id===currentId||round?.participant?.settlement||!round?.participant?.playerId)continue;
  if(joinedRounds.has(id)&&(round.phase==='BETTING'||round.phase==='PLAYING'))continue;
  queueLoss(id,round.participant.creditAfterBet);settleZero(id,round.participant.creditAfterBet).catch(()=>{});abandonedRounds.add(id);
 }
}
async function processState(state){
 await flushStaleState(state);const round=state?.round||client()?.round,shared=active(),activeId=String(shared?.roundId||'');
 if(activeId){
  if(!wsOpen()){await abandonRound('offline');return;}
  if(round?.id===activeId){
   if(round.phase==='COMPLETE'&&(round.balls?.length||0)>=8){if(!completeSeenAt)completeSeenAt=Date.now();}
   else completeSeenAt=0;return;
  }
  await abandonRound('authoritative-round-changed');return;
 }
 if(round?.phase==='BETTING'){await joinBet(round);return;}
 if(round?.phase==='PLAYING'&&round.participant?.playerId){
  const id=String(round.id||'');
  if(joinedRounds.has(id))await startRound(round);else{queueLoss(id,round.participant.creditAfterBet);settleZero(id,round.participant.creditAfterBet).catch(()=>{});abandonedRounds.add(id);status('NEXT','途中ラウンドは破棄・次ゲーム待機');}
 }
}
async function refreshState(){
 if(!inspectSocket())return null;const c=client(),state=await c.getState();noteSnapshot(state);c.accept?.(state);await processState(state);return state;
}
async function poll(){
 clearTimeout(pollTimer);stopLocal();installGuards();
 if(pollBusy){pollTimer=setTimeout(poll,POLL_MS);return;}pollBusy=true;
 try{
  if(inspectSocket())await refreshState();
  else if(!active())status('WAIT','SERVER再接続待機');
 }catch(error){if(wsOpen())console.warn('[SharedController224] poll',error?.message||error);}
 finally{pollBusy=false;pollTimer=setTimeout(poll,POLL_MS);}
}
function monitorResults(){
 if(typeof app==='undefined'){setTimeout(monitorResults,60);return;}stopLocal();installGuards();inspectSocket();
 const phase=String(app.phase||''),round=client()?.round,shared=active();
 if(phase==='playing'){
  resultSince=0;
  if(!wsOpen()&&shared)abandonRound('socket-lost').catch(()=>{});
  else if(!shared&&startedRoundId){if(!completeSeenAt)completeSeenAt=Date.now();if(Date.now()-completeSeenAt>3000)abandonRound('attach-failed').catch(()=>{});}
  else if(shared&&round?.id===shared.roundId&&round.phase==='COMPLETE'&&(round.balls?.length||0)>=8){if(!completeSeenAt)completeSeenAt=Date.now();if(Date.now()-completeSeenAt>COMPLETE_STALL_MS)abandonRound('result-timeout').catch(()=>{});}
 }else if(['result','paying','complete','error'].includes(phase)){
  if(!resultSince)resultSince=Date.now();const age=Date.now()-resultSince,overlayGone=resultLayerHidden();
  if((phase==='complete'&&age>250)||(overlayGone&&age>900)||(phase==='error'&&age>1000)||age>RESULT_MAX_MS)finishNormal('phase-'+phase).catch(()=>{});
 }else{
  resultSince=0;if(phase==='ready'&&!active()&&!modelReady(app)&&!resetBusy)hardReset(finite(app.credit),'dirty-ready').catch(()=>{});
 }
 setTimeout(monitorResults,100);
}
function boot(){
 if(typeof app==='undefined'||!client()||typeof Arcade!=='function'||typeof rouletteDrawSource==='undefined'){setTimeout(boot,50);return;}
 if(app.engines?.[0]&&(!app.engines[0].kind||/^game[-_ ]?0$/i.test(String(app.engines[0].kind))))app.engines[0].kind='cookie';
 stopLocal();installGuards();inspectSocket();poll();monitorResults();
 client().on?.(message=>{if(['snapshot','ball_result','round_started','round_complete','betting_started','host_changed','host_status'].includes(message?.type))setTimeout(poll,0);});
 addEventListener('beforeunload',()=>{
  clearTimeout(pollTimer);const shared=active();if(shared?.roundId){const p=shared.participant||lastParticipant||{};queueLoss(shared.roundId,p.creditAfterBet);}
 },{once:true});
 window.SweetsSharedControllerV224={hardReset,abandonRound,finishNormal,canStart,stable,remoteReady,refreshNow:refreshState,isReady:()=>modelReady(app),describe:()=>({connectionEpoch,onlineSince,firstSnapshotAt,lastSnapshotAt,snapshotCount,blockedRoundId,joinedRoundId,startedRoundId,activeRound:active()?.roundId||null,losses:Object.keys(lossQueue),generation,resetBusy})};
 console.info('[SharedController224] normal-cycle priority; disconnects are zero-WIN losses and never replayed');
}
boot();
})();

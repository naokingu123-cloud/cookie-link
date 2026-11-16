(()=>{
'use strict';
if(window.__sweetsSharedClientControllerV224)return;
window.__sweetsSharedClientControllerV224=true;
const params=new URLSearchParams(location.search);
if(params.get('serverHost')==='1'||params.get('serverSettlementWorker')==='1')return;

// HTTP is a bounded reconciliation fallback; ball delivery remains on WebSocket.
// Keep successful snapshots comfortably within SNAPSHOT_FRESH_MS below.
const POLL_MS=800;
const STABLE_MS=3200;
const SNAPSHOT_MIN=3;
const SNAPSHOT_FRESH_MS=1800;
const MIN_BET_REMAIN_MS=2200;
const RESULT_MAX_MS=5200;
const COMPLETE_STALL_MS=60000;
const LOSS_KEY='sweets-shared-loss-v224';
const NORMAL_KEY='sweets-shared-normal-settlements-v225';
const NORMAL_REVIEW_KEY='sweets-shared-settlement-review-v225';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const finite=value=>Number.isFinite(Number(value))?Number(value):0;
const machine=()=>window.SweetsSharedMachine;
const client=()=>machine()?.client;
const active=()=>machine()?.active;

let nativeStart=null,nativeSharedReset=null,internalReset=false;
let socketRef=null,socketWasOpen=false,connectionEpoch=0,onlineSince=0,firstSnapshotAt=0,lastSnapshotAt=0,snapshotCount=0;
let blockedRoundId='',joinedRoundId='',startedRoundId='',startingRoundId='';
let pollTimer=0,pollDueAt=0,pollBusy=false,pollRequested=false,pollStopped=false,nextPollAt=0;
let backoffUntil=0,pollFailures=0,refreshPromise=null;
let joinBusy=false,startBusy=false,resetBusy=false,abandonBusy=false,finishBusy=false;
let resultSince=0,completeSeenAt=0,completeProgress='',completeProgressAt=0,lastStatus='',generation=0,lastBet=[],lastParticipant=null,lastServerWallet=null;
const joinedRounds=new Set(),normalSettled=new Set(),abandonedRounds=new Set();
const normalPending=new Map(Object.entries(readLosses(NORMAL_KEY)).filter(([id,payload])=>payload?.roundId===id&&Number.isFinite(Number(payload.totalWin))&&Number.isFinite(Number(payload.creditAfter)))),normalCredits=new Map();
const normalReview=new Map(Object.entries(readLosses(NORMAL_REVIEW_KEY)));

function readLosses(key=LOSS_KEY){
 try{const value=JSON.parse(localStorage.getItem(key)||'{}');return value&&typeof value==='object'?value:{};}catch{return {};}
}
let lossQueue=readLosses();
function saveLosses(){try{localStorage.setItem(LOSS_KEY,JSON.stringify(lossQueue));}catch{}}
function saveNormals(){try{localStorage.setItem(NORMAL_KEY,JSON.stringify(Object.fromEntries(normalPending)));}catch{}}
function queueLoss(roundId,creditAfterBet){
 if(!roundId||normalPending.has(String(roundId))||normalSettled.has(String(roundId))||normalReview.has(String(roundId)))return;abandonedRounds.add(String(roundId));
 lossQueue[String(roundId)]={roundId:String(roundId),creditAfterBet:Math.max(0,finite(creditAfterBet)),at:Date.now()};saveLosses();
}
function dropLoss(roundId){delete lossQueue[String(roundId)];saveLosses();}
function queueNormal(shared){
 const roundId=String(shared?.roundId||startedRoundId||'');if(!roundId||normalPending.has(roundId)||normalSettled.has(roundId)||normalReview.has(roundId))return;
 const participant=shared?.participant||lastParticipant||{},base=Number.isFinite(Number(participant.creditAfterBet))?Number(participant.creditAfterBet):finite(app.credit),win=Math.max(0,finite(app.totalWin));
 const raw={roundId,totalWin:win,creditAfter:base+win,digest:'complete-v224:'+roundId};
 const prepared=client()?.prepareSettlement?.(raw)||raw;
 normalPending.set(roundId,JSON.parse(JSON.stringify(prepared)));saveNormals();dropLoss(roundId);
}
function rememberWallet(control){
 const wallet=control?.wallet,playerId=String(control?.playerId||'');
 if(!wallet||wallet.credit==null||!Number.isFinite(Number(wallet.credit))||Number(wallet.revision)<1)return;
 if(client()?.playerId&&playerId&&playerId!==String(client().playerId))return;
 if(lastServerWallet&&lastServerWallet.playerId===playerId&&Number(wallet.revision)<lastServerWallet.revision)return;
 lastServerWallet={playerId,revision:Number(wallet.revision),credit:Number(wallet.credit)};
}
function showSettlementReview(){
 if(!normalReview.size||typeof document.createElement!=='function'||document.getElementById('shared-settlement-review-v225'))return;
 const notice=document.createElement('div');notice.id='shared-settlement-review-v225';notice.setAttribute('role','status');
 notice.textContent='精算未確認の記録を保存しました。残高はサーバーの確認値を優先し、次のゲームへ進みます。';
 notice.style.cssText='position:fixed;left:8px;bottom:8px;max-width:340px;z-index:10021;padding:6px 9px;border:1px solid #f5cb70;border-radius:8px;background:#271c0ee8;color:#ffe3a7;font:700 11px/1.4 sans-serif';document.body.append(notice);
}
function terminalSettlement(error){
 const status=Number(error?.status),code=String(error?.data?.error||error?.message||'');
 return status===404||(status===409&&['round_mismatch','round_not_found','not_participating','settlement_conflict'].includes(code));
}
function quarantineNormal(roundId,error){
 const payload=normalPending.get(roundId);rememberWallet(error?.data?.payoutControlV3);
 const credit=lastServerWallet?lastServerWallet.credit:Math.max(0,finite(payload?.creditAfter)-finite(payload?.totalWin));
 normalReview.set(roundId,{payload,error:{status:Number(error?.status)||0,code:String(error?.data?.error||error?.message||''),at:Date.now()},credit});
 try{localStorage.setItem(NORMAL_REVIEW_KEY,JSON.stringify(Object.fromEntries(normalReview)));}catch{}
 normalPending.delete(roundId);saveNormals();dropLoss(roundId);showSettlementReview();console.warn('[SharedController224] settlement retained for review',roundId,error?.message||error);return credit;
}
function fullyReceived(shared=active(),state=null){
 const id=String(shared?.roundId||'');if(!id)return false;
 if(normalPending.has(id)||normalSettled.has(id)||finite(shared.delivered)>=8||finite(shared.authoritativeBalls?.size)>=8)return true;
 if((app?.draws?.length||0)>=8)return true;
 return [state?.round,state?.pendingRound,client()?.round,client()?.pendingRound].some(round=>round?.id===id&&(round.balls?.length||0)>=8);
}
function completionProgressKey(shared){
 return JSON.stringify([shared?.roundId,finite(shared?.delivered),app?.draws||[],app?.phase,!!app?.drawHeld,!!app?.dealing,finite(app?.totalWin),(app?.engines||[]).map(engine=>[finite(engine?.processed),finite(engine?.accepted),queueSize(engine),!!engine?.busy,!!engine?.running,finite(engine?.totalHundredths),finite(engine?.totalWin),finite(engine?.depth)])]);
}
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
function deferRequest(error){
 pollFailures=Math.min(6,pollFailures+1);
 const delay=Math.max(Math.min(30000,1000*Math.pow(2,pollFailures-1)),finite(error?.retryAfterMs),finite(error?.data?.retryAfterMs));
 backoffUntil=Math.max(backoffUntil,Date.now()+delay);return delay;
}
function schedulePoll(delay=POLL_MS){
 if(pollStopped)return;
 if(pollBusy){pollRequested=true;return;}
 const now=Date.now(),due=Math.max(now+Math.max(0,finite(delay)),nextPollAt,backoffUntil);
 if(pollTimer&&pollDueAt>=backoffUntil&&pollDueAt<=due)return;
 clearTimeout(pollTimer);pollDueAt=due;pollTimer=setTimeout(poll,Math.max(0,due-now));
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
 target.token=finite(target.token)+1;target.phase=phase;target.draws=[];target.payout=null;target.result=null;target.dealing=false;target.fastForward=false;target.paused=false;target.totalWin=0;
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
   resultSince=0;completeSeenAt=0;completeProgress='';completeProgressAt=0;lastParticipant=null;status('WAIT','次のSERVER BET TIME待機');return modelReady(app);
 }finally{resetBusy=false;}
}
async function settleZero(roundId,creditAfterBet){
 roundId=String(roundId||'');if(!roundId)return false;
 if(normalPending.has(roundId)||normalSettled.has(roundId)||normalReview.has(roundId)){dropLoss(roundId);return true;}
 const credit=Math.max(0,finite(creditAfterBet));queueLoss(roundId,credit);
 const c=client();if(!wsOpen(c))return false;
 try{await c.settle({roundId,totalWin:0,creditAfter:credit,digest:'abandoned-v224:'+roundId,abandoned:true});dropLoss(roundId);return true;}
  catch(error){if(Number(error?.status)===429)deferRequest(error);if([404,409].includes(Number(error?.status))){dropLoss(roundId);return true;}return false;}
}
async function flushLosses(){
 if(!wsOpen())return;for(const item of Object.values(lossQueue)){if(backoffUntil>Date.now())break;if(!item?.roundId)continue;await settleZero(item.roundId,item.creditAfterBet);}
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
 if(normalPending.has(roundId)||normalSettled.has(roundId)||(fullyReceived(shared)&&reason!=='engine-stalled')){status('WAIT','受信済み8球の結果処理・精算待ち');return false;}
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
 return !!(!resetBusy&&!abandonBusy&&target?.phase==='ready'&&modelReady(target)&&stable()&&round?.phase==='PLAYING'&&round?.participant?.playerId&&id===startingRoundId&&joinedRounds.has(id)&&!abandonedRounds.has(id));
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
  const accepted=client().accept?.(response);if(accepted!==false)rememberWallet(response?.payoutControlV3);
  const participant=response?.round?.participant||client()?.round?.participant;
  if(participant?.playerId){joinedRounds.add(id);joinedRoundId=id;applyParticipant(participant);status('BET','BET登録済み');return true;}
  }catch(error){if(Number(error?.status)===429)deferRequest(error);if(![409].includes(Number(error?.status)))console.warn('[SharedController224] join',error?.message||error);}
 finally{joinBusy=false;}
 return false;
}
async function startRound(round){
 const id=String(round?.id||'');if(startBusy||resetBusy||!id||id!==joinedRoundId||!joinedRounds.has(id)||abandonedRounds.has(id)||!round?.participant?.playerId)return false;
 if(active()?.roundId===id){startedRoundId=id;return true;}
 if(app.phase!=='ready'||!modelReady(app))return false;
 // The BET was already accepted while the live view was ready. A short video
 // stall must not discard that BET while the authoritative result WS is healthy.
 startBusy=true;startingRoundId=id;
 try{
  applyParticipant(round.participant);const began=app.start();
  if(began!==false&&app.phase==='playing'){startedRoundId=id;status('PLAY','SERVER抽選に参加中');return true;}
 }catch(error){console.warn('[SharedController224] start',error?.message||error);}
 finally{startingRoundId='';startBusy=false;}
 return false;
}
async function settleNormal(shared){
 const roundId=String(shared?.roundId||startedRoundId||'');if(!roundId)return finite(app.credit);
 if(normalSettled.has(roundId))return normalCredits.get(roundId)??finite(app.credit);
 if(normalReview.has(roundId))return finite(normalReview.get(roundId)?.credit);
 const participant=shared?.participant||lastParticipant||{};queueNormal(shared);
 if(!wsOpen())throw Object.assign(Error('settlement_connection_wait'),{status:503,retryAfterMs:1000});
 let response;
 try{response=participant.settlement?{settlement:participant.settlement}:await client().settle(normalPending.get(roundId));}
 catch(error){if(terminalSettlement(error))return quarantineNormal(roundId,error);throw error;}
 if(!response?.settlement||!Number.isFinite(Number(response.settlement.creditAfter)))throw Error('settlement_ack_missing');
 const credit=Number(response.settlement.creditAfter);
 normalSettled.add(roundId);normalCredits.set(roundId,credit);normalPending.delete(roundId);saveNormals();dropLoss(roundId);return credit;
}
async function finishNormal(reason='result-complete'){
 if(resetBusy||abandonBusy||finishBusy||Date.now()<Math.max(backoffUntil,Number(client()?.httpRetryAt)||0))return false;
 const shared=active(),roundId=String(shared?.roundId||startedRoundId||'');
 if(!roundId)return hardReset(finite(app.credit),reason+'-no-round');
 finishBusy=true;
 try{
  const credit=await settleNormal(shared);joinedRounds.delete(roundId);if(joinedRoundId===roundId)joinedRoundId='';if(startedRoundId===roundId)startedRoundId='';return await hardReset(credit,reason);
 }catch(error){deferRequest(error);console.warn('[SharedController224] settlement awaiting ACK',error?.message||error);return false;}
 finally{finishBusy=false;}
}
async function flushStaleState(state){
 for(const [roundId] of normalPending){
  if(roundId===active()?.roundId)continue;
  try{const credit=await settleNormal({roundId});if(!active()&&!joinedRoundId&&app?.phase==='ready'){app.credit=credit;app.displayCredit=credit;}}
  catch(error){deferRequest(error);return;}
 }
 await flushLosses();const currentId=String(active()?.roundId||'');
 for(const round of [state?.pendingRound,state?.round]){
  const id=String(round?.id||'');if(!id||id===currentId||normalPending.has(id)||normalSettled.has(id)||normalReview.has(id)||round?.participant?.settlement||!round?.participant?.playerId)continue;
  if(joinedRounds.has(id)&&(round.phase==='BETTING'||round.phase==='PLAYING'))continue;
  queueLoss(id,round.participant.creditAfterBet);settleZero(id,round.participant.creditAfterBet).catch(()=>{});abandonedRounds.add(id);
 }
}
async function processState(state){
 await flushStaleState(state);if(backoffUntil>Date.now())return;
 const round=state?.round||client()?.round,shared=active(),activeId=String(shared?.roundId||'');
 if(activeId){
   if(!wsOpen()){if(!fullyReceived(shared,state))await abandonRound('offline');return;}
  if(round?.id===activeId){
   if(round.phase==='COMPLETE'&&(round.balls?.length||0)>=8){if(!completeSeenAt)completeSeenAt=Date.now();}
   else completeSeenAt=0;return;
  }
   if(fullyReceived(shared,state)){if(!completeSeenAt)completeSeenAt=Date.now();return;}
   await abandonRound('authoritative-round-changed');return;
 }
 if(round?.phase==='BETTING'){await joinBet(round);return;}
 if(round?.phase==='PLAYING'&&round.participant?.playerId){
  const id=String(round.id||'');
  if(joinedRounds.has(id))await startRound(round);else{queueLoss(id,round.participant.creditAfterBet);settleZero(id,round.participant.creditAfterBet).catch(()=>{});abandonedRounds.add(id);status('NEXT','途中ラウンドは破棄・次ゲーム待機');}
 }
}
async function refreshState(){
 if(refreshPromise)return refreshPromise;
 if(backoffUntil>Date.now()||!inspectSocket())return null;
 refreshPromise=(async()=>{
  const c=client(),state=await c.getState();if(Date.now()>=backoffUntil){pollFailures=0;backoffUntil=0;}
  const accepted=c.accept?.(state),latest=accepted===false?{round:c.round,pendingRound:c.pendingRound}:state;
  if(accepted!==false){noteSnapshot(latest);rememberWallet(state?.payoutControlV3);}await processState(latest);return latest;
 })().finally(()=>{refreshPromise=null;});
 return refreshPromise;
}
async function poll(){
 clearTimeout(pollTimer);pollTimer=0;pollDueAt=0;if(pollStopped)return;
 stopLocal();installGuards();
 if(pollBusy){pollRequested=true;return;}
 if(Date.now()<Math.max(nextPollAt,backoffUntil)){schedulePoll(0);return;}
 pollBusy=true;pollRequested=false;nextPollAt=Date.now()+POLL_MS;
 try{
  if(inspectSocket())await refreshState();
  else if(!active())status('WAIT','SERVER再接続待機');
 }catch(error){deferRequest(error);if(wsOpen())console.warn('[SharedController224] poll',error?.message||error);}
 finally{pollBusy=false;const delay=pollRequested?0:POLL_MS;pollRequested=false;schedulePoll(delay);}
}
function monitorResults(){
 if(typeof app==='undefined'){setTimeout(monitorResults,60);return;}stopLocal();installGuards();inspectSocket();
 const phase=String(app.phase||''),round=client()?.round,shared=active();
 if(phase==='playing'){
  resultSince=0;
  if(!wsOpen()&&shared)abandonRound('socket-lost').catch(()=>{});
  else if(!shared&&startedRoundId){
   const pending=machine()?.pendingStart;
   if(pending?.roundId===startedRoundId&&Number(pending.token)===Number(app.token)){
    completeSeenAt=0;if(Date.now()>Number(pending.deadline||0))abandonRound('attach-timeout').catch(()=>{});
   }else{if(!completeSeenAt)completeSeenAt=Date.now();if(Date.now()-completeSeenAt>3000)abandonRound('attach-failed').catch(()=>{});}
  }
  if(shared&&fullyReceived(shared)&&!normalPending.has(String(shared.roundId))&&!normalSettled.has(String(shared.roundId))){
   const progress=completionProgressKey(shared);if(progress!==completeProgress){completeProgress=progress;completeProgressAt=Date.now();}
   if(Date.now()-completeProgressAt>COMPLETE_STALL_MS)abandonRound('engine-stalled').catch(()=>{});
  }else{completeProgress='';completeProgressAt=0;if(shared)completeSeenAt=0;}
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
 stopLocal();installGuards();inspectSocket();showSettlementReview();poll();monitorResults();
 // HTTP getState() itself emits a snapshot through accept(). Scheduling another
 // GET for that snapshot creates an unbounded response -> request feedback loop.
 client().on?.(message=>{if(['ball_result','round_started','round_complete','betting_started','host_changed','host_status'].includes(message?.type))schedulePoll(0);});
 addEventListener('beforeunload',()=>{
  pollStopped=true;clearTimeout(pollTimer);const shared=active();if(shared?.roundId){if(['result','paying','complete'].includes(String(app?.phase||'')))queueNormal(shared);else{const p=shared.participant||lastParticipant||{};queueLoss(shared.roundId,p.creditAfterBet);}}
 },{once:true});
 window.SweetsSharedControllerV224={hardReset,abandonRound,finishNormal,canStart,stable,remoteReady,refreshNow:refreshState,isReady:()=>modelReady(app),describe:()=>({connectionEpoch,onlineSince,firstSnapshotAt,lastSnapshotAt,snapshotCount,blockedRoundId,joinedRoundId,startedRoundId,activeRound:active()?.roundId||null,losses:Object.keys(lossQueue),pendingSettlements:[...normalPending.keys()],settlementReview:[...normalReview.keys()],generation,resetBusy})};
 console.info('[SharedController224] normal-cycle priority; disconnects are zero-WIN losses and never replayed');
}
boot();
})();


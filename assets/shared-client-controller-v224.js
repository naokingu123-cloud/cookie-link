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
const AUTO_REBET_KEY='sweets-shared-auto-rebet-v228';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const finite=value=>Number.isFinite(Number(value))?Number(value):0;
const machine=()=>window.SweetsSharedMachine;
const client=()=>machine()?.client;
const active=()=>machine()?.active;

let nativeStart=null,nativeSharedReset=null,internalReset=false;
let socketRef=null,socketWasOpen=false,connectionEpoch=0,onlineSince=0,firstSnapshotAt=0,lastSnapshotAt=0,snapshotCount=0;
let joinedRoundId='',startedRoundId='',startingRoundId='';
const betSession=typeof crypto!=='undefined'&&typeof crypto.randomUUID==='function'?crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,12);
let betAttempt=null,betAttemptSequence=0;
let draftReserved=0,draftRoundId='',pendingFunds=null;
let autoRebet=(()=>{try{return localStorage.getItem(AUTO_REBET_KEY)!=='0';}catch{return true;}})(),manualBetRoundId='';
let pollTimer=0,pollDueAt=0,pollBusy=false,pollRequested=false,pollStopped=false,nextPollAt=0;
let backoffUntil=0,pollFailures=0,refreshPromise=null;
let joinBusy=false,startBusy=false,resetBusy=false,abandonBusy=false,finishBusy=false;
let resultSince=0,completeSeenAt=0,completeProgress='',completeProgressAt=0,lastStatus='',generation=0,lastParticipant=null,lastServerWallet=null;
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
 if(operatorVoidsV242.has(String(roundId)))return;
 if(!roundId||normalPending.has(String(roundId))||normalSettled.has(String(roundId))||normalReview.has(String(roundId)))return;abandonedRounds.add(String(roundId));
 joinedRounds.delete(String(roundId));if(joinedRoundId===String(roundId))joinedRoundId='';if(startedRoundId===String(roundId))startedRoundId='';if(startingRoundId===String(roundId))startingRoundId='';
 if(betAttempt?.roundId===String(roundId))betAttempt=null;if(manualBetRoundId===String(roundId))manualBetRoundId='';
 if(pendingFunds?.roundId===String(roundId)){pendingFunds=null;setAvailableCredit(Math.max(0,finite(creditAfterBet)));}
 lossQueue[String(roundId)]={roundId:String(roundId),creditAfterBet:Math.max(0,finite(creditAfterBet)),at:Date.now()};saveLosses();
}
function dropLoss(roundId){delete lossQueue[String(roundId)];saveLosses();}
function queueNormal(shared){
 const roundId=String(shared?.roundId||startedRoundId||'');if(operatorVoidsV242.has(roundId))return;if(!roundId||normalPending.has(roundId)||normalSettled.has(roundId)||normalReview.has(roundId))return;
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
 lastServerWallet={playerId,revision:Number(wallet.revision),credit:Number(wallet.credit),lastRoundId:String(wallet.lastRoundId||'')};
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
function resetStability(){connectionEpoch++;onlineSince=0;firstSnapshotAt=0;lastSnapshotAt=0;snapshotCount=0;if(pendingFunds)pendingFunds.cancelled=true;betAttempt=null;manualBetRoundId='';joinedRoundId='';startedRoundId='';startingRoundId='';joinedRounds.clear();}
function stable(){const now=Date.now();return wsOpen()&&onlineSince>0&&snapshotCount>=SNAPSHOT_MIN&&firstSnapshotAt>0&&now-firstSnapshotAt>=STABLE_MS&&now-lastSnapshotAt<=SNAPSHOT_FRESH_MS;}
function noteSnapshot(state){
 const now=Date.now();if(!firstSnapshotAt)firstSnapshotAt=now;lastSnapshotAt=now;snapshotCount++;
}
function selected(target=window.app){
 const bets=Array.isArray(target?.bets)?target.bets.map(value=>Math.max(0,finite(value))):[];
 const ids=window.SweetsLineup?.ids;
 if(Array.isArray(ids))for(let index=0;index<bets.length;index++)if(!ids[index])bets[index]=0;
 // Ready selections are the only input for the next BET. Do not revive a
 // previous nonzero stake after the user has explicitly selected zero.
 return {bets,locked:[...bets],enabled:bets.map(value=>value>0)};
}
function setAvailableCredit(value){
 app.credit=Math.max(0,finite(value));app.displayCredit=app.credit;
 try{app.onChange?.(app);}catch{}refreshBetControls(app);
}
function betBudget(target=window.app){return Math.max(0,finite(target?.credit))+draftReserved;}
function reserveSelection(before,after){
 const change=after>before?after-before:-Math.min(draftReserved,before-after);
 draftReserved=Math.max(0,draftReserved+change);
 if(draftReserved&&!draftRoundId&&client()?.round?.phase==='BETTING')draftRoundId=String(client().round.id||'');
 if(!draftReserved)draftRoundId='';
 if(change)setAvailableCredit(finite(app.credit)-change);
}
function releaseDraft(){const credit=finite(app.credit)+draftReserved;draftReserved=0;draftRoundId='';setAvailableCredit(credit);}
function rejectBetFunds(attempt){
 if(pendingFunds===attempt?.funds){const credit=finite(app.credit)+pendingFunds.held;pendingFunds=null;setAvailableCredit(credit);}
 if(betAttempt===attempt)betAttempt=null;if(manualBetRoundId===attempt?.roundId)manualBetRoundId='';
}
// Wallet values are server balances. Local, uncommitted selections are a
// separate reservation, so hydration must not make their money spendable twice.
function projectWalletCredit(credit,wallet={},options={}){
 credit=Math.max(0,finite(credit));const funds=pendingFunds;
 if(funds){
  const matching=wallet.source==='bet'&&String(wallet.lastRoundId||'')===funds.roundId;
  const rejected=options.joinRejected&&String(options.joiningRoundId||'')===funds.roundId;
  const round=options.round||client()?.round,closed=round&&(round.id!==funds.roundId||round.phase!=='BETTING');
  const settled=String(wallet.lastRoundId||'')===funds.roundId&&['client','server-worker'].includes(wallet.source)&&round?.id===funds.roundId&&(round.phase==='COMPLETE'||round.participant?.settlement);
  if(matching){funds.held=0;if(funds.cancelled)pendingFunds=null;return credit;}
  if(settled||rejected||(funds.cancelled&&closed)){pendingFunds=null;return credit;}
  return Math.max(0,credit-funds.held);
 }
 if(draftReserved>credit){draftReserved=0;draftRoundId='';}
 return Math.max(0,credit-draftReserved);
}
function resolveExpiredFunds(state,authoritative){
 const funds=pendingFunds;if(!funds?.cancelled||!authoritative)return;
 const candidate=[state?.round,state?.pendingRound].find(round=>round?.id===funds.roundId&&round?.participant?.playerId&&(!client()?.playerId||round.participant.playerId===client().playerId));
 if(candidate){
  const credit=candidate.participant.settlement?.creditAfter??candidate.participant.creditAfterBet;
  if(credit!=null&&Number.isFinite(Number(credit))){pendingFunds=null;setAvailableCredit(Number(credit));}return;
 }
 const round=state?.round;if(!round||round.id===funds.roundId&&round.phase==='BETTING')return;
 const wallet=state?.payoutControlV3?.wallet,credit=wallet?.credit;
 const restored=credit!=null&&Number.isFinite(Number(credit))?Number(credit):finite(app.credit)+funds.held;
 pendingFunds=null;setAvailableCredit(restored);
}
function expireBetAttempt(round=client()?.round,authoritative=false){
 if(!round)return;
 const id=String(round.id||'');
 if(draftReserved){
  if(!draftRoundId&&round.phase==='BETTING')draftRoundId=id;
  if(draftRoundId&&(id!==draftRoundId||round.phase!=='BETTING'||finite(round.betClosesAt)<=Date.now()+finite(client()?.clockOffset)))releaseDraft();
 }
 if(betAttempt&&(id!==betAttempt.roundId||!['BETTING','PLAYING'].includes(round.phase)||round.participant?.settlement||abandonedRounds.has(betAttempt.roundId)||(authoritative&&round.phase==='PLAYING'&&!round.participant?.playerId))){
  if(pendingFunds===betAttempt.funds)pendingFunds.cancelled=true;
  if(manualBetRoundId===betAttempt.roundId)manualBetRoundId='';betAttempt=null;
 }
 // A server-settled reservation that never attached has no local animation to
 // finish. Release its edit lock so AUTO OFF can still place the next BET.
 if(joinedRoundId&&typeof app!=='undefined'&&app.phase==='ready'&&!active()&&!machine()?.pendingStart&&(id!==joinedRoundId||!['BETTING','PLAYING'].includes(round.phase)||round.participant?.settlement)){
  const previous=joinedRoundId,settlement=id===previous?round.participant?.settlement:client()?.pendingRound?.id===previous?client().pendingRound.participant?.settlement:null;
  joinedRounds.delete(previous);joinedRoundId='';if(startedRoundId===previous)startedRoundId='';if(startingRoundId===previous)startingRoundId='';
  const credit=lastServerWallet?.lastRoundId===previous?lastServerWallet.credit:settlement?.creditAfter;
  if(credit!=null&&Number.isFinite(Number(credit))&&Number(credit)>=0)setAvailableCredit(projectWalletCredit(Number(credit)));
 }
}
function totalSelected(target=window.app){return selected(target).bets.reduce((sum,value)=>sum+value,0);}
function canEditBets(target=window.app){return !!target&&target.phase==='ready'&&!active()&&!joinBusy&&!resetBusy&&!abandonBusy&&!finishBusy&&!betAttempt&&!pendingFunds&&!joinedRoundId&&!startedRoundId;}
function canSetBet(index,value,target=window.app){
 if(!canEditBets(target)||!Number.isInteger(index)||index<0||index>=(target.bets?.length||0)||!Number.isSafeInteger(value)||value<0)return false;
 if(Array.isArray(window.SweetsLineup?.ids)&&!window.SweetsLineup.ids[index]&&value>0)return false;
 const before=selected(target),current=before.bets[index],total=before.bets.reduce((sum,bet,i)=>sum+(i===index?value:bet),0);
 return value<=current||(Number.isSafeInteger(total)&&total<=betBudget(target));
}
function setAutoRebet(value){
 autoRebet=!!value;try{localStorage.setItem(AUTO_REBET_KEY,autoRebet?'1':'0');}catch{}
 refreshBetControls();if(autoRebet){joinBet(client()?.round).catch(()=>{});schedulePoll(0);}return autoRebet;
}
function requestBet(){
 const round=client()?.round,total=totalSelected(app);
 if(!canEditBets(app)||!stable()||!modelReady(app)||round?.phase!=='BETTING'||!round.canBet||total<=0||total>betBudget(app)||finite(round.betClosesAt)-(Date.now()+finite(client()?.clockOffset))<MIN_BET_REMAIN_MS)return false;
 manualBetRoundId=String(round.id);joinBet(round).catch(()=>{});return !!betAttempt||joinedRoundId===String(round.id);
}
function disableBetButton(button,disabled,reason=''){
 if(!button)return;disabled=!!disabled;
 if(button.disabled!==disabled)button.disabled=disabled;
 const aria=String(disabled);if(button.getAttribute?.('aria-disabled')!==aria)button.setAttribute?.('aria-disabled',aria);
 if(button.classList?.contains?.('shared-bet-disabled')!==disabled)button.classList?.toggle?.('shared-bet-disabled',disabled);
 if(disabled&&reason){if(button.title!==reason)button.title=reason;}
 else if(button.title==='CREDIT不足'||button.title==='BET登録後は変更できません')button.title='';
}
function refreshBetControls(target=typeof app!=='undefined'?app:window.app){
 if(!target)return;
 const editable=canEditBets(target),round=client()?.round,total=totalSelected(target),funded=total>0&&total<=betBudget(target);
 if(typeof slots!=='undefined'&&Array.isArray(slots))for(const slot of slots){
  const index=Number(slot.i),current=finite(target.bets?.[index]);
  const increment=typeof units!=='undefined'&&typeof unit!=='undefined'?finite(units[unit[index]]):5;
  disableBetButton(slot.cycle,!editable,'BET登録後は変更できません');
  disableBetButton(slot.addBet,!canSetBet(index,current+increment,target),editable?'CREDIT不足':'BET登録後は変更できません');
  disableBetButton(slot.oneBet,!canSetBet(index,current+1,target),editable?'CREDIT不足':'BET登録後は変更できません');
 }
 const toggle=document.getElementById('shared-auto-rebet-v228');if(toggle&&toggle.checked!==autoRebet)toggle.checked=autoRebet;
 const button=document.getElementById('shared-bet-v228');
 if(button){
  const registered=joinedRounds.has(String(round?.id||'')),remaining=finite(round?.betClosesAt)-(Date.now()+finite(client()?.clockOffset));
  disableBetButton(button,!editable||!funded||!stable()||round?.phase!=='BETTING'||!round.canBet||remaining<MIN_BET_REMAIN_MS,!funded?'CREDIT不足':'');
  const label=registered?'BET登録済み':joinBusy?'登録中…':!funded&&total>0?'CREDIT不足':'BETする';if(button.textContent!==label)button.textContent=label;
 }
}
function installBetControls(){
 const clock=document.getElementById('bet-countdown');if(!clock||typeof document.createElement!=='function'||document.getElementById('shared-auto-rebet-v228'))return;
 const style=document.createElement('style');style.textContent='.shared-bet-disabled{filter:grayscale(1)!important;opacity:.38!important;cursor:not-allowed!important}#bet-countdown small{white-space:normal}#shared-bet-v228{display:block;width:100%;min-height:20px;padding:2px;margin-top:3px;font:800 9px/1.2 system-ui}#bet-countdown .shared-auto-rebet-label{margin-top:3px;font:800 8px/1.3 system-ui}';document.head?.append?.(style);
 const label=document.createElement('label');label.className='shared-auto-rebet-label';
 const toggle=document.createElement('input');toggle.type='checkbox';toggle.id='shared-auto-rebet-v228';toggle.checked=autoRebet;toggle.onchange=()=>setAutoRebet(toggle.checked);
 label.append(toggle,'AUTO REBET');const button=document.createElement('button');button.id='shared-bet-v228';button.type='button';button.textContent='BETする';button.onclick=requestBet;
 clock.append(label,button);refreshBetControls();
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
function releaseResultInput(){
 // The native renderer restores these locks only while its layer is visible.
 // Shared completion can hide that layer before the next animation frame, so
 // release its ownership explicitly before changing hidden. Preserve other
 // modals: JPC opens before the player menu, which is the outer input owner.
 if(typeof resultInert==='undefined'||!Array.isArray(resultInert)||!resultInert.length)return;
 const owners=[];
 if(typeof jpcSession!=='undefined'&&jpcSession?.active&&Array.isArray(jpcSession.inert))owners.push(jpcSession.inert);
 if(typeof menuOpen!=='undefined'&&menuOpen&&typeof recordInert!=='undefined'&&Array.isArray(recordInert))owners.push(recordInert);
 for(const [element,previous] of resultInert){
  if(!element)continue;let locked=!!previous;
  for(const owner of owners){const entry=owner.find(item=>item?.[0]===element);if(entry){entry[1]=!!entry[1]&&locked;locked=true;}}
  if(element.inert!==locked)element.inert=locked;
 }
 resultInert=[];
}
function hideResults(){
 releaseResultInput();
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
 const epochV242=operatorEpochV242;
 if(resetBusy||typeof app==='undefined')return false;resetBusy=true;const bet=selected(app);
 try{
  rebuildFreshBoard(app,Math.max(0,finite(credit)),bet,reason);
  for(const delay of [100,320,850]){
   await sleep(delay);if(epochV242!==operatorEpochV242)return false;
   if(['result','paying','complete','error','playing'].includes(String(app.phase||''))||app.draws?.length||app.payout||app.result||active())rebuildFreshBoard(app,Math.max(0,finite(credit)),bet,reason+'-late');
   else{hideResults();renderAll(app);}
  }
   resultSince=0;completeSeenAt=0;completeProgress='';completeProgressAt=0;lastParticipant=null;status('WAIT','次のSERVER BET TIME待機');return modelReady(app);
 }finally{resetBusy=false;}
}
async function settleZero(roundId,creditAfterBet){
 roundId=String(roundId||'');if(!roundId)return false;if(operatorVoidsV242.has(roundId)){dropLoss(roundId);return true;}
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
 const refundEpochV242=operatorEpochV242;
 if(abandonBusy||resetBusy||typeof app==='undefined')return false;
 const shared=active(),roundId=String(shared?.roundId||startedRoundId||client()?.round?.id||'');
 if(!roundId||abandonedRounds.has(roundId)&&!shared&&app.phase==='ready')return false;
 if(normalPending.has(roundId)||normalSettled.has(roundId)||(fullyReceived(shared)&&reason!=='engine-stalled')){status('WAIT','受信済み8球の結果処理・精算待ち');return false;}
 abandonBusy=true;
 try{
  const participant=participantFor(roundId),credit=Number.isFinite(Number(participant?.creditAfterBet))?Number(participant.creditAfterBet):finite(app.credit);
  queueLoss(roundId,credit);joinedRounds.delete(roundId);if(joinedRoundId===roundId)joinedRoundId='';if(startedRoundId===roundId)startedRoundId='';if(startingRoundId===roundId)startingRoundId='';
  await hardReset(credit,'abandon-'+reason);if(refundEpochV242!==operatorEpochV242)return false;settleZero(roundId,credit).catch(()=>{});
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
 app.bets=[...bets];app.locked=[...locked];app.enabled=[...enabled];
 if(Number.isFinite(Number(participant.creditAfterBet))){app.credit=projectWalletCredit(Number(participant.creditAfterBet),{source:'bet',lastRoundId:client()?.round?.id});app.displayCredit=app.credit;}
 lastParticipant=participant;try{app.onChange?.(app);}catch{}refreshBetControls(app);
}
function confirmBet(round,attempt=betAttempt,directResponse=false){
 const c=client(),id=String(round?.id||''),participant=round?.participant;
 if(!attempt||betAttempt!==attempt||attempt.epoch!==connectionEpoch||attempt.socket!==c?.ws||!wsOpen(c))return false;
 if(id!==attempt.roundId||c?.round?.id!==id||!['BETTING','PLAYING'].includes(round.phase)||!participant?.playerId||participant.settlement||abandonedRounds.has(id))return false;
 if(c.playerId&&participant.playerId!==c.playerId)return false;
 // Only a reservation submitted by this live controller can replace a lost
 // HTTP ACK. An old page, interrupted round or unrelated participant cannot.
 if(participant.clientRoundToken!==attempt.payload.clientRoundToken&&(!directResponse||participant.clientRoundToken))return false;
 joinedRounds.add(id);joinedRoundId=id;if(pendingFunds===attempt.funds)pendingFunds=null;betAttempt=null;manualBetRoundId='';applyParticipant(participant);status('BET','BET登録済み');return true;
}
function betStatus(round=client()?.round){
 if(round?.phase!=='BETTING')return null;
 const id=String(round.id||''),remaining=finite(round.betClosesAt)-(Date.now()+finite(client()?.clockOffset));
 const text=(Math.max(0,remaining)/1000).toFixed(1)+'秒';
 if(joinedRounds.has(id)&&!abandonedRounds.has(id))return {text,label:'SERVER BET TIME・BET登録済み'};
 if(!wsOpen())return {text:'WAIT',label:'SERVER再接続待機'};
 if(!stable())return {text,label:'接続の安定確認中'};
 if(!round.canBet||abandonedRounds.has(id))return {text:'NEXT',label:'次のBET TIME待機'};
 if(betAttempt?.roundId===id&&joinBusy)return {text,label:'BET登録を確認中'};
 if(Date.now()<Math.max(backoffUntil,finite(client()?.httpRetryAt)))return {text,label:'BET登録の再試行待ち'};
 if(resetBusy||!modelReady(app))return {text,label:'前ゲームの終了処理中'};
 if(remaining<MIN_BET_REMAIN_MS)return {text:'NEXT',label:'受付締切・次のBET TIME待機'};
 const bet=selected(app),total=bet.bets.reduce((sum,value,index)=>sum+(bet.enabled[index]!==false?Math.max(0,finite(value)):0),0);
 if(total<=0)return {text:'BET',label:'BETを設定してください'};
 if(!betAttempt&&betBudget(app)<total)return {text:'CREDIT',label:'CREDIT不足'};
 if(pendingFunds?.cancelled)return {text:'WAIT',label:'BET残高をサーバーへ確認中'};
 if(operatorAwaitingV242.size)return {text:'WAIT',label:'BET返却の残高確認中'};
 if(operatorManualBetV242(round))return {text,label:'BET全額返却済み・BETするで再参加'};
 if(!autoRebet&&manualBetRoundId!==id)return {text,label:'AUTO REBET OFF・BET待ち'};
 return {text,label:betAttempt?.roundId===id?'BET登録を再確認中':'SERVER BET TIME・BET登録待ち'};
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
 if(!proto.__sharedBetBudgetV228&&typeof proto.setBet==='function'){
  const nativeSetBet=proto.setBet;Object.defineProperty(proto,'__sharedBetBudgetV228',{value:true});
  proto.setBet=function(index,value){
   if(!canSetBet(index,value,this)){refreshBetControls(this);return false;}
   const before=totalSelected(this);
   const changed=nativeSetBet.call(this,index,value);
   if(changed!==false){const bet=selected(this);this.bets=bet.bets;this.locked=bet.locked;this.enabled=bet.enabled;reserveSelection(before,totalSelected(this));}
   refreshBetControls(this);return changed;
  };
 }
 if(typeof hud==='function'&&!hud.__sharedBetBudgetV228){
  const nativeHud=hud;hud=function(...args){const result=nativeHud.apply(this,args);refreshBetControls(args[0]);return result;};hud.__sharedBetBudgetV228=true;
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
 // Result transport and the server's eligibility decide participation. Video
 // decoding/reconnection is independent and must never silently skip a BET.
 if(joinBusy||resetBusy||!stable()||!modelReady(app)||!round||round.phase!=='BETTING'||round.canBet!==true)return false;
 const id=String(round.id||'');if(!id||joinedRounds.has(id)||abandonedRounds.has(id))return false;
 if(pendingFunds&&pendingFunds!==betAttempt?.funds)return false;
 if(operatorAwaitingV242.size||operatorManualBetV242(round))return false;
 if(!autoRebet&&manualBetRoundId!==id)return false;
 const serverNow=Date.now()+finite(client()?.clockOffset),remaining=finite(round.betClosesAt)-serverNow;if(remaining<MIN_BET_REMAIN_MS)return false;
 if(!betAttempt||betAttempt.roundId!==id||betAttempt.epoch!==connectionEpoch){
  const bet=selected(app),totalBet=bet.bets.reduce((sum,value)=>sum+value,0),creditBefore=betBudget(app);
  if(totalBet<=0){status('BET','BETを設定してください');return false;}if(creditBefore<totalBet){status('CREDIT','CREDIT不足');return false;}
  const funds={roundId:id,held:totalBet,cancelled:false};
  betAttempt={roundId:id,epoch:connectionEpoch,socket:client()?.ws,funds,payload:{roundId:id,clientRoundToken:'v229-'+betSession+'-'+connectionEpoch+'-'+(++betAttemptSequence),bets:bet.bets,locked:bet.locked,enabled:bet.enabled,totalBet,creditBefore,creditAfterBet:creditBefore-totalBet,initialState:null,appVersion:'v229-immediate-bet'}};
  draftReserved=0;draftRoundId='';pendingFunds=funds;setAvailableCredit(creditBefore-totalBet);
 }
 const attempt=betAttempt;joinBusy=true;
 try{
  const response=await client().join(attempt.payload);
  const accepted=client().accept?.(response);if(accepted!==false)rememberWallet(response?.payoutControlV3);
  if((accepted!==false&&confirmBet(response?.round,attempt,true))||confirmBet(client()?.round,attempt))return true;
 }catch(error){
  if(error?.data?.round){const accepted=client()?.accept?.(error.data);if(accepted!==false)rememberWallet(error.data.payoutControlV3);}
  if(confirmBet(client()?.round,attempt))return true;
  if(['insufficient_credit','invalid_bet','invalid_credit','bet_total_mismatch','wallet_migration_pending','wait_next_bet','round_mismatch','round_already_settled'].includes(String(error?.data?.error||''))){rejectBetFunds(attempt);}
  if(Number(error?.status)===429)deferRequest(error);if(![409].includes(Number(error?.status)))console.warn('[SharedController224] join',error?.message||error);
 }
 finally{joinBusy=false;refreshBetControls(app);}
 return false;
}
async function startRound(round){
 const id=String(round?.id||'');if(startBusy||resetBusy||!id||id!==joinedRoundId||!joinedRounds.has(id)||abandonedRounds.has(id)||!round?.participant?.playerId)return false;
 if(active()?.roundId===id){startedRoundId=id;return true;}
 if(app.phase!=='ready'||!modelReady(app))return false;
 // An accepted BET follows the authoritative result channel even while the
 // independent video channel is unavailable or reconnecting.
 startBusy=true;startingRoundId=id;
 try{
  applyParticipant(round.participant);const began=app.start();
  if(began!==false&&app.phase==='playing'){startedRoundId=id;status('PLAY','SERVER抽選に参加中');return true;}
 }catch(error){console.warn('[SharedController224] start',error?.message||error);}
 finally{startingRoundId='';startBusy=false;}
 return false;
}
async function settleNormal(shared){
 const roundId=String(shared?.roundId||startedRoundId||'');if(!roundId||operatorVoidsV242.has(roundId))return lastServerWallet?.credit??finite(app.credit);
 if(normalSettled.has(roundId))return normalCredits.get(roundId)??finite(app.credit);
 if(normalReview.has(roundId))return finite(normalReview.get(roundId)?.credit);
 const participant=shared?.participant||lastParticipant||{};queueNormal(shared);
 if(!wsOpen())throw Object.assign(Error('settlement_connection_wait'),{status:503,retryAfterMs:1000});
 let response;
 try{response=participant.settlement?{settlement:participant.settlement}:await client().settle(normalPending.get(roundId));}
 catch(error){if(terminalSettlement(error))return quarantineNormal(roundId,error);throw error;}
 if(operatorVoidsV242.has(roundId))return lastServerWallet?.credit??finite(app.credit);
 if(!response?.settlement||!Number.isFinite(Number(response.settlement.creditAfter)))throw Error('settlement_ack_missing');
 const credit=Number(response.settlement.creditAfter);
 normalSettled.add(roundId);normalCredits.set(roundId,credit);normalPending.delete(roundId);saveNormals();dropLoss(roundId);return credit;
}
async function finishNormal(reason='result-complete'){
 const epochV242=operatorEpochV242;
 if(resetBusy||abandonBusy||finishBusy||Date.now()<Math.max(backoffUntil,Number(client()?.httpRetryAt)||0))return false;
 const shared=active(),roundId=String(shared?.roundId||startedRoundId||'');
 if(!roundId)return hardReset(finite(app.credit),reason+'-no-round');
 finishBusy=true;
 try{
  const credit=await settleNormal(shared);if(epochV242!==operatorEpochV242||operatorVoidsV242.has(roundId))return false;joinedRounds.delete(roundId);if(joinedRoundId===roundId)joinedRoundId='';if(startedRoundId===roundId)startedRoundId='';return await hardReset(credit,reason);
 }catch(error){deferRequest(error);console.warn('[SharedController224] settlement awaiting ACK',error?.message||error);return false;}
 finally{finishBusy=false;}
}
async function flushStaleState(state){
 for(const [roundId] of normalPending){
  if(roundId===active()?.roundId)continue;
  // A restored settlement can finish while the user edits the next selection.
  // Its balance is authoritative, but any draft reservation is still held.
  // A newer submitted BET owns its own wallet and must not be rewound here.
  try{const credit=await settleNormal({roundId});if(operatorVoidsV242.has(roundId))continue;if(!active()&&!joinedRoundId&&!betAttempt&&!pendingFunds&&app?.phase==='ready')setAvailableCredit(projectWalletCredit(credit));}
  catch(error){deferRequest(error);return;}
 }
 await flushLosses();const currentId=String(active()?.roundId||'');
 for(const round of [state?.pendingRound,state?.round]){
  const id=String(round?.id||'');if(!id||id===currentId||normalPending.has(id)||normalSettled.has(id)||normalReview.has(id)||round?.participant?.settlement||!round?.participant?.playerId)continue;
  if(joinedRounds.has(id)&&(round.phase==='BETTING'||round.phase==='PLAYING'))continue;
  queueLoss(id,round.participant.creditAfterBet);settleZero(id,round.participant.creditAfterBet).catch(()=>{});abandonedRounds.add(id);
 }
}
async function processState(state,authoritative=false){
 // A successful server registration can outlive a lost HTTP response. Confirm
 // its exact token before stale-round cleanup can classify it as an old loss.
 confirmBet(state?.round);confirmBet(client()?.round);
 expireBetAttempt(state?.round||client()?.round,authoritative);resolveExpiredFunds(state,authoritative);
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
  if(accepted!==false){noteSnapshot(latest);rememberWallet(state?.payoutControlV3);}await processState(latest,accepted!==false);return latest;
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
 expireBetAttempt();
 refreshBetControls(app);
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
  if((phase==='complete'&&age>250)||(!document.hidden&&overlayGone&&age>900)||(phase==='error'&&age>1000)||(!document.hidden&&age>RESULT_MAX_MS)||(document.hidden&&age>15000))finishNormal('phase-'+phase).catch(()=>{});
 }else{
  resultSince=0;if(phase==='ready'&&!active()&&!modelReady(app)&&!resetBusy)hardReset(finite(app.credit),'dirty-ready').catch(()=>{});
 }
 setTimeout(monitorResults,100);
}
function boot(){
 if(typeof app==='undefined'||!client()||typeof Arcade!=='function'||typeof rouletteDrawSource==='undefined'){setTimeout(boot,50);return;}
 if(app.engines?.[0]&&(!app.engines[0].kind||/^game[-_ ]?0$/i.test(String(app.engines[0].kind))))app.engines[0].kind='cookie';
 stopLocal();installGuards();inspectSocket();showSettlementReview();installBetControls();poll();monitorResults();
 // HTTP getState() itself emits a snapshot through accept(). Scheduling another
 // GET for that snapshot creates an unbounded response -> request feedback loop.
 client().on?.(message=>{if(['round_cancelled','ball_result','round_started','round_complete','betting_started','host_changed','host_status'].includes(message?.type))schedulePoll(0);});
 addEventListener('beforeunload',()=>{
  pollStopped=true;clearTimeout(pollTimer);const shared=active();if(shared?.roundId){if(['result','paying','complete'].includes(String(app?.phase||'')))queueNormal(shared);else{const p=shared.participant||lastParticipant||{};queueLoss(shared.roundId,p.creditAfterBet);}}
 },{once:true});
 window.SweetsSharedControllerV224={operatorRefundPendingV242:()=>operatorAwaitingV242.size>0,operatorStateV242,operatorVoidsV242,hardReset,abandonRound,finishNormal,canStart,canEditBets,canSetBet,refreshBetControls,setAutoRebet,requestBet,projectWalletCredit,stable,remoteReady,betStatus,refreshNow:refreshState,isReady:()=>modelReady(app),describe:()=>({connectionEpoch,onlineSince,firstSnapshotAt,lastSnapshotAt,snapshotCount,autoRebet,joinedRoundId,startedRoundId,pendingBetRoundId:betAttempt?.roundId||null,draftReserved,pendingDebitRoundId:pendingFunds?.roundId||null,localReserved:draftReserved+(pendingFunds?.held||0),activeRound:active()?.roundId||null,losses:Object.keys(lossQueue),pendingSettlements:[...normalPending.keys()],settlementReview:[...normalReview.keys()],generation,resetBusy})};
 console.info('[SharedController224] normal-cycle priority; disconnects are zero-WIN losses and never replayed');
}

// v242: an operator refund is not a loss, replay, or a normal payout.
let operatorEpochV242=0;
const operatorVoidsV242=new Set(),operatorAwaitingV242=new Set();
function operatorManualBetV242(round){return !!(round?.forcedFromRoundId&&operatorVoidsV242.has(String(round.forcedFromRoundId))&&!autoRebet&&manualBetRoundId!==String(round.id));}
function operatorStateV242(message){
 const c=client(),control=message?.payoutControlV3||(Number(message?.version)===3?message:null);
 if(control?.playerId&&c?.playerId&&String(control.playerId)!==String(c.playerId))return false;
 const wallet=control?.wallet,validWallet=wallet&&Number.isSafeInteger(Number(wallet.credit))&&Number(wallet.credit)>=0&&Number(wallet.revision)>=1&&(!lastServerWallet||Number(wallet.revision)>=lastServerWallet.revision);
 const notices=[...(Array.isArray(message?.operatorRefundsV242)?message.operatorRefundsV242:[]),...(Array.isArray(control?.refundsV242)?control.refundsV242:[])];
 const eventId=message?.type==='round_cancelled'&&message.reason==='admin_refund'?String(message.cancelledRoundId||message.round?.id||''):'';
 if(eventId)notices.push({roundId:eventId});
 let reset=false,changed=false,persistChangedV243=false;
 for(const notice of notices){
  const id=String(notice?.roundId||'');if(!id)continue;
  const affected=active()?.roundId===id||startedRoundId===id||joinedRoundId===id||startingRoundId===id||betAttempt?.roundId===id||pendingFunds?.roundId===id;
  const first=!operatorVoidsV242.has(id);operatorVoidsV242.add(id);abandonedRounds.add(id);changed=changed||first;
  // Repeated historical notices must not synchronously write storage on every
  // HTTP response and WebSocket snapshot. Only removed persisted entries matter.
  persistChangedV243=persistChangedV243||Object.prototype.hasOwnProperty.call(lossQueue,id)||normalPending.has(id)||normalReview.has(id);
  delete lossQueue[id];normalPending.delete(id);normalReview.delete(id);normalSettled.delete(id);normalCredits.delete(id);joinedRounds.delete(id);
  if(affected){
   reset=true;operatorAwaitingV242.add(id);operatorEpochV242++;
   if(joinedRoundId===id)joinedRoundId='';if(startedRoundId===id)startedRoundId='';if(startingRoundId===id)startingRoundId='';
   if(betAttempt?.roundId===id)betAttempt=null;if(pendingFunds?.roundId===id)pendingFunds=null;
   draftReserved=0;draftRoundId='';manualBetRoundId='';lastParticipant=null;
  }
 }
 if(!notices.length)return false;
 if(persistChangedV243){saveLosses();saveNormals();try{localStorage.setItem(NORMAL_REVIEW_KEY,JSON.stringify(Object.fromEntries(normalReview)));}catch{}}
 // v242 refund-confirmation barrier
 const waiting=operatorAwaitingV242.size>0;
 const confirmed=!waiting||[...operatorAwaitingV242].every(id=>notices.some(n=>String(n.roundId)===id&&Number(n.revision)>0&&validWallet&&Number(wallet.revision)>=Number(n.revision)));
 if(validWallet&&confirmed)rememberWallet(control);
 if(reset&&typeof app!=='undefined'){
  const credit=validWallet&&confirmed?Number(wallet.credit):Math.max(0,finite(app.credit));
  // token/engine queues and the shared session are invalidated synchronously.
  rebuildFreshBoard(app,credit,selected(app),'operator-refund');resultSince=0;completeSeenAt=0;completeProgress='';completeProgressAt=0;
 }
 if(validWallet&&confirmed&&waiting&&!active()&&!joinedRoundId&&!betAttempt){
  operatorAwaitingV242.clear();setAvailableCredit(Number(wallet.credit));
  status('BET',autoRebet?'BET全額返却済み・自動BETを再登録':'BET全額返却済み・「BETする」で再参加');
 }else if(waiting)status('WAIT','抽選中断・BET全額返却を確認中');
 if(reset||changed){refreshBetControls(app);schedulePoll(0);}
 return reset;
}

boot();
})();


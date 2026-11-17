
// v242: an operator refund is not a loss, replay, or a normal payout.
let operatorEpochV242=0;
const operatorVoidsV242=new Set(),operatorAwaitingV242=new Set();
function operatorManualBetV242(round){return !!(round?.forcedFromRoundId&&operatorVoidsV242.has(String(round.forcedFromRoundId))&&manualBetRoundId!==String(round.id));}
function operatorStateV242(message){
 const c=client(),control=message?.payoutControlV3||(Number(message?.version)===3?message:null);
 if(control?.playerId&&c?.playerId&&String(control.playerId)!==String(c.playerId))return false;
 const wallet=control?.wallet,validWallet=wallet&&Number.isSafeInteger(Number(wallet.credit))&&Number(wallet.credit)>=0&&Number(wallet.revision)>=1&&(!lastServerWallet||Number(wallet.revision)>=lastServerWallet.revision);
 const notices=[...(Array.isArray(message?.operatorRefundsV242)?message.operatorRefundsV242:[]),...(Array.isArray(control?.refundsV242)?control.refundsV242:[])];
 const eventId=message?.type==='round_cancelled'&&message.reason==='admin_refund'?String(message.cancelledRoundId||message.round?.id||''):'';
 if(eventId)notices.push({roundId:eventId});
 let reset=false,changed=false;
 for(const notice of notices){
  const id=String(notice?.roundId||'');if(!id)continue;
  const affected=active()?.roundId===id||startedRoundId===id||joinedRoundId===id||startingRoundId===id||betAttempt?.roundId===id||pendingFunds?.roundId===id;
  const first=!operatorVoidsV242.has(id);operatorVoidsV242.add(id);abandonedRounds.add(id);changed=changed||first;
  delete lossQueue[id];normalPending.delete(id);normalReview.delete(id);normalSettled.delete(id);normalCredits.delete(id);joinedRounds.delete(id);
  if(affected){
   reset=true;operatorAwaitingV242.add(id);operatorEpochV242++;
   if(joinedRoundId===id)joinedRoundId='';if(startedRoundId===id)startedRoundId='';if(startingRoundId===id)startingRoundId='';
   if(betAttempt?.roundId===id)betAttempt=null;if(pendingFunds?.roundId===id)pendingFunds=null;
   draftReserved=0;draftRoundId='';manualBetRoundId='';lastParticipant=null;
  }
 }
 if(!notices.length)return false;
 saveLosses();saveNormals();try{localStorage.setItem(NORMAL_REVIEW_KEY,JSON.stringify(Object.fromEntries(normalReview)));}catch{}
 const waiting=operatorAwaitingV242.size>0;
 if(validWallet)rememberWallet(control);
 if(reset&&typeof app!=='undefined'){
  const credit=validWallet?Number(wallet.credit):Math.max(0,finite(app.credit));
  // token/engine queues and the shared session are invalidated synchronously.
  rebuildFreshBoard(app,credit,selected(app),'operator-refund');resultSince=0;completeSeenAt=0;completeProgress='';completeProgressAt=0;
 }
 if(validWallet&&waiting&&!active()&&!joinedRoundId&&!betAttempt){
  operatorAwaitingV242.clear();setAvailableCredit(Number(wallet.credit));
  status('BET','BET全額返却済み・「BETする」で再参加');
 }else if(waiting)status('WAIT','抽選中断・BET全額返却を確認中');
 if(reset||changed){refreshBetControls(app);schedulePoll(0);}
 return reset;
}

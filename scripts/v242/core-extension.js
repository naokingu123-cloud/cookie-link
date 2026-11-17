
// v242: synchronous money transaction first, then persist the cancelled core.
const operatorBusyV242=new WeakSet();
function finishOperatorCancellationV242(m,record){
 const old=m.round;if(!old||old.id!==record.roundId)return null;
 old.cancelledV242=true;old.phase='CANCELLED';old.completedAt=record.at;old.nextFallbackBallAt=0;old.hostMissingSince=0;
 for(const [pid,r] of Object.entries(record.refunds||{}))if(old.participants?.[pid]){
  old.participants[pid].settlement={...r.settlement};old.participants[pid].checkpoint=null;old.participants[pid].initialState=null;
 }
 old.settlementCount=Object.keys(old.participants||{}).length;
 m.betNowQueuedAt=0;m.revision++;m.updatedAt=now();
 broadcast(m.id,{type:'round_cancelled',round:publicRound(old,null),reason:'admin_refund',cancelledRoundId:old.id});
 archiveRound(m,old);m.round=null;
 const next=createBettingRound(m,old.id);
 const result={action:'refunded',cancelledRoundId:old.id,roundId:next?.id||null,betClosesAt:next?.betClosesAt||null,refundedTotal:record.refundedTotal,refundedPlayers:record.refundedPlayers,requestId:record.requestId};
 (m.operatorRequestsV242||={})[record.requestId]=result;
 const keys=Object.keys(m.operatorRequestsV242);for(const key of keys.slice(0,-128))delete m.operatorRequestsV242[key];
 scheduleSave();return result;
}
function recoverOperatorCancellationV242(m){
 if(operatorBusyV242.has(m))return;
 const record=m.round&&payoutWallet?.operatorCancelled?.(m.id,m.round.id);
 if(record)finishOperatorCancellationV242(m,record);
}
async function forceServerBetV242(m,input={}){
 const requestId=String(input.requestId||'');
 if(!/^[A-Za-z0-9_.:-]{8,120}$/.test(requestId))throw Object.assign(Error('request_id_required'),{status:400});
 if(m.operatorRequestsV242?.[requestId])return {...m.operatorRequestsV242[requestId],idempotent:true};
 if(operatorBusyV242.has(m))throw Object.assign(Error('operator_busy'),{status:409});
 recoverOperatorCancellationV242(m);
 if(m.operatorRequestsV242?.[requestId])return {...m.operatorRequestsV242[requestId],idempotent:true};
 const round=m.round,expected=input.roundId==null?'':String(input.roundId);
 if(expected!==String(round?.id||''))throw Object.assign(Error('operator_round_changed'),{status:409});
 if(!payoutWallet?.operatorCancel)throw Object.assign(Error('refund_service_unavailable'),{status:503});
 operatorBusyV242.add(m);
 try{
  let result;
  if(round){
   const record=payoutWallet.operatorCancel(m.id,round,requestId);
   result=finishOperatorCancellationV242(m,record);
  }else{
   const next=createBettingRound(m);
   result={action:'started',roundId:next?.id||null,betClosesAt:next?.betClosesAt||null,refundedTotal:0,refundedPlayers:0,requestId};
   (m.operatorRequestsV242||={})[requestId]=result;scheduleSave();
  }
  await flushDb();return {...result,idempotent:false};
 }finally{operatorBusyV242.delete(m);}
}

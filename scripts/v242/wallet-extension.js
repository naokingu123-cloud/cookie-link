
// v242: operator cancellations share the wallet's synchronous atomic save.
// This code is appended inside the existing payout module, not a second ledger.
function operatorRefundNoticesV242(machineId,playerId){
 const p=machine(machineId).players?.[safeId(playerId)];
 return (p?.operatorRefundsV242||[]).slice(-64).map(r=>({...r}));
}
function operatorCancelledV242(machineId,roundId){return machine(machineId).operatorVoidsV242?.[String(roundId)]||null;}
function operatorTrendStateV242(machineId){
 const m=machine(machineId);
 if(m.trendV242?.version===242)return m.trendV242;
 const samples={};let knownIn=0,knownOut=0,totalIn=0,totalOut=0;
 for(const p of Object.values(m.players||{})){
  totalIn+=finite(p.lifetimeBet);totalOut+=finite(p.lifetimeWin);
  for(const r of Object.values(p.rounds||{})){
   if(!r.committed||r.cancelledV242||r.settlement?.cancelled)continue;
   const core=coreRounds(machineId).find(x=>x.id===r.id),sequence=Number(core?.sequence)||Number(String(r.id).match(/-(\d+)-[^-]+$/)?.[1])||0;
   const sample=samples[r.id]||(samples[r.id]={roundId:r.id,sequence,at:Number(core?.completedAt)||Number(r.settlement?.settledAt)||Number(r.updatedAt)||now(),contributions:{},expected:Object.keys(core?.participants||{}).length});
   sample.contributions[p.playerId]={input:finite(r.bet),output:finite(r.win)};knownIn+=finite(r.bet);knownOut+=finite(r.win);
  }
 }
 m.trendV242={version:242,baselineIn:Math.max(0,totalIn-knownIn),baselineOut:Math.max(0,totalOut-knownOut),samples};
 return m.trendV242;
}
function operatorRecordTrendV242(machineId,roundId){
 const state=operatorTrendStateV242(machineId),m=machine(machineId),id=String(roundId);
 if(operatorCancelledV242(machineId,id)){delete state.samples[id];return;}
 const core=coreRounds(machineId).find(x=>x.id===id);
 let sample=state.samples[id];
 for(const p of Object.values(m.players||{})){
  const r=p.rounds?.[id];if(!r?.committed||r.cancelledV242)continue;
  if(!sample)sample=state.samples[id]={roundId:id,sequence:Number(core?.sequence)||Number(id.match(/-(\d+)-[^-]+$/)?.[1])||0,at:Number(core?.completedAt)||Number(r.settlement?.settledAt)||now(),contributions:{},expected:0};
  sample.contributions[p.playerId]={input:finite(r.bet),output:finite(r.win)};
 }
 if(sample&&core)sample.expected=Object.keys(core.participants||{}).length;
 const sorted=Object.values(state.samples).sort((a,b)=>a.sequence-b.sequence||a.at-b.at);
 for(const old of sorted.slice(0,-120)){
  for(const c of Object.values(old.contributions)){state.baselineIn+=finite(c.input);state.baselineOut+=finite(c.output);}
  delete state.samples[old.roundId];
 }
}
function operatorTrendV242(machineId){
 const state=operatorTrendStateV242(machineId);let input=state.baselineIn,output=state.baselineOut;
 const points=[],window=[];
 for(const s of Object.values(state.samples).sort((a,b)=>a.sequence-b.sequence||a.at-b.at)){
  if(operatorCancelledV242(machineId,s.roundId))continue;
  const rows=Object.values(s.contributions),roundIn=rows.reduce((a,r)=>a+finite(r.input),0),roundOut=rows.reduce((a,r)=>a+finite(r.output),0);
  input+=roundIn;output+=roundOut;window.push({input:roundIn,output:roundOut});if(window.length>10)window.shift();
  const wi=window.reduce((a,r)=>a+r.input,0),wo=window.reduce((a,r)=>a+r.output,0);
  points.push({roundId:s.roundId,game:s.sequence,at:s.at,input,output,hg:input-output,po:input>0?100*output/input:null,roundIn,roundOut,roundPo:roundIn>0?100*roundOut/roundIn:null,rollingPo:wi>0?100*wo/wi:null,partial:s.expected>rows.length,settledPlayers:rows.length,expectedPlayers:s.expected});
 }
 return {version:242,points:points.slice(-120),baselineIn:state.baselineIn,baselineOut:state.baselineOut,source:'server-settlements',window:10};
}
function operatorCancelWalletV242(machineId,coreRound,requestId){
 if(!coreRound?.id)throw Object.assign(Error('round_required'),{status:400});
 const m=machine(machineId),id=String(coreRound.id),prior=m.operatorVoidsV242?.[id];
 if(prior)return {...prior,idempotent:true};
 // Initialize the trend BEFORE reversing lifetime totals so its baseline stays valid.
 operatorTrendStateV242(machineId);
 const before=JSON.parse(JSON.stringify(m)),at=now(),refunds={};let total=0;
 try{
  for(const [pid,participant] of Object.entries(coreRound.participants||{})){
   const p=player(machineId,pid),r=roundRecord(machineId,pid,id);
   const wager=requireAmount(r.reservation?.bet??participant.totalBet??r.bet,'invalid_bet',machineId,pid);
   const committed=!!r.committed,oldWin=committed?requireAmount(r.win||0,'invalid_win',machineId,pid):0;
   // A previously disconnected client may already have settled a zero-WIN loss.
   // Reverse that same round once as well; do not overwrite later wallet balances.
   let refund=wager,credit=Number(p.wallet.credit);
   if(r.reservation?.status==='released')refund=0;
   if(!Number.isSafeInteger(credit)||credit<0)credit=requireAmount(participant.creditAfterBet,'invalid_credit',machineId,pid);
   const next=credit+refund-oldWin;
   requireAmount(next,'invalid_credit',machineId,pid);
   if(committed){
    p.lifetimeBet=Math.max(0,finite(p.lifetimeBet)-finite(r.bet));p.lifetimeWin=Math.max(0,finite(p.lifetimeWin)-oldWin);
    for(const [gid,g] of Object.entries(r.games||{}))if(p.games[gid]){p.games[gid].bet=Math.max(0,finite(p.games[gid].bet)-finite(g.bet));p.games[gid].win=Math.max(0,finite(p.games[gid].win)-finite(g.win));}
   }
   r.cancelledV242=true;r.committed=true;r.phase='CANCELLED';r.win=0;r.work=null;r.wasOffline=false;r.stableState=null;r.updatedAt=at;
   r.reservation={...(r.reservation||{}),roundId:id,bet:wager,status:'refunded',refundedAt:at,requestId};
   r.settlement={id:id+':'+pid,roundId:id,playerId:pid,totalWin:0,creditAfter:next,source:'admin-refund',cancelled:true,refundedBet:refund,settledAt:at,requestId};
   if(p.currentRoundId===id){p.currentRoundBet=0;p.currentRoundWin=0;p.lastBall=0;}
   if(Number.isFinite(Number(r.quotedRate)))p.effectiveRate=Number(r.quotedRate);
   p.lastQuoteKey='';p.wallet={...p.wallet,credit:next,revision:(Number(p.wallet.revision)||0)+1,lastRoundId:id,source:'admin-refund',reservedRoundId:reservedRoundId(p),initializationVersion:WALLET_INITIALIZATION_VERSION,initializationPending:false,updatedAt:at};p.updatedAt=at;
   const notice={roundId:id,requestId,refundedBet:refund,credit:next,revision:p.wallet.revision,at};
   p.operatorRefundsV242=[...(p.operatorRefundsV242||[]).filter(x=>x.roundId!==id),notice].slice(-64);refunds[pid]={...notice,settlement:{...r.settlement}};total+=refund;
  }
  const result={version:242,roundId:id,requestId,at,sequence:Number(coreRound.sequence)||0,refundedTotal:total,refundedPlayers:Object.keys(refunds).length,refunds};
  (m.operatorVoidsV242||={})[id]=result;
  delete m.trendV242.samples[id];
  // The persisted tombstone is also a recovery journal if the core save fails.
  persistWallet();return result;
 }catch(error){db.machines[safeId(machineId)||'public-01']=before;dirty=true;throw error;}
}
Object.assign(globalThis[Symbol.for('sweets-link.payout-v3.wallet')],{
 operatorCancel:operatorCancelWalletV242,operatorCancelled:operatorCancelledV242,
 operatorNotices:operatorRefundNoticesV242,operatorTrend:operatorTrendV242
});

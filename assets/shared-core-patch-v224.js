(()=>{
'use strict';
if(window.SweetsSharedCorePatchV224)return;
const previous=window.SweetsSharedCorePatchV221;
if(!previous?.patch)throw Error('[SharedCorePatchV224] v221 base patch is required');
function once(source,from,to,label){
 const count=source.split(from).length-1;
 if(count!==1)throw new Error(`[SharedCorePatchV224] ${label} matches=${count}`);
 return source.replace(from,to);
}
function patch(baseSource){
 let source=previous.patch(baseSource);
 source=once(source,
`function recovery(round){
 if(recoveryOpen||!round?.participant||round.participant.settlement||typeof app==='undefined'||app.phase!=='ready')return;
 const p=round.participant;recoveryOpen=true;resumeId=round.id;startPermitId=null;
 app.bets=[...(p.bets||app.bets||[])];app.locked=[...(p.locked||p.bets||app.bets||[])];app.enabled=[...(p.enabled||app.enabled||[])];
 const savedCredit=Number(p.checkpoint?.credit);
 app.credit=Number.isFinite(savedCredit)?savedCredit:(Number(p.creditAfterBet)||app.credit);app.displayCredit=app.credit;repaint(app);
 status('切断中ラウンドを復元中','共有抽選 RECOVERY');
 queueMicrotask(()=>{try{if(app.phase==='ready')app.start();}catch(error){console.error(error);recoveryOpen=false;resumeId=null;}});
}`,
`function recovery(){
 // v224 deliberately never replays or resumes an interrupted round on a
 // player. The lifecycle controller settles it as a zero-WIN loss and joins a
 // later BET from a freshly prepared board.
 recoveryOpen=false;resumeId=null;startPermitId=null;return false;
}`,
 'disable client recovery replay');
 source=once(source,
`async function syncBetReservation(force=false){
 const round=client.round;
 if(betSyncBusy||!client.online||!round||round.phase!=='BETTING'||!round.canBet||app?.phase!=='ready'||recoveryOpen)return;
 const payload=betPayload(round),signature=round.id+'|'+payload.bets.join(',')+'|'+payload.enabled.join(',')+'|'+payload.creditAfterBet;
 const t=Date.now();if(!force&&signature===lastBetSignature&&t-lastBetSentAt<1200)return;
 betSyncBusy=true;
 try{const data=await client.join(payload);client.accept(data);lastBetSignature=signature;lastBetSentAt=t;}
 catch(error){if(error?.data)client.accept(error.data);if(error?.status!==409)console.warn('[SharedMachineV221] BET sync',error?.message||error);}
 finally{betSyncBusy=false;}
}`,
`async function syncBetReservation(){
 // One owner only: SharedClientControllerV224 reserves authoritative BETs.
 return false;
}`,
 'disable duplicate core BET reservation');
 source=once(source,
`async function refreshAndMaybeStart(){
 if(!client.online)return;
 try{
  const data=await client.getState();client.accept(data);
  const round=data.round;
  if(round?.phase==='PLAYING'&&round.participant?.playerId&&app?.phase==='ready'){
   app.bets=[...(round.participant.bets||app.bets||[])];
   app.locked=[...(round.participant.locked||round.participant.bets||app.locked||app.bets||[])];
   app.enabled=[...(round.participant.enabled||app.enabled||[])];
   app.paused=false;startPermitId=round.id;client.syncReady();
   try{app.start();}catch(error){console.warn('[SharedMachineV221] server start',error);}
  }
 }catch(error){console.warn('[SharedMachineV221] state refresh',error?.message||error);}
 scheduleServerBetClock(0);
}`,
`async function refreshAndMaybeStart(){
 // One owner only: SharedClientControllerV224 starts a round after its own
 // successful BET reservation and stable-connection checks.
 scheduleServerBetClock(0);return false;
}`,
 'disable duplicate core start');
 source=once(source,
` if(round.phase==='BETTING'){
  const ms=Math.max(0,Number(round.betClosesAt||0)-serverNow());`,
` if(round.phase==='BETTING'){
  const registration=window.SweetsSharedControllerV224?.betStatus?.(round);
  if(registration){countdownText(registration.text,registration.label);scheduleServerBetClock(100);return;}
  const ms=Math.max(0,Number(round.betClosesAt||0)-serverNow());`,
 'show actual BET registration state');
 source=once(source,
 "  if(message.type==='visual_frame'){if(current&&message.roundId===current.roundId)showRouletteMirror(message.image);return;}",
 "  if(message.type==='visual_frame'){hideRouletteMirror();return;}",
 'disable first-hit JPEG freeze overlay');
 source=source.replaceAll('[SharedMachineV221]','[SharedMachineV224]');
 source=source.replace("const VERSION='v221';","const VERSION='v224';");
 return source;
}
window.SweetsSharedCorePatchV224={patch};
})();


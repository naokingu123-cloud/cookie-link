(()=>{
'use strict';
if(window.SweetsSharedCorePatchV216)return;
function once(source,from,to,label){
 const count=source.split(from).length-1;
 if(count!==1)throw new Error(`[SharedCorePatchV217] ${label} matches=${count}`);
 return source.replace(from,to);
}
function patch(source){
 source=once(source,
  "  if(!explicitResume&&(round.phase!=='PLAYING'||startPermitId!==round.id))throw Error('server start not permitted');",
  "  if(!explicitResume&&round.phase!=='PLAYING')throw Error('server round not playing');",
  'remove transient start permit gate');
 source=once(source,
` syncReady(){
  if(SERVER_HOST)return;
  window.__sweetsSharedClientReady=!!this.online;
  try{if(typeof syncDebugButtons==='function')syncDebugButtons();if(typeof scheduleAutoRound==='function'&&app?.phase==='ready')scheduleAutoRound();}catch{}
 }`,
` syncReady(){
  if(SERVER_HOST)return;
  window.__sweetsSharedClientReady=!!this.online;
  try{
   if(typeof syncDebugButtons==='function')syncDebugButtons();
   if(typeof stopAutoRound==='function')stopAutoRound();
   if(typeof autoRoundStamp!=='undefined')autoRoundStamp=null;
  }catch{}
 }`,
  'disable client local auto scheduler');
 source=once(source,
  " Object.defineProperty(rouletteDrawSource,'ready',{configurable:true,get:()=>!!(client.online&&(!!resumeId||!!(startPermitId&&client.round?.id===startPermitId&&client.round?.phase==='PLAYING'&&client.round?.participant)))});",
  " Object.defineProperty(rouletteDrawSource,'ready',{configurable:true,get:()=>!!(client.online&&(!!resumeId||!!(client.round?.phase==='PLAYING'&&client.round?.participant?.playerId)))});",
  'derive readiness from authoritative participant');
 source=once(source,
`async function refreshAndMaybeStart(){
 if(!client.online)return;
 try{
  const data=await client.getState();client.accept(data);
  if(data.pendingRound?.participant&&!data.pendingRound.participant.settlement&&app?.phase==='ready'){recovery(data.pendingRound);return;}
  const round=data.round;
  if(round?.phase==='PLAYING'&&round.participant&&app?.phase==='ready'){
   app.bets=[...(round.participant.bets||app.bets||[])];app.enabled=[...(round.participant.enabled||app.enabled||[])];
   startPermitId=round.id;client.syncReady();
   try{if(typeof startReadyRound==='function')startReadyRound();else app.start();}catch(error){console.warn('[SharedMachineV204] server start',error);}
  }
 }catch(error){console.warn('[SharedMachineV204] state refresh',error?.message||error);}
 scheduleServerBetClock(0);
}`,
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
   try{app.start();}catch(error){console.warn('[SharedMachineV217] server start',error);}
  }
 }catch(error){console.warn('[SharedMachineV217] state refresh',error?.message||error);}
 scheduleServerBetClock(0);
}`,
  'authoritative direct start');
 source=once(source,
`    else{
     const candidate=state.pendingRound||(state.round?.participant&&state.round.phase==='PLAYING'?state.round:null);
     if(candidate&&app?.phase==='ready')recovery(candidate);
     scheduleServerBetClock(0);
    }`,
`    else{
     if(state.round?.participant?.playerId&&state.round.phase==='PLAYING'&&app?.phase==='ready')refreshAndMaybeStart();
     scheduleServerBetClock(0);
    }`,
  'disable pending-round client replay');
 source=once(source,
` client.ready.then(ok=>{
  if(ok){
   if(barrier){barrier.installed=true;barrier.pending=null;}
   const candidate=client.pendingRound||(client.round?.participant&&client.round.phase==='PLAYING'?client.round:null);
   if(candidate&&app?.phase==='ready')recovery(candidate);
   else if(client.round?.phase==='PLAYING'&&client.round.participant)refreshAndMaybeStart();
   scheduleServerBetClock(0);
  }
  client.syncReady();
 })`,
` client.ready.then(ok=>{
  if(ok){
   if(barrier){barrier.installed=true;barrier.pending=null;}
   if(client.round?.phase==='PLAYING'&&client.round.participant?.playerId&&app?.phase==='ready')refreshAndMaybeStart();
   scheduleServerBetClock(0);
  }
  client.syncReady();
 })`,
  'disable startup pending-round replay');
 source=once(source,
  "   if(existing.length){hostRoundId=round.id;hostIndex=existing.length;client.send({type:'host_fallback_request',roundId:round.id});stopHost('SERVER FALLBACKへ移行 '+hostIndex+' / 8');return;}",
  "   if(existing.length){hostRoundId=round.id;hostIndex=existing.length;stopHost('実抽選機の継続待機 '+hostIndex+' / 8');return;}",
  'never convert a partially physical round into random fallback');
 source=once(source,
  "nativeStart({onNumber:reportPhysical,onError:message=>{client.send({type:'host_fallback_request',roundId:round.id});stopHost(message||'抽選機エラー');}});",
  "nativeStart({onNumber:reportPhysical,onError:message=>{stopHost(message||'抽選機エラー');}});",
  'physical draw errors must stop instead of generating random balls');
 source=once(source,
  "catch(error){console.error('[SharedMachineV204] physical host start',error);hostRunning=false;client.send({type:'host_fallback_request',roundId:round.id});}",
  "catch(error){console.error('[SharedMachineV217] physical host start',error);hostRunning=false;stopHost('抽選機起動エラー');}",
  'physical host startup failure must not request random fallback');
 source=source.replaceAll('[SharedMachineV204]','[SharedMachineV217]');
 source=source.replace("const VERSION='v204';","const VERSION='v217';");
 return source;
}
window.SweetsSharedCorePatchV216={patch};
})();

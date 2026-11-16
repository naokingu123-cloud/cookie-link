(()=>{
'use strict';
if(window.SweetsSharedCorePatchV221)return;
function once(source,from,to,label){
 const count=source.split(from).length-1;
 if(count!==1)throw new Error(`[SharedCorePatchV221] ${label} matches=${count}`);
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
   try{app.start();}catch(error){console.warn('[SharedMachineV221] server start',error);}
  }
 }catch(error){console.warn('[SharedMachineV221] state refresh',error?.message||error);}
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
  "  let hostRoundId=null,hostIndex=0,hostRunning=false,reportChain=Promise.resolve(),hostRetryTimer=0,mirrorTimer=0,mirrorCanvas=null,mirrorCtx=null,mirrorEncoding=false;",
  "  let hostRoundId=null,hostIndex=0,hostRunning=false,hostProgressAt=0,hostAttempt=0,hostReportsPending=0,hostMotionKey='',hostMotionAt=0,hostWakeAt=0,reportChain=Promise.resolve(),hostRetryTimer=0,mirrorTimer=0,mirrorCanvas=null,mirrorCtx=null,mirrorEncoding=false;",
  'physical host watchdog state');
 source=once(source,
  "  function hostPresentation(){",
`  function hostMotionState(){
   try{
    const driver=rouletteDriver,physics=driver?.physics,draw=driver?.draw;
    if(!physics||!draw)return null;
    // The rotor keeps ticking after a completed draw. Count simulation time
    // only while the physical attempt is running; a completed partial attempt
    // is handled after its result queue has drained.
    return JSON.stringify([draw.state,draw.state==='running'?Number(physics.time)||0:0,Number(physics.serial)||0,Number(physics.active)||0,physics.hits?.length||0,Number(physics.faults)||0,Number(draw.group)||0,Number(draw.sent)||0]);
   }catch{return null;}
  }
  function hostMotionStalled(){
   const now=Date.now(),key=hostMotionState();
   if(hostReportsPending>0||(document.hidden&&!window.SweetsHostKeepAliveV206?.capturePumpActive)){hostMotionKey=key;hostMotionAt=now;hostWakeAt=0;return false;}
   if(key!==hostMotionKey){hostMotionKey=key;hostMotionAt=now;hostWakeAt=0;}
   if(!hostMotionAt)hostMotionAt=now;
   const idle=now-hostMotionAt;
   // A healthy frame loop must not be cancelled and have its accumulated
   // physics time cleared on every network snapshot or 500ms watchdog tick.
   if(idle>=2500&&!hostWakeAt){hostWakeAt=now;try{rouletteDriver?.setPaused(false);}catch{}}
   return idle>=60000&&hostWakeAt>0&&now-hostWakeAt>=10000;
  }
  function hostPresentation(){`,
  'observe physical progress without resetting the render clock');
 source=once(source,
  "    if(typeof inView!=='undefined')inView=false;",
  "    if(typeof inView!=='undefined')inView=true;",
  'keep physical roulette in view');
 source=once(source,
`  function reportPhysical(number){
   const roundId=hostRoundId;
   reportChain=reportChain.then(async()=>{
    if(!hostRunning||roundId!==hostRoundId)return;
    const index=hostIndex+1;
    const data=await client.report({roundId,ballIndex:index,number:Number(number),eventId:roundId+':'+index});
    hostIndex=Number(data.ball?.index)||index;
    hostBanner(hostIndex+' / 8球 · '+number+' HIT');
    setTimeout(()=>captureMirrorFrame(true),120);
    if(hostIndex>=8){hostRunning=false;stopMirrorCapture();status('8球の実抽選が終了しました','SERVER ROULETTE');hostBanner('8 / 8 COMPLETE');}
   }).catch(error=>{
    console.error('[SharedMachineV204] physical host report',error);
    stopHost('送信エラー · 抽選停止');
   });
  }`,
`  function reportPhysical(number){
   const roundId=hostRoundId,attempt=hostAttempt;hostProgressAt=Date.now();hostReportsPending++;
   const current=()=>hostRunning&&roundId===hostRoundId&&attempt===hostAttempt;
   reportChain=reportChain.catch(()=>{}).then(async()=>{
    while(current()){
    let state=null;
    try{state=await client.getState();if(client.accept(state)===false)state=null;}catch{}
    if(!current())return;
    const round=state?.round||client.round;
    if(!round||round.id!==roundId||round.phase!=='PLAYING')return;
    const existing=[...(round.balls||[])],value=Number(number);hostIndex=existing.length;
    if(existing.some(ball=>Number(ball.number)===value)){
     hostProgressAt=Date.now();hostBanner(hostIndex+' / 8球 · '+value+' 重複再抽選');
     return;
    }
    const index=hostIndex+1;
    try{
     const data=await client.report({roundId,ballIndex:index,number:value,eventId:roundId+':'+index+':'+hostAttempt});
     if(roundId!==hostRoundId||attempt!==hostAttempt)return;
     hostIndex=Number(data.ball?.index)||index;hostProgressAt=Date.now();
     hostBanner(hostIndex+' / 8球 · '+value+' HIT');
     setTimeout(()=>captureMirrorFrame(true),120);
     if(hostIndex>=8){hostRunning=false;clearTimeout(hostRetryTimer);hostRetryTimer=0;stopMirrorCapture();status('8球の実抽選が終了しました','SERVER ROULETTE');hostBanner('8 / 8 COMPLETE');}
     return;
    }catch(error){
     if(!current())return;
     const code=String(error?.data?.error||error?.message||'');
     console.error('[SharedMachineV221] physical host report',code,error);
     hostBanner('入賞結果を保持・再送待ち · '+hostIndex+' / 8');
     await wait(Math.max(1000,Number(error?.retryAfterMs)||0,Number(error?.data?.retryAfterMs)||0,Number(client.httpRetryAt||0)-Date.now()));
    }
    }
   }).finally(()=>{hostReportsPending=Math.max(0,hostReportsPending-1);});
  }`,
  'physical result progress and retry');
 source=once(source,
  "   if(round.phase!=='PLAYING'||Number(round.participantCount||0)<1){hostRunning=false;hostBanner('player wait');return;}",
  "   if(round.phase!=='PLAYING'){hostRunning=false;hostBanner('SERVER CLOCK WAIT');return;}",
  'physical host must draw empty authoritative rounds');
 source=once(source,
  "   if(hostRoundId===round.id&&hostRunning)return;",
`   if(hostRoundId===round.id&&hostRunning){
    const currentCount=(round.balls||[]).length;
    if(currentCount>hostIndex){hostIndex=currentCount;hostProgressAt=Date.now();}
    try{if(typeof inView!=='undefined')inView=true;}catch{}
    const finishedAttempt=(!document.hidden||window.SweetsHostKeepAliveV206?.capturePumpActive)&&hostReportsPending===0&&rouletteDriver?.draw?.state==='complete'&&hostIndex<8;
    if(!finishedAttempt&&!hostMotionStalled()){hostBanner(hostIndex+' / 8球 · DRAWING');hostRetryTimer=setTimeout(()=>syncHost(client.round),500);return;}
    hostRunning=false;hostAttempt++;
    hostBanner((finishedAttempt?'残りの物理抽選を継続 ':'物理進行の停止を検知・再起動 ')+hostIndex+' / 8');
   }`,
  'restart a stalled physical draw');
 source=once(source,
  "   if(existing.length){hostRoundId=round.id;hostIndex=existing.length;client.send({type:'host_fallback_request',roundId:round.id});stopHost('SERVER FALLBACKへ移行 '+hostIndex+' / 8');return;}",
  "   if(existing.length){hostRoundId=round.id;hostIndex=existing.length;if(existing.length>=8){hostRunning=false;hostBanner('8 / 8 COMPLETE');return;}hostRunning=false;hostBanner('物理抽選を再開 '+hostIndex+' / 8');}",
  'resume partial physical round without fallback');
 source=once(source,
  "   hostRoundId=round.id;hostIndex=0;hostRunning=true;reportChain=Promise.resolve();",
  "   hostRoundId=round.id;hostIndex=existing.length;hostRunning=true;hostProgressAt=Date.now();hostMotionKey='';hostMotionAt=Date.now();hostWakeAt=0;hostAttempt++;reportChain=Promise.resolve();",
  'start or resume physical progress');
 source=once(source,
  "nativeStart({onNumber:reportPhysical,onError:message=>{client.send({type:'host_fallback_request',roundId:round.id});stopHost(message||'抽選機エラー');}});",
  "nativeStart({onNumber:reportPhysical,onError:message=>{console.error('[SharedMachineV221] physical draw error',message);hostRunning=false;hostBanner((message||'抽選機エラー')+' · 再起動');clearTimeout(hostRetryTimer);hostRetryTimer=setTimeout(()=>syncHost(client.round),900);}});",
  'physical draw errors retry without random fallback');
 source=once(source,
  "status('現行3D抽選機で8球を実抽選中','SERVER ROULETTE');hostBanner('0 / 8 · DRAWING');}",
  "status('現行3D抽選機で8球を実抽選中','SERVER ROULETTE');hostBanner(hostIndex+' / 8 · DRAWING');hostRetryTimer=setTimeout(()=>syncHost(client.round),500);}",
  'schedule physical progress watchdog');
 source=once(source,
  "catch(error){console.error('[SharedMachineV204] physical host start',error);hostRunning=false;client.send({type:'host_fallback_request',roundId:round.id});}",
  "catch(error){console.error('[SharedMachineV221] physical host start',error);hostRunning=false;hostBanner('抽選機起動エラー · 再試行');clearTimeout(hostRetryTimer);hostRetryTimer=setTimeout(()=>syncHost(client.round),900);}",
  'physical host startup retry');
 source=source.replaceAll('[SharedMachineV204]','[SharedMachineV221]');
 source=source.replace("const VERSION='v204';","const VERSION='v221';");
 return source;
}
window.SweetsSharedCorePatchV221={patch};
})();


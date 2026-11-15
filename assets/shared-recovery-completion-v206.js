(()=>{
'use strict';
if(window.__sweetsRecoveryCompletionV206)return;
window.__sweetsRecoveryCompletionV206=true;
if(new URLSearchParams(location.search).get('serverHost')==='1')return;

function install(){
 if(typeof app==='undefined'||!app||typeof medalWin!=='function'){setTimeout(install,80);return;}
 let watchedRoundId='',recoveryStartedAt=0,lastProgressAt=0,lastSignature='';

 function activeRound(shared){
  const active=shared?.active,client=shared?.client;
  if(!active||!client)return null;
  for(const round of [client.pendingRound,client.round])if(round?.id===active.roundId)return round;
  return null;
 }
 function recoveryPresentation(){
  return (app.engines||[]).some((engine,index)=>app.enabled?.[index]!==false&&Number(engine?.presentationRate)>=50);
 }
 function queueSize(engine){
  const queue=engine?.queue;
  if(Array.isArray(queue))return queue.length;
  if(queue&&Number.isFinite(Number(queue.size)))return Number(queue.size);
  return 0;
 }
 function signature(){
  return [
   app.phase,app.draws?.length||0,
   ...(app.engines||[]).map((engine,index)=>app.enabled?.[index]===false?'x':[
    Number(engine?.processed)||0,Number(engine?.accepted)||0,queueSize(engine),engine?.busy?1:0,app.paid?.[index]?1:0
   ].join('/'))
  ].join('|');
 }
 function markRecoveredComplete(round){
  const checkpoint=round?.participant?.checkpoint||{};
  const savedEngines=Array.isArray(checkpoint.engines)?checkpoint.engines:[];
  const enabled=app.enabled||[];
  let changed=false;
  for(let index=0;index<enabled.length;index++){
   if(!enabled[index]||app.paid?.[index])continue;
   const engine=app.engines?.[index],saved=savedEngines[index]||{};
   const processed=Math.max(Number(engine?.processed)||0,Number(saved?.processed)||0);
   const savedPaid=checkpoint.paid?.[index]===true;
   if(processed<8&&!savedPaid)continue;
   app.paid[index]=true;
   if(savedPaid&&Number.isFinite(Number(checkpoint.roundWins?.[index])))app.roundWins[index]=Number(checkpoint.roundWins[index]);
   else app.roundWins[index]=medalWin(Number(app.locked?.[index])||0,Number(engine?.totalHundredths??saved?.totalHundredths)||0);
   try{engine.busy=false;engine.running=false;}catch{}
   changed=true;
  }
  const complete=enabled.some(Boolean)&&enabled.every((yes,index)=>!yes||app.paid?.[index]);
  if(!complete)return false;
  app.dealing=false;app.fastForward=false;
  for(const engine of app.engines||[])engine.presentationRate=1;
  try{typeof countdownText==='function'&&countdownText('RESULT','切断中ラウンドの復元完了');}catch{}
  app.finishRound();
  try{app.onChange?.(app);}catch{}
  console.info('[RecoveryCompletion206] completed recovered 8-ball round',round.id,{changed});
  return app.phase!=='playing';
 }
 function restartStrandedQueues(){
  let restarted=false;
  for(let index=0;index<(app.engines||[]).length;index++){
   if(app.enabled?.[index]===false)continue;
   const engine=app.engines[index];
   if(!engine||Number(engine.processed)>=8||queueSize(engine)<1||typeof engine.drain!=='function')continue;
   try{
    engine.paused=false;engine.running=true;engine.busy=false;
    Promise.resolve(engine.drain()).catch(error=>console.warn('[RecoveryCompletion206] engine resume',error));
    restarted=true;
   }catch(error){console.warn('[RecoveryCompletion206] engine resume',error);}
  }
  return restarted;
 }
 function resetWatch(){watchedRoundId='';recoveryStartedAt=0;lastProgressAt=0;lastSignature='';}
 function tick(){
  const shared=window.SweetsSharedMachine,round=activeRound(shared);
  if(!round||round.phase!=='COMPLETE'||app.phase!=='playing'||!recoveryPresentation()){
   if(app.phase!=='playing')resetWatch();
   return;
  }
  const now=Date.now();
  if(watchedRoundId!==round.id){watchedRoundId=round.id;recoveryStartedAt=now;lastProgressAt=now;lastSignature='';}
  try{app.paused=false;for(const engine of app.engines||[])engine.paused=false;}catch{}
  const nextSignature=signature();
  if(nextSignature!==lastSignature){lastSignature=nextSignature;lastProgressAt=now;}
  if((app.draws?.length||0)<8)return;
  // Give a live recovery callback a brief chance to complete normally first.
  if(now-recoveryStartedAt>=650&&markRecoveredComplete(round)){resetWatch();return;}
  // A restored engine can retain busy=true although its old async drain task no
  // longer exists after reload. Restart only a queued, non-final engine.
  if(now-lastProgressAt>=900&&restartStrandedQueues()){lastProgressAt=now;lastSignature=signature();}
 }
 setInterval(tick,120);
 console.info('[RecoveryCompletion206] recovered round result finalizer enabled');
}
install();
})();

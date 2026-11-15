(()=>{
'use strict';
if(window.__sweetsRecoveryReplayInstalledV207)return;
window.__sweetsRecoveryReplayInstalledV207=true;
if(new URLSearchParams(location.search).get('serverHost')==='1')return;

function install(){
 const shared=window.SweetsSharedMachine,client=shared?.client;
 if(!client||typeof client.getState!=='function'){setTimeout(install,60);return;}
 if(client.getState.__sweetsRecoveryReplayV207)return;
 const nativeGetState=client.getState.bind(client);

 function canReplay(round){
  const participant=round?.participant;
  return !!round&&round.phase==='COMPLETE'&&Array.isArray(round.balls)&&round.balls.length>=8&&
   !!participant&&!participant.settlement&&participant.initialState&&typeof participant.initialState==='object';
 }
 function rewritePending(data){
  const round=data?.pendingRound;
  if(!canReplay(round))return data;
  const active=window.SweetsSharedMachine?.active;
  if(active?.roundId===round.id)return data;
  const participant=round.participant;
  // A checkpoint taken while the eighth-ball animation is running can contain
  // busy=true after the queue item was already removed. The old Promise cannot
  // survive a page close, so restoring that transient snapshot waits forever.
  // Replace only the local recovery response with the stable zero-ball snapshot;
  // the authoritative eight server balls are then delivered again at catch-up speed.
  data.pendingRound={
   ...round,
   participant:{...participant,checkpoint:participant.initialState,checkpointBall:0}
  };
  window.__sweetsRecoveryReplayV207={
   roundId:round.id,
   armedAt:Date.now(),
   serverBallCount:round.balls.length,
   replacedCheckpointBall:Number(participant.checkpointBall)||0
  };
  console.info('[RecoveryReplay207] replaying completed round from stable initial state',round.id,
   {serverBalls:round.balls.length,replacedCheckpointBall:Number(participant.checkpointBall)||0});
  return data;
 }
 async function patchedGetState(...args){
  return rewritePending(await nativeGetState(...args));
 }
 Object.defineProperty(patchedGetState,'__sweetsRecoveryReplayV207',{value:true});
 client.getState=patchedGetState;
 console.info('[RecoveryReplay207] stable completed-round replay guard enabled');
}
install();
})();

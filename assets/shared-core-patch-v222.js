(()=>{
'use strict';
if(window.SweetsSharedCorePatchV222)return;
function once(source,from,to,label){
 const count=source.split(from).length-1;
 if(count!==1)throw new Error(`[SharedCorePatchV222] ${label} matches=${count}`);
 return source.replace(from,to);
}
function patch(source){
 if(!window.SweetsSharedCorePatchV221?.patch)throw Error('v221 base patch missing');
 source=window.SweetsSharedCorePatchV221.patch(source);
 source=once(source,
`function queueBall(ball,catchup=false){
 if(!current||!ball||Number(ball.index)<=current.delivered)return;
 current.queue.set(Number(ball.index),{index:Number(ball.index),number:Number(ball.number),catchup});drain();
}`,
`function queueBall(ball,catchup=false){
 if(!current||!ball||Number(ball.index)<=current.delivered)return;
 current.queue.set(Number(ball.index),{index:Number(ball.index),number:Number(ball.number),catchup});drain();
}
function syncAuthoritativeRound(round){
 if(!current||!round||String(round.id||'')!==String(current.roundId||''))return false;
 if(round.participant?.playerId)current.participant={...(current.participant||{}),...round.participant};
 const balls=[...(round.balls||[])].sort((a,b)=>Number(a.index)-Number(b.index));
 for(const ball of balls)if(Number(ball.index)>Number(current.delivered||0))queueBall(ball,true);
 if(round.phase==='COMPLETE'&&balls.length>=8)saveLater(8);
 return true;
}`,
 'authoritative catch-up helper');
 source=once(source,
` client.on(message=>{
  if(message.type==='visual_frame'){if(current&&message.roundId===current.roundId)showRouletteMirror(message.image);return;}`,
` client.on(message=>{
  if(message.type==='snapshot'){syncAuthoritativeRound(message.round);syncAuthoritativeRound(message.pendingRound);}
  // The continuous WebRTC/relay receiver owns roulette video. The retired
  // JPEG mirror froze on the first HIT and could hide the live stream.
  if(message.type==='visual_frame'){hideRouletteMirror();return;}`,
 'disable legacy static mirror and sync snapshots');
 source=once(source,
`   client.getState().then(state=>{
    client.accept(state);
    if(message.type==='round_started')refreshAndMaybeStart();`,
`   client.getState().then(state=>{
    client.accept(state);syncAuthoritativeRound(state.round);syncAuthoritativeRound(state.pendingRound);
    if(message.type==='round_started')refreshAndMaybeStart();`,
 'sync authoritative history after event refresh');
 source=once(source,
` window.SweetsSharedMachine={version:VERSION,serverHost:false,client,get online(){return client.online;},get role(){return client.role;},get active(){return current;},state:()=>client.getState()};`,
` window.SweetsSharedMachine={version:VERSION,serverHost:false,client,get online(){return client.online;},get role(){return client.role;},get active(){return current;},syncRound:syncAuthoritativeRound,state:()=>client.getState()};`,
 'expose reconnect synchronizer');
 source=source.replaceAll('[SharedMachineV221]','[SharedMachineV222]');
 source=source.replace("const VERSION='v221';","const VERSION='v222';");
 return source;
}
window.SweetsSharedCorePatchV222={patch};
})();

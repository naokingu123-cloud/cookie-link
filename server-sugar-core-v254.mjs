/* Hooks into the authoritative physical clock after the established patch
 * contracts. Sugar never supplies a number to that clock. */
export function patchSugarCoreV254(source){
 const once=(from,to,label)=>{const n=source.split(from).length-1;if(n!==1)throw Error('[SugarCoreV254] '+label+' matches='+n);source=source.replace(from,to);};
 once('function createBettingRound(m,forcedFromRoundId=null){',`function publishSugarV254(m){
 const shared=payoutWallet?.sugarReaches?.(m.id,m.round?.id)||[];
 for(const [playerId,set] of socketMap(m.id)){
  const isHost=playerId===m.hostPlayerId;
  const packet={type:'sugar_challenge_v254',serverTime:now(),roundId:m.round?.id||null,sugarReachesV254:shared};
  if(!isHost){packet.sugarV254=payoutWallet?.sugarState?.(m.id,playerId)||null;packet.payoutControlV3=payoutWallet?.publicControl?.(m.id,playerId)||null;}
  for(const ws of set)if(ws.readyState===WebSocket.OPEN)try{ws.send(JSON.stringify(packet));}catch{}
 }
}
function createBettingRound(m,forcedFromRoundId=null){`,'private sugar state publisher');
 once(" m.round=round;m.revision++;m.updatedAt=t;scheduleSave();broadcast(m.id,{type:'betting_started',round:publicRound(round,null)});", " m.round=round;payoutWallet?.sugarBetting?.(m,round);m.revision++;m.updatedAt=t;scheduleSave();broadcast(m.id,{type:'betting_started',round:publicRound(round,null)});publishSugarV254(m);",'next BET activation');
 once(" round.balls.push(ball);round.lastBallAt=landedAt;thinkingV251.onBall(round,ball);m.revision++;m.updatedAt=landedAt;", " round.balls.push(ball);round.lastBallAt=landedAt;thinkingV251.onBall(round,ball);m.revision++;m.updatedAt=landedAt;payoutWallet?.sugarBall?.(m,round);",'authoritative shared balls');
 once(" if(index>=BALLS_PER_ROUND)finishRound(m,round,landedAt);", " if(index>=BALLS_PER_ROUND)finishRound(m,round,landedAt);publishSugarV254(m);",'publish updated reach and entitlement');
 once("operatorRefundsV242:payoutWallet?.operatorNotices?.(m.id,playerId)||[]};", "operatorRefundsV242:payoutWallet?.operatorNotices?.(m.id,playerId)||[],sugarV254:isHost?null:payoutWallet?.sugarState?.(m.id,playerId)||null,sugarReachesV254:payoutWallet?.sugarReaches?.(m.id,m.round?.id)||[]};",'reconnect snapshot');
 return source;
}

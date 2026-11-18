// Server-owned 5 + thinking + 3 scheduling. This module never draws a number.
export function isStaleCheckpointV251(ball,state,previousBall,previousState){
 const incoming=Math.max(0,Number(ball)||0),previous=Math.max(0,Number(previousBall)||0);
 if(incoming!==previous)return incoming<previous;
 const previousAt=Number(previousState?.savedAt),incomingAt=Number(state?.savedAt);
 // Older clients already include savedAt. If both are absent, retain their
 // legacy behavior; a timestamped checkpoint cannot be replaced by no stamp.
 return Number.isFinite(previousAt)&&previousAt>0&&(!Number.isFinite(incomingAt)||incomingAt<=previousAt);
}

export function createThinkingServiceV251({now=Date.now,scheduleSave=()=>{},broadcast=()=>{},publicRound=()=>null,durationMs=15000}={}){
 const duration=Math.max(50,Number(durationMs)||15000);
 function normalize(round){
  if(!round)return round;
  round.thinkingEnabled=round.thinkingEnabled===true;
  round.thinkingAfterBall=5;
  round.thinkingDurationMs=round.thinkingEnabled?Math.max(50,Number(round.thinkingDurationMs)||duration):0;
  for(const key of ['thinkingStartedAt','thinkingClosesAt','thinkingEndedAt'])round[key]=Math.max(0,Number(round[key])||0);
  // A persisted fifth result owns the same deadline after restart. Never open
  // another placement window or replace the already accepted draw sequence.
  if(round.thinkingEnabled&&round.balls?.length>=5&&!round.thinkingClosesAt){
   const landed=Number(round.balls[4]?.landedAt)||Number(round.lastBallAt)||now();
   round.thinkingStartedAt=landed;round.thinkingClosesAt=landed+round.thinkingDurationMs;
  }
  return round;
 }
 function publicState(round){
  return {thinkingEnabled:round?.thinkingEnabled===true,thinkingAfterBall:5,
   thinkingDurationMs:round?.thinkingEnabled?Number(round.thinkingDurationMs)||duration:0,
   thinkingStartedAt:Number(round?.thinkingStartedAt)||null,
   thinkingClosesAt:Number(round?.thinkingClosesAt)||null,
   thinkingEndedAt:Number(round?.thinkingEndedAt)||null};
 }
 function noteParticipant(participant,input){
  const rows=Array.isArray(input?.payoutV3Bet?.games)?input.payoutV3Bet.games:[];
  participant.dangoBetV251=rows.filter(row=>String(row?.id||row?.kind)==='dango').reduce((sum,row)=>sum+Math.max(0,Number(row.bet)||0),0);
 }
 function startRound(round){
  round.thinkingEnabled=Object.values(round.participants||{}).some(p=>Number(p.totalBet)>0&&Number(p.dangoBetV251)>0);
  round.thinkingDurationMs=round.thinkingEnabled?duration:0;
  round.thinkingStartedAt=0;round.thinkingClosesAt=0;round.thinkingEndedAt=0;round.thinkingAfterBall=5;
 }
 function onBall(round,ball){
  if(!round.thinkingEnabled||Number(ball.index)!==5||round.thinkingClosesAt)return false;
  round.thinkingStartedAt=Number(ball.landedAt)||now();
  round.thinkingClosesAt=round.thinkingStartedAt+round.thinkingDurationMs;
  round.thinkingEndedAt=0;return true;
 }
 function afterBroadcast(m,round,ball){
  if(round.thinkingEnabled&&Number(ball.index)===5)broadcast(m.id,{type:'thinking_started',roundId:round.id,round:publicRound(round,null)});
 }
 function active(round,at=now()){
  return !!(round?.thinkingEnabled&&round.phase==='PLAYING'&&round.balls?.length===5&&Number(round.thinkingClosesAt)>at);
 }
 function tick(m,round,at=now()){
  if(!round?.thinkingEnabled||round.balls?.length<5||round.phase!=='PLAYING')return false;
  normalize(round);
  if(active(round,at))return true;
  if(!round.thinkingEndedAt){
   round.thinkingEndedAt=Number(round.thinkingClosesAt)||at;m.revision++;m.updatedAt=at;scheduleSave();
   broadcast(m.id,{type:'thinking_complete',roundId:round.id,round:publicRound(round,null)});
  }
  return false;
 }
 return {normalize,publicState,noteParticipant,startRound,onBall,afterBroadcast,active,tick};
}

export function patchThinkingCoreV251(source){
 function once(from,to,label){const count=source.split(from).length-1;if(count!==1)throw Error(`[ThinkingV251] ${label} matches=${count}`);source=source.replace(from,to);}
 once('await loadDb();',isStaleCheckpointV251.toString()+'\n'+createThinkingServiceV251.toString()+"\nconst thinkingV251=createThinkingServiceV251({now,scheduleSave,broadcast,publicRound,durationMs:Number(process.env.SWEETS_DANGO_THINKING_MS)||15000});\nawait loadDb();",'service');
 once(' round.nextFallbackBallAt=Number(round.nextFallbackBallAt)||0;',' round.nextFallbackBallAt=Number(round.nextFallbackBallAt)||0;\n thinkingV251.normalize(round);','persisted deadline');
 once("  id:round.id,sequence:round.sequence,phase:round.phase,cancelled:!!round.cancelledV242,forcedFromRoundId:round.forcedFromRoundId||null,balls:[...(round.balls||[])],","  id:round.id,sequence:round.sequence,phase:round.phase,cancelled:!!round.cancelledV242,forcedFromRoundId:round.forcedFromRoundId||null,balls:[...(round.balls||[])],...thinkingV251.publicState(round),",'public deadline');
 once('  participant.totalBet=total;participant.creditAfterBet=reservation?reservation.creditAfterBet:Number(input.creditAfterBet)||0;participant.appVersion=safeText(input.appVersion,80);','  participant.totalBet=total;participant.creditAfterBet=reservation?reservation.creditAfterBet:Number(input.creditAfterBet)||0;participant.appVersion=safeText(input.appVersion,80);\n  thinkingV251.noteParticipant(participant,input);','Dango reservation metadata');
 once("  round.phase='PLAYING';round.startedAt=t;round.drawStartsAt=t+ROUND_START_DELAY_MS;round.hostPlayerId=m.hostPlayerId||null;","  round.phase='PLAYING';round.startedAt=t;round.drawStartsAt=t+ROUND_START_DELAY_MS;round.hostPlayerId=m.hostPlayerId||null;\n  thinkingV251.startRound(round);",'freeze round eligibility');
 once(' round.balls.push(ball);round.lastBallAt=landedAt;m.revision++;m.updatedAt=landedAt;',' round.balls.push(ball);round.lastBallAt=landedAt;thinkingV251.onBall(round,ball);m.revision++;m.updatedAt=landedAt;','fifth result starts window');
 once(" scheduleSave();broadcast(m.id,{type:'ball_result',roundId:round.id,ball,phase:index>=BALLS_PER_ROUND?'COMPLETE':round.phase});"," scheduleSave();broadcast(m.id,{type:'ball_result',roundId:round.id,ball,phase:index>=BALLS_PER_ROUND?'COMPLETE':round.phase,...(index===5&&round.thinkingEnabled?{round:publicRound(round,null)}:{})});\n thinkingV251.afterBroadcast(m,round,ball);",'ordered thinking notification');
 once('  if(t<Number(round.drawStartsAt||round.startedAt||0))return;','  if(t<Number(round.drawStartsAt||round.startedAt||0))return;\n  if(thinkingV251.tick(m,round,t))return;','clock and legacy fallback gate');
 once("  if(index!==round.balls.length+1)return reply(res,409,{ok:false,error:'ball_out_of_order',expected:round.balls.length+1});","  if(index!==round.balls.length+1)return reply(res,409,{ok:false,error:'ball_out_of_order',expected:round.balls.length+1});\n  if(index===6&&thinkingV251.active(round))return reply(res,409,{ok:false,error:'thinking_active',retryAfterMs:Math.max(1,round.thinkingClosesAt-now()),...snapshot(m,player.id)});\n  if(index===6)thinkingV251.tick(m,round);",'reject early sixth result');
 once('  return reply(res,200,{ok:true,idempotent:false,ball,phase:round.phase});','  return reply(res,200,{ok:true,idempotent:false,ball,phase:round.phase,...(index===5&&round.thinkingEnabled?{round:publicRound(round,player.id),serverTime:now()}:{})});','host deadline acknowledgement');
 once('  if(ballIndex>=Number(participant.checkpointBall||0)&&input.state){','  const checkpointIgnoredV251=isStaleCheckpointV251(ballIndex,input.state,participant.checkpointBall,participant.checkpoint);\n  if(!checkpointIgnoredV251&&input.state){','checkpoint ordering');
 once('  return reply(res,200,{ok:true,checkpointBall:participant.checkpointBall});','  if(input.dangoPlacementV251===true&&ballIndex===5)await flushDb();\n  return reply(res,200,{ok:true,checkpointBall:participant.checkpointBall,...(checkpointIgnoredV251?{checkpointIgnoredV251:true}:{})});','durable manual-placement checkpoint');
 once('   betOpenedAt:round.betOpenedAt||null,betClosesAt:round.betClosesAt||null,drawStartsAt:round.drawStartsAt||null,startedAt:round.startedAt||null,','   betOpenedAt:round.betOpenedAt||null,betClosesAt:round.betClosesAt||null,drawStartsAt:round.drawStartsAt||null,startedAt:round.startedAt||null,...thinkingV251.publicState(round),','admin deadline');
 return source;
}

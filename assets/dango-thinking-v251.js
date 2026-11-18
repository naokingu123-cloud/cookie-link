(()=>{
'use strict';
if(window.SweetsDangoThinkingV251)return;
const EVENT='sweets-dango-thinking-v251';
let lastSignature='',boundClient=null,pollTimer=0,finishingRound='',retryAt=0;
const finalized=new Set();
function state(){
 const shared=window.SweetsSharedMachine,client=shared?.client,round=client?.round;
 const serverNow=Date.now()+(Number(client?.clockOffset)||0),closesAt=Number(round?.thinkingClosesAt)||0;
 const enabled=round?.thinkingEnabled===true&&round?.phase==='PLAYING';
 const ballCount=round?.balls?.length||0,remainingMs=enabled&&ballCount===5&&closesAt?Math.max(0,closesAt-serverNow):0;
 return {roundId:String(round?.id||''),enabled,active:enabled&&ballCount===5&&remainingMs>0,closesAt,remainingMs,serverNow,ballCount};
}
function localEngines(){
 if(typeof app==='undefined'||app?.phase!=='playing')return [];
 return (app.engines||[]).filter((engine,index)=>engine?.kind==='dango'&&app.enabled?.[index]!==false&&Number(app.locked?.[index]??app.bets?.[index])>0);
}
function finishPending(reason){
 for(const engine of localEngines())engine.finishThinkingV251?.({reason});
}
function checkpointPlacement(options={}){
 const shared=window.SweetsSharedMachine,current=state();
 const roundId=String(options.roundId||current.roundId);
 if(!roundId||roundId!==current.roundId||shared?.active?.roundId!==roundId||!localEngines().length)return Promise.resolve({ok:true,skipped:true,reason:'no_active_dango'});
 if(typeof shared.checkpointNowV251!=='function')return Promise.reject(Error('Dango checkpoint API unavailable'));
 return shared.checkpointNowV251({roundId,ballIndex:5,beforeSnapshot:options.finalize?()=>finishPending(options.reason||'deadline'):null});
}
async function beforeSix(options={}){
 const current=state(),roundId=String(options.roundId||current.roundId);
 if(roundId!==current.roundId||!localEngines().length)return;
 // Even if a delayed server packet contains number six, finalize and durably
 // save the fifth-ball board before Arcade is allowed to consume that number.
 const result=await checkpointPlacement({roundId,finalize:true,reason:'before-six'});
 if(result?.skipped&&window.SweetsSharedMachine?.active?.roundId===roundId)throw Error('Dango placement checkpoint was not saved');
}
function tick(){
 clearTimeout(pollTimer);
 const client=window.SweetsSharedMachine?.client;
 if(client&&client!==boundClient){boundClient=client;client.on(tick);}
 const current=state();
 const signature=[current.roundId,current.enabled,current.active,current.closesAt,current.ballCount,Math.ceil(current.remainingMs/1000)].join('|');
 if(signature!==lastSignature){
  lastSignature=signature;
  try{window.dispatchEvent(new CustomEvent(EVENT,{detail:current}));}catch{}
 }
 if(finalized.size>20){const keep=finalized.has(current.roundId)?current.roundId:'';finalized.clear();if(keep)finalized.add(keep);}
 if(current.enabled&&current.ballCount===5&&current.closesAt&&current.serverNow>=current.closesAt&&localEngines().length&&!finalized.has(current.roundId)&&finishingRound!==current.roundId&&Date.now()>=retryAt){
  const id=current.roundId;finishingRound=id;
  checkpointPlacement({roundId:id,finalize:true,reason:'deadline'}).then(result=>{
   if(result?.ok&&!result.skipped)finalized.add(id);
  }).catch(error=>{retryAt=Date.now()+1000;console.warn('[DangoThinking251] checkpoint retry',error?.message||error);}).finally(()=>{if(finishingRound===id)finishingRound='';});
 }
 pollTimer=setTimeout(tick,current.enabled&&current.ballCount===5?100:400);
}

// These functions are inserted into the established shared core's lexical
// scope by patch(). They intentionally use that core's private session state.
function checkpointNowV251(options={}){
 const session=current,roundId=String(options.roundId||session?.roundId||''),ballIndex=Number(options.ballIndex??5);
 const token=Number(app?.token),owns=()=>!!session&&current===session&&!session.stopped&&session.roundId===roundId&&Number(app?.token)===token;
 if(!owns()||!client.online)return Promise.resolve({ok:true,skipped:true,reason:'round_changed'});
 const run=async()=>{
  const started=Date.now();
  while(owns()&&client.online){
   const count=Number(app.draws?.length||0);
   if(count>ballIndex)return {ok:true,skipped:true,reason:'ball_already_advanced'};
   const complete=count===ballIndex&&(app.engines||[]).every((engine,index)=>app.enabled?.[index]===false||Math.max(Number(engine?.processed)||0,Number(engine?.draws?.length)||0,Number(engine?.state?.draws?.length)||0)>=ballIndex);
   if(complete)break;
   if(Date.now()-started>18000)throw Error('thinking_checkpoint_not_ready');
   await wait(25);
  }
  if(!owns()||!client.online)return {ok:true,skipped:true,reason:'round_changed'};
  options.beforeSnapshot?.();
  if(!owns()||Number(app.draws?.length)!==ballIndex)return {ok:true,skipped:true,reason:'round_changed'};
  clearTimeout(session.saveTimer);
  const saved=checkpoint(app);
  return client.save({roundId,ballIndex,state:saved,dangoPlacementV251:true});
 };
 const pending=(session.placementSavePromiseV251||Promise.resolve()).catch(()=>{}).then(run);
 session.placementSavePromiseV251=pending;
 return pending;
}
function allowHostLaunchV251(){
 const round=client.round;
 if(!round||round.id!==hostRoundId||round.phase!=='PLAYING'||!hostRunning)return false;
 if(!round.thinkingEnabled)return true;
 const count=round.balls?.length||0,active=Math.max(0,Number(rouletteDriver?.physics?.active)||0);
 if(count<5)return count+active+Math.max(0,hostReportsPending)<5;
 const deadline=Number(round.thinkingClosesAt)||0;
 if(!deadline||Date.now()+Number(client.clockOffset||0)<deadline)return false;
 return count+active+Math.max(0,hostReportsPending)<8;
}
function patch(source){
 function once(from,to,label){const count=source.split(from).length-1;if(count!==1)throw Error('[DangoThinking251] '+label+' matches='+count);source=source.replace(from,to);}
 once('function checkpoint(a){','let lastCheckpointSavedAtV251=0;\nfunction checkpoint(a){','monotonic checkpoint clock');
 once('version:176,savedAt:Date.now(),phase:a.phase,','version:176,savedAt:(lastCheckpointSavedAtV251=Math.max(Date.now(),lastCheckpointSavedAtV251+1)),phase:a.phase,','checkpoint timestamp');
 once('function saveLater(ballIndex){',checkpointNowV251.toString()+'\nfunction saveLater(ballIndex){','checkpoint API');
 once('   const item=session.queue.get(session.delivered+1);if(!item)break;', '   const item=session.queue.get(session.delivered+1);if(!item)break;\n   if(item.index===6)await window.SweetsDangoThinkingV251?.beforeSix?.({roundId:session.roundId});','sixth-ball checkpoint barrier');
 once('get pendingStart(){return pendingStart;},state:()=>client.getState()};','get pendingStart(){return pendingStart;},state:()=>client.getState(),checkpointNowV251};','export checkpoint API');
 once('  function hostMotionState(){',allowHostLaunchV251.toString()+'\n  function hostMotionState(){','host launch gate');
 once("   if(client.role!=='host'||!client.online)return;","   if(client.role!=='host'||!client.online)return;\n   if(rouletteDriver?.draw)rouletteDriver.draw.canLaunchNormal=allowHostLaunchV251;",'install host launch gate');
 once('   if(hostRoundId===round.id&&hostRunning){',
  "   const thinkingUntilV251=Number(round.thinkingClosesAt)||0;\n   const thinkingLeftV251=thinkingUntilV251-(Date.now()+Number(client.clockOffset||0));\n   if(round.thinkingEnabled&&(round.balls?.length||0)===5&&(!thinkingUntilV251||thinkingLeftV251>0)){\n    hostBanner('THINKING TIME '+Math.max(0,thinkingLeftV251/1000).toFixed(1)+'s · 5 / 8');\n    hostRetryTimer=setTimeout(()=>syncHost(client.round),100);return;\n   }\n   if(hostRoundId===round.id&&hostRunning){",'thinking host presentation');
 once("     const data=await client.report({roundId,ballIndex:index,number:value,eventId:roundId+':'+index+':'+hostAttempt});",
  "     const data=await client.report({roundId,ballIndex:index,number:value,eventId:roundId+':'+index+':'+hostAttempt});\n     if(data?.round)client.accept(data);",'fifth result deadline acknowledgement');
 once("['betting_started','bet_updated','round_started','participant_joined','snapshot','host_changed','server_fallback_started']",
  "['betting_started','bet_updated','round_started','participant_joined','snapshot','host_changed','server_fallback_started','thinking_started','thinking_complete']",'thinking host events');
 return source;
}
window.SweetsDangoThinkingV251={version:251,event:EVENT,state,checkpointPlacement,beforeSix,patch};
setTimeout(tick,0);
})();

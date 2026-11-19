/* Only the server's isolated headless page calls compute(). No HTTP settlement
 * endpoint accepts this page's output from a player. Native engines own rules.
 */
(()=>{
'use strict';
const query=new URLSearchParams(location.search);
if(query.get('downloadWorker')!=='1')return;
const R=window.SweetsRecordedRoundV255;
if(!R)throw Error('recorded_round_helper_missing');
let busy=false,callbacks=null;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function pending(){return app.engines.map((engine,i)=>({id:SweetsLineup.ids[i],enabled:app.enabled[i],processed:engine.processed,accepted:engine.accepted,busy:engine.busy,opening:engine.opening,phase:engine.phase,queue:engine.queue?.length,trace:!!engine.trace,fx:!!engine.fx,paid:app.paid[i]}));}
async function until(test,label,timeout=45000){
 const deadline=Date.now()+timeout;
 while(Date.now()<deadline){
  app.paused=false;for(const engine of app.engines){engine.paused=false;engine.presentationRate=100;}
  if(app.phase==='error')throw Error('download_native_game_error:'+String(app.drawError||JSON.stringify(pending())));
  if(test())return;await sleep(10);
 }
 throw Error('download_worker_timeout:'+label+':'+JSON.stringify(pending()));
}
stopAutoRound();stopResultAuto();
scheduleAutoRound=()=>{};syncResultAuto=()=>{};
Object.defineProperty(rouletteDrawSource,'ready',{configurable:true,get:()=>true});
rouletteDrawSource.start=value=>{callbacks=value;return true;};rouletteDrawSource.reset=()=>{callbacks=null;};rouletteDrawSource.pause=()=>{};
// Server calculation skips presentation sleeps, not game rules or input order.
app.sleep=()=>Promise.resolve();
for(const engine of app.engines){
 if('sleep' in engine)engine.sleep=()=>Promise.resolve();
 if(typeof engine.visualWait==='function')engine.visualWait=async function(ms,token){return token===this.version;};
}
app.wait=async function(ms,token){return token===this.token;};
window.SweetsDownloadWorkerV255={version:255,ready:true,describe:pending,async compute(input){
 if(busy)throw Error('download_worker_busy');busy=true;
 try{
  if(input?.version!==255||input.gameIds?.join(',')!==SweetsLineup.ids.join(',')||input.bets?.length!==app.engines.length||input.recording?.hits?.length!==8)throw Error('download_worker_input_invalid');
  const numbers=input.recording.hits.map(hit=>hit.number);
  if(new Set(numbers).size!==8)throw Error('download_worker_duplicate_numbers');
  app.__sugarWorkRoundId=input.sessionId;
  debugPayoutTarget=Math.max(50,Math.min(150,Number(input.rate)||90));
  debugForceRainbowSugar=false;
  if(input.previousState)R.restore(app,input.previousState,{wallet:false,notify:false,random:false});
  if(input.previousState?.recordsV255)recordBook.load(R.revive(input.previousState.recordsV255));
  recordBook.now=()=>Number(input.createdAt)||1700000000000;
  const rng=R.installRecording(app,{seed:input.seed});
  app.bets=input.bets.slice();app.credit=input.creditBefore-input.totalBet;app.displayCredit=app.credit;
  for(const [i,engine] of app.engines.entries()){
   if('payoutTarget' in engine)engine.payoutTarget=debugPayoutTarget;
   engine.roundBet=input.bets[i];
   // Brand-new accounts must not inherit the unseeded preview's carry state.
   if(!input.previousState){
    if(engine.kind==='choco'){engine.checkpoint=null;engine.strata=null;engine.phase='ready';}
    engine.reset?.({keepWonder:false,keepHammers:false});
   }
  }
  const carry=input.sixDropCarry||input.previousState?.engines?.[2]?.state&&window.SixDropV247?.rules.carryOut(R.revive(input.previousState.engines[2].state),String(input.previousState.engines[2].roundId247||''));
  if(carry)window.dispatchEvent(new CustomEvent('sweets:payout-control-v3',{detail:{playerId:input.playerId,sixDropV247:carry,effectiveRate:input.rate}}));
  app.prepare();app.bets=input.bets.slice();app.credit=input.creditBefore-input.totalBet;app.displayCredit=app.credit;
  if(input.sugarState)window.SweetsSugarChallengeV254?.accept(input.sugarState);
  // No local confirmation, browser wallet, supplied board, or client win is read.
  const started=app.start();if(started===false||!callbacks)throw Error('download_worker_start_rejected');
  app.fastForward=true;for(const engine of app.engines){engine.presentationRate=100;if(engine.rulesVersion===247)engine.roundId247=input.sessionId;}
  await until(()=>R.stable(app,0),'initial-board');
  const initialState=R.capture(app,{ballIndex:0}),checkpoints=[initialState];
  for(let i=0;i<numbers.length;i++){
   await until(()=>!app.drawHeld&&R.stable(app,i),'before-ball-'+(i+1));
   if(i===5)for(const engine of app.engines)if(engine.kind==='dango')engine.finishThinkingV251?.({reason:'download-auto'});
   if(callbacks.onNumber(numbers[i])===false)throw Error('download_worker_ball_rejected_'+(i+1));
   await until(()=>R.stable(app,i+1),'after-ball-'+(i+1));
   await Promise.resolve();await Promise.resolve();
   checkpoints.push(R.capture(app,{ballIndex:i+1}));
  }
  await until(()=>app.enabled.every((yes,i)=>!yes||app.paid[i]),'native-final-payout',60000);
  const games=app.engines.map((engine,i)=>({id:SweetsLineup.ids[i],bet:input.bets[i],win:input.bets[i]>0?Number(app.roundWins[i])||0:0,
    ...(engine.rulesVersion===247?{rulesVersion:247,carryV247:engine.progressiveCarryV247?.()}:{}),
    sugarEarned:!!engine.wonderCollected,highestRoles:engine.kind==='dango'?window.DangoBingoRules.highestRolesFor(engine.state):undefined}));
  const totalWin=games.reduce((sum,game)=>sum+game.win,0);
  if(totalWin!==app.totalWin)throw Error('download_worker_payout_disagrees');
  const sugarTokens=window.SweetsSugarChallengeV254?.payload()?.tokens||[];
  app.credit=input.creditBefore-input.totalBet+totalWin;app.displayCredit=app.credit;
  const finalState=R.capture(app,{ballIndex:8,recordsV255:R.clone(recordBook.data)});
  finalState.phase='complete';finalState.payout=null;
  const output={version:255,sessionId:input.sessionId,numbers,games,totalWin,initialState,finalState,
    playback:{recording:input.recording,checkpoints,rngTapes:rng.export()},sugarTokens};
  rng.dispose();app.pause(true);return output;
 }finally{busy=false;}
}};
})();

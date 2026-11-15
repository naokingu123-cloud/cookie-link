(()=>{
'use strict';
if(window.__sweetsNextBetJoinV217)return;
window.__sweetsNextBetJoinV217=true;
const params=new URLSearchParams(location.search);
if(params.get('serverHost')==='1'||params.get('serverSettlementWorker')==='1')return;

const finite=value=>Number.isFinite(Number(value))?Number(value):0;
let timer=0,busy=false,lastJoinKey='',lastJoinAt=0,lastStartRound='',lastStartAt=0,lastPositiveBets=[];

function shared(){return window.SweetsSharedMachine;}
function gate(){return window.SweetsConnectionGateV217;}
function lifecycle(){return window.SweetsSharedLifecycleV217;}
function positive(values){return Array.isArray(values)&&values.some(value=>finite(value)>0);}
function selectedBets(){
 let bets=Array.isArray(app?.bets)?app.bets.map(value=>Math.max(0,finite(value))):[];
 if(positive(bets))lastPositiveBets=[...bets];
 else if(positive(app?.locked))bets=app.locked.map(value=>Math.max(0,finite(value)));
 else if(positive(lastPositiveBets))bets=[...lastPositiveBets];
 return bets;
}
function applyParticipant(participant){
 if(!participant)return;
 app.bets=[...(participant.bets||app.bets||[])];
 app.locked=[...(participant.locked||participant.bets||app.locked||app.bets||[])];
 app.enabled=[...(participant.enabled||app.enabled||[])];
 app.paused=false;
}
function betPayload(round){
 const bets=selectedBets(),enabled=bets.map(value=>value>0),totalBet=bets.reduce((sum,value,index)=>sum+(enabled[index]?value:0),0);
 return {
  clientRoundToken:'stable-next-bet-'+String(round?.id||'round')+'-'+String(app?.token||0),
  bets,locked:[...bets],enabled,totalBet,creditAfterBet:finite(app?.credit),appVersion:'shared-next-bet-v217'
 };
}
async function ensurePristine(reason){
 const life=lifecycle();
 if(typeof app==='undefined'||shared()?.active)return false;
 if(life?.isPristine?.())return true;
 if(!life?.forceInitial)return false;
 await life.forceInitial(reason);
 return !!life.isPristine?.();
}
function schedule(delay=220){clearTimeout(timer);timer=setTimeout(sync,delay);}
async function reserve(round,client){
 if(!gate()?.canJoin?.(round))return false;
 if(!await ensurePristine('before-bet-reservation'))return false;
 // The full reset takes several verification ticks. Revalidate the exact server
 // round afterward so a closing/changed BET can never be joined late.
 const live=client.round;
 if(!live||live.id!==round.id||!gate()?.canJoin?.(live))return false;
 const payload=betPayload(live);
 if(!(payload.totalBet>0)){
  try{typeof countdownText==='function'&&countdownText('BET','BETを設定してください');}catch{}
  return false;
 }
 const key=live.id+'|'+payload.bets.join(',')+'|'+payload.creditAfterBet;
 const time=Date.now();
 if(live.participant?.playerId&&finite(live.participant.totalBet)===payload.totalBet&&key===lastJoinKey){applyParticipant(live.participant);return true;}
 if(key===lastJoinKey&&time-lastJoinAt<700)return !!live.participant;
 lastJoinKey=key;lastJoinAt=time;
 const response=await client.join(payload);gate()?.noteState?.(response);client.accept?.(response);
 const participant=response?.round?.participant;
 if(participant)applyParticipant(participant);
 return !!participant;
}
async function startRound(round,state,client){
 if(!gate()?.canStart?.(round)||shared()?.active)return false;
 if(!await ensurePristine('before-next-game-start'))return false;
 const live=client.round;
 if(!live||live.id!==round.id||!gate()?.canStart?.(live)||!lifecycle()?.isPristine?.())return false;
 const time=Date.now();if(lastStartRound===live.id&&time-lastStartAt<900)return false;
 lastStartRound=live.id;lastStartAt=time;
 applyParticipant(live.participant);
 try{client.accept?.(state);}catch{}
 if(!gate()?.canStart?.(client.round)){lastStartRound='';return false;}
 try{
  const started=app.start();
  if(started===false){lastStartRound='';return false;}
  setTimeout(()=>{
   const active=shared()?.active;
   if(active?.roundId!==live.id&&app?.phase==='ready')lastStartRound='';
  },900);
  return true;
 }catch(error){
  console.warn('[NextBetJoinV217] direct stable server start',error?.message||error);
  lastStartRound='';return false;
 }
}
async function sync(){
 timer=0;if(busy){schedule();return;}busy=true;
 try{
  const machine=shared(),client=machine?.client,connectionGate=gate(),life=lifecycle();
  if(!client?.online||!connectionGate||!life||typeof client.getState!=='function'||typeof app==='undefined'){schedule(350);return;}
  const state=await client.getState();connectionGate.noteState?.(state);client.accept?.(state);
  const round=state?.round;
  if(!connectionGate.stable?.()){
   try{typeof countdownText==='function'&&countdownText('WAIT',state?.machine?.hostConnected?'接続を安定化中':'物理抽選機の接続待機');}catch{}
   schedule(250);return;
  }
  if(!round){lastJoinKey='';lastStartRound='';schedule(250);return;}
  if(round.phase==='BETTING'){
   lastStartRound='';
   if(connectionGate.canJoin(round))await reserve(round,client);
   else try{typeof countdownText==='function'&&countdownText('NEXT','次の完全なSERVER BET TIME待機');}catch{}
  }else if(round.phase==='PLAYING'){
   await startRound(round,state,client);
  }else if(round.phase==='COMPLETE'){
   lastJoinKey='';lastStartRound='';
  }
 }catch(error){
  if(!['stable_connection_required'].includes(error?.code)&&error?.status!==409)console.warn('[NextBetJoinV217] sync',error?.message||error);
 }finally{busy=false;schedule();}
}
function install(){
 const client=shared()?.client;
 if(typeof app==='undefined'||!client||!gate()||!lifecycle()){setTimeout(install,60);return;}
 client.on?.(message=>{
  if(['betting_started','bet_updated','round_started','round_complete','player_settled','snapshot','host_status'].includes(message?.type))schedule(20);
 });
 schedule(0);
 window.SweetsNextBetJoinV217={syncNow:sync,betPayload,ensurePristine,startRound};
 console.info('[NextBetJoinV217] verified pristine-board gate before BET and PLAYING enabled');
}
install();
})();

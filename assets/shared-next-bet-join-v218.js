(()=>{
'use strict';
if(window.__sweetsNextBetJoinV218)return;
window.__sweetsNextBetJoinV218=true;
const params=new URLSearchParams(location.search);
if(params.get('serverHost')==='1'||params.get('serverSettlementWorker')==='1')return;

const finite=value=>Number.isFinite(Number(value))?Number(value):0;
let timer=0,busy=false,lastJoinKey='',lastStartRound='',lastPositiveBets=[];
const startedRounds=new Set();
const shared=()=>window.SweetsSharedMachine;
const gate=()=>window.SweetsConnectionGateV218;
const lifecycle=()=>window.SweetsSharedLifecycleV218;
const positive=values=>Array.isArray(values)&&values.some(value=>finite(value)>0);
function bets(){
 let values=Array.isArray(app?.bets)?app.bets.map(value=>Math.max(0,finite(value))):[];
 if(positive(values))lastPositiveBets=[...values];
 else if(positive(app?.locked))values=app.locked.map(value=>Math.max(0,finite(value)));
 else if(positive(lastPositiveBets))values=[...lastPositiveBets];
 return values;
}
function payload(round){
 const values=bets(),enabled=values.map(value=>value>0);
 return {clientRoundToken:'v218-'+String(round?.id||'round')+'-'+String(app?.token||0),bets:values,locked:[...values],enabled,totalBet:values.reduce((sum,value,index)=>sum+(enabled[index]?value:0),0),creditAfterBet:finite(app?.credit),appVersion:'shared-next-bet-v218'};
}
function apply(participant){
 if(!participant)return;
 app.bets=[...(participant.bets||app.bets||[])];app.locked=[...(participant.locked||participant.bets||app.bets||[])];app.enabled=[...(participant.enabled||app.enabled||[])];app.paused=false;
}
async function clean(reason){
 const life=lifecycle();if(!life||typeof app==='undefined')return false;
 if(life.isPristine?.())return true;
 if(shared()?.active)return false;
 await life.forceInitial?.(reason);return !!life.isPristine?.();
}
function schedule(delay=140){clearTimeout(timer);timer=setTimeout(sync,delay);}
async function reserve(round,client){
 if(!gate()?.canJoin?.(round)||!await clean('before-reserve'))return false;
 const live=client.round;if(!live||live.id!==round.id||!gate()?.canJoin?.(live))return false;
 const body=payload(live);if(!(body.totalBet>0)){try{countdownText('BET','BETを設定してください');}catch{}return false;}
 const key=live.id+'|'+body.bets.join(',')+'|'+body.creditAfterBet;
 if(live.participant?.playerId){gate()?.noteJoined?.(live.id);apply(live.participant);lastJoinKey=key;return true;}
 if(key===lastJoinKey)return false;lastJoinKey=key;
 const response=await client.join(body);gate()?.noteState?.(response);client.accept?.(response);
 if(response?.round?.participant?.playerId){gate()?.noteJoined?.(response.round.id);apply(response.round.participant);return true;}
 lastJoinKey='';return false;
}
async function start(round,state,client){
 if(startedRounds.has(round.id))return shared()?.active?.roundId===round.id||app?.phase==='playing';
 if(!gate()?.canStart?.(round)||!await clean('before-authoritative-start'))return false;
 const live=client.round;if(!live||live.id!==round.id||!gate()?.canStart?.(live)||!lifecycle()?.isPristine?.())return false;
 apply(live.participant);try{client.accept?.(state);}catch{}
 if(!gate()?.canStart?.(client.round))return false;
 const result=app.start();if(result===false)return false;
 startedRounds.add(live.id);lastStartRound=live.id;
 setTimeout(()=>{
  const active=shared()?.active;
  if(active?.roundId!==live.id&&app?.phase!=='playing')startedRounds.delete(live.id);
 },900);
 return true;
}
async function sync(){
 timer=0;if(busy){schedule();return;}busy=true;
 try{
  const machine=shared(),client=machine?.client,g=gate(),life=lifecycle();
  if(!client?.online||!g||!life||typeof app==='undefined'){schedule(300);return;}
  const state=await client.getState();g.noteState?.(state);client.accept?.(state);const round=state?.round;
  if(!g.stable?.()){try{countdownText('WAIT','安定接続を確認中');}catch{}schedule(220);return;}
  if(!round){lastJoinKey='';schedule(200);return;}
  if(round.phase==='BETTING'){
   lastStartRound='';startedRounds.delete(round.id);
   if(g.canJoin(round))await reserve(round,client);else try{countdownText('NEXT','次の完全なSERVER BET TIME待機');}catch{}
  }else if(round.phase==='PLAYING'){
   if(round.participant?.playerId)g.noteJoined?.(round.id);
   await start(round,state,client);
  }else if(round.phase==='COMPLETE'){
   lastJoinKey='';lastStartRound='';
  }
 }catch(error){if(!['next_stable_bet_required'].includes(error?.code)&&error?.status!==409)console.warn('[NextBetJoinV218]',error?.message||error);}
 finally{busy=false;schedule();}
}
function install(){
 const client=shared()?.client;if(typeof app==='undefined'||!client||!gate()||!lifecycle()){setTimeout(install,50);return;}
 client.on?.(message=>{if(['betting_started','bet_updated','round_started','round_complete','player_settled','snapshot'].includes(message?.type))schedule(10);});
 schedule(0);window.SweetsNextBetJoinV218={syncNow:sync,reserve,start,payload};
 console.info('[NextBetJoinV218] deterministic next-window reserve and one-start-per-round enabled');
}
install();
})();

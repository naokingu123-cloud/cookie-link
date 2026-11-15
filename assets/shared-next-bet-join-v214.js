(()=>{
'use strict';
if(window.__sweetsNextBetJoinV214)return;
window.__sweetsNextBetJoinV214=true;
if(new URLSearchParams(location.search).get('serverHost')==='1'||new URLSearchParams(location.search).get('serverSettlementWorker')==='1')return;

const finite=value=>Number.isFinite(Number(value))?Number(value):0;
let timer=0,busy=false,lastJoinKey='',lastJoinAt=0,lastStartRound='',lastStartAt=0,lastPositiveBets=[];

function shared(){return window.SweetsSharedMachine;}
function positive(values){return Array.isArray(values)&&values.some(value=>finite(value)>0);}
function selectedBets(){
 let bets=Array.isArray(app?.bets)?app.bets.map(value=>Math.max(0,finite(value))):[];
 if(positive(bets))lastPositiveBets=[...bets];
 else if(positive(app?.locked))bets=app.locked.map(value=>Math.max(0,finite(value)));
 else if(positive(lastPositiveBets))bets=[...lastPositiveBets];
 return bets;
}
function betPayload(round){
 const bets=selectedBets(),enabled=bets.map(value=>value>0),totalBet=bets.reduce((sum,value,index)=>sum+(enabled[index]?value:0),0);
 return {
  clientRoundToken:'next-bet-'+String(round?.id||'round')+'-'+String(app?.token||0),
  bets,locked:[...bets],enabled,totalBet,creditAfterBet:finite(app?.credit),appVersion:'shared-next-bet-v214'
 };
}
function forceReadyForBet(){
 const active=shared()?.active;
 if(active||typeof app==='undefined')return app?.phase==='ready';
 if(app.phase==='ready')return true;
 if(!['complete','result','paying','error'].includes(String(app.phase)))return false;
 try{rouletteDrawSource?.reset?.();}catch(error){console.warn('[NextBetJoinV214] draw reset',error?.message||error);}
 try{
  app.payout=null;app.result=null;app.dealing=false;app.fastForward=false;app.drawHeld=false;
  app.phase='complete';
  if(typeof app.prepare==='function')app.prepare();
  if(app.phase!=='ready'){
   app.phase='ready';app.draws=[];app.paid=(app.paid||[]).map(()=>false);app.roundWins=(app.roundWins||[]).map(()=>0);app.totalWin=0;
  }
  app.onChange?.(app);
 }catch(error){console.warn('[NextBetJoinV214] ready recovery',error?.message||error);}
 return app.phase==='ready';
}
function schedule(delay=180){clearTimeout(timer);timer=setTimeout(sync,delay);}
async function reserve(round,client){
 if(!round?.canBet||round.phase!=='BETTING'||!forceReadyForBet())return false;
 const payload=betPayload(round);if(!(payload.totalBet>0)){
  try{typeof countdownText==='function'&&countdownText('BET','BETを設定してください');}catch{}
  return false;
 }
 const key=round.id+'|'+payload.bets.join(',')+'|'+payload.creditAfterBet;
 const now=Date.now();
 if(round.participant&&finite(round.participant.totalBet)===payload.totalBet&&key===lastJoinKey)return true;
 if(key===lastJoinKey&&now-lastJoinAt<500)return !!round.participant;
 lastJoinKey=key;lastJoinAt=now;
 const response=await client.join(payload);client.accept?.(response);
 return !!response?.round?.participant;
}
function requestStart(round,state,client){
 if(!round?.participant||round.phase!=='PLAYING'||shared()?.active||!forceReadyForBet())return false;
 const now=Date.now();if(lastStartRound===round.id&&now-lastStartAt<500)return false;
 lastStartRound=round.id;lastStartAt=now;
 // Re-emit the authoritative event. The shared core owns startPermitId and
 // responds by refreshing state, granting the permit, and calling app.start().
 client.accept?.({type:'round_started',serverTime:state?.serverTime||now+finite(client.clockOffset),round:{...round}});
 return true;
}
async function sync(){
 timer=0;if(busy){schedule();return;}busy=true;
 try{
  const machine=shared(),client=machine?.client;
  if(!client?.online||typeof client.getState!=='function'||typeof app==='undefined'){schedule(350);return;}
  const state=await client.getState();client.accept?.(state);
  const round=state?.round;
  if(!round){lastJoinKey='';lastStartRound='';schedule(250);return;}
  if(round.phase==='BETTING'){
   lastStartRound='';
   await reserve(round,client);
  }else if(round.phase==='PLAYING'){
   requestStart(round,state,client);
  }else if(round.phase==='COMPLETE'){
   lastJoinKey='';
  }
 }catch(error){
  if(error?.status!==409)console.warn('[NextBetJoinV214] sync',error?.message||error);
 }finally{busy=false;schedule();}
}
function install(){
 const client=shared()?.client;
 if(typeof app==='undefined'||!client){setTimeout(install,80);return;}
 client.on?.(message=>{
  if(['betting_started','bet_updated','round_started','round_complete','player_settled','snapshot'].includes(message?.type))schedule(0);
 });
 schedule(0);
 window.SweetsNextBetJoinV214={syncNow:sync,betPayload,forceReadyForBet};
 console.info('[NextBetJoinV214] late clients reserve during the next BET and retry authoritative start until attached');
}
install();
})();

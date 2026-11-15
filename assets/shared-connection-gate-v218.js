(()=>{
'use strict';
if(window.__sweetsConnectionGateV218)return;
window.__sweetsConnectionGateV218=true;
const params=new URLSearchParams(location.search);
if(params.get('serverHost')==='1'||params.get('serverSettlementWorker')==='1')return;

const STABLE_MS=2400;
const FRESH_STATE_MS=2400;
const FRESH_MESSAGE_MS=3000;
const MIN_BET_REMAIN_MS=1800;
let currentSocket=null,onlineSince=0,lastMessageAt=0,lastStateAt=0,lastStateRoundId='';
let connectionEpoch=0,stableEpoch=-1,blockedRoundId='',stableServerAt=0,clockOffset=0;
let pollTimer=0,pollBusy=false,statusKey='';
const joinedRounds=new Set();

const now=()=>Date.now();
const machine=()=>window.SweetsSharedMachine;
const client=()=>machine()?.client;
const socketOpen=c=>!!(c?.online&&c?.ws&&c.ws.readyState===WebSocket.OPEN);
const serverNow=()=>now()+clockOffset;

function stopLocal(){
 try{if(typeof stopAutoRound==='function')stopAutoRound();}catch{}
 try{if(typeof autoRoundStamp!=='undefined')autoRoundStamp=null;}catch{}
}
function status(text,label){
 const key=label+'|'+text;if(key===statusKey)return;statusKey=key;
 try{typeof countdownText==='function'&&countdownText(text,label);}catch{}
}
function resetConnection(reason='offline'){
 connectionEpoch++;stableEpoch=-1;onlineSince=0;lastMessageAt=0;lastStateAt=0;lastStateRoundId='';
 blockedRoundId='';stableServerAt=0;joinedRounds.clear();stopLocal();
 if(typeof app!=='undefined'&&app?.phase==='ready')status('WAIT',reason==='socket-change'?'接続を安定化中':'SERVER再接続待機');
}
function inspectSocket(){
 const c=client(),socket=c?.ws||null,open=socketOpen(c);
 if(socket!==currentSocket){currentSocket=socket;resetConnection('socket-change');}
 if(!open){if(onlineSince)resetConnection('offline');return false;}
 if(!onlineSince)onlineSince=now();
 return true;
}
function note(message,{state=false}={}){
 const time=now();lastMessageAt=time;
 if(Number.isFinite(Number(message?.serverTime)))clockOffset=Number(message.serverTime)-time;
 if(state||Object.prototype.hasOwnProperty.call(message||{},'round')){
  lastStateAt=time;lastStateRoundId=String(message?.round?.id||'');
 }
}
function stable(){
 const time=now();
 if(!inspectSocket())return false;
 const ok=time-onlineSince>=STABLE_MS&&time-lastMessageAt<=FRESH_MESSAGE_MS&&time-lastStateAt<=FRESH_STATE_MS;
 if(ok&&stableEpoch!==connectionEpoch){
  stableEpoch=connectionEpoch;stableServerAt=serverNow();blockedRoundId=String(client()?.round?.id||'');
  console.info('[ConnectionGateV218] stable; current round is observation-only',blockedRoundId||'(none)');
 }
 return ok&&stableEpoch===connectionEpoch;
}
function sameFreshRound(round){return !!round&&String(round.id||'')===lastStateRoundId&&now()-lastStateAt<=FRESH_STATE_MS;}
function nextWindow(round){
 if(!round)return false;
 if(blockedRoundId&&String(round.id||'')===blockedRoundId)return false;
 const opened=Number(round.betOpenedAt||0);
 return !opened||opened>=stableServerAt-100;
}
function canJoin(round){
 if(!stable()||!sameFreshRound(round)||round?.phase!=='BETTING'||round?.canBet!==true||!nextWindow(round))return false;
 return Number(round.betClosesAt||0)-serverNow()>=MIN_BET_REMAIN_MS;
}
function noteJoined(roundId){if(roundId)joinedRounds.add(String(roundId));}
function canStart(round){
 return !!(stable()&&sameFreshRound(round)&&round?.phase==='PLAYING'&&round?.participant?.playerId&&joinedRounds.has(String(round.id||'')));
}
function describe(){return {stable:stable(),connectionEpoch,blockedRoundId,stableServerAt,lastStateRoundId,lastStateAge:lastStateAt?now()-lastStateAt:null,joined:[...joinedRounds]};}

function installStartGuard(){
 if(typeof Arcade!=='function'||!Arcade.prototype)return false;
 const proto=Arcade.prototype;if(proto.__sharedConnectionStartV218)return true;
 const native=proto.start;if(typeof native!=='function')return false;
 Object.defineProperty(proto,'__sharedConnectionStartV218',{value:true});
 proto.start=function(...args){
  const round=client()?.round;
  if(!canStart(round)){
   stopLocal();
   if(this?.phase==='ready')status(stable()?'NEXT':'WAIT',stable()?'次の完全なSERVER BET TIME待機':'安定接続を確認中');
   return false;
  }
  return native.apply(this,args);
 };
 return true;
}
async function poll(){
 pollTimer=0;stopLocal();installStartGuard();
 const c=client();
 if(!socketOpen(c)||pollBusy){pollTimer=setTimeout(poll,350);return;}
 pollBusy=true;
 try{const state=await c.getState();note(state,{state:true});c.accept?.(state);}
 catch{}finally{pollBusy=false;pollTimer=setTimeout(poll,500);}
}
function install(){
 const c=client();if(!c){setTimeout(install,50);return;}
 const nativeAccept=typeof c.accept==='function'?c.accept.bind(c):null;
 if(nativeAccept&&!c.__stableAcceptV218){c.__stableAcceptV218=true;c.accept=function(message){note(message,{state:message?.type==='snapshot'});return nativeAccept(message);};}
 const nativeGetState=typeof c.getState==='function'?c.getState.bind(c):null;
 if(nativeGetState&&!c.__stableGetStateV218){c.__stableGetStateV218=true;c.getState=async function(...args){const state=await nativeGetState(...args);note(state,{state:true});return state;};}
 const nativeJoin=typeof c.join==='function'?c.join.bind(c):null;
 if(nativeJoin&&!c.__stableJoinV218){
  c.__stableJoinV218=true;
  c.join=async function(payload){
   const round=c.round;if(!canJoin(round))throw Object.assign(Error('next_stable_bet_required'),{code:'next_stable_bet_required'});
   const result=await nativeJoin(payload);const joined=result?.round?.participant?.playerId&&result?.round?.id;
   if(joined)noteJoined(result.round.id);return result;
  };
 }
 c.on?.(message=>note(message,{state:message?.type==='snapshot'}));
 inspectSocket();installStartGuard();poll();
 window.SweetsConnectionGateV218={stable,canJoin,canStart,noteJoined,noteState:state=>note(state,{state:true}),describe,serverNow,constants:{STABLE_MS,FRESH_STATE_MS,FRESH_MESSAGE_MS,MIN_BET_REMAIN_MS}};
 addEventListener('beforeunload',()=>clearTimeout(pollTimer),{once:true});
 console.info('[ConnectionGateV218] only a BET window opened after stable login is joinable');
}
install();
})();

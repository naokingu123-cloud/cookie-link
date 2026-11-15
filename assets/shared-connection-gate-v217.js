(()=>{
'use strict';
if(window.__sweetsConnectionGateV217)return;
window.__sweetsConnectionGateV217=true;
const params=new URLSearchParams(location.search);
if(params.get('serverHost')==='1'||params.get('serverSettlementWorker')==='1')return;

const STABLE_MS=2800;
const FRESH_STATE_MS=2200;
const FRESH_MESSAGE_MS=2600;
const MIN_BET_REMAIN_MS=2600;
let timer=0,pollTimer=0,pollBusy=false,currentSocket=null,onlineSince=0,lastMessageAt=0,lastStateAt=0;
let lastStateRoundId='',hostConnected=false,connectionEpoch=0,readyEpoch=-1,lastStatus='';

const now=()=>Date.now();
const machine=()=>window.SweetsSharedMachine;
const client=()=>machine()?.client;
const openSocket=c=>!!(c?.online&&c?.ws&&c.ws.readyState===WebSocket.OPEN);

function stopLocal(){
 try{if(typeof stopAutoRound==='function')stopAutoRound();}catch{}
 try{if(typeof autoRoundStamp!=='undefined')autoRoundStamp=null;}catch{}
}
function status(text,label){
 const key=label+'|'+text;if(key===lastStatus)return;lastStatus=key;
 try{if(typeof countdownText==='function')countdownText(text,label);}catch{}
}
function resetConnection(reason='offline'){
 connectionEpoch++;readyEpoch=-1;onlineSince=0;lastMessageAt=0;lastStateAt=0;lastStateRoundId='';hostConnected=false;
 stopLocal();
 if(typeof app!=='undefined'&&app?.phase==='ready')status('WAIT',reason==='socket-change'?'接続を安定化中':'SERVER再接続待機');
}
function inspectSocket(){
 const c=client(),socket=c?.ws||null,isOpen=openSocket(c);
 if(socket!==currentSocket){currentSocket=socket;resetConnection('socket-change');}
 if(!isOpen){if(onlineSince)resetConnection('offline');return false;}
 if(!onlineSince)onlineSince=now();
 return true;
}
function note(message,{state=false}={}){
 const time=now();lastMessageAt=time;
 if(message?.machine&&Object.prototype.hasOwnProperty.call(message.machine,'hostConnected'))hostConnected=message.machine.hostConnected===true;
 if(message?.type==='host_status'&&Object.prototype.hasOwnProperty.call(message,'connected'))hostConnected=message.connected===true;
 if(state||Object.prototype.hasOwnProperty.call(message||{},'round')){
  lastStateAt=time;lastStateRoundId=String(message?.round?.id||'');
 }
}
function stableBase(){
 const time=now();
 if(!inspectSocket())return false;
 const stable=time-onlineSince>=STABLE_MS&&time-lastMessageAt<=FRESH_MESSAGE_MS&&time-lastStateAt<=FRESH_STATE_MS&&hostConnected;
 if(stable)readyEpoch=connectionEpoch;
 return stable&&readyEpoch===connectionEpoch;
}
function sameFreshRound(round){return !!round&&String(round.id||'')===lastStateRoundId&&now()-lastStateAt<=FRESH_STATE_MS;}
function canJoin(round){
 if(!stableBase()||!sameFreshRound(round)||round?.phase!=='BETTING'||round?.canBet!==true)return false;
 return Number(round.betClosesAt||0)-now()>=MIN_BET_REMAIN_MS;
}
function canStart(round){
 return !!(stableBase()&&sameFreshRound(round)&&round?.phase==='PLAYING'&&round?.participant?.playerId&&hostConnected);
}
function describe(){
 const time=now();return {
  stable:stableBase(),hostConnected,onlineSince,lastMessageAge:lastMessageAt?time-lastMessageAt:null,
  lastStateAge:lastStateAt?time-lastStateAt:null,lastStateRoundId,connectionEpoch
 };
}
function installEarlyStartGuard(){
 if(typeof Arcade!=='function'||!Arcade.prototype)return false;
 const proto=Arcade.prototype;if(proto.__sharedConnectionStartV217)return true;
 const native=proto.start;if(typeof native!=='function')return false;
 Object.defineProperty(proto,'__sharedConnectionStartV217',{value:true});
 proto.start=function(...args){
  const round=client()?.round;
  if(!canStart(round)){
   stopLocal();
   if(this?.phase==='ready')status(stableBase()?'NEXT':'WAIT',stableBase()?'次のSERVER BET TIME待機':'安定接続を確認中');
   return false;
  }
  return native.apply(this,args);
 };
 return true;
}
function updateStatus(){
 timer=0;stopLocal();installEarlyStartGuard();
 const c=client(),round=c?.round;
 if(typeof app!=='undefined'&&app?.phase==='ready'){
  if(!openSocket(c))status('WAIT','SERVER再接続待機');
  else if(!stableBase())status('WAIT',hostConnected?'接続を安定化中':'物理抽選機の接続待機');
  else if(round?.phase==='BETTING'&&!canJoin(round))status('NEXT','次の完全なBET TIME待機');
 }
 timer=setTimeout(updateStatus,120);
}
async function poll(){
 pollTimer=0;const c=client();
 if(!openSocket(c)||pollBusy){pollTimer=setTimeout(poll,500);return;}
 pollBusy=true;
 try{
  const state=await c.getState();
  note(state,{state:true});
  c.accept?.(state);
 }catch{}
 finally{pollBusy=false;pollTimer=setTimeout(poll,650);}
}
function install(){
 const c=client();if(!c){setTimeout(install,50);return;}
 const nativeAccept=typeof c.accept==='function'?c.accept.bind(c):null;
 if(nativeAccept&&!c.__stableAcceptV217){
  c.__stableAcceptV217=true;
  c.accept=function(message){note(message,{state:message?.type==='snapshot'});return nativeAccept(message);};
 }
 const nativeGetState=typeof c.getState==='function'?c.getState.bind(c):null;
 if(nativeGetState&&!c.__stableGetStateV217){
  c.__stableGetStateV217=true;
  c.getState=async function(...args){const state=await nativeGetState(...args);note(state,{state:true});return state;};
 }
 const nativeSync=typeof c.syncReady==='function'?c.syncReady.bind(c):null;
 if(nativeSync&&!c.__stableSyncReadyV217){
  c.__stableSyncReadyV217=true;
  c.syncReady=function(...args){const result=nativeSync(...args);window.__sweetsSharedClientReady=stableBase();return result;};
 }
 const nativeJoin=typeof c.join==='function'?c.join.bind(c):null;
 if(nativeJoin&&!c.__stableJoinV217){
  c.__stableJoinV217=true;
  c.join=async function(payload){if(!canJoin(c.round))throw Object.assign(Error('stable_connection_required'),{code:'stable_connection_required'});return nativeJoin(payload);};
 }
 c.on?.(message=>note(message,{state:message?.type==='snapshot'}));
 inspectSocket();installEarlyStartGuard();updateStatus();poll();
 window.SweetsConnectionGateV217={stable:stableBase,canJoin,canStart,noteState:state=>note(state,{state:true}),describe,constants:{STABLE_MS,FRESH_STATE_MS,FRESH_MESSAGE_MS,MIN_BET_REMAIN_MS}};
 addEventListener('beforeunload',()=>{clearTimeout(timer);clearTimeout(pollTimer);},{once:true});
 console.info('[ConnectionGateV217] stable physical-host connection is required before BET and PLAYING');
}
install();
})();

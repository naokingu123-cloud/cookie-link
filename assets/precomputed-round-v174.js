(()=>{
'use strict';

/*
 * SWEETS LINK v176 shared-machine client.
 *
 * The physical result produced by one elected host is the only authoritative
 * number. No future balls are generated and no game is simulated at BET end.
 * Followers receive the host's landed number through the server. State is
 * checkpointed after each settled ball so a reload resumes the same round.
 */
if(window.__sweetsSharedMachineV176)return;
window.__sweetsSharedMachineV176=true;
window.__sweetsPrecomputedRoundV174=true;

const VERSION='v176';
const SESSION_KEY='sweets-shared-session-v176';
const SERVER_KEY='sweets-shared-server-v176';
const MACHINE_KEY='sweets-shared-machine-v176';
const DEFAULT_MACHINE='public-01';
const CONTROL_KEYS=new Set([
 'onEvent','beforeComplete','sleep','random','presentationRate','speed','paused',
 'enablePersistence','persistence','storage','view','canvas','ctx','context'
]);
const ENGINE_KEYS=new Set([
 'state','kind','recordGame','totalHundredths','maxLink','maxChain','allClears','roundSteps','roundHammers','roundCleared',
 'wonderCollected','wonderToken','depth','roundDepth','roundBlocks','roundChests','roundIndex','roundsCleared','hexagons',
 'triangles','lines','processed','accepted','allReachName','queue','pendingDraws','grid','board','cells','draws','history'
]);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const readJSON=(key,fallback)=>{try{const value=localStorage.getItem(key);return value?JSON.parse(value):fallback;}catch{return fallback;}};
const writeJSON=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}};
const query=new URLSearchParams(location.search);
const explicitServer=query.get('sharedServer')||query.get('server')||'';
if(explicitServer)try{localStorage.setItem(SERVER_KEY,explicitServer);}catch{}
const SERVER_BASE=String(explicitServer||localStorage.getItem(SERVER_KEY)||location.origin).replace(/\/$/,'');
const MACHINE_ID=String(query.get('machine')||localStorage.getItem(MACHINE_KEY)||DEFAULT_MACHINE).replace(/[^a-zA-Z0-9_-]/g,'').slice(0,64)||DEFAULT_MACHINE;
const SHARED_DISABLED=query.get('shared')==='0';
try{localStorage.setItem(MACHINE_KEY,MACHINE_ID);}catch{}

function isAtomic(value){
 if(value==null||typeof value!=='object')return true;
 if(typeof Node!=='undefined'&&value instanceof Node)return true;
 const name=value.constructor?.name||'';
 return /^(Window|Document|Audio|AudioContext|BaseAudioContext|CanvasRenderingContext2D|WebGL|ResizeObserver|MutationObserver|Promise|WeakMap|WeakSet)$/i.test(name);
}
function cloneSafe(value,memo=new WeakMap(),depth=0){
 if(value==null||['string','number','boolean'].includes(typeof value))return value;
 if(typeof value==='bigint')return Number(value);
 if(typeof value==='function'||typeof value==='symbol'||depth>14||isAtomic(value))return undefined;
 if(memo.has(value))return undefined;
 memo.set(value,true);
 if(value instanceof Date)return {$date:value.toISOString()};
 if(value instanceof Map){const entries=[];for(const [k,v] of value){const ck=cloneSafe(k,memo,depth+1),cv=cloneSafe(v,memo,depth+1);if(ck!==undefined&&cv!==undefined)entries.push([ck,cv]);}return {$map:entries};}
 if(value instanceof Set){const values=[];for(const item of value){const c=cloneSafe(item,memo,depth+1);if(c!==undefined)values.push(c);}return {$set:values};}
 if(ArrayBuffer.isView(value))return {$typed:value.constructor?.name||'Uint8Array',values:Array.from(value).slice(0,4096)};
 if(value instanceof ArrayBuffer)return {$buffer:Array.from(new Uint8Array(value)).slice(0,4096)};
 if(Array.isArray(value))return value.slice(0,4096).map(item=>cloneSafe(item,memo,depth+1));
 const proto=Object.getPrototypeOf(value);
 if(proto!==Object.prototype&&proto!==null)return undefined;
 const out={};let count=0;
 for(const key of Object.keys(value)){
  if(++count>3000)break;
  const c=cloneSafe(value[key],memo,depth+1);if(c!==undefined)out[key]=c;
 }
 return out;
}
function revive(value){
 if(value==null||typeof value!=='object')return value;
 if(Array.isArray(value))return value.map(revive);
 if(value.$date)return new Date(value.$date);
 if(value.$map)return new Map(value.$map.map(([k,v])=>[revive(k),revive(v)]));
 if(value.$set)return new Set(value.$set.map(revive));
 if(value.$typed){const C=globalThis[value.$typed]||Uint8Array;try{return new C(value.values||[]);}catch{return value.values||[];}}
 if(value.$buffer)return new Uint8Array(value.$buffer).buffer;
 const out={};for(const [key,item] of Object.entries(value))out[key]=revive(item);return out;
}
function snapshotEngine(engine){
 const out={};
 for(const key of Reflect.ownKeys(engine||{})){
  if(typeof key!=='string'||CONTROL_KEYS.has(key))continue;
  const descriptor=Object.getOwnPropertyDescriptor(engine,key);
  if(!descriptor||!('value'in descriptor)||typeof descriptor.value==='function')continue;
  if(!ENGINE_KEYS.has(key)&&key.startsWith('_'))continue;
  const value=cloneSafe(descriptor.value);if(value!==undefined)out[key]=value;
 }
 return out;
}
function applyEngine(engine,snapshot){
 if(!engine||!snapshot)return;
 for(const [key,value] of Object.entries(snapshot)){
  if(CONTROL_KEYS.has(key))continue;
  try{engine[key]=revive(value);}catch{}
 }
}
function makeCheckpoint(a){
 const state={
  version:176,savedAt:Date.now(),phase:a.phase,credit:Number(a.credit)||0,displayCredit:Number(a.displayCredit)||0,
  bets:cloneSafe(a.bets)||[],locked:cloneSafe(a.locked)||[],enabled:cloneSafe(a.enabled)||[],paid:cloneSafe(a.paid)||[],
  draws:cloneSafe(a.draws)||[],roundWins:cloneSafe(a.roundWins)||[],totalWin:Number(a.totalWin)||0,
  wonderBank:cloneSafe(a.wonderBank)||[],wonderSteps:Number(a.wonderSteps)||0,wonderValue:Number(a.wonderValue)||0,
  engines:(a.engines||[]).map(snapshotEngine)
 };
 const text=JSON.stringify(state);
 if(text.length<=1450000)return state;
 return {...state,engines:(a.engines||[]).map(engine=>({kind:engine?.kind,state:cloneSafe(engine?.state),totalHundredths:Number(engine?.totalHundredths)||0,processed:Number(engine?.processed)||0,accepted:Number(engine?.accepted)||0}))};
}
function applyCheckpoint(a,state){
 if(!a||!state)return false;
 for(const key of ['credit','displayCredit','bets','locked','enabled','paid','draws','roundWins','totalWin','wonderBank','wonderSteps','wonderValue']){
  if(key in state)try{a[key]=revive(state[key]);}catch{}
 }
 (state.engines||[]).forEach((snapshot,index)=>applyEngine(a.engines?.[index],snapshot));
 try{typeof scheduleUI==='function'&&scheduleUI(a);}catch{}
 try{a.onChange?.(a);}catch{}
 return true;
}
function totalBet(a){
 return (a.locked||a.bets||[]).reduce((sum,value,index)=>sum+(a.enabled?.[index]===false?0:Number(value)||0),0);
}
function repaint(a){
 try{typeof renderRoundResult==='function'&&renderRoundResult(a);}catch{}
 try{typeof scheduleUI==='function'&&scheduleUI(a);}catch{}
 try{a.onChange?.(a);}catch{}
}
function appVersion(){
 try{return document.documentElement.dataset.appVersion||window.APP_VERSION||VERSION;}catch{return VERSION;}
}
function digestRound(a,roundId){
 const source=`${roundId}|${(a.draws||[]).join(',')}|${(a.roundWins||[]).join(',')}|${Number(a.totalWin)||0}`;
 let hash=2166136261;for(let i=0;i<source.length;i++){hash^=source.charCodeAt(i);hash=Math.imul(hash,16777619);}return (hash>>>0).toString(16);
}

function ensureStyles(){
 if(document.getElementById('shared-machine-v176-style'))return;
 const style=document.createElement('style');style.id='shared-machine-v176-style';style.textContent=`
 .shared-machine-v176-badge{position:fixed;right:8px;bottom:8px;z-index:10020;min-width:98px;padding:5px 8px;border:1px solid #ffffff88;border-radius:10px;background:#071725d9;color:#d7f5ff;font:700 10px/1.2 system-ui,sans-serif;text-align:center;box-shadow:0 2px 9px #0008;pointer-events:none;opacity:.9}
 .shared-machine-v176-badge[data-state="host"]{color:#fff2a7;border-color:#ffd75eaa}.shared-machine-v176-badge[data-state="offline"]{display:none}
 .shared-machine-v176-recovery{position:fixed;inset:0;z-index:10030;display:grid;place-items:center;background:#06121d99;padding:18px}
 .shared-machine-v176-card{width:min(360px,92vw);padding:18px;border:3px solid #e4bc5c;border-radius:18px;background:linear-gradient(#eafaff,#bdeaff);box-shadow:0 12px 40px #0009;text-align:center;color:#174e6c;font:800 14px/1.5 system-ui,sans-serif}
 .shared-machine-v176-card h3{margin:0 0 7px;color:#fff;-webkit-text-stroke:1px #367fa5;font:1000 24px/1.2 system-ui,sans-serif}.shared-machine-v176-card button{margin-top:12px;padding:9px 22px;border:2px solid #fff1a9;border-radius:12px;background:linear-gradient(#ffdb65,#ef9e25);color:#fff;text-shadow:0 1px #9a5414;font:1000 16px/1 system-ui,sans-serif;box-shadow:0 3px 0 #9d621e;cursor:pointer}
 `;document.head.append(style);
}
function badge(){
 ensureStyles();let element=document.querySelector('.shared-machine-v176-badge');
 if(!element){element=document.createElement('div');element.className='shared-machine-v176-badge';element.dataset.state='offline';document.body.append(element);}
 return element;
}
function setBadge(text,state='follower'){
 const element=badge();element.textContent=text;element.dataset.state=state;
}
function statusText(text,label='共有抽選'){
 try{typeof countdownText==='function'&&countdownText(text,label);}catch{}
}

class SharedClient{
 constructor(base,machineId){
  this.base=base;this.machineId=machineId;this.online=false;this.playerId='';this.token='';this.role='offline';this.round=null;
  this.ws=null;this.listeners=new Set();this.ready=this.init();this.reconnectTimer=0;
 }
 async request(path,{method='GET',body,auth=true,timeout=1800}={}){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
  try{
   const headers={'Content-Type':'application/json'};
   if(auth&&this.token){headers.Authorization=`Bearer ${this.token}`;headers['X-Player-Id']=this.playerId;}
   const response=await fetch(this.base+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),signal:controller.signal,cache:'no-store'});
   const data=await response.json().catch(()=>({ok:false,error:'invalid_response'}));
   if(!response.ok){const error=Error(data.error||`HTTP ${response.status}`);error.status=response.status;error.data=data;throw error;}
   return data;
  }finally{clearTimeout(timer);}
 }
 async init(){
  if(SHARED_DISABLED){setBadge('', 'offline');return false;}
  try{
   const health=await this.request('/api/health',{auth:false,timeout:900});
   if(!health?.ok)throw Error('shared server unavailable');
   const saved=readJSON(SESSION_KEY,{});
   this.playerId=String(saved.playerId||'');this.token=String(saved.token||'');
   const session=await this.request('/api/session',{method:'POST',auth:false,timeout:1400,body:{playerId:this.playerId,displayName:saved.displayName||'PLAYER'},headers:this.token?{Authorization:`Bearer ${this.token}`}:{}}).catch(async()=>{
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),1400);
    try{
     const response=await fetch(this.base+'/api/session',{method:'POST',headers:{'Content-Type':'application/json',...(this.token?{Authorization:`Bearer ${this.token}`}:{})},body:JSON.stringify({playerId:this.playerId,displayName:saved.displayName||'PLAYER'}),signal:controller.signal});
     if(!response.ok)throw Error('session failed');return response.json();
    }finally{clearTimeout(timer);}
   });
   this.playerId=session.player.id;this.token=session.token;writeJSON(SESSION_KEY,{playerId:this.playerId,token:this.token,displayName:session.player.displayName});
   this.online=true;this.connect();
   const state=await this.state();this.applySnapshot(state);setBadge('共有抽選 接続中','follower');
   return true;
  }catch(error){
   this.online=false;this.role='offline';setBadge('', 'offline');console.info('[SharedMachineV176] local mode',error?.message||error);return false;
  }
 }
 async authed(path,options={}){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),options.timeout||2200);
  try{
   const response=await fetch(this.base+path,{method:options.method||'GET',headers:{'Content-Type':'application/json',Authorization:`Bearer ${this.token}`,'X-Player-Id':this.playerId},body:options.body===undefined?undefined:JSON.stringify(options.body),signal:controller.signal,cache:'no-store'});
   const data=await response.json().catch(()=>({ok:false,error:'invalid_response'}));
   if(!response.ok){const error=Error(data.error||`HTTP ${response.status}`);error.status=response.status;error.data=data;throw error;}
   return data;
  }finally{clearTimeout(timer);}
 }
 state(){return this.authed(`/api/machines/${this.machineId}/state`);}
 join(body){return this.authed(`/api/machines/${this.machineId}/round/join`,{method:'POST',body,timeout:3000});}
 report(body){return this.authed(`/api/machines/${this.machineId}/round/ball`,{method:'POST',body,timeout:2200});}
 checkpoint(body){return this.authed(`/api/machines/${this.machineId}/round/checkpoint`,{method:'POST',body,timeout:3500});}
 settle(body){return this.authed(`/api/machines/${this.machineId}/round/settle`,{method:'POST',body,timeout:3000});}
 connect(){
  if(!this.online||!this.token)return;
  clearTimeout(this.reconnectTimer);
  try{
   const url=new URL(this.base);url.protocol=url.protocol==='https:'?'wss:':'ws:';url.pathname='/ws';url.search='';
   url.searchParams.set('machineId',this.machineId);url.searchParams.set('playerId',this.playerId);url.searchParams.set('token',this.token);
   const ws=new WebSocket(url);this.ws=ws;
   ws.onmessage=event=>{try{this.handle(JSON.parse(event.data));}catch{}};
   ws.onopen=()=>{this.online=true;try{ws.send(JSON.stringify({type:'ping'}));}catch{}};
   ws.onclose=()=>{if(this.ws===ws)this.ws=null;if(this.online)this.reconnectTimer=setTimeout(()=>this.connect(),1500);};
  }catch(error){console.warn('[SharedMachineV176] websocket',error);}
 }
 handle(message){
  if(message.type==='snapshot')this.applySnapshot(message);
  if(message.type==='host_changed'){this.role=message.hostPlayerId===this.playerId?'host':'follower';setBadge(this.role==='host'?'共有抽選 HOST':'共有抽選 FOLLOW',this.role);}
  if(message.round)this.round=message.round;
  for(const listener of this.listeners)try{listener(message);}catch(error){console.error(error);}
 }
 applySnapshot(data){
  if(!data)return;this.round=data.round||this.round;this.role=data.role||(data.machine?.hostPlayerId===this.playerId?'host':'follower');
  setBadge(this.role==='host'?'共有抽選 HOST':'共有抽選 FOLLOW',this.role);
  for(const listener of this.listeners)try{listener(data);}catch{}
 }
 on(listener){this.listeners.add(listener);return()=>this.listeners.delete(listener);}
}

const shared=new SharedClient(SERVER_BASE,MACHINE_ID);
let active=null,resumeRoundId=null,recoveryShown=false;

function enqueueBall(ball,{catchup=false}={}){
 if(!active||!ball||ball.index<=active.delivered||active.roundId!==shared.round?.id&&active.roundId!==ball.roundId)return;
 active.pending.set(Number(ball.index),{index:Number(ball.index),number:Number(ball.number),catchup});
 drainBalls();
}
async function drainBalls(){
 if(!active||active.draining)return;active.draining=true;
 try{
  while(active&&!active.stopped){
   const next=active.pending.get(active.delivered+1);if(!next)break;
   active.pending.delete(next.index);
   try{active.callbacks.onNumber?.(next.number);}catch(error){console.error('[SharedMachineV176] number delivery',error);}
   active.delivered=next.index;
   active.lastNumber=next.number;
   statusText(`${active.delivered} / 8球　${next.number} HIT`,active.role==='host'?'共有抽選 HOST':'共有抽選');
   scheduleCheckpoint(active.delivered);
   if(next.catchup)await sleep(100);
  }
 }finally{if(active)active.draining=false;}
}
function scheduleCheckpoint(ballIndex){
 if(!active||!shared.online)return;
 clearTimeout(active.checkpointTimer);
 active.checkpointTimer=setTimeout(()=>{
  const run=()=>{
   if(!active||active.roundId!==shared.round?.id)return;
   let state;try{state=makeCheckpoint(app);}catch(error){console.warn('[SharedMachineV176] checkpoint capture',error);return;}
   shared.checkpoint({roundId:active.roundId,ballIndex,state}).catch(error=>console.warn('[SharedMachineV176] checkpoint upload',error?.message||error));
  };
  if('requestIdleCallback'in window)requestIdleCallback(run,{timeout:1600});else setTimeout(run,0);
 },950);
}
function stopNative(){
 if(!active?.nativeStarted)return;
 try{active.nativeReset?.();}catch{}
 active.nativeStarted=false;
}
function startHostNative(){
 if(!active||active.stopped||active.nativeStarted||active.role!=='host'||active.delivered>=8)return;
 active.nativeStarted=true;
 setBadge('共有抽選 HOST','host');statusText('実抽選の入賞番号を全員へ配信','共有抽選 HOST');
 const callbacks=active.callbacks;
 active.nativeStart({...callbacks,onNumber:actual=>{
  if(!active||active.stopped||active.role!=='host'||active.delivered>=8)return;
  const index=active.delivered+1,number=Number(actual);
  enqueueBall({index,number},{catchup:false});
  shared.report({roundId:active.roundId,ballIndex:index,number,eventId:`${active.roundId}:${index}`}).then(data=>{
   if(data.ball&&Number(data.ball.number)!==number){
    console.error('[SharedMachineV176] authoritative mismatch',number,data.ball.number);
    statusText('番号同期エラー：抽選を停止しました','共有抽選');stopNative();
   }
  }).catch(error=>{
   console.warn('[SharedMachineV176] report retry',error?.message||error);
   setTimeout(()=>{
    if(active&&active.roundId)shared.report({roundId:active.roundId,ballIndex:index,number,eventId:`${active.roundId}:${index}`}).catch(()=>{});
   },700);
  });
  if(index>=8)setTimeout(stopNative,80);
 });
 try{rouletteDriver?.setPaused(app.paused);}catch{}
}
async function beginShared(callbacks,nativeStart,nativeReset){
 const ready=await Promise.race([shared.ready,sleep(350).then(()=>false)]);
 if(!ready||!shared.online){nativeStart(callbacks);return;}
 try{
  const response=await shared.join({
   clientRoundToken:String(callbacks.token||app.token||''),resumeRoundId,
   bets:[...(app.bets||[])],locked:[...(app.locked||app.bets||[])],enabled:[...(app.enabled||[])],
   totalBet:totalBet(app),creditAfterBet:Number(app.credit)||0,initialState:null,appVersion:appVersion()
  });
  shared.applySnapshot(response);const round=response.round;if(!round)throw Error('round unavailable');
  const participant=round.participant||{};
  active={roundId:round.id,callbacks,nativeStart,nativeReset,role:response.role||shared.role,delivered:0,pending:new Map(),draining:false,nativeStarted:false,stopped:false,checkpointTimer:0,settleSent:false,participant};
  app.__sharedRound=active;resumeRoundId=null;
  if(participant.settlement){
   app.credit=Number(participant.settlement.creditAfter)||app.credit;app.displayCredit=app.credit;app.phase='complete';app.dealing=false;repaint(app);return;
  }
  const checkpointBall=Math.max(0,Math.min(8,Number(participant.checkpointBall)||0));
  if(participant.checkpoint&&checkpointBall>0){applyCheckpoint(app,participant.checkpoint);active.delivered=checkpointBall;}
  const balls=[...(round.balls||[])].sort((a,b)=>a.index-b.index);
  for(const ball of balls)if(ball.index>active.delivered)enqueueBall({...ball,roundId:round.id},{catchup:true});
  if(active.role==='host')setTimeout(startHostNative,Math.max(0,(balls.length-active.delivered)*110));
  else{setBadge('共有抽選 FOLLOW','follower');statusText('ホストの実抽選を待機','共有抽選');}
  scheduleCheckpoint(active.delivered);
 }catch(error){
  console.warn('[SharedMachineV176] join failed; native local fallback',error?.message||error);active=null;app.__sharedRound=null;nativeStart(callbacks);
 }
}
function settlementFromServer(){return active?.participant?.settlement||shared.round?.participant?.settlement||null;}
function settleCurrent(a){
 if(!active||active.settleSent||!shared.online)return;
 active.settleSent=true;
 const predictedCredit=Math.max(0,Number(a.credit)||0)+(Number(a.totalWin)||0);
 shared.settle({roundId:active.roundId,totalWin:Number(a.totalWin)||0,creditAfter:predictedCredit,digest:digestRound(a,active.roundId)}).then(data=>{
  if(active)active.participant={...(active.participant||{}),settlement:data.settlement};
 }).catch(error=>{if(active)active.settleSent=false;console.warn('[SharedMachineV176] settlement',error?.message||error);});
}

function recoveryDialog(round){
 if(recoveryShown||!round?.participant||typeof app==='undefined'||app.phase!=='ready')return;
 const participant=round.participant;
 if(participant.settlement){
  app.credit=Number(participant.settlement.creditAfter)||app.credit;app.displayCredit=app.credit;repaint(app);return;
 }
 recoveryShown=true;ensureStyles();
 const layer=document.createElement('div');layer.className='shared-machine-v176-recovery';
 const balls=(round.balls||[]).map(ball=>ball.number).join('　')||'まだ入賞なし';
 layer.innerHTML=`<div class="shared-machine-v176-card"><h3>共有ラウンド復元</h3><div>${round.balls?.length||0} / 8球までサーバーに保存されています。</div><div style="margin-top:7px;font-size:18px">${balls}</div><button type="button">同じ結果から再開</button></div>`;
 layer.querySelector('button').onclick=()=>{
  layer.remove();resumeRoundId=round.id;
  app.bets=[...(participant.bets||app.bets||[])];app.locked=[...(participant.locked||participant.bets||app.bets||[])];app.enabled=[...(participant.enabled||app.enabled||[])];
  app.credit=(Number(participant.creditAfterBet)||0)+(Number(participant.totalBet)||0);app.displayCredit=app.credit;repaint(app);
  try{app.start();}catch(error){console.error('[SharedMachineV176] resume',error);recoveryShown=false;}
 };
 document.body.append(layer);
}

function install(){
 if(typeof Arcade!=='function'||typeof app==='undefined'||!app||typeof rouletteDrawSource==='undefined'){setTimeout(install,60);return;}
 const proto=Arcade.prototype;if(proto.__sharedMachineV176)return;
 Object.defineProperty(proto,'__sharedMachineV176',{value:true});
 const nativeStart=rouletteDrawSource.start.bind(rouletteDrawSource),nativeReset=rouletteDrawSource.reset.bind(rouletteDrawSource);
 const nativeBegin=proto.beginPayout,nativeAdvance=proto.advancePayout,nativePrepare=proto.prepare;
 rouletteDrawSource.start=function(callbacks){
  if(typeof manualNumbers!=='undefined'&&manualNumbers)return nativeStart(callbacks);
  beginShared(callbacks,nativeStart,nativeReset);
 };
 rouletteDrawSource.reset=function(...args){
  if(active){active.stopped=true;clearTimeout(active.checkpointTimer);active=null;app.__sharedRound=null;}
  return nativeReset(...args);
 };
 proto.beginPayout=function(...args){
  const settlement=settlementFromServer();
  if(active&&settlement){this.credit=Number(settlement.creditAfter)||this.credit;this.displayCredit=this.credit;this.payout=null;this.phase='complete';repaint(this);return true;}
  if(active)settleCurrent(this);
  return nativeBegin.apply(this,args);
 };
 proto.advancePayout=function(...args){
  const result=nativeAdvance.apply(this,args);
  if(active&&this.phase==='complete')settleCurrent(this);
  return result;
 };
 proto.prepare=function(...args){
  const previous=this.phase,result=nativePrepare.apply(this,args);
  if(active&&['complete','ready'].includes(previous)){active.stopped=true;clearTimeout(active.checkpointTimer);active=null;this.__sharedRound=null;}
  return result;
 };
 shared.on(message=>{
  if(message.type==='snapshot'&&message.round)recoveryDialog(message.round);
  if(!active)return;
  if(message.type==='host_changed'&&(!message.roundId||message.roundId===active.roundId)){
   active.role=message.hostPlayerId===shared.playerId?'host':'follower';
   if(active.role==='host')startHostNative();else stopNative();
  }
  if(message.type==='ball_result'&&message.roundId===active.roundId)enqueueBall({...message.ball,roundId:message.roundId},{catchup:false});
  if(message.type==='round_complete'&&message.round?.id===active.roundId)scheduleCheckpoint(8);
 });
 shared.ready.then(ok=>{if(ok&&shared.round)recoveryDialog(shared.round);});
 window.SweetsSharedMachine={
  version:VERSION,client:shared,get active(){return active;},get online(){return shared.online;},get role(){return shared.role;},
  reconnect:()=>shared.connect(),state:()=>shared.state(),disable:()=>localStorage.setItem(SERVER_KEY,'')
 };
 console.info('[SharedMachineV176] native host result, shared delivery, recovery checkpoint and idempotent settlement enabled');
}
install();
})();

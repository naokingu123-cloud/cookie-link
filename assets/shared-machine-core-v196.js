(()=>{
'use strict';
if(window.__sweetsSharedMachineV204)return;
window.__sweetsSharedMachineV204=true;

const VERSION='v204';
const SERVER_KEY='sweets-shared-server-v176';
const MACHINE_KEY='sweets-shared-machine-v176';
const ABANDONED_ROUND_KEY='sweets-shared-abandoned-round-v194';
const query=new URLSearchParams(location.search);
const SERVER_HOST=query.get('serverHost')==='1';
const SESSION_KEY=SERVER_HOST?'sweets-shared-host-session-v225':'sweets-shared-session-v176';
const ADMIN_TOKEN=query.get('adminToken')||'';
const explicit=query.get('sharedServer')||query.get('server')||'';
if(explicit)try{localStorage.setItem(SERVER_KEY,explicit);}catch{}
const savedServer=(()=>{try{return localStorage.getItem(SERVER_KEY)||'';}catch{return '';}})();
const sameOriginServer=SERVER_HOST||!/\.github\.io$/i.test(location.hostname);
const DISCOVERY_MODE=!explicit&&!sameOriginServer;
let BASE=String(explicit||(sameOriginServer?location.origin:'')).replace(/\/$/,'');
const MACHINE=String(query.get('machine')||localStorage.getItem(MACHINE_KEY)||'public-01').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,64)||'public-01';
async function resolveServerBase(){
 if(!DISCOVERY_MODE)return BASE||(savedServer||'').replace(/\/$/,'');
 try{
  const endpointUrl=new URL('shared-endpoint.json',location.href);
  endpointUrl.searchParams.set('_',String(Date.now()));
  const response=await fetch(endpointUrl,{cache:'no-store'});
  if(response.ok){
   const data=await response.json();
   const candidate=String(data?.server||'').replace(/\/$/,'');
   const machine=String(data?.machine||MACHINE);
   let valid=false;
   try{
    const parsed=new URL(candidate);
    valid=parsed.protocol==='https:'&&!parsed.username&&!parsed.password&&parsed.pathname==='/'&&!parsed.search&&!parsed.hash;
   }catch{}
   if(valid&&machine===MACHINE){
    BASE=candidate;
    try{localStorage.setItem(SERVER_KEY,BASE);}catch{}
    return BASE;
   }
  }
 }catch(error){console.warn('[SharedMachineV204] endpoint discovery',error?.message||error);}
 BASE=(savedServer||'').replace(/\/$/,'');
 return BASE;
}
// v180 server-only client: legacy ?shared=0 never enables local roulette.
try{localStorage.setItem(MACHINE_KEY,MACHINE);}catch{}
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const read=(key,fallback)=>{try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback;}catch{return fallback;}};
const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{}};
const CONTROLS=new Set(['onEvent','beforeComplete','sleep','random','view','canvas','ctx','context','storage','persistence']);

function clone(value,seen=new WeakSet(),depth=0){
 if(value==null||['string','number','boolean'].includes(typeof value))return value;
 if(typeof value==='bigint')return Number(value);
 if(typeof value==='function'||typeof value==='symbol'||depth>13)return undefined;
 if(typeof Node!=='undefined'&&value instanceof Node)return undefined;
 if(seen.has(value))return undefined;seen.add(value);
 if(Array.isArray(value))return value.slice(0,4096).map(item=>clone(item,seen,depth+1));
 if(value instanceof Map)return {$map:[...value].slice(0,4096).map(([k,v])=>[clone(k,seen,depth+1),clone(v,seen,depth+1)])};
 if(value instanceof Set)return {$set:[...value].slice(0,4096).map(item=>clone(item,seen,depth+1))};
 if(ArrayBuffer.isView(value))return {$typed:value.constructor?.name||'Uint8Array',values:Array.from(value).slice(0,4096)};
 const proto=Object.getPrototypeOf(value);
 if(proto!==Object.prototype&&proto!==null)return undefined;
 const out={};let count=0;
 for(const key of Object.keys(value)){if(++count>3000)break;const item=clone(value[key],seen,depth+1);if(item!==undefined)out[key]=item;}
 return out;
}
function revive(value){
 if(value==null||typeof value!=='object')return value;
 if(Array.isArray(value))return value.map(revive);
 if(value.$map)return new Map(value.$map.map(([k,v])=>[revive(k),revive(v)]));
 if(value.$set)return new Set(value.$set.map(revive));
 if(value.$typed){const C=globalThis[value.$typed]||Uint8Array;try{return new C(value.values||[]);}catch{return value.values||[];}}
 const out={};for(const [key,item] of Object.entries(value))out[key]=revive(item);return out;
}
function engineSnapshot(engine){
 const out={};
 for(const key of Reflect.ownKeys(engine||{})){
  if(typeof key!=='string'||CONTROLS.has(key))continue;
  const descriptor=Object.getOwnPropertyDescriptor(engine,key);
  if(!descriptor||!('value'in descriptor)||typeof descriptor.value==='function')continue;
  const item=clone(descriptor.value);if(item!==undefined)out[key]=item;
 }
 return out;
}
function checkpoint(a){
 const state={
  version:176,savedAt:Date.now(),phase:a.phase,credit:Number(a.credit)||0,displayCredit:Number(a.displayCredit)||0,
  bets:clone(a.bets)||[],locked:clone(a.locked)||[],enabled:clone(a.enabled)||[],paid:clone(a.paid)||[],draws:clone(a.draws)||[],
  roundWins:clone(a.roundWins)||[],totalWin:Number(a.totalWin)||0,wonderBank:clone(a.wonderBank)||[],wonderSteps:Number(a.wonderSteps)||0,
  wonderValue:Number(a.wonderValue)||0,engines:(a.engines||[]).map(engineSnapshot)
 };
 if(JSON.stringify(state).length<1500000)return state;
 state.engines=(a.engines||[]).map(engine=>({kind:engine?.kind,state:clone(engine?.state),processed:Number(engine?.processed)||0,accepted:Number(engine?.accepted)||0,totalHundredths:Number(engine?.totalHundredths)||0}));
 return state;
}
function restore(a,state){
 if(!state)return false;
 for(const key of ['credit','displayCredit','bets','locked','enabled','paid','draws','roundWins','totalWin','wonderBank','wonderSteps','wonderValue'])if(key in state)try{a[key]=revive(state[key]);}catch{}
 (state.engines||[]).forEach((saved,index)=>{const engine=a.engines?.[index];if(!engine)return;for(const [key,value] of Object.entries(saved))if(!CONTROLS.has(key))try{engine[key]=revive(value);}catch{}});
 repaint(a);return true;
}
function repaint(a){try{typeof renderRoundResult==='function'&&renderRoundResult(a);}catch{}try{typeof scheduleUI==='function'&&scheduleUI(a);}catch{}try{a.onChange?.(a);}catch{}}
function totalBet(a){return (a.locked||a.bets||[]).reduce((sum,value,index)=>sum+(a.enabled?.[index]===false?0:Number(value)||0),0);}
function digest(a,id){const text=`${id}|${(a.draws||[]).join(',')}|${(a.roundWins||[]).join(',')}|${Number(a.totalWin)||0}`;let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return(h>>>0).toString(16);}
function status(text,label='共有抽選'){try{typeof countdownText==='function'&&countdownText(text,label);}catch{}}
function styles(){
 if(document.getElementById('shared-machine-v179-css'))return;
 const style=document.createElement('style');style.id='shared-machine-v179-css';style.textContent=`.shared-v179-badge{position:fixed;right:8px;bottom:8px;z-index:10020;padding:5px 8px;border:1px solid #ffffff88;border-radius:10px;background:#071725de;color:#d9f5ff;font:700 10px/1.2 system-ui;box-shadow:0 2px 9px #0008;pointer-events:none}.shared-v179-badge[data-role=host]{color:#fff1a0;border-color:#ffd75eaa}.shared-v179-badge[data-role=offline]{display:block;color:#ffd6d6;border-color:#ff7777aa;background:#2a0d12e8}.shared-v179-recovery{position:fixed;inset:0;z-index:10030;display:grid;place-items:center;background:#06121d99;padding:18px}.shared-v179-card{width:min(360px,92vw);padding:18px;border:3px solid #e4bc5c;border-radius:18px;background:linear-gradient(#eafaff,#bdeaff);box-shadow:0 12px 40px #0009;text-align:center;color:#174e6c;font:800 14px/1.5 system-ui}.shared-v179-card h3{margin:0 0 7px;color:#fff;-webkit-text-stroke:1px #367fa5;font:1000 24px/1.2 system-ui}.shared-v179-card button{margin-top:12px;padding:9px 22px;border:2px solid #fff1a9;border-radius:12px;background:linear-gradient(#ffdb65,#ef9e25);color:#fff;text-shadow:0 1px #9a5414;font:1000 16px/1 system-ui;box-shadow:0 3px 0 #9d621e}`;document.head.append(style);
}
function badge(text='',role='offline'){styles();let node=document.querySelector('.shared-v179-badge');if(!node){node=document.createElement('div');node.className='shared-v179-badge';document.body.append(node);}node.textContent=text;node.dataset.role=role;}
let serverGateLayer=null;
function closeServerGate(){if(serverGateLayer){serverGateLayer.remove();serverGateLayer=null;}}
function serverRequired(message='サーバー抽選機に接続できません',retry=null){
 status(message,'共有抽選 SERVER');badge('SERVER REQUIRED','offline');styles();
 if(serverGateLayer){const text=serverGateLayer.querySelector('[data-server-message]');if(text)text.textContent=message;serverGateLayer.__retry=retry;return;}
 const layer=document.createElement('div');layer.className='shared-v179-recovery';layer.dataset.kind='server-required';layer.__retry=retry;
 layer.innerHTML='<div class="shared-v179-card"><h3>SERVER REQUIRED</h3><div data-server-message></div><div style="margin-top:8px">このクライアントではローカル抽選機を使用しません。サーバーの抽選結果を受信できるまでゲーム抽選は開始されません。</div><div data-server-base style="margin-top:8px;font:700 10px/1.35 monospace;word-break:break-all;opacity:.8"></div><button type="button">再接続</button></div>';
 layer.querySelector('[data-server-message]').textContent=message;
 const baseNode=layer.querySelector('[data-server-base]');if(baseNode)baseNode.textContent='SERVER: '+(BASE||'(未指定)');
 const button=layer.querySelector('button');
 button.onclick=async()=>{button.disabled=true;button.textContent='接続中…';try{const ok=await client.reconnect();if(ok){const run=layer.__retry;closeServerGate();if(typeof run==='function')run();}else{layer.querySelector('[data-server-message]').textContent='サーバー抽選機に接続できません';}}catch(error){layer.querySelector('[data-server-message]').textContent='再接続に失敗しました';console.warn('[SharedMachineV204] reconnect',error);}finally{if(serverGateLayer){button.disabled=false;button.textContent='再接続';}}};
 serverGateLayer=layer;document.body.append(layer);
}

class Client{
 constructor(){
  this.online=false;this.playerId='';this.token='';this.role='offline';this.round=null;this.pendingRound=null;this.ws=null;this.listeners=new Set();
  this.hostAvailable=SERVER_HOST;this.hostRegistered=false;this.lastError='';this.reconnectTimer=0;this.connectPromise=null;this.stateRequest=null;this.reconnectAttempt=0;this.clockOffset=0;
  this.httpRetryAt=0;this.httpFailures=0;this.initPromise=null;this.initTimer=0;this.initAttempt=0;this.stateRetryTimer=0;this.stateRetryAttempt=0;this.stateStamp=null;this.ready=this.init();
 }
 errorText(error){
  if(!BASE)return DISCOVERY_MODE?'サーバー自動検出に失敗しました':'接続先URLが指定されていません';
  if(error?.name==='AbortError')return '接続タイムアウト';
  const code=error?.data?.error||error?.message||String(error||'接続エラー');
  return String(code);
 }
 syncReady(){
  if(SERVER_HOST)return;
  window.__sweetsSharedClientReady=!!this.online;
  try{if(typeof syncDebugButtons==='function')syncDebugButtons();if(typeof scheduleAutoRound==='function'&&app?.phase==='ready')scheduleAutoRound();}catch{}
 }
 async raw(path,{method='GET',body,timeout=8000,auth=true}={}){
  if(!BASE)throw Error('sharedServer_missing');
  if(Date.now()<Number(this.httpRetryAt||0)){
   const retryAfterMs=this.httpRetryAt-Date.now();
   throw Object.assign(Error('rate_limited'),{status:429,retryAfterMs,deferred:true,data:{ok:false,error:'rate_limited',retryAfterMs}});
  }
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
  try{
   const headers={'Content-Type':'application/json'};
   if(auth&&this.token){headers.Authorization=`Bearer ${this.token}`;headers['X-Player-Id']=this.playerId;}
   const response=await fetch(BASE+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',signal:controller.signal});
   const data=await response.json().catch(()=>({error:'invalid_response'}));
   if(!response.ok){
    const error=Error(data.error||`HTTP ${response.status}`);error.status=response.status;error.data=data;
    const retryAfter=String(response.headers?.get?.('Retry-After')||'').trim();
    const headerDelay=retryAfter?(/^\d+(?:\.\d+)?$/.test(retryAfter)?Number(retryAfter)*1000:Date.parse(retryAfter)-Date.now()):0;
    error.retryAfterMs=Math.max(0,Number(data.retryAfterMs)||0,Number.isFinite(headerDelay)?headerDelay:0);
    if(response.status===429){
     this.httpFailures=Math.min(6,Number(this.httpFailures||0)+1);
     error.retryAfterMs=Math.max(error.retryAfterMs,Math.min(30000,1000*Math.pow(2,this.httpFailures-1)));
     this.httpRetryAt=Math.max(Number(this.httpRetryAt)||0,Date.now()+error.retryAfterMs);
    }
    throw error;
   }
   if(Date.now()>=Number(this.httpRetryAt||0)){this.httpRetryAt=0;this.httpFailures=0;}
   return data;
  }finally{clearTimeout(timer);}
 }
 async connect({timeout=9000,force=false}={}){
  clearTimeout(this.reconnectTimer);this.reconnectTimer=0;
  if(!force&&this.ws?.readyState===WebSocket.OPEN){this.online=true;this.syncReady();return true;}
  if(!force&&this.connectPromise)return this.connectPromise;
  if(force&&this.ws){const old=this.ws;this.ws=null;try{old.close();}catch{}}
  const url=new URL(BASE);url.protocol=url.protocol==='https:'?'wss:':'ws:';url.pathname='/ws';url.search='';
  url.searchParams.set('machineId',MACHINE);url.searchParams.set('playerId',this.playerId);url.searchParams.set('token',this.token);
  this.connectPromise=new Promise((resolve,reject)=>{
   let settled=false,opened=false;const ws=new WebSocket(url);this.ws=ws;
   const timer=setTimeout(()=>{if(settled)return;settled=true;this.connectPromise=null;try{ws.close();}catch{}reject(Object.assign(Error('websocket_timeout'),{name:'AbortError'}));},timeout);
   ws.onopen=()=>{if(settled)return;opened=true;settled=true;clearTimeout(timer);this.connectPromise=null;this.online=true;this.reconnectAttempt=0;this.lastError='';this.syncReady();resolve(true);};
   ws.onmessage=event=>{try{this.accept(JSON.parse(event.data));}catch(error){console.warn('[SharedMachineV204] websocket message',error);}};
   ws.onerror=()=>{if(!settled){settled=true;clearTimeout(timer);this.connectPromise=null;reject(Error('websocket_error'));}};
   ws.onclose=()=>{
    if(this.ws!==ws)return;
    this.ws=null;this.connectPromise=null;this.online=false;this.hostRegistered=false;this.syncReady();
    if(!settled){settled=true;clearTimeout(timer);reject(Error('websocket_closed'));}
    if(opened)this.scheduleReconnect();
   };
  });
  return this.connectPromise;
 }
 scheduleReconnect(){
  if(this.reconnectTimer||this.connectPromise||this.initPromise||this.ws?.readyState===WebSocket.OPEN)return;
  if(!this.playerId||!this.token){this.scheduleInit();return;}
  const delay=Math.max(Math.min(8000,1000*Math.pow(1.6,Math.min(5,this.reconnectAttempt++))),Number(this.httpRetryAt||0)-Date.now());
  badge('SERVER RECONNECTING','offline');
  this.reconnectTimer=setTimeout(async()=>{
   this.reconnectTimer=0;
   try{
    await this.connect({timeout:12000});
    if(SERVER_HOST&&!this.hostRegistered)this.accept(await this.registerHost());
    const state=await this.getState();this.accept(state);closeServerGate();
   }catch(error){this.lastError=this.errorText(error);if(this.ws?.readyState===WebSocket.OPEN)this.scheduleStateRefresh(error);else this.scheduleReconnect();}
  },delay);
 }
 scheduleStateRefresh(error=null){
  if(this.stateRetryTimer)return;
  const delay=Math.max(800,Math.min(30000,1000*Math.pow(1.6,Math.min(8,this.stateRetryAttempt++))),Number(this.httpRetryAt||0)-Date.now(),Number(error?.retryAfterMs)||0);
  this.stateRetryTimer=setTimeout(async()=>{
   this.stateRetryTimer=0;
   if(this.ws?.readyState!==WebSocket.OPEN){this.scheduleReconnect();return;}
   try{
    if(SERVER_HOST&&!this.hostRegistered)this.accept(await this.registerHost());
    this.accept(await this.getState());this.stateRetryAttempt=0;this.lastError='';closeServerGate();
   }catch(nextError){this.lastError=this.errorText(nextError);this.scheduleStateRefresh(nextError);}
  },delay);
 }
 scheduleInit(error=null){
  if(this.initTimer||this.initPromise||this.ws?.readyState===WebSocket.OPEN)return;
  const delay=Math.max(Math.min(30000,1000*Math.pow(1.6,Math.min(8,this.initAttempt++))),Number(this.httpRetryAt||0)-Date.now(),Number(error?.retryAfterMs)||0);
  this.initTimer=setTimeout(()=>{this.initTimer=0;this.ready=this.init();},delay);
 }
 send(message){
  if(this.ws?.readyState!==WebSocket.OPEN)return false;
  try{this.ws.send(JSON.stringify(message));return true;}catch{return false;}
 }
 init(){
  if(this.initPromise)return this.initPromise;
  clearTimeout(this.initTimer);this.initTimer=0;
  const run=this.initialize();this.initPromise=run;
  run.then(ok=>{if(this.initPromise===run)this.initPromise=null;if(ok)this.initAttempt=0;else this.scheduleInit();},error=>{if(this.initPromise===run)this.initPromise=null;this.lastError=this.errorText(error);this.scheduleInit(error);});
  return run;
 }
 async initialize(){
  let lastError=null;
  for(let attempt=1;attempt<=3;attempt++){
   try{
    await resolveServerBase();
    if(!BASE)throw Error('server_discovery_failed');
    if(this.stateBase!==BASE){this.stateBase=BASE;this.stateStamp=null;this.round=null;this.pendingRound=null;this.httpRetryAt=0;this.httpFailures=0;}
    const health=await this.raw('/api/health',{auth:false,timeout:7000});if(!health.ok)throw Error('health_failed');
    const saved=read(SESSION_KEY,{});let profileName='';
    try{const profile=JSON.parse(localStorage.getItem('sweets-player-v1')||'null');profileName=String(profile?.name||'').trim();}catch{}
    this.playerId=String(saved.playerId||'');this.token=String(saved.token||'');
    const displayName=SERVER_HOST?'SERVER ROULETTE':(profileName||saved.displayName||('PLAYER-'+String(this.playerId||crypto.randomUUID?.()||Date.now()).replace(/[^a-zA-Z0-9]/g,'').slice(0,6)));
    const session=await this.raw('/api/session',{method:'POST',body:{playerId:this.playerId,displayName},timeout:9000,auth:!!this.token});
    this.playerId=session.player.id;this.token=session.token;write(SESSION_KEY,{playerId:this.playerId,token:this.token,displayName:session.player.displayName});
    await this.connect({timeout:12000});
    if(SERVER_HOST){const host=await this.registerHost();this.accept(host);}
    const state=await this.getState();this.accept(state);this.lastError='';closeServerGate();return true;
   }catch(error){
    lastError=error;this.lastError=this.errorText(error);
    // A temporary HTTP error after the WS handshake must not disconnect a
    // healthy result/video channel or restart an already-running physical host.
    if(this.ws?.readyState===WebSocket.OPEN){this.online=true;this.syncReady();this.scheduleStateRefresh(error);closeServerGate();return true;}
    this.online=false;this.syncReady();
    if(this.ws){const old=this.ws;this.ws=null;try{old.close();}catch{}}
    if(attempt<3)await wait(Math.max(700*attempt,Number(error?.retryAfterMs)||0,error?.status===429?1000*Math.pow(2,attempt-1):0));
   }
  }
  this.role='offline';badge('SERVER REQUIRED','offline');
  console.warn('[SharedMachineV204] server connection failed',BASE||'(missing)',this.lastError,lastError);
  return false;
 }
 async reconnect(){
  if(this.ws?.readyState===WebSocket.OPEN){this.online=true;this.syncReady();this.scheduleStateRefresh();return true;}
  if(this.initPromise)return this.initPromise;
  clearTimeout(this.reconnectTimer);this.reconnectTimer=0;this.reconnectAttempt=0;
  if(this.ws){const old=this.ws;this.ws=null;try{old.close();}catch{}}
  this.connectPromise=null;this.online=false;this.role='offline';this.syncReady();this.ready=this.init();return this.ready;
 }
 api(path,options={}){return this.raw(path,{...options,auth:true});}
 getState(){
  if(!this.stateRequest)this.stateRequest=this.api(`/api/machines/${MACHINE}/state`,{timeout:8000}).finally(()=>{this.stateRequest=null;});
  return this.stateRequest;
 }
 async registerHost(){const suffix=ADMIN_TOKEN?'?adminToken='+encodeURIComponent(ADMIN_TOKEN):'';const data=await this.api(`/api/admin/machines/${MACHINE}/host/register${suffix}`,{method:'POST',body:{},timeout:8000});this.hostRegistered=true;return data;}
 join(body){return this.api(`/api/machines/${MACHINE}/round/join`,{method:'POST',body,timeout:8000});}
 leave(body){return this.api(`/api/machines/${MACHINE}/round/leave`,{method:'POST',body,timeout:5000});}
 report(body){return this.api(`/api/machines/${MACHINE}/round/ball`,{method:'POST',body,timeout:7000});}
 save(body){return this.api(`/api/machines/${MACHINE}/round/checkpoint`,{method:'POST',body,timeout:8000});}
 settle(body){return this.api(`/api/machines/${MACHINE}/round/settle`,{method:'POST',body,timeout:8000});}
 isStaleState(message){
  if(!Object.prototype.hasOwnProperty.call(message||{},'round'))return false;
  const stamp=this.stateStamp;if(!stamp)return false;
  const incoming=message.round,sequence=Number(incoming?.sequence),revision=Number(message.machine?.revision),time=Number(message.serverTime);
  if(Number.isFinite(sequence)&&sequence>0&&stamp.sequence>0&&sequence<stamp.sequence)return true;
  if(Number.isFinite(revision)&&revision>=0&&Number.isFinite(stamp.revision)&&revision<stamp.revision)return true;
  if(Number.isFinite(time)&&time>0&&stamp.serverTime>0&&time<stamp.serverTime)return true;
  if(incoming&&incoming.id===stamp.roundId){
   const rank={BETTING:1,PLAYING:2,COMPLETE:3};
   if((rank[incoming.phase]||0)<stamp.phase)return true;
   if(Array.isArray(incoming.balls)&&incoming.balls.length<stamp.ballCount)return true;
  }
  return false;
 }
 accept(message){
  if(this.isStaleState(message))return false;
  const carriesRound=Object.prototype.hasOwnProperty.call(message||{},'round');
  const carriesBall=message?.type==='ball_result'&&message.roundId===this.round?.id&&message.ball;
  // RTC/pong traffic is not an authoritative game-state timestamp. Updating the
  // state watermark from it would reject legitimate in-flight HTTP snapshots.
  if((carriesRound||carriesBall)&&Number.isFinite(Number(message?.serverTime)))this.clockOffset=Number(message.serverTime)-Date.now();
  if(Object.prototype.hasOwnProperty.call(message||{},'round')){
   const incoming=message.round;
   if(incoming&&this.round?.id===incoming.id&&incoming.participant==null&&this.round.participant!=null)incoming.participant=this.round.participant;
   if(incoming&&this.round?.id===incoming.id&&message.type!=='snapshot'&&incoming.canBet===false&&this.round.canBet===true)incoming.canBet=true;
   this.round=incoming;
  }
  if(carriesBall){
   const balls=new Map((this.round.balls||[]).map(ball=>[Number(ball.index),ball]));balls.set(Number(message.ball.index),message.ball);
   this.round={...this.round,balls:[...balls.values()].sort((a,b)=>Number(a.index)-Number(b.index))};
   if(message.phase==='COMPLETE')this.round.phase='COMPLETE';
  }
  if(carriesRound||carriesBall){
   const previous=this.stateStamp||{},round=this.round,rank={BETTING:1,PLAYING:2,COMPLETE:3},revision=Number(message.machine?.revision);
   this.stateStamp={roundId:round?.id||previous.roundId||'',sequence:Math.max(Number(previous.sequence)||0,Number(round?.sequence)||0),phase:rank[round?.phase]||0,ballCount:round?.balls?.length||0,revision:Number.isFinite(revision)?Math.max(Number(previous.revision)||0,revision):previous.revision,serverTime:Math.max(Number(previous.serverTime)||0,Number(message.serverTime)||0)};
  }
  if(Object.prototype.hasOwnProperty.call(message||{},'pendingRound'))this.pendingRound=message.pendingRound;
  if(message?.machine&&Object.prototype.hasOwnProperty.call(message.machine,'hostConnected'))this.hostAvailable=!!message.machine.hostConnected;
  if(message?.type==='host_status')this.hostAvailable=!!message.online;
  if(message?.type==='host_changed')this.hostAvailable=!!message.hostConnected||message.hostPlayerId===this.playerId;
  if(!this.online)this.role='offline';
  else if(message?.type==='host_changed')this.role=message.hostPlayerId===this.playerId?'host':'player';
  else if(message?.role==='host'||message?.role==='player')this.role=message.role;
  else if(this.role!=='host'&&this.role!=='player')this.role='player';
  if(SERVER_HOST&&(message?.role==='host'||message?.role==='player'||message?.type==='host_changed'))this.hostRegistered=this.role==='host';
  if(SERVER_HOST)this.hostAvailable=true;
  badge(this.online?(this.role==='host'?'SERVER ROULETTE HOST':'共有抽選 ONLINE'):'SERVER REQUIRED',this.online?this.role:'offline');
  this.syncReady();
  for(const listener of this.listeners)try{listener(message);}catch(error){console.error(error);}
  return true;
 }
 on(listener){this.listeners.add(listener);return()=>this.listeners.delete(listener);}
}

let blockedRoundId=(()=>{
 try{
  const saved=JSON.parse(localStorage.getItem(ABANDONED_ROUND_KEY)||'null');
  if(saved?.roundId&&Date.now()-Number(saved.at||0)<21600000)return String(saved.roundId);
 }catch{}
 return null;
})(),pendingStart=null;
function rememberBlockedRound(roundId){
 blockedRoundId=roundId?String(roundId):null;
 try{if(blockedRoundId)localStorage.setItem(ABANDONED_ROUND_KEY,JSON.stringify({roundId:blockedRoundId,at:Date.now()}));else localStorage.removeItem(ABANDONED_ROUND_KEY);}catch{}
}
const client=new Client();
let current=null,resumeId=null,recoveryOpen=false,startPermitId=null,serverBetTimer=0,betSyncBusy=false,lastBetSignature='',lastBetSentAt=0;

function queueBall(ball,catchup=false){
 if(!current||!ball)return;
 if(!current.authoritativeBalls)current.authoritativeBalls=new Map();current.authoritativeBalls.set(Number(ball.index),ball);
 if(Number(ball.index)<=current.delivered)return;
 current.queue.set(Number(ball.index),{index:Number(ball.index),number:Number(ball.number),catchup});drain();
}
async function drain(){
 const session=current;if(!session||session.draining)return;session.draining=true;
 try{
  while(current===session&&!session.stopped){
   const item=session.queue.get(session.delivered+1);if(!item)break;
   // The game can temporarily reject a server ball while board animations hold draws.
   // Never delete or advance the shared queue until Arcade.acceptNumber actually accepts it.
   let accepted=false,waited=0;
   while(current===session&&!session.stopped&&!accepted){
    if(typeof app==='undefined'||app.phase!=='playing')break;
    const ready=!app.paused&&!app.drawHeld&&Number(app.draws?.length||0)===session.delivered;
    if(ready){
     try{accepted=session.callbacks.onNumber?.(item.number)!==false;}catch(error){console.warn('[SharedMachineV204] onNumber',error);accepted=false;}
    }
    if(accepted)break;
    await wait(40);waited+=40;
    if(waited>=30000){
     console.warn('[SharedMachineV204] ball delivery still waiting',item.index,item.number,{paused:app?.paused,drawHeld:app?.drawHeld,draws:app?.draws?.length,delivered:current?.delivered});
     waited=0;
    }
   }
   if(current!==session||session.stopped||!accepted)break;
   session.queue.delete(item.index);session.delivered=item.index;
   status(`${item.index} / 8球　${item.number} HIT`,session.role==='host'?'共有抽選 HOST':'共有抽選');
   saveLater(item.index);if(item.catchup)await wait(100);
  }
 }catch(error){console.error('[SharedMachineV204] delivery',error);}
 finally{
  session.draining=false;if(current===session&&session.queue.has(session.delivered+1)&&!session.stopped)setTimeout(()=>{if(current===session)drain();},40);
 }
}
function saveLater(ballIndex){
 if(!current||!client.online)return;const session=current;clearTimeout(session.saveTimer);session.saveTimer=setTimeout(()=>{const run=()=>{if(current!==session||session.stopped)return;let state;try{state=checkpoint(app);}catch(error){console.warn(error);return;}client.save({roundId:session.roundId,ballIndex,state}).catch(error=>console.warn('[SharedMachineV204] save',error?.message||error));};if('requestIdleCallback'in window)requestIdleCallback(run,{timeout:1600});else setTimeout(run,0);},950);
}
async function startShared(callbacks,nativeReset){
 const attempt={roundId:String(resumeId||client.round?.id||''),token:Number(callbacks?.token??app?.token),startedAt:Date.now(),deadline:Date.now()+12000};
 pendingStart=attempt;
 const ownsStart=()=>pendingStart===attempt&&app?.phase==='playing'&&Number(app.token)===attempt.token&&client.online&&client.round?.id===attempt.roundId;
 try{
  const ready=await client.ready;
  if(!ownsStart())return;
  if(!ready)throw Error('shared client not ready');
  try{const data=await client.getState();if(!ownsStart())return;client.accept(data);}
  catch(error){
   // A fresh accepted WS state may already describe our reserved round even if
   // its redundant HTTP confirmation is throttled or briefly unavailable.
   if(!ownsStart()||client.round?.phase!=='PLAYING'||!client.round?.participant?.playerId)throw error;
  }
  if(!ownsStart())return;
  const round=resumeId?(client.pendingRound?.id===resumeId?client.pendingRound:(client.round?.id===resumeId?client.round:null)):client.round;
  if(!round)throw Error('round unavailable');
  const participant=round.participant||{},explicitResume=!!resumeId&&resumeId===round.id;
  if(!participant.playerId)throw Error('not participating');
  if(!explicitResume&&(round.phase!=='PLAYING'||startPermitId!==round.id))throw Error('server start not permitted');

  closeServerGate();try{rouletteDriver?.setPaused(false);}catch{}
  current={roundId:round.id,callbacks,nativeReset,role:'player',delivered:0,queue:new Map(),draining:false,stopped:false,saveTimer:0,settleSent:false,participant};app.__sharedRound=current;
  startPermitId=null;

  if(explicitResume){
   const savedBall=Math.max(0,Math.min(8,Number(participant.checkpointBall)||0));
   if(participant.checkpoint){restore(app,participant.checkpoint);current.delivered=savedBall;}
   app.fastForward=true;for(const engine of app.engines||[])engine.presentationRate=60;
   const balls=[...(round.balls||[])].sort((a,b)=>a.index-b.index);
   for(const ball of balls)if(ball.index>current.delivered)queueBall(ball,true);
   resumeId=null;recoveryOpen=false;
   status('切断中のサーバー抽選結果を高速反映中','共有抽選 RECOVERY');
   return;
  }

  resumeId=null;recoveryOpen=false;
  try{
   const state=checkpoint(app);
   client.save({roundId:round.id,ballIndex:0,state}).catch(error=>console.warn('[SharedMachineV204] initial checkpoint',error?.message||error));
  }catch(error){console.warn('[SharedMachineV204] initial checkpoint',error);}
  const balls=[...(round.balls||[])].sort((a,b)=>a.index-b.index);
  for(const ball of balls)queueBall(ball,true);
  status(client.hostAvailable?'サーバー抽選機の入賞待ち':'サーバー自動抽選待ち','共有抽選 SERVER');
 }catch(error){
  if(!ownsStart())return;
  current=null;app.__sharedRound=null;startPermitId=null;resumeId=null;recoveryOpen=false;
  console.warn('[SharedMachineV204] attach round failed',error?.message||error);
  try{if(app?.phase==='playing')nativeReset();}catch{}
  status('次のSERVER BET TIMEまで待機','共有抽選');
 }finally{if(pendingStart===attempt)pendingStart=null;}
}
function serverSettlement(){return current?.participant?.settlement||null;}
function settle(a){
 // The lifecycle controller owns normal settlement, keeps its payload stable,
 // and waits for an ACK before preparing the next board. Payout animation must
 // not race it with a separately calculated credit or a second settlement.
 return false;
}
function recovery(round){
 if(recoveryOpen||!round?.participant||round.participant.settlement||typeof app==='undefined'||app.phase!=='ready')return;
 const p=round.participant;recoveryOpen=true;resumeId=round.id;startPermitId=null;
 app.bets=[...(p.bets||app.bets||[])];app.locked=[...(p.locked||p.bets||app.bets||[])];app.enabled=[...(p.enabled||app.enabled||[])];
 const savedCredit=Number(p.checkpoint?.credit);
 app.credit=Number.isFinite(savedCredit)?savedCredit:(Number(p.creditAfterBet)||app.credit);app.displayCredit=app.credit;repaint(app);
 status('切断中ラウンドを復元中','共有抽選 RECOVERY');
 queueMicrotask(()=>{try{if(app.phase==='ready')app.start();}catch(error){console.error(error);recoveryOpen=false;resumeId=null;}});
}

function serverNow(){return Date.now()+Number(client.clockOffset||0);}
function betPayload(round){
 const bets=[...(app.bets||[])],enabled=bets.map(value=>Number(value)>0);
 return {clientRoundToken:'bet-'+round.id+'-'+String(app.token||0),bets,locked:[...bets],enabled,totalBet:bets.reduce((sum,value,i)=>sum+(enabled[i]?Number(value)||0:0),0),creditAfterBet:Number(app.credit)||0,initialState:null,appVersion:VERSION};
}
async function syncBetReservation(force=false){
 const round=client.round;
 if(betSyncBusy||!client.online||!round||round.phase!=='BETTING'||!round.canBet||app?.phase!=='ready'||recoveryOpen)return;
 const payload=betPayload(round),signature=round.id+'|'+payload.bets.join(',')+'|'+payload.enabled.join(',')+'|'+payload.creditAfterBet;
 const t=Date.now();if(!force&&signature===lastBetSignature&&t-lastBetSentAt<1200)return;
 betSyncBusy=true;
 try{const data=await client.join(payload);client.accept(data);lastBetSignature=signature;lastBetSentAt=t;}
 catch(error){if(error?.data)client.accept(error.data);if(error?.status!==409)console.warn('[SharedMachineV204] BET sync',error?.message||error);}
 finally{betSyncBusy=false;}
}
function scheduleServerBetClock(delay=0){clearTimeout(serverBetTimer);serverBetTimer=setTimeout(serverBetTick,delay);}
function serverBetTick(){
 serverBetTimer=0;if(SERVER_HOST||typeof app==='undefined')return;
 try{typeof stopAutoRound==='function'&&stopAutoRound();}catch{}
 if(!client.online){status('SERVER','共有抽選 接続待ち');scheduleServerBetClock(400);return;}
 if(recoveryOpen||resumeId){status('RECOVER','切断中結果を復元中');scheduleServerBetClock(150);return;}
 const round=client.round;
 if(!round){status('WAIT','SERVER BET TIME待機');scheduleServerBetClock(250);return;}
 if(round.phase==='BETTING'){
  const ms=Math.max(0,Number(round.betClosesAt||0)-serverNow());
  if(round.canBet){countdownText((ms/1000).toFixed(1)+'秒','SERVER BET TIME');syncBetReservation(ms<1200).catch(()=>{});}
  else countdownText('NEXT','次のBET TIME待機');
  scheduleServerBetClock(100);return;
 }
 if(round.phase==='PLAYING'){
  countdownText(round.participant?'PLAY':'NEXT',round.participant?'サーバー抽選中':'次のBET TIME待機');
  scheduleServerBetClock(200);return;
 }
 countdownText('WAIT','次のSERVER BET TIME');scheduleServerBetClock(200);
}
async function refreshAndMaybeStart(){
 if(!client.online)return;
 try{
  const data=await client.getState();client.accept(data);
  if(data.pendingRound?.participant&&!data.pendingRound.participant.settlement&&app?.phase==='ready'){recovery(data.pendingRound);return;}
  const round=data.round;
  if(round?.phase==='PLAYING'&&round.participant&&app?.phase==='ready'){
   app.bets=[...(round.participant.bets||app.bets||[])];app.enabled=[...(round.participant.enabled||app.enabled||[])];
   startPermitId=round.id;client.syncReady();
   try{if(typeof startReadyRound==='function')startReadyRound();else app.start();}catch(error){console.warn('[SharedMachineV204] server start',error);}
  }
 }catch(error){console.warn('[SharedMachineV204] state refresh',error?.message||error);}
 scheduleServerBetClock(0);
}

let rouletteMirror=null,rouletteMirrorLast=0;
function mirrorStyles(){
 if(document.getElementById('shared-roulette-mirror-css'))return;
 const style=document.createElement('style');style.id='shared-roulette-mirror-css';style.textContent=`
 #cookie-roulette .a8-stage{position:relative!important;overflow:hidden!important;isolation:isolate}
 #cookie-roulette .shared-roulette-mirror{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;object-fit:contain!important;object-position:50% 50%!important;z-index:9999!important;pointer-events:none!important;background:transparent!important;opacity:0;transition:opacity .08s linear}
 #cookie-roulette .shared-roulette-mirror[data-live="1"]{opacity:1!important}
 body.shared-roulette-live #cookie-roulette .a8-stage>canvas{visibility:hidden!important}
 body.shared-roulette-live #cookie-roulette .a8-stage:before,body.shared-roulette-live #cookie-roulette .a8-stage:after{z-index:0!important}
 `;document.head.append(style);
}
function ensureRouletteMirror(){
 mirrorStyles();
 if(rouletteMirror?.isConnected)return rouletteMirror;
 const root=document.querySelector('#cookie-roulette .a8-stage');if(!root)return null;
 rouletteMirror=document.createElement('img');rouletteMirror.className='shared-roulette-mirror';rouletteMirror.alt='サーバー物理抽選機の同期映像';rouletteMirror.decoding='async';rouletteMirror.dataset.live='0';
 root.append(rouletteMirror);return rouletteMirror;
}
function showRouletteMirror(image){
 const node=ensureRouletteMirror();if(!node||!image)return;
 rouletteMirrorLast=Date.now();node.src=image;node.dataset.live='1';document.body.classList.add('shared-roulette-live');
 try{rouletteDriver?.setPaused(true);}catch{}
}
function hideRouletteMirror(){
 if(rouletteMirror)rouletteMirror.dataset.live='0';document.body.classList.remove('shared-roulette-live');rouletteMirrorLast=0;
}

function install(){
 if(typeof Arcade!=='function'||typeof app==='undefined'||!app||typeof rouletteDrawSource==='undefined'){setTimeout(install,60);return;}
 const proto=Arcade.prototype;if(proto.__sharedMachineV182)return;Object.defineProperty(proto,'__sharedMachineV182',{value:true});
 const barrier=window.__sweetsSharedDrawBarrier;
 const nativeStart=barrier?.nativeStart||rouletteDrawSource.start.bind(rouletteDrawSource),nativeReset=barrier?.nativeReset||rouletteDrawSource.reset.bind(rouletteDrawSource);
 const nativeBegin=proto.beginPayout,nativeAdvance=proto.advancePayout,nativePrepare=proto.prepare;

 if(SERVER_HOST){
  Object.defineProperty(rouletteDrawSource,'ready',{configurable:true,get:()=>barrier?.nativeReady?!!barrier.nativeReady():!!rouletteReady});
  window.__sweetsSharedClientReady=true;
  const ultraLightRoulette=query.get('lightRoulette')==='1';
  let hostRoundId=null,hostIndex=0,hostRunning=false,reportChain=Promise.resolve(),hostRetryTimer=0,mirrorTimer=0,mirrorCanvas=null,mirrorCtx=null,mirrorEncoding=false;
  function hostPresentation(){
   try{
    manualNumbers=false;
    if(typeof inView!=='undefined')inView=false;
    app.paused=false;
    if(Array.isArray(app.bets))app.bets=app.bets.map(()=>0);
    stopAutoRound();
    if(typeof stopBgm==='function')stopBgm();
    if(typeof stopSounds==='function')stopSounds();
    if(typeof stopBetPreview==='function')stopBetPreview();
    if(typeof stopNumberAnnouncements==='function')stopNumberAnnouncements();
    const soundToggle=document.getElementById('sound');if(soundToggle)soundToggle.checked=false;
    if(typeof slots!=='undefined')for(const slot of slots){
     for(const key of ['chocoFrame','candyFrame','miniFrame'])if(slot?.[key]){try{cancelAnimationFrame(slot[key]);}catch{}slot[key]=0;}
     if(slot){slot.dirtyMain=false;slot.dirtyMini=false;}
    }
    if(typeof uiPending!=='undefined')uiPending=false;
    if(typeof uiApp!=='undefined')uiApp=null;
   }catch(error){console.warn('[SharedMachineV204] host presentation trim',error?.message||error);}
   if(document.getElementById('server-roulette-host-css'))return;
   document.documentElement.classList.add('server-roulette-host');
   const style=document.createElement('style');style.id='server-roulette-host-css';style.textContent=`
    html.server-roulette-host,html.server-roulette-host body{margin:0!important;width:100%!important;height:100%!important;overflow:hidden!important;background:#02070b!important}
    html.server-roulette-host #viewport,html.server-roulette-host #screen,html.server-roulette-host .arena{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;max-width:none!important;max-height:none!important;margin:0!important;transform:none!important}
    html.server-roulette-host #screen>*:not(.arena){display:none!important}
    html.server-roulette-host .arena>*:not(#cookie-roulette){display:none!important}
    html.server-roulette-host #cookie-roulette{display:block!important;position:absolute!important;inset:0!important;width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;margin:0!important;z-index:10000!important;background:#02070b!important}
    html.server-roulette-host #manual-number-toggle,html.server-roulette-host #manual-number-panel,html.server-roulette-host #bet-countdown,html.server-roulette-host .roulette-info-strip,html.server-roulette-host .shared-v179-badge,html.server-roulette-host .shared-v179-recovery{display:none!important}
    .server-host-banner{position:fixed;left:10px;top:10px;z-index:11000;padding:7px 11px;border:1px solid #ffe27aaa;border-radius:10px;background:#071725df;color:#fff0a2;font:900 12px/1.2 system-ui;pointer-events:none}
   `;document.head.append(style);
   const banner=document.createElement('div');banner.className='server-host-banner';banner.textContent='SERVER PHYSICAL ROULETTE'+(ultraLightRoulette?' · ULTRA LIGHT':'')+' · waiting';document.body.append(banner);
  }
  function hostBanner(text){const b=document.querySelector('.server-host-banner');if(b)b.textContent='SERVER PHYSICAL ROULETTE'+(ultraLightRoulette?' · ULTRA LIGHT':'')+' · '+text;}
  function stopHost(message){
   hostRunning=false;clearTimeout(hostRetryTimer);hostRetryTimer=0;stopMirrorCapture();
   try{rouletteDriver?.setPaused(true);}catch{}
   status(message,'SERVER ROULETTE');hostBanner(message);
  }
  function reportPhysical(number){
   const roundId=hostRoundId;
   reportChain=reportChain.then(async()=>{
    if(!hostRunning||roundId!==hostRoundId)return;
    const index=hostIndex+1;
    const data=await client.report({roundId,ballIndex:index,number:Number(number),eventId:roundId+':'+index});
    hostIndex=Number(data.ball?.index)||index;
    hostBanner(hostIndex+' / 8球 · '+number+' HIT');
    setTimeout(()=>captureMirrorFrame(true),120);
    if(hostIndex>=8){hostRunning=false;stopMirrorCapture();status('8球の実抽選が終了しました','SERVER ROULETTE');hostBanner('8 / 8 COMPLETE');}
   }).catch(error=>{
    console.error('[SharedMachineV204] physical host report',error);
    stopHost('送信エラー · 抽選停止');
   });
  }
  function captureMirrorFrame(force=false){
   if((!force&&!hostRunning)||!hostRoundId||!client.online||mirrorEncoding)return;
   const roundId=hostRoundId,capturedAt=Date.now();
   try{
    const source=rouletteDriver?.mirrorCanvas||document.querySelector('#cookie-roulette canvas');if(!source||!source.width||!source.height)return;
    if(!mirrorCanvas)mirrorCanvas=document.createElement('canvas');
    const targetWidth=ultraLightRoulette?240:Math.min(320,Math.max(240,source.width)),scale=targetWidth/source.width,targetHeight=Math.max(135,Math.round(source.height*scale));
    if(mirrorCanvas.width!==targetWidth||mirrorCanvas.height!==targetHeight){mirrorCanvas.width=targetWidth;mirrorCanvas.height=targetHeight;mirrorCtx=mirrorCanvas.getContext('2d',{alpha:false});}
    if(!mirrorCtx)return;
    mirrorCtx.drawImage(source,0,0,targetWidth,targetHeight);
    mirrorEncoding=true;
    mirrorCanvas.toBlob(blob=>{
     if(!blob){mirrorEncoding=false;return;}
     const reader=new FileReader();
     reader.onload=()=>{
      try{
       const image=String(reader.result||'');
       if(client.online&&roundId===hostRoundId&&image.length<210000)client.send({type:'visual_frame',roundId,image,capturedAt});
      }finally{mirrorEncoding=false;}
     };
     reader.onerror=()=>{mirrorEncoding=false;};
     reader.readAsDataURL(blob);
    },'image/jpeg',ultraLightRoulette?.22:.30);
   }catch(error){mirrorEncoding=false;console.warn('[SharedMachineV204] mirror capture',error?.message||error);}
  }
  function startMirrorCapture(){
   clearTimeout(mirrorTimer);mirrorTimer=0;captureMirrorFrame(true);
  }
  function stopMirrorCapture(){clearTimeout(mirrorTimer);mirrorTimer=0;}
  function syncHost(round=client.round){
   if(client.role!=='host'||!client.online)return;
   clearTimeout(hostRetryTimer);hostRetryTimer=0;
   if(!round){hostRunning=false;hostBanner('player wait');return;}
   if(round.phase==='BETTING'){
    hostRunning=false;try{rouletteDriver?.setPaused(true);}catch{}
    const sec=Math.max(0,(Number(round.betClosesAt||0)-(Date.now()+Number(client.clockOffset||0)))/1000);
    hostBanner('BET TIME '+sec.toFixed(1)+'s');hostRetryTimer=setTimeout(()=>syncHost(client.round),200);return;
   }
   if(round.phase==='COMPLETE'){hostRunning=false;hostBanner('ROUND COMPLETE');return;}
   if(round.phase!=='PLAYING'||Number(round.participantCount||0)<1){hostRunning=false;hostBanner('player wait');return;}
   if(round.drawSource==='server-fallback'){stopHost('SERVER FALLBACK · '+(round.balls?.length||0)+' / 8');return;}
   const until=Number(round.drawStartsAt||0)-(Date.now()+Number(client.clockOffset||0));
   if(until>0){hostBanner('DRAW IN '+(until/1000).toFixed(1)+'s');hostRetryTimer=setTimeout(()=>syncHost(client.round),Math.min(250,Math.max(40,until)));return;}
   if(hostRoundId===round.id&&hostRunning)return;
   const existing=[...(round.balls||[])];
   if(existing.length){hostRoundId=round.id;hostIndex=existing.length;client.send({type:'host_fallback_request',roundId:round.id});stopHost('SERVER FALLBACKへ移行 '+hostIndex+' / 8');return;}
   if(!rouletteDrawSource.ready||!rouletteDriver){hostRetryTimer=setTimeout(()=>syncHost(round),250);hostBanner('roulette loading');return;}
   hostRoundId=round.id;hostIndex=0;hostRunning=true;reportChain=Promise.resolve();
   try{nativeReset();startMirrorCapture();nativeStart({onNumber:reportPhysical,onError:message=>{client.send({type:'host_fallback_request',roundId:round.id});stopHost(message||'抽選機エラー');}});rouletteDriver?.setPaused(false);status('現行3D抽選機で8球を実抽選中','SERVER ROULETTE');hostBanner('0 / 8 · DRAWING');}
   catch(error){console.error('[SharedMachineV204] physical host start',error);hostRunning=false;client.send({type:'host_fallback_request',roundId:round.id});}
  }
  rouletteDrawSource.start=function(){console.info('[SharedMachineV204] local game draw ignored on server host');};
  rouletteDrawSource.reset=function(){};
  hostPresentation();
  client.on(message=>{
   if(['betting_started','bet_updated','round_started','participant_joined','snapshot','host_changed','server_fallback_started'].includes(message.type)){
    if(message.type!=='snapshot'&&message.type!=='host_changed')client.getState().then(state=>{client.accept(state);syncHost(client.round);}).catch(()=>{});
    else syncHost(message.round||client.round);
    if(message.type==='host_changed'&&!message.round){
     client.getState().then(state=>client.accept(state)).catch(()=>{});
    }
   }
   if(message.type==='round_complete'&&message.round?.id===hostRoundId){hostRunning=false;hostBanner('8 / 8 COMPLETE');}
   if(message.type==='round_cancelled'&&message.round?.id===hostRoundId){hostRunning=false;hostRoundId=null;hostIndex=0;try{nativeReset();}catch{}hostBanner('ROUND CANCELLED · player wait');}
  });
  client.ready.then(ok=>{if(ok){hostPresentation();syncHost(client.round);}else serverRequired('サーバー本体へ接続できません');});
  window.SweetsSharedMachine={version:VERSION,serverHost:true,client,get online(){return client.online;},get role(){return client.role;},state:()=>client.getState()};
  console.info('[SharedMachineV204] physical server roulette host enabled');
  return;
 }

 rememberBlockedRound(null);
 Object.defineProperty(rouletteDrawSource,'ready',{configurable:true,get:()=>!!(client.online&&(!!resumeId||!!(startPermitId&&client.round?.id===startPermitId&&client.round?.phase==='PLAYING'&&client.round?.participant)))});
 const originalSyncDebugButtons=typeof syncDebugButtons==='function'?syncDebugButtons:null;
 if(originalSyncDebugButtons){
  syncDebugButtons=function(){
   originalSyncDebugButtons();
   const start=document.getElementById('debug-start');
   if(start&&!rouletteDrawSource.ready&&!jpcSession.active){
    start.disabled=true;
    start.textContent=blockedRoundId?'次R待機':'SERVER待機';
    start.title=blockedRoundId?'リセット前の共有ラウンド終了待ち':'サーバー抽選機への接続待ち';
   }
  };
 }
 const originalScheduleAutoRound=typeof scheduleAutoRound==='function'?scheduleAutoRound:null;
 if(originalScheduleAutoRound){scheduleAutoRound=function(){try{stopAutoRound();}catch{}scheduleServerBetClock(0);};}

 function clearSharedCurrent({abandon=false}={}){
  pendingStart=null;hideRouletteMirror();
  if(!current)return;
  const old=current,roundId=old.roundId;old.stopped=true;clearTimeout(old.saveTimer);current=null;app.__sharedRound=null;
  if(abandon&&roundId){
   client.syncReady();try{stopAutoRound();}catch{}
   // The server keeps the reservation/result; reconnect recovery catches up from its checkpoint.
  }
 }
 rouletteDrawSource.start=function(callbacks){startShared(callbacks,nativeReset);};
 rouletteDrawSource.reset=function(...args){
  const abandon=!!current&&['playing','result','paying','error'].includes(app?.phase);
  clearSharedCurrent({abandon});
  if(barrier)barrier.pending=null;
  return nativeReset(...args);
 };
 proto.beginPayout=function(...args){const saved=serverSettlement();if(current&&saved){this.credit=Number(saved.creditAfter)||this.credit;this.displayCredit=this.credit;this.payout=null;this.phase='complete';repaint(this);return true;}if(current)settle(this);return nativeBegin.apply(this,args);};
 proto.advancePayout=function(...args){const result=nativeAdvance.apply(this,args);if(current&&this.phase==='complete')settle(this);return result;};
 proto.prepare=function(...args){const previous=this.phase,result=nativePrepare.apply(this,args);if(current&&previous==='complete')clearSharedCurrent({abandon:false});return result;};
 client.on(message=>{
  // Repair missed live WS deliveries only for the already-attached round.
  // Interrupted rounds have no current session and are never replayed here.
  if(current){
   const authoritative=[message.round,message.pendingRound].find(round=>round?.id===current.roundId);
   if(authoritative){
    for(const ball of authoritative.balls||[])queueBall(ball,true);
    if(authoritative.participant)current.participant={...(current.participant||{}),...authoritative.participant};
   }
  }
  if(message.type==='visual_frame'){if(current&&message.roundId===current.roundId)showRouletteMirror(message.image);return;}
  if(message.type==='ball_result'&&current&&message.roundId===current.roundId)queueBall(message.ball);
  if(message.type==='round_complete'&&current&&message.round?.id===current.roundId)saveLater(8);
  if(['betting_started','bet_updated','round_started','round_complete','server_fallback_started','player_settled','host_changed','host_status'].includes(message.type)){
   client.getState().then(state=>{
    client.accept(state);
    if(message.type==='round_started')refreshAndMaybeStart();
    else{
     const candidate=state.pendingRound||(state.round?.participant&&state.round.phase==='PLAYING'?state.round:null);
     if(candidate&&app?.phase==='ready')recovery(candidate);
     scheduleServerBetClock(0);
    }
   }).catch(()=>{});
  }
 })
 client.ready.then(ok=>{
  if(ok){
   if(barrier){barrier.installed=true;barrier.pending=null;}
   const candidate=client.pendingRound||(client.round?.participant&&client.round.phase==='PLAYING'?client.round:null);
   if(candidate&&app?.phase==='ready')recovery(candidate);
   else if(client.round?.phase==='PLAYING'&&client.round.participant)refreshAndMaybeStart();
   scheduleServerBetClock(0);
  }
  client.syncReady();
 })
 window.SweetsSharedMachine={version:VERSION,serverHost:false,client,get online(){return client.online;},get role(){return client.role;},get active(){return current;},get pendingStart(){return pendingStart;},state:()=>client.getState()};
 console.info('[SharedMachineV204] server-authoritative BET clock, reconnect recovery and physical/fallback draw enabled');
}
install();
})();


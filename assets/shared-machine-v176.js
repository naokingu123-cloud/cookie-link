(()=>{
'use strict';
if(window.__sweetsSharedMachineV176)return;
window.__sweetsSharedMachineV176=true;

const VERSION='v179';
const SESSION_KEY='sweets-shared-session-v176';
const SERVER_KEY='sweets-shared-server-v176';
const MACHINE_KEY='sweets-shared-machine-v176';
const query=new URLSearchParams(location.search);
const explicit=query.get('sharedServer')||query.get('server')||'';
if(explicit)try{localStorage.setItem(SERVER_KEY,explicit);}catch{}
const BASE=String(explicit||localStorage.getItem(SERVER_KEY)||location.origin).replace(/\/$/,'');
const MACHINE=String(query.get('machine')||localStorage.getItem(MACHINE_KEY)||'public-01').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,64)||'public-01';
const DISABLED=query.get('shared')==='0';
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
 const style=document.createElement('style');style.id='shared-machine-v179-css';style.textContent=`.shared-v179-badge{position:fixed;right:8px;bottom:8px;z-index:10020;padding:5px 8px;border:1px solid #ffffff88;border-radius:10px;background:#071725de;color:#d9f5ff;font:700 10px/1.2 system-ui;box-shadow:0 2px 9px #0008;pointer-events:none}.shared-v179-badge[data-role=host]{color:#fff1a0;border-color:#ffd75eaa}.shared-v179-badge[data-role=offline]{display:none}.shared-v179-recovery{position:fixed;inset:0;z-index:10030;display:grid;place-items:center;background:#06121d99;padding:18px}.shared-v179-card{width:min(360px,92vw);padding:18px;border:3px solid #e4bc5c;border-radius:18px;background:linear-gradient(#eafaff,#bdeaff);box-shadow:0 12px 40px #0009;text-align:center;color:#174e6c;font:800 14px/1.5 system-ui}.shared-v179-card h3{margin:0 0 7px;color:#fff;-webkit-text-stroke:1px #367fa5;font:1000 24px/1.2 system-ui}.shared-v179-card button{margin-top:12px;padding:9px 22px;border:2px solid #fff1a9;border-radius:12px;background:linear-gradient(#ffdb65,#ef9e25);color:#fff;text-shadow:0 1px #9a5414;font:1000 16px/1 system-ui;box-shadow:0 3px 0 #9d621e}`;document.head.append(style);
}
function badge(text='',role='offline'){styles();let node=document.querySelector('.shared-v179-badge');if(!node){node=document.createElement('div');node.className='shared-v179-badge';document.body.append(node);}node.textContent=text;node.dataset.role=role;}

class Client{
 constructor(){this.online=false;this.playerId='';this.token='';this.role='offline';this.round=null;this.ws=null;this.listeners=new Set();this.ready=this.init();}
 async raw(path,{method='GET',body,timeout=1800,auth=true}={}){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
  try{
   const headers={'Content-Type':'application/json'};if(auth&&this.token){headers.Authorization=`Bearer ${this.token}`;headers['X-Player-Id']=this.playerId;}
   const response=await fetch(BASE+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',signal:controller.signal});
   const data=await response.json().catch(()=>({error:'invalid_response'}));
   if(!response.ok){const error=Error(data.error||`HTTP ${response.status}`);error.status=response.status;error.data=data;throw error;}return data;
  }finally{clearTimeout(timer);}
 }
 async init(){
  if(DISABLED){badge('', 'offline');return false;}
  try{
   const health=await this.raw('/api/health',{auth:false,timeout:900});if(!health.ok)throw Error('health');
   const saved=read(SESSION_KEY,{}),headers={'Content-Type':'application/json'};let profileName='';
   try{const profile=JSON.parse(localStorage.getItem('sweets-player-v1')||'null');profileName=String(profile?.name||'').trim();}catch{}
   if(saved.token)headers.Authorization=`Bearer ${saved.token}`;
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),1500);let response;
   const displayName=profileName||saved.displayName||('PLAYER-'+String(saved.playerId||crypto.randomUUID?.()||Date.now()).replace(/[^a-zA-Z0-9]/g,'').slice(0,6));
   try{response=await fetch(BASE+'/api/session',{method:'POST',headers,body:JSON.stringify({playerId:saved.playerId||'',displayName}),cache:'no-store',signal:controller.signal});}finally{clearTimeout(timer);}
   if(!response.ok)throw Error('session');const session=await response.json();
   this.playerId=session.player.id;this.token=session.token;write(SESSION_KEY,{playerId:this.playerId,token:this.token,displayName:session.player.displayName});
   this.online=true;this.connect();const state=await this.getState();this.accept(state);return true;
  }catch(error){this.online=false;this.role='offline';badge('', 'offline');console.info('[SharedMachineV179] local mode',error?.message||error);return false;}
 }
 api(path,options={}){return this.raw(path,{...options,auth:true});}
 getState(){return this.api(`/api/machines/${MACHINE}/state`);}
 join(body){return this.api(`/api/machines/${MACHINE}/round/join`,{method:'POST',body,timeout:3000});}
 report(body){return this.api(`/api/machines/${MACHINE}/round/ball`,{method:'POST',body,timeout:2500});}
 save(body){return this.api(`/api/machines/${MACHINE}/round/checkpoint`,{method:'POST',body,timeout:4000});}
 settle(body){return this.api(`/api/machines/${MACHINE}/round/settle`,{method:'POST',body,timeout:3000});}
 connect(){
  try{const url=new URL(BASE);url.protocol=url.protocol==='https:'?'wss:':'ws:';url.pathname='/ws';url.search='';url.searchParams.set('machineId',MACHINE);url.searchParams.set('playerId',this.playerId);url.searchParams.set('token',this.token);const ws=new WebSocket(url);this.ws=ws;ws.onmessage=event=>{try{this.accept(JSON.parse(event.data));}catch{}};ws.onclose=()=>{if(this.online)setTimeout(()=>this.connect(),1500);};}catch{}
 }
 accept(message){
  if(message.round)this.round=message.round;
  this.role=this.online?'player':'offline';
  badge(this.online?'共有抽選 ONLINE':'',this.online?'player':'offline');
  for(const listener of this.listeners)try{listener(message);}catch(error){console.error(error);}
 }
 on(listener){this.listeners.add(listener);return()=>this.listeners.delete(listener);}
}

const client=new Client();
let current=null,resumeId=null,recoveryOpen=false;

function queueBall(ball,catchup=false){
 if(!current||!ball||Number(ball.index)<=current.delivered)return;
 current.queue.set(Number(ball.index),{index:Number(ball.index),number:Number(ball.number),catchup});drain();
}
async function drain(){
 if(!current||current.draining)return;current.draining=true;
 try{while(current&&!current.stopped){const item=current.queue.get(current.delivered+1);if(!item)break;current.queue.delete(item.index);current.callbacks.onNumber?.(item.number);current.delivered=item.index;status(`${item.index} / 8球　${item.number} HIT`,current.role==='host'?'共有抽選 HOST':'共有抽選');saveLater(item.index);if(item.catchup)await wait(100);}}
 catch(error){console.error('[SharedMachineV179] delivery',error);}finally{if(current)current.draining=false;}
}
function saveLater(ballIndex){
 if(!current||!client.online)return;clearTimeout(current.saveTimer);current.saveTimer=setTimeout(()=>{const run=()=>{if(!current)return;let state;try{state=checkpoint(app);}catch(error){console.warn(error);return;}client.save({roundId:current.roundId,ballIndex,state}).catch(error=>console.warn('[SharedMachineV179] save',error?.message||error));};if('requestIdleCallback'in window)requestIdleCallback(run,{timeout:1600});else setTimeout(run,0);},950);
}
async function startShared(callbacks,nativeStart,nativeReset){
 const ready=await Promise.race([client.ready,wait(350).then(()=>false)]);if(!ready||!client.online){nativeStart(callbacks);return;}
 try{
  const data=await client.join({clientRoundToken:String(callbacks.token||app.token||''),resumeRoundId:resumeId,bets:[...(app.bets||[])],locked:[...(app.locked||app.bets||[])],enabled:[...(app.enabled||[])],totalBet:totalBet(app),creditAfterBet:Number(app.credit)||0,initialState:null,appVersion:VERSION});
  client.accept(data);const round=data.round;if(!round)throw Error('round unavailable');const participant=round.participant||{};
  current={roundId:round.id,callbacks,nativeStart,nativeReset,role:'player',delivered:0,queue:new Map(),draining:false,stopped:false,saveTimer:0,settleSent:false,participant};app.__sharedRound=current;resumeId=null;
  if(participant.settlement){app.credit=Number(participant.settlement.creditAfter)||app.credit;app.displayCredit=app.credit;app.phase='complete';app.dealing=false;repaint(app);return;}
  const savedBall=Math.max(0,Math.min(8,Number(participant.checkpointBall)||0));if(participant.checkpoint&&savedBall){restore(app,participant.checkpoint);current.delivered=savedBall;}
  const balls=[...(round.balls||[])].sort((a,b)=>a.index-b.index);for(const ball of balls)if(ball.index>current.delivered)queueBall(ball,true);
  status('サーバー抽選結果を待機','共有抽選 SERVER');
  saveLater(current.delivered);
 }catch(error){console.warn('[SharedMachineV179] shared join failed; local draw',error?.message||error);current=null;app.__sharedRound=null;nativeStart(callbacks);}
}
function serverSettlement(){return current?.participant?.settlement||client.round?.participant?.settlement||null;}
function settle(a){
 if(!current||current.settleSent||!client.online)return;current.settleSent=true;const creditAfter=(Number(a.credit)||0)+(Number(a.totalWin)||0);
 client.settle({roundId:current.roundId,totalWin:Number(a.totalWin)||0,creditAfter,digest:digest(a,current.roundId)}).then(data=>{if(current)current.participant={...(current.participant||{}),settlement:data.settlement};}).catch(error=>{if(current)current.settleSent=false;console.warn('[SharedMachineV179] settle',error?.message||error);});
}
function recovery(round){
 if(recoveryOpen||!round?.participant||typeof app==='undefined'||app.phase!=='ready')return;const p=round.participant;
 if(p.settlement){app.credit=Number(p.settlement.creditAfter)||app.credit;app.displayCredit=app.credit;repaint(app);return;}
 recoveryOpen=true;styles();const layer=document.createElement('div');layer.className='shared-v179-recovery';const values=(round.balls||[]).map(ball=>ball.number).join('　')||'まだ入賞なし';layer.innerHTML=`<div class="shared-v179-card"><h3>共有ラウンド復元</h3><div>${round.balls?.length||0} / 8球までサーバー保存済み</div><div style="margin-top:7px;font-size:18px">${values}</div><button type="button">同じ結果から再開</button></div>`;layer.querySelector('button').onclick=()=>{layer.remove();resumeId=round.id;app.bets=[...(p.bets||app.bets||[])];app.locked=[...(p.locked||p.bets||app.bets||[])];app.enabled=[...(p.enabled||app.enabled||[])];app.credit=(Number(p.creditAfterBet)||0)+(Number(p.totalBet)||0);app.displayCredit=app.credit;repaint(app);try{app.start();}catch(error){console.error(error);recoveryOpen=false;}};document.body.append(layer);
}

function install(){
 if(typeof Arcade!=='function'||typeof app==='undefined'||!app||typeof rouletteDrawSource==='undefined'){setTimeout(install,60);return;}
 const proto=Arcade.prototype;if(proto.__sharedMachineV176)return;Object.defineProperty(proto,'__sharedMachineV176',{value:true});
 const nativeStart=rouletteDrawSource.start.bind(rouletteDrawSource),nativeReset=rouletteDrawSource.reset.bind(rouletteDrawSource),nativeBegin=proto.beginPayout,nativeAdvance=proto.advancePayout,nativePrepare=proto.prepare;
 rouletteDrawSource.start=function(callbacks){if(typeof manualNumbers!=='undefined'&&manualNumbers)return nativeStart(callbacks);startShared(callbacks,nativeStart,nativeReset);};
 rouletteDrawSource.reset=function(...args){if(current){current.stopped=true;clearTimeout(current.saveTimer);current=null;app.__sharedRound=null;}return nativeReset(...args);};
 proto.beginPayout=function(...args){const saved=serverSettlement();if(current&&saved){this.credit=Number(saved.creditAfter)||this.credit;this.displayCredit=this.credit;this.payout=null;this.phase='complete';repaint(this);return true;}if(current)settle(this);return nativeBegin.apply(this,args);};
 proto.advancePayout=function(...args){const result=nativeAdvance.apply(this,args);if(current&&this.phase==='complete')settle(this);return result;};
 proto.prepare=function(...args){const previous=this.phase,result=nativePrepare.apply(this,args);if(current&&['complete','ready'].includes(previous)){current.stopped=true;clearTimeout(current.saveTimer);current=null;this.__sharedRound=null;}return result;};
 client.on(message=>{
  if(message.type==='snapshot'&&message.round)recovery(message.round);
  if(!current)return;
  if(message.type==='ball_result'&&message.roundId===current.roundId)queueBall(message.ball);
  if(message.type==='round_complete'&&message.round?.id===current.roundId)saveLater(8);
 });
 client.ready.then(ok=>{if(ok&&client.round)recovery(client.round);});
 window.SweetsSharedMachine={version:VERSION,client,get online(){return client.online;},get role(){return client.role;},get active(){return current;},state:()=>client.getState()};
 console.info('[SharedMachineV179] server-authoritative roulette, checkpoints and idempotent settlement enabled');
}
install();
})();

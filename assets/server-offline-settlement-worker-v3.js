(()=>{
'use strict';
if(window.__sweetsOfflineSettlementWorkerV3)return;window.__sweetsOfflineSettlementWorkerV3=true;
const query=new URLSearchParams(location.search);if(query.get('serverSettlementWorker')!=='1')return;
const machine=String(query.get('machine')||'public-01'),adminToken=String(query.get('adminToken')||'');
const ALIASES={six:'candy',drop:'candy',sixdrop:'candy',waffle:'stick',cookie:'cookie',choco:'choco',candy:'candy',gelato:'gelato',winery:'winery',jelly:'jelly',popcorn:'popcorn',stick:'stick',castella:'castella'};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const finite=value=>Number.isFinite(Number(value))?Number(value):0;
const gameId=(engine,index)=>ALIASES[String(engine?.kind||engine?.id||'').toLowerCase()]||String(engine?.kind||engine?.id||('game-'+index)).toLowerCase();
let drawCallbacks=null,busy=false;

function revive(value){
 if(value==null||typeof value!=='object')return value;if(Array.isArray(value))return value.map(revive);
 if(value.$map)return new Map(value.$map.map(([k,v])=>[revive(k),revive(v)]));if(value.$set)return new Set(value.$set.map(revive));
 if(value.$typed){const C=globalThis[value.$typed]||Uint8Array;try{return new C(value.values||[]);}catch{return value.values||[];}}
 const out={};for(const [key,item] of Object.entries(value))out[key]=revive(item);return out;
}
function restore(a,state){
 if(!state)return false;
 for(const key of ['credit','displayCredit','bets','locked','enabled','paid','draws','roundWins','totalWin','wonderBank','wonderSteps','wonderValue'])if(key in state)try{a[key]=revive(state[key]);}catch{}
 (state.engines||[]).forEach((saved,index)=>{const engine=a.engines?.[index];if(!engine)return;for(const [key,value] of Object.entries(saved))try{if(typeof engine[key]!=='function')engine[key]=revive(value);}catch{}});
 return true;
}
async function api(path,options={}){
 const url=new URL(path,location.origin);if(adminToken)url.searchParams.set('adminToken',adminToken);
 const headers={'content-type':'application/json'};if(adminToken)headers['x-admin-token']=adminToken;
 const response=await fetch(url,{cache:'no-store',...options,headers:{...headers,...(options.headers||{})}}),data=await response.json().catch(()=>({}));if(!response.ok)throw Error(data.error||('HTTP '+response.status));return data;
}
function installDrawCapture(){
 try{Object.defineProperty(rouletteDrawSource,'ready',{configurable:true,get:()=>true});}catch{}
 rouletteDrawSource.start=callbacks=>{drawCallbacks=callbacks;};rouletteDrawSource.reset=()=>{};
}
function processed(engine,ball){return Math.max(finite(engine?.processed),finite(engine?.accepted),finite(engine?.draws?.length))>=ball;}
async function waitProcessed(ball,timeout=25000){
 const start=Date.now();while(Date.now()-start<timeout){if((app.engines||[]).every((engine,index)=>app.enabled?.[index]===false||processed(engine,ball)))return true;await sleep(20);}return false;
}
function prepareWork(work){
 const state=work.state||{},totalBet=(state.locked||state.bets||[]).reduce((sum,value,index)=>sum+(state.enabled?.[index]===false?0:finite(value)),0);
 app.phase='ready';app.paused=false;app.fastForward=true;app.drawHeld=false;app.bets=[...(state.bets||[])];app.locked=[...(state.locked||state.bets||[])];app.enabled=[...(state.enabled||[])];
 app.credit=finite(state.credit)+totalBet;app.displayCredit=app.credit;debugPayoutTarget=finite(work.rate)||90;drawCallbacks=null;
 const started=app.start();if(started===false)throw Error('worker_game_start_rejected');
}
async function settleWork(work){
 prepareWork(work);const waitStart=Date.now();while(!drawCallbacks&&Date.now()-waitStart<8000)await sleep(20);if(!drawCallbacks)throw Error('worker_draw_callbacks_missing');
 restore(app,work.state);app.phase='playing';app.paused=false;app.dealing=true;app.fastForward=true;app.drawHeld=false;
 for(const engine of app.engines||[]){try{engine.paused=false;engine.presentationRate=100;}catch{}}
 const startBall=Math.max(0,Number(work.stableBall)||0),balls=[...(work.balls||[])].sort((a,b)=>Number(a.index)-Number(b.index));
 for(const ball of balls){
  const index=Number(ball.index);if(index<=startBall)continue;let accepted=false,started=Date.now();
  while(!accepted&&Date.now()-started<12000){app.paused=false;app.drawHeld=false;try{accepted=drawCallbacks.onNumber?.(Number(ball.number))!==false;}catch{}if(!accepted)await sleep(20);}
  if(!accepted)throw Error('worker_ball_rejected_'+index);if(!await waitProcessed(index))throw Error('worker_ball_timeout_'+index);
 }
 const finishStart=Date.now();while(app.phase==='playing'&&Date.now()-finishStart<10000){const allPaid=(app.enabled||[]).every((yes,index)=>!yes||app.paid?.[index]);if(allPaid)break;await sleep(25);}
 const allProcessed=(app.enabled||[]).every((yes,index)=>!yes||processed(app.engines?.[index],8));if(!allProcessed)throw Error('worker_incomplete_engines');
 if(app.phase==='playing'){
  for(let index=0;index<(app.engines||[]).length;index++){
   if(app.enabled?.[index]===false||app.paid?.[index])continue;const engine=app.engines[index],bet=finite(app.locked?.[index]);app.roundWins[index]=Math.max(0,finite(medalWin(bet,finite(engine?.totalHundredths))));app.paid[index]=true;
  }
  app.dealing=false;app.fastForward=false;for(const engine of app.engines||[])engine.presentationRate=1;app.finishRound();
 }
 const games=[];for(let index=0;index<(app.engines||[]).length;index++){
  if(app.enabled?.[index]===false)continue;games.push({id:gameId(app.engines[index],index),bet:Math.max(0,finite(app.locked?.[index])),win:Math.max(0,finite(app.roundWins?.[index])),appliedRate:finite(work.rate)||90});
 }
 const totalWin=Math.max(0,finite(app.totalWin)||games.reduce((sum,item)=>sum+item.win,0)),creditAfter=finite(work.state?.credit)+totalWin;
 await api(`/api/admin/machines/${encodeURIComponent(machine)}/payout-v3/offline-work/complete`,{method:'POST',body:JSON.stringify({token:work.token,playerId:work.playerId,roundId:work.roundId,totalWin,creditAfter,games,digest:`server-worker:${work.roundId}:${totalWin}`})});
 console.info('[OfflineSettlementWorkerV3] settled',work.roundId,work.playerId,totalWin);
}
async function loop(){
 if(busy)return;busy=true;try{
  const response=await api(`/api/admin/machines/${encodeURIComponent(machine)}/payout-v3/offline-work`),work=response.work;
  if(!work){busy=false;setTimeout(loop,500);return;}
  try{await settleWork(work);setTimeout(()=>location.reload(),120);return;}
  catch(error){console.error('[OfflineSettlementWorkerV3]',error);try{await api(`/api/admin/machines/${encodeURIComponent(machine)}/payout-v3/offline-work/fail`,{method:'POST',body:JSON.stringify({token:work.token,playerId:work.playerId,roundId:work.roundId,error:String(error?.message||error)})});}catch{}setTimeout(()=>location.reload(),500);return;}
 }catch(error){console.warn('[OfflineSettlementWorkerV3] poll',error?.message||error);}busy=false;setTimeout(loop,800);
}
function install(){
 if(typeof app==='undefined'||typeof rouletteDrawSource==='undefined'||typeof debugPayoutTarget==='undefined'||typeof medalWin!=='function'){setTimeout(install,60);return;}
 const style=document.createElement('style');style.textContent='html,body{background:#02070b!important;overflow:hidden!important}body>*{opacity:.001!important;pointer-events:none!important}';document.head.append(style);
 installDrawCapture();console.info('[OfflineSettlementWorkerV3] server-side no-presentation settlement worker ready');loop();
}
install();
})();

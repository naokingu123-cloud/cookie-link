(()=>{
'use strict';
if(window.__sweetsPayoutControlV3)return;window.__sweetsPayoutControlV3=true;
if(new URLSearchParams(location.search).get('serverHost')==='1'||new URLSearchParams(location.search).get('serverSettlementWorker')==='1')return;

const ALIASES={six:'candy',drop:'candy',sixdrop:'candy',waffle:'stick',cookie:'cookie',choco:'choco',candy:'candy',gelato:'gelato',winery:'winery',jelly:'jelly',popcorn:'popcorn',stick:'stick',castella:'castella'};
const WALLET_KEY='sweets-payout-wallet-v3';
let controls={version:3,effectiveRate:90,games:{}},saveChain=Promise.resolve(),lastSignature='',clientRef=null,offlineResetKey='',pollTimer=0;
const appliedRates=new Map();
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const finite=value=>Number.isFinite(Number(value))?Number(value):0;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));
const gameId=(engine,index)=>ALIASES[String(engine?.kind||engine?.id||'').toLowerCase()]||String(engine?.kind||engine?.id||('game-'+index)).toLowerCase();
const commonRate=()=>clamp(controls?.effectiveRate??controls?.targetRate??90,50,150);
const readWallet=()=>{try{return JSON.parse(localStorage.getItem(WALLET_KEY)||'null')||{};}catch{return {};}};
const writeWallet=value=>{try{localStorage.setItem(WALLET_KEY,JSON.stringify(value));}catch{}};

function setDisplay(){
 const rate=commonRate();debugPayoutTarget=rate;
 const input=document.getElementById('debug-payout-rate'),status=document.getElementById('debug-payout-status');
 if(input){input.value=String(Math.round(rate*10)/10);input.step='0.1';input.dataset.serverManaged='3';input.disabled=true;input.title='サーバー管理：全ゲーム共通の設定PO';}
 if(status){const mode=controls.mode==='manual'?'手動':'自動';status.textContent=`サーバー${mode}設定 ${rate.toFixed(1)}%（全ゲーム共通・次ゲーム盤面へ適用）`;}
 window.dispatchEvent(new CustomEvent('sweets:payout-control-v3',{detail:controls}));
}
function signature(control){return JSON.stringify([Number(control?.effectiveRate),control?.mode,Number(control?.manualRate),Number(control?.wallet?.revision),!!control?.offlinePending]);}
function withCommonRate(engine,index,native,args){const rate=commonRate(),previous=debugPayoutTarget,id=gameId(engine,index);debugPayoutTarget=rate;appliedRates.set(id,rate);try{return native.apply(engine,args);}finally{debugPayoutTarget=previous;}}
function installEngineWrappers(){
 if(typeof app==='undefined'||!app?.engines)return;
 app.engines.forEach((engine,index)=>{
  if(!engine||engine.__serverPayoutV3)return;engine.__serverPayoutV3=true;
  for(const method of ['reset','freshBoard'])if(typeof engine[method]==='function'){const native=engine[method];engine[method]=function(...args){return withCommonRate(engine,index,native,args);};}
 });
}
function regenerateReadyBoards(){
 if(typeof app==='undefined'||app.phase!=='ready'||(typeof jpcSession!=='undefined'&&jpcSession?.active))return;
 const rate=commonRate(),previous=debugPayoutTarget;debugPayoutTarget=rate;
 try{
  for(let index=0;index<(app.engines||[]).length;index++){
   const engine=app.engines[index];if(!engine)continue;const id=gameId(engine,index);appliedRates.set(id,rate);
   if(id==='choco'){try{engine.checkpoint=null;if(typeof engine.freshBoard==='function')engine.freshBoard();}catch{}}
   try{if(typeof engine.reset==='function')engine.reset({keepWonder:true,keepHammers:true});}catch(error){console.warn('[PayoutControlV3] board refresh',error);}
  }
 }finally{debugPayoutTarget=previous;}
 try{app.onChange?.(app);}catch{}
}
function resetToServerWaiting(credit,reason='サーバー精算済み'){ 
 try{rouletteDrawSource?.reset?.();}catch{}
 try{
  app.payout=null;app.result=null;app.dealing=false;app.fastForward=false;app.drawHeld=false;
  for(const engine of app.engines||[]){try{engine.paused=false;engine.presentationRate=1;}catch{}}
  if(app.phase!=='ready'){
   app.phase='complete';
   if(typeof app.prepare==='function')app.prepare();
   else{app.phase='ready';app.draws=[];app.paid=(app.paid||[]).map(()=>false);app.roundWins=(app.roundWins||[]).map(()=>0);app.totalWin=0;}
  }
  if(Number.isFinite(Number(credit))){app.credit=Number(credit);app.displayCredit=Number(credit);}
  app.onChange?.(app);
  if(typeof countdownText==='function')countdownText('WAIT',reason+'・次のBET TIME待機');
 }catch(error){console.warn('[PayoutControlV3] reset after server settlement',error);}
}
function applyWallet(control){
 const wallet=control?.wallet;if(!wallet||!Number(wallet.revision))return;
 const local=readWallet(),samePlayer=String(local.playerId||'')===String(control.playerId||''),seen=samePlayer?Number(local.revision)||0:0;
 if(Number(wallet.revision)<=seen)return;
 writeWallet({playerId:control.playerId,revision:Number(wallet.revision),credit:wallet.credit,lastRoundId:wallet.lastRoundId});
 resetToServerWaiting(wallet.credit,wallet.source==='server-worker'?'切断中ラウンドをサーバーで即時精算':'精算反映');
}
function applyControl(control){
 if(!control||Number(control.version)!==3)return;
 const before=commonRate(),nextSignature=signature(control),changed=nextSignature!==lastSignature;controls=control;installEngineWrappers();setDisplay();applyWallet(control);
 if(control.offlinePending){
  const key=String(control.currentRoundId||'offline');if(offlineResetKey!==key){offlineResetKey=key;resetToServerWaiting(null,'切断中ラウンドをサーバー精算中');}
 }else offlineResetKey='';
 if(changed){lastSignature=nextSignature;if(app?.phase==='ready'&&Math.abs(commonRate()-before)>.01)queueMicrotask(regenerateReadyBoards);}
}
function processed(engine,ball){return Math.max(finite(engine?.processed),finite(engine?.accepted),finite(engine?.draws?.length))>=ball;}
async function waitForBall(ball,timeout=18000){
 if(ball<=0)return true;const started=Date.now();while(Date.now()-started<timeout){if((app.engines||[]).every((engine,index)=>app.enabled?.[index]===false||processed(engine,ball)))return true;await sleep(50);}return false;
}
function previewWin(engine,bet,index){if(app.paid?.[index])return Math.max(0,finite(app.roundWins?.[index]));try{return Math.max(0,finite(medalWin(Math.max(0,bet),finite(engine?.totalHundredths))));}catch{return Math.max(0,finite(app.roundWins?.[index]));}}
function gameBetRows(){const rows=[];for(let index=0;index<(app.engines||[]).length;index++){if(app.enabled?.[index]===false)continue;const engine=app.engines[index];rows.push({id:gameId(engine,index),bet:Math.max(0,finite(app.bets?.[index]))});}return rows;}
function telemetry(ball,complete){
 const games=[];let roundWin=0,roundBet=0;
 for(let index=0;index<(app.engines||[]).length;index++){
  if(app.enabled?.[index]===false)continue;const engine=app.engines[index],id=gameId(engine,index),bet=Math.max(0,finite(app.locked?.[index]??app.bets?.[index])),win=previewWin(engine,bet,index);
  roundBet+=bet;roundWin+=win;games.push({id,bet,win,processed:Math.max(finite(engine?.processed),finite(engine?.accepted),finite(engine?.draws?.length)),appliedRate:appliedRates.get(id)??commonRate()});
 }
 if(ball>=8&&Number.isFinite(Number(app.totalWin))&&['result','paying','complete'].includes(app.phase))roundWin=Math.max(roundWin,finite(app.totalWin));
 return {version:3,ball,number:Number(app.draws?.[ball-1])||null,complete,phase:app.phase,credit:finite(app.credit),roundBet,roundWin,games,commonRate:commonRate(),debugTarget:finite(debugPayoutTarget),capturedAt:Date.now()};
}
function installClient(){
 const client=window.SweetsSharedMachine?.client;if(!client){setTimeout(installClient,80);return;}clientRef=client;
 const originalSave=client.save.bind(client),originalSettle=client.settle.bind(client),originalJoin=client.join.bind(client),originalState=client.getState.bind(client);
 client.save=function(payload){
  const request={...payload,state:payload?.state&&typeof payload.state==='object'?{...payload.state}:payload?.state};
  saveChain=saveChain.catch(()=>{}).then(async()=>{const ball=clamp(Number(request.ballIndex)||0,0,8),complete=await waitForBall(ball);if(request.state)request.state.payoutV3=telemetry(ball,complete);const response=await originalSave(request);applyControl(response?.payoutControlV3);return response;});return saveChain;
 };
 client.settle=async function(payload){
  await waitForBall(8);const final=telemetry(8,true);if(Number.isFinite(Number(payload?.totalWin)))final.roundWin=Number(payload.totalWin);
  const response=await originalSettle({...payload,payoutV3:final});applyControl(response?.payoutControlV3);return response;
 };
 client.join=async function(payload){
  const response=await originalJoin({...payload,payoutV3Bet:{version:3,games:gameBetRows()}});applyControl(response?.payoutControlV3);return response;
 };
 client.getState=async function(...args){const response=await originalState(...args);applyControl(response?.payoutControlV3);return response;};
 client.on(message=>applyControl(message?.payoutControlV3));
 originalState().then(response=>applyControl(response?.payoutControlV3)).catch(()=>{});
 clearInterval(pollTimer);pollTimer=setInterval(()=>{if(!client.online)return;client.getState().catch(()=>{});},controls.offlinePending?650:1800);
}
function install(){
 if(typeof app==='undefined'||typeof debugPayoutTarget==='undefined'||typeof medalWin!=='function'){setTimeout(install,60);return;}
 installEngineWrappers();installClient();setDisplay();
 console.info('[PayoutControlV3] one common server rate per player; BET changes are repriced before board lock');
}
install();
})();

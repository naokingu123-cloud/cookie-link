(()=>{
'use strict';
if(window.__sweetsPayoutControlV3)return;window.__sweetsPayoutControlV3=true;
if(new URLSearchParams(location.search).get('serverHost')==='1'||new URLSearchParams(location.search).get('serverSettlementWorker')==='1')return;

const ALIASES={six:'candy',drop:'candy',sixdrop:'candy',waffle:'stick',cookie:'cookie',choco:'choco',candy:'candy',gelato:'gelato',winery:'winery',jelly:'jelly',popcorn:'popcorn',stick:'stick',castella:'castella'};
const WALLET_KEY='sweets-payout-wallet-v3';
let controls={version:3,effectiveRate:90,games:{}},saveChain=Promise.resolve(),lastSignature='',clientRef=null,offlineResetKey='',appliedWallet=null;
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
function resetToServerWaiting(credit,reason='サーバー精算済み',wallet={},options={}){
 try{rouletteDrawSource?.reset?.();}catch{}
 try{
  app.payout=null;app.result=null;app.dealing=false;app.fastForward=false;
  for(const engine of app.engines||[]){try{engine.paused=false;engine.presentationRate=1;}catch{}}
  if(app.phase!=='ready'){
   app.phase='complete';
   if(typeof app.prepare==='function')app.prepare();
   else{app.phase='ready';app.draws=[];app.paid=(app.paid||[]).map(()=>false);app.roundWins=(app.roundWins||[]).map(()=>0);app.totalWin=0;}
  }
  if(credit!=null&&Number.isFinite(Number(credit)))updateWalletCredit(Number(credit),wallet,options);
  app.onChange?.(app);
  if(typeof countdownText==='function')countdownText('WAIT',reason+'・次のBET TIME待機');
 }catch(error){console.warn('[PayoutControlV3] reset after server settlement',error);}
}
function updateWalletCredit(credit,wallet={},options={}){
 const projected=window.SweetsSharedControllerV224?.projectWalletCredit?.(credit,wallet,options);
 const available=Number.isFinite(projected)?projected:credit;
 if(options.repeated&&app.credit===available&&app.displayCredit===available)return;
 app.credit=available;app.displayCredit=available;
 try{app.onChange?.(app);}catch{}
 try{window.SweetsSharedControllerV224?.refreshBetControls?.(app);}catch{}
}
function applyWallet(control,{acknowledgedRoundId='',joiningRoundId='',joinRejected=false,round:stateRound=null}={}){
 const wallet=control?.wallet,playerId=String(control?.playerId||''),revision=Number(wallet?.revision),credit=Number(wallet?.credit);
 if(!wallet||!Number.isFinite(revision)||revision<=0||wallet.credit==null||!Number.isFinite(credit)||credit<0)return;
 if(clientRef?.playerId&&playerId!==String(clientRef.playerId))return;
 const local=readWallet(),samePlayer=String(local.playerId||'')===playerId,seen=samePlayer?Number(local.revision)||0:0;
 const applied=appliedWallet?.playerId===playerId?Number(appliedWallet.revision)||0:0;
 // The persistent cache records what a previous page observed; it does not
 // mean that this new Arcade instance has received that balance already.
 if(revision<seen||revision<applied)return;
 const lifecycle=window.SweetsSharedControllerV224?.describe?.(),repeated=revision===applied;
 if(repeated&&!lifecycle?.localReserved&&!lifecycle?.pendingDebitRoundId)return;
 const walletRoundId=String(wallet.lastRoundId||''),ownAcknowledgement=wallet.source==='client'&&!!acknowledgedRoundId&&walletRoundId===String(acknowledgedRoundId);
 const shared=window.SweetsSharedMachine?.active;
 const reservedId=String(shared?.roundId||lifecycle?.startedRoundId||lifecycle?.joinedRoundId||''),attemptId=String(lifecycle?.pendingBetRoundId||''),round=clientRef?.round;
 const pendingId=attemptId&&round?.id===attemptId&&['BETTING','PLAYING'].includes(round.phase)&&!round.participant?.settlement?attemptId:'',protectedId=reservedId||pendingId;
 const betWallet=wallet.source==='bet',currentBet=betWallet&&!!protectedId&&walletRoundId===protectedId;
 const ownBet=betWallet&&!!joiningRoundId&&walletRoundId===String(joiningRoundId)&&(!protectedId||protectedId===String(joiningRoundId));
 const rejectedBet=joinRejected&&!!joiningRoundId&&!reservedId&&(!pendingId||pendingId===String(joiningRoundId));
 // The lifecycle controller owns normal settlement and board transitions.
 // Acknowledging our own settlement must not call reset() and turn a WIN into
 // an abandoned round. Only this reservation's BET balance can change an
 // active/reserved board; an older round's wallet must not undo its debit.
 if(protectedId&&!ownAcknowledgement&&!currentBet&&!ownBet&&!rejectedBet)return;
 if(betWallet&&!rejectedBet&&['result','paying','complete'].includes(String(app.phase)))return;
 writeWallet({playerId,revision,credit,lastRoundId:wallet.lastRoundId,source:wallet.source,reservedRoundId:wallet.reservedRoundId||null});
 appliedWallet={playerId,revision};
 if(ownAcknowledgement)return;
 // A successful BET (or rejected over-budget BET) updates the available
 // balance without resetting the selected board or interrupting its start.
 if(betWallet||rejectedBet||app.phase==='ready'){updateWalletCredit(credit,wallet,{joiningRoundId,joinRejected,round:stateRound,repeated});return;}
 resetToServerWaiting(credit,wallet.source==='server-worker'?'切断中ラウンドをサーバーで即時精算':'精算反映',wallet,{joiningRoundId,joinRejected,round:stateRound,repeated});
}
function applyControl(control,options={}){
 if(!control||Number(control.version)!==3)return;
 if(String(control.playerId||'')===String(controls.playerId||'')&&Number(control.updatedAt)>0&&Number(control.updatedAt)<Number(controls.updatedAt))return;
 const before=commonRate(),nextSignature=signature(control),changed=nextSignature!==lastSignature;controls=control;installEngineWrappers();setDisplay();applyWallet(control,options);
 if(control.offlinePending&&!window.SweetsSharedControllerV224){
  const key=String(control.currentRoundId||'offline');if(offlineResetKey!==key){offlineResetKey=key;resetToServerWaiting(null,'切断中ラウンドをサーバー精算中');}
 }else offlineResetKey='';
 if(changed){lastSignature=nextSignature;if(app?.phase==='ready'&&Math.abs(commonRate()-before)>.01)queueMicrotask(regenerateReadyBoards);}
}
function applyStateControl(response,options={}){
 if(clientRef?.isStaleState?.(response)===true)return;
 applyControl(response?.payoutControlV3,{...options,round:response?.round});
}
function processed(engine,ball){return Math.max(finite(engine?.processed),finite(engine?.accepted),finite(engine?.draws?.length))>=ball;}
async function waitForBall(ball,timeout=18000,current=()=>true){
 if(ball<=0)return current();const started=Date.now();while(Date.now()-started<timeout){if(!current())return false;if((app.engines||[]).every((engine,index)=>app.enabled?.[index]===false||processed(engine,ball)))return true;await sleep(50);}return false;
}
function previewWin(engine,bet,index){if(app.paid?.[index])return Math.max(0,finite(app.roundWins?.[index]));try{return Math.max(0,finite(medalWin(Math.max(0,bet),finite(engine?.totalHundredths))));}catch{return Math.max(0,finite(app.roundWins?.[index]));}}
function gameBetRows(payload){
 const bets=Array.isArray(payload?.bets)?payload.bets:app.bets,enabled=Array.isArray(payload?.enabled)?payload.enabled:(Array.isArray(payload?.bets)?bets.map(value=>finite(value)>0):app.enabled),rows=[];
 for(let index=0;index<(app.engines||[]).length;index++){if(enabled?.[index]===false)continue;const engine=app.engines[index];rows.push({id:gameId(engine,index),bet:Math.max(0,finite(bets?.[index]))});}return rows;
}
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
  const token=app.token,roundId=String(request.roundId||'');
  const current=()=>app.token===token&&String(window.SweetsSharedMachine?.active?.roundId||'')===roundId;
  saveChain=saveChain.catch(()=>{}).then(async()=>{
   const ball=clamp(Number(request.ballIndex)||0,0,8);
   if(!current())return {ok:true,skipped:true,reason:'round_changed'};
   const complete=await waitForBall(ball,18000,current);
   if(!current())return {ok:true,skipped:true,reason:'round_changed'};
   if(request.state)request.state.payoutV3=telemetry(ball,complete);
   const response=await originalSave(request);applyControl(response?.payoutControlV3);return response;
  });return saveChain;
 };
 client.prepareSettlement=function(payload){
  // Freeze the completed board once. Retries, including after a page reload,
  // must retain that round's game-level WIN/BET and applied payout rate.
  const saved=payload?.payoutV3;
  const final=Number(saved?.version)===3?JSON.parse(JSON.stringify(saved)):telemetry(8,true);
  if(Number.isFinite(Number(payload?.totalWin)))final.roundWin=Number(payload.totalWin);
  if(payload?.abandoned===true){final.roundWin=0;final.games=(final.games||[]).map(game=>({...game,win:0}));}
  return {...payload,payoutV3:final};
 };
 client.settle=async function(payload){
  // Immediate reset starts only after beginPayout has calculated the final WIN.
  // Capture telemetry synchronously before the board is reset; waiting here would
  // observe the newly prepared board and could delay settlement for 18 seconds.
  const abandoned=payload?.abandoned===true;
  const immediate=payload?.immediateReset===true||abandoned||['result','paying','complete'].includes(app.phase);
  if(!immediate&&Number(payload?.payoutV3?.version)!==3)await waitForBall(8);
  const response=await originalSettle(client.prepareSettlement(payload));applyControl(response?.payoutControlV3,{acknowledgedRoundId:String(payload?.roundId||'')});return response;
 };
 client.join=async function(payload){
  try{
   const response=await originalJoin({...payload,payoutV3Bet:{version:3,games:gameBetRows(payload)}});
   const participant=response?.round?.participant,matching=String(response?.round?.id||'')===String(payload?.roundId||'')&&(!participant?.clientRoundToken||participant.clientRoundToken===payload?.clientRoundToken);
   applyStateControl(response,{joiningRoundId:matching?String(payload?.roundId||''):''});return response;
  }catch(error){
   if(error?.status===409&&error?.data?.error==='insufficient_credit')applyStateControl(error.data,{joiningRoundId:String(payload?.roundId||''),joinRejected:true});
   throw error;
  }
 };
 client.getState=async function(...args){const response=await originalState(...args);applyStateControl(response);return response;};
 client.on(message=>applyControl(message?.payoutControlV3,{round:message?.round}));
 originalState().then(response=>applyStateControl(response)).catch(()=>{});
 // The shared controller is the only owner of periodic state reconciliation.
 // All its responses already pass through the getState wrapper above, including
 // retry/cooldown handling; an independent timer would bypass that policy.
}
function install(){
 if(typeof app==='undefined'||typeof debugPayoutTarget==='undefined'||typeof medalWin!=='function'){setTimeout(install,60);return;}
 installEngineWrappers();installClient();setDisplay();
 console.info('[PayoutControlV3] one common server rate per player; BET changes are repriced before board lock');
}
install();
})();


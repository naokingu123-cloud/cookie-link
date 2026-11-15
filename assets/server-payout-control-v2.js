(()=>{
'use strict';
if(window.__sweetsPayoutControlV2)return;window.__sweetsPayoutControlV2=true;
if(new URLSearchParams(location.search).get('serverHost')==='1')return;

const ALIASES={six:'candy',drop:'candy',sixdrop:'candy',waffle:'stick',castella:'castella',cookie:'cookie',choco:'choco',candy:'candy',gelato:'gelato',winery:'winery',jelly:'jelly',popcorn:'popcorn',stick:'stick'};
let controls={version:2,weightedRate:90,games:{}},saveChain=Promise.resolve(),lastControlSignature='';
const appliedRates=new Map();
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const finite=value=>Number.isFinite(Number(value))?Number(value):0;
const gameId=(engine,index)=>ALIASES[String(engine?.kind||engine?.id||'').toLowerCase()]||String(engine?.kind||engine?.id||('game-'+index)).toLowerCase();
const currentRate=id=>{
 const value=controls?.games?.[id]?.effectiveRate;
 return Math.max(50,Math.min(150,Number.isFinite(Number(value))?Number(value):Number(controls.weightedRate)||90));
};

function setDisplay(){
 const weighted=Math.max(50,Math.min(150,Number(controls.weightedRate)||90));
 // Direct lexical assignment is authoritative; this bypasses the integer-only
 // debug button and therefore cannot silently remain at a prior 150% value.
 debugPayoutTarget=weighted;
 const input=document.getElementById('debug-payout-rate'),status=document.getElementById('debug-payout-status');
 if(input){input.value=String(Math.round(weighted*10)/10);input.step='0.1';input.dataset.serverManaged='2';input.disabled=true;input.title='SERVER管理: 各ゲーム個別設定';}
 if(status){
  const list=Object.entries(controls.games||{}).map(([id,g])=>id+' '+Number(g.effectiveRate).toFixed(1)+'%').join(' / ');
  status.textContent='SERVER個別PO '+(list||weighted.toFixed(1)+'%')+'（次ゲーム生成時に直接適用）';
 }
 window.dispatchEvent(new CustomEvent('sweets:payout-control-v2',{detail:controls}));
}
function controlSignature(control){return JSON.stringify(Object.entries(control?.games||{}).sort().map(([id,g])=>[id,Number(g.effectiveRate),g.mode,Number(g.manualRate)]));}
function regenerateReadyBoards(){
 if(typeof app==='undefined'||app.phase!=='ready'||typeof jpcSession!=='undefined'&&jpcSession?.active)return;
 for(let index=0;index<(app.engines||[]).length;index++){
  const engine=app.engines[index];if(!engine)continue;
  try{if(gameId(engine,index)==='choco'){engine.checkpoint=null;if(typeof engine.freshBoard==='function')engine.freshBoard();}if(typeof engine.reset==='function')engine.reset({keepWonder:true,keepHammers:true});}catch(error){console.warn('[PayoutControlV2] board refresh',error);}
 }
 try{app.onChange?.(app);}catch{}
}
function applyControl(control){
 if(!control||Number(control.version)!==2)return;
 const signature=controlSignature(control),changed=signature!==lastControlSignature;controls=control;installEngineWrappers();setDisplay();
 if(changed&&app?.phase==='ready'){lastControlSignature=signature;queueMicrotask(regenerateReadyBoards);}else if(changed)lastControlSignature=signature;
}
function withGameRate(engine,index,native,args){
 const id=gameId(engine,index),next=currentRate(id),previous=debugPayoutTarget;
 debugPayoutTarget=next;appliedRates.set(id,next);
 try{return native.apply(engine,args);}finally{debugPayoutTarget=previous;}
}
function installEngineWrappers(){
 if(typeof app==='undefined'||!app?.engines)return;
 app.engines.forEach((engine,index)=>{
  if(!engine||engine.__serverPayoutV2)return;engine.__serverPayoutV2=true;
  for(const method of ['reset','freshBoard']){
   if(typeof engine[method]!=='function')continue;
   const native=engine[method];engine[method]=function(...args){return withGameRate(engine,index,native,args);};
  }
 });
}
function processed(engine,ball){return Math.max(finite(engine?.processed),finite(engine?.accepted),finite(engine?.draws?.length))>=ball;}
async function waitForBall(ball,timeout=15000){
 if(ball<=0)return true;const started=Date.now();
 while(Date.now()-started<timeout){
  const okay=(app.engines||[]).every((engine,index)=>app.enabled?.[index]===false||processed(engine,ball));
  if(okay)return true;await sleep(60);
 }
 return false;
}
function previewWin(engine,bet,index){
 if(app.paid?.[index])return Math.max(0,finite(app.roundWins?.[index]));
 try{return Math.max(0,finite(medalWin(Math.max(0,bet),finite(engine?.totalHundredths))));}catch{return Math.max(0,finite(app.roundWins?.[index]));}
}
function telemetry(ball,complete){
 const games=[];let roundWin=0;
 for(let index=0;index<(app.engines||[]).length;index++){
  if(app.enabled?.[index]===false)continue;
  const engine=app.engines[index],id=gameId(engine,index),bet=Math.max(0,finite(app.locked?.[index]??app.bets?.[index])),win=previewWin(engine,bet,index);
  roundWin+=win;games.push({id,bet,win,processed:Math.max(finite(engine?.processed),finite(engine?.accepted)),appliedRate:appliedRates.get(id)??currentRate(id)});
 }
 return {version:2,ball,number:Number(app.draws?.[ball-1])||null,complete,credit:finite(app.credit),roundWin,games,debugTarget:finite(debugPayoutTarget),capturedAt:Date.now()};
}
function installClient(){
 const client=window.SweetsSharedMachine?.client;if(!client){setTimeout(installClient,80);return;}
 const originalSave=client.save.bind(client);
 client.save=function(payload){
  const request={...payload,state:payload?.state&&typeof payload.state==='object'?{...payload.state}:payload?.state};
  saveChain=saveChain.catch(()=>{}).then(async()=>{
   const ball=Math.max(0,Math.min(8,Number(request.ballIndex)||0)),complete=await waitForBall(ball);
   if(request.state)request.state.payoutV2=telemetry(ball,complete);
   const response=await originalSave(request);applyControl(response?.payoutControlV2);return response;
  });
  return saveChain;
 };
 for(const method of ['getState','join']){
  if(typeof client[method]!=='function')continue;const native=client[method].bind(client);
  client[method]=async function(...args){const response=await native(...args);applyControl(response?.payoutControlV2);return response;};
 }
 client.on(message=>applyControl(message?.payoutControlV2));
 client.getState().then(response=>applyControl(response?.payoutControlV2)).catch(()=>{});
}
function install(){
 if(typeof app==='undefined'||typeof debugPayoutTarget==='undefined'||typeof medalWin!=='function'){setTimeout(install,60);return;}
 installEngineWrappers();installClient();setDisplay();
 console.info('[PayoutControlV2] per-player x game rates active; debug button is display-only');
}
install();
})();

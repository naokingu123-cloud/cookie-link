/* Restores the original on-device roulette and its number-picker without a server session. */
(()=>{
 'use strict';
 const debug=window.SweetsLocalDebugV258;
 if(window.SweetsEditionV255?.value!=='local'||!debug)return;
 if(!LOCAL_EIGHT_DRAW_ALLOWED)throw Error('local_roulette_guard_not_enabled');
 const store=debug.storage,CREDIT_KEY='virtual-credit-v1',BETS_KEY='virtual-bets-v1';
 const credit=Number(store.getItem(CREDIT_KEY));
 if(store.getItem(CREDIT_KEY)!==null&&Number.isSafeInteger(credit)&&credit>=0&&credit<=1e12){app.credit=credit;app.displayCredit=credit;}
 let bets=null;try{bets=JSON.parse(store.getItem(BETS_KEY));}catch{}
 if(Array.isArray(bets)&&bets.length===app.bets.length&&bets.every(n=>Number.isSafeInteger(n)&&n>=0&&n<=1e12)){
  app.bets=[...bets];app.enabled=bets.map(n=>n>0);
 }
 let lastWallet='',lastBets='';
 function persist(){
  if(Number.isSafeInteger(app.credit)&&app.credit>=0&&app.credit<=1e12){const value=String(app.credit);if(value!==lastWallet){store.setItem(CREDIT_KEY,value);lastWallet=value;}}
  const bets=JSON.stringify(app.bets);if(bets!==lastBets){store.setItem(BETS_KEY,bets);lastBets=bets;}
 }
 const change=app.onChange;
 app.onChange=function(...args){const result=change.apply(this,args);persist();return result;};
 function localDangoEngines(){
  if(app.phase!=='playing')return [];
  return app.engines.filter((engine,index)=>engine?.kind==='dango'&&app.enabled[index]!==false&&Number(app.locked?.[index]??app.bets[index])>0);
 }
 function finishDangoThinkingV269(reason){
  if(app.draws.length!==5)return;
  for(const engine of localDangoEngines())engine.finishThinkingV251?.({reason});
 }
 function bindLocalDangoLaunchV269(){
  const draw=rouletteDriver?.draw;if(!draw||draw.__dangoLaunchV269)return;
  const prior=draw.canLaunchNormal;draw.__dangoLaunchV269=true;
  // DrawController calls this only inside launch(), after its physical clock,
  // group and canAdvance checks. An earlier closed gate must keep FREE editable.
  draw.canLaunchNormal=function(...args){
   if(prior?.apply(this,args)===false)return false;
   finishDangoThinkingV269('sixth-launch');return true;
  };
 }
 if(typeof loadCookieRoulette==='function'){
  const nativeLoad=loadCookieRoulette;
  loadCookieRoulette=async function(...args){try{return await nativeLoad.apply(this,args);}finally{bindLocalDangoLaunchV269();}};
 }
 const nativeStart=app.start;
 app.start=function(...args){bindLocalDangoLaunchV269();return nativeStart.apply(this,args);};
 const nativeAccept=app.acceptNumber;
 app.acceptNumber=function(...args){
  // Manual entry has no invented deadline: the sixth explicit selection is its
  // launch boundary. AUTO receives only the existing five-ball engine state.
  if(manualNumbers&&this.phase==='playing'&&!this.paused&&!this.drawHeld&&args[1]===this.token&&Number.isInteger(args[0])&&args[0]>=1&&args[0]<=25&&!this.draws.includes(args[0]))finishDangoThinkingV269('manual-sixth-launch');
  return nativeAccept.apply(this,args);
 };
 window.SweetsDangoThinkingV251={version:251,state:()=>{
  const engines=localDangoEngines(),ballCount=app.draws.length,active=ballCount===5&&engines.some(engine=>engine.state?.phase==='placing');
  const serverNow=manualNumbers?Date.now():Number(rouletteDriver?.physics?.time||0)*1000;
  const closesAt=active&&!manualNumbers?(Number(rouletteDriver?.physics?.hits?.[4]?.time)||serverNow/1000)*1000+5000:0;
  return {roundId:'local:'+app.token,enabled:engines.length>0,active,ballCount,serverNow,closesAt,remainingMs:active?(manualNumbers?Infinity:Math.max(1,closesAt-serverNow)):0,manual:manualNumbers};
 },checkpointPlacement:async()=>({ok:true,skipped:true,reason:'local_only'}),beforeSix:async()=>finishDangoThinkingV269('manual-sixth-launch')};
 bindLocalDangoLaunchV269();
 function setBets(values){
  if(app.phase!=='ready'||!Array.isArray(values)||values.length!==app.bets.length||!values.every(n=>Number.isSafeInteger(n)&&n>=0&&n<=1e12))return false;
  for(let i=0;i<values.length;i++)if(!app.setBet(i,values[i]))return false;
  persist();scheduleUI(app);return true;
 }
 const banner=document.createElement('aside');banner.id='local-debug-v258';banner.className='local-debug-banner';banner.setAttribute('aria-label','ローカルデバッグ版');
 banner.innerHTML='<strong>LOCAL DEBUG</strong><span>仮CREDIT · 精算なし</span><button type="button" data-local-action="reset-credit">仮CREDIT初期化</button><button type="button" data-local-action="chooser">版を選び直す</button>';
 banner.addEventListener('click',event=>{
  const action=event.target.closest('button')?.dataset.localAction;
  if(action==='chooser'){window.SweetsEditionV255?.show();return;}
  if(action==='reset-credit'&&app.phase==='ready'&&confirm('デバッグ用の仮CREDITを1,000,000に戻しますか？（サーバー残高に影響しません）')){app.credit=app.displayCredit=1000000;app.onChange(app);}
 });
 document.body.append(banner);
 window.SweetsLocalDebugV258.ready=true;
 window.SweetsLocalDebugV258.setBets=setBets;
 window.SweetsLocalDebugV258.describe=()=>({version:258,edition:'local',ready:true,localDrawAllowed:LOCAL_EIGHT_DRAW_ALLOWED,rouletteReady,hasRoulette:!!rouletteDriver,hasPhysics:!!rouletteDriver?.physics,rouletteState:rouletteDriver?.draw?.state||null,manualNumbers,phase:app.phase,draws:[...app.draws],drawHeld:app.drawHeld,credit:app.credit,bets:[...app.bets],serverClientPresent:!!window.SweetsSharedMachine,playerProfileServerAttached:!!window.SweetsPlayerProfileV255});
 persist();scheduleUI(app);
})();

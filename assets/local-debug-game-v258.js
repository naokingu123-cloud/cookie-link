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

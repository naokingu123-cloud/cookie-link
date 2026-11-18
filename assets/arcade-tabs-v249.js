/* v249: arcade logo faces, immediate tab selection and bounded visual feedback.
   This extension runs in the existing game scope. It never changes a board,
   wager, RNG, draw, payout, game clock or the server's current round. */
(()=>{
'use strict';
if(window.SweetsArcadeTabsV249)return;
const params=new URLSearchParams(location.search);
if(params.get('serverHost')==='1'||params.get('serverSettlementWorker')==='1')return;
const root=document.documentElement,deck=document.getElementById('tabs');
if(!deck||typeof select!=='function'||typeof paintTabWin!=='function')return;
root.classList.add('arcade-v249');
if(!document.getElementById('arcade-tabs-v249-css')){
 const link=document.createElement('link');link.id='arcade-tabs-v249-css';
 link.rel='stylesheet';link.href='assets/arcade-tabs-v249.css?v=249';document.head.append(link);
}
const media=matchMedia('(prefers-reduced-motion: reduce)');
const records=new Map(),selectionAnimations=new Set(),rewardAnimations=new Map();
let transitions=0,rewardBursts=0,serial=0,disposed=false;
const canMove=()=>!disposed&&!media.matches&&!document.hidden;
const scope=slot=>String(app?.token??'')+'/'+String(slot.engine?.version??'');
const labelFor=key=>window.SweetsArcadeBrandV249?.catalog?.[key]?.name||window.SweetsLineup?.catalog?.[key]?.name||key;
const logoFor=key=>window.SweetsArcadeBrandV249?.catalog?.[key]?.logo||'assets/arcade-v249/logo-'+key+'.webp';

function observeAnimation(target,frames,options,bucket,done){
 if(!canMove()||typeof target?.animate!=='function'){done?.();return null;}
 const animation=target.animate(frames,options);bucket.add(animation);
 animation.finished.then(()=>{bucket.delete(animation);done?.();},()=>{bucket.delete(animation);});
 return animation;
}
function stopSelection(){
 serial++;
 for(const animation of selectionAnimations)animation.cancel();selectionAnimations.clear();
 for(const slot of slots)slot.panel?.removeAttribute('data-v249-tabmotion');
 document.body.removeAttribute('data-v249-tabmotion');
}
function stopReward(slot){
 const record=records.get(slot.i);if(!record)return;
 const animation=rewardAnimations.get(slot.i);if(animation)animation.cancel();rewardAnimations.delete(slot.i);
 record.reward.hidden=true;slot.holder.classList.remove('v249-earned');
}
function fitTabAmount(slot,win){
 const selected=slot.i===active,width=selected?37:39,size=selected?11:14;
 const face=fitGoldenNumber(slot.tabWin,num(win),size,width);
 const fontSize=face.style.fontSize||size+'px';
 if(slot.tabWin.style.getPropertyValue('--v249-tab-win-size')!==fontSize)slot.tabWin.style.setProperty('--v249-tab-win-size',fontSize);
 const record=records.get(slot.i);if(record){record.paintedWin=win;record.paintedSelected=selected;record.paintedFitKey=face.dataset.fit;record.paintedFontSize=face.style.fontSize;record.paintedTransform=face.style.transform;}
}
function syncFace(){
 for(const slot of slots){
  const record=records.get(slot.i);if(!record)continue;
  const selected=slot.i===active;
  record.logo.setAttribute('data-selected',String(selected));
  // Native canvases stay mounted: switching back never reconstructs a mini board.
  fitTabAmount(slot,record.win);
 }
 document.body.dataset.v249SelectedGame=slots[active]?.holder?.dataset.gameKind||'';
}
function enterBoard(from,to){
 stopSelection();
 if(!canMove())return;
 const next=slots[to],previous=slots[from];if(!next)return;
 const oldOrder=Number(previous?.holder?.style.order)||from;
 const newOrder=Number(next.holder.style.order)||to;
 const direction=newOrder>=oldOrder?1:-1,token=serial;
 document.body.dataset.v249Tabmotion='enter';next.panel.dataset.v249Tabmotion='enter';
 const settle=()=>{
  if(token!==serial)return;
  next.panel.removeAttribute('data-v249-tabmotion');
  document.body.removeAttribute('data-v249-tabmotion');
 };
 // Individual transforms preserve each game's own scene/canvas transforms.
 observeAnimation(next.panel,[
  {translate:(direction*14)+'px 5px',scale:'.985',opacity:.48},
  {translate:'0px 0px',scale:'1',opacity:1}
 ],{duration:220,easing:'cubic-bezier(.16,.8,.24,1)'},selectionAnimations,settle);
 observeAnimation(next.tab,[
  {scale:'.96',translate:'0px 1px'},
  {scale:'1.025',translate:'0px -1px',offset:.64},
  {scale:'1',translate:'0px 0px'}
 ],{duration:210,easing:'cubic-bezier(.2,.7,.3,1)'},selectionAnimations);
}
function reward(slot,gain){
 const record=records.get(slot.i);if(!record||!canMove()||!(gain>0)||typeof record.reward.animate!=='function')return;
 stopReward(slot);
 fitGoldenNumber(record.amount,num(gain),17,65);
 record.reward.hidden=false;slot.holder.classList.add('v249-earned');
 record.rewardCount++;slot.holder.dataset.v249RewardCount=String(record.rewardCount);rewardBursts++;
 const animation=record.reward.animate([
  {opacity:0,scale:'.7',translate:'0px 5px'},
  {opacity:1,scale:'1.08',translate:'0px 0px',offset:.2},
  {opacity:1,scale:'1',translate:'0px -1px',offset:.73},
  {opacity:0,scale:'1.025',translate:'0px -6px'}
 ],{duration:680,easing:'cubic-bezier(.18,.75,.24,1)'});
 rewardAnimations.set(slot.i,animation);
 animation.finished.then(()=>{if(rewardAnimations.get(slot.i)===animation)stopReward(slot);},()=>{});
}
for(const slot of slots){
 const key=slot.holder?.dataset.gameKind;if(!key||slot.holder.hidden)continue;
 const wrap=slot.tab.querySelector('.mini-wrap');if(!wrap)continue;
 const logo=new Image();logo.className='v249-selected-logo';logo.src=logoFor(key);
 logo.alt='';logo.setAttribute('aria-hidden','true');logo.decoding='async';logo.draggable=false;
 logo.width=160;logo.height=80;logo.dataset.gameKind=key;wrap.append(logo);
 const rewardBox=document.createElement('span');rewardBox.className='v249-tab-reward';rewardBox.hidden=true;
 rewardBox.setAttribute('aria-hidden','true');
 rewardBox.innerHTML='<span class="v249-reward-stars"><i>✦</i><i>✦</i><i>✦</i><i>✧</i></span><span class="v249-reward-sum"><small>+</small><b class="v249-reward-amount"></b></span><em>WIN</em>';
 slot.holder.append(rewardBox);
 const shown=Number(slot.tabWin.textContent.replace(/[^0-9.\-]/g,''))||0;
 records.set(slot.i,{logo,reward:rewardBox,amount:rewardBox.querySelector('.v249-reward-amount'),win:shown,scope:scope(slot),rewardCount:0});
 slot.holder.dataset.v249RewardCount='0';slot.holder.dataset.v249GameLabel=labelFor(key);
 slot.tab.addEventListener('pointerdown',event=>{
  if(event.button!==0)return;slot.holder.classList.add('v249-pressed');
 },{passive:true});
 slot.tab.addEventListener('keydown',event=>{
  if(event.key==='Enter'||event.key===' ')slot.holder.classList.add('v249-pressed');
 });
 slot.tab.addEventListener('blur',()=>slot.holder.classList.remove('v249-pressed'));
}
const releasePress=()=>{for(const slot of slots)slot.holder?.classList.remove('v249-pressed');};
document.addEventListener('pointerup',releasePress,{passive:true});
document.addEventListener('pointercancel',releasePress,{passive:true});
document.addEventListener('keyup',releasePress,{passive:true});

const nativeSelect=select;
select=function(...args){
 const from=active,result=nativeSelect.apply(this,args),to=active;
 syncFace();
 if(from!==to){transitions++;enterBoard(from,to);}
 return result;
};
const nativePaintWin=paintTabWin;
paintTabWin=function(slot,value){
 const record=records.get(slot.i);
 if(!record)return nativePaintWin.apply(this,arguments);
 const win=Math.max(0,Number(value)||0),nextScope=scope(slot);
 const sameRound=record.scope===nextScope,gain=win-record.win;
 const face=slot.tabWin.querySelector('.gold-number');
 let result;
 // The older painter fits to a larger bay. Do not bounce between its old fit
 // and this card's fit on every HUD tick when the displayed amount is stable.
 if(record.paintedWin!==win||record.paintedSelected!==(slot.i===active)||
    slot.tabWin.parentNode.hidden!==(win<=0)||!face||face.textContent!==num(win)||
    face.dataset.fit!==record.paintedFitKey||face.style.fontSize!==record.paintedFontSize||face.style.transform!==record.paintedTransform){
  result=nativePaintWin.apply(this,arguments);fitTabAmount(slot,win);
 }
 record.win=win;record.scope=nextScope;
 if(!sameRound||win===0)stopReward(slot);
 else if(gain>0&&['playing','result','paying'].includes(app?.phase))reward(slot,gain);
 return result;
};
function quiet(){
 stopSelection();releasePress();for(const slot of slots)stopReward(slot);
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)quiet();});
if(typeof media.addEventListener==='function')media.addEventListener('change',quiet);
else if(typeof media.addListener==='function')media.addListener(quiet);
window.addEventListener('pagehide',()=>{disposed=true;quiet();});
window.addEventListener('pageshow',event=>{if(event.persisted){disposed=false;syncFace();}});
syncFace();
window.SweetsArcadeTabsV249={
 version:249,
 describe(){return {activeIndex:active,transitions,runningAnimations:selectionAnimations.size+rewardAnimations.size,reducedMotion:media.matches,rewardBursts,logos:records.size};}
};
})();

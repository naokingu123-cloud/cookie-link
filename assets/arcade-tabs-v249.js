/* v254: illustrated preview cards, sweet-shaped reach badges and four-number pages.
   This extension runs in the existing game scope. It never changes a board,
   wager, RNG, draw, payout, game clock or the server's current round. */
(()=>{
'use strict';
if(window.SweetsArcadeTabsV249)return;
const params=new URLSearchParams(location.search);
if(params.get('serverHost')==='1'||params.get('serverSettlementWorker')==='1')return;
const root=document.documentElement,deck=document.getElementById('tabs');
if(!deck||typeof select!=='function'||typeof paintTabWin!=='function')return;
root.classList.add('arcade-v249','arcade-tabs-v250');
if(!document.getElementById('arcade-tabs-v249-css')){
 const link=document.createElement('link');link.id='arcade-tabs-v249-css';
 link.rel='stylesheet';link.href='assets/arcade-tabs-v249.css?v=254';document.head.append(link);
}
const media=matchMedia('(prefers-reduced-motion: reduce)');
const reachFrame=new Image();reachFrame.decoding='async';
const reachFrameReady=new Promise(resolve=>{reachFrame.onload=()=>resolve(true);reachFrame.onerror=()=>resolve(false);reachFrame.src='assets/reach-art-v254/reach-common.webp?v=254';});
const records=new Map(),selectionAnimations=new Set(),rewardAnimations=new Map(),reachAnimations=new Map();
let transitions=0,rewardBursts=0,reachBursts=0,serial=0,disposed=false;
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
 const selected=slot.i===active,width=selected?36:33,size=selected?11:12;
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
 const backdrop=new Image();backdrop.className='v250-background-logo';backdrop.src=logoFor(key);
 backdrop.alt='';backdrop.setAttribute('aria-hidden','true');backdrop.decoding='async';backdrop.draggable=false;
 backdrop.width=768;backdrop.height=384;slot.tab.insertBefore(backdrop,wrap);
 // The native sugar element remains the single owner of tier/GET state.
 // Place it next to WIN instead of covering the miniature's top-right corner.
 slot.tabWin.parentElement.append(slot.tabSugar);
 const rewardBox=document.createElement('span');rewardBox.className='v249-tab-reward';rewardBox.hidden=true;
 rewardBox.setAttribute('aria-hidden','true');
 rewardBox.innerHTML='<span class="v249-reward-stars"><i>✦</i><i>✦</i><i>✦</i><i>✧</i></span><span class="v249-reward-sum"><small>+</small><b class="v249-reward-amount"></b></span><em>WIN</em>';
 slot.holder.append(rewardBox);
 const shown=Number(slot.tabWin.textContent.replace(/[^0-9.\-]/g,''))||0;
 const reachPop=document.createElement('span');reachPop.className='v250-reach-pop';reachPop.hidden=true;
 reachPop.setAttribute('role','status');reachPop.setAttribute('aria-live','polite');reachPop.setAttribute('aria-atomic','true');reachPop.dataset.gameKind=key;slot.holder.append(reachPop);
 records.set(slot.i,{logo,reward:rewardBox,amount:rewardBox.querySelector('.v249-reward-amount'),win:shown,scope:scope(slot),rewardCount:0,reachPop,reachSeen:new Map(),reachScope:scope(slot),reachKey:null});
 slot.holder.dataset.v249RewardCount='0';slot.holder.dataset.v249GameLabel=labelFor(key);
 slot.tab.addEventListener('pointerdown',event=>{
  if(event.button!==0)return;slot.holder.classList.add('v249-pressed');
 },{passive:true});
 slot.tab.addEventListener('keydown',event=>{
  if(event.key==='Enter'||event.key===' ')slot.holder.classList.add('v249-pressed');
 });
 slot.tab.addEventListener('blur',()=>slot.holder.classList.remove('v249-pressed'));
}

// Retain the native cycle button (including shared-server edit restrictions)
// but show exactly one of them, outside every game's miniature and tab button.
const firstVisible=slots.find(slot=>!slot.holder.hidden&&records.has(slot.i));
const commonBet=firstVisible?.cycle;
const commonBetHost=document.createElement('div');commonBetHost.className='v250-common-bet';
if(commonBet){
 const selectedUnit=unit[firstVisible.i]??4;unit.fill(selectedUnit);
 for(const slot of slots)if(slot.cycle!==commonBet){slot.cycle.hidden=true;slot.cycle.tabIndex=-1;slot.cycle.setAttribute('aria-hidden','true');}
 commonBet.classList.add('v250-shared-bet-switch');commonBetHost.append(commonBet);
 document.getElementById('console')?.append(commonBetHost);
 commonBet.onclick=()=>{
  if(commonBet.disabled||app?.phase!=='ready')return;
  const next=((unit[firstVisible.i]??4)+1)%units.length;unit.fill(next);
  syncCommonBet();scheduleUI(app);
 };
}
function syncCommonBet(){
 if(!commonBet)return;
 const amount=units[unit[firstVisible.i]];
 if(commonBet.dataset.amount!==String(amount)){
  commonBet.dataset.amount=String(amount);
  commonBet.innerHTML='<span>BET切替</span><strong>'+amount+'<small> BET</small></strong>';
  commonBet.setAttribute('aria-label','全ゲーム共通のBET追加数を切り替え。現在 '+amount+' BET');
 }
}
function syncSugar(){
 for(const slot of slots){
  if(!records.has(slot.i))continue;
  const collected=app?.bet(slot.i)>0&&!!slot.engine?.wonderCollected;
  if(slot.tabSugar.dataset.get!==String(collected))slot.tabSugar.dataset.get=String(collected);
  if(collected&&slot.tabWin.parentElement.hidden)slot.tabWin.parentElement.hidden=false;
 }
}
const nativeTabs=tabs;
tabs=function(...args){const result=nativeTabs.apply(this,args);syncSugar();syncCommonBet();return result;};
syncCommonBet();syncSugar();

function stopReach(slot){
 const record=records.get(slot.i);if(!record)return;
 const animation=reachAnimations.get(slot.i);if(animation)animation.cancel();reachAnimations.delete(slot.i);
 record.reachPop.hidden=true;
}
function popupReach(slot,tier){
 const record=records.get(slot.i);if(!record||!pagerRunning()||app?.phase!=='playing')return;
 stopReach(slot);
 const name=tier===3?'最高役':tier===2?'超高額':'高額';
 const label=name+'リーチ';
 const title=document.createElement('strong');title.textContent=label;
 // Reach numbers remain in their four-cell pager. The short-lived badge
 // announces only the award class, leaving its pastry center easy to read.
 record.reachPop.replaceChildren(title);record.reachPop.dataset.tier=String(tier);record.reachPop.dataset.motionPaused=String(media.matches);
 record.reachPop.setAttribute('aria-label',label+(tier===3&&slot.engine?.allReachName&&slot.engine.allReachName!=='最高役'?'（'+slot.engine.allReachName+'）':''));
 record.reachPop.hidden=false;reachBursts++;slot.holder.dataset.v250ReachPopCount=String((Number(slot.holder.dataset.v250ReachPopCount)||0)+1);
 record.reachPop.style.setProperty('--v254-reach-title-size',Math.max(7,Math.min(11,Math.min(record.reachPop.clientWidth||100,126)*.64/label.length))+'px');
 if(typeof record.reachPop.animate!=='function'){record.reachPop.hidden=true;return;}
 const animation=record.reachPop.animate(media.matches?[
  {opacity:0},{opacity:1,offset:.08},{opacity:1,offset:.9},{opacity:0}
 ]:[
  {opacity:0,scale:'.8',translate:'0 4px'},{opacity:1,scale:'1.05',translate:'0 0',offset:.16},
  {opacity:1,scale:'1',translate:'0 0',offset:.84},{opacity:0,scale:'1',translate:'0 -3px'}
 ],{duration:1600,easing:'ease-out'});
 reachAnimations.set(slot.i,animation);
 animation.finished.then(()=>{if(reachAnimations.get(slot.i)===animation)stopReach(slot);},()=>{});
}
const nativeVisibleTabReach=visibleTabReachResults;
const actualTabReaches=(slot,a)=>nativeVisibleTabReach(slot,a).filter(hit=>Number(hit.gain)>0).map(hit=>({
 ...hit,oddsUp:false,tier:hit.allClear?3:Number(hit.gain)>=1000?2:Number(hit.gain)>=300?1:0
})).sort((a,b)=>a.number-b.number);
// A page is still for two seconds, then moves left as its successor enters
// from the right. One timer serves every card, including nonselected games.
const REACH_HOLD_MS=REACH_PAGE_MS,REACH_SLIDE_MS=650;
let pagerTimerDue=0;
// Server-driven gameplay can remain unpaused while the record menu is open.
// These presentation flags are the source used by syncPause before its body class changes.
const pagerRunning=()=>!disposed&&app&&!app.paused&&!document.hidden&&inView&&
 !(typeof menuOpen!=='undefined'&&menuOpen)&&!(typeof userPaused!=='undefined'&&userPaused);
function pageMeta(slot,record){
 slot.reachStrip.dataset.pageSize=String(REACH_PAGE_SIZE);
 slot.reachStrip.dataset.pageIndex=String(slot.reachPage||0);
 slot.reachStrip.dataset.pageCount=String(Math.ceil((slot.reachPageResults?.length||0)/REACH_PAGE_SIZE));
 slot.reachStrip.dataset.pagePhase=record.reachPhase||'hold';
}
function completeReachPage(slot,record,now=Date.now()){
 if(slot.reachIncoming){slot.reachNumbers.remove();slot.reachNumbers=slot.reachIncoming;slot.reachIncoming=null;}
 slot.reachNumbers.className='v252-reach-page';
 slot.reachNumbers.style.removeProperty('transform');slot.reachNumbers.setAttribute('aria-hidden','false');
 record.reachPhase='hold';record.reachRemaining=REACH_HOLD_MS;
 slot.reachPageDue=pagerRunning()?now+REACH_HOLD_MS:0;pageMeta(slot,record);
}
function paintFourReaches(slot,record,{slide=false,now=Date.now()}={}){
 if(slot.reachIncoming)completeReachPage(slot,record,now);
 const results=slot.reachPageResults||[],page=results.slice((slot.reachPage||0)*REACH_PAGE_SIZE,((slot.reachPage||0)+1)*REACH_PAGE_SIZE);
 const next=document.createElement('div');next.className='v252-reach-page';next.setAttribute('aria-hidden','false');
 for(const hit of page){
  const digit=document.createElement('span');digit.className='reach-num';digit.dataset.reachTier=String(hit.tier);digit.textContent=String(hit.number);
  digit.setAttribute('aria-label',hit.number+'番、'+(hit.tier===3?(slot.engine?.allReachName||'最高役'):hit.tier===2?'超高額':hit.tier===1?'高額':'')+'リーチ');next.append(digit);
 }
 const count=Math.ceil(results.length/REACH_PAGE_SIZE);
 if(slide&&!media.matches&&slot.reachNumbers.children.length&&page.length){
  slot.reachNumbers.classList.add('v252-reach-leave');slot.reachNumbers.setAttribute('aria-hidden','true');
  next.classList.add('v252-reach-enter');slot.reachIncoming=next;slot.reachClip.append(next);
  record.reachPhase='slide';record.reachRemaining=REACH_SLIDE_MS+80;
  slot.reachPageDue=pagerRunning()?now+record.reachRemaining:0;
  // The deadline is a fallback if an animationend is suppressed by a browser.
  next.addEventListener('animationend',event=>{
   if(event.animationName==='v252-reach-enter'&&slot.reachIncoming===next){completeReachPage(slot,record);syncReachPager();}
  });
 }else{
  slot.reachNumbers.replaceWith(next);slot.reachNumbers=next;
  record.reachPhase=page.length?'hold':'empty';record.reachRemaining=REACH_HOLD_MS;
  slot.reachPageDue=pagerRunning()&&count>1?now+REACH_HOLD_MS:0;
 }
 pageMeta(slot,record);
 slot.reachStrip.setAttribute('aria-label','ゲーム'+(slot.i+1)+(results.length?' リーチ '+results.map(hit=>hit.number+'番').join('、'):'')+(count>1?'、'+((slot.reachPage||0)+1)+' / '+count+'ページ':''));
}
function advanceFourReachPages(now=Date.now()){
 if(!pagerRunning())return;
 for(const slot of slots){
  const record=records.get(slot.i),pages=Math.ceil((slot.reachPageResults?.length||0)/REACH_PAGE_SIZE);
  if(!record||slot.holder.hidden||slot.reachStrip.hidden||pages<2||!slot.reachPageDue||now<slot.reachPageDue)continue;
  if(record.reachPhase==='slide')completeReachPage(slot,record,now);
  else{slot.reachPage=((slot.reachPage||0)+1)%pages;paintFourReaches(slot,record,{slide:true,now});}
 }
}
syncReachPager=function(){
 const now=Date.now(),running=pagerRunning(),due=[];
 for(const slot of slots){
  const record=records.get(slot.i);if(!record)continue;
  const animation=reachAnimations.get(slot.i),paused=String(!running||media.matches);
  if(record.reachPop.dataset.motionPaused!==paused)record.reachPop.dataset.motionPaused=paused;
  if(animation){if(!running&&animation.playState==='running')animation.pause();else if(running&&animation.playState==='paused')animation.play();}
  const paged=!slot.holder.hidden&&!slot.reachStrip.hidden&&(slot.reachPageResults?.length||0)>REACH_PAGE_SIZE;
  if(!running||!paged){
   if(slot.reachPageDue){record.reachRemaining=Math.max(0,slot.reachPageDue-now);slot.reachPageDue=0;}
   slot.reachStrip.dataset.pagerPaused='true';continue;
  }
  delete slot.reachStrip.dataset.pagerPaused;
  if(!slot.reachPageDue)slot.reachPageDue=now+(record.reachRemaining??REACH_HOLD_MS);
  due.push(slot.reachPageDue);
 }
 const earliest=due.length?Math.min(...due):0;
 if(reachPageTimer!==null&&pagerTimerDue===earliest)return;
 if(reachPageTimer!==null)clearTimeout(reachPageTimer);reachPageTimer=null;pagerTimerDue=earliest;
 if(!earliest)return;
 reachPageTimer=setTimeout(()=>{reachPageTimer=null;pagerTimerDue=0;advanceFourReachPages();syncReachPager();},Math.max(16,earliest-Date.now()));
};
function flowReach(slot,results,a){
 const record=records.get(slot.i);if(!record)return;
 const currentScope=scope(slot);
 if(record.reachScope!==currentScope){record.reachScope=currentScope;record.reachSeen.clear();record.reachKey=null;stopReach(slot);}
 const hidden=a.phase==='ready';if(slot.reachStrip.hidden!==hidden)slot.reachStrip.hidden=hidden;
 if(slot.reachStrip.dataset.empty!==String(!results.length))slot.reachStrip.dataset.empty=String(!results.length);
 slot.reachPageResults=hidden?[]:results;
 const key=hidden?'ready':results.map(hit=>hit.number+':'+hit.tier+':'+hit.gain).join(',');
 if(key===record.reachKey)return;record.reachKey=key;
 if(slot.reachIncoming){slot.reachIncoming.remove();slot.reachIncoming=null;}
 slot.reachPage=0;slot.reachPageDue=0;
 slot.reachCaption.hidden=hidden||!results.length;slot.reachCaption.classList.remove('odds-up');slot.reachCaption.replaceChildren();
 const maxTier=Math.max(0,...results.map(hit=>hit.tier));slot.reachCaption.dataset.tier=String(maxTier);
 slot.reachClip.tabIndex=media.matches&&results.length>REACH_PAGE_SIZE?0:-1;
 paintFourReaches(slot,record);
 if(hidden||!results.length){record.reachSeen.clear();stopReach(slot);return;}
 const badge=document.createElement('span');badge.className='reach-badge-label';badge.textContent='リーチ';slot.reachCaption.append(badge);
 slot.reachCaption.setAttribute('aria-label',maxTier===3?(slot.engine?.allReachName||'最高役')+'リーチ':maxTier===2?'超高額リーチ':maxTier===1?'高額リーチ':'リーチ');
 const newlyHigh=results.filter(hit=>hit.tier>0&&hit.tier>(record.reachSeen.get(hit.number)||0));
 // Remember the latest stable preview, not a lifetime maximum. A reach that
 // genuinely drops away and later returns can announce its new appearance.
 record.reachSeen=new Map(results.map(hit=>[hit.number,hit.tier]));
 if(newlyHigh.length){const tier=Math.max(...newlyHigh.map(hit=>hit.tier));popupReach(slot,tier);}
}
syncReachPager();
updateReachUI=function(a){
 for(const slot of slots)if(slot.engine&&records.has(slot.i))flowReach(slot,actualTabReaches(slot,a),a);
 syncReachPager();
 const current=slots[active];if(current?.engine)updateReachBoard(current,a);
};
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
 const hidePlaque=win<=0&&!(app?.bet(slot.i)>0&&slot.engine?.wonderCollected);
 const face=slot.tabWin.querySelector('.gold-number');
 let result;
 // The older painter fits to a larger bay. Do not bounce between its old fit
 // and this card's fit on every HUD tick when the displayed amount is stable.
 if(record.paintedWin!==win||record.paintedSelected!==(slot.i===active)||
    slot.tabWin.parentNode.hidden!==hidePlaque||!face||face.textContent!==num(win)||
    face.dataset.fit!==record.paintedFitKey||face.style.fontSize!==record.paintedFontSize||face.style.transform!==record.paintedTransform){
  result=nativePaintWin.apply(this,arguments);fitTabAmount(slot,win);
  if(slot.tabWin.parentNode.hidden!==hidePlaque)slot.tabWin.parentNode.hidden=hidePlaque;
 }
 record.win=win;record.scope=nextScope;
 if(!sameRound||win===0)stopReward(slot);
 else if(gain>0&&['playing','result','paying'].includes(app?.phase))reward(slot,gain);
 return result;
};
function quiet(){
 stopSelection();releasePress();for(const slot of slots){stopReward(slot);stopReach(slot);}
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)quiet();syncReachPager();});
const motionChanged=()=>{quiet();for(const record of records.values())record.reachKey=null;if(app)updateReachUI(app);};
if(typeof media.addEventListener==='function')media.addEventListener('change',motionChanged);
else if(typeof media.addListener==='function')media.addListener(motionChanged);
window.addEventListener('pagehide',()=>{disposed=true;quiet();syncReachPager();});
window.addEventListener('pageshow',event=>{if(event.persisted){disposed=false;syncFace();syncReachPager();}});
syncFace();
window.SweetsArcadeTabsV249={
 version:254,reachFrameReady,
 describe(){return {activeIndex:active,transitions,runningAnimations:selectionAnimations.size+rewardAnimations.size+reachAnimations.size,reducedMotion:media.matches,rewardBursts,reachBursts,logos:records.size,sharedBetUnit:commonBet?units[unit[firstVisible.i]]:null,reachPager:{pageSize:REACH_PAGE_SIZE,holdMs:REACH_HOLD_MS,slideMs:REACH_SLIDE_MS},reachFrame:{url:reachFrame.src,loaded:reachFrame.complete&&reachFrame.naturalWidth>0,width:reachFrame.naturalWidth,height:reachFrame.naturalHeight},reachPopups:[...records.entries()].map(([index,record])=>({index,game:record.reachPop.dataset.gameKind,visible:!record.reachPop.hidden,tier:Number(record.reachPop.dataset.tier)||0,label:record.reachPop.textContent,hasNumbers:!!record.reachPop.querySelector('small'),paused:record.reachPop.dataset.motionPaused==='true',count:Number(slots[index].holder.dataset.v250ReachPopCount)||0}))};}
};
})();

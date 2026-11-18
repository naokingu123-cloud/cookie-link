/* Shared-round adapter. It never creates lottery balls or looks past ball five. */
(()=>{
'use strict';
const id=SweetsLineup.ids.indexOf('dango');if(id<0)return;
const slot=slots[id],game=SweetsLineup.catalog.dango,R=window.DangoBingoRules;
const view=window.DangoBingoView.mount(slot.panel);
const settlementWorker=new URLSearchParams(location.search).get('serverSettlementWorker')==='1';
const demoNumbers=Array.from({length:25},(_,i)=>i+1),animationMs=1500;
let clock=0,lastHit=-Infinity,lineStart=-Infinity,lastMain=-Infinity,lastMini=-Infinity,stamp=null,frame=0,reachTimer=0,paused=false;
let presentationEpoch=0,pendingFinish=null,lastRestoredState=null,checkpointTimer=0;
const payoutNote=document.createElement('small');payoutNote.id='dango-payout-status';
document.getElementById('debug-payout-status')?.after(payoutNote);
const engine={
 kind:'dango',gameName:game.name,recordGame:game.record,drawMode:'single',allReachName:'最高役',version:0,
 maxLink:0,maxChain:0,roundCleared:0,roundHammers:0,idle:true,busy:false,
 get allClears(){return Number(this.liveBoard&&R.highestRolesFor(this.state).length>0);},
 get totalHundredths(){return this.liveBoard&&this.state?.phase==='done'?this.state.totalHundredths:0;},
 get paused(){return paused;},
 set paused(value){if(paused!==value){paused=value;stamp=null;wake();}},
 reset(){
  presentationEpoch++;pendingFinish=null;lastRestoredState=null;
  clearTimeout(checkpointTimer);checkpointTimer=0;
  this.version++;this.liveBoard=false;
  // This fixed demonstration is unrelated to the next mold and uses no live RNG.
  this.state=R.create({moldIndex:0,numbers:demoNumbers,seed:251});
  this.drawn=new Set();this.queue=[];this.processed=this.accepted=0;this.running=false;
  this.roundSteps=0;this.wonderCollected=false;this.wonderToken=null;this.presentationRate=1;
  this.animationLines=[];this.placementStartLines=[];this.placementReason=null;this.thinkingClosesAt=0;
  paused=false;clock=0;stamp=null;lineStart=lastHit=lastMain=lastMini=-Infinity;
  stopSugarAward(slot);invalidateReach(slot);this.emit('ready');
 },
 start(){
  if(this.running||app.enabled[id]===false)return;
  // App.start locks all BETs before invoking this method. A strong initial FREE
  // template must not be visible while the player can still choose a BET.
  this.state=R.create({rng:app.random,target:debugPayoutTarget});this.liveBoard=true;
  this.running=true;this.animationLines=[];this.placementStartLines=[];this.thinkingClosesAt=0;
  const calibration=R.calibrationForTarget(this.state.target),percent=new Intl.NumberFormat('ja-JP',{maximumFractionDigits:2});
  payoutNote.textContent='ダンゴデビンゴ：設定 '+percent.format(calibration.target)+'%（後半3球を知らずに最適なFREE配置をした場合）。おまかせ配置の理論値 '+percent.format(calibration.automaticReturnPercent)+'%。初期FREEの配置で調整します。';
  this.emit('waiting');slot.updateDangoReach(app);
 },
 previewDraw(n){this.drawn.add(n);},
 enqueueBatch(numbers){
  for(const n of numbers){
   if(!this.running)break;
   if(!Number.isInteger(n)||n<1||n>25||this.state.draws.includes(n))continue;
   // Also covers offline worker replay and an older placing checkpoint. The
   // automatic choice sees only the first five balls, never the incoming sixth.
   if(this.state.phase==='placing')this.finishThinkingV251({reason:settlementWorker?'worker':'next-ball'});
   const before=this.state,next=R.draw(before,n);if(!next||next===before)continue;
   this.state=next;this.drawn.add(n);this.processed=this.accepted=next.draws.length;
   lastHit=lineStart=clock;this.animationLines=next.newLines.slice();
   if(next.phase==='placing'){
    this.placementStartLines=next.completedLines.slice();this.thinkingClosesAt=thinking().closesAt||0;
   }
   invalidateReach(slot);this.emit('settled');slot.updateDangoReach(app);
   if(!settlementWorker&&active===id)sceneSound(next.lastOddsGain?'bonus':next.newLines.length?'line':'cookie-hit',{volume:next.lastOddsGain ? .55 : .3});
   if(!settlementWorker&&next.lastBonusGain)announceAchievement(game.name+'　初期FREEにHIT！ 配置FREE＋1');
   announceHighestRoles(next,R.highestRolesFor(before));
   if(next.phase==='done')finish(this.version);
  }
 },
 finishThinkingV251({reason='deadline'}={}){
  if(!this.liveBoard||this.state?.phase!=='placing')return this.state;
  const before=this.state,next=R.commitFree(before,{autoFill:true});if(!next)return null;
  this.state=next;this.placementReason=reason;
  const previous=new Set(this.placementStartLines||[]);this.animationLines=next.completedLines.filter(line=>!previous.has(line));lineStart=clock;
  clearTimeout(checkpointTimer);checkpointTimer=0;
  invalidateReach(slot);this.emit('settled');slot.updateDangoReach(app);
  if(!settlementWorker&&active===id)sceneSound(next.completedLines.length>previous.size?'line':'cookie-land',{volume:.36});
  // Manual choices remain reversible throughout thinking. Announce the final
  // role only after commitment, relative to the five-ball board without any
  // player FREE. This also works when restoring an old placing checkpoint.
  announceHighestRoles(next,rolesBeforePlacement(before));
  return next;
 },
 emit(phase){this.phase=phase;slot.event={phase};slot.dirtyMain=slot.dirtyMini=true;lastMain=lastMini=-Infinity;wake();scheduleUI(app);}
};
app.engines[id]=slot.engine=engine;slot.holder.classList.add('dgb-slot');slot.panel.classList.add('dgb-panel');
// The nine-dango bottom row needs a wide mini canvas. Only this game's
// instance changes size; DangoBingoView.drawMini still accepts any resolution.
if(slot.mini?.canvas){slot.mini.canvas.width=240;slot.mini.canvas.height=154;}
function roleLabel(state,roles=R.highestRolesFor(state)){
 return roles.map(length=>length+'個ライン '+state.lineCounts[length]+'本').join('・');
}
function announceHighestRoles(state,previousRoles){
 if(settlementWorker||!engine.liveBoard)return;
 const added=R.highestRolesFor(state).filter(length=>!previousRoles.includes(length));
 if(added.length)announceAchievement(game.name+'　最高役！ '+roleLabel(state,added)+'完成！ '+num(medalWin(app.locked[id],state.totalHundredths))+' WIN');
}
function rolesBeforePlacement(state){
 const marked=new Set([...state.initialFreeCells,...state.draws.slice(0,5).map(n=>state.numbers.indexOf(n))]);
 const lineCounts={3:0,4:0,5:0,7:0,9:0};
 for(const line of R.lines)if(line.cells.every(cellId=>marked.has(cellId)))lineCounts[line.length]++;
 return R.highestRolesFor({lineCounts});
}
function thinking(){
 const state=window.SweetsDangoThinkingV251?.state?.();
 const ownRound=app.__sharedRound?.roundId;
 return state&&(!ownRound||!state.roundId||state.roundId===ownRound)?state:{remainingMs:NaN,closesAt:0};
}
function canPlace(){
 const t=thinking();
 return !settlementWorker&&engine.liveBoard&&engine.running&&engine.state.phase==='placing'&&app.phase==='playing'&&!app.paid[id]&&app.enabled[id]!==false&&t.enabled===true&&t.active===true&&t.ballCount===5&&t.remainingMs>0;
}
function savePlacementSoon(){
 if(settlementWorker)return;
 clearTimeout(checkpointTimer);
 const epoch=presentationEpoch,version=engine.version,token=app.token;
 checkpointTimer=setTimeout(()=>{
  checkpointTimer=0;if(epoch!==presentationEpoch||version!==engine.version||token!==app.token)return;
  Promise.resolve(window.SweetsDangoThinkingV251?.checkpointPlacement?.()).catch(error=>console.warn('[Dango] placement checkpoint',error));
 },280);
}
function changePlacement(next){
 if(!next||next===engine.state)return;
 engine.state=next;engine.animationLines=[];lastHit=-Infinity;
 invalidateReach(slot);engine.emit('settled');slot.updateDangoReach(app);savePlacementSoon();
}
view.setCallbacks({
 onCell(cellId){if(!canPlace())return;const s=engine.state;changePlacement(s.manualFreeCells.includes(cellId)?R.undoFree(s,cellId):R.placeFree(s,cellId));},
 onAuto(){if(canPlace())changePlacement(R.autoPlace(engine.state));}
});
function projectReaches(state){
 return R.reaches(state).map(hit=>{
  // Common reach code measures hundredths of this game's BET, not raw medals.
  const total=hit.totalHundredths,gain=hit.gainHundredths,tier=reachTier(gain,hit.allClear);
  return {...hit,total,gain,tier,kind:['reach','high','super','all'][tier]};
 });
}
slot.updateDangoReach=function(a){
 const s=engine.state,c=engine.liveBoard?reachContext(engine,a):null;
 if(!c||a.bet(id)<=0){if(slot.reachStatus!=='inactive'){invalidateReach(slot);slot.reachStatus='inactive';}return;}
 if(slot.reachBoardKey===c.key)return;
 slot.tabReachResults=slot.reachResults=projectReaches(s);slot.reachBoardKey=c.key;slot.tabReachBase=R.payoutState(s);
 slot.tabReachVersion=engine.version;slot.reachStatus='ready';slot.reachAfterBall=c.count;
};
const currentJob=job=>job.epoch===presentationEpoch&&job.version===engine.version&&job.token===app.token;
const sameJob=(job,version,token)=>job&&currentJob(job)&&job.version===version&&job.token===token;
function finish(version,token=app.token){
 if(sameJob(pendingFinish,version,token))return pendingFinish.promise;
 if(app.enabled[id]===false||app.paid[id])return;
 const job={version,token,epoch:presentationEpoch};pendingFinish=job;
 job.promise=(async()=>{
  try{
   const delay=Math.max(animationMs,Math.min(3200,engine.animationLines.length*150+500));
   const complete=settlementWorker?await Promise.resolve(true):await app.wait(delay,token);
   if(!complete||!currentJob(job)||app.phase!=='playing'||app.enabled[id]===false||app.paid[id])return;
   if(!settlementWorker&&active===id&&engine.totalHundredths){const tier=reachTier(engine.totalHundredths,engine.allClears>0);sceneSound(['line','bonus','big-bonus','allclear'][tier],{volume:.6+tier*.06});}
   if(!settlementWorker)await finishGamePresentation(slot,engine,app,version);
   if(!currentJob(job)||app.phase!=='playing'||app.enabled[id]===false||app.paid[id])return;
   engine.running=false;engine.emit('complete');app.paid[id]=true;app.roundWins[id]=medalWin(app.locked[id],engine.totalHundredths);
   if(app.enabled.every((on,i)=>!on||app.paid[i]))app.finishRound();recordChanged(app);
  }finally{if(pendingFinish===job)pendingFinish=null;}
 })();return job.promise;
}
engine.afterCheckpointRestoreV247=function(){
 const state=this.state;
 if(!state?.draws||app.enabled[id]===false||app.paid[id])return false;
 if(lastRestoredState!==state){presentationEpoch++;pendingFinish=null;lastRestoredState=state;}
 this.liveBoard=true;this.processed=this.accepted=state.draws.length;this.drawn=new Set(state.draws);this.running=true;
 this.busy=false;this.queue=[];paused=false;stamp=null;lastHit=lineStart=-Infinity;lastMain=lastMini=-Infinity;
 this.animationLines=[];
 const version=this.version,token=app.token,epoch=presentationEpoch;
 Promise.resolve().then(()=>{
  if(epoch!==presentationEpoch||version!==this.version||token!==app.token||app.enabled[id]===false||app.paid[id]||app.phase!=='playing')return;
  if(this.state.phase==='placing'&&settlementWorker)this.finishThinkingV251({reason:'worker-restore'});
  invalidateReach(slot);this.emit('settled');slot.updateDangoReach(app);
  if(this.state.phase==='done')finish(version,token);
 });return true;
};
function presentationPaused(){return app.paused||(typeof menuOpen!=='undefined'&&menuOpen)||(typeof userPaused!=='undefined'&&userPaused);}
function paint(mini){
 if(!mini&&(active!==id||slot.panel.hidden))return;
 const s=engine.state,t=thinking();
 const opts={time:clock,bet:app.bet(id),paused:presentationPaused(),age:clock-lastHit,lineAge:mini?Infinity:clock-lineStart,
  animationLines:engine.animationLines,reach:slot.reachResults,demo:!engine.liveBoard,
  placementLocked:!canPlace(),reducedMotion:motionReduced,remainingMs:t.remainingMs};
 if(mini)view.drawMini(slot.mini,s,opts);else view.draw(s,opts);
}
slot.paintDango=paint;
engine.pumpHiddenV246=function(elapsed){
 if(!document.hidden||!window.__sweetsSharedClientReady||app.phase!=='playing'||app.paused||app.enabled[id]===false||!engine.running||jpcSession.active)return false;
 const dt=Math.max(0,Math.min(100,Number(elapsed)||0));if(!dt)return false;stamp=null;clock+=dt;return true;
};
function wake(){if(reachTimer){clearTimeout(reachTimer);reachTimer=0;}if(!frame&&!document.hidden)frame=requestAnimationFrame(tick);}
function tick(now){
 frame=0;const moving=!presentationPaused()&&!document.hidden&&inView&&!jpcSession.active;
 if(moving&&stamp!==null)clock+=Math.max(0,now-stamp);stamp=moving?now:null;
 if(active===id&&clock-lastMain>=(window.SweetsRenderCadenceV246?.activeInterval?.()??32)-.75){const start=performance.now();paint(false);lastMain=clock;window.SweetsRenderCadenceV246?.recordClient?.(performance.now()-start);}
 if(app.phase!=='ready'&&(!allNineMode||active===id)&&clock-lastMini>=120){paint(true);lastMini=clock;}
 const animationLength=Math.max(animationMs,engine.animationLines.length*150+500),animating=clock-Math.max(lastHit,lineStart)<=animationLength;
 const reachAnimation=app.phase==='playing'&&!motionReduced&&slot.reachStatus==='ready'&&slot.reachResults?.length>0&&(!allNineMode||active===id);
 // Mochi breathing and the light along a completed skewer continue while the
 // visible board waits for its next ball. Hidden games retain their existing
 // settlement clock; no extra visual loop runs on the worker or hidden tabs.
 const ambient=!settlementWorker&&engine.liveBoard&&active===id&&!slot.panel.hidden&&!motionReduced&&['playing','result','paying','complete'].includes(app.phase);
 if(moving&&app.phase!=='ready'&&(animating||ambient))wake();
 else if(moving&&(reachAnimation||engine.state.phase==='placing'))reachTimer=setTimeout(wake,engine.state.phase==='placing'?160:active===id?80:125);
 else stamp=null;
}
window.addEventListener('sweets-dango-thinking-v251',event=>{
 const t=event.detail;if(engine.liveBoard&&engine.state?.phase==='placing'){engine.thinkingClosesAt=t?.closesAt||0;lastMain=-Infinity;wake();}
});
const oldSelect=select;select=function(i){const result=oldSelect(i);document.body.classList.toggle('dgb-active',active===id);lastMain=lastMini=-Infinity;wake();return result;};
const oldSyncPause=syncPause;syncPause=function(){const result=oldSyncPause.apply(this,arguments);stamp=null;lastMain=-Infinity;wake();return result;};
const oldHud=hud;hud=function(a){oldHud(a);if(active===id){const s=engine.state;put('best','完成した串 '+s.completedLines.length+'本 ／ ODDS ×'+s.oddsMultiplier);put('ballinfo',!engine.liveBoard?'5球 → FREE配置 → 3球':s.phase==='placing'?'FREE配置 '+s.manualFreeCells.length+' / '+s.freeBudget:s.phase==='done'?'串の配当を合計':s.draws.length<5?'前半 ／ あと'+(5-s.draws.length)+'球':'後半 ／ あと'+(8-s.draws.length)+'球');}};
const oldResult=renderRoundResult;renderRoundResult=function(a){
 oldResult(a);if(!a.result)return;const row=$('result-games').querySelector('[data-game-index="'+id+'"]');if(!row||row.dataset.dango===String(a.token))return;
 row.dataset.dango=String(a.token);row.querySelector('.result-game-name').innerHTML=game.name+' <small>'+(a.enabled[id]?num(a.locked[id])+' BET':'NO BET')+'</small>';
 const s=engine.state,lines=[3,4,5,7,9].filter(length=>s.lineCounts[length]).map(length=>length+'個ライン '+s.lineCounts[length]+'本').join(' ／ ');
 const highestRoles=R.highestRolesFor(s);
 row.querySelector('.result-game-details').textContent=a.enabled[id]?(lines||'完成した串なし')+' ／ 配置FREE '+s.manualFreeCells.length+'個 ／ ODDS ×'+s.oddsMultiplier+(highestRoles.length?' ／ 最高役：'+roleLabel(s,highestRoles):''):'参加なし';
};
new ResizeObserver(()=>{lastMain=-Infinity;wake();}).observe(slot.panel);
document.addEventListener('visibilitychange',()=>{stamp=null;lastMain=-Infinity;wake();});
window.DangoBingo={engine,core:R,view};engine.reset();select(active);
})();

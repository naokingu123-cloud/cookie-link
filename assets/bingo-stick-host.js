/* The lottery continues while Waffle Reversi presents each accepted move in order. */
(()=>{
'use strict';
const id=SweetsLineup.ids.indexOf('stick'),slot=slots[id],game=SweetsLineup.catalog.stick;
const R=window.BingoStickRules,V=window.BingoStickView,view=V.mount(slot.panel);
const noteSteps=[0,2,4,5,7,9,11];
const payoutNote=document.createElement('small');
payoutNote.id='waffle-payout-status';$('debug-payout-status').after(payoutNote);
let clock=0,startTime=0,stamp=null,frame=0,miniTimer=0,lastMain=-Infinity,lastMini=-Infinity;
let paused=false,animating=false,lastBeat=0,lastRankStep=0,reversalShown=false;
const engine={
 kind:'stick',gameName:game.name,recordGame:game.record,drawMode:'single',allReachName:'リバーサル',version:0,
 maxLink:0,maxChain:0,roundCleared:0,roundHammers:0,
 get allClears(){return this.state.reversalCount;},
 get idle(){return !animating&&!this.queue.length;},get busy(){return !this.idle;},
 get totalHundredths(){
  const s=this.state;
  if(!animating)return s.totalHundredths;
  return s.totalHundredths-s.lastBaseHundredths+R.award(lastBeat,s.lastRack)-(s.reversalThisMove&&!reversalShown?R.sweepBonusHundredths:0);
 },
 get paused(){return paused;},
 set paused(value){if(paused!==value){paused=value;stamp=null;wake();}},
 reset(){
  this.version++;this.state=R.create({rng:app.random,target:debugPayoutTarget});this.drawn=new Set();this.queue=[];this.processed=this.accepted=0;
  this.running=false;this.roundSteps=0;this.wonderCollected=false;this.wonderToken=null;this.presentationRate=1;
  paused=animating=reversalShown=false;clock=startTime=lastBeat=lastRankStep=0;stamp=null;lastMain=lastMini=-Infinity;
  const balance=R.balance(this.state.target);
  const bonusEstimate=balance.bonusPercent>0?'推定 ＋'+balance.bonusPercent.toLocaleString('ja-JP',{maximumSignificantDigits:3})+'ポイント':'試行中の成立0回';
  payoutNote.textContent='ワッフルリバーシ　通常配当の推定 '+balance.normalPercent.toFixed(1)+'% ／ リバーサル '+bonusEstimate+'（共通・暫定'+(R.sweepBonusHundredths/100).toFixed(1)+'倍）';
  stopSugarAward(slot);invalidateReach(slot);this.emit('ready');
 },
 setRainbowSugar(bet){this.wonderToken={id:this.version,value:bet,tier:DIRECT_JPC_SUGAR_TIER,kind:'direct-jpc',directJpc:true};},
 start(){
  this.running=true;this.wonderToken??={id:this.version,value:this.roundBet,tier:sugarVisualTier(this.roundBet),kind:'stick'};
  this.emit('waiting');slot.updateStickReach(app);
 },
 previewDraw(n){this.drawn.add(n);},
 enqueueBatch(numbers){
  if(!this.running)return;
  for(const n of numbers){
   if(!Number.isInteger(n)||n<1||n>25||this.state.draws.includes(n)||this.queue.includes(n)||this.accepted>=8)continue;
   this.queue.push(n);this.accepted++;
  }
  if(!animating&&this.queue.length)startMove();
 },
 emit(phase){this.phase=phase;slot.event={phase};slot.dirtyMain=slot.dirtyMini=true;lastMain=lastMini=-Infinity;wake();scheduleUI(app);}
};
app.engines[id]=slot.engine=engine;
slot.panel.classList.add('bs-panel');slot.holder.classList.add('bs-slot');
const title=slot.tab.querySelector('.tab-game-name'),emblem=new Image();
emblem.src=game.logo;emblem.alt=game.name;title.replaceChildren(emblem);title.setAttribute('aria-label',game.name);

function startMove(){
 const next=R.draw(engine.state,engine.queue.shift());
 engine.state=next;engine.processed=next.draws.length;
 startTime=clock;lastBeat=lastRankStep=0;animating=true;reversalShown=false;
 invalidateReach(slot);engine.emit('flipping');
 if(active===id)sceneSound(next.placed.length?'landing':'pop',{volume:.38});
}
function advanceMove(){
 const s=engine.state,m=V.motion(s,clock-startTime);
 if(m.beat>lastBeat){
  lastBeat=m.beat;
  if(active===id){
   const i=lastBeat-1,pitch=noteSteps[i%7]+12*Math.floor(i/7);
   sound('scene-pay-step',{volume:.22,rate:.82*2**(Math.min(pitch,27)/12)});
  }
  slot.dirtyMini=true;lastMini=-Infinity;scheduleUI(app);
 }
 if(s.reversalThisMove&&!reversalShown&&lastBeat===s.flipped.length){
  reversalShown=true;announceAchievement(game.name+'　リバーサルボーナス！ ＋'+num(medalWin(engine.roundBet,R.sweepBonusHundredths))+'WIN');
  if(active===id)sceneSound('allclear',{volume:.8});
 }
 if(m.rankStep>lastRankStep){
  if(active===id&&lastRankStep===0)sceneSound('cookie-fall',{volume:.30});
  if(active===id&&m.rankStep===3)sceneSound('cookie-land',{volume:.38});
  lastRankStep=m.rankStep;
 }
 if(clock-startTime<m.duration)return;
 animating=false;
 if(engine.queue.length){startMove();return;}
 engine.emit('settled');
 if(s.phase==='done'){collectSugar();finish(engine.version);}else slot.updateStickReach(app);
}
function projectReaches(s,bet){
 if(s.phase==='done')return [];
 const win=medalWin(bet,s.totalHundredths),hits=[];
 for(let n=1;n<=25;n++){
  const next=R.draw(s,n);if(!next||medalWin(bet,next.totalHundredths)<=win)continue;
  const total=next.totalHundredths,gain=total-s.totalHundredths,allClear=next.reversalThisMove,tier=reachTier(gain,allClear);
  hits.push({number:n,total,gain,tier,cells:next.placed,flipped:next.flipped,counts:next.counts,allClear,kind:['reach','high','super','all'][tier]});
 }
 return hits;
}
slot.updateStickReach=function(a){
 const s=engine.state,c=reachContext(engine,a);
 if(!c||a.bet(id)<=0||s.phase==='done'){
  if(slot.reachStatus!=='inactive'){invalidateReach(slot);slot.reachStatus='inactive';}return;
 }
 if(c.key===slot.reachBoardKey)return;
 slot.tabReachResults=slot.reachResults=projectReaches(s,a.bet(id));slot.reachBoardKey=c.key;slot.tabReachBase=s.totalHundredths;
 slot.tabReachVersion=engine.version;slot.reachStatus='ready';slot.reachAfterBall=c.count;
};
function earnsSugar(s){return s.maxFlips>=R.sugarFlips||s.reversalCount>0;}
function collectSugar(){
 if(engine.wonderCollected||!earnsSugar(engine.state))return;
 engine.wonderCollected=true;engine.roundSteps=1;const token=engine.wonderToken;
 app.wonderBank.push({...token,game:id});app.wonderValue+=token.value;app.wonderSteps=app.wonderBank.length;
 if(isDirectJpcSugar(token)){select(id);showSugarCutin('虹色シュガー獲得!!','次ゲームは直接JPCへ！',true);}
 showSugarAward(slot,[token]);announceAchievement(game.name+'　ワンダーシュガーGET！');
}
async function finish(version){
 await finishGamePresentation(slot,engine,app,version);
 if(engine.version!==version||app.phase!=='playing'||app.paid[id])return;
 engine.running=false;engine.emit('complete');app.paid[id]=true;app.roundWins[id]=medalWin(app.locked[id],engine.totalHundredths);
 if(app.enabled.every((on,i)=>!on||app.paid[i]))app.finishRound();recordChanged(app);
}
const demo=R.createDemo(),lesson=[{at:0,state:demo.state}];
let nextDemoAt=1100;
for(const n of demo.draws){
 const s=R.draw(lesson.at(-1).state,n);lesson.push({at:nextDemoAt,state:s});
 nextDemoAt+=Math.max(1750,V.motion(s,Infinity).duration+250);
}
const demoPeriod=Math.max(20000,nextDemoAt+1400);
function paint(mini){
 if(mini?(active===id||app.phase==='ready'):(active!==id||slot.panel.hidden))return;
 const demoing=app.phase==='ready',t=clock%demoPeriod,stage=demoing?lesson.findLast(e=>e.at<=t):null;
 const s=stage?stage.state:engine.state,age=stage?t-stage.at:animating?clock-startTime:Infinity,bet=app.bet(id);
 if(stage&&stage.reachBet!==bet){stage.reachBet=bet;stage.reach=bet>0?projectReaches(s,bet):[];}
 const reach=stage?(age>=V.motion(s,Infinity).duration?stage.reach:[]):slot.reachResults;
 const opts={time:clock,bet,demo:demoing,paused:app.paused,age,reach,
  latestNumber:s.draws.at(-1),sugarCollected:stage?s.phase==='done'&&earnsSugar(s):engine.wonderCollected,
  sugarIcon:mini||!app.bet(id)?null:getSugarSprite(sugarVisualTier(engine.wonderToken||app.bet(id)))};
 if(mini)view.drawMini(slot.mini,s,opts);else view.draw(s,opts);
}
slot.paintStick=paint;
function wake(){
 if(miniTimer){clearTimeout(miniTimer);miniTimer=0;}
 if(!frame&&!document.hidden)frame=requestAnimationFrame(tick);
}
function tick(now){
 frame=0;const moving=!app.paused&&!document.hidden&&inView&&!jpcSession.active;
 // A slow frame or fast-forward must never jump over a stone's beat.
 if(moving&&stamp!==null){
  const delta=Math.max(0,now-stamp);clock+=animating?Math.min(90,delta*engine.presentationRate):delta;
 }
 stamp=moving?now:null;
 if(moving&&animating)advanceMove();
 if(active===id&&(animating||clock-lastMain>=32)){paint(false);lastMain=clock;}
 if(active!==id&&clock-lastMini>=(animating?32:140)){paint(true);lastMini=clock;}
 const reaching=app.phase==='playing'&&slot.reachResults.length&&!motionReduced;
 if(moving&&(animating||active===id&&(app.phase==='ready'||reaching)))wake();
 else if(moving&&active!==id&&reaching)miniTimer=setTimeout(wake,145);
 else stamp=null;
}
const oldSelect=select;select=function(i){const result=oldSelect(i);document.body.classList.toggle('bs-active',active===id);lastMain=lastMini=-Infinity;wake();return result;};
const oldHud=hud;hud=function(a){oldHud(a);if(active===id){
 const s=engine.state;put('best','累計 '+num(medalWin(a.bet(id),engine.totalHundredths))+' WIN');
 put('ballinfo',s.phase==='done'?'8球終了':(s.draws.length%2?'次は白バター':'次は黒小倉あん')+' ／ 残り'+(8-s.draws.length)+'球');
}};
const oldResult=renderRoundResult;renderRoundResult=function(a){
 oldResult(a);if(!a.result)return;
 const row=$('result-games').querySelector('[data-game-index="'+id+'"]');if(!row||row.dataset.stick===String(a.token))return;
 row.dataset.stick=String(a.token);
 row.querySelector('.result-game-name').innerHTML=game.name+' <small>'+(a.enabled[id]?(num(a.locked[id])+' BET'):'NO BET')+'</small>';
 const s=engine.state;
 row.querySelector('.result-game-details').textContent=a.enabled[id]?'通常配当 '+num(medalWin(a.locked[id],s.baseHundredths))+' WIN'+(s.reversalCount?' ／ リバーサル '+s.reversalCount+'回 ＋'+num(medalWin(a.locked[id],s.bonusHundredths))+' WIN':'')+(engine.wonderCollected?' ／ シュガーGET！':''):'参加なし';
};
new ResizeObserver(()=>{lastMain=-Infinity;wake();}).observe(slot.panel);
document.addEventListener('visibilitychange',()=>{stamp=null;wake();});
window.BingoStick={engine,core:R};engine.reset();select(active);
})();

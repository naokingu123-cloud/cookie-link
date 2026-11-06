/* Party Castella follows the shared lottery, with its own board and final payout. */
(()=>{
'use strict';
const id=SweetsLineup.ids.indexOf('castella'),slot=slots[id],game=SweetsLineup.catalog.castella;
const R=window.PartyCastellaRules,view=window.PartyCastellaView.mount(slot.panel);
const sugarCount=30,animationMs=1500;
const payoutNote=document.createElement('small'),percent=new Intl.NumberFormat('ja-JP',{maximumFractionDigits:2});
payoutNote.id='castella-payout-status';$('debug-payout-status').after(payoutNote);
let clock=0,lastHit=-Infinity,lastMain=-Infinity,lastMini=-Infinity,stamp=null,frame=0,reachTimer=0,paused=false;
const engine={
 kind:'castella',gameName:game.name,recordGame:game.record,drawMode:'single',allReachName:'全焼き',version:0,
 maxLink:0,maxChain:0,roundCleared:0,roundHammers:0,idle:true,busy:false,
 get allClears(){return Number(this.state.highestRole);},
 get totalHundredths(){return this.state.phase==='done'?this.state.totalHundredths:0;},
 get paused(){return paused;},
 set paused(value){if(paused!==value){paused=value;stamp=null;wake();}},
 reset(){
  this.version++;this.state=R.create({rng:app.random,target:debugPayoutTarget});this.drawn=new Set();this.queue=[];this.processed=this.accepted=0;
  payoutNote.textContent='パーティカステラ：設定 '+percent.format(debugPayoutTarget)+'% → 実際の理論配当率 '+percent.format(this.state.target)+'%（新ODDS倍率での全10型 '+percent.format(R.minReturn)+'〜'+percent.format(R.maxReturn)+'%。50〜150%設定への実効調整は未達）。ODDSは基本配当×(1+0.5×発動数)。';
  this.running=false;this.roundSteps=0;this.wonderCollected=false;this.wonderToken=null;this.presentationRate=1;
  paused=false;clock=0;stamp=null;lastHit=lastMain=lastMini=-Infinity;
  stopSugarAward(slot);invalidateReach(slot);this.emit('ready');
 },
 setRainbowSugar(bet){this.wonderToken={id:this.version,value:bet,tier:DIRECT_JPC_SUGAR_TIER,kind:'direct-jpc',directJpc:true};},
 start(){
  this.running=true;
  this.wonderToken??={id:this.version,value:this.roundBet,tier:sugarVisualTier(this.roundBet),kind:'castella'};
  this.emit('waiting');slot.updateCastellaReach(app);
 },
 previewDraw(n){this.drawn.add(n);},
 enqueueBatch(numbers){
  for(const n of numbers){
   if(!this.running)break;
   const next=R.draw(this.state,n);if(!next)continue;
   this.state=next;this.processed=this.accepted=next.draws.length;lastHit=clock;
   invalidateReach(slot);this.emit('settled');
   if(next.highestRole)announceAchievement(game.name+'　37個全焼！ '+num(medalWin(app.locked[id],next.totalHundredths))+'WIN');
   if(active===id)sceneSound(next.draws.length<=5?'cookie-hit':'line',{volume:.3});
   slot.updateCastellaReach(app);
   if(next.phase==='done')finish(this.version);
  }
 },
 emit(phase){this.phase=phase;slot.event={phase};slot.dirtyMain=slot.dirtyMini=true;lastMain=lastMini=-Infinity;wake();scheduleUI(app);}
};

app.engines[id]=slot.engine=engine;
slot.holder.classList.add('pct-slot');slot.panel.classList.add('pct-panel');
const title=slot.tab.querySelector('.tab-game-name'),emblem=new Image();
emblem.src=game.logo;emblem.alt=game.name;title.replaceChildren(emblem);title.setAttribute('aria-label',game.name);

function projectReaches(s){
 return R.reaches(s).map(hit=>{
  const tier=reachTier(hit.total,hit.allClear);
  return {...hit,tier,kind:['reach','high','super','all'][tier]};
 });
}
slot.updateCastellaReach=function(a){
 const s=engine.state,c=reachContext(engine,a);
 if(!c||a.bet(id)<=0){
  if(slot.reachStatus!=='inactive'){invalidateReach(slot);slot.reachStatus='inactive';}return;
 }
 if(slot.reachBoardKey===c.key)return;
 slot.tabReachResults=slot.reachResults=projectReaches(s);slot.reachBoardKey=c.key;
 slot.tabReachBase=R.payout(s.bakedCount,s.oddsHits);slot.tabReachVersion=engine.version;slot.reachStatus='ready';slot.reachAfterBall=c.count;
};
function collectSugar(){
 if(engine.wonderCollected||engine.state.bakedCount<sugarCount)return;
 engine.wonderCollected=true;engine.roundSteps=1;const token=engine.wonderToken;
 app.wonderBank.push({...token,game:id});app.wonderValue+=token.value;app.wonderSteps=app.wonderBank.length;
 if(isDirectJpcSugar(token)){select(id);showSugarCutin('虹色シュガー獲得!!','次ゲームは直接JPCへ！',true);}
 showSugarAward(slot,[token]);announceAchievement(game.name+'　ワンダーシュガーGET！');
}
async function finish(version){
 // Let the last batch of cakes brown before the sugar cut-in or result covers the pan.
 if(!await app.wait(animationMs,app.token)||engine.version!==version||app.phase!=='playing')return;
 if(active===id&&engine.totalHundredths){
  const tier=reachTier(engine.totalHundredths,engine.state.highestRole);
  sceneSound(['line','bonus','big-bonus','allclear'][tier],{volume:.62+tier*.06});
 }
 collectSugar();
 await finishGamePresentation(slot,engine,app,version);
 if(engine.version!==version||app.phase!=='playing'||app.paid[id])return;
 engine.running=false;engine.emit('complete');app.paid[id]=true;app.roundWins[id]=medalWin(app.locked[id],engine.totalHundredths);
 if(app.enabled.every((on,i)=>!on||app.paid[i]))app.finishRound();recordChanged(app);
}
function paint(mini){
 if(app.phase==='ready'||(mini?active===id:active!==id||slot.panel.hidden))return;
 const s=engine.state;
 const opts={time:clock,bet:app.bet(id),paused:app.paused,age:clock-lastHit,reach:slot.reachResults,
  sugarCount,sugarCollected:engine.wonderCollected,
  sugarIcon:mini||!app.bet(id)?null:getSugarSprite(sugarVisualTier(engine.wonderToken||app.bet(id)))};
 if(mini)view.drawMini(slot.mini,s,opts);else view.draw(s,opts);
}
slot.paintCastella=paint;
function wake(){
 if(reachTimer){clearTimeout(reachTimer);reachTimer=0;}
 if(!frame&&!document.hidden)frame=requestAnimationFrame(tick);
}
function tick(now){
 frame=0;const moving=!app.paused&&!document.hidden&&inView&&!jpcSession.active;
 if(moving&&stamp!==null)clock+=Math.max(0,now-stamp);stamp=moving?now:null;
 if(active===id&&clock-lastMain>=40){paint(false);lastMain=clock;}
 if(active!==id&&clock-lastMini>=120){paint(true);lastMini=clock;}
 const reachAnimation=app.phase==='playing'&&!motionReduced&&slot.reachStatus==='ready'&&slot.reachResults?.length>0;
 if(moving&&app.phase!=='ready'&&clock-lastHit<=animationMs)wake();
 else if(moving&&reachAnimation)reachTimer=setTimeout(wake,active===id?80:125);
 else stamp=null;
}
const oldSelect=select;select=function(i){
 const result=oldSelect(i);document.body.classList.toggle('pct-active',active===id);
 lastMain=lastMini=-Infinity;wake();return result;
};
const oldHud=hud;hud=function(a){oldHud(a);if(active===id){
 const s=engine.state;put('best','生地 '+s.wetCount+' ／ 焼き上がり '+s.bakedCount+'個');
 put('ballinfo',s.phase==='pour'?'生地を注ぐ ／ あと'+(5-s.draws.length)+'球':s.phase==='bake'?'焼き上げ ／ あと'+(8-s.draws.length)+'球':'焼き上がり');
}};
const oldResult=renderRoundResult;renderRoundResult=function(a){
 oldResult(a);if(!a.result)return;
 const row=$('result-games').querySelector('[data-game-index="'+id+'"]');if(!row||row.dataset.castella===String(a.token))return;
 row.dataset.castella=String(a.token);
 row.querySelector('.result-game-name').innerHTML=game.name+' <small>'+(a.enabled[id]?num(a.locked[id])+' BET':'NO BET')+'</small>';
 const s=engine.state;
 row.querySelector('.result-game-details').textContent=a.enabled[id]?'生地 '+s.wetCount+'個 ／ 焼き上がり '+s.bakedCount+'個 ／ 火力 Lv.'+s.fireLevel+' ／ ODDS ×'+(1+s.oddsHits*.5).toFixed(1)+(s.highestRole?' ／ 全焼きボーナス':'')+(engine.wonderCollected?' ／ シュガーGET！':''):'参加なし';
};
new ResizeObserver(()=>{lastMain=-Infinity;wake();}).observe(slot.panel);
document.addEventListener('visibilitychange',()=>{stamp=null;wake();});
window.PartyCastella={engine,core:R};engine.reset();select(active);
})();

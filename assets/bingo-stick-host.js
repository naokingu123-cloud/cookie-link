/* Waffle Reversi uses the shared eight draws. The color decision pauses every draw source. */
(()=>{
'use strict';
const id=SweetsLineup.ids.indexOf('stick'),slot=slots[id],game=SweetsLineup.catalog.stick,R=window.BingoStickRules;
const thinkingMs=15000,flipMs=1800,noReach=[];
let clock=0,deadline=null,timeLeft=0,paused=false,lastHit=-Infinity,lastMain=-Infinity,lastMini=-Infinity,frame=0,miniTimer=0,stamp=null;
const engine={
 kind:'stick',gameName:game.name,recordGame:game.record,drawMode:'single',allReachName:'最高役',version:0,
 maxLink:0,maxChain:0,roundCleared:0,roundHammers:0,
 get allClears(){return Number(this.state.phase==='done'&&this.state.highestRole);},
 get holdDraws(){return this.running&&this.state.phase==='thinking';},
 get idle(){return !this.holdDraws;},get busy(){return !this.idle;},
 get totalHundredths(){return this.state.phase==='done'?this.state.totalHundredths:0;},
 get remainingMs(){return deadline===null?timeLeft:Math.max(0,deadline-performance.now());},
 get paused(){return paused;},
 set paused(value){
  if(paused===value)return;
  if(this.holdDraws){timeLeft=this.remainingMs;deadline=value?null:performance.now()+timeLeft;}
  paused=value;stamp=null;wake();
 },
 reset(){
  this.version++;this.state=R.create({rng:app.random,target:debugPayoutTarget});this.drawn=new Set();this.queue=[];this.processed=this.accepted=0;
  this.running=false;this.roundSteps=0;this.wonderCollected=false;this.wonderToken=null;this.presentationRate=1;
  paused=false;clock=timeLeft=0;deadline=stamp=null;lastHit=lastMain=lastMini=-Infinity;
  stopSugarAward(slot);invalidateReach(slot);this.emit('ready');
 },
 setRainbowSugar(bet){this.wonderToken={id:this.version,value:bet,tier:DIRECT_JPC_SUGAR_TIER,kind:'direct-jpc',directJpc:true};},
 start(){
  this.running=true;this.wonderToken??={id:this.version,value:this.roundBet,tier:sugarVisualTier(this.roundBet),kind:'stick'};
  this.emit('waiting');slot.updateStickReach(app);
 },
 previewDraw(n){this.drawn.add(n);},
 enqueueBatch(numbers){
  for(const n of numbers){
   if(!this.running)break;
   const next=R.draw(this.state,n);
   if(!next)continue;

   this.state=next;this.processed=this.accepted=next.draws.length;lastHit=clock;invalidateReach(slot);
   if(next.phase==='thinking'){
    // Set the draw hold synchronously in Arcade.acceptNumber, before another input or physics tick.
    timeLeft=thinkingMs;deadline=performance.now()+timeLeft;
    if(active!==id)select(id);
    this.emit('thinking');syncManualNumbers();
   }else this.emit('settled');
   presentDraw(next);
   collectSugar();
   if(next.phase==='done')finish(this.version);
   else if(next.phase!=='thinking')slot.updateStickReach(app);
  }
 },
 emit(phase){this.phase=phase;slot.event={phase};slot.dirtyMain=slot.dirtyMini=true;lastMain=lastMini=-Infinity;wake();scheduleUI(app);}
};
app.engines[id]=slot.engine=engine;
slot.panel.classList.add('bs-panel');slot.holder.classList.add('bs-slot');
const title=slot.tab.querySelector('.tab-game-name'),emblem=new Image();
emblem.src=game.logo;emblem.alt=game.name;title.replaceChildren(emblem);title.setAttribute('aria-label',game.name);

const colorName=color=>color==='white'?'白バター':'黒小倉あん';
function presentDraw(s){
 if(s.phase==='done'&&s.highestRole)announceAchievement(game.name+'　最高役！ '+colorName(s.chosen)+'が64マスを独占');
 if(active!==id)return;
 if(s.phase==='done'&&s.totalHundredths>0){
  const tier=reachTier(s.totalHundredths,s.highestRole);
  sceneSound(['line','bonus','big-bonus','allclear'][tier],{volume:.62+tier*.06});
 }else if(s.flipped.length)sceneSound('cookie-hit',{volume:.35});
}
function choose(color){
 if(!engine.holdDraws||app.phase!=='playing'||app.paused||document.hidden)return false;
 if(engine.remainingMs<=0)color=R.recommend(engine.state);
 const next=R.choose(engine.state,color);if(!next)return false;
 engine.state=next;deadline=null;timeLeft=0;
 engine.emit('settled');slot.updateStickReach(app);syncManualNumbers();return true;
}
const view=window.BingoStickView.mount(slot.panel,{choose});

function projectReaches(s,bet){
 if(s.phase!=='last')return noReach;
 const currentWin=medalWin(bet,s.totalHundredths);
 const hits=[];
 for(let number=1;number<=25;number++){
  const next=R.draw(s,number);if(!next||medalWin(bet,next.totalHundredths)<=currentWin)continue;
  const total=next.totalHundredths,gain=total-s.totalHundredths,allClear=next.highestRole&&!s.highestRole,tier=reachTier(gain,allClear);
  hits.push({number,total,gain,tier,cells:next.placed,flipped:next.flipped,counts:next.counts,
   allClear,kind:['reach','high','super','all'][tier]});
 }
 return hits;
}
slot.updateStickReach=function(a){
 const s=engine.state,c=reachContext(engine,a);
 if(!c||a.bet(id)<=0||s.phase!=='last'){
  if(slot.reachStatus!=='inactive'){invalidateReach(slot);slot.reachStatus='inactive';}return;
 }
 if(c.key===slot.reachBoardKey)return;
 slot.tabReachResults=slot.reachResults=projectReaches(s,a.bet(id));slot.reachBoardKey=c.key;slot.tabReachBase=s.totalHundredths;
 slot.tabReachVersion=engine.version;slot.reachStatus='ready';slot.reachAfterBall=c.count;
};
function collectSugar(){
 if(engine.wonderCollected||engine.state.phase!=='done'||engine.state.countChosen<60)return;
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
// A fixed seed and eight distinct draws replay the real game for the idle demonstration.
const lesson=(()=>{
 let seed=3671; // White advances from 44 to 52, 60 and 64 in the last three draws.
 let state=R.create({rng:()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32)});
 const stages=[];
 const add=at=>stages.push({at,state,reach:projectReaches(state,100)});
 add(0);
 for(let n=1;n<=5;n++){state=R.draw(state,n);add(1050+n*1000);}
 state=R.choose(state,R.recommend(state));add(10500);
 for(let n=6;n<=8;n++){state=R.draw(state,n);add(12100+(n-6)*1750);}
 return stages;
})();
function paint(mini){
 if(mini?(active===id||app.phase==='ready'):(active!==id||slot.panel.hidden))return;
 const demo=app.phase==='ready',stage=demo?lesson.findLast(e=>e.at<=clock%20000):null;
 const s=stage?stage.state:engine.state,age=stage?clock%20000-stage.at:clock-lastHit;
 const opts={time:clock,bet:app.bet(id),demo,paused:app.paused,remainingMs:stage?Math.max(0,thinkingMs-age):engine.remainingMs,
  latestNumber:s.draws.at(-1),age,reach:stage?stage.reach:slot.reachResults,
  sugarCollected:stage?s.phase==='done'&&s.countChosen>=60:engine.wonderCollected,
  sugarIcon:mini||!app.bet(id)?null:getSugarSprite(sugarVisualTier(engine.wonderToken||app.bet(id)))};
 if(mini)view.drawMini(slot.mini,s,opts);else view.draw(s,opts);
}
slot.paintStick=paint;
function wake(){clearTimeout(miniTimer);miniTimer=0;if(!frame&&!document.hidden)frame=requestAnimationFrame(tick);}
function tick(now){
 frame=0;
 const moving=!app.paused&&!document.hidden&&inView&&!jpcSession.active;
 if(moving&&stamp!==null)clock+=Math.max(0,now-stamp);stamp=moving?now:null;
 if(moving&&engine.holdDraws&&engine.remainingMs<=0)choose(R.recommend(engine.state));
 if(active===id&&clock-lastMain>=40){paint(false);lastMain=clock;}
 if(active!==id&&clock-lastMini>=150){paint(true);lastMini=clock;}
 if(moving&&(active===id||engine.holdDraws||clock-lastHit<=flipMs+200))wake();
 else if(moving&&app.phase==='playing'&&!motionReduced&&slot.reachResults.length)miniTimer=setTimeout(wake,150);
 else stamp=null;
}
const oldSelect=select;select=function(i){const result=oldSelect(i);document.body.classList.toggle('bs-active',active===id);lastMain=lastMini=-Infinity;wake();return result;};
const oldHud=hud;hud=function(a){oldHud(a);if(active===id){
 const s=engine.state;put('best','白 '+s.counts.white+' ／ 黒 '+s.counts.black);
 put('ballinfo',engine.holdDraws?'配当色を選択':s.chosen?colorName(s.chosen)+' ／ あと'+(8-s.draws.length)+'球':'あと'+Math.max(0,8-a.draws.length)+'球');
}};
const oldResult=renderRoundResult;renderRoundResult=function(a){
 oldResult(a);if(!a.result)return;
 const row=$('result-games').querySelector('[data-game-index="'+id+'"]');if(!row||row.dataset.stick===String(a.token))return;
 row.dataset.stick=String(a.token);
 row.querySelector('.result-game-name').innerHTML=game.name+' <small>'+(a.enabled[id]?num(a.locked[id])+' BET':'NO BET')+'</small>';
 const s=engine.state;
 row.querySelector('.result-game-details').textContent=a.enabled[id]?colorName(s.chosen)+' '+s.countChosen+'／64マス'+(s.highestRole?' ／ 最高役・全マスボーナス':'')+' ／ 配当 '+(s.totalHundredths/100).toFixed(2)+'倍'+(engine.wonderCollected?' ／ シュガーGET！':''):'参加なし';
};
new ResizeObserver(()=>{lastMain=-Infinity;wake();}).observe(slot.panel);
document.addEventListener('visibilitychange',()=>{stamp=null;wake();});
window.BingoStick={engine,core:R};engine.reset();select(active);
})();

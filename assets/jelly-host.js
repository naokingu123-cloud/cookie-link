/* Jelly Bingo shares the cabinet's roulette, unpaused presentation clock and settlement. */
(()=>{
'use strict';
const id=window.SweetsLineup.ids.indexOf('jelly'),slot=slots[id];
const K=window.JellyRules,V=window.JellyView,game=window.SweetsLineup.catalog.jelly;
const canvas=document.createElement('canvas');canvas.className='jb-scene';canvas.setAttribute('role','img');
canvas.setAttribute('aria-label','ジェリービンゴ。前半5球で仕切りを開き、後半3球で赤・黄・緑のゼリーを流します');
slot.panel.append(canvas);slot.panel.classList.add('jb-panel');slot.holder.classList.add('jb-slot');
const title=slot.tab.querySelector('.tab-game-name'),emblem=new Image();emblem.src=game.logo;emblem.alt=game.name;
title.replaceChildren(emblem);title.setAttribute('aria-label',game.name);
const ctx=canvas.getContext('2d');
let frame=0,miniTimer=0,stamp=0,clock=0,lastMain=-1000,lastMini=-1000,demoTime=0,reachStarted=0,paused=false;
const engine={
 kind:'jelly',gameName:game.name,recordGame:game.record,drawMode:'single',allReachName:'オールライン',version:0,
 maxLink:0,maxChain:0,roundCleared:0,roundHammers:0,
 get idle(){return !this.trace&&!this.queue.length;},get busy(){return !this.idle;},
 get paused(){return paused;},
 set paused(value){
  if(value===paused)return;
  paused=value;stamp=0;if(!value&&(active===id||this.running))wake();
 },
 get totalHundredths(){
  const shown=this.trace?.oddsReason&&this.oddsStart==null?this.trace.before:this.state;
  return K.payout(shown.lines.length,shown.oddsMultiplier);
 },
 get allClears(){return Number(this.state.lines.length===12);},
 reset(){
  this.version++;this.state=K.create({rng:app.random,rate:debugPayoutTarget});this.queue=[];this.drawn=new Set();this.trace=null;
  this.oddsStart=null;this.processed=this.accepted=this.elapsed=this.roundSteps=0;this.running=false;this.paused=false;this.presentationRate=1;
  this.wonderCollected=false;this.wonderToken=null;stopSugarAward(slot);invalidateReach(slot);
  demoTime=0;lastMain=lastMini=-1000;this.emit('ready');
 },
 setRainbowSugar(bet){this.wonderToken={id:this.version,value:bet,tier:DIRECT_JPC_SUGAR_TIER,kind:'direct-jpc',directJpc:true};},
 start(){
  this.running=true;this.wonderToken??={id:this.version,value:this.roundBet,tier:sugarVisualTier(this.roundBet),kind:'jelly'};
  this.emit('waiting');slot.updateJellyReach(app);
 },
 previewDraw(n){this.drawn.add(n);},
 enqueueBatch(numbers){
  for(const n of numbers){
   if(!this.running||this.accepted>=8)break;
   const next=K.draw(this.queue.at(-1)?.state||this.state,n);
   if(next){this.queue.push(next);this.accepted++;}
  }
  wake();
 },
 emit(phase){this.phase=phase;slot.event={phase};slot.dirtyMini=slot.dirtyMain=true;wake();scheduleUI(app);}
};
app.engines[id]=slot.engine=engine;
slot.updateJellyReach=function(a){
 const c=reachContext(engine,a);
 if(!c||a.bet(id)<=0){if(slot.reachStatus!=='inactive'){invalidateReach(slot);slot.reachStatus='inactive';}return;}
 if(c.key===slot.reachBoardKey)return;
 const base=engine.totalHundredths,hits=[];
 for(let number=1;number<=25;number++){
  if(c.used.has(number))continue;
  const {lines,totalHundredths:total}=K.preview(engine.state,number),gain=total-base;
  if(medalWin(a.bet(id),total)<=medalWin(a.bet(id),base))continue;
  const allClear=lines===K.LINES.length&&engine.state.lines.length<lines,tier=reachTier(gain,allClear);
  hits.push({number,total,gain,allClear,tier,kind:['reach','high','super','all'][tier]});
 }
 reachStarted=clock;slot.reachBoardKey=c.key;slot.tabReachResults=slot.reachResults=hits;slot.tabReachBase=base;slot.tabReachVersion=engine.version;slot.reachStatus='ready';slot.reachAfterBall=c.count;
};
function collectSugar(){
 if(engine.wonderCollected||engine.state.lines.length<engine.state.sugarLines)return;
 const token=engine.wonderToken;engine.wonderCollected=true;engine.roundSteps=1;
 app.wonderBank.push({...token,game:id});app.wonderValue+=token.value;app.wonderSteps=app.wonderBank.length;
 if(isDirectJpcSugar(token)){select(id);showSugarCutin('虹色シュガー獲得!!','次ゲームは直接JPCへ！',true);}
 showSugarAward(slot,[token]);announceAchievement('ジェリービンゴ　ワンダーシュガーGET！');
}
async function finish(version){
 await finishGamePresentation(slot,engine,app,version);
 if(version!==engine.version||app.phase!=='playing'||app.paid[id])return;
 engine.running=false;engine.emit('complete');app.paid[id]=true;app.roundWins[id]=medalWin(app.locked[id],engine.totalHundredths);
 if(app.enabled.every((enabled,i)=>!enabled||app.paid[i]))app.finishRound();recordChanged(app);
}
function advance(dt){
 if(!engine.running)return;
 if(!engine.trace&&engine.queue.length){
  const next=engine.queue.shift();engine.state=next.state;engine.trace=next.trace;engine.elapsed=0;engine.oddsStart=null;
  invalidateReach(slot);engine.emit('jellyPour');
  if(active===id&&next.trace.ball>5)sceneSound('transfer',{volume:.52,rate:1+next.trace.ball*.025});
 }
 if(!engine.trace)return;
 const previous=engine.elapsed;
 engine.elapsed+=dt*engine.presentationRate;
 if(engine.trace.oddsReason&&engine.oddsStart==null&&engine.elapsed>=V.oddsRevealAt(engine.trace)){
  engine.oddsStart=clock;
  if(active===id)sceneSound('rank',{volume:.65,rate:1+(engine.state.oddsMultiplier-1)*.05});
  scheduleUI(app);
 }
 if(active===id&&engine.trace.opened.length&&previous<V.partitionBreakAt&&engine.elapsed>=V.partitionBreakAt){
  sceneSound('glass',{volume:.52,rate:1+engine.trace.ball*.025});
 }
 if(active===id&&engine.trace.newLines.length){
  const reveal=V.lineRevealAt(engine.trace);
  if(previous<reveal&&engine.elapsed>=reveal){
   const count=engine.state.lines.length;
   const cue=count===12?'allclear':count>=7?'big-bonus':count>=4?'bonus':'line';
   sceneSound(cue,{volume:Math.min(.9,.55+count*.03),rate:count===12?1:1+count*.018});
  }
 }
 if(engine.elapsed<V.duration(engine.trace)||(engine.oddsStart!=null&&clock-engine.oddsStart<1100))return;
 engine.trace=null;engine.processed++;collectSugar();engine.emit('settled');slot.updateJellyReach(app);
 if(engine.processed===8)finish(engine.version);
}
const demo=(()=>{
 let seed=1894;const rng=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const initial=K.create({rng,rate:90}),steps=[];let state=initial;
 // Show an empty pour, then two successive color changes in that same section.
 for(const index of [10,4,6,22,15,21,17,23]){const next=K.draw(state,initial.numbers[index]);steps.push(next);state=next.state;}
 return {initial,steps};
})();
function presentation(){
 if(app.phase!=='ready')return {state:engine.state,turn:engine.trace,elapsed:engine.elapsed,oddsPopupTime:engine.oddsStart==null?-1:clock-engine.oddsStart};
 const time=demoTime%20000;
 if(time<1200)return {state:demo.initial,turn:null,elapsed:0};
 const n=Math.min(7,Math.floor((time-1200)/2150)),s=demo.steps[n],elapsed=time-1200-n*2150;
 return {state:s.state,turn:elapsed<V.duration(s.trace)?s.trace:null,elapsed};
}
function paint(mini){
 if(mini?(active===id||app.phase==='ready'):(active!==id||slot.panel.hidden))return;
 const dest=mini?slot.miniCanvas:canvas;
 if(!mini){const dpr=Math.min(devicePixelRatio||1,2),w=Math.max(1,Math.round(canvas.clientWidth*dpr)),h=Math.max(1,Math.round(canvas.clientHeight*dpr));if(canvas.width!==w)canvas.width=w;if(canvas.height!==h)canvas.height=h;}
 const p=presentation(),demo=app.phase==='ready',bet=app.bet(id);
 V.draw(mini?slot.mini:ctx,p.state,{width:dest.width,height:dest.height,mini,demo,time:clock,turn:p.turn,elapsed:p.elapsed,oddsPopupTime:p.oddsPopupTime,bet,
  sugarLines:engine.state.sugarLines,sugarCollected:!demo&&engine.wonderCollected,
  sugarIcon:!mini&&bet>0?getSugarSprite(sugarVisualTier(engine.wonderToken||bet)):null,
  reachTime:clock-reachStarted,reach:engine.trace||demo?[]:slot.reachResults});
}
slot.paintJelly=paint;
function wake(){
 clearTimeout(miniTimer);miniTimer=0;
 if(!frame&&!document.hidden)frame=requestAnimationFrame(tick);
}
function tick(now){
 frame=0;const moving=!app.paused&&!document.hidden&&inView&&!jpcSession.active;
 const elapsed=moving&&stamp?Math.max(0,now-stamp):0;stamp=moving?now:0;
 if(moving){const dt=Math.min(100,elapsed);clock+=elapsed;if(active===id&&app.phase==='ready')demoTime+=dt;advance(dt);}
 if(active===id&&clock-lastMain>=32){paint(false);lastMain=clock;}
 const miniReach=active!==id&&app.phase==='playing'&&!motionReduced&&slot.reachResults.length>0;
 if(active!==id&&(engine.trace||miniReach)&&clock-lastMini>=150){paint(true);lastMini=clock;}
 if(moving&&(active===id||engine.trace||engine.queue.length))wake();
 else if(moving&&miniReach)miniTimer=setTimeout(wake,150);
}
const select0=select;select=function(i){const result=select0(i);document.body.classList.toggle('jb-active',active===id);lastMain=-1000;wake();return result;};
const hud0=hud;hud=function(a){hud0(a);if(active===id){put('best',engine.state.lines.length+' BINGO ／ '+engine.state.sugarLines+'ラインでシュガー');put('ballinfo','あと'+Math.max(0,8-a.draws.length)+'球');wake();}};
const result0=renderRoundResult;renderRoundResult=function(a){
 result0(a);if(!a.result)return;
 const row=$('result-games').querySelector('[data-game-index="'+id+'"]');if(!row||row.dataset.jelly===String(a.token))return;
 row.dataset.jelly=String(a.token);row.querySelector('.result-game-name').innerHTML=game.name+' <small>'+(a.enabled[id]?num(a.locked[id])+' BET':'NO BET')+'</small>';
 row.querySelector('.result-game-details').textContent=a.enabled[id]?engine.state.lines.length+' BINGO ／ '+engine.state.colors.filter(Boolean).length+'マス HIT ／ 配当×'+engine.state.oddsMultiplier.toFixed(1)+(engine.wonderCollected?' ／ シュガーGET！':''):'参加なし';
};
new ResizeObserver(()=>{lastMain=-1000;wake();}).observe(slot.panel);document.addEventListener('visibilitychange',()=>{stamp=0;wake();});
window.JellyBingo={engine,core:K};engine.reset();select(active);
})();

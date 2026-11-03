/* Popcorn Splash. Uses the normal roulette, pause clock and credit settlement. */
(()=>{
'use strict';
const id=2, slot=slots[id], K=window.PopcornEngine, V=window.PopcornView;
const canvas=document.createElement('canvas');
canvas.className='pc-scene';
const guideHint='ポップコーンスプラッシュの着火ガイド。番号で着火範囲やボム率UPを確認。左右キーで選択。Escで解除。';
canvas.tabIndex=0;
canvas.setAttribute('aria-label',guideHint);
slot.panel.append(canvas);
const ctx=canvas.getContext('2d');
slot.holder.classList.add('pc-slot');
const title=slot.tab.querySelector('.tab-game-name');
title.setAttribute('aria-label','ポップコーンスプラッシュ');
title.innerHTML='<img src="assets/popcorn-art/popcorn-logo-v88.webp" alt="ポップコーンスプラッシュ">';
slot.tabSugar.hidden=false;

let frame=0, stamp=0, clock=0, demoClock=0, lastMain=-1e4, lastMini=-1e4, demo=null;
let hoverPort=-1,pinnedPort=-1,visibleLesson=0;
const lessonDurations=[2050,2050,2050,2050,2050,3300,2500,3750];
const demoPeriod=lessonDurations.reduce((a,b)=>a+b,0);
const lessonNames=['黄ボム','赤ボム','紫ボム','稲妻ボム','虹ボム','着火ライン','ボム率UP','ALL着火'];
const engine={
 kind:'popcorn', recordGame:4, drawMode:'single', version:0,
 get idle(){return !this.trace&&!this.queue.length;},
 get busy(){return !this.idle;},
 get totalHundredths(){return K.payout(this.state.popped,this.state.clears,100,this.state.firstPopAward);},
 get allClears(){return this.state.clears;},
 get roundCleared(){return this.state.popped;},
 maxLink:0,roundSteps:0,roundHammers:0,
 reset(){
  this.version++;this.phase='ready';this.running=false;this.paused=false;this.presentationRate=1;
  this.state=K.create({bet:app.bet(id)||0,rate:debugPayoutTarget,rng:app.random});
  this.wonderToken=null;this.wonderCollected=false;this.roundSteps=0;stopSugarAward(slot);
  this.accepted=0;this.processed=0;this.drawn=new Set();this.queue=[];this.trace=null;this.elapsed=0;this.maxChain=0;this.soundWave=-1;
  demo=null;visibleLesson=0;hoverPort=pinnedPort=-1;canvas.setAttribute('aria-label',guideHint);invalidateReach(slot);this.emit('ready');lastMain=lastMini=-1e4;
 },
 setRainbowSugar(bet){
  this.wonderToken={id:this.version*100+1,value:bet,tier:DIRECT_JPC_SUGAR_TIER,kind:'direct-jpc',directJpc:true};
 },
 start(){
  this.wonderToken??={id:this.version*100+1,value:this.roundBet,tier:sugarVisualTier(this.roundBet),kind:'popcorn',source:'popped'};
  this.state.bet=this.roundBet;this.running=true;this.emit('waiting');updateReach(app);demo=null;visibleLesson=0;hoverPort=pinnedPort=-1;canvas.setAttribute('aria-label',guideHint);
 },
 previewDraw(n){this.drawn.add(n);},
 enqueueBatch(values){
  // Resolve numbers in arrival order, even while an earlier explosion is animating.
  for(const number of values){
   if(!this.running||this.accepted>=8)break;
   const previous=this.queue.at(-1)?.state||this.state;
   const state={...previous,drawn:previous.drawn.slice()};
   const trace=K.draw(state,number,app.random);
   if(trace){this.queue.push({number,state,trace});this.accepted++;}
  }
  requestFrame();
 },
 emit(phase,extra={}){
  this.phase=phase;slot.event={phase,...extra};slot.dirtyMini=slot.dirtyMain=true;
  requestFrame();scheduleUI(app);
 }
};
app.engines[id]=slot.engine=engine;
const reachKinds=['reach','high','super','all'];
function updateReach(a){
 const context=reachContext(engine,a);
 if(!context||a.bet(id)<=0){invalidateReach(slot);return;}
 if(slot.reachBoardKey===context.key)return;
 const current=engine.totalHundredths, options=[];
 for(const number of engine.state.numbers){
  if(context.used.has(number))continue;
  const p=K.preview(engine.state,number);
  const total=K.payout(engine.state.popped+p.count,engine.allClears+Number(p.clear),100,engine.state.firstPopAward);
  const gain=total-current;
  if(!p.clear&&gain<=0)continue;
  const tier=reachTier(gain,p.clear);
  options.push({number,total,gain,allClear:p.clear,tier,kind:reachKinds[tier]});
 }
 options.sort((a,b)=>a.number-b.number);
 slot.reachBoardKey=context.key;slot.reachResults=options;
 // Main-board clear badges always say 全消し. The small-board numbers reserve
 // the rainbow tier for the prospective third clear and later in this game.
 slot.tabReachResults=options.map(hit=>{
  if(!hit.allClear||engine.allClears>=2)return hit;
  const tier=reachTier(hit.gain,false);
  return {...hit,tier,kind:reachKinds[tier]};
 });
 slot.tabReachBase=current;slot.tabReachVersion=engine.version;slot.reachStatus='ready';slot.reachAfterBall=engine.processed;
}
slot.updatePopcornReach=updateReach;
async function finish(token){
 await finishGamePresentation(slot,engine,app,token);
 if(token!==engine.version||app.phase!=='playing'||app.paid[id])return;
 engine.running=false;engine.emit('complete');app.paid[id]=true;
 app.roundWins[id]=medalWin(app.locked[id],engine.totalHundredths);
 if(app.enabled.every((yes,i)=>!yes||app.paid[i]))app.finishRound();
 recordChanged(app);
}
function collectSugar(){
 const step=engine.wonderToken;
 if(!step||engine.wonderCollected||app.phase!=='playing'||!app.enabled[id])return;
 engine.wonderCollected=true;engine.roundSteps=1;
 app.wonderBank.push({...step,game:id});app.wonderValue+=step.value;app.wonderSteps=app.wonderBank.length;
 if(isDirectJpcSugar(step)){select(id);showSugarCutin('虹色シュガー獲得!!','次ゲームは直接JPCへ！',true);}
 showSugarAward(slot,[step]);announceAchievement('ポップコーンスプラッシュ　ワンダーシュガーGET！');
 scheduleUI(app);
}
function step(dt){
 if(!engine.running)return;
 if(!engine.trace&&engine.queue.length){
  const {number,state,trace}=engine.queue.shift();
  engine.state=state;engine.trace=trace;engine.elapsed=0;
  engine.soundWave=-1;engine.maxChain=Math.max(engine.maxChain,engine.trace.waves.length);
  invalidateReach(slot);engine.emit('popcornDraw',{number});
  if(trace.boost&&active===id)sceneSound('level',{volume:.55});
 }
 if(!engine.trace)return;
 const trace=engine.trace,visibleBefore=V.shownPopped(engine.state,trace,engine.elapsed);
 engine.elapsed+=dt*(engine.presentationRate||1);
 const visible=V.shownPopped(engine.state,trace,engine.elapsed);
 if(visible!==visibleBefore)scheduleUI(app);
 if(active===id&&trace.count){
  const wave=V.waveAt(trace,engine.elapsed);
  if(wave>engine.soundWave&&wave<trace.waves.length){
   engine.soundWave=wave;
   const power=trace.waves[wave].reduce((max,i)=>Math.max(max,trace.before[i].power),0);
   const effect=power===5?'transform':power===4?'sweep':power>=2?'color-burst':'pop';
   sceneSound(effect,{volume:power>=2?.72:Math.min(.72,.42+wave*.05),rate:1+Math.min(wave,7)*.075});
   if(wave>=2)sceneSound('chain',{volume:.35,rate:1+Math.min(wave,6)*.09});
   if(trace.clear&&wave===trace.waves.length-1)sceneSound('allclear',{volume:.76});
  }
 }
 if(trace.sugarCrossed&&!engine.wonderCollected&&visible>=engine.state.sugarTarget)collectSugar();
 if(engine.elapsed<V.duration(trace))return;
 engine.trace=null;engine.processed++;
 if(trace.clear)announceAchievement('ポップコーンスプラッシュ　全消し '+engine.allClears+'回！');
 engine.emit('settled');updateReach(app);
 if(engine.processed===8)finish(engine.version);
}
function demoFrame(){
 if(!demo){
  let n=2425;
  const rng=()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296);
  demo={state:K.create({rng,bet:app.bet(id)||100,rate:debugPayoutTarget}),started:demoClock,inspectUntil:0};
  demo.state.firstPopAward=engine.state.firstPopAward;
 }
 const d=demo.state;d.bet=app.bet(id);
 if(hoverPort>=0||pinnedPort>=0||clock<demo.inspectUntil)return {state:d,turn:null,elapsed:0};
 let age=(demoClock-demo.started)%demoPeriod,power=1;
 while(power<lessonDurations.length&&age>=lessonDurations[power-1]){age-=lessonDurations[power-1];power++;}
 return {state:d,turn:null,elapsed:0,lesson:{power,progress:age/lessonDurations[power-1]}};
}
function paint(mini){
 if(mini?active===id:active!==id||slot.panel.hidden)return;
 const dest=mini?slot.miniCanvas:canvas;
 const dpr=Math.min(2,window.devicePixelRatio||1);
 if(!mini){
  const w=Math.max(1,Math.round(canvas.clientWidth*dpr)),h=Math.max(1,Math.round(canvas.clientHeight*dpr));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
 }
 const displayDemo=app.phase==='ready'&&!jpcSession.active;
 const d=displayDemo?demoFrame():{state:engine.state,turn:engine.trace,elapsed:engine.elapsed};
 const focusPort=mini?-1:(hoverPort>=0?hoverPort:pinnedPort);
 if(!mini){
  const next=d.lesson?.power||0;
  if(next!==visibleLesson){
   visibleLesson=next;canvas.setAttribute('aria-label',next?'遊び方 '+next+'/8 '+lessonNames[next-1]+'。番号ガイドボタン・矢印キーで番号ガイドを開きます。':guideHint);
  }
 }
 V.draw(mini?slot.mini:ctx,d.state,{width:dest.width,height:dest.height,mini,demo:displayDemo,lesson:d.lesson,time:clock,bet:app.bet(id),turn:d.turn,elapsed:d.elapsed,focusPort,sugarIcon:getSugarSprite(sugarVisualTier(displayDemo?app.bet(id):engine.wonderToken||app.bet(id))),reach:displayDemo?[]:(mini?slot.tabReachResults:slot.reachResults)});
}
slot.paintPopcorn=paint;
function badgeAt(event){
 const r=canvas.getBoundingClientRect();
 return V.pickPort(r.width,r.height,event.clientX-r.left,event.clientY-r.top);
}
function refreshGuide(){
 const port=hoverPort>=0?hoverPort:pinnedPort;
 const s=app.phase==='ready'&&demo?demo.state:engine.state;
 let label=guideHint;
 if(port>=0){
  const action=port===s.boostIndex?'ボム率UP。次の補充はLv.'+(s.level+1):port===s.allIndex?'ALL。盤上の全ボムに着火':'着火ガイド';
  label=s.numbers[port]+'番、'+action+'。左右キーで選択、Escで解除。';
 }
 canvas.setAttribute('aria-label',label);
 canvas.style.cursor=hoverPort>=0?'pointer':'';
 paint(false);
}
function openLessonGuide(){
 if(!visibleLesson||!demo)return false;
 demo.inspectUntil=clock+4500;
 visibleLesson=0;canvas.setAttribute('aria-label',guideHint);paint(false);return true;
}
canvas.addEventListener('pointermove',ev=>{
 if(ev.pointerType==='touch')return;
 if(visibleLesson){
  const r=canvas.getBoundingClientRect();canvas.style.cursor=V.lessonGuideHit(r.width,r.height,ev.clientX-r.left,ev.clientY-r.top)?'pointer':'default';return;
 }
 const p=badgeAt(ev);if(p===hoverPort)return;
 hoverPort=p;refreshGuide();
});
canvas.addEventListener('pointerleave',()=>{
 if(hoverPort>=0){hoverPort=-1;refreshGuide();}
});
canvas.addEventListener('click',ev=>{
 if(visibleLesson){
  const r=canvas.getBoundingClientRect();
  if(V.lessonGuideHit(r.width,r.height,ev.clientX-r.left,ev.clientY-r.top))openLessonGuide();
  return;
 }
 const p=badgeAt(ev);pinnedPort=p===pinnedPort?-1:p;
 hoverPort=-1;refreshGuide();
});
canvas.addEventListener('keydown',ev=>{
 if(visibleLesson && ['ArrowRight','ArrowLeft','Home','End','Enter',' '].includes(ev.key)){
  openLessonGuide();
  if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();return;}
 }
 const current=hoverPort>=0?hoverPort:pinnedPort, n=engine.state.numbers.length;
 switch(ev.key){
  case 'ArrowRight': pinnedPort=(current+1)%n;break;
  case 'ArrowLeft': pinnedPort=current<0?n-1:(current+n-1)%n;break;
  case 'Home': pinnedPort=0;break;
  case 'End': pinnedPort=n-1;break;
  case 'Escape': pinnedPort=-1;if(demo)demo.inspectUntil=0;break;
  default:return;
 }
 ev.preventDefault();ev.stopPropagation();hoverPort=-1;refreshGuide();
});
function requestFrame(){
 if(!frame&&!document.hidden)frame=requestAnimationFrame(tick);
}
function tick(now){
 frame=0;
 const advancing=!app.paused&&inView&&!document.hidden&&!jpcSession.active;
 const elapsed=advancing&&stamp?Math.max(0,now-stamp):0;
 const dt=Math.min(elapsed,100);
 stamp=now;
 if(advancing){clock+=dt;if(app.phase==='ready')demoClock+=elapsed;step(dt);}
 const selected=active===id;
 const fastSupply=advancing&&selected&&engine.presentationRate>1&&engine.trace&&V.refilling(engine.trace,engine.elapsed);
 if(selected&&(fastSupply||clock-lastMain>=33)){paint(false);lastMain=clock;}
 if((app.phase==='ready'||engine.trace)&&clock-lastMini>=150){paint(true);lastMini=clock;}
 if(advancing&&(selected||app.phase==='ready'||engine.trace||engine.queue.length))requestFrame();
}
const oldSelect=select;
select=function(i){
 const wasSelected=active===id;
 const result=oldSelect(i);
 document.body.classList.toggle('pc-active',i===id);
 if(i===id){lastMain=-1e4;requestFrame();}
 else if(wasSelected)paint(true);
 return result;
};
const oldHud=hud;
hud=function(a){
 oldHud(a);
 if(active===id){
  put('best',V.shownPopped(engine.state,engine.trace,engine.elapsed)+' POP ／ 全消し '+engine.allClears+'回 ／ 補充Lv.'+engine.state.level);
  put('ballinfo','あと'+Math.max(0,8-a.draws.length)+'球');requestFrame();
 }
};
const oldResult=renderRoundResult;
renderRoundResult=function(a){
 oldResult(a);
 const panel=$('result-games'),row=panel.querySelector('[data-game-index="2"]');
 if(!row||!a.result)return;
 if(row.dataset.popcorn!==String(a.token)){
  row.dataset.popcorn=String(a.token);
  row.querySelector('.result-game-name').innerHTML='ポップコーンスプラッシュ <small>'+(a.enabled[id]?num(a.locked[id])+' BET':'NO BET')+'</small>';
  row.querySelector('.result-game-details').textContent=a.enabled[id]?engine.state.popped+'粒 ／ 全消し '+engine.allClears+'回 ／ 補充Lv.'+engine.state.level+(engine.wonderCollected?' ／ シュガーGET！':''):'参加なし';
  row.querySelector('.result-game-emblem').outerHTML='<img class="result-game-emblem" src="assets/popcorn-art/popcorn-normal.webp?v=81" alt="">';
 }
};
document.addEventListener('visibilitychange',()=>{stamp=0;requestFrame();});
new ResizeObserver(()=>{lastMain=-1e4;requestFrame();}).observe(slot.panel);
function refreshArt(){lastMini=lastMain=-1e4;requestFrame();}
V.assetsReady.then(refreshArt);
if(document.fonts)document.fonts.load('700 16px ArcadePayout','0123456789WIN').then(refreshArt);
document.body.classList.add('pc-enabled');
window.PopcornSplash={engine,core:K,version:89};
engine.reset();
select(id);
})();

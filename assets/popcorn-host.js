/* Popcorn Splash. Uses the normal roulette, pause clock and credit settlement. */
(()=>{
'use strict';
const id=2, slot=slots[id], K=window.PopcornEngine, V=window.PopcornView;
const canvas=document.createElement('canvas');
canvas.className='pc-scene';
const guideHint='ポップコーンスプラッシュの着火ガイド。番号をタップするか、左右キーで選択。Escで解除。';
canvas.tabIndex=0;
canvas.setAttribute('aria-label',guideHint);
slot.panel.append(canvas);
const ctx=canvas.getContext('2d');
slot.holder.classList.add('pc-slot');
const title=slot.tab.querySelector('.tab-game-name');
title.setAttribute('aria-label','ポップコーンスプラッシュ');
title.innerHTML='<img src="assets/popcorn-art/popcorn-logo.webp" alt="ポップコーンスプラッシュ">';
slot.tabSugar.hidden=true;

let frame=0, stamp=0, clock=0, lastMain=-1e4, lastMini=-1e4, demo=null;
let reach=[],hoverPort=-1,pinnedPort=-1;
const engine={
 kind:'popcorn', recordGame:4, drawMode:'single', version:0,
 get idle(){return !this.trace&&!this.queue.length;},
 get busy(){return !this.idle;},
 get totalHundredths(){return K.payout(this.state.popped,this.state.clears,100);},
 get allClears(){return this.state.clears;},
 get roundCleared(){return this.state.popped;},
 maxLink:0,roundSteps:0,roundHammers:0,
 reset(){
  this.version++;this.phase='ready';this.running=false;this.paused=false;this.presentationRate=1;
  this.state=K.create({bet:app.bet(id)||0,rate:debugPayoutTarget,rng:app.random});
  this.accepted=0;this.processed=0;this.drawn=new Set();this.queue=[];this.trace=null;this.elapsed=0;this.maxChain=0;this.soundWave=-1;
  demo=null;reach=[];hoverPort=pinnedPort=-1;canvas.setAttribute('aria-label',guideHint);invalidateReach(slot);this.emit('ready');lastMain=lastMini=-1e4;
 },
 start(){
  this.state.bet=this.roundBet;this.running=true;this.emit('waiting');demo=null;hoverPort=pinnedPort=-1;canvas.setAttribute('aria-label',guideHint);
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
function updateReach(a){
 const context=reachContext(engine,a);
 if(!context||a.bet(id)<=0){reach=[];invalidateReach(slot);return;}
 if(slot.reachBoardKey===context.key)return;
 const current=engine.totalHundredths, options=[];
 for(const number of engine.state.numbers){
  if(context.used.has(number))continue;
  const p=K.preview(engine.state,number);
  const total=K.payout(engine.state.popped+p.count,engine.allClears+Number(p.clear),100);
  if(total>current)options.push({number,total,tier:reachTier(total-current,p.clear)});
 }
 options.sort((a,b)=>a.number-b.number);
 slot.reachBoardKey=context.key;slot.reachResults=slot.tabReachResults=options;
 slot.tabReachBase=current;slot.tabReachVersion=engine.version;slot.reachStatus='ready';slot.reachAfterBall=engine.processed;
 reach=options.map(o=>({number:o.number,kind:['reach','high','super','all'][o.tier]}));
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
function step(dt){
 if(!engine.running)return;
 if(!engine.trace&&engine.queue.length){
  const {number,state,trace}=engine.queue.shift();
  engine.state=state;engine.trace=trace;engine.elapsed=0;
  engine.soundWave=-1;engine.maxChain=Math.max(engine.maxChain,engine.trace.waves.length);
  invalidateReach(slot);reach=[];engine.emit('popcornDraw',{number});
 }
 if(!engine.trace)return;
 engine.elapsed+=dt*(engine.presentationRate||1);
 const trace=engine.trace;
 if(active===id&&trace.count){
  const wave=V.waveAt(trace,engine.elapsed);
  if(wave>engine.soundWave&&wave<trace.waves.length){
   engine.soundWave=wave;
   const strong=trace.waves[wave].some(i=>trace.before[i].power===2);
   sceneSound(strong?'color-burst':'pop',{volume:strong?.72:Math.min(.72,.42+wave*.05),rate:1+Math.min(wave,7)*.075});
   if(wave>=2)sceneSound('chain',{volume:.35,rate:1+Math.min(wave,6)*.09});
   if(trace.clear&&wave===trace.waves.length-1)sceneSound('allclear',{volume:.76});
  }
 }
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
  demo={state:K.create({rng,bet:app.bet(id),rate:90}),rng,at:clock,trace:null};
 }
 demo.state.bet=app.bet(id);
 // Hold a settled sample board while the player inspects its numbered lanes.
 if(hoverPort>=0||pinnedPort>=0){demo.trace=null;demo.at=clock;}
 const age=clock-demo.at, hold=demo.trace?V.duration(demo.trace)+1000:1300;
 if(age>=hold){
  if(demo.state.turn>=3){demo=null;return demoFrame();}
  const d=demo.state;const fire=d.turn===2?d.allIndex:[6,1,12].find(i=>i!==d.allIndex&&i!==(demo.lastPort??-1));
  demo.lastPort=fire;demo.trace=K.draw(d,d.numbers[fire],demo.rng);demo.at=clock;
 }
 return {state:demo.state,turn:demo.trace,elapsed:clock-demo.at};
}
function paint(mini){
 if(!mini&&(active!==id||slot.panel.hidden))return;
 const dest=mini?slot.miniCanvas:canvas;
 const dpr=Math.min(2,window.devicePixelRatio||1);
 if(!mini){
  const w=Math.max(1,Math.round(canvas.clientWidth*dpr)),h=Math.max(1,Math.round(canvas.clientHeight*dpr));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
 }
 const displayDemo=app.phase==='ready'&&!jpcSession.active;
 const d=displayDemo?demoFrame():{state:engine.state,turn:engine.trace,elapsed:engine.elapsed};
 const focusPort=mini?-1:(hoverPort>=0?hoverPort:pinnedPort);
 V.draw(mini?slot.mini:ctx,d.state,{width:dest.width,height:dest.height,mini,demo:displayDemo,time:clock,bet:app.bet(id),turn:d.turn,elapsed:d.elapsed,focusPort,reach:displayDemo?[]:reach});
}
slot.paintPopcorn=paint;
function badgeAt(event){
 const r=canvas.getBoundingClientRect();
 return V.pickPort(r.width,r.height,event.clientX-r.left,event.clientY-r.top);
}
function refreshGuide(){
 const port=hoverPort>=0?hoverPort:pinnedPort;
 const s=app.phase==='ready'&&demo?demo.state:engine.state;
 canvas.setAttribute('aria-label',port<0?guideHint:(port===s.allIndex?'ALL ':'')+s.numbers[port]+'番の着火ガイド。左右キーで選択、Escで解除。');
 canvas.style.cursor=hoverPort>=0?'pointer':'';
 paint(false);
}
canvas.addEventListener('pointermove',ev=>{
 if(ev.pointerType==='touch')return;
 const p=badgeAt(ev);if(p===hoverPort)return;
 hoverPort=p;refreshGuide();
});
canvas.addEventListener('pointerleave',()=>{
 if(hoverPort>=0){hoverPort=-1;refreshGuide();}
});
canvas.addEventListener('click',ev=>{
 const p=badgeAt(ev);pinnedPort=p===pinnedPort?-1:p;
 hoverPort=-1;refreshGuide();
});
canvas.addEventListener('keydown',ev=>{
 const current=hoverPort>=0?hoverPort:pinnedPort, n=K.ports.length+1;
 switch(ev.key){
  case 'ArrowRight': pinnedPort=(current+1)%n;break;
  case 'ArrowLeft': pinnedPort=current<0?n-1:(current+n-1)%n;break;
  case 'Home': pinnedPort=0;break;
  case 'End': pinnedPort=n-1;break;
  case 'Escape': pinnedPort=-1;break;
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
 const dt=advancing&&stamp?Math.min(now-stamp,100):0;
 stamp=now;
 if(advancing){clock+=dt;step(dt);}
 const selected=active===id;
 if(selected&&clock-lastMain>=33){paint(false);lastMain=clock;}
 if((app.phase==='ready'||engine.trace)&&clock-lastMini>=150){paint(true);lastMini=clock;}
 if(advancing&&(selected||app.phase==='ready'||engine.trace||engine.queue.length))requestFrame();
}
const oldSelect=select;
select=function(i){
 const result=oldSelect(i);
 document.body.classList.toggle('pc-active',i===id);
 if(i===id){lastMain=-1e4;requestFrame();}
 return result;
};
const oldHud=hud;
hud=function(a){
 oldHud(a);
 if(active===id){
  put('best',engine.state.popped+' POP ／ 全消し '+engine.allClears+'回');
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
  row.querySelector('.result-game-details').textContent=a.enabled[id]?engine.state.popped+'粒 ／ 全消し '+engine.allClears+'回':'参加なし';
  row.querySelector('.result-game-emblem').outerHTML='<img class="result-game-emblem" src="assets/popcorn-art/popcorn-normal.webp?v=81" alt="">';
 }
};
document.addEventListener('visibilitychange',()=>{stamp=0;requestFrame();});
new ResizeObserver(()=>{lastMain=-1e4;requestFrame();}).observe(slot.panel);
if(V.assetsReady)V.assetsReady.then(()=>{lastMini=lastMain=-1e4;requestFrame();});
document.body.classList.add('pc-enabled');
window.PopcornSplash={engine,core:K,version:83};
engine.reset();
select(id);
})();

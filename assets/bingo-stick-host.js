/* Bingo Stick uses the shared eight draws. The placement clock runs on active play time. */
(()=>{
'use strict';
const id=SweetsLineup.ids.indexOf('stick'),slot=slots[id],game=SweetsLineup.catalog.stick,R=window.BingoStickRules;
const thinkingMs=15000,noReach=[];
let clock=0,deadline=null,timeLeft=0,paused=false,lastHit=-Infinity,lastMain=-Infinity,lastMini=-Infinity,frame=0,miniTimer=0,stamp=null;
const engine={
 kind:'stick',gameName:game.name,recordGame:game.record,drawMode:'single',allReachName:'8マスライン',version:0,
 maxChain:0,roundCleared:0,roundHammers:0,allClears:0,
 get maxLink(){return this.state.longest;},
 get holdDraws(){return this.running&&this.state.phase==='thinking';},
 get idle(){return !this.holdDraws;},get busy(){return !this.idle;},
 get totalHundredths(){return (this.thinkingBase||this.state).totalHundredths;},
 get remainingMs(){return deadline===null?timeLeft:Math.max(0,deadline-performance.now());},
 get paused(){return paused;},
 set paused(value){
  if(paused===value)return;
  if(this.holdDraws){timeLeft=this.remainingMs;deadline=value?null:performance.now()+timeLeft;}
  paused=value;stamp=null;wake();
 },
 reset(){
  this.version++;this.state=R.create({rng:app.random});this.drawn=new Set();this.queue=[];this.processed=this.accepted=0;
  this.running=false;this.roundSteps=0;this.wonderCollected=false;this.wonderToken=null;this.thinkingBase=null;this.presentationRate=1;
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
   const before=this.state,next=R.draw(before,n);
   if(!next)continue;
   this.state=next;this.processed=this.accepted=next.draws.length;lastHit=clock;invalidateReach(slot);
   if(next.phase==='thinking'){
    // Set the draw hold synchronously in Arcade.acceptNumber, before another input or physics tick.
    this.thinkingBase=next;timeLeft=thinkingMs;deadline=performance.now()+timeLeft;
    if(active!==id)select(id);
    this.emit('thinking');syncManualNumbers();
   }else this.emit('settled');
   soundGain(before,next);
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

function soundGain(before,after){
 if(active!==id||medalWin(app.bet(id),after.totalHundredths)<=medalWin(app.bet(id),before.totalHundredths))return;
 const tier=reachTier(after.totalHundredths-before.totalHundredths,after.counts[8]>before.counts[8]);
 sceneSound(['line','bonus','big-bonus','allclear'][tier],{volume:.62+tier*.06});
}
function toggle(cell){
 if(!engine.holdDraws||app.phase!=='playing'||app.paused||active!==id)return false;
 if(engine.remainingMs<=0){confirm();return false;}
 const next=R.place(engine.state,cell);if(!next)return false;
 engine.state=next;sceneSound('cookie-hit',{volume:.34,rate:next.placedFree.includes(cell)?1.16:.92});engine.emit('thinking');return true;
}
function confirm(){
 if(!engine.holdDraws||app.phase!=='playing'||app.paused)return false;
 engine.state=R.confirm(engine.state);deadline=null;timeLeft=0;
 soundGain(engine.thinkingBase,engine.state);engine.thinkingBase=null;
 engine.emit('settled');collectSugar();slot.updateStickReach(app);syncManualNumbers();return true;
}
const view=window.BingoStickView.mount(slot.panel,{toggle,confirm});

function projectReaches(s,bet){
 const base=s.totalHundredths,currentWin=medalWin(bet,base),hits=[],free=new Set([...s.initialFree,...s.placedFree]);
 for(let number=1;number<=25;number++){
  const next=R.draw(s,number);if(!next)continue;
  const total=next.totalHundredths,gain=total-base;
  if(medalWin(bet,total)<=currentWin)continue;
  // Every newly formed or extended maximal line contains a fresh, non-FREE hit.
  const fresh=next.hits.slice(s.hits.length).filter(i=>!free.has(i));
  const lines=next.lines.filter(line=>fresh.some(i=>line.cells.includes(i)));
  const cells=fresh.filter(i=>lines.some(line=>line.cells.includes(i)));
  const longest=next.counts[8]>s.counts[8],tier=reachTier(gain,longest);
  hits.push({number,total,gain,tier,lines,cells,allClear:longest,kind:['reach','high','super','all'][tier]});
 }
 return hits;
}
slot.updateStickReach=function(a){
 const s=engine.state,c=reachContext(engine,a);
 if(!c||a.bet(id)<=0||s.phase==='thinking'||s.phase==='done'){
  if(slot.reachStatus!=='inactive'){invalidateReach(slot);slot.reachStatus='inactive';}return;
 }
 if(c.key===slot.reachBoardKey)return;
 slot.tabReachResults=slot.reachResults=projectReaches(s,a.bet(id));slot.reachBoardKey=c.key;slot.tabReachBase=s.totalHundredths;
 slot.tabReachVersion=engine.version;slot.reachStatus='ready';slot.reachAfterBall=c.count;
};
function collectSugar(){
 if(engine.wonderCollected||!engine.state.counts[8])return;
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
// One reproducible sample board shows the same placements, rules and scores used in play.
const lesson=(()=>{
 let seed=9121;
 let state=R.create({rng:()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32)});
 const stages=[];const add=(at,remainingMs=0)=>stages.push({at,state,remainingMs,reach:state.phase==='last'?projectReaches(state,100):noReach});
 add(0);
 for(let n=1;n<=5;n++){state=R.draw(state,n);add(1200+n*1000,n===5?15000:0);}
 const locked=R.confirm(state);
 locked.placedFree.forEach((cell,i)=>{state=R.place(state,cell);add(7400+i*670,14000-i*1800);});
 state=locked;add(13000);
 for(let n=6;n<=8;n++){state=R.draw(state,n);add(14100+(n-6)*1700);}
 return stages;
})();
function paint(mini){
 if(mini?(active===id||app.phase==='ready'):(active!==id||slot.panel.hidden))return;
 const demo=app.phase==='ready',stage=demo?lesson.findLast(e=>e.at<=clock%20000):null;
 const s=stage?stage.state:engine.state,age=stage?clock%20000-stage.at:clock-lastHit;
 const opts={time:clock,bet:app.bet(id),demo,paused:app.paused,remainingMs:stage?stage.remainingMs:engine.remainingMs,
  latestNumber:s.draws.at(-1),age,reach:stage?stage.reach:slot.reachResults,sugarCollected:stage?!!s.counts[8]:engine.wonderCollected,
  sugarIcon:mini||!app.bet(id)?null:getSugarSprite(sugarVisualTier(engine.wonderToken||app.bet(id)))};
 if(mini)view.drawMini(slot.mini,s,opts);else view.draw(s,opts);
}
slot.paintStick=paint;
function wake(){clearTimeout(miniTimer);miniTimer=0;if(!frame&&!document.hidden)frame=requestAnimationFrame(tick);}
function tick(now){
 frame=0;
 const moving=!app.paused&&!document.hidden&&inView&&!jpcSession.active;
 if(moving&&stamp!==null)clock+=Math.max(0,now-stamp);stamp=moving?now:null;
 if(moving&&engine.holdDraws&&engine.remainingMs<=0)confirm();
 if(active===id&&clock-lastMain>=40){paint(false);lastMain=clock;}
 if(active!==id&&clock-lastMini>=150){paint(true);lastMini=clock;}
 if(moving&&(active===id||engine.holdDraws||clock-lastHit<1200))wake();
 else if(moving&&app.phase==='playing'&&!motionReduced&&slot.reachResults.length)miniTimer=setTimeout(wake,150);
 else stamp=null;
}
const oldSelect=select;select=function(i){const result=oldSelect(i);document.body.classList.toggle('bs-active',active===id);lastMain=lastMini=-Infinity;wake();return result;};
const oldHud=hud;hud=function(a){oldHud(a);if(active===id){put('best','最長 '+engine.state.longest+'マス');put('ballinfo',engine.holdDraws?'FREE 配置中':'あと'+Math.max(0,8-a.draws.length)+'球');}};
const oldResult=renderRoundResult;renderRoundResult=function(a){
 oldResult(a);if(!a.result)return;
 const row=$('result-games').querySelector('[data-game-index="'+id+'"]');if(!row||row.dataset.stick===String(a.token))return;
 row.dataset.stick=String(a.token);
 row.querySelector('.result-game-name').innerHTML=game.name+' <small>'+(a.enabled[id]?num(a.locked[id])+' BET':'NO BET')+'</small>';
 const s=engine.state,breakdown=[8,7,6,5].filter(n=>s.counts[n]).map(n=>n+'マス×'+s.counts[n]+'本').join('・');
 row.querySelector('.result-game-details').textContent=a.enabled[id]?'最長 '+s.longest+'マス ／ '+(breakdown||'成立ラインなし')+' ／ 配置FREE '+s.placedFree.length+'個'+(engine.wonderCollected?' ／ シュガーGET！':''):'参加なし';
};
new ResizeObserver(()=>{lastMain=-Infinity;wake();}).observe(slot.panel);
document.addEventListener('visibilitychange',()=>{stamp=null;wake();});
window.BingoStick={engine,core:R};engine.reset();select(active);
})();

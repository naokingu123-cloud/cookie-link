/* 12-board Chocolate Canyon load-test extension.
 * Same 25-number draw and complete independent Canyon engines; only one
 * board uses the existing large Canvas. The other 11 use ~84x148 pixels.
 * Test-board rewards are shown in their cards and are NOT added to CREDIT.
 */
(()=>{
'use strict';
try {
 const TOTAL=12, main=app.engines[1], slot=slots[1];
 if(!main||main.kind!=='choco'||!slot?.panel)throw Error('Canyon engine is not initialized');
 setupChocoSlot(slot);
 const fleet=[{engine:main,latest:{phase:'ready'},elapsed:0,canvas:null,ctx:null,card:null,dirty:true}],state={selected:0,active:true,frames:0,miniMs:0,maxMiniMs:0,logicMs:0,lastFrame:0,fps:0,allNumbers:[],generation:0,ready:false};
 const gallery=document.createElement('section');gallery.className='canyon-fleet';gallery.setAttribute('aria-label','チョコレートキャニオン12面同時抽選・負荷テスト');
 gallery.innerHTML='<div class="canyon-fleet-head"><strong>🍫 キャニオン 12面同時抽選テスト</strong><span class="canyon-fleet-perf" aria-live="off">準備中</span><button class="canyon-fleet-toggle" type="button" aria-pressed="true">12面 ON</button></div><div class="canyon-fleet-grid"></div><p class="canyon-fleet-note">12面とも同じ抽選番号を使用。各盤面は独立して掘削・落下・スクロールします。追加11面のWINは負荷テスト表示のみで、CREDITへの加算対象外です。</p>';
 const grid=gallery.querySelector('.canyon-fleet-grid'),perf=gallery.querySelector('.canyon-fleet-perf'),toggle=gallery.querySelector('.canyon-fleet-toggle');
 const surface=slot.panel.querySelector('.choco-surface');surface?.before(gallery);
 const phaseNames={ready:'準備',waiting:'次球待ち',settled:'着地',complete:'終了',error:'エラー',canyonDrill:'掘削',canyonFall:'落下',canyonScroll:'上昇',canyonMelt:'溶解',canyonSoften:'ひび',canyonUpgrade:'LvUP',canyonCollect:'GET',canyonBonus:'BONUS',canyonNumberRenew:'番号更新',canyonAll:'全ドリル',canyonPower:'ケーキ'};
 function entryAt(i){return fleet[i]}
 function onGhost(i,ev,e){
  const f=entryAt(i);if(!f)return;
  f.latest=ev;f.dirty=true;
  if(state.active&&state.selected===i){
   slot.engine=e;chocoEvent(slot,ev,e,app);
  }
 }
 for(let i=1;i<TOTAL;i++){
  const id=i;
  const e=new ChocoDigEngine({random:Math.random,speed:app.speed,colorCount:app.colorCount,sleep:ms=>new Promise(ok=>setTimeout(ok,ms)),onEvent:(ev,engine)=>onGhost(id,ev,engine)});
  fleet.push({engine:e,latest:{phase:'ready'},elapsed:0,canvas:null,ctx:null,card:null,dirty:true});
 }
 function winFor(e){return medalWin(app.bet(1),e.totalHundredths);}
 function selectBoard(i){
  if(i<0||i>=TOTAL)return;
  state.selected=i;const e=fleet[i].engine;
  slot.engine=e;slot.chocoWinVersion=null;slot.chocoDepthVersion=null;slot.chocoBgVersion=null;slot.chocoBgSmoothVersion=null;
  slot.chocoReachKey=null;slot.reachStatus='inactive';slot.reachEpoch=(slot.reachEpoch||0)+1;
  slot.chocoTime=0;slot.chocoClockStamp=null;
  for(let j=0;j<TOTAL;j++)fleet[j].card.classList.toggle('is-selected',j===i);
  slot.dirtyMain=true;slot.catchUp=true;
  if(active===1&&state.active){
   const phase=e.fx?.phase|| (app.phase==='ready'?'ready':e.phase||'waiting');
   chocoEvent(slot,{phase},e,app);chocoQueueFrame(slot);
  }
  scheduleUI(app);
 }
 for(let i=0;i<TOTAL;i++){
  const f=fleet[i],button=document.createElement('button');button.type='button';button.className='canyon-fleet-card'+(i===0?' is-selected':'');button.setAttribute('aria-label','キャニオン'+(i+1)+'番盤面・選択で拡大');
  button.innerHTML='<span class="canyon-fleet-card-head"><b>'+(i+1)+'番</b><em class="canyon-fleet-sugar">◇</em></span><canvas width="84" height="148" aria-hidden="true"></canvas><span class="canyon-fleet-win">0 WIN</span><span class="canyon-fleet-depth">0 m · 準備</span><small class="canyon-fleet-reach">候補 —</small>';
  button.addEventListener('click',()=>selectBoard(i));grid.append(button);
  f.card=button;f.canvas=button.querySelector('canvas');f.ctx=f.canvas.getContext('2d',{alpha:false});f.ctx.imageSmoothingEnabled=false;
  f.win=button.querySelector('.canyon-fleet-win');f.depthEl=button.querySelector('.canyon-fleet-depth');f.sugar=button.querySelector('.canyon-fleet-sugar');f.reach=button.querySelector('.canyon-fleet-reach');
 }
 // The nonselected canvas is a low-res view of the SAME engine timeline.
 const colors=['#eee6c4','#e7a7b4','#af785a','#583a30','#e3b161'],edges=['#fff6d9','#ffe1e8','#e8a67d','#9b6e50','#fae9b2'];
 function paintMini(f,now){
  const x=f.ctx,e=f.engine,fx=e.fx,phase=fx?.phase||f.latest?.phase||'ready',width=84,height=148,top=14,cell=9.65,left=(width-cell*7)/2;
  const changed=f.fx!==fx;if(changed){f.fx=fx;f.elapsed=0;f.fxStamp=now;}
  if(f.fxStamp==null)f.fxStamp=now;
  const dt=Math.min(230,Math.max(0,now-f.fxStamp));f.fxStamp=now;
  if(!app.paused&&!document.hidden&&!e.paused&&fx)f.elapsed+=dt;
  const q=fx?.ms?Math.min(1,Math.max(f.elapsed,fx.elapsed||0)/fx.ms):1;
  const falling=phase==='canyonFall',scroll=phase==='canyonScroll'?fx:fx?.scroll;
  const g=(falling||phase==='canyonMelt'||phase==='canyonSoften'||phase==='canyonDrill'||scroll)&&fx?.before?fx.before:e.strata;
  const moving=new Map((falling?(fx?.moves||[]):[]).map(m=>[m.id,m]));
  const dissolving=new Set((phase==='canyonMelt'?fx?.targets||[]:[]).map(v=>v.tile?.id));
  x.fillStyle='#251d25';x.fillRect(0,0,width,height);
  x.fillStyle='#39252b';x.fillRect(left-2,top-1,7*cell+4,12*cell+2);
  x.save();x.beginPath();x.rect(left,top,cell*7,cell*12);x.clip();
  for(let r=0;r<g.length;r++)for(let c=0;c<(g[r]?.length||0);c++){
   const t=g[r][c];if(!t)continue;
   const move=moving.get(t.id),shift=scroll?.advanced?scroll.advanced*(q*q*(3-2*q)):0;
   const yr=move?move.from[0]+(move.to[0]-move.from[0])*q*q:r;
   const px=left+c*cell,py=top+(yr-shift)*cell;
   if(py+cell<top-1||py>top+12*cell+1)continue;
   x.globalAlpha=dissolving.has(t.id)?1-q:1;
   const color=Math.max(0,Math.min(4,t.color));
   if(t.color<0){
    x.fillStyle=t.item==='sugar'?'#cf7eff':t.item==='ore'?'#ffda72':'#eaa1b5';
    x.fillRect(px+1,py+1,cell-2,cell-2);
    x.fillStyle=t.item==='sugar'?'#fff':'#704527';x.fillRect(px+3,py+2,cell-6,cell-5);
   }else{
    x.fillStyle=colors[color];x.fillRect(px+.3,py+.3,cell-.6,cell-.6);
    x.fillStyle=edges[color];x.fillRect(px+.9,py+.9,cell-1.8,1.25);
    if(t.encased||t.item==='ore'){
     x.fillStyle='#fff1bd';x.fillRect(px+3,py+2,cell-6,cell-5);
    }
   }
   x.globalAlpha=1;
  }
  x.restore();
  // Miniature drill indicators: 7 top drills and their level.
  for(let c=0;c<7;c++){
   const d=e.drills?.[c],lv=d?.level||1;
   x.fillStyle=['','#7187a0','#bd8664','#d2dce4','#ffd258','#84ecff'][Math.max(1,Math.min(5,lv))];x.fillRect(left+c*cell+1,2,cell-2,8);
   x.fillStyle='#271f2a';x.font='bold 6px monospace';x.textAlign='center';x.fillText(String(d?.numbers?.[0]??''),left+(c+.5)*cell,8);
  }
  x.fillStyle='#f6d9a4';x.font='bold 7px monospace';x.textAlign='center';x.fillText(e.depth+'m',width/2,145);
  // A small glint marks the sugar when it is present in the mine.
  if(e.wonderCollected)x.fillStyle='#de95ff';
  if(e.wonderCollected)x.fillRect(width-8,2,5,5);
  f.dirty=false;
 }
 function updateCard(f){
  const e=f.engine,win=winFor(e),sugar=e.wonderCollected?'◆':'◇';
  const w=win.toLocaleString('ja-JP')+' WIN';
  if(f.win.textContent!==w)f.win.textContent=w;
  f.sugar.textContent=sugar;f.sugar.classList.toggle('is-collected',!!e.wonderCollected);
  const line=(e.depth||0)+'m · '+(phaseNames[e.fx?.phase||f.latest?.phase]||e.digMessage?.slice(0,5)||'処理中');
  if(f.depthEl.textContent!==line)f.depthEl.textContent=line;
  if(!f.lastReachKey||f.lastReachKey!==e.version+'/'+e.processed+'/'+e.depth){
   f.lastReachKey=e.version+'/'+e.processed+'/'+e.depth;
   const assigned=[...(e.drills||[]).map(d=>d.numbers?.[0]),...(e.lucky?.numbers||[])].filter(n=>Number.isInteger(n)&&!e.drawn?.has(n)).slice(0,3);
   f.reach.textContent='ドリル候補 '+(assigned.join('・')||'—');
  }
 }
 let lastDraw=0,lastPerf=0,frames=0,drawWork=0,peak=0;
 function frame(now){
  if(!gallery.isConnected)return;
  if(document.hidden||!inView||!state.active){setTimeout(()=>requestAnimationFrame(frame),250);return;}
  const step=active===1?85:200;
  if(now-lastDraw>=step){
   lastDraw=now;const start=performance.now();
   for(let i=0;i<TOTAL;i++){const f=fleet[i];if(!f?.engine)continue;paintMini(f,now);updateCard(f);}
   const duration=performance.now()-start;drawWork+=duration;peak=Math.max(peak,duration);frames++;
   if(now-lastPerf>=1200){
    state.fps=frames*1000/Math.max(1,now-lastPerf);state.miniMs=drawWork/Math.max(1,frames);state.maxMiniMs=peak;
    perf.textContent='小盤面 '+state.fps.toFixed(1)+'fps / 描画 '+state.miniMs.toFixed(1)+'ms (最大'+peak.toFixed(1)+'ms) / '+TOTAL+'面';
    lastPerf=now;frames=0;drawWork=0;peak=0;
   }
  }
  requestAnimationFrame(frame);
 }
 for(const f of fleet)updateCard(f);
 const originalOnEvent=app.onEvent;
 app.onEvent=function(i,ev,e,a){
  if(i===1){
   fleet[0].latest=ev;fleet[0].dirty=true;
   if(state.active&&state.selected!==0){if(ev.phase==='complete')recordChanged(a);return;}
  }
  return originalOnEvent.call(this,i,ev,e,a);
 };
 const originalStart=app.start;
 app.start=function(...args){
  const shouldStart=state.active&&this.phase==='ready'&&this.bets[1]>0&&this.drawSource?.ready!==false;
  if(shouldStart)for(let i=1;i<TOTAL;i++){const e=fleet[i].engine;e.roundBet=this.bets[1];e.paused=this.paused;e.start();}
  const result=originalStart.apply(this,args);
  if(!result&&shouldStart)for(let i=1;i<TOTAL;i++)fleet[i].engine.reset({keepWonder:false,keepHammers:false});
  return result;
 };
 const originalNumber=app.acceptNumber;
 let forwarding=[];
 app.acceptNumber=function(n,...args){
  const result=originalNumber.call(this,n,...args);
  if(result&&state.active&&this.enabled[1]){
   const token=this.token;
   // Stagger each Canyon plan to avoid 11 synchronous CPU spikes.
   for(let i=1;i<TOTAL;i++){
    const engine=fleet[i].engine;
    setTimeout(()=>{if(this.token!==token||!state.active)return;engine.previewDraw(n);engine.enqueueBatch([n]);},i*6);
   }
  }
  return result;
 };
 const originalPause=app.pause;
 app.pause=function(value){const res=originalPause.call(this,value);for(let i=1;i<TOTAL;i++)fleet[i].engine.paused=value;return res;};
 const originalPrepare=app.prepare;
 app.prepare=function(...args){
  const res=originalPrepare.apply(this,args);
  for(let i=1;i<TOTAL;i++){fleet[i].engine.reset({keepWonder:true,keepHammers:false});fleet[i].engine.paused=this.paused;}
  if(state.selected!==0)selectBoard(state.selected);
  return res;
 };
 toggle.addEventListener('click',()=>{
  state.active=!state.active;toggle.textContent=state.active?'12面 ON':'12面 OFF';toggle.setAttribute('aria-pressed',String(state.active));
  gallery.classList.toggle('is-disabled',!state.active);
  if(!state.active){for(let i=1;i<TOTAL;i++)fleet[i].engine.paused=true;selectBoard(0);}
  else{for(let i=1;i<TOTAL;i++)fleet[i].engine.paused=app.paused;}
 });
 window.cookieCanyon12={
  get state(){return {enabled:state.active,selected:state.selected+1,fps:state.fps,miniDrawMs:state.miniMs,peakMiniDrawMs:state.maxMiniMs,boards:fleet.map((f,i)=>({index:i+1,depth:f.engine.depth,win:winFor(f.engine),processed:f.engine.processed,busy:f.engine.busy,sugar:f.engine.wonderCollected}))};},
  select:selectBoard
 };
 lastPerf=performance.now();requestAnimationFrame(frame);
 state.ready=true;
 console.info('[Canyon12] 12 independently simulated Canyon boards initialized');
}catch(error){console.error('[Canyon12] experimental extension disabled:',error);}
})();
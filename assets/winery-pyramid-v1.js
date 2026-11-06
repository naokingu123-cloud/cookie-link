/* Winery Pyramid v78: animated MIX ODDS UP precedes payout filling. */
(()=>{
'use strict';
if(window.WineryPyramid?.installed)return;
const K=window.WineryPyramidCore;
const mount=window.SweetsLineup.ids.indexOf('winery');
if(!K||typeof app==='undefined'||!app||!slots?.[mount])throw Error('Winery host is not ready');
if(app.phase!=='ready')throw Error('Install Winery only between games');
const S=slots[mount],oldEngine=app.engines[mount];
const rowWin=(bet,n,mix)=>medalWin(bet,Math.round(Math.round(K.PAY[n]*100)*(10+mix)/10));
let engine,frame=0,clock=0,stamp=0,miniKey='',uiKey='',lastPaint=0;
const style=document.createElement('link');style.rel='stylesheet';style.href='assets/winery-pyramid-v1.css?v=56';document.head.appendChild(style);const luxuryStyle=document.createElement('link');luxuryStyle.rel='stylesheet';luxuryStyle.href='assets/winery-pyramid-luxury-v56.css?v=56';document.head.appendChild(luxuryStyle);const sweetsStyle=document.createElement('link');sweetsStyle.rel='stylesheet';sweetsStyle.href='assets/winery-pyramid-sweets-v57.css?v=57';document.head.appendChild(sweetsStyle);const riverStyle=document.createElement('link');riverStyle.rel='stylesheet';riverStyle.href='assets/winery-pyramid-juice-river-v58.css?v=58';document.head.appendChild(riverStyle);const premiumStyle=document.createElement('link');premiumStyle.rel='stylesheet';premiumStyle.href='assets/winery-pyramid-premium-v59.css?v=59';document.head.appendChild(premiumStyle);const rasterStyle=document.createElement('link');rasterStyle.rel='stylesheet';rasterStyle.href='assets/winery-pyramid-raster-v60.css?v=60';document.head.appendChild(rasterStyle);const refineStyle=document.createElement('link');refineStyle.rel='stylesheet';refineStyle.href='assets/winery-pyramid-refine-v61.css?v=61';document.head.appendChild(refineStyle);const riverStyle62=document.createElement('link');riverStyle62.rel='stylesheet';riverStyle62.href='assets/winery-pyramid-river-v62.css?v=62';document.head.appendChild(riverStyle62);const teaStyle=document.createElement('link');teaStyle.rel='stylesheet';teaStyle.href='assets/winery-pyramid-afternoon-v63.css?v=63';document.head.appendChild(teaStyle);const polishStyle=document.createElement('link');polishStyle.rel='stylesheet';polishStyle.href='assets/winery-pyramid-polish-v64.css?v=64';document.head.appendChild(polishStyle);const liquidStyle=document.createElement('link');liquidStyle.rel='stylesheet';liquidStyle.href='assets/winery-pyramid-liquid-v65.css?v=65';document.head.appendChild(liquidStyle);const adjustStyle=document.createElement('link');adjustStyle.rel='stylesheet';adjustStyle.href='assets/winery-pyramid-adjust-v66.css?v=66';document.head.appendChild(adjustStyle);
const scene=document.createElement('div');scene.className='wp-scene';
scene.innerHTML='<canvas class="wp-canvas" width="780" height="900" aria-label="6段21個のワイングラス"></canvas>'+
 '<aside class="wp-sidebar">'+
 '<div class="wp-power">'+
   '<div class="wp-boost-heading">✦ 注入量UP ✦</div>'+
   '<div class="wp-power-next"><small>次の注入量</small><b>1杯</b></div>'+
   '<div class="wp-boost-ladder">'+[1,2,4,8,16].map(n=>
     '<span class="wp-boost-stage" data-power="'+n+'">'+n+'杯</span>').join('')+'</div>'+
   '<div class="wp-boost-caption">HITで次から2倍に！</div>'+
   '<div class="wp-boost-numbers">'+Array.from({length:4},(_,i)=>
     '<span class="wp-boost-number" data-index="'+i+'">?</span>').join('')+'</div></div>'+
 '<div class="wp-score"><span>満タン</span><strong>0 / 21</strong><small class="wp-sugar-summary">✦12杯</small></div>'+
 '<div class="wp-pay-fixed"><span>配当</span><small class="wp-total-poured">注 0杯</small><b class="wp-score-mini">0/21</b></div>'+
 '<div class="wp-pay-window"><div class="wp-pay-juice-reservoir" aria-hidden="true"><div class="wp-pay-juice-level"></div></div><div class="wp-pay-pour-stream" aria-hidden="true"></div><div class="wp-pay-track">'+Array.from({length:12},(_,i)=>21-i).map(n=>'<div class="wp-pay-row" data-full="'+n+'"><span>'+n+'杯</span><small class="wp-sugar-mark"></small><b>0WIN</b></div>').join('')+'</div></div>'+
 '<div class="wp-mix"><span>MIX <i>0</i>杯</span><small class="wp-odds-up-label">ODDS UP</small><b>×1.0</b></div>'+
 '</aside>'+
 '<div class="wp-message" hidden></div>';
S.panel.appendChild(scene);
// Decoration only — no game quantities, numbers, or glasses are baked into the tray.
scene.classList.add('wp-afternoon-v63');
scene.classList.add('wp-odds-v78');
const oddsStyle=document.createElement('style');
oddsStyle.textContent=`
body.winery-enabled #panel1 .wp-scene.wp-afternoon-v63.wp-odds-v78 .wp-sidebar{
grid-template-rows:minmax(16px,auto) 20px minmax(0,1fr) 74px!important}
body.winery-enabled #panel1 .wp-scene.wp-afternoon-v63.wp-odds-v78 .wp-mix{
display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;
height:74px!important;min-height:0!important;max-height:none!important;flex:none!important;gap:2px!important;padding:4px 2px!important}
body.winery-enabled #panel1 .wp-scene.wp-afternoon-v63.wp-odds-v78 .wp-mix .wp-odds-up-label{
display:block!important;font:1000 clamp(9px,1.55vw,14px)/1.06 system-ui,sans-serif!important;
letter-spacing:.1em!important;color:#fff5bc!important;text-shadow:0 0 5px #ffdaac,0 1px 1px #63274d!important}
body.winery-enabled #panel1 .wp-scene.wp-afternoon-v63.wp-odds-v78 .wp-mix b{
font-size:clamp(19px,3.3vw,30px)!important;line-height:1.02!important}
body.winery-enabled #panel1 .wp-scene.wp-odds-v78.wp-odds-animating .wp-mix{
box-shadow:inset 0 0 10px #fff4c49a,0 0 11px #ffcf9cbd!important}
body.winery-enabled #panel1 .wp-scene.wp-odds-v78.wp-odds-animating .wp-odds-up-label,
body.winery-enabled #panel1 .wp-scene.wp-odds-v78.wp-odds-animating .wp-pay-row b{
animation:wp-odds-up-glow-v78 .42s ease-in-out infinite alternate!important}
@keyframes wp-odds-up-glow-v78{from{filter:brightness(1)}to{filter:brightness(1.65)}}
@media(max-width:480px){
body.winery-enabled #panel1 .wp-scene.wp-afternoon-v63.wp-odds-v78 .wp-sidebar{
grid-template-rows:14px 17px minmax(0,1fr) 55px!important}
body.winery-enabled #panel1 .wp-scene.wp-afternoon-v63.wp-odds-v78 .wp-mix{
height:55px!important;gap:1px!important;padding:2px 1px!important}
body.winery-enabled #panel1 .wp-scene.wp-afternoon-v63.wp-odds-v78 .wp-mix .wp-odds-up-label{
font-size:9px!important;letter-spacing:.05em!important}
body.winery-enabled #panel1 .wp-scene.wp-afternoon-v63.wp-odds-v78 .wp-mix b{font-size:19px!important}}
@media(prefers-reduced-motion:reduce){
body.winery-enabled #panel1 .wp-scene.wp-odds-v78.wp-odds-animating .wp-odds-up-label,
body.winery-enabled #panel1 .wp-scene.wp-odds-v78.wp-odds-animating .wp-pay-row b{animation:none!important}}`;
document.head.appendChild(oddsStyle);

const teaStand=new Image();
teaStand.className='wp-tea-stand';teaStand.decoding='async';teaStand.alt='';
teaStand.onload=()=>{scene.classList.add('wp-tea-loaded');miniKey='';lastPaint=0;queueFrame();};
teaStand.onerror=()=>{scene.classList.remove('wp-tea-loaded');console.warn('[Winery] Afternoon-tea stand not loaded; game remains playable.');};
teaStand.src='assets/winery-afternoon-stand-v63.webp?v=63';
scene.insertBefore(teaStand,scene.querySelector('.wp-canvas'));
// Move the 1/2/4/8/16 boost cabinet into the free upper-left region.
const boostPanel=scene.querySelector('.wp-power');
boostPanel.classList.add('wp-power-left');
scene.appendChild(boostPanel);
// Right-side single amount indicator; leaves room for the full fixed payout chart.
const payoutSidebar=scene.querySelector('.wp-sidebar');
const amountGauge=document.createElement('div');
amountGauge.className='wp-amount-gauge';
amountGauge.setAttribute('role','status');
amountGauge.setAttribute('aria-label','次に注ぐジュースの量');
amountGauge.innerHTML='<div class="wp-amount-gauge-header"><span>次の注入量</span><strong class="wp-volume-number">1杯</strong></div>'+
 '<div class="wp-amount-tube"><div class="wp-amount-fill"></div><div class="wp-amount-gloss"></div></div>'+
 '<div class="wp-amount-markers">'+[1,2,4,8,16].map(n=>'<small data-amount="'+n+'">'+n+'</small>').join('')+'</div>';
boostPanel.querySelector('.wp-power-next')?.remove();
boostPanel.insertBefore(amountGauge,boostPanel.querySelector('.wp-boost-ladder'));
// No redundant Winery / Juice Round / Next Juice headers inside the board.
const canvas=scene.querySelector('canvas'),ctx=canvas.getContext('2d');
 // The background is an independent SVG behind both transparent canvases.
 // Liquids/flows go into the lower canvas; gold-rimmed faceted glasses, badge
 // numbers and reach FX are painted into the upper canvas.
 const liquidCanvas=document.createElement('canvas');
 liquidCanvas.className='wp-liquid-layer';
 liquidCanvas.width=1130;liquidCanvas.height=636;
 canvas.width=1130;canvas.height=636;
 scene.insertBefore(liquidCanvas,canvas);
 // Decorative darkness stays BEHIND the live juice canvas. The fruit
 // waterfalls, live liquids, crystal glass and number badges remain sharp.
 const standContrast=document.createElement('div');
 standContrast.className='wp-stand-contrast-v71';
 standContrast.setAttribute('aria-hidden','true');
 scene.insertBefore(standContrast,liquidCanvas);
 const liquidCtx=liquidCanvas.getContext('2d');
 scene.classList.add('wp-premium-ready');
// The ordinary MENU debug payout rate is the single authority for all games.
// Winery no longer places a duplicate slider on the live 21-glass board.
const menuPayoutInput=document.getElementById('debug-payout-rate');
const menuPayoutApply=document.getElementById('debug-payout-apply');
const readMenuPayout=()=>{
 const n=Number(menuPayoutInput?.value);
 return Number.isInteger(n)&&n>=50&&n<=150?n:90;
};
const fullFx=new Map();
const header=S.tab.querySelector('.tab-game-name');
header.innerHTML='<span class="wp-tab-logo"><img class="wp-tab-logo-img" src="assets/winery-pyramid-tab-art-v51.webp?v=52" alt="ワイナリーピラミッド" decoding="async"><b class="wp-fallback">ワイナリー<br>ピラミッド</b></span>';
const wineryLogo=header.querySelector('.wp-tab-logo');
const wineryImage=wineryLogo.querySelector('.wp-tab-logo-img');
wineryImage.onload=()=>wineryLogo.classList.add('is-art-ready');
wineryImage.onerror=()=>{wineryImage.hidden=true;wineryLogo.classList.remove('is-art-ready');};
if(wineryImage.complete&&wineryImage.naturalWidth)wineryLogo.classList.add('is-art-ready');
header.setAttribute('aria-label','ワイナリーピラミッド');S.tab.setAttribute('aria-label','ワイナリーピラミッド');
S.panel.classList.add('wp-panel');S.holder.classList.add('wp-slot');S.tab.classList.add('wp-tab');
S.holder.classList.remove('choco-slot');S.tab.classList.remove('choco-tab');S.panel.classList.remove('choco-panel');
if(S.chocoFrame)cancelAnimationFrame(S.chocoFrame);S.chocoFrame=0;
S.tabDepth?.remove();
oldEngine.running=false;oldEngine.version++;oldEngine.queue=[];
// Preserve engine indices used by shared credit, draws, JPC and input controls.
document.body.classList.add('winery-enabled');
for(const id of ['canyon-debug-depth','canyon-depth-apply']){const x=document.getElementById(id);if(x){x.disabled=true;x.title='ワイナリーピラミッドでは使用しません';}}
const depthStatus=document.getElementById('canyon-depth-status');if(depthStatus)depthStatus.textContent='ワイナリーピラミッドに切替済み';
function signal(text){const el=scene.querySelector('.wp-message');el.textContent=text;el.hidden=false;clearTimeout(signal.timer);signal.timer=setTimeout(()=>el.hidden=true,1600);}
function event(ev,e){
 S.engine=e;S.event=ev;S.dirtyMain=true;S.dirtyMini=true;
 if(ev.phase==='wineryAward')for(const index of ev.justFilled||[])fullFx.set(index,clock);
 if(ev.phase==='stepcollect'&&app.phase==='playing'&&app.enabled[mount]){
   app.wonderBank.push(...ev.steps.map(step=>({...step,game:mount})));
   app.wonderSteps=app.wonderBank.length;
   app.wonderValue+=ev.steps.reduce((sum,step)=>sum+step.value,0);
 }
 if(ev.phase==='sugaraward'){
   signal('✦ WONDER SUGAR GET!');
   if(typeof showSugarAward==='function')showSugarAward(S,ev.steps);
 }
 if(ev.phase==='ready'){
  fullFx.clear();
  S.reachEpoch=(S.reachEpoch||0)+1;S.reachBoardKey=null;S.reachStatus='inactive';S.reachResults=[];S.tabReachResults=[];
  miniKey='';uiKey='';scene.querySelector('.wp-message').hidden=true;
 }
 if(ev.phase==='wineryBoost')signal('次から '+ev.power+'杯注入！');
 if(ev.phase==='wineryAllFull'){
  signal('全満！ 21 / 21');
  if(typeof announceAchievement==='function')announceAchievement('ワイナリーピラミッド　全満達成！');
  if(active===mount&&typeof sceneSound==='function')sceneSound('allclear',{volume:.8});
 }
 if(ev.phase==='complete'&&app.phase==='playing'&&!app.paid[mount]&&app.enabled[mount]){
  app.paid[mount]=true;app.roundWins[mount]=medalWin(app.locked[mount],e.totalHundredths);
  if(app.enabled.every((enabled,i)=>!enabled||app.paid[i]))app.finishRound();
 }
 if(ev.phase==='error'){
  signal('エラー：'+ev.message);app.phase='error';app.token++;app.dealing=false;app.drawSource?.pause(true);
 }
 if(['waiting','settled','complete'].includes(ev.phase))wineryReach(S,e,app);
 queueFrame();scheduleUI(app);
 if(ev.phase==='complete'&&typeof recordChanged==='function')recordChanged(app);
}
engine=new K.WineryEngine({random:app.random,sleep:app.sleep,speed:app.speed,onEvent:event});
app.engines[mount]=engine;S.engine=engine;
engine.setPayoutTarget(readMenuPayout());
function syncMenuPayout(){
 const target=readMenuPayout();
 if(engine.payoutTarget===target)return;
 if(!engine.running&&app.phase==='ready'){
  engine.setPayoutTarget(target);
  miniKey='';uiKey='';S.dirtyMain=S.dirtyMini=true;
  signal('ワイナリー配当率 '+target+'%・初期盤面を更新');
 }else{
  // A current 8-ball draw must never change probability or displayed rewards
  // mid-round. The engine's configured target takes effect on its next reset.
  engine.payoutTarget=target;
 }
}
menuPayoutApply?.addEventListener('click',syncMenuPayout);
// Settle the final 21-glass board, calculate eighth-ball reach options,
 // and display the same standard 600ms post-game preview as other tabs.
 engine.beforeComplete=token=>finishGamePresentation(S,engine,app,token);
const emptySugar=S.tabSugar;if(emptySugar)emptySugar.hidden=false;
function stable(e){
 const final=e.processed===8&&['settled','complete'].includes(e.phase);
 const live=e.processed>0&&e.processed<8&&e.running;
 return (live||final)&&!e.queue.length&&e.accepted===e.processed&&
        ['waiting','settled','complete'].includes(e.phase);
}
function wineryReach(s,e,a){
 const context=typeof reachContext==='function'?reachContext(e,a):null;
 if(!context||!stable(e)||a.bet(mount)<=0){s.reachStatus='inactive';s.reachResults=[];s.tabReachResults=[];s.reachBoardKey=null;return;}
 if(s.reachBoardKey===context.key&&s.reachStatus==='ready')return;
 s.reachEpoch=(s.reachEpoch||0)+1;s.reachBoardKey=context.key;
 const results=e.nodeNumbers.filter(n=>!e.seen.has(n))
  .map(n=>e.predict(n)).filter(p=>p.gain>0||p.oddsUp);
 results.sort((a,b)=>a.number-b.number);s.reachResults=results;s.tabReachResults=results;
 s.tabReachBase=e.totalHundredths;s.tabReachVersion=e.version;s.reachStatus='ready';s.reachAfterBall=e.processed;
}
// The playable cups and their fills are drawn over the generated riverscape.
const DRAW_W=1672,DRAW_H=941;
const premiumPos=i=>{const {r,c}=K.CELLS[i];return {x:748+(c-r/2)*141,y:110+r*136+[0,0,1,1,2,2][r]};};
// The same spacing and zoom keep the six bottom cups separated at both scales.
const WP_MAIN_CUP_ZOOM=1.07,WP_MAIN_X_SPREAD=1.05;
function spreadMainGlasses(x){
 x.translate(748,0);x.scale(WP_MAIN_X_SPREAD,1);x.translate(-748,0);
}
function zoomMainGlass(x,i){
 const p=premiumPos(i);
 x.save();x.translate(p.x,p.y);x.scale(WP_MAIN_CUP_ZOOM,WP_MAIN_CUP_ZOOM);
 x.translate(-p.x,-p.y);
}
let rasterCupReady=false;
const rasterBackground=new Image();
rasterBackground.decoding='async';
rasterBackground.onload=()=>{scene.classList.add('wp-raster-ready','wp-clean-ready');miniKey='';uiKey='';lastPaint=0;queueFrame();};
rasterBackground.onerror=()=>console.info('[Winery v61] Clean photo scenery is not uploaded; bundled fruit river scene stays usable.');
rasterBackground.src='assets/winery-juice-world-clean-v61.webp?v=61';
const riverPhoto=new Image();
riverPhoto.decoding='async';
riverPhoto.onload=()=>{
 scene.classList.add('wp-river-v62-ready');
 miniKey='';lastPaint=0;queueFrame();
};
riverPhoto.onerror=()=>console.info('[Winery v62] New strawberry-orange background is awaiting upload: assets/winery-juice-river-v62.webp');
riverPhoto.src='assets/winery-juice-river-v62.webp?v=62';
const rasterCup=new Image();
rasterCup.decoding='async';
rasterCup.onload=()=>{rasterCupReady=true;miniKey='';lastPaint=0;queueFrame();};
rasterCup.onerror=()=>console.info('[Winery v61] Ornate photo glass unavailable; transparent vector remains.');
rasterCup.src='assets/winery-crystal-coupe-v60.png?v=60';
 // The already-published v56 artwork is a gold-reflection texture source,
 // not the scene background. It never controls numbers or actual liquid fills.
 const photoHighlights=new Image();
 let photoReady=false;
 photoHighlights.decoding='async';
 photoHighlights.onload=()=>{photoReady=true;miniKey='';lastPaint=0;queueFrame();};
 photoHighlights.onerror=()=>{photoReady=false;};
 photoHighlights.src='assets/winery-luxury-screen-v56.webp?v=56';
function premiumClip(x,cx,cy){
 x.beginPath();
 x.moveTo(cx-54,cy+8);
 x.bezierCurveTo(cx-51,cy+36,cx-31,cy+70,cx,cy+80);
 x.bezierCurveTo(cx+31,cy+70,cx+51,cy+36,cx+54,cy+8);
 x.closePath();
}
function premiumJuice(x,i,g,t,activePour=false){
 const {x:cx,y:cy}=premiumPos(i);
 x.save();premiumClip(x,cx,cy);x.clip();
 // A clean transparent glass, with no baked red liquid or white opaque wipe.
 const clear=x.createLinearGradient(cx-56,cy+7,cx+56,cy+80);
 clear.addColorStop(0,'rgba(220,245,255,.20)');
 clear.addColorStop(.52,'rgba(255,246,231,.10)');
 clear.addColorStop(1,'rgba(175,201,239,.19)');
 x.fillStyle=clear;x.fillRect(cx-60,cy+8,120,75);
 if(g&&g.volume>0){
  let filled=0;
  for(let k=0;k<g.layers.length;k++){
   const l=g.layers[k],amt=Math.max(0,Math.min(1,l.amount));
   if(amt<1e-6)continue;
   const f=K.FLAVORS[l.flavor]||K.FLAVORS[5],lower=cy+80-Math.min(1,filled)*70;
   filled+=amt;
   const top=cy+80-Math.min(1,filled)*70;
   const liquid=x.createLinearGradient(cx-55,top,cx+55,lower);
   if(l.flavor===5){
    // Initial white juice must also be visibly filled.
    liquid.addColorStop(0,'#fffef2');
    liquid.addColorStop(.28,'#aedce9');
    liquid.addColorStop(.53,'#fff7dd');
    liquid.addColorStop(1,'#8ebbd9');
   }else{
    liquid.addColorStop(0,f.light);liquid.addColorStop(.20,f.color);
    liquid.addColorStop(.62,f.color);liquid.addColorStop(1,f.light);
   }
   x.globalAlpha=l.flavor===5?.94:.99;
   x.fillStyle=liquid;x.beginPath();x.moveTo(cx-60,lower+3);x.lineTo(cx-60,top);
   // Active pour: visible ripples; waiting/settled: slower perpetual waves.
   // Both fill polygon and meniscus use the SAME height profile.
   const amp=(activePour?5.6:2.8)+(k===g.layers.length-1?1.5:.35);
   const waveAt=dx=>
     amp*Math.sin(t*(activePour?.0061:.0024)+i*.49+k*.37+dx*.112)
     +(activePour?1.35:.6)*Math.sin(t*(activePour?.0043:.0014)-dx*.22+i*.17);
   for(let dx=-60;dx<=60;dx+=3){
    x.lineTo(cx+dx,top+waveAt(dx));
   }
   x.lineTo(cx+60,lower+3);x.closePath();x.fill();
   // Crisp meniscus even at 1/4 cup.
   x.globalAlpha=1;x.strokeStyle=l.flavor===5?'#f7ffff':f.light;
   x.lineWidth=activePour?3.5:2.7;
   x.shadowColor=l.flavor===5?'#b7e8ff':f.light;x.shadowBlur=activePour?9:4;
   x.beginPath();
   for(let dx=-54;dx<=54;dx+=3){
    const yy=top+waveAt(dx);
    dx===-54?x.moveTo(cx+dx,yy):x.lineTo(cx+dx,yy);
   }
   x.stroke();x.shadowBlur=0;
   // A travelling surface highlight makes even the idle liquid visibly alive.
   x.strokeStyle=l.flavor===5?'#aee3f3':'#fff8e0';
   x.globalAlpha=activePour?.7:.43;x.lineWidth=1.25;x.beginPath();
   for(let dx=-48;dx<=48;dx+=4){
    const yy=top+waveAt(dx)+6+Math.sin(t*.003+dx*.17+i)*1.3;
    dx===-48?x.moveTo(cx+dx,yy):x.lineTo(cx+dx,yy);
   }
   x.stroke();x.globalAlpha=1;
   // Refraction strip.
   const stripeX=cx-55+((t*.022+i*18+k*31)%110);
   const stripe=x.createLinearGradient(stripeX-12,top,stripeX+12,top);
   stripe.addColorStop(0,'#ffffff00');stripe.addColorStop(.5,'#fffef5b9');
   stripe.addColorStop(1,'#ffffff00');
   x.globalAlpha=.19;x.fillStyle=stripe;
   x.fillRect(cx-58,top,116,Math.max(0,lower-top));
   x.globalAlpha=.63;x.fillStyle='#ffffff';
   for(let n=0;n<4;n++){
    const yy=lower-((t*.024+n*17+i*14+k*11)%Math.max(8,lower-top+8));
    if(yy>top+3&&yy<lower){
     const xx=cx-23+(n*19+i*13+k*9)%46;
     x.beginPath();x.arc(xx,yy,.75+(n%3)*.4,0,Math.PI*2);x.fill();
    }
   }
   x.globalAlpha=1;
  }
 }
 x.restore();
}
function premiumStreams(x,fx,flows,t,withBottle=true){
 if(fx?.type!=='pour')return;
 const f=K.FLAVORS[fx.flavor]||K.FLAVORS[0];
 for(const flow of flows){
  const a=premiumPos(flow.from);
  const b=flow.to>=0?premiumPos(flow.to):{x:a.x,y:896};
  const width=Math.min(10,3.8+Math.sqrt(Math.max(.01,flow.amount))*3);
  x.save();x.lineCap='round';x.lineJoin='round';
  x.shadowColor=f.light;x.shadowBlur=9;
  const flowGrad=x.createLinearGradient(a.x,a.y+80,b.x,b.y+12);
  flowGrad.addColorStop(0,f.light);flowGrad.addColorStop(.38,f.color);flowGrad.addColorStop(1,f.light);
  x.strokeStyle=flowGrad;x.lineWidth=width;x.beginPath();
  x.moveTo(a.x+(b.x<a.x?-12:12),a.y+78);
  x.bezierCurveTo(a.x,a.y+111,b.x,b.y-25,b.x,b.y+12);
  x.stroke();
  x.shadowBlur=0;x.setLineDash([8,11]);x.lineDashOffset=-t*.042;
  x.strokeStyle='#fffce5bb';x.lineWidth=Math.max(1.3,width*.23);x.stroke();x.restore();
 }
 if(!withBottle)return;
 const p=premiumPos(fx.source),bx=Math.min(1160,p.x+73),by=p.y-55;
 x.save();x.translate(bx,by);x.rotate(-.64);
 const bottleGrad=x.createLinearGradient(-20,-28,24,36);
 bottleGrad.addColorStop(0,'#fffef1');bottleGrad.addColorStop(.33,f.light);
 bottleGrad.addColorStop(.65,f.color);bottleGrad.addColorStop(1,'#82466c');
 x.fillStyle=bottleGrad;x.strokeStyle='#fff2bb';x.lineWidth=2.6;
 x.shadowColor='#fff0bb';x.shadowBlur=8;
 x.beginPath();x.moveTo(-9,-36);x.lineTo(9,-36);x.lineTo(9,-19);
 x.quadraticCurveTo(25,-14,24,3);x.lineTo(23,27);
 x.quadraticCurveTo(0,37,-23,27);x.lineTo(-24,3);
 x.quadraticCurveTo(-25,-14,-9,-19);x.closePath();x.fill();x.stroke();
 x.shadowBlur=0;x.fillStyle='#ffedc8';x.fillRect(-17,1,34,17);
 x.font='bold 10px Georgia';x.textAlign='center';x.fillStyle='#80345b';
 x.fillText('JUICE',0,13);x.restore();
 x.save();x.font='bold 23px Georgia';x.textAlign='center';
 x.fillStyle='#fff2c2';x.shadowColor='#7c2f6a';x.shadowBlur=6;
 x.fillText(fx.volume+'杯',bx+30,by-40);x.restore();
}
function paintFullGlassStraw(x,cx,cy,t,fresh){
 // Luminous outer rim ONLY for genuinely full cups.
 x.save();
 const pulse=.5+.5*Math.sin(t*.0062+cx*.013);
 x.shadowColor=fresh?'#fffdd8':'#ffe1a6';
 x.shadowBlur=(fresh?21:12)+7*pulse;
 x.lineWidth=fresh?6:4.6;
 x.strokeStyle=fresh?'#fffde5':'#ffefb2';
 premiumClip(x,cx,cy);x.stroke();
 x.beginPath();x.ellipse(cx,cy+8,55,8,0,0,Math.PI*2);
 x.lineWidth=4;x.stroke();
 x.shadowBlur=0;
 x.globalAlpha=.45+.35*pulse;
 x.lineWidth=1.9;x.strokeStyle='#fff';
 premiumClip(x,cx,cy);x.stroke();
 x.restore();
 // A candy-striped bent straw enters the bowl without obstructing the number.
 x.save();x.lineCap='round';x.lineJoin='round';
 const strawPath=()=>{
  x.beginPath();
  x.moveTo(cx+29,cy+44);
  x.lineTo(cx+47,cy-30);
  x.quadraticCurveTo(cx+50,cy-39,cx+60,cy-39);
 };
 strawPath();x.shadowColor='#fff6d5';x.shadowBlur=fresh?12:7;
 x.strokeStyle='#e8ad55';x.lineWidth=11;x.stroke();
 strawPath();x.shadowBlur=0;
 x.strokeStyle='#fff7df';x.lineWidth=8;x.stroke();
 strawPath();x.strokeStyle='#ec659e';x.lineWidth=5;x.stroke();
 // Pastel white diagonal stripes down the translucent raspberry straw.
 x.strokeStyle='#fff7ee';x.lineWidth=2.6;
 for(let j=0;j<5;j++){
  const y=cy-22+j*13;
  const sx=cx+47-(y-(cy-30))*.245;
  x.beginPath();x.moveTo(sx-3,y-3);x.lineTo(sx+3,y+1);x.stroke();
 }
 x.save();x.fillStyle='#fffbe5';x.shadowColor='#fff9d3';x.shadowBlur=8;
 for(let j=0;j<3;j++){
  const phase=t*.0018+j*2.09+cx*.005;
  const px=cx+Math.cos(phase)*57,py=cy+25+Math.sin(phase)*36;
  const sz=2.7+j*.5;
  x.beginPath();x.moveTo(px,py-sz*2);x.lineTo(px+sz*.32,py-sz*.25);
  x.lineTo(px+sz*2,py);x.lineTo(px+sz*.32,py+sz*.25);
  x.lineTo(px,py+sz*2);x.lineTo(px-sz*.32,py+sz*.25);
  x.lineTo(px-sz*2,py);x.lineTo(px-sz*.32,py-sz*.25);
  x.closePath();x.fill();
 }x.restore();x.restore();
}

const priceTagArt=new Image(),jellyTagSkin=new Image();
let confectionTags;
function cacheConfectionTags(){
 if(priceTagArt.naturalWidth&&jellyTagSkin.naturalWidth){
  const sheet=document.createElement('canvas');sheet.width=400;sheet.height=100;
  const tag=sheet.getContext('2d');tag.drawImage(priceTagArt,0,0,400,100);
  for(let n=0;n<2;n++){
   tag.save();tag.translate(200*n,0);tag.beginPath();tag.roundRect(13,13,156,72,25);tag.clip();
   tag.globalAlpha=.72;tag.drawImage(jellyTagSkin,9,8,169,83);
   tag.fillStyle=n?'#0c5939':'#480fa6';tag.globalCompositeOperation='color';tag.globalAlpha=1;
   tag.fillRect(10,10,166,80);tag.globalCompositeOperation='source-over';
   tag.fillStyle=n?'#082f1bae':'#2c103c9c';tag.fillRect(10,10,166,80);tag.restore();
  }
  confectionTags=sheet;
 }
 miniKey='';lastPaint=0;queueFrame();
}
priceTagArt.onload=jellyTagSkin.onload=cacheConfectionTags;
jellyTagSkin.src='assets/sweet-skins/winery.webp';
priceTagArt.src='assets/winery-tags-v89.webp';
function premiumGlass(x,i,g,t){
 const {x:cx,y:cy}=premiumPos(i);
 const full=g.volume>=1-K.EPS;
 const born=fullFx.get(i),age=born==null?Infinity:t-born;
 const fresh=full&&age>=0&&age<1700;
 x.save();
 if(full){
  const rad=x.createRadialGradient(cx,cy+43,9,cx,cy+43,fresh?92:73);
  rad.addColorStop(0,fresh?'#fff4b9a6':'#fff0b14b');
  rad.addColorStop(1,'#ffffff00');
  x.fillStyle=rad;x.beginPath();x.arc(cx,cy+43,fresh?92:73,0,Math.PI*2);x.fill();
 }
 if(rasterCupReady&&rasterCup.naturalWidth){
  // EXCLUDE the source PNG's printed red juice and digit 1 from the upper
  // glass layer. Preserve photographic gold rim, faceted edge, jewel and foot.
  x.save();x.beginPath();x.rect(cx-74,cy-12,148,147);
  x.moveTo(cx-51,cy+12);
  x.bezierCurveTo(cx-49,cy+37,cx-28,cy+68,cx,cy+77);
  x.bezierCurveTo(cx+28,cy+68,cx+49,cy+37,cx+51,cy+12);
  x.closePath();x.clip('evenodd');
  x.shadowColor='#fff0bc';x.shadowBlur=full?11:5;
  x.drawImage(rasterCup,cx-73,cy-10,146,130);x.restore();
  // Restore a fine transparent-cut crystal edge, never a white opaque disk.
  x.save();x.strokeStyle='#fff9ea';x.lineWidth=2.3;
  x.beginPath();x.moveTo(cx-48,cy+16);
  x.quadraticCurveTo(cx-46,cy+46,cx-20,cy+67);x.stroke();
  x.beginPath();x.moveTo(cx+48,cy+16);
  x.quadraticCurveTo(cx+46,cy+46,cx+20,cy+67);x.stroke();
  x.restore();
 }else{
  // Vector-only safety path: still a crystal coupe rather than an opaque wipe.
  const base=x.createLinearGradient(cx-58,cy,cx+58,cy+84);
  base.addColorStop(0,'#ffffff66');base.addColorStop(.45,'#c6eaff22');base.addColorStop(1,'#fffdf57a');
  premiumClip(x,cx,cy);x.fillStyle=base;x.fill();
  x.strokeStyle='#fffbe0';x.lineWidth=3;x.stroke();
  x.beginPath();x.ellipse(cx,cy+8,55,7,0,0,7);
  x.strokeStyle='#ffe5a0';x.lineWidth=4;x.stroke();
  x.strokeStyle='#fff4cf';x.lineWidth=5;x.beginPath();x.moveTo(cx,cy+80);x.lineTo(cx,cy+120);x.stroke();
  x.beginPath();x.ellipse(cx,cy+126,42,6,0,0,7);x.strokeStyle='#ffeab8';x.lineWidth=4;x.stroke();
 }
 // Bring back the SPECULAR highlights of the beloved original deluxe glasses.
 // The photo is clipped to the silhouette of the coupe, stem and foot. Its
 // backdrop, adjacent glasses, printed numbers and scenery are excluded.
 // Screen blending removes dark photographic tones and reveals live juice below.
 if(photoReady&&!rasterCupReady){
  const {r,c}=K.CELLS[i],oldX=692+(c-r/2)*150,oldY=38+r*133;
  x.save();x.beginPath();
  x.moveTo(cx-65,cy+4);
  x.bezierCurveTo(cx-62,cy+46,cx-31,cy+79,cx,cy+91);
  x.bezierCurveTo(cx+31,cy+79,cx+62,cy+46,cx+65,cy+4);
  x.closePath();
  x.moveTo(cx+8,cy+78);x.lineTo(cx+8,cy+117);
  x.lineTo(cx-8,cy+117);x.lineTo(cx-8,cy+78);x.closePath();
  x.moveTo(cx+43,cy+125);
  x.ellipse(cx,cy+125,43,7,0,0,Math.PI*2);x.closePath();
  x.clip();x.globalAlpha=.44;x.globalCompositeOperation='screen';
  x.drawImage(photoHighlights,oldX-70,oldY-12,140,158,cx-70,cy-16,140,158);
  x.restore();
 }
 if(full)paintFullGlassStraw(x,cx,cy,t,fresh);
 // A full-sized jewelled PRICE TAG hangs below the bowl and never hides juice.
 const badgeY=cy+99;
 x.save();
 x.lineCap='round';
 // Short silk/gold cord connecting the tag to the goblet's stem.
 x.strokeStyle='#fce1a1';x.lineWidth=2.3;
 x.shadowColor='#ffe7bb';x.shadowBlur=4;
 x.beginPath();x.moveTo(cx+25,cy+76);x.quadraticCurveTo(cx+30,cy+84,cx+28,badgeY-11);x.stroke();
 x.shadowBlur=0;
 if(priceTagArt.naturalWidth){
  x.drawImage(confectionTags||priceTagArt,full?200:0,0,200,100,cx-42,badgeY-22,84,44);
 }else{
  wineryTagReachPath(x,cx,badgeY);
  x.fillStyle=full?'#174f3c':'#541e3a';x.fill();
  x.strokeStyle='#ffe6a4';x.lineWidth=3.5;x.stroke();
 }
 const number=String(engine.nodeNumbers[i]);
 x.textAlign='center';x.textBaseline='middle';
 x.font='900 36px ElixirNumbers,Georgia,serif';
 if(x.measureText(number).width>53)x.font='900 32px ElixirNumbers,Georgia,serif';
 x.lineJoin='round';x.lineWidth=2.3;
 x.strokeStyle='#4d204e';
 x.strokeText(number,cx-5,badgeY+1.5);
 x.fillStyle=full?'#fff0aa':'#fffbe4';x.shadowBlur=0;
 x.fillText(number,cx-5,badgeY+1.5);
 x.restore();
 // Crown jewel highlight + gently animated prismatic caustics.
 const pulse=.5+.5*Math.sin(t*.0031+i*.62);
 x.save();x.globalAlpha=.56+.35*pulse;
 x.strokeStyle='#fffef5';x.lineWidth=2.1;x.beginPath();
 x.moveTo(cx-50,cy+14);x.quadraticCurveTo(cx-42,cy+50,cx-20,cy+63);x.stroke();
 x.restore();
 if(full){
  x.save();x.textAlign='center';x.font='900 15px system-ui,sans-serif';
  x.lineJoin='round';x.lineWidth=3;x.strokeStyle='#80405f';
  x.strokeText('FULL',cx+41,cy+18);x.fillStyle='#fff6b4';x.fillText('FULL',cx+41,cy+18);
  x.restore();
  if(new Set(g.layers.filter(l=>l.amount>K.EPS).map(l=>l.flavor)).size>1){
   x.save();x.textAlign='center';x.font='900 10px system-ui';
   x.fillStyle='#fffaf1';x.shadowColor='#e8a0ef';x.shadowBlur=6;
   x.fillText('MIX',cx-43,cy+20);x.restore();
  }
 }
 for(let n=0;n<(fresh?5:2);n++){
  const a=t*.0016+i*1.97+n*2.4;
  const rx=cx+Math.cos(a)*(fresh?60:47),ry=cy+37+Math.sin(a)*(fresh?46:31);
  const sz=fresh?3.2:1.6;
  x.save();x.globalAlpha=fresh?.9:.48;
  x.fillStyle=n%2?'#fff4bd':'#ffffff';x.shadowColor='#fff1a2';x.shadowBlur=fresh?8:3;
  x.beginPath();x.moveTo(rx,ry-sz*2.3);x.lineTo(rx+sz*.5,ry-sz*.5);
  x.lineTo(rx+sz*2.3,ry);x.lineTo(rx+sz*.5,ry+sz*.5);
  x.lineTo(rx,ry+sz*2.3);x.lineTo(rx-sz*.5,ry+sz*.5);
  x.lineTo(rx-sz*2.3,ry);x.lineTo(rx-sz*.5,ry-sz*.5);
  x.closePath();x.fill();x.restore();
 }
 x.restore();
}
// Same pointed jewellery silhouette as the number tag in premiumGlass().
function wineryTagReachPath(x,cx,y){
 x.beginPath();x.moveTo(cx-34,y-21);x.lineTo(cx+18,y-21);
 x.quadraticCurveTo(cx+23,y-21,cx+27,y-15);
 x.lineTo(cx+41,y);x.lineTo(cx+27,y+15);
 x.quadraticCurveTo(cx+23,y+21,cx+18,y+21);
 x.lineTo(cx-34,y+21);
 x.quadraticCurveTo(cx-40,y+21,cx-40,y+14);
 x.lineTo(cx-40,y-14);
 x.quadraticCurveTo(cx-40,y-21,cx-34,y-21);x.closePath();
}
const WP_REACH_WORDS=['リーチ','高額','超高額','全満'];
const WP_REACH_COLORS=['#63eefa','#ff486d','#ce65ff','#ffeaa8'];
function premiumReach(x,time){
 if(!stable(engine)||!S.reachResults?.length)return;
 const seconds=time/1000;
 for(const p of S.reachResults){
  const i=engine.nodeNumbers.indexOf(p.number);
  if(i<0)continue;
  const {x:cx,y:cy}=premiumPos(i),y=cy+99;
  zoomMainGlass(x,i); // Exact price-tag reach follows enlarged price tag.
  const tier=Math.max(0,Math.min(3,p.tier|0));
  const pulse=.5+.5*Math.sin(time*(tier?.0075:.0052)+i*.65);
  const color=WP_REACH_COLORS[tier];
  x.save();x.lineJoin='round';x.lineCap='round';
  wineryTagReachPath(x,cx,y);
  const rainbow=tier===3?x.createLinearGradient(cx-43,y-22,cx+43,y+22):null;
  if(rainbow){
   [['#ff70af',0],['#ffe992',.20],['#93ffd5',.45],
    ['#7fdaff',.70],['#d1a1ff',1]].forEach(([c,p])=>rainbow.addColorStop(p,c));
  }
  // Bright color follows the exact tag outer perimeter.
  x.strokeStyle=rainbow||color;
  x.lineWidth=3.8+1.5*pulse;x.shadowColor=color;
  x.shadowBlur=(tier===0?10:15)+9*pulse;x.stroke();
  // A travelling white highlight circumnavigates the tag.
  x.save();x.setLineDash(tier===0?[7,13]:[13,15]);
  x.lineDashOffset=-(seconds*(tier>=2?42:29)+i*4);
  x.strokeStyle='#fffef1';x.globalAlpha=.64+.35*pulse;
  x.lineWidth=tier>=2?3:2.2;x.shadowColor='#ffffff';
  x.shadowBlur=tier>=2?8:4;x.stroke();x.restore();
  // Sparkles outside the price number, never covering the number itself.
  const count=tier===3?6:tier===2?4:tier===1?3:2;
  for(let k=0;k<count;k++){
   const a=seconds*(tier===3?3.3:tier===2?2.6:1.8)+
      k*Math.PI*2/count+i*.36;
   const px=cx+Math.cos(a)*47,py=y+Math.sin(a)*27;
   const radius=(tier===3?3:2.1)+.65*Math.sin(seconds*4+k)**2;
   x.beginPath();x.moveTo(px-radius*1.9,py);x.lineTo(px+radius*1.9,py);
   x.moveTo(px,py-radius*1.9);x.lineTo(px,py+radius*1.9);
   x.strokeStyle=tier===3?
    ['#ffadcd','#ffed91','#8cefff','#b7a1ff'][k%4]:color;
   x.lineWidth=1.7;x.shadowColor=color;x.shadowBlur=6;x.stroke();
  }
  const name=p.oddsUp?'オッズアップ':tier===3?'全満':
    tier>0&&Math.floor(seconds/1.3)%2===0?'リーチ':WP_REACH_WORDS[tier];
  x.textAlign='center';x.textBaseline='middle';
  x.font='1000 12px SweetReachRounded,system-ui,sans-serif';
  x.lineWidth=3.4;x.strokeStyle='#fff8db';x.shadowBlur=4;
  x.shadowColor=color;x.strokeText(name,cx,y+30);
  x.fillStyle=tier===0?'#007f94':tier===1?'#ba204c':
    tier===2?'#852bb5':'#b26918';
  x.fillText(name,cx,y+30);x.restore();
  x.restore(); // zoomMainGlass for this reach
 }
}
function premiumSpout(x,t){
 // The formerly empty top strip is now a decorative juice-fountain nozzle.
 // No liquid is implied before a draw; visible streams are generated by fx.
 const p=premiumPos(0),cx=p.x;
 x.save();
 const glow=x.createRadialGradient(cx,21,4,cx,50,105);
 glow.addColorStop(0,'#fff5bc89');glow.addColorStop(.5,'#ffdc9280');
 glow.addColorStop(1,'#fff9d000');
 x.fillStyle=glow;x.fillRect(cx-115,0,230,110);
 x.translate(cx,0);
 const g=x.createLinearGradient(-40,0,40,90);
 g.addColorStop(0,'#fff9d0');g.addColorStop(.23,'#db9952');
 g.addColorStop(.48,'#ffebb3');g.addColorStop(.77,'#a85249');
 g.addColorStop(1,'#fff7c3');
 x.fillStyle=g;x.strokeStyle='#fff3b9';x.lineWidth=3;
 x.beginPath();x.moveTo(-26,-8);x.bezierCurveTo(-23,13,-28,27,-15,39);
 x.lineTo(-10,59);x.quadraticCurveTo(0,77,10,59);x.lineTo(15,39);
 x.bezierCurveTo(28,27,23,13,26,-8);x.closePath();x.fill();x.stroke();
 x.beginPath();x.ellipse(0,65,15,6,0,0,7);x.fill();x.stroke();
 x.shadowColor='#ffd9a6';x.shadowBlur=9;
 x.fillStyle='#e9619f';x.strokeStyle='#fff2b3';
 x.beginPath();x.moveTo(0,16);x.lineTo(11,28);x.lineTo(0,44);
 x.lineTo(-11,28);x.closePath();x.fill();x.stroke();
 x.shadowBlur=0;
 for(let j=0;j<6;j++){
  const theta=j*Math.PI/3+t*.0005;
  const x0=Math.cos(theta)*49,y0=40+Math.sin(theta)*19;
  x.fillStyle=j%2?'#fff9db':'#fff2ff';x.globalAlpha=.62;
  x.beginPath();x.arc(x0,y0,2+Math.sin(theta+t*.002)*.6,0,7);x.fill();
 }
 x.restore();
}

function paint(target,time,small=false){
 const xx=target.getContext('2d'),W=target.width,H=target.height;
 xx.setTransform(1,0,0,1,0,0);xx.clearRect(0,0,W,H);
 const fx=engine.fx;
 let display=engine.glasses,flows=[];
 if(fx?.type==='pour'){
  const progress=Math.max(0,Math.min(1,fx.elapsed/Math.max(1,fx.duration)));
  const interim=K.pour(fx.before,fx.source,fx.volume*progress,fx.flavor);
  display=interim.glasses;flows=interim.flows;
 }
 const lx=small?xx:liquidCtx;
 if(!small){
  lx.setTransform(1,0,0,1,0,0);
  lx.clearRect(0,0,liquidCanvas.width,liquidCanvas.height);
 }
 lx.setTransform((small?W:liquidCanvas.width)/DRAW_W,0,0,
                 (small?H:liquidCanvas.height)/DRAW_H,0,0);
 if(!small){lx.save();spreadMainGlasses(lx);}
 // Ambient moving light on the river; unobtrusive, no opacity fill.
 if(!small){
  for(let k=0;k<18;k++){
   const sx=360+(k*97)%815,sy=566+((k*63+time*.016)%350);
   lx.save();lx.globalAlpha=.12+.14*(.5+.5*Math.sin(k*2.8+time*.003));
   lx.strokeStyle='#fff9dd';lx.lineWidth=1.7;lx.beginPath();
   lx.ellipse(sx,sy,13+(k%5)*4,2.1,0,0,Math.PI*2);lx.stroke();lx.restore();
  }
 }
 for(let i=0;i<21;i++){
   const touched=fx?.type==='pour' &&
     (fx.source===i||flows.some(flow=>flow.from===i||flow.to===i));
   if(!small)zoomMainGlass(lx,i);
   premiumJuice(lx,i,display[i],time,touched);
   if(!small)lx.restore();
 }
 premiumStreams(lx,fx,flows,time);
 if(!small)lx.restore(); // finish main juice x-spread
 // For tab thumbnails, both paint passes share one small canvas.
 xx.setTransform(W/DRAW_W,0,0,H/DRAW_H,0,0);
 premiumSpout(xx,time);
 if(!small){xx.save();spreadMainGlasses(xx);}
 for(let i=0;i<21;i++){
  if(!small)zoomMainGlass(xx,i);
  premiumGlass(xx,i,display[i],time);
  if(!small)xx.restore();
 }
 if(!small){
  premiumReach(xx,time);
  xx.restore(); // normal coordinates for the HUD
  if(!app.bet(mount)){
   xx.save();xx.textAlign='center';xx.font='900 25px system-ui';
   xx.shadowColor='#67345d';xx.shadowBlur=7;xx.fillStyle='#fff0c6';
   xx.fillText('BETしてください',205,245);xx.restore();
  }
 }
}

// A 3-second payout-pour animation independent from the underlying 8-ball pace.
const PAYOUT_FILL_MS=3000;
const payoutVisual={cycle:null,from:0,target:0,startedAt:0,shown:0};
function updatePayoutVisual(windowEl,pouring){
 const full=Math.max(0,Math.min(21,engine.fullCount));
 // The condition for row n is n FULL glasses. Each earned tier is filled
 // exactly to the top border of that row; there is NO partial spill into
 // an unearned tier. Bottom = 10 full, top = 21 full (12 equal rows).
 const completedTiers=Math.max(0,Math.min(12,full-9));
 const target=100*completedTiers/12;
 const anim=payoutVisual;
 const amount=(now)=>{
  if(anim.target===anim.from)return anim.target;
  const ratio=Math.max(0,Math.min(1,(now-anim.startedAt)/PAYOUT_FILL_MS));
  const ease=ratio*ratio*(3-2*ratio);
  return anim.from+(anim.target-anim.from)*ease;
 };
 if(anim.cycle!==engine.cycle){
  anim.cycle=engine.cycle;anim.from=target;anim.target=target;
  anim.startedAt=clock;anim.shown=target;
 }else if(Math.abs(target-anim.target)>.018){
  anim.from=amount(clock);anim.target=target;anim.startedAt=clock;
 }
 anim.shown=amount(clock);
 windowEl.style.setProperty('--wp-payout-fill',anim.shown.toFixed(6)+'%');
 // Hide the waterline when no payout tier has been earned.
 windowEl.querySelector('.wp-pay-juice-level')
   ?.classList.toggle('has-juice',anim.shown>.015);
 const stillAnimating=Math.abs(anim.from-anim.target)>.02 &&
    clock-anim.startedAt<PAYOUT_FILL_MS;
 windowEl.classList.toggle('is-pouring',pouring||stillAnimating);
}

function updateHUD(){
 const bet=app.bet(mount),pouring=engine.fx?.type==='pour';
 const windowEl=scene.querySelector('.wp-pay-window');
 updatePayoutVisual(windowEl,pouring);
 const oddsFx=engine.fx?.type==='odds'?engine.fx:null;
 const presentedMix=engine.presentedMixCount??engine.mixCount;
 const fromMix=oddsFx?oddsFx.fromMix:presentedMix,toMix=oddsFx?oddsFx.toMix:presentedMix;
 const oddsRatio=oddsFx?Math.max(0,Math.min(1,oddsFx.elapsed/Math.max(1,oddsFx.duration))):1;
 const oddsEase=oddsRatio*oddsRatio*(3-2*oddsRatio);
 scene.classList.toggle('wp-odds-animating',!!oddsFx);
 const key=[engine.version,engine.phase,engine.processed,engine.power,engine.totalPoured,
            engine.totalHundredths,engine.fullCount,engine.mixCount,engine.presentedMixCount,
            oddsFx?Math.round(oddsRatio*100):'',engine.sugarTarget,
            engine.sugarAwarded,bet].join('/');
 if(key===uiKey)return;uiKey=key;
 // The left cabinet owns boost numbers; the right gauge mirrors actual pour amount.
 scene.querySelector('.wp-volume-number').textContent=engine.power+'杯';
 const fraction=Math.log2(Math.max(1,Math.min(16,engine.power)))/4;
 scene.querySelector('.wp-amount-tube').style.setProperty('--wp-amount-percent',(12+88*fraction).toFixed(1)+'%');
 scene.querySelectorAll('[data-amount]').forEach(el=>el.classList.toggle('is-current',Number(el.dataset.amount)===engine.power));
 scene.querySelector('.wp-score strong').textContent=engine.fullCount+' / 21';
 const summary=scene.querySelector('.wp-sugar-summary');
 summary.textContent=engine.sugarAwarded?'✦GET!':'✦'+engine.sugarTarget+'杯';
 summary.classList.toggle('is-get',engine.sugarAwarded);
 for(const node of scene.querySelectorAll('.wp-boost-stage')){
   const level=+node.dataset.power;
   node.classList.toggle('current',level===engine.power);
   node.classList.toggle('earned',level<=engine.power);
 }
 [...scene.querySelectorAll('.wp-boost-number')].forEach((node,i)=>{
  const n=engine.boostNumbers[i],hit=engine.seen.has(n);
  // Each achieved boost shows both the original number and a visible HIT!.
  node.innerHTML='<span class="wp-boost-numeral">'+n+'</span>'+
    (hit?'<span class="wp-boost-hit-word">HIT!</span>':'');
  node.classList.toggle('hit',hit);
  node.setAttribute('aria-label',n+'番：'+(hit?'HIT! 注入量UP獲得':'注入量UP待機'));
 });
 // MIX-adjusted prize credits animate before the liquid level rises.
 for(const row of scene.querySelectorAll('[data-full]')){
  const n=Number(row.dataset.full);
  const oldCredits=rowWin(bet,n,fromMix),newCredits=rowWin(bet,n,toMix);
  row.querySelector('b').textContent=num(Math.round(oldCredits+(newCredits-oldCredits)*oddsEase))+'WIN';
  row.classList.toggle('current',n===engine.fullCount);
  row.classList.toggle('is-reached',n<=engine.fullCount);
  const marker=row.querySelector('.wp-sugar-mark');
  marker.textContent=n===engine.sugarTarget?(engine.sugarAwarded?'✦GET!':'✦'):'';
  marker.classList.toggle('is-get',n===engine.sugarTarget&&engine.sugarAwarded);
 }
 const full=Math.max(0,Math.min(21,engine.fullCount));
 scene.querySelector('.wp-score-mini').textContent=full+'/21';
 scene.querySelector('.wp-total-poured').textContent='注 '+Number(engine.totalPoured||0).toLocaleString('ja-JP',{maximumFractionDigits:1})+'杯';
 // The liquid-level animation is driven by updatePayoutVisual every frame.
 scene.querySelector('.wp-mix i').textContent=toMix;
 scene.querySelector('.wp-mix b').textContent='×'+(1+(fromMix+(toMix-fromMix)*oddsEase)/10).toFixed(1);
}
// Only the grape-juice GLASS PYRAMID appears in the small tab.
// Offscreen draw is cropped to the 21 live cups and their price-tag numbers.
// No right payout column, no RATE settings and no large game header.
const miniOnlyCanvas=document.createElement('canvas');
miniOnlyCanvas.width=930;miniOnlyCanvas.height=930;
const miniOnlyCtx=miniOnlyCanvas.getContext('2d');
const miniClearStyle=document.createElement('link');
miniClearStyle.rel='stylesheet';
miniClearStyle.href='assets/winery-mini-transparent-v68.css?v=68';
document.head.appendChild(miniClearStyle);
const miniContrastStyle=document.createElement('link');
miniContrastStyle.rel='stylesheet';
miniContrastStyle.href='assets/winery-mini-contrast-v71.css?v=71';
document.head.appendChild(miniContrastStyle);
const selectedTabStyle=document.createElement('link');
selectedTabStyle.rel='stylesheet';
selectedTabStyle.href='assets/winery-tab-selected-v75.css?v=75';
document.head.appendChild(selectedTabStyle);
const standContrastStyle=document.createElement('link');
standContrastStyle.rel='stylesheet';
standContrastStyle.href='assets/winery-stand-contrast-v71.css?v=71';
document.head.appendChild(standContrastStyle);
const focusedStandStyle=document.createElement('link');
focusedStandStyle.rel='stylesheet';
focusedStandStyle.href='assets/winery-stand-focus-v76.css?v=76';
document.head.appendChild(focusedStandStyle);
const boardZoomStyle=document.createElement('link');
boardZoomStyle.rel='stylesheet';
boardZoomStyle.href='assets/winery-main-board-enlarge-v77.css?v=77';
document.head.appendChild(boardZoomStyle);
function paintMini(){
 const progress=engine.fx?.type==='pour'?
  Math.floor(engine.fx.elapsed/100):0;
 const k=[engine.version,engine.phase,engine.processed,engine.power,
          engine.totalHundredths,app.bet(mount),S.reachBoardKey,progress].join('/');
 if(k===miniKey)return;miniKey=k;
 // Render JUST the dynamic cups and their live numbers. No fruit kingdom,
 // no static afternoon-tea image, no 21-frame background screenshot,
 // no MENU, payout cabinet, nozzle, labels or glow from the main frame.
 miniOnlyCtx.setTransform(1,0,0,1,0,0);
 miniOnlyCtx.clearRect(0,0,930,930);
 miniOnlyCtx.save();
 // Centre the six actual tiers, including the numbered tags below each bowl.
 miniOnlyCtx.translate(465-premiumPos(0).x,465-(premiumPos(0).y+premiumPos(20).y+116*WP_MAIN_CUP_ZOOM)/2);
 spreadMainGlasses(miniOnlyCtx);
 const fx=engine.fx;
 let current=engine.glasses,flows=[];
 if(fx?.type==='pour'){
  const t=Math.max(0,Math.min(1,fx.elapsed/Math.max(1,fx.duration)));
  const interim=K.pour(fx.before,fx.source,fx.volume*t,fx.flavor);
  current=interim.glasses;flows=interim.flows;
 }
 for(let i=0;i<21;i++){
  const touching=fx?.type==='pour'&&(fx.source===i||
     flows.some(flow=>flow.from===i||flow.to===i));
  zoomMainGlass(miniOnlyCtx,i);
  premiumJuice(miniOnlyCtx,i,current[i],clock,touching);
  miniOnlyCtx.restore();
 }
 premiumStreams(miniOnlyCtx,fx,flows,clock,false);
 for(let i=0;i<21;i++){
  zoomMainGlass(miniOnlyCtx,i);
  premiumGlass(miniOnlyCtx,i,current[i],clock);
  miniOnlyCtx.restore();
 }
 premiumReach(miniOnlyCtx,clock);
 miniOnlyCtx.restore();
 const thumb=S.miniCanvas,context=thumb.getContext('2d');
 context.setTransform(1,0,0,1,0,0);
 context.clearRect(0,0,thumb.width,thumb.height);
 context.drawImage(miniOnlyCanvas,0,0,930,930,0,0,thumb.width,thumb.height);
 thumb.hidden=false;S.miniLogo.hidden=true;
}
function queueFrame(){if(frame||document.hidden)return;frame=requestAnimationFrame(tick);}
function tick(now){
 frame=0;if(!engine)return;
 const advancing=!app.paused&&!document.hidden;
 if(advancing&&stamp)clock+=Math.min(100,now-stamp);stamp=now;
 updateHUD();paintMini();
 if(active===mount&&!S.panel.hidden){
  if(now-lastPaint>=33){paint(canvas,clock);lastPaint=now;}
  if(advancing)queueFrame();
 }
}
const render0=render;render=function(s,ev,e,...args){if(e?.kind==='winery'){queueFrame();return;}return render0(s,ev,e,...args);};
const mini0=miniature;miniature=function(s){if(s.engine?.kind==='winery'){paintMini();return;}return mini0(s);};
const pending0=syncPendingHitTiles;syncPendingHitTiles=function(s){if(s.engine?.kind==='winery')return;return pending0(s);};
const request0=requestReach;requestReach=function(s,e,a=app){if(e?.kind==='winery')return wineryReach(s,e,a);return request0(s,e,a);};
const boardReach0=updateReachBoard;updateReachBoard=function(s,a){if(s.engine?.kind==='winery')return;return boardReach0(s,a);};
const tabs0=tabs;tabs=function(a){
 const saved=S.engine;S.engine=null;try{tabs0(a);}finally{S.engine=saved;}
 const bet=a.bet(mount),win=medalWin(bet,engine.totalHundredths);
 fitGoldenNumber(S.tabBet,num(bet),14,76);paintTabWin(S,win);
 S.tabSugar.hidden=false;S.tabSugar.classList.toggle('collected',engine.sugarAwarded);
 if(typeof applySugarTier==='function')applySugarTier(S.tabSugar.querySelector('.sugar-gem'),wonderTier(bet));
 S.sugarGet.hidden=!engine.sugarAwarded;S.tab.classList.toggle('off',bet<=0);
};
const hud0=hud;hud=function(a){
 if(active!==mount){document.body.classList.remove('winery-active');return hud0(a);}
 hud0(a);
 document.body.classList.remove('gelato-active','choco-active','carnival-active');document.body.classList.add('winery-active');
 put('best','満タン '+engine.fullCount+'/21 ・ MIX '+engine.mixCount);put('ballinfo','あと'+Math.max(0,8-a.draws.length)+'球');
 updateHUD();updateReachUI(a);queueFrame();
};
const select0=select;select=function(i){const result=select0(i);if(i===mount){uiKey='';queueFrame();}return result;};
const result0=renderRoundResult;renderRoundResult=function(a){
 result0(a);
 const panel=document.getElementById('result-games');if(!panel)return;
 const winery=panel.querySelector('[data-game-index="'+mount+'"]');
 if(winery){
  winery.dataset.winery='1';const title=winery.querySelector('.result-game-name');if(title)title.innerHTML='ワイナリーピラミッド <small>'+(a.enabled[mount]?num(a.locked[mount])+' BET':'NO BET')+'</small>';
  const detail=winery.querySelector('.result-game-details');if(detail)detail.innerHTML='<span>満タン '+engine.fullCount+'/21</span><span>MIX '+engine.mixCount+'杯 ×'+engine.mixMultiplier.toFixed(1)+'倍</span>';
 }
};
window.addEventListener('resize',()=>{miniKey='';queueFrame();},{passive:true});
document.addEventListener('visibilitychange',()=>{stamp=0;if(!document.hidden)queueFrame();});
window.WineryPyramid={installed:true,version:78,engine,core:K,draw:()=>{miniKey='';uiKey='';queueFrame();},get state(){return {pattern:K.NAMES[engine.pattern],processed:engine.processed,power:engine.power,full:engine.fullCount,mix:engine.mixCount,multiplier:engine.totalHundredths/100,wasted:engine.wasted,glasses:K.clone(engine.glasses)};}};
select(mount);queueFrame();scheduleUI(app);
console.info('[Winery Pyramid v62] selected sharp strawberry-orange river background; live cups, dynamic juice and payouts retained');
})();

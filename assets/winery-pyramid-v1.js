/* Winery Pyramid v58: live 21-glass juice tower over strawberry river + citrus waterfalls. */
(()=>{
'use strict';
if(window.WineryPyramid?.installed)return;
const K=window.WineryPyramidCore;
if(!K||typeof app==='undefined'||!app||!slots?.[1])throw Error('Winery host is not ready');
if(app.phase!=='ready')throw Error('Install Winery only between games');
const S=slots[1],oldEngine=app.engines[1];
const money=(bet,mult)=>num(medalWin(bet,Math.round(mult*100)));
const pos=i=>{const p=K.CELLS[i];return {x:260+(p.c-p.r/2)*76,y:100+p.r*78};};
let engine,frame=0,clock=0,stamp=0,miniKey='',uiKey='',lastPaint=0;
const style=document.createElement('link');style.rel='stylesheet';style.href='assets/winery-pyramid-v1.css?v=56';document.head.appendChild(style);const luxuryStyle=document.createElement('link');luxuryStyle.rel='stylesheet';luxuryStyle.href='assets/winery-pyramid-luxury-v56.css?v=56';document.head.appendChild(luxuryStyle);const sweetsStyle=document.createElement('link');sweetsStyle.rel='stylesheet';sweetsStyle.href='assets/winery-pyramid-sweets-v57.css?v=57';document.head.appendChild(sweetsStyle);const riverStyle=document.createElement('link');riverStyle.rel='stylesheet';riverStyle.href='assets/winery-pyramid-juice-river-v58.css?v=58';document.head.appendChild(riverStyle);
const scene=document.createElement('div');scene.className='wp-scene';
scene.innerHTML='<canvas class="wp-canvas" width="780" height="900" aria-label="6段21個のワイングラス"></canvas>'+
 '<div class="wp-rate-panel"><strong>初期盤面 配当率</strong><output class="wp-rate-output">90%</output>'+
 '<input class="wp-rate-range" type="range" min="50" max="150" value="90" step="1" aria-label="ワイナリー初期盤面配当率50から150パーセント">'+
 '<div class="wp-rate-ends"><span>50%</span><span>100%</span><span>150%</span></div>'+
 '<small>白ジュース・左右対称</small></div>'+
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
 '<div class="wp-pay-fixed"><span>21杯 全満</span><small class="wp-sugar-mark"></small><b>0WIN</b></div>'+
 '<div class="wp-pay-window"><div class="wp-pay-track">'+Array.from({length:21},(_,i)=>20-i).map(n=>'<div class="wp-pay-row" data-full="'+n+'"><span>'+n+'杯</span><small class="wp-sugar-mark"></small><b>0WIN</b></div>').join('')+'</div></div>'+
 '<div class="wp-mix"><span>MIX <i>0</i>杯</span><b>×1.0倍</b></div>'+
 '<div class="wp-total"><span>TOTAL</span><b>0</b><small>WIN</small></div>'+
 '</aside>'+
 '<div class="wp-message" hidden></div>';
S.panel.appendChild(scene);
 // Two compact game-data banners fill the unused space beside the summit.
 // They do not obscure any of the 21 glasses, and preserve the original logic.
 scene.insertAdjacentHTML('beforeend',
 '<div class="wp-upper-hud wp-upper-round" aria-label="抽選の進行"><span class="wp-hud-label">✦ JUICE ROUND ✦</span><strong class="wp-hud-main wp-hud-round">1 / 8</strong>'+
 '<div class="wp-hud-progress" aria-hidden="true">'+Array.from({length:8},()=>'<i></i>').join('')+'</div></div>'+
 '<div class="wp-upper-hud wp-upper-juice" aria-label="次のジュースと注入量"><span class="wp-hud-label">✦ NEXT JUICE ✦</span>'+
 '<strong class="wp-hud-main wp-hud-volume">1杯</strong>'+
 '<div class="wp-hud-flavor"><i class="wp-hud-swatch"></i><span class="wp-hud-flavor-name">りんご</span></div></div>'
 );
const canvas=scene.querySelector('canvas'),ctx=canvas.getContext('2d');
const ratePanel=scene.querySelector('.wp-rate-panel');
const rateRange=ratePanel.querySelector('.wp-rate-range');
const rateOutput=ratePanel.querySelector('.wp-rate-output');
const fullFx=new Map();
function refreshRateDisplay(){
 rateOutput.textContent=rateRange.value+'%';
 ratePanel.hidden=app.phase!=='ready';rateRange.disabled=app.phase!=='ready';
}
try{
 const stored=Number(localStorage.getItem('winery-pyramid-target-rate-v1'));
 if(Number.isInteger(stored)&&stored>=50&&stored<=150)rateRange.value=String(stored);
}catch{}
refreshRateDisplay();
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
slots[2].holder.style.order='0';slots[0].holder.style.order='1';S.holder.style.order='2';
document.body.classList.add('winery-enabled');
for(const id of ['canyon-debug-depth','canyon-depth-apply']){const x=document.getElementById(id);if(x){x.disabled=true;x.title='ワイナリーピラミッドでは使用しません';}}
const depthStatus=document.getElementById('canyon-depth-status');if(depthStatus)depthStatus.textContent='ワイナリーピラミッドに切替済み';
function signal(text){const el=scene.querySelector('.wp-message');el.textContent=text;el.hidden=false;clearTimeout(signal.timer);signal.timer=setTimeout(()=>el.hidden=true,1600);}
function event(ev,e){
 S.engine=e;S.event=ev;S.dirtyMain=true;S.dirtyMini=true;
 if(ev.phase==='wineryAward')for(const index of ev.justFilled||[])fullFx.set(index,clock);
 if(ev.phase==='stepcollect'&&app.phase==='playing'&&app.enabled[1]){
   app.wonderBank.push(...ev.steps.map(step=>({...step,game:1})));
   app.wonderSteps=app.wonderBank.length;
   app.wonderValue+=ev.steps.reduce((sum,step)=>sum+step.value,0);
 }
 if(ev.phase==='sugaraward'){
   signal('✦ WONDER SUGAR GET!');
   if(typeof showSugarAward==='function')showSugarAward(S,ev.steps);
 }
 refreshRateDisplay();
 if(ev.phase==='ready'){
  fullFx.clear();
  S.reachEpoch=(S.reachEpoch||0)+1;S.reachBoardKey=null;S.reachStatus='inactive';S.reachResults=[];S.tabReachResults=[];
  miniKey='';uiKey='';scene.querySelector('.wp-message').hidden=true;
 }
 if(ev.phase==='wineryBoost')signal('次から '+ev.power+'杯注入！');
 if(ev.phase==='wineryAllFull'){
  signal('全満！ 21 / 21');
  if(typeof announceAchievement==='function')announceAchievement('ワイナリーピラミッド　全満達成！');
  if(active===1&&typeof sceneSound==='function')sceneSound('allclear',{volume:.8});
 }
 if(ev.phase==='complete'&&app.phase==='playing'&&!app.paid[1]&&app.enabled[1]){
  app.paid[1]=true;app.roundWins[1]=medalWin(app.locked[1],e.totalHundredths);
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
app.engines[1]=engine;S.engine=engine;
engine.setPayoutTarget(Number(rateRange.value));
rateRange.addEventListener('input',refreshRateDisplay);
rateRange.addEventListener('change',()=>{
 if(app.phase!=='ready'){refreshRateDisplay();return;}
 const target=Math.round(Number(rateRange.value));
 if(!engine.setPayoutTarget(target))return;
 try{localStorage.setItem('winery-pyramid-target-rate-v1',String(target));}catch{}
 uiKey='';miniKey='';S.dirtyMain=S.dirtyMini=true;
 signal('白ジュースの初期盤面を再生成 · '+target+'%');
 refreshRateDisplay();queueFrame();scheduleUI(app);
});
engine.beforeComplete=token=>engine.wait(300,token);
const emptySugar=S.tabSugar;if(emptySugar)emptySugar.hidden=false;
function stable(e){return e.processed>0&&e.processed<8&&e.running&&!e.queue.length&&e.accepted===e.processed&&['waiting','settled'].includes(e.phase);}
function wineryReach(s,e,a){
 const context=typeof reachContext==='function'?reachContext(e,a):null;
 if(!context||!stable(e)||a.bet(1)<=0){s.reachStatus='inactive';s.reachResults=[];s.tabReachResults=[];s.reachBoardKey=null;return;}
 if(s.reachBoardKey===context.key&&s.reachStatus==='ready')return;
 s.reachEpoch=(s.reachEpoch||0)+1;s.reachBoardKey=context.key;
 const results=e.nodeNumbers.filter(n=>!e.seen.has(n)).map(n=>e.predict(n)).filter(p=>p.gain>0);
 results.sort((a,b)=>a.number-b.number);s.reachResults=results;s.tabReachResults=results;
 s.tabReachBase=e.totalHundredths;s.tabReachVersion=e.version;s.reachStatus='ready';s.reachAfterBall=e.processed;
}
function background(x){
 const g=x.createLinearGradient(0,0,520,600);g.addColorStop(0,'#321b52');g.addColorStop(.45,'#75476f');g.addColorStop(1,'#dcae85');x.fillStyle=g;x.fillRect(0,0,520,600);
 const sky=x.createRadialGradient(260,98,10,260,180,380);sky.addColorStop(0,'#ffebbe66');sky.addColorStop(1,'#d292b500');x.fillStyle=sky;x.fillRect(0,0,520,600);
 // Ornamental winery arches and vineyard vines, cached at installation.
 x.lineWidth=3;x.strokeStyle='#f1d5a35c';
 for(const side of [25,495]){x.beginPath();x.moveTo(side,555);x.lineTo(side,105);x.quadraticCurveTo(side,26,260,24);x.stroke();}
 for(let r=0;r<6;r++){const y=165+r*78;x.strokeStyle='#eddbb53f';x.beginPath();x.moveTo(40,y);x.lineTo(480,y);x.stroke();}
 for(let i=0;i<26;i++){
  const side=i%2?1:0,xx=side?497:23,yy=46+i*20;
  x.save();x.translate(xx,yy);x.rotate(side?-.7:.7);
  const leaf=x.createLinearGradient(-18,0,18,0);leaf.addColorStop(0,'#315349');leaf.addColorStop(.6,'#94b784');leaf.addColorStop(1,'#d5d68c');
  x.fillStyle=leaf;x.beginPath();x.ellipse(0,0,13,5,0,0,Math.PI*2);x.fill();x.restore();
 }
 for(const [a,b] of [[32,80],[488,120],[35,485],[485,510]])for(let r=0;r<3;r++)for(let c=0;c<3-r;c++){
  const cx=a+(c-(2-r)/2)*10,cy=b+r*9;const q=x.createRadialGradient(cx-2,cy-3,1,cx,cy,6);q.addColorStop(0,'#efd2ff');q.addColorStop(.35,'#9864b5');q.addColorStop(1,'#41214e');x.fillStyle=q;x.beginPath();x.arc(cx,cy,6,0,7);x.fill();
 }
}
const bg=document.createElement('canvas');bg.width=780;bg.height=900;const bx=bg.getContext('2d');bx.scale(1.5,1.5);background(bx);
let premiumStageReady=false,premiumGlassReady=false;
function loadPremiumArtwork(){
 const stage=new Image();
 stage.decoding='async';
 stage.onload=()=>{
   premiumStageReady=true;
   bx.setTransform(1,0,0,1,0,0);bx.clearRect(0,0,bg.width,bg.height);
   bx.drawImage(stage,0,0,bg.width,bg.height);miniKey='';queueFrame();
 };
 stage.onerror=()=>{premiumStageReady=false;};
 stage.src='assets/winery-kingdom-stage-v55.webp?v=55';
 const premiumGlass=new Image();
 premiumGlass.decoding='async';
 premiumGlass.onload=()=>{premiumGlassReady=true;glassArt.src=premiumGlass.src;miniKey='';queueFrame();};
 premiumGlass.onerror=()=>{premiumGlassReady=false;};
 premiumGlass.src='assets/winery-crystal-glass-v55.webp?v=55';
}

 const stageArt=new Image(),glassArt=new Image();
 stageArt.onload=()=>{
  if(premiumStageReady)return;
  bx.setTransform(1,0,0,1,0,0);bx.clearRect(0,0,bg.width,bg.height);
  bx.drawImage(stageArt,0,0,bg.width,bg.height);miniKey='';queueFrame();
 };
 stageArt.onerror=()=>console.warn('[Winery] board art unavailable; fallback retained');
 stageArt.src='assets/winery-juice-river-stage-v2.svg?v=2';
 glassArt.onload=()=>{miniKey='';queueFrame();};
 glassArt.onerror=()=>console.warn('[Winery] glass art unavailable; fallback retained');
 glassArt.src='assets/winery-royal-crystal-goblet-v2.svg?v=2';

 // v55 images were not published. The v56 image is the single premium source.

function text(x,s,px,py,size=16,color='#fff3c9',font='system-ui'){
 x.save();x.textAlign='center';x.textBaseline='middle';x.font='900 '+size+'px '+font;x.lineJoin='round';x.strokeStyle='#432c55';x.lineWidth=3;x.strokeText(s,px,py);x.fillStyle=color;x.fillText(s,px,py);x.restore();
}
function bowl(x,px,py){x.beginPath();x.moveTo(px-29,py);x.bezierCurveTo(px-29,py+33,px-20,py+46,px,py+47);x.bezierCurveTo(px+20,py+46,px+29,py+33,px+29,py);x.closePath();}
function glass(x,i,g,t,activePour){
 const {x:cx,y:cy}=pos(i),full=g.volume>=1-K.EPS;
 const reachedAt=fullFx.get(i),flashAge=reachedAt==null?Infinity:t-reachedAt;
 const newborn=full&&flashAge>=0&&flashAge<1650;
 const pulse=.5+.5*Math.sin(t*.006+i*.8);
 x.save();
 if(full){
   x.save();
   const glow=x.createRadialGradient(cx,cy+29,5,cx,cy+29,newborn?58:42);
   glow.addColorStop(0,newborn?'#fff4ad60':'#fff6bf28');
   glow.addColorStop(.55,newborn?'#ffbcf34f':'#ffd58e15');
   glow.addColorStop(1,'#ffffff00');
   x.fillStyle=glow;x.beginPath();x.arc(cx,cy+29,newborn?58:42,0,Math.PI*2);x.fill();
   x.restore();
 }
 const base=x.createLinearGradient(cx-30,cy,cx+28,cy+45);base.addColorStop(0,'#ccefff55');base.addColorStop(.3,'#eaffff16');base.addColorStop(.7,'#fcfaff24');base.addColorStop(1,'#efffff73');
 bowl(x,cx,cy);x.fillStyle=base;x.fill();
 x.save();bowl(x,cx,cy);x.clip();
 let cumulative=0;
 for(let layer=0;layer<g.layers.length;layer++){
  const l=g.layers[layer],f=K.FLAVORS[l.flavor],bottom=cy+46-cumulative*43;cumulative+=l.amount;
  const surface=cy+46-cumulative*43,
      amp=layer===g.layers.length-1?(activePour?2.9:1.45):.78;
  const gradient=x.createLinearGradient(cx-29,surface,cx+29,bottom);gradient.addColorStop(0,f.color);gradient.addColorStop(.24,f.light);gradient.addColorStop(.58,f.color);gradient.addColorStop(1,f.light);
  x.fillStyle=gradient;x.globalAlpha=.85;x.beginPath();x.moveTo(cx-32,bottom+1);x.lineTo(cx-32,surface);
  for(let dx=-32;dx<=32;dx+=3){
   const u=dx*.18+t*.0032+i*.49;
   const wave=Math.sin(u)*amp+.48*Math.sin(dx*.37-t*.0018+layer*.7);
   x.lineTo(cx+dx,surface+wave);
  }
  x.lineTo(cx+32,bottom+1);x.closePath();x.fill();
  x.globalAlpha=.8;x.strokeStyle=f.light;x.lineWidth=1;x.beginPath();
  for(let dx=-28;dx<=28;dx+=3){
   const yy=surface+Math.sin(dx*.18+t*.0032+i*.49)*amp+
     .48*Math.sin(dx*.37-t*.0018+layer*.7);
   dx===-28?x.moveTo(cx+dx,yy):x.lineTo(cx+dx,yy);
  }x.stroke();
  // Tiny caustic bands and buoyant glints are continuously animated,
  // while the fluid volume and flavor layers remain unchanged.
  const causticX=cx-29+((t*.015+i*13+layer*23)%66);
  const caustic=x.createLinearGradient(causticX-9,surface,causticX+9,surface);
  caustic.addColorStop(0,'#ffffff00');caustic.addColorStop(.5,'#fffdfc6a');
  caustic.addColorStop(1,'#ffffff00');
  x.globalCompositeOperation='screen';x.globalAlpha=.23;
  x.fillStyle=caustic;x.fillRect(cx-30,surface,60,bottom-surface+1);
  x.globalCompositeOperation='source-over';x.globalAlpha=.75;
  const bubbles=(l.flavor===3?5:2);
  for(let b=0;b<bubbles;b++){
    const fromBottom=((t*(l.flavor===3?.027:.012)+i*19+b*29+layer*17)%Math.max(7,(bottom-surface)+12));
    const y=bottom+4-fromBottom;
    if(y<=surface+2||y>=bottom)continue;
    const xp=cx+Math.sin(i*7+b*2.13+layer)*16+Math.sin(t*.0008+b)*2;
    x.beginPath();x.arc(xp,y,l.flavor===3?1.4:.82,0,Math.PI*2);
    x.fillStyle='#fff';x.globalAlpha=l.flavor===3?.43:.19;x.fill();
  }
  x.globalAlpha=.85;
 }
 x.restore();
 x.globalAlpha=1;
 if(glassArt.complete&&glassArt.naturalWidth){
   if(full){x.shadowColor='#fff1b3';x.shadowBlur=10;}
   x.drawImage(glassArt,cx-35,cy-7,70,85);x.shadowBlur=0;
   if(full){x.strokeStyle='#fff0b4';x.lineWidth=2;x.beginPath();x.ellipse(cx,cy,29.4,5.2,0,0,Math.PI*2);x.stroke();}
 }else{
 if(full){x.shadowColor='#ffe5a2';x.shadowBlur=10;}
 bowl(x,cx,cy);x.strokeStyle=full?'#fff2ad':'#e8faffbb';x.lineWidth=full?2.3:1.5;x.stroke();x.shadowBlur=0;
 x.beginPath();x.ellipse(cx,cy,29,5,0,0,Math.PI*2);x.strokeStyle='#efffffdf';x.lineWidth=1.8;x.stroke();
 x.strokeStyle='#e7faffb9';x.lineWidth=3;x.beginPath();x.moveTo(cx,cy+47);x.lineTo(cx,cy+63);x.stroke();
 x.fillStyle='#d9f4ff38';x.strokeStyle='#e9faffc9';x.lineWidth=1.2;x.beginPath();x.ellipse(cx,cy+65,19,4,0,0,Math.PI*2);x.fill();x.stroke();
 x.strokeStyle='#ffffff9c';x.lineWidth=2.3;x.beginPath();x.moveTo(cx-22,cy+8);x.quadraticCurveTo(cx-22,cy+28,cx-12,cy+37);x.stroke();
 }
 if(typeof drawElixirNumber==='function')drawElixirNumber(x,engine.nodeNumbers[i],cx,cy+22,24,'#fff8d9','#543161',3.3);
 else text(x,String(engine.nodeNumbers[i]),cx,cy+23,22,'#fff8d9','ElixirNumbers,system-ui');
 if(full){
  const flare=newborn?1+.2*Math.sin(Math.min(1,flashAge/700)*Math.PI):1;
  x.save();x.translate(cx,cy+43);x.scale(flare,flare);
  x.shadowColor='#fff2a2';x.shadowBlur=newborn?12:5;
  text(x,'満タン!!',0,0,newborn?13:11,'#fff3a9','SweetReachRounded,system-ui');
  x.restore();
  if(new Set(g.layers.map(l=>l.flavor)).size>1)text(x,'MIX',cx,cy+57,8,'#efffbe');
  const count=newborn?7:3;
  for(let k=0;k<count;k++){
    const a=(t*.0014+k*2.399+i*.37),orbit=newborn?39+9*Math.sin(flashAge*.003):34;
    const px=cx+Math.cos(a)*orbit,py=cy+19+Math.sin(a)*(newborn?34:27);
    const radius=newborn?2.1+.9*pulse:1.3+.5*pulse;
    x.save();x.shadowColor=k%2?'#fff6ae':'#cae8ff';
    x.shadowBlur=newborn?8:4;x.fillStyle=k%2?'#ffef91':'#fff';
    x.beginPath();
    x.moveTo(px,py-radius*2.2);x.lineTo(px+radius*.6,py-radius*.45);
    x.lineTo(px+radius*2.2,py);x.lineTo(px+radius*.6,py+radius*.45);
    x.lineTo(px,py+radius*2.2);x.lineTo(px-radius*.6,py+radius*.45);
    x.lineTo(px-radius*2.2,py);x.lineTo(px-radius*.6,py-radius*.45);
    x.closePath();x.fill();x.restore();
  }
 }
 x.restore();
}
function stream(x,from,to,flavor,t,width=3){
 const f=K.FLAVORS[flavor];x.save();x.lineCap='round';x.strokeStyle=f.color;x.shadowColor=f.light;x.shadowBlur=3;x.lineWidth=width;
 x.beginPath();x.moveTo(from.x,from.y);x.quadraticCurveTo((from.x+to.x)/2,from.y+15,to.x,to.y);x.stroke();x.shadowBlur=0;
 x.strokeStyle=f.light;x.lineWidth=Math.max(1,width*.36);x.setLineDash([4,6]);x.lineDashOffset=-t*.035;x.stroke();x.restore();
}
function bottle(x,p,flavor,volume,t){
 const f=K.FLAVORS[flavor],bx=Math.min(463,p.x+44),by=p.y-55;
 stream(x,{x:bx-21,y:by+19},{x:p.x,y:p.y+5},flavor,t,4);
 x.save();x.translate(bx,by);x.rotate(-.72);
 const q=x.createLinearGradient(-17,0,17,0);q.addColorStop(0,'#e3faff');q.addColorStop(.35,f.light);q.addColorStop(.7,f.color);q.addColorStop(1,'#d5f7ff');x.fillStyle=q;x.strokeStyle='#effaff';x.lineWidth=1.7;
 x.beginPath();x.moveTo(-8,-28);x.lineTo(8,-28);x.lineTo(8,-14);x.quadraticCurveTo(19,-9,19,1);x.lineTo(19,24);x.quadraticCurveTo(0,33,-19,24);x.lineTo(-19,1);x.quadraticCurveTo(-19,-9,-8,-14);x.closePath();x.fill();x.stroke();
 x.fillStyle='#fff4d8';x.fillRect(-15,1,30,15);text(x,'JUICE',0,8,7,'#5e3759');x.restore();
 text(x,volume+'杯',bx+20,by-20,12,'#fff3b9');
}

/* River screenshot deliberately has no authority over game values:
   all numbers, volumes, awards, progress and payout are rendered live. */
const riverImg=new Image();let luxuryReady=false,riverReady=false;
riverImg.decoding='async';
riverImg.onload=()=>{
 riverReady=true;luxuryReady=true;
 scene.classList.add('wp-luxury-ready','wp-river-ready');
 scene.classList.remove('wp-sweets-ready');
 canvas.width=836;canvas.height=471;lastPaint=0;uiKey='';miniKey='';queueFrame();
};
riverImg.onerror=()=>{
 // The already-bundled SVG scenery + original vector cups remain playable,
 // instead of falling back to the old dark photographic winery.
 riverReady=false;luxuryReady=false;
 scene.classList.remove('wp-luxury-ready','wp-sweets-ready','wp-river-ready');
 console.info('[Winery] Juice river art is awaiting upload: assets/winery-juice-river-v58.webp. SVG fruit-waterfall fallback active.');
 miniKey='';uiKey='';lastPaint=0;queueFrame();
};
riverImg.src='assets/winery-juice-river-v58.webp?v=58';
const luxuryPos=i=>{const p=K.CELLS[i];return {
 x:820+(p.c-p.r/2)*147,
 y:194+p.r*112
};};
function paintLuxuryGlass(x,i,g,t){
 const p=luxuryPos(i),cx=p.x,cy=p.y;
 if(riverReady){
  // Neutralize the sample liquids printed into the illustration, while
  // preserving a bright transparent coupe outline for real dynamic filling.
  x.save();
  const body=x.createLinearGradient(cx-56,cy+14,cx+56,cy+82);
  body.addColorStop(0,'rgba(255,255,255,.87)');
  body.addColorStop(.45,'rgba(255,246,249,.84)');
  body.addColorStop(1,'rgba(255,248,234,.83)');
  x.beginPath();x.moveTo(cx-65,cy+14);
  x.bezierCurveTo(cx-62,cy+57,cx-29,cy+79,cx,cy+80);
  x.bezierCurveTo(cx+29,cy+79,cx+62,cy+57,cx+65,cy+14);
  x.closePath();x.fillStyle=body;x.fill();
  x.strokeStyle='#ffe8ac';x.lineWidth=3;x.stroke();
  x.beginPath();x.ellipse(cx,cy+14,65,8,0,0,Math.PI*2);
  x.strokeStyle='#fff7df';x.lineWidth=3;x.stroke();
  x.restore();
 }
 if(g.volume>0){
  x.save();x.beginPath();
  x.moveTo(cx-65,cy+14);x.bezierCurveTo(cx-58,cy+55,cx-33,cy+74,cx,cy+77);
  x.bezierCurveTo(cx+33,cy+74,cx+58,cy+55,cx+65,cy+14);x.closePath();x.clip();
  let filled=0;
  for(const layer of g.layers){
   if(layer.amount<=.0001)continue;
   const f=K.FLAVORS[layer.flavor],bottom=cy+77-filled*61;
   filled+=layer.amount;
   const surface=cy+77-filled*61,gr=x.createLinearGradient(cx-65,surface,cx+65,bottom);
   gr.addColorStop(0,f.light);gr.addColorStop(.46,f.color);gr.addColorStop(1,f.light);
   x.globalAlpha=.68;x.fillStyle=gr;x.beginPath();x.moveTo(cx-68,bottom+2);x.lineTo(cx-68,surface);
   for(let dx=-68;dx<=68;dx+=4)x.lineTo(cx+dx,surface+1.6*Math.sin(t*.004+i*.37+dx*.1));
   x.lineTo(cx+68,bottom+2);x.closePath();x.fill();
   x.globalAlpha=.8;x.lineWidth=1.8;x.strokeStyle=f.light;x.beginPath();
   for(let dx=-64;dx<=64;dx+=4){const yy=surface+1.6*Math.sin(t*.004+i*.37+dx*.1);if(dx===-64)x.moveTo(cx+dx,yy);else x.lineTo(cx+dx,yy);}x.stroke();
   x.globalAlpha=1;
  }
  x.restore();
 }
 // Cover preprinted example digits: the engine's randomized numbers win.
 if(riverReady){
  x.save();
  x.textAlign='center';x.textBaseline='middle';
  x.shadowColor='#da3e5b';x.shadowBlur=5;
  x.font='900 32px system-ui,sans-serif';
  x.strokeStyle='#b23553';x.lineWidth=7;x.lineJoin='round';
  x.strokeText(String(engine.nodeNumbers[i]),cx,cy+44);
  x.fillStyle='#fffbea';x.fillText(String(engine.nodeNumbers[i]),cx,cy+44);
  x.restore();
 }else{
 x.save();
 const medal=x.createRadialGradient(cx-9,cy+31,1,cx,cy+42,28);
 medal.addColorStop(0,'#fff1b4');medal.addColorStop(.32,'#a76321');medal.addColorStop(.62,'#d89a39');medal.addColorStop(1,'#ffe7a0');
 x.fillStyle=medal;x.shadowColor='#ffe0a1';x.shadowBlur=5;
 x.beginPath();x.arc(cx,cy+42,27,0,Math.PI*2);x.fill();x.shadowBlur=0;
 x.fillStyle='#28130e';x.beginPath();x.arc(cx,cy+42,22,0,Math.PI*2);x.fill();
 x.font='bold 32px Georgia,serif';x.textAlign='center';x.textBaseline='middle';
 x.lineWidth=1.5;x.strokeStyle='#6b3e24';x.strokeText(String(engine.nodeNumbers[i]),cx,cy+44);
 x.fillStyle='#fff1c2';x.fillText(String(engine.nodeNumbers[i]),cx,cy+44);
 x.restore();
 }
 if(g.volume>=1-K.EPS){
  x.save();x.shadowColor='#fff3b8';x.shadowBlur=12;
  x.strokeStyle='#fff3a8';x.lineWidth=3;x.beginPath();x.ellipse(cx,cy+45,65,40,0,0,Math.PI*2);x.stroke();x.restore();
  x.save();x.font='bold 16px system-ui';x.textAlign='center';x.fillStyle='#fff9ba';
  x.shadowColor='#542111';x.shadowBlur=5;x.fillText('FULL',cx,cy+87);x.restore();
 }
}
function paintLuxury(x,glasses,flows,fx,t){
 // Shimmering reflections across the stream and juice waterfalls.
 x.save();x.strokeStyle='#fff6d7';x.lineWidth=2;
 for(let k=0;k<15;k++){
   const px=140+(k*107)%1060;
   const py=490+((k*79+t*.017)%370);
   const op=.09+.12*(.5+.5*Math.sin(t*.004+k));
   x.globalAlpha=op;
   x.beginPath();x.ellipse(px,py,10+(k%3)*7,2.1,0,0,Math.PI*2);x.stroke();
 }
 x.restore();
 for(let i=0;i<21;i++)paintLuxuryGlass(x,i,glasses[i],t);
 if(fx?.type==='pour'){
  const f=K.FLAVORS[fx.flavor];
  for(const flow of flows){
   const a=luxuryPos(flow.from),b=flow.to<0?{x:a.x,y:874}:luxuryPos(flow.to);
   x.save();x.lineCap='round';x.shadowColor=f.light;x.shadowBlur=7;
   x.strokeStyle=f.color;x.lineWidth=Math.min(11,7+Math.sqrt(flow.amount)*3);
   x.beginPath();x.moveTo(a.x,a.y+71);x.bezierCurveTo(a.x,a.y+102,b.x,b.y-14,b.x,b.y+22);x.stroke();
   x.shadowBlur=0;x.strokeStyle=f.light;x.lineWidth=2.5;x.setLineDash([10,13]);x.lineDashOffset=-t*.055;x.stroke();x.restore();
  }
  const source=luxuryPos(fx.source),bx=Math.min(1100,source.x+82),by=source.y-45;
  x.save();x.translate(bx,by);x.rotate(-.72);
  const grad=x.createLinearGradient(-22,-32,24,38);
  grad.addColorStop(0,'#eefcff');grad.addColorStop(.5,f.light);grad.addColorStop(1,f.color);
  x.fillStyle=grad;x.strokeStyle='#fff1af';x.lineWidth=3;
  x.beginPath();x.moveTo(-10,-36);x.lineTo(10,-36);x.lineTo(10,-20);x.lineTo(23,-6);
  x.lineTo(23,28);x.quadraticCurveTo(0,38,-23,28);x.lineTo(-23,-6);x.lineTo(-10,-20);x.closePath();x.fill();x.stroke();
  x.fillStyle='#ffecca';x.fillRect(-17,0,34,18);x.fillStyle='#582319';x.font='bold 10px Georgia';x.textAlign='center';x.fillText('JUICE',0,13);x.restore();
  x.save();x.font='bold 23px Georgia';x.textAlign='center';x.fillStyle='#fff0bd';x.shadowColor='#471326';x.shadowBlur=7;
  x.fillText(fx.volume+'杯',bx+36,by-43);x.restore();
 }
 if(stable(engine))for(const p of S.reachResults||[]){
  const i=engine.nodeNumbers.indexOf(p.number);if(i<0)continue;
  const a=luxuryPos(i);x.save();x.lineWidth=3;x.shadowBlur=10;x.shadowColor='#fff0af';x.strokeStyle='#fff0af';
  x.beginPath();x.ellipse(a.x,a.y+42,65,45,0,0,Math.PI*2);x.stroke();x.restore();
 }
 if(!app.bet(1)){
  x.save();x.fillStyle='#401026de';x.strokeStyle='#f8d487';x.lineWidth=3;
  x.fillRect(415,826,555,56);x.strokeRect(415,826,555,56);
  x.font='bold 28px system-ui';x.textAlign='center';x.fillStyle='#fff1be';
  x.fillText('BETしてください',692,865);x.restore();
 }
}

function paint(target,time,small=false){
 const x=target.getContext('2d'),W=target.width,H=target.height;
 x.setTransform(1,0,0,1,0,0);x.clearRect(0,0,W,H);if(luxuryReady&&small)x.drawImage(riverImg,0,0,W,H);else if(!luxuryReady)x.drawImage(bg,0,0,W,H);x.setTransform(W/520,0,0,H/600,0,0);
 const fx=engine.fx;let display=engine.glasses,flows=[];
 if(fx?.type==='pour'){
  const progress=Math.max(0,Math.min(1,fx.elapsed/fx.duration));
  const interim=K.pour(fx.before,fx.source,fx.volume*progress,fx.flavor);display=interim.glasses;flows=interim.flows;
 }
 if(luxuryReady){x.setTransform(W/1672,0,0,H/941,0,0);paintLuxury(x,display,flows,fx,time);return;}
 text(x,'ワイナリーピラミッド',260,24,23,'#fff1bf');
 const nextFlavor=K.FLAVORS[K.flavorFor(Math.min(8,engine.processed+1))];
 text(x,engine.processed>=8?'8球終了':(engine.processed+1)+'球目 '+nextFlavor.name,260,51,12,'#fff7df');
 for(let i=0;i<21;i++)glass(x,i,display[i],time,fx?.type==='pour');
 if(fx?.type==='pour'){
  for(const flow of flows){const a=pos(flow.from),b=flow.to>=0?pos(flow.to):{x:a.x,y:574};
   stream(x,{x:a.x+(b.x<a.x?-28:28),y:a.y+4},{x:b.x,y:b.y+3},fx.flavor,time,Math.min(5,2+Math.sqrt(flow.amount)));
  }
  bottle(x,pos(fx.source),fx.flavor,fx.volume,time);
 }
 if(!small&&stable(engine))for(const p of S.reachResults||[]){
  const i=engine.nodeNumbers.indexOf(p.number);if(i<0)continue;const a=pos(i),color=['#8af4dd','#ffe18b','#edb0ff','#fff3a0'][p.tier];
  x.strokeStyle=color;x.lineWidth=1.8;x.beginPath();x.ellipse(a.x,a.y+22,32,26,0,0,7);x.stroke();
  text(x,['リーチ','高額','超高額','全満'][p.tier],a.x,a.y-12,8,color);
 }
 // BOOST numbers now appear in the upper payout cabinet.
 if(!app.bet(1)){x.fillStyle='#201d40aa';x.fillRect(30,60,460,490);text(x,'BETしてください',260,300,30);}
}
function updateHUD(){
 const bet=app.bet(1),key=[engine.version,engine.phase,engine.processed,engine.power,engine.totalHundredths,engine.fullCount,engine.mixCount,engine.sugarTarget,engine.sugarAwarded,bet].join('/');
 if(key===uiKey)return;uiKey=key;
 scene.querySelector('.wp-power-next b').textContent=engine.power+'杯';
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
   const n=engine.boostNumbers[i];
   node.textContent=String(n);node.classList.toggle('hit',engine.seen.has(n));
   node.setAttribute('aria-label',n+'番：'+(engine.seen.has(n)?'獲得':'注入量UP待機'));
 });
 scene.querySelector('.wp-pay-fixed b').textContent=money(bet,100)+'WIN';
 for(const row of scene.querySelectorAll('[data-full]')){
  const n=+row.dataset.full;
  row.querySelector('b').textContent=money(bet,K.PAY[n])+'WIN';
  row.classList.toggle('current',n===engine.fullCount);
  const marker=row.querySelector('.wp-sugar-mark');
  marker.textContent=n===engine.sugarTarget?(engine.sugarAwarded?'✦GET!':'✦'):'';
  marker.classList.toggle('is-get',n===engine.sugarTarget&&engine.sugarAwarded);
 }
 scene.querySelector('.wp-pay-fixed').classList.toggle('current',engine.fullCount===21);
 scene.querySelector('.wp-pay-fixed .wp-sugar-mark').textContent=
   engine.sugarTarget===21?(engine.sugarAwarded?'✦GET!':'✦'):'';
 const top=Math.max(5,Math.min(20,engine.fullCount+3));scene.querySelector('.wp-pay-track').style.setProperty('--offset',20-top);
 scene.querySelector('.wp-mix i').textContent=engine.mixCount;scene.querySelector('.wp-mix b').textContent='×'+engine.mixMultiplier.toFixed(1)+'倍';
 scene.querySelector('.wp-total b').textContent=num(medalWin(bet,engine.totalHundredths));
 // Real-time top banners: completed balls, next fruit flavor and current pour power.
 const done=Math.max(0,Math.min(8,engine.processed));
 scene.querySelector('.wp-hud-round').textContent=done>=8?'8 / 8':(done+1)+' / 8';
 scene.querySelectorAll('.wp-hud-progress i').forEach((dot,i)=>dot.classList.toggle('done',i<done));
 const next=K.FLAVORS[K.flavorFor(Math.min(8,done+1))];
 scene.querySelector('.wp-hud-volume').textContent=done>=8?'FINISH':engine.power+'杯';
 scene.querySelector('.wp-hud-flavor-name').textContent=done>=8?'ゲーム終了':next.name;
 scene.querySelector('.wp-hud-swatch').style.setProperty('--wp-next-juice',done>=8?'#ffe0a5':next.color);
}
function paintMini(){
 const k=[engine.version,engine.phase,engine.processed,engine.power,engine.totalHundredths,app.bet(1)].join('/');if(k===miniKey)return;miniKey=k;
 paint(S.miniCanvas,clock,true);S.miniCanvas.hidden=false;S.miniLogo.hidden=true;
}
function queueFrame(){if(frame||document.hidden)return;frame=requestAnimationFrame(tick);}
function tick(now){
 frame=0;if(!engine)return;
 const advancing=!app.paused&&!document.hidden;
 if(advancing&&stamp)clock+=Math.min(100,now-stamp);stamp=now;
 updateHUD();paintMini();
 if(active===1&&!S.panel.hidden){
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
 const bet=a.bet(1),win=medalWin(bet,engine.totalHundredths);
 fitGoldenNumber(S.tabBet,num(bet),14,76);S.tabWin.parentNode.hidden=win<=0;fitGoldenNumber(S.tabWin,num(win),17,50);
 S.tabSugar.hidden=false;S.tabSugar.classList.toggle('collected',engine.sugarAwarded);
 if(typeof applySugarTier==='function')applySugarTier(S.tabSugar.querySelector('.sugar-gem'),wonderTier(bet));
 S.sugarGet.hidden=!engine.sugarAwarded;S.tab.classList.toggle('off',bet<=0);
};
const hud0=hud;hud=function(a){
 if(active!==1){document.body.classList.remove('winery-active');return hud0(a);}
 active=2;try{hud0(a);}finally{active=1;}
 document.body.classList.remove('gelato-active','choco-active','carnival-active');document.body.classList.add('winery-active');
 put('best','満タン '+engine.fullCount+'/21 ・ MIX '+engine.mixCount);put('ballinfo','あと'+Math.max(0,8-a.draws.length)+'球');
 updateHUD();updateReachUI(a);queueFrame();
};
const select0=select;select=function(i){const result=select0(i);if(i===1){uiKey='';queueFrame();}return result;};
const result0=renderRoundResult;renderRoundResult=function(a){
 // Restore engine order before older render wrappers inspect the first row.
 const existing=document.getElementById('result-games');
 if(existing){const rows=[...existing.querySelectorAll('.result-game')];
  const get=t=>rows.find(r=>r.querySelector('.result-game-name')?.textContent.includes(t));
  const g=get('ジェラート'),w=get('ワイナリー')||get('チョコレート'),c=get('シックス');
  if(g&&w&&c)existing.append(g,w,c);
 }
 result0(a);
 const panel=document.getElementById('result-games');if(!panel)return;
 const rows=[...panel.querySelectorAll('.result-game')];
 const winery=rows.find(r=>r.dataset.winery==='1'||r.querySelector('.result-game-name')?.textContent.includes('チョコレート'));
 if(winery){
  winery.dataset.winery='1';const title=winery.querySelector('.result-game-name');if(title)title.innerHTML='ワイナリーピラミッド <small>'+num(a.locked[1])+' BET</small>';
  const detail=winery.querySelector('.result-game-details');if(detail)detail.innerHTML='<span>満タン '+engine.fullCount+'/21</span><span>MIX '+engine.mixCount+'杯 ×'+engine.mixMultiplier.toFixed(1)+'倍</span>';
 }
 const candy=rows.find(r=>r.querySelector('.result-game-name')?.textContent.includes('シックス'));
 const gelato=rows.find(r=>r.querySelector('.result-game-name')?.textContent.includes('ジェラート'));
 if(candy&&gelato&&winery)panel.append(candy,gelato,winery);
};
window.addEventListener('resize',()=>{miniKey='';queueFrame();},{passive:true});
document.addEventListener('visibilitychange',()=>{stamp=0;if(!document.hidden)queueFrame();});
window.WineryPyramid={installed:true,version:58,engine,core:K,draw:()=>{miniKey='';uiKey='';queueFrame();},get state(){return {pattern:K.NAMES[engine.pattern],processed:engine.processed,power:engine.power,full:engine.fullCount,mix:engine.mixCount,multiplier:engine.totalHundredths/100,wasted:engine.wasted,glasses:K.clone(engine.glasses)};}};
select(1);queueFrame();scheduleUI(app);
console.info('[Winery Pyramid] 21 glasses / 4 boosts / 8 draws; Six Drop + Gelato + Winery installed');
})();

/* ダンゴデビンゴ: numbered dango and real horizontal, vertical and diagonal skewers. */
(()=>{
'use strict';
const R=window.DangoBingoRules,TAU=Math.PI*2,clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
const palette={plain:['#ffffff','#f7f2e7','#c6b8a5'],initial:['#f0f8ce','#a6c569','#587d3f'],manual:['#ffe4e4','#e27579','#b74552']};
const tierInk=['#daae39','#f37b1d','#e44a9f','#cc64e4'];
const yen=new Intl.NumberFormat('ja-JP');
function geometry(width,height){
 const unit=Math.min(width/9.75,height/6.5),cx=width/2,cy=height/2;
 return {unit,radius:unit*.423,width,height,centers:R.cells.map(c=>({id:c.id,x:cx+c.x*unit,y:cy+(c.row-2)*unit*1.23}))};
}
function disc(c,x,y,r,fill){c.beginPath();c.arc(x,y,r,0,TAU);c.fillStyle=fill;c.fill();}
function roundBox(c,x,y,w,h,r,fill){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();}
function segment(c,x1,y1,x2,y2,width,color){c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.lineWidth=width;c.lineCap='round';c.strokeStyle=color;c.stroke();}
function text(c,value,x,y,size,color,weight=900){c.font=weight+' '+size+'px ElixirNumbers,"Yu Gothic",Meiryo,system-ui,sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillStyle=color;c.fillText(String(value),x,y);}
function number(c,value,x,y,size){
 if(typeof drawElixirNumber==='function')drawElixirNumber(c,value,x,y,size,'#59362e','#fffceb',size*.06);
 else{c.font='900 '+size+'px ElixirNumbers,system-ui,sans-serif';c.textAlign='center';c.textBaseline='middle';c.lineWidth=size*.09;c.strokeStyle='#fffceb';c.strokeText(String(value),x,y);c.fillStyle='#59362e';c.fillText(String(value),x,y);}
}
function star(c,x,y,r,ink){
 c.beginPath();for(let k=0;k<10;k++){const a=-Math.PI/2+k*Math.PI/5,rr=r*(k%2?.44:1);k?c.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr):c.moveTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);}c.closePath();c.fillStyle=ink;c.fill();
}
function dango(c,cell,p,r,o){
 const colors=palette[cell.manualFree?'manual':cell.initialFree?'initial':'plain'],marked=cell.marked,hit=cell.hit;
 c.save();c.shadowColor=marked?'#9b664b55':'#71472f44';c.shadowBlur=r*.14;c.shadowOffsetY=r*.13;
 const shade=c.createRadialGradient(p.x-r*.3,p.y-r*.37,r*.08,p.x,p.y,r);
 shade.addColorStop(0,colors[0]);shade.addColorStop(.65,colors[1]);shade.addColorStop(1,colors[2]);
 disc(c,p.x,p.y,r,shade);c.restore();
 c.beginPath();c.arc(p.x,p.y,r,0,TAU);c.lineWidth=Math.max(1,r*.05);c.strokeStyle='#fff7e6d9';c.stroke();
 c.save();c.globalAlpha=.44;c.beginPath();c.ellipse(p.x-r*.24,p.y-r*.37,r*.32,r*.13,-.35,0,TAU);c.fillStyle='#fff';c.fill();c.restore();
 // Tiny flour speckles stay deterministic: rendering never consumes game RNG.
 for(let i=0;i<4;i++){const a=(cell.id*2.399+i*1.71)%TAU,rr=r*(.64+(i%2)*.1);disc(c,p.x+Math.cos(a)*rr,p.y+Math.sin(a)*rr,Math.max(.45,r*.025),'#fff7e67a');}
 if(cell.initialFree||cell.manualFree){
  c.beginPath();c.arc(p.x,p.y,r*1.07,0,TAU);c.lineWidth=Math.max(1.5,r*.105);c.strokeStyle=cell.initialFree?'#5d823e':'#ba3b4f';c.stroke();
 }
 if(o.oddsActivated){
  c.beginPath();c.arc(p.x,p.y,r*1.075,0,TAU);c.lineWidth=Math.max(1.7,r*.12);c.strokeStyle='#d4a52d';c.stroke();
  for(let i=0;i<7;i++){
   const a=cell.id*.49+i*TAU/7,rr=r*(i%2?.8:.64),x=p.x+Math.cos(a)*rr,y=p.y+Math.sin(a)*rr;
   c.save();c.translate(x,y);c.rotate(a+.3);c.fillStyle=i%2?'#f8e69c':'#d6a739';c.fillRect(-r*.055,-r*.035,r*.11,r*.07);c.restore();
  }
 }
 if(hit){
  c.beginPath();c.arc(p.x,p.y,r*.84,0,TAU);c.lineWidth=Math.max(1,r*.065);c.strokeStyle='#75503688';c.stroke();
  disc(c,p.x+r*.63,p.y-r*.6,r*.22,'#6b8544');
  segment(c,p.x+r*.51,p.y-r*.6,p.x+r*.59,p.y-r*.5,r*.07,'#fffbe3');segment(c,p.x+r*.59,p.y-r*.5,p.x+r*.76,p.y-r*.72,r*.07,'#fffbe3');
 }
 const label=cell.initialFree?'FREE':cell.manualFree?'FREE':'';
 if(label){
  const by=p.y+r*.71;
  roundBox(c,p.x-r*.65,by-r*.2,r*1.3,r*.4,r*.13,cell.initialFree?'#557c37':'#a83449');
  text(c,label,p.x,by+r*.015,r*.32,'#fff9e2');
 }
 number(c,cell.number,p.x,p.y-(label?r*.07:0),r*(cell.number>=10?1.12:1.25));
 if(cell.id===o.lastCell&&Number.isFinite(o.age)&&o.age<500){
  const t=clamp(o.age/500);c.save();c.globalAlpha=1-t;c.beginPath();c.arc(p.x,p.y,r*(1.05+.6*t),0,TAU);c.lineWidth=r*.08;c.strokeStyle='#ffd264';c.stroke();c.restore();
 }
}
function skewer(c,line,g,progress,glow){
 const first=g.centers[line.cells[0]],last=g.centers[line.cells.at(-1)],dx=last.x-first.x,dy=last.y-first.y,d=Math.hypot(dx,dy),ux=dx/d,uy=dy/d;
 const ext=g.unit*.67,a={x:first.x-ux*ext,y:first.y-uy*ext},b={x:last.x+ux*ext,y:last.y+uy*ext};
 const x=a.x+(b.x-a.x)*progress,y=a.y+(b.y-a.y)*progress;
 if(glow){c.save();c.shadowColor='#ffc653';c.shadowBlur=g.unit*.22;segment(c,a.x,a.y,x,y,g.unit*.18,'#ffe2a1');c.restore();}
 segment(c,a.x,a.y,x,y,g.unit*.105,'#7d4c2c');segment(c,a.x-uy*g.unit*.018,a.y+ux*g.unit*.018,x-uy*g.unit*.018,y+ux*g.unit*.018,g.unit*.046,'#e2b76f');
 if(progress>0&&progress<1){c.save();c.translate(x,y);c.rotate(Math.atan2(dy,dx));c.beginPath();c.moveTo(g.unit*.12,0);c.lineTo(-g.unit*.12,-g.unit*.055);c.lineTo(-g.unit*.12,g.unit*.055);c.closePath();c.fillStyle='#fff0b7';c.fill();c.restore();}
 return {x,y};
}
function paint(ctx,state,options={},mini=false){
 if(!ctx||!state?.cells)return;
 const c=ctx,w=c.canvas.width,h=c.canvas.height,g=geometry(w,h),u=g.unit,r=g.radius;
 if(!w||!h||!u)return;
 c.save();c.clearRect(0,0,w,h);
 if(!mini){
  const pw=u*9.45,ph=u*6.08,x=(w-pw)/2,y=(h-ph)/2;
  c.save();c.shadowColor='#6b392b32';c.shadowBlur=u*.16;c.shadowOffsetY=u*.06;
  roundBox(c,x,y,pw,ph,u*.32,'#a45f4d');c.restore();
  const plate=c.createLinearGradient(x,y,x+pw,y+ph);plate.addColorStop(0,'#fffaf0');plate.addColorStop(.6,'#f8efda');plate.addColorStop(1,'#e9dac0');
  roundBox(c,x+u*.05,y+u*.05,pw-u*.1,ph-u*.13,u*.29,plate);
  c.beginPath();c.roundRect(x+u*.16,y+u*.15,pw-u*.32,ph-u*.33,u*.22);c.lineWidth=u*.025;c.strokeStyle='#d9c5a2';c.stroke();
  for(const side of [-1,1]){const sx=w/2+side*u*3.53,sy=h/2-u*1.86;c.save();c.globalAlpha=.27;for(let k=0;k<5;k++){const a=k*TAU/5;disc(c,sx+Math.cos(a)*u*.13,sy+Math.sin(a)*u*.13,u*.12,'#d98b9e');}disc(c,sx,sy,u*.07,'#cfbd70');c.restore();}
 }
 const animation=options.animationLines||state.newLines||[],age=options.lineAge??options.age??Infinity,completed=new Set(state.completedLines||[]),tips=[];
 for(const lineId of completed){
  const line=R.lines[lineId];if(!line)continue;
  const order=animation.indexOf(lineId),progress=options.reducedMotion||order<0?1:smooth((age-order*150)/490);
  if(progress<=0)continue;
  tips.push({lineId,point:skewer(c,line,g,progress,progress<1),active:progress<1});
 }
 const reaches=new Map((options.reach||[]).filter(x=>x.gain>0||x.gainHundredths>0).map(x=>[x.n??x.number,x])),oddsHits=new Set(state.oddsHits||[]);
 for(const cell of state.cells){
  const p=g.centers[cell.id],reach=reaches.get(cell.number);
  if(reach&&!cell.hit){
   const tier=Number(reach.tier)||0,phase=(Number(options.time)||0)/600+cell.id,scale=options.reducedMotion?1:1+.055*Math.sin(phase);
   c.save();c.shadowColor=tierInk[tier];c.shadowBlur=u*.14;c.beginPath();c.arc(p.x,p.y,r*1.18*scale,0,TAU);c.lineWidth=Math.max(1.1,u*.035);c.strokeStyle=tierInk[tier];c.stroke();c.restore();
  }
  dango(c,cell,p,r,{...options,lastCell:state.lastCell,oddsActivated:cell.manualFree&&!cell.initialFree&&oddsHits.has(cell.number)});
 }
 // The bamboo passes behind the dango. Its moving tip and sparkle stay visible,
 // while every number remains readable even when several lines intersect it.
 for(const tip of tips)if(tip.active)star(c,tip.point.x,tip.point.y,u*.19,'#fff1ae');
 if(!mini&&(state.lastOddsGain||state.lastBonusGain)&&options.age>=0&&options.age<1400&&state.lastCell!=null){
  const p=g.centers[state.lastCell],t=clamp(options.age/1400),x=Math.max(u*1.12,Math.min(w-u*1.12,p.x)),y=Math.max(u*.31,p.y-u*(.69+.34*t));
  c.save();c.globalAlpha=Math.min(1,(1-t)*3);roundBox(c,x-u*1.02,y-u*.22,u*2.04,u*.44,u*.16,state.lastOddsGain?'#aa7730':'#597f38');text(c,state.lastOddsGain?'ODDS ＋1':'FREE ＋1',x,y,u*.265,'#fff9d4');c.restore();
 }
 if(options.demo&&!mini){roundBox(c,w/2-u*.75,h/2-u*2.89,u*1.5,u*.38,u*.1,'#fff7ebdc');text(c,'DEMO',w/2,h/2-u*2.69,u*.24,'#8f5d4e');}
 c.restore();
}
function drawMini(context,state,options={}){const ctx=typeof context?.getContext==='function'?context.getContext('2d'):context;paint(ctx,state,options,true);}
function formatWin(bet,hundredths){
 const value=typeof medalWin==='function'?medalWin(bet,hundredths):Math.floor((Math.max(0,bet)*hundredths+50)/100);
 return yen.format(value);
}
function mount(panel){
 const root=document.createElement('section');root.className='dgb-scene';root.setAttribute('aria-label','ダンゴデビンゴ');
 root.innerHTML='<aside class="dgb-pay"><div class="dgb-pay-title">串の本数で WIN</div><table><thead><tr><th>ライン</th><th>WIN</th></tr></thead><tbody></tbody></table><p>各ラインの配当を合計<br><b>× ODDS</b></p></aside><div class="dgb-stage"><header class="dgb-status"><div><small class="dgb-phase-label">前半5球</small><b class="dgb-phase-value">0 / 5</b></div><div class="dgb-free-stat"><small>配置できるFREE</small><b class="dgb-free-value">1</b></div><div class="dgb-odds-stat"><small>ODDS</small><b class="dgb-odds-value">×1</b></div></header><div class="dgb-pan"><canvas role="img"></canvas><div class="dgb-cell-controls" role="group" aria-label="FREEを置くお団子"></div></div><div class="dgb-legend"><span><i class="dgb-initial-mark"></i>初期FREE：前半HITで配置＋1</span><span><i class="dgb-player-mark"></i>配置FREE：後半HITでODDS＋1</span></div><footer class="dgb-placement"><div class="dgb-placement-copy"><strong class="dgb-prompt">まずは5球！</strong><span class="dgb-countdown"></span></div><div class="dgb-actions"><button type="button" data-action="undo">戻す</button><button type="button" data-action="auto">おまかせ</button><button type="button" data-action="confirm">配置完了</button></div></footer></div><div class="dgb-live" role="status" aria-live="polite" aria-atomic="true"></div>';
 panel.append(root);
 const find=s=>root.querySelector(s),pan=find('.dgb-pan'),canvas=pan.querySelector('canvas'),ctx=canvas.getContext('2d'),controls=find('.dgb-cell-controls'),rows=[];
 const table=find('tbody');
 for(const row of [...R.payRows].reverse()){
  const tr=document.createElement('tr');tr.dataset.length=String(row.length);tr.dataset.count=String(row.count);
  const th=document.createElement('th');th.scope='row';th.innerHTML='<b>'+row.length+'</b>マス <span>'+row.count+'本'+(row.atLeast?'以上':'')+'</span>';
  const td=document.createElement('td');td.textContent='0';tr.append(th,td);table.append(tr);rows.push({row,tr,td});
 }
 let state=null,options={},callbacks={},focusId=0,lastLive='',domKey='',sizeKey='';
 const buttons=R.cells.map(cell=>{
  const button=document.createElement('button');button.type='button';button.className='dgb-cell';button.dataset.cellId=String(cell.id);button.tabIndex=-1;
  button.addEventListener('click',()=>callbacks.onCell?.(cell.id));
  button.addEventListener('focus',()=>{focusId=cell.id;refreshFocus();});
  button.addEventListener('keydown',event=>{
   if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
   event.preventDefault();const candidates=buttons.filter(b=>!b.disabled);if(!candidates.length)return;
   if(event.key==='Home'||event.key==='End'){(event.key==='Home'?candidates[0]:candidates.at(-1)).focus();return;}
   const origin=R.cells[cell.id],horizontal=event.key==='ArrowLeft'||event.key==='ArrowRight',direction=event.key==='ArrowLeft'||event.key==='ArrowUp'?-1:1;
   const next=candidates.map(b=>{const c=R.cells[Number(b.dataset.cellId)],dx=c.x-origin.x,dy=c.row-origin.row;return {b,delta:horizontal?dx:dy,score:horizontal?Math.abs(dx)+Math.abs(dy)*5:Math.abs(dy)*2+Math.abs(dx)};}).filter(x=>x.delta*direction>0).sort((a,b)=>a.score-b.score)[0];next?.b.focus();
  });controls.append(button);return button;
 });
 find('[data-action="undo"]').addEventListener('click',()=>callbacks.onUndo?.());
 find('[data-action="auto"]').addEventListener('click',()=>callbacks.onAuto?.());
 find('[data-action="confirm"]').addEventListener('click',()=>callbacks.onConfirm?.());
 function refreshFocus(){
  if(buttons[focusId]?.disabled){const next=buttons.find(b=>!b.disabled);focusId=next?Number(next.dataset.cellId):-1;}
  for(const b of buttons)b.tabIndex=Number(b.dataset.cellId)===focusId&&!b.disabled?0:-1;
 }
 function fit(){
  const box=pan.getBoundingClientRect(),scale=Math.min(2,window.devicePixelRatio||1);
  const width=Math.max(1,Math.round(box.width*scale)),height=Math.max(1,Math.round(box.height*scale));
  if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
  // The cabinet is transformed to fit narrow viewports. Canvas backing pixels
  // use the physical rect; absolutely positioned controls use unscaled CSS px.
  const nextSize=[pan.clientWidth,pan.clientHeight,root.clientWidth,root.clientHeight].join('/');
  if(sizeKey!==nextSize){
   sizeKey=nextSize;const g=geometry(pan.clientWidth,pan.clientHeight);root.style.setProperty('--dgb-u',Math.max(.45,Math.min(root.clientWidth/560,root.clientHeight/390))+'px');
   for(const p of g.centers){const b=buttons[p.id];b.style.left=p.x+'px';b.style.top=p.y+'px';b.style.width=g.unit*.94+'px';b.style.height=g.unit*.94+'px';}
  }
  if(state)paint(ctx,state,options,false);
 }
 function draw(next,o={}){
  if(!next)return;
  const key=[o.bet,o.demo,o.placementLocked,Math.ceil(Number(o.remainingMs)/1000)].join('/');
  if(state===next&&key===domKey){options=o;paint(ctx,state,options,false);return;}
  state=next;options=o;domKey=key;
  const placing=!o.demo&&state.phase==='placing',editable=placing&&!o.placementLocked,drawCount=state.draws.length,second=state.phase==='draw-final'||state.phase==='done';
  root.dataset.phase=state.phase;root.dataset.demo=o.demo?'true':'false';root.dataset.cells=String(state.cells.length);root.dataset.skewers=String(state.completedLines.length);root.dataset.multiplier=String(state.oddsMultiplier);
  find('.dgb-phase-label').textContent=o.demo?'遊び方':placing?'シンキングタイム':state.phase==='done'?'串が完成！':second?'後半3球':'前半5球';
  find('.dgb-phase-value').textContent=o.demo?'DEMO':placing?'FREE配置':state.phase==='done'?state.completedLines.length+'本':second?(drawCount-5)+' / 3':drawCount+' / 5';
  find('.dgb-free-value').textContent=placing?state.manualFreeCells.length+' / '+state.freeBudget:String(state.freeBudget);
  find('.dgb-odds-value').textContent='×'+state.oddsMultiplier;
  controls.hidden=!placing;find('.dgb-actions').hidden=!placing;
  for(const cell of state.cells){
   const b=buttons[cell.id];b.disabled=!editable||cell.initialFree||cell.hit||(!cell.manualFree&&!state.freeRemaining);b.setAttribute('aria-pressed',String(cell.manualFree));b.classList.toggle('placed',cell.manualFree);
   b.setAttribute('aria-label',cell.number+'番'+(cell.initialFree?' 初期FREE':cell.hit?' HIT済み':cell.manualFree?' 配置したFREE・取り消す':' FREEを置く'));
  }
  refreshFocus();
  find('[data-action="undo"]').disabled=!editable||!state.manualFreeCells.length;
  find('[data-action="auto"]').disabled=!editable||!state.freeRemaining;
  find('[data-action="confirm"]').disabled=!editable||state.freeRemaining>0;
  find('.dgb-prompt').textContent=o.demo?'前半5球 → FREE配置 → 後半3球':placing?state.freeRemaining?'お団子を選んで、あと'+state.freeRemaining+'個配置':'配置できました！ 確定してください':state.phase==='done'?'完成した串の配当を合計 ×'+state.oddsMultiplier:second?'配置FREEの番号が出ると ODDS UP！':'初期FREEに前半HITすると、配置FREE＋1';
  const seconds=Number(o.remainingMs);find('.dgb-countdown').textContent=placing&&Number.isFinite(seconds)?Math.max(0,Math.ceil(seconds/1000))+'秒':placing?'まもなく後半':'';
  find('.dgb-countdown').classList.toggle('urgent',placing&&Number.isFinite(seconds)&&seconds<=5000);
  for(const item of rows){const count=state.lineCounts[item.row.length]||0;item.tr.classList.toggle('current',item.row.atLeast?count>=item.row.count:count===item.row.count);item.td.textContent=formatWin(Number(o.bet)||0,item.row.hundredths*state.oddsMultiplier);}
  canvas.setAttribute('aria-label','25個のお団子。'+drawCount+'球、完成した串'+state.completedLines.length+'本、初期FREE'+state.initialFreeCells.length+'個、配置FREE'+state.manualFreeCells.length+'個、ODDS'+state.oddsMultiplier+'倍。');
  const live=[state.phase,drawCount,state.freeBudget,state.freeRemaining,state.completedLines.length,state.oddsMultiplier].join('/');
  if(live!==lastLive){lastLive=live;find('.dgb-live').textContent=find('.dgb-prompt').textContent+'。完成した串'+state.completedLines.length+'本、ODDS'+state.oddsMultiplier+'倍。';}
  fit();
 }
 const observer=new ResizeObserver(fit);observer.observe(root);observer.observe(pan);
 return {root,canvas,draw,drawMini,setCallbacks(next){callbacks={...callbacks,...next};},destroy(){observer.disconnect();root.remove();}};
}
window.DangoBingoView={mount,drawMini,paint,geometry};
})();

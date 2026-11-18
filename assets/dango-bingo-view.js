/* ダンゴデビンゴ: generated wagashi sprites with exact numbers and line geometry. */
(()=>{
'use strict';
const R=window.DangoBingoRules,TAU=Math.PI*2,clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
const tierInk=['#daae39','#f37b1d','#e44a9f','#cc64e4'];
const assetFiles={white:'dango-white.webp',green:'dango-green.webp',red:'dango-red.webp',gold:'dango-gold.webp',skewer:'bamboo-skewer.webp'};
const art={},assetListeners=new Set(),pendingMinis=new Map();
const usage={main:0,mini:0,lesson:0,skewers:0,cells:0},last={main:null,mini:null,lesson:null};
let assetsNotifyQueued=false;
const allAssetsReady=()=>Object.values(art).length===5&&Object.values(art).every(asset=>asset.loaded);
function spriteBounds(image,key){
 // Image-generation margins differ slightly between pieces. Inspect alpha once,
 // then sample the original bitmap at a consistent visible size. The source
 // files are never recolored or replaced with procedural circles.
 const width=image.naturalWidth,height=image.naturalHeight;
 try{
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
  const pixels=ctx.getImageData(0,0,width,height).data,columns=new Uint32Array(width),rows=new Uint32Array(height);let left=width,top=height,right=-1,bottom=-1;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const alpha=pixels[(y*width+x)*4+3];
   if(alpha>24){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
   if(alpha>128){columns[x]++;rows[y]++;}
  }
  if(key!=='skewer'){
   // Loose flour speckles and soft cast shadows are decorative pixels outside
   // the sweet. Fit the main opaque silhouette so adjacent dango really touch.
   const coreRun=counts=>{
    let maximum=0;for(const count of counts)maximum=Math.max(maximum,count);
    const minimum=Math.max(2,Math.ceil(maximum*.05));let start=-1,best=null;
    for(let i=0;i<=counts.length;i++){
     if(i<counts.length&&counts[i]>=minimum){if(start<0)start=i;}
     else if(start>=0){if(!best||i-start>best[1]-best[0])best=[start,i];start=-1;}
    }
    return best;
   };
   const x=coreRun(columns),y=coreRun(rows);if(x&&y)return [x[0],y[0],x[1]-x[0],y[1]-y[0]];
  }
  if(right>=left&&bottom>=top)return [left,top,right-left+1,bottom-top+1];
 }catch{}
 return [0,0,width,height];
}
function describeAssets(){
 return {revision:252,ready:allAssetsReady(),failed:Object.values(art).filter(asset=>asset.failed).map(asset=>asset.key),
  images:Object.values(art).map(({key,url,loaded,failed,image,crop})=>({key,url,loaded,failed,width:image.naturalWidth||0,height:image.naturalHeight||0,crop:crop.slice()})),
  usage:{...usage},last:{...last}};
}
function notifyAssets(){
 if(assetsNotifyQueued)return;assetsNotifyQueued=true;
 Promise.resolve().then(()=>{
  assetsNotifyQueued=false;
  for(const listener of assetListeners)listener();
  for(const [ctx,frame]of pendingMinis)paint(ctx,frame.state,frame.options,true);
  if(Object.values(art).every(asset=>asset.loaded||asset.failed))pendingMinis.clear();
 });
}
const assetsReady=Promise.all(Object.entries(assetFiles).map(([key,file])=>new Promise(resolve=>{
 const image=new Image(),asset=art[key]={key,url:'assets/dango-art-v252/'+file+'?v=252',image,loaded:false,failed:false,crop:[0,0,1,1]};
 image.decoding='async';image.onload=()=>{asset.crop=spriteBounds(image,key);asset.loaded=true;resolve(true);notifyAssets();};
 image.onerror=()=>{asset.failed=true;resolve(false);notifyAssets();console.warn('[Dango art] Could not load '+key);};
 image.src=asset.url;
}))).then(results=>results.every(Boolean));
function onAssetsChanged(listener){assetListeners.add(listener);return ()=>assetListeners.delete(listener);}
function bitmap(c,key,x,y,width,height){
 const asset=art[key];if(!asset?.loaded||!(width>0&&height>0))return false;
 c.drawImage(asset.image,...asset.crop,x,y,width,height);return true;
}
function geometry(width,height){
 const unit=Math.min(width/9.7,height/5.7),cx=width/2,cy=height/2;
 return {unit,radius:unit/2,width,height,centers:R.cells.map(c=>({id:c.id,x:cx+c.x*unit,y:cy+(c.row-2)*unit}))};
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
 const kind=o.oddsActivated?'gold':cell.manualFree?'red':cell.initialFree?'green':'white';
 const drawn=bitmap(c,kind,p.x-r,p.y-r,r*2,r*2);if(drawn)usage.cells++;
 if(cell.hit){
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
 return drawn?kind:null;
}
function skewer(c,line,g,progress,glow){
 const first=g.centers[line.cells[0]],last=g.centers[line.cells.at(-1)],dx=last.x-first.x,dy=last.y-first.y,d=Math.hypot(dx,dy),ux=dx/d,uy=dy/d;
 const ext=g.unit*.67,a={x:first.x-ux*ext,y:first.y-uy*ext},b={x:last.x+ux*ext,y:last.y+uy*ext};
 const x=a.x+(b.x-a.x)*progress,y=a.y+(b.y-a.y)*progress;
 const length=d+ext*2,thickness=g.unit*.15;
 c.save();c.translate(a.x,a.y);c.rotate(Math.atan2(dy,dx));
 c.beginPath();c.rect(0,-thickness*2,length,thickness*4);c.clip();
 if(glow){c.shadowColor='#ffc653';c.shadowBlur=g.unit*.18;}
 // Slide the entire generated skewer in from the first end. Its real pointed
 // tip, bamboo grain and highlights move together through the numbered dango.
 const drawn=bitmap(c,'skewer',-length*(1-progress),-thickness/2,length,thickness);
 c.restore();if(drawn)usage.skewers++;
 return {x,y,drawn};
}
function paint(ctx,state,options={},mini=false){
 if(!ctx||!state?.cells)return;
 const c=ctx,w=c.canvas.width,h=c.canvas.height,g=geometry(w,h),u=g.unit,r=g.radius;
 if(!w||!h||!u)return;
 c.save();c.clearRect(0,0,w,h);
 c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
 // Both surfaces stay transparent so the generated shop/serving background is
 // visible on the main board and each tab retains its existing theme backdrop.
 const mode=options.artUsage==='lesson'?'lesson':mini?'mini':'main';usage[mode]++;
 let imageCells=0;const kinds={white:0,green:0,red:0,gold:0};
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
  const kind=dango(c,cell,p,r,{...options,lastCell:state.lastCell,oddsActivated:cell.manualFree&&!cell.initialFree&&oddsHits.has(cell.number)});
  if(kind){imageCells++;kinds[kind]++;}
 }
 // The bamboo passes behind the dango. Its moving tip and sparkle stay visible,
 // while every number remains readable even when several lines intersect it.
 for(const tip of tips)if(tip.active)star(c,tip.point.x,tip.point.y,u*.19,'#fff1ae');
 if(!mini&&(state.lastOddsGain||state.lastBonusGain)&&options.age>=0&&options.age<1400&&state.lastCell!=null){
  const p=g.centers[state.lastCell],t=clamp(options.age/1400),x=Math.max(u*1.12,Math.min(w-u*1.12,p.x)),y=Math.max(u*.31,p.y-u*(.69+.34*t));
  c.save();c.globalAlpha=Math.min(1,(1-t)*3);roundBox(c,x-u*1.02,y-u*.22,u*2.04,u*.44,u*.16,state.lastOddsGain?'#aa7730':'#597f38');text(c,state.lastOddsGain?'ODDS ＋1':'FREE ＋1',x,y,u*.265,'#fff9d4');c.restore();
 }
 if(options.demo&&!mini){roundBox(c,w/2-u*.75,h/2-u*2.89,u*1.5,u*.38,u*.1,'#fff7ebdc');text(c,'DEMO',w/2,h/2-u*2.69,u*.24,'#8f5d4e');}
 last[mode]={width:w,height:h,cells:state.cells.length,imageCells,skewers:completed.size,imageSkewers:tips.filter(tip=>tip.point.drawn).length,kinds,transparentBackground:true};
 c.restore();
}
function drawMini(context,state,options={}){const ctx=typeof context?.getContext==='function'?context.getContext('2d'):context;if(ctx&&!allAssetsReady())pendingMinis.set(ctx,{state,options});paint(ctx,state,options,true);}
function drawLessonDango(ctx,x,y,r,kind,value,gold=false){
 usage.lesson++;
 return dango(ctx,{id:-1,number:value,initialFree:kind==='initial',manualFree:kind==='manual',hit:false},{x,y},r,{oddsActivated:gold&&kind==='manual'});
}
function formatWin(bet,hundredths){
 const value=typeof medalWin==='function'?medalWin(bet,hundredths):Math.floor(Math.max(0,bet)*hundredths/100);
 return String(value);
}
function mount(panel){
 const root=document.createElement('section');root.className='dgb-scene';root.setAttribute('aria-label','ダンゴデビンゴ');
 root.innerHTML='<div class="dgb-stage"><header class="dgb-status"><div><small class="dgb-phase-label">前半5球</small><b class="dgb-phase-value">0 / 5</b></div><div class="dgb-free-stat"><small>配置できるFREE</small><b class="dgb-free-value">あと1個</b><span class="dgb-free-detail">配置0 / 1個</span></div></header><div class="dgb-pan"><canvas role="img"></canvas><div class="dgb-cell-controls" role="group" aria-label="FREEを置くお団子"></div></div><div class="dgb-legend"><span><i class="dgb-initial-mark"></i>初期FREE：前半HITで配置＋1</span><span><i class="dgb-player-mark"></i>配置FREE：後半HITでODDS＋1</span></div><footer class="dgb-placement"><div class="dgb-placement-copy"><strong class="dgb-prompt">まずは5球！</strong><span class="dgb-countdown"></span></div><div class="dgb-actions"><button type="button" data-action="auto">おまかせ</button></div></footer></div><aside class="dgb-pay"><header class="dgb-pay-heading"><div class="dgb-pay-title">串の本数で WIN</div><div class="dgb-pay-odds"><small>ODDS</small><b class="dgb-odds-value">×1</b></div></header><table aria-label="ラインの長さと完成本数による配当"><thead><tr><th scope="col">マス数</th><th scope="col">1本</th><th scope="col">2本</th><th scope="col">3本</th><th scope="col">4本以上</th></tr></thead><tbody></tbody></table><p>各行の該当配当を合計（ODDS反映済み）</p></aside><div class="dgb-live" role="status" aria-live="polite" aria-atomic="true"></div>';
 panel.append(root);
 const find=s=>root.querySelector(s),pan=find('.dgb-pan'),canvas=pan.querySelector('canvas'),ctx=canvas.getContext('2d'),controls=find('.dgb-cell-controls'),rows=[];
 const table=find('tbody');
 for(const length of [3,4,5,7,9]){
  const tr=document.createElement('tr');tr.dataset.length=String(length);
  const th=document.createElement('th');th.scope='row';th.innerHTML='<b>'+length+'</b>マス';tr.append(th);
  for(let count=1;count<=4;count++){
   const row=R.payRows.find(item=>item.length===length&&item.count===count),td=document.createElement('td');td.dataset.valid=String(!!row);td.dataset.column=String(count);
   if(row){td.dataset.count=String(count);td.dataset.atLeast=String(row.atLeast);td.innerHTML='<span class="gold-number">0</span>';rows.push({row,tr,td,value:'0'});}
   else{td.textContent='—';td.setAttribute('aria-label','該当なし');}
   tr.append(td);
  }
  table.append(tr);
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
 find('[data-action="auto"]').addEventListener('click',()=>callbacks.onAuto?.());
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
  const payoutUnit=Math.max(.45,Math.min(root.clientWidth/560,root.clientHeight/390));
  for(const item of rows){
   const available=Math.max(8,(item.td.clientWidth||root.clientWidth*.17)-8*payoutUnit);
   if(typeof fitGoldenNumber==='function')fitGoldenNumber(item.td,item.value,14*payoutUnit,available);
   else item.td.querySelector('.gold-number').textContent=item.value;
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
  find('.dgb-free-value').textContent='あと'+state.freeRemaining+'個';
  find('.dgb-free-detail').textContent='配置'+state.manualFreeCells.length+' / '+state.freeBudget+'個';
  find('.dgb-odds-value').textContent='×'+state.oddsMultiplier;
  controls.hidden=!placing;find('.dgb-actions').hidden=!placing;
  for(const cell of state.cells){
   const b=buttons[cell.id];b.disabled=!editable||cell.initialFree||cell.hit||(!cell.manualFree&&!state.freeRemaining);b.setAttribute('aria-pressed',String(cell.manualFree));b.classList.toggle('placed',cell.manualFree);
   b.setAttribute('aria-label',cell.number+'番'+(cell.initialFree?' 初期FREE':cell.hit?' HIT済み':cell.manualFree?' 配置したFREE・取り消す':' FREEを置く'));
  }
  refreshFocus();
  find('[data-action="auto"]').disabled=!editable||!state.freeRemaining;
  find('.dgb-prompt').textContent=o.demo?'前半5球 → FREE配置 → 後半3球':placing?state.freeRemaining?'お団子を選んで、あと'+state.freeRemaining+'個配置':'赤い団子をタップすると取り消せます':state.phase==='done'?'完成した串の配当を合計':second?'配置FREEの番号が出ると ODDS UP！':'初期FREEに前半HITすると、配置FREE＋1';
  const seconds=Number(o.remainingMs);find('.dgb-countdown').textContent=placing&&Number.isFinite(seconds)?Math.max(0,Math.ceil(seconds/1000))+'秒':placing?'まもなく後半':'';
  find('.dgb-countdown').classList.toggle('urgent',placing&&Number.isFinite(seconds)&&seconds<=5000);
  for(const item of rows){
   const count=state.lineCounts[item.row.length]||0,current=item.row.atLeast?count>=item.row.count:count===item.row.count;
   item.tr.dataset.completed=String(count);item.td.classList.toggle('current',current);item.td.setAttribute('aria-current',current?'true':'false');
   item.value=formatWin(Number(o.bet)||0,item.row.hundredths*state.oddsMultiplier);item.td.setAttribute('aria-label',item.row.label+' '+item.value+' WIN');
  }
  canvas.setAttribute('aria-label','25個のお団子。'+drawCount+'球、完成した串'+state.completedLines.length+'本、初期FREE'+state.initialFreeCells.length+'個、配置FREE'+state.manualFreeCells.length+'個、ODDS'+state.oddsMultiplier+'倍。');
  const live=[state.phase,drawCount,state.freeBudget,state.freeRemaining,state.completedLines.length,state.oddsMultiplier].join('/');
  if(live!==lastLive){lastLive=live;find('.dgb-live').textContent=find('.dgb-prompt').textContent+'。完成した串'+state.completedLines.length+'本、ODDS'+state.oddsMultiplier+'倍。';}
  fit();
 }
 const refreshArt=()=>{root.dataset.artReady=String(allAssetsReady());root.dataset.artFailed=String(Object.values(art).some(asset=>asset.failed));fit();};
 const offArt=onAssetsChanged(refreshArt),observer=new ResizeObserver(fit);observer.observe(root);observer.observe(pan);refreshArt();
 return {root,canvas,draw,drawMini,setCallbacks(next){callbacks={...callbacks,...next};},destroy(){offArt();observer.disconnect();root.remove();}};
}
window.DangoBingoView={mount,drawMini,paint,geometry,drawLessonDango,assetsReady,describeAssets,onAssetsChanged};
})();

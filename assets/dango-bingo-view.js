/* ダンゴデビンゴ: generated mochi on a tsukimi stand, colored luminous skewers. */
(()=>{
'use strict';
const R=window.DangoBingoRules,TAU=Math.PI*2,clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
const LINE_COLORS=Object.freeze({3:'#269eff',4:'#42e57c',5:'#ffe34b',7:'#ff4667',9:'#bf6bff'});
const PAY_LAYOUT=Object.freeze({label:1.03,column:.8,header:.27,row:.46,oddsWidth:1.55,oddsHeight:.46,oddsGap:.10,anchor:.08});
const highestRoleCell=(length,count)=>typeof R.isHighestRole==='function'?R.isHighestRole(length,count):count>=({3:4,4:3,5:2,7:1,9:1}[length]??Infinity);
const tierInk=['#21ddd5','#ff3c66','#bc58ff','#ffe383'];
const assetFiles={white:'dango-art-v252/dango-white.webp',green:'dango-art-v253/dango-green.webp',pink:'dango-art-v253/dango-pink.webp',yellow:'dango-art-v253/dango-yellow.webp',rainbow:'dango-art-v253/dango-rainbow.webp',skewer:'dango-art-v252/bamboo-skewer.webp',stand:'dango-art-v253/tsukimi-stand.webp'};
const art={},assetListeners=new Set(),pendingMinis=new Map();
const usage={main:0,mini:0,lesson:0,skewers:0,cells:0,stands:0},last={main:null,mini:null,lesson:null};
let assetsNotifyQueued=false;
const allAssetsReady=()=>Object.keys(art).length===Object.keys(assetFiles).length&&Object.values(art).every(asset=>asset.loaded);
function spriteBounds(image,key){
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
  if(!['skewer','stand'].includes(key)){
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
 return {revision:253,presentationRevision:254,ready:allAssetsReady(),failed:Object.values(art).filter(asset=>asset.failed).map(asset=>asset.key),
  images:Object.values(art).map(({key,url,loaded,failed,image,crop})=>({key,url,loaded,failed,width:image.naturalWidth||0,height:image.naturalHeight||0,crop:crop.slice()})),
  usage:{...usage},last:{...last},lineColors:{...LINE_COLORS}};
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
 const image=new Image(),asset=art[key]={key,url:'assets/'+file+'?v=253',image,loaded:false,failed:false,crop:[0,0,1,1]};
 image.decoding='async';image.onload=()=>{asset.crop=spriteBounds(image,key);asset.loaded=true;resolve(true);notifyAssets();};
 image.onerror=()=>{asset.failed=true;resolve(false);notifyAssets();console.warn('[Dango art] Could not load '+key);};
 image.src=asset.url;
}))).then(results=>results.every(Boolean));
function onAssetsChanged(listener){assetListeners.add(listener);return ()=>assetListeners.delete(listener);}
function bitmap(c,key,x,y,width,height){
 const asset=art[key];if(!asset?.loaded||!(width>0&&height>0))return false;
 c.drawImage(asset.image,...asset.crop,x,y,width,height);return true;
}
function geometry(width,height,{layout='main'}={}){
 const main=layout==='main',unit=Math.min(width/(main?9.85:9.7),height/(main?6.8:6.15)),cx=main?Math.min(width*.55,width-unit*4.72):width/2,top=height-unit*(main?6.22:5.65);
 return {layout:main?'main':'compact',unit,radius:unit/2,width,height,cx,top,
  centers:R.cells.map(c=>({id:c.id,x:cx+c.x*unit,y:top+c.row*unit})),
  stand:{x:cx-unit*4.72,y:top+unit*(main?4.27:4.18),width:unit*9.44,height:unit*(main?1.75:1.25)}};
}
// Fit the real ragged silhouette, rather than its rectangular bounding box,
// into the space beside the piled mochi. The same logical geometry drives
// both the canvas and FREE hit targets, including scaled arcade cabinets.
function payoutLayout(width,height){
 const g=geometry(width,height),p=PAY_LAYOUT,anchor=g.unit*p.anchor,clearance=g.unit*.59;
 const free={x:width-g.unit*2.37,y:g.unit*.12,width:g.unit*2.25,height:g.unit*1.77};
 const rectsAt=scale=>{
  const u=g.unit*scale,rects=[{kind:'header',x:anchor+p.label*u,y:anchor,width:p.column*4*u,height:p.header*u}];
  for(const [i,count]of [4,4,3,1,1].entries())rects.push({kind:'row',length:[3,4,5,7,9][i],x:anchor,y:anchor+(p.header+i*p.row)*u,width:(p.label+count*p.column)*u,height:p.row*u});
  rects.push({kind:'odds',x:anchor,y:anchor+(p.header+p.row*5+p.oddsGap)*u,width:p.oddsWidth*u,height:p.oddsHeight*u});return rects;
 };
 const distance=(rect,point)=>Math.hypot(point.x-Math.max(rect.x,Math.min(rect.x+rect.width,point.x)),point.y-Math.max(rect.y,Math.min(rect.y+rect.height,point.y)));
 const fits=scale=>rectsAt(scale).every(rect=>
  rect.x+rect.width<=width-anchor&&rect.y+rect.height<=height-anchor&&
  !(rect.x<free.x+free.width&&rect.x+rect.width>free.x&&rect.y<free.y+free.height&&rect.y+rect.height>free.y)&&
  g.centers.every(point=>distance(rect,point)>=clearance));
 let lo=0,hi=Math.max(0,Math.min((width-anchor*2)/(g.unit*(p.label+p.column*4)),(height-anchor*2)/(g.unit*(p.header+p.row*5+p.oddsGap+p.oddsHeight))));
 for(let i=0;i<22;i++){const mid=(lo+hi)/2;if(fits(mid))lo=mid;else hi=mid;}
 const scale=Math.floor(lo*1000)/1000,unit=g.unit*scale,rects=rectsAt(scale);
 return {scale,unit,anchor,width:(p.label+p.column*4)*unit,height:(p.header+p.row*5+p.oddsGap+p.oddsHeight)*unit,clearance,rects,minClearance:Math.min(...rects.flatMap(rect=>g.centers.map(point=>distance(rect,point))))};
}
function disc(c,x,y,r,fill){c.beginPath();c.arc(x,y,r,0,TAU);c.fillStyle=fill;c.fill();}
function roundBox(c,x,y,w,h,r,fill){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();}
function segment(c,x1,y1,x2,y2,width,color){c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.lineWidth=width;c.lineCap='round';c.strokeStyle=color;c.stroke();}
function text(c,value,x,y,size,color,weight=900){c.font=weight+' '+size+'px ElixirNumbers,"Yu Gothic",Meiryo,system-ui,sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillStyle=color;c.fillText(String(value),x,y);}
function number(c,value,x,y,size){
 if(typeof drawElixirNumber==='function')drawElixirNumber(c,value,x,y,size,'#4d3028','#fffceb',size*.072);
 else{c.font='900 '+size+'px ElixirNumbers,system-ui,sans-serif';c.textAlign='center';c.textBaseline='middle';c.lineWidth=size*.11;c.strokeStyle='#fffceb';c.strokeText(String(value),x,y);c.fillStyle='#4d3028';c.fillText(String(value),x,y);}
}
function star(c,x,y,r,ink){
 c.beginPath();for(let k=0;k<10;k++){const a=-Math.PI/2+k*Math.PI/5,rr=r*(k%2?.44:1);k?c.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr):c.moveTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);}c.closePath();c.fillStyle=ink;c.fill();
}
function ambientTime(options){return options.reducedMotion||options.paused?0:Number(options.time)||0;}
function dangoKind(cell,oddsActivated){return oddsActivated?'rainbow':cell.manualFree?'yellow':cell.hit?'pink':cell.initialFree?'green':'white';}
function dangoBody(c,cell,p,r,options){
 const kind=dangoKind(cell,options.oddsActivated),still=options.reducedMotion||options.paused;
 const cycle=still?0:(1-Math.cos(ambientTime(options)/2700*TAU+cell.id*.41))/2;
 // The main silhouette never shrinks below the cell diameter. A tiny overlap
 // keeps the piled sweets touching throughout their slow, soft compression.
 const sx=1.012+cycle*.025,sy=1.022-cycle*.02;
 const drawn=bitmap(c,kind,p.x-r*sx,p.y-r*sy,r*2*sx,r*2*sy);if(drawn)usage.cells++;
 return drawn?kind:null;
}
function dangoLabels(c,cell,p,r,o){
 const label=cell.initialFree||cell.manualFree;
 if(cell.hit){
  const y=p.y-r*(label?.73:.66),size=r*(label?.34:.40);
  c.save();c.font='1000 '+size+'px SweetReachRounded,"Yu Gothic",Meiryo,system-ui,sans-serif';c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';
  c.lineWidth=Math.max(.7,r*.08);c.strokeStyle='#fff9df';c.strokeText('HIT!',p.x,y);c.fillStyle='#ad245b';c.fillText('HIT!',p.x,y);c.restore();
 }
 if(label){
  const by=p.y+r*.69,fill=cell.initialFree?'#315d16':o.oddsActivated?'#693b93':'#774600';
  c.save();c.shadowColor='#fff6c9';c.shadowBlur=r*.09;
  roundBox(c,p.x-r*.76,by-r*.245,r*1.52,r*.49,r*.13,fill);
  c.lineWidth=Math.max(.6,r*.04);c.strokeStyle=cell.initialFree?'#eaff91':'#fff49f';c.stroke();
  text(c,'FREE',p.x,by+r*.015,r*.40,'#fffde1');c.restore();
 }
 const numberY=cell.hit?(label?-.06:.13):label?-.10:0,numberSize=cell.hit?(label?(cell.number>=10?.88:1):(cell.number>=10?1:1.16)):(cell.number>=10?1.07:1.21);
 number(c,cell.number,p.x,p.y+r*numberY,r*numberSize);
 if(cell.id===o.lastCell&&Number.isFinite(o.age)&&o.age<500){
  const t=clamp(o.age/500);c.save();c.globalAlpha=1-t;c.beginPath();c.arc(p.x,p.y,r*(1.05+.6*t),0,TAU);c.lineWidth=r*.08;c.strokeStyle='#fff5ad';c.stroke();c.restore();
 }
}
function skewerEnds(line,g){
 const first=g.centers[line.cells[0]],last=g.centers[line.cells.at(-1)],dx=last.x-first.x,dy=last.y-first.y,d=Math.hypot(dx,dy),ux=dx/d,uy=dy/d,ext=g.unit*.62;
 return {a:{x:first.x-ux*ext,y:first.y-uy*ext},b:{x:last.x+ux*ext,y:last.y+uy*ext},dx,dy,d,length:d+ext*2};
}
function skewer(c,line,g,progress){
 const z=skewerEnds(line,g),thickness=g.unit*.16;
 c.save();c.translate(z.a.x,z.a.y);c.rotate(Math.atan2(z.dy,z.dx));
 c.beginPath();c.rect(0,-thickness*2,z.length,thickness*4);c.clip();
 const drawn=bitmap(c,'skewer',-z.length*(1-progress),-thickness/2,z.length,thickness);
 c.restore();if(drawn)usage.skewers++;
 return {...z,drawn,progress};
}
function luminousSkewer(c,line,g,z,time,still){
 const ink=LINE_COLORS[line.length],u=g.unit,b={x:z.a.x+(z.b.x-z.a.x)*z.progress,y:z.a.y+(z.b.y-z.a.y)*z.progress};
 c.save();c.shadowColor=ink;c.shadowBlur=u*.15;
 segment(c,z.a.x,z.a.y,b.x,b.y,u*.175,'#161627b8');
 segment(c,z.a.x,z.a.y,b.x,b.y,u*.112,ink);
 c.shadowBlur=0;segment(c,z.a.x,z.a.y,b.x,b.y,u*.025,'#fffce0b8');
 // A bright streak travels along the colored skewer, above the mochi bitmap
 // and below the number/FREE lettering. The line remains legible at rest too.
 const t=still?.48:((time/2100+line.id*.137)%1),tail=Math.max(0,t-.15),head=Math.min(z.progress,t);
 if(head>tail){
  const p=a=>({x:z.a.x+(z.b.x-z.a.x)*a,y:z.a.y+(z.b.y-z.a.y)*a}),a=p(tail),b=p(head);
  const gradient=c.createLinearGradient(a.x,a.y,b.x,b.y);gradient.addColorStop(0,ink+'00');gradient.addColorStop(.65,'#ffffffc9');gradient.addColorStop(1,'#fffef2');
  c.shadowColor='#fffdeb';c.shadowBlur=u*.13;segment(c,a.x,a.y,b.x,b.y,u*.072,gradient);star(c,b.x,b.y,u*.075,'#fffce6');
 }
 for(const p of [z.a,b]){disc(c,p.x,p.y,u*.074,'#151627');disc(c,p.x,p.y,u*.052,ink);}
 c.restore();
}
function reachOrbit(c,cell,p,r,hit,time,still,mini){
 const tier=Math.max(0,Math.min(3,Number(hit.tier)||0)),ink=tierInk[tier],rr=r*1.04,lap=(time/(tier===2?1750:2250)+cell.id*.037)*TAU;
 c.save();c.shadowColor=ink;c.shadowBlur=r*.27;c.lineWidth=Math.max(.9,r*.085);c.strokeStyle=ink;c.globalAlpha=still?.88:.68+.18*Math.sin(time/440+cell.id);c.beginPath();c.arc(p.x,p.y,rr,0,TAU);c.stroke();c.globalAlpha=1;
 const comets=tier>=2?2:1;
 for(let k=0;k<comets;k++){
  const head=(still?-.7:lap)+k*Math.PI;
  for(let i=0;i<7;i++){
   const a=head-(7-i)*.11;c.globalAlpha=.16+i*.12;c.lineWidth=r*(.06+i*.014);c.strokeStyle=tier===3?['#ff597b','#ffcf55','#b6f06a','#53dedb','#64a9ff','#b994ff','#fff6e7'][i]:ink;c.beginPath();c.arc(p.x,p.y,rr,a,a+.15);c.stroke();
  }
  c.globalAlpha=1;c.shadowColor='#fffce7';c.lineWidth=r*.09;c.strokeStyle='#fffde6';c.beginPath();c.arc(p.x,p.y,rr,head-.06,head+.035);c.stroke();
 }
 if(!mini){
  const label=['リーチ','高額','超高額','最高役'][tier],y=p.y-r*.83;
  c.shadowBlur=0;c.font='900 '+r*.31+'px SweetReachRounded,"Yu Gothic",Meiryo,sans-serif';c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';c.lineWidth=Math.max(1,r*.11);c.strokeStyle='#fff9e8';c.strokeText(label,p.x,y);c.fillStyle=tier===0?'#008b8d':tier===1?'#df254b':tier===2?'#9226be':'#a62a7e';c.fillText(label,p.x,y);
 }
 c.restore();
}
function paint(ctx,state,options={},mini=false){
 if(!ctx||!state?.cells)return;
 const c=ctx,w=c.canvas.width,h=c.canvas.height,mode=options.artUsage==='lesson'?'lesson':mini?'mini':'main',g=geometry(w,h,{layout:mode==='main'?'main':'compact'}),u=g.unit,r=g.radius;
 if(!w||!h||!u)return;
 const time=ambientTime(options),still=!!(options.reducedMotion||options.paused);
 c.save();c.clearRect(0,0,w,h);c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';usage[mode]++;
 const stand=g.stand,standRendered=bitmap(c,'stand',stand.x,stand.y,stand.width,stand.height);if(standRendered)usage.stands++;
 let imageCells=0;const kinds={white:0,green:0,pink:0,yellow:0,rainbow:0};
 const animation=options.animationLines||state.newLines||[],age=options.lineAge??options.age??Infinity,completed=new Set(state.completedLines||[]),skewers=[];
 for(const lineId of completed){
  const line=R.lines[lineId];if(!line)continue;
  const order=animation.indexOf(lineId),progress=still||order<0?1:smooth((age-order*150)/490);
  if(progress<=0)continue;skewers.push({line,z:skewer(c,line,g,progress)});
 }
 const reaches=new Map((options.reach||[]).filter(x=>x.gain>0||x.gainHundredths>0).map(x=>[x.n??x.number,x])),oddsHits=new Set(state.oddsHits||[]);
 const cellOptions=cell=>({...options,lastCell:state.lastCell,oddsActivated:cell.manualFree&&!cell.initialFree&&oddsHits.has(cell.number)});
 for(const cell of state.cells){const kind=dangoBody(c,cell,g.centers[cell.id],r,cellOptions(cell));if(kind){imageCells++;kinds[kind]++;}}
 for(const {line,z}of skewers)luminousSkewer(c,line,g,z,time,still);
 for(const cell of state.cells){
  const p=g.centers[cell.id],reach=reaches.get(cell.number);
  if(reach&&!cell.hit)reachOrbit(c,cell,p,r,reach,time,still,mini);
  dangoLabels(c,cell,p,r,cellOptions(cell));
 }
 if(!mini&&(state.lastOddsGain||state.lastBonusGain)&&options.age>=0&&options.age<1400&&state.lastCell!=null){
  const p=g.centers[state.lastCell],t=clamp(options.age/1400),x=Math.max(u*1.12,Math.min(w-u*1.12,p.x)),y=Math.max(u*.31,p.y-u*(.69+.34*t));
  c.save();c.globalAlpha=Math.min(1,(1-t)*3);roundBox(c,x-u*1.02,y-u*.22,u*2.04,u*.44,u*.16,state.lastOddsGain?'#713daa':'#446c20');text(c,state.lastOddsGain?'ODDS ＋1':'FREE ＋1',x,y,u*.265,'#fff9d4');c.restore();
 }
 last[mode]={width:w,height:h,cells:state.cells.length,imageCells,skewers:completed.size,imageSkewers:skewers.filter(t=>t.z.drawn).length,kinds,transparentBackground:true,standRendered,geometry:g,lineColors:[...new Set(skewers.map(t=>t.line.length))].map(length=>({length,color:LINE_COLORS[length]})),reachCount:reaches.size,ambientTime:time,idleMotion:!still,hitLabels:state.cells.filter(cell=>cell.hit).length,hitLabel:'HIT!'};
 c.restore();
}
function drawMini(context,state,options={}){const ctx=typeof context?.getContext==='function'?context.getContext('2d'):context;if(ctx&&!allAssetsReady())pendingMinis.set(ctx,{state,options});paint(ctx,state,options,true);}
function drawLessonDango(ctx,x,y,r,kind,value,rainbow=false){
 usage.lesson++;const cell={id:-1,number:value,initialFree:kind==='initial',manualFree:kind==='manual',hit:kind==='hit'||rainbow&&kind==='manual'},o={oddsActivated:rainbow&&kind==='manual',reducedMotion:true};
 const drawn=dangoBody(ctx,cell,{x,y},r,o);dangoLabels(ctx,cell,{x,y},r,o);return drawn;
}
function formatWin(bet,hundredths){const value=typeof medalWin==='function'?medalWin(bet,hundredths):Math.floor(Math.max(0,bet)*hundredths/100);return String(value);}
function mount(panel){
 const root=document.createElement('section');root.className='dgb-scene';root.setAttribute('aria-label','ダンゴデビンゴ');
 root.innerHTML='<div class="dgb-stage"><div class="dgb-pan"><canvas role="img"></canvas><div class="dgb-cell-controls" role="group" aria-label="FREEを置くお団子"></div></div></div><aside class="dgb-pay"><table aria-label="ラインの長さと完成本数による配当・ODDS反映済み"><colgroup><col class="dgb-row-label"><col><col><col><col></colgroup><thead><tr><th scope="col"><span class="dgb-live">ライン</span></th><th scope="col">1本</th><th scope="col">2本</th><th scope="col">3本</th><th scope="col">4本以上</th></tr></thead><tbody></tbody></table><div class="dgb-pay-odds"><small>ODDS</small><b class="dgb-odds-value">×1</b></div></aside><div class="dgb-free-stat"><small>置けるFREE</small><b class="dgb-free-value">あと1個</b><span class="dgb-free-detail">配置0 / 1個</span><div class="dgb-placement"><span class="dgb-countdown"></span><div class="dgb-actions"><button type="button" data-action="auto">おまかせ</button></div></div></div><div class="dgb-prompt dgb-live"></div><div class="dgb-live dgb-announcement" role="status" aria-live="polite" aria-atomic="true"></div>';
 panel.append(root);
 const find=s=>root.querySelector(s),pan=find('.dgb-pan'),canvas=pan.querySelector('canvas'),ctx=canvas.getContext('2d'),controls=find('.dgb-cell-controls'),rows=[];
 const table=find('tbody');
 for(const length of [3,4,5,7,9]){
  const tr=document.createElement('tr');tr.dataset.length=String(length);tr.style.setProperty('--dgb-line-color',LINE_COLORS[length]);
  const th=document.createElement('th');th.scope='row';th.innerHTML='<b>'+length+'</b>個ライン';tr.append(th);
  for(const row of R.payRows.filter(item=>item.length===length)){
   const td=document.createElement('td');td.dataset.valid='true';td.dataset.column=td.dataset.count=String(row.count);td.dataset.atLeast=String(row.atLeast);td.dataset.highestRole=String(highestRoleCell(row.length,row.count));td.innerHTML='<span class="gold-number">0</span>';rows.push({row,tr,td,value:'0'});tr.append(td);
  }
  table.append(tr);
 }
 let state=null,options={},callbacks={},focusId=0,lastLive='',domKey='',sizeKey='',payGeometry=null;
 const motionMedia=matchMedia('(prefers-reduced-motion: reduce)');
 function syncMotion(){
  const reduced=!!(options.reducedMotion||motionMedia.matches),paused=!!(options.paused||reduced||document.hidden);
  if(root.dataset.motionPaused!==String(paused))root.dataset.motionPaused=String(paused);
  if(root.dataset.motionReduced!==String(reduced))root.dataset.motionReduced=String(reduced);
 }
 const buttons=R.cells.map(cell=>{
  const button=document.createElement('button');button.type='button';button.className='dgb-cell';button.dataset.cellId=String(cell.id);button.tabIndex=-1;
  button.addEventListener('click',()=>callbacks.onCell?.(cell.id));button.addEventListener('focus',()=>{focusId=cell.id;refreshFocus();});
  button.addEventListener('keydown',event=>{
   if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
   event.preventDefault();const candidates=buttons.filter(b=>!b.disabled);if(!candidates.length)return;
   if(event.key==='Home'||event.key==='End'){(event.key==='Home'?candidates[0]:candidates.at(-1)).focus();return;}
   const origin=R.cells[cell.id],horizontal=event.key==='ArrowLeft'||event.key==='ArrowRight',direction=event.key==='ArrowLeft'||event.key==='ArrowUp'?-1:1;
   const next=candidates.map(b=>{const c=R.cells[Number(b.dataset.cellId)],dx=c.x-origin.x,dy=c.row-origin.row;return {b,delta:horizontal?dx:dy,score:horizontal?Math.abs(dx)+Math.abs(dy)*5:Math.abs(dy)*2+Math.abs(dx)};}).filter(x=>x.delta*direction>0).sort((a,b)=>a.score-b.score)[0];next?.b.focus();
  });controls.append(button);return button;
 });
 find('[data-action="auto"]').addEventListener('click',()=>callbacks.onAuto?.());
 function refreshFocus(){if(buttons[focusId]?.disabled){const next=buttons.find(b=>!b.disabled);focusId=next?Number(next.dataset.cellId):-1;}for(const b of buttons)b.tabIndex=Number(b.dataset.cellId)===focusId&&!b.disabled?0:-1;}
 function fit(){
  const box=pan.getBoundingClientRect(),scale=Math.min(2,window.devicePixelRatio||1),width=Math.max(1,Math.round(box.width*scale)),height=Math.max(1,Math.round(box.height*scale));
  if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
  const nextSize=[pan.clientWidth,pan.clientHeight,root.clientWidth,root.clientHeight].join('/'),g=geometry(pan.clientWidth,pan.clientHeight);
  if(sizeKey!==nextSize){
   sizeKey=nextSize;payGeometry=payoutLayout(pan.clientWidth,pan.clientHeight);root.style.setProperty('--dgb-unit',g.unit+'px');root.style.setProperty('--dgb-u',Math.max(.45,g.unit/55)+'px');root.style.setProperty('--dgb-pay-unit',payGeometry.unit+'px');root.dataset.payScale=String(payGeometry.scale);
   for(const p of g.centers){const b=buttons[p.id];b.style.left=p.x+'px';b.style.top=p.y+'px';b.style.width=g.unit*.94+'px';b.style.height=g.unit*.94+'px';}
  }
  for(const item of rows){
   const u=payGeometry?.unit||g.unit,available=Math.max(8,(item.td.clientWidth||u*PAY_LAYOUT.column)-u*.12);
   if(typeof fitGoldenNumber==='function')fitGoldenNumber(item.td,item.value,u*.28,available);else item.td.querySelector('.gold-number').textContent=item.value;
  }
  if(state)paint(ctx,state,options,false);
 }
 function draw(next,o={}){
  if(!next)return;options=o;syncMotion();const key=[o.bet,o.demo,o.placementLocked,Math.ceil(Number(o.remainingMs)/1000)].join('/');
  if(state===next&&key===domKey){paint(ctx,state,options,false);return;}
  state=next;options=o;domKey=key;
  const placing=!o.demo&&state.phase==='placing',editable=placing&&!o.placementLocked,drawCount=state.draws.length,second=state.phase==='draw-final'||state.phase==='done';
  root.dataset.phase=state.phase;root.dataset.demo=o.demo?'true':'false';root.dataset.cells=String(state.cells.length);root.dataset.skewers=String(state.completedLines.length);root.dataset.multiplier=String(state.oddsMultiplier);
  find('.dgb-free-value').textContent='あと'+state.freeRemaining+'個';find('.dgb-free-detail').textContent='配置'+state.manualFreeCells.length+' / '+state.freeBudget+'個';find('.dgb-odds-value').textContent='×'+state.oddsMultiplier;
  controls.hidden=!placing;find('.dgb-placement').hidden=!placing;find('.dgb-actions').hidden=!placing;
  for(const cell of state.cells){const b=buttons[cell.id];b.disabled=!editable||cell.initialFree||cell.hit||(!cell.manualFree&&!state.freeRemaining);b.setAttribute('aria-pressed',String(cell.manualFree));b.classList.toggle('placed',cell.manualFree);b.setAttribute('aria-label',cell.number+'番'+(cell.initialFree?' 初期FREE':cell.hit?' HIT済み':cell.manualFree?' 配置したFREE・取り消す':' FREEを置く'));}
  refreshFocus();find('[data-action="auto"]').disabled=!editable||!state.freeRemaining;
  find('.dgb-prompt').textContent=o.demo?'前半5球 → FREE配置 → 後半3球':placing?state.freeRemaining?'お団子を選んで、あと'+state.freeRemaining+'個配置':'黄色い団子をタップすると取り消せます':state.phase==='done'?'完成した串の配当を合計':second?'配置FREEの番号が出ると ODDS UP！':'初期FREEに前半HITすると、配置FREE＋1';
  const seconds=Number(o.remainingMs);find('.dgb-countdown').textContent=placing&&Number.isFinite(seconds)?Math.max(0,Math.ceil(seconds/1000))+'秒':placing?'後半待ち':'';find('.dgb-countdown').classList.toggle('urgent',placing&&Number.isFinite(seconds)&&seconds<=5000);
  const payRows=typeof R.payRowsFor==='function'?R.payRowsFor(state):R.payRows.map(row=>({...row,hundredths:row.hundredths*state.oddsMultiplier}));
  for(const item of rows){
   const row=payRows.find(row=>row.length===item.row.length&&row.count===item.row.count)||item.row,count=state.lineCounts[row.length]||0,current=row.atLeast?count>=row.count:count===row.count;
   item.tr.dataset.completed=String(count);item.td.classList.toggle('current',current);item.td.setAttribute('aria-current',current?'true':'false');item.value=formatWin(Number(o.bet)||0,row.hundredths);item.td.setAttribute('aria-label',row.length+'個ライン '+row.count+'本'+(row.atLeast?'以上':'')+' '+item.value+' WIN'+(highestRoleCell(row.length,row.count)?' 最高役':'')+(current?' GET!':''));
  }
  canvas.setAttribute('aria-label','25個のお団子。'+drawCount+'球、完成した串'+state.completedLines.length+'本、初期FREE'+state.initialFreeCells.length+'個、配置FREE'+state.manualFreeCells.length+'個、ODDS'+state.oddsMultiplier+'倍。');
  const live=[state.phase,drawCount,state.freeBudget,state.freeRemaining,state.completedLines.length,state.oddsMultiplier].join('/');
  if(live!==lastLive){lastLive=live;find('.dgb-announcement').textContent=find('.dgb-prompt').textContent+'。完成した串'+state.completedLines.length+'本、ODDS'+state.oddsMultiplier+'倍。';}
  fit();
 }
 const refreshArt=()=>{root.dataset.artReady=String(allAssetsReady());root.dataset.artFailed=String(Object.values(art).some(asset=>asset.failed));fit();};
 const offArt=onAssetsChanged(refreshArt),observer=new ResizeObserver(fit);observer.observe(root);observer.observe(pan);document.addEventListener('visibilitychange',syncMotion);motionMedia.addEventListener?.('change',syncMotion);syncMotion();refreshArt();
 return {root,canvas,draw,drawMini,setCallbacks(next){callbacks={...callbacks,...next};},describe(){return {revision:254,payout:payGeometry,highestCells:rows.filter(item=>item.td.dataset.highestRole==='true').map(item=>({length:item.row.length,count:item.row.count})),earnedCells:rows.filter(item=>item.td.classList.contains('current')).map(item=>({length:item.row.length,count:item.row.count,win:item.value})),paused:root.dataset.motionPaused==='true'||document.body.classList.contains('paused')||document.body.classList.contains('player-menu-open')};},destroy(){offArt();observer.disconnect();document.removeEventListener('visibilitychange',syncMotion);motionMedia.removeEventListener?.('change',syncMotion);root.remove();}};
}
const hasAmbientMotion=(state,options={})=>!!state?.cells&&!options.reducedMotion&&!options.paused;
window.DangoBingoView={mount,drawMini,paint,geometry,payoutLayout,drawLessonDango,assetsReady,describeAssets,onAssetsChanged,hasAmbientMotion,lineColors:LINE_COLORS};
})();

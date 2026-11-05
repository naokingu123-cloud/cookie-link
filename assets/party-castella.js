/* The large griddle and tab preview share the same 37 wells and drawn channels. */
(()=>{
'use strict';
const R=window.PartyCastellaRules,tiles=new Image(),panArt=new Image(),reduced=matchMedia('(prefers-reduced-motion: reduce)');
tiles.src='assets/party-castella-tiles.webp?v=116';
panArt.src='assets/party-castella-pan.webp?v=116';
const sides=['①','②','③','④','⑤','⑥','朱','藍'];
const zoneColors=['#f08d80','#f3b45d','#b2cb77','#70cdc1','#82b9ef','#c3a6e3','#fa8073','#9badec'];
const zoneAngles=[-120,180,120,60,0,-60].map(v=>v*Math.PI/180);
const tau=Math.PI*2,clamp=v=>Math.max(0,Math.min(1,v));
const history=new WeakMap();
const times=x=>(x/100).toLocaleString('ja-JP',{maximumFractionDigits:2})+'倍';
const geometryCache=new WeakMap(),maskCache=new WeakMap();
function geometry(s){
 const cached=geometryCache.get(s.edges);
 if(cached)return cached;
 const neighbours=s.cells.map(()=>[]),spokes=Array.from({length:6},()=>[]);
 for(const [a,b] of s.edges){neighbours[a].push(b);neighbours[b].push(a);}
 for(const c of s.cells){
  if(!c.ring)continue;
  for(let k=0;k<6;k++){
   const angle=zoneAngles[k];
   if(Math.hypot(c.x-c.ring*Math.cos(angle),c.y-c.ring*Math.sin(angle))<.01){spokes[k][c.ring-1]=c.id;break;}
  }
 }
 const depths=s.cells.map(c=>{
  const row=s.cells.map(()=>Infinity),queue=[c.id];row[c.id]=0;
  for(let i=0;i<queue.length;i++){
   const a=queue[i];if(row[a]>=2)continue;
   for(const b of neighbours[a])if(row[b]===Infinity){row[b]=row[a]+1;queue.push(b);}
  }
  return row;
 });
 const geom={depths,spokes};geometryCache.set(s.edges,geom);return geom;
}
// The actual occupied hexes define the glow, including asymmetric boundary wells.
function mask(zone,cells){
 const cached=maskCache.get(zone);
 if(cached)return cached;
 const surface=new Path2D(),rim=new Path2D(),boundary=new Map();
 for(const id of zone.cells){
  const {x,y}=cells[id],points=[];
  for(let i=0;i<6;i++){
   const a=(i*60-90)*Math.PI/180;points.push([x+Math.cos(a)/Math.sqrt(3),y+Math.sin(a)/Math.sqrt(3)]);
  }
  surface.moveTo(...points[0]);for(const p of points.slice(1))surface.lineTo(...p);surface.closePath();
  for(let i=0;i<6;i++){
   const a=points[i],b=points[(i+1)%6];
   const key=[a,b].map(p=>p.map(n=>Math.round(n*1000)).join(',')).sort().join(':');
   if(boundary.has(key))boundary.delete(key);else boundary.set(key,[a,b]);
  }
 }
 for(const [a,b] of boundary.values()){rim.moveTo(...a);rim.lineTo(...b);}
 const result={surface,rim};maskCache.set(zone,result);return result;
}
function circle(ctx,x,y,r,fill){
 ctx.beginPath();ctx.arc(x,y,r,0,tau);ctx.fillStyle=fill;ctx.fill();
}
function line(ctx,x,y,X,Y,color,width){
 ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(X,Y);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();
}
function outline(ctx,x,y,r,color,width){
 ctx.beginPath();ctx.arc(x,y,r,0,tau);ctx.lineWidth=width;ctx.strokeStyle=color;ctx.stroke();
}
function hull(ctx,points){
 ctx.beginPath();ctx.moveTo(...points[0]);for(let i=1;i<points.length;i++)ctx.lineTo(...points[i]);ctx.closePath();
}
const xy=(r,angle)=>[r*Math.cos(angle),r*Math.sin(angle)];
const corners=zoneAngles.map(angle=>xy(3.53,angle));
const faceColors=[['#525450','#2c3331','#1e2525'],['#fff5bb','#ffe591','#ecb957'],['#f1aa4e','#ca712f','#854422']];
let materials=null,loadedWidth=-1;
function makeMaterials(){
 if(materials&&loadedWidth===tiles.naturalWidth)return materials;
 loadedWidth=tiles.naturalWidth;
 materials=faceColors.map((colors,i)=>{
  const face=document.createElement('canvas');face.width=face.height=144;
  const ctx=face.getContext('2d'),grad=ctx.createRadialGradient(46,40,3,73,75,71);
  grad.addColorStop(0,colors[0]);grad.addColorStop(.59,colors[1]);grad.addColorStop(1,colors[2]);
  circle(ctx,72,72,71,grad);
  if(loadedWidth){
   const sw=loadedWidth/3,sh=tiles.naturalHeight,sz=Math.min(sw,sh);
   ctx.save();ctx.beginPath();ctx.arc(72,72,70,0,tau);ctx.clip();
   ctx.drawImage(tiles,(i+.5)*sw-sz/2,(sh-sz)/2,sz,sz,1,1,142,142);ctx.restore();
  }
  const bevel=ctx.createRadialGradient(59,50,12,72,72,71);
  bevel.addColorStop(0,i===0?'#060c0d92':'#fff5b61c');bevel.addColorStop(.70,i===0?'#070c0e47':'#fff0be00');bevel.addColorStop(.95,i===0?'#0b11137d':'#76390b78');bevel.addColorStop(1,i===0?'#070e11a8':'#653012ae');
  circle(ctx,72,72,71,bevel);
  if(i===1){ctx.beginPath();ctx.ellipse(48,41,16,5,-.5,0,tau);ctx.fillStyle='#fff9d5a0';ctx.fill();}
  return face;
 });
 return materials;
}
// Place the three regular oven numbers on that oven's spoke during baking.
const labelCache=new WeakMap();
function ovenLabels(s){
 let labels=labelCache.get(s.zones);if(labels)return labels;
 const {spokes}=geometry(s);labels=new Map();
 for(const z of s.zones.slice(0,6))z.numbers.forEach((number,i)=>labels.set(spokes[z.id-1][i],{number,zone:z.id}));
 labelCache.set(s.zones,labels);return labels;
}
function number(ctx,n,x,y,size,filled){
 const ink=filled?'#402116':'#fff9e9',rim=filled?'#ffe9aa':'#242422';
 ctx.save();
 if(typeof drawElixirNumber==='function')drawElixirNumber(ctx,n,x,y,size,ink,rim,size*.09);
 else{
  ctx.font='900 '+size+'px ElixirNumbers,system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.lineWidth=size*.12;ctx.strokeStyle=rim;ctx.strokeText(n,x,y);ctx.fillStyle=ink;ctx.fillText(n,x,y);
 }
 ctx.restore();
}
function paint(ctx,s,opts={},mini=false){
 const w=ctx.canvas.width,h=ctx.canvas.height;
 if(!w||!h)return;
 const bake=s.draws.length>=6,oven=s.draws.length>=5,age=reduced.matches?Infinity:Math.max(0,opts.age??Infinity);
 const play=s.draws.length>0&&age<1500;
 const zone=opts.previewZone||s.lastZone;
 const key=[w,h,play?Math.floor(age/34):-1,tiles.naturalWidth,panArt.naturalWidth,zone].join('/');
 const last=history.get(ctx);
 if(last?.s===s&&last.key===key)return;
 let wave=last?.wave;
 if(last?.s!==s){
  wave=s.cells.map(()=>-1);
  s.wave.forEach((group,t)=>group.forEach(i=>{wave[i]=t;}));
 }
 history.set(ctx,{s,key,wave});
 const scale=Math.min(w/7.75,h/6.76),X=x=>w/2+x*scale,Y=y=>h/2+y*scale;
 const unit=scale,rr=unit*.413,mats=makeMaterials();
 const sources=s.sources,geom=geometry(s),depths=sources.map(id=>geom.depths[id]);
 const tickets=oven?ovenLabels(s):null;
 ctx.save();ctx.clearRect(0,0,w,h);
 if(mini){ctx.fillStyle='#283734';ctx.fillRect(0,0,w,h);}
 ctx.lineJoin=ctx.lineCap='round';
 ctx.save();ctx.translate(w/2,h/2);ctx.scale(scale,scale);
 if(panArt.complete&&panArt.naturalWidth){
  ctx.save();hull(ctx,zoneAngles.map(a=>xy(3.85,a)));ctx.clip();
  ctx.drawImage(panArt,-3.85,-3.35,7.7,6.7);ctx.restore();
 }else{
  hull(ctx,corners);ctx.fillStyle='#67442e';ctx.fill();ctx.strokeStyle='#d4a456';ctx.lineWidth=.12;ctx.stroke();
 }
 // The bronze artwork is retained as a rim; its teal center becomes cast iron.
 ctx.save();
 hull(ctx,zoneAngles.map(a=>xy(3.51,a)));
 ctx.save();ctx.clip();
 const iron=ctx.createRadialGradient(-.65,-1.4,.3,0,.1,4.7);
 iron.addColorStop(0,'#64544b');iron.addColorStop(.52,'#3b322c');iron.addColorStop(1,'#201e1d');
 ctx.fillStyle=iron;ctx.fillRect(-4,-4,8,8);
 ctx.restore();ctx.lineWidth=.085;ctx.strokeStyle='#bd8952';ctx.stroke();
 hull(ctx,zoneAngles.map(a=>xy(3.72,a)));ctx.lineWidth=.085;ctx.strokeStyle='#ffe6a1';ctx.stroke();
 for(const sign of [-1,1]){
  const x=sign*3.70;ctx.beginPath();ctx.roundRect(x-.12,-.46,.24,.92,.09);
  const wood=ctx.createLinearGradient(x-.14,0,x+.14,0);
  wood.addColorStop(0,'#6b2c13');wood.addColorStop(.38,'#cb7132');
  wood.addColorStop(.75,'#8a3d1a');wood.addColorStop(1,'#452014');
  ctx.fillStyle=wood;ctx.fill();ctx.strokeStyle='#f2c37c';ctx.lineWidth=.038;ctx.stroke();
  for(const y of [-.38,.38]){ctx.beginPath();ctx.arc(x,y,.045,0,tau);ctx.fillStyle='#f6d17c';ctx.fill();}
 }
 for(const a of zoneAngles){const [x,y]=xy(3.64,a);
  circle(ctx,x,y,.079,'#f4c56e');circle(ctx,x,y,.036,'#745034');
 }
 ctx.restore();
 const bakedZone=zone?s.zones[zone-1]:null;
 if(bakedZone){
  const m=mask(bakedZone,s.cells);ctx.fillStyle=zoneColors[zone-1];ctx.globalAlpha=opts.previewZone?.47:play?.39:.24;
  ctx.fill(m.surface);ctx.globalAlpha=.95;ctx.lineWidth=.065;ctx.strokeStyle=zoneColors[zone-1];ctx.stroke(m.rim);ctx.globalAlpha=1;
 }
 ctx.restore();
 for(const [a,b] of s.edges){
  const A=s.cells[a],B=s.cells[b],x=X(A.x),y=Y(A.y),bx=X(B.x),by=Y(B.y);
  // All passages follow legal hexagonal directions and stay behind the moulds.
  line(ctx,x,y,bx,by,'#75624d',unit*.095);line(ctx,x,y,bx,by,'#2a211e',unit*.045);
  if(play&&!bake)for(const depth of depths){
   if(!depth||Math.max(depth[a],depth[b])>2||depth[a]===depth[b])continue;
   const from=depth[a]<depth[b],u=clamp((age-140-Math.min(depth[a],depth[b])*210)/180);
   if(u>0){const fx=from?x:bx,fy=from?y:by;
    line(ctx,fx,fy,fx+((from?bx:x)-fx)*u,fy+((from?by:y)-fy)*u,'#ffe388',unit*.08);
   }
  }
 }
 const newCount=s.wave.reduce((sum,ids)=>sum+ids.length,0);
 for(const cell of s.cells){
  const {id}=cell,ticket=tickets?.get(id),n=oven?ticket?.number:cell.number,x=X(cell.x),y=Y(cell.y),stage=s.baked[id]?2:s.wet[id]?1:0;
  let progress=1;
  if(play&&wave[id]>=0){progress=clamp((age-wave[id]*(bake?105:205))/(bake?360:320));}
  const before=stage===2?1:0;
  circle(ctx,x,y+unit*.035,rr*1.08,'#232824');circle(ctx,x,y,rr*1.055,stage===2?'#f5bd71':stage===1?'#f8e3a4':'#a78965');
  const stamp=k=>ctx.drawImage(mats[k],x-rr,y-rr,rr*2,rr*2);
  if(progress>=1)stamp(stage);
  else{
   stamp(before);
   if(bake){ctx.globalAlpha=progress;stamp(stage);ctx.globalAlpha=1;}
   else{ctx.save();ctx.beginPath();ctx.rect(x-rr,y+rr-2*rr*progress,2*rr,2*rr*progress);ctx.clip();stamp(stage);ctx.restore();}
  }
  if(play&&((bake&&wave[id]>=0)||(!bake&&sources.includes(id)))){
   const glow=bake?Math.sin(progress*Math.PI):1-clamp(age/1250);
   if(glow>.01){ctx.globalAlpha=glow;outline(ctx,x,y,rr*1.09,'#ffdc6c',unit*.075);ctx.globalAlpha=1;}
  }
  if(opts.previewZone&&bakedZone.cells.includes(id))outline(ctx,x,y,rr*1.09,zoneColors[zone-1],unit*.1);
  if(n){
   if(!oven&&stage===0){
    // A small wafer-coloured number marker is not an already-baked cake.
    circle(ctx,x,y,rr*.71,'#9e6339');circle(ctx,x,y,rr*.64,'#f6dca6');
   }
   if(ticket&&!mini){ctx.beginPath();ctx.arc(x,y,rr*.94,Math.PI*.58,Math.PI*.95);ctx.strokeStyle=zoneColors[ticket.zone-1];ctx.lineWidth=unit*.079;ctx.stroke();}
   ctx.save();
   if(ticket&&s.draws.slice(5).includes(n))ctx.globalAlpha=.55;
   number(ctx,n,x,y+(unit*.012),unit*.585,progress>.5?(stage>0||!oven):(before>0||!oven));ctx.restore();
   if(ticket&&n===s.lastNumber)outline(ctx,x,y,rr*.98,'#fff5ab',unit*.062);
  }
  if(!mini&&play&&bake&&newCount&&wave[id]>=0&&progress>.15&&progress<.98){
   ctx.globalAlpha=Math.sin(progress*Math.PI)*.9;
   for(let j=0;j<2;j++)circle(ctx,x+(j?1:-1)*rr*(.25+.27*progress),y-rr*(.58+progress*(.6+j*.2)),rr*.09,'#fff2b7');
   ctx.globalAlpha=1;
  }
 }
 if(!mini&&s.highestRole&&play){
  // A short fan of sugar-paper confetti at the rim leaves the finished cakes visible.
  const t=clamp(age/1500);
  ctx.save();ctx.globalAlpha=Math.sin(t*Math.PI);
  for(let j=0;j<30;j++){
   const angle=(j+.5)*tau/30,reach=unit*(3.18+Math.sin(t*Math.PI*.78)*(.36+(j%4)*.095));
   const dx=Math.cos(angle)*reach,dy=Math.sin(angle)*reach*.89+unit*t*t*.22;
   ctx.save();ctx.translate(w/2+dx,h/2+dy);ctx.rotate(angle+t*(2+j%3));
   ctx.fillStyle=zoneColors[j%6];ctx.fillRect(-unit*.048,-unit*.1,unit*.096,unit*.2);ctx.restore();
  }
  ctx.restore();
 }
 if(!mini&&oven){
  for(let i=0;i<6;i++){
   const a=zoneAngles[i],[dx,dy]=xy(3.55,a),x=X(dx),y=Y(dy),side=unit*.34;
   circle(ctx,x,y,side,zone===i+1?'#fff1be':'#263831');circle(ctx,x,y,side*.79,zoneColors[i]);
   ctx.fillStyle='#34291f';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='900 '+(unit*.38)+'px system-ui';ctx.fillText(String(i+1),x,y+unit*.012);
  }
 }
 ctx.restore();
}
function mount(panel){
 panel.classList.add('pct-panel');
 const root=document.createElement('section');root.className='pct-scene';root.setAttribute('aria-label','パーティカステラ');
 root.innerHTML=`<img class="pct-land" src="assets/party-castella-bg.webp?v=117" alt="" aria-hidden="true">
 <div class="pct-main-logo"><img src="assets/party-castella-logo.webp" alt="パーティカステラ"></div>
 <aside class="pct-side">
 <div class="pct-phase" role="group" aria-label="前半・後半">
  <div class="pct-phase-first"><strong>前半</strong><span>1〜5球</span><i aria-hidden="true"></i></div>
  <div class="pct-phase-second"><strong>後半</strong><span>6〜8球</span><i aria-hidden="true"></i></div>
 </div>
 <div class="pct-pay"><div class="pct-pay-label">配当表</div><table aria-label="焼けた個数と配当倍率"><thead><tr><th scope="col">焼け数</th><th scope="col">配当</th></tr></thead><tbody></tbody></table></div></aside>
 <div class="pct-tray"><div class="pct-pan"><canvas role="img"></canvas></div><div class="pct-key" role="group" aria-label="焼き範囲を確認" hidden></div>
 <img class="pct-sweep-art" src="assets/party-castella-feast.webp" alt="" aria-hidden="true">
 <div class="pct-caption" role="status" aria-live="polite"><strong></strong><span></span></div></div>`;
 panel.append(root);const q=k=>root.querySelector(k);
 const phase=q('.pct-phase'),canvas=q('canvas'),ctx=canvas.getContext('2d'),pan=q('.pct-pan'),caption=q('.pct-caption strong'),detail=q('.pct-caption span');
 const legend=q('.pct-key'),table=q('tbody');
 const zoneTags=[];
 function toggleZone(id){previewZone=previewZone===id?null:id;draw(shown,lastOpts);}
 function makeKeys(zones){
  for(const zone of zones){
   const e=document.createElement('button'),tag=document.createElement('b'),list=document.createElement('span');
   e.type='button';e.style.setProperty('--zone-color',zoneColors[zone.id-1]);
   if(zone.id<=6)tag.textContent=sides[zone.id-1];
   else{
    tag.classList.add('pct-flower');tag.setAttribute('aria-hidden','true');
    for(let i=0;i<3;i++)tag.append(document.createElement('i'));
   }
   e.append(tag,list);
   e.onclick=()=>toggleZone(zone.id);legend.append(e);zoneTags.push(e);
  }
 }
 canvas.addEventListener('click',event=>{
  if(!shown||shown.draws.length<5)return;
  const rect=canvas.getBoundingClientRect(),scale=Math.min(rect.width/7.75,rect.height/6.76);
  const x=(event.clientX-rect.left-rect.width/2)/scale,y=(event.clientY-rect.top-rect.height/2)/scale;
  for(const [id,ticket] of ovenLabels(shown)){
   const c=shown.cells[id];if(Math.hypot(x-c.x,y-c.y)<.48){toggleZone(ticket.zone);return;}
  }
  for(let i=0;i<6;i++){
   const [cx,cy]=xy(3.55,zoneAngles[i]);if(Math.hypot(x-cx,y-cy)<.43){toggleZone(i+1);return;}
  }
 });
 const bands=R.payRows.slice().sort((a,b)=>a.count-b.count);
 if(bands[0].count)bands.unshift({count:0,hundredths:0});
 const rows=bands.map(({count,hundredths},i)=>{
  const max=(bands[i+1]?.count??38)-1,row=table.insertRow(0),th=document.createElement('th');
  th.scope='row';th.textContent=count===37?'全焼き':count===max?count:count+'～'+max;
  row.append(th);row.insertCell().textContent=times(hundredths);return row;
 });
 let shown=null,reachKey=null,previewZone=null,shownZone=null,lastOpts={},wasNoBet=false;
 function fit(){
  const w=root.clientWidth,h=root.clientHeight;
  if(!w||!h)return;
  root.style.setProperty('--pct-unit',Math.min(w/350,h/300)+'px');
  const ratio=Math.min(devicePixelRatio||1,2),cw=Math.round(pan.clientWidth*ratio),ch=Math.round(pan.clientHeight*ratio);
  if(cw&&ch&&(canvas.width!==cw||canvas.height!==ch)){canvas.width=cw;canvas.height=ch;repaint();}
 }
 function repaint(){if(shown)paint(ctx,shown,previewZone?{...lastOpts,previewZone}:lastOpts);}
 for(const img of [tiles,panArt])img.addEventListener('load',repaint,{once:true});
 const resize=new ResizeObserver(fit);resize.observe(root);resize.observe(pan);
 fit();
 function draw(s,o={}){
  if(!s)return;
  if(s!==shown)previewZone=null;
  lastOpts=o;
  const noBet=o.bet===0;
  if(s!==shown||reachKey!==o.reach||shownZone!==previewZone||wasNoBet!==noBet){
   const turn=s.draws.length,last=s.lastNumber,oven=turn>=5,isBake=turn>=6,done=turn===8;
   const delta=s.wave.reduce((sum,arr)=>sum+arr.length,0);
   delete detail.dataset.tier;
   root.dataset.stage=s.phase;root.toggleAttribute('data-preview',!!previewZone);root.classList.toggle('pct-sweep',!!s.highestRole);
   phase.classList.toggle('pct-after',oven);
   phase.setAttribute('aria-label',oven?'後半 6〜8球':'前半 1〜5球');
   const idx=bands.findLastIndex(row=>row.count<=s.bakedCount);
   rows.forEach((row,i)=>row.classList.toggle('current',isBake&&idx===i));
   legend.hidden=!oven;
   if(!legend.hidden){
    if(!zoneTags.length)makeKeys(s.zones);
    for(const z of s.zones){
     const el=zoneTags[z.id-1],numbers=z.numbers.join('･');
     el.lastChild.textContent=z.id>6?(numbers||sides[z.id-1]):'';
     el.title=z.name+'　'+numbers;
     el.classList.toggle('spent',z.id>6&&s.draws.slice(5).includes(z.numbers[0]));
     el.classList.toggle('selected',s.lastZone===z.id);
     el.setAttribute('aria-pressed',String(previewZone===z.id));
     el.setAttribute('aria-label',z.name+'の焼き範囲'+(numbers?'　'+z.numbers.join('、')+'番':''));
    }
   }
   detail.textContent='';
   if(previewZone){
    const z=s.zones[previewZone-1];caption.textContent=z.id<=6?sides[z.id-1]+' '+z.name:z.name;
    detail.textContent=z.numbers.join('・');
   }else if(done){
    caption.textContent=s.highestRole?'全焼きボーナス':'焼成 '+s.bakedCount+'個';
    detail.textContent=times(s.totalHundredths);
   }else if(turn===5){
    caption.textContent='焼き型 オープン';detail.textContent='残り3球';
   }else if(isBake){
    caption.textContent=last+'番　'+sides[s.lastZone-1]+'　＋'+delta+'個';
    const top=(o.reach||[]).reduce((best,a)=>!best||a.tier>best.tier||a.tier===best.tier&&a.gain>best.gain?a:best,null);
    if(top){detail.dataset.tier=top.tier;detail.textContent=['リーチ','高額','超高額','全焼き'][top.tier]+' '+top.number+'番';}
   }else{
    caption.textContent=turn?last+'番　＋'+delta+'個':'生地は通路を2マス浸透';
   }
   canvas.setAttribute('aria-label','37個の焼き型。生地 '+s.wetCount+'個、焼き上がり '+s.bakedCount+'個。'+caption.textContent);
   shown=s;reachKey=o.reach;shownZone=previewZone;wasNoBet=noBet;
  }
  paint(ctx,s,previewZone?{...o,previewZone}:o);
 }
 return {draw,drawMini};
}
function drawMini(ctx,s,o){paint(ctx,s,o,true);}
window.PartyCastellaView={mount,drawMini};
})();

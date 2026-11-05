/* The main griddle and the tab preview share one top-down view of the same draw. */
(()=>{
'use strict';
const R=window.PartyCastellaRules,tiles=new Image(),panArt=new Image();
tiles.src='assets/party-castella-tiles.webp?v=116';
panArt.src='assets/party-castella-griddle.webp';
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const tau=Math.PI*2,clamp=v=>Math.max(0,Math.min(1,v));
const panW=7.34,panH=6.32;
const fillStart=[0,270,565],pourDuration=320,ovenSwitch=1080;
const history=new WeakMap(),maskCache=new WeakMap();
const times=x=>(x/100).toFixed(1)+'倍';
const showOven=(s,age)=>s.draws.length>5||s.draws.length===5&&(reduced.matches||age>=ovenSwitch);

// Outline the actual heated hexes, including the clipped regions at the edge.
function mask(zone,cells){
 const cached=maskCache.get(zone);if(cached)return cached;
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
let materials;
function makeMaterials(){
 if(materials||!tiles.naturalWidth)return materials;
 const sw=tiles.naturalWidth/3,sh=tiles.naturalHeight;
 materials=[0,1,2].map(i=>{
  const face=document.createElement('canvas');face.width=face.height=160;
  const g=face.getContext('2d');g.beginPath();g.arc(80,80,79.5,0,tau);g.clip();
  g.drawImage(tiles,i*sw,0,sw,sh,0,0,160,160);return face;
 });
 return materials;
}
function number(ctx,n,x,y,size,filled){
 const ink=filled?'#402116':'#fff9e9',rim=filled?'#fff0b4':'#221c1b';
 ctx.save();
 if(typeof drawElixirNumber==='function')drawElixirNumber(ctx,n,x,y,size,ink,rim,size*.077);
 else{
  ctx.font='900 '+size+'px ElixirNumbers,system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.lineWidth=size*.12;ctx.strokeStyle=rim;ctx.strokeText(n,x,y);ctx.fillStyle=ink;ctx.fillText(n,x,y);
 }
 ctx.restore();
}
function hitLabel(ctx,x,y,unit){
 ctx.save();ctx.translate(x,y);ctx.rotate(-.12);
 ctx.font='italic 1000 '+unit*.292+'px Arial, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.lineWidth=unit*.077;ctx.strokeStyle='#581e17';ctx.strokeText('HIT!',0,0);
 ctx.lineWidth=unit*.034;ctx.strokeStyle='#fff3be';ctx.strokeText('HIT!',0,0);
 ctx.fillStyle='#b43117';ctx.fillText('HIT!',0,0);ctx.restore();
}
// Batter enters the mouth from the upstream side, puddles, then rounds out against the rim.
function pool(ctx,x,y,r,u,inlet,cell,stamp){
 if(u<=0)return;
 const eased=u*(2-u),dx=inlet?inlet.x-cell.x:0,dy=inlet?inlet.y-cell.y:0;
 const cx=x+dx*r*.90*(1-eased),cy=y+dy*r*.90*(1-eased),radius=r*eased;
 ctx.save();
 ctx.beginPath();ctx.arc(x,y,r,0,tau);ctx.clip();ctx.beginPath();
 for(let j=0;j<40;j++){
  const a=tau*j/40,rad=radius*(1+(1-u)*.08*Math.sin(3*a+u*6)+(1-u)*.045*Math.sin(5*a-u*4));
  const px=cx+rad*Math.cos(a),py=cy+rad*Math.sin(a);
  if(j===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
 }
 ctx.closePath();ctx.clip();stamp(1);
 if(u<.94){
  ctx.globalAlpha=.55*(1-u);ctx.beginPath();
  ctx.arc(cx,cy,radius*.91,3.6,5.2);ctx.strokeStyle='#fff8cd';ctx.lineWidth=r*.075;ctx.stroke();
 }
 ctx.restore();
}
function paint(ctx,s,opts={},mini=false){
 const w=ctx.canvas.width,h=ctx.canvas.height;
 if(!w||!h)return;
 const age=reduced.matches?Infinity:Math.max(0,opts.age??Infinity),oven=showOven(s,age);
 const bake=s.draws.length>=6,play=s.draws.length>0&&age<1500,zoneId=opts.previewZone||s.lastZone;
 const key=[w,h,oven,play?Math.floor(age/30):-1,tiles.naturalWidth,panArt.naturalWidth,zoneId].join('/');
 const last=history.get(ctx);
 if(last?.s===s&&last.key===key)return;
 let frame=last?.frame;
 if(last?.s!==s){
  const wave=s.cells.map(()=>-1),inlets=[],labels=[];
  s.wave.forEach((group,t)=>group.forEach(i=>{wave[i]=t;}));
  for(const [from,to] of s.flow)inlets[to]=s.cells[from];
  for(const z of s.zones)if(z.numbers.length)labels[z.anchor]=z.numbers[0];
  frame={wave,inlets,labels};
 }
 history.set(ctx,{s,key,frame});
 const unit=Math.min(w/panW,h/panH),X=x=>w/2+x*unit,Y=y=>h/2+y*unit,rr=unit*.405,mats=makeMaterials();
 ctx.save();ctx.clearRect(0,0,w,h);
 if(mini){ctx.fillStyle='#2c221a';ctx.fillRect(0,0,w,h);}
 ctx.lineJoin=ctx.lineCap='round';
 const px=X(-panW/2),py=Y(-panH/2);
 if(panArt.naturalWidth)ctx.drawImage(panArt,px,py,panW*unit,panH*unit);
 else{ctx.fillStyle='#39322e';ctx.fillRect(px,py,panW*unit,panH*unit);}
 const zone=zoneId?s.zones[zoneId-1]:null;
 if(zone){
  ctx.save();ctx.translate(w/2,h/2);ctx.scale(unit,unit);
  const m=mask(zone,s.cells);
  ctx.fillStyle=opts.previewZone?'#ffdf866b':'#ed873731';ctx.fill(m.surface);
  ctx.strokeStyle=opts.previewZone?'#ffe893':'#f2ab6bbf';ctx.lineWidth=.038;ctx.stroke(m.rim);ctx.restore();
 }
 for(const [a,b] of s.edges){
  const A=s.cells[a],B=s.cells[b],x=X(A.x),y=Y(A.y),bx=X(B.x),by=Y(B.y);
  line(ctx,x,y,bx,by,'#cc9f68',unit*.15);
  line(ctx,x,y+unit*.006,bx,by+unit*.006,'#37281f',unit*.093);
  line(ctx,x,y+unit*.013,bx,by+unit*.013,'#7d6040',unit*.031);
 }
 if(!bake&&play){
  for(const [from,to,depth] of s.flow){
   const A=s.cells[from],B=s.cells[to],u=clamp((age-fillStart[depth]+155)/155);
   if(!u)continue;
   // Move across the exposed channel between the two rims, then into the next well.
   const t=.39+.22*u,ax=X(A.x+.39*(B.x-A.x)),ay=Y(A.y+.39*(B.y-A.y));
   const bx=X(A.x+t*(B.x-A.x)),by=Y(A.y+t*(B.y-A.y));
   ctx.globalAlpha=clamp((1180-age)/240);
   line(ctx,ax,ay,bx,by,'#f4b950',unit*.10);
   line(ctx,ax,ay-unit*.012,bx,by-unit*.012,'#ffe8a2',unit*.045);
  }
  ctx.globalAlpha=1;
 }
 for(const cell of s.cells){
  const {id}=cell,n=oven?frame.labels[id]:cell.number,x=X(cell.x),y=Y(cell.y);
  const stage=s.baked[id]?2:s.wet[id]?1:0,depth=frame.wave[id];
  const u=play&&depth>=0?clamp((age-(bake?depth*120:fillStart[depth]))/(bake?440:pourDuration)):1;
  const stamp=k=>{
   if(mats)ctx.drawImage(mats[k],x-rr,y-rr,rr*2,rr*2);
   else circle(ctx,x,y,rr,['#28231e','#f5ca75','#b77130'][k]);
  };
  circle(ctx,x,y+unit*.025,rr*1.045,'#1b1816');
  if(u>=1)stamp(stage);
  else if(bake){stamp(1);ctx.globalAlpha=u;stamp(2);ctx.globalAlpha=1;}
  else{stamp(0);pool(ctx,x,y,rr,u,frame.inlets[id],cell,stamp);}
  if(!bake&&play&&s.sources.includes(id)&&age<725){
   const t=age/725;ctx.globalAlpha=.84*(1-t);
   for(let j=0;j<2;j++){
    const k=(t*1.25+j*.46)%1;ctx.beginPath();
    ctx.arc(x,y,rr*(.15+k*.76),t*4+j*3,t*4+j*3+Math.PI*1.55);
    ctx.strokeStyle=j?'#ffc45c':'#fff4cb';ctx.lineWidth=unit*.046;ctx.stroke();
   }
   ctx.globalAlpha=1;
  }
  if(n){
   const hit=s.draws.includes(n),active=hit&&n===s.lastNumber;
   if(hit)outline(ctx,x,y,rr*(active?1.035:.96),active?'#fff2a0':'#efb162',unit*(active?.060:.035));
   number(ctx,n,x,y+(hit?unit*.105:0),unit*(hit?.50:.575),stage>0&&u>.5||bake&&s.wet[id]);
   if(hit)hitLabel(ctx,x,y-unit*.18,unit);
  }
  if(!mini&&bake&&play&&depth>=0&&u>.05&&u<.98){
   ctx.globalAlpha=Math.sin(u*Math.PI)*.85;
   for(let j=0;j<2;j++)circle(ctx,x+(j?1:-1)*rr*(.27+.23*u),y-rr*(.65+u*(.56+j*.18)),rr*.075,'#fff1bb');
   ctx.globalAlpha=1;
  }
 }
 ctx.restore();
}
function mount(panel){
 panel.classList.add('pct-panel');
 const root=document.createElement('section');root.className='pct-scene';root.setAttribute('aria-label','パーティカステラ');
 root.innerHTML=`<img class="pct-land" src="assets/party-castella-bg.webp?v=117" alt="" aria-hidden="true">
 <aside class="pct-side"><div class="pct-phase" role="group" aria-label="前半・後半">
 <div class="pct-phase-first"><strong>前半</strong><span>1〜5球</span></div>
 <div class="pct-phase-second"><strong>後半</strong><span>6〜8球</span></div></div>
 <div class="pct-pay"><div class="pct-pay-label">配当表</div>
 <table aria-label="焼けた個数と配当倍率"><thead><tr><th scope="col">焼け数</th><th scope="col">倍率</th></tr></thead><tbody></tbody></table></div></aside>
 <div class="pct-tray"><div class="pct-pan"><canvas role="img"></canvas>
 <div class="pct-anchors" role="group" aria-label="番号を選ぶと焼き範囲を表示"></div></div>
 <img class="pct-sweep-art" src="assets/party-castella-feast.webp" alt="" aria-hidden="true"></div>
 <div class="pct-caption" role="status" aria-live="polite"></div>`;
 panel.append(root);
 const q=k=>root.querySelector(k),phase=q('.pct-phase'),pan=q('.pct-pan'),canvas=q('canvas'),ctx=canvas.getContext('2d');
 const legend=q('.pct-anchors'),caption=q('.pct-caption'),table=q('tbody');
 const rows=R.payRows.map(({count,hundredths})=>{
  const row=table.insertRow(0),th=document.createElement('th');
  th.scope='row';th.textContent=count+'';
  if(count===37){const mark=document.createElement('small');mark.textContent='全焼';th.append(mark);}
  row.append(th);row.insertCell().textContent=times(hundredths);
  return {count,row};
 });
 let shown=null,shownOven=false,previewZone=null,lastOpts={};
 function repaint(){if(shown)paint(ctx,shown,previewZone?{...lastOpts,previewZone}:lastOpts);}
 function placeButtons(){
  if(!shown||!shownOven)return;
  const w=pan.clientWidth,h=pan.clientHeight,unit=Math.min(w/panW,h/panH);
  for(const [i,btn] of Array.from(legend.children).entries()){
   const z=shown.zones[i],c=shown.cells[z.anchor];
   Object.assign(btn.style,{left:w/2+c.x*unit+'px',top:h/2+c.y*unit+'px',width:unit*.85+'px',height:unit*.85+'px'});
  }
 }
 function fit(){
  const w=root.clientWidth,h=root.clientHeight;
  if(!w||!h)return;
  root.style.setProperty('--pct-unit',Math.min(w/350,h/300)+'px');
  const ratio=Math.min(devicePixelRatio||1,2),cw=Math.round(pan.clientWidth*ratio),ch=Math.round(pan.clientHeight*ratio);
  if(cw&&ch&&(canvas.width!==cw||canvas.height!==ch)){canvas.width=cw;canvas.height=ch;repaint();}
  placeButtons();
 }
 for(const img of [tiles,panArt])img.addEventListener('load',repaint,{once:true});
 const resize=new ResizeObserver(fit);resize.observe(root);resize.observe(pan);
 function makeButtons(s){
  legend.replaceChildren();
  if(!shownOven)return;
  for(const z of s.zones){
   const btn=document.createElement('button');btn.type='button';
   btn.setAttribute('aria-label',z.numbers[0]+'番の焼き範囲');btn.setAttribute('aria-pressed','false');
   btn.onclick=()=>{
    previewZone=previewZone===z.id?null:z.id;
    for(const [i,b] of Array.from(legend.children).entries())b.setAttribute('aria-pressed',String(s.zones[i].id===previewZone));
    repaint();
   };
   legend.append(btn);
  }
  placeButtons();
 }
 function draw(s,o={}){
  if(!s)return;
  const oven=showOven(s,o.age??Infinity),last=shown;
  if(s!==last)previewZone=null;
  lastOpts=o;
  if(s!==last||oven!==shownOven){
   const turn=s.draws.length;
   shown=s;shownOven=oven;root.dataset.stage=oven?'bake':'pour';
   root.classList.toggle('pct-sweep',!!s.highestRole);
   phase.classList.toggle('pct-after',oven);phase.setAttribute('aria-label',oven?'後半 6〜8球':'前半 1〜5球');
   rows.forEach(({count,row})=>row.classList.toggle('current',turn>=6&&count===s.bakedCount));
   const status='生地 '+s.wetCount+'個、焼き上がり '+s.bakedCount+'個。'+(s.lastNumber?s.lastNumber+'番 HIT!':'');
   caption.textContent=status;canvas.setAttribute('aria-label','37個の焼き型。'+status);
   if((oven?s.zones:null)!==(legend.children.length?last?.zones:null))makeButtons(s);
   else for(const btn of legend.children)btn.setAttribute('aria-pressed','false');
  }
  repaint();
 }
 fit();return {draw,drawMini};
}
function drawMini(ctx,s,o){paint(ctx,s,o,true);}
window.PartyCastellaView={mount,drawMini};
})();

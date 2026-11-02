/* Recent-game BET tutorial v67: 20-second animations. Read-only demos. */
(()=>{
'use strict';
if(window.RecentGameDemosV67?.installed)return;
const gSlot=slots[0],wSlot=slots[1];
const gm=gSlot.panel.querySelector('.gp-scene .gp-mold');
const wm=wSlot.panel.querySelector('.wp-scene');
if(!gm||!wm)return;
const style=document.createElement('link');
style.rel='stylesheet';style.href='assets/recent-game-demos-v67.css?v=67';
document.head.appendChild(style);
const DURATION=20000;
const titles=[
 ['番号HITで交点が光る','HIT同士を直線で結ぶ','囲まれた三角形をGET','24個全部でボーナス！'],
 ['番号HITでジュースを注ぐ','満タンなら下の2杯に分配','特別番号で注入量が2倍','満タン10杯以上で配当GET']
];
const frameHTML=name=>'<div class="rg67-demo-head"><span class="rg67-demo-label">✦ '+name+
 ' DEMO ✦</span><span class="rg67-demo-ball">1 / 8</span></div>';
const footHTML='<div class="rg67-demo-caption"><small>遊び方</small><b></b></div>'+
 '<div class="rg67-demo-progress"><i></i></div>';
const H=106,HW=Math.sqrt(3)*H/2,X=250,Y=250;
const raw=[[X,Y-2*H],[X-2*HW,Y-H],[X-2*HW/3,Y-H],[X,Y-H],[X+2*HW/3,Y-H],[X+2*HW,Y-H],
 [X-HW,Y-H/2],[X+HW,Y-H/2],[X-4*HW/3,Y],[X,Y],[X+4*HW/3,Y],
 [X-HW,Y+H/2],[X+HW,Y+H/2],[X-2*HW,Y+H],[X-2*HW/3,Y+H],[X,Y+H],
 [X+2*HW/3,Y+H],[X+2*HW,Y+H],[X,Y+2*H]];
const P=raw.map(([x,y])=>({x:160+(x-250)*.71,y:157+(y-250)*.70}));
const lines=[[0,2,6,8,13],[0,4,7,10,17],[1,2,3,4,5],[13,14,15,16,17],
 [1,6,9,12,17],[5,7,9,11,13],[1,8,11,14,18],[5,10,12,16,18],
 [0,3,9,15,18],[8,9,10],[2,9,16],[4,9,14]];
const key=(a,b)=>Math.min(a,b)+':'+Math.max(a,b);
const edges=[],emap=new Map();
lines.forEach(line=>{for(let j=1;j<line.length;j++){
 const a=line[j-1],b=line[j],k=key(a,b);
 if(!emap.has(k)){emap.set(k,edges.length);edges.push({a,b})}
}});
const faces=[];
for(let a=0;a<19;a++)for(let b=a+1;b<19;b++)for(let c=b+1;c<19;c++){
 const ids=[key(a,b),key(b,c),key(a,c)].map(k=>emap.get(k));
 if(ids.some(id=>id==null))continue;
 faces.push({nodes:[a,b,c],edges:ids});
}
if(P.length!==19||edges.length!==42||faces.length!==24)throw Error('Demo graph differs from Gelato engine');
const edgeFaces=edges.map(()=>[]);
faces.forEach((f,i)=>f.edges.forEach(k=>edgeFaces[k].push(i)));
function gelatoFill(hits){
 const lit=new Set();
 for(const line of lines){
  const positions=line.map((n,i)=>hits.has(n)?i:-1).filter(i=>i>=0);
  if(positions.length<2)continue;
  for(let i=positions[0];i<positions[positions.length-1];i++)
   lit.add(emap.get(key(line[i],line[i+1])));
 }
 const outside=new Set(),queue=[];
 for(let id=0;id<edges.length;id++){
  if(lit.has(id)||edgeFaces[id].length!==1)continue;
  const f=edgeFaces[id][0];
  if(!outside.has(f)){outside.add(f);queue.push(f)}
 }
 for(let i=0;i<queue.length;i++){
  const f=faces[queue[i]];
  for(const id of f.edges)if(!lit.has(id))
   for(const n of edgeFaces[id])if(!outside.has(n)){outside.add(n);queue.push(n)}
 }
 const filled=new Set();
 faces.forEach((_,i)=>{if(!outside.has(i))filled.add(i)});
 return {lit,filled};
}
const scriptHits=[0,3,1,5,13,17,18,9];
const tipTest=gelatoFill(new Set([0,1,5,13,17,18]));
if(tipTest.filled.size!==24)throw Error('Demo bonus 24-face invariant failed');
const gLayer=document.createElement('div');
gLayer.className='rg67-demo rg67-gelato-demo';
gLayer.setAttribute('aria-label','ジェラートプリズムの20秒デモ');
const poly=nodes=>nodes.map(i=>P[i].x.toFixed(2)+','+P[i].y.toFixed(2)).join(' ');
const colors=['#ff9acc','#ffe49b','#98ffd5','#8ddaff','#deb1ff'];
gLayer.innerHTML=frameHTML('GELATO')+
 '<svg viewBox="-22 -23 364 360" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><g>'+
 faces.map((f,i)=>'<polygon class="rg67-demo-face" data-rg-face="'+i+'" points="'+poly(f.nodes)+
 '" fill="'+colors[i%5]+'"/>').join('')+'</g><g>'+
 edges.map((e,i)=>'<line class="rg67-demo-edge" data-rg-edge="'+i+'" x1="'+P[e.a].x+
 '" y1="'+P[e.a].y+'" x2="'+P[e.b].x+'" y2="'+P[e.b].y+'"/>').join('')+'</g><g>'+
 P.map((p,i)=>'<circle class="rg67-demo-dot" data-rg-node="'+i+'" cx="'+p.x+
 '" cy="'+p.y+'" r="11.4"/><text class="rg67-demo-number" data-rg-number="'+i+
 '" x="'+p.x+'" y="'+(p.y+4)+'">?</text>').join('')+'</g></svg>'+
 '<div class="rg67-demo-full">24 / 24 ✦ BONUS!</div>'+footHTML;
gm.appendChild(gLayer);
const gFaces=[...gLayer.querySelectorAll('[data-rg-face]')];
const gEdges=[...gLayer.querySelectorAll('[data-rg-edge]')];
const gDots=[...gLayer.querySelectorAll('[data-rg-node]')];
const gNums=[...gLayer.querySelectorAll('[data-rg-number]')];
let lastStep=-1,lastCycle=-1;
function drawGelato(ms){
 const e=gSlot.engine,step=Math.min(8,Math.floor(ms/2500)+1);
 if(step!==lastStep||e.cycle!==lastCycle){
  lastStep=step;lastCycle=e.cycle;
  const hits=new Set(scriptHits.slice(0,step)),s=gelatoFill(hits);
  gFaces.forEach((el,i)=>el.classList.toggle('rg67-filled',s.filled.has(i)));
  gEdges.forEach((el,i)=>el.classList.toggle('rg67-lit',s.lit.has(i)));
  gDots.forEach((el,i)=>el.classList.toggle('rg67-hit',hits.has(i)));
  gNums.forEach((el,i)=>{el.textContent=String(e.nodeNumbers?.[i]??i+1)});
  gLayer.classList.toggle('rg67-allfaces',s.filled.size===24);
 }
 gLayer.querySelector('.rg67-demo-caption b').textContent=titles[0][Math.min(3,Math.floor(ms/5000))];
 gLayer.querySelector('.rg67-demo-ball').textContent=step+' / 8';
 gLayer.querySelector('.rg67-demo-progress i').style.width=(100*ms/DURATION).toFixed(1)+'%';
}
const wLayer=document.createElement('div');
wLayer.className='rg67-demo rg67-winery-demo';
wLayer.setAttribute('aria-label','ワイナリーピラミッドの20秒デモ');
wLayer.innerHTML=frameHTML('WINERY')+
 '<canvas class="rg67-winery-canvas" width="1672" height="941" aria-hidden="true"></canvas>'+footHTML;
wm.appendChild(wLayer);
const cvs=wLayer.querySelector('canvas'),ctx=cvs.getContext('2d');
const C=window.WineryPyramid?.core?.CELLS;
function where(i){
 let r,c;
 if(C){r=C[i].r;c=C[i].c}
 else{r=Math.floor((Math.sqrt(8*i+1)-1)/2);c=i-r*(r+1)/2}
 return {x:748+(c-r/2)*141,y:110+r*136+[0,0,1,1,2,2][r]};
}
function juice(i,f,ms,color){
 if(f<=0)return;
 const p=where(i),x=p.x,y=p.y,top=y+80-70*Math.min(1,f);
 ctx.save();ctx.beginPath();ctx.moveTo(x-54,y+8);
 ctx.bezierCurveTo(x-51,y+36,x-31,y+70,x,y+80);
 ctx.bezierCurveTo(x+31,y+70,x+51,y+36,x+54,y+8);ctx.closePath();ctx.clip();
 const grd=ctx.createLinearGradient(x-55,top,x+55,y+80);
 grd.addColorStop(0,'#fff8d6');grd.addColorStop(.2,color);
 grd.addColorStop(.65,color);grd.addColorStop(1,'#ffb7cf');
 ctx.globalAlpha=.86;ctx.fillStyle=grd;
 ctx.beginPath();ctx.moveTo(x-58,y+83);ctx.lineTo(x-58,top);
 for(let d=-58;d<=58;d+=3)ctx.lineTo(x+d,top+3*Math.sin(ms*.004+d*.14+i*.6));
 ctx.lineTo(x+58,y+83);ctx.closePath();ctx.fill();
 ctx.globalAlpha=1;ctx.strokeStyle='#fff6dd';ctx.lineWidth=2.7;
 ctx.shadowColor='#ffeab4';ctx.shadowBlur=6;ctx.beginPath();
 for(let d=-52;d<=52;d+=3){
  const wave=top+3*Math.sin(ms*.004+d*.14+i*.6);
  if(d===-52)ctx.moveTo(x+d,wave);else ctx.lineTo(x+d,wave);
 }
 ctx.stroke();ctx.restore();
}
function stream(x0,y0,x1,y1,ms,alpha,color){
 if(alpha<=0)return;
 ctx.save();ctx.globalAlpha=Math.min(1,alpha);
 ctx.lineCap='round';ctx.lineJoin='round';
 const g=ctx.createLinearGradient(x0,y0,x1,y1);
 g.addColorStop(0,'#fff9e4');g.addColorStop(.25,color);
 g.addColorStop(.8,color);g.addColorStop(1,'#ffe6cb');
 ctx.shadowColor=color;ctx.shadowBlur=14;ctx.strokeStyle=g;ctx.lineWidth=8;
 ctx.beginPath();ctx.moveTo(x0,y0);
 ctx.bezierCurveTo(x0+15,y0+(y1-y0)*.45,x1-18,y1-(y1-y0)*.3,x1,y1);ctx.stroke();
 ctx.shadowBlur=0;ctx.setLineDash([10,13]);ctx.lineDashOffset=-ms*.06;
 ctx.lineWidth=2;ctx.strokeStyle='#fff9df';ctx.stroke();ctx.restore();
}
function glow(i,ms){
 const p=where(i);ctx.save();
 ctx.strokeStyle='#fff4bc';ctx.lineWidth=4;
 ctx.shadowColor='#ffe4b1';ctx.shadowBlur=14+5*Math.sin(ms*.004+i);
 ctx.beginPath();ctx.ellipse(p.x,p.y+40,59,47,0,0,Math.PI*2);ctx.stroke();ctx.restore();
}
function drawWinery(ms){
 ctx.clearRect(0,0,1672,941);
 const stage=Math.min(3,Math.floor(ms/5000)),p=Math.min(1,(ms%5000)/4400);
 if(stage===0){
  juice(0,p,ms,'#e65b9c');stream(748,65,748,128,ms,p*1.5,'#f877a9');glow(0,ms);
 }else if(stage===1){
  juice(0,1,ms,'#ed5d9c');juice(1,p,ms,'#ffa45f');juice(2,p,ms,'#f876b9');
  const a=where(0),b=where(1),c=where(2);
  stream(a.x-15,a.y+80,b.x,b.y+28,ms,p,'#ff9b8a');
  stream(a.x+15,a.y+80,c.x,c.y+28,ms,p,'#ff6da0');glow(0,ms);
 }else if(stage===2){
  for(const i of [0,1,2])juice(i,1,ms,'#ed6a9f');
  juice(3,p,ms,'#ffc56e');juice(4,p,ms,'#f67ab4');
  const a=where(1),b=where(3),c=where(4);
  stream(a.x,a.y+80,b.x,b.y+28,ms,p,'#ffad77');
  stream(a.x,a.y+80,c.x,c.y+28,ms,p,'#fa68a9');
  ctx.save();ctx.translate(455,260);
  ctx.fillStyle='#ffeba1';ctx.strokeStyle='#fff8e2';ctx.lineWidth=5;
  ctx.shadowColor='#ffdfab';ctx.shadowBlur=15;
  ctx.beginPath();ctx.arc(0,0,50,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.shadowBlur=0;ctx.fillStyle='#a03877';ctx.textAlign='center';
  ctx.font='900 31px system-ui';ctx.fillText('×2',0,11);ctx.restore();
 }else{
  for(let i=0;i<10;i++){juice(i,1,ms,'#ef629d');glow(i,ms)}
  ctx.save();ctx.globalAlpha=p;ctx.textAlign='center';
  ctx.font='900 43px system-ui';ctx.lineWidth=7;
  ctx.shadowColor='#ffdeb6';ctx.shadowBlur=14;
  ctx.strokeStyle='#a43271';ctx.fillStyle='#fff0ae';
  ctx.strokeText('10杯 WIN!',750,468);ctx.fillText('10杯 WIN!',750,468);ctx.restore();
 }
 wLayer.querySelector('.rg67-demo-caption b').textContent=titles[1][stage];
 wLayer.querySelector('.rg67-demo-ball').textContent=(Math.min(8,Math.floor(ms/2500)+1))+' / 8';
 wLayer.querySelector('.rg67-demo-progress i').style.width=(100*ms/DURATION).toFixed(1)+'%';
}
const track=[{cycle:null,start:0,finished:false},{cycle:null,start:0,finished:false}];
function update(i,now){
 const layer=i===0?gLayer:wLayer;
 const e=i===0?gSlot.engine:wSlot.engine;
 const selected=i===0?document.body.classList.contains('gelato-active'):
                       document.body.classList.contains('winery-active');
 const menu=document.getElementById('record-menu-layer');
 const show=app.phase==='ready'&&!e?.running&&!app.paused&&selected&&
   !document.hidden&&(!menu||menu.hidden);
 const t=track[i];
 if(!show){layer.classList.remove('rg67-active');return}
 if(t.cycle!==e?.cycle){
  t.cycle=e?.cycle;t.start=now;t.finished=false;
  if(i===0)lastStep=-1;
 }
 const elapsed=Math.max(0,now-t.start);
 if(t.finished||elapsed>=DURATION){t.finished=true;layer.classList.remove('rg67-active');return}
 layer.classList.add('rg67-active');
 if(i===0)drawGelato(elapsed);else drawWinery(elapsed);
}
function frame(){
 if(document.hidden)return;
 const now=performance.now();update(0,now);update(1,now);
}
const timer=setInterval(frame,90);
frame();
window.RecentGameDemosV67={
 installed:true,version:67,duration:DURATION,
 stop(){clearInterval(timer);gLayer.remove();wLayer.remove()},
 get status(){return {
   gelato:gLayer.classList.contains('rg67-active'),
   winery:wLayer.classList.contains('rg67-active'),
   points:P.length,edges:edges.length,faces:faces.length
 }}
};
})();

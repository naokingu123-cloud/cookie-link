/* The large griddle and tab preview share the same 37 wells and drawn channels. */
(()=>{
'use strict';
const R=window.PartyCastellaRules,tiles=new Image(),reduced=matchMedia('(prefers-reduced-motion: reduce)');
tiles.src='assets/party-castella-tiles.webp';
const sides=['①','②','③','④','⑤','⑥'];
const zoneColors=['#f08d80','#f3b45d','#b2cb77','#70cdc1','#82b9ef','#c3a6e3'];
const zoneAngles=[-120,180,120,60,0,-60].map(v=>v*Math.PI/180);
const tau=Math.PI*2,clamp=v=>Math.max(0,Math.min(1,v));
const history=new WeakMap();
const times=x=>(x/100).toLocaleString('ja-JP',{maximumFractionDigits:2})+'倍';
const neighbours=R.cells.map(()=>[]);
for(const [a,b] of R.edges){neighbours[a].push(b);neighbours[b].push(a);}
const depthByCell=R.cells.map(c=>{
 const depth=R.cells.map(()=>Infinity),queue=[c.id];depth[c.id]=0;
 for(let k=0;k<queue.length;k++){
  const i=queue[k];if(depth[i]>=2)continue;
  for(const j of neighbours[i])if(depth[j]===Infinity){depth[j]=depth[i]+1;queue.push(j);}
 }
 return depth;
});
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
function pattern(ctx,z){
 const i=z-1;
 hull(ctx,[[0,0],corners[(i+5)%6],corners[i],corners[(i+1)%6]]);
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
 const bake=!!s.lastZone,age=reduced.matches?Infinity:Math.max(0,opts.age??Infinity);
 const play=s.draws.length>0&&age<1500;
 const zone=opts.previewZone||s.lastZone;
 const key=[w,h,play?Math.floor(age/34):-1,tiles.naturalWidth,zone].join('/');
 const last=history.get(ctx);
 if(last?.s===s&&last.key===key)return;
 let wave=last?.wave;
 if(last?.s!==s){
  wave=R.cells.map(()=>-1);
  s.wave.forEach((group,t)=>group.forEach(i=>{wave[i]=t;}));
 }
 history.set(ctx,{s,key,wave});
 const scale=Math.min(w/7.75,h/6.76),X=x=>w/2+x*scale,Y=y=>h/2+y*scale;
 const unit=scale,rr=unit*.413,mats=makeMaterials();
 const sources=s.sources||[],depths=sources.map(id=>depthByCell[id]);
 ctx.save();ctx.clearRect(0,0,w,h);
 if(mini){ctx.fillStyle='#283734';ctx.fillRect(0,0,w,h);}
 ctx.lineJoin=ctx.lineCap='round';
 ctx.save();ctx.translate(w/2,h/2);ctx.scale(scale,scale);
 hull(ctx,corners);
 const iron=ctx.createLinearGradient(-1,-3,1,3);iron.addColorStop(0,'#58605b');iron.addColorStop(.38,'#394440');iron.addColorStop(.78,'#293531');iron.addColorStop(1,'#424c44');
 ctx.fillStyle=iron;ctx.fill();ctx.strokeStyle='#6c452a';ctx.lineWidth=.17;ctx.stroke();ctx.strokeStyle='#eac48b';ctx.lineWidth=.07;ctx.stroke();
 if(zone){
  pattern(ctx,zone);ctx.fillStyle=zoneColors[zone-1];ctx.globalAlpha=opts.previewZone?.47:play?.32:.21;ctx.fill();ctx.globalAlpha=.92;ctx.lineWidth=.063;ctx.strokeStyle=zoneColors[zone-1];ctx.stroke();ctx.globalAlpha=1;
 }
 ctx.restore();
 for(const [a,b] of R.edges){
  const A=R.cells[a],B=R.cells[b],x=X(A.x),y=Y(A.y),bx=X(B.x),by=Y(B.y);
  line(ctx,x,y,bx,by,'#b29670',unit*.155);line(ctx,x,y,bx,by,'#312d25',unit*.088);
  if(play&&!bake)for(const depth of depths){
   if(!depth||Math.max(depth[a],depth[b])>2||depth[a]===depth[b])continue;
   const from=depth[a]<depth[b],u=clamp((age-140-Math.min(depth[a],depth[b])*210)/180);
   if(u>0){const fx=from?x:bx,fy=from?y:by;
    line(ctx,fx,fy,fx+((from?bx:x)-fx)*u,fy+((from?by:y)-fy)*u,'#ffe388',unit*.08);
   }
  }
 }
 const newCount=s.wave.reduce((sum,ids)=>sum+ids.length,0);
 for(const cell of R.cells){
  const {id,number:n}=cell,x=X(cell.x),y=Y(cell.y),stage=s.baked[id]?2:s.wet[id]?1:0;
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
  if(opts.previewZone&&R.zones[zone-1].cells.includes(id))outline(ctx,x,y,rr*1.09,zoneColors[zone-1],unit*.1);
  if(n)number(ctx,n,x,y+(unit*.012),unit*.57,progress>.5?stage>0:before>0);
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
 if(!mini){
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
 root.innerHTML=`<aside class="pct-side"><div class="pct-counter"><div><span>生地</span><b data-count="wet">0</b></div><div><span>焼けた数</span><b data-count="baked">0</b></div></div>
 <div class="pct-pay"><table aria-label="焼けた個数と配当倍率"><thead><tr><th scope="col">焼けた数</th><th scope="col">配当</th></tr></thead><tbody></tbody></table></div></aside>
 <div class="pct-tray"><div class="pct-phase"></div><div class="pct-pan"><canvas role="img"></canvas></div><div class="pct-zonelist"><b class="pct-key-title">焼き型をタップして範囲を確認</b><div class="pct-key"></div></div></div>
 <footer class="pct-caption"><img class="pct-feast" src="assets/party-castella-feast.webp" alt=""><strong></strong><span></span></footer>`;
 panel.append(root);const q=k=>root.querySelector(k);
 const phase=q('.pct-phase'),canvas=q('canvas'),ctx=canvas.getContext('2d'),pan=q('.pct-pan'),caption=q('.pct-caption strong'),detail=q('.pct-caption span');
 const legend=q('.pct-key'),table=q('tbody'),wet=q('[data-count="wet"]'),baked=q('[data-count="baked"]');
 const zoneTags=R.zones.map(zone=>{
  const e=document.createElement('button'),tag=document.createElement('b');e.type='button';e.setAttribute('aria-pressed','false');
  tag.textContent=sides[zone.id-1];e.append(tag);
  e.style.setProperty('--zone-color',zoneColors[zone.id-1]);
  const nums=Array.from({length:25},(_,i)=>i+1).filter(n=>R.zoneFor(n)===zone.id);
  e.append(document.createTextNode(nums.join('･')));e.title=zone.name+'　'+nums.join('、')+'番';e.setAttribute('aria-label',e.title+'の焼き範囲を表示');
  e.onclick=()=>{previewZone=previewZone===zone.id?null:zone.id;draw(shown,lastOpts);};legend.append(e);return e;
 });
 const bands=R.payRows.slice().sort((a,b)=>a.count-b.count);
 if(bands[0].count)bands.unshift({count:0,hundredths:0});
 const rows=bands.map(({count,hundredths},i)=>{
  const max=(bands[i+1]?.count??38)-1,row=table.insertRow(0),th=document.createElement('th');
  th.scope='row';th.textContent=count===37?'全焼き':count===max?count:count+'～'+max;
  row.append(th);row.insertCell().textContent=times(hundredths);return row;
 });
 let shown=null,reachKey=null,previewZone=null,shownZone=null,lastOpts={};
 function fit(){
  const w=root.clientWidth,h=root.clientHeight;
  if(!w||!h)return;
  root.style.setProperty('--pct-unit',Math.min(w/350,h/300)+'px');
  const ratio=Math.min(devicePixelRatio||1,2),cw=Math.round(pan.clientWidth*ratio),ch=Math.round(pan.clientHeight*ratio);
  if(cw&&ch&&(canvas.width!==cw||canvas.height!==ch)){canvas.width=cw;canvas.height=ch;repaint();}
 }
 function repaint(){if(shown)paint(ctx,shown,previewZone?{...lastOpts,previewZone}:lastOpts);}
 tiles.addEventListener('load',repaint,{once:true});
 const resize=new ResizeObserver(fit);resize.observe(root);resize.observe(pan);
 fit();
 function draw(s,o={}){
  if(!s)return;
  if(s!==shown)previewZone=null;
  lastOpts=o;
  if(s!==shown||reachKey!==o.reach||shownZone!==previewZone){
   const turn=s.draws.length,last=s.lastNumber,isBake=turn>=6,done=turn===8;
   const delta=s.wave.reduce((sum,arr)=>sum+arr.length,0);
   delete detail.dataset.tier;
   root.dataset.stage=s.phase;root.classList.toggle('pct-sweep',!!s.highestRole);
   wet.textContent=s.wetCount;baked.textContent=s.bakedCount;
   phase.textContent=(o.demo?'デモ　':'')+(done?(s.highestRole?'全焼き達成！':'焼き上がり'):turn>=5?'後半　焼き上げ　'+(turn-5)+'/3':'前半　生地を流す　'+turn+'/5');
   const idx=bands.findLastIndex(row=>row.count<=s.bakedCount);
   rows.forEach((row,i)=>row.classList.toggle('current',isBake&&idx===i));
   zoneTags.forEach((el,i)=>{el.classList.toggle('selected',s.lastZone===i+1);el.setAttribute('aria-pressed',String(previewZone===i+1));});
   if(previewZone){caption.textContent=sides[previewZone-1]+'の焼き範囲';detail.textContent='色のついた型を一度に加熱';}
   else if(!turn){caption.textContent='入賞番号に生地を注ぐ';detail.textContent='同じ番号の型から通路を2マス先まで浸透';}
   else if(done){
    caption.textContent=s.highestRole?'大成功！　全焼きボーナス':s.bakedCount+'個 焼き上がり';
    detail.textContent=s.highestRole?'37個すべて完成　'+times(s.totalHundredths):'最終配当　'+times(s.totalHundredths);
   }else if(turn===5){
    caption.textContent='生地 '+s.wetCount+'個　準備完了';detail.textContent='残り3球は扇形を焼く';
   }else if(isBake){
    caption.textContent=last+'番　'+sides[s.lastZone-1]+'の型で ＋'+delta+'個';
    const top=(o.reach||[]).reduce((best,a)=>!best||a.tier>best.tier||a.tier===best.tier&&a.gain>best.gain?a:best,null);
    if(top){
     detail.dataset.tier=top.tier;
     detail.textContent=top.allClear?'最高役リーチ　'+top.number+'番で全焼き':['リーチ','高額','超高額','最高役'][top.tier]+'　'+top.number+'番で'+times(top.total);
    }else detail.textContent='焼けた数 '+s.bakedCount+'個　あと'+(8-turn)+'球';
   }else{
    caption.textContent=last+'番から生地 ＋'+delta+'個';detail.textContent=s.sources.length>1?'同じ番号の'+s.sources.length+'か所から同時に浸透':'通路を伝い、2マス先まで広がる';
   }
   canvas.setAttribute('aria-label','37個の焼き型。生地 '+s.wetCount+'個、焼き上がり '+s.bakedCount+'個。'+caption.textContent);
   shown=s;reachKey=o.reach;shownZone=previewZone;
  }
  paint(ctx,s,previewZone?{...o,previewZone}:o);
 }
 return {draw,drawMini};
}
function drawMini(ctx,s,o){paint(ctx,s,o,true);}
window.PartyCastellaView={mount,drawMini};
})();

/* Classic boards share their original render clocks, coordinates and event payloads. */
(()=>{
 'use strict';
 if(document.documentElement.dataset.lineup!=='classic')return;
 const [cookie,canyon,six]=slots;
 cookie.panel.classList.add('classic-cookie');cookie.holder.classList.add('classic-cookie-tab');
 canyon.panel.classList.add('classic-canyon');six.panel.classList.add('classic-six');
 canyon.tab.querySelector('.tab-game-name').setAttribute('aria-label','チョコレートキャニオン');
 const ink=document.createElement('canvas');ink.width=ink.height=384;ink.className='classic-cookie-icing';
 ink.setAttribute('aria-hidden','true');cookie.board.append(ink);
 const icing=ink.getContext('2d');let icingEffect;
 function stamp(cells,linked){
  icingEffect?.cancel();icing.clearRect(0,0,384,384);
  if(!cells?.length)return;
  const unit=384/SIZE,marked=new Set(cells.map(([r,c])=>r*SIZE+c));
  const occupied=(r,c)=>r>=0&&r<SIZE&&c>=0&&c<SIZE&&marked.has(r*SIZE+c);
  icing.lineCap='round';icing.lineJoin='round';icing.beginPath();
  for(const [r,c] of cells){
   const x=c*unit,y=r*unit,pad=3;
   if(!occupied(r-1,c)){icing.moveTo(x+pad,y+pad);icing.lineTo(x+unit-pad,y+pad);}
   if(!occupied(r+1,c)){icing.moveTo(x+pad,y+unit-pad);icing.lineTo(x+unit-pad,y+unit-pad);}
   if(!occupied(r,c-1)){icing.moveTo(x+pad,y+pad);icing.lineTo(x+pad,y+unit-pad);}
   if(!occupied(r,c+1)){icing.moveTo(x+unit-pad,y+pad);icing.lineTo(x+unit-pad,y+unit-pad);}
  }
  icing.setLineDash([]);icing.lineWidth=5;icing.strokeStyle=linked?'#9c3b68':'#a65821';icing.stroke();
  icing.lineWidth=2.6;icing.strokeStyle=linked?'#fff1e8':'#fff3af';icing.stroke();
  icing.setLineDash([.5,6]);icing.lineWidth=2.2;icing.strokeStyle=linked?'#fa9abd':'#f8b756';icing.stroke();icing.setLineDash([]);
  icingEffect=ink.animate(motionReduced?[{opacity:.85},{opacity:.85}]:[{opacity:.15},{opacity:1,offset:.15},{opacity:1,offset:.55},{opacity:0}],{duration:motionReduced?240:linked?710:510});
 }
 // The right-hand survey staff shares the mine's 100 m bonus intervals.
 // Its marker follows the native camera during a scroll, then stays on the new depth.
 function drawDepthStaff(ctx,W,H,depth){
  const top=111,bottom=H-15;if(bottom-top<70)return;
  const x=W-9,base=Math.floor(depth/100)*100,progress=(depth-base)/100;
  ctx.save();ctx.fillStyle='#362a21cf';ctx.strokeStyle='#bb8d59';ctx.lineWidth=1;
  ctx.beginPath();ctx.roundRect(x-20,top-5,27,bottom-top+10,5);ctx.fill();ctx.stroke();
  const y1=top+12,y2=bottom-10,tickY=n=>y2-(y2-y1)*n/10;
  ctx.strokeStyle='#c99962';ctx.beginPath();ctx.moveTo(x+1,y1);ctx.lineTo(x+1,y2);ctx.stroke();
  for(let n=0;n<=10;n++){const y=tickY(n);ctx.fillStyle=n%5?'#d2ac77':'#ffdd91';ctx.fillRect(x-(n%5?4:10),y,1+(n%5?5:11),1);}
  ctx.fillStyle='#ffdf9a';ctx.textAlign='center';ctx.font='bold 7px sans-serif';
  ctx.fillText((base+100)+'m',x-6,top+3);ctx.fillText(base+'m',x-6,bottom+2);
  const marker=tickY(progress*10);ctx.fillStyle='#ffaf52';ctx.beginPath();
  ctx.moveTo(x-15,marker-3.8);ctx.lineTo(x-8,marker);ctx.lineTo(x-15,marker+3.8);ctx.closePath();ctx.fill();
  ctx.restore();
 }
 // Directional survey marks stay just inside the struck chocolate square.
 // Contacts already incorporate the scroll depth; the layout uses snug, square cells.
 const originalChoco=drawChoco;
 drawChoco=function(s,now){
  const result=originalChoco(s,now),fx=s.engine?.fx;
  if(s!==canyon||active!==s.i||app.phase==='ready'||!s.chocoCtx)return result;
  const ctx=s.chocoCtx,W=s.chocoCanvas.width/2,H=s.chocoCanvas.height/2;
  const scroll=fx?.phase==='canyonScroll'?fx:fx?.scroll;
  const depth=scroll?scroll.oldDepth+scroll.advanced*Math.min(1,fx.elapsed/fx.ms):s.engine.depth;
  ctx.save();ctx.setTransform(2,0,0,2,0,0);drawDepthStaff(ctx,W,H,depth);ctx.restore();
  if(!fx||!['canyonDrill','canyonBore'].includes(fx.phase))return result;
  const {w,h,left,top}=chocoBoardLayout(W,H),progress=motionReduced?.75:Math.max(0,Math.min(1,fx.elapsed/fx.ms));
  ctx.save();ctx.setTransform(2,0,0,2,0,0);ctx.lineCap='round';
  for(const hit of fx.contacts||[]){
   const x=left+(hit.c+.5)*w,y=top+(hit.r+.5)*h;
   ctx.save();ctx.translate(x,y);ctx.rotate(hit.direction==='top'?0:hit.direction==='left'?-Math.PI/2:Math.PI/2);
   const radius=w*.38,corner=w*.15;
   ctx.strokeStyle='#542911';ctx.lineWidth=2.6;
   ctx.beginPath();for(const sx of [-1,1])for(const sy of [-1,1]){
    ctx.moveTo(sx*(radius-corner),sy*radius);ctx.lineTo(sx*radius,sy*radius);ctx.lineTo(sx*radius,sy*(radius-corner));
   }
   ctx.stroke();ctx.lineWidth=1.35;ctx.strokeStyle='#ffe29a';ctx.stroke();
   if(!motionReduced&&progress>.38){
    const t=(progress-.38)/.62;
    for(let j=0;j<5;j++){
     const a=(j+.45)*Math.PI/5,dx=Math.cos(a)*w*(.18+t*.45),dy=-Math.sin(a)*w*(.10+t*.37)+t*t*w*.22;
     ctx.fillStyle=j%2?'#fff4c0':'#df9961';ctx.fillRect(dx,dy,1.5+(1-t),1.2+(1-t));
    }
   }
   ctx.restore();
  }
  ctx.restore();return result;
 };
 // Glass contact ripples use the same row arrival times and revised bottle
 // geometry as the original refill, so accelerated rounds stay synchronized.
 const viewport=six.panel.querySelector('.six-board-viewport');
 if(viewport){
  const shine=document.createElement('span');shine.className='classic-bottle-shine';
  shine.setAttribute('aria-hidden','true');viewport.append(shine);
 }
 const originalSix=drawCarnival;
 drawCarnival=function(s,now){
  const result=originalSix(s,now),e=s.engine,fx=e?.fx;
  if(s!==six||s.i!==active||!fx||!['pyramidTopUp','pyramidRefill','pyramidHit'].includes(fx.phase))return result;
  const x=s.candyCtx,layout=sixLayout(e.rows),elapsed=fx.elapsed||0;
  if(!x)return result;
  x.save();x.setTransform(2,0,0,2,0,0);x.lineWidth=1.5;
  if(fx.phase==='pyramidHit'){
   const t=motionReduced?.45:Math.max(0,Math.min(1,elapsed/fx.ms));
   for(const [r,c] of fx.cells||[]){
    const p=sixXY(r,c,e.rows);x.strokeStyle='#fff8d8';x.globalAlpha=1-t*.58;x.beginPath();x.arc(p.x,p.y,layout.radius*(.85+.37*t),0,Math.PI*2);x.stroke();
    x.strokeStyle='#75eff2';x.beginPath();x.arc(p.x,p.y,layout.radius*(1.03+.37*t),Math.PI*1.12,Math.PI*1.85);x.stroke();
   }
  }else if(!motionReduced){
   const order=fx.rowOrder||sixGlassRows(fx.added,e.rows);
   for(const [i,r] of order.entries()){
    const t=(elapsed-i*SIX_REFILL_ROW_MS-SIX_REFILL_FALL_MS)/SIX_REFILL_SETTLE_MS;
    if(t<0||t>1)continue;
    for(let c=0;c<fx.grid[r].length;c++){
     if(!fx.grid[r][c]||fx.added&&!fx.added.some(a=>a.r===r&&a.c===c))continue;
     const p=sixXY(r,c,e.rows);
     x.globalAlpha=(1-t)*.82;x.strokeStyle='#a1f7fc';x.beginPath();
     x.ellipse(p.x,p.y+layout.radius*.88,layout.radius*(.22+.78*t),layout.radius*(.09+.19*t),0,0,Math.PI*2);x.stroke();
    }
   }
  }
  x.restore();return result;
 };
 const originalEvent=event;
 event=function(i,ev,e,a){
  const result=originalEvent(i,ev,e,a);
  if(i===cookie.i&&active===i){
   if(ev.phase==='hit')stamp(ev.primaryCells,false);
   else if(ev.phase==='link')stamp(ev.primaryCells,true);
   else if(ev.phase==='ready'||ev.phase==='vanish'||ev.phase==='complete')icingEffect?.cancel();
  }
  if(i===six.i&&e.kind==='candy'){
   six.panel.classList.toggle('classic-form-lit',ev.phase==='pyramidShape'||ev.phase==='pyramidAward');
   if(ev.phase==='pyramidShape'||ev.phase==='pyramidAward'){
    const types=new Set((ev.forms||[]).map(f=>f.type));
    for(const row of six.sixOdds?.querySelectorAll('[data-simple-role]')||[])row.classList.toggle('classic-winning-role',types.has(row.dataset.simpleRole));
   }else if(ev.phase==='settled'||ev.phase==='ready'||ev.phase==='pyramidHit'){
    for(const row of six.sixOdds?.querySelectorAll('.classic-winning-role')||[])row.classList.remove('classic-winning-role');
   }
  }
  return result;
 };
})();

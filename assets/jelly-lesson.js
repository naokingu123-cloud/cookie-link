/* One row of the jelly mould, enlarged for the four BET lessons. */
(()=>{
'use strict';
const steps=[
 {title:'青いゼリーの道を開く',caption:'前半5球。HITマスの四方が開き、青いFREEとつながると広がる。'},
 {title:'赤・黄・緑の順に注ぐ',caption:'後半3球は仕切りが固定。つながった区画にゼリーが流れる。'},
 {title:'色が変わると倍率アップ',caption:'何マスの色が変わっても、1球につき倍率は＋0.5。'},
 {title:'5マス満ちればビンゴ',caption:'縦・横・斜めに5マス。ゼリーの色は混ざっていてもOK。'}
];
const palette={blue:['#b9ffff','#26d8ef','#1479b0'],red:['#ffd8d3','#fc697a','#b42b67'],yellow:['#fff8c2','#ffcf42','#dc8b16'],green:['#d6ffd6','#62d99c','#178a74'],purple:['#f4d4ff','#bf85f4','#764dba']};
const numbers=[2,7,12,18,24],font='"Hiragino Maru Gothic ProN","Yu Gothic",Meiryo,system-ui,sans-serif';
const plate=new Image();plate.src='assets/jelly-crystal-mold.webp';
function ramp(t,start,end){const q=Math.min(1,Math.max(0,(t-start)/(end-start)));return q*q*(3-2*q);}
function box(c,x,y,w,h,r,fill,edge){
 c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill();}if(edge){c.lineWidth=2;c.strokeStyle=edge;c.stroke();}
}
function label(c,s,x,y,size,ink='#fff9e9',outline='',max=490){
 c.font='900 '+size+'px '+font;c.textBaseline='middle';c.textAlign='center';c.lineJoin='round';
 if(outline){c.lineWidth=Math.max(3,size*.15);c.strokeStyle=outline;c.strokeText(s,x,y,max);}
 c.fillStyle=ink;c.fillText(s,x,y,max);
}
function badge(c,s,x,y,w,accent='#aaf9f1'){
 box(c,x-w/2,y-16,w,32,16,'#123c4b',accent);label(c,s,x,y,18,'#fffbe8','',w-10);
}
function rim(c,x,y,w,h){
 box(c,x,y,w,h,15,'#315f69','#afebdd');
 if(!plate.complete||!plate.naturalWidth)return;
 const s=plate.naturalWidth,a=[0,73,s-73,s],xs=[x,x+10,x+w-10,x+w],ys=[y,y+10,y+h-10,y+h];
 for(let i=0;i<3;i++)for(let j=0;j<3;j++)c.drawImage(plate,a[j],a[i],a[j+1]-a[j],a[i+1]-a[i],xs[j],ys[i],xs[j+1]-xs[j],ys[i+1]-ys[i]);
}
function jellyGradient(c,y,h,tone){
 const col=palette[tone],g=c.createLinearGradient(0,y,0,y+h);
 g.addColorStop(0,col[0]);g.addColorStop(.19,col[1]);g.addColorStop(.68,col[1]);g.addColorStop(1,col[2]);return g;
}
function glaze(c,x,y,w,h,tone,t){
 c.fillStyle=jellyGradient(c,y,h,tone);c.fillRect(x,y,w,h);
 c.strokeStyle='#ffffff55';c.lineWidth=3;c.beginPath();c.moveTo(x,y+13);c.bezierCurveTo(x+w*.4,y+22,x+w*.57,y+4,x+w,y+8);c.stroke();
 for(let j=0;j<3;j++){const px=x+w*(.16+.31*j),py=y+h*(.3+.17*j)+Math.sin(t*5+j)*1.6;c.beginPath();c.arc(px,py,1.8+(j%2),0,2*Math.PI);c.strokeStyle='#f0ffff89';c.lineWidth=1.2;c.stroke();}
}
function strip(c,scene,t){
 const five=scene===3,cols=five?5:3,w=five?80:108,h=five?69:84,x=(520-cols*w)/2,y=five?62:78;
 rim(c,x-12,y-12,cols*w+24,h+24);
 const opening=ramp(t,.16,.38),fill=ramp(t,.33,.67),mix=ramp(t,.23,.70),finish=ramp(t,.18,.48);
 for(let i=0;i<cols;i++){
  const left=x+i*w;
  if(scene===0){
   if(i===0)glaze(c,left,y,w,h,'blue',t);
   else{const depth=Math.max(0,Math.min(w,(2*fill-i+1)*w));if(depth){c.save();c.beginPath();c.rect(left,y,depth,h);c.clip();glaze(c,left,y,w,h,'blue',t);c.restore();}}
  }else if(scene===1){
   glaze(c,left,y,w,h,'blue',t);const depth=Math.max(0,Math.min(w,(3*mix-2+i)*w));
   if(depth){c.save();c.beginPath();c.rect(left+w-depth,y,depth,h);c.clip();glaze(c,left,y,w,h,'purple',t);c.restore();}
  }else if(i<4){glaze(c,left,y,w,h,i<3?'purple':'blue',t);}
  else if(finish){
   c.save();c.beginPath();c.rect(left,y,w,h);c.clip();c.beginPath();c.arc(left+w/2,y+h/2,finish*Math.hypot(w,h)*.51,0,2*Math.PI);c.clip();glaze(c,left,y,w,h,'yellow',t);c.restore();
  }
 }
 for(let i=1;i<cols;i++){
  const seam=x+i*w,wall=scene===0?1-opening:five&&i>=3?1:0;
  if(wall>.01){
   const len=h/2*wall;
   for(const [yy,hh] of [[y,len],[y+h-len,len]]){c.fillStyle='#d1f4ed';c.fillRect(seam-3,yy,6,hh);c.fillStyle='#629aaf';c.fillRect(seam+2,yy,2,hh);}
  }
 }
 for(let i=0;i<cols;i++)label(c,numbers[i],x+(i+.5)*w,y+h*.55,five?32:39,'#fffdf0','#203a51');
 // Actual drawn numbers are stamped; the surrounding filled cells keep their numerals.
 for(const i of (scene===0?(t>=.16?[1]:[]):scene===1?(t>=.19?[1,2]:[1]):(t>=.18?[1,2,4]:[1,2]))){
  c.save();c.translate(x+(i+.5)*w+8,y+h*.77);c.rotate(-.14);label(c,'HIT!',0,0,five?15:19,'#ff5372','#fff6d8');c.restore();
 }
 if(scene===0){
  badge(c,'青 FREE',x+w*.5,34,91);badge(c,'7番',x+w*1.5,31+8*ramp(t,.02,.16),66,'#ffd48c');
  badge(c,t<.38?'仕切りが開く':'青がとなりへ',260,207,171);
 }else if(scene===1){
  ['6球目　赤','7球目　黄','8球目　緑'].forEach((s,i)=>badge(c,s,112+i*148,28,129,palette[['red','yellow','green'][i]][1]));
  if(t<.44){const q=ramp(t,.02,.22);c.save();c.globalAlpha=1-ramp(t,.22,.44);drop(c,x+w*2.5,45+q*43,10,'red');c.restore();}
  badge(c,'12番の区画に赤を注入',260,207,235,'#ffb0bb');
 }else{
  badge(c,'7球目　24番',260,23,161,'#ffdc79');
  const q=ramp(t,.5,.70);
  if(q){c.save();c.globalAlpha=q;box(c,x-7,y-7,cols*w+14,h+14,9,null,'#ffec8e');c.restore();}
  label(c,'100 BET',126,183,18,'#dbfff2','#173e4c');
  label(c,'基本 0.2倍 × 1.5',126,210,20,'#fff5bd','#173e4c');
  label(c,'→',253,196,30,'#fff5bd','#173e4c');
  box(c,292,167,176,56,20,'#173c48','#ffe49c');label(c,t<.5?'リーチ':'30 WIN',380,195,t<.5?24:32,'#ffea9d');
 }
}
function drop(c,x,y,r,tone){
 c.beginPath();c.moveTo(x,y-r);c.bezierCurveTo(x+r*.25,y-r*.46,x+r*.85,y,x+r*.82,y+r*.28);
 c.bezierCurveTo(x+r*.78,y+r,x-r*.78,y+r,x-r*.82,y+r*.28);c.bezierCurveTo(x-r*.85,y,x-r*.25,y-r*.46,x,y-r);c.closePath();
 c.fillStyle=jellyGradient(c,y-r,2*r,tone);c.fill();c.strokeStyle=palette[tone][0];c.lineWidth=2;c.stroke();
 c.beginPath();c.ellipse(x-r*.27,y+r*.03,r*.10,r*.24,.5,0,2*Math.PI);c.fillStyle='#ffffffa8';c.fill();
}
function mixScene(c,t){
 const q=ramp(t,.13,.52),up=ramp(t,.43,.64);
 const a=107+25*q,b=226-25*q;
 drop(c,a,77,34,'blue');drop(c,b,77,34,'red');
 label(c,'青',a,132,20,'#cbffff','#193f53');label(c,'赤',b,132,20,'#ffe3e4','#513848');
 label(c,'＋',(a+b)/2,82,23,'#fff5bd','#173e4c');
 label(c,'→',284,83,35,'#fff5bd','#173e4c');
 c.save();c.globalAlpha=.2+.8*up;drop(c,379,77,42,'purple');c.restore();
 label(c,'紫に変化',379,135,21,'#ffe3fc','#48324c');
 box(c,106,168,308,54,20,'#163d48','#abeacd');
 label(c,'ODDS',164,196,20,'#a6f5d6');label(c,up>.35?'×1.0 → ×1.5':'×1.0',294,196,28,'#fff1bf');
}
(window.SweetsAttractLessons??={}).jelly={steps,draw(c,i,t){c.save();if(i===2)mixScene(c,t);else strip(c,i,t);c.restore();}};
})();

/* Glass mould, syrup fronts and illuminated bingo rails share one coordinate system. */
(()=>{
'use strict';
const K=window.JellyRules;
const font='"Arial Rounded MT Bold","Hiragino Maru Gothic ProN","Yu Gothic",Meiryo,system-ui,sans-serif';
const tau=2*Math.PI,clamp=(n,max=1)=>Math.max(0,Math.min(max,n));
const syrup={
 blue:['#85faff','#12accf','#1476ac','#204976'],
 red:['#ffb0af','#f6506b','#bf335a','#6f264a'],
 yellow:['#ffeda0','#ffc34e','#e6943d','#935128'],
 green:['#c0ffd2','#60de9e','#21a584','#246c69']
};
const laneColors=['#ffbc7c','#ffda97','#ffb1ba','#a4ffeb','#a9dfff','#c7b3ff'];
const tiers=[1,2,3,4,5,6,7,8,9,10,12];
const emblem=new Image();emblem.src='assets/jelly-emblem.svg';
const center=i=>[50+i%5*100,50+Math.floor(i/5)*100];
function gradient(c,x,y,x2,y2,stops){
 const g=c.createLinearGradient(x,y,x2,y2);for(const [at,color] of stops)g.addColorStop(at,color);return g;
}
function rect(c,x,y,w,h,r,color,edge='',lw=1){
 c.beginPath();c.roundRect(x,y,w,h,Math.min(r,w/2,h/2));if(color){c.fillStyle=color;c.fill();}
 if(edge){c.strokeStyle=edge;c.lineWidth=lw;c.stroke();}
}
function oval(c,x,y,rx,ry,fill,edge='',lw=1){
 c.beginPath();c.ellipse(x,y,rx,ry,0,0,tau);if(fill){c.fillStyle=fill;c.fill();}if(edge){c.lineWidth=lw;c.strokeStyle=edge;c.stroke();}
}
function line(c,x1,y1,x2,y2,ink,lw){
 c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.lineWidth=lw;c.strokeStyle=ink;c.stroke();
}
function lettering(c,text,x,y,size,fill,opts={}){
 c.save();c.font=(opts.weight||800)+' '+size+'px '+(opts.face||font);
 c.textAlign=opts.align||'center';c.textBaseline='middle';c.lineJoin='round';
 if(opts.outline){c.strokeStyle=opts.outline;c.lineWidth=opts.width||size*.13;c.strokeText(String(text),x,y,opts.max);}
 c.fillStyle=fill;c.fillText(String(text),x,y,opts.max);c.restore();
}
function star(c,x,y,r,color){
 c.save();c.translate(x,y);c.beginPath();c.moveTo(0,-r);
 for(let k=1;k<=8;k++){const ang=k*Math.PI/4-Math.PI/2,rad=k%2?r*.21:r;c.lineTo(rad*Math.cos(ang),rad*Math.sin(ang));}
 c.fillStyle=color;c.fill();c.restore();
}
function hardCandy(c,x,y,r,p){
 const g=gradient(c,x-r,y-r,x+r*.6,y+r,[[0,p[0]],[.32,p[1]],[.7,p[2]],[1,p[3]]]);
 oval(c,x,y,r,r,g,'#ffe3ae',r*.11);
 oval(c,x-r*.26,y-r*.42,r*.36,r*.13,'#fff8e9b5');
}
let shell;
function shellArt(){
 if(shell)return shell;
 shell=document.createElement('canvas');shell.width=shell.height=650;
 const c=shell.getContext('2d');c.scale(650/550,650/550);c.translate(25,25);
 const gold=gradient(c,-20,-20,510,520,[[0,'#bc8153'],[.11,'#ffebbd'],[.27,'#bc804d'],[.41,'#fff2c7'],[.58,'#9e6142'],[.76,'#ffe2a3'],[1,'#c18e60']]);
 rect(c,-18,-13,536,536,24,'#092733b5');
 rect(c,-20,-20,540,540,25,gold,'#633f46',2.5);
 rect(c,-15.5,-15.5,531,531,20,'#356772','#f8e8b5',2);
 rect(c,-11,-11,522,522,19,'#38636c','#a7e4db',2.2);
 for(let k=0;k<18;k++){
  const n=17+k*27.4;
  for(const [x,y] of [[n,-13],[n,513],[-13,n],[513,n]])oval(c,x,y,1.7,1.7,'#ffe5bd');
 }
 rect(c,-5,-5,510,510,12,'#133744','#ebd4a2',3);
 const floor=gradient(c,0,0,360,540,[[0,'#335b69'],[.3,'#254c5c'],[.65,'#14394b'],[1,'#1a494f']]);
 rect(c,0,0,500,500,9,floor);
 c.save();c.clip();
 // The engraved pattern is visible through unfilled compartments.
 for(let y=-16;y<520;y+=23)for(let x=0;x<520;x+=29){
  const xx=x+Math.floor(y/23)%2*14;
  c.strokeStyle='#b7fff318';c.lineWidth=1;c.beginPath();c.moveTo(xx-3,y);c.quadraticCurveTo(xx,y-1,xx,y-4);
  c.quadraticCurveTo(xx,y-1,xx+3,y);c.quadraticCurveTo(xx,y+1,xx,y+4);c.quadraticCurveTo(xx,y+1,xx-3,y);c.stroke();
 }
 c.restore();
 for(const [x,y,color] of [[-11,-11,'red'],[511,-11,'yellow'],[511,511,'green'],[-11,511,'blue']]){
  oval(c,x,y,10,10,gold,'#6d5960',1);hardCandy(c,x,y,7,syrup[color]);
 }
 return shell;
}
const waveStart=t=>t?.ball<=5?260:130;
const waveStep=92,fillTime=400;
function waveEnd(t){return t.wave.length?waveStart(t)+(t.wave.length-1)*waveStep+fillTime:t.ball<=5?520:470;}
function duration(t){return t?waveEnd(t)+(t.newLines.length?850:170):0;}
let lastTurn,paths=new Map();
function getPaths(turn,state){
 if(turn===lastTurn)return paths;
 lastTurn=turn;paths=new Map();
 if(!turn)return paths;
 const dist=new Map();turn.wave.forEach((layer,d)=>layer.forEach(i=>dist.set(i,d)));
 for(const [i,d] of dist){
  const adjacent=[i-5,i+5,i%5?i-1:-1,i%5!==4?i+1:-1];
  const sources=adjacent.filter(j=>j>=0&&j<25&&K.isOpen(state,i,j)&&
    (d>0?dist.get(j)===d-1:turn.ball<=5&&turn.before.colors[j]==='blue'&&!dist.has(j)));
  const [x,y]=center(i);
  const origins=sources.map(j=>{const [a,b]=center(j);return [(x+a)/2,(y+b)/2];});
  paths.set(i,{start:waveStart(turn)+d*waveStep,origins:origins.length?origins:[[x,y]]});
 }
 return paths;
}
let caustics;
function refractionArt(){
 if(caustics)return caustics;
 caustics=document.createElement('canvas');caustics.width=caustics.height=500;
 const c=caustics.getContext('2d');
 for(const y of [-88,44,177,309,442,575]){
  c.beginPath();c.moveTo(-40,y+52);c.bezierCurveTo(96,y+12,118,y+32,226,y-4);
  c.bezierCurveTo(367,y-49,448,y-26,546,y-69);c.lineTo(546,y-45);
  c.bezierCurveTo(421,y-5,375,y-13,249,y+21);c.bezierCurveTo(120,y+57,90,y+44,-40,y+81);c.closePath();
  c.fillStyle='#eafff423';c.fill();
  c.beginPath();c.moveTo(-40,y+90);c.bezierCurveTo(105,y+53,127,y+66,247,y+26);c.bezierCurveTo(372,y-10,440,y+3,544,y-40);
  c.strokeStyle='#fff5d333';c.lineWidth=2;c.stroke();
 }
 return caustics;
}
function cell(c,i,color,time,mini,paints){
 const [cx,cy]=center(i),x=cx-50,y=cy-50,p=syrup[color];
 // Use one continuous hue across adjoining compartments. The open seams have no tile edges.
 const g=paints[color]??=gradient(c,0,0,160,510,[[0,p[0]],[.2,p[1]],[.62,p[2]],[1,p[3]]]);
 c.fillStyle=g;c.fillRect(x-.12,y-.12,100.24,100.24);
 if(mini)return;
 c.drawImage(refractionArt(),x,y,100,100,x,y,100,100);
 const drift=Math.sin(time*.0015+i*1.71)*2;
 const bx=x+16+(i*37%65),by=y+20+(i*19%59)+drift;
 oval(c,bx,by,3.4,3.4,'#faffff12','#eefffa52',1.1);oval(c,bx-.9,by-1,1.4,.8,'#fff8df88');
 oval(c,x+8+(i*23%80),y+13+(i*11%70)-drift,1.45,1.45,'#f9fff95e');
}
function fillCells(c,state,turn,elapsed,time,mini){
 const paths=getPaths(turn,state),paints={};
 for(let i=0;i<25;i++){
  const current=state.colors[i];if(!current)continue;
  const entry=paths.get(i);
  if(!entry||elapsed>=entry.start+fillTime){cell(c,i,current,time,mini,paints);continue;}
  const previous=turn.before.colors[i];
  if(previous)cell(c,i,previous,time,mini,paints);
  const t=clamp((elapsed-entry.start)/fillTime);if(!t)continue;
  const [x,y]=center(i),radius=(1-Math.pow(1-t,1.3))*122;
  c.save();c.beginPath();c.rect(x-50.1,y-50.1,100.2,100.2);c.clip();
  c.beginPath();for(const [a,b] of entry.origins){c.moveTo(a+radius,b);c.arc(a,b,radius,0,tau);}
  c.save();c.clip();cell(c,i,current,time,mini,paints);c.restore();
  c.strokeStyle='#f1fff8b3';c.lineWidth=3*(1-t*.6);c.stroke();c.restore();
 }
}
let lastGlazedState,glaze;
function glazeArt(state){
 if(state===lastGlazedState)return glaze;
 lastGlazedState=state;
 glaze=document.createElement('canvas');glaze.width=glaze.height=500;
 const c=glaze.getContext('2d');
 for(let i=0;i<25;i++){
  const color=state.colors[i];if(!color)continue;
  const x=i%5*100,y=Math.floor(i/5)*100;
  const lip=j=>j<0||j>=25||state.colors[j]!==color||!K.isOpen(state,i,j);
  const top=lip(i-5),bottom=lip(i+5),left=i%5===0||lip(i-1),right=i%5===4||lip(i+1);
  c.save();c.beginPath();c.rect(x,y,100,100);c.clip();c.translate(x,y);
  for(const [edge,angle] of [[top,0],[right,Math.PI/2],[bottom,Math.PI],[left,Math.PI*1.5]]){
   if(!edge)continue;
   c.save();c.translate(50,50);c.rotate(angle);c.translate(-50,-50);
   const dark=angle===Math.PI||angle===Math.PI/2;
   const band=gradient(c,0,0,0,23,[[0,dark?'#26324d88':'#efffe5a8'],[.22,dark?'#27395570':'#d7ffeb5c'],[.52,dark?'#eeffe424':'#fff5d42e'],[1,'#efffff00']]);
   c.fillStyle=band;c.fillRect(0,0,100,23);line(c,0,3.5,100,3.5,dark?'#ffe9b960':'#fff9de94',2);
   c.restore();
  }
  if(top&&(left||i%3===0)){
   // A curved two-part showroom reflection follows only an exposed liquid surface.
   c.beginPath();c.moveTo(9,22);c.bezierCurveTo(13,10,27,8,55,10);c.bezierCurveTo(45,13,29,14,23,19);c.bezierCurveTo(17,25,10,27,9,22);
   c.fillStyle='#fffbe6aa';c.fill();
   oval(c,65,10,5.5,2,'#faffee9e');
  }
  if(bottom&&(right||i%4===0)){
   c.beginPath();c.moveTo(51,91);c.quadraticCurveTo(83,100,95,72);c.quadraticCurveTo(96,96,67,95);c.closePath();c.fillStyle='#ffe8b658';c.fill();
  }
  c.restore();
 }
 return glaze;
}
function glazeCells(c,state,turn,elapsed){
 const current=glazeArt(state),paths=getPaths(turn,state);
 for(let i=0;i<25;i++){
  if(!state.colors[i])continue;
  const x=i%5*100,y=Math.floor(i/5)*100,entry=paths.get(i);
  const t=entry?clamp((elapsed-entry.start-fillTime*.66)/(fillTime*.34)):1;
  if(t>0){c.globalAlpha=t;c.drawImage(current,x,y,100,100,x,y,100,100);}
 }
 c.globalAlpha=1;
}
function glassWall(c,x,y,dx,dy,from=0,to=1,lite=false){
 if(to<=from)return;
 const x1=x+dx*from,y1=y+dy*from,x2=x+dx*to,y2=y+dy*to;
 line(c,x1+.8,y1+1,x2+.8,y2+1,'#163e50',lite?5:7);
 line(c,x1,y1,x2,y2,'#80c8ca',lite?4:4.6);
 if(!lite)line(c,x1-1.2,y1-1.1,x2-1.2,y2-1.1,'#ebf9dc',1.65);
}
function partitions(c,state,turn,elapsed,mini){
 const recently=turn?.opened;
 const melt=clamp((elapsed-55)/450);
 c.lineCap='butt';
 for(let i=0;i<25;i++){
  const row=Math.floor(i/5),col=i%5;
  for(const next of [col<4?i+1:-1,row<4?i+5:-1]){
   if(next<0)continue;
   const vertical=next===i+1,x=(col+(vertical?1:0))*100,y=(row+(vertical?0:1))*100;
   const dx=vertical?0:100,dy=vertical?100:0;
   if(!K.isOpen(state,i,next))glassWall(c,x,y,dx,dy,0,1,mini);
   else if(melt<1&&recently?.some(([a,b])=>(a===i&&b===next)||(a===next&&b===i))){
    const tip=(1-melt)*.5;
    glassWall(c,x,y,dx,dy,0,tip);glassWall(c,x,y,dx,dy,1-tip,1);
    if(!mini){star(c,x+dx*tip,y+dy*tip,6*(1-melt),'#fff5bf');star(c,x+dx*(1-tip),y+dy*(1-tip),6*(1-melt),'#fff5bf');}
   }
  }
 }
}
function bingoRails(c,state,turn,elapsed,time,mini){
 c.lineCap='round';
 for(const id of state.lines){
  const newIndex=turn?turn.newLines.indexOf(id):-1;
  const travel=newIndex===-1?1:clamp((elapsed-waveEnd(turn)-Math.min(210,newIndex*36))/430);
  if(!travel)continue;
  const cells=K.LINES[id],[x,y]=center(cells[0]),[x2,y2]=center(cells[4]);
  const dx=x2-x,dy=y2-y,ex=x+dx*travel,ey=y+dy*travel,color=laneColors[id%laneColors.length];
  c.save();
  c.globalAlpha=mini?.7:.19;line(c,x,y,ex,ey,color,mini?10:23);
  if(!mini){c.globalAlpha=.43;line(c,x,y,ex,ey,'#ffe7a8',12);}
  c.globalAlpha=.95;line(c,x,y,ex,ey,'#ffde89',7);
  const shine=gradient(c,x,y,x2,y2,[[0,'#fff8e4'],[.25,color],[.55,'#fffce7'],[.78,color],[1,'#fff2af']]);
  line(c,x,y,ex,ey,shine,4);
  if(!mini){
   if(travel<1)star(c,ex,ey,14,'#fffae1');
   const s=(time/2100+id*.173)%1;
   if(s<travel){
    const a=Math.max(0,s-.13),b=Math.max(.002,Math.min(travel,s+.105));
    const streak=gradient(c,x+dx*a,y+dy*a,x+dx*b,y+dy*b,[[0,'#fffce800'],[.53,'#fffde3'],[1,'#fffce800']]);
    line(c,x+dx*a,y+dy*a,x+dx*b,y+dy*b,streak,4.8);
    star(c,x+dx*s,y+dy*s,7+2*Math.sin(s*18),'#fffef2');
   }
  }
  c.restore();
 }
}
function source(c,turn,elapsed,mini){
 if(!turn||elapsed>690)return;
 const [x,y]=center(turn.index),p=clamp(elapsed/680),color=syrup[turn.ball<=5?'blue':turn.color][0];
 c.save();c.globalAlpha=1-p;
 if(turn.ball>5&&!mini&&elapsed<650){
  const head=clamp(elapsed/210),tail=clamp((elapsed-400)/250),sx=x+(turn.index%5>=3?-36:36),sy=y-122;
  function spout(t){return [sx+(x-sx)*t+Math.sin(t*Math.PI)*10,sy+(y-sy)*t*t];}
  const jet=new Path2D();
  for(let j=0;j<=17;j++){const [px,py]=spout(tail+(head-tail)*j/17);if(!j)jet.moveTo(px,py);else jet.lineTo(px,py);}
  const [px,py]=spout(head),palette=syrup[turn.color];
  c.lineCap='round';c.lineJoin='round';c.strokeStyle=palette[2];c.lineWidth=13;c.stroke(jet);
  c.strokeStyle=palette[0];c.lineWidth=8;c.stroke(jet);
  c.save();c.translate(-2,0);c.strokeStyle='#fffdefc9';c.lineWidth=2.4;c.stroke(jet);c.restore();
  oval(c,px,py,6.8,8,palette[0],'#fff1c7',1.8);
  if(head===1){const splash=clamp((elapsed-190)/430);
   for(let k=0;k<5;k++){const ang=Math.PI*(1.08+k*.21),r=14+41*splash;
    oval(c,x+r*Math.cos(ang),y+r*Math.sin(ang)+18*splash*splash,3.3-splash,4.5-splash,palette[0],'#fff3d8',1.2);}
  }
 }

 oval(c,x,y,15+42*p,15+42*p,'',color,4-2*p);
 if(!mini)for(let k=0;k<8;k++){
  const a=k*tau/8+.13,r=23+35*p;star(c,x+Math.cos(a)*r,y+Math.sin(a)*r,3.5*(1-p)+1,color);
 }
 c.restore();
}
const reachPaint=['#ffecbb','#ffbc62','#ff7d9e','#afffe5'];
function board(c,state,o,x,y,side){
 const {time=0,elapsed=0,turn,mini}=o,scale=side/550;
 c.save();c.translate(x+25*scale,y+25*scale);c.scale(scale,scale);
 c.drawImage(shellArt(),-25,-25,550,550);
 c.save();c.beginPath();c.roundRect(0,0,500,500,9);c.clip();
 fillCells(c,state,turn,elapsed,time,mini);if(!mini)glazeCells(c,state,turn,elapsed);partitions(c,state,turn,elapsed,mini);
 bingoRails(c,state,turn,elapsed,time,mini);source(c,turn,elapsed,mini);
 const markers=new Map((o.reach||[]).map(item=>[item.number,item.tier]));
 for(let i=0;i<25;i++){
  const [x,y]=center(i),n=state.numbers[i],marked=markers.has(n);
  const wet=state.colors[i],ink=wet?'#203349':'#193643';
  if(marked&&!mini){const color=reachPaint[markers.get(n)]||reachPaint[0];oval(c,x+31,y-29,7,7,color,ink,2.4);star(c,x+30,y-30,4,'#fffeef');}
  lettering(c,n,x,y+1,mini?52:42,'#fff9dd',{weight:900,outline:ink,width:mini?9:6.2});
 }
 c.restore();
 rect(c,-1.4,-1.4,502.8,502.8,10,'','#f4e8b9',3.8);
 c.restore();
}
function visibleCount(state,turn,elapsed){
 return !turn?state.lines.length:state.lines.length-turn.newLines.length+
   turn.newLines.filter((_,j)=>elapsed>=waveEnd(turn)+Math.min(210,j*36)+215).length;
}
function stageText(turns,demo){
 if(!turns)return demo?'遊び方デモ':'青ゼリーが最初からHIT';
 if(turns<=5)return '第'+turns+'球　仕切りを外す';
 return '第'+turns+'球　'+['いちご','レモン','メロン'][turns-6]+'注入';
}
function ticket(c,w,h){
 const shell=gradient(c,0,0,w,h,[[0,'#ffe9ae'],[.24,'#c7945d'],[.45,'#fff4c8'],[.8,'#b67952'],[1,'#e4bb80']]);
 rect(c,0,3,w,h-3,13,'#143340ab');
 rect(c,0,0,w,h-3,13,shell,'#663e3e',1.4);
 const glaze=gradient(c,0,0,w*.2,h,[[0,'#316c70'],[.32,'#1e525b'],[.68,'#17414c'],[1,'#173844']]);
 rect(c,3,3,w-6,h-9,10,glaze,'#ffeebd',1);
 rect(c,6,6,w-12,h-15,8,'','#e9d9ad66',1);
}
function logo(c,x,y,w,h){
 if(emblem.complete&&emblem.naturalWidth){
  const s=Math.min(w/352,h/142);c.drawImage(emblem,x+(w-352*s)/2,y+(h-142*s)/2,352*s,142*s);
 }else lettering(c,'Jelly Bingo',x+w/2,y+h/2,Math.min(w*.16,h*.7),'#ffe39a',{face:'Georgia,serif',weight:'italic 900'});
}
function gauges(c,x,y,w,h,count,win){
 const split=w*.45;
 rect(c,x,y,w,h,7,'#11323d','#deb67f',1.4);line(c,x+split,y+5,x+split,y+h-5,'#d6af7c87',1);
 lettering(c,'B I N G O',x+split/2,y+h*.25,h*.17,'#a4dfd2');
 lettering(c,count+' LINE',x+split/2,y+h*.69,h*.37,'#fff2ba',{face:'Georgia,serif',max:split*.91});
 lettering(c,'W I N',x+split+(w-split)/2,y+h*.25,h*.17,'#a4dfd2');
 lettering(c,win.toLocaleString('en-US'),x+split+(w-split)/2,y+h*.69,h*.43,'#ffd66e',{face:'Georgia,serif',max:(w-split)*.94});
}
function vialKeys(c,x,y,w,h,draws){
 const keys=['red','yellow','green'];
 for(let i=0;i<3;i++){
  const cx=x+w*(i+.5)/3,col=keys[i],cw=w/3;
  if(draws===i+6)rect(c,cx-cw*.46,y+1,cw*.92,h-2,5,'#fff2bc20','#f6d6a0',1);
  hardCandy(c,cx-cw*.23,y+h*.5,h*.26,syrup[col]);
  lettering(c,i+6,cx-cw*.23,y+h*.5,h*.31,'#fff8df',{outline:'#603c44',width:.8});
  lettering(c,['赤','黄','緑'][i],cx+cw*.15,y+h*.52,h*.44,'#fff0c8');
 }
}
function payoutEntry(c,x,y,w,h,n,count,compact){
 if(n===count||n===12)rect(c,x+1,y+.6,w-2,h-1.2,3,n===count?'#fff0b039':'#ffc48116',n===count?'#ffe4a6':'#e5c58b70',.8);
 const size=Math.min(h*.66,w*(compact?.21:.19));
 lettering(c,n+(compact?'':'本'),x+w*.08,y+h*.53,size*(compact?1:.87),n===12?'#ffd59d':'#cde7db',{align:'left',max:w*.35});
 lettering(c,'×'+(K.payout(n)/100),x+w*.93,y+h*.53,size,n===12?'#ffe291':'#ffefc9',{align:'right',weight:900,face:'Georgia,serif',max:w*.56});
}
function panel(c,state,o,x,y,w,h,wide){
 c.save();c.translate(x,y);
 const unit=w/(wide?200:420);c.scale(unit,unit);w/=unit;h/=unit;
 const turns=state.draws.length,count=visibleCount(state,o.turn,o.elapsed||0);
 const win=Math.floor(Math.max(0,o.bet||0)*K.payout(count)/100);
 ticket(c,w,h);
 if(wide){
  const logoH=Math.min(71,h*.205),headY=logoH+5;
  logo(c,8,4,w-16,logoH);
  const stageH=Math.min(20,h*.059);
  rect(c,12,headY,w-24,stageH,3,'#edf1cb','#dfb475',1);
  lettering(c,stageText(turns,o.demo),w/2,headY+stageH*.53,stageH*.62,'#29505a',{max:w-29});
  const vialY=headY+stageH+2,vialH=Math.min(24,h*.075);
  vialKeys(c,17,vialY,w-34,vialH,turns);
  const gaugeY=vialY+vialH+2,gaugeH=Math.min(48,h*.13);
  gauges(c,12,gaugeY,w-24,gaugeH,count,win);
  const titleY=gaugeY+gaugeH+Math.min(16,h*.037);
  line(c,13,titleY,49,titleY,'#cdae75',1);line(c,w-49,titleY,w-13,titleY,'#cdae75',1);
  lettering(c,'ライン配当',w/2,titleY,Math.min(15,h*.04),'#ffe8b4');
  const start=titleY+Math.min(12,h*.026),rowH=Math.min(32,(h-15-start)/6),colW=(w-24)/2;
  tiers.forEach((n,j)=>{const row=j%6,col=Math.floor(j/6);payoutEntry(c,12+col*colW,start+row*rowH,colW,rowH,n,count,false);});
  const bottom=start+5*rowH;
  const sy=bottom+rowH*.52;
  star(c,15+colW,sy,rowH*.2,'#fce0a1');lettering(c,'6本でシュガー',20+colW,sy,Math.min(rowH*.5,11),'#f4deb1',{align:'left',max:colW-13});
 }else{
  const left=w*.37;
  logo(c,8,5,left-10,h*.34);
  lettering(c,stageText(turns,o.demo),left*.5,h*.46,h*.095,'#ffeac2',{max:left-13});
  gauges(c,10,h*.54,left-16,h*.36,count,win);
  line(c,left,h*.1,left,h*.89,'#ab9873',1);
  lettering(c,'ビンゴ本数 × BET倍率',left+(w-left)*.5,h*.2,h*.125,'#ffe3ac',{max:w-left-16});
  const colW=(w-left-16)/4,rowH=h*.20;
  tiers.forEach((n,j)=>payoutEntry(c,left+6+(j%4)*colW,h*.32+Math.floor(j/4)*rowH,colW,rowH,n,count,true));
 }
 c.restore();
}
function draw(c,state,options){
 if(!c||!state)return;
 const o=options,w=o.width,h=o.height;if(w<=0||h<=0)return;
 c.save();c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,w,h);
 if(o.mini){
  c.fillStyle='#163e4b';c.fillRect(0,0,w,h);
  const side=Math.min(w,h);
  if(w>h*1.55){
   board(c,state,o,(w-side)*.22,(h-side)/2,side);
   const cx=side+(w-side)*.5;
   lettering(c,visibleCount(state,o.turn,o.elapsed||0),cx,h*.43,h*.44,'#ffe3a1',{face:'Georgia,serif'});
   lettering(c,'LINE',cx,h*.75,h*.17,'#a7e5d9');
  }else board(c,state,o,(w-side)*.5,(h-side)*.5,side);
 }else{
  const pad=Math.max(2,Math.min(w,h)*.023),gap=pad*.65;
  if(w/h>=1.13){
   const side=Math.min(h-pad*2,(w-gap-pad*2)*.658),pw=Math.min(w-side-gap-2*pad,side*.70);
   const ph=Math.min(h-pad*2,pw*1.99),left=(w-side-pw-gap)/2;
   board(c,state,o,left,(h-side)/2,side);panel(c,state,o,left+side+gap,(h-ph)/2,pw,ph,true);
  }else{
   const side=Math.min(w-pad*2,(h-2*pad)*.735),pw=Math.min(w-pad*2,side*1.27);
   const ph=Math.min(h-side-gap-2*pad,pw*.39),top=(h-side-ph-gap)/2;
   board(c,state,o,(w-side)/2,top,side);panel(c,state,o,(w-pw)/2,top+side+gap,pw,ph,false);
  }
 }
 c.restore();
}
window.JellyView=Object.freeze({draw,duration});
})();

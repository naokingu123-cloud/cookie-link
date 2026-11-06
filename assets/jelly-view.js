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
 green:['#c0ffd2','#60de9e','#21a584','#246c69'],
 // Pigment blends retain a bright translucent body and a deeper pool at the base.
 'blue+red':['#ecc4ff','#b477eb','#8151bc','#503477'],
 'blue+yellow':['#ddff9c','#99da55','#5ba63d','#3d7031'],
 'blue+green':['#b3fff5','#47d8cb','#199d9c','#17666f'],
 'red+yellow':['#ffdf9a','#ff9850','#e26632','#9a4325'],
 'red+green':['#f9c7ad','#ca866c','#a15e54','#713d40'],
 'yellow+green':['#f1ffac','#c4e654','#98b938','#637e2d'],
 'blue+red+yellow':['#f3c7d6','#be809a','#955d79','#693c58'],
 'blue+red+green':['#dbccf6','#9582bc','#6d6098','#4a4272'],
 'blue+yellow+green':['#c7f8ad','#80c97c','#4c9f69','#336b53'],
 'red+yellow+green':['#ffe1a1','#e5ac67','#bb813f','#855829'],
 'blue+red+yellow+green':['#ebd5c4','#b99788','#8c6e68','#60494c']
};
const laneColors=['#ffbc7c','#ffda97','#ffb1ba','#a4ffeb','#a9dfff','#c7b3ff'];
const tiers=[1,2,3,4,5,6,7,8,9,10,12];
const oddsPopupMs=1600;
const oddsText='#93ffab';
const emblem=new Image();emblem.src='assets/sweet-skins/jelly-emblem.webp';
const jellySkin=new Image();jellySkin.src='assets/sweet-skins/jelly.webp';
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
function boardNumber(c,n,x,y,mini,ink){
 const size=mini?65:54,stroke=mini?8:5;
 if(typeof drawElixirNumber==='function')drawElixirNumber(c,n,x,y,size,'#fffae8',ink,stroke);
 else lettering(c,n,x,y,size,'#fffae8',{face:'ElixirNumbers,system-ui,sans-serif',weight:400,outline:ink,width:stroke});
}
function hitStamp(c,x,y,mini){
 // Cross the lower half of the numeral, leaving its top and silhouette visible.
 c.save();c.translate(x+9,y+16);c.rotate(-.18);
 c.font='italic 1000 '+(mini?29:24)+'px '+font;c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';
 c.strokeStyle='#592235';c.lineWidth=mini?9:7;c.strokeText('HIT!',0,0);
 c.strokeStyle='#fff4ce';c.lineWidth=mini?5:4;c.strokeText('HIT!',0,0);
 c.fillStyle='#c63348';c.fillText('HIT!',0,0);c.restore();
}
function star(c,x,y,r,color){
 c.save();c.translate(x,y);c.beginPath();c.moveTo(0,-r);
 for(let k=1;k<=8;k++){const ang=k*Math.PI/4-Math.PI/2,rad=k%2?r*.21:r;c.lineTo(rad*Math.cos(ang),rad*Math.sin(ang));}
 c.fillStyle=color;c.fill();c.restore();
}
// The pressed-glass image is registered to the square well, including its fluted rim.
const mold=new Image();mold.src='assets/jelly-crystal-mold.webp';
const moldRim=42,moldSize=500+2*moldRim;
const wallSplit=190,wallClear=500;
const waveStart=t=>t?.ball<=5?wallClear:130;
const waveStep=92,fillTime=400;
function waveEnd(t){return t.wave.length?waveStart(t)+(t.wave.length-1)*waveStep+fillTime:t.ball<=5?520:470;}
function duration(t){
 if(!t)return 0;
 const count=t.before.lines.length+t.newLines.length;
 const finish=t.newLines.length?(count===12?1750:count>=6?1100:850):170;
 return Math.max(waveEnd(t)+finish,t.oddsReason?waveStart(t)+oddsPopupMs:0);
}
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
  const front=new Path2D();for(const [a,b] of entry.origins){front.moveTo(a+radius,b);front.arc(a,b,radius,0,tau);}
  c.save();c.clip(front);cell(c,i,current,time,mini,paints);
  if(previous&&current!==previous&&turn.ball>5){
   // The incoming syrup tints the leading edge, leaving the blended color in its wake.
   c.globalAlpha=.65*(1-t);c.strokeStyle=syrup[turn.color][1];c.lineWidth=18;c.stroke(front);
  }
  c.restore();c.strokeStyle='#f1fff8b3';c.lineWidth=3*(1-t*.6);c.stroke(front);c.restore();
 }
}
// Sections are connected components, not simply the directly opened edges.
// Once two cells belong to the same section, never paint a divider between them.
const visualGroupCache=new WeakMap();
function sectionIds(state){
 let cached=visualGroupCache.get(state.open);if(cached)return cached;
 const groups=new Int8Array(25);groups.fill(-1);let section=0;
 for(let origin=0;origin<25;origin++){
  if(groups[origin]>=0)continue;
  const queue=[origin];groups[origin]=section;
  for(let k=0;k<queue.length;k++){
   const i=queue[k];
   for(const j of [i%5?i-1:-1,i%5<4?i+1:-1,i>=5?i-5:-1,i<20?i+5:-1]){
    if(j<0||groups[j]>=0||!K.isOpen(state,i,j))continue;
    groups[j]=section;queue.push(j);
   }
  }
  section++;
 }
 visualGroupCache.set(state.open,groups);
 return groups;
}
let floorSprite;
jellySkin.addEventListener('load',()=>{floorSprite=null;});
function cleanMoldFloor(){
 if(floorSprite)return floorSprite;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=500;
 const g=canvas.getContext('2d');
 const fill=gradient(g,0,0,500,500,[[0,'#315a65'],[.42,'#214857'],[1,'#173d50']]);
 rect(g,0,0,500,500,8,fill);
 // The sugar-glass facets run unbroken beneath the openable partitions.
 if(jellySkin.naturalWidth){
  g.save();g.globalAlpha=.34;g.globalCompositeOperation='luminosity';
  g.drawImage(jellySkin,0,0,500,500);g.restore();
 }
 for(let k=0;k<8;k++){
  const y=35+k*68;
  g.beginPath();g.moveTo(-40,y+28);
  g.bezierCurveTo(105,y-29,197,y+61,325,y+6);
  g.bezierCurveTo(398,y-22,476,y-8,540,y-32);
  g.strokeStyle=k%2?'#91e9e30a':'#d3fcf118';g.lineWidth=8+k%3*3;g.stroke();
 }
 const light=g.createRadialGradient(95,38,0,95,38,400);
 light.addColorStop(0,'#b5fff21a');light.addColorStop(1,'#4ef5d000');
 g.fillStyle=light;g.fillRect(0,0,500,500);
 floorSprite=canvas;return canvas;
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
  const connected=sectionIds(state);
  const lip=j=>j<0||j>=25||connected[i]!==connected[j];
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
  const wetPour=entry&&turn.ball>5&&turn.before.colors[i];
  const t=entry&&!wetPour?clamp((elapsed-entry.start-fillTime*.66)/(fillTime*.34)):1;
  if(t>0){c.globalAlpha=t;c.drawImage(current,x,y,100,100,x,y,100,100);}
 }
 c.globalAlpha=1;
}
// A single cast-glass rib is reused on all forty interior edges. Its cut faces
// follow the same three seams in both the crack and the separated fragments.
let ribSprite;
function ribArt(){
 if(ribSprite)return ribSprite;
 const img=document.createElement('canvas');img.width=208;img.height=32;
 const g=img.getContext('2d');g.scale(2,2);g.translate(2,7);
 rect(g,0,-2,100,8,2,'#153f577e');
 const glass=gradient(g,0,-4.5,0,4.5,[[0,'#fcfce4'],[.17,'#b8ffff'],[.32,'#5ab0b9'],[.53,'#d2f1de'],[.68,'#8bbac3'],[1,'#426a81']]);
 rect(g,0,-4.5,100,9,1.6,glass,'#557b89',.9);
 line(g,2,-3.2,98,-3.2,'#fffce3',1.2);
 for(const x of [12,59]){
  g.beginPath();g.moveTo(x,-2.6);g.lineTo(x+16,-2.6);g.lineTo(x+9,2.8);g.lineTo(x-3,2.8);
  g.closePath();g.fillStyle='#f6ffff6e';g.fill();
 }
 ribSprite=img;return img;
}
const seams=[[0,0,0],[23,19,26],[49,54,44],[73,68,76],[100,100,100]];
function breakingRib(c,elapsed,seed,mini){
 if(elapsed<wallSplit){
  c.drawImage(ribArt(),-2,-7,104,16);
  for(let j=1;j<seams.length-1;j++){
   const t=clamp((elapsed-32-38*Math.abs(j-2))/90);if(!t)continue;
   const [a,b,d]=seams[j],q=Math.min(1,t*2),z=Math.max(0,t*2-1);
   c.beginPath();c.moveTo(a,-4.5);c.lineTo(a+(b-a)*q,-4.5+4.5*q);
   if(z)c.lineTo(b+(d-b)*z,z*4.5);
   c.strokeStyle='#255268';c.lineWidth=3.2;c.stroke();
   c.strokeStyle='#fffae5';c.lineWidth=1.4;c.stroke();
  }
  if(!mini&&elapsed>45)star(c,51,0,8*Math.sin(Math.PI*(elapsed-45)/(wallSplit-45)),'#fffbdd');
  return;
 }
 const t=clamp((elapsed-wallSplit)/(wallClear-wallSplit));
 for(let j=0;j<4;j++){
  const [a,b,d]=seams[j],[e,f,g]=seams[j+1],mid=(a+e)/2;
  const sign=(seed+j)%2?1:-1;
  c.save();c.globalAlpha*=1-t*t;
  c.translate(mid+(j-1.5)*7*t,sign*(17+(seed+j)%3*4)*t+10*t*t);
  c.rotate(sign*(.45+.16*j)*t);c.scale(1-.36*t,1-.25*t);c.translate(-mid,0);
  c.beginPath();c.moveTo(a,-5);c.lineTo(e,-5);c.lineTo(f,0);c.lineTo(g,5);
  c.lineTo(d,5);c.lineTo(b,0);c.closePath();c.clip();
  c.drawImage(ribArt(),-2,-7,104,16);line(c,a,-4.4,b,0,'#faffec',1.8);line(c,b,0,d,4.5,'#faffec',1.8);
  c.restore();
 }
 if(!mini){
  const pulse=Math.sin(t*Math.PI);
  for(let j=1;j<=3;j++){
   const side=(seed+j)%2?1:-1;
   star(c,seams[j][1]+(j-2)*15*t,side*(13+19*t),pulse*(4.4+j*.7),'#f4fff0');
  }
 }
}
function partitions(c,state,turn,elapsed,mini){
 const currentGroups=sectionIds(state);
 const priorGroups=turn?.ball<=5?sectionIds(turn.before):null;
 for(let i=0;i<25;i++){
  for(const j of [i%5<4?i+1:-1,i<20?i+5:-1]){
   if(j<0)continue;
   const joined=currentGroups[i]===currentGroups[j];
   // If this ball merges two regions, every newly internal seam cracks away.
   // Previously merged seams stay absent, even while later colors pour in.
   const justJoined=joined&&priorGroups&&priorGroups[i]!==priorGroups[j];
   if(joined&&(!justJoined||elapsed>=wallClear))continue;
   const vertical=j===i+1,x=(i%5+Number(vertical))*100,y=(Math.floor(i/5)+Number(!vertical))*100;
   c.save();
   if(vertical)c.transform(0,1,1,0,x,y);else c.translate(x,y);
   if(justJoined)breakingRib(c,elapsed,i+j,mini);
   else c.drawImage(ribArt(),-2,-7,104,16);
   c.restore();
  }
 }
}
// Extend each bingo axis past both edges of the mould and finish it on the gilt rim.
const railGeometry=K.LINES.map(cells=>{
 const [a,b]=center(cells[0]),[endX,endY]=center(cells[4]);
 const sx=Math.sign(endX-a),sy=Math.sign(endY-b);
 const dx=endX-a+136*sx,dy=endY-b+136*sy;
 return {x:a-68*sx,y:b-68*sy,length:Math.hypot(dx,dy),angle:Math.atan2(dy,dx)};
});
const spectrum=['#ff779b','#ffbc70','#ffeb7c','#8df7ab','#6be7fa','#b99aff'];
// A pair of engraved pointers lines up with each of the twelve win paths.
let guides;
function rimGuides(){
 if(guides)return guides;
 guides=document.createElement('canvas');guides.width=guides.height=moldSize;
 const g=guides.getContext('2d');g.translate(moldRim,moldRim);
 g.lineCap='round';g.lineJoin='round';
 railGeometry.forEach(({x,y,length,angle},id)=>{
  const accent=id<5?'#a3f3ea':id<10?'#ffc6d4':'#ffdf92';
  for(const end of [0,1]){
   g.save();g.translate(x+end*length*Math.cos(angle),y+end*length*Math.sin(angle));
   g.rotate(angle+end*Math.PI);
   // In local coordinates the board starts 18 units past the terminal (more on diagonals).
   line(g,-18,0,8,0,'#203d4b',6);line(g,-18,0,8,0,accent,2.6);
   g.beginPath();g.moveTo(11,0);g.lineTo(-4,-8);g.lineTo(-9,0);g.lineTo(-4,8);g.closePath();
   g.fillStyle=accent;g.fill();g.lineWidth=2.5;g.strokeStyle='#2d4351';g.stroke();
   line(g,-4,-4.8,5,-.6,'#fff7d6',1.8);
   g.restore();
  }
 });
 return guides;
}
// One sugar jewel lights on the outer mould for each visible completed line.
const rimJewels=Array.from({length:12},(_,i)=>{
 const along=99+(i%3)*151;
 return [[along,-12],[512,along],[500-along,512],[-12,500-along]][Math.floor(i/3)];
});
function rimLights(c,count,time){
 if(!count)return;
 c.save();
 for(let i=0;i<count;i++){
  const [x,y]=rimJewels[i],q=.5+.5*Math.cos(time*.0028-i*.6),r=3.4+q*1.6;
  const color=count===12?spectrum[i%6]:count>=6?laneColors[i%6]:'#ffe6a2';
  oval(c,x,y,r+2,r+2,'#765234','#ffcf8b',1.2);
  oval(c,x,y,r,r,color);star(c,x,y,r*.86,'#fffce4');
 }
 if(count===12){
  // A travelling pearl border joins the coloured terminals for the full board.
  c.lineWidth=2.2;c.strokeStyle='#fff5ca';c.setLineDash([11,13]);
  c.lineDashOffset=-time*.032;c.beginPath();c.roundRect(-18,-18,536,536,22);c.stroke();
 }
 c.restore();
}
function allLineShowers(c,age){
 if(age<0||age>1280)return;
 // Four corner fountains throw sugar crystals inward once the last rail lands.
 c.save();
 for(let corner=0;corner<4;corner++){
  c.save();c.translate(corner===1||corner===2?510:-10,corner>=2?510:-10);c.rotate(corner*Math.PI/2);
  for(let i=0;i<8;i++){
   const q=(age-(i%3)*75)/980;
   if(q<0||q>=1)continue;
   const angle=.16+i*.18,distance=(70+(i%3)*24)*Math.sin(q*1.46);
   c.globalAlpha=Math.sin(q*Math.PI)*.94;
   star(c,Math.cos(angle)*distance,Math.sin(angle)*distance,4+(i%3)*1.8,spectrum[(i+corner)%6]);
  }
  c.restore();
 }
 c.restore();
}
function comet(c,length,end,phase,power,mini){
 const trail=length*(.18+power*.06),head=phase*(length+trail),tail=head-trail;
 const from=Math.max(0,tail),to=Math.min(end,head);
 if(to<=from)return;
 const glow=gradient(c,tail,0,head,0,[[0,'#fff7cb00'],[.48,'#ffeb9942'],[.82,'#fff7c8e0'],[1,'#ffffff']]);
 line(c,from,0,to,0,glow,mini?6:7+power*2.5);
 if(head<=end){
  const r=mini?4:5+power*3;
  star(c,head,0,r+3,'#ffedac');oval(c,head,0,r*.51,r*.51,'white');
 }
}
function bingoRails(c,state,turn,elapsed,time,mini){
 if(!state.lines.length)return;
 const count=visibleCount(state,turn,elapsed),power=Math.max(count,1)/12;
 const reveal=turn?waveEnd(turn):0;
 c.save();c.lineCap='round';
 if(!mini)rimLights(c,count,time);
 for(const id of state.lines){
  const newIndex=turn?turn.newLines.indexOf(id):-1;
  const age=newIndex<0?Infinity:elapsed-reveal-Math.min(210,newIndex*36);
  const travel=clamp(age/430);if(!travel)continue;
  const {x,y,length,angle}=railGeometry[id],end=length*travel;
  const color=count===12?spectrum[id%6]:count>=3?laneColors[id%laneColors.length]:'#ffe4a0';
  c.save();c.translate(x,y);c.rotate(angle);
  // Dark edging separates overlapping beams from the bright syrup. The cores stay narrow.
  c.globalAlpha=.3;line(c,0,0,end,0,'#322740',mini?13:10+power*4);
  c.globalAlpha=mini?.3:.19+power*.06;line(c,0,0,end,0,color,16+power*12);
  c.globalAlpha=.96;line(c,0,0,end,0,color,mini?6:5.5+power*1.8);
  line(c,0,0,end,0,'#fffae8',mini?2:1.7);
  if(!mini&&count>=6){
   c.globalAlpha=.76;c.setLineDash([4,13]);c.lineDashOffset=-time*(.018+power*.015)-id*8;
   line(c,0,-5.6,end,-5.6,color,1.8);c.setLineDash([]);c.globalAlpha=1;
  }
  // A luminous head crosses the full rail, followed by a long tapering reflection.
  const phase=(time/(2150-680*power)+id*.173)%1;
  comet(c,length,end,phase,power,mini);
  if(count>=9&&!mini)comet(c,length,end,(phase+.5)%1,power*.7,false);
  if(!mini){
   oval(c,0,0,4.6,4.6,color,'#fff4c8',1.8);
   if(travel<1)star(c,end,0,10+power*5,'#fffde9');
   else{
    oval(c,length,0,4.6,4.6,color,'#fff4c8',1.8);
    const flare=1-clamp((age-430)/260);
    if(flare>0){
     star(c,length,0,5+13*flare,'#fffbd3');
     c.globalAlpha=flare;oval(c,length,0,6+12*(1-flare),6+12*(1-flare),'',color,2);
    }
   }
  }
  c.restore();
 }
 if(!mini&&count===12&&turn?.newLines.length){
  const lastDelay=Math.min(210,(turn.newLines.length-1)*36);
  allLineShowers(c,elapsed-reveal-lastDelay-430);
 }
 c.restore();
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
const reachPaint=['#84f8fa','#ff637d','#d78aff'];
const reachLabels=['リーチ','高額','超高額','オールライン'];
const reachSpectrum=[[0,'#ff7499'],[.21,'#ffce71'],[.44,'#c0ff9a'],[.64,'#66f0ff'],[.83,'#c493ff'],[1,'#ff99cb']];
const reducedReachMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
// Trace the exposed sides clockwise with the section on the right. Each loop
// is drawn a little inside the glass so neighboring sections stay distinct.
const sectionRails=new WeakMap(),reachOddsInk='#73ff98';
function reachLoops(groups,id){
 let cache=sectionRails.get(groups);if(!cache){cache=new Map();sectionRails.set(groups,cache);}
 if(cache.has(id))return cache.get(id);
 const edges=new Set(),step=[1,6,-1,-6],dx=[1,0,-1,0],dy=[0,1,0,-1],loops=[];
 for(let i=0;i<25;i++)if(groups[i]===id){
  const x=i%5,y=Math.floor(i/5),v=y*6+x;
  if(!y||groups[i-5]!==id)edges.add(v*4);
  if(x===4||groups[i+1]!==id)edges.add((v+1)*4+1);
  if(y===4||groups[i+5]!==id)edges.add((v+7)*4+2);
  if(!x||groups[i-1]!==id)edges.add((v+6)*4+3);
 }
 while(edges.size){
  const start=edges.values().next().value,corners=[];let edge=start;
  do{
   edges.delete(edge);
   const dir=edge%4,v=Math.floor(edge/4)+step[dir];
   // A diagonal touch has two exits. Turn right first to keep each boundary intact.
   const next=[(dir+1)%4,dir,(dir+3)%4].find(d=>v*4+d===start||edges.has(v*4+d));
   if(next!==dir){
    const x=(v%6)*100-8*(dy[dir]+dy[next]),y=Math.floor(v/6)*100+8*(dx[dir]+dx[next]);
    corners.push([x-6*dx[dir],y-6*dy[dir]],[x+6*dx[next],y+6*dy[next]]);
   }
   edge=v*4+next;
  }while(edge!==start);
  const path=new Path2D(),segments=[];let lap=0;
  const xs=corners.map(p=>p[0]),ys=corners.map(p=>p[1]);
  path.moveTo(...corners[0]);
  for(let i=0;i<corners.length;i++){
   const [x,y]=corners[i],[ex,ey]=corners[(i+1)%corners.length],len=Math.hypot(ex-x,ey-y);
   segments.push({x,y,dx:(ex-x)/len,dy:(ey-y)/len,end:lap+len,start:lap});lap+=len;
   path.lineTo(ex,ey);
  }
  path.closePath();loops.push({path,lap,segments,bounds:[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)]});
 }
 cache.set(id,loops);return loops;
}
function reachStreak(c,loop,head,length,ink,width){
 c.setLineDash([length,loop.lap-length]);c.lineDashOffset=length-head;
 c.strokeStyle=ink;c.lineWidth=width;c.stroke(loop.path);
}
const reachPeriods=[1.85,1.6,1.45,1.75],reachLamps=new Map();
function reachLamp(ink){
 if(reachLamps.has(ink))return reachLamps.get(ink);
 const lamp=document.createElement('canvas');lamp.width=lamp.height=48;
 const g=lamp.getContext('2d'),halo=g.createRadialGradient(24,24,0,24,24,24);
 halo.addColorStop(0,'#ffffe8');halo.addColorStop(.23,'#fffbeefd');
 halo.addColorStop(.48,ink+'c9');halo.addColorStop(1,ink+'00');
 g.fillStyle=halo;g.fillRect(0,0,48,48);star(g,24,24,17,'#ffffe8');
 reachLamps.set(ink,lamp);return lamp;
}
function reachComet(c,loop,phase,ink,tier,mini){
 const head=phase*loop.lap,tail=42+tier*7;
 c.globalAlpha=.50;reachStreak(c,loop,head,tail,ink,mini?10:9);
 c.globalAlpha=.95;reachStreak(c,loop,head,tail*.58,ink,mini?6:5.5);
 reachStreak(c,loop,head,tail*.26,'#fff7cf',mini?4:3.6);
 const seg=loop.segments.find(s=>head<s.end)||loop.segments[0],run=head-seg.start;
 const x=seg.x+seg.dx*run,y=seg.y+seg.dy*run,diameter=mini?19:21+2*tier;
 c.globalAlpha=1;c.drawImage(reachLamp(ink),x-diameter/2,y-diameter/2,diameter,diameter);
}
function reachFrame(c,loops,id,item,t,mini){
 const {tier,oddsUp}=item,all=tier===3&&!oddsUp;
 const phase=(t/(tier?1:1.4))%1;
 const dip=clamp(1-Math.abs(phase-.66)/.18),pulse=1-.7*dip*dip*(3-2*dip);
 c.save();c.lineCap='round';c.lineJoin='round';
 const heads=mini?1:tier===3?3:tier===2?2:1;
 for(const loop of loops){
  const ink=oddsUp?reachOddsInk:all?gradient(c,...loop.bounds,reachSpectrum):reachPaint[tier];
  c.setLineDash([]);
  c.globalAlpha=.82;c.lineWidth=mini?9:8;c.strokeStyle='#173146';c.stroke(loop.path);
  c.globalAlpha=.35+.65*pulse;c.lineWidth=mini?5:4.3;c.strokeStyle=ink;c.stroke(loop.path);
  const spin=t/reachPeriods[tier]*(336/loop.lap)+id*.13;
  for(let i=0;i<heads;i++){
   const pos=(spin+i/heads)%1,light=all?spectrum[Math.floor(pos*spectrum.length)]:ink;
   reachComet(c,loop,pos,light,tier,mini);
  }
 }
 c.restore();
}
function board(c,state,o,x,y,side){
 const {time=0,elapsed=0,turn,mini}=o,scale=side/moldSize;
 c.save();c.translate(x+moldRim*scale,y+moldRim*scale);c.scale(scale,scale);
 if(mold.complete&&mold.naturalWidth)c.drawImage(mold,-moldRim,-moldRim,moldSize,moldSize);
 else rect(c,0,0,500,500,9,'#244b54','#9ae3da',5);
 c.save();c.beginPath();c.roundRect(0,0,500,500,9);c.clip();
 c.drawImage(cleanMoldFloor(),0,0);
 fillCells(c,state,turn,elapsed,time,mini);if(!mini)glazeCells(c,state,turn,elapsed);partitions(c,state,turn,elapsed,mini);
 c.restore();
 rect(c,-1.4,-1.4,502.8,502.8,10,'','#f4e8b9',3.8);
 // Only syrup and partitions are confined to the cells. Light crosses the lip and the gold bezel.
 c.drawImage(rimGuides(),-moldRim,-moldRim);
 bingoRails(c,state,turn,elapsed,time,mini);
 c.save();c.beginPath();c.roundRect(0,0,500,500,9);c.clip();
 source(c,turn,elapsed,mini);
 const markers=new Map((o.reach||[]).map(item=>[item.number,item])),groups=sectionIds(state),frames=new Map();
 const reachT=reducedReachMotion?0:(o.reachTime??time)/1000;
 for(let i=0;i<25;i++){
  const item=markers.get(state.numbers[i]);if(!item)continue;
  const id=groups[i],prev=frames.get(id);
  // A section can have several candidate numbers. Prefer a line-producing
  // reach for its shared frame and show the exact outcome beside each number.
  if(!prev||(prev.oddsUp&&!item.oddsUp)||(!!prev.oddsUp===!!item.oddsUp&&item.tier>prev.tier))frames.set(id,item);
 }
 for(const [id,item] of frames)reachFrame(c,reachLoops(groups,id),id,item,reachT,mini);
 for(let i=0;i<25;i++){
  const [x,y]=center(i),n=state.numbers[i],item=markers.get(n);
  if(item&&!mini){
   const label=item.oddsUp?'オッズアップ':item.tier&&(reducedReachMotion||Math.floor(reachT/2)%2)?reachLabels[item.tier]:reachLabels[0];
   const ink=item.oddsUp?reachOddsInk:item.tier===3?gradient(c,x-42,y,x+42,y,reachSpectrum):reachPaint[item.tier];
   lettering(c,label,x,y+26,24,ink,{weight:950,face:'SweetReachRounded,'+font,max:83,outline:'#14263d',width:5.2});
  }
  const digitY=item&&!mini?y-8:y;
  boardNumber(c,n,x,digitY,mini,state.colors[i]?'#203349':'#193643');
  if(state.draws.includes(n))hitStamp(c,x,digitY,mini);
 }
 c.restore();c.restore();
}
function visibleCount(state,turn,elapsed){
 return !turn?state.lines.length:state.lines.length-turn.newLines.length+
   turn.newLines.filter((_,j)=>elapsed>=waveEnd(turn)+Math.min(210,j*36)+215).length;
}
function ticket(c,w,h){
 const shell=gradient(c,0,0,w,h,[[0,'#fff2c9'],[.18,'#e1a875'],[.48,'#fff4ce'],[.82,'#b77664'],[1,'#f9d397']]);
 rect(c,0,2,w,h-2,14,'#341b37ab');
 rect(c,0,0,w,h-3,14,shell,'#693e50',1.3);
 const glaze=gradient(c,0,0,w,h,[[0,'#b5547f'],[.16,'#78385c'],[.43,'#502645'],[.77,'#452540'],[1,'#763452']]);
 rect(c,3,3,w-6,h-9,11,glaze,'#ffd6c9',1);
 if(jellySkin.naturalWidth){
  c.save();c.beginPath();c.roundRect(3,3,w-6,h-9,11);c.clip();
  c.globalAlpha=.60;c.drawImage(jellySkin,3,3,w-6,h-9);
  c.fillStyle='#3b1748';c.globalAlpha=.26;c.fillRect(3,3,w-6,h-9);c.restore();
 }
 rect(c,6,6,w-12,h-15,9,'','#efafba77',1);
 // Reflections follow the fluted rim, leaving the printed odds unobstructed.
 const shine=gradient(c,0,5,0,Math.max(18,h*.16),[[0,'#ffdde6c7'],[.26,'#ffafc375'],[1,'#ffbbd000']]);
 c.fillStyle=shine;c.beginPath();c.moveTo(8,17);c.quadraticCurveTo(8,6,22,6);
 c.lineTo(w-15,6);c.bezierCurveTo(w-3,18,w*.55,22,w*.38,30);
 c.quadraticCurveTo(15,46,8,31);c.closePath();c.fill();
 for(const rx of [6.5,w-6.5]){
  line(c,rx,21,rx,h-18,'#ef8db49c',3.1);
  line(c,rx-.5,22,rx-.5,h*.49,'#ffdddba8',1.1);
 }
 for(const [rx,ry,r] of [[15,13,3.3],[20,17,1.5],[13,24,1.9],[w-16,13,2.9],[w-20,19,1.55],[w-13,24,2]]){
  oval(c,rx,ry,r,r*.83,'#822d5f66','#ffd4db8a',.7);
  oval(c,rx-r*.21,ry-r*.37,r*.49,r*.21,'#fff5dfd9');
 }
}
function logo(c,x,y,w,h){
 if(emblem.complete&&emblem.naturalWidth){
  const scale=Math.min(w/emblem.naturalWidth,h/emblem.naturalHeight);
  const dw=emblem.naturalWidth*scale,dh=emblem.naturalHeight*scale;
  c.drawImage(emblem,x+(w-dw)/2,y+(h-dh)/2,dw,dh);
 }else lettering(c,'Jelly Bingo',x+w/2,y+h/2,Math.min(w*.16,h*.7),'#ffe39a',{face:'Georgia,serif',weight:'italic 900'});
}
function phaseGuide(c,x,y,w,h,draws,o){
 const finished=draws===8&&!o.turn,ball=Math.min(8,draws+(o.turn?0:1)),first=ball<=5;
 const colors=[syrup.red[0],syrup.yellow[0],syrup.green[0]];
 const accent=finished?'#ffe296':first?'#90ecff':colors[ball-6];
 const phase=finished?'結果':first?'前半':'後半';
 const progress=finished?'全8球終了':(o.turn?'第':'次は第')+ball+'球';
 const action=finished?'ライン判定完了':first?'仕切りを割る':['赤','黄','緑'][ball-6]+'ゼリーを注ぐ';
 const detail=finished?'成立したラインが点灯':first?'青ゼリーが広がる':'つながった区画を満たす';
 rect(c,x,y,w,h,8,first?'#184b5a':'#5b2c4a',accent,1.5);
 const tagH=Math.min(h*.28,21),tagW=w*.34;
 rect(c,x+5,y+4,tagW,tagH,5,accent);
 lettering(c,phase,x+5+tagW/2,y+4+tagH*.53,tagH*.84,'#263346',{weight:950});
 lettering(c,(o.demo?'デモ・':'')+progress,x+w-6,y+4+tagH*.53,tagH*.66,'#fff0e2',{align:'right',max:w-tagW-17});
 lettering(c,action,x+w/2,y+h*.47,h*.245,'#fff5d9',{weight:950,max:w-12});
 lettering(c,detail,x+w/2,y+h*.70,h*.172,'#e1eff0',{max:w-12});
 const dx=(w-21)/8,cy=y+h*.89;
 for(let i=1;i<=8;i++){
  const cx=x+8+dx*(i-.5)+(i>5?5:0),color=i<=5?syrup.blue[0]:colors[i-6];
  oval(c,cx,cy,dx*.30,Math.min(dx*.30,h*.056),i<=draws?color:'#213443',color,.9);
  if(i===ball&&!finished)oval(c,cx,cy,dx*.45,h*.085,'','#fff1b3',1.2);
 }
}
function sugarMarker(c,x,y,size,sprite){
 if(sprite){c.drawImage(sprite,x-size/2,y-size/2,size,size);return;}
 c.save();c.translate(x,y);c.rotate(Math.PI/4);
 rect(c,-size*.33,-size*.33,size*.66,size*.66,1.2,'#f3c9ee','#fff2db',1.1);
 line(c,-size*.19,-size*.19,size*.16,-size*.19,'#fff9fd',1.3);c.restore();
}
function oddsLabel(n){return '×'+n.toFixed(1);}
function mixSwatches(c,x,y,r,before,after){
 for(const [cx,recipe] of [[x-r*2,before],[x+r*2,after]]){
  const colors=syrup[recipe];
  const gel=gradient(c,cx-r,y-r,cx+r,y+r,[[0,colors[0]],[.42,colors[1]],[1,colors[3]]]);
  oval(c,cx,y,r,r,gel,'#fff1ce',r*.18);oval(c,cx-r*.22,y-r*.38,r*.45,r*.19,'#ffffffcc');
 }
 lettering(c,'→',x,y,r*1.9,'#fff2c9');
}
function oddsPopup(c,state,turn,age,x,y,w,h){
 const wide=w>h*2.6;
 c.save();c.translate(x,y);
 if(!reducedReachMotion){
  const enter=clamp(age/130),leave=clamp((oddsPopupMs-age)/160);
  c.translate(0,(1-enter)*h*.13);c.globalAlpha=.25+.75*Math.min(enter,leave);
 }
 const glaze=gradient(c,0,0,w*.25,h,[[0,'#235747'],[.34,'#15573c'],[1,'#123a36']]);
 rect(c,1,1,w-2,h-2,Math.min(h*.22,10),glaze,'#95f5ab',2);
 rect(c,4,4,w-8,h-8,Math.min(h*.18,8),'','#47b885',.9);
 const before=turn.before.colors[turn.index],after=state.colors[turn.index];
 const change=oddsLabel(turn.before.oddsMultiplier)+' → '+oddsLabel(state.oddsMultiplier);
 if(wide){
  lettering(c,'オッズアップ',w*.28,h*.32,h*.31,oddsText,{max:w*.50,weight:950});
  lettering(c,'＋0.5倍',w*.77,h*.32,h*.30,'#ffe58f',{max:w*.38,weight:950});
  mixSwatches(c,w*.28,h*.70,Math.min(h*.15,w*.038),before,after);
  lettering(c,change,w*.70,h*.69,h*.37,'#fff5b0',{max:w*.51,face:'Georgia,serif',weight:950});
 }else{
  lettering(c,(turn.ball<=5?'前半':'後半')+'・第'+turn.ball+'球',w*.26,h*.18,h*.13,'#fff1dc',{max:w*.40});
  lettering(c,'オッズアップ',w*.71,h*.18,h*.18,oddsText,{max:w*.52,weight:950});
  lettering(c,'色変化！',w*.28,h*.42,h*.18,'#fff3df',{max:w*.40});
  mixSwatches(c,w*.70,h*.42,Math.min(h*.095,w*.053),before,after);
  lettering(c,'＋0.5倍',w*.5,h*.64,h*.23,'#ffde78',{max:w*.80,weight:950});
  lettering(c,change,w*.5,h*.85,h*.20,'#fff6c5',{max:w*.82,weight:950,face:'Georgia,serif'});
 }
 c.restore();
}
function panel(c,state,o,x,y,w,h,popupAge,shownOdds){
 c.save();c.translate(x,y);
 const unit=w/160;c.scale(unit,unit);w/=unit;h/=unit;
 const turns=state.draws.length,count=visibleCount(state,o.turn,o.elapsed||0),bet=Math.max(0,o.bet||0);
 const target=o.sugarLines??state.sugarLines,got=o.sugarCollected??(!o.demo&&bet>0&&count>=target);
 ticket(c,w,h);
 drawSweetFrame(c,'jelly',0,0,w,h,10);
 const head=Math.min(39,h*.095);
 logo(c,11,5,w-22,head);
 let y0=6+head;
 const phaseH=Math.min(75,h*.195);
 phaseGuide(c,11,y0,w-22,phaseH,turns,o);y0+=phaseH+2;
 if(popupAge!==null)oddsPopup(c,state,o.turn,popupAge,8,4,w-16,y0-5);
 const oddsH=Math.min(39,h*.104);
 rect(c,11,y0+1,w-22,oddsH-3,5,'#62334c','#edc37b',1.2);
 lettering(c,'配当オッズ',16,y0+oddsH*.34,oddsH*.33,'#fff4d2',{align:'left',max:72});
 lettering(c,oddsLabel(shownOdds),w-17,y0+oddsH*.32,oddsH*.49,'#ffde83',{align:'right',max:58,face:'Georgia,serif',weight:950});
 lettering(c,'色変化1回で＋0.5倍',w/2,y0+oddsH*.75,oddsH*.27,'#ffe4be',{max:w-30});
 y0+=oddsH;
 const headH=Math.min(17,h*.048),footH=Math.min(20,h*.052);
 const right=w-15;
 lettering(c,'本数',17,y0+headH*.51,headH*.77,'#ffdde3',{align:'left'});
 lettering(c,'WIN',right,y0+headH*.51,headH*.83,'#ffe78a',{align:'right'});
 y0+=headH;
 const rowH=(h-10-y0-footH)/(tiers.length+.70),topExtra=rowH*.70;
 for(let j=tiers.length-1;j>=0;j--){
  const n=tiers[j],active=n===count,top=n===12,sugar=n===target,ht=top?rowH+topExtra:rowH;
  rect(c,11,y0+.55,w-22,ht-1.1,3,active?(top?'#934d38':'#a04f70'):top?'#773650':j%2?'#602f4b':'#522842',active?'#ffe795':sugar?'#f9bedf':top?'#d3a57d':'',active?1.5:.75);
  const size=Math.min(rowH*.82,17),cy=y0+ht-rowH*.47;
  if(top){
   lettering(c,'オールライン',17,y0+topExtra*.63,Math.min(topExtra*.95,14),'#ffe498',{align:'left',max:95});
   star(c,right-3,y0+topExtra*.65,3.3,'#ffe8a8');
  }
  if(sugar)sugarMarker(c,20,cy,Math.min(16,rowH*.97),o.sugarIcon);
  lettering(c,n+'本',sugar?29:16,cy,size,active||top?'#ffe3a1':'#fff3e7',{align:'left',max:38});
  const win=Math.floor(bet*K.payout(n,shownOdds)/100);
  lettering(c,win.toLocaleString('en-US'),right,cy,size,'#ffe38e',{align:'right',max:right-67,face:'ArcadePayout,Georgia,serif'});
  y0+=ht;
 }
 if(target!=null){
  sugarMarker(c,23,y0+footH*.51,Math.min(19,footH*.96),o.sugarIcon);
  lettering(c,target+(got?'本 シュガーGET!':'本でシュガー'),35,y0+footH*.54,footH*.73,got?'#ffde72':'#ffe8c5',{align:'left',max:w-48});
 }
 c.restore();
}
function draw(c,state,options){
 if(!c||!state)return;
 const o=options,w=o.width,h=o.height;if(w<=0||h<=0)return;
 const colorChange=o.turn?.oddsReason;
 const popupAge=colorChange?(o.oddsPopupTime??((o.elapsed||0)-waveStart(o.turn))):-1;
 const popup=popupAge>=0&&popupAge<oddsPopupMs;
 const shownOdds=colorChange&&popupAge<0?o.turn.before.oddsMultiplier:state.oddsMultiplier;
 c.save();c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,w,h);
 if(o.mini){
  const side=Math.min(w,h);
  board(c,state,o,(w-side)/2,(h-side)/2,side);
 }else{
  const pad=Math.max(2,Math.min(w,h)*.018),gap=Math.max(4,Math.min(w,h)*.023);
  const side=Math.min(h-pad*2,(w-gap-pad*2)*.669),pw=Math.min(w-side-gap-2*pad,side*.66);
  const ph=Math.min(h-pad*2,pw*2.82),left=(w-side-pw-gap)/2;
  const boardX=left+pw+gap,top=(h-side)/2;
  const upperRibbon=top>=side*.16;
  panel(c,state,o,left,(h-ph)/2,pw,ph,popup&&!upperRibbon?popupAge:null,shownOdds);
  board(c,state,o,boardX,top,side);
  if(popup&&upperRibbon){
   const bh=Math.min(top*.92,side*.25),bw=side*.96;
   oddsPopup(c,state,o.turn,popupAge,boardX+(side-bw)/2,top-bh-1,bw,bh);
  }
 }
 c.restore();
}
window.JellyView=Object.freeze({draw,duration,oddsPopupMs,oddsRevealAt:waveStart,lineRevealAt:waveEnd,partitionBreakAt:wallSplit});
})();

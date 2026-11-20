/* Illustrated board furniture. Geometry, numbers, state and payouts stay with each game. */
(()=>{
'use strict';
const art=()=>window.SweetsCartoonArt;
const available=()=>!!art()?.loaded;
const cache=new Map();
const canvas=(w,h=w)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
const path=(ctx,points)=>{ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();};
const rounded=(ctx,x,y,w,h,r,fill,edge,lw=1)=>{
 ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}
 if(edge){ctx.strokeStyle=edge;ctx.lineWidth=lw;ctx.stroke();}
};
function texture(name,ink){
 const key='texture/'+name+'/'+ink;if(cache.has(key))return cache.get(key);
 const source=art()?.sprite(name);if(!source)return null;
 const c=canvas(256),x=c.getContext('2d');
 x.fillStyle=ink;x.fillRect(0,0,256,256);
 // Use the painted centre, excluding the individual sweet's rim. Connected
 // jelly sections must remain one continuous surface when a partition opens.
 x.globalAlpha=.60;
 x.drawImage(source,source.width*.21,source.height*.21,source.width*.58,source.height*.58,0,0,256,256);
 x.globalAlpha=1;x.globalCompositeOperation='color';x.fillStyle=ink;x.fillRect(0,0,256,256);
 x.globalCompositeOperation='source-over';cache.set(key,c);return c;
}
function frame(ctx,game,x,y,w,h,thickness){
 return available()&&art().frame(ctx,game,x,y,w,h,thickness);
}
function ribbon(ctx,game,a,b,width){
 const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);
 ctx.save();ctx.translate(a.x,a.y);ctx.rotate(Math.atan2(dy,dx));
 frame(ctx,game,-width*.3,-width/2,len+width*.6,width,width*.28);ctx.restore();
}
function triangleSprite(ctx,source,points){
 const [top,left,right]=points,w=source.width,h=source.height;
 const a=(right.x-left.x)/w,b=(right.y-left.y)/w;
 const c=((left.x+right.x)/2-top.x)/h,d=((left.y+right.y)/2-top.y)/h;
 ctx.save();ctx.transform(a,b,c,d,top.x-a*w/2,top.y-b*w/2);ctx.drawImage(source,0,0);ctx.restore();
}
function gelatoCache(images,faces,coords,size){
 if(!available()||!art().sprite('gelato-blue'))return false;
 const ratio=size/500,outline=[0,4,5,10,17,16,18,14,13,8,1,2].map(i=>coords[i]);
 const base=canvas(size),b=base.getContext('2d');b.scale(ratio,ratio);
 path(b,outline);b.fillStyle='#c1ecff';b.fill();
 b.lineJoin='round';b.strokeStyle='#4c276a';b.lineWidth=22;b.stroke();
 b.strokeStyle='#fff3b3';b.lineWidth=16;b.stroke();
 for(let i=0;i<outline.length;i++)ribbon(b,'gelato',outline[i],outline[(i+1)%outline.length],18);
 images.base=base;
 const trim=canvas(size),tr=trim.getContext('2d');tr.scale(ratio,ratio);
 const edges=new Map();
 for(const f of faces)for(let j=0;j<3;j++){
  const a=f.nodes[j],b=f.nodes[(j+1)%3],key=[Math.min(a,b),Math.max(a,b)].join(':');
  edges.set(key,[coords[a],coords[b]]);
 }
 tr.lineCap='round';tr.lineJoin='round';
 for(const [a,b] of edges.values()){
  tr.beginPath();tr.moveTo(a.x,a.y);tr.lineTo(b.x,b.y);
  tr.strokeStyle='#42235f';tr.lineWidth=8;tr.stroke();
  tr.strokeStyle='#acddf4';tr.lineWidth=3;tr.stroke();
 }
 images.trimCache=trim;
 const names=['gelato-blue','gelato-green','gelato-yellow','gelato-red','gelato-purple'];
 const inks=['#55dafa','#66db79','#ffe164','#ff7394','#b78bf3'];
 images.faceTiles=faces.map(f=>{
  const points=f.nodes.map(i=>({x:coords[i].x*ratio,y:coords[i].y*ratio}));
  const left=Math.max(0,Math.floor(Math.min(...points.map(p=>p.x)))-2);
  const top=Math.max(0,Math.floor(Math.min(...points.map(p=>p.y)))-2);
  const width=Math.min(size,Math.ceil(Math.max(...points.map(p=>p.x)))+2)-left;
  const height=Math.min(size,Math.ceil(Math.max(...points.map(p=>p.y)))+2)-top;
  const bright=[],dim=[];
  for(let g=0;g<5;g++){
   const tile=canvas(width,height),c=tile.getContext('2d');
   path(c,points.map(p=>({x:p.x-left,y:p.y-top})));c.clip();
   c.fillStyle=inks[g];c.fillRect(0,0,width,height);
   const source=art().sprite(names[g]);
   if(source)triangleSprite(c,source,points.map(p=>({x:p.x-left,y:p.y-top})));
   // A simple ink-and-cream edge replaces the crystal refraction texture.
   path(c,points.map(p=>({x:p.x-left,y:p.y-top})));
   c.lineJoin='round';c.strokeStyle='#49305c';c.lineWidth=5*ratio;c.stroke();
   c.strokeStyle='#fff8d3';c.lineWidth=1.8*ratio;c.stroke();
   const dark=canvas(width,height),d=dark.getContext('2d');d.drawImage(tile,0,0);
   d.globalCompositeOperation='source-atop';d.fillStyle='#25345980';d.fillRect(0,0,width,height);
   bright.push(tile);dim.push(dark);
  }
  return {images:bright,dimImages:dim,x:left,y:top,width,height};
 });
 return true;
}
function gelatoSocket(ctx,hit,x,y,size){
 if(!available()||!art().sprite('gelato-socket'))return false;
 const key='socket/'+hit;let sprite=cache.get(key);
 if(!sprite){
  sprite=canvas(128);const c=sprite.getContext('2d');art().draw(c,'gelato-socket',0,0,128,128);
  if(hit){c.globalCompositeOperation='source-atop';c.globalAlpha=.30;c.fillStyle='#ffe276';c.fillRect(0,0,128,128);}
  cache.set(key,sprite);
 }
 ctx.drawImage(sprite,x-size/2,y-size/2,size,size);return true;
}
function cupPath(c,x,y){
 c.beginPath();c.moveTo(x-54,y+8);c.bezierCurveTo(x-51,y+36,x-31,y+70,x,y+80);
 c.bezierCurveTo(x+31,y+70,x+51,y+36,x+54,y+8);c.closePath();
}
function wineryGlass(c,x,y,full){
 if(!available())return false;
 const name=full?'wine-glass-lit':'wine-glass',sprite=art().sprite(name)||art().sprite('wine-glass');
 if(!sprite)return false;
 c.save();
 // Keep the live liquid window open, regardless of the colour painted into
 // the generated glass. Its exact original bowl still owns the fill level.
 c.beginPath();c.rect(x-78,y-16,156,154);
 c.moveTo(x-49,y+14);c.bezierCurveTo(x-46,y+38,x-28,y+66,x,y+75);
 c.bezierCurveTo(x+28,y+66,x+46,y+38,x+49,y+14);c.closePath();c.clip('evenodd');
 c.drawImage(sprite,x-73,y-12,146,143);c.restore();
 cupPath(c,x,y);c.strokeStyle='#49326b';c.lineWidth=4.2;c.lineJoin='round';c.stroke();
 c.beginPath();c.ellipse(x,y+8,54,6,0,0,Math.PI*2);c.strokeStyle=full?'#ffe47f':'#ffefb1';c.lineWidth=4.2;c.stroke();
 return true;
}
function wineryPlaque(c,x,y,full){
 if(!available()||!art().sprite('wine-plaque'))return false;
 c.save();art().draw(c,'wine-plaque',x-44,y-23,88,46);
 if(full){rounded(c,x-33,y-13,59,28,10,'#238b58',null);}
 c.restore();return true;
}
function wineryJuice(c,x,y,g,time,activePour,flavors){
 if(!available())return false;
 c.save();cupPath(c,x,y);c.clip();c.fillStyle='#cde6ed';c.fillRect(x-60,y+7,120,76);
 const names=['jelly-pink','gelato-yellow','jelly-green','jelly-blue','jelly-purple','popcorn-cream'];
 let filled=0;
 for(let k=0;k<(g?.layers?.length||0);k++){
  const layer=g.layers[k],amount=Math.max(0,Math.min(1,layer.amount));if(amount<1e-6)continue;
  const f=flavors[layer.flavor]||flavors[5],bottom=y+80-Math.min(1,filled)*70;
  filled+=amount;const top=y+80-Math.min(1,filled)*70;
  const amp=activePour?3.6:1.5;
  const wave=dx=>amp*Math.sin(time*(activePour?.0061:.0024)+k*.37+dx*.112);
  c.save();c.beginPath();c.moveTo(x-60,bottom+3);c.lineTo(x-60,top);
  for(let dx=-60;dx<=60;dx+=3)c.lineTo(x+dx,top+wave(dx));
  c.lineTo(x+60,bottom+3);c.closePath();c.clip();
  c.fillStyle=f.color;c.fillRect(x-60,top-6,120,bottom-top+12);
  const tile=texture(names[layer.flavor]||names[5],f.color);
  if(tile){c.globalAlpha=.68;c.drawImage(tile,x-60,y+8,120,75);c.globalAlpha=1;}
  c.restore();
  c.beginPath();for(let dx=-54;dx<=54;dx+=3){const yy=top+wave(dx);dx===-54?c.moveTo(x+dx,yy):c.lineTo(x+dx,yy);}
  c.strokeStyle=f.light;c.lineWidth=3.2;c.stroke();
 }
 c.restore();return true;
}
function wineryStand(c,cells,position){
 if(!available())return false;
 for(let row=0;row<6;row++){
  const ids=cells.filter(p=>p.r===row).map(p=>p.id);if(!ids.length)continue;
  const first=position(ids[0]),last=position(ids[ids.length-1]);
  frame(c,'winery',first.x-71,first.y+121,last.x-first.x+142,18,6);
 }
 return true;
}
function popcornAtlas(mini){
 if(!available())return null;const tile=mini?18:54,key='popcorn/'+tile;
 if(cache.has(key))return cache.get(key);
 const names=['popcorn-cream','popcorn-gold','popcorn-pink','popcorn-lavender','popcorn-aqua','popcorn-lime'];
 if(names.some(name=>!art().sprite(name)))return null;
 const sheet=canvas(tile*6,tile),c=sheet.getContext('2d');
 for(let i=0;i<6;i++){
  c.save();c.translate(i*tile,0);art().draw(c,names[i],0,0,tile,tile);
  if(i===5){
   // Rainbow remains a distinct top bomb, with the generated kernel's ink
   // and painted highlight retained beneath its six-colour candy glaze.
   c.globalCompositeOperation='source-atop';c.globalAlpha=.63;
   const colors=['#ff718e','#ffcf59','#a5e966','#63def1','#879cff','#d58df5'];
   colors.forEach((color,n)=>{c.fillStyle=color;c.fillRect(n*tile/6,0,tile/6+.5,tile);});
  }
  c.restore();
 }
 cache.set(key,sheet);return sheet;
}
function popcornBoard(c,rules){
 if(!available())return false;
 c.save();path(c,rules.outline.map(p=>({x:p.x*1.04,y:p.y*1.04})));
 c.fillStyle='#8b4d9a';c.fill();c.strokeStyle='#4e245b';c.lineWidth=.16;c.lineJoin='round';c.stroke();
 for(let i=0;i<rules.outline.length;i++){
  ribbon(c,'popcorn',rules.outline[i],rules.outline[(i+1)%rules.outline.length],.22);
 }
 for(const p of rules.cells){
  rounded(c,p.x-.445,p.y-.305,.89,.65,.19,'#fff0b2','#6f385a',.035);
  frame(c,'popcorn',p.x-.45,p.y-.31,.90,.66,.09);
 }
 c.restore();return true;
}
function popcornPlaque(c,half,high,special,sign,lit){
 if(!available())return false;
 const w=sign?1.58:half*2,h=sign?1.23:high*2,x=-w/2,y=sign?-.64:-h/2;
 rounded(c,x,y,w,h,special?.19:.13,lit?'#ffd77b':'#7b306f','#49264f',.05);
 frame(c,'popcorn',x,y,w,h,special?.15:.09);return true;
}
function popcornBackground(c,w,h){
 if(!available())return false;
 c.fillStyle='#95e5d5';c.fillRect(0,0,w,h);
 c.fillStyle='#d2f4c3';c.beginPath();c.ellipse(w*.74,h*.91,w*.77,h*.57,0,0,Math.PI*2);c.fill();
 c.fillStyle='#fff2c7';c.beginPath();c.ellipse(w*.26,h*1.12,w*.88,h*.54,0,0,Math.PI*2);c.fill();
 c.save();c.globalAlpha=.23;
 for(let n=0;n<7;n++){
  const size=28+n%3*9;
  art().draw(c,['popcorn-pink','popcorn-gold','popcorn-aqua'][n%3],(n*127+11)%Math.max(1,w-size),(n*91+17)%Math.max(1,h-size),size,size);
 }
 c.restore();return true;
}
function popcornStand(c,stage,front,w,h){
 if(!available()||!stage)return false;
 const x=-w/2,y=stage.y;
 if(front){
  const yy=y+h*.687,sh=h*.255;
  c.save();c.beginPath();c.rect(x+w*.140,yy,w*.720,sh*1.02);c.clip();
  rounded(c,x+w*.140,yy-sh*stage.open,w*.720,sh,.07,'#f5b55d','#683658',.055);
  frame(c,'popcorn',x+w*.140,yy-sh*stage.open,w*.720,sh,.09);c.restore();
 }else{
  rounded(c,x,y,w,h,.20,'#d35088','#512c60',.09);
  rounded(c,x+w*.13,y+h*.35,w*.74,h*.59,.10,'#583971','#ffe7a2',.05);
  frame(c,'popcorn',x,y,w,h,.18);
  for(const side of [-1,1])art().draw(c,'popcorn-cream',side*w*.39-.23,y+.07,.46,.44);
 }
 return true;
}
function jellyCell(c,i,color,mini,palette){
 if(!available())return false;
 const names={blue:'jelly-blue',red:'jelly-pink',yellow:'jelly-orange',green:'jelly-green',
  'blue+red':'jelly-purple','blue+yellow':'jelly-green','red+yellow':'jelly-orange'};
 const ink=palette[1],tile=texture(names[color]||'jelly-purple',ink);
 const x=i%5*100,y=Math.floor(i/5)*100;
 c.fillStyle=ink;c.fillRect(x-.12,y-.12,100.24,100.24);
 if(tile){
  c.save();c.beginPath();c.rect(x-.12,y-.12,100.24,100.24);c.clip();
  // Every compartment samples the same artwork coordinates, so an open
  // seam never grows a spurious border or separate rounded tile.
  c.drawImage(tile,0,0,500,500);c.restore();
 }
 return true;
}
function jellyFloor(){
 if(!available())return null;const key='jelly-floor';if(cache.has(key))return cache.get(key);
 const c=canvas(500),x=c.getContext('2d');x.fillStyle='#396b95';x.fillRect(0,0,500,500);
 const source=art().sprite('jelly-mold');
 if(source){x.globalAlpha=.48;x.drawImage(source,source.width*.23,source.height*.23,source.width*.54,source.height*.54,0,0,500,500);}
 cache.set(key,c);return c;
}
function jellyRim(c){
 if(!available())return false;
 return frame(c,'jelly',-42,-42,584,584,42);
}
function jellyRib(){
 if(!available())return null;const key='jelly-rib';if(cache.has(key))return cache.get(key);
 const c=canvas(208,32),x=c.getContext('2d');
 rounded(x,0,3,208,26,8,'#93e7da','#3d3a72',3);
 frame(x,'jelly',0,1,208,30,9);cache.set(key,c);return c;
}
function panelFrame(c,game,x,y,w,h,t){
 if(!available())return false;
 rounded(c,x,y,w,h,Math.min(14,w*.1),game==='jelly'?'#366b78':'#773775','#482252',2);
 frame(c,game,x,y,w,h,t);return true;
}
function installDOMArt(){
 if(!available())return;
 const html=document.documentElement;html.classList.add('cartoon-boards-b-v272');
 const plaque=art().url('wine-plaque');
 if(plaque)html.style.setProperty('--v272-b-wine-plaque','url("'+plaque+'")');
}
window.SweetsCartoonBoardsB=Object.freeze({
 get active(){return available();},gelatoCache,gelatoSocket,wineryGlass,wineryPlaque,wineryJuice,wineryStand,
 popcornAtlas,popcornBoard,popcornPlaque,popcornBackground,popcornStand,jellyCell,jellyFloor,jellyRim,jellyRib,panelFrame
});
if(available())installDOMArt();else art()?.ready?.then(installDOMArt);
})();

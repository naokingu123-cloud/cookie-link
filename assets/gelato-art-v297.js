/* Gelato Prism v297: generated ice, gelato and cabinet artwork.
 * The native renderer owns every vertex, grade, number, prize and clock.
 * All clipping and texture preparation happen once, outside live painting.
 */
(()=>{
'use strict';
if(window.GelatoArtV297)return;
const VERSION=297,GRADES=Object.freeze(['cyan','green','yellow','red','violet']);
const COLORS=Object.freeze(['#36d6fc','#34d77b','#ffd63c','#f64a6d','#ac66f2']);
const FILES=Object.freeze({materials:'assets/gelato-art-v297/materials.webp',furniture:'assets/gelato-art-v297/furniture.webp',paytable:'assets/gelato-art-v297/paytable.webp'});
const FURNITURE=Object.freeze(['socket-idle','socket-hit','rail-idle','rail-linked','rail-inner','jug']);
const PAYTABLE=Object.freeze(['cabinet','collector','row','highest']);
const params=new URLSearchParams(location.search),chosen=window.SweetsLineup?.chosen;
const enabled=!params.has('serverSettlementWorker')&&!params.has('downloadWorker')&&(!chosen||chosen.includes('gelato'));
const sheets={},materials=[],furniture=new Map(),paytable=new Map(),faceCache=new Map(),railCache=new Map(),urlCache=new Map(),origins=new WeakMap();
const sourceRects={materials:[],furniture:[],paytable:[]},status={materials:false,furniture:false,paytable:false},failures=[];
const stats={faceBuilds:0,faceHits:0,railBuilds:0,sockets:0,rails:0,pours:0};
let epoch=0;
function canvas(width,height=width){
 const out=document.createElement('canvas');out.width=Math.max(1,Math.round(width));out.height=Math.max(1,Math.round(height));
 out.complete=true;out.naturalWidth=out.width;out.naturalHeight=out.height;return out;
}
function remember(bitmap,kinds){
 origins.set(bitmap,Object.freeze([...new Set(kinds)]));
 if(bitmap.dataset){bitmap.dataset.artVersion=String(VERSION);bitmap.dataset.artGame='gelato';}
 return bitmap;
}
function cellRect(image,index,columns,rows){
 const left=Math.round(index%columns*image.naturalWidth/columns),top=Math.round(Math.floor(index/columns)*image.naturalHeight/rows);
 return [left,top,Math.round((index%columns+1)*image.naturalWidth/columns)-left,Math.round((Math.floor(index/columns)+1)*image.naturalHeight/rows)-top];
}
function alphaRect(image,cell){
 const [left,top,width,height]=cell,out=canvas(width,height),ctx=out.getContext('2d',{willReadFrequently:true});
 ctx.drawImage(image,left,top,width,height,0,0,width,height);
 const pixels=ctx.getImageData(0,0,width,height).data;let x0=width,y0=height,x1=-1,y1=-1;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(pixels[(y*width+x)*4+3]>12){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
 if(x1<0)throw Error('Empty atlas cell');
 const gutter=Math.max(2,Math.round(Math.min(width,height)*.006));
 x0=Math.max(0,x0-gutter);y0=Math.max(0,y0-gutter);x1=Math.min(width-1,x1+gutter);y1=Math.min(height-1,y1+gutter);
 return [left+x0,top+y0,x1-x0+1,y1-y0+1];
}
function crop(image,rect,maxSize,kind){
 const scale=Math.min(1,maxSize/Math.max(rect[2],rect[3])),out=canvas(rect[2]*scale,rect[3]*scale),ctx=out.getContext('2d');
 ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(image,...rect,0,0,out.width,out.height);
 return remember(out,[kind]);
}
function url(bitmap,key){
 if(!bitmap)return null;if(!urlCache.has(key))urlCache.set(key,bitmap.toDataURL('image/png'));return urlCache.get(key);
}
function readMaterials(image){
 for(let index=0;index<6;index++){
  const cell=cellRect(image,index,3,2),inset=Math.max(1,Math.round(Math.min(cell[2],cell[3])*.012));
  const rect=[cell[0]+inset,cell[1]+inset,cell[2]-2*inset,cell[3]-2*inset];
  sourceRects.materials.push(rect);materials.push(crop(image,rect,256,'materials'));
 }
 const root=document.documentElement;
 for(let grade=0;grade<5;grade++){
  root.style.setProperty('--gp297-grade-'+grade,'url("'+url(materials[grade],'grade-'+grade)+'")');
 }
 root.style.setProperty('--gp297-frost','url("'+url(materials[5],'frost')+'")');
}
function readFurniture(image){
 for(let index=0;index<FURNITURE.length;index++){
  const rect=alphaRect(image,cellRect(image,index,3,2));sourceRects.furniture.push(rect);
  furniture.set(FURNITURE[index],crop(image,rect,index<2?192:384,'furniture'));
 }
}
function collectorRim(source){
 const out=canvas(source.width,source.height),ctx=out.getContext('2d'),w=out.width,h=out.height;
 ctx.drawImage(source,0,0);ctx.globalCompositeOperation='destination-out';
 // The generated quiet quadrants are opaque. Open the same four triangles
 // used by the native collector, retaining the authored ice rim and cross.
 const cx=w*.503,cy=h*.5,gap=Math.min(w,h)*.012,rx=w*.37,ry=h*.365;
 for(const [sx,sy]of [[1,-1],[1,1],[-1,1],[-1,-1]]){
  ctx.beginPath();ctx.moveTo(cx+sx*gap,cy+sy*gap);
  ctx.lineTo(cx+sx*gap,cy+sy*ry);ctx.lineTo(cx+sx*rx,cy+sy*gap);ctx.closePath();ctx.fill();
 }
 return remember(out,['paytable']);
}
function fitCabinet(source){
 const out=canvas(256,900),ctx=out.getContext('2d');
 // The old cabinet reserves a short header and narrow side margins. A
 // cached nine-slice keeps that text space while preserving real ice/gold
 // pixels; a simple whole-image stretch would put scoops behind collectors.
 const sx=[0,source.width*.23,source.width*.77,source.width],sy=[0,source.height*.245,source.height*.86,source.height];
 const dx=[0,24,232,256],dy=[0,64,882,900];
 for(let row=0;row<3;row++)for(let col=0;col<3;col++)ctx.drawImage(source,sx[col],sy[row],sx[col+1]-sx[col],sy[row+1]-sy[row],dx[col],dy[row],dx[col+1]-dx[col],dy[row+1]-dy[row]);
 return remember(out,['paytable']);
}
function readPaytable(image){
 // Inspected 1024×1536 atlas: the tall cabinet crosses the nominal halfway
 // line. These regions include its feet and keep neighbouring pieces out.
 const regions=[[28,8,461,830],[487,170,513,550],[4,1060,481,270],[485,890,539,538]];
 for(let index=0;index<PAYTABLE.length;index++){
  const region=regions[index].map((value,i)=>Math.round(value*(i%2===0?image.naturalWidth/1024:image.naturalHeight/1536)));
  const name=PAYTABLE[index],rect=alphaRect(image,region);sourceRects.paytable.push(rect);
  let imagePart=crop(image,rect,900,'paytable');
  if(name==='collector')imagePart=collectorRim(imagePart);
  if(name==='cabinet')imagePart=fitCabinet(imagePart);
  paytable.set(name,imagePart);
  document.documentElement.style.setProperty('--gp297-pay-'+name,'url("'+url(imagePart,'pay-'+name)+'")');
 }
}
function load(kind,read){
 if(!enabled)return Promise.resolve(false);
 return new Promise(resolve=>{
  const image=new Image();
  image.onload=()=>{
   try{
    if(!image.naturalWidth||!image.naturalHeight)throw Error('Empty image');
    sheets[kind]=image;read(image);status[kind]=true;epoch++;
    if(status.materials&&status.furniture&&status.paytable)document.documentElement.classList.add('gelato-art-v297');
    document.dispatchEvent(new CustomEvent('gelato-art-ready-v297',{detail:{kind}}));resolve(true);
   }catch(error){failures.push(kind+': '+String(error?.message||error));resolve(false);}
  };
  image.onerror=()=>{failures.push(kind+': image unavailable');resolve(false);};image.src=FILES[kind]+'?v=297';
 });
}
function triangle(ctx,points){
 ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);ctx.lineTo(points[1].x,points[1].y);ctx.lineTo(points[2].x,points[2].y);ctx.closePath();
}
function prepareFaces(images,faces,coords,size){
 if(!status.materials||!status.furniture||!Array.isArray(faces)||!Array.isArray(coords)||!(size>0))return false;
 const key=size+'/'+coords.map(point=>point.x+','+point.y).join(';')+'/'+faces.map(face=>face.nodes.join(',')).join(';');
 let tiles=faceCache.get(key);
 if(tiles)stats.faceHits++;
 else{
  const scale=size/500;
  tiles=faces.map(face=>{
   const points=face.nodes.map(index=>({x:coords[index].x*scale,y:coords[index].y*scale}));
   const x=Math.max(0,Math.floor(Math.min(...points.map(p=>p.x)))-2),y=Math.max(0,Math.floor(Math.min(...points.map(p=>p.y)))-2);
   const right=Math.min(size,Math.ceil(Math.max(...points.map(p=>p.x)))+2),bottom=Math.min(size,Math.ceil(Math.max(...points.map(p=>p.y)))+2);
   const width=right-x,height=bottom-y,local=points.map(point=>({x:point.x-x,y:point.y-y})),bright=[],dim=[];
   for(let grade=0;grade<5;grade++){
    const filled=canvas(width,height),ctx=filled.getContext('2d');
    ctx.save();triangle(ctx,local);ctx.clip();ctx.drawImage(materials[grade],0,0,width,height);ctx.restore();
    const empty=canvas(width,height),ec=empty.getContext('2d');
    ec.save();triangle(ec,local);ec.clip();ec.drawImage(materials[5],0,0,width,height);
    ec.globalAlpha=.76;ec.globalCompositeOperation='multiply';ec.drawImage(materials[grade],0,0,width,height);
    ec.globalCompositeOperation='source-over';ec.globalAlpha=.53;ec.fillStyle='#0c2144';ec.fillRect(0,0,width,height);ec.restore();
    bright.push(remember(filled,['materials']));dim.push(remember(empty,['materials']));
   }
   return {images:bright,dimImages:dim,x,y,width,height};
  });
  if(faceCache.size>=2)faceCache.delete(faceCache.keys().next().value);
  faceCache.set(key,tiles);stats.faceBuilds++;
 }
 images.faceTiles=tiles;images.artVersion=VERSION;images.artEpoch=epoch;return true;
}
function socket(ctx,hit,x,y,size){
 if(!status.materials||!status.furniture)return false;
 const image=furniture.get(hit?'socket-hit':'socket-idle');if(!image||!(size>0))return false;
 const scale=size/Math.max(image.width,image.height),w=image.width*scale,h=image.height*scale;
 ctx.drawImage(image,x-w/2,y-h/2,w,h);stats.sockets++;return true;
}
function rail(ctx,mode,a,b,width){
 if(!status.materials||!status.furniture)return false;
 const image=furniture.get('rail-'+mode);if(!image||!(width>0)||!a||!b)return false;
 const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);if(!(length>0))return false;
 const key=mode+'/'+width+'/'+length.toFixed(4);let strip=railCache.get(key);
 if(!strip){
  strip=canvas(length*2,width*2);const sc=strip.getContext('2d'),w=strip.width,h=strip.height;
  // End caps retain their authored facets; only the quiet middle stretches.
  const sourceCap=Math.min(image.width*.18,image.height*.9),cap=Math.min(w*.22,h*.9),sw=image.width-2*sourceCap;
  sc.drawImage(image,0,0,sourceCap,image.height,0,0,cap,h);
  sc.drawImage(image,sourceCap,0,sw,image.height,cap,0,w-2*cap,h);
  sc.drawImage(image,image.width-sourceCap,0,sourceCap,image.height,w-cap,0,cap,h);
  if(railCache.size>=48)railCache.delete(railCache.keys().next().value);
  remember(strip,['furniture']);railCache.set(key,strip);stats.railBuilds++;
 }
 ctx.save();ctx.translate(a.x,a.y);ctx.rotate(Math.atan2(dy,dx));ctx.drawImage(strip,0,-width/2,length,width);
 ctx.restore();stats.rails++;return true;
}
function pour(ctx,{grade=0,x,y,targetX,targetY,progress=0}={}){
 if(!status.materials||!status.furniture)return false;
 const image=furniture.get('jug');if(!image||!Number.isFinite(x+y+targetX+targetY))return false;
 grade=Number.isInteger(grade)&&grade>=0&&grade<5?grade:0;
 ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
 const liquid=ctx.createLinearGradient(x-17,y+24,targetX,targetY);
 liquid.addColorStop(0,'#fbffff');liquid.addColorStop(.35,COLORS[grade]);liquid.addColorStop(1,'#effbff');
 ctx.beginPath();ctx.moveTo(x-17,y+24);ctx.quadraticCurveTo(x-12,y+65,targetX,targetY-4);
 ctx.strokeStyle=COLORS[grade];ctx.lineWidth=13;ctx.globalAlpha=.72;ctx.stroke();
 ctx.strokeStyle=liquid;ctx.lineWidth=8;ctx.globalAlpha=1;ctx.stroke();
 for(let index=0;index<4;index++){
  const t=(progress*2+index*.21)%1,dx=x-17+(targetX-x+17)*t,dy=y+25+(targetY-y-25)*t*t;
  ctx.beginPath();ctx.ellipse(dx,dy,2.5+index%2,3.5+index%2,0,0,Math.PI*2);ctx.fillStyle=index%2?'#faffff':COLORS[grade];ctx.fill();
 }
 const scale=96/Math.max(image.width,image.height),w=image.width*scale,h=image.height*scale;
 ctx.translate(x,y-2);ctx.rotate(-.18);ctx.drawImage(image,-w/2,-h/2,w,h);ctx.restore();stats.pours++;return true;
}
const ready=Promise.all([load('materials',readMaterials),load('furniture',readFurniture),load('paytable',readPaytable)]).then(values=>values.every(Boolean));
window.GelatoArtV297=Object.freeze({
 version:VERSION,ready,get loaded(){return status.materials&&status.furniture;},get epoch(){return epoch;},prepareFaces,socket,rail,pour,
 sourceImagesOf(image){return (origins.get(image)||[]).map(kind=>sheets[kind]).filter(Boolean);},
 collectorURL(grade,filled=true){return Number.isInteger(grade)&&grade>=0&&grade<5?url(materials[filled?grade:5],filled?'grade-'+grade:'frost'):null;},
 describe(){return {version:VERSION,enabled,loaded:status.materials&&status.furniture,ready:Object.values(status).every(Boolean),status:{...status},epoch,grades:GRADES.slice(),files:{...FILES},failures:failures.slice(),
  sourceRects:Object.fromEntries(Object.entries(sourceRects).map(([kind,rects])=>[kind,rects.map(rect=>rect.slice())])),decodedSources:Object.fromEntries(Object.entries(sheets).map(([kind,image])=>[kind,{url:FILES[kind],width:image.naturalWidth,height:image.naturalHeight}])),
  cachedFaceSets:faceCache.size,cachedFaces:[...faceCache.values()].reduce((sum,faces)=>sum+faces.length,0),cachedRails:railCache.size,cachedURLs:urlCache.size,...stats};}
});
})();

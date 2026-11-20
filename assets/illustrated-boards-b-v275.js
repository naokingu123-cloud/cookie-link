/* v275: painted game pieces. Native geometry, liquid, numbers and game state remain authoritative. */
(()=>{
'use strict';
const art=()=>window.SweetsBoardArtV275;
const available=()=>!!art()?.loaded;
const cache=new Map(),calls=Object.create(null);
const count=name=>{calls[name]=(calls[name]||0)+1;};
const canvas=(w,h=w)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
const path=(c,points)=>{c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();};
const sprite=name=>available()?art().sprite(name):null;
function triangleSprite(c,image,points){
 // The source has one top apex and two bottom corners. An affine mapping
 // registers those three points exactly to the engine's triangular face.
 const [top,left,right]=points,w=image.width,h=image.height;
 const a=(right.x-left.x)/w,b=(right.y-left.y)/w;
 const e=((left.x+right.x)/2-top.x)/h,f=((left.y+right.y)/2-top.y)/h;
 c.save();c.transform(a,b,e,f,top.x-a*w/2,top.y-b*w/2);c.drawImage(image,0,0);c.restore();
}
function gelatoCache(images,faces,coords,size){
 const names=['gelato-blue','gelato-green','gelato-yellow','gelato-red','gelato-purple'];
 const sources=names.map(sprite);if(sources.some(s=>!s)||!images.faceTiles)return false;
 const ratio=size/500;
 // Keep the elaborate snowflake base and its live rail layer. Only the
 // twenty-four edible triangular pieces receive the new painted material.
 images.faceTiles=faces.map((face,index)=>{
  const previous=images.faceTiles[index],{x,y,width,height}=previous;
  const points=face.nodes.map(i=>({x:coords[i].x*ratio-x,y:coords[i].y*ratio-y}));
  const bright=[],dim=[];
  for(let grade=0;grade<sources.length;grade++){
   const tile=canvas(width,height),c=tile.getContext('2d');
   c.drawImage(previous.images[grade],0,0);
   c.save();path(c,points);c.clip();triangleSprite(c,sources[grade],points);c.restore();
   const dark=canvas(width,height),d=dark.getContext('2d');d.drawImage(tile,0,0);
   d.globalCompositeOperation='source-atop';d.fillStyle='rgba(2,12,37,.64)';d.fillRect(0,0,width,height);
   bright.push(tile);dim.push(dark);
  }
  return {images:bright,dimImages:dim,x,y,width,height};
 });
 count('gelatoCache');return true;
}
function gelatoSocket(c,hit,x,y,size){
 const source=sprite('gelato-socket');if(!source)return false;
 const key='gelato-socket/'+Number(hit);let image=cache.get(key);
 if(!image){
  image=canvas(144);const g=image.getContext('2d');g.drawImage(source,0,0,144,144);
  if(hit){g.globalCompositeOperation='source-atop';g.fillStyle='#ffdf6a';g.globalAlpha=.24;g.fillRect(0,0,144,144);}
  cache.set(key,image);
 }
 c.drawImage(image,x-size/2,y-size/2,size,size);count('gelatoSocket');return true;
}
function wineryGlass(c,x,y,full){
 const source=sprite('wine-glass');if(!source)return false;
 let image=cache.get('wine-glass-fit');
 if(!image){
  // The illustration's long decorative stem is compressed separately from
  // its bowl, so the painted bowl surrounds the actual 70px liquid depth.
  // A single cached image prevents seams/shadows at the slice boundaries.
  image=canvas(292,260);const g=image.getContext('2d');
  const sy=[0,Math.round(source.height*.48),Math.round(source.height*.80),source.height],dy=[0,184,232,260];
  for(let i=0;i<3;i++)g.drawImage(source,0,sy[i],source.width,sy[i+1]-sy[i],0,dy[i],292,dy[i+1]-dy[i]);
  cache.set('wine-glass-fit',image);
 }
 c.save();
 // The live juice owns the bowl interior. The new rim, facets, stem and
 // foot surround its original opening, including quarter-filled glasses.
 c.beginPath();c.rect(x-74,y-12,148,147);
 c.moveTo(x-51,y+12);c.bezierCurveTo(x-49,y+37,x-28,y+68,x,y+77);
 c.bezierCurveTo(x+28,y+68,x+49,y+37,x+51,y+12);c.closePath();c.clip('evenodd');
 c.shadowColor='#fff0bc';c.shadowBlur=full?11:5;c.drawImage(image,x-73,y-10,146,130);c.restore();
 count('wineryGlass');return true;
}
function wineryPlaque(c,x,y,full){
 const source=sprite('wine-plaque');if(!source)return false;
 const key='wine-plaque/'+Number(full);let image=cache.get(key);
 if(!image){
  image=canvas(200,100);const g=image.getContext('2d');g.drawImage(source,0,0,200,100);
  // Tint only the recessed label centre when filled. The generated gold
  // edging and pearl highlights remain unchanged around the live number.
  if(full){
   g.save();g.beginPath();g.roundRect(29,24,137,51,15);g.clip();
   g.globalCompositeOperation='color';g.fillStyle='#247950';g.globalAlpha=.90;g.fillRect(29,24,137,51);g.restore();
  }
  cache.set(key,image);
 }
 c.drawImage(image,x-42,y-22,84,44);count('wineryPlaque');return true;
}
const kernelNames=['popcorn-cream','popcorn-gold','popcorn-red','popcorn-purple','popcorn-blue','popcorn-rainbow'];
function popcornAtlas(mini=false,highResolution=false){
 if(!available())return null;
 const tile=highResolution?256:mini?18:54,key='popcorn/'+tile;
 let sheet=cache.get(key);
 if(!sheet){
  const sources=kernelNames.map(sprite);if(sources.some(s=>!s))return null;
  sheet=canvas(tile*6,tile);const c=sheet.getContext('2d');c.imageSmoothingQuality='high';
  sources.forEach((image,i)=>c.drawImage(image,i*tile,0,tile,tile));cache.set(key,sheet);
 }
 count(highResolution?'popcornSource':'popcornAtlas');return sheet;
}
function popcornLiner(c,x,y){
 const source=sprite('popcorn-liner');if(!source)return false;
 c.save();c.globalAlpha*=.92;c.drawImage(source,x-.45,y-.285,.90,.68);c.restore();
 count('popcornLiner');return true;
}
function jellyTexture(c,x,y,w,h,mini=false,empty=false){
 const source=sprite('jelly-surface');if(!source)return false;
 c.save();c.beginPath();c.rect(x-.12,y-.12,w+.24,h+.24);c.clip();
 // All twenty-five compartments sample one board-sized surface. Removing
 // a partition therefore exposes one uninterrupted pool, never a tile rim.
 c.globalCompositeOperation='luminosity';c.globalAlpha*=empty?.38:mini?.57:.76;
 c.drawImage(source,x/500*source.width,y/500*source.height,w/500*source.width,h/500*source.height,x,y,w,h);
 c.restore();count('jellyTexture');return true;
}
function jellyRib(){
 const source=sprite('jelly-rib');if(!source)return null;
 const key='jelly-rib';let image=cache.get(key);
 if(!image){image=canvas(208,32);image.getContext('2d').drawImage(source,0,0,208,32);cache.set(key,image);}
 count('jellyRib');return image;
}
function jellyRim(c){
 const source=sprite('jelly-mold');if(!source)return false;
 const sw=source.width,sh=source.height,cut=Math.max(1,Math.floor(Math.min(sw,sh)*.19));
 const sx=[0,cut,sw-cut,sw],sy=[0,cut,sh-cut,sh];
 const dx=[-42,0,500,542],dy=[-42,0,500,542];
 // Only eight border slices are painted. The centre stays truly open for
 // the original floor, flowing colour, numbers and disappearing dividers.
 for(let row=0;row<3;row++)for(let col=0;col<3;col++){
  if(row===1&&col===1)continue;
  c.drawImage(source,sx[col],sy[row],sx[col+1]-sx[col],sy[row+1]-sy[row],
   dx[col],dy[row],dx[col+1]-dx[col],dy[row+1]-dy[row]);
 }
 count('jellyRim');return true;
}
window.SweetsIllustratedBoardsBV275=Object.freeze({
 get active(){return available();},gelatoCache,gelatoSocket,wineryGlass,wineryPlaque,
 popcornAtlas,popcornSource:()=>popcornAtlas(false,true),popcornLiner,jellyTexture,jellyRib,jellyRim,
 stats:()=>({version:'v275',active:available(),cached:cache.size,calls:{...calls}})
});
})();

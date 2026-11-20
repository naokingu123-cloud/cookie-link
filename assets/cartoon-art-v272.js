/* v272: generated illustrated sprites. Presentation only; no game state/RNG. */
(()=>{
'use strict';
if(window.SweetsCartoonArt)return;
const sheets={
 a:{file:'assets/cartoon-art-v272/sweets-sprites-a.png',cols:6,rows:6,names:[
  'cookie-berry','cookie-honey','cookie-pistachio','cookie-soda','cookie-grape','hammer',
  'candy-blue','candy-aqua','candy-green','candy-lime','candy-yellow','candy-orange',
  'candy-red','candy-violet','candy-pink','sugar-star','sugar-badge','cookie-basket',
  'choco-milk','choco-berry','choco-ivory','choco-dark','choco-seat','hex-seat',
  'ore-copper','ore-silver','ore-gold','ore-diamond','gem-red','gem-violet',
  'number-medallion','crown','treasure-chest','gold-medal','button-pink','button-cyan']},
 b:{file:'assets/cartoon-art-v272/sweets-sprites-b.png',cols:6,rows:6,names:[
  'gelato-green','gelato-yellow','gelato-red','gelato-purple','gelato-blue','gelato-socket',
  'wine-glass','wine-glass-lit','wine-plaque','popcorn-cream','popcorn-pink','popcorn-gold',
  'popcorn-aqua','popcorn-lavender','popcorn-lime','popcorn-bomb','jelly-mold','jelly-pink',
  'jelly-green','jelly-orange','jelly-blue','jelly-purple','waffle-cell','waffle-black',
  'waffle-white','castella-hole','castella-raw','castella-baked','castella-dispenser','dango-white',
  'dango-green','dango-pink','dango-yellow','dango-rainbow','bamboo','star-biscuit']},
 frames:{file:'assets/cartoon-art-v272/sweets-frames.png',cols:2,rows:5,names:[
  'frame-cookie','frame-candy','frame-choco','frame-gelato','frame-winery','frame-popcorn',
  'frame-jelly','frame-stick','frame-castella','frame-dango']}
};
const entries=new Map(),cache=new Map(),urls=new Map();
for(const sheet of Object.values(sheets))sheet.names.forEach((name,index)=>entries.set(name,{sheet,index}));
const aliases={'frame-waffle':'frame-stick','waffle':'frame-stick'};
const api={epoch:'v272',loaded:false,ready:null,sprite,url,draw,frame,describe};
window.SweetsCartoonArt=api;
function make(w,h){const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w));c.height=Math.max(1,Math.round(h));return c;}
function sprite(name){
 name=aliases[name]||name;if(cache.has(name))return cache.get(name);
 const e=entries.get(name);if(!api.loaded||!e?.sheet.image)return null;
 const {sheet,index}=e,img=sheet.image;
 const x=Math.round(index%sheet.cols*img.naturalWidth/sheet.cols),y=Math.round(Math.floor(index/sheet.cols)*img.naturalHeight/sheet.rows);
 const right=Math.round((index%sheet.cols+1)*img.naturalWidth/sheet.cols),bottom=Math.round((Math.floor(index/sheet.cols)+1)*img.naturalHeight/sheet.rows);
 const full=make(right-x,bottom-y),ctx=full.getContext('2d',{willReadFrequently:true});
 ctx.drawImage(img,x,y,full.width,full.height,0,0,full.width,full.height);
 // Tight bounds are computed only to place an atlas cell. Original alpha and
 // generated pixels are kept intact; no recoloring or bitmap reconstruction.
 const {data}=ctx.getImageData(0,0,full.width,full.height);
 let l=full.width,t=full.height,r=-1,b=-1;
 for(let yy=0;yy<full.height;yy++)for(let xx=0;xx<full.width;xx++)if(data[(yy*full.width+xx)*4+3]>32){l=Math.min(l,xx);r=Math.max(r,xx);t=Math.min(t,yy);b=Math.max(b,yy);}
 if(r<l){cache.set(name,full);return full;}
 l=Math.max(0,l-2);t=Math.max(0,t-2);r=Math.min(full.width-1,r+2);b=Math.min(full.height-1,b+2);
 const crop=make(r-l+1,b-t+1);crop.getContext('2d').drawImage(full,l,t,crop.width,crop.height,0,0,crop.width,crop.height);
 cache.set(name,crop);return crop;
}
function url(name){name=aliases[name]||name;if(urls.has(name))return urls.get(name);const c=sprite(name);if(!c)return '';const value=c.toDataURL('image/png');urls.set(name,value);return value;}
function draw(ctx,name,x,y,w,h){const c=sprite(name);if(!c||!ctx||!(w>0&&h>0))return false;ctx.drawImage(c,x,y,w,h);return true;}
function frame(ctx,game,x,y,w,h,thickness=24){
 const c=sprite('frame-'+(game==='waffle'?'stick':game));if(!c||!ctx||!(w>0&&h>0))return false;
 const cut=Math.floor(Math.min(c.height*.34,c.width*.22));
 const d=Math.max(.001,Math.min(thickness,w/2,h/2));
 const sx=[0,cut,c.width-cut,c.width],sy=[0,cut,c.height-cut,c.height];
 const dx=[x,x+d,x+w-d,x+w],dy=[y,y+d,y+h-d,y+h];
 for(let row=0;row<3;row++)for(let col=0;col<3;col++){
  if(row===1&&col===1)continue;
  if(dx[col+1]<=dx[col]||dy[row+1]<=dy[row])continue;
  ctx.drawImage(c,sx[col],sy[row],sx[col+1]-sx[col],sy[row+1]-sy[row],dx[col],dy[row],dx[col+1]-dx[col],dy[row+1]-dy[row]);
 }
 return true;
}
function describe(){return {version:api.epoch,loaded:api.loaded,sprites:entries.size,files:Object.values(sheets).map(s=>s.file),cached:cache.size};}
async function load(sheet){
 const img=new Image();img.decoding='async';
 await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('Cartoon atlas unavailable: '+sheet.file));img.src=sheet.file+'?v=272';});
 if(typeof img.decode==='function')await img.decode();sheet.image=img;
}
api.ready=Promise.all(Object.values(sheets).map(load)).then(()=>{
 api.loaded=true;
 const root=document.documentElement;
 for(const name of sheets.frames.names){
  const c=sprite(name),game=name.slice(6),cut=Math.floor(Math.min(c.height*.34,c.width*.22));
  root.style.setProperty('--v272-frame-'+game,'url("'+url(name)+'")');
  root.style.setProperty('--v272-frame-slice-'+game,String(cut));
 }
 root.style.setProperty('--v272-frame-waffle','var(--v272-frame-stick)');
 root.style.setProperty('--v272-frame-slice-waffle','var(--v272-frame-slice-stick)');
 root.classList.add('cartoon-art-v272');root.dataset.cartoonArt='v272';
 return true;
}).catch(error=>{console.warn(error);return false;});
})();

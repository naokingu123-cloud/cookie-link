/* v291: real illustrated confectionery sprites from the supplied image sheets.
 * Cropping only: original RGBA pixels, game geometry and payout data are preserved. */
(()=>{
'use strict';
if(window.SweetsArtV291)return;
const root='assets/sweets-v291/';
const sheet=new Image();sheet.decoding='async';
const rects=Object.freeze({
 'tile-cookie':[16,63,213,206],'pay-cookie':[239,15,298,273],
 'tile-choco':[558,63,217,218],'pay-choco':[779,16,330,270],
 'tile-candy':[19,338,208,226],'pay-candy':[246,293,284,285],
 'tile-jelly':[554,360,214,200],'pay-jelly':[765,299,347,280],
 'tile-gelato':[10,628,223,190],'pay-gelato':[231,586,313,267],
 'tile-winery':[578,612,166,233],'pay-winery':[763,587,351,273],
 'tile-popcorn':[14,899,211,187],'pay-popcorn':[222,863,313,248],
 'tile-stick':[549,905,214,185],'pay-stick':[763,876,345,232],
 'tile-castella':[14,1158,195,214],'pay-castella':[222,1124,337,262],
 'tile-dango':[571,1137,180,252],'pay-dango':[752,1131,353,265]
});
const cache=new Map(),urls=new Map(),stats={draws:0,crops:0,failed:0};
function crop(id){
 if(cache.has(id))return cache.get(id);
 const r=rects[id];if(!r||!api.loaded)return null;
 const [x,y,w,h]=r,c=document.createElement('canvas');c.width=w;c.height=h;
 const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 ctx.drawImage(sheet,x,y,w,h,0,0,w,h);
 c.complete=true;c.naturalWidth=w;c.naturalHeight=h;
 cache.set(id,c);stats.crops++;return c;
}
function contain(ctx,img,x,y,w,h){
 const iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height;
 if(!(iw>0&&ih>0&&w>0&&h>0))return false;
 const k=Math.min(w/iw,h/ih),dw=iw*k,dh=ih*k;
 ctx.drawImage(img,x+(w-dw)/2,y+(h-dh)/2,dw,dh);return true;
}
function draw(ctx,id,x,y,w,h){
 const img=crop(id);if(!img||!ctx)return false;
 const result=contain(ctx,img,x,y,w,h);if(result)stats.draws++;return result;
}
function url(id){
 if(urls.has(id))return urls.get(id);
 const img=crop(id);if(!img)return '';
 const value=img.toDataURL('image/png');urls.set(id,value);return value;
}
const api={version:291,loaded:false,ready:null,sprite:crop,draw,url,
 describe:()=>({version:291,loaded:api.loaded,failed:stats.failed,sprites:Object.keys(rects),cached:cache.size,draws:stats.draws})};
window.SweetsArtV291=api;
api.ready=new Promise(resolve=>{
 sheet.onload=()=>{
  api.loaded=true;
  for(const game of ['cookie','choco','candy','jelly','gelato','winery','popcorn','stick','castella','dango']){
   const pay=url('pay-'+game),tile=url('tile-'+game);
   if(pay)document.documentElement.style.setProperty('--v291-pay-'+game,'url("'+pay+'")');
   if(tile)document.documentElement.style.setProperty('--v291-tile-'+game,'url("'+tile+'")');
  }
  document.documentElement.classList.add('sweets-art-v291');
  resolve(true);
 };
 sheet.onerror=()=>{stats.failed++;resolve(false);console.warn('[SweetsArtV291] supplied PNG sheet unavailable');};
 sheet.src=root+'tile-paytable-spritesheet.png?v=291';
});
})();
/* Cookie Link's illustrated pastry paytable. This presentation-only adapter
 * loads once, cuts four generated RGBA plaques and exposes them as CSS images.
 * Native payout values, fitGoldenNumber, 19 px LINK reel, 16 px hammer rows,
 * selection movement and the main game background keep their original owners. */
(()=>{
'use strict';
if(window.CookiePayoutV293)return;
if(!new Set(window.SweetsLineup?.chosen||[]).has('cookie'))return;
const params=new URLSearchParams(location.search);
if(params.get('serverSettlementWorker')==='1'||params.get('downloadWorker')==='1')return;
const file='assets/cookie-art-v293/payout-furniture.webp?v=293';
// Normalized to the 1024 x 1536 source. The gutters are transparent; the
// actual bounds keep the icing/cream silhouette rather than adding a box.
const rects={
 heading:[20,44,984,340],
 row:[12,499,998,248],
 selected:[10,850,1002,260],
 footer:[24,1217,976,286]
};
let loaded=false,error='',imageSize=[],bytes=0;
const sprites=new Map();
const ready=new Promise(resolve=>{
 const image=new Image();
 image.decoding='async';
 image.onload=()=>{
  try{
   const iw=image.naturalWidth,ih=image.naturalHeight;
   if(!(iw>0&&ih>0))throw Error('Empty pastry artwork');
   imageSize=[iw,ih];
   for(const [name,[x,y,w,h]]of Object.entries(rects)){
    const bitmap=document.createElement('canvas');
    bitmap.width=768;bitmap.height=Math.round(768*h/w);
    const ctx=bitmap.getContext('2d');
    if(!ctx)throw Error('Canvas unavailable');
    ctx.drawImage(image,x*iw/1024,y*ih/1536,w*iw/1024,h*ih/1536,0,0,bitmap.width,bitmap.height);
    const url=bitmap.toDataURL('image/png');
    bytes+=url.length;sprites.set(name,bitmap);
    document.documentElement.style.setProperty('--cp293-'+name,'url("'+url+'")');
   }
   loaded=true;
   document.documentElement.classList.add('cookie-payout-v293');
  }catch(e){error=String(e?.message||e);}
  resolve(loaded);
 };
 image.onerror=()=>{error='Cookie payout artwork could not load';resolve(false);};
 image.src=file;
});
window.CookiePayoutV293=Object.freeze({
 version:293,ready,
 sprite:name=>sprites.get(name)||null,
 describe:()=>({version:293,loaded,error,source:file,imageSize:[...imageSize],
  sprites:[...sprites.keys()],cachedImageCharacters:bytes,game:'cookie',
  linkRowHeight:19,hammerRowHeight:16,values:'native',background:'native'})
});
})();

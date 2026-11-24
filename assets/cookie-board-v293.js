/* Cookie Link v293: sculpted biscuit faces and confectioner's mallets.
 * This presentation adapter is appended inside the native game closure.
 * It never reads randomness, writes engine state, changes geometry, or owns
 * animation. The original board, miniature, shatter and tutorial painters
 * consume the same ten cached bitmaps.
 */
(()=>{
'use strict';
if(window.CookieBoardV293)return;
const params=new URLSearchParams(location.search);
if(params.has('serverSettlementWorker')||params.has('downloadWorker'))return;
const selected=new Set(window.SweetsLineup?.chosen||[]);
if(!selected.has('cookie'))return;
const FILE='assets/cookie-art-v293/board-pieces.webp?v=293';
const names=['berry','honey','pistachio','soda','grape'];
// Hand inspected alpha bounds, with six pixels of untouched transparent gutter.
// All rectangles address the original 1536 x 1024 generated sheet.
const rects=[
 [36,23,490,476],[532,14,1001,484],[1066,38,1496,455],
 [25,530,478,982],[526,526,995,982],[1064,520,1510,1000]
];
const bitmaps=new Map(),urls=new Map(),origins=new WeakMap();
let sheet=null,installed=false,failed=false,refreshes=0;
let resolveReady;
const ready=new Promise(resolve=>{resolveReady=resolve;});
const api={
 version:293,ready,
 get loaded(){return installed;},
 cookieURL:(color,special=false)=>installed?url(color,special):'',
 sprite:(color,special=false)=>installed?bitmap(color,special):null,
 sourcesOf:source=>origins.has(source)?[FILE.split('?')[0]]:[],
 sourceImagesOf:source=>origins.has(source)&&sheet?[sheet]:[],
 describe:()=>({
  version:293,loaded:installed,failed,file:FILE.split('?')[0],
  colors:names.slice(),cachedSprites:bitmaps.size,generatedURLs:urls.size,
  refreshes,games:['cookie'],geometry:'native',numbers:'native',
  state:'unchanged',background:'native'
 })
};
window.CookieBoardV293=Object.freeze(api);
function colorIndex(color){
 const value=Number(color);
 return Number.isFinite(value)?((Math.trunc(value)%5)+5)%5:0;
}
function newCanvas(size){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
 return canvas;
}
function place(ctx,index,x,y,width,height){
 const r=rects[index],sx=r[0]*sheet.naturalWidth/1536,sy=r[1]*sheet.naturalHeight/1024,
  sw=(r[2]-r[0])*sheet.naturalWidth/1536,sh=(r[3]-r[1])*sheet.naturalHeight/1024,
  scale=Math.min(width/sw,height/sh),dw=sw*scale,dh=sh*scale;
 ctx.drawImage(sheet,sx,sy,sw,sh,x+(width-dw)/2,y+(height-dh)/2,dw,dh);
}
function bitmap(color,special=false){
 const index=colorIndex(color),key=index+'/'+Number(!!special);
 if(bitmaps.has(key))return bitmaps.get(key);
 if(!sheet)return null;
 const out=newCanvas(160),ctx=out.getContext('2d');
 if(!ctx)return null;
 ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 place(ctx,index,2,2,156,156);
 // The visible colored pastry rim retains the native hammer color identity.
 // Its illustration is generated once, not re-composited on every frame.
 if(special)place(ctx,5,15,5,132,147);
 out.complete=true;out.naturalWidth=160;out.naturalHeight=160;
 origins.set(out,Object.freeze({color:index,special:!!special}));
 bitmaps.set(key,out);return out;
}
function url(color,special=false){
 const key=colorIndex(color)+'/'+Number(!!special);
 if(urls.has(key))return urls.get(key);
 const out=bitmap(color,special);if(!out)return '';
 const value=out.toDataURL('image/png');urls.set(key,value);return value;
}
function install(){
 if(installed)return;
 for(let color=0;color<5;color++)for(let special=0;special<2;special++){
  const out=bitmap(color,!!special);if(!out)throw Error('Cookie bitmap context unavailable');
  cookieSprites[color*2+special]=out;url(color,!!special);
 }
 installed=true;
 const previousBetCookie=betCookie;
 betCookie=function(ctx,color,x,y,size,hammer=false){
  const out=bitmap(color,hammer);
  if(!out)return previousBetCookie.apply(this,arguments);
  ctx.drawImage(out,x-size/2,y-size/2,size,size);
 };
 // The v275 cookieURL factory checks this API before its legacy cache.
 // Consequently newly created faces, future hammer gifts, paytable icons,
 // fragments and miniatures all use the new art without per-frame rewrites.
 for(const slot of slots){
  if(!slot.engine||(slot.engine.kind||'cookie')!=='cookie')continue;
  slot.panel?.classList.add('cookie-board-v293');
  for(const row of slot.engine.board||[])for(const tile of row){
   if(!tile)continue;
   const element=slot.tiles?.get(tile.id),image=element?.querySelector('.cookie-face');
   if(image){image.src=url(tile.color,!!tile.special);image.dataset.boardArt='v293';}
  }
  slot.dirtyMain=slot.dirtyMini=true;
 }
 // Already mounted, disclosed hammer icons may have a stable native cache
 // key. Refresh their artwork once, without revealing concealed colors.
 for(const icon of document.querySelectorAll('#hammer-pay .hammer-count-icon[data-color]')){
  const image=icon.querySelector('img');if(image)image.src=url(Number(icon.dataset.color),true);
 }
 const hammer=newCanvas(160),ctx=hammer.getContext('2d');
 if(ctx){
  place(ctx,5,1,1,158,158);
  document.documentElement.style.setProperty('--cookie293-hammer','url("'+hammer.toDataURL('image/png')+'")');
 }
 document.documentElement.classList.add('cookie-art-v293');
 refreshes++;
 window.sweets12FrameScheduler?.markAll();
 scheduleUI(app);
}
const image=new Image();
image.onload=()=>{
 try{
  if(!(image.naturalWidth>0&&image.naturalHeight>0))throw Error('Cookie artwork is empty');
  sheet=image;install();resolveReady(true);
 }catch(error){
  failed=true;resolveReady(false);
  console.warn('[cookie-v293] Native cookie art retained:',error?.message||error);
 }
};
image.onerror=()=>{failed=true;resolveReady(false);};
image.src=FILE;
})();

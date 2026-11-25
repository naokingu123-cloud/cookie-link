/* Generated Sugar awards and amount glyphs. No event, result or money is
 * selected here: the view supplies the accepted native outcome verbatim. */
(()=>{
'use strict';
if(window.SugarAwardV305)return;
const query=new URLSearchParams(location.search);
if(query.get('serverSettlementWorker')==='1'||query.get('downloadWorker')==='1')return;
const ROOT='assets/sugar-art-v305/';
const FILES=Object.freeze({jpc:'award-jpc.webp',cash:'award-cash.webp',digits:'award-digits.webp'});
const GLYPHS=Object.freeze(['0','1','2','3','4','5','6','7','8','9',',','WIN']);
// Measured clear gutters in the generated 1536×1024 atlas. The 0 extends
// through y=342; equal mathematical thirds cut its tip and contaminate 4.
const GLYPH_ROWS=Object.freeze([0,350/1024,690/1024,1]);
const images=new Map(),glyphs=new Map(),numbers=new Map(),errors=[];
const stats={numberBuilds:0,numberHits:0,numberPaints:0,last:null};
function prepare(source){
 const cv=document.createElement('canvas');cv.width=source.naturalWidth;cv.height=source.naturalHeight;
 const ctx=cv.getContext('2d',{willReadFrequently:true});ctx.drawImage(source,0,0);
 const data=ctx.getImageData(0,0,cv.width,cv.height).data;
 for(let i=0;i<GLYPHS.length;i++){
  const row=Math.floor(i/4),x0=Math.round(i%4*cv.width/4),x1=Math.round((i%4+1)*cv.width/4),y0=Math.round(GLYPH_ROWS[row]*cv.height),y1=Math.round(GLYPH_ROWS[row+1]*cv.height);
  let l=x1,t=y1,r=-1,b=-1;
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(data[(y*cv.width+x)*4+3]>=32){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
  if(r<l||b<t)throw Error('Missing Sugar glyph '+GLYPHS[i]);
  glyphs.set(GLYPHS[i],Object.freeze([Math.max(x0,l-1),Math.max(y0,t-1),Math.min(x1,r+2)-Math.max(x0,l-1),Math.min(y1,b+2)-Math.max(y0,t-1)]));
 }
}
const ready=Promise.all(Object.entries(FILES).map(([name,file])=>new Promise(resolve=>{
 const image=new Image();image.decoding='async';
 image.onload=()=>{images.set(name,image);try{if(name==='digits')prepare(image);}catch(error){errors.push(String(error?.message||error));}resolve(image.naturalWidth>0);};
 image.onerror=()=>{errors.push('Missing '+ROOT+file);resolve(false);};image.src=ROOT+file+'?v=305';
}))).then(results=>results.every(Boolean)&&glyphs.size===12);
function amount(ctx,value,x,y,height,width,unit=false){
 if(!ctx||!Number.isSafeInteger(value)||value<0||!(height>0&&width>0)||glyphs.size!==12)return null;
 const chars=Array.from(value.toLocaleString('ja-JP')),parts=chars.map(char=>{
  const rect=glyphs.get(char),h=char===','?height*.44:height;return {char,rect,h,w:h*rect[2]/rect[3]};
 });
 if(unit){const rect=glyphs.get('WIN'),h=height*.44;parts.push({char:'WIN',rect,h,w:h*rect[2]/rect[3]});}
 const gap=height*.025,natural=parts.reduce((n,p)=>n+p.w,0)+gap*(parts.length-1),scale=Math.min(1,width/natural);
 let left=x-natural*scale/2;
 for(const part of parts){const top=y-height*scale/2+(height-part.h)*scale;ctx.drawImage(images.get('digits'),...part.rect,left,top,part.w*scale,part.h*scale);left+=(part.w+gap)*scale;}
 return {glyphs:parts.map(p=>p.char),width:natural*scale,height:height*scale};
}
function number(node,value,width,height){
 if(!node||!Number.isSafeInteger(value)||value<0||glyphs.size!==12||!(width>0&&height>0))return false;
 const w=Math.max(1,Math.floor(width)),h=Math.max(1,Math.floor(height)),key=value+'/'+w+'/'+h;
 if(node.dataset.sugarNumber===key)return true;
 let cached=numbers.get(key);
 if(!cached){
  const canvas=document.createElement('canvas');canvas.width=w*2;canvas.height=h*2;
  const ctx=canvas.getContext('2d');const bounds=amount(ctx,value,w,h,Math.max(1,(h-1)*2),Math.max(1,(w-2)*2));
  if(!bounds)return false;
  cached={url:canvas.toDataURL('image/png'),bounds};if(numbers.size>=128)numbers.delete(numbers.keys().next().value);numbers.set(key,cached);stats.numberBuilds++;
 }else stats.numberHits++;
 node.style.setProperty('--sugar305-number','url("'+cached.url+'")');node.classList.add('sc305-raster-number');node.dataset.sugarNumber=key;
 stats.numberPaints++;stats.last={value,width:w,height:h,glyphs:cached.bounds.glyphs.slice()};return true;
}
const layouts=Object.freeze({jpc:Object.freeze({caption:[.25,.535,.38,.065],amount:[.14,.70,.57,.16],multiplier:[.77,.67,.17,.26]}),cash:Object.freeze({caption:[.32,.63,.36,.06],amount:[.16,.75,.68,.16]})});
window.SugarAwardV305=Object.freeze({version:305,ready,number,amount,layouts,
 get loaded(){return images.size===3&&glyphs.size===12;},
 asset:kind=>FILES[kind]?ROOT+FILES[kind]+'?v=305':null,
 image:kind=>images.get(kind)||null,
 describe:()=>({version:305,loaded:images.size===3&&glyphs.size===12,files:Object.values(FILES).map(f=>ROOT+f),glyphRects:Object.fromEntries(glyphs),glyphRowFractions:GLYPH_ROWS.slice(),errors:errors.slice(),numberCacheSize:numbers.size,numberCacheLimit:128,...stats,last:stats.last?{...stats.last,glyphs:stats.last.glyphs.slice()}:null})});
})();

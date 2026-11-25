/* Dedicated Sugar confectionery furniture. Loading/cropping happens once;
 * native Sugar state, reel, timing and settlement remain the sole owners. */
(()=>{
'use strict';
if(window.SugarArtV305)return;
const query=new URLSearchParams(location.search);
if(query.get('serverSettlementWorker')==='1'||query.get('downloadWorker')==='1')return;
const ROOT='assets/sugar-art-v305/';
const FILES=Object.freeze({bottle:'bottle.webp',scale:'scale.webp',cabinet:'payout-cabinet.webp',furniture:'furniture-atlas.webp',background:'workshop-background.webp'});
const images=new Map(),sprites=new Map(),sources=new Map(),rects=new Map(),errors=[];
let loaded=false,cropCount=0;
function crop(name,index){
 const image=images.get('furniture'),w=Math.round(image.naturalWidth/2),h=Math.round(image.naturalHeight/2),x=index%2*w,y=Math.floor(index/2)*h;
 const probe=document.createElement('canvas');probe.width=w;probe.height=h;
 const c=probe.getContext('2d',{willReadFrequently:true});c.drawImage(image,x,y,w,h,0,0,w,h);
 const data=c.getImageData(0,0,w,h).data;let l=w,t=h,r=-1,b=-1;
 // Ignore the faint transparent glow when measuring the material's bounds.
 // Source alpha is preserved verbatim; no pixels are recoloured or repainted.
 for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++)if(data[(yy*w+xx)*4+3]>=160){l=Math.min(l,xx);r=Math.max(r,xx);t=Math.min(t,yy);b=Math.max(b,yy);}
 if(r<l||b<t)throw Error('Empty Sugar furniture '+name);
 l=Math.max(0,l-3);t=Math.max(0,t-3);r=Math.min(w-1,r+3);b=Math.min(h-1,b+3);
 const out=document.createElement('canvas');out.width=r-l+1;out.height=b-t+1;
 out.getContext('2d').drawImage(image,x+l,y+t,out.width,out.height,0,0,out.width,out.height);
 sprites.set(name,out);sources.set(name,out.toDataURL('image/png'));rects.set(name,[x+l,y+t,out.width,out.height]);cropCount++;
}
const ready=Promise.all(Object.entries(FILES).map(([name,file])=>new Promise(resolve=>{
 const image=new Image();image.decoding='async';image.onload=()=>{images.set(name,image);resolve(image.naturalWidth>0&&image.naturalHeight>0);};
 image.onerror=()=>{errors.push('Missing '+ROOT+file);resolve(false);};image.src=ROOT+file+'?v=305';
}))).then(results=>{
 if(!results.every(Boolean))return false;
 try{
  ['jp','targets','announcement','gauge'].forEach(crop);
  const style=document.documentElement.style;
  for(const [name,url]of sources)style.setProperty('--sugar305-'+name,'url("'+url+'")');
  loaded=true;document.documentElement.classList.add('sugar-art-v305');
 }catch(error){errors.push(String(error?.message||error));}
 return loaded;
});
window.SugarArtV305=Object.freeze({version:305,ready,get loaded(){return loaded;},
 asset:name=>FILES[name]?ROOT+FILES[name]+'?v=305':null,
 sprite:name=>sprites.get(name)||images.get(name)||null,
 describe:()=>({version:305,loaded,files:Object.values(FILES).map(f=>ROOT+f),errors:errors.slice(),cropCount,sourceRects:Object.fromEntries(rects),spriteCacheCount:sprites.size,source:'generated-raster',numbers:'native'})});
})();

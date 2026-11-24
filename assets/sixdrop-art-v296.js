/* Six Drop's generated cabinet artwork. Decode/crop once before the existing
 * UI builds its images. New sugar-glass pieces keep native numbers, colour
 * identities and geometry; this module has no engine or game RNG access. */
(()=>{
'use strict';
if(window.SixDropArtV296)return;
const query=new URLSearchParams(location.search);
if(query.get('serverSettlementWorker')==='1'||query.get('downloadWorker')==='1')return;
if(window.SweetsLineup?.chosen&&!window.SweetsLineup.chosen.includes('candy'))return;
const ROOT='assets/sixdrop-art-v296/';
const FILES=Object.freeze({bottle:ROOT+'bottle.webp?v=296',payouts:ROOT+'payouts.webp?v=296',pieces:ROOT+'candy-pieces.webp?v=296'});
const names=['line','triangle','hexagon'];
const colors=['blue','aqua','green','lime','yellow','orange','red','pink','violet'];
const images=new Map(),sprites=new Map(),urls=new Map(),errors=[];
let loaded=false,cachedPixels=0;
function read(name,file){
 return new Promise(resolve=>{
  const im=new Image();im.decoding='async';
  im.onload=()=>{images.set(name,im);resolve(true);};
  im.onerror=()=>{errors.push('Missing '+file);resolve(false);};
  im.src=file;
 });
}
const ready=Promise.all(Object.entries(FILES).map(([name,file])=>read(name,file))).then(results=>{
 if(!results.every(Boolean))return false;
 try{
  const sheet=images.get('payouts'),width=sheet.naturalWidth,height=sheet.naturalHeight;
  for(let i=0;i<names.length;i++){
   const left=Math.round(i*width/3),right=Math.round((i+1)*width/3),sourceWidth=right-left;
   const canvas=document.createElement('canvas');canvas.width=384;canvas.height=Math.round(384*height/sourceWidth);
   const ctx=canvas.getContext('2d');if(!ctx)throw Error('Payout artwork canvas unavailable');
   ctx.drawImage(sheet,left,0,sourceWidth,height,0,0,canvas.width,canvas.height);
   const key='payout-'+names[i];sprites.set(key,canvas);urls.set(key,canvas.toDataURL('image/png'));
   cachedPixels+=canvas.width*canvas.height;
  }
  sprites.set('bottle',images.get('bottle'));urls.set('bottle',FILES.bottle);
  const pieces=images.get('pieces');
  for(let index=0;index<colors.length;index++){
   const col=index%3,row=Math.floor(index/3);
   const sx=Math.round(col*pieces.naturalWidth/3),ex=Math.round((col+1)*pieces.naturalWidth/3);
   const sy=Math.round(row*pieces.naturalHeight/3),ey=Math.round((row+1)*pieces.naturalHeight/3);
   const probe=document.createElement('canvas');probe.width=ex-sx;probe.height=ey-sy;
   const px=probe.getContext('2d',{willReadFrequently:true});
   px.drawImage(pieces,sx,sy,ex-sx,ey-sy,0,0,probe.width,probe.height);
   const rgba=px.getImageData(0,0,probe.width,probe.height).data;
   let left=probe.width,top=probe.height,right=-1,bottom=-1;
   // Remove only transparent packing space, once at load. A stable sprite
   // extent gives the actual candy nearly the full native cell diameter.
   for(let y=0;y<probe.height;y++)for(let x=0;x<probe.width;x++)if(rgba[(y*probe.width+x)*4+3]>48){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
   if(right<left||bottom<top)throw Error('Empty candy sprite '+colors[index]);
   left=Math.max(0,left-3);top=Math.max(0,top-3);right=Math.min(probe.width-1,right+3);bottom=Math.min(probe.height-1,bottom+3);
   const sw=right-left+1,sh=bottom-top+1,fit=124/Math.max(sw,sh),out=document.createElement('canvas');out.width=out.height=128;
   out.getContext('2d').drawImage(pieces,sx+left,sy+top,sw,sh,(128-sw*fit)/2,(128-sh*fit)/2,sw*fit,sh*fit);
   // Some native mini renderers check Image-style dimensions/readiness.
   out.complete=true;out.naturalWidth=out.width;out.naturalHeight=out.height;
   sprites.set(index,out);sprites.set('candy-'+colors[index],out);cachedPixels+=128*128;
  }
  loaded=true;document.documentElement.classList.add('sixdrop-art-v296');
  document.body?.classList.add('sixdrop-art-v296');
 }catch(error){errors.push(String(error?.message||error));}
 return loaded;
});
window.SixDropArtV296=Object.freeze({
 version:296,ready,get loaded(){return loaded;},
 asset:name=>loaded?urls.get(name)||null:null,
 sprite:name=>loaded?sprites.get(name)||null:null,
 source:name=>name==='bottle'?FILES.bottle:names.some(role=>name==='payout-'+role)?FILES.payouts:null,
 describe:()=>({version:296,loaded,files:{...FILES},errors:errors.slice(),
  cachedSprites:sprites.size,cachedPixels,payouts:names.slice(),
  candies:FILES.pieces,colors:colors.slice(),background:'native',geometry:'native',
  sheet:images.has('payouts')?{width:images.get('payouts').naturalWidth,height:images.get('payouts').naturalHeight,columns:3}:null})
});
})();

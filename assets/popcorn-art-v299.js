/* Popcorn Splash's generated cinema pieces and live payout furniture.
 * One cropped kernel source feeds the intact piece and every native burst.
 * Decode, alpha bounds and atlas fitting happen once, outside the game state. */
(()=>{
'use strict';
if(window.PopcornArtV299)return;
const query=new URLSearchParams(location.search);
if(query.get('serverSettlementWorker')==='1'||query.get('downloadWorker')==='1')return;
if(window.SweetsLineup?.chosen&&!window.SweetsLineup.chosen.includes('popcorn'))return;
const ROOT='assets/popcorn-art-v299/';
const FILES=Object.freeze({kernels:'kernel-pieces.webp',payout:'payout-cabinet.webp',furniture:'port-furniture.webp'});
const KERNELS=Object.freeze(['cream','yellow','red','purple','blue','rainbow']);
const FURNITURE=Object.freeze(['port','all','up','bonus','odds','row']);
const images=new Map(),sprites=new Map(),rects=new Map(),atlases=new Map(),errors=[];
const stats={atlas:0,source:0,frame:0,header:0,row:0,port:0};
let loaded=false,cachedPixels=0;
function canvas(width,height){const out=document.createElement('canvas');out.width=width;out.height=height;return out;}
function crop(source,name,index=0,columns=1,rows=1,rowCuts=null){
 const col=index%columns,row=Math.floor(index/columns);
 const x0=Math.round(col*source.naturalWidth/columns),x1=Math.round((col+1)*source.naturalWidth/columns);
 const y0=Math.round((rowCuts?rowCuts[row]:row/rows)*source.naturalHeight);
 const y1=Math.round((rowCuts?rowCuts[row+1]:(row+1)/rows)*source.naturalHeight);
 const probe=canvas(x1-x0,y1-y0),ctx=probe.getContext('2d',{willReadFrequently:true});
 if(!ctx)throw Error('Popcorn sprite canvas unavailable');
 ctx.drawImage(source,x0,y0,probe.width,probe.height,0,0,probe.width,probe.height);
 const {data}=ctx.getImageData(0,0,probe.width,probe.height);
 let left=probe.width,right=-1,top=probe.height,bottom=-1;
 for(let y=0;y<probe.height;y++)for(let x=0;x<probe.width;x++)if(data[(y*probe.width+x)*4+3]>=18){
  if(x<left)left=x;if(x>right)right=x;if(y<top)top=y;if(y>bottom)bottom=y;
 }
 if(right<left||bottom<top)throw Error('Empty Popcorn sprite '+name);
 left=Math.max(0,left-2);right=Math.min(probe.width-1,right+2);
 top=Math.max(0,top-2);bottom=Math.min(probe.height-1,bottom+2);
 const sourceRect=Object.freeze([x0+left,y0+top,right-left+1,bottom-top+1]);
 const out=canvas(sourceRect[2],sourceRect[3]);
 out.getContext('2d').drawImage(source,...sourceRect,0,0,out.width,out.height);
 sprites.set(name,out);rects.set(name,sourceRect);cachedPixels+=out.width*out.height;
}
function prepareAtlas(tile){
 const out=canvas(tile*6,tile),ctx=out.getContext('2d');ctx.imageSmoothingQuality='high';
 for(let power=0;power<6;power++){
  const source=sprites.get(KERNELS[power]);
  // Identical normalised fitting at 18/54/256 preserves the fuse, outline
  // and lobe coordinates when the native animation splits a kernel.
  const k=tile*.94/Math.max(source.width,source.height),w=source.width*k,h=source.height*k;
  ctx.drawImage(source,power*tile+(tile-w)/2,(tile-h)/2,w,h);
 }
 atlases.set(tile,out);cachedPixels+=out.width*out.height;
}
const ready=Promise.all(Object.entries(FILES).map(([name,file])=>new Promise(resolve=>{
 const image=new Image();image.decoding='async';
 image.onload=()=>{
  if(!(image.naturalWidth>0&&image.naturalHeight>0)){errors.push('Invalid '+file);resolve(false);return;}
  images.set(name,image);resolve(true);
 };
 image.onerror=()=>{errors.push('Missing '+ROOT+file);resolve(false);};
 image.src=ROOT+file+'?v=299';
}))).then(results=>{
 if(!results.every(Boolean))return false;
 try{
  KERNELS.forEach((name,index)=>crop(images.get('kernels'),name,index,3,2));
  // The actual top plaques are taller than the three slim lower headers.
  // Split their broad transparent gutter, retaining every popcorn ornament.
  FURNITURE.forEach((name,index)=>crop(images.get('furniture'),name,index,3,2,[0,.60,1]));
  crop(images.get('payout'),'cabinet');
  for(const tile of [18,54,256])prepareAtlas(tile);
  loaded=true;document.documentElement.classList.add('popcorn-art-v299');
  document.body?.classList.add('popcorn-art-v299');
 }catch(error){errors.push(String(error?.message||error));}
 return loaded;
});
function atlas(mini=false,highResolution=false){
 if(!loaded)return null;stats.atlas++;return atlases.get(highResolution?256:mini?18:54);
}
function source(){if(!loaded)return null;stats.source++;return atlases.get(256);}
function frame(ctx,x,y,w,h){
 if(!loaded||!ctx||!(w>0&&h>0))return false;
 const image=sprites.get('cabinet'),top=Math.round(image.height*.07),bottom=Math.round(image.height*.06);
 const k=w/image.width,edge=Math.min(1,h/Math.max(1,(top+bottom)*k));
 const a=top*k*edge,b=bottom*k*edge;
 ctx.drawImage(image,0,0,image.width,top,x,y,w,a);
 ctx.drawImage(image,0,top,image.width,image.height-top-bottom,x,y+a,w,Math.max(0,h-a-b));
 ctx.drawImage(image,0,image.height-bottom,image.width,bottom,x,y+h-b,w,b);
 stats.frame++;return true;
}
function header(ctx,role,x,y,w,h){
 if(!loaded||!ctx||!['bonus','odds'].includes(role)||!(w>0&&h>0))return false;
 ctx.drawImage(sprites.get(role),x,y,w,h);stats.header++;return true;
}
function row(ctx,x,y,w,h){
 if(!loaded||!ctx||!(w>0&&h>0))return false;
 const image=sprites.get('row'),a=Math.round(image.height*.52),b=Math.round(image.height*.90);
 const sx=Math.round(image.width*.10),sw=image.width-2*sx;
 // The live credit row has a fixed native height. Compress the decorative
 // crest and lower trim, leaving the generated ivory/ruby face for the
 // full-size native count and amount instead of painting over the gold rim.
 ctx.drawImage(image,sx,0,sw,a,x,y,w,h*.10);
 ctx.drawImage(image,sx,a,sw,b-a,x,y+h*.10,w,h*.80);
 ctx.drawImage(image,sx,b,sw,image.height-b,x,y+h*.90,w,h*.10);
 stats.row++;return true;
}
function port(ctx,{all=false,boost=false,half,high,lit=false}={}){
 if(!loaded||!ctx||!(half>0&&high>0))return false;
 const image=sprites.get(all?'all':boost?'up':'port');
 ctx.save();if(lit){ctx.shadowColor=boost?'#d8ffa2':'#fff0b5';ctx.shadowBlur=.055;}
 if(all||boost)ctx.drawImage(image,-.94,-.84,1.88,1.62);
 else{
  const a=Math.round(image.height*.43),b=Math.round(image.height*.87),h=high*2,w=half*2;
  // The small native fuse keeps its hitbox. Its generated crest takes the
  // upper22%; the blank teal number face occupies most of the fixed plaque.
  ctx.drawImage(image,0,0,image.width,a,-half,-high,w,h*.22);
  ctx.drawImage(image,0,a,image.width,b-a,-half,-high+h*.22,w,h*.68);
  ctx.drawImage(image,0,b,image.width,image.height-b,-half,-high+h*.90,w,h*.10);
 }
 ctx.restore();stats.port++;return true;
}
window.PopcornArtV299=Object.freeze({
 version:299,ready,get loaded(){return loaded;},atlas,source,frame,header,row,port,
 sprite:name=>loaded?sprites.get(name)||null:null,
 asset:name=>loaded&&FILES[name]?ROOT+FILES[name]+'?v=299':null,
 describe:()=>({version:299,loaded,files:Object.values(FILES).map(file=>ROOT+file),errors:errors.slice(),
  ...stats,sourceRects:Object.fromEntries([...rects].map(([key,value])=>[key,[...value]])),
  cachedPixels,atlasTiles:[...atlases.keys()],grades:[...KERNELS],
  geometry:'native',numbers:'native',burstSource:'same-normalised-kernel-atlas'})
});
})();

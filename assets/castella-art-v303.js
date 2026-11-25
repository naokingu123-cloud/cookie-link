/* Party Castella v303: dedicated copper griddle, castella and bakery instruments.
 * Source decoding, alpha registration and material preparation happen once.
 * Native board coordinates, passages, hit areas, flow and baking clocks own play. */
(()=>{
'use strict';
if(window.CastellaArtV303)return;
const query=new URLSearchParams(location.search);
if(query.get('serverSettlementWorker')==='1'||query.get('downloadWorker')==='1')return;
if(window.SweetsLineup?.chosen&&!window.SweetsLineup.chosen.includes('castella'))return;
const ROOT='assets/castella-art-v303/';
const FILES=Object.freeze({materials:'castella-materials.webp',griddle:'copper-griddle.webp',furniture:'bakery-furniture.webp',payout:'payout-cabinet.webp'});
const PIECES=Object.freeze(['empty','raw','baked','pour','fire','sugar']);
const FURNITURE=Object.freeze(['dispenser','ruby','pour-plaque','fire-plaque','feast','phase']);
const sheets=new Map(),sprites=new Map(),rects=new Map(),urls=new Map(),errors=[];
const stats={materials:0,griddles:0,instruments:0,markers:0,domMounts:0};
let loaded=false,cachedPixels=0,materials=null;
function canvas(w,h){const out=document.createElement('canvas');out.width=w;out.height=h;return out;}
function crop(source,name,x0=0,y0=0,x1=1,y1=1){
 const sx=Math.round(x0*source.naturalWidth),sy=Math.round(y0*source.naturalHeight);
 const sw=Math.round(x1*source.naturalWidth)-sx,sh=Math.round(y1*source.naturalHeight)-sy;
 const probe=canvas(sw,sh),ctx=probe.getContext('2d',{willReadFrequently:true});
 if(!ctx)throw Error('Castella sprite canvas unavailable');
 ctx.drawImage(source,sx,sy,sw,sh,0,0,sw,sh);
 const data=ctx.getImageData(0,0,sw,sh).data;
 let left=sw,top=sh,right=-1,bottom=-1;
 for(let y=0;y<sh;y++)for(let x=0;x<sw;x++)if(data[(y*sw+x)*4+3]>=18){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
 if(right<left||bottom<top)throw Error('Empty Castella sprite '+name);
 left=Math.max(0,left-1);top=Math.max(0,top-1);right=Math.min(sw-1,right+1);bottom=Math.min(sh-1,bottom+1);
 const rect=Object.freeze([sx+left,sy+top,right-left+1,bottom-top+1]),out=canvas(rect[2],rect[3]);
 out.getContext('2d').drawImage(source,...rect,0,0,out.width,out.height);
 sprites.set(name,out);rects.set(name,rect);cachedPixels+=out.width*out.height;
 return out;
}
function url(name){
 if(!loaded||!sprites.has(name))return null;
 if(!urls.has(name))urls.set(name,sprites.get(name).toDataURL('image/png'));
 return urls.get(name);
}
const ready=Promise.all(Object.entries(FILES).map(([name,file])=>new Promise(resolve=>{
 const image=new Image();image.decoding='async';image.onload=()=>{sheets.set(name,image);resolve(image.naturalWidth>0);};
 image.onerror=()=>{errors.push('Missing '+ROOT+file);resolve(false);};image.src=ROOT+file+'?v=303';
}))).then(results=>{
 if(!results.every(Boolean))return false;
 try{
  PIECES.forEach((name,i)=>crop(sheets.get('materials'),name,(i%3)/3,Math.floor(i/3)/2,(i%3+1)/3,(Math.floor(i/3)+1)/2));
  // The commissioned dispenser occupies a taller first row. Register its
  // actual transparent gutters, rather than slicing its nozzle at 1/3.
  const cuts=[0,.382,.668,1];
  FURNITURE.forEach((name,i)=>crop(sheets.get('furniture'),name,(i%2)/2,cuts[Math.floor(i/2)],(i%2+1)/2,cuts[Math.floor(i/2)+1]));
  crop(sheets.get('griddle'),'griddle');crop(sheets.get('payout'),'cabinet');
  materials=['empty','raw','baked'].map(name=>{
   const image=sprites.get(name),out=canvas(192,192),ctx=out.getContext('2d');
   // Equal circular target size preserves the native browning and filling
   // masks; generated metal rims remain part of each material at every size.
   ctx.drawImage(image,0,0,192,192);cachedPixels+=192*192;return out;
  });
  loaded=true;document.documentElement.classList.add('castella-art-v303');
 }catch(error){errors.push(String(error?.message||error));}
 return loaded;
});
function materialSet(){if(!loaded)return null;stats.materials++;return materials;}
function griddle(ctx,x,y,w,h){
 if(!loaded||!ctx||!(w>0&&h>0))return false;
 ctx.drawImage(sprites.get('griddle'),x,y,w,h);stats.griddles++;return true;
}
function power(ctx,x,y,r,kind){
 const image=loaded?sprites.get(kind==='odds'?'pour':kind):null;
 if(!image||!ctx||!(r>0))return false;
 ctx.drawImage(image,x-r,y-r,r*2,r*2);stats.markers++;return true;
}
function dispenser(ctx,x,y,w,h){
 if(!loaded||!ctx)return false;
 ctx.drawImage(sprites.get('dispenser'),x-w*.995,y-h*.985,w,h);stats.instruments++;return true;
}
function mount(root){
 if(!loaded||!root)return false;
 root.classList.add('pct-art-v303');root.dataset.artVersion='303';
 for(const [key,name]of Object.entries({phase:'phase',pour:'pour-plaque',fire:'fire-plaque',ruby:'ruby'}))root.style.setProperty('--pct-v303-'+key,'url("'+url(name)+'")');
 root.style.setProperty('--pct-v303-payout','url("'+url('cabinet')+'")');
 const feast=root.querySelector('.pct-sweep-art');if(feast)feast.src=url('feast');
 stats.domMounts++;return true;
}
window.CastellaArtV303=Object.freeze({version:303,ready,get loaded(){return loaded;},get epoch(){return loaded?303:0;},
 materials:materialSet,griddle,power,dispenser,mount,url,
 dispenserRatio:()=>{const s=sprites.get('dispenser');return s?s.height/s.width:1;},
 sprite:name=>loaded?sprites.get(name)||null:null,
 describe:()=>({version:303,loaded,files:Object.values(FILES).map(file=>ROOT+file),errors:errors.slice(),cachedPixels,...stats,
  sourceRects:Object.fromEntries([...rects].map(([name,r])=>[name,[...r]])),geometry:'native-61-and-legacy-37',numbers:'native',perFrameReadback:false})
});
})();

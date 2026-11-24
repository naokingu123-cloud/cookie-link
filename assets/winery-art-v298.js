/* Winery's generated crystal pieces. Decode and fit once before the native
 * hosts/lessons build their canvases. Real liquid, numbers and rules stay live. */
(()=>{
'use strict';
if(window.WineryArtV298)return;
const query=new URLSearchParams(location.search);
if(query.get('serverSettlementWorker')==='1'||query.get('downloadWorker')==='1')return;
if(window.SweetsLineup?.chosen&&!window.SweetsLineup.chosen.includes('winery'))return;
const ROOT='assets/winery-art-v298/';
const FILES=Object.freeze({pieces:'glass-and-tags.webp',payout:'payout-cabinet.webp',boost:'boost-cabinet.webp'});
const images=new Map(),sprites=new Map(),rects=new Map(),errors=[];
const stats={glass:0,plaque:0,lesson:0};
let loaded=false,cachedPixels=0;
function canvas(width,height){const out=document.createElement('canvas');out.width=width;out.height=height;return out;}
function cropCell(source,index){
 const x0=Math.round(index*source.naturalWidth/3),x1=Math.round((index+1)*source.naturalWidth/3);
 const probe=canvas(x1-x0,source.naturalHeight),ctx=probe.getContext('2d',{willReadFrequently:true});
 ctx.drawImage(source,x0,0,probe.width,probe.height,0,0,probe.width,probe.height);
 const {data}=ctx.getImageData(0,0,probe.width,probe.height);
 let left=probe.width,right=-1,top=probe.height,bottom=-1;
 for(let y=0;y<probe.height;y++)for(let x=0;x<probe.width;x++)if(data[(y*probe.width+x)*4+3]>32){
  left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
 }
 if(right<left||bottom<top)throw Error('Empty Winery sprite '+index);
 left=Math.max(0,left-2);right=Math.min(probe.width-1,right+2);top=Math.max(0,top-2);bottom=Math.min(probe.height-1,bottom+2);
 const sourceRect=[x0+left,top,right-left+1,bottom-top+1];
 const out=canvas(sourceRect[2],sourceRect[3]);
 out.getContext('2d').drawImage(source,...sourceRect,0,0,out.width,out.height);
 out.complete=true;out.naturalWidth=out.width;out.naturalHeight=out.height;
 return {image:out,rect:sourceRect};
}
const ready=Promise.all(Object.entries(FILES).map(([name,file])=>new Promise(resolve=>{
 const image=new Image();image.decoding='async';
 image.onload=()=>{images.set(name,image);resolve(true);};
 image.onerror=()=>{errors.push('Missing '+ROOT+file);resolve(false);};
 image.src=ROOT+file+'?v=298';
}))).then(results=>{
 if(!results.every(Boolean))return false;
 try{
  for(const [index,name]of ['glass','plaque','plaque-full'].entries()){
   const source=cropCell(images.get('pieces'),index);
   sprites.set(name,source.image);rects.set(name,source.rect);cachedPixels+=source.image.width*source.image.height;
  }
  // Render the whole crystal around the authoritative 70px liquid bowl.
  // This fitted canvas is cached once; no image reads occur during a frame.
  const cup=canvas(292,260),ctx=cup.getContext('2d'),glassSource=sprites.get('glass');
  const bowlEnd=Math.round(glassSource.height*.63);
  ctx.drawImage(glassSource,0,0,glassSource.width,bowlEnd,0,0,292,180);
  ctx.drawImage(glassSource,0,bowlEnd,glassSource.width,glassSource.height-bowlEnd,0,180,292,80);
  sprites.set('glass-fit',cup);cachedPixels+=292*260;
  loaded=true;document.documentElement.classList.add('winery-art-v298');
  document.body?.classList.add('winery-art-v298');
 }catch(error){errors.push(String(error?.message||error));}
 return loaded;
});
function glass(ctx,x,y,full=false){
 if(!loaded)return false;const source=sprites.get('glass-fit');if(!source)return false;
 ctx.save();
 // Keep the exact native liquid window clear. Generated crystal surrounds
 // it; a painted source reflection can never fake a filled cup or a flavor.
 ctx.beginPath();ctx.rect(x-74,y-12,148,147);
 ctx.moveTo(x-51,y+12);ctx.bezierCurveTo(x-49,y+37,x-28,y+68,x,y+77);
 ctx.bezierCurveTo(x+28,y+68,x+49,y+37,x+51,y+12);ctx.closePath();ctx.clip('evenodd');
 ctx.shadowColor=full?'#fff1b0':'#d8eaff';ctx.shadowBlur=full?8:2;
 ctx.drawImage(source,x-73,y-10,146,130);ctx.restore();stats.glass++;return true;
}
function plaque(ctx,x,y,full=false){
 if(!loaded)return false;const source=sprites.get(full?'plaque-full':'plaque');if(!source)return false;
 ctx.drawImage(source,x-42,y-22,84,44);stats.plaque++;return true;
}
function lessonGlass(ctx,x,y,full=false){
 if(!loaded)return false;const source=sprites.get('glass-fit');if(!source)return false;
 ctx.save();ctx.beginPath();ctx.rect(x-28,y-27,56,60);
 ctx.moveTo(x-21,y-19);ctx.lineTo(x+21,y-19);ctx.quadraticCurveTo(x+21,y+12,x,y+15);
 ctx.quadraticCurveTo(x-21,y+12,x-21,y-19);ctx.closePath();ctx.clip('evenodd');
 ctx.drawImage(source,x-28,y-26,56,58);ctx.restore();stats.lesson++;return true;
}
window.WineryArtV298=Object.freeze({
 version:298,ready,get loaded(){return loaded;},glass,plaque,lessonGlass,
 sprite:name=>loaded?sprites.get(name)||null:null,
 asset:name=>loaded&&FILES[name]?ROOT+FILES[name]+'?v=298':null,
 describe:()=>({version:298,loaded,files:Object.values(FILES).map(file=>ROOT+file),errors:errors.slice(),
  ...stats,sprites:[...sprites.keys()],sourceRects:Object.fromEntries(rects),cachedPixels,
  geometry:'native',liquid:'native',numbers:'native',background:'native'})
});
})();

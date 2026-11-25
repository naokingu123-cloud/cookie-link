/* Dedicated mochi, bamboo and tsukimi furniture. All source crops and DOM
 * furniture URLs are built once; native geometry and clocks remain owners. */
(()=>{
'use strict';
if(window.DangoArtV304)return;
const query=new URLSearchParams(location.search);
if(query.get('serverSettlementWorker')==='1'||query.get('downloadWorker')==='1')return;
if(window.SweetsLineup?.chosen&&!window.SweetsLineup.chosen.includes('dango'))return;
const ROOT='assets/dango-art-v304/';
const FILES=Object.freeze({mochi:'mochi-pieces.webp',furniture:'furniture-atlas.webp',payout:'payout-cabinet.webp',scene:'moon-garden.webp'});
const KINDS=Object.freeze(['white','green','pink','yellow','rainbow','cyan']);
const images=new Map(),sprites=new Map(),rects=new Map(),errors=[];
const stats={bitmap:0,mochi:0,stand:0,skewer:0,popup:0,cropsBuilt:0};
let loaded=false,cachedPixels=0,cyan=null;
function canvas(width,height){const c=document.createElement('canvas');c.width=width;c.height=height;return c;}
function crop(file,name,index,cols,rows,threshold=64){
 const image=images.get(file),x0=Math.round(index%cols*image.naturalWidth/cols),x1=Math.round((index%cols+1)*image.naturalWidth/cols);
 const y0=Math.round(Math.floor(index/cols)*image.naturalHeight/rows),y1=Math.round((Math.floor(index/cols)+1)*image.naturalHeight/rows);
 const probe=canvas(x1-x0,y1-y0),ctx=probe.getContext('2d',{willReadFrequently:true});
 if(!ctx)throw Error('Dango sprite canvas unavailable');
 ctx.drawImage(image,x0,y0,probe.width,probe.height,0,0,probe.width,probe.height);
 const data=ctx.getImageData(0,0,probe.width,probe.height).data;let left=probe.width,top=probe.height,right=-1,bottom=-1,visible=0,luma=0,blueMinusRed=0;
 for(let y=0;y<probe.height;y++)for(let x=0;x<probe.width;x++){
  const at=(y*probe.width+x)*4;if(data[at+3]<threshold)continue;
  left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
  if(name==='cyan'&&data[at+3]>=128){visible++;luma+=.2126*data[at]+.7152*data[at+1]+.0722*data[at+2];blueMinusRed+=data[at+2]-data[at];}
 }
 if(right<left||bottom<top)throw Error('Empty Dango sprite '+name);
 left=Math.max(0,left-2);right=Math.min(probe.width-1,right+2);top=Math.max(0,top-2);bottom=Math.min(probe.height-1,bottom+2);
 const box=Object.freeze([x0+left,y0+top,right-left+1,bottom-top+1]),out=canvas(box[2],box[3]);
 out.getContext('2d').drawImage(image,...box,0,0,out.width,out.height);sprites.set(name,out);rects.set(name,box);cachedPixels+=out.width*out.height;stats.cropsBuilt++;
 if(name==='cyan')cyan=Object.freeze({source:'dango-v304',baked:true,pixels:visible,cyanPixels:visible,meanLuminance:Math.round(luma/Math.max(1,visible)),meanBlueMinusRed:Math.round(blueMinusRed/Math.max(1,visible))});
 return out;
}
const ready=Promise.all(Object.entries(FILES).map(([name,file])=>new Promise(resolve=>{
 const image=new Image();image.decoding='async';image.onload=()=>{if(!image.naturalWidth||!image.naturalHeight){errors.push('Invalid '+file);resolve(false);return;}images.set(name,image);resolve(true);};
 image.onerror=()=>{errors.push('Missing '+ROOT+file);resolve(false);};image.src=ROOT+file+'?v=304';
}))).then(results=>{
 if(!results.every(Boolean))return false;
 try{
  KINDS.forEach((name,index)=>crop('mochi',name,index,3,2));
  ['stand','skewer','free','odds'].forEach((name,index)=>crop('furniture',name,index,2,2,24));
  const style=document.documentElement.style;
  for(const name of ['free','odds'])style.setProperty('--dango-v304-'+name,'url("'+sprites.get(name).toDataURL('image/png')+'")');
  loaded=true;document.documentElement.classList.add('dango-art-v304');
 }catch(error){errors.push(String(error?.message||error));}
 return loaded;
});
function bitmap(ctx,key,x,y,width,height){
 const source=loaded&&sprites.get(key);if(!source||!ctx||!(width>0&&height>0))return false;
 ctx.drawImage(source,x,y,width,height);stats.bitmap++;if(KINDS.includes(key))stats.mochi++;else if(key==='stand'||key==='skewer')stats[key]++;return true;
}
function popup(ctx,{x,y,width,height}={}){if(!bitmap(ctx,'odds',x,y,width,height))return false;stats.popup++;return true;}
window.DangoArtV304=Object.freeze({version:304,ready,bitmap,popup,get loaded(){return loaded;},get cyan(){return cyan;},
 describe:()=>({version:304,loaded,files:Object.values(FILES).map(file=>ROOT+file),errors:errors.slice(),crops:Object.fromEntries([...rects].map(([name,box])=>[name,[...box]])),cachedPixels,cyan:cyan?{...cyan}:null,...stats})});
})();

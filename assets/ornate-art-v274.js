/* Rich illustrated cabinet borders. Original game pieces, worlds, numbers,
 * coordinates and rules are owned by their existing renderers. */
(()=>{
'use strict';
if(window.SweetsOrnateArtV274)return;
const sheets=[
 {file:'assets/ornate-art-v274/board-frames-a.png',mode:'board',games:['cookie','choco','candy','gelato','winery','popcorn']},
 {file:'assets/ornate-art-v274/board-frames-b.png',mode:'board',games:['jelly','stick','castella','dango','sugar','bonus']},
 {file:'assets/ornate-art-v274/payout-frames.png',mode:'pay',games:['cookie','choco','candy','gelato','winery','jelly']}
];
const entries=new Map(),crops=new Map(),urls=new Map(),panels=new Map();
let drawCalls=0;
for(const sheet of sheets)sheet.games.forEach((game,index)=>entries.set(sheet.mode+'-'+game,{sheet,index}));
const api={version:'v274',loaded:false,ready:null,entries:Object.freeze([...entries.keys()]),frame,url,panelURL,stats};
window.SweetsOrnateArtV274=api;
const canonical=game=>game==='waffle'?'stick':game;
function canvas(w,h){const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w));c.height=Math.max(1,Math.round(h));return c;}
function crop(name){
 if(crops.has(name))return crops.get(name);
 const entry=entries.get(name);if(!api.loaded||!entry?.sheet.image)return null;
 const {sheet,index}=entry,img=sheet.image;
 const left=Math.round(index%3*img.naturalWidth/3),top=Math.round(Math.floor(index/3)*img.naturalHeight/2);
 const right=Math.round((index%3+1)*img.naturalWidth/3),bottom=Math.round((Math.floor(index/3)+1)*img.naturalHeight/2);
 const cell=canvas(right-left,bottom-top),ctx=cell.getContext('2d',{willReadFrequently:true});
 ctx.drawImage(img,left,top,cell.width,cell.height,0,0,cell.width,cell.height);
 // Only placement bounds are measured. Preserve every generated RGBA pixel:
 // no replacement background, color remapping or reconstructed ornaments.
 const pixels=ctx.getImageData(0,0,cell.width,cell.height).data;
 let l=cell.width,t=cell.height,r=-1,b=-1;
 for(let y=0;y<cell.height;y++)for(let x=0;x<cell.width;x++)if(pixels[(y*cell.width+x)*4+3]>32){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
 if(r<l)return null;
 l=Math.max(0,l-2);t=Math.max(0,t-2);r=Math.min(cell.width-1,r+2);b=Math.min(cell.height-1,b+2);
 const out=canvas(r-l+1,b-t+1);out.getContext('2d').drawImage(cell,l,t,out.width,out.height,0,0,out.width,out.height);
 crops.set(name,out);return out;
}
function slice(image){return Math.round(Math.min(image.width,image.height)*.28);}
function url(name){
 if(urls.has(name))return urls.get(name);
 const image=crop(name);if(!image)return '';
 const value=image.toDataURL('image/png');urls.set(name,value);return value;
}
function frame(ctx,game,x,y,w,h,thickness=20,mode='board'){
 const image=crop(mode+'-'+canonical(game));if(!ctx||!image||!(w>0&&h>0))return false;
 const cut=slice(image),edge=Math.max(.001,Math.min(thickness,w/2,h/2));
 const sx=[0,cut,image.width-cut,image.width],sy=[0,cut,image.height-cut,image.height];
 const dx=[x,x+edge,x+w-edge,x+w],dy=[y,y+edge,y+h-edge,y+h];
 for(let row=0;row<3;row++)for(let col=0;col<3;col++){
  if(row===1&&col===1)continue;
  const dw=dx[col+1]-dx[col],dh=dy[row+1]-dy[row];if(dw<=0||dh<=0)continue;
  ctx.drawImage(image,sx[col],sy[row],sx[col+1]-sx[col],sy[row+1]-sy[row],dx[col],dy[row],dw,dh);
 }
 drawCalls++;return true;
}
function panelURL(mode,game,w,h,thickness=20,fill=''){
 const key=[mode,game,w,h,thickness,fill].join('/');if(panels.has(key))return panels.get(key);
 if(!api.loaded)return '';
 const panel=canvas(w,h),ctx=panel.getContext('2d');
 if(fill){ctx.fillStyle=fill;ctx.fillRect(0,0,panel.width,panel.height);}
 if(!frame(ctx,game,0,0,panel.width,panel.height,thickness,mode))return '';
 const value=panel.toDataURL('image/png');panels.set(key,value);return value;
}
function stats(){return {version:api.version,loaded:api.loaded,frames:entries.size,files:sheets.map(s=>s.file),cached:crops.size,drawCalls};}
async function load(sheet){
 const image=new Image();image.decoding='async';
 await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error('Ornate artwork unavailable: '+sheet.file));image.src=sheet.file+'?v=274';});
 if(image.decode)await image.decode();sheet.image=image;
}
api.ready=Promise.all(sheets.map(load)).then(()=>{
 api.loaded=true;const root=document.documentElement;
 for(const name of entries.keys()){
  const image=crop(name);if(!image)throw new Error('Empty ornate frame: '+name);
  const [mode,game]=name.split('-');
  root.style.setProperty('--oa274-'+mode+'-'+game,'url("'+url(name)+'")');
  root.style.setProperty('--oa274-'+mode+'-slice-'+game,String(slice(image)));
 }
 root.classList.add('ornate-art-v274');root.dataset.ornateArt='v274';return true;
}).catch(error=>{api.loaded=false;console.warn(error);return false;});
})();

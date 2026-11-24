/* Jelly Bingo's generated crystal mould, continuous syrup and live furniture.
 * Every compartment samples one board-sized surface. Opening a partition
 * therefore exposes the same liquid rather than the edge of another tile. */
(()=>{
'use strict';
if(window.JellyArtV300)return;
const query=new URLSearchParams(location.search);
if(query.get('serverSettlementWorker')==='1'||query.get('downloadWorker')==='1')return;
if(window.SweetsLineup?.chosen&&!window.SweetsLineup.chosen.includes('jelly'))return;
const ROOT='assets/jelly-art-v300/';
const FILES=Object.freeze({glass:'glass-kit.webp',syrup:'syrup-surface.webp',cabinet:'payout-cabinet.webp',furniture:'furniture-atlas.webp',odds:'award-odds-up.webp'});
const PALETTE=Object.freeze({
 blue:['#85faff','#12accf','#1476ac','#204976'],
 red:['#ffb0af','#f6506b','#bf335a','#6f264a'],
 yellow:['#ffeda0','#ffc34e','#e6943d','#935128'],
 green:['#c0ffd2','#60de9e','#21a584','#246c69'],
 'blue+red':['#ecc4ff','#b477eb','#8151bc','#503477'],
 'blue+yellow':['#ddff9c','#99da55','#5ba63d','#3d7031'],
 'blue+green':['#b3fff5','#47d8cb','#199d9c','#17666f'],
 'red+yellow':['#ffdf9a','#ff9850','#e26632','#9a4325'],
 'red+green':['#f9c7ad','#ca866c','#a15e54','#713d40'],
 'yellow+green':['#f1ffac','#c4e654','#98b938','#637e2d'],
 'blue+red+yellow':['#f3c7d6','#be809a','#955d79','#693c58'],
 'blue+red+green':['#dbccf6','#9582bc','#6d6098','#4a4272'],
 'blue+yellow+green':['#c7f8ad','#80c97c','#4c9f69','#336b53'],
 'red+yellow+green':['#ffe1a1','#e5ac67','#bb813f','#855829'],
 'blue+red+yellow+green':['#ebd5c4','#b99788','#8c6e68','#60494c']
});
for(const colors of Object.values(PALETTE))Object.freeze(colors);
const RECIPES=Object.freeze(Object.keys(PALETTE));
const SURFACE_BLEND=.54;
const FURNITURE_BANDS=Object.freeze({
 phase:[[0,.38,.79,1],[0,.06,.94,1]],
 odds:[[0,.30,.55,.81,1],[0,.06,.52,.94,1]],
 row:[[0,.47,.90,1],[0,.08,.92,1]],
 all:[[0,.33,.49,.86,1],[0,.05,.43,.94,1]],
 sugar:[[0,.44,.85,1],[0,.08,.92,1]]
});
const images=new Map(),sprites=new Map(),rects=new Map(),sourceFiles=new Map(),surfaces=new Map(),errors=[];
const stats={surface:0,cell:0,floor:0,rib:0,rim:0,frame:0,furniture:0,oddsPopup:0,surfacesBuilt:0};
let loaded=false,cachedPixels=0,decodedPixels=0,floorImage=null,ribImage=null,lastOdds=null;
function canvas(w,h=w){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function crop(file,name,index=0,cols=1,rows=1,tight=true){
 const image=images.get(file),col=index%cols,row=Math.floor(index/cols);
 const x0=Math.round(col*image.naturalWidth/cols),x1=Math.round((col+1)*image.naturalWidth/cols);
 const y0=Math.round(row*image.naturalHeight/rows),y1=Math.round((row+1)*image.naturalHeight/rows);
 let left=0,top=0,right=x1-x0-1,bottom=y1-y0-1;
 if(tight){
  const probe=canvas(x1-x0,y1-y0),c=probe.getContext('2d',{willReadFrequently:true});
  if(!c)throw Error('Jelly sprite canvas unavailable');
  c.drawImage(image,x0,y0,probe.width,probe.height,0,0,probe.width,probe.height);
  const data=c.getImageData(0,0,probe.width,probe.height).data;
  left=probe.width;top=probe.height;right=bottom=-1;
  for(let y=0;y<probe.height;y++)for(let x=0;x<probe.width;x++)if(data[(y*probe.width+x)*4+3]>=18){
   left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
  }
  if(right<left||bottom<top)throw Error('Empty Jelly sprite '+name);
  left=Math.max(0,left-2);top=Math.max(0,top-2);
  right=Math.min(probe.width-1,right+2);bottom=Math.min(probe.height-1,bottom+2);
 }
 const box=Object.freeze([x0+left,y0+top,right-left+1,bottom-top+1]),out=canvas(box[2],box[3]);
 out.getContext('2d').drawImage(image,...box,0,0,out.width,out.height);
 sprites.set(name,out);rects.set(name,box);sourceFiles.set(name,ROOT+FILES[file]);cachedPixels+=out.width*out.height;
 return out;
}
function resized(source,w,h){
 const out=canvas(w,h),c=out.getContext('2d');c.imageSmoothingQuality='high';c.drawImage(source,0,0,w,h);cachedPixels+=w*h;return out;
}
const ready=Promise.all(Object.entries(FILES).map(([name,file])=>new Promise(resolve=>{
 const image=new Image();image.decoding='async';
 image.onload=()=>{
  if(!(image.naturalWidth>0&&image.naturalHeight>0)){errors.push('Invalid '+file);resolve(false);return;}
  images.set(name,image);decodedPixels+=image.naturalWidth*image.naturalHeight;resolve(true);
 };
 image.onerror=()=>{errors.push('Missing '+ROOT+file);resolve(false);};
 image.src=ROOT+file+'?v=300';
}))).then(results=>{
 if(!results.every(Boolean))return false;
 try{
  crop('glass','rim',0,2,2);crop('glass','floor',1,2,2);crop('glass','rib',2,2,2);
  crop('syrup','syrup',0,1,1,false);crop('cabinet','cabinet');
  ['phase','odds','row','all','sugar'].forEach((name,i)=>crop('furniture',name,i,3,2));
  crop('odds','odds-banner');
  floorImage=resized(sprites.get('floor'),500,500);ribImage=resized(sprites.get('rib'),208,32);
  loaded=true;document.documentElement.classList.add('jelly-art-v300');document.body?.classList.add('jelly-art-v300');
 }catch(error){errors.push(String(error?.message||error));}
 return loaded;
});
function surface(recipe,mini=false){
 if(!loaded||!Object.prototype.hasOwnProperty.call(PALETTE,recipe))return null;
 stats.surface++;
 const size=mini?128:500,key=size+'/'+recipe;
 if(surfaces.has(key))return surfaces.get(key);
 const out=canvas(size),c=out.getContext('2d'),p=PALETTE[recipe];
 const g=c.createLinearGradient(0,0,size*.32,size*1.02);
 for(const [at,color] of [[0,p[0]],[.2,p[1]],[.62,p[2]],[1,p[3]]])g.addColorStop(at,color);
 c.fillStyle=g;c.fillRect(0,0,size,size);
 // Generated refraction and bubbles own the material; the exact native
 // recipe owns its hue. This blend is cached, never a per-frame filter.
 c.globalCompositeOperation='luminosity';c.globalAlpha=SURFACE_BLEND;c.imageSmoothingQuality='high';
 c.drawImage(sprites.get('syrup'),0,0,size,size);
 c.globalAlpha=1;c.globalCompositeOperation='source-over';
 surfaces.set(key,out);cachedPixels+=size*size;stats.surfacesBuilt++;return out;
}
function cell(c,i,recipe,mini=false){
 if(!c||!Number.isInteger(i)||i<0||i>=25)return false;
 const image=surface(recipe,mini);if(!image)return false;
 const x=i%5*100,y=Math.floor(i/5)*100,k=image.width/500;
 const left=Math.max(0,x-.12),top=Math.max(0,y-.12),right=Math.min(500,x+100.12),bottom=Math.min(500,y+100.12);
 // Match the native .12px overlap so fractional board scaling cannot leave
 // a pale hairline where two connected compartments share the same syrup.
 c.drawImage(image,left*k,top*k,(right-left)*k,(bottom-top)*k,left,top,right-left,bottom-top);stats.cell++;return true;
}
function floor(){if(!loaded)return null;stats.floor++;return floorImage;}
function rib(){if(!loaded)return null;stats.rib++;return ribImage;}
function rim(c,x=-42,y=-42,w=584,h=584,t=42){
 if(!loaded||!c||!(w>0&&h>0))return false;
 const image=sprites.get('rim'),a=Math.round(Math.min(image.width,image.height)*.22);
 const sx=[0,a,image.width-a,image.width],sy=[0,a,image.height-a,image.height];
 const edge=Math.min(t,w/2,h/2),dx=[x,x+edge,x+w-edge,x+w],dy=[y,y+edge,y+h-edge,y+h];
 for(let row=0;row<3;row++)for(let col=0;col<3;col++){
  if(row===1&&col===1)continue;
  c.drawImage(image,sx[col],sy[row],sx[col+1]-sx[col],sy[row+1]-sy[row],dx[col],dy[row],dx[col+1]-dx[col],dy[row+1]-dy[row]);
 }
 stats.rim++;return true;
}
function frame(c,x,y,w,h){
 if(!loaded||!c||!(w>0&&h>0))return false;
 const image=sprites.get('cabinet'),a=Math.round(image.height*.14),b=Math.round(image.height*.975);
 // The generated title occupies fourteen percent of its source. The
 // unchanged native panel reserves ten percent before the phase guide.
 c.drawImage(image,0,0,image.width,a,x,y,w,h*.10);
 c.drawImage(image,0,a,image.width,b-a,x,y+h*.10,w,h*.875);
 c.drawImage(image,0,b,image.width,image.height-b,x,y+h*.975,w,h*.025);
 stats.frame++;return true;
}
function furniture(c,role,x,y,w,h){
 if(!loaded||!c||!['phase','odds','row','all','sugar'].includes(role)||!(w>0&&h>0))return false;
 const image=sprites.get(role);
 // Keep the actual blank face around the native labels. Decorative fruit
 // and the lower flower are compressed independently, not across the text.
 const bands=FURNITURE_BANDS[role];
 if(bands){
  const [src,dst]=bands;
  for(let i=0;i<src.length-1;i++){
   const a=Math.round(image.height*src[i]),b=Math.round(image.height*src[i+1]);
   c.drawImage(image,0,a,image.width,b-a,x,y+h*dst[i],w,h*(dst[i+1]-dst[i]));
  }
 }else c.drawImage(image,x,y,w,h);
 stats.furniture++;return true;
}
function oddsPopup(c,{state,turn,age,x=0,y=0,w,h,wide=w>h*2.6,still=false}={}){
 if(!loaded||!c||!turn?.oddsReason||!state||!(w>0&&h>0)||!(age>=0&&age<1600))return false;
 const image=sprites.get('odds-banner');
 if(wide)c.drawImage(image,x,y,w,h);
 else{
  furniture(c,'phase',x,y,w,h);
  const hh=Math.min(h*.30,w*image.height/image.width);
  // The lettering keeps its shallow aspect when the native layout uses
  // the compact sidebar popup; the live values occupy the area below it.
  c.drawImage(image,x,y,w,hh);
 }
 lastOdds={age,duration:1600,ball:turn.ball,oldMultiplier:turn.before.oddsMultiplier,newMultiplier:state.oddsMultiplier,
  delta:state.oddsMultiplier-turn.before.oddsMultiplier,beforeRecipe:turn.before.colors[turn.index],afterRecipe:state.colors[turn.index],
  source:ROOT+FILES.odds,wide:!!wide,still:!!still,win:false};
 stats.oddsPopup++;return true;
}
window.JellyArtV300=Object.freeze({
 version:300,ready,get loaded(){return loaded;},surface,cell,floor,rib,rim,frame,furniture,oddsPopup,
 sprite:name=>loaded?sprites.get(name)||null:null,
 asset:name=>loaded&&FILES[name]?ROOT+FILES[name]+'?v=300':null,
 describe:()=>({version:300,loaded,files:Object.values(FILES).map(file=>ROOT+file),errors:errors.slice(),...stats,
  sourceRects:Object.fromEntries([...rects].map(([name,box])=>[name,[...box]])),sourceFiles:Object.fromEntries(sourceFiles),
  recipes:[...RECIPES],surfaceCacheKeys:[...surfaces.keys()],surfaceCacheCount:surfaces.size,surfaceCacheLimit:30,
  surfaceSizes:{main:500,mini:128},surfaceBlend:{mode:'luminosity',alpha:SURFACE_BLEND},
  spriteCacheCount:sprites.size+Number(!!floorImage)+Number(!!ribImage),cachedPixels,decodedPixels,
  lastOdds:lastOdds?{...lastOdds}:null,geometry:'native-500-well-42-rim',liquid:'continuous-board-sampling',numbers:'native'})
});
})();

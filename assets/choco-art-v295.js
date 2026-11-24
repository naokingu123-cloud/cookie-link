/* Choco Canyon v295: generated patisserie materials and six real fruit rewards.
 * Read-only canvas helpers. Native renderers retain tile geometry, labels,
 * animation clocks, fruit values, engine state and RNG ownership.
 */
(()=>{
'use strict';
if(window.ChocoArtV295)return;
const VERSION=295,SIZE=96,SAMPLE=256,FRUIT_SIZE=160,EMBEDDED_LIMIT=128;
const FRUITS=Object.freeze(['apple','mandarin','lemon','blueberry','grape','melon']);
const CAKES=Object.freeze(['milk','strawberry','vanilla','dark']);
const FURNITURE=Object.freeze(['depth','fruit-table','award-win','total-win','bonus','bowl']);
const FILES=Object.freeze({
 cake:'assets/choco-art-v295/cake-materials.webp?v=295',
 fruit:'assets/choco-art-v295/fruit-rewards.webp?v=295',
 furniture:'assets/choco-art-v295/hud-furniture.webp?v=295'
});
const sheets={},materials=[],fruitSprites=new Map(),cakeSprites=new Map(),embeddedSprites=new Map(),furnitureSprites=new Map(),furnitureLayouts=new Map();
const origins=new WeakMap(),sourceRects={cake:[],fruit:[],furniture:[]};
const status={cake:false,fruit:false,furniture:false},failures=[];
const params=new URLSearchParams(location.search),chosen=window.SweetsLineup?.chosen;
const enabled=!params.has('serverSettlementWorker')&&!params.has('downloadWorker')&&(!chosen||chosen.includes('choco'));
let embeddedEvictions=0;
const smooth=v=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v);};
function canvas(width,height=width){
 const out=document.createElement('canvas');out.width=width;out.height=height;
 // The existing renderer accepts both native images and image-like canvases.
 out.complete=true;out.naturalWidth=width;out.naturalHeight=height;
 return out;
}
function remember(bitmap,kinds){
 origins.set(bitmap,Object.freeze([...new Set(kinds)]));
 if(bitmap.dataset){bitmap.dataset.artVersion=String(VERSION);bitmap.dataset.artGame='choco';}
 return bitmap;
}
function cellRect(image,index,columns,rows){
 // Proportional cells also handle the image generator's 1254 px cake sheet.
 const left=Math.round(index%columns*image.naturalWidth/columns),top=Math.round(Math.floor(index/columns)*image.naturalHeight/rows);
 const right=Math.round((index%columns+1)*image.naturalWidth/columns),bottom=Math.round((Math.floor(index/columns)+1)*image.naturalHeight/rows);
 return [left,top,right-left,bottom-top];
}
function alphaRect(image,cell){
 const [left,top,width,height]=cell,sample=canvas(width,height),ctx=sample.getContext('2d',{willReadFrequently:true});
 ctx.drawImage(image,left,top,width,height,0,0,width,height);
 const pixels=ctx.getImageData(0,0,width,height).data;
 let x0=width,y0=height,x1=-1,y1=-1;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(pixels[(y*width+x)*4+3]>10){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
 if(x1<0)return cell;
 const gutter=Math.max(2,Math.round(Math.min(width,height)*.008));
 x0=Math.max(0,x0-gutter);y0=Math.max(0,y0-gutter);x1=Math.min(width-1,x1+gutter);y1=Math.min(height-1,y1+gutter);
 return [left+x0,top+y0,x1-x0+1,y1-y0+1];
}
function crop(image,rect,width,height=width,fit=true){
 const out=canvas(width,height),ctx=out.getContext('2d'),[sx,sy,sw,sh]=rect;
 ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 const scale=fit?Math.min((width-4)/sw,(height-4)/sh):1,dw=fit?sw*scale:width,dh=fit?sh*scale:height;
 ctx.drawImage(image,sx,sy,sw,sh,(width-dw)/2,(height-dh)/2,dw,dh);
 return out;
}
function readMaterials(image){
 for(let color=0;color<4;color++){
  const rect=cellRect(image,color,2,2),bitmap=crop(image,rect,SAMPLE,SAMPLE,false),ctx=bitmap.getContext('2d',{willReadFrequently:true});
  sourceRects.cake.push(rect);materials.push({bitmap,pixels:ctx.getImageData(0,0,SAMPLE,SAMPLE).data});remember(bitmap,['cake']);
 }
}
function readFruit(image){
 for(let i=0;i<FRUITS.length;i++){
  const rect=alphaRect(image,cellRect(image,i,3,2));sourceRects.fruit.push(rect);
  fruitSprites.set(FRUITS[i],remember(crop(image,rect,FRUIT_SIZE),['fruit']));
 }
}
function readFurniture(image){
 // Unlike the strict material/fruit grids, the authored furniture silhouettes
 // cross the sheet's middle line. These inspected regions include each full
 // crest and foot without sampling a neighbouring cabinet.
 const regions=[[5,75,505,480],[545,0,430,610],[1024,200,512,260],[0,650,512,310],[512,660,512,300],[1024,640,512,370]];
 const extras=[['fruit-table-body',[570,149,400,437]],['award-win-body',[1027,289,504,144]],['total-win-body',[6,778,500,160]]];
 const content={depth:[[94,258,332,68],[94,336,332,67],[92,411,336,76]],'award-win':[[1077,312,402,73]],'total-win':[[58,808,395,76]],bonus:[[670,777,275,90]],bowl:[[1100,708,368,70]]};
 for(const [name,r]of [...FURNITURE.map((name,i)=>[name,regions[i]]),...extras]){
  const region=[Math.round(r[0]*image.naturalWidth/1536),Math.round(r[1]*image.naturalHeight/1024),Math.round(r[2]*image.naturalWidth/1536),Math.round(r[3]*image.naturalHeight/1024)];
  const rect=alphaRect(image,region);sourceRects.furniture.push(rect);
  const scale=Math.min(1,512/Math.max(rect[2],rect[3])),width=Math.max(1,Math.round(rect[2]*scale)),height=Math.max(1,Math.round(rect[3]*scale));
  furnitureSprites.set(name,remember(crop(image,rect,width,height,false),['furniture']));
  const box=value=>Object.freeze({x:(value[0]*image.naturalWidth/1536-rect[0])/rect[2],y:(value[1]*image.naturalHeight/1024-rect[1])/rect[3],width:value[2]*image.naturalWidth/1536/rect[2],height:value[3]*image.naturalHeight/1024/rect[3]});
  const base=name.replace(/-body$/,'');
  const layout={bays:Object.freeze((content[base]||[]).map(box))};
  if(base==='fruit-table')layout.rows=Object.freeze([195,255,315,375,435,495].map(cy=>Object.freeze({fruit:box([624,cy-25,53,50]),text:box([684,cy-17,230,34])})));
  furnitureLayouts.set(name,Object.freeze(layout));
 }
}
function load(kind,read){
 if(!enabled)return Promise.resolve(false);
 return new Promise(resolve=>{
  const image=new Image();
  image.onload=()=>{
   try{
    if(!image.naturalWidth||!image.naturalHeight)throw Error('Empty image');
    sheets[kind]=image;read(image);status[kind]=true;
    document.dispatchEvent(new CustomEvent('choco-art-ready-v295',{detail:{kind}}));resolve(true);
   }catch(error){failures.push(kind+': '+String(error?.message||error));resolve(false);}
  };
  image.onerror=()=>{failures.push(kind+': image unavailable');resolve(false);};image.src=FILES[kind];
 });
}
function canonicalMask(value){
 const mask=Number(value)&255;let result=mask&15;
 for(const [a,b,d]of [[8,1,16],[2,1,32],[2,4,64],[8,4,128]])if((mask&a)&&(mask&b)&&(mask&d))result|=d;
 return result;
}
function fruitKey(value){
 const key=typeof value==='object'&&value?value.fruit:value;
 return typeof key==='number'?FRUITS[key]||null:FRUITS.includes(key)?key:null;
}
function fruit(key){return fruitSprites.get(fruitKey(key))||null;}
function cakeSprite(color,rawMask=0){
 if(!Number.isInteger(color)||color<0||color>3||!status.cake)return null;
 const mask=canonicalMask(rawMask),key=color+'/'+mask;
 if(cakeSprites.has(key))return cakeSprites.get(key);
 const out=canvas(SIZE),ctx=out.getContext('2d'),data=ctx.createImageData(SIZE,SIZE),pixels=data.data,source=materials[color].pixels;
 const read=(u,v,k)=>source[(Math.min(SAMPLE-1,Math.max(0,Math.round(v*(SAMPLE-1))))*SAMPLE+Math.min(SAMPLE-1,Math.max(0,Math.round(u*(SAMPLE-1)))))*4+k];
 // A joined cell shows the sponge body. Only exposed upper edges keep the
 // sculpted frosting crown. Neighbours share exactly the same edge profile;
 // no tile border, outline or per-cell shine is painted through a cake mass.
 const bodyTop=.235,bodyBottom=.975,seam=[.54,.54,.55,.55][color];
 for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
  const u=x/(SIZE-1),v=y/(SIZE-1),index=(y*SIZE+x)*4;
  const sourceX=.025+.95*u,sourceY=Math.min(mask&4?bodyBottom:.985,mask&1?bodyTop+(bodyBottom-bodyTop)*v:.015+.97*v);
  const topJoin=mask&1?1-smooth(y/16):0,bottomJoin=mask&4?1-smooth((SIZE-1-y)/16):0;
  const leftJoin=mask&8?(1-topJoin*Number(!(mask&16)))*(1-bottomJoin*Number(!(mask&128))):0;
  const rightJoin=mask&2?(1-topJoin*Number(!(mask&32)))*(1-bottomJoin*Number(!(mask&64))):0;
  const joinX=Math.max(leftJoin*(1-smooth(x/13)),rightJoin*(1-smooth((SIZE-1-x)/13))),joinY=Math.max(topJoin,bottomJoin);
  for(let channel=0;channel<3;channel++){
   let value=read(sourceX,sourceY,channel);
   value=value*(1-joinX)+read(.24,sourceY,channel)*joinX;
   const seamY=seam+.025*Math.sin(v*Math.PI*2),body=read(sourceX,seamY,channel),sideBody=read(.24,seamY,channel);
   value=value*(1-joinY)+(body*(1-joinX)+sideBody*joinX)*joinY;
   pixels[index+channel]=value;
  }
  // Native 96 px eight-neighbour outer and concave corner silhouettes.
  let alpha=255;
  for(const [hb,vb,diagonal,cx,cy]of [[8,1,16,0,0],[2,1,32,95,0],[8,4,128,0,95],[2,4,64,95,95]]){
   const dx=Math.abs(x-cx),dy=Math.abs(y-cy);
   if(!(mask&hb)&&!(mask&vb)&&dx<6&&dy<6)alpha=Math.min(alpha,Math.max(0,Math.min(255,(6-Math.hypot(6-dx,6-dy))*255)));
   if((mask&hb)&&(mask&vb)&&!(mask&diagonal)&&dx<4&&dy<4)alpha=Math.min(alpha,Math.max(0,Math.min(255,(Math.hypot(dx,dy)-3)*255)));
  }
  pixels[index+3]=alpha;
 }
 ctx.putImageData(data,0,0);remember(out,['cake']);cakeSprites.set(key,out);return out;
}
function embeddedSprite(key,color=0,rawMask=0){
 const name=fruitKey(key),image=fruit(name),cake=cakeSprite(color,rawMask);
 if(!name||!image||!cake)return null;
 const cacheKey=name+'/'+color+'/'+canonicalMask(rawMask);
 if(embeddedSprites.has(cacheKey)){const out=embeddedSprites.get(cacheKey);embeddedSprites.delete(cacheKey);embeddedSprites.set(cacheKey,out);return out;}
 const out=canvas(SIZE),ctx=out.getContext('2d');
 // Actual fruit sits in a cut-away pocket. It has no medallion or ore halo.
 // A copy of the same underlying cake occludes the lower fruit contour.
 ctx.save();ctx.shadowColor='#37130999';ctx.shadowBlur=3;ctx.shadowOffsetY=2;
 ctx.drawImage(image,8,4,80,80);ctx.restore();
 ctx.save();ctx.beginPath();ctx.moveTo(8,75);ctx.lineTo(20,70);ctx.lineTo(33,73);ctx.lineTo(46,70);ctx.lineTo(59,75);ctx.lineTo(72,72);ctx.lineTo(88,77);ctx.lineTo(88,96);ctx.lineTo(8,96);ctx.closePath();ctx.clip();ctx.drawImage(cake,0,0);ctx.restore();
 // Tiny real cream/crumb patches soften the cut edge; all material is sampled
 // from the generated cake sheet, rather than drawing a synthetic icon rim.
 const cream=materials[2].bitmap,sponge=materials[color].bitmap;
 ctx.save();ctx.beginPath();ctx.ellipse(22,71,8,2.8,-.12,0,Math.PI*2);ctx.ellipse(68,73,6,2.2,.2,0,Math.PI*2);ctx.clip();
 ctx.drawImage(cream,26,77,190,26,12,67,66,9);ctx.restore();
 for(const [x,y,size]of [[16,76,3.5],[77,78,3],[36,76,2.5]]){
  ctx.save();ctx.beginPath();ctx.ellipse(x,y,size,size*.65,.3,0,Math.PI*2);ctx.clip();ctx.drawImage(sponge,75,57,48,30,x-size,y-size*.65,size*2,size*1.3);ctx.restore();
 }
 ctx.globalCompositeOperation='destination-in';ctx.drawImage(cake,0,0);ctx.globalCompositeOperation='source-over';
 remember(out,['cake','fruit']);embeddedSprites.set(cacheKey,out);
 if(embeddedSprites.size>EMBEDDED_LIMIT){embeddedSprites.delete(embeddedSprites.keys().next().value);embeddedEvictions++;}
 return out;
}
function paintFruit(ctx,key,cx,cy,size){
 const image=fruit(key);if(!image||!(size>0))return false;
 ctx.drawImage(image,cx-size/2,cy-size/2,size,size);return true;
}
function paintEmbedded(ctx,key,x,y,width,height,options={}){
 const image=embeddedSprite(key,options.color??0,options.mask??0);if(!image||!(width>0&&height>0))return false;
 ctx.drawImage(image,x,y,width,height);return true;
}
function furniture(name){return furnitureSprites.get(name)||null;}
function paintFurniture(ctx,name,x,y,width,height,options={}){
 const image=furniture(name);if(!image||!(width>0&&height>0))return false;
 if(!options.slice){ctx.drawImage(image,x,y,width,height);return true;}
 // Optional nine-slice for narrow numeric drawers. Values are fractional
 // source insets [left,top,right,bottom]; typography remains native/live.
 const [left,top,right,bottom]=options.slice,sw=image.width,sh=image.height;
 const sx=[0,left*sw,(1-right)*sw,sw],sy=[0,top*sh,(1-bottom)*sh,sh];
 const edge=Math.min(options.edge??12,width/3,height/3),dx=[x,x+edge,x+width-edge,x+width],dy=[y,y+edge,y+height-edge,y+height];
 for(let row=0;row<3;row++)for(let col=0;col<3;col++)ctx.drawImage(image,sx[col],sy[row],sx[col+1]-sx[col],sy[row+1]-sy[row],dx[col],dy[row],dx[col+1]-dx[col],dy[row+1]-dy[row]);
 return true;
}
const cakeReady=load('cake',readMaterials),fruitReady=load('fruit',readFruit),furnitureReady=load('furniture',readFurniture);
const ready=Promise.all([cakeReady,fruitReady]).then(values=>values.every(Boolean));
window.ChocoArtV295=Object.freeze({
 version:VERSION,ready,furnitureReady,enabled,fruitNames:FRUITS,cakeNames:CAKES,
 get loaded(){return status.cake&&status.fruit;},
 cakeSprite,canonicalMask,fruit,paintFruit,embeddedSprite,paintEmbedded,furniture,paintFurniture,
 furnitureLayout:name=>furnitureLayouts.get(name)||null,
 sourcesOf:bitmap=>(origins.get(bitmap)||[]).map(kind=>FILES[kind].split('?')[0]),
 sourceImagesOf:bitmap=>(origins.get(bitmap)||[]).map(kind=>sheets[kind]).filter(Boolean),
 describe:()=>({
  version:VERSION,enabled,loaded:status.cake&&status.fruit,status:{...status},failures:failures.slice(),
  files:Object.fromEntries(Object.entries(FILES).map(([kind,file])=>[kind,file.split('?')[0]])),
  fruitNames:FRUITS.slice(),cakeNames:CAKES.slice(),furnitureNames:[...furnitureSprites.keys()],
  sourceRects:Object.fromEntries(Object.entries(sourceRects).map(([kind,rects])=>[kind,rects.map(rect=>rect.slice())])),
  cache:{cakes:cakeSprites.size,fruits:fruitSprites.size,embedded:embeddedSprites.size,embeddedLimit:EMBEDDED_LIMIT,embeddedEvictions,furniture:furnitureSprites.size},
  geometry:'native-96px-eight-neighbour-autotiles',numbers:'native',state:'unchanged',randomness:'none'
 })
});
})();

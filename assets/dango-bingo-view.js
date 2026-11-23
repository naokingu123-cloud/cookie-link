/* ダンゴデビンゴ: generated mochi on a tsukimi stand, colored luminous skewers. */
(()=>{
'use strict';
const R=window.DangoBingoRules,TAU=Math.PI*2,clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
const LINE_COLORS=Object.freeze({2:'#269eff',3:'#4ee3f5',4:'#42e57c',5:'#ffe34b',6:'#ff4667',7:'#bf6bff',9:'#bf6bff'});
const isCurrent=state=>Number(state?.rulesRevision??R.REVISION)>=268;
const isPlusFree=state=>Number(state?.rulesRevision??R.REVISION)>=285;
const isModern=state=>state?Number(state.rulesRevision)>=262||state.cells?.length===28:Number(R.REVISION)>=262;
const cellsFor=state=>R.geometryFor?.(state)?.cells||state?.cells||R.cells;
const linesFor=state=>R.linesFor?.(state)||R.geometryFor?.(state)?.lines||R.lines;
const lineColor=(length,state)=>!isCurrent(state)&&length===2?'#ffac63':!isCurrent(state)&&length===3?'#269eff':!isModern(state)&&length===7?'#ff4667':LINE_COLORS[length];
const PAY_LAYOUT=Object.freeze({label:1.03,column:.8,header:.27,row:.46,oddsWidth:1.55,oddsHeight:.46,oddsGap:.10,anchor:.08});
const REACH_STYLE=Object.freeze({alpha:.64,pulse:.055,glow:.12,ringWidth:.055,labelSize:.235,labelStroke:.07});
const CURRENT_PAY_LAYOUT=Object.freeze({label:1.77,column:.82,header:.32,row:.60,oddsWidth:3.3,oddsHeight:.54,oddsGap:.07,anchor:.08});
const highestRoleCell=(length,count,state)=>typeof R.isHighestRole==='function'?R.isHighestRole(length,count,state):count>=(isModern(state)?3:({3:4,4:3,5:2,7:1,9:1}[length]??Infinity));
const tierInk=['#21ddd5','#ff3c66','#bc58ff','#ffe383'];
const PAYOUT_ART='assets/dango-art-v270/payout-table.png';
const assetFiles={white:'dango-art-v252/dango-white.webp',green:'dango-art-v253/dango-green.webp',pink:'dango-art-v253/dango-pink.webp',yellow:'dango-art-v253/dango-yellow.webp',rainbow:'dango-art-v253/dango-rainbow.webp',skewer:'dango-art-v252/bamboo-skewer.webp',stand:'dango-art-v253/tsukimi-stand.webp'};
const art={},assetListeners=new Set(),pendingMinis=new Map();
// Cyan is a separate, once-baked mochi bitmap; do not tint a green mochi during paint.
const cyanCache={source:null,canvas:null,pixels:0,cyanPixels:0,meanBlueMinusRed:0,meanLuminance:0};
const usage={main:0,mini:0,lesson:0,skewers:0,cells:0,stands:0},last={main:null,mini:null,lesson:null};
let assetsNotifyQueued=false;
const allAssetsReady=()=>Object.keys(art).length===Object.keys(assetFiles).length&&Object.values(art).every(asset=>asset.loaded);
function spriteBounds(image,key){
 const width=image.naturalWidth,height=image.naturalHeight;
 try{
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
  const pixels=ctx.getImageData(0,0,width,height).data,columns=new Uint32Array(width),rows=new Uint32Array(height);let left=width,top=height,right=-1,bottom=-1;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const alpha=pixels[(y*width+x)*4+3];
   if(alpha>24){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
   if(alpha>128){columns[x]++;rows[y]++;}
  }
  if(!['skewer','stand'].includes(key)){
   const coreRun=counts=>{
    let maximum=0;for(const count of counts)maximum=Math.max(maximum,count);
    const minimum=Math.max(2,Math.ceil(maximum*.05));let start=-1,best=null;
    for(let i=0;i<=counts.length;i++){
     if(i<counts.length&&counts[i]>=minimum){if(start<0)start=i;}
     else if(start>=0){if(!best||i-start>best[1]-best[0])best=[start,i];start=-1;}
    }
    return best;
   };
   const x=coreRun(columns),y=coreRun(rows);if(x&&y)return [x[0],y[0],x[1]-x[0],y[1]-y[0]];
  }
  if(right>=left&&bottom>=top)return [left,top,right-left+1,bottom-top+1];
 }catch{}
 return [0,0,width,height];
}
function describeAssets(){
 return {revision:253,presentationRevision:285,ready:allAssetsReady(),failed:Object.values(art).filter(asset=>asset.failed).map(asset=>asset.key),
  cartoon:window.SweetsCartoonBoardsC?.describe()||null,illustrated:window.SweetsIllustratedBoardsCV275?.describe()||null,
  images:Object.values(art).map(({key,url,loaded,failed,image,crop})=>({key,url,loaded,failed,width:image.naturalWidth||0,height:image.naturalHeight||0,crop:crop.slice()})),
  usage:{...usage},last:{...last},lineColors:{...LINE_COLORS},
  cyanDango:{ready:!!cyanCache.canvas,source:cyanCache.source,baked:!!cyanCache.canvas,pixels:cyanCache.pixels,cyanPixels:cyanCache.cyanPixels,meanBlueMinusRed:cyanCache.meanBlueMinusRed,meanLuminance:cyanCache.meanLuminance}};
}
function notifyAssets(){
 if(assetsNotifyQueued)return;assetsNotifyQueued=true;
 Promise.resolve().then(()=>{
  assetsNotifyQueued=false;
  for(const listener of assetListeners)listener();
  for(const [ctx,frame]of pendingMinis)paint(ctx,frame.state,frame.options,true);
  if(Object.values(art).every(asset=>asset.loaded||asset.failed))pendingMinis.clear();
 });
}
const assetsReady=Promise.all(Object.entries(assetFiles).map(([key,file])=>new Promise(resolve=>{
 const image=new Image(),asset=art[key]={key,url:'assets/'+file+'?v=253',image,loaded:false,failed:false,crop:[0,0,1,1]};
 image.decoding='async';image.onload=()=>{asset.crop=spriteBounds(image,key);asset.loaded=true;resolve(true);notifyAssets();};
 image.onerror=()=>{asset.failed=true;resolve(false);notifyAssets();console.warn('[Dango art] Could not load '+key);};
 image.src=asset.url;
}))).then(results=>results.every(Boolean));
function onAssetsChanged(listener){assetListeners.add(listener);return ()=>assetListeners.delete(listener);}
function bitmap(c,key,x,y,width,height){
 if(key==='cyan')return cyanBitmap(c,x,y,width,height);
 if(window.SweetsIllustratedBoardsCV275?.dangoBitmap(c,key,x,y,width,height))return true;
 if(window.SweetsCartoonBoardsC?.dangoBitmap(c,key,x,y,width,height))return true;
 const asset=art[key];if(!asset?.loaded||!(width>0&&height>0))return false;
 c.drawImage(asset.image,...asset.crop,x,y,width,height);return true;
}
function cyanBitmap(c,x,y,width,height){
 if(!(width>0&&height>0))return false;
 const source=window.SweetsIllustratedBoardsCV275?.loaded?'illustrated-v275':window.SweetsCartoonBoardsC?.describe?.().ready?'cartoon':'fallback-v253';
 if(cyanCache.source!==source)cyanCache.canvas=null;
 if(!cyanCache.canvas){
  const size=256,sprite=document.createElement('canvas');sprite.width=sprite.height=size;
  const context=sprite.getContext('2d',{willReadFrequently:true});
  if(!bitmap(context,'green',0,0,size,size))return false;
  const image=context.getImageData(0,0,size,size),pixels=image.data;
  let visible=0,converted=0,blueMinusRed=0,luma=0;
  for(let i=0;i<pixels.length;i+=4){
   const alpha=pixels[i+3];if(alpha<8)continue;
   visible++;
   const red=pixels[i],green=pixels[i+1],blue=pixels[i+2];
   // Nearly-white icy blue +FREE mochi: lower saturation than the prior aqua,\n    // with color baked once into a cached transparent bitmap.
   // Preserve the texture's light/dark gradient and alpha at pastel saturation.
   const shade=Math.min(1,Math.max(0,(255-(red*.26+green*.55+blue*.19))/190));
   pixels[i]=Math.round(252-12*shade);
   pixels[i+1]=Math.round(255-7*shade);
   pixels[i+2]=Math.round(255-1*shade);
   blueMinusRed+=pixels[i+2]-pixels[i];
   luma+=.2126*pixels[i]+.7152*pixels[i+1]+.0722*pixels[i+2];
   converted++;
  }
  context.putImageData(image,0,0);
  cyanCache.source=source;cyanCache.canvas=sprite;cyanCache.pixels=visible;
  cyanCache.cyanPixels=converted;
  cyanCache.meanBlueMinusRed=Math.round(blueMinusRed/Math.max(1,converted));
  cyanCache.meanLuminance=Math.round(luma/Math.max(1,converted));
 }
 c.drawImage(cyanCache.canvas,x,y,width,height);return true;
}
function legacyGeometry(width,height,{layout='main',state=null}={}){
 const main=layout==='main',unit=Math.min(width/(main?9.85:9.7),height/(main?6.8:6.15)),cx=main?Math.min(width*.55,width-unit*4.72):width/2,top=height-unit*(main?6.22:5.65);
 return {layout:main?'main':'compact',unit,radius:unit/2,width,height,cx,top,
  centers:cellsFor(state).map(c=>({id:c.id,x:cx+c.x*unit,y:top+c.row*unit})),
  stand:{x:cx-unit*4.72,y:top+unit*(main?4.27:4.18),width:unit*9.44,height:unit*(main?1.75:1.25)}};
}
// Fit the real ragged silhouette, rather than its rectangular bounding box,
// into the space beside the piled mochi. The same logical geometry drives
// both the canvas and FREE hit targets, including scaled arcade cabinets.
function legacyPayoutLayout(width,height,state){
 const g=legacyGeometry(width,height,{state}),p=PAY_LAYOUT,anchor=g.unit*p.anchor,clearance=g.unit*.59;
 const free={x:width-g.unit*2.37,y:g.unit*.12,width:g.unit*2.25,height:g.unit*1.77};
 const rectsAt=scale=>{
  const u=g.unit*scale,rects=[{kind:'header',x:anchor+p.label*u,y:anchor,width:p.column*4*u,height:p.header*u}];
  for(const [i,count]of [4,4,3,1,1].entries())rects.push({kind:'row',length:[3,4,5,7,9][i],x:anchor,y:anchor+(p.header+i*p.row)*u,width:(p.label+count*p.column)*u,height:p.row*u});
  rects.push({kind:'odds',x:anchor,y:anchor+(p.header+p.row*5+p.oddsGap)*u,width:p.oddsWidth*u,height:p.oddsHeight*u});return rects;
 };
 const distance=(rect,point)=>Math.hypot(point.x-Math.max(rect.x,Math.min(rect.x+rect.width,point.x)),point.y-Math.max(rect.y,Math.min(rect.y+rect.height,point.y)));
 const fits=scale=>rectsAt(scale).every(rect=>
  rect.x+rect.width<=width-anchor&&rect.y+rect.height<=height-anchor&&
  !(rect.x<free.x+free.width&&rect.x+rect.width>free.x&&rect.y<free.y+free.height&&rect.y+rect.height>free.y)&&
  g.centers.every(point=>distance(rect,point)>=clearance));
 let lo=0,hi=Math.max(0,Math.min((width-anchor*2)/(g.unit*(p.label+p.column*4)),(height-anchor*2)/(g.unit*(p.header+p.row*5+p.oddsGap+p.oddsHeight))));
 for(let i=0;i<22;i++){const mid=(lo+hi)/2;if(fits(mid))lo=mid;else hi=mid;}
 const scale=Math.floor(lo*1000)/1000,unit=g.unit*scale,rects=rectsAt(scale);
 return {scale,unit,anchor,width:(p.label+p.column*4)*unit,height:(p.header+p.row*5+p.oddsGap+p.oddsHeight)*unit,clearance,rects,minClearance:Math.min(...rects.flatMap(rect=>g.centers.map(point=>distance(rect,point))))};
}
function baseGeometry(width,height,{layout='main',state=null}={}){
 if(!isModern(state))return legacyGeometry(width,height,{layout,state});
 const main=layout==='main',portrait=main&&width/height<1.45;
 const tableReserve=portrait?Math.min(height*(isCurrent(state)?.39:.30),width*(isCurrent(state)?.56:.40)):0;
 const unit=Math.max(.01,Math.min(width/(main?(portrait?7.7:10.9):7.65),(height-tableReserve)/(main?7.25:6.9)));
 const cx=main&&!portrait?Math.min(width*.64,width-unit*3.9):width/2,top=tableReserve+(height-tableReserve-unit*6.85)/2+unit*.5;
 const source=cellsFor(state),centers=source.map(cell=>{
  const row=cell.row??Math.floor((Math.sqrt(8*cell.id+1)-1)/2),column=cell.col??cell.column??cell.id-row*(row+1)/2;
  return {id:cell.id,x:cx+(column-row/2)*unit,y:top+row*Math.sqrt(3)/2*unit};
 });
 const freeUnit=Math.max(40,unit),free={unit:freeUnit,x:width-freeUnit*2.27,y:tableReserve+freeUnit*.10,width:freeUnit*2.15,height:freeUnit*(isCurrent(state)?1.72:2.4)};
 return {layout:main?'main':'compact',modern:true,portrait,unit,radius:unit/2,width,height,cx,top,tableReserve,free,centers,
  stand:{x:cx-unit*3.64,y:top+unit*5.39,width:unit*7.28,height:unit*1.08}};
}
function basePayoutLayout(width,height,state=null){
 if(!isModern(state))return legacyPayoutLayout(width,height,state);
 const g=baseGeometry(width,height,{state}),p=isCurrent(state)?CURRENT_PAY_LAYOUT:PAY_LAYOUT,tableWidth=p.label+p.column*3,anchor=g.unit*.08,rows=[...new Set((R.payRowsBaseFor?.(state)||R.payRows).map(row=>row.length))],rowCount=rows.length,totalHeight=p.header+p.row*rowCount+p.oddsGap+p.oddsHeight;
 const rectsAt=unit=>{
  const width=g.portrait?g.width-anchor*2:unit*tableWidth,rects=[{kind:'header',x:anchor,y:anchor,width,height:p.header*unit}];
  for(let i=0;i<rowCount;i++)rects.push({kind:'row',length:rows[i],x:anchor,y:anchor+(p.header+i*p.row)*unit,width,height:p.row*unit});
  rects.push({kind:'odds',x:anchor,y:anchor+(p.header+p.row*rowCount+p.oddsGap)*unit,width:p.oddsWidth*unit,height:p.oddsHeight*unit});return rects;
 };
 const distance=(rect,point)=>Math.hypot(point.x-Math.max(rect.x,Math.min(rect.x+rect.width,point.x)),point.y-Math.max(rect.y,Math.min(rect.y+rect.height,point.y)));
 let unit=Math.max(.01,(g.tableReserve-anchor*2)/totalHeight);
 if(!g.portrait){
  let lo=.01,hi=Math.max(.01,Math.min((width-anchor*2)/tableWidth,(height-anchor*2)/totalHeight));
  const fits=value=>rectsAt(value).every(rect=>!(rect.x<g.free.x+g.free.width&&rect.x+rect.width>g.free.x&&rect.y<g.free.y+g.free.height&&rect.y+rect.height>g.free.y)&&g.centers.every(point=>distance(rect,point)>=g.unit*.58));
  for(let i=0;i<22;i++){const mid=(lo+hi)/2;if(fits(mid))lo=mid;else hi=mid;}unit=lo;
 }
 const rects=rectsAt(unit);
 return {scale:unit/g.unit,unit,anchor,width:g.portrait?width-anchor*2:unit*tableWidth,height:totalHeight*unit,clearance:g.unit*.58,rects,minClearance:Math.min(...rects.flatMap(rect=>g.centers.map(point=>distance(rect,point))))};
}
function showFreeRail(state){return !isPlusFree(state)&&isCurrent(state)&&Number(state?.draws?.length||0)<5&&state?.phase!=='placing'&&!state?.freeCommitted;}
const plusFreeLayoutCache=new Map();
function plusFreeLayout(width,height,state){
 // The 285 table has no yellow FREE rail. Fit the triangular silhouette beside
 // the complete table, including the optional Odds row and the tallest FREE
 // interaction card, so neither thinking time nor a multiplier moves the board.
 const key=width+'x'+height,cached=plusFreeLayoutCache.get(key);if(cached)return cached;
 const scale=Math.max(1,Math.min(width/430,height/366)),anchor=3*scale,unit=35*scale;
 const matrixWidth=210*scale,frameInset=9.45*scale,labelWidth=66*scale,columnWidth=41.7*scale;
 const rowHeight=24*scale,headerHeight=14*scale,matrixHeight=headerHeight+rowHeight*6+frameInset*2;
 const oddsHeight=25*scale,oddsGap=2.45*scale,freeUnit=40*scale;
 const free={unit:freeUnit,x:width-anchor-freeUnit*2.15,y:anchor,width:freeUnit*2.15,height:freeUnit*2.7};
 const reserved=[{x:anchor,y:anchor,width:matrixWidth,height:matrixHeight},
  {x:anchor,y:anchor+matrixHeight+oddsGap,width:Math.min(matrixWidth,Math.max(114,unit*3.3)),height:oddsHeight},free];
 const offsets=cellsFor(state).map(cell=>{
  const row=cell.row??Math.floor((Math.sqrt(8*cell.id+1)-1)/2),column=cell.col??cell.column??cell.id-row*(row+1)/2;
  return {id:cell.id,x:column-row/2,y:row*Math.sqrt(3)/2};
 });
 const placementAt=u=>{
  const top=height-anchor-u*6.47,clearance=u*.58,lower=anchor+u*3.64,upper=width-anchor-u*3.64;
  if(lower>upper||top-u*.5<anchor)return null;
  // Each circle/rectangle collision excludes an exact interval of possible
  // horizontal board centers. Their union leaves every legal center position.
  const blocked=[];
  for(const point of offsets)for(const rect of reserved){
   const y=top+point.y*u,dy=Math.max(rect.y-y,0,y-rect.y-rect.height);
   if(dy<clearance){const pad=Math.sqrt(clearance*clearance-dy*dy)+.01;blocked.push([rect.x-pad-point.x*u,rect.x+rect.width+pad-point.x*u]);}
  }
  blocked.sort((a,b)=>a[0]-b[0]);const allowed=[];let cursor=lower;
  for(const [left,right]of blocked){if(right<cursor||left>upper)continue;if(left>cursor)allowed.push([cursor,Math.min(left,upper)]);cursor=Math.max(cursor,right);if(cursor>upper)break;}
  if(cursor<=upper)allowed.push([cursor,upper]);if(!allowed.length)return null;
  const preferred=width*.66,cx=allowed.map(([left,right])=>Math.max(left,Math.min(right,preferred))).sort((a,b)=>Math.abs(a-preferred)-Math.abs(b-preferred))[0];
  return {cx,top};
 };
 let lo=.01,hi=Math.max(.01,Math.min((width-anchor*2)/7.28,(height-anchor*2)/6.97));
 for(let i=0;i<26;i++){const mid=(lo+hi)/2;if(placementAt(mid))lo=mid;else hi=mid;}
 const boardUnit=lo,placement=placementAt(boardUnit)||{cx:width/2,top:height-anchor-boardUnit*6.47};
 const centers=offsets.map(point=>({id:point.id,x:placement.cx+point.x*boardUnit,y:placement.top+point.y*boardUnit}));
 const geometry={layout:'main',modern:true,portrait:width/height<1.45,unit:boardUnit,radius:boardUnit/2,width,height,cx:placement.cx,top:placement.top,tableReserve:0,free,centers,
  stand:{x:placement.cx-boardUnit*3.64,y:placement.top+boardUnit*5.39,width:boardUnit*7.28,height:boardUnit*1.08}};
 const metrics={unit,anchor,referenceWidth:matrixWidth,matrixWidth,matrixHeight,frameInset,labelWidth,columnWidth,rowHeight,headerHeight,oddsHeight,oddsGap,
  railWidth:0,railGap:0,railColumns:0,iconSize:0,railVisible:false,height:matrixHeight};
 const result={geometry,metrics};if(plusFreeLayoutCache.size>=24)plusFreeLayoutCache.delete(plusFreeLayoutCache.keys().next().value);plusFreeLayoutCache.set(key,result);return result;
}
function compactMetrics(width,height,state){
 if(isPlusFree(state)){const m=plusFreeLayout(width,height,state).metrics;return {...m,height:m.matrixHeight+((state?.oddsMultiplier||1)>=2?m.oddsGap+m.oddsHeight:0)};}
 // Keep the existing type heights whenever the full framed matrix fits. Reserve
 // the Odds row in landscape before it appears, so activating Odds never clips
 // the panel or moves either the board or its FREE interaction targets.
 const reference=basePayoutLayout(width,height,state),base=baseGeometry(width,height,{state}),anchor=base.unit*.08;
 const compactRows=base.portrait?height<420:height<300,shallowLandscape=!base.portrait&&compactRows,railColumns=compactRows&&!shallowLandscape?7:4,railVisible=showFreeRail(state);
 const metricsAt=u=>{
  // Short landscape rows still fit two rows of compact FREE icons. A seven-wide
  // rail would squeeze GET! out of the payout cells; reclaim it once hidden.
  const icon=shallowLandscape?12:compactRows?Math.max(12,Math.min(16,u*.55)):Math.max(16,Math.min(22,u*.17)),railWidth=icon*railColumns+railColumns-1,gap=Math.max(3,u*.035);
  const labelWidth=Math.max(66,u*1.24),nominal=labelWidth+3*Math.max(46,u*.72),matrixWidth=Math.min(nominal,shallowLandscape&&!railVisible?reference.width*.82:reference.width*.98-railWidth-gap);
  const rowHeight=Math.max(compactRows?20:34,u*.60,Math.max(14,u*.40)+u*.17+1),headerHeight=Math.max(14,u*.32),oddsHeight=Math.max(25,u*.54),oddsGap=u*.07;
  const frameInset=Math.max(6,Math.min(14,matrixWidth*.045)),matrixHeight=headerHeight+rowHeight*6+frameInset*2;
  return {unit:u,anchor,referenceWidth:reference.width,matrixWidth,matrixHeight,frameInset,labelWidth,columnWidth:(matrixWidth-frameInset*2-labelWidth)/3,
   railWidth,railGap:gap,railColumns,iconSize:icon,rowHeight,headerHeight,oddsHeight,oddsGap,
   height:matrixHeight+((state?.oddsMultiplier||1)>=2?oddsGap+oddsHeight:0),railVisible};
 };
 let metrics=metricsAt(reference.unit);
 if(!base.portrait&&metrics.matrixHeight+metrics.oddsGap+metrics.oddsHeight>height-anchor*2){
  let lo=.01,hi=reference.unit;
  for(let i=0;i<24;i++){
   const mid=(lo+hi)/2,candidate=metricsAt(mid);
   if(candidate.matrixHeight+candidate.oddsGap+candidate.oddsHeight<=height-anchor*2)lo=mid;else hi=mid;
  }
  metrics=metricsAt(lo);
 }
 return metrics;
}
function geometry(width,height,{layout='main',state=null}={}){
 if(isPlusFree(state)&&layout==='main')return plusFreeLayout(width,height,state).geometry;
 const base=baseGeometry(width,height,{layout,state});
 if(!isCurrent(state)||layout!=='main'||!base.portrait)return base;
 // Odds uses the empty space left of the apex, so gaining it never moves the board or FREE targets.
 const metrics=compactMetrics(width,height,state),tableReserve=Math.max(base.tableReserve,metrics.matrixHeight+metrics.anchor*2);
 const unit=Math.max(.01,Math.min(width/7.7,(height-tableReserve)/7.25)),cx=width/2,top=tableReserve+(height-tableReserve-unit*6.85)/2+unit*.5;
 const centers=cellsFor(state).map(cell=>{
  const row=cell.row??Math.floor((Math.sqrt(8*cell.id+1)-1)/2),column=cell.col??cell.column??cell.id-row*(row+1)/2;
  return {id:cell.id,x:cx+(column-row/2)*unit,y:top+row*Math.sqrt(3)/2*unit};
 });
 const freeUnit=Math.max(40,unit),free={unit:freeUnit,x:width-freeUnit*2.27,y:tableReserve+freeUnit*.10,width:freeUnit*2.15,height:freeUnit*1.72};
 return {...base,unit,radius:unit/2,cx,top,tableReserve,centers,free,stand:{x:cx-unit*3.64,y:top+unit*5.39,width:unit*7.28,height:unit*1.08}};
}
function payoutLayout(width,height,state=null){
 if(!isCurrent(state))return basePayoutLayout(width,height,state);
 const m=compactMetrics(width,height,state),g=geometry(width,height,{state}),anchor=m.anchor;
 const rects=[{kind:'header',x:anchor,y:anchor,width:m.matrixWidth,height:m.headerHeight+m.frameInset}];
 for(let i=0;i<6;i++){
  const y=anchor+m.frameInset+m.headerHeight+i*m.rowHeight;
  rects.push({kind:'row',length:i+2,x:anchor,y,width:m.matrixWidth,height:m.rowHeight+(i===5?m.frameInset:0)});
  if(m.railVisible)rects.push({kind:'free-icons',length:i+2,x:anchor+m.matrixWidth+m.railGap,y,width:m.railWidth,height:m.rowHeight});
 }
 if((state?.oddsMultiplier||1)>=2)rects.push({kind:'odds',x:anchor,y:anchor+m.matrixHeight+m.oddsGap,width:Math.min(m.matrixWidth,Math.max(114,m.unit*3.3)),height:m.oddsHeight});
 const distance=(rect,point)=>Math.hypot(point.x-Math.max(rect.x,Math.min(rect.x+rect.width,point.x)),point.y-Math.max(rect.y,Math.min(rect.y+rect.height,point.y)));
 return {...m,scale:m.unit/g.unit,width:m.matrixWidth,envelopeWidth:m.matrixWidth+(m.railVisible?m.railGap+m.railWidth:0),
  rects,clearance:g.unit*.58,minClearance:Math.min(...rects.flatMap(rect=>g.centers.map(point=>distance(rect,point))))};
}
function disc(c,x,y,r,fill){c.beginPath();c.arc(x,y,r,0,TAU);c.fillStyle=fill;c.fill();}
function roundBox(c,x,y,w,h,r,fill){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();}
function segment(c,x1,y1,x2,y2,width,color){c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.lineWidth=width;c.lineCap='round';c.strokeStyle=color;c.stroke();}
function text(c,value,x,y,size,color,weight=900){c.font=weight+' '+size+'px ElixirNumbers,"Yu Gothic",Meiryo,system-ui,sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillStyle=color;c.fillText(String(value),x,y);}
function number(c,value,x,y,size){
 if(typeof drawElixirNumber==='function')drawElixirNumber(c,value,x,y,size,'#4d3028','#fffceb',size*.072);
 else{c.font='900 '+size+'px ElixirNumbers,system-ui,sans-serif';c.textAlign='center';c.textBaseline='middle';c.lineWidth=size*.11;c.strokeStyle='#fffceb';c.strokeText(String(value),x,y);c.fillStyle='#4d3028';c.fillText(String(value),x,y);}
}
function star(c,x,y,r,ink){
 c.beginPath();for(let k=0;k<10;k++){const a=-Math.PI/2+k*Math.PI/5,rr=r*(k%2?.44:1);k?c.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr):c.moveTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);}c.closePath();c.fillStyle=ink;c.fill();
}
function ambientTime(options){return options.reducedMotion||options.paused?0:Number(options.time)||0;}
function dangoKind(cell,oddsActivated){return oddsActivated?'rainbow':cell.manualFree?'yellow':cell.initialFree&&!(cell.number>0)?'green':cell.hit?'pink':cell.initialFree?'green':'white';}
function dangoBody(c,cell,p,r,options){
 const kind=dangoKind(cell,options.oddsActivated),still=options.staticDango||options.reducedMotion||options.paused;
 const cycle=still?0:(1-Math.cos(ambientTime(options)/2700*TAU+cell.id*.41))/2;
 // The main silhouette never shrinks below the cell diameter. A tiny overlap
 // keeps the piled sweets touching throughout their slow, soft compression.
 const sx=1.012+cycle*.025,sy=1.022-cycle*.02;
 const drawn=bitmap(c,kind,p.x-r*sx,p.y-r*sy,r*2*sx,r*2*sy);if(drawn)usage.cells++;
 // The +FREE cell itself is an aqua dango, not a green dango with a live tint.
 // Fade that fully baked bitmap back to the original white/pink/yellow dango.
 const cyan=cell.trigger&&options.plusFree?clamp(options.plusFreeOpacity):0;
 let cyanDrawn=false;
 if(cyan>0){c.save();c.globalAlpha*=cyan;cyanDrawn=bitmap(c,'cyan',p.x-r*sx,p.y-r*sy,r*2*sx,r*2*sy);c.restore();}
 return drawn||cyanDrawn?(cyan>.5&&cyanDrawn?'cyan':kind):null;
}
function dangoLabels(c,cell,p,r,o){
 const label=cell.initialFree||cell.manualFree;
 if(cell.initialFree&&!(cell.number>0)){
  c.save();c.font='1000 '+r*.60+'px ElixirNumbers,system-ui,sans-serif';c.textAlign='center';c.textBaseline='middle';c.lineWidth=Math.max(.8,r*.065);c.strokeStyle='#fffad8';c.strokeText('FREE',p.x,p.y);c.fillStyle=o.oddsActivated?'#693b93':'#315d16';c.fillText('FREE',p.x,p.y);c.restore();
  // Green initial FREE already counts as a HIT. Its small label stays above FREE.
  if(o.plusFree&&cell.hit){
   c.save();c.font='1000 '+r*.28+'px SweetReachRounded,"Yu Gothic",Meiryo,system-ui,sans-serif';c.textAlign='center';c.textBaseline='middle';c.lineWidth=Math.max(.7,r*.06);c.lineJoin='round';
   c.strokeStyle='#fff9df';c.strokeText('HIT!',p.x,p.y-r*.83);c.fillStyle='#246732';c.fillText('HIT!',p.x,p.y-r*.83);c.restore();
  }
  return;
 }
 const numberY=o.plusFree?(label?-.10:cell.trigger&&o.plusFreeOpacity>.05?.12:cell.hit?.08:0):cell.hit?(label?-.06:.13):label?-.10:0,numberSize=o.plusFree?(cell.number>=10?.98:1.12):cell.hit?(label?(cell.number>=10?.88:1):(cell.number>=10?1:1.16)):(cell.number>=10?1.07:1.21);
 if(o.plusFree){
  const cyan=cell.trigger?clamp(o.plusFreeOpacity):0;
  if(cyan>0){
   c.save();c.globalAlpha*=cyan;c.font='1000 '+r*.37+'px SweetReachRounded,"Yu Gothic",Meiryo,system-ui,sans-serif';c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';c.lineWidth=Math.max(.8,r*.07);c.strokeStyle='#edffff';c.strokeText('+FREE',p.x,p.y-r*.70);c.fillStyle='#08637c';c.fillText('+FREE',p.x,p.y-r*.70);c.restore();
  }
  if(cell.hit){
   // Keep a fixed edge position so the fade never moves HIT across a numeral.
   // A numbered FREE reserves its lower edge for FREE and uses the upper edge.
   const lower=cell.trigger&&!label,size=r*.30,numberPixels=r*numberSize;
   c.save();c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';
   c.font='900 '+numberPixels+'px ElixirNumbers,system-ui,sans-serif';const digit=c.measureText(String(cell.number));
   const numberStroke=numberPixels*(typeof drawElixirNumber==='function'?.036:.055);
   // Small fonts are hinted to whole pixels. Reserve their actual glyph bounds,
   // plus the native vector numeral and both outlines, rather than only a ratio.
   const numberTop=p.y+r*numberY-Math.max(digit.actualBoundingBoxAscent+numberStroke,numberPixels*.46);
   const numberBottom=p.y+r*(lower?.12:numberY)+Math.max(digit.actualBoundingBoxDescent+numberStroke,numberPixels*.46);
   c.font='1000 '+size+'px SweetReachRounded,"Yu Gothic",Meiryo,system-ui,sans-serif';const caption=c.measureText('HIT!');
   c.lineWidth=Math.max(.7,r*.065);const gap=Math.max(.8,r*.04),rim=c.lineWidth/2;
   const y=lower?Math.max(p.y+r*.76,numberBottom+gap+caption.actualBoundingBoxAscent+rim):Math.min(p.y-r*.88,numberTop-gap-caption.actualBoundingBoxDescent-rim);
   c.strokeStyle='#fff9df';c.strokeText('HIT!',p.x,y);c.fillStyle='#a91650';c.fillText('HIT!',p.x,y);c.restore();
  }
 }else if(cell.hit&&!o.staticDango){
  const y=p.y-r*(label?.73:.66),size=r*(label?.34:.40);
  c.save();c.font='1000 '+size+'px SweetReachRounded,"Yu Gothic",Meiryo,system-ui,sans-serif';c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';
  c.lineWidth=Math.max(.7,r*.08);c.strokeStyle='#fff9df';c.strokeText('HIT!',p.x,y);c.fillStyle='#ad245b';c.fillText('HIT!',p.x,y);c.restore();
 }
 if(label){
  const by=p.y+r*.69,fill=cell.initialFree?'#315d16':o.oddsActivated?'#693b93':'#774600';
  c.save();c.shadowColor='#fff6c9';c.shadowBlur=r*.09;
  roundBox(c,p.x-r*.76,by-r*.245,r*1.52,r*.49,r*.13,fill);
  c.lineWidth=Math.max(.6,r*.04);c.strokeStyle=cell.initialFree?'#eaff91':'#fff49f';c.stroke();
  text(c,'FREE',p.x,by+r*.015,r*.40,'#fffde1');c.restore();
 }
 number(c,cell.number,p.x,p.y+r*numberY,r*numberSize);
 if(cell.hit&&o.staticDango&&!o.plusFree){
  // Draw HIT after the numeral at the same center, deliberately covering it.
  const y=p.y+r*numberY,size=r*.76;
  c.save();c.font='1000 '+size+'px SweetReachRounded,"Yu Gothic",Meiryo,system-ui,sans-serif';c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';
  c.lineWidth=Math.max(1.4,r*.16);c.strokeStyle='#fff9df';c.strokeText('HIT!',p.x,y);c.fillStyle='#a91650';c.fillText('HIT!',p.x,y);c.restore();
 }
 if(cell.id===o.lastCell&&Number.isFinite(o.age)&&o.age<500){
  const t=clamp(o.age/500);c.save();c.globalAlpha=1-t;c.beginPath();c.arc(p.x,p.y,r*(1.05+.6*t),0,TAU);c.lineWidth=r*.08;c.strokeStyle='#fff5ad';c.stroke();c.restore();
 }
}
function hitOutline(c,p,r,id,time,still){
 // The HIT rim flashes in two luminous rings, independently of the pink fill.
 // Eleven tiny stars cover the WHOLE mochi instead of just following its edge.
 const beat=still?.77:(.5+.5*Math.sin(time*.0061+id*.57));
 c.save();c.lineCap='round';
 c.globalAlpha=.44+beat*.54;c.shadowColor='#ffefaa';c.shadowBlur=r*(.21+beat*.24);
 c.lineWidth=Math.max(1.5,r*(.09+beat*.04));c.strokeStyle='#ffdb77';
 c.beginPath();c.arc(p.x,p.y,r*1.013,0,TAU);c.stroke();
 c.globalAlpha=.53+.43*beat;c.shadowColor='#ffffff';c.shadowBlur=r*(.10+beat*.12);
 c.lineWidth=Math.max(1,r*.052);c.strokeStyle='#fffdf1';
 c.beginPath();c.arc(p.x,p.y,r*1.030,0,TAU);c.stroke();
 c.shadowBlur=0;
 for(let k=0;k<11;k++){
  const phase=(time/(1450+(k%4)*220)+id*.137+k*.17)%1;
  const distance=r*(.12+.75*Math.sqrt((k+.4)/11));
  const angle=k*2.39996+id*.59+(still?0:phase*.55);
  const power=still?.66:Math.sin(Math.PI*phase)**2;
  c.globalAlpha=(.25+.55*power)*(k%3===0?.9:.66);
  c.shadowColor='#ffffff';c.shadowBlur=r*.12;
  star(c,p.x+Math.cos(angle)*distance,p.y+Math.sin(angle)*distance,r*(.030+.041*power),'#ffffff');
 }
 c.restore();
}
function skewerEnds(line,g){
 const first=g.centers[line.cells[0]],last=g.centers[line.cells.at(-1)],dx=last.x-first.x,dy=last.y-first.y,d=Math.hypot(dx,dy),ux=dx/d,uy=dy/d,ext=g.unit*.62;
 return {a:{x:first.x-ux*ext,y:first.y-uy*ext},b:{x:last.x+ux*ext,y:last.y+uy*ext},dx,dy,d,length:d+ext*2};
}
function skewer(c,line,g,progress){
 const z=skewerEnds(line,g),thickness=g.unit*.16;
 c.save();c.translate(z.a.x,z.a.y);c.rotate(Math.atan2(z.dy,z.dx));
 c.beginPath();c.rect(0,-thickness*2,z.length,thickness*4);c.clip();
 const drawn=bitmap(c,'skewer',-z.length*(1-progress),-thickness/2,z.length,thickness);
 c.restore();if(drawn)usage.skewers++;
 return {...z,drawn,progress};
}
function luminousSkewer(c,line,g,z,time,still,state){
 const ink=lineColor(line.length,state),u=g.unit,b={x:z.a.x+(z.b.x-z.a.x)*z.progress,y:z.a.y+(z.b.y-z.a.y)*z.progress};
 c.save();c.shadowColor=ink;c.shadowBlur=u*.15;
 segment(c,z.a.x,z.a.y,b.x,b.y,u*.175,'#161627b8');
 segment(c,z.a.x,z.a.y,b.x,b.y,u*.112,ink);
 c.shadowBlur=0;segment(c,z.a.x,z.a.y,b.x,b.y,u*.025,'#fffce0b8');
 // A bright streak travels along the colored skewer, above the mochi bitmap
 // and below the number/FREE lettering. The line remains legible at rest too.
 const t=still?.48:((time/2100+line.id*.137)%1),tail=Math.max(0,t-.15),head=Math.min(z.progress,t);
 if(head>tail){
  const p=a=>({x:z.a.x+(z.b.x-z.a.x)*a,y:z.a.y+(z.b.y-z.a.y)*a}),a=p(tail),b=p(head);
  const gradient=c.createLinearGradient(a.x,a.y,b.x,b.y);gradient.addColorStop(0,ink+'00');gradient.addColorStop(.65,'#ffffffc9');gradient.addColorStop(1,'#fffef2');
  c.shadowColor='#fffdeb';c.shadowBlur=u*.13;segment(c,a.x,a.y,b.x,b.y,u*.072,gradient);star(c,b.x,b.y,u*.075,'#fffce6');
 }
 for(const p of [z.a,b]){disc(c,p.x,p.y,u*.074,'#151627');disc(c,p.x,p.y,u*.052,ink);}
 c.restore();
}
function visibleReaches(state,options={}){
 const hits=(isCurrent(state)&&state.phase==='done'?R.presentationReaches?.(state):null)||options.reach||[];
 return hits.filter(hit=>hit.gain>0||hit.gainHundredths>0).map(hit=>{
  const gain=Number(hit.gainHundredths??hit.gain??0),tier=Number.isFinite(Number(hit.tier))?Number(hit.tier):typeof reachTier==='function'?reachTier(gain,hit.allClear):hit.allClear?3:gain>=1000?2:gain>=300?1:0;
  return {...hit,tier:Math.max(0,Math.min(3,tier))};
 });
}
function circularReachComet(tier){
 if(typeof sixDropReachCometMarkup==='function')return sixDropReachCometMarkup(tier);
 if(typeof reachCometMarkup==='function')return reachCometMarkup(tier).replaceAll('<rect','<circle').replaceAll('x="4" y="4" width="92" height="92" rx="11"','cx="50" cy="50" r="46"');
 // Standalone view fixtures retain the production circular comet geometry.
 const length=tier===2?27:19,duration=tier===2?2.25:2.8;
 const comet=phase=>[['glow',length,0],['far',length,0],['mid',length*.66,length*.34],['near',length*.33,length*.67],['head',2.2,length-1.5]].map(([name,size,start])=>'<circle class="comet-'+name+'" cx="50" cy="50" r="46" pathLength="100" style="--dash:'+size+' '+(100-size)+';animation-delay:'+(-(start/100+phase)*duration).toFixed(4)+'s"/>').join('');
 return '<svg class="reach-comet-track" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><g class="reach-comet">'+comet(0)+'</g>'+(tier===2?'<g class="reach-comet second">'+comet(.5)+'</g>':'')+'</svg>';
}
function sharedReachMarkup(tier){
 const label=tier===3?'最高役':typeof REACH_WORDS!=='undefined'?REACH_WORDS[tier]:['リーチ','高額','超高額','最高役'][tier];
 return '<span class="reach-glints" data-tier="'+tier+'"><i></i><i></i><i></i></span>'+
  (tier===1||tier===2?'<span class="reach-orbit" data-tier="'+tier+'">'+circularReachComet(tier)+'</span>':'')+
  (tier===3?'<span class="allclear-reach-aura"><svg class="allclear-reach-perimeter" viewBox="0 0 100 100" fill="none"><circle class="perimeter-rail" cx="50" cy="50" r="44" pathLength="100"/><circle class="perimeter-trail" cx="50" cy="50" r="44" pathLength="100"/><circle class="perimeter-core" cx="50" cy="50" r="44" pathLength="100"/></svg></span>':'')+
  '<span class="tile-reach '+(tier?'alternating':'')+'" data-tier="'+tier+'"><span class="reach-first">リーチ</span>'+(tier?'<span class="reach-second">'+label+'</span>':'')+'</span>';
}
function reachOrbit(c,cell,p,r,hit,time,still,mini,current=false){
 const tier=Math.max(0,Math.min(3,Number(hit.tier)||0)),ink=tierInk[tier],rr=r*1.04,lap=(time/(tier===2?1750:2250)+cell.id*.037)*TAU;
 const style=current?REACH_STYLE:{alpha:.68,pulse:.18,glow:.27,ringWidth:.085,labelSize:.31,labelStroke:.11};
 c.save();c.shadowColor=ink;c.shadowBlur=r*style.glow;c.lineWidth=Math.max(current?.75:.9,r*style.ringWidth);c.strokeStyle=ink;c.globalAlpha=still?(current?style.alpha:.88):style.alpha+style.pulse*Math.sin(time/(current?640:440)+cell.id);c.beginPath();c.arc(p.x,p.y,rr,0,TAU);c.stroke();c.globalAlpha=1;
 const comets=tier>=2?2:1;
 for(let k=0;k<comets;k++){
  const head=(still?-.7:lap)+k*Math.PI;
  for(let i=0;i<7;i++){
   const a=head-(7-i)*.11;c.globalAlpha=current?.12+i*.05:.16+i*.12;c.lineWidth=r*(current?.035+i*.008:.06+i*.014);c.strokeStyle=tier===3?['#ff597b','#ffcf55','#b6f06a','#53dedb','#64a9ff','#b994ff','#fff6e7'][i]:ink;c.beginPath();c.arc(p.x,p.y,rr,a,a+.15);c.stroke();
  }
  c.globalAlpha=current?.5:1;c.shadowColor='#fffce7';c.shadowBlur=r*(current?.07:.27);c.lineWidth=r*(current?.05:.09);c.strokeStyle='#fffde6';c.beginPath();c.arc(p.x,p.y,rr,head-.06,head+.035);c.stroke();
 }
 if(!mini){
  const label=['リーチ','高額','超高額','最高役'][tier],y=p.y-r*.83;
  c.shadowBlur=0;c.globalAlpha=1;c.font='900 '+r*style.labelSize+'px SweetReachRounded,"Yu Gothic",Meiryo,sans-serif';c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';c.lineWidth=Math.max(current?.7:1,r*style.labelStroke);c.strokeStyle='#fff9e8';c.strokeText(label,p.x,y);c.fillStyle=tier===0?'#008b8d':tier===1?'#df254b':tier===2?'#9226be':'#a62a7e';c.fillText(label,p.x,y);
 }
 c.restore();
}
function paidSparkle(c,p,r,id,time,still){
 // Fixed mochi silhouettes; only payout-bearing sweets sparkle.
 c.save();
 for(let k=0;k<3;k++){
  const phase=(time/1100+id*.173+k*.31)%1,alpha=still?.82:Math.pow(Math.sin(phase*Math.PI),2);
  const angle=-Math.PI*.8+k*Math.PI*.64+id*.33,x=p.x+Math.cos(angle)*r*.72,y=p.y+Math.sin(angle)*r*.70;
  c.globalAlpha=.2+alpha*.8;c.shadowColor='#fff4a6';c.shadowBlur=r*.21;
  star(c,x,y,r*(.08+alpha*.09),'#fffde5');
 }
 c.restore();
}
function paint(ctx,state,options={},mini=false){
 if(!ctx||!state?.cells)return;
 const c=ctx,w=c.canvas.width,h=c.canvas.height,mode=options.artUsage==='lesson'?'lesson':mini?'mini':'main';
 const cssWidth=mode==='main'&&c.canvas.clientWidth>0?c.canvas.clientWidth:w,cssHeight=mode==='main'&&c.canvas.clientHeight>0?c.canvas.clientHeight:h,pixelScale=w/cssWidth,logical=geometry(cssWidth,cssHeight,{layout:mode==='main'?'main':'compact',state});
 const scaled=object=>object?Object.fromEntries(Object.entries(object).map(([key,value])=>[key,typeof value==='number'?value*pixelScale:value])):object;
 const g=pixelScale===1?logical:{...logical,width:w,height:h,unit:logical.unit*pixelScale,radius:logical.radius*pixelScale,cx:logical.cx*pixelScale,top:logical.top*pixelScale,tableReserve:(logical.tableReserve||0)*pixelScale,centers:logical.centers.map(p=>({id:p.id,x:p.x*pixelScale,y:p.y*pixelScale})),stand:scaled(logical.stand),free:scaled(logical.free)},u=g.unit,r=g.radius;
 if(!w||!h||!u)return;
 const time=ambientTime(options),still=!!(options.reducedMotion||options.paused);
 c.save();c.clearRect(0,0,w,h);c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';usage[mode]++;
 const stand=g.stand,standRendered=bitmap(c,'stand',stand.x,stand.y,stand.width,stand.height);if(standRendered)usage.stands++;
 let imageCells=0;const kinds={white:0,green:0,pink:0,yellow:0,rainbow:0,cyan:0};
 const animation=options.animationLines||state.newLines||[],age=options.lineAge??options.age??Infinity,completed=new Set(state.completedLines||[]),skewers=[];
 for(const lineId of completed){
  const line=linesFor(state)[lineId];if(!line)continue;
  const order=animation.indexOf(lineId),progress=still||order<0?1:smooth((age-order*150)/490);
  if(progress<=0)continue;skewers.push({line,z:skewer(c,line,g,progress)});
 }
 // Two-cell lines share the same blue bamboo and completion cues.
 if(Number(state.rulesRevision)>=266&&Array.isArray(R.shortLines))for(const line of R.shortLines){
  if((Number(state.markedMask)&line.mask)!==line.mask)continue;
  skewers.push({line,z:skewer(c,line,g,1)});
 }
 const reaches=new Map(visibleReaches(state,options).map(x=>[x.n??x.number,x])),oddsHits=new Set(state.oddsHits||[]);
 const expanded=new Set(state.expansionCells||state.expansionFootprint||(Number.isInteger(state.expansionCenter)?R.expansionCellsFor?.(state,state.expansionCenter):[])||[]);
 const plusFree=isPlusFree(state),fadeAge=Number(options.plusFreeFadeAge??Infinity),plusFreeOpacity=plusFree?(state.draws.length<5?1:options.reducedMotion?0:1-smooth(fadeAge/1800)):0;
 const cellOptions=cell=>({...options,plusFree,plusFreeOpacity,staticDango:isCurrent(state),lastCell:state.lastCell,oddsActivated:isModern(state)&&cell.initialFree&&expanded.has(cell.id)||cell.manualFree&&!cell.initialFree&&oddsHits.has(cell.number)});
 for(const cell of state.cells){const kind=dangoBody(c,cell,g.centers[cell.id],r,cellOptions(cell));if(kind){imageCells++;kinds[kind]++;}}
 for(const {line,z}of skewers)luminousSkewer(c,line,g,z,time,still,state);
 const paidCells=new Set();
 if(isCurrent(state)){
  const payable=new Set((R.payRowsFor?.(state)||[]).filter(row=>row.hundredths>0&&(row.atLeast?(state.lineCounts[row.length]||0)>=row.count:(state.lineCounts[row.length]||0)===row.count)).map(row=>row.length));
  for(const {line}of skewers)if(payable.has(line.length))for(const id of line.cells)paidCells.add(id);
  for(const id of paidCells)paidSparkle(c,g.centers[id],r,id,time,still);
 }
 if(plusFree)for(const cell of state.cells)if(cell.hit)hitOutline(c,g.centers[cell.id],r,cell.id,time,still);
 if(!mini&&isModern(state)){
  const preview=new Set(options.previewCells||[]),selected=state.expansionCenter;
  c.save();c.lineWidth=Math.max(1,u*.045);c.strokeStyle='#fffbe8';c.setLineDash([u*.075,u*.055]);
  for(const id of preview){const p=g.centers[id];if(!p)continue;c.beginPath();c.arc(p.x,p.y,r*.94,0,TAU);c.stroke();}
  c.setLineDash([]);
  if(Number.isInteger(selected)&&g.centers[selected]){const p=g.centers[selected];c.strokeStyle='#7148b7';c.lineWidth=u*.065;c.beginPath();c.arc(p.x,p.y,r*1.035,0,TAU);c.stroke();}
  c.restore();
 }
 for(const cell of state.cells){
  const p=g.centers[cell.id],reach=reaches.get(cell.number);
  if(reach&&!cell.hit&&(mini||!options.sharedReachLayer))reachOrbit(c,cell,p,r,reach,time,still,mini,isCurrent(state));
  dangoLabels(c,cell,p,r,cellOptions(cell));
 }
 if(!mini&&(state.lastOddsGain||state.lastBonusGain)&&options.age>=0&&options.age<1400&&state.lastCell!=null){
  const p=g.centers[state.lastCell],t=clamp(options.age/1400),x=Math.max(u*1.12,Math.min(w-u*1.12,p.x)),y=Math.max(u*.31,p.y-u*(.69+.34*t));
  c.save();c.globalAlpha=Math.min(1,(1-t)*3);roundBox(c,x-u*1.02,y-u*.22,u*2.04,u*.44,u*.16,state.lastOddsGain?'#713daa':plusFree?'#126e8d':'#446c20');text(c,state.lastOddsGain?'ODDS ＋'+state.lastOddsGain:plusFree?'FREE ＋'+state.lastBonusGain:isModern(state)?'FREE範囲 UP':'FREE ＋1',x,y,u*.265,'#fff9d4');c.restore();
 }
 last[mode]={width:w,height:h,cells:state.cells.length,imageCells,skewers:completed.size,imageSkewers:skewers.filter(t=>t.z.drawn).length,kinds,transparentBackground:true,standRendered,geometry:g,lineColors:[...new Set(skewers.map(t=>t.line.length))].map(length=>({length,color:lineColor(length,state)})),reachCount:reaches.size,afterFinalReach:state.phase==='done'&&reaches.size>0,reachStyle:isCurrent(state)?{...REACH_STYLE}:null,ambientTime:time,idleMotion:!isCurrent(state)&&!still,sparkleCells:paidCells.size,hitSparkleCells:plusFree?state.cells.filter(cell=>cell.hit).length:0,hitSparklesPerCell:plusFree?11:0,hitRimPulse:plusFree&&!still,greenHitCells:plusFree?state.cells.filter(cell=>cell.initialFree&&cell.hit).length:0,plusFree:{active:plusFree&&state.draws.length<5,opacity:plusFreeOpacity,cells:plusFree?(state.triggerCells||[]).slice():[],label:'+FREE'},hitLabelPosition:plusFree?'edge-outside-number':isCurrent(state)?'number-overlay':'above-number',hitLabels:state.cells.filter(cell=>cell.hit).length,hitLabel:'HIT!',previewCount:(options.previewCells||[]).length,expansionCenter:state.expansionCenter??null};
 c.restore();
}
function drawMini(context,state,options={}){const ctx=typeof context?.getContext==='function'?context.getContext('2d'):context;if(ctx&&!allAssetsReady())pendingMinis.set(ctx,{state,options});paint(ctx,state,options,true);}
function drawLessonDango(ctx,x,y,r,kind,value,rainbow=false){
 usage.lesson++;const bonus=kind==='bonus'||kind==='bonus-hit',cell={id:-1,number:value,initialFree:kind==='initial',manualFree:kind==='manual',hit:kind==='hit'||kind==='bonus-hit'||rainbow&&kind==='manual',trigger:bonus},o={oddsActivated:rainbow,reducedMotion:true,plusFree:R.REVISION>=285,plusFreeOpacity:bonus?1:0};
 const drawn=dangoBody(ctx,cell,{x,y},r,o);dangoLabels(ctx,cell,{x,y},r,o);return drawn;
}
function formatWin(bet,hundredths){const value=typeof medalWin==='function'?medalWin(bet,hundredths):Math.floor(Math.max(0,bet)*hundredths/100);return String(value);}
function mount(panel){
 const root=document.createElement('section');root.className='dgb-scene';root.setAttribute('aria-label','ダンゴデビンゴ');root.dataset.payoutArt=PAYOUT_ART;
 root.innerHTML='<div class="dgb-stage"><div class="dgb-pan"><canvas role="img"></canvas><div class="dgb-reach-layer six-reach-layer" aria-hidden="true"></div><div class="dgb-cell-controls" role="group" aria-label="FREEの中心を選ぶお団子"></div></div></div><aside class="dgb-pay"><div class="dgb-pay-matrix"><table aria-label="ラインの長さと完成本数による配当"><colgroup></colgroup><thead></thead><tbody></tbody></table></div><div class="dgb-pay-odds"><small class="dgb-odds-title">ODDS</small><b class="dgb-odds-value">×1</b></div></aside><aside class="dgb-free-rail" aria-label="前半ラインで獲得するFREE" hidden><div class="dgb-free-rail-heading">FREE</div><div class="dgb-free-rail-rows"></div></aside><div class="dgb-free-stat"><small class="dgb-free-title">置けるFREE</small><div class="dgb-trigger-numbers" role="group" aria-label="前半5球の拡張番号" hidden></div><div class="dgb-free-counter"><img class="dgb-free-mochi" src="assets/dango-art-v253/dango-yellow.webp" alt=""><b class="dgb-free-value">あと1個</b></div><span class="dgb-free-detail">配置0 / 1個</span><div class="dgb-placement"><span class="dgb-countdown"></span><div class="dgb-actions"><button type="button" data-action="auto">おまかせ</button></div></div></div><div class="dgb-prompt dgb-live"></div><div class="dgb-live dgb-announcement" role="status" aria-live="polite" aria-atomic="true"></div>';
 panel.append(root);
 const find=selector=>root.querySelector(selector),pan=find('.dgb-pan'),canvas=pan.querySelector('canvas'),ctx=canvas.getContext('2d'),controls=find('.dgb-cell-controls'),reachLayer=find('.dgb-reach-layer');
 let rows=[],buttons=[],state=null,options={},callbacks={},focusId=0,lastLive='',domKey='',sizeKey='',structureKey='',payGeometry=null,previewCenter=null,reachKey='';
 const motionMedia=matchMedia('(prefers-reduced-motion: reduce)');
 function syncMotion(){
  const reduced=!!(options.reducedMotion||motionMedia.matches),paused=!!(options.paused||reduced||document.hidden);
  if(root.dataset.motionPaused!==String(paused))root.dataset.motionPaused=String(paused);
  if(root.dataset.motionReduced!==String(reduced))root.dataset.motionReduced=String(reduced);
  reachLayer.classList.toggle('is-paused',paused);
 }
 function previewCells(){return state&&isModern(state)&&state.phase==='placing'&&!options.placementLocked&&previewCenter!==null?(R.expansionCellsFor?.(state,previewCenter)||[]):[];}
 function paintSharedReach(){
  if(!state)return;
  const g=geometry(pan.clientWidth,pan.clientHeight,{state}),hits=visibleReaches(state,options),lookup=new Map(state.cells.filter(cell=>!cell.hit).map(cell=>[cell.number,cell]));
  const key=[pan.clientWidth,pan.clientHeight,g.unit,state.phase,hits.map(hit=>(hit.n??hit.number)+':'+hit.tier+':'+lookup.get(hit.n??hit.number)?.id).join(','),state.cells.filter(cell=>cell.hit).map(cell=>cell.id).join(',')].join('/');
  if(key===reachKey)return;reachKey=key;reachLayer.replaceChildren();
  for(const hit of hits){
   const number=hit.n??hit.number,cell=lookup.get(number);if(!cell)continue;
   const p=g.centers[cell.id];if(!p)continue;
   const el=document.createElement('div');el.className='six-reach-cell dgb-shared-reach';el.dataset.number=String(number);el.dataset.tier=String(hit.tier);
   el.style.cssText='left:'+(p.x-g.radius)+'px;top:'+(p.y-g.radius)+'px;width:'+(g.radius*2)+'px;height:'+(g.radius*2)+'px';
   el.innerHTML=sharedReachMarkup(hit.tier);reachLayer.append(el);
  }
  reachLayer.dataset.style='six-drop';reachLayer.dataset.afterFinal=String(state.phase==='done');
 }
 function paintLive(){if(state){paint(ctx,state,{...options,previewCells:previewCells(),sharedReachLayer:true},false);paintSharedReach();}}
 function refreshFocus(){
  if(buttons[focusId]?.disabled){const next=buttons.find(button=>!button.disabled);focusId=next?Number(next.dataset.cellId):-1;}
  for(const button of buttons)button.tabIndex=Number(button.dataset.cellId)===focusId&&!button.disabled?0:-1;
 }
 function rebuild(next){
  const modern=isModern(next),baseRows=R.payRowsBaseFor?.(next)||R.payRows,key=[modern,next.rulesRevision,next.cells.length,baseRows.map(row=>row.length+':'+row.count).join(',')].join('/');
  if(key===structureKey)return;
  structureKey=key;sizeKey='';reachKey='';previewCenter=null;rows=[];buttons=[];controls.replaceChildren();find('tbody').replaceChildren();find('.dgb-free-rail-rows').replaceChildren();root.dataset.modern=String(modern);root.dataset.presentation=String(isPlusFree(next)?285:isCurrent(next)?269:262);
  const lengths=[...new Set(baseRows.map(row=>row.length))],columns=Math.max(...baseRows.map(row=>row.count));
  find('colgroup').innerHTML='<col class="dgb-row-label">'+'<col>'.repeat(columns);
  find('thead').innerHTML='<tr><th scope="col"><span class="dgb-live">ライン</span></th>'+Array.from({length:columns},(_,i)=>'<th scope="col">'+(i+1)+(isPlusFree(next)?'個':'本')+(!modern&&i+1===columns?'以上':'')+'</th>').join('')+'</tr>';
  find('table').setAttribute('aria-label','ラインの長さと完成'+(isPlusFree(next)?'個数':'本数')+'による配当');
  for(const length of lengths){
   const tr=document.createElement('tr');tr.dataset.length=String(length);tr.style.setProperty('--dgb-line-color',lineColor(length,next));
   const th=document.createElement('th');th.scope='row';th.innerHTML='<span class="dgb-line-heading"><span class="dgb-line-name"><b>'+length+'</b>個ライン</span></span>';tr.append(th);
   for(const row of baseRows.filter(item=>item.length===length)){
    const td=document.createElement('td');td.dataset.valid=String(row.possible!==false);td.dataset.column=td.dataset.count=String(row.count);td.dataset.atLeast=String(row.atLeast);td.dataset.highestRole=String(row.possible!==false&&highestRoleCell(row.length,row.count,next));td.innerHTML='<span class="gold-number">0</span>';rows.push({row,tr,td,value:'0'});tr.append(td);
   }
   find('tbody').append(tr);
   if(isCurrent(next)&&!isPlusFree(next)){
    const railRow=document.createElement('div');railRow.className='dgb-free-rail-row';railRow.dataset.length=String(length);railRow.setAttribute('aria-label',length+'個ラインでFREE '+length+'個');
    for(let i=0;i<length;i++){const icon=document.createElement('canvas');icon.className='dgb-free-icon';icon.dataset.kind='yellow';icon.setAttribute('aria-hidden','true');railRow.append(icon);}
    find('.dgb-free-rail-rows').append(railRow);
   }
  }
  for(const cell of cellsFor(next)){
   const button=document.createElement('button');button.type='button';button.className='dgb-cell';button.dataset.cellId=String(cell.id);button.tabIndex=-1;
   button.addEventListener('click',()=>callbacks.onCell?.(cell.id));
   button.addEventListener('focus',()=>{focusId=cell.id;previewCenter=cell.id;refreshFocus();paintLive();});
   button.addEventListener('mouseenter',()=>{if(!button.disabled){previewCenter=cell.id;paintLive();}});
   button.addEventListener('mouseleave',()=>{if(document.activeElement!==button&&previewCenter===cell.id){previewCenter=null;paintLive();}});
   button.addEventListener('blur',()=>{if(previewCenter===cell.id){previewCenter=null;paintLive();}});
   button.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
    event.preventDefault();const candidates=buttons.filter(button=>!button.disabled);if(!candidates.length)return;
    if(event.key==='Home'||event.key==='End'){(event.key==='Home'?candidates[0]:candidates.at(-1)).focus();return;}
    const locations=geometry(pan.clientWidth,pan.clientHeight,{state}).centers,origin=locations[cell.id],horizontal=event.key==='ArrowLeft'||event.key==='ArrowRight',direction=event.key==='ArrowLeft'||event.key==='ArrowUp'?-1:1;
    const next=candidates.map(button=>{const point=locations[Number(button.dataset.cellId)],dx=point.x-origin.x,dy=point.y-origin.y;return {button,delta:horizontal?dx:dy,score:horizontal?Math.abs(dx)+Math.abs(dy)*5:Math.abs(dy)*2+Math.abs(dx)};}).filter(item=>item.delta*direction>0).sort((a,b)=>a.score-b.score)[0];next?.button.focus();
   });controls.append(button);buttons.push(button);
  }
 }
 find('[data-action="auto"]').addEventListener('click',()=>callbacks.onAuto?.());
 function fit(){
  const box=pan.getBoundingClientRect(),scale=Math.min(2,window.devicePixelRatio||1),width=Math.max(1,Math.round(box.width*scale)),height=Math.max(1,Math.round(box.height*scale));
  if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
  const nextSize=[pan.clientWidth,pan.clientHeight,root.clientWidth,root.clientHeight,structureKey,showFreeRail(state),(state?.oddsMultiplier||1)>=2].join('/'),g=geometry(pan.clientWidth,pan.clientHeight,{state});
  if(sizeKey!==nextSize){
   sizeKey=nextSize;payGeometry=payoutLayout(pan.clientWidth,pan.clientHeight,state);root.style.setProperty('--dgb-unit',g.unit+'px');root.style.setProperty('--dgb-u',Math.max(.45,g.unit/55)+'px');root.style.setProperty('--dgb-pay-unit',payGeometry.unit+'px');root.style.setProperty('--dgb-pay-width',payGeometry.width+'px');
   if(isCurrent(state)){
    root.style.setProperty('--dgb-pay-anchor',payGeometry.anchor+'px');root.style.setProperty('--dgb-label-width',payGeometry.labelWidth+'px');root.style.setProperty('--dgb-column-width',payGeometry.columnWidth+'px');
    root.style.setProperty('--dgb-row-height',payGeometry.rowHeight+'px');root.style.setProperty('--dgb-header-height',payGeometry.headerHeight+'px');root.style.setProperty('--dgb-odds-height',payGeometry.oddsHeight+'px');
    root.style.setProperty('--dgb-frame-inset',payGeometry.frameInset+'px');
    root.style.setProperty('--dgb-rail-left',(payGeometry.anchor+payGeometry.matrixWidth+payGeometry.railGap)+'px');root.style.setProperty('--dgb-rail-top',(payGeometry.anchor+payGeometry.frameInset)+'px');root.style.setProperty('--dgb-rail-width',payGeometry.railWidth+'px');root.style.setProperty('--dgb-free-icon-size',payGeometry.iconSize+'px');root.style.setProperty('--dgb-rail-columns',String(payGeometry.railColumns));
   }root.dataset.payScale=String(payGeometry.scale);root.dataset.portrait=String(!!g.portrait);
   if(g.free){root.style.setProperty('--dgb-free-unit',g.free.unit+'px');root.style.setProperty('--dgb-free-left',g.free.x+'px');root.style.setProperty('--dgb-free-top',g.free.y+'px');root.style.setProperty('--dgb-free-width',g.free.width+'px');root.style.setProperty('--dgb-free-height',g.free.height+'px');}
   for(const point of g.centers){const button=buttons[point.id];if(!button)continue;button.style.left=point.x+'px';button.style.top=point.y+'px';button.style.width=g.unit*.94+'px';button.style.height=g.unit*.94+'px';}
  }
  for(const item of rows){
   const u=payGeometry?.unit||g.unit,available=Math.max(8,(item.td.clientWidth||u*PAY_LAYOUT.column)-u*(isCurrent(state)?.10:.12));
   if(isCurrent(state)){
    const label=item.td.querySelector('.gold-number'),size=Math.max(14,u*.40);label.textContent=item.value;
    // Keep numeral height consistent even for a large BET: squeeze only X.
    const anchor=isPlusFree(state)?'translateY(-50%)':'translate(-50%,-50%)';
    label.style.fontSize=size+'px';label.style.transform=anchor;label.style.marginLeft='0';
    ctx.save();ctx.font='700 '+size+'px ArcadePayout,Georgia,serif';const estimated=ctx.measureText(item.value).width;ctx.restore();
    // Intrinsic DOM width includes the actual font and inherited spacing. It
    // also stays in logical pixels when the entire arcade cabinet is scaled.
    const measured=isPlusFree(state)?Math.max(label.scrollWidth,label.offsetWidth)||estimated:estimated;
    const scale=Math.min(1,available/Math.max(1,measured));label.style.transform=anchor+' scaleX('+scale+')';
    label.dataset.horizontalScale=String(scale);
   }else{const label=item.td.querySelector('.gold-number');label.textContent=item.value;ctx.save();ctx.font='700 '+u*.28+'px ArcadePayout,Georgia,serif';const measured=ctx.measureText(item.value).width;label.style.fontSize=(u*.28*Math.min(1,available/Math.max(1,measured)))+'px';label.style.transform='translate(-50%,-50%)';label.style.marginLeft='0';ctx.restore();}
  }
  if(isCurrent(state)&&allAssetsReady())for(const icon of root.querySelectorAll('.dgb-free-icon')){
   const d=payGeometry.iconSize,pixels=Math.ceil(d*Math.min(2,window.devicePixelRatio||1));icon.width=icon.height=pixels;
   const c=icon.getContext('2d');c.clearRect(0,0,pixels,pixels);bitmap(c,'yellow',0,0,pixels,pixels);
   c.font='1000 '+pixels*.29+'px ElixirNumbers,system-ui,sans-serif';c.textAlign='center';c.textBaseline='middle';c.lineWidth=pixels*.065;c.strokeStyle='#fff7c1';c.strokeText('FREE',pixels/2,pixels/2);c.fillStyle='#68430a';c.fillText('FREE',pixels/2,pixels/2);icon.dataset.bitmap=String(art.yellow.loaded);
  }
  paintLive();
 }
 function draw(next,o={}){
  if(!next)return;options=o;syncMotion();const key=[o.bet,o.demo,o.placementLocked,Math.ceil(Number(o.remainingMs)/1000)].join('/');
  if(state===next&&key===domKey){paintLive();return;}
  state=next;options=o;domKey=key;rebuild(state);
  const modern=isModern(state),placing=!o.demo&&state.phase==='placing',editable=placing&&!o.placementLocked,drawCount=state.draws.length,second=state.phase==='draw-final'||state.phase==='done';
  root.dataset.firstHalf=String(showFreeRail(state));root.dataset.ruleRelease=String(Number(state.rulesRevision)>=288?288:0);find('.dgb-free-rail').hidden=!showFreeRail(state);root.dataset.phase=state.phase;root.dataset.demo=o.demo?'true':'false';root.dataset.cells=String(state.cells.length);root.dataset.skewers=String(state.completedLines.length);root.dataset.multiplier=String(state.oddsMultiplier||1);root.dataset.plusFree=String(isPlusFree(state));root.dataset.triggerActive=String(isPlusFree(state)&&drawCount<5);
  find('.dgb-pay-odds').hidden=isCurrent(state)&&(state.oddsMultiplier||1)<2;find('.dgb-odds-title').textContent=isCurrent(state)?'Odds UP!':'ODDS';find('.dgb-odds-value').textContent=isCurrent(state)?(state.oddsMultiplier||1)+'倍':'×'+(state.oddsMultiplier||1);find('.dgb-trigger-numbers').hidden=!modern;
  if(modern){
   const level=Number(state.expansionLevel)||0,chosen=Number.isInteger(state.expansionCenter),graded=Number(state.rulesRevision)>=264,individual=Number(state.rulesRevision)>=265;
   const area=individual?Number(state.freeBudget)||1:graded?(chosen?state.expansionCells.length:[0,1,7,19][level]||0):[0,1,7,17][level]||0,triggerBox=find('.dgb-trigger-numbers');
   triggerBox.classList.toggle('dgb-grade-individual',individual);
   if(isPlusFree(state)){
    find('.dgb-free-title').textContent=Number(state.rulesRevision)>=288?'配置FREE':'置けるFREE';
    find('.dgb-free-value').textContent=Number(state.rulesRevision)>=288?'×'+state.freeRemaining:'あと '+state.freeRemaining+'個';
    find('.dgb-free-detail').textContent=Number(state.rulesRevision)>=288?(drawCount<5?'+FREE '+(state.triggerHits?.length||0)+'/3':state.manualFreeCells.length+'/'+state.freeBudget+' 配置'):(drawCount<5?'基本1＋HIT '+(state.triggerHits?.length||0)+'個':'配置 '+state.manualFreeCells.length+' / '+state.freeBudget+'個');
    find('.dgb-free-stat').setAttribute('aria-label','配置できるFREEは残り'+state.freeRemaining+'個、配置済み'+state.manualFreeCells.length+'個');
    triggerBox.hidden=true;triggerBox.replaceChildren();triggerBox.setAttribute('aria-label','水色+FREEの前半HIT '+(state.triggerHits?.length||0)+'個');
   }else if(individual){
    find('.dgb-free-title').textContent='前半ライン・FREE配置';
    find('.dgb-free-value').textContent=state.draws.length<5?'最大FREE '+area+'個':'あと'+state.freeRemaining+'個';
    find('.dgb-free-detail').textContent='配置'+state.manualFreeCells.length+'/'+state.freeBudget+'個 ／ '+(state.qualifiedEarlyLengths?.length?level+'個ライン':'ライン未成立');
    if(isCurrent(state)){
     find('.dgb-free-title').textContent='置けるFREE';
     find('.dgb-free-value').textContent='あと '+state.freeRemaining+'個';
     find('.dgb-free-detail').textContent=drawCount<5?'前半5球で確定':'配置 '+state.manualFreeCells.length+' / '+state.freeBudget+'個';
     triggerBox.hidden=true;
    }
    const grades=new Set(state.qualifiedEarlyLengths||[]);
    triggerBox.setAttribute('aria-label','前半5球で成立した2〜7個ライン');triggerBox.replaceChildren();
    for(const length of [2,3,4,5,6,7]){const badge=document.createElement('span');badge.className='dgb-trigger'+(grades.has(length)?' hit':'');badge.textContent=length+'個';badge.setAttribute('aria-label',length+'個ライン'+(grades.has(length)?' 成立済み':' 未成立'));triggerBox.append(badge);}
   }else if(graded){
    find('.dgb-free-title').textContent='前半5球のライン';find('.dgb-free-value').textContent=area?(chosen?area+'マスFREE':'最大'+area+'マスFREE'):'FREE獲得なし';
    find('.dgb-free-detail').textContent=level===0?'3・4・5個ラインで昇格':level===1?'3個ライン：中心のみ':level===2?'4個ライン：周囲1マス':'5個ライン：周囲2マス';
    const grades=new Set(state.qualifiedEarlyLengths||[]);triggerBox.setAttribute('aria-label','前半5球で成立したライン');triggerBox.replaceChildren();
    for(const length of [3,4,5]){const badge=document.createElement('span');badge.className='dgb-trigger'+(grades.has(length)?' hit':'');badge.textContent=length+'個';badge.setAttribute('aria-label',length+'個ライン'+(grades.has(length)?' 成立済み':' 未成立'));triggerBox.append(badge);}
   }else{
    const hits=new Set(state.triggerHits||state.draws.slice(0,5));
    find('.dgb-free-title').textContent='前半5球の拡張';find('.dgb-free-value').textContent=area?area+'マスFREE':'拡張 '+level+' / 3';
    find('.dgb-free-detail').textContent=level===0?'1 HITで1マス':level===1?(chosen?'中心を配置済み':'中心を1つ選ぶ'):level===2?'中心＋周辺6マス':'中心＋周辺16マス';
    triggerBox.setAttribute('aria-label','前半5球の拡張番号');triggerBox.replaceChildren();for(const n of state.triggerNumbers||[]){const badge=document.createElement('span');badge.className='dgb-trigger'+(hits.has(n)?' hit':'');badge.textContent=String(n);badge.setAttribute('aria-label',n+'番'+(hits.has(n)?' HIT済み':''));triggerBox.append(badge);}
   }
   const eligible=new Set(R.availableCenters?.(state)||state.cells.filter(cell=>!cell.initialFree&&!cell.hit).map(cell=>cell.id));
   for(const cell of state.cells){const button=buttons[cell.id],selected=individual?state.manualFreeCells.includes(cell.id):chosen&&cell.id===state.expansionCenter;
    button.disabled=!editable||(individual?(cell.hit&&!cell.initialFree||!selected&&state.freeRemaining<=0):!eligible.has(cell.id)&&!selected);
    button.setAttribute('aria-pressed',String(selected));button.classList.toggle('placed',selected);
    button.dataset.trigger=String(!!cell.trigger);button.dataset.hit=String(!!cell.hit);
    button.setAttribute('aria-label',(cell.initialFree?'緑の初期FREE':cell.number+'番')+(cell.trigger&&drawCount<5?' 水色+FREE':'')+(selected?' 黄色の配置FREE・取り消す':cell.hit&&!cell.initialFree?' HIT済み':individual?' 個別FREE配置候補':eligible.has(cell.id)?' FREE範囲の中心に選ぶ':'この範囲の中心には選べません'));
   }
   find('[data-action="auto"]').disabled=!editable||(individual?state.freeRemaining<=0:level===0);
   find('.dgb-prompt').textContent=individual?(o.demo?'前半の最長ラインでFREE数が1〜7個に変化。全て個別に配置できます。':placing?(state.freeRemaining?'FREEをあと'+state.freeRemaining+'個、好きなマスに置けます。すでに置いたマスは再タップで取消し。':'FREEを'+state.freeBudget+'個配置済み。必要なら再タップで取消し。'):state.phase==='done'?'成立ラインを集計し、ODDSを反映':second?'配置FREEへ後半HITするとODDS UP！':'2〜7個の前半ラインでFREE配置個数が増えます'):graded?(o.demo?'前半5球で3・4・5個ラインが成立すると、中心のみ・周囲1・周囲2マスをFREEにできます。':placing?(level===0?'前半5球でライン未成立。今回は追加FREEなし':chosen?'同じ中心で取消し、別の中心で置き直しできます。':'成立したラインに応じたFREE範囲の中心を選んでください。'):state.phase==='done'?'長さ別の配当を合計してODDSを反映':second?'配置FREEへの後半HITで ODDS UP！':'前半5球で3・4・5個ラインを完成させてFREEを強化！'):(o.demo?'前半5球の拡張番号にHIT。1個で1マス、2個で中心を含む7マス、3個で中心を含む17マスFREE。':placing?(chosen?'選択した中心を再タップすると取り消せます。別の中心への置き直しもできます。':'お団子を1つ選び、FREEにする範囲の中心を置いてください。'):state.phase==='done'?'長さごとの完成本数の配当を合計し、ODDSを反映':second?'配置FREEへの後半HITで ODDS UP！':'拡張番号への前半HITで、置けるFREEの範囲が広がります');
  }else{
   find('.dgb-free-title').textContent='置けるFREE';find('.dgb-free-value').textContent='あと'+state.freeRemaining+'個';find('.dgb-free-detail').textContent='配置'+state.manualFreeCells.length+' / '+state.freeBudget+'個';find('.dgb-odds-value').textContent='×'+state.oddsMultiplier;
   for(const cell of state.cells){const button=buttons[cell.id];button.disabled=!editable||cell.initialFree||cell.hit||(!cell.manualFree&&!state.freeRemaining);button.setAttribute('aria-pressed',String(cell.manualFree));button.classList.toggle('placed',cell.manualFree);button.setAttribute('aria-label',cell.number+'番'+(cell.initialFree?' 初期FREE':cell.hit?' HIT済み':cell.manualFree?' 配置したFREE・取り消す':' FREEを置く'));}
   find('[data-action="auto"]').disabled=!editable||!state.freeRemaining;
   find('.dgb-prompt').textContent=o.demo?'前半5球 → FREE配置 → 後半3球':placing?state.freeRemaining?'お団子を選んで、あと'+state.freeRemaining+'個配置':'黄色い団子をタップすると取り消せます':state.phase==='done'?'完成した串の配当を合計':second?'配置FREEの番号が出ると ODDS UP！':'初期FREEに前半HITすると、配置FREE＋1';
  }
  if(isPlusFree(state))find('.dgb-prompt').textContent=o.demo?'基本FREEは1個。水色の+FREEに前半HITで1個ずつ追加。':placing?'黄色FREEをあと'+state.freeRemaining+'個配置。緑FREEに重ねるとODDS＋1。':state.phase==='done'?'成立ラインの配当を合計し、ODDSを反映しました。':second?'黄色FREEへの番号HITでODDS＋1。':'水色の+FREEに前半HITすると、配置できるFREEが1個増えます。';
  controls.hidden=!placing;find('.dgb-placement').hidden=!placing;find('.dgb-actions').hidden=!placing;refreshFocus();
  const seconds=Number(o.remainingMs);find('.dgb-placement').dataset.manualWait=String(placing&&!Number.isFinite(seconds));find('.dgb-countdown').textContent=placing&&Number.isFinite(seconds)?Math.max(0,Math.ceil(seconds/1000))+'秒':placing?'6球目の番号待ち':'';find('.dgb-countdown').classList.toggle('urgent',placing&&Number.isFinite(seconds)&&seconds<=5000);
  const payRows=typeof R.payRowsFor==='function'?R.payRowsFor(state):R.payRows.map(row=>({...row,hundredths:row.hundredths*state.oddsMultiplier}));
  const nextCounts=isCurrent(state)?((state.phase==='done'?R.presentationReaches?.(state):null)||o.reach||R.presentationReaches?.(state)||R.reaches?.(state)||[]).map(hit=>hit.lineCounts||((state.phase==='draw'||state.phase==='draw-final')?R.draw(state,hit.n??hit.number)?.lineCounts:null)).filter(Boolean):[];
  for(const item of rows){
   const row=payRows.find(row=>row.length===item.row.length&&row.count===item.row.count)||item.row,count=state.lineCounts[row.length]||0,possible=row.possible!==false,current=possible&&(row.atLeast?count>=row.count:count===row.count)&&(!isCurrent(state)||row.hundredths>0||row.length===2&&row.count===1),reach=possible&&isCurrent(state)&&!current&&row.hundredths>0&&nextCounts.some(counts=>counts[row.length]>count&&(row.atLeast?counts[row.length]>=row.count:counts[row.length]===row.count));
   item.tr.dataset.completed=String(count);item.td.classList.toggle('current',current);item.td.classList.toggle('reach',reach);item.td.setAttribute('aria-current',current?'true':'false');item.value=!possible?'—':isCurrent(state)&&row.hundredths===0?'-':formatWin(Number(o.bet)||0,row.hundredths);item.td.setAttribute('aria-label',row.length+'個ライン '+row.count+(isPlusFree(state)?'個':'本')+(row.atLeast?'以上':'')+' '+(!possible?'このルールでは成立しません':item.value+' WIN'+(highestRoleCell(row.length,row.count,state)?' 最高役':'')+(current?' GET!':reach?' リーチ!':'')));
  }
  canvas.setAttribute('aria-label',state.cells.length+'個のお団子。'+drawCount+'球、完成した串'+state.completedLines.length+'本、初期FREE'+state.initialFreeCells.length+'個、配置FREE'+state.manualFreeCells.length+'個'+(Number(state.rulesRevision)>=265?'。番号1から25は各1個。前半最長ライン'+(state.qualifiedEarlyLengths?.length?state.expansionLevel+'個':'なし')+'、FREE配置'+state.manualFreeCells.length+'/'+state.freeBudget+'個、ODDS'+(state.oddsMultiplier||1)+'倍。':Number(state.rulesRevision)>=264?'。番号1から25は各1個。前半ラインのFREEグレード'+(state.expansionLevel||0)+'、ODDS'+(state.oddsMultiplier||1)+'倍。':modern?'。番号1から25は各1個。拡張番号のHIT '+(state.expansionLevel||0)+'個、ODDS'+(state.oddsMultiplier||1)+'倍。':'、ODDS'+state.oddsMultiplier+'倍。'));
  if(isPlusFree(state))canvas.setAttribute('aria-label',state.cells.length+'個のお団子。'+drawCount+'球、完成ライン'+state.completedLines.length+'個、初期FREE'+state.initialFreeCells.length+'個、配置FREE'+state.manualFreeCells.length+'/'+state.freeBudget+'個。'+(drawCount<5?'水色+FREE番号 '+(state.triggerNumbers||[]).join('・')+'。':'水色+FREEは終了。')+'前半+FREE HIT '+(state.triggerHits?.length||0)+'個。ODDS'+(state.oddsMultiplier||1)+'倍。');
  const live=[state.phase,drawCount,state.freeBudget,state.freeRemaining,state.expansionLevel,state.expansionCenter,state.completedLines.length,state.oddsMultiplier].join('/');
  if(live!==lastLive){lastLive=live;find('.dgb-announcement').textContent=find('.dgb-prompt').textContent+'。完成ライン'+state.completedLines.length+(isPlusFree(state)?'個':'本')+'、ODDS'+(state.oddsMultiplier||1)+'倍。';}
  fit();
 }
 const refreshArt=()=>{root.dataset.artReady=String(allAssetsReady());root.dataset.artFailed=String(Object.values(art).some(asset=>asset.failed));fit();};
 const refreshFonts=()=>{if(root.isConnected)fit();};
 const offArt=onAssetsChanged(refreshArt),observer=new ResizeObserver(fit);observer.observe(root);observer.observe(pan);document.addEventListener('visibilitychange',syncMotion);motionMedia.addEventListener?.('change',syncMotion);syncMotion();refreshArt();document.fonts?.addEventListener?.('loadingdone',refreshFonts);document.fonts?.ready?.then(refreshFonts);
 return {root,canvas,draw,drawMini,setCallbacks(next){callbacks={...callbacks,...next};},describe(){return {revision:isPlusFree(state)?285:isCurrent(state)?269:262,modern:isModern(state),payout:payGeometry,payoutArtwork:PAYOUT_ART,reachPresentation:{style:'six-drop',count:reachLayer.children.length,afterFinal:state?.phase==='done'},plusFree:{enabled:isPlusFree(state),active:isPlusFree(state)&&state.draws.length<5,numbers:isPlusFree(state)?(state.triggerNumbers||[]).slice():[],hits:isPlusFree(state)?(state.triggerHits||[]).length:0},freeRail:{visible:showFreeRail(state),counts:[...root.querySelectorAll('.dgb-free-rail-row')].map(row=>({length:+row.dataset.length,count:row.children.length}))},highestCells:rows.filter(item=>item.td.dataset.highestRole==='true').map(item=>({length:item.row.length,count:item.row.count})),earnedCells:rows.filter(item=>item.td.classList.contains('current')).map(item=>({length:item.row.length,count:item.row.count,win:item.value})),reachCells:rows.filter(item=>item.td.classList.contains('reach')).map(item=>({length:item.row.length,count:item.row.count})),paused:root.dataset.motionPaused==='true'||document.body.classList.contains('paused')||document.body.classList.contains('player-menu-open')};},destroy(){offArt();observer.disconnect();document.removeEventListener('visibilitychange',syncMotion);motionMedia.removeEventListener?.('change',syncMotion);document.fonts?.removeEventListener?.('loadingdone',refreshFonts);root.remove();}};
}
const hasAmbientMotion=(state,options={})=>!!state?.cells&&!options.reducedMotion&&!options.paused&&(!isCurrent(state)||isPlusFree(state)&&state.hitCells?.length>0||state.completedLines?.length>0||Number(state.lineCounts?.[2])>=2||options.reach?.length>0);
window.DangoBingoView={mount,drawMini,paint,geometry,payoutLayout,drawLessonDango,assetsReady,describeAssets,onAssetsChanged,hasAmbientMotion,lineColors:LINE_COLORS,reachStyle:REACH_STYLE,presentationRevision:285};
})();

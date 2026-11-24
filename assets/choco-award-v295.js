/* Chocolate Canyon: three illustrated celebrations with native live amounts.
 * This helper only paints a frozen cue. The common award presenter owns event
 * observation, timing, accessibility, sound, and the lifetime of each canvas.
 */
(()=>{
'use strict';
if(window.ChocoAwardV295)return;
const query=new URLSearchParams(location.search);
if(query.get('serverSettlementWorker')==='1'||query.get('downloadWorker')==='1')return;
if(window.SweetsLineup?.chosen&&!window.SweetsLineup.chosen.includes('choco'))return;

const ROOT='assets/choco-art-v295/';
const FILES={fruit:'award-fruit.webp',chain:'award-chain.webp',depth:'award-depth.webp',digits:'award-digits.webp'};
const KEYS=Object.freeze(['apple','mandarin','lemon','blueberry','grape','melon']);
const NAMES=Object.freeze({apple:'りんご',mandarin:'みかん',lemon:'レモン',blueberry:'ブルーベリー',grape:'ぶどう',melon:'メロン'});
const MODES=new Set(['fruit','chain','depth']);
const DIGIT_ORDER=['0','1','2','3','4','5','6','7','8','9',',','WIN'];
// A measured, already shipped fallback. It is deliberately not interpreted as
// a regular grid: the wider WIN lettering crosses the nominal fourth cell.
const COOKIE_RECTS={
 '0':[27,67,267,312],'1':[362,61,220,314],
 '2':[654,64,256,313],'3':[970,64,254,317],
 '4':[26,480,272,320],'5':[342,479,252,325],
 '6':[649,480,264,324],'7':[962,481,264,319],
 '8':[24,893,265,324],'9':[341,892,262,324],
 ',':[715,1040,138,170],WIN:[921,970,333,163]
};
const images=new Map(),failures=[];
let digitAtlas=null;
const stats={paints:0,mainPaints:0,miniPaints:0,fruitPaints:0,chainPaints:0,depthPaints:0,
 rasterAmounts:0,fallbackAmounts:0,last:null};

function load(key,url){
 return new Promise(resolve=>{
  const img=new Image();img.decoding='async';
  img.onload=()=>{if(img.naturalWidth>0&&img.naturalHeight>0){images.set(key,img);resolve(img);}else{failures.push(url);resolve(null);}};
  img.onerror=()=>{failures.push(url);resolve(null);};img.src=url;
 });
}
function gridAtlas(source){
 // The dedicated transparent atlas is 4 columns by 3 rows. Crop actual alpha
 // bounds once, preserving the shape and optical advance of every glyph.
 const w=source.naturalWidth,h=source.naturalHeight,canvas=document.createElement('canvas');
 canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d',{willReadFrequently:true});
 if(!ctx)return null;ctx.drawImage(source,0,0);
 let pixels;try{pixels=ctx.getImageData(0,0,w,h).data;}catch{return null;}
 const rects={};
 for(let i=0;i<DIGIT_ORDER.length;i++){
  const x0=Math.floor((i%4)*w/4),x1=Math.floor((i%4+1)*w/4),y0=Math.floor(Math.floor(i/4)*h/3),y1=Math.floor((Math.floor(i/4)+1)*h/3);
  let left=x1,right=x0,top=y1,bottom=y0,occupied=0;
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(pixels[(y*w+x)*4+3]>18){
   occupied++;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
  }
  // An opaque matte or an empty/missing cell is not a usable glyph sheet.
  if(!occupied||occupied/((x1-x0)*(y1-y0))>.94||right<=left||bottom<=top)return null;
  left=Math.max(x0,left-2);right=Math.min(x1-1,right+2);top=Math.max(y0,top-2);bottom=Math.min(y1-1,bottom+2);
  rects[DIGIT_ORDER[i]]=[left,top,right-left+1,bottom-top+1];
 }
 return {source,rects,kind:'chocolate-v295',url:ROOT+FILES.digits};
}
function cookieAtlas(source){
 const sx=source.naturalWidth/1254,sy=source.naturalHeight/1254;
 return {source,kind:'cookie-v293-fallback',url:'assets/cookie-art-v293/award-digits.webp',
  rects:Object.fromEntries(Object.entries(COOKIE_RECTS).map(([key,[x,y,w,h]])=>[key,[x*sx,y*sy,w*sx,h*sy]]))};
}
const digitReady=load('digits',ROOT+FILES.digits+'?v=295').then(async source=>{
 if(source){digitAtlas=gridAtlas(source);if(digitAtlas)return true;failures.push(FILES.digits+': invalid transparent glyph grid');}
 const fallback=await load('cookieDigits','assets/cookie-art-v293/award-digits.webp?v=293');
 if(fallback)digitAtlas=cookieAtlas(fallback);return !!digitAtlas;
});
const ready=Promise.all([
 ...['fruit','chain','depth'].map(key=>load(key,ROOT+FILES[key]+'?v=295')),
 digitReady,Promise.resolve(window.ChocoArtV295?.ready)
]).then(()=>['fruit','chain','depth'].every(key=>images.has(key)));

function positiveInteger(value){return Number.isSafeInteger(value)&&value>0?value:null;}
function normalizeFruits(input){
 const byKey=new Map();
 for(const entry of Array.isArray(input)?input:[]){
  const key=typeof entry==='string'?entry:entry?.key;
  const count=typeof entry==='string'?1:positiveInteger(entry?.count);
  if(!KEYS.includes(key)||!count)continue;
  const sum=(byKey.get(key)||0)+count;if(Number.isSafeInteger(sum))byKey.set(key,sum);
 }
 return [...byKey].map(([key,count])=>({key,count}));
}
function snapshot(event,extra={}){
 // A v9 reward's semantic identity is tile.fruit. Old mineral IDs deliberately
 // remain unguessed, so a legacy cue can use the existing common presenter.
 const collected=(event?.items||[]).filter(item=>item?.gain>0&&KEYS.includes(item.tile?.fruit));
 const fruits=normalizeFruits(collected.map(item=>({key:item.tile.fruit,count:1})));
 const chain=positiveInteger(extra.chain)??positiveInteger(event?.chainCount);
 const depth=positiveInteger(extra.depth)??positiveInteger(event?.bonusDepth);
 const mode=MODES.has(extra.mode)?extra.mode:event?.phase==='canyonBonus'?'depth':chain&&chain>=2?'chain':'fruit';
 return Object.freeze({mode,fruits:Object.freeze(fruits.map(fruit=>Object.freeze(fruit))),
  chain,depth,bonusName:typeof extra.bonusName==='string'?extra.bonusName:''});
}
function cueData(cue){
 const raw=cue.choco||{},fruits=normalizeFruits(raw.fruits),chain=positiveInteger(raw.chain),depth=positiveInteger(raw.depth);
 const mode=MODES.has(raw.mode)?raw.mode:cue.phase==='canyonBonus'?'depth':chain&&chain>=2?'chain':'fruit';
 return {mode,fruits,chain,depth,bonusName:typeof raw.bonusName==='string'?raw.bonusName:'',
  count:fruits.reduce((sum,fruit)=>sum+fruit.count,0)};
}
function liveLabel(data,mini){
 if(data.mode==='depth')return data.depth?data.depth.toLocaleString('ja-JP')+'m 到達！':data.bonusName||'ケーキボーナス';
 if(data.mode==='chain')return data.chain?data.chain+'連鎖！':mini?'連鎖獲得！':'連鎖でフルーツ獲得！';
 if(data.fruits.length===1){const fruit=data.fruits[0];return NAMES[fruit.key]+' ×'+fruit.count+(mini?'':' 獲得！');}
 return mini?data.count+'個 GET！':data.fruits.length+'種のフルーツ・合計 '+data.count+'個';
}
function confectionText(ctx,value,x,y,size,maxWidth,{dark=false}={}){
 if(!value)return;ctx.save();ctx.font='900 '+size+'px "Noto Sans JP","Yu Gothic",sans-serif';
 const fit=Math.min(1,maxWidth/Math.max(1,ctx.measureText(value).width));
 ctx.translate(x,y);ctx.scale(fit,1);ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';
 ctx.strokeStyle=dark?'#fff3cc':'#37170e';ctx.lineWidth=Math.max(1,size*.19);ctx.strokeText(value,0,size*.06);
 ctx.strokeStyle=dark?'#cb8741':'#b57238';ctx.lineWidth=Math.max(.6,size*.075);ctx.strokeText(value,0,0);
 const face=ctx.createLinearGradient(0,-size*.55,0,size*.55);
 face.addColorStop(0,dark?'#4d2314':'#fffef0');face.addColorStop(.42,dark?'#7a3e20':'#fff5c4');
 face.addColorStop(.48,dark?'#482111':'#efbd58');face.addColorStop(1,dark?'#36180f':'#fff0a7');
 ctx.fillStyle=face;ctx.fillText(value,0,0);ctx.restore();
}
function numberRun(ctx,value,x,y,height,maxWidth){
 if(!digitAtlas)return false;
 const chars=Array.from(value.toLocaleString('ja-JP')),rects=digitAtlas.rects;
 if(chars.some(char=>!rects[char]))return false;
 const metrics=chars.map(char=>{const rect=rects[char],h=char===','?height*.47:height;return {rect,h,w:h*rect[2]/rect[3],comma:char===','};});
 const gap=height*.018,win=rects.WIN,winH=height*.42,winW=winH*win[2]/win[3];
 const natural=metrics.reduce((sum,m)=>sum+m.w,0)+gap*Math.max(0,chars.length-1)+height*.12+winW;
 const fit=Math.min(1,maxWidth/Math.max(1,natural));let left=x-natural*fit/2;
 for(const m of metrics){
  ctx.drawImage(digitAtlas.source,...m.rect,left,y-height*fit/2+(m.comma?height*.52*fit:0),m.w*fit,m.h*fit);
  left+=(m.w+gap)*fit;
 }
 left+=height*.102*fit;ctx.drawImage(digitAtlas.source,...win,left,y+height*.07*fit,winW*fit,winH*fit);return true;
}
function fruitSource(key){try{return window.ChocoArtV295?.fruit(key)||null;}catch{return null;}}
function halo(ctx,x,y,size,color){
 ctx.save();const fill=ctx.createRadialGradient(x,y,0,x,y,size*.64);fill.addColorStop(0,color);fill.addColorStop(1,'rgba(255,218,128,0)');
 ctx.fillStyle=fill;ctx.fillRect(x-size*.65,y-size*.65,size*1.3,size*1.3);ctx.restore();
}
function fruit(ctx,source,entry,x,y,size,age,still,mini,hero=false){
 const sw=source.naturalWidth||source.width,sh=source.naturalHeight||source.height;if(!(sw>0&&sh>0))return;
 const pulse=still?1:1+Math.sin(age/650+KEYS.indexOf(entry.key))*.012;
 const fit=size/Math.max(sw,sh)*pulse,w=sw*fit,h=sh*fit;
 halo(ctx,x,y,size,hero?'rgba(255,225,132,.58)':'rgba(255,239,190,.22)');
 ctx.save();ctx.shadowColor='rgba(52,17,8,.42)';ctx.shadowBlur=size*.055;ctx.shadowOffsetY=size*.035;
 ctx.drawImage(source,x-w/2,y-h/2,w,h);ctx.restore();
 if(entry.count>1)confectionText(ctx,'×'+entry.count,x+size*.28,y+size*.34,size*(mini?.25:.23),size*.67);
}
function fruitComposition(ctx,data,sources,w,h,top,age,still,mini){
 // The collection cup has one large actual fruit. Any other collected kinds
 // fan around it; a multi-fruit cue never silently becomes a single fruit.
 const sorted=data.fruits.slice().sort((a,b)=>KEYS.indexOf(b.key)-KEYS.indexOf(a.key));
 if(sorted.length>=4){
  // Six distinct rewards still fit below the tall painted title. A compact
  // two-row display avoids putting a stray fruit over the FRUIT GET lettering.
  for(let i=sorted.length-1;i>=0;i--){const entry=sorted[i],px=.36+(i%3)*.14,py=i<3?.35:.47;
   fruit(ctx,sources.get(entry.key),entry,(px-.5)*w,top+py*h,h*.15,age,still,mini,i===0);}
  return;
 }
 const offsets=sorted.length===2?[[.39,.405,.25],[.61,.405,.25]]:
  [[.50,.405,mini?.29:.27],[.35,.43,.18],[.65,.43,.18]];
 for(let i=sorted.length-1;i>=0;i--){const entry=sorted[i],[px,py,scale]=offsets[i];
  fruit(ctx,sources.get(entry.key),entry,(px-.5)*w,top+py*h,h*scale,age,still,mini,i===0);}
}
function chainComposition(ctx,data,sources,w,h,top,age,still,mini){
 // This separate illustration is a diagonal falling cake-and-cream cascade.
 // Real fruits sit on different plinths rather than reusing the collection cup.
 const entries=data.fruits.slice().sort((a,b)=>KEYS.indexOf(b.key)-KEYS.indexOf(a.key));
 // The painted plinth tops are at x=.295/.498/.701, y=.40. Keep all
 // cutouts below the large title and above each plinth's front gold edge.
 const points=entries.length===1?[[.498,.347,.17]]:entries.length===2?[[.295,.347,.17],[.701,.347,.17]]:
  entries.length===3?[[.498,.347,.17],[.295,.347,.17],[.701,.347,.17]]:
  [[.465,.354,.13],[.263,.354,.13],[.668,.354,.13],[.532,.354,.13],[.330,.354,.13],[.735,.354,.13]];
 for(let i=entries.length-1;i>=0;i--){const entry=entries[i],[px,py,scale]=points[i];fruit(ctx,sources.get(entry.key),entry,(px-.5)*w,top+py*h,h*scale,age,still,mini,i===0);}
}
function glints(ctx,w,h,top,mode,age,mini){
 const points=mode==='depth'?[[.16,.32],[.83,.34],[.28,.54],[.72,.56]]:
  mode==='chain'?[[.18,.28],[.78,.26],[.37,.49],[.86,.48]]:[[.28,.27],[.73,.29],[.21,.50],[.79,.50]];
 ctx.save();for(let i=0;i<(mini?2:points.length);i++){
  const [px,py]=points[i],phase=(age/1650+i*.29)%1,alpha=.2+.7*Math.sin(Math.PI*phase),size=w*(mini?.015:.018);
  ctx.globalAlpha*=alpha;ctx.translate((px-.5)*w,top+py*h);ctx.fillStyle='#fff8d6';
  ctx.beginPath();ctx.moveTo(0,-size);ctx.quadraticCurveTo(size*.13,-size*.13,size,0);ctx.quadraticCurveTo(size*.13,size*.13,0,size);
  ctx.quadraticCurveTo(-size*.13,size*.13,-size,0);ctx.quadraticCurveTo(-size*.13,-size*.13,0,-size);ctx.fill();
  ctx.translate(-((px-.5)*w),-(top+py*h));ctx.globalAlpha/=alpha;
 }ctx.restore();
}
function paint(ctx,{cue,width,height,mini=false,age=0,still=false}={}){
 if(!ctx||cue?.game!=='choco'||!(width>0&&height>0)||!Number.isSafeInteger(cue.win)||cue.win<0)return false;
 age=Math.max(0,Number(age)||0);
 const data=cueData(cue),background=images.get(data.mode);if(!background)return false;
 const sources=new Map();
 if(data.mode!=='depth'){
  if(!data.fruits.length)return false;
  for(const entry of data.fruits){const source=fruitSource(entry.key);if(!source)return false;sources.set(entry.key,source);}
 }
 const w=Math.min(width,height*1.5),h=w/1.5,top=-h/2;
 ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(background,-w/2,top,w,h);
 if(data.mode==='fruit')fruitComposition(ctx,data,sources,w,h,top,age,still,mini);
 if(data.mode==='chain')chainComposition(ctx,data,sources,w,h,top,age,still,mini);
 // Coordinates follow the actual generated illustrations, not a shared box.
 // The chain's chocolate amount plaque is intentionally offset to the left.
 const layout=data.mode==='chain'?{ribbon:.56,ribbonWidth:.48,caption:.704,amountX:.405,amountY:.785,amountSize:mini?.145:.125,amountWidth:.47}:
  data.mode==='depth'?{ribbon:mini?.635:.62,ribbonWidth:.54,caption:.665,amountX:.50,amountY:.835,amountSize:mini?.16:.14,amountWidth:.60}:
  {ribbon:.61,ribbonWidth:.49,caption:.715,amountX:.50,amountY:mini?.80:.81,amountSize:mini?.17:.14,amountWidth:mini?.59:.55};
 confectionText(ctx,liveLabel(data,mini),0,top+h*layout.ribbon,h*(mini?.10:.072),w*layout.ribbonWidth);
 if(!mini){
  const caption=data.mode==='depth'&&data.bonusName?data.bonusName:cue.total?'獲得合計':'今回の獲得';
  // A depth subtitle sits on the second line of its broad cream ribbon.
  // Other captions sit inside their own dark chocolate amount plaque.
  if(!(data.mode==='depth'&&!data.depth&&caption===liveLabel(data,false)))
   confectionText(ctx,caption,(layout.amountX-.5)*w,top+h*layout.caption,h*.034,w*.48,{dark:data.mode==='depth'});
 }
 const amountX=(layout.amountX-.5)*w,amountY=top+h*layout.amountY;
 const raster=numberRun(ctx,cue.win,amountX,amountY,h*layout.amountSize,w*layout.amountWidth);
 if(raster)stats.rasterAmounts++;
 else{stats.fallbackAmounts++;confectionText(ctx,cue.win.toLocaleString('ja-JP')+' WIN',amountX,amountY,h*layout.amountSize*.94,w*layout.amountWidth);}
 if(!still)glints(ctx,w,h,top,data.mode,age,mini);
 ctx.restore();
 stats.paints++;stats[mini?'miniPaints':'mainPaints']++;stats[data.mode+'Paints']++;
 stats.last={game:'choco',mode:data.mode,win:cue.win,total:!!cue.total,mini,label:liveLabel(data,mini),
  fruits:data.fruits.map(entry=>({...entry})),chain:data.chain,depth:data.depth,
  source:ROOT+FILES[data.mode],rasterNumbers:raster,digitSource:raster?digitAtlas.kind:'live-canvas'};
 return true;
}
window.ChocoAwardV295=Object.freeze({
 version:295,ready,paint,snapshot,
 get loaded(){return ['fruit','chain','depth'].every(key=>images.has(key));},
 describe:()=>({version:295,ready:['fruit','chain','depth'].every(key=>images.has(key)),
  digitSource:digitAtlas?.kind||null,files:Object.values(FILES).map(file=>ROOT+file),
  failures:failures.slice(),...stats,last:stats.last?{...stats.last,fruits:stats.last.fruits.map(entry=>({...entry}))}:null,games:['choco']})
});
})();

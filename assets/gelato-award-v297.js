/* Gelato Prism: three painted awards with exact native panels, collectors and
 * medals. This helper paints immutable cues; it never observes or changes the
 * engine, payout, round clock, or gameplay RNG itself. */
(()=>{
'use strict';
if(window.GelatoAwardV297)return;
const query=new URLSearchParams(location.search);
if(query.get('serverSettlementWorker')==='1'||query.get('downloadWorker')==='1')return;
if(window.SweetsLineup?.chosen&&!window.SweetsLineup.chosen.includes('gelato'))return;

const ROOT='assets/gelato-art-v297/';
const FILES={panel:'award-panel.webp',collector:'award-collector.webp',full:'award-full.webp',digits:'digits.webp'};
const FLAVORS=Object.freeze([
 {grade:0,key:'blue',name:'水色',capacity:8},
 {grade:1,key:'green',name:'緑',capacity:4},
 {grade:2,key:'yellow',name:'黄色',capacity:4},
 {grade:3,key:'red',name:'赤',capacity:4},
 {grade:4,key:'purple',name:'紫',capacity:4}
].map(Object.freeze));
const DIGIT_ORDER=['0','1','2','3','4','5','6','7','8','9',',','WIN'];
const images=new Map(),failures=[];
let digitAtlas=null;
const stats={paints:0,mainPaints:0,miniPaints:0,panelPaints:0,collectorPaints:0,fullPaints:0,
 rasterAmounts:0,fallbackAmounts:0,last:null};
const integer=(value,fallback=0)=>Number.isSafeInteger(value)&&value>=0?value:fallback;
function countsOf(value){
 return Array.isArray(value)&&value.length===5&&value.every(n=>Number.isSafeInteger(n)&&n>=0)?value.slice():null;
}
function load(key,url){
 return new Promise(resolve=>{
  const img=new Image();img.decoding='async';
  img.onload=()=>{if(img.naturalWidth>0&&img.naturalHeight>0){images.set(key,img);resolve(img);}else{failures.push(url);resolve(null);}};
  img.onerror=()=>{failures.push(url);resolve(null);};img.src=url;
 });
}
function gridAtlas(source){
 // Twelve transparent cells, alpha-cropped once. Keep real glyph proportions;
 // fixed-width cells would squeeze the comma and stretch the narrow numeral 1.
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
  if(!occupied||occupied/((x1-x0)*(y1-y0))>.94||right<=left||bottom<=top)return null;
  left=Math.max(x0,left-2);right=Math.min(x1-1,right+2);top=Math.max(y0,top-2);bottom=Math.min(y1-1,bottom+2);
  rects[DIGIT_ORDER[i]]=[left,top,right-left+1,bottom-top+1];
 }
 return {source,rects,kind:'gelato-v297'};
}
const digitReady=load('digits',ROOT+FILES.digits+'?v=297').then(source=>{
 if(source){digitAtlas=gridAtlas(source);if(!digitAtlas)failures.push(FILES.digits+': invalid transparent glyph grid');}
 return !!digitAtlas;
});
const ready=Promise.all([
 ...['panel','collector','full'].map(key=>load(key,ROOT+FILES[key]+'?v=297')),
 digitReady,Promise.resolve(window.SweetsBoardArtV275?.ready)
]).then(()=>['panel','collector','full'].every(key=>images.has(key)));

function snapshot(event,extra={}){
 const totalFaces=integer(extra.totalFaces,extra.faceGrades?.length||24)||24;
 const newFaces=[...new Set((event?.newFaces||[]).filter(id=>Number.isSafeInteger(id)&&id>=0&&id<totalFaces))];
 const counts=countsOf(event?.collectors)||countsOf(extra.counts)||[0,0,0,0,0];
 const acquired=[0,0,0,0,0];
 for(const id of newFaces){const grade=extra.faceGrades?.[id];if(Number.isInteger(grade)&&grade>=0&&grade<5)acquired[grade]++;}
 // A restored or newly attached observer can reconstruct the prior counts
 // from this exact native fill, never from a guessed color or award tier.
 const recorded=countsOf(extra.previousCounts),exactFaces=acquired.reduce((sum,n)=>sum+n,0)===newFaces.length;
 const derived=counts.map((n,i)=>Math.max(0,n-acquired[i]));
 const previous=recorded&&(!exactFaces||recorded.every((n,i)=>counts[i]-n===acquired[i]))?recorded:derived;
 const newlyCompleted=FLAVORS.filter(f=>f.grade>0&&previous[f.grade]<f.capacity&&counts[f.grade]===f.capacity).map(f=>f.grade);
 const filledCount=integer(extra.filledCount,counts.reduce((sum,n)=>sum+n,0));
 const full=event?.full===true&&filledCount===totalFaces;
 const mode=full?'full':newlyCompleted.length?'collector':'panel';
 const colors=FLAVORS.map(f=>Object.freeze({...f,count:counts[f.grade],acquired:acquired[f.grade],
  complete:f.grade>0&&counts[f.grade]===f.capacity,newlyComplete:newlyCompleted.includes(f.grade)}));
 return Object.freeze({mode,full,newFaces:Object.freeze(newFaces),newCount:newFaces.length,
  filledCount,totalFaces,counts:Object.freeze(counts),newlyCompleted:Object.freeze(newlyCompleted),
  countMultiplier:Number.isFinite(event?.countMultiplier)&&event.countMultiplier>=0?event.countMultiplier:null,
  colors:Object.freeze(colors)});
}
function cueData(cue){
 const raw=cue.gelato;if(!raw)return null;
 const counts=countsOf(raw.counts);if(!counts)return null;
 const filledCount=integer(raw.filledCount),totalFaces=integer(raw.totalFaces,24)||24;
 const full=raw.full===true&&filledCount===totalFaces;
 const newlyCompleted=[...new Set((raw.newlyCompleted||[]).filter(grade=>Number.isInteger(grade)&&grade>0&&grade<5&&counts[grade]===4))];
 const completeColors=FLAVORS.filter(f=>f.grade>0&&counts[f.grade]===f.capacity).map(f=>f.grade);
 const completed=cue.total?completeColors:newlyCompleted;
 // A total may reuse the collector frame only if a collector truly exists.
 // An ordinary round total must never inherit a PRISM COMPLETE title.
 const mode=full?'full':completed.length?'collector':'panel';
 const colors=FLAVORS.map(f=>({...f,count:counts[f.grade],acquired:integer(raw.colors?.[f.grade]?.acquired),
  complete:completeColors.includes(f.grade),newlyComplete:newlyCompleted.includes(f.grade)}));
 return {mode,full,counts,colors,filledCount,totalFaces,newlyCompleted,completed,
  newFaces:(raw.newFaces||[]).slice(),newCount:integer(raw.newCount)};
}
function liveLabel(data,total){
 if(total)return '獲得合計 · '+data.filledCount+' / '+data.totalFaces+' パネル';
 if(data.mode==='full')return data.filledCount+' / '+data.totalFaces+' パネル完成！';
 if(data.mode==='collector')return data.completed.map(grade=>FLAVORS[grade].name).join('・')+' 完成！ · '+data.filledCount+' / '+data.totalFaces;
 return '+'+data.newCount+' パネル · '+data.filledCount+' / '+data.totalFaces;
}
function iceText(ctx,value,x,y,size,maxWidth,{dark=false}={}){
 if(!value)return;ctx.save();ctx.font='900 '+size+'px "Noto Sans JP","Yu Gothic",sans-serif';
 const fit=Math.min(1,maxWidth/Math.max(1,ctx.measureText(value).width));
 ctx.translate(x,y);ctx.scale(fit,1);ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';
 ctx.strokeStyle=dark?'#fff6d5':'#183754';ctx.lineWidth=Math.max(1,size*.18);ctx.strokeText(value,0,size*.04);
 ctx.strokeStyle=dark?'#d3ba72':'#76b3db';ctx.lineWidth=Math.max(.6,size*.07);ctx.strokeText(value,0,0);
 const face=ctx.createLinearGradient(0,-size*.55,0,size*.55);
 face.addColorStop(0,dark?'#214b73':'#ffffff');face.addColorStop(.43,dark?'#46688b':'#efffff');
 face.addColorStop(.49,dark?'#2d4d6e':'#bbdef4');face.addColorStop(1,dark?'#203957':'#fff4c5');
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
 for(const m of metrics){ctx.drawImage(digitAtlas.source,...m.rect,left,y-height*fit/2+(m.comma?height*.52*fit:0),m.w*fit,m.h*fit);left+=(m.w+gap)*fit;}
 left+=height*.102*fit;ctx.drawImage(digitAtlas.source,...win,left,y+height*.07*fit,winW*fit,winH*fit);return true;
}
function colorComposition(ctx,data,w,h,top,mini,total,layout){
 const grades=data.mode==='panel'?data.colors.filter(f=>total?f.count>0:f.acquired>0).map(f=>f.grade):data.completed;
 // Full completion shows all four genuine collectors, including the ones
 // completed on earlier balls. A collector cue shows only this fill's colors.
 const entries=(data.mode==='full'?data.colors.filter(f=>f.complete):grades.map(grade=>data.colors[grade]));
 const step=Math.min(w*.135,w*.60/Math.max(1,entries.length)),size=h*(entries.length>4?.15:layout.colorSize);
 for(const [i,entry]of entries.entries()){
  const x=(i-(entries.length-1)/2)*step,y=top+h*layout.colors;
  const source=window.SweetsBoardArtV275?.sprite?.('gelato-'+entry.key);
  if(source){
   const sw=source.naturalWidth||source.width,sh=source.naturalHeight||source.height,k=size/Math.max(sw,sh);
   ctx.save();ctx.shadowColor='rgba(207,246,255,.72)';ctx.shadowBlur=mini?2:h*.025;
   ctx.drawImage(source,x-sw*k/2,y-sh*k/2,sw*k,sh*k);ctx.restore();
  }else iceText(ctx,entry.name,x,y,h*.062,step*.94);
  const count=data.mode==='panel'&&!total?'×'+entry.acquired:entry.count+' / '+entry.capacity;
  iceText(ctx,count,x,top+h*layout.counts,h*(mini?.063:.052),step*.93);
 }
}
function glints(ctx,w,h,top,age,mini){
 const points=[[.16,.31],[.82,.30],[.25,.62],[.75,.62]];
 ctx.save();for(let i=0;i<(mini?2:points.length);i++){
  const [px,py]=points[i],alpha=.2+.7*Math.sin(Math.PI*((age/1650+i*.29)%1)),size=w*(mini?.012:.015);
  ctx.save();ctx.globalAlpha*=alpha;ctx.translate((px-.5)*w,top+py*h);ctx.fillStyle='#f4feff';
  ctx.beginPath();ctx.moveTo(0,-size);ctx.quadraticCurveTo(size*.13,-size*.13,size,0);ctx.quadraticCurveTo(size*.13,size*.13,0,size);
  ctx.quadraticCurveTo(-size*.13,size*.13,-size,0);ctx.quadraticCurveTo(-size*.13,-size*.13,0,-size);ctx.fill();ctx.restore();
 }ctx.restore();
}
function paint(ctx,{cue,width,height,mini=false,age=0,still=false}={}){
 if(!ctx||cue?.game!=='gelato'||!(width>0&&height>0)||!Number.isSafeInteger(cue.win)||cue.win<0)return false;
 const data=cueData(cue),background=data&&images.get(data.mode);if(!background)return false;
 const w=Math.min(width,height*1.5),h=w/1.5,top=-h/2;age=Math.max(0,Number(age)||0);
 // These bays follow the actual three generated pictures. In particular the
 // small amount caption belongs inside the blue plaque, below the cream roll.
 const layout=data.mode==='panel'?{colors:.445,colorSize:.165,counts:.55,ribbon:.64,caption:.765,amount:mini?.835:.845,amountWidth:.57}:
  data.mode==='collector'?{colors:.41,colorSize:.17,counts:.52,ribbon:.63,caption:.77,amount:mini?.835:.85,amountWidth:.54}:
  {colors:.49,colorSize:.135,counts:.585,ribbon:.67,caption:.794,captionSize:.028,amount:mini?.8525:.865,amountSize:mini?.145:.108,amountWidth:.57};
 ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(background,-w/2,top,w,h);
 colorComposition(ctx,data,w,h,top,mini,!!cue.total,layout);
 iceText(ctx,liveLabel(data,!!cue.total),0,top+h*layout.ribbon,h*(mini?.080:.068),w*.66,{dark:true});
 if(!mini){
  const caption=cue.total?'獲得合計':'今回の獲得';
  iceText(ctx,caption,0,top+h*layout.caption,h*(layout.captionSize||.034),w*.52);
 }
 const amountSize=h*(layout.amountSize||(mini?.15:.115));
 const raster=numberRun(ctx,cue.win,0,top+h*layout.amount,amountSize,w*layout.amountWidth);
 if(raster)stats.rasterAmounts++;
 else{stats.fallbackAmounts++;iceText(ctx,cue.win.toLocaleString('ja-JP')+' WIN',0,top+h*layout.amount,amountSize*.94,w*layout.amountWidth);}
 if(!still)glints(ctx,w,h,top,age,mini);ctx.restore();
 stats.paints++;stats[mini?'miniPaints':'mainPaints']++;stats[data.mode+'Paints']++;
 stats.last={game:'gelato',mode:data.mode,win:cue.win,total:!!cue.total,mini,label:liveLabel(data,!!cue.total),
  filledCount:data.filledCount,totalFaces:data.totalFaces,newCount:data.newCount,newFaces:data.newFaces.slice(),
  counts:data.counts.slice(),newlyCompleted:data.newlyCompleted.slice(),colors:data.colors.map(color=>({...color})),
  source:ROOT+FILES[data.mode],rasterNumbers:raster,digitSource:raster?digitAtlas.kind:'live-canvas'};
 return true;
}
window.GelatoAwardV297=Object.freeze({
 version:297,ready,paint,snapshot,
 get loaded(){return ['panel','collector','full'].every(key=>images.has(key));},
 describe:()=>({version:297,ready:['panel','collector','full'].every(key=>images.has(key)),
  digitSource:digitAtlas?.kind||null,files:Object.values(FILES).map(file=>ROOT+file),failures:failures.slice(),
  ...stats,last:stats.last?{...stats.last,newFaces:stats.last.newFaces.slice(),counts:stats.last.counts.slice(),
   newlyCompleted:stats.last.newlyCompleted.slice(),colors:stats.last.colors.map(color=>({...color}))}:null,games:['gelato']})
});
})();

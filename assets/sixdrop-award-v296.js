/* Six Drop's sculpted candy lettering and live illustrated jackpot numerals.
 * The native award observer owns cues, timing, sound and accessibility. This
 * module composes generated pixels around its immutable result snapshot. */
(()=>{
'use strict';
if(window.SixDropAwardV296)return;
const query=new URLSearchParams(location.search);
if(query.get('serverSettlementWorker')==='1'||query.get('downloadWorker')==='1')return;
if(window.SweetsLineup?.chosen&&!window.SweetsLineup.chosen.includes('candy'))return;
const ROOT='assets/sixdrop-art-v296/';
const FILES=Object.freeze({line:'award-line.webp',triangle:'award-triangle.webp',hexagon:'award-hexagon.webp',allclear:'award-allclear.webp',digits:'award-digits.webp'});
const ROLES=Object.freeze(['line','triangle','hexagon','allclear']);
const GLYPH_ORDER=Object.freeze(['0','1','2','3','4','5','6','7','8','9',',','WIN']);
const ROLE_NAMES=Object.freeze({line:'直線',triangle:'トライアングル',hexagon:'ヘキサゴン'});
// Every hero is independently painted. Use its actual live ribbon and clear
// payout space instead of forcing the four sculptures into one text layout.
const LAYOUTS=Object.freeze({
 line:Object.freeze({label:.580,amount:.790}),
 triangle:Object.freeze({label:.645,amount:.807}),
 hexagon:Object.freeze({label:.595,amount:.806}),
 allclear:Object.freeze({label:.666,amount:.834})
});
const images=new Map(),glyphs=new Map(),errors=[],textMetrics=new Map();
const stats={paints:0,main:0,mini:0,rasterAmounts:0,fallbackAmounts:0,fallbacks:0,
 roles:{line:0,triangle:0,hexagon:0,allclear:0},last:null};
const heroReady=()=>ROLES.every(role=>images.has(role));
function roleOf(cue){
 if(cue?.kind==='clear'||cue?.phase==='pyramidAllClear')return 'allclear';
 if(cue?.candy?.forms?.hexagon>0||/^HEXAGON\b/.test(cue?.label||''))return 'hexagon';
 if(cue?.candy?.forms?.triangle>0||/^TRIANGLE\b/.test(cue?.label||''))return 'triangle';
 return 'line';
}
function liveLabel(cue){
 if(roleOf(cue)==='allclear'){
  const count=Number(cue.candy?.allClears);
  return Number.isSafeInteger(count)&&count>0?'全消し '+count+'回目！':'全消し達成！';
 }
 const counts=cue.candy?.forms;
 const parts=counts?['line','triangle','hexagon'].filter(role=>Number.isSafeInteger(counts[role])&&counts[role]>0).map(role=>ROLE_NAMES[role]+' ×'+counts[role]):[];
 return parts.length?parts.join(' ・ '):String(cue.detail||cue.label||'');
}
function sourceAspect(cue){
 const source=images.get(roleOf(cue));return source?source.naturalWidth/source.naturalHeight:1.5;
}
function prepareGlyphs(source){
 // The artist owns the lettering. Inspect alpha once to remove transparent
 // gutters from each registered 4-by-3 cell, never recolour or redraw it.
 const cv=document.createElement('canvas');cv.width=source.naturalWidth;cv.height=source.naturalHeight;
 const ctx=cv.getContext('2d',{willReadFrequently:true});if(!ctx)throw Error('Candy numeral canvas unavailable');
 ctx.drawImage(source,0,0);const {data}=ctx.getImageData(0,0,cv.width,cv.height),found=new Map();
 for(let index=0;index<GLYPH_ORDER.length;index++){
  const col=index%4,row=Math.floor(index/4),x0=Math.round(col*cv.width/4),x1=Math.round((col+1)*cv.width/4);
  const y0=Math.round(row*cv.height/3),y1=Math.round((row+1)*cv.height/3);
  let left=x1,top=y1,right=x0-1,bottom=y0-1;
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(data[(y*cv.width+x)*4+3]>=18){
   if(x<left)left=x;if(x>right)right=x;if(y<top)top=y;if(y>bottom)bottom=y;
  }
  if(right<left||bottom<top)throw Error('Missing candy numeral '+GLYPH_ORDER[index]);
  left=Math.max(x0,left-1);top=Math.max(y0,top-1);right=Math.min(x1-1,right+1);bottom=Math.min(y1-1,bottom+1);
  found.set(GLYPH_ORDER[index],Object.freeze([left,top,right-left+1,bottom-top+1]));
 }
 for(const [key,rect]of found)glyphs.set(key,rect);
}
const ready=Promise.all(Object.entries(FILES).map(([name,file])=>new Promise(resolve=>{
 const image=new Image();image.decoding='async';
 image.onload=()=>{
  if(!(image.naturalWidth>0&&image.naturalHeight>0)){errors.push('Invalid '+file);resolve(false);return;}
  images.set(name,image);
  if(name==='digits')try{prepareGlyphs(image);}catch(error){errors.push(String(error?.message||error));}
  resolve(true);
 };
 image.onerror=()=>{errors.push('Missing '+ROOT+file);resolve(false);};image.src=ROOT+file+'?v=296';
}))).then(()=>heroReady());
function measure(ctx,text,font){
 const key=font+'\n'+text;if(textMetrics.has(key))return textMetrics.get(key);
 ctx.font=font;const width=ctx.measureText(text).width;
 if(textMetrics.size>=128)textMetrics.delete(textMetrics.keys().next().value);
 textMetrics.set(key,width);return width;
}
function confectionText(ctx,value,x,y,size,maxWidth,dark=false){
 if(!value)return;
 const font='900 '+size+'px "M PLUS Rounded 1c","Noto Sans JP",system-ui,sans-serif';
 ctx.save();ctx.font=font;ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';
 ctx.translate(x,y);ctx.scale(Math.min(1,maxWidth/Math.max(1,measure(ctx,value,font))),1);
 ctx.strokeStyle=dark?'#fff6d1':'#68225c';ctx.lineWidth=Math.max(1.4,size*.20);ctx.strokeText(value,0,size*.035);
 ctx.strokeStyle=dark?'#a4574c':'#c38b62';ctx.lineWidth=Math.max(.7,size*.07);ctx.strokeText(value,0,0);
 const face=ctx.createLinearGradient(0,-size*.5,0,size*.5);
 face.addColorStop(0,dark?'#52243f':'#fffef2');face.addColorStop(.40,dark?'#6b294b':'#fff2b6');
 face.addColorStop(.49,dark?'#48213d':'#ffffff');face.addColorStop(1,dark?'#54223d':'#efbd68');
 ctx.fillStyle=face;ctx.fillText(value,0,0);ctx.restore();
}
function numberRun(ctx,value,x,y,height,maxWidth){
 const source=images.get('digits'),characters=Array.from(Number(value).toLocaleString('ja-JP'));
 if(!source||characters.some(char=>!glyphs.has(char))||!glyphs.has('WIN'))return null;
 const parts=characters.map(char=>{
  const rect=glyphs.get(char),punctuation=char===',',h=punctuation?height*.43:height;
  return {char,rect,h,w:h*rect[2]/rect[3],punctuation};
 });
 const gap=height*.027,win=glyphs.get('WIN'),winH=height*.43,winW=winH*win[2]/win[3];
 const natural=parts.reduce((sum,p)=>sum+p.w,0)+gap*Math.max(0,parts.length-1)+height*.15+winW;
 const scale=Math.min(1,maxWidth/Math.max(1,natural));let left=x-natural*scale/2;
 for(const part of parts){
  const [sx,sy,sw,sh]=part.rect,top=y-height*scale/2+(part.punctuation?height*.53*scale:0);
  ctx.drawImage(source,sx,sy,sw,sh,left,top,part.w*scale,part.h*scale);left+=(part.w+gap)*scale;
 }
 left+=height*.123*scale;
 ctx.drawImage(source,...win,left,y+height*.05*scale,winW*scale,winH*scale);
 return [...characters,'WIN'];
}
function glint(ctx,x,y,size,alpha){
 ctx.save();ctx.translate(x,y);ctx.globalAlpha*=alpha;ctx.fillStyle='#fffbe4';ctx.beginPath();
 ctx.moveTo(0,-size);ctx.quadraticCurveTo(size*.13,-size*.13,size,0);
 ctx.quadraticCurveTo(size*.13,size*.13,0,size);ctx.quadraticCurveTo(-size*.13,size*.13,-size,0);
 ctx.quadraticCurveTo(-size*.13,-size*.13,0,-size);ctx.fill();ctx.restore();
}
function paint(ctx,{cue,width,height,mini=false,age=0,still=false}={}){
 if(!ctx||cue?.game!=='candy'||!(width>0&&height>0)||!Number.isSafeInteger(cue.win)||cue.win<0){stats.fallbacks++;return false;}
 // Historical saved games can still emit ROUND CLEAR; their original
 // accurately labelled renderer remains responsible for that different cue.
 if(!['pyramidAward','pyramidAllClear'].includes(cue.phase)){stats.fallbacks++;return false;}
 const role=roleOf(cue),image=images.get(role);if(!image){stats.fallbacks++;return false;}
 const aspect=sourceAspect(cue),w=Math.min(width,height*aspect),h=w/aspect,top=-h/2;
 const layout=LAYOUTS[role],label=liveLabel(cue),winText=Number(cue.win).toLocaleString('ja-JP')+' WIN';
 ctx.save();ctx.drawImage(image,-w/2,top,w,h);
 // The hero's STRAIGHT!/TRIANGLE!/HEXAGON!/ALL CLEAR! lettering is already
 // sculpted into the illustration. Only real event counts and WIN vary.
 confectionText(ctx,label,0,top+h*layout.label,h*(mini?.092:.066),w*(mini?.74:.67));
 // The owner supplies the accessible award meaning. Keep this lower space
 // entirely for the large live numerals instead of adding a competing label.
 const amountGlyphs=numberRun(ctx,cue.win,0,top+h*layout.amount,h*(mini?.191:.166),w*(mini?.76:.72));
 if(amountGlyphs)stats.rasterAmounts++;
 else{stats.fallbackAmounts++;confectionText(ctx,winText,0,top+h*layout.amount,h*.142,w*.72,true);}
 if(!still){
  const points=mini?[[-.39,-.16],[.38,.20]]:[[-.39,-.16],[.38,.20],[-.25,.36],[.29,-.34],[-.41,.11],[.42,-.10]];
  for(let i=0;i<points.length;i++){
   const phase=(age/1650+i*.181)%1,[x,y]=points[i];
   glint(ctx,w*x,h*y,(mini?2:3.4)*(1+(i%2)*.28),.18+.6*Math.sin(Math.PI*phase)**2);
  }
 }
 ctx.restore();stats.paints++;stats[mini?'mini':'main']++;stats.roles[role]++;
 stats.last={game:'candy',role,phase:cue.phase,label:String(cue.label||''),detail:String(cue.detail||''),
  liveLabel:label,win:cue.win,winText,total:!!cue.total,mini,rasterNumbers:!!amountGlyphs,
  source:ROOT+FILES[role],glyphs:amountGlyphs||[],layout:{...layout}};
 return true;
}
document.fonts?.ready?.then(()=>textMetrics.clear());
window.SixDropAwardV296=Object.freeze({
 version:296,ready,paint,aspectFor:sourceAspect,get loaded(){return heroReady();},get aspect(){return sourceAspect({label:'1 LINE!'});},
 describe:()=>({version:296,loaded:heroReady(),digitsReady:images.has('digits')&&glyphs.size===GLYPH_ORDER.length,
  files:Object.values(FILES).map(file=>ROOT+file),errors:errors.slice(),glyphRects:Object.fromEntries([...glyphs].map(([key,rect])=>[key,[...rect]])),
  ...stats,roles:{...stats.roles},last:stats.last?{...stats.last,glyphs:stats.last.glyphs.slice()}:null,
  limits:{mainGlints:6,miniGlints:2,textMetrics:128},cachedTextMetrics:textMetrics.size})
});
})();

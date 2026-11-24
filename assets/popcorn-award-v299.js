/* Popcorn Splash's cinema illustrations and native award numerals.
 * The native award observer owns cues, timing, sound and accessibility. This
 * module composes generated pixels around its immutable result snapshot. */
(()=>{
'use strict';
if(window.PopcornAwardV299)return;
const query=new URLSearchParams(location.search);
if(query.get('serverSettlementWorker')==='1'||query.get('downloadWorker')==='1')return;
if(window.SweetsLineup?.chosen&&!window.SweetsLineup.chosen.includes('popcorn'))return;
const ROOT='assets/popcorn-art-v299/';
const FILES=Object.freeze({pop:'award-pop.webp',clear:'award-clear.webp',grand:'award-grand.webp',boost:'award-boost.webp',digits:'award-digits.webp'});
const ROLES=Object.freeze(['pop','clear','grand']);
const GLYPH_ORDER=Object.freeze(['0','1','2','3','4','5','6','7','8','9',',','WIN']);
const LAYOUTS=Object.freeze({pop:Object.freeze({label:.622,amount:.785}),clear:Object.freeze({label:.622,amount:.785}),grand:Object.freeze({label:.638,amount:.785})});
const images=new Map(),glyphs=new Map(),errors=[],textMetrics=new Map();
const stats={paints:0,main:0,mini:0,rasterAmounts:0,fallbackAmounts:0,fallbacks:0,
 roles:{pop:0,clear:0,grand:0},statusPaints:0,statusRoles:{boost:0},lastStatus:null,last:null};
const heroReady=()=>ROLES.every(role=>images.has(role));
function roleOf(cue){const p=cue?.popcorn;return p?.clear?(p.clears>=3?'grand':'clear'):'pop';}
function liveLabel(cue){
 const p=cue.popcorn;
 return p.clear?'全消し '+p.clears+'回目 ・ 今回 '+p.count+' POP':p.count+' POP ・ '+p.chains+'連鎖';
}
function sourceAspect(cue){
 const source=images.get(roleOf(cue));return source?source.naturalWidth/source.naturalHeight:1.5;
}
function prepareGlyphs(source){
 // The artist owns the lettering. Inspect alpha once to remove transparent
 // gutters from each registered 4-by-3 cell, never recolour or redraw it.
 const cv=document.createElement('canvas');cv.width=source.naturalWidth;cv.height=source.naturalHeight;
 const ctx=cv.getContext('2d',{willReadFrequently:true});if(!ctx)throw Error('Popcorn numeral canvas unavailable');
 ctx.drawImage(source,0,0);const {data}=ctx.getImageData(0,0,cv.width,cv.height),found=new Map();
 for(let index=0;index<GLYPH_ORDER.length;index++){
  const col=index%4,row=Math.floor(index/4);
  // Give the final sculpted word its actual wider source cell. The comma
  // occupies the adjacent empty gutter; neither glyph is ever clipped.
  const x0=Math.round((index===11?.725:col/4)*cv.width);
  const x1=Math.round((index===10?.725:(col+1)/4)*cv.width);
  const y0=Math.round(row*cv.height/3),y1=Math.round((row+1)*cv.height/3);
  let left=x1,top=y1,right=x0-1,bottom=y0-1;
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(data[(y*cv.width+x)*4+3]>=18){
   if(x<left)left=x;if(x>right)right=x;if(y<top)top=y;if(y>bottom)bottom=y;
  }
  if(right<left||bottom<top)throw Error('Missing popcorn numeral '+GLYPH_ORDER[index]);
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
 image.onerror=()=>{errors.push('Missing '+ROOT+file);resolve(false);};image.src=ROOT+file+'?v=299';
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
 ctx.strokeStyle=dark?'#fff6d1':'#70251f';ctx.lineWidth=Math.max(.5,size*.20);ctx.strokeText(value,0,size*.035);
 ctx.strokeStyle=dark?'#a95c37':'#c38b62';ctx.lineWidth=Math.max(.25,size*.07);ctx.strokeText(value,0,0);
 const face=ctx.createLinearGradient(0,-size*.5,0,size*.5);
 face.addColorStop(0,dark?'#502318':'#fffef2');face.addColorStop(.40,dark?'#69311c':'#fff2b6');
 face.addColorStop(.49,dark?'#452018':'#ffffff');face.addColorStop(1,dark?'#54281c':'#efbd68');
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
 if(!ctx||cue?.game!=='popcorn'||!(width>0&&height>0)||!Number.isSafeInteger(cue.win)||cue.win<0){stats.fallbacks++;return false;}
 // Only the accepted native popcornDraw may create a monetary image. ALL
 // ignition is not a clear; the immutable trace snapshot owns the exact role.
 const p=cue.popcorn;
 if(cue.phase!=='popcornDraw'||!p||!Number.isInteger(p.count)||p.count<1||!Number.isInteger(p.chains)||p.chains<1||!Number.isInteger(p.clears)||p.clears<0){stats.fallbacks++;return false;}
 const role=roleOf(cue),image=images.get(role);if(!image){stats.fallbacks++;return false;}
 const aspect=sourceAspect(cue),w=Math.min(width,height*aspect),h=w/aspect,top=-h/2;
 const layout=LAYOUTS[role],label=liveLabel(cue),winText=Number(cue.win).toLocaleString('ja-JP')+' WIN';
 ctx.save();ctx.drawImage(image,-w/2,top,w,h);
 // POP! / ALL POP! is sculpted into each complete reward illustration.
 // Actual POP, chain/clear counts and the native received WIN stay live.
 confectionText(ctx,label,0,top+h*(layout.label-(mini?(role==='grand'?.015:.007):0)),h*(mini?.082:.066),w*(mini?.79:.75),true);
 // The owner supplies the accessible award meaning. Keep this lower space
 // entirely for the large live numerals instead of adding a competing label.
 const amountGlyphs=numberRun(ctx,cue.win,0,top+h*layout.amount,h*(mini?.191:.166),w*(mini?.80:.78));
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
 stats.last={game:'popcorn',role,phase:cue.phase,label:String(cue.label||''),detail:String(cue.detail||''),
  liveLabel:label,win:cue.win,winText,total:!!cue.total,mini,rasterNumbers:!!amountGlyphs,
  source:ROOT+FILES[role],glyphs:amountGlyphs||[],layout:{...layout},
  count:p.count,chains:p.chains,popped:p.popped,clears:p.clears,nativeWinDelta:p.nativeWinDelta};
 return true;
}
// The native boost trace and its existing elapsed/duration own this card.
// It changes the next refill's bomb rate and never creates a monetary cue.
function paintBoost(ctx,{trace,elapsed,duration,width,height,centerX=width/2,centerY=height/2,still=false}={}){
 const image=images.get('boost');
 if(!ctx||!image||!trace?.boost||trace.count!==0||!(width>0&&height>0))return false;
 const oldLevel=trace.oldLevel,newLevel=trace.newLevel;
 if(!Number.isInteger(oldLevel)||oldLevel<1||!Number.isInteger(newLevel)||newLevel!==oldLevel+1)return false;
 if(!(duration>0)||!Number.isFinite(elapsed)||elapsed<0||elapsed>=duration)return false;
 const ratio=elapsed/duration,fade=still?1:Math.min(1,ratio/.13,(1-ratio)/.14);if(fade<=0)return false;
 const aspect=image.naturalWidth/image.naturalHeight,w=Math.min(width,height*aspect),h=w/aspect;
 const label='補充Lv '+oldLevel+' → '+newLevel+' ・ 次の補充から';
 ctx.save();ctx.globalAlpha*=fade;ctx.translate(centerX,centerY);
 const zoom=still?1:.92+.08*Math.min(1,ratio/.22);ctx.scale(zoom,zoom);
 ctx.drawImage(image,-w/2,-h/2,w,h);
 confectionText(ctx,label,0,h*.34,h*.085,w*.75,true);
 if(!still){glint(ctx,-w*.36,-h*.08,h*.02,.7);glint(ctx,w*.36,h*.12,h*.017,.65);}
 ctx.restore();stats.statusPaints++;stats.statusRoles.boost++;
 stats.lastStatus={role:'boost',oldLevel,newLevel,label,source:ROOT+FILES.boost,elapsed,duration,still,win:null};
 return true;
}
document.fonts?.ready?.then(()=>textMetrics.clear());
window.PopcornAwardV299=Object.freeze({
 version:299,ready,paint,paintBoost,roleFor:roleOf,aspectFor:sourceAspect,get loaded(){return heroReady();},get aspect(){return sourceAspect({popcorn:{clear:false}});},
 describe:()=>({version:299,loaded:heroReady(),digitsReady:images.has('digits')&&glyphs.size===GLYPH_ORDER.length,
  files:Object.values(FILES).map(file=>ROOT+file),errors:errors.slice(),glyphRects:Object.fromEntries([...glyphs].map(([key,rect])=>[key,[...rect]])),
  ...stats,roles:{...stats.roles},statusRoles:{...stats.statusRoles},lastStatus:stats.lastStatus?{...stats.lastStatus}:null,last:stats.last?{...stats.last,glyphs:stats.last.glyphs.slice()}:null,
  limits:{mainGlints:6,miniGlints:2,textMetrics:128},cachedTextMetrics:textMetrics.size})
});
})();

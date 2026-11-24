/* Winery Pyramid's crystal illustrations and native award numerals.
 * The native award observer owns cues, timing, sound and accessibility. This
 * module composes generated pixels around its immutable result snapshot. */
(()=>{
'use strict';
if(window.WineryAwardV298)return;
const query=new URLSearchParams(location.search);
if(query.get('serverSettlementWorker')==='1'||query.get('downloadWorker')==='1')return;
if(window.SweetsLineup?.chosen&&!window.SweetsLineup.chosen.includes('winery'))return;
const ROOT='assets/winery-art-v298/';
const FILES=Object.freeze({full:'award-full.webp',allfull:'award-allfull.webp',odds:'award-odds.webp',boost:'award-boost.webp',digits:'award-digits.webp'});
const ROLES=Object.freeze(['full','allfull']);
const GLYPH_ORDER=Object.freeze(['0','1','2','3','4','5','6','7','8','9',',','WIN']);
const LAYOUTS=Object.freeze({full:Object.freeze({label:.622,amount:.785}),allfull:Object.freeze({label:.622,amount:.785})});
const images=new Map(),glyphs=new Map(),errors=[],textMetrics=new Map();
const stats={paints:0,main:0,mini:0,rasterAmounts:0,fallbackAmounts:0,fallbacks:0,
 roles:{full:0,allfull:0},statusPaints:0,statusRoles:{odds:0,boost:0},lastStatus:null,last:null};
const heroReady=()=>ROLES.every(role=>images.has(role));
function roleOf(cue){return cue?.winery?.full===21?'allfull':'full';}
function liveLabel(cue){
 const {full,mix}=cue.winery;
 return full===21?'21杯 全満！ ・ MIX '+mix+'杯':'満杯 '+full+' / 21杯 ・ MIX '+mix+'杯';
}
function sourceAspect(cue){
 const source=images.get(roleOf(cue));return source?source.naturalWidth/source.naturalHeight:1.5;
}
function prepareGlyphs(source){
 // The artist owns the lettering. Inspect alpha once to remove transparent
 // gutters from each registered 4-by-3 cell, never recolour or redraw it.
 const cv=document.createElement('canvas');cv.width=source.naturalWidth;cv.height=source.naturalHeight;
 const ctx=cv.getContext('2d',{willReadFrequently:true});if(!ctx)throw Error('Winery numeral canvas unavailable');
 ctx.drawImage(source,0,0);const {data}=ctx.getImageData(0,0,cv.width,cv.height),found=new Map();
 for(let index=0;index<GLYPH_ORDER.length;index++){
  const col=index%4,row=Math.floor(index/4),x0=Math.round(col*cv.width/4),x1=Math.round((col+1)*cv.width/4);
  const y0=Math.round(row*cv.height/3),y1=Math.round((row+1)*cv.height/3);
  let left=x1,top=y1,right=x0-1,bottom=y0-1;
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(data[(y*cv.width+x)*4+3]>=18){
   if(x<left)left=x;if(x>right)right=x;if(y<top)top=y;if(y>bottom)bottom=y;
  }
  if(right<left||bottom<top)throw Error('Missing winery numeral '+GLYPH_ORDER[index]);
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
 image.onerror=()=>{errors.push('Missing '+ROOT+file);resolve(false);};image.src=ROOT+file+'?v=298';
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
 ctx.strokeStyle=dark?'#fff6d1':'#68225c';ctx.lineWidth=Math.max(.5,size*.20);ctx.strokeText(value,0,size*.035);
 ctx.strokeStyle=dark?'#a4574c':'#c38b62';ctx.lineWidth=Math.max(.25,size*.07);ctx.strokeText(value,0,0);
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
 if(!ctx||cue?.game!=='winery'||!(width>0&&height>0)||!Number.isSafeInteger(cue.win)||cue.win<0){stats.fallbacks++;return false;}
 // The immutable native wineryAward owns this presentation. Odds and boost
 // phases are information only; they never become a second monetary award.
 if(cue.phase!=='wineryAward'||!cue.winery||!Number.isInteger(cue.winery.full)||!Number.isInteger(cue.winery.mix)||cue.winery.justFilledCount<1){stats.fallbacks++;return false;}
 const role=roleOf(cue),image=images.get(role);if(!image){stats.fallbacks++;return false;}
 const aspect=sourceAspect(cue),w=Math.min(width,height*aspect),h=w/aspect,top=-h/2;
 const layout=LAYOUTS[role],label=liveLabel(cue),winText=Number(cue.win).toLocaleString('ja-JP')+' WIN';
 ctx.save();ctx.drawImage(image,-w/2,top,w,h);
 // FULL GLASS! / ALL FULL! is sculpted into the hero image.
 // Its actual full and MIX counts and the native cue WIN remain live.
 confectionText(ctx,label,0,top+h*(layout.label-(mini?.007:0)),h*(mini?.082:.066),w*(mini?.79:.75));
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
 stats.last={game:'winery',role,phase:cue.phase,label:String(cue.label||''),detail:String(cue.detail||''),
  liveLabel:label,win:cue.win,winText,total:!!cue.total,mini,rasterNumbers:!!amountGlyphs,
  source:ROOT+FILES[role],glyphs:amountGlyphs||[],layout:{...layout}};
 return true;
}
// Draw on the existing host canvas only while the native information FX is
// active. No timers, queues, game fields or extra WIN are introduced here.
function paintStatus(ctx,{fx,width,height,still=false}={}){
 if(!ctx||!fx||!['odds','boost'].includes(fx.type)||!(width>0&&height>0))return false;
 const role=fx.type,image=images.get(role);if(!image)return false;
 if(role==='odds'&&(!Number.isInteger(fx.fromMix)||!Number.isInteger(fx.toMix)||fx.toMix<=fx.fromMix||fx.toMix>21))return false;
 if(role==='boost'&&![2,4,8,16].includes(fx.power))return false;
 const duration=Number(fx.duration),elapsed=Number(fx.elapsed);
 if(!(duration>0)||!Number.isFinite(elapsed)||elapsed<0||elapsed>duration)return false;
 const ratio=Math.max(0,Math.min(1,elapsed/duration));
 const fade=still?1:Math.min(1,ratio/.15,(1-ratio)/.14);
 if(fade<=0)return false;
 const w=Math.min(width*.61,height*.84*(image.naturalWidth/image.naturalHeight)),h=w*image.naturalHeight/image.naturalWidth;
 const label=role==='odds'?'MIX '+fx.toMix+'杯  ×'+(1+fx.toMix/10).toFixed(1):'次の注入量 '+fx.power+'杯';
 ctx.save();ctx.globalAlpha*=fade;ctx.translate(width*.448,height*.43);
 const zoom=still?1:.92+.08*Math.min(1,ratio/.22);ctx.scale(zoom,zoom);
 ctx.drawImage(image,-w/2,-h/2,w,h);
 confectionText(ctx,label,0,h*.30,h*.105,w*.73);
 if(!still){glint(ctx,-w*.36,-h*.08,h*.02,.7);glint(ctx,w*.36,h*.12,h*.017,.65);}
 ctx.restore();stats.statusPaints++;stats.statusRoles[role]++;
 stats.lastStatus={role,fromMix:role==='odds'?fx.fromMix:null,toMix:role==='odds'?fx.toMix:null,power:role==='boost'?fx.power:null,label,source:ROOT+FILES[role],elapsed,duration,still,win:null};
 return true;
}
document.fonts?.ready?.then(()=>textMetrics.clear());
window.WineryAwardV298=Object.freeze({
 version:298,ready,paint,paintStatus,aspectFor:sourceAspect,get loaded(){return heroReady();},get aspect(){return sourceAspect({winery:{full:10}});},
 describe:()=>({version:298,loaded:heroReady(),digitsReady:images.has('digits')&&glyphs.size===GLYPH_ORDER.length,
  files:Object.values(FILES).map(file=>ROOT+file),errors:errors.slice(),glyphRects:Object.fromEntries([...glyphs].map(([key,rect])=>[key,[...rect]])),
  ...stats,roles:{...stats.roles},statusRoles:{...stats.statusRoles},lastStatus:stats.lastStatus?{...stats.lastStatus}:null,last:stats.last?{...stats.last,glyphs:stats.last.glyphs.slice()}:null,
  limits:{mainGlints:6,miniGlints:2,textMetrics:128},cachedTextMetrics:textMetrics.size})
});
})();

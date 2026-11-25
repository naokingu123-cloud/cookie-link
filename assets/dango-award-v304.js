/* Dango's complete mochi award sculptures. The native shared owner supplies
 * immutable completed-line/FREE snapshots, exact current WIN and timing. */
(()=>{
'use strict';
if(window.DangoAwardV304)return;
const query=new URLSearchParams(location.search);
if(query.get('serverSettlementWorker')==='1'||query.get('downloadWorker')==='1')return;
if(window.SweetsLineup?.chosen&&!window.SweetsLineup.chosen.includes('dango'))return;
const ROOT='assets/dango-art-v304/';
const FILES=Object.freeze({bingo:'award-bingo.webp',highest:'award-highest.webp',free:'award-free.webp',digits:'award-digits.webp'});
const GLYPHS=Object.freeze(['0','1','2','3','4','5','6','7','8','9',',','WIN']);
// Registered from the finished source's actual transparent gutters. These
// retain the complete first-row descenders and the wider final WIN word.
const ROW_CUTS=Object.freeze([0,370/1024,700/1024,1]),WIN_CUT=.72;
const LAYOUTS=Object.freeze({bingo:Object.freeze({label:.558,caption:.640,amount:.768,labelWidth:.65,amountWidth:.70}),highest:Object.freeze({label:.543,caption:.627,amount:.759,labelWidth:.49,amountWidth:.61}),free:Object.freeze({label:.599,caption:.758})});
const images=new Map(),glyphs=new Map(),errors=[],textMetrics=new Map();
const stats={paints:0,main:0,mini:0,rasterAmounts:0,fallbackAmounts:0,fallbacks:0,roles:{bingo:0,highest:0,free:0},last:null};
const heroReady=()=>images.has('bingo')&&images.has('highest')&&images.has('free');
function roleFor(cue){return cue?.dango?.highestRoles?.length?'highest':cue?.dango?.newLineCount?'bingo':'free';}
function aspectFor(cue){const source=images.get(roleFor(cue));return source?source.naturalWidth/source.naturalHeight:1.5;}
function liveLabel(cue,role){
 const d=cue.dango;
 if(role==='free')return 'FREE ＋'+d.freeGain;
 if(role==='highest')return d.highestRoles.join('・')+'個ライン成立';
 return d.totalLines+'ライン完成 ・ 今回'+d.newLineCount+'個';
}
function prepareGlyphs(source){
 const cv=document.createElement('canvas');cv.width=source.naturalWidth;cv.height=source.naturalHeight;
 const ctx=cv.getContext('2d',{willReadFrequently:true});if(!ctx)throw Error('Dango numeral canvas unavailable');
 ctx.drawImage(source,0,0);const {data}=ctx.getImageData(0,0,cv.width,cv.height);
 for(let index=0;index<GLYPHS.length;index++){
  const col=index%4,row=Math.floor(index/4),x0=Math.round((index===11?WIN_CUT:col/4)*cv.width),x1=Math.round((index===10?WIN_CUT:(col+1)/4)*cv.width);
  const y0=Math.round(ROW_CUTS[row]*cv.height),y1=Math.round(ROW_CUTS[row+1]*cv.height);
  let left=x1,top=y1,right=x0-1,bottom=y0-1;
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(data[(y*cv.width+x)*4+3]>=18){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  if(right<left||bottom<top)throw Error('Missing Dango numeral '+GLYPHS[index]);
  left=Math.max(x0,left-1);top=Math.max(y0,top-1);right=Math.min(x1-1,right+1);bottom=Math.min(y1-1,bottom+1);
  glyphs.set(GLYPHS[index],Object.freeze([left,top,right-left+1,bottom-top+1]));
 }
}
const ready=Promise.all(Object.entries(FILES).map(([name,file])=>new Promise(resolve=>{
 const image=new Image();image.decoding='async';
 image.onload=()=>{if(!(image.naturalWidth>0&&image.naturalHeight>0)){errors.push('Invalid '+file);resolve(false);return;}
  images.set(name,image);if(name==='digits')try{prepareGlyphs(image);}catch(error){errors.push(String(error?.message||error));}resolve(true);};
 image.onerror=()=>{errors.push('Missing '+ROOT+file);resolve(false);};image.src=ROOT+file+'?v=304';
}))).then(()=>heroReady());
function measured(ctx,value,font){
 const key=font+'\n'+value;if(textMetrics.has(key))return textMetrics.get(key);ctx.font=font;const width=ctx.measureText(value).width;
 if(textMetrics.size>=128)textMetrics.delete(textMetrics.keys().next().value);textMetrics.set(key,width);return width;
}
function crystalText(ctx,value,x,y,size,maxWidth,dark=false){
 if(!value)return;const font='900 '+size+'px "M PLUS Rounded 1c","Noto Sans JP",system-ui,sans-serif';
 ctx.save();ctx.font=font;ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';
 ctx.translate(x,y);ctx.scale(Math.min(1,maxWidth/Math.max(1,measured(ctx,value,font))),1);
 ctx.strokeStyle=dark?'#fff8dc':'#183424';ctx.lineWidth=Math.max(.4,size*.16);ctx.strokeText(value,0,size*.025);
 const face=ctx.createLinearGradient(0,-size*.5,0,size*.5);face.addColorStop(0,dark?'#233c28':'#ffffee');face.addColorStop(.48,dark?'#365a35':'#fff0b8');face.addColorStop(1,dark?'#203a28':'#e9c377');
 ctx.fillStyle=face;ctx.fillText(value,0,0);ctx.restore();
}
function numberRun(ctx,value,x,y,height,maxWidth){
 const source=images.get('digits'),characters=Array.from(Number(value).toLocaleString('ja-JP'));
 if(!source||characters.some(char=>!glyphs.has(char))||!glyphs.has('WIN'))return null;
 const parts=characters.map(char=>{const rect=glyphs.get(char),punctuation=char===',',h=punctuation?height*.43:height;return {char,rect,h,w:h*rect[2]/rect[3],punctuation};});
 const gap=height*.025,win=glyphs.get('WIN'),winH=height*.43,winW=winH*win[2]/win[3];
 const natural=parts.reduce((sum,p)=>sum+p.w,0)+gap*Math.max(0,parts.length-1)+height*.15+winW,scale=Math.min(1,maxWidth/Math.max(1,natural));let left=x-natural*scale/2;
 for(const part of parts){const top=y-height*scale/2+(part.punctuation?height*.53*scale:0);ctx.drawImage(source,...part.rect,left,top,part.w*scale,part.h*scale);left+=(part.w+gap)*scale;}
 left+=height*.125*scale;ctx.drawImage(source,...win,left,y+height*.05*scale,winW*scale,winH*scale);return [...characters,'WIN'];
}
function glint(ctx,x,y,size,alpha){
 ctx.save();ctx.translate(x,y);ctx.globalAlpha*=alpha;ctx.fillStyle='#fffcea';ctx.beginPath();
 ctx.moveTo(0,-size);ctx.quadraticCurveTo(size*.13,-size*.13,size,0);ctx.quadraticCurveTo(size*.13,size*.13,0,size);ctx.quadraticCurveTo(-size*.13,size*.13,-size,0);ctx.quadraticCurveTo(-size*.13,-size*.13,0,-size);ctx.fill();ctx.restore();
}
function paint(ctx,{cue,width,height,mini=false,age=0,still=false}={}){
 const d=cue?.dango;
 if(!ctx||cue?.game!=='dango'||cue.phase!=='settled'||cue.total!==true||!d||!(width>0&&height>0)||!Number.isSafeInteger(cue.win)||cue.win<0||
  !Number.isInteger(d.totalLines)||d.totalLines<0||!Number.isInteger(d.newLineCount)||d.newLineCount<0||d.newLineCount>d.totalLines||!(d.oddsMultiplier>=1)||
  !Array.isArray(d.highestRoles)||(!d.newLineCount&&!d.highestRoles.length&&!(d.freeGain>0))){stats.fallbacks++;return false;}
 const role=roleFor(cue),image=images.get(role);if(!image){stats.fallbacks++;return false;}
 const aspect=aspectFor(cue),w=Math.min(width,height*aspect),h=w/aspect,top=-h/2,layout=LAYOUTS[role],label=liveLabel(cue,role);
 const caption=role==='free'?'配置FREE 合計'+d.freeBudget+'個':'現在の配当 ・ ODDS '+d.oddsMultiplier+'倍';
 const winText=role==='free'?'':Number(cue.win).toLocaleString('ja-JP')+' WIN';let amountGlyphs=null;
 ctx.save();ctx.drawImage(image,-w/2,top,w,h);
 if(role==='free'){
  crystalText(ctx,label,0,top+h*layout.label,h*(mini?.12:.10),w*.64);
  crystalText(ctx,caption,0,top+h*layout.caption,h*(mini?.079:.062),w*.43,true);
 }else{
  crystalText(ctx,label,0,top+h*layout.label,h*(mini?.067:.058),w*layout.labelWidth,true);
  crystalText(ctx,caption,0,top+h*layout.caption,h*(mini?.047:.041),w*.46,true);
  // A completed line can legitimately have zero payout. Its current total is
  // still shown; placement-only FREE growth never manufactures a monetary cue.
  amountGlyphs=numberRun(ctx,cue.win,0,top+h*layout.amount,h*(mini?.151:.143),w*layout.amountWidth);
  if(amountGlyphs)stats.rasterAmounts++;else{stats.fallbackAmounts++;crystalText(ctx,winText,0,top+h*layout.amount,h*.132,w*layout.amountWidth);}
 }
 if(!still){const points=mini?[[-.39,-.17],[.38,.20]]:[[-.39,-.17],[.38,.20],[-.27,.36],[.29,-.32],[-.41,.10],[.41,-.08]];
  for(let i=0;i<points.length;i++){const phase=(age/1650+i*.181)%1,[x,y]=points[i];glint(ctx,w*x,h*y,(mini?2:3.3)*(1+(i%2)*.2),.18+.6*Math.sin(Math.PI*phase)**2);}}
 ctx.restore();stats.paints++;stats[mini?'mini':'main']++;stats.roles[role]++;
 stats.last={game:'dango',role,phase:cue.phase,label:String(cue.label||''),detail:String(cue.detail||''),liveLabel:label,caption,amountLabel:role==='free'?'':'現在の配当',
  win:role==='free'?null:cue.win,winText,total:true,mini,rasterNumbers:!!amountGlyphs,source:ROOT+FILES[role],glyphs:amountGlyphs||[],layout:{...layout},
  totalLines:d.totalLines,newLineCount:d.newLineCount,highestRoles:d.highestRoles.slice(),oddsMultiplier:d.oddsMultiplier,freeGain:d.freeGain,freeBudget:d.freeBudget};
 return true;
}
document.fonts?.ready?.then(()=>textMetrics.clear());
window.DangoAwardV304=Object.freeze({version:304,ready,paint,roleFor,aspectFor,get loaded(){return heroReady();},get aspect(){return aspectFor({});},
 describe:()=>({version:304,loaded:heroReady(),digitsReady:images.has('digits')&&glyphs.size===GLYPHS.length,files:Object.values(FILES).map(file=>ROOT+file),errors:errors.slice(),glyphRects:Object.fromEntries([...glyphs].map(([key,rect])=>[key,[...rect]])),glyphGrid:{columns:4,rows:3,rowCuts:[...ROW_CUTS],bottomCommaWinCut:WIN_CUT},...stats,roles:{...stats.roles},last:stats.last?{...stats.last,glyphs:stats.last.glyphs.slice()}:null,limits:{mainGlints:6,miniGlints:2,textMetrics:128},cachedTextMetrics:textMetrics.size})});
})();

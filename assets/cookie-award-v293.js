/* Cookie Link's illustrated pastry lettering and live caramel-gold numerals.
 * A presentation-only renderer: the existing award observer supplies a frozen
 * event snapshot and still owns timing, accessibility, sound and lifecycle.
 */
(()=>{
'use strict';
if(window.CookieAwardV293)return;
const query=new URLSearchParams(location.search);
if(query.get('serverSettlementWorker')==='1'||query.get('downloadWorker')==='1')return;
if(window.SweetsLineup?.chosen&&!window.SweetsLineup.chosen.includes('cookie'))return;
const ROOT='assets/cookie-art-v293/';
const FILES={link:'award-link.webp',clear:'award-clear.webp',digits:'award-digits.webp'};
const images=new Map(),failures=[];
// Source rectangles measured from the generated 1254-square lettering atlas.
// The comma and WIN are deliberately cropped independently of the grid: the
// artist gives the three-letter word a wider natural advance than a digit.
const GLYPHS={
 '0':[27,67,267,312],'1':[362,61,220,314],
 '2':[654,64,256,313],'3':[970,64,254,317],
 '4':[26,480,272,320],'5':[342,479,252,325],
 '6':[649,480,264,324],'7':[962,481,264,319],
 '8':[24,893,265,324],'9':[341,892,262,324],
 ',':[715,1040,138,170],WIN:[921,970,333,163]
};
const stats={paints:0,mainPaints:0,miniPaints:0,rasterAmounts:0,fallbackAmounts:0,last:null};
const ready=Promise.all(Object.entries(FILES).map(([key,file])=>new Promise(resolve=>{
 const image=new Image();image.decoding='async';
 image.onload=()=>{if(image.naturalWidth>0&&image.naturalHeight>0){images.set(key,image);resolve(true);}else{failures.push(file);resolve(false);}};
 image.onerror=()=>{failures.push(file);resolve(false);};
 image.src=ROOT+file+'?v=293';
}))).then(()=>images.has('link')&&images.has('clear'));

function liveLabel(cue){
 const snapshot=cue.cookie||{};
 const count=Number(snapshot.link??String(cue.label||'').match(/^(\d+)\s+LINK/)?.[1]);
 if(cue.kind==='clear')return Math.max(1,Number(snapshot.clears)||1)+'回目の全消し達成！';
 return Number.isFinite(count)?Math.max(0,Math.trunc(count))+'枚リンク達成！':String(cue.label||'LINK!');
}
function confectionText(ctx,value,x,y,size,maxWidth,{dark=false}={}){
 ctx.save();ctx.font='900 '+size+'px "M PLUS Rounded 1c","Noto Sans JP",sans-serif';
 const width=ctx.measureText(value).width,fit=Math.min(1,maxWidth/Math.max(1,width));
 ctx.translate(x,y);ctx.scale(fit,1);ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';
 // Strawberry-jam extrusion, a cream edge and a reflective caramel face.
 ctx.strokeStyle=dark?'#fff2c2':'#68221e';ctx.lineWidth=Math.max(1.3,size*.16);
 ctx.strokeText(value,0,size*.055);ctx.strokeStyle=dark?'#a45527':'#a74e21';
 ctx.lineWidth=Math.max(.65,size*.065);ctx.strokeText(value,0,0);
 const face=ctx.createLinearGradient(0,-size*.5,0,size*.5);
 face.addColorStop(0,dark?'#5b281a':'#fffdeb');face.addColorStop(.43,dark?'#74331b':'#fff0a5');
 face.addColorStop(.47,dark?'#4c2117':'#ffe178');face.addColorStop(1,dark?'#55281c':'#f4b544');
 ctx.fillStyle=face;ctx.fillText(value,0,0);ctx.restore();
}
function numberRun(ctx,value,x,y,height,maxWidth){
 const source=images.get('digits');if(!source)return false;
 const chars=Array.from(Number(value).toLocaleString('ja-JP'));
 if(chars.some(char=>!GLYPHS[char]))return false;
 // Each glyph keeps its own optical width; punctuation sits on the baseline.
 const metrics=chars.map(char=>{
  const rect=GLYPHS[char],h=char===','?height*.52:height;
  return {rect,h,w:h*rect[2]/rect[3],punctuation:char===','};
 });
 const gap=height*.025,winH=height*.43,win=GLYPHS.WIN,winW=winH*win[2]/win[3];
 const natural=metrics.reduce((sum,m)=>sum+m.w,0)+gap*Math.max(0,chars.length-1)+height*.13+winW;
 const fit=Math.min(1,maxWidth/natural),sx=source.naturalWidth/1254,sy=source.naturalHeight/1254;
 let left=x-natural*fit/2;
 for(const m of metrics){
  const [u,v,w,h]=m.rect,top=y-height*fit/2+(m.punctuation?height*.49*fit:0);
  ctx.drawImage(source,u*sx,v*sy,w*sx,h*sy,left,top,m.w*fit,m.h*fit);
  left+=(m.w+gap)*fit;
 }
 left+=height*.105*fit;
 ctx.drawImage(source,win[0]*sx,win[1]*sy,win[2]*sx,win[3]*sy,left,y+height*.04*fit,winW*fit,winH*fit);
 return true;
}
function glint(ctx,x,y,size,alpha){
 const source=images.get('clear')||images.get('link');if(!source)return;
 // A real painted sugar-star from the top of the award, cached in the source.
 ctx.save();ctx.globalAlpha*=alpha;
 const sx=source.naturalWidth/1536,sy=source.naturalHeight/1024;
 ctx.drawImage(source,554*sx,20*sy,78*sx,92*sy,x-size/2,y-size*.59,size,size*1.18);
 ctx.restore();
}
function paint(ctx,{cue,width,height,mini=false,age=0,still=false}={}){
 if(!ctx||cue?.game!=='cookie'||!(width>0&&height>0)||!Number.isSafeInteger(cue.win)||cue.win<0)return false;
 const kind=cue.kind==='clear'?'clear':'link',image=images.get(kind);if(!image)return false;
 const w=Math.min(width,height*1.5),h=w/1.5,left=-w/2,top=-h/2;
 ctx.save();
 ctx.drawImage(image,left,top,w,h);
 const ribbonY=kind==='clear'?.586:.553;
 const label=mini?(kind==='clear'?Math.max(1,Number(cue.cookie?.clears)||1)+'回目':String(cue.label||'LINK!')):liveLabel(cue);
 confectionText(ctx,label,0,top+h*ribbonY,h*(mini?.105:.071),w*(mini?.54:.455));
 const totalText=cue.total?'獲得合計':'今回の獲得';
 if(!mini)confectionText(ctx,totalText,0,top+h*.657,h*.047,w*.45,{dark:true});
 const raster=numberRun(ctx,cue.win,0,top+h*.748,h*(mini?.185:.136),w*(mini?.64:.59));
 if(raster)stats.rasterAmounts++;
 else{
  stats.fallbackAmounts++;
  confectionText(ctx,Number(cue.win).toLocaleString('ja-JP')+' WIN',0,top+h*.748,h*.119,w*.58,{dark:true});
 }
 // A bounded sheen and two/five painted glints finish with the existing cue.
 // Nothing starts its own timer and reduced-motion mode draws only the art.
 if(!still){
  const count=mini?2:cue.tier>=3?5:3;
  for(let i=0;i<count;i++){
   const phase=(age/1700+i*.27)%1,angle=i*2.399+.4;
   glint(ctx,Math.cos(angle)*w*.42,Math.sin(angle)*h*.43,
    w*(mini?.035:.045),.25+.65*Math.sin(Math.PI*phase));
  }
 }
 ctx.restore();
 stats.paints++;stats[mini?'miniPaints':'mainPaints']++;
 stats.last={game:'cookie',kind,tier:cue.tier,win:cue.win,total:!!cue.total,
  label:liveLabel(cue),mini,rasterNumbers:raster,source:ROOT+FILES[kind]};
 return true;
}
window.CookieAwardV293=Object.freeze({
 version:293,ready,paint,get loaded(){return images.has('link')&&images.has('clear');},
 describe:()=>({version:293,ready:images.has('link')&&images.has('clear'),
  digitsReady:images.has('digits'),files:Object.values(FILES).map(file=>ROOT+file),
  failures:failures.slice(),...stats,last:stats.last?{...stats.last}:null,games:['cookie']})
});
})();

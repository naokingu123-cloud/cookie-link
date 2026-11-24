/* Real Canvas integration. Native reachable traces feed the production owner,
 * badge sizing, crystal awards, material cache and JellyView. This is not a
 * browser/input/wallet test; old 950/1000 font weights have a documented native
 * font-backend limitation, never an in-test production-font rewrite. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createCanvas,Image,Path2D,GlobalFonts} from '@napi-rs/canvas';
import {BASELINE_CORE_SHA256,BASELINE_HOST_SHA256,nativeCore,nativeHost,sha256,plain,buildJellyFixtures,replayJellyFixture,reviveJellyState,serializeJellyState,serializeJellyTrace,independentHundredths,independentComponents,ORACLE_EDGES,RECIPES,fixtureSummary} from './jelly-v300-fixtures.mjs';
import {loadJellyOwner,inspectJellyCue} from './jelly-v300-awards.mjs';

const root=process.cwd(),out=path.resolve(root,'tempqa-jelly-v300');fs.mkdirSync(out,{recursive:true});
const reportFile=path.join(out,'native-render-report.json'),read=file=>fs.readFileSync(path.resolve(root,file),'utf8'),hash=file=>sha256(fs.readFileSync(path.resolve(root,file)));
const artFile='assets/jelly-art-v300.js',awardFile='assets/jelly-award-v300.js',viewFile='assets/jelly-view.js',ownerFile='assets/award-presentation-v277.js',provenanceFile='assets/jelly-art-v300/generation-provenance.json';
const assetNames=['award-bingo','award-all-line','award-digits','glass-kit','syrup-surface','payout-cabinet','furniture-atlas','award-odds-up'],assets=assetNames.map(name=>'assets/jelly-art-v300/'+name+'.webp');
const report={ok:false,scope:'Actual native Canvas: reachable core states, shared semantic snapshots, badge sizing, generated artwork, native vector board numbers and JellyView. Browser CSS/input/scheduling/audio/wallet/deployment require browser CI. Existing native 950/1000 font weights and legacy CJK family fallback are rendered unchanged; Skia size parsing and missing CJK fallback are reported separately and are not Chrome regressions. Dedicated Award labels use the actual explicit Japanese face.',money:[],boards:[],odds:[],surfaces:[],legacyFontBackend:[],errors:[]};
const writeReport=()=>fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');writeReport();
const font='/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc';if(fs.existsSync(font))GlobalFonts.registerFromPath(font,'Noto Sans JP');
// Register the actual bundled face; a serif substitute has different comma
// descenders and cannot establish whether the native payout rows fit.
const nativeFonts={ArcadePayout:'optimized/media/a73bbbdd98d48aac.woff2',SweetReachRounded:'optimized/media/1d0a185e6cc3dc64.woff2'};
for(const [family,file] of Object.entries(nativeFonts))assert(GlobalFonts.register(fs.readFileSync(path.resolve(root,file)),family),'native font '+family);
const sourceFiles=new WeakMap(),traces=new WeakMap(),canvases=[],loadedFiles=new Set(),media={matches:false};let readbacks=0;
const fresh=()=>({ops:[],sources:new Set()});
function freeze(value){if(value&&typeof value==='object'){Object.freeze(value);for(const child of Object.values(value))freeze(child);}return value;}
function point(ctx,x,y){const m=ctx.getTransform();return {x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f};}
function bounds(ctx,x,y,w,h){const p=[[x,y],[x+w,y],[x,y+h],[x+w,y+h]].map(([a,b])=>point(ctx,a,b));return {left:Math.min(...p.map(v=>v.x)),top:Math.min(...p.map(v=>v.y)),right:Math.max(...p.map(v=>v.x)),bottom:Math.max(...p.map(v=>v.y))};}
function canvas(width=300,height=150){
 const cv=createCanvas(width,height),ctx=cv.getContext('2d');traces.set(cv,fresh());canvases.push(cv);
 const draw=ctx.drawImage.bind(ctx),fill=ctx.fillText.bind(ctx),pixels=ctx.getImageData.bind(ctx);
 ctx.getImageData=(...args)=>{readbacks++;return pixels(...args);};
 ctx.drawImage=function(image,...args){
  const result=draw(image,...args),trace=traces.get(cv),file=sourceFiles.get(image),inherited=traces.get(image),sources=file?[file]:[...(inherited?.sources||[])];
  const iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height,sourceRect=args.length===8?args.slice(0,4):[0,0,iw,ih];
  const dest=args.length===8?args.slice(4):args.length===4?args:[args[0],args[1],iw,ih];
  sources.forEach(s=>trace.sources.add(s));trace.ops.push({kind:'image',image,file:file||null,sources,sourceRect,dest,bounds:bounds(ctx,...dest),alpha:ctx.globalAlpha});return result;
 };
 ctx.fillText=function(value,...args){
  const text=String(value),m=ctx.measureText(text),x=args[0]||0,y=args[1]||0,advanceLeft=ctx.textAlign==='center'?-m.width/2:['right','end'].includes(ctx.textAlign)?-m.width:0;
  const left=Math.min(-m.actualBoundingBoxLeft,advanceLeft),right=Math.max(m.actualBoundingBoxRight,advanceLeft+m.width),fit=args[2]>0?Math.min(1,args[2]/Math.max(1,m.width)):1;
  traces.get(cv).ops.push({kind:'text',text,font:ctx.font,size:Number(ctx.font.match(/([\d.]+)px/)?.[1]),width:m.width,maxWidth:args[2]??null,
   ascent:m.fontBoundingBoxAscent,descent:m.fontBoundingBoxDescent,inkAscent:m.actualBoundingBoxAscent,inkDescent:m.actualBoundingBoxDescent,anchor:point(ctx,x,y),bounds:bounds(ctx,x+left*fit,y-m.actualBoundingBoxAscent,(right-left)*fit,m.actualBoundingBoxAscent+m.actualBoundingBoxDescent),alpha:ctx.globalAlpha});
  return fill(value,...args);
 };return cv;
}
function reset(cv){traces.set(cv,fresh());cv.getContext('2d').clearRect(0,0,cv.width,cv.height);}
class LocalImage extends Image{
 set src(value){const file=path.posix.normalize(String(value).split('?')[0]);assert(file.startsWith('assets/')&&!file.includes('://'));assert(fs.existsSync(path.resolve(root,file)),file);sourceFiles.set(this,file);loadedFiles.add(file);super.src=fs.readFileSync(path.resolve(root,file));}
 get src(){return sourceFiles.get(this)||'';}
 addEventListener(type,fn){assert(['load','error'].includes(type));const key='on'+type,previous=this[key];this[key]=(...args)=>{previous?.(...args);fn(...args);};}
}
function section(source,start,end){const a=source.indexOf(start),b=source.indexOf(end,a+start.length);assert(a>=0&&b>a,'production boundary '+start);return source.slice(a,b);}
function check(label,fn){try{fn();return true;}catch(error){report.errors.push(label+': '+String(error?.stack||error));return false;}}
function serialOps(ops){return ops.map(({image,...op})=>op);}
function inside(b,w,h,label){assert(b.left>=-.25&&b.top>=-.25&&b.right<=w+.25&&b.bottom<=h+.25,label+' outside surface '+JSON.stringify(b));}
function within(b,frame,label){assert(b.left>=frame.left-.4&&b.top>=frame.top-.4&&b.right<=frame.right+.4&&b.bottom<=frame.bottom+.4,label+' outside frame '+JSON.stringify({b,frame}));}
function union(ops){assert(ops.length);return {left:Math.min(...ops.map(p=>p.bounds.left)),top:Math.min(...ops.map(p=>p.bounds.top)),right:Math.max(...ops.map(p=>p.bounds.right)),bottom:Math.max(...ops.map(p=>p.bounds.bottom))};}
function fontMetrics(ops){for(const op of ops.filter(p=>p.kind==='text'))assert(op.size>0&&op.ascent+op.descent>0&&op.ascent+op.descent<op.size*2.5,'new text has correct native font metrics: '+JSON.stringify(op));}
function legacyMetrics(ops){for(const op of ops.filter(p=>p.kind==='text')){
 const reason=op.ascent+op.descent>=op.size*2.5?'weight-parsed-as-size':/[\u3040-\u30ff\u3400-\u9fff]/.test(op.text)&&op.inkAscent+op.inkDescent===0?'legacy-cjk-fallback-missing':null;
 if(reason&&!report.legacyFontBackend.some(p=>p.font===op.font&&p.reason===reason))report.legacyFontBackend.push({reason,text:op.text,font:op.font,declaredSize:op.size,actualAscent:op.ascent,actualDescent:op.descent,inkAscent:op.inkAscent,inkDescent:op.inkDescent});
}}
function visiblePixels(cv){const data=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;let opaque=0;for(let i=3;i<data.length;i+=4)if(data[i]>24)opaque++;assert(opaque>cv.width*cv.height*.015);return opaque;}
function save(cv,name){fs.writeFileSync(path.join(out,name),cv.toBuffer('image/png'));return name;}
function nativeState(step,before=false){return freeze(reviveJellyState(before?step.before:step.after));}
function nativeTrace(step){return freeze({...plain({...step.trace,before:null}),before:reviveJellyState(step.trace.before)});}
function expectedGeometry(width,height,mini,id){
 let side,x,y;if(mini){side=Math.min(width,height);x=(width-side)/2;y=(height-side)/2;}
 else{const pad=Math.max(2,Math.min(width,height)*.018),gap=Math.max(4,Math.min(width,height)*.023);side=Math.min(height-pad*2,(width-gap-pad*2)*.669);const pw=Math.min(width-side-gap-2*pad,side*.66);x=(width-side-pw-gap)/2+pw+gap;y=(height-side)/2;}
 return {x:x+(92+id%5*100)*side/584,y:y+(92+Math.floor(id/5)*100)*side/584,r:44*side/584};
}
function sampleBounds(data,width,[x0,y0,x1,y1]){
 let l=x1,t=y1,r=-1,b=-1,edgePixels=0,count=0;
 for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(data[(y*width+x)*4+3]>=18){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);count++;if(x===x0||x===x1-1||y===y0||y===y1-1)edgePixels++;}
 return {left:l,top:t,right:r+1,bottom:b+1,edgePixels,count};
}

async function main(){
 assert.deepEqual([artFile,awardFile,provenanceFile,...assets].filter(file=>!fs.existsSync(path.resolve(root,file))),[]);
 assert.equal(sha256(nativeCore()),BASELINE_CORE_SHA256);assert.equal(sha256(nativeHost()),BASELINE_HOST_SHA256);
 const artCode=read(artFile),awardCode=read(awardFile),viewCode=read(viewFile),ownerCode=read(ownerFile),nativeApp=read('optimized/app-01.js'),provenance=JSON.parse(read(provenanceFile));
 assert.equal(provenance.version,300);assert.equal(provenance.assets.length,8);
 for(const asset of provenance.assets)assert.equal(hash('assets/jelly-art-v300/'+asset.file),asset.sha256,'the rendered file is the reviewed generated artifact');
 report.files=Object.fromEntries([artFile,awardFile,viewFile,ownerFile,'assets/jelly-rules.js','assets/jelly-host.js','optimized/app-01.js',provenanceFile,...assets,...Object.values(nativeFonts)].map(file=>[file,{bytes:fs.statSync(path.resolve(root,file)).size,sha256:hash(file)}]));
 report.atlasLayout=provenance.atlasLayout;report.font=fs.existsSync(font)?font:'system fallback';report.nativeFonts=nativeFonts;
 const semantic=loadJellyOwner(),classSet=new Set(),classList={add:name=>classSet.add(name),contains:name=>classSet.has(name)};
 const window={JellyRules:semantic.K,SweetsLineup:{chosen:['jelly'],ids:['jelly']},matchMedia:()=>media};
 const document={createElement(tag){assert.equal(tag,'canvas');return canvas();},fonts:{ready:Promise.resolve()},documentElement:{classList},body:{classList}};
 const safeMath=Object.create(Math);safeMath.random=()=>{throw Error('rendering sampled gameplay/ambient RNG');};
 const context=vm.createContext({window,document,Image:LocalImage,Path2D,location:{search:''},URLSearchParams,console,Promise,Math:safeMath,performance:{now:()=>0},matchMedia:()=>media,app:{locked:[3000]},
  drawSweetFrame:()=>{throw Error('loaded generated cabinet fell through to old furniture');}});
 // These are the actual native Path2D board numerals, not a placeholder font.
 vm.runInContext(section(nativeApp,'const elixirGlyphs=','const cookieFlavors='),context,{filename:'optimized/app-01.js#native-board-digits'});
 const nativeNumber=context.drawElixirNumber;
 context.drawElixirNumber=(ctx,value,x,y,size,...args)=>{traces.get(ctx.canvas).ops.push({kind:'number',text:String(value),size,anchor:point(ctx,x,y),bounds:bounds(ctx,x-size*.5,y-size*.4,size,size*.8)});return nativeNumber(ctx,value,x,y,size,...args);};
 vm.runInContext(artCode,context,{filename:artFile});vm.runInContext(awardCode,context,{filename:awardFile});
 assert.deepEqual(await Promise.all([window.JellyArtV300.ready,window.JellyAwardV300.ready]),[true,true]);
 const art=window.JellyArtV300,award=window.JellyAwardV300;assert(art.loaded&&award.loaded&&award.describe().digitsReady);
 assert.deepEqual(plain(art.describe().errors),[]);assert.deepEqual(plain(award.describe().errors),[]);
 vm.runInContext(viewCode,context,{filename:viewFile});await window.JellyView.assetsReady;const V=window.JellyView;
 media.matches=true;vm.runInContext(viewCode,context,{filename:viewFile+'#reduced'});await window.JellyView.assetsReady;const reducedV=window.JellyView;media.matches=false;window.JellyView=V;
 const badge=ownerCode.slice(0,ownerCode.indexOf('function recordFor('))+section(ownerCode,'function paintGameBadge(','function paintBadge(')+'\nwindow.__badge300=paintGameBadge;\n})();';
 vm.runInContext(badge,context,{filename:ownerFile+'#native-badge-sizing'});
 const fixtures=buildJellyFixtures(),byId=Object.fromEntries(fixtures.map(f=>[f.id,f]));report.fixtures=fixtures.map(fixtureSummary);
 const moneyCases=[
  {id:'bingo-zero-main',fixture:'low-bet',ball:5,width:430,height:372},
  {id:'bingo-total-one-mobile',fixture:'low-bet',ball:8,width:318,height:275},
  {id:'bingo-multi-main',fixture:'multi-line',ball:5,width:430,height:372},
  {id:'bingo-high-ten-main',fixture:'ten-line-odds',ball:7,width:430,height:372},
  {id:'all-90000000-main',fixture:'all-line',ball:8,width:430,height:372},
  {id:'all-90000000-mobile',fixture:'all-line',ball:8,width:318,height:275},
  {id:'zero-mini116',fixture:'low-bet',ball:5,width:116,height:116,mini:true},
  {id:'bingo-mini116',fixture:'multi-line',ball:5,width:116,height:116,mini:true},
  {id:'all-mini116',fixture:'all-line',ball:8,width:116,height:116,mini:true},
  {id:'all-mini47',fixture:'all-line',ball:8,width:47,height:47,mini:true},
  {id:'all-reduced',fixture:'all-line',ball:8,width:430,height:372,reduced:true},
  {id:'zero-reduced',fixture:'low-bet',ball:5,width:318,height:275,reduced:true}
 ],moneyContact=[];
 for(const spec of moneyCases){
  const fixture=byId[spec.fixture],step=fixture.steps[spec.ball-1],{cue:raw}=inspectJellyCue(semantic,step,fixture.bet),cue=freeze({...raw,age:900,duration:3100,serial:1});
  const before=JSON.stringify({snapshot:cue.jelly,state:serializeJellyState(cue.state),trace:step.trace}),cv=canvas(spec.width*2,spec.height*2),ctx=cv.getContext('2d');media.matches=!!spec.reduced;
  ctx.fillStyle='#193f48';ctx.fillRect(0,0,cv.width,cv.height);ctx.scale(2,2);
  const glints=window.__badge300(ctx,{},cue,spec.width,spec.height,!!spec.mini,0,0),ops=traces.get(cv).ops,d=plain(award.describe()),j=step.oracle;
  const label=spec.mini?j.totalLines+'本 ・ 今回'+j.newLineCount+'本':j.totalLines+(j.full12?'ライン 全完成':'ライン完成')+' ・ 今回'+j.newLineCount+'本';
  const caption=spec.mini?'':'現在の配当 ×'+j.oddsMultiplier.toFixed(1),glyphs=[...j.payoutWin.toLocaleString('ja-JP'),'WIN'];
  const digitOps=ops.filter(op=>op.file==='assets/jelly-art-v300/award-digits.webp'),labels=ops.filter(op=>op.kind==='text'&&op.text===label),captions=ops.filter(op=>op.kind==='text'&&op.text===caption),amountBounds=digitOps.length?union(digitOps):null;
  const ok=check(spec.id,()=>{
   assert.equal(JSON.stringify({snapshot:cue.jelly,state:serializeJellyState(cue.state),trace:step.trace}),before);assert.equal(d.last.role,j.role);assert.equal(d.last.liveLabel,label);assert.equal(d.last.caption,caption);
   assert.equal(d.last.win,j.payoutWin);assert.equal(d.last.winText,j.payoutWin.toLocaleString('ja-JP')+' WIN');assert.equal(d.last.total,true);assert.equal(d.last.amountLabel,'現在の配当');
   assert.equal(d.fallbackAmounts,0);assert(d.last.rasterNumbers);assert.deepEqual(d.last.glyphs,glyphs);
   assert.deepEqual(digitOps.map(op=>op.sourceRect),glyphs.map(char=>d.glyphRects[char]),'real atlas draws spell the actual total in order');
   const hero='assets/jelly-art-v300/award-'+(j.full12?'all-line':'bingo')+'.webp';assert(ops.some(op=>op.file===hero));assert.equal(d.last.source,hero);
   assert.equal(labels.length,1);assert.equal(captions.length,spec.mini?0:1);fontMetrics(ops);
   for(const op of [...digitOps,...labels,...captions])inside(op.bounds,cv.width,cv.height,'live amount/count/caption');
   assert(labels[0].bounds.bottom<=amountBounds.top,'count ribbon never overlaps sculpted WIN');
   if(captions.length){assert(labels[0].bounds.bottom<=captions[0].bounds.top);assert(captions[0].bounds.bottom<=amountBounds.top,'current-total caption stays above digits');}
   assert.equal(glints,spec.reduced?0:spec.mini?2:6);visiblePixels(cv);
  });
  const image=save(cv,spec.id+'.png'),row={...spec,ok,win:j.payoutWin,delta:j.deltaWin,label,caption,glyphs,sourceRects:digitOps.map(op=>op.sourceRect),amountBounds,text:serialOps([...labels,...captions]),image};
  if(['bingo-zero-main','all-90000000-main','all-mini116'].includes(spec.id)){
   const composite=canvas(cv.width,cv.height),cx=composite.getContext('2d'),elapsed=cue.delay+cue.age,view=spec.reduced?reducedV:V;
   const turn=elapsed<view.duration(step.trace)?nativeTrace(step):null;
   view.draw(cx,nativeState(step),{width:composite.width,height:composite.height,mini:!!spec.mini,time:elapsed,turn,elapsed,bet:fixture.bet});
   legacyMetrics(traces.get(composite).ops);cx.scale(2,2);window.__badge300(cx,{},cue,spec.width,spec.height,!!spec.mini,0,0);
   row.nativeComposite=save(composite,spec.id+'-native-composite.png');
  }
  report.money.push(row);moneyContact.push({spec,cv,label:label+' / '+j.payoutWin.toLocaleString('ja-JP')+' WIN'});
 }

 // All twelve complete glyphs, not just the digits in one selected amount.
 const digitImage=new LocalImage();digitImage.src='assets/jelly-art-v300/award-digits.webp';await digitImage.decode();const digitCv=canvas(digitImage.naturalWidth,digitImage.naturalHeight),dc=digitCv.getContext('2d');dc.drawImage(digitImage,0,0);
 const digitData=dc.getImageData(0,0,digitCv.width,digitCv.height).data,grid=provenance.atlasLayout.digits,glyphRects=plain(award.describe().glyphRects),glyphSheet=createCanvas(1120,640),gx=glyphSheet.getContext('2d');gx.fillStyle='#15353f';gx.fillRect(0,0,1120,640);
 for(const [index,glyph] of grid.order.entries()){
  const col=index%4,row=Math.floor(index/4),x0=Math.round((index===11?grid.bottomCommaWinCut:col/4)*digitCv.width),x1=Math.round((index===10?grid.bottomCommaWinCut:(col+1)/4)*digitCv.width),y0=Math.round(grid.rowCuts[row]*digitCv.height),y1=Math.round(grid.rowCuts[row+1]*digitCv.height);
  const observed=sampleBounds(digitData,digitCv.width,[x0,y0,x1,y1]),[sx,sy,sw,sh]=glyphRects[glyph];
  check('glyph '+glyph,()=>{assert(observed.count>0);assert.equal(observed.edgePixels,0);assert(sx>=x0&&sy>=y0&&sx+sw<=x1&&sy+sh<=y1);assert(sx<=observed.left&&sy<=observed.top&&sx+sw>=observed.right&&sy+sh>=observed.bottom,'whole sculpted glyph retained');});
  const k=Math.min(220/sw,145/sh),x=col*280,y=row*210;gx.drawImage(digitImage,sx,sy,sw,sh,x+140-sw*k/2,y+12+(145-sh*k)/2,sw*k,sh*k);gx.fillStyle='#fff2cf';gx.font='14px "Noto Sans JP"';gx.fillText(glyph+' ['+glyphRects[glyph].join(',')+']',x+12,y+184);
 }
 save(glyphSheet,'native-digit-contact.png');report.glyphRects=glyphRects;

 // Every cropped sprite traces to the registered actual generated file.
 const ad=plain(art.describe());assert.deepEqual([...ad.recipes].sort(),[...RECIPES].sort());
 for(const [name,rect] of Object.entries(ad.sourceRects)){
  const sprite=art.sprite(name),draws=traces.get(sprite).ops.filter(op=>op.kind==='image');
  check('sprite '+name,()=>{assert.equal(draws.length,1);assert.equal(draws[0].file,ad.sourceFiles[name]);assert.deepEqual(draws[0].sourceRect,rect);assert(rect[2]>0&&rect[3]>0);});
 }
 report.atlasEdges=[];
 for(const [file,registration] of [['glass-kit.webp',provenance.atlasLayout.glass],['furniture-atlas.webp',provenance.atlasLayout.furniture]]){
  const image=new LocalImage();image.src='assets/jelly-art-v300/'+file;await image.decode();const cv=canvas(image.naturalWidth,image.naturalHeight),cx=cv.getContext('2d');cx.drawImage(image,0,0);const data=cx.getImageData(0,0,cv.width,cv.height).data;
  registration.order.forEach((name,index)=>{if(!name)return;const col=index%registration.columns,row=Math.floor(index/registration.columns),x0=Math.round(col*cv.width/registration.columns),x1=Math.round((col+1)*cv.width/registration.columns),y0=Math.round(row*cv.height/registration.rows),y1=Math.round((row+1)*cv.height/registration.rows),observed=sampleBounds(data,cv.width,[x0,y0,x1,y1]),[sx,sy,sw,sh]=ad.sourceRects[name];
   const internal=[],outer=[];for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if((x===x0||x===x1-1||y===y0||y===y1-1)&&data[(y*cv.width+x)*4+3]>=18){const p={x,y,alpha:data[(y*cv.width+x)*4+3]};(x===0||y===0||x===cv.width-1||y===cv.height-1?outer:internal).push(p);}
   check('registered cell '+name,()=>{assert(observed.count>0);assert.equal(internal.length,0,'no sprite crosses any internal atlas-cell boundary');assert(sx>=x0&&sy>=y0&&sx+sw<=x1&&sy+sh<=y1);assert(sx<=observed.left&&sy<=observed.top&&sx+sw>=observed.right&&sy+sh>=observed.bottom);
    if(name==='rim')assert(outer.every(p=>p.y===0&&p.x>=309&&p.x<=317&&p.alpha<=19),'only the reviewed faint outer-edge rim glow is present');else assert.equal(outer.length,0);
   });report.atlasEdges.push({name,file,internalPixels:internal.length,outerPixels:outer});
  });
 }

 // Continuous surfaces retain the exact native recipe palette. The .12px
 // overlap samples the same board coordinate on each side of an open seam.
 const nativePalette=vm.runInNewContext(section(viewCode,'const syrup=','const laneColors=')+';JSON.stringify(syrup);');
 const generatedPalette=vm.runInNewContext(section(artCode,'const PALETTE=','for(const colors of Object.values(PALETTE))')+';JSON.stringify(PALETTE);');assert.equal(generatedPalette,nativePalette);
 for(const mini of [false,true])for(const recipe of RECIPES){
  const size=mini?128:500,surface=art.surface(recipe,mini),cv=canvas(500,500),ctx=cv.getContext('2d');for(let i=0;i<25;i++)assert(art.cell(ctx,i,recipe,mini));
  const draws=traces.get(cv).ops.filter(op=>op.kind==='image'),ok=check('surface '+size+'/'+recipe,()=>{
   assert.deepEqual([surface.width,surface.height],[size,size]);assert.equal(art.surface(recipe,mini),surface);assert.equal(draws.length,25);
   assert(traces.get(surface).sources.has('assets/jelly-art-v300/syrup-surface.webp'));
   draws.forEach((op,i)=>{const x=i%5*100,y=Math.floor(i/5)*100,left=Math.max(0,x-.12),top=Math.max(0,y-.12),right=Math.min(500,x+100.12),bottom=Math.min(500,y+100.12);assert.equal(op.image,surface);assert.deepEqual(op.dest,[left,top,right-left,bottom-top]);assert.deepEqual(op.sourceRect,op.dest.map(v=>v*size/500));});
   visiblePixels(cv);
  });report.surfaces.push({recipe,mini,size,ok});if(!mini)save(cv,'surface-'+recipe.replaceAll('+','-')+'.png');
 }
 assert.equal(art.describe().surfaceCacheCount,30);assert.equal(art.describe().surfaceCacheLimit,30);assert.deepEqual([art.floor().width,art.floor().height,art.rib().width,art.rib().height],[500,500,208,32]);

 // Continue below with actual native board, table, wave and odds drawing.
 const boardContact=[];
 function groupsFor(ops,image){
  const groups=[];let current=null;
  for(const op of ops){if(op.image===image){if(!current){current=[];groups.push(current);}current.push(op);}else current=null;}
  return groups;
 }
 function checkSlices(parts,image){
  assert(parts.length>0);let sourceY=0,destBottom=parts[0].bounds.top;
  for(const op of parts){const [x,y,w,h]=op.sourceRect;assert.equal(x,0);assert.equal(y,sourceY);assert.equal(w,image.width);assert(h>0);sourceY+=h;
   assert(Math.abs(op.bounds.top-destBottom)<1e-6);assert(Math.abs(op.bounds.left-parts[0].bounds.left)<1e-6);assert(Math.abs(op.bounds.right-parts[0].bounds.right)<1e-6);destBottom=op.bounds.bottom;}
  assert.equal(sourceY,image.height,'all of the real furniture source is retained, exactly once');return union(parts);
 }
 function checkTable(cv,state,bet,shownOdds=state.oddsMultiplier){
  const ops=traces.get(cv).ops,rows=[];let current=null;
  for(const op of ops){
   if(op.image===art.sprite('row')||op.image===art.sprite('all')){
    if(!current||current.text.length||current.image!==op.image){current={image:op.image,slices:[],text:[]};rows.push(current);}current.slices.push(op);
   }
   else if(current&&op.kind==='text'&&current.text.length<2)current.text.push(op);
  }
  const wanted=[12,10,9,8,7,6,5,4,3,2,1].map(n=>[n+'本',Math.floor(bet*independentHundredths(n,shownOdds,state.payoutVersion??0)/100).toLocaleString('en-US')]);
  assert.equal(rows.length,11);assert.deepEqual(rows.map(row=>row.text.map(op=>op.text)),wanted,'all eleven live native payout rows retain exact values');
  for(const row of rows){row.box=checkSlices(row.slices,row.image);fontMetrics(row.text);for(const op of row.text)within(op.bounds,row.box,'actual payout cell text');}
  for(const name of ['cabinet','phase','odds','sugar']){const image=art.sprite(name),groups=groupsFor(ops,image);assert.equal(groups.length,1,'one native '+name+' furniture group');checkSlices(groups[0],image);}
  return rows.map(row=>({bounds:row.box,slices:serialOps(row.slices),text:serialOps(row.text)}));
 }
 const boardCases=[
  {id:'board-opening-main430',fixture:'all-line',ball:1,before:true,width:430,height:372},
  {id:'board-full-main430',fixture:'all-line',ball:8,width:430,height:372},
  {id:'board-odds-high-mobile318',fixture:'ten-line-odds',ball:8,width:318,height:275},
  {id:'board-four-colors-main430',fixture:'four-color-odds',ball:8,width:430,height:372},
  {id:'board-four-colors-mini116',fixture:'four-color-odds',ball:8,width:116,height:116,mini:true},
  {id:'board-full-mini47',fixture:'all-line',ball:8,width:47,height:47,mini:true}
 ];
 for(const spec of boardCases){
  const f=byId[spec.fixture],step=f.steps[spec.ball-1],state=nativeState(step,spec.before),before=serializeJellyState(state),cv=canvas(spec.width,spec.height),ctx=cv.getContext('2d');media.matches=false;
  V.draw(ctx,state,{width:spec.width,height:spec.height,mini:!!spec.mini,time:5000,elapsed:Infinity,bet:f.bet});
  const ops=traces.get(cv).ops,numbers=ops.filter(op=>op.kind==='number'),cellDraws=ops.filter(op=>RECIPES.some(recipe=>op.image===art.surface(recipe,!!spec.mini))),groups=independentComponents(state.open),remaining=ORACLE_EDGES.filter(([a,b])=>groups[a]!==groups[b]).length;
  legacyMetrics(ops);let rows=[];
  const ok=check(spec.id,()=>{
   assert.deepEqual(serializeJellyState(state),before);assert.equal(numbers.length,25);assert.deepEqual(numbers.map(op=>Number(op.text)),state.numbers);
   for(let i=0;i<25;i++){const want=expectedGeometry(spec.width,spec.height,!!spec.mini,i),actual=V.hitGeometryV276(spec.width,spec.height,!!spec.mini,{id:i});for(const key of ['x','y','r'])assert(Math.abs(actual[key]-want[key])<1e-7);assert(Math.abs(numbers[i].anchor.x-want.x)<1e-5&&Math.abs(numbers[i].anchor.y-want.y)<1e-5);}
   assert.equal(cellDraws.length,state.colors.filter(Boolean).length);cellDraws.forEach(op=>{const i=Math.round(op.dest[1]/100)*5+Math.round(op.dest[0]/100);assert.equal(op.image,art.surface(state.colors[i],!!spec.mini));});
   assert.equal(ops.filter(op=>op.image===art.floor()).length,1);assert.equal(ops.filter(op=>op.image===art.sprite('rim')).length,8);assert.equal(ops.filter(op=>op.image===art.rib()).length,remaining);
   if(!spec.mini)rows=checkTable(cv,state,f.bet);visiblePixels(cv);
  });
  const image=save(cv,spec.id+'.png');report.boards.push({...spec,ok,rows,remainingPartitions:remaining,numbers:numbers.map(op=>({number:op.text,anchor:op.anchor})),sources:[...traces.get(cv).sources],image});boardContact.push({spec,cv,label:state.lines.length+' lines / native fonts unchanged'});
 }

 // Warm real wall-breaking and color-front paths, then prove that repeated
 // paints allocate no new canvas, perform no pixel scan and change no state.
 const animationCases=[{fixture:'all-line',ball:5,times:[0,189,190,350,500,700,1200]},{fixture:'four-color-odds',ball:6,times:[0,130,330,600,1000,1500]}];
 report.animations=[];
 for(const spec of animationCases){
  const f=byId[spec.fixture],step=f.steps[spec.ball-1],state=nativeState(step),turn=nativeTrace(step),before=JSON.stringify({state:serializeJellyState(state),trace:serializeJellyTrace(turn)}),cv=canvas(430,372),ctx=cv.getContext('2d');
  for(const elapsed of spec.times){reset(cv);V.draw(ctx,state,{width:430,height:372,time:elapsed,turn,elapsed,bet:f.bet});}
  const count=canvases.length,cachedPixels=art.describe().cachedPixels,reads=readbacks;
  for(const elapsed of spec.times){reset(cv);V.draw(ctx,state,{width:430,height:372,time:elapsed,turn,elapsed,bet:f.bet});}
  const ok=check('animation '+spec.fixture,()=>{assert.equal(canvases.length,count);assert.equal(art.describe().cachedPixels,cachedPixels);assert.equal(readbacks,reads,'no per-frame alpha scan');assert.equal(JSON.stringify({state:serializeJellyState(state),trace:serializeJellyTrace(turn)}),before);});
  report.animations.push({...spec,ok,warmedCanvases:count,cachedPixels,perFrameReadbacks:readbacks-reads});save(cv,spec.fixture+'-wave.png');
 }

 // ODDS-only is the native 1600ms status window. Both real layout branches
 // and reduced motion use real old/new multipliers, recipes and no WIN.
 const oddsStep=byId['ten-line-odds'].steps[7],statusState=nativeState(oddsStep),statusTrace=nativeTrace(oddsStep);
 for(const reduced of [false,true])for(const layout of [{id:'ribbon',width:430,height:372},{id:'sidebar',width:430,height:260}])for(const age of [-1,0,1,800,1599,1600]){
  const cv=canvas(layout.width,layout.height),ctx=cv.getContext('2d'),old=art.describe().oddsPopup,moneyBefore=award.describe().paints,before=JSON.stringify({state:serializeJellyState(statusState),trace:serializeJellyTrace(statusTrace)}),view=reduced?reducedV:V;
  view.draw(ctx,statusState,{width:layout.width,height:layout.height,time:130+age,turn:statusTrace,elapsed:130+age,oddsPopupTime:age,bet:300000});
  const ops=traces.get(cv).ops,d=plain(art.describe()),expected=age>=0&&age<1600,change='×1.0 → ×1.5',texts=ops.filter(op=>op.kind==='text'&&(op.text===change||op.text==='＋0.5倍'));
  legacyMetrics(ops);const ok=check('odds '+layout.id+'/'+reduced+'/'+age,()=>{
   assert.equal(d.oddsPopup-old,Number(expected));assert.equal(award.describe().paints,moneyBefore);assert.equal(JSON.stringify({state:serializeJellyState(statusState),trace:serializeJellyTrace(statusTrace)}),before);
   assert(!ops.some(op=>op.file==='assets/jelly-art-v300/award-digits.webp'));
   assert.equal(texts.filter(op=>op.text===change).length,Number(expected));assert.equal(texts.filter(op=>op.text==='＋0.5倍').length,Number(expected));
   if(expected){assert(ops.some(op=>op.sources?.includes('assets/jelly-art-v300/award-odds-up.webp')));assert.deepEqual(d.lastOdds,{age,duration:1600,ball:8,oldMultiplier:1,newMultiplier:1.5,delta:.5,beforeRecipe:'blue',afterRecipe:'blue+green',source:'assets/jelly-art-v300/award-odds-up.webp',wide:layout.id==='ribbon',still:reduced,win:false});fontMetrics(texts);texts.forEach(op=>inside(op.bounds,cv.width,cv.height,'live odds status'));}
  });
  const row={layout:layout.id,reduced,age,expected,ok,liveTexts:serialOps(texts)};
  if(age===800){row.image=save(cv,'odds-'+layout.id+(reduced?'-reduced':'')+'.png');boardContact.push({spec:{id:'odds-'+layout.id+(reduced?'-reduced':''),width:cv.width,height:cv.height},cv,label:'×1.0 → ×1.5 / no money award'});}
  report.odds.push(row);
 }
 const miniStatus=canvas(116,116),statusCount=art.describe().oddsPopup;V.draw(miniStatus.getContext('2d'),statusState,{width:116,height:116,mini:true,time:930,turn:statusTrace,elapsed:930,oddsPopupTime:800,bet:300000});
 assert.equal(art.describe().oddsPopup,statusCount,'native mini has no large ODDS popup');report.oddsMiniSuppressed=true;

 // A renderer failure must remain an actual fallback, not a blank success.
 report.fallbacks=[];
 for(const missing of ['award-all-line.webp','award-digits.webp','glass-kit.webp']){
  class MissingImage extends LocalImage{set src(value){if(String(value).split('?')[0].endsWith('/'+missing)){queueMicrotask(()=>this.onerror?.(Error('controlled missing asset')));return;}super.src=value;}get src(){return super.src;}}
  const fw={SweetsLineup:{chosen:['jelly']}},fc=vm.createContext({window:fw,document,Image:MissingImage,location:{search:''},URLSearchParams,Math:safeMath,Promise,console,queueMicrotask});
  vm.runInContext(missing==='glass-kit.webp'?artCode:awardCode,fc);const api=missing==='glass-kit.webp'?fw.JellyArtV300:fw.JellyAwardV300;await api.ready;
  const cv=canvas(430,300),ctx=cv.getContext('2d'),cue=inspectJellyCue(semantic,byId['all-line'].steps[7],300000).cue;ctx.translate(215,150);
  const painted=missing==='glass-kit.webp'?api.cell(ctx,0,'blue'):api.paint(ctx,{cue,width:420,height:280,still:true}),d=plain(api.describe());
  const ok=check('fallback '+missing,()=>{assert(d.errors.length>0);if(missing==='award-digits.webp'){assert(api.loaded&&painted);assert.equal(d.fallbackAmounts,1);assert(traces.get(cv).ops.some(op=>op.kind==='text'&&op.text==='90,000,000 WIN'));}else{assert.equal(api.loaded,false);assert.equal(painted,false);assert.equal(traces.get(cv).ops.length,0);}});report.fallbacks.push({missing,ok,loaded:api.loaded,painted,errors:d.errors});
 }
 for(const search of ['?downloadWorker=1','?serverSettlementWorker=1']){const ww={},wc=vm.createContext({window:ww,location:{search},URLSearchParams});vm.runInContext(artCode,wc);vm.runInContext(awardCode,wc);assert.equal(ww.JellyArtV300,undefined);assert.equal(ww.JellyAwardV300,undefined);}
 const unchosen={SweetsLineup:{chosen:['cookie']}},uc=vm.createContext({window:unchosen,location:{search:''},URLSearchParams});vm.runInContext(artCode,uc);vm.runInContext(awardCode,uc);assert.equal(unchosen.JellyArtV300,undefined);assert.equal(unchosen.JellyAwardV300,undefined);report.workerAndUnchosenGuards=true;

 function contact(items,name,title){
  const cw=464,ch=446,columns=3,sheet=createCanvas(cw*columns,60+Math.ceil(items.length/columns)*ch),ctx=sheet.getContext('2d');ctx.fillStyle='#15343b';ctx.fillRect(0,0,sheet.width,sheet.height);ctx.fillStyle='#fff2d8';ctx.font='20px "Noto Sans JP"';ctx.fillText(title,18,29);
  items.forEach(({spec,cv,label},i)=>{const x=i%columns*cw,y=60+Math.floor(i/columns)*ch,k=Math.min(spec.width/cv.width,(cw-24)/cv.width,370/cv.height);ctx.fillStyle='#244b52';ctx.fillRect(x+7,y,cw-14,ch-10);ctx.fillStyle='#fff2d8';ctx.font='15px "Noto Sans JP"';ctx.fillText(spec.id,x+17,y+23);ctx.font='11px "Noto Sans JP"';ctx.fillText(label,x+17,y+43);ctx.drawImage(cv,x+(cw-cv.width*k)/2,y+61+(370-cv.height*k)/2,cv.width*k,cv.height*k);});save(sheet,name);
 }
 contact(moneyContact,'native-money-contact.png','Jelly: actual current payout and generated lettering');contact(boardContact,'native-board-contact.png','Jelly native boards / old HIT font has a native-backend limitation');
 const surfaceSheet=createCanvas(1250,810),sx=surfaceSheet.getContext('2d');sx.fillStyle='#15343b';sx.fillRect(0,0,1250,810);
 RECIPES.forEach((recipe,i)=>{const x=i%5*250,y=Math.floor(i/5)*270;sx.drawImage(art.surface(recipe),x+9,y+9,232,232);sx.fillStyle='#fff2d8';sx.font='12px "Noto Sans JP"';sx.fillText(recipe,x+10,y+259);});save(surfaceSheet,'native-surface-contact.png');
 report.art=plain(art.describe());report.renderer=plain(award.describe());report.localAssets=[...loadedFiles].sort();report.nativeCanvasCount=canvases.length;
 assert.equal(sha256(nativeCore()),BASELINE_CORE_SHA256);assert.equal(sha256(nativeHost()),BASELINE_HOST_SHA256);report.ok=report.errors.length===0;writeReport();assert(report.ok,'native render failed; inspect '+reportFile);
 console.log('JELLY_V300_NATIVE_RENDER_PASS',JSON.stringify({money:report.money.length,boards:report.boards.length,oddsChecks:report.odds.length,surfaces:report.surfaces.length,tableRows:11,legacyFontBackendCases:report.legacyFontBackend.length,report:reportFile}));
}
try{await main();}catch(error){report.errors.push(String(error?.stack||error));report.ok=false;writeReport();throw error;}

/* Actual generated-image/native Canvas integration. The production semantic
 * owner, badge sizing, board painter, material caches and lesson draw without
 * an ambient RNG. DOM/CSS layout, real controls and settlement are browser-CI
 * responsibilities; no browser or font/backend substitution occurs here. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createCanvas,Image,Path2D,GlobalFonts} from '@napi-rs/canvas';
import {BASELINE_CORE_SHA256,BASELINE_HOST_SHA256,BASELINE_POW_PREFIX_SHA256,nativeCore,nativeHost,nativePowPrefix,sha256,plain,buildWaffleFixtures,fixtureSummary} from './waffle-v301-fixtures.mjs';
import {loadWaffleOwner,inspectWaffleCue} from './waffle-v301-awards.mjs';

const root=process.cwd(),out=path.resolve(root,'qa-waffle-v301');fs.mkdirSync(out,{recursive:true});
const read=file=>fs.readFileSync(path.resolve(root,file),'utf8'),hash=file=>sha256(fs.readFileSync(path.resolve(root,file)));
const artFile='assets/waffle-art-v301.js',awardFile='assets/waffle-award-v301.js',viewFile='assets/bingo-stick-view.js',lessonFile='assets/waffle-lesson.js',ownerFile='assets/award-presentation-v277.js',provenanceFile='assets/waffle-art-v301/generation-provenance.json';
const names=['award-flip','award-reversal','award-digits','pieces','board-kit','payout-cabinet','furniture-atlas','award-grade-up'],assets=names.map(name=>'assets/waffle-art-v301/'+name+'.webp');
const report={ok:false,scope:'Actual native Canvas with reachable native rules, real shared semantics and badge sizing, real private drawBoard/public drawMini bodies, generated sprites and actual lesson. DOM layout/main mount/input/hidden worker/wallet require browser CI. Payout contact is an explicitly sized material preview using real native quote + fitGoldenNumber; it is not a browser CSS screenshot. Existing 850/950 lesson/reach fonts are kept verbatim; native backend metrics and mixed-font fallback (including the Canvas grade helper) are recorded. Native DOM grade labels require Chrome verification.',money:[],boards:[],pieces:[],grade:[],quotes:[],lessons:[],atlasEdges:[],legacyFontBackend:[],gradeFontBackend:[],errors:[]};
const reportFile=path.join(out,'native-render-report.json'),writeReport=()=>fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');writeReport();
const nativeFonts={ArcadePayout:'optimized/media/a73bbbdd98d48aac.woff2',SweetReachRounded:'optimized/media/1d0a185e6cc3dc64.woff2'};
for(const [family,file] of Object.entries(nativeFonts))assert(GlobalFonts.register(fs.readFileSync(path.resolve(root,file)),family));
const japaneseFont='/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc';if(fs.existsSync(japaneseFont))GlobalFonts.registerFromPath(japaneseFont,'Noto Sans JP');
const imageFiles=new WeakMap(),traces=new WeakMap(),media={matches:false},canvases=[],loadedFiles=new Set();let readbacks=0;
const fresh=()=>({ops:[],sources:new Set()});
function freeze(value){if(value&&typeof value==='object'){Object.freeze(value);for(const child of Object.values(value))freeze(child);}return value;}
function point(ctx,x,y){const m=ctx.getTransform();return {x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f};}
function bounds(ctx,x,y,w,h){const p=[[x,y],[x+w,y],[x,y+h],[x+w,y+h]].map(([a,b])=>point(ctx,a,b));return {left:Math.min(...p.map(p=>p.x)),top:Math.min(...p.map(p=>p.y)),right:Math.max(...p.map(p=>p.x)),bottom:Math.max(...p.map(p=>p.y))};}
function canvas(width=300,height=150){
 const cv=createCanvas(width,height),ctx=cv.getContext('2d');traces.set(cv,fresh());canvases.push(cv);
 const draw=ctx.drawImage.bind(ctx),fill=ctx.fillText.bind(ctx),pixels=ctx.getImageData.bind(ctx);
 ctx.getImageData=(...args)=>{readbacks++;return pixels(...args);};
 ctx.drawImage=function(image,...args){
  const result=draw(image,...args),trace=traces.get(cv),file=imageFiles.get(image),inherited=traces.get(image),sources=file?[file]:[...(inherited?.sources||[])];
  const iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height,sourceRect=args.length===8?args.slice(0,4):[0,0,iw,ih];
  const dest=args.length===8?args.slice(4):args.length===4?args:[args[0],args[1],iw,ih];sources.forEach(s=>trace.sources.add(s));
  trace.ops.push({kind:'image',image,file:file||null,sources,sourceRect,dest,bounds:bounds(ctx,...dest),center:point(ctx,dest[0]+dest[2]/2,dest[1]+dest[3]/2),alpha:ctx.globalAlpha});return result;
 };
 ctx.fillText=function(value,...args){
  const text=String(value),m=ctx.measureText(text),x=args[0]||0,y=args[1]||0,leftAdvance=ctx.textAlign==='center'?-m.width/2:['right','end'].includes(ctx.textAlign)?-m.width:0;
  const left=Math.min(-m.actualBoundingBoxLeft,leftAdvance),right=Math.max(m.actualBoundingBoxRight,leftAdvance+m.width),fit=args[2]>0?Math.min(1,args[2]/Math.max(1,m.width)):1;
  traces.get(cv).ops.push({kind:'text',text,font:ctx.font,size:Number(ctx.font.match(/([\d.]+)px/)?.[1]),width:m.width,maxWidth:args[2]??null,ascent:m.fontBoundingBoxAscent,descent:m.fontBoundingBoxDescent,
   inkAscent:m.actualBoundingBoxAscent,inkDescent:m.actualBoundingBoxDescent,anchor:point(ctx,x,y),bounds:bounds(ctx,x+left*fit,y-m.actualBoundingBoxAscent,(right-left)*fit,m.actualBoundingBoxAscent+m.actualBoundingBoxDescent),alpha:ctx.globalAlpha});
  return fill(value,...args);
 };return cv;
}
class LocalImage extends Image{
 set src(value){const file=path.posix.normalize(String(value).split('?')[0]);assert(file.startsWith('assets/')&&!file.includes('://'));assert(fs.existsSync(path.resolve(root,file)),file);
  imageFiles.set(this,file);loadedFiles.add(file);super.src=fs.readFileSync(path.resolve(root,file));}
 get src(){return imageFiles.get(this)||'';}
 addEventListener(type,fn){const key='on'+type,old=this[key];this[key]=(...args)=>{old?.(...args);fn(...args);};}
}
class Element{
 constructor(tag='span'){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.attributes={};this.className='';this._text='';this.clientWidth=64;this.style={setProperty(name,value){this[name]=value;}};this.classList={add:name=>{this.className+=' '+name;},contains:name=>this.className.split(/\s+/).includes(name),toggle:(name,on)=>{this.className=this.className.split(/\s+/).filter(c=>c!==name).concat(on?[name]:[]).join(' ');}};}
 set textContent(value){this._text=String(value);this.children=[];}get textContent(){return this._text+this.children.map(c=>c.textContent||'').join('');}
 append(...children){for(const child of children){child.parentNode=this;this.children.push(child);}}
 replaceChildren(...children){this._text='';this.children=[];this.append(...children);}
 setAttribute(name,value){this.attributes[name]=String(value);}getAttribute(name){return this.attributes[name]??null;}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
 querySelectorAll(selector){const all=this.children.flatMap(child=>[child,...child.querySelectorAll?.('*')||[]]);if(selector==='*')return all;
  if(selector.startsWith('.'))return all.filter(child=>child.className?.split(/\s+/).includes(selector.slice(1)));return all.filter(child=>child.tagName===selector.toUpperCase());}
}
function section(source,start,end){const a=source.indexOf(start),b=source.indexOf(end,a+start.length);assert(a>=0&&b>a,'production boundary '+start);return source.slice(a,b);}
function check(label,fn){try{fn();return true;}catch(error){report.errors.push(label+': '+String(error?.stack||error));return false;}}
const serialOps=ops=>ops.map(({image,...op})=>op);
function inside(b,w,h,label){assert(b.left>=-.3&&b.top>=-.3&&b.right<=w+.3&&b.bottom<=h+.3,label+' outside canvas '+JSON.stringify(b));}
function union(ops){assert(ops.length);return {left:Math.min(...ops.map(p=>p.bounds.left)),top:Math.min(...ops.map(p=>p.bounds.top)),right:Math.max(...ops.map(p=>p.bounds.right)),bottom:Math.max(...ops.map(p=>p.bounds.bottom))};}
function newFontMetrics(ops){for(const op of ops.filter(p=>p.kind==='text'))assert(op.size>0&&op.ascent+op.descent>0&&op.ascent+op.descent<op.size*2.5,'new text uses correct font metrics '+JSON.stringify(op));}
function legacyMetrics(ops){for(const op of ops.filter(p=>p.kind==='text')){
 const reason=op.ascent+op.descent>=op.size*2.5?'weight-parsed-as-size':/[\u3040-\u30ff\u3400-\u9fff]/.test(op.text)&&op.inkAscent+op.inkDescent===0?'legacy-cjk-fallback-missing':null;
 if(reason&&!report.legacyFontBackend.some(p=>p.font===op.font&&p.reason===reason))report.legacyFontBackend.push({reason,text:op.text,font:op.font,declaredSize:op.size,ascent:op.ascent,descent:op.descent});
}}
function visiblePixels(cv,minimum=cv.width*cv.height*.015){const data=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;let count=0;for(let i=3;i<data.length;i+=4)if(data[i]>24)count++;assert(count>minimum);return count;}
function save(cv,name){fs.writeFileSync(path.join(out,name),cv.toBuffer('image/png'));return name;}
function contact(items,name,{cols=3,cellW=440,cellH=375}={}){
 const cv=createCanvas(cols*cellW,Math.ceil(items.length/cols)*cellH),c=cv.getContext('2d');c.fillStyle='#392c28';c.fillRect(0,0,cv.width,cv.height);
 items.forEach(({cv:source,label},i)=>{const x=i%cols*cellW,y=Math.floor(i/cols)*cellH,k=Math.min((cellW-20)/source.width,(cellH-50)/source.height);
  c.drawImage(source,x+(cellW-source.width*k)/2,y+8+(cellH-50-source.height*k)/2,source.width*k,source.height*k);c.fillStyle='#fff0cd';c.font='13px "Noto Sans JP"';c.textAlign='left';c.fillText(label,x+10,y+cellH-18,cellW-20);});return save(cv,name);
}
function sampleBounds(data,width,[x0,y0,x1,y1]){
 let l=x1,t=y1,r=-1,b=-1,edgePixels=0,count=0;const internal=[];
 for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(data[(y*width+x)*4+3]>=18){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);count++;
  if(x===x0||x===x1-1||y===y0||y===y1-1){edgePixels++;internal.push({x,y,alpha:data[(y*width+x)*4+3]});}}
 return {left:l,top:t,right:r+1,bottom:b+1,edgePixels,count,edges:internal};
}
function reachesRole(image,role,artInfo,seen=new Set()){
 if(seen.has(image))return false;seen.add(image);
 for(const op of traces.get(image)?.ops||[])if(op.kind==='image'){
  if(op.file===artInfo.sourceFiles[role]&&JSON.stringify(op.sourceRect)===JSON.stringify(artInfo.sourceRects[role]))return true;
  if(reachesRole(op.image,role,artInfo,seen))return true;
 }return false;
}

async function main(){
 assert.deepEqual([artFile,awardFile,provenanceFile,...assets].filter(file=>!fs.existsSync(path.resolve(root,file))),[]);
 assert.equal(sha256(nativeCore()),BASELINE_CORE_SHA256);assert.equal(sha256(nativeHost()),BASELINE_HOST_SHA256);assert.equal(sha256(nativePowPrefix()),BASELINE_POW_PREFIX_SHA256);
 const artCode=read(artFile),awardCode=read(awardFile),viewCode=read(viewFile),ownerCode=read(ownerFile),nativeApp=read('optimized/app-01.js'),provenance=JSON.parse(read(provenanceFile));
 assert.equal(provenance.version,301);assert.equal(provenance.entries.length,8);
 for(const entry of provenance.entries)assert.equal(hash('assets/waffle-art-v301/'+entry.file),entry.sha256,'the rendered artifact matches the generated source record');
 report.files=Object.fromEntries([artFile,awardFile,viewFile,lessonFile,ownerFile,'assets/waffle-art-v301.css','assets/bingo-stick-rules.js','assets/bingo-stick-host.js','assets/waffle-pow-v159.js',provenanceFile,...assets,...Object.values(nativeFonts)].map(file=>[file,{bytes:fs.statSync(path.resolve(root,file)).size,sha256:hash(file)}]));
 report.atlasLayouts=provenance.atlasLayouts;report.nativeFonts=nativeFonts;
 const semantic=loadWaffleOwner(),documentElement=new Element('html'),body=new Element('body');
 const window={BingoStickRules:semantic.R,SweetsLineup:{chosen:['stick'],ids:['stick']},matchMedia:()=>media};
 const document={createElement:tag=>tag==='canvas'?canvas():new Element(tag),fonts:{ready:Promise.resolve()},documentElement,body};
 const safeMath=Object.create(Math);safeMath.random=()=>{throw Error('rendering sampled gameplay/ambient RNG');};
 const context=vm.createContext({window,document,Image:LocalImage,Path2D,location:{search:''},URLSearchParams,console,Promise,Math:safeMath,performance:{now:()=>0},matchMedia:()=>media,app:{locked:[3000]}});
 vm.runInContext(section(nativeApp,'const elixirGlyphs=','const cookieFlavors='),context,{filename:'optimized/app-01.js#native-vector-numbers'});
 const nativeNumber=context.drawElixirNumber;
 context.drawElixirNumber=(ctx,value,x,y,size,...args)=>{traces.get(ctx.canvas).ops.push({kind:'number',text:String(value),size,anchor:point(ctx,x,y),bounds:bounds(ctx,x-size*.5,y-size*.4,size,size*.8)});return nativeNumber(ctx,value,x,y,size,...args);};
 const payoutWidth=nativeApp.match(/^const payoutWidth=.*;$/m)?.[0];assert(payoutWidth);
 vm.runInContext(payoutWidth+'\n'+section(nativeApp,'function fitGoldenNumber(','function paintTabWin(')+'\nwindow.fitGoldenNumber=fitGoldenNumber;',context,{filename:'optimized/app-01.js#native-number-fit'});
 vm.runInContext(artCode,context,{filename:artFile});vm.runInContext(awardCode,context,{filename:awardFile});
 assert.deepEqual(await Promise.all([window.WaffleArtV301.ready,window.WaffleAwardV301.ready]),[true,true]);
 const art=window.WaffleArtV301,award=window.WaffleAwardV301;assert(art.loaded&&award.loaded&&award.describe().digitsReady);assert.deepEqual(plain(art.describe().errors),[]);assert.deepEqual(plain(award.describe().errors),[]);
 // Load each original board/motion function verbatim. The unexecuted DOM mount
 // remains a browser gate; the private main painter and public mini painter
 // are both called with their native main flag and actual Canvas dimensions.
 const viewProgram=viewCode.slice(0,viewCode.indexOf('function mount(panel)'))+'\nwindow.__waffleBoard={drawBoard,drawMini,motion};\n})();';
 vm.runInContext(viewProgram,context,{filename:viewFile+'#native-board-functions'});const V=window.__waffleBoard;
 assert.deepEqual(plain(art.describe().nativeBound),{fitNumber:true,medal:true},'actual native view binds its lexical payout fitter and medal helper');
 vm.runInContext(read(lessonFile),context,{filename:lessonFile});
 const badge=ownerCode.slice(0,ownerCode.indexOf('function recordFor('))+section(ownerCode,'function paintGameBadge(','function paintBadge(')+'\nwindow.__badge301=paintGameBadge;\n})();';
 vm.runInContext(badge,context,{filename:ownerFile+'#native-badge-sizing'});
 const fixtures=buildWaffleFixtures(),byId=Object.fromEntries(fixtures.map(f=>[f.id,f]));report.fixtures=fixtures.map(fixtureSummary);
 const moneyCases=[
  {id:'flip-zero-main',fixture:'zero-one',ball:5,width:294,height:294},
  {id:'flip-carry-three-phone',fixture:'carry-seven',ball:7,width:216,height:216},
  {id:'flip-pow-mid-main',fixture:'pow-middle',ball:3,width:294,height:294},
  {id:'flip-pow-lower-main',fixture:'pow-lower',ball:8,width:294,height:294},
  {id:'reversal-900600000-main',fixture:'black-reversal',ball:7,width:294,height:294},
  {id:'reversal-900600000-phone',fixture:'black-reversal',ball:7,width:216,height:216},
  {id:'reversal-white-main',fixture:'white-reversal',ball:8,width:294,height:294},
  {id:'flip-zero-mini116',fixture:'zero-one',ball:5,width:116,height:116,mini:true},
  {id:'flip-carry-mini116',fixture:'carry-seven',ball:7,width:116,height:116,mini:true},
  {id:'reversal-mini116',fixture:'black-reversal',ball:7,width:116,height:116,mini:true},
  {id:'reversal-mini47',fixture:'black-reversal',ball:7,width:47,height:47,mini:true},
  {id:'reversal-reduced',fixture:'black-reversal',ball:7,width:294,height:294,reduced:true},
  {id:'flip-zero-reduced',fixture:'zero-one',ball:5,width:216,height:216,reduced:true}
 ],moneyContact=[];
 for(const spec of moneyCases){
  const fixture=byId[spec.fixture],step=fixture.steps[spec.ball-1],{cue:raw}=inspectWaffleCue(semantic,step,fixture.bet),cue=freeze({...raw,age:900,duration:3100,serial:1}),before=JSON.stringify(cue);
  const cv=canvas(spec.width*2,spec.height*2),c=cv.getContext('2d');media.matches=!!spec.reduced;c.fillStyle='#493328';c.fillRect(0,0,cv.width,cv.height);c.scale(2,2);
  const glints=window.__badge301(c,{},cue,spec.width,spec.height,!!spec.mini,0,0),ops=traces.get(cv).ops,d=plain(award.describe()),o=step.oracle;
  const role=o.reversalThisMove?'reversal':'flip',label=spec.mini?o.flips+'枚反転'+(o.reversalThisMove?' ・ R'+o.reversalCount:''):'今回 '+o.flips+'枚反転 ・ '+(o.reversalThisMove?'リバーサル'+o.reversalCount+'回目':o.color==='black'?'小倉あん':'バター');
  const caption='',glyphs=[...o.deltaWin.toLocaleString('ja-JP'),'WIN'];
  const digits=ops.filter(op=>op.file==='assets/waffle-art-v301/award-digits.webp'),labels=ops.filter(op=>op.kind==='text'&&op.text===label),captions=ops.filter(op=>op.kind==='text'&&op.text===caption),amountBounds=digits.length?union(digits):null;
  const ok=check(spec.id,()=>{
   assert.equal(JSON.stringify(cue),before);assert.equal(d.last.role,role);assert.equal(d.last.liveLabel,label);assert.equal(d.last.caption,caption);
   assert.equal(d.last.win,o.deltaWin);assert.equal(d.last.winText,o.deltaWin.toLocaleString('ja-JP')+' WIN');assert.equal(d.last.total,false);assert.equal(d.last.amountLabel,'今回の獲得');
   assert.equal(d.last.nativeOldWin,o.previousTotalWin);assert.equal(d.last.nativeTotalWin,o.totalWin);assert.equal(d.last.nativeWinDelta,o.deltaWin);
   assert.equal(d.fallbackAmounts,0);assert(d.last.rasterNumbers);assert.deepEqual(d.last.glyphs,glyphs);assert.deepEqual(digits.map(op=>op.sourceRect),glyphs.map(char=>d.glyphRects[char]));
   assert.equal(d.last.source,'assets/waffle-art-v301/award-'+role+'.webp');assert(ops.some(op=>op.file===d.last.source));assert.equal(labels.length,1);assert.equal(captions.length,0);newFontMetrics(ops);
   for(const op of [...digits,...labels,...captions])inside(op.bounds,cv.width,cv.height,'actual live amount/count/caption');
   assert(labels[0].bounds.bottom<=amountBounds.top,'count never overlaps the sculpted WIN');
   assert.equal(ops.filter(op=>op.kind==='text').length,1,'only the true current flip/count ribbon accompanies the generated amount');
   assert.equal(glints,spec.reduced?0:spec.mini?2:6);visiblePixels(cv);
  });
  const row={...spec,ok,win:o.deltaWin,totalWin:o.totalWin,label,caption,glyphs,sourceRects:digits.map(op=>op.sourceRect),amountBounds,text:serialOps([...labels,...captions]),image:save(cv,spec.id+'.png')};
  if(['flip-zero-main','reversal-900600000-main','reversal-mini116'].includes(spec.id)){
   const composite=canvas(cv.width,cv.height),cx=composite.getContext('2d');V.drawBoard(cx,freeze(plain(step.after)),{age:cue.delay+cue.age,bet:fixture.bet},!spec.mini);
   cx.scale(2,2);window.__badge301(cx,{},cue,spec.width,spec.height,!!spec.mini,0,0);row.nativeComposite=save(composite,spec.id+'-native-composite.png');
  }
  report.money.push(row);moneyContact.push({cv,label:spec.id+' / '+o.deltaWin.toLocaleString('ja-JP')+' WIN'});
 }
 contact(moneyContact,'native-money-contact.png',{cols:3,cellW:360,cellH:350});media.matches=false;

 const digitImage=new LocalImage();digitImage.src='assets/waffle-art-v301/award-digits.webp';await digitImage.decode();
 const digitCv=canvas(digitImage.naturalWidth,digitImage.naturalHeight);digitCv.getContext('2d').drawImage(digitImage,0,0);const digitData=digitCv.getContext('2d').getImageData(0,0,digitCv.width,digitCv.height).data;
 const grid=provenance.atlasLayouts.digits,glyphRects=plain(award.describe().glyphRects),digitContact=[];
 for(const [index,glyph] of grid.order.entries()){
  const col=index%4,row=Math.floor(index/4),x0=Math.round((index===11?grid.bottomCommaWinCut:col/4)*digitCv.width),x1=Math.round((index===10?grid.bottomCommaWinCut:(col+1)/4)*digitCv.width),y0=Math.round(grid.rowCuts[row]*digitCv.height),y1=Math.round(grid.rowCuts[row+1]*digitCv.height),observed=sampleBounds(digitData,digitCv.width,[x0,y0,x1,y1]);
  const [sx,sy,sw,sh]=glyphRects[glyph];check('glyph '+glyph,()=>{assert(observed.count>0);assert.equal(observed.edgePixels,0);assert(sx>=x0&&sy>=y0&&sx+sw<=x1&&sy+sh<=y1);assert(sx<=observed.left&&sy<=observed.top&&sx+sw>=observed.right&&sy+sh>=observed.bottom);});
  const cv=canvas(250,175),c=cv.getContext('2d'),k=Math.min(230/sw,155/sh);c.drawImage(digitImage,sx,sy,sw,sh,(250-sw*k)/2,(175-sh*k)/2,sw*k,sh*k);digitContact.push({cv,label:glyph+' ['+glyphRects[glyph].join(',')+']'});
 }
 contact(digitContact,'native-digit-contact.png',{cols:4,cellW:270,cellH:220});report.glyphRects=glyphRects;

 const ad=plain(art.describe());assert.equal(ad.pieceCacheCount,6);assert.deepEqual(ad.pieceSizes,[18,64,256]);assert.equal(ad.spriteCacheCount,14);
 for(const [role,rect] of Object.entries(ad.sourceRects)){
  const source=art.sprite(role),ops=traces.get(source)?.ops.filter(op=>op.kind==='image')||[];
  check('registered crop '+role,()=>{assert.equal(ops.length,1);assert.equal(ops[0].file,ad.sourceFiles[role]);assert.deepEqual(ops[0].sourceRect,rect);});
 }
 const registrations=[['pieces.webp','pieces',{black:'black',white:'white'}],['board-kit.webp','board',{pocket:'pocket',rim:'rim',surface:'floor',button:'button'}],['furniture-atlas.webp','furniture',{wafer:'waffle',silver:'silver',gold:'gold',turns:'rail',bonus:'bonus',pow:'pow'}]];
 for(const [file,key,mapping] of registrations){
  const image=new LocalImage();image.src='assets/waffle-art-v301/'+file;await image.decode();const cv=canvas(image.naturalWidth,image.naturalHeight),c=cv.getContext('2d');c.drawImage(image,0,0);const data=c.getImageData(0,0,cv.width,cv.height).data,layout=provenance.atlasLayouts[key];
  layout.order.forEach((name,index)=>{const role=mapping[name],col=index%layout.columns,row=Math.floor(index/layout.columns),x0=Math.round(col*cv.width/layout.columns),x1=Math.round((col+1)*cv.width/layout.columns),y0=Math.round(row*cv.height/layout.rows),y1=Math.round((row+1)*cv.height/layout.rows),b=sampleBounds(data,cv.width,[x0,y0,x1,y1]),rect=ad.sourceRects[role];
   const internal=b.edges.filter(p=>p.x!==0&&p.y!==0&&p.x!==cv.width-1&&p.y!==cv.height-1);
   const glow=role==='pocket'?{y:626,x0:111,x1:433,maxAlpha:22,count:229}:role==='floor'?{y:627,x0:113,x1:432,maxAlpha:20,count:178}:null;
   check('atlas cell '+role,()=>{assert(b.count>0);
    // Reviewed source has a very faint diffuse glow on these two adjacent
    // horizontal boundaries only. No solid sprite or ornament crosses them.
    if(glow){assert.equal(internal.length,glow.count);assert(internal.every(p=>p.y===glow.y&&p.x>=glow.x0&&p.x<=glow.x1&&p.alpha<=glow.maxAlpha));}
    else assert.equal(internal.length,0,'registered cell has no neighboring sprite pixels on an internal boundary');
    assert(rect[0]>=x0&&rect[1]>=y0&&rect[0]+rect[2]<=x1&&rect[1]+rect[3]<=y1);assert(rect[0]<=b.left&&rect[1]<=b.top&&rect[0]+rect[2]>=b.right&&rect[1]+rect[3]>=b.bottom);});
   report.atlasEdges.push({role,file,internalPixels:internal.length,outerPixels:b.edgePixels-internal.length,reviewedDiffuseGlow:glow});
  });
 }
 const pieceContact=[];
 for(const color of ['black','white'])for(const size of [16,58,180]){
  const cv=canvas(200,200),c=cv.getContext('2d');assert(art.piece(c,color,10,10,size,size));const op=traces.get(cv).ops[0],cacheSize=size<=18?18:size<=64?64:256;
  const ok=check(color+'/'+cacheSize,()=>{assert.equal(op.image.width,cacheSize);assert.equal(op.image.height,cacheSize);assert(reachesRole(op.image,color,ad));visiblePixels(cv,size*size*.4);});report.pieces.push({color,size,cacheSize,ok});pieceContact.push({cv,label:color+' / cache '+cacheSize});
 }
 contact(pieceContact,'native-piece-contact.png',{cols:3,cellW:230,cellH:250});

 const boardCases=[
  {id:'board-opening-main294',fixture:'carry-seven',ball:0,width:294,height:294,main:true},
  {id:'board-opening-mini116',fixture:'carry-seven',ball:0,width:116,height:116},
  {id:'board-pow-main294',fixture:'pow-middle',ball:3,width:294,height:294,main:true},
  {id:'board-reversal-main294',fixture:'black-reversal',ball:7,width:294,height:294,main:true},
  {id:'board-white-final-mini116',fixture:'white-reversal',ball:8,width:116,height:116},
  {id:'board-reversal-mini47',fixture:'black-reversal',ball:7,width:47,height:47},
  {id:'board-pow-reduced',fixture:'pow-lower',ball:8,width:216,height:216,main:true,reduced:true},
  {id:'board-flip-start',fixture:'black-reversal',ball:7,width:294,height:294,main:true,age:0},
  {id:'board-flip-midpoint',fixture:'black-reversal',ball:7,width:294,height:294,main:true,age:235}
 ],boardContact=[];
 for(const spec of boardCases){
  const f=byId[spec.fixture],state=freeze(plain(spec.ball?f.steps[spec.ball-1].after:f.initial)),snapshot=JSON.stringify(state),cv=canvas(spec.width*2,spec.height*2),c=cv.getContext('2d');media.matches=!!spec.reduced;
  const age=spec.age??Infinity,m=V.motion(state,age);V.drawBoard(c,state,{age,bet:f.bet},!!spec.main);const ops=traces.get(cv).ops;
  const pieceOps=ops.filter(op=>op.kind==='image'&&op.sources.includes('assets/waffle-art-v301/pieces.webp')),numbers=ops.filter(op=>op.kind==='number'),side=Math.min(cv.width,cv.height),rim=.064*side,u=(side-2*rim)/8;
  const colors=state.colors.map((color,id)=>{const index=m.active?state.flipSteps.findIndex(step=>step.id===id):-1;if(index>=0&&index>=m.beat)color=color==='black'?'white':'black';if(state.placed[0]===id&&m.active&&age<90)color=null;return color;});
  const ids=colors.flatMap((color,id)=>color?[id]:[]),empty=colors.flatMap((color,id)=>!color&&state.numbers[id]!==null?[id]:[]);
  const ok=check(spec.id,()=>{
   assert.equal(JSON.stringify(state),snapshot);assert.equal(pieceOps.length,ids.length);assert.equal(numbers.length,empty.length);
   pieceOps.forEach((op,index)=>{const id=ids[index];assert(reachesRole(op.image,colors[id],ad),'correct native black/white face');inside(op.bounds,cv.width,cv.height,'native piece');
    // Skia exposes the transform as float32 (for example 69.6780014038
    // instead of 69.678); the tolerance is 0.0001 physical pixel.
    const flipping=m.active&&state.flipSteps[m.index]?.id===id;if(!flipping){assert(Math.abs(op.center.x-((cv.width-side)/2+rim+(id%8+.5)*u))<1e-4);assert(Math.abs(op.center.y-((cv.height-side)/2+rim+(Math.floor(id/8)+.5)*u))<1e-4);}});
   numbers.forEach((op,index)=>{const id=empty[index];assert.equal(op.text,String(state.numbers[id]));assert(Math.abs(op.anchor.x-((cv.width-side)/2+rim+(id%8+.5)*u))<1e-4);assert(Math.abs(op.anchor.y-((cv.height-side)/2+rim+(Math.floor(id/8)+.5)*u))<1e-4);});
   const background=ops.find(op=>op.kind==='image'&&op.sources.includes('assets/waffle-art-v301/board-kit.webp'));assert(background);
   const boardOps=traces.get(background.image).ops,pockets=boardOps.filter(op=>op.kind==='image'&&op.image===art.sprite('pocket'));assert.equal(pockets.length,64);
   assert.equal(boardOps.filter(op=>op.kind==='image'&&op.image===art.sprite('rim')).length,8);assert(boardOps.some(op=>op.image===art.sprite('floor')));visiblePixels(cv);
  });
  report.boards.push({...spec,age:Number.isFinite(age)?age:'settled',ok,pieces:pieceOps.length,numbers:numbers.length,beat:m.beat,rankStep:m.rankStep,image:save(cv,spec.id+'.png')});boardContact.push({cv,label:spec.id+' / '+pieceOps.length+' pieces, '+numbers.length+' numbers'});
 }
 contact(boardContact,'native-board-contact.png',{cols:3,cellW:340,cellH:365});media.matches=false;

 // The grade banner is information only, using the native shared clock. It
 // draws precisely during row kick/drop, including ordinary one-row gains.
 const gradeContact=[];
 for(const id of ['pow-middle','pow-lower','black-reversal']){
  const f=byId[id],step=f.steps[id==='pow-middle'?2:id==='pow-lower'?7:6],s=freeze(plain(step.after)),o=step.oracle;
  for(const age of [o.rankStart-.01,o.rankStart,o.dropStart,o.land,o.nativeDuration]){
   const cv=canvas(640,215),c=cv.getContext('2d'),m=V.motion(s,age),snapshot=JSON.stringify(s),painted=art.grade(c,{state:s,motion:m,x:0,y:0,w:640,h:215,still:media.matches}),expected=m.active&&(m.rankStep===1||m.rankStep===2);
   const ok=check('grade '+id+'/'+age,()=>{assert.equal(painted,expected);assert.equal(JSON.stringify(s),snapshot);
    if(expected){const d=plain(art.describe().lastGrade);assert.deepEqual(d,{ball:step.ball,from:o.oldGrade,to:o.grade,rows:o.rows,pow:o.pow,rankStep:m.rankStep,win:false,still:false});assert(traces.get(cv).ops.some(op=>reachesRole(op.image,'grade',ad)));
     const text=traces.get(cv).ops.filter(op=>op.kind==='text');assert.deepEqual(text.map(op=>op.text),['G'+o.oldGrade+' → G'+o.grade,o.rows.length+'枠入替']);assert(text.every(op=>!op.text.includes('WIN')));newFontMetrics(text);text.forEach(op=>inside(op.bounds,cv.width,cv.height,'grade information'));
     for(const op of text){c.save();c.font=op.font;const missing=[...new Set(op.text.replace(/[\s\d]/g,''))].filter(char=>{const metrics=c.measureText(char);return metrics.actualBoundingBoxAscent+metrics.actualBoundingBoxDescent===0;});c.restore();
      if(missing.length&&!report.gradeFontBackend.some(item=>item.font===op.font))report.gradeFontBackend.push({font:op.font,actualText:op.text,missingInNativeBackend:missing,scope:'Canvas mixed-font fallback; native DOM text is a Chrome gate'});}}
    else assert.equal(traces.get(cv).ops.length,0);});report.grade.push({fixture:id,age,rankStep:m.rankStep,painted,ok});
   if(age===o.rankStart){const image=save(cv,'grade-'+id+'.png');gradeContact.push({cv,label:id+' G'+o.oldGrade+' to G'+o.grade+' / '+o.rows.length+' rows; native DOM text: browser CI gate'});}
  }
 }
 contact(gradeContact,'native-grade-contact.png',{cols:1,cellW:670,cellH:275});
 const noFlip=byId['black-reversal'].steps[3],noFlipCanvas=canvas(320,108);
 assert.equal(art.grade(noFlipCanvas.getContext('2d'),{state:freeze(plain(noFlip.after)),motion:V.motion(noFlip.after,0),w:320,h:108}),false);
 assert.equal(traces.get(noFlipCanvas).ops.length,0,'off-board scheduled POW creates no grade image');

 // Exercise real native payout quotation with lightweight text containers;
 // do not pretend these specified preview widths establish CSS layout.
 const quoteCode=section(viewCode,' function quote(',' let lastBet,');
 const quote=new Function('window','numberWidth','won','materialFor',quoteCode+';return quote;')(window,64,(bet,value)=>Math.floor(bet*value/100),odds=>odds>=5000?'gold':odds>=1000?'silver':'waffle');
 const quoteContacts=[];
 for(const [id,ball] of [['carry-seven',7],['black-reversal',7],['white-reversal',8]]){
  const f=byId[id],step=f.steps[ball-1],s=step.after,cv=canvas(330,1065),c=cv.getContext('2d');art.furniture(c,'cabinet',9,0,312,1065);
  for(let row=1;row<=13;row++){
   const tile=new Element('div'),value=new Element('span');tile.append(value);quote({tile,value},s.rack[row],f.bet,s.totalHundredths);
   const face=value.querySelector('.gold-number'),amount=Math.floor(f.bet*(s.totalHundredths+s.rack[row])/100)-Math.floor(f.bet*s.totalHundredths/100),material=tile.dataset.material;
   const y=996-row*62;art.furniture(c,material,70,y,235,59);c.fillStyle='#fff0c7';c.font='900 22px "Noto Sans JP"';c.textAlign='center';c.textBaseline='middle';c.fillText(row===13?'13+':row,40,y+29);
   const fontSize=Number.parseFloat(face.style.fontSize),scale=Number(face.style.transform.match(/scaleX\(([^)]+)\)/)[1]);c.save();c.translate(285,y+29);c.scale(scale*3,3);c.font='700 '+fontSize+'px ArcadePayout';c.textAlign='right';c.textBaseline='middle';c.fillText(face.textContent,0,0);c.restore();
   const ok=check('native quote '+id+'/'+row,()=>{assert.equal(value.textContent,String(amount));assert.equal(value.getAttribute('aria-label'),amount+' WIN');assert.equal(face.textContent,String(amount));assert(fontSize>0&&fontSize<=11&&scale>0&&scale<=1);});
   report.quotes.push({fixture:id,row,amount,material,fontSize,scale,ok});
  }
  const image=save(cv,'payout-material-'+id+'.png');quoteContacts.push({cv,label:id+' / exact quote+font fit; preview geometry, CSS is a browser gate'});
 }
 contact(quoteContacts,'native-payout-material-contact.png',{cols:3,cellW:350,cellH:1120});
 const turnValue=new Element('b');turnValue.clientWidth=28;
 assert(art.fitTurn(turnValue,900600000));assert.equal(turnValue.textContent,'900600000');assert.equal(turnValue.getAttribute('aria-label'),'900600000 WIN');
 assert(art.fitTurn(turnValue,0));assert.equal(turnValue.textContent,'');assert.equal(turnValue.dataset.wf301Amount,'0');assert.equal(turnValue.getAttribute('aria-label'),'','a reset/zero turn cannot retain the prior round amount');

 const lessonContact=[];
 for(let index=0;index<4;index++){
  const cv=canvas(1040,480),c=cv.getContext('2d');c.scale(2,2);window.SweetsAttractLessons.stick.draw(c,index,.7);const ops=traces.get(cv).ops;legacyMetrics(ops);
  const ok=check('lesson '+index,()=>{assert(ops.some(op=>op.kind==='image'&&op.sources.some(file=>file.startsWith('assets/waffle-art-v301/'))));assert(!ops.some(op=>op.kind==='image'&&op.sources.some(file=>!file.startsWith('assets/waffle-art-v301/'))));});
  report.lessons.push({index,ok,sources:[...traces.get(cv).sources],image:save(cv,'lesson-'+index+'.png')});lessonContact.push({cv,label:'Native lesson '+(index+1)+'; legacy font-backend caveat recorded'});
 }
 contact(lessonContact,'native-lesson-contact.png',{cols:2,cellW:540,cellH:290});

 // After initialization the reusable source caches have fixed cardinality,
 // board caches remain bounded, and repeated real rendering reads no pixels.
 for(let size=110;size<120;size++)art.board(null,size,size*.064,size*.872/8);
 assert.equal(art.describe().boardCacheCount,8);assert.equal(art.describe().pieceCacheCount,6);
 const stable=freeze(plain(byId['black-reversal'].steps[6].after)),cv=canvas(588,588),beforeReads=readbacks,beforeGlyphs=JSON.stringify(award.describe().glyphRects);
 for(let i=0;i<120;i++){V.drawBoard(cv.getContext('2d'),stable,{age:900+i*16,bet:300000},true);}
 assert.equal(readbacks,beforeReads,'there is no alpha inspection/readback in a render frame');assert.equal(JSON.stringify(award.describe().glyphRects),beforeGlyphs);
 assert(art.describe().boardCacheCount<=8);assert.equal(art.describe().pieceCacheCount,6);assert(award.describe().cachedTextMetrics<=128);
 report.cache={...plain(art.describe()),frameReadbacks:readbacks-beforeReads,awardTextMetrics:award.describe().cachedTextMetrics};
 report.backendCaveat=report.legacyFontBackend.length||report.gradeFontBackend.length?'Native Canvas mixed-font fallback cannot establish full lesson/reach/grade typography; original source is unchanged and actual Chrome must validate native DOM labels.':'';
 assert.equal(sha256(nativeCore()),BASELINE_CORE_SHA256);assert.equal(sha256(nativeHost()),BASELINE_HOST_SHA256);assert.equal(sha256(nativePowPrefix()),BASELINE_POW_PREFIX_SHA256);
 report.loadedFiles=[...loadedFiles];report.ok=report.errors.length===0;writeReport();
 console.log(report.ok?'WAFFLE_V301_NATIVE_RENDER_PASS':'WAFFLE_V301_NATIVE_RENDER_FAIL',JSON.stringify({report:reportFile,money:report.money.length,boards:report.boards.length,pieces:report.pieces.length,grade:report.grade.length,quotes:report.quotes.length,lessons:report.lessons.length,errors:report.errors.length,legacyFontBackend:report.legacyFontBackend.length}));
 if(!report.ok){console.error(report.errors.join('\n'));process.exitCode=1;}
}
await main().catch(error=>{report.errors.push(String(error?.stack||error));writeReport();console.error(error);process.exitCode=1;});

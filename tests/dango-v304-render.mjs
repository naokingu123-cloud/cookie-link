/* Actual production Canvas assets/view/award code. Native browser CSS/input
 * and its weight-1000 font handling are verified separately by browser CI. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createCanvas,Image,Path2D,GlobalFonts} from '@napi-rs/canvas';
import {R,plain,read,section,sha256,replayDango,loadDangoOwner,inspectCue,BASELINE_RULES,BASELINE_HOST} from './dango-v304-fixtures.mjs';
const out=path.resolve('tempqa-dango-v304');fs.mkdirSync(out,{recursive:true});
const report={ok:false,scope:'Actual production canvas rendering, generated asset provenance, geometry, immutable native cues and exact current WIN. This is not a browser CSS/input/settlement check. Skia incorrectly parses pre-existing weight 1000 as font size; native code is not rewritten in this test and that backend limitation is separately reported.',boards:[],awards:[],errors:[],legacyFontBackend:[]};
const sourceFiles=new WeakMap(),trace=new WeakMap();let canvases=0,readbacks=0;
GlobalFonts.registerFromPath('/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc','Noto Sans JP');
for(const [name,file]of Object.entries({ArcadePayout:'optimized/media/a73bbbdd98d48aac.woff2',SweetReachRounded:'optimized/media/1d0a185e6cc3dc64.woff2'}))assert(GlobalFonts.register(fs.readFileSync(file),name));
function point(c,x,y){const m=c.getTransform();return {x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f};}
function bounds(c,x,y,w,h){const points=[[x,y],[x+w,y],[x,y+h],[x+w,y+h]].map(p=>point(c,...p));return {left:Math.min(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),right:Math.max(...points.map(p=>p.x)),bottom:Math.max(...points.map(p=>p.y))};}
function canvas(w=300,h=150){
 const cv=createCanvas(w,h),c=cv.getContext('2d');canvases++;trace.set(cv,{sources:new Set(),images:[],texts:[]});
 const image=c.drawImage.bind(c),text=c.fillText.bind(c),readPixels=c.getImageData.bind(c);
 c.getImageData=(...args)=>{readbacks++;return readPixels(...args);};
 c.drawImage=function(source,...args){const ret=image(source,...args),t=trace.get(cv),own=sourceFiles.get(source),sources=own?[own]:[...(trace.get(source)?.sources||[])],iw=source.naturalWidth||source.width,ih=source.naturalHeight||source.height;
  const src=args.length===8?args.slice(0,4):[0,0,iw,ih],dest=args.length===8?args.slice(4):args.length===4?args:[args[0],args[1],iw,ih];sources.forEach(s=>t.sources.add(s));t.images.push({sources,src,bounds:bounds(c,...dest)});return ret;};
 c.fillText=function(value,x,y,...args){const ret=text(value,x,y,...args),size=Number(c.font.match(/([\d.]+)px/)?.[1]),m=c.measureText(String(value));trace.get(cv).texts.push({text:String(value),font:c.font,size,ascent:m.fontBoundingBoxAscent,descent:m.fontBoundingBoxDescent});
  if(m.fontBoundingBoxAscent+m.fontBoundingBoxDescent>size*2.5&&!report.legacyFontBackend.some(o=>o.font===c.font))report.legacyFontBackend.push({font:c.font,declaredSize:size,actualAscent:m.fontBoundingBoxAscent,actualDescent:m.fontBoundingBoxDescent});return ret;};return cv;
}
class LocalImage extends Image{set src(value){const file=String(value).split('?')[0];sourceFiles.set(this,file);super.src=fs.readFileSync(file);}get src(){return sourceFiles.get(this)||'';}}
const save=(cv,name)=>{fs.writeFileSync(path.join(out,name),cv.toBuffer('image/png'));return name;};
const check=(label,fn)=>{try{return fn();}catch(e){report.errors.push(label+': '+String(e.stack||e));}};
const classes=new Set(),styles=new Map(),classList={add:x=>classes.add(x),contains:x=>classes.has(x)};
const document={createElement:tag=>{assert.equal(tag,'canvas');return canvas();},documentElement:{classList,style:{setProperty:(k,v)=>styles.set(k,v)}},body:{classList},fonts:{ready:Promise.resolve()}};
const window={DangoBingoRules:R,SweetsLineup:{chosen:['dango'],ids:['dango']}};
const c=vm.createContext({window,document,Image:LocalImage,Path2D,URLSearchParams,location:{search:''},console,Math,Promise,performance:{now:()=>0}});
try{
 assert.equal(sha256(read('assets/dango-bingo-rules.js')),BASELINE_RULES);assert.equal(sha256(read('assets/dango-bingo-host.js')),BASELINE_HOST);
 const provenance=JSON.parse(read('assets/dango-art-v304/generation-provenance.json'));assert.equal(provenance.assets.length,8);
 for(const asset of provenance.assets)assert.equal(sha256(fs.readFileSync('assets/dango-art-v304/'+asset.file)),asset.sha256,'reviewed asset bytes '+asset.file);
 report.provenance=provenance.assets.map(({key,file,sha256,bytes})=>({key,file,sha256,bytes}));
 vm.runInContext(section(read('optimized/app-01.js'),'const elixirGlyphs=','const cookieFlavors='),c);
 for(const file of ['assets/dango-art-v304.js','assets/dango-award-v304.js','assets/dango-bingo-view.js'])vm.runInContext(read(file),c,{filename:file});
 const A=window.DangoArtV304,W=window.DangoAwardV304,V=window.DangoBingoView;
 assert.deepEqual(await Promise.all([A.ready,W.ready,V.assetsReady]),[true,true,true]);assert(A.loaded&&W.loaded&&W.describe().digitsReady);assert.deepEqual(plain(A.describe().errors),[]);assert.deepEqual(plain(W.describe().errors),[]);
 assert(A.cyan.meanLuminance>=230&&A.cyan.meanBlueMinusRed>=3&&A.cyan.meanBlueMinusRed<=27,'near-white +FREE source');
 assert(classes.has('dango-art-v304'));assert(styles.has('--dango-v304-free')&&styles.has('--dango-v304-odds'));
 const owner=loadDangoOwner(),fixtures=Object.fromEntries(['ordinary','highest','legacy-zero'].map(id=>[id,replayDango(id)]));
 const boards=[['initial',fixtures.ordinary.initial],['first-hit',fixtures.ordinary.steps[0].after],['placement',fixtures.ordinary.steps[4].after],['highest',fixtures.highest.final]];
 for(const [name,state]of boards)for(const [width,height,mini]of [[430,366,false],[390,330,false],[320,270,false],[116,116,true]])check(name+' '+width,()=>{
  const cv=canvas(width,height);if(!mini){cv.clientWidth=width;cv.clientHeight=height;}
  const before=JSON.stringify(state),geometry=plain(V.geometry(width,height,{layout:mini?'compact':'main',state}));
  V.paint(cv.getContext('2d'),state,{reducedMotion:true,time:0,age:Infinity,lineAge:Infinity,plusFreeFadeAge:Infinity,reach:[]},mini);
  assert.equal(JSON.stringify(state),before);const last=plain(V.describeAssets().last[mini?'mini':'main']);assert.equal(last.imageCells,28);assert(last.standRendered);assert.equal(last.greenHitCells,3);assert.equal(last.hitSparklesPerCell,11);
  assert.deepEqual(last.geometry.centers,geometry.centers);assert.equal(last.geometry.unit,geometry.unit);
  const t=trace.get(cv);assert(t.sources.has('assets/dango-art-v304/mochi-pieces.webp'));assert(t.sources.has('assets/dango-art-v304/furniture-atlas.webp'));
  if(name==='initial'){assert.equal(last.kinds.cyan,3);assert.equal(last.kinds.green,3);}
  report.boards.push({name,width,height,mini,geometry,render:last,sources:[...t.sources],file:save(cv,name+'-'+width+(mini?'-mini':'')+'-native-canvas.png')});
 });
 const specs=[['free','ordinary',0],['bingo','ordinary',4],['commit-bingo','ordinary',5],['highest','highest',8],['zero','legacy-zero',4]];
 const contact=canvas(1050,1100),cc=contact.getContext('2d');cc.fillStyle='#18372b';cc.fillRect(0,0,1050,1100);
 let row=0;
 for(const [name,id,index]of specs)for(const [width,height,mini]of [[430,330,false],[320,260,false],[116,116,true]])check(name+' '+width,()=>{
  const f=fixtures[id],step=f.steps[index],{cue}=inspectCue(owner,step,f.bet);assert(cue);const cv=canvas(width,height),ctx=cv.getContext('2d');ctx.translate(width/2,height/2);
  assert(W.paint(ctx,{cue,width:width*.99,height:height*.86,mini,age:800,still:true}));const d=plain(W.describe()),last=d.last,t=trace.get(cv);
  assert.equal(last.role,step.oracle.role);assert.equal(last.win,step.oracle.role==='free'?null:step.oracle.win);assert.equal(last.total,true);assert(t.sources.has(last.source));
  if(step.oracle.role==='free'){assert.equal(last.winText,'');assert.equal(last.rasterNumbers,false);assert(!t.sources.has('assets/dango-art-v304/award-digits.webp'));}
  else{assert.equal(last.rasterNumbers,true);assert.deepEqual(last.glyphs,[...step.oracle.win.toLocaleString('ja-JP'),'WIN']);assert(t.sources.has('assets/dango-art-v304/award-digits.webp'));
   for(const op of t.images.filter(op=>op.sources.includes('assets/dango-art-v304/award-digits.webp'))){assert(op.bounds.left>=0&&op.bounds.right<=width&&op.bounds.top>=0&&op.bounds.bottom<=height,'every actual digit stays inside overlay');}}
  for(const op of t.texts)assert(op.ascent+op.descent<op.size*2.5,'new award uses a supported actual font size');
  const file=save(cv,name+'-'+width+(mini?'-mini':'')+'-award.png');report.awards.push({name,width,height,mini,file,last,images:t.images,texts:t.texts});
  if(width===430){cc.drawImage(cv,(row%2)*520,Math.floor(row/2)*360);row++;}
 });
 save(contact,'awards-contact.png');
 const before={canvases,readbacks},sample=inspectCue(owner,fixtures.highest.steps[8],fixtures.highest.bet).cue;
 const cv=canvas(430,366),countAfterCreation=canvases;for(let i=0;i<40;i++){const ctx=cv.getContext('2d');ctx.clearRect(0,0,430,366);ctx.save();ctx.translate(215,183);W.paint(ctx,{cue:sample,width:400,height:300,age:i*16});ctx.restore();A.bitmap(ctx,'white',0,0,40,40);}
 assert.equal(canvases,countAfterCreation,'steady paint never allocates canvas');assert.equal(readbacks,before.readbacks,'steady paint never reads pixels');
 report.cache={...A.describe(),canvases,readbacks};report.award=W.describe();report.ok=report.errors.length===0;assert(report.ok,report.errors.join('\n'));
 console.log('DANGO_V304_RENDER_PASS',JSON.stringify({boards:report.boards.length,awards:report.awards.length,cyan:A.cyan,cachedCrops:A.describe().cropsBuilt,legacyCanvasFontLimitations:report.legacyFontBackend.length}));
}catch(error){report.errors.push(String(error.stack||error));process.exitCode=1;}
finally{fs.writeFileSync(path.join(out,'native-render-report.json'),JSON.stringify(report,null,2)+'\n');console.log('DANGO_V304_RENDER_REPORT',out);}

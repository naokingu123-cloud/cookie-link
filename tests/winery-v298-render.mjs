/* Isolated real-canvas artwork verification, not a browser/gameplay test.
 * Replays reachable core witnesses, then runs the unmodified native semantic
 * and shared badge sizing with WineryArtV298 / WineryAwardV298 raster pixels.
 * No browser, wallet, remote service or production game state is used here. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createCanvas,Image,GlobalFonts} from '@napi-rs/canvas';

const root=process.cwd(),out=path.resolve(root,'qa-winery-v298');fs.mkdirSync(out,{recursive:true});
const reportFile=path.join(out,'native-render-report.json');
const scope='ISOLATED REAL-CANVAS ARTWORK ONLY. Reachable native Winery events, actual semantic function, shared badge sizing and raster renderers. Browser CSS, full gameplay, scheduling, audio and deployment are not verified here.';
const report={ok:false,scope,status:'Verification has started but has not completed.',cases:[],statusCases:[],errors:[]};
const writeReport=()=>fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');writeReport();
const moduleFile='assets/winery-award-v298.js',artFile='assets/winery-art-v298.js',ownerFile='assets/award-presentation-v277.js',coreFile='assets/winery-pyramid-core-v1.js',fixtureFile='tests/winery-v298-browser.mjs';
const assetPaths=['award-full','award-allfull','award-odds','award-boost','award-digits','glass-and-tags','payout-cabinet','boost-cabinet'].map(name=>'assets/winery-art-v298/'+name+'.webp');
const plain=value=>JSON.parse(JSON.stringify(value)),hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function deepFreeze(value){if(value&&typeof value==='object'){Object.freeze(value);for(const item of Object.values(value))deepFreeze(item);}return value;}
const rng=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const font='/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc';if(fs.existsSync(font))GlobalFonts.registerFromPath(font,'Noto Sans JP');
const media={matches:false},sourcePaths=new WeakMap(),traces=new WeakMap(),sources=new WeakMap();
const freshTrace=()=>({images:[],digitRects:[],texts:[],textMetrics:[]});
function transformedBounds(ctx,left,top,right,bottom){
 const m=ctx.getTransform(),points=[[left,top],[right,top],[left,bottom],[right,bottom]].map(([x,y])=>({x:x*m.a+y*m.c+m.e,y:x*m.b+y*m.d+m.f}));
 return {left:Math.min(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),right:Math.max(...points.map(p=>p.x)),bottom:Math.max(...points.map(p=>p.y))};
}
function trackedCanvas(width=300,height=150){
 const canvas=createCanvas(width,height),ctx=canvas.getContext('2d'),trace=freshTrace();traces.set(canvas,trace);sources.set(canvas,new Set());
 const nativeDraw=ctx.drawImage.bind(ctx),nativeFill=ctx.fillText.bind(ctx);
 ctx.drawImage=function(image,...args){
  const result=nativeDraw(image,...args),file=sourcePaths.get(image),origin=file?[file]:[...(sources.get(image)||[])];
  if(origin.length){
   const [x,y,w,h]=args.length===8?args.slice(4):args.length===4?args:[args[0],args[1],image.naturalWidth||image.width,image.naturalHeight||image.height];
   origin.forEach(item=>sources.get(canvas).add(item));trace.images.push({file:file||null,sources:origin,args:[...args],bounds:transformedBounds(ctx,x,y,x+w,y+h)});
   if(file?.endsWith('/award-digits.webp')&&args.length===8)trace.digitRects.push(args.slice(0,4));
  }
  return result;
 };
 ctx.fillText=function(text,...args){
  const value=String(text),metrics=ctx.measureText(value),size=Number(ctx.font.match(/([\d.]+)px/)?.[1]),x=args[0]||0,y=args[1]||0;
  const bounds=transformedBounds(ctx,x-metrics.actualBoundingBoxLeft,y-metrics.actualBoundingBoxAscent,x+metrics.actualBoundingBoxRight,y+metrics.actualBoundingBoxDescent);
  trace.texts.push(value);trace.textMetrics.push({text:value,font:ctx.font,size,width:metrics.width,ascent:metrics.fontBoundingBoxAscent,descent:metrics.fontBoundingBoxDescent,bounds});
  return nativeFill(value,...args);
 };
 return canvas;
}
class LocalImage extends Image{
 set src(value){const file=String(value).split('?')[0];assert(assetPaths.includes(file),'renderer only reads the eight known local artwork files: '+file);sourcePaths.set(this,file);super.src=fs.readFileSync(path.resolve(root,file));}
 get src(){return sourcePaths.get(this)||'';}
}
function unionBounds(items){assert(items.length,'visible draw operations exist');return {left:Math.min(...items.map(item=>item.bounds.left)),top:Math.min(...items.map(item=>item.bounds.top)),right:Math.max(...items.map(item=>item.bounds.right)),bottom:Math.max(...items.map(item=>item.bounds.bottom))};}
function inside(bounds,width,height,label){assert(bounds.left>=-.01&&bounds.top>=-.01&&bounds.right<=width+.01&&bounds.bottom<=height+.01,label+' stays within its actual surface: '+JSON.stringify(bounds));}
function checkTextMetrics(trace,width,height){
 for(const metrics of trace.textMetrics){
  assert(Number.isFinite(metrics.size)&&metrics.size>0&&metrics.ascent+metrics.descent>0&&metrics.ascent+metrics.descent<metrics.size*2.5,'native Canvas correctly interprets font weight/size: '+JSON.stringify(metrics));
  inside(metrics.bounds,width,height,'complete live text');
 }
}
function pixelEvidence(canvas,minFraction=.035){
 const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let opaque=0,minX=canvas.width,minY=canvas.height,maxX=-1,maxY=-1;
 for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(data[(y*canvas.width+x)*4+3]>24){opaque++;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
 assert(opaque>canvas.width*canvas.height*minFraction,'substantial actual raster pixels were painted');
 return {opaque,fraction:opaque/(canvas.width*canvas.height),bounds:[minX,minY,maxX,maxY]};
}
async function main(){
 const missing=[moduleFile,artFile,...assetPaths].filter(file=>!fs.existsSync(file));assert.deepEqual(missing,[],'finish generated artwork and both renderer modules before running pixel verification');
 const moduleCode=fs.readFileSync(moduleFile,'utf8'),artCode=fs.readFileSync(artFile,'utf8'),ownerCode=fs.readFileSync(ownerFile,'utf8'),coreSource=fs.readFileSync(coreFile,'utf8');
 const beforeRecord=ownerCode.indexOf('function recordFor(slot)'),badgeStart=ownerCode.indexOf('function paintGameBadge('),badgeEnd=ownerCode.indexOf('function paintBadge(',badgeStart);
 assert(beforeRecord>0&&badgeStart>beforeRecord&&badgeEnd>badgeStart,'actual production semantic and badge functions found');
 const ownerSlice=ownerCode.slice(0,beforeRecord)+ownerCode.slice(badgeStart,badgeEnd)+'\nwindow.__semantic298=semantic;window.__badge298=paintGameBadge;\n})();';
 const fixtureOutput=execFileSync(process.execPath,[fixtureFile,'--fixtures-only'],{cwd:root,env:{...process.env,WINERY298_GROUP:'all'},encoding:'utf8',maxBuffer:4*1024*1024});
 const verified=JSON.parse(fixtureOutput);assert.equal(verified.rulesVersion,232);assert.equal(verified.coreSha256,hash(coreFile));
 const loadedCore={exports:{}};new Function('module',coreSource)(loadedCore);const W=loadedCore.exports;
 const witnesses={};
 // The fixture helper has already compared every native transition with its
 // independent oracle. Replay the same legal inputs to capture original
 // emit payloads and actual native fx durations, not invented award data.
 for(const [id,fixture]of Object.entries(verified.fixtures)){
  const recorded=[],engine=new W.WineryEngine({random:rng(fixture.seed),sleep:async()=>{},onEvent:(event,e)=>recorded.push({event:structuredClone(event),engine:{kind:e.kind,power:e.power,roundBet:e.roundBet,totalHundredths:e.totalHundredths,fullCount:e.fullCount,mixCount:e.mixCount,mixMultiplier:e.mixMultiplier,lastNumber:e.lastNumber,processed:e.processed},fx:e.fx?structuredClone(e.fx):null})});
  engine.wait=async()=>true;engine.roundBet=fixture.bet;engine.start();
  const advance=async number=>{recorded.length=0;assert(engine.enqueueBatch([number]),'real native engine accepts the fixture number');await new Promise(resolve=>setImmediate(resolve));assert(!engine.busy,'the isolated native draw settled');return structuredClone(recorded);};
  for(const number of fixture.draws)await advance(number);
  const steps=[];
  for(const expected of fixture.steps){
   const captured=await advance(expected.number),award=captured.find(item=>item.event.phase==='wineryAward'),status=captured.find(item=>['wineryOddsUp','wineryBoost'].includes(item.event.phase));
   assert.equal(engine.processed,expected.ball);assert.equal(engine.fullCount,expected.full);assert.equal(engine.mixCount,expected.mix);assert.equal(engine.power,expected.power);assert.equal(engine.totalHundredths,expected.totalHundredths);
   assert.equal(Math.floor(fixture.bet*engine.totalHundredths/100),expected.settlement,'complete native settlement agrees with independent witness');
   if(expected.award){assert(award);for(const key of ['gain','full','mix','justFilled'])assert.deepEqual(award.event[key],expected.award[key],'captured native event matches the independent oracle: '+key);assert.equal(Math.floor(fixture.bet*award.event.gain/100),expected.award.win);}
   else assert(!award||!award.event.justFilled.length||!(award.event.gain>0||award.event.full===21),'a notification-only draw cannot create a payable award');
   if(expected.status){assert(status?.fx);assert.equal(status.fx.type,expected.status.role);for(const key of expected.status.role==='odds'?['fromMix','toMix']:['power'])assert.equal(status.fx[key],expected.status[key]);}
   steps.push({expected,captured,award:expected.award?award:null,status});
  }
  witnesses[id]={...fixture,steps};
 }
 const classes=new Set(),classList={add:name=>classes.add(name),remove:name=>classes.delete(name),contains:name=>classes.has(name)};
 const window={SweetsLineup:{ids:['cookie','choco','candy','gelato','winery'],chosen:['winery']}};
 const document={createElement(tag){assert.equal(tag,'canvas');return trackedCanvas();},fonts:{ready:Promise.resolve()},documentElement:{classList},body:{classList}};
 const safeMath=Object.create(Math);safeMath.random=()=>{throw Error('artwork must never sample gameplay RNG');};
 const context=vm.createContext({window,document,Image:LocalImage,location:{search:''},URLSearchParams,console,app:{locked:[0,0,0,0,3000]},matchMedia:()=>media,Math:safeMath,Promise});
 vm.runInContext(ownerSlice,context,{filename:ownerFile+'#native-semantic-and-badge'});vm.runInContext(artCode,context,{filename:artFile});vm.runInContext(moduleCode,context,{filename:moduleFile});
 assert.deepEqual(await Promise.all([window.WineryArtV298.ready,window.WineryAwardV298.ready]),[true,true]);
 const api=window.WineryAwardV298,artApi=window.WineryArtV298,diagnostic=plain(api.describe());assert(api.loaded&&artApi.loaded&&diagnostic.digitsReady);assert.deepEqual(diagnostic.errors,[]);
 const files=[moduleFile,artFile,ownerFile,coreFile,fixtureFile,...assetPaths];report.files=Object.fromEntries(files.map(file=>[file,{bytes:fs.statSync(file).size,sha256:hash(file)}]));report.rulesVersion=W.version;report.fixtureOracle=verified;report.font=fs.existsSync(font)?font:'system fallback';
 function witness(fixtureId,stepIndex){const fixture=witnesses[fixtureId];assert(fixture,'registered native fixture exists');const step=fixture.steps[stepIndex];assert(step?.award,'reachable payable award exists');return {fixture,step};}
 function nativeCue(fixtureId,stepIndex){
  const {fixture,step}=witness(fixtureId,stepIndex),slot=deepFreeze({i:4,engine:structuredClone(step.award.engine)}),event=deepFreeze(structuredClone(step.award.event)),before=JSON.stringify({slot,event});context.app.locked[4]=fixture.bet;
  const cue=window.__semantic298(slot,event,{});assert.equal(JSON.stringify({slot,event}),before,'actual semantic never mutates the original event or engine snapshot');assert(cue);assert.equal(cue.game,'winery');assert.equal(cue.phase,'wineryAward');assert.equal(cue.win,step.expected.award.win);assert.equal(cue.gain,step.expected.award.gain);assert.equal(cue.total,false);
  assert.deepEqual(plain(cue.winery),{full:event.full,mix:event.mix,justFilledCount:event.justFilled.length,power:slot.engine.power,mixMultiplier:(10+event.mix)/10});assert(Object.isFrozen(cue.winery));
  return {fixture,step,cue:deepFreeze({...plain(cue),age:900,duration:3100,serial:1})};
 }
 const cases=[
  {id:'full-main',fixture:'stages-desktop',step:1,width:432,height:390},
  {id:'full-next-main',fixture:'stages-desktop',step:2,width:432,height:390},
  {id:'allfull-main',fixture:'allfull-mini-390',step:0,width:432,height:390},
  {id:'allfull-large-win',fixture:'allfull-320',step:0,width:432,height:390},
  {id:'allfull-mobile-318',fixture:'allfull-320',step:0,width:318,height:287},
  {id:'allfull-mini-116',fixture:'allfull-mini-390',step:0,width:116,height:116,mini:true},
  {id:'allfull-mini-47',fixture:'allfull-mini-390',step:0,width:47,height:47,mini:true},
  {id:'full-lowbet-1',fixture:'full-lowbet-390',step:0,width:318,height:287},
  {id:'allfull-reduced',fixture:'allfull-reduced-430',step:0,width:432,height:390,reduced:true}
 ];
 const renders=[];
 for(const spec of cases){
  const {fixture,step,cue}=nativeCue(spec.fixture,spec.step),before=JSON.stringify(cue),canvas=trackedCanvas(spec.width*2,spec.height*2),ctx=canvas.getContext('2d');ctx.scale(2,2);media.matches=!!spec.reduced;
  const glints=window.__badge298(ctx,{},cue,spec.width,spec.height,!!spec.mini,0,0);assert.equal(JSON.stringify(cue),before,'actual rendering preserves the frozen native cue');
  const image=spec.id+'-native.png';fs.writeFileSync(path.join(out,image),canvas.toBuffer('image/png'));
  const d=plain(api.describe()),trace=traces.get(canvas),role=step.expected.award.role,expectedGlyphs=[...Number(step.expected.award.win).toLocaleString('ja-JP'),'WIN'];
  assert.equal(d.last.win,step.expected.award.win);assert.equal(d.last.role,role);assert.equal(d.last.label,cue.label);assert.equal(d.last.detail,cue.detail);assert.equal(d.last.mini,!!spec.mini);assert(d.last.rasterNumbers);assert.equal(d.fallbackAmounts,0);assert.deepEqual(d.last.glyphs,expectedGlyphs);
  assert.deepEqual(trace.digitRects,expectedGlyphs.map(char=>d.glyphRects[char]),'actual source rectangles in actual draw order spell the exact native WIN');
  assert(sources.get(canvas).has('assets/winery-art-v298/award-'+role+'.webp'));assert(sources.get(canvas).has('assets/winery-art-v298/award-digits.webp'));
  const event=step.award.event,expectedLabel=event.full===21?'21杯 全満！ ・ MIX '+event.mix+'杯':'満杯 '+event.full+' / 21杯 ・ MIX '+event.mix+'杯';
  assert.equal(d.last.liveLabel,expectedLabel);assert(trace.texts.includes(expectedLabel),'actual live full and MIX counts are painted with fillText');checkTextMetrics(trace,canvas.width,canvas.height);
  const amountBounds=unionBounds(trace.images.filter(item=>item.file?.endsWith('/award-digits.webp')));inside(amountBounds,canvas.width,canvas.height,'every complete numeral and WIN');
  for(const metrics of trace.textMetrics)assert(metrics.bounds.bottom<=amountBounds.top,'live count text does not overlap the generated payout numerals: '+JSON.stringify({metrics,amountBounds}));
  assert.equal(glints,spec.reduced?0:spec.mini?2:6,'reduced motion keeps the illustration while removing moving glints');
  const pixels=pixelEvidence(canvas);
  const row={...spec,role,fixture:{id:spec.fixture,seed:fixture.seed,ball:step.expected.ball,number:step.expected.number,bet:fixture.bet,nativeEvent:step.award.event,win:step.expected.award.win,settlement:step.expected.settlement},cue:plain(cue),liveLabel:expectedLabel,winText:d.last.winText,glyphs:expectedGlyphs,sourceRects:trace.digitRects,textMetrics:trace.textMetrics,amountBounds,animatedGlints:glints,sources:[...sources.get(canvas)],pixels,image};
  report.cases.push(row);renders.push({spec,row,canvas,displayWidth:spec.width,displayHeight:spec.height});console.log('WINERY_V298_NATIVE_RENDER_PASS',spec.id,step.expected.award.win);
 }
 // Information FX are captured directly from the real native boost/odds event.
 // Their duration is never replaced, and they must never paint any WIN glyphs.
 const statusCases=[{id:'odds-status',fixture:'stages-desktop',step:1},{id:'boost-status',fixture:'stages-desktop',step:0},{id:'odds-status-reduced',fixture:'stages-desktop',step:2,reduced:true}];
 for(const spec of statusCases){
  const fixture=witnesses[spec.fixture],step=fixture.steps[spec.step],native=step.status;assert(native?.fx);
  const fx=deepFreeze({...structuredClone(native.fx),elapsed:native.fx.duration/2}),before=JSON.stringify(fx),canvas=trackedCanvas(1130,636),ctx=canvas.getContext('2d');media.matches=!!spec.reduced;
  context.app.locked[4]=fixture.bet;assert.equal(window.__semantic298(deepFreeze({i:4,engine:structuredClone(native.engine)}),deepFreeze(structuredClone(native.event)),{}),null,'native information event cannot become a monetary cue');
  const amountCount=api.describe().rasterAmounts;assert(api.paintStatus(ctx,{fx,width:1130,height:636,still:!!spec.reduced}));assert.equal(JSON.stringify(fx),before,'information renderer preserves native fx');
  const d=plain(api.describe()),trace=traces.get(canvas),role=fx.type,expectedLabel=role==='odds'?'MIX '+fx.toMix+'杯  ×'+(1+fx.toMix/10).toFixed(1):'次の注入量 '+fx.power+'杯';
  assert.equal(d.lastStatus.role,role);assert.equal(d.lastStatus.label,expectedLabel);assert.equal(d.lastStatus.duration,native.fx.duration);assert.equal(d.lastStatus.elapsed,fx.elapsed);assert.equal(d.lastStatus.win,null);assert.equal(d.lastStatus.still,!!spec.reduced);assert.equal(d.rasterAmounts,amountCount);
  assert(trace.texts.includes(expectedLabel));assert(trace.texts.every(text=>!text.includes('WIN')));assert.equal(trace.digitRects.length,0);assert(!sources.get(canvas).has('assets/winery-art-v298/award-digits.webp'));assert.deepEqual([...sources.get(canvas)],['assets/winery-art-v298/award-'+role+'.webp']);checkTextMetrics(trace,canvas.width,canvas.height);
  for(const item of trace.images)inside(item.bounds,canvas.width,canvas.height,'information illustration');
  for(const elapsed of [-1,fx.duration+1]){const blank=trackedCanvas(1130,636),invalid=deepFreeze({...fx,elapsed});assert.equal(api.paintStatus(blank.getContext('2d'),{fx:invalid,width:1130,height:636,still:!!spec.reduced}),false);assert.equal(traces.get(blank).images.length,0,'outside the native duration there is no status image');}
  const image=spec.id+'-native.png',row={...spec,role,fx:plain(fx),label:expectedLabel,win:null,sources:[...sources.get(canvas)],textMetrics:trace.textMetrics,pixels:pixelEvidence(canvas),image};fs.writeFileSync(path.join(out,image),canvas.toBuffer('image/png'));report.statusCases.push(row);renders.push({spec,row,canvas,displayWidth:432,displayHeight:432*canvas.height/canvas.width});console.log('WINERY_V298_NATIVE_STATUS_PASS',spec.id,expectedLabel);
 }
 // The all-full notification following an award, including the reachable
 // already-full eighth ball, remains silent in the shared monetary owner.
 const repeated=witnesses['allfull-320'].steps[1];assert.equal(repeated.award,null);
 for(const captured of repeated.captured.filter(item=>item.event.phase.startsWith('winery'))){context.app.locked[4]=300000;assert.equal(window.__semantic298({i:4,engine:captured.engine},captured.event,{}),null);}
 const digitImage=new LocalImage();digitImage.src='assets/winery-art-v298/award-digits.webp';await digitImage.decode();
 const glyphOrder=['0','1','2','3','4','5','6','7','8','9',',','WIN'],glyphSheet=createCanvas(1120,660),gx=glyphSheet.getContext('2d');gx.fillStyle='#21142d';gx.fillRect(0,0,1120,660);gx.fillStyle='#fff1d0';gx.font='bold 22px "Noto Sans JP"';gx.fillText('ワイナリー：実際に登録された数字・区切り・WIN',24,34);
 for(let index=0;index<glyphOrder.length;index++){
  const name=glyphOrder[index],rect=diagnostic.glyphRects[name];assert(Array.isArray(rect)&&rect.length===4);const [sx,sy,sw,sh]=rect,col=index%4,row=Math.floor(index/4),x0=Math.round(col*digitImage.naturalWidth/4),x1=Math.round((col+1)*digitImage.naturalWidth/4),y0=Math.round(row*digitImage.naturalHeight/3),y1=Math.round((row+1)*digitImage.naturalHeight/3);
  assert(sw>0&&sh>0&&sx>=x0&&sy>=y0&&sx+sw<=x1&&sy+sh<=y1,'the exact '+name+' crop stays in its own registered atlas cell');
  const x=col*280,y=58+row*192,fit=Math.min(220/sw,132/sh);gx.fillStyle='#39223e';gx.fillRect(x+12,y,256,176);gx.drawImage(digitImage,sx,sy,sw,sh,x+140-sw*fit/2,y+12+(132-sh*fit)/2,sw*fit,sh*fit);gx.fillStyle='#ecd5ea';gx.font='15px "Noto Sans JP"';gx.fillText(name+'  ['+rect.join(', ')+']',x+24,y+154);
 }
 gx.fillStyle='#bca0c5';gx.font='13px "Noto Sans JP"';gx.fillText('セルの意味・欠け・他文字の混入は、この実ピクセルの切り出しでも目視確認します。',24,646);fs.writeFileSync(path.join(out,'native-digit-glyphs.png'),glyphSheet.toBuffer('image/png'));report.glyphRects=diagnostic.glyphRects;
 const cachedBefore=artApi.describe().cachedPixels,spriteBefore=artApi.sprite('glass-fit'),cupCanvas=trackedCanvas(600,220),cx=cupCanvas.getContext('2d');
 assert(artApi.glass(cx,150,35,false));assert(artApi.plaque(cx,150,134,false));assert(artApi.glass(cx,450,35,true));assert(artApi.plaque(cx,450,134,true));
 assert.equal(artApi.sprite('glass-fit'),spriteBefore,'per-frame glass draws reuse the decoded canvas');assert.equal(artApi.describe().cachedPixels,cachedBefore,'drawing never grows the bitmap cache');
 assert(sources.get(cupCanvas).has('assets/winery-art-v298/glass-and-tags.webp'),'both real cup and tag hooks draw pixels from the dedicated sheet');
 // No native fluid was drawn here: the center of each live liquid window
 // must remain transparent for the lower native juice canvas to show through.
 for(const center of [150,450]){const a=cx.getImageData(center-7,65,14,14).data;let alpha=0;for(let i=3;i<a.length;i+=4)alpha+=a[i];assert.equal(alpha,0,'new crystal artwork preserves the native liquid window');}
 report.artHooks={sources:[...sources.get(cupCanvas)],pixels:pixelEvidence(cupCanvas,.015),liquidWindowsTransparent:true};fs.writeFileSync(path.join(out,'native-glasses-tags.png'),cupCanvas.toBuffer('image/png'));
 const artSheet=createCanvas(960,550),ax=artSheet.getContext('2d');ax.fillStyle='#21142d';ax.fillRect(0,0,960,550);ax.fillStyle='#fff1d0';ax.font='bold 22px "Noto Sans JP"';ax.fillText('ワイナリー：専用グラス・札・配当／増量キャビネット素材',24,36);
 ax.font='17px "Noto Sans JP"';ax.fillText('通常のグラス／札',52,86);ax.fillText('満杯のグラス／札',280,86);
 for(let y=106;y<282;y+=11)for(let x=20;x<500;x+=11){ax.fillStyle=((x-20)/11+(y-106)/11)%2?'#5b435b':'#806b79';ax.fillRect(x,y,11,11);}ax.drawImage(cupCanvas,20,106,480,176);
 ax.fillStyle='#d9bfdc';ax.font='14px "Noto Sans JP"';ax.fillText('市松模様は透明な液体窓の確認用。',24,320);ax.fillText('液体と抽選番号は本番の native 描画が担当します。',24,346);
 report.cabinets=[];
 for(const [name,x,y,w,h]of [['payout',530,88,132,396],['boost',734,126,180,240]]){
  const source=new LocalImage();source.src=artApi.asset(name);await source.decode();const file=sourcePaths.get(source);assert.equal(file,'assets/winery-art-v298/'+name+'-cabinet.webp');ax.drawImage(source,x,y,w,h);ax.fillStyle='#d9bfdc';ax.font='15px "Noto Sans JP"';ax.fillText(name==='payout'?'配当素材':'増量素材',x,y+h+28);report.cabinets.push({name,file,width:source.naturalWidth,height:source.naturalHeight});
 }
 ax.fillStyle='#bca0c5';ax.font='13px "Noto Sans JP"';ax.fillText('各キャビネットは素材の単独表示です。可変の配当額・MIX・増量の文字は CSS／DOM 検証で確認します。',24,522);fs.writeFileSync(path.join(out,'native-board-art-contact.png'),artSheet.toBuffer('image/png'));
 const columns=3,cellW=464,cellH=466,rows=Math.ceil(renders.length/columns),sheet=createCanvas(columns*cellW,rows*cellH+86),sx=sheet.getContext('2d');sx.fillStyle='#171021';sx.fillRect(0,0,sheet.width,sheet.height);sx.textBaseline='top';
 for(let i=0;i<renders.length;i++){
  const {spec,row,canvas,displayWidth,displayHeight}=renders[i],x=(i%columns)*cellW,y=38+Math.floor(i/columns)*cellH;sx.fillStyle='#2b173a';sx.fillRect(x+8,y+8,cellW-16,cellH-16);sx.fillStyle='#fff1cf';sx.font='bold 17px "Noto Sans JP"';sx.fillText(spec.id,x+20,y+18);sx.fillStyle='#d9bfdc';sx.font='13px "Noto Sans JP"';
  sx.fillText(typeof row.fixture==='object'?row.fixture.win.toLocaleString('ja-JP')+' WIN · '+row.liveLabel:row.label+' · 金銭配当なし',x+20,y+44);
  sx.drawImage(canvas,x+(cellW-displayWidth)/2,y+70+(380-displayHeight)/2,displayWidth,displayHeight);
  if(spec.mini){sx.fillStyle='#b59cbc';sx.font='12px "Noto Sans JP"';sx.fillText('ミニの元サイズ（拡大なし）',x+20,y+426);}
 }
 sx.fillStyle='#e4c8ea';sx.font='18px "Noto Sans JP"';sx.fillText('ワイナリーピラミッド：実ルール・実描画コードによる素材検証',20,12);sx.fillStyle='#c3a9c9';sx.font='13px "Noto Sans JP"';sx.fillText('独立 Canvas 検証です。ブラウザーの CSS、操作、進行、音声の確認は含みません。',20,sheet.height-34);fs.writeFileSync(path.join(out,'native-render-contact.png'),sheet.toBuffer('image/png'));
 // Worker entry guards must return before creating any bitmap/canvas work.
 for(const search of ['?downloadWorker=1','?serverSettlementWorker=1']){const workerWindow={};const worker=vm.createContext({window:workerWindow,location:{search},URLSearchParams});vm.runInContext(artCode,worker);vm.runInContext(moduleCode,worker);assert.equal(workerWindow.WineryArtV298,undefined);assert.equal(workerWindow.WineryAwardV298,undefined);}
 report.renderer=plain(api.describe());report.art=plain(artApi.describe());report.workerGuards=true;report.ok=true;report.status='Completed';writeReport();console.log('WINERY_V298_NATIVE_RENDER_REPORT',reportFile);
}
try{await main();}catch(error){report.errors.push(String(error?.stack||error));report.status='Failed';writeReport();throw error;}

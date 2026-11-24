/* Real Canvas integration, not a browser or wallet test. Reached core traces
 * feed the production semantic adapter, badge sizing, award/board artwork and
 * unmodified PopcornView. Raster provenance, live values, fit and cache reuse
 * are observed independently from actual drawImage/fillText operations. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {createCanvas,Image,GlobalFonts} from '@napi-rs/canvas';
import {buildPopcornFixtures,replayPopcornFixture,loadPopcorn,plain,independentPayout,CLEAR_MULTIPLIERS,fixtureSummary} from './popcorn-v299-fixtures.mjs';
import {loadPopcornOwner} from './popcorn-v299-awards.mjs';

const root=process.cwd(),out=path.resolve(root,'qa-popcorn-v299');fs.mkdirSync(out,{recursive:true});
const reportFile=path.join(out,'native-render-report.json'),read=file=>fs.readFileSync(path.resolve(root,file),'utf8');
const artFile='assets/popcorn-art-v299.js',awardFile='assets/popcorn-award-v299.js',ownerFile='assets/award-presentation-v277.js',viewFile='assets/popcorn-view.js';
const assetNames=['award-pop','award-clear','award-grand','award-boost','award-digits','kernel-pieces','payout-cabinet','port-furniture'];
const assets=assetNames.map(name=>'assets/popcorn-art-v299/'+name+'.webp'),provenanceFile='assets/popcorn-art-v299/generation-provenance.json';
const report={ok:false,scope:'ISOLATED REAL CANVAS. Actual native traces, semantic snapshots, badge sizing, generated artwork and PopcornView with locally decoded legacy Popcorn backgrounds. Browser CSS, scheduling, input, audio, wallet and deployment are not verified here.',cases:[],boost:[],boards:[],errors:[]};
const writeReport=()=>fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');writeReport();
const hash=file=>createHash('sha256').update(fs.readFileSync(path.resolve(root,file))).digest('hex');
const font='/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc';if(fs.existsSync(font))GlobalFonts.registerFromPath(font,'Noto Sans JP');
const sourceFiles=new WeakMap(),traces=new WeakMap(),canvases=[],loadedFiles=new Set(),media={matches:false};
const fresh=()=>({ops:[],sources:new Set()});
function freeze(value){if(value&&typeof value==='object'){Object.freeze(value);for(const child of Object.values(value))freeze(child);}return value;}
function bounds(ctx,x,y,w,h){const m=ctx.getTransform(),p=[[x,y],[x+w,y],[x,y+h],[x+w,y+h]].map(([a,b])=>[m.a*a+m.c*b+m.e,m.b*a+m.d*b+m.f]);return {left:Math.min(...p.map(v=>v[0])),top:Math.min(...p.map(v=>v[1])),right:Math.max(...p.map(v=>v[0])),bottom:Math.max(...p.map(v=>v[1]))};}
function canvas(width=300,height=150){
 const cv=createCanvas(width,height),ctx=cv.getContext('2d');traces.set(cv,fresh());canvases.push(cv);
 const draw=ctx.drawImage.bind(ctx),fill=ctx.fillText.bind(ctx);
 ctx.drawImage=function(image,...args){
  const result=draw(image,...args),trace=traces.get(cv),file=sourceFiles.get(image),inherited=traces.get(image),sources=file?[file]:[...(inherited?.sources||[])];
  const iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height;
  const sourceRect=args.length===8?args.slice(0,4):[0,0,iw,ih],dest=args.length===8?args.slice(4):args.length===4?args:[args[0],args[1],iw,ih];
  sources.forEach(s=>trace.sources.add(s));trace.ops.push({kind:'image',image,file:file||null,sources,sourceRect,dest,bounds:bounds(ctx,...dest),alpha:ctx.globalAlpha});return result;
 };
 ctx.fillText=function(value,...args){
  const text=String(value),m=ctx.measureText(text),x=args[0]||0,y=args[1]||0;
  const advanceLeft=ctx.textAlign==='center'?-m.width/2:['right','end'].includes(ctx.textAlign)?-m.width:0;
  // Include the whole shaping advance as well as the ink box. Some native
  // CJK font backends under-report actualBoundingBoxRight at tiny sizes.
  const left=Math.min(-m.actualBoundingBoxLeft,advanceLeft),right=Math.max(m.actualBoundingBoxRight,advanceLeft+m.width);
  traces.get(cv).ops.push({kind:'text',text,font:ctx.font,size:Number(ctx.font.match(/([\d.]+)px/)?.[1]),width:m.width,
   ascent:m.fontBoundingBoxAscent,descent:m.fontBoundingBoxDescent,bounds:bounds(ctx,x+left,y-m.actualBoundingBoxAscent,right-left,m.actualBoundingBoxAscent+m.actualBoundingBoxDescent),alpha:ctx.globalAlpha});
  return fill(value,...args);
 };
 return cv;
}
function reset(cv){traces.set(cv,fresh());cv.getContext('2d').clearRect(0,0,cv.width,cv.height);}
class LocalImage extends Image{
 set src(value){
  const file=path.posix.normalize(String(value).split('?')[0]);assert(file.startsWith('assets/')&&!file.includes('://'),'only local repository artwork may be decoded');
  assert(fs.existsSync(path.resolve(root,file)),'local artwork exists: '+file);sourceFiles.set(this,file);loadedFiles.add(file);super.src=fs.readFileSync(path.resolve(root,file));
 }
 get src(){return sourceFiles.get(this)||'';}
}
function inside(b,width,height,label){assert(b.left>=-.15&&b.top>=-.15&&b.right<=width+.15&&b.bottom<=height+.15,label+' exceeds its painted surface: '+JSON.stringify(b));}
function within(b,frame,label){assert(b.left>=frame.left-.3&&b.top>=frame.top-.3&&b.right<=frame.right+.3&&b.bottom<=frame.bottom+.3,label+' exceeds its actual row: '+JSON.stringify({b,frame}));}
function union(items){assert(items.length);return {left:Math.min(...items.map(p=>p.bounds.left)),top:Math.min(...items.map(p=>p.bounds.top)),right:Math.max(...items.map(p=>p.bounds.right)),bottom:Math.max(...items.map(p=>p.bounds.bottom))};}
function fontMetrics(ops){for(const p of ops.filter(p=>p.kind==='text'))assert(Number.isFinite(p.size)&&p.size>0&&p.ascent+p.descent>0&&p.ascent+p.descent<p.size*2.5,'native Canvas interprets the declared font size correctly: '+JSON.stringify(p));}
function pixels(cv){const d=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;let opaque=0;for(let i=3;i<d.length;i+=4)if(d[i]>24)opaque++;assert(opaque>cv.width*cv.height*.025,'real nonempty pixels exist');return {opaque,fraction:opaque/(cv.width*cv.height)};}
function save(cv,name){fs.writeFileSync(path.join(out,name),cv.toBuffer('image/png'));return name;}
function check(label,fn){try{fn();return true;}catch(error){report.errors.push(label+': '+String(error?.stack||error));return false;}}
function serialOps(ops){return ops.map(({image,...op})=>op);}
function section(source,start,end){const a=source.indexOf(start),b=source.indexOf(end,a+start.length);assert(a>=0&&b>a);return source.slice(a,b);}

async function main(){
 assert.deepEqual([artFile,awardFile,...assets].filter(file=>!fs.existsSync(path.resolve(root,file))),[],'all eight generated assets and both modules are required');
 const artCode=read(artFile),awardCode=read(awardFile),viewCode=read(viewFile),ownerCode=read(ownerFile),K=loadPopcorn(),provenance=JSON.parse(read(provenanceFile));
 assert.equal(provenance.version,299);assert.equal(provenance.assets.length,8);
 for(const asset of provenance.assets)assert.equal(hash('assets/popcorn-art-v299/'+asset.file),asset.sha256,'rendered WebP is the reviewed generated source: '+asset.file);
 const classSet=new Set(),classList={add:name=>classSet.add(name),contains:name=>classSet.has(name)};
 const window={PopcornEngine:K,SweetsLineup:{ids:['popcorn'],chosen:['popcorn']},matchMedia:()=>media};
 const document={createElement(tag){assert.equal(tag,'canvas');return canvas();},fonts:{ready:Promise.resolve()},documentElement:{classList},body:{classList}};
 const safeMath=Object.create(Math);safeMath.random=()=>{throw Error('presentation must not sample gameplay/ambient RNG');};
 const context=vm.createContext({window,document,Image:LocalImage,location:{search:''},URLSearchParams,console,Math:safeMath,Promise,
  performance:{now:()=>0},matchMedia:()=>media,app:{locked:[3000]},drawSweetFrame:()=>{throw Error('loaded v299 furniture fell through to the retired frame');}});
 vm.runInContext(artCode,context,{filename:artFile});vm.runInContext(awardCode,context,{filename:awardFile});
 assert.deepEqual(await Promise.all([window.PopcornArtV299.ready,window.PopcornAwardV299.ready]),[true,true]);
 const art=window.PopcornArtV299,award=window.PopcornAwardV299;
 assert(art.loaded&&award.loaded&&award.describe().digitsReady);assert.deepEqual(plain(art.describe().errors),[]);assert.deepEqual(plain(award.describe().errors),[]);
 vm.runInContext(viewCode,context,{filename:viewFile});await window.PopcornView.assetsReady;const V=window.PopcornView;
 // Retain the actual shared sizing/fade path, without its DOM scheduler.
 const recordAt=ownerCode.indexOf('function recordFor(');assert(recordAt>0);
 const badge=ownerCode.slice(0,recordAt)+section(ownerCode,'function paintGameBadge(','function paintBadge(')+'\nwindow.__badge299=paintGameBadge;\n})();';
 vm.runInContext(badge,context,{filename:ownerFile+'#native-badge-sizing'});
 const semantics=loadPopcornOwner(),fixtures=buildPopcornFixtures(),byId=Object.fromEntries(fixtures.map(f=>[f.id,f])),variants=new Map();
 const getFixture=(id,bet)=>{const key=id+':'+bet;if(!variants.has(key))variants.set(key,bet===undefined?byId[id]:replayPopcornFixture(id,{bet}));return variants.get(key);};
 report.files=Object.fromEntries([artFile,awardFile,viewFile,ownerFile,'assets/popcorn-engine.js',provenanceFile,...assets].map(file=>[file,{bytes:fs.statSync(path.resolve(root,file)).size,sha256:hash(file)}]));report.registeredAtlasLayout=provenance.atlasLayout;
 report.fixtureOracle=fixtures.map(fixtureSummary);report.font=fs.existsSync(font)?font:'system fallback';
 function cueFor(fixture,step){
  semantics.app.locked[0]=fixture.bet;
  const slot=freeze({i:0,engine:{kind:'popcorn',state:plain(step.after),trace:plain(step.trace),roundBet:fixture.bet}}),before=JSON.stringify(slot);
  const cue=semantics.semantic(slot,{phase:'popcornDraw',number:step.number},{});
  assert.equal(JSON.stringify(slot),before);assert(cue);assert.equal(cue.win,step.oracle.nativeWinDelta);assert.equal(cue.gain,step.oracle.gain);
  return freeze({...plain(cue),age:900,duration:3100,serial:1});
 }
 const moneyCases=[
  {id:'pop-ordinary-main',fixture:'pops-lowbet',ball:6,width:430,height:372},
  {id:'pop-native-5',fixture:'pops-lowbet',ball:5,width:318,height:275},
  {id:'clear-first-main',fixture:'clear-ladder',ball:4,width:430,height:372},
  {id:'clear-second-main',fixture:'clear-ladder',ball:5,width:430,height:372},
  {id:'grand-native-105',fixture:'clear-ladder',ball:6,bet:5,width:430,height:372},
  {id:'grand-61350000-mobile',fixture:'clear-ladder',ball:8,bet:300000,width:318,height:275},
  {id:'pop-mini116',fixture:'pops-lowbet',ball:5,width:116,height:116,mini:true},
  {id:'clear-mini116',fixture:'rainbow',ball:3,width:116,height:116,mini:true},
  {id:'grand-mini116',fixture:'clear-ladder',ball:6,width:116,height:116,mini:true},
  {id:'grand-large-mini47',fixture:'clear-ladder',ball:8,bet:300000,width:47,height:47,mini:true},
  {id:'rainbow-clear-reduced',fixture:'rainbow',ball:3,width:430,height:372,reduced:true},
  {id:'grand-reduced',fixture:'clear-ladder',ball:6,bet:5,width:430,height:372,reduced:true}
 ],renders=[];
 for(const spec of moneyCases){
  const fixture=getFixture(spec.fixture,spec.bet),step=fixture.steps[spec.ball-1],cue=cueFor(fixture,step),before=JSON.stringify({cue,state:step.after,trace:step.trace});
  const cv=canvas(spec.width*2,spec.height*2),ctx=cv.getContext('2d');ctx.scale(2,2);media.matches=!!spec.reduced;
  cv.closest=()=>({classList:{contains:name=>name==='popcorn-v299-award-owned'}});
  const elapsed=cue.delay+cue.age,turn=elapsed<V.duration(step.trace)?step.trace:null;
  V.draw(ctx,freeze(plain(step.after)),{width:spec.width,height:spec.height,mini:!!spec.mini,time:elapsed,turn:turn&&freeze(plain(turn)),elapsed,still:!!spec.reduced});
  const from=traces.get(cv).ops.length,glints=window.__badge299(ctx,{},cue,spec.width,spec.height,!!spec.mini,0,0),ops=traces.get(cv).ops.slice(from),d=plain(award.describe());
  const image=save(cv,spec.id+'-native.png'),expectedGlyphs=[...String(step.oracle.nativeWinDelta.toLocaleString('ja-JP')),'WIN'];
  const digitOps=ops.filter(op=>op.file==='assets/popcorn-art-v299/award-digits.webp'),label=step.oracle.clear?'全消し '+step.after.clears+'回目 ・ 今回 '+step.trace.count+' POP':step.trace.count+' POP ・ '+step.trace.waves.length+'連鎖';
  const amountBounds=digitOps.length?union(digitOps):null,labelOps=ops.filter(op=>op.kind==='text'&&op.text===label);
  const ok=check(spec.id,()=>{
   assert.equal(JSON.stringify({cue,state:step.after,trace:step.trace}),before,'paint leaves the native event and state unchanged');
   assert.equal(d.last.role,step.oracle.role);assert.equal(d.last.liveLabel,label);assert.equal(d.last.win,step.oracle.nativeWinDelta);assert(d.last.rasterNumbers);assert.equal(d.fallbackAmounts,0);
   assert.deepEqual(d.last.glyphs,expectedGlyphs);assert.deepEqual(digitOps.map(op=>op.sourceRect),expectedGlyphs.map(glyph=>d.glyphRects[glyph]),'actual atlas crops spell the exact native value in draw order');
   assert(ops.some(op=>op.file==='assets/popcorn-art-v299/award-'+step.oracle.role+'.webp'));
   assert.equal(labelOps.length,1,'one real fillText carries the complete live native count label');fontMetrics(ops);
   for(const op of [...digitOps,...labelOps])inside(op.bounds,cv.width,cv.height,'complete live payout/count');
   assert(labelOps[0].bounds.bottom<=amountBounds.top,'native count ribbon does not overlap large sculpted numerals');
   assert.equal(glints,spec.reduced?0:spec.mini?2:6);pixels(cv);
  });
  const row={...spec,ok,bet:fixture.bet,number:step.number,win:step.oracle.nativeWinDelta,legacyWin:step.oracle.legacyWin,role:step.oracle.role,
   liveLabel:label,popcorn:plain(cue.popcorn),glyphs:expectedGlyphs,sourceRects:digitOps.map(op=>op.sourceRect),amountBounds,text:serialOps(labelOps),
   sources:[...new Set(ops.flatMap(op=>op.sources||[]))],glints,image};report.cases.push(row);renders.push({spec,row,cv});
 }

 // All glyph source cells are inspected independently, including those not
 // used by a particular monetary case. The contact uses the exact crop.
 const diagnostic=plain(award.describe()),digits=new LocalImage();digits.src='assets/popcorn-art-v299/award-digits.webp';await digits.decode();
 const glyphOrder=['0','1','2','3','4','5','6','7','8','9',',','WIN'],glyphSheet=createCanvas(1120,650),gx=glyphSheet.getContext('2d');gx.fillStyle='#241820';gx.fillRect(0,0,1120,650);
 for(let index=0;index<12;index++){
  const glyph=glyphOrder[index],rect=diagnostic.glyphRects[glyph],[sx,sy,sw,sh]=rect,col=index%4,row=Math.floor(index/4);
  // The final reviewed source registers a wider bottom-right sculpted WIN.
  // Its blank comma/WIN gutter is at 72.5%, as recorded in provenance.
  const x0=Math.round((index===11?.725:col/4)*digits.naturalWidth),x1=Math.round((index===10?.725:(col+1)/4)*digits.naturalWidth),y0=Math.round(row*digits.naturalHeight/3),y1=Math.round((row+1)*digits.naturalHeight/3);
  check('glyph '+glyph,()=>{assert(sw>0&&sh>0&&sx>=x0+2&&sy>=y0+2&&sx+sw<=x1-2&&sy+sh<=y1-2,'the complete registered glyph has a clear gutter inside its own cell');});
  const k=Math.min(218/sw,142/sh),x=col*280,y=28+row*202;gx.fillStyle='#49303c';gx.fillRect(x+12,y,256,186);gx.drawImage(digits,...rect,x+140-sw*k/2,y+8+(142-sh*k)/2,sw*k,sh*k);gx.fillStyle='#fff1cb';gx.font='14px "Noto Sans JP"';gx.fillText(glyph+' ['+rect.join(',')+']',x+23,y+169);
 }
 save(glyphSheet,'native-digit-glyphs.png');report.glyphRects=diagnostic.glyphRects;

 // Actual native view: intact pieces, all eleven live table rows, and both
 // numbered special signs are drawn from generated cache surfaces.
 const mainAtlas=art.atlas(false),miniAtlas=art.atlas(true),source256=art.source(),names=['cream','yellow','red','purple','blue','rainbow'],ad=plain(art.describe());
 report.atlas={tiles:ad.atlasTiles,sourceRects:ad.sourceRects,cachedPixels:ad.cachedPixels};
 for(const [file,keys,rowCuts] of [['kernel-pieces.webp',names,[0,.5,1]],['port-furniture.webp',['port','all','up','bonus','odds','row'],[0,.6,1]]]){
  const source=new LocalImage();source.src='assets/popcorn-art-v299/'+file;await source.decode();const cv=createCanvas(source.naturalWidth,source.naturalHeight),cx=cv.getContext('2d');cx.drawImage(source,0,0);const data=cx.getImageData(0,0,cv.width,cv.height).data;
  keys.forEach((key,index)=>{
   const col=index%3,row=Math.floor(index/3),x0=Math.round(col*cv.width/3),x1=Math.round((col+1)*cv.width/3),y0=Math.round(rowCuts[row]*cv.height),y1=Math.round(rowCuts[row+1]*cv.height);
   let l=x1,t=y1,r=-1,b=-1,edgePixels=0;
   for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(data[(y*cv.width+x)*4+3]>=18){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);if(x===x0||x===x1-1||y===y0||y===y1-1)edgePixels++;}
   const padded=[Math.max(x0,l-2),Math.max(y0,t-2),Math.min(x1-1,r+2)-Math.max(x0,l-2)+1,Math.min(y1-1,b+2)-Math.max(y0,t-2)+1];
   check('registered source '+key,()=>{assert(r>=l&&b>=t);assert.equal(edgePixels,0,'no opaque sprite crosses its reviewed source-cell boundary');assert.deepEqual(ad.sourceRects[key],padded,'actual source rect is the whole independently observed sprite plus its padding');});
  });
 }
 check('normalised three-resolution atlases',()=>{
  assert.deepEqual(ad.atlasTiles,[18,54,256]);assert.equal(source256,art.atlas(false,true));
  for(const [tile,atlas] of [[18,miniAtlas],[54,mainAtlas],[256,source256]]){
   assert.deepEqual([atlas.width,atlas.height],[tile*6,tile]);const draws=traces.get(atlas).ops.filter(op=>op.kind==='image');assert.equal(draws.length,6);
   draws.forEach((op,power)=>{
    assert.equal(op.image,art.sprite(names[power]));const sourceOps=traces.get(op.image).ops.filter(item=>item.kind==='image'&&item.file==='assets/popcorn-art-v299/kernel-pieces.webp');assert.equal(sourceOps.length,1);assert.deepEqual(sourceOps[0].sourceRect,ad.sourceRects[names[power]]);
    const reference=traces.get(source256).ops.filter(item=>item.kind==='image')[power];
    for(let i=0;i<4;i++)assert(Math.abs(op.dest[i]/tile-reference.dest[i]/256)<1e-10,'intact and burst tiles use identical fitting');
   });
  }
 });
 function checkRows(cv,state){
  const ops=traces.get(cv).ops,rows=[];
  for(let index=0;index<ops.length;index++)if(ops[index].image===art.sprite('row')){
   const slices=[ops[index]],sprite=art.sprite('row'),sourceX=Math.round(sprite.width*.10),sourceWidth=sprite.width-2*sourceX;
   while(ops[index+1]?.image===sprite)slices.push(ops[++index]);
   assert.equal(slices.length,3,'each native row uses the complete generated face and both decorative trims');
   let sourceY=0,destY=slices[0].dest[1];
   for(const op of slices){
    assert.equal(op.sourceRect[0],sourceX);assert.equal(op.sourceRect[1],sourceY);assert.equal(op.sourceRect[2],sourceWidth,'row uses the registered central face instead of the cropped outer popcorn corners');
    assert(op.sourceRect[3]>0);sourceY+=op.sourceRect[3];
    assert.equal(op.dest[0],slices[0].dest[0]);assert.equal(op.dest[2],slices[0].dest[2]);
    assert(Math.abs(op.dest[1]-destY)<1e-8,'row destination slices have no missing or repeated strip');
    assert(op.dest[3]>0);destY+=op.dest[3];
   }
   assert.equal(sourceY,sprite.height,'row slices preserve every central-face source row once');
   const text=[];for(let j=index+1;j<ops.length&&text.length<2;j++)if(ops[j].kind==='text')text.push(ops[j]);
   rows.push({box:union(slices),text,slices:slices.map(op=>({sourceRect:op.sourceRect,dest:op.dest,bounds:op.bounds}))});
  }
  const top=Math.min(8,Math.max(3,state.clears+1)),wanted=[];
  for(let n=top;n>=top-2;n--)wanted.push([n+'回目',String(Math.floor(state.bet*CLEAR_MULTIPLIERS[n-1]+1e-8))]);
  const highest=Math.floor((479-state.firstPopAward)/10),active=Math.floor((state.popped-state.firstPopAward)/10),offset=Math.max(0,Math.min(highest-7,active-1));
  for(let i=offset+7;i>=offset;i--){const n=state.firstPopAward+i*10;wanted.push([n+'個',String(independentPayout(n,0,state.bet,state.firstPopAward))]);}
  assert.equal(rows.length,11);assert.deepEqual(rows.map(row=>row.text.map(op=>op.text)),wanted,'three clear and eight POP table rows retain every native amount');
  rows.forEach(row=>row.text.forEach(op=>{fontMetrics([op]);within(op.bounds,row.box,'full table tag/amount');}));
  assert.equal(ops.filter(op=>op.image===art.sprite('bonus')).length,1);assert.equal(ops.filter(op=>op.image===art.sprite('odds')).length,1);
  assert.equal(ops.filter(op=>op.kind==='text'&&op.text==='WIN').length,2,'one live WIN unit belongs to each generated table header');
  return rows.map(row=>({bounds:row.box,slices:row.slices,text:serialOps(row.text)}));
 }
 const boardCases=[
  {id:'board-six-grades-main430',fixture:'rainbow',ball:3,before:true,width:430,height:372},
  {id:'board-six-grades-mini116',fixture:'rainbow',ball:3,before:true,width:116,height:116,mini:true},
  {id:'board-high-table-main430',fixture:'clear-ladder',ball:8,bet:300000,width:430,height:372},
  {id:'board-high-table-mobile318',fixture:'clear-ladder',ball:8,bet:300000,width:318,height:275}
 ];
 for(const spec of boardCases){
  const fixture=getFixture(spec.fixture,spec.bet),step=fixture.steps[spec.ball-1],state=freeze(plain(spec.before?step.before:step.after)),before=JSON.stringify(state),cv=canvas(spec.width*2,spec.height*2),ctx=cv.getContext('2d');ctx.scale(2,2);media.matches=false;
  V.draw(ctx,state,{width:spec.width,height:spec.height,mini:!!spec.mini,time:5000,elapsed:Infinity});
  const ops=traces.get(cv).ops,atlas=spec.mini?miniAtlas:mainAtlas,tile=atlas.height,draws=ops.filter(op=>op.image===atlas),grades=Array(6).fill(0);draws.forEach(op=>grades[op.sourceRect[0]/tile]++);
  let rows=[];const ok=check(spec.id,()=>{
   assert.equal(JSON.stringify(state),before);assert.deepEqual(grades,Array.from({length:6},(_,grade)=>state.board.filter(piece=>piece?.power===grade).length),'actual native intact piece draws map every real grade to its own tile');
   draws.forEach(op=>assert.deepEqual(op.sourceRect,[Math.round(op.sourceRect[0]/tile)*tile,0,tile,tile]));
   assert.equal(ops.filter(op=>op.image===art.sprite('all')).length,1);assert.equal(ops.filter(op=>op.image===art.sprite('up')).length,1);
   assert(ops.some(op=>op.kind==='text'&&op.text===String(state.numbers[15])));assert(ops.some(op=>op.kind==='text'&&op.text===String(state.numbers[16])));
   if(!spec.mini)rows=checkRows(cv,state);pixels(cv);
  });
  const image=save(cv,spec.id+'-native.png');report.boards.push({...spec,ok,grades,numbers:state.numbers,rows,sources:[...traces.get(cv).sources],image});
 }

 // Let each real wave burst. The native fragment cache must use the same
 // 256px normalised source and exact grade as the intact main/mini atlas.
 const rainbow=byId.rainbow.steps[2],fragmentChecks=[];
 for(const mini of [false,true]){
  const width=mini?116:430,height=mini?116:372,cv=canvas(width*2,height*2),ctx=cv.getContext('2d');ctx.scale(2,2);const grades=new Set();
  for(let wave=0;wave<rainbow.trace.waves.length;wave++){
   reset(cv);const elapsed=625+wave*480+180;V.draw(ctx,freeze(plain(rainbow.after)),{width,height,mini,time:elapsed,turn:freeze(plain(rainbow.trace)),elapsed});
   for(const op of traces.get(cv).ops.filter(op=>op.kind==='image')){
    const inherited=traces.get(op.image)?.ops.filter(draw=>draw.image===source256)||[];if(!inherited.length)continue;
    const power=inherited[0].sourceRect[0]/256;grades.add(power);
    check('fragment source '+mini+'/'+wave+'/'+power,()=>{assert(Number.isInteger(power)&&power>=0&&power<6);inherited.forEach(draw=>assert.deepEqual(draw.sourceRect,[power*256,0,256,256]));});
   }
   if(wave===1)save(cv,mini?'burst-six-grades-mini-native.png':'burst-six-grades-main-native.png');
  }
  const beforeCanvases=canvases.length,beforePixels=art.describe().cachedPixels;
  for(let wave=0;wave<rainbow.trace.waves.length;wave++){reset(cv);const elapsed=625+wave*480+180;V.draw(ctx,rainbow.after,{width,height,mini,time:elapsed,turn:rainbow.trace,elapsed});}
  const ok=check('all-grade fragment cache '+mini,()=>{assert.deepEqual([...grades].sort(),[0,1,2,3,4,5]);assert.equal(canvases.length,beforeCanvases,'repainting warmed native fragment frames allocates no new canvas');assert.equal(art.describe().cachedPixels,beforePixels);});
  fragmentChecks.push({mini,ok,grades:[...grades].sort(),cachedCanvases:beforeCanvases,cachedPixels:beforePixels});
 }
 report.fragments=fragmentChecks;

 // Native boost is [0, 1010); a normal fade has no pixels at exactly zero,
 // whereas reduced motion may show the whole image there. No money is drawn.
 const boost=byId['clear-ladder'].steps[0],boostLabel='補充Lv 1 → 2 ・ 次の補充から';
 for(const reduced of [false,true])for(const elapsed of [-1,0,1,500,1009,1010]){
  const cv=canvas(860,744),ctx=cv.getContext('2d');ctx.scale(2,2);media.matches=reduced;
  const before=JSON.stringify(boost.trace),expected=elapsed>=0&&elapsed<1010&&(reduced||elapsed>0),beforeAmounts=award.describe().rasterAmounts;
  const painted=award.paintBoost(ctx,{trace:freeze(plain(boost.trace)),elapsed,duration:1010,width:430,height:286,centerX:215,centerY:186,still:reduced});
  const ops=traces.get(cv).ops,ok=check('boost '+reduced+'/'+elapsed,()=>{
   assert.equal(painted,expected);assert.equal(JSON.stringify(boost.trace),before);assert.equal(award.describe().rasterAmounts,beforeAmounts);
   assert(!ops.some(op=>op.file?.endsWith('/award-digits.webp')||op.kind==='text'&&op.text.includes('WIN')));
   if(expected){assert(ops.some(op=>op.file==='assets/popcorn-art-v299/award-boost.webp'));assert.deepEqual(ops.filter(op=>op.kind==='text').map(op=>op.text),[boostLabel]);assert.equal(award.describe().lastStatus.win,null);fontMetrics(ops);ops.filter(op=>op.kind==='image'||op.kind==='text').forEach(op=>inside(op.bounds,cv.width,cv.height,'boost card'));}
   else assert.equal(ops.length,0);
  });
  const row={reduced,elapsed,duration:1010,expected,painted,ok,label:expected?boostLabel:null};
  if(elapsed===500){row.image=save(cv,reduced?'boost-reduced-native.png':'boost-status-native.png');renders.push({spec:{id:reduced?'boost-reduced':'boost-native',width:430,height:372},row,cv});}
  report.boost.push(row);
 }
 const boostView=canvas(860,744),bx=boostView.getContext('2d');bx.scale(2,2);media.matches=false;
 V.draw(bx,freeze(plain(boost.after)),{width:430,height:372,time:500,turn:freeze(plain(boost.trace)),elapsed:500});
 const status=plain(award.describe().lastStatus),statusOps=traces.get(boostView).ops,boostAt=statusOps.findIndex(op=>op.file==='assets/popcorn-art-v299/award-boost.webp');
 check('native boost view hook',()=>{assert(boostAt>=0);assert.equal(status.elapsed,500);assert.equal(status.duration,1010);assert.equal(status.label,boostLabel);assert.deepEqual(statusOps.slice(boostAt).filter(op=>op.kind==='text').map(op=>op.text),[boostLabel]);});
 save(boostView,'boost-native-view430.png');report.nativeBoost=status;
 const miniBoost=canvas(232,232),mb=miniBoost.getContext('2d');mb.scale(2,2);const statusCount=award.describe().statusPaints;
 V.draw(mb,boost.after,{width:116,height:116,mini:true,time:500,turn:boost.trace,elapsed:500});assert.equal(award.describe().statusPaints,statusCount,'native mini never paints the large boost card');

 // Contacts keep every source canvas aspect ratio, including tiny minis.
 const columns=3,cw=466,ch=460,sheet=createCanvas(columns*cw,Math.ceil(renders.length/columns)*ch+66),sx=sheet.getContext('2d');sx.fillStyle='#231821';sx.fillRect(0,0,sheet.width,sheet.height);sx.textBaseline='top';
 sx.fillStyle='#fff0cb';sx.font='20px "Noto Sans JP"';sx.fillText('ポップコーン：実イベント・実 Canvas 描画',18,12);
 for(let i=0;i<renders.length;i++){
  const {spec,row,cv}=renders[i],x=(i%columns)*cw,y=48+Math.floor(i/columns)*ch,w=spec.width,h=spec.height;
  sx.fillStyle='#402b32';sx.fillRect(x+8,y,cw-16,ch-10);sx.fillStyle='#fff0cb';sx.font='16px "Noto Sans JP"';sx.fillText(spec.id,x+20,y+12);
  sx.fillStyle='#e7c8b3';sx.font='12px "Noto Sans JP"';sx.fillText(row.win!==undefined?row.win.toLocaleString('ja-JP')+' WIN · '+row.liveLabel:boostLabel+' · 金銭なし',x+20,y+38);
  sx.drawImage(cv,x+(cw-w)/2,y+66+(372-h)/2,w,h);
 }
 save(sheet,'native-render-contact.png');
 const artSheet=createCanvas(1160,700),ax=artSheet.getContext('2d');ax.fillStyle='#251c22';ax.fillRect(0,0,1160,700);ax.fillStyle='#fff0cb';ax.font='19px "Noto Sans JP"';ax.fillText('6種の粒と配当／番号家具：実際に使う切り出し',20,14);
 ax.drawImage(source256,24,62,1110,185);
 for(let i=0;i<6;i++){ax.font='15px "Noto Sans JP"';ax.fillText(names[i],30+i*185,275);}
 for(const [index,name] of ['port','all','up','bonus','odds','row'].entries()){
  const sprite=art.sprite(name),col=index%3,row=Math.floor(index/3),x=28+col*300,y=321+row*172,k=Math.min(264/sprite.width,120/sprite.height);
  ax.drawImage(sprite,x+(264-sprite.width*k)/2,y,sprite.width*k,sprite.height*k);ax.fillStyle='#fff0cb';ax.font='15px "Noto Sans JP"';ax.fillText(name,x,y+134);
 }
 const cabinet=art.sprite('cabinet');ax.drawImage(cabinet,972,317,144,368);save(artSheet,'native-art-contact.png');
 for(const search of ['?downloadWorker=1','?serverSettlementWorker=1']){
  const workerWindow={},worker=vm.createContext({window:workerWindow,location:{search},URLSearchParams});vm.runInContext(artCode,worker);vm.runInContext(awardCode,worker);assert.equal(workerWindow.PopcornArtV299,undefined);assert.equal(workerWindow.PopcornAwardV299,undefined);
 }
 report.renderer=plain(award.describe());report.art=plain(art.describe());report.localAssets=[...loadedFiles].sort();report.workerGuards=true;report.nativeCanvasCount=canvases.length;
 assert.equal(art.source(),source256);assert.equal(art.atlas(false),mainAtlas);assert.equal(art.atlas(true),miniAtlas);assert.equal(art.describe().cachedPixels,ad.cachedPixels);
 report.ok=report.errors.length===0;writeReport();assert(report.ok,'native render failed; inspect '+reportFile);
 console.log('POPCORN_V299_NATIVE_RENDER_PASS',JSON.stringify({cases:report.cases.length,boards:report.boards.length,boostChecks:report.boost.length,sourceGrades:6,tableRows:11,report:reportFile}));
}
try{await main();}catch(error){report.errors.push(String(error?.stack||error));report.ok=false;writeReport();throw error;}

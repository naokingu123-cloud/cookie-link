/* CI-only browser verification using the real isolated server/client fixture.
 * The observer follows generated pixels through existing caches. It delegates
 * every rendering call unchanged and never replaces RNG, engines or rules. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createUiFixture,sleep,until} from './ui-v250-fixture.mjs';

const output='qa-cartoon-v272';
const games=['cookie','choco','candy','gelato','winery','popcorn','jelly','stick','castella','dango'];
const spriteNames=[
 'cookie-berry','cookie-honey','cookie-pistachio','cookie-soda','cookie-grape','hammer',
 'candy-blue','candy-aqua','candy-green','candy-lime','candy-yellow','candy-orange',
 'candy-red','candy-violet','candy-pink','sugar-star','sugar-badge','cookie-basket',
 'choco-milk','choco-berry','choco-ivory','choco-dark','choco-seat','hex-seat',
 'ore-copper','ore-silver','ore-gold','ore-diamond','gem-red','gem-violet',
 'number-medallion','crown','treasure-chest','gold-medal','button-pink','button-cyan',
 'gelato-green','gelato-yellow','gelato-red','gelato-purple','gelato-blue','gelato-socket',
 'wine-glass','wine-glass-lit','wine-plaque','popcorn-cream','popcorn-pink','popcorn-gold',
 'popcorn-aqua','popcorn-lavender','popcorn-lime','popcorn-bomb','jelly-mold','jelly-pink',
 'jelly-green','jelly-orange','jelly-blue','jelly-purple','waffle-cell','waffle-black',
 'waffle-white','castella-hole','castella-raw','castella-baked','castella-dispenser','dango-white',
 'dango-green','dango-pink','dango-yellow','dango-rainbow','bamboo','star-biscuit',
 'frame-cookie','frame-candy','frame-choco','frame-gelato','frame-winery',
 'frame-popcorn','frame-jelly','frame-stick','frame-castella','frame-dango'
];
const family={cookie:'cookie-',choco:'choco-',candy:'candy-',gelato:'gelato-',winery:'wine-',popcorn:'popcorn-',jelly:'jelly-',stick:'waffle-',castella:'castella-',dango:'dango-'};
const report={version:null,atlas:null,phases:[],viewports:[],screens:[],pageErrors:[],observer:'unchanged drawImage calls; generated-source lineage only'};
let fixture,page,current=null;
const digest=value=>createHash('sha256').update(value).digest('hex');

function installArtObserver(){
 const lineage=new WeakMap(),counts=new WeakMap(),imageURLs=new Map();
 let api;
 const assetsFor=source=>{
  if(!source)return [];
  const names=new Set(lineage.get(source)||[]);
  // Choco's bitmap autotiles preserve their real generated source through a
  // WeakMap because their native melt renderer requires an ImageData surface.
  for(const name of window.SweetsCartoonBoardsAV272?.sourcesOf(source)||[])names.add(name);
  if(names.size)return [...names];
  const src=source.currentSrc||source.src;
  if(typeof src==='string'){
   if(imageURLs.has(src))return [...imageURLs.get(src)];
   const files=api?.describe?.().files||[];
   if(files.some(file=>new URL(file,location.href).pathname===new URL(src,location.href).pathname))return ['@generated-atlas'];
  }
  return [];
 };
 const mark=(target,names)=>{
  if(!target||!names.length)return;
  let set=lineage.get(target);if(!set){set=new Set();lineage.set(target,set);}
  for(const name of names)set.add(name);
 };
 const nativeDraw=CanvasRenderingContext2D.prototype.drawImage;
 CanvasRenderingContext2D.prototype.drawImage=function(source,...args){
  const result=Reflect.apply(nativeDraw,this,[source,...args]),names=assetsFor(source);
  let state=counts.get(this.canvas);if(!state){state={calls:0,generatedCalls:0};counts.set(this.canvas,state);}
  state.calls++;if(names.length){state.generatedCalls++;mark(this.canvas,names);}
  return result;
 };
 const nativeClear=CanvasRenderingContext2D.prototype.clearRect;
 CanvasRenderingContext2D.prototype.clearRect=function(x,y,w,h){
  const m=this.getTransform(),points=[[x,y],[x+w,y],[x,y+h],[x+w,y+h]].map(([px,py])=>({x:m.a*px+m.c*py+m.e,y:m.b*px+m.d*py+m.f}));
  const result=Reflect.apply(nativeClear,this,[x,y,w,h]);
  // A complete repaint must earn fresh provenance; an earlier frame alone
  // cannot make a later blank or legacy-image frame pass the assertion.
  if(!m.b&&!m.c&&Math.min(...points.map(p=>p.x))<=0&&Math.min(...points.map(p=>p.y))<=0&&Math.max(...points.map(p=>p.x))>=this.canvas.width&&Math.max(...points.map(p=>p.y))>=this.canvas.height)lineage.delete(this.canvas);
  return result;
 };
 const nativeURL=HTMLCanvasElement.prototype.toDataURL;
 HTMLCanvasElement.prototype.toDataURL=function(...args){
  const value=Reflect.apply(nativeURL,this,args),names=assetsFor(this);
  if(names.length)imageURLs.set(value,new Set(names));return value;
 };
 function observe(value){
  if(!value||value.__observedCartoon272)return value;
  Object.defineProperty(value,'__observedCartoon272',{value:true});
  const sprite=value.sprite,url=value.url,draw=value.draw,frame=value.frame;
  value.sprite=function(name,...args){const result=Reflect.apply(sprite,this,[name,...args]);if(result)mark(result,[name]);return result;};
  value.url=function(name,...args){const result=Reflect.apply(url,this,[name,...args]);if(result)imageURLs.set(result,new Set([name]));return result;};
  value.draw=function(ctx,name,...args){const result=Reflect.apply(draw,this,[ctx,name,...args]);if(result)mark(ctx.canvas,[name]);return result;};
  value.frame=function(ctx,game,...args){const result=Reflect.apply(frame,this,[ctx,game,...args]);if(result)mark(ctx.canvas,['frame-'+game]);return result;};
  return value;
 }
 Object.defineProperty(window,'SweetsCartoonArt',{configurable:true,get:()=>api,set:value=>{api=observe(value);}});
 window.__cartoonArtQa272={
  inspect:source=>({assets:assetsFor(source).filter(name=>!name.startsWith('@')).sort(),...counts.get(source)}),
  image:source=>({assets:assetsFor(source).filter(name=>!name.startsWith('@')).sort()})
 };
}

// Stable rules data only. Presentation clocks, easing, reach caches and selected
// tabs are intentionally outside this projection; boards, RNG seed, exact
// numbers, bets and every settled payout are inside it.
function logicalSnapshot(){
 const q=window.__qa250,a=q.app;
 function plain(value,seen=new WeakSet()){
  if(value===undefined||typeof value==='function')return undefined;
  if(value===null||typeof value!=='object')return value;
  if(value instanceof Node)return undefined;
  if(seen.has(value))return '[circular]';seen.add(value);
  let result;
  if(value instanceof Set)result=[...value].map(v=>plain(v,seen)).sort((x,y)=>String(x).localeCompare(String(y)));
  else if(value instanceof Map)result=[...value].map(([k,v])=>[plain(k,seen),plain(v,seen)]);
  else if(Array.isArray(value))result=value.map(v=>plain(v,seen));
  else{result={};for(const key of Object.keys(value).sort()){const item=plain(value[key],seen);if(item!==undefined)result[key]=item;}}
  seen.delete(value);return result;
 }
 const fields=[
  'version','seed','processed','accepted','running','roundBet','totalHundredths','allClears','maxLink','maxChain',
  'roundSteps','roundHammers','roundCleared','roundsCleared','lines','triangles','hexagons','depth','startDepth',
  'progressiveUnits','removedTotal','wonderCollected','wonderToken','board','strata','pyramid','state','numbers',
  'cells','grid','drawn','seen','drills','lucky','nodeNumbers','faceGrades','pattern','patternTransform','hits',
  'links','filled','collectorCounts','collectorMult','countMult','glasses','fullCount','mixCount','countMultiplier',
  'mixMultiplier','power','totalPoured','wasted','sugarTarget','sugarAwarded','allComplete'
 ];
 const engines=q.slots.map(s=>{
  const result={id:s.holder.dataset.gameKind||s.engine.kind||'cookie'};
  for(const field of fields){const value=plain(s.engine[field]);if(value!==undefined)result[field]=value;}
  return result;
 });
 const state={phase:a.phase,token:a.token,credit:a.credit,totalWin:a.totalWin,bets:[...a.bets],locked:[...a.locked],roundWins:[...a.roundWins],paid:[...a.paid],enabled:[...a.enabled],draws:[...a.draws],wonderBank:plain(a.wonderBank),engines};
 return {json:JSON.stringify(state),summary:{phase:a.phase,credit:a.credit,bets:state.bets,draws:state.draws,totalWin:a.totalWin,engines:engines.map(e=>({id:e.id,processed:e.processed,totalHundredths:e.totalHundredths,seed:e.seed,running:e.running}))}};
}

function inspectSurface(){
 const q=window.__qa250,slot=q.slots[q.active],kind=slot.holder.dataset.gameKind||slot.engine.kind||'cookie',observer=window.__cartoonArtQa272;
 const rect=node=>{const r=node.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
 const visible=node=>{
  if(!node?.isConnected)return false;
  for(let n=node;n instanceof Element;n=n.parentElement){const c=getComputedStyle(n);if(c.display==='none'||c.visibility==='hidden'||Number(c.opacity)===0||n.hidden)return false;}
  const r=node.getBoundingClientRect();return r.width>1&&r.height>1;
 };
 function pixels(cv){
  if(!cv?.width||!cv?.height)return {opaque:0,colors:0,alphaFraction:0};
  const sample=document.createElement('canvas');sample.width=sample.height=72;const ctx=sample.getContext('2d',{willReadFrequently:true});ctx.drawImage(cv,0,0,72,72);
  const data=ctx.getImageData(0,0,72,72).data,bins=new Set();let opaque=0;
  for(let p=0;p<data.length;p+=4)if(data[p+3]>24){opaque++;bins.add((data[p]>>4)+','+(data[p+1]>>4)+','+(data[p+2]>>4));}
  return {opaque,colors:bins.size,alphaFraction:opaque/(72*72)};
 }
 const inspectCanvas=cv=>({className:cv.className,width:cv.width,height:cv.height,bounds:rect(cv),visible:visible(cv),label:cv.getAttribute('aria-label')||'',...pixels(cv),...observer.inspect(cv)});
 const selectors={choco:'.choco-canvas',candy:'.carnival-canvas',gelato:'.gp-raster-board',winery:'.wp-canvas',popcorn:'.pc-scene',jelly:'.jb-scene',stick:'.bs-grid canvas',castella:'.pct-pan>canvas',dango:'.dgb-pan>canvas'};
 // BET explanations sit above #panels and deliberately stop the classic
 // underlay's draw loop. Inspect the actual foreground, never an occluded
 // native board or Cookie DOM tiles that happen to retain earlier pixels.
 const field=document.querySelector('#panels').closest('.field');
 const lessonLayers=[...field.querySelectorAll(':scope > .ds91-lesson, :scope > .ds139-story')].filter(visible);
 const primary={mode:lessonLayers.length?(lessonLayers[0].matches('canvas')?'ready-lesson':'ready-story'):'board',lessons:lessonLayers.map(layer=>({game:layer.dataset.game,type:layer.className,background:getComputedStyle(layer,'::before').backgroundImage})),demo:window.SweetsDemoSuite?.status||null};
 const nativeCanvases=kind==='cookie'?[slot.betCanvas].filter(cv=>cv&&visible(cv)):[slot.panel.querySelector(selectors[kind])].filter(Boolean);
 const mainCanvases=lessonLayers.length?lessonLayers.map(layer=>layer.matches('canvas')?layer:layer.querySelector('.ds139-stage>canvas')).filter(Boolean):nativeCanvases;
 const main=mainCanvases.map(inspectCanvas),cookieImages=!lessonLayers.length&&kind==='cookie'?[...slot.board.querySelectorAll('.cookie-face')].filter(visible).map(img=>({loaded:img.complete&&img.naturalWidth>0,width:img.naturalWidth,height:img.naturalHeight,bounds:rect(img),...observer.image(img)})):[];
 const miniatures=q.slots.filter(s=>s.i!==q.active&&!s.holder.hidden).map(s=>{
  const candidates=[...new Set([s.miniCanvas,...s.tab.querySelectorAll('.mini-wrap canvas')])].filter(cv=>cv&&visible(cv));
  return {game:s.holder.dataset.gameKind||s.engine.kind||'cookie',canvases:candidates.map(inspectCanvas)};
 });
 const panel=rect(slot.panel),game=rect(document.querySelector('#screen>.game'));
 const geometry={kind,panel:{width:panel.width,height:panel.height},canvases:main.map(c=>({className:c.className,width:c.width,height:c.height,displayWidth:c.bounds.width,displayHeight:c.bounds.height}))};
 if(kind==='cookie')geometry.cookie={boardWidth:slot.board.clientWidth,boardHeight:slot.board.clientHeight,tiles:[...slot.tiles].map(([id,el])=>({id,left:el.style.left,top:el.style.top,width:parseFloat(getComputedStyle(el).width),height:parseFloat(getComputedStyle(el).height)})).sort((a,b)=>a.id-b.id)};
 if(kind==='candy'){
  const grid=slot.engine.pyramid||[],rows=grid.length||10;
  geometry.candy={layout:q.sixLayout(rows),centers:grid.flatMap((row,r)=>row.map((_,c)=>q.sixXY(r,c,rows)))};
 }
 const payoutNodes=[...slot.panel.querySelectorAll('.gold-number,.sd247-next,.sd247-subtotal,.pct-win-value')].filter(visible);
 return {kind,active:q.active,phase:q.app.phase,selected:q.slots.filter(s=>s.tab.getAttribute('aria-selected')==='true').map(s=>s.i),visiblePanels:q.slots.filter(s=>!s.panel.hidden).map(s=>s.i),primary,main,cookieImages,miniatures,geometry,layout:{width:innerWidth,height:innerHeight,documentWidth:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth),game,panel,primaryOutsideGame:main.filter(c=>c.visible&&(c.bounds.left<game.left-2||c.bounds.right>game.right+2||c.bounds.top<game.top-2||c.bounds.bottom>game.bottom+2)).map(c=>c.className)},payoutText:payoutNodes.map(n=>n.textContent),classes:{shared:document.documentElement.classList.contains('cartoon-art-v272'),a:document.documentElement.classList.contains('cartoon-boards-a-v272'),b:document.documentElement.classList.contains('cartoon-boards-b-v272'),c:document.documentElement.classList.contains('cartoon-boards-c-v272')}};
}

async function select(index){
 await page.evaluate(index=>{const q=window.__qa250;q.select(index);q.scheduleUI(q.app);},index);
 await sleep(280);
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
}
function assertPainted(surface,label){
 const match=names=>names.some(name=>name.startsWith(family[surface.kind]));
 if(surface.primary.mode!=='board'){
  assert.equal(surface.phase,'ready',label+': a lesson only covers a ready board');
  assert.deepEqual(surface.primary.lessons.map(lesson=>lesson.game),[surface.kind],label+': the sole foreground lesson belongs to the selected game');
  assert.ok(surface.primary.lessons.every(lesson=>!lesson.background.includes('url(')),label+': lesson background uses flat illustration colors, with no legacy backdrop');
 }
 if(surface.phase==='ready'&&surface.primary.demo?.active)assert.notEqual(surface.primary.mode,'board',label+': the active lesson is the inspected primary surface');
 const canvasPainted=surface.main.some(c=>c.visible&&c.opaque>60&&c.colors>8&&match(c.assets));
 const domPainted=surface.cookieImages.length>0&&surface.cookieImages.every(img=>img.loaded&&match(img.assets));
 assert.ok(canvasPainted||domPainted,label+': visible generated pieces in the primary board');
 assert.deepEqual(surface.selected,[surface.active],label+': one selected tab');
 assert.deepEqual(surface.visiblePanels,[surface.active],label+': one visible board');
 assert.ok(Object.values(surface.classes).every(Boolean),label+': all artwork adapters installed');
 assert.ok(surface.layout.documentWidth<=surface.layout.width+2,label+': no horizontal document overflow');
 assert.deepEqual(surface.layout.primaryOutsideGame,[],label+': primary canvas stays inside the game frame');
 assert.ok(surface.payoutText.every(text=>!/NaN|undefined|Infinity/.test(text)),label+': payout labels remain finite');
 for(const mini of surface.miniatures){
  assert.ok(mini.canvases.some(c=>c.opaque>12&&c.colors>5&&c.assets.some(name=>name.startsWith(family[mini.game]))),label+': generated live miniature for '+mini.game);
 }
}
async function unchanged(before,label){
 const after=await page.evaluate(logicalSnapshot),actual=digest(after.json),expected=digest(before.json);
 if(actual!==expected){
  await fs.writeFile(path.join(output,'state-before.json'),before.json+'\n');
  await fs.writeFile(path.join(output,'state-after.json'),after.json+'\n');
 }
 assert.equal(actual,expected,label+': rendering and tab selection preserve exact boards, numbers, RNG seed, bets and payouts');
 return actual;
}
function geometryEqual(actual,expected,label){
 // CSS transforms can produce subpixel rectangle rounding across tab visits;
 // backing stores, physical lattice and DOM tile positions remain exact.
 const normalize=value=>Array.isArray(value)?value.map(normalize):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,normalize(v)])):typeof value==='number'?Math.round(value*100)/100:value;
 assert.deepEqual(normalize(actual),normalize(expected),label+': board geometry survives a complete tab cycle');
}
async function inspectAtlas(){
 return page.evaluate(async names=>{
  const A=window.SweetsCartoonArt;await A.ready;
  const description=A.describe(),files=await Promise.all(description.files.map(async src=>{
   const image=new Image();image.src=src;await image.decode();
   return {file:src,width:image.naturalWidth,height:image.naturalHeight,loaded:image.complete};
  }));
  const sprites=names.map((name,index)=>{
   const cv=A.sprite(name);if(!cv)return {name,missing:true};
   const data=cv.getContext('2d',{willReadFrequently:true}).getImageData(0,0,cv.width,cv.height).data;
   let opaque=0,clear=0,hash=2166136261;const hues=new Float64Array(360);
   for(let i=0;i<data.length;i++)hash=Math.imul(hash^data[i],16777619)>>>0;
   for(let i=0;i<data.length;i+=4){
    const a=data[i+3];if(a<16)clear++;if(a>32)opaque++;
    if(a<192)continue;
    const r=data[i]/255,g=data[i+1]/255,b=data[i+2]/255,hi=Math.max(r,g,b),lo=Math.min(r,g,b),d=hi-lo;
    if(d<.25||hi<.4)continue;
    let hue=(hi===r?60*((g-b)/d%6):hi===g?60*((b-r)/d+2):60*((r-g)/d+4));if(hue<0)hue+=360;
    hues[Math.floor(hue)%360]+=d;
   }
   let best=0,weight=-1;for(let h=0;h<360;h++){let n=0;for(let k=-5;k<=5;k++)n+=hues[(h+k+360)%360];if(n>weight){weight=n;best=h;}}
   const sheet=files[index<36?0:index<72?1:2],cols=index<72?6:2,rows=index<72?6:5;
   // A crop can never contain more than its own atlas cell, nor lose alpha.
   return {name,width:cv.width,height:cv.height,maxWidth:Math.ceil(sheet.width/cols),maxHeight:Math.ceil(sheet.height/rows),opaque,clear,hash,dominantHue:best,cached:A.sprite(name)===cv,urlIsPNG:A.url(name).startsWith('data:image/png')};
  });
  return {description,files,sprites};
 },spriteNames);
}

async function tour(phase,{screens=true,geometryCheck=true,strictState=phase!=='ready'}={}){
 const baseline=await page.evaluate(logicalSnapshot),first=new Map(),phaseReport={phase,strictState,stateHash:digest(baseline.json),state:baseline.summary,games:[]};
 report.phases.push(phaseReport);
 // First pass makes every existing board/miniature cache current before its
 // dimensions are compared. In a started round the state check includes this
 // pass; ready demonstrations remain free to advance their separate scenes.
 for(let i=0;i<games.length;i++){
  current={phase,game:games[i],step:'warmup'};await select(i);
  const surface=await page.evaluate(inspectSurface);assert.equal(surface.kind,games[i]);first.set(games[i],surface.geometry);
  if(strictState)await unchanged(baseline,phase+' warmup '+games[i]);
 }
 for(let i=0;i<games.length;i++){
  current={phase,game:games[i],step:'capture'};await select(i);
  const surface=await page.evaluate(inspectSurface);assert.equal(surface.kind,games[i]);assertPainted(surface,phase+' '+games[i]);
  if(geometryCheck)geometryEqual(surface.geometry,first.get(games[i]),phase+' '+games[i]);
  const stateHash=strictState?await unchanged(baseline,phase+' '+games[i]):digest((await page.evaluate(logicalSnapshot)).json);
  let file=null;
  if(screens){file=phase+'-'+games[i]+'-'+surface.layout.width+'.png';await page.screenshot({path:path.join(output,file)});report.screens.push(file);}
  phaseReport.games.push({...surface,stateHash,file});
 }
 current=null;return phaseReport;
}

try{
 fixture=await createUiFixture({startRound:false,viewport:{width:1366,height:900},output});
 ({page}=fixture);report.version=fixture.version;
 await fixture.context.addInitScript(installArtObserver);
 await page.reload({waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>window.__qa250&&window.SweetsSharedMachine?.client?.online&&window.SweetsCartoonArt?.loaded&&window.SweetsCartoonBoardsAV272&&window.SweetsCartoonBoardsB?.active&&window.SweetsCartoonBoardsC?.describe().ready,null,{timeout:60000});
 await page.evaluate(()=>document.fonts.ready);
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.waitForFunction(()=>document.querySelector('.v250-shared-bet-switch')&&!document.querySelector('.v250-shared-bet-switch').disabled,null,{timeout:15000});
 const ids=await page.evaluate(()=>window.__qa250.slots.filter(s=>!s.holder.hidden).map(s=>s.holder.dataset.gameKind||s.engine.kind||'cookie'));
 assert.deepEqual(ids,games,'the fixture exercises all ten games in the production lineup');
 report.atlas=await inspectAtlas();
 assert.equal(report.atlas.description.loaded,true);assert.equal(report.atlas.description.sprites,82);assert.equal(report.atlas.files.length,3);assert.equal(report.atlas.sprites.length,82);
 for(const file of report.atlas.files){assert.equal(file.loaded,true);assert.ok(file.width>=1000&&file.height>=1000,'full generated atlas decoded: '+file.file);}
 for(const sprite of report.atlas.sprites){
  assert.equal(sprite.missing,undefined,sprite.name+' exists');assert.ok(sprite.cached&&sprite.urlIsPNG,sprite.name+' has one decoded cache and a lossless DOM source');
  assert.ok(sprite.width>=8&&sprite.height>=8&&sprite.width<=sprite.maxWidth&&sprite.height<=sprite.maxHeight,sprite.name+' crop remains inside its own atlas cell');
  assert.ok(sprite.opaque>50&&sprite.clear>0,sprite.name+' preserves painted content and transparency');
 }
 assert.equal(new Set(report.atlas.sprites.map(s=>s.hash)).size,82,'all semantic sprites have distinct raster content');
 const hueRanges={blue:[190,245],aqua:[160,200],green:[110,170],lime:[60,110],yellow:[40,70],orange:[15,45],red:[330,25],violet:[250,305],pink:[300,345]};
 for(const [name,[lo,hi]] of Object.entries(hueRanges)){
  const hue=report.atlas.sprites.find(s=>s.name==='candy-'+name).dominantHue;
  assert.ok(lo<=hi?hue>=lo&&hue<=hi:hue>=lo||hue<=hi,'Six Drop keeps the '+name+' color identity ('+hue+'°)');
 }
 await sleep(1200);
 await tour('ready');

 // Start one real local server round without issuing a draw. This exposes
 // every live board while leaving its exact number/payout data stable for
 // the complete selection and responsive-layout assertions.
 await page.evaluate(()=>{
  const q=window.__qa250;window.SweetsSharedControllerV224.setAutoRebet(false);
  for(let i=0;i<q.app.bets.length;i++)if(q.app.bets[i]<=0)q.app.setBet(i,100);
 });
 await fixture.call('/api/admin/machines/public-01/host/register',{session:fixture.host,body:{},adminOnly:true});
 const round=await until(async()=>{const state=await fixture.call('/api/machines/public-01/state',{session:fixture.host});return state.round?.phase==='PLAYING'?state.round:null;},'isolated artwork round starts');
 await page.waitForFunction(id=>window.SweetsSharedMachine.active?.roundId===id&&window.__qa250.app.phase==='playing',round.id,{timeout:30000});
 await page.waitForFunction(()=>window.__qa250.app.engines.every(e=>!e.opening&&!e.busy&&!(e.queue?.length)),null,{timeout:30000});
 assert.ok(await page.evaluate(()=>window.__qa250.app.enabled.every(Boolean)),'all ten real engines start under their own rules');
 report.round={id:round.id,serverPhase:round.phase,ballsSubmitted:0};
 await tour('playing');

 await page.setViewportSize({width:390,height:844});await sleep(320);
 const mobile=await tour('mobile',{screens:false});
 report.viewports.push({width:1366,height:900,phases:['ready','playing']},{width:390,height:844,games:mobile.games.map(g=>({game:g.kind,layout:g.layout}))});
 assert.equal(report.screens.length,20,'ten ready and ten live screenshots are retained');
 assert.equal(fixture.requests.some(r=>r.path.endsWith('/round/ball')),false,'the visual test never submits or fabricates a lottery result');
 assert.equal(fixture.errors.length,0,JSON.stringify(fixture.errors));
 report.pageErrors=fixture.errors;report.warnings=fixture.warnings;
 report.adapters=await page.evaluate(()=>({a:window.SweetsCartoonBoardsAV272.describe(),b:{active:window.SweetsCartoonBoardsB.active},c:window.SweetsCartoonBoardsC.describe()}));
 await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
 console.log('CARTOON_ART_V272_BROWSER_PASS',JSON.stringify({version:report.version,sprites:report.atlas.sprites.length,screens:report.screens.length,games:games.length,phases:report.phases.map(p=>p.phase),pageErrors:report.pageErrors}));
}catch(error){
 report.failure={message:String(error),stack:error.stack,current,pageErrors:fixture?.errors||[],warnings:fixture?.warnings||[]};
 if(page){
  try{report.failure.state=(await page.evaluate(logicalSnapshot)).summary;}catch{}
  try{report.failure.surface=await page.evaluate(inspectSurface);}catch{}
  try{await page.screenshot({path:path.join(output,'failure.png'),fullPage:true});}catch{}
 }
 await fs.mkdir(output,{recursive:true});
 await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
 if(fixture)await fs.writeFile(path.join(output,'failure-server.log'),fixture.logs.slice(-20000));
 console.error('CARTOON_ART_V272_BROWSER_FAIL',error);throw error;
}finally{await fixture?.close();}

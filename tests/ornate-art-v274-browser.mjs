/* CI-only browser verification using the real isolated server/client fixture.
 * Observe actual image/canvas/ImageData transfers without replacing a renderer,
 * engine, RNG or rule. Native Choco's newly assembled ImageData has no invented
 * source lineage; its visible ores and pixels are inspected separately. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createUiFixture,sleep,until} from './ui-v250-fixture.mjs';

const output='qa-ornate-v274';
const games=['cookie','choco','candy','gelato','winery','popcorn','jelly','stick','castella','dango'];
const frameNames=[...games,'sugar','bonus'].map(game=>'board-'+game)
 .concat(['cookie','choco','candy','gelato','winery','jelly'].map(game=>'pay-'+game));
const backgrounds={
 cookie:'assets/arcade-show-v91/cookie.webp',choco:'assets/arcade-show-v91/choco.webp',
 candy:'assets/sixdrop-candy-kingdom-20261031.webp',gelato:'assets/gelato-ice-candy-kingdom-v41.webp',
 winery:'assets/winery-juice-river-v62.webp',popcorn:'assets/popcorn-art/popcorn-stage-v81.webp',
 jelly:'assets/jelly-backdrop.webp',stick:'assets/waffle-backdrop.webp',
 castella:'assets/party-castella-bg.webp',dango:'assets/dango-art-v252/scene.webp'
};
const nativeSource={
 cookie:/^assets\/sweet-skins\/(?:cookie|hammer)-(?:berry|honey|pistachio|soda|grape)\.webp$/,
 choco:/^optimized\/media\/(?:82e7965c3fa4648b|46a45cf2e915077c|6e829c60f267d0f6|69b8afc83cbbd6bc)\.webp$/,
 candy:/^assets\/six-candy-png\/candies\.webp$/,
 gelato:/^assets\/(?:gelato-prism-(?:ice-base-v40|ice-rails-v40|cookie-v37|trim-v37|gelato-v37)\.png|gelato-sockets-v89\.webp|sweet-skins\/gelato\.webp)$/,
 winery:/^assets\/(?:winery-crystal-coupe-v60\.png|winery-tags-v89\.webp|sweet-skins\/winery\.webp)$/,
 popcorn:/^assets\/popcorn-art\/popcorn-kernels-v85\.webp$/,
 jelly:/^assets\/(?:jelly-crystal-mold\.webp|sweet-skins\/jelly\.webp)$/,
 stick:/^assets\/waffle-(?:reversi-(?:tray\.webp|(?:ogura|butter)-v128\.png)|tier(?:-(?:silver|gold))?\.webp|turn-rail\.webp)$/,
 castella:/^assets\/party-castella-tiles\.webp$/,
 dango:/^assets\/dango-art-v25[23]\/dango-(?:white|green|pink|yellow|rainbow)\.webp$/
};
const nativeImages=[
 ...Object.values(backgrounds),
 ...['cookie','hammer'].flatMap(type=>['berry','honey','pistachio','soda','grape'].map(flavour=>'assets/sweet-skins/'+type+'-'+flavour+'.webp')),
 ...['milk','berry','ivory','dark'].map(flavour=>'assets/sweet-skins/canyon-'+flavour+'.webp'),
 ...['white','strawberry','milk','bitter'].map(flavour=>'assets/canyon-geology/cake-'+flavour+'.webp'),
 ...['82e7965c3fa4648b','46a45cf2e915077c','6e829c60f267d0f6','69b8afc83cbbd6bc'].map(file=>'optimized/media/'+file+'.webp'),
 'assets/six-candy-png/candies.webp','assets/gelato-prism-ice-base-v40.png','assets/gelato-prism-ice-rails-v40.png',
 'assets/gelato-prism-gelato-v37.png','assets/winery-crystal-coupe-v60.png','assets/popcorn-art/popcorn-kernels-v85.webp','assets/popcorn-art/popcorn-fair.webp',
 'assets/jelly-crystal-mold.webp','assets/waffle-reversi-tray.webp','assets/waffle-reversi-ogura-v128.png','assets/waffle-reversi-butter-v128.png',
 'assets/waffle-pay.webp','assets/waffle-tier.webp','assets/waffle-tier-silver.webp','assets/waffle-tier-gold.webp','assets/waffle-turn-rail.webp',
 'assets/party-castella-tiles.webp','assets/party-castella-honey-griddle.webp','assets/party-castella-bakery-menu.webp','assets/party-castella-feast.webp',
 'assets/dango-art-v270/payout-table.png','assets/dango-art-v253/tsukimi-stand.webp','assets/dango-art-v252/dango-white.webp',
 ...['green','pink','yellow','rainbow'].map(color=>'assets/dango-art-v253/dango-'+color+'.webp')
];
const report={version:null,artwork:null,phases:[],viewports:[],screens:[],pageErrors:[],imageFailures:[],observer:'unchanged native drawImage/getImageData/putImageData/toDataURL calls; actual source lineage only'};
let fixture,page,current=null;
const digest=value=>createHash('sha256').update(value).digest('hex');

function installArtObserver(){
 const lineage=new WeakMap(),counts=new WeakMap(),imageURLs=new Map();
 const assetsFor=source=>{
  if(!source)return [];
  const names=lineage.get(source);if(names?.size)return [...names];
  const src=source.currentSrc||source.src;
  if(typeof src==='string'){
   if(imageURLs.has(src))return [...imageURLs.get(src)];
   try{
    const url=new URL(src,location.href);
    if(url.origin===location.origin&&/^\/(?:assets|optimized\/media)\//.test(url.pathname))return [url.pathname.slice(1)];
   }catch{}
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
  let state=counts.get(this.canvas);if(!state){state={calls:0,imageCalls:0};counts.set(this.canvas,state);}
  state.calls++;if(names.length){state.imageCalls++;mark(this.canvas,names);}
  return result;
 };
 const nativeClear=CanvasRenderingContext2D.prototype.clearRect;
 CanvasRenderingContext2D.prototype.clearRect=function(x,y,w,h){
  const m=this.getTransform(),points=[[x,y],[x+w,y],[x,y+h],[x+w,y+h]].map(([px,py])=>({x:m.a*px+m.c*py+m.e,y:m.b*px+m.d*py+m.f}));
  const result=Reflect.apply(nativeClear,this,[x,y,w,h]);
  if(!m.b&&!m.c&&Math.min(...points.map(p=>p.x))<=0&&Math.min(...points.map(p=>p.y))<=0&&Math.max(...points.map(p=>p.x))>=this.canvas.width&&Math.max(...points.map(p=>p.y))>=this.canvas.height)lineage.delete(this.canvas);
  return result;
 };
 // Six Drop recolors the exact ImageData read from its original candy image.
 // Follow that real object transfer, but never attribute unrelated createImageData
 // objects (such as Choco's independently assembled connected autotiles).
 const nativeRead=CanvasRenderingContext2D.prototype.getImageData;
 CanvasRenderingContext2D.prototype.getImageData=function(...args){
  const result=Reflect.apply(nativeRead,this,args);mark(result,assetsFor(this.canvas));return result;
 };
 const nativePut=CanvasRenderingContext2D.prototype.putImageData;
 CanvasRenderingContext2D.prototype.putImageData=function(data,...args){
  const result=Reflect.apply(nativePut,this,[data,...args]);mark(this.canvas,assetsFor(data));return result;
 };
 const nativeURL=HTMLCanvasElement.prototype.toDataURL;
 HTMLCanvasElement.prototype.toDataURL=function(...args){
  const value=Reflect.apply(nativeURL,this,args),names=assetsFor(this);
  if(names.length)imageURLs.set(value,new Set(names));return value;
 };
 window.__ornateArtQa274={
  inspect:source=>({assets:assetsFor(source).sort(),...counts.get(source)}),
  image:source=>({assets:assetsFor(source).sort()})
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
 const q=window.__qa250,slot=q.slots[q.active],kind=slot.holder.dataset.gameKind||slot.engine.kind||'cookie',observer=window.__ornateArtQa274;
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
 const A=window.SweetsOrnateArtV274;
 function frameStyle(node,pseudo,game,mode='board'){
  if(!node)return {present:false,matches:false};
  const css=getComputedStyle(node,pseudo),expected=A?.url(mode+'-'+game)||'',source=css.borderImageSource;
  return {present:true,matches:!!expected&&source.includes(expected),source:source.slice(0,70),width:css.borderImageWidth,content:css.content,display:css.display,pointerEvents:css.pointerEvents,visible:visible(node)};
 }
 const inspectCanvas=cv=>({className:cv.className,width:cv.width,height:cv.height,bounds:rect(cv),visible:visible(cv),label:cv.getAttribute('aria-label')||'',...pixels(cv),...observer.inspect(cv)});
 const selectors={choco:'.choco-canvas',candy:'.carnival-canvas',gelato:'.gp-raster-board',winery:'.wp-canvas',popcorn:'.pc-scene',jelly:'.jb-scene',stick:'.bs-grid canvas',castella:'.pct-pan>canvas',dango:'.dgb-pan>canvas'};
 // BET explanations sit above #panels and deliberately stop the classic
 // underlay's draw loop. Inspect the actual foreground, never an occluded
 // native board or Cookie DOM tiles that happen to retain earlier pixels.
 const field=document.querySelector('#panels').closest('.field');
 const lessonLayers=[...field.querySelectorAll(':scope > .ds91-lesson, :scope > .ds139-story')].filter(visible);
 const primary={mode:lessonLayers.length?(lessonLayers[0].matches('canvas')?'ready-lesson':'ready-story'):'board',lessons:lessonLayers.map(layer=>({game:layer.dataset.game,scene:Number(layer.dataset.scene),type:layer.className,background:getComputedStyle(layer,'::before').backgroundImage,frame:frameStyle(layer,'::after',kind)})),demo:window.SweetsDemoSuite?.status||null};
 const nativeCanvases=kind==='cookie'?[slot.betCanvas].filter(cv=>cv&&visible(cv)):[slot.panel.querySelector(selectors[kind])].filter(Boolean);
 const mainCanvases=lessonLayers.length?lessonLayers.map(layer=>layer.matches('canvas')?layer:layer.querySelector('.ds139-stage>canvas')).filter(Boolean):nativeCanvases;
 const main=mainCanvases.map(inspectCanvas),cookieImages=!lessonLayers.length&&kind==='cookie'?[...slot.board.querySelectorAll('.cookie-face')].filter(visible).map(img=>({loaded:img.complete&&img.naturalWidth>0,width:img.naturalWidth,height:img.naturalHeight,bounds:rect(img),...observer.image(img)})):[];
 const miniatures=q.slots.filter(s=>s.i!==q.active&&!s.holder.hidden).map(s=>{
  const candidates=[...new Set([s.miniCanvas,...s.tab.querySelectorAll('.mini-wrap canvas')])].filter(cv=>cv&&visible(cv));
  const game=s.holder.dataset.gameKind||s.engine.kind||'cookie',oreTiles=game==='choco'?(s.engine.strata||[]).slice(0,12).flatMap(row=>row.slice(0,7)).filter(t=>t?.item==='ore'&&(t.color<0||t.encased)).length:null;
  return {game,canvases:candidates.map(inspectCanvas),oreTiles,frame:frameStyle(s.holder.querySelector(':scope > .all-tab-frame-overlay'),null,game)};
 });
 const panel=rect(slot.panel),game=rect(document.querySelector('#screen>.game'));
 const geometry={kind,panel:{width:panel.width,height:panel.height},canvases:main.map(c=>({className:c.className,width:c.width,height:c.height,displayWidth:c.bounds.width,displayHeight:c.bounds.height}))};
 if(kind==='cookie')geometry.cookie={boardWidth:slot.board.clientWidth,boardHeight:slot.board.clientHeight,tiles:[...slot.tiles].map(([id,el])=>({id,left:el.style.left,top:el.style.top,width:parseFloat(getComputedStyle(el).width),height:parseFloat(getComputedStyle(el).height)})).sort((a,b)=>a.id-b.id)};
 if(kind==='candy'){
  const grid=slot.engine.pyramid||[],rows=grid.length||10;
  geometry.candy={layout:q.sixLayout(rows),centers:grid.flatMap((row,r)=>row.map((_,c)=>q.sixXY(r,c,rows)))};
 }
 geometry.hitTargets=[...slot.panel.querySelectorAll('.dgb-cell,.pct-anchors button')].map(node=>({id:node.dataset.cellId||node.dataset.cell||node.dataset.zone||'',left:node.style.left,top:node.style.top,width:node.style.width,height:node.style.height}));
 const payoutNodes=[...slot.panel.querySelectorAll('.gold-number,.sd247-next,.sd247-subtotal,.pct-win-value')].filter(visible);
 const gameElement=document.querySelector('#screen>.game');
 const backgrounds={game:getComputedStyle(gameElement).backgroundImage,internal:null};
 const internalSelector={gelato:'.gp-scene',winery:'.wp-scene',jelly:'.jb-scene',stick:'.bs-scene',dango:'.dgb-scene'}[kind];
 if(internalSelector){const node=slot.panel.querySelector(internalSelector);backgrounds.internal=node?getComputedStyle(node,kind==='dango'?'::before':null).backgroundImage:null;}
 if(kind==='castella')backgrounds.internal=slot.panel.querySelector('.pct-land')?.getAttribute('src')||null;
 const roles=kind==='candy'?[...document.querySelectorAll('#carnival-odds .sd247-roles img')].map(img=>({role:img.dataset.ornateRole||'',loaded:img.complete&&img.naturalWidth>0,...observer.image(img)})):[];
 const brokenVisibleImages=[...document.images].filter(img=>visible(img)&&(!img.complete||!img.naturalWidth)).map(img=>img.getAttribute('src'));
 const decoration={game:frameStyle(gameElement,'::before',kind),odds:['cookie','choco','candy'].includes(kind)?frameStyle(document.getElementById('odds-panel'),'::before',kind,'pay'):null};
 const classes={shared:document.documentElement.classList.contains('ornate-art-v274'),a:document.documentElement.classList.contains('ornate-boards-a-v274')};
 const legacy={apis:Object.getOwnPropertyNames(window).filter(name=>name.startsWith('SweetsCartoon')),classes:[...document.documentElement.classList].filter(name=>name.startsWith('cartoon-'))};
 return {kind,active:q.active,phase:q.app.phase,selected:q.slots.filter(s=>s.tab.getAttribute('aria-selected')==='true').map(s=>s.i),visiblePanels:q.slots.filter(s=>!s.panel.hidden).map(s=>s.i),primary,main,cookieImages,miniatures,geometry,layout:{width:innerWidth,height:innerHeight,documentWidth:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth),game,panel,primaryOutsideGame:main.filter(c=>c.visible&&(c.bounds.left<game.left-2||c.bounds.right>game.right+2||c.bounds.top<game.top-2||c.bounds.bottom>game.bottom+2)).map(c=>c.className)},payoutText:payoutNodes.map(n=>n.textContent),backgrounds,roles,brokenVisibleImages,decoration,classes,legacy};
}

async function select(index){
 await page.evaluate(index=>{const q=window.__qa250;q.select(index);q.scheduleUI(q.app);},index);
 await sleep(280);
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
}
function assertPainted(surface,label){
 const family=surface.kind==='choco'&&surface.primary.mode!=='board'
  ?/^assets\/canyon-geology\/(?:cake-(?:white|strawberry|milk|bitter)|ore-diamond)\.webp$/
  :nativeSource[surface.kind];
 const match=names=>names.some(name=>family.test(name));
 if(surface.primary.mode!=='board'){
  assert.equal(surface.phase,'ready',label+': a lesson only covers a ready board');
  assert.deepEqual(surface.primary.lessons.map(lesson=>lesson.game),[surface.kind],label+': the sole foreground lesson belongs to the selected game');
 }
 if(surface.primary.mode==='ready-story')for(const lesson of surface.primary.lessons){
  // The pre-v272 story stylesheet uses Jelly's backdrop by default, with
  // dedicated Waffle/Castella overrides. Preserve that existing choice.
  const source=['stick','castella'].includes(surface.kind)?backgrounds[surface.kind]:backgrounds.jelly;
  assert.ok(lesson.background.includes(source),label+': original story background is visible');
  assert.ok(lesson.frame.matches,label+': the story uses its matching new bitmap frame');
  assert.equal(lesson.frame.pointerEvents,'none',label+': story trim does not intercept scene buttons');
 }
 if(surface.phase==='ready'&&surface.primary.demo?.active)assert.notEqual(surface.primary.mode,'board',label+': the active lesson is the inspected primary surface');
 const painted=surface.main.filter(c=>c.visible&&c.opaque>60&&c.colors>8);
 const domPainted=surface.cookieImages.length>0&&surface.cookieImages.every(img=>img.loaded&&match(img.assets));
 assert.ok(painted.length>0||domPainted,label+': visible pixels in the actual primary surface');
 // Jelly's third native lesson is an intentional vector-only color-mixing
 // demonstration; it never contained a bitmap. Every other primary surface
 // must show its actual native image source, not merely a frame/background.
 const vectorLesson=surface.kind==='jelly'&&surface.primary.mode==='ready-story'&&surface.primary.demo?.scene===3;
 if(!vectorLesson)assert.ok(painted.some(c=>match(c.assets))||domPainted,label+': native material is used by the visible primary surface');
 assert.deepEqual(surface.selected,[surface.active],label+': one selected tab');
 assert.deepEqual(surface.visiblePanels,[surface.active],label+': one visible board');
 assert.ok(Object.values(surface.classes).every(Boolean),label+': ornate artwork is installed');
 assert.deepEqual(surface.legacy,{apis:[],classes:[]},label+': all old Cartoon APIs and classes are absent');
 assert.ok(surface.backgrounds.game.includes(backgrounds[surface.kind]),label+': original game background URL remains');
 if(['gelato','winery','jelly','stick','castella','dango'].includes(surface.kind))assert.ok(surface.backgrounds.internal?.includes(backgrounds[surface.kind]),label+': original background remains on the actual inner scene');
 if(surface.kind==='popcorn')assert.ok(painted.some(c=>c.assets.includes('assets/popcorn-art/popcorn-fair.webp')),label+': native Popcorn scene background is drawn');
 assert.ok(surface.decoration.game.matches,label+': outer cabinet uses the selected game frame');
 assert.equal(surface.decoration.game.pointerEvents,'none',label+': outer frame cannot intercept board input');
 if(surface.primary.mode==='board'&&surface.decoration.odds?.visible)assert.ok(surface.decoration.odds.matches,label+': the visible odds cabinet uses its selected payout frame');
 if(surface.kind==='choco'&&surface.primary.mode==='board')assert.ok(painted.some(c=>c.assets.includes('assets/ornate-art-v274/payout-frames.png')),label+': Choco draws its ornate payout trim on the visible native canvas');
 assert.deepEqual(surface.brokenVisibleImages,[],label+': all visible images have decoded');
 assert.ok(surface.layout.documentWidth<=surface.layout.width+2,label+': no horizontal document overflow');
 assert.deepEqual(surface.layout.primaryOutsideGame,[],label+': primary canvas stays inside the game frame');
 assert.ok(surface.payoutText.every(text=>!/NaN|undefined|Infinity/.test(text)),label+': payout labels remain finite');
 for(const mini of surface.miniatures){
  const visible=mini.canvases.filter(c=>c.opaque>12&&c.colors>5);
  assert.ok(visible.length>0,label+': visible live miniature for '+mini.game);
  // Native Choco copies source pixels into a new ImageData. Its ore objects
  // have direct image lineage; require it whenever the visible 12x7 strata
  // contain an exposed/encased ore. An ore-free board is checked as pixels.
  if(mini.game!=='choco'||mini.oreTiles>0)assert.ok(visible.some(c=>c.assets.some(name=>nativeSource[mini.game].test(name))),label+': native image material in miniature '+mini.game);
  assert.ok(mini.frame.present&&mini.frame.matches,label+': themed miniature frame for '+mini.game);
  assert.equal(mini.frame.pointerEvents,'none',label+': miniature trim leaves tab input intact');
 }
 if(surface.kind==='candy'&&surface.primary.mode==='board'){
  assert.equal(surface.roles.length,3,label+': three native Six Drop role illustrations');
  for(const role of surface.roles){assert.equal(role.loaded,true);assert.equal(role.role,'native-v247');assert.ok(role.assets.some(name=>nativeSource.candy.test(name)),label+': role illustration uses the original candy PNG cache');}
 }
 for(const canvas of [...surface.main,...surface.miniatures.flatMap(m=>m.canvases)])assert.ok(canvas.assets.every(name=>!name.includes('cartoon-art-v272')),label+': no flat v272 atlas is drawn');
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
async function inspectArtwork(){
 return page.evaluate(async({names,nativeFiles})=>{
  const A=window.SweetsOrnateArtV274;await A.ready;
  const description=A.stats(),files=await Promise.all(description.files.map(async src=>{
   const image=new Image();image.src=src;await image.decode();
   return {file:src,width:image.naturalWidth,height:image.naturalHeight,loaded:image.complete};
  }));
  const frames=await Promise.all(names.map(async(name,index)=>{
   const src=A.url(name);if(!src)return {name,missing:true};
   const image=new Image();image.src=src;await image.decode();
   const cv=document.createElement('canvas');cv.width=image.naturalWidth;cv.height=image.naturalHeight;
   const c=cv.getContext('2d',{willReadFrequently:true});c.drawImage(image,0,0);
   const data=c.getImageData(0,0,cv.width,cv.height).data;let opaque=0,hash=2166136261;const colors=new Set();
   for(let i=0;i<data.length;i++)hash=Math.imul(hash^data[i],16777619)>>>0;
   for(let i=0;i<data.length;i+=4)if(data[i+3]>32){opaque++;colors.add((data[i]>>4)+','+(data[i+1]>>4)+','+(data[i+2]>>4));}
   const rendered=document.createElement('canvas');rendered.width=420;rendered.height=280;
   const g=rendered.getContext('2d',{willReadFrequently:true}),[mode,game]=name.split('-');
   const drawn=A.frame(g,game,0,0,420,280,20,mode),pixels=g.getImageData(0,0,420,280).data;let borderPixels=0,interiorPixels=0;
   for(let y=0;y<280;y++)for(let x=0;x<420;x++)if(pixels[(y*420+x)*4+3]>24){borderPixels++;if(x>=21&&x<399&&y>=21&&y<259)interiorPixels++;}
   const file=files[Math.floor(index/6)],css=getComputedStyle(document.documentElement);
   return {name,width:cv.width,height:cv.height,maxWidth:Math.ceil(file.width/3),maxHeight:Math.ceil(file.height/2),opaque,colors:colors.size,hash,cached:A.url(name)===src,urlIsPNG:src.startsWith('data:image/png'),cssMatches:css.getPropertyValue('--oa274-'+name).includes(src),slice:parseFloat(css.getPropertyValue('--oa274-'+mode+'-slice-'+game)),drawn,borderPixels,interiorPixels};
  }));
  const native=await Promise.all(nativeFiles.map(async src=>{const image=new Image();image.src=src;await image.decode();return {file:src,width:image.naturalWidth,height:image.naturalHeight,loaded:image.complete};}));
  return {description,entries:[...A.entries],entriesFrozen:Object.isFrozen(A.entries),files,frames,native,
   styles:[...document.styleSheets].map(sheet=>sheet.href?new URL(sheet.href).pathname:'').filter(path=>/\/(?:ornate|cartoon)-/.test(path)),
   legacyAPIs:Object.getOwnPropertyNames(window).filter(name=>name.startsWith('SweetsCartoon'))};
 },{names:frameNames,nativeFiles:[...new Set(nativeImages)]});
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
 const imageRequests=new Set();
 page.on('request',request=>{if(request.resourceType()==='image')imageRequests.add(request);});
 page.on('response',response=>{const request=response.request();if(imageRequests.has(request)&&response.status()>=400)report.imageFailures.push({url:response.url(),status:response.status()});});
 page.on('requestfailed',request=>{if(imageRequests.has(request))report.imageFailures.push({url:request.url(),error:request.failure()?.errorText});});
 await fixture.context.addInitScript(installArtObserver);
 await page.reload({waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>window.__qa250&&window.SweetsSharedMachine?.client?.online&&window.SweetsOrnateArtV274?.loaded&&window.SweetsOrnateBoardsAV274,null,{timeout:60000});
 assert.equal(await page.evaluate(()=>window.SweetsOrnateArtV274.ready),true,'all ornate image sheets load before the artwork check');
 await page.evaluate(()=>document.fonts.ready);
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.waitForFunction(()=>document.querySelector('.v250-shared-bet-switch')&&!document.querySelector('.v250-shared-bet-switch').disabled,null,{timeout:15000});
 const ids=await page.evaluate(()=>window.__qa250.slots.filter(s=>!s.holder.hidden).map(s=>s.holder.dataset.gameKind||s.engine.kind||'cookie'));
 assert.deepEqual(ids,games,'the fixture exercises all ten games in the production lineup');
 report.artwork=await inspectArtwork();
 const artwork=report.artwork;
 assert.equal(artwork.description.version,'v274');assert.equal(artwork.description.loaded,true);assert.equal(artwork.description.frames,18);assert.equal(artwork.description.cached,18);
 assert.equal(artwork.entriesFrozen,true);assert.deepEqual([...artwork.entries].sort(),[...frameNames].sort());assert.equal(artwork.files.length,3);assert.equal(artwork.frames.length,18);
 assert.deepEqual(artwork.legacyAPIs,[],'all old Cartoon artwork APIs are absent');
 assert.deepEqual(artwork.styles.sort(),['/assets/ornate-art-v274.css','/assets/ornate-boards-a-v274.css','/assets/ornate-boards-b-v274.css','/assets/ornate-boards-c-v274.css'].sort(),'only the new ornate stylesheets are active');
 for(const file of artwork.files){assert.equal(file.loaded,true);assert.ok(file.width>=1000&&file.height>=1000,'full generated frame sheet decoded: '+file.file);}
 for(const frame of artwork.frames){
  assert.equal(frame.missing,undefined,frame.name+' exists');assert.ok(frame.cached&&frame.urlIsPNG&&frame.cssMatches,frame.name+' has a cached PNG wired to its CSS variable');
  assert.ok(frame.width>=16&&frame.height>=16&&frame.width<=frame.maxWidth&&frame.height<=frame.maxHeight,frame.name+' crop stays within its sheet cell');
  assert.ok(frame.opaque>50&&frame.colors>8,frame.name+' has detailed painted content');assert.ok(frame.slice>0,frame.name+' has its measured 9-slice inset');
  assert.equal(frame.drawn,true,frame.name+' draws through the production frame painter');assert.ok(frame.borderPixels>50,frame.name+' paints a visible border');assert.equal(frame.interiorPixels,0,frame.name+' leaves the board interior clear');
 }
 assert.equal(new Set(artwork.frames.map(frame=>frame.hash)).size,18,'all eighteen frame materials have distinct raster content');
 for(const image of artwork.native){assert.equal(image.loaded,true);assert.ok(image.width>0&&image.height>0,'restored native image decodes: '+image.file);}
 const candy=artwork.native.find(image=>image.file==='assets/six-candy-png/candies.webp');
 assert.ok(candy&&candy.width===candy.height*4,'Six Drop retains its original four-crop candy sheet');
 await sleep(1200);
 await tour('ready');

 // Start one real local server round without issuing a draw. This exposes
 // every live board while leaving its exact number/payout data stable for
 // the complete selection and responsive-layout assertions.
 await page.evaluate(()=>{
  const q=window.__qa250;window.SweetsSharedControllerV224.setAutoRebet(false);
  for(let i=0;i<q.app.bets.length;i++)if(q.app.bets[i]<=0)q.app.setBet(i,100);
 });
 current={phase:'playing',game:null,step:'server-bet-window'};
 await fixture.call('/api/admin/machines/public-01/host/register',{session:fixture.host,body:{},adminOnly:true});
 const betRound=await until(async()=>{const state=await fixture.call('/api/machines/public-01/state',{session:fixture.host});return state.round?.phase==='BETTING'?state.round:null;},'isolated artwork BET window opens');
 report.round={id:betRound.id,serverPhase:betRound.phase,ballsSubmitted:0};
 // AUTO REBET is deliberately off. Register this client through the real
 // manual BET control before waiting for PLAYING; a server round alone does
 // not authorize or start an unregistered player's ten engines.
 await page.waitForFunction(id=>{
  const q=window.__qa250,c=window.SweetsSharedMachine?.client,C=window.SweetsSharedControllerV224,button=document.getElementById('shared-bet-v228');
  return c?.round?.id===id&&c.round.phase==='BETTING'&&c.round.canBet&&C?.stable()&&C.canEditBets(q.app)&&button&&!button.disabled;
 },betRound.id,{timeout:15000});
 const selectedBets=await page.evaluate(()=>[...window.__qa250.app.bets]);
 assert.equal(selectedBets.length,games.length);assert.ok(selectedBets.every(bet=>bet>0),'all ten games have a positive real BET before registration');
 current.step='register-bet';
 await page.locator('#shared-bet-v228').click();
 await page.waitForFunction(id=>{
  const c=window.SweetsSharedMachine?.client;
  return c?.round?.id===id&&c.round.participant?.playerId===c.playerId&&window.SweetsSharedControllerV224.describe().joinedRoundId===id;
 },betRound.id,{timeout:15000});
 report.round.registration=await page.evaluate(()=>{
  const c=window.SweetsSharedMachine.client,p=c.round.participant;
  return {roundId:c.round.id,bets:p.bets,enabled:p.enabled,totalBet:p.totalBet};
 });
 assert.deepEqual(report.round.registration.bets,selectedBets,'the server acknowledges the selected ten-game BET');
 assert.ok(report.round.registration.enabled.every(Boolean),'the acknowledged entry enables all ten games');
 current.step='server-playing';
 const round=await until(async()=>{const state=await fixture.call('/api/machines/public-01/state',{session:fixture.host});return state.round?.id===betRound.id&&state.round.phase==='PLAYING'?state.round:null;},'registered artwork round starts');
 report.round.serverPhase=round.phase;current.step='client-playing';
 await page.waitForFunction(id=>window.SweetsSharedMachine.active?.roundId===id&&window.__qa250.app.phase==='playing',round.id,{timeout:30000});
 current.step='opening-presentation';
 await page.waitForFunction(()=>window.__qa250.app.engines.every(e=>!e.opening&&!e.busy&&!(e.queue?.length)),null,{timeout:30000});
 assert.ok(await page.evaluate(()=>window.__qa250.app.enabled.every(Boolean)),'all ten real engines start under their own rules');
 assert.equal(await page.evaluate(()=>window.__qa250.app.draws.length),0,'live artwork is inspected before the first lottery ball');
 await tour('playing');

 await page.setViewportSize({width:390,height:844});await sleep(320);
 const mobile=await tour('mobile',{screens:false});
 report.viewports.push({width:1366,height:900,phases:['ready','playing']},{width:390,height:844,games:mobile.games.map(g=>({game:g.kind,layout:g.layout}))});
 assert.equal(report.screens.length,20,'ten ready and ten live screenshots are retained');
 assert.equal(fixture.requests.some(r=>r.path.endsWith('/round/ball')),false,'the visual test never submits or fabricates a lottery result');
 assert.equal(fixture.errors.length,0,JSON.stringify(fixture.errors));
 report.pageErrors=fixture.errors;report.warnings=fixture.warnings;
 assert.deepEqual(report.imageFailures,[],'all requested artwork images load successfully');
 report.adapters=await page.evaluate(()=>({art:window.SweetsOrnateArtV274.stats(),a:window.SweetsOrnateBoardsAV274.describe(),legacy:Object.getOwnPropertyNames(window).filter(name=>name.startsWith('SweetsCartoon'))}));
 assert.deepEqual(report.adapters.legacy,[]);
 await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
 console.log('ORNATE_ART_V274_BROWSER_PASS',JSON.stringify({version:report.version,frames:report.artwork.frames.length,screens:report.screens.length,games:games.length,phases:report.phases.map(p=>p.phase),pageErrors:report.pageErrors}));
}catch(error){
 report.failure={message:String(error),stack:error.stack,current,pageErrors:fixture?.errors||[],warnings:fixture?.warnings||[]};
 if(page){
  try{report.failure.state=(await page.evaluate(logicalSnapshot)).summary;}catch{}
  try{report.failure.startup=await page.evaluate(()=>({serverRound:window.SweetsSharedMachine?.client?.round?.id,serverPhase:window.SweetsSharedMachine?.client?.round?.phase,participant:!!window.SweetsSharedMachine?.client?.round?.participant,controller:window.SweetsSharedControllerV224?.describe(),engines:window.__qa250.app.engines.map(e=>({kind:e.kind||'cookie',phase:e.phase,opening:!!e.opening,busy:!!e.busy,queued:e.queue?.length||0,accepted:e.accepted,processed:e.processed,paused:!!e.paused}))}));}catch{}
  try{report.failure.surface=await page.evaluate(inspectSurface);}catch{}
  try{await page.screenshot({path:path.join(output,'failure.png'),fullPage:true});}catch{}
 }
 await fs.mkdir(output,{recursive:true});
 await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
 if(fixture)await fs.writeFile(path.join(output,'failure-server.log'),fixture.logs.slice(-20000));
 console.error('ORNATE_ART_V274_BROWSER_FAIL',error);throw error;
}finally{await fixture?.close();}

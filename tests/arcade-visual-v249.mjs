/* Exercise the actual shared client and its real nine engines. The only route
   change exposes existing lexical state for observation; no draw, payout or
   tab handler is replaced. The source fixture retains all of its assertions. */
import fs from 'node:fs/promises';
const sourceFile=new URL('./client-browser-v243.mjs',import.meta.url);
const temporary=new URL('./.arcade-visual-run-v249.mjs',import.meta.url);
let source=await fs.readFile(sourceFile,'utf8');
function replaceOnce(anchor,value){
 if(source.split(anchor).length!==2)throw Error('Arcade visual fixture anchor changed: '+anchor);
 source=source.replace(anchor,value);
}
replaceOnce("out='qa-client-v243'","out='qa-arcade-v249'");
replaceOnce('window.__client243={app,slots};','window.__client243={app,slots,get active(){return active;}};');
const beforeBalls='const numbers=[3,7,11];let firstBatchTotals;';
replaceOnce(beforeBalls,String.raw`
 await page.waitForFunction(()=>window.SweetsArcadeBrandV249?.catalog&&window.SweetsArcadeTabsV249&&document.documentElement.dataset.arcadeSurfaces==='v249'&&document.querySelectorAll('#tabs img.v249-selected-logo').length===9&&document.querySelectorAll('.v249-event-stage').length===9,null,{timeout:20000});
 await page.waitForFunction(()=>window.__client243.app.phase==='playing'&&window.__client243.app.engines.every(e=>!e.opening&&!e.busy&&!(e.queue?.length)),null,{timeout:15000});
 await page.evaluate(async()=>{
  await document.fonts.ready;
  const images=[...document.querySelectorAll('#tabs img.v249-selected-logo')];
  await Promise.all(images.map(image=>image.decode()));
 });
 const arcadeVisualReport={version,viewports:[],rapidSelection:null,keyboard:null,reducedMotion:null,landscape:null,live:null};
 // Chromium's native touch emulation changes pointer media queries without
 // replacing application code or opening a second participating player.
 const touch249=await context.newCDPSession(page);
 const branding=await page.evaluate(()=>{
  const {app,slots}=window.__client243;
  return {catalog:window.SweetsArcadeBrandV249.catalog,kinds:app.engines.map(e=>e.kind),rootClass:document.documentElement.classList.contains('arcade-v249'),logos:slots.map(s=>{const image=s.tab.querySelector('img.v249-selected-logo');return {kind:s.engine.kind,src:image?.getAttribute('src'),width:image?.naturalWidth,height:image?.naturalHeight,label:s.tab.getAttribute('aria-label')};}),surfaces:slots.map(s=>({kind:s.engine.kind,declared:s.panel.dataset.v249Kind,enabled:s.panel.classList.contains('v249-game-surface'),stages:s.panel.querySelectorAll('.v249-event-stage').length,pointerEvents:getComputedStyle(s.panel.querySelector('.v249-event-stage')).pointerEvents}))};
 });
 assert.equal(branding.rootClass,true);assert.equal(branding.logos.length,9);
 assert.deepEqual([...branding.kinds].sort(),['cookie','choco','candy','gelato','winery','popcorn','jelly','stick','castella'].sort());
 for(const logo of branding.logos){assert.ok(logo.src?.split('?')[0].endsWith('assets/arcade-v249/logo-'+logo.kind+'.webp'),logo.kind+' uses the new branded asset');assert.ok(logo.width>=100&&logo.height>=30,logo.kind+' logo decodes');assert.ok(logo.label?.length>2,logo.kind+' retains its accessible title');}
 for(const surface of branding.surfaces){assert.equal(surface.enabled,true);assert.equal(surface.declared,surface.kind);assert.equal(surface.stages,1);assert.equal(surface.pointerEvents,'none','presentation cannot capture game input');}
 arcadeVisualReport.branding=branding;

 async function settled(){
  await page.waitForFunction(()=>window.SweetsArcadeTabsV249.describe().runningAnimations===0,null,{timeout:2500});
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 }
 async function inspectSelection(expected){
  const result=await page.evaluate(()=>{
   const {app,slots,active}=window.__client243;
   const selected=slots.filter(s=>s.tab.getAttribute('aria-selected')==='true');
   const visible=slots.filter(s=>!s.panel.hidden);
   const current=slots[active],image=current.tab.querySelector('img.v249-selected-logo');
   const visibleImage=image&&getComputedStyle(image).display!=='none'&&getComputedStyle(image).visibility!=='hidden'&&Number(getComputedStyle(image).opacity)>0;
   // Gelato intentionally retires the generic canvas. Its actual renderer is
   // the raster canvas inside .gp-mini, with a numbered SVG fallback while
   // its artwork loads. All other current games paint slot.miniCanvas.
   const previewOf=slot=>{
    const gelato=slot.tab.querySelector('.gp-mini');
    const node=slot.engine.kind==='gelato'?(gelato?.classList.contains('gp-raster-ready')?gelato.querySelector('canvas.gp-raster-board'):gelato?.querySelector('svg.gp-board-svg')):slot.miniCanvas;
    if(!node)return {kind:slot.engine.kind,exists:false};
    const rect=node.getBoundingClientRect();let shown=rect.width>0&&rect.height>0;
    for(let ancestor=node;ancestor&&ancestor!==slot.holder;ancestor=ancestor.parentElement){const style=getComputedStyle(ancestor);if(style.display==='none'||style.visibility==='hidden'||Number(style.opacity)===0){shown=false;break;}}
    let paint;
    if(node instanceof HTMLCanvasElement){
     const probe=document.createElement('canvas');probe.width=probe.height=24;
     const context=probe.getContext('2d');context.drawImage(node,0,0,24,24);
     const pixels=context.getImageData(0,0,24,24).data,colors=new Set();let visiblePixels=0;
     for(let n=0;n<pixels.length;n+=4)if(pixels[n+3]>0){visiblePixels++;colors.add(pixels[n]+','+pixels[n+1]+','+pixels[n+2]+','+pixels[n+3]);}
     paint={kind:'canvas',visiblePixels,colors:colors.size,buffer:[node.width,node.height]};
    }else{
     const digits=[...node.querySelectorAll('[data-node] .gp-digit')].map(n=>n.textContent.trim());
     paint={kind:'svg',geometry:node.querySelectorAll('path,polygon,circle').length,numberedNodes:digits.filter(n=>/^\d+$/.test(n)).length};
    }
    return {kind:slot.engine.kind,exists:true,renderer:node.className?.baseVal??node.className,width:rect.width,height:rect.height,previewVisible:shown,paint};
   };
   const selectedPreview=previewOf(current);
   const center=current.tab.getBoundingClientRect(),hit=document.elementFromPoint(center.x+center.width/2,center.y+center.height/2);
   const rect=current.panel.getBoundingClientRect();
   return {active,selected:selected.map(s=>s.i),visible:visible.map(s=>s.i),kind:app.engines[active].kind,surfaceKind:document.body.dataset.v249Game,logoVisible:visibleImage,selectedPreview,tabReceivesPointer:!!hit&&(current.tab===hit||current.tab.contains(hit)),panel:{width:rect.width,height:rect.height},diagnostics:window.SweetsArcadeTabsV249.describe(),inactivePreviews:slots.filter(s=>s.i!==active).map(s=>{const image=s.tab.querySelector('img.v249-selected-logo');return {...previewOf(s),logoHidden:getComputedStyle(image).display==='none'||getComputedStyle(image).visibility==='hidden'||Number(getComputedStyle(image).opacity)===0};})};
  });
  assert.equal(result.active,expected);assert.deepEqual(result.selected,[expected]);assert.deepEqual(result.visible,[expected]);
  assert.equal(result.surfaceKind,result.kind);assert.equal(result.logoVisible,true,'selected card presents its game logo');assert.equal(result.selectedPreview.exists,true);assert.equal(result.selectedPreview.previewVisible,false,'selected card does not duplicate its live main board');assert.equal(result.tabReceivesPointer,true,'decorations do not intercept the tab center');
  assert.ok(result.panel.width>150&&result.panel.height>150,'active board remains readable');
  for(const preview of result.inactivePreviews){assert.equal(preview.exists,true);assert.equal(preview.previewVisible,true,preview.kind+' keeps a live miniature');assert.equal(preview.logoHidden,true,preview.kind+' switches from logo to preview');assert.ok(preview.width>=20&&preview.height>=20);if(preview.paint.kind==='canvas'){assert.ok(preview.paint.visiblePixels>20&&preview.paint.colors>4,preview.kind+' miniature contains painted game pixels');}else{assert.ok(preview.paint.geometry>20&&preview.paint.numberedNodes===19,'Gelato SVG fallback has the actual numbered board');}}
  return result;
 }
 await page.evaluate(()=>{
  const {app}=window.__client243;
  window.__qa249Engines=app.engines.slice();
  window.__qa249Snapshot=()=>JSON.stringify({credit:app.credit,bets:app.bets,phase:app.phase,draws:app.draws,roundWins:app.roundWins,engines:app.engines.map(e=>({kind:e.kind,version:e.version,phase:e.phase,accepted:e.accepted,processed:e.processed,totalHundredths:e.totalHundredths,seed:e.seed,seed247:e.seed247,rng:e.rngState,state:e.kind==='candy'?e.state:null}))});
  window.__qa249Before=window.__qa249Snapshot();
 });
 // Capture every real main board at both physical layouts; no synthetic
 // preview image or replacement canvas is installed by this test.
 for(const [width,height] of [[1366,900],[390,844]]){
  await touch249.send('Emulation.setTouchEmulationEnabled',{enabled:width<500,maxTouchPoints:width<500?5:1});
  await page.setViewportSize({width,height});await sleep(350);
  assert.equal(await page.evaluate(()=>document.body.classList.contains('mobile-view')),width<500,'portrait screenshots use the native touch layout');
  for(let index=0;index<9;index++){
   await page.locator('#tab'+index).click();await settled();
   const selection=await inspectSelection(index);
   const geometry=await page.evaluate(()=>{
    const rect=element=>{const r=element.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
    const tabs=[...document.querySelectorAll('#tabs>.tab-slot')].filter(n=>!n.hidden).map(rect),foot=document.querySelector('#console');
    return {viewport:[innerWidth,innerHeight],document:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],tabs,footer:foot?rect(foot):null,bet:document.querySelector('#total-bet')?.textContent,credit:document.querySelector('#credit')?.textContent};
   });
   assert.ok(geometry.document[0]<=width+2,'no horizontal page overflow');assert.ok(geometry.document[1]<=height+2,'cabinet fits the viewport vertically');
   for(const tab of geometry.tabs)assert.ok(tab.x>=-1&&tab.right<=width+1,'all nine cards remain within the viewport');
   assert.ok(geometry.footer&&geometry.footer.width>100&&geometry.footer.height>24&&geometry.footer.bottom<=height+2,'bottom BET/WIN/CREDIT controls remain visible');
   assert.ok(geometry.bet?.trim()&&geometry.credit?.trim(),'real balance fields stay rendered');
   const file=(width<500?'mobile':'desktop')+'-'+String(index).padStart(2,'0')+'-'+selection.kind+'.png';
   await page.screenshot({path:out+'/'+file});
   arcadeVisualReport.viewports.push({width,height,index,kind:selection.kind,file,geometry});
  }
 }
 await page.setViewportSize({width:430,height:932});await sleep(350);
 await page.evaluate(()=>{for(const index of [0,8,1,7,2,6,3,5,4,0,8,2,7,1,6,3,5,4])document.querySelector('#tab'+index).click();});
 await settled();arcadeVisualReport.rapidSelection=await inspectSelection(4);
 const gameplay=await page.evaluate(()=>({sameEngines:window.__client243.app.engines.every((e,i)=>e===window.__qa249Engines[i]),unchanged:window.__qa249Snapshot()===window.__qa249Before}));
 assert.deepEqual(gameplay,{sameEngines:true,unchanged:true},'logo/selection transitions do not restart engines or mutate game results/BET');arcadeVisualReport.rapidSelection.gameplay=gameplay;
 await page.screenshot({path:out+'/mobile-430-tabs.png'});
 const order=await page.evaluate(()=>window.__client243.slots.filter(s=>!s.holder.hidden).sort((a,b)=>Number(a.holder.style.order)-Number(b.holder.style.order)).map(s=>s.i));
 await page.locator('#tab4').press('End');await settled();await inspectSelection(order.at(-1));
 await page.locator('#tab'+order.at(-1)).press('Home');await settled();await inspectSelection(order[0]);
 await page.locator('#tab'+order[0]).press('ArrowRight');await settled();await inspectSelection(order[1]);
 arcadeVisualReport.keyboard={order,end:order.at(-1),home:order[0],right:order[1]};
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.locator('#tab8').click();await sleep(40);
 const reduced=await inspectSelection(8);assert.equal(reduced.diagnostics.reducedMotion,true);assert.equal(reduced.diagnostics.runningAnimations,0,'reduced motion avoids panel glide and spring');
 arcadeVisualReport.reducedMotion=reduced;
 await page.screenshot({path:out+'/mobile-reduced-motion.png'});
 await page.emulateMedia({reducedMotion:'no-preference'});
 await touch249.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
 await page.setViewportSize({width:844,height:390});await sleep(350);
 await page.locator('#tab2').click();await settled();
 const landscapeSelection=await inspectSelection(2);
 const landscape=await page.evaluate(()=>{
  const rect=node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
  const {slots,active}=window.__client243;
  return {viewport:[innerWidth,innerHeight],coarse:matchMedia('(pointer:coarse)').matches,landscapeMode:document.body.classList.contains('mobile-landscape'),document:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],rack:rect(document.querySelector('#tabs')),panel:rect(slots[active].panel),footer:rect(document.querySelector('#console')),cards:slots.map(s=>({kind:s.engine.kind,card:rect(s.holder),tab:rect(s.tab),nativeControlsPresent:[s.cycle,s.addBet,s.oneBet].every(n=>n&&s.holder.contains(n)),visibleControls:[s.cycle,s.addBet,s.oneBet,s.lockedBet].filter(n=>n?.getBoundingClientRect().width>0).map(rect)}))};
 });
 assert.equal(landscape.coarse,true);assert.equal(landscape.landscapeMode,true,'landscape runs the actual mobile two-column cabinet');
 assert.equal(landscape.cards.length,9);assert.ok(landscape.document[0]<=844+2,'landscape has no horizontal page overflow');
 const within=(inner,outer)=>inner.x>=outer.x-2&&inner.y>=outer.y-2&&inner.right<=outer.right+2&&inner.bottom<=outer.bottom+2;
 for(const card of landscape.cards){assert.ok(within(card.card,landscape.rack),card.kind+' card fits its landscape rack');assert.ok(within(card.tab,card.card),card.kind+' tab fits its card');assert.equal(card.nativeControlsPresent,true);for(const control of card.visibleControls)assert.ok(within(control,card.card),card.kind+' native BET field fits its card');}
 const visibleViewport={x:0,y:0,right:844,bottom:390};
 assert.ok(within(landscape.panel,visibleViewport),'landscape main panel remains visible');assert.ok(landscape.footer.width>250&&landscape.footer.height>24&&within(landscape.footer,visibleViewport),'landscape native console remains visible');
 arcadeVisualReport.landscape={...landscape,selection:landscapeSelection};
 await page.screenshot({path:out+'/landscape-844-sixdrop.png'});
 await touch249.send('Emulation.setTouchEmulationEnabled',{enabled:false});await touch249.detach();
 await page.setViewportSize({width:1366,height:900});await sleep(350);
 await page.locator('#tab2').click();await settled();
 await fs.writeFile(out+'/visual-result.json',JSON.stringify(arcadeVisualReport,null,2)+'\n');
 console.log('ARCADE_VISUAL_V249_LAYOUT_PASS',JSON.stringify({version,logos:branding.logos.length,surfaces:branding.surfaces.length,screens:arcadeVisualReport.viewports.length,rapidFinal:arcadeVisualReport.rapidSelection.active,gameplay,keyboard:arcadeVisualReport.keyboard,reducedMotion:true}));
 `+beforeBalls);
const afterBalls="console.log('SIXDROP_V247_BROWSER_HUD',JSON.stringify(sixHud));";
const ballLoop='for(let i=0;i<numbers.length;i++){\n  await call';
replaceOnce(ballLoop,String.raw`for(let i=0;i<numbers.length;i++){
  const liveKind=['castella','winery','candy'][i],liveIndex=await page.evaluate(kind=>window.__client243.app.engines.findIndex(e=>e.kind===kind),liveKind);
  await page.locator('#tab'+liveIndex).click();await settled();
  await call`);
replaceOnce(afterBalls,afterBalls+String.raw`
 const liveVisual=await page.evaluate(()=>{
  const {app,slots}=window.__client243;
  return {draws:app.draws.slice(),engines:app.engines.map((e,i)=>({index:i,kind:e.kind,accepted:e.accepted,processed:e.processed,phase:e.phase})),events:slots.map(s=>({kind:s.engine.kind,cues:Number(s.panel.querySelector('.v249-event-stage')?.dataset.eventCount||0),rewardBursts:Number(s.holder.dataset.v249RewardCount||0)})),tabs:window.SweetsArcadeTabsV249.describe(),surfaces:document.querySelectorAll('.v249-event-stage').length,stageCanCaptureInput:[...document.querySelectorAll('.v249-event-stage')].some(n=>getComputedStyle(n).pointerEvents!=='none')};
 });
 assert.equal(liveVisual.engines.length,9);assert.deepEqual(liveVisual.draws,numbers);assert.equal(liveVisual.surfaces,9);assert.equal(liveVisual.stageCanCaptureInput,false);
 assert.ok(liveVisual.events.some(event=>event.cues>0),'native server balls produce visible bounded surface feedback');
 for(const engine of liveVisual.engines)assert.ok(engine.accepted>=numbers.length,engine.kind+' still receives all server balls while its tab is inactive');
 arcadeVisualReport.live=liveVisual;
 await page.screenshot({path:out+'/desktop-live-effects.png'});
 await fs.writeFile(out+'/visual-result.json',JSON.stringify(arcadeVisualReport,null,2)+'\n');
 console.log('ARCADE_VISUAL_V249_LIVE_PASS',JSON.stringify(liveVisual));
 `);
replaceOnce("console.error('CLIENT_BROWSER_V243_FAIL',error);",String.raw`
 console.error('CLIENT_BROWSER_V243_FAIL',error);
 if(page)try{await page.screenshot({path:out+'/failure.png'});}catch{}
 `);
await fs.writeFile(temporary,source);
try{await import(temporary.href);}finally{await fs.rm(temporary,{force:true});}

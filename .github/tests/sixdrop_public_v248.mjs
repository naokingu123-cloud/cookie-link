/* Verify published bytes and the current client renderer without creating a
   public session, placing BETs, sending balls, or assuming a local roulette. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const base=new URL(process.env.SIXDROP_PUBLIC_BASE||'https://naokingu123-cloud.github.io/cookie-link/');
const revision=process.env.GITHUB_SHA||'local-verification',out='qa-six-v248-public';
const gameKinds=['cookie','choco','candy','gelato','winery','popcorn','jelly','stick','castella','dango'];
const arcadeFiles=['assets/arcade-brand-v249.js','assets/arcade-brand-v249.css','assets/arcade-tabs-v249.js','assets/arcade-tabs-v249.css','assets/arcade-surfaces-v249.js','assets/arcade-surfaces-v249.css','assets/jelly-view.js','assets/game-menu-v91.js','assets/lineups-v91.js',...gameKinds.map(kind=>'assets/arcade-v249/logo-'+kind+'.webp')];
arcadeFiles.push('assets/party-castella-rules.js','assets/party-castella-host.js','assets/party-castella.js','assets/party-castella.css','assets/castella-lesson.js');
arcadeFiles.push('assets/dango-bingo-rules.js','assets/dango-bingo-view.js','assets/dango-bingo-host.js','assets/dango-bingo-lesson.js','assets/dango-bingo.css','assets/dango-art/background.webp','assets/dango-thinking-v251.js','assets/server-payout-control-v3.js','assets/player-lounge.js','assets/demo-suite-v91.js','assets/arcade-show-v91.js');
const files=['index.html','app-version.json','optimized/app-01.js','optimized/style-01.css','optimized/media/a73bbbdd98d48aac.woff2','assets/cookie-upgrade-patches.js','assets/sixdrop-progressive-core-v247.js','assets/sixdrop-progressive-host-v247.js','assets/sixdrop-progressive-v247.css','assets/shared-machine-v176.js','assets/shared-client-controller-v224.js','assets/stations-v235.js','assets/stations-progressive-v246.js','monitor.html','assets/monitor-ledger-v241.js','assets/server-monitor-v241.js','assets/server-monitor-v242.js',...arcadeFiles];
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const expected=Object.fromEntries(await Promise.all(files.map(async name=>[name,digest(await fs.readFile(name))])));
const appVersion=JSON.parse(await fs.readFile('app-version.json','utf8')).version;
const core=await fs.readFile('assets/sixdrop-progressive-core-v247.js','utf8');
const rulesRevision=Number(core.match(/REVISION=(\d+)/)?.[1]);assert.ok(rulesRevision>=248);
let actual={},mismatches=files,lastError='',matched=false;
const deadline=Date.now()+180000;
while(Date.now()<deadline){
 const checks=await Promise.allSettled(files.map(async name=>{
  const url=new URL(name,base);url.searchParams.set('verify',revision);
  const response=await fetch(url,{headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(15000)});
  assert.equal(response.status,200,name+' is not published');
  return [name,digest(Buffer.from(await response.arrayBuffer()))];
 }));
 actual={};for(const result of checks){if(result.status==='fulfilled')actual[result.value[0]]=result.value[1];else lastError=String(result.reason);}
 mismatches=files.filter(name=>actual[name]!==expected[name]);
 if(!mismatches.length){matched=true;break;}
 await new Promise(resolve=>setTimeout(resolve,4000));
}
assert.ok(matched,'Published asset hashes do not match this checkout: '+JSON.stringify({mismatches,lastError}));
await fs.mkdir(out,{recursive:true});
const report={revision,appVersion,base:base.href,scope:'Published asset hashes and frontend-ready rendering. Public game API and WebSocket traffic is intercepted locally; no session, BET, settlement or draw is sent.',matchingSha256:actual,screens:[]};
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{}),args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
try{
 for(const [width,height,mobile]of [[390,844,true],[844,390,true],[1366,900,false]]){
  const context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile,serviceWorkers:'block'});
  const blocked=[],sockets=[],errors=[];
  // Block all service calls as well as all non-read requests before navigation.
  // The shipped frontend still runs unchanged and shows its disconnected state.
  await context.route('**/*',async route=>{
   const request=route.request(),url=new URL(request.url());
   if(!['GET','HEAD'].includes(request.method())||/\/api(?:\/|$)/.test(url.pathname)||/\/ws(?:\/|$)/.test(url.pathname)){
    blocked.push({method:request.method(),path:url.pathname});
    return route.fulfill({status:503,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:'{"ok":false,"error":"read_only_public_verification"}'});
   }
   return route.continue();
  });
  await context.routeWebSocket('**/*',socket=>{sockets.push(socket.url());socket.close();});
  const page=await context.newPage();page.on('pageerror',error=>errors.push(String(error)));
  const url=new URL(base);url.searchParams.set('appv',appVersion);url.searchParams.set('verify',revision);
  const response=await page.goto(url.href,{waitUntil:'domcontentloaded',timeout:60000});assert.equal(response.status(),200);
  await page.waitForFunction(()=>window.SixDropV247?.engine&&window.SweetsSharedMachine&&window.SweetsStationsV235&&document.querySelector('#sd247-bank .gold-number'),null,{timeout:60000});
  await page.waitForFunction(()=>window.SweetsArcadeBrandV249?.catalog&&window.SweetsArcadeTabsV249&&window.SweetsArcadeSurfacesV249&&document.querySelectorAll('#tabs img.v249-selected-logo').length===10&&['arcade-brand-v249.css','arcade-tabs-v249.css','arcade-surfaces-v249.css'].every(name=>[...document.styleSheets].some(sheet=>sheet.href?.includes(name))),null,{timeout:30000});
  await page.evaluate(()=>document.querySelector('#tab2')?.click());
  await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.querySelectorAll('#tabs img.v249-game-logo,#tabs img.v249-selected-logo')].map(image=>image.decode()));});
  await page.waitForFunction(()=>window.SweetsArcadeTabsV249.describe().runningAnimations===0,null,{timeout:3000});
  const info=await page.evaluate(()=>{
   const q=window.SixDropV247,e=q.engine,canvas=document.querySelector('.carnival-canvas'),bank=document.querySelector('#sd247-bank'),gold=bank.querySelector('.gold-number');
   const rect=canvas.getBoundingClientRect();
   const selected=document.querySelector('#tab2 img.v249-selected-logo'),selectedStyle=getComputedStyle(selected),selectedRect=selected.getBoundingClientRect();
   const arcade={rootClass:document.documentElement.classList.contains('arcade-v249'),surfaceRevision:document.documentElement.dataset.arcadeSurfaces,activeGame:document.body.dataset.v249Game,landscape:document.body.classList.contains('mobile-landscape'),brand:window.SweetsArcadeBrandV249.describe(),tabs:window.SweetsArcadeTabsV249.describe(),surfaces:document.querySelectorAll('.v249-game-surface .v249-event-stage').length,catalogKinds:Object.keys(window.SweetsArcadeBrandV249.catalog),logos:[...document.querySelectorAll('#tabs img.v249-game-logo')].map(image=>({kind:image.dataset.logoKind,src:image.getAttribute('src'),width:image.naturalWidth,height:image.naturalHeight})),selectedLogo:{src:selected.getAttribute('src'),width:selectedRect.width,height:selectedRect.height,visible:selectedStyle.display!=='none'&&selectedStyle.visibility!=='hidden'&&Number(selectedStyle.opacity)>0},styles:[...document.styleSheets].map(sheet=>sheet.href).filter(href=>href&&/arcade-(brand|tabs|surfaces)-v249\.css/.test(href))};
   return {rulesRevision:q.rules.REVISION,gameName:e.gameName,drawMode:e.drawMode,phase:e.phase,accepted:e.accepted,processed:e.processed,serverHost:window.SweetsSharedMachine.serverHost,online:window.SweetsSharedMachine.online,canvas:{width:rect.width,height:rect.height},bankText:bank.parentElement.textContent,bankFont:getComputedStyle(gold).fontFamily,bankAlignment:getComputedStyle(bank).textAlign,roleRows:document.querySelectorAll('.sd247-roles section').length,obsoleteText:!!document.querySelector('.sd247-colors,.sd247-footer,#sd247-progress'),initialColors:q.rules.palette(0).map(i=>q.rules.RING[i]),finalColors:q.rules.palette(500).map(i=>q.rules.RING[i]),arcade};
  });
  assert.equal(info.rulesRevision,rulesRevision);assert.equal(info.gameName,'シックスドロップ');assert.equal(info.drawMode,'single');
  assert.equal(info.phase,'ready');assert.equal(info.accepted,0);assert.equal(info.processed,0);assert.equal(info.serverHost,false);assert.equal(info.online,false);
  assert.ok(info.canvas.width>100&&info.canvas.height>100,'current game canvas renders');
  assert.match(info.bankText,/全消し\s*\d+\s*WIN/);assert.match(info.bankFont,/ArcadePayout/);assert.equal(info.bankAlignment,'right');
  assert.equal(info.roleRows,3);assert.equal(info.obsoleteText,false);
  assert.deepEqual([...info.initialColors].sort(),['blue','aqua','green','lime'].sort());
  assert.deepEqual([...info.finalColors].sort(),['violet','pink','red','orange'].sort());
  const arcade=info.arcade;
  assert.equal(arcade.rootClass,true);assert.equal(arcade.surfaceRevision,'v249');assert.equal(arcade.activeGame,'candy');assert.equal(arcade.landscape,mobile&&width>height);
  assert.deepEqual(arcade.brand,{games:10,titles:10,loaded:10});assert.equal(arcade.tabs.logos,10);assert.equal(arcade.tabs.activeIndex,2);assert.equal(arcade.tabs.runningAnimations,0);assert.equal(arcade.surfaces,10);
  assert.deepEqual([...arcade.catalogKinds].sort(),[...gameKinds].sort());assert.equal(arcade.logos.length,10);
  for(const logo of arcade.logos){assert.ok(logo.src.split('?')[0].endsWith('assets/arcade-v249/logo-'+logo.kind+'.webp'));assert.ok(logo.width>=100&&logo.height>=30,logo.kind+' published logo decodes');}
  assert.ok(arcade.selectedLogo.visible&&arcade.selectedLogo.width>30&&arcade.selectedLogo.height>20,'published selected card displays the logo face');assert.ok(arcade.selectedLogo.src.split('?')[0].endsWith('assets/arcade-v249/logo-candy.webp'));
  assert.ok(['brand','tabs','surfaces'].every(name=>arcade.styles.some(href=>href.includes('arcade-'+name+'-v249.css'))),'all three published presentation styles are loaded');
  const current=await page.evaluate(()=>{
   const rules=window.PartyCastellaRules,state=window.PartyCastella.engine.state;
   const visible=node=>{const s=getComputedStyle(node),r=node.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)>0&&r.width>0&&r.height>0;};
   const backgrounds=[...document.querySelectorAll('#tabs .v250-background-logo')];
   const bet=[...document.querySelectorAll('.v250-shared-bet-switch')];
   return {tabsRevision:window.SweetsArcadeTabsV249.version,backgroundLogos:backgrounds.length,visibleBackgrounds:backgrounds.filter(visible).length,decodedBackgrounds:backgrounds.filter(n=>n.complete&&n.naturalWidth===768).length,commonBetButtons:bet.length,commonBetOutsideTabs:bet.every(n=>!document.getElementById('tabs').contains(n)),castellaRevision:rules.REVISION,castellaHoles:state.cells.length,castellaEdges:state.edges.length,castellaSpecials:{pour:state.specials.pour.length,fire:state.specials.fire.length,sugar:state.specials.sugar.length,odds:state.specials.odds.length},castellaPayoutRows:rules.payRows.length};
  });
  assert.equal(current.tabsRevision,251);assert.equal(current.backgroundLogos,10);assert.equal(current.visibleBackgrounds,9);assert.equal(current.decodedBackgrounds,10);
  assert.equal(current.commonBetButtons,1);assert.equal(current.commonBetOutsideTabs,true);
  assert.equal(current.castellaRevision,250);assert.equal(current.castellaHoles,61);assert.equal(current.castellaEdges,84);
  assert.deepEqual(current.castellaSpecials,{pour:2,fire:2,sugar:1,odds:0});assert.equal(current.castellaPayoutRows,13);
  info.v250=current;
  assert.deepEqual(errors,[],'published frontend has no uncaught JavaScript errors');
  await page.screenshot({path:out+'/public-ready-'+width+'.png'});
  await page.evaluate(()=>document.querySelector('#tab9').click());
  await page.waitForFunction(()=>window.DangoBingo?.engine&&!window.DangoBingo.engine.liveBoard&&document.body.classList.contains('dgb-active')&&window.SweetsDemoSuite.status.kind==='dango',null,{timeout:10000});
  info.dango=await page.evaluate(()=>{
   const e=window.DangoBingo.engine,R=window.DangoBingoRules,root=document.querySelector('.dgb-scene');
   return {revision:R.REVISION,liveBoard:e.liveBoard,cells:e.state.cells.length,numbers:e.state.numbers,initialFree:e.state.initialFreeCells,lines:R.lines.length,payRows:root.querySelectorAll('tbody tr').length,buttons:root.querySelectorAll('.dgb-cell').length,demo:window.SweetsDemoSuite.status.kind,odds:e.state.oddsMultiplier};
  });
  assert.equal(info.dango.revision,251);assert.equal(info.dango.liveBoard,false);assert.equal(info.dango.cells,25);assert.equal(info.dango.lines,19);assert.equal(info.dango.payRows,13);assert.equal(info.dango.buttons,25);
  assert.deepEqual(info.dango.numbers,Array.from({length:25},(_,i)=>i+1));assert.deepEqual(info.dango.initialFree,[]);assert.equal(info.dango.odds,1);
  assert.deepEqual(errors,[],'published Dango initialization has no uncaught errors');
  await page.screenshot({path:out+'/public-dango-ready-'+width+'.png'});
  report.screens.push({width,height,...info,blockedServiceRequests:blocked,blockedWebSockets:sockets,pageErrors:errors});
  await context.close();
 }
}finally{await browser.close();}
await fs.writeFile(out+'/public-deployment.json',JSON.stringify(report,null,2)+'\n');
console.log('SIXDROP_PUBLIC_V248_READ_ONLY_PASS',JSON.stringify(report));
console.log('ARCADE_PUBLIC_V249_READ_ONLY_PASS',JSON.stringify({revision,appVersion,verifiedFiles:files.length,logos:gameKinds.length,viewports:report.screens.map(screen=>({width:screen.width,height:screen.height,landscape:screen.arcade.landscape,loadedLogos:screen.arcade.brand.loaded,pageErrors:screen.pageErrors.length}))}));
console.log('ARCADE_PUBLIC_V250_READ_ONLY_PASS',JSON.stringify({revision,appVersion,verifiedFiles:files.length,viewports:report.screens.map(screen=>({width:screen.width,height:screen.height,...screen.v250,pageErrors:screen.pageErrors.length}))}));

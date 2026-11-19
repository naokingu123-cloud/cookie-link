/* Verify published bytes and the current client renderer without creating a
   public session, placing BETs, sending balls, or assuming a local roulette. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const base=new URL(process.env.SIXDROP_PUBLIC_BASE||'https://naokingu123-cloud.github.io/cookie-link/');
const revision=process.env.GITHUB_SHA||'local-verification',out='qa-six-v248-public';
function assertPayoutContained(bounds){
 const panel=bounds.panel,tolerance=1;
 assert.ok(panel.width>0&&panel.height>0,'the published payout panel has a visible area');
 assert.equal(bounds.rows.length,7,'the published payout matrix contains its header and all six payout rows');
 assert.equal(bounds.rows.flatMap(row=>row.cells).length,28,'four header cells, six row labels and eighteen valid values exist');
 assert.deepEqual(bounds.rows.filter(row=>row.length!==null).map(row=>row.cells.length-1),[3,3,3,3,3,3],'each line length has exactly three payout values');
 const contained=(rect,label)=>{
  assert.ok(rect.width>0&&rect.height>0,label+' has a visible area');
  assert.ok(rect.left>=panel.left-tolerance&&rect.top>=panel.top-tolerance&&rect.right<=panel.right+tolerance&&rect.bottom<=panel.bottom+tolerance,label+' is fully within .dgb-pay: '+JSON.stringify({rect,panel}));
 };
 for(const row of bounds.rows){
  const label='published payout '+(row.length===null?'header':row.length+'-cell line')+' row';contained(row.rect,label);
  for(const cell of row.cells)contained(cell.rect,label+' column '+cell.column);
 }
}
const gameKinds=['cookie','choco','candy','gelato','winery','popcorn','jelly','stick','castella','dango'];
const arcadeFiles=['assets/arcade-brand-v249.js','assets/arcade-brand-v249.css','assets/arcade-tabs-v249.js','assets/arcade-tabs-v249.css','assets/arcade-surfaces-v249.js','assets/arcade-surfaces-v249.css','assets/jelly-view.js','assets/game-menu-v91.js','assets/lineups-v91.js',...gameKinds.map(kind=>'assets/arcade-v249/logo-'+kind+'.webp')];
arcadeFiles.push('assets/party-castella-rules.js','assets/party-castella-host.js','assets/party-castella.js','assets/party-castella.css','assets/castella-lesson.js');
arcadeFiles.push('assets/dango-bingo-rules.js','assets/dango-bingo-view.js','assets/dango-bingo-host.js','assets/dango-bingo-lesson.js','assets/dango-bingo.css','assets/dango-art/background.webp','assets/dango-thinking-v251.js','assets/server-payout-control-v3.js','assets/player-lounge.js','assets/demo-suite-v91.js','assets/arcade-show-v91.js');
arcadeFiles.push(...['dango-white','bamboo-skewer','scene'].map(name=>'assets/dango-art-v252/'+name+'.webp'));
arcadeFiles.push(...['dango-green','dango-pink','dango-yellow','dango-rainbow','tsukimi-stand'].map(name=>'assets/dango-art-v253/'+name+'.webp'));
arcadeFiles.push('assets/sweets-results-v253.js','assets/sweets-results-v253.css','assets/results-art-v253/result-frame.webp','assets/results-art-v253/sweets-wipe.webp');
arcadeFiles.push('assets/sugar-challenge-rules-v254.js','assets/sugar-challenge-v254.js','assets/sugar-challenge-v254.css','assets/sugar-roulette-v254.js','assets/reach-art-v254/reach-common.webp','assets/shared-machine-core-v196.js','assets/server-offline-settlement-worker-v3.js');
arcadeFiles.push(...['scale','bottle','jpc-title'].map(name=>'assets/sugar-art-v254/'+name+'.webp'));
arcadeFiles.push('assets/edition-choice-v255.js','assets/download-mode-v255.js','assets/download-mode-v255.css','assets/download-cache-v255.js','assets/download-assets-v255.json','assets/download-roulette-v255.js','assets/recorded-round-v255.js','assets/player-profile-v255.js','assets/download-worker-v255.js','download-sw-v255.js','assets/server-monitor-download-v255.js','assets/server-monitor-download-v255.css');
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
  const chooserUrl=new URL(base);chooserUrl.searchParams.set('appv',appVersion);chooserUrl.searchParams.set('verify',revision);
  await page.goto(chooserUrl.href,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForSelector('#edition-choice-v255');
  const chooser=await page.evaluate(()=>({edition:window.SweetsEditionV255.value,streaming:!!window.SweetsSharedMachine,download:!!window.SweetsDownloadV255,overflow:document.documentElement.scrollWidth>innerWidth+1,options:[...document.querySelectorAll('[data-edition-choice]')].map(link=>({edition:link.dataset.editionChoice,name:link.querySelector('strong').textContent,url:link.href}))}));
  assert.equal(chooser.edition,'');assert.equal(chooser.streaming,false);assert.equal(chooser.download,false);assert.equal(chooser.overflow,false);
  assert.deepEqual(chooser.options.map(option=>[option.edition,option.name]),[['streaming','ストリーミング版'],['download','ダウンロード版'],['local','ローカルデバッグ版']]);
  assert.equal(blocked.length,0,'the published chooser creates no player or game request');
  await page.screenshot({path:out+'/public-edition-choice-'+width+'.png'});
  await page.locator('[data-edition-choice="download"]').click();
  await page.waitForFunction(()=>window.SweetsDownloadV255?.version===255,null,{timeout:60000});
  const download=await page.evaluate(()=>{const node=document.getElementById('download-v255-panel'),rect=node.getBoundingClientRect();return {state:window.SweetsDownloadV255.describe(),streaming:!!window.SweetsSharedMachine,roulette:!!window.SweetsDownloadRouletteV255.driver,overflow:document.documentElement.scrollWidth>innerWidth+1,panel:{left:rect.left,right:rect.right,width:rect.width},prepareDisabled:node.querySelector('[data-dl-action="prepare"]').disabled};});
  assert.equal(download.state.edition,'download');assert.equal(download.streaming,false);assert.equal(download.roulette,false);assert.equal(download.state.packageReady,false);assert.equal(download.prepareDisabled,true);
  assert.equal(download.overflow,false);assert.ok(download.panel.left>=-1&&download.panel.right<=width+1,'the published Download panel fits the viewport');
  assert.deepEqual(errors,[],'the published Download entry handles its unavailable server without uncaught errors');
  await page.screenshot({path:out+'/public-download-entry-'+width+'.png'});
  const url=new URL(base);url.searchParams.set('appv',appVersion);url.searchParams.set('edition','streaming');url.searchParams.set('verify',revision);
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
  assert.equal(current.tabsRevision,254);assert.equal(current.backgroundLogos,10);assert.equal(current.visibleBackgrounds,9);assert.equal(current.decodedBackgrounds,10);
  assert.equal(current.commonBetButtons,1);assert.equal(current.commonBetOutsideTabs,true);
  assert.equal(current.castellaRevision,250);assert.equal(current.castellaHoles,61);assert.equal(current.castellaEdges,84);
  assert.deepEqual(current.castellaSpecials,{pour:2,fire:2,sugar:1,odds:0});assert.equal(current.castellaPayoutRows,13);
  info.v250=current;
  assert.deepEqual(errors,[],'published frontend has no uncaught JavaScript errors');
  await page.screenshot({path:out+'/public-ready-'+width+'.png'});
  await page.evaluate(()=>document.querySelector('#tab9').click());
  await page.waitForFunction(()=>window.DangoBingo?.engine&&!window.DangoBingo.engine.liveBoard&&document.body.classList.contains('dgb-active')&&window.SweetsDemoSuite.status.kind==='dango',null,{timeout:10000});
  info.dango=await page.evaluate(async()=>{
   const e=window.DangoBingo.engine,R=window.DangoBingoRules,V=window.DangoBingoView,root=document.querySelector('.dgb-scene');await V.assetsReady;
   const art=V.describeAssets(),cssAssets=await Promise.all(['scene'].map(async name=>{const image=new Image();image.src='assets/dango-art-v252/'+name+'.webp';await image.decode();return {name,width:image.naturalWidth,height:image.naturalHeight};}));
   const backdrop=getComputedStyle(root,'::before'),surfaces=['.dgb-scene','.dgb-pan','.dgb-pay'].flatMap(selector=>['','::before','::after'].map(pseudo=>{const css=getComputedStyle(document.querySelector(selector),pseudo||null);return {selector,pseudo,background:css.backgroundImage,border:css.borderImageSource,opacity:css.opacity};}));
   // Render the shipped view/lesson using only the independent demonstration.
   // No engine mutation, session creation, BET or draw is required on Pages.
   const stateBefore=JSON.stringify(e.state),canvas=Object.assign(document.createElement('canvas'),{width:640,height:420}),c=canvas.getContext('2d'),calls={board:[],lesson:[]};let scope='board';
   const prototype=CanvasRenderingContext2D.prototype,native=prototype.drawImage;
   prototype.drawImage=function(image,...args){const source=image?.currentSrc||image?.src||'';if(/\/dango-art-v25[23]\//.test(source))calls[scope].push(source.split('/').at(-1).split('?')[0]);return native.call(this,image,...args);};
   let clear=0,painted=0;
   try{
    V.paint(c,e.state,{demo:true,age:Infinity,time:0},false);const pixels=c.getImageData(0,0,640,420).data;
    for(let i=3;i<pixels.length;i+=4){if(pixels[i]<24)clear++;if(pixels[i]>100)painted++;}
    scope='lesson';c.clearRect(0,0,640,420);window.SweetsAttractLessons.dango.draw(c,3,.9);
   }finally{prototype.drawImage=native;}
   const rectOf=node=>{const {x,y,width,height,top,right,bottom,left}=node.getBoundingClientRect();return {x,y,width,height,top,right,bottom,left};};
   const payoutBounds={panel:rectOf(root.querySelector('.dgb-pay')),rows:[...root.querySelectorAll('.dgb-pay tr')].map(row=>({length:Number(row.dataset.length)||null,rect:rectOf(row),cells:[...row.children].map((cell,column)=>({column,kind:cell.tagName.toLowerCase(),text:cell.textContent,rect:rectOf(cell)}))}))};
   const payCells=[...root.querySelectorAll('.dgb-pay td[data-valid="true"]')].map(td=>({length:Number(td.closest('tr').dataset.length),count:Number(td.dataset.count),highest:td.dataset.highestRole==='true',rainbowAnimation:getComputedStyle(td,'::before').animationName,win:td.textContent,font:getComputedStyle(td.querySelector('.gold-number')||td).fontFamily})),geometry=V.geometry(640,420,{state:e.state});
   const panRect=rectOf(root.querySelector('.dgb-pan')),mainGeometry=V.geometry(panRect.width,panRect.height,{state:e.state});
   const positions={scene:rectOf(root),pan:panRect,geometry:mainGeometry,payout:rectOf(root.querySelector('.dgb-pay')),free:rectOf(root.querySelector('.dgb-free-stat')),oldTopText:root.querySelectorAll('.dgb-status,.dgb-phase-label,.dgb-phase-value,.dgb-pay-title').length,invalidPayoutCells:root.querySelectorAll('.dgb-pay td:not([data-valid="true"])').length};
   const distance=(rect,point)=>{const x=panRect.x+point.x,y=panRect.y+point.y;return Math.hypot(x-Math.max(rect.left,Math.min(rect.right,x)),y-Math.max(rect.top,Math.min(rect.bottom,y)));};
   positions.minimumPayoutClearance=Math.min(...payoutBounds.rows.flatMap(row=>row.cells.flatMap(cell=>mainGeometry.centers.map(point=>distance(cell.rect,point)))));
   positions.minimumFreeClearance=Math.min(...mainGeometry.centers.map(point=>distance(positions.free,point)));
   const payRowLabels=[...root.querySelectorAll('.dgb-pay tbody .dgb-line-name')].map(label=>label.textContent),freeGrants=[...root.querySelectorAll('.dgb-pay tbody .dgb-free-grant')].map(label=>({text:label.textContent,visible:getComputedStyle(label).display!=='none'})),payBackgrounds=[...root.querySelectorAll('.dgb-pay tbody tr')].map(row=>({length:Number(row.dataset.length),row:getComputedStyle(row).backgroundColor,cell:getComputedStyle(row.querySelector('td')).backgroundColor}));
   return {revision:R.REVISION,highestRoleMinimums:R.highestRoleMinimums,liveBoard:e.liveBoard,cells:e.state.cells.length,rows:Array.from({length:7},(_,row)=>e.state.cells.filter(cell=>cell.row===row).length),numbers:e.state.numbers,initialFree:e.state.initialFreeCells,lines:R.linesFor(e.state).length,payRows:root.querySelectorAll('.dgb-pay tbody tr').length,payCells,payoutBounds,payRowLabels,freeGrants,payBackgrounds,positions,paytableHundredths:[2,3,4,5,6,7].map(length=>R.tiersFor(e.state)[length].slice(1)),validInitialFree:R.isValidInitialFree(e.state.initialFreeCells),initialCompletedLines:R.gradeLines.filter(line=>line.cells.every(id=>e.state.initialFreeCells.includes(id))).length,lineColors:{2:V.lineColors[2],3:V.lineColors[3]},payHeaders:[...root.querySelectorAll('.dgb-pay thead th')].map(th=>th.textContent),buttons:root.querySelectorAll('.dgb-cell').length,confirmButtons:root.querySelectorAll('[data-action="confirm"]').length,oddsByPay:!!root.querySelector('.dgb-pay .dgb-pay-odds .dgb-odds-value'),oddsHidden:root.querySelector('.dgb-pay-odds').hidden,freeRemainingLabel:root.querySelector('.dgb-free-value').textContent,demo:window.SweetsDemoSuite.status.kind,odds:e.state.oddsMultiplier,art,cssAssets,backdrop:{image:backdrop.backgroundImage,opacity:Number(backdrop.opacity),display:backdrop.display},surfaces,probe:{calls,painted,clearFraction:clear/(640*420),stateUnchanged:stateBefore===JSON.stringify(e.state),geometry}};
  });
  report.currentScreen={width,height,...info};
  assert.equal(info.dango.revision,268);assert.equal(info.dango.liveBoard,false);assert.equal(info.dango.cells,28);assert.deepEqual(info.dango.rows,[1,2,3,4,5,6,7]);assert.equal(info.dango.lines,15);assert.equal(info.dango.payRows,6);assert.equal(info.dango.payCells.length,18);assert.equal(info.dango.buttons,28);
  assert.deepEqual(info.dango.highestRoleMinimums,{4:3,5:3,6:2,7:2});
  assert.deepEqual(info.dango.payCells.filter(cell=>cell.highest).map(cell=>[cell.length,cell.count]),[[4,3],[5,3],[6,2],[6,3],[7,2],[7,3]]);
  for(const cell of info.dango.payCells.filter(cell=>cell.highest))assert.equal(cell.rainbowAnimation,'dgb-pay-rainbow');
  assert.deepEqual(info.dango.payHeaders.slice(1),['1本','2本','3本']);assert.equal(info.dango.confirmButtons,0);assert.equal(info.dango.oddsByPay,true);assert.equal(info.dango.oddsHidden,true,'ODDS 1 is hidden');
  assert.deepEqual(info.dango.paytableHundredths,[[0,20,1000],[20,80,2000],[40,120,5000],[80,300,10000],[150,3000,50000],[200,5000,200000]]);
  assert.equal(info.dango.payCells.find(cell=>cell.length===2&&cell.count===1).win,'-','zero payout is displayed as a dash');
  for(const cell of info.dango.payCells){assert.match(cell.font,/ArcadePayout/);assert.doesNotMatch(cell.win,/[,，]/);}
  assertPayoutContained(info.dango.payoutBounds);
  assert.deepEqual(info.dango.payRowLabels,['2個ライン','3個ライン','4個ライン','5個ライン','6個ライン','7個ライン']);
  assert.deepEqual(info.dango.freeGrants,[2,3,4,5,6,7].map(length=>({text:'FREE×'+length,visible:true})));
  assert.deepEqual(info.dango.lineColors,{2:'#269eff',3:'#4ee3f5'});assert.equal(info.dango.freeRemainingLabel,'あと 1個');
  assert.equal(info.dango.validInitialFree,true);assert.equal(info.dango.initialCompletedLines,0);
  assert.equal(info.dango.positions.oldTopText,0);assert.equal(info.dango.positions.invalidPayoutCells,0);
  const {scene,payout,free,pan,geometry:mainGeometry}=info.dango.positions;
  assert.ok(payout.left<scene.left+scene.width*.08&&payout.top<scene.top+scene.height*.1,'published payout sits in the upper left');
  assert.ok(payout.right<=scene.right+1&&payout.bottom<=scene.bottom+1,'published payout fits inside its scene');
  assert.ok(free.left>=scene.left-1&&free.top>=scene.top-1&&free.right<=scene.right+1&&free.bottom<=scene.bottom+1,'published FREE controls fit inside their scene');
  assert.ok(info.dango.positions.minimumPayoutClearance>=mainGeometry.radius-.75,'published payout avoids every dango');
  assert.ok(info.dango.positions.minimumFreeClearance>=mainGeometry.radius-.75,'published FREE controls avoid every dango');
  assert.ok(mainGeometry.centers.every(point=>point.x-mainGeometry.radius>=-.75&&point.x+mainGeometry.radius<=pan.width+.75&&point.y-mainGeometry.radius>=-.75&&point.y+mainGeometry.radius<=pan.height+.75),'all 28 published dango fit the canvas');
  for(const row of info.dango.payBackgrounds){const bg=[row.cell,row.row].find(color=>color&&!color.endsWith(', 0)')&&color!=='transparent'),rgb=bg?.match(/[\d.]+/g)?.slice(0,3).map(Number);assert.ok(rgb&&Math.max(...rgb)<110,'published payout uses a dark tinted background');}
  assert.equal(info.dango.numbers.length,28);assert.deepEqual(info.dango.numbers.filter(n=>n>0),Array.from({length:25},(_,i)=>i+1));assert.equal(info.dango.numbers.filter(n=>n===0).length,3);assert.equal(info.dango.initialFree.length,3);assert.ok(info.dango.initialFree.every(id=>info.dango.numbers[id]===0));assert.equal(info.dango.odds,1);
  assert.equal(info.dango.art.revision,253);assert.equal(info.dango.art.presentationRevision,268);assert.equal(info.dango.art.ready,true);assert.deepEqual(info.dango.art.failed,[]);
  assert.deepEqual(info.dango.art.images.map(image=>image.key).sort(),['green','pink','rainbow','skewer','stand','white','yellow']);
  for(const image of info.dango.art.images){assert.equal(image.loaded,true);assert.ok(image.width>=64&&image.height>=16);assert.match(image.url,/\/dango-art-v25[23]\//);const version=['white','skewer'].includes(image.key)?252:253;assert.ok(image.url.includes('/dango-art-v'+version+'/'));}
  for(const image of info.dango.cssAssets)assert.ok(image.width>=256&&image.height>=256);
  assert.match(info.dango.backdrop.image,/dango-art-v252\/scene\.webp/);assert.ok(info.dango.backdrop.opacity>=.65);assert.notEqual(info.dango.backdrop.display,'none');
  assert.ok(info.dango.probe.painted>1000);assert.ok(info.dango.probe.clearFraction>.2,'generated scene remains visible through the main canvas');assert.equal(info.dango.probe.stateUnchanged,true);
  const geometry=info.dango.probe.geometry,diameter=geometry.radius*2;
  assert.ok(Math.abs(geometry.centers[2].x-geometry.centers[1].x-diameter)<.01,'horizontal neighbors follow the triangular lattice');
  assert.ok(Math.abs(geometry.centers[1].y-geometry.centers[0].y-Math.sqrt(3)*diameter/2)<.01,'rows use the equilateral-triangle height');
  assert.ok(Math.abs(Math.hypot(geometry.centers[1].x-geometry.centers[0].x,geometry.centers[1].y-geometry.centers[0].y)-diameter)<.01,'diagonal neighbors are one dango diameter apart');
  assert.ok(info.dango.probe.calls.board.includes('dango-white.webp'),'published board uses generated white dango');assert.ok(info.dango.probe.calls.board.includes('tsukimi-stand.webp'),'published dango sit on the generated offering stand');
  assert.ok(info.dango.probe.calls.lesson.includes('dango-rainbow.webp'));assert.ok(info.dango.probe.calls.lesson.includes('bamboo-skewer.webp'),'published lesson uses generated bamboo');
  assert.deepEqual(errors,[],'published Dango initialization has no uncaught errors');
  info.results=await page.evaluate(async()=>{
   const assets=await Promise.all(['result-frame','sweets-wipe'].map(async name=>{const image=new Image();image.src='assets/results-art-v253/'+name+'.webp?v=253';await image.decode();return {name,width:image.naturalWidth,height:image.naturalHeight};}));
   return {installed:typeof window.SweetsResultsV253?.describe==='function',stylesheet:[...document.styleSheets].some(sheet=>sheet.href?.includes('sweets-results-v253.css')),assets,resultHidden:document.getElementById('round-result-layer').hidden};
  });
  assert.equal(info.results.installed,true);assert.equal(info.results.stylesheet,true);assert.equal(info.results.resultHidden,true);
  assert.equal(info.results.assets.length,2);for(const asset of info.results.assets)assert.ok(asset.width>0&&asset.height>0);
  assert.deepEqual(errors,[],'published result module initializes without errors');
  await page.waitForFunction(()=>window.SugarChallengeRulesV254?.REVISION===268&&window.SweetsSugarChallengeV254?.version===254&&document.querySelector('.sc254-overlay'),null,{timeout:10000});
  info.sugar=await page.evaluate(async()=>{
   const R=window.SugarChallengeRulesV254,ui=window.SweetsSugarChallengeV254,assets=await Promise.all(['scale','bottle','jpc-title'].map(async name=>{const image=new Image();image.src='assets/sugar-art-v254/'+name+'.webp?v=254';await image.decode();return {name,width:image.naturalWidth,height:image.naturalHeight};}));
   await Promise.all([...document.querySelectorAll('.sc254-overlay img,.sc254-celebration img,.sc254-dock img')].map(image=>image.decode()));
   await window.SweetsArcadeTabsV249.reachFrameReady;
   const tabs=window.SweetsArcadeTabsV249.describe(),overlay=document.querySelector('.sc254-overlay'),dock=document.querySelector('.sc254-dock');
   return {revision:R.REVISION,ui:ui.describe(),stylesheet:[...document.styleSheets].some(sheet=>sheet.href?.includes('sugar-challenge-v254.css')),overlayHidden:overlay.hidden,dockHidden:dock.hidden,dockParent:dock.parentElement.id,assets,
    cards:R.cards.map(card=>({id:card.id,lowMax:card.lowMax,highMin:card.highMin,luckySums:card.luckySums.slice()})),reachFrame:tabs.reachFrame,
    reachPopups:[...document.querySelectorAll('.v250-reach-pop')].map(node=>({game:node.dataset.gameKind,image:getComputedStyle(node,'::before').backgroundImage,hidden:node.hidden,numberNodes:node.querySelectorAll('small').length})),
    serverRouletteInstalled:!!window.SweetsSugarRouletteV254};
  });
  assert.equal(info.sugar.revision,268);assert.equal(info.sugar.ui.version,254);assert.equal(info.sugar.ui.challenge,null);assert.equal(info.sugar.ui.bankCount,0);assert.equal(info.sugar.ui.artLoaded,true);
  assert.equal(info.sugar.stylesheet,true);assert.equal(info.sugar.overlayHidden,true);assert.equal(info.sugar.dockHidden,true);assert.equal(info.sugar.dockParent,'cookie-roulette');
  assert.equal(info.sugar.serverRouletteInstalled,false,'published player does not install a second local roulette');
  assert.equal(info.sugar.assets.length,3);for(const asset of info.sugar.assets)assert.ok(asset.width>=100&&asset.height>=100,'published '+asset.name+' artwork decodes');
  assert.deepEqual(info.sugar.cards.map(card=>card.id),['standard','lucky','wide']);
  for(const card of info.sugar.cards)for(const sum of card.luckySums)assert.ok(sum>card.lowMax&&sum<card.highMin,'lucky final sums are outside the two JPC tail intervals');
  assert.equal(info.sugar.reachFrame.loaded,true);assert.ok(info.sugar.reachFrame.width>=300&&info.sugar.reachFrame.height>=100);
  assert.equal(info.sugar.reachPopups.length,10);for(const pop of info.sugar.reachPopups){assert.match(pop.image,/reach-art-v254\/reach-common\.webp/);assert.equal(pop.hidden,true);assert.equal(pop.numberNodes,0);}
  assert.deepEqual(errors,[],'published Sugar and reach modules initialize without errors');
  await page.screenshot({path:out+'/public-dango-ready-'+width+'.png'});
  report.screens.push({width,height,...info,chooser,download,blockedServiceRequests:blocked,blockedWebSockets:sockets,pageErrors:errors});
  report.currentScreen=null;
  await context.close();
 }
}catch(error){
 report.failure={message:String(error),stack:error.stack};
 await fs.writeFile(out+'/partial-result.json',JSON.stringify(report,null,2)+'\n');
 throw error;
}finally{await browser.close();}
await fs.writeFile(out+'/public-deployment.json',JSON.stringify(report,null,2)+'\n');
console.log('SIXDROP_PUBLIC_V248_READ_ONLY_PASS',JSON.stringify(report));
console.log('ARCADE_PUBLIC_V249_READ_ONLY_PASS',JSON.stringify({revision,appVersion,verifiedFiles:files.length,logos:gameKinds.length,viewports:report.screens.map(screen=>({width:screen.width,height:screen.height,landscape:screen.arcade.landscape,loadedLogos:screen.arcade.brand.loaded,pageErrors:screen.pageErrors.length}))}));
console.log('ARCADE_PUBLIC_V250_READ_ONLY_PASS',JSON.stringify({revision,appVersion,verifiedFiles:files.length,viewports:report.screens.map(screen=>({width:screen.width,height:screen.height,...screen.v250,pageErrors:screen.pageErrors.length}))}));
console.log('DANGO_PUBLIC_V268_READ_ONLY_PASS',JSON.stringify({revision,appVersion,verifiedFiles:files.length,viewports:report.screens.map(screen=>({width:screen.width,height:screen.height,cells:screen.dango.cells,lines:screen.dango.lines,decodedSprites:screen.dango.art.images.length,highestCells:screen.dango.payCells.filter(cell=>cell.highest).length,backgroundOpacity:screen.dango.backdrop.opacity,clearCanvasFraction:screen.dango.probe.clearFraction,pageErrors:screen.pageErrors.length}))}));
console.log('SUGAR_PUBLIC_V268_READ_ONLY_PASS',JSON.stringify({revision,appVersion,verifiedFiles:files.length,viewports:report.screens.map(screen=>({width:screen.width,height:screen.height,rulesRevision:screen.sugar.revision,decodedSugarAssets:screen.sugar.assets.length,reachFrameDecoded:screen.sugar.reachFrame.loaded,overlayHidden:screen.sugar.overlayHidden,publicGameplayActions:0,pageErrors:screen.pageErrors.length}))}));
console.log('DOWNLOAD_PUBLIC_V255_READ_ONLY_PASS',JSON.stringify({revision,appVersion,verifiedFiles:files.length,viewports:report.screens.map(screen=>({width:screen.width,height:screen.height,editionChoices:screen.chooser.options.map(option=>option.name),downloadEntry:screen.download.state.edition,publicGameplayActions:0,pageErrors:screen.pageErrors.length}))}));

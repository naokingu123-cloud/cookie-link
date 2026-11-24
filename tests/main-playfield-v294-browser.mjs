/* CI-only measurements of the real ten-game cabinet. The test server exposes
 * read-only lexical references; A/B changes only the new presentation sheet.
 * Native UI starts the round. No engine, RNG, draw, payout or clock is replaced. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';

const root=process.cwd(),output='qa-main-playfield-v294';
const version=JSON.parse(await fs.readFile('app-version.json','utf8')).version;
const games=['cookie','choco','candy','gelato','winery','popcorn','jelly','stick','castella','dango'];
const phoneSizes={320:[320,568],390:[390,844],430:[430,932]};
const group=process.env.MAIN294_VIEWPORT||'all';
assert(group==='all'||Object.hasOwn(phoneSizes,group),'MAIN294_VIEWPORT must be all, 320, 390 or 430');
const selected=Object.entries(phoneSizes).filter(([width])=>group==='all'||group===width);
const scenarios=selected.flatMap(([group,[width,height]])=>[
 {id:group+'-portrait',group,width,height,mobile:true,portrait:true,insets:{top:0,right:0,bottom:0,left:0}},
 {id:group+'-landscape',group,width:height,height:width,mobile:true,portrait:false,insets:{top:0,right:0,bottom:0,left:0}},
 {id:group+'-landscape-notch',group,width:height,height:width,mobile:true,portrait:false,insets:{top:0,right:44,bottom:21,left:44}},
 ...(group==='390'?[{id:'desktop',group,width:1366,height:900,mobile:false,portrait:false,insets:{top:0,right:0,bottom:0,left:0}}]:[])
]);
assert.equal(scenarios.length,group==='all'?10:group==='390'?4:3);
if(process.argv.includes('--list-cases')){
 console.log(JSON.stringify({group,games,scenarios,plannedCaseCount:scenarios.length*games.length}));process.exit(0);
}

const report={version,group,plannedCaseCount:scenarios.length*games.length,plannedScenarios:scenarios,scope:'Real all-ten local manual round; zero draws; only main-playfield-v294.css disabled/enabled for comparison',cases:[],failures:[],pageErrors:[],assetFailures:[],apiRequests:[],externalRequests:[]};
await fs.mkdir(output,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.svg':'image/svg+xml','.mp3':'audio/mpeg','.wav':'audio/wav','.avif':'image/avif'};
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1');
 if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/ws')){report.apiRequests.push(url.pathname);res.writeHead(451).end();return;}
 const file=path.resolve(root,'.'+decodeURI(url.pathname==='/'?'/index.html':url.pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 try{
  let body=await fs.readFile(file);
  if(file.endsWith('/assets/award-presentation-v277.js'))body=Buffer.concat([body,Buffer.from('\n;window.__qa294={app,slots,select,scheduleUI,sixLayout,sixXY,get active(){return active;}};\n')]);
  res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream','cache-control':'no-store'}).end(body);
 }catch{res.writeHead(404).end();}
});
server.listen(0,'127.0.0.1');await once(server,'listening');
const base='http://127.0.0.1:'+server.address().port;
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let browser,context,page,cdp,current='boot',stateHash;

// Presentation clocks, cached artwork and selected tabs are outside this
// projection. Native boards, numbers, bets and all settled awards are inside.
function logicalSnapshot(){
 const q=__qa294,a=q.app;
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
 const fields=['version','seed','processed','accepted','running','roundBet','totalHundredths','allClears','maxLink','maxChain','roundSteps','roundHammers','roundCleared','roundsCleared','lines','triangles','hexagons','depth','startDepth','progressiveUnits','removedTotal','wonderCollected','wonderToken','board','strata','pyramid','state','numbers','cells','grid','drawn','seen','drills','lucky','nodeNumbers','faceGrades','pattern','patternTransform','hits','links','filled','collectorCounts','collectorMult','countMult','glasses','fullCount','mixCount','countMultiplier','mixMultiplier','power','totalPoured','wasted','sugarTarget','sugarAwarded','allComplete'];
 return {phase:a.phase,token:a.token,credit:a.credit,totalWin:a.totalWin,bets:[...a.bets],locked:[...a.locked],roundWins:[...a.roundWins],paid:[...a.paid],enabled:[...a.enabled],draws:[...a.draws],wonderBank:plain(a.wonderBank),engines:q.slots.map(s=>{
  const item={game:s.engine.kind||'cookie'};for(const field of fields){const value=plain(s.engine[field]);if(value!==undefined)item[field]=value;}return item;
 })};
}

function inspect(){
 const q=__qa294,slot=q.slots[q.active],kind=slot.engine.kind||'cookie';
 const rect=node=>{const r=node.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
 const visible=node=>{
  if(!node?.isConnected)return false;
  for(let n=node;n instanceof Element;n=n.parentElement){const s=getComputedStyle(n);if(n.hidden||s.display==='none'||s.visibility==='hidden'||Number(s.opacity)===0)return false;}
  const r=node.getBoundingClientRect();return r.width>1&&r.height>1;
 };
 const metric=node=>({bounds:rect(node),clientWidth:node.clientWidth,clientHeight:node.clientHeight,offsetWidth:node.offsetWidth,offsetHeight:node.offsetHeight});
 const game=document.querySelector('#screen>.game'),field=game.querySelector(':scope>.field');
 const boardSelector={choco:'.choco-canvas',candy:'.carnival-canvas',gelato:'.gp-raster-board',winery:'.wp-canvas',popcorn:'.pc-scene',jelly:'.jb-scene',stick:'.bs-grid canvas',castella:'.pct-pan>canvas',dango:'.dgb-pan>canvas'};
 const board=kind==='cookie'?slot.board:slot.panel.querySelector(boardSelector[kind]);
 if(!board)throw Error('Missing actual '+kind+' board');
 const payoutSelector={cookie:'#odds-panel',candy:'#carnival-odds',gelato:'.gp-collector-panel',winery:'.wp-sidebar',stick:'.bs-pay',castella:'.pct-pay',dango:'.dgb-pay'};
 const combined=['choco','popcorn','jelly'].includes(kind);
 const payout=combined?board:(['cookie','candy'].includes(kind)?document.querySelector(payoutSelector[kind]):slot.panel.querySelector(payoutSelector[kind]));
 if(!payout)throw Error('Missing actual '+kind+' payout');
 const scene={game:metric(game),field:metric(field),panel:metric(slot.panel),board:metric(board),payout:{...metric(payout),combinedCanvas:combined},tabs:metric(document.querySelector('#screen>.games-deck')),console:metric(document.getElementById('console')),screen:metric(document.getElementById('screen'))};
 const geometry={field:[field.clientWidth,field.clientHeight],panel:[slot.panel.clientWidth,slot.panel.clientHeight],board:[board.clientWidth,board.clientHeight],payout:[payout.clientWidth,payout.clientHeight]};
 const normalize=node=>{
  const r=rect(node),b=rect(board);return {left:(r.left-b.left)/b.width,top:(r.top-b.top)/b.height,width:r.width/b.width,height:r.height/b.height};
 };
 if(kind==='cookie')geometry.cells=[...slot.tiles].map(([id,el])=>({id,left:el.style.left,top:el.style.top,width:el.offsetWidth,height:el.offsetHeight})).sort((a,b)=>a.id-b.id);
 if(kind==='candy'){const grid=slot.engine.pyramid||[],rows=grid.length||10;geometry.triangle={layout:q.sixLayout(rows),centers:grid.flatMap((row,r)=>row.map((_,c)=>q.sixXY(r,c,rows)))};}
 if(kind==='gelato')geometry.centers=Array.from({length:GelatoPrism.geometry.nodes},(_,id)=>GelatoPrism.hitGeometryV276(board.clientWidth,board.clientHeight,false,{type:'node',id}));
 if(kind==='popcorn')geometry.centers=PopcornEngine.cells.map((_,id)=>PopcornView.hitGeometryV276(board.clientWidth,board.clientHeight,false,{type:'cell',id}));
 if(kind==='jelly')geometry.centers=Array.from({length:25},(_,id)=>JellyView.hitGeometryV276(board.clientWidth,board.clientHeight,false,{type:'cell',id}));
 if(kind==='castella')geometry.pan=PartyCastellaView.geometry(slot.engine.state);
 if(kind==='dango')geometry.mochi=DangoBingoView.geometry(board.clientWidth,board.clientHeight,{state:slot.engine.state});
 geometry.hitTargets=[...slot.panel.querySelectorAll('.dgb-cell,.pct-anchors button')].filter(visible).map(node=>({id:node.dataset.cellId||node.dataset.cell||node.dataset.zone||'',...normalize(node)}));
 let pixels=null;
 if(board instanceof HTMLCanvasElement){
  const cv=document.createElement('canvas');cv.width=cv.height=72;const ctx=cv.getContext('2d',{willReadFrequently:true});ctx.drawImage(board,0,0,72,72);
  const data=ctx.getImageData(0,0,72,72).data,colors=new Set();let opaque=0;
  for(let i=0;i<data.length;i+=4)if(data[i+3]>24){opaque++;colors.add((data[i]>>4)+','+(data[i+1]>>4)+','+(data[i+2]>>4));}
  pixels={opaque,colors:colors.size,backingWidth:board.width,backingHeight:board.height};
 }
 const cookieImages=kind==='cookie'?[...board.querySelectorAll('.cookie-face')].map(img=>({loaded:img.complete&&img.naturalWidth>0})):[];
 const payoutText=combined?[]:[...payout.querySelectorAll('.payout-number,.gp-fit-amount,.wp-pay-row b,.bs-block:not(.bs-incoming) span,.pct-win-value,.dgb-pay td')].filter(visible).map(node=>node.textContent.trim()).filter(Boolean);
 const amountFit=[...payout.querySelectorAll('.gp-fit-amount,.payout-number>.gold-number')].filter(visible).map(node=>({text:node.textContent,bounds:rect(node),bay:rect(node.parentElement)}));
 const probe=document.getElementById('qa-safe-area-v294'),safeStyle=getComputedStyle(probe),viewportStyle=getComputedStyle(document.getElementById('viewport'));
 const safe=Object.fromEntries(['top','right','bottom','left'].map(side=>[side,parseFloat(safeStyle.getPropertyValue('padding-'+side))||0]));
 const padding=Object.fromEntries(['top','right','bottom','left'].map(side=>[side,parseFloat(viewportStyle.getPropertyValue('padding-'+side))||0]));
 const lessonLayers=[...field.querySelectorAll(':scope>.ds91-lesson,:scope>.ds139-story')].filter(visible).map(n=>n.className);
 const styles=getComputedStyle(game),trim=getComputedStyle(game,'::before');
 return {kind,phase:q.app.phase,mobile:document.body.classList.contains('mobile-view'),landscape:document.body.classList.contains('mobile-landscape'),width:innerWidth,height:innerHeight,documentWidth:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth),safe,padding,scene,geometry,pixels,cookieImages,payoutText,amountFit,lessonLayers,boardVisible:visible(board),payoutVisible:visible(payout),selected:q.slots.filter(s=>s.tab.getAttribute('aria-selected')==='true').map(s=>s.engine.kind||'cookie'),shell:{transform:styles.transform,paddingLeft:styles.paddingLeft,paddingRight:styles.paddingRight,marginBottom:styles.marginBottom,trimInset:[trim.top,trim.right,trim.bottom,trim.left],trimWidth:trim.borderImageWidth}};
}

async function settle(ms=180){await sleep(ms);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
async function select(kind){await page.evaluate(kind=>{const q=__qa294;q.select(q.slots.findIndex(s=>(s.engine.kind||'cookie')===kind));q.scheduleUI(q.app);},kind);await settle(280);}
async function sheet(enabled){
 await page.evaluate(enabled=>{const links=[...document.querySelectorAll('link[rel="stylesheet"]')].filter(n=>new URL(n.href).pathname.endsWith('/assets/main-playfield-v294.css'));if(links.length!==1||!links[0].sheet)throw Error('Exactly one loaded v294 presentation sheet is required');links[0].sheet.disabled=!enabled;},enabled);
 await settle();
}
async function open(scenario){
 context=await browser.newContext({viewport:{width:scenario.width,height:scenario.height},hasTouch:scenario.mobile,serviceWorkers:'block'});
 await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin!==base){report.externalRequests.push(u.href);return route.abort();}return route.continue();});
 page=await context.newPage();page.on('pageerror',error=>report.pageErrors.push(String(error.stack||error)));
 page.on('response',response=>{const u=new URL(response.url());if(response.status()>=400&&/^\/(assets|optimized)\//.test(u.pathname))report.assetFailures.push({path:u.pathname,status:response.status()});});
 cdp=await context.newCDPSession(page);
 await page.goto(base+'/?edition=local&set=all&appv='+encodeURIComponent(version),{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__qa294&&window.SweetsLocalDebugV258?.ready&&window.CookieBoardV293&&window.CookiePayoutV293,null,{timeout:90000});
 await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([CookieBoardV293.ready,CookiePayoutV293.ready,window.CookieAwardV293?.ready,window.PopcornView?.assetsReady,window.DangoBingoView?.assetsReady]);const probe=document.createElement('div');probe.id='qa-safe-area-v294';probe.style.cssText='position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';document.body.append(probe);});
 await page.locator('#manual-number-toggle').click();
 await page.waitForFunction(()=>SweetsLocalDebugV258.describe().manualNumbers&&__qa294.app.phase==='ready');
 const setup=await page.evaluate(()=>{const q=__qa294;if(!SweetsLocalDebugV258.setBets(q.app.bets.map(()=>30000)))throw Error('Native virtual bet setup failed');return q.slots.map(s=>s.engine.kind||'cookie');});
 assert.deepEqual(setup,games,'all ten actual native games are present');
 await page.locator('#manual-start').click();
 await page.waitForFunction(()=>__qa294.app.phase==='playing'&&__qa294.app.engines.every(e=>!e.opening&&!e.busy&&e.idle!==false&&!e.queue?.length),null,{timeout:90000});
 for(const game of games)await select(game);
 const state=await page.evaluate(logicalSnapshot);assert.equal(state.phase,'playing');assert.deepEqual(state.draws,[]);assert(state.enabled.every(Boolean));assert(state.locked.every(bet=>bet===30000));stateHash=digest(state);
}
function near(actual,expected,label,tolerance=.65){assert(Math.abs(actual-expected)<=tolerance,label+': '+actual+' vs '+expected);}
function contained(inner,outer,label,tolerance=1.25){assert(inner.left>=outer.left-tolerance&&inner.right<=outer.right+tolerance&&inner.top>=outer.top-tolerance&&inner.bottom<=outer.bottom+tolerance,label+': '+JSON.stringify({inner,outer}));}
function rounded(value){if(typeof value==='number')return Math.round(value*1e5)/1e5;if(Array.isArray(value))return value.map(rounded);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,rounded(v)]));return value;}
function compare(before,after,scenario,label){
 assert.equal(after.kind,label.split('/').at(-1));assert.equal(after.phase,'playing');assert.deepEqual(after.selected,[after.kind]);
 assert.equal(after.mobile,scenario.mobile);assert.equal(after.landscape,scenario.mobile&&!scenario.portrait);
 assert.deepEqual(after.lessonLayers,[],'inspecting real boards, not occluded BET explanations');
 assert(after.boardVisible&&after.payoutVisible,label+': actual board and payout are visible');
 assert(after.documentWidth<=scenario.width+2,label+': no horizontal page overflow');
 for(const side of ['top','right','bottom','left']){near(after.safe[side],scenario.insets[side],label+' emulated safe '+side,.01);near(after.padding[side],scenario.insets[side],label+' native safe padding '+side,.01);}
 const safe={left:after.safe.left,right:after.width-after.safe.right,top:after.safe.top,bottom:after.height-after.safe.bottom};
 contained(after.scene.game.bounds,safe,label+' game inside viewport safe area');
 contained(after.scene.board.bounds,after.scene.game.bounds,label+' board inside game');
 contained(after.scene.payout.bounds,after.scene.game.bounds,label+' payout inside game');
 contained(after.scene.console.bounds,safe,label+' ledger inside viewport safe area');
 assert(after.scene.game.bounds.bottom<=after.scene.console.bounds.top+1.25,label+': enlarged game clears BET/WIN/CREDIT');
 if(scenario.mobile&&scenario.portrait)assert(after.scene.tabs.bounds.bottom<=after.scene.game.bounds.top+1.25,label+': game clears game-selection deck');
 assert.deepEqual(rounded(after.geometry),rounded(before.geometry),label+': native inner geometry and input targets survive the CSS A/B');
 assert.deepEqual(after.payoutText,before.payoutText,label+': exact live payout text is preserved');
 assert(!after.payoutText.some(text=>/NaN|Infinity|undefined/.test(text)),label+': finite payout values');
 if(after.pixels){assert(after.pixels.opaque>60&&after.pixels.colors>8,label+': real canvas contains rendered artwork');}
 else assert(after.cookieImages.length>0&&after.cookieImages.every(image=>image.loaded),label+': real Cookie cells are loaded');
 for(const amount of after.amountFit)assert(amount.bounds.left>=amount.bay.left-1.25&&amount.bounds.right<=amount.bay.right+1.25,label+': exact payout digits fit their own bay: '+amount.text);
 const growth=Object.fromEntries(['field','board','payout'].map(name=>[name,after.scene[name].bounds.width/before.scene[name].bounds.width]));
 if(scenario.portrait){
  const scale=478/(after.kind==='winery'?440:438),safeWidth=safe.right-safe.left;
  near(after.scene.game.bounds.width,safeWidth*478/480,label+' near-edge shell');
  near(after.scene.game.bounds.left,safe.left+safeWidth/480,label+' left edge');
  near(after.scene.game.bounds.right,safe.right-safeWidth/480,label+' right edge');
  near(after.scene.field.clientWidth,after.kind==='winery'?432:430,label+' preserved native field',.01);
  near(after.scene.game.clientHeight,before.scene.game.clientHeight,label+' native shell height',.01);
  for(const name of ['field','board','payout']){
   assert(growth[name]>=1.08,label+': '+name+' is at least 8% larger');
   near(growth[name],scale,label+' '+name+' width scale',.002);
   near(after.scene[name].bounds.height/before.scene[name].bounds.height,scale,label+' '+name+' uniform height scale',.002);
  }
  assert(after.scene.field.bounds.left-safe.left<=6.5&&safe.right-after.scene.field.bounds.right<=6.5,label+': actual board/paytable field approaches the phone edges');
  assert.deepEqual(after.shell.trimInset,['0px','0px','0px','0px'],label+': ornate frame stays inside shell');
 }else{
  for(const name of ['game','field','board','payout','tabs','console'])for(const dim of ['left','top','width','height'])near(after.scene[name].bounds[dim],before.scene[name].bounds[dim],label+' unchanged '+name+' '+dim,.15);
 }
 return {growth,outerGutters:{left:after.scene.game.bounds.left-safe.left,right:safe.right-after.scene.game.bounds.right},fieldGutters:{left:after.scene.field.bounds.left-safe.left,right:safe.right-after.scene.field.bounds.right}};
}

try{
 browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{}),args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 let openKey=null;
 for(const scenario of scenarios){
  const key=scenario.mobile?'phone-'+scenario.group:'desktop';
  if(key!==openKey){await context?.close();context=page=cdp=null;current=scenario.id+'/boot';await open(scenario);openKey=key;}
  await cdp.send('Emulation.setSafeAreaInsetsOverride',{insets:scenario.insets});
  await page.setViewportSize({width:scenario.width,height:scenario.height});
  await page.evaluate(()=>window.dispatchEvent(new Event('resize')));await settle(280);
  for(const game of games){
   current=scenario.id+'/'+game;const started=Date.now();let before,after;
   try{
    await select(game);await sheet(false);before=await page.evaluate(inspect);
    await sheet(true);after=await page.evaluate(inspect);
    const evidence=compare(before,after,scenario,current);
    const state=await page.evaluate(logicalSnapshot);assert.equal(digest(state),stateHash,current+': layout and selection preserve all boards, numbers, bets and payouts');
    const screenshot=scenario.id+'-'+game+'.png';await page.screenshot({path:path.join(output,screenshot)});
    report.cases.push({id:current,status:'passed',durationMs:Date.now()-started,screenshot,stateHash,before,after,...evidence});
    console.log('MAIN_PLAYFIELD_V294_CASE_PASS',current,JSON.stringify(evidence));
   }catch(error){
    const failure={id:current,error:String(error.stack||error),before,after};report.failures.push(failure);console.error('MAIN_PLAYFIELD_V294_CASE_FAIL',current,failure.error);
    try{await page.screenshot({path:path.join(output,current.replaceAll('/','-')+'-failure.png')});}catch{}
    try{failure.surface=await page.evaluate(inspect);}catch{}
    await sheet(true);
   }
   await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
  }
 }
 assert.equal(report.cases.length,report.plannedCaseCount,'every selected viewport/game case passed');
 assert.deepEqual(report.failures,[]);assert.deepEqual(report.pageErrors,[],'no uncaught errors');assert.deepEqual(report.assetFailures,[],'all requested assets load');assert.deepEqual(report.apiRequests,[],'local layout test makes no server calls');assert.deepEqual(report.externalRequests,[],'isolated test makes no external calls');
 report.ok=true;console.log('MAIN_PLAYFIELD_V294_BROWSER_PASS',JSON.stringify({group,cases:report.cases.length}));
}catch(error){
 report.ok=false;report.fatal={id:current,error:String(error.stack||error)};console.error('MAIN_PLAYFIELD_V294_BROWSER_FAIL',report.fatal.error);process.exitCode=1;
 if(page)try{await page.screenshot({path:path.join(output,'fatal.png')});}catch{}
}finally{
 await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
 await browser?.close();await new Promise(resolve=>server.close(resolve));
}

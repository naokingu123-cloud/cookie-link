/* Isolated local edition. The only source extension exposes existing lexical
 * references to the test. Actual physical HITs and controlled UI records are
 * reported separately; no public API or server wallet is contacted. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {once} from 'node:events';
import {chromium} from 'playwright';

const root=process.cwd(),output=process.env.SWEETS_QA_OUTPUT_DIR||'qa-jpc-crystal-v306';
await fs.mkdir(output,{recursive:true});
const report={ok:false,scope:'Actual shipped local edition and 3D physics. Controlled records exercise native presentation and local virtual-credit settlement; they are not probability samples.',steps:[],screens:[],widths:[],physical:null,api:[],external:[],assetFailures:[],errors:[],warnings:[]};
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2','.mp3':'audio/mpeg','.wav':'audio/wav','.avif':'image/avif'};
const exposure=String.raw`
;window.__jpc306QA={
 app,get driver(){return rouletteDriver;},get session(){return jpcSession;},
 paint:()=>paintJpcDashboard(),restart:()=>restartJpcRound(),toggle:()=>toggleJpcMode(),
 choose:value=>startJpcVariantV306(value),canChoose:()=>canChooseJpcVariantV306(),
 open:()=>openJpcChooserV306(),close:()=>closeJpcChooserV306(),
 pause:value=>{userPaused=!!value;syncPause();},
 stopTicker:()=>stopJpcTicker(),startTicker:()=>runJpcTicker(),
 stopAuto:()=>stopAutoRound(),fit:()=>{requestFit();positionJpcDashboard();},
 initialCredit:app.credit
};
stopAutoRound();
`;
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1');
 if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/ws')){report.api.push(url.pathname);res.writeHead(451);res.end('Local JPC has no server API');return;}
 let file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 try{
  if((await fs.stat(file)).isDirectory())file=path.join(file,'index.html');
  let body=await fs.readFile(file);
  if(url.pathname==='/assets/local-debug-game-v258.js')body=Buffer.from(body.toString('utf8')+exposure);
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(body);
 }catch{res.writeHead(404);res.end('missing '+url.pathname);}
});
server.listen(0,'127.0.0.1');await once(server,'listening');
const base='http://127.0.0.1:'+server.address().port;
let browser,context,page;
const step=(name,data={})=>{report.steps.push({name,...data});console.log('CRYSTAL_JPC_STAGE',JSON.stringify({name,...data}));};
const screenshot=async name=>{await page.screenshot({path:path.join(output,name+'.png')});report.screens.push(name+'.png');};
function inside(inner,outer,label){
 assert(inner&&outer&&inner.width>0&&inner.height>0,label+' has visible dimensions');
 assert(inner.left>=outer.left-1&&inner.top>=outer.top-1&&inner.right<=outer.right+1&&inner.bottom<=outer.bottom+1,label+' fits '+JSON.stringify({inner,outer}));
}
async function openPage({width=390,height=844,mobile=true}={}){
 await context?.close();
 context=await browser.newContext({viewport:{width,height},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:1,serviceWorkers:'block'});
 await context.route('**/*',route=>{
  const url=new URL(route.request().url());
  if(/^https?:$/.test(url.protocol)&&url.origin!==base){report.external.push(url.href);return route.abort('blockedbyclient');}
  return route.continue();
 });
 await context.addInitScript(()=>{
  // Keep the ordinary local game at BET while selecting JPC. This is an
  // isolated existing zero-BET preference, not a replaced production clock.
  localStorage.setItem('sweets-local-debug-v258:virtual-bets-v1',JSON.stringify(Array(10).fill(0)));
 });
 page=await context.newPage();
 page.on('pageerror',error=>report.errors.push(String(error.stack||error)));
 page.on('console',message=>{if(['error','warning'].includes(message.type()))report.warnings.push(message.text().slice(0,500));});
 page.on('response',response=>{if(response.status()>=400&&/jpc-crystal/.test(response.url()))report.assetFailures.push({url:response.url(),status:response.status()});});
 const version=JSON.parse(await fs.readFile('app-version.json','utf8')).version;
 await page.goto(base+'/?edition=local&appv='+encodeURIComponent(version),{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>window.__jpc306QA?.driver&&window.SweetsLocalDebugV258?.describe?.().rouletteReady&&window.SweetsCrystalJpcUIV306,null,{timeout:90000});
 await page.evaluate(async()=>{
  await document.fonts.ready;const q=window.__jpc306QA;q.stopAuto();
  if(!window.SweetsLocalDebugV258.setBets(Array(q.app.bets.length).fill(0)))throw Error('isolated zero-BET setup failed');
  const sound=document.getElementById('sound');sound.checked=false;sound.dispatchEvent(new Event('change',{bubbles:true}));
 });
 assert.equal(await page.evaluate(()=>!!window.SweetsSharedMachine||!!window.SweetsPlayerProfileV255),false,'local JPC never attaches a server identity or wallet');
}

async function inspect(){
 return page.evaluate(()=>{
  const q=window.__jpc306QA,d=q.driver,panel=document.getElementById('jpc-dashboard');
  const rect=node=>{if(!node)return null;const r=node.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
  const visible=node=>{if(!node)return false;for(let p=node;p?.nodeType===1;p=p.parentElement){const s=getComputedStyle(p);if(p.hidden||s.display==='none'||s.visibility==='hidden'||Number(s.opacity)===0)return false;}const r=rect(node);return r.width>0&&r.height>0;};
  return {
   active:q.session.active,variant:d.draw.jpcVariant,drawState:d.draw.state,credit:q.app.credit,displayCredit:q.app.displayCredit,
   crystal:d.draw.crystalState?JSON.parse(JSON.stringify(d.draw.crystalState)):null,
   ui:window.SweetsCrystalJpcUIV306?.describe?.()||null,
   panel:{visible:visible(panel),rect:rect(panel),text:panel.textContent},
   crystalPanel:{visible:visible(document.getElementById('cj306-panel')),rect:rect(document.getElementById('cj306-panel')),text:document.getElementById('cj306-panel')?.textContent},
   screen:rect(document.getElementById('screen')),viewport:{left:0,top:0,right:innerWidth,bottom:innerHeight,width:innerWidth,height:innerHeight},
   primaryButton:{disabled:document.getElementById('debug-start').disabled,text:document.getElementById('debug-start').textContent},
   modeButton:{disabled:document.getElementById('jpc-mode').disabled,text:document.getElementById('jpc-mode').textContent},
   physical:{serial:d.physics.serial,active:d.physics.active,faults:d.physics.faults,hits:d.physics.hits.map(hit=>({...hit})),led:d.ledState},
   cells:[...panel.querySelectorAll('.cj306-pocket')].map(node=>({text:node.textContent,rect:rect(node),aria:node.getAttribute('aria-label'),dataset:{...node.dataset},value:node.querySelector('.cj306-pocket-value')?.textContent,hits:node.querySelector('.cj306-pocket-hits')?.textContent,color:getComputedStyle(node).getPropertyValue('--cj306-tone').trim()})),
   amounts:Object.fromEntries(['remaining','active','jp-hits','base','payout'].map(id=>{const node=document.getElementById('cj306-'+id);return [id,{value:Number(node?.dataset.amount),rect:rect(node),text:node?.textContent}];})),
   multiplier:document.getElementById('cj306-multiplier')?.textContent,jpLevel:document.getElementById('cj306-jp-level')?.textContent,
   progress:document.getElementById('cj306-jp-progress')?.getAttribute('aria-valuenow'),
   notice:{visible:visible(panel.querySelector('.cj306-notice')),rect:rect(panel.querySelector('.cj306-notice')),text:panel.querySelector('.cj306-notice')?.textContent},
   images:[...panel.querySelectorAll('img')].filter(visible).map(node=>({src:node.getAttribute('src'),loaded:node.complete&&node.naturalWidth>0,rect:rect(node)})),
   overflow:[...panel.querySelectorAll('button,header,footer,[data-jpc-value]')].filter(visible).filter(node=>node.scrollWidth>node.clientWidth+2).map(node=>({tag:node.tagName,id:node.id,text:node.textContent,scroll:node.scrollWidth,client:node.clientWidth}))
  };
 });
}

const ordinary=Array.from({length:25},(_,i)=>i+1).filter(n=>![1,6,11,16,21].includes(n));
const colorful=[21,21,21,...ordinary.slice(0,8).flatMap((pocket,index)=>Array(index+1).fill(pocket)),1,1,1,1];
async function fixture(sequence,{complete=false,classic=false}={}){
 return page.evaluate(({sequence,complete,classic})=>{
  const q=window.__jpc306QA,d=q.driver,p=d.physics,R=window.SweetsCrystalJpcV306;
  q.pause(true);q.stopTicker();d.draw.reset();
  Object.assign(q.session,{key:'',previousCounts:Array(25).fill(0),previousHits:0,win:0,awarded:false,jackpotShown:false});
  d.draw.state='running';
  const apply=pocket=>{
   const id=++p.serial;
   if(!classic&&!R.launch(d.draw.crystalState,id))throw Error('controlled fixture exhausted its ball bank');
   const hit={ball:id,pocket,time:p.time,held:false,collisions:0,collisionImpulse:0};
   p.hits.push(hit);p.onHit(hit);
  };
  for(const pocket of sequence)apply(pocket);
  if(complete&&!classic)while(d.draw.crystalState.remaining)apply(2);
  d.draw.sent=p.serial;d.draw.state=complete?'complete':'running';
  const before=q.app.credit;q.paint();q.fit();
  q.pause(false);d.setPaused(true);q.startTicker();
  return {before,after:q.app.credit,payout:classic?q.session.win*500:d.draw.crystalState.payout,complete,classic};
 },{sequence,complete,classic});
}
async function fixtureHit(pocket){
 return page.evaluate(pocket=>{
  const q=window.__jpc306QA,d=q.driver,p=d.physics,id=++p.serial;
  if(!window.SweetsCrystalJpcV306.launch(d.draw.crystalState,id))throw Error('fixture has no unlaunched ball');
  const hit={ball:id,pocket,time:p.time,held:false,collisions:0,collisionImpulse:0};p.hits.push(hit);p.onHit(hit);q.paint();
  return {payout:d.draw.crystalState.payout,base:d.draw.crystalState.base,jpHits:d.draw.crystalState.jpHits,multiplier:d.draw.crystalState.multiplier};
 },pocket);
}
function crystalPanel(record){
 assert.equal(record.active,true);assert.equal(record.variant,'crystal');assert.equal(record.crystalPanel.visible,true);assert.equal(record.cells.length,25);
 inside(record.crystalPanel.rect,record.panel.rect,'new JPC panel');inside(record.panel.rect,record.screen,'JPC dashboard');
 for(const cell of record.cells)inside(cell.rect,record.crystalPanel.rect,'pocket '+cell.dataset.pocket);
 assert.deepEqual(record.cells.filter(cell=>cell.dataset.kind!=='ordinary').map(cell=>Number(cell.dataset.pocket)),[1,6,11,16,21]);
 assert.deepEqual(record.cells.filter(cell=>cell.dataset.kind==='bonus').map(cell=>cell.value),['+1','+1','+4','+8']);
 const sum=record.cells.filter(cell=>cell.dataset.kind==='ordinary').reduce((total,cell)=>total+Number(cell.value),0);
 assert.equal(sum,record.crystal.base);assert.equal(record.amounts.base.value,record.crystal.base);assert.equal(record.amounts.payout.value,record.crystal.payout);
 assert.equal(record.amounts.remaining.value,record.crystal.remaining);assert.equal(record.amounts['jp-hits'].value,record.crystal.jpHits);
 assert.equal(record.multiplier,'×'+record.crystal.multiplier);assert.equal(Number(record.progress),Math.min(5,record.crystal.jpHits));
 for(const [id,amount] of Object.entries(record.amounts))inside(amount.rect,record.crystalPanel.rect,'live '+id);
 assert.deepEqual(record.overflow,[],'live numbers and controls do not overflow horizontally');
 for(const image of record.images)assert(image.loaded,'visible artwork decoded: '+image.src);
 assert.doesNotMatch(record.crystalPanel.text,/70球|全25ポケット|500ベース/,'new mode has no classic-rule instructions');
}

try{
 browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||process.env.PLAYWRIGHT_EXECUTABLE_PATH}:{}),args:['--enable-unsafe-swiftshader']});
 await openPage();
 await page.locator('#jpc-mode').click();
 await page.waitForSelector('#cj306-chooser:not([hidden])');
 assert.equal(await page.locator('#cj306-chooser [data-variant]').count(),2);
 assert.equal(await page.evaluate(()=>window.__jpc306QA.session.active),false,'opening the selector does not start a draw');
 await screenshot('chooser-390');
 await page.locator('#cj306-chooser .cj306-chooser-close').click();
 assert.equal(await page.evaluate(()=>document.getElementById('screen').inert),false,'cancel restores game input ownership');
 await page.locator('#jpc-mode').click();await page.locator('#cj306-chooser [data-variant="crystal"]').click();
 await page.waitForFunction(()=>window.__jpc306QA.driver.draw.jpcVariant==='crystal'&&window.__jpc306QA.session.active);
 await page.waitForFunction(()=>window.__jpc306QA.driver.physics.hits.length>=3,null,{timeout:90000});
 const live=await page.evaluate(()=>{
  const q=window.__jpc306QA;q.pause(true);q.paint();const d=q.driver,s=d.draw.crystalState;
  const counts=Array(25).fill(0);for(const hit of d.physics.hits)counts[hit.pocket-1]++;
  return {counts,state:JSON.parse(JSON.stringify(s)),hits:d.physics.hits.map(hit=>({...hit})),time:d.physics.time,rpm:d.physics.settings.rpm,serial:d.physics.serial};
 });
 assert(live.hits.length>=3);assert.deepEqual(live.state.counts,live.counts);assert.equal(live.state.landed,live.hits.length);
 assert.equal(live.state.remaining+Object.keys(live.state.pending).length+live.state.landed,30+live.state.bonusTotal);
 report.physical=live;step('actual-native-physics-hits',{landed:live.hits.length,launched:live.serial,pockets:live.hits.map(hit=>hit.pocket)});
 await page.waitForTimeout(350);
 assert.equal(await page.evaluate(()=>window.__jpc306QA.driver.physics.time),live.time,'pause freezes the actual physics clock');
 const blocked=await page.evaluate(()=>{
  const q=window.__jpc306QA,before=JSON.stringify(q.driver.draw.crystalState),credit=q.app.credit;
  const results={choose:q.choose('classic'),restart:q.restart(),toggle:q.toggle(),open:window.SweetsCrystalJpcUIV306.showChooser()};
  return {results,same:before===JSON.stringify(q.driver.draw.crystalState),creditSame:credit===q.app.credit,variant:q.driver.draw.jpcVariant};
 });
 assert.deepEqual(blocked.results,{choose:false,restart:false,toggle:false,open:false});assert(blocked.same&&blocked.creditSame);assert.equal(blocked.variant,'crystal');
 step('live-mode-switch-and-restart-blocked',blocked);
 await screenshot('physical-paused-390');

 // Controlled records now replace the already observed live round only in
 // this isolated fixture, allowing every color and exact JP boundary to appear.
 for(const width of [320,390,430]){
  await page.setViewportSize({width,height:844});await fixture(colorful);await page.waitForTimeout(250);let record=await inspect();crystalPanel(record);
  assert.deepEqual(record.cells.filter(cell=>ordinary.slice(0,8).includes(Number(cell.dataset.pocket))).map(cell=>Number(cell.value)),[1,2,3,4,6,8,10,15]);
  assert.equal(record.crystal.jpHits,4);assert.equal(record.crystal.multiplier,1);assert.equal(record.crystal.base,49);assert.equal(record.crystal.payout,49);assert.equal(record.progress,'4');
  await screenshot('reach-eight-levels-'+width);const widthReport={width,reach:record};
  const five=await fixtureHit(1);assert.deepEqual(five,{payout:245,base:49,jpHits:5,multiplier:5});record=await inspect();crystalPanel(record);assert.equal(record.drawState,'running','JP qualification does not end the draw');assert.equal(record.jpLevel,'JP ×1');widthReport.jp5=record;await screenshot('jp5-'+width);
  const six=await fixtureHit(1);assert.deepEqual(six,{payout:490,base:49,jpHits:6,multiplier:10});record=await inspect();crystalPanel(record);assert.equal(record.jpLevel,'JP ×2');widthReport.jp6=record;await screenshot('jp6-'+width);
  const seven=await fixtureHit(1);assert.deepEqual(seven,{payout:735,base:49,jpHits:7,multiplier:15});record=await inspect();crystalPanel(record);assert.equal(record.jpLevel,'JP ×3');widthReport.jp7=record;
  const paid=await fixture([...colorful,1,1,1],{complete:true});assert.equal(paid.after-paid.before,paid.payout,'complete pays exactly the final cumulative award');
  record=await inspect();crystalPanel(record);assert.equal(record.drawState,'complete');assert.equal(record.ui.shown.awarded,true);widthReport.complete=record;await screenshot('complete-'+width);
  const repeated=await page.evaluate(()=>{const q=window.__jpc306QA,before=q.app.credit;for(let i=0;i<40;i++)q.paint();return {before,after:q.app.credit,display:q.app.displayCredit,persisted:Number(window.SweetsLocalDebugV258.storage.getItem('virtual-credit-v1'))};});
  await page.waitForTimeout(350);assert.equal((await inspect()).credit,paid.after);assert.equal(repeated.after,repeated.before);assert.equal(repeated.display,repeated.after);assert.equal(repeated.persisted,repeated.after,'local virtual credit persists through the existing local wallet hook');widthReport.repeated=repeated;
  await page.locator('.cj306-change').click();await page.waitForSelector('#cj306-chooser:not([hidden])');await screenshot('chooser-'+width+'-after-result');await page.locator('.cj306-chooser-close').click();
  assert.equal((await inspect()).credit,paid.after,'opening/cancelling the chooser never repays a completed result');report.widths.push(widthReport);
 }
 step('mobile-boundaries-and-single-settlement',{widths:[320,390,430]});

 // Select the retained 70-ball mode from the completed new mode, then return
 // to ordinary play. This verifies the actual input and rendering ownership.
 await page.locator('.cj306-change').click();await page.waitForSelector('#cj306-chooser:not([hidden])');await screenshot('change-to-classic');
 await page.locator('#cj306-chooser [data-variant="classic"]').click();
 await page.waitForFunction(()=>window.__jpc306QA.driver.draw.jpcVariant==='classic');
 await page.evaluate(()=>window.__jpc306QA.pause(true));
 const classicPaid=await fixture(Array(70).fill(2),{complete:true,classic:true});
 assert.equal(classicPaid.payout,234500,'retained classic cumulative 70-hit payout');assert.equal(classicPaid.after-classicPaid.before,234500);
 let classic=await inspect();assert.equal(classic.variant,'classic');assert.equal(classic.crystalPanel.visible,false);assert.match(classic.panel.text,/500ベース/);assert.match(classic.panel.text,/全25ポケット/);
 await screenshot('classic-retained');report.classic={paid:classicPaid,state:classic};
 await page.locator('#jpc-mode').click();await page.waitForFunction(()=>!window.__jpc306QA.session.active);
 assert.equal(await page.locator('#jpc-dashboard').isVisible(),false);assert.equal(await page.evaluate(()=>document.querySelector('#screen>.game').inert),false);
 assert.equal(await page.evaluate(()=>window.__jpc306QA.driver.draw.mode),'eight');step('classic-and-ordinary-return');

 await openPage({width:1366,height:900,mobile:false});await page.locator('#jpc-mode').click();await screenshot('chooser-desktop');await page.locator('#cj306-chooser [data-variant="crystal"]').click();
 await page.waitForFunction(()=>window.__jpc306QA.session.active);await fixture(colorful);await page.waitForTimeout(250);const desktop=await inspect();crystalPanel(desktop);report.widths.push({width:1366,reach:desktop});await screenshot('reach-desktop');
 await openPage({width:844,height:390,mobile:true});await page.locator('#jpc-mode').click();await screenshot('chooser-mobile-landscape');await page.locator('#cj306-chooser [data-variant="crystal"]').click();
 await page.waitForFunction(()=>window.__jpc306QA.session.active);await fixture(colorful);await page.waitForTimeout(250);const landscape=await inspect();assert.equal(await page.evaluate(()=>document.body.classList.contains('mobile-landscape')),true);crystalPanel(landscape);report.widths.push({width:844,height:390,mobile:true,reach:landscape});await screenshot('reach-mobile-landscape');
 assert.deepEqual(report.api,[],'all JPC testing stays outside authenticated server APIs');assert.deepEqual(report.external,[]);assert.deepEqual(report.assetFailures,[]);assert.deepEqual(report.errors,[]);
 report.ok=true;
 console.log('JPC_CRYSTAL_V306_BROWSER_PASS: actual native physics; 320/390/430/1366 and mobile 844x390 layouts; all cumulative colors; JP 4/5/6/7; pause; switch/restart guards; single persistent local settlement; retained classic and normal return.');
}catch(error){
 report.failure={message:String(error),stack:error.stack};
 if(page)try{report.failure.state=await inspect();await screenshot('failure');}catch(capture){report.failure.capture=String(capture);}
 throw error;
}finally{
 await fs.writeFile(path.join(output,'browser-report.json'),JSON.stringify(report,null,2)+'\n');
 await browser?.close();await new Promise(resolve=>server.close(resolve));
}

/* Full native app: real Start, actual manual-number buttons, five-ball FREE
 * choices and unmodified eighth-ball settlement. Only an already legal,
 * deterministic round-start board is restored through the native hook. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {once} from 'node:events';
import {chromium} from 'playwright';
import {replayDango,read,sha256,BASELINE_RULES,BASELINE_HOST} from './dango-v304-fixtures.mjs';
const root=process.cwd(),out='qa-dango-v304';await fs.mkdir(out,{recursive:true});
assert.equal(sha256(read('assets/dango-bingo-rules.js')),BASELINE_RULES);assert.equal(sha256(read('assets/dango-bingo-host.js')),BASELINE_HOST);
const specs=[
 {id:'ordinary-390',fixture:'ordinary',width:390,height:844},
 {id:'highest-320',fixture:'highest',width:320,height:740},
 {id:'highest-reduced-430',fixture:'highest',width:430,height:932,reduced:true},
 {id:'legacy-zero-390',fixture:'legacy-zero',width:390,height:844}
];
const report={ok:false,cases:[],failures:[],pageErrors:[],missingAssets:[],externalRequests:[],apiRequests:[],nativeHashes:{rules:BASELINE_RULES,host:BASELINE_HOST}};
if(process.argv.includes('--fixtures-only')){console.log(JSON.stringify(specs.map(s=>({id:s.id,witness:replayDango(s.fixture)})),null,2));process.exit(0);}
const group=process.env.DANGO304_GROUP||'all',scenarios=group==='all'?specs:specs.filter(s=>s.id===group);assert(scenarios.length);
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.svg':'image/svg+xml','.avif':'image/avif','.wav':'audio/wav','.mp3':'audio/mpeg'};
const bridge='\n;window.__qa304={app,slots,select,syncManualNumbers,scheduleUI,get active(){return active;},get allNineMode(){return allNineMode;}};\n';
const server=http.createServer(async(req,res)=>{const u=new URL(req.url,'http://127.0.0.1');if(u.pathname.startsWith('/api/')||u.pathname.startsWith('/ws')){report.apiRequests.push(u.pathname);res.writeHead(451).end();return;}
 const file=path.resolve(root,'.'+decodeURI(u.pathname==='/'?'/index.html':u.pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 try{let body=await fs.readFile(file);if(file.endsWith('/assets/award-presentation-v277.js'))body=Buffer.concat([body,Buffer.from(bridge)]);res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream','cache-control':'no-store'}).end(body);}catch{res.writeHead(404).end();}});
server.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;
let browser,context,page;
async function screenshot(name){const file=name+'.png';await page.screenshot({path:path.join(out,file)});return file;}
async function waitAward(step,name){
 const h=await page.waitForFunction(({number,role,win})=>{
  const d=window.DangoAwardV304?.describe(),last=d?.last,active=window.SweetsAwardsV277?.describe().active.find(x=>x.game==='dango'&&x.number===number),cv=document.querySelector('.award-presentation-main[data-game="dango"]');
  if(!active||active.age<550||!last||last.role!==role||last.mini||last.win!==(role==='free'?null:win)||!cv||getComputedStyle(cv).display==='none'||!cv.clientWidth)return null;
  return {award:d,event:active,status:document.querySelector('.dgb-panel .award-v277-status')?.textContent,image:cv.toDataURL('image/png'),pointerEvents:getComputedStyle(cv).pointerEvents};
 },{number:step.number,role:step.oracle.role,win:step.oracle.win},{polling:'raf',timeout:30000});const data=await h.jsonValue();await h.dispose();
 const f=name+'-award.png';await fs.writeFile(path.join(out,f),Buffer.from(data.image.split(',')[1],'base64'));delete data.image;data.file=f;
 assert.equal(data.event.win,step.oracle.win);assert.equal(data.event.total,true);assert.equal(data.event.dango.totalLines,step.oracle.totalLines);assert.deepEqual(data.event.dango.newLineIds,step.oracle.newLineIds);assert.deepEqual(data.event.dango.highestRoles,step.oracle.highestRoles);assert.equal(data.pointerEvents,'none');
 if(step.oracle.role==='free'){assert.equal(data.award.last.winText,'');assert.equal(data.award.last.rasterNumbers,false);}
 else{assert(data.award.last.rasterNumbers);assert.deepEqual(data.award.last.glyphs,[...step.oracle.win.toLocaleString('ja-JP'),'WIN']);}
 if(step.oracle.role==='highest'||step.ball===5&&step.oracle.role==='bingo'){
  const mini=await page.evaluate(()=>{const q=__qa304,slot=q.slots[q.index],other=q.slots.findIndex(s=>s.engine.kind==='gelato');q.select(other);slot.paintDango(true);
   const cv=document.querySelector('.award-presentation-mini[data-game="dango"]'),last=DangoAwardV304.describe().last,view=DangoBingoView.describeAssets().last.mini;
   if(!cv||cv.hidden||!cv.clientWidth||!last?.mini)throw Error('native unselected Dango mini award not rendered');return {last,view,state:JSON.parse(JSON.stringify(DangoBingo.engine.state)),image:cv.toDataURL('image/png')};});
  assert.equal(mini.last.role,step.oracle.role);assert.equal(mini.last.win,step.oracle.win);assert.equal(mini.view.imageCells,28);assert.deepEqual(mini.state,step.after);
  const miniFile=name+'-mini-award.png';await fs.writeFile(path.join(out,miniFile),Buffer.from(mini.image.split(',')[1],'base64'));delete mini.image;data.mini={...mini,file:miniFile};
  await page.evaluate(()=>__qa304.select(__qa304.index));
 }
 return data;
}
async function layout(){return page.evaluate(()=>{
 const e=DangoBingo.engine,s=e.state,v=DangoBingo.view,root=v.root,cv=v.canvas,rect=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
 const box=rect(root),g=DangoBingoView.geometry(root.clientWidth,root.clientHeight,{state:s}),pay=rect(root.querySelector('.dgb-pay-matrix')),free=rect(root.querySelector('.dgb-free-stat'));
 const cells=[...root.querySelectorAll('.dgb-pay tbody td')].map(td=>{const num=td.querySelector('.gold-number'),range=document.createRange();range.selectNodeContents(num);return {value:num.textContent,box:rect(td),ink:rect({getBoundingClientRect:()=>range.getBoundingClientRect()}),highest:td.dataset.highestRole==='true'};});
 return {state:JSON.parse(JSON.stringify(s)),box,pay,free,cells,geometry:g,headings:[...root.querySelectorAll('thead th')].map(n=>n.textContent),description:v.describe(),art:DangoArtV304.describe(),view:DangoBingoView.describeAssets(),
  dataset:{...root.dataset},sources:{scene:getComputedStyle(root,'::before').backgroundImage,payout:getComputedStyle(root.querySelector('.dgb-pay-matrix')).borderImageSource,free:getComputedStyle(root.querySelector('.dgb-free-stat')).backgroundImage.startsWith('url("data:image/png')},
  canvas:{width:cv.width,height:cv.height,clientWidth:cv.clientWidth,clientHeight:cv.clientHeight},documentWidth:document.documentElement.scrollWidth,viewport:innerWidth};
 });}
function checkLayout(d){
 assert.equal(d.state.cells.length,28);assert.equal(d.view.last.main.imageCells,28);assert.equal(d.view.last.main.standRendered,true);assert.equal(d.view.last.main.greenHitCells,3);assert.equal(d.description.artRevision,304);assert.equal(d.dataset.artRevision,'304');
 assert.equal(d.art.loaded,true);assert.deepEqual(d.art.errors,[]);assert(d.art.cyan.meanLuminance>=230&&d.art.cyan.meanBlueMinusRed>=3&&d.art.cyan.meanBlueMinusRed<=27);assert.equal(d.documentWidth,d.viewport);
 assert.match(d.sources.scene,/dango-art-v304\/moon-garden/);assert.match(d.sources.payout,/dango-art-v304\/payout-cabinet/);assert(d.sources.free);assert.deepEqual(d.headings,['ライン','1個','2個','3個']);
 for(const key of ['pay','free']){const b=d[key];assert(b.x>=d.box.x-1&&b.y>=d.box.y-1&&b.right<=d.box.right+1&&b.bottom<=d.box.bottom+1,'native reserved '+key+' is contained');}
 for(const c of d.cells){assert(c.ink.x>=c.box.x-1&&c.ink.right<=c.box.right+1&&c.ink.y>=c.box.y-1&&c.ink.bottom<=c.box.bottom+1,'complete live payout digits fit '+JSON.stringify(c));}
}
try{
 browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{}),args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 for(const spec of scenarios){const f=replayDango(spec.fixture),item={id:spec.id,steps:[],screens:[]};try{
  context=await browser.newContext({viewport:{width:spec.width,height:spec.height},serviceWorkers:'block',reducedMotion:spec.reduced?'reduce':'no-preference'});
  await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin!==base){report.externalRequests.push(u.href);return route.abort();}return route.continue();});
  page=await context.newPage();page.on('pageerror',e=>report.pageErrors.push({id:spec.id,error:String(e.stack||e)}));page.on('response',r=>{if(r.status()>=400&&/dango.*v304/.test(r.url()))report.missingAssets.push(r.url());});
  await page.goto(base+'/?edition=local',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__qa304&&window.SweetsLocalDebugV258?.ready&&window.DangoBingo&&window.DangoArtV304&&window.DangoAwardV304,null,{timeout:90000});
  assert.deepEqual(await page.evaluate(()=>Promise.all([DangoArtV304.ready,DangoAwardV304.ready,DangoBingoView.assetsReady])),[true,true,true]);await page.evaluate(()=>document.fonts.ready);
  await page.locator('#manual-number-toggle').click();await page.waitForFunction(()=>SweetsLocalDebugV258.describe().manualNumbers&&__qa304.app.phase==='ready');
  await page.evaluate(bet=>{const q=__qa304;q.index=q.slots.findIndex(s=>s.engine.kind==='dango');if(!SweetsLocalDebugV258.setBets(q.app.bets.map((_,i)=>i===q.index?bet:0)))throw Error('native BET rejected');q.select(q.index);},f.bet);
  await page.evaluate(()=>{const q=__qa304,e=DangoBingo.engine;if(q.app.phase==='ready'){const button=document.getElementById('manual-start');if(!button||button.disabled)throw Error('native Start unavailable');button.click();}else if(q.app.phase!=='playing'||q.app.draws.length||e.processed)throw Error('unexpected native Start phase');});await page.waitForFunction(()=>__qa304.app.phase==='playing'&&DangoBingo.engine.running);
  const initial=await page.evaluate(state=>{const q=__qa304,e=DangoBingo.engine;e.state=structuredClone(state);e.afterCheckpointRestoreV247();q.syncManualNumbers();q.scheduleUI(q.app);q.slots[q.index].paintDango(false);return JSON.parse(JSON.stringify(e.state));},f.initial);assert.deepEqual(initial,f.initial);
  item.initial=await layout();checkLayout(item.initial);item.screens.push(await screenshot(spec.id+'-initial'));
  let placementDone=false;
  for(const step of f.steps){
   if(step.kind==='commit'){
    if(f.manual){for(const id of f.manual)await page.locator('.dgb-cell[data-cell-id="'+id+'"]').click();}else await page.locator('.dgb-actions [data-action="auto"]').click();
    const placed=await page.evaluate(()=>JSON.parse(JSON.stringify(DangoBingo.engine.state)));assert.deepEqual(placed,step.placement,'real FREE controls produce independently replayed legal placement');placementDone=true;
    item.placement=await layout();checkLayout(item.placement);item.screens.push(await screenshot(spec.id+'-placement'));continue;
   }
   const before=await page.evaluate(()=>SweetsAwardsV277.describe().received);let painting;
   if(step.oracle.award)painting=waitAward(step,spec.id+'-ball'+step.ball);else painting=Promise.resolve(null);
   // Attaching a rejection handler immediately avoids an unhandled rejection
   // while the native number button is waiting for its real presentation gate.
   const caught=painting.then(value=>({value}),error=>({error}));
   const button=page.locator('#manual-number-grid button[data-number="'+step.number+'"]');await page.waitForFunction(n=>{const b=document.querySelector('#manual-number-grid button[data-number="'+n+'"]');return b&&!b.disabled;},step.number,{timeout:30000});await button.click();
   await page.waitForFunction(ball=>DangoBingo.engine.processed===ball,step.ball,{timeout:30000});const actual=await page.evaluate(()=>JSON.parse(JSON.stringify(DangoBingo.engine.state)));assert.deepEqual(actual,step.after,'real native accepted state at ball '+step.ball);
   const captured=await caught;if(captured.error)throw captured.error;
   if(step.ball<8){const d=await layout();checkLayout(d);item.steps.push({ball:step.ball,award:captured.value,layout:d,before});if(step.ball===1||step.ball===5)item.screens.push(await screenshot(spec.id+'-ball'+step.ball));}
   else item.steps.push({ball:step.ball,award:captured.value,before});
   if(step.ball===5){assert.equal(actual.phase,'placing');assert.equal(placementDone,false);}
  }
  await page.waitForFunction(()=>['result','paying','complete'].includes(__qa304.app.phase)&&__qa304.app.paid[__qa304.index],null,{timeout:60000});
  item.result=await page.evaluate(()=>{const q=__qa304,e=DangoBingo.engine;return {phase:q.app.phase,paid:q.app.paid[q.index],win:q.app.roundWins[q.index],total:q.app.totalWin,state:JSON.parse(JSON.stringify(e.state)),awards:SweetsAwardsV277.describe(),awardRender:DangoAwardV304.describe()};});
  const win=Math.floor(f.bet*f.final.totalHundredths/100);assert(item.result.paid);assert.equal(item.result.win,win);assert.equal(item.result.total,win);assert.deepEqual(item.result.state,f.final);assert.equal(item.result.awards.errors,0);assert(item.result.awardRender.main>0);assert.equal(item.result.awardRender.fallbackAmounts,0);
  item.screens.push(await screenshot(spec.id+'-result'));
  const mini=await page.evaluate(()=>{const q=__qa304,slot=q.slots[q.index];slot.paintDango(true);return {state:JSON.parse(JSON.stringify(DangoBingo.engine.state)),render:DangoBingoView.describeAssets().last.mini,image:slot.miniCanvas.toDataURL('image/png')};});assert.deepEqual(mini.state,f.final);assert.equal(mini.render.imageCells,28);assert(mini.render.standRendered);const miniFile=spec.id+'-native-mini.png';await fs.writeFile(path.join(out,miniFile),Buffer.from(mini.image.split(',')[1],'base64'));delete mini.image;item.mini={...mini,file:miniFile};item.status='passed';console.log('DANGO_V304_BROWSER_PASS',spec.id);
 }catch(error){item.status='failed';item.error=String(error.stack||error);report.failures.push({id:spec.id,error:item.error});try{item.diagnostics=await page.evaluate(()=>({phase:window.__qa304?.app.phase,engine:window.DangoBingo?.engine?.state,art:window.DangoArtV304?.describe(),award:window.DangoAwardV304?.describe(),awards:window.SweetsAwardsV277?.describe()}));item.screens.push(await screenshot(spec.id+'-failure'));}catch{}console.error('DANGO_V304_BROWSER_FAIL',spec.id,String(error));}
 finally{report.cases.push(item);await context?.close();context=null;page=null;}}
 assert.deepEqual(report.pageErrors,[]);assert.deepEqual(report.missingAssets,[]);assert.deepEqual(report.externalRequests,[]);assert.deepEqual(report.apiRequests,[]);assert.equal(report.failures.length,0);report.ok=true;
}catch(error){report.error=String(error.stack||error);process.exitCode=1;}
finally{await fs.writeFile(path.join(out,'report-'+group+'.json'),JSON.stringify(report,null,2)+'\n');await context?.close();await browser?.close();await new Promise(r=>server.close(r));console.log('DANGO_V304_BROWSER_REPORT',out+'/report-'+group+'.json');}

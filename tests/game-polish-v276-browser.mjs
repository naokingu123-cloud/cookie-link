/* CI-only browser regression: real production engines through local manual
 * controls. Each game has an isolated virtual wallet; no server API is used. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {once} from 'node:events';
import {chromium} from 'playwright';

const root=process.cwd(),output='qa-game-polish-v276';
await fs.mkdir(output,{recursive:true});
const version=JSON.parse(await fs.readFile('app-version.json','utf8')).version;
const games=['cookie','choco','candy','gelato','winery','popcorn','jelly','stick','castella','dango'];
const report={version,games:[],payoutFits:[],screens:[],pageErrors:[],apiRequests:[],externalRequests:[],warnings:[]};
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.svg':'image/svg+xml','.mp3':'audio/mpeg','.wav':'audio/wav','.avif':'image/avif'};
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1');
 if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/ws')){report.apiRequests.push(url.pathname);res.writeHead(451).end();return;}
 let file=path.resolve(root,'.'+decodeURI(url.pathname==='/'?'/index.html':url.pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 try{const stat=await fs.stat(file);if(stat.isDirectory())file=path.join(file,'index.html');let body=await fs.readFile(file);
  if(file.endsWith('/assets/hit-presentation-v276.js'))body=Buffer.concat([body,Buffer.from('\n;window.__qa276={app,slots,select,get active(){return active;}};\n')]);
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(body);
 }catch{res.writeHead(404).end();}
});
server.listen(0,'127.0.0.1');await once(server,'listening');
const base='http://127.0.0.1:'+server.address().port;
let browser,context,page,current;
async function openGame(kind,{width=1366,height=900,bet=3000,reduced=false}={}){
 await context?.close();
 context=await browser.newContext({viewport:{width,height},serviceWorkers:'block',reducedMotion:reduced?'reduce':'no-preference'});
 await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin!==base){report.externalRequests.push(u.href);return route.abort();}return route.continue();});
 page=await context.newPage();page.on('pageerror',e=>report.pageErrors.push(String(e.stack||e)));page.on('console',m=>{if(m.type()==='warning'||m.type()==='error')report.warnings.push(m.text().slice(0,350));});
 await page.goto(base+'/?edition=local&appv='+encodeURIComponent(version),{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__qa276&&window.SweetsLocalDebugV258?.ready&&window.SweetsHitPresentationV276,null,{timeout:90000});
 await page.locator('#manual-number-toggle').click();
 await page.waitForFunction(()=>window.SweetsLocalDebugV258.describe().manualNumbers&&window.__qa276.app.phase==='ready');
 await page.evaluate(({kind,bet})=>{
  const q=window.__qa276,index=q.slots.findIndex(s=>(s.engine.kind||'cookie')===kind);
  if(index<0)throw Error('Missing game '+kind);
  const sound=document.getElementById('sound');sound.checked=false;sound.dispatchEvent(new Event('change',{bubbles:true}));
  if(!window.SweetsLocalDebugV258.setBets(q.app.bets.map((_,i)=>i===index?bet:0)))throw Error('Failed virtual BET');
  q.select(index);
 },{kind,bet});
 await page.evaluate(()=>document.fonts.ready);
 const before=await page.evaluate(()=>window.SweetsHitPresentationV276.describe());
 assert.deepEqual(before.attached.slice().sort(),games.slice().sort(),'all ten actual engine types attach, including kindless Cookie');
 assert.equal(before.received,0,'ready/restore emits no HIT');
 return before;
}
async function payoutFit(label){
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const rows=await page.evaluate(()=>[...document.querySelectorAll('.gp-fit-amount')].filter(e=>e.getBoundingClientRect().width&&e.closest('.gp-collector-panel')?.getBoundingClientRect().width).map(e=>{
  const a=e.getBoundingClientRect(),b=e.parentElement.getBoundingClientRect();return {value:e.textContent,left:a.left,right:a.right,bayLeft:b.left,bayRight:b.right,scale:e.style.transform};
 }));
 assert.ok(rows.length>=6,'actual Gelato payout labels exist');
 for(const r of rows)assert.ok(r.left>=r.bayLeft-1&&r.right<=r.bayRight+1,'amount stays in its own bay '+JSON.stringify(r));
 report.payoutFits.push({label,rows});
}
function inspectHit(input){
 const [kind,mini]=Array.isArray(input)?input:[input,false];
 const api=window.SweetsHitPresentationV276,d=api.describe();
 const node=document.querySelector('.hit-presentation-'+(mini?'mini':'main')+'[data-game="'+kind+'"]');
 if(!node||node.hidden)return null;
 const style=getComputedStyle(node),bounds=node.getBoundingClientRect();if(style.display==='none'||style.visibility==='hidden'||bounds.width<10||bounds.height<10)return null;
 const probe=document.createElement('canvas');probe.width=probe.height=96;const ctx=probe.getContext('2d',{willReadFrequently:true});ctx.drawImage(node,0,0,96,96);
 const pixels=ctx.getImageData(0,0,96,96).data;let painted=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]>10)painted++;
 if(painted<3)return null;
 return {painted,pointerEvents:style.pointerEvents,box:{width:bounds.width,height:bounds.height},diagnostics:d,history:d.history.filter(e=>e.game===kind),draws:window.SweetsLocalDebugV258.describe().draws};
}
async function numberCandidates(kind){
 return page.evaluate(kind=>{
  const q=window.__qa276,e=q.slots.find(s=>(s.engine.kind||'cookie')===kind).engine,used=new Set(q.app.draws),found=new Set(),seen=new WeakSet();
  const walk=(v,key='',depth=0)=>{
   if(depth>7||v==null)return;
   if(typeof v==='number'){if(Number.isInteger(v)&&v>=1&&v<=25&&/number|^num$|^n$|labels/i.test(key))found.add(v);return;}
   if(typeof v!=='object'||seen.has(v)||v.nodeType)return;seen.add(v);
   if(Array.isArray(v)){for(const n of v)walk(n,key,depth+1);return;}
   for(const [k,n] of Object.entries(v))if(typeof n!=='function'&&!['history','checkpoint','queue','storage','fx'].includes(k))walk(n,k,depth+1);
  };
  walk(e);return [...found,...Array.from({length:25},(_,i)=>i+1)].filter((n,i,a)=>!used.has(n)&&a.indexOf(n)===i);
 },kind);
}
async function captureHit(kind,{reduced=false}={}){
 await page.locator('#manual-start').click();
 await page.waitForFunction(()=>window.__qa276.app.phase==='playing',null,{timeout:30000});
 const drawMode=await page.evaluate(kind=>window.__qa276.slots.find(s=>(s.engine.kind||'cookie')===kind).engine.drawMode||'grouped',kind);
 let evidence=null;
 for(let attempt=0;attempt<5&&!evidence;attempt++){
  const [number]=await numberCandidates(kind);assert.ok(number,'an undrawn number exists');
  await page.waitForFunction(n=>{const b=document.querySelector('#manual-number-grid button[data-number="'+n+'"]'),s=window.SweetsLocalDebugV258.describe();return s.phase==='playing'&&!s.drawHeld&&b&&!b.disabled;},number,{timeout:45000});
  await page.locator('#manual-number-grid button[data-number="'+number+'"]').click();
  await page.waitForFunction(n=>window.__qa276.app.draws.includes(n),number);
  if(drawMode==='grouped'&&attempt<2)continue;
  const end=Date.now()+7500;
  while(Date.now()<end){evidence=await page.evaluate(inspectHit,kind);if(evidence)break;await new Promise(r=>setTimeout(r,35));}
 }
 assert.ok(evidence,'real manual draw produces a visible main HIT for '+kind);
 assert.equal(evidence.pointerEvents,'none');assert.equal(evidence.diagnostics.errors,0);
 assert.ok(evidence.history.length,'actual engine event is recorded');
 for(const event of evidence.history)for(const p of event.mainPoints.filter(Boolean))assert.ok(Number.isFinite(p.x+p.y+p.r)&&p.r>0,'finite main HIT projection');
 const file='hit-'+kind+(reduced?'-reduced':'')+'.png';await page.screenshot({path:path.join(output,file)});report.screens.push(file);
 report.games.push({game:kind,reduced,...evidence});
 return evidence;
}
try{
 browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{}),args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 for(const kind of games){current=kind;await openGame(kind);if(kind==='gelato')await payoutFit('desktop BET3000');await captureHit(kind);}
 current='live-miniature';await openGame('gelato',{width:390,height:844});
 await page.evaluate(()=>{const q=window.__qa276;if(!SweetsLocalDebugV258.setBets(q.slots.map(s=>['gelato','dango'].includes(s.engine.kind)?3000:0)))throw Error('Two-game virtual BET failed');});
 await page.locator('#manual-start').click();await page.waitForFunction(()=>window.__qa276.app.phase==='playing');
 const [miniNumber]=await numberCandidates('dango');await page.locator('#manual-number-grid button[data-number="'+miniNumber+'"]').click();
 let miniature=null;const miniEnd=Date.now()+7000;
 while(Date.now()<miniEnd){miniature=await page.evaluate(inspectHit,['dango',true]);if(miniature)break;await new Promise(r=>setTimeout(r,30));}
 assert.ok(miniature,'a real offscreen game HIT paints its live miniature');assert.equal(miniature.pointerEvents,'none');assert.ok(miniature.diagnostics.maxMiniParticles<=16);report.miniature=miniature;
 await page.screenshot({path:path.join(output,'hit-dango-mini.png')});report.screens.push('hit-dango-mini.png');
 current='gelato-mobile';await openGame('gelato',{width:390,height:844,bet:300000});await payoutFit('mobile BET300000');await page.screenshot({path:path.join(output,'gelato-mobile-long-payout.png')});report.screens.push('gelato-mobile-long-payout.png');
 current='reduced-motion';await openGame('dango',{width:390,height:844,reduced:true});const reduced=await captureHit('dango',{reduced:true});
 assert.equal(reduced.diagnostics.reducedMotion,true);assert.equal(reduced.diagnostics.maxMainParticles,0,'reduced motion paints a quiet ring without moving particles');
 assert.equal(reduced.diagnostics.maxMiniParticles,0);
 await new Promise(r=>setTimeout(r,1300));
 assert.equal(await page.evaluate(()=>document.querySelectorAll('.hit-presentation-v276:not([hidden])').length),0,'completed effects clear their canvases');
 assert.deepEqual(report.apiRequests,[]);assert.deepEqual(report.externalRequests,[]);assert.deepEqual(report.pageErrors,[]);
 console.log('GAME_POLISH_V276_BROWSER_PASS',JSON.stringify({version,games:report.games.map(g=>g.game),screens:report.screens.length,payoutFits:report.payoutFits.length,errors:report.pageErrors.length}));
}catch(error){report.failure={current,message:String(error),stack:error.stack};if(page){try{report.failure.diagnostics=await page.evaluate(()=>window.SweetsHitPresentationV276?.describe());await page.screenshot({path:path.join(output,'failure.png')});}catch{}}throw error;
}finally{
 await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
 await context?.close().catch(()=>{});await browser?.close().catch(()=>{});await new Promise(resolve=>server.close(resolve));
}

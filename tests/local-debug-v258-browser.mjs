/* End-to-end static-server regression: no /api/session and no real wallet. */
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {once} from 'node:events';
import {chromium} from 'playwright';
const root=process.cwd(),out=path.join(root,'qa-local-debug-v258');
await fs.mkdir(out,{recursive:true});
const version=JSON.parse(await fs.readFile('app-version.json','utf8')).version;
const report={version,requests:[],api:[],external:[],pageErrors:[],warnings:[],steps:[],screens:[]};
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.svg':'image/svg+xml','.mp3':'audio/mpeg','.wav':'audio/wav','.avif':'image/avif'};
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1');
 report.requests.push(url.pathname);
 if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/ws')){report.api.push(url.pathname);res.writeHead(451);res.end('local mode has no server API');return;}
 let file=path.resolve(root,'.'+decodeURI(url.pathname==='/'?'/index.html':url.pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 try{const info=await fs.stat(file);if(info.isDirectory())file=path.join(file,'index.html');const body=await fs.readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(body);}
 catch{res.writeHead(404);res.end('missing '+url.pathname);}
});
server.listen(0,'127.0.0.1');await once(server,'listening');
const base='http://127.0.0.1:'+server.address().port;
let browser,context,page;
const milestone=(name,extra={})=>{const data={name,...extra};report.steps.push(data);console.log('LOCAL_DEBUG_STAGE',JSON.stringify(data));};
const state=()=>page.evaluate(()=>window.SweetsLocalDebugV258?.describe?.());
async function capture(name){await page.screenshot({path:path.join(out,name+'.png')});report.screens.push(name+'.png');}
try{
 browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
 context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
 await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin!==base){report.external.push(url.href);return route.abort();}return route.continue();});
 page=await context.newPage();
 page.on('pageerror',error=>report.pageErrors.push(String(error.stack||error)));
 page.on('console',message=>{if(message.type()==='error')report.warnings.push(message.text().slice(0,400));});
 await page.goto(base+'/?appv='+encodeURIComponent(version),{waitUntil:'domcontentloaded'});
 await page.waitForSelector('[data-edition-choice="local"]',{timeout:15000});
 assert.equal(await page.locator('[data-edition-choice]').count(),3);
 assert.equal(await page.evaluate(()=>!!window.SweetsSharedMachine||!!window.SweetsDownloadV255),false);
 await capture('chooser');
 await page.locator('[data-edition-choice="local"]').click();
 await page.waitForFunction(()=>window.SweetsLocalDebugV258?.describe?.().ready===true,null,{timeout:90000});
 let current=await state();
 assert.equal(current.localDrawAllowed,true);
 assert.equal(current.serverClientPresent,false);
 assert.equal(current.playerProfileServerAttached,false);
 assert.equal(await page.locator('#manual-number-toggle').count(),1);
 assert.equal(await page.locator('#manual-number-grid button').count(),25);
 assert.equal(await page.locator('#local-debug-v258').isVisible(),true);
 assert.ok(current.credit>=0);
 assert.deepEqual(report.api,[],'local edition must never contact authenticated APIs');
 milestone('local-started',{credit:current.credit,rouletteReady:current.rouletteReady});
 await page.waitForFunction(()=>window.SweetsLocalDebugV258?.describe?.().hasPhysics===true,null,{timeout:90000});
 current=await state();assert.equal(current.rouletteReady,true);
 await capture('local-roulette');
 const storage=await page.evaluate(()=>({serverIdentity:localStorage.getItem('sweets-shared-session-v176'),realProfile:localStorage.getItem('sweets-player-v1'),localProfile:localStorage.getItem('sweets-local-debug-v258:sweets-player-v1')}));
 assert.equal(storage.serverIdentity,null);assert.equal(storage.realProfile,null);assert.ok(storage.localProfile,'local profile stored exclusively under namespaced key');
 await page.evaluate(()=>{
  const sound=document.getElementById('sound');sound.checked=false;sound.dispatchEvent(new Event('change',{bubbles:true}));
  if(!window.SweetsLocalDebugV258.setBets([100,0,0,0,0,0,0,0,0,0]))throw Error('local BET setup failed');
 });
 await page.locator('#manual-number-toggle').click();
 await page.waitForFunction(()=>window.SweetsLocalDebugV258?.describe?.().manualNumbers===true,null,{timeout:5000});
 await capture('local-manual');
 await page.locator('#manual-start').click();
 await page.waitForFunction(()=>window.SweetsLocalDebugV258?.describe?.().phase==='playing',null,{timeout:20000});
 const draws=[25,3,6,10,13,22,24,2];
 for(let i=0;i<draws.length;i++){
  const n=draws[i];
  await page.waitForFunction(n=>{const s=window.SweetsLocalDebugV258?.describe?.(),el=document.querySelector('#manual-number-grid button[data-number="'+n+'"]');return s?.phase==='playing'&&s?.drawHeld===false&&el&&!el.disabled;},n,{timeout:45000});
  await page.locator('#manual-number-grid button[data-number="'+n+'"]').click();
  await page.waitForFunction(n=>window.SweetsLocalDebugV258?.describe?.().draws.includes(n),n,{timeout:5000});
  milestone('manual-hit',{ball:i+1,number:n});
 }
 current=await state();assert.deepEqual(current.draws,draws);
 await page.waitForFunction(()=>['result','paying','complete'].includes(window.SweetsLocalDebugV258?.describe?.().phase),null,{timeout:150000});
 milestone('manual-complete',{phase:(await state()).phase});
 assert.equal(report.api.length,0,'number input must not submit to an API');
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.SweetsLocalDebugV258?.describe?.().ready===true,null,{timeout:90000});
 current=await state();assert.deepEqual(current.bets,[100,0,0,0,0,0,0,0,0,0]);assert.equal(current.serverClientPresent,false);
 await page.locator('#local-debug-v258 [data-local-action="chooser"]').click();
 await page.waitForSelector('[data-edition-choice="local"]',{timeout:10000});
 assert.equal(await page.evaluate(()=>!!window.SweetsSharedMachine||!!window.SweetsDownloadV255),false);
 milestone('return-to-choice');
 assert.deepEqual(report.api,[]);
 assert.deepEqual(report.external,[]);
 assert.deepEqual(report.pageErrors,[],report.pageErrors.join('\n'));
 await fs.writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2));
 console.log('LOCAL_DEBUG_V258_BROWSER_PASS');
}finally{
 await fs.writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2)).catch(()=>{});
 await context?.close().catch(()=>{});await browser?.close().catch(()=>{});await new Promise(resolve=>server.close(resolve));
}

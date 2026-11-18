/* Verify published bytes and the current client renderer without creating a
   public session, placing BETs, sending balls, or assuming a local roulette. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const base=new URL(process.env.SIXDROP_PUBLIC_BASE||'https://naokingu123-cloud.github.io/cookie-link/');
const revision=process.env.GITHUB_SHA||'local-verification',out='qa-six-v248-public';
const files=['index.html','app-version.json','optimized/app-01.js','optimized/style-01.css','optimized/media/a73bbbdd98d48aac.woff2','assets/cookie-upgrade-patches.js','assets/sixdrop-progressive-core-v247.js','assets/sixdrop-progressive-host-v247.js','assets/sixdrop-progressive-v247.css','assets/shared-machine-v176.js','assets/shared-client-controller-v224.js','assets/stations-v235.js','assets/stations-progressive-v246.js','monitor.html','assets/monitor-ledger-v241.js','assets/server-monitor-v241.js','assets/server-monitor-v242.js'];
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
 for(const [width,height,mobile]of [[390,844,true],[1366,900,false]]){
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
  await page.evaluate(()=>document.querySelector('#tab2')?.click());
  await page.evaluate(()=>document.fonts.ready);
  const info=await page.evaluate(()=>{
   const q=window.SixDropV247,e=q.engine,canvas=document.querySelector('.carnival-canvas'),bank=document.querySelector('#sd247-bank'),gold=bank.querySelector('.gold-number');
   const rect=canvas.getBoundingClientRect();
   return {rulesRevision:q.rules.REVISION,gameName:e.gameName,drawMode:e.drawMode,phase:e.phase,accepted:e.accepted,processed:e.processed,serverHost:window.SweetsSharedMachine.serverHost,online:window.SweetsSharedMachine.online,canvas:{width:rect.width,height:rect.height},bankText:bank.parentElement.textContent,bankFont:getComputedStyle(gold).fontFamily,bankAlignment:getComputedStyle(bank).textAlign,roleRows:document.querySelectorAll('.sd247-roles section').length,obsoleteText:!!document.querySelector('.sd247-colors,.sd247-footer,#sd247-progress'),initialColors:q.rules.palette(0).map(i=>q.rules.RING[i]),finalColors:q.rules.palette(500).map(i=>q.rules.RING[i])};
  });
  assert.equal(info.rulesRevision,rulesRevision);assert.equal(info.gameName,'シックスドロップ');assert.equal(info.drawMode,'single');
  assert.equal(info.phase,'ready');assert.equal(info.accepted,0);assert.equal(info.processed,0);assert.equal(info.serverHost,false);assert.equal(info.online,false);
  assert.ok(info.canvas.width>100&&info.canvas.height>100,'current game canvas renders');
  assert.match(info.bankText,/全消し\s*\d+\s*WIN/);assert.match(info.bankFont,/ArcadePayout/);assert.equal(info.bankAlignment,'right');
  assert.equal(info.roleRows,3);assert.equal(info.obsoleteText,false);
  assert.deepEqual([...info.initialColors].sort(),['blue','aqua','green','lime'].sort());
  assert.deepEqual([...info.finalColors].sort(),['violet','pink','red','orange'].sort());
  assert.deepEqual(errors,[],'published frontend has no uncaught JavaScript errors');
  await page.screenshot({path:out+'/public-ready-'+width+'.png'});
  report.screens.push({width,height,...info,blockedServiceRequests:blocked,blockedWebSockets:sockets,pageErrors:errors});
  await context.close();
 }
}finally{await browser.close();}
await fs.writeFile(out+'/public-deployment.json',JSON.stringify(report,null,2)+'\n');
console.log('SIXDROP_PUBLIC_V248_READ_ONLY_PASS',JSON.stringify(report));

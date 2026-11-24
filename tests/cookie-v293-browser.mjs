/* CI-only Cookie Link visual witnesses. These checkpoints are produced by the
 * unmodified native rules. The test server's closure bridge is never shipped. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {once} from 'node:events';
import {createRequire} from 'node:module';
import {chromium} from 'playwright';

const require=createRequire(import.meta.url),root=process.cwd(),output='qa-cookie-v293';
const version=JSON.parse(await fs.readFile('app-version.json','utf8')).version;
const encode=value=>JSON.parse(JSON.stringify(value,(_key,v)=>v instanceof Set?{$set:[...v]}:v instanceof Map?{$map:[...v]}:v));
const fields=e=>encode(Object.fromEntries(Object.entries(e).filter(([key,value])=>typeof value!=='function'&&!['version','cycle','phase','running','busy','paused','presentationRate','roundBet','beforeComplete','onEvent','random','sleep'].includes(key))));
const random=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);

function nativeEvent(event,e){return {phase:event.phase,gain:event.gain,totalHundredths:e.totalHundredths,maxLink:e.maxLink,allClears:e.allClears,depth:event.depth||0};}
async function fixtures(){
 const {Engine}=require('./payout-v232-classic-sample.cjs').load(),result={};
 for(let seed=1;seed<=100&&!result.link;seed++){
  const events=[],e=new Engine({random:random(seed*7919),colorCount:5,onEvent:(event,engine)=>events.push(nativeEvent(event,engine))}),before=fields(e);
  e.wait=async()=>true;e.running=true;e.accepted=3;e.seen=new Set([1,2,3]);e.queue=[[1,2,3]];await e.drain();
  assert(!events.some(v=>v.phase==='error'));
  const proof=events.find(v=>v.phase==='link'&&v.totalHundredths>0);
  if(proof)result.link={fields:before,draws:[1,2],next:3,proof:{...proof,seed:seed*7919}};
 }
 assert(result.link,'a native LINK witness exists');
 // This fixed, reachable seed clears on ball 7 after three honest batches.
 // It needs 9,785 ms of native waits after the draw (headless rendering may
 // advance the animation clock more slowly than wall time).
 const events=[],e=new Engine({random:random(5717518),colorCount:5,onEvent:(event,engine)=>events.push(nativeEvent(event,engine))});
 e.wait=async()=>true;e.running=true;e.accepted=6;e.seen=new Set([1,2,3,4,5,6]);e.queue=[[1,2,3],[4,5],[6]];await e.drain();
 assert.equal(e.processed,6);assert.equal(e.allClears,0);assert(!events.some(v=>v.phase==='error'));
 const before=fields(e);events.length=0;e.accepted=7;e.seen.add(7);e.queue=[[7]];await e.drain();
 const proof=events.find(v=>v.phase==='allclear');assert(proof,'seed 5717518 legitimately clears on ball 7');
 result.clear={fields:before,draws:[1,2,3,4,5,6],next:7,proof:{...proof,seed:5717518}};
 return result;
}

const witnesses=await fixtures();
if(process.argv.includes('--fixtures-only')){console.log(JSON.stringify(Object.fromEntries(Object.entries(witnesses).map(([kind,f])=>[kind,{draws:f.draws,next:f.next,proof:f.proof}]))));process.exit(0);}
const kindFilter=process.env.COOKIE_V293_KIND||'all';
assert(['all','link','clear'].includes(kindFilter),'COOKIE_V293_KIND must be all, link or clear');
const scenarios=[
 {id:'link-desktop',kind:'link',width:1366,height:900,bet:3000},
 {id:'clear-desktop',kind:'clear',width:1366,height:900,bet:3000},
 {id:'link-narrow',kind:'link',width:390,height:844,bet:300000},
 {id:'clear-narrow',kind:'clear',width:390,height:844,bet:300000},
 {id:'link-mini',kind:'link',width:390,height:844,bet:3000,mini:true},
 {id:'clear-reduced',kind:'clear',width:390,height:844,bet:300000,reduced:true}
].filter(scenario=>kindFilter==='all'||scenario.kind===kindFilter);
assert.equal(scenarios.length,kindFilter==='all'?6:3,'every selected Cookie scenario must execute');
assert.equal(new Set(scenarios.map(scenario=>scenario.id)).size,scenarios.length,'scenario identities are unique');
if(process.argv.includes('--list-cases')){console.log(JSON.stringify({kindFilter,plannedCaseCount:scenarios.length,plannedCases:scenarios.map(scenario=>scenario.id)}));process.exit(0);}
const report={version,kindFilter,plannedCaseCount:scenarios.length,plannedCases:scenarios.map(scenario=>scenario.id),scope:'Cookie-only native LINK and ALL CLEAR witnesses; no probability sampling',witnesses:Object.fromEntries(Object.entries(witnesses).map(([key,f])=>[key,{draws:f.draws,next:f.next,proof:f.proof}])),cases:[],failures:[],pageErrors:[],assetFailures:[],apiRequests:[],externalRequests:[]};
await fs.mkdir(output,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.svg':'image/svg+xml','.mp3':'audio/mpeg','.wav':'audio/wav','.avif':'image/avif'};
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1');
 if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/ws')){report.apiRequests.push(url.pathname);res.writeHead(451).end();return;}
 const file=path.resolve(root,'.'+decodeURI(url.pathname==='/'?'/index.html':url.pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 try{
  let body=await fs.readFile(file);
  if(file.endsWith('/assets/award-presentation-v277.js'))body=Buffer.concat([body,Buffer.from('\n;window.__qa293={app,slots,select,syncManualNumbers,scheduleUI,medalWin,payoutTenths,get active(){return active;}};\n')]);
  res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream','cache-control':'no-store'}).end(body);
 }catch{res.writeHead(404).end();}
});
server.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;

// Follow actual bitmap transfers, including cached compositions and data URLs.
// Native drawing methods execute unchanged; the observer only retains lineage.
function observeArt(){
 const assets=new WeakMap(),texts=new WeakMap(),urls=new Map();
 const sources=image=>{
  if(!image)return [];
  const inherited=assets.get(image);if(inherited?.size)return [...inherited];
  const src=image.currentSrc||image.src;if(typeof src!=='string')return [];
  if(urls.has(src))return [...urls.get(src)];
  try{const u=new URL(src,location.href);return u.origin===location.origin&&/^\/(assets|optimized)\//.test(u.pathname)?[u.pathname.slice(1)]:[];}catch{return [];}
 };
 const mark=(target,names)=>{if(!names.length)return;let set=assets.get(target);if(!set){set=new Set();assets.set(target,set);}names.forEach(name=>set.add(name));};
 const draw=CanvasRenderingContext2D.prototype.drawImage;
 CanvasRenderingContext2D.prototype.drawImage=function(image,...args){const result=Reflect.apply(draw,this,[image,...args]);mark(this.canvas,sources(image));if(texts.has(image)){const list=texts.get(this.canvas)||[];texts.set(this.canvas,[...new Set([...list,...texts.get(image)])]);}return result;};
 const clear=CanvasRenderingContext2D.prototype.clearRect;
 CanvasRenderingContext2D.prototype.clearRect=function(x,y,w,h){const m=this.getTransform(),result=Reflect.apply(clear,this,[x,y,w,h]);if(!m.b&&!m.c&&x*m.a+m.e<=0&&y*m.d+m.f<=0&&(x+w)*m.a+m.e>=this.canvas.width&&(y+h)*m.d+m.f>=this.canvas.height){assets.delete(this.canvas);texts.delete(this.canvas);}return result;};
 const fill=CanvasRenderingContext2D.prototype.fillText;
 CanvasRenderingContext2D.prototype.fillText=function(value,...args){const result=Reflect.apply(fill,this,[value,...args]),list=texts.get(this.canvas)||[];list.push(String(value));texts.set(this.canvas,[...new Set(list)].slice(-40));return result;};
 const dataURL=HTMLCanvasElement.prototype.toDataURL;
 HTMLCanvasElement.prototype.toDataURL=function(...args){const result=Reflect.apply(dataURL,this,args),names=sources(this);if(names.length)urls.set(result,new Set(names));return result;};
 window.__cookieArt293={inspect:image=>({sources:sources(image),texts:texts.get(image)||[]})};
}

let browser,context,page,current;
async function open(scenario){
 context=await browser.newContext({viewport:{width:scenario.width,height:scenario.height},serviceWorkers:'block',reducedMotion:scenario.reduced?'reduce':'no-preference'});
 await context.addInitScript(observeArt);
 await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin!==base){report.externalRequests.push(u.href);return route.abort();}return route.continue();});
 page=await context.newPage();page.on('pageerror',error=>report.pageErrors.push(String(error.stack||error)));
 page.on('response',response=>{if(response.status()>=400&&/cookie-.*v293|cookie-art-v293/.test(response.url()))report.assetFailures.push({url:response.url(),status:response.status()});});
 await page.goto(base+'/?edition=local&appv='+encodeURIComponent(version),{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__qa293&&window.SweetsLocalDebugV258?.ready&&window.CookieBoardV293&&window.CookiePayoutV293&&window.CookieAwardV293,null,{timeout:90000});
 const ready=await page.evaluate(()=>Promise.all([CookieBoardV293.ready,CookiePayoutV293.ready,CookieAwardV293.ready]));assert.deepEqual(ready,[true,true,true]);
 await page.evaluate(()=>document.fonts.ready);
 await page.locator('#manual-number-toggle').click();
 await page.waitForFunction(()=>SweetsLocalDebugV258.describe().manualNumbers&&__qa293.app.phase==='ready');
 await page.evaluate(bet=>{const q=__qa293,index=q.slots.findIndex(s=>(s.engine.kind||'cookie')==='cookie');if(!SweetsLocalDebugV258.setBets(q.app.bets.map((_,i)=>i===index?bet:0)))throw Error('Virtual bet setup failed');q.select(index);},scenario.bet);
 await page.locator('#manual-start').click();
 await page.waitForFunction(()=>{const q=__qa293,e=q.slots.find(s=>(s.engine.kind||'cookie')==='cookie').engine;return q.app.phase==='playing'&&e.idle;},null,{timeout:45000});
 const restored=await page.evaluate(fixture=>{
  const q=__qa293,index=q.slots.findIndex(s=>(s.engine.kind||'cookie')==='cookie'),slot=q.slots[index],e=slot.engine,phase=q.app.phase;
  const data=JSON.parse(JSON.stringify(fixture.fields),(_key,v)=>v&&Array.isArray(v.$set)?new Set(v.$set):v&&Array.isArray(v.$map)?new Map(v.$map):v);
  q.app.phase='ready';for(const [key,value]of Object.entries(data)){const d=Object.getOwnPropertyDescriptor(e,key);if(!d?.get||d.set)e[key]=value;}
  q.app.draws=fixture.draws.slice();q.app.paid[index]=false;e.running=true;e.paused=false;e.presentationRate=1;e.afterCheckpointRestoreV247?.();e.running=true;e.emit('waiting');q.app.phase=phase;
  e.pendingDraws=new Set(fixture.draws);q.nativeEvents=[];
  const native=e.emit;e.emit=function(event,detail={}){const result=Reflect.apply(native,this,arguments);q.nativeEvents.push({phase:event,gain:detail.gain,totalHundredths:this.totalHundredths,maxLink:this.maxLink,allClears:this.allClears,expectedWin:q.medalWin(q.app.locked[index],this.totalHundredths)});return result;};
  slot.dirtyMain=slot.dirtyMini=true;q.syncManualNumbers();q.scheduleUI(q.app);
  return {awards:SweetsAwardsV277.describe(),board:CookieBoardV293.describe(),payout:CookiePayoutV293.describe(),award:CookieAwardV293.describe()};
 },witnesses[scenario.kind]);
 assert.equal(restored.awards.received,0,'restoring a checkpoint does not replay awards');
 assert(restored.board.loaded&&restored.payout.loaded&&restored.award.ready&&restored.award.digitsReady);
 await page.waitForFunction(()=>{const q=__qa293,s=q.slots[q.active];return s.board?.querySelectorAll('.cookie-face').length>0&&[...s.board.querySelectorAll('.cookie-face')].every(i=>i.complete&&i.naturalWidth>0);});
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 return restored;
}

function inspectBoard(){
 const q=__qa293,slot=q.slots.find(s=>(s.engine.kind||'cookie')==='cookie'),observer=__cookieArt293;
 const bounds=node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
 const rows=[...document.querySelectorAll('.link-pay-row')].filter(node=>node.getAttribute('aria-hidden')!=='true').map(node=>({link:Number(node.dataset.link),value:node.querySelector('.payout-number').textContent,expected:q.app.bet(slot.i)*q.payoutTenths(Number(node.dataset.link))/10,height:node.clientHeight,chosen:node.classList.contains('chosen'),background:getComputedStyle(node).backgroundImage}));
 const css=getComputedStyle(document.documentElement),imageVars={row:css.getPropertyValue('--cp293-row').trim(),selected:css.getPropertyValue('--cp293-selected').trim()};
 return {board:bounds(slot.board),payout:bounds(document.getElementById('odds-panel')),documentWidth:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth),viewport:innerWidth,images:[...slot.board.querySelectorAll('.cookie-face')].map(image=>({loaded:image.complete&&image.naturalWidth>0,...observer.inspect(image)})),rows:rows.map(({background,...row})=>{const expected=imageVars[row.chosen?'selected':'row'];return {...row,usesPayoutArt:!!expected&&background===expected};}),payoutSources:observer.inspect(CookiePayoutV293.sprite('row')).sources,background:getComputedStyle(document.querySelector('#screen>.game')).backgroundImage};
}

function inspectAward({kind,mini,reduced}){
 const q=__qa293,slot=q.slots.find(s=>(s.engine.kind||'cookie')==='cookie'),diagnostics=SweetsAwardsV277.describe();
 const event=diagnostics.active.find(v=>v.game==='cookie'&&v.win>0&&v.phase===(kind==='clear'?'allclear':'link'));
 const canvas=document.querySelector('.award-presentation-'+(mini?'mini':'main')+'[data-game="cookie"]');
 if(!event||event.age<(reduced?20:280)||!canvas||canvas.hidden)return null;
 const style=getComputedStyle(canvas),rect=canvas.getBoundingClientRect();if(style.display==='none'||style.visibility==='hidden'||rect.width<5||rect.height<5)return null;
 const art=CookieAwardV293.describe(),traced=__cookieArt293.inspect(canvas),expectedSource='assets/cookie-art-v293/award-'+kind+'.webp';
 if(!traced.sources.includes(expectedSource)||art.last?.kind!==kind)return null;
 const tiny=document.createElement('canvas');tiny.width=tiny.height=96;const ctx=tiny.getContext('2d',{willReadFrequently:true});ctx.drawImage(canvas,0,0,96,96);
 const pixels=ctx.getImageData(0,0,96,96).data;let alpha=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]>20)alpha++;
 if(alpha<60)return null;
 return {event,diagnostics,art,alpha,...traced,pointerEvents:style.pointerEvents,box:{width:rect.width,height:rect.height},nativeEvents:q.nativeEvents.slice(),status:slot.panel.querySelector('.award-v277-status')?.textContent,selected:q.slots[q.active].engine.kind||'cookie',overlay:canvas.toDataURL('image/png')};
}

try{
 browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{}),args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 for(const scenario of scenarios){
  current=scenario.id;const started=Date.now();
  try{
   const restored=await open(scenario),board=await page.evaluate(inspectBoard);
   assert(board.images.length>0&&board.images.every(image=>image.loaded&&image.sources.includes('assets/cookie-art-v293/board-pieces.webp')),'visible Cookie cells use the new detailed sheet');
   assert(board.rows.length>0&&board.rows.every(row=>Number(row.value.replaceAll(',',''))===row.expected),'live payout rows match native bet and payout rules');
   assert(board.rows.every(row=>row.usesPayoutArt),'the actual payout rows paint the generated pastry plaque');
   assert(board.payoutSources.includes('assets/cookie-art-v293/payout-furniture.webp'));
   assert(board.documentWidth<=board.viewport+2,'no horizontal page overflow');
   assert(board.background.includes('assets/arcade-show-v91/cookie.webp'),'the original Cookie scene remains');
   await page.screenshot({path:path.join(output,scenario.id+'-board.png')});
   if(scenario.mini){
    await page.evaluate(()=>{const q=__qa293;q.select(q.slots.findIndex(s=>s.engine.kind==='gelato'));q.scheduleUI(q.app);});
    await page.waitForFunction(()=>{const q=__qa293,s=q.slots.find(s=>(s.engine.kind||'cookie')==='cookie');return __cookieArt293.inspect(s.miniCanvas).sources.includes('assets/cookie-art-v293/board-pieces.webp');});
   }
   const next=witnesses[scenario.kind].next;
   await page.waitForFunction(number=>{const button=document.querySelector('#manual-number-grid button[data-number="'+number+'"]');return button&&!button.disabled;},next,{timeout:30000});
   const pending=page.waitForFunction(inspectAward,{kind:scenario.kind,mini:!!scenario.mini,reduced:!!scenario.reduced},{polling:'raf',timeout:scenario.kind==='clear'?100000:30000});
   await page.locator('#manual-number-grid button[data-number="'+next+'"]').click();
   const handle=await pending,evidence=await handle.jsonValue();await handle.dispose();
   assert.equal(evidence.pointerEvents,'none');assert.equal(evidence.diagnostics.errors,0);
   assert.equal(evidence.selected,scenario.mini?'gelato':'cookie');
   const native=evidence.nativeEvents.find(value=>value.phase===evidence.event.phase&&value.totalHundredths===evidence.event.gain);
   assert(native,'popup follows a genuine native award event');assert.equal(evidence.event.win,native.expectedWin,'cue preserves the exact native medal amount');
   assert.equal(evidence.art.last.win,native.expectedWin);assert.equal(evidence.art.last.total,true);
   assert.equal(evidence.art.last.label,scenario.kind==='clear'?native.allClears+'回目の全消し達成！':native.maxLink+'枚リンク達成！');
   assert.equal(evidence.art.last.source,'assets/cookie-art-v293/award-'+scenario.kind+'.webp');
   assert(evidence.art.last.rasterNumbers&&evidence.art.rasterAmounts>0);assert.equal(evidence.art.fallbackAmounts,0);
   assert(evidence.sources.includes('assets/cookie-art-v293/award-digits.webp'),'visible WIN uses the illustrated numeral atlas');
   assert(!evidence.sources.includes('assets/award-art-v291/themed-cutin-atlas.webp'),'Cookie overlay does not render the prior common atlas');
   if(scenario.mini)assert(evidence.texts.includes(evidence.event.label),'miniature paints the compact live LINK label');
   else assert(evidence.texts.includes(evidence.art.last.label)&&evidence.texts.includes('獲得合計'),'live labels are painted inside the illustrated design');
   assert(evidence.status.includes(Number(native.expectedWin).toLocaleString('ja-JP')),'accessible native award amount remains available');
   if(scenario.mini)assert(evidence.art.miniPaints>0);
   else assert(evidence.art.mainPaints>0);
   if(scenario.reduced){assert(evidence.diagnostics.reducedMotion);assert.equal(evidence.diagnostics.maxMainParticles,0);assert.equal(evidence.diagnostics.maxMiniParticles,0);}
   await fs.writeFile(path.join(output,scenario.id+'-overlay.png'),Buffer.from(evidence.overlay.split(',')[1],'base64'));delete evidence.overlay;
   await page.screenshot({path:path.join(output,scenario.id+'-award.png')});
   report.cases.push({id:scenario.id,status:'passed',durationMs:Date.now()-started,scenario,restored,board,evidence});
   console.log('COOKIE_V293_BROWSER_CASE_PASS',scenario.id);
  }catch(error){
   const failure={id:scenario.id,message:String(error),stack:error.stack};
   if(page)try{failure.state=await page.evaluate(()=>({award:window.CookieAwardV293?.describe(),awards:window.SweetsAwardsV277?.describe(),events:window.__qa293?.nativeEvents}));await page.screenshot({path:path.join(output,scenario.id+'-failure.png')});}catch{}
   report.failures.push(failure);console.error('COOKIE_V293_BROWSER_CASE_FAIL',scenario.id,String(error));
  }finally{await context?.close();context=null;page=null;await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');}
 }
 assert.deepEqual(report.pageErrors,[]);assert.deepEqual(report.assetFailures,[]);assert.deepEqual(report.apiRequests,[]);assert.deepEqual(report.externalRequests,[]);
 assert.equal(report.failures.length,0,'failed Cookie scenarios: '+report.failures.map(v=>v.id).join(', '));
 assert.equal(report.cases.length,scenarios.length);
 console.log('COOKIE_V293_BROWSER_PASS',JSON.stringify({version,kindFilter,plannedCases:report.plannedCases,cases:report.cases.length,artwork:'board, payout, LINK, ALL CLEAR, dynamic digits',nativePayouts:true}));
}catch(error){report.failure={id:current,message:String(error),stack:error.stack};throw error;}
finally{await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');await context?.close().catch(()=>{});await browser?.close().catch(()=>{});await new Promise(resolve=>server.close(resolve));}

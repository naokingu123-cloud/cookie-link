import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import {once} from 'node:events';
import {spawn} from 'node:child_process';
import {WebSocket} from 'ws';
import {chromium} from 'playwright';
const sleep=ms=>new Promise(r=>setTimeout(r,ms)),out='qa-client-v243';await fs.mkdir(out,{recursive:true});
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'client-v243-'));
const allocator=net.createServer();allocator.listen(0,'127.0.0.1');await once(allocator,'listening');const port=allocator.address().port;await new Promise(r=>allocator.close(r));
const base='http://127.0.0.1:'+port,admin='v243-isolated-admin';
const server=spawn(process.execPath,['server.mjs'],{cwd:process.cwd(),env:{...process.env,PORT:String(port),SWEETS_DATA_FILE:path.join(temp,'core.json'),SWEETS_DATA_DIR:temp,SWEETS_ADMIN_TOKEN:admin,SWEETS_PLAYER_STABLE_MS:'500',SWEETS_BET_DURATION_MS:'15000',SWEETS_ROUND_START_DELAY_MS:'300',SWEETS_RESULT_GRACE_MS:'8000'},stdio:['ignore','pipe','pipe']});
let logs='',browser,context,page,monitor,ws;server.stdout.on('data',b=>logs+=b);server.stderr.on('data',b=>logs+=b);
const errors=[],warnings=[],joins=[],forecastChecks=[];
async function call(route,{session,body,adminOnly=false}={}){if(route.endsWith('/round/ball')&&body?.ballIndex===6){const current=await call('/api/machines/public-01/state',{session});await sleep(Math.max(0,Number(current.round?.thinkingClosesAt||0)-Date.now()+40));}const response=await fetch(base+route+(adminOnly?'?adminToken='+admin:''),{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(session?{'X-Player-Id':session.player.id,Authorization:'Bearer '+session.token}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(8000)});const data=await response.json();assert.equal(response.ok,true,route+' '+JSON.stringify(data));return data;}
async function until(fn,label,ms=40000){const end=Date.now()+ms;while(Date.now()<end){const v=await fn();if(v)return v;await sleep(300);}throw Error(label);}
try{
 await until(async()=>{try{return (await fetch(base+'/api/health')).ok;}catch{return false;}},'server boot',15000);
 const host=await call('/api/session',{body:{displayName:'SERVER ROULETTE'}});
 ws=new WebSocket('ws://127.0.0.1:'+port+'/ws?machineId=public-01&playerId='+host.player.id+'&token='+host.token);ws.on('error',()=>{});await once(ws,'open');
 browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{}),args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 context=await browser.newContext({viewport:{width:1366,height:900}});
 await context.addInitScript(()=>{
  window.__storage243={};const native=Storage.prototype.setItem;
  Storage.prototype.setItem=function(k,v){window.__storage243[k]=(window.__storage243[k]||0)+1;return native.call(this,k,v);};
 });
 page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(['error','warning'].includes(m.type()))warnings.push(m.text().slice(0,350));});
 page.on('request',r=>{if(new URL(r.url()).pathname.endsWith('/round/join'))try{joins.push(r.postDataJSON());}catch{}});
 await page.route('**/assets/shared-machine-v176.js*',async route=>{
  const code=await fs.readFile('assets/shared-machine-v176.js','utf8');
  // Observation only: all runtime source above this reference is exact.
  await route.fulfill({contentType:'application/javascript',body:code+'\n;window.__client243={app,slots};\n'});
 });
 const version=JSON.parse(await fs.readFile('app-version.json','utf8')).version;
 await page.goto(base+'/?appv='+version,{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>window.__client243&&window.SweetsSharedMachine?.client?.online&&window.SweetsStationsV235,{timeout:60000});
 await sleep(5500);
 assert.equal(await page.evaluate(()=>window.__client243.app.engines.length),10);
 const playerId=await page.evaluate(()=>window.SweetsSharedMachine.client.playerId);
 await call('/api/admin/machines/public-01/host/register',{session:host,body:{},adminOnly:true});
 const round=await until(async()=>{const s=await call('/api/machines/public-01/state',{session:host});return s.round?.phase==='PLAYING'?s.round:null;},'normal round PLAYING');
 await page.waitForFunction(id=>window.SweetsSharedMachine.active?.roundId===id,round.id,{timeout:20000});
 await sleep(Math.max(0,Number(round.drawStartsAt)-Date.now()+20));
 monitor=await context.newPage();monitor.on('pageerror',e=>errors.push('monitor '+String(e)));
 await monitor.route('**/*',async route=>{const q=new URL(route.request().url()).searchParams;if(q.get('serverHost')==='1'||q.get('serverSettlementWorker')==='1')return route.fulfill({contentType:'text/html',body:'<!doctype html><title>Isolated transport host</title>'});return route.continue();});
 await monitor.goto(base+'/monitor.html?adminToken='+admin,{waitUntil:'domcontentloaded'});
 // The server host is a test transport; the monitor and player remain real.
 await page.bringToFront();
 const numbers=[3,7,11];let firstBatchTotals;
 for(let i=0;i<numbers.length;i++){
  await call('/api/machines/public-01/round/ball',{session:host,body:{roundId:round.id,ballIndex:i+1,number:numbers[i],eventId:round.id+':qa:'+(i+1)}});
  const forecast=await until(async()=>{const data=await call('/api/admin/machines/public-01',{adminOnly:true});const f=data.hitForecasts?.[playerId];return f?.ballCount===i+1&&f.gains?.length===25?f:null;},'actual ten-game forecast after ball '+(i+1),50000);
  for(let n=1;n<=25;n++){if(numbers.slice(0,i+1).includes(n))assert.equal(forecast.gains[n-1],null);else assert.ok(Number.isSafeInteger(forecast.gains[n-1])&&forecast.gains[n-1]>=0);}
  const batchTotals=await page.evaluate(()=>window.__client243.app.engines.filter(e=>e.kind==='cookie').map(e=>e.totalHundredths));
  if(i===0)firstBatchTotals=batchTotals;if(i===1)assert.deepEqual(batchTotals,firstBatchTotals,'second number only collects in Cookie; Six Drop now receives every number');
  const sixSingle=await page.evaluate(()=>{const e=window.__client243.app.engines.find(x=>x.kind==='candy');return {version:e.rulesVersion,drawMode:e.drawMode,accepted:e.accepted};});
  assert.equal(sixSingle.version,247);assert.equal(sixSingle.drawMode,'single');assert.equal(sixSingle.accepted,i+1);
  forecastChecks.push({ballCount:i+1,available:forecast.gains.filter(x=>x!==null).length,positive:forecast.gains.filter(x=>x>0).length,baseWin:forecast.baseWin});
  await monitor.waitForFunction(id=>{const row=document.querySelector('.compact-player-v242[data-player-id="'+id+'"]');return row&&[...row.querySelectorAll('.forecast-value-v242')].some(n=>/^\+/.test(n.textContent));},playerId,{timeout:15000});
 }
 const dom=await monitor.evaluate(id=>{const row=document.querySelector('.compact-player-v242[data-player-id="'+id+'"]');return {tiles:row.querySelectorAll('.forecast-tile-v242').length,amounts:[...row.querySelectorAll('.forecast-value-v242')].map(n=>n.textContent),ratios:[...row.querySelectorAll('.forecast-ratio-v242')].map(n=>n.textContent)};},playerId);
 assert.equal(dom.tiles,25);assert.ok(dom.ratios.some(s=>/^\+.*倍/.test(s)));
 await page.locator('#tab2').click({force:true});
 await page.waitForFunction(()=>document.body.classList.contains('carnival-active')&&document.querySelector('#carnival-heading[data-progressive247="1"]'));
 const sixHud=await page.evaluate(()=>{const h=document.querySelector('.sd247-roles'),e=window.SixDropV247.engine;return {display:getComputedStyle(h).display,height:h.getBoundingClientRect().height,cards:h.querySelectorAll('section').length,label:document.querySelector('#carnival-heading').textContent,rules:e.rulesVersion,mode:e.drawMode,processed:e.processed,accepted:e.accepted,feed:e.state?.feed,carry:window.SixDropV247.carry};});
 assert.notEqual(sixHud.display,'none','new role payout panel must override the old glass filter');assert.ok(sixHud.height>40);assert.equal(sixHud.cards,3);assert.equal(sixHud.rules,247);assert.equal(sixHud.mode,'single');assert.match(sixHud.label,/全消し.*WIN/);
 await monitor.screenshot({path:out+'/monitor-forecast.png'});await page.screenshot({path:out+'/sixdrop-v247-desktop.png'});
 await page.setViewportSize({width:390,height:844});await sleep(350);await page.screenshot({path:out+'/sixdrop-v247-mobile.png'});await page.setViewportSize({width:1366,height:900});
 console.log('SIXDROP_V247_BROWSER_HUD',JSON.stringify(sixHud));
 // The actual button triggers the actual server cancellation and client rejoin.
 await monitor.waitForFunction(id=>window.SweetsMonitorSnapshotV242?.round?.id===id,round.id);
 const forcedResponse=monitor.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/bet-now')&&r.request().method()==='POST');
 await monitor.locator('#server-bet-now').click();const forced=await (await forcedResponse).json();assert.equal(forced.ok,true);assert.equal(forced.refundedTotal,30000);
 await page.bringToFront();
 await page.waitForFunction(id=>window.SweetsSharedControllerV224.describe().joinedRoundId===id,forced.roundId,{timeout:12000});
 assert.equal(joins.filter(j=>j.roundId===forced.roundId).length,1,'exactly one next-round reservation');
 assert.equal(await page.evaluate(()=>window.__client243.app.credit),970000,'refund followed by one new 30,000 BET');
 const queueKeys=['sweets-shared-loss-v224','sweets-shared-normal-settlements-v225','sweets-shared-settlement-review-v225'];
 const queueWrites=()=>page.evaluate(keys=>keys.reduce((n,k)=>n+(window.__storage243[k]||0),0),queueKeys);
 const beforeWrites=await queueWrites();await sleep(4500);const repeatedWrites=await queueWrites()-beforeWrites;assert.equal(repeatedWrites,0,'steady refund notices must not repeatedly write storage');
 await until(async()=>{const s=await call('/api/machines/public-01/state',{session:host});return s.round?.id===forced.roundId&&s.round.phase==='PLAYING';},'forced BET zero-second transition');
 await page.waitForFunction(id=>window.SweetsSharedMachine.active?.roundId===id&&window.__client243.app.phase==='playing',forced.roundId,{timeout:12000});
 const newState=(await call('/api/machines/public-01/state',{session:host})).round;await sleep(Math.max(0,newState.drawStartsAt-Date.now()+10));
 await call('/api/machines/public-01/round/ball',{session:host,body:{roundId:forced.roundId,ballIndex:1,number:4,eventId:forced.roundId+':1'}});
 await page.waitForFunction(()=>window.__client243.app.draws.includes(4),null,{timeout:12000});

 assert.equal(await page.evaluate(()=>window.__client243.app.credit),970000);
 // No foreground rAF or normal UI scheduler is allowed to advance the payout.
 // Chromium remains runnable while document.hidden is overridden to emulate
 // background-tab throttling, so native Promise timers still have a chance.
 const hidden=await page.evaluate(()=>{
  const a=window.__client243.app;
  // Observe one completed round without the next AUTO REBET changing CREDIT.
  window.SweetsSharedControllerV224.setAutoRebet(false);
  window.__v246Phases=[];window.__v246Award=null;window.__v246AdvanceResult=0;
  const nativeAdvance=a.advanceResult;
  a.advanceResult=function(...args){window.__v246AdvanceResult++;return nativeAdvance.apply(this,args);};
  const previous=a.onChange;
  a.onChange=function(...args){
   if(window.__v246Phases.at(-1)!==a.phase)window.__v246Phases.push(a.phase);
   if(['result','paying','complete'].includes(a.phase)&&a.result)window.__v246Award={phase:a.phase,win:a.totalWin,roundWins:[...a.roundWins],credit:a.credit};
   return previous.apply(this,args);
  };
  Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});
  document.dispatchEvent(new Event('visibilitychange'));
  return {worker:window.SweetsHiddenGameV246?.workerActive,hidden:document.hidden};
 });
 assert.equal(hidden.hidden,true);
 assert.equal(hidden.worker,true,'the real browser must have a hidden gameplay worker');
 const more=[8,12,16,20,24,2,6];
 for(let i=0;i<more.length;i++){
  await call('/api/machines/public-01/round/ball',{session:host,body:{roundId:forced.roundId,ballIndex:i+2,number:more[i],eventId:forced.roundId+':hidden-'+(i+2)}});
  await sleep(130);
 }
 await until(async()=>{
  const value=await page.evaluate(()=>({
   phase:window.__client243?.app.phase,
   phases:window.__v246Phases||[],
   hidden:document.hidden,credit:window.__client243?.app.credit,
   processed:window.__client243?.app.engines?.map(e=>e.processed||0),
   shared:window.SweetsSharedControllerV224?.describe?.()
  }));
  return value.phases.includes('result')&&value.phases.includes('complete')&&value.phase==='ready'?value:null;
 },'hidden real 9-game result, payout, and next ready',140000);
 const hiddenState=await page.evaluate(()=>({credit:window.__client243.app.credit,phases:window.__v246Phases,award:window.__v246Award,advanceResult:window.__v246AdvanceResult}));
 assert.ok(hiddenState.award&&hiddenState.advanceResult>0,'native result logic advances while hidden');
 assert.equal(hiddenState.award.win,hiddenState.award.roundWins.reduce((a,b)=>a+b,0),'ten game award sum');
 assert.equal(hiddenState.credit,970000+hiddenState.award.win,'one exact credited award, no AUTO REBET in this assertion');
 const ledger=await call('/api/admin/machines/public-01',{adminOnly:true});
 const account=ledger.payoutControlV3.players.find(p=>p.playerId===playerId);
 assert.equal(account.lifetimeBet,30000,'the cancelled round must not be counted as IN');
 assert.equal(account.lifetimeWin,hiddenState.award.win,'server OUT equals the native game result');
 assert.equal(account.wallet.credit,hiddenState.credit,'local and server wallets agree');
 assert.ok(account.sixDropV247&&account.sixDropV247.version===247,'server owns the progressive ledger');
 if(hiddenState.award.roundWins[2]===0)assert.equal(account.sixDropV247.bankUnits,0,'a zero Six Drop WIN clears its bank even when other games win');
 else assert.ok(account.sixDropV247.bankUnits>0,'positive Six Drop WIN preserves its accumulated bank');
 const clientCarry=await page.evaluate(()=>window.SixDropV247.carry);assert.equal(clientCarry.bankUnits,account.sixDropV247.bankUnits,'fresh board inherits acknowledged server carry');
 console.log('SIXDROP_V247_SERVER_CARRY',JSON.stringify({sixWin:hiddenState.award.roundWins[2],server:account.sixDropV247,client:clientCarry}));
 console.log('HIDDEN_NATIVE_ROUND',JSON.stringify(hiddenState));
 await page.screenshot({path:out+'/hidden-nine-games-complete.png'});
 assert.equal(errors.length,0,JSON.stringify(errors));
 assert.ok(!warnings.some(s=>s.includes('display unavailable')),JSON.stringify(warnings));
 const report={version,hiddenState,hiddenNineGameResultAndPayout:true,clientGames:10,forecastChecks,monitorTiles:dom.tiles,monitorRatios:true,normalRoundStarted:true,forcedRejoined:true,forcedCountdownStarted:true,nextBallReceived:true,forcedRoundBetRequests:joins.filter(j=>j.roundId===forced.roundId).length,confirmedRefund:30000,creditAfterRefundAndNewBet:970000,unchangedRefundQueueWrites4500ms:repeatedWrites,pageErrors:errors};
 await fs.writeFile('docs/client-v246-qa.json',JSON.stringify(report,null,2)+'\n');await fs.writeFile(out+'/result.json',JSON.stringify(report,null,2));console.log('CLIENT_BROWSER_V243_PASS',JSON.stringify(report));
}catch(error){
 console.error('CLIENT_BROWSER_V243_FAIL',error);
 if(page){try{
  const state=await page.evaluate(()=>({phase:window.__client243?.app.phase,hiddenPhases:window.__v246Phases,award:window.__v246Award,resultAdvances:window.__v246AdvanceResult,draws:window.__client243?.app.draws,controller:window.SweetsSharedControllerV224?.describe(),slots:window.__client243?.slots.map(s=>({kind:s.engine?.kind,phase:s.engine?.phase,processed:s.engine?.processed,accepted:s.engine?.accepted,busy:s.engine?.busy,fx:!!s.engine?.fx,idle:s.engine?.idle,queue:s.engine?.queue?.length,reach:s.reachStatus,base:s.tabReachBase,cacheVersion:s.tabReachVersion,engineVersion:s.engine?.version}))}));
  console.error('CLIENT_STATE',JSON.stringify(state));
 }catch{}}
 console.error(logs.slice(-6000));throw error;
}finally{await browser?.close();ws?.terminate();if(server.exitCode===null){const done=once(server,'exit');server.kill('SIGTERM');await done;}await fs.rm(temp,{recursive:true,force:true});}

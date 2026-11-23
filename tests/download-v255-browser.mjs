/* Real isolated Download API, browser storage, recorded playback and monitor.
 * Never contacts the public game server or accepts a browser-supplied payout.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import {once} from 'node:events';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';

const output='qa-download-v255',adminToken='download-v255-isolated-admin';
await fs.mkdir(output,{recursive:true});
const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'sweets-download-browser-v255-'));
const version=JSON.parse(await fs.readFile('app-version.json','utf8')).version;
const report={version,scope:'Isolated real server preparation, offline local playback, persisted resume, authoritative wallet and download-only administration',screens:[],pageErrors:[],warnings:[],requests:[],webSockets:[],externalRequests:[],milestones:[]};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function milestone(stage,details={}){const entry={stage,...details};report.milestones.push(entry);console.log('DOWNLOAD_BROWSER_STAGE',JSON.stringify(entry));}
async function until(fn,label,timeout=60000){
 const deadline=Date.now()+timeout;
 while(Date.now()<deadline){const result=await fn();if(result)return result;await sleep(200);}
 throw Error('Timed out: '+label);
}
async function allocatePort(){
 const socket=net.createServer();socket.listen(0,'127.0.0.1');await once(socket,'listening');
 const port=socket.address().port;await new Promise(resolve=>socket.close(resolve));return port;
}
async function launchServer({port,directory=path.join(temporary,'server'),extra={}}={}){
 port??=await allocatePort();
 await fs.mkdir(directory,{recursive:true});
 const child=spawn(process.execPath,['server.mjs'],{cwd:process.cwd(),env:{...process.env,PORT:String(port),SWEETS_DATA_FILE:path.join(directory,'core.json'),SWEETS_DATA_DIR:directory,SWEETS_ADMIN_TOKEN:adminToken,SWEETS_SERVER_EDITION:'download',SWEETS_DOWNLOAD_ENABLED:'1',SWEETS_CONTINUOUS_PHYSICAL_ROUNDS:'0',...extra},stdio:['ignore','pipe','pipe']});
 const server={child,port,directory,base:'http://127.0.0.1:'+port,logs:''};
 child.stdout.on('data',data=>server.logs+=data);child.stderr.on('data',data=>server.logs+=data);
 child.on('error',error=>server.logs+='\n'+String(error));
 await until(async()=>{if(child.exitCode!==null)throw Error('isolated server exited: '+server.logs.slice(-2000));try{const response=await fetch(server.base+'/api/health',{signal:AbortSignal.timeout(1000)});return response.ok?await response.json():false;}catch{return false;}},'isolated Download server HTTP',30000);
 return server;
}
async function stopServer(server){
 if(!server||server.child.exitCode!==null||server.child.signalCode)return;
 const done=once(server.child,'exit');
 server.child.kill('SIGTERM');
 await Promise.race([done,sleep(8000)]);
 if(server.child.exitCode===null&&!server.child.signalCode){server.child.kill('SIGKILL');await done;}
}
async function waitReady(server){
 return until(async()=>{
  const response=await fetch(server.base+'/api/health'),health=await response.json();
  assert.equal(health.serverEdition,'download');
  if(health.download?.error&&!health.download.ready)throw Error('Download worker unavailable: '+health.download.error);
  return health.download?.ready===true?health:false;
 },'real headless Download worker',90000);
}
let server,missingServer,browser,context,page,adminContext,adminPage,identity;
let previousServerLogs='';
async function call(action,{body,admin=false,sessionId}={}){
 const route=admin?'/api/admin/machines/public-01/download-v255/state':'/api/machines/public-01/download-v255/'+action;
 const url=new URL(route,server.base);if(sessionId)url.searchParams.set('sessionId',sessionId);
 const headers={'content-type':'application/json',...(admin?{'x-admin-token':adminToken}:identity?{Authorization:'Bearer '+identity.token,'x-player-id':identity.playerId}:{})};
 const response=await fetch(url,{method:body===undefined?'GET':'POST',headers,...(body===undefined?{}:{body:JSON.stringify(body)})});
 const value=await response.json();assert.equal(response.ok,true,route+' '+JSON.stringify(value).slice(0,500));return value;
}
async function state(){return page.evaluate(()=>window.SweetsDownloadV255?.describe());}
async function betSwitch(visible,label){
 await page.waitForFunction(expected=>{const button=document.querySelector('.v250-shared-bet-switch');return !!button&&button.parentElement.hidden===!expected&&button.disabled===!expected;},visible,{timeout:10000});
 const check=await page.evaluate(expected=>{
  const button=document.querySelector('.v250-shared-bet-switch'),before={unit:window.SweetsArcadeTabsV249.describe().sharedBetUnit,bets:window.SweetsDownloadV255.describe().bets,wallet:window.SweetsDownloadV255.describe().wallet};
  if(!expected)button.onclick();
  return {phase:window.SweetsDownloadV255.describe().phase,visible:!button.parentElement.hidden,disabled:button.disabled,tabIndex:button.tabIndex,inRoulette:document.getElementById('cookie-roulette').contains(button),before,after:{unit:window.SweetsArcadeTabsV249.describe().sharedBetUnit,bets:window.SweetsDownloadV255.describe().bets,wallet:window.SweetsDownloadV255.describe().wallet}};
 },visible);
 assert.equal(check.inRoulette,true,label+' unit control is at the roulette');assert.equal(check.visible,visible,label+' BET-only visibility');assert.equal(check.tabIndex,visible?0:-1);
 assert.deepEqual(check.after,check.before,label+' cannot change locked units, wagers or wallet');
 (report.betSwitch??=[]).push({label,...check});return check;
}
async function waitPlayback(predicate,label,timeout){
 return until(async()=>{
  const current=await state();
  if(current&&!current.started&&/保存したゲームを再開できませんでした|再生を一時停止しました。保存した位置から再開できます/.test(current.error||''))throw Error(label+': '+current.error);
  return predicate(current)?current:false;
 },label,timeout);
}
async function pausePlaybackWhen(condition,label,timeout){
 return until(()=>page.evaluate(async({stableHits,minimumMs})=>{
  const playback=window.SweetsDownloadV255,current=playback?.describe();
  if(current&&!current.started&&/保存したゲームを再開できませんでした|再生を一時停止しました。保存した位置から再開できます/.test(current.error||''))throw Error(current.error);
  if(!current?.started||!current.playing)return false;
  if(stableHits){
   if(current.stableBall<1||current.stableBall>=7||current.cursor!==current.stableBall||current.wait.settling||stableHits[current.stableBall].atMs-current.playbackMs<1000)return false;
  }else if(current.playbackMs<minimumMs)return false;
  // Observe and pause in the same browser task: a separate automation call
  // can otherwise cross the next HIT before the pause reaches the page.
  playback.pause();
  await playback.checkpoint();
  return playback.describe();
 },condition),label,timeout);
}
async function waitForPlaybackComplete(recording){
 const initial=await state(),nativeLimit=Number(initial.wait?.nativeTimeoutMs)||90000;
 // Every recorded HIT has its own native-animation wait. The old whole-round
 // allowance of recording+180s could expire while a valid replay still moved:
 // the v278 failures had already accumulated 228/240s across earlier HITs.
 // Keep the runtime's unchanged per-HIT bound and a separate no-progress
 // watchdog, instead of treating cumulative animation time as one stalled HIT.
 const remainingHits=Math.max(0,8-initial.stableBall),remainingRecording=Math.max(0,recording.durationMs-initial.playbackMs);
 const timeout=Math.max(180000,remainingRecording+remainingHits*nativeLimit+30000),noProgressLimit=nativeLimit+20000;
 report.completionBudget={remainingHits,remainingRecordingMs:remainingRecording,nativePerHitLimitMs:nativeLimit,noProgressLimitMs:noProgressLimit,totalLimitMs:timeout};
 report.playbackProgress=[];
 let progressAt=Date.now(),lastKey='',lastBoundary='',lastSample=0;
 return waitPlayback(current=>{
  if(!current)return false;
  const now=Date.now(),key=[current.cursor,current.stableBall,Math.floor(current.playbackMs/250),current.phase].join('/');
  if(key!==lastKey){lastKey=key;progressAt=now;}
  const boundary=current.cursor+'/'+current.stableBall;
  if(boundary!==lastBoundary||now-lastSample>=30000||current.localComplete){
   const row={cursor:current.cursor,stableBall:current.stableBall,playbackMs:current.playbackMs,phase:current.phase,timing:current.timing,wait:current.wait};
   report.playbackProgress.push(row);lastSample=now;
   if(boundary!==lastBoundary){milestone('offline-playback-progress',{cursor:current.cursor,stableBall:current.stableBall,playbackMs:current.playbackMs,stage:current.wait?.stage});lastBoundary=boundary;}
  }
  if(now-progressAt>noProgressLimit)throw Error('Offline playback made no progress within '+noProgressLimit+'ms: '+JSON.stringify(current.wait||current));
  return current.localComplete;
 },'offline recorded playback and native payout complete',timeout);
}
async function capture(name){
 const details=await page.evaluate(()=>{
  const panel=document.getElementById('download-v255-panel'),r=panel?.getBoundingClientRect();
  return {width:innerWidth,height:innerHeight,horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1,panel:r?{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}:null,state:window.SweetsDownloadV255?.describe()};
 });
 assert.equal(details.horizontalOverflow,false,name+' must not cause horizontal page overflow');
 if(details.panel)assert.ok(details.panel.x>=-1&&details.panel.right<=details.width+1,name+' playback panel must fit the viewport');
 await page.screenshot({path:path.join(output,name+'.png'),fullPage:true});report.screens.push({file:name+'.png',...details});return details;
}
async function completionPanel(pending){
 const expected=pending?'8/8球 · 同期待ち':'8/8球 · 完了';
 await page.waitForFunction(label=>document.querySelector('#download-v255-panel [data-dl-balls]')?.textContent===label,expected,{timeout:5000});
 const view=await page.evaluate(()=>{
  const panel=document.getElementById('download-v255-panel'),toggle=panel.querySelector('[data-dl-action="toggle"]'),p=panel.getBoundingClientRect();
  const rows=[...document.querySelectorAll('#result-games .result-game[data-game-index]')].filter(row=>!row.hidden).map(row=>{
   const r=row.getBoundingClientRect(),style=getComputedStyle(row);
   return {index:Number(row.dataset.gameIndex),visible:r.width>0&&r.height>0&&style.display!=='none'&&style.visibility!=='hidden'&&Number(style.opacity)>.99,inside:r.left>=-1&&r.right<=innerWidth+1&&r.top>=-1&&r.bottom<=innerHeight+1,overlap:Math.min(r.right,p.right)>Math.max(r.left,p.left)+.5&&Math.min(r.bottom,p.bottom)>Math.max(r.top,p.top)+.5};
  });
  return {collapsed:panel.dataset.collapsed,expanded:toggle.getAttribute('aria-expanded'),toggle:toggle.textContent,header:panel.querySelector('[data-dl-balls]').textContent,panel:{x:p.x,y:p.y,width:p.width,height:p.height},rows};
 });
 assert.equal(view.collapsed,'true');assert.equal(view.expanded,'false');assert.match(view.toggle,/^[+＋]$/);assert.equal(view.header,expected);
 assert.deepEqual(view.rows.map(row=>row.index),Array.from({length:10},(_,i)=>i),'the result contains every participating game');
 assert.ok(view.rows.every(row=>row.visible&&row.inside&&!row.overlap),'all ten result rows remain visible and clear of the collapsed Download panel');
 return view;
}
async function secureContext(viewport){
 const result=await browser.newContext({viewport,serviceWorkers:'allow'});
 await result.route('**/*',route=>{
  const request=route.request(),url=new URL(request.url());
  if(/^https?:$/.test(url.protocol)&&url.origin!==server.base){report.externalRequests.push({method:request.method(),origin:url.origin,path:url.pathname});return route.abort('blockedbyclient');}
  return route.continue();
 });
 await result.routeWebSocket('**/*',socket=>{report.webSockets.push(new URL(socket.url()).pathname);socket.close();});
 return result;
}
try{
 server=await launchServer();report.health=await waitReady(server);
 browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{}),args:['--enable-unsafe-swiftshader']});
 context=await secureContext({width:390,height:844});page=await context.newPage();
 page.on('pageerror',error=>report.pageErrors.push(String(error.stack||error)));
 page.on('console',message=>{if(['error','warning'].includes(message.type()))report.warnings.push(message.text().slice(0,500));});
 page.on('request',request=>{const url=new URL(request.url());if(url.pathname.startsWith('/api/'))report.requests.push({method:request.method(),path:url.pathname});});
 await page.goto(server.base+'/?appv='+encodeURIComponent(version),{waitUntil:'domcontentloaded'});
 await page.waitForSelector('#edition-choice-v255');
 await sleep(400);
 assert.equal(await page.evaluate(()=>!!window.SweetsSharedMachine||!!window.SweetsDownloadV255),false,'the chooser does not start either transport');
 assert.equal(report.requests.filter(r=>r.path==='/api/session').length,0,'choosing a mode does not silently create a player session');
 for(const viewport of [{width:390,height:844},{width:844,height:390},{width:1366,height:900}]){
  await page.setViewportSize(viewport);await capture('edition-choice-'+viewport.width);
 }
 await page.setViewportSize({width:390,height:844});
 await page.locator('[data-edition-choice="download"]').click();
 await page.waitForFunction(()=>window.SweetsDownloadV255?.describe().hydrated,null,{timeout:60000});
 await betSwitch(true,'initial Download BET');
 report.initial=await state();assert.equal(report.initial.streamingClientPresent,false);assert.deepEqual(report.initial.bets,Array(10).fill(0));
 identity=await page.evaluate(base=>window.SweetsGuestEntryV237.readSession('sweets-shared-session-v176',base),server.base);
 assert.equal(identity.playerId,report.initial.playerId);assert.ok(identity.token);
 // Reproduce a previously saved playerId whose token is no longer accepted.
 // A static asset download is not proof of player ownership. Never create
 // another account or change the server wallet because of this mismatch.
 const sessionsBeforeMismatch=report.requests.filter(request=>request.path==='/api/session').length;
 await page.evaluate(base=>{const G=window.SweetsGuestEntryV237,old=G.readSession('sweets-shared-session-v176',base);G.writeSession('sweets-shared-session-v176',base,{...old,token:'invalid-download-v257-token'});},server.base);
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.SweetsDownloadV255?.describe().identityConflict===true,null,{timeout:30000});
 const rejected=await state();
 await betSwitch(false,'identity not authenticated');
 assert.equal(rejected.playerId,identity.playerId,'client must preserve the old player identity');
 assert.match(rejected.error,/CREDIT/,'client must explain the protected account');
 assert.equal(await page.locator('[data-dl-action="fresh"]').isVisible(),true,'explicit alternate-account recovery is available');
 assert.equal(report.requests.filter(request=>request.path==='/api/session').length,sessionsBeforeMismatch,'invalid old token must not create another server player');
 await page.evaluate(({base,identity})=>window.SweetsGuestEntryV237.writeSession('sweets-shared-session-v176',base,identity),{base:server.base,identity});
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.SweetsDownloadV255?.describe().hydrated,null,{timeout:30000});
 assert.equal((await state()).playerId,identity.playerId,'correct stored credentials restore original CREDIT');
 const initialProfile=await call('profile');
 const profile={...initialProfile.profile,name:'サーバーQA'};
 await call('profile',{body:{profile}});
 await page.evaluate(()=>{const value=JSON.parse(localStorage.getItem('sweets-player-v1')||'{}');value.name='LOCAL STALE';localStorage.setItem('sweets-player-v1',JSON.stringify(value));});
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.SweetsDownloadV255?.describe().hydrated&&window.SweetsPlayerProfileV255?.describe().hydrated,null,{timeout:60000});
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('sweets-player-v1')||'{}').name),profile.name,'the server profile replaces a stale browser cache');
 assert.equal(await page.locator('#player-display-name').textContent(),profile.name,'the native profile UI reflects the authoritative name');
 assert.equal((await state()).playerId,identity.playerId,'reloading preserves the authenticated player');
 await page.waitForFunction(()=>window.SweetsDownloadV255?.describe().assetsReady,null,{timeout:480000});
 await page.waitForFunction(()=>!!navigator.serviceWorker.controller,null,{timeout:15000});
 milestone('assets-ready');
 const before=await call('profile');report.creditBefore=before.wallet.credit;
 for(let i=0;i<10;i++)await page.locator('#addbet'+i).click();
 const draft=await state();assert.ok(draft.bets.every(bet=>bet>0),'all ten games have a real native BET');
 assert.equal((await call('profile')).wallet.credit,before.wallet.credit,'editing the draft does not spend server credit');
 await capture('download-bets-390');
 await page.locator('[data-dl-action="prepare"]').click();
 await betSwitch(false,'Download preparation submitted');
 await page.waitForFunction(()=>{const s=window.SweetsDownloadV255?.describe();return s?.session?.status==='failed'||s?.packageReady&&s.assetsReady;},null,{timeout:300000});
 const prepared=await state();assert.notEqual(prepared.session?.status,'failed',prepared.error||prepared.message);assert.equal(prepared.packageReady,true);
 await betSwitch(false,'prepared round');
 const active=await call('active'),pack=active.package;assert.ok(pack);report.prepared={session:prepared.session,credit:active.wallet.credit,numbers:pack.numbers,totalBet:pack.totalBet,totalWin:pack.totalWin,sugarWin:pack.sugarWin||0,recordingDurationMs:pack.playback.recording.durationMs,frames:pack.playback.recording.frames.length};
 milestone('prepared',{frames:pack.playback.recording.frames.length,durationMs:pack.playback.recording.durationMs});
 assert.equal(active.wallet.credit,before.wallet.credit-pack.totalBet+pack.totalWin+(pack.sugarWin||0));
 assert.deepEqual(pack.bets,draft.bets);assert.equal(pack.games.length,10);assert.equal(active.stats.rounds,1);
 await fs.writeFile(path.join(output,'api-package.json'),JSON.stringify(pack));
 try{
  const trusted=JSON.parse(await fs.readFile(path.join(output,'trusted-package.json'),'utf8'));
  assert.equal(pack.playback.recording.sourceHash,trusted.playback.recording.sourceHash,'API preparation uses the verified production physics source');
  report.trustedFixture={sourceHash:trusted.playback.recording.sourceHash,frames:trusted.playback.recording.frames.length};
 }catch(error){if(error.code!=='ENOENT')throw error;}
 for(const viewport of [{width:390,height:844},{width:844,height:390},{width:1366,height:900}]){
  await page.setViewportSize(viewport);await capture('download-ready-'+viewport.width);
 }
 await page.setViewportSize({width:390,height:844});
 await page.locator('[data-dl-action="play"]').click();
 await waitPlayback(s=>s?.started,'recorded playback starts',30000);
 await betSwitch(false,'recorded PLAYING');
 assert.equal(await page.evaluate(()=>!!window.SweetsDownloadRouletteV255?.driver),true);
 await page.evaluate(()=>{
  const physics=window.SweetsDownloadRouletteV255.driver.physics;
  window.__downloadPhysicsSteps=0;
  if(physics.world?.step){const original=physics.world.step;physics.world.step=function(...args){window.__downloadPhysicsSteps++;return original.apply(this,args);};}
 });
 let paused=await pausePlaybackWhen({stableHits:pack.playback.recording.hits},'stable pause between recorded hits',Math.max(90000,pack.playback.recording.durationMs+60000));
 assert.ok(paused.stableBall>=1&&paused.stableBall<7,'pause while the recorded round is unfinished');
 assert.equal(paused.cursor,paused.stableBall,'the initial pause stays at a fully settled HIT');
 assert.equal(paused.wait.settling,false,'the initial pause does not leave native HIT animation in flight');
 assert.equal(paused.playing,false);
 assert.ok(pack.playback.recording.hits[paused.stableBall].atMs-paused.playbackMs>=1000,'the pause preserves room for the disconnection progress check');
 assert.deepEqual(paused.draws,pack.numbers.slice(0,paused.draws.length));
 report.paused=paused;
 milestone('paused',{ball:paused.stableBall,playbackMs:paused.playbackMs});
 const pausedCheckpoint=pack.playback.checkpoints[paused.stableBall],cookieState=(pausedCheckpoint.state||pausedCheckpoint).engines[0];
 const expectedCookieTiles=cookieState.board.flat().filter(Boolean).length;
 await until(async()=>{
  const visual=await page.evaluate(()=>{
   const board=document.querySelector('#panel0 .board'),bounds=board.getBoundingClientRect(),tiles=[...board.querySelectorAll('.tile')];
   const visible=tiles.filter(tile=>{
    const rect=tile.getBoundingClientRect();if(!rect.width||!rect.height||rect.right<=bounds.left||rect.left>=bounds.right||rect.bottom<=bounds.top||rect.top>=bounds.bottom)return false;
    for(let node=tile;node&&node!==board.parentElement;node=node.parentElement){const style=getComputedStyle(node);if(style.display==='none'||style.visibility==='hidden'||Number(style.opacity)===0)return false;}
    return true;
   });
   return {tiles:tiles.length,visible:visible.length};
  });
  report.pausedBoard={expected:expectedCookieTiles,...visual};return visual.tiles===expectedCookieTiles&&visual.visible===expectedCookieTiles?visual:false;
 },'stable paused Cookie board remains visibly painted',8000);
 report.recordedDisplay=await page.evaluate(()=>{const driver=window.SweetsDownloadRouletteV255.driver,canvas=driver.mirrorCanvas,r=canvas.getBoundingClientRect();return {source:document.getElementById('cookie-roulette').dataset.rouletteSource,state:driver.draw.state,localPhysicsSteps:window.__downloadPhysicsSteps,canvas:{width:r.width,height:r.height},time:driver.physics.time};});
 assert.equal(report.recordedDisplay.source,'download-recording');assert.equal(report.recordedDisplay.state,'external');assert.equal(report.recordedDisplay.localPhysicsSteps,0);
 assert.ok(report.recordedDisplay.canvas.width>100&&report.recordedDisplay.canvas.height>100);
 await capture('download-paused-390');
 // A broken route/server restart does not emit the browser's online event.
 // Generate real unsent playback progress and let the background retry recover.
 await page.waitForFunction(()=>{const s=window.SweetsDownloadV255.describe();return s.seq===s.ackSeq;},null,{timeout:30000});
 await page.evaluate(()=>{window.__downloadNetworkEvents=[];for(const type of ['online','offline'])addEventListener(type,()=>window.__downloadNetworkEvents.push(type));});
 await stopServer(server);previousServerLogs+=server.logs+'\n--- transient restart ---\n';
 assert.equal(await page.evaluate(()=>navigator.onLine),true,'an unreachable server must not be simulated by an offline browser');
 await page.evaluate(()=>window.SweetsDownloadV255.play());
 const transientPaused=await pausePlaybackWhen({minimumMs:paused.playbackMs+200},'recorded playback advances during transient disconnection',10000);
 assert.equal(transientPaused.playing,false,'the observed disconnected progress is paused in the same browser task');
 await page.waitForFunction(()=>{const s=window.SweetsDownloadV255.describe();return !s.online&&s.seq>s.ackSeq;},null,{timeout:30000});
 const unsent=await state();assert.equal(unsent.stableBall,paused.stableBall,'the checkpoint remains between the same two recorded hits');
 server=await launchServer({port:server.port,directory:server.directory});await waitReady(server);
 await page.waitForFunction(()=>{const s=window.SweetsDownloadV255.describe();return s.online&&s.ackSeq===s.seq;},null,{timeout:45000});
 paused=await state();
 const connection=await page.evaluate(()=>({online:navigator.onLine,events:window.__downloadNetworkEvents}));
 assert.equal(connection.online,true);assert.deepEqual(connection.events,[],'automatic ACK recovery must not depend on an online event or manual sync');
 const recovered=await call('active');assert.equal(recovered.session.progress.seq,paused.seq);assert.equal(recovered.wallet.credit,active.wallet.credit);assert.equal(recovered.stats.rounds,1);
 report.transientConnection={before:unsent,after:paused,navigatorOnline:connection.online,networkEvents:connection.events,serverProgress:recovered.session.progress,manualSync:false};
 milestone('transient-auto-recovered',{seq:paused.seq,ackSeq:paused.ackSeq});
 const savedBeforeOffline=await call('active');
 await context.setOffline(true);await stopServer(server);previousServerLogs+=server.logs;
 await page.reload({waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>window.SweetsDownloadV255?.describe().packageReady&&window.SweetsDownloadV255.describe().assetsReady,null,{timeout:60000});
 const restored=await state();report.offlineRestored=restored;
 milestone('offline-restored',{ball:restored.stableBall,playbackMs:restored.playbackMs});
 assert.equal(restored.session.id,prepared.session.id);assert.equal(restored.stableBall,paused.stableBall);assert.equal(restored.playerId,identity.playerId);assert.equal(restored.online,false);
 await capture('download-offline-restored-390');
 await page.locator('[data-dl-action="play"]').click();
 await waitPlayback(s=>s?.stableBall>paused.stableBall,'offline playback advances beyond the saved hit',Math.max(90000,pack.playback.recording.durationMs+60000));
 server=await launchServer({port:server.port,directory:server.directory});report.restartedHealth=await waitReady(server);
 const resumedServer=await call('active');assert.equal(resumedServer.session.id,prepared.session.id);assert.equal(resumedServer.wallet.credit,active.wallet.credit);assert.equal(resumedServer.stats.rounds,1);
 await waitForPlaybackComplete(pack.playback.recording);
 report.offlineComplete=await state();assert.equal(report.offlineComplete.pendingComplete,true);assert.equal(report.offlineComplete.stableBall,8);assert.deepEqual(report.offlineComplete.draws,pack.numbers);
 await betSwitch(false,'offline result');
 milestone('offline-complete',{ball:report.offlineComplete.stableBall});
 report.completionPanel={offline:await completionPanel(true)};
 await capture('download-offline-complete-390');
 await context.setOffline(false);await page.evaluate(()=>window.SweetsDownloadV255.sync());
 await page.waitForFunction(()=>!window.SweetsDownloadV255.describe().pendingComplete&&window.SweetsDownloadV255.describe().session.status==='complete',null,{timeout:30000});
 report.completionPanel.synced=await completionPanel(false);
 await capture('download-synced-complete-390');
 const completed=await call('active');report.completed={session:completed.session,wallet:completed.wallet,stats:completed.stats};
 assert.equal(completed.wallet.credit,active.wallet.credit,'presentation completion does not credit a second payout');
 assert.equal(completed.stats.rounds,1);
 const repeated=await call('complete',{body:{sessionId:prepared.session.id}});
 assert.deepEqual(repeated.wallet,completed.wallet);assert.deepEqual(repeated.stats,completed.stats);
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.SweetsDownloadV255?.describe().localComplete&&window.SweetsDownloadV255.describe().hydrated,null,{timeout:60000});
 assert.equal((await state()).session.id,prepared.session.id);
 assert.equal((await state()).wallet.credit,active.wallet.credit);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('sweets-player-v1')||'{}').name),profile.name);
 report.profile=await page.evaluate(()=>window.SweetsPlayerProfileV255.describe());
 assert.equal(report.profile.stats.rounds,1);
 await betSwitch(false,'restored complete round');
 await page.locator('[data-dl-action="next"]').click();
 await betSwitch(true,'next Download BET');
 await capture('download-next-bet-390');
 adminContext=await secureContext({width:1366,height:900});adminPage=await adminContext.newPage();
 const adminRequests=[];adminPage.on('request',request=>{const u=new URL(request.url());adminRequests.push({path:u.pathname,serverHost:u.searchParams.get('serverHost'),settlement:u.searchParams.get('serverSettlementWorker')});});
 adminPage.on('pageerror',error=>report.pageErrors.push('admin: '+String(error.stack||error)));
 await adminPage.goto(server.base+'/monitor.html?machine=public-01&adminToken='+adminToken+'&edition=download',{waitUntil:'domcontentloaded'});
 await adminPage.waitForFunction(()=>window.SweetsDownloadMonitorV255?.describe().players===1,null,{timeout:30000});
 report.admin=await adminPage.evaluate(()=>({mode:document.documentElement.dataset.serverEdition,hostSource:document.getElementById('host-frame').getAttribute('src'),workerSource:document.getElementById('settlement-worker').getAttribute('src'),hostHidden:document.querySelector('.host-card').hidden,text:document.getElementById('download-v255-admin').textContent,state:window.SweetsDownloadMonitorV255.describe()}));
 assert.equal(report.admin.mode,'download');assert.equal(report.admin.hostSource,null);assert.equal(report.admin.workerSource,null);assert.equal(report.admin.hostHidden,true);
 assert.ok(report.admin.text.includes(profile.name));assert.ok(report.admin.text.includes(active.wallet.credit.toLocaleString('ja-JP')));
 assert.equal(adminRequests.some(r=>r.serverHost==='1'||r.settlement==='1'),false,'Download administration must not load either roulette/settlement iframe');
 await adminPage.locator('.download-v255-player-detail summary').click();
 report.admin.layout=await adminPage.evaluate(()=>{
  const card=document.getElementById('download-v255-admin').getBoundingClientRect(),detail=document.querySelector('.download-v255-player-detail').getBoundingClientRect(),wrap=document.querySelector('.download-v255-table-wrap'),payout=document.querySelector('.payout-card').getBoundingClientRect(),trend=document.querySelector('.trend-card-v242').getBoundingClientRect(),players=document.querySelector('.players-card').getBoundingClientRect();
  return {viewport:innerWidth,pageWidth:document.documentElement.scrollWidth,pageHeight:document.documentElement.scrollHeight,card:{left:card.left,right:card.right,bottom:card.bottom,width:card.width},detailBottom:detail.bottom,tableHeight:wrap.clientHeight,tableScrollHeight:wrap.scrollHeight,payoutHeight:payout.height,trendHeight:trend.height,playersHeight:players.height,playersBottom:players.bottom+scrollY,inputs:[...document.querySelectorAll('#global-controls input')].map(input=>{const r=input.getBoundingClientRect();return {height:r.height,inside:r.top>=payout.top&&r.bottom<=payout.bottom&&r.left>=payout.left&&r.right<=payout.right};})};
 });
 await adminPage.screenshot({path:path.join(output,'download-admin-1366.png'),fullPage:true});
 assert.ok(report.admin.layout.pageWidth<=report.admin.layout.viewport+1,'Download admin page remains within the viewport');
 assert.ok(report.admin.layout.card.width>report.admin.layout.viewport*.85,'Download records use the full dashboard width');
 assert.ok(report.admin.layout.detailBottom<=report.admin.layout.card.bottom+1,'expanded profile and saved progress are not clipped by the old Streaming grid');
 assert.ok(report.admin.layout.payoutHeight>=250&&report.admin.layout.payoutHeight<=310&&report.admin.layout.trendHeight<=310,'the P/O and chart row has a finite height independent of its canvas');
 assert.equal(report.admin.layout.inputs.length,7);assert.ok(report.admin.layout.inputs.every(input=>input.inside&&input.height>=29),'all existing P/O inputs fit their card');
 assert.ok(report.admin.layout.pageHeight<2000&&report.admin.layout.playersBottom<=report.admin.layout.pageHeight+1,'the complete dashboard fits a finite scrollable document');
 await adminPage.locator('.players-card').scrollIntoViewIfNeeded();
 report.admin.scrolledPlayers=await adminPage.evaluate(()=>{const r=document.querySelector('.players-card').getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height,viewport:innerHeight};});
 assert.ok(report.admin.scrolledPlayers.top>=-1&&report.admin.scrolledPlayers.bottom<=report.admin.scrolledPlayers.viewport+1,'the existing players section is fully reachable by scrolling');
 await adminPage.screenshot({path:path.join(output,'download-admin-controls-1366.png')});
 report.admin.players=(await call('',{admin:true})).players.length;
 assert.equal(report.webSockets.length,0,'Download playback never opens the Streaming WebSocket');
 assert.equal(report.requests.some(r=>/\/round\/(?:join|ball|checkpoint|settle)/.test(r.path)),false,'Download playback never sends Streaming round actions');
 const savedCaches=await page.evaluate(async()=>{const result=[];for(const name of await caches.keys())for(const request of await(await caches.open(name)).keys())result.push(new URL(request.url).pathname);return result;});
 assert.equal(savedCaches.some(p=>p.startsWith('/api/')||p.includes('monitor.html')),false,'offline app cache excludes private API and admin responses');
 report.cacheEntries=savedCaches.length;report.serverResume={sameSession:resumedServer.session.id===savedBeforeOffline.session.id,creditUnchanged:resumedServer.wallet.credit===savedBeforeOffline.wallet.credit};
 missingServer=await launchServer({directory:path.join(temporary,'missing-browser'),extra:{SWEETS_DOWNLOAD_BROWSER_PATH:path.join(temporary,'no-such-browser')}});
 report.missingBrowser=await until(async()=>{const h=await fetch(missingServer.base+'/api/health').then(r=>r.json());return h.download?.error?h:false;},'missing browser error is exposed',30000);
 assert.equal(report.missingBrowser.download.ready,false);assert.equal(report.missingBrowser.serverEdition,'download');
 assert.deepEqual(report.pageErrors,[],'no uncaught page exceptions');
 report.ok=true;
 milestone('complete',{screens:report.screens.length,pageErrors:report.pageErrors.length});
 await fs.writeFile(path.join(output,'browser.json'),JSON.stringify(report,null,2)+'\n');
 console.log('DOWNLOAD_V255_BROWSER_PASS',JSON.stringify({session:prepared.session.id,offlineResume:true,serverRestart:true,credit:completed.wallet.credit,recordingFrames:pack.playback.recording.frames.length,cacheEntries:report.cacheEntries,noServerWindow:true,pageErrors:report.pageErrors.length}));
}catch(error){
 report.failure={message:String(error),stack:error.stack,state:page?await state().catch(()=>null):null};
 await fs.writeFile(path.join(output,'browser.json'),JSON.stringify(report,null,2)+'\n');
 await page?.screenshot({path:path.join(output,'browser-failure.png'),fullPage:true}).catch(()=>{});
 throw error;
}finally{
 await adminContext?.close().catch(()=>{});await context?.close().catch(()=>{});await browser?.close().catch(()=>{});
 await stopServer(missingServer);await stopServer(server);
 await fs.writeFile(path.join(output,'browser-server.log'),previousServerLogs+'\n--- restarted server ---\n'+(server?.logs||'')+'\n--- missing browser probe ---\n'+(missingServer?.logs||''));
 await fs.rm(temporary,{recursive:true,force:true});
}

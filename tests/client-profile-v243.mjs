import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import {once} from 'node:events';
import {spawn} from 'node:child_process';
import {WebSocket} from 'ws';
import {chromium} from 'playwright';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const out='qa-client-v243';await fs.mkdir(out,{recursive:true});
const source=await fs.readFile('optimized/app-01.js','utf8');
for(const name of ['function prepareTabReach','function visibleTabReachResults','function tabReachCurrentValue','function prepareReach','function reachAvailable']){const at=source.indexOf(name);console.log('SOURCE',name,at,at<0?'':source.slice(at,at+3800));}
const probe=`\n;window.__perfV243={app,slots:typeof slots==='undefined'?[]:slots,calls:{}};
for(const name of ['prepareTabReach','visibleTabReachResults','prepareReach','tabReachCurrentValue','reachAvailable','scheduleUI','renderGameTabs','renderRoundResult']){
 try{const original=eval(name);if(typeof original!=='function')continue;const stats=window.__perfV243.calls[name]={calls:0,ms:0,max:0};const wrapped=function(...args){const begin=performance.now();try{return original.apply(this,args);}finally{const dt=performance.now()-begin;stats.calls++;stats.ms+=dt;stats.max=Math.max(stats.max,dt);}};eval(name+'=wrapped');}catch{}
}\n`;
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
async function run(mode){
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'sweets-profile-'));
 const allocator=net.createServer();allocator.listen(0,'127.0.0.1');await once(allocator,'listening');const port=allocator.address().port;await new Promise(r=>allocator.close(r));
 const base='http://127.0.0.1:'+port,admin='isolated-perf-qa',env={...process.env,PORT:String(port),SWEETS_DATA_FILE:path.join(temp,'core.json'),SWEETS_DATA_DIR:temp,SWEETS_ADMIN_TOKEN:admin,SWEETS_BET_DURATION_MS:'12000',SWEETS_PLAYER_STABLE_MS:'500',SWEETS_ROUND_START_DELAY_MS:'300',SWEETS_RESULT_GRACE_MS:'8000'};
 const server=spawn(process.execPath,['server.mjs'],{cwd:process.cwd(),env,stdio:['ignore','pipe','pipe']});let logs='';server.stdout.on('data',x=>logs+=x);server.stderr.on('data',x=>logs+=x);
 let ws,context,page;const errors=[],messages=[],requests={};
 async function call(route,{session,body,adminOnly=false}={}){const r=await fetch(base+route+(adminOnly?'?adminToken='+admin:''),{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(session?{'X-Player-Id':session.player.id,Authorization:'Bearer '+session.token}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(8000)});const j=await r.json();if(!r.ok)throw Error(route+' '+r.status+' '+JSON.stringify(j));return j;}
 try{
  for(let i=0;i<120;i++){try{if((await fetch(base+'/api/health')).ok)break;}catch{}await sleep(50);}
  const host=await call('/api/session',{body:{displayName:'SERVER ROULETTE'}});
  ws=new WebSocket('ws://127.0.0.1:'+port+'/ws?machineId=public-01&playerId='+host.player.id+'&token='+host.token);ws.on('error',()=>{});await once(ws,'open');
  context=await browser.newContext({viewport:{width:1280,height:900}});
  await context.addInitScript(()=>{
   window.__measureV243={storage:0,storageBytes:0,longTasks:0,longTaskMs:0,maxTask:0,frames:0,maxFrame:0};
   const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){window.__measureV243.storage++;window.__measureV243.storageBytes+=String(v).length;return original.call(this,k,v);};
   try{new PerformanceObserver(list=>{for(const e of list.getEntries()){const m=window.__measureV243;m.longTasks++;m.longTaskMs+=e.duration;m.maxTask=Math.max(m.maxTask,e.duration);}}).observe({type:'longtask',buffered:true});}catch{}
   let last=performance.now();function frame(t){const m=window.__measureV243;m.frames++;m.maxFrame=Math.max(m.maxFrame,t-last);last=t;requestAnimationFrame(frame);}requestAnimationFrame(frame);
  });
  page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(['error','warning'].includes(m.type()))messages.push(m.text().slice(0,400));});page.on('request',r=>{const u=new URL(r.url());if(u.pathname.startsWith('/api/'))requests[u.pathname]=(requests[u.pathname]||0)+1;});
  await page.route('**/assets/shared-machine-v176.js*',async route=>{let code=await fs.readFile('assets/shared-machine-v176.js','utf8');if(mode==='loader-fixed')code=code.replace('SweetsStationNumbersV242','SweetsStationNumbersV241');await route.fulfill({contentType:'application/javascript',body:code+probe});});
  const version=JSON.parse(await fs.readFile('app-version.json','utf8')).version;
  await page.goto(base+'/?appv='+version,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.__perfV243&&window.SweetsSharedMachine?.client?.online,{timeout:60000});
  await sleep(5500);
  const snapshot=label=>page.evaluate(label=>{const p=window.__perfV243,c=window.SweetsSharedMachine?.client;return {label,measurement:window.__measureV243,calls:p.calls,phase:p.app.phase,draws:p.app.draws,controller:window.SweetsSharedControllerV224?.describe(),stations:!!window.SweetsStationsV235,round:{id:c.round?.id,phase:c.round?.phase,participant:!!c.round?.participant},slots:p.slots.map(s=>({kind:s.engine?.kind,version:s.engine?.version,reachVersion:s.tabReachVersion,status:s.reachStatus,busy:s.engine?.busy,results:s.tabReachResults?.length}))};},label);
  const stages=[await snapshot('idle')];
  await call('/api/admin/machines/public-01/host/register',{session:host,body:{},adminOnly:true});
  let round;
  for(let i=0;i<350;i++){round=(await call('/api/machines/public-01/state',{session:host})).round;if(round?.phase==='PLAYING')break;await sleep(100);}
  await sleep(Math.max(800,Number(round.drawStartsAt)-Date.now()+50));stages.push(await snapshot('playing'));
  for(let i=1;i<=5;i++){await call('/api/machines/public-01/round/ball',{session:host,body:{roundId:round.id,ballIndex:i,number:[3,7,11,15,19][i-1],eventId:round.id+':'+i}});await sleep(4000);stages.push(await snapshot('ball-'+i));}
  const monitor=await call('/api/admin/machines/public-01',{adminOnly:true});
  await call('/api/admin/machines/public-01/bet-now',{body:{roundId:round.id,requestId:'qa-'+mode+'-v243'},adminOnly:true});
  await sleep(3500);stages.push(await snapshot('after-refund'));
  const beforeStorage=await page.evaluate(()=>window.__measureV243.storage);await sleep(4500);const refundIdle=await snapshot('refund-idle');refundIdle.storageWritesLast4500=refundIdle.measurement.storage-beforeStorage;stages.push(refundIdle);
  await page.screenshot({path:out+'/'+mode+'.png'});
  const report={mode,errors,messages:messages.slice(0,20),requests,forecastKeys:Object.keys(monitor.hitForecasts||{}),stages};
  await fs.writeFile(out+'/'+mode+'.json',JSON.stringify(report,null,2));console.log('PROFILE_REPORT',JSON.stringify(report));
 }finally{await context?.close();ws?.terminate();if(server.exitCode===null){const done=once(server,'exit');server.kill('SIGTERM');await done;}await fs.rm(temp,{recursive:true,force:true});}
}
try{for(const mode of ['baseline','loader-fixed'])await run(mode);}finally{await browser.close();}

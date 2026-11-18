/* Real isolated server/client fixture. Never contacts the public game server.
   The response extension exposes live lexical references solely for inspection. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import {once} from 'node:events';
import {spawn} from 'node:child_process';
import {WebSocket} from 'ws';
import {chromium} from 'playwright';

export const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export async function until(fn,label,timeout=45000){
 const end=Date.now()+timeout;
 while(Date.now()<end){const result=await fn();if(result)return result;await sleep(160);}
 throw Error('Timed out: '+label);
}
export async function createUiFixture({startRound=true,viewport={width:1366,height:900},search='',output='qa-v250'}={}){
 await fs.mkdir(output,{recursive:true});
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'sweets-ui-v250-'));
 const allocator=net.createServer();allocator.listen(0,'127.0.0.1');await once(allocator,'listening');
 const port=allocator.address().port;await new Promise(resolve=>allocator.close(resolve));
 const base='http://127.0.0.1:'+port,admin='v250-isolated-admin';
 const server=spawn(process.execPath,['server.mjs'],{cwd:process.cwd(),env:{...process.env,PORT:String(port),SWEETS_DATA_FILE:path.join(temp,'core.json'),SWEETS_DATA_DIR:temp,SWEETS_ADMIN_TOKEN:admin,SWEETS_PLAYER_STABLE_MS:'500',SWEETS_BET_DURATION_MS:'15000',SWEETS_ROUND_START_DELAY_MS:'300',SWEETS_RESULT_GRACE_MS:'8000'},stdio:['ignore','pipe','pipe']});
 let logs='',browser,context,page,ws,host,round,closed=false;
 server.stdout.on('data',data=>logs+=data);server.stderr.on('data',data=>logs+=data);
 const errors=[],warnings=[],requests=[];
 async function call(route,{session,body,adminOnly=false}={}){
  if(route.endsWith('/round/ball')&&body?.ballIndex===6){const current=await call('/api/machines/public-01/state',{session});await sleep(Math.max(0,Number(current.round?.thinkingClosesAt||0)-Date.now()+40));}
  const url=new URL(route,base);if(adminOnly)url.searchParams.set('adminToken',admin);
  const response=await fetch(url,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(session?{'X-Player-Id':session.player.id,Authorization:'Bearer '+session.token}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(10000)});
  const data=await response.json();assert.equal(response.ok,true,route+' '+JSON.stringify(data));return data;
 }
 async function close(){
  if(closed)return;closed=true;
  await browser?.close();ws?.terminate();
  if(server.exitCode===null){const done=once(server,'exit');server.kill('SIGTERM');await done;}
  await fs.rm(temp,{recursive:true,force:true});
 }
 try{
  await until(async()=>{try{return (await fetch(base+'/api/health')).ok;}catch{return false;}},'local server boot',20000);
  host=await call('/api/session',{body:{displayName:'V250 ISOLATED QA HOST'}});
  ws=new WebSocket('ws://127.0.0.1:'+port+'/ws?machineId=public-01&playerId='+host.player.id+'&token='+host.token);ws.on('error',()=>{});await once(ws,'open');
  browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{}),args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
  context=await browser.newContext({viewport});
  await context.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(/^https?:$/.test(url.protocol)&&url.origin!==base)return route.abort('blockedbyclient');
   return route.continue();
  });
  page=await context.newPage();page.on('pageerror',error=>errors.push(String(error)));
  page.on('console',message=>{if(['error','warning'].includes(message.type()))warnings.push(message.text().slice(0,400));});
  page.on('request',request=>{const url=new URL(request.url());if(url.pathname.includes('/api/'))requests.push({path:url.pathname,method:request.method()});});
  await page.route('**/assets/shared-machine-v176.js*',async route=>{
   const code=await fs.readFile('assets/shared-machine-v176.js','utf8');
   await route.fulfill({contentType:'application/javascript',body:code+String.raw`
;window.__qa250={app,slots,get active(){return active;},select:(...args)=>select(...args),updateReachUI:(a=app)=>updateReachUI(a),paintTabWin:(...args)=>paintTabWin(...args),tabs:(a=app)=>tabs(a),get units(){return units;},get unit(){return unit;},sixReachPresentation:(...args)=>sixReachPresentation(...args),sixXY,sixLayout,drawCarnival:(...args)=>drawCarnival(...args),requestReach:(...args)=>requestReach(...args),reachContext:(...args)=>reachContext(...args),visibleTabReachResults:(...args)=>visibleTabReachResults(...args),scheduleUI:(a=app)=>scheduleUI(a),hud:(a=app)=>hud(a)};
`});
  });
  const version=JSON.parse(await fs.readFile('app-version.json','utf8')).version;
  const url=new URL('/'+(search.startsWith('?')?search:'?'+search),base);url.searchParams.set('appv',version);
  await page.goto(url.href,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.__qa250&&window.SweetsSharedMachine?.client?.online&&window.SweetsStationsV235,null,{timeout:60000});
  await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.querySelectorAll('#tabs img.v249-selected-logo')].map(image=>image.decode().catch(()=>{})));});
  if(startRound){
   await sleep(1200);
   await call('/api/admin/machines/public-01/host/register',{session:host,body:{},adminOnly:true});
   round=await until(async()=>{const state=await call('/api/machines/public-01/state',{session:host});return state.round?.phase==='PLAYING'?state.round:null;},'real round starts');
   await page.waitForFunction(id=>window.SweetsSharedMachine.active?.roundId===id&&window.__qa250.app.phase==='playing',round.id,{timeout:30000});
   await page.waitForFunction(()=>window.__qa250.app.engines.every(e=>!e.opening&&!e.busy&&!(e.queue?.length)),null,{timeout:30000});
   await sleep(Math.max(0,Number(round.drawStartsAt)-Date.now()+20));
  }
  return {page,context,browser,base,admin,call,host,round,errors,warnings,requests,version,output,get logs(){return logs;},close};
 }catch(error){
  if(page)try{await page.screenshot({path:path.join(output,'fixture-failure.png')});}catch{}
  console.error('UI_V250_FIXTURE_FAILED',String(error),JSON.stringify(errors),logs.slice(-3000));
  await close();throw error;
 }
}

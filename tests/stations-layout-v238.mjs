import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
const root=process.cwd(),out=path.join(root,'qa-stations-v238');await fs.mkdir(out,{recursive:true});
const source=await fs.readFile('assets/stations-v235.js','utf8'),version=JSON.parse(await fs.readFile('app-version.json','utf8')).version;
const roster={version:235,machineId:'public-01',revision:10,capacity:6,selfStation:1,demoCount:0,seats:Array.from({length:6},(_,i)=>({station:i+1,playerId:i?'peer'+i:'self',name:['自分','プレイヤーB','ほしぞら','もちうさ','チョコまる','すいーつ'][i],pet:{flavor:['strawberry','vanilla','mint','chocolate','grape','strawberry'][i]},photo:'',connected:true,roundId:'qa',phase:'PLAYING',win:[3000,12345,40000,900,1200,78000][i],detail:{version:238,roundId:'qa',ballCount:3,prediction:'ready',best:{numbers:[i+11],gain:[1000,12345,99999,800,2300,100000][i],tier:i===2?3:1},achievedTier:[0,1,3,0,1,2][i],highestGames:i===2?['jelly']:[]}}))};
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost'),file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));if(!file.startsWith(root+path.sep))throw Error('path');const b=await fs.readFile(file);res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});res.end(b);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({executablePath:process.env.SWEETS_CHROMIUM_BIN||undefined,args:['--disable-dev-shm-usage','--no-sandbox','--enable-unsafe-swiftshader']});
const metrics=[];
try{
 for(const size of [{width:390,height:844,touch:true},{width:375,height:667,touch:true},{width:844,height:390,touch:true},{width:1365,height:900,touch:false}]){
  const context=await browser.newContext({viewport:{width:size.width,height:size.height},isMobile:size.touch,hasTouch:size.touch,deviceScaleFactor:1});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  // Only network/lifecycle is a fixture. The page, game bundle, nine game
  // styles, renderer layout and station script are the production files.
  await page.route('**/assets/shared-machine-v176.js*',route=>route.fulfill({contentType:'text/javascript',body:`window.SweetsSharedMachine={client:{playerId:'self',online:true,ws:{readyState:1},round:null,on(){},send(){return true;}}};window.SweetsRouletteClientV224={retry(){}};const qaStyle=document.createElement('link');qaStyle.rel='stylesheet';qaStyle.href='assets/stations-v235.css?v=238';document.head.append(qaStyle);\n${source}\nwindow.SweetsStationsV235.accept(${JSON.stringify(roster)});`}));
  await page.goto(base+'/?edition=streaming&set=all&appv='+version,{waitUntil:'networkidle'});
  await page.waitForSelector('.stations-strip-v235 .station-card-v235');await page.waitForTimeout(1200);
  const current=await page.evaluate(()=>{
   const box=s=>{const el=typeof s==='string'?document.querySelector(s):s;const b=el.getBoundingClientRect();return {x:b.x,y:b.y,w:b.width,h:b.height,bottom:b.bottom,right:b.right};};
   const arena=document.querySelector('#screen>.arena');return {arena:box(arena),wheel:box('#cookie-roulette .a8-stage'),margin:getComputedStyle(arena).marginBottom,strip:box('.stations-strip-v235'),cards:[...document.querySelectorAll('.stations-strip-v235 .station-card-v235')].map(el=>({...box(el),text:el.textContent})),controls:[...arena.querySelectorAll('button,input')].filter(el=>el.getBoundingClientRect().width>0).map(el=>({id:el.id,text:el.textContent,...box(el)})),density:arena.dataset.stationDensity};
  });
  await fs.writeFile(path.join(out,'metrics-'+size.width+'.json'),JSON.stringify(current,null,2));await page.screenshot({path:path.join(out,'client-'+size.width+'.png'),fullPage:true});
  const oldStyle=await page.addStyleTag({content:'html:not(.server-roulette-host) #screen>.arena.stations-reserved-v235{margin-bottom:44px!important} html:not(.server-roulette-host) #screen>.arena.stations-reserved-v235 #cookie-roulette .a8-stage{inset:8px 13px 38px!important}'});
  const before=await page.locator('#cookie-roulette .a8-stage').boundingBox();await oldStyle.evaluate(el=>el.remove());
  assert.equal(current.cards.length,6);assert.equal(current.margin,'0px');assert.ok(current.wheel.w>before.width,'roulette width restored');
  if(size.width<size.height)assert.ok(current.wheel.h>before.height+15,'lower strip space returned to roulette');
  for(const c of current.cards)assert.ok(c.right<=current.arena.x+current.arena.w*.27,'all six cards remain in a single LEFT rail');
  for(let i=0;i<current.cards.length;i++)for(let j=i+1;j<current.cards.length;j++){
   const a=current.cards[i],b=current.cards[j];const overlap=Math.max(0,Math.min(a.right,b.right)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y));assert.ok(overlap<1,'station cards must not overlap each other');
  }
  assert.deepEqual(errors,[],'no page errors');metrics.push({size,current,previousWheel:before});await context.close();
 }
 const page=await browser.newPage({viewport:{width:1365,height:900}});await page.route('**/assets/server-monitor-*.js*',route=>route.fulfill({contentType:'text/javascript',body:''}));
 await page.route('**/api/admin/machines/**/stations*',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,stations:roster})}));
 await page.goto(base+'/monitor.html?machine=public-01',{waitUntil:'networkidle'});await page.waitForSelector('.station-list .station-card-v235');
 const retained=await page.evaluate(roster=>{const frame=document.getElementById('host-frame'),win=frame.contentWindow,parent=frame.parentNode;for(let i=0;i<4;i++)window.SweetsStationsV235.accept({...roster,revision:20+i});return {same:frame.contentWindow===win&&frame.parentNode===parent,cards:document.querySelectorAll('.station-list .station-card-v235').length};},roster);
 assert.equal(retained.same,true);assert.equal(retained.cards,6);await page.screenshot({path:path.join(out,'monitor.png'),fullPage:true});
 await fs.writeFile(path.join(out,'metrics.json'),JSON.stringify(metrics,null,2));console.log('STATIONS_LAYOUT_V238_PASS',JSON.stringify(metrics));await page.close();
}finally{await browser.close();await new Promise(r=>server.close(r));}

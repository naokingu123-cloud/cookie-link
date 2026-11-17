import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {chromium} from 'playwright';
const root=process.cwd(),html=(await fs.readFile('monitor.html','utf8')).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://local');if(url.pathname==='/monitor.html'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);return;}const p=path.resolve(root,'.'+url.pathname);if(!p.startsWith(root+path.sep))throw Error('path');const data=await fs.readFile(p);res.setHeader('Content-Type',p.endsWith('.css')?'text/css':p.endsWith('.js')?'text/javascript':'application/octet-stream');res.end(data);}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const now=Date.now(),round='public-01-50-test';
const ids=Array.from({length:6},(_,i)=>'00000000-0000-4000-8000-'+String(i+1).padStart(12,'0'));
const data={serverTime:now,machine:{hostPlayerId:'HOST',hostConnected:true},round:{id:round,sequence:50,phase:'PLAYING',balls:[{number:1,index:1}],players:ids.map((id,i)=>({playerId:id,displayName:['もちうさぎ','チョコくま','ミントねこ','プリンひつじ','シュガー','こはく'][i],connected:true,totalBet:27000,roundWin:[78300,243000,1323000,90000,2700,7000][i],checkpointBall:1}))},stations:{seats:ids.map((id,i)=>({playerId:id,station:i+1,connected:true,roundId:round,win:[78300,243000,1323000,90000,2700,7000][i],ballCount:1}))},payoutControlV3:{config:{targetRate:90},players:ids.map((id,i)=>({playerId:id,mode:i===1?'manual':'auto',manualRate:95,effectiveRate:i===0?50:i===1?150:87+i,currentRoundId:round,currentRoundBet:27000,currentRoundWin:[78300,243000,1323000,90000,2700,7000][i],lifetimeBet:1000000*(i+1),lifetimeWin:900000*(i+1),lastBall:1,wallet:{credit:973000},games:{}}))},hitForecasts:Object.fromEntries(ids.map((id,i)=>[id,{roundId:round,ballCount:1,baseWin:[78300,243000,1323000,90000,2700,7000][i],bet:27000,at:now,gains:Array.from({length:25},(_,n)=>n===0?null:n===1?2700:n===2?27000:n===3?1350000:(n+1)*500)}])),payoutTrendV242:{points:Array.from({length:30},(_,i)=>({game:i+1,at:now-(29-i)*40000,input:(i+1)*162000,output:(i+1)*143000+(i%3)*9000,hg:(i+1)*19000,po:88+i%3,rollingPo:86+i%7,roundIn:162000,roundOut:143000,partial:false}))}};
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});await fs.mkdir('qa-monitor-v242',{recursive:true});
try{
 for(const [width,height] of [[1920,1080],[1366,768],[1280,720],[390,844]]){
  const page=await browser.newPage({viewport:{width,height}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/monitor.html');
  for(const file of ['assets/monitor-ledger-v241.js','assets/server-monitor-v242.js','assets/payout-trend-v242.js'])await page.addScriptTag({path:file});
  await page.evaluate(data=>{document.getElementById('conn').textContent='表示検証（抽選機映像は模擬）';const frame=document.getElementById('host-frame');frame.srcdoc='<body style="margin:0;background:#061421;color:#8ab0c7;font:12px system-ui;display:grid;place-items:center;height:100vh">抽選機映像領域（模擬）</body>';window.SweetsMonitorCompactV242.render(data,{tbody:document.getElementById('players'),empty:document.getElementById('empty'),openDetails:new Set(),detail:()=>document.createElement('tr'),refresh(){}});},data);
  await page.waitForTimeout(150);
  const metrics=await page.evaluate(()=>{const w=document.querySelector('.players-wrap'),table=document.querySelector('.players'),m=document.querySelector('main');const grid=document.querySelector('#players tr.compact-player-v242 .forecast-grid-v242');
 const tiles=[...grid?.querySelectorAll('.forecast-tile-v242')||[]],style=grid?getComputedStyle(grid):null;
 const forecastColumns=style?.gridTemplateColumns.split(' ').filter(Boolean).length||0;
 const forecastRows=style?.gridTemplateRows.split(' ').filter(Boolean).length||0;
 const forecastSameLine=tiles.length===25&&tiles.every(tile=>Math.abs(tile.getBoundingClientRect().y-tiles[0].getBoundingClientRect().y)<1);
 const forecastLabels=tiles.map(tile=>tile.querySelector('.forecast-number-v242')?.textContent).join(',');
 const forecastBars=document.querySelectorAll('.forecast-bar-v245').length;
 const progressHeaders=[...table.querySelectorAll('thead th')].filter(x=>x.textContent==='進行度').length;
 const progressTexts=[...document.querySelectorAll('#players>tr')].map(tr=>tr.children[12]?.textContent||'');
 const forecastRaw=[...tiles].map(tile=>tile.querySelector('.forecast-value-v242')?.textContent||'');
 const ratioRaw=[...tiles].map(tile=>tile.querySelector('.forecast-ratio-v242')?.textContent||'');
 const rateStyle=[...document.querySelectorAll('#players>tr.compact-player-v242')].map(tr=>tr.querySelectorAll('td.money.po')[2]?.style.color||'');
 const barHeight=[...tiles].map(tile=>tile.querySelector('.forecast-bar-v245')?.style.height||'');
 const trendPO=document.querySelector('#trend-summary-v242 strong')?.style.color||'';
 
 return {forecastColumns,forecastRows,forecastSameLine,forecastLabels,forecastBars,progressHeaders,progressTexts,forecastRaw,ratioRaw,rateStyle,barHeight,trendPO,viewport:[innerWidth,innerHeight],page:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],wrap:[w.clientWidth,w.clientHeight,w.scrollWidth,w.scrollHeight],table:table.getBoundingClientRect().toJSON(),main:m.getBoundingClientRect().toJSON(),rows:document.querySelectorAll('#players>tr').length,tiles:document.querySelectorAll('.forecast-tile-v242').length,inputs:document.querySelectorAll('#global-controls input').length,red:document.querySelectorAll('[data-tier=red]').length,purple:document.querySelectorAll('[data-tier=purple]').length,rainbow:document.querySelectorAll('[data-tier=rainbow]').length};});
  assert.equal(metrics.forecastBars,175,'25 bars in each of 7 rows');
  assert.equal(metrics.progressHeaders,1);
  assert.ok(metrics.progressTexts.every(x=>/^\d+$/.test(x)),'progress is a single number');
  assert.ok(metrics.forecastRaw.every(x=>!x.includes(',')),'no grouping commas in forecast text');
  assert.ok(metrics.ratioRaw.every(x=>!x.includes(',')&&(!/[0-9]+\.([0-9]+)/.test(x)||x.match(/\.([0-9]+)/)?.[1]?.length<=2)),'ratios have at most two decimal places');
  assert.equal(metrics.rateStyle[0],'rgb(77, 77, 255)','50 percent is blue');
  assert.equal(metrics.rateStyle[1],'rgb(255, 77, 77)','150 percent is red');
  assert.ok(metrics.barHeight.some(x=>parseFloat(x)>0),'gain bars must render');
  assert.ok(metrics.trendPO,'the graph summary P/O is also spectrum colored');
  assert.equal(metrics.forecastColumns,25,'all 25 numbers must be arranged horizontally');
  assert.equal(metrics.forecastRows,1,'no second forecast row');
  assert.ok(metrics.forecastSameLine,'all 25 number tiles must share one Y position');
  assert.equal(metrics.forecastLabels,'1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25');
  assert.equal(metrics.rows,7);assert.equal(metrics.tiles,175);assert.equal(metrics.inputs,7);assert.ok(metrics.red&&metrics.purple&&metrics.rainbow);assert.ok(metrics.page[0]<=width+1,JSON.stringify(metrics));assert.ok(metrics.page[1]<=height+1,JSON.stringify(metrics));assert.ok(metrics.wrap[2]<=metrics.wrap[0]+1,JSON.stringify(metrics));assert.ok(metrics.wrap[3]<=metrics.wrap[1]+1,JSON.stringify(metrics));assert.equal(errors.length,0,JSON.stringify(errors));
  await page.screenshot({path:'qa-monitor-v242/monitor-'+width+'.png'});await fs.writeFile('qa-monitor-v242/layout-'+width+'.json',JSON.stringify(metrics,null,2));console.log('MONITOR_LAYOUT_V242_PASS',width,height,JSON.stringify(metrics.wrap));await page.close();
 }
}finally{await browser.close();await new Promise(r=>server.close(r));}

/* Isolated current presentation: no player wallet or remote session is touched. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';import path from 'node:path';import http from 'node:http';
import {fileURLToPath} from 'node:url';import {chromium} from 'playwright';
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url))),output=path.resolve('qa-dango-v268-view');
await fs.mkdir(output,{recursive:true});
const mime={'.js':'text/javascript','.css':'text/css','.webp':'image/webp','.woff2':'font/woff2','.json':'application/json'};
const html='<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Dango v268 presentation</title><style>html,body,#screen,#panels{width:100%;height:100%;margin:0;padding:0}#fixture{position:relative;width:100%;height:100%}@font-face{font-family:ElixirNumbers;src:url(/optimized/media/3af2886469024d10.woff2)}@font-face{font-family:ArcadePayout;src:url(/optimized/media/a73bbbdd98d48aac.woff2);font-weight:700}</style><link rel="stylesheet" href="/assets/dango-bingo.css"><body class="dgb-active"><div id="screen"><div id="panels"><div class="dgb-panel" id="fixture"></div></div></div><script src="/assets/dango-bingo-rules.js"></script><script src="/assets/dango-bingo-view.js"></script><script src="/assets/dango-bingo-lesson.js"></script></body></html>';
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');if(url.pathname==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);return;}
 if(url.pathname==='/favicon.ico'){res.statusCode=204;res.end();return;}
 const file=path.resolve(root,'.'+url.pathname);if(!file.startsWith(root+path.sep)){res.statusCode=403;res.end();return;}
 try{const bytes=await fs.readFile(file);res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(bytes);}catch{res.statusCode=404;res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser,page;const report={revision:268,errors:[],screens:[]};
try{
 const executable=process.env.PLAYWRIGHT_EXECUTABLE_PATH;
 browser=await chromium.launch({headless:true,...(executable?{executablePath:executable}:{}),args:['--no-sandbox']});
 page=await browser.newPage({viewport:{width:1366,height:750}});page.on('pageerror',error=>report.errors.push(String(error)));
 await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'networkidle'});
 const ready=await page.evaluate(async()=>{
  await Promise.all([DangoBingoView.assetsReady,document.fonts.ready]);
  const R=DangoBingoRules,qa=window.qa268={R,view:DangoBingoView.mount(document.getElementById('fixture')),state:null,bet:100};
  qa.render=(options={})=>qa.view.draw(qa.state,{bet:qa.bet,remainingMs:9000,time:1200,reach:R.reaches(qa.state),...options});
  qa.new=(mold=0)=>{qa.state=R.create({moldIndex:mold,numbers:Array.from({length:25},(_,i)=>i+1)});qa.render();};
  qa.seven=()=>{qa.new();for(const n of [1,3,6,10,15])qa.state=R.draw(qa.state,n);qa.render();};
  qa.six=()=>{qa.new(1);for(const id of [2,7,11,16,22])qa.state=R.draw(qa.state,qa.state.numbers[id]);for(const id of [1,8,13,15,17,18])qa.state=R.placeFree(qa.state,id);qa.state=R.commitFree(qa.state,{autoFill:false});qa.state=R.draw(qa.state,qa.state.numbers[19]);qa.render();};
  qa.cell=(length,count)=>document.querySelector('.dgb-pay tr[data-length="'+length+'"] td[data-count="'+count+'"]');
  qa.view.setCallbacks({onCell(id){const s=qa.state;qa.state=s.manualFreeCells.includes(id)?R.undoFree(s,id):R.placeFree(s,id);if(qa.state)qa.render();},onAuto(){qa.state=R.autoPlace(qa.state);qa.render();}});
  qa.new();return R.REVISION;
 });
 assert.equal(ready,268);
 report.initial=await page.evaluate(()=>({
  highest:qa268.view.describe().highestCells,zero:qa268.cell(2,1).textContent,zeroCurrent:qa268.cell(2,1).classList.contains('current'),
  oddsHidden:document.querySelector('.dgb-pay-odds').hidden,freeGrants:[...document.querySelectorAll('.dgb-free-grant')].map(x=>x.textContent),
  idleMotion:DangoBingoView.describeAssets().last.main.idleMotion,colors:DangoBingoView.lineColors,
  freeTitle:document.querySelector('.dgb-free-title').textContent,value:document.querySelector('.dgb-free-value').textContent
 }));
 assert.deepEqual(report.initial.highest,[{length:4,count:3},{length:5,count:3},{length:6,count:2},{length:6,count:3},{length:7,count:2},{length:7,count:3}]);
 assert.equal(report.initial.zero,'-');assert.equal(report.initial.zeroCurrent,false);assert.equal(report.initial.oddsHidden,true);assert.equal(report.initial.idleMotion,false);
 assert.deepEqual(report.initial.freeGrants,['FREE×2','FREE×3','FREE×4','FREE×5','FREE×6','FREE×7']);assert.equal(report.initial.colors[2],'#269eff');assert.equal(report.initial.colors[3],'#4ee3f5');
 report.firstHalfLabels=[];
 for(const [width,height]of [[1366,750],[844,340],[390,844],[320,480]]){
  await page.setViewportSize({width,height});await page.evaluate(()=>qa268.render());await page.waitForFunction(()=>document.querySelector('canvas').width===innerWidth);
  const labels=await page.evaluate(()=>{
   const rect=node=>{const r=node.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height,centerY:(r.top+r.bottom)/2};};
   return [...document.querySelectorAll('.dgb-pay tbody th')].map(th=>({length:th.parentElement.dataset.length,cell:rect(th),name:rect(th.querySelector('.dgb-line-name')),grant:rect(th.querySelector('.dgb-free-grant')),scroll:th.scrollWidth,width:th.clientWidth}));
  });
  for(const row of labels){
   assert.ok(row.grant.left>=row.name.right-1,'FREE grant stays to the right of the Japanese line label '+JSON.stringify({width,height,row}));
   assert.ok(Math.abs(row.grant.centerY-row.name.centerY)<=1,'line name and FREE grant stay on one centered row '+JSON.stringify({width,height,row}));
   assert.ok(row.scroll<=row.width+1&&row.grant.right<=row.cell.right+1,'Japanese labels fit without horizontal overflow '+JSON.stringify({width,height,row}));
  }
  report.firstHalfLabels.push({width,height,labels});await page.screenshot({path:output+'/v268-first-half-'+width+'x'+height+'.png'});
 }
 await page.setViewportSize({width:1366,height:750});await page.evaluate(()=>qa268.render());await page.waitForFunction(()=>document.querySelector('canvas').width===innerWidth);
 await page.screenshot({path:output+'/v268-first-half-desktop.png'});
 await page.evaluate(()=>qa268.seven());
 assert.equal(await page.evaluate(()=>qa268.state.freeBudget),7);
 const initialFree=await page.evaluate(()=>qa268.state.initialFreeCells[0]);
 await page.locator('.dgb-cell[data-cell-id="'+initialFree+'"]').click();
 report.odds=await page.evaluate(()=>({hidden:document.querySelector('.dgb-pay-odds').hidden,text:document.querySelector('.dgb-pay-odds').textContent,remaining:document.querySelector('.dgb-free-value').textContent,placed:qa268.state.manualFreeCells.length}));
 assert.equal(report.odds.hidden,false);assert.equal(report.odds.text,'Odds UP!2倍');assert.match(report.odds.remaining,/6個/);assert.equal(report.odds.placed,1);
 await page.locator('.dgb-cell[data-cell-id="'+initialFree+'"]').click();assert.equal(await page.evaluate(()=>document.querySelector('.dgb-pay-odds').hidden),true);
 await page.evaluate(()=>qa268.six());
 report.reach=await page.evaluate(()=>({
  two:qa268.cell(6,2).classList.contains('reach'),three:qa268.cell(6,3).classList.contains('reach'),oneCurrent:qa268.cell(6,1).classList.contains('current'),
  label:getComputedStyle(qa268.cell(6,2),'::after').content,animation:getComputedStyle(qa268.cell(6,2)).animationName,
  earnedAnimation:getComputedStyle(qa268.cell(6,1)).animationName,hitLabelPosition:DangoBingoView.describeAssets().last.main.hitLabelPosition,
  sparkleCells:DangoBingoView.describeAssets().last.main.sparkleCells
 }));
 assert.equal(report.reach.two,true);assert.equal(report.reach.three,false);assert.equal(report.reach.oneCurrent,true);assert.match(report.reach.label,/リーチ!/);assert.match(report.reach.animation,/dgb-next-ball-reach/);assert.equal(report.reach.earnedAnimation,'none');assert.equal(report.reach.hitLabelPosition,'number-overlay');assert.ok(report.reach.sparkleCells>=6);
 await page.screenshot({path:output+'/v268-next-ball-reach-desktop.png'});
 await page.evaluate(()=>{qa268.state=qa268.R.draw(qa268.state,qa268.state.numbers[20]);qa268.render();});
 report.get=await page.evaluate(()=>({two:qa268.cell(6,2).className,three:qa268.cell(6,3).className,label:getComputedStyle(qa268.cell(6,2),'::after').content,value:qa268.cell(6,2).textContent}));
 assert.match(report.get.two,/current/);assert.ok(!report.get.two.includes('reach'));assert.match(report.get.three,/reach/);assert.match(report.get.label,/GET!/);assert.equal(report.get.value,'3000');
 for(const [width,height]of [[1366,750],[844,340],[390,844],[390,540],[320,480]]){
  await page.setViewportSize({width,height});await page.evaluate(()=>qa268.render());await page.waitForFunction(()=>document.querySelector('canvas').width===innerWidth);
  const measure=await page.evaluate(()=>{
   const scene=document.querySelector('.dgb-scene'),g=DangoBingoView.geometry(scene.clientWidth,scene.clientHeight,{state:qa268.state});
   const box=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
   const table=box(document.querySelector('.dgb-pay')),free=box(document.querySelector('.dgb-free-stat'));
   const distance=(r,p)=>Math.hypot(p.x-Math.max(r.x,Math.min(r.right,p.x)),p.y-Math.max(r.y,Math.min(r.bottom,p.y)));
   return {width:innerWidth,height:innerHeight,table,free,unit:g.unit,
    tableClearance:Math.min(...g.centers.map(p=>distance(table,p))),freeClearance:Math.min(...g.centers.map(p=>distance(free,p))),
    numeralFont:parseFloat(getComputedStyle(document.querySelector('.gold-number')).fontSize),
    overflow:[...document.querySelectorAll('.dgb-pay td,.dgb-pay tbody th')].filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>({length:e.parentElement.dataset.length,count:e.dataset.count,width:e.clientWidth,scroll:e.scrollWidth})),
    inside:g.centers.every(p=>p.x-g.radius>=0&&p.x+g.radius<=innerWidth&&p.y-g.radius>=0&&p.y+g.radius<=innerHeight)
   };
  });
  assert.equal(measure.inside,true);assert.equal(measure.overflow.length,0);assert.ok(measure.numeralFont>=14);assert.ok(measure.table.right<=width+1&&measure.table.bottom<=height+1);assert.ok(measure.free.right<=width+1&&measure.free.bottom<=height+1);
  assert.ok(measure.tableClearance>=measure.unit*.5-.5,'payout/mochi overlap '+JSON.stringify(measure));assert.ok(measure.freeClearance>=measure.unit*.5-.5,'FREE/mochi overlap '+JSON.stringify(measure));
  await page.screenshot({path:output+'/v268-get-and-reach-'+width+'x'+height+'.png'});report.screens.push(measure);
 }
 await page.evaluate(()=>{qa268.bet=1000000000;qa268.render();});
 report.longNumbers=await page.evaluate(()=>[...document.querySelectorAll('.dgb-pay td .gold-number')].map(e=>({text:e.textContent,scale:+e.dataset.horizontalScale,font:parseFloat(getComputedStyle(e).fontSize),width:e.getBoundingClientRect().width,cell:e.parentElement.clientWidth})));
 assert.ok(report.longNumbers.some(n=>n.scale<.9));assert.ok(report.longNumbers.every(n=>n.font>=14&&n.width<=n.cell+1));
 await page.screenshot({path:output+'/v268-long-numbers-320x480.png'});
 // A restored prior-version board keeps its own presentation and highest roles.
 await page.evaluate(()=>{qa268.bet=100;qa268.state=qa268.R.create({rulesRevision:266,moldIndex:0});qa268.render();});
 assert.equal(await page.evaluate(()=>qa268.view.describe().highestCells.some(x=>x.length===3&&x.count===3)),true);
 await page.evaluate(()=>qa268.new());assert.equal(await page.evaluate(()=>qa268.view.describe().highestCells.length),6);
 assert.deepEqual(report.errors,[]);report.success=true;
 console.log('DANGO_V268_VIEW_PASS',JSON.stringify({highest:report.initial.highest,reach:report.reach,get:report.get,viewports:report.screens.length,errors:report.errors}));
}catch(error){report.failure=String(error.stack||error);if(page)await page.screenshot({path:output+'/failure.png'}).catch(()=>{});throw error;}
finally{await fs.writeFile(output+'/result.json',JSON.stringify(report,null,2)+'\n');if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}

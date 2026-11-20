/* Current presentation only: this isolated fixture never touches a wallet. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';import path from 'node:path';import http from 'node:http';
import {fileURLToPath} from 'node:url';import {chromium} from 'playwright';
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url))),output=path.resolve(process.env.DANGO_VIEW_QA_OUTPUT||'qa-dango-v269-view');
await fs.mkdir(output,{recursive:true});
const mime={'.js':'text/javascript','.css':'text/css','.webp':'image/webp','.woff2':'font/woff2','.json':'application/json'};
const html='<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Dango v269 presentation</title><style>html,body,#screen,#panels{width:100%;height:100%;margin:0;padding:0}#fixture{position:relative;width:100%;height:100%}@font-face{font-family:ElixirNumbers;src:url(/optimized/media/3af2886469024d10.woff2)}@font-face{font-family:ArcadePayout;src:url(/optimized/media/a73bbbdd98d48aac.woff2);font-weight:700}</style><link rel="stylesheet" href="/assets/dango-bingo.css"><body class="dgb-active"><div id="screen"><div id="panels"><div class="dgb-panel" id="fixture"></div></div></div><script src="/assets/dango-bingo-rules.js"></script><script src="/assets/dango-bingo-view.js"></script><script src="/assets/dango-bingo-lesson.js"></script></body></html>';
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');if(url.pathname==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);return;}
 if(url.pathname==='/favicon.ico'){res.statusCode=204;res.end();return;}
 const file=path.resolve(root,'.'+url.pathname);if(!file.startsWith(root+path.sep)){res.statusCode=403;res.end();return;}
 try{const bytes=await fs.readFile(file);res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(bytes);}catch{res.statusCode=404;res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser,page;const report={revision:269,rulesRevision:268,errors:[],firstHalf:[],screens:[],thinking:[]};
const viewports=[[1366,750],[844,340],[390,844],[390,540],[320,480],[390,300],[320,270]];
async function setup(target){
 target.on('pageerror',error=>report.errors.push(String(error)));
 await target.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'networkidle'});
 return target.evaluate(async()=>{
  await Promise.all([DangoBingoView.assetsReady,document.fonts.ready]);
  const R=DangoBingoRules,qa=window.qa269={R,view:DangoBingoView.mount(document.getElementById('fixture')),state:null,bet:100};
  qa.render=(options={})=>qa.view.draw(qa.state,{bet:qa.bet,remainingMs:9000,time:1200,reach:R.reaches(qa.state),...options});
  qa.new=(mold=0)=>{qa.state=R.create({moldIndex:mold,numbers:Array.from({length:25},(_,i)=>i+1)});qa.render();};
  qa.seven=()=>{qa.new();for(const n of [1,3,6,10,15])qa.state=R.draw(qa.state,n);qa.render();};
  qa.six=()=>{qa.new(1);for(const id of [2,7,11,16,22])qa.state=R.draw(qa.state,qa.state.numbers[id]);for(const id of [1,8,13,15,17,18])qa.state=R.placeFree(qa.state,id);qa.state=R.commitFree(qa.state,{autoFill:false});qa.state=R.draw(qa.state,qa.state.numbers[19]);qa.render();};
  qa.cell=(length,count)=>document.querySelector('.dgb-pay tr[data-length="'+length+'"] td[data-count="'+count+'"]');
  qa.view.setCallbacks({onCell(id){const s=qa.state;qa.state=s.manualFreeCells.includes(id)?R.undoFree(s,id):R.placeFree(s,id);if(qa.state)qa.render();},onAuto(){qa.state=R.autoPlace(qa.state);qa.render();}});
  qa.measure=()=>{
   const scene=document.querySelector('.dgb-scene'),g=DangoBingoView.geometry(scene.clientWidth,scene.clientHeight,{state:qa.state}),payout=qa.view.describe().payout;
   const box=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,centerY:(r.top+r.bottom)/2};};
   const table=box(document.querySelector('.dgb-pay')),matrix=box(document.querySelector('.dgb-pay table')),oddsElement=document.querySelector('.dgb-pay-odds'),odds=oddsElement.hidden?null:box(oddsElement),free=box(document.querySelector('.dgb-free-stat')),railElement=document.querySelector('.dgb-free-rail'),rail=box(railElement);
   const distance=(r,p)=>Math.hypot(p.x-Math.max(r.x,Math.min(r.right,p.x)),p.y-Math.max(r.y,Math.min(r.bottom,p.y)));
   const cells=[...document.querySelectorAll('.dgb-pay td,.dgb-pay tbody th')];
   const labels=[...document.querySelectorAll('.dgb-pay tbody th')].map(th=>({length:+th.parentElement.dataset.length,text:th.textContent,cell:box(th),name:box(th.querySelector('.dgb-line-name')),scroll:th.scrollWidth,width:th.clientWidth}));
   const rows=[...document.querySelectorAll('.dgb-free-rail-row')].map(row=>({length:+row.dataset.length,box:box(row),icons:[...row.children].map(icon=>({box:box(icon),bitmap:icon.dataset.bitmap,kind:icon.dataset.kind,width:icon.width}))}));
   const draw=DangoBingoView.describeAssets().last.main,dpr=Math.min(2,devicePixelRatio||1);
   return {width:scene.clientWidth,height:scene.clientHeight,table,matrix,odds,free,rail,railVisible:!railElement.hidden,unit:g.unit,payout,labels,rows,draw,
    tableClearance:Math.min(...[matrix,odds].filter(Boolean).flatMap(rect=>g.centers.map(p=>distance(rect,p)))),freeClearance:Math.min(...g.centers.map(p=>distance(free,p))),railClearance:railElement.hidden?null:Math.min(...g.centers.map(p=>distance(rail,p))),
    numeralFont:parseFloat(getComputedStyle(document.querySelector('.gold-number')).fontSize),
    overflow:cells.filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>({length:e.parentElement.dataset.length,count:e.dataset.count,width:e.clientWidth,scroll:e.scrollWidth})),
    inside:g.centers.every(p=>p.x-g.radius>=0&&p.x+g.radius<=scene.clientWidth&&p.y-g.radius>=0&&p.y+g.radius<=scene.clientHeight),
    canvasMatches:Math.abs(draw.geometry.unit/dpr-g.unit)<.01&&draw.geometry.centers.every((p,i)=>Math.abs(p.x/dpr-g.centers[i].x)<.01&&Math.abs(p.y/dpr-g.centers[i].y)<.01),
    controlMatches:[...document.querySelectorAll('.dgb-cell')].every((button,i)=>Math.abs(parseFloat(button.style.left)-g.centers[i].x)<.01&&Math.abs(parseFloat(button.style.top)-g.centers[i].y)<.01),
    oldTableWidth:g.portrait?g.width-payout.anchor*2:payout.unit*4.23,
    manualWait:document.querySelector('.dgb-countdown').textContent,
    freeTextOverflow:[...document.querySelectorAll('.dgb-free-stat>small,.dgb-free-stat>b,.dgb-free-detail,.dgb-countdown')].filter(e=>e.getBoundingClientRect().width>free.width-4).map(e=>({text:e.textContent,width:e.getBoundingClientRect().width}))
   };
  };
  qa.new();return {rules:R.REVISION,view:DangoBingoView.presentationRevision,assets:DangoBingoView.describeAssets().ready};
 });
}
async function fit(width,height,options={}){
 await page.setViewportSize({width,height});await page.evaluate(o=>qa269.render(o),options);
 await page.waitForFunction(()=>{const canvas=document.querySelector('.dgb-pan>canvas');return canvas.width===Math.round(innerWidth*Math.min(2,devicePixelRatio||1));});
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 return page.evaluate(()=>qa269.measure());
}
function checkLayout(m,{rail=false}={}){
 const detail=JSON.stringify(m);
 assert.equal(m.inside,true,'board containment '+detail);assert.equal(m.canvasMatches,true,'canvas logical/backing coordinate alignment '+detail);assert.equal(m.controlMatches,true,'FREE targets follow the drawn board '+detail);
 assert.equal(m.overflow.length,0,'payout text fits '+detail);assert.ok(m.numeralFont>=14&&m.numeralFont>=m.payout.unit*.4-.02,'preserve numeral height '+detail);
 assert.ok(m.table.right<=m.width+1&&m.table.bottom<=m.height+1,'table containment '+detail);assert.ok(m.free.right<=m.width+1&&m.free.bottom<=m.height+1,'FREE card containment '+detail);
 assert.ok(m.tableClearance>=m.unit*.5-.5,'payout/mochi overlap '+detail);assert.ok(m.freeClearance>=m.unit*.5-.5,'FREE card/mochi overlap '+detail);
 assert.ok(m.table.width<=m.oldTableWidth*.83+1,'compact matrix removes unused width '+detail);
 assert.equal(m.railVisible,rail,'FREE rail visibility '+detail);
 for(const row of m.labels){assert.equal(row.text,row.length+'個ライン');assert.ok(row.name.right<=row.cell.right+1&&row.scroll<=row.width+1,'Japanese line labels fit '+detail);}
 if(rail){
  assert.deepEqual(m.rows.map(row=>row.icons.length),[2,3,4,5,6,7]);
  assert.ok(m.rail.x>=m.table.right-1,'FREE icons are to the right of the three payouts '+detail);
  assert.ok(m.rail.right<=m.width+1&&m.rail.bottom<=m.height+1,'rail containment '+detail);
  assert.ok(m.rail.right-m.table.x<=m.oldTableWidth+1,'rail does not expand the former table envelope '+detail);
  assert.ok(m.railClearance>=m.unit*.5-.5,'FREE rail/mochi overlap '+detail);
  for(const row of m.rows){
   const label=m.labels.find(label=>label.length===row.length);
   assert.ok(Math.abs(row.box.centerY-label.cell.centerY)<=1,'icon rows align with payout rows '+detail);
   for(const icon of row.icons){
    assert.equal(icon.bitmap,'true');assert.equal(icon.kind,'yellow');assert.ok(icon.box.width>=12&&icon.width>=12,'visible yellow bitmap size '+detail);
    assert.ok(icon.box.x>=row.box.x-.5&&icon.box.right<=row.box.right+.5&&icon.box.y>=row.box.y-.5&&icon.box.bottom<=row.box.bottom+.5,'FREE icons fit their own row '+detail);
   }
  }
 }
}
try{
 const executable=process.env.PLAYWRIGHT_EXECUTABLE_PATH;
 browser=await chromium.launch({headless:true,...(executable?{executablePath:executable}:{}),args:['--no-sandbox']});
 page=await browser.newPage({viewport:{width:1366,height:750}});
 assert.deepEqual(await setup(page),{rules:268,view:269,assets:true});
 report.initial=await page.evaluate(()=>({highest:qa269.view.describe().highestCells,zero:qa269.cell(2,1).textContent,zeroCurrent:qa269.cell(2,1).classList.contains('current'),oddsHidden:document.querySelector('.dgb-pay-odds').hidden,removedGrantText:document.querySelectorAll('.dgb-free-grant').length,idleMotion:DangoBingoView.describeAssets().last.main.idleMotion,colors:DangoBingoView.lineColors,freeTitle:document.querySelector('.dgb-free-title').textContent,value:document.querySelector('.dgb-free-value').textContent}));
 assert.deepEqual(report.initial.highest,[{length:4,count:3},{length:5,count:3},{length:6,count:2},{length:6,count:3},{length:7,count:2},{length:7,count:3}]);
 assert.equal(report.initial.zero,'-');assert.equal(report.initial.zeroCurrent,false);assert.equal(report.initial.oddsHidden,true);assert.equal(report.initial.idleMotion,false);assert.equal(report.initial.removedGrantText,0);assert.equal(report.initial.colors[2],'#269eff');assert.equal(report.initial.colors[3],'#4ee3f5');
 for(const [width,height]of viewports){const m=await fit(width,height);report.firstHalf.push(m);checkLayout(m,{rail:true});await page.screenshot({path:output+'/v269-first-half-'+width+'x'+height+'.png'});}
 // Entering the fifth-ball thinking state immediately removes every early icon.
 await page.evaluate(()=>qa269.seven());assert.equal(await page.evaluate(()=>qa269.state.freeBudget),7);
 for(const [width,height]of [[1366,750],[390,300],[320,270],[320,480]]){
  const m=await fit(width,height,{remainingMs:Infinity});report.thinking.push(m);checkLayout(m);assert.equal(m.manualWait,'6球目の番号待ち');assert.deepEqual(m.freeTextOverflow,[],'manual wait label stays inside FREE card '+JSON.stringify(m));
  await page.screenshot({path:output+'/v269-thinking-'+width+'x'+height+'.png'});
 }
 await fit(1366,750);
 const initialFree=await page.evaluate(()=>qa269.state.initialFreeCells[0]);await page.locator('.dgb-cell[data-cell-id="'+initialFree+'"]').click();
 report.odds=await page.evaluate(()=>({hidden:document.querySelector('.dgb-pay-odds').hidden,text:document.querySelector('.dgb-pay-odds').textContent,remaining:document.querySelector('.dgb-free-value').textContent,placed:qa269.state.manualFreeCells.length}));
 assert.equal(report.odds.hidden,false);assert.equal(report.odds.text,'Odds UP!2倍');assert.match(report.odds.remaining,/6個/);assert.equal(report.odds.placed,1);
 report.oddsPanels=[];
 for(const [width,height]of [[320,270],[390,300]]){
  const m=await fit(width,height,{remainingMs:Infinity}),before=report.thinking.find(row=>row.width===width&&row.height===height);report.oddsPanels.push(m);checkLayout(m);
  assert.ok(m.odds&&m.odds.y>=m.matrix.bottom-.5,'Odds badge sits below the compact matrix '+JSON.stringify(m));
  assert.ok(Math.abs(m.unit-before.unit)<.01&&Math.abs(m.free.x-before.free.x)<.01&&Math.abs(m.free.y-before.free.y)<.01,'Odds activation preserves board and FREE-card positions '+JSON.stringify({before,after:m}));
  assert.deepEqual(m.freeTextOverflow,[],'untimed Odds 2 placement text fits '+JSON.stringify(m));assert.equal(m.manualWait,'6球目の番号待ち');
  await page.screenshot({path:output+'/v269-thinking-odds2-'+width+'x'+height+'.png'});
 }
 await fit(1366,750);
 await page.locator('.dgb-cell[data-cell-id="'+initialFree+'"]').click();assert.equal(await page.evaluate(()=>document.querySelector('.dgb-pay-odds').hidden),true);
 await page.evaluate(()=>qa269.six());
 report.reach=await page.evaluate(()=>({two:qa269.cell(6,2).classList.contains('reach'),three:qa269.cell(6,3).classList.contains('reach'),oneCurrent:qa269.cell(6,1).classList.contains('current'),label:getComputedStyle(qa269.cell(6,2),'::after').content,animation:getComputedStyle(qa269.cell(6,2)).animationName,earnedAnimation:getComputedStyle(qa269.cell(6,1)).animationName,hitLabelPosition:DangoBingoView.describeAssets().last.main.hitLabelPosition,sparkleCells:DangoBingoView.describeAssets().last.main.sparkleCells,style:DangoBingoView.describeAssets().last.main.reachStyle,railVisible:!document.querySelector('.dgb-free-rail').hidden}));
 assert.equal(report.reach.two,true);assert.equal(report.reach.three,false);assert.equal(report.reach.oneCurrent,true);assert.match(report.reach.label,/リーチ!/);assert.match(report.reach.animation,/dgb-next-ball-reach/);assert.equal(report.reach.earnedAnimation,'none');assert.equal(report.reach.hitLabelPosition,'number-overlay');assert.ok(report.reach.sparkleCells>=6);assert.equal(report.reach.railVisible,false);
 assert.ok(report.reach.style.pulse<=.06&&report.reach.style.glow<=.13&&report.reach.style.labelSize<=.24,'quieter board reach pulse/glow and smaller letters');
 await page.screenshot({path:output+'/v269-next-ball-reach-desktop.png'});
 await page.evaluate(()=>{qa269.state=qa269.R.draw(qa269.state,qa269.state.numbers[20]);qa269.render();});
 report.get=await page.evaluate(()=>({two:qa269.cell(6,2).className,three:qa269.cell(6,3).className,label:getComputedStyle(qa269.cell(6,2),'::after').content,value:qa269.cell(6,2).textContent}));
 assert.match(report.get.two,/current/);assert.ok(!report.get.two.includes('reach'));assert.match(report.get.three,/reach/);assert.match(report.get.label,/GET!/);assert.equal(report.get.value,'3000');
 for(const [width,height]of viewports){const m=await fit(width,height);report.screens.push(m);checkLayout(m);await page.screenshot({path:output+'/v269-get-and-reach-'+width+'x'+height+'.png'});}
 await page.evaluate(()=>{qa269.bet=1000000000;qa269.render();});
 report.longNumbers=await page.evaluate(()=>[...document.querySelectorAll('.dgb-pay td .gold-number')].map(e=>({text:e.textContent,scale:+e.dataset.horizontalScale,font:parseFloat(getComputedStyle(e).fontSize),width:e.getBoundingClientRect().width,cell:e.parentElement.clientWidth})));
 assert.ok(report.longNumbers.some(n=>n.scale<.9));assert.ok(report.longNumbers.every(n=>n.font>=14&&n.width<=n.cell+1));await page.screenshot({path:output+'/v269-long-numbers-320x270.png'});
 report.final=await page.evaluate(()=>{
  qa269.bet=100;qa269.state=qa269.R.draw(qa269.state,qa269.state.numbers[26]);const before=JSON.stringify(qa269.state),payout=qa269.R.payout(qa269.state);
  qa269.render({reach:[]});const visual=qa269.R.presentationReaches(qa269.state),draw=DangoBingoView.describeAssets().last.main;
  return {phase:qa269.state.phase,count:qa269.state.draws.length,ordinary:qa269.R.reaches(qa269.state).length,visual:visual.length,allVisual:visual.every(hit=>hit.visualOnly&&hit.afterFinal),painted:draw.reachCount,afterFinal:draw.afterFinalReach,payoutUnchanged:payout===qa269.R.payout(qa269.state),unchanged:before===JSON.stringify(qa269.state),threeOneReach:qa269.cell(3,1).classList.contains('reach'),sixThreeGet:qa269.cell(6,3).classList.contains('current'),railVisible:!document.querySelector('.dgb-free-rail').hidden};
 });
 assert.equal(report.final.phase,'done');assert.equal(report.final.count,8);assert.equal(report.final.ordinary,0);assert.ok(report.final.visual>0);assert.equal(report.final.allVisual,true);assert.equal(report.final.painted,report.final.visual);assert.equal(report.final.afterFinal,true);assert.equal(report.final.payoutUnchanged,true);assert.equal(report.final.unchanged,true);assert.equal(report.final.threeOneReach,true);assert.equal(report.final.sixThreeGet,true);assert.equal(report.final.railVisible,false);
 await fit(390,300);await page.screenshot({path:output+'/v269-final-board-390x300.png'});
 // Fixed CSS minima must not shift the canvas relative to pointer targets on retina screens.
 const retina=await browser.newPage({viewport:{width:320,height:270},deviceScaleFactor:2});await setup(retina);
 await retina.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));report.retina=await retina.evaluate(()=>qa269.measure());checkLayout(report.retina,{rail:true});await retina.screenshot({path:output+'/v269-retina-320x270.png'});await retina.close();
 // A restored prior-version board keeps its own presentation and highest roles.
 await page.evaluate(()=>{qa269.state=qa269.R.create({rulesRevision:266,moldIndex:0});qa269.render();});assert.equal(await page.evaluate(()=>qa269.view.describe().highestCells.some(x=>x.length===3&&x.count===3)),true);
 await page.evaluate(()=>qa269.new());assert.equal(await page.evaluate(()=>qa269.view.describe().highestCells.length),6);
 assert.deepEqual(report.errors,[]);report.success=true;
 console.log('DANGO_V269_VIEW_PASS',JSON.stringify({highest:report.initial.highest,reach:report.reach,get:report.get,final:report.final,viewports:report.screens.length,errors:report.errors}));
}catch(error){report.failure=String(error.stack||error);if(page)await page.screenshot({path:output+'/failure.png'}).catch(()=>{});throw error;}
finally{await fs.writeFile(output+'/result.json',JSON.stringify(report,null,2)+'\n');if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}

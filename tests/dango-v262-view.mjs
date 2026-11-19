/* Render the real v262 rules/view/lesson with isolated local assets. This fixture
   never connects to a player server, sends a BET, or changes a real wallet. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root=path.resolve(fileURLToPath(new URL('..',import.meta.url))),out=path.resolve(process.env.DANGO_V262_VIEW_OUT||'qa-dango-v262-view');
await fs.mkdir(out,{recursive:true});
const mime={'.js':'text/javascript','.css':'text/css','.webp':'image/webp','.woff2':'font/woff2','.json':'application/json'};
const html='<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Dango v262 isolated view</title><style>html,body,#screen,#panels{width:100%;height:100%;margin:0;padding:0}#fixture{position:relative;width:100%;height:100%}@font-face{font-family:ElixirNumbers;src:url(/optimized/media/3af2886469024d10.woff2);font-weight:400}@font-face{font-family:ArcadePayout;src:url(/optimized/media/a73bbbdd98d48aac.woff2);font-weight:700}</style><link rel="stylesheet" href="/assets/dango-bingo.css"><div id="screen"><div id="panels"><div class="dgb-panel" id="fixture"></div></div></div><script src="/assets/dango-bingo-rules.js"></script><script src="/assets/dango-bingo-view.js"></script><script src="/assets/dango-bingo-lesson.js"></script></html>';
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);return;}
 if(url.pathname==='/favicon.ico'){res.statusCode=204;res.end();return;}
 const file=path.resolve(root,'.'+url.pathname);
 if(!file.startsWith(root+path.sep)){res.statusCode=403;res.end();return;}
 try{const data=await fs.readFile(file);res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(data);}catch{res.statusCode=404;res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser,page;
const report={revision:262,stage:'initialization',errors:[],failedRequests:[],art:null,screens:[],interaction:null,legacy:[],lessons:[]};
async function diagnostics(){
 if(!page)return null;
 try{return await page.evaluate(()=>{
  const rect=element=>{if(!element)return null;const r=element.getBoundingClientRect(),style=getComputedStyle(element);return {x:r.x,y:r.y,width:r.width,height:r.height,display:style.display,visibility:style.visibility,position:style.position,overflow:style.overflow};};
  const selectors=['html','body','#screen','#panels','#fixture','.dgb-scene','.dgb-pan','.dgb-cell-controls','.dgb-pay','.dgb-free-stat'];
  return {viewport:{width:innerWidth,height:innerHeight},elements:Object.fromEntries(selectors.map(selector=>[selector,rect(document.querySelector(selector))])),canvas:document.querySelector('canvas')?{width:document.querySelector('canvas').width,height:document.querySelector('canvas').height}:null,
   controls:[...document.querySelectorAll('.dgb-cell')].map(button=>({id:+button.dataset.cellId,disabled:button.disabled,hidden:button.hidden,tabIndex:button.tabIndex,...rect(button)})),state:window.qa262?{revision:qa262.state?.rulesRevision,phase:qa262.state?.phase,expansionLevel:qa262.state?.expansionLevel,center:qa262.state?.expansionCenter}:null,
   lastRender:window.DangoBingoView?.describeAssets?.().last.main||null};
 });}catch(error){return {diagnosticError:String(error)};}
}
try{
 const executablePath=process.env.PLAYWRIGHT_EXECUTABLE_PATH;
 browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{}),args:['--no-sandbox']});
 page=await browser.newPage({viewport:{width:1366,height:650},deviceScaleFactor:1});
 page.on('pageerror',error=>report.errors.push(error.message));
 page.on('requestfailed',req=>report.failedRequests.push({url:req.url(),error:req.failure()?.errorText}));
 await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'networkidle'});
 report.art=await page.evaluate(async()=>{
  await DangoBingoView.assetsReady;await document.fonts.ready;
  const image=new Image();image.src='/assets/dango-art-v252/scene.webp';await image.decode();
  return {...DangoBingoView.describeAssets(),background:{width:image.naturalWidth,height:image.naturalHeight}};
 });
 assert.equal(report.art.ready,true);assert.deepEqual(report.art.failed,[]);assert.equal(report.art.images.length,7);
 assert.ok(report.art.images.every(image=>image.loaded&&image.width>0&&image.height>0));
 await page.evaluate(()=>{
  const R=DangoBingoRules;
  const q=window.qa262={view:DangoBingoView.mount(document.getElementById('fixture')),state:null};
  q.draw=options=>q.view.draw(q.state,{bet:100,remainingMs:10000,reducedMotion:true,...options});
  q.firstFive=(level=2)=>{
   let state=R.create({seed:262,moldIndex:0,target:90});
   const candidates=R.geometry.cells.filter(cell=>R.expansionGeometry.sixNeighbors[cell.id].length===6);
   const preferred=candidates.slice().sort((a,b)=>R.expansionGeometry.sixNeighbors[b.id].filter(id=>state.initialFreeCells.includes(id)).length-R.expansionGeometry.sixNeighbors[a.id].filter(id=>state.initialFreeCells.includes(id)).length)[0]?.id;
   const triggers=state.triggerNumbers.slice(0,level),rest=Array.from({length:25},(_,i)=>i+1).filter(n=>!state.triggerNumbers.includes(n)&&n!==state.numbers[preferred]).slice(0,5-level);
   for(const n of [...triggers,...rest])state=R.draw(state,n);
   return state;
  };
  q.view.setCallbacks({onCell(id){const s=q.state;q.state=s.rulesRevision>=262?(s.expansionCenter===id?R.undoFree(s,id):R.placeFree(s,id)):(s.manualFreeCells.includes(id)?R.undoFree(s,id):R.placeFree(s,id));if(q.state)q.draw();},onAuto(){q.state=R.autoPlace(q.state);q.draw();}});
  q.state=q.firstFive(2);q.draw();
 });
 report.initialLayout=await diagnostics();
 assert.ok(report.initialLayout.elements['.dgb-scene'].width>100&&report.initialLayout.elements['.dgb-scene'].height>100,'fixture must have a nonzero viewport-sized scene: '+JSON.stringify(report.initialLayout.elements));
 report.stage='center-interaction';
 const center=await page.evaluate(()=>{
  const {state}=qa262,R=DangoBingoRules;return R.availableCenters(state).sort((a,b)=>R.expansionCellsFor(state,b).filter(id=>state.initialFreeCells.includes(id)).length-R.expansionCellsFor(state,a).filter(id=>state.initialFreeCells.includes(id)).length)[0];
 });
 const centerBounds=await page.locator('.dgb-cell[data-cell-id="'+center+'"]').boundingBox();
 assert.ok(centerBounds&&centerBounds.width>1&&centerBounds.height>1,'center target must have a visible area: '+JSON.stringify(centerBounds));
 await page.locator('.dgb-cell[data-cell-id="'+center+'"]').focus();
 const preview=await page.evaluate(()=>DangoBingoView.describeAssets().last.main.previewCount);assert.equal(preview,7);
 await page.locator('.dgb-cell[data-cell-id="'+center+'"]').click();
 const selected=await page.evaluate(()=>({center:qa262.state.expansionCenter,area:qa262.state.expansionCells.length,odds:qa262.state.oddsMultiplier,overlap:qa262.state.overlapFreeCells.length,visibleOdds:document.querySelector('.dgb-odds-value').textContent,pressed:[...document.querySelectorAll('.dgb-cell[aria-pressed="true"]')].map(b=>+b.dataset.cellId)}));
 assert.equal(selected.center,center);assert.equal(selected.area,7);assert.ok(selected.overlap>0);assert.equal(selected.odds,1+selected.overlap);assert.equal(selected.visibleOdds,'×'+selected.odds);assert.deepEqual(selected.pressed,[center]);
 await page.locator('.dgb-cell[data-cell-id="'+center+'"]').click();
 assert.deepEqual(await page.evaluate(()=>({center:qa262.state.expansionCenter,odds:qa262.state.oddsMultiplier})),{center:null,odds:1});
 await page.locator('.dgb-cell[data-cell-id="'+center+'"]').click();
 report.interaction={preview,selected,undoRestoredOdds:true};
 for(const [width,height]of [[390,540],[844,340],[1366,650],[375,667],[768,650]]){
  report.stage='viewport-'+width+'x'+height;await page.setViewportSize({width,height});await page.evaluate(()=>qa262.draw());
  await page.waitForFunction(()=>document.querySelector('canvas').width===innerWidth);
  const measured=await page.evaluate(()=>{
   const s=qa262.state,root=document.querySelector('.dgb-scene'),w=root.clientWidth,h=root.clientHeight,g=DangoBingoView.geometry(w,h,{state:s}),p=DangoBingoView.payoutLayout(w,h,s);
   const box=element=>{const r=element.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
   const free=box(document.querySelector('.dgb-free-stat')),table=box(document.querySelector('.dgb-pay'));
   const distance=(rect,point)=>Math.hypot(point.x-Math.max(rect.x,Math.min(rect.x+rect.width,point.x)),point.y-Math.max(rect.y,Math.min(rect.y+rect.height,point.y)));
   const valueOverflow=[...document.querySelectorAll('.dgb-pay tbody td')].filter(td=>td.scrollWidth>td.clientWidth+1).map(td=>({length:td.parentElement.dataset.length,count:td.dataset.count,width:td.clientWidth,scrollWidth:td.scrollWidth}));
   return {width:w,height:h,geometry:g,payout:p,table,free,freeClearance:Math.min(...g.centers.map(point=>distance(free,point))),cells:document.querySelectorAll('.dgb-cell').length,payCells:document.querySelectorAll('.dgb-pay tbody td').length,lengths:[...document.querySelectorAll('.dgb-pay tbody tr')].map(tr=>+tr.dataset.length),highest:qa262.view.describe().highestCells,inside:g.centers.every(point=>point.x-g.radius>=0&&point.x+g.radius<=w&&point.y-g.radius>=0&&point.y+g.radius<=h),valueOverflow,rendered:DangoBingoView.describeAssets().last.main};
  });
  assert.equal(measured.cells,28);assert.equal(measured.payCells,15);assert.deepEqual(measured.lengths,[3,4,5,6,7]);assert.equal(measured.highest.length,5);assert.equal(measured.inside,true);
  assert.ok(measured.payout.minClearance>=measured.geometry.radius-.1,'payout must not cover mochi');assert.ok(measured.freeClearance>=measured.geometry.radius-.1,'FREE controls must not cover mochi');assert.deepEqual(measured.valueOverflow,[]);
  assert.ok(measured.table.right<=width+1&&measured.table.bottom<=height+1);assert.equal(measured.rendered.imageCells,28);assert.equal(measured.rendered.standRendered,true);
  await page.screenshot({path:path.join(out,'modern-'+width+'x'+height+'.png')});report.screens.push(measured);
 }
 report.stage='seventeen-cell-overlap';
 // A permanently FREE center is legal, and all 17 sites preview together.
 await page.setViewportSize({width:844,height:540});
 const freeCenter=await page.evaluate(()=>{qa262.state=qa262.firstFive(3);qa262.draw();return qa262.state.initialFreeCells[0];});
 await page.locator('.dgb-cell[data-cell-id="'+freeCenter+'"]').focus();
 assert.equal(await page.evaluate(()=>DangoBingoView.describeAssets().last.main.previewCount),17);
 await page.locator('.dgb-cell[data-cell-id="'+freeCenter+'"]').click();
 assert.equal(await page.evaluate(()=>qa262.state.expansionCenter),freeCenter);
 const late=await page.evaluate(()=>{
  const R=DangoBingoRules,q=qa262;q.state=R.commitFree(q.state,{autoFill:false});
  const candidates=q.state.expansionCells.map(id=>q.state.numbers[id]).filter(n=>n>0&&!q.state.draws.includes(n)),before=q.state.oddsMultiplier;
  for(const n of candidates.slice(0,3))q.state=R.draw(q.state,n);q.draw();
  return {phase:q.state.phase,before,after:q.state.oddsMultiplier,odds:document.querySelector('.dgb-odds-value').textContent,area:q.state.expansionCells.length,rainbow:DangoBingoView.describeAssets().last.main.kinds.rainbow};
 });
 assert.equal(late.phase,'done');assert.equal(late.after,late.before+3);assert.equal(late.odds,'×'+late.after);assert.equal(late.area,17);assert.ok(late.rainbow>=3);report.interaction.late=late;
 await page.screenshot({path:path.join(out,'modern-overlap-and-late-hit.png')});
 const legacy251=JSON.parse(await fs.readFile(path.join(root,'tests/dango-v251-checkpoints.json'),'utf8')).committed;
 const legacy253=JSON.parse(await fs.readFile(path.join(root,'tests/dango-v253-checkpoints.json'),'utf8')).committed[0];
 for(const state of [legacy251,legacy253]){
  report.stage='legacy-'+state.rulesRevision;await page.evaluate(state=>{qa262.state=state;qa262.draw();},state);
  const legacy=await page.evaluate(()=>({revision:qa262.state.rulesRevision,cells:document.querySelectorAll('.dgb-cell').length,payCells:document.querySelectorAll('.dgb-pay tbody td').length,lengths:[...document.querySelectorAll('.dgb-pay tbody tr')].map(tr=>+tr.dataset.length),modern:qa262.view.describe().modern,rendered:DangoBingoView.describeAssets().last.main}));
  assert.equal(legacy.cells,25);assert.equal(legacy.payCells,13);assert.deepEqual(legacy.lengths,[3,4,5,7,9]);assert.equal(legacy.modern,false);assert.equal(legacy.rendered.imageCells,25);report.legacy.push(legacy);
  await page.screenshot({path:path.join(out,'legacy-'+state.rulesRevision+'.png')});
 }
 await page.evaluate(()=>{qa262.state=qa262.firstFive(2);qa262.draw();});assert.equal(await page.locator('.dgb-cell').count(),28);
 await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.id='qa-lesson';canvas.width=512;canvas.height=250;canvas.style.cssText='position:fixed;inset:0;z-index:99;background:#fff7e4';document.body.append(canvas);});
 for(let scene=0;scene<4;scene++){
  report.stage='lesson-'+scene;const lesson=await page.evaluate(scene=>{const canvas=document.getElementById('qa-lesson'),ctx=canvas.getContext('2d');ctx.clearRect(0,0,512,250);SweetsAttractLessons.dango.draw(ctx,scene,.92);return {scene,title:SweetsAttractLessons.dango.steps[scene].title,rendered:DangoBingoView.describeAssets().last.lesson};},scene);
  assert.equal(lesson.rendered.cells,28);assert.equal(lesson.rendered.imageCells,28);report.lessons.push(lesson);await page.locator('#qa-lesson').screenshot({path:path.join(out,'lesson-'+(scene+1)+'.png')});
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.failedRequests,[]);report.success=true;report.stage='complete';
 await fs.writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({success:true,viewports:report.screens.length,legacy:report.legacy.map(x=>x.revision),lessons:report.lessons.length,images:report.art.images.length,errors:report.errors}));
}catch(error){report.failure=String(error.stack||error);report.failureLayout=await diagnostics();await fs.writeFile(path.join(out,'partial-result.json'),JSON.stringify(report,null,2)+'\n');if(page)await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});throw error;}
finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}

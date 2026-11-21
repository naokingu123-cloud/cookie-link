/* Native browser evidence for current Dango. Run in CI; this isolated page
 * loads production rendering, CSS and rules without a wallet or live server. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root=path.resolve(fileURLToPath(new URL('..',import.meta.url))),out=path.resolve('qa-dango-v285-view');
await fs.mkdir(out,{recursive:true});
const native=await fs.readFile(path.join(root,'optimized/app-01.js'),'utf8');
const from=native.indexOf('function reachCometMarkup(tier){'),to=native.indexOf('\nconst paidReachDrawAllowed=',from);
assert.ok(from>=0&&to>from);
const circular=native.match(/function sixDropReachCometMarkup\(tier\)\{[^\n]+\}/)?.[0];assert.ok(circular);
const builders=native.slice(from,to)+'\n'+circular+'\n'+native.match(/const REACH_WORDS=\[[^;]+;/)[0]+'\n'+native.match(/const reachTier=[^\n]+;/)[0];
const html='<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Dango v285 isolated presentation</title><link rel="stylesheet" href="/optimized/style-01.css"><link rel="stylesheet" href="/optimized/style-03.css"><style>html,body,#screen,#panels{width:100%!important;height:100%!important;min-height:0!important;margin:0!important;padding:0!important;display:block!important;overflow:hidden!important;transform:none!important}#screen{position:fixed!important;inset:0!important}#panels,#fixture{position:relative!important;width:100%!important;height:100%!important}@font-face{font-family:ElixirNumbers;src:url(/optimized/media/3af2886469024d10.woff2)}@font-face{font-family:ArcadePayout;src:url(/optimized/media/a73bbbdd98d48aac.woff2);font-weight:700}</style><link rel="stylesheet" href="/assets/dango-bingo.css"><link rel="stylesheet" href="/assets/ornate-boards-c-v274.css"><body class="dgb-active"><div id="screen"><div id="panels"><div class="dgb-panel" id="fixture"></div></div></div><svg width="0" height="0" aria-hidden="true"><defs><linearGradient id="reach-rainbow-edge"><stop stop-color="#ff487d"/><stop offset=".5" stop-color="#59efb6"/><stop offset="1" stop-color="#bb78ff"/></linearGradient></defs></svg><script>'+builders+'</script><script src="/assets/dango-bingo-rules.js"></script><script src="/assets/illustrated-art-v275.js"></script><script src="/assets/illustrated-boards-c-v275.js"></script><script src="/assets/dango-bingo-view.js"></script><script src="/assets/dango-bingo-lesson.js"></script></body></html>';
const mime={'.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.json':'application/json'};
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');if(url.pathname==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);return;}
 if(url.pathname==='/favicon.ico'){res.statusCode=204;res.end();return;}
 const file=path.resolve(root,'.'+url.pathname);if(!file.startsWith(root+path.sep)){res.statusCode=403;res.end();return;}
 try{const body=await fs.readFile(file);res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(body);}catch{res.statusCode=404;res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const report={revision:285,rulesRevision:285,errors:[],assetFailures:[],viewports:[],fade:[],screens:[],scope:'Production isolated display; no wallet, shared session or invented lottery results.'};
const viewports=[[1366,750],[844,340],[844,250],[1366,250],[390,844],[390,540],[320,480],[390,300],[320,270],[430,366]];
let browser,page;
async function setup(p){
 p.on('pageerror',error=>report.errors.push(String(error)));
 p.on('response',response=>{if(response.status()>=400)report.assetFailures.push({url:response.url(),status:response.status()});});
 await p.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'networkidle'});
 return p.evaluate(async()=>{
  // This isolated fixture creates the first gold label only at mount. Merely
  // awaiting fonts.ready before that does not request its face, so measurement
  // could otherwise race a fallback-to-ArcadePayout font swap.
  const [,,payoutFonts,numberFonts]=await Promise.all([
   DangoBingoView.assetsReady,SweetsBoardArtV275.ready,
   document.fonts.load('700 28px ArcadePayout','0123456789'),
   document.fonts.load('900 36px ElixirNumbers','0123456789')
  ]);
  if(!payoutFonts.length||!numberFonts.length)throw Error('Production numeral fonts must load before display measurement');
  await document.fonts.ready;
  const R=DangoBingoRules,q=window.qa285={R,view:DangoBingoView.mount(document.getElementById('fixture')),state:null,bet:100,calls:[],states:{}};
  q.canvas=q.view.canvas;
  const fill=CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText=function(value,x,y,...rest){
   if(this.canvas===q.canvas){const m=this.measureText(String(value)),t=this.getTransform(),p=new DOMPoint(x,y).matrixTransform(t),dpr=Math.min(2,devicePixelRatio||1);
    q.calls.push({text:String(value),x:p.x/dpr,y:p.y/dpr,left:(p.x-m.actualBoundingBoxLeft*t.a)/dpr,right:(p.x+m.actualBoundingBoxRight*t.a)/dpr,top:(p.y-m.actualBoundingBoxAscent*t.d)/dpr,bottom:(p.y+m.actualBoundingBoxDescent*t.d)/dpr,alpha:this.globalAlpha});}
   return fill.call(this,value,x,y,...rest);
  };
  q.render=(options={})=>{q.calls=[];q.view.draw(q.state,{bet:q.bet,time:1200,age:Infinity,lineAge:Infinity,remainingMs:Infinity,reducedMotion:true,reach:R.presentationReaches(q.state),...options});q.paintCalls=q.calls.slice();};
  q.reset=()=>{const triggerCells=R.cells.filter(c=>!R.molds[0].initialFreeCells.includes(c.id)).slice(0,3).map(c=>c.id);q.state=R.create({moldIndex:0,numbers:Array.from({length:25},(_,i)=>i+1),triggerCells});q.render();return q.state;};
  q.hit=n=>{q.state=R.draw(q.state,n);if(!q.state)throw Error('Invalid real test draw '+n);q.render();};
  q.thinking=()=>{q.reset();const early=[q.state.triggerNumbers[0],...Array.from({length:25},(_,i)=>i+1).filter(n=>!q.state.triggerNumbers.includes(n)).slice(0,4)];for(const n of early)q.hit(n);return q.state;};
  q.view.setCallbacks({onCell(id){q.state=q.state.manualFreeCells.includes(id)?R.undoFree(q.state,id):R.placeFree(q.state,id);if(!q.state)throw Error('Invalid manual choice '+id);q.render();},onAuto(){q.state=R.autoPlace(q.state);q.render();}});
  q.measure=()=>{
   const scene=document.querySelector('.dgb-scene'),g=DangoBingoView.geometry(scene.clientWidth,scene.clientHeight,{state:q.state}),dpr=Math.min(2,devicePixelRatio||1);
   const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,cx:(r.left+r.right)/2,cy:(r.top+r.bottom)/2};};
   const frame=rect(document.querySelector('.dgb-pay-matrix')),table=rect(document.querySelector('.dgb-pay')),free=rect(document.querySelector('.dgb-free-stat')),oddsEl=document.querySelector('.dgb-pay-odds'),odds=oddsEl.hidden?null:rect(oddsEl);
   const distance=(r,p)=>Math.hypot(p.x-Math.max(r.x,Math.min(r.right,p.x)),p.y-Math.max(r.y,Math.min(r.bottom,p.y)));
   const draw=DangoBingoView.describeAssets().last.main;
   const numerals=[...document.querySelectorAll('.dgb-pay td')].map(td=>{
    const value=td.querySelector('.gold-number'),cell=rect(td),box=rect(value),style=getComputedStyle(value),badges=[];
    for(const pseudo of ['::before','::after']){const s=getComputedStyle(td,pseudo);if(s.content&&s.content!=='none'&&s.content!=='normal'&&s.content!=='""'&&s.display!=='none'){
     const top=parseFloat(s.top),font=parseFloat(s.fontSize),line=parseFloat(s.lineHeight);badges.push({pseudo,content:s.content,font,top:cell.y+top,bottom:cell.y+top+(Number.isFinite(line)?line:font)});}}
    return {length:+td.parentElement.dataset.length,count:+td.dataset.count,text:value.textContent,cell,value:box,font:parseFloat(style.fontSize),rightGap:cell.right-box.right,scale:+value.dataset.horizontalScale,badges};
   });
   const calls=[...new Map(q.paintCalls.map(c=>[c.text+':'+c.x.toFixed(3)+':'+c.y.toFixed(3),c])).values()];
   // HIT may sit just outside the mochi edge to leave a real glyph gap on a
   // compact canvas. Keep the same narrow X/number association, then verify
   // the actual painted bounds below rather than discarding that edge label.
   const labels=q.state.cells.filter(c=>c.number>0).map(cell=>{const p=g.centers[cell.id],near=text=>calls.find(c=>c.text===text&&Math.abs(c.x-p.x)<.5&&Math.abs(c.y-p.y)<g.radius*(text==='HIT!'?1.3:1));return {id:cell.id,number:cell.number,hit:cell.hit,trigger:cell.trigger,numberBox:near(String(cell.number)),hitBox:near('HIT!'),plusBox:near('+FREE')};});
   const captions=[...document.querySelectorAll('.dgb-reach-layer .six-reach-cell')].map(el=>{const cell=q.state.cells.find(c=>c.number===+el.dataset.number),p=g.centers[cell.id];return {number:cell.number,tier:+el.dataset.tier,cell:p,box:rect(el.querySelector('.tile-reach')),text:el.querySelector('.tile-reach').textContent,glints:el.querySelectorAll('.reach-glints i').length,circles:el.querySelectorAll('.allclear-reach-perimeter circle').length};});
   const legacy=DangoBingoView.geometry(scene.clientWidth,scene.clientHeight,{state:R.legacy268.create({moldIndex:0,numbers:Array.from({length:25},(_,i)=>i+1)})});
   return {width:scene.clientWidth,height:scene.clientHeight,unit:g.unit,radius:g.radius,centers:g.centers,stand:g.stand,legacyUnit:legacy.unit,free,freeReserve:g.free,frame,table,odds,
    inside:g.centers.every(p=>p.x-g.radius>=-.5&&p.x+g.radius<=scene.clientWidth+.5&&p.y-g.radius>=-.5&&p.y+g.radius<=scene.clientHeight+.5),
    canvasMatches:Math.abs(draw.geometry.unit/dpr-g.unit)<.02&&draw.geometry.centers.every((p,i)=>Math.abs(p.x/dpr-g.centers[i].x)<.02&&Math.abs(p.y/dpr-g.centers[i].y)<.02),
    controlsMatch:[...document.querySelectorAll('.dgb-cell')].every((button,i)=>Math.abs(parseFloat(button.style.left)-g.centers[i].x)<.02&&Math.abs(parseFloat(button.style.top)-g.centers[i].y)<.02),
    tableClearance:Math.min(...[frame,odds].filter(Boolean).flatMap(r=>g.centers.map(p=>distance(r,p)))),freeClearance:Math.min(...g.centers.map(p=>distance(free,p))),
    numerals,labels,captions,draw,cyanDango:DangoBingoView.describeAssets().cyanDango,description:q.view.describe(),dataset:{...scene.dataset},headings:[...document.querySelectorAll('.dgb-pay thead th')].map(e=>e.textContent),
    railHidden:document.querySelector('.dgb-free-rail').hidden,railNodes:document.querySelectorAll('.dgb-free-rail-row').length,
    freeText:document.querySelector('.dgb-free-value').textContent,manualWait:document.querySelector('.dgb-countdown').textContent,
    tableOverflow:[...document.querySelectorAll('.dgb-pay td,.dgb-pay th')].filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>({text:e.textContent,width:e.clientWidth,scroll:e.scrollWidth})),
    freeOverflow:[...document.querySelectorAll('.dgb-free-stat>small,.dgb-free-stat>b,.dgb-free-detail,.dgb-countdown,.dgb-actions button')].filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>({text:e.textContent,width:e.clientWidth,scroll:e.scrollWidth})),
    state:{draws:q.state.draws,phase:q.state.phase,freeBudget:q.state.freeBudget,freeRemaining:q.state.freeRemaining,triggerNumbers:q.state.triggerNumbers,odds:q.state.oddsMultiplier,win:R.payout(q.state)}};
  };
  q.reset();q.states.initial=q.state;return {rules:R.REVISION,view:DangoBingoView.presentationRevision,revision:q.view.describe().revision,assets:DangoBingoView.describeAssets().ready};
 });
}
function checkLayout(m){
 const detail=JSON.stringify({width:m.width,height:m.height,unit:m.unit,table:m.table,free:m.free,odds:m.odds});
 assert.equal(m.inside,true,'board containment '+detail);assert.equal(m.canvasMatches,true,'canvas coordinates '+detail);assert.equal(m.controlsMatch,true,'click targets '+detail);
 for(const box of [m.table,m.free])assert.ok(box.x>=-.5&&box.y>=-.5&&box.right<=m.width+1&&box.bottom<=m.height+1,'panel containment '+detail);
 assert.ok(m.tableClearance>=m.radius-.5,'table clears mochi '+detail);assert.ok(m.freeClearance>=m.radius-.5,'FREE card clears mochi '+detail);
 assert.ok(m.unit>=m.legacyUnit-.01,'board grows from v268 '+detail);assert.deepEqual(m.tableOverflow,[]);assert.deepEqual(m.freeOverflow,[]);
 assert.equal(m.railHidden,true);assert.equal(m.railNodes,0);assert.deepEqual(m.headings,['ライン','1個','2個','3個']);assert.equal(m.description.revision,285);
 assert.equal(m.draw.imageCells,28);assert.equal(m.draw.standRendered,true);assert.equal(m.draw.greenHitCells,3,'green FREE must glow as a HIT');assert.equal(m.draw.hitSparkleCells,m.state.draws.length+3);assert.equal(m.draw.hitLabelPosition,'edge-outside-number');
 assert.equal(m.cyanDango.baked,true,'cyan needs an independent raster sprite');assert.ok(m.cyanDango.cyanPixels>=100,'aqua pigments have been baked into the bitmap');assert.ok(m.cyanDango.meanBlueMinusRed>=3&&m.cyanDango.meanBlueMinusRed<=27,'light blue not HIT-cyan');assert.ok(m.cyanDango.meanLuminance>=230,'pale nearly-white cyan surface');assert.equal(m.draw.hitSparklesPerCell,11);
 for(const n of m.numerals){
  assert.ok(n.font>=14,'numeral height '+JSON.stringify(n));assert.ok(n.value.x>=n.cell.x-.75&&n.value.right<=n.cell.right+.75,'numeral fits '+JSON.stringify(n));
  assert.ok(n.rightGap>=0&&n.rightGap<=6,'numerals share the right edge '+JSON.stringify(n));
  for(const b of n.badges)assert.ok(Number.isFinite(b.bottom)&&b.bottom<=n.value.y+.75,'payout badge stays above numeral '+JSON.stringify(n));
 }
 for(const label of m.labels){
  assert.ok(label.numberBox,'number painted '+JSON.stringify(label));
  if(label.hit){assert.ok(label.hitBox,'HIT painted '+JSON.stringify(label));assert.ok(label.hitBox.left>=-.5&&label.hitBox.right<=m.width+.5&&label.hitBox.top>=-.5&&label.hitBox.bottom<=m.height+.5,'HIT caption stays on the canvas '+JSON.stringify(label));assert.ok(label.hitBox.bottom<=label.numberBox.top+.5||label.hitBox.top>=label.numberBox.bottom-.5,'HIT leaves number readable '+JSON.stringify(label));}
 }
 for(const caption of m.captions){assert.equal(caption.glints,3);assert.ok(caption.box.cy<caption.cell.y-m.radius*.35,'reach caption at upper edge '+JSON.stringify(caption));}
}
async function renderAt(p,width,height,stage,{bet=100,options={}}={}){
 await p.setViewportSize({width,height});
 await p.evaluate(({stage,bet,options})=>{qa285.state=qa285.states[stage];qa285.bet=bet;qa285.render(options);},{stage,bet,options});
 await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await p.evaluate(options=>qa285.render(options),options);return p.evaluate(()=>qa285.measure());
}
async function shot(name){const file=name+'.png';await page.screenshot({path:path.join(out,file)});report.screens.push(file);}
try{
 const executable=process.env.PLAYWRIGHT_EXECUTABLE_PATH;
 browser=await chromium.launch({headless:true,...(executable?{executablePath:executable}:{}),args:['--no-sandbox']});
 page=await browser.newPage({viewport:{width:1366,height:750}});
 assert.deepEqual(await setup(page),{rules:288,view:285,revision:285,assets:true});
 report.initial=await page.evaluate(()=>qa285.measure());checkLayout(report.initial);
 assert.equal(report.initial.draw.plusFree.cells.length,3);assert.equal(report.initial.draw.plusFree.opacity,1);assert.equal(report.initial.draw.plusFree.label,'+FREE');
 assert.equal(report.initial.draw.kinds.cyan,3,'all numbered +FREE are actual aqua mochi');assert.equal(report.initial.draw.kinds.green,3,'initial FREE remains a green HIT');
 assert.equal(report.initial.labels.filter(l=>l.plusBox).length,3);assert.match(report.initial.freeText,/×1/);
 assert.equal(report.initial.description.highestCells.length,5);assert.equal(report.initial.numerals.find(n=>n.length===7&&n.count===3).text,'—');
 await shot('initial-desktop');
 await page.evaluate(()=>{qa285.hit(qa285.state.triggerNumbers[0]);qa285.states.firstHit=qa285.state;});
 report.firstHit=await page.evaluate(()=>qa285.measure());checkLayout(report.firstHit);
 assert.equal(report.firstHit.state.freeBudget,2);assert.match(report.firstHit.freeText,/×2/);assert.equal(report.firstHit.description.plusFree.hits,1);
 assert.equal(report.firstHit.labels.filter(l=>l.hitBox).length,1);await shot('cyan-hit-free-two');
 await page.evaluate(()=>{qa285.thinking();qa285.states.thinking=qa285.state;});
 for(const age of [0,900,1800]){
  await page.evaluate(age=>qa285.render({reducedMotion:false,paused:true,plusFreeFadeAge:age}),age);
  const m=await page.evaluate(()=>qa285.measure());report.fade.push({age,opacity:m.draw.plusFree.opacity,labels:m.labels.filter(l=>l.plusBox).length,state:m.state});
  assert.equal(m.draw.plusFree.active,false);assert.equal(m.draw.plusFree.opacity,1-age/1800);assert.equal(m.labels.filter(l=>l.plusBox).length,age===1800?0:3);assert.equal(m.draw.kinds.cyan,age===1800?0:age===0?3:0);checkLayout(m);await shot('thinking-fade-'+age);
 }
 const chosen=await page.evaluate(()=>qa285.state.initialFreeCells[0]);
 await page.locator('.dgb-cell[data-cell-id="'+chosen+'"]').click();
 assert.equal(await page.evaluate(()=>qa285.state.oddsMultiplier),2);
 const lateCell=await page.evaluate(()=>qa285.state.triggerCells[1]);
 await page.locator('.dgb-cell[data-cell-id="'+lateCell+'"]').click();
 await page.evaluate(()=>{qa285.states.odds=qa285.state;qa285.state=qa285.R.commitFree(qa285.state,{autoFill:false});qa285.states.committed=qa285.state;const late=[qa285.state.numbers[qa285.state.triggerCells[1]],...Array.from({length:25},(_,i)=>i+1).filter(n=>!qa285.state.draws.includes(n)&&n!==qa285.state.numbers[qa285.state.triggerCells[1]])].slice(0,3);for(const n of late)qa285.hit(n);qa285.states.final=qa285.state;});
 assert.equal(await page.evaluate(()=>qa285.state.oddsMultiplier),3);assert.equal(await page.evaluate(()=>qa285.state.freeBudget),2);
 for(const [width,height]of viewports){
  const stages=[];
  for(const stage of ['initial','thinking','odds','final']){
   const m=await renderAt(page,width,height,stage);checkLayout(m);stages.push({stage,...m});
   if(stage==='initial'||stage==='odds')await shot(stage+'-'+width+'x'+height);
  }
  for(const m of stages.slice(1)){assert.equal(m.unit,stages[0].unit);assert.deepEqual(m.centers,stages[0].centers,'stable board through placement/Odds/final');assert.deepEqual(m.freeReserve,stages[0].freeReserve);for(const key of ['x','y','width'])assert.ok(Math.abs(m.free[key]-stages[0].free[key])<.02,'stable FREE card position; its natural content height may change');}
  report.viewports.push({width,height,stages});
 }
 assert.ok(report.viewports.some(v=>v.stages[0].unit>v.stages[0].legacyUnit*1.1));
 report.largeBet=[];
 for(const [width,height]of [[1366,750],[844,250],[390,300],[320,270]]){const m=await renderAt(page,width,height,'final',{bet:1000000000});checkLayout(m);assert.ok(m.numerals.some(n=>n.scale<.9));report.largeBet.push(m);await shot('large-bet-'+width+'x'+height);}
 await renderAt(page,1366,750,'committed');
 report.sharedReach=await page.evaluate(()=>{
  const s=qa285.state,before=JSON.stringify(s),hits=s.cells.filter(c=>c.number>0&&!c.hit).slice(0,4).map((c,tier)=>({n:c.number,gainHundredths:100,gain:100,tier,allClear:tier===3}));
  qa285.render({reach:hits});const m=qa285.measure();return {unchanged:before===JSON.stringify(s),captions:m.captions,radius:m.radius};
 });
 assert.equal(report.sharedReach.unchanged,true);assert.deepEqual(report.sharedReach.captions.map(c=>c.tier),[0,1,2,3]);
 for(const c of report.sharedReach.captions)assert.ok(c.box.cy<c.cell.y-report.sharedReach.radius*.35,'all reach tiers sit above numbers');
 await shot('reach-caption-tiers');
 const retina=await browser.newPage({viewport:{width:320,height:270},deviceScaleFactor:2});await setup(retina);
 report.retina=await renderAt(retina,320,270,'initial');checkLayout(report.retina);await retina.screenshot({path:path.join(out,'retina-320x270.png')});report.screens.push('retina-320x270.png');await retina.close();
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.assetFailures,[]);report.ok=true;
 console.log('DANGO_V285_VIEW_PASS',JSON.stringify({viewports:report.viewports.length,stages:4,cyan:3,firstHitFree:2,fade:report.fade.map(f=>f.opacity),largeBet:report.largeBet.length,retina:true,screens:report.screens.length}));
}catch(error){report.ok=false;report.error=String(error?.stack||error);if(page){try{report.diagnostics=await page.evaluate(()=>qa285?.measure());await shot('failure');}catch{}}throw error;
}finally{await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser?.close();await new Promise(resolve=>server.close(resolve));}

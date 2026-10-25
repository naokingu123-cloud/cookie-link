'use strict';
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const {chromium}=require('playwright');
const source=fs.readFileSync('index.html','utf8'),baseline=fs.readFileSync('/tmp/cookielink-before.html','utf8');
assert(source.includes('enqueueBatch(numbers)')&&source.includes('function updateMiniResults('));
const anchor='app=new Arcade({onEvent:recordEvent,onChange:recordChanged});app.drawSource=rouletteDrawSource;select(0);';
const root=process.cwd();let origin;
const server=http.createServer((req,res)=>{try{const u=new URL(req.url,'http://localhost'),name=decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname),file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep))throw Error('invalid path');const ext=path.extname(file),type={'.html':'text/html;charset=utf-8','.svg':'image/svg+xml','.wav':'audio/wav','.mp3':'audio/mpeg','.js':'text/javascript'}[ext]||'application/octet-stream';res.writeHead(200,{'Content-Type':type});fs.createReadStream(file).on('error',()=>res.destroy()).pipe(res);}catch(e){res.writeHead(404);res.end();}});
async function open(browser,width=390,height=844,mobile=true,old=false){
 const context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const extra=old?'':',event,render,miniature,flushUI,clearMiniResult,showMiniResult,updateMiniResults,syncPendingHitTiles,syncBetPreview,MINI_RESULT_MS';
 const hook='window.__batchQA={app,slots,Engine,Arcade,select,hud,normalBoardsSettled,debugResetRound,get ready(){return rouletteReady},get driver(){return rouletteDriver},hold(){userPaused=true;syncPause();stopAutoRound()}};$('+'"sound"'+').checked=false;userPaused=true;app.paused=true;';
 const text=(old?baseline:source);assert.equal(text.split(anchor).length,2);
 const injected=hook.replace('debugResetRound,get ready','debugResetRound'+extra+',get ready');
 await page.route('**/index.html*',r=>r.fulfill({contentType:'text/html;charset=utf-8',body:text.replace(anchor,anchor+injected)}));
 await page.goto(origin+'/index.html',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__batchQA?.ready,{},{timeout:30000});await page.evaluate(()=>{window.__batchQA.hold();return document.fonts.ready;});assert.deepEqual(errors,[]);return{page,context,errors};
}
async function grouped(page){
 const result=await page.evaluate(async()=>{
  const q=window.__batchQA,check=(x,m)=>{if(!x)throw Error(m);},same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),results=[];
  const wait=async(fn)=>{for(let n=0;n<100;n++){if(fn())return;await new Promise(r=>setTimeout(r,0));}throw Error('Engine failed to settle');};
  for(const colorCount of [3,4,5])for(const seed of [41,918,7303]){
   let rng=seed,callbacks;const log=[],random=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;};
   const a=new q.Arcade({random,colorCount,sleep:()=>Promise.resolve(),onEvent:(i,ev,e)=>{if(i===1)log.push({phase:ev.phase,kind:ev.kind,number:ev.number,numbers:ev.numbers,ball:ev.ball,depth:ev.depth,primary:ev.primaryCells,processed:e.processed,link:ev.batchMaxLink,clears:ev.batchAllClears,groups:ev.groups?.map(g=>g.size)});if(ev.phase==='error')throw Error(ev.message);}});
   a.drawSource={ready:true,start(c){callbacks=c;},reset(){},pause(){}};a.bets=[0,100,0];
   const disabled=[0,2].map(i=>JSON.stringify({board:a.engines[i].board,basket:a.engines[i].basketState,token:a.engines[i].wonderToken}));
   check(a.start(),'start');const e=a.engines[1];await wait(()=>!e.opening);const before=JSON.stringify(e.board),beforeRng=rng;
   check(callbacks.onNumber(1)!==false,'first draw');check(callbacks.onNumber(2)!==false,'second draw');
   check(JSON.stringify(e.board)===before&&rng===beforeRng,'Board/RNG changed before ball 3');check(e.processed===0&&e.accepted===0&&!log.some(v=>v.phase==='hit'),'Early clear');check(same([...e.pendingDraws],[1,2]),'Pending preview');
   const union=ns=>e.board.flatMap((row,r)=>row.flatMap((t,c)=>t&&ns.includes(t.number)?[[r,c]]:[]));
   const first=union([1,2,3]);callbacks.onNumber(3);await wait(()=>e.processed===3&&e.idle);
   const hit1=log.filter(x=>x.phase==='hit');check(hit1.length===1&&same(hit1[0].numbers,[1,2,3])&&same(hit1[0].primary,first),'First group is not an atomic union');
   const middle=JSON.stringify(e.board),middleRng=rng;callbacks.onNumber(4);check(JSON.stringify(e.board)===middle&&rng===middleRng&&e.processed===3,'Early fourth-ball clear');
   const second=union([4,5]);callbacks.onNumber(5);await wait(()=>e.processed===5&&e.idle);
   const hit2=log.filter(x=>x.phase==='hit');check(hit2.length===2&&same(hit2[1].numbers,[4,5])&&same(hit2[1].primary,second),'Second group is not an atomic union');
   check(log.filter(x=>x.phase==='remove'&&x.kind==='hit').length===2,'Not exactly two primary clears for first five');
   check(log.filter(x=>x.phase==='refill'&&x.ball).length===2,'Not exactly two refills for first five');
   for(const n of [6,7,8]){callbacks.onNumber(n);await wait(()=>e.processed===n&&e.idle);}
   check(e.accepted===8&&e.processed===8&&e.phase==='complete'&&a.phase==='result','Round did not finish');
   const hits=log.filter(x=>x.phase==='hit');check(same(hits.map(x=>x.numbers.length),[3,2,1,1,1]),'Incorrect final group sizes');
   check(same(log.filter(x=>x.phase==='settled').map(x=>x.processed),[3,5,6,7,8]),'Processed counts are batches instead of balls');
   check(same([...e.drawn],[1,2,3,4,5,6,7,8])&&e.pendingDraws.size===0,'Draw/pending counters');
   let sizes=[];for(const ev of log){if(ev.phase==='hit')sizes=[];if(ev.phase==='link')sizes.push(...ev.groups);if(ev.phase==='settled')check(ev.link===Math.max(0,...sizes),'Stale round maximum leaked into batch result');}
   [0,2].forEach((i,j)=>check(disabled[j]===JSON.stringify({board:a.engines[i].board,basket:a.engines[i].basketState,token:a.engines[i].wonderToken})&&a.engines[i].accepted===0&&!a.engines[i].running,'0 BET engine mutated'));
   check(!e.enqueueBatch([9]),'Completed engine accepts draws');results.push({colorCount,seed,groups:hits.map(x=>x.numbers.length),win:e.totalHundredths});
  }
  const e=new q.Engine({sleep:()=>Promise.resolve()});e.running=true;e.busy=true;const input=[10,11,12];check(e.enqueueBatch(input),'Valid batch rejected');input[0]=25;check(same(e.queue[0],[10,11,12]),'Caller mutated accepted batch');
  check(!e.enqueueBatch([13,13])&&!e.enqueueBatch([14,26])&&!e.enqueueBatch([10,15])&&!e.enqueueBatch([])&&e.accepted===3&&e.queue.length===1,'Partial invalid batch accepted');
  e.version++;e.running=false;e.queue=[];
  return results;
 });console.log('ATOMIC_3_2_1_1_1_UNIONS_NO_EARLY_CLEAR_ZERO_BET_OK',JSON.stringify(result));
}
async function singles(page){return page.evaluate(async()=>{
 const q=window.__batchQA,all=[];
 for(const colorCount of [3,4,5])for(const seed of [31,2901]){
  let rng=seed,complete;const done=new Promise(r=>complete=r),random=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;};
  const e=new q.Engine({random,colorCount,sleep:()=>Promise.resolve(),onEvent:ev=>{if(ev.phase==='complete')complete();if(ev.phase==='error')throw Error(ev.message);}});e.start();for(let n=1;n<=8;n++)e.enqueue(n);await done;
  all.push({colorCount,seed,board:e.board,maxLink:e.maxLink,maxChain:e.maxChain,payout:e.totalHundredths,history:e.history,steps:e.roundSteps,hammers:e.roundHammers,clears:e.allClears,rng});
 }return all;
});}
async function visual(page){
 const preview=await page.evaluate(()=>{
  const q=window.__batchQA,a=q.app;q.hold();a.phase='playing';a.enabled=[true,true,true];a.bets=[100,100,100];a.locked=[100,100,100];a.draws=[1,2];q.select(0);q.syncBetPreview(a);
  for(const s of q.slots){s.engine.phase='waiting';s.engine.pendingDraws=new Set([1,2]);s.engine.processed=0;s.sugarAwardActive=false;s.event={phase:'waiting'};q.render(s,s.event,s.engine,false);q.syncPendingHitTiles(s);}
  q.hud(a);const s=q.slots[0],expected=s.engine.board.flat().filter(t=>t&&[1,2].includes(t.number)).map(t=>t.id),actual=[...s.tiles].filter(([,el])=>el.classList.contains('pending-hit')).map(([id])=>id);
  a.paused=false;q.miniature(q.slots[1]);
  return{expected:expected.sort((a,b)=>a-b),actual:actual.sort((a,b)=>a-b),names:[...s.tiles.values()].filter(el=>el.classList.contains('pending-hit')).map(el=>getComputedStyle(el.querySelector('.sweet')).animationName),history:[...document.querySelectorAll('#balls>span')].map(el=>getComputedStyle(el).animationName)};
 });console.log("PREVIEW_DIAGNOSTIC",JSON.stringify(preview));assert.deepEqual(preview.actual,preview.expected);assert(preview.expected.length>0&&preview.names.every(x=>x==='pending-cell-pulse'));assert(preview.history.every(x=>x==='none'));
 const hashes=[];for(let i=0;i<3;i++){await page.waitForTimeout(130);hashes.push(await page.evaluate(()=>{const s=window.__batchQA.slots[1],d=s.mini.getImageData(0,0,160,160).data;let h=2166136261;for(const b of d)h=Math.imul(h^b,16777619)>>>0;return h;}));}assert(new Set(hashes).size>1,'Mini pending cells did not blink');console.log('MAIN_AND_MINI_CELLS_PULSE_HISTORY_STATIC_OK',JSON.stringify({preview,hashes}));
 const bubble=await page.evaluate(()=>{
  const q=window.__batchQA,a=q.app,s=q.slots[1],e=s.engine,check=(x,m)=>{if(!x)throw Error(m);};a.paused=true;q.slots.forEach(s=>s.engine.pendingDraws.clear());e.maxLink=60;e.lastChain=12;s.sugarAwardActive=false;
  const fire=ev=>{e.phase=ev.phase;q.event(1,ev,e,a);q.updateMiniResults(a,1000);};
  for(const phase of ['hit','link','fall','refill','hammergift','allclear']){fire({phase,ball:3,number:3,numbers:[1,2,3],batchSize:3,ballStart:1,depth:3,groups:[],cells:[],primaryCells:[],clearColors:[],freshCells:[],stepCells:[],adjustedCells:[],count:0,pending:0,placements:[],requestedColors:[],duration:0});check(s.miniResult.hidden,'Bubble visible during '+phase);}
  fire({phase:'settled',ball:3,number:3,depth:3,batchMaxLink:7,batchAllClears:0});check(!s.miniResult.hidden,'Settled bubble missing');check(s.miniLastResult==='7 LINK · 3連鎖','Wrong or stale result');
  const rect=el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,cx:r.x+r.width/2,cy:r.y+r.height/2};};const outer=rect(s.tab.querySelector('.mini-wrap')),inner=rect(s.miniResult),tail=getComputedStyle(s.miniResult,':after').content;
  check(Math.abs(outer.cx-inner.cx)<1&&Math.abs(outer.cy-inner.cy)<1,'Bubble is not centered');check(inner.w<=outer.w&&inner.h<outer.h,'Bubble overflows');
  q.select(1);q.updateMiniResults(a,1000);check(s.miniResult.hidden,'Selected mini logo covered');q.select(0);q.updateMiniResults(a,1000);check(!s.miniResult.hidden,'Switching lost pending result');
  a.paused=false;q.updateMiniResults(a,1000);q.updateMiniResults(a,1250);check(s.miniResultState.remaining===1550,'Clock advance');a.paused=true;q.updateMiniResults(a,9000);check(s.miniResultState.remaining===1550,'Clock ran while paused');a.paused=false;q.updateMiniResults(a,10000);check(s.miniResultState.remaining===1550,'Resume ate paused time');q.updateMiniResults(a,11550);check(s.miniResult.hidden&&!s.miniResultState,'Bubble did not expire');a.paused=true;
  fire({phase:'waiting'});check(s.miniResult.hidden,'Waiting revived expired bubble');fire({phase:'settled',ball:5,depth:2,batchMaxLink:4,batchAllClears:0});check(!s.miniResult.hidden&&s.miniLastResult==='4 LINK · 2連鎖','Second group missing');
  fire({phase:'hit',ball:6,number:6,depth:1,cells:[],primaryCells:[],clearColors:[]});check(s.miniResult.hidden&&!s.miniResultState,'New HIT did not clear result');
  fire({phase:'settled',ball:6,depth:1,batchMaxLink:0,batchAllClears:0});check(s.miniResult.hidden,'Old max shown on no-link batch');
  fire({phase:'settled',ball:7,depth:3,batchMaxLink:9,batchAllClears:1});check(s.miniLastResult==='9 LINK · 3連鎖 · 全消し！','All-clear result lost');
  e.reset();q.updateMiniResults(a,12000);check(s.miniResult.hidden&&!s.miniResultState,'Reset left stale bubble');
  return{outer,inner,tail,remaining:1550};
 });console.log('SETTLED_ONLY_CENTERED_BUBBLE_EXPIRES_PAUSES_RESETS_OK',JSON.stringify(bubble));
 // Check actual wall-clock expiry, not only the injected deterministic clock.
 await page.evaluate(()=>{const q=window.__batchQA,a=q.app,s=q.slots[1];a.paused=false;s.engine.phase='settled';q.event(1,{phase:'settled',depth:3,batchMaxLink:8,batchAllClears:0},s.engine,a);q.updateMiniResults(a);});
 await page.waitForTimeout(2150);assert(await page.evaluate(()=>window.__batchQA.slots[1].miniResult.hidden&&!window.__batchQA.slots[1].miniResultState),'Actual timer failed');await page.evaluate(()=>window.__batchQA.hold());
}
async function driver(page){
 const result=await page.evaluate(()=>{
  const q=window.__batchQA,P={settings:{retain:false,interval:1},time:0,active:0,serial:0,hits:[],reset(){this.time=0;this.active=0;this.serial=0;this.hits=[];},launch(){this.serial++;this.active++;return{id:this.serial};},createLaunchSpec(){return{};},random(){return .5;}};
  const d=new q.driver.draw.constructor(P);let allow=true;d.canAdvance=()=>allow;d.start();const sizes=[];let prior=0;
  for(let g=0;g<5;g++){let n=20;while(!d.waiting&&--n>0){P.time+=2;d.update();}if(!n)throw Error('Group did not launch');sizes.push(P.serial-prior);prior=P.serial;d.update();if(d.group!==g)throw Error('Physical balls ignored');P.active=0;allow=false;P.time+=4;d.update();if(d.group!==g)throw Error('Busy boards ignored');allow=true;d.update();}
  return{sizes,total:P.serial,state:d.state};
 });assert.deepEqual(result,{sizes:[3,2,1,1,1],total:8,state:'complete'});console.log('EXISTING_PHYSICAL_DRAW_GROUP_GATE_OK');
}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const first=await open(browser);await grouped(first.page);const changedSingles=await singles(first.page);await driver(first.page);await visual(first.page);assert.deepEqual(first.errors,[]);await first.context.close();
  const old=await open(browser,390,844,true,true);assert.deepEqual(await singles(old.page),changedSingles,'Legacy single-draw RNG/scoring changed');assert.deepEqual(old.errors,[]);await old.context.close();console.log('SINGLE_DRAW_BOARD_PAYOUT_RNG_BASELINE_IDENTICAL_OK');
  for(const [w,h,mobile] of [[430,932,true],[1280,900,false]]){const test=await open(browser,w,h,mobile);await visual(test.page);assert.deepEqual(test.errors,[]);await test.context.close();console.log('LAYOUT_OK',w,h);}
  fs.appendFileSync('HANDOFF.md','- Verification: Chromium loaded the real embedded 3D app without page errors. Nine seeded grouped rounds across 3/4/5 colors verified union clears, no early mutations, counts 3/5/6/7/8, single refills, validation and 0-BET isolation. Six legacy single-draw rounds exactly matched the pre-change board, scoring, history and RNG. Mobile 390×844 / 430×932 and desktop 1280×900 verified board-cell pulsing, static history indicators, centered settled-only bubble, 1800 ms real-time expiry, pause/resume, selection and reset. Physical driver group gate remained 3/2/1/1/1.\n');
  console.log('ALL_MINI_BATCH_REGRESSIONS_PASSED');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);server.close();process.exit(1);});

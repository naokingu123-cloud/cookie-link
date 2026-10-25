const fs=require('fs'),assert=require('assert/strict');
const {chromium}=require('/tmp/cookielink-browser/node_modules/playwright');
const before=fs.readFileSync('/tmp/cookielink-before.html','utf8'),after=fs.readFileSync('index.html','utf8');
const anchor='app=new Arcade({onEvent:recordEvent,onChange:recordChanged});app.drawSource=rouletteDrawSource;select(0);';
async function open(browser,source,{width=390,height=844,mobile=true,hold=true}={}){
 const context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 let fields='app,slots,Engine,Arcade,renderRoundResult,debugResetRound,get ready(){return rouletteReady},get driver(){return rouletteDriver},get records(){return recordBook.data},get betDuration(){return BET_DURATION_MS},get remaining(){return autoRoundRemaining},halt(){stopAutoRound()},hold(){userPaused=true;syncPause();stopAutoRound()},resume(){userPaused=false;syncPause();scheduleAutoRound()}';
 if(source.includes('const RESULT_DISPLAY_MS=8000;'))fields+=',toggleJpcMode,restartJpcRound,paintJpcDashboard,stopResultAuto,get jpc(){return jpcSession},get resultElapsed(){return resultAutoElapsed},get resultDuration(){return RESULT_DISPLAY_MS},syncDebugButtons,finishFixture(wins=[120,0,450]){stopAutoRound();app.prepare();stopAutoRound();app.phase="playing";app.enabled=[true,true,true];app.locked=[100,100,100];app.roundWins=[...wins];app.paid=[true,true,true];app.engines.forEach((e,i)=>{e.maxLink=[6,2,12][i];e.maxChain=[5,1,8][i];});app.finishRound();renderRoundResult(app);syncPause();scheduleUI(app);}';
 const hook='window.__resultQA={'+fields+'};$("sound").checked=false;'+(hold?'userPaused=true;app.paused=true;':'');
 assert.equal(source.split(anchor).length,2);source=source.replace(anchor,anchor+hook);
 await page.route('**/index.html*',r=>r.fulfill({contentType:'text/html; charset=utf-8',body:source}));
 await page.goto('http://127.0.0.1:8123/index.html',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__resultQA?.ready&&document.querySelectorAll('#hammer-pay tr').length===5,{},{timeout:25000});
 await page.evaluate(()=>document.fonts.ready);assert.deepEqual(errors,[]);return{page,context,errors};
}
async function simulate(page){return page.evaluate(async()=>{
 const results=[];
 for(const colorCount of [3,4,5])for(const speed of [1,1.4,2])for(let seed=1;seed<=5;seed++){
  let rng=seed*997+colorCount*19,calls=0;const random=()=>{calls++;rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;};let finish,fail;const done=new Promise((a,b)=>{finish=a;fail=b;});
  const e=new window.__resultQA.Engine({random,speed,colorCount,sleep:()=>Promise.resolve(),onEvent:ev=>{if(ev.phase==='complete')finish();if(ev.phase==='error')fail(Error(ev.message));}});
  e.start();for(let i=0;i<8;i++)if(!e.enqueue((seed+i*3)%25+1))throw Error('Draw rejected');await done;
  results.push({calls,rng,board:e.board,processed:e.processed,accepted:e.accepted,hammerPreview:e.hammerPreview,hammerQueue:e.hammerQueue,basketState:e.basketState,wonderToken:e.wonderToken,wonderCollected:e.wonderCollected,roundSteps:e.roundSteps,roundHammers:e.roundHammers,roundCleared:e.roundCleared,maxLink:e.maxLink,maxChain:e.maxChain,totalHundredths:e.totalHundredths,allClears:e.allClears});
 }return results;
});}
async function bounds(page,selectors){return page.evaluate(selectors=>{
 const out={};for(const selector of selectors){const el=document.querySelector(selector);if(!el)throw Error('Missing '+selector);const r=el.getBoundingClientRect();out[selector]={x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom,scrollW:el.scrollWidth,scrollH:el.scrollHeight,clientW:el.clientWidth,clientH:el.clientHeight};}return out;
},selectors);}
function inside(inner,outer,message,pad=2){assert(inner.x>=outer.x-pad&&inner.y>=outer.y-pad&&inner.right<=outer.right+pad&&inner.bottom<=outer.bottom+pad,message+' '+JSON.stringify({inner,outer}));}
async function layoutTests(browser){
 for(const [width,height,mobile] of [[320,568,true],[390,844,true],[430,932,true],[844,390,true],[1280,900,false]]){
  const {page,context,errors}=await open(browser,after,{width,height,mobile});
  const initial=await bounds(page,['#screen','#debug-tools','#bet-countdown']);inside(initial['#debug-tools'],initial['#screen'],'Toolbar outside screen');
  assert(initial['#debug-tools'].y>=initial['#bet-countdown'].bottom-3,'Toolbar covers countdown');
  assert.equal(await page.locator('#pause').isVisible(),false);assert.equal(await page.locator('#debug-start').isVisible(),true);
  await page.evaluate(()=>{const q=window.__resultQA;q.finishFixture([12345,0,987654]);q.hold();});await page.waitForTimeout(800);
  const rs=await bounds(page,['#screen','#round-result-layer','.round-result','#result-heading','.result-total','#result-games','.result-next-info','.result-countdown-track','#result-total-win']);
  inside(rs['.round-result'],rs['#round-result-layer'],'Result frame clipped',6);
  for(const sel of ['#result-heading','.result-total','#result-games','.result-next-info','.result-countdown-track'])inside(rs[sel],rs['.round-result'],'Result child clipped: '+sel,3);
  inside(rs['#result-total-win'],rs['.result-total'],'Total number too wide');assert.equal(await page.locator('.result-game').count(),3);
  const cards=await page.locator('.result-game').evaluateAll(els=>els.map(e=>({w:e.clientWidth,scroll:e.scrollWidth})));assert(cards.every(c=>c.scroll<=c.w+2),'Result card overflow '+JSON.stringify(cards));
  await page.evaluate(()=>{const q=window.__resultQA;q.debugResetRound();q.hold();});
  await page.locator('#jpc-mode').click();await page.waitForFunction(()=>window.__resultQA.jpc.active);
  await page.evaluate(()=>window.__resultQA.driver.setPaused(true));await page.waitForTimeout(200);
  const jp=await bounds(page,['#screen','#jpc-dashboard','#jpc-grid','.jpc-summary','.jpc-last','.jpc-dashboard footer','#console','.a8-stage']);
  inside(jp['#jpc-dashboard'],jp['#screen'],'JPC dashboard outside screen');inside(jp['#jpc-grid'],jp['#jpc-dashboard'],'JPC grid clipped');inside(jp['.jpc-dashboard footer'],jp['#jpc-dashboard'],'JPC footer clipped');
  assert(jp['#jpc-dashboard'].bottom<=jp['#console'].y+2,'JPC overlaps credit console');assert(jp['#jpc-grid'].h>=90,'JPC grid too short');
  if(width<height)assert(jp['#jpc-dashboard'].y>=jp['.a8-stage'].bottom-2,'JPC overlaps roulette');
  assert.equal(await page.locator('.jpc-pocket').count(),25);assert.deepEqual(errors,[]);console.log('RESULT_JPC_LAYOUT_OK',width,height,JSON.stringify({result:rs['.round-result'],jpc:jp['#jpc-dashboard']}));await context.close();
 }
}
async function timingTests(browser){
 const {page,context,errors}=await open(browser,after);
 assert.equal(await page.evaluate(()=>window.__resultQA.betDuration),15000);assert.equal(await page.evaluate(()=>window.__resultQA.resultDuration),8000);
 await page.evaluate(()=>window.__resultQA.resume());await page.waitForTimeout(1200);
 const count=await page.evaluate(()=>({remaining:window.__resultQA.remaining,phase:window.__resultQA.app.phase}));assert.equal(count.phase,'ready');assert(count.remaining>10000&&count.remaining<15000,'BET countdown is not 15 seconds: '+JSON.stringify(count));
 await page.locator('#debug-start').click();await page.waitForFunction(()=>window.__resultQA.app.phase==='playing');assert.equal(await page.locator('#debug-start').isDisabled(),true);assert.equal(await page.locator('#jpc-mode').isDisabled(),true);
 const old=await page.evaluate(()=>{const q=window.__resultQA,credit=q.app.credit;q.debugResetRound();q.finishFixture([120,0,450]);q.resume();return credit;});
 await page.waitForTimeout(1200);const t=await page.evaluate(()=>({phase:window.__resultQA.app.phase,elapsed:window.__resultQA.resultElapsed}));assert.notEqual(t.phase,'ready');assert(t.elapsed<8000);
 await page.evaluate(()=>window.__resultQA.hold());const paused=await page.evaluate(()=>window.__resultQA.resultElapsed);await page.waitForTimeout(500);assert.equal(await page.evaluate(()=>window.__resultQA.resultElapsed),paused,'Result timer did not pause');await page.evaluate(()=>window.__resultQA.resume());
 await page.waitForFunction(()=>window.__resultQA.app.phase==='ready',{},{timeout:13000});
 const done=await page.evaluate(()=>({credit:window.__resultQA.app.credit,remaining:window.__resultQA.remaining,hidden:document.querySelector('#round-result-layer').hidden}));
 assert.equal(done.credit,old+570,'Result payout duplicated or lost');assert(done.remaining>13000&&done.remaining<=15000,'Next BET did not reset to 15 seconds');assert(done.hidden);
 await page.evaluate(()=>{const q=window.__resultQA;q.finishFixture([0,0,0]);q.debugResetRound();q.hold();});await page.waitForTimeout(400);assert.equal(await page.locator('#round-result-layer').isHidden(),true);assert.equal(await page.evaluate(()=>window.__resultQA.app.phase),'ready');assert.deepEqual(errors,[]);console.log('BET15_MANUAL_START_RESULT8_SINGLE_PAYOUT_RESET_OK');await context.close();
}
async function jpcTests(browser){
 const {page,context,errors}=await open(browser,after);const baseline=await page.evaluate(()=>{const q=window.__resultQA;window.__originalScene=q.driver.scene;return JSON.stringify({credit:q.app.credit,bets:q.app.bets,bank:q.app.wonderBank,records:q.records});});
 await page.locator('#jpc-mode').click();await page.waitForFunction(()=>window.__resultQA.jpc.active);
 const enter=await page.evaluate(()=>{const q=window.__resultQA;q.driver.setPaused(true);return{mode:q.driver.draw.mode,state:q.driver.draw.state,normalDraws:q.app.draws.length,normalPhase:q.app.phase,counts:q.driver.jpcCounts,sameScene:q.driver.scene===window.__originalScene};});
 assert.equal(enter.mode,'jpc');assert.equal(enter.state,'running');assert.equal(enter.normalDraws,0);assert.equal(enter.normalPhase,'ready');assert(enter.counts.every(n=>n===0)&&enter.sameScene);
 const report=await page.evaluate(()=>{
  const q=window.__resultQA,d=q.driver,add=n=>{const hit={id:1000+d.physics.hits.length,pocket:n,time:d.physics.time};d.physics.hits.push(hit);d.physics.onHit(hit);};
  add(7);add(7);add(12);q.paintJpcDashboard();const first={counts:d.jpcCounts,filled:document.querySelector('#jpc-filled').textContent,seven:document.querySelector('#jpc-grid').children[6].textContent};
  for(let n=1;n<=24;n++)if(!d.jpcCounts[n-1])add(n);q.paintJpcDashboard();const reach={filled:document.querySelector('#jpc-filled').textContent,cell:document.querySelector('#jpc-grid').children[24].classList.contains('is-reach'),message:document.querySelector('#jpc-message').textContent};
  add(25);q.paintJpcDashboard();const jackpot=document.querySelector('#jpc-dashboard').classList.contains('is-jackpot');
  const P={settings:{retain:false,interval:1},time:0,active:0,serial:0,hits:[],reset(){this.time=0;this.active=0;this.serial=0;this.hits=[]},createLaunchSpec(){return{speed:1}},launch(){this.serial++;return{id:this.serial}},random(){return .5}};
  const controller=new d.draw.constructor(P);controller.select('jpc');controller.start();for(let k=0;k<100;k++){P.time=k*2;controller.update();}
  const limit={balls:P.serial,state:controller.state};
  return {first,reach,jackpot,limit,normalDraws:q.app.draws.length,normalAccepted:q.app.engines.map(e=>e.accepted),protected:JSON.stringify({credit:q.app.credit,bets:q.app.bets,bank:q.app.wonderBank,records:q.records})};
 });
 assert.equal(report.first.counts[6],2);assert.equal(report.first.counts[11],1);assert.equal(report.first.filled,'2');assert(report.first.seven.includes('2 HIT'));assert.equal(report.reach.filled,'24');assert(report.reach.cell&&report.reach.message.includes('25番'));assert(report.jackpot);assert.deepEqual(report.limit,{balls:70,state:'complete'});assert.equal(report.normalDraws,0);assert(report.normalAccepted.every(n=>n===0));assert.equal(report.protected,baseline,'JPC changed credit, BET, sugar or records');
 await page.locator('#debug-reset').click();await page.evaluate(()=>window.__resultQA.driver.setPaused(true));assert((await page.evaluate(()=>window.__resultQA.driver.jpcCounts)).every(n=>n===0));
 await page.locator('#jpc-mode').click();await page.waitForFunction(()=>!window.__resultQA.jpc.active);const exit=await page.evaluate(()=>{const q=window.__resultQA;q.hold();return{mode:q.driver.draw.mode,phase:q.app.phase,hidden:document.querySelector('#jpc-dashboard').hidden,sameScene:q.driver.scene===window.__originalScene,protected:JSON.stringify({credit:q.app.credit,bets:q.app.bets,bank:q.app.wonderBank,records:q.records})};});assert.equal(exit.mode,'eight');assert.equal(exit.phase,'ready');assert(exit.hidden&&exit.sameScene);assert.equal(exit.protected,baseline);assert.deepEqual(errors,[]);console.log('JPC_REAL_DRIVER_COUNTS_REACH_JACKPOT_70BALL_ISOLATION_RESET_RETURN_OK');await context.close();
}
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{const old=await open(browser,before);const expected=await simulate(old.page);await old.context.close();const fresh=await open(browser,after);assert.deepEqual(await simulate(fresh.page),expected);assert.deepEqual(fresh.errors,[]);await fresh.context.close();console.log('GAMEPLAY_RNG_REGRESSION_45_CASES_OK');await layoutTests(browser);await timingTests(browser);await jpcTests(browser);console.log('ALL_RESULT_JPC_TESTS_PASSED');}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});

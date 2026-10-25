const fs=require('fs'),assert=require('assert/strict');
const {chromium}=require('/tmp/cookielink-browser/node_modules/playwright');
const before=fs.readFileSync('/tmp/cookielink-before.html','utf8'),after=fs.readFileSync('index.html','utf8');
const anchor='app=new Arcade({onEvent:recordEvent,onChange:recordChanged});app.drawSource=rouletteDrawSource;select(0);';
async function open(browser,source,options={}){
 const {width=390,height=844,mobile=false,hold=true,blocked=false,failed=false}=options;
 const context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?2:1});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 let fields='get app(){return app},slots,Engine,select,render,syncBetPreview,makeClearPlan,makeShatterFx,paintShatterFrame,stopShatter,get audio(){return audio},get bgm(){return bgmPlayer},get arrival(){return arrivalBuffer},get hammer(){return hammerImpactBuffer},get voices(){return sfxVoices.size},get ready(){return rouletteReady},get driver(){return rouletteDriver},get records(){return recordBook.data},playHammerImpact,playArrivalSound,openRecordMenu,renderRoundResult,halt(){stopAutoRound()},hold(){userPaused=true;syncPause();stopAutoRound()},resume(){userPaused=false;syncPause();scheduleAutoRound()}';
 if(source.includes('function syncRemoteCookieVisuals'))fields+=',syncRemoteCookieVisuals,debugResetRound,activateGameAudio';
 const hook='window.__qa={'+fields+'};'+(hold?'userPaused=true;app.paused=true;':'');
 assert.equal(source.split(anchor).length,2);
 source=source.replace(anchor,anchor+hook).replace('get status(){return status.textContent;}','get cameraForTest(){return {distance,yaw,elevation};},get status(){return status.textContent;}');
 await page.route('**/index.html*',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:source}));
 if(blocked)await page.addInitScript(()=>{
  let touched=false;document.addEventListener('pointerup',e=>{if(e.isTrusted)touched=true;},true);document.addEventListener('keydown',e=>{if(e.isTrusted)touched=true;},true);
  const nativePlay=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){return touched?nativePlay.call(this):Promise.reject(new DOMException('Test requires interaction','NotAllowedError'));};
 });
 if(failed)await page.route('**/bgm-*.mp3',route=>route.fulfill({status:503,body:'test failure'}));
 await page.goto('http://127.0.0.1:8123/index.html',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__qa&&document.querySelectorAll('#hammer-pay tr').length===5,{},{timeout:20000});
 return {page,context,errors};
}
async function simulate(page){return page.evaluate(async()=>{
 const results=[];
 for(const colorCount of [3,4,5])for(const speed of [1,1.4,2])for(let seed=1;seed<=5;seed++){
  let rng=seed*997+colorCount*19,calls=0;const random=()=>{calls++;rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;};
  let finish,fail;const done=new Promise((ok,no)=>{finish=ok;fail=no;});
  const e=new window.__qa.Engine({random,speed,colorCount,sleep:()=>Promise.resolve(),onEvent:ev=>{if(ev.phase==='complete')finish();if(ev.phase==='error')fail(Error(ev.message));}});
  e.start();for(let i=0;i<8;i++)assertDraw(e.enqueue((seed+i*3)%25+1));await done;
  results.push({calls,rng,board:e.board,processed:e.processed,accepted:e.accepted,hammerPreview:e.hammerPreview,hammerQueue:e.hammerQueue,basketState:e.basketState,wonderToken:e.wonderToken,wonderCollected:e.wonderCollected,roundSteps:e.roundSteps,roundHammers:e.roundHammers,roundCleared:e.roundCleared,maxLink:e.maxLink,maxChain:e.maxChain,totalHundredths:e.totalHundredths,allClears:e.allClears});
 }function assertDraw(v){if(!v)throw Error('Draw rejected');}return results;
});}
async function fragmentTest(page){return page.evaluate(()=>{
 const q=window.__qa,a=q.app;q.hold();a.phase='playing';q.syncBetPreview(a);q.select(0);
 const s=q.slots[0],e=s.engine,board=Array.from({length:8},()=>Array(8).fill(null));
 const tile=(id,color,special=false)=>({id,color,special,number:special?null:7,step:null});
 board[3][3]=tile(901,0,true);board[3][4]=tile(902,1);board[1][1]=tile(903,0);board[5][5]=tile(904,0);board[0][0]=tile(905,0,true);
 e.board=board;
 const ev={phase:'vanish',cells:[[3,3],[3,4],[1,1],[5,5],[0,0]],remoteCells:[[1,1],[5,5],[0,0]],sources:[{r:3,c:3,color:0}]};ev.plan=q.makeClearPlan(ev,board,1.4);
 q.render(s,ev,e,true);const fx=s.shatter;if(!fx)throw Error('No shatter');
 const checks=[];function check(v,m){if(!v)throw Error(m);checks.push(m);}
 const canvas=document.createElement('canvas');canvas.width=600;canvas.height=600;const ctx=canvas.getContext('2d');
 function pixels(target,time){ctx.clearRect(0,0,600,600);const solo={...fx,elapsed:time,rays:[],sources:[],bits:fx.bits.filter(b=>Math.abs(b.x-target.x)<.01&&Math.abs(b.y-target.y)<.01),dust:fx.dust.filter(b=>Math.abs(b.x-target.x)<.01&&Math.abs(b.y-target.y)<.01)};ctx.save();ctx.scale(600/298,600/298);q.paintShatterFrame(ctx,solo);ctx.restore();return ctx.getImageData(0,0,600,600).data.some((v,i)=>i%4===3&&v>0);}
 check(fx.bits.filter(b=>b.enhanced).length===12,'Two remote ordinary cookies still have six pieces');
 check(fx.bits.filter(b=>!b.enhanced).length===9,'Normal chains and hammer bodies remain three pieces');
 for(const target of fx.remoteTargets){
  const el=s.tiles.get(target.tileId),sweet=el.querySelector('.sweet'),bit=fx.bits.find(b=>b.enhanced&&b.delay===target.fragmentAt);
  check(target.crackEnd>target.impact&&target.breakAt>target.crackEnd,'Crack growth and visible hold precede disappearance');
  for(const t of [target.impact-1,target.impact+50,target.crackEnd,target.breakAt-.1]){
   fx.elapsed=t;q.syncRemoteCookieVisuals(s,fx);
   check(Number(getComputedStyle(sweet).opacity)===1,'Cookie remains visible before its own disappearance');
   check(!pixels(bit,t),'No pieces or crumbs before disappearance');
  }
  fx.elapsed=target.breakAt;q.syncRemoteCookieVisuals(s,fx);
  check(Number(getComputedStyle(sweet).opacity)===0,'Cookie is hidden on exact fragment frame');
  check(pixels(bit,target.breakAt+1),'Fragments appear at cookie disappearance, not impact');
  check(fx.duration>=target.breakAt+bit.life,'All delayed pieces have enough lifetime');
 }
 q.stopShatter(s);check(!s.board.querySelector('.hammer-fragment-synced'),'Reset removes synchronized visual overrides');
 return checks.length;
});}
async function measure(page){return page.evaluate(()=>{
 const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};
 const q=window.__qa,v=document.querySelector('#viewport'),screen=document.querySelector('#screen'),board=q.slots[0].board;
 return {inner:[innerWidth,innerHeight],visual:[visualViewport.width,visualViewport.height,visualViewport.scale],body:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],viewport:rect(v),screen:rect(screen),arena:rect(document.querySelector('.arena')),deck:rect(document.querySelector('.games-deck')),game:rect(document.querySelector('.game')),console:rect(document.querySelector('#console')),board:rect(board),reset:rect(document.querySelector('#debug-reset')),zoom:!!document.querySelector('#view-zoom'),gate:!!document.querySelector('#audio-gate'),landscape:document.body.classList.contains('mobile-landscape'),touch:getComputedStyle(v).touchAction,transform:getComputedStyle(screen).transform};
});}
async function layoutTests(browser){
 for(const [w,h] of [[320,568],[375,667],[390,844],[430,932],[393,740],[844,390]]){
  const {page,context,errors}=await open(browser,after,{width:w,height:h,mobile:true});await page.waitForFunction(()=>window.__qa.ready,{},{timeout:20000});
  const m=await measure(page);assert(!m.zoom&&!m.gate);assert.equal(m.touch,'none');
  for(const [a,b] of [[m.viewport.x,0],[m.viewport.y,0],[m.viewport.w,w],[m.viewport.h,h],[m.screen.x,0],[m.screen.y,0],[m.screen.w,w],[m.screen.h,h]])assert(Math.abs(a-b)<1.1,'Viewport gap: '+JSON.stringify(m));
  assert(Math.abs(m.board.w-m.board.h)<1,'Board aspect ratio');assert(m.game.bottom<=m.console.y+1,'Game overlaps console: '+JSON.stringify(m));assert(m.console.bottom<=h+1,'Console clipped: '+JSON.stringify(m));
  assert(m.reset.x>=0&&m.reset.right<=w+1&&m.reset.y>=0&&m.reset.bottom<=h,'Reset outside viewport');assert(m.body[0]<=w+1&&m.body[1]<=h+1,'Page scrollbars');
  const view=await page.evaluate(()=>window.__qa.driver.cameraForTest);
  await page.locator('.a8-stage canvas').dispatchEvent('wheel',{deltaY:600,cancelable:true});
  assert.equal((await page.evaluate(()=>window.__qa.driver.cameraForTest)).distance,view.distance,'Wheel changed camera zoom');
  const cancelled=await page.evaluate(()=>{const e=new Event('gesturestart',{cancelable:true,bubbles:true});document.querySelector('#viewport').dispatchEvent(e);const k=new KeyboardEvent('keydown',{key:'+',ctrlKey:true,cancelable:true,bubbles:true});document.dispatchEvent(k);return e.defaultPrevented&&k.defaultPrevented;});assert(cancelled);
  assert.equal((await measure(page)).transform,m.transform,'User zoom changed screen transform');
  if(w===390){
   const client=await context.newCDPSession(page);await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:130,y:160,id:1},{x:210,y:160,id:2}]});await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:100,y:160,id:1},{x:240,y:160,id:2}]});await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   assert.equal((await page.evaluate(()=>window.__qa.driver.cameraForTest)).distance,view.distance,'Pinch changed camera zoom');assert.equal((await measure(page)).visual[2],1,'Pinch zoomed browser');
   await page.setViewportSize({width:844,height:390});await page.waitForFunction(()=>document.body.classList.contains('mobile-landscape'));const rotated=await measure(page);assert(Math.abs(rotated.screen.w-844)<1&&Math.abs(rotated.screen.h-390)<1);await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>!document.body.classList.contains('mobile-landscape'));
  }
  console.log('MOBILE_VIEWPORT_ZOOM_OK',w,h,JSON.stringify(m));assert.deepEqual(errors,[]);await context.close();
 }
}
async function audioResetTest(browser,{blocked=false,failed=false}={}){
 const {page,context,errors}=await open(browser,after,{mobile:true,hold:false,blocked,failed});
 await page.waitForFunction(()=>window.__qa.ready,{},{timeout:20000});await page.waitForFunction(()=>window.__qa.app.phase==='playing',{},{timeout:7000});
 assert.equal(await page.locator('#audio-gate').count(),0);assert.equal(await page.locator('#audio-enable').count(),0);assert.equal(await page.locator('#sound').isChecked(),true);
 if(!failed){
  await page.touchscreen.tap(12,150);
  await page.waitForFunction(()=>window.__qa.audio?.state==='running'&&window.__qa.arrival&&window.__qa.hammer&&!window.__qa.bgm.paused&&window.__qa.bgm.currentTime>.05,{},{timeout:15000});
 }
 const result=await page.evaluate(()=>{
  const q=window.__qa,a=q.app,oldToken=a.token,oldVersions=a.engines.map(e=>e.version),saved=JSON.stringify(q.records),bets=JSON.stringify(a.bets),bank=JSON.stringify(a.wonderBank),credit=a.credit,oldCallback=a.drawSource.callbacks;
  if(q.hammer)q.playHammerImpact(5000);
  q.debugResetRound();q.halt();const now={token:a.token,phase:a.phase,draws:a.draws.length,queue:a.engines.map(e=>e.queue.length),versions:a.engines.map(e=>e.version),voices:q.voices,bets:JSON.stringify(a.bets)===bets,bank:JSON.stringify(a.wonderBank)===bank,credit:a.credit===credit,records:JSON.stringify(q.records)===saved};
  oldCallback?.onNumber(7);now.staleDrawRejected=a.draws.length===0;now.oldToken=oldToken;now.oldVersions=oldVersions;return now;
 });
 assert(result.token>result.oldToken&&result.phase==='ready'&&result.draws===0&&result.voices===0&&result.queue.every(n=>n===0)&&result.bets&&result.bank&&result.credit&&result.records&&result.staleDrawRejected);assert(result.versions.every((n,i)=>n>result.oldVersions[i]));
 // The actual button stays usable over both menu and results, not just by JS call.
 await page.evaluate(()=>window.__qa.openRecordMenu());await page.locator('#debug-reset').click();assert.equal(await page.locator('#record-menu-layer').isHidden(),true);
 await page.evaluate(()=>{const q=window.__qa;q.halt();q.app.phase='complete';q.app.result={elapsed:1800,duration:1800};q.renderRoundResult(q.app);});await page.locator('#debug-reset').click();assert.equal(await page.locator('#round-result-layer').isHidden(),true);
 await page.locator('#debug-reset').click();await page.locator('#debug-reset').click();
 await page.waitForFunction(()=>window.__qa.app.phase==='playing',{},{timeout:8000});
 if(!failed)await page.waitForFunction(()=>window.__qa.audio?.state==='running'&&!window.__qa.bgm.paused,{},{timeout:12000});
 assert.deepEqual(errors,[]);console.log('NONMODAL_AUDIO_AND_RESET_OK',JSON.stringify({blocked,failed,result}));await context.close();
}
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=document-user-activation-required']});
 try{
  const old=await open(browser,before);const expected=await simulate(old.page);assert.deepEqual(old.errors,[]);await old.context.close();
  const current=await open(browser,after);assert.deepEqual(await simulate(current.page),expected,'Gameplay/RNG changed');console.log('REGRESSION_45_CASES_OK');console.log('FRAGMENT_FRAME_SYNC_OK',await fragmentTest(current.page));assert.deepEqual(current.errors,[]);await current.context.close();
  await layoutTests(browser);await audioResetTest(browser);await audioResetTest(browser,{blocked:true});await audioResetTest(browser,{failed:true});
  console.log('ALL_SYNC_RESET_MOBILE_TESTS_PASSED');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});

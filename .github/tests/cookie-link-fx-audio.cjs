const fs=require('fs'),assert=require('assert/strict');
const {chromium}=require('/tmp/cookielink-browser/node_modules/playwright');
const before=fs.readFileSync('/tmp/cookielink-before.html','utf8'),after=fs.readFileSync('index.html','utf8');
const anchor='app=new Arcade({onEvent:recordEvent,onChange:recordChanged});app.drawSource=rouletteDrawSource;select(0);';
async function open(browser,source,viewport={width:430,height:932},extra={}){
 const advanced=source.includes('function makeShatterFx(');
 let fields='get app(){return app},slots,Engine,select,render,sound,makeClearPlan,syncBetPreview,drawBetScene,get audio(){return audio},get bgm(){return bgmPlayer},get arrival(){return arrivalBuffer},get hammer(){return hammerImpactBuffer},get voices(){return sfxVoices.size},get rouletteReady(){return rouletteReady},halt(){if(typeof stopAutoRound===\'function\')stopAutoRound();else clearTimeout(autoRoundTimer)},hold(){userPaused=true;syncPause()},resume(){userPaused=false;syncPause();if(typeof scheduleAutoRound===\'function\')scheduleAutoRound()}';
 if(advanced)fields+=',makeShatterFx,paintShatterFrame,BET_LINK_EXAMPLES,componentsTest:null,get fast(){return BET_DURATION_MS},get gain(){return bgmGain?.gain.value},get prepared(){return audioPreparedToken},get remaining(){return autoRoundRemaining}';
 const observer=advanced?"const clObservedStart=app.start.bind(app);window.__qa.starts=[];app.start=function(){window.__qa.starts.push({enabled:$('sound').checked,state:audio?.state,arrival:!!arrivalBuffer,hammer:!!hammerImpactBuffer,bgm:!bgmPlayer.paused});return clObservedStart();};":'';
 const hook='window.__qa={'+fields+'};'+observer+'userPaused=true;app.paused=true;';
 assert.equal(source.split(anchor).length,2);
 const page=await browser.newPage({viewport});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/index.html*',route=>route.fulfill({status:200,contentType:'text/html; charset=utf-8',body:source.replace(anchor,anchor+hook)}));
 if(extra.failBgm)await page.route('**/bgm-*.mp3',route=>route.fulfill({status:503,body:'test media unavailable'}));
 // Simulate a blocked media-permission policy only until an actual trusted pointer event.
 // After the tap this delegates to the real browser player and real repository audio.
 if(extra.forceTap)await page.addInitScript(()=>{
  let touched=false;document.addEventListener('pointerdown',ev=>{if(ev.isTrusted)touched=true;},true);
  const nativePlay=HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play=function(){return touched?nativePlay.call(this):Promise.reject(new DOMException('Test permission requires a trusted tap','NotAllowedError'));};
 });
 await page.goto('http://127.0.0.1:8123/index.html',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__qa&&document.querySelectorAll('#hammer-pay tr').length===5,{},{timeout:20000});
 await page.evaluate(()=>window.__qa.halt());return {page,errors};
}
async function simulate(page){return page.evaluate(async()=>{
 const results=[];
 for(const colorCount of [3,4,5])for(const speed of [1,1.4,2])for(let seed=1;seed<=5;seed++){
  let rng=seed*997+colorCount*19,calls=0;const random=()=>{calls++;rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;};
  let finish,fail;const done=new Promise((resolve,reject)=>{finish=resolve;fail=reject;});
  const e=new window.__qa.Engine({random,speed,colorCount,sleep:()=>Promise.resolve(),onEvent:ev=>{if(ev.phase==='complete')finish();if(ev.phase==='error')fail(Error(ev.message));}});
  e.start();for(let i=0;i<8;i++)if(!e.enqueue((seed+i*3)%25+1))throw Error('Draw rejected');await done;
  results.push({colorCount,speed,seed,calls,rng,board:e.board,processed:e.processed,accepted:e.accepted,hammerPreview:e.hammerPreview,hammerQueue:e.hammerQueue,basketState:e.basketState,wonderToken:e.wonderToken,wonderCollected:e.wonderCollected,roundSteps:e.roundSteps,roundHammers:e.roundHammers,roundCleared:e.roundCleared,maxLink:e.maxLink,maxChain:e.maxChain,totalHundredths:e.totalHundredths,allClears:e.allClears});
 }return results;
});}
async function visualTests(page){return page.evaluate(()=>{
 const q=window.__qa,a=q.app,checks=[];const check=(v,m)=>{if(!v)throw Error(m);checks.push(m);};q.hold();q.halt();
 const board=Array.from({length:8},()=>Array(8).fill(null));
 const tile=(id,color,special=false)=>({id,color,special,number:special?null:7,step:null});
 board[3][3]=tile(1,0,true);board[3][4]=tile(2,1);board[1][1]=tile(3,0);board[5][5]=tile(4,0);board[0][0]=tile(5,0,true);
 const ev={phase:'vanish',cells:[[3,3],[3,4],[1,1],[5,5],[0,0]],remoteCells:[[1,1],[5,5],[0,0]],sources:[{r:3,c:3,color:0}]};
 const snapshot=JSON.stringify(board);ev.plan=q.makeClearPlan(ev,board,1.4);const fx=q.makeShatterFx(ev,board,1.4,1);
 check(JSON.stringify(board)===snapshot,'FX never mutates the board');
 check(fx.bits.filter(b=>b.enhanced).length===12,'Two remote normal cookies become six pieces each');
 check(fx.bits.filter(b=>!b.enhanced).length===9,'Source hammer, other hammer and primary normal cookie keep three pieces');
 check(fx.bits.every(b=>!b.special||!b.enhanced),'Hammer bodies are not enhanced');
 check(fx.dust.length===14,'Only remote normal cookies emit extra crumbs');
 check(fx.bits.filter(b=>b.enhanced).every(b=>b.life>=420),'Remote pieces remain visible for at least 420ms');
 check(fx.bits.every(b=>fx.duration>=b.delay+b.life),'Effect life covers every delayed target');
 const canvas=document.createElement('canvas');canvas.width=600;canvas.height=600;const ctx=canvas.getContext('2d');
 fx.elapsed=ev.plan.targets[5*8+5].breakAt+140;ctx.save();ctx.scale(600/298,600/298);q.paintShatterFrame(ctx,fx);ctx.restore();
 check(ctx.getImageData(0,0,600,600).data.some((v,i)=>i%4===3&&v>0),'Delayed remote pieces produce visible canvas pixels');
 function groups(b){const seen=new Set(),out=[];for(let k=0;k<12;k++){if(b[k]==null||seen.has(k))continue;const todo=[k],g=[];seen.add(k);while(todo.length){const i=todo.pop();g.push(i);const r=Math.floor(i/4),c=i%4;for(const [rr,cc]of [[r-1,c],[r+1,c],[r,c-1],[r,c+1]]){const j=rr*4+cc;if(rr>=0&&rr<3&&cc>=0&&cc<4&&!seen.has(j)&&b[j]===b[i]){seen.add(j);todo.push(j);}}}out.push(g);}return out;}
 for(const ex of q.BET_LINK_EXAMPLES){check(groups(ex.before).every(g=>g.length===1),'Tutorial starts without existing links');check(Math.max(...groups(ex.after).map(g=>g.length))===ex.link,'HIT and gravity actually produce the shown '+ex.link+' LINK');check(ex.group.length===ex.link,'Shown link counts actual cookies');}
 const engineSnapshot=JSON.stringify(a.engines.map(e=>({board:e.board,seen:[...e.seen],queue:e.queue,total:e.totalHundredths,preview:e.hammerPreview,basket:e.basketState}))),bank=JSON.stringify(a.wonderBank);
 for(let t=0;t<22000;t+=71){for(const s of q.slots)q.drawBetScene(s.mini,160,{elapsed:t});q.drawBetScene(ctx,600,{elapsed:t});}
 check(engineSnapshot===JSON.stringify(a.engines.map(e=>({board:e.board,seen:[...e.seen],queue:e.queue,total:e.totalHundredths,preview:e.hammerPreview,basket:e.basketState})))&&bank===JSON.stringify(a.wonderBank),'All tutorial frames leave live engines and awards unchanged');
 check(q.fast===1000,'Debug countdown is 1 second, not 30 seconds');
 check(document.querySelector('#pause').getClientRects().length===0,'Pause control is absent from the layout');
 const stage=document.querySelector('.a8-stage').getBoundingClientRect(),caption=document.querySelector('.roulette-caption').getBoundingClientRect(),strip=document.querySelector('.roulette-info-strip').getBoundingClientRect(),arena=document.querySelector('.arena').getBoundingClientRect(),clock=document.querySelector('#bet-countdown').getBoundingClientRect();
 check(stage.bottom<=caption.top+1&&caption.bottom<=strip.top+1,'Roulette, caption and black information strip do not overlap');
 check(clock.left>arena.left+arena.width/2&&clock.right<=arena.right+1&&clock.top>=arena.top,'Countdown is inside the upper-right corner');
 check(getComputedStyle(document.querySelector('.a8-stage')).backgroundImage.includes('candy-roulette-world.svg'),'Illustrated repository asset replaces radial-gradient background');
 check(document.querySelector('.roulette-info-strip').textContent==='','Reserved information strip remains empty');
 return checks;
});}
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=document-user-activation-required']});
 try{
  const old=await open(browser,before);const expected=await simulate(old.page);assert.deepEqual(old.errors,[]);await old.page.close();
  const current=await open(browser,after);const actual=await simulate(current.page);assert.deepEqual(actual,expected,'Seeded gameplay outcomes or RNG use changed');assert.deepEqual(current.errors,[]);await current.page.close();console.log('REGRESSION_45_EIGHT_BALL_CASES_OK');
  for(const viewport of [{width:430,height:932},{width:1280,height:900}]){
   const {page,errors}=await open(browser,after,viewport,{forceTap:viewport.width===430});await page.waitForFunction(()=>window.__qa.rouletteReady,{},{timeout:20000});
   const checks=await visualTests(page);console.log('FX_DEMO_LAYOUT_OK',JSON.stringify(viewport),checks.length,JSON.stringify(checks));
   const image=await page.evaluate(()=>new Promise(resolve=>{const img=new Image();img.onload=()=>resolve({width:img.naturalWidth,height:img.naturalHeight});img.onerror=()=>resolve(null);img.src='assets/candy-roulette-world.svg';}));assert.deepEqual(image,{width:1440,height:840});
   await page.evaluate(()=>window.__qa.resume());
   await page.waitForFunction(()=>window.__qa.app.phase==='playing'||(!document.querySelector('#audio-gate').hidden&&!document.querySelector('#audio-enable').disabled),{},{timeout:15000});
   const needsTap=await page.evaluate(()=>window.__qa.app.phase==='ready');
   if(viewport.width===430)assert(needsTap,'The simulated blocked-policy path must request a tap');
   if(needsTap)await page.locator('#audio-enable').click();
   await page.waitForFunction(()=>window.__qa.app.phase==='playing',{},{timeout:20000});
   await page.waitForFunction(()=>!window.__qa.bgm.paused&&window.__qa.bgm.currentTime>.15,{},{timeout:6000});
   const audio=await page.evaluate(()=>{const q=window.__qa;const energy=b=>{let peak=0;for(let ch=0;ch<b.numberOfChannels;ch++){const d=b.getChannelData(ch);for(let i=0;i<Math.min(d.length,b.sampleRate*.05);i++)peak=Math.max(peak,Math.abs(d[i]));}return peak;};q.sound('crack');return {state:q.audio.state,arrival:!!q.arrival,hammer:!!q.hammer,arrivalPeak:energy(q.arrival),hammerPeak:energy(q.hammer),voices:q.voices,bgm:!q.bgm.paused,time:q.bgm.currentTime,gain:q.gain,src:q.bgm.src,token:q.app.token,gate:document.querySelector('#audio-gate').hidden,starts:q.starts};});
   assert.equal(audio.state,'running');assert(audio.arrival&&audio.hammer&&audio.voices>0&&audio.bgm&&audio.gate);assert(audio.arrivalPeak>.0008&&audio.hammerPeak>.0008);assert(Math.abs(audio.gain-.075)<.000001);assert(audio.starts.length>0&&audio.starts.every(s=>!s.enabled||(s.state==='running'&&s.arrival&&s.hammer&&s.bgm)),'Every sound-enabled round must have samples and active BGM before Engine.start');console.log('FIRST_ROUND_AUDIO_OK',JSON.stringify(viewport),JSON.stringify(audio));
   await page.evaluate(()=>window.__qa.app.prepare());
   await page.waitForFunction(old=>window.__qa.app.phase==='playing'&&window.__qa.app.token>old,audio.token,{timeout:20000});
   await page.waitForFunction(()=>!window.__qa.bgm.paused&&window.__qa.bgm.currentTime>.1,{},{timeout:6000});
   const next=await page.evaluate(()=>({src:window.__qa.bgm.src,state:window.__qa.audio.state,gate:document.querySelector('#audio-gate').hidden}));assert.notEqual(next.src,audio.src);assert.equal(next.state,'running');assert(next.gate);console.log('NEXT_ROUND_AUDIO_NO_NEW_TAP_OK',JSON.stringify(viewport));
   assert.deepEqual(errors,[]);await page.close();
  }
  const failed=await open(browser,after,{width:430,height:932},{failBgm:true});await failed.page.waitForFunction(()=>window.__qa.rouletteReady,{},{timeout:20000});await failed.page.evaluate(()=>window.__qa.resume());
  await failed.page.waitForFunction(()=>!document.querySelector('#audio-gate').hidden,{},{timeout:5000});await failed.page.locator('#audio-enable').click();
  await failed.page.waitForFunction(()=>!document.querySelector('#audio-enable').disabled,{},{timeout:15000});assert.equal(await failed.page.evaluate(()=>window.__qa.app.phase),'ready');
  await failed.page.locator('#audio-without').click();await failed.page.waitForFunction(()=>window.__qa.app.phase==='playing',{},{timeout:8000});assert.equal(await failed.page.locator('#sound').isChecked(),false);assert.deepEqual(failed.errors,[]);await failed.page.close();console.log('BGM_NETWORK_FAILURE_RETRY_OR_EXPLICIT_SILENT_MODE_OK');
  console.log('ALL_TESTS_PASSED');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});

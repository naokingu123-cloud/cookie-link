const fs=require('fs'),assert=require('assert/strict');
const {chromium}=require('/tmp/cookielink-browser/node_modules/playwright');
const source=fs.readFileSync('index.html','utf8');
const anchor='app=new Arcade({onEvent:recordEvent,onChange:recordChanged});app.drawSource=rouletteDrawSource;select(0);';
async function open(browser,width=390,height=844,mobile=true){
 const context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const hook='window.__sugarQA={app,slots,Engine,Arcade,select,tabs,hud,sugarVisualTier,isDirectJpcSugar,projectedSugarValue,applySugarTier,getSugarSprite,drawSugar,normalBoardsSettled,nextFromResult,toggleJpcMode,debugResetRound,renderRoundResult,get ready(){return rouletteReady},get driver(){return rouletteDriver},get jpc(){return jpcSession},get records(){return recordBook.data},hold(){userPaused=true;syncPause();stopAutoRound()},resume(){userPaused=false;syncPause();scheduleAutoRound()}};$("sound").checked=false;userPaused=true;app.paused=true;';
 assert.equal(source.split(anchor).length,2);const html=source.replace(anchor,anchor+hook);
 await page.route('**/index.html*',r=>r.fulfill({contentType:'text/html;charset=utf-8',body:html}));await page.goto('http://127.0.0.1:8123/index.html',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__sugarQA?.ready&&document.querySelectorAll('#hammer-pay tr').length===5,{},{timeout:25000});await page.evaluate(()=>document.fonts.ready);assert.deepEqual(errors,[]);return{context,page,errors};
}
async function artTest(page){
 const result=await page.evaluate(()=>{
  const q=window.__sugarQA,values=[1,201,401,601,1201,2401,4801,100000],tiers=values.map(v=>q.sugarVisualTier({value:v,tier:6}));
  const nodes=Array.from({length:5},(_,i)=>document.querySelector('#wonder-crystal'+i));
  for(const i of [0,1,2,3,4,6])q.getSugarSprite(i);
  return{tiers,legacyRainbow:q.isDirectJpcSugar({value:50000,tier:6}),direct:q.sugarVisualTier({value:1,kind:'direct-jpc'}),detail:nodes.map(n=>n.querySelectorAll('.sugar-crafted-detail *').length),names:nodes.map(n=>n.querySelector('.sugar-crafted-detail').dataset.design),legacy:document.querySelector('#wonder-crystal5 use').getAttribute('href')};
 });
 assert.deepEqual(result.tiers,[0,1,2,3,4,4,4,4]);assert.equal(result.direct,6);assert.equal(result.legacyRainbow,false);assert.equal(result.legacy,'#wonder-crystal4');assert(result.detail.every(n=>n>=9));assert.equal(new Set(result.names).size,5);
 await page.waitForFunction(()=>[0,1,2,3,4,6].every(i=>window.__sugarQA.getSugarSprite(i)),{},{timeout:10000});
 const pixels=await page.evaluate(()=>[0,1,2,3,4,6].map(tier=>{const c=document.createElement('canvas');c.width=c.height=96;const ctx=c.getContext('2d');window.__sugarQA.drawSugar(ctx,48,48,96,tier);const d=ctx.getImageData(0,0,96,96).data;let h=2166136261,n=0;for(let i=0;i<d.length;i++){h=Math.imul(h^d[i],16777619)>>>0;if(i%4===3&&d[i]>0)n++;}return{h,n};}));
 assert.equal(new Set(pixels.map(p=>p.h)).size,6);assert(pixels.every(p=>p.n>1000));console.log('FIVE_DETAILED_SVG_AND_CANVAS_DESIGNS_RAINBOW_RESERVED_OK',JSON.stringify({result,pixels}));
}
async function layoutTest(browser,width,height,mobile=true){
 const {context,page,errors}=await open(browser,width,height,mobile);
 for(const phase of ['ready','playing']){
  const data=await page.evaluate(phase=>{
   const q=window.__sugarQA,a=q.app;a.bets=[0,401,2500];a.locked=[0,401,2500];a.enabled=[false,true,true];a.phase=phase;
   q.slots.forEach(s=>{s.tabKey='';});q.tabs(a);q.hud(a);
   // Keep layout checks independent of the finite power-up tween.
   for(const s of q.slots)s.tabSugar.classList.remove('sugar-powerup');
   const rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};
   return q.slots.map(s=>({badge:rect(s.tabSugar),gem:rect(s.tabSugar.querySelector('.sugar-gem')),mini:rect(s.tab.querySelector('.mini-wrap')),tab:rect(s.tab),holder:rect(s.holder),controls:rect(s.controls),isZero:s.tabSugar.classList.contains('is-zero-bet'),hidden:s.tabSugar.hidden,display:getComputedStyle(s.tabSugar).display,filter:getComputedStyle(s.tabSugar.querySelector('.sugar-gem')).filter,tier:s.tabSugar.querySelector('.sugar-gem').dataset.tier,insideMini:s.tab.querySelector('.mini-wrap').contains(s.tabSugar),label:s.tabSugar.getAttribute('aria-label')}));
  },phase);
  for(const [i,d] of data.entries()){
   assert(!d.hidden&&d.display!=='none'&&!d.insideMini);assert(d.badge.x>=d.mini.right+1,'Badge overlaps mini '+JSON.stringify(d));assert(d.badge.bottom<=d.mini.bottom+7&&d.badge.bottom>=d.mini.bottom-8,'Badge not at lower right '+JSON.stringify(d));assert(d.badge.right<=d.holder.right+1,'Badge outside frame');assert(d.gem.w>d.mini.w*.35,'Sugar not enlarged');if(phase==='ready')assert(d.badge.bottom<d.controls.y,'Badge overlaps BET controls');
   assert.equal(d.isZero,i===0);if(i===0){assert(d.filter.includes('brightness(0)'));assert.equal(d.tier,'0');assert(d.label.includes('出現しません'));}else assert(!d.filter.includes('grayscale'));
  }
  console.log('EXTERNAL_SUGAR_LAYOUT_OK',width,height,phase,JSON.stringify(data.map(d=>({badge:d.badge,mini:d.mini,tier:d.tier}))));
 }
 const checks=await page.evaluate(()=>{
  const q=window.__sugarQA,a=q.app;a.phase='ready';q.slots.forEach(s=>s.tabKey='');q.tabs(a);a.bets[1]=450;q.tabs(a);const power=q.slots[1].tabSugar.classList.contains('sugar-powerup');
  q.select(0);q.hud(a);const s=q.slots[0],test=document.createElement('span');test.className='wonder-mark';s.board.append(test);const hidden=getComputedStyle(test).display==='none';test.remove();
  q.select(1);q.hud(a);const basket=q.slots[1].baskets[0].querySelector('svg'),cs=getComputedStyle(basket);return{power,hidden,width:parseFloat(cs.width),height:parseFloat(cs.height),bottom:parseFloat(cs.bottom),stagger:q.slots[1].baskets.map(b=>b.style.getPropertyValue('--pour-delay'))};
 });assert(checks.power&&checks.hidden);assert.equal(checks.width,36);assert.equal(checks.height,32.5);assert.equal(checks.bottom,-2.25);assert.deepEqual(errors,[]);await context.close();
}
async function noBetTest(page){
 const data=await page.evaluate(async()=>{
  const q=window.__sugarQA;let finish,fail;const done=new Promise((ok,no)=>{finish=ok;fail=no;});let rng=12345;const random=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;};
  const a=new q.Arcade({random,sleep:()=>Promise.resolve(),onEvent:(i,ev)=>{if(ev.phase==='complete')finish();if(ev.phase==='error')fail(Error(ev.message));}});
  let callbacks;a.drawSource={ready:true,start(c){callbacks=c},reset(){},pause(){}};a.bets=[0,100,0];
  const before=[0,2].map(i=>JSON.stringify({board:a.engines[i].board,basket:a.engines[i].basketState,wonder:a.engines[i].wonderToken}));a.start();for(let n=1;n<=8;n++)callbacks.onNumber(n);await done;
  const inactive=[0,2].map((i,j)=>({same:before[j]===JSON.stringify({board:a.engines[i].board,basket:a.engines[i].basketState,wonder:a.engines[i].wonderToken}),running:a.engines[i].running,accepted:a.engines[i].accepted,bet:a.engines[i].roundBet}));
  const e=new q.Engine({random,sleep:()=>Promise.resolve()});e.roundBet=0;const b=e.basketState[e.wonderColumn];b.remaining=1;b.weight=0;const cell=e.board[7][e.wonderColumn];cell.number=null;cell.special=false;cell.step=null;e.supplyWonder([cell],false);e.start();
  return{inactive,active:a.engines[1].processed,guard:{remaining:b.remaining,token:e.wonderToken,spawned:e.spawnedSteps.length,running:e.running},bank:a.wonderBank.map(t=>t.game)};
 });
 assert(data.inactive.every(e=>e.same&&!e.running&&e.accepted===0&&e.bet===0));assert.equal(data.active,8);assert.deepEqual(data.guard,{remaining:1,token:null,spawned:0,running:false});assert(data.bank.every(i=>i===1));console.log('ZERO_BET_NO_ENGINE_NO_SUGAR_NO_STATE_LOSS_OK',JSON.stringify(data));
}
async function groupTest(page){
 const result=await page.evaluate(()=>{
  const q=window.__sugarQA,P={settings:{retain:false,interval:1},time:0,active:0,serial:0,hits:[],reset(){this.time=0;this.active=0;this.serial=0;this.hits=[]},launch(){this.serial++;this.active++;return{id:this.serial}},createLaunchSpec(){return{}},random(){return .5}};
  const d=new q.driver.draw.constructor(P);let allow=true;d.canAdvance=()=>allow;d.start();const groups=[],cumulative=[];let prior=0;
  for(let g=0;g<5;g++){
   let limit=20;while(!d.waiting&&--limit>0){P.time+=2;d.update();}
   if(!limit)throw Error('Group failed to fill');groups.push(P.serial-prior);cumulative.push(P.serial);prior=P.serial;
   d.update();if(d.group!==g)throw Error('Advanced with physical balls active');P.active=0;allow=false;
   for(let k=0;k<5;k++){P.time+=1;d.update();}if(d.group!==g||P.serial!==prior)throw Error('Advanced while board busy');allow=true;d.update();
  }
  const a=q.app;const saved=a.engines.map(e=>({busy:e.busy,queue:e.queue,opening:e.opening,processed:e.processed,accepted:e.accepted})),enabled=[...a.enabled];a.enabled=[true,false,true];
  a.engines.forEach(e=>{e.busy=false;e.queue=[];e.opening=false;e.processed=3;e.accepted=3;});
  const settled=q.driver.draw.canAdvance();a.engines[0].busy=true;const busy=q.driver.draw.canAdvance();a.engines[0].busy=false;a.engines[2].queue=[4];const queued=q.driver.draw.canAdvance();a.engines[2].queue=[];a.engines[1].busy=true;a.engines[1].queue=[4];const zeroSkipped=q.driver.draw.canAdvance();a.engines[2].processed=2;const unprocessed=q.driver.draw.canAdvance();
  a.engines.forEach((e,i)=>Object.assign(e,saved[i]));a.enabled=enabled;
  return{groups,cumulative,final:d.state,balls:P.serial,settled,busy,queued,zeroSkipped,unprocessed};
 });assert.deepEqual(result.groups,[3,2,1,1,1]);assert.deepEqual(result.cumulative,[3,5,6,7,8]);assert.equal(result.final,'complete');assert.equal(result.balls,8);assert(result.settled&&!result.busy&&!result.queued&&result.zeroSkipped&&!result.unprocessed);console.log('REAL_HOOK_GROUPED_3_2_1_1_1_DRAINS_AND_WAITS_OK',JSON.stringify(result));
}
async function directTest(page){
 const result=await page.evaluate(()=>{
  const q=window.__sugarQA,a=q.app,credit=a.credit;
  a.wonderBank=[{id:1,value:99000,tier:6,game:0}];a.phase='complete';q.nextFromResult();q.hold();const legacyNotJpc=!q.jpc.active;
  const ticket={id:2,value:100,kind:'direct-jpc',game:0};a.wonderBank.push(ticket);a.phase='complete';q.nextFromResult();q.driver.setPaused(true);
  const entered=q.jpc.active&&q.driver.draw.mode==='jpc',redeemed=ticket.jpcRedeemed===true,title=document.querySelector('#jpc-heading').textContent;
  q.toggleJpcMode();q.hold();a.phase='complete';q.nextFromResult();q.hold();return{legacyNotJpc,entered,redeemed,title,noRepeat:!q.jpc.active,creditSame:a.credit===credit,valueSame:a.wonderBank[0].value===99000};
 });assert(result.legacyNotJpc&&result.entered&&result.redeemed&&result.noRepeat&&result.creditSame&&result.valueSame);assert.equal(result.title,'DIRECT JPC');console.log('EXPLICIT_RAINBOW_DIRECT_JPC_ONCE_AFTER_RESULT_OK',JSON.stringify(result));
}
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{const first=await open(browser);await artTest(first.page);await noBetTest(first.page);await groupTest(first.page);await directTest(first.page);assert.deepEqual(first.errors,[]);await first.context.close();for(const x of [[320,568,true],[390,844,true],[430,932,true],[844,390,true],[1280,900,false]])await layoutTest(browser,...x);console.log('ALL_SUGAR_BASKET_GROUP_TESTS_PASSED');}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});

/* Full-cabinet layout and real native/server BET locks. All traffic is isolated
   to the fixture; local lineup pages never connect to an authenticated API. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createUiFixture,sleep,until} from './ui-v250-fixture.mjs';

const fixture=await createUiFixture({startRound:false,output:'qa-bet-layout-v269'});
const {page,context,call,host,base,version,output,errors}=fixture;
const report={version,layoutRevision:269,viewports:[],locks:[],localApi:[],pageErrors:errors};
const viewports=[[320,740],[390,844],[430,932],[844,390],[1366,900]];
async function nextPaint(target){await target.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
async function waitSharedBet(){
 // Native HUD temporarily enables cycle buttons before the authoritative
 // MutationObserver runs. Wait for the actual registration guard and the
 // visible controls together, including the connection-stability interval.
 await page.waitForFunction(()=>{
  const machine=window.SweetsSharedMachine,controller=window.SweetsSharedControllerV224,round=machine?.client?.round;
  const unit=document.querySelector('.v250-shared-bet-switch'),submit=document.getElementById('shared-bet-v228');
  return round?.phase==='BETTING'&&round.canBet===true&&controller?.stable?.()&&controller.canEditBets(window.__qa250.app)&&
   window.__qa250.app.phase==='ready'&&!machine.active&&unit&&!unit.disabled&&!unit.parentElement.hidden&&unit.getBoundingClientRect().width>0&&submit&&!submit.disabled;
 },null,{timeout:12000});
 await nextPaint(page);
}
async function inspect(target,label){
 const result=await target.evaluate(()=>{
  const rect=node=>{const r=node.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
  const shown=node=>{if(!node)return false;for(let p=node;p?.nodeType===1;p=p.parentElement){const css=getComputedStyle(p);if(p.hidden||css.display==='none'||css.visibility==='hidden'||Number(css.opacity)===0)return false;}return node.getBoundingClientRect().width>0;};
  const button=document.querySelector('.v250-shared-bet-switch'),bounds=rect(button),roulette=rect(document.getElementById('cookie-roulette'));
  const blockers=['#bet-countdown','#debug-tools','#manual-number-toggle','#shared-bet-v228','.shared-auto-rebet-label','#sugar-collection','#sugar-slots','.stations-strip-v235','.avatar-box','.sc254-dock'].flatMap(selector=>[...document.querySelectorAll(selector)].filter(shown).map(node=>({selector,bounds:rect(node)})));
  const sharedBlockers=['#debug-start','#jpc-mode','#roulette-retry','#sugar-collection','#sugar-slots','#sugar-slots .sugar-slot','.sugar-caption','.avatar-box','.stations-strip-v235','.v250-shared-bet-switch'].flatMap(selector=>[...document.querySelectorAll(selector)].filter(shown).map(node=>({selector,bounds:rect(node)})));
  const sharedTargets=['#shared-bet-v228','.shared-auto-rebet-label'].flatMap(selector=>[...document.querySelectorAll(selector)].filter(shown).map(node=>{const bounds=rect(node),at=document.elementFromPoint(bounds.left+bounds.width/2,bounds.top+bounds.height/2);return {selector,bounds,disabled:node.disabled??null,unobscured:at===node||node.contains(at),blockers:sharedBlockers};}));
  const at=document.elementFromPoint(bounds.left+bounds.width/2,bounds.top+bounds.height/2),q=window.__qa269||window.__qa250;
  const footer=document.getElementById('console'),meters=footer.querySelector('.meters');
  return {edition:document.documentElement.dataset.edition,lineup:document.documentElement.dataset.lineup,viewport:{width:innerWidth,height:innerHeight},phase:q.app.phase,selected:q.slots[q.active]?.engine.kind,
   button:{bounds,visible:shown(button),disabled:button.disabled,clickable:at===button||button.contains(at),inRoulette:document.getElementById('cookie-roulette').contains(button),inFooter:footer.contains(button),visibleCycles:[...document.querySelectorAll('.bet-cycle')].filter(shown).length},roulette,blockers,sharedTargets,serverPhase:window.SweetsSharedMachine?.client?.round?.phase||null,
   authority:window.SweetsSharedControllerV224?{canBet:window.SweetsSharedMachine?.client?.round?.canBet??null,editable:window.SweetsSharedControllerV224.canEditBets(q.app),stable:window.SweetsSharedControllerV224.stable()}:null,
   footer:{bounds:rect(footer),logicalHeight:footer.clientHeight,meters:rect(meters),history:rect(document.getElementById('balls')),menu:rect(document.getElementById('open-record-menu')),amounts:['total-bet','win','credit'].map(id=>{const el=document.getElementById(id),face=el.querySelector('.gold-number');return {id,bounds:rect(el),face:rect(face),font:parseFloat(getComputedStyle(face).fontSize),text:face.textContent};})},
   panel:rect(q.slots[q.active].panel)};
 });
 report.viewports.push({label,...result});
 await target.screenshot({path:path.join(output,label+'.png')});
 assert.equal(result.phase,'ready',label+' is native BET time');
 assert.equal(result.button.visible,true,label+' BET control is visible');assert.equal(result.button.disabled,false,label+' BET control is enabled');
 assert.equal(result.button.inRoulette,true);assert.equal(result.button.inFooter,false);assert.equal(result.button.visibleCycles,1);
 assert.equal(result.button.clickable,true,label+' independent BET hit target');
 const b=result.button.bounds,r=result.roulette;
 assert.ok(b.left>=r.left-1&&b.right<=r.right+1&&b.top>=r.top-1&&b.bottom<=r.bottom+1,label+' switch stays inside roulette');
 assert.ok(b.top>=r.top+r.height*.45&&b.right>=r.left+r.width*.5,label+' switch is at the lower right');
 for(const blocker of result.blockers){const x=blocker.bounds;assert.ok(Math.min(b.right,x.right)<=Math.max(b.left,x.left)+1||Math.min(b.bottom,x.bottom)<=Math.max(b.top,x.top)+1,label+' BET does not overlap '+blocker.selector);}
 for(const control of result.sharedTargets){
  assert.equal(control.unobscured,true,label+' '+control.selector+' has its own hit target');
  for(const blocker of control.blockers){const a=control.bounds,x=blocker.bounds;assert.ok(Math.min(a.right,x.right)<=Math.max(a.left,x.left)+1||Math.min(a.bottom,x.bottom)<=Math.max(a.top,x.top)+1,label+' '+control.selector+' does not overlap '+blocker.selector);}
 }
 assert.equal(result.footer.logicalHeight,66,label+' footer is shorter than the former78px');
 assert.ok(result.footer.meters.width>result.footer.bounds.width*.75,label+' recovered BET bay belongs to the ledger');
 for(const value of result.footer.amounts){assert.ok(value.font>=20,label+' '+value.id+' retains a large numeral height');assert.ok(value.face.left>=value.bounds.left-1&&value.face.right<=value.bounds.right+1,label+' '+value.id+' value fits horizontally');}
 assert.ok(result.footer.history.bottom<=result.footer.meters.top+1,label+' history does not overlap amounts');
 return result;
}
async function hiddenLock(target,label){
 await target.waitForFunction(()=>{const button=document.querySelector('.v250-shared-bet-switch');return button?.disabled&&button.parentElement.hidden;},null,{timeout:10000});
 const locked=await target.evaluate(()=>{
  const q=window.__qa269||window.__qa250,button=document.querySelector('.v250-shared-bet-switch');
  const before={unit:[...q.unit],bets:[...q.app.bets],credit:q.app.credit};button.onclick();
  return {before,after:{unit:[...q.unit],bets:[...q.app.bets],credit:q.app.credit},tabIndex:button.tabIndex,phase:q.app.phase,serverPhase:window.SweetsSharedMachine?.client?.round?.phase,visible:!button.parentElement.hidden};
 });
 assert.deepEqual(locked.after,locked.before,label+' direct invocation respects the lock');assert.equal(locked.tabIndex,-1);assert.equal(locked.visible,false);report.locks.push({label,...locked});
}
try{
 await page.waitForFunction(()=>window.SweetsArcadeTabsV249?.layoutRevision===269,null,{timeout:15000});
 await page.evaluate(()=>{window.SweetsSharedControllerV224.setAutoRebet(false);const q=window.__qa250;q.select(q.slots.findIndex(slot=>slot.engine?.kind==='dango'));q.hud(q.app);});
 const touch=await context.newCDPSession(page);
 for(const [width,height]of viewports){await touch.send('Emulation.setTouchEmulationEnabled',{enabled:width<900,maxTouchPoints:1});await page.setViewportSize({width,height});await sleep(250);await nextPaint(page);await inspect(page,'shared-dango-'+width+'x'+height);}

 await call('/api/admin/machines/public-01/host/register',{session:host,body:{},adminOnly:true});
 const betRound=await until(async()=>{const state=await call('/api/machines/public-01/state',{session:host});return state.round?.phase==='BETTING'?state.round:null;},'real server BET time');
 await waitSharedBet();
 const activeBet=await inspect(page,'shared-server-BETTING-1366x900');
 assert.equal(activeBet.serverPhase,'BETTING');assert.equal(activeBet.sharedTargets.find(control=>control.selector==='#shared-bet-v228').disabled,false,'real server registration is enabled and unobscured');
 const before=await page.evaluate(()=>({bets:[...window.__qa250.app.bets],credit:window.__qa250.app.credit,unit:[...window.__qa250.unit]}));
 await page.locator('.v250-shared-bet-switch').focus();await page.keyboard.press('Space');
 const after=await page.evaluate(()=>({bets:[...window.__qa250.app.bets],credit:window.__qa250.app.credit,unit:[...window.__qa250.unit]}));
 assert.deepEqual(after.bets,before.bets);assert.equal(after.credit,before.credit);assert.notDeepEqual(after.unit,before.unit);assert.ok(after.unit.every(value=>value===after.unit[0]),'keyboard switch changes the common increment only');
 report.unitSwitch={before,after};
 await waitSharedBet();
 report.registrationTarget=await page.evaluate(()=>{const button=document.getElementById('shared-bet-v228'),r=button.getBoundingClientRect(),at=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return {disabled:button.disabled,unobscured:at===button||button.contains(at),canBet:window.SweetsSharedMachine.client.round.canBet,editable:window.SweetsSharedControllerV224.canEditBets(window.__qa250.app),stable:window.SweetsSharedControllerV224.stable()};});
 assert.deepEqual(report.registrationTarget,{disabled:false,unobscured:true,canBet:true,editable:true,stable:true},'real BET registration target is ready immediately before the normal click');
 await page.locator('#shared-bet-v228').click();await hiddenLock(page,'server BET registered');
 await page.waitForFunction(id=>window.SweetsSharedMachine?.active?.roundId===id&&window.__qa250.app.phase==='playing',betRound.id,{timeout:30000});
 await hiddenLock(page,'server PLAYING');
 await page.waitForFunction(()=>window.__qa250.app.engines.every(engine=>!engine.opening&&!engine.busy&&!(engine.queue?.length)),null,{timeout:30000});
 report.playing=[];
 for(const [width,height]of [[390,844],[844,390]]){
  await touch.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});await page.setViewportSize({width,height});await sleep(250);await nextPaint(page);
  const active=await page.evaluate(()=>{const q=window.__qa250,slot=q.slots[q.active],r=slot.panel.getBoundingClientRect();return {phase:q.app.phase,game:slot.engine.kind,panel:{left:r.left,top:r.top,width:r.width,height:r.height},betVisible:!document.querySelector('.v250-common-bet').hidden};});
  assert.equal(active.phase,'playing');assert.equal(active.game,'dango');assert.equal(active.betVisible,false);report.playing.push({width,height,...active});
  await page.screenshot({path:path.join(output,'shared-dango-PLAYING-'+width+'x'+height+'.png')});
 }

 const localCode=await fs.readFile('assets/local-debug-game-v258.js','utf8');
 const hook='\n;window.__qa269={app,slots,get active(){return active;},select:(...args)=>select(...args),get units(){return units;},get unit(){return unit;},hud:(a=app)=>hud(a)};';
 for(const [name,search]of [['all','set=all'],['classic','set=classic'],['festival','set=festival'],['single-dango','games=dango'],['two-games','games=dango,jelly'],['three-games','games=cookie,gelato,dango']]){
  const target=await context.newPage();target.on('pageerror',error=>errors.push(String(error.stack||error)));target.on('request',request=>{const url=new URL(request.url());if(url.pathname.startsWith('/api/'))report.localApi.push(url.pathname);});
  await target.route('**/assets/local-debug-game-v258.js*',route=>route.fulfill({contentType:'application/javascript',body:localCode+hook}));
  await target.goto(base+'/?edition=local&demo=1&appv='+encodeURIComponent(version)+'&'+search,{waitUntil:'domcontentloaded'});
  await target.waitForFunction(()=>window.__qa269&&window.SweetsLocalDebugV258?.ready&&window.SweetsArcadeTabsV249?.layoutRevision===269,null,{timeout:60000});
  await target.evaluate(async()=>{await document.fonts.ready;const q=window.__qa269,index=q.slots.findIndex(slot=>slot.engine?.kind==='dango');if(index>=0)q.select(index);q.hud(q.app);});
  const emulation=await context.newCDPSession(target);
  for(const [width,height]of [[390,844],[844,390]]){await emulation.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});await target.setViewportSize({width,height});await sleep(250);await nextPaint(target);await inspect(target,'local-'+name+'-'+width+'x'+height);}
  if(name==='all'){
   await target.locator('#manual-number-toggle').click();await target.waitForFunction(()=>window.SweetsLocalDebugV258.describe().manualNumbers);
   await nextPaint(target);await inspect(target,'local-manual-BET-844x390');
   await target.locator('#manual-start').click();await target.waitForFunction(()=>window.__qa269.app.phase==='playing',null,{timeout:10000});await hiddenLock(target,'local PLAYING');
  }
  await target.close();
 }
 assert.deepEqual(report.localApi,[],'local layouts do not create server sessions');assert.deepEqual(errors,[],'all cabinet layouts remain free of uncaught errors');
 report.ok=true;await fs.writeFile(path.join(output,'result.json'),JSON.stringify(report,null,2)+'\n');
 console.log('BET_LAYOUT_V269_BROWSER_PASS',JSON.stringify({views:report.viewports.length,locks:report.locks.map(lock=>lock.label),localApi:report.localApi.length}));
}catch(error){report.failure={message:String(error),stack:error.stack};await fs.writeFile(path.join(output,'result.json'),JSON.stringify(report,null,2)+'\n');await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});throw error;}
finally{await fixture.close();}

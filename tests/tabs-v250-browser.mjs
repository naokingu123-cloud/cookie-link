/* Real client/DOM verification. Synthetic reach inputs replace only the public
   preview cache during the UI assertions; engines, RNG, BET and WIN are intact. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createUiFixture,sleep,until} from './ui-v250-fixture.mjs';

const fixture=await createUiFixture({startRound:false,output:'qa-tabs-v250'});
const {page,context,call,host,errors,output}=fixture;
const report={version:254,viewports:[],selection:[],bet:null,reach:null,sugar:null,reducedMotion:null};
async function readReachMotion(){
 return page.evaluate(()=>{
  const slot=window.__tabPreview250?.slot,current=slot?.reachNumbers,incoming=slot?.reachIncoming;
  if(!current)return {missing:true};
  const inspect=node=>{
   if(!node)return null;
   const style=getComputedStyle(node),rect=node.getBoundingClientRect();
   return {connected:node.isConnected,digits:[...node.children].map(n=>Number(n.textContent)),animationName:style.animationName,animationDuration:style.animationDuration,animationPlayState:style.animationPlayState,transform:style.transform,x:style.transform==='none'?0:new DOMMatrixReadOnly(style.transform).m41,width:rect.width,left:rect.left,right:rect.right,animations:node.getAnimations().map(animation=>({name:animation.animationName||'',playState:animation.playState,pending:animation.pending,currentTime:animation.currentTime}))};
  };
  const hiddenAncestors=[];for(let node=current;node;node=node.parentElement){const css=getComputedStyle(node);if(css.display==='none'||css.visibility==='hidden')hiddenAncestors.push({tag:node.tagName,id:node.id,className:node.className,display:css.display,visibility:css.visibility});}
  return {now:performance.now(),selected:slot.tab.getAttribute('aria-selected')==='true',index:slot.reachPage,phase:slot.reachStrip.dataset.pagePhase,pageCount:Number(slot.reachStrip.dataset.pageCount),pageSize:Number(slot.reachStrip.dataset.pageSize),pagerPaused:slot.reachStrip.dataset.pagerPaused==='true',current:inspect(current),incoming:inspect(incoming),hiddenAncestors,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,paused:window.__qa250.app.paused,presentationPaused:document.body.classList.contains('paused'),menuOpen:document.body.classList.contains('player-menu-open'),documentHidden:document.hidden,gamePhase:window.__qa250.app.phase};
 });
}
async function waitForReachPage(index){
 await page.waitForFunction(index=>{const slot=window.__tabPreview250.slot;return slot.reachPage===index&&slot.reachStrip.dataset.pagePhase==='hold'&&!slot.reachIncoming;},index,{timeout:5000});
 return readReachMotion();
}
async function waitForReachSlide(){
 await page.waitForFunction(()=>{const slot=window.__tabPreview250.slot;return !!slot.reachIncoming&&slot.reachStrip.dataset.pagePhase==='slide';},null,{timeout:5000});
}
try{
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.waitForFunction(()=>window.SweetsArcadeTabsV249?.version===254&&document.querySelector('.v250-shared-bet-switch')&&!document.querySelector('.v250-shared-bet-switch').disabled,null,{timeout:15000});
 report.reachArt=await page.evaluate(async()=>{await window.SweetsArcadeTabsV249.reachFrameReady;return {asset:window.SweetsArcadeTabsV249.describe().reachFrame,frames:[...document.querySelectorAll('.v250-reach-pop')].map(node=>({game:node.dataset.gameKind,image:getComputedStyle(node,'::before').backgroundImage,pointerEvents:getComputedStyle(node).pointerEvents}))};});
 assert.equal(report.reachArt.asset.loaded,true,'the generated sweet-shaped reach frame decodes');assert.ok(report.reachArt.asset.width>=300&&report.reachArt.asset.height>=100);assert.equal(report.reachArt.frames.length,10);
 for(const frame of report.reachArt.frames){assert.match(frame.image,/reach-art-v254\/reach-common\.webp/);assert.equal(frame.pointerEvents,'none');}
 await page.evaluate(()=>Promise.all([...document.querySelectorAll('.v250-background-logo')].map(image=>image.decode())));
 const firstBet=await page.evaluate(()=>({bets:[...window.__qa250.app.bets],credit:window.__qa250.app.credit,unit:[...window.__qa250.unit]}));
 await page.locator('.v250-shared-bet-switch').focus();await page.keyboard.press('Space');
 await page.waitForFunction(()=>window.__qa250.unit.every(value=>window.__qa250.units[value]===500));
 assert.deepEqual(await page.evaluate(()=>window.__qa250.app.bets),firstBet.bets,'BET unit switch never places a wager');
 assert.equal(await page.evaluate(()=>window.__qa250.app.credit),firstBet.credit,'unit switch does not charge CREDIT');
 await page.locator('#addbet0').click();await page.locator('#onebet0').click();
 const added=await page.evaluate(()=>({bets:[...window.__qa250.app.bets],credit:window.__qa250.app.credit,unit:[...window.__qa250.unit]}));
 assert.equal(added.bets[0],firstBet.bets[0]+501);assert.equal(added.credit,firstBet.credit-501,'native immediate reservation is preserved');
 assert.deepEqual(added.bets.slice(1),firstBet.bets.slice(1),'only the selected add-BET button changes its own game');
 // Restore via the real validated setter, not a direct wallet assignment.
 await page.evaluate(bets=>{window.__qa250.app.setBet(0,bets[0]);},firstBet.bets);
 for(let n=0;n<5;n++)await page.locator('.v250-shared-bet-switch').click();
 await page.waitForFunction(()=>window.__qa250.unit.every(value=>window.__qa250.units[value]===100));
 assert.equal(await page.evaluate(()=>window.__qa250.app.credit),firstBet.credit);
 report.bet={before:firstBet,afterAdd:added,restoredCredit:await page.evaluate(()=>window.__qa250.app.credit)};

 const touch=await context.newCDPSession(page);
 for(const [width,height]of [[320,740],[390,844],[430,932],[844,390],[1366,900]]){
  await touch.send('Emulation.setTouchEmulationEnabled',{enabled:width<900,maxTouchPoints:1});
  await page.setViewportSize({width,height});await sleep(350);
  const view=await page.evaluate(()=>{
   const rect=node=>{const r=node.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
   const shown=node=>{for(let p=node;p&&p!==document;p=p.parentElement){const css=getComputedStyle(p);if(css.display==='none'||css.visibility==='hidden'||Number(css.opacity)===0)return false;}return !!node.getBoundingClientRect().width;};
   const {slots,active}=window.__qa250;
   const common=document.querySelector('.v250-shared-bet-switch'),commonRect=rect(common),point=document.elementFromPoint(commonRect.left+commonRect.width/2,commonRect.top+commonRect.height/2);
   return {width:innerWidth,height:innerHeight,active,common:{bounds:commonRect,clickable:point===common||common.contains(point),outsideTablist:!document.querySelector('#tabs').contains(common),visibleButtons:[...document.querySelectorAll('.bet-cycle')].filter(shown).length},slots:slots.filter(slot=>!slot.holder.hidden).map(slot=>{
    const wrap=slot.tab.querySelector('.mini-wrap'),backdrop=slot.tab.querySelector('.v250-background-logo');
    const holder=rect(slot.holder),bounds=rect(slot.tab),mini=rect(wrap),add=rect(slot.addBet),one=rect(slot.oneBet);
    return {kind:slot.engine.kind,active:slot.i===active,holder,bounds,mini,add,one,backdropVisible:shown(backdrop),backdropLoaded:backdrop.complete&&backdrop.naturalWidth>0,miniZ:Number(getComputedStyle(wrap).zIndex),backdropZ:Number(getComputedStyle(backdrop).zIndex),logicalMiniWidth:parseFloat(getComputedStyle(wrap).width),titleRemoved:getComputedStyle(slot.tab.querySelector('.tab-game-name')).display==='none',buttonFont:parseFloat(getComputedStyle(slot.addBet).fontSize)};
   })};
  });
  assert.equal(view.slots.length,10);assert.equal(view.common.visibleButtons,1);assert.equal(view.common.outsideTablist,true);assert.equal(view.common.clickable,true,'shared BET switch has an independent hit target');
  for(const slot of view.slots){
   assert.equal(slot.titleRemoved,true);assert.equal(slot.backdropLoaded,true);assert.equal(slot.backdropVisible,!slot.active);
   assert.ok(slot.bounds.left>=slot.holder.left-1&&slot.bounds.right<=slot.holder.right+1);
   assert.ok(slot.bounds.top>=slot.holder.top-1&&slot.bounds.bottom<=slot.holder.bottom+1);
   if(!slot.active){assert.ok(slot.logicalMiniWidth>=46,'miniatures grow from 28 to 47 logical pixels');assert.ok(slot.miniZ>slot.backdropZ,'live miniature is above its logo');}
   assert.ok(slot.buttonFont>=8);assert.ok(slot.add.width>slot.bounds.width*.48,'BET add button gains width');
   assert.ok(slot.add.right<=slot.one.left+1,'two BET targets do not overlap');
  }
  await page.screenshot({path:output+'/tabs-'+width+'x'+height+'.png'});report.viewports.push(view);
 }
 for(let i=0;i<10;i++){
  await page.locator('#tab'+i).click();await sleep(240);
  const selection=await page.evaluate(()=>({active:window.__qa250.active,selected:window.__qa250.slots.filter(s=>s.tab.getAttribute('aria-selected')==='true').map(s=>s.i),panels:window.__qa250.slots.filter(s=>!s.panel.hidden).map(s=>s.i),logos:[...document.querySelectorAll('.v249-selected-logo')].filter(n=>getComputedStyle(n).display!=='none'&&getComputedStyle(n).visibility!=='hidden').length}));
  assert.equal(selection.active,i);assert.deepEqual(selection.selected,[i]);assert.deepEqual(selection.panels,[i]);assert.equal(selection.logos,1);report.selection.push(selection);
 }
 await page.locator('#tab8').focus();await page.keyboard.press('Home');
 assert.equal(await page.evaluate(()=>window.__qa250.active),0,'native keyboard tab selection is preserved');

 await call('/api/admin/machines/public-01/host/register',{session:host,body:{},adminOnly:true});
 const round=await until(async()=>{const state=await call('/api/machines/public-01/state',{session:host});return state.round?.phase==='PLAYING'?state.round:null;},'BET locks and real round starts');
 await page.waitForFunction(id=>window.SweetsSharedMachine.active?.roundId===id&&window.__qa250.app.phase==='playing',round.id,{timeout:30000});
 await page.waitForFunction(()=>window.__qa250.app.engines.every(e=>!e.busy&&!e.opening&&!(e.queue?.length)),null,{timeout:30000});
 assert.equal(await page.locator('.v250-shared-bet-switch').isDisabled(),true,'shared switch obeys native registered/playing lock');
 const locked=await page.evaluate(()=>({bets:[...window.__qa250.app.bets],credit:window.__qa250.app.credit,unit:[...window.__qa250.unit]}));
 await page.evaluate(()=>document.querySelector('.v250-shared-bet-switch').onclick());
 assert.deepEqual(await page.evaluate(()=>({bets:[...window.__qa250.app.bets],credit:window.__qa250.app.credit,unit:[...window.__qa250.unit]})),locked,'programmatic handler invocation also respects the lock');
 await sleep(Math.max(0,round.drawStartsAt-Date.now()+20));
 await call('/api/machines/public-01/round/ball',{session:host,body:{roundId:round.id,ballIndex:1,number:3,eventId:round.id+':tabs-v250:1'}});
 await page.waitForFunction(()=>{
  const q=window.__qa250,slot=q.slots.find(s=>s.engine.kind==='popcorn'),context=q.reachContext(slot.engine,q.app);
  return slot.engine.processed===1&&!slot.engine.busy&&slot.reachStatus==='ready'&&context&&context.count===1&&slot.tabReachVersion===slot.engine.version&&slot.reachBoardKey===context.key;
 },null,{timeout:45000});
 await page.waitForFunction(()=>window.__qa250.app.engines.every(e=>!e.busy&&!e.opening&&!(e.queue?.length)),null,{timeout:30000});

 const input=await page.evaluate(()=>{
  const q=window.__qa250,slot=q.slots.find(s=>s.engine.kind==='popcorn');
  window.__tabPreview250={slot,original:slot.tabReachResults,before:JSON.stringify({bets:q.app.bets,credit:q.app.credit,draws:q.app.draws,win:q.app.totalWin})};
  slot.tabReachResults=Array.from({length:25},(_,i)=>i+1).filter(n=>n!==3).map(number=>{const gain=number===25?0:100;return {number,total:slot.engine.totalHundredths+gain,gain,oddsUp:number===25,tier:0,allClear:false};});
  q.updateReachUI();
  Object.assign(slot.tabReachResults.find(p=>p.number===5),{gain:300,total:slot.engine.totalHundredths+300});
  q.updateReachUI();
  return {createdAt:performance.now(),digits:[...slot.reachNumbers.children].map(n=>Number(n.textContent)),allNumbers:slot.reachPageResults.map(p=>p.number),caption:slot.reachCaption.textContent,popup:slot.holder.querySelector('.v250-reach-pop').textContent,count:Number(slot.holder.dataset.v250ReachPopCount),pager:window.SweetsArcadeTabsV249.describe().reachPager};
 });
 const expectedNumbers=Array.from({length:25},(_,i)=>i+1).filter(n=>![3,25].includes(n));
 report.reach={input};
 assert.deepEqual(input.allNumbers,expectedNumbers,'all paid reach numbers are retained, odds-only number is excluded');
 assert.deepEqual(input.digits,expectedNumbers.slice(0,4),'a stationary page contains exactly four numbers');
 assert.deepEqual(input.pager,{pageSize:4,holdMs:2000,slideMs:650});
 assert.equal(input.caption,'リーチ');assert.equal(input.popup,'高額リーチ');assert.doesNotMatch(input.popup,/\d/,'only the separate four-cell pager shows reach numbers');
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const motion=await readReachMotion();report.reach.motion=motion;
 assert.equal(motion.current.connected,true);assert.equal(motion.selected,false,'the first page check covers a nonselected tab');assert.deepEqual(motion.hiddenAncestors,[]);assert.equal(motion.reducedMotion,false);assert.equal(motion.paused,false);
 assert.equal(motion.phase,'hold');assert.equal(motion.pageSize,4);assert.equal(motion.pageCount,6);assert.equal(motion.current.animationName,'none');assert.equal(motion.current.x,0);assert.equal(motion.incoming,null);
 await sleep(1000);
 const held=await readReachMotion();report.reach.held=held;
 assert.equal(held.index,0);assert.equal(held.phase,'hold');assert.equal(held.current.x,0);assert.deepEqual(held.current.digits,input.digits,'numbers remain stationary during their reading time');
 await waitForReachSlide();await sleep(120);
 const firstSlide=await readReachMotion();report.reach.firstSlide=firstSlide;
 assert.ok(firstSlide.now-input.createdAt>=1900,'the first four numbers remain for approximately two seconds before moving');
 assert.equal(firstSlide.index,1);assert.equal(firstSlide.current.animationName,'v252-reach-leave');assert.equal(firstSlide.incoming.animationName,'v252-reach-enter');
 assert.equal(firstSlide.current.animationPlayState,'running');assert.equal(firstSlide.incoming.animationPlayState,'running');
 assert.deepEqual(firstSlide.current.digits,expectedNumbers.slice(0,4));assert.deepEqual(firstSlide.incoming.digits,expectedNumbers.slice(4,8));
 assert.ok(firstSlide.current.x<0,'the old four move left');assert.ok(firstSlide.incoming.x>0,'the next four enter from the right');
 await sleep(140);
 const scrolled=await readReachMotion();report.reach.scrolled=scrolled;
 assert.ok(scrolled.current.x<firstSlide.current.x,'outgoing page continues left');assert.ok(scrolled.incoming.x<firstSlide.incoming.x,'incoming page continues from right to center');
 await page.screenshot({path:output+'/reach-four-slide.png'});
 const pages=[{index:0,digits:input.digits}],firstNext=await waitForReachPage(1);pages.push({index:1,digits:firstNext.current.digits});report.reach.pages=pages;
 assert.equal(firstNext.current.x,0);assert.equal(firstNext.current.animationName,'none');
 for(let index=2;index<6;index++){const observed=await waitForReachPage(index);assert.equal(observed.current.x,0);assert.ok(observed.current.digits.length<=4);pages.push({index,digits:observed.current.digits});}
 assert.deepEqual(pages.flatMap(p=>p.digits),expectedNumbers,'every reach appears in order across six real elapsed-time pages');
 assert.equal(pages.at(-1).digits.length,3,'the final partial page retains all three remaining numbers');
 const wrapped=await waitForReachPage(0);report.reach.wrapped=wrapped;assert.deepEqual(wrapped.current.digits,input.digits,'last page wraps back to the first four');
 const selectionFlow=[];report.reach.selectionFlow=selectionFlow;
 for(const selected of [true,false]){
  await page.evaluate(selected=>{const q=window.__qa250;q.select(selected?window.__tabPreview250.slot.i:0);},selected);
  const before=await readReachMotion();await waitForReachSlide();await sleep(120);const sliding=await readReachMotion();
  assert.equal(sliding.selected,selected);assert.equal(sliding.current.animationPlayState,'running');assert.equal(sliding.incoming.animationPlayState,'running');
  assert.ok(sliding.current.x<0&&sliding.incoming.x>0,'both selected and inactive cards have the paired directional transition');
  const after=await waitForReachPage((before.index+1)%6);selectionFlow.push({selected,before,sliding,after});
 }
 // Pause during a transition, longer than its entire duration, then resume it.
 await waitForReachSlide();await sleep(100);await page.locator('#open-record-menu').click();
 await page.waitForFunction(()=>document.body.classList.contains('paused'));
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const stopped=await readReachMotion();await sleep(900);const still=await readReachMotion();
 const pauseFlow={stopped,still};report.reach.pauseFlow=pauseFlow;
 assert.equal(stopped.phase,'slide');assert.equal(stopped.menuOpen,true);assert.equal(still.presentationPaused,true,'record-menu presentation pause is independent of shared gameplay');assert.equal(still.pagerPaused,true);assert.equal(still.current.animationPlayState,'paused');assert.equal(still.incoming.animationPlayState,'paused');
 assert.equal(still.index,stopped.index);assert.equal(still.current.x,stopped.current.x);assert.equal(still.incoming.x,stopped.incoming.x,'menu pause freezes both pages');
 await page.locator('#record-close-top').click();await page.waitForFunction(()=>!document.body.classList.contains('paused'));
 const resumed=await waitForReachPage(stopped.index);pauseFlow.resumed=resumed;
 assert.equal(resumed.pagerPaused,false);assert.deepEqual(resumed.current.digits,stopped.incoming.digits,'closing the menu completes the same pending page');
 // Hidden-document suspension preserves the reading page and does not skip it.
 const hiddenStart=await page.evaluate(()=>{
  window.__tabHiddenDescriptor252=Object.getOwnPropertyDescriptor(document,'hidden');
  Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));
  return {index:window.__tabPreview250.slot.reachPage,phase:window.__tabPreview250.slot.reachStrip.dataset.pagePhase};
 });
 await sleep(2200);const hiddenStill=await readReachMotion();
 assert.equal(hiddenStill.documentHidden,true);assert.equal(hiddenStill.pagerPaused,true);assert.equal(hiddenStill.index,hiddenStart.index);assert.equal(hiddenStill.phase,hiddenStart.phase);
 await page.evaluate(()=>{const descriptor=window.__tabHiddenDescriptor252;if(descriptor)Object.defineProperty(document,'hidden',descriptor);else delete document.hidden;delete window.__tabHiddenDescriptor252;document.dispatchEvent(new Event('visibilitychange'));});
 await page.waitForFunction(()=>!window.__qa250.app.paused);
 const hiddenResume=await waitForReachPage((hiddenStart.index+1)%6);report.reach.hiddenFlow={hiddenStart,hiddenStill,hiddenResume};
 const upgraded=await page.evaluate(()=>{
  const q=window.__qa250,slot=window.__tabPreview250.slot;
  Object.assign(slot.tabReachResults.find(p=>p.number===5),{gain:1000,total:slot.engine.totalHundredths+1000});q.updateReachUI();
  const count=Number(slot.holder.dataset.v250ReachPopCount),text=slot.holder.querySelector('.v250-reach-pop').textContent;
  q.updateReachUI();q.updateReachUI();
  return {count,afterRepeated:Number(slot.holder.dataset.v250ReachPopCount),text};
 });
 assert.equal(upgraded.count,input.count+1);assert.equal(upgraded.afterRepeated,upgraded.count);assert.match(upgraded.text,/超高額リーチ/);
 await page.screenshot({path:output+'/reach-popup.png'});
 const highest=await page.evaluate(()=>{
  const q=window.__qa250,slot=window.__tabPreview250.slot;Object.assign(slot.tabReachResults.find(p=>p.number===5),{allClear:true});q.updateReachUI();
  const pop=slot.holder.querySelector('.v250-reach-pop'),count=Number(slot.holder.dataset.v250ReachPopCount);q.updateReachUI();
  return {count,afterRepeated:Number(slot.holder.dataset.v250ReachPopCount),text:pop.textContent,tier:pop.dataset.tier,numberNodes:pop.querySelectorAll('small').length,image:getComputedStyle(pop,'::before').backgroundImage};
 });
 assert.equal(highest.count,upgraded.count+1);assert.equal(highest.afterRepeated,highest.count);assert.equal(highest.text,'最高役リーチ');assert.equal(highest.tier,'3');assert.equal(highest.numberNodes,0);assert.match(highest.image,/reach-common\.webp/);
 await page.locator('#open-record-menu').click();
 await page.waitForFunction(()=>document.body.classList.contains('player-menu-open'));
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const pausedPopup=await page.evaluate(()=>{const pop=window.__tabPreview250.slot.holder.querySelector('.v250-reach-pop');return {paused:pop.dataset.motionPaused,animations:pop.getAnimations({subtree:true}).map(a=>({playState:a.playState,time:Number(a.currentTime)}))};});
 await sleep(200);
 const heldPopup=await page.evaluate(()=>window.__tabPreview250.slot.holder.querySelector('.v250-reach-pop').getAnimations({subtree:true}).map(a=>({playState:a.playState,time:Number(a.currentTime)})));
 assert.equal(pausedPopup.paused,'true');assert.ok(pausedPopup.animations.length>0);assert.ok(pausedPopup.animations.every(a=>a.playState==='paused'));assert.deepEqual(heldPopup,pausedPopup.animations,'the sweet-frame burst freezes with the menu');
 await page.locator('#record-close-top').click();
 Object.assign(report.reach,{highest,popupPause:{pausedPopup,heldPopup}});
 await page.emulateMedia({reducedMotion:'reduce'});await sleep(100);
 const reducedFirst=await readReachMotion();
 report.reducedMotion={first:reducedFirst,layout:await page.evaluate(()=>{const slot=window.__tabPreview250.slot;return {tabIndex:slot.reachClip.tabIndex,overflow:getComputedStyle(slot.reachClip).overflowX};})};
 assert.equal(reducedFirst.reducedMotion,true);assert.equal(reducedFirst.phase,'hold');assert.equal(reducedFirst.current.animationName,'none');assert.equal(reducedFirst.incoming,null);assert.equal(reducedFirst.index,0);
 assert.equal(report.reducedMotion.layout.tabIndex,0);assert.equal(report.reducedMotion.layout.overflow,'hidden');
 const reducedNext=await waitForReachPage(1);report.reducedMotion.next=reducedNext;
 assert.equal(reducedNext.current.animationName,'none');assert.equal(reducedNext.incoming,null);assert.equal(reducedNext.current.x,0);assert.deepEqual(reducedNext.current.digits,expectedNumbers.slice(4,8),'reduced motion still advances to all later pages without sliding');
 await page.emulateMedia({reducedMotion:'no-preference'});
 const empty=await page.evaluate(()=>{
  const q=window.__qa250,slot=window.__tabPreview250.slot;slot.tabReachResults=[{number:25,total:0,gain:0,oddsUp:true,tier:0}];q.updateReachUI();
  return {text:slot.reachStrip.textContent,captionHidden:slot.reachCaption.hidden,empty:slot.reachStrip.dataset.empty,popupHidden:slot.holder.querySelector('.v250-reach-pop').hidden};
 });
 assert.equal(empty.text,'');assert.equal(empty.captionHidden,true);assert.equal(empty.empty,'true');assert.equal(empty.popupHidden,true);
 const reappeared=await page.evaluate(()=>{
  const q=window.__qa250,slot=window.__tabPreview250.slot,before=Number(slot.holder.dataset.v250ReachPopCount);
  slot.tabReachResults=[{number:5,total:slot.engine.totalHundredths+1000,gain:1000,oddsUp:false,tier:2,allClear:false}];q.updateReachUI();
  const count=Number(slot.holder.dataset.v250ReachPopCount),text=slot.holder.querySelector('.v250-reach-pop').textContent;
  q.updateReachUI();q.updateReachUI();
  return {before,count,afterRepeated:Number(slot.holder.dataset.v250ReachPopCount),text};
 });
 assert.equal(reappeared.count,reappeared.before+1,'the same high reach announces once after disappearing');
 assert.equal(reappeared.afterRepeated,reappeared.count,'repainting an unchanged reappeared reach does not announce again');
 assert.match(reappeared.text,/超高額リーチ/);
 Object.assign(report.reach,{upgraded,empty,reappeared});
 report.sugar=await page.evaluate(()=>window.__qa250.slots.map(slot=>({kind:slot.engine.kind,samePlaque:slot.tabSugar.parentElement===slot.tabWin.parentElement,row:getComputedStyle(slot.tabSugar).gridRowStart,winRow:getComputedStyle(slot.tabWin.parentElement.querySelector('.win-word')).gridRowStart})));
 for(const sugar of report.sugar){assert.equal(sugar.samePlaque,true);assert.equal(sugar.row,sugar.winRow,'sugar GET belongs beside WIN');}
 await page.evaluate(()=>{const q=window.__qa250,fixture=window.__tabPreview250;fixture.slot.tabReachResults=fixture.original;q.updateReachUI();if(fixture.before!==JSON.stringify({bets:q.app.bets,credit:q.app.credit,draws:q.app.draws,win:q.app.totalWin}))throw Error('UI reach previews changed gameplay state');delete window.__tabPreview250;});
 assert.deepEqual(errors,[],'no page exceptions');
 await fs.writeFile(output+'/report.json',JSON.stringify(report,null,2));
 console.log('TABS_V252_OK',JSON.stringify({viewports:report.viewports.length,selections:report.selection.length,miniatureLogicalPx:47,sharedBet:true,allReachNumbers:expectedNumbers.length,pageSize:4,pages:pages.length,holdMs:2000,slideMs:650,stationaryHold:true,pairedLeftRightSlide:true,selectedAndInactivePaging:true,pauseResume:true,hiddenSuspension:true,highPopup:true,ultraPopup:true,reappearedPopup:true,empty:true,reducedMotionPaging:true,errors:errors.length}));
}catch(error){report.failure={message:String(error),stack:error.stack,motion:await readReachMotion().catch(e=>({error:String(e)}))};await fs.writeFile(output+'/report.json',JSON.stringify(report,null,2));await page.screenshot({path:output+'/failure.png'}).catch(()=>{});throw error;}
finally{await fixture.close();}

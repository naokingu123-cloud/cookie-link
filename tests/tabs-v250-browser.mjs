/* Real client/DOM verification. Synthetic reach inputs replace only the public
   preview cache during the UI assertions; engines, RNG, BET and WIN are intact. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createUiFixture,sleep,until} from './ui-v250-fixture.mjs';

const fixture=await createUiFixture({startRound:false,output:'qa-tabs-v250'});
const {page,context,call,host,errors,output}=fixture;
const report={version:251,viewports:[],selection:[],bet:null,reach:null,sugar:null,reducedMotion:null};
async function readReachMotion(){
 return page.evaluate(()=>{
  const slot=window.__tabPreview250?.slot,track=slot?.reachNumbers.querySelector('.v250-reach-track');
  if(!track)return {missing:true};
  const style=getComputedStyle(track),ancestors=[];
  for(let node=track;node;node=node.parentElement){const css=getComputedStyle(node);if(css.display==='none'||css.visibility==='hidden')ancestors.push({tag:node.tagName,id:node.id,className:node.className,display:css.display,visibility:css.visibility});}
  return {connected:track.isConnected,selected:slot.tab.getAttribute('aria-selected')==='true',animationName:style.animationName,animationDuration:style.animationDuration,animationPlayState:style.animationPlayState,durationVariable:style.getPropertyValue('--v250-reach-duration'),transform:style.transform,x:style.transform==='none'?0:new DOMMatrixReadOnly(style.transform).m41,width:track.getBoundingClientRect().width,hiddenAncestors:ancestors,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,paused:window.__qa250.app.paused,phase:window.__qa250.app.phase,bodyClass:document.body.className,animations:track.getAnimations().map(animation=>({name:animation.animationName||'',playState:animation.playState,pending:animation.pending,currentTime:animation.currentTime,playbackRate:animation.playbackRate}))};
 });
}
try{
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.waitForFunction(()=>window.SweetsArcadeTabsV249?.version===251&&document.querySelector('.v250-shared-bet-switch')&&!document.querySelector('.v250-shared-bet-switch').disabled,null,{timeout:15000});
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
  const digits=[...slot.reachNumbers.querySelector('.v250-reach-sequence:not([aria-hidden])').children].map(n=>Number(n.textContent));
  return {digits,caption:slot.reachCaption.textContent,popup:slot.holder.querySelector('.v250-reach-pop').textContent,count:Number(slot.holder.dataset.v250ReachPopCount)};
 });
 report.reach={input};
 assert.deepEqual(input.digits,Array.from({length:25},(_,i)=>i+1).filter(n=>![3,25].includes(n)),'all paid reach numbers are retained, odds-only number is excluded');
 assert.equal(input.caption,'リーチ');assert.match(input.popup,/高額リーチ/);
 // CSS animation creation is observed after rendering, not in the same task
 // that inserted/replaced the track. Retain strict elapsed-time/direction checks.
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const motion=await readReachMotion();report.reach.motion=motion;
 assert.equal(motion.connected,true);assert.equal(motion.selected,false,'the first scroll check covers a nonselected tab');assert.deepEqual(motion.hiddenAncestors,[]);assert.equal(motion.reducedMotion,false);assert.equal(motion.paused,false);
 assert.equal(motion.animationName,'v250-reach-marquee','the scrolling track retains its CSS animation');
 const running=motion.animations.find(animation=>animation.name==='v250-reach-marquee');
 assert.equal(running?.playState,'running','the reach marquee runs after the rendering frame');
 await sleep(330);
 const scrolled=await readReachMotion();report.reach.scrolled=scrolled;
 const continued=scrolled.animations.find(animation=>animation.name==='v250-reach-marquee');
 assert.ok(continued?.currentTime>running.currentTime,'the reach animation clock advances');
 assert.ok(scrolled.x<motion.x,'reach numbers move from right to left');
 assert.notEqual(scrolled.transform,motion.transform,'reach strip moves without an old !important transform reset');
 const selectionFlow=[];report.reach.selectionFlow=selectionFlow;
 for(const selected of [true,false]){
  await page.evaluate(selected=>{const q=window.__qa250;q.select(selected?window.__tabPreview250.slot.i:0);},selected);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const before=await readReachMotion();await sleep(160);const after=await readReachMotion();selectionFlow.push({selected,before,after});
  assert.equal(after.selected,selected);assert.equal(after.animationPlayState,'running');
  assert.ok(after.animations[0].currentTime>before.animations[0].currentTime,'selection changes keep the reach clock running');
  assert.ok(after.x<before.x,'the reach continues leftward after selection changes');
 }
 // The real menu pause still stops the opted-in track and closing it resumes.
 await page.locator('#open-record-menu').click();
 await page.waitForFunction(()=>document.body.classList.contains('paused'));
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const stopped=await readReachMotion();await sleep(160);const still=await readReachMotion();
 const pauseFlow={stopped,still};report.reach.pauseFlow=pauseFlow;
 assert.equal(still.animationPlayState,'paused');assert.equal(still.animations[0].playState,'paused');
 assert.equal(still.animations[0].currentTime,stopped.animations[0].currentTime,'normal pause freezes the reach clock');
 assert.equal(still.transform,stopped.transform);
 await page.locator('#record-close-top').click();
 await page.waitForFunction(()=>!document.body.classList.contains('paused'));
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const resumeStart=await readReachMotion();await sleep(160);const resumed=await readReachMotion();Object.assign(pauseFlow,{resumeStart,resumed});
 assert.equal(resumed.animationPlayState,'running');assert.ok(resumed.animations[0].currentTime>resumeStart.animations[0].currentTime);assert.ok(resumed.x<resumeStart.x,'closing the menu resumes leftward motion');
 const upgraded=await page.evaluate(()=>{
  const q=window.__qa250,slot=window.__tabPreview250.slot;
  Object.assign(slot.tabReachResults.find(p=>p.number===5),{gain:1000,total:slot.engine.totalHundredths+1000});q.updateReachUI();
  const count=Number(slot.holder.dataset.v250ReachPopCount),text=slot.holder.querySelector('.v250-reach-pop').textContent;
  q.updateReachUI();q.updateReachUI();
  return {count,afterRepeated:Number(slot.holder.dataset.v250ReachPopCount),text};
 });
 assert.equal(upgraded.count,input.count+1);assert.equal(upgraded.afterRepeated,upgraded.count);assert.match(upgraded.text,/超高額リーチ/);
 await page.screenshot({path:output+'/reach-popup.png'});
 await page.emulateMedia({reducedMotion:'reduce'});await sleep(100);
 report.reducedMotion=await page.evaluate(()=>{const slot=window.__tabPreview250.slot,track=slot.reachNumbers.querySelector('.v250-reach-track');return {motion:window.SweetsArcadeTabsV249.describe().reducedMotion,animation:getComputedStyle(track).animationName,tabIndex:slot.reachClip.tabIndex,overflow:getComputedStyle(slot.reachClip).overflowX};});
 assert.equal(report.reducedMotion.motion,true);assert.equal(report.reducedMotion.animation,'none');assert.equal(report.reducedMotion.tabIndex,0);assert.equal(report.reducedMotion.overflow,'auto');
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
 report.reach={input,motion,scrolled,selectionFlow,pauseFlow,upgraded,empty,reappeared};
 report.sugar=await page.evaluate(()=>window.__qa250.slots.map(slot=>({kind:slot.engine.kind,samePlaque:slot.tabSugar.parentElement===slot.tabWin.parentElement,row:getComputedStyle(slot.tabSugar).gridRowStart,winRow:getComputedStyle(slot.tabWin.parentElement.querySelector('.win-word')).gridRowStart})));
 for(const sugar of report.sugar){assert.equal(sugar.samePlaque,true);assert.equal(sugar.row,sugar.winRow,'sugar GET belongs beside WIN');}
 await page.evaluate(()=>{const q=window.__qa250,fixture=window.__tabPreview250;fixture.slot.tabReachResults=fixture.original;q.updateReachUI();if(fixture.before!==JSON.stringify({bets:q.app.bets,credit:q.app.credit,draws:q.app.draws,win:q.app.totalWin}))throw Error('UI reach previews changed gameplay state');delete window.__tabPreview250;});
 assert.deepEqual(errors,[],'no page exceptions');
 await fs.writeFile(output+'/report.json',JSON.stringify(report,null,2));
 console.log('TABS_V250_OK',JSON.stringify({viewports:report.viewports.length,selections:report.selection.length,miniatureLogicalPx:47,sharedBet:true,allReachNumbers:input.digits.length,highPopup:true,ultraPopup:true,reappearedPopup:true,empty:true,reducedMotion:true,errors:errors.length}));
}catch(error){report.failure={message:String(error),stack:error.stack,motion:await readReachMotion().catch(e=>({error:String(e)}))};await fs.writeFile(output+'/report.json',JSON.stringify(report,null,2));await page.screenshot({path:output+'/failure.png'}).catch(()=>{});throw error;}
finally{await fixture.close();}

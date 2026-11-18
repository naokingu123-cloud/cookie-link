/* Native result DOM and native result/payout phases against an isolated server.
 * Controlled per-game result values exercise presentation only. The fixture
 * never starts a physical round or contacts the published game server.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createUiFixture,sleep} from './ui-v250-fixture.mjs';

const output='qa-results-v253',fixture=await createUiFixture({startRound:false,output});
const {page,context,errors}=fixture;
const report={version:fixture.version,scope:'Controlled result records rendered by the shipped native result UI; native result, payout and prepare functions remain in charge. Isolated local server only.',cases:[],latePhases:[],lifecycle:null,zero:null,reduced:null};
const wins=[12000,0,450,1234567,5,7600,8800,0,600,100000];
let caseSerial=0;

async function observe(){
 return page.evaluate(()=>{
  const a=window.__qa250.app,layer=document.getElementById('round-result-layer'),panel=layer.querySelector('.round-result'),rows=[...layer.querySelectorAll('.result-game[data-game-index]')];
  const bounds=node=>{if(!node)return null;const r=node.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
  const visible=node=>{if(!node)return false;for(let p=node;p&&p.nodeType===1;p=p.parentElement){const css=getComputedStyle(p);if(p.hidden||css.display==='none'||css.visibility==='hidden'||Number(css.opacity)===0)return false;}const r=node.getBoundingClientRect();return r.width>0&&r.height>0;};
  const wipe=document.querySelector('.sr253-wipe');
  return {
   presentation:window.SweetsResultsV253.describe(),phase:a.phase,token:a.token,credit:a.credit,displayCredit:a.displayCredit,totalWin:a.totalWin,roundWins:a.roundWins.slice(),enabled:a.enabled.slice(),locked:a.locked.slice(),draws:a.draws.slice(),sugarBank:a.wonderBank.length,
   resultDuration:a.result?.duration??null,payoutDuration:a.payout?.duration??null,layerHidden:layer.hidden,layer:bounds(layer),panel:bounds(panel),console:bounds(document.getElementById('console')),
   total:{text:document.getElementById('result-total-win').textContent,font:getComputedStyle(document.querySelector('#result-total-win .gold-number')||document.getElementById('result-total-win')).fontFamily,rect:bounds(document.getElementById('result-total-win'))},
   rows:rows.map(row=>{const value=row.querySelector('.result-value'),logo=row.querySelector('.result-game-emblem'),award=row.querySelector('.result-game-award'),sugar=row.querySelector('.sr253-row-sugar');return {index:Number(row.dataset.gameIndex),kind:row.dataset.gameKind,visible:visible(row),rect:bounds(row),logo:{src:logo?.getAttribute('src')||'',loaded:!!logo?.complete&&logo?.naturalWidth>0,rect:bounds(logo)},win:value?.textContent||'',font:getComputedStyle(value?.querySelector('.gold-number')||value||row).fontFamily,award:bounds(award),sugar:{text:sugar?.textContent||'',visible:visible(sugar)},scrollWidth:row.scrollWidth,clientWidth:row.clientWidth};}),
   floatingControls:['#screen>#debug-tools #debug-start','#screen>#debug-tools #jpc-mode'].map(selector=>{const node=document.querySelector(selector),css=node&&getComputedStyle(node);return {selector,exists:!!node,visible:visible(node),visibility:css?.visibility,pointerEvents:css?.pointerEvents,text:node?.textContent||''};}),
   wipe:wipe?{visible:visible(wipe),hidden:wipe.hidden,pointerEvents:getComputedStyle(wipe).pointerEvents,opacity:Number(getComputedStyle(wipe).opacity),rect:bounds(wipe),animations:wipe.getAnimations({subtree:true}).map(animation=>({playState:animation.playState,currentTime:animation.currentTime}))}:null,
   menu:document.body.classList.contains('player-menu-open'),documentHidden:document.hidden,beginCount:window.__resultsTest253?.beginCount||0,acceptedBeginCount:window.__resultsTest253?.acceptedBeginCount||0
  };
 });
}
async function present(indexes,{zero=false,sugar=[0,6],width=390,height=844,firstPhase='result'}={}){
 caseSerial++;
 // The controller performs three delayed cleanup checks after READY. Do not
 // inject the next controlled result until that existing cleanup has finished.
 await page.waitForFunction(()=>!window.SweetsSharedControllerV224?.describe().resetBusy,null,{timeout:5000});
 await page.setViewportSize({width,height});
 await sleep(120);
 const data=await page.evaluate(({indexes,zero,sugar,wins,caseSerial,firstPhase})=>{
  const q=window.__qa250,a=q.app;
  if(document.body.classList.contains('player-menu-open'))document.getElementById('record-close-top')?.click();
  // The normal prepare path closes the previous result and advances its token.
  // It does not charge BET or invent lottery numbers.
  a.prepare();
  const before={credit:a.credit,displayCredit:a.displayCredit,bets:a.bets.slice(),draws:a.draws.slice(),sugarBank:a.wonderBank.length,acceptedBeginCount:window.__resultsTest253.acceptedBeginCount};
  const enabled=a.engines.map((_,i)=>indexes.includes(i)),locked=enabled.map(on=>on?100:0),values=a.engines.map((_,i)=>enabled[i]&&!zero?wins[i]:0);
  a.enabled=enabled;a.locked=locked;a.roundWins=values;a.paid=enabled.map(()=>true);
  a.engines.forEach((engine,i)=>{engine.wonderCollected=enabled[i]&&sugar.includes(i);engine.wonderToken=engine.wonderCollected?{game:i,value:100,directJpc:false}:null;});
  window.__resultsTest253.current={caseSerial,token:a.token,before,indexes,values,sugar:sugar.filter(i=>enabled[i]),total:values.reduce((sum,n)=>sum+n,0)};
  a.phase='playing';a.result=null;a.payout=null;a.finishRound();
  if(firstPhase!=='result'){
   // Enter the late phase through real native methods before the first result
   // DOM is rendered. hud() is the same shipped renderer used by flushUI().
   // Its synchronous before/after snapshot cannot pass by waiting 1.3 seconds.
   a.beginPayout();if(firstPhase==='complete')a.advancePayout(a.payout.duration);
   const native=()=>({phase:a.phase,token:a.token,credit:a.credit,displayCredit:a.displayCredit,totalWin:a.totalWin,result:JSON.parse(JSON.stringify(a.result)),payout:JSON.parse(JSON.stringify(a.payout)),acceptedBeginCount:window.__resultsTest253.acceptedBeginCount});
   const layer=document.getElementById('round-result-layer'),alreadyRendered=!layer.hidden&&layer.dataset.round===String(a.token),beforePaint=native();
   q.hud(a);
   const afterPaint=native(),total=layer.querySelector('.result-total'),rows=[...layer.querySelectorAll('.result-game[data-game-index]')].filter(row=>!row.hidden&&!row.classList.contains('no-bet'));
   window.__resultsTest253.current.firstRender={requestedPhase:firstPhase,alreadyRendered,beforePaint,afterPaint,presentation:window.SweetsResultsV253.describe(),layerHidden:layer.hidden,total:{text:document.getElementById('result-total-win').textContent,opacity:Number(getComputedStyle(total).opacity)},rows:rows.map(row=>({index:Number(row.dataset.gameIndex),text:row.querySelector('.result-value').textContent,opacity:Number(getComputedStyle(row).opacity)})),floatingControls:['#screen>#debug-tools #debug-start','#screen>#debug-tools #jpc-mode'].map(selector=>({selector,visibility:getComputedStyle(document.querySelector(selector)).visibility}))};
  }
  q.scheduleUI(a);
  return window.__resultsTest253.current;
 },{indexes,zero,sugar,wins,caseSerial,firstPhase});
 if(firstPhase==='result')await page.waitForFunction(token=>window.SweetsResultsV253.describe().active&&String(window.SweetsResultsV253.describe().token)===String(token),data.token,{timeout:5000});
 return {...data,width,height};
}
function contained(inner,outer,label,tolerance=2){
 assert.ok(inner&&outer&&inner.width>0&&inner.height>0,label+' has visible bounds');
 assert.ok(inner.left>=outer.left-tolerance&&inner.top>=outer.top-tolerance&&inner.right<=outer.right+tolerance&&inner.bottom<=outer.bottom+tolerance,label+' fits: '+JSON.stringify({inner,outer}));
}
function verifyFloatingControls(state,hidden){
 assert.equal(state.floatingControls.length,2);
 for(const control of state.floatingControls){
  assert.equal(control.exists,true,'native floating control exists: '+control.selector);
  assert.equal(control.visible,!hidden,'native floating control '+(hidden?'is hidden during results/cut-in':'returns after the cut-in')+': '+control.selector);
  if(hidden){assert.equal(control.visibility,'hidden');assert.equal(control.pointerEvents,'none');}
 }
}
function verifyRows(state,expected){
 const shown=state.rows.filter(row=>row.visible),actualIndexes=shown.map(row=>row.index).sort((a,b)=>a-b);
 assert.deepEqual(actualIndexes,[...expected.indexes].sort((a,b)=>a-b),'only the games participating in this result are visible');
 assert.equal(state.total.text,String(expected.total),'TOTAL displays the real sum without punctuation');assert.match(state.total.font,/ArcadePayout/);assert.doesNotMatch(state.total.text,/[,，]/);
 assert.equal(state.presentation.assets.length,2);assert.ok(state.presentation.assets.every(asset=>asset.loaded&&!asset.failed),'generated frame and sweets cut-in both decode');
 contained(state.panel,state.layer,'result panel');contained(state.total.rect,state.panel,'total WIN');
 for(const row of shown){
  assert.equal(row.win,String(expected.values[row.index]),'per-game WIN is unchanged');assert.doesNotMatch(row.win,/[,，]/);assert.match(row.font,/ArcadePayout/);
  assert.equal(row.logo.loaded,true,'game logo decodes');assert.ok(row.logo.src.includes('assets/arcade-v249/logo-'),'existing game identity is used');
  contained(row.rect,state.panel,'result row '+row.index);contained(row.logo.rect,row.rect,'row logo '+row.index);contained(row.award,row.rect,'row award '+row.index);
  assert.ok(row.logo.rect.right<=row.award.left+3,'each game has a horizontal logo/result row');
  assert.ok(row.scrollWidth<=row.clientWidth+3,'result row does not overflow horizontally');
  assert.equal(row.sugar.visible,expected.sugar.includes(row.index),'Sugar badge comes only from this game result');
 }
 assert.equal(state.sugarBank,expected.before.sugarBank,'presentation does not add Sugar tokens');assert.deepEqual(state.draws,expected.before.draws,'presentation never generates lottery numbers');
 verifyFloatingControls(state,true);
}
async function complete(expected){
 // The shared controller can close COMPLETE at its next 100ms monitor tick,
 // even without a physical round in this fixture. Read the atomic observation
 // taken by onChange instead of racing several browser RPCs against that tick.
 await page.waitForFunction(token=>!!window.__resultsTest253.completed[token],expected.token,{timeout:8000});
 const done=await page.evaluate(token=>window.__resultsTest253.completed[token],expected.token);
 assert.equal(done.phase,'complete');assert.equal(done.token,expected.token);
 assert.equal(done.credit,expected.before.credit+expected.total,'native payout credits the total exactly once');assert.equal(done.displayCredit,done.credit);assert.equal(done.acceptedBeginCount,expected.before.acceptedBeginCount+1,'one accepted native payout transition per result');
 assert.equal(done.repeated.after,done.repeated.before,'repeat payout callbacks cannot duplicate CREDIT');assert.equal(done.repeated.phase,'complete','repeat callbacks do not advance the native result lifecycle');
 return done;
}
async function closeNative({direct=false}={}){
 if(direct)await page.evaluate(()=>{const a=window.__qa250.app;a.result=null;a.payout=null;a.phase='ready';document.getElementById('round-result-layer').hidden=true;a.onChange?.(a);window.__qa250.scheduleUI(a);});
 // Observe the real controller's cleanup. An extra prepare() here could bump
 // its new token and cancel the very cut-in this test is meant to inspect.
 await page.waitForFunction(()=>window.__qa250.app.phase==='ready'&&document.getElementById('round-result-layer').hidden,null,{timeout:3000});
 const closed=await page.evaluate(()=>{const a=window.__qa250.app;return {phase:a.phase,credit:a.credit,token:a.token};});
 assert.equal(closed.phase,'ready','next BET is ready immediately, without waiting for visual exit');
 return closed;
}
try{
 await page.waitForFunction(()=>window.SweetsResultsV253?.describe&&[...document.styleSheets].some(sheet=>sheet.href?.includes('sweets-results-v253.css')),null,{timeout:15000});
 await page.evaluate(async()=>{await window.SweetsResultsV253.assetsReady;});
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(()=>{
  const a=window.__qa250.app,original=a.beginPayout,originalChange=a.onChange;
  window.__resultsTest253={beginCount:0,acceptedBeginCount:0,completed:{},completionQueued:false};
  a.beginPayout=function(...args){const q=window.__resultsTest253,prior=this.phase;q.beginCount++;const result=original.apply(this,args);if(prior==='result'&&this.phase!=='result')q.acceptedBeginCount++;return result;};
  a.onChange=function(...args){
   const result=originalChange.apply(this,args),q=window.__resultsTest253,token=a.token;
   if(a.phase==='complete'&&q.current?.token===token&&!q.completed[token]&&!q.completionQueued){
    q.completionQueued=true;
    // Complete the native callback first (including the accepted-begin counter)
    // then inspect and retry in the same JS turn, before any controller timer.
    queueMicrotask(()=>{
     q.completionQueued=false;if(a.phase!=='complete'||a.token!==token||q.completed[token])return;
     const done={phase:a.phase,token:a.token,credit:a.credit,displayCredit:a.displayCredit,totalWin:a.totalWin,resultDuration:a.result?.duration??null,payoutDuration:a.payout?.duration??null,acceptedBeginCount:q.acceptedBeginCount,beginCount:q.beginCount,presentation:window.SweetsResultsV253.describe()};
     q.completed[token]=done;
     const before=a.credit;for(let i=0;i<5;i++){a.beginPayout();a.onChange?.(a);}
     done.repeated={before,after:a.credit,phase:a.phase};
    });
   }
   return result;
  };
 });
 const touch=await context.newCDPSession(page);
 const configs=[{indexes:Array.from({length:10},(_,i)=>i),width:390,height:844},{indexes:[0,6,9],width:844,height:390},{indexes:[0],width:1366,height:900},{indexes:Array.from({length:10},(_,i)=>i),width:844,height:390}];
 for(const config of configs){
  await touch.send('Emulation.setTouchEmulationEnabled',{enabled:config.width<900,maxTouchPoints:1});
  const expected=await present(config.indexes,config),entry=await observe();
  verifyFloatingControls(entry,true);
  assert.equal(entry.resultDuration,1800,'existing native result duration is preserved');assert.equal(entry.credit,expected.before.credit,'displaying the result cannot pay early');
  const prefix='results-'+config.width+'x'+config.height+'-'+config.indexes.length;
  await page.screenshot({path:output+'/'+prefix+'-entry.png'});
  await page.waitForFunction(()=>window.SweetsResultsV253.describe().elapsed>=650,null,{timeout:3000});
  const middle=await observe();await page.screenshot({path:output+'/'+prefix+'-middle.png'});
  await page.waitForFunction(()=>window.SweetsResultsV253.describe().phase==='hold'||window.SweetsResultsV253.describe().elapsed>=1400,null,{timeout:3000});
  const shown=await observe();verifyRows(shown,expected);await page.screenshot({path:output+'/'+prefix+'-final.png'});
  const before=shown.presentation.startCount;
  const stable=await page.evaluate(()=>{const a=window.__qa250.app,nodes=[...document.querySelectorAll('#result-games .result-game')];for(let i=0;i<12;i++)a.onChange?.(a);window.__qa250.scheduleUI(a);return nodes.map(node=>node.dataset.gameIndex);});
  await sleep(60);const repeated=await observe();assert.equal(repeated.presentation.startCount,before,'same-token rerender does not replay entrance');assert.ok(repeated.presentation.elapsed>=shown.presentation.elapsed,'same-token rerender does not rewind presentation');assert.equal(new Set(repeated.rows.map(row=>row.index)).size,repeated.rows.length,'no duplicate game rows');
  const done=await complete(expected),closed=await closeNative();await sleep(160);const cutin=await observe();
  assert.equal(cutin.phase,'ready');assert.equal(cutin.layerHidden,true);assert.equal(cutin.credit,done.credit,'cut-in does not change payout');
  verifyFloatingControls(cutin,true);
  assert.ok(closed.token>done.token,'native cleanup advances to a fresh board');assert.equal(cutin.presentation.wipe.startCount,done.presentation.wipe.startCount+1,'the native close creates exactly one new cut-in');
  if(cutin.wipe?.visible){assert.equal(cutin.wipe.pointerEvents,'none','outro never captures next-game input');await page.screenshot({path:output+'/'+prefix+'-cutin.png'});}
  else throw new Error('Normal completed result should show the short sweets cut-in after native closure');
  await sleep(650);const after=await observe();assert.ok(!after.wipe?.visible,'cut-in removes itself without delaying ready state');assert.equal(after.phase,'ready');verifyFloatingControls(after,false);
  report.cases.push({expected,entry,middle,shown,rerender:{startCount:before,after:repeated.presentation.startCount,indexes:stable},done,closed,cutin,after});
 }
 // First rendering after a hidden/native advance must be immediately readable.
 // No animation wait precedes the assertions: the firstRender evidence above
 // comes from the very call that created this token's result DOM.
 for(const firstPhase of ['paying','complete']){
  const expected=await present([0,6,9],{width:844,height:390,firstPhase}),first=expected.firstRender;
  assert.equal(first.alreadyRendered,false,'late-phase case starts before this result token has a DOM');
  assert.equal(first.beforePaint.phase,firstPhase);assert.deepEqual(first.afterPaint,first.beforePaint,'first result paint cannot alter native phase, clocks, payout or CREDIT');
  assert.equal(first.beforePaint.result.duration,1800);assert.equal(first.beforePaint.credit,expected.before.credit+expected.total);
  assert.equal(first.beforePaint.acceptedBeginCount,expected.before.acceptedBeginCount+1);assert.equal(first.beforePaint.payout.elapsed,firstPhase==='paying'?0:first.beforePaint.payout.duration);
  assert.equal(first.presentation.active,true);assert.equal(first.presentation.phase,'hold','late native phases skip the already-elapsed visual entrance immediately');assert.equal(first.presentation.elapsed,1310);assert.equal(first.layerHidden,false);
  assert.equal(first.total.text,String(expected.total));assert.equal(first.total.opacity,1,'TOTAL is fully visible on the first synchronous paint');
  assert.deepEqual(first.rows.map(row=>row.index),expected.indexes);for(const row of first.rows){assert.equal(row.opacity,1);assert.equal(row.text,String(expected.values[row.index]));}
  assert.ok(first.floatingControls.every(control=>control.visibility==='hidden'));
  const done=await complete(expected),closed=await closeNative();await sleep(810);const after=await observe();
  assert.equal(done.payoutDuration,first.beforePaint.payout.duration,'native payout duration is preserved through completion');assert.equal(after.credit,done.credit);assert.equal(after.phase,'ready');assert.ok(!after.wipe?.visible);verifyFloatingControls(after,false);
  report.latePhases.push({expected,first,done,closed,after});
 }
 // Menu and hidden-document events stop only the presentation clock. Native
 // state remains authoritative, and a hidden close must not queue a late wipe.
 await touch.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
 const pausedExpected=await present([0,6,9],{width:390,height:844});
 await page.waitForFunction(()=>window.SweetsResultsV253.describe().elapsed>=280,null,{timeout:2000});
 await page.locator('#open-record-menu').click();await page.waitForFunction(()=>document.body.classList.contains('player-menu-open'));
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const menuStart=await observe();await sleep(420);const menuEnd=await observe();
 assert.equal(menuEnd.presentation.paused,true);assert.equal(menuEnd.presentation.elapsed,menuStart.presentation.elapsed,'menu stops result entrance clock');
 await page.locator('#record-close-top').click();await page.waitForFunction(()=>!document.body.classList.contains('player-menu-open'));
 await page.waitForFunction(at=>window.SweetsResultsV253.describe().elapsed>at,menuStart.presentation.elapsed,{timeout:2000});
 const resumed=await observe();assert.equal(resumed.presentation.startCount,menuStart.presentation.startCount,'closing menu resumes the existing entrance');
 await page.evaluate(()=>{window.__resultHidden253=Object.getOwnPropertyDescriptor(document,'hidden');Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
 await sleep(60);const hiddenStart=await observe();await sleep(300);const hiddenEnd=await observe();
 assert.equal(hiddenEnd.presentation.paused,true);assert.equal(hiddenEnd.presentation.elapsed,hiddenStart.presentation.elapsed,'hidden document stops presentation time');
 await page.evaluate(()=>{const a=window.__qa250.app;a.advanceResult(2500);if(a.phase==='paying')a.advancePayout(a.payout.duration+1);});
 const hiddenPaid=await observe();assert.equal(hiddenPaid.credit,pausedExpected.before.credit+pausedExpected.total);
 await closeNative({direct:true});await sleep(80);const hiddenClosed=await observe();assert.ok(!hiddenClosed.wipe?.visible,'hidden controller cleanup skips the outgoing cut-in');
 await page.evaluate(()=>{const descriptor=window.__resultHidden253;if(descriptor)Object.defineProperty(document,'hidden',descriptor);else delete document.hidden;delete window.__resultHidden253;document.dispatchEvent(new Event('visibilitychange'));});
 await sleep(120);const returned=await observe();assert.equal(returned.layerHidden,true);assert.ok(!returned.wipe?.visible,'returning to the tab does not replay an old cut-in');
 report.lifecycle={expected:pausedExpected,menuStart,menuEnd,resumed,hiddenStart,hiddenEnd,hiddenPaid,hiddenClosed,returned};
 // Even the shortest normal-motion result exposes every zero-WIN row and its
 // total before the native 1.8s result phase can finish.
 const zeroExpected=await present([0,6,9],{zero:true,sugar:[],width:390,height:844});
 await page.waitForFunction(()=>window.SweetsResultsV253.describe().phase==='hold',null,{timeout:2500});
 const zeroShown=await observe();verifyRows(zeroShown,zeroExpected);assert.equal(zeroShown.phase,'result','normal zero-WIN total is visible before the shortest native completion');
 await page.screenshot({path:output+'/results-zero-normal-390.png'});
 const normalZeroDone=await complete(zeroExpected);assert.equal(normalZeroDone.payoutDuration,null);assert.equal(normalZeroDone.credit,zeroExpected.before.credit);
 await closeNative();await sleep(810);report.zero={expected:zeroExpected,shown:zeroShown,done:normalZeroDone};
 // A zero-WIN round reaches native complete at 1.8s. Reduced motion must show
 // its rows and TOTAL immediately, and must not pay or animate an exit.
 await page.emulateMedia({reducedMotion:'reduce'});
 const reducedExpected=await present([0,6,9],{zero:true,sugar:[],width:844,height:390});
 const reduced=await observe();assert.equal(reduced.presentation.reducedMotion,true);verifyRows(reduced,reducedExpected);assert.equal(reduced.total.text,'0');
 await page.screenshot({path:output+'/results-zero-reduced-844.png'});
 const zeroDone=await complete(reducedExpected);assert.equal(zeroDone.payoutDuration,null);assert.equal(zeroDone.credit,reducedExpected.before.credit);
 await closeNative();await sleep(100);const zeroClosed=await observe();assert.ok(!zeroClosed.wipe?.visible,'reduced motion omits outgoing wipe');
 report.reduced={expected:reducedExpected,shown:reduced,done:zeroDone,closed:zeroClosed};
 const starts=report.cases.map(item=>item.entry.presentation.startCount);assert.ok(starts.every((count,index)=>!index||count>starts[index-1]),'new native tokens replay the entrance once');
 assert.deepEqual(errors,[]);report.pageErrors=errors;
 await fs.writeFile(output+'/result.json',JSON.stringify(report,null,2)+'\n');
 console.log('RESULTS_V253_BROWSER_PASS',JSON.stringify({viewports:report.cases.length,gameCounts:report.cases.map(item=>item.expected.indexes.length),nativeDuration:1800,exactPayout:true,sameTokenNoReplay:true,nextTokenReplay:true,floatingControlsRestore:true,immediateLatePhases:report.latePhases.map(item=>item.first.requestedPhase),menuPause:true,hiddenCleanup:true,reducedMotion:true,zeroWin:true,errors}));
}catch(error){
 report.failure={message:String(error),stack:error.stack,errors,warnings:fixture.warnings};
 try{report.failure.current=await observe();await page.screenshot({path:output+'/failure.png'});}catch(captureError){report.failure.captureError=String(captureError);}
 await fs.writeFile(output+'/partial-result.json',JSON.stringify(report,null,2)+'\n');await fs.writeFile(output+'/failure-server.log',fixture.logs.slice(-16000));
 console.error('RESULTS_V253_BROWSER_FAIL',error,JSON.stringify(errors),fixture.logs.slice(-2500));throw error;
}finally{await fixture.close();}

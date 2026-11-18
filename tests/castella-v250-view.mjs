/* The real 61-hole renderer, gauges and host receive real isolated-server balls.
   The test transport chooses its own visible numbers; no public API is used. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createUiFixture,sleep} from './ui-v250-fixture.mjs';

const out='qa-castella-v250';
const fixture=await createUiFixture({startRound:true,output:out});
const {page,context,call,host,round,errors}=fixture;
const report={version:fixture.version,screens:[],balls:[],sugar:null,legacy:null};
try{
 await page.evaluate(()=>window.__qa250.select(window.__qa250.app.engines.findIndex(e=>e.kind==='castella')));
 await page.waitForFunction(()=>document.querySelector('.pct-scene')?.dataset.holes==='61');
 await page.evaluate(()=>{window.SweetsSharedControllerV224.setAutoRebet(false);window.__castella250BeforeBank=window.__qa250.app.wonderBank.filter(t=>t.game===window.__qa250.app.engines.findIndex(e=>e.kind==='castella')).length;});
 const touch=await context.newCDPSession(page);
 for(const [width,height]of [[1366,900],[390,844]]){
  await touch.send('Emulation.setTouchEmulationEnabled',{enabled:width<500,maxTouchPoints:width<500?5:1});
  await page.setViewportSize({width,height});await sleep(250);
  const data=await page.evaluate(()=>{
   const e=window.PartyCastella.engine,s=e.state,root=document.querySelector('.pct-scene'),pan=root.querySelector('.pct-pan'),canvas=pan.querySelector('canvas');
   const rect=node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
   const bounds=rect(pan),g=window.PartyCastellaView.geometry(s),unit=Math.min(bounds.width/g.panW,bounds.height/g.panH);
   const centers=s.cells.map(c=>({x:bounds.width/2+c.x*unit,y:bounds.height/2+c.y*unit,r:unit*.405}));
   return {holes:s.cells.length,edges:s.edges.length,stage:root.dataset.stage,bounds,canvas:rect(canvas),centers,gauges:[...root.querySelectorAll('.pct-gauge')].map(n=>({label:n.getAttribute('aria-label'),value:Number(n.getAttribute('aria-valuenow')),bars:n.children.length,filled:n.querySelectorAll('.filled').length,bounds:rect(n)})),markers:{pour:s.specials.pour.length,fire:s.specials.fire.length,sugar:s.specials.sugar.length,odds:s.specials.odds.length},text:root.textContent,payoutRows:[...root.querySelectorAll('tbody tr')].map(r=>({count:Number(r.dataset.count),amount:r.querySelector('.pct-win-value')?.textContent})),canvasLabel:canvas.getAttribute('aria-label')};
  });
  assert.equal(data.holes,61);assert.equal(data.edges,84);assert.equal(data.stage,'pour');
  assert.deepEqual(data.markers,{pour:2,fire:2,sugar:1,odds:0});
  assert.equal(data.gauges.length,2);assert.deepEqual(data.gauges.map(g=>g.label),['注入力','火力']);
  for(const g of data.gauges){assert.equal(g.bars,3);assert.equal(g.filled,g.value);assert.ok(g.bounds.width>12&&g.bounds.height>=4);}
  assert.ok(!/ODDS|はちみつ/.test(data.text),'new board has no retired odds controls');
  assert.ok(data.payoutRows.length>=10&&data.payoutRows.length<=20,'readable threshold payout rows');assert.equal(data.payoutRows[0].count,61);
  assert.match(data.canvasLabel,/61個/);assert.ok(data.bounds.width>150&&data.bounds.height>100);
  for(const c of data.centers)assert.ok(c.x-c.r>=0&&c.x+c.r<=data.bounds.width&&c.y-c.r>=0&&c.y+c.r<=data.bounds.height,'all 61 holes fit the real canvas');
  const file=`castella-initial-${width}.png`;await page.screenshot({path:out+'/'+file});report.screens.push({width,height,file,data});
 }
 await page.setViewportSize({width:1366,height:900});await touch.send('Emulation.setTouchEmulationEnabled',{enabled:false,maxTouchPoints:1});
 // Pick two actual numbered power-ups, then visible candidates that wet the
 // sugar hole and both heat switches. This is a deterministic test sequence.
 const plan=await page.evaluate(()=>{
  const R=window.PartyCastellaRules,start=window.PartyCastella.engine.state;
  const first=start.specials.pour.map(id=>start.cells[id].number),prefix=first.reduce((s,n)=>R.draw(s,n),start);
  const candidates=Array.from({length:25},(_,i)=>i+1).filter(n=>!first.includes(n));
  let best=null;
  for(const a of candidates){const A=R.draw(prefix,a);for(const b of candidates){if(b===a)continue;const B=R.draw(A,b);for(const c of candidates){if(c===a||c===b)continue;const C=R.draw(B,c);const score=Number(C.wet[C.specials.sugar[0]])*100000+C.fireLevel*10000+C.wetCount;if(!best||score>best.score)best={score,state:C,draws:[...first,a,b,c]};}}}
  let s=best.state,draws=best.draws;
  for(let k=0;k<3;k++){
   let pick=null;
   for(let n=1;n<=25;n++)if(!draws.includes(n)){const next=R.draw(s,n);const score=Number(next.sugarEarned)*10000+next.bakedCount;if(!pick||score>pick.score)pick={score,n,state:next};}
   draws.push(pick.n);s=pick.state;
  }
  return {draws,expectedSugar:s.sugarEarned,expectedFire:best.state.fireLevel,expectedPayout:s.totalHundredths,expectedBaked:s.bakedCount};
 });
 assert.equal(plan.expectedSugar,true,'the test sequence reaches the marked sugar hole');
 for(let index=0;index<plan.draws.length;index++){
  const number=plan.draws[index];
  await call('/api/machines/public-01/round/ball',{session:host,body:{roundId:round.id,ballIndex:index+1,number,eventId:round.id+':castella250:'+(index+1)}});
  await page.waitForFunction(count=>window.PartyCastella.engine.processed===count,index+1,{timeout:15000});
  await sleep(1550);
  const observed=await page.evaluate(()=>{
   const e=window.PartyCastella.engine,s=e.state,r=document.querySelector('.pct-scene');
   return {processed:e.processed,phase:s.phase,pour:s.pourLevel,lastPour:s.lastPourLevel,fire:s.fireLevel,fireTriggers:s.fireTriggered.length,pourTriggers:s.pourTriggered.length,wet:s.wetCount,baked:s.bakedCount,sugarEarned:s.sugarEarned,collected:e.wonderCollected,roundSteps:e.roundSteps,bank:window.__qa250.app.wonderBank.filter(t=>t.game===window.__qa250.app.engines.indexOf(e)).length-window.__castella250BeforeBank,gauges:[...r.querySelectorAll('.pct-gauge')].map(n=>Number(n.getAttribute('aria-valuenow'))),currentRows:[...r.querySelectorAll('tbody tr.current')].map(n=>Number(n.dataset.count)),total:s.totalHundredths};
  });
  assert.equal(observed.processed,index+1);assert.deepEqual(observed.gauges,[observed.pour,observed.fire]);
  if(index===0){assert.equal(observed.lastPour,1);assert.equal(observed.pour,2);}
  if(index===1){assert.equal(observed.lastPour,2);assert.equal(observed.pour,3);}
  if(index<5){assert.equal(observed.collected,false);assert.equal(observed.bank,0,'merely pouring onto Sugar does not award it');}
  assert.ok(observed.bank<=1,'Sugar is awarded once across several baking balls');
  if(observed.sugarEarned){assert.equal(observed.collected,true);assert.equal(observed.bank,1);assert.equal(observed.roundSteps,1);}
  if(index===4){assert.equal(observed.fire,plan.expectedFire);await page.screenshot({path:out+'/castella-levels-and-bake.png'});}
  report.balls.push(observed);
 }
 const last=report.balls.at(-1);assert.equal(last.total,plan.expectedPayout);assert.equal(last.baked,plan.expectedBaked);assert.equal(last.bank,1);report.sugar={oneAward:true,bakedHoleRequired:true,expected:plan.expectedSugar};
 await page.screenshot({path:out+'/castella-baked-sugar.png'});
 report.legacy=await page.evaluate(()=>{
  const R=window.PartyCastellaRules,legacy=R.legacy.create({rng:()=>.38,target:90});
  const canvas=document.createElement('canvas');canvas.width=490;canvas.height=390;
  window.PartyCastellaView.drawMini(canvas.getContext('2d'),legacy,{age:Infinity,time:0,reach:[]});
  const geometry=window.PartyCastellaView.geometry(legacy),pixels=canvas.getContext('2d').getImageData(0,0,490,390).data;
  let painted=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i])painted++;
  return {holes:legacy.cells.length,geometry,painted,corners:[pixels[3],pixels[(489)*4+3],pixels[(490*389)*4+3],pixels[(490*390-1)*4+3]],rows:R.payRowsFor(legacy).length};
 });
 assert.equal(report.legacy.holes,37);assert.equal(report.legacy.geometry.radius,3);assert.ok(report.legacy.painted>1000);assert.deepEqual(report.legacy.corners,[0,0,0,0],'mini griddle adds no background rectangle');
 assert.equal(errors.length,0,JSON.stringify(errors));report.pageErrors=errors;
 await fs.writeFile(out+'/result.json',JSON.stringify(report,null,2)+'\n');
 console.log('CASTELLA_V250_VIEW_PASS',JSON.stringify({screens:report.screens.length,balls:report.balls.length,sugar:report.sugar,legacy:report.legacy,pageErrors:errors}));
}catch(error){
 try{await page.screenshot({path:out+'/failure.png'});}catch{}
 console.error('CASTELLA_V250_VIEW_FAIL',error,JSON.stringify(errors),fixture.logs.slice(-4000));throw error;
}finally{await fixture.close();}

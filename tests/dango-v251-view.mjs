/* Real isolated-server round: BET lock, mobile hit targets, FREE placement,
   server thinking deadline, later odds and bamboo on all nineteen directions. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createUiFixture,sleep,until} from './ui-v250-fixture.mjs';

const out='qa-dango-v251',fixture=await createUiFixture({startRound:false,output:out});
const {page,context,call,host,errors}=fixture;
const report={version:fixture.version,ready:null,screens:[],balls:[],placement:null,mini:null};
let round;
async function snapshot(){
 return page.evaluate(()=>{
  const e=window.DangoBingo.engine,s=e.state,a=window.__qa250.app,id=a.engines.indexOf(e);
  return {phase:s.phase,draws:s.draws.slice(),processed:e.processed,initial:s.initialFreeCells.slice(),manual:s.manualFreeCells.slice(),budget:s.freeBudget,remaining:s.freeRemaining,bonusHits:s.bonusHits.slice(),oddsHits:s.oddsHits.slice(),multiplier:s.oddsMultiplier,lines:s.completedLines.slice(),counts:s.lineCounts,total:s.totalHundredths,engineTotal:e.totalHundredths,paid:a.paid[id],win:a.roundWins[id],sugar:e.wonderCollected,sugarCount:a.wonderBank.filter(t=>t.game===id).length,thinking:window.SweetsDangoThinkingV251.state()};
 });
}
async function send(number){
 const index=report.balls.length+1;
 await call('/api/machines/public-01/round/ball',{session:host,body:{roundId:round.id,ballIndex:index,number,eventId:round.id+':dango251:'+index}});
 await page.waitForFunction(count=>window.DangoBingo.engine.processed===count,index,{timeout:20000});
 const observed=await snapshot();report.balls.push(observed);return observed;
}
try{
 await page.waitForFunction(()=>window.DangoBingo?.engine&&window.SweetsDangoThinkingV251);
 await page.evaluate(()=>window.__qa250.select(window.__qa250.app.engines.findIndex(e=>e.kind==='dango')));
 report.ready=await page.evaluate(()=>{const e=window.DangoBingo.engine;return {live:e.liveBoard,draws:e.state.draws,numbers:e.state.numbers,initial:e.state.initialFreeCells,phase:window.__qa250.app.phase};});
 assert.equal(report.ready.phase,'ready');assert.equal(report.ready.live,false,'BET time only exposes a separate fixed demonstration');
 assert.deepEqual(report.ready.numbers,Array.from({length:25},(_,i)=>i+1));assert.deepEqual(report.ready.initial,[]);
 await sleep(1200);
 await call('/api/admin/machines/public-01/host/register',{session:host,body:{},adminOnly:true});
 round=await until(async()=>{const s=await call('/api/machines/public-01/state',{session:host});return s.round?.phase==='PLAYING'?s.round:null;},'Dango real round starts');
 await page.waitForFunction(id=>window.SweetsSharedMachine.active?.roundId===id&&window.__qa250.app.phase==='playing'&&window.DangoBingo.engine.liveBoard,round.id,{timeout:30000});
 await page.waitForFunction(()=>window.__qa250.app.engines.every(e=>!e.opening&&!e.busy&&!(e.queue?.length)),null,{timeout:30000});
 await page.evaluate(()=>window.SweetsSharedControllerV224.setAutoRebet(false));
 await sleep(Math.max(0,Number(round.drawStartsAt)-Date.now()+20));
 const touch=await context.newCDPSession(page);
 for(const [width,height]of [[1366,900],[390,844]]){
  await touch.send('Emulation.setTouchEmulationEnabled',{enabled:width<500,maxTouchPoints:width<500?5:1});
  await page.setViewportSize({width,height});await sleep(220);
  const data=await page.evaluate(()=>{
   const s=window.DangoBingo.engine.state,root=document.querySelector('.dgb-scene'),pan=root.querySelector('.dgb-pan'),canvas=pan.querySelector('canvas'),b=pan.getBoundingClientRect(),g=window.DangoBingoView.geometry(b.width,b.height);
   const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let painted=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i])painted++;
   return {cells:s.cells.length,rows:[0,1,2,3,4].map(row=>s.cells.filter(c=>c.row===row).length),numbers:s.numbers,initial:s.initialFreeCells,phase:root.dataset.phase,painted,bounds:{x:b.x,y:b.y,width:b.width,height:b.height},geometry:g,payRows:[...root.querySelectorAll('tbody tr')].map(row=>({length:Number(row.dataset.length),count:Number(row.dataset.count),label:row.querySelector('th').textContent,win:row.querySelector('td').textContent})),label:canvas.getAttribute('aria-label')};
  });
  assert.equal(data.cells,25);assert.deepEqual(data.rows,[1,3,5,7,9]);assert.equal(new Set(data.numbers).size,25);assert.equal(data.payRows.length,13);assert.ok(data.painted>1000);
  assert.equal(data.payRows.filter(r=>r.label.includes('以上')).length,3);assert.match(data.label,/25個のお団子/);
  assert.ok(data.bounds.width>180&&data.bounds.height>100);
  for(const p of data.geometry.centers){const r=data.geometry.radius;assert.ok(p.x-r>=0&&p.x+r<=data.bounds.width&&p.y-r>=0&&p.y+r<=data.bounds.height,'all 25 round dango fit the canvas');}
  const file='dango-initial-'+width+'.png';await page.screenshot({path:out+'/'+file});report.screens.push({width,height,file,data});
 }
 const plan=await page.evaluate(()=>{
  const s=window.DangoBingo.engine.state,free=3,draws=s.initialFreeCells.map(id=>s.numbers[id]);
  for(const id of [1,2,...Array.from({length:25},(_,i)=>i)]){const n=s.numbers[id];if(id!==free&&!draws.includes(n)&&draws.length<5)draws.push(n);}
  return {first:draws,cell:free,number:s.numbers[free],initial:s.initialFreeCells.length};
 });
 for(const n of plan.first)await send(n);
 await page.waitForFunction(()=>window.DangoBingo.engine.state.phase==='placing'&&!document.querySelector('.dgb-cell[data-cell-id="3"]').disabled,null,{timeout:10000});
 let observed=await snapshot();assert.equal(observed.budget,1+plan.initial);assert.equal(observed.multiplier,1,'initial FREE hits only grant placements');
 const placementGeometry=await page.evaluate(()=>{
  const p=document.querySelector('.dgb-pan'),b=p.getBoundingClientRect(),g=window.DangoBingoView.geometry(b.width,b.height),s=window.DangoBingo.engine.state;
  const centers=s.cells.map(cell=>{const box=document.querySelector('.dgb-cell[data-cell-id="'+cell.id+'"]').getBoundingClientRect(),point=g.centers[cell.id];return {id:cell.id,dx:Math.abs(box.x+box.width/2-b.x-point.x),dy:Math.abs(box.y+box.height/2-b.y-point.y)};});
  return {centers,tap:{x:b.x+g.centers[3].x,y:b.y+g.centers[3].y},thinking:window.SweetsDangoThinkingV251.state()};
 });
 for(const p of placementGeometry.centers)assert.ok(p.dx<1.6&&p.dy<1.6,'scaled mobile button centers match the actual dango '+p.id);
 await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[placementGeometry.tap]});await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await page.waitForFunction(()=>window.DangoBingo.engine.state.manualFreeCells.includes(3));
 await page.locator('.dgb-actions [data-action="undo"]').click();
 assert.equal((await snapshot()).manual.length,0);
 const chosen=page.locator('.dgb-cell[data-cell-id="3"]');await chosen.focus();await chosen.press('Enter');
 await page.waitForFunction(()=>window.DangoBingo.engine.state.manualFreeCells.includes(3));
 if((await snapshot()).remaining)await page.locator('.dgb-actions [data-action="auto"]').click();
 observed=await snapshot();assert.equal(observed.remaining,0);assert.equal(observed.multiplier,1,'placing red FREE alone never raises odds');
 assert.ok(observed.lines.includes(0),'placing a FREE can complete the three-cell horizontal skewer');
 await page.screenshot({path:out+'/dango-placement-390.png'});
 await page.locator('.dgb-actions [data-action="confirm"]').click();
 await page.waitForFunction(()=>window.DangoBingo.engine.state.freeCommitted);
 await page.evaluate(()=>window.SweetsDangoThinkingV251.checkpointPlacement());
 report.placement={plan,geometry:placementGeometry,state:await snapshot()};
 const finalPlan=await page.evaluate(()=>{
  const R=window.DangoBingoRules;let s=window.DangoBingo.engine.state;const draws=[];
  for(const id of s.manualFreeCells.slice(0,3)){const n=s.numbers[id];draws.push(n);s=R.draw(s,n);}
  while(draws.length<3){let best=null;for(let n=1;n<=25;n++)if(!s.draws.includes(n)){const next=R.draw(s,n);if(!best||next.totalHundredths>best.state.totalHundredths)best={n,state:next};}draws.push(best.n);s=best.state;}
  return {draws,expectedTotal:s.totalHundredths,expectedMultiplier:s.oddsMultiplier,expectedLines:s.completedLines,manual:s.manualFreeCells};
 });
 await touch.send('Emulation.setTouchEmulationEnabled',{enabled:false,maxTouchPoints:1});await page.setViewportSize({width:1366,height:900});
 for(const number of finalPlan.draws)await send(number);
 await page.waitForFunction(()=>{const a=window.__qa250.app,id=a.engines.findIndex(e=>e.kind==='dango');return a.paid[id]===true;},null,{timeout:20000});
 const final=await snapshot();report.final=final;report.finalPlan=finalPlan;
 assert.equal(final.total,finalPlan.expectedTotal);assert.equal(final.engineTotal,final.total);assert.equal(final.multiplier,finalPlan.expectedMultiplier);assert.deepEqual(final.lines,finalPlan.expectedLines);
 assert.equal(final.sugar,false);assert.equal(final.sugarCount,0,'Dango has no invented Sugar award');
 assert.ok(final.oddsHits.length>=1);assert.equal(final.phase,'done');
 const paidAgain=await page.evaluate(()=>{const e=window.DangoBingo.engine,a=window.__qa250.app,id=a.engines.indexOf(e),win=a.roundWins[id];e.enqueueBatch([e.state.draws[7]]);const restored=e.afterCheckpointRestoreV247();return {sameWin:a.roundWins[id]===win,restored,processed:e.processed};});
 assert.equal(paidAgain.sameWin,true);assert.equal(paidAgain.restored,false);assert.equal(paidAgain.processed,8);
 await page.screenshot({path:out+'/dango-skewers-and-gold-1366.png'});
 report.mini=await page.evaluate(()=>{
  const R=window.DangoBingoRules,V=window.DangoBingoView,canvas=document.createElement('canvas');canvas.width=600;canvas.height=400;const c=canvas.getContext('2d'),g=V.geometry(600,400),numbers=Array.from({length:25},(_,i)=>i+1);
  const base=R.create({moldIndex:0,numbers}),skewers=[];
  for(const line of R.lines){
   const state={...base,completedLines:[line.id],newLines:[],cells:base.cells.map(cell=>({...cell,marked:line.cells.includes(cell.id)}))};V.drawMini(c,state,{age:Infinity,time:0});
   const a=g.centers[line.cells[0]],b=g.centers[line.cells.at(-1)],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),x=Math.round(a.x-dx/d*g.unit*.58),y=Math.round(a.y-dy/d*g.unit*.58),pixel=[...c.getImageData(x,y,1,1).data];
   skewers.push({id:line.id,axis:line.axis,length:line.length,pixel});
  }
  let s=R.create({moldIndex:1,initialFreeCells:[20],numbers});for(const n of [2,3,5,12,21])s=R.draw(s,n);for(const id of [3,8])s=R.placeFree(s,id);s=R.commitFree(s);s=R.draw(s,4);V.drawMini(c,s,{age:Infinity,time:0});
  const sample=(id,rx,ry)=>{const p=g.centers[id];return [...c.getImageData(Math.round(p.x+g.radius*rx),Math.round(p.y+g.radius*ry),1,1).data];};
  const pixels=c.getImageData(0,0,600,400).data;let painted=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i])painted++;
  return {skewers,painted,corners:[pixels[3],pixels[599*4+3],pixels[600*399*4+3],pixels[(600*400-1)*4+3]],gold:sample(3,1.075,0),red:sample(3,.72,.18),green:sample(20,.72,.18),white:sample(24,.72,.18),odds:s.oddsMultiplier};
 });
 assert.equal(report.mini.skewers.length,19);assert.equal(new Set(report.mini.skewers.map(x=>x.axis)).size,4);
 for(const line of report.mini.skewers)assert.ok(line.pixel[3]>100,'wooden skewer extends through line '+line.id);
 assert.ok(report.mini.painted>1000);assert.deepEqual(report.mini.corners,[0,0,0,0],'mini board preserves the existing tab background');
 const {gold,red,green,white}=report.mini;assert.ok(gold[0]>150&&gold[1]>100&&gold[2]<120,'odds hit adds a gold rim');assert.ok(red[0]>red[1]*1.2,'player FREE stays red');assert.ok(green[1]>green[0],'initial FREE stays green');assert.ok(Math.abs(white[0]-white[1])<28,'ordinary dango is white');
 assert.equal(errors.length,0,JSON.stringify(errors));report.pageErrors=errors;
 await fs.writeFile(out+'/result.json',JSON.stringify(report,null,2)+'\n');
 console.log('DANGO_V251_VIEW_PASS',JSON.stringify({screens:report.screens.length,balls:report.balls.length,manual:final.manual,multiplier:final.multiplier,skewers:report.mini.skewers.length,errors}));
}catch(error){
 report.failure={message:String(error),stack:error.stack,errors,warnings:fixture.warnings};
 try{report.failure.state=await snapshot();await page.screenshot({path:out+'/failure.png'});}catch(captureError){report.failure.captureError=String(captureError);}
 await fs.writeFile(out+'/partial-result.json',JSON.stringify(report,null,2)+'\n');await fs.writeFile(out+'/failure-server.log',fixture.logs.slice(-20000));
 console.error('DANGO_V251_VIEW_FAIL',error,JSON.stringify(errors),fixture.logs.slice(-4000));throw error;
}finally{await fixture.close();}

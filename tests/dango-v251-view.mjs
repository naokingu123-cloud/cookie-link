/* Real isolated-server round: BET lock, mobile hit targets, FREE placement,
   server thinking deadline, raster dango and bamboo on all nineteen lines. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createUiFixture,sleep,until} from './ui-v250-fixture.mjs';

const out='qa-dango-v251',fixture=await createUiFixture({startRound:false,output:out});
const {page,context,call,host,errors}=fixture;
const report={version:fixture.version,ready:null,art:null,screens:[],balls:[],placement:null,mini:null};
let round;
function assertPayoutContained(bounds){
 const panel=bounds.panel,tolerance=1;
 assert.ok(panel.width>0&&panel.height>0,'the payout panel has a visible area');
 assert.equal(bounds.rows.length,6,'the payout matrix contains its header and all five payout rows');
 assert.equal(bounds.rows.flatMap(row=>row.cells).length,30,'the payout matrix exposes every header and data cell');
 const contained=(rect,label)=>{
  assert.ok(rect.width>0&&rect.height>0,label+' has a visible area');
  assert.ok(rect.left>=panel.left-tolerance&&rect.top>=panel.top-tolerance&&rect.right<=panel.right+tolerance&&rect.bottom<=panel.bottom+tolerance,label+' is fully within .dgb-pay: '+JSON.stringify({rect,panel}));
 };
 for(const row of bounds.rows){
  const label='payout '+(row.length===null?'header':row.length+'-cell line')+' row';contained(row.rect,label);
  for(const cell of row.cells)contained(cell.rect,label+' column '+cell.column);
 }
}
async function snapshot(){
 return page.evaluate(()=>{
  const e=window.DangoBingo.engine,s=e.state,a=window.__qa250.app,id=a.engines.indexOf(e);
  return {phase:s.phase,draws:s.draws.slice(),processed:e.processed,initial:s.initialFreeCells.slice(),manual:s.manualFreeCells.slice(),budget:s.freeBudget,remaining:s.freeRemaining,committed:!!s.freeCommitted,bonusHits:s.bonusHits.slice(),oddsHits:s.oddsHits.slice(),multiplier:s.oddsMultiplier,lines:s.completedLines.slice(),counts:s.lineCounts,total:s.totalHundredths,engineTotal:e.totalHundredths,paid:a.paid[id],win:a.roundWins[id],sugar:e.wonderCollected,sugarCount:a.wonderBank.filter(t=>t.game===id).length,thinking:window.SweetsDangoThinkingV251.state()};
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
 report.art=await page.evaluate(async()=>{
  const V=window.DangoBingoView;await V.assetsReady;
  const cssAssets=await Promise.all(['scene','panel-frame'].map(async name=>{const image=new Image();image.src='assets/dango-art-v252/'+name+'.webp';await image.decode();return {name,url:image.src,width:image.naturalWidth,height:image.naturalHeight};}));
  const native=CanvasRenderingContext2D.prototype.drawImage,calls={main:{},mini:{},other:{}};
  CanvasRenderingContext2D.prototype.drawImage=function(image,...args){
   const source=image?.currentSrc||image?.src||'';
   if(source.includes('/dango-art-v252/')){const key=source.split('/').at(-1).split('?')[0],kind=this.canvas.closest?.('.dgb-pan')?'main':this.canvas.closest?.('.tab-slot[data-game-kind="dango"]')?'mini':'other';calls[kind][key]=(calls[kind][key]||0)+1;}
   return native.call(this,image,...args);
  };
  window.__dangoRasterProbe={calls,restore:()=>{CanvasRenderingContext2D.prototype.drawImage=native;}};
  return {sprites:V.describeAssets(),cssAssets};
 });
 assert.equal(report.art.sprites.revision,252);assert.equal(report.art.sprites.ready,true);assert.deepEqual(report.art.sprites.failed,[]);
 assert.deepEqual(report.art.sprites.images.map(image=>image.key).sort(),['gold','green','red','skewer','white']);
 for(const image of report.art.sprites.images){assert.equal(image.loaded,true);assert.ok(image.width>=64&&image.height>=16,'decoded raster '+image.key);assert.ok(image.url.includes('/dango-art-v252/'));}
 for(const image of report.art.cssAssets)assert.ok(image.width>=256&&image.height>=256,'generated scene/frame is decoded');
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
   const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let painted=0,clear=0;for(let i=3;i<pixels.length;i+=4){if(pixels[i])painted++;if(pixels[i]<24)clear++;}
   const backdrop=getComputedStyle(root,'::before'),surfaces=['.dgb-scene','.dgb-pan','.dgb-pay'].flatMap(selector=>['','::before','::after'].map(pseudo=>{const css=getComputedStyle(document.querySelector(selector),pseudo||null);return {selector,pseudo,background:css.backgroundImage,border:css.borderImageSource,opacity:css.opacity};}));
   const layout=['#screen>.game','#screen>.game>.field','#panels','.dgb-panel','.dgb-scene','.dgb-stage','.dgb-pan','#odds-panel'].map(selector=>{const el=document.querySelector(selector),rect=el.getBoundingClientRect(),css=getComputedStyle(el);return {selector,width:rect.width,height:rect.height,display:css.display,visibility:css.visibility,opacity:css.opacity,rows:css.gridTemplateRows};});
   const rectOf=node=>{const {x,y,width,height,top,right,bottom,left}=node.getBoundingClientRect();return {x,y,width,height,top,right,bottom,left};};
   const payoutBounds={panel:rectOf(root.querySelector('.dgb-pay')),rows:[...root.querySelectorAll('.dgb-pay tr')].map(row=>({length:Number(row.dataset.length)||null,rect:rectOf(row),cells:[...row.children].map((cell,column)=>({column,kind:cell.tagName.toLowerCase(),text:cell.textContent,rect:rectOf(cell)}))}))};
   const payRows=[...root.querySelectorAll('.dgb-pay tbody tr')].map(row=>({length:Number(row.dataset.length),label:row.querySelector('th').textContent,cells:[...row.querySelectorAll('td')].map(td=>({count:Number(td.dataset.count)||null,valid:td.dataset.valid==='true',atLeast:td.dataset.atLeast==='true',win:td.textContent,font:getComputedStyle(td.querySelector('.gold-number')||td).fontFamily}))}));
   return {cells:s.cells.length,rows:[0,1,2,3,4].map(row=>s.cells.filter(c=>c.row===row).length),numbers:s.numbers,initial:s.initialFreeCells,phase:root.dataset.phase,painted,clearFraction:clear/(pixels.length/4),backdrop:{image:backdrop.backgroundImage,opacity:Number(backdrop.opacity),display:backdrop.display},surfaces,bounds:{x:b.x,y:b.y,width:b.width,height:b.height},layout,canvasPixels:{width:canvas.width,height:canvas.height},geometry:g,payRows,payCells:payRows.flatMap(row=>row.cells.filter(cell=>cell.valid)),payoutBounds,payHeaders:[...root.querySelectorAll('.dgb-pay thead th')].map(th=>th.textContent),oddsByPay:!!root.querySelector('.dgb-pay .dgb-pay-odds .dgb-odds-value'),oddsInStatus:!!root.querySelector('.dgb-status .dgb-odds-value'),confirmButtons:root.querySelectorAll('[data-action="confirm"]').length,undoButtons:root.querySelectorAll('[data-action="undo"]').length,label:canvas.getAttribute('aria-label')};
  });
  report.currentScreen={width,height,data};
  assert.equal(data.layout.find(item=>item.selector==='#odds-panel').display,'none','legacy cookie odds must not consume a second grid row');
  assert.equal(data.cells,25);assert.deepEqual(data.rows,[1,3,5,7,9]);assert.equal(new Set(data.numbers).size,25);assert.equal(data.payRows.length,5);assert.equal(data.payCells.length,13);assert.ok(data.painted>1000);
  assert.ok(data.clearFraction>.35,'the board leaves visible gaps for its generated background');
  assert.match(data.backdrop.image,/dango-art-v252\/scene\.webp/);assert.ok(data.backdrop.opacity>=.65);assert.notEqual(data.backdrop.display,'none');
  assert.ok(data.surfaces.some(surface=>(surface.background+' '+surface.border).includes('dango-art-v252/panel-frame.webp')),'generated frame is used by the visible scene');
  assert.deepEqual(data.payRows.map(row=>row.length),[3,4,5,7,9]);assert.deepEqual(data.payHeaders,['マス数','1本','2本','3本','4本以上']);assert.equal(data.payCells.filter(cell=>cell.atLeast).length,3);
  for(const cell of data.payCells){assert.match(cell.font,/ArcadePayout/);assert.doesNotMatch(cell.win,/[,，]/,'payout numbers have no thousands separator');}
  assertPayoutContained(data.payoutBounds);
  assert.equal(data.oddsByPay,true);assert.equal(data.oddsInStatus,false);assert.equal(data.confirmButtons,0);assert.equal(data.undoButtons,0);assert.match(data.label,/25個のお団子/);
  assert.ok(data.bounds.width>180&&data.bounds.height>100);
  for(const p of data.geometry.centers){const r=data.geometry.radius;assert.ok(p.x-r>=0&&p.x+r<=data.bounds.width&&p.y-r>=0&&p.y+r<=data.bounds.height,'all 25 round dango fit the canvas');}
  const centers=data.geometry.centers,diameter=data.geometry.radius*2;assert.ok(Math.abs(centers[2].x-centers[1].x-diameter)<.01,'horizontal dango touch');assert.ok(Math.abs(centers[2].y-centers[0].y-diameter)<.01,'vertical dango touch');
  const file='dango-initial-'+width+'.png';await page.screenshot({path:out+'/'+file});report.screens.push({width,height,file,data});report.currentScreen=null;
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
 await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[placementGeometry.tap]});await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await page.waitForFunction(()=>!window.DangoBingo.engine.state.manualFreeCells.includes(3));assert.equal((await snapshot()).manual.length,0,'touching the same red dango again removes it');
 const chosen=page.locator('.dgb-cell[data-cell-id="3"]');await chosen.focus();await chosen.press('Enter');
 await page.waitForFunction(()=>window.DangoBingo.engine.state.manualFreeCells.includes(3));
 if((await snapshot()).remaining)await page.locator('.dgb-actions [data-action="auto"]').click();
 observed=await snapshot();assert.equal(observed.remaining,0);assert.equal(observed.multiplier,1,'placing red FREE alone never raises odds');
 assert.equal(await chosen.isEnabled(),true,'a placed dango remains editable when no FREE remains');
 await page.waitForFunction(text=>document.querySelector('.dgb-free-value')?.textContent===text,'あと0個',{timeout:900});
 await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[placementGeometry.tap]});await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await page.waitForFunction(()=>!window.DangoBingo.engine.state.manualFreeCells.includes(3));assert.equal((await snapshot()).remaining,1,'retouch restores one placeable FREE after all have been used');
 await page.waitForFunction(text=>document.querySelector('.dgb-free-value')?.textContent===text,'あと1個',{timeout:900});
 await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[placementGeometry.tap]});await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await page.waitForFunction(()=>window.DangoBingo.engine.state.manualFreeCells.includes(3));observed=await snapshot();assert.equal(observed.remaining,0);
 assert.ok(observed.lines.includes(0),'placing a FREE can complete the three-cell horizontal skewer');
 await page.screenshot({path:out+'/dango-placement-390.png'});
 const selected=observed.manual.slice();assert.equal(await page.locator('.dgb-actions [data-action="confirm"]').count(),0);
 await page.waitForFunction(()=>!window.SweetsDangoThinkingV251.state().active,null,{timeout:22000});
 await page.waitForFunction(()=>document.querySelector('.dgb-cell[data-cell-id="3"]').disabled,null,{timeout:2000});
 await page.waitForFunction(()=>window.DangoBingo.engine.state.freeCommitted,null,{timeout:20000});
 const committed=await snapshot();assert.deepEqual(committed.manual,selected);assert.equal(committed.phase,'draw-final');assert.equal(committed.multiplier,1);assert.equal(committed.processed,5,'FREE commits at the deadline before the sixth number is known');
 report.placement={plan,geometry:placementGeometry,retouchAtZero:true,selection:selected,state:committed};
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
  const base=R.create({moldIndex:0,numbers}),skewers=[],outsideDango=new Uint8Array(600*400);
  // Compare an otherwise identical board with/without its completed skewer.
  // Only pixels outside every dango are considered, so a shadow or number
  // cannot satisfy the test when the wooden raster is missing.
  for(let y=0;y<400;y++)for(let x=0;x<600;x++)outsideDango[y*600+x]=g.centers.every(p=>(x-p.x)**2+(y-p.y)**2>(g.radius*1.1)**2)?1:0;
  for(const line of R.lines){
   const state={...base,completedLines:[],newLines:[],cells:base.cells.map(cell=>({...cell,marked:line.cells.includes(cell.id)}))};V.drawMini(c,state,{age:Infinity,time:0});const before=c.getImageData(0,0,600,400).data;
   V.drawMini(c,{...state,completedLines:[line.id]},{age:Infinity,time:0});const after=c.getImageData(0,0,600,400).data;
   const a=g.centers[line.cells[0]],b=g.centers[line.cells.at(-1)],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),ux=dx/d,uy=dy/d;let changedOutside=0,woodOnLine=0;
   for(let y=0;y<400;y++)for(let x=0;x<600;x++){
    const i=y*600+x,k=i*4;if(!outsideDango[i]||after[k+3]<80)continue;
    const change=Math.abs(after[k]-before[k])+Math.abs(after[k+1]-before[k+1])+Math.abs(after[k+2]-before[k+2])+Math.abs(after[k+3]-before[k+3]);if(change<30)continue;
    changedOutside++;const along=(x-a.x)*ux+(y-a.y)*uy,across=Math.abs((x-a.x)*uy-(y-a.y)*ux);
    if(along>=-g.unit*.8&&along<=d+g.unit*.8&&across<g.unit*.18)woodOnLine++;
   }
   skewers.push({id:line.id,axis:line.axis,length:line.length,changedOutside,woodOnLine});
  }
  let s=R.create({moldIndex:1,initialFreeCells:[20],numbers});for(const n of [2,3,5,12,21])s=R.draw(s,n);for(const id of [3,8])s=R.placeFree(s,id);s=R.commitFree(s);s=R.draw(s,4);V.drawMini(c,s,{age:Infinity,time:0});
  const pixels=c.getImageData(0,0,600,400).data;let painted=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i])painted++;
  const region=id=>{const p=g.centers[id],counts={opaque:0,red:0,green:0,white:0,gold:0};for(let y=Math.floor(p.y-g.radius*1.12);y<=p.y+g.radius*1.12;y++)for(let x=Math.floor(p.x-g.radius*1.12);x<=p.x+g.radius*1.12;x++){
   const distance=Math.hypot(x-p.x,y-p.y);if(distance<g.radius*.32||distance>g.radius*1.12||x<0||x>=600||y<0||y>=400)continue;
   const k=(y*600+x)*4,[r,gc,b,a]=pixels.slice(k,k+4);if(a<180)continue;counts.opaque++;
   if(r>100&&r>gc*1.25&&r>b*1.08)counts.red++;
   if(gc>r*1.08&&gc>b*1.12)counts.green++;
   if(r>180&&gc>170&&b>150&&Math.abs(r-gc)<45&&Math.abs(gc-b)<50)counts.white++;
   if(r>160&&gc>100&&b<gc*.75&&r>gc*1.05)counts.gold++;
  }return counts;};
  return {skewers,painted,corners:[pixels[3],pixels[599*4+3],pixels[600*399*4+3],pixels[(600*400-1)*4+3]],gold:region(3),red:region(8),green:region(20),white:region(24),odds:s.oddsMultiplier};
 });
 assert.equal(report.mini.skewers.length,19);assert.equal(new Set(report.mini.skewers.map(x=>x.axis)).size,4);
 for(const line of report.mini.skewers){assert.ok(line.woodOnLine>8,'wooden raster appears on line '+line.id);assert.ok(line.woodOnLine>=line.changedOutside*.8,'skewer follows the correct horizontal, vertical or diagonal line '+line.id);}
 assert.ok(report.mini.painted>1000);assert.deepEqual(report.mini.corners,[0,0,0,0],'mini board preserves the existing tab background');
 const {gold,red,green,white}=report.mini;
 assert.ok(gold.gold>20&&gold.gold>red.gold*1.25,'odds-hit dango visibly gains gold leaf and rim');assert.ok(gold.red>gold.opaque*.12,'gold dango retains its red body');
 assert.ok(red.red>red.opaque*.25,'player FREE stays red');assert.ok(green.green>green.opaque*.25,'initial FREE stays green');assert.ok(white.white>white.opaque*.3,'ordinary dango is white');
 report.art.lesson=await page.evaluate(()=>{
  const canvas=Object.assign(document.createElement('canvas'),{width:520,height:240}),ctx=canvas.getContext('2d'),before=JSON.stringify(window.DangoBingo.engine.state),calls=[];
  const prototype=CanvasRenderingContext2D.prototype,original=prototype.drawImage;
  prototype.drawImage=function(image,...args){const source=image?.currentSrc||image?.src||'';if(source.includes('/dango-art-v252/'))calls.push(source.split('/').at(-1).split('?')[0]);return original.call(this,image,...args);};
  try{window.SweetsAttractLessons.dango.draw(ctx,3,.9);}finally{prototype.drawImage=original;}
  const data=ctx.getImageData(0,0,520,240).data;let painted=0;for(let i=3;i<data.length;i+=4)if(data[i]>100)painted++;
  return {calls,painted,stateUnchanged:JSON.stringify(window.DangoBingo.engine.state)===before};
 });
 assert.ok(report.art.lesson.calls.includes('dango-gold.webp'));assert.ok(report.art.lesson.calls.includes('bamboo-skewer.webp'));assert.ok(report.art.lesson.painted>1000);assert.equal(report.art.lesson.stateUnchanged,true);
 report.art.actualCanvasCalls=await page.evaluate(()=>{const probe=window.__dangoRasterProbe,copy=JSON.parse(JSON.stringify(probe.calls));probe.restore();return copy;});
 for(const kind of ['main','mini'])assert.ok(report.art.actualCanvasCalls[kind]['dango-white.webp']>0,'actual '+kind+' canvas uses the generated dango');
 assert.ok(report.art.actualCanvasCalls.main['dango-red.webp']>0);assert.ok(report.art.actualCanvasCalls.main['dango-gold.webp']>0);assert.ok(report.art.actualCanvasCalls.main['bamboo-skewer.webp']>0);
 assert.equal(errors.length,0,JSON.stringify(errors));report.pageErrors=errors;
 await fs.writeFile(out+'/result.json',JSON.stringify(report,null,2)+'\n');
 console.log('DANGO_V252_VIEW_PASS',JSON.stringify({screens:report.screens.length,balls:report.balls.length,manual:final.manual,multiplier:final.multiplier,skewers:report.mini.skewers.length,rasterAssets:report.art.sprites.images.length+report.art.cssAssets.length,errors}));
}catch(error){
 report.failure={message:String(error),stack:error.stack,errors,warnings:fixture.warnings};
 try{report.failure.state=await snapshot();await page.screenshot({path:out+'/failure.png'});}catch(captureError){report.failure.captureError=String(captureError);}
 await fs.writeFile(out+'/partial-result.json',JSON.stringify(report,null,2)+'\n');await fs.writeFile(out+'/failure-server.log',fixture.logs.slice(-20000));
 console.error('DANGO_V252_VIEW_FAIL',error,JSON.stringify(errors),fixture.logs.slice(-4000));throw error;
}finally{await fixture.close();}

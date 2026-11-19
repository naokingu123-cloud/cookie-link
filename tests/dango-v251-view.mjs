/* Real isolated-server legacy round: current BET demonstration, restored
   revision254 mobile hit targets, FREE placement, thinking deadline and all
   nineteen legacy lines. New 28-cell presentation is covered by v262-view. */
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
 assert.equal(bounds.rows.flatMap(row=>row.cells).length,23,'only five row labels, five column labels and thirteen valid values exist');
 assert.deepEqual(bounds.rows.filter(row=>row.length!==null).map(row=>row.cells.length-1),[4,4,3,1,1],'invalid payout cells are removed from the DOM');
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
  const cssAssets=await Promise.all(['scene'].map(async name=>{const image=new Image();image.src='assets/dango-art-v252/'+name+'.webp';await image.decode();return {name,url:image.src,width:image.naturalWidth,height:image.naturalHeight};}));
  const native=CanvasRenderingContext2D.prototype.drawImage,calls={main:{},mini:{},other:{}};
  CanvasRenderingContext2D.prototype.drawImage=function(image,...args){
   const source=image?.currentSrc||image?.src||'';
   if(/\/dango-art-v25[23]\//.test(source)){const key=source.split('/').at(-1).split('?')[0],kind=this.canvas.closest?.('.dgb-pan')?'main':this.canvas.closest?.('.tab-slot[data-game-kind="dango"]')?'mini':'other';calls[kind][key]=(calls[kind][key]||0)+1;}
   return native.call(this,image,...args);
  };
  window.__dangoRasterProbe={calls,restore:()=>{CanvasRenderingContext2D.prototype.drawImage=native;}};
  return {sprites:V.describeAssets(),cssAssets};
 });
 assert.equal(report.art.sprites.revision,253);assert.equal(report.art.sprites.presentationRevision,262);assert.equal(report.art.sprites.ready,true);assert.deepEqual(report.art.sprites.failed,[]);
 assert.deepEqual(report.art.sprites.images.map(image=>image.key).sort(),['green','pink','rainbow','skewer','stand','white','yellow']);
 for(const image of report.art.sprites.images){assert.equal(image.loaded,true);assert.ok(image.width>=64&&image.height>=16,'decoded raster '+image.key);assert.match(image.url,/\/dango-art-v25[23]\//); const revision=['white','skewer'].includes(image.key)?252:253;assert.ok(image.url.includes('/dango-art-v'+revision+'/')); }
 for(const image of report.art.cssAssets)assert.ok(image.width>=256&&image.height>=256,'generated scene is decoded');
 await page.evaluate(()=>window.__qa250.select(window.__qa250.app.engines.findIndex(e=>e.kind==='dango')));
 report.ready=await page.evaluate(()=>{const e=window.DangoBingo.engine;return {live:e.liveBoard,rulesRevision:e.state.rulesRevision,draws:e.state.draws,numbers:e.state.numbers,initial:e.state.initialFreeCells,phase:window.__qa250.app.phase};});
 assert.equal(report.ready.phase,'ready');assert.equal(report.ready.live,false,'BET time only exposes a separate fixed demonstration');
 assert.equal(report.ready.rulesRevision,262);assert.equal(report.ready.numbers.length,28);assert.deepEqual(report.ready.numbers.filter(n=>n>0),Array.from({length:25},(_,i)=>i+1));assert.equal(report.ready.initial.length,3,'the current fixed demonstration has three unnumbered FREE cells');
 await sleep(1200);
 await call('/api/admin/machines/public-01/host/register',{session:host,body:{},adminOnly:true});
 round=await until(async()=>{const s=await call('/api/machines/public-01/state',{session:host});return s.round?.phase==='PLAYING'?s.round:null;},'Dango real round starts');
 await page.waitForFunction(id=>window.SweetsSharedMachine.active?.roundId===id&&window.__qa250.app.phase==='playing'&&window.DangoBingo.engine.liveBoard,round.id,{timeout:30000});
 await page.waitForFunction(()=>window.__qa250.app.engines.every(e=>!e.opening&&!e.busy&&!(e.queue?.length)),null,{timeout:30000});
 // Restore an already-started legacy board through the real host hook. Do not
 // make the current constructor pretend that newly started games use 25 cells.
 report.legacyRound=await page.evaluate(()=>{
  const e=window.DangoBingo.engine,R=window.DangoBingoRules;
  e.state=R.create({rulesRevision:254,seed:254,target:90});
  const restored=e.afterCheckpointRestoreV247();
  return {restored,revision:e.state.rulesRevision,cells:e.state.cells.length};
 });
 assert.deepEqual(report.legacyRound,{restored:true,revision:254,cells:25});
 await page.evaluate(()=>window.SweetsSharedControllerV224.setAutoRebet(false));
 await sleep(Math.max(0,Number(round.drawStartsAt)-Date.now()+20));
 const touch=await context.newCDPSession(page);
 for(const [width,height]of [[320,740],[430,932],[844,390],[1366,900],[390,844]]){
  await touch.send('Emulation.setTouchEmulationEnabled',{enabled:width<900,maxTouchPoints:width<900?5:1});
  await page.setViewportSize({width,height});await sleep(220);
  const data=await page.evaluate(()=>{
   const s=window.DangoBingo.engine.state,root=document.querySelector('.dgb-scene'),pan=root.querySelector('.dgb-pan'),canvas=pan.querySelector('canvas'),b=pan.getBoundingClientRect(),g=window.DangoBingoView.geometry(b.width,b.height,{state:s});
   const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let painted=0,clear=0;for(let i=3;i<pixels.length;i+=4){if(pixels[i])painted++;if(pixels[i]<24)clear++;}
   const backdrop=getComputedStyle(root,'::before'),surfaces=['.dgb-scene','.dgb-pan','.dgb-pay'].flatMap(selector=>['','::before','::after'].map(pseudo=>{const css=getComputedStyle(document.querySelector(selector),pseudo||null);return {selector,pseudo,background:css.backgroundImage,border:css.borderImageSource,opacity:css.opacity};}));
   const layout=['#screen>.game','#screen>.game>.field','#panels','.dgb-panel','.dgb-scene','.dgb-stage','.dgb-pan','#odds-panel'].map(selector=>{const el=document.querySelector(selector),rect=el.getBoundingClientRect(),css=getComputedStyle(el);return {selector,width:rect.width,height:rect.height,display:css.display,visibility:css.visibility,opacity:css.opacity,rows:css.gridTemplateRows};});
   const rectOf=node=>{const {x,y,width,height,top,right,bottom,left}=node.getBoundingClientRect();return {x,y,width,height,top,right,bottom,left};};
   const payoutBounds={panel:rectOf(root.querySelector('.dgb-pay')),rows:[...root.querySelectorAll('.dgb-pay tr')].map(row=>({length:Number(row.dataset.length)||null,rect:rectOf(row),cells:[...row.children].map((cell,column)=>({column,kind:cell.tagName.toLowerCase(),text:cell.textContent,rect:rectOf(cell)}))}))};
   const payRows=[...root.querySelectorAll('.dgb-pay tbody tr')].map(row=>({length:Number(row.dataset.length),label:row.querySelector('th').textContent,background:getComputedStyle(row).backgroundColor,cellBackground:getComputedStyle(row.querySelector('td')).backgroundColor,cells:[...row.querySelectorAll('td')].map(td=>({count:Number(td.dataset.count)||null,valid:td.dataset.valid==='true',atLeast:td.dataset.atLeast==='true',highest:td.dataset.highestRole==='true',current:td.classList.contains('current'),getLabel:getComputedStyle(td,'::after').content,rainbowAnimation:getComputedStyle(td,'::before').animationName,win:td.textContent,font:getComputedStyle(td.querySelector('.gold-number')||td).fontFamily}))}));
   const positions={scene:rectOf(root),payout:rectOf(root.querySelector('.dgb-pay')),free:rectOf(root.querySelector('.dgb-free-stat')),oldTopText:root.querySelectorAll('.dgb-status,.dgb-phase-label,.dgb-phase-value,.dgb-pay-title').length,invalidPayoutCells:root.querySelectorAll('.dgb-pay td:not([data-valid="true"])').length};
   return {cells:s.cells.length,rows:[0,1,2,3,4].map(row=>s.cells.filter(c=>c.row===row).length),numbers:s.numbers,initial:s.initialFreeCells,phase:root.dataset.phase,painted,clearFraction:clear/(pixels.length/4),backdrop:{image:backdrop.backgroundImage,opacity:Number(backdrop.opacity),display:backdrop.display},surfaces,bounds:{x:b.x,y:b.y,width:b.width,height:b.height},layout,canvasPixels:{width:canvas.width,height:canvas.height},geometry:g,positions,payRows,payCells:payRows.flatMap(row=>row.cells.filter(cell=>cell.valid)),payoutBounds,payHeaders:[...root.querySelectorAll('.dgb-pay thead th')].map(th=>th.textContent),oddsByPay:!!root.querySelector('.dgb-pay .dgb-pay-odds .dgb-odds-value'),oddsInStatus:!!root.querySelector('.dgb-status .dgb-odds-value'),confirmButtons:root.querySelectorAll('[data-action="confirm"]').length,undoButtons:root.querySelectorAll('[data-action="undo"]').length,label:canvas.getAttribute('aria-label')};
  });
  report.currentScreen={width,height,data};
  assert.equal(data.layout.find(item=>item.selector==='#odds-panel').display,'none','legacy cookie odds must not consume a second grid row');
  assert.equal(data.cells,25);assert.ok(data.initial.length>=1&&data.initial.length<=3,'every new board has 1–3 initial FREE');assert.deepEqual(data.rows,[1,3,5,7,9]);assert.equal(new Set(data.numbers).size,25);assert.equal(data.payRows.length,5);assert.equal(data.payCells.length,13);assert.ok(data.painted>1000);
  assert.ok(data.clearFraction>.2,'the board and offering stand leave the generated background visible');
  assert.match(data.backdrop.image,/dango-art-v252\/scene\.webp/);assert.ok(data.backdrop.opacity>=.65);assert.notEqual(data.backdrop.display,'none');
  assert.deepEqual(data.payRows.map(row=>row.length),[3,4,5,7,9]);assert.deepEqual(data.payHeaders.slice(1),['1本','2本','3本','4本以上']);assert.deepEqual(data.payRows.map(row=>row.label),['3個ライン','4個ライン','5個ライン','7個ライン','9個ライン']);assert.equal(data.payCells.filter(cell=>cell.atLeast).length,3);
  for(const cell of data.payCells){assert.match(cell.font,/ArcadePayout/);assert.doesNotMatch(cell.win,/[,，]/,'payout numbers have no thousands separator');}
  assertPayoutContained(data.payoutBounds);
  assert.equal(data.positions.oldTopText,0,'old top phase and heading text is removed');assert.equal(data.positions.invalidPayoutCells,0);
  const {scene,payout,free}=data.positions,apex=data.geometry.centers[0];
  assert.ok(payout.width>=data.geometry.unit*4.36*1.22,'the payout matrix is visibly wider than v253 while the dango geometry stays intact');
  assert.deepEqual(data.payRows.flatMap(row=>row.cells.filter(cell=>cell.highest).map(cell=>[row.length,cell.count])),[[3,4],[4,3],[4,4],[5,2],[5,3],[7,1],[9,1]],'all seven highest-role award cells have rainbow frames');
  for(const row of data.payRows)for(const cell of row.cells){if(cell.highest)assert.equal(cell.rainbowAnimation,'dgb-pay-rainbow');if(cell.current)assert.match(cell.getLabel,/GET!/);}
  assert.ok(payout.left<scene.left+scene.width*.08&&payout.top<scene.top+scene.height*.1,'ragged payout sits at upper left');
  assert.ok(free.left>data.bounds.x+apex.x+data.geometry.radius*.4,'remaining FREE sits to the right of the dango apex');
  assert.ok(free.right<=scene.right+1&&free.bottom<=scene.bottom+1,'FREE counter fits the scene');
  for(const row of data.payoutBounds.rows)for(const cell of row.cells){
   const rect=cell.rect;
   for(const point of data.geometry.centers){
    const x=data.bounds.x+point.x,y=data.bounds.y+point.y,dx=x-Math.max(rect.left,Math.min(rect.right,x)),dy=y-Math.max(rect.top,Math.min(rect.bottom,y));
    assert.ok(Math.hypot(dx,dy)>=data.geometry.radius*.85,'payout cells avoid the visible dango core');
   }
  }
  for(const row of data.payRows){
   const bg=[row.cellBackground,row.background].find(color=>color&&!color.endsWith(', 0)')&&color!=='transparent'),rgb=bg?.match(/[\d.]+/g)?.slice(0,3).map(Number);
   assert.ok(rgb&&Math.max(...rgb)<110,'each payout row has a dark tinted background: '+JSON.stringify(row));
  }
  const oldRadius={390:13.116262335526315,1366:14.929841694078947}[width];
  if(oldRadius)assert.ok(data.geometry.radius>oldRadius*1.08,'main dango are visibly larger than the verified v252 layout');
  assert.equal(data.oddsByPay,true);assert.equal(data.oddsInStatus,false);assert.equal(data.confirmButtons,0);assert.equal(data.undoButtons,0);assert.match(data.label,/25個のお団子/);
  assert.ok(data.bounds.width>180&&data.bounds.height>100);
  for(const p of data.geometry.centers){const r=data.geometry.radius;assert.ok(p.x-r>=0&&p.x+r<=data.bounds.width&&p.y-r>=0&&p.y+r<=data.bounds.height,'all 25 round dango fit the canvas');}
  const centers=data.geometry.centers,diameter=data.geometry.radius*2;assert.ok(Math.abs(centers[2].x-centers[1].x-diameter)<.01,'horizontal dango touch');assert.ok(Math.abs(centers[2].y-centers[0].y-diameter)<.01,'vertical dango touch');
  const file='dango-initial-'+width+'.png';await page.screenshot({path:out+'/'+file});report.screens.push({width,height,file,data});report.currentScreen=null;
 }
 const idleBefore=await page.evaluate(()=>{const canvas=document.querySelector('.dgb-pan canvas');return {pixels:canvas.toDataURL(),state:JSON.stringify(window.DangoBingo.engine.state),processed:window.DangoBingo.engine.processed};});
 await sleep(520);
 const idleAfter=await page.evaluate(()=>{const canvas=document.querySelector('.dgb-pan canvas');return {pixels:canvas.toDataURL(),state:JSON.stringify(window.DangoBingo.engine.state),processed:window.DangoBingo.engine.processed};});
 assert.equal(idleBefore.processed,0);assert.equal(idleAfter.processed,0);assert.equal(idleAfter.state,idleBefore.state,'ambient animation never changes game rules');
 assert.notEqual(idleAfter.pixels,idleBefore.pixels,'the active host keeps drawing soft mochi motion before any hit or reach');report.idleHost={animated:true,gameStateUnchanged:true};
 const plan=await page.evaluate(()=>{
  const s=window.DangoBingo.engine.state,R=window.DangoBingoRules;
  const line=R.linesFor(s).find(line=>line.length===3&&line.cells.some(id=>!s.initialFreeCells.includes(id)));
  const free=line.cells.findLast(id=>!s.initialFreeCells.includes(id)),draws=s.initialFreeCells.map(id=>s.numbers[id]);
  for(const id of [...line.cells,...Array.from({length:25},(_,i)=>i)]){const n=s.numbers[id];if(id!==free&&!draws.includes(n)&&draws.length<5)draws.push(n);}
  return {first:draws,cell:free,number:s.numbers[free],initial:s.initialFreeCells.length,lineId:line.id};
 });
 for(const n of plan.first)await send(n);
 await page.waitForFunction(id=>window.DangoBingo.engine.state.phase==='placing'&&!document.querySelector('.dgb-cell[data-cell-id="'+id+'"]').disabled,plan.cell,{timeout:10000});
 let observed=await snapshot();assert.equal(observed.budget,1+plan.initial);assert.equal(observed.multiplier,1,'initial FREE hits only grant placements');
 const placementGeometry=await page.evaluate(cellId=>{
  const p=document.querySelector('.dgb-pan'),b=p.getBoundingClientRect(),s=window.DangoBingo.engine.state,g=window.DangoBingoView.geometry(b.width,b.height,{state:s});
  const centers=s.cells.map(cell=>{const box=document.querySelector('.dgb-cell[data-cell-id="'+cell.id+'"]').getBoundingClientRect(),point=g.centers[cell.id];return {id:cell.id,dx:Math.abs(box.x+box.width/2-b.x-point.x),dy:Math.abs(box.y+box.height/2-b.y-point.y)};});
  return {centers,tap:{x:b.x+g.centers[cellId].x,y:b.y+g.centers[cellId].y},thinking:window.SweetsDangoThinkingV251.state()};
 },plan.cell);
 for(const p of placementGeometry.centers)assert.ok(p.dx<1.6&&p.dy<1.6,'scaled mobile button centers match the actual dango '+p.id);
 await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[placementGeometry.tap]});await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await page.waitForFunction(id=>window.DangoBingo.engine.state.manualFreeCells.includes(id),plan.cell);
 await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[placementGeometry.tap]});await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await page.waitForFunction(id=>!window.DangoBingo.engine.state.manualFreeCells.includes(id),plan.cell);assert.equal((await snapshot()).manual.length,0,'touching the same yellow dango again removes it');
 const chosen=page.locator('.dgb-cell[data-cell-id="'+plan.cell+'"]');await chosen.focus();await chosen.press('Enter');
 await page.waitForFunction(id=>window.DangoBingo.engine.state.manualFreeCells.includes(id),plan.cell);
 if((await snapshot()).remaining)await page.locator('.dgb-actions [data-action="auto"]').click();
 observed=await snapshot();assert.equal(observed.remaining,0);assert.equal(observed.multiplier,1,'placing yellow FREE alone never raises odds');
 assert.equal(await chosen.isEnabled(),true,'a placed dango remains editable when no FREE remains');
 await page.waitForFunction(text=>document.querySelector('.dgb-free-value')?.textContent===text,'あと0個',{timeout:900});
 await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[placementGeometry.tap]});await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await page.waitForFunction(id=>!window.DangoBingo.engine.state.manualFreeCells.includes(id),plan.cell);assert.equal((await snapshot()).remaining,1,'retouch restores one placeable FREE after all have been used');
 await page.waitForFunction(text=>document.querySelector('.dgb-free-value')?.textContent===text,'あと1個',{timeout:900});
 await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[placementGeometry.tap]});await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await page.waitForFunction(id=>window.DangoBingo.engine.state.manualFreeCells.includes(id),plan.cell);observed=await snapshot();assert.equal(observed.remaining,0);
 assert.ok(observed.lines.includes(plan.lineId),'placing a FREE can complete its selected three-cell skewer');
 await page.screenshot({path:out+'/dango-placement-390.png'});
 const selected=observed.manual.slice();assert.equal(await page.locator('.dgb-actions [data-action="confirm"]').count(),0);
 await page.waitForFunction(()=>!window.SweetsDangoThinkingV251.state().active,null,{timeout:22000});
 await page.waitForFunction(id=>document.querySelector('.dgb-cell[data-cell-id="'+id+'"]').disabled,plan.cell,{timeout:2000});
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
 await page.screenshot({path:out+'/dango-skewers-and-rainbow-1366.png'});
 report.mini=await page.evaluate(()=>{
  const R=window.DangoBingoRules,V=window.DangoBingoView,canvas=document.createElement('canvas');canvas.width=600;canvas.height=400;const c=canvas.getContext('2d'),numbers=Array.from({length:25},(_,i)=>i+1);
  const base=R.create({rulesRevision:254,initialFreeCells:[20],numbers,seed:253}),g=V.geometry(600,400,{layout:'compact',state:base}),skewers=[],outsideDango=new Uint8Array(600*400);
  const expectedHue=(length,r,g,b)=>{
   const maximum=Math.max(r,g,b),minimum=Math.min(r,g,b),delta=maximum-minimum;if(maximum<85||delta/maximum<.2)return false;
   let h=maximum===r?60*((g-b)/delta%6):maximum===g?60*((b-r)/delta+2):60*((r-g)/delta+4);if(h<0)h+=360;
   return length===3?h>=170&&h<255:length===4?h>=75&&h<170:length===5?h>=32&&h<75:length===7?h<28||h>=335:h>=255&&h<335;
  };
  // Difference an otherwise identical board with/without its completed line.
  // The wide colored glow is intentionally allowed around the bamboo. Pixels
  // outside every dango still have to follow the actual skewer direction.
  for(let y=0;y<400;y++)for(let x=0;x<600;x++)outsideDango[y*600+x]=g.centers.every(p=>(x-p.x)**2+(y-p.y)**2>(g.radius*1.12)**2)?1:0;
  for(const line of R.linesFor(base)){
   const state={...base,completedLines:[],newLines:[],cells:base.cells.map(cell=>({...cell,marked:line.cells.includes(cell.id)}))};V.drawMini(c,state,{age:Infinity,time:0,reducedMotion:true});const before=c.getImageData(0,0,600,400).data;
   V.drawMini(c,{...state,completedLines:[line.id]},{age:Infinity,time:0,reducedMotion:true});const after=c.getImageData(0,0,600,400).data;
   const a=g.centers[line.cells[0]],b=g.centers[line.cells.at(-1)],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),ux=dx/d,uy=dy/d;let changedOutside=0,skewerOnLine=0,colorPixels=0;
   for(let y=0;y<400;y++)for(let x=0;x<600;x++){
    const i=y*600+x,k=i*4;if(!outsideDango[i]||after[k+3]<60)continue;
    const change=Math.abs(after[k]-before[k])+Math.abs(after[k+1]-before[k+1])+Math.abs(after[k+2]-before[k+2])+Math.abs(after[k+3]-before[k+3]);if(change<30)continue;
    changedOutside++;const along=(x-a.x)*ux+(y-a.y)*uy,across=Math.abs((x-a.x)*uy-(y-a.y)*ux);
    if(along>=-g.unit*.9&&along<=d+g.unit*.9&&across<g.unit*.4){skewerOnLine++;if(expectedHue(line.length,after[k],after[k+1],after[k+2]))colorPixels++;}
   }
   skewers.push({id:line.id,axis:line.axis,length:line.length,changedOutside,skewerOnLine,colorPixels});
  }
  // Use a deterministic independent rule state for each requested color. Cell20
  // is an initial FREE that was hit; cell22 stays green, cell3 becomes rainbow,
  // cell8 is a still-unhit yellow manual FREE and cell24 is ordinary white.
  let s=R.create({rulesRevision:254,initialFreeCells:[20,22],numbers,seed:253});for(const n of [2,3,5,12,21])s=R.draw(s,n);for(const id of [3,8])s=R.placeFree(s,id);s=R.commitFree(s);s=R.draw(s,4);V.drawMini(c,s,{age:Infinity,time:0,reducedMotion:true});
  const rendered=V.describeAssets().last.mini,pixels=c.getImageData(0,0,600,400).data;let painted=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i])painted++;
  const region=id=>{const p=g.centers[id],counts={opaque:0,pink:0,green:0,white:0,yellow:0,hueBins:Array(6).fill(0)};for(let y=Math.floor(p.y-g.radius*.96);y<=p.y+g.radius*.96;y++)for(let x=Math.floor(p.x-g.radius*.96);x<=p.x+g.radius*.96;x++){
   const distance=Math.hypot(x-p.x,y-p.y);if(distance<g.radius*.4||distance>g.radius*.96||x<0||x>=600||y<0||y>=400)continue;
   const k=(y*600+x)*4,[r,gc,b,a]=pixels.slice(k,k+4);if(a<180)continue;counts.opaque++;
   if(r>140&&r>gc*1.08&&b>gc*.8)counts.pink++;
   if(gc>r*1.02&&gc>b*1.08)counts.green++;
   if(r>180&&gc>170&&b>150&&Math.abs(r-gc)<45&&Math.abs(gc-b)<50)counts.white++;
   if(r>155&&gc>120&&b<Math.min(r,gc)*.78)counts.yellow++;
   const maximum=Math.max(r,gc,b),minimum=Math.min(r,gc,b),delta=maximum-minimum;
   if(maximum>110&&delta/maximum>.18){let h=maximum===r?60*((gc-b)/delta%6):maximum===gc?60*((b-r)/delta+2):60*((r-gc)/delta+4);if(h<0)h+=360;counts.hueBins[Math.min(5,Math.floor(h/60))]++;}
  }return counts;};
  return {skewers,painted,corners:[pixels[3],pixels[599*4+3],pixels[600*399*4+3],pixels[(600*400-1)*4+3]],rainbow:region(3),yellow:region(8),green:region(22),pink:region(20),white:region(24),odds:s.oddsMultiplier,rendered};
 });
 assert.equal(report.mini.skewers.length,19);assert.equal(new Set(report.mini.skewers.map(x=>x.axis)).size,4);
 for(const line of report.mini.skewers){assert.ok(line.skewerOnLine>8,'visible skewer appears on line '+line.id);assert.ok(line.skewerOnLine>=line.changedOutside*.6,'colored skewer follows the correct horizontal, vertical or diagonal line '+line.id);assert.ok(line.colorPixels>3,'skewer length '+line.length+' uses its requested line color');}
 assert.ok(report.mini.painted>1000);assert.deepEqual(report.mini.corners,[0,0,0,0],'mini board preserves the existing tab background');
 const {rainbow,yellow,pink,green,white}=report.mini;
 assert.ok(rainbow.hueBins.filter(n=>n>12).length>=3,'odds-hit dango displays multiple rainbow hues');
 assert.ok(yellow.yellow>yellow.opaque*.12,'unhit manual FREE is moon-yellow');assert.ok(pink.pink>pink.opaque*.1,'HIT becomes tricolor-dango pink');assert.ok(green.green>green.opaque*.15,'unhit initial FREE is yellow-green');assert.ok(white.white>white.opaque*.3,'ordinary dango is white');
 for(const key of ['white','green','pink','yellow','rainbow'])assert.ok(report.mini.rendered.kinds[key]>=1,'requested state uses the '+key+' raster');
 report.motion=await page.evaluate(()=>{
  const R=window.DangoBingoRules,V=window.DangoBingoView,canvas=Object.assign(document.createElement('canvas'),{width:640,height:440}),c=canvas.getContext('2d'),base=R.create({rulesRevision:254,initialFreeCells:[20],numbers:Array.from({length:25},(_,i)=>i+1),seed:253});
  const frame=(state,time,options={})=>{V.paint(c,state,{time,age:Infinity,lineAge:Infinity,...options},false);return c.getImageData(0,0,640,440).data;};
  const difference=(a,b,mask)=>{let count=0;for(let k=0;k<a.length;k+=4){if(mask&&!mask(k/4))continue;if(Math.abs(a[k]-b[k])+Math.abs(a[k+1]-b[k+1])+Math.abs(a[k+2]-b[k+2])+Math.abs(a[k+3]-b[k+3])>24)count++;}return count;};
  const idlePixels=difference(frame(base,0),frame(base,600));
  const reducedPixels=difference(frame(base,0,{reducedMotion:true}),frame(base,600,{reducedMotion:true}));
  const pausedPixels=difference(frame(base,0,{paused:true}),frame(base,600,{paused:true}));
  const line=R.linesFor(base).find(line=>line.length===5),onlyLine={...base,cells:[],completedLines:[line.id],newLines:[]};
  const movingSkewerPixels=difference(frame(onlyLine,0),frame(onlyLine,600));
  const stillSkewerPixels=difference(frame(onlyLine,0,{reducedMotion:true}),frame(onlyLine,600,{reducedMotion:true}));
  const g=V.geometry(640,440,{state:base}),cell=base.cells.find(cell=>!cell.initialFree&&cell.id===12),point=g.centers[cell.id];
  const nearOutline=i=>{const x=i%640,y=Math.floor(i/640),distance=Math.hypot(x-point.x,y-point.y);return distance>g.radius*1.07&&distance<g.radius*1.5;};
  const reach=[];
  for(let tier=0;tier<4;tier++){
   const options={reach:[{n:cell.number,gain:100,gainHundredths:100,tier,allClear:tier===3}]};
   const visiblePixels=difference(frame(base,0),frame(base,0,options),nearOutline),movingPixels=difference(frame(base,0,options),frame(base,600,options),nearOutline),stillPixels=difference(frame(base,0,{...options,reducedMotion:true}),frame(base,600,{...options,reducedMotion:true}),nearOutline);
   reach.push({tier,visiblePixels,movingPixels,stillPixels});
  }
  const stand=V.describeAssets().last.main.standRendered;
  return {idlePixels,reducedPixels,pausedPixels,movingSkewerPixels,stillSkewerPixels,reach,stand};
 });
 assert.ok(report.motion.idlePixels>100,'mochi movement changes actual raster pixels');assert.equal(report.motion.reducedPixels,0);assert.equal(report.motion.pausedPixels,0);
 assert.ok(report.motion.movingSkewerPixels>20,'a completed skewer has traveling light');assert.equal(report.motion.stillSkewerPixels,0);
 for(const reach of report.motion.reach){assert.ok(reach.visiblePixels>8,'reach tier '+reach.tier+' has a visible outer effect');assert.ok(reach.movingPixels>8,'reach tier '+reach.tier+' has moving light');assert.equal(reach.stillPixels,0);}
 assert.equal(report.motion.stand,true,'main dango are rendered on their generated offering stand');
 report.art.lesson=await page.evaluate(()=>{
  const canvas=Object.assign(document.createElement('canvas'),{width:520,height:240}),ctx=canvas.getContext('2d'),before=JSON.stringify(window.DangoBingo.engine.state),calls=[];
  const prototype=CanvasRenderingContext2D.prototype,original=prototype.drawImage;
  prototype.drawImage=function(image,...args){const source=image?.currentSrc||image?.src||'';if(/\/dango-art-v25[23]\//.test(source))calls.push(source.split('/').at(-1).split('?')[0]);return original.call(this,image,...args);};
  try{window.SweetsAttractLessons.dango.draw(ctx,3,.9);}finally{prototype.drawImage=original;}
  const data=ctx.getImageData(0,0,520,240).data;let painted=0;for(let i=3;i<data.length;i+=4)if(data[i]>100)painted++;
  return {calls,painted,stateUnchanged:JSON.stringify(window.DangoBingo.engine.state)===before};
 });
 assert.ok(report.art.lesson.calls.includes('dango-rainbow.webp'));assert.ok(report.art.lesson.calls.includes('bamboo-skewer.webp'));assert.ok(report.art.lesson.painted>1000);assert.equal(report.art.lesson.stateUnchanged,true);
 report.art.actualCanvasCalls=await page.evaluate(()=>{const probe=window.__dangoRasterProbe,copy=JSON.parse(JSON.stringify(probe.calls));probe.restore();return copy;});
 for(const kind of ['main','mini'])assert.ok(report.art.actualCanvasCalls[kind]['dango-white.webp']>0,'actual '+kind+' canvas uses the generated dango');
 assert.ok(report.art.actualCanvasCalls.main['dango-yellow.webp']>0);assert.ok(report.art.actualCanvasCalls.main['dango-rainbow.webp']>0);assert.ok(report.art.actualCanvasCalls.main['bamboo-skewer.webp']>0);assert.ok(report.art.actualCanvasCalls.main['dango-pink.webp']>0);assert.ok(report.art.actualCanvasCalls.main['dango-green.webp']>0);assert.ok(report.art.actualCanvasCalls.main['tsukimi-stand.webp']>0);
 const legacyFixture=JSON.parse(await fs.readFile('tests/dango-v251-checkpoints.json','utf8'));
 report.legacyPreview=await page.evaluate(checkpoint=>{
  const R=window.DangoBingoRules,V=window.DangoBingoView,before=JSON.stringify(window.DangoBingo.engine.state);let state=structuredClone(checkpoint);
  for(const n of [6,7,8])state=R.draw(state,n);
  const host=document.createElement('div');host.style.cssText='position:fixed;left:-10000px;top:0;width:600px;height:440px';document.body.append(host);const view=V.mount(host);
  try{
   view.draw(state,{bet:100,reducedMotion:true,placementLocked:true});
   const values=[...view.root.querySelectorAll('td[data-valid="true"]')].map(td=>({length:Number(td.closest('tr').dataset.length),count:Number(td.dataset.count),text:td.textContent}));
   return {rulesRevision:state.rulesRevision,initial:state.initialFreeCells,draws:state.draws,odds:state.oddsMultiplier,total:state.totalHundredths,values,mainGameUnchanged:before===JSON.stringify(window.DangoBingo.engine.state)};
  }finally{view.destroy();host.remove();}
 },legacyFixture.committed);
 assert.equal(report.legacyPreview.rulesRevision,251);assert.deepEqual(report.legacyPreview.initial,[]);assert.equal(report.legacyPreview.draws.length,8);assert.equal(report.legacyPreview.total,40);assert.equal(report.legacyPreview.odds,2);
 assert.equal(report.legacyPreview.values.find(row=>row.length===3&&row.count===1).text,'40','legacy checkpoint keeps old 0.2×2 payout in the actual table');
 assert.equal(report.legacyPreview.values.find(row=>row.length===4&&row.count===1).text,'200','legacy 4-cell payout remains 1×2');assert.equal(report.legacyPreview.mainGameUnchanged,true);
 assert.equal(errors.length,0,JSON.stringify(errors));report.pageErrors=errors;
 await fs.writeFile(out+'/result.json',JSON.stringify(report,null,2)+'\n');
 console.log('DANGO_LEGACY_VIEW_PASS',JSON.stringify({currentDemonstration:report.ready.rulesRevision,restoredRule:report.legacyRound.revision,screens:report.screens.length,balls:report.balls.length,manual:final.manual,multiplier:final.multiplier,skewers:report.mini.skewers.length,rasterAssets:report.art.sprites.images.length+report.art.cssAssets.length,errors}));
}catch(error){
 report.failure={message:String(error),stack:error.stack,errors,warnings:fixture.warnings};
 try{report.failure.state=await snapshot();await page.screenshot({path:out+'/failure.png'});}catch(captureError){report.failure.captureError=String(captureError);}
 await fs.writeFile(out+'/partial-result.json',JSON.stringify(report,null,2)+'\n');await fs.writeFile(out+'/failure-server.log',fixture.logs.slice(-20000));
 console.error('DANGO_LEGACY_VIEW_FAIL',error,JSON.stringify(errors),fixture.logs.slice(-4000));throw error;
}finally{await fixture.close();}

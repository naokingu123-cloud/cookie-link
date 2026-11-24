/* CI-only browser QA. Every visible HIT comes from the existing number picker;
 * no award is emitted by the test and no public wallet endpoint is reachable. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {createHash} from 'node:crypto';
import {once} from 'node:events';
import {createRequire} from 'node:module';
import {chromium} from 'playwright';
import {createDownloadComputerV255} from '../server-download-compute-v255.mjs';
const {R,G,clone,NUMBERS,fullRound:revisionedRound}=createRequire(import.meta.url)('./sixdrop-v283-fixture.cjs');
const REVISION=285,fullRound=(seed,options={})=>revisionedRound(seed,{...options,rulesRevision:REVISION});
const root=process.cwd(),output='qa-sixdrop-v278',ids=['cookie','choco','candy','gelato','winery','popcorn','jelly','stick','castella','dango'];
const scenarios=[{id:'desktop-cycle',width:1366,height:900,cycle:true},{id:'mobile-high-amount',width:390,height:844,bet:300000},{id:'mini-allclear',width:390,height:844,mini:true},{id:'download-worker',worker:true}];
const shard=Number(process.env.SIXDROP_QA_SHARD??0),shards=Number(process.env.SIXDROP_QA_SHARDS??1);
assert(Number.isInteger(shards)&&shards>0&&shards<=scenarios.length);assert(Number.isInteger(shard)&&shard>=0&&shard<shards);
const planned=scenarios.filter((_s,i)=>i%shards===shard);
if(process.argv.includes('--list-cases')){console.log(JSON.stringify({shard,shards,totalPlannedCases:scenarios.length,plannedCases:planned.map(s=>s.id)}));process.exit(0);}
await fs.mkdir(output,{recursive:true});
const version=JSON.parse(await fs.readFile('app-version.json','utf8')).version;
// This reviewed atlas contains the complete 4 / 6 / 6 candy diagrams and
// Japanese role titles, left to right. Pin its pixels: the hidden legacy
// CANVAS cannot establish what the new illustrated header actually shows.
const payoutV296={source:'assets/sixdrop-art-v296/payouts.webp',sha256:'4d6da984c380f758ac5e2d74ea3c0c9911f75c0433a6ac6b69d145ef805eb51d',width:1944,height:809,roles:['line','triangle','hexagon']};
let payoutV296Hash=null;
try{payoutV296Hash=createHash('sha256').update(await fs.readFile(payoutV296.source)).digest('hex');}catch(error){if(error.code!=='ENOENT')throw error;}
assert.equal(R.CURRENT_REVISION,REVISION,'browser QA targets the production 284 rules');
const prior={version:247,bankUnits:123456,removed:99,feed:450,roundId:'qa-previous-completed'};
// Find a real generated witness in the current revision. The settled state is
// then calculated independently in Node and compared to each live UI boundary.
let winning,losing;
for(let seed=1;seed<=2000&&(!winning||!losing);seed++){
 const candidate=fullRound(seed,{bet:3000,carry:prior});
 if(!winning&&candidate.state.allClears>0&&candidate.state.counts.line>=2){
  const degrees=candidate.plans.flatMap((plan,index)=>primaryArea(index?candidate.plans[index-1].state:candidate.initial,NUMBERS[index]).degrees);
  if(degrees.some(drop=>drop.validNeighbours<6)&&degrees.some(drop=>drop.occupiedNeighbours===6))winning=candidate;
 }
 if(!losing&&candidate.win===0)losing=candidate;
}
assert(winning&&losing,'natural current-rule witnesses exist for all-clear, edge/interior HIT rings and own zero WIN');
const report={version,rulesRevision:R.CURRENT_REVISION,shard,shards,totalPlannedCases:scenarios.length,plannedCases:planned.map(s=>s.id),caseResults:[],failures:[],screens:[],pageErrors:[],assetFailures:[],apiRequests:[],externalRequests:[],witnesses:{winning:{seed:winning.seed,win:winning.win,counts:winning.state.counts,allClears:winning.state.allClears,numbers:NUMBERS},losing:{seed:losing.seed,win:losing.win}},scope:'Real manual number buttons; production v284 single-ball neighbour removal, 200-drop palette, compact payouts, enlarged 318px bottle, integer-credit count animation, native payout, local continuation and download worker; isolated virtual CREDIT'};
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.png':'image/png','.webp':'image/webp','.avif':'image/avif','.svg':'image/svg+xml','.wav':'audio/wav','.mp3':'audio/mpeg','.woff2':'font/woff2'};
const bridge='\n;window.__qa278={app,slots,select,syncManualNumbers,scheduleUI,syncPause,debugResetRound,stopResultAuto,get active(){return active;},point:sixXY,reach:()=>reachContext(app.engines[2],app)};\n';
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1');
 if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/ws')){report.apiRequests.push(url.pathname);res.writeHead(451).end();return;}
 const file=path.resolve(root,'.'+decodeURI(url.pathname==='/'?'/index.html':url.pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 try{let body=await fs.readFile(file);if(file.endsWith('/assets/sixdrop-ui-v278.js'))body=Buffer.concat([body,Buffer.from(bridge)]);res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream','cache-control':'no-store'});res.end(body);}catch{res.writeHead(404).end();}
});
server.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;
let browser,context,page,computer,current;
const expectedProcessed=Array.from({length:9},(_,index)=>index);
// Observe the real image-to-canvas-to-dataURL path. This changes no pixels,
// game state or clock, and lets both cached headers and live award canvases
// prove which source artwork and crop were actually drawn.
function observeArtwork(){
 const inherited=new WeakMap(),dataURLs=new Map();
 const trace=image=>{
  if(!image)return [];
  const prior=inherited.get(image);if(prior)return prior;
  const src=image.currentSrc||image.src;if(dataURLs.has(src))return dataURLs.get(src);
  if(typeof src==='string')try{const u=new URL(src,location.href);if(u.origin===location.origin&&/^\/assets\/sixdrop-art-v296\/(?:payouts|award-allclear|award-digits)\.webp$/.test(u.pathname))return [{source:u.pathname.slice(1),rect:null}];}catch{}
  return [];
 };
 const draw=CanvasRenderingContext2D.prototype.drawImage;
 CanvasRenderingContext2D.prototype.drawImage=function(image,...args){
  const out=Reflect.apply(draw,this,[image,...args]),source=trace(image);
  if(source.length){
   const rect=args.length===8?args.slice(0,4):[0,0,image.naturalWidth||image.width,image.naturalHeight||image.height];
   const entries=source.map(item=>({source:item.source,rect:item.rect||rect}));
   inherited.set(this.canvas,[...new Map([...(inherited.get(this.canvas)||[]),...entries].map(item=>[JSON.stringify(item),item])).values()]);
  }
  return out;
 };
 const clear=CanvasRenderingContext2D.prototype.clearRect;
 CanvasRenderingContext2D.prototype.clearRect=function(x,y,w,h){
  const m=this.getTransform(),out=Reflect.apply(clear,this,[x,y,w,h]);
  if(!m.b&&!m.c&&x*m.a+m.e<=0&&y*m.d+m.f<=0&&(x+w)*m.a+m.e>=this.canvas.width&&(y+h)*m.d+m.f>=this.canvas.height)inherited.delete(this.canvas);
  return out;
 };
 const toURL=HTMLCanvasElement.prototype.toDataURL;
 HTMLCanvasElement.prototype.toDataURL=function(...args){const result=Reflect.apply(toURL,this,args),source=trace(this);if(source.length)dataURLs.set(result,source);return result;};
 window.__sixArt278={inspect:image=>trace(image).map(item=>({source:item.source,rect:item.rect?.slice()||null}))};
}
async function startManualRound(label,timeout=45000){
 // A native start may finish while cabinet measurements are running. Check
 // and use the ordinary UI button in one task, without a read/click race.
 const start=await page.evaluate(()=>{
  const q=__qa278,e=SixDropV247.engine;
  if(!SweetsLocalDebugV258.describe().manualNumbers)throw Error('round start requires native manual-number mode');
  if(q.app.phase==='playing'){
   if(q.app.draws.length!==0||e.accepted!==0||e.processed!==0||e.busy||e.fx||!(e.idle||e.phase==='waiting'))throw Error('already-started round is not the untouched native waiting state');
   return {path:'already-playing',phase:q.app.phase,draws:q.app.draws.length,accepted:e.accepted,processed:e.processed,enginePhase:e.phase};
  }
  if(q.app.phase!=='ready')throw Error('unexpected native phase before Start: '+q.app.phase);
  const button=document.getElementById('manual-start'),box=button?.getBoundingClientRect();
  if(!button||!button.isConnected||button.disabled||button.matches(':disabled')||!(box.width>0&&box.height>0))throw Error('native Start button is not visible and enabled');
  for(let node=button;node;node=node.parentElement){const css=getComputedStyle(node);if(node.hidden||node.inert||css.display==='none'||css.visibility==='hidden'||Number(css.opacity)===0)throw Error('native Start button is hidden or inert');}
  button.click();
  return {path:'button-click',phase:q.app.phase,draws:q.app.draws.length,accepted:e.accepted,processed:e.processed,enginePhase:e.phase};
 });
 (report.starts??=[]).push({label,...start});console.log('SIXDROP_V284_NATIVE_START',label,start.path);
 await page.waitForFunction(()=>__qa278.app.phase==='playing'&&SixDropV247.engine.idle,null,{timeout});
}
async function open(s){
 await context?.close();context=await browser.newContext({viewport:{width:s.width,height:s.height},serviceWorkers:'block'});
 await context.addInitScript(observeArtwork);
 await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin!==base){report.externalRequests.push(u.href);return route.abort();}if(u.pathname.startsWith('/api/')||u.pathname.startsWith('/ws')){report.apiRequests.push(u.pathname);return route.abort();}return route.continue();});
 page=await context.newPage();page.on('pageerror',e=>report.pageErrors.push({case:current,error:String(e.stack||e)}));
 page.on('response',res=>{if(res.status()>=400&&/sixdrop|v278/.test(res.url()))report.assetFailures.push({case:current,url:res.url(),status:res.status()});});
 await page.goto(base+'/?edition=local&appv='+encodeURIComponent(version),{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__qa278&&SweetsLocalDebugV258?.ready&&window.SixDropUiV278&&window.SweetsAwardsV277,null,{timeout:90000});
 assert.equal(await page.evaluate(()=>SixDropUiV278.ready),true);await page.evaluate(()=>document.fonts.ready);
 await page.waitForFunction(()=>[...document.querySelectorAll('.sd278-payout-frame')].length===3&&[...document.querySelectorAll('.sd278-payout-frame')].every(image=>image.complete&&image.naturalWidth>0));
 await page.locator('#manual-number-toggle').click();
 await page.waitForFunction(()=>SweetsLocalDebugV258.describe().manualNumbers&&__qa278.app.phase==='ready');
 await page.evaluate(({prior,seed,bet})=>{
  const q=__qa278,candy=q.app.engines[2];if(!SixDropV247.restoreLocalCarryV278(prior))throw Error('local carry bootstrap rejected');
  if(!SweetsLocalDebugV258.setBets(q.app.bets.map((_n,i)=>i===2?bet:0)))throw Error('local BET setup failed');
  candy.random=()=>seed/4294967296;q.select(2);q.syncManualNumbers();q.scheduleUI(q.app);
   const emit=candy.emit;candy.emit=function(phase,detail={}){q.events.push({phase,winMedals:detail.winMedals,allClears:detail.allClears,bonusMedals:detail.bonusMedals,numbers:detail.numbers,counts:detail.counts,gain:detail.gain,cells:detail.cells,affectedCells:detail.affectedCells,removed:detail.removed?.map(({r,c,tile})=>({r,c,id:tile.id,number:tile.number}))});return Reflect.apply(emit,this,arguments);};q.events=[];
 },{prior,seed:winning.seed,bet:s.bet||3000});
 await compareCabinets(s);
 await startManualRound(s.id+'-initial');
 if(s.mini)await page.evaluate(()=>__qa278.select(3));
}
async function compareCabinets(s){
 const frames=[];
 for(const index of [0,3,2]){
  await page.evaluate(index=>__qa278.select(index),index);
  await page.waitForFunction(({index,kind})=>__qa278.active===index&&document.body.dataset.v249Game===kind,{index,kind:ids[index]});
  // Let the existing UI/fit RAFs finish; no expected dimensions are used as a
  // waiting condition, so an incorrect but stable layout still fails below.
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  frames.push(await page.evaluate(kind=>{
   const node=document.querySelector('#screen>.game'),b=node.getBoundingClientRect(),css=getComputedStyle(node);
   return {kind,cssWidth:parseFloat(css.width),cssHeight:parseFloat(css.height),left:b.left,top:b.top,width:b.width,height:b.height,viewportWidth:innerWidth,scrollWidth:document.documentElement.scrollWidth};
  },ids[index]));
 }
 for(const frame of frames){
  assert.equal(frame.cssHeight,390,frame.kind+' keeps the common 390px game frame');
  assert.equal(frame.cssWidth,frames[0].cssWidth,frame.kind+' keeps the common game width');
  assert(Math.abs(frame.width-frames[0].width)<=1&&Math.abs(frame.height-frames[0].height)<=1,frame.kind+' has the same visible frame size at the same viewport');
  assert(frame.scrollWidth<=frame.viewportWidth,'the selected game does not widen the document');
 }
 report[s.id+'Frames']=frames;
}
function snapshot(){
 const q=__qa278,e=SixDropV247.engine,d=SixDropUiV278.describe();
 const box=node=>{if(!node)return null;const b=node.getBoundingClientRect();return {left:b.left,top:b.top,right:b.right,bottom:b.bottom,width:b.width,height:b.height};};
 const style=(node,pseudo)=>{if(!node)return null;const c=getComputedStyle(node,pseudo);return {display:c.display,content:c.content,width:c.width,height:c.height,backgroundImage:c.backgroundImage,boxShadow:c.boxShadow,borderWidth:c.borderWidth};};
 const diagram=canvas=>{
  if(!canvas)return null;
  const {width,height}=canvas,data=canvas.getContext('2d').getImageData(0,0,width,height).data;
  let ink=0;for(let index=3;index<data.length;index+=4)if(data[index]>32)ink++;
  const alpha=(x,y)=>data[(Math.round(y)*width+Math.round(x))*4+3];
  return {tag:canvas.tagName,drops:Number(canvas.dataset.drops),width,height,box:box(canvas),ink,centerAlpha:alpha(width/2,height/2)};
 };
 const generatedHeader=section=>{
  const image=section.querySelector('.sd278-payout-frame'),frame=box(image),header=section.querySelector('header'),count=section.querySelector('thead th');
  // These bounds enclose the reviewed image's title and candy diagram above
  // the live rows. Measure the rendered image region, not the retired DOM.
  const area={left:frame.left+frame.width*.12,right:frame.left+frame.width*.88,top:frame.top+frame.height*.02,bottom:frame.top+frame.height*.31,width:frame.width*.76,height:frame.height*.29};
  const probe=document.createElement('canvas');probe.width=image.naturalWidth;probe.height=image.naturalHeight;
  const ctx=probe.getContext('2d');ctx.drawImage(image,0,0);
  const x=Math.floor(probe.width*.12),y=Math.floor(probe.height*.02),width=Math.floor(probe.width*.76),height=Math.floor(probe.height*.29),pixels=ctx.getImageData(x,y,width,height).data;
  let ink=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]>32)ink++;
  let visible=true;for(let node=image;node;node=node.parentElement){const css=getComputedStyle(node);if(css.display==='none'||css.visibility==='hidden'||Number(css.opacity)===0)visible=false;}
  return {tag:image.tagName,source:SixDropArtV296.source('payout-'+section.dataset.role)?.split('?')[0],mapped:image.getAttribute('src')===SixDropArtV296.asset('payout-'+section.dataset.role),trace:__sixArt278.inspect(image),width:probe.width,height:probe.height,box:area,visible,ink,pixels:width*height,legacyHeaderDisplay:getComputedStyle(header).display,countBox:box(count),countLabel:count.getAttribute('aria-label')};
 };
 const rows=[...document.querySelectorAll('#sd278-payouts section')].map(section=>({
  role:section.dataset.role,earned:Number(section.dataset.earnedCount),countText:section.querySelector(d.artVersion===296?'thead th':'.sd278-role-count').textContent,box:box(section),diagram:d.artVersion===296?null:diagram(section.querySelector('canvas.sd278-role-icon')),art:d.artVersion===296?generatedHeader(section):null,
  rows:[...section.querySelectorAll('tbody tr')].map(tr=>({count:Number(tr.dataset.count),countText:tr.querySelector('th').textContent,hundredths:Number(tr.dataset.payoutHundredths),win:Number(tr.dataset.win),current:tr.getAttribute('aria-current')==='true',box:box(tr),amount:box(tr.querySelector('.gold-number')),cell:box(tr.querySelector('td'))}))
 }));
 const bank=document.getElementById('sd278-bank'),receipt=document.getElementById('sd278-clear-earned'),continuation=document.getElementById('sd278-continuation'),canvas=q.slots[2].candyCanvas;
  const heading=document.getElementById('carnival-heading'),field=document.querySelector('#screen>.game>.field'),game=document.querySelector('#screen>.game'),top=document.querySelector('#screen>.game>.festival-top'),removed=document.getElementById('sd280-removed-total');
 return {state:e.state,engine:{processed:e.processed,accepted:e.accepted,busy:e.busy,running:e.running,phase:e.phase,drawMode:e.drawMode},info:SixDropV247.describeV278(),ui:d,carry:SixDropV247.carry,app:{phase:q.app.phase,draws:q.app.draws,roundWins:q.app.roundWins,totalWin:q.app.totalWin,credit:q.app.credit},rows,
   hud:{heading:box(heading),headingStyle:style(heading),logo:box(heading.querySelector('.sd278-bank-logo')),win:box(document.getElementById('sd283-bank-win')),bank:box(bank),digits:box(bank.querySelector('.gold-number')),bankText:bank.textContent,continuation:box(continuation),continuationHidden:continuation.hidden,receipt:box(receipt),receiptHidden:receipt.hidden,receiptAmount:box(receipt.querySelector('.sd278-earned-win')),receiptDigits:box(receipt.querySelector('.sd278-earned-win .gold-number')),receiptText:receipt.querySelector('.sd278-earned-win').textContent,receiptWin:Number(receipt.dataset.win),receiptCount:Number(receipt.dataset.count),receiptLastWin:Number(receipt.dataset.lastWin),hasBatchStrip:!!document.getElementById('sd278-batches'),removed:box(removed?.closest('.sd280-removed')),removedAmount:box(removed),removedDigits:box(removed?.querySelector('.gold-number')),removedText:removed?.textContent},
   board:{game:box(game),gameHeight:parseFloat(getComputedStyle(game).height),field:box(field),fieldHeight:parseFloat(getComputedStyle(field).height),fieldColumns:getComputedStyle(field).gridTemplateColumns.split(' ').map(parseFloat),fieldGap:parseFloat(getComputedStyle(field).columnGap),odds:box(document.getElementById('carnival-odds')),oddsWidth:parseFloat(getComputedStyle(document.getElementById('carnival-odds')).width),canvas:box(canvas),bottle:box(document.querySelector('.sd278-bottle-art')),bottleStyle:style(document.querySelector('.sd278-bottle-art')),points:e.state?.grid.flatMap((row,r)=>row.flatMap((tile,c)=>tile?[{id:tile.id,number:tile.number,...q.point(r,c,10)}]:[])),oldFieldBefore:style(field,'::before'),oldFieldAfter:style(field,'::after'),top:style(top),topGlass:style(top?.querySelector('.arcade-world-roulette-glass')),oldShine:style(document.querySelector('.sd278-bottle>.classic-bottle-shine'))},events:q.events.slice(),miniBadge:{hidden:q.slots[2].tab.querySelector('.sd278-mini-earned').hidden,text:q.slots[2].tab.querySelector('.sd278-mini-earned').textContent},awards:SweetsAwardsV277.describe()};
}
async function shot(label){const name=label+'.png';await page.screenshot({path:path.join(output,name)});report.screens.push(name);return name;}
function fixedAnchors(hud){
 const origin=hud.heading,scale=origin.width/318;assert(scale>0,'main award strip is visible');
 return Object.fromEntries(['logo','win','bank','continuation'].map(name=>{
  const box=hud[name];assert(box&&box.width>0,name+' retains its reserved slot');
  return [name,{left:(box.left-origin.left)/scale,top:(box.top-origin.top)/scale,right:(box.right-origin.left)/scale,bottom:(box.bottom-origin.top)/scale}];
 }));
}
function assertFixedAnchors(actual,expected,label){
 for(const name of ['logo','win','bank','continuation'])for(const axis of ['left','top','right','bottom'])assert(Math.abs(actual[name][axis]-expected[name][axis])<=.25,label+': '+name+' '+axis+' stays fixed');
}
// Use the actual staggered circle centres as an independent geometric oracle.
// No production neighbour list, emitted affectedCells, or post-HIT board is
// used to determine which original tile IDs should disappear.
function primaryArea(before,number){
 const positions=before.grid.flatMap((row,r)=>row.map((tile,c)=>({r,c,tile,...G.point(r,c,R.ROWS)}))),centres=positions.filter(p=>p.tile?.number===number);
 const adjacent=(p,q)=>Math.abs(Math.hypot(p.x-q.x,p.y-q.y)-1)<1e-8;
 const affected=positions.filter(p=>p.tile&&centres.some(q=>p.r===q.r&&p.c===q.c||adjacent(p,q)));
 return {centres:centres.map(p=>[p.r,p.c]),affected:affected.map(p=>[p.r,p.c]),removed:affected.map(p=>({r:p.r,c:p.c,id:p.tile.id,number:p.tile.number})),degrees:centres.map(q=>({cell:[q.r,q.c],validNeighbours:positions.filter(p=>adjacent(p,q)).length,occupiedNeighbours:positions.filter(p=>p.tile&&adjacent(p,q)).length}))};
}
function assertPrimaryRemoval(before,number,events){
 const expected=primaryArea(before,number),hits=events.filter(event=>['pyramidHit','pyramidMiss'].includes(event.phase));
 assert.equal(hits.length,1,'one real HIT or miss is emitted for this one ball');
 const hit=hits[0],index=events.indexOf(hit);assert.equal(hit.phase,expected.centres.length?'pyramidHit':'pyramidMiss');assert.deepEqual(hit.numbers,[number]);
 assert.deepEqual(hit.cells,expected.centres,'HIT centres come from the pre-ball numbered tiles');
 assert.deepEqual(hit.affectedCells,expected.affected,'the actual HIT adds exactly the existing six-neighbour ring');
 if(expected.centres.length){
  const broken=events[index+1];assert.equal(broken?.phase,'pyramidBreak','primary removal happens before gravity and colour cascades');
  assert.deepEqual(broken.numbers,[number]);assert.deepEqual(broken.removed,expected.removed,'the real first break removes exactly those pre-ball tile IDs once');
  assert.equal(new Set(broken.removed.map(tile=>tile.id)).size,broken.removed.length);
 }else assert(!events.some(event=>event.phase==='pyramidBreak'),'a missed number does not cause a primary blast');
 return {number,...expected};
}
function assertHud(view,{mini=false}={}){
 const endedLoss=view.engine.processed===8&&!view.engine.running&&!view.info.earnedContinuation,bank=endedLoss?0:view.state.bankUnits,removed=endedLoss?0:view.state.removedTotal;
 assert.equal(view.ui.version,284,'cabinet presentation API revision is separate from rules');assert.equal(view.state.rulesRevision,REVISION);assert(view.ui.artLoaded);assert.deepEqual(view.ui.errors,[]);assert.equal(view.ui.progressive.targetUnits,bank);
 assert.equal(view.ui.progressive.units,bank,'count-up finishes at the canonical balance, or zero after a completed loss');assert.equal(view.hud.bankText,String(Math.floor(bank/100)),'visible digits show the actual progressive');
 assert.equal(view.ui.removed.targetCount,removed);assert.equal(view.ui.removed.count,removed,'removed total settles to the actual lifetime count, or zero after an own loss');assert.equal(view.hud.removedText,String(removed));
 assert.equal(view.hud.continuationHidden,!view.info.continuationActive);assert.equal(view.hud.hasBatchStrip,false,'group schedule is not presented');assert.deepEqual(view.ui.batchSizes,Array(8).fill(1),'each of the eight balls resolves immediately');
 assert.equal(view.hud.receiptCount,view.state.allClears);assert.equal(view.hud.receiptWin,view.state.bonusMedals);assert.equal(view.hud.receiptLastWin,view.state.lastAllClearWin);
 assert.equal(view.hud.receiptHidden,view.state.allClears===0);
 assert.deepEqual(view.state.palette,R.palette(Math.max(0,view.state.removedTotal-view.state.roundRemoved),view.state),'v285 freezes the 200-drop band at round start');
 for(const role of view.rows){
  assert.equal(role.earned,view.state.counts[role.role]);assert.equal(role.countText,'×'+role.earned);assert.equal(role.rows.length,5);
  for(const row of role.rows){assert.equal(row.countText,'×'+row.count);assert.equal(row.hundredths,R.roleTotal(role.role,row.count,view.state.rulesRevision));assert.equal(row.win,Math.floor(view.state.bet*row.hundredths/100));assert.equal(row.current,row.count===role.earned);}
  if(role.earned>0)assert(role.rows.some(row=>row.current),'current attained count remains in the visible five-row table');
  if(view.ui.artVersion===296){
   assert.equal(payoutV296Hash,payoutV296.sha256,'the final reviewed 4/6/6 role artwork is unchanged');
   const index=payoutV296.roles.indexOf(role.role),art=role.art;assert(index>=0,'each generated header maps to a known native role');
   assert.equal(art?.tag,'IMG');assert.equal(art.source,payoutV296.source);assert(art.mapped,'the live image is the cached crop assigned to this native role');
   assert.deepEqual(art.trace,[{source:payoutV296.source,rect:[index*payoutV296.width/3,0,payoutV296.width/3,payoutV296.height]}],'the visible role image comes from the correct reviewed atlas column');
   assert.equal(art.width,384);assert.equal(art.height,Math.round(384*payoutV296.height/(payoutV296.width/3)));
   assert(art.ink>500&&art.ink>art.pixels*.5,'the generated header contains actual opaque artwork pixels');
   assert.equal(art.legacyHeaderDisplay,'none','the obsolete title/diagram does not duplicate the illustrated header');assert.equal(art.countLabel,'現在の成立個数');
  }else{
   assert.equal(role.diagram?.tag,'CANVAS','the role shows actual painted drops');assert.equal(role.diagram.drops,{line:4,triangle:6,hexagon:6}[role.role]);
   assert(role.diagram.ink>500,'the role diagram contains rendered candy pixels');
   if(role.role==='hexagon')assert(role.diagram.centerAlpha<32,'hexagon shows a six-drop ring with an empty centre');
  }
 }
 const radius=view.ui.geometry.radius;assert.equal(radius,14.75,'candies use the larger native geometry');
 for(const point of view.board.points){assert(point.x-radius>=0&&point.x+radius<=320&&point.y-radius>=0&&point.y+radius<=320,'every actual candy/number center remains inside the native board');}
 if(!mini){
  assert.equal(view.board.gameHeight,390,'the game uses the common cabinet height');assert.equal(view.board.fieldHeight,336,'the compact heading frees 24px of vertical play space');
  assert.deepEqual(view.board.fieldColumns,[328,96],'the compact payout column frees room for the main board');assert.equal(view.board.fieldGap,6);assert.equal(view.board.oddsWidth,96);
  assert.equal(parseFloat(view.board.bottleStyle.width),318);assert.equal(parseFloat(view.board.bottleStyle.height),318,'the enlarged bottle remains square');
  assert.equal(parseFloat(view.hud.headingStyle.width),318,'the award heading uses the enlarged bottle width');assert.equal(parseFloat(view.hud.headingStyle.height),28,'an empty receipt row no longer consumes play space');
  assert(Math.abs(view.hud.heading.width-view.board.bottle.width)<=1&&Math.abs(view.hud.heading.left-view.board.bottle.left)<=2,'award strip and bottle align');
  for(const pseudo of [view.board.oldFieldBefore,view.board.oldFieldAfter]){assert.equal(pseudo.display,'none','retired field-level bottle artwork is hidden');assert.equal(pseudo.backgroundImage,'none');}
  assert.equal(view.board.top.boxShadow,'none','cyan outer award frame is removed');assert.equal(view.board.top.backgroundImage,'none');
  if(view.board.topGlass)assert.equal(view.board.topGlass.display,'none');if(view.board.oldShine)assert.equal(view.board.oldShine.display,'none');
  assert(view.hud.bank.width>20&&view.hud.bank.height>10,'progressive digits have visible space');
  assert(view.hud.digits.left>=view.hud.bank.left-2&&view.hud.digits.right<=view.hud.bank.right+2,'progressive digits do not clip');
  assert(view.hud.bank.left>=view.hud.logo.right-1&&view.hud.bank.left-view.hud.logo.right<=4,'the reserved payout slot remains next to the logo');
  assert(view.hud.win.left>=view.hud.bank.right-1&&view.hud.win.right<=view.hud.continuation.left+1,'WIN has its own stable column');
  assert(view.hud.continuation.width>0&&view.hud.continuation.left>=view.hud.win.right-1,'hidden continuation keeps the same reserved column');
  const fixed=fixedAnchors(view.hud);for(const [name,width]of [['logo',76],['bank',164],['win',24],['continuation',32]])assert(Math.abs(fixed[name].right-fixed[name].left-width)<=.1,name+' retains its exact logical grid width');
  assert(view.hud.removed.top>=view.board.bottle.bottom-1&&view.hud.removed.top-view.board.bottle.bottom<=3,'removed total sits directly below the bottle');
  assert(view.hud.removed.left>=view.board.bottle.left-1&&view.hud.removed.right<=view.board.bottle.right+1,'removed total fits the bottle width');
  assert(view.hud.removedDigits.left>=view.hud.removedAmount.left-2&&view.hud.removedDigits.right<=view.hud.removedAmount.right+2,'removed count digits fit their allocated space');
  for(const box of [view.board.bottle,view.hud.removed,view.board.odds])assert(box.top>=view.board.field.top-1&&box.bottom<=view.board.field.bottom+1,'bottle, removed counter and odds fit the common field');
  assert(view.board.bottle.right<view.board.odds.left,'the enlarged bottle never overlaps the compact payout table');
  if(!view.hud.receiptHidden){
   assert.equal(view.hud.receiptText,String(view.state.bonusMedals),'earned receipt displays its actual awarded amount');
   const digits=view.hud.receiptDigits;assert(digits.width>=digits.height*view.hud.receiptText.length*.45,'receipt amount keeps readable digit proportions');
   assert(digits.left>=view.hud.receiptAmount.left-2&&digits.right<=view.hud.receiptAmount.right+2,'earned receipt amount fits its allocated space');
   assert(Math.abs(view.hud.receipt.left-view.board.odds.left)<=1&&Math.abs(view.hud.receipt.right-view.board.odds.right)<=1,'earned receipt aligns with the right payout column');
   assert(view.hud.receipt.top>=view.hud.heading.top-1&&view.hud.receipt.bottom<=view.hud.heading.bottom+1,'earned receipt uses the existing heading height');
   assert(view.hud.receipt.bottom<=view.board.odds.top+1&&view.hud.receipt.left>view.board.bottle.right,'earned receipt covers neither the role table nor bottle neck');
  }
  for(const role of view.rows){
   const header=role.art||role.diagram;
   assert(header.box.width>=30&&header.box.height>=20,'actual role header is large enough to see');
   if(role.art){assert(role.art.visible,'the generated role header is visible');assert(role.art.countBox.width>0&&role.art.countBox.height>0,'the actual attained count has visible space');assert(role.art.box.bottom<=role.art.countBox.top+1,'live count and rows do not cover the illustrated role header');}
   for(const row of role.rows){assert(row.amount.left>=row.cell.left-2&&row.amount.right<=row.cell.right+2,'payout '+role.role+' count '+row.count+' amount fits its cell');assert(row.box.top>=role.box.top-2&&row.box.bottom<=role.box.bottom+2,'all five '+role.role+' payout rows stay visible inside their frame');}
  }
 }
}
function clearPaint({mini}){
 const current=SweetsAwardsV277.describe().active.find(c=>c.game==='candy'&&c.kind==='clear'),node=document.querySelector('.award-presentation-'+(mini?'mini':'main')+'[data-game="candy"]');
 if(!current||!node||node.hidden||current.age<180)return null;
 const b=node.getBoundingClientRect();if(b.width<8||b.height<8)return null;
 if(window.SixDropAwardV296?.loaded){
  const api=SixDropAwardV296.describe(),rendered=api.last,trace=__sixArt278.inspect(node),source='assets/sixdrop-art-v296/award-allclear.webp';
  if(current.phase!=='pyramidAllClear'||rendered?.phase!==current.phase||rendered.role!=='allclear'||rendered.mini!==!!mini||rendered.win!==current.win||rendered.source!==source||!api.roles.allclear||!api[mini?'mini':'main'])return null;
  if(!trace.some(item=>item.source===source)||!trace.some(item=>item.source==='assets/sixdrop-art-v296/award-digits.webp')||!rendered.rasterNumbers)return null;
  return {event:current,renderer:296,rendered,trace,box:{width:b.width,height:b.height},dedicatedPaints:api.roles.allclear,surfacePaints:api[mini?'mini':'main'],data:node.toDataURL('image/png')};
 }
 const dedicatedPaints=SixDropUiV278.describe().allClearBadgePaints;if(!dedicatedPaints)return null;
 return {event:current,renderer:278,box:{width:b.width,height:b.height},dedicatedPaints,data:node.toDataURL('image/png')};
}
async function play(s,{seed=winning.seed,bet=s.bet||3000,carry=prior,label=s.id,capture=true}={}){
 const oracle=fullRound(seed,{bet,carry}),blasts=[];let expected=oracle.initial,seenClear=false;
 assert.equal(oracle.plans.length,8,'the current-rule witness resolves eight independent balls');
 const initial=await page.evaluate(snapshot);assert.deepEqual(initial.state,expected,'live newGame equals the independent seeded core witness');
 const anchors=s.mini?null:fixedAnchors(initial.hud);let eventCursor=initial.events.length;
 // Observe the same visible clock while real HIT buttons run. This records
 // UI values only: no engine, payout, animation or carry is advanced by QA.
 await page.evaluate(({mini})=>{
  const q=__qa278;q.countUpSamples=[];q.captureCountUp=true;
  const sample=()=>{
   if(!q.captureCountUp)return;
   const ui=SixDropUiV278.describe(),source=document.getElementById('sd247-bank'),row={units:ui.progressive.units,removed:ui.removed.count,hostUnits:Number(source.dataset.displayUnits),hostRemoved:Number(source.dataset.displayRemoved),text:document.getElementById('sd280-removed-total').textContent,continuationHidden:document.getElementById('sd278-continuation').hidden},last=q.countUpSamples.at(-1);
   if(!mini){
    const heading=document.getElementById('carnival-heading'),origin=heading.getBoundingClientRect(),scale=origin.width/318;
    row.anchors=Object.fromEntries([['logo',heading.querySelector('.sd278-bank-logo')],['win',document.getElementById('sd283-bank-win')],['bank',document.getElementById('sd278-bank')],['continuation',document.getElementById('sd278-continuation')]].map(([name,node])=>{
     const box=node.getBoundingClientRect();return [name,{left:(box.left-origin.left)/scale,top:(box.top-origin.top)/scale,right:(box.right-origin.left)/scale,bottom:(box.bottom-origin.top)/scale}];
    }));
   }
   if(!last||last.units!==row.units||last.removed!==row.removed||last.hostRemoved!==row.hostRemoved||last.continuationHidden!==row.continuationHidden||JSON.stringify(last.anchors)!==JSON.stringify(row.anchors))q.countUpSamples.push(row);
   requestAnimationFrame(sample);
  };requestAnimationFrame(sample);
 },{mini:!!s.mini});
 if(capture)await shot(label+'-start');
 for(let i=0;i<8;i++){
  const next=NUMBERS[i],plan=oracle.plans[i],before=expected;
  let paint;
  if(capture&&plan?.allClear&&!seenClear)paint=page.waitForFunction(clearPaint,{mini:!!s.mini},{polling:'raf',timeout:45000}).then(async handle=>{try{const evidence=await handle.jsonValue();evidence.liveScreen=await shot(label+'-allclear-live');return evidence;}finally{await handle.dispose();}});
  await page.locator('#manual-number-grid button[data-number="'+next+'"]').click();
  await page.waitForFunction(({received,processed})=>__qa278.app.draws.length===received&&SixDropV247.engine.processed===processed&&!SixDropV247.engine.busy&&!SixDropV247.engine.fx,{received:i+1,processed:expectedProcessed[i+1]},{timeout:90000});
  expected=plan.state;
  const view=await page.evaluate(snapshot);assert.deepEqual(view.state,expected,'live board, RNG, table payout and bank at ball '+(i+1));
  assert.equal(view.engine.drawMode,'single');assert.equal(view.info.receivedBalls,i+1);assert.equal(view.info.processedBalls,i+1);assert.equal(view.state.processed,i+1);assertHud(view,s);
  blasts.push(assertPrimaryRemoval(before,next,view.events.slice(eventCursor)));eventCursor=view.events.length;
  if(anchors)assertFixedAnchors(fixedAnchors(view.hud),anchors,'after ball '+(i+1));
  if(paint){
   const overlay=await paint;assert(overlay);
   const native=plan.timeline.find(event=>event.phase==='pyramidAllClear'&&event.winMedals===overlay.event.win);assert(native,'the captured all-clear has the actual native event WIN');
   if(overlay.renderer===296){assert.equal(overlay.rendered.win,native.winMedals);assert.equal(overlay.rendered.label,overlay.event.label);assert.equal(overlay.rendered.detail,overlay.event.detail);assert.equal(overlay.rendered.liveLabel,'全消し '+native.allClears+'回目！');assert.equal(overlay.rendered.winText,Number(native.winMedals).toLocaleString('ja-JP')+' WIN');}
   const file=label+'-allclear-overlay.png';await fs.writeFile(path.join(output,file),Buffer.from(overlay.data.slice('data:image/png;base64,'.length),'base64'));delete overlay.data;report.screens.push(file);report[label+'Overlay']=overlay;await shot(label+'-allclear-earned');seenClear=true;
  }
  if(capture&&[2,4,7].includes(i+1))await shot(label+'-ball'+(i+1));
 }
 // The native completion hook holds payout until its last award finishes.
 // A settled board may be idle while this deliberate presentation hold runs.
 await page.waitForFunction(()=>__qa278.app.paid[2]&&!SixDropV247.engine.running,null,{timeout:45000});
 const result=await page.evaluate(snapshot);assertHud(result,s);assert.equal(result.app.roundWins[2],oracle.win);assert.equal(result.app.totalWin,oracle.win);
 const countUp=await page.evaluate(()=>{__qa278.captureCountUp=false;return __qa278.countUpSamples;});
 if(anchors){assert(countUp.length>1,'real animations provide multiple balance samples');for(const row of countUp)assertFixedAnchors(row.anchors,anchors,'during progressive count-up');assertFixedAnchors(fixedAnchors(result.hud),anchors,'settled round');}
 const positive=countUp.filter(row=>row.units>=oracle.initial.bankUnits);
 // Integer credit rounding is recorded per actual removed drop. A tween can
 // cross a zero-credit span or catch up from an unfinished previous stage;
 // it remains a convex interpolation of these real (bank,count) anchors.
 const perDrop=bet*R.creditPerDrop(oracle.initial),credits=[{bankUnits:oracle.initial.bankUnits,removedTotal:oracle.initial.removedTotal},...oracle.plans.flatMap(plan=>plan.timeline.flatMap(stage=>stage.progressiveCredits||[]))];
 const errorAt=point=>point.bankUnits-oracle.initial.bankUnits-(point.removedTotal-oracle.initial.removedTotal)*perDrop;
 const errors=credits.map(errorAt),minError=Math.min(...errors),maxError=Math.max(...errors);
 assert(credits.every(point=>Number.isInteger(point.bankUnits)&&Number.isInteger(point.removedTotal)),'actual traces record integer credit and drop anchors');
 assert(maxError-minError<1+1e-7,'per-drop integer rounding has less than one unit of cumulative error');
 for(const row of positive){
  assert(Number.isFinite(row.hostRemoved)&&Number.isFinite(row.hostUnits),'the host exposes its actual animated count and bank');
  assert.equal(row.units,row.hostUnits,'UI bank follows the same host animation clock');
  assert.equal(row.removed,Math.floor(row.hostRemoved+1e-7),'visible count floors actual removals, including zero-credit drops');
  const error=errorAt({bankUnits:row.units,removedTotal:row.hostRemoved});
  assert(error>=minError-1e-6&&error<=maxError+1e-6,'bank/count interpolation stays inside the exact real-credit rounding envelope');
  assert.equal(row.text,String(row.removed),'animated removal digits follow their observed count');
 }
 if(!s.mini&&capture&&oracle.state.roundRemoved>1){
  assert(positive.some(row=>row.removed>oracle.initial.removedTotal&&row.removed<oracle.state.removedTotal),'live removal count shows intermediate values during actual single-ball animations');
  for(let index=1;index<positive.length;index++)assert(positive[index].removed>=positive[index-1].removed,'the cumulative removal counter rises without reversing');
 }
 assert.deepEqual({bankUnits:result.carry.bankUnits,removed:result.carry.removed,feed:result.carry.feed},{bankUnits:R.carryOut(oracle.state).bankUnits,removed:R.carryOut(oracle.state).removed,feed:R.carryOut(oracle.state).feed});
 if(capture){assert(seenClear,'an actual all-clear paints the dedicated generated bitmap');assert.equal(result.miniBadge.hidden,false);await shot(label+'-completed');}
 if(capture){const degrees=blasts.flatMap(blast=>blast.degrees);assert(degrees.some(drop=>drop.validNeighbours<6),'a natural edge HIT removes only existing neighbours');assert(degrees.some(drop=>drop.occupiedNeighbours===6),'a natural interior HIT removes all six existing neighbours');}
 report[label]={seed,bet,win:oracle.win,clearCount:oracle.state.allClears,bonusMedals:oracle.state.bonusMedals,counts:oracle.state.counts,carry:result.carry,ui:result.ui,hud:result.hud,rows:result.rows,anchors,countUp,creditRounding:{perDrop,minError,maxError,anchors:credits.length},blasts,events:result.events};return result;
}
async function nextRound(seed,bet){
 await page.waitForFunction(()=>['complete','ready'].includes(__qa278.app.phase),null,{timeout:30000});
 // The production result screen advances automatically after its eight-second
 // countdown. Its legacy result-next button stays hidden in this edition.
 await page.waitForFunction(()=>__qa278.app.phase==='ready'&&__qa278.app.draws.length===0,null,{timeout:30000});
 await page.evaluate(({seed,bet})=>{const q=__qa278;q.app.engines[2].random=()=>seed/4294967296;if(!SweetsLocalDebugV258.setBets(q.app.bets.map((_n,i)=>i===2?bet:0)))throw Error('next BET failed');q.select(2);q.syncManualNumbers();q.events=[];},{seed,bet});
 await startManualRound('next-round-seed-'+seed,30000);
}
async function workerCase(){
 computer=createDownloadComputerV255({baseUrl:base});
 const input={version:255,sessionId:'sixdrop-v284-download-first',machineId:'qa-machine',playerId:'isolated',requestId:'native-v284-first',seed:25519,createdAt:1795046400000,bets:ids.map(id=>id==='candy'?3000:0),gameIds:ids,rate:90,creditBefore:1000000,totalBet:3000,previousState:null,sugarState:null,sixDropCarry:prior,profile:{name:'ISOLATED QA'}};
 function checkComputed(result,carry){
  const s=result.initialState.engines[2].state;assert.equal(s.rulesRevision,REVISION);assert.deepEqual(s.carryAtStart,R.cleanCarry(carry));assert(Number.isSafeInteger(s.rng),'native downloaded checkpoint retains deterministic RNG');
  let state=clone(s);for(let ball=0;ball<=8;ball++){if(ball)state=R.hit(state,result.numbers[ball-1]).state;const saved=result.playback.checkpoints[ball];assert.equal(saved.engines[2].processed,ball);assert.deepEqual(saved.engines[2].state,state,'download actual single-ball checkpoint '+ball);}
  assert.equal(result.games[2].win,R.totalMedals(state));assert.deepEqual(result.games[2].carryV247,R.carryOut(state,result.sessionId));
 }
 const first=await computer.compute(input),games=[];
 checkComputed(first,prior);games.push({index:0,seed:input.seed,win:first.totalWin,carry:first.games[2].carryV247});
 const saved=first.games[2].carryV247;
 // Every attempt starts from the same actual checkpoint. Find a real positive
 // physical round under the new payout rules instead of assuming the v283
 // hard-coded physics seed still wins. No supplied board or win is injected.
 let second,secondSeed;const positiveAttempts=[],positiveDeadline=Date.now()+240000;
 for(let seed=25520;seed<25536;seed++){
  const remaining=positiveDeadline-Date.now();assert(remaining>0,'positive physical carry witness search stays within four minutes');
  let timer,result;const attemptStarted=Date.now();
  try{result=await Promise.race([
   computer.compute({...input,sessionId:'sixdrop-v284-download-next-'+seed,requestId:'native-v284-next-'+seed,seed,bets:ids.map(id=>id==='candy'?301:0),totalBet:301,previousState:first.finalState,creditBefore:first.finalState.credit,sixDropCarry:saved}),
   new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('positive physical carry witness search exceeded four minutes')),remaining);timer.unref?.();})
  ]);}finally{clearTimeout(timer);}
  checkComputed(result,saved);assert.equal(result.finalState.credit,first.finalState.credit-301+result.totalWin);
  positiveAttempts.push({seed,win:result.games[2].win,durationMs:Date.now()-attemptStarted});
  if(result.games[2].win>0){second=result;secondSeed=seed;break;}
 }
 assert(second,'a real positive carry witness exists in the bounded current-rule physical seed set');
 assert.deepEqual(second.initialState.engines[2].state.carryAtStart,R.cleanCarry(saved));assert.equal(second.initialState.engines[2].state.bankUnits,saved.bankUnits);assert.equal(second.initialState.engines[2].state.bet,301);
 assert.equal(second.finalState.credit,first.finalState.credit-301+second.totalWin);games.push({index:1,seed:secondSeed,win:second.totalWin,carry:second.games[2].carryV247});
 assert(second.games[2].win>0,'the second actual physical round earns a positive carry witness');
 const positiveCarry=second.games[2].carryV247;
 const third=await computer.compute({...input,sessionId:'sixdrop-v284-download-positive-carry',requestId:'native-v284-positive-carry',seed:secondSeed,bets:ids.map(id=>id==='candy'?7:0),totalBet:7,previousState:second.finalState,creditBefore:second.finalState.credit,sixDropCarry:positiveCarry});
 checkComputed(third,positiveCarry);
 assert.deepEqual(third.initialState.engines[2].state.carryAtStart,R.cleanCarry(positiveCarry));assert.equal(third.initialState.engines[2].state.bankUnits,positiveCarry.bankUnits);assert.deepEqual(third.initialState.engines[2].state.palette,R.palette(positiveCarry.removed,third.initialState.engines[2].state));
 assert.equal(third.finalState.credit,second.finalState.credit-7+third.totalWin);assert.equal(third.games[2].win,R.totalMedals(third.finalState.engines[2].state));games.push({index:2,seed:secondSeed,win:third.totalWin,carry:third.games[2].carryV247});
 await fs.writeFile(path.join(output,'download-first.json'),JSON.stringify(first));await fs.writeFile(path.join(output,'download-next.json'),JSON.stringify(second));await fs.writeFile(path.join(output,'download-positive-carry.json'),JSON.stringify(third));report.download={games,positiveAttempts,completed:computer.status().completed,numbers:first.numbers,processed:first.playback.checkpoints.map(s=>s.engines[2].processed)};
 await computer.close();computer=null;
}
try{
 browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{}),args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 for(const s of planned){current=s.id;const started=Date.now();try{
  if(s.worker)await workerCase();else{
   await open(s);const first=await play(s);
   if(s.cycle){
    // Reuse a natural zero-WIN witness with this exact carried palette/BET.
    // Repeated winning carry is already covered by the host and worker tests.
    let ownZero=fullRound(losing.seed,{bet:301,carry:first.carry});
    for(let seed=1;ownZero.win!==0&&seed<=2000;seed++)ownZero=fullRound(seed,{bet:301,carry:first.carry});
    assert.equal(ownZero.win,0,'a natural own zero WIN exists with the actual carried balance');
    const anchors=fixedAnchors(first.hud);
    await nextRound(ownZero.seed,301);const carried=await page.evaluate(snapshot);assert.equal(carried.state.bankUnits,first.carry.bankUnits);assert(carried.info.continuationActive);assert.deepEqual(carried.state.palette,R.palette(first.carry.removed,carried.state));assert.equal(carried.hud.receiptHidden,true);assertFixedAnchors(fixedAnchors(carried.hud),anchors,'carried balance with changed BET');await shot('desktop-carried-bet-change');
    const zero=await play(s,{seed:ownZero.seed,bet:301,carry:first.carry,label:'desktop-own-zero',capture:false});assert.equal(zero.app.totalWin,0);assert.equal(zero.carry.bankUnits,0);assert.equal(zero.carry.removed,0);assert.equal(zero.info.continuationActive,false);assertFixedAnchors(fixedAnchors(zero.hud),anchors,'own zero WIN hides continuation without shifting labels');
    await nextRound(winning.seed,3000);const reset=await page.evaluate(snapshot);assert.equal(reset.state.bankUnits,0);assert.equal(reset.hud.continuationHidden,true);assertFixedAnchors(fixedAnchors(reset.hud),anchors,'new zero-balance round');await shot('desktop-after-own-zero');
   }
  }
  report.caseResults.push({id:current,status:'passed',durationMs:Date.now()-started});console.log('SIXDROP_V284_BROWSER_CASE_PASS',current);
 }catch(error){
  const failure={id:current,message:String(error),stack:error.stack,computer:computer?.status()};if(page)try{failure.diagnostics=await page.evaluate(snapshot);failure.screenshot='failure-'+current+'.png';await page.screenshot({path:path.join(output,failure.screenshot)});}catch{}
  report.failures.push(failure);report.caseResults.push({id:current,status:'failed',durationMs:Date.now()-started,message:String(error)});console.error('SIXDROP_V284_BROWSER_CASE_FAIL',current,String(error));
 }finally{await computer?.close();computer=null;}}
 assert.equal(report.pageErrors.length,0,'no runtime page errors');assert.equal(report.assetFailures.length,0,'all generated UI assets load');assert.equal(report.apiRequests.length,0,'no wallet/server API is contacted');
 assert.equal(report.caseResults.length,planned.length);assert.equal(report.failures.length,0,'every browser scenario passes');report.ok=true;
}catch(error){report.ok=false;report.error=String(error);process.exitCode=1;}
finally{await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');await context?.close();await browser?.close();await new Promise(resolve=>server.close(resolve));console.log('SIXDROP_V284_BROWSER_REPORT',output+'/report.json');}

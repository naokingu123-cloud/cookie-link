/* CI browser evidence for the v280 cabinet. One real eight-ball round, then
 * viewport/miniature checks of that same result. No public wallet is used. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {once} from 'node:events';
import {createRequire} from 'node:module';
import {chromium} from 'playwright';
const {R,NUMBERS,fullRound}=createRequire(import.meta.url)('./sixdrop-v278-fixture.cjs');
const root=process.cwd(),output='qa-sixdrop-v280',cases=['ready-restoration','desktop-round','mobile-fit','mini-result'];
if(process.argv.includes('--list-cases')){console.log(JSON.stringify({shard:0,shards:1,totalPlannedCases:cases.length,plannedCases:cases}));process.exit(0);}
await fs.mkdir(output,{recursive:true});
const version=JSON.parse(await fs.readFile('app-version.json','utf8')).version;
const prior={version:247,bankUnits:12345678900,removed:99,feed:450,roundId:'qa-v280-prior'},bet=300000;
let oracle;
for(let seed=1;seed<=2000&&!oracle;seed++){
 const round=fullRound(seed,{bet,carry:prior,rulesRevision:280});
 if(round.state.allClears>0&&round.state.counts.line>=2)oracle=round;
}
assert(oracle,'a natural revision-280 all-clear witness exists');
const report={version,shard:0,shards:1,totalPlannedCases:cases.length,plannedCases:cases,caseResults:[],failures:[],screens:[],pageErrors:[],assetFailures:[],apiRequests:[],externalRequests:[],scope:'One real local manual eight-ball round; current core oracle; PC/390px/mini; inherited and reset display; no public CREDIT',witness:{seed:oracle.seed,bet,numbers:NUMBERS,win:oracle.win,allClears:oracle.state.allClears}};
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.png':'image/png','.webp':'image/webp','.avif':'image/avif','.svg':'image/svg+xml','.wav':'audio/wav','.mp3':'audio/mpeg','.woff2':'font/woff2'};
const bridge='\n;window.__qa280={app,slots,select,syncManualNumbers,scheduleUI,stopResultAuto,get active(){return active;},point:sixXY,rowWidth:sixRowWidth,backdrop:sixArtBackdrop,roleIcon:sixDrawRoleIcon};\n';
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1');
 if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/ws')){report.apiRequests.push(url.pathname);res.writeHead(451).end();return;}
 const file=path.resolve(root,'.'+decodeURI(url.pathname==='/'?'/index.html':url.pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 try{let body=await fs.readFile(file);if(file.endsWith('/assets/sixdrop-ui-v278.js'))body=Buffer.concat([body,Buffer.from(bridge)]);res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream','cache-control':'no-store'});res.end(body);}catch{res.writeHead(404).end();}
});
server.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;
let browser,context,page,current;
const processed=[0,0,0,3,3,5,6,7,8];
async function shot(label){const name=label+'.png';await page.screenshot({path:path.join(output,name)});report.screens.push(name);return name;}
async function checked(name,fn){current=name;const started=Date.now();await fn();report.caseResults.push({id:name,status:'passed',durationMs:Date.now()-started});console.log('SIXDROP_V280_BROWSER_CASE_PASS',name);}
function snapshot(){
 const q=__qa280,e=SixDropV247.engine,box=node=>{if(!node)return null;const b=node.getBoundingClientRect();return {left:b.left,top:b.top,right:b.right,bottom:b.bottom,width:b.width,height:b.height};};
 const bank=document.getElementById('sd278-bank'),counter=document.getElementById('sd280-removed'),earned=document.getElementById('sd278-clear-earned');
 const pseudo=(selector,part)=>{const node=document.querySelector(selector);if(!node)return null;const s=getComputedStyle(node,part);return {display:s.display,content:s.content,background:s.backgroundImage,border:s.borderWidth,shadow:s.boxShadow};};
 return {state:e.state,engine:{processed:e.processed,running:e.running,busy:e.busy,phase:e.phase,drawMode:e.drawMode},info:SixDropV247.describeV278(),ui:SixDropUiV278.describe(),carry:SixDropV247.carry,
  app:{phase:q.app.phase,draws:q.app.draws,roundWins:q.app.roundWins,totalWin:q.app.totalWin,credit:q.app.credit},
  layout:{bottle:box(document.querySelector('.sd278-bottle-art')),canvas:box(q.slots[2].candyCanvas),strip:box(document.querySelector('.sd278-progressive')),logo:box(document.querySelector('.sd278-bank-logo')),bank:box(bank),digits:box(bank.querySelector('.gold-number')),counter:box(counter),counterDigits:box(counter.querySelector('.gold-number')),counterValue:box(counter.querySelector('strong'))},
  bankText:bank.textContent,counterText:counter.querySelector('strong').textContent,receipt:{hidden:earned.hidden,count:Number(earned.dataset.count),win:Number(earned.dataset.win),box:box(earned),amount:box(earned.querySelector('.sd278-earned-win')),digits:box(earned.querySelector('.gold-number'))},
  batches:document.getElementById('sd278-batches')?.textContent||'',
  legacy:{fieldBefore:pseudo('#screen>.game>.field','::before'),fieldAfter:pseudo('#screen>.game>.field','::after'),viewportAfter:pseudo('.sd278-bottle','::after'),festivalBefore:pseudo('#screen>.game>.festival-top','::before'),festivalAfter:pseudo('#screen>.game>.festival-top','::after'),festival:pseudo('#screen>.game>.festival-top'),glass:pseudo('#screen>.game>.festival-top>.arcade-world-roulette-glass')},
  roles:[...document.querySelectorAll('#sd278-payouts section')].map(section=>({role:section.dataset.role,earned:Number(section.dataset.earnedCount),count:section.querySelector('.sd278-role-count').textContent,box:box(section),icon:box(section.querySelector('canvas')),shape:section.querySelector('canvas').dataset.shape,drops:Number(section.querySelector('canvas').dataset.drops),rows:[...section.querySelectorAll('tbody tr')].map(tr=>({count:Number(tr.dataset.count),label:tr.querySelector('th').textContent,hundredths:Number(tr.dataset.payoutHundredths),win:Number(tr.dataset.win),current:tr.getAttribute('aria-current')==='true',box:box(tr),cell:box(tr.querySelector('td')),digits:box(tr.querySelector('.gold-number'))}))})),
  mini:{hidden:q.slots[2].tab.querySelector('.sd278-mini-earned').hidden,text:q.slots[2].tab.querySelector('.sd278-mini-earned').textContent,paints:SixDropUiV278.describe().miniPaints}};
}
function assertValues(view,{settled=true}={}){
 assert.equal(view.ui.version,280);assert(view.ui.artLoaded);assert.deepEqual(view.ui.errors,[]);
 assert.equal(view.batches,'','the 3 / 2 / 1 / 1 / 1 schedule is not displayed');
 assert.equal(view.ui.removed.total,view.info.removedTotal);assert.equal(view.ui.removed.displayed,view.info.displayRemoved);
 assert.equal(view.counterText,String(view.ui.removed.displayed));
 if(settled){assert.equal(view.ui.removed.displayed,view.ui.removed.total);assert.equal(view.ui.progressive.units,view.ui.progressive.targetUnits);}
 assert.equal(view.bankText,String(Math.floor(view.ui.progressive.units/100)));
 const state=view.state,betValue=state?.bet||bet,revision=state||280;
 for(const role of view.roles){
  const count=state?.counts[role.role]||0;assert.equal(role.earned,count);assert.equal(role.count,'×'+count);assert.equal(role.shape,role.role);assert.equal(role.drops,role.role==='line'?4:6);
  for(const row of role.rows){assert.equal(row.label,'×'+row.count);assert.equal(row.hundredths,R.roleTotal(role.role,row.count,revision));assert.equal(row.win,Math.floor(betValue*row.hundredths/100));assert.equal(row.current,row.count===count);}
  if(count>0)assert(role.rows.some(row=>row.current));
 }
 if(state){assert.equal(view.receipt.count,state.allClears);assert.equal(view.receipt.win,state.bonusMedals);assert.equal(view.receipt.hidden,state.allClears===0);}
}
function assertLayout(view){
 const l=view.layout,scale=l.bottle.width/312,tolerance=2;
 assert(l.bottle.width>100&&Math.abs(l.bottle.width-l.bottle.height)<tolerance,'the new bottle stays square');
 for(const edge of ['left','right','top','bottom'])assert(Math.abs(l.canvas[edge]-l.bottle[edge])<tolerance,'canvas and bottle share '+edge);
 assert(l.strip.width<=l.bottle.width+tolerance&&l.strip.left>=l.bottle.left-tolerance&&l.strip.right<=l.bottle.right+tolerance,'all-clear strip fits the bottle width');
 assert(l.bank.left-l.logo.right<=5*scale&&l.bank.left>=l.logo.right-tolerance,'all-clear amount is beside its logo');
 assert(l.digits.left>=l.bank.left-tolerance&&l.digits.right<=l.bank.right+tolerance,'nine-digit progressive fits its space');
 assert(l.counter.top>=l.bottle.bottom-tolerance&&l.counter.top-l.bottle.bottom<=3*scale,'removed total sits directly below the bottle');
 assert(l.counter.width<=l.bottle.width+tolerance&&l.counterDigits.left>=l.counterValue.left-tolerance&&l.counterDigits.right<=l.counterValue.right+tolerance,'removed digits fit below the bottle');
 for(const key of ['fieldBefore','fieldAfter','viewportAfter','festivalBefore','festivalAfter']){assert.equal(view.legacy[key].display,'none',key+' is disabled');assert.equal(view.legacy[key].background,'none',key+' has no old bottle art');}
 assert.equal(view.legacy.festival.shadow,'none','the old cyan header frame is gone');assert.equal(view.legacy.festival.background,'none');assert.equal(view.legacy.festival.border,'0px');
 if(view.legacy.glass)assert.equal(view.legacy.glass.display,'none','the old cyan roulette-glass overlay is gone');
 if(!view.receipt.hidden)assert(view.receipt.digits.left>=view.receipt.amount.left-tolerance&&view.receipt.digits.right<=view.receipt.amount.right+tolerance,'earned all-clear amount stays inside its row');
 for(const role of view.roles){
  assert(role.icon.height>=28*scale&&role.icon.width>=45*scale,'the actual candy diagram is readable');
  for(const row of role.rows){assert(row.digits.left>=row.cell.left-tolerance&&row.digits.right<=row.cell.right+tolerance,role.role+' payout digits fit');assert(row.box.top>=role.box.top-tolerance&&row.box.bottom<=role.box.bottom+tolerance,role.role+' rows fit their frame');}
 }
}
function artEvidence(){
 const q=__qa280,source=document.querySelector('.sd278-bottle-art'),art=document.createElement('canvas');art.width=source.naturalWidth;art.height=source.naturalHeight;
 const x=art.getContext('2d');x.drawImage(source,0,0);const pixels=x.getImageData(0,0,art.width,art.height).data,geometry=SixDropUiV278.describe().geometry,positions=[];
 // Sample the full board, including the live idle breathing envelope. This
 // detects a wider board crossing an opaque PNG shoulder or bottom corner.
 const rows=SixDropV247.engine.rows;
 for(let row=0;row<rows;row++)for(let col=0;col<q.rowWidth(row,rows);col++){
  const p=q.point(row,col,rows);let maxAlpha=0;
  for(const lift of [-.9,0,.9])for(let angle=0;angle<360;angle++){
   const a=angle*Math.PI/180,cx=p.x+Math.cos(a)*geometry.radius*1.02,cy=p.y+lift+Math.sin(a)*geometry.radius*1.02;
   const ix=Math.round(cx*art.width/320),iy=Math.round(cy*art.height/320);maxAlpha=Math.max(maxAlpha,pixels[(iy*art.width+ix)*4+3]||0);
  }
  positions.push({row,col,...p,maxAlpha});
 }
 const backdrop=q.backdrop(10),oldPixels=backdrop.getContext('2d').getImageData(0,0,320,320).data;let backdropAlpha=0;
 for(let at=3;at<oldPixels.length;at+=4)backdropAlpha+=oldPixels[at];
 const icons=[...document.querySelectorAll('.sd278-role-icon')].map(icon=>{
  const expected=document.createElement('canvas');expected.width=120;expected.height=80;q.roleIcon(expected,icon.dataset.shape,SixDropV247.engine.roundIndex||1);
  const a=icon.getContext('2d').getImageData(0,0,120,80).data,b=expected.getContext('2d').getImageData(0,0,120,80).data;let difference=0,ink=0;
  for(let at=0;at<a.length;at++){difference+=Math.abs(a[at]-b[at]);if(at%4===3)ink+=a[at];}
  return {role:icon.dataset.shape,difference,ink};
 });
 return {positions,geometry,backdropAlpha,icons};
}
async function restoreCarry(carry){
 await page.evaluate(carry=>{if(!SixDropV247.restoreLocalCarryV278(carry))throw Error('ready local carry restore rejected');__qa280.scheduleUI(__qa280.app);},carry);
 await page.waitForFunction(total=>SixDropUiV278.describe().removed.total===total&&SixDropUiV278.describe().removed.displayed===total,carry.removed);
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const view=await page.evaluate(snapshot);assertValues(view);assert.equal(view.ui.removed.total,carry.removed);return view;
}
try{
 const executablePath=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||process.env.PLAYWRIGHT_EXECUTABLE_PATH;
 browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{}),args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 context=await browser.newContext({viewport:{width:1366,height:900},serviceWorkers:'block'});
 await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin!==base){report.externalRequests.push(url.href);return route.abort();}if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/ws')){report.apiRequests.push(url.pathname);return route.abort();}return route.continue();});
 page=await context.newPage();page.on('pageerror',error=>report.pageErrors.push(String(error.stack||error)));page.on('response',res=>{if(res.status()>=400&&/sixdrop|v280/.test(res.url()))report.assetFailures.push({url:res.url(),status:res.status()});});
 await page.goto(base+'/?edition=local&appv='+encodeURIComponent(version),{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__qa280&&window.SweetsLocalDebugV258?.ready&&window.SixDropUiV278&&window.SweetsAwardsV277,null,{timeout:90000});
 assert.equal(await page.evaluate(()=>SixDropUiV278.ready),true);await page.evaluate(()=>document.fonts.ready);
 await page.locator('#manual-number-toggle').click();await page.waitForFunction(()=>SweetsLocalDebugV258.describe().manualNumbers&&__qa280.app.phase==='ready');
 await page.evaluate(({seed,bet})=>{const q=__qa280;if(!SweetsLocalDebugV258.setBets(q.app.bets.map((_n,i)=>i===2?bet:0)))throw Error('local BET setup failed');q.app.engines[2].random=()=>seed/4294967296;q.select(2);q.syncManualNumbers();q.scheduleUI(q.app);},{seed:oracle.seed,bet});
 await checked('ready-restoration',async()=>{
  const zero={version:247,bankUnits:0,removed:0,feed:0,roundId:''};report.restore=[];
  for(const carry of [zero,prior,zero,prior]){const view=await restoreCarry(carry);assertLayout(view);report.restore.push(view.ui.removed);}
  const evidence=await page.evaluate(artEvidence);report.art=evidence;
  assert.equal(evidence.positions.length,75);assert.deepEqual(Array.from({length:10},(_,row)=>evidence.positions.filter(p=>p.row===row).length),oracle.initial.grid.map(row=>row.length),'PNG checks enumerate the actual native board cells');
  assert(Math.abs(evidence.geometry.step-29.4)<.001);assert(evidence.geometry.step>27.745*1.05,'native drop diameter increases by more than 5% while fitting the bottle');
  assert(evidence.positions.every(p=>p.maxAlpha<=80),'all 75 breathing drops fit the PNG transparent interior: '+JSON.stringify(evidence.positions.filter(p=>p.maxAlpha>80)));assert.equal(evidence.backdropAlpha,0,'legacy canvas jar outline is removed');
  for(const icon of evidence.icons){assert.equal(icon.difference,0,'role diagram uses the actual native candy layout');assert(icon.ink>100000,'role diagram has visible candy pixels');}
  await shot('desktop-ready');
 });
 await checked('desktop-round',async()=>{
  await page.locator('#manual-start').click();await page.waitForFunction(()=>__qa280.app.phase==='playing'&&SixDropV247.engine.idle,null,{timeout:45000});
  let view=await page.evaluate(snapshot);assert.deepEqual(view.state,oracle.initial);assertValues(view);assertLayout(view);await shot('desktop-filled-bottle');
  await page.evaluate(()=>{const q=__qa280;q.counterSamples=[];q.watchCounter=true;const tick=()=>{if(!q.watchCounter)return;const d=SixDropUiV278.describe(),e=SixDropV247.engine,last=q.counterSamples.at(-1),sample={displayed:d.removed.displayed,total:d.removed.total,bank:d.progressive.units,clears:e.state?.allClears||0,phase:e.fx?.phase||e.phase};if(!last||sample.displayed!==last.displayed||sample.total!==last.total||sample.clears!==last.clears)q.counterSamples.push(sample);requestAnimationFrame(tick);};requestAnimationFrame(tick);});
  let group=0,expected=oracle.initial,clearCaptured=false;
  for(let i=0;i<8;i++){
   const closes=[3,5,6,7,8].includes(i+1),plan=closes?oracle.plans[group]:null;let capture;
   if(plan?.allClear&&!clearCaptured)capture=page.waitForFunction(()=>{const active=SweetsAwardsV277.describe().active.find(item=>item.game==='candy'&&item.kind==='clear');return active&&active.age>180&&SixDropUiV278.describe().allClearBadgePaints>0;},null,{polling:'raf',timeout:60000}).then(()=>shot('desktop-allclear-live'));
   await page.locator('#manual-number-grid button[data-number="'+NUMBERS[i]+'"]').click();
   await page.waitForFunction(({balls,done})=>__qa280.app.draws.length===balls&&SixDropV247.engine.processed===done&&!SixDropV247.engine.busy&&!SixDropV247.engine.fx,{balls:i+1,done:processed[i+1]},{timeout:90000});
   if(closes){expected=plan.state;group++;}view=await page.evaluate(snapshot);
   assert.deepEqual(view.state,expected,'native board/RNG/payout state is unchanged at ball '+(i+1));assert.equal(view.engine.drawMode,'grouped');assertValues(view);assertLayout(view);
   if(capture){await capture;clearCaptured=true;await shot('desktop-allclear-earned');}
  }
  await page.waitForFunction(()=>__qa280.app.paid[2]&&!SixDropV247.engine.running,null,{timeout:45000});
  // Keep this completed result on screen while inspecting its two layouts.
  await page.evaluate(()=>__qa280.stopResultAuto());view=await page.evaluate(snapshot);assertValues(view);assertLayout(view);assert(clearCaptured);
  assert.equal(view.app.roundWins[2],oracle.win);assert.equal(view.app.totalWin,oracle.win);assert.equal(view.ui.removed.total,oracle.state.removedTotal);
  const carry=R.carryOut(oracle.state);for(const key of ['bankUnits','removed','feed'])assert.equal(view.carry[key],carry[key]);
  const samples=await page.evaluate(()=>{__qa280.watchCounter=false;return __qa280.counterSamples;});assert(samples.length>5);
  assert(samples.every((sample,i)=>!i||sample.displayed>=samples[i-1].displayed),'the count stays monotonic across real all-clears');assert(samples.some(sample=>sample.displayed>prior.removed&&sample.displayed<sample.total),'real removal events count through intermediate values');assert.equal(samples.at(-1).displayed,oracle.state.removedTotal);
  report.counterSamples=samples;report.result=view;await shot('desktop-completed');
 });
 await checked('mobile-fit',async()=>{
  await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>document.querySelector('.sd278-bottle-art').getBoundingClientRect().width<312);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const view=await page.evaluate(snapshot);assertValues(view);assertLayout(view);assert.deepEqual(view.state,oracle.state,'viewport fitting does not mutate the result');report.mobile=view.layout;await shot('mobile-390-completed');
 });
 await checked('mini-result',async()=>{
  const before=await page.evaluate(()=>JSON.stringify(SixDropV247.engine.state));await page.evaluate(()=>__qa280.select(3));await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const view=await page.evaluate(snapshot);assert.equal(view.mini.hidden,false);assert(view.mini.text.includes('全消し獲得'));assert(view.mini.paints>0);assert.equal(await page.evaluate(()=>JSON.stringify(SixDropV247.engine.state)),before,'mini selection preserves the settled state');report.mini=view.mini;await shot('mobile-390-mini-earned');
 });
 assert.equal(report.pageErrors.length,0);assert.equal(report.assetFailures.length,0);assert.equal(report.apiRequests.length,0);assert.equal(report.externalRequests.length,0);assert.equal(report.caseResults.length,cases.length);report.ok=true;
}catch(error){
 report.ok=false;report.error=String(error);report.failures.push({id:current,message:String(error),stack:error.stack});report.caseResults.push({id:current,status:'failed',message:String(error)});process.exitCode=1;
 console.error('SIXDROP_V280_BROWSER_CASE_FAIL',current||'setup',String(error));
 if(page)try{report.diagnostics=await page.evaluate(snapshot);await shot('failure-'+current);}catch{}
}finally{
 await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');await context?.close();await browser?.close();await new Promise(resolve=>server.close(resolve));console.log('SIXDROP_V280_BROWSER_REPORT',output+'/report.json');
}

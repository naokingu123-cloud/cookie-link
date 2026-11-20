/* CI-only browser QA. Every visible HIT comes from the existing number picker;
 * no award is emitted by the test and no public wallet endpoint is reachable. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {once} from 'node:events';
import {createRequire} from 'node:module';
import {chromium} from 'playwright';
import {createDownloadComputerV255} from '../server-download-compute-v255.mjs';
const {R,clone,NUMBERS,batches,fullRound}=createRequire(import.meta.url)('./sixdrop-v278-fixture.cjs');
const root=process.cwd(),output='qa-sixdrop-v278',ids=['cookie','choco','candy','gelato','winery','popcorn','jelly','stick','castella','dango'];
const scenarios=[{id:'desktop-cycle',width:1366,height:900,cycle:true},{id:'mobile-high-amount',width:390,height:844,bet:300000},{id:'mini-allclear',width:390,height:844,mini:true},{id:'download-worker',worker:true}];
const shard=Number(process.env.SIXDROP_QA_SHARD??0),shards=Number(process.env.SIXDROP_QA_SHARDS??1);
assert(Number.isInteger(shards)&&shards>0&&shards<=scenarios.length);assert(Number.isInteger(shard)&&shard>=0&&shard<shards);
const planned=scenarios.filter((_s,i)=>i%shards===shard);
if(process.argv.includes('--list-cases')){console.log(JSON.stringify({shard,shards,totalPlannedCases:scenarios.length,plannedCases:planned.map(s=>s.id)}));process.exit(0);}
await fs.mkdir(output,{recursive:true});
const version=JSON.parse(await fs.readFile('app-version.json','utf8')).version;
const prior={version:247,bankUnits:123456,removed:99,feed:450,roundId:'qa-previous-completed'};
// Find a real generated witness in the current revision. The settled state is
// then calculated independently in Node and compared to each live UI boundary.
let winning,losing;
for(let seed=1;seed<=2000&&(!winning||!losing);seed++){
 const candidate=fullRound(seed,{bet:3000,carry:prior});
 if(!winning&&candidate.state.allClears>0&&candidate.state.counts.line>=2)winning=candidate;
 if(!losing&&candidate.win===0)losing=candidate;
}
assert(winning&&losing,'natural current-rule witnesses exist for all-clear and own zero WIN');
const report={version,shard,shards,totalPlannedCases:scenarios.length,plannedCases:planned.map(s=>s.id),caseResults:[],failures:[],screens:[],pageErrors:[],assetFailures:[],apiRequests:[],externalRequests:[],witnesses:{winning:{seed:winning.seed,win:winning.win,counts:winning.state.counts,allClears:winning.state.allClears,numbers:NUMBERS},losing:{seed:losing.seed,win:losing.win}},scope:'Real manual number buttons; production grouped rules, native payout, local continuation and download worker; isolated virtual CREDIT'};
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
const expectedProcessed=[0,0,0,3,3,5,6,7,8];
async function open(s){
 await context?.close();context=await browser.newContext({viewport:{width:s.width,height:s.height},serviceWorkers:'block'});
 await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin!==base){report.externalRequests.push(u.href);return route.abort();}if(u.pathname.startsWith('/api/')||u.pathname.startsWith('/ws')){report.apiRequests.push(u.pathname);return route.abort();}return route.continue();});
 page=await context.newPage();page.on('pageerror',e=>report.pageErrors.push({case:current,error:String(e.stack||e)}));
 page.on('response',res=>{if(res.status()>=400&&/sixdrop|v278/.test(res.url()))report.assetFailures.push({case:current,url:res.url(),status:res.status()});});
 await page.goto(base+'/?edition=local&appv='+encodeURIComponent(version),{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__qa278&&SweetsLocalDebugV258?.ready&&window.SixDropUiV278&&window.SweetsAwardsV277,null,{timeout:90000});
 assert.equal(await page.evaluate(()=>SixDropUiV278.ready),true);await page.evaluate(()=>document.fonts.ready);
 await page.locator('#manual-number-toggle').click();
 await page.waitForFunction(()=>SweetsLocalDebugV258.describe().manualNumbers&&__qa278.app.phase==='ready');
 await page.evaluate(({prior,seed,bet})=>{
  const q=__qa278,candy=q.app.engines[2];if(!SixDropV247.restoreLocalCarryV278(prior))throw Error('local carry bootstrap rejected');
  if(!SweetsLocalDebugV258.setBets(q.app.bets.map((_n,i)=>i===2?bet:0)))throw Error('local BET setup failed');
  candy.random=()=>seed/4294967296;q.select(2);q.syncManualNumbers();q.scheduleUI(q.app);
  const emit=candy.emit;candy.emit=function(phase,detail={}){q.events.push({phase,winMedals:detail.winMedals,allClears:detail.allClears,bonusMedals:detail.bonusMedals,numbers:detail.numbers,counts:detail.counts,gain:detail.gain});return Reflect.apply(emit,this,arguments);};q.events=[];
 },{prior,seed:winning.seed,bet:s.bet||3000});
 await page.locator('#manual-start').click();
 await page.waitForFunction(()=>__qa278.app.phase==='playing'&&SixDropV247.engine.idle,null,{timeout:45000});
 if(s.mini)await page.evaluate(()=>__qa278.select(3));
}
function snapshot(){
 const q=__qa278,e=SixDropV247.engine,d=SixDropUiV278.describe(),box=node=>{if(!node)return null;const b=node.getBoundingClientRect();return {left:b.left,top:b.top,right:b.right,bottom:b.bottom,width:b.width,height:b.height};};
 const rows=[...document.querySelectorAll('#sd278-payouts section')].map(section=>({role:section.dataset.role,earned:Number(section.dataset.earnedCount),box:box(section),rows:[...section.querySelectorAll('tbody tr')].map(tr=>({count:Number(tr.dataset.count),hundredths:Number(tr.dataset.payoutHundredths),win:Number(tr.dataset.win),current:tr.getAttribute('aria-current')==='true',box:box(tr),amount:box(tr.querySelector('.gold-number')),cell:box(tr.querySelector('td'))}))}));
 const bank=document.getElementById('sd278-bank'),receipt=document.getElementById('sd278-clear-earned'),continuation=document.getElementById('sd278-continuation'),canvas=q.slots[2].candyCanvas;
 return {state:e.state,engine:{processed:e.processed,accepted:e.accepted,busy:e.busy,running:e.running,phase:e.phase,drawMode:e.drawMode},info:SixDropV247.describeV278(),ui:d,carry:SixDropV247.carry,app:{phase:q.app.phase,draws:q.app.draws,roundWins:q.app.roundWins,totalWin:q.app.totalWin,credit:q.app.credit},rows,
  hud:{bank:box(bank),digits:box(bank.querySelector('.gold-number')),bankText:bank.textContent,continuation:box(continuation),continuationHidden:continuation.hidden,receipt:box(receipt),receiptHidden:receipt.hidden,receiptAmount:box(receipt.querySelector('.sd278-earned-win')),receiptDigits:box(receipt.querySelector('.sd278-earned-win .gold-number')),receiptText:receipt.querySelector('.sd278-earned-win').textContent,receiptWin:Number(receipt.dataset.win),receiptCount:Number(receipt.dataset.count),receiptLastWin:Number(receipt.dataset.lastWin),batches:[...document.querySelectorAll('#sd278-batches>span')].map(n=>({size:Number(n.dataset.size),start:Number(n.dataset.start),end:Number(n.dataset.end),current:n.getAttribute('aria-current')}))},
  board:{canvas:box(canvas),bottle:box(document.querySelector('.sd278-bottle-art')),points:e.state?.grid.flatMap((row,r)=>row.flatMap((tile,c)=>tile?[{id:tile.id,number:tile.number,...q.point(r,c,10)}]:[]))},events:q.events.slice(),miniBadge:{hidden:q.slots[2].tab.querySelector('.sd278-mini-earned').hidden,text:q.slots[2].tab.querySelector('.sd278-mini-earned').textContent},awards:SweetsAwardsV277.describe()};
}
async function shot(label){const name=label+'.png';await page.screenshot({path:path.join(output,name)});report.screens.push(name);return name;}
function assertHud(view,{mini=false}={}){
 const endedLoss=view.engine.processed===8&&!view.engine.running&&!view.info.earnedContinuation,bank=endedLoss?0:view.state.bankUnits;
 assert(view.ui.artLoaded);assert.deepEqual(view.ui.errors,[]);assert.equal(view.ui.progressive.targetUnits,bank);
 assert.equal(view.ui.progressive.units,bank,'count-up finishes at the canonical balance, or zero after a completed loss');assert.equal(view.hud.bankText,String(Math.floor(bank/100)),'visible digits show the actual progressive');
 assert.equal(view.hud.continuationHidden,!view.info.continuationActive);assert.deepEqual(view.hud.batches.map(x=>x.size),[3,2,1,1,1]);
 assert.equal(view.hud.receiptCount,view.state.allClears);assert.equal(view.hud.receiptWin,view.state.bonusMedals);assert.equal(view.hud.receiptLastWin,view.state.lastAllClearWin);
 assert.equal(view.hud.receiptHidden,view.state.allClears===0);
 for(const role of view.rows){
  assert.equal(role.earned,view.state.counts[role.role]);assert.equal(role.rows.length,5);
  for(const row of role.rows){assert.equal(row.hundredths,R.roleTotal(role.role,row.count,278));assert.equal(row.win,Math.floor(view.state.bet*row.hundredths/100));assert.equal(row.current,row.count===role.earned);}
  if(role.earned>0)assert(role.rows.some(row=>row.current),'current attained count remains in the visible five-row table');
 }
 const radius=view.ui.geometry.radius;
 for(const point of view.board.points){assert(point.x-radius>=0&&point.x+radius<=320&&point.y-radius>=0&&point.y+radius<=320,'every actual candy/number center remains inside the native board');}
 if(!mini){
  assert(view.hud.bank.width>20&&view.hud.bank.height>10,'progressive digits have visible space');
  assert(view.hud.digits.left>=view.hud.bank.left-2&&view.hud.digits.right<=view.hud.bank.right+2,'progressive digits do not clip');
  assert(view.hud.continuationHidden||view.hud.continuation.left>=view.hud.bank.right-2,'continuation sits beside the amount');
  if(!view.hud.receiptHidden){
   assert.equal(view.hud.receiptText,String(view.state.bonusMedals),'earned receipt displays its actual awarded amount');
   const digits=view.hud.receiptDigits;assert(digits.width>=digits.height*view.hud.receiptText.length*.45,'receipt amount keeps readable digit proportions');
   assert(digits.left>=view.hud.receiptAmount.left-2&&digits.right<=view.hud.receiptAmount.right+2,'earned receipt amount fits its allocated space');
  }
  for(const role of view.rows)for(const row of role.rows){assert(row.amount.left>=row.cell.left-2&&row.amount.right<=row.cell.right+2,'payout '+role.role+' count '+row.count+' amount fits its cell');assert(row.box.top>=role.box.top-2&&row.box.bottom<=role.box.bottom+2,'all five '+role.role+' payout rows stay visible inside their frame');}
 }
}
function clearPaint({mini}){
 const current=SweetsAwardsV277.describe().active.find(c=>c.game==='candy'&&c.kind==='clear'),node=document.querySelector('.award-presentation-'+(mini?'mini':'main')+'[data-game="candy"]');
 if(!current||!node||node.hidden||current.age<180||!SixDropUiV278.describe().allClearBadgePaints)return null;
 const b=node.getBoundingClientRect();if(b.width<8||b.height<8)return null;
 return {event:current,box:{width:b.width,height:b.height},dedicatedPaints:SixDropUiV278.describe().allClearBadgePaints,data:node.toDataURL('image/png')};
}
async function play(s,{seed=winning.seed,bet=s.bet||3000,carry=prior,label=s.id,capture=true}={}){
 const oracle=fullRound(seed,{bet,carry});let expected=oracle.initial,groupIndex=0,seenClear=false;
 assert.deepEqual((await page.evaluate(snapshot)).state,expected,'live newGame equals the independent seeded core witness');
 if(capture)await shot(label+'-start');
 for(let i=0;i<8;i++){
  const next=NUMBERS[i],closing=[3,5,6,7,8].includes(i+1),plan=closing?oracle.plans[groupIndex]:null;
  let paint;
  if(capture&&plan?.allClear&&!seenClear)paint=page.waitForFunction(clearPaint,{mini:!!s.mini},{polling:'raf',timeout:45000}).then(async handle=>{try{const evidence=await handle.jsonValue();evidence.liveScreen=await shot(label+'-allclear-live');return evidence;}finally{await handle.dispose();}});
  await page.locator('#manual-number-grid button[data-number="'+next+'"]').click();
  await page.waitForFunction(({received,processed})=>__qa278.app.draws.length===received&&SixDropV247.engine.processed===processed&&!SixDropV247.engine.busy&&!SixDropV247.engine.fx,{received:i+1,processed:expectedProcessed[i+1]},{timeout:90000});
  if(closing){expected=plan.state;groupIndex++;}
  const view=await page.evaluate(snapshot);assert.deepEqual(view.state,expected,'live board, RNG, table payout and bank at ball '+(i+1));
  assert.equal(view.engine.drawMode,'grouped');assert.equal(view.info.receivedBalls,i+1);assert.equal(view.info.processedBalls,expectedProcessed[i+1]);assertHud(view,s);
  if(paint){const overlay=await paint;assert(overlay);const file=label+'-allclear-overlay.png';await fs.writeFile(path.join(output,file),Buffer.from(overlay.data.slice('data:image/png;base64,'.length),'base64'));delete overlay.data;report.screens.push(file);report[label+'Overlay']=overlay;await shot(label+'-allclear-earned');seenClear=true;}
  if(capture&&[2,4,7].includes(i+1))await shot(label+'-ball'+(i+1));
 }
 // The native completion hook holds payout until its last award finishes.
 // A settled board may be idle while this deliberate presentation hold runs.
 await page.waitForFunction(()=>__qa278.app.paid[2]&&!SixDropV247.engine.running,null,{timeout:45000});
 const result=await page.evaluate(snapshot);assertHud(result,s);assert.equal(result.app.roundWins[2],oracle.win);assert.equal(result.app.totalWin,oracle.win);
 assert.deepEqual({bankUnits:result.carry.bankUnits,removed:result.carry.removed,feed:result.carry.feed},{bankUnits:R.carryOut(oracle.state).bankUnits,removed:R.carryOut(oracle.state).removed,feed:R.carryOut(oracle.state).feed});
 if(capture){assert(seenClear,'an actual all-clear paints the dedicated generated bitmap');assert.equal(result.miniBadge.hidden,false);await shot(label+'-completed');}
 report[label]={seed,bet,win:oracle.win,clearCount:oracle.state.allClears,bonusMedals:oracle.state.bonusMedals,counts:oracle.state.counts,carry:result.carry,ui:result.ui,hud:result.hud,rows:result.rows,events:result.events};return result;
}
async function nextRound(seed,bet){
 await page.waitForFunction(()=>['complete','ready'].includes(__qa278.app.phase),null,{timeout:30000});
 if(await page.evaluate(()=>__qa278.app.phase==='complete'))await page.locator('#result-next').click();
 await page.waitForFunction(()=>__qa278.app.phase==='ready');
 await page.evaluate(({seed,bet})=>{const q=__qa278;q.app.engines[2].random=()=>seed/4294967296;if(!SweetsLocalDebugV258.setBets(q.app.bets.map((_n,i)=>i===2?bet:0)))throw Error('next BET failed');q.select(2);q.syncManualNumbers();q.events=[];},{seed,bet});
 await page.locator('#manual-start').click();await page.waitForFunction(()=>__qa278.app.phase==='playing'&&SixDropV247.engine.idle);
}
async function workerCase(){
 computer=createDownloadComputerV255({baseUrl:base});
 const input={version:255,sessionId:'sixdrop-v278-download-first',machineId:'qa-machine',playerId:'isolated',requestId:'native-v278-first',seed:25519,createdAt:1795046400000,bets:ids.map(id=>id==='candy'?3000:0),gameIds:ids,rate:90,creditBefore:1000000,totalBet:3000,previousState:null,sugarState:null,sixDropCarry:prior,profile:{name:'ISOLATED QA'}};
 const first=await computer.compute(input),games=[];
 for(const [index,result]of [[0,first]]){
  const s=result.initialState.engines[2].state;assert.equal(s.rulesRevision,278);assert.deepEqual(s.carryAtStart,R.cleanCarry(prior));assert(Number.isSafeInteger(s.rng),'native downloaded checkpoint retains deterministic RNG');
  let state=clone(s),group=0;for(let ball=0;ball<=8;ball++){if([3,5,6,7,8].includes(ball))state=R.hitBatch(state,batches(result.numbers)[group++]).state;const saved=result.playback.checkpoints[ball];assert.equal(saved.engines[2].processed,expectedProcessed[ball]);assert.deepEqual(saved.engines[2].state,state,'download actual checkpoint '+ball);}
  assert.equal(result.games[2].win,R.totalMedals(state));assert.deepEqual(result.games[2].carryV247,R.carryOut(state,result.sessionId));games.push({index,win:result.totalWin,carry:result.games[2].carryV247});
 }
 const saved=first.games[2].carryV247;
 const second=await computer.compute({...input,sessionId:'sixdrop-v278-download-next',requestId:'native-v278-next',seed:25520,bets:ids.map(id=>id==='candy'?301:0),totalBet:301,previousState:first.finalState,creditBefore:first.finalState.credit,sixDropCarry:saved});
 assert.deepEqual(second.initialState.engines[2].state.carryAtStart,R.cleanCarry(saved));assert.equal(second.initialState.engines[2].state.bankUnits,saved.bankUnits);assert.equal(second.initialState.engines[2].state.bet,301);
 assert.equal(second.finalState.credit,first.finalState.credit-301+second.totalWin);games.push({index:1,win:second.totalWin,carry:second.games[2].carryV247});
 assert(second.games[2].win>0,'the second actual physical round earns a positive carry witness');
 const positiveCarry=second.games[2].carryV247;
 const third=await computer.compute({...input,sessionId:'sixdrop-v278-download-positive-carry',requestId:'native-v278-positive-carry',seed:25520,bets:ids.map(id=>id==='candy'?7:0),totalBet:7,previousState:second.finalState,creditBefore:second.finalState.credit,sixDropCarry:positiveCarry});
 assert.deepEqual(third.initialState.engines[2].state.carryAtStart,R.cleanCarry(positiveCarry));assert.equal(third.initialState.engines[2].state.bankUnits,positiveCarry.bankUnits);assert.deepEqual(third.initialState.engines[2].state.palette,R.palette(positiveCarry.removed));
 assert.equal(third.finalState.credit,second.finalState.credit-7+third.totalWin);assert.equal(third.games[2].win,R.totalMedals(third.finalState.engines[2].state));games.push({index:2,win:third.totalWin,carry:third.games[2].carryV247});
 await fs.writeFile(path.join(output,'download-first.json'),JSON.stringify(first));await fs.writeFile(path.join(output,'download-next.json'),JSON.stringify(second));await fs.writeFile(path.join(output,'download-positive-carry.json'),JSON.stringify(third));report.download={games,completed:computer.status().completed,numbers:first.numbers,processed:first.playback.checkpoints.map(s=>s.engines[2].processed)};
 await computer.close();computer=null;
}
try{
 browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{}),args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 for(const s of planned){current=s.id;const started=Date.now();try{
  if(s.worker)await workerCase();else{
   await open(s);const first=await play(s);
   if(s.cycle){
    await nextRound(winning.seed,301);const carried=await page.evaluate(snapshot);assert.equal(carried.state.bankUnits,first.carry.bankUnits);assert(carried.info.continuationActive);assert.deepEqual(carried.state.palette,R.palette(first.carry.removed));assert.equal(carried.hud.receiptHidden,true);await shot('desktop-carried-bet-change');
    const second=await play(s,{seed:winning.seed,bet:301,carry:first.carry,label:'desktop-second',capture:false});
    await nextRound(losing.seed,3000);const zero=await play(s,{seed:losing.seed,bet:3000,carry:second.carry,label:'desktop-own-zero',capture:false});assert.equal(zero.app.totalWin,0);assert.equal(zero.carry.bankUnits,0);assert.equal(zero.carry.removed,0);assert.equal(zero.info.continuationActive,false);
    await nextRound(winning.seed,3000);assert.equal((await page.evaluate(snapshot)).state.bankUnits,0);await shot('desktop-after-own-zero');
   }
  }
  report.caseResults.push({id:current,status:'passed',durationMs:Date.now()-started});console.log('SIXDROP_V278_BROWSER_CASE_PASS',current);
 }catch(error){
  const failure={id:current,message:String(error),stack:error.stack,computer:computer?.status()};if(page)try{failure.diagnostics=await page.evaluate(snapshot);failure.screenshot='failure-'+current+'.png';await page.screenshot({path:path.join(output,failure.screenshot)});}catch{}
  report.failures.push(failure);report.caseResults.push({id:current,status:'failed',durationMs:Date.now()-started,message:String(error)});console.error('SIXDROP_V278_BROWSER_CASE_FAIL',current,String(error));
 }finally{await computer?.close();computer=null;}}
 assert.equal(report.pageErrors.length,0,'no runtime page errors');assert.equal(report.assetFailures.length,0,'all generated UI assets load');assert.equal(report.apiRequests.length,0,'no wallet/server API is contacted');
 assert.equal(report.caseResults.length,planned.length);assert.equal(report.failures.length,0,'every browser scenario passes');report.ok=true;
}catch(error){report.ok=false;report.error=String(error);process.exitCode=1;}
finally{await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');await context?.close();await browser?.close();await new Promise(resolve=>server.close(resolve));console.log('SIXDROP_V278_BROWSER_REPORT',output+'/report.json');}

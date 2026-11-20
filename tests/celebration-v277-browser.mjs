/* CI-only: genuine final draws from real-rule checkpoints, isolated local
 * virtual CREDIT, and transient canvas capture armed before the user input. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {once} from 'node:events';
import {chromium} from 'playwright';
import {buildAwardFixtures} from './award-fixtures-v277.mjs';
const root=process.cwd(),output='qa-celebration-v277',games=['cookie','choco','candy','gelato','winery','popcorn','jelly','stick','castella','dango'];
const soundBank='assets/audio/casino-v281/',soundVersion=281,soundCount=97;
const scenarios=[
 ...games.map(game=>({id:game,game,options:{}})),
 {id:'jelly-mobile',game:'jelly',options:{width:390,height:844,bet:300000,label:'jelly-mobile'}},
 {id:'dango-mini',game:'dango',options:{width:390,height:844,mini:true,label:'dango-mini'}},
 {id:'dango-reduced',game:'dango',options:{width:390,height:844,reduced:true,label:'dango-reduced'}},
 {id:'dango-muted',game:'dango',options:{muted:true,label:'dango-muted'}},
 {id:'candy-pause',game:'candy',options:{label:'candy-pause'},pause:true}
];
const shard=Number(process.env.CELEBRATION_QA_SHARD??0),shards=Number(process.env.CELEBRATION_QA_SHARDS??1);
assert(Number.isInteger(shards)&&shards>0&&shards<=scenarios.length,'valid positive shard count');
assert(Number.isInteger(shard)&&shard>=0&&shard<shards,'valid shard index');
assert.equal(new Set(scenarios.map(s=>s.id)).size,15,'all 15 scenarios have distinct identities');
const planned=scenarios.filter((_scenario,index)=>index%shards===shard);
if(process.argv.includes('--list-cases')){
 console.log(JSON.stringify({shard,shards,totalPlannedCases:scenarios.length,plannedCaseCount:planned.length,plannedCases:planned.map(s=>s.id)}));
 process.exit(0);
}
await fs.mkdir(output,{recursive:true});
const version=JSON.parse(await fs.readFile('app-version.json','utf8')).version,fixtures=await buildAwardFixtures();
const report={version,shard,shards,totalPlannedCases:scenarios.length,plannedCaseCount:planned.length,plannedCases:planned.map(s=>s.id),executedCaseCount:0,caseResults:[],failures:[],scope:'Curated real-rule checkpoint witnesses; functional presentation checks, not a probability sample',games:[],screens:[],overlayScreens:[],pageErrors:[],apiRequests:[],externalRequests:[],assetFailures:[],warnings:[]};
await fs.writeFile(path.join(output,'rule-witnesses.json'),JSON.stringify(Object.values(fixtures).map(({game,draws,next,proof})=>({game,draws,next,proof})),null,2)+'\n');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.svg':'image/svg+xml','.mp3':'audio/mpeg','.wav':'audio/wav','.avif':'image/avif'};
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1');
 if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/ws')){report.apiRequests.push(url.pathname);res.writeHead(451).end();return;}
 let file=path.resolve(root,'.'+decodeURI(url.pathname==='/'?'/index.html':url.pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 try{
  const stat=await fs.stat(file);if(stat.isDirectory())file=path.join(file,'index.html');let body=await fs.readFile(file);
  // Test-only bridge appended by this server. It is never written to or shipped
  // with the runtime, and exposes neither network nor wallet mutation methods.
  if(file.endsWith('/assets/award-presentation-v277.js'))body=Buffer.concat([body,Buffer.from('\n;window.__qa277={app,slots,select,syncManualNumbers,scheduleUI,syncPause,get active(){return active;},setPaused(value){userPaused=!!value;syncPause();}};\n')]);
  res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream','cache-control':'no-store'});res.end(body);
 }catch{res.writeHead(404).end();}
});
server.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;
let browser,context,page,current;
async function openGame(kind,{width=1366,height=900,bet=3000,reduced=false,muted=false,mini=false}={}){
 await context?.close();
 context=await browser.newContext({viewport:{width,height},serviceWorkers:'block',reducedMotion:reduced?'reduce':'no-preference'});
 await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin!==base){report.externalRequests.push(u.href);return route.abort();}return route.continue();});
 page=await context.newPage();page.on('pageerror',e=>report.pageErrors.push(String(e.stack||e)));page.on('console',m=>{if(m.type()==='warning'||m.type()==='error')report.warnings.push(m.text().slice(0,400));});
 page.on('response',response=>{if(response.status()>=400&&/v277|celebration|casino-v281/.test(response.url()))report.assetFailures.push({url:response.url(),status:response.status()});});
 await page.goto(base+'/?edition=local&appv='+encodeURIComponent(version),{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__qa277&&window.SweetsLocalDebugV258?.ready&&window.SweetsAwardsV277&&window.SweetsAudioV277,null,{timeout:90000});
 await page.locator('#manual-number-toggle').click();
 await page.waitForFunction(()=>window.SweetsLocalDebugV258.describe().manualNumbers&&window.__qa277.app.phase==='ready');
 await page.evaluate(({kind,bet,muted})=>{
  const q=window.__qa277,index=q.slots.findIndex(s=>(s.engine.kind||'cookie')===kind);if(index<0)throw Error('Missing '+kind);
  const sound=document.getElementById('sound');sound.checked=true;sound.dispatchEvent(new Event('change',{bubbles:true}));
  if(!SweetsLocalDebugV258.setBets(q.app.bets.map((_,i)=>i===index?bet:0)))throw Error('Virtual BET setup failed');q.select(index);
 },{kind,bet,muted});
 await page.evaluate(()=>document.fonts.ready);
 const before=await page.evaluate(()=>SweetsAwardsV277.describe());
 assert.deepEqual(before.attached.slice().sort(),games.slice().sort());assert.equal(before.received,0,'ready does not celebrate');
 await page.locator('#manual-start').click();
 await page.waitForFunction(kind=>{const q=window.__qa277,e=q.slots.find(s=>(s.engine.kind||'cookie')===kind).engine;return q.app.phase==='playing'&&e.idle;},kind,{timeout:45000});
 await page.waitForFunction(()=>{const d=SweetsAudioV277.describe();return d.totalSamples>0&&d.loadedSamples===d.totalSamples;},null,{timeout:45000});
 checkSoundBank(await page.evaluate(()=>SweetsAudioV277.describe()));
 await page.waitForFunction(()=>SweetsAwardsV277.describe().artReady,null,{timeout:45000});
 if(muted)await page.locator('#sound').uncheck();
 const restored=await page.evaluate(({fixture,mini})=>{
  const q=window.__qa277,index=q.slots.findIndex(s=>(s.engine.kind||'cookie')===fixture.game),slot=q.slots[index],e=slot.engine;
  const revive=(_key,v)=>v&&Array.isArray(v.$set)?new Set(v.$set):v&&Array.isArray(v.$map)?new Map(v.$map):v;
  const data=JSON.parse(JSON.stringify(fixture.fields),revive),originalPhase=q.app.phase;
  q.app.phase='ready';
  for(const [key,value]of Object.entries(data)){
   const descriptor=Object.getOwnPropertyDescriptor(e,key);if(descriptor?.get&&!descriptor.set)continue;
   e[key]=value;
  }
  q.app.draws=fixture.draws.slice();q.app.paid[index]=false;e.running=true;e.paused=false;e.presentationRate=1;
  // Call the same available checkpoint hook used by offline/remote resume.
  e.afterCheckpointRestoreV247?.();
  e.running=true;e.emit('waiting');q.app.phase=originalPhase;
  if((e.drawMode||'grouped')!=='single')e.pendingDraws=new Set(fixture.draws);
  const events=[];const nativeEmit=e.emit;
  e.emit=function(phase,detail={}){const result=nativeEmit.apply(this,arguments);events.push({phase,number:detail.number,gain:detail.gain,draws:this.state?.draws?.slice()||[...this.drawn||[]],processed:this.processed});return result;};
  q.fixtureEvents=events;q.fixture=fixture;
  if(mini)q.select(q.slots.findIndex(s=>s.engine.kind==='gelato'));
  slot.dirtyMain=slot.dirtyMini=true;q.syncManualNumbers();q.scheduleUI(q.app);
  return {awards:SweetsAwardsV277.describe(),audio:SweetsAudioV277.describe(),phase:q.app.phase,draws:q.app.draws.slice()};
 },{fixture:fixtures[kind],mini});
 assert.equal(restored.awards.received,0,'checkpoint restore does not replay awards');
 assert.equal(restored.audio.awardStarts,0,'checkpoint restore has no fanfare');
 await page.waitForFunction(n=>{const b=document.querySelector('#manual-number-grid button[data-number="'+n+'"]');return b&&!b.disabled;},fixtures[kind].next,{timeout:30000});
 return restored;
}
function inspectAward({kind,mini=false,reduced=false}){
 const d=SweetsAwardsV277.describe(),event=d.active?.find(e=>e.game===kind),node=document.querySelector('.award-presentation-'+(mini?'mini':'main')+'[data-game="'+kind+'"]');
 if(!event||!node||node.hidden||event.age<(reduced?32:240))return null;
 const style=getComputedStyle(node),bounds=node.getBoundingClientRect();if(style.display==='none'||style.visibility==='hidden'||bounds.width<10||bounds.height<10)return null;
 const probe=document.createElement('canvas');probe.width=probe.height=128;const ctx=probe.getContext('2d',{willReadFrequently:true});ctx.drawImage(node,0,0,128,128);
 const pixels=ctx.getImageData(0,0,128,128).data;let painted=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]>10)painted++;
 if(painted<30)return null;
 const q=window.__qa277,slot=q.slots.find(s=>(s.engine.kind||'cookie')===kind),state=slot.engine.state;
 const target=mini?(kind==='gelato'?slot.tab.querySelector('.gp-raster-board'):slot.miniCanvas):kind==='cookie'?slot.board:kind==='choco'?slot.chocoCanvas:kind==='candy'?slot.candyCanvas:slot.panel.querySelector({gelato:'.gp-raster-board',winery:'.wp-canvas',popcorn:'.pc-scene',jelly:'.jb-scene',stick:'.bs-grid canvas',castella:'.pct-pan>canvas',dango:'.dgb-pan>canvas'}[kind]);
 const boardBox={width:target.clientWidth||target.width,height:target.clientHeight||target.height};
 let expectedPaths=[];
 if(kind==='jelly')expectedPaths=state.lines.map(id=>JellyRules.LINES[id].map(cell=>JellyView.hitGeometryV276(boardBox.width,boardBox.height,mini,{id:cell}))).map(points=>[points[0],points.at(-1)]);
 if(kind==='dango'){
  const g=DangoBingoView.geometry(boardBox.width,boardBox.height,{layout:mini?'compact':'main',state});
  expectedPaths=DangoBingoRules.geometryFor(state).lines.filter(line=>state.completedLines.includes(line.id)).map(line=>line.cells.map(id=>g.centers[id])).map(points=>[points[0],points.at(-1)]);
 }
 // The PNG is captured in the same RAF as the passing alpha probe. Screenshots
 // taken after a click RPC can miss a short reduced-motion celebration.
 return {painted,pointerEvents:style.pointerEvents,box:{width:bounds.width,height:bounds.height},boardBox,event,expectedPaths,diagnostics:d,audio:SweetsAudioV277.describe(),selectedGame:q.slots[q.active].engine.kind||'cookie',nativeEvents:q.fixtureEvents.slice(),draws:q.app.draws.slice(),overlayDataUrl:node.toDataURL('image/png')};
}
function watchAward(input){return page.waitForFunction(inspectAward,input,{polling:'raf',timeout:30000}).then(async h=>{try{return await h.jsonValue();}finally{await h.dispose();}},error=>{if(error.name==='TimeoutError')return null;throw error;});}
function checkSoundBank(audio){
 assert.equal(audio.version,soundVersion,'the current audio runtime is active');
 assert.equal(audio.soundBank,soundBank,'the casino bank is the primary source');
 assert.equal(audio.totalSamples,soundCount,'all 97 current cues are registered');
 assert.equal(audio.loadedSamples,soundCount,'all 97 current cues decode in the real browser');
 assert.equal(audio.fallbackLoads,0,'the complete current bank needs no legacy fallback');
 assert.equal(audio.errors,0,'audio loading and playback have no errors');
}
function checkGeometry(evidence,mini){
 const paths=evidence.event.paths||[];
 for(const item of paths){
  const points=item[mini?'miniPoints':'mainPoints']||[];
  for(const p of points)assert(p&&Number.isFinite(p.x+p.y)&&p.x>=-1&&p.y>=-1&&p.x<=evidence.boardBox.width+1&&p.y<=evidence.boardBox.height+1,'award line point remains on the actual board');
  if(evidence.expectedPaths.length&&points.length>=2){
   const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),a=points[0],b=points.at(-1);
   assert(evidence.expectedPaths.some(([x,y])=>distance(a,x)<1.5&&distance(b,y)<1.5||distance(a,y)<1.5&&distance(b,x)<1.5),'line endpoints align with native completed cells');
  }
 }
 if(['jelly','dango'].includes(evidence.event.game)){assert(paths.length,'a completed bingo has a line path');assert(evidence.expectedPaths.length,'native geometry exposes completed lines');}
}
async function capture(kind,options={}){
 const {mini=false,reduced=false,muted=false,label=kind}=options,before=await openGame(kind,options),next=fixtures[kind].next;
 const pending=watchAward({kind,mini,reduced});
 await page.locator('#manual-number-grid button[data-number="'+next+'"]').click();
 await page.waitForFunction(n=>window.__qa277.app.draws.includes(n),next);
 const evidence=await pending;assert(evidence,'genuine '+kind+' award paints '+(mini?'mini':'main'));
 assert.equal(evidence.pointerEvents,'none');assert.equal(evidence.diagnostics.errors,0);assert(evidence.nativeEvents.some(e=>e.phase===fixtures[kind].proof.event),'the captured award follows the actual engine event');
 assert(evidence.diagnostics.artReady,'illustrated award assets loaded');
 assert(evidence.diagnostics[mini?'miniImages':'mainImages']>0,'the visible celebration draws a generated bitmap');
 checkGeometry(evidence,mini);
 checkSoundBank(evidence.audio);
 assert.equal(evidence.selectedGame,mini?'gelato':kind,'the real selected game matches the scenario');
 assert(evidence.audio.activeVoices<=evidence.audio.maxVoices&&evidence.audio.maxVoices<=8,'audio has a strict source-voice bound');
 if(muted){assert.equal(evidence.audio.enabled,false);assert.equal(evidence.audio.awardStarts,0,'muted real awards start no fanfare');}
 else if(mini)assert.equal(evidence.audio.awardStarts,0,'an unselected miniature award starts no fanfare');
 else{
  await page.waitForFunction(({game,key})=>SweetsAudioV277.describe().lastEvents.some(event=>event.event==='start'&&event.award&&event.explicit&&event.game===game&&event.key===key),{game:kind,key:evidence.event.key},{timeout:5000});
  evidence.audioAfter=await page.evaluate(()=>SweetsAudioV277.describe());
  checkSoundBank(evidence.audioAfter);
  assert(evidence.audioAfter.awardStarts>0,'the real engine award starts its fanfare');
  assert(evidence.audioAfter.unlocked,'real start gesture unlocks audio');
  const sounded=evidence.audioAfter.lastEvents.filter(event=>event.event==='start'&&event.award&&event.explicit&&event.game===kind&&event.key===evidence.event.key);
  assert.equal(sounded.length,1,'the captured native award has one explicit audio owner');
  assert.equal(sounded[0].tier,evidence.event.tier,'audio tier matches the captured award');
  assert.equal(sounded[0].sample,'award-'+kind+'-'+evidence.event.tier,'the selected game uses its own tiered casino fanfare');
  assert.equal(evidence.audioAfter.gameAwardRoutes[kind][evidence.event.tier-1],sounded[0].sample,'reported routing agrees with the actual started sample');
  evidence.awardSound=sounded[0];
 }
 const prefix='data:image/png;base64,';assert(evidence.overlayDataUrl.startsWith(prefix));
 const file='award-'+label+'-overlay.png';await fs.writeFile(path.join(output,file),Buffer.from(evidence.overlayDataUrl.slice(prefix.length),'base64'));delete evidence.overlayDataUrl;report.overlayScreens.push(file);
 const screen='award-'+label+'.png';await page.screenshot({path:path.join(output,screen)});report.screens.push(screen);
 const result={game:kind,label,mini,reduced,muted,proof:fixtures[kind].proof,restored:before,...evidence};report.games.push(result);return result;
}
async function recordFailure(id,error){
 const failure={current:id,message:String(error),stack:error.stack};
 if(page)try{
  failure.diagnostics=await page.evaluate(()=>({awards:window.SweetsAwardsV277?.describe(),audio:window.SweetsAudioV277?.describe(),fixtureEvents:window.__qa277?.fixtureEvents,phase:window.__qa277?.app.phase,enginePhase:window.__qa277?.slots[window.__qa277?.active]?.engine?.phase}));
  failure.screenshot='failure-'+id+'.png';await page.screenshot({path:path.join(output,failure.screenshot)});
 }catch(diagnosticError){failure.diagnosticError=String(diagnosticError);}
 return failure;
}
try{
 browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{}),args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 for(const scenario of planned){
  current=scenario.id;const started=Date.now();
  try{
   const evidence=await capture(scenario.game,scenario.options);
   if(scenario.options.reduced){
    assert(evidence.diagnostics.reducedMotion,'reduced-motion preference reaches the renderer');
    assert.equal(evidence.diagnostics.maxMainParticles,0);assert.equal(evidence.diagnostics.maxMiniParticles,0);
   }
   if(scenario.pause){
    await page.evaluate(()=>window.__qa277.setPaused(true));
    await page.waitForFunction(()=>SweetsAudioV277.describe().activeVoices===0&&SweetsAudioV277.describe().pendingAwards===0,null,{timeout:3000});
    report.pause=await page.evaluate(()=>({paused:window.__qa277.app.paused,audio:SweetsAudioV277.describe(),awards:SweetsAwardsV277.describe()}));assert(report.pause.paused);
   }
   report.caseResults.push({id:current,game:scenario.game,status:'passed',durationMs:Date.now()-started});
   console.log('CELEBRATION_V277_CASE_PASS',current);
  }catch(error){
   report.failures.push(await recordFailure(current,error));
   report.caseResults.push({id:current,game:scenario.game,status:'failed',durationMs:Date.now()-started,message:String(error)});
   console.error('CELEBRATION_V277_CASE_FAIL',current,String(error));
  }finally{
   // Each next case opens a new context, so a failed board cannot hide later
   // failures. Preserve every assertion and fail the whole shard at the end.
   report.executedCaseCount++;
   await context?.close().catch(()=>{});context=null;page=null;
   await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
  }
 }
 assert.equal(report.executedCaseCount,planned.length,'every planned scenario was attempted');
 assert.deepEqual(report.apiRequests,[]);assert.deepEqual(report.externalRequests,[]);assert.deepEqual(report.pageErrors,[]);assert.deepEqual(report.assetFailures,[]);
 assert.equal(report.failures.length,0,'failed scenarios: '+report.failures.map(f=>f.current).join(', '));
 console.log('CELEBRATION_V277_BROWSER_PASS',JSON.stringify({version,shard,shards,totalPlannedCases:scenarios.length,scenarios:report.caseResults.length,screens:report.screens.length,apiRequests:0,pageErrors:0}));
}catch(error){report.failure=await recordFailure(current||'startup',error);throw error;
}finally{await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');await context?.close().catch(()=>{});await browser?.close().catch(()=>{});await new Promise(resolve=>server.close(resolve));}

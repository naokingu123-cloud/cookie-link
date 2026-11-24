/* CI Chromium verification of v299 artwork on real, reachable Popcorn turns.
 * The independent fixture observer owns BFS, credits, refill RNG and states.
 * Only fixture setup is restored; every observed event follows a real number
 * button. Native clocks, physics, queueing and result transitions are intact. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {once} from 'node:events';
import {BASELINE_CORE_SHA256,nativeCore,sha256,replayPopcornFixture,fixtureSummary,independentPayout,independentHundredths,CLEAR_MULTIPLIERS} from './popcorn-v299-fixtures.mjs';

const root=process.cwd(),output='qa-popcorn-v299',ART='assets/popcorn-art-v299/';
assert.equal(sha256(nativeCore()),BASELINE_CORE_SHA256,'the published native Popcorn core is byte-identical');
const allScenarios=[
 {id:'clear-desktop',group:'native',fixture:'clear-ladder',width:1366,height:900,bet:3000,from:1,to:6},
 {id:'rainbow-desktop',group:'native',fixture:'rainbow',width:1366,height:900,bet:3000,from:3,to:3,grades:true,lesson:true},
 {id:'pops-lowbet-390',group:'pops',fixture:'pops-lowbet',width:390,height:844,bet:5,from:3,to:8},
 {id:'grand-320',group:'grand',fixture:'clear-ladder',width:320,height:568,bet:300000,from:8,to:8},
 {id:'rainbow-mini-390',group:'grand',fixture:'rainbow',width:390,height:844,bet:3000,from:3,to:3,grades:true,mini:true},
 {id:'grand-reduced-430',group:'grand',fixture:'clear-ladder',width:430,height:932,bet:300000,from:8,to:8,reduced:true}
];
const group=process.env.POPCORN299_GROUP||'all';assert(['all','native','pops','grand'].includes(group));
const scenarios=allScenarios.filter(s=>group==='all'||s.group===group);
const witnesses=Object.fromEntries(scenarios.map(spec=>[spec.id,replayPopcornFixture(spec.fixture,{bet:spec.bet})]));
if(process.argv.includes('--fixtures-only')){console.log(JSON.stringify({coreSha256:BASELINE_CORE_SHA256,scenarios,fixtures:Object.fromEntries(Object.entries(witnesses).map(([id,w])=>[id,fixtureSummary(w)]))},null,2));process.exit(0);}
if(process.argv.includes('--list-cases')){console.log(JSON.stringify({group,scenarios}));process.exit(0);}
const {chromium}=await import('playwright');
await fs.mkdir(output,{recursive:true});
const version=JSON.parse(await fs.readFile('app-version.json','utf8')).version;
const report={version,group,coreSha256:BASELINE_CORE_SHA256,planned:scenarios,fixtures:Object.fromEntries(Object.entries(witnesses).map(([id,w])=>[id,fixtureSummary(w)])),starts:[],cases:[],failures:[],pageErrors:[],assetFailures:[],apiRequests:[],externalRequests:[],
 scope:'Reachable native checkpoints, real numbered-button input, independent BFS/payout/refill-RNG oracle, actual image/crop lineage, live quantities and payout fitting, natural eighth-ball result. No live services or altered production clocks.',
 approvedPresentationChange:'Generated BONUS/ODDS headings have one live WIN unit each; the three BONUS and eight POP rows use the freed width for exact native credit digits. All native row amounts, windows and scrolling remain authoritative.'};
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.svg':'image/svg+xml','.avif':'image/avif','.wav':'audio/wav','.mp3':'audio/mpeg'};
const bridge='\n;window.__qa299={app,slots,select,syncManualNumbers,scheduleUI,get active(){return active;}};window.__qa299.inspect='+inspect.toString()+';\n';
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1');
 if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/ws')){report.apiRequests.push(url.pathname);res.writeHead(451).end();return;}
 const file=path.resolve(root,'.'+decodeURI(url.pathname==='/'?'/index.html':url.pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 try{let body=await fs.readFile(file);if(file.endsWith('/assets/award-presentation-v277.js'))body=Buffer.concat([body,Buffer.from(bridge)]);
  res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream','cache-control':'no-store'}).end(body);
 }catch{res.writeHead(404).end();}
});
server.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;

function observeArt(){
 const calls=new WeakMap(),texts=new WeakMap(),digits=new WeakMap(),frames=new WeakMap(),urls=new Map();
 const box=node=>{if(!node)return null;const r=node.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
 const visible=node=>{if(!node)return false;for(let p=node;p instanceof Element;p=p.parentElement){const css=getComputedStyle(p);if(p.hidden||p.inert||css.display==='none'||css.visibility==='hidden'||Number(css.opacity)===0)return false;}const r=box(node);return r.width>0&&r.height>0;};
 const textBox=node=>{if(!node)return null;const range=document.createRange();range.selectNodeContents(node);return box({getBoundingClientRect:()=>range.getBoundingClientRect()});};
 const append=(map,key,items,limit=512)=>{if(items.length)map.set(key,[...(map.get(key)||[]),...items].slice(-limit));};
 const bounds=(ctx,x,y,w,h)=>{const m=ctx.getTransform(),p=[[x,y],[x+w,y],[x,y+h],[x+w,y+h]].map(([a,b])=>({x:m.a*a+m.c*b+m.e,y:m.b*a+m.d*b+m.f}));return {left:Math.min(...p.map(v=>v.x)),right:Math.max(...p.map(v=>v.x)),top:Math.min(...p.map(v=>v.y)),bottom:Math.max(...p.map(v=>v.y))};};
 const intersects=(rect,clip)=>rect.right>clip[0]+.01&&rect.left<clip[0]+clip[2]-.01&&rect.bottom>clip[1]+.01&&rect.top<clip[1]+clip[3]-.01;
 const source=image=>{const src=image?.currentSrc||image?.src;if(urls.has(src))return urls.get(src);if(typeof src==='string')try{const u=new URL(src,location.href);if(u.origin===location.origin&&u.pathname.startsWith('/assets/'))return u.pathname.slice(1);}catch{}return null;};
 const draw=CanvasRenderingContext2D.prototype.drawImage;
 CanvasRenderingContext2D.prototype.drawImage=function(image,...args){
  const result=Reflect.apply(draw,this,[image,...args]),iw=image?.naturalWidth||image?.width,ih=image?.naturalHeight||image?.height;if(!iw||!ih)return result;
  const crop=args.length===8?args.slice(0,4):[0,0,iw,ih],dest=args.length===8?args.slice(4):args.length===4?args:[args[0],args[1],iw,ih],rect=bounds(this,...dest),own=source(image);
  const inherited=(calls.get(image)||[]).filter(call=>intersects(call.rect,crop));
  const raw=inherited.length?inherited:own?[{source:own,sourceRect:crop.slice(),sourceSize:[iw,ih]}]:[];
  const isKernel=raw.some(call=>call.source==='assets/popcorn-art-v299/kernel-pieces.webp');
  const grade=isKernel&&Math.abs(iw/ih-6)<.01&&Math.abs(crop[2]-iw/6)<.1&&Math.abs(crop[3]-ih)<.1?Math.round(crop[0]/crop[2]):null;
  const kind=isKernel&&grade!==null?'normal':isKernel&&args.length===8&&Math.abs(crop[2]-crop[3])<.1&&Math.abs(ih/crop[3]-2)<.01?'burst':null;
  const painted=raw.map(call=>({...call,sourceRect:call.sourceRect.slice(),rect,grade:grade??call.grade??null,kind:kind??call.kind??null,via:{size:[iw,ih],crop:crop.slice()},alpha:this.globalAlpha}));
  append(calls,this.canvas,painted);
  const q=window.__qa299,frame=q?.observedFrame;
  if(frame&&q.observedCanvas===this.canvas)for(const call of painted){
   if(call.source!=='assets/popcorn-art-v299/kernel-pieces.webp'||call.grade===null||!['normal','burst'].includes(call.kind)||!(call.alpha>0))continue;
   const proof={grade:call.grade,kind:call.kind,mini:frame.mini,source:call.source,sourceRect:call.sourceRect,via:call.via,elapsed:frame.elapsed,turn:frame.turn};
   if(frame.lesson)q.lessonEvidence[String(call.grade)]??={...proof,lesson:frame.lesson.power};
   if(q.captureTurn===frame.turn&&frame.trace)q.gradeEvidence[[frame.mini?'mini':'main',call.kind,call.grade].join('/')]??=proof;
  }
  if(own==='assets/popcorn-art-v299/award-digits.webp'&&args.length===8)append(digits,this.canvas,[{sourceRect:crop.slice(),sourceSize:[iw,ih],rect,alpha:this.globalAlpha}]);
  else append(digits,this.canvas,digits.get(image)||[]);
  return result;
 };
 const fill=CanvasRenderingContext2D.prototype.fillText;
 CanvasRenderingContext2D.prototype.fillText=function(value,x,y,...args){
  const result=Reflect.apply(fill,this,[value,x,y,...args]),text=String(value),m=this.measureText(text);
  append(texts,this.canvas,[{text,rect:bounds(this,x-m.actualBoundingBoxLeft,y-m.actualBoundingBoxAscent,m.actualBoundingBoxLeft+m.actualBoundingBoxRight,m.actualBoundingBoxAscent+m.actualBoundingBoxDescent),font:this.font,alpha:this.globalAlpha}]);return result;
 };
 const reset=cv=>{calls.delete(cv);texts.delete(cv);digits.delete(cv);};
 const clear=CanvasRenderingContext2D.prototype.clearRect;
 CanvasRenderingContext2D.prototype.clearRect=function(x,y,w,h){const m=this.getTransform(),result=Reflect.apply(clear,this,[x,y,w,h]);if(!m.b&&!m.c&&x*m.a+m.e<=0&&y*m.d+m.f<=0&&(x+w)*m.a+m.e>=this.canvas.width&&(y+h)*m.d+m.f>=this.canvas.height)reset(this.canvas);return result;};
 const toURL=HTMLCanvasElement.prototype.toDataURL;
 HTMLCanvasElement.prototype.toDataURL=function(...args){const result=Reflect.apply(toURL,this,args),own=[...new Set((calls.get(this)||[]).map(c=>c.source))];if(own.length===1)urls.set(result,own[0]);return result;};
 const inspect=cv=>({width:cv?.width,height:cv?.height,sources:[...new Set((calls.get(cv)||[]).map(call=>call.source))],imageCalls:calls.get(cv)||[],textCalls:texts.get(cv)||[],digitDraws:digits.get(cv)||[],frame:frames.get(cv)||null});
 window.__pc299Art={box,visible,textBox,inspect,reset,frames};
}

function installFrameObserver(){
 const native=PopcornView.draw,q=__qa299;q.gradeEvidence={};q.lessonEvidence={};
 PopcornView.draw=function(ctx,state,opt={}){
  const observer=__pc299Art;observer.reset(ctx.canvas);
  const frame={mini:!!opt.mini,lesson:opt.lesson?{...opt.lesson}:null,turn:state.turn,elapsed:opt.elapsed??null,shownPopped:PopcornView.shownPopped(state,opt.turn,opt.elapsed??Infinity),trace:opt.turn?{count:opt.turn.count,clear:opt.turn.clear,boost:opt.turn.boost,waves:opt.turn.waves.length}:null};
  q.observedCanvas=ctx.canvas;q.observedFrame=frame;
  let result;try{result=Reflect.apply(native,this,arguments);}finally{q.observedCanvas=null;q.observedFrame=null;}
  observer.frames.set(ctx.canvas,frame);
  if(!opt.mini&&opt.turn?.clear&&q.captureTurn===state.turn){
   const last=PopcornView.hitSequenceV276(opt.turn).at(-1)?.at||0,rest=last+455;
   if(opt.elapsed>=rest+16&&opt.elapsed<rest+480){const trace=observer.inspect(ctx.canvas);q.ownerOverlap={turn:state.turn,elapsed:opt.elapsed,owned:ctx.canvas.closest('.panel')?.classList.contains('popcorn-v299-award-owned'),oldBandPainted:trace.textCalls.some(call=>['全消し！','虹ボム 全消し！'].includes(call.text))};}
  }
  return result;
 };
}

let browser,context,page,current;
async function startManualRound(label){
 const start=await page.evaluate(()=>{
  const q=__qa299,e=PopcornSplash.engine;
  if(!SweetsLocalDebugV258.describe().manualNumbers)throw Error('native manual-number mode is required');
  if(q.app.phase==='playing'){
   if(q.app.draws.length||e.accepted||e.processed||e.busy||e.trace||!(e.idle||e.phase==='waiting'))throw Error('already-started round is not the untouched native waiting state');
   return {path:'already-playing',phase:q.app.phase,accepted:e.accepted,processed:e.processed,draws:q.app.draws.length};
  }
  if(q.app.phase!=='ready')throw Error('unexpected native Start phase: '+q.app.phase);
  const button=document.getElementById('manual-start');if(!button||!__pc299Art.visible(button)||button.disabled||button.matches(':disabled'))throw Error('native Start is not visible and enabled');
  button.click();return {path:'button-click',phase:q.app.phase,accepted:e.accepted,processed:e.processed,draws:q.app.draws.length};
 });
 report.starts.push({label,...start});console.log('POPCORN_V299_NATIVE_START',label,start.path);
 await page.waitForFunction(()=>__qa299.app.phase==='playing'&&PopcornSplash.engine.idle,null,{timeout:45000});
}

async function open(spec,witness){
 context=await browser.newContext({viewport:{width:spec.width,height:spec.height},serviceWorkers:'block',reducedMotion:spec.reduced?'reduce':'no-preference'});
 await context.addInitScript(observeArt);
 await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin!==base){report.externalRequests.push(u.href);return route.abort();}if(u.pathname.startsWith('/api/')||u.pathname.startsWith('/ws')){report.apiRequests.push(u.pathname);return route.abort();}return route.continue();});
 page=await context.newPage();page.on('pageerror',error=>report.pageErrors.push({case:current,error:String(error.stack||error)}));
 page.on('response',response=>{if(response.status()>=400&&/popcorn.*v299/.test(response.url()))report.assetFailures.push({case:current,url:response.url(),status:response.status()});});
 await page.goto(base+'/?edition=local&appv='+encodeURIComponent(version),{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__qa299&&window.SweetsLocalDebugV258?.ready&&window.PopcornSplash&&window.PopcornView&&window.PopcornArtV299&&window.PopcornAwardV299,null,{timeout:90000});
 assert.deepEqual(await page.evaluate(()=>Promise.all([PopcornArtV299.ready,PopcornAwardV299.ready])),[true,true]);await page.evaluate(()=>document.fonts.ready);
 await page.evaluate(installFrameObserver);
 await page.locator('#manual-number-toggle').click();await page.waitForFunction(()=>SweetsLocalDebugV258.describe().manualNumbers&&__qa299.app.phase==='ready');
 await page.evaluate(bet=>{const q=__qa299;q.index=q.slots.findIndex(slot=>slot.engine.kind==='popcorn');if(q.index<0)throw Error('Missing Popcorn slot');if(!SweetsLocalDebugV258.setBets(q.app.bets.map((_,i)=>i===q.index?bet:0)))throw Error('native local BET setup failed');q.select(q.index);q.slots[q.index].paintPopcorn(false);},spec.bet);
 if(spec.lesson){
  const handle=await page.waitForFunction(()=>{const q=__qa299,cv=q.slots[q.index].panel.querySelector('.pc-scene'),trace=__pc299Art.inspect(cv);if(q.app.phase!=='ready'||!__pc299Art.visible(cv)||!trace.frame?.lesson||Object.keys(q.lessonEvidence).length!==6)return null;return {evidence:q.lessonEvidence,trace,art:PopcornArtV299.describe(),image:cv.toDataURL('image/png')};},null,{polling:'raf',timeout:15000});
  const lesson=await handle.jsonValue();await handle.dispose();assert.deepEqual(Object.keys(lesson.evidence).map(Number),[0,1,2,3,4,5]);
  for(let grade=0;grade<6;grade++)assert.deepEqual(lesson.evidence[grade].sourceRect,lesson.art.sourceRects[['cream','yellow','red','purple','blue','rainbow'][grade]],'the real BET lesson draws each individual generated grade');
  await saveCapture(lesson,spec.id+'-bet-lesson');report.betLesson=lesson;
 }
 await startManualRound(spec.id);
 const target=witness.steps[spec.from-1],prefix=witness.draws.slice(0,spec.from-1),maxChain=Math.max(0,...witness.steps.slice(0,spec.from-1).map(step=>step.trace.waves.length));
 const restored=await page.evaluate(({target,prefix,maxChain,mini})=>{
  const q=__qa299,e=PopcornSplash.engine,slot=q.slots[q.index],phase=q.app.phase;q.app.phase='ready';
  e.state=structuredClone(target.before);e.accepted=e.processed=prefix.length;e.drawn=new Set(prefix);e.queue=[];e.trace=null;e.elapsed=0;e.maxChain=maxChain;e.soundWave=-1;e.running=true;e.paused=false;
  e.wonderCollected=!!e.state.sugarAwarded;e.roundSteps=e.wonderCollected?1:0;
  q.app.draws=prefix.slice();q.app.paid[q.index]=false;q.app.roundWins[q.index]=0;q.app.totalWin=0;
  q.app.wonderBank=e.wonderCollected?[{...e.wonderToken,game:q.index}]:[];q.app.wonderValue=q.app.wonderBank.reduce((n,x)=>n+x.value,0);q.app.wonderSteps=q.app.wonderBank.length;
  e.afterCheckpointRestoreV247?.();e.emit('waiting');q.app.phase=phase;
  const position=target.rngBefore;let rngState=position.seed>>>0,rngCalls=0;
  const rng=()=>{rngCalls++;rngState=(Math.imul(rngState,1664525)+1013904223)>>>0;return rngState/4294967296;};
  for(let i=0;i<position.calls;i++)rng();if(rngState!==position.state)throw Error('reachable RNG cursor disagrees with seed');
  q.app.random=rng;q.rng=()=>({seed:position.seed,state:rngState,calls:rngCalls});
  q.nativeEvents=[];const emit=e.emit;e.emit=function(phase,detail={}){const result=Reflect.apply(emit,this,arguments);q.nativeEvents.push({phase,...structuredClone(detail),processed:this.processed,accepted:this.accepted,trace:phase==='popcornDraw'?structuredClone(this.trace):null});return result;};
  q.nativeTiming={duration:PopcornView.duration,waveAt:PopcornView.waveAt,hitSequence:PopcornView.hitSequenceV276,draw:PopcornEngine.draw,payout:PopcornEngine.payout,pump:e.pumpHiddenV246,accept:q.app.acceptNumber,boost:q.app.boostAfterDraws};
  if(mini)q.select(q.slots.findIndex(s=>s.engine.kind==='gelato'));
  slot.dirtyMain=slot.dirtyMini=true;q.syncManualNumbers();q.scheduleUI(q.app);slot.paintPopcorn(!mini?false:true);
  return {state:structuredClone(e.state),rng:q.rng(),awards:SweetsAwardsV277.describe(),locked:q.app.locked[q.index],enabled:q.app.enabled[q.index]};
 },{target,prefix,maxChain,mini:!!spec.mini});
 assert.deepEqual(restored.state,target.before);assert.deepEqual(restored.rng,target.rngBefore);assert.equal(restored.awards.received,0);assert.equal(restored.locked,spec.bet);assert.equal(restored.enabled,true);
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
}

function inspect(){
 const q=__qa299,e=PopcornSplash.engine,slot=q.slots[q.index],cv=slot.panel.querySelector('.pc-scene'),field=document.querySelector('#screen>.game>.field'),a=__pc299Art;
 const points=(canvas,mini,type,count)=>Array.from({length:count},(_,id)=>PopcornView.hitGeometryV276(canvas.width,canvas.height,mini,{id,type}));
 const timings=q.nativeTiming;
 return {state:structuredClone(e.state),rng:q.rng(),engine:{phase:e.phase,accepted:e.accepted,processed:e.processed,running:e.running,busy:e.busy,elapsed:e.elapsed,trace:e.trace?{count:e.trace.count,clear:e.trace.clear,all:e.trace.all,boost:e.trace.boost,duration:PopcornView.duration(e.trace)}:null,totalHundredths:e.totalHundredths,drawn:[...e.drawn],presentationRate:e.presentationRate,
  timingUnchanged:PopcornView.duration===timings.duration&&PopcornView.waveAt===timings.waveAt&&PopcornView.hitSequenceV276===timings.hitSequence&&PopcornEngine.draw===timings.draw&&PopcornEngine.payout===timings.payout&&e.pumpHiddenV246===timings.pump&&q.app.acceptNumber===timings.accept&&q.app.boostAfterDraws===timings.boost&&e.presentationRate===(q.app.fastForward?3:1)},
  app:{phase:q.app.phase,draws:q.app.draws.slice(),paid:q.app.paid[q.index],win:q.app.roundWins[q.index],totalWin:q.app.totalWin,locked:q.app.locked[q.index],fastForward:q.app.fastForward},
  board:{main:a.box(cv),mini:a.box(slot.miniCanvas),mainVisible:a.visible(cv),miniVisible:a.visible(slot.miniCanvas),fieldWidth:field.clientWidth,fieldHeight:field.clientHeight,canvasWidth:cv.clientWidth,canvasHeight:cv.clientHeight,
   kernels:points(cv,false,'cell',61),ports:points(cv,false,'port',17),miniKernels:points(slot.miniCanvas,true,'cell',61),miniPorts:points(slot.miniCanvas,true,'port',17)},
  mainArt:a.inspect(cv),miniArt:a.inspect(slot.miniCanvas),art:PopcornArtV299.describe(),award:PopcornAwardV299.describe(),awards:SweetsAwardsV277.describe(),nativeEvents:q.nativeEvents.slice(),gradeEvidence:{...q.gradeEvidence},ownerOverlap:q.ownerOverlap||null,
  motion:{reduced:matchMedia('(prefers-reduced-motion: reduce)').matches},documentWidth:document.documentElement.scrollWidth,viewport:innerWidth};
}

function captureAward({expected,mini}){
 const q=__qa299,d=SweetsAwardsV277.describe(),event=d.active.find(cue=>cue.game==='popcorn'&&cue.number===expected.number),api=PopcornAwardV299.describe(),last=api.last;
 // The native clear hold legitimately has no kernels. Capture the award's
 // middle after the first natural refill has begun, retaining true live art.
 if(q.app.phase!=='playing'||!event||event.phase!=='popcornDraw'||event.age<1250||last?.role!==expected.role||last.win!==expected.win||last.mini!==mini)return null;
 const cv=document.querySelector('.award-presentation-'+(mini?'mini':'main')+'[data-game="popcorn"]');if(!__pc299Art.visible(cv))return null;
 const trace=__pc299Art.inspect(cv),source='assets/popcorn-art-v299/award-'+expected.role+'.webp';
 if(!trace.sources.includes(source)||!trace.sources.includes('assets/popcorn-art-v299/award-digits.webp')||!last.rasterNumbers||!trace.textCalls.some(call=>call.text===last.liveLabel))return null;
 const layout=q.inspect(),boardTrace=mini?layout.miniArt:layout.mainArt;if(boardTrace.frame?.shownPopped!==expected.popped)return null;
 const pixels=cv.getContext('2d',{willReadFrequently:true}).getImageData(0,0,cv.width,cv.height).data;let nontransparent=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]>10)nontransparent++;
 return {event,frozenSnapshot:Object.isFrozen(event.popcorn)&&Object.isFrozen(event.popcorn?.grades)&&Object.isFrozen(event.popcorn?.waveCounts),api,last,trace,box:__pc299Art.box(cv),nontransparent,
  layout,pointerEvents:getComputedStyle(cv).pointerEvents,status:q.slots[q.index].panel.querySelector('.award-v277-status')?.textContent,image:cv.toDataURL('image/png')};
}
function captureBoost({number}){
 const q=__qa299,e=PopcornSplash.engine,api=PopcornAwardV299.describe(),last=api.lastStatus,cv=q.slots[q.index].panel.querySelector('.pc-scene');
 if(q.app.phase!=='playing'||!e.trace?.boost||e.state.drawn.at(-1)!==number||last?.role!=='boost'||e.elapsed<180||e.elapsed>750||!__pc299Art.visible(cv))return null;
 const trace=__pc299Art.inspect(cv);if(!trace.sources.includes('assets/popcorn-art-v299/award-boost.webp')||!trace.textCalls.some(call=>call.text===last.label))return null;
 return {last,api,trace,layout:q.inspect(),image:cv.toDataURL('image/png')};
}
function captureLiveBoard({ball,popped}){
 const q=__qa299,e=PopcornSplash.engine,cv=q.slots[q.index].panel.querySelector('.pc-scene');
 if(q.app.phase!=='playing'||e.accepted!==ball||!__pc299Art.visible(cv))return null;
 const trace=__pc299Art.inspect(cv);if(trace.frame?.turn!==ball||trace.frame.shownPopped!==popped)return null;
 // After the last native blast, the original bonus and POP windows finish
 // their 320/220 ms scrolls; this does not advance or replace any clock.
 const lastHit=e.trace?.waves?.length?625+(e.trace.waves.length-1)*480:0;
 if(e.trace&&e.elapsed<lastHit+850)return null;
 return {layout:q.inspect(),image:cv.toDataURL('image/png')};
}
function captureResult(){
 const q=__qa299,results=window.SweetsResultsV253?.describe(),layer=document.getElementById('round-result-layer'),row=layer?.querySelector('.result-game[data-game-index="'+q.index+'"]'),value=row?.querySelector('.result-value'),total=document.getElementById('result-total-win');
 const {box,visible,textBox}=__pc299Art;
 if(!['result','paying','complete'].includes(q.app.phase)||!results?.active||results.phase!=='hold'||!visible(layer)||!visible(row)||!visible(value)||!visible(total))return null;
 const amount=(node,cell)=>({text:node.textContent,visible:visible(node),ink:textBox(node),cell:box(cell)});
 return {layout:q.inspect(),results,index:q.index,
  row:{...amount(value,row.querySelector('.result-game-award')),value:Number(value.dataset.value),label:value.getAttribute('aria-label'),unit:row.querySelector('.win-word')?.textContent},
  total:{...amount(total,total.parentElement),unit:total.parentElement.querySelector('.win-word')?.textContent},
  visibleRows:[...layer.querySelectorAll('.result-game')].filter(visible).map(node=>Number(node.dataset.gameIndex)),
  background:[...document.querySelectorAll('#screen>.game,#screen>.games-deck')].map(node=>({inert:node.inert,visible:visible(node)}))};
}
function paytable(state){
 const top=Math.min(8,Math.max(3,state.clears+1)),bonus=Array.from({length:3},(_,i)=>({tag:(top-i)+'回目',amount:Math.floor(state.bet*CLEAR_MULTIPLIERS[top-i-1]+1e-8),kind:'bonus',row:i}));
 const highest=Math.floor((479-state.firstPopAward)/10),offset=Math.max(0,Math.min(highest-7,Math.floor((state.popped-state.firstPopAward)/10)-1));
 const pop=Array.from({length:8},(_,i)=>{const count=state.firstPopAward+10*(offset+7-i);return {tag:count+'個',amount:independentPayout(count,0,state.bet,state.firstPopAward),kind:'pop',row:i};});
 return [...bonus,...pop];
}
function checkPaytable(view){
 const trace=view.mainArt,calls=trace.textCalls,rows=[];
 for(let i=0;i<calls.length-1;i++)if(/^(?:[1-8]回目|\d+個)$/.test(calls[i].text)&&/^\d+$/.test(calls[i+1].text))rows.push({tag:calls[i].text,amount:Number(calls[i+1].text),tagPaint:calls[i],amountPaint:calls[i+1]});
 const expected=paytable(view.state);assert.equal(rows.length,11,'three actual BONUS and eight actual POP rows are painted');
 assert.deepEqual(rows.map(({tag,amount})=>({tag,amount})),expected.map(({tag,amount})=>({tag,amount})),'every live row follows the independent native multiplier, count and BET');
 const height=trace.height,H=540,W=H*trace.width/height,sw=Math.min(185,Math.max(108,W*.212)),pad=sw*.105,top=sw*.165,bottom=sw*.137,sx=(sw-2*pad)/150,sy=(H-2-top-bottom)/490,k=height/H;
 const units=calls.filter(call=>call.text==='WIN'&&call.rect.right<(1+sw)*k+1);assert.equal(units.length,2,'the two generated table headings retain their live WIN unit');
 for(let i=0;i<rows.length;i++){
  const item=rows[i],expectedRow=expected[i],rowH=expectedRow.kind==='bonus'?27:(397-144)/8,y=expectedRow.kind==='bonus'?29+rowH*expectedRow.row:144+rowH*expectedRow.row;
  const cell={left:(1+pad+53*sx)*k,right:(1+pad+147*sx)*k,top:(1+top+y*sy)*k,bottom:(1+top+(y+rowH-1)*sy)*k},ink=item.amountPaint.rect;
  assert(item.amountPaint.alpha>0);assert(ink.left>=cell.left-1&&ink.right<=cell.right+1,'all payout digits fit their native credit tag horizontally');assert(ink.top>=cell.top-1&&ink.bottom<=cell.bottom+1,'all payout digits fit their native row vertically');
 }
 assert(calls.some(call=>call.text===view.state.popped+'個'),'the actual total POP count remains live');
}
function checkLayout(view,spec,before){
 assert.equal(view.app.phase,'playing','live visibility is captured before the natural result dialog');assert(view.documentWidth<=view.viewport,'no horizontal page overflow');
 assert.equal(view.art.loaded,true);assert.equal(view.award.loaded,true);assert.equal(view.award.digitsReady,true);assert.deepEqual(view.art.errors,[]);assert.deepEqual(view.award.errors,[]);
 const trace=spec.mini?view.miniArt:view.mainArt;assert(spec.mini?view.board.miniVisible:view.board.mainVisible,'the observed native main or miniature is actually visible');
 assert(trace.sources.includes(ART+'kernel-pieces.webp'),'live kernels use the new generated source');assert(trace.sources.includes(ART+'port-furniture.webp'),'native numbered fuse plaques use the new generated source');
 for(const name of ['port','all','up',...(!spec.mini?['bonus','odds','row','cabinet']:[])])assert(trace.imageCalls.some(call=>JSON.stringify(call.sourceRect)===JSON.stringify(view.art.sourceRects[name])&&call.source===ART+(name==='cabinet'?'payout-cabinet.webp':'port-furniture.webp')),'the actual '+name+' furniture crop is painted on this surface');
 if(spec.mini)assert(!trace.sources.includes(ART+'award-boost.webp'),'main-only boost artwork never enters the miniature');
 const text=trace.textCalls.map(call=>call.text);for(const number of view.state.numbers)assert(text.includes(String(number)),'actual current fuse number is painted: '+number);
 assert(text.includes((spec.mini?'Lv':'補充Lv')+view.state.level),'the actual refill level stays live on the UP port');
 if(!spec.mini){assert.equal(view.board.fieldWidth,430,'the original Popcorn field width is preserved');assert.equal(view.board.fieldHeight,372);assert.equal(view.board.canvasWidth,430);assert.equal(view.board.canvasHeight,372);assert(trace.sources.includes(ART+'payout-cabinet.webp'),'the actual payout cabinet uses its new generated artwork');checkPaytable(view);}
 for(const [key,cv]of [['kernels',view.mainArt],['ports',view.mainArt],['miniKernels',view.miniArt],['miniPorts',view.miniArt]])for(const p of view.board[key])assert(p&&p.x-p.r>=-.5&&p.y-p.r>=-.5&&p.x+p.r<=cv.width+.5&&p.y+p.r<=cv.height+.5,'native cell/fuse anchors fit '+key);
 if(before){for(const key of ['kernels','ports','miniKernels','miniPorts'])assert.deepEqual(view.board[key],before.board[key],key+' remain fixed');if(!spec.mini){assert.equal(view.board.fieldWidth,before.board.fieldWidth);assert.equal(view.board.fieldHeight,before.board.fieldHeight);assert.equal(view.board.canvasWidth,before.board.canvasWidth);assert.equal(view.board.canvasHeight,before.board.canvasHeight);}}
 if(spec.reduced){assert(view.motion.reduced);assert(view.awards.reducedMotion);}
}
function checkNative(view,step,{settled=false}={}){
 assert.deepEqual(view.state,step.after,'all native kernels, numbers, holes, counts and credits match the independent reachable witness');assert.deepEqual(view.rng,step.rngAfter,'only native refill and port replacement consume the expected RNG words');
 assert.equal(view.engine.accepted,step.ball);if(settled)assert.equal(view.engine.processed,step.ball);
 assert.equal(view.engine.totalHundredths,independentHundredths(step.after.popped,step.after.clears,step.after.firstPopAward));
 assert.equal(view.engine.timingUnchanged,true,'native clocks/functions and automatic eighth-ball fast-forward remain authoritative');assert.deepEqual(view.app.draws,step.after.drawn);assert.deepEqual(view.engine.drawn,step.after.drawn);
}
function checkAward(captured,step,spec){
 const o=step.oracle,event=captured.event,last=captured.last;
 assert.equal(event.phase,'popcornDraw');assert.equal(event.number,step.number);assert.equal(event.win,o.nativeWinDelta,'WIN is the difference of the two native rounded cumulative amounts');assert.equal(event.gain,o.gain);assert.equal(event.total,false);assert.equal(event.kind,o.clear?'clear':'bonus');
 const tier=o.clear?4:o.gain>=1000?3:o.gain>=300?2:1;assert.equal(event.tier,tier);assert.equal(event.duration,spec.reduced?Math.max(1800,[0,1800,2200,2600,3100][tier]-250):[0,1800,2200,2600,3100][tier],'native tier timing is preserved');
 assert.equal(captured.frozenSnapshot,true);assert.deepEqual(event.popcorn,{number:step.number,count:o.count,chains:o.chains,popped:o.popped,clears:o.clears,clear:o.clear,all:o.all,boost:o.boost,oldLevel:o.oldLevel,newLevel:o.newLevel,firstPopAward:step.before.firstPopAward,nativeOldWin:o.nativeOldWin,nativeTotalWin:o.nativeTotalWin,nativeWinDelta:o.nativeWinDelta,waveCounts:o.waveCounts,grades:o.grades});
 const label=o.clear?'全消し '+o.clears+'回目 ・ 今回 '+o.count+' POP':o.count+' POP ・ '+o.chains+'連鎖';
 assert.equal(last.role,o.role);assert.equal(last.label,event.label);assert.equal(last.detail,event.detail);assert.equal(last.liveLabel,label);assert.equal(last.win,o.nativeWinDelta);assert.equal(last.winText,o.nativeWinDelta.toLocaleString('ja-JP')+' WIN');assert.equal(last.source,ART+'award-'+o.role+'.webp');assert.equal(last.mini,!!spec.mini);assert.equal(last.rasterNumbers,true);assert.equal(captured.api.fallbackAmounts,0);
 const glyphs=[...o.nativeWinDelta.toLocaleString('ja-JP'),'WIN'];assert.deepEqual(last.glyphs,glyphs);assert.deepEqual(captured.trace.digitDraws.map(call=>call.sourceRect),glyphs.map(char=>captured.api.glyphRects[char]),'every live digit/comma/WIN uses the exact generated image crop in order');
 for(const call of captured.trace.digitDraws){const [x,y,w,h]=call.sourceRect,[iw,ih]=call.sourceSize;assert(x>=0&&y>=0&&w>0&&h>0&&x+w<=iw&&y+h<=ih);assert(call.alpha>0);assert(call.rect.left>=-.5&&call.rect.top>=-.5&&call.rect.right<=captured.trace.width+.5&&call.rect.bottom<=captured.trace.height+.5,'the complete native WIN fits the visible overlay');}
 assert(captured.nontransparent>30);assert.equal(captured.pointerEvents,'none');assert(captured.status?.includes(o.nativeWinDelta.toLocaleString('ja-JP')));assert(!captured.trace.sources.includes('assets/award-art-v291/themed-cutin-atlas.webp'));
 if(o.all&&!o.clear){assert.equal(last.role,'pop','ALL ignition alone never receives all-clear artwork');assert(!captured.trace.sources.some(source=>/award-(?:clear|grand)\.webp$/.test(source)));}
 if(!spec.mini)assert(!captured.layout.mainArt.textCalls.some(call=>['全消し！','虹ボム 全消し！'].includes(call.text)),'the dedicated award owns the center without a second old clear banner');
 checkNative(captured.layout,step);checkLayout(captured.layout,spec);
}
function checkBoost(captured,step,received){
 const last=captured.last,o=step.oracle;assert(o.boost);assert.equal(last.role,'boost');assert.equal(last.oldLevel,o.oldLevel);assert.equal(last.newLevel,o.newLevel);assert.equal(last.label,'補充Lv '+o.oldLevel+' → '+o.newLevel+' ・ 次の補充から');assert.equal(last.source,ART+'award-boost.webp');assert.equal(last.win,null);assert.equal(last.duration,1010,'the original 500+510 ms boost interval owns the card');
 assert.equal(captured.layout.awards.received,received,'boost is not a monetary event');assert(!captured.trace.sources.includes(ART+'award-digits.webp'),'boost does not draw WIN digits');assert.equal(captured.layout.state.popped,step.before.popped);assert.equal(captured.layout.state.win,step.before.win);assert.equal(captured.layout.state.clears,step.before.clears);checkNative(captured.layout,step);
}
function checkGrades(view,spec){
 if(!spec.grades)return;
 for(const kind of ['normal','burst'])for(let grade=0;grade<6;grade++){
  const key=[spec.mini?'mini':'main',kind,grade].join('/'),proof=view.gradeEvidence[key];assert(proof,'actual visible '+key+' is drawn from the generated kernel atlas');assert.equal(proof.source,ART+'kernel-pieces.webp');assert.equal(proof.grade,grade);assert.equal(proof.kind,kind);
  assert.deepEqual(proof.sourceRect,view.art.sourceRects[['cream','yellow','red','purple','blue','rainbow'][grade]],'each grade uses its own actual generated source crop');
  const [sw,sh]=proof.via.size,[sx,sy,w,h]=proof.via.crop;assert(sx>=0&&sy>=0&&w>0&&h>0&&sx+w<=sw&&sy+h<=sh,'grade source crop remains inside its actual parent image');
 }
}
function checkResult(captured,step){
 const view=captured.layout;checkNative(view,step,{settled:true});assert(['result','paying','complete'].includes(view.app.phase));assert.equal(view.engine.phase,'complete');assert.equal(view.engine.running,false);assert.equal(view.engine.busy,false);assert.equal(view.engine.trace,null);assert.equal(view.app.paid,true);assert.equal(view.app.win,step.after.win);assert.equal(view.app.totalWin,step.after.win);
 assert.equal(captured.results.phase,'hold');assert.equal(captured.results.rowCount,1);assert.equal(captured.results.total,step.after.win);assert.deepEqual(captured.visibleRows,[captured.index]);assert.equal(captured.row.value,step.after.win);assert.equal(captured.row.label,step.after.win+' WIN');
 for(const [name,amount]of [['Popcorn result',captured.row],['TOTAL',captured.total]]){assert.equal(amount.text,String(step.after.win),name+' has every exact native settled digit');assert.equal(amount.unit,'WIN');assert(amount.visible);assert(amount.ink.left>=amount.cell.left-1&&amount.ink.right<=amount.cell.right+1&&amount.ink.top>=amount.cell.top-1&&amount.ink.bottom<=amount.cell.bottom+1,name+' digits fit their actual result cell');}
 assert(captured.background.length>=2);assert(captured.background.every(node=>node.inert&&!node.visible),'the native result dialog owns interaction after settlement');
}
async function saveCapture(captured,name){await fs.writeFile(path.join(output,name+'.png'),Buffer.from(captured.image.split(',')[1],'base64'));delete captured.image;}

try{
 browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{}),args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 for(const spec of scenarios){
  current=spec.id;const witness=witnesses[spec.id],started=Date.now(),steps=[];
  try{
   await open(spec,witness);const before=await page.evaluate(inspect);checkLayout(before,spec);await page.screenshot({path:path.join(output,spec.id+'-before.png')});
   for(const step of witness.steps.slice(spec.from-1,spec.to)){
    await page.waitForFunction(()=>{const d=SweetsAwardsV277.describe();return !d.active.some(c=>c.game==='popcorn')&&!d.pending.some(c=>c.game==='popcorn');},null,{timeout:30000});
    const start=await page.evaluate(ball=>{const q=__qa299;q.captureTurn=ball;q.gradeEvidence={};q.ownerOverlap=null;return {events:q.nativeEvents.length,received:SweetsAwardsV277.describe().received,statusPaints:PopcornAwardV299.describe().statusPaints,rng:q.rng()};},step.ball);
    assert.deepEqual(start.rng,step.rngBefore);
    const capture=(fn,args,kind)=>page.waitForFunction(fn,args,{polling:'raf',timeout:90000}).then(async handle=>{const value=await handle.jsonValue();await handle.dispose();return {kind,value};});
    const captures=[];
    if(step.oracle.boost&&!spec.mini)captures.push(capture(captureBoost,{number:step.number},'boost'));
    if(step.oracle.award)captures.push(capture(captureAward,{expected:{number:step.number,role:step.oracle.role,win:step.oracle.nativeWinDelta,popped:step.after.popped},mini:!!spec.mini},'award'));
    else if(!step.oracle.boost)captures.push(capture(captureLiveBoard,{ball:step.ball,popped:step.after.popped},'board'));
    const paint=Promise.allSettled(captures),resultPromise=step.ball===8?Promise.allSettled([capture(captureResult,null,'result')]):null;
    const button=page.locator('#manual-number-grid button[data-number="'+step.number+'"]');await button.waitFor({state:'visible'});
    await page.waitForFunction(number=>{const b=document.querySelector('#manual-number-grid button[data-number="'+number+'"]');return b&&!b.disabled;},step.number,{timeout:30000});await button.click();
    const captured=await paint;
    for(const item of captured){if(item.status==='rejected')throw item.reason;const {kind,value}=item.value;
     if(kind==='award')checkAward(value,step,spec);else if(kind==='boost')checkBoost(value,step,start.received);else{checkNative(value.layout,step);checkLayout(value.layout,spec);}
     if(kind!=='boost')checkLayout(value.layout,spec,before);await saveCapture(value,spec.id+'-ball'+step.ball+'-'+kind);
    }
    await page.screenshot({path:path.join(output,spec.id+'-ball'+step.ball+'-live.png')});
    await page.waitForFunction(ball=>{const e=PopcornSplash.engine;return e.processed===ball&&!e.busy&&!e.trace;},step.ball,{timeout:120000});
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const after=await page.evaluate(inspect);checkNative(after,step,{settled:true});
    const native=after.nativeEvents.slice(start.events).filter(event=>event.phase==='popcornDraw');assert.equal(native.length,1,'one real accepted numbered draw emits one native trace');assert.equal(native[0].number,step.number);assert.deepEqual(native[0].trace,step.trace,'the real browser trace equals every independently checked native wave, motion frame and refill');
    assert.equal(after.awards.received-start.received,step.oracle.award?1:0,'only a real payable POP or clear creates an award');assert.equal(after.awards.errors,0);
    if(step.oracle.clear&&!spec.mini){assert(after.ownerOverlap,'a real frame inside the original central clear-band interval was observed');assert.equal(after.ownerOverlap.owned,true);assert.equal(after.ownerOverlap.oldBandPainted,false,'the active image award suppresses only the duplicate central clear band');}
    if(spec.mini)assert.equal(after.award.statusPaints,start.statusPaints,'an unselected board never paints a main-only boost card');
    if(!step.oracle.boost)assert(!after.mainArt.sources.includes(ART+'award-boost.webp'),'a prior boost card is absent from the current frame');
    checkGrades(after,spec);
    let result;
    if(step.ball===8){const [capturedResult]=await resultPromise;if(capturedResult.status==='rejected')throw capturedResult.reason;result=capturedResult.value.value;checkResult(result,step);await page.screenshot({path:path.join(output,spec.id+'-result.png')});}
    else checkLayout(after,spec,before);
    await page.screenshot({path:path.join(output,spec.id+'-ball'+step.ball+'-after.png')});
    steps.push({number:step.number,ball:step.ball,oracle:step.oracle,after,captures:captured.map(item=>item.value),result,receivedDelta:after.awards.received-start.received});
   }
   report.cases.push({id:spec.id,status:'passed',durationMs:Date.now()-started,steps});console.log('POPCORN_V299_CASE_PASS',spec.id);
  }catch(error){let diagnostics;try{diagnostics=await page?.evaluate(()=>window.__qa299?.nativeTiming?__qa299.inspect():{phase:window.__qa299?.app.phase,art:window.PopcornArtV299?.describe(),award:window.PopcornAwardV299?.describe()});}catch{}
   try{await page?.screenshot({path:path.join(output,spec.id+'-failure.png')});}catch{}
   report.failures.push({id:spec.id,error:String(error),stack:error.stack,diagnostics});report.cases.push({id:spec.id,status:'failed',durationMs:Date.now()-started,steps});console.error('POPCORN_V299_CASE_FAIL',spec.id,String(error));
  }finally{await context?.close();context=null;page=null;}
 }
 for(const key of ['pageErrors','assetFailures','apiRequests','externalRequests'])assert.equal(report[key].length,0,key+' stays empty');assert.equal(report.cases.length,scenarios.length);assert.equal(report.failures.length,0);report.ok=true;
}catch(error){report.ok=false;report.error=String(error);process.exitCode=1;}
finally{await fs.writeFile(path.join(output,'report-'+group+'.json'),JSON.stringify(report,null,2)+'\n');await context?.close();await browser?.close();await new Promise(resolve=>server.close(resolve));console.log('POPCORN_V299_REPORT',output+'/report-'+group+'.json');}

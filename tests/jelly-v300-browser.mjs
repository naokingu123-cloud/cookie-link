/* Real Chromium QA for Jelly v300. Native reachable checkpoints precede real
 * Start/number buttons; Set state, every wave, payouts and the 27-word opening
 * RNG cursor are independently checked. Read-only paint observers forward the
 * original functions, arguments, receiver and return value without new clocks. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {once} from 'node:events';
import {BASELINE_CORE_SHA256,BASELINE_HOST_SHA256,nativeCore,nativeHost,sha256,replayJellyFixture,fixtureSummary,independentHundredths,independentPayout,ORACLE_LINES} from './jelly-v300-fixtures.mjs';

const root=process.cwd(),output='qa-jelly-v300',ART='assets/jelly-art-v300/';
assert.equal(sha256(nativeCore()),BASELINE_CORE_SHA256,'native Jelly rules remain byte-identical');
assert.equal(sha256(nativeHost()),BASELINE_HOST_SHA256,'native Jelly input, clocks and settlement remain byte-identical');
const allScenarios=[
 {id:'multi-desktop',group:'bingo',fixture:'multi-line',width:1366,height:900,bet:3000,from:3,to:8,lesson:true},
 {id:'low-bet-390',group:'bingo',fixture:'low-bet',width:390,height:844,bet:5,from:5,to:8},
 {id:'all-line-320',group:'full',fixture:'all-line',width:320,height:568,bet:300000,from:8,to:8},
 {id:'all-line-reduced-430',group:'full',fixture:'all-line',width:430,height:932,bet:300000,from:8,to:8,reduced:true},
 {id:'ten-line-odds-390',group:'odds',fixture:'ten-line-odds',width:390,height:844,bet:300000,from:7,to:8},
 {id:'all-line-mini-390',group:'odds',fixture:'all-line',width:390,height:844,bet:3000,from:8,to:8,mini:true}
];
const group=process.env.JELLY300_GROUP||'all';assert(['all','bingo','full','odds'].includes(group));
const scenarios=allScenarios.filter(s=>group==='all'||s.group===group);
const witnesses=Object.fromEntries(scenarios.map(spec=>[spec.id,replayJellyFixture(spec.fixture,{bet:spec.bet})]));
if(process.argv.includes('--fixtures-only')){console.log(JSON.stringify({coreSha256:BASELINE_CORE_SHA256,hostSha256:BASELINE_HOST_SHA256,scenarios,fixtures:Object.fromEntries(Object.entries(witnesses).map(([id,w])=>[id,fixtureSummary(w)]))},null,2));process.exit(0);}
if(process.argv.includes('--list-cases')){console.log(JSON.stringify({group,scenarios}));process.exit(0);}

const {chromium}=await import('playwright');
await fs.mkdir(output,{recursive:true});
const version=JSON.parse(await fs.readFile('app-version.json','utf8')).version;
const report={version,group,coreSha256:BASELINE_CORE_SHA256,hostSha256:BASELINE_HOST_SHA256,planned:scenarios,fixtures:Object.fromEntries(Object.entries(witnesses).map(([id,w])=>[id,fixtureSummary(w)])),starts:[],cases:[],failures:[],pageErrors:[],assetFailures:[],apiRequests:[],externalRequests:[],
 scope:'Actual native input after independently replayed reachable checkpoints. Exact Set/state/trace/RNG and cumulative credits, actual generated source/glyph crops, 25 numbers/12 rails/11 payout rows, native all-ten thumbnail cadence, and natural eighth-ball RESULT. No live services or altered production clocks.'};
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.svg':'image/svg+xml','.avif':'image/avif','.wav':'audio/wav','.mp3':'audio/mpeg'};
const bridge='\n;window.__qa300={app,slots,select,syncManualNumbers,scheduleUI,get active(){return active;},get allNineMode(){return allNineMode;}};window.__qa300.inspect='+inspect.toString()+';\n';
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
 const calls=new WeakMap(),texts=new WeakMap(),digits=new WeakMap(),frames=new WeakMap(),cells=new WeakMap(),numbers=new WeakMap(),strokes=new WeakMap(),paths=new WeakMap(),pathFills=new WeakMap(),surfaces=new WeakMap(),urls=new Map(),originalApis={};
 const serial=value=>JSON.parse(JSON.stringify(value,(_,v)=>v instanceof Set?[...v].sort():v));
 const box=node=>{if(!node)return null;const r=node.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
 const visible=node=>{if(!node)return false;for(let p=node;p instanceof Element;p=p.parentElement){const css=getComputedStyle(p);if(p.hidden||p.inert||css.display==='none'||css.visibility==='hidden'||Number(css.opacity)===0)return false;}const r=box(node);return r.width>0&&r.height>0;};
 const textBox=node=>{if(!node)return null;const range=document.createRange();range.selectNodeContents(node);return box({getBoundingClientRect:()=>range.getBoundingClientRect()});};
 const append=(map,key,items,limit=2048)=>{if(items.length)map.set(key,[...(map.get(key)||[]),...items].slice(-limit));};
 const point=(ctx,x,y)=>{const m=ctx.getTransform();return {x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f};};
 const bounds=(ctx,x,y,w,h)=>{const p=[[x,y],[x+w,y],[x,y+h],[x+w,y+h]].map(([a,b])=>point(ctx,a,b));return {left:Math.min(...p.map(v=>v.x)),right:Math.max(...p.map(v=>v.x)),top:Math.min(...p.map(v=>v.y)),bottom:Math.max(...p.map(v=>v.y))};};
 const intersects=(r,c)=>r.right>c[0]+.001&&r.left<c[0]+c[2]-.001&&r.bottom>c[1]+.001&&r.top<c[1]+c[3]-.001;
 const source=image=>{const src=image?.currentSrc||image?.src;if(urls.has(src))return urls.get(src);if(typeof src==='string')try{const u=new URL(src,location.href);if(u.origin===location.origin&&u.pathname.startsWith('/assets/'))return u.pathname.slice(1);}catch{}return null;};
 const draw=CanvasRenderingContext2D.prototype.drawImage;
 CanvasRenderingContext2D.prototype.drawImage=function(image,...args){
  const result=Reflect.apply(draw,this,[image,...args]),iw=image?.naturalWidth||image?.width,ih=image?.naturalHeight||image?.height;if(!iw||!ih)return result;
  const crop=args.length===8?args.slice(0,4):[0,0,iw,ih],dest=args.length===8?args.slice(4):args.length===4?args:[args[0],args[1],iw,ih],rect=bounds(this,...dest),own=source(image);
  const inherited=(calls.get(image)||[]).filter(call=>intersects(call.rect,crop));
  const raw=inherited.length?inherited:own?[{source:own,sourceRect:crop.slice(),sourceSize:[iw,ih]}]:[];
  const surface=surfaces.get(image),painted=raw.map(call=>({...call,sourceRect:call.sourceRect.slice(),rect,recipe:surface?.recipe??call.recipe??null,via:{size:[iw,ih],crop:crop.slice()},alpha:this.globalAlpha}));append(calls,this.canvas,painted);
  const q=window.__qa300;if(q?.observedCanvas===this.canvas&&q.observedFrame?.lesson)for(const call of painted)if(call.source==='assets/jelly-art-v300/syrup-surface.webp'&&call.recipe&&call.alpha>0)q.lessonEvidence[call.recipe]??={...call,scene:q.observedFrame.lesson.scene};
  if(own==='assets/jelly-art-v300/award-digits.webp'&&args.length===8)append(digits,this.canvas,[{sourceRect:crop.slice(),sourceSize:[iw,ih],rect,alpha:this.globalAlpha}]);else append(digits,this.canvas,digits.get(image)||[]);
  return result;
 };
 const fill=CanvasRenderingContext2D.prototype.fillText;
 CanvasRenderingContext2D.prototype.fillText=function(value,x,y,...args){
  const result=Reflect.apply(fill,this,[value,x,y,...args]),text=String(value),m=this.measureText(text),max=args[0],sx=Number.isFinite(max)&&max>0&&m.width>max?max/m.width:1;
  append(texts,this.canvas,[{text,rect:bounds(this,x-m.actualBoundingBoxLeft*sx,y-m.actualBoundingBoxAscent,(m.actualBoundingBoxLeft+m.actualBoundingBoxRight)*sx,m.actualBoundingBoxAscent+m.actualBoundingBoxDescent),font:this.font,maxWidth:max??null,alpha:this.globalAlpha}]);return result;
 };
 const begin=CanvasRenderingContext2D.prototype.beginPath,move=CanvasRenderingContext2D.prototype.moveTo,line=CanvasRenderingContext2D.prototype.lineTo,stroke=CanvasRenderingContext2D.prototype.stroke,pathFill=CanvasRenderingContext2D.prototype.fill;
 CanvasRenderingContext2D.prototype.beginPath=function(...args){paths.set(this,[]);return Reflect.apply(begin,this,args);};
 CanvasRenderingContext2D.prototype.moveTo=function(x,y){paths.get(this)?.push(point(this,x,y));return Reflect.apply(move,this,[x,y]);};
 CanvasRenderingContext2D.prototype.lineTo=function(x,y){paths.get(this)?.push(point(this,x,y));return Reflect.apply(line,this,[x,y]);};
 CanvasRenderingContext2D.prototype.stroke=function(...args){const result=Reflect.apply(stroke,this,args),p=paths.get(this);if(!args.length&&p?.length===2&&this.strokeStyle==='#ffffff'&&Math.abs(this.globalAlpha-.52)<1e-6)append(strokes,this.canvas,[{points:p.slice(),width:this.lineWidth,alpha:this.globalAlpha}]);return result;};
 CanvasRenderingContext2D.prototype.fill=function(...args){const result=Reflect.apply(pathFill,this,args);if(args[0] instanceof Path2D)pathFills.set(this.canvas,(pathFills.get(this.canvas)||0)+1);return result;};
 const reset=cv=>{for(const map of [calls,texts,digits,cells,numbers,strokes])map.delete(cv);pathFills.set(cv,0);};
 const clear=CanvasRenderingContext2D.prototype.clearRect;
 CanvasRenderingContext2D.prototype.clearRect=function(x,y,w,h){const m=this.getTransform(),result=Reflect.apply(clear,this,[x,y,w,h]);if(!m.b&&!m.c&&x*m.a+m.e<=0&&y*m.d+m.f<=0&&(x+w)*m.a+m.e>=this.canvas.width&&(y+h)*m.d+m.f>=this.canvas.height)reset(this.canvas);return result;};
 const toURL=HTMLCanvasElement.prototype.toDataURL;
 HTMLCanvasElement.prototype.toDataURL=function(...args){const result=Reflect.apply(toURL,this,args),own=[...new Set((calls.get(this)||[]).map(c=>c.source))];if(own.length===1)urls.set(result,own[0]);return result;};
 const inspect=cv=>({width:cv?.width,height:cv?.height,sources:[...new Set((calls.get(cv)||[]).map(call=>call.source))],imageCalls:calls.get(cv)||[],textCalls:texts.get(cv)||[],digitDraws:digits.get(cv)||[],cellCalls:cells.get(cv)||[],numberCalls:numbers.get(cv)||[],rails:strokes.get(cv)||[],frame:frames.get(cv)||null});
 const wrap=(name,methods)=>{let api;Object.defineProperty(window,name,{configurable:true,get(){return api;},set(native){originalApis[name]=native;const descriptors=Object.getOwnPropertyDescriptors(native);for(const [key,observe]of Object.entries(methods)){const original=descriptors[key]?.value;if(typeof original!=='function')continue;descriptors[key]={...descriptors[key],value:function(...args){return observe.call(this,original,args);}};}api=Object.freeze(Object.defineProperties({},descriptors));}});};
 wrap('JellyView',{draw(native,args){
  const [ctx,state,opt]=args,q=window.__qa300,previous=q?{canvas:q.observedCanvas,frame:q.observedFrame}:null;reset(ctx.canvas);
  const frame={mini:!!opt.mini,lesson:null,draws:state.draws.slice(),lines:state.lines.slice(),colors:state.colors.slice(),reach:serial(opt.reach||[]),sugarCollected:!!opt.sugarCollected,elapsed:opt.elapsed,oddsPopupTime:opt.oddsPopupTime,trace:opt.turn?serial(opt.turn):null};
  if(q){q.observedCanvas=ctx.canvas;q.observedFrame=frame;}
  let result;try{result=Reflect.apply(native,this,args);}finally{if(q){q.observedCanvas=previous.canvas;q.observedFrame=previous.frame;}}
  frames.set(ctx.canvas,frame);return result;
 }});
 wrap('JellyArtV300',{
  surface(native,args){const result=Reflect.apply(native,this,args);if(result)surfaces.set(result,{recipe:args[0],mini:!!args[1]});return result;},
  cell(native,args){const [ctx,index,recipe,mini]=args,start=(calls.get(ctx.canvas)||[]).length,result=Reflect.apply(native,this,args);if(result)append(cells,ctx.canvas,[{index,recipe,mini:!!mini,images:(calls.get(ctx.canvas)||[]).slice(start)}]);return result;}
 });
 window.__j300Art={box,visible,textBox,inspect,reset,frames,serial,point,numbers,pathFills,append,originalApis};
}

function installOtherObservers(){
 const q=__qa300,a=__j300Art,native=drawElixirNumber;q.lessonEvidence={};
 drawElixirNumber=function(...args){const [ctx,value,x,y]=args,before=a.pathFills.get(ctx.canvas)||0,result=Reflect.apply(native,this,args);if(q.observedCanvas===ctx.canvas)a.append(a.numbers,ctx.canvas,[{value:String(value),point:a.point(ctx,x,y),glyphFills:(a.pathFills.get(ctx.canvas)||0)-before}]);return result;};
 const lesson=SweetsAttractLessons.jelly,draw=lesson.draw;
 lesson.draw=function(ctx,scene,progress){const previous={canvas:q.observedCanvas,frame:q.observedFrame},frame={lesson:{scene,progress},mini:false};a.reset(ctx.canvas);q.observedCanvas=ctx.canvas;q.observedFrame=frame;let result;try{result=Reflect.apply(draw,this,arguments);}finally{q.observedCanvas=previous.canvas;q.observedFrame=previous.frame;}a.frames.set(ctx.canvas,frame);return result;};
}

let browser,context,page,current;
async function startManualRound(label){
 const start=await page.evaluate(()=>{
  const q=__qa300,e=JellyBingo.engine;if(!SweetsLocalDebugV258.describe().manualNumbers)throw Error('native manual-number mode is required');
  if(q.app.phase==='playing'){if(q.app.draws.length||e.accepted||e.processed||e.busy||e.trace||!(e.idle||e.phase==='waiting'))throw Error('existing manual round is not the untouched native waiting state');return {path:'already-playing',phase:q.app.phase,accepted:e.accepted,processed:e.processed,draws:0};}
  if(q.app.phase!=='ready')throw Error('unexpected native Start phase: '+q.app.phase);
  const button=document.getElementById('manual-start');if(!button||!__j300Art.visible(button)||button.disabled||button.matches(':disabled'))throw Error('native Start is not visible and enabled');button.click();return {path:'button-click',phase:q.app.phase,accepted:e.accepted,processed:e.processed,draws:q.app.draws.length};
 });
 report.starts.push({label,...start});console.log('JELLY_V300_NATIVE_START',label,start.path);
 await page.waitForFunction(()=>__qa300.app.phase==='playing'&&JellyBingo.engine.idle,null,{timeout:45000});
}

async function open(spec,witness){
 context=await browser.newContext({viewport:{width:spec.width,height:spec.height},serviceWorkers:'block',reducedMotion:spec.reduced?'reduce':'no-preference'});await context.addInitScript(observeArt);
 await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin!==base){report.externalRequests.push(u.href);return route.abort();}if(u.pathname.startsWith('/api/')||u.pathname.startsWith('/ws')){report.apiRequests.push(u.pathname);return route.abort();}return route.continue();});
 page=await context.newPage();page.on('pageerror',error=>report.pageErrors.push({case:current,error:String(error.stack||error)}));page.on('response',response=>{if(response.status()>=400&&/jelly.*v300/.test(response.url()))report.assetFailures.push({case:current,url:response.url(),status:response.status()});});
 await page.goto(base+'/?edition=local&appv='+encodeURIComponent(version),{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__qa300&&window.SweetsLocalDebugV258?.ready&&window.JellyBingo&&window.JellyView&&window.JellyArtV300&&window.JellyAwardV300&&window.SweetsAttractLessons?.jelly,null,{timeout:90000});
 assert.deepEqual(await page.evaluate(()=>Promise.all([JellyArtV300.ready,JellyAwardV300.ready,JellyView.assetsReady])),[true,true,true]);await page.evaluate(()=>document.fonts.ready);await page.evaluate(installOtherObservers);
 await page.locator('#manual-number-toggle').click();await page.waitForFunction(()=>SweetsLocalDebugV258.describe().manualNumbers&&__qa300.app.phase==='ready');
 await page.evaluate(bet=>{const q=__qa300;q.index=q.slots.findIndex(s=>s.engine.kind==='jelly');if(q.index<0)throw Error('Missing Jelly slot');if(!SweetsLocalDebugV258.setBets(q.app.bets.map((_,i)=>i===q.index?bet:0)))throw Error('native local BET setup failed');q.select(q.index);},spec.bet);
 if(spec.lesson){
  const handle=await page.waitForFunction(()=>{const q=__qa300,cv=document.querySelector('.ds139-story[data-game="jelly"] canvas'),trace=__j300Art.inspect(cv);if(q.app.phase!=='ready'||!__j300Art.visible(cv)||!trace.frame?.lesson||!['blue','red','blue+red','yellow'].every(key=>q.lessonEvidence[key]))return null;return {trace,evidence:q.lessonEvidence,art:JellyArtV300.describe(),image:cv.toDataURL('image/png')};},null,{polling:'raf',timeout:30000});
  const lesson=await handle.jsonValue();await handle.dispose();for(const recipe of ['blue','red','blue+red','yellow']){const proof=lesson.evidence[recipe];assert.equal(proof.source,ART+'syrup-surface.webp');assert.deepEqual(proof.sourceRect,lesson.art.sourceRects.syrup);}await saveCapture(lesson,spec.id+'-bet-lesson');report.betLesson=lesson;
 }
 await startManualRound(spec.id);
 const target=witness.steps[spec.from-1],prefix=witness.draws.slice(0,spec.from-1);
 const restored=await page.evaluate(({target,prefix,mini})=>{
  const q=__qa300,e=JellyBingo.engine,slot=q.slots[q.index],phase=q.app.phase;q.app.phase='ready';
  e.state={...structuredClone(target.before),open:new Set(target.before.open)};e.accepted=e.processed=prefix.length;e.drawn=new Set(prefix);e.queue=[];e.trace=null;e.oddsStart=null;e.elapsed=0;e.running=true;e.paused=false;
  e.wonderCollected=e.state.lines.length>=e.state.sugarLines;e.roundSteps=Number(e.wonderCollected);
  q.app.draws=prefix.slice();q.app.paid[q.index]=false;q.app.roundWins[q.index]=0;q.app.totalWin=0;q.app.wonderBank=e.wonderCollected?[{...e.wonderToken,game:q.index}]:[];q.app.wonderValue=q.app.wonderBank.reduce((n,x)=>n+x.value,0);q.app.wonderSteps=q.app.wonderBank.length;
  e.afterCheckpointRestoreV247?.();e.emit('waiting');q.app.phase=phase;
  const position=target.rngBefore;let state=position.seed>>>0,calls=0;const rng=()=>{calls++;state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};for(let i=0;i<position.calls;i++)rng();if(state!==position.state||calls!==27)throw Error('reachable Jelly opening RNG cursor disagrees');
  q.app.random=rng;q.rng=()=>({seed:position.seed,state,calls});q.nativeEvents=[];
  const emit=e.emit;e.emit=function(phase){const result=Reflect.apply(emit,this,arguments);q.nativeEvents.push({phase,number:this.state.draws.at(-1),processed:this.processed,accepted:this.accepted,trace:phase==='jellyPour'?__j300Art.serial(this.trace):null});return result;};
  q.nativeTiming={duration:JellyView.duration,lineReveal:JellyView.lineRevealAt,oddsReveal:JellyView.oddsRevealAt,breakAt:JellyView.partitionBreakAt,oddsMs:JellyView.oddsPopupMs,draw:JellyRules.draw,create:JellyRules.create,payout:JellyRules.payout,pump:e.pumpHiddenV246,accept:q.app.acceptNumber,boost:q.app.boostAfterDraws};
  if(mini)q.select(q.slots.findIndex(s=>s.engine.kind==='gelato'));
  slot.dirtyMain=slot.dirtyMini=true;q.syncManualNumbers();q.scheduleUI(q.app);slot.paintJelly(!!mini);
  return {state:__j300Art.serial(e.state),openIsSet:e.state.open instanceof Set,rng:q.rng(),awards:SweetsAwardsV277.describe(),locked:q.app.locked[q.index],enabled:q.app.enabled[q.index]};
 },{target,prefix,mini:!!spec.mini});
 assert.deepEqual(restored.state,target.before);assert(restored.openIsSet);assert.deepEqual(restored.rng,target.rngBefore);assert.equal(restored.awards.received,0);assert.equal(restored.locked,spec.bet);assert.equal(restored.enabled,true);
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
}

function inspect(){
 const q=__qa300,e=JellyBingo.engine,slot=q.slots[q.index],cv=slot.panel.querySelector('.jb-scene'),field=document.querySelector('#screen>.game>.field'),a=__j300Art,t=q.nativeTiming,original=a.originalApis.JellyView;
 const anchors=(canvas,mini,css=false)=>Array.from({length:25},(_,id)=>JellyView.hitGeometryV276(css?(canvas.clientWidth||canvas.width):canvas.width,css?(canvas.clientHeight||canvas.height):canvas.height,mini,{id}));
 return {state:a.serial(e.state),openIsSet:e.state.open instanceof Set,rng:q.rng(),engine:{phase:e.phase,accepted:e.accepted,processed:e.processed,running:e.running,busy:e.busy,elapsed:e.elapsed,oddsStart:e.oddsStart,wonderCollected:e.wonderCollected,trace:e.trace?a.serial(e.trace):null,totalHundredths:e.totalHundredths,drawn:[...e.drawn],presentationRate:e.presentationRate,
  timingUnchanged:Object.isFrozen(JellyView)&&Object.isFrozen(original)&&Object.isFrozen(JellyArtV300)&&Object.isFrozen(a.originalApis.JellyArtV300)&&['duration','lineRevealAt','oddsRevealAt','partitionBreakAt','oddsPopupMs','hitGeometryV276'].every(key=>JellyView[key]===original[key])&&JellyView.duration===t.duration&&JellyView.lineRevealAt===t.lineReveal&&JellyView.oddsRevealAt===t.oddsReveal&&JellyView.partitionBreakAt===t.breakAt&&JellyView.oddsPopupMs===t.oddsMs&&JellyRules.draw===t.draw&&JellyRules.create===t.create&&JellyRules.payout===t.payout&&e.pumpHiddenV246===t.pump&&q.app.acceptNumber===t.accept&&q.app.boostAfterDraws===t.boost&&e.presentationRate===(q.app.fastForward?3:1)},
  app:{phase:q.app.phase,draws:q.app.draws.slice(),paid:q.app.paid[q.index],win:q.app.roundWins[q.index],totalWin:q.app.totalWin,locked:q.app.locked[q.index],fastForward:q.app.fastForward},mode:{allNine:!!q.allNineMode,selected:q.active===q.index},
  board:{main:a.box(cv),mini:a.box(slot.miniCanvas),mainVisible:a.visible(cv),miniVisible:a.visible(slot.miniCanvas),fieldWidth:field.clientWidth,fieldHeight:field.clientHeight,canvasWidth:cv.clientWidth,canvasHeight:cv.clientHeight,anchors:anchors(cv,false),miniAnchors:anchors(slot.miniCanvas,true),pathAnchors:anchors(cv,false,true),miniPathAnchors:anchors(slot.miniCanvas,true,true)},
  mainArt:a.inspect(cv),miniArt:a.inspect(slot.miniCanvas),art:JellyArtV300.describe(),award:JellyAwardV300.describe(),awards:SweetsAwardsV277.describe(),nativeEvents:q.nativeEvents.slice(),motion:{reduced:matchMedia('(prefers-reduced-motion: reduce)').matches},documentWidth:document.documentElement.scrollWidth,viewport:innerWidth};
}

function captureAward({number,role,win,mini}){
 const q=__qa300,api=JellyAwardV300.describe(),last=api.last,event=SweetsAwardsV277.describe().active.find(cue=>cue.game==='jelly'&&cue.number===number);
 if(q.app.phase!=='playing'||!event||event.age<800||last?.role!==role||last.win!==win||last.mini!==mini)return null;
 const cv=document.querySelector('.award-presentation-'+(mini?'mini':'main')+'[data-game="jelly"]');if(!__j300Art.visible(cv))return null;
 const trace=__j300Art.inspect(cv),source='assets/jelly-art-v300/award-'+(role==='all'?'all-line':'bingo')+'.webp';
 if(!trace.sources.includes(source)||!trace.sources.includes('assets/jelly-art-v300/award-digits.webp')||!last.rasterNumbers||!trace.textCalls.some(call=>call.text===last.liveLabel))return null;
 const layout=q.inspect(),frame=(mini?layout.miniArt:layout.mainArt).frame;if(frame?.draws.at(-1)!==number)return null;
 const data=cv.getContext('2d',{willReadFrequently:true}).getImageData(0,0,cv.width,cv.height).data;let nontransparent=0;for(let i=3;i<data.length;i+=4)if(data[i]>10)nontransparent++;
 return {event,api,last,trace,layout,nontransparent,frozenSnapshot:Object.isFrozen(event.jelly)&&['lineIds','newLineIds','waveCounts'].every(key=>Object.isFrozen(event.jelly[key])),pointerEvents:getComputedStyle(cv).pointerEvents,status:q.slots[q.index].panel.querySelector('.award-v277-status')?.textContent,image:cv.toDataURL('image/png')};
}
function captureOdds({ball}){
 const q=__qa300,e=JellyBingo.engine,cv=q.slots[q.index].panel.querySelector('.jb-scene'),last=JellyArtV300.describe().lastOdds,trace=__j300Art.inspect(cv),frame=trace.frame;
 if(q.app.phase!=='playing'||!e.trace?.oddsReason||e.accepted!==ball||last?.ball!==ball||!__j300Art.visible(cv)||frame?.draws.length!==ball||frame.oddsPopupTime<200||frame.oddsPopupTime>900)return null;
 const transition='×'+e.trace.before.oddsMultiplier.toFixed(1)+' → ×'+e.state.oddsMultiplier.toFixed(1);
 if(!trace.sources.includes('assets/jelly-art-v300/award-odds-up.webp')||!trace.textCalls.some(call=>call.text===transition))return null;
 return {last,trace,layout:q.inspect(),image:cv.toDataURL('image/png')};
}
function captureLiveBoard({ball}){
 const q=__qa300,e=JellyBingo.engine,cv=q.slots[q.index].panel.querySelector('.jb-scene'),trace=__j300Art.inspect(cv);
 if(q.app.phase!=='playing'||e.processed!==ball||e.busy||e.trace||!__j300Art.visible(cv)||trace.frame?.draws.length!==ball||trace.frame.trace!==null)return null;
 return {layout:q.inspect(),image:cv.toDataURL('image/png')};
}
function captureResult(){
 const q=__qa300,results=window.SweetsResultsV253?.describe(),layer=document.getElementById('round-result-layer'),row=layer?.querySelector('.result-game[data-game-index="'+q.index+'"]'),value=row?.querySelector('.result-value'),total=document.getElementById('result-total-win');
 const {box,visible,textBox}=__j300Art;if(!['result','paying','complete'].includes(q.app.phase)||!results?.active||results.phase!=='hold'||!visible(layer)||!visible(row)||!visible(value)||!visible(total))return null;
 const amount=(node,cell)=>({text:node.textContent,visible:visible(node),ink:textBox(node),cell:box(cell)});
 return {layout:q.inspect(),results,index:q.index,row:{...amount(value,row.querySelector('.result-game-award')),value:Number(value.dataset.value),label:value.getAttribute('aria-label'),unit:row.querySelector('.win-word')?.textContent,details:row.querySelector('.result-game-details')?.textContent},
  total:{...amount(total,total.parentElement),unit:total.parentElement.querySelector('.win-word')?.textContent},visibleRows:[...layer.querySelectorAll('.result-game')].filter(visible).map(node=>Number(node.dataset.gameIndex)),background:[...document.querySelectorAll('#screen>.game,#screen>.games-deck')].map(node=>({inert:node.inert,visible:visible(node)}))};
}
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const near=(actual,expected,message,tolerance=.025)=>assert(Number.isFinite(actual)&&Math.abs(actual-expected)<=tolerance,message+': '+actual+' versus '+expected);
const clamp=value=>Math.max(0,Math.min(1,value));
function waveEnd(trace){return trace.wave.length?(trace.ball<=5?500:130)+(trace.wave.length-1)*92+400:trace.ball<=5?520:470;}
function nativePanel(width,height){
 const pad=Math.max(2,Math.min(width,height)*.018),gap=Math.max(4,Math.min(width,height)*.023),side=Math.min(height-pad*2,(width-gap-pad*2)*.669),pw=Math.min(width-side-gap-2*pad,side*.66),ph=Math.min(height-pad*2,pw*2.82);
 return {left:(width-side-pw-gap)/2,top:(height-ph)/2,unit:pw/160,h:ph/(pw/160)};
}
function sourceBounds(call){const [x,y,w,h]=call.sourceRect,[iw,ih]=call.sourceSize;assert(x>=0&&y>=0&&w>0&&h>0&&x+w<=iw&&y+h<=ih,'generated source crop fits its original image');}
function checkFurniture(view,trace,mini){
 for(const name of ['rim','floor',...(!mini?['cabinet','phase','odds','row','all','sugar']:[])]){
  const rect=view.art.sourceRects[name],file=view.art.sourceFiles[name],calls=trace.imageCalls.filter(call=>call.source===file&&same(call.sourceRect,rect));assert(calls.length>0,'actual generated '+name+' source is painted');
  for(const call of calls){sourceBounds(call);assert(call.alpha>0);}
  // Each sliced furniture piece must cover its complete cached source height.
  // Repeated payout rows may repeat the same slices; they are not one draw.
  if(!['rim','floor'].includes(name)){
   const intervals=calls.map(call=>[call.via.crop[1],call.via.crop[1]+call.via.crop[3]]).sort((a,b)=>a[0]-b[0]);let end=0;
   for(const [a,b]of intervals){assert(a<=end+.001,name+' furniture source has no omitted slice');end=Math.max(end,b);}near(end,calls[0].via.size[1],name+' covers the full source height',.001);
  }
 }
}
function checkCellsAndNumbers(view,spec){
 const trace=spec.mini?view.miniArt:view.mainArt,frame=trace.frame,anchors=spec.mini?view.board.miniAnchors:view.board.anchors;
 assert(frame&&frame.mini===!!spec.mini);assert.deepEqual(frame.draws,view.state.draws);assert.deepEqual(frame.colors,view.state.colors);assert.deepEqual(frame.lines,view.state.lines);
 const wanted=[];
 for(let index=0;index<25;index++){
  const current=frame.colors[index];if(!current)continue;
  const layer=frame.trace?.wave.findIndex(wave=>wave.includes(index))??-1,start=layer>=0?(frame.trace.ball<=5?500:130)+layer*92:null;
  if(start===null||frame.elapsed>=start+400)wanted.push({index,recipe:current});
  else{const previous=frame.trace.before.colors[index];if(previous)wanted.push({index,recipe:previous});if(frame.elapsed>start)wanted.push({index,recipe:current});}
 }
 assert.deepEqual(trace.cellCalls.map(({index,recipe})=>({index,recipe})),wanted,'every actual cell paint follows the true native wetting/recoloring wave, including a paused all-ten thumbnail');
 for(const cell of trace.cellCalls){
  assert.equal(cell.mini,!!spec.mini);const source=cell.images.find(call=>call.source===ART+'syrup-surface.webp');assert(source,'each actual cell samples the new continuous generated syrup');assert.deepEqual(source.sourceRect,view.art.sourceRects.syrup);sourceBounds(source);
  const size=spec.mini?128:500,k=size/500,x=cell.index%5*100,y=Math.floor(cell.index/5)*100,left=Math.max(0,x-.12),top=Math.max(0,y-.12),right=Math.min(500,x+100.12),bottom=Math.min(500,y+100.12);
  assert.deepEqual(source.via.size,[size,size]);assert.deepEqual(source.via.crop,[left*k,top*k,(right-left)*k,(bottom-top)*k],'adjacent wells use their own position in one continuous material with native .12 overlap');
 }
 assert.deepEqual(trace.numberCalls.map(call=>call.value),view.state.numbers.map(String),'all 25 actual numbered inputs remain painted in their original cells');
 trace.numberCalls.forEach((call,id)=>{assert.equal(call.glyphFills,call.value.length,'every native vector numeral glyph was actually filled');const anchor=anchors[id],dy=!spec.mini&&frame.reach.some(item=>item.number===Number(call.value))?8*anchor.r/44:0;near(call.point.x,anchor.x,'number x stays on native cell');near(call.point.y,anchor.y-dy,'number y retains the native reach offset');});
 assert.equal(trace.textCalls.filter(call=>call.text==='HIT!').length,frame.draws.length,'native HIT lettering remains on every accepted number');
 return {paintedCells:wanted,numberCount:trace.numberCalls.length,hitCount:frame.draws.length,frame};
}
function checkRails(view,spec){
 const paint=spec.mini?view.miniArt:view.mainArt,frame=paint.frame,anchors=spec.mini?view.board.miniAnchors:view.board.anchors,turn=frame.trace,elapsed=frame.elapsed||0;
 const visible=turn?frame.lines.length-turn.newLines.length+turn.newLines.filter((_,j)=>elapsed>=waveEnd(turn)+Math.min(210,j*36)+215).length:frame.lines.length,expected=[];
 for(const id of frame.lines){const j=turn?turn.newLines.indexOf(id):-1,travel=j<0?1:clamp((elapsed-waveEnd(turn)-Math.min(210,j*36))/430);if(!travel)continue;
  const ids=ORACLE_LINES[id],first=anchors[ids[0]],last=anchors[ids[4]],k=first.r/44,sx=Math.sign(ids[4]%5-ids[0]%5),sy=Math.sign(Math.floor(ids[4]/5)-Math.floor(ids[0]/5));
  const a={x:first.x-sx*91*k,y:first.y-sy*91*k},b={x:last.x+sx*91*k,y:last.y+sy*91*k};expected.push({id,travel,points:[a,{x:a.x+(b.x-a.x)*travel,y:a.y+(b.y-a.y)*travel}],width:spec.mini?12:20+Math.max(visible,1)/12*2});
 }
 assert.equal(paint.rails.length,expected.length,'every actually visible native rail has its full opaque white core');
 expected.forEach((want,i)=>{const actual=paint.rails[i];near(actual.width,want.width,'native rail width',.00001);for(let j=0;j<2;j++)for(const axis of ['x','y'])near(actual.points[j][axis],want.points[j][axis],'rail '+want.id+' '+axis+' reaches the native bezel');});
 return expected.map(({id,travel})=>({id,travel}));
}
function checkPaytable(view){
 const paint=view.mainArt,frame=paint.frame,calls=paint.textCalls,rows=[];
 for(let i=0;i<calls.length-1;i++)if(/^(?:12|10|[1-9])本$/.test(calls[i].text)&&/^\d[\d,]*$/.test(calls[i+1].text))rows.push({count:parseInt(calls[i].text),amount:Number(calls[i+1].text.replaceAll(',','')),tag:calls[i],amountPaint:calls[i+1]});
 const odds=frame.trace?.oddsReason&&frame.oddsPopupTime<0?frame.trace.before.oddsMultiplier:view.state.oddsMultiplier,tiers=[12,10,9,8,7,6,5,4,3,2,1];
 assert.deepEqual(rows.map(row=>[row.count,row.amount]),tiers.map(count=>[count,independentPayout(count,odds,view.app.locked,view.state.payoutVersion)]),'all eleven live payout rows use the exact native cumulative amount, multiplier and BET');
 const p=nativePanel(paint.width,paint.height),head=Math.min(39,p.h*.095),phaseH=Math.min(75,p.h*.195),oddsH=Math.min(39,p.h*.104),headH=Math.min(17,p.h*.048),footH=Math.min(20,p.h*.052);let y=6+head+phaseH+2+oddsH+headH;const rowH=(p.h-10-y-footH)/11.7;
 for(const row of rows){const h=rowH*(row.count===12?1.7:1),cell={left:p.left+67*p.unit,right:p.left+145*p.unit,top:p.top+y*p.unit,bottom:p.top+(y+h)*p.unit},ink=row.amountPaint.rect;
  assert(row.amountPaint.alpha>0);assert(ink.left>=cell.left-1&&ink.right<=cell.right+1,'all payout digits fit the native amount column');assert(ink.top>=cell.top-1&&ink.bottom<=cell.bottom+1,'all payout digits fit the native payout row');assert(row.tag.rect.right<=p.left+67*p.unit+1,'line count and amount remain separated');y+=h;
 }
 const texts=calls.map(call=>call.text);assert(texts.includes('本数'));assert(texts.includes('WIN'));assert(texts.includes('×'+odds.toFixed(1)));assert(texts.includes('色変化1回で＋0.5倍'));
 const finished=frame.draws.length===8&&!frame.trace,ball=Math.min(8,frame.draws.length+(frame.trace?0:1));
 for(const value of [finished?'結果':ball<=5?'前半':'後半',finished?'全8球終了':(frame.trace?'第':'次は第')+ball+'球',finished?'ライン判定完了':ball<=5?'仕切りを割る':['赤','黄','緑'][ball-6]+'ゼリーを注ぐ',view.state.sugarLines+(frame.sugarCollected?'本 シュガーGET!':'本でシュガー')])assert(texts.includes(value),'actual native Japanese phase/Sugar label is painted: '+value);
 return rows.map(({count,amount})=>({count,amount}));
}
function checkLayout(view,spec,before,{live=true}={}){
 if(live){assert.equal(view.app.phase,'playing','visibility is captured on the real game frame before RESULT');assert(spec.mini?view.board.miniVisible:view.board.mainVisible,'the observed game surface is actually visible');}
 assert(view.documentWidth<=view.viewport,'no page overflow');assert.equal(view.art.loaded,true);assert.equal(view.award.loaded,true);assert.equal(view.award.digitsReady,true);assert.deepEqual(view.art.errors,[]);assert.deepEqual(view.award.errors,[]);assert(view.art.surfaceCacheCount<=30);assert.equal(view.art.surfaceCacheLimit,30);
 const trace=spec.mini?view.miniArt:view.mainArt;checkFurniture(view,trace,!!spec.mini);const cells=checkCellsAndNumbers(view,spec),rails=checkRails(view,spec);
 assert(!trace.sources.includes(ART+'award-digits.webp'),'native board paints no invented monetary amount');
 if(spec.mini)assert(!trace.sources.includes(ART+'award-odds-up.webp'),'the native miniature never paints the main-only ODDS popup');
 let paytable;if(!spec.mini){assert.equal(view.board.fieldWidth,430);assert.equal(view.board.fieldHeight,372);assert.equal(view.board.canvasWidth,430);assert.equal(view.board.canvasHeight,372);paytable=checkPaytable(view);}
 for(const [key,cv]of [['anchors',view.mainArt],['miniAnchors',view.miniArt]])for(const point of view.board[key])assert(point&&point.x-point.r>=0&&point.y-point.r>=0&&point.x+point.r<=cv.width&&point.y+point.r<=cv.height,'all 25 native hit anchors fit '+key);
 if(before){for(const key of ['anchors','miniAnchors'])assert.deepEqual(view.board[key],before.board[key],key+' stay fixed throughout the native draw');for(const key of ['fieldWidth','fieldHeight','canvasWidth','canvasHeight'])assert.equal(view.board[key],before.board[key]);}
 if(spec.reduced){assert(view.motion.reduced);assert(view.awards.reducedMotion);}
 return {cells,rails,paytable};
}
function checkNative(view,step,{settled=false}={}){
 assert(view.openIsSet,'native partitions remain a Set');assert.deepEqual(view.state,step.after,'every native number, recipe, wall, line and payout field equals the independent reachable witness');assert.deepEqual(view.rng,step.rngAfter);assert.equal(view.rng.calls,27,'only the original opening consumes RNG');
 assert.equal(view.engine.accepted,step.ball);if(settled)assert.equal(view.engine.processed,step.ball);assert.equal(view.engine.timingUnchanged,true,'native frozen APIs, clocks, logic and eighth-ball fast-forward remain authoritative');
 const shown=view.engine.trace?.oddsReason&&view.engine.oddsStart===null?step.before:step.after;
 assert.equal(view.engine.totalHundredths,independentHundredths(shown.lines.length,shown.oddsMultiplier,shown.payoutVersion));assert.deepEqual(view.app.draws,step.after.draws);assert.deepEqual(view.engine.drawn,step.after.draws);
}
function expectedSnapshot(step){const o=step.oracle;return {number:step.number,ball:step.ball,index:o.index,color:o.color,totalLines:o.totalLines,newLineCount:o.newLineCount,previousLines:o.previousLines,lineIds:o.lineIds,newLineIds:o.newLineIds,oddsMultiplier:o.oddsMultiplier,previousOdds:o.previousOdds,oddsReason:o.oddsReason,wetCells:o.wetCells,beforeRecipe:o.beforeRecipe,afterRecipe:o.afterRecipe,payoutVersion:o.payoutVersion,waveCounts:o.waveCounts,totalHundredths:o.totalHundredths,sugarLines:o.sugarLines};}
function checkAward(captured,step,spec,before){
 const o=step.oracle,event=captured.event,last=captured.last;assert.equal(event.phase,'jellyPour');assert.equal(event.number,step.number);assert.equal(event.kind,'bingo');assert.equal(event.total,true);assert.equal(event.gain,o.totalHundredths);assert.equal(event.win,o.payoutWin,'the image shows the cumulative native WIN, including valid zero and zero-increment awards');assert.equal(event.tier,o.tier);
 assert.equal(event.duration,spec.reduced?Math.max(1800,[0,1800,2200,2600,3100][o.tier]-250):[0,1800,2200,2600,3100][o.tier]);assert.equal(event.label,o.totalLines+' LINE BINGO!');assert.equal(event.detail,o.full12?'12ライン 全完成':'今回 '+o.newLineCount+'ライン完成');assert(captured.frozenSnapshot);assert.deepEqual(event.jelly,expectedSnapshot(step));
 assert.equal(event.paths.length,o.newLineCount);event.paths.forEach((path,j)=>{assert.equal(path.closed,false);for(const [key,anchors]of [['mainPoints',captured.layout.board.pathAnchors],['miniPoints',captured.layout.board.miniPathAnchors]]){assert.equal(path[key].length,5);path[key].forEach((point,k)=>{const anchor=anchors[ORACLE_LINES[o.newLineIds[j]][k]];near(point.x,anchor.x,'native awarded line x');near(point.y,anchor.y,'native awarded line y');});}});
 const label=spec.mini?o.totalLines+'本 ・ 今回'+o.newLineCount+'本':o.totalLines+(o.full12?'ライン 全完成':'ライン完成')+' ・ 今回'+o.newLineCount+'本',caption=spec.mini?'':'現在の配当 ×'+o.oddsMultiplier.toFixed(1),source=ART+'award-'+(o.full12?'all-line':'bingo')+'.webp';
 for(const [key,want]of Object.entries({role:o.role,label:event.label,detail:event.detail,liveLabel:label,caption,amountLabel:'現在の配当',win:o.payoutWin,winText:o.payoutWin.toLocaleString('ja-JP')+' WIN',source,mini:!!spec.mini,total:true,rasterNumbers:true,totalLines:o.totalLines,newLineCount:o.newLineCount,oddsMultiplier:o.oddsMultiplier,wetCells:o.wetCells,totalHundredths:o.totalHundredths}))assert.deepEqual(last[key],want,'live award '+key);
 assert.equal(captured.api.fallbackAmounts,0);const glyphs=[...o.payoutWin.toLocaleString('ja-JP'),'WIN'];assert.deepEqual(last.glyphs,glyphs);assert.deepEqual(captured.trace.digitDraws.map(call=>call.sourceRect),glyphs.map(char=>captured.api.glyphRects[char]),'each digit, comma and WIN uses the actual generated source in native order');
 for(const call of captured.trace.digitDraws){sourceBounds(call);assert(call.alpha>0);assert(call.rect.left>=-.5&&call.rect.top>=-.5&&call.rect.right<=captured.trace.width+.5&&call.rect.bottom<=captured.trace.height+.5,'the complete current WIN fits the real overlay');}
 const texts=captured.trace.textCalls.map(call=>call.text);assert(texts.includes(label));assert(spec.mini?!texts.some(text=>text.startsWith('現在の配当')):texts.includes(caption));assert.equal(captured.status,event.label+'。'+event.detail+'。現在の配当 '+o.payoutWin.toLocaleString('ja-JP')+' WIN');assert(captured.nontransparent>30);assert.equal(captured.pointerEvents,'none');assert(!captured.trace.sources.includes('assets/award-art-v291/themed-cutin-atlas.webp'));
 checkNative(captured.layout,step);captured.checks=checkLayout(captured.layout,spec,before);if(o.full12&&!spec.mini){assert.equal(captured.checks.rails.length,12);assert(captured.checks.rails.every(rail=>rail.travel===1),'all twelve full native rails reach the bezel behind the award');}
 if(spec.mini){assert(captured.layout.mode.allNine&&!captured.layout.mode.selected);captured.miniPolicy={kind:'all-ten-unselected-native-event-only',frame:captured.layout.miniArt.frame,observedCells:captured.checks.cells.paintedCells};}
}
function checkOdds(captured,step,spec,received,before){
 const o=step.oracle,last=captured.last;assert.equal(o.award,false);assert.equal(o.newLineCount,0);assert.equal(o.oddsReason,'color');
 for(const [key,want]of Object.entries({duration:1600,ball:step.ball,oldMultiplier:o.previousOdds,newMultiplier:o.oddsMultiplier,delta:.5,beforeRecipe:o.beforeRecipe,afterRecipe:o.afterRecipe,source:ART+'award-odds-up.webp',still:!!spec.reduced,win:false}))assert.equal(last[key],want,'actual native ODDS '+key);
 near(last.age,captured.trace.frame.oddsPopupTime,'ODDS artwork uses the exact native age',.000001);assert.equal(captured.layout.awards.received,received);assert(!captured.layout.awards.active.some(cue=>cue.game==='jelly'));assert(!captured.layout.awards.pending.some(cue=>cue.game==='jelly'));
 const texts=captured.trace.textCalls.map(call=>call.text);assert(texts.includes('×'+o.previousOdds.toFixed(1)+' → ×'+o.oddsMultiplier.toFixed(1)));assert(texts.includes('＋0.5倍'));assert(!captured.trace.sources.includes(ART+'award-digits.webp'));
 for(const recipe of [o.beforeRecipe,o.afterRecipe])assert(captured.trace.imageCalls.some(call=>call.source===ART+'syrup-surface.webp'&&call.recipe===recipe),'actual ODDS swatches use the true before/after continuous recipe');
 checkNative(captured.layout,step);captured.checks=checkLayout(captured.layout,spec,before);
}
function checkResult(captured,step,spec){
 const view=captured.layout,win=step.oracle.payoutWin;checkNative(view,step,{settled:true});assert(['result','paying','complete'].includes(view.app.phase));assert.equal(view.engine.phase,'complete');assert.equal(view.engine.running,false);assert.equal(view.engine.busy,false);assert.equal(view.engine.trace,null);assert.equal(view.app.paid,true);assert.equal(view.app.win,win);assert.equal(view.app.totalWin,win);assert.equal(captured.results.phase,'hold');assert.equal(captured.results.rowCount,1);assert.equal(captured.results.total,win);assert.deepEqual(captured.visibleRows,[captured.index]);assert.equal(captured.row.value,win);assert.equal(captured.row.label,win+' WIN');
 for(const [name,amount]of [['Jelly result',captured.row],['TOTAL',captured.total]]){assert.equal(amount.text,String(win),name+' preserves every exact settled digit');assert.equal(amount.unit,'WIN');assert(amount.visible);assert(amount.ink.left>=amount.cell.left-1&&amount.ink.right<=amount.cell.right+1&&amount.ink.top>=amount.cell.top-1&&amount.ink.bottom<=amount.cell.bottom+1,name+' digits fit the actual result cell');}
 assert.equal(captured.row.details,step.oracle.totalLines+' BINGO ／ 番号HIT 8個 ／ ゼリー '+step.oracle.wetCells+'マス ／ 配当×'+step.oracle.oddsMultiplier.toFixed(1)+(view.engine.wonderCollected?' ／ シュガーGET！':''));assert(captured.background.length>=2);assert(captured.background.every(node=>node.inert&&!node.visible),'the native RESULT owns interaction after settlement');
 if(spec.mini){assert(view.mode.allNine&&!view.mode.selected);assert.equal(view.miniArt.frame.trace,null);assert.equal(view.miniArt.frame.draws.length,8);checkCellsAndNumbers(view,spec);assert.equal(checkRails(view,spec).length,12);}
}
async function saveCapture(captured,name){await fs.writeFile(path.join(output,name+'.png'),Buffer.from(captured.image.split(',')[1],'base64'));delete captured.image;}

try{
 browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{}),args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 for(const spec of scenarios){
  current=spec.id;const witness=witnesses[spec.id],started=Date.now(),steps=[];
  try{
   await open(spec,witness);const before=await page.evaluate(inspect);checkLayout(before,spec);await page.screenshot({path:path.join(output,spec.id+'-before.png')});
   for(const step of witness.steps.slice(spec.from-1,spec.to)){
    await page.waitForFunction(()=>{const d=SweetsAwardsV277.describe();return !d.active.some(cue=>cue.game==='jelly')&&!d.pending.some(cue=>cue.game==='jelly');},null,{timeout:30000});
    const start=await page.evaluate(()=>({events:__qa300.nativeEvents.length,received:SweetsAwardsV277.describe().received,rng:__qa300.rng()}));assert.deepEqual(start.rng,step.rngBefore);
    const capture=(fn,args,kind)=>page.waitForFunction(fn,args,{polling:'raf',timeout:90000}).then(async handle=>{const value=await handle.jsonValue();await handle.dispose();return {kind,value};});
    const tasks=[];if(step.oracle.award)tasks.push(capture(captureAward,{number:step.number,role:step.oracle.role,win:step.oracle.payoutWin,mini:!!spec.mini},'award'));
    else if(step.oracle.oddsReason)tasks.push(capture(captureOdds,{ball:step.ball},'odds'));else tasks.push(capture(captureLiveBoard,{ball:step.ball},'board'));
    const painting=Promise.allSettled(tasks),resultPromise=step.ball===8?Promise.allSettled([capture(captureResult,null,'result')]):null;
    const button=page.locator('#manual-number-grid button[data-number="'+step.number+'"]');await button.waitFor({state:'visible'});await page.waitForFunction(number=>{const b=document.querySelector('#manual-number-grid button[data-number="'+number+'"]');return b&&!b.disabled;},step.number,{timeout:30000});await button.click();
    const captured=await painting;for(const item of captured){if(item.status==='rejected')throw item.reason;const {kind,value}=item.value;if(kind==='award')checkAward(value,step,spec,before);else if(kind==='odds')checkOdds(value,step,spec,start.received,before);else{checkNative(value.layout,step,{settled:true});value.checks=checkLayout(value.layout,spec,before);}await saveCapture(value,spec.id+'-ball'+step.ball+'-'+kind);}
    await page.screenshot({path:path.join(output,spec.id+'-ball'+step.ball+'-live.png')});
    await page.waitForFunction(ball=>{const e=JellyBingo.engine;return e.processed===ball&&!e.busy&&!e.trace;},step.ball,{timeout:120000});
    if(spec.mini)await page.waitForFunction(ball=>{const q=__qa300,frame=__j300Art.inspect(q.slots[q.index].miniCanvas).frame;return frame?.draws.length===ball&&frame.trace===null;},step.ball,{polling:'raf',timeout:10000});
    else if(step.ball<8)await page.waitForFunction(ball=>{const q=__qa300,frame=__j300Art.inspect(q.slots[q.index].panel.querySelector('.jb-scene')).frame;return frame?.draws.length===ball&&frame.trace===null;},step.ball,{polling:'raf',timeout:10000});
    const after=await page.evaluate(inspect);checkNative(after,step,{settled:true});const native=after.nativeEvents.slice(start.events).filter(event=>event.phase==='jellyPour');assert.equal(native.length,1);assert.equal(native[0].number,step.number);assert.deepEqual(native[0].trace,step.trace,'the real numbered input emits the exact independently replayed full trace');assert.equal(after.awards.received-start.received,step.oracle.award?1:0,'only a newly completed line creates a BINGO, even when its valid cumulative WIN is zero');assert.equal(after.awards.errors,0);
    let result,settledChecks;if(step.ball===8){const [done]=await resultPromise;if(done.status==='rejected')throw done.reason;result=done.value.value;checkResult(result,step,spec);await page.screenshot({path:path.join(output,spec.id+'-result.png')});}
    else settledChecks=checkLayout(after,spec,before);
    await page.screenshot({path:path.join(output,spec.id+'-ball'+step.ball+'-after.png')});steps.push({number:step.number,ball:step.ball,oracle:step.oracle,receivedDelta:after.awards.received-start.received,captures:captured.map(item=>item.value),after,settledChecks,result});
   }
   report.cases.push({id:spec.id,status:'passed',durationMs:Date.now()-started,steps});console.log('JELLY_V300_CASE_PASS',spec.id);
  }catch(error){let diagnostics;try{diagnostics=await page?.evaluate(()=>window.__qa300?.nativeTiming?__qa300.inspect():{phase:window.__qa300?.app.phase,art:window.JellyArtV300?.describe(),award:window.JellyAwardV300?.describe()});}catch{}try{await page?.screenshot({path:path.join(output,spec.id+'-failure.png')});}catch{}
   report.failures.push({id:spec.id,error:String(error),stack:error.stack,diagnostics});report.cases.push({id:spec.id,status:'failed',durationMs:Date.now()-started,steps});console.error('JELLY_V300_CASE_FAIL',spec.id,String(error));
  }finally{await context?.close();context=null;page=null;}
 }
 for(const key of ['pageErrors','assetFailures','apiRequests','externalRequests'])assert.equal(report[key].length,0,key+' stays empty');assert.equal(report.cases.length,scenarios.length);assert.equal(report.failures.length,0);report.ok=true;
}catch(error){report.ok=false;report.error=String(error);process.exitCode=1;}
finally{await fs.writeFile(path.join(output,'report-'+group+'.json'),JSON.stringify(report,null,2)+'\n');await context?.close();await browser?.close();await new Promise(resolve=>server.close(resolve));console.log('JELLY_V300_REPORT',output+'/report-'+group+'.json');}

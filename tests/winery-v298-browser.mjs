/* CI-only Winery artwork verification. Native single-number inputs follow
 * reachable checkpoints; the independent core oracle owns every expected
 * liquid layer, MIX count, full-glass count, gain and final settlement. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {once} from 'node:events';
import {createHash} from 'node:crypto';

const root=process.cwd(),output='qa-winery-v298';
const coreFile='assets/winery-pyramid-core-v1.js',coreSource=await fs.readFile(coreFile,'utf8');
const module={exports:{}};new Function('module',coreSource)(module);const W=module.exports;
assert.equal(W.version,232,'the established Winery v232 rules remain authoritative');
const SEED=277,BOOSTS=[21,12,10,9],EIGHTH_FULL=[21,12,10,9,4,11,17,16],SEVENTH_FULL=[21,12,10,9,4,11,16,1];
const rng=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const encode=value=>JSON.parse(JSON.stringify(value,(_key,v)=>v instanceof Set?{$set:[...v]}:v instanceof Map?{$map:[...v]}:v));
const STATE_KEYS=['kind','drawMode','reachMode','colorCount','roundBet','payoutTarget','pattern','fillScale','calibratedRtp','initialVolume','nodeNumbers','boostNumbers','glasses','power','boostCount','lastNumber','lastGain','wasted','totalPoured','totalHundredths','fullCount','mixCount','countMultiplier','mixMultiplier','presentedMixCount','maxLink','maxChain','allClears','roundCleared','roundSteps','roundHammers','wonderCollected','wonderToken','sugarTarget','sugarAwarded','justFilled','accepted','processed','drawn','seen','hits','pendingDraws','queue'];
function logical(e){
 const state=encode(Object.fromEntries(STATE_KEYS.map(key=>[key,e[key]])));
 // The native Sugar ID embeds the engine's restore-generation number. Its
 // low two digits identify the true ball; the generation is not game RNG.
 if(state.wonderToken)state.wonderToken.id%=100;
 return state;
}
function restoreFields(e){return encode(Object.fromEntries(STATE_KEYS.map(key=>[key,e[key]])));}
function independentStep(state,number){
 const next=structuredClone(state),pos=state.nodeNumbers.indexOf(number),ball=state.processed+1;
 if(pos<0){next.power=Math.min(16,state.power*2);next.boostCount++;return {next,award:null,status:{role:'boost',power:next.power},flows:[]};}
 const before=W.clone(state.glasses),plan=W.pour(before,pos,state.power,W.flavorFor(ball)),previous=state.totalHundredths;
 next.glasses=plan.glasses;next.wasted+=plan.wasted;next.totalPoured+=state.power;
 next.fullCount=plan.full;next.mixCount=plan.mix;next.countMultiplier=plan.countMultiplier;next.mixMultiplier=plan.mixMultiplier;
 next.totalHundredths=plan.hundredths;next.presentedMixCount=plan.mix;next.lastGain=plan.hundredths-previous;
 next.justFilled=plan.glasses.map((g,i)=>g.volume>=1-W.EPS&&before[i].volume<1-W.EPS?i:-1).filter(i=>i>=0);
 assert(Math.abs(before.reduce((sum,g)=>sum+g.volume,0)+state.power-plan.wasted-plan.glasses.reduce((sum,g)=>sum+g.volume,0))<1e-8,'native pour conserves liquid');
 return {next,flows:plan.flows,status:plan.mix>state.mixCount?{role:'odds',fromMix:state.mixCount,toMix:plan.mix}:null,
  award:next.justFilled.length&&(next.lastGain>0||plan.full===21)?{role:plan.full===21?'allfull':'full',full:plan.full,mix:plan.mix,justFilled:next.justFilled,gain:next.lastGain,win:Math.floor(state.roundBet*next.lastGain/100)}:null};
}
async function advance(e,number,events){
 const before=logical(e),oracle=independentStep(before,number);events.length=0;
 assert(e.enqueueBatch([number]),'the real engine accepts this unused numbered ball');
 await new Promise(resolve=>setImmediate(resolve));
 assert(!e.busy&&e.processed===before.processed+1,'the native draw settles exactly once');
 assert.equal(e.power,oracle.next.power);assert.equal(e.boostCount,oracle.next.boostCount);
 for(const key of ['glasses','fullCount','mixCount','countMultiplier','mixMultiplier','totalHundredths','totalPoured','wasted','lastGain','presentedMixCount'])assert.deepEqual(encode(e[key]),encode(oracle.next[key]),'independent core oracle agrees: '+key);
 const phases=events.filter(event=>event.phase.startsWith('winery'));
 if(oracle.status)assert(phases.some(event=>event.phase===(oracle.status.role==='boost'?'wineryBoost':'wineryOddsUp')));
 if(oracle.award){const event=phases.find(event=>event.phase==='wineryAward');assert(event);assert.equal(event.gain,oracle.award.gain);assert.deepEqual(event.justFilled,oracle.award.justFilled);}
 return {number,ball:e.processed,before,after:logical(e),oracle:encode(oracle),events:encode(phases),settlement:Math.floor(e.roundBet*e.totalHundredths/100)};
}
const allScenarios=[
 {id:'stages-desktop',group:'stages',width:1366,height:900,bet:3000,prefix:BOOSTS.slice(0,3),numbers:[9,4,11]},
 {id:'full-lowbet-390',group:'stages',width:390,height:844,bet:1,prefix:BOOSTS,numbers:[4]},
 {id:'allfull-320',group:'allfull',width:320,height:568,bet:300000,prefix:SEVENTH_FULL.slice(0,6),numbers:SEVENTH_FULL.slice(6)},
 {id:'allfull-mini-390',group:'allfull',width:390,height:844,bet:3000,prefix:EIGHTH_FULL.slice(0,7),numbers:EIGHTH_FULL.slice(7),mini:true},
 {id:'allfull-reduced-430',group:'allfull',width:430,height:932,bet:300000,prefix:EIGHTH_FULL.slice(0,7),numbers:EIGHTH_FULL.slice(7),reduced:true}
];
const group=process.env.WINERY298_GROUP||'all';assert(['all','stages','allfull'].includes(group));
const scenarios=allScenarios.filter(s=>group==='all'||s.group===group);
async function fixture(spec){
 const events=[],e=new W.WineryEngine({random:rng(SEED),sleep:async()=>{},onEvent:event=>events.push(event)});
 // Only the isolated Node witness skips sleeps; browser timing is untouched.
 e.wait=async()=>true;e.roundBet=spec.bet;assert.equal(e.pattern,2);assert.deepEqual(e.boostNumbers,BOOSTS);e.start();
 for(const number of spec.prefix)await advance(e,number,events);
 const fields=restoreFields(e),before=logical(e),steps=[];
 for(const number of spec.numbers)steps.push(await advance(e,number,events));
 if(spec.numbers.at(-1)===1){assert.equal(e.processed,8);assert.equal(e.fullCount,21);assert.equal(steps.at(-1).oracle.award,null,'already-full eighth ball does not create a second award');assert(steps.at(-1).events.some(event=>event.phase==='wineryAllFull'),'the native repeated status event is preserved');}
 return {seed:SEED,fields,before,steps,draws:spec.prefix,bet:spec.bet};
}
const witnesses=Object.fromEntries(await Promise.all(scenarios.map(async s=>[s.id,await fixture(s)])));
const fixtureSummary=Object.fromEntries(Object.entries(witnesses).map(([id,w])=>[id,{seed:w.seed,bet:w.bet,draws:w.draws,steps:w.steps.map(s=>({ball:s.ball,number:s.number,status:s.oracle.status,award:s.oracle.award,full:s.after.fullCount,mix:s.after.mixCount,power:s.after.power,totalHundredths:s.after.totalHundredths,settlement:s.settlement,nativePhases:s.events.map(e=>e.phase)}))}]));
if(process.argv.includes('--fixtures-only')){console.log(JSON.stringify({rulesVersion:W.version,coreSha256:createHash('sha256').update(coreSource).digest('hex'),fixtures:fixtureSummary},null,2));process.exit(0);}
if(process.argv.includes('--list-cases')){console.log(JSON.stringify({group,scenarios}));process.exit(0);}

// Browser execution belongs to the dedicated CI job. The fixture mode above
// deliberately has no Playwright, image or display-server dependency.
const {chromium}=await import('playwright');
await fs.mkdir(output,{recursive:true});
const version=JSON.parse(await fs.readFile('app-version.json','utf8')).version;
const report={version,group,rulesVersion:W.version,coreSha256:createHash('sha256').update(coreSource).digest('hex'),
 planned:scenarios.map(s=>s.id),fixtures:fixtureSummary,starts:[],cases:[],failures:[],pageErrors:[],assetFailures:[],apiRequests:[],externalRequests:[],
 scope:'Reachable native checkpoints followed by real numbered-button input; independent pour/prize oracle, all liquid layers, true WIN and settlement, generated-image provenance, live cup/MIX/power counts, desktop/320/390/430/mini/reduced motion. No live services or modified production timing.',
 approvedPresentationChange:'The generated cabinets contain decorative headings. Live full/MIX/power/number values remain native; payout b retains its exact amount plus WIN text and accessible label, while the repeated row WIN unit may be visually hidden.'};
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.svg':'image/svg+xml','.avif':'image/avif','.wav':'audio/wav','.mp3':'audio/mpeg'};
const bridge='\n;window.__qa298={app,slots,select,syncManualNumbers,scheduleUI,get active(){return active;}};\n';
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1');
 if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/ws')){report.apiRequests.push(url.pathname);res.writeHead(451).end();return;}
 const file=path.resolve(root,'.'+decodeURI(url.pathname==='/'?'/index.html':url.pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 try{let body=await fs.readFile(file);if(file.endsWith('/assets/award-presentation-v277.js'))body=Buffer.concat([body,Buffer.from(bridge)]);
  res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream','cache-control':'no-store'}).end(body);
 }catch{res.writeHead(404).end();}
});
server.listen(0,'127.0.0.1');await once(server,'listening');
const base='http://127.0.0.1:'+server.address().port,ART='assets/winery-art-v298/';

function observeArt(){
 const lineage=new WeakMap(),texts=new WeakMap(),imageCalls=new WeakMap(),digitDraws=new WeakMap(),urls=new Map();
 const sources=image=>{
  if(!image)return [];const own=lineage.get(image);if(own?.size)return [...own];
  const src=image.currentSrc||image.src;if(urls.has(src))return [...urls.get(src)];
  if(typeof src==='string')try{const u=new URL(src,location.href);if(u.origin===location.origin&&u.pathname.startsWith('/assets/'))return [u.pathname.slice(1)];}catch{}
  return [];
 };
 const append=(map,key,items,limit=256)=>{if(items.length)map.set(key,[...(map.get(key)||[]),...items].slice(-limit));};
 const transformed=(ctx,dx,dy,dw,dh)=>{
  const m=ctx.getTransform(),points=[[dx,dy],[dx+dw,dy],[dx,dy+dh],[dx+dw,dy+dh]].map(([x,y])=>({x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f}));
  return {left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))};
 };
 const draw=CanvasRenderingContext2D.prototype.drawImage;
 CanvasRenderingContext2D.prototype.drawImage=function(image,...args){
  const out=Reflect.apply(draw,this,[image,...args]),list=sources(image),width=image?.naturalWidth||image?.width,height=image?.naturalHeight||image?.height;
  if(list.length){let set=lineage.get(this.canvas);if(!set){set=new Set();lineage.set(this.canvas,set);}list.forEach(source=>set.add(source));}
  const inherited=imageCalls.get(image);
  if(inherited?.length)append(imageCalls,this.canvas,inherited.map(call=>({...call,sourceRect:call.sourceRect.slice()})));
  else if(list.length&&width&&height){
   const sourceRect=args.length===8?args.slice(0,4):[0,0,width,height];
   append(imageCalls,this.canvas,list.map(source=>({source,sourceRect,sourceSize:[width,height]})));
  }
  const inheritedDigits=digitDraws.get(image);
  if(inheritedDigits?.length)append(digitDraws,this.canvas,inheritedDigits);
  else if(list.includes('assets/winery-art-v298/award-digits.webp')&&args.length===8){
   append(digitDraws,this.canvas,[{sourceRect:args.slice(0,4),sourceSize:[width,height],rect:transformed(this,...args.slice(4)),alpha:this.globalAlpha}]);
  }
  append(texts,this.canvas,texts.get(image)||[]);
  return out;
 };
 const clear=CanvasRenderingContext2D.prototype.clearRect;
 CanvasRenderingContext2D.prototype.clearRect=function(x,y,w,h){
  const m=this.getTransform(),out=Reflect.apply(clear,this,[x,y,w,h]);
  if(!m.b&&!m.c&&x*m.a+m.e<=0&&y*m.d+m.f<=0&&(x+w)*m.a+m.e>=this.canvas.width&&(y+h)*m.d+m.f>=this.canvas.height){lineage.delete(this.canvas);texts.delete(this.canvas);imageCalls.delete(this.canvas);digitDraws.delete(this.canvas);}
  return out;
 };
 const fill=CanvasRenderingContext2D.prototype.fillText;
 CanvasRenderingContext2D.prototype.fillText=function(value,...args){const out=Reflect.apply(fill,this,[value,...args]);append(texts,this.canvas,[String(value)]);return out;};
 const toURL=HTMLCanvasElement.prototype.toDataURL;
 HTMLCanvasElement.prototype.toDataURL=function(...args){const result=Reflect.apply(toURL,this,args),list=sources(this);if(list.length)urls.set(result,new Set(list));return result;};
 const box=node=>{if(!node)return null;const r=node.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
 const visible=node=>{if(!node)return false;for(let p=node;p instanceof Element;p=p.parentElement){const css=getComputedStyle(p);if(p.hidden||p.inert||css.display==='none'||css.visibility==='hidden'||Number(css.opacity)===0)return false;}const r=box(node);return r.width>0&&r.height>0;};
 const textBox=node=>{if(!node)return null;const range=document.createRange();range.selectNodeContents(node);return box({getBoundingClientRect:()=>range.getBoundingClientRect()});};
 window.__wineryArt298={box,visible,textBox,inspect:image=>({sources:sources(image),texts:[...new Set(texts.get(image)||[])],imageCalls:imageCalls.get(image)||[],digitDraws:digitDraws.get(image)||[],width:image?.width,height:image?.height})};
}

let browser,context,page,current;
async function startManualRound(label){
 // Ready artwork may finish after the native countdown. Accept only an
 // untouched manual round, or invoke the ordinary visible Start button.
 const start=await page.evaluate(()=>{
  const q=__qa298,e=WineryPyramid.engine;
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
 report.starts.push({label,...start});console.log('WINERY_V298_NATIVE_START',label,start.path);
 await page.waitForFunction(()=>__qa298.app.phase==='playing'&&WineryPyramid.engine.idle,null,{timeout:45000});
}
async function open(spec,witness){
 context=await browser.newContext({viewport:{width:spec.width,height:spec.height},serviceWorkers:'block',reducedMotion:spec.reduced?'reduce':'no-preference'});
 await context.addInitScript(observeArt);
 await context.route('**/*',route=>{
  const u=new URL(route.request().url());if(u.origin!==base){report.externalRequests.push(u.href);return route.abort();}
  if(u.pathname.startsWith('/api/')||u.pathname.startsWith('/ws')){report.apiRequests.push(u.pathname);return route.abort();}return route.continue();
 });
 page=await context.newPage();page.on('pageerror',error=>report.pageErrors.push({case:current,error:String(error.stack||error)}));
 page.on('response',response=>{if(response.status()>=400&&/winery.*v298/.test(response.url()))report.assetFailures.push({case:current,url:response.url(),status:response.status()});});
 await page.goto(base+'/?edition=local&appv='+encodeURIComponent(version),{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__qa298&&window.SweetsLocalDebugV258?.ready&&window.WineryPyramid?.installed&&window.SweetsAwardsV277&&window.WineryArtV298&&window.WineryAwardV298,null,{timeout:90000});
 assert.deepEqual(await page.evaluate(()=>Promise.all([WineryArtV298.ready,WineryAwardV298.ready])),[true,true],'all new artwork loads before native input');
 await page.evaluate(()=>document.fonts.ready);
 await page.waitForFunction(()=>document.documentElement.classList.contains('winery-art-v298'));
 await page.locator('#manual-number-toggle').click();
 await page.waitForFunction(()=>SweetsLocalDebugV258.describe().manualNumbers&&__qa298.app.phase==='ready');
 await page.evaluate(bet=>{
  const q=__qa298;q.index=q.slots.findIndex(slot=>slot.engine.kind==='winery');if(q.index<0)throw Error('Missing Winery slot');
  if(!SweetsLocalDebugV258.setBets(q.app.bets.map((_,i)=>i===q.index?bet:0)))throw Error('native local BET setup failed');q.select(q.index);
 },spec.bet);
 if(spec.id==='stages-desktop'){
  const lesson=await page.waitForFunction(()=>{
   const status=window.SweetsDemoSuite?.status;if(!status?.active||status.kind!=='winery')return null;
   const cv=[...document.querySelectorAll('canvas.ds91-lesson,.ds139-story canvas')].find(__wineryArt298.visible);if(!cv)return null;
   const trace=__wineryArt298.inspect(cv);if(!trace.sources.includes('assets/winery-art-v298/glass-and-tags.webp'))return null;
   return {status,trace,box:__wineryArt298.box(cv),art:WineryArtV298.describe()};
  },null,{polling:'raf',timeout:15000});
  report.betLesson=await lesson.jsonValue();await lesson.dispose();assert(report.betLesson.art.lesson>0,'the native BET lesson uses the dedicated cup painter');
  await page.screenshot({path:path.join(output,'winery-bet-lesson.png')});
 }
 await startManualRound(spec.id);
 const restored=await page.evaluate(({witness,keys,mini})=>{
  const q=__qa298,e=WineryPyramid.engine,slot=q.slots[q.index];
  const revive=(_key,value)=>value&&Array.isArray(value.$set)?new Set(value.$set):value&&Array.isArray(value.$map)?new Map(value.$map):value;
  const fields=JSON.parse(JSON.stringify(witness.fields),revive),phase=q.app.phase;q.app.phase='ready';
  for(const [key,value]of Object.entries(fields)){const d=Object.getOwnPropertyDescriptor(e,key);if(d?.get&&!d.set)continue;e[key]=value;}
  q.app.draws=witness.draws.slice();q.app.paid[q.index]=false;e.running=true;e.paused=false;e.presentationRate=1;
  e.afterCheckpointRestoreV247?.();e.running=true;e.emit('waiting');q.app.phase=phase;
  q.getState=()=>{
   const result=JSON.parse(JSON.stringify(Object.fromEntries(keys.map(key=>[key,e[key]])),(_key,value)=>value instanceof Set?{$set:[...value]}:value instanceof Map?{$map:[...value]}:value));
   if(result.wonderToken)result.wonderToken.id%=100;return result;
  };
  q.nativeEvents=[];q.randomDraws=0;
  const nativeEmit=e.emit,nativeRandom=e.random;
  e.emit=function(event,detail={}){const result=nativeEmit.apply(this,arguments);q.nativeEvents.push({event:{phase:event,...structuredClone(detail)},at:performance.now(),processed:this.processed,fx:this.fx?{type:this.fx.type,elapsed:this.fx.elapsed,duration:this.fx.duration}:null});return result;};
  e.random=function(...args){q.randomDraws++;return Reflect.apply(nativeRandom,this,args);};
  q.nativeTiming={wait:e.wait,sleep:e.sleep,speed:e.speed,presentationRate:e.presentationRate};
  if(mini){const other=q.slots.findIndex(s=>s.engine.kind==='gelato');if(other<0)throw Error('Missing neighbouring mini view');q.select(other);}
  slot.dirtyMain=slot.dirtyMini=true;q.syncManualNumbers();q.scheduleUI(q.app);WineryPyramid.draw();
  return {state:q.getState(),awards:SweetsAwardsV277.describe(),locked:q.app.locked[q.index],enabled:q.app.enabled[q.index]};
 },{witness,keys:STATE_KEYS,mini:!!spec.mini});
 assert.deepEqual(restored.state,witness.before,'native reachable checkpoint restores exactly');
 assert.equal(restored.awards.received,0,'checkpoint restore never synthesizes an award');assert.equal(restored.locked,spec.bet);assert.equal(restored.enabled,true);
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
}

function inspect(){
 const q=__qa298,e=WineryPyramid.engine,slot=q.slots[q.index],scene=slot.panel.querySelector('.wp-scene'),canvas=scene.querySelector('.wp-canvas');
 const {box,visible,textBox}=__wineryArt298,origin=box(scene),scale=origin.width/Math.max(1,scene.clientWidth);
 const anchors=Object.fromEntries([['board',canvas],['payout',scene.querySelector('.wp-sidebar')],['boost',scene.querySelector('.wp-power-left')],['rows',scene.querySelector('.wp-pay-window')],['mix',scene.querySelector('.wp-mix')]].map(([key,node])=>{
  const r=box(node);return [key,Object.fromEntries(['left','right','top','bottom'].map(axis=>[axis,(r[axis]-origin[axis==='left'||axis==='right'?'left':'top'])/(scale||1)]))];
 }));
 const text=node=>({text:node?.textContent,box:box(node),ink:textBox(node),visible:visible(node),clientWidth:node?.clientWidth,scrollWidth:node?.scrollWidth});
 return {state:q.getState(),engine:{phase:e.phase,processed:e.processed,accepted:e.accepted,running:e.running,busy:e.busy,fx:e.fx?{type:e.fx.type,duration:e.fx.duration,elapsed:e.fx.elapsed}:null,randomDraws:q.randomDraws,
   timingUnchanged:e.wait===q.nativeTiming.wait&&e.sleep===q.nativeTiming.sleep&&e.speed===q.nativeTiming.speed&&e.presentationRate===q.nativeTiming.presentationRate},
  app:{phase:q.app.phase,draws:q.app.draws.slice(),paid:q.app.paid[q.index],win:q.app.roundWins[q.index],locked:q.app.locked[q.index]},
  anchors,board:{scene:origin,canvas:box(canvas),mainVisible:visible(canvas),mini:box(slot.miniCanvas),miniVisible:visible(slot.miniCanvas),fieldWidth:document.querySelector('#screen>.game>.field').clientWidth,fieldHeight:document.querySelector('#screen>.game>.field').clientHeight,
   cupPoints:Array.from({length:21},(_,id)=>WineryPyramid.hitGeometryV276(canvas.width,canvas.height,false,{id,type:'bowl'})),
   miniPoints:Array.from({length:21},(_,id)=>WineryPyramid.hitGeometryV276(slot.miniCanvas.width,slot.miniCanvas.height,true,{id,type:'bowl'}))},
  hud:{full:text(scene.querySelector('.wp-score strong')),miniFull:text(scene.querySelector('.wp-score-mini')),mix:text(scene.querySelector('.wp-mix i')),multiplier:text(scene.querySelector('.wp-mix b')),power:text(scene.querySelector('.wp-volume-number')),poured:text(scene.querySelector('.wp-total-poured')),
   boosts:[...scene.querySelectorAll('.wp-boost-number')].map(node=>({number:Number(node.querySelector('.wp-boost-numeral')?.textContent),hit:node.classList.contains('hit'),label:node.getAttribute('aria-label'),box:box(node)}))},
  cabinets:[['payout',scene.querySelector('.wp-sidebar')],['boost',scene.querySelector('.wp-power-left')]].map(([role,node])=>({role,background:getComputedStyle(node).backgroundImage,visible:visible(node),box:box(node)})),
  rows:[...scene.querySelectorAll('.wp-pay-row')].map(row=>({full:Number(row.dataset.full),label:row.querySelector('b').getAttribute('aria-label'),text:row.querySelector('b').textContent,amount:text(row.querySelector('.wp298-row-amount')),box:box(row),cell:box(row.querySelector('b'))})),
  mainArt:__wineryArt298.inspect(canvas),miniArt:__wineryArt298.inspect(slot.miniCanvas),
  art:WineryArtV298.describe(),award:WineryAwardV298.describe(),awards:SweetsAwardsV277.describe(),nativeEvents:q.nativeEvents.slice(),
  motion:{reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,mixEdge:getComputedStyle(scene.querySelector('.wp-mix'),'::after').animationName,stream:getComputedStyle(scene.querySelector('.wp-pay-pour-stream')).animationName},
  documentWidth:document.documentElement.scrollWidth,viewport:innerWidth};
}
function captureStatus({expected,received}){
 const q=__qa298,e=WineryPyramid.engine,fx=e.fx,api=WineryAwardV298.describe(),last=api.lastStatus,cv=q.slots[q.index].panel.querySelector('.wp-canvas');
 if(!fx||fx.type!==expected.role||!last||last.role!==expected.role||fx.elapsed<fx.duration*.18||fx.elapsed>fx.duration*.82||!__wineryArt298.visible(cv))return null;
 const source='assets/winery-art-v298/award-'+expected.role+'.webp',trace=__wineryArt298.inspect(cv);
 if(!trace.sources.includes(source)||!trace.texts.includes(last.label))return null;
 return {api,last,trace,source,fx:{...fx},state:q.getState(),awards:SweetsAwardsV277.describe(),expectedReceived:received,nativeEvents:q.nativeEvents.slice(),
  miniTrace:__wineryArt298.inspect(q.slots[q.index].miniCanvas),image:cv.toDataURL('image/png'),motion:{reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,mixEdge:getComputedStyle(q.slots[q.index].panel.querySelector('.wp-mix'),'::after').animationName}};
}
function captureAward({expected,mini,reduced}){
 const q=__qa298,d=SweetsAwardsV277.describe(),event=d.active.find(cue=>cue.game==='winery'),api=WineryAwardV298.describe(),last=api.last;
 if(!event||event.phase!=='wineryAward'||event.win!==expected.win||last?.role!==expected.role||last.win!==expected.win||last.mini!==mini||event.age<(reduced?16:300))return null;
 const cv=document.querySelector('.award-presentation-'+(mini?'mini':'main')+'[data-game="winery"]');if(!__wineryArt298.visible(cv))return null;
 const trace=__wineryArt298.inspect(cv),source='assets/winery-art-v298/award-'+expected.role+'.webp';
 if(!trace.sources.includes(source)||!trace.sources.includes('assets/winery-art-v298/award-digits.webp')||!last.rasterNumbers||!trace.texts.includes(last.liveLabel))return null;
 const box=__wineryArt298.box(cv),pixels=cv.getContext('2d',{willReadFrequently:true}).getImageData(0,0,cv.width,cv.height).data;let nontransparent=0;
 for(let i=3;i<pixels.length;i+=4)if(pixels[i]>10)nontransparent++;
 return {event,frozenSnapshot:Object.isFrozen(event.winery),api,last,trace,box,nontransparent,pointerEvents:getComputedStyle(cv).pointerEvents,
  status:q.slots[q.index].panel.querySelector('.award-v277-status')?.textContent,nativeEvents:q.nativeEvents.slice(),image:cv.toDataURL('image/png')};
}
function checkLayout(view,spec){
 const state=view.state;assert(view.documentWidth<=view.viewport,'no horizontal page overflow');
 assert.equal(view.hud.full.text,state.fullCount+' / 21');assert.equal(view.hud.miniFull.text,state.fullCount+'/21');
 assert.equal(view.hud.mix.text,String(state.mixCount));assert.equal(view.hud.multiplier.text,'×'+state.mixMultiplier.toFixed(1));assert.equal(view.hud.power.text,state.power+'杯');
 assert.equal(view.hud.poured.text,'注 '+state.totalPoured.toLocaleString('ja-JP',{maximumFractionDigits:1})+'杯');
 assert.deepEqual(view.hud.boosts.map(item=>item.number),state.boostNumbers);
 for(const item of view.hud.boosts)assert.equal(item.hit,state.seen.$set.includes(item.number),'boost HIT marker follows the real numbered input');
 assert.equal(view.rows.length,12);
 for(const row of view.rows){
  const amount=Math.floor(spec.bet*Math.round(Math.round(W.PAY[row.full]*100)*(10+state.mixCount)/10)/100);
  assert.equal(row.amount.text,String(amount),'live paytable credits agree with native full and MIX multipliers');assert.equal(row.text,String(amount)+'WIN');assert.equal(row.label,amount+' WIN');
  if(!spec.mini){assert(row.amount.visible,'all twelve actual payout amounts are visible');assert(row.amount.ink.left>=row.cell.left-1&&row.amount.ink.right<=row.cell.right+1,'complete live payout digits fit horizontally');assert(row.amount.ink.top>=row.box.top-1&&row.amount.ink.bottom<=row.box.bottom+1,'complete live payout digits fit vertically');}
 }
 assert.equal(view.art.loaded,true);assert.equal(view.award.loaded,true);assert.equal(view.award.digitsReady,true);assert.deepEqual(view.art.errors,[]);assert.deepEqual(view.award.errors,[]);
 const trace=spec.mini?view.miniArt:view.mainArt;
 assert(trace.sources.includes(ART+'glass-and-tags.webp'),'the actual visible main/mini cups use the new generated glass/tag atlas');
 assert(trace.imageCalls.filter(call=>call.source===ART+'glass-and-tags.webp').length>=42,'every glass and number plaque uses the new art lineage');
 for(const number of state.nodeNumbers)assert(trace.texts.includes(String(number)),'live cup number is still painted: '+number);
 if(spec.mini){assert(view.board.miniVisible);assert(!trace.sources.some(source=>/award-(?:odds|boost)\.webp$/.test(source)),'miniature never inherits a main-only information card');}
 else{
  assert(view.board.mainVisible);assert.equal(view.board.fieldWidth,432,'native Winery field width is preserved');
  for(const cabinet of view.cabinets){assert(cabinet.visible);assert(cabinet.background.includes('winery-art-v298/'+cabinet.role+'-cabinet.webp'),'visible cabinet uses the dedicated generated image');}
  for(const item of [view.hud.full,view.hud.mix,view.hud.multiplier,view.hud.power,view.hud.poured])assert(item.visible,'live full/MIX/power/pour quantity remains visible');
 }
 for(const [points,canvas]of [[view.board.cupPoints,view.mainArt],[view.board.miniPoints,view.miniArt]])for(const p of points){assert(p.x-p.r>=0&&p.y-p.r>=0&&p.x+p.r<=canvas.width&&p.y+p.r<=canvas.height,'all 21 native cup anchors fit their canvas');}
 if(spec.reduced){assert(view.motion.reduced);assert.equal(view.motion.mixEdge,'none');assert.equal(view.motion.stream,'none');}
}
function fixed(before,after){for(const key of Object.keys(before))for(const axis of Object.keys(before[key]))assert(Math.abs(before[key][axis]-after[key][axis])<.3,key+' '+axis+' remains fixed while live quantities change');}
function checkStatus(captured,step,received,spec){
 const expected=step.oracle.status,label=expected.role==='odds'?'MIX '+expected.toMix+'杯  ×'+(1+expected.toMix/10).toFixed(1):'次の注入量 '+expected.power+'杯';
 assert.equal(captured.last.role,expected.role);assert.equal(captured.last.label,label);assert.equal(captured.last.source,ART+'award-'+expected.role+'.webp');assert.equal(captured.last.win,null,'information card does not invent a WIN');
 assert.equal(captured.awards.received,received,'MIX/boost does not create a monetary award');
 for(const key of ['glasses','fullCount','mixCount','totalHundredths','totalPoured','wasted'])assert.deepEqual(captured.state[key],step.before[key],'status cannot settle the pour early: '+key);
 assert.equal(captured.fx.duration,expected.role==='odds'?950:650,'native status duration is untouched');
 if(expected.role==='odds'){assert.equal(captured.last.fromMix,expected.fromMix);assert.equal(captured.last.toMix,expected.toMix);assert.equal(captured.state.power,step.before.power);}
 else{assert.equal(captured.last.power,expected.power);assert.equal(captured.state.power,expected.power);}
 assert(captured.nativeEvents.some(entry=>entry.event.phase===(expected.role==='odds'?'wineryOddsUp':'wineryBoost')),'information image is driven by its actual native event');
 assert(!captured.miniTrace.sources.includes(captured.source),'main status image never paints over the live miniature');
 if(spec.reduced){assert.equal(captured.last.still,true);assert.equal(captured.motion.mixEdge,'none');}
}
function checkAward(captured,step,spec){
 const expected=step.oracle.award,event=captured.event,last=captured.last;
 assert.equal(event.win,expected.win,'award WIN is the true native gain, including low-BET flooring');assert.equal(event.gain,expected.gain);assert.equal(event.total,false);
 assert.equal(captured.frozenSnapshot,true);assert.deepEqual(event.winery,{full:expected.full,mix:expected.mix,justFilledCount:expected.justFilled.length,power:step.after.power,mixMultiplier:(10+expected.mix)/10});
 assert.equal(last.label,event.label);assert.equal(last.detail,event.detail);assert.equal(last.mini,!!spec.mini);assert.equal(last.source,ART+'award-'+expected.role+'.webp');
 const liveLabel=expected.role==='allfull'?'21杯 全満！ ・ MIX '+expected.mix+'杯':'満杯 '+expected.full+' / 21杯 ・ MIX '+expected.mix+'杯';
 assert.equal(last.liveLabel,liveLabel);assert(captured.trace.texts.includes(liveLabel),'actual native cup counts are painted over the generated artwork');
 assert.equal(last.winText,expected.win.toLocaleString('ja-JP')+' WIN');assert.equal(last.rasterNumbers,true);assert.equal(captured.api.fallbackAmounts,0);
 const glyphs=[...expected.win.toLocaleString('ja-JP'),'WIN'];assert.deepEqual(last.glyphs,glyphs);
 assert.deepEqual(captured.trace.digitDraws.map(call=>call.sourceRect),glyphs.map(glyph=>captured.api.glyphRects[glyph]),'actual image source rectangles draw every true digit, comma and WIN in order');
 for(const call of captured.trace.digitDraws){const [x,y,w,h]=call.sourceRect,[sw,sh]=call.sourceSize;assert(x>=0&&y>=0&&w>0&&h>0&&x+w<=sw&&y+h<=sh,'each glyph crop is bounded by the generated source');assert(call.alpha>0);assert(call.rect.left>=-.5&&call.rect.top>=-.5&&call.rect.right<=captured.trace.width+.5&&call.rect.bottom<=captured.trace.height+.5,'the complete live amount stays inside its visible overlay');}
 assert(captured.nontransparent>30,'the observed overlay contains actual nontransparent art pixels');assert.equal(captured.pointerEvents,'none');
 assert(captured.status?.includes(expected.win.toLocaleString('ja-JP')),'native accessible text contains the exact WIN');
 assert(!captured.trace.sources.includes('assets/award-art-v291/themed-cutin-atlas.webp'),'the dedicated Winery image replaces the old generic cut-in');
 const native=captured.nativeEvents.find(entry=>entry.event.phase==='wineryAward'&&entry.event.gain===expected.gain)?.event;
 assert(native,'celebration comes from the real accepted numbered draw');assert.deepEqual(native.justFilled,expected.justFilled);assert.equal(native.full,expected.full);assert.equal(native.mix,expected.mix);
}
async function saveCapture(captured,name){await fs.writeFile(path.join(output,name+'.png'),Buffer.from(captured.image.split(',')[1],'base64'));delete captured.image;}

try{
 browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{}),args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 for(const spec of scenarios){
  current=spec.id;const witness=witnesses[spec.id],started=Date.now(),completedSteps=[];
  try{
   await open(spec,witness);const before=await page.evaluate(inspect);checkLayout(before,spec);await page.screenshot({path:path.join(output,spec.id+'-before.png')});
   let previous=before;
   for(const step of witness.steps){
    await page.waitForFunction(()=>{const d=SweetsAwardsV277.describe();return !d.active.some(cue=>cue.game==='winery')&&!d.pending.some(cue=>cue.game==='winery');},null,{timeout:30000});
    const start=await page.evaluate(()=>({events:__qa298.nativeEvents.length,received:SweetsAwardsV277.describe().received,statusPaints:WineryAwardV298.describe().statusPaints}));
    const captures=[];
    if(step.oracle.status&&!spec.mini)captures.push(page.waitForFunction(captureStatus,{expected:step.oracle.status,received:start.received},{polling:'raf',timeout:45000}).then(async handle=>{const value=await handle.jsonValue();await handle.dispose();return {kind:'status',value};}));
    if(step.oracle.award)captures.push(page.waitForFunction(captureAward,{expected:step.oracle.award,mini:!!spec.mini,reduced:!!spec.reduced},{polling:'raf',timeout:45000}).then(async handle=>{const value=await handle.jsonValue();await handle.dispose();return {kind:'award',value};}));
    // Attach rejection handlers before input; short native FX are observed from
    // a RAF armed before the real button can start the draw.
    const paint=Promise.allSettled(captures);
    const button=page.locator('#manual-number-grid button[data-number="'+step.number+'"]');
    await button.waitFor({state:'visible'});await page.waitForFunction(number=>{const b=document.querySelector('#manual-number-grid button[data-number="'+number+'"]');return b&&!b.disabled;},step.number,{timeout:30000});
    await button.click();
    const captured=await paint;
    for(const result of captured){if(result.status==='rejected')throw result.reason;if(result.value.kind==='status')checkStatus(result.value.value,step,start.received,spec);else checkAward(result.value.value,step,spec);await saveCapture(result.value.value,spec.id+'-ball'+step.ball+'-'+result.value.kind);}
    await page.screenshot({path:path.join(output,spec.id+'-ball'+step.ball+'-live.png')});
    await page.waitForFunction(ball=>{const e=WineryPyramid.engine;return e.processed===ball&&!e.busy&&!e.fx;},step.ball,{timeout:90000});
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const after=await page.evaluate(inspect);
    assert.deepEqual(after.state,step.after,'all native liquid layers, RNG-sensitive setup, counts and prizes equal the independent reachable witness');
    assert.equal(after.engine.randomDraws,0,'presentation consumes no gameplay RNG');assert.equal(after.engine.timingUnchanged,true,'the native wait/sleep/speed/presentation-rate contract is unchanged');
    assert.deepEqual(after.app.draws,after.state.seen.$set,'real manual input records exactly the accepted prefix and next number');
    assert.deepEqual(after.nativeEvents.slice(start.events).filter(entry=>entry.event.phase.startsWith('winery')).map(entry=>entry.event),step.events,'actual native Winery phase payloads remain exact and ordered');
    assert.equal(after.awards.received-start.received,step.oracle.award?1:0,'only the real newly-full award creates a monetary presentation');
    if(spec.mini)assert.equal(after.award.statusPaints,start.statusPaints,'the unselected main board does not render status cards');
    else{fixed(before.anchors,after.anchors);assert(!after.mainArt.sources.some(source=>/award-(?:odds|boost)\.webp$/.test(source)),'status image disappears with its native FX');}
    assert.deepEqual(after.board.cupPoints,before.board.cupPoints,'21 main cup anchors remain fixed');assert.deepEqual(after.board.miniPoints,before.board.miniPoints,'21 mini cup anchors remain fixed');
    checkLayout(after,spec);
    if(step.ball===8){assert.equal(after.app.paid,true);assert.equal(after.app.win,step.settlement,'eighth-ball settlement is the original cumulative native payout');assert.equal(after.engine.running,false);}
    await page.screenshot({path:path.join(output,spec.id+'-ball'+step.ball+'-after.png')});
    completedSteps.push({number:step.number,ball:step.ball,before:previous,after,captures:captured.map(result=>result.value),receivedDelta:after.awards.received-start.received});previous=after;
   }
   report.cases.push({id:spec.id,status:'passed',durationMs:Date.now()-started,steps:completedSteps});console.log('WINERY_V298_CASE_PASS',spec.id);
  }catch(error){let diagnostics;try{diagnostics=await page?.evaluate(inspect);await page?.screenshot({path:path.join(output,spec.id+'-failure.png')});}catch{}
   report.failures.push({id:spec.id,error:String(error),stack:error.stack,diagnostics});report.cases.push({id:spec.id,status:'failed',durationMs:Date.now()-started,steps:completedSteps});console.error('WINERY_V298_CASE_FAIL',spec.id,String(error));
  }finally{await context?.close();context=null;page=null;}
 }
 assert.equal(report.pageErrors.length,0,'no browser page errors');assert.equal(report.assetFailures.length,0,'all new artwork requests succeed');assert.equal(report.apiRequests.length,0,'no wallet or live server API is called');assert.equal(report.cases.length,scenarios.length);assert.equal(report.failures.length,0);report.ok=true;
}catch(error){report.ok=false;report.error=String(error);process.exitCode=1;}
finally{await fs.writeFile(path.join(output,'report-'+group+'.json'),JSON.stringify(report,null,2)+'\n');await context?.close();await browser?.close();await new Promise(resolve=>server.close(resolve));console.log('WINERY_V298_REPORT',output+'/report-'+group+'.json');}

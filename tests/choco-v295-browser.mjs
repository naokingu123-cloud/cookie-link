/* Focused CI witnesses for the production Chocolate Canyon engine.
 * CPU fixtures omit presentation waits only. The browser restores a reachable
 * checkpoint, clicks the real manual draw UI, and retains native rules/clocks.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
import {loadChoco,nativeCore,random} from './choco-v295-fixture.mjs';

const root=process.cwd(),output='qa-choco-v295',kindFilter=process.env.CHOCO_V295_KIND||'all';
assert(['all','fruit','chain','depth'].includes(kindFilter),'CHOCO_V295_KIND must be all, fruit, chain, or depth');
const scenarios=[
 {id:'fruit-desktop',kind:'fruit',width:1366,height:900,mobile:false,bet:3000},
 {id:'fruit-320',kind:'fruit',width:320,height:568,mobile:true,bet:300000},
 {id:'chain-390',kind:'chain',width:390,height:844,mobile:true,bet:300000},
 {id:'chain-mini',kind:'chain',width:390,height:844,mobile:true,bet:300000,mini:true},
 {id:'depth-430',kind:'depth',width:430,height:932,mobile:true,bet:300000},
 {id:'depth-reduced',kind:'depth',width:430,height:932,mobile:true,bet:300000,reduced:true}
].filter(scenario=>kindFilter==='all'||scenario.kind===kindFilter);
assert.equal(scenarios.length,kindFilter==='all'?6:2);
if(process.argv.includes('--list-cases')){console.log(JSON.stringify({kindFilter,plannedCaseCount:scenarios.length,plannedCases:scenarios.map(s=>s.id)}));process.exit(0);}
const encode=value=>JSON.parse(JSON.stringify(value,(_key,v)=>v instanceof Set?{$set:[...v]}:v instanceof Map?{$map:[...v]}:v));
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const skipFields=new Set(['version','cycle','phase','running','busy','paused','presentationRate','roundBet','beforeComplete','onEvent','random','sleep','visualWait','storage']);
const fields=e=>encode(Object.fromEntries(Object.entries(e).filter(([key,value])=>typeof value!=='function'&&!skipFields.has(key))));
const FRUITS=['apple','mandarin','lemon','blueberry','grape','melon'];
function groupedFruit(items){
 const counts=new Map();for(const item of items||[])if(item.gain>0&&FRUITS.includes(item.tile?.fruit))counts.set(item.tile.fruit,(counts.get(item.tile.fruit)||0)+1);
 return [...counts].map(([key,count])=>({key,count})).sort((a,b)=>FRUITS.indexOf(a.key)-FRUITS.indexOf(b.key));
}
function compactEvent(event,e,q){
 const proof={phase:event.phase,number:event.number??event.numbers?.at(-1)??null,gain:event.gain||0,totalHundredths:e.totalHundredths,
  depth:e.depth,cause:event.cause||null,chainIndex:event.chainIndex||0,bonusDepth:event.bonusDepth||null,
  bonusDepths:event.bonusDepths||[],bonusIndex:event.bonusIndex||null,bonusKind:event.bonusKind||null,
  fruits:groupedFruit(event.items),ms:event.ms||0};
 if(event.phase==='canyonMelt'&&event.cause==='gravity'){
  const moving=new Set(q.chocoFallStep(event.before,9).moves.map(move=>move.id)),targets=new Set(event.targets.map(v=>v.tile.id));
  proof.targets=event.targets.map(v=>({id:v.tile.id,r:v.r,c:v.c,color:v.tile.color,fruit:v.tile.fruit||null}));
  proof.landed=event.targets.every(v=>!moving.has(v.tile.id));
  proof.groupSizes=q.chocoGroups(event.before,9).groups.filter(group=>group.some(v=>targets.has(v.tile.id))).map(group=>group.length);
 }
 return proof;
}
async function nativeFixtures(){
 const q=loadChoco({target:90});assert.equal(q.CHOCO_WORLD_REVISION,9);
 const result={},started=Date.now(),wanted=kindFilter==='all'?['fruit','chain','depth']:[kindFilter];
 const seeds=[2957919,7919,902,75319,...Array.from({length:20},(_,i)=>(i+2)*104729)];
 let drawsTried=0;
 for(const seed of seeds){
  const events=[],e=new q.ChocoDigEngine({random:random(seed),sleep:()=>Promise.resolve(),onEvent:(event,engine)=>events.push(compactEvent(event,engine,q))});
  // Production resolution is unchanged. Only this CPU fixture pass skips the
  // wall-clock visual waits; the browser never installs this override.
  e.visualWait=async(_ms,token)=>token===e.version;
  const priorRounds=[];
  for(let round=0;round<8;round++){
   if(round)e.reset();e.start();const draws=[];
   for(let ball=0;ball<8;ball++){
    assert(Date.now()-started<45000,'native witness search is bounded to 45 seconds');
    const next=e.lucky.numbers[0];assert(Number.isInteger(next)&&!draws.includes(next),'a normal unused 1–25 draw');
    const checkpoint={fields:fields(e),world:encode(e.world()),draws:draws.slice(),next,provenance:{constructorSeed:seed,priorRounds:priorRounds.map(values=>values.slice()),round,policy:'draw the currently assigned top ALL number'}};
    events.length=0;assert(e.enqueueBatch([next]),'native enqueue accepts the manual number');
    for(let spin=0;e.busy||e.queue.length;spin++){assert(spin<100000,'native fixture drain is bounded');await Promise.resolve();}
    assert(!events.some(event=>event.phase==='error'));assert.equal(e.processed,draws.length+1);drawsTried++;
    let chainIndex=0,gravity=null,elapsed=0;
    for(const event of events){
     if(event.phase==='canyonMelt'&&event.cause==='gravity'){chainIndex=event.chainIndex;gravity=event;assert(gravity.landed&&gravity.groupSizes.every(size=>size>=4));}
     const mode=event.phase==='canyonBonus'&&event.gain>0?'depth':event.phase==='canyonCollect'&&event.gain>0&&event.fruits.length?(chainIndex>0?'chain':'fruit'):null;
     if(mode&&wanted.includes(mode)&&!result[mode]){
      if(mode==='depth')assert(event.bonusDepth>0&&event.bonusDepth%100===0&&event.bonusDepths.includes(event.bonusDepth));
      result[mode]={...checkpoint,proof:{mode,...event,chainIndex,gravity,nativeDelayMs:elapsed,worldHash:hash(checkpoint.world),sourceSha256:createHash('sha256').update(nativeCore()).digest('hex')}};
     }
     elapsed+=event.ms;
    }
    draws.push(next);
    if(wanted.every(kind=>result[kind]))return {witnesses:result,search:{drawsTried,elapsedMs:Date.now()-started}};
   }
   assert.equal(e.phase,'complete');priorRounds.push(draws.slice());
  }
 }
 throw Error('No reachable native witness for '+wanted.filter(kind=>!result[kind]).join(', '));
}
const fixtureResult=await nativeFixtures(),witnesses=fixtureResult.witnesses;
const briefFixtures=()=>Object.fromEntries(Object.entries(witnesses).map(([kind,f])=>[kind,{draws:f.draws,next:f.next,provenance:f.provenance,proof:f.proof}]));
if(process.argv.includes('--fixtures-only')){console.log(JSON.stringify({kindFilter,...fixtureResult.search,witnesses:briefFixtures()}));process.exit(0);}

// Browser harness follows below. It is deliberately absent from the fixture
// search path so --fixtures-only never opens a port or launches Chromium.
assert(process.env.CI||process.env.GITHUB_ACTIONS,'Run --fixtures-only locally; browser witnesses run in CI');
const {chromium}=await import('playwright');
const version=JSON.parse(await fs.readFile('app-version.json','utf8')).version;
const report={version,kindFilter,plannedCaseCount:scenarios.length,plannedCases:scenarios.map(s=>s.id),
 scope:'Six native Choco-only witnesses; real manual draws, unchanged browser engine/clocks, generated reachable checkpoints',
 fixtureSearch:fixtureResult.search,witnesses:briefFixtures(),cases:[],failures:[],pageErrors:[],assetFailures:[],apiRequests:[],externalRequests:[]};
await fs.mkdir(output,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.svg':'image/svg+xml','.mp3':'audio/mpeg','.wav':'audio/wav','.avif':'image/avif'};
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1');
 if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/ws')){report.apiRequests.push(url.pathname);res.writeHead(451).end();return;}
 const file=path.resolve(root,'.'+decodeURI(url.pathname==='/'?'/index.html':url.pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 try{
  let body=await fs.readFile(file);
  // Test-server-only lexical bridge. No fixture loader is shipped to clients.
  if(file.endsWith('/assets/award-presentation-v277.js'))body=Buffer.concat([body,Buffer.from('\n;window.__qa295={app,slots,select,syncManualNumbers,scheduleUI,medalWin,chocoGroups,chocoFallStep,CHOCO_FRUITS,CHOCO_BONUS_NAMES,CHOCO_WORLD_REVISION,get active(){return active;}};\n')]);
  res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream','cache-control':'no-store'}).end(body);
 }catch{res.writeHead(404).end();}
});
server.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;

function observeArt(){
 const assets=new WeakMap(),texts=new WeakMap(),draws=new WeakMap(),urls=new Map();
 const rawSource=image=>{const src=image?.currentSrc||image?.src;if(typeof src!=='string')return [];if(urls.has(src))return [...urls.get(src)];try{const u=new URL(src,location.href);return u.origin===location.origin&&/^\/(assets|optimized)\//.test(u.pathname)?[u.pathname.slice(1)]:[];}catch{return [];}};
 const sources=image=>{
  if(!image)return [];const names=new Set(assets.get(image)||rawSource(image));
  // Autotile pixels are composed through get/putImageData. Follow the helper's
  // actual decoded source images for those canvases, not a claimed URL alone.
  for(const source of window.ChocoArtV295?.sourceImagesOf?.(image)||[])for(const name of rawSource(source))names.add(name);
  return [...names];
 };
 const mark=(canvas,names)=>{if(!names.length)return;const set=assets.get(canvas)||new Set();names.forEach(name=>set.add(name));assets.set(canvas,set);};
 const draw=CanvasRenderingContext2D.prototype.drawImage;
 CanvasRenderingContext2D.prototype.drawImage=function(image,...args){
  const result=Reflect.apply(draw,this,[image,...args]),names=sources(image);mark(this.canvas,names);
  if(texts.has(image))texts.set(this.canvas,[...new Set([...(texts.get(this.canvas)||[]),...texts.get(image)])].slice(-100));
  const url=rawSource(image)[0];
  if(url&&/^assets\/choco-art-v295\/award-(fruit|chain|depth|digits)\.webp$/.test(url)){
   const record={source:url};
   if(url.endsWith('/award-digits.webp')&&args.length===8){
    const column=Math.floor((args[0]+args[2]/2)/(image.naturalWidth/4)),row=Math.floor((args[1]+args[3]/2)/(image.naturalHeight/3));
    record.glyph=['0','1','2','3','4','5','6','7','8','9',',','WIN'][row*4+column];
   }else{
    const [x,y,w,h]=args.length===8?args.slice(4):args.length===4?args:[args[0],args[1],image.naturalWidth||image.width,image.naturalHeight||image.height];
    const m=this.getTransform(),points=[[x,y],[x+w,y],[x,y+h],[x+w,y+h]].map(([px,py])=>({x:m.a*px+m.c*py+m.e,y:m.b*px+m.d*py+m.f}));
    record.bounds={left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))};
   }
   const list=draws.get(this.canvas)||[];list.push(record);draws.set(this.canvas,list.slice(-80));
  }
  return result;
 };
 const clear=CanvasRenderingContext2D.prototype.clearRect;
 CanvasRenderingContext2D.prototype.clearRect=function(x,y,w,h){const m=this.getTransform(),result=Reflect.apply(clear,this,[x,y,w,h]);if(!m.b&&!m.c&&x*m.a+m.e<=0&&y*m.d+m.f<=0&&(x+w)*m.a+m.e>=this.canvas.width&&(y+h)*m.d+m.f>=this.canvas.height){assets.delete(this.canvas);texts.delete(this.canvas);draws.delete(this.canvas);}return result;};
 const fill=CanvasRenderingContext2D.prototype.fillText;
 CanvasRenderingContext2D.prototype.fillText=function(value,...args){const result=Reflect.apply(fill,this,[value,...args]);texts.set(this.canvas,[...new Set([...(texts.get(this.canvas)||[]),String(value)])].slice(-100));return result;};
 const dataURL=HTMLCanvasElement.prototype.toDataURL;
 HTMLCanvasElement.prototype.toDataURL=function(...args){const result=Reflect.apply(dataURL,this,args),names=sources(this);if(names.length)urls.set(result,new Set(names));return result;};
 window.__chocoArt295={inspect:image=>({sources:sources(image),texts:texts.get(image)||[],draws:draws.get(image)||[]})};
}

let browser,context,page,current,contextKey;
async function closeContext(){await context?.close().catch(()=>{});context=null;page=null;contextKey=null;}
async function open(scenario){
 const key=JSON.stringify([scenario.width,scenario.height,scenario.mobile,!!scenario.reduced,scenario.bet]);
 if(page&&contextKey===key)return;
 await closeContext();contextKey=key;
 context=await browser.newContext({viewport:{width:scenario.width,height:scenario.height},hasTouch:scenario.mobile,serviceWorkers:'block',reducedMotion:scenario.reduced?'reduce':'no-preference'});
 await context.addInitScript(observeArt);
 await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin!==base){report.externalRequests.push(url.href);return route.abort();}return route.continue();});
 page=await context.newPage();page.on('pageerror',error=>report.pageErrors.push(String(error.stack||error)));
 page.on('response',response=>{const url=new URL(response.url());if(response.status()>=400&&/^\/(assets|optimized)\//.test(url.pathname))report.assetFailures.push({path:url.pathname,status:response.status()});});
 await page.goto(base+'/?edition=local&set=all&appv='+encodeURIComponent(version),{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__qa295&&window.SweetsLocalDebugV258?.ready&&window.ChocoArtV295&&window.ChocoAwardV295,null,{timeout:90000});
 const ready=await page.evaluate(()=>Promise.all([ChocoArtV295.ready,ChocoArtV295.furnitureReady,ChocoAwardV295.ready,document.fonts.ready.then(()=>true)]));
 assert.deepEqual(ready,[true,true,true,true]);
 await page.locator('#manual-number-toggle').click();
 await page.waitForFunction(()=>SweetsLocalDebugV258.describe().manualNumbers&&__qa295.app.phase==='ready');
 await page.evaluate(bet=>{const q=__qa295,index=q.slots.findIndex(s=>s.engine.kind==='choco');if(!SweetsLocalDebugV258.setBets(q.app.bets.map((_,i)=>i===index?bet:0)))throw Error('Native virtual bet setup failed');q.select(index);q.scheduleUI(q.app);},scenario.bet);
 await page.locator('#manual-start').click();
 await page.waitForFunction(()=>__qa295.app.phase==='playing'&&__qa295.slots.find(s=>s.engine.kind==='choco').engine.idle,null,{timeout:45000});
}
async function restoreCheckpoint(fixture){
 const restored=await page.evaluate(fixture=>{
  const q=__qa295,index=q.slots.findIndex(s=>s.engine.kind==='choco'),slot=q.slots[index],e=slot.engine;
  if(!q.nativeCaptureInstalled){
   const emit=e.emit;
   e.emit=function(phase,detail={}){
    const result=Reflect.apply(emit,this,arguments);if(!q.captureNative)return result;
    const byFruit=new Map();for(const item of detail.items||[])if(item.gain>0&&item.tile?.fruit)byFruit.set(item.tile.fruit,(byFruit.get(item.tile.fruit)||0)+1);
    const event={phase,number:detail.number??detail.numbers?.at(-1)??null,gain:detail.gain||0,totalHundredths:this.totalHundredths,depth:this.depth,
     expectedWin:q.medalWin(q.app.locked[index],detail.gain||0),cause:detail.cause||null,chainIndex:detail.chainIndex||0,
     bonusDepth:detail.bonusDepth||null,bonusDepths:detail.bonusDepths||[],bonusIndex:detail.bonusIndex||null,bonusKind:detail.bonusKind||null,
     fruits:[...byFruit].map(([key,count])=>({key,count})),items:(detail.items||[]).filter(item=>item.gain>0).map(item=>({id:item.tile.id,fruit:item.tile.fruit,gain:item.gain}))};
    if(phase==='canyonMelt'&&detail.cause==='gravity'){
     const moving=new Set(q.chocoFallStep(detail.before,9).moves.map(move=>move.id)),ids=new Set(detail.targets.map(item=>item.tile.id));
     event.landed=detail.targets.every(item=>!moving.has(item.tile.id));
     event.groupSizes=q.chocoGroups(detail.before,9).groups.filter(group=>group.some(item=>ids.has(item.tile.id))).map(group=>group.length);
    }
    q.nativeEvents.push(event);return result;
   };q.nativeCaptureInstalled=true;
  }
  q.captureNative=false;const receivedBefore=SweetsAwardsV277.describe().received,phase=q.app.phase;
  q.app.phase='ready';e.version++;
  const data=JSON.parse(JSON.stringify(fixture.fields),(_key,value)=>value&&Array.isArray(value.$set)?new Set(value.$set):value&&Array.isArray(value.$map)?new Map(value.$map):value);
  for(const [key,value]of Object.entries(data)){const descriptor=Object.getOwnPropertyDescriptor(e,key);if(!descriptor?.get||descriptor.set)e[key]=value;}
  q.app.draws=fixture.draws.slice();q.app.paid[index]=false;e.busy=false;e.paused=false;e.presentationRate=1;e.running=true;
  e.afterCheckpointRestoreV247?.();e.running=true;e.emit('ready');e.emit('waiting');q.app.phase=phase;
  q.nativeEvents=[];q.captureNative=true;q.select(index);slot.dirtyMain=slot.dirtyMini=true;q.syncManualNumbers();q.scheduleUI(q.app);
  return {receivedBefore,receivedAfter:SweetsAwardsV277.describe().received,activeAwards:SweetsAwardsV277.describe().active.filter(cue=>cue.game==='choco'),
   nativeEvents:q.nativeEvents.slice(),world:e.world(),valid:e.validWorld(e.world()),revision:e.rulesRevision,processed:e.processed,accepted:e.accepted,
   engineClass:e.constructor.name,art:ChocoArtV295.describe(),award:ChocoAwardV295.describe()};
 },fixture);
 assert.equal(restored.receivedAfter,restored.receivedBefore,'checkpoint restoration does not replay awards');
 assert.deepEqual(restored.activeAwards,[]);assert.deepEqual(restored.nativeEvents,[]);
 assert.equal(restored.engineClass,'ChocoDigEngine');assert.equal(restored.revision,9);assert(restored.valid);
 assert.deepEqual(restored.world,fixture.world,'restoration preserves the genuinely reached native world');
 assert.equal(restored.processed,fixture.draws.length);assert.equal(restored.accepted,fixture.draws.length);
 assert.deepEqual(restored.art.failures,[]);assert.deepEqual(restored.award.failures,[]);assert.equal(restored.award.digitSource,'chocolate-v295');
 restored.worldHash=hash(restored.world);delete restored.world;
 await page.waitForFunction(()=>{const slot=__qa295.slots.find(s=>s.engine.kind==='choco'),sources=__chocoArt295.inspect(slot.chocoCanvas).sources;return ['cake-materials','fruit-rewards','hud-furniture'].every(name=>sources.includes('assets/choco-art-v295/'+name+'.webp'));},null,{timeout:45000});
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 return restored;
}
function inspectBoard(){
 const q=__qa295,slot=q.slots.find(s=>s.engine.kind==='choco'),e=slot.engine,observer=__chocoArt295;
 const rect=node=>{const r=node.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
 const game=document.querySelector('#screen>.game'),field=game.querySelector(':scope>.field'),sample=document.createElement('canvas');sample.width=sample.height=72;
 const ctx=sample.getContext('2d',{willReadFrequently:true});ctx.drawImage(slot.chocoCanvas,0,0,72,72);const pixels=ctx.getImageData(0,0,72,72).data,colors=new Set();let opaque=0;
 for(let i=0;i<pixels.length;i+=4)if(pixels[i+3]>24){opaque++;colors.add((pixels[i]>>4)+','+(pixels[i+1]>>4)+','+(pixels[i+2]>>4));}
 return {selected:q.slots[q.active].engine.kind||'cookie',mobile:document.body.classList.contains('mobile-view'),landscape:document.body.classList.contains('mobile-landscape'),
  touch:navigator.maxTouchPoints,coarse:matchMedia('(pointer:coarse)').matches,viewport:{width:innerWidth,height:innerHeight},documentWidth:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth),
  game:rect(game),field:rect(field),board:rect(slot.chocoCanvas),console:rect(document.getElementById('console')),nativeFieldWidth:field.clientWidth,
  sources:observer.inspect(slot.chocoCanvas).sources,pixels:{opaque,colors:colors.size},nativeWin:q.medalWin(q.app.locked[slot.i],e.totalHundredths),canvasWin:Number(slot.chocoCanvas.dataset.win),
  fruits:ChocoArtV295.fruitNames.map(key=>({key,...observer.inspect(ChocoArtV295.fruit(key))})),activeSources:observer.inspect(q.slots[q.active].panel.querySelector('canvas')).sources};
}
function inspectAward({kind,mini,reduced,next}){
 const q=__qa295,slot=q.slots.find(s=>s.engine.kind==='choco'),diagnostics=SweetsAwardsV277.describe();
 const event=diagnostics.active.find(cue=>cue.game==='choco'&&cue.choco?.mode===kind&&cue.win>0&&cue.number===next);
 const canvas=document.querySelector('.award-presentation-'+(mini?'mini':'main')+'[data-game="choco"]');
 if(!event||event.age<(reduced?20:300)||!canvas||canvas.hidden)return null;
 for(let node=canvas;node instanceof Element;node=node.parentElement){const style=getComputedStyle(node);if(node.hidden||style.display==='none'||style.visibility==='hidden'||Number(style.opacity)===0)return null;}
 const style=getComputedStyle(canvas),bounds=canvas.getBoundingClientRect();if(bounds.width<5||bounds.height<5)return null;
 const traced=__chocoArt295.inspect(canvas),expected='assets/choco-art-v295/award-'+kind+'.webp',art=ChocoAwardV295.describe();
 if(!traced.sources.includes(expected)||art.last?.mode!==kind||art.last.win!==event.win)return null;
 const glyphs=traced.draws.filter(draw=>draw.source.endsWith('/award-digits.webp')).map(draw=>draw.glyph);
 if(!glyphs.length)return null;
 const sample=document.createElement('canvas');sample.width=sample.height=96;const ctx=sample.getContext('2d',{willReadFrequently:true});ctx.drawImage(canvas,0,0,96,96);
 const pixels=ctx.getImageData(0,0,96,96).data;let alpha=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]>24)alpha++;if(alpha<60)return null;
 const sugarNode=slot.sugarAwardScreen,sugarContent=sugarNode?.querySelector('.sugar-award-content'),sugarBounds=sugarContent?.getBoundingClientRect();
 let sugarVisible=!!sugarNode;
 for(let node=sugarNode;node instanceof Element;node=node.parentElement){const css=getComputedStyle(node);if(node.hidden||css.display==='none'||css.visibility==='hidden'||Number(css.opacity)===0)sugarVisible=false;}
 const sugar={active:!!slot.sugarAwardActive,present:!!sugarNode,hidden:!!sugarNode?.hidden,visible:sugarVisible,compact:sugarNode?.classList.contains('choco-v295-compact')||false,
  label:sugarNode?.getAttribute('aria-label')||'',icon:sugarNode?.querySelector('.sugar-award-icon use')?.getAttribute('href')||'',
  box:sugarBounds?{left:sugarBounds.left,top:sugarBounds.top,right:sugarBounds.right,bottom:sugarBounds.bottom,width:sugarBounds.width,height:sugarBounds.height}:null};
 return {event,diagnostics,art,alpha,...traced,glyphs,pointerEvents:style.pointerEvents,
  canvas:{width:canvas.width,height:canvas.height},box:{left:bounds.left,top:bounds.top,right:bounds.right,bottom:bounds.bottom,width:bounds.width,height:bounds.height},
  nativeEvents:q.nativeEvents.slice(),sugar,status:slot.panel.querySelector('.award-v277-status')?.textContent,selected:q.slots[q.active].engine.kind||'cookie',
  activeSources:__chocoArt295.inspect(q.slots[q.active].panel.querySelector('canvas')).sources,overlay:canvas.toDataURL('image/png')};
}
function near(actual,expected,label,tolerance=.8){assert(Math.abs(actual-expected)<=tolerance,label+': '+actual+' vs '+expected);}
function contained(inner,outer,label,tolerance=1.5){assert(inner.left>=outer.left-tolerance&&inner.right<=outer.right+tolerance&&inner.top>=outer.top-tolerance&&inner.bottom<=outer.bottom+tolerance,label+': '+JSON.stringify({inner,outer}));}
const sortFruits=fruits=>fruits.map(fruit=>({...fruit})).sort((a,b)=>FRUITS.indexOf(a.key)-FRUITS.indexOf(b.key));
const startedRun=Date.now();
try{
 browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{}),args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 for(const scenario of scenarios){
  current=scenario.id;const started=Date.now();
  try{
   assert(Date.now()-startedRun<12*60*1000,'browser shard stays within a twelve-minute run budget');
   await open(scenario);const fixture=witnesses[scenario.kind],restored=await restoreCheckpoint(fixture),board=await page.evaluate(inspectBoard);
   assert.equal(board.selected,'choco');assert.equal(board.mobile,scenario.mobile);assert(!board.landscape);assert.equal(board.nativeFieldWidth,430);
   assert(board.pixels.opaque>1000&&board.pixels.colors>24,'real detailed board pixels are painted');assert.equal(board.canvasWin,board.nativeWin);
   for(const name of ['cake-materials','fruit-rewards','hud-furniture'])assert(board.sources.includes('assets/choco-art-v295/'+name+'.webp'),'actual Choco board transfers '+name);
   assert.deepEqual(board.fruits.map(fruit=>fruit.key),FRUITS);assert(board.fruits.every(fruit=>fruit.sources.includes('assets/choco-art-v295/fruit-rewards.webp')));
   assert(!board.sources.some(source=>source.startsWith('assets/cookie-art-v293/')),'other-game art does not enter the Choco board');
   assert(board.documentWidth<=board.viewport.width+2);contained(board.board,board.game,'board stays inside cabinet');
   assert(board.game.bottom<=board.console.top+1.5,'main cabinet clears BET/WIN/CREDIT');
   if(scenario.mobile){
    assert(board.touch>0&&board.coarse,'a true touch/coarse phone context');near(board.game.left,scenario.width/480,'v294 near-edge shell');near(board.game.right,scenario.width-scenario.width/480,'v294 right shell edge');
    assert(board.field.left<=6.5&&scenario.width-board.field.right<=6.5,'board and payout retain v294 near-edge width');
   }
   await page.screenshot({path:path.join(output,scenario.id+'-board.png')});
   if(scenario.mini){
    await page.evaluate(()=>{const q=__qa295;q.select(q.slots.findIndex(slot=>slot.engine.kind==='gelato'));q.scheduleUI(q.app);});
    await page.waitForFunction(()=>__qa295.slots[__qa295.active].engine.kind==='gelato');
   }
   await page.waitForFunction(number=>{const button=document.querySelector('#manual-number-grid button[data-number="'+number+'"]');return button&&!button.disabled;},fixture.next,{timeout:30000});
   const manualButton=page.locator('#manual-number-grid button[data-number="'+fixture.next+'"]'),manualBox=await manualButton.boundingBox();
   assert(manualBox?.height>12,'manual draw rows retain usable height instead of collapsing under the history label');
   // Observe rejection immediately: a real click failure can close the page
   // before the award waiter is awaited, and must retain its own diagnostics.
   const pending=page.waitForFunction(inspectAward,{kind:scenario.kind,mini:!!scenario.mini,reduced:!!scenario.reduced,next:fixture.next},{polling:'raf',timeout:scenario.kind==='chain'?150000:100000}).then(handle=>({handle}),error=>({error}));
   await manualButton.click();
   const outcome=await pending;if(outcome.error)throw outcome.error;
   const handle=outcome.handle,evidence=await handle.jsonValue();await handle.dispose();
   assert.equal(evidence.pointerEvents,'none');assert.equal(evidence.diagnostics.errors,0);assert.equal(evidence.selected,scenario.mini?'gelato':'choco');
   const event=evidence.event,native=evidence.nativeEvents.find(item=>item.phase===event.phase&&item.number===fixture.next&&item.gain===event.gain&&item.expectedWin===event.win&&item.totalHundredths===fixture.proof.totalHundredths&&
    (scenario.kind!=='depth'||item.bonusDepth===event.choco.depth));
   assert(native,'the visible popup follows a real matching native event');assert.equal(native.gain,fixture.proof.gain,'browser rules reproduce CPU witness amount');
   assert.equal(event.win,native.expectedWin,'native gain passes through medalWin exactly');assert.equal(evidence.art.last.win,native.expectedWin);assert.equal(event.total,false);assert.equal(evidence.art.last.total,false);
   assert.equal(event.choco.mode,scenario.kind);assert.equal(evidence.art.last.source,'assets/choco-art-v295/award-'+scenario.kind+'.webp');
   assert.equal(evidence.art.digitSource,'chocolate-v295');assert(evidence.art.last.rasterNumbers);assert.equal(evidence.art.fallbackAmounts,0);
   assert.equal(evidence.glyphs.join(''),native.expectedWin.toLocaleString('ja-JP')+'WIN','actual raster glyph draws spell the exact native amount');
   assert(evidence.sources.includes('assets/choco-art-v295/award-digits.webp'));
   assert(!evidence.sources.some(source=>source.startsWith('assets/cookie-art-v293/')||source==='assets/award-art-v291/themed-cutin-atlas.webp'),'no previous/shared award interior leaks into Choco');
   const imageDraw=evidence.draws.find(draw=>draw.source===evidence.art.last.source&&draw.bounds);assert(imageDraw);contained(imageDraw.bounds,{left:0,top:0,right:evidence.canvas.width,bottom:evidence.canvas.height},'entire illustrated popup is inside its canvas',2);
   if(!scenario.mini){
    const sugar=evidence.sugar;
    if(sugar.active){assert(!sugar.hidden&&sugar.compact,'earned Sugar keeps its native display in a separate compact badge');assert(sugar.label.includes('シュガーGET')&&sugar.icon,'earned Sugar retains its real accessible label and tier icon');}
    if(sugar.visible){
     const sx=evidence.box.width/evidence.canvas.width,sy=evidence.box.height/evidence.canvas.height,plaque={left:evidence.box.left+imageDraw.bounds.left*sx,right:evidence.box.left+imageDraw.bounds.right*sx,top:evidence.box.top+imageDraw.bounds.top*sy,bottom:evidence.box.top+imageDraw.bounds.bottom*sy};
     assert(sugar.box&&sugar.box.width>0&&sugar.box.height>0,'Sugar acknowledgment remains visible');
     assert(sugar.box.right<=plaque.left+1||sugar.box.left>=plaque.right-1||sugar.box.bottom<=plaque.top+1||sugar.box.top>=plaque.bottom-1,'the generic Sugar receipt does not cover the v295 award plaque: '+JSON.stringify({sugar:sugar.box,plaque}));
    }
   }
   assert(evidence.status?.includes(native.expectedWin.toLocaleString('ja-JP')),'accessible status retains exact native WIN');
   if(scenario.kind==='depth'){
    assert.equal(native.bonusDepth,fixture.proof.bonusDepth);assert.equal(event.choco.depth,native.bonusDepth);assert.equal(native.bonusIndex,native.bonusDepth/100);assert(native.bonusDepths.includes(native.bonusDepth));
    assert.equal(evidence.art.last.depth,native.bonusDepth);assert.deepEqual(event.choco.fruits,[]);
   }else{
    assert.deepEqual(sortFruits(event.choco.fruits),sortFruits(native.fruits),'the popup depicts the actual collected fruit identities/counts');
    assert.deepEqual(sortFruits(evidence.art.last.fruits),sortFruits(native.fruits));assert(evidence.sources.includes('assets/choco-art-v295/fruit-rewards.webp'));
    if(scenario.kind==='chain'){
     const index=evidence.nativeEvents.indexOf(native),gravity=evidence.nativeEvents.slice(0,index).filter(item=>item.phase==='canyonMelt'&&item.cause==='gravity'&&item.number===fixture.next).at(-1);
     assert(gravity&&gravity.landed&&gravity.groupSizes.length&&gravity.groupSizes.every(size=>size>=4),'real landed ≥4 groups cause this fruit chain');
     assert.equal(event.choco.chain,gravity.chainIndex);assert.equal(evidence.art.last.chain,gravity.chainIndex);
    }else assert(!event.choco.chain,'multiple collected fruit alone does not create a chain');
   }
   if(scenario.mini){assert(evidence.art.miniPaints>0);assert(!evidence.activeSources.some(source=>source.startsWith('assets/choco-art-v295/')),'Choco art does not leak into the selected Gelato board');}
   else{assert(evidence.art.mainPaints>0);contained(evidence.box,board.game,'award overlay stays within the main cabinet');}
   if(scenario.reduced){assert(evidence.diagnostics.reducedMotion);assert.equal(evidence.diagnostics.maxMainParticles,0);assert.equal(evidence.diagnostics.maxMiniParticles,0);}
   await fs.writeFile(path.join(output,scenario.id+'-overlay.png'),Buffer.from(evidence.overlay.split(',')[1],'base64'));delete evidence.overlay;
   await page.screenshot({path:path.join(output,scenario.id+'-award.png')});
   report.cases.push({id:scenario.id,status:'passed',durationMs:Date.now()-started,scenario,restored,board,evidence});
   console.log('CHOCO_V295_BROWSER_CASE_PASS',scenario.id);
  }catch(error){
   const failure={id:scenario.id,message:String(error),stack:error.stack};
   if(page)try{failure.state=await page.evaluate(()=>({art:window.ChocoArtV295?.describe(),award:window.ChocoAwardV295?.describe(),awards:window.SweetsAwardsV277?.describe(),nativeEvents:window.__qa295?.nativeEvents}));await page.screenshot({path:path.join(output,scenario.id+'-failure.png')});}catch{}
   report.failures.push(failure);console.error('CHOCO_V295_BROWSER_CASE_FAIL',scenario.id,String(error));await closeContext();
  }finally{await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');}
 }
 assert.deepEqual(report.pageErrors,[]);assert.deepEqual(report.assetFailures,[]);assert.deepEqual(report.apiRequests,[]);assert.deepEqual(report.externalRequests,[]);
 assert.equal(report.failures.length,0,'failed Choco cases: '+report.failures.map(f=>f.id).join(', '));assert.equal(report.cases.length,scenarios.length);
 report.ok=true;console.log('CHOCO_V295_BROWSER_PASS',JSON.stringify({version,kindFilter,cases:report.cases.length,nativePayouts:true,actualFruitIdentities:true}));
}catch(error){report.ok=false;report.failure={id:current,message:String(error),stack:error.stack};throw error;}
finally{await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');await closeContext();await browser?.close().catch(()=>{});await new Promise(resolve=>server.close(resolve));}

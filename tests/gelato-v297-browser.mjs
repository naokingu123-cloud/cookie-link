/* Six CI-only native Gelato presentation witnesses. CPU checkpoints come from
 * real constructor seeds and legal draws. The browser clicks the normal manual
 * input and retains the production engine, payout conversion and wall clocks. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {once} from 'node:events';
import {buildWitnesses,sha256} from './gelato-v297-fixture.mjs';

const root=process.cwd(),output='qa-gelato-v297',kindFilter=process.env.GELATO_V297_KIND||'all';
assert(['all','panel','collector','full'].includes(kindFilter),'GELATO_V297_KIND must be all, panel, collector, or full');
const scenarios=[
 {id:'panel-desktop',kind:'panel',width:1366,height:900,mobile:false,bet:3000},
 {id:'panel-320',kind:'panel',width:320,height:568,mobile:true,bet:300000},
 {id:'collector-390',kind:'collector',width:390,height:844,mobile:true,bet:300000},
 {id:'collector-multiple-mini',kind:'collector',witness:'collectorMultiple',width:390,height:844,mobile:true,bet:300000,mini:true},
 {id:'full-430',kind:'full',width:430,height:932,mobile:true,bet:300000},
 {id:'full-reduced',kind:'full',width:430,height:932,mobile:true,bet:300000,reduced:true}
].filter(scenario=>kindFilter==='all'||scenario.kind===kindFilter);
assert.equal(scenarios.length,kindFilter==='all'?6:2);
if(process.argv.includes('--list-cases')){console.log(JSON.stringify({kindFilter,plannedCaseCount:scenarios.length,plannedCases:scenarios.map(s=>s.id)}));process.exit(0);}
const fixtureResult=await buildWitnesses(),witnesses=fixtureResult.witnesses;
const briefFixtures=()=>Object.fromEntries(Object.entries(witnesses).map(([kind,f])=>[kind,{draws:f.draws,next:f.next,provenance:f.provenance,proof:{...f.proof,stateAfter:undefined},stateHash:sha256(JSON.stringify(f.state))}]));
if(process.argv.includes('--fixtures-only')){console.log(JSON.stringify({kindFilter,...fixtureResult.search,witnesses:briefFixtures()}));process.exit(0);}

// No local browser or network server is entered by --fixtures-only.
assert(process.env.CI||process.env.GITHUB_ACTIONS,'Run --fixtures-only locally; browser witnesses run only in remote CI');
const {chromium}=await import('playwright');
const version=JSON.parse(await fs.readFile('app-version.json','utf8')).version;
const report={version,kindFilter,plannedCaseCount:scenarios.length,plannedCases:scenarios.map(s=>s.id),
 scope:'Six native Gelato witnesses, including single/multiple collectors; genuine checkpoint + manual input + unchanged browser clocks',
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
  // The lexical bridge exists only in this test server, never in shipped JS.
  if(file.endsWith('/assets/award-presentation-v277.js'))body=Buffer.concat([body,Buffer.from('\n;window.__qa297={app,slots,select,syncManualNumbers,scheduleUI,medalWin,get active(){return active;}};\n')]);
  res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream','cache-control':'no-store'}).end(body);
 }catch{res.writeHead(404).end();}
});
server.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;

function observeArt(){
 const assets=new WeakMap(),labels=new WeakMap(),draws=new WeakMap(),urls=new Map();
 const rawSource=image=>{const src=typeof image==='string'?image:image?.currentSrc||image?.src;if(typeof src!=='string')return [];if(urls.has(src))return [...urls.get(src)];try{const u=new URL(src,location.href);return u.origin===location.origin&&/^\/(assets|optimized)\//.test(u.pathname)?[u.pathname.slice(1)]:[];}catch{return [];}};
 const sources=image=>{
  if(!image)return [];const names=new Set(assets.get(image)||rawSource(image));
  for(const source of window.GelatoArtV297?.sourceImagesOf?.(image)||[])for(const name of rawSource(source))names.add(name);
  return [...names];
 };
 const mark=(canvas,names)=>{if(!names.length)return;const set=assets.get(canvas)||new Set();names.forEach(name=>set.add(name));assets.set(canvas,set);};
 const draw=CanvasRenderingContext2D.prototype.drawImage;
 CanvasRenderingContext2D.prototype.drawImage=function(image,...args){
  const result=Reflect.apply(draw,this,[image,...args]),names=sources(image);mark(this.canvas,names);
  const iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height;
  const [sx,sy,sw,sh,dx,dy,dw,dh]=args.length===8?args:args.length===4?[0,0,iw,ih,...args]:[0,0,iw,ih,args[0],args[1],iw,ih];
  const m=this.getTransform(),point=(x,y)=>({x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f});
  if(labels.has(image)){
   const inherited=labels.get(image).filter(label=>label.x>=sx&&label.x<=sx+sw&&label.y>=sy&&label.y<=sy+sh).map(label=>({
    ...label,...point(dx+(label.x-sx)*dw/sw,dy+(label.y-sy)*dh/sh),fontPx:label.fontPx*Math.abs(dh/sh)*Math.hypot(m.c,m.d)
   }));
   labels.set(this.canvas,[...(labels.get(this.canvas)||[]),...inherited].slice(-160));
  }
  const url=rawSource(image)[0];
  if(url&&/^assets\/gelato-art-v297\/(award-(panel|collector|full)|digits)\.webp$/.test(url)){
   const record={source:url};
   if(url.endsWith('/digits.webp')&&args.length===8){
    const column=Math.floor((sx+sw/2)/(iw/4)),row=Math.floor((sy+sh/2)/(ih/3));
    record.glyph=['0','1','2','3','4','5','6','7','8','9',',','WIN'][row*4+column];
   }else{
    const points=[[dx,dy],[dx+dw,dy],[dx,dy+dh],[dx+dw,dy+dh]].map(([x,y])=>point(x,y));
    record.bounds={left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))};
   }
   draws.set(this.canvas,[...(draws.get(this.canvas)||[]),record].slice(-80));
  }
  return result;
 };
 const clear=CanvasRenderingContext2D.prototype.clearRect;
 CanvasRenderingContext2D.prototype.clearRect=function(x,y,w,h){const m=this.getTransform(),result=Reflect.apply(clear,this,[x,y,w,h]);if(!m.b&&!m.c&&x*m.a+m.e<=0&&y*m.d+m.f<=0&&(x+w)*m.a+m.e>=this.canvas.width&&(y+h)*m.d+m.f>=this.canvas.height){assets.delete(this.canvas);labels.delete(this.canvas);draws.delete(this.canvas);}return result;};
 const fill=CanvasRenderingContext2D.prototype.fillText;
 CanvasRenderingContext2D.prototype.fillText=function(value,x,y,...rest){
  const result=Reflect.apply(fill,this,[value,x,y,...rest]),m=this.getTransform(),fontPx=Number(this.font.match(/([\d.]+)px/)?.[1]||0)*Math.hypot(m.c,m.d);
  labels.set(this.canvas,[...(labels.get(this.canvas)||[]),{text:String(value),x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f,fontPx,alpha:this.globalAlpha}].slice(-160));return result;
 };
 const dataURL=HTMLCanvasElement.prototype.toDataURL;
 HTMLCanvasElement.prototype.toDataURL=function(...args){const result=Reflect.apply(dataURL,this,args),names=sources(this);if(names.length)urls.set(result,new Set(names));return result;};
 window.__gelatoArt297={inspect:image=>({sources:sources(image),labels:labels.get(image)||[],draws:draws.get(image)||[]}),
  styleSources:value=>[...new Set([...String(value).matchAll(/url\(["']?([^"')]+)["']?\)/g)].flatMap(match=>rawSource(match[1])))]};
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
 await page.waitForFunction(()=>window.__qa297&&window.SweetsLocalDebugV258?.ready&&window.GelatoPrism&&window.GelatoArtV297&&window.GelatoAwardV297,null,{timeout:90000});
 assert.deepEqual(await page.evaluate(()=>Promise.all([GelatoArtV297.ready,GelatoAwardV297.ready,document.fonts.ready.then(()=>true)])),[true,true,true]);
 await page.locator('#manual-number-toggle').click();
 await page.waitForFunction(()=>SweetsLocalDebugV258.describe().manualNumbers&&__qa297.app.phase==='ready');
 await page.evaluate(bet=>{const q=__qa297,index=q.slots.findIndex(s=>s.engine.kind==='gelato');if(!SweetsLocalDebugV258.setBets(q.app.bets.map((_,i)=>i===index?bet:0)))throw Error('Native virtual bet setup failed');q.select(index);q.scheduleUI(q.app);},scenario.bet);
 await page.locator('#manual-start').click();
 await page.waitForFunction(()=>__qa297.app.phase==='playing'&&GelatoPrism.engine.idle,null,{timeout:45000});
}
async function restoreCheckpoint(fixture){
 const restored=await page.evaluate(fixture=>{
  const q=__qa297,index=q.slots.findIndex(s=>s.engine.kind==='gelato'),slot=q.slots[index],e=slot.engine;
  if(!q.nativeCaptureInstalled){
   const emit=e.emit;
   e.emit=function(phase,detail={}){
    const result=Reflect.apply(emit,this,arguments);if(q.captureNative)q.nativeEvents.push({phase,number:detail.number??detail.numbers?.at(-1)??null,
     gain:detail.gain||0,expectedWin:q.medalWin(q.app.locked[index],detail.gain||0),newFaces:detail.newFaces?.slice()||[],full:!!detail.full,
     filledCount:this.filled.size,counts:this.collectorCounts.slice(),totalHundredths:this.totalHundredths,countMultiplier:this.countMult,collectorMultiplier:this.collectorMult});return result;
   };q.nativeCaptureInstalled=true;
  }
  q.captureNative=false;const receivedBefore=SweetsAwardsV277.describe().received,phase=q.app.phase;
  q.app.phase='ready';e.version++;
  const data=JSON.parse(JSON.stringify(fixture.fields),(_key,value)=>value&&Array.isArray(value.$set)?new Set(value.$set):value&&Array.isArray(value.$map)?new Map(value.$map):value);
  for(const [key,value]of Object.entries(data)){const descriptor=Object.getOwnPropertyDescriptor(e,key);if(!descriptor?.get||descriptor.set)e[key]=value;}
  q.app.draws=fixture.draws.slice();q.app.paid[index]=false;e.busy=false;e.paused=false;e.presentationRate=1;e.running=true;
  e.afterCheckpointRestoreV247?.();e.running=true;e.emit('ready');e.emit('waiting');q.app.phase=phase;
  q.nativeEvents=[];q.captureNative=true;q.select(index);slot.dirtyMain=slot.dirtyMini=true;q.syncManualNumbers();q.scheduleUI(q.app);
  return {receivedBefore,receivedAfter:SweetsAwardsV277.describe().received,activeAwards:SweetsAwardsV277.describe().active.filter(cue=>cue.game==='gelato'),nativeEvents:q.nativeEvents.slice(),
   state:{nodeNumbers:e.nodeNumbers.slice(),faceGrades:e.faceGrades.slice(),pattern:e.pattern,patternTransform:e.patternTransform,hits:[...e.hits].sort((a,b)=>a-b),links:[...e.links].sort((a,b)=>a-b),filled:[...e.filled].sort((a,b)=>a-b),counts:e.collectorCounts.slice(),collectorMult:e.collectorMult,countMult:e.countMult,totalHundredths:e.totalHundredths,sugarTarget:e.sugarTarget,sugarAwarded:e.sugarAwarded,allComplete:e.allComplete,accepted:e.accepted,processed:e.processed,drawn:[...e.drawn],seen:[...e.seen],queue:e.queue},
   engineClass:e.constructor.name,nativeWait:e.wait===Object.getPrototypeOf(e).wait,art:GelatoArtV297.describe(),award:GelatoAwardV297.describe()};
 },fixture);
 assert.equal(restored.receivedAfter,restored.receivedBefore,'checkpoint restore never replays awards');
 assert.deepEqual(restored.activeAwards,[]);assert.deepEqual(restored.nativeEvents,[]);assert.equal(restored.engineClass,'GelatoEngine');assert(restored.nativeWait);
 assert.deepEqual(restored.state,fixture.state,'restoration keeps the genuine native board and exact payout state');
 assert.deepEqual(restored.art.failures,[]);assert.deepEqual(restored.award.failures,[]);
 restored.stateHash=sha256(JSON.stringify(restored.state));delete restored.state;
 await page.waitForFunction(()=>{const canvas=__qa297.slots.find(s=>s.engine.kind==='gelato').panel.querySelector('.gp-raster-board'),sources=__gelatoArt297.inspect(canvas).sources;return canvas.dataset.artVersion==='297'&&['materials','furniture'].every(name=>sources.includes('assets/gelato-art-v297/'+name+'.webp'));},null,{timeout:45000});
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 return restored;
}

function inspectBoard(){
 const q=__qa297,slot=q.slots.find(s=>s.engine.kind==='gelato'),e=slot.engine,observer=__gelatoArt297,snapshot=GelatoPrism.presentationV297;
 const rect=node=>{if(!node)return null;const r=node.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
 const game=document.querySelector('#screen>.game'),field=game.querySelector(':scope>.field'),canvas=slot.panel.querySelector('.gp-raster-board'),mini=slot.tab.querySelector('.gp-raster-board'),payout=slot.panel.querySelector('.gp-collector-panel');
 const pixelSummary=target=>{const sample=document.createElement('canvas');sample.width=sample.height=72;const ctx=sample.getContext('2d',{willReadFrequently:true});ctx.drawImage(target,0,0,72,72);const pixels=ctx.getImageData(0,0,72,72).data,colors=new Set();let opaque=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i+3]>24){opaque++;colors.add((pixels[i]>>4)+','+(pixels[i+1]>>4)+','+(pixels[i+2]>>4));}return {opaque,colors:colors.size};};
 const numeralEvidence=target=>{const trace=observer.inspect(target);return snapshot.nodes.map(node=>{const p=GelatoPrism.hitGeometryV276(target.width,target.height,target===mini,{type:'node',id:node.id});return {id:node.id,number:node.number,x:p.x,y:p.y,draws:trace.labels.filter(label=>label.text===String(node.number)&&Math.abs(label.x-p.x)<2&&Math.abs(label.y-p.y)<2)};});};
 const ctx=canvas.getContext('2d',{willReadFrequently:true});
 // Opposite triangle orientations put one centroid on different spoon ridges
 // of the same authored material. Seven bounded interior patches assess the
 // face, while every barycentric weight >= .25 avoids socket/rail decoration.
 const interiorWeights=[[1/3,1/3,1/3],[.5,.25,.25],[.25,.5,.25],[.25,.25,.5],[.25,.375,.375],[.375,.25,.375],[.375,.375,.25]];
 const samples=snapshot.faces.map(face=>{
  const vertices=face.nodes.map(id=>GelatoPrism.hitGeometryV276(canvas.width,canvas.height,false,{type:'node',id}));
  const patches=interiorWeights.map(weights=>{
   const x=Math.round(vertices.reduce((sum,p,i)=>sum+p.x*weights[i],0)),y=Math.round(vertices.reduce((sum,p,i)=>sum+p.y*weights[i],0));
   const data=ctx.getImageData(x-2,y-2,5,5).data;let luma=0;
   for(let i=0;i<data.length;i+=4)luma+=.2126*data[i]+.7152*data[i+1]+.0722*data[i+2];return {x,y,luma:luma/25};
  });
  return {id:face.id,grade:face.grade,filled:face.filled,luma:patches.reduce((sum,p)=>sum+p.luma,0)/patches.length,centroidLuma:patches[0].luma,patches};
 });
 const backgroundNodes=[slot.panel,slot.panel.querySelector('.gp-scene'),slot.panel.querySelector('.gp-mold')].filter(Boolean);
 return {selected:q.slots[q.active].engine.kind||'cookie',mobile:document.body.classList.contains('mobile-view'),landscape:document.body.classList.contains('mobile-landscape'),touch:navigator.maxTouchPoints,coarse:matchMedia('(pointer:coarse)').matches,
  viewport:{width:innerWidth,height:innerHeight},documentWidth:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth),game:rect(game),field:rect(field),board:rect(canvas),payout:rect(payout),console:rect(document.getElementById('console')),nativeFieldWidth:field.clientWidth,
  sources:observer.inspect(canvas).sources,miniSources:observer.inspect(mini).sources,pixels:pixelSummary(canvas),miniPixels:pixelSummary(mini),numbers:numeralEvidence(canvas),miniNumbers:numeralEvidence(mini),facePixels:samples,snapshot,
  backdropSources:[...new Set(backgroundNodes.flatMap(node=>[null,'::before','::after'].flatMap(pseudo=>observer.styleSources(getComputedStyle(node,pseudo).backgroundImage))))],
  furnitureSources:observer.styleSources(getComputedStyle(payout).backgroundImage),
  collectors:[...payout.querySelectorAll('[data-grade]')].map(row=>({grade:Number(row.dataset.grade),label:row.querySelector('.gp-collected-n').textContent,colorName:row.querySelector('.gp-collector-meta b').textContent,complete:row.classList.contains('gp-complete'),win:row.querySelector('.gp-win-number').textContent,
   pieces:[...row.querySelectorAll('.gp-diamond-piece')].map(piece=>{const background=getComputedStyle(piece).backgroundImage;return {filled:piece.classList.contains('is-filled'),sources:observer.styleSources(background),grade:[0,1,2,3,4].find(grade=>background.includes(GelatoArtV297.collectorURL(grade))),filter:getComputedStyle(piece).filter};})})),
  payouts:[...payout.querySelectorAll('.gp-pay-row')].map(row=>({panels:Number(row.dataset.panels),text:row.querySelector('.gp-pay-win').textContent,expected:q.medalWin(q.app.locked[slot.i],Math.round(e.countPaytable[Number(row.dataset.panels)]*100)).toLocaleString('ja-JP',{maximumFractionDigits:2,useGrouping:false})+'WIN'})),
  fittedAmounts:[...payout.querySelectorAll('.gp-fit-amount')].map(label=>({text:label.textContent,box:rect(label),parent:rect(label.parentElement)})),
  native:{filled:e.filled.size,totalHundredths:e.totalHundredths,counts:e.collectorCounts.slice(),processed:e.processed,pouring:!!e.pouring},art:GelatoArtV297.describe()};
}
function inspectAward({kind,mini,reduced,next}){
 const q=__qa297,slot=q.slots.find(s=>s.engine.kind==='gelato'),diagnostics=SweetsAwardsV277.describe();
 const event=diagnostics.active.find(cue=>cue.game==='gelato'&&cue.gelato?.mode===kind&&cue.win>0&&cue.number===next);
 const canvas=document.querySelector('.award-presentation-'+(mini?'mini':'main')+'[data-game="gelato"]');
 if(!event||event.age<(reduced?20:300)||!canvas||canvas.hidden)return null;
 for(let node=canvas;node instanceof Element;node=node.parentElement){const style=getComputedStyle(node);if(node.hidden||style.display==='none'||style.visibility==='hidden'||Number(style.opacity)===0)return null;}
 const style=getComputedStyle(canvas),bounds=canvas.getBoundingClientRect();if(bounds.width<5||bounds.height<5)return null;
 const traced=__gelatoArt297.inspect(canvas),expected='assets/gelato-art-v297/award-'+kind+'.webp',art=GelatoAwardV297.describe();
 if(!traced.sources.includes(expected)||art.last?.mode!==kind||art.last.win!==event.win)return null;
 const glyphs=traced.draws.filter(draw=>draw.source.endsWith('/digits.webp')).map(draw=>draw.glyph);if(!glyphs.length)return null;
 const sample=document.createElement('canvas');sample.width=sample.height=96;const ctx=sample.getContext('2d',{willReadFrequently:true});ctx.drawImage(canvas,0,0,96,96);const pixels=ctx.getImageData(0,0,96,96).data;let alpha=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]>24)alpha++;if(alpha<60)return null;
 const box=node=>{if(!node)return null;const r=node.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
 const sugarNode=slot.sugarAwardScreen,sugarContent=sugarNode?.querySelector('.sugar-award-content');let sugarVisible=!!sugarContent&&!sugarNode.hidden;
 for(let node=sugarContent;sugarVisible&&node instanceof Element;node=node.parentElement){const s=getComputedStyle(node);if(node.hidden||s.display==='none'||s.visibility==='hidden'||Number(s.opacity)===0)sugarVisible=false;}
 const flash=slot.panel.querySelector('.gp-flash'),flashStyle=flash&&getComputedStyle(flash);
 return {event,diagnostics,art,alpha,...traced,glyphs,pointerEvents:style.pointerEvents,canvas:{width:canvas.width,height:canvas.height},box:box(canvas),nativeEvents:q.nativeEvents.slice(),
  sugar:{active:!!slot.sugarAwardActive,hidden:!!sugarNode?.hidden,visible:sugarVisible,classes:sugarNode?.className||'',label:sugarNode?.getAttribute('aria-label')||'',icon:sugarNode?.querySelector('.sugar-award-icon use')?.getAttribute('href')||'',box:box(sugarContent)},
  flash:{text:flash?.textContent||'',hidden:!flash||flash.hidden||flashStyle.display==='none'||flashStyle.visibility==='hidden'||Number(flashStyle.opacity)===0,box:box(flash)},
  status:slot.panel.querySelector('.award-v277-status')?.textContent,selected:q.slots[q.active].engine.kind||'cookie',
  activeSources:__gelatoArt297.inspect(q.slots[q.active].panel.querySelector('canvas')).sources,overlay:canvas.toDataURL('image/png')};
}
function near(actual,expected,label,tolerance=.8){assert(Math.abs(actual-expected)<=tolerance,label+': '+actual+' vs '+expected);}
function contained(inner,outer,label,tolerance=1.5){assert(inner.left>=outer.left-tolerance&&inner.right<=outer.right+tolerance&&inner.top>=outer.top-tolerance&&inner.bottom<=outer.bottom+tolerance,label+': '+JSON.stringify({inner,outer}));}
function assertBoard(board,scenario,fixture,{after=false}={}){
 assert.equal(board.selected,'gelato');assert.equal(board.mobile,scenario.mobile);assert(!board.landscape);assert.equal(board.nativeFieldWidth,430);
 assert.deepEqual([board.snapshot.nodes.length,board.snapshot.faces.length],[19,24]);assert.equal(board.snapshot.artVersion,297);
 assert.deepEqual(board.snapshot.nodes.map(node=>node.number),fixture.state.nodeNumbers);
 assert.deepEqual(board.snapshot.faces.map(face=>face.grade),fixture.state.faceGrades);
 assert(board.pixels.opaque>1000&&board.pixels.colors>24,'detailed actual board pixels are painted');
 for(const name of ['materials','furniture']){
  assert(board.sources.includes('assets/gelato-art-v297/'+name+'.webp'),'actual main canvas transfers '+name);
  assert(board.miniSources.includes('assets/gelato-art-v297/'+name+'.webp'),'actual mini canvas transfers '+name);
 }
 assert(board.furnitureSources.includes('assets/gelato-art-v297/paytable.webp'),'generated payout furniture is actually applied');
 assert(board.backdropSources.includes('assets/gelato-ice-candy-kingdom-v41.webp'),'the original v249 ice-candy kingdom background remains visible: '+board.backdropSources.join(', '));
 assert(!board.sources.some(source=>/^assets\/(cookie-art-v293|choco-art-v295)\//.test(source)));
 for(const [name,numbers]of [['main',board.numbers],['mini',board.miniNumbers]]){
  assert.equal(numbers.length,19);assert(numbers.every(node=>node.draws.some(draw=>draw.fontPx>(name==='main'?20:3)&&draw.alpha>.5)),name+' actually paints every current native number at its correct socket');
 }
 const state=after?fixture.proof.stateAfter:fixture.state;
 assert.deepEqual(board.native.counts,state.counts);assert.equal(board.native.filled,state.filled.length);assert.equal(board.native.totalHundredths,state.totalHundredths);
 for(const row of board.collectors){
  const count=state.counts[row.grade],mult=[0,1,3,5,10][row.grade];
  assert.equal(row.label,count+'/4');assert.equal(row.complete,count===4);assert.equal(row.pieces.filter(piece=>piece.filled).length,count);
  assert.equal(row.win,(scenario.bet*mult).toLocaleString('ja-JP',{maximumFractionDigits:2,useGrouping:false}));
  assert.equal(row.colorName,['水色','緑','黄色','赤','紫'][row.grade]);
  for(const piece of row.pieces){assert(piece.sources.includes('assets/gelato-art-v297/materials.webp'));if(piece.filled)assert.equal(piece.grade,row.grade,'collected diamond depicts the actual native grade');}
 }
 for(const row of board.payouts)assert.equal(row.text,row.expected,'visible count payout matches native table at '+row.panels);
 for(const amount of board.fittedAmounts)assert(amount.box.width<=amount.parent.width+1.5,'native amount fits its payout bay: '+amount.text);
 assert(board.documentWidth<=board.viewport.width+2);contained(board.board,board.game,'board stays in main cabinet');contained(board.payout,board.game,'payout stays in main cabinet');
 assert(board.game.bottom<=board.console.top+1.5,'main cabinet clears BET/WIN/CREDIT');
 if(scenario.mobile){assert(board.touch>0&&board.coarse);near(board.game.left,scenario.width/480,'v294 left cabinet edge');near(board.game.right,scenario.width-scenario.width/480,'v294 right cabinet edge');assert(board.field.left<=6.5&&scenario.width-board.field.right<=6.5);}
 if(state.filled.length>0&&state.filled.length<24){
  const contrasts=[];
  for(let grade=0;grade<5;grade++){
   const acquired=board.facePixels.filter(face=>face.grade===grade&&face.filled),empty=board.facePixels.filter(face=>face.grade===grade&&!face.filled);
   if(acquired.length&&empty.length)contrasts.push(acquired.reduce((n,f)=>n+f.luma,0)/acquired.length-empty.reduce((n,f)=>n+f.luma,0)/empty.length);
  }
  assert(contrasts.length&&contrasts.every(value=>value>15),'acquired gelato is visibly brighter than unacquired same-color ice: '+contrasts.join(','));
 }
 assert(board.art.cachedFaceSets<=2&&board.art.cachedFaces<=48,'native masks are bounded cached artwork');assert.deepEqual(board.art.failures,[]);
}

const startedRun=Date.now();
try{
 browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{}),args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 for(const scenario of scenarios){
  current=scenario.id;const started=Date.now();let boardEvidence=null;
  try{
   assert(Date.now()-startedRun<10*60*1000,'browser shard stays within a ten-minute budget');
   await open(scenario);const fixture=witnesses[scenario.witness||scenario.kind],restored=await restoreCheckpoint(fixture),board=await page.evaluate(inspectBoard);boardEvidence=board;
   assertBoard(board,scenario,fixture);await page.screenshot({path:path.join(output,scenario.id+'-board.png')});
   if(scenario.mini){await page.evaluate(()=>{const q=__qa297;q.select(q.slots.findIndex(slot=>slot.engine.kind==='choco'));q.scheduleUI(q.app);});await page.waitForFunction(()=>__qa297.slots[__qa297.active].engine.kind==='choco');}
   await page.waitForFunction(number=>{const button=document.querySelector('#manual-number-grid button[data-number="'+number+'"]');return button&&!button.disabled;},fixture.next,{timeout:30000});
   const manualButton=page.locator('#manual-number-grid button[data-number="'+fixture.next+'"]'),manualBox=await manualButton.boundingBox();
   assert(manualBox?.height>12,'native manual draw rows retain usable height');
   const pending=page.waitForFunction(inspectAward,{kind:scenario.kind,mini:!!scenario.mini,reduced:!!scenario.reduced,next:fixture.next},{polling:'raf',timeout:60000}).then(handle=>({handle}),error=>({error}));
   await manualButton.click();const outcome=await pending;if(outcome.error)throw outcome.error;
   const handle=outcome.handle,evidence=await handle.jsonValue();await handle.dispose();
   assert.equal(evidence.pointerEvents,'none');assert.equal(evidence.diagnostics.errors,0);assert.equal(evidence.selected,scenario.mini?'choco':'gelato');
   const event=evidence.event,native=evidence.nativeEvents.find(item=>item.phase==='gelatoFill'&&item.number===fixture.next&&item.gain===event.gain&&item.expectedWin===event.win);
   assert(native,'the visible popup follows an actual native gelatoFill');assert.equal(native.gain,fixture.proof.gain);assert.equal(native.totalHundredths,fixture.proof.totalHundredths);
   assert.equal(event.win,native.expectedWin);assert.equal(evidence.art.last.win,native.expectedWin);assert.equal(event.total,false);assert.equal(evidence.art.last.total,false);
   assert.equal(event.gelato.mode,scenario.kind);assert.equal(event.gelato.filledCount,fixture.proof.filledCount);
   assert.deepEqual(event.gelato.counts,fixture.proof.counts);assert.deepEqual(event.gelato.newlyCompleted,fixture.proof.newlyCompleted);assert.deepEqual(event.gelato.newFaces,fixture.proof.newFaces);
   assert.deepEqual(evidence.art.last.counts,fixture.proof.counts);assert.deepEqual(evidence.art.last.newlyCompleted,fixture.proof.newlyCompleted);
   assert.equal(evidence.art.last.source,'assets/gelato-art-v297/award-'+scenario.kind+'.webp');assert(evidence.art.last.rasterNumbers);
   assert.equal(evidence.glyphs.join(''),native.expectedWin.toLocaleString('ja-JP')+'WIN','actual raster glyphs spell the exact native incremental amount');assert(evidence.sources.includes('assets/gelato-art-v297/digits.webp'));
   assert(!evidence.sources.some(source=>/^assets\/(cookie-art-v293|choco-art-v295)\//.test(source)||source==='assets/award-art-v291/themed-cutin-atlas.webp'));
   const imageDraw=evidence.draws.find(draw=>draw.source===evidence.art.last.source&&draw.bounds);assert(imageDraw);contained(imageDraw.bounds,{left:0,top:0,right:evidence.canvas.width,bottom:evidence.canvas.height},'entire illustrated award is within its canvas',2);
   const earnsSugar=!fixture.state.sugarAwarded&&fixture.proof.stateAfter.sugarAwarded;
   if(earnsSugar)assert(evidence.nativeEvents.some(item=>item.phase==='sugaraward'),'the collector witness produces its real native Sugar acquisition');
   if(!scenario.mini){
    assert(evidence.flash.hidden,'duplicate native center flash stays behind the loaded illustrated cue');const sugar=evidence.sugar;
    if(earnsSugar)assert(sugar.active&&!sugar.hidden&&sugar.visible&&sugar.classes.includes('compact'),'earned native Sugar has a visible compact receipt beside the illustrated collector award');
    if(sugar.active){assert(!sugar.hidden&&sugar.classes.includes('compact'));assert(sugar.label.includes('シュガーGET')&&sugar.icon);}
    if(sugar.visible){
     const sx=evidence.box.width/evidence.canvas.width,sy=evidence.box.height/evidence.canvas.height,plaque={left:evidence.box.left+imageDraw.bounds.left*sx,right:evidence.box.left+imageDraw.bounds.right*sx,top:evidence.box.top+imageDraw.bounds.top*sy,bottom:evidence.box.top+imageDraw.bounds.bottom*sy};
     assert(sugar.box&&sugar.box.width>0&&sugar.box.height>0);assert(sugar.box.right<=plaque.left+1||sugar.box.left>=plaque.right-1||sugar.box.bottom<=plaque.top+1||sugar.box.top>=plaque.bottom-1,'native Sugar badge does not cover the Gelato artwork: '+JSON.stringify({sugar:sugar.box,plaque}));
    }
    assert(evidence.art.mainPaints>0);contained(evidence.box,board.game,'award overlay stays within main cabinet');
   }else{assert(evidence.art.miniPaints>0);assert(!evidence.activeSources.some(source=>source.startsWith('assets/gelato-art-v297/')),'Gelato art does not enter the selected Canyon board');}
   assert(evidence.status?.includes(native.expectedWin.toLocaleString('ja-JP')),'accessible award retains the exact native WIN');
   if(scenario.reduced){assert(evidence.diagnostics.reducedMotion);assert.equal(evidence.diagnostics.maxMainParticles,0);assert.equal(evidence.diagnostics.maxMiniParticles,0);}
   await fs.writeFile(path.join(output,scenario.id+'-overlay.png'),Buffer.from(evidence.overlay.split(',')[1],'base64'));delete evidence.overlay;await page.screenshot({path:path.join(output,scenario.id+'-award.png')});
   if(scenario.mini)await page.evaluate(()=>{const q=__qa297;q.select(q.slots.findIndex(slot=>slot.engine.kind==='gelato'));q.scheduleUI(q.app);});
   await page.waitForFunction(expected=>{const e=GelatoPrism.engine,current=document.querySelector('.gp-collector-panel .gp-current');return e.idle&&!e.pouring&&e.processed===expected&&Number(current?.dataset.panels)===e.filled.size;},fixture.draws.length+1,{timeout:15000});
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   const after=await page.evaluate(inspectBoard);boardEvidence=after;assertBoard(after,scenario,fixture,{after:true});assert(after.art.faceBuilds<=board.art.faceBuilds+1,'live draws reuse cached native masks');
   await page.screenshot({path:path.join(output,scenario.id+'-settled.png')});
   report.cases.push({id:scenario.id,status:'passed',durationMs:Date.now()-started,scenario,restored,board,evidence,after});console.log('GELATO_V297_BROWSER_CASE_PASS',scenario.id);
  }catch(error){
   const failure={id:scenario.id,message:String(error),stack:error.stack,board:boardEvidence};
   if(page)try{failure.state=await page.evaluate(()=>({art:window.GelatoArtV297?.describe(),award:window.GelatoAwardV297?.describe(),awards:window.SweetsAwardsV277?.describe(),nativeEvents:window.__qa297?.nativeEvents,presentation:window.GelatoPrism?.presentationV297}));await page.screenshot({path:path.join(output,scenario.id+'-failure.png')});}catch{}
   report.failures.push(failure);console.error('GELATO_V297_BROWSER_CASE_FAIL',scenario.id,String(error));await closeContext();
  }finally{await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');}
 }
 assert.deepEqual(report.pageErrors,[]);assert.deepEqual(report.assetFailures,[]);assert.deepEqual(report.apiRequests,[]);assert.deepEqual(report.externalRequests,[]);
 assert.equal(report.failures.length,0,'failed Gelato cases: '+report.failures.map(f=>f.id).join(', '));assert.equal(report.cases.length,scenarios.length);
 report.ok=true;console.log('GELATO_V297_BROWSER_PASS',JSON.stringify({version,kindFilter,cases:report.cases.length,nativePayouts:true,exactCollectorColors:true,nativeNumbers:19}));
}catch(error){report.ok=false;report.failure={id:current,message:String(error),stack:error.stack};throw error;}
finally{await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');await closeContext();await browser?.close().catch(()=>{});await new Promise(resolve=>server.close(resolve));}

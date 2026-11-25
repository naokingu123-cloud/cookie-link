/* Real local app, native legal inputs and native award receipt. No production
 * state machine, hit geometry, clocks or payout rules are replaced. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {chromium} from 'playwright';

const root=process.cwd(),output=process.env.CASTELLA_V303_OUTPUT||'qa-castella-v303';
await fs.mkdir(output,{recursive:true});
const read=file=>fs.readFile(path.join(root,file),'utf8');
const rulesSource=await read('assets/party-castella-rules.js'),hostSource=await read('assets/party-castella-host.js');
const c=vm.createContext({Math,console});vm.runInContext(rulesSource,c);const R=c.PartyCastellaRules;
const plain=value=>JSON.parse(JSON.stringify(value)),hash=value=>createHash('sha256').update(value).digest('hex');
const {state:opening,draws}=R.createDemo();let state=opening;
const steps=draws.map(number=>{const before=state;state=R.draw(state,number);return {number,before:plain(before),after:plain(state)};});
assert.equal(state.highestRole,true);assert.equal(state.bakedCount,61);assert.equal(state.totalHundredths,20000);
const ordinaryDraws=[...draws.slice(0,7),1];let ordinary=opening;for(const n of ordinaryDraws)ordinary=R.draw(ordinary,n);
assert(!ordinary.highestRole&&ordinary.totalHundredths>0);
const report={version:303,rulesSha256:hash(rulesSource),hostSha256:hash(hostSource),draws:plain(draws),scenarios:[],assets:[],pageErrors:[],externalRequests:[],apiRequests:[]};
assert.equal(report.rulesSha256,'0310aabd36770ee968013fdf5f498b48f51c8851dff249ed5402ade0ec452e06','native rules are byte-identical to the accepted v301 baseline');
assert.equal(report.hostSha256,'493db342d2846ac3c183069b6dae3a95c9cc6dd0c22a03b64b60d36b8365c7cc','native host and clocks are byte-identical to baseline');
await fs.writeFile(path.join(output,'reachable-fixtures.json'),JSON.stringify({rulesSha256:report.rulesSha256,hostSha256:report.hostSha256,constructor:'native PartyCastellaRules.createDemo: festival mold 12, orientation 0, seeded legal native draw witness',opening:plain(opening),full:{draws:plain(draws),steps},ordinary:{draws:ordinaryDraws,before:steps[7].before,after:plain(ordinary)}},null,2)+'\n');
if(process.argv.includes('--fixtures-only')){console.log('CASTELLA_V303_FIXTURES_PASS',JSON.stringify({fullCount:state.bakedCount,fullWin:600000,ordinaryCount:ordinary.bakedCount,ordinaryWin:Math.floor(3000*ordinary.totalHundredths/100),draws:plain(draws)}));process.exit(0);}

const version=JSON.parse(await read('app-version.json')).version;
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.mp3':'audio/mpeg','.wav':'audio/wav'};
const bridge='\n;window.__qa303={app,slots,select,syncManualNumbers,scheduleUI,medalWin,get active(){return active;}};\n';
const server=http.createServer(async(req,res)=>{
 const u=new URL(req.url,'http://127.0.0.1');if(u.pathname.startsWith('/api/')||u.pathname.startsWith('/ws')){report.apiRequests.push(u.pathname);res.writeHead(451).end();return;}
 const file=path.resolve(root,'.'+decodeURI(u.pathname==='/'?'/index.html':u.pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 try{let body=await fs.readFile(file);if(file.endsWith('/assets/award-presentation-v277.js'))body=Buffer.concat([body,Buffer.from(bridge)]);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(body);}catch{res.writeHead(404).end();}
});
server.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;

function artObserver(){
 const sources=new WeakMap(),calls=new WeakMap(),draw=CanvasRenderingContext2D.prototype.drawImage;
 CanvasRenderingContext2D.prototype.drawImage=function(image,...args){
  const result=Reflect.apply(draw,this,[image,...args]);let inherited=sources.get(image)||new Set();
  if(image?.src?.includes('/assets/castella-art-v303/'))inherited=new Set([image.src.split('/assets/')[1].split('?')[0]]);
  const dest=sources.get(this.canvas)||new Set();for(const name of inherited)dest.add(name);sources.set(this.canvas,dest);calls.set(this.canvas,(calls.get(this.canvas)||0)+1);return result;
 };
 window.__castella303Art={sources:cv=>[...(sources.get(cv)||[])],calls:cv=>calls.get(cv)||0};
}
function inspect(){
 const q=__qa303,e=PartyCastella.engine,index=q.slots.findIndex(s=>s.engine===e),slot=q.slots[index],s=e.state,root=slot.panel.querySelector('.pct-scene'),cv=root.querySelector('.pct-pan>canvas');
 const box=node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
 const textBox=node=>{const r=document.createRange();r.selectNodeContents(node);return box({getBoundingClientRect:()=>r.getBoundingClientRect()});};
 const geometry=PartyCastellaView.geometry(s),bounds=box(cv),unit=Math.min(bounds.width/geometry.panW,bounds.height/geometry.panH);
 return {state:JSON.parse(JSON.stringify(s)),processed:e.processed,accepted:e.accepted,locked:q.app.locked[index],paid:q.app.paid[index],roundWin:q.app.roundWins[index],
  root:box(root),canvas:bounds,documentWidth:document.documentElement.scrollWidth,viewport:innerWidth,
  art:CastellaArtV303.describe(),award:CastellaAwardV303.describe(),awards:SweetsAwardsV277.describe(),
  sources:__castella303Art.sources(cv),miniSources:__castella303Art.sources(slot.miniCanvas),mainCalls:__castella303Art.calls(cv),
  centers:s.cells.map(c=>({x:bounds.width/2+c.x*unit,y:bounds.height/2+c.y*unit,r:unit*.405})),
  payout:[...root.querySelectorAll('tbody tr')].map(row=>({count:Number(row.dataset.count),amount:row.querySelector('.pct-win-value').textContent,cell:box(row.cells[1]),text:textBox(row.querySelector('.pct-win-value')),unit:textBox(row.cells[1].querySelector('small'))})),
  gauges:[...root.querySelectorAll('.pct-gauge')].map(g=>({value:Number(g.getAttribute('aria-valuenow')),filled:g.querySelectorAll('.filled').length,box:box(g)})),
  status:[...root.querySelectorAll('.pct-status small,.pct-status span')].map(node=>({text:node.textContent,box:box(node),textBox:textBox(node)})),
  furniture:Object.fromEntries(Object.entries({payout:'.pct-pay',pour:'.pct-status-pour',fire:'.pct-status-fire',phase:'.pct-phase-first'}).map(([name,selector])=>{const css=getComputedStyle(root.querySelector(selector)),source=css.backgroundImage;return [name,{generated:source.startsWith('url("data:image/png;base64,'),backgroundColor:css.backgroundColor}];})),phase:root.dataset.stage,holes:root.dataset.holes,artVersion:root.dataset.artVersion};
}
let browser,context,page;
async function screenshot(name){const file=path.join(output,name+'.png');await page.screenshot({path:file});return file;}
async function open({width=390,height=844,reduced=false}={}){
 await context?.close();context=await browser.newContext({viewport:{width,height},hasTouch:width<500,serviceWorkers:'block',reducedMotion:reduced?'reduce':'no-preference'});
 await context.addInitScript(artObserver);
 await context.route('**/*',route=>{const u=new URL(route.request().url());if(/^https?:$/.test(u.protocol)&&u.origin!==base){report.externalRequests.push(u.href);return route.abort();}return route.continue();});
 page=await context.newPage();page.on('pageerror',e=>report.pageErrors.push(String(e.stack||e)));
 page.on('response',r=>{if(r.status()>=400&&new URL(r.url()).pathname.startsWith('/assets/'))report.assets.push({url:r.url(),status:r.status()});});
 await page.goto(base+'/?edition=local&set=all&appv='+encodeURIComponent(version),{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__qa303&&window.SweetsLocalDebugV258?.ready&&window.PartyCastella&&window.CastellaArtV303&&window.CastellaAwardV303,null,{timeout:90000});
 assert.deepEqual(await page.evaluate(()=>Promise.all([CastellaArtV303.ready,CastellaAwardV303.ready,document.fonts.ready.then(()=>true)])),[true,true,true]);
 await page.locator('#manual-number-toggle').click();
 await page.waitForFunction(()=>SweetsLocalDebugV258.describe().manualNumbers&&__qa303.app.phase==='ready');
 await page.evaluate(()=>{const q=__qa303;q.index=q.slots.findIndex(s=>s.engine.kind==='castella');if(!SweetsLocalDebugV258.setBets(q.app.bets.map((_,i)=>i===q.index?3000:0)))throw Error('Native BET failed');q.select(q.index);q.scheduleUI(q.app);});
 await page.locator('#manual-start').click();await page.waitForFunction(()=>__qa303.app.phase==='playing'&&PartyCastella.engine.running,null,{timeout:45000});
}
async function restore(before){
 const res=await page.evaluate(before=>{
  const q=__qa303,e=PartyCastella.engine,slot=q.slots[q.index],phase=q.app.phase;const received=SweetsAwardsV277.describe().received;
  q.app.phase='ready';e.version++;e.state=structuredClone(before);e.processed=e.accepted=before.draws.length;e.drawn=new Set(before.draws);e.queue=[];e.running=true;e.busy=false;e.paused=false;e.presentationRate=1;
  e.wonderCollected=!!before.sugarEarned;e.roundSteps=Number(e.wonderCollected);q.app.draws=before.draws.slice();q.app.paid[q.index]=false;q.app.roundWins[q.index]=0;q.app.totalWin=0;
  e.afterCheckpointRestoreV247?.();e.emit('ready');e.emit('waiting');q.app.phase=phase;q.syncManualNumbers();q.select(q.index);q.scheduleUI(q.app);slot.paintCastella(false);slot.paintCastella(true);
  return {receivedBefore:received,receivedAfter:SweetsAwardsV277.describe().received,state:JSON.parse(JSON.stringify(e.state))};
 },before);
 assert.equal(res.receivedAfter,res.receivedBefore,'restored checkpoint never invents an award');assert.deepEqual(res.state,before);
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
}
async function send(number,count){
 await page.waitForFunction(n=>{const b=document.querySelector('#manual-number-grid button[data-number="'+n+'"]');return b&&!b.disabled;},number,{timeout:45000});
 await page.locator('#manual-number-grid button[data-number="'+number+'"]').click();
 await page.waitForFunction(count=>PartyCastella.engine.processed===count,count,{timeout:45000});
}
function verifyBoard(data){
 assert.equal(data.artVersion,'303');assert.equal(data.holes,'61');assert.deepEqual(data.art.errors,[]);assert.deepEqual(data.award.errors,[]);assert.equal(data.award.digitsReady,true);
 assert(data.sources.some(p=>p.endsWith('castella-materials.webp')));assert(data.sources.some(p=>p.endsWith('copper-griddle.webp')));
 assert(data.documentWidth<=data.viewport+1,'no horizontal page overflow');
 for(const [kind,style] of Object.entries(data.furniture))assert(style.generated,'dedicated '+kind+' furniture must survive older cabinet CSS');
 for(const c of data.centers)assert(c.x-c.r>=-.2&&c.x+c.r<=data.canvas.width+.2&&c.y-c.r>=-.2&&c.y+c.r<=data.canvas.height+.2,'native well stays inside canvas');
 for(const row of data.payout){
  assert.equal(Number(row.amount.replaceAll(',','')),Math.floor(3000*R.payout(row.count)/100),'native payout is unchanged');
  assert(row.text.x>=row.cell.x-1&&row.text.right<=row.unit.x+1,'fitted payout numeral stays inside its actual live number bay');
  assert(row.text.y>=row.cell.y-1&&row.text.bottom<=row.cell.bottom+1,'payout numeral is vertically inside row');
 }
 for(const g of data.gauges)assert.equal(g.value,g.filled);
}
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
 await open();await restore(plain(opening));
 for(const width of [320,390,430]){
  await page.setViewportSize({width,height:844});await page.waitForTimeout(160);
  const data=await page.evaluate(inspect);verifyBoard(data);const file=await screenshot('initial-'+width);report.scenarios.push({kind:'initial',width,file,data});
 }
 await page.setViewportSize({width:390,height:844});
 for(let i=0;i<7;i++){
  await send(draws[i],i+1);assert.deepEqual((await page.evaluate(inspect)).state,steps[i].after,'native legal draw agrees with independent replay');
  if(i===0){await page.waitForTimeout(250);report.scenarios.push({kind:'pour-animation',file:await screenshot('pour-instrument')});}
  await page.waitForTimeout(1550);
  if(i===4||i===6){const data=await page.evaluate(inspect);verifyBoard(data);report.scenarios.push({kind:i===4?'raw':'baked',file:await screenshot(i===4?'raw-61':'baked-50'),data});}
 }
 const receivedBefore=await page.evaluate(()=>SweetsAwardsV277.describe().received);
 await send(draws[7],8);
 await page.waitForFunction(()=>CastellaAwardV303.describe().last?.role==='all',null,{polling:'raf',timeout:20000});
 const full=await page.evaluate(inspect);assert.equal(full.awards.received,receivedBefore+1);assert.equal(full.award.last.win,600000);assert.equal(full.award.last.bakedCount,61);assert.equal(full.award.last.rasterNumbers,true);assert.deepEqual(full.state,steps[7].after);
 report.scenarios.push({kind:'native-all-baked',file:await screenshot('native-all-baked'),data:full});
 await page.evaluate(()=>{const q=__qa303;q.select(q.slots.findIndex(s=>s.engine.kind==='cookie'));});
 await page.waitForFunction(()=>CastellaAwardV303.describe().mini>0,null,{polling:'raf',timeout:10000});
 report.scenarios.push({kind:'native-mini-award',file:await screenshot('native-mini-award'),data:await page.evaluate(inspect)});
 await page.waitForFunction(()=>__qa303.app.paid[__qa303.index]===true,null,{timeout:15000});
 assert.equal(await page.evaluate(()=>__qa303.app.roundWins[__qa303.index]),600000,'real final receipt matches award');
 await open({width:430,reduced:true});await restore(steps[7].before);await send(1,8);
 await page.waitForFunction(()=>CastellaAwardV303.describe().last?.role==='bake',null,{polling:'raf',timeout:20000});
 const regular=await page.evaluate(inspect);assert.equal(regular.award.last.win,Math.floor(3000*ordinary.totalHundredths/100));assert.equal(regular.award.last.bakedCount,ordinary.bakedCount);assert.deepEqual(regular.state,plain(ordinary));
 report.scenarios.push({kind:'ordinary-reduced',file:await screenshot('ordinary-reduced'),data:regular});
 report.legacy=await page.evaluate(()=>{const s=PartyCastellaRules.legacy.create({rng:()=>.38,target:90}),cv=document.createElement('canvas');cv.width=490;cv.height=390;PartyCastellaView.drawMini(cv.getContext('2d'),s,{age:Infinity,time:0,reach:[]});return {holes:s.cells.length,geometry:PartyCastellaView.geometry(s),sources:__castella303Art.sources(cv)};});
 assert.equal(report.legacy.holes,37);assert.equal(report.legacy.geometry.radius,3);assert(report.legacy.sources.some(s=>s.endsWith('castella-materials.webp')));
 assert.equal(report.pageErrors.length,0,report.pageErrors.join('\n'));assert.equal(report.assets.length,0);assert.equal(report.apiRequests.length,0,'local test does not contact a public or local game API');
 report.ok=true;await fs.writeFile(path.join(output,'result.json'),JSON.stringify(report,null,2)+'\n');console.log('CASTELLA_V303_BROWSER_PASS',JSON.stringify({scenarios:report.scenarios.length,legacy:report.legacy.holes,nativeWin:600000}));
}catch(error){
 report.failure={message:String(error),stack:error.stack};if(page)try{report.failure.state=await page.evaluate(inspect);report.failure.screenshot=await screenshot('failure');}catch{}
 await fs.writeFile(path.join(output,'failure.json'),JSON.stringify(report,null,2)+'\n');throw error;
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}

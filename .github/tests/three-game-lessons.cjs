// CHROME_PATH=/path/to/chromium node .github/tests/three-game-lessons.cjs
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),root=path.resolve(__dirname,'../..'),local='http://sweets-demo.local/';
const origin=process.env.LESSON_ORIGIN||local,version=JSON.parse(fs.readFileSync(path.join(root,'app-version.json'),'utf8')).version;
async function check(browser,width){
 const page=await browser.newPage({viewport:{width,height:844},ignoreHTTPSErrors:true,locale:'ja-JP'}),errors=[];
 try{
  page.on('pageerror',e=>errors.push(e.message));
  if(origin===local)await page.route(local+'**',route=>{
   const url=new URL(route.request().url()),file=path.join(root,url.pathname==='/'?'index.html':decodeURIComponent(url.pathname));
   return fs.existsSync(file)?route.fulfill({path:file}):route.fulfill({status:404,body:''});
  });
  await page.goto(origin+'?games=jelly,stick,castella&appv='+version,{waitUntil:'domcontentloaded',timeout:90000});
  await page.waitForFunction(()=>window.SweetsDemoSuite?.version>=139);
  await page.locator('#manual-number-toggle').evaluate(b=>{if(!document.body.classList.contains('manual-number-mode'))b.click();});
  await page.locator('#sound').evaluate(b=>{b.checked=false;});
  const stateSnapshot=()=>page.evaluate(()=>JSON.stringify([JellyBingo.engine.state,BingoStick.engine.state,PartyCastella.engine.state]));
  const opening=await stateSnapshot();
  const kinds=['jelly','stick','castella'],story=page.locator('.ds139-story'),visits={};
  for(const kind of kinds){
   await page.evaluate(kind=>document.querySelector('#tab'+SweetsLineup.ids.indexOf(kind)).click(),kind);
   await page.waitForFunction(k=>!document.querySelector('.ds139-story').hidden&&document.querySelector('.ds139-story').dataset.game===k,kind);
   const buttons=story.locator('nav button');assert.equal(await buttons.count(),4);visits[kind]=[];
   for(let i=0;i<4;i++){
    await buttons.nth(i).evaluate(b=>b.click());
    const info=await story.evaluate(el=>{
     const box=el.getBoundingClientRect(),h=el.querySelector('h2'),p=el.querySelector('p'),c=el.querySelector('canvas');
     const rect=a=>a.getBoundingClientRect();
     return {number:+el.dataset.scene,headline:h.textContent,caption:p.textContent,position:SweetsDemoSuite.status.scene,
      visible:el.scrollWidth<=el.clientWidth+2&&el.scrollHeight<=el.clientHeight+2&&rect(p).bottom<=box.bottom&&rect(c).top>=rect(h).bottom-1&&rect(c).bottom<=rect(p).top+1,
      width:rect(c).width,height:rect(c).height};
    });
    assert.equal(info.number,i+1);assert.equal(info.position,i+1);assert(info.visible&&info.width>200&&info.height>75&&info.caption&&info.headline,JSON.stringify({width,kind,...info}));
    const moves=await page.evaluate(({kind,i})=>{
     const layer=document.createElement('canvas');layer.width=520;layer.height=240;const c=layer.getContext('2d');
     const scene=SweetsAttractLessons[kind];
     const frame=t=>{c.clearRect(0,0,520,240);c.save();scene.draw(c,i,t);c.restore();return layer.toDataURL();};
     return frame(.12)!==frame(.79);
    },{kind,i});
    assert(moves,kind+' scene '+i+' needs two visually distinct moments');visits[kind].push(info.headline);
   }
   assert.equal(new Set(visits[kind]).size,4);
  }
  await story.locator('nav button').first().evaluate(b=>b.click());
  await page.waitForFunction(()=>SweetsDemoSuite.status.scene===2,null,{timeout:11000});
  assert.equal(await stateSnapshot(),opening,'Playing the lesson changed a real game state');
  await page.locator('#manual-start').evaluate(b=>b.click());
  await page.waitForFunction(()=>!SweetsDemoSuite.status.ready&&document.querySelector('.ds139-story').hidden);
  await page.locator('#manual-number-grid [data-number="7"]').evaluate(b=>b.click());
  await page.waitForFunction(()=>JellyBingo.engine.state.draws.length===1&&BingoStick.engine.processed===1&&PartyCastella.engine.processed===1);
  assert.deepEqual(errors,[]);console.log(JSON.stringify({width,origin,scenes:visits,firstRealDraw:7}));
 }finally{await page.close();}
}
(async()=>{
 const proxy=origin!==local&&process.env.HTTPS_PROXY?new URL(process.env.HTTPS_PROXY):null;
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,args:['--disable-webgl','--disable-dev-shm-usage'],...(proxy?{proxy:{server:proxy.origin,...(proxy.username?{username:decodeURIComponent(proxy.username),password:decodeURIComponent(proxy.password)}:{})}}:{})});
 try{for(const w of (process.env.LESSON_WIDTH?[Number(process.env.LESSON_WIDTH)]:[320,390]))await check(browser,w);}
 finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

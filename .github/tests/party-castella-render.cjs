// CHROME_PATH=/path/to/chrome node .github/tests/party-castella-render.cjs [--profile]
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.join(__dirname,'../..'),origin='http://castella.test';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,args:['--disable-webgl','--disable-dev-shm-usage']});
 try{
  const p=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.route(origin+'/**',r=>{
   const url=new URL(r.request().url()),file=path.join(root,url.pathname==='/'?'index.html':decodeURIComponent(url.pathname));
   if(!fs.existsSync(file))return r.fulfill({status:404,body:''});
   if(file.endsWith('/party-castella-host.js')){
    const src=fs.readFileSync(file,'utf8').replace('window.PartyCastella={',
     'window.castellaTest={view,lesson,slot,projectReaches,prepare(){app.setBet(id,1);engine.state=R.createDemo().state;}};window.PartyCastella={');
    return r.fulfill({contentType:'application/javascript',body:src});
   }
   return r.fulfill({path:file});
  });
  await p.goto(origin+'/?games=castella',{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>window.castellaTest&&document.querySelector('.pct-pan canvas').width>100);
  if(process.argv.includes('--profile')){
   await p.evaluate(()=>document.fonts.ready);
   await p.waitForFunction(()=>['honey-griddle','tiles','dispenser'].every(k=>performance.getEntriesByType('resource').some(r=>r.name.includes('party-castella-'+k)&&r.responseEnd)));
   console.log(await p.evaluate(()=>{
    const {view,lesson,projectReaches}=castellaTest,ctx=document.querySelector('.pct-pan canvas').getContext('2d');
    const result={canvas:[ctx.canvas.width,ctx.canvas.height]};
    for(const [scene,n] of [['pour',3],['bake',7],['reach',7]]){
     const {state,reach}=lesson[n],samples=[];
     for(let i=0;i<52;i++){
      const t=performance.now();view.draw(state,{age:scene==='reach'?3000:(i%31)*46,time:i*95,bet:100,reach});
      ctx.getImageData(0,0,1,1);if(i>=4)samples.push(performance.now()-t);
     }
     const t=performance.now();for(let i=0;i<500;i++)projectReaches(state,100);
     result[scene]={reach:reach.length,medianMs:samples.sort((a,b)=>a-b)[24],projectionMs:(performance.now()-t)/500};
    }
    return result;
   }));
  }
  const draws=await p.evaluate(()=>{
   document.querySelector('#sound').checked=false;
   if(!document.body.classList.contains('manual-number-mode'))document.querySelector('#manual-number-toggle').click();
   castellaTest.prepare();const R=PartyCastellaRules,d=R.createDemo(),pour=d.draws.slice(0,5);
   const oven=pour.reduce(R.draw,d.state);
   document.querySelector('#manual-start').click();
   return [...pour,...oven.zones.slice(0,3).map(z=>z.numbers[0])];
  });
  let oddsAtZero=false,moreAfterEight=false;
  for(let i=0;i<=8;i++){
   await p.waitForFunction(n=>castellaTest.slot.reachAfterBall===n&&PartyCastella.engine.processed===n&&castellaTest.slot.reachStatus==='ready',i);
   const v=await p.evaluate(()=>{
    const e=PartyCastella.engine,s=e.state,slot=castellaTest.slot;
    return {hits:slot.reachResults,tab:slot.tabReachResults,expected:PartyCastellaRules.reaches(s),win:s.totalHundredths};
   });
   assert.deepEqual(v.hits,v.tab);assert.equal(v.hits.length,v.expected.length);
   for(const [j,h] of v.hits.entries()){
    const k=v.expected[j];assert.equal(h.number,k.number);assert.equal(h.total,k.total);assert.equal(h.oddsUp,k.oddsUp);
    assert.equal(h.tier,k.allClear?3:k.total>=1000?2:k.total>=300?1:0);
    oddsAtZero ||= h.oddsUp&&h.total===0&&h.gain===0;
    moreAfterEight ||= i===8&&h.total>v.win;
   }
   if(i<8)await p.evaluate(n=>document.querySelector('#manual-number-grid [data-number="'+n+'"]').click(),draws[i]);
  }
  assert(oddsAtZero&&moreAfterEight);assert.deepEqual(errors,[]);
  console.log('Castella: opening ODDS UP, each projection tier and the final unpaid ninth-ball preview verified at 1 BET.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

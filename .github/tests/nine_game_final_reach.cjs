/* CHROME_PATH=... node .github/tests/nine_game_final_reach.cjs [lineup] */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),root=path.resolve(__dirname,'../..'),base='http://sweets-test.local/';
const lineups=['cookie,choco,candy','gelato,winery,popcorn','jelly,stick,castella'];
const read=f=>fs.readFileSync(path.join(root,f),'utf8'),version=JSON.parse(read('app-version.json')).version;
const marker='// Keep the completed board visible for 600 unpaused milliseconds';
const source=read('optimized/app-01.js');assert.equal(source.split(marker).length,2);
// Observe the settled production board and its actual tab strip before settlement can replace it.
const instrumented=source.replace(marker,`window.finalReachLog??=[];
 window.finalReachLog.push({id:SweetsLineup.ids[s.i],draws:[...a.draws],processed:e.processed,accepted:e.accepted,
  after:s.reachAfterBall,status:s.reachStatus,rows:(s.reachResults||[]).map(hit=>({...hit})),
  tab:visibleTabReachResults(s,a).map(hit=>hit.number),paged:s.reachPageResults.map(hit=>hit.number),
  hidden:s.reachStrip.hidden,base:s.tabReachBase,win:e.totalHundredths,bet:a.bet(s.i)});
 `+marker).replace('function syncManualNumbers(){',`window.finalRoundSnapshot=()=>({phase:app.phase,draws:app.draws.slice(),held:app.drawHeld,
  games:app.engines.map(e=>({kind:e.kind||'cookie',phase:e.phase,processed:e.processed,accepted:e.accepted,total:e.totalHundredths})),
  wins:app.roundWins.slice(),paid:app.paid.slice(),paused:app.paused});function syncManualNumbers(){`);
async function play(browser,lineup){
 const context=await browser.newContext({viewport:{width:390,height:844},locale:'ja-JP',reducedMotion:'reduce'});
 try{
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{let seed=20261106;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);});
 await page.route(base+'**',route=>{
  const name=decodeURIComponent(new URL(route.request().url()).pathname).slice(1)||'index.html';
  if(name==='optimized/app-01.js')return route.fulfill({body:instrumented,contentType:'application/javascript'});
  const file=path.resolve(root,name);return file.startsWith(root+path.sep)&&fs.existsSync(file)?route.fulfill({path:file}):route.fulfill({status:404,body:''});
 });
 await page.goto(base+'?games='+lineup+'&appv='+version,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.finalRoundSnapshot&&document.querySelector('#manual-number-toggle'));
 await page.evaluate(()=>{document.querySelector('#sound').checked=false;document.querySelector('#manual-number-toggle').click();document.querySelector('#manual-start').click();});
 try{
 for(const n of [3,16,7,20,25,1,13,10]){
  const selector='#manual-number-grid button[data-number="'+n+'"]';
  await page.waitForFunction(s=>document.querySelector(s)?.disabled===false,selector,{timeout:120000});
  await page.evaluate(s=>document.querySelector(s).click(),selector);
 }
 await page.waitForFunction(()=>window.finalReachLog?.length===3&&finalRoundSnapshot().paid.every(Boolean),null,{timeout:240000});
 }catch(error){console.error(lineup,await page.evaluate(()=>({state:finalRoundSnapshot(),completed:window.finalReachLog?.map(x=>x.id)})),errors);throw error;}
 const [logs,final]=await page.evaluate(()=>[finalReachLog,finalRoundSnapshot()]);
 assert.deepEqual(errors,[]);assert.deepEqual(logs.map(x=>x.id).sort(),lineup.split(',').sort());
 for(const l of logs){
  const i=lineup.split(',').indexOf(l.id),actual=final.games[i];
  assert.deepEqual([l.accepted,l.processed,l.after,l.status,l.hidden],[8,8,8,'ready',false],l.id);
  assert.equal(new Set(l.draws).size,8);assert.deepEqual(l.draws,final.draws);
  assert.equal(l.win,l.base,l.id+' preview changed the payout');
  assert.equal(new Set(l.rows.map(x=>x.number)).size,l.rows.length);
  for(const h of l.rows){
   assert(!l.draws.includes(h.number)&&h.number>=1&&h.number<=25,l.id+' invalid next ball');
   assert(h.gain>0||h.oddsUp,l.id+' unqualified candidate');
   assert.equal(h.total,l.win+h.gain);
   if(h.tier!==3)assert.equal(h.tier,h.total>=1000?2:h.total>=300?1:0,l.id+' tier');
  }
  assert.deepEqual(l.tab,l.rows.map(x=>x.number));assert.deepEqual(l.paged,l.tab);
  assert.deepEqual([actual.accepted,actual.processed,actual.total,final.wins[i]],[8,8,l.win,Math.floor(l.bet*l.win/100)],l.id+' phantom draw or award');
  console.log(l.id+' after ball 8: '+l.rows.length+' reaches ('+l.rows.filter(x=>x.oddsUp).length+' odds), '+final.wins[i]+' WIN');
 }
 }finally{await context.close();}
}
(async()=>{
 const lineup=process.argv[2];if(lineup)assert(lineups.includes(lineup));
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined,args:['--no-sandbox','--disable-webgl','--disable-dev-shm-usage']});
 try{for(const l of lineup?[lineup]:lineups)await play(browser,l);}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});

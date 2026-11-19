/* Verify v266 individual FREE controls with a local, isolated real browser. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';import path from 'node:path';import http from 'node:http';
import {fileURLToPath} from 'node:url';import {chromium} from 'playwright';
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url))),output=path.resolve('qa-dango-v266-view');
await fs.mkdir(output,{recursive:true});
const mime={'.js':'text/javascript','.css':'text/css','.webp':'image/webp','.woff2':'font/woff2','.json':'application/json'};
const html='<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>html,body,#screen,#panels{width:100%;height:100%;margin:0;padding:0}#fixture{position:relative;width:100%;height:100%}@font-face{font-family:ElixirNumbers;src:url(/optimized/media/3af2886469024d10.woff2)}@font-face{font-family:ArcadePayout;src:url(/optimized/media/a73bbbdd98d48aac.woff2);font-weight:700}</style><link rel="stylesheet" href="/assets/dango-bingo.css"><div id="screen"><div id="panels"><div class="dgb-panel" id="fixture"></div></div></div><script src="/assets/dango-bingo-rules.js"></script><script src="/assets/dango-bingo-view.js"></script></html>';
const server=http.createServer(async(req,res)=>{
 const u=new URL(req.url,'http://localhost');if(u.pathname==='/'){res.end(html);return;}
 const file=path.resolve(root,'.'+u.pathname);if(!file.startsWith(root+path.sep)){res.statusCode=403;res.end();return;}
 try{const bytes=await fs.readFile(file);res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(bytes);}catch{res.statusCode=404;res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;const errors=[];
try{
 const executable=process.env.PLAYWRIGHT_EXECUTABLE_PATH;
 browser=await chromium.launch({headless:true,...(executable?{executablePath:executable}:{}),args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1366,height:750}});
 page.on('pageerror',error=>errors.push(String(error)));
 await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'networkidle'});
 const ready=await page.evaluate(async()=>{
  await Promise.all([DangoBingoView.assetsReady,document.fonts.ready]);
  const R=DangoBingoRules;
  window.qa={R,view:DangoBingoView.mount(document.getElementById('fixture')),state:null};
  qa.render=()=>qa.view.draw(qa.state,{bet:100,remainingMs:9000,reducedMotion:true});
  qa.new=(mold=0)=>{qa.state=R.create({moldIndex:mold,numbers:Array.from({length:25},(_,i)=>i+1)});};
  qa.earlyByIds=ids=>{for(const id of ids)qa.state=R.draw(qa.state,qa.state.numbers[id]);qa.render();return qa.state.expansionLevel;};
  qa.grade2=()=>{
   qa.new(0);
   const pool=qa.state.cells.filter(c=>c.number>0).map(c=>c.id),initial=qa.state.initialFreeCells.reduce((m,id)=>m|(1<<id),0);
   outer:for(let a=0;a<21;a++)for(let b=a+1;b<22;b++)for(let c=b+1;c<23;c++)for(let d=c+1;d<24;d++)for(let e=d+1;e<25;e++){
    const ids=[pool[a],pool[b],pool[c],pool[d],pool[e]],mask=ids.reduce((m,id)=>m|(1<<id),initial);
    if(R.gradeFor(mask)===2){qa.earlyByIds(ids);break outer;}
   }
   return qa.state.expansionLevel;
  };
  qa.view.setCallbacks({onCell(id){const s=qa.state;qa.state=s.manualFreeCells.includes(id)?R.undoFree(s,id):R.placeFree(s,id);if(qa.state)qa.render();},
   onAuto(){qa.state=R.autoPlace(qa.state);qa.render();}});
  qa.new(0);return R.REVISION;
 });
 assert.equal(ready,265);
 const seven=await page.evaluate(()=>qa.earlyByIds([1,3,6,10,15]));assert.equal(seven,7);
 const first=await page.evaluate(()=>({
  title:document.querySelector('.dgb-free-title').textContent,
  value:document.querySelector('.dgb-free-value').textContent,
  badges:[...document.querySelectorAll('.dgb-trigger')].map(el=>({text:el.textContent,hit:el.classList.contains('hit')})),
  labels:[...document.querySelectorAll('.dgb-pay tbody tr')].map(row=>row.dataset.length),
  grade:qa.state.expansionLevel,buttons:document.querySelectorAll('.dgb-cell').length
 }));
 assert.deepEqual(first.badges.map(b=>b.text),['2個','3個','4個','5個','6個','7個']);
 assert.ok(first.badges[5].hit);assert.ok(first.value.includes('7'));assert.equal(first.buttons,28);
 assert.deepEqual(first.labels,['2','3','4','5','6','7'],'six paid row lengths are visible');
  const payouts=await page.evaluate(()=>[...qa.R.payRows.filter(r=>r.length===2)].map(r=>r.hundredths));
  assert.deepEqual(payouts,[0,20,1000]);
 const eligible=await page.evaluate(()=>qa.R.availableCenters(qa.state));
 assert.equal(eligible.length,23);
 for(let n=0;n<7;n++){
  await page.locator('.dgb-cell[data-cell-id="'+eligible[n]+'"]').click();
  const count=await page.evaluate(()=>qa.state.manualFreeCells.length);assert.equal(count,n+1);
 }
 let complete=await page.evaluate(()=>({remaining:qa.state.freeRemaining,odd:qa.state.oddsMultiplier,free:qa.state.manualFreeCells.length,detail:document.querySelector('.dgb-free-value').textContent}));
 assert.equal(complete.remaining,0);assert.equal(complete.free,7);assert.ok(complete.detail.includes('あと0個'));
 await page.screenshot({path:output+'/v266-seven-individual-desktop.png'});
 await page.locator('.dgb-cell[data-cell-id="'+eligible[0]+'"]').click();
 assert.equal(await page.evaluate(()=>qa.state.freeRemaining),1);
 await page.locator('.dgb-cell[data-cell-id="'+eligible[0]+'"]').click();
 assert.equal(await page.evaluate(()=>qa.state.freeRemaining),0);
 const two=await page.evaluate(()=>qa.grade2());assert.equal(two,2);
 let twoView=await page.evaluate(()=>({grade:qa.state.expansionLevel,free:qa.state.freeBudget,text:document.querySelector('.dgb-free-value').textContent,
  badges:[...document.querySelectorAll('.dgb-trigger')].map(e=>e.classList.contains('hit'))}));
 assert.equal(twoView.free,2);assert.ok(twoView.text.includes('2'));assert.ok(twoView.badges[0]);
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:output+'/v266-two-line-mobile.png'});
 assert.deepEqual(errors,[]);
 console.log('DANGO_V266_VIEW_PASS',JSON.stringify({seven:first,complete,two:twoView,viewports:[[1366,750],[390,844]],pageErrors:errors}));
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}

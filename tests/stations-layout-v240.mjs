import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const css=await readFile('assets/stations-v235.css','utf8'),script=await readFile('assets/stations-v235.js','utf8'),photo=(await readFile('assets/pets/strawberry-mochi.png')).toString('base64');
const roster={version:235,machineId:'public-01',revision:1,capacity:6,selfStation:1,seats:Array.from({length:6},(_,i)=>({station:i+1,playerId:i===0?'self':'player'+i,name:['プレイヤー本人','シュガー','ココア','ほしぞら','ましゅまろ','みんと'][i],pet:{flavor:['strawberry','vanilla','mint','chocolate','grape','strawberry'][i]},photo:'data:image/png;base64,'+photo,win:[12500,750,28000,310,0,9999][i],connected:true,phase:'PLAYING',roundId:'r1',settled:false}))};
const browser=await chromium.launch({executablePath:process.env.SWEETS_CHROMIUM_BIN||'/usr/bin/chromium',args:['--disable-dev-shm-usage','--no-sandbox','--enable-unsafe-swiftshader']});
const out='qa-stations-v240';await mkdir(out,{recursive:true});
try{
 for(const height of [320,235]){
  const p=await browser.newPage({viewport:{width:490,height:520}});
  await p.setContent(`<style>body{margin:0;background:#f6b2c9}#screen{width:480px}#screen>.arena{height:${height}px;position:relative;border:4px solid #df91bb;border-radius:14px;background:#322038;overflow:hidden}#cookie-roulette{position:absolute;inset:0}#cookie-roulette .a8-stage{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 54% 50%,#fae6ff 0 40px,#72335f 55px,#efa7ff 70px,#b04b83 100px,#f5b7ec 125px,#0b0515 135px)}</style><div id="screen"><section class="arena"><div id="cookie-roulette"><div class="a8-stage"></div></div></section></div>`);
  await p.addStyleTag({content:css});
  await p.evaluate(()=>{window.SweetsSharedMachine={client:{online:true,playerId:'self',ws:{readyState:1},round:null,on(){},send(){return true;}}};});
  await p.addScriptTag({content:script});
  await p.evaluate(r=>window.SweetsStationsV235.accept(r),roster);
  const data=await p.evaluate(()=>{
   const arena=document.querySelector('.arena').getBoundingClientRect(),rail=document.querySelector('.stations-strip-v235').getBoundingClientRect();
   const rows=[...document.querySelectorAll('.stations-strip-v235>.station-card-v235')];
   return {arena:{x:arena.x,y:arena.y,width:arena.width,height:arena.height},rail:{x:rail.x,y:rail.y,width:rail.width,height:rail.height},cards:rows.map(c=>{const box=c.getBoundingClientRect();return {x:box.x,y:box.y,w:box.width,h:box.height,self:c.dataset.self,txt:c.textContent,children:[...c.children].map(x=>x.className)};})};
  });
  assert.equal(data.cards.length,6);assert.equal(data.cards[0].self,'1');
  for(let i=0;i<6;i++){const c=data.cards[i];assert.ok(c.x>=data.rail.x-1&&c.x+c.w<=data.rail.x+data.rail.width+1);assert.ok(c.y+c.h<=data.rail.y+data.rail.height+1,'all six visible');assert.equal(c.children.length,4,'only avatar, ST, name, current WIN');if(i)assert.ok(c.y>=data.cards[i-1].y+data.cards[i-1].h-1,'no overlap');}
  await p.screenshot({path:`${out}/client-left-six-${height}.png`});console.log('STATIONS_LEFT_SIX_LAYOUT_PASS',height,data.cards.map(x=>x.txt));await p.close();
 }
}finally{await browser.close();}

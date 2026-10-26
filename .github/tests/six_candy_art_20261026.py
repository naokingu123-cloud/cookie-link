from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
import threading,json,hashlib
root=Path.cwd();source=Path('index.html').read_text()
anchor="app=new Arcade({onEvent:recordEvent,onChange:recordChanged});app.drawSource=rouletteDrawSource;try{app.engines[1].enablePersistence(localStorage);}catch{}select(2);"
assert source.count(anchor)==1
hook="""window.__skinQA={app,slots,drawCarnival,carnivalEvent,carnivalHud,sixArtNumberSprite,sixArtCandySprite,sixArtBackdrop,sixArtCache,SIX_ART_VERSION,select,startReadyRound,debugResetRound,get ready(){return rouletteReady},get driver(){return rouletteDriver},freeze(){stopAutoRound();autoRoundRemaining=3600000;userPaused=true;syncPause();},resume(){userPaused=false;syncPause();}};document.querySelector('#sound').checked=false;"""
html=source.replace(anchor,anchor+hook)
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(root),**kw)
 def log_message(self,*a):pass
 def do_GET(self):
  try:
   if self.path.split('?')[0] in ['/','/index.html']:
    b=html.encode();self.send_response(200);self.send_header('Content-Type','text/html;charset=utf-8');self.send_header('Content-Length',str(len(b)));self.end_headers();self.wfile.write(b)
   else:super().do_GET()
  except (BrokenPipeError,ConnectionResetError):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
out=Path('qa-six-art');out.mkdir(exist_ok=True);errors=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 context=browser.new_context(viewport={'width':430,'height':932},is_mobile=True,has_touch=True)
 page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
 url=f'http://127.0.0.1:{server.server_port}/index.html';page.goto(url,wait_until='domcontentloaded');page.wait_for_function('window.__skinQA?.ready',timeout=30000);page.evaluate('__skinQA.freeze();document.fonts.ready');page.wait_for_timeout(250)
 assert page.evaluate('__skinQA.SIX_ART_VERSION')=='candy-illustrated-v1'
 assert page.locator('.six-art-logo').count()==2
 stats=page.evaluate(r'''()=>{
  const q=__skinQA,check=(v,m)=>{if(!v)throw Error(m)},e=q.app.engines[2],before=JSON.stringify({p:e.pyramid,credit:q.app.credit,bets:q.app.bets,phase:e.phase,processed:e.processed});
  const numbers=[],flavors=[],oldRandom=Math.random;
  const pixels=cv=>{const d=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;let nonzero=0,pink=0,white=0,hash=2166136261;for(let i=0;i<d.length;i+=4){if(d[i+3]){nonzero++;if(d[i]>190&&d[i+1]<155&&d[i+2]>80)pink++;if(d[i]>225&&d[i+1]>215&&d[i+2]>210)white++;}for(let k=0;k<4;k++)hash=Math.imul(hash^d[i+k],16777619)>>>0;}return{hash,nonzero,pink,white};};
  try{
   Math.random=()=>{throw Error('Artwork consumed live random state')};
   for(let n=1;n<=25;n++){const cv=q.sixArtNumberSprite(n),v=pixels(cv);check(v.nonzero>1500&&v.pink>100&&v.white>100,'Missing candy numeral '+n);check(cv===q.sixArtNumberSprite(n),'Numeral not cached');numbers.push(v);}
   for(let c=0;c<5;c++){const cv=q.sixArtCandySprite(c),v=pixels(cv);check(v.nonzero>8000,'Missing candy texture');check(cv===q.sixArtCandySprite(c),'Candy not cached');flavors.push(v);}
   for(const rows of [7,8,9,10])check(q.sixArtBackdrop(rows)===q.sixArtBackdrop(rows),'Frame not cached');
  }finally{Math.random=oldRandom;}
  check(new Set(numbers.map(v=>v.hash)).size===25,'Duplicate numeral');check(new Set(flavors.map(v=>v.hash)).size===5,'Duplicate flavor');
  for(let i=0;i<4;i++)q.drawCarnival(q.slots[2],1000+i*35);
  check(before===JSON.stringify({p:e.pyramid,credit:q.app.credit,bets:q.app.bets,phase:e.phase,processed:e.processed}),'Drawing changed game state');
  const ids=[...document.querySelectorAll('.six-art-logo [id]')].map(el=>el.id);check(new Set(ids).size===ids.length,'Duplicate SVG gradient identifiers');
  const colorNames=['いちご','レモン','ミント','ソーダ','ぶどう'];return{numberCount:numbers.length,flavorCount:flavors.length,cache:q.sixArtCache.size,numerals:numbers,flavors,colors:colorNames};
 }''');print('CANDY_ART_25_UNIQUE_STRIPED_NUMERALS_5_FLAVORS_CACHE_NO_RNG_OK',json.dumps(stats,ensure_ascii=False),flush=True)
 for rows in [7,8,9,10]:
  page.select_option('#six-row-select',str(rows));page.wait_for_timeout(160);assert page.evaluate('__skinQA.app.engines[2].rows')==rows
  page.screenshot(path=str(out/f'bet-{rows}-rows.png'))
 page.evaluate('__skinQA.resume();__skinQA.startReadyRound();__skinQA.driver.setPaused(true);__skinQA.freeze()');page.wait_for_timeout(200)
 assert page.evaluate('__skinQA.app.engines[2].pyramid.flat().filter(t=>t&&t.number!=null).length')==25
 page.evaluate('__skinQA.drawCarnival(__skinQA.slots[2])')
 layout=[]
 for width,height in [(430,932),(390,844),(320,568),(844,390)]:
  page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(250)
  info=page.evaluate(r'''()=>{
   const q=__skinQA,s=q.slots[2],rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}},check=(v,m)=>{if(!v)throw Error(m)};
   const box=rect(s.panel),strip=rect(document.querySelector('.roulette-info-strip')),odds=document.querySelector('#carnival-odds'),logo=document.querySelector('#carnival-heading .six-art-logo'),heading=document.querySelector('#carnival-heading');
   const lr=rect(logo),hr=rect(heading);check(lr.w>100&&lr.h>15,'Logo too small');check(lr.right<=hr.right+1&&lr.x>=hr.x-1,'Logo overflow');
   check(odds.scrollHeight<=odds.clientHeight+2,'Payout legend clipped '+odds.scrollHeight+'/'+odds.clientHeight);
   for(const gain of [50,300,1000,6000]){q.carnivalEvent(s,{phase:gain===6000?'pyramidAllClear':'pyramidAward',gain,chain:2,hexagons:1,triangles:0,lines:0},s.engine,q.app);s.candyReward.getAnimations().forEach(a=>a.finish());const r=rect(s.candyReward);check(r.x>=box.x-1&&r.right<=box.right+1&&r.y>=box.y-1&&r.bottom<=box.bottom+1,'Reward overflow');check(!(r.x<strip.right&&r.right>strip.x&&r.y<strip.bottom&&r.bottom>strip.y),'Reward overlaps black strip');}
   s.candyReward.hidden=true;return{panel:box,logo:lr,odds:[odds.scrollHeight,odds.clientHeight]};
  }''');layout.append({'width':width,'height':height,**info});page.screenshot(path=str(out/f'playing-{width}x{height}.png'));print('SKIN_LAYOUT_OK',width,height,info,flush=True)
 # Record a real live board and full mobile layout, not a static concept screen.
 page.set_viewport_size({'width':430,'height':932});page.wait_for_timeout(200);page.evaluate('__skinQA.drawCarnival(__skinQA.slots[2])');page.screenshot(path=str(out/'six-candy-skin-mobile.png'));page.locator('.carnival-canvas').screenshot(path=str(out/'six-candy-board.png'))
 page.evaluate('__skinQA.debugResetRound();__skinQA.freeze();__skinQA.select(0)');assert page.locator('#panel0').is_visible() and not page.locator('#carnival-odds').is_visible()
 page.evaluate('__skinQA.select(1)');assert page.locator('#choco-odds').is_visible()
 page.evaluate('__skinQA.select(2)');assert page.locator('#carnival-odds').is_visible()
 page.emulate_media(reduced_motion='reduce');page.wait_for_timeout(120);page.screenshot(path=str(out/'reduced-motion.png'))
 pc=browser.new_context(viewport={'width':1280,'height':900});pg=pc.new_page();pg.on('pageerror',lambda e:errors.append(str(e)));pg.goto(url,wait_until='domcontentloaded');pg.wait_for_function('window.__skinQA?.ready',timeout=30000);pg.evaluate('__skinQA.freeze();document.fonts.ready');pg.wait_for_timeout(200);pg.screenshot(path=str(out/'desktop.png'));pc.close()
 assert not errors,errors
 (out/'verification.json').write_text(json.dumps({'art':stats,'layouts':layout,'errors':errors,'source_type':'Reference-informed vector/canvas, original generated PNGs not transferred','scope':'Chromium desktop and mobile emulation; not a physical iPhone'},ensure_ascii=False,indent=2))
 browser.close()
server.shutdown();print('ALL_SIX_CANDY_SKIN_CHECKS_PASSED',flush=True)

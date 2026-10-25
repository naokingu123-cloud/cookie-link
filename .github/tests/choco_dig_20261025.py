from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
import threading,json,os,shutil
from playwright.sync_api import sync_playwright
root=Path.cwd();s=(root/'index.html').read_text()
a="app=new Arcade({onEvent:recordEvent,onChange:recordChanged});app.drawSource=rouletteDrawSource;try{app.engines[1].enablePersistence(localStorage);}catch{}select(1);"
assert s.count(a)==1
hook="""window.__digQA={app,slots,Engine,ChocoDigEngine,Arcade,select,hud,drawChoco,chocoHud,startReadyRound,debugResetRound,syncPause,activateGameAudio,recordBook,renderRoundResult,get driver(){return rouletteDriver},get ready(){return rouletteReady},get active(){return active},get bgm(){return {level:bgmLevel,role:bgmRole,paused:bgmPlayer.paused,source:bgmPlayer.getAttribute('src')}},freeze(){autoRoundRemaining=3600000;stopAutoRound();},hold(){userPaused=true;syncPause();},resume(){userPaused=false;syncPause();},stopPhysical(){rouletteDriver?.setPaused(true);}};document.querySelector('#sound').checked=false;"""
html=s.replace(a,a+hook)
class H(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kw):super().__init__(*args,directory=str(root),**kw)
 def log_message(self,*args):pass
 def do_GET(self):
  try:
   if self.path.split('?')[0] in ['/','/index.html']:
    b=html.encode();self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Content-Length',str(len(b)));self.end_headers();self.wfile.write(b)
   else:super().do_GET()
  except (BrokenPipeError,ConnectionResetError):pass
server=ThreadingHTTPServer(('127.0.0.1',0),H);threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'])
 ctx=browser.new_context(viewport={'width':430,'height':932},is_mobile=True,has_touch=True)
 page=ctx.new_page();errors=[];page.on('pageerror',lambda e:(errors.append(str(e)),print('PAGE_ERROR',e,flush=True)))
 url=f'http://127.0.0.1:{server.server_port}/index.html'
 page.goto(url,wait_until='domcontentloaded');page.wait_for_function('window.__digQA?.ready',timeout=30000);page.evaluate('__digQA.freeze();__digQA.hold()');page.wait_for_timeout(700)
 print('LOADED_REAL_ROULETTE',errors,flush=True)
 out=root/'qa-previews';out.mkdir(exist_ok=True);page.screenshot(path=str(out/'choco-bet-430.png'))
 stats=page.evaluate(r'''async()=>{
 const q=__digQA,check=(a,m)=>{if(!a)throw Error(m)},sleep=()=>Promise.resolve(),rounds=[];
 for(const seed of [1,7,23,998]){
  let state=seed;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
  const events=[],e=new q.ChocoDigEngine({random,sleep,onEvent:(ev,engine)=>events.push({phase:ev.phase,processed:engine.processed,depth:engine.depth,total:engine.totalHundredths})});
  e.roundBet=100;e.start();const before=JSON.stringify(e.world());e.previewDraw(1);e.previewDraw(2);check(before===JSON.stringify(e.world()),'Preview changed terrain');check(e.processed===0,'Early processing');
  for(const group of [[1,2,3],[4,5],[6],[7],[8]])e.enqueueBatch(group);
  for(let i=0;i<2500&&e.running;i++)await Promise.resolve();
  check(!e.running&&e.phase==='complete'&&e.processed===8,'Incomplete round');check(JSON.stringify(events.filter(x=>x.phase==='settled').map(x=>x.processed))==='[3,5,6,7,8]','Incorrect groups');
  const committed=JSON.stringify(e.world());e.reset();check(committed===JSON.stringify(e.world()),'Completed terrain lost');e.roundBet=0;e.start();check(!e.running&&e.enqueueBatch([9])===false,'0 BET ran');check(committed===JSON.stringify(e.world()),'0 BET changed terrain');
  e.roundBet=100;e.start();e.enqueueBatch([9,10,11]);for(let n=0;n<100;n++)await Promise.resolve();e.reset();check(committed===JSON.stringify(e.world()),'Aborted round not rolled back');
  const store={value:null,setItem(k,v){this.value=v;},getItem(){return this.value;}};e.enablePersistence(store);e.persist();const other=new q.ChocoDigEngine({sleep});other.enablePersistence(store);check(JSON.stringify(other.world())===JSON.stringify(e.world()),'Persistence mismatch');
  rounds.push({seed,depth:e.depth,blocks:e.dugTotal});
 }
 const e=new q.ChocoDigEngine({sleep}),tile=(kind,id)=>({kind,id,hp:kind===4||kind===7?2:1,maxHp:kind===4||kind===7?2:1});
 e.strata=Array.from({length:12},(_,r)=>Array.from({length:5},(_,c)=>tile(4,r*5+c+1)));e.strata[0][0]=tile(0,1);e.strata[0][1]=tile(0,2);e.strata[1][0]=tile(0,6);
 let plan=e.plan([1]);check(plan.combo===3&&plan.removed.length===3,'Linked chocolate');e.strata[0][0]=tile(6,1);plan=e.plan([1]);check(plan.removed.length>=4,'Fondant splash');e.strata[0][0]=tile(7,1);plan=e.plan([1]);check(plan.removed.length===0&&plan.grid[0][0].hp===1,'Chest hardness');plan=e.plan([1,6]);check(plan.treasures===1,'Chest second HIT');
 // Three real engines share the same accepted roulette sequence.
 let callbacks;const a=new q.Arcade({sleep,onEvent:(i,ev)=>{if(ev.phase==='error')throw Error(ev.message);}});a.drawSource={ready:true,start(c){callbacks=c},reset(){},pause(){}};a.start();
 for(let k=0;k<200;k++)await Promise.resolve();for(let n=1;n<=8;n++)check(callbacks.onNumber(n)!==false,'Draw rejected');for(let k=0;k<12000&&a.phase==='playing';k++)await Promise.resolve();
 check(a.phase==='result'&&a.paid.every(Boolean),'Mixed round failed '+a.phase);check(a.engines[1].kind==='choco'&&a.engines[0].constructor===q.Engine&&a.engines[2].constructor===q.Engine,'Wrong tabs replaced');check(a.engines.every(e=>e.processed===8),'Lost draw');
 // A complete depth milestone grants one sugar, not on each UI update or reset.
 const sugar=[];const m=new q.ChocoDigEngine({sleep,onEvent:ev=>{if(ev.phase==='stepcollect')sugar.push(...ev.steps)}});m.depth=9;m.nextSugar=10;m.strata=Array.from({length:12},(_,r)=>Array.from({length:5},(_,c)=>tile((r+c)%4,100+r*5+c)));m.start();for(const group of [[1,2,3],[4,5],[6],[7],[8]])m.enqueueBatch(group);for(let k=0;k<2500&&m.running;k++)await Promise.resolve();check(m.depth>=10&&sugar.length===1&&m.nextSugar>m.depth,'Sugar threshold');m.reset();check(sugar.length===1,'Sugar duplicate');
 return {rounds,mixed:a.roundWins,sugar:sugar.length};
 }''')
 print('ENGINE_GROUPS_SAVE_ROLLBACK_ZERO_BET_MIXED_AND_SUGAR_OK',stats,flush=True)
 page.evaluate("__digQA.app.setBet(0,0);__digQA.app.setBet(2,0);__digQA.resume();__digQA.freeze();__digQA.startReadyRound();__digQA.stopPhysical();")
 page.wait_for_function("__digQA.app.phase==='playing'");page.evaluate("__digQA.app.acceptNumber(1,__digQA.app.token);__digQA.app.acceptNumber(2,__digQA.app.token)");page.wait_for_timeout(250);assert page.evaluate('__digQA.app.engines[1].processed')==0
 page.screenshot(path=str(out/'choco-pending-430.png'));page.evaluate("__digQA.app.acceptNumber(3,__digQA.app.token)");page.wait_for_function('__digQA.app.engines[1].processed===3',timeout=10000);page.screenshot(path=str(out/'choco-playing-430.png'))
 for n in [4,5,6,7,8]:page.evaluate('(n)=>__digQA.app.acceptNumber(n,__digQA.app.token)',n)
 page.wait_for_function("['result','paying','complete'].includes(__digQA.app.phase)",timeout=15000);page.evaluate('__digQA.hold()');page.wait_for_timeout(300);page.screenshot(path=str(out/'choco-result-430.png'));assert 'ショコラディグ' in page.locator('#result-games').inner_text()
 saved=page.evaluate('JSON.stringify(__digQA.app.engines[1].world())');page.reload(wait_until='domcontentloaded');page.wait_for_function('window.__digQA?.ready',timeout=30000);page.evaluate('__digQA.freeze();__digQA.hold()');assert saved==page.evaluate('JSON.stringify(__digQA.app.engines[1].world())')
 page.evaluate('__digQA.select(0)');page.wait_for_timeout(200);assert page.locator('#panel0').is_visible() and not page.locator('#choco-odds').is_visible();page.evaluate('__digQA.select(2)');page.wait_for_timeout(200);assert page.locator('#panel2').is_visible();page.evaluate('__digQA.select(1)');page.wait_for_timeout(200);assert page.locator('#choco-odds').is_visible()
 for width,height in [(390,844),(320,568),(844,390)]:
  page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(500);r=page.locator('.choco-canvas').bounding_box();outer=page.locator('#screen').bounding_box();assert r and r['width']>100 and r['height']>100;assert r['x']>=outer['x']-2 and r['y']+r['height']<=outer['y']+outer['height']+2
  sidebar=page.locator('#choco-odds').evaluate('(e)=>({scroll:e.scrollHeight,height:e.clientHeight})');assert sidebar['scroll']<=sidebar['height']+2,sidebar
  page.screenshot(path=str(out/f'choco-{width}.png'));print('LAYOUT_OK',width,height,flush=True)
 pc=browser.new_context(viewport={'width':1280,'height':900});pg=pc.new_page();pg.on('pageerror',lambda e:errors.append(str(e)));pg.goto(url,wait_until='domcontentloaded');pg.wait_for_function('window.__digQA?.ready',timeout=30000);pg.evaluate('__digQA.freeze();__digQA.hold()');pg.wait_for_timeout(500);assert pg.locator('.choco-canvas').is_visible();pg.screenshot(path=str(out/'choco-desktop.png'));pc.close()
 assert not errors,errors
 (out/'verification.json').write_text(json.dumps({'engine':stats,'errors':errors,'real_roulette_loaded':True,'arrival_events':'controlled accepted-number callbacks; not a full natural-physics round'},ensure_ascii=False,indent=2))
 browser.close()
server.shutdown();print('ALL_CHOCO_TESTS_PASSED',flush=True)

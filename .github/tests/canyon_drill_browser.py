"""Drill cabinet UI, materials, animation and state-isolation checks."""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
import threading,json
from playwright.sync_api import sync_playwright
root=Path.cwd();html=(root/'index.html').read_text()
anchor="app=new Arcade({onEvent:recordEvent,onChange:recordChanged});app.drawSource=rouletteDrawSource;try{app.engines[1].enablePersistence(localStorage);}catch{}select(2);"
hook="""window.__drillQA={app,slots,select,drawChoco,chocoHud,chocoBoardLayout,chocoDrawDrill,chocoDrillLevel,chocoCakeImages,ChocoDigEngine,freeze(){stopAutoRound();autoRoundRemaining=3600000;userPaused=true;syncPause();},render(){chocoHud(app);drawChoco(slots[1]);}};document.querySelector('#sound').checked=false;__drillQA.freeze();__drillQA.select(1);"""
assert html.count(anchor)==1;html=html.replace(anchor,anchor+hook)
class H(SimpleHTTPRequestHandler):
 def __init__(self,*a,**k):super().__init__(*a,directory=str(root),**k)
 def log_message(self,*a):pass
 def do_GET(self):
  if self.path.split('?')[0]=='/':
   self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.end_headers();self.wfile.write(html.encode())
  else:
   try:super().do_GET()
   except (BrokenPipeError,ConnectionResetError):pass
server=ThreadingHTTPServer(('127.0.0.1',0),H);threading.Thread(target=server.serve_forever,daemon=True).start()
out=root/'qa-six-v5';out.mkdir(exist_ok=True);report={'layouts':[]};errors=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=browser.new_page(viewport={'width':430,'height':932},device_scale_factor=2,is_mobile=True)
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(f'http://127.0.0.1:{server.server_port}/',wait_until='domcontentloaded')
 page.wait_for_function('window.__drillQA?.chocoCakeImages.every(i=>i.complete&&i.naturalWidth)')
 page.evaluate('document.fonts.ready');page.locator('#choco-odds').wait_for(state='visible')
 for w,h in [(320,740),(390,844),(430,932),(932,430),(1280,900)]:
  page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(220)
  result=page.evaluate('''()=>{const q=__drillQA,e=q.slots[1].engine,before=JSON.stringify(e.world()),rng=e.rng;try{e.rng=()=>{throw Error('UI used game RNG')};q.render();const cv=q.slots[1].chocoCanvas,rect=cv.getBoundingClientRect(),layout=q.chocoBoardLayout(320,320*rect.height/rect.width),odds=document.querySelector('#choco-odds');if(cv.dataset.drills!=='7')throw Error('Missing heads');if(layout.w<=0||layout.top<104||Math.abs(layout.w-layout.h)>.01||layout.top+12*layout.h>320*rect.height/rect.width+1)throw Error('Clipped grid');if(odds.scrollHeight>odds.clientHeight+2||odds.scrollWidth>odds.clientWidth+2)throw Error('Odds overflow '+innerWidth+' '+odds.scrollHeight+'/'+odds.clientHeight);for(const row of odds.querySelectorAll('.canyon-prize-row')){const r=row.getBoundingClientRect(),b=row.querySelector('b').getBoundingClientRect();if(b.right>r.right+1)throw Error('Prize text clipped');}if(document.querySelectorAll('.choco-lucky-row').length!==3||document.querySelectorAll('.choco-level-table [data-level]').length!==5)throw Error('Legend missing');const assigned=[...e.drills.flatMap(d=>d.numbers),...e.lucky.numbers,e.missNumber];if(new Set(assigned).size!==25||e.strata.flat().some(t=>t&&t.number!=null))throw Error('Bad number placement');if(JSON.stringify(e.world())!==before)throw Error('UI mutated world');return {width:innerWidth,height:innerHeight,cell:layout.w,oddsFit:true,heads:7,noGameMutation:true};}finally{e.rng=rng}}''')
  report['layouts'].append(result);print('DRILL_LAYOUT',result,flush=True)
  page.screenshot(path=str(out/f'drill-{w}.png'))
 page.set_viewport_size({'width':430,'height':932});page.wait_for_timeout(160)
 report['materials']=page.evaluate('''()=>{const q=__drillQA,images=[];for(let level=1;level<=5;level++){const cv=document.createElement('canvas');cv.width=120;cv.height=140;q.chocoDrawDrill(cv.getContext('2d'),60,70,88,level);images.push(cv.toDataURL());}if(new Set(images).size!==5)throw Error('Materials indistinguishable');return {distinct:5}}''')
 report['levels']=page.evaluate('''()=>{const q=__drillQA,e=q.slots[1].engine;e.lucky.hits=e.lucky.numbers.slice(0,2);e.drills.forEach((d,i)=>d.hits=d.numbers.slice(0,[0,1,2,3,3,1,0][i]));q.render();const levels=e.drills.map(d=>q.chocoDrillLevel(d,e.lucky));if(levels.join()!=='2,3,4,5,5,3,2'||document.querySelectorAll('.choco-lucky-row.hit').length!==2)throw Error('Upgrade UI out of sync');return levels}''')
 page.screenshot(path=str(out/'drill-levels.png'))
 report['allAttack']=page.evaluate('''()=>{const q=__drillQA,e=q.slots[1].engine,plan=e.plan([e.lucky.numbers[2]],{trace:true}),stage=plan.timeline.find(s=>s.phase==='canyonDrill');if(stage.attacks.length!==7)throw Error('Not all columns');e.strata=stage.grid;e.drills=stage.drills;e.lucky=stage.lucky;e.fx={...stage,elapsed:stage.ms*.55,stamp:null};q.render();return {columns:stage.attacks.length,levels:stage.attacks.map(a=>a.level)}}''')
 page.screenshot(path=str(out/'drill-all.png'))
 # Runtime uses the real engine with no animation waits to exercise all eight accepted numbers.
 report['engine']=page.evaluate('''async()=>{const q=__drillQA,e=new q.ChocoDigEngine({random:()=>.44,sleep:()=>Promise.resolve()}),events=[];e.onEvent=ev=>{events.push(ev.phase);if(ev.phase==='error')throw Error(ev.message)};e.visualWait=async(ms,t)=>t===e.version;e.start();const sequence=[...e.lucky.numbers.slice(0,2),...e.drills[0].numbers,e.lucky.numbers[2],...e.drills[1].numbers.slice(0,2)];for(const batch of [sequence.slice(0,3),sequence.slice(3,5),[sequence[5]],[sequence[6]],[sequence[7]]]){e.enqueueBatch(batch);for(let n=0;n<30000&&(e.busy||e.queue.length);n++)await Promise.resolve();}if(e.phase!=='complete'||e.processed!==8||q.chocoDrillLevel(e.drills[0],e.lucky)!==5)throw Error('Eight-ball sequence failed');if(!events.includes('canyonBoost')||!events.includes('canyonAll'))throw Error('Missing lucky events');return {processed:e.processed,maxLevel:5,phase:e.phase}}''')
 assert not errors,errors
 browser.close()
server.shutdown();(out/'canyon-drills-report.json').write_text(json.dumps(report,indent=2));print('CANYON_DRILL_BROWSER_PASS',json.dumps(report),flush=True)

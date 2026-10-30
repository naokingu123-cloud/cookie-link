from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
import threading,json
from playwright.sync_api import sync_playwright
root=Path.cwd();html=(root/'index.html').read_text()
anchor="app=new Arcade({onEvent:recordEvent,onChange:recordChanged});app.drawSource=rouletteDrawSource;try{app.engines[1].enablePersistence(localStorage);}catch{}select(2);"
hook="""window.__qa={COOKIE_ALL_CLEAR_HUNDREDTHS,payoutHundredths,renderAllClear,hud,chocoShaftLighting,chocoScaleValue,chocoSevenSegment,app,slots,select,reachContextKey,rouletteReachTiers,setCanyonDebugDepth,chocoChainSheen,openRecordMenu,closeRecordMenu,chocoBoardLayout,drawChoco,get driver(){return rouletteDriver},hold(){stopAutoRound();userPaused=true;syncPause();},resume(){userPaused=false;syncPause();stopAutoRound();}};document.querySelector('#sound').checked=false;__qa.hold();"""
assert html.count(anchor)==1;html=html.replace(anchor,anchor+hook)
class H(SimpleHTTPRequestHandler):
 def __init__(self,*a,**k):super().__init__(*a,directory=str(root),**k)
 def log_message(self,*a):pass
 def do_GET(self):
  if self.path.split('?')[0]=='/':
   self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.end_headers();self.wfile.write(html.encode())
  else:super().do_GET()
server=ThreadingHTTPServer(('127.0.0.1',0),H);threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(f'http://127.0.0.1:{server.server_port}/',wait_until='domcontentloaded');page.wait_for_function('__qa.driver',timeout=30000)

 page.wait_for_function("[...document.images].filter(i=>i.src.includes('canyon')).every(i=>i.complete)")
 page.evaluate("""()=>{const q=__qa;q.app.phase='playing';q.app.locked=[3000,3000,3000];q.app.bets=[3000,3000,3000];q.select(1);q.hold();for(const s of q.slots){const b=s.tab.querySelector('.tab-win-bubble');b.hidden=false;b.style.animation='none';b.style.opacity='1';s.tabWin.textContent='3000';}const e=q.slots[1].engine;e.fx=null;e.totalHundredths=0;q.chocoScaleValue(q.slots[1],e,3000,0);}""")
 report=page.evaluate("""()=>{const q=__qa;q.select(0);q.hud(q.app);const s=q.slots[0],e=s.engine;e.maxLink=4;e.allClears=1;e.updatePayout();q.renderAllClear(s,{phase:'allclear'},e,false);if(q.COOKIE_ALL_CLEAR_HUNDREDTHS!==2000||e.totalHundredths!==2020||q.payoutHundredths(8,8,2)!==4300)throw Error('Incorrect all-clear payout');const label=document.querySelector('#allclear-award').getAttribute('aria-label'),effect=s.allClear.getAttribute('aria-label');if(!label.replaceAll(',','').includes('60000')||!effect.replaceAll(',','').includes('60000'))throw Error(JSON.stringify({label,effect}));return {label,effect,payout:e.totalHundredths};}""")
 page.screenshot(path='/tmp/economy-cookie-v25.png')
 assert not errors,errors;print('ECONOMY_UI_PASS',json.dumps(report));browser.close()
server.shutdown()

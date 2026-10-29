"""Mine v5: full-width scene, one continuous drill, assets, WIN and renewable lucky slots."""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
import threading,json
from playwright.sync_api import sync_playwright
root=Path.cwd();html=(root/'index.html').read_text()
anchor="app=new Arcade({onEvent:recordEvent,onChange:recordChanged});app.drawSource=rouletteDrawSource;try{app.engines[1].enablePersistence(localStorage);}catch{}select(2);"
hook="""window.__drillQA={setPhysicalReady(v){rouletteReady=v},app,slots,select,drawChoco,chocoHud,chocoBoardLayout,chocoRequestReach,chocoReachReady,chocoNumberHit,updateReachUI,chocoCavity,reachTier,chocoScaleValue,chocoScaleSink,chocoSevenSegment,chocoCartArrival,chocoSugarDistance,chocoDrillPose,chocoDrawDrill,chocoDrillLevel,chocoCakeImages,chocoOreImages,chocoMineImages,chocoExcavate,chocoTileMask,chocoPaintTile,chocoAutoSprite,chocoCanonicalMask,chocoScrollEase,chocoCartPose,chocoRockAudio,unlock,stopSounds,get audio(){return audio},get soundBuffers(){return sfxBuffers},get voices(){return sfxVoices},resume(){userPaused=false;syncPause();},ChocoDigEngine,freeze(){stopAutoRound();autoRoundRemaining=3600000;userPaused=true;syncPause();},render(){chocoHud(app);drawChoco(slots[1]);}};document.querySelector('#sound').checked=false;__drillQA.freeze();__drillQA.select(1);"""
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
 page.on('pageerror',lambda e:(errors.append(str(e)),print('PAGE_ERROR',str(e),flush=True)))
 page.goto(f'http://127.0.0.1:{server.server_port}/',wait_until='domcontentloaded')
 page.wait_for_function('window.__drillQA&&[...__drillQA.chocoCakeImages,...Object.values(__drillQA.chocoOreImages),...Object.values(__drillQA.chocoMineImages)].every(i=>i.complete&&i.naturalWidth)')
 page.evaluate('document.fonts.ready')
 page.wait_for_function('window.__drillQA && document.querySelector("#manual-number-toggle")')
 page.locator('#manual-number-toggle').click()
 page.evaluate('__drillQA.resume();__drillQA.setPhysicalReady(false)')
 page.locator('#manual-start').click()
 page.wait_for_function('__drillQA.app.phase==="playing"')
 page.locator('#manual-number-grid button[data-number="1"]').click()
 page.locator('#manual-number-grid button[data-number="2"]').click()
 assert page.evaluate('__drillQA.app.draws.join(",")')=='1,2'
 assert page.locator('#manual-number-grid button[data-number="1"]').is_disabled()
 page.wait_for_timeout(800)
 assert page.evaluate('__drillQA.app.draws.length')==2
 assert page.evaluate('__drillQA.app.engines[1].accepted')==2
 for n in range(3,9):page.locator(f'#manual-number-grid button[data-number="{n}"]').click()
 assert page.evaluate('__drillQA.app.draws.length')==8
 assert page.locator('#manual-number-grid button[data-number="9"]').is_disabled()
 for w,h in [(320,740),(430,932),(1280,900)]:
  page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(120)
  assert page.evaluate("""()=>{const p=document.querySelector('#manual-number-panel').getBoundingClientRect();const history=document.querySelector('#manual-history').getBoundingClientRect();if(history.top<document.querySelector('#manual-number-grid').getBoundingClientRect().bottom-1)return false;return [...document.querySelectorAll('#manual-number-grid button')].every(b=>{const r=b.getBoundingClientRect();return r.width>10&&r.height>7&&r.left>=p.left&&r.right<=p.right+1&&r.bottom<=p.bottom})}""")
  page.screenshot(path=str(out/f'manual-numbers-{w}.png'))
 page.evaluate('__drillQA.setPhysicalReady(true)')
 page.locator('#manual-number-toggle').click()
 assert page.locator('#manual-number-panel').is_hidden()
 assert page.evaluate('__drillQA.app.phase')=='ready'
 assert page.evaluate('__drillQA.app.draws.length')==0
 page.locator('#manual-number-toggle').click()
 page.locator('#manual-start').click()
 page.wait_for_function('__drillQA.app.phase==="playing"')
 page.locator('#manual-number-grid button[data-number="25"]').click()
 assert page.evaluate('__drillQA.app.draws.join(",")')=='25'
 assert not errors,errors
 browser.close()
server.shutdown();print('MANUAL_NUMBERS_PASS: 8 inputs, duplicate rejection, pending input, no automatic balls, reset, return, three layouts')

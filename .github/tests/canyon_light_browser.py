from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
import threading,json
from playwright.sync_api import sync_playwright
root=Path.cwd();html=(root/'index.html').read_text()
anchor="app=new Arcade({onEvent:recordEvent,onChange:recordChanged});app.drawSource=rouletteDrawSource;try{app.engines[1].enablePersistence(localStorage);}catch{}select(2);"
hook="""window.__qa={chocoShaftLighting,chocoScaleValue,chocoSevenSegment,app,slots,select,reachContextKey,rouletteReachTiers,setCanyonDebugDepth,chocoChainSheen,openRecordMenu,closeRecordMenu,chocoBoardLayout,drawChoco,get driver(){return rouletteDriver},hold(){stopAutoRound();userPaused=true;syncPause();},resume(){userPaused=false;syncPause();stopAutoRound();}};document.querySelector('#sound').checked=false;__qa.hold();"""
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
 report=page.evaluate("""()=>{const q=__qa,cv=document.createElement('canvas');cv.width=140;cv.height=240;const x=cv.getContext('2d'),L={left:0,top:0,w:20,h:20};x.fillStyle='#888888';x.fillRect(0,0,140,240);q.chocoShaftLighting(x,L,[{c:1,y:40,tile:{color:0}},{c:2,y:120,tile:{color:-1,item:'ore'}},{c:3,y:40,tile:{color:0}},{c:3,y:120,tile:{color:-1,item:'ore'}}]);const lum=(c,y)=>{const p=x.getImageData(c*20+10,y,1,1).data;return p[0]+p[1]+p[2];};const open=lum(0,130),shadow=lum(1,130),ore=lum(2,130),buried=lum(3,130),cake=lum(1,50),belowOre=lum(2,190);if(!(open>shadow&&ore>buried&&shadow>open*.72&&buried>ore*.72&&cake===408&&belowOre===open))throw Error(JSON.stringify({open,shadow,ore,buried,cake,belowOre}));const s=q.slots[1],e=s.engine;e.strata=Array.from({length:12},()=>Array(7).fill(null));e.strata[2][1]={id:9001,color:0};e.strata[6][1]={id:9002,color:-1,item:'ore',ore:'gold',baseValue:200,value:200};e.strata[8][4]={id:9003,color:-1,item:'ore',ore:'diamond',baseValue:500,value:500};q.drawChoco(s);return {open,shadow,ore,buried,cake,belowOre};}""")
 page.screenshot(path='/tmp/canyon-light-v24.png')
 assert not errors,errors;print('SHAFT_LIGHT_PASS',json.dumps(report));browser.close()
server.shutdown()

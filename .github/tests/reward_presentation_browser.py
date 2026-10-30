from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
import threading,json
from playwright.sync_api import sync_playwright
root=Path.cwd();html=(root/'index.html').read_text()
anchor="app=new Arcade({onEvent:recordEvent,onChange:recordChanged});app.drawSource=rouletteDrawSource;try{app.engines[1].enablePersistence(localStorage);}catch{}select(2);"
hook="""window.__qa={chocoScaleValue,chocoSevenSegment,app,slots,select,reachContextKey,rouletteReachTiers,setCanyonDebugDepth,chocoChainSheen,openRecordMenu,closeRecordMenu,chocoBoardLayout,drawChoco,get driver(){return rouletteDriver},hold(){stopAutoRound();userPaused=true;syncPause();},resume(){userPaused=false;syncPause();stopAutoRound();}};document.querySelector('#sound').checked=false;__qa.hold();"""
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
 # Rare hues and palette/balloon geometry are measured, not just screenshot assertions.
 report=page.evaluate("""()=>{const q=__qa,colors=[];for(const rarity of [0,1,2]){const cv=document.createElement('canvas');cv.width=240;cv.height=90;const x=cv.getContext('2d');q.chocoSevenSegment(x,123456,10,10,210,60,6,rarity,1000);const pixels=x.getImageData(0,0,240,90).data;let red=0,green=0,blue=0;for(let i=0;i<pixels.length;i+=4){if(pixels[i+3]<150)continue;red+=pixels[i]>pixels[i+1]*1.3&&pixels[i]>pixels[i+2]*1.3;green+=pixels[i+1]>pixels[i]*1.3;blue+=pixels[i+2]>pixels[i+1]*1.1&&pixels[i+2]>pixels[i]*1.1;}colors.push({red,green,blue});}if(colors[1].red<100||colors[2].red<10||colors[2].green<10||colors[2].blue<10)throw Error('Rare LED hues');const palette=[...document.querySelectorAll('.tab-slot')].map(el=>getComputedStyle(el).getPropertyValue('--game-mid').trim());if(new Set(palette).size!==3)throw Error('No individual tab colors');const slots=[...document.querySelectorAll('#sugar-slots .sugar-slot')];if(slots.length!==5)throw Error('Sugar slot count');return {colors,palette,slots:slots.map(el=>({x:el.getBoundingClientRect().x,w:el.getBoundingClientRect().width}))};}""")
 for rarity in [1,2]:
  page.evaluate("""rarity=>{const q=__qa,s=q.slots[1],e=s.engine,t=s.chocoTime||0;e.totalHundredths=100;s.chocoWinTarget=3000;s.chocoAward={phase:'anticipation',from:0,target:3000,start:t,rarity};s.chocoAwardValue=0;s.chocoOreValue=0;s.chocoWinValue=0;s.chocoPayoutFlights=[];q.drawChoco(s);}""",rarity)
  page.evaluate("""()=>{for(const s of __qa.slots){const b=s.tab.querySelector('.tab-win-bubble');b.hidden=false;b.style.setProperty('display','flex','important');b.style.animation='none';b.style.opacity='1';s.tabWin.textContent='3000';}}""")
  page.screenshot(path=f'/tmp/reward-v23-{rarity}.png')
 assert not errors,errors;print('REWARD_UI_PASS',json.dumps(report));browser.close()
server.shutdown()

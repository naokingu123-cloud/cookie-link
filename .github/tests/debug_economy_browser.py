from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
import threading,json
from playwright.sync_api import sync_playwright
root=Path.cwd();html=(root/'index.html').read_text()
anchor="app=new Arcade({onEvent:recordEvent,onChange:recordChanged});app.drawSource=rouletteDrawSource;try{app.engines[1].enablePersistence(localStorage);}catch{}select(2);"
hook="""window.__qa={app,slots,select,hud,openRecordMenu,setDebugPayoutRate,debugEconomyProfile,get target(){return debugPayoutTarget},pays(){return JSON.stringify([COOKIE_ALL_CLEAR_HUNDREDTHS,BASE_TENTHS,SIX_PAY,SIX_CLEAR_BONUS,CHOCO_ORE_DISTRIBUTIONS])},hold(){stopAutoRound();userPaused=true;syncPause();}};document.querySelector('#sound').checked=false;__qa.hold();"""
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
 for width,height in [(320,568),(390,844),(1280,900)]:
  page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(f'http://127.0.0.1:{server.server_port}/',wait_until='domcontentloaded');page.wait_for_function('window.__qa');page.evaluate('__qa.openRecordMenu()')
  before=page.evaluate('__qa.pays()')
  for target in [50,150,90,150]:
   page.locator('#debug-payout-rate').fill(str(target));page.locator('#debug-payout-apply').click()
   result=page.evaluate("""()=>{const q=__qa,nums=q.app.engines[0].board.flat().filter(t=>t.number!=null).map(t=>t.number);if(nums.length!==25||new Set(nums).size!==25)throw Error('Missing/duplicate numbers');return {target:q.target,profile:q.debugEconomyProfile(),pays:q.pays()};}""")
   assert result['target']==target and result['pays']==before,result
  for invalid in ['', '49','151','90.5']:
   page.locator('#debug-payout-rate').fill(invalid);page.locator('#debug-payout-apply').click();assert page.evaluate('__qa.target')==150
  page.locator('#debug-payout-rate').fill('150');page.locator('#debug-payout-apply').click()
  page.screenshot(path=f'/tmp/debug-economy-{width}.png')
  bounds=page.evaluate("""()=>{const a=document.querySelector('#debug-payout-rate').getBoundingClientRect(),b=document.querySelector('#colors-3').getBoundingClientRect(),outer=document.querySelector('.record-menu').getBoundingClientRect();if(!(a.y<=b.y+4&&a.left>=outer.left&&a.right<=outer.right))throw Error('Control placement '+JSON.stringify({a:a.toJSON(),b:b.toJSON(),outer:outer.toJSON()}));return {rateX:a.x,rateY:a.y,colorX:b.x,colorY:b.y};}""")
  page.screenshot(path=f'/tmp/debug-economy-{width}.png')
  page.evaluate("""()=>{const q=__qa;q.app.phase='playing';q.hud(q.app);document.querySelector('#debug-payout-rate').value='50';if(q.setDebugPayoutRate()||q.target!==150)throw Error('Midgame change allowed');}""")
  assert page.locator('#debug-payout-rate').is_disabled();assert page.locator('#debug-payout-apply').is_disabled()
  page.reload(wait_until='domcontentloaded');page.wait_for_function('window.__qa');assert page.evaluate('__qa.target')==150
  assert not errors,errors;print('DEBUG_ECONOMY_UI_PASS',width,json.dumps(bounds));page.close()
 browser.close()
server.shutdown()

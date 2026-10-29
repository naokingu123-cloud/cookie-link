from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
import threading,json
from playwright.sync_api import sync_playwright
root=Path.cwd();html=(root/'index.html').read_text()
anchor="app=new Arcade({onEvent:recordEvent,onChange:recordChanged});app.drawSource=rouletteDrawSource;try{app.engines[1].enablePersistence(localStorage);}catch{}select(2);"
hook="""window.__qa={app,slots,select,reachContextKey,rouletteReachTiers,setCanyonDebugDepth,chocoChainSheen,openRecordMenu,closeRecordMenu,chocoBoardLayout,drawChoco,get driver(){return rouletteDriver},hold(){stopAutoRound();userPaused=true;syncPause();},resume(){userPaused=false;syncPause();stopAutoRound();}};document.querySelector('#sound').checked=false;__qa.hold();"""
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
 # Debug values are validated and create actual terrain at absolute depth (including exact milestones).
 depth=page.evaluate("""()=>{const q=__qa,input=document.querySelector('#canyon-debug-depth'),e=q.slots[1].engine;input.value='500';if(!q.setCanyonDebugDepth())throw Error('debug refused');if(e.depth!==500||e.startDepth!==500||!e.strata[0].every(t=>t.bonusDepth===500))throw Error('depth terrain');input.value='-1';if(q.setCanyonDebugDepth()||e.depth!==500)throw Error('negative depth accepted');input.value='490';q.setCanyonDebugDepth();if(!e.strata[10].every(t=>t.bonusDepth===500))throw Error('next bonus depth');q.app.phase='playing';input.value='900';if(q.setCanyonDebugDepth()||e.depth!==490)throw Error('mid-round mutation');q.app.phase='ready';input.value='490';q.openRecordMenu();return {depth:e.depth,bonusRow:10};}""")
 page.screenshot(path='/tmp/canyon-depth-menu.png');page.evaluate('__qa.closeRecordMenu();__qa.resume();__qa.driver.draw.state="ready"')
 # Complete glyph ring, one unbroken phrase, world-space counterclockwise progression.
 page.wait_for_function('__qa.driver.ledState.betLetters.join("").includes("BET TIME")||(__qa.driver.ledState.betLetters.join("")+__qa.driver.ledState.betLetters.join("")).includes("BET TIME")')
 frames=[]
 for _ in range(3):
  frames.append(page.evaluate('({state:__qa.driver.ledState,time:__qa.driver.physics.time,angle:__qa.driver.physics.angle})'));page.wait_for_timeout(600)
 for f in frames:
  letters=''.join(f['state']['betLetters']);assert len(letters)==25 and (letters+letters).count('BET TIME') in [1,2],letters
  i=letters.index('B');world=f['angle']-i*6.283185307179586/25;target=f['time']*.35;error=(world-target)%6.283185307179586;assert error>6.283185307179586-.27 or error<.01,(world,target,error)
 # Selected board only, including Canyon's separate reach lifecycle.
 fixture=page.evaluate("""()=>{const q=__qa,a=q.app;a.phase='playing';a.locked=[100,100,100];a.enabled=[true,true,true];a.draws=[24,25];q.driver.draw.state='complete';for(const s of q.slots){const e=s.engine;e.phase='settled';e.busy=false;e.queue=[];e.opening=false;e.transitionPending=false;e.processed=s.i===1?2:0;e.accepted=e.processed;e.drawn=new Set();e.fx=null;s.reachEpoch++;s.reachStatus='ready';s.reachBoardKey=q.reachContextKey(e,a);s.tabReachVersion=e.version;s.reachResults=s.i===0?[{number:3,tier:1},{number:4,tier:2},{number:5,tier:3}]:s.i===1?[{number:7,tier:2}]:[];}q.select(0);return [...q.rouletteReachTiers()];}""");assert fixture==[[3,1],[4,2],[5,3]],fixture
 page.wait_for_function('__qa.driver.ledState.reachTiers[4]===3&&__qa.driver.ledState.highestSlope');first=page.evaluate('__qa.driver.ledState');assert first['reachTiers'][2:5]==[1,2,3]
 page.wait_for_timeout(180);pulse=page.evaluate('__qa.driver.ledState');assert abs(first['reachColors'][0]['brightness']-pulse['reachColors'][0]['brightness'])>.01;assert [c['color'] for c in pulse['reachColors'][:2]]==['ff163b','c42bff'];page.screenshot(path='/tmp/roulette-selected-cookie.png')
 page.evaluate('__qa.select(1)');page.wait_for_function('__qa.driver.ledState.board===1&&__qa.driver.ledState.reachTiers[6]===2&&!__qa.driver.ledState.highestSlope');second=page.evaluate('__qa.driver.ledState');assert second['reachTiers'][2:5]==[0,0,0]
 page.evaluate('__qa.select(2)');page.wait_for_function('__qa.driver.ledState.board===2&&__qa.driver.ledState.reachTiers.every(n=>n===0)');page.evaluate('__qa.select(0)');page.wait_for_function('__qa.driver.ledState.board===0&&__qa.driver.ledState.reachTiers[4]===3')
 page.evaluate('__qa.app.draws.push(5)');page.wait_for_function('__qa.driver.ledState.reachTiers.every(n=>n===0)')
 # One section uses one continuous gradient, not one per cell. Clip paths share their exact edges.
 sheen=page.evaluate("""()=>{const q=__qa,cv=document.createElement('canvas');cv.width=200;cv.height=100;const x=cv.getContext('2d');let gradients=0,rects=[];const g=x.createLinearGradient.bind(x),r=x.rect.bind(x);x.createLinearGradient=(...a)=>{gradients++;return g(...a)};x.rect=(...a)=>{rects.push(a);return r(...a)};q.chocoChainSheen(x,[{id:1,x:0,y:0},{id:2,x:30,y:0},{id:3,x:60,y:0},{id:4,x:60,y:30}],30,30,1000);if(gradients!==1||rects[0][0]+rects[0][2]!==rects[1][0])throw Error('Section seam');return {gradients,rects};}""")
 page.evaluate('__qa.select(1);__qa.hold();__qa.drawChoco(__qa.slots[1])');page.screenshot(path='/tmp/canyon-all-position.png')
 page.evaluate('__qa.resume();__qa.driver.draw.select("jpc")');page.wait_for_function('__qa.driver.ledState.label==="0/70"');page.evaluate('__qa.hold()')
 assert not errors,errors;print('SELECTED_ROULETTE_PASS',json.dumps({'debug':depth,'boards':[first['board'],second['board'],2],'tiers':[first['reachTiers'],second['reachTiers']],'betFrames':len(frames),'section':sheen}),flush=True);browser.close()
server.shutdown()

from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
import threading,json
from playwright.sync_api import sync_playwright
root=Path.cwd();html=(root/'index.html').read_text();anchor='setupManualNumbers();'
# Add hooks only to the test response; keep the production script encapsulated.
hook='''window.__j={app,activateGameAudio,startReadyRound,debugResetRound,get tracks(){return bgmTracks},get selected(){return queuedGameBgm},toggleJpcMode,restartJpcRound,paintJpcDashboard,syncJpcBgm,jpcBgmFile,stopJpcTicker,stopAutoRound,get driver(){return rouletteDriver},get ready(){return rouletteReady},get player(){return bgmPlayer},get role(){return bgmRole},get context(){return audio},get session(){return jpcSession},pause(v){userPaused=v;syncPause();},freeze(){stopAutoRound();autoRoundRemaining=3600000;},stopBgm};'''
assert html.count(anchor)==1;html=html.replace(anchor,anchor+hook)
class H(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(root),**kw)
 def log_message(self,*a):pass
 def do_GET(self):
  try:
   if self.path.split('?')[0]=='/':
    b=html.encode();self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Content-Length',str(len(b)));self.end_headers();self.wfile.write(b)
   else:super().do_GET()
  except (BrokenPipeError,ConnectionResetError):pass
server=ThreadingHTTPServer(('127.0.0.1',0),H);threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'])
 page=b.new_page(viewport={'width':430,'height':932});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(f'http://127.0.0.1:{server.server_port}/?demo=1',wait_until='domcontentloaded');page.wait_for_function('window.__j?.ready',timeout=45000)
 page.evaluate("__j.freeze();document.querySelector('#sound').checked=true;__j.toggleJpcMode();__j.stopJpcTicker();__j.driver.setPaused(true)")
 page.wait_for_function("__j.role==='jpc'&&!__j.player.paused&&__j.player.currentTime>.05",timeout=20000)
 initial=page.evaluate('__j.driver.draw.state');print('JPC_STARTED',initial,flush=True)
 snapshots=[]
 for ball,track in [(1,1),(20,1),(21,2),(40,2),(41,3),(60,3),(61,4),(70,4)]:
  page.evaluate('(n)=>{__j.driver.physics.serial=n;__j.paintJpcDashboard()}',ball)
  page.wait_for_function('(s)=>__j.player.getAttribute("src")===s&&!__j.player.paused&&__j.player.readyState>=2',arg=f'assets/audio/jpc-{track}.mp3',timeout=20000)
  snapshots.append([ball,page.evaluate('__j.player.getAttribute("src")')])
 # A poll in the same range must not reset playback.
 page.wait_for_function('__j.player.currentTime>.15');before=page.evaluate('__j.player.currentTime');page.evaluate('__j.paintJpcDashboard()');assert page.evaluate('__j.player.currentTime')>=before-.05
 page.evaluate('for(let n=1;n<=24;n++)__j.driver.physics.onHit({pocket:n,time:0});__j.paintJpcDashboard()')
 page.wait_for_function("__j.player.getAttribute('src').endsWith('jpc-reach.mp3')&&!__j.player.paused",timeout=15000)
 page.evaluate('__j.driver.physics.serial=21;__j.paintJpcDashboard()');assert page.evaluate('__j.jpcBgmFile()').endswith('jpc-reach.mp3')
 page.wait_for_function('__j.player.currentTime>.15');before=page.evaluate('__j.player.currentTime');page.evaluate('__j.pause(true)');assert page.evaluate('__j.player.paused')
 page.evaluate('__j.pause(false);__j.driver.setPaused(true)');page.wait_for_function('!__j.player.paused');assert page.evaluate('__j.player.currentTime')>=before-.05
 page.evaluate("document.querySelector('#sound').checked=false;document.querySelector('#sound').onchange();__j.paintJpcDashboard()");assert page.evaluate('__j.player.paused')
 page.evaluate("document.querySelector('#sound').checked=true;document.querySelector('#sound').onchange()")
 page.wait_for_function("__j.role==='jpc'&&!__j.player.paused")
 page.evaluate('__j.driver.physics.onHit({pocket:25,time:0});__j.paintJpcDashboard()');assert page.evaluate("__j.player.paused&&__j.role==='none'")
 page.evaluate('__j.restartJpcRound();__j.stopJpcTicker();__j.driver.setPaused(true)')
 page.wait_for_function("__j.player.getAttribute('src').endsWith('jpc-1.mp3')&&!__j.player.paused")
 page.evaluate("__j.driver.draw.state='complete';__j.paintJpcDashboard()");assert page.evaluate('__j.player.paused')
 page.evaluate('__j.toggleJpcMode();__j.freeze()')
 page.wait_for_function("__j.role==='bet'",timeout=15000);assert not page.evaluate('__j.session.active')
 # All uploaded tracks decode, have safe loop bounds, and use a bounded cache.
 metadata=page.evaluate("fetch('assets/audio/bgm-loops.json').then(r=>r.json())")
 assert len(metadata)==25 and page.evaluate('__j.tracks.length')==20
 for src in metadata:
  v=page.evaluate('''async(src)=>{const p=__j.player,v=await p.prepare(src),sr=v.buffer.sampleRate,e=Math.round(v.points.end*sr),s=Math.round(v.points.start*sr);let max=0;for(let c=0;c<v.buffer.numberOfChannels;c++){const d=v.buffer.getChannelData(c);max=Math.max(max,Math.abs(d[e-1]-d[s-1]));}return {start:v.points.start,end:v.points.end,duration:v.buffer.duration,seam:max,cache:p._cache.size};}''',src)
  assert 0<v['start']<v['end']<=v['duration'] and v['seam']<.00001 and v['cache']<=2,(src,v)
 print('ALL_25_LOOP_BUFFERS_DECODED_SEAMS_VERIFIED',flush=True)
 # A real normal game keeps its randomly selected vocal track through the loop.
 page.evaluate('__j.freeze();__j.activateGameAudio({gesture:true})')
 page.wait_for_function("__j.role==='bet'&&!__j.player.paused")
 selected=page.evaluate('__j.selected');assert selected in page.evaluate('__j.tracks')
 page.evaluate('__j.startReadyRound();__j.driver.setPaused(true)')
 page.wait_for_function("__j.role==='game'&&__j.player.currentTime>.1",timeout=20000)
 assert page.evaluate('__j.player.src')==selected
 page.evaluate('''async()=>{const p=__j.player;p.currentTime=p._points.end-.08;await p.play();window.__loopNode=p._source;window.__loopEnd=p._points.end;window.__loopStart=p._points.start;}''')
 page.wait_for_timeout(250)
 assert page.evaluate('__j.player._source===__loopNode&&__j.player.currentTime>=__loopStart&&__j.player.currentTime<__loopEnd-1')
 assert page.evaluate('__j.player.src')==selected
 page.evaluate('__j.pause(true)');before=page.evaluate('__j.player.currentTime');page.wait_for_timeout(150);assert abs(page.evaluate('__j.player.currentTime')-before)<.001
 page.evaluate('__j.pause(false);__j.driver.setPaused(true)');page.wait_for_function('!__j.player.paused')
 page.evaluate('__j.debugResetRound();__j.freeze();__j.activateGameAudio({gesture:true})');page.wait_for_function("__j.role==='bet'&&!__j.player.paused")
 assert page.evaluate('__j.selected')!=selected
 print('NORMAL_RANDOM_STABLE_SAMPLE_CLOCK_LOOP_PAUSE_RESET_PASS',flush=True)
 assert not errors,errors
 print('JPC_BGM_PASS',json.dumps({'boundaries':snapshots,'reachPriority':True,'pauseResume':True,'muteResume':True,'jackpotStop':True,'restart':True,'completeStop':True,'normalReturn':True,'errors':errors}),flush=True)
 b.close()
server.shutdown()

from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
import threading,json
from playwright.sync_api import sync_playwright
root=Path.cwd();html=(root/'index.html').read_text();anchor='setupManualNumbers();'
hook='''window.__se={app,slots,unlock,prepareSceneSounds,sceneSound,SCENE_SOUND_KEYS,stopSounds,chocoEvent,chocoScaleValue,chocoPayoutFlightProgress,sixCandyAudio,chocoRockAudio,get buffers(){return sfxBuffers},get voices(){return sfxVoices},get gain(){return bgmGain},get audio(){return audio},select,freeze(){stopAutoRound();autoRoundRemaining=3600000;},pause(v){userPaused=v;syncPause();}};'''
assert html.count(anchor)==1;html=html.replace(anchor,anchor+hook)
class H(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(root),**kw)
 def log_message(self,*a):pass
 def do_GET(self):
  try:
   if self.path.split('?')[0]=='/':
    b=html.encode();self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.end_headers();self.wfile.write(b)
   else:super().do_GET()
  except (BrokenPipeError,ConnectionResetError):pass
server=ThreadingHTTPServer(('127.0.0.1',0),H);threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
 page=b.new_page(viewport={'width':1280,'height':900});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(f'http://127.0.0.1:{server.server_port}/?demo=1',wait_until='domcontentloaded');page.wait_for_function('window.__se');
 result=page.evaluate('''async()=>{
  const q=__se;q.freeze();document.querySelector('#sound').checked=true;await q.unlock();await q.prepareSceneSounds();q.pause(false);q.app.phase='playing';
  const keys=q.SCENE_SOUND_KEYS,gain=q.gain?.gain.value;
  for(const key of keys){const buf=q.buffers.get('scene-'+key);if(!buf||buf.duration<=0||!buf.getChannelData(0).some(v=>Math.abs(v)>.01))throw Error('Missing '+key);q.stopSounds();q.sceneSound(key);if(![...q.voices].some(v=>v.source.buffer===buf))throw Error('Playback '+key);}
  q.stopSounds();q.chocoRockAudio(3);if(![...q.voices].every(v=>v.source.buffer===q.buffers.get('scene-stratum')))throw Error('Stratum routing');
  for(const [kind,key] of Object.entries({glass:'glass',fall:'landing',triangle:'triangle',hexagon:'hexagon',refill:'refill',pop:'pop',break:'candy'})){q.stopSounds();q.sixCandyAudio(kind,2);if(![...q.voices].some(v=>v.source.buffer===q.buffers.get('scene-'+key)))throw Error('Six routing '+kind);}
  if(q.gain?.gain.value!==gain)throw Error('BGM gain changed');
  q.stopSounds();document.querySelector('#sound').checked=false;q.sceneSound('bonus');if(q.voices.size)throw Error('Mute');document.querySelector('#sound').checked=true;q.pause(true);q.sceneSound('ore');if(q.voices.size)throw Error('Pause');q.pause(false);
  q.select(1);const s=q.slots[1],e=s.engine;e.version++;e.totalHundredths=0;e.cart=[];e.fx=null;q.chocoScaleValue(s,e,100,0);
  e.totalHundredths=300;e.cart=[{id:99,item:'ore'}];e.fx={phase:'canyonCollect',cartStart:0,ms:1000,elapsed:0,gain:300,items:[{tile:e.cart[0],gain:300,r:2,c:3}]};q.chocoScaleValue(s,e,100,0);q.chocoScaleValue(s,e,100,650);q.chocoScaleValue(s,e,100,2810);
  e.totalHundredths=600;e.cart.push({id:100,item:'ore'});e.fx={phase:'canyonCollect',cartStart:1,ms:1000,elapsed:0,gain:300,items:[{tile:e.cart[1],gain:300,r:2,c:4}]};q.chocoScaleValue(s,e,100,3000);q.chocoScaleValue(s,e,100,3650);const f=s.chocoPayoutFlights.at(-1);if(!f.held||q.chocoPayoutFlightProgress(f,4000,s)!==.85||s.chocoLandedCart.has(1))throw Error('Crane not held');
  q.chocoScaleValue(s,e,100,4810);if(s.chocoAwardValue!==0||s.chocoLandedCart.has(1))throw Error('Transfer completion');q.chocoScaleValue(s,e,100,4970);if(!s.chocoLandedCart.has(1))throw Error('Crane release');q.chocoScaleValue(s,e,100,10000);if(s.chocoWinValue!==600||s.chocoAwardValue!==0)throw Error('Final total');
  q.stopSounds();q.pause(true);return {effects:keys.length,musicGain:gain,craneHold:true,transferTotal:600};
 }''');assert not errors,errors;print('SCENE_AUDIO_AND_SCALE_PASS',json.dumps(result));b.close()
server.shutdown()

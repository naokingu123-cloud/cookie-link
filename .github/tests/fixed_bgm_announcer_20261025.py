from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
import threading,json,wave,array,hashlib,math
from playwright.sync_api import sync_playwright
root=Path.cwd();s=(root/'index.html').read_text()
anchor='app=new Arcade({onEvent:recordEvent,onChange:recordChanged});app.drawSource=rouletteDrawSource;select(0);'
assert s.count(anchor)==1
hook=r'''window.__v={app,slots,announceDraw,recordChanged,prepareAnnouncer,stopNumberAnnouncements,activateGameAudio,startReadyRound,debugResetRound,stopAutoRound,beginBgm,fadeBgm,stopBgm,toggleJpcMode,paintJpcDashboard,openRecordMenu,closeRecordMenu,get context(){return audio},get player(){return bgmPlayer},get gain(){return bgmGain},get level(){return bgmLevel},get role(){return bgmRole},get ready(){return rouletteReady},get driver(){return rouletteDriver},get busy(){return numberVoiceBusy},get queue(){return numberVoiceQueue.map(j=>j.number)},get buffers(){return numberVoiceBuffers},get bus(){return numberVoiceBus},get counter(){return announcedDrawCount},get jpc(){return jpcSession},freeze(){stopAutoRound();autoRoundRemaining=3600000},resume(){userPaused=false;syncPause();stopAutoRound()},get state(){return {phase:app.phase,token:app.token,role:bgmRole,level:bgmLevel,paused:bgmPlayer.paused,context:audio?.state,busy:numberVoiceBusy?.number,queued:numberVoiceQueue.map(j=>j.number)}}};'''
html=s.replace(anchor,anchor+hook)
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(root),**kw)
 def log_message(self,*a):pass
 def do_GET(self):
  try:
   if self.path.split('?')[0] in ['/','/index.html']:
    b=html.encode();self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Content-Length',str(len(b)));self.end_headers();self.wfile.write(b)
   else:super().do_GET()
  except (BrokenPipeError,ConnectionResetError):pass
manifest=json.loads(Path('assets/audio/numbers/manifest.json').read_text())
assert len(manifest['clips'])==25
for c in manifest['clips']:
 f=Path('assets/audio/numbers')/c['file'];b=f.read_bytes();assert hashlib.sha256(b).hexdigest()==c['sha256']
 assert c['text']==str(c['number'])+'番です。'
 with wave.open(str(f),'rb') as w:
  assert w.getframerate()==24000 and w.getnchannels()==1 and w.getsampwidth()==2
  samples=array.array('h',w.readframes(w.getnframes()));assert .45<len(samples)/24000<2.5
  assert .04<math.sqrt(sum(x*x for x in samples)/len(samples))/32768<.2
print('25_JAPANESE_NUMBER_ASSETS_AND_LICENSE_OK',flush=True)
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'])
 ctx=browser.new_context(viewport={'width':430,'height':932},is_mobile=True,has_touch=True)
 page=ctx.new_page();errors=[];page.on('pageerror',lambda e:(errors.append(str(e)),print('PAGE_ERROR',str(e),flush=True)))
 try:
  page.goto(f'http://127.0.0.1:{server.server_port}/index.html',wait_until='domcontentloaded');page.wait_for_function('window.__v?.ready',timeout=30000)
  page.evaluate('__v.freeze();__v.resume();document.querySelector("#sound").checked=true;__v.activateGameAudio({gesture:true})')
  page.wait_for_function("__v.role==='bet'&&!__v.player.paused&&__v.context?.state==='running'",timeout=25000)
  assert page.evaluate('__v.prepareAnnouncer()')
  assert page.evaluate('__v.buffers.size')==25
  page.evaluate(r'''()=>{
   window.__voiceStarts=[];window.__speechCalls=0;window.__gainSamples=[];window.__voicePeak=0;
   if(window.speechSynthesis)speechSynthesis.speak=()=>{window.__speechCalls++;throw Error('Browser TTS must not be used');};
   const q=__v,original=q.context.createBufferSource.bind(q.context);
   q.context.createBufferSource=()=>{const src=original(),start=src.start.bind(src);src.start=(...args)=>{
    for(const [number,buffer] of q.buffers)if(src.buffer===buffer){window.__voiceStarts.push({number,time:q.context.currentTime,round:q.app.token});break;}
    return start(...args);
   };return src;};
  }''')
  assert page.evaluate('(()=>{const ok=__v.startReadyRound();__v.driver.setPaused(true);return ok;})()')
  page.wait_for_function("__v.role==='game'&&!__v.player.paused&&__v.player.currentTime>.05",timeout=25000)
  print('BET_FADE_GAME_BGM_OK',page.evaluate('__v.state'),flush=True)
  page.evaluate(r'''()=>{window.__gainSampler=setInterval(()=>{const q=__v;__gainSamples.push({level:q.level,gain:q.gain.gain.value,role:q.role});if(q.bus){if(!window.__analyser){window.__analyser=q.context.createAnalyser();q.bus.connect(__analyser);}const data=new Float32Array(__analyser.fftSize);__analyser.getFloatTimeDomainData(data);let power=0;for(const x of data)power+=x*x;__voicePeak=Math.max(__voicePeak,Math.sqrt(power/data.length));}},20);}''')
  accepted=page.evaluate('(()=>{const q=__v;return [12,4,25].map(n=>q.app.acceptNumber(n,q.app.token));})()')
  assert all(accepted),accepted
  page.wait_for_function('__voiceStarts.length===3&&!__v.busy&&!__v.queue.length',timeout=15000)
  data=page.evaluate('(()=>{clearInterval(__gainSampler);return {starts:__voiceStarts,gains:__gainSamples,peak:__voicePeak,speech:__speechCalls,counter:__v.counter};})()')
  assert [x['number'] for x in data['starts']]==[12,4,25],data
  assert data['peak']>.01 and data['speech']==0 and data['counter']==3,data
  assert len(data['gains'])>5 and all(abs(x['level']-.075)<1e-7 and abs(x['gain']-.075)<1e-6 and x['role']=='game' for x in data['gains']),data['gains']
  assert page.evaluate('__v.player.currentTime')>.2
  print('REAL_ARRIVALS_12_4_25_ORDER_WAVEFORM_CONSTANT_BGM_OK',{'starts':data['starts'],'peak':data['peak'],'gain_samples':len(data['gains'])},flush=True)
  # Mute clears voices but does not rewind the arrival cursor or reannounce old balls.
  count=page.evaluate('__voiceStarts.length')
  page.evaluate("document.querySelector('#sound').checked=false;document.querySelector('#sound').onchange();__v.recordChanged(__v.app);document.querySelector('#sound').checked=true;document.querySelector('#sound').onchange();__v.recordChanged(__v.app);")
  page.wait_for_function("__v.role==='game'&&!__v.player.paused",timeout=20000);page.wait_for_timeout(400)
  assert page.evaluate('__voiceStarts.length')==count and page.evaluate('__v.counter')==3
  # Stop speech and a queued number during reset; the next game must start cleanly.
  page.evaluate('__v.announceDraw(6);__v.announceDraw(8)');page.wait_for_function('__v.busy?.source!=null',timeout=5000)
  page.evaluate('__v.debugResetRound();__v.freeze();__v.activateGameAudio({gesture:true})')
  assert page.evaluate('!__v.busy&&__v.queue.length===0')
  old_count=page.evaluate('__voiceStarts.length');page.wait_for_timeout(500)
  assert page.evaluate('__voiceStarts.length')==old_count
  page.wait_for_function("__v.role==='bet'&&!__v.player.paused",timeout=20000)
  for repeat in range(2):
   assert page.evaluate('(()=>{const ok=__v.startReadyRound();__v.driver.setPaused(true);return ok;})()')
   page.wait_for_function("__v.role==='game'&&!__v.player.paused",timeout=25000)
   page.evaluate('__v.app.acceptNumber(7,__v.app.token)');page.wait_for_function('__v.busy?.source!=null',timeout=5000)
   assert page.evaluate('__voiceStarts.at(-1).number')==7
   page.evaluate('__v.debugResetRound();__v.freeze();__v.activateGameAudio({gesture:true})');page.wait_for_function("__v.role==='bet'&&!__v.player.paused",timeout=20000)
  print('MUTE_NO_OLD_REPLAY_RESET_QUEUE_AND_NEXT_GAMES_OK',flush=True)
  # JPC arrivals use the same fixed-gain announcement player, including repeated pockets.
  page.evaluate('__v.toggleJpcMode();__v.driver.setPaused(true)')
  assert page.evaluate('__v.jpc.active')
  n=page.evaluate('__voiceStarts.length')
  page.evaluate("(()=>{const q=__v,d=q.driver;for(const pocket of [14,14]){const hit={pocket,id:100+d.physics.hits.length,time:d.physics.time};d.physics.hits.push(hit);d.physics.onHit(hit);}q.paintJpcDashboard();})()")
  page.wait_for_function('(n)=>__voiceStarts.length===n+2&&!__v.busy',arg=n,timeout=12000)
  assert page.evaluate('__voiceStarts.slice(-2).map(x=>x.number)')==[14,14]
  page.evaluate('__v.toggleJpcMode();__v.freeze();__v.activateGameAudio({gesture:true})');page.wait_for_function("__v.role==='bet'&&!__v.player.paused",timeout=20000)
  page.evaluate('__v.openRecordMenu()')
  assert page.locator('#number-voice-credit a').count()==1
  page.evaluate('__v.closeRecordMenu();__v.freeze()')
  assert not errors,errors
  print('JPC_REPEAT_POCKETS_RETURN_AND_MENU_CREDITS_OK',flush=True)
  Path('announcer-verification.json').write_text(json.dumps({'clips':25,'gain':.075,'voice_rms_peak':data['peak'],'order':[x['number'] for x in data['starts']],'gain_samples':len(data['gains']),'errors':errors,'iphone_listening_test':False},indent=2))
  print('ALL_FIXED_BGM_ANNOUNCER_TESTS_PASSED',flush=True)
 finally:browser.close();server.shutdown()

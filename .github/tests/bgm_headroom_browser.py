from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
import threading,json
from playwright.sync_api import sync_playwright
root=Path.cwd();html=(root/'index.html').read_text();anchor='setupManualNumbers();'
# Add hooks only to the test response; keep the production script encapsulated.
hook='''window.__j={app,recordChanged,get outputLevels(){return [SFX_OUTPUT_LEVEL,NUMBER_OUTPUT_LEVEL]},playArrivalSound,prepareSceneSounds,stopSounds,get effectVoices(){return sfxVoices},boundedAudioOutput,prepareArrival,prepareHammerImpact,loadNumberVoice,get audio(){return audio},get gain(){return bgmGain},announceDraw,get voiceBusy(){return numberVoiceBusy},get voiceQueue(){return numberVoiceQueue},activateGameAudio,startReadyRound,debugResetRound,get tracks(){return bgmTracks},get selected(){return queuedGameBgm},toggleJpcMode,restartJpcRound,paintJpcDashboard,syncJpcBgm,jpcBgmFile,stopJpcTicker,stopAutoRound,get driver(){return rouletteDriver},get ready(){return rouletteReady},get player(){return bgmPlayer},get role(){return bgmRole},get context(){return audio},get session(){return jpcSession},pause(v){userPaused=v;syncPause();},freeze(){stopAutoRound();autoRoundRemaining=3600000;},stopBgm};'''
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
 result=page.evaluate("""async()=>{
 const q=__j,music=(await q.player.prepare(q.tracks[0])).buffer,arrival=await q.prepareArrival(),hammer=await q.prepareHammerImpact(),voice=await q.loadNumberVoice(14);
 await q.prepareSceneSounds();q.stopSounds();q.playArrivalSound();const jpcArrivalGain=[...q.effectVoices].at(-1).gain.gain.value;if(Math.abs(jpcArrivalGain-.045)>1e-6)throw Error('JPC arrival gain');
 async function render(bounded,withMusic,withEffects){
  const ctx=new OfflineAudioContext(2,44100*3,44100);
  function play(buffer,to,when=0,offset=0){const src=ctx.createBufferSource();src.buffer=buffer;src.connect(to);src.start(when,offset);}
  if(withMusic){const g=ctx.createGain();g.gain.value=.15;g.connect(ctx.destination);play(music,g,0,15);}
  if(withEffects){const bus=ctx.createGain(),lim=ctx.createDynamicsCompressor();bus.gain.value=1.35;lim.threshold.value=-10;lim.knee.value=12;lim.ratio.value=4;lim.attack.value=.003;lim.release.value=.13;bus.connect(lim);if(bounded)q.boundedAudioOutput(ctx,lim,.28,{level:q.outputLevels[0]});else lim.connect(ctx.destination);
   const vg=ctx.createGain();vg.gain.value=.95;if(bounded)q.boundedAudioOutput(ctx,vg,.22,{level:q.outputLevels[1]});else vg.connect(ctx.destination);
   for(let i=0;i<8;i++)play(hammer,bus,.5+i*.005);for(let i=0;i<4;i++)play(arrival,bus,.52+i*.02);play(voice,vg,.5);
  }
  return ctx.startRendering();
 }
 const [before,after,effects,onlyMusic]=await Promise.all([render(false,true,true),render(true,true,true),render(true,false,true),render(true,true,false)]);
 let oldPeak=0,newPeak=0,residualError=0,reference=0,clipped=0;
 for(let c=0;c<2;c++){const a=before.getChannelData(c),b=after.getChannelData(c),e=effects.getChannelData(c),m=onlyMusic.getChannelData(c);for(let i=0;i<a.length;i++){oldPeak=Math.max(oldPeak,Math.abs(a[i]));newPeak=Math.max(newPeak,Math.abs(b[i]));if(Math.abs(a[i])>1)clipped++;residualError=Math.max(residualError,Math.abs((b[i]-e[i])-m[i]));reference=Math.max(reference,Math.abs(m[i]));}}
 return {jpcArrivalGain,oldPeak,newPeak,oldOverFullScaleSamples:clipped,musicResidualError:residualError,musicPeak:reference,gain:q.gain.gain.value};
 }""")
 assert result['newPeak']<.25 and result['musicResidualError']<1e-6 and abs(result['gain']-.15)<1e-6,result
 # Simulate real result callbacks while the normal music transport is playing.
 page.evaluate('__j.toggleJpcMode();__j.freeze();__j.activateGameAudio({gesture:true})')
 page.wait_for_function("__j.role==='bet'&&!__j.player.paused")
 page.evaluate('__j.startReadyRound();__j.driver.setPaused(true)')
 page.wait_for_function("__j.role==='game'&&__j.player.currentTime>.1")
 for phase in ['playing','result','paying','complete']:
  page.evaluate('(phase)=>{__j.app.phase=phase;__j.recordChanged(__j.app);__j.playArrivalSound();}',phase)
  page.wait_for_timeout(1000)
  assert page.evaluate("!__j.player.paused&&Math.abs(__j.gain.gain.value-.15)<1e-6"),phase
 print('PLAY_RESULT_PAYOUT_COMPLETE_CONSTANT_MUSIC_PASS',flush=True)
 assert not errors,errors
 print('MIX_HEADROOM_AND_UNCHANGED_MUSIC_PASS',json.dumps(result),flush=True)
 b.close()
server.shutdown()

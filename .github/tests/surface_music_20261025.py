from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import threading,json,math,hashlib,time,os
from playwright.sync_api import sync_playwright
root=Path.cwd();s=(root/'index.html').read_text();anchor='app=new Arcade({onEvent:recordEvent,onChange:recordChanged});app.drawSource=rouletteDrawSource;select(0);'
assert s.count(anchor)==1
hook=r'''window.__qa={app,slots,Engine,Arcade,showLinks,renderChain,select,beginBgm,fadeBgm,stopBgm,activateGameAudio,startReadyRound,debugResetRound,queueRoundBgm,stopAutoRound,syncPause,toggleJpcMode,playArrivalSound,playHammerImpact,get driver(){return rouletteDriver},get ready(){return rouletteReady},get audio(){return audio},get player(){return bgmPlayer},get gain(){return bgmGain},get role(){return bgmRole},get level(){return bgmLevel},get transition(){return !!bgmTransition},get selected(){return queuedGameBgm},get tracks(){return bgmTracks},get bet(){return BET_BGM_FILE},get betDuration(){return BET_DURATION_MS},get preparing(){return audioPreparing},get diagnostic(){return {phase:app.phase,token:app.token,paused:app.paused,inView,hidden:document.hidden,userPaused,menuOpen,roundStarting,debugResetting,rouletteReady,bets:app.bets,role:bgmRole,epoch:audioRoundEpoch,serial:bgmTransitionSerial,transition:bgmTransition?{elapsed:bgmTransition.elapsed,stamp:bgmTransition.stamp}:null,level:bgmLevel,preparing:audioPreparing,attempt:audioAttempt,needsGesture:audioNeedsGesture,state:audio?.state,source:bgmPlayer.getAttribute('src'),time:bgmPlayer.currentTime,playerPaused:bgmPlayer.paused,mediaState:bgmPlayer.readyState,mediaError:bgmPlayer.error?.message,drawError:app.drawError}},get soundReady(){return !!arrivalBuffer&&!!hammerImpactBuffer},hold(){userPaused=true;syncPause();stopAutoRound()},resume(){userPaused=false;syncPause();stopAutoRound()},freezeRounds(){stopAutoRound();autoRoundRemaining=3600000}};'''
html=s.replace(anchor,anchor+hook)
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(root),**kw)
 def log_message(self,*a):pass
 def do_GET(self):
  try:
   if self.path.split('?')[0] in ['/','/index.html']:
    b=html.encode();self.send_response(200);self.send_header('Content-Type','text/html;charset=utf-8');self.send_header('Content-Length',str(len(b)));self.end_headers();self.wfile.write(b)
   else:super().do_GET()
  except (BrokenPipeError,ConnectionResetError):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
out=Path('qa-previews');out.mkdir(exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'])
 ctx=browser.new_context(viewport={'width':430,'height':932},is_mobile=True,has_touch=True)
 page=ctx.new_page();errors=[];page.on('pageerror',lambda e:(errors.append(str(e)),print('PAGE_ERROR',str(e),flush=True)))
 page.goto(f'http://127.0.0.1:{server.server_port}/index.html',wait_until='domcontentloaded');page.wait_for_function('window.__qa?.ready',timeout=30000);page.evaluate('__qa.freezeRounds()');page.evaluate('document.fonts.ready');page.wait_for_timeout(1000)
 print('LOADED',errors,flush=True)
 q=page.evaluate(r'''(()=>{const q=__qa,c=q.driver.scene.getObjectByName('Round central JPC LCD'),col=[];q.driver.scene.traverse(o=>{if(/column/i.test(o.name))col.push(o.name)});const a=document.querySelector('.a8-stage').getBoundingClientRect(),b=document.querySelector('.roulette-info-strip').getBoundingClientRect();return {pos:c.position.toArray(),rotation:c.rotation.x,tower:col,caption:getComputedStyle(document.querySelector('.roulette-caption')).display,speedParent:document.querySelector('#roulette-speed').parentElement.id,stageBottom:a.bottom,stripTop:b.top,slotTransform:getComputedStyle(document.querySelector('#sugar-slots')).transform,hex:[...document.querySelectorAll('.sugar-step-frame')].map(el=>[el.viewBox.baseVal.width,el.viewBox.baseVal.height]),led:q.driver.ledState,bet:q.betDuration}})()''')
 assert q['pos'][0]==q['pos'][2]==0 and abs(q['rotation']+math.pi/2)<1e-8 and not q['tower'];assert q['caption']=='none' and q['speedParent']=='debug-tools';assert q['stageBottom']<=q['stripTop']+2;assert q['slotTransform']=='none';assert len(q['hex'])==5 and all(abs(a/b-math.sqrt(3)/2)<1e-5 for a,b in q['hex']);assert q['bet']==20000
 page.screenshot(path=str(out/'bet_430.png'));print('GEOMETRY_HEX_DEBUG_OK',q,flush=True)
 # BGM can start on a regular user gesture. No modal or confirmation controls.
 page.evaluate('__qa.resume()');page.evaluate('document.querySelector("#sound").checked=true;__qa.activateGameAudio({gesture:true})')
 page.wait_for_function("__qa.role==='bet'&&!__qa.player.paused&&__qa.audio?.state==='running'&&__qa.soundReady",timeout=20000)
 print('BET_AUDIO_OK',page.evaluate('({src:__qa.player.getAttribute("src"),time:__qa.player.currentTime,level:__qa.level})'),flush=True)
 page.evaluate('''()=>{window.__fadeSample=null;window.__fadeStarted=__qa.startReadyRound();__qa.driver.setPaused(true);const probe=()=>{if(__qa.role==='transition'&&__qa.level<.074&&__qa.level>.001){window.__fadeSample={role:__qa.role,level:__qa.level,src:__qa.player.getAttribute('src')};return;}if(__qa.role!=='game')setTimeout(probe,15);};setTimeout(probe,15);}''')
 try:page.wait_for_function('window.__fadeSample!==null',timeout=15000)
 except Exception:
  print('FAILED_FADE',page.evaluate('__qa.diagnostic'),page.evaluate('window.__fadeStarted'),errors,flush=True);raise
 mid=page.evaluate('window.__fadeSample');print('BET_FADE_MID',mid,flush=True)
 assert mid['role']=='transition' and mid['level']<.075 and 'bet-time' in mid['src']
 page.wait_for_function("__qa.role==='game'&&!__qa.player.paused&&__qa.player.currentTime>.1",timeout=15000)
 assert page.evaluate('__qa.tracks.includes(__qa.player.getAttribute("src"))');print('GAME_AUDIO_RANDOM_OK',page.evaluate('({src:__qa.player.getAttribute("src"),time:__qa.player.currentTime,level:__qa.level})'),flush=True)
 # Abort in the middle of the BET fade: the old fade may not switch or stop the next BET.
 page.evaluate('__qa.debugResetRound();__qa.freezeRounds();__qa.activateGameAudio({gesture:true})');page.wait_for_function("__qa.role==='bet'&&!__qa.player.paused")
 page.evaluate('(()=>{const ok=__qa.startReadyRound();__qa.driver.setPaused(true);return ok;})()');page.wait_for_timeout(180);page.evaluate('__qa.debugResetRound();__qa.freezeRounds();__qa.activateGameAudio({gesture:true})');page.wait_for_timeout(1500)
 assert page.evaluate("__qa.app.phase==='ready'&&__qa.role==='bet'&&!__qa.player.paused&&__qa.player.getAttribute('src')===__qa.bet")
 print('RESET_DURING_FADE_OK',flush=True)
 choices=[]
 for k in range(3):
  choices.append(page.evaluate('__qa.selected'));print('BEFORE_REPEAT',k,page.evaluate('__qa.diagnostic'),flush=True);started=page.evaluate('(()=>{const ok=__qa.startReadyRound();__qa.driver.setPaused(true);return ok;})()');print('STARTED_REPEAT',k,started,page.evaluate('__qa.diagnostic'),flush=True)
  try:page.wait_for_function("__qa.role==='game'&&!__qa.player.paused&&__qa.player.currentTime>.08",timeout=20000)
  except Exception:
   print('FAILED_REPEAT',k,page.evaluate('__qa.diagnostic'),errors,flush=True);raise
  print('AFTER_REPEAT',k,page.evaluate('__qa.diagnostic'),flush=True)
  page.evaluate('__qa.debugResetRound();__qa.freezeRounds();__qa.activateGameAudio({gesture:true})');page.wait_for_function("__qa.role==='bet'&&!__qa.player.paused")
 assert all(a!=b for a,b in zip(choices,choices[1:]));print('REPEATED_ROUNDS_AND_NONREPEATING_TRACKS_OK',choices,flush=True)
 # Muting during the BET fade must restore the game track, not the BET track.
 page.evaluate('(()=>{const ok=__qa.startReadyRound();__qa.driver.setPaused(true);return ok;})()');page.wait_for_function("__qa.role==='transition'",timeout=15000)
 page.evaluate("const b=document.querySelector('#sound');b.checked=false;b.onchange();b.checked=true;b.onchange();")
 page.wait_for_function("__qa.role==='game'&&!__qa.player.paused&&__qa.tracks.includes(__qa.player.getAttribute('src'))",timeout=15000)
 page.evaluate('__qa.debugResetRound();__qa.freezeRounds()')
 page.evaluate("const b=document.querySelector('#sound');b.checked=false;b.onchange();b.checked=true;b.onchange();")
 page.wait_for_function("__qa.role==='bet'&&!__qa.player.paused&&__qa.player.getAttribute('src')===__qa.bet",timeout=15000)
 print('SOUND_TOGGLE_DURING_FADE_AND_BET_OK',flush=True)
 page.evaluate('__qa.driver.setPaused(false)')
 # Stage transitions are sampled in the real renderer; no abrupt text/color update.
 page.evaluate("__qa.app.phase='playing';__qa.driver.draw.state='running';__qa.driver.draw.next=Infinity;__qa.driver.draw.displayGroup=0")
 page.wait_for_function("__qa.driver.ledState.stage==='1st BALLS'&&__qa.driver.ledState.centerBlend===1",timeout=10000)
 page.evaluate('__qa.driver.draw.displayGroup=4');page.wait_for_function("__qa.driver.ledState.stage==='FINAL BALL'&&__qa.driver.ledState.centerBlend<1",timeout=10000)
 blend=page.evaluate('__qa.driver.ledState');assert blend['centerBlend']<1 and blend['slopeBlend']<1
 page.wait_for_function('__qa.driver.ledState.centerBlend===1',timeout=10000);page.screenshot(path=str(out/'final_430.png'));print('SMOOTH_STAGE_TRANSITIONS_OK',blend,flush=True)
 # Controlled current reach prediction (no change to the engine): inspect material saturation.
 page.evaluate("(()=>{const s=__qa.slots[0],e=s.engine;e.phase='waiting';e.busy=false;e.processed=0;__qa.app.enabled[0]=true;__qa.app.locked[0]=100;__qa.app.draws=[];s.reachStatus='ready';s.reachBoardKey=e.version+'/0';s.reachResults=[{number:13,tier:3,allClear:true,total:5000,gain:5000}];})()")
 page.wait_for_function('__qa.driver.ledState.rainbow.includes(13)',timeout=10000)
 colors=[]
 for i in range(7):
  colors.append(page.evaluate('__qa.driver.ledState.rainbowColors'));page.wait_for_timeout(350)
 print('RAINBOW_MATERIAL_OK',colors,flush=True)
 # Popup CSS now holds instead of a 480ms flash; verify actual computed timing.
 pops=page.evaluate(r'''(()=>{const q=__qa,s=q.slots[0];s.chainDepth=5;s.chainShownDepth=0;q.renderChain(s);return {chain:getComputedStyle(s.chainHud).animationDuration,style:s.chainHud.style.animation}})()''');assert pops['chain']=='1.55s';print('POPUP_HOLD_OK',pops,flush=True)
 assert not errors,errors
 (out/'verification.json').write_text(json.dumps({'geometry':q,'fade_mid':mid,'stage_blend':blend,'choices':choices,'popup':pops,'errors':errors},indent=2))
 browser.close()
server.shutdown();print('ALL_LOCAL_CHECKS_PASSED',flush=True)

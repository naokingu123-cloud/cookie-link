from pathlib import Path
import json,threading,http.server,functools,os
from playwright.sync_api import sync_playwright
ROOT=Path.cwd()
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}/index.html'
source=(ROOT/'index.html').read_text();anchor='app=new Arcade({onEvent:recordEvent,onChange:recordChanged});app.drawSource=rouletteDrawSource;select(0);'
hook='''window.__qa={app,slots,Engine,Arcade,select,render,miniature,recordEvent,normalBoardsSettled,rouletteAllClearNumbers,debugResetRound,startReadyRound,nextFromResult,toggleJpcMode,scheduleAutoRound,stopAutoRound,stopResultAuto,stopBgm,beginBgm,fadeBgm,activateGameAudio,roundAudioReady,sound,playHammerImpact,playArrivalSound,stopSounds,setBgmLevel,get visibility(){return {inView,hidden:document.hidden,userPaused,menuOpen,phase:app.phase,paused:app.paused,ready:rouletteReady,loading:document.querySelector('.a8-loading')?.textContent}},get driver(){return rouletteDriver},get ready(){return rouletteReady},get duration(){return BET_DURATION_MS},get remaining(){return autoRoundRemaining},get audio(){return audio},get bgm(){return bgmPlayer},get gain(){return bgmGain},get bus(){return sfxBus},get epoch(){return audioRoundEpoch},get status(){return {preparing:audioPreparing,blocked:audioNeedsGesture,attempt:audioAttempt,level:bgmLevel,voices:sfxVoices.size,arrival:!!arrivalBuffer,hammer:!!hammerImpactBuffer}},hold(){userPaused=true;syncPause();stopAutoRound()},resume(){userPaused=false;syncPause();stopAutoRound()},get jpc(){return jpcSession}};userPaused=true;app.paused=true;'''
assert source.count(anchor)==1
html=source.replace(anchor,anchor+hook)
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE'),headless=True,args=['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 context=browser.new_context(viewport={'width':430,'height':932},is_mobile=True,has_touch=True)
 page=context.new_page();errors=[];page.on('pageerror',lambda e:(errors.append(str(e)),print('PAGE_ERROR',str(e),flush=True)))
 page.route('**/index.html*',lambda route:route.fulfill(content_type='text/html; charset=utf-8',body=html))
 page.goto(url,wait_until='domcontentloaded');page.wait_for_function('window.__qa?.ready',timeout=30000)
 page.evaluate('window.__qa.hold()');assert not errors,errors
 print('LOADED',flush=True)
 result=page.evaluate('''()=>{
 const q=__qa,check=(x,msg)=>{if(!x)throw Error(msg)},P={time:0,serial:0,active:0,hits:[],settings:{retain:true,interval:.1},reset(){this.serial=0;this.active=0;this.hits=[]},launch(){this.active++;return{id:++this.serial}},createLaunchSpec(){return{}},random(){return .5}};
 const d=new q.driver.draw.constructor(P),launched=[];d.canAdvance=()=>false;d.onLaunch=b=>launched.push([b.id,P.time]);d.start();
 const at=t=>{P.time=t;d.update()},hit=(id,t)=>{P.time=t;P.active--;P.hits.push({ball:id,pocket:id,time:t});d.update()};
 at(0);at(1.999);check(P.serial===1,'2 too early');at(2);at(3.999);check(P.serial===2,'3 too early');at(4);
 hit(3,6);hit(1,7);at(100);check(P.serial===3,'advanced with ball2 pending');hit(2,101);at(105.999);check(P.serial===3,'4 too early');at(106);check(P.serial===4,'4 waited on board');at(107.999);check(P.serial===4,'5 early');at(108);
 hit(5,110);at(120);check(P.serial===5,'advanced with ball4 pending');hit(4,121);at(125.999);check(P.serial===5,'6 early');at(126);hit(6,129);at(133.999);check(P.serial===6,'7 early');at(134);hit(7,139);at(143.999);check(P.serial===7,'8 early');at(144);hit(8,149);check(d.state==='complete','not complete');
 const times=launched.map(x=>x[1]);check(JSON.stringify(times)===JSON.stringify([0,2,4,106,108,126,134,144]),'wrong times');
 d.reset();at(200);check(P.serial===0&&d.state==='ready','reset launched stale ball');
 d.start();at(200);at(202);at(204);hit(1,205);hit(2,206);P.active=0;at(207);at(208.5);check(P.serial===4&&d.group===0,'fault recovery wrong');hit(4,210);at(214.999);check(P.serial===4,'recovery lost last-hit clock');at(215);check(P.serial===5&&d.group===1,'recovery did not continue');
 d.select('jpc');d.start();for(let i=0;i<500;i++){P.time+=2;P.active=0;d.update()}check(P.serial===70&&d.state==='complete','JPC limit changed');
 return {times,complete:true,bet:q.duration};
}''');assert result['bet']==20000;print('TIMING_OK',result,flush=True)
 page.evaluate('__qa.resume();__qa.stopAutoRound()');before=page.evaluate('({angle:__qa.driver.physics.angle,time:__qa.driver.physics.time})');print('ROTATION_STATE',page.evaluate('__qa.visibility'),errors,flush=True);page.wait_for_function('(angle)=>__qa.driver.physics.angle!==angle',arg=before['angle'],timeout=15000);after=page.evaluate('({angle:__qa.driver.physics.angle,time:__qa.driver.physics.time,led:__qa.driver.ledState})');assert after['angle']!=before['angle'];assert after['led']['label']=='BET TIME';print('BET_ROTATION_LED_OK',after,flush=True)
 page.screenshot(path=str(ROOT/'bet_430.png'))
 print('PRE_END_STATE',page.evaluate('__qa.visibility'),errors,flush=True);page.evaluate("__qa.driver.draw.setState('complete')");a=page.evaluate('__qa.driver.physics.angle');page.wait_for_function('(angle)=>__qa.driver.physics.angle!==angle',arg=a,timeout=15000);assert page.evaluate('__qa.driver.ledState.label')=='DRAW END'
 labels=page.evaluate('''()=>{const d=__qa.driver;d.setPaused(true);d.draw.state='running';const out=[];for(let i=0;i<5;i++){d.draw.displayGroup=i;out.push(d.ledState.stage)}d.reset();return out}''');assert labels==['1st BALLS','2nd BALLS','3rd BALL','4th BALL','FINAL BALL'];print('STAGES_OK',labels,flush=True)
 page.evaluate('__qa.resume()');page.click('#debug-start');page.evaluate('__qa.stopAutoRound();__qa.driver.setPaused(true)')
 page.wait_for_function("__qa.audio?.state==='running'&&!__qa.bgm.paused&&!__qa.status.preparing&&__qa.status.arrival&&__qa.status.hammer",timeout=15000)
 def audio_snapshot():return page.evaluate("({phase:__qa.app.phase,state:__qa.audio?.state,paused:__qa.bgm.paused,time:__qa.bgm.currentTime,gain:__qa.gain?.gain.value,bus:__qa.bus?.gain.value,status:__qa.status})")
 def assert_audio(label):
  page.wait_for_function("__qa.audio?.state==='running'&&!__qa.bgm.paused&&!__qa.status.preparing",timeout=15000)
  a=audio_snapshot();page.wait_for_timeout(260);b=audio_snapshot();assert b['time']>a['time'],(label,a,b);assert b['gain']>.07 and b['bus']>1,(label,b);print(label,b,flush=True)
 assert_audio('FIRST_AUDIO_OK')
 page.evaluate('''()=>{const q=__qa;window.ba=q.audio.createAnalyser();window.sa=q.audio.createAnalyser();ba.fftSize=sa.fftSize=512;q.gain.connect(ba);q.bus.connect(sa);q.playHammerImpact();}''');page.wait_for_timeout(80)
 levels=page.evaluate('''()=>{const rms=a=>{const b=new Float32Array(a.fftSize);a.getFloatTimeDomainData(b);return Math.sqrt(b.reduce((s,x)=>s+x*x,0)/b.length)};return {bgm:rms(ba),sfx:rms(sa)}}''');assert levels['bgm']>0 and levels['sfx']>0,levels;print('REAL_AUDIO_GRAPH_OK',levels,flush=True)
 for i in range(3):
  if i!=1:page.evaluate("__qa.app.phase='result';__qa.fadeBgm()")
  page.click('#debug-reset');page.click('#debug-start');page.evaluate('__qa.driver.setPaused(true);__qa.stopAutoRound()')
  assert_audio(f'FORCED_RESET_{i}_OK')
 page.evaluate('''()=>{const q=__qa;q.debugResetRound();q.stopAutoRound();window.oldPlay=q.bgm.play.bind(q.bgm);let release;const gate=new Promise(r=>release=r);window.releasePlay=release;q.bgm.play=()=>oldPlay().then(()=>gate);q.activateGameAudio({gesture:true});q.bgm.play=oldPlay;q.startReadyRound();q.driver.setPaused(true);}''');page.evaluate('releasePlay()');assert_audio('DELAYED_OLD_PLAY_IGNORED_OK')
 page.evaluate('__qa.audio.suspend()');assert_audio('CONTEXT_RECOVERY_OK')
 page.evaluate('''()=>{for(let i=0;i<6;i++)__qa.debugResetRound();__qa.stopAutoRound();__qa.startReadyRound();__qa.driver.setPaused(true)}''');assert_audio('RAPID_RESET_AUDIO_OK')
 page.evaluate("__qa.stopResultAuto();__qa.app.phase='complete';__qa.nextFromResult();__qa.stopAutoRound()");assert page.evaluate('__qa.remaining')==20000
 page.click('#debug-start');page.evaluate('__qa.driver.setPaused(true)');assert_audio('NORMAL_NEXT_ROUND_AUDIO_OK')
 page.click('#debug-reset');page.click('#jpc-mode');assert page.evaluate('__qa.jpc.active');page.click('#jpc-mode');page.click('#debug-start');page.evaluate('__qa.driver.setPaused(true)');assert_audio('JPC_RETURN_AUDIO_OK')
 reach=page.evaluate('''()=>{const q=__qa,a=q.app,s=q.slots[0],e=s.engine;a.phase='playing';a.locked=[100,0,0];a.enabled=[true,false,false];a.draws=[];e.phase='waiting';e.busy=false;e.queue=[];s.reachEpoch=(s.reachEpoch||0)+1;s.reachStatus='ready';s.reachBoardKey=e.version+'/'+e.processed;s.reachResults=[{number:13,allClear:true,tier:3},{number:4,allClear:false,tier:2}];const good=[...q.rouletteAllClearNumbers()];a.draws=[13];const drawn=[...q.rouletteAllClearNumbers()];a.draws=[];return{good,drawn}}''');assert reach=={'good':[13],'drawn':[]};page.evaluate('__qa.driver.draw.state="running";__qa.driver.draw.displayGroup=4;__qa.driver.setPaused(false)');page.wait_for_timeout(250)
 print('RAINBOW_LED',page.evaluate('__qa.driver.ledState'),flush=True)
 assert page.evaluate('__qa.driver.ledState.rainbow.includes(13)');page.screenshot(path=str(ROOT/'final_430.png'))
 page.evaluate('__qa.hold()');assert not errors,errors
 print('ALL_TESTS_PASSED',flush=True);browser.close()
server.shutdown()

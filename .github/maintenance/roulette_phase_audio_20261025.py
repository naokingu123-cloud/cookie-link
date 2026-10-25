from pathlib import Path
import hashlib,re,subprocess,tempfile
p=Path('index.html');raw=p.read_bytes();BASE='b6d56b05979c4c900dd4bd84fc9f03461270ecb8'
assert hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()==BASE,'Source changed; refusing overwrite'
s=before=raw.decode()
def rep(a,b,n=1):
 global s
 assert s.count(a)==n,(a[:100],s.count(a),n)
 s=s.replace(a,b)
def replace_section(a,b,new):
 global s
 lo=s.index(a);hi=s.index(b,lo);s=s[:lo]+new+'\n'+s[hi:]
rep('?3600000:15000;','?3600000:20000;')
rep('this.waiting=false;this.pendingLaunch=null;this.onReset?.();','this.waiting=false;this.displayGroup=0;this.retryDue=0;this.pendingLaunch=null;this.onReset?.();')
a="""  const groups=NORMAL_DRAW_GROUPS;
  if(this.waiting){if(!p.active&&(!this.canAdvance||this.canAdvance())){this.group++;if(this.group===groups.length){this.setState('complete');return;}this.sent=0;this.waiting=false;this.next=p.time+1.5;}return;}
  if(p.time>=this.next&&this.launch()){this.sent++;this.waiting=this.sent===groups[this.group];this.next=p.time+p.settings.interval;}
"""
b="""  const groups=NORMAL_DRAW_GROUPS,target=groups.slice(0,this.group+1).reduce((a,b)=>a+b,0);
  if(this.waiting){
   if(p.hits.length>=target&&!p.active){
    const landed=p.hits[target-1]?.time??p.time;
    this.group++;if(this.group===groups.length){this.setState('complete');return;}
    this.sent=0;this.waiting=false;this.next=landed+5;
   }else if(!p.active&&p.hits.length<target){
    // Recover a lost physical ball inside its original group.
    if(!this.retryDue)this.retryDue=p.time+1.5;
    if(p.time>=this.retryDue&&this.launch())this.retryDue=0;
   }
   return;
  }
  if(p.time>=this.next){this.displayGroup=this.group;if(this.launch()){this.sent++;this.waiting=this.sent===groups[this.group];this.next=p.time+2;}}
"""
rep(a,b)
rep('draw.canAdvance=()=>hooks.canAdvance?.()??true;','draw.canAdvance=()=>true; // Normal launch timing never waits for a board.')
rep(" const originalUpdate=draw.update.bind(draw);\n draw.update=()=>{originalUpdate();if(draw.mode==='eight'&&draw.state==='complete'&&physics.hits.length<8&&!physics.active&&physics.time>=retryAt){if(draw.launch())retryAt=physics.time+1.5;}};",' // Missing-ball recovery is handled inside the current physical group.')
rep('onNumber:n=>rouletteDrawSource.number(n),canAdvance:normalBoardsSettled,onError:','onNumber:n=>rouletteDrawSource.number(n),getAllClearNumbers:rouletteAllClearNumbers,onError:')
rep('function loadRouletteModules(){',"""function rouletteAllClearNumbers(){
 const out=new Set();if(!app||app.phase!=='playing'||jpcSession.active)return out;
 for(const s of slots){const e=s.engine;
  if(!e||app.bet(s.i)<=0||!reachAvailable(s,app)||s.reachBoardKey!==e.version+'/'+e.processed)continue;
  for(const hit of s.reachResults||[])if(hit.allClear&&hit.tier===3&&!app.draws.includes(hit.number)&&!e.drawn.has(hit.number))out.add(hit.number);
 }
 return out;
}
function loadRouletteModules(){""")
rep("const drawing=draw.state==='running'||physics.active>0||(draw.state==='complete'&&physics.hits.length<8);",'const drawing=true; // Keep the physical rotor turning before and after the draw.')
led=""" const LED_GLYPHS={
 'A':['01110','10001','10001','11111','10001','10001','10001'],'B':['11110','10001','10001','11110','10001','10001','11110'],
 'D':['11110','10001','10001','10001','10001','10001','11110'],'E':['11111','10000','10000','11110','10000','10000','11111'],
 'H':['10001','10001','10001','11111','10001','10001','10001'],
 'F':['11111','10000','10000','11110','10000','10000','10000'],'I':['111','010','010','010','010','010','111'],
 'L':['10000','10000','10000','10000','10000','10000','11111'],'M':['10001','11011','10101','10101','10001','10001','10001'],
 'N':['10001','11001','11001','10101','10011','10011','10001'],'R':['11110','10001','10001','11110','10100','10010','10001'],
 'S':['01111','10000','10000','01110','00001','00001','11110'],'T':['11111','00100','00100','00100','00100','00100','00100'],
 'U':['10001','10001','10001','10001','10001','10001','01110'],'W':['10001','10001','10001','10101','10101','11011','10001'],
 '1':['010','110','010','010','010','010','111'],'2':['01110','10001','00001','00010','00100','01000','11111'],
 '3':['11110','00001','00001','01110','00001','00001','11110'],'4':['10010','10010','10010','11111','00010','00010','00010']};
 function ledText(ctx,text,cx,y,scale=1){
  const glyphs=[...text].map(ch=>LED_GLYPHS[ch]||['000']);const width=glyphs.reduce((n,g)=>n+(g[0].length+1)*scale,0)-scale;let x=Math.round(cx-width/2);
  for(const g of glyphs){g.forEach((row,j)=>[...row].forEach((v,i)=>{if(v==='1')ctx.fillRect(x+i*scale,y+j*scale,scale,scale);}));x+=(g[0].length+1)*scale;}
 }
 const NORMAL_STAGES=[{name:'1st BALLS',lines:['1ST','BALLS'],hue:.55},{name:'2nd BALLS',lines:['2ND','BALLS'],hue:.42},{name:'3rd BALL',lines:['3RD','BALL'],hue:.13},{name:'4th BALL',lines:['4TH','BALL'],hue:.04},{name:'FINAL BALL',lines:['FINAL','BALL'],hue:.79}];
 function normalStage(){
  if(draw.state==='ready')return {name:'BET TIME',lines:['BET','TIME'],hue:.90,bet:true,index:-1};
  if(draw.state==='complete')return {name:'DRAW END',lines:['DRAW','END'],hue:.12,index:5};
  const index=Math.min(4,draw.displayGroup||0);return {...NORMAL_STAGES[index],index};
 }
"""
rep(' function updateSlopeLights(){',led+' function updateSlopeLights(){')
rep("  const running=draw.state==='running',time=running?physics.time-slopeStarted:slopeStopped;\n  for(let i=0;i<25;i++)for(let c=0;c<3;c++)for(let j=0;j<15;j++){\n   slopeLightRGB(i,c,j,time,draw.state!=='ready',slopeRGB);\n   slopeColor.setRGB(...slopeRGB);const k=i*45+c*15+j;", """  const phase=normalStage(),time=physics.time;
  for(let i=0;i<25;i++)for(let c=0;c<3;c++)for(let j=0;j<15;j++){
   const u=(i+(c-1)*.28)/25,r=j/14,n=phase.index;
   const chase=Math.pow(.5+.5*Math.cos(TAU*(u*(n===1?2:1)-time*(phase.bet?.10:.20+n*.045)+r*(n===2?1.8:.2))),4);
   const wave=.5+.5*Math.sin(TAU*(r*.65-time*.30));
   const hue=phase.bet?(u*.35+time*.035)%1:n===3?.96+wave*.09:n===4?(chase>.7?.13:.79):phase.hue;
   slopeColor.setHSL((hue+1)%1,phase.bet?.62:.94,.18+chase*.35+(n===2?wave*.13:0));const k=i*45+c*15+j;""")
rep("const active=draw.mode==='jpc',count=Math.max(0,Math.min(70,physics.serial)),text=active?`${count}/70`:'';","const active=draw.mode==='jpc',count=Math.max(0,Math.min(70,physics.serial)),phase=normalStage(),text=active?`${count}/70`:phase.name;")
rep("  centerTexture.needsUpdate=true;\n  renderer.domElement.setAttribute('role'", """  if(!active){
   centerContext.strokeStyle=`hsl(${phase.hue*360},90%,65%)`;centerContext.lineWidth=2;centerContext.beginPath();centerContext.arc(24,24,21,0,TAU);centerContext.stroke();
   centerContext.fillStyle='#fff5d8';ledText(centerContext,phase.lines[0],24,14);ledText(centerContext,phase.lines[1],24,26);
  }
  centerTexture.needsUpdate=true;
  renderer.domElement.setAttribute('role'""")
rep("active?`抽選機・中央液晶 ${text} 球発射`:'抽選機'","active?`抽選機・中央液晶 ${text} 球発射`:'抽選機・'+text")
rep('brightness*(active?1.90:.28)*pulse','brightness*(active?1.90:1.65)*pulse')
rep('brightness*(active?1.75:.28)*pulse','brightness*(active?1.75:1.5)*pulse')
rep('  physics.balls=physics.balls.filter(b=>!b.dead);\n  panels.forEach',"  physics.balls=physics.balls.filter(b=>!b.dead);\n  const normalReach=draw.mode==='eight'?(hooks.getAllClearNumbers?.()||new Set()):new Set(),phase=normalStage();\n  panels.forEach")
a="""    const flash=false,green=hitTimes[i]>-100;
    if(p.green!==green){p.green=green;p.material.uniforms.lightTint.value.setRGB(green?.035:1,1,green?.13:1);p.scatter.uniforms.lightTint.value.copy(p.material.uniforms.lightTint.value);}
    const shimmer=1;"""
b="""    const flash=false,green=hitTimes[i]>-100,rainbow=!green&&normalReach.has(i+1);
    const tick=Math.floor(physics.time*.8),textureKey=phase.bet?'bet/'+tick:'number';
    if(p.normalTextureKey!==textureKey){
     p.normalTextureKey=textureKey;
     if(phase.bet){const ch='BET TIME  '[(i+tick)%10];p.ctx.fillStyle='#20252c';p.ctx.fillRect(0,0,20,20);p.ctx.fillStyle='#fff5d8';ledText(p.ctx,ch,10,3,2);p.texture.needsUpdate=true;}
     else drawPanel(i);
    }
    p.green=green;p.normalRainbow=rainbow;
    if(rainbow)p.material.uniforms.lightTint.value.setHSL((physics.time/5)%1,1,.62);
    else if(phase.bet)p.material.uniforms.lightTint.value.setHSL((i/25+physics.time*.035)%1,.55,.72);
    else p.material.uniforms.lightTint.value.setRGB(green?.035:1,1,green?.13:1);
    p.scatter.uniforms.lightTint.value.copy(p.material.uniforms.lightTint.value);
    const shimmer=rainbow?1.3:1;"""
rep(a,b)
rep("innerLights[i].color.set(green?'#35ff93':'#f4faff').multiplyScalar(brightness);innerLights[i].opacity=.85;",'innerLights[i].color.copy(p.material.uniforms.lightTint.value).multiplyScalar(brightness);innerLights[i].opacity=.85;')
rep('  updateCenterLight();updateSlopeLights();','  updateCenterCounter();updateCenterLight();updateSlopeLights();')
rep('panels[i].green=null;panels[i].celebrationFrame=-1;','panels[i].green=null;panels[i].normalTextureKey=null;panels[i].normalRainbow=false;panels[i].celebrationFrame=-1;')
rep('  get jpcCounts(){return [...jpcCounts];},',"  get ledState(){return {label:centerDisplay.userData.counter,stage:normalStage().name,rainbow:panels.flatMap((p,i)=>p.normalRainbow?[i+1]:[])};},\n  get jpcCounts(){return [...jpcCounts];},")
rep('function stopSounds(){for(const voice of [...sfxVoices]){try{voice.source.stop();}catch{}voice.source.disconnect();voice.gain.disconnect();sfxVoices.delete(voice);}}',"""function stopSounds(){
 for(const voice of [...sfxVoices]){voice.source.onended=null;try{voice.source.stop();}catch{}try{voice.source.disconnect();}catch{}try{voice.gain.disconnect();}catch{}sfxVoices.delete(voice);}
}
""")
rep("}return audio.resume().then(()=>audio.state==='running').catch(()=>false);","}sfxBus.gain.cancelScheduledValues(audio.currentTime);sfxBus.gain.setValueAtTime(1.35,audio.currentTime);return audio.resume().then(()=>audio.state==='running').catch(()=>false);")
rep(" if(!audio||audio.state!=='running'){unlock();}\n if(!arrivalBuffer)"," if(!audio||audio.state!=='running'){unlock();return;}\n if(!arrivalBuffer)")
rep('function setBgmLevel(value){bgmLevel=Math.max(0,Math.min(1,value));if(bgmGain)bgmGain.gain.setValueAtTime(bgmLevel,audio.currentTime);else bgmPlayer.volume=bgmLevel;}','function setBgmLevel(value){bgmLevel=Math.max(0,Math.min(1,value));if(bgmGain){bgmGain.gain.cancelScheduledValues(audio.currentTime);bgmGain.gain.setValueAtTime(bgmLevel,audio.currentTime);}else bgmPlayer.volume=bgmLevel;}')
replace_section('function stopBgm(){','const effectBytes=new Map();',"""function cancelBgmFade(){bgmFadeToken++;if(bgmFadeFrame)cancelAnimationFrame(bgmFadeFrame);bgmFadeFrame=0;}
function cancelAudioPreparation(){audioAttempt++;audioPreparing=false;audioPreparationTask=null;audioPreparationFromGesture=false;}
function stopBgm(){
 audioRoundEpoch++;cancelAudioPreparation();cancelBgmFade();
 if('speechSynthesis' in window){speechSynthesis.cancel();speechSynthesis.resume();}activeSpeech=null;announcedDrawCount=0;
 bgmPlayer.pause();try{bgmPlayer.currentTime=0;}catch{}setBgmLevel(normalBgmVolume);
}
function beginBgm(){
 cancelAudioPreparation();cancelBgmFade();announcedDrawCount=0;bgmPlayer.loop=true;bgmPlayer.muted=false;bgmPlayer.playbackRate=1;
 try{bgmPlayer.currentTime=0;}catch{}setBgmLevel(normalBgmVolume);
 return $('sound').checked?activateGameAudio():Promise.resolve(false);
}
function fadeBgm(){
 if(bgmPlayer.paused||bgmFadeFrame)return;const token=++bgmFadeToken,epoch=audioRoundEpoch,round=app.token,initial=bgmLevel,started=performance.now();
 function step(now){
  if(token!==bgmFadeToken||epoch!==audioRoundEpoch||round!==app.token)return;
  const t=Math.min(1,(now-started)/2900);setBgmLevel(initial*(1-t)*(1-t));
  if(t<1)bgmFadeFrame=requestAnimationFrame(step);else{bgmFadeFrame=0;bgmPlayer.pause();try{bgmPlayer.currentTime=0;}catch{}setBgmLevel(normalBgmVolume);}
 }
 bgmFadeFrame=requestAnimationFrame(step);
}
""")
replace_section('function queueRoundBgm(){','function scheduleAutoRound(){',"""function queueRoundBgm(){
 if(bgmQueuedToken===app.token&&bgmPlayer.getAttribute('src'))return;
 stopBgm();bgmQueuedToken=app.token;audioPreparedToken=-1;audioAttemptedToken=-1;
 const pool=bgmTracks.filter(x=>x!==lastBgm),chosen=(pool.length?pool:bgmTracks)[Math.floor(Math.random()*(pool.length||bgmTracks.length))];
 lastBgm=chosen;bgmPlayer.src=chosen;bgmPlayer.load();
}
function normalAudioWanted(){return !!app&&app.phase==='playing'&&!app.paused&&!jpcSession.active&&!document.hidden&&inView&&$('sound').checked;}
function roundAudioReady(){return !$('sound').checked||(audio?.state==='running'&&!!arrivalBuffer&&!!hammerImpactBuffer&&bgmPlayer.readyState>=2&&(app.phase==='ready'||!bgmPlayer.paused));}
function activateGameAudio({gesture=false}={}){
 if(!app||!$('sound').checked||!['ready','playing'].includes(app.phase)||jpcSession.active)return Promise.resolve(false);
 if(app.phase==='ready')queueRoundBgm();
 if(audioPreparing&&!gesture)return audioPreparationTask||Promise.resolve(false);
 const attempt=++audioAttempt,epoch=audioRoundEpoch,round=app.token;
 const valid=()=>attempt===audioAttempt&&epoch===audioRoundEpoch&&round===app.token&&$('sound').checked;
 audioPreparing=true;audioPreparationFromGesture=gesture;audioAttemptedToken=app.token;setAudioStatus('loading');
 const resume=unlock();if(!audio){audioPreparing=false;setAudioStatus('error');return Promise.resolve(false);}
 try{connectBgmAudio();prepareAnnouncer();}catch(error){audioPreparing=false;setAudioStatus('error');return Promise.resolve(false);}
 // A trusted BET tap may prime the media element silently; automatic BET preparation only preloads.
 const prime=app.phase==='ready'&&gesture;
 if(normalAudioWanted())setBgmLevel(normalBgmVolume);else if(prime)setBgmLevel(0);
 let play=Promise.resolve();try{if(normalAudioWanted()||prime)play=bgmPlayer.play();}catch(error){play=Promise.reject(error);}
 const task=audioTimeout(Promise.all([resume,play,prepareArrival(),prepareHammerImpact()]),8000).then(([running,,arrival,hammer])=>{
  if(!valid())return false;
  if(!running||audio.state!=='running')throw Error('Audio context is not running');
  audioTrusted=true;audioNeedsGesture=false;audioPreparedToken=app.token;
  if(!normalAudioWanted()){bgmPlayer.pause();if(app.phase==='ready')try{bgmPlayer.currentTime=0;}catch{}}
  setBgmLevel(normalBgmVolume);setAudioStatus(arrival&&hammer?'ready':'error');return true;
 }).catch(error=>{
  if(!valid())return false;audioNeedsGesture=error?.name==='NotAllowedError';audioPreparedToken=-1;
  if(!normalAudioWanted())bgmPlayer.pause();setBgmLevel(normalBgmVolume);setAudioStatus(audioNeedsGesture?'blocked':'error');return false;
 }).finally(()=>{if(attempt===audioAttempt){audioPreparing=false;audioPreparationFromGesture=false;audioPreparationTask=null;}});
 audioPreparationTask=task;return task;
}
function startReadyRound(){
 if(jpcSession.active||debugResetting||roundStarting||app.phase!=='ready'||!rouletteReady||!app.bets.some(b=>b>0)||document.hidden||menuOpen||userPaused||!inView)return false;
 roundStarting=true;stopAutoRound();cancelAudioPreparation();cancelBgmFade();setBgmLevel(normalBgmVolume);
 try{
  payoutStamp=null;const ok=app.start();
  if(!ok)stopBgm();else{countdownText('PLAY','ゲーム中');beginBgm();}
  return ok;
 }finally{roundStarting=false;if(app.phase==='ready')scheduleAutoRound();}
}
// Recover interrupted playback without a confirmation modal or changing the user's sound setting.
setInterval(()=>{
 if(!normalAudioWanted()||audioPreparing||audioNeedsGesture)return;
 if(audio?.state!=='running'||bgmPlayer.paused||bgmLevel<=.001||!arrivalBuffer||!hammerImpactBuffer)activateGameAudio();
},1500);
""")
rep("else if($('sound').checked&&bgmPlayer.src&&bgmPlayer.paused)bgmPlayer.play().catch(error=>{audioNeedsGesture=error?.name==='NotAllowedError';setAudioStatus(audioNeedsGesture?'blocked':'error');});","else if($('sound').checked&&bgmPlayer.src&&bgmPlayer.paused)activateGameAudio();")
rep("if(!$('sound').checked){audioAttempt++;audioPreparing=false;audioPreparationTask=null;stopSounds();bgmPlayer.pause();setAudioStatus('off');if('speechSynthesis' in window)speechSynthesis.cancel();scheduleAutoRound();}","if(!$('sound').checked){stopBgm();stopSounds();audioNeedsGesture=false;setAudioStatus('off');scheduleAutoRound();}")
for a,b in [('class Engine{','const elixirGlyphs='),('const PHYSICS=(()=>{','const DRAW=(()=>{')]:
 assert before[before.index(a):before.index(b)]==s[s.index(a):s.index(b)],a
assert re.findall(r'data:[^\s\"\x27<>]+;base64,[A-Za-z0-9+/=]+',before)==re.findall(r'data:[^\s\"\x27<>]+;base64,[A-Za-z0-9+/=]+',s)
with tempfile.TemporaryDirectory() as folder:
 for i,m in enumerate(re.finditer(r'<script\b([^>]*)>([\s\S]*?)</script>',s)):
  attrs,code=m.groups()
  if not code.strip() or re.search(r'type=[\"\x27](?:application/json|importmap)',attrs):continue
  f=Path(folder)/f'part{i}.mjs';f.write_text(code);subprocess.run(['node','--check',str(f)],check=True)
p.write_text(s)
print('PATCH_OK',hashlib.sha1(b'blob '+str(len(p.read_bytes())).encode()+b'\0'+p.read_bytes()).hexdigest())

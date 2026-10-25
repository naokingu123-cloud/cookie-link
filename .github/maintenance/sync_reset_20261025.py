from pathlib import Path
import hashlib,re,subprocess,tempfile
p=Path('index.html');raw=p.read_bytes()
def blob(b):return hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
assert blob(raw)=='012bf2f7b131d6f07ab619579cf92c1f9b709b76','Source changed; refusing overwrite'
s=raw.decode();Path('/tmp/cookielink-before.html').write_text(s)
def replace(a,b):
 global s
 assert s.count(a)==1,'Unique anchor missing: '+a[:110]
 s=s.replace(a,b,1)
def section(a,b,text):
 global s
 assert s.count(a)==1 and s.count(b)==1,(a,b)
 lo=s.index(a);hi=s.index(b,lo);s=s[:lo]+text+'\n'+s[hi:]
replace('const impact=source.launch+flight,breakAt=impact+Math.round(125/waveRate);\n  targets[r*SIZE+c]={impact,breakAt,fragmentLife:board[r][c]?.special?life:Math.max(420,life)};', 'const impact=source.launch+flight,normal=!board[r][c]?.special;\n   const crackEnd=impact+Math.round((normal?220:125)/waveRate),breakAt=crackEnd+(normal?Math.round(80/waveRate):0);\n  targets[r*SIZE+c]={impact,crackEnd,breakAt,fragmentAt:breakAt,fragmentLife:normal?Math.max(420,life):life};')
replace('part:j,enhanced,life,delay:hit.breakAt,','part:j,enhanced,life,delay:hit.fragmentAt??hit.breakAt,')
replace('color:tile.color,delay:hit.breakAt,life,vx:','color:tile.color,delay:hit.fragmentAt??hit.breakAt,life,vx:')
replace('return {bits,dust,rays,sources:plan.sources,life:plan.life,elapsed:0,stamp:null,duration:plan.duration,version};', '''const remoteTargets=(ev.remoteCells||[]).filter(([r,c])=>board[r][c]&&!board[r][c].special).map(([r,c])=>({tileId:board[r][c].id,...plan.targets[r*SIZE+c]}));
 return {bits,dust,rays,remoteTargets,sources:plan.sources,life:plan.life,elapsed:0,stamp:null,duration:plan.duration,version};''')
replace('function stopShatter(s){s.shatter=null;if(s.shatterCtx)s.shatterCtx.clearRect(0,0,600,600);}', '''function stopShatter(s){
 for(const el of s.shatter?.remoteElements||[]){el.classList.remove('hammer-fragment-synced');for(const name of ['--hammer-cookie-opacity','--hammer-crack-offset','--hammer-side-offset'])el.style.removeProperty(name);}
 s.shatter=null;if(s.shatterCtx)s.shatterCtx.clearRect(0,0,600,600);
}''')
replace('function startShatter(s,ev,e){', '''// Use the same timeline for crack growth, cookie disappearance and fragments.
function syncRemoteCookieVisuals(s,fx){
 for(const target of fx.remoteTargets||[]){
  const el=s.tiles.get(target.tileId);if(!el)continue;
  const end=target.crackEnd??target.breakAt,span=Math.max(1,end-target.impact);
  const progress=Math.max(0,Math.min(1,(fx.elapsed-target.impact)/span));
  el.style.setProperty('--hammer-cookie-opacity',fx.elapsed<target.breakAt?'1':'0');
  el.style.setProperty('--hammer-crack-offset',String(1-progress));
  el.style.setProperty('--hammer-side-offset',String(1-Math.max(0,Math.min(1,(progress-.36)/.64))));
 }
}
function bindRemoteCookieVisuals(s,fx){
 fx.remoteElements=[];
 for(const target of fx.remoteTargets||[]){const el=s.tiles.get(target.tileId);if(el){el.classList.add('hammer-fragment-synced');fx.remoteElements.push(el);}}
 syncRemoteCookieVisuals(s,fx);
}
function startShatter(s,ev,e){''')
replace('s.shatter=makeShatterFx(ev,e.board,e.speed,e.version);s.shatter.event=ev;requestShatter(s);','s.shatter=makeShatterFx(ev,e.board,e.speed,e.version);s.shatter.event=ev;bindRemoteCookieVisuals(s,s.shatter);requestShatter(s);')
replace('ctx.save();ctx.scale(600/298,600/298);paintShatterFrame(ctx,fx);ctx.restore();requestShatter(s);','syncRemoteCookieVisuals(s,fx);ctx.save();ctx.scale(600/298,600/298);paintShatterFrame(ctx,fx);ctx.restore();requestShatter(s);')
replace('function playHammerImpact(delay=0){', '''function trackEffectVoice(source,gain){
 const voice={source,gain};sfxVoices.add(voice);
 source.onended=()=>{sfxVoices.delete(voice);try{source.disconnect();gain.disconnect();}catch{}};
 return voice;
}
function playHammerImpact(delay=0){''')
replace('source.onended=()=>{source.disconnect();gain.disconnect();};\n source.start(audio.currentTime+Math.max(0,delay)/1000/', 'trackEffectVoice(source,gain);\n source.start(audio.currentTime+Math.max(0,delay)/1000/')
replace('src.onended=()=>{src.disconnect();gain.disconnect();};src.start();','trackEffectVoice(src,gain);src.start();')
section('function showAudioGate(', 'app=new Arcade({onEvent:recordEvent,onChange:recordChanged});', r'''let audioRoundEpoch=0,audioPreparationTask=null,audioPreparationFromGesture=false,debugResetting=false;
function setAudioStatus(state){
 const box=$('sound');if(!box)return;box.dataset.state=state;
 const label=box.closest('label');if(label)label.title=state==='blocked'?'画面の操作で音声を再開します':state==='loading'?'音声を読み込み中':state==='error'?'音声の読み込み失敗。画面操作で再試行します':'';
}
function queueRoundBgm(){
 if(bgmQueuedToken===app.token)return;
 bgmQueuedToken=app.token;audioRoundEpoch++;audioAttempt++;audioPreparing=false;audioPreparationTask=null;audioPreparationFromGesture=false;audioPreparedToken=-1;audioAttemptedToken=-1;
 const pool=bgmTracks.filter(x=>x!==lastBgm),chosen=(pool.length?pool:bgmTracks)[Math.floor(Math.random()*(pool.length||bgmTracks.length))];
 lastBgm=chosen;bgmPlayer.pause();bgmPlayer.src=chosen;bgmPlayer.load();
}
function roundAudioReady(){return !$('sound').checked||(audio?.state==='running'&&!!arrivalBuffer&&!!hammerImpactBuffer&&bgmPlayer.readyState>=2&&!bgmPlayer.paused);}
function activateGameAudio({gesture=false}={}){
 if(!app||!$('sound').checked||!['ready','playing'].includes(app.phase))return Promise.resolve(false);
 if(app.phase==='ready')queueRoundBgm();
 if(audioPreparing&&(!gesture||audioPreparationFromGesture))return audioPreparationTask||Promise.resolve(false);
 const attempt=++audioAttempt,epoch=audioRoundEpoch;
 audioPreparing=true;audioPreparationFromGesture=gesture;audioNeedsGesture=false;audioAttemptedToken=app.token;setAudioStatus('loading');
 const resume=unlock();
 if(!audio){audioPreparing=false;setAudioStatus('error');return Promise.resolve(false);}
 try{connectBgmAudio();prepareAnnouncer();}catch(error){audioPreparing=false;setAudioStatus('error');return Promise.resolve(false);}
 if(app.phase==='ready')setBgmLevel(0);else setBgmLevel(normalBgmVolume);
 let play;try{play=bgmPlayer.play();}catch(error){play=Promise.reject(error);}
 const task=audioTimeout(Promise.all([resume,play,prepareArrival(),prepareHammerImpact()]),8000).then(([running,,arrival,hammer])=>{
  if(attempt!==audioAttempt||epoch!==audioRoundEpoch||!$('sound').checked)return false;
  if(!running||audio.state!=='running')throw Error('Audio context is not running');
  audioTrusted=true;audioNeedsGesture=false;audioPreparedToken=app.token;
  if(app.phase==='ready'){bgmPlayer.pause();try{bgmPlayer.currentTime=0;}catch{}}
  else if(app.phase!=='playing'||app.paused)bgmPlayer.pause();
  setBgmLevel(normalBgmVolume);setAudioStatus(arrival&&hammer?'ready':'error');return true;
 }).catch(error=>{
  if(attempt!==audioAttempt||epoch!==audioRoundEpoch||!$('sound').checked)return false;
  audioNeedsGesture=error?.name==='NotAllowedError'||audio.state!=='running';audioPreparedToken=-1;
  if(app.phase!=='playing'||app.paused)bgmPlayer.pause();
  setBgmLevel(normalBgmVolume);setAudioStatus(audioNeedsGesture?'blocked':'error');return false;
 }).finally(()=>{if(attempt===audioAttempt){audioPreparing=false;audioPreparationFromGesture=false;audioPreparationTask=null;}});
 audioPreparationTask=task;return task;
}
function startReadyRound(){
 if(debugResetting||roundStarting||app.phase!=='ready'||!rouletteReady||!app.bets.some(b=>b>0)||document.hidden||menuOpen||userPaused||!inView)return false;
 roundStarting=true;stopAutoRound();
 try{
  if($('sound').checked){
   if(!audioPreparing&&!roundAudioReady())activateGameAudio();
   try{Promise.resolve(beginBgm()).catch(error=>{audioNeedsGesture=error?.name==='NotAllowedError';setAudioStatus(audioNeedsGesture?'blocked':'error');});}catch{setAudioStatus('error');}
  }
  payoutStamp=null;const ok=app.start();if(!ok)stopBgm();else countdownText('PLAY','ゲーム中');return ok;
 }finally{roundStarting=false;if(app.phase==='ready')scheduleAutoRound();}
}
function scheduleAutoRound(){
 if(!app||roundStarting||debugResetting)return;
 if(app.phase!=='ready'){stopAutoRound();countdownText(app.phase==='playing'?'PLAY':'RESULT',app.phase==='playing'?'ゲーム中':'結果表示');return;}
 if(autoRoundToken!==app.token){stopAutoRound();autoRoundToken=app.token;autoRoundRemaining=BET_DURATION_MS;queueRoundBgm();}
 if(autoRoundTimer!==null)return;
 function tick(){
  autoRoundTimer=null;if(app.phase!=='ready'||debugResetting){scheduleAutoRound();return;}
  const now=performance.now(),available=rouletteReady&&!document.hidden&&!menuOpen&&!userPaused&&inView;
  if(!available){autoRoundStamp=null;countdownText('…',rouletteReady?'BET TIME':'読込中');}
  else if(!app.bets.some(b=>b>0)){autoRoundStamp=null;countdownText('BET','BETを選択');}
  else{
   if($('sound').checked&&!audioPreparing&&audioAttemptedToken!==app.token)activateGameAudio();
   if(autoRoundStamp!==null)autoRoundRemaining=Math.max(0,autoRoundRemaining+autoRoundStamp-now);autoRoundStamp=now;
   countdownText((autoRoundRemaining/1000).toFixed(1)+'秒',DEBUG_FAST_START?'開始まで・DEBUG':'開始まで');
   if(autoRoundRemaining<=0){startReadyRound();return;}
  }
  autoRoundTimer=setTimeout(tick,100);
 }
 tick();
}
function debugResetRound(){
 if(!app||debugResetting)return;
 debugResetting=true;
 try{
  stopAutoRound();audioAttempt++;audioRoundEpoch++;audioPreparing=false;audioPreparationTask=null;audioPreparationFromGesture=false;audioPreparedToken=-1;audioAttemptedToken=-1;bgmQueuedToken=-1;roundStarting=false;
  if(menuOpen)closeRecordMenu();
  stopBgm();stopSounds();stopBetPreview();userPaused=false;payoutStamp=null;
  document.body.classList.remove('paused');
  for(const s of slots){stopShatter(s);stopPour(s);stopSugarAward(s);stopHammerTransfer(s);stopPayClimb(s);clearMarks(s);s.particles.replaceChildren();s.miniTween=null;s.miniPositions=new Map();s.dirtyMain=true;s.dirtyMini=true;}
  app.prepare();renderRoundResult(app);syncPause();scheduleUI(app);
 }finally{debugResetting=false;}
 scheduleAutoRound();
}
function wakeAudioFromGesture(event){
 if(!event.isTrusted||!app||!$('sound').checked||!['ready','playing'].includes(app.phase)||menuOpen||userPaused||document.hidden||!inView)return;
 if(event.target?.closest?.('#debug-reset,#sound'))return;
 if(audio?.state==='running'&&(app.phase==='ready'||!bgmPlayer.paused)&&arrivalBuffer&&hammerImpactBuffer&&!audioNeedsGesture)return;
 activateGameAudio({gesture:true});
}
''')
pattern=r'<div id="audio-gate" hidden><p id="audio-gate-message">[\s\S]*?</div>'
s,n=re.subn(pattern,'',s,count=1);assert n==1,'Audio confirmation markup missing'
replace("$('audio-enable').onclick=activateGameAudio;\n$('audio-without').onclick=()=>{audioAttempt++;audioPreparing=false;audioNeedsGesture=false;$('sound').checked=false;bgmPlayer.pause();$('audio-gate').hidden=true;scheduleAutoRound();};", "$('debug-reset').onclick=()=>{debugResetRound();activateGameAudio({gesture:true});};")
replace("$('reset').onclick=()=>{stopBgm();stopSounds();userPaused=false;payoutStamp=null;document.body.classList.remove('paused');for(const s of slots)s.particles.replaceChildren();app.resetDebug();syncPause();};", "$('reset').onclick=debugResetRound;")
replace("bgmPlayer.play().catch(()=>{showAudioGate('音声を再開するにはタップしてください',true);});", "bgmPlayer.play().catch(error=>{audioNeedsGesture=error?.name==='NotAllowedError';setAudioStatus(audioNeedsGesture?'blocked':'error');});")
replace("audioAttempt++;audioPreparing=false;stopSounds();bgmPlayer.pause();$('audio-gate').hidden=true;", "audioAttempt++;audioPreparing=false;audioPreparationTask=null;stopSounds();bgmPlayer.pause();setAudioStatus('off');")
replace("else{audioPreparedToken=-1;audioNeedsGesture=false;activateGameAudio();}", "else{audioPreparedToken=-1;audioNeedsGesture=false;activateGameAudio({gesture:true});}")
replace("const soundLabel=$('sound').closest('label');", "for(const type of ['pointerup','touchend','keydown'])document.addEventListener(type,wakeAudioFromGesture,{passive:true});\nconst soundLabel=$('sound').closest('label');")
replace('<main id="screen">','<main id="screen"><button id="debug-reset" type="button" aria-label="現在のゲームを即リセット" title="現在のゲームを中断。BET・獲得済みシュガー・保存成績は保持">即リセット</button>')
replace("if(el!==$('record-menu-layer')){recordInert", "if(el!==$('record-menu-layer')&&el.id!=='debug-reset'){recordInert")
css=r'''
/* No independent opacity clock: cracks and pieces use fx.elapsed together. */
.tile.breaking.color-target.hammer-fragment-synced:not(.special) .sweet{animation:none!important;opacity:var(--hammer-cookie-opacity,1)!important;transform:none!important}
.tile.breaking.color-target.hammer-fragment-synced:not(.special) .crack-art path{animation:none!important;stroke-dashoffset:var(--hammer-crack-offset,1)!important}
.tile.breaking.color-target.hammer-fragment-synced:not(.special) .crack-art path.crack-side{stroke-dashoffset:var(--hammer-side-offset,1)!important}
#debug-reset{position:absolute;top:78px;right:23px;z-index:10001;min-width:94px;height:30px;padding:4px 10px;border:1px solid #ffe0b3;border-radius:8px;background:linear-gradient(#a84865,#71334d);color:#fff9eb;font:800 11px/20px system-ui;box-shadow:0 2px 5px #5b203355;touch-action:manipulation}
#debug-reset:active{filter:brightness(1.2)}
'''
replace('</style></head><body>',css+'</style></head><body>')
assert 'showAudioGate(' not in s and "$ regarding audio-gate" not in s
p.write_text(s)
with tempfile.TemporaryDirectory() as folder:
 for i,m in enumerate(re.finditer(r'<script\b([^>]*)>([\s\S]*?)</script>',s)):
  attrs,code=m.groups()
  if not code.strip() or re.search(r'type=[\"\x27](?:application/json|importmap)',attrs):continue
  f=Path(folder)/('script'+str(i)+('.mjs' if 'module' in attrs else '.js'));f.write_text(code);subprocess.run(['node','--check',str(f)],check=True)
print('SYNC_RESET_PATCH_OK',blob(p.read_bytes()))

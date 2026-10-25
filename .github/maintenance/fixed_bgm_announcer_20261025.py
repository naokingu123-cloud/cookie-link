from pathlib import Path
import hashlib,re,subprocess,tempfile
p=Path('index.html');raw=p.read_bytes();base=raw.decode()
assert hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()=='b5b63cad56d0da28ffe133b9a31eb8be76d88b46','Source changed; refusing overwrite'
Path('/tmp/number-announcer-before.html').write_bytes(raw);s=base
def rep(a,b):
 global s
 assert s.count(a)==1,(a[:120],s.count(a));s=s.replace(a,b,1)
start=s.index('function prepareAnnouncer(){');end=s.index('let bgmFadeFrame=',start)
s=s[:start]+r'''// Pre-rendered Japanese announcements share the game's AudioContext, not OS TTS.
// The voice bus and queue never read or change BGM gain, fades, or media playback.
const numberVoiceBuffers=new Map(),numberVoiceLoads=new Map(),numberVoiceQueue=[];
let numberVoiceEpoch=0,numberVoiceBusy=null,numberVoiceBus=null,numberVoicePreload=null;
const NUMBER_VOICE_GAIN=.95;
const numberVoiceFile=n=>'assets/audio/numbers/'+String(n).padStart(2,'0')+'.wav';
function numberAudioAllowed(){
 return !!app&&$('sound').checked&&!document.hidden&&inView&&!menuOpen&&!userPaused&&
  (jpcSession.active||(!app.paused&&['playing','result','paying','complete'].includes(app.phase)));
}
function loadNumberVoice(n){
 if(numberVoiceBuffers.has(n))return Promise.resolve(numberVoiceBuffers.get(n));
 if(numberVoiceLoads.has(n))return numberVoiceLoads.get(n);
 if(!audio)return Promise.resolve(null);
 const task=loadEffectSample(numberVoiceFile(n)).then(buffer=>{numberVoiceBuffers.set(n,buffer);return buffer;}).catch(error=>{
  console.warn('番号音声の読み込み失敗',n,error);return null;
 }).finally(()=>numberVoiceLoads.delete(n));
 numberVoiceLoads.set(n,task);return task;
}
function prepareAnnouncer(){
 if(!audio)return Promise.resolve(false);
 if(numberVoiceBuffers.size===25)return Promise.resolve(true);
 if(numberVoicePreload)return numberVoicePreload;
 numberVoicePreload=Promise.all(Array.from({length:25},(_,i)=>loadNumberVoice(i+1))).then(values=>values.every(Boolean)).finally(()=>{numberVoicePreload=null;});
 return numberVoicePreload;
}
function stopNumberAnnouncements(){
 numberVoiceEpoch++;numberVoiceQueue.length=0;
 const active=numberVoiceBusy;numberVoiceBusy=null;
 if(active?.source){active.source.onended=null;try{active.source.stop();}catch{}try{active.source.disconnect();active.gain.disconnect();}catch{}}
}
function pumpNumberAnnouncements(){
 if(numberVoiceBusy||!numberVoiceQueue.length||!numberAudioAllowed())return;
 if(!audio||audio.state!=='running'){
  const epoch=numberVoiceEpoch;
  Promise.resolve(unlock()).then(ok=>{if(ok&&epoch===numberVoiceEpoch)pumpNumberAnnouncements();}).catch(()=>{});return;
 }
 const job=numberVoiceQueue.shift();
 if(job.epoch!==numberVoiceEpoch||job.round!==app.token||job.jpc!==jpcSession.active){pumpNumberAnnouncements();return;}
 numberVoiceBusy=job;
 loadNumberVoice(job.number).then(buffer=>{
  if(numberVoiceBusy!==job||job.epoch!==numberVoiceEpoch)return;
  if(!buffer||!numberAudioAllowed()||job.round!==app.token||job.jpc!==jpcSession.active){numberVoiceBusy=null;pumpNumberAnnouncements();return;}
  if(audio.state!=='running'){numberVoiceBusy=null;numberVoiceQueue.unshift(job);return;}
  if(!numberVoiceBus){numberVoiceBus=audio.createGain();numberVoiceBus.gain.value=NUMBER_VOICE_GAIN;numberVoiceBus.connect(audio.destination);}
  const source=audio.createBufferSource(),gain=audio.createGain();source.buffer=buffer;source.playbackRate.value=1;gain.gain.value=1;
  source.connect(gain);gain.connect(numberVoiceBus);job.source=source;job.gain=gain;
  source.onended=()=>{try{source.disconnect();gain.disconnect();}catch{}if(numberVoiceBusy!==job||job.epoch!==numberVoiceEpoch)return;numberVoiceBusy=null;pumpNumberAnnouncements();};
  try{source.start(audio.currentTime+.045);}catch(error){source.onended=null;try{source.disconnect();gain.disconnect();}catch{}numberVoiceBusy=null;console.warn('番号音声の再生失敗',error);pumpNumberAnnouncements();}
 });
}
function announceDraw(n){
 if(!Number.isInteger(n)||n<1||n>25||!numberAudioAllowed())return false;
 playArrivalSound();
 numberVoiceQueue.push({number:n,epoch:numberVoiceEpoch,round:app.token,jpc:jpcSession.active,source:null,gain:null});
 pumpNumberAnnouncements();return true;
}
function ensureNumberVoiceCredit(){
 const layer=$('record-menu-layer');if(!layer||document.getElementById('number-voice-credit'))return;
 const box=layer.querySelector('.record-menu')||layer.querySelector('[role="dialog"]')||layer.firstElementChild;if(!box)return;
 const credit=document.createElement('p');credit.id='number-voice-credit';credit.style.cssText='font:9px/1.5 system-ui;text-align:center;margin:6px 0;color:#765b4a';
 credit.innerHTML='番号音声：HTS Voice Mei / MMDAgent · <a href="docs/NUMBER_VOICE_CREDITS.html" target="_blank" rel="noopener noreferrer" style="color:inherit;text-decoration:underline">著作権・ライセンス</a>';
 box.append(credit);
}
''' +s[end:]
rep('let arrivalBuffer=null,arrivalLoading=null,activeSpeech=null;','let arrivalBuffer=null,arrivalLoading=null;')
rep('function stopSounds(){','function stopSounds(){\n stopNumberAnnouncements();')
rep(" if('speechSynthesis' in window){speechSynthesis.cancel();speechSynthesis.resume();}activeSpeech=null;announcedDrawCount=0;"," stopNumberAnnouncements(); // Do not rewind announcedDrawCount on mute: old numbers must not replay.")
rep("function setBgmLevel(value){bgmLevel=Math.max(0,Math.min(1,value));if(bgmGain){bgmGain.gain.cancelScheduledValues(audio.currentTime);bgmGain.gain.setValueAtTime(bgmLevel,audio.currentTime);}else bgmPlayer.volume=bgmLevel;}","function setBgmLevel(value,{fade=false}={}){bgmLevel=fade?Math.max(0,Math.min(1,value)):normalBgmVolume;if(bgmGain){bgmGain.gain.cancelScheduledValues(audio.currentTime);bgmGain.gain.setValueAtTime(bgmLevel,audio.currentTime);}else bgmPlayer.volume=bgmLevel;}")
rep('setBgmLevel(initial*(1-t)*(1-t));','setBgmLevel(initial*(1-t)*(1-t),{fade:true});')
rep("if(hits.length>jpcSession.previousHits&&!document.hidden&&!menuOpen&&!userPaused&&inView)playArrivalSound();","if(hits.length>jpcSession.previousHits&&!document.hidden&&!menuOpen&&!userPaused&&inView)for(const hit of hits.slice(jpcSession.previousHits))announceDraw(hit.pocket);")
rep(" if(event.target?.closest?.('#debug-reset,#sound'))return;"," if(event.target?.closest?.('#debug-reset,#sound'))return;\n if(jpcSession.active){Promise.resolve(unlock()).then(()=>{prepareAnnouncer();pumpNumberAnnouncements();});return;}\n pumpNumberAnnouncements();")
rep("else{audioPreparedToken=-1;audioNeedsGesture=false;activateGameAudio({gesture:true});}","else{audioPreparedToken=-1;audioNeedsGesture=false;if(jpcSession.active)Promise.resolve(unlock()).then(()=>prepareAnnouncer());else activateGameAudio({gesture:true});}")
rep("syncPause();renderRecordMenu();renderAvatar();const c=","syncPause();renderRecordMenu();ensureNumberVoiceCredit();renderAvatar();const c=")
rep("fetchEffectBytes(arrivalFile).catch(()=>{});fetchEffectBytes('グランドクロス被弾.wav').catch(()=>{});","fetchEffectBytes(arrivalFile).catch(()=>{});fetchEffectBytes('グランドクロス被弾.wav').catch(()=>{});\nfor(let n=1;n<=25;n++)fetchEffectBytes(numberVoiceFile(n)).catch(()=>{});")
# Only audio and the menu attribution line can change; no game engine/physics/timing edits.
for a,b in [('class Engine{','const elixirGlyphs='),('class Arcade{','const recordStorage'),('function createCookieRoulette(', 'const bgmTracks=')]:
 if a in base and b in base:
  assert base[base.index(a):base.index(b,base.index(a))]==s[s.index(a):s.index(b,s.index(a))],a
assert base[:base.index('function stopSounds(){')]==s[:s.index('function stopSounds(){')]
assert 'speechSynthesis.speak' not in s and 'SpeechSynthesisUtterance' not in s
voice_code=s[s.index('// Pre-rendered Japanese announcements'):s.index('let bgmFadeFrame=')]
assert not any(k in voice_code for k in ['setBgmLevel(', 'bgmPlayer.', 'bgmGain.', 'fadeBgm('])
for i,m in enumerate(re.finditer(r'<script\b([^>]*)>([\s\S]*?)</script>',s)):
 attrs,code=m.groups()
 if not code.strip() or re.search(r'type=[\"\x27](?:application/json|importmap)',attrs):continue
 f=Path('/tmp')/f'announcer_check_{i}.mjs';f.write_text(code);subprocess.run(['node','--check',str(f)],check=True)
p.write_text(s);print('FIXED_BGM_ANNOUNCER_PATCH_OK',hashlib.sha1(b'blob '+str(len(s.encode())).encode()+b'\0'+s.encode()).hexdigest())

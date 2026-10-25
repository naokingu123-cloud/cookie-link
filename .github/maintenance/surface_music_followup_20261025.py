from pathlib import Path
import re,subprocess,hashlib
p=Path('index.html');s=p.read_text()
def rep(old,new):
 global s
 assert s.count(old)==1,(old[:120],s.count(old))
 s=s.replace(old,new,1)
rep(" if(app.phase==='ready')queueRoundBgm();\n if(bgmRole==='transition')return Promise.resolve(true);", " if(app.phase==='ready')queueRoundBgm();\n if(bgmRole==='none'){bgmRole=app.phase==='ready'?'bet':'game';bgmPlayer.src=bgmRole==='bet'?BET_BGM_FILE:(queuedGameBgm||bgmTracks[0]);bgmPlayer.loop=true;bgmPlayer.load();}\n if(bgmRole==='transition')return Promise.resolve(true);")
rep(" const old=bgmTransition;bgmTransition=null;if(old)old.resolve(false);", " const old=bgmTransition;bgmTransition=null;if(old){if(old.timer)clearTimeout(old.timer);if(bgmGain&&audio){const now=audio.currentTime;bgmGain.gain.cancelScheduledValues(now);bgmGain.gain.setValueAtTime(bgmLevel,now);}old.resolve(false);}")
a=s.index(' const initial=bgmLevel;bgmRole=\'transition\';',s.index('function beginBgm(){'))
b=s.index('\nfunction fadeBgm(){',a)
s=s[:a]+r''' const initial=bgmLevel;bgmRole='transition';
 return new Promise(resolve=>{
  const transition={resolve,elapsed:0,stamp:null,timer:0,armed:false};bgmTransition=transition;
  function step(){
   transition.timer=0;
   if(bgmTransition!==transition||!canContinue()){if(bgmTransition===transition){bgmTransition=null;resolve(false);}return;}
   const now=performance.now();
   if(app.paused||document.hidden||!inView){
    transition.stamp=null;transition.armed=false;
    if(bgmGain&&audio){const t=audio.currentTime;bgmGain.gain.cancelScheduledValues(t);bgmGain.gain.setValueAtTime(bgmLevel,t);}
    transition.timer=setTimeout(step,40);return;
   }
   if(transition.stamp!==null)transition.elapsed+=Math.max(0,now-transition.stamp);transition.stamp=now;
   const t=Math.min(1,transition.elapsed/BET_FADE_MS);bgmLevel=initial*(1-t);
   if(bgmGain&&audio?.state==='running'){
    if(!transition.armed){const at=audio.currentTime;bgmGain.gain.cancelScheduledValues(at);bgmGain.gain.setValueAtTime(bgmLevel,at);bgmGain.gain.linearRampToValueAtTime(0,at+Math.max(.001,(BET_FADE_MS-transition.elapsed)/1000));transition.armed=true;}
   }else bgmPlayer.volume=bgmLevel;
   if(t<1)transition.timer=setTimeout(step,40);
   else{bgmTransition=null;startGameTrack().then(resolve,()=>resolve(false));}
  }
  step();
 });
}
''' +s[b:]
p.write_text(s)
base=Path('/tmp/surface-bgm-before.html').read_text()
for start,end in [('class Engine{','const elixirGlyphs='),('const PHYSICS=(()=>{','const DRAW=(()=>{')]:
 if start in base and end in base:
  assert base[base.index(start):base.index(end,base.index(start))]==s[s.index(start):s.index(end,s.index(start))],start
for i,m in enumerate(re.finditer(r'<script\b([^>]*)>([\s\S]*?)</script>',s)):
 attrs,body=m.groups()
 if not body.strip() or re.search(r'type=[\"\x27](?:application/json|importmap)',attrs):continue
 f=Path('/tmp')/f'followup-script-{i}.mjs';f.write_text(body);subprocess.run(['node','--check',str(f)],check=True)
p=Path('qa_surface_music.py');t=p.read_text()
a=" page.evaluate('__qa.startReadyRound()');page.wait_for_function(\"__qa.role==='transition'\");page.wait_for_timeout(350)\n mid=page.evaluate('({role:__qa.role,level:__qa.level,src:__qa.player.getAttribute(\"src\")})');print('BET_FADE_MID',mid,flush=True)"
b=""" page.evaluate('''()=>{window.__fadeSample=null;window.__fadeStarted=__qa.startReadyRound();__qa.driver.setPaused(true);const probe=()=>{if(__qa.role==='transition'&&__qa.level<.074&&__qa.level>.001){window.__fadeSample={role:__qa.role,level:__qa.level,src:__qa.player.getAttribute('src')};return;}if(__qa.role!=='game')setTimeout(probe,15);};setTimeout(probe,15);}''')
 try:page.wait_for_function('window.__fadeSample!==null',timeout=15000)
 except Exception:
  print('FAILED_FADE',page.evaluate('__qa.diagnostic'),page.evaluate('window.__fadeStarted'),errors,flush=True);raise
 mid=page.evaluate('window.__fadeSample');print('BET_FADE_MID',mid,flush=True)"""
assert t.count(a)==1;t=t.replace(a,b,1)
# Isolate audio lifecycle tests from the expensive software-rasterized 3D simulation.
t=t.replace("page.evaluate('__qa.startReadyRound()')","page.evaluate('(()=>{const ok=__qa.startReadyRound();__qa.driver.setPaused(true);return ok;})()')")
a=" # Stage transitions are sampled in the real renderer; no abrupt text/color update."
b=""" # Muting during the BET fade must restore the game track, not the BET track.
 page.evaluate('(()=>{const ok=__qa.startReadyRound();__qa.driver.setPaused(true);return ok;})()');page.wait_for_function("__qa.role==='transition'",timeout=15000)
 page.evaluate("const b=document.querySelector('#sound');b.checked=false;b.onchange();b.checked=true;b.onchange();")
 page.wait_for_function("__qa.role==='game'&&!__qa.player.paused&&__qa.tracks.includes(__qa.player.getAttribute('src'))",timeout=15000)
 page.evaluate('__qa.debugResetRound();__qa.freezeRounds()')
 page.evaluate("const b=document.querySelector('#sound');b.checked=false;b.onchange();b.checked=true;b.onchange();")
 page.wait_for_function("__qa.role==='bet'&&!__qa.player.paused&&__qa.player.getAttribute('src')===__qa.bet",timeout=15000)
 print('SOUND_TOGGLE_DURING_FADE_AND_BET_OK',flush=True)
 page.evaluate('__qa.driver.setPaused(false)')
 # Stage transitions are sampled in the real renderer; no abrupt text/color update."""
assert t.count(a)==1;t=t.replace(a,b,1)
p.write_text(t)
raw=s.encode();print('FOLLOWUP_SOURCE_OK',hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest())

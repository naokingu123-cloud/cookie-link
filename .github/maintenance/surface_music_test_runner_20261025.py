from pathlib import Path
import runpy
p=Path('qa_surface_music.py');s=p.read_text()
s=s.replace("page.on('pageerror',lambda e:errors.append(str(e)))", "page.on('pageerror',lambda e:(errors.append(str(e)),print('PAGE_ERROR',str(e),flush=True)))")
s=s.replace("get preparing(){return audioPreparing}","get preparing(){return audioPreparing},get diagnostic(){return {phase:app.phase,token:app.token,paused:app.paused,inView,hidden:document.hidden,userPaused,menuOpen,roundStarting,debugResetting,rouletteReady,bets:app.bets,role:bgmRole,epoch:audioRoundEpoch,serial:bgmTransitionSerial,transition:bgmTransition?{elapsed:bgmTransition.elapsed,stamp:bgmTransition.stamp}:null,level:bgmLevel,preparing:audioPreparing,attempt:audioAttempt,needsGesture:audioNeedsGesture,state:audio?.state,source:bgmPlayer.getAttribute('src'),time:bgmPlayer.currentTime,playerPaused:bgmPlayer.paused,mediaState:bgmPlayer.readyState,mediaError:bgmPlayer.error?.message,drawError:app.drawError}}")
a="  choices.append(page.evaluate('__qa.selected'));page.evaluate('__qa.startReadyRound()');page.wait_for_function(\"__qa.role==='game'&&!__qa.player.paused&&__qa.player.currentTime>.08\",timeout=15000)"
b="""  choices.append(page.evaluate('__qa.selected'));print('BEFORE_REPEAT',k,page.evaluate('__qa.diagnostic'),flush=True);started=page.evaluate('__qa.startReadyRound()');print('STARTED_REPEAT',k,started,page.evaluate('__qa.diagnostic'),flush=True)
  try:page.wait_for_function("__qa.role==='game'&&!__qa.player.paused&&__qa.player.currentTime>.08",timeout=20000)
  except Exception:
   print('FAILED_REPEAT',k,page.evaluate('__qa.diagnostic'),errors,flush=True);raise
  print('AFTER_REPEAT',k,page.evaluate('__qa.diagnostic'),flush=True)"""
assert s.count(a)==1;s=s.replace(a,b,1)
p.write_text(s)
runpy.run_path(str(p),run_name='__main__')

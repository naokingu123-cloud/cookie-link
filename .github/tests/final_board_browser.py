from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
import threading,json
from playwright.sync_api import sync_playwright
root=Path.cwd();html=(root/'index.html').read_text();anchor='setupManualNumbers();'
hook='''window.__se={requestReach,chocoWaitForPayout,withoutCanyonFrames:async fn=>{const old=chocoQueueFrame;chocoQueueFrame=()=>{};try{return await fn();}finally{chocoQueueFrame=old;}},app,slots,unlock,prepareSceneSounds,sceneSound,SCENE_SOUND_KEYS,stopSounds,chocoEvent,chocoScaleValue,chocoPayoutFlightProgress,sixCandyAudio,chocoRockAudio,Engine,ChocoDigEngine,SixBallCandyEngine,sixEmpty,sixClone,event,finishGamePresentation,get buffers(){return sfxBuffers},get voices(){return sfxVoices},get gain(){return bgmGain},get audio(){return audio},select,freeze(){stopAutoRound();autoRoundRemaining=3600000;},pause(v){userPaused=v;syncPause();}};'''
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
 const q=__se;q.freeze();q.pause(false);q.app.phase='playing';q.app.draws=[1,2,3,4,5,6,7,8];q.app.locked=[100,100,100];q.app.bets=[100,100,100];q.app.enabled=[true,true,true];q.app.paid=[false,false,false];document.querySelector('#sound').checked=false;
 const reports=[];
 for(const [i,C] of [[0,q.Engine],[1,q.ChocoDigEngine],[2,q.SixBallCandyEngine]]){
  const events=[];let checked=false;const s=q.slots[i],originalEvent=q.app.engines[i].onEvent;let seed=41+i;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const e=new C({random,sleep:()=>Promise.resolve(),onEvent:(ev,e)=>{events.push(ev.phase);if(ev.phase==='error')throw Error(ev.message);originalEvent(ev,e);if(ev.phase==='complete'&&!checked)throw Error('Ended before reach');}});
  s.engine=e;q.app.engines[i]=e;e.roundBet=100;if(i===1)e.visualWait=async(ms,token)=>token===e.version;e.start();
  for(let k=0;k<10000&&e.opening;k++)await Promise.resolve();
  e.processed=7;e.accepted=7;e.drawn=new Set([1,2,3,4,5,6,7]);e.seen=new Set(e.drawn);e.pendingDraws=new Set();
  if(i===2){const g=q.sixEmpty(10);for(let c=0;c<4;c++)g[9][c]={id:100+c,color:0,number:null};g[9][7]={id:108,color:2,number:null};g[0][0]={id:109,color:1,number:8};e.pyramid=g;e.initialPyramid=q.sixClone(g);e.remainingCandies=6;}
  e.beforeComplete=async token=>{if(e.processed!==8||e.fx||e.queue.length)throw Error('Unsettled final board');const start=performance.now();await q.finishGamePresentation(s,e,q.app,token);if(s.reachStatus!=='ready'||s.reachAfterBall!==8)throw Error('Final reach missing '+i);if(e.phase==='complete'||performance.now()-start<590)throw Error('Premature complete');checked=true;};
  e.enqueue(8);const until=performance.now()+15000;while(e.phase!=='complete'&&performance.now()<until)await new Promise(r=>setTimeout(r,16));
  if(e.phase!=='complete'||!checked)throw Error('No completion '+i+' '+JSON.stringify({phase:e.phase,processed:e.processed,fx:e.fx?.phase,win:s.chocoWinCounting,award:s.chocoAward,flights:s.chocoPayoutFlights?.filter(f=>!f.landed).map(f=>({held:f.held,landAt:f.landAt})),time:s.chocoTime,paused:q.app.paused,reach:s.reachStatus}));
  if(i===0&&!events.includes('refill'))throw Error('Cookie no refill');if(i===2&&(!events.includes('pyramidRefill')||e.roundIndex!==2))throw Error('No eighth-ball next board');
  if(events.lastIndexOf('settled')>events.indexOf('complete'))throw Error('Bad event order');reports.push({game:i,reachAfterBall:s.reachAfterBall,round:e.roundIndex,refillBeforeComplete:i===2?events.indexOf('pyramidRefill')<events.indexOf('complete'):true});
 }
 if(q.app.phase!=='result'||!q.app.paid.every(Boolean))throw Error('Eight balls did not enter actual Arcade result');
 // A completed payout must release the eighth-ball waiter without a canvas RAF.
 await q.withoutCanyonFrames(async()=>{const e={version:99,totalHundredths:0,cart:[],fx:null},s={i:1,engine:e};q.chocoScaleValue(s,e,100,0);e.totalHundredths=100;q.chocoScaleValue(s,e,100,0);s.chocoTime=10000;s.chocoClockStamp=performance.now();await Promise.race([q.chocoWaitForPayout(s,99),new Promise((_,reject)=>setTimeout(()=>reject(Error('Payout waiter depends on RAF')),1000))]);if(s.chocoWinCounting||s.chocoWinValue!==100)throw Error('Payout did not finalize');});
 // Prediction errors must not trap the game in the final pending-reach loop.
 {const s=q.slots[2],e=s.engine;e.phase='settled';s.reachBoardKey=null;e.reachSnapshot=()=>({predict(){throw Error('injected reach preview failure')}});await q.finishGamePresentation(s,e,q.app,e.version);if(s.reachStatus!=='error')throw Error('Prediction failure not released');}
 q.pause(true);return reports;
 }''');assert not errors,errors;print('FINAL_EIGHTH_BALL_REACH_PASS',json.dumps(result));b.close()
server.shutdown()

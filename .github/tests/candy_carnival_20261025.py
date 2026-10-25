from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
import threading,json,math
from playwright.sync_api import sync_playwright
root=Path.cwd();source=(root/'index.html').read_text()
anchor="app=new Arcade({onEvent:recordEvent,onChange:recordChanged});app.drawSource=rouletteDrawSource;try{app.engines[1].enablePersistence(localStorage);}catch{}select(2);"
assert source.count(anchor)==1
hook=r'''window.__candyQA={app,slots,Engine,ChocoDigEngine,CandyCarnivalEngine,Arcade,RecordBook,select,hud,carnivalEvent,drawCarnival,chocoHud,carnivalHud,requestReach,reachContext,reachContextKey,reachAvailable,visibleTabReachResults,predictNextHit,copyReachState,showLinks,clearMarks,showSugarAward,stopSugarAward,payoutTenths,renderRoundResult,startReadyRound,debugResetRound,syncPause,activateGameAudio,get driver(){return rouletteDriver},get ready(){return rouletteReady},get active(){return active},get bgm(){return {level:bgmLevel,role:bgmRole,source:bgmPlayer.getAttribute('src')}},freeze(){autoRoundRemaining=3600000;stopAutoRound();},hold(){userPaused=true;syncPause();},resume(){userPaused=false;syncPause();}};document.querySelector('#sound').checked=false;'''
html=source.replace(anchor,anchor+hook)
class H(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kw):super().__init__(*args,directory=str(root),**kw)
 def log_message(self,*args):pass
 def do_GET(self):
  try:
   if self.path.split('?')[0] in ['/','/index.html']:
    b=html.encode();self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Content-Length',str(len(b)));self.end_headers();self.wfile.write(b)
   else:super().do_GET()
  except (BrokenPipeError,ConnectionResetError):pass
server=ThreadingHTTPServer(('127.0.0.1',0),H);threading.Thread(target=server.serve_forever,daemon=True).start()
out=root/'qa-carnival';out.mkdir(exist_ok=True);errors=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'])
 ctx=browser.new_context(viewport={'width':430,'height':932},is_mobile=True,has_touch=True);page=ctx.new_page();page.on('pageerror',lambda e:(errors.append(str(e)),print('PAGE_ERROR',e,flush=True)))
 url=f'http://127.0.0.1:{server.server_port}/index.html';page.goto(url,wait_until='domcontentloaded');page.wait_for_function('window.__candyQA?.ready',timeout=30000);page.evaluate('__candyQA.freeze();__candyQA.hold();document.fonts.ready');page.wait_for_timeout(300)
 assert page.evaluate('__candyQA.active')==2
 assert page.evaluate('__candyQA.app.bets')==[3000,3000,3000]
 print('LOADED_THREE_DISTINCT_TABS_AND_3000_BET',flush=True)
 stats=page.evaluate(r'''async()=>{
 const q=__candyQA,check=(v,m)=>{if(!v)throw Error(m)},sleep=()=>Promise.resolve(),wait=async(fn,max=14000)=>{for(let i=0;i<max;i++){if(fn())return;await Promise.resolve();}throw Error('Engine not settled');},runs=[];
 for(const seed of [1,7,31,1707,9001]){
  let rng=seed;const events=[],e=new q.CandyCarnivalEngine({sleep,random:()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;},onEvent:ev=>events.push(ev)});e.roundBet=3000;check(!e.deck.length,'BET mapping exposed');e.start();check(e.deck.length===25&&e.deck.filter(x=>x.rainbow).length===1,'Deck invalid');
  for(let n=1;n<=8;n++)check(e.enqueue(n),'Valid number rejected');await wait(()=>!e.running);
  check(e.phase==='complete'&&e.processed===8&&e.accepted===8,'Candy round incomplete');check(e.jars.every(n=>n>=0&&n<=4),'Jar overflow');check(e.completedJars===e.filled.filter(Boolean).length,'Completion count');
  check(e.totalHundredths===e.completedJars*50+(e.completedJars>=3?300:0)+(e.completedJars===5?1000:0),'Repeated or missing reward');check(events.filter(ev=>ev.phase==='settled').length===8,'Not single-ball processing');check(e.maxLink===0&&e.maxChain===0&&e.allClears===0&&e.roundCleared===0,'Candy changed cookie stats');
  runs.push({seed,jars:e.jars,total:e.totalHundredths});e.reset();check(e.jars.every(n=>n===0)&&e.totalHundredths===0&&!e.deck.length,'Reset retained jars');e.roundBet=0;e.start();check(!e.running&&!e.enqueue(9),'0 BET ran');
 }
 const events=[],g=new q.CandyCarnivalEngine({sleep,onEvent:ev=>events.push(ev)});g.roundBet=3000;g.start();g.deck=Array.from({length:25},(_,i)=>({number:i+1,color:i%5,amount:3,rainbow:i===5}));
 for(let n=1;n<=8;n++)g.enqueue(n);await wait(()=>!g.running);check(g.completedJars===5&&g.totalHundredths===1550,'Grand reward');check(events.filter(e=>e.phase==='stepcollect').length===1&&g.roundSteps===1&&g.wonderToken.value===3000,'Sugar not exactly once');check(g.plan([7,8]).gain===0,'Completed bottles paid twice');
 const valid=new q.CandyCarnivalEngine({sleep});valid.start();valid.busy=true;check(valid.enqueueBatch([1]),'Valid enqueue');check(!valid.enqueueBatch([1])&&!valid.enqueueBatch([2,2])&&!valid.enqueueBatch([0])&&!valid.enqueueBatch([26]),'Invalid batch accepted');check(valid.accepted===1,'Invalid input mutated accepted count');valid.reset();
 let release;const r=new q.CandyCarnivalEngine({sleep:()=>new Promise(ok=>release=ok)});r.start();r.enqueue(1);r.reset();release();await Promise.resolve();await Promise.resolve();check(r.phase==='ready'&&r.processed===0&&r.jars.every(n=>n===0),'Stale task changed reset game');
 let callback;const a=new q.Arcade({sleep,onEvent:(i,ev)=>{if(ev.phase==='error')throw Error(ev.message);}});a.drawSource={ready:true,start(c){callback=c},reset(){},pause(){}};check(a.start(),'Mixed start');await wait(()=>a.engines.every(e=>!e.opening));
 callback.onNumber(1);await wait(()=>a.engines[2].processed===1&&a.engines[2].idle);check(a.engines[0].processed===0&&a.engines[1].processed===0,'Grouped boards resolved first ball');callback.onNumber(2);await wait(()=>a.engines[2].processed===2&&a.engines[2].idle);check(a.engines[0].processed===0,'Grouped board resolved second ball');
 for(let n=3;n<=8;n++)callback.onNumber(n);await wait(()=>a.phase==='result');check(a.engines.every(e=>e.processed===8)&&a.paid.every(Boolean),'Mixed completion');check(a.engines[0].constructor===q.Engine&&a.engines[1] instanceof q.ChocoDigEngine&&a.engines[2] instanceof q.CandyCarnivalEngine,'Wrong tab');
 const before=a.credit,total=a.roundWins.reduce((n,v)=>n+v,0);a.advanceResult(100000);a.advancePayout(100000);a.beginPayout();check(a.credit===before+total,'Credit paid twice');
 const record=new q.RecordBook({getItem(){return null},setItem(){}});record.capture(a);const records=JSON.stringify(record.data);record.capture(a);check(JSON.stringify(record.data)===records,'Record duplicated');
 return {runs,grand:g.totalHundredths,sugar:g.roundSteps,mixed:a.roundWins,credit:a.credit};
 }''')
 print('CANDY_SINGLE_DRAW_REWARDS_ZERO_BET_RESET_MIXED_PAYOUT_OK',stats,flush=True)
 reach=page.evaluate(r'''async()=>{
 const q=__candyQA,check=(v,m)=>{if(!v)throw Error(m)},delay=ms=>new Promise(r=>setTimeout(r,ms));let randomCalls=0;
 const e=new q.Engine({random:()=>{randomCalls++;return .37},sleep:()=>Promise.resolve()});
 e.board=Array.from({length:8},()=>Array(8).fill(null));for(let i=0;i<3;i++)e.board[7][i*2]={id:900+i,color:i,number:i+1,special:false,step:null};
 Object.assign(e,{running:true,busy:false,opening:false,phase:'waiting',queue:[],processed:0,accepted:0});
 const a={phase:'playing',token:777,draws:[1],bet:()=>3000},s={i:0,engine:e},ready=async()=>{for(let i=0;i<100;i++){if(s.reachStatus==='ready')return;await delay(2);}throw Error('Reach not ready '+s.reachStatus);};
 e.pendingDraws=new Set([1]);q.requestReach(s,e,a);await delay(10);check(!q.reachContext(e,a)&&s.reachResults.length===0,'Reach visible after 1');
 a.draws=[1,2];e.pendingDraws.add(2);const board=JSON.stringify(e.board),calls=randomCalls;q.requestReach(s,e,a);await ready();
 check(JSON.stringify(q.reachContext(e,a).pending)==='[1,2]','Missing pending union');const target=s.reachResults.find(p=>p.number===3);check(target?.allClear&&target.gain>0,'Combined 3rd-ball all-clear missing');check(!q.predictNextHit(e,3)?.allClear,'Fixture does not distinguish single from batch');check(!s.reachResults.some(p=>[1,2].includes(p.number)),'Already landed candidate');check(JSON.stringify(e.board)===board&&randomCalls===calls,'Prediction mutated live board/RNG');
 const updated=[s.reachAfterBall];a.draws=[1,2,3];e.pendingDraws.clear();e.processed=3;e.accepted=3;q.requestReach(s,e,a);check(s.reachStatus==='inactive'&&q.visibleTabReachResults(s,a).length===0,'Reach visible after 3');
 a.draws.push(4);e.pendingDraws.add(4);q.requestReach(s,e,a);await ready();check(JSON.stringify(q.reachContext(e,a).pending)==='[4]','Fourth not conditional on fifth');updated.push(s.reachAfterBall);
 for(let n=5;n<=8;n++){a.draws.push(n);e.pendingDraws.clear();e.processed=n;e.accepted=n;e.phase=n===8?'complete':'settled';q.requestReach(s,e,a);await ready();updated.push(s.reachAfterBall);}
 check(JSON.stringify(updated)==='[2,4,5,6,7,8]','Incorrect grouped reach cadence '+updated);
 e.reachMode='single';a.draws=[1];e.processed=1;e.accepted=1;e.phase='waiting';q.requestReach(s,e,a);await ready();check(s.reachAfterBall===1,'Future single-ball game incorrectly gated');delete e.reachMode;
 a.draws=[1,2];e.processed=0;e.accepted=0;e.pendingDraws=new Set([1,2]);q.requestReach(s,e,a);a.draws.push(3);q.requestReach(s,e,a);await delay(30);check(s.reachStatus==='inactive'&&s.reachResults.length===0,'Stale prediction resurfaced');
 // Compare the synchronous union predictor with actual grouped Engine execution.
 let compared=0;
 for(const pending of [[1,2],[4]])for(const n of [3,8,17]){
  if(pending.includes(n))continue;let seed=91;const base=new q.Engine({random:()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;},sleep:()=>Promise.resolve()});
  const prediction=q.predictNextHit(base,n,pending),trial=new q.Engine({sleep:()=>Promise.resolve()});Object.assign(trial,q.copyReachState(base));trial.onEvent=()=>{};trial.running=true;trial.busy=false;trial.opening=false;trial.phase='waiting';trial.queue=[];trial.seen=new Set();trial.pendingDraws=new Set();trial.drawn=new Set();trial.processed=0;trial.accepted=0;
  trial.enqueueBatch([...pending,n]);for(let i=0;i<6000&&!trial.idle;i++)await Promise.resolve();check(trial.idle,'Trial stuck');check((prediction?.total||base.totalHundredths)===trial.totalHundredths,'Prediction differs from grouped play');compared++;
 }
 return {updated,thirdAllClear:target,randomUnchanged:true,compared};
 }''')
 print('CONDITIONAL_REACH_2_4_5_6_7_8_UNION_RNG_AND_CANCELLATION_OK',reach,flush=True)
 page.screenshot(path=str(out/'candy-bet-430.png'))
 # Actual app routing, not only standalone engine calls.
 page.evaluate("__candyQA.app.setBet(0,0);__candyQA.app.setBet(1,0);__candyQA.resume();__candyQA.freeze();__candyQA.startReadyRound();__candyQA.driver.setPaused(true)")
 page.evaluate("__candyQA.app.acceptNumber(1,__candyQA.app.token)")
 page.wait_for_function('__candyQA.app.engines[2].processed===1',timeout=10000)
 assert page.evaluate('__candyQA.app.engines[0].processed')==0
 page.screenshot(path=str(out/'candy-playing-430.png'))
 for n in range(2,9):page.evaluate('(n)=>__candyQA.app.acceptNumber(n,__candyQA.app.token)',n)
 page.wait_for_function("['result','paying','complete'].includes(__candyQA.app.phase)",timeout=30000);page.evaluate('__candyQA.hold()');page.wait_for_timeout(100)
 assert 'キャンディカーニバル' in page.locator('#result-games').inner_text();page.screenshot(path=str(out/'candy-result-430.png'))
 page.evaluate('__candyQA.debugResetRound();__candyQA.freeze();__candyQA.hold();__candyQA.app.setBet(0,3000);__candyQA.app.setBet(1,3000);__candyQA.select(2)')
 page.wait_for_timeout(100)
 def geometry(pg,width,height):
  pg.set_viewport_size({'width':width,'height':height});pg.wait_for_timeout(250)
  data=pg.evaluate(r'''()=>{
   const q=__candyQA,a=q.app,s=q.slots[2],rect=el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};},inside=(b,o)=>b.x>=o.x-2&&b.y>=o.y-2&&b.right<=o.right+2&&b.bottom<=o.bottom+2,overlap=(b,o)=>b.x<o.right&&b.right>o.x&&b.y<o.bottom&&b.bottom>o.y,check=(v,m)=>{if(!v)throw Error(m);};
   q.select(2);q.hud(a);q.drawCarnival(s);const board=rect(s.candyCanvas),game=rect(document.querySelector('#screen>.game')),strip=rect(document.querySelector('.roulette-info-strip'));check(inside(board,game),'Candy canvas outside game');check(!overlap(board,strip),'Board overlaps text strip');
   const sidebar=document.querySelector('#carnival-odds');check(sidebar.scrollHeight<=sidebar.clientHeight+2,'Candy sidebar overflow');
   const sizes=[];
   for(const gain of [50,300,1000]){q.carnivalEvent(s,{phase:'candyAward',gain,plan:{party:gain===300,grand:gain===1000}},s.engine,a);for(const an of s.candyReward.getAnimations())an.finish();const r=rect(s.candyReward);check(inside(r,game)&&!overlap(r,strip),'Reward outside safe game area');sizes.push({width:r.w,font:parseFloat(getComputedStyle(s.candyReward.querySelector('strong')).fontSize),tier:s.candyReward.dataset.tier});}
   check(sizes[0].width<sizes[1].width&&sizes[1].width<sizes[2].width,'Reward widths not tiered');check(sizes[0].font<sizes[1].font&&sizes[1].font<sizes[2].font,'Reward fonts not tiered');s.candyReward.hidden=true;
   q.showSugarAward(s,[{value:3000,tier:1}]);const sugar=rect(s.sugarAwardScreen);check(s.sugarAwardScreen.parentElement.classList.contains('game'),'Sugar attached outside game');check(inside(sugar,game)&&!overlap(sugar,strip),'Sugar overlaps text strip');q.stopSugarAward(s);
   q.select(0);q.hud(a);const cookie=q.slots[0],oldBoard=cookie.engine.board,oldMax=cookie.engine.maxLink;const badges=[];
   for(const n of [7,8,9]){const cells=Array.from({length:n},(_,i)=>[3+Math.floor(i/5),1+i%5]);cookie.engine.board=Array.from({length:8},()=>Array(8).fill(null));cells.forEach(([r,c],i)=>cookie.engine.board[r][c]={id:100+i,color:0,number:i+1});cookie.engine.maxLink=n;q.showLinks(cookie,{phase:'link',groups:[{color:0,cells,size:n}],newRecord:true,previousMax:0,recordDuration:1800});const el=cookie.labels.querySelector('.record');check(!!el,'No LINK payout bubble');el.style.animation='none';const r=rect(el),expected=q.payoutTenths(n)/10>=10?'3':q.payoutTenths(n)/10>=3?'2':'1';check(el.dataset.frameTier===expected,'Payout tier is not based on multiplier');check(inside(r,game)&&!overlap(r,strip),'Cookie reward overlaps outside game');badges.push({n,tier:el.dataset.frameTier,width:r.w,height:r.h});}
   cookie.engine.board=oldBoard;cookie.engine.maxLink=oldMax;q.clearMarks(cookie);q.select(1);q.hud(a);check(getComputedStyle(document.querySelector('#choco-odds')).display!=='none'&&getComputedStyle(sidebar).display==='none','Choco tab leakage');q.select(2);q.hud(a);
   return {board,game,strip,sizes,sugar,badges};
  }''')
  pg.screenshot(path=str(out/f'candy-layout-{width}.png'));print('REWARD_BOUNDARIES_AND_LAYOUT_OK',width,height,data,flush=True);return data
 layouts=[]
 for w,h in [(430,932),(390,844),(320,568),(844,390)]:layouts.append(geometry(page,w,h))
 pc=browser.new_context(viewport={'width':1280,'height':900});pg=pc.new_page();pg.on('pageerror',lambda e:errors.append(str(e)));pg.goto(url,wait_until='domcontentloaded');pg.wait_for_function('window.__candyQA?.ready',timeout=30000);pg.evaluate('__candyQA.freeze();__candyQA.hold()');layouts.append(geometry(pg,1280,900));pc.close()
 assert not errors,errors
 (out/'verification.json').write_text(json.dumps({'engine':stats,'reach':reach,'layouts':layouts,'errors':errors,'arrival_test':'controlled accepted-number callbacks; not a full natural-physics round'},ensure_ascii=False,indent=2))
 browser.close()
server.shutdown();print('ALL_CARNIVAL_REACH_REWARD_TESTS_PASSED',flush=True)

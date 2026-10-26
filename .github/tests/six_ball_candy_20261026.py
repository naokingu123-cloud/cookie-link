from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
import threading,json
from playwright.sync_api import sync_playwright
root=Path.cwd();source=(root/'index.html').read_text()
anchor="app=new Arcade({onEvent:recordEvent,onChange:recordChanged});app.drawSource=rouletteDrawSource;try{app.engines[1].enablePersistence(localStorage);}catch{}select(2);"
assert source.count(anchor)==1
hook="""window.__sixQA={app,slots,Engine,ChocoDigEngine,SixBallCandyEngine,Arcade,SIX_PATTERNS,sixEmpty,sixClone,sixFindShapes,sixDrop,sixPlan,select,hud,drawCarnival,carnivalHud,carnivalEvent,startReadyRound,debugResetRound,requestReach,visibleReachResults,reachContext,renderRoundResult,showSugarAward,stopSugarAward,activateGameAudio,get driver(){return rouletteDriver},get ready(){return rouletteReady},get bgm(){return {level:bgmLevel,role:bgmRole,paused:bgmPlayer.paused}},freeze(){autoRoundRemaining=3600000;stopAutoRound();},hold(){userPaused=true;syncPause();},resume(){userPaused=false;syncPause();},stopPhysical(){rouletteDriver?.setPaused(true);}};document.querySelector('#sound').checked=false;"""
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
out=root/'qa-six-ball';out.mkdir(exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'])
 ctx=browser.new_context(viewport={'width':430,'height':932},is_mobile=True,has_touch=True)
 page=ctx.new_page();errors=[];page.on('pageerror',lambda e:(errors.append(str(e)),print('PAGE_ERROR',str(e),flush=True)))
 url=f'http://127.0.0.1:{server.server_port}/index.html'
 page.goto(url,wait_until='domcontentloaded');page.wait_for_function('window.__sixQA?.ready',timeout=30000);page.evaluate('__sixQA.freeze();__sixQA.hold()');page.evaluate('document.fonts.ready');page.wait_for_timeout(300)
 assert page.evaluate('__sixQA.app.bets')==[3000,3000,3000]
 assert page.evaluate('__sixQA.app.engines[2].constructor.name')=='SixBallCandyEngine'
 print('LOADED_REAL_3D_GAME_THIRD_TAB_REPLACED_3000_BET_OK',flush=True)
 stats=page.evaluate(r'''async()=>{
 const q=__sixQA,check=(v,m)=>{if(!v)throw Error(m)},same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),count=g=>g.flat().filter(Boolean).length,sleep=()=>Promise.resolve();
 const rngFor=seed=>{let x=seed;return ()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296;}};
 const stamp=(cells,color=0)=>{const g=q.sixEmpty();cells.forEach(([r,c],i)=>g[r][c]={id:i+1,number:i+1,color});return g;};
 const up=[[4,1],[5,1],[5,2],[6,1],[6,2],[6,3]],down=[[4,0],[4,1],[4,2],[5,1],[5,2],[6,2]],ring=[[4,1],[4,2],[5,3],[6,3],[6,2],[5,1]];
 for(const cells of [up,down]){const shapes=q.sixFindShapes(stamp(cells));check(shapes.length===1&&shapes[0].type==='triangle','Six-cell triangle recognition');}
 const h=stamp(ring,2);check(q.sixFindShapes(h).some(f=>f.type==='hexagon'),'Empty-center hexagon missing');h[5][2]={id:99,number:20,color:4};check(q.sixFindShapes(h).some(f=>f.type==='hexagon'),'Hexagon incorrectly depends on center color');h[4][1]=null;check(!q.sixFindShapes(h).length,'Five candies formed a hexagon');
 check(!q.sixFindShapes(stamp([[9,0],[9,1],[9,2],[9,3],[9,4],[9,5]],1)).length,'Arbitrary six-candy line awarded');
 check(q.SIX_PATTERNS.every(f=>f.cells.length===6&&f.cells.every(([r,c])=>r>=0&&r<10&&c>=0&&c<=r)),'Invalid template boundary');
 const grav=q.sixEmpty();grav[0][0]={id:100,number:1,color:0};grav[3][1]={id:101,number:2,color:1};grav[8][5]={id:102,number:3,color:2};const moves=q.sixDrop(grav);
 check(count(grav)===3&&new Set(grav.flat().filter(Boolean).map(t=>t.id)).size===3,'Gravity lost/duplicated candies');check(grav.every((row,r)=>row.every((t,c)=>!t||r===9||(grav[r+1][c]&&grav[r+1][c+1]))),'Candy stopped without floor or two supports');check(moves.every(m=>m.points.slice(1).every(([r,c],i)=>r===m.points[i][0]+1&&(c===m.points[i][1]||c===m.points[i][1]+1))),'Gravity teleported instead of adjacent roll');check(!q.sixDrop(grav).length,'Gravity not idempotent');
 // Find a deterministic multistep fixture; no test relies on renderer timing or live randomness.
 let fixture=null,fixturePlan=null;
 for(let seed=1;seed<=300&&!fixture;seed++){
  const random=rngFor(seed),g=Array.from({length:10},(_,r)=>Array.from({length:r+1},(_,c)=>({id:r*10+c+1,color:Math.floor(random()*3),number:1})));
  for(const [r,c] of [[7,2],[8,2],[8,3],[9,2],[9,3],[9,4]])g[r][c].color=0;
  g[0][0].number=25;const plan=q.sixPlan(g,[25],{trace:true});if(plan.chain>=2&&plan.hexagons>0){fixture=g;fixturePlan=plan;}
 }
 check(fixture&&fixturePlan.chain>=2,'No deterministic cascade fixture found');
 const awards=fixturePlan.timeline.filter(s=>s.phase==='pyramidAward');check(awards.reduce((n,s)=>n+s.gain,0)===fixturePlan.gain,'Duplicate/missing payout');
 for(const a of awards){check(a.gain===Math.round((a.triangles*50+a.hexagons*200)*Math.min(5,1+(a.chain-1)*.5)),'Wrong payout multiplier');check(new Set(a.removed.map(t=>t.tile.id)).size===a.removed.length,'Overlapping shapes removed twice');}
 check(count(fixturePlan.grid)+fixturePlan.removedCount===55,'Cascade refilled or lost candies');check(!q.sixFindShapes(fixturePlan.grid).length,'Final cascade was not rechecked');check(!q.sixDrop(q.sixClone(fixturePlan.grid)).length,'Final board not settled');
 // Predictor and animated engine must produce identical worlds and gains, with no RNG use.
 const events=[],e=new q.SixBallCandyEngine({random:rngFor(12),sleep,onEvent:ev=>events.push({phase:ev.phase,gain:ev.gain,chain:ev.chain})});e.roundBet=3000;e.start();e.pyramid=q.sixClone(fixture);e.initialPyramid=q.sixClone(fixture);let randomCalls=0;e.random=()=>{randomCalls++;return .3;};
 const original=JSON.stringify(e.pyramid),pred=e.predict(25);check(original===JSON.stringify(e.pyramid)&&randomCalls===0,'Prediction mutated live state/RNG');
 e.enqueueBatch([25]);for(let k=0;k<6000&&!e.idle;k++)await Promise.resolve();check(e.processed===1&&e.idle,'Cascade did not finish');check(same(e.pyramid,fixturePlan.grid)&&e.totalHundredths===pred.gain&&e.bestCascade===pred.chain,'Prediction and gameplay mismatch');
 check(e.hexagons===fixturePlan.hexagons&&e.triangles===fixturePlan.triangles,'Shape counts wrong');check(events.filter(v=>v.phase==='pyramidAward').length===fixturePlan.chain,'Cascade stages missing');
 // Finish and ensure one sugar only, even with several hexagons and repeated UI/reset calls.
 for(const n of [2,3,4,5,6,7,8])e.enqueue(n);for(let k=0;k<9000&&e.running;k++)await Promise.resolve();check(e.processed===8&&e.phase==='complete','Eight-ball completion failed');check(e.roundSteps===1&&e.wonderToken.value===3000&&events.filter(v=>v.phase==='stepcollect').length===1,'Sugar was duplicated or lost');e.reset();check(e.totalHundredths===0&&!e.fx&&e.remainingCandies===55&&count(e.pyramid)===0,'Reset left a partial board');
 const runs=[];
 for(const seed of [1,7,31,1707,9001,438,9931,50003,91919,784]){
  const evt=[],g=new q.SixBallCandyEngine({random:rngFor(seed),sleep,onEvent:ev=>{evt.push(ev.phase);if(ev.phase==='error')throw Error(ev.message);}});g.roundBet=3000;g.start();
  check(same(g.pyramid.map(r=>r.length),[1,2,3,4,5,6,7,8,9,10])&&count(g.pyramid)===55,'Not a ten-tier 55-cell pyramid');check(q.sixFindShapes(g.pyramid).length===0,'Initial solved shapes');const freq=Array(25).fill(0);g.pyramid.flat().forEach(t=>freq[t.number-1]++);check(freq.every(n=>n===2||n===3),'Numbers not distributed over all 25');
  let prev=55;for(const n of [1,2,3,4,5,6,7,8]){g.previewDraw(n);g.enqueue(n);for(let k=0;k<9000&&!g.idle;k++)await Promise.resolve();check(g.processed===n,'Single-ball processing broken');check(count(g.pyramid)<=prev,'Unexpected in-round refill');prev=count(g.pyramid);check(!q.sixFindShapes(g.pyramid).length,'Unresolved shape remains');}
  check(g.phase==='complete'&&!g.running&&!evt.includes('error'),'Round incomplete');check(g.remainingCandies+g.removedCandies===55,'Candy conservation');runs.push({seed,remaining:g.remainingCandies,tri:g.triangles,hex:g.hexagons,chain:g.bestCascade,pay:g.totalHundredths});
 }
 const zero=new q.SixBallCandyEngine({sleep});zero.roundBet=0;const before=JSON.stringify(zero.pyramid);zero.start();check(!zero.running&&!zero.enqueue(1)&&before===JSON.stringify(zero.pyramid),'Zero BET progressed');
 let callbacks;const mixed=new q.Arcade({sleep});mixed.drawSource={ready:true,start(c){callbacks=c},reset(){},pause(){}};mixed.start();for(let k=0;k<300;k++)await Promise.resolve();for(let n=1;n<=8;n++)callbacks.onNumber(n);for(let k=0;k<22000&&mixed.phase==='playing';k++)await Promise.resolve();
 check(mixed.phase==='result'&&mixed.paid.every(Boolean)&&mixed.engines.every(e=>e.processed===8),'Three mixed engines failed');check(mixed.engines[0].constructor===q.Engine&&mixed.engines[1].constructor===q.ChocoDigEngine&&mixed.engines[2].constructor===q.SixBallCandyEngine,'Wrong tab engine changed');const credit=mixed.credit,win=mixed.totalWin;mixed.beginPayout();mixed.beginPayout();check(mixed.credit===credit+win,'Double payout');
 // Cancellation: reset while waiting on a visible phase; queued old work must not replay.
 const cancel=new q.SixBallCandyEngine({sleep:()=>Promise.resolve()});cancel.start();cancel.enqueue(1);cancel.reset();for(let k=0;k<80;k++)await Promise.resolve();check(cancel.phase==='ready'&&cancel.processed===0&&!cancel.fx&&cancel.totalHundredths===0,'Stale async cascade after reset');
 window.__sixFixture=fixture;window.__sixFixturePlan=fixturePlan;
 return {patterns:q.SIX_PATTERNS.length,runs,fixture:{chain:fixturePlan.chain,tri:fixturePlan.triangles,hex:fixturePlan.hexagons,gain:fixturePlan.gain},mixed:mixed.roundWins};
 }''')
 print('PYRAMID_GEOMETRY_BOTH_TRIANGLES_HEXAGON_GRAVITY_CASCADES_PREDICTION_RESET_0BET_MIXED_OK',json.dumps(stats),flush=True)
 page.screenshot(path=str(out/'six-bet-430.png'))
 # Live UI: actual numbered arrivals use existing callbacks and real renderer.
 page.evaluate('__sixQA.app.setBet(0,0);__sixQA.app.setBet(1,0);__sixQA.resume();__sixQA.freeze();__sixQA.startReadyRound();__sixQA.stopPhysical()')
 page.wait_for_function("__sixQA.app.phase==='playing'&&__sixQA.app.engines[2].initialPyramid!==null")
 page.evaluate('''()=>{const q=__sixQA,e=q.app.engines[2];e.pyramid=q.sixClone(window.__sixFixture);e.initialPyramid=q.sixClone(e.pyramid);q.app.acceptNumber(25,q.app.token);}''')
 page.wait_for_function("__sixQA.app.engines[2].phase==='pyramidShape'",timeout=20000);page.evaluate('__sixQA.hold()');page.wait_for_timeout(250);page.screenshot(path=str(out/'six-shape-430.png'))
 assert 'HEXAGON' in page.locator('#carnival-odds').get_attribute('id').upper() or 'ヘキサゴン' in page.locator('#carnival-odds').inner_text()
 page.evaluate('__sixQA.resume();__sixQA.stopPhysical()');page.wait_for_function("__sixQA.app.engines[2].phase==='pyramidAward'",timeout=15000);page.evaluate('__sixQA.hold()');page.wait_for_timeout(260);page.screenshot(path=str(out/'six-award-430.png'))
 assert page.locator('.six-ball-surface .carnival-reward').is_visible()
 # Render all three tiers at maximum size and ensure the black message strip remains clear.
 for width,height in [(430,932),(390,844),(320,568),(844,390)]:
  page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(500)
  info=page.evaluate(r'''()=>{
   const q=__sixQA,s=q.slots[2],rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};
   const panel=rect(s.panel),canvas=rect(s.candyCanvas),strip=rect(document.querySelector('.roulette-info-strip')),odds=document.querySelector('#carnival-odds'),sizes=[];
   for(const gain of [50,300,1000]){q.carnivalEvent(s,{phase:'pyramidAward',gain,chain:3,triangles:1,hexagons:1},s.engine,q.app);s.candyReward.getAnimations().forEach(a=>a.finish());const box=rect(s.candyReward);sizes.push({gain,tier:s.candyReward.dataset.tier,box});if(box.x<panel.x-1||box.right>panel.right+1||box.y<panel.y-1||box.bottom>panel.bottom+1)throw Error('Reward outside panel');if(box.x<strip.right&&box.right>strip.x&&box.y<strip.bottom&&box.bottom>strip.y)throw Error('Reward covers black strip');}
   if(odds.scrollHeight>odds.clientHeight+2)throw Error('Shape legend clipped '+odds.scrollHeight+'/'+odds.clientHeight);
   if(canvas.w<100||canvas.h<100)throw Error('Pyramid too small');
   return{panel,canvas,strip,sizes,sidebar:[odds.scrollHeight,odds.clientHeight]};
  }''')
  assert [v['tier'] for v in info['sizes']]==['0','1','2'];page.screenshot(path=str(out/f'six-{width}.png'));print('LAYOUT_SHAPE_GUIDE_3X_10X_AND_BLACK_STRIP_OK',width,height,info,flush=True)
 page.evaluate('__sixQA.resume();__sixQA.stopPhysical()');page.wait_for_function('__sixQA.app.engines[2].processed===1',timeout=20000)
 for n in [2,3,4,5,6,7,8]:page.evaluate('(n)=>__sixQA.app.acceptNumber(n,__sixQA.app.token)',n)
 page.wait_for_function("['result','paying','complete'].includes(__sixQA.app.phase)",timeout=30000);page.evaluate('__sixQA.hold()');assert 'シックスボールキャンディ' in page.locator('#result-games').inner_text();assert 'TRIANGLE' in page.locator('#result-games').inner_text();page.screenshot(path=str(out/'six-result.png'))
 page.evaluate('__sixQA.debugResetRound();__sixQA.freeze();__sixQA.hold();__sixQA.select(0)');page.wait_for_timeout(200);assert page.locator('#panel0').is_visible() and not page.locator('#carnival-odds').is_visible()
 page.evaluate('__sixQA.select(1)');page.wait_for_timeout(200);assert page.locator('#choco-odds').is_visible()
 page.evaluate('__sixQA.select(2)');page.wait_for_timeout(200);assert page.locator('#carnival-odds').is_visible()
 # Audio is untouched, but confirm common BGM starts and survives reset on this replacement tab.
 page.evaluate('__sixQA.resume();document.querySelector("#sound").checked=true;__sixQA.activateGameAudio({gesture:true});__sixQA.freeze()');page.wait_for_function("__sixQA.bgm.role==='bet'&&!__sixQA.bgm.paused",timeout=20000)
 page.evaluate('__sixQA.startReadyRound();__sixQA.stopPhysical()');page.wait_for_function("__sixQA.bgm.role==='game'&&!__sixQA.bgm.paused&&Math.abs(__sixQA.bgm.level-.075)<.001",timeout=20000)
 page.evaluate('__sixQA.debugResetRound();__sixQA.freeze();__sixQA.activateGameAudio({gesture:true})');page.wait_for_function("__sixQA.bgm.role==='bet'&&!__sixQA.bgm.paused",timeout=20000);print('EXISTING_BGM_FIXED_GAIN_AND_RESET_OK',flush=True)
 pc=browser.new_context(viewport={'width':1280,'height':900});pg=pc.new_page();pg.on('pageerror',lambda e:errors.append(str(e)));pg.goto(url,wait_until='domcontentloaded');pg.wait_for_function('window.__sixQA?.ready',timeout=30000);pg.evaluate('__sixQA.freeze();__sixQA.hold()');pg.wait_for_timeout(500);assert pg.locator('.six-ball-surface').is_visible();pg.screenshot(path=str(out/'six-desktop.png'));pc.close()
 assert not errors,errors
 (out/'verification.json').write_text(json.dumps({'engine':stats,'errors':errors,'arrival_source':'Controlled accepted-number callbacks; not an entire natural-physics round','devices':'Chromium emulation, not a physical iPhone'},ensure_ascii=False,indent=2))
 browser.close()
server.shutdown();print('ALL_SIX_BALL_CANDY_TESTS_PASSED',flush=True)

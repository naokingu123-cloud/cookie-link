from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
import json,threading,os,base64,shutil
root=Path.cwd();source=(root/'index.html').read_text();memory=os.environ.get('SIX_MEMORY')=='1'
anchor="app=new Arcade({onEvent:recordEvent,onChange:recordChanged});app.drawSource=rouletteDrawSource;try{app.engines[1].enablePersistence(localStorage);}catch{}select(2);"
assert source.count(anchor)==1
hook="""window.__qa={app,slots,select,drawCarnival,carnivalEvent,carnivalHud,sixArtCandySprite,sixArtNumberSprite,sixCandyPng,sixCandyPngState,sixDemo,sixCapacity,sixEmpty,sixLayout,sixXY,sixPoint,sixStep,sixPatterns,sixFindShapes,sixResolve,sixPlan,sixMakeBoard,sixDrop,sixClone,sixCount,sixMotionPoint,SixBallCandyEngine,Engine,ChocoDigEngine,Arcade,sixCandyAudio,stopSounds,startReadyRound,debugResetRound,unlock,get soundBuffers(){return sfxBuffers},get voices(){return sfxVoices},get audio(){return audio},get ready(){return rouletteReady},get driver(){return rouletteDriver},freeze(){stopAutoRound();autoRoundRemaining=3600000;userPaused=true;syncPause();},resume(){userPaused=false;syncPause();},redraw(){slots[2].candyKey='';carnivalHud(app);drawCarnival(slots[2]);},captureNumbers(){const old=sixPaintCandyNumber,seen=[];sixPaintCandyNumber=(x,n,...v)=>{seen.push(n);old(x,n,...v)};try{drawCarnival(slots[2])}finally{sixPaintCandyNumber=old}return seen}};document.querySelector('#sound').checked=false;__qa.freeze();"""
html=source.replace(anchor,anchor+hook)
if memory:html=html.replace('assets/six-candy-png/candies.webp?v=staggered-v1','data:image/webp;base64,'+base64.b64encode((root/'assets/six-candy-png/candies.webp').read_bytes()).decode())
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(root),**kw)
 def log_message(self,*a):pass
 def do_GET(self):
  try:
   if self.path.split('?')[0] in ['/','/index.html']:
    b=html.encode();self.send_response(200);self.send_header('Content-Type','text/html;charset=utf-8');self.send_header('Content-Length',str(len(b)));self.end_headers();self.wfile.write(b)
   else:super().do_GET()
  except (BrokenPipeError,ConnectionResetError):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();out=Path('qa-six-staggered');out.mkdir(exist_ok=True);errors=[];bad=[];report={}
with sync_playwright() as p:
 opts={'headless':True,'args':['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']}
 if memory:opts['executable_path']='/usr/bin/chromium'
 browser=p.chromium.launch(**opts);context=browser.new_context(viewport={'width':430,'height':932},is_mobile=True,has_touch=True,device_scale_factor=2)
 page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('response',lambda r:bad.append([r.status,r.url]) if r.status>=400 else None)
 url=f'http://127.0.0.1:{server.server_port}/index.html'
 if memory:page.set_content(html,wait_until='domcontentloaded')
 else:page.goto(url,wait_until='domcontentloaded')
 page.wait_for_function('window.__qa?.sixCandyPngState.loaded',timeout=30000);page.wait_for_timeout(200)
 if not memory:page.wait_for_function('__qa.ready',timeout=30000)
 report['roulette_loaded']=page.evaluate('__qa.ready');report['memory_only']=memory
 assert page.evaluate('__qa.app.engines[2].rows')==8
 for rows in [7,8,9,10]:
  page.select_option('#six-row-select',str(rows));page.evaluate('__qa.redraw()');assert page.evaluate('__qa.app.engines[2].remainingCandies')==(rows//2)*15+(8 if rows%2 else 0)
 page.select_option('#six-row-select','8');page.evaluate('__qa.redraw()');assert page.evaluate('__qa.captureNumbers()')==[]
 assert '4色' in page.locator('.six-round-label').inner_text()
 page.screenshot(path=str(out/'bet-430.png'))
 if memory:page.evaluate('__qa.app.drawSource={ready:true,start(){},pause(){},reset(){}};__qa.resume();__qa.app.start();__qa.freeze();__qa.redraw()')
 else:page.evaluate('__qa.resume();__qa.startReadyRound();__qa.driver.setPaused(true);__qa.freeze();__qa.redraw()')
 page.wait_for_timeout(200)
 assert page.evaluate('__qa.app.phase')=='playing'
 assert page.evaluate('__qa.app.engines[2].pyramid.flat().filter(Boolean).length')==60
 assert sorted(page.evaluate('__qa.captureNumbers()'))==list(range(1,26))
 report['art']=page.evaluate('''()=>{const q=__qa,e=q.app.engines[2],before=JSON.stringify(e.pyramid),old=Math.random;const numbers=[],flavors=[];const hash=cv=>{let h=2166136261;for(const v of cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data)h=Math.imul(h^v,16777619)>>>0;return h};try{Math.random=()=>{throw Error('Live RNG used by art')};for(let n=1;n<=25;n++)numbers.push(hash(q.sixArtNumberSprite(n)));for(let c=0;c<4;c++){const a=q.sixArtCandySprite(c),ref=document.createElement('canvas');ref.width=ref.height=128;ref.getContext('2d').drawImage(q.sixCandyPng,c*128,0,128,128,0,0,128,128);if(hash(a)!==hash(ref))throw Error('Original PNG pixels differ');flavors.push(hash(a));}q.redraw()}finally{Math.random=old}if(before!==JSON.stringify(e.pyramid))throw Error('Artwork changed board');if(new Set(numbers).size!==25||new Set(flavors).size!==4)throw Error('Duplicate art');if(q.sixArtNumberSprite(null)!==null||q.sixArtNumberSprite(0)!==null)throw Error('Blank has a numeral');const expected=document.createElement('canvas');expected.width=expected.height=160;expected.getContext('2d').drawImage(q.slots[2].candyCanvas,0,0,160,160);if(hash(expected)!==hash(q.slots[2].miniCanvas))throw Error('Mini board differs');return {numerals:numbers.length,originalFlavors:flavors.length,numbered:25,blank:35,miniMatches:true}}''')
 report['layouts']=[]
 for w,h in [(430,932),(390,844),(320,568),(844,390),(1280,900)]:
  page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(150);page.evaluate('__qa.redraw()')
  data=page.evaluate('''()=>{const q=__qa,s=q.slots[2],rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,w:r.width,h:r.height}},box=rect(s.panel),strip=rect(document.querySelector('.roulette-info-strip')),odds=document.querySelector('#carnival-odds'),logo=rect(document.querySelector('#carnival-heading .six-art-logo')),head=rect(document.querySelector('#carnival-heading'));if(odds.scrollHeight>odds.clientHeight+2)throw Error('Odds clipped');if(logo.y<head.y-.5||logo.bottom>head.bottom+.5)throw Error('Logo overflows');for(const gain of [50,300,1000,6000]){q.carnivalEvent(s,{phase:gain===6000?'pyramidAllClear':'pyramidAward',gain,chain:2,hexagons:1,triangles:0,lines:0},s.engine,q.app);s.candyReward.getAnimations().forEach(a=>a.finish());const r=rect(s.candyReward);if(r.x<box.x-1||r.right>box.right+1||r.y<box.y-1||r.bottom>box.bottom+1)throw Error('Reward outside game');if(r.x<strip.right&&r.right>strip.x&&r.y<strip.bottom&&r.bottom>strip.y)throw Error('Reward on black strip')}s.candyReward.hidden=true;return {box,logo,oddsFits:true}}''')
  report['layouts'].append({'width':w,'height':h,**data});page.screenshot(path=str(out/f'playing-{w}.png'))
 page.set_viewport_size({'width':430,'height':932});page.wait_for_timeout(150);page.evaluate('__qa.redraw()');page.locator('.carnival-canvas').screenshot(path=str(out/'board-playing.png'))
 # Exercise real inherited enqueue/drain methods, not a second implementation.
 report['rounds']=page.evaluate('''async()=>{const q=__qa,check=(v,m)=>{if(!v)throw Error(m)},rng=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296),idle=async e=>{for(let k=0;k<20000;k++){if(!e.busy&&!e.queue.length)return;await Promise.resolve()}throw Error('Engine stuck')};let rounds=0,events=0;for(const rows of [7,8,9,10])for(let seed=1;seed<=3;seed++){const errors=[],e=new q.SixBallCandyEngine({random:rng(seed*100+rows),sleep:()=>Promise.resolve(),onEvent:ev=>{events++;if(ev.phase==='error')errors.push(ev.message)}});e.setRows(rows);e.start();check(e.sixColorCount===4,'Default four');for(let n=1;n<=8;n++){const plan=q.sixPlan(e.pyramid,[n]),before=e.totalHundredths;e.enqueue(n);await idle(e);check(e.totalHundredths-before===plan.gain,'Plan / live payout');if(n<8&&plan.advance){check(e.pyramid.flat().filter(t=>t?.number!=null).length===25,'New Round numbers');check(e.sixColorCount===(e.roundIndex>=3?3:4),'Round colors')}}check(e.processed===8&&!e.running&&!errors.length,'Full round failed '+errors.join());rounds++}
 const e=new q.SixBallCandyEngine({random:rng(77),sleep:()=>Promise.resolve()});e.start();for(let n=1;n<=8;n++){const g=q.sixEmpty(8);for(let c=0;c<4;c++)g[7][c]={id:n*100+c,number:null,color:0};g[0][0]={id:n*100+9,number:n,color:1};e.pyramid=g;e.initialPyramid=q.sixClone(g);e.remainingCandies=5;const old=e.totalHundredths;e.enqueue(n);await idle(e);check(e.totalHundredths-old===6010,'60x once plus line');check(e.roundIndex===(n<8?n+1:8),'Round progression / eighth ball');check(e.sixColorCount===(e.roundIndex>=3?3:4),'4 to 3')}check(e.allClears===8&&e.lines===8,'Independent totals');e.reset();check(e.rows===8&&e.roundIndex===1,'Reset defaults');
 const a=new q.Arcade({random:rng(91),sleep:()=>Promise.resolve()});a.drawSource={ready:true,start(){},pause(){},reset(){}};a.start();for(let n=1;n<=8;n++){a.acceptNumber(n,a.token);for(const engine of a.engines)await idle(engine)}check(a.phase==='result','Mixed game result');check(a.roundWins[2]===Math.floor(3000*a.engines[2].totalHundredths/100),'Mixed payout');const credit=a.credit;a.advanceResult(100000);a.advancePayout(100000);check(a.credit===credit+a.totalWin,'Credit paid once');const paid=a.credit;a.beginPayout();a.advancePayout(100000);check(a.credit===paid,'Credit double paid');a.prepare();a.setBet(2,0);a.start();for(let n=1;n<=8;n++){a.acceptNumber(n,a.token);for(const engine of a.engines)await idle(engine)}check(a.engines[2].processed===0&&a.engines[2].totalHundredths===0,'0 bet ran');return {seededRounds:rounds,forcedAllClearRounds:8,mixedGames:true,zeroBet:true,events}}''')
 # Initial board and in-progress fall are rendered using original bitmap sprites.
 report['animation']=page.evaluate('''()=>{const q=__qa,e=q.app.engines[2],s=q.slots[2],old={pyramid:e.pyramid,fx:e.fx};let stage=null;for(let n=1;n<=25;n++){stage=q.sixPlan(e.pyramid,[n],{trace:true}).timeline.find(x=>x.phase==='pyramidFall');if(stage)break}if(!stage)throw Error('No fall fixture');e.pyramid=stage.grid;e.fx={...stage,elapsed:stage.ms*.2,stamp:null};q.drawCarnival(s);const a=s.candyCanvas.toDataURL();e.fx.elapsed=stage.ms*.75;q.drawCarnival(s);const b=s.candyCanvas.toDataURL();Object.assign(e,old);q.redraw();if(a===b)throw Error('Fall did not move');return {liveFallChangesPixels:true}}''')
 page.evaluate('__qa.debugResetRound();__qa.freeze();__qa.select(0)');page.locator('#panel0').wait_for(state='visible',timeout=10000);assert page.locator('#panel0').is_visible()
 page.evaluate('__qa.select(1)');page.locator('#choco-odds').wait_for(state='visible',timeout=10000);assert page.locator('#choco-odds').is_visible()
 page.evaluate('__qa.select(2)');page.locator('#carnival-odds').wait_for(state='visible',timeout=10000);assert page.locator('#carnival-odds').is_visible()
 assert page.evaluate('__qa.app.engines[2].rows')==8
 report['sound']=page.evaluate('''async()=>{const q=__qa;q.resume();document.querySelector('#sound').checked=true;q.unlock();if(q.audio?.state!=='running')await q.audio?.resume();q.sixCandyAudio('break');q.sixCandyAudio('fall',3);let checked=0;for(const [name,b] of q.soundBuffers){if(!name.startsWith('six-'))continue;let energy=0;for(const v of b.getChannelData(0))energy+=v*v;if(energy<.01)throw Error('Silent effect');checked++}q.stopSounds();const remaining=q.voices.size;document.querySelector('#sound').checked=false;q.freeze();if(remaining)throw Error('Reset did not cancel voices');if(checked!==4)throw Error('Effects did not initialize');return {buffers:checked,voicesAfterStop:remaining}}''')
 # Separate native desktop context, not just a mobile viewport resized to PC width.
 pc=browser.new_context(viewport={'width':1280,'height':900},is_mobile=False,device_scale_factor=1)
 pg=pc.new_page();pg.on('pageerror',lambda e:errors.append(str(e)))
 if memory:pg.set_content(html,wait_until='domcontentloaded')
 else:pg.goto(url,wait_until='domcontentloaded')
 pg.wait_for_function('window.__qa?.sixCandyPngState.loaded',timeout=30000)
 if not memory:pg.wait_for_function('__qa.ready',timeout=30000)
 pg.evaluate('__qa.redraw();document.fonts.ready');pg.wait_for_timeout(150)
 if memory:pg.evaluate('__qa.app.drawSource={ready:true,start(){},pause(){},reset(){}};__qa.resume();__qa.app.start();__qa.freeze();__qa.redraw()')
 else:pg.evaluate('__qa.resume();__qa.startReadyRound();__qa.driver.setPaused(true);__qa.freeze();__qa.redraw()')
 pg.wait_for_timeout(150);assert sorted(pg.evaluate('__qa.captureNumbers()'))==list(range(1,26))
 report['nativeDesktop']=pg.evaluate("()=>{const o=document.querySelector('#carnival-odds');if(o.scrollHeight>o.clientHeight+2)throw Error('Desktop odds clipping');return {width:innerWidth,height:innerHeight,artLoaded:__qa.sixCandyPngState.loaded,rouletteLoaded:__qa.ready,candies:__qa.app.engines[2].pyramid.flat().filter(Boolean).length}}")
 pg.screenshot(path=str(out/'desktop-native.png'));pc.close()
 assert not errors,errors
 if not memory:assert not bad,bad
 report['errors']=errors;report['failedResponses']=bad;(out/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print('STAGGERED_BROWSER_PASS',json.dumps(report,ensure_ascii=False),flush=True)
 browser.close()
server.shutdown()

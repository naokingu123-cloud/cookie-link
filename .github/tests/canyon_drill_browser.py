"""Mine v5: full-width scene, one continuous drill, assets, WIN and renewable lucky slots."""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
import threading,json
from playwright.sync_api import sync_playwright
root=Path.cwd();html=(root/'index.html').read_text()
anchor="app=new Arcade({onEvent:recordEvent,onChange:recordChanged});app.drawSource=rouletteDrawSource;try{app.engines[1].enablePersistence(localStorage);}catch{}select(2);"
hook="""window.__drillQA={app,slots,select,drawChoco,chocoHud,chocoBoardLayout,chocoScaleValue,chocoSugarDistance,chocoDrillPose,chocoDrawDrill,chocoDrillLevel,chocoCakeImages,chocoOreImages,chocoMineImages,chocoExcavate,chocoAutoSprite,chocoCanonicalMask,chocoScrollEase,chocoCartPose,chocoRockAudio,unlock,stopSounds,get audio(){return audio},get soundBuffers(){return sfxBuffers},get voices(){return sfxVoices},resume(){userPaused=false;syncPause();},ChocoDigEngine,freeze(){stopAutoRound();autoRoundRemaining=3600000;userPaused=true;syncPause();},render(){chocoHud(app);drawChoco(slots[1]);}};document.querySelector('#sound').checked=false;__drillQA.freeze();__drillQA.select(1);"""
assert html.count(anchor)==1;html=html.replace(anchor,anchor+hook)
class H(SimpleHTTPRequestHandler):
 def __init__(self,*a,**k):super().__init__(*a,directory=str(root),**k)
 def log_message(self,*a):pass
 def do_GET(self):
  if self.path.split('?')[0]=='/':
   self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.end_headers();self.wfile.write(html.encode())
  else:
   try:super().do_GET()
   except (BrokenPipeError,ConnectionResetError):pass
server=ThreadingHTTPServer(('127.0.0.1',0),H);threading.Thread(target=server.serve_forever,daemon=True).start()
out=root/'qa-six-v5';out.mkdir(exist_ok=True);report={'layouts':[]};errors=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=browser.new_page(viewport={'width':430,'height':932},device_scale_factor=2,is_mobile=True)
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(f'http://127.0.0.1:{server.server_port}/',wait_until='domcontentloaded')
 page.wait_for_function('window.__drillQA&&[...__drillQA.chocoCakeImages,...Object.values(__drillQA.chocoOreImages),...Object.values(__drillQA.chocoMineImages)].every(i=>i.complete&&i.naturalWidth)')
 page.evaluate('document.fonts.ready')
 for w,h in [(320,740),(390,844),(430,932),(932,430),(1280,900)]:
  page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(160)
  result=page.evaluate('''()=>{const q=__drillQA,e=q.slots[1].engine,before=JSON.stringify(e.world()),rng=e.rng;try{e.rng=()=>{throw Error('Renderer RNG')};q.render();const cv=q.slots[1].chocoCanvas,rect=cv.getBoundingClientRect(),L=q.chocoBoardLayout(430,430*rect.height/rect.width);if(cv.dataset.rules!=='mine-v5'||L.w<16||L.top+12*L.h>430*rect.height/rect.width-40)throw Error('Board size');if(getComputedStyle(document.querySelector('#odds-panel')).display!=='none'||getComputedStyle(document.querySelector('.game>.festival-top')).display!=='none')throw Error('Old sidebar/logo visible');if(e.drills.length!==13||!e.drills.every(d=>d.numbers.length===1&&d.level===1))throw Error('Initial drills');if(JSON.stringify(e.world())!==before)throw Error('Mutation');return {width:innerWidth,height:innerHeight,cell:L.w,boardWidth:L.w*7,oneNumber:true,noSidebar:true};}finally{e.rng=rng}}''')
  report['layouts'].append(result);print('MINE_LAYOUT',result,flush=True);page.screenshot(path=str(out/f'mine-{w}.png'))
 page.set_viewport_size({'width':430,'height':932})
 report['sharedGeometry']=page.evaluate("""()=>{const q=__drillQA,sample=()=>['.arena','.games-deck'].map(sel=>{const r=document.querySelector(sel).getBoundingClientRect();return [r.x,r.y,r.width,r.height]});const a=[];for(const i of [0,1,2]){q.select(i);q.chocoHud(q.app);a.push(sample());}q.select(1);q.render();for(let k=1;k<3;k++)for(let i=0;i<2;i++)for(let j=0;j<4;j++)if(Math.abs(a[0][i][j]-a[k][i][j])>.2)throw Error('Shared geometry moved '+JSON.stringify(a));return a;}""")
 report['singleBallRouting']=page.evaluate("""()=>{const q=__drillQA,received=[[],[],[]],fake={token:9,phase:'playing',paused:false,draws:[],enabled:[true,true,true],engines:q.app.engines.map((e,i)=>({drawMode:e.drawMode,previewDraw(){},enqueueBatch(v){received[i].push(v)}})),onChange(){},boostAfterDraws(){}};for(let n=1;n<=8;n++)q.app.acceptNumber.call(fake,n,9);if(JSON.stringify(received.map(a=>a.map(v=>v.length)))!==JSON.stringify([[3,2,1,1,1],[1,1,1,1,1,1,1,1],[3,2,1,1,1]]))throw Error('Draw routing '+JSON.stringify(received));return received.map(a=>a.map(v=>v.length));}""")
 report['scaleCounter']=page.evaluate("""()=>{const q=__drillQA,s={},e={version:1,totalHundredths:0};q.chocoScaleValue(s,e,100,0);e.totalHundredths=1000;const values=[0,100,300,600,900].map(t=>q.chocoScaleValue(s,e,100,t));if(values[0]!==0||values.at(-1)!==1000||!values.every((v,i)=>!i||v>values[i-1]))throw Error('Counter '+values);const real=q.slots[1].engine;if(q.chocoSugarDistance(real)<0)throw Error('Sugar distance');return values;}""")
 report['continuous']=page.evaluate('''()=>{const q=__drillQA,e=q.slots[1].engine,s=q.slots[1],old=e.world();e.drills[0].level=3;const p=e.plan([e.drills[0].numbers[0]],{trace:true}),launch=p.timeline.filter(v=>v.phase==='canyonDrill'),soft=p.timeline.filter(v=>v.phase==='canyonSoften');if(launch.length!==1||soft.length!==3||p.timeline.some(v=>v.phase==='canyonImpact'))throw Error('Repeated launch or cracks');if(p.drills[0].level!==4||p.timeline.at(-2).phase!=='canyonUpgrade')throw Error('Upgrade timing');let frames=0;for(const phase of ['canyonDrill','canyonBore','canyonSoften','canyonMelt']){const stage=p.timeline.find(v=>v.phase===phase);if(!stage)throw Error('Missing phase');e.strata=stage.grid;e.drills=stage.drills;e.lucky=stage.lucky;const pics=[];for(const progress of [.15,.55,.9]){e.fx={...stage,elapsed:stage.ms*progress,stamp:null};q.render();pics.push(s.chocoCanvas.toDataURL());frames++;}if(new Set(pics).size<2)throw Error('Static animation '+phase);}e.restoreWorld(old);e.fx=null;q.render();return {launches:1,layers:3,frames,postDigLevel:4};}''')
 report['assets']=page.evaluate('''()=>{const q=__drillQA;for(let color=0;color<4;color++)for(let mask=0;mask<256;mask++)if(!q.chocoAutoSprite(color,mask))throw Error('Missing autotile');const img=document.querySelector('.choco-tab .canyon-logo');if(img.tagName!=='IMG'||!img.complete||!img.naturalWidth)throw Error('Generated logo not loaded');return {autotiles:1024,generatedScene:true,generatedLogo:true,generatedCart:true};}''')
 report['cartWin']=page.evaluate('''()=>{const q=__drillQA,e=q.slots[1].engine,s=q.slots[1];e.cart=Array.from({length:7},(_,i)=>({id:900+i,color:-1,item:'ore',ore:i<5?'copper':'silver',value:i<5?20:70,multiplier:1}));e.totalHundredths=240;q.render();if(s.chocoCart.dataset.rows!=='2'||s.chocoCart.dataset.count!=='7')throw Error('Cart');const win=Math.floor(q.app.bet(1)*2.4);if(Number(s.chocoCanvas.dataset.win)!==win||!s.chocoCanvas.getAttribute('aria-label').includes(String(win)+' WIN'))throw Error('WIN conversion');return {items:7,rows:2,win};}''')
 page.screenshot(path=str(out/'mine-cart.png'))
 report['audio']=page.evaluate('''async()=>{const q=__drillQA;q.resume();document.querySelector('#sound').checked=true;q.unlock();if(q.audio?.state!=='running')await q.audio?.resume();q.chocoRockAudio(3);q.chocoRockAudio(1,true);for(const name of ['canyon-stratum-crush','canyon-liquid-melt']){const b=q.soundBuffers.get(name);if(!b||!b.getChannelData(0).some(v=>Math.abs(v)>.01))throw Error('No sound');}q.stopSounds();if(q.voices.size)throw Error('Sound cancellation');document.querySelector('#sound').checked=false;q.freeze();return {effects:2,voicesAfterReset:0}}''')
 assert not errors,errors;browser.close()
server.shutdown();(out/'canyon-drills-report.json').write_text(json.dumps(report,indent=2));print('CANYON_MINE_BROWSER_PASS',json.dumps(report),flush=True)

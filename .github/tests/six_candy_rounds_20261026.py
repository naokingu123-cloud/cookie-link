from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
import threading,json
from playwright.sync_api import sync_playwright
root=Path.cwd();source=(root/'index.html').read_text()
anchor="app=new Arcade({onEvent:recordEvent,onChange:recordChanged});app.drawSource=rouletteDrawSource;try{app.engines[1].enablePersistence(localStorage);}catch{}select(2);"
assert source.count(anchor)==1
hook="""window.__roundQA={app,slots,Engine,ChocoDigEngine,SixBallCandyEngine,Arcade,SIX_PAY,sixEmpty,sixClone,sixPoint,sixMotionPoint,sixFallOptions,sixPatterns,sixFindShapes,sixComponents,sixResolve,sixDrop,sixPlan,sixMakeBoard,sixCount,select,hud,drawCarnival,carnivalHud,carnivalEvent,startReadyRound,debugResetRound,requestReach,visibleReachResults,reachContext,renderRoundResult,showSugarAward,stopSugarAward,activateGameAudio,get driver(){return rouletteDriver},get ready(){return rouletteReady},get bgm(){return {level:bgmLevel,role:bgmRole,paused:bgmPlayer.paused}},freeze(){autoRoundRemaining=3600000;stopAutoRound();},hold(){userPaused=true;syncPause();},resume(){userPaused=false;syncPause();},stopPhysical(){rouletteDriver?.setPaused(true);}};document.querySelector('#sound').checked=false;"""
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
out=root/'qa-six-rounds';out.mkdir(exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'])
 ctx=browser.new_context(viewport={'width':430,'height':932},is_mobile=True,has_touch=True)
 page=ctx.new_page();errors=[];page.on('pageerror',lambda e:(errors.append(str(e)),print('PAGE_ERROR',str(e),flush=True)))
 url=f'http://127.0.0.1:{server.server_port}/index.html'
 page.goto(url,wait_until='domcontentloaded');page.wait_for_function('window.__roundQA?.ready',timeout=30000);page.evaluate('__roundQA.freeze();__roundQA.hold()');page.evaluate('document.fonts.ready')
 assert page.evaluate('__roundQA.app.bets')==[3000,3000,3000]
 assert 'シックスキャンディ' in page.locator('#carnival-heading').inner_text()
 print('REAL_ROULETTE_LOADED_NAME_AND_INITIAL_BET_OK',flush=True)
 stats=page.evaluate(r'''async()=>{
 const q=__roundQA,check=(v,m)=>{if(!v)throw Error(m)},same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),sleep=()=>Promise.resolve();
 const rng=seed=>{let state=seed;return ()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};};
 const tile=(id,color=0,number=null)=>({id,color,number,lean:1});
 const settle=async e=>{for(let n=0;n<50000;n++){if(!e.busy&&!e.queue.length)return;await Promise.resolve();}throw Error('Engine failed to settle: '+e.phase);};
 let initialCount=0,gravityCases=0,sweeps=0;
 for(const rows of [7,8,9,10])for(const colors of [3,4,5])for(let seed=1;seed<=18;seed++){
  const {grid}=q.sixMakeBoard(rows,colors,rng(seed*918+rows)),all=grid.flat(),labels=all.map(t=>t.number).filter(n=>n!=null).sort((a,b)=>a-b);
  check(grid.length===rows&&all.length===rows*(rows+1)/2,'Incorrect row count');check(same(labels,Array.from({length:25},(_,i)=>i+1)),'Labels are missing or duplicated');check(all.filter(t=>t.number==null).length===all.length-25,'Incorrect blanks');check(q.sixResolve(grid).cells.length===0,'Initial match');check(new Set(all.map(t=>t.color)).size===colors,'Missing color');initialCount++;
  if(seed<=3){
   const fallGrid=q.sixClone(grid);for(let r=0;r<rows;r++)for(let c=0;c<=r;c++)if((r*7+c*13+seed)%4===0)fallGrid[r][c]=null;
   const original=q.sixClone(fallGrid),ids=fallGrid.flat().filter(Boolean).map(t=>t.id).sort((a,b)=>a-b),fall=q.sixDrop(fallGrid,{trace:true});let current=original;
   for(const step of fall.steps){const moving=new Set(step.moves.map(m=>m.id));for(let k=0;k<=12;k++){
    const positions=[];for(let r=0;r<current.length;r++)for(let c=0;c<=r;c++)if(current[r][c]&&!moving.has(current[r][c].id))positions.push(q.sixPoint(r,c));for(const m of step.moves)positions.push(q.sixMotionPoint(m,k/12));
    for(let i=0;i<positions.length;i++)for(let j=i+1;j<positions.length;j++){const a=positions[i],b=positions[j];check((a.x-b.x)**2+(a.y-b.y)**2>=.999998,'Swept candies intersect');}sweeps++;
   }for(const m of step.moves)check(m.to[0]>m.from[0],'Candy moves upward');current=q.sixClone(step.grid);}
   check(same(fallGrid,current),'Fall frame final board mismatch');check(same(ids,fallGrid.flat().filter(Boolean).map(t=>t.id).sort((a,b)=>a-b)),'Falling duplicated/lost candies');
   for(let r=0;r<rows;r++)for(let c=0;c<=r;c++)check(q.sixFallOptions(fallGrid,r,c).length===0,'Unsupported settled position');gravityCases++;
  }
 }
 // No phase/id parity zig-zag in an empty shaft; stay vertically aligned.
 let g=q.sixEmpty();g[1][0]=tile(900);const start=q.sixPoint(1,0).x;const f=q.sixDrop(g,{trace:true});const end=g.flatMap((row,r)=>row.flatMap((t,c)=>t?[[r,c]]:[]))[0];check(end[0]===9&&q.sixPoint(...end).x===start,'Vertical fall drifted');
 g=q.sixEmpty();g[5][2]=tile(1);g[6][3]=tile(2,1);g[5][1]=tile(3,2);check(q.sixFallOptions(g,5,2).length===0,'Rolled through lateral blocker');g[5][1]=null;const options=q.sixFallOptions(g,5,2);check(options.length&&options[0].pivot,'Single support did not create circular roll');
 const stamp=(cells,color=0)=>{const grid=q.sixEmpty();cells.forEach(([r,c],i)=>grid[r][c]=tile(i+1,color));return grid;};
 for(const cells of [[[4,1],[5,1],[5,2],[6,1],[6,2],[6,3]],[[4,0],[4,1],[4,2],[5,1],[5,2],[6,2]]])check(q.sixFindShapes(stamp(cells)).filter(f=>f.type==='triangle').length===1,'Triangle orientation');
 const hex=[[4,1],[4,2],[5,3],[6,3],[6,2],[5,1]];check(q.sixFindShapes(stamp(hex))[0].type==='hexagon','Hexagon');
 for(const cells of [[[9,1],[9,2],[9,3],[9,4],[9,5]],[[4,1],[5,1],[6,1],[7,1]],[[4,1],[5,2],[6,3],[7,4]]]){const roles=q.sixFindShapes(stamp(cells));check(roles.length===1&&roles[0].type==='line','Line axis or one maximal line');}
 const generic=stamp([[8,2],[9,2],[9,3],[9,4]]);check(q.sixFindShapes(generic).length===0&&q.sixResolve(generic).cells.length===4,'Generic 4 connected not detected');
 const solid=Array.from({length:8},(_,r)=>Array.from({length:r+1},(_,c)=>tile(r*16+c+1)));const roles=q.sixFindShapes(solid),allocated=roles.flatMap(f=>f.cells.map(v=>v.join(',')));check(new Set(allocated).size===allocated.length,'One cell contributes to two roles');check(roles[0].type==='hexagon'&&Math.min(...roles[0].cells.map(p=>p[0]))===0,'Topmost highest role not first');
 // Stable bottom fixtures verify requested payouts and no old cascade multipliers.
 const tri=stamp([[7,1],[8,1],[8,2],[9,1],[9,2],[9,3]]);tri[9][9]=tile(99,2,1);
 let plan=q.sixPlan(tri,[1]);check(plan.triangles===1&&plan.hexagons===0&&plan.lines===0&&plan.cleared&&plan.gain===6030,'Triangle +60 all clear');
 const line=stamp([[9,1],[9,2],[9,3],[9,4]]);line[9][9]=tile(99,2,1);line[9][7]=tile(98,3);plan=q.sixPlan(line,[1]);check(plan.lines===1&&plan.gain===10&&!plan.cleared&&plan.advance,'Line award');
 generic[9][9]=tile(99,2,1);generic[9][7]=tile(98,3);plan=q.sixPlan(generic,[1]);check(plan.gain===0&&!plan.advance&&plan.chain===1&&plan.removedCount===5,'Generic clear has payout/advances');
 const hg=stamp([[7,3],[7,4],[8,5],[9,5],[9,4],[8,3]]);hg[8][4]=tile(80,2);hg[9][3]=tile(81,1);hg[9][6]=tile(82,3);hg[9][9]=tile(99,4,1);plan=q.sixPlan(hg,[1]);check(plan.hexagons===1&&plan.gain===50,'Hexagon award '+JSON.stringify(plan));
 const runs=[];for(const rows of [7,8,9,10])for(const seed of [7,31,9931]){
  const events=[],e=new q.SixBallCandyEngine({random:rng(seed),sleep,onEvent:ev=>{if(ev.phase==='error')throw Error(ev.message);events.push(ev.phase);}});e.setRows(rows);e.start();
  const before=JSON.stringify(e.pyramid),pred=e.predict(1),expected=q.sixPlan(e.pyramid,[1]);check(before===JSON.stringify(e.pyramid),'Predict mutates board');check(pred.gain===expected.gain,'Prediction mismatch');e.enqueue(1);await settle(e);check(e.totalHundredths===expected.gain,'Predicted and actual gain differ');
  for(let n=2;n<=8;n++){e.enqueue(n);await settle(e);}check(e.phase==='complete'&&e.processed===8&&e.accepted===8,'8-ball round incomplete');
  check(e.totalHundredths===e.hexagons*50+e.triangles*30+e.lines*10+e.allClears*6000,'Independent totals wrong');check(e.roundSteps<=1,'Duplicate sugar');
  runs.push({rows,seed,round:e.roundIndex,hex:e.hexagons,tri:e.triangles,line:e.lines,clear:e.allClears,total:e.totalHundredths});
  e.reset();check(e.rows===rows&&e.roundIndex===1&&e.totalHundredths===0,'Reset loses rows or retains award');e.roundBet=0;e.start();check(!e.running&&!e.enqueue(9),'0 BET starts');
 }
 // Force one completed role per draw to exercise every color boundary and queued round handoff.
 const e=new q.SixBallCandyEngine({sleep,random:rng(30)}),colors=[],rounds=[];e.start();colors.push(e.sixColorCount);
 for(let n=1;n<=8;n++){
  e.pyramid=q.sixClone(n===8?hg:tri);e.pyramid[9][9].number=n;e.initialPyramid=q.sixClone(e.pyramid);e.enqueue(n);await settle(e);rounds.push(e.roundIndex);
  if(n<8){const nums=e.pyramid.flat().filter(t=>t?.number!=null).map(t=>t.number);check(nums.length===25&&new Set(nums).size===25,'New Round labels');check(!q.sixResolve(e.pyramid).cells.length,'New Round starts matched');colors.push(e.sixColorCount);}
 }
 check(same(rounds,[2,3,4,5,6,7,8,8]),'Round transition count');check(same(colors,[5,5,4,4,3,3,3,3]),'Color progression');check(e.roundsCleared===8&&e.roundSteps===1&&e.phase==='complete','Final award/round completion');
 const abort=new q.SixBallCandyEngine({sleep,random:rng(7)});abort.start();abort.enqueue(1);await Promise.resolve();abort.reset();for(let k=0;k<300;k++)await Promise.resolve();check(abort.phase==='ready'&&!abort.running&&!abort.busy&&abort.totalHundredths===0&&abort.roundIndex===1,'Late work changed reset game');
 let cb;const a=new q.Arcade({sleep,onEvent:(i,ev)=>{if(ev.phase==='error')throw Error(ev.message);}});a.drawSource={ready:true,start(c){cb=c;},pause(){},reset(){}};a.start();for(let k=0;k<300;k++)await Promise.resolve();for(let n=1;n<=8;n++)check(cb.onNumber(n)!==false,'Shared draw rejected');for(let k=0;k<60000&&a.phase==='playing';k++)await Promise.resolve();
 check(a.phase==='result'&&a.engines.every(e=>e.processed===8)&&a.paid.every(Boolean),'Mixed games fail');check(a.engines[0].constructor===q.Engine&&a.engines[1].constructor===q.ChocoDigEngine,'Existing games replaced');const credit=a.credit,total=a.totalWin;a.advanceResult(9999);a.advancePayout(9999);a.beginPayout();check(a.credit===credit+total,'Duplicate CREDIT');
 return{initialBoards:initialCount,gravityCases,sweptSamples:sweeps,runs,rounds,colors,mixed:a.roundWins};
 }''')
 print('RULES_GRAVITY_DISJOINT_SHAPES_UNIQUE_LABELS_ROUNDS_PAYOUT_MIXED_OK',json.dumps(stats,ensure_ascii=False),flush=True)
 # Actual debug selector only resets game 3; no need to reset the common machine.
 for rows in [7,8,9,10]:
  before=page.evaluate('JSON.stringify(__roundQA.app.engines.slice(0,2).map(e=>({board:e.board,version:e.version,world:e.kind==="choco"?e.world():null})))')
  page.select_option('#six-row-select',str(rows));page.wait_for_timeout(180)
  assert page.evaluate('__roundQA.app.engines[2].rows')==rows
  assert before==page.evaluate('JSON.stringify(__roundQA.app.engines.slice(0,2).map(e=>({board:e.board,version:e.version,world:e.kind==="choco"?e.world():null})))')
  page.screenshot(path=str(out/f'rows-{rows}.png'))
 print('DEBUG_ROW_SELECTION_ISOLATED_OK',flush=True)
 for width,height in [(430,932),(390,844),(320,568),(844,390)]:
  page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(450)
  info=page.evaluate(r'''()=>{
   const q=__roundQA,s=q.slots[2],rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};const panel=rect(s.panel),strip=rect(document.querySelector('.roulette-info-strip')),odds=document.querySelector('#carnival-odds'),sizes=[];
   for(const gain of [50,300,1000,6000]){q.carnivalEvent(s,{phase:gain===6000?'pyramidAllClear':'pyramidAward',gain,chain:3,triangles:1,hexagons:1,lines:1},s.engine,q.app);s.candyReward.getAnimations().forEach(a=>a.finish());const box=rect(s.candyReward);if(box.x<panel.x-1||box.right>panel.right+1||box.y<panel.y-1||box.bottom>panel.bottom+1)throw Error('Reward outside panel');if(box.x<strip.right&&box.right>strip.x&&box.y<strip.bottom&&box.bottom>strip.y)throw Error('Reward covers black strip');sizes.push(s.candyReward.dataset.tier);}
   if(odds.scrollHeight>odds.clientHeight+2)throw Error('Payout table clipped '+odds.scrollHeight+'/'+odds.clientHeight);
   return{sizes,odds:[odds.scrollHeight,odds.clientHeight],panel};
  }''')
  assert info['sizes']==['0','1','2','2'];page.screenshot(path=str(out/f'layout-{width}.png'));print('LAYOUT_OK',width,height,info,flush=True)
 page.evaluate('__roundQA.debugResetRound();__roundQA.freeze();__roundQA.app.setBet(0,0);__roundQA.app.setBet(1,0);__roundQA.resume();__roundQA.startReadyRound();__roundQA.stopPhysical();for(const e of __roundQA.app.engines)e.presentationRate=40;')
 assert page.locator('#six-row-select').is_disabled()
 page.evaluate('for(let n=1;n<=8;n++)__roundQA.app.acceptNumber(n,__roundQA.app.token)')
 page.wait_for_function("['result','paying','complete'].includes(__roundQA.app.phase)",timeout=45000);page.evaluate('__roundQA.hold()');assert 'シックスキャンディ' in page.locator('#result-games').inner_text();assert 'Round' in page.locator('#result-games').inner_text();page.screenshot(path=str(out/'result.png'))
 page.evaluate('__roundQA.debugResetRound();__roundQA.freeze();__roundQA.hold();__roundQA.select(0)');page.wait_for_timeout(150);assert page.locator('#panel0').is_visible() and not page.locator('#carnival-odds').is_visible();page.evaluate('__roundQA.select(1)');page.wait_for_timeout(150);assert page.locator('#choco-odds').is_visible();page.evaluate('__roundQA.select(2)')
 pc=browser.new_context(viewport={'width':1280,'height':900});pg=pc.new_page();pg.on('pageerror',lambda e:errors.append(str(e)));pg.goto(url,wait_until='domcontentloaded');pg.wait_for_function('window.__roundQA?.ready',timeout=30000);pg.evaluate('__roundQA.freeze();__roundQA.hold()');pg.wait_for_timeout(300);assert pg.locator('#six-row-select').is_visible();pg.screenshot(path=str(out/'desktop.png'));pc.close()
 assert not errors,errors
 (out/'verification.json').write_text(json.dumps({'rules':stats,'pageErrors':errors,'tested':'Chromium mobile/desktop emulation, controlled number callbacks','not_tested':'Physical iPhone, Nintendo engine equivalence, complete natural roulette trajectory'},ensure_ascii=False,indent=2))
 browser.close()
server.shutdown();print('ALL_SIX_CANDY_ROUNDS_TESTS_PASSED',flush=True)

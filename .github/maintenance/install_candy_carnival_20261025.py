from pathlib import Path
import hashlib,re,subprocess
p=Path('index.html');raw=p.read_bytes();before=s=raw.decode()
assert hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()=='b0a658bf9f820d77fdec6b8cd58964933fb1a8a9','Source changed; inspect before rebasing'
Path('/tmp/carnival-before.html').write_bytes(raw)
def rep(old,new,count=1):
 global s
 assert s.count(old)==count,(old[:150],s.count(old),count)
 s=s.replace(old,new)
def replace_section(start,end,new):
 global s
 a=s.index(start);b=s.index(end,a);s=s[:a]+new+s[b:]
rep('class Arcade{',Path('assets/candy-carnival.js').read_text()+'\nclass Arcade{')
rep('new (i===1?ChocoDigEngine:Engine)(', 'new (i===1?ChocoDigEngine:i===2?CandyCarnivalEngine:Engine)(')
rep('bets:[100,100,100]','bets:[3000,3000,3000]')
rep('this.bets=[100,100,100]','this.bets=[3000,3000,3000]')
rep('if(release.length)this.engines.forEach((e,i)=>{if(this.enabled[i])e.enqueueBatch(release);});',"this.engines.forEach((e,i)=>{if(!this.enabled[i])return;const values=e.drawMode==='single'?[n]:release;if(values.length)e.enqueueBatch(values);});")
rep('</style></head><body>',Path('assets/candy-carnival.css').read_text()+'\n</style></head><body>')
rep("if(e?.kind==='choco'){chocoQueueFrame(s);return;}","if(e?.kind==='choco'){chocoQueueFrame(s);return;}\n if(e?.kind==='candy'){carnivalQueueFrame(s);return;}")
rep("if(s.engine?.kind==='choco'){chocoQueueFrame(s);return;}","if(s.engine?.kind==='choco'){chocoQueueFrame(s);return;}\n if(s.engine?.kind==='candy'){carnivalQueueFrame(s);return;}")
rep("if(e.kind==='choco'){chocoEvent(s,ev,e,a);return;}","if(e.kind==='choco'){chocoEvent(s,ev,e,a);return;}\n if(e.kind==='candy'){carnivalEvent(s,ev,e,a);return;}")
rep("current.engine?.kind!=='choco'&&current.betCanvas", "!['choco','candy'].includes(current.engine?.kind)&&current.betCanvas")
rep("if(s.engine?.kind!=='choco')drawBetScene", "if(!['choco','candy'].includes(s.engine?.kind))drawBetScene")
rep("if(s.engine?.kind==='choco'){if(s.betCanvas)","if(['choco','candy'].includes(s.engine?.kind)){if(s.betCanvas)")
rep("if(e.kind==='choco')return;", "if(e.kind==='choco'||e.kind==='candy')return;")
rep('function sugarStatus(e,bet){',"function sugarStatus(e,bet){\n if(e.kind==='candy')return {tier:bet>0?sugarVisualTier(e.wonderToken||bet):0,value:bet>0?(e.wonderToken?.value||bet):0,label:bet<=0?'0 BET・出現なし':e.wonderCollected?'獲得済':'5色完成報酬',detail:'全5色のビン完成で獲得'};")
rep("renderRoundResult(a);chocoHud(a);styleWinWords($('screen'));", "renderRoundResult(a);chocoHud(a);carnivalHud(a);styleWinWords($('screen'));")
rep("(e.kind==='choco'?'ショコラディグ':'ゲーム '+(i+1))", "(e.kind==='choco'?'ショコラディグ':e.kind==='candy'?'キャンディカーニバル':'クッキーリンク')")
rep("(e.kind==='choco'?e.depth+' m / ＋'+e.roundDepth+' m':e.maxLink+' LINK')", "(e.kind==='choco'?e.depth+' m / ＋'+e.roundDepth+' m':e.kind==='candy'?e.completedJars+' / 5 色完成':e.maxLink+' LINK')")
rep("(e.kind==='choco'?e.roundBlocks+'個掘削 · 宝箱'+e.roundChests+'個':e.maxChain+'連鎖'+(e.allClears?' · 全消し'+e.allClears+'回':''))", "(e.kind==='choco'?e.roundBlocks+'個掘削 · 宝箱'+e.roundChests+'個':e.kind==='candy'?e.roundCandies+'個GET'+(e.grandAwarded?' · GRAND':e.partyAwarded?' · PARTY':''):e.maxChain+'連鎖'+(e.allClears?' · 全消し'+e.allClears+'回':''))")
old="app=new Arcade({onEvent:recordEvent,onChange:recordChanged});app.drawSource=rouletteDrawSource;try{app.engines[1].enablePersistence(localStorage);}catch{}select(1);"
rep(old,old.replace('select(1);','select(2);'))
# Reward sizes derive from BET multiples, never an absolute WIN amount.
rep("const frameTier=g.size>=8?3:g.size>=5?2:1;", "const awardMultiple=payoutTenths(g.size)/10,frameTier=awardMultiple>=10?3:awardMultiple>=3?2:1;label.dataset.rewardTier=String(frameTier-1);")
rep('const badgeHalf=frameTier===3?98:frameTier===2?90:80,badgeHeight=frameTier===3?88:frameTier===2?76:66;', 'const badgeHalf=frameTier===3?126:frameTier===2?114:100,badgeHeight=frameTier===3?104:frameTier===2?92:78;')
rep("label.style.left=Math.max(badgeHalf+3,Math.min(298-badgeHalf-3,(c+.5)*CELL))+'px';label.style.top=Math.max(badgeHeight/2+2,Math.min(298-badgeHeight/2-2,(r+.5)*CELL))+'px';", "label.style.left=Math.max(badgeHalf+12,Math.min(298-badgeHalf-12,(c+.5)*CELL))+'px';label.style.top=Math.max(badgeHeight/2+14,Math.min(298-badgeHeight/2-14,(r+.5)*CELL))+'px';")
rep("award,frameTier===3?18:frameTier===2?16:14,badgeHalf*2-78", "award,frameTier===3?30:frameTier===2?27:24,badgeHalf*2-68")
rep("(mini?s.tab.querySelector('.mini-wrap'):$('screen')).append(el);", "(mini?s.tab.querySelector('.mini-wrap'):document.querySelector('#screen>.game')).append(el);")
# Predict the UNION of already pending HIT numbers and one candidate, with no live RNG.
rep('function predictNextHit(e,number){', 'function predictNextHit(e,number,pending=[]){')
rep('const q=copyReachState(e),hit=[];let depth=0;', 'const q=copyReachState(e),hit=[],numbers=new Set([...pending,number]);let depth=0;')
rep('if(q.board[r][c]?.number===number)hit.push([r,c]);', 'if(q.board[r][c]&&numbers.has(q.board[r][c].number))hit.push([r,c]);')
helpers=r'''function reachContext(e,a=app){
 if(!e||!a||e.kind==='choco'||!['playing','result','paying','complete'].includes(a.phase)||!reachBoardSettled(e)||e.opening||e.queue.length)return null;
 const count=a.draws.length;let pending=[];
 if(e.reachMode==='single'||e.drawMode==='single'){
  if(count<1||e.processed!==count)return null;
 }else{
  if(count===2){if(e.processed!==0||e.accepted!==0)return null;pending=a.draws.slice(0,2);}
  else if(count===4){if(e.processed!==3||e.accepted!==3)return null;pending=a.draws.slice(3,4);}
  else if(count>=5&&count<=8){if(e.processed!==count)return null;}
  else return null;
 }
 return {count,pending,used:new Set(a.draws),key:[e.version,e.processed,count,pending.join(','),a.token].join('/')};
}
function reachContextKey(e,a=app){return reachContext(e,a)?.key||null;}
function requestReach(s,e,a=app){
 const context=reachContext(e,a);
 if(!context||a.bet(s.i)<=0){if(s.reachStatus!=='inactive'){invalidateReach(s);s.reachStatus='inactive';}return;}
 const key=context.key;if(s.reachBoardKey===key)return;
 const snapshot=e.kind==='candy'?Object.assign(Object.create(CandyCarnivalEngine.prototype),{deck:e.deck.map(c=>({...c})),jars:[...e.jars],filled:[...e.filled],drawn:new Set(e.drawn),partyAwarded:e.partyAwarded,grandAwarded:e.grandAwarded,totalHundredths:e.totalHundredths}):copyReachState(e);
 const numbers=Array.from({length:25},(_,i)=>i+1).filter(n=>!context.used.has(n));
 const epoch=(s.reachEpoch||0)+1;s.reachEpoch=epoch;s.reachBoardKey=key;s.reachStatus='pending';s.reachResults=[];s.tabReachResults=[];
 let index=0;const results=[];
 function chunk(){
  if(s.reachEpoch!==epoch||s.engine!==e||s.reachBoardKey!==key||reachContextKey(e,a)!==key)return;
  const end=Math.min(numbers.length,index+3);
  for(;index<end;index++){const result=e.kind==='candy'?snapshot.predict(numbers[index]):predictNextHit(snapshot,numbers[index],context.pending);if(result?.gain>0)results.push(result);}
  if(index<numbers.length){setTimeout(chunk,0);return;}
  s.reachResults=results;s.reachStatus='ready';s.tabReachResults=results;s.tabReachBase=snapshot.totalHundredths;s.tabReachVersion=e.version;s.reachCalculations=(s.reachCalculations||0)+1;s.reachAfterBall=context.count;scheduleUI(app);
 }
 setTimeout(chunk,0);
}
'''
replace_section('function requestReach(s,e){','function reachAvailable(',helpers)
replace_section('function reachAvailable(', 'function visibleReachResults(', "function reachAvailable(s,a){return a.bet(s.i)>0&&s.reachStatus==='ready'&&!!reachContext(s.engine,a)&&s.reachBoardKey===reachContextKey(s.engine,a);}\n")
rep("if(a.bet(s.i)<=0||!['ready','playing','result','paying','complete'].includes(a.phase)||s.tabReachVersion!==s.engine.version)return [];", "if(!reachAvailable(s,a)||s.tabReachVersion!==s.engine.version)return [];")
rep("if(ev.phase==='drawpending'){clearMiniResult(s);s.dirtyMini=true;syncPendingHitTiles(s);scheduleUI(a);return;}", "if(ev.phase==='drawpending'){clearMiniResult(s);s.dirtyMini=true;invalidateReach(s);requestReach(s,e,a);syncPendingHitTiles(s);scheduleUI(a);return;}")
rep("if(['ready','waiting','settled','complete'].includes(ev.phase))requestReach(s,e);", "if(['ready','waiting','settled','complete'].includes(ev.phase))requestReach(s,e,a);")
rep("s.reachBoardKey!==e.version+'/'+e.processed", "s.reachBoardKey!==reachContextKey(e,app)")
# Keep the existing two engines and the full audio/physics implementation unchanged.
def extract(text,a,b):return text[text.index(a):text.index(b,text.index(a))]
for a,b in [('class Engine{','const elixirGlyphs='),('class ChocoDigEngine extends Engine{','const chocoSprites='),('const PHYSICS=(()=>{','const DRAW=(()=>{'),('const bgmTracks=','app=new Arcade(')]:
 if a in before and b in before:assert extract(before,a,b)==extract(s,a,b),a
assert re.findall(r'data:[^\s\"\x27<>]+;base64,[A-Za-z0-9+/=]+',s)==re.findall(r'data:[^\s\"\x27<>]+;base64,[A-Za-z0-9+/=]+',before),'Embedded assets changed'
for i,m in enumerate(re.finditer(r'<script\b([^>]*)>([\s\S]*?)</script>',s)):
 attrs,code=m.groups()
 if not code.strip() or 'application/json' in attrs:continue
 f=Path('/tmp')/('carnival-script-'+str(i)+'.mjs');f.write_text(code);subprocess.run(['node','--check',str(f)],check=True)
p.write_text(s)
print('CARNIVAL_INSTALL_OK',hashlib.sha1(b'blob '+str(len(s.encode())).encode()+b'\0'+s.encode()).hexdigest())

from pathlib import Path
import hashlib,re,subprocess
p=Path('index.html');before=p.read_text();s=before
assert hashlib.sha1(b'blob '+str(len(s.encode())).encode()+b'\0'+s.encode()).hexdigest()=='31ba1e63e406c4e2c20aae4eec3c6e13066d3c0e','Base changed; refusing update'
Path('/tmp/choco-before.html').write_text(s)
def rep(a,b):
 global s
 assert s.count(a)==1,(a[:100],s.count(a));s=s.replace(a,b,1)
rep('class Arcade{',Path('assets/choco-dig.js').read_text()+'\nclass Arcade{')
rep('for(let i=0;i<3;i++)this.engines.push(new Engine({random,sleep,speed,colorCount:this.colorCount,onEvent:', 'for(let i=0;i<3;i++)this.engines.push(new (i===1?ChocoDigEngine:Engine)({random,sleep,speed,colorCount:this.colorCount,onEvent:')
rep('</style></head><body>',Path('assets/choco-dig.css').read_text()+'\n</style></head><body>')
rep('function render(s,ev,e,animate=true){',"function render(s,ev,e,animate=true){\n if(e?.kind==='choco'){chocoQueueFrame(s);return;}")
rep('function miniature(s){',"function miniature(s){\n if(s.engine?.kind==='choco'){chocoQueueFrame(s);return;}")
rep(" const s=slots[i];s.engine=e;\n if(ev.phase==='drawpending')", " const s=slots[i];s.engine=e;\n if(e.kind==='choco'){chocoEvent(s,ev,e,a);return;}\n if(ev.phase==='drawpending')")
rep('function requestReach(s,e){',"function requestReach(s,e){\n if(e.kind==='choco'){s.reachResults=[];s.tabReachResults=[];return;}")
rep(' const current=slots[active];if(current.betCanvas)drawBetScene'," const current=slots[active];if(current.engine?.kind!=='choco'&&current.betCanvas)drawBetScene")
rep(' for(const s of slots)drawBetScene(s.mini,s.miniCanvas.width,d);'," for(const s of slots)if(s.engine?.kind!=='choco')drawBetScene(s.mini,s.miniCanvas.width,d);")
rep(' for(const s of slots){\n  if(!s.betCanvas)'," for(const s of slots){\n  if(s.engine?.kind==='choco'){if(s.betCanvas)s.betCanvas.hidden=true;s.miniCanvas.hidden=false;s.miniLogo.hidden=true;continue;}\n  if(!s.betCanvas)")
rep(" const concealed=a.phase==='ready';\n  const showingChain=", " if(e.kind==='choco')return;\n const concealed=a.phase==='ready';\n  const showingChain=")
rep('function sugarStatus(e,bet){',"function sugarStatus(e,bet){\n if(e.kind==='choco')return {tier:sugarVisualTier(e.wonderToken||Math.max(1,bet)),value:bet>0?(e.wonderToken?.value||bet):0,label:bet<=0?'0 BET・出現なし':e.wonderCollected?'獲得済':'深度報酬',detail:e.nextSugar+'m到達で獲得'};")
rep("renderRoundResult(a);styleWinWords($('screen'));","renderRoundResult(a);chocoHud(a);styleWinWords($('screen'));")
rep("class=\"result-game-name\">ゲーム '+(i+1)+' <small>'", "class=\"result-game-name\">'+(e.kind==='choco'?'ショコラディグ':'ゲーム '+(i+1))+' <small>'")
rep("(a.enabled[i]?e.maxLink+' LINK':'—')","(a.enabled[i]?(e.kind==='choco'?e.depth+' m / ＋'+e.roundDepth+' m':e.maxLink+' LINK'):'—')")
rep("(a.enabled[i]?e.maxChain+'連鎖'+(e.allClears?' · 全消し'+e.allClears+'回':''):'参加なし')","(a.enabled[i]?(e.kind==='choco'?e.roundBlocks+'個掘削 · 宝箱'+e.roundChests+'個':e.maxChain+'連鎖'+(e.allClears?' · 全消し'+e.allClears+'回':'')):'参加なし')")
anchor='app=new Arcade({onEvent:recordEvent,onChange:recordChanged});app.drawSource=rouletteDrawSource;select(0);'
rep(anchor,"app=new Arcade({onEvent:recordEvent,onChange:recordChanged});app.drawSource=rouletteDrawSource;try{app.engines[1].enablePersistence(localStorage);}catch{}select(1);")
for start,end in [('class Engine{','const elixirGlyphs='),('const PHYSICS=(()=>{','const DRAW=(()=>{'),('const bgmTracks=','app=new Arcade(')]:
 if start in before and end in before:
  assert before[before.index(start):before.index(end,before.index(start))]==s[s.index(start):s.index(end,s.index(start))],start
for i,m in enumerate(re.finditer(r'<script\b([^>]*)>([\s\S]*?)</script>',s)):
 attrs,code=m.groups()
 if not code.strip() or 'application/json' in attrs:continue
 f=Path('/tmp')/('choco-script-'+str(i)+'.mjs');f.write_text(code);subprocess.run(['node','--check',str(f)],check=True)
p.write_text(s)
print('CHOCO_INSTALL_OK',len(s))

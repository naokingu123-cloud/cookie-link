from pathlib import Path
import hashlib,re,subprocess
p=Path('index.html');raw=p.read_bytes();before=s=raw.decode()
base='b0d242d85901b5ea5c8e548c99d61e79eac017f2'
assert hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()==base,'Source changed; rebase before updating'
Path('/tmp/six-ball-before.html').write_bytes(raw)
def rep(a,b):
 global s
 assert s.count(a)==1,(a[:140],s.count(a));s=s.replace(a,b,1)
old=Path('assets/candy-carnival.js').read_text()
rep(old,Path('assets/six-ball-candy.js').read_text())
rep('</style></head><body>',Path('assets/six-ball-candy.css').read_text()+'\n</style></head><body>')
old="const snapshot=e.kind==='candy'?Object.assign(Object.create(CandyCarnivalEngine.prototype),{deck:e.deck.map(c=>({...c})),jars:[...e.jars],filled:[...e.filled],drawn:new Set(e.drawn),partyAwarded:e.partyAwarded,grandAwarded:e.grandAwarded,totalHundredths:e.totalHundredths}):copyReachState(e);"
rep(old,"const snapshot=e.kind==='candy'?e.reachSnapshot():copyReachState(e);")
rep("e.kind==='candy'?'キャンディカーニバル'", "e.kind==='candy'?'シックスボールキャンディ'")
rep("e.completedJars+' / 5 色完成'", "e.triangles+' TRIANGLE / '+e.hexagons+' HEXAGON'")
rep("e.roundCandies+'個GET'+(e.grandAwarded?' · GRAND':e.partyAwarded?' · PARTY':'')", "'最大'+e.bestCascade+'連鎖 · 残り'+e.remainingCandies+'個'")
rep("label:bet<=0?'0 BET・出現なし':e.wonderCollected?'獲得済':'5色完成報酬',detail:'全5色のビン完成で獲得'", "label:bet<=0?'0 BET・出現なし':e.wonderCollected?'獲得済':'ヘキサゴン報酬',detail:'ヘキサゴン完成で獲得・1ゲーム1個'")
# Preserve public game engines, launches, sound assets and shared financial accounting.
def extract(t,a,b):return t[t.index(a):t.index(b,t.index(a))]
for a,b in [('class Engine{','const elixirGlyphs='),('class ChocoDigEngine extends Engine{','const chocoSprites='),('class Arcade{','// Only the next HIT'),('const PHYSICS=(()=>{','const DRAW=(()=>{'),('const bgmTracks=','app=new Arcade('),('function reachContext(', 'function requestReach(')]:
 if a in before and b in before:assert extract(before,a,b)==extract(s,a,b),'Unexpected change: '+a
assert re.findall(r'data:[^\s\"\x27<>]+;base64,[A-Za-z0-9+/=]+',before)==re.findall(r'data:[^\s\"\x27<>]+;base64,[A-Za-z0-9+/=]+',s),'Embedded asset changed'
for text in ['completedJars','grandAwarded','CARNIVAL_TARGET','キャンディカーニバル']:
 assert text not in s,'Legacy game leaked: '+text
for i,m in enumerate(re.finditer(r'<script\b([^>]*)>([\s\S]*?)</script>',s)):
 attrs,code=m.groups()
 if not code.strip() or 'application/json' in attrs:continue
 f=Path('/tmp')/f'six-ball-script-{i}.mjs';f.write_text(code);subprocess.run(['node','--check',str(f)],check=True)
p.write_text(s)
print('SIX_BALL_INSTALL_OK',hashlib.sha1(b'blob '+str(len(s.encode())).encode()+b'\0'+s.encode()).hexdigest())

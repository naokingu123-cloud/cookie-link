from pathlib import Path
import hashlib,re,subprocess
p=Path('index.html');raw=p.read_bytes();before=s=raw.decode()
base='5cca3f198d8cf8babd14c4cb9c6929c32d9a8365'
assert hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()==base,'Source changed; inspect and rebase before applying'
Path('/tmp/six-candy-rounds-before.html').write_bytes(raw)
def rep(a,b):
 global s
 assert s.count(a)==1,(a[:150],s.count(a));s=s.replace(a,b,1)
old=Path('assets/six-ball-candy.js').read_text()
helpers=old[old.index('const sixSprites=new Map();'):old.index('function sixShapeIcon(type){')]
source=Path('assets/six-candy-rounds-engine.js').read_text()+'\n'+helpers+'\n'+Path('assets/six-candy-rounds-ui.js').read_text()
rep(old,source)
rep('</style></head><body>',Path('assets/six-candy-rounds.css').read_text()+'\n</style></head><body>')
rep("e.kind==='candy'?'シックスボールキャンディ'","e.kind==='candy'?'シックスキャンディ'")
rep("e.triangles+' TRIANGLE / '+e.hexagons+' HEXAGON'","'Round '+e.roundIndex+' / '+e.roundsCleared+' CLEAR'")
rep("'最大'+e.bestCascade+'連鎖 · 残り'+e.remainingCandies+'個'","e.hexagons+' HEX / '+e.triangles+' TRI / '+e.lines+' LINE'")
rep('function reachContext(e,a=app){',"function reachContext(e,a=app){\n if(e?.kind==='candy'&&e.transitionPending)return null;")
rep("key:[e.version,e.processed,count,pending.join(','),a.token].join('/')","key:[e.version,e.processed,count,pending.join(','),a.token].join('/')+(e.kind==='candy'?'/board'+(e.boardGeneration||0):'')")
def extract(t,a,b):return t[t.index(a):t.index(b,t.index(a))]
for a,b in [('class Engine{','const elixirGlyphs='),('class ChocoDigEngine extends Engine{','const chocoSprites='),('class Arcade{','// Only the next HIT'),('const PHYSICS=(()=>{','const DRAW=(()=>{'),('const bgmTracks=','app=new Arcade(')]:
 assert extract(before,a,b)==extract(s,a,b),'Unexpected modification: '+a
assert re.findall(r'data:[^\s\"\x27<>]+;base64,[A-Za-z0-9+/=]+',before)==re.findall(r'data:[^\s\"\x27<>]+;base64,[A-Za-z0-9+/=]+',s),'Embedded media changed'
for i,m in enumerate(re.finditer(r'<script\b([^>]*)>([\s\S]*?)</script>',s)):
 attrs,code=m.groups()
 if not code.strip() or 'application/json' in attrs:continue
 f=Path('/tmp')/f'six-candy-rounds-{i}.mjs';f.write_text(code);subprocess.run(['node','--check',str(f)],check=True)
p.write_text(s);Path('assets/six-candy.js').write_text(source)
print('SIX_CANDY_ROUNDS_APPLIED',hashlib.sha1(b'blob '+str(len(s.encode())).encode()+b'\0'+s.encode()).hexdigest())

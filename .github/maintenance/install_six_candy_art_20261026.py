"""One-time presentation-only install. Generated PNG bytes are not embedded.
The retained source images are represented by original vector/canvas artwork;
all game rules, shared UI geometry, audio and roulette code remain unchanged.
"""
from pathlib import Path
import hashlib,re,subprocess,json
p=Path('index.html');raw=p.read_bytes();before=raw.decode()
assert hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()=='0e38d3f664f71add328d4de825796fdc75488b1c','Main game changed; inspect before rebasing'
Path('/tmp/six-candy-art-before.html').write_bytes(raw)
engine=Path('assets/six-candy-rounds-engine.js').read_bytes()
old_bundle=Path('assets/six-candy.js').read_text();old_ui=Path('assets/six-candy-rounds-ui.js').read_text();ui=old_ui
art=Path('assets/six-candy-art.js').read_text();css=Path('assets/six-candy-art.css').read_text()
# Center the nine-character wordmark within the decorative 760-unit plaque.
art=art.replace('(63+i*72)','(95+i*72)');Path('assets/six-candy-art.js').write_text(art)
def rep(a,b):
 global ui
 assert ui.count(a)==1,(a[:160],ui.count(a));ui=ui.replace(a,b,1)
rep("s.tab.querySelector('.tab-game-name').innerHTML='<span class=\"carnival-tab-title six-candy-wordmark\">シックスキャンディ<small>SIX CANDY</small></span>';", "s.tab.querySelector('.tab-game-name').innerHTML=sixArtLogoMarkup('tab');")
rep("heading.innerHTML='<strong class=\"six-candy-wordmark\">シックスキャンディ<small>SIX CANDY · SWEET PUZZLE</small></strong><span>Round <b id=\"carnival-complete\">1</b></span>';", "heading.innerHTML='<strong>シックスキャンディ'+sixArtLogoMarkup('main')+'</strong><span>Round <b id=\"carnival-complete\">1</b></span>';")
a=ui.index(" const bg=x.createLinearGradient(0,0,320,320);");b=ui.index(' const lit=',a)
ui=ui[:a]+" x.drawImage(sixArtBackdrop(rows),0,0,320,320);\n"+ui[b:]
rep("if(!ready&&t.number!=null){const font=Math.max(11,layout.step*.41);x.fillStyle='#442141c8';x.beginPath();x.ellipse(pos.x,pos.y+1,font*(t.number>=10?.94:.68),font*.7,0,0,7);x.fill();sixText(x,String(t.number),pos.x,pos.y+1,font,'#fffdf4');}","if(!ready&&t.number!=null)sixPaintCandyNumber(x,t.number,pos.x,pos.y+1,radius);")
rep(" sixText(x,'Round '+e.roundIndex+'  ·  '+(ready?5:e.sixColorCount)+' COLORS',160,19,12,'#fff3b9');", " // Round remains in the live header; keep the apex star unobstructed.\n sixText(x,(ready?5:e.sixColorCount)+' COLORS',277,19,8.2,'#fff8dd');")
# Keep a soft glossy number-free candy visible in BET and on blank-number cells.
assert old_bundle.count(old_ui)==1,'Retained UI does not match bundled source'
new_bundle=old_bundle.replace(old_ui,ui,1)
a=new_bundle.index('const sixSprites=new Map();');b=new_bundle.index('function sixText(',a)
new_bundle=new_bundle[:a]+art+'\nfunction sixCandySprite(color){return sixArtCandySprite(color);}\n'+new_bundle[b:]
assert before.count(old_bundle)==1,'Embedded game source differs from editing source'
s=before.replace(old_bundle,new_bundle,1)
assert s.count('</style></head><body>')==1
s=s.replace('</style></head><body>',css+'\n</style></head><body>',1)
# Exact guards: this is a skin, not another change to the falling algorithm.
assert engine.decode() in new_bundle and engine.decode() in s
assert Path('assets/six-candy-rounds-engine.js').read_bytes()==engine
assert before.replace(old_bundle,'[SIX_CANDY]')==s.replace(new_bundle,'[SIX_CANDY]').replace(css+'\n','',1),'Unexpected host change'
for i,m in enumerate(re.finditer(r'<script\b([^>]*)>([\s\S]*?)</script>',s)):
 attrs,code=m.groups()
 if not code.strip() or re.search(r'type=[\"\x27](?:application/(?:json|ld\+json)|importmap)',attrs):continue
 f=Path('/tmp')/f'six-art-syntax-{i}.mjs';f.write_text(code);subprocess.run(['node','--check',str(f)],check=True)
Path('assets/six-candy-rounds-ui.js').write_text(ui);Path('assets/six-candy.js').write_text(new_bundle);p.write_text(s)
manifest={'version':'candy-illustrated-v1','source':'Original vector/canvas skin informed by user-approved generated images','generated_png_embedded':False,'limitation':'Generated PNG connector egress was blocked; original attachment bytes were not transferred.','rules_engine_sha256':hashlib.sha256(engine).hexdigest(),'changes':['glossy fruit and swirl candies','cached striped numerals 1-25','inline illustrated Japanese logo','candy-cane triangular rails','pastel candy kingdom backdrop','scoped payout and Round frames'],'unchanged':['gravity','7-10 row selector','Round progression','number allocation','role priority','payouts and 60x all-clear','other two games','shared roulette','audio','BET and debug controls']}
Path('assets/six-candy-art-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print('SIX_CANDY_ART_PRESENTATION_ONLY_OK',hashlib.sha1(b'blob '+str(len(s.encode())).encode()+b'\0'+s.encode()).hexdigest())

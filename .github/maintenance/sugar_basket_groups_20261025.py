from pathlib import Path
import hashlib,re,subprocess,tempfile,xml.etree.ElementTree as ET
p=Path('index.html');raw=p.read_bytes();s=raw.decode();original=s
assert hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()=='0e0eb8f98aba5682a5772cfea086e18788952c6d','Source changed; refusing to overwrite'
Path('/tmp/cookielink-before.html').write_bytes(raw)
def replace(a,b):
 global s
 assert s.count(a)==1,'Missing unique anchor: '+a[:160]
 s=s.replace(a,b,1)
def replace_all(a,b):
 global s
 assert a in s,'Missing anchor: '+a
 s=s.replace(a,b)
# Keep accumulated value and legacy internal tiers intact; high BET never grants JPC.
replace("const WONDER_NAMES=['白砂糖','ピンクシュガー','銅シュガー','銀シュガー','金シュガー','プラチナシュガー','虹シュガー'];",r'''const NORMAL_SUGAR_NAMES=Object.freeze(['白砂糖','ピンクシュガー','銅シュガー','銀シュガー','金シュガー']);
const DIRECT_JPC_SUGAR_TIER=6;
const WONDER_NAMES=[...NORMAL_SUGAR_NAMES,'金シュガー','ダイレクトJPCシュガー'];
const NORMAL_DRAW_GROUPS=Object.freeze([3,2,1,1,1]);
const isDirectJpcSugar=token=>!!token&&typeof token==='object'&&(token.kind==='direct-jpc'||token.directJpc===true);
function sugarVisualTier(tokenOrValue){
 if(isDirectJpcSugar(tokenOrValue))return DIRECT_JPC_SUGAR_TIER;
 const value=typeof tokenOrValue==='object'?(tokenOrValue?.value??0):tokenOrValue;
 return Math.min(4,wonderTier(Number.isFinite(Number(value))?Math.max(0,Number(value)):0));
}
const normalizeSugarArtTier=tier=>tier===DIRECT_JPC_SUGAR_TIER?tier:Math.max(0,Math.min(4,Math.floor(Number(tier)||0)));
function projectedSugarValue(e,bet){
 if(e.wonderToken)return e.wonderToken.value;
 const b=e.basketState[e.wonderColumn];return b?.goal?Math.max(1,Math.round((b.weight+b.remaining*bet)/b.goal)):Math.max(1,bet);
}
function normalBoardsSettled(){return !!app&&app.engines.every((e,i)=>!app.enabled[i]||(!e.opening&&e.idle&&e.processed>=e.accepted));}
''')
# Enrich the five existing distinct silhouettes, preserving SVG sprite compatibility.
start=s.index('<g id="sugar-evolution-art">');end=s.index('</g></defs></svg>',start)+4
old=s[start:end];art=ET.fromstring(old)
def path(d,fill='none',stroke='#fff8e6',width=.65):
 return f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{width}" stroke-linejoin="round" stroke-linecap="round"/>'
def beads(points,fill='#fffdf0',edge='#c7aa83',r=.65):
 return ''.join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}" stroke="{edge}" stroke-width=".28"/>' for x,y in points)
details=[
 path('M24 9L30 14L24 19L20 22L13 24L10 18Z','#fffdf6','#c6dfed',.45)+path('M20 22L24 19L33 22L38 28L29 30L24 37L19 40Z','#d9f0fa','#aecddd',.55)+path('M13 24L20 22L19 40L10 30Z','#effcff','#c2dde6',.5)+path('M24 19L29 30M33 22L29 30M20 22L29 30M24 37L31 38')+path('M14 19L19 16M23 12L26 14M10 29L13 33','#ffffff','#ffffff',1.5)+beads([(17,26),(15,29),(18,33),(27,25),(25,28),(23,34),(29,34),(31,25)],'#ffffff','#b0d3e2',.48),
 path('M24 17C19 8 10 12 11 20C12 27 20 33 24 37C30 33 37 26 37 19C36 11 29 10 24 17Z','none','#ffedf6',1)+path('M24 18L16 19L14 25L24 34L34 25L33 19Z','#ffc2de','#da7ca8',.5)+path('M24 18V34M16 19L24 25L33 19M14 25H34','#fff1fa','#fff1fa',.7)+path('M11 31Q16 26 21 31L24 34L27 31Q34 26 38 31L34 36L26 35L24 38L22 35L14 36Z','#fff0d9','#c98a78',.6)+path('M24 33L26 35L24 37L22 35Z','#f8b7d3','#bd6996',.6)+beads([(12,17),(14,13),(18,13),(34,16),(35,20),(30,12)],'#fff5e8','#d895b6',.7),
 path('M10 30L12 17L17 21L18 31M21 28L24 9L29 15L30 30M35 31L39 20L41 24','#e8ac66','#ffe9ba',.75)+path('M9 35Q24 29 39 35L37 40Q24 45 12 40Z','#bd703a','#76452c',.7)+path('M12 35Q24 31 36 35M13 39Q24 43 35 39','none','#ffe2a0',.95)+path('M16 35Q20 34 19 37T23 39M32 35Q28 34 29 37T25 39','none','#ffe7b0',.65)+path('M24 32L28 36L24 40L20 36Z','#ffe1a7','#87502d',.7)+path('M24 34L26 36L24 38L22 36Z','#cf8742','#fff6d1',.45)+beads([(12,36),(15,39),(33,39),(36,36),(24,7)],'#fff3c3','#9a613b',.75),
 path('M24 5V11M22 8L24 10L26 8M7 23L13 24M9 21L11 23L9 25M35 23H42M39 21L37 23L39 25M24 37V43M22 40L24 38L26 40','none','#f9ffff',1)+path('M24 15L31 21L29 32L24 36L18 32L16 22Z','#d0eafb','#6c91b7',.65)+path('M24 15L24 26L31 21M24 26L29 32M24 26L18 32M24 26L16 22','none','#ffffff',1)+path('M20 21L24 18L28 21L24 24Z','#ffffff','#b5d1ec',.45)+path('M10 12L16 16M33 32L37 36M10 37L16 32M32 16L35 12','none','#b3d2e9',1)+beads([(24,12),(13,22),(17,35),(31,35),(36,22)],'#ffffff','#86afce',.9),
 path('M8 14L15 20L24 7L33 20L40 14L36 29H12Z','none','#fff7cb',1.2)+path('M16 28L19 18L24 11L29 18L32 28Z','#ffe688','#b9891c',.65)+path('M24 12V28M19 18L24 22L29 18','none','#fffbe1',1)+path('M24 18L28 23L24 28L20 23Z','#f09dbb','#9c6528',.8)+path('M24 19L26 22L24 24L22 22Z','#ffeef4','#fff9d1',.35)+path('M12 34Q24 39 36 34M14 40Q24 43 34 40','none','#fff4bc',1)+path('M17 35Q19 32 21 36M27 36Q29 32 31 35','none','#ae7819',.7)+beads([(12,34),(16,36),(20,37),(24,37.5),(28,37),(32,36),(36,34)],'#fff5ce','#b58a29',.75)+beads([(9,20),(39,20),(16,17),(32,17)],'#9be3d3','#ba8e32',.9)
]
for tier in range(5):
 node=next(n for n in art if n.tag=='symbol' and n.attrib.get('id')=='wonder-crystal'+str(tier))
 node.append(ET.fromstring('<g class="sugar-crafted-detail" data-design="'+['cut-crystal','rose-heart','engraved-copper','snow-silver','royal-gold'][tier]+'">'+details[tier]+'</g>'))
legacy=next(n for n in art if n.tag=='symbol' and n.attrib.get('id')=='wonder-crystal5')
for child in list(legacy):legacy.remove(child)
legacy.append(ET.fromstring('<use href="#wonder-crystal4"/>'))
rainbow=next(n for n in art if n.tag=='symbol' and n.attrib.get('id')=='wonder-crystal6')
rainbow.append(ET.fromstring('<g class="sugar-crafted-detail" data-design="direct-jpc">'+path('M4 14L13 25M5 19L12 27M44 14L35 25M43 19L36 27','none','#fff7d4',1)+path('M12 34Q24 31 36 34L34 42Q24 46 14 42Z','#713d9e','#fff0ab',.8)+'<text x="24" y="40.5" text-anchor="middle" font-family="Arial,sans-serif" font-weight="900" font-size="7" fill="#fff1b2">JPC</text>'+beads([(5,12),(43,12),(15,8),(33,8),(24,3)],'#fff6bd','#c29b50',.8)+'</g>'))
replace(old,ET.tostring(art,encoding='unicode'))
# All display sites share the five ordinary icons; only explicit direct tickets use rainbow.
for a,b in [('wonderTier(step.value)','sugarVisualTier(step)'),('wonderTier(t.step.value)','sugarVisualTier(t.step)'),('wonderTier(b.step.value)','sugarVisualTier(b.step)'),('wonderTier(token?.value??0)','sugarVisualTier(token)'),('wonderTier(token.value)','sugarVisualTier(token)')]:replace_all(a,b)
replace('tier=Math.max(0,Math.min(6,tier));','tier=normalizeSugarArtTier(tier);')
replace('function getSugarSprite(tier){','function getSugarSprite(tier){\n tier=normalizeSugarArtTier(tier);')
replace('function drawSugar(ctx,x,y,size,tier=0){','function drawSugar(ctx,x,y,size,tier=0){\n tier=normalizeSugarArtTier(tier);')
replace("tokens.slice(0,5).map(t=>t.value).join(',')","tokens.slice(0,5).map(t=>t.value+':'+isDirectJpcSugar(t)).join(',')")
replace("const basket=e.basketState[e.wonderColumn],token=e.wonderToken,tier=wonderTier(token?.value??bet);","const basket=e.basketState[e.wonderColumn],token=e.wonderToken,value=bet>0?projectedSugarValue(e,bet):0,tier=bet>0?sugarVisualTier(token||value):0;")
replace("return {tier,label:e.wonderCollected?'獲得済':'未獲得'","return {tier,value,label:bet<=0?'0 BET・出現なし':e.wonderCollected?'獲得済':'未獲得'")
replace('sugar.hidden=!selected||e.wonderIssued||e.wonderCollected;','sugar.hidden=bet<=0||!selected||e.wonderIssued||e.wonderCollected;')
replace('applySugarTier(sugar,wonderTier(value));','applySugarTier(sugar,sugarVisualTier(value));')
replace("applySugarTier(el,wonderTier(Number(el.dataset.value)))","applySugarTier(el,sugarVisualTier({value:Number(el.dataset.value),directJpc:el.dataset.directJpc==='true'}))")
replace('data-value="\'+(e.wonderToken?.value||a.locked[i])+\'"','data-direct-jpc="\'+isDirectJpcSugar(e.wonderToken)+\'" data-value="\'+(e.wonderToken?.value||a.locked[i])+\'"')
# Remove duplicate status sugar from miniature canvas; actual sugar cookies remain in play.
line=next(l for l in s.splitlines() if 'for(const s of slots){drawBetScene(s.mini' in l)
replace(line,' for(const s of slots)drawBetScene(s.mini,s.miniCanvas.width,d);')
line=next(l for l in s.splitlines() if 'const sugar=sugarStatus(e,app.bet(s.i));if(!e.wonderCollected' in l)
replace(line,' // Sugar status is drawn outside the mini-board by the shared DOM badge.')
replace('if(t.step)drawSugar(ctx,(c+.5)*MINI','if(t.step&&app.bet(s.i)>0)drawSugar(ctx,(c+.5)*MINI')
replace("const key=[b,win,state,e.phase,s.event.newRecord,e.wonderCollected,e.wonderToken?.value].join('/');","const key=[b,win,state,e.phase,s.event.newRecord,e.wonderCollected,e.wonderToken?.value,projectedSugarValue(e,b),isDirectJpcSugar(e.wonderToken)].join('/');")
line=next(l for l in s.splitlines() if 'const sugar=sugarStatus(e,b);if(s.lastBetTier' in l)
replace(line,r'''  const sugar=sugarStatus(e,b),enabled=b>0;
  if(enabled&&a.phase==='ready'&&s.lastSugarValue!==undefined&&sugar.value>s.lastSugarValue){s.tabSugar.classList.remove('sugar-powerup');void s.tabSugar.offsetWidth;s.tabSugar.classList.add('sugar-powerup');}
  if(!enabled)s.tabSugar.classList.remove('sugar-powerup');s.lastSugarValue=sugar.value;s.lastBetTier=sugar.tier;
  s.tabSugar.classList.toggle('is-zero-bet',!enabled);s.panel.classList.toggle('sugar-disabled',!enabled);
  s.tabSugar.classList.toggle('collected',enabled&&e.wonderCollected);s.sugarGet.hidden=!enabled||!e.wonderCollected;s.tabSugar.hidden=false;
  applySugarTier(s.tabSugar.querySelector('.sugar-gem'),sugar.tier);
  s.tabSugar.setAttribute('aria-label',enabled?WONDER_NAMES[sugar.tier]+'、'+sugar.label+'。'+sugar.detail:'0 BET・シュガーは出現しません');''')
# Explicitly disable sugar supply on non-participating games, preserving saved growth.
replace('if(this.running)return;','if(this.running||this.roundBet<=0)return;')
replace('this.spawnedSteps=[];if(this.wonderCollected)return;','this.spawnedSteps=[];if(this.wonderCollected||(!initial&&this.roundBet<=0))return;')
replace('this.engines.forEach((e,i)=>{if(this.enabled[i]){e.roundBet=this.locked[i];e.start();}});','this.engines.forEach((e,i)=>{e.roundBet=this.locked[i];if(this.enabled[i])e.start();});')
# 3 -> 2 -> 1 -> 1 -> 1: physical group drained AND all enabled games settled.
replace('const groups=[3,2,1,1,1];','const groups=NORMAL_DRAW_GROUPS;')
replace('draw.canAdvance=()=>true;','draw.canAdvance=()=>hooks.canAdvance?.()??true;')
replace('root,{onNumber:n=>rouletteDrawSource.number(n),onError:', 'root,{onNumber:n=>rouletteDrawSource.number(n),canAdvance:normalBoardsSettled,onError:')
# Reserve rainbow explicitly for direct JPC. No random spawn probability is invented.
replace("function nextFromResult(){if(app.phase!=='complete'||jpcSession.active)return;", "function nextFromResult(){if(app.phase!=='complete'||jpcSession.active)return;const ticket=app.wonderBank.find(t=>isDirectJpcSugar(t)&&!t.jpcRedeemed);if(ticket&&rouletteReady&&toggleJpcMode()){ticket.jpcRedeemed=true;jpcSession.direct=true;put('jpc-heading','DIRECT JPC');return;}")
replace("if(jpcSession.active){\n  stopJpcTicker();stopSounds();jpcSession.active=false;", "if(jpcSession.active){\n  jpcSession.direct=false;put('jpc-heading','JACKPOT CHANCE');\n  stopJpcTicker();stopSounds();jpcSession.active=false;")
css=r'''
/* Larger basket, same centre and refill origin; no changes to delivery timing. */
.basket>svg{width:36px;height:32.5px;bottom:-2.25px}
/* Leave a dedicated lower-right gutter OUTSIDE each miniature board. */
.tab-slot>.tab .mini-wrap{justify-self:start;margin-left:8px}
.tab-slot .tab-sugar{top:auto;bottom:3px;right:2px;left:auto;width:36px;min-width:36px;height:40px;box-sizing:border-box;padding:2px 1px;display:flex;flex-direction:column;gap:0;transform:none;transform-origin:50% 65%;animation:none;border:1px solid #e3bd91;border-radius:11px;background:linear-gradient(#fffdf1dd,#f4d7aebb);box-shadow:inset 0 0 0 1px #fff8d8,0 2px 2px #71443744;z-index:12;pointer-events:none}
.tab-slot .tab-sugar:after,.tab-slot .tab-sugar.collected:after{display:none!important}
.tab-slot .tab-sugar .sugar-gem{width:30px;height:30px;opacity:1;filter:none;flex:none;border-radius:0;animation:none}
.tab-slot .tab-sugar .sugar-get{font:900 7px/8px CookieLabels,system-ui;letter-spacing:.4px;-webkit-text-stroke:.3px #fff4c6;white-space:nowrap}
.tab-slot .tab-sugar .sugar-get[hidden]{display:none}
.tab-slot .tab-sugar:not(.is-zero-bet) .sugar-gem:before{display:block;inset:-8%;border:0;animation:none;opacity:.35;background:radial-gradient(circle,var(--gem-light),transparent 68%)}
.tab-slot .tab-sugar:not(.is-zero-bet) .sugar-gem:after{display:block;left:77%;top:0;width:18%;height:18%;animation:sugar-glint 2.8s ease-in-out infinite}
.tab-slot .tab-sugar.is-zero-bet{background:#c6b7ae99;border-color:#b7a79b;box-shadow:inset 0 1px #ede2d2}
.tab-slot .tab-sugar.is-zero-bet .sugar-gem{opacity:.48;filter:brightness(0);animation:none!important}
.tab-slot .tab-sugar.is-zero-bet .sugar-gem:before,.tab-slot .tab-sugar.is-zero-bet .sugar-gem:after{display:none!important}
.tab-slot .tab-sugar.sugar-powerup{animation:sugarPowerup 850ms ease-out}
.panel.sugar-disabled .wonder-mark,.panel.sugar-disabled .basket-sugar{display:none!important}
.sugar-crafted-detail{pointer-events:none}
@media(prefers-reduced-motion:reduce){.tab-slot .tab-sugar.sugar-powerup,.tab-slot .tab-sugar .sugar-gem:after{animation:none!important}}
@media(forced-colors:active){.tab-slot .tab-sugar{background:Canvas;border:1px solid CanvasText;box-shadow:none}.tab-slot .tab-sugar.is-zero-bet{background:Canvas;border-style:dashed}.tab-slot .tab-sugar .sugar-gem:before,.tab-slot .tab-sugar .sugar-gem:after{display:none!important}}
'''
replace('</style></head><body>',css+'</style></head><body>')
# Physics geometry, win formulas and timings remain exactly unchanged.
for a,b in [('const PHYSICS=(()=>{','const DRAW=(()=>{'),('function pour(s,fresh,e){','function sparkles('),('function makeClearPlan(', 'const MIN_PAID_LINK')]:
 if a in original and b in original:
  assert original[original.index(a):original.index(b,original.index(a))]==s[s.index(a):s.index(b,s.index(a))],a+' changed unexpectedly'
p.write_text(s)
with tempfile.TemporaryDirectory() as folder:
 for i,m in enumerate(re.finditer(r'<script\b([^>]*)>([\s\S]*?)</script>',s)):
  attrs,code=m.groups()
  if not code.strip() or re.search(r'type=[\"\x27](?:application/json|importmap)',attrs):continue
  f=Path(folder)/('script'+str(i)+('.mjs' if 'module' in attrs else '.js'));f.write_text(code);subprocess.run(['node','--check',str(f)],check=True)
print('SUGAR_BASKET_GROUP_PATCH_OK')

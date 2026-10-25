"""Guarded, one-time patch. The workflow commits only after browser tests pass."""
from pathlib import Path
import hashlib, re, subprocess
p=Path('index.html'); raw=p.read_bytes()
assert hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()=='251676ec51dea9951cb1dc1e486a94a7165902df', 'Source changed: inspect and rebase first'
s=before=raw.decode(); Path('/tmp/cookielink-before.html').write_text(before)
def rep(old,new,count=1):
 global s
 assert s.count(old)==count, (old[:150],s.count(old),count)
 s=s.replace(old,new)
def section(a,b):
 return s[s.index(a):s.index(b,s.index(a))]
rep("const NORMAL_DRAW_GROUPS=Object.freeze([3,2,1,1,1]);","const NORMAL_DRAW_GROUPS=Object.freeze([3,2,1,1,1]);\nconst MINI_RESULT_MS=1800;")
rep("if(!['queued','stepcollect'].includes(phase))","if(!['queued','stepcollect','drawpending'].includes(phase))")
rep('this.version++;this.queue=[];this.seen=new Set();','this.version++;this.queue=[];this.pendingDraws=new Set();this.seen=new Set();')
old=section(' enqueue(number){',' get idle(){')
rep(old,""" previewDraw(number){
  if(!this.running||!Number.isInteger(number)||number<1||number>25||this.seen.has(number)||this.pendingDraws.has(number))return false;
  this.pendingDraws.add(number);this.emit('drawpending',{number,numbers:[...this.pendingDraws]});return true;
 }
 enqueue(number){return this.enqueueBatch([number]);}
 enqueueBatch(numbers){
  if(!this.running||!Array.isArray(numbers)||!numbers.length||this.accepted+numbers.length>8||new Set(numbers).size!==numbers.length||numbers.some(n=>!Number.isInteger(n)||n<1||n>25||this.seen.has(n)))return false;
  const batch=[...numbers];for(const n of batch)this.seen.add(n);
  this.accepted+=batch.length;this.queue.push(batch);this.emit('queued',{number:batch[batch.length-1],numbers:[...batch],batchSize:batch.length});if(!this.busy)this.drain();return true;
 }
""")
old=section(' async drain(){','\n}\n\nconst elixirGlyphs=')
new=old
new=new.replace("const number=this.queue.shift(),ball=this.processed+1;let depth=0;this.lastChain=0;this.drawn.add(number);","const queued=this.queue.shift(),numbers=Array.isArray(queued)?queued:[queued],number=numbers[numbers.length-1],ballStart=this.processed+1,ball=this.processed+numbers.length,batch={numbers:[...numbers],ballStart,batchSize:numbers.length};\n    let depth=0,batchMaxLink=0;const beforeClears=this.allClears;this.lastChain=0;for(const n of numbers){this.drawn.add(n);this.pendingDraws.delete(n);}const numberSet=new Set(numbers);")
new=new.replace('this.board[r][c]?.number===number','numberSet.has(this.board[r][c]?.number)')
new=new.replace('{number,ball','{...batch,number,ball')
new=new.replace('while(linked.length){\n     depth++;','while(linked.length){\n     batchMaxLink=Math.max(batchMaxLink,...linked.map(g=>g.size));\n     depth++;')
new=new.replace("this.processed++;this.emit('settled',{...batch,number,ball,depth});","this.processed+=numbers.length;this.emit('settled',{...batch,number,ball,depth,batchMaxLink,batchAllClears:this.allClears-beforeClears});")
# Preserve the existing inter-group gap. Give the last mini result time before the round overlay.
new=new.replace("if(this.processed<8&&!await this.wait(HIT_GAP_MS*this.speed,token))return;","const gap=this.processed<8?HIT_GAP_MS:MINI_RESULT_MS*(this.presentationRate||1);\n    if(!await this.wait(gap*this.speed,token))return;")
assert 'this.processed++' not in new and 'batchMaxLink=Math.max' in new
rep(old,new)
rep('  this.draws.push(n);\n  // Wait for ball 3 / 5 before submitting each complete group to the game boards.','  this.draws.push(n);this.engines.forEach((e,i)=>{if(this.enabled[i])e.previewDraw(n);});\n  // Submit one atomic batch after ball 3 / 5; previewed cells never resolve early.')
rep('  for(const value of release)this.engines.forEach((e,i)=>{if(this.enabled[i])e.enqueue(value);});','  if(release.length)this.engines.forEach((e,i)=>{if(this.enabled[i])e.enqueueBatch(release);});',count=2)
old=section(' async deal(token){',' async boostAfterDraws(token){')
rep(old,""" async deal(token){
  for(let k=0;k<8;k++){
   if(k&&!await this.wait(5000,token))return;
   if([3,5,6,7].includes(k))while(token===this.token&&this.phase==='playing'&&!this.engines.every((e,i)=>!this.enabled[i]||(!e.opening&&e.idle&&e.processed>=e.accepted)))await this.sleep(40);
   while(this.paused&&token===this.token)await this.sleep(40);
   if(token!==this.token||this.phase!=='playing')return;
   const pool=Array.from({length:25},(_,i)=>i+1).filter(n=>!this.draws.includes(n));
   if(!this.acceptNumber(pool[Math.floor(this.random()*pool.length)],token))return;
  }
 }
""")
# History indicators are static; only the actual numbered board cells pulse.
start=s.index('/* Grouped lottery: previously landed balls blink')
end=s.index('/* Keep the machine dominant',start)
old=s[start:end]
rep(old,"""/* Grouped HIT preview is on board cells, never on the draw-history indicators. */
#screen .board .tile.pending-hit .sweet{animation:pending-cell-pulse .8s ease-in-out infinite!important;outline:2px solid #fff2a9;outline-offset:-2px}
@keyframes pending-cell-pulse{0%,100%{opacity:1;filter:brightness(1.45) drop-shadow(0 0 4px #fff2a9)}50%{opacity:.48;filter:brightness(1)}}
.paused .tile.pending-hit .sweet,.panel[hidden] .tile.pending-hit .sweet{animation-play-state:paused!important}
.mini-result-label{left:50%;top:50%;right:auto;bottom:auto;transform:translate(-50%,-50%);width:calc(100% - 8px);box-sizing:border-box;padding:5px 2px 6px;border:2px solid #d89950;border-radius:10px;background:#fff4ddea;color:#733c28;box-shadow:0 2px 5px #32180a60;z-index:10;white-space:normal;line-height:1.2;text-shadow:0 1px #fff;animation:mini-result-pop 180ms ease-out both}
.mini-result-label:after{content:"";position:absolute;left:50%;bottom:-6px;width:8px;height:8px;background:#fff4dd;border-right:2px solid #d89950;border-bottom:2px solid #d89950;transform:translateX(-50%) rotate(45deg)}
.mini-result-label strong{display:block;font:900 12px/15px CookieLabels,system-ui,sans-serif;white-space:nowrap}
.mini-result-label small{display:block;font:900 10px/13px CookieLabels,system-ui,sans-serif;white-space:nowrap}
@keyframes mini-result-pop{from{opacity:0;transform:translate(-50%,-50%) scale(.85)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}
.paused .mini-result-label{animation-play-state:paused!important}
@media(prefers-reduced-motion:reduce){#screen .board .tile.pending-hit .sweet,.mini-result-label{animation:none!important}.tile.pending-hit .sweet{opacity:1;filter:none;outline:2px solid #fff2a9}}
@media(forced-colors:active){.tile.pending-hit .sweet{outline-color:Highlight}.mini-result-label,.mini-result-label:after{background:Canvas;border-color:CanvasText;color:CanvasText;box-shadow:none;text-shadow:none}}
""")
rep("const completed=i<e.processed,registered=i<a.draws.length,flash=waitingForGroup&&(waitingForGroup===3?i<2:i===3)&&registered;","const completed=i<e.processed,registered=i<a.draws.length;")
rep('return `<span class="${completed?\'done\':registered?\'pending\':\'\'}${flash?\' group-wait-flash\':\'\'}"${flash?\' aria-label="入賞済み・次のグループ確定待ち"\':\'\'}>${a.draws[i]?elixirNumber(a.draws[i]):\'·\'}</span>`;','return `<span class="${completed?\'done\':registered?\'pending\':\'\'}">${a.draws[i]?elixirNumber(a.draws[i]):\'·\'}</span>`;')
rep("waitingForGroup+'球目の入賞待ち · 点滅中'","waitingForGroup+'球目待ち · 盤面点滅'")
# Put UI-only preview/result helpers before miniature(). They never alter board, scoring or RNG.
helpers="""function pendingCellNumbers(e){return e&&['waiting','settled','ready'].includes(e.phase)?e.pendingDraws:new Set();}
function syncPendingHitTiles(s){
 const pending=app?.phase==='playing'&&app.enabled[s.i]?pendingCellNumbers(s.engine):new Set();
 const ids=new Set();if(pending?.size)for(const row of s.engine.board)for(const t of row)if(t&&pending.has(t.number))ids.add(t.id);
 for(const [id,el] of s.tiles)el.classList.toggle('pending-hit',ids.has(id));
}
function requestMiniFrame(s){
 if(s.miniFrame||app?.paused||document.hidden||!inView||s.i===active)return;
 const version=s.engine.version;
 s.miniFrame=requestAnimationFrame(()=>{s.miniFrame=0;if(s.engine.version!==version||app?.paused||document.hidden||!inView)return;s.dirtyMini=true;scheduleUI(app);});
}
function clearMiniResult(s){
 s.miniLastResult='';s.miniResultState=null;s.miniResult.hidden=true;s.miniResult.textContent='';
}
function showMiniResult(s,ev){
 clearMiniResult(s);
 const link=Math.max(0,ev.batchMaxLink||0),chain=Math.max(0,ev.depth||0),clears=ev.batchAllClears||0;
 if(link<2&&chain<2&&!clears)return;
 const rows=[];if(link>=2)rows.push(link+' LINK');if(chain>=2)rows.push(chain+'連鎖');if(clears)rows.push('全消し！');
 s.miniLastResult=rows.join(' · ');s.miniResult.replaceChildren(...rows.map((text,i)=>{const el=document.createElement(i?'small':'strong');el.textContent=text;return el;}));
 s.miniResult.setAttribute('aria-label',s.miniLastResult);s.miniResultState={remaining:MINI_RESULT_MS,stamp:null,version:s.engine.version};
}
function updateMiniResults(a,now=performance.now()){
 let ticking=false;const paused=a.paused||document.hidden||!inView;
 for(const s of slots){
  const state=s.miniResultState;if(!state){s.miniResult.hidden=true;continue;}
  if(state.version!==s.engine.version||a.phase!=='playing'||a.bet(s.i)<=0){clearMiniResult(s);continue;}
  if(paused)state.stamp=null;else{if(state.stamp!==null)state.remaining-=Math.max(0,now-state.stamp);state.stamp=now;}
  if(state.remaining<=0){clearMiniResult(s);continue;}
  const stable=['settled','waiting','complete'].includes(s.engine.phase);
  s.miniResult.hidden=s.i===active||!stable||s.sugarAwardActive;
  if(!paused)ticking=true;
 }
 if(ticking)scheduleUI(a);
}

"""
rep('function miniature(s){',helpers+'function miniature(s){')
rep(" hud(uiApp);\n syncPresentationRate();"," for(const slot of slots)syncPendingHitTiles(slot);\n updateMiniResults(uiApp,timestamp);\n hud(uiApp);\n syncPresentationRate();")
# Redraw mini cells throughout their pulse; keep unrelated cells unchanged.
rep('const version=s.engine.version;requestAnimationFrame(()=>{if(s.engine.version===version){s.dirtyMini=true;scheduleUI(app);}});','requestMiniFrame(s);')
rep(" const marked=new Set((e.phase==='hit'?[{cells:s.event.primaryCells||s.event.cells||[]}]:e.phase==='link'?recordGroups(s.event,e):[]).flatMap(g=>g.cells.map(([r,c])=>r*SIZE+c)));"," const marked=new Set((e.phase==='hit'?[{cells:s.event.primaryCells||s.event.cells||[]}]:e.phase==='link'?recordGroups(s.event,e):[]).flatMap(g=>g.cells.map(([r,c])=>r*SIZE+c)));\n const pending=pendingCellNumbers(e)||new Set(),flash=new Set(e.phase==='hit'?marked:[]);\n for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++)if(pending.has(e.board[r][c]?.number))flash.add(r*SIZE+c);\n if(!app.paused)s.miniFlashStamp=now;const pulse=motionReduced?1:.48+.52*(.5+.5*Math.cos((s.miniFlashStamp||now)*Math.PI/400));")
rep("ctx.globalAlpha=e.phase==='vanish'&&(s.event.cells||[]).some(([y,x])=>y===r&&x===c)?.35:1;","ctx.globalAlpha=flash.has(r*SIZE+c)?pulse:e.phase==='vanish'&&(s.event.cells||[]).some(([y,x])=>y===r&&x===c)?.35:1;")
rep("if(marked.has(r*SIZE+c)){ctx.strokeStyle='#ffe68e';ctx.lineWidth=2;ctx.strokeRect(c*MINI+1,r*MINI+1,MINI-2,MINI-2);}","if(marked.has(r*SIZE+c)||flash.has(r*SIZE+c)){ctx.globalAlpha=flash.has(r*SIZE+c)?pulse:1;ctx.strokeStyle='#ffe68e';ctx.lineWidth=2;ctx.strokeRect(c*MINI+1,r*MINI+1,MINI-2,MINI-2);}")
rep(" if(e.phase==='refill'||e.phase==='vanish'||e.phase==='link'){ctx.save();ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.fillStyle='#fff0b8';ctx.strokeStyle='#351910';ctx.lineWidth=3;const msg=e.phase==='link'?(e.maxLink+' LINK'):e.phase==='vanish'?'CRACK!':'SWEETS!';ctx.strokeText(msg,80,150);ctx.fillText(msg,80,150);ctx.restore();}"," if(e.phase==='refill'||e.phase==='vanish'){ctx.save();ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.fillStyle='#fff0b8';ctx.strokeStyle='#351910';ctx.lineWidth=3;const msg=e.phase==='vanish'?'CRACK!':'SWEETS!';ctx.strokeText(msg,80,150);ctx.fillText(msg,80,150);ctx.restore();}\n if(flash.size&&!motionReduced)requestMiniFrame(s);")
# Only a settled event starts a result bubble. Complete/waiting never revive it.
old=""" if(ev.phase==='ready'){s.miniLastResult='';s.miniResult.hidden=true;}
 if(ev.phase==='allclear'){s.miniLastResult='全消し！';}
 if(ev.phase==='settled'||ev.phase==='complete'){if(!s.miniLastResult||s.miniLastResult!=='全消し！')s.miniLastResult=(e.lastChain>1?e.lastChain+'連鎖 · ':'')+e.maxLink+' LINK';}
 if(['settled','complete','allclear'].includes(ev.phase)){s.miniResult.textContent=s.miniLastResult;s.miniResult.hidden=!s.miniLastResult;}
"""
rep(old,""" if(['ready','hit','error'].includes(ev.phase))clearMiniResult(s);
 if(ev.phase==='settled')showMiniResult(s,ev);
 if(ev.phase==='ready'){if(s.miniFrame)cancelAnimationFrame(s.miniFrame);s.miniFrame=0;s.miniFlashStamp=null;}
""")
rep(" const s=slots[i];s.engine=e;\n if(['ready','error']", " const s=slots[i];s.engine=e;\n if(ev.phase==='drawpending'){clearMiniResult(s);s.dirtyMini=true;syncPendingHitTiles(s);scheduleUI(a);return;}\n if(['ready','error']")
rep("title:ev.ball+'球目 · '+ev.number+' HIT!'","title:(ev.batchSize>1?ev.ballStart+'〜'+ev.ball:ev.ball)+'球目 · '+(ev.numbers||[ev.number]).join('・')+' HIT!'")
rep("s.message=ev.ball+'球目：'+ev.number+'番 HIT！'","s.message=(ev.batchSize>1?ev.ballStart+'〜'+ev.ball:ev.ball)+'球目：'+(ev.numbers||[ev.number]).join('・')+'番 同時HIT！'")
# Reset visual clocks on pause/background changes and wake mini animations on resume.
rep('function syncPause(){if(menuOpen',"function syncPause(){for(const s of slots){if(s.miniResultState)s.miniResultState.stamp=null;s.dirtyMini=true;}if(menuOpen")
# Verify assets, physics, payout and number allocation code stayed byte-identical.
assert '\n'.join(before.splitlines()[3970:5190]) in s, '3D physics/render source changed'
assert re.findall(r'data:[^\s\"\'<>]+;base64,[A-Za-z0-9+/=]+',before)==re.findall(r'data:[^\s\"\'<>]+;base64,[A-Za-z0-9+/=]+',s), 'Embedded asset changed'
for anchor in ['const payoutTenths=','const payoutHundredths=','const hammerReward=']:
 assert next(l for l in before.splitlines() if l.startswith(anchor))==next(l for l in s.splitlines() if l.startswith(anchor))
assert 'group-wait-flash' not in s
assert 'for(const value of release)' not in s
assert before[before.index(' fill(initial=false){'):before.index(' async drain(){')]==s[s.index(' fill(initial=false){'):s.index(' async drain(){')]
for i,m in enumerate(re.finditer(r'<script\b([^>]*)>([\s\S]*?)</script\s*>',s,re.I)):
 attrs,body=m.groups()
 if not body.strip() or re.search(r'type=[\"\x27](?:application/(?:json|ld\+json)|importmap)',attrs):continue
 f=Path('/tmp')/f'cookie-mini-check-{i}.mjs';f.write_text(body);subprocess.run(['node','--check',str(f)],check=True,capture_output=True)
p.write_text(s)
sha=hashlib.sha1(b'blob '+str(len(s.encode())).encode()+b'\0'+s.encode()).hexdigest()
h=Path('HANDOFF.md');h.write_text(h.read_text()+f'''\n\n## 2026-10-25 — Atomic grouped HITs and settled mini-board bubbles\n- Balls 1–3 resolve as one union of matching board cells; balls 4–5 are a second union. Balls 6, 7 and 8 remain individual. Each batch has one primary clear, cascade and refill; accepted/processed continue counting balls (8 total).\n- Drawn-number preview pulses only the matching main/mini board cells while waiting for the group. The draw-history indicators no longer blink. No board mutation or refill occurs after only ball 1, 2 or 4.\n- Mini LINK/chain/all-clear text appears only after `settled` (including refill and hammer delivery), in a centered speech bubble for 1800 ms. Its values belong to that batch, not a stale round maximum. New HIT, reset and errors clear it. Pause/background suspend its clock; completion does not re-show it. The final batch leaves 1800 ms before the round-result overlay.\n- Existing physics, payouts, color rules, allocation, media and 0-BET behavior are preserved. Direct `Engine.enqueue(n)` remains supported; grouped callers must use `enqueueBatch(numbers)`.\n- Source index.html blob: `{sha}`. Guarded maintenance script: `.github/maintenance/mini_batch_20261025.py`. Regression: `.github/tests/cookie-link-mini-batch.cjs`.\n''')
print('PATCHED_MINI_BATCH_BLOB',sha)

"""Check numbered sites, per-turn WIN, reach markers and score settlement in Chrome."""
import json
import os
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[2]
version = json.loads((root / "app-version.json").read_text())["version"]
server = ThreadingHTTPServer(("127.0.0.1", 0), partial(SimpleHTTPRequestHandler, directory=root))
threading.Thread(target=server.serve_forever, daemon=True).start()
origin = f"http://127.0.0.1:{server.server_port}"

with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=os.environ.get("CHROME_PATH") or None,
                                 args=["--disable-webgl", "--disable-dev-shm-usage"])
    for width in (320, 390):
        page = browser.new_page(viewport={"width": width, "height": 844}, locale="ja-JP")
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.add_init_script("""(() => {
          window.waffleLabels = [];
          const p=CanvasRenderingContext2D.prototype, clear=p.clearRect, write=p.fillText;
          p.clearRect=function(...args){
            if(this.canvas.closest('.bs-grid')) window.waffleLabels=[];
            return clear.apply(this,args);
          };
          p.fillText=function(label,...args){
            if(this.canvas.closest('.bs-grid') && ['リーチ','高額','超高額','リバーサル'].includes(label)){
              const t=this.getTransform(),size=this.canvas.width,unit=size*(1-.064*2)/8;
              window.waffleLabels.push(8*Math.floor((t.f-size*.064)/unit)+Math.floor((t.e-size*.064)/unit));
            }
            return write.call(this,label,...args);
          };
        })()""")
        page.goto(f"{origin}/?games=waffle&appv={version}", wait_until="domcontentloaded")
        page.wait_for_function("() => window.BingoStick && window.BingoStickView")
        page.evaluate("""() => {
          document.querySelector('#sound').checked=false;
          // Exercise fractional WIN carry at 320px while the other layout uses the usual BET.
          if(innerWidth===320) for(let i=0;i<7;i++)document.querySelector('#onebet'+SweetsLineup.ids.indexOf('stick')).click();
          if(!document.body.classList.contains('manual-number-mode')) document.querySelector('#manual-number-toggle').click();
          document.querySelector('#manual-start').click();
        }""")
        page.wait_for_function("() => BingoStick.engine.running && document.querySelector('.bs-status').dataset.color==='black'")
        opening = page.evaluate("""() => {
          const e=BingoStick.engine,s=e.state,R=BingoStickRules;
          const moves=Array.from({length:25},(_,i)=>R.draw(s,i+1));
          const hits=moves.filter(v=>Math.floor(e.roundBet*v.totalHundredths/100)>0);
          const numbered=s.numbers.map(Boolean),missing=Array.from({length:25},(_,i)=>i+1).find(n=>!s.numbers.includes(n));
          return {numbered:numbered.filter(Boolean).length, stones:s.colors.filter(Boolean).length, miss:missing, bet:e.roundBet,
            covered:numbered.every((v,i)=>v!==Boolean(s.colors[i])),
            symmetric:s.colors.every((v,i)=>v===s.colors[63-i]&&v===s.colors[(i&56)+7-i%8]),
            legal:moves.filter(v=>v.flipped.length>0).length, ids:hits.map(v=>v.placed[0]).sort((a,b)=>a-b)};
        }""")
        assert opening["covered"] and opening["symmetric"] and opening["stones"] == 40
        assert opening["numbered"] == opening["legal"] == 24
        page.wait_for_function("(ids)=>JSON.stringify([...new Set(waffleLabels)].sort((a,b)=>a-b))===JSON.stringify(ids)",
                               arg=opening["ids"])
        def layout():
            return page.evaluate("""() => {
              const r=s=>document.querySelector(s).getBoundingClientRect();
              const cells=Array.from(document.querySelectorAll('.bs-pay tbody td'));
              const right=cells.map(c=>c.querySelector('span').getBoundingClientRect().right);
              return {aligned:Math.max(...right)-Math.min(...right)<1.1,
                right:cells.every(c=>getComputedStyle(c).textAlign==='right'),
                above:r('.bs-status').bottom<=r('.bs-grid').top+1,
                fits:r('.bs-pay').right<r('.bs-grid').left+2 && r('.bs-grid').right<=innerWidth+1,
                icon:document.querySelector('.bs-turn-piece').naturalWidth>0};
            }""")
        page.wait_for_function("() => document.querySelector('.bs-turn-piece').naturalWidth>0")
        assert all(layout().values()), layout()
        # Find a real sequence on the randomly dealt board with paid repeat/subrecord flips.
        # Put the missing number first on one board and midway through the other.
        plan = page.evaluate("""({miss,missTurn})=>{
          const e=BingoStick.engine,R=BingoStickRules,bet=e.roundBet;
          let seed=82753;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
          for(let trial=0;trial<2000;trial++){
            const pool=e.state.numbers.filter(Boolean),turns=[];let s=e.state,total=0,extraCarry=false,subrecord=false;
            for(let i=0;i<8;i++){
              const n=i===missTurn?miss:pool.splice(Math.floor(random()*pool.length),1)[0],next=R.draw(s,n);
              const award=R.award(next.flipped.length)+(next.reversalThisMove?R.sweepBonusHundredths:0);
              const win=Math.floor(bet*(total+award)/100),gain=win-Math.floor(bet*total/100);
              if(next.flipped.length>0&&next.flipped.length<=s.maxFlips&&gain>0)subrecord=true;
              if(gain>Math.floor(bet*award/100))extraCarry=true;
              total+=award;
              turns.push({n,win,gain,total,placed:next.placed.length,flips:next.flipped.length,max:next.maxFlips,bonus:next.reversalCount});
              s=next;
            }
            if(subrecord&&(bet%100===0||extraCarry))return turns;
          }
          throw Error('No valid regression sequence with repeated awards/carry');
        }""", {"miss": opening["miss"], "missTurn": 0 if width == 320 else 3})
        for i, turn in enumerate(plan, 1):
            page.evaluate("(n)=>document.querySelector('#manual-number-grid [data-number=\"'+n+'\"]').click()", turn["n"])
            page.wait_for_function("(i)=>BingoStick.engine.processed===i&&!BingoStick.engine.busy", arg=i)
            metrics = page.evaluate("""() => {
              const e=BingoStick.engine,s=e.state,amount=sel=>Number(document.querySelector(sel).textContent.replace(/[^0-9]/g,''));
              return {gain:amount('.bs-gain'),win:amount('.bs-total'),flips:s.lastFlips,placed:s.placed.length,
                color:s.lastColor,max:s.maxFlips,total:s.totalHundredths,bonus:s.reversalCount};
            }""")
            assert metrics == {**{k: turn[k] for k in ("win","gain","flips","placed","max","total","bonus")},
                               "color": "black" if i % 2 else "white"}, (i, metrics, turn)
            assert turn["placed"] == (turn["n"] != opening["miss"])
            if i in (1, 4):
                page.wait_for_function("""() => {
                  const e=BingoStick.engine,s=e.state,win=Math.floor(e.roundBet*s.totalHundredths/100);
                  const ids=Array.from({length:25},(_,i)=>BingoStickRules.draw(s,i+1))
                    .filter(v=>v&&v.placed.length&&Math.floor(e.roundBet*v.totalHundredths/100)>win)
                    .map(v=>v.placed[0]).sort((a,b)=>a-b);
                  const current=document.querySelector('.bs-status').dataset.color;
                  return current===(s.draws.length%2?'white':'black') &&
                    JSON.stringify([...new Set(waffleLabels)].sort((a,b)=>a-b))===JSON.stringify(ids);
                }""")
        page.wait_for_function("w=>Number(document.querySelector('.result-game .result-value')?.dataset.value)===w", arg=plan[-1]["win"])
        assert sum(t["gain"] for t in plan) == plan[-1]["win"]
        assert not errors, errors
        print(f"{width}px: 40 stones + 24 symmetric numbered sites, missing {opening['miss']}, {opening['bet']} BET, "
              f"{[t['gain'] for t in plan]} -> {plan[-1]['win']} WIN", flush=True)
        page.close()
    browser.close()
server.shutdown()

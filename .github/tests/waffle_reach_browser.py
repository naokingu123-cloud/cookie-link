"""Check the actual Waffle board, reach markers, turn banner and payout alignment in Chrome."""
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
          if(!document.body.classList.contains('manual-number-mode')) document.querySelector('#manual-number-toggle').click();
          document.querySelector('#manual-start').click();
        }""")
        page.wait_for_function("() => BingoStick.engine.running && document.querySelector('.bs-status').dataset.color==='black'")
        opening = page.evaluate("""() => {
          const e=BingoStick.engine,s=e.state,R=BingoStickRules;
          const moves=Array.from({length:25},(_,i)=>R.draw(s,i+1));
          const hits=moves.filter(v=>Math.floor(e.roundBet*v.totalHundredths/100)>0);
          return {legal:moves.filter(v=>v.flipped.length>0).length,
            ids:hits.map(v=>v.placed[0]).sort((a,b)=>a-b),
            play:[...moves].sort((a,b)=>b.lastFlips-a.lastFlips)[0].draws.at(-1)};
        }""")
        assert opening["legal"] == 25
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
        page.evaluate("(n)=>document.querySelector('#manual-number-grid [data-number=\"'+n+'\"]').click()", opening["play"])
        page.wait_for_function("() => BingoStick.engine.processed===1 && !BingoStick.engine.busy && document.querySelector('.bs-status').dataset.color==='white'")
        page.wait_for_function("""() => {
          const e=BingoStick.engine,s=e.state,win=Math.floor(e.roundBet*s.totalHundredths/100);
          const ids=Array.from({length:25},(_,i)=>BingoStickRules.draw(s,i+1))
            .filter(v=>v&&Math.floor(e.roundBet*v.totalHundredths/100)>win).map(v=>v.placed[0]).sort((a,b)=>a-b);
          return JSON.stringify([...new Set(waffleLabels)].sort((a,b)=>a-b))===JSON.stringify(ids);
        }""")
        assert not errors, errors
        print(f"{width}px: {opening['legal']}/25 black opening moves, {len(opening['ids'])} paying reach markers, white turn and alignment verified", flush=True)
        page.close()
    browser.close()
server.shutdown()

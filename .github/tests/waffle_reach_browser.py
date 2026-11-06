"""Exercise grade-dependent reach, physical row drops and actual small-bet settlement."""
import json
import os
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import sync_playwright


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


root = Path(__file__).resolve().parents[2]
version = json.loads((root / "app-version.json").read_text())["version"]
server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=root))
threading.Thread(target=server.serve_forever, daemon=True).start()
origin = f"http://127.0.0.1:{server.server_port}"
# Only inject the deal and BET. The game, controls, payouts and presentation then run normally.
host = (root / "assets/bingo-stick-host.js").read_text()
marker = "window.BingoStick={engine,core:R}"
assert host.count(marker) == 1
test_setup = """window.waffleFixture=(bet,demo)=>{
  app.setBet(id,bet);
  let seed=12345;
  const sample=R.createDemo();
  engine.state=demo?sample.state:R.create({target:100,rng:()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32)});
  return demo?sample.draws:null;
};"""
trace = """(() => {
  window.waffleLabels=[];
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
  window.startLadderTrace=()=>{
    const ladder=document.querySelector('.bs-pay'),byCount=n=>ladder.querySelector('tr[data-count="'+n+'"] .bs-block');
    const bottom=byCount(1),second=byCount(2),zero=ladder.querySelector('tr[data-count="0"]'),bonus=document.querySelector('.bs-bonus');
    const zeroBefore=zero.getBoundingClientRect().top,bonusBefore=bonus.getBoundingClientRect().top;
    window.dropTrace={kick:0,drop:0,zeroShift:0,bonusShift:0,phases:[],live:[],hit:false,special:false};let stopped=false;
    window.stopLadderTrace=()=>{stopped=true;return dropTrace;};
    function sample(){
      if(stopped)return;
      const phase=ladder.dataset.rankStep||'0',t=window.dropTrace,e=BingoStick.engine;
      if(t.phases.at(-1)!==phase)t.phases.push(phase);
      if(ladder.classList.contains('live')){
        const guide=document.querySelector('.bs-guide').textContent;
        t.hit||=guide.includes('HIT!');t.special||=guide.includes('特殊');
      }
      for(const [block,name,axis] of [[bottom,'kick','m41'],[second,'drop','m42']]){
        const transform=getComputedStyle(block).transform;
        if(transform!=='none')t[name]=Math.max(t[name],Math.abs(new DOMMatrix(transform)[axis]));
      }
      t.zeroShift=Math.max(t.zeroShift,Math.abs(zeroBefore-zero.getBoundingClientRect().top));
      t.bonusShift=Math.max(t.bonusShift,Math.abs(bonusBefore-bonus.getBoundingClientRect().top));
      if(e.busy&&ladder.classList.contains('live'))t.live.push([Number(document.querySelector('.bs-hand').textContent),e.totalHundredths,Number(document.querySelector('.bs-total').textContent.replaceAll(',',''))]);
      requestAnimationFrame(sample);
    }
    sample();
  };
})()"""

reach_matches = """() => {
  const e=BingoStick.engine,s=e.state,win=Math.floor(e.roundBet*s.totalHundredths/100);
  const ids=Array.from({length:25},(_,i)=>BingoStickRules.draw(s,i+1))
    .filter(v=>v&&v.placed.length&&Math.floor(e.roundBet*v.totalHundredths/100)>win).map(v=>v.placed[0]).sort((a,b)=>a-b);
  return document.querySelector('.bs-status').dataset.color===(s.draws.length%2?'white':'black') &&
    JSON.stringify([...new Set(waffleLabels)].sort((a,b)=>a-b))===JSON.stringify(ids);
}"""

def settled_table(page, grade, total, bet, base):
    grade_info = page.evaluate("""() => {
      const ladder=document.querySelector('.bs-pay');
      return {grade:+ladder.dataset.grade,badge:ladder.querySelector('.bs-grade').textContent,
        bonus:document.querySelector('.bs-bonus').textContent,
        resting:[...ladder.querySelectorAll('tr[data-count] .bs-block:not(.bs-incoming)')].every(tile=>getComputedStyle(tile).transform==='none'),
        rows:[...ladder.querySelectorAll('tr[data-count]')].map(row=>[
          +row.dataset.count,parseInt(row.querySelector('[aria-label$=" WIN"]').getAttribute('aria-label').replaceAll(',',''))
        ])};
    }""")
    assert grade_info["resting"] and grade_info["grade"] == grade and f"G{grade}" in grade_info["badge"], grade_info
    assert "50" in grade_info["bonus"] and f"{bet*50} WIN" in grade_info["bonus"].replace(",", ""), grade_info
    rows = grade_info["rows"]
    assert [n for n, _ in rows] == list(range(13, -1, -1)), rows
    for flips, win in rows:
        odds = base[min(flips + grade, 13)] if flips else 0
        assert win == (bet * (total + odds)) // 100 - (bet * total) // 100, (flips, grade, total, win)


with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=os.environ.get("CHROME_PATH") or None,
                                 args=["--disable-webgl", "--disable-dev-shm-usage"])
    for width, bet, demo in [(320, 7, False), (390, 100, True)]:
        page = browser.new_page(viewport={"width": width, "height": 844}, locale="ja-JP")
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.add_init_script(trace)
        page.route("**/bingo-stick-host.js*", lambda route: route.fulfill(
            content_type="text/javascript", body=host.replace(marker, test_setup + marker)))
        page.goto(f"{origin}/?games=waffle&appv={version}", wait_until="domcontentloaded")
        page.wait_for_function("() => window.BingoStick && window.waffleFixture")
        recommended = page.evaluate("""([bet,demo]) => {
          document.querySelector('#sound').checked=false;
          if(!document.body.classList.contains('manual-number-mode')) document.querySelector('#manual-number-toggle').click();
          const draws=waffleFixture(bet,demo);
          document.querySelector('#manual-start').click();return draws;
        }""", [bet, demo])
        page.wait_for_function("() => BingoStick.engine.running && document.querySelector('.bs-pay').dataset.grade==='0'")
        opening = page.evaluate("""() => {
          const e=BingoStick.engine,s=e.state,R=BingoStickRules,numbered=s.numbers.map(Boolean),shown=document.querySelector('.bs-specials');
          const r=s=>document.querySelector(s).getBoundingClientRect();
          const cells=[...document.querySelectorAll('.bs-pay tbody tr[data-count] td')];
          const right=cells.map(c=>c.querySelector('[aria-label$=" WIN"]').getBoundingClientRect().right);
          return {numbered:numbered.filter(Boolean).length,stones:s.colors.filter(Boolean).length,bet:e.roundBet,
            base:[0,...R.payRows.filter(row=>row.count>0).map(row=>row.hundredths)],
            covered:numbered.every((v,i)=>v!==Boolean(s.colors[i])),
            symmetric:s.colors.every((v,i)=>v===s.colors[63-i]&&v===s.colors[(i&56)+7-i%8]),
            missing:s.offBoardNumbers,shown:[...shown.querySelectorAll('b')].map(b=>Number(b.textContent)),
            aligned:Math.max(...right)-Math.min(...right)<1.1,
            above:r('.bs-status').bottom<=r('.bs-grid').top+1,
            fits:r('.bs-pay').right<r('.bs-grid').left+2 && r('.bs-grid').right<=innerWidth+1};
        }""")
        assert opening["covered"] and opening["symmetric"] and opening["stones"] == 44 and opening["numbered"] == 20
        assert opening["bet"] == bet and opening["aligned"] and opening["fits"] and opening["above"], opening
        assert len(opening["missing"]) == 5
        assert opening["shown"] == opening["missing"], opening
        base = opening["base"]
        page.wait_for_function("() => document.querySelector('.bs-turn-piece').naturalWidth>0")
        page.wait_for_function(reach_matches)
        settled_table(page, 0, 0, bet, base)

        # One held-out deal exercises all three actions and fractional payout carry.
        # The other replays the public demo for an actual reversal on a complete board.
        plan = page.evaluate("""({recommended,base,bet})=>{
          const e=BingoStick.engine,R=BingoStickRules;
          let seed=82753;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
          for(let trial=0;trial<5000;trial++){
            const pool=Array.from({length:25},(_,i)=>i+1),turns=[];
            let s=e.state,total=0,extraCarry=false,subrecord=false;
            for(let i=0;i<8;i++){
              const n=recommended?recommended[i]:pool.splice(Math.floor(random()*pool.length),1)[0],d=R.draw(s,n);
              const award=(d.lastFlips?base[Math.min(13,i+d.lastFlips)]:0)+(d.reversalThisMove?5000:0);
              const win=Math.floor(bet*(total+award)/100),gain=win-Math.floor(bet*total/100);
              if(d.lastFlips>0&&d.lastFlips<=s.maxFlips&&gain>0)subrecord=true;
              if(gain>Math.floor(bet*award/100))extraCarry=true;
              total+=award;
              turns.push({n,win,gain,total,placed:d.placed.length,flips:d.lastFlips,max:d.maxFlips,bonus:d.reversalCount});
              s=d;
            }
            if(recommended||subrecord&&extraCarry&&turns.some(t=>!t.placed)&&turns.some(t=>t.placed&&!t.flips))return turns;
          }
          throw Error('No held-out game with a repaid subrecord, off-board, on-board zero and carry');
        }""", {"recommended": recommended, "base": base, "bet": bet})
        before = 0
        for i, turn in enumerate(plan, 1):
            page.evaluate("""n=>{startLadderTrace();document.querySelector('#manual-number-grid [data-number="'+n+'"]').click();}""", turn["n"])
            page.wait_for_function("(i)=>BingoStick.engine.processed===i&&!BingoStick.engine.busy && +document.querySelector('.bs-pay').dataset.grade===i", arg=i)
            samples = page.evaluate("stopLadderTrace()")
            phases = samples["phases"]
            assert "1" in phases and "2" in phases and phases.index("1") < phases.index("2"), (i, samples)
            assert samples["kick"] > 1 and samples["drop"] > 1, (i, samples)
            assert samples["hit"] and samples["special"] == (not turn["placed"]), (i, samples)
            assert "3" in phases and phases.index("3", phases.index("2")) > phases.index("2"), (i, phases)
            assert samples["zeroShift"] <= 1.1 and samples["bonusShift"] <= 1.1, (i, samples)
            revealed = [v for v in samples["live"] if v[0] > 0]
            if turn["flips"] >= 2:
                assert set(range(1, turn["flips"]+1)).issubset(v[0] for v in revealed), (i, samples)
            metrics = page.evaluate("""() => {
              const e=BingoStick.engine,s=e.state,amount=sel=>Number(document.querySelector(sel).textContent.replace(/[^0-9]/g,''));
              return {gain:amount('.bs-gain'),win:amount('.bs-total'),flips:s.lastFlips,placed:s.placed.length,
                grade:s.grade,applied:s.lastGrade,color:s.lastColor,max:s.maxFlips,total:e.totalHundredths,bonus:s.reversalCount,
                earned:document.querySelector('.bs-bonus').classList.contains('earned')};
            }""")
            assert metrics == {**{k: turn[k] for k in ("win","gain","flips","placed","max","total","bonus")},
                               "grade": i, "applied": i-1, "earned": turn["bonus"]>0, "color": "black" if i%2 else "white"}, (i, metrics, turn)
            assert turn["placed"] == (turn["n"] not in opening["missing"])
            for hand, hundredths, win in revealed:
                # On a new reversal the bonus appears only when the last disc flips.
                award = base[min(13, i-1+hand)]
                if turn["bonus"] > (plan[i-2]["bonus"] if i>1 else 0) and hand == turn["flips"]:
                    award += 5000
                assert [hundredths, win] == [before+award, bet*(before+award)//100], (i, hand, hundredths, win, award)
            settled_table(page, i, turn["total"], bet, base)
            if i in (1, 4, 7):
                page.wait_for_function(reach_matches)
            before = turn["total"]
        page.wait_for_function("w=>Number(document.querySelector('.result-game .result-value')?.dataset.value)===w", arg=plan[-1]["win"])
        assert sum(t["gain"] for t in plan) == plan[-1]["win"]
        if demo:
            assert plan[-1]["bonus"] > 0
            assert "リバーサル" in page.locator(".result-game-details").first.text_content()
        assert not errors, errors
        print(f"{width}px / {bet} BET: G0–G8, off-board {opening['missing']}, "
              f"{[t['gain'] for t in plan]} -> {plan[-1]['win']} WIN", flush=True)
        page.close()
    browser.close()
server.shutdown()

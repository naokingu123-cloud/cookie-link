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
    if(this.canvas.closest('.bs-grid') && ['リーチ','高額','超高額','リバーサル','オッズUP'].includes(label)){
      const t=this.getTransform(),size=this.canvas.width,unit=size*(1-.064*2)/8;
      window.waffleLabels.push(8*Math.floor((t.f-size*.064)/unit)+Math.floor((t.e-size*.064)/unit));
    }
    return write.call(this,label,...args);
  };
  window.startLadderTrace=()=>{
    const ladder=document.querySelector('.bs-pay'),byCount=n=>ladder.querySelector('tr[data-count="'+n+'"] .bs-block');
    const blocks=Array.from({length:14},(_,i)=>i?byCount(i):null),incoming=ladder.querySelector('.bs-incoming'),bonus=document.querySelector('.bs-bonus');
    const bonusBefore=bonus.getBoundingClientRect().top;
    window.dropTrace={x:Array(14).fill(0),y:Array(14).fill(0),incomingY:0,bonusShift:0,phases:[],live:[],hit:false,special:false};let stopped=false;
    window.stopLadderTrace=()=>{stopped=true;return dropTrace;};
    function sample(){
      if(stopped)return;
      const phase=ladder.dataset.rankStep||'0',t=window.dropTrace,e=BingoStick.engine;
      if(t.phases.at(-1)!==phase)t.phases.push(phase);
      const guide=document.querySelector('.bs-guide');
      if(e.busy&&!guide.hidden){t.hit||=guide.textContent.includes('HIT!');}
      if(phase==='1'||phase==='2'){
        blocks.forEach((block,row)=>{
          if(!block)return;const transform=getComputedStyle(block).transform,matrix=transform==='none'?new DOMMatrix():new DOMMatrix(transform);
          t.x[row]=Math.max(t.x[row],Math.abs(matrix.m41));t.y[row]=Math.max(t.y[row],Math.abs(matrix.m42));
        });
        const bounds=incoming.getBoundingClientRect(),offset=bounds.top-incoming.parentElement.getBoundingClientRect().top;
        if(t.incomingStart===undefined)t.incomingStart=offset;
        t.incomingY=Math.max(t.incomingY,Math.abs(offset-t.incomingStart));
      }
      t.bonusShift=Math.max(t.bonusShift,Math.abs(bonusBefore-bonus.getBoundingClientRect().top));
      if(e.busy&&ladder.classList.contains('live'))t.live.push([Number(document.querySelector('.bs-hand').textContent),e.totalHundredths,Number(document.querySelector('.bs-total').textContent.replaceAll(',',''))]);
      requestAnimationFrame(sample);
    }
    sample();
  };
})()"""

reach_matches = """() => {
  const s=BingoStick.engine.state;
  const ids=Array.from({length:25},(_,i)=>BingoStickRules.project(s,i+1))
    .filter(v=>v&&v.lastFlips>0).map(v=>v.placed[0]).sort((a,b)=>a-b);
  const color=Math.min(8,s.draws.length+1)%2?'black':'white';
  return document.querySelector('.bs-status').dataset.color===color && document.querySelector('.bs-pay').dataset.color===color &&
    JSON.stringify([...new Set(waffleLabels)].sort((a,b)=>a-b))===JSON.stringify(ids);
}"""

def settled_table(page, grade, total, bet, rack):
    grade_info = page.evaluate("""() => {
      const ladder=document.querySelector('.bs-pay');
      return {grade:+ladder.dataset.grade,badge:ladder.querySelector('.bs-grade').textContent,
        bonus:document.querySelector('.bs-bonus').textContent,
        resting:[...ladder.querySelectorAll('tr[data-count] .bs-block:not(.bs-incoming)')].every(tile=>getComputedStyle(tile).transform==='none'),
        rows:[...ladder.querySelectorAll('tr[data-count]')].map(row=>[
          +row.dataset.count,row.querySelector('.bs-block').dataset.material,parseInt(row.querySelector('[aria-label$=" WIN"]').getAttribute('aria-label').replaceAll(',',''))
        ])};
    }""")
    assert grade_info["resting"] and grade_info["grade"] == grade and f"G{grade}" in grade_info["badge"], grade_info
    assert f"{bet*50} WIN" in grade_info["bonus"].replace(",", ""), grade_info
    rows = grade_info["rows"]
    assert [n for n, _, _ in rows] == list(range(13, 0, -1)), rows
    for flips, material, win in rows:
        odds = rack[flips]
        assert material == ("gold" if odds >= 5000 else "silver" if odds >= 1000 else "waffle"), (flips, odds, material)
        assert win == (bet * (total + odds)) // 100 - (bet * total) // 100, (flips, grade, total, win)


# Deterministic split/upper-edge probes, independent of the random or demo hands.
def check_upper_tiers(page):
    results = page.evaluate(r"""async () => {
      const R=BingoStickRules,V=BingoStickView,steps=[-9,-8,-7,-1,1,7,8,9];
      const results=[];
      for(const depth of [1,2]){
        const start=R.create(),panel=document.createElement('div');
        panel.style.cssText='position:fixed;width:360px;height:360px;inset:0;opacity:0;pointer-events:none';document.body.append(panel);
        start.colors=Array(64).fill(null);start.numbers=Array(64).fill(null);start.numbers[27]=1;
        // Material boundaries are measured in odds, including when two payouts round to the same WIN.
        start.rack=[0,0,10,20,30,40,50,100,200,990,1000,4990,5000,6000];
        for(const d of steps){start.colors[27+(depth+1)*d]='black';for(let i=1;i<=depth;i++)start.colors[27+i*d]='white';}
        start.counts={black:8,white:depth*8};const s=R.draw(start,1),v=V.mount(panel),m=V.motion(s,Infinity);
        const primary=n=>panel.querySelector('[data-count="'+n+'"] .bs-block:not(.bs-incoming)');
        const matrix=el=>{const t=getComputedStyle(el).transform;return t==='none'?new DOMMatrix():new DOMMatrix(t);};
        v.draw(s,{bet:1,age:m.rankStart+125});
        const materials=[9,10,11,12].map(n=>primary(n).dataset.material);
        const names=[9,10,12].map(n=>getComputedStyle(primary(n),'::before').backgroundImage.match(/url\(["']?([^"')]+)/)[1]);
        for(const url of names){const img=new Image();img.src=url;await img.decode();if(img.naturalWidth<16)throw Error('Empty waffle image');}
        const x=Array.from({length:14},(_,i)=>i?matrix(primary(i)).m41:0);
        v.draw(s,{bet:1,age:m.dropStart+210});
        const y=Array.from({length:14},(_,i)=>i?matrix(primary(i)).m42:0);
        const incoming=panel.querySelector('.bs-incoming'),incomingPrize=parseInt(incoming.querySelector('[aria-label]').getAttribute('aria-label'));
        v.draw(s,{bet:1,age:Infinity});
        results.push({flips:s.lastFlips,x,y,materials,images:new Set(names).size,incomingPrize,top:s.rack[13],bonus:s.bonusHundredths,
          burst:panel.querySelector('.bs-bonus').classList.contains('earned')});
        panel.remove();
      }
      return results;
    }""")
    for depth, result in enumerate(results, 1):
        flips = depth*8
        knocked = min(flips, 13)
        assert result["flips"] == flips and result["bonus"] == 5000 and result["burst"]
        assert result["images"] == 3
        assert result["materials"] == ["waffle","silver","silver","gold"], result
        assert [i for i, x in enumerate(result["x"]) if abs(x) > 1] == [knocked], result
        assert [i for i, y in enumerate(result["y"]) if abs(y) > 1] == list(range(knocked + 1, 14)), result
        assert result["incomingPrize"] == result["top"] // 100, result


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
          const e=BingoStick.engine,s=e.state,R=BingoStickRules,numbered=s.numbers.map(Boolean),icons=[...document.querySelectorAll('.bs-turn')];
          const r=s=>document.querySelector(s).getBoundingClientRect();
          const cells=[...document.querySelectorAll('.bs-pay tbody tr[data-count] td')];
          const right=cells.map(c=>c.querySelector('[aria-label$=" WIN"]').getBoundingClientRect().right);
          return {numbered:numbered.filter(Boolean).length,stones:s.colors.filter(Boolean).length,bet:e.roundBet,
            base:s.rack,top:R.topRefills,
            covered:numbered.every((v,i)=>v!==Boolean(s.colors[i])),
            symmetric:s.colors.every((v,i)=>v===s.colors[63-i]&&v===s.colors[(i&56)+7-i%8]),
            missing:s.offBoardNumbers,icons:icons.map(i=>i.dataset.color),
            modern:!document.querySelector('.bs-counts,.bs-specials,.bs-gain,[data-count="0"] .bs-block')&&r('.bs-total').bottom<=r('.bs-board').top+1&&r('.bs-bonus img').bottom<=r('[data-count="13"]').top+1,
            aligned:Math.max(...right)-Math.min(...right)<1.1,
            above:r('.bs-status').bottom<=r('.bs-grid').top+1,
            fits:r('.bs-pay').right<r('.bs-grid').left+2 && r('.bs-grid').right<=innerWidth+1};
        }""")
        assert opening["covered"] and opening["symmetric"] and opening["stones"] == 44 and opening["numbered"] == 20
        assert opening["bet"] == bet and opening["aligned"] and opening["fits"] and opening["above"], opening
        assert len(opening["missing"]) == 5
        assert opening["modern"] and opening["icons"] == ["black","white"]*4, opening
        base = opening["base"]
        page.wait_for_function("() => [...document.querySelectorAll('.bs-turn-piece,.bs-bonus img')].every(i=>i.naturalWidth>0)")
        assert page.evaluate("""async () => {const css=getComputedStyle(document.querySelector('.bs-turns'),'::before').backgroundImage;
          const im=new Image;im.src=css.split('url("')[1].split('")')[0];await im.decode();return im.naturalWidth>200;}""")
        page.wait_for_function(reach_matches)
        settled_table(page, 0, 0, bet, base)

        # One held-out deal exercises all three actions and fractional payout carry.
        # The other replays the complete production demo.
        plan = page.evaluate("""({recommended,base,top,bet})=>{
          const e=BingoStick.engine,R=BingoStickRules;
          let seed=82753;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
          for(let trial=0;trial<5000;trial++){
            const pool=Array.from({length:25},(_,i)=>i+1),turns=[];
            let s=e.state,rack=base.slice(),total=0,grade=0,extraCarry=false,subrecord=false;
            for(let i=0;i<8;i++){
              const n=recommended?recommended[i]:pool.splice(Math.floor(random()*pool.length),1)[0],d=R.draw(s,n);
              const row=Math.min(13,d.lastFlips),award=rack[row]+(d.reversalThisMove?5000:0);
              const pre=rack.slice();if(row){rack.splice(row,1);rack.push(top[grade++]);}
              const win=Math.floor(bet*(total+award)/100),gain=win-Math.floor(bet*total/100);
              if(d.lastFlips>0&&d.lastFlips<=s.maxFlips&&gain>0)subrecord=true;
              if(gain>Math.floor(bet*award/100))extraCarry=true;
              total+=award;
              turns.push({n,win,gain,total,pre,grade,rack:rack.slice(),placed:d.placed.length,flips:d.lastFlips,max:d.maxFlips,bonus:d.reversalCount});
              s=d;
            }
            if(recommended||subrecord&&extraCarry&&turns.some(t=>!t.placed)&&turns.some(t=>t.placed&&!t.flips))return turns;
          }
          throw Error('No held-out game with a repaid subrecord, off-board, on-board zero and carry');
        }""", {"recommended": recommended, "base": base, "top": opening["top"], "bet": bet})
        before = 0
        for i, turn in enumerate(plan, 1):
            page.evaluate("""n=>{startLadderTrace();document.querySelector('#manual-number-grid [data-number="'+n+'"]').click();}""", turn["n"])
            page.wait_for_function("([i,g])=>BingoStick.engine.processed===i&&!BingoStick.engine.busy && +document.querySelector('.bs-pay').dataset.grade===g", arg=[i,turn["grade"]])
            samples = page.evaluate("stopLadderTrace()")
            phases = samples["phases"]
            knocked = min(13, turn["flips"])
            if knocked:
                assert "1" in phases and "2" in phases and phases.index("1") < phases.index("2"), (i,samples)
                assert "3" in phases and phases.index("3",phases.index("2")) > phases.index("2"), (i,phases)
                assert samples["x"][knocked]>1 and samples["incomingY"]>1, (i,samples)
                for row in range(1,14):
                    if row!=knocked:
                        assert samples["x"][row]<.5, (i,knocked,row,samples)
                    if row>knocked:
                        assert samples["y"][row]>1, (i,knocked,row,samples)
                    elif row<knocked:
                        assert samples["y"][row]<.5, (i,knocked,row,samples)
            else:
                assert "1" not in phases and "2" not in phases and not any(samples["x"]+samples["y"]), (i,samples)
            assert samples["hit"]==bool(turn["placed"]) and samples["bonusShift"]<=1.1, (i,samples)
            revealed = [v for v in samples["live"] if v[0] > 0]
            if turn["flips"] >= 2:
                assert set(range(1, turn["flips"]+1)).issubset(v[0] for v in revealed), (i, samples)
            metrics = page.evaluate("""() => {
              const e=BingoStick.engine,s=e.state,amount=sel=>Number(document.querySelector(sel).textContent.replace(/[^0-9]/g,''));
              const tiles=[...document.querySelectorAll('.bs-turn')],k=s.draws.length,active=tiles.find(i=>i.getAttribute('aria-current')==='step');
              if(k<8?active?.dataset.turn!==String(k+1):tiles[7].dataset.state!=='done')throw Error('Incorrect active turn');
              return {history:tiles.map(i=>+i.querySelector('.bs-turn-win').textContent),win:amount('.bs-total'),flips:s.lastFlips,placed:s.placed.length,
                grade:s.grade,applied:s.lastGrade,color:s.lastColor,max:s.maxFlips,total:e.totalHundredths,bonus:s.reversalCount,
                earned:document.querySelector('.bs-bonus').classList.contains('earned')};
            }""")
            assert metrics == {**{k: turn[k] for k in ("win","flips","placed","max","total","bonus")},
                               "history":[t["gain"] for t in plan[:i]]+[0]*(8-i),
                               "grade":turn["grade"], "applied":turn["grade"]-int(bool(turn["flips"])), "earned": turn["bonus"]>0, "color": "black" if i%2 else "white"}, (i, metrics, turn)
            assert turn["placed"] == (turn["n"] not in opening["missing"])
            for hand, hundredths, win in revealed:
                # On a new reversal the bonus appears only when the last disc flips.
                award = turn["pre"][min(13, hand)]
                if turn["bonus"] > (plan[i-2]["bonus"] if i>1 else 0) and hand == turn["flips"]:
                    award += 5000
                assert [hundredths, win] == [before+award, bet*(before+award)//100], (i, hand, hundredths, win, award)
            settled_table(page, turn["grade"], turn["total"], bet, turn["rack"])
            if i in (1, 4, 7, 8):
                page.wait_for_function(reach_matches)
            before = turn["total"]
        page.wait_for_function("w=>Number(document.querySelector('.result-game .result-value')?.dataset.value)===w", arg=plan[-1]["win"])
        assert sum(t["gain"] for t in plan) == plan[-1]["win"]
        if plan[-1]["bonus"]:
            assert "リバーサル" in page.locator(".result-game-details").first.text_content()
        if demo:
            check_upper_tiers(page)
        assert not errors, errors
        print(f"{width}px / {bet} BET: through eight turns, off-board {opening['missing']}, "
              f"{[t['gain'] for t in plan]} -> {plan[-1]['win']} WIN", flush=True)
        page.close()
    browser.close()
server.shutdown()

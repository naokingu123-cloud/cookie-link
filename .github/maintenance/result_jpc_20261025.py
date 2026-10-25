from pathlib import Path
import hashlib,re,subprocess,tempfile
p=Path('index.html');raw=p.read_bytes();s=raw.decode()
base='eb03a0c3006f1d42f2396393395eba859fe1d33c'
assert hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()==base,'Source changed; refusing to overwrite'
Path('/tmp/cookielink-before.html').write_bytes(raw)
original=s

def replace(a,b):
 global s
 assert s.count(a)==1,'Missing unique anchor: '+a[:160]
 s=s.replace(a,b,1)

replace('const DEBUG_FAST_START=true;','const DEBUG_FAST_START=false;')
replace("const BET_DURATION_MS=new URLSearchParams(location.search).has('demo')?3600000:DEBUG_FAST_START?1000:30000;","const BET_DURATION_MS=new URLSearchParams(location.search).has('demo')?3600000:15000;")
reset=re.search(r'<button id="debug-reset"[^>]*>.*?</button>',s).group(0)
replace(reset,'<div id="debug-tools" class="debug-tools" role="group" aria-label="暫定デバッグ操作"><button id="debug-start" type="button" disabled>すぐ開始</button><button id="jpc-mode" type="button" disabled aria-pressed="false">JPCモード</button>'+reset+'</div>')
replace("&&el.id!=='debug-reset'","&&el.id!=='debug-tools'")
replace('<select id="a8-mode"><option value="eight">8球</option></select>','<select id="a8-mode"><option value="eight">8球</option><option value="jpc">70球JPC</option></select>')
result=re.search(r'<div id="round-result-layer"[\s\S]*?</section></div>',s).group(0)
replace(result,'''<div id="round-result-layer" class="round-result-layer" hidden>
<section class="round-result" role="region" aria-labelledby="result-heading">
<div class="result-candy-corners" aria-hidden="true"><svg viewBox="0 0 64 64"><use href="#candy0"/></svg><svg viewBox="0 0 64 64"><use href="#candy3"/></svg><svg viewBox="0 0 64 64"><use href="#candy1"/></svg><svg viewBox="0 0 64 64"><use href="#candy2"/></svg></div>
<div class="result-pennants" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
<span class="result-logo" role="img" aria-label="クッキーリンク"></span><h2 id="result-heading">リザルト</h2><span class="result-subtitle">SWEET REWARDS</span>
<div class="result-total"><span class="result-total-label">TOTAL WIN</span><div class="result-total-amount"><b id="result-total-win"></b><em class="win-word">WIN</em></div></div>
<div id="result-games"></div><p class="result-status" id="result-status" role="status" aria-live="polite"></p>
<p class="result-next-info">つぎのゲームまで <strong id="result-seconds">8</strong> 秒</p><div class="result-countdown-track" aria-hidden="true"><i id="result-countdown-fill"></i></div>
<button type="button" id="result-next" hidden disabled tabindex="-1">次のゲームへ</button>
</section></div>
<section id="jpc-dashboard" class="jpc-dashboard" aria-labelledby="jpc-heading" hidden>
<header><span class="jpc-kicker">SWEETS KINGDOM</span><h2 id="jpc-heading">JACKPOT CHANCE</h2><p>25ポケットすべてに入賞で JACKPOT!</p></header>
<div class="jpc-summary"><span><small>発射</small><b id="jpc-launched">0</b><em>/ 70</em></span><span><small>入賞ポケット</small><b id="jpc-filled">0</b><em>/ 25</em></span><span><small id="jpc-round">ROUND 1 / 4</small><b id="jpc-landed">0</b><em>球入賞</em></span></div>
<div class="jpc-progress" role="progressbar" aria-label="70球JPC発射進捗" aria-valuemin="0" aria-valuemax="70" aria-valuenow="0"><i id="jpc-progress-fill"></i></div>
<div id="jpc-grid" class="jpc-grid" role="list" aria-label="各ポケットの入賞球数"></div>
<p id="jpc-message" class="jpc-message" role="status" aria-live="polite">JPC準備中</p><div class="jpc-last"><small>最近の入賞</small><div id="jpc-history"></div></div><footer>暫定デバッグモード・通常ゲームの配当と成績には加算しません</footer>
</section>''')

css=r'''
/* Sweets result ceremony and isolated JPC view. The existing game geometry is retained. */
.debug-tools{position:absolute;top:78px;right:23px;z-index:10001;width:94px;display:flex;flex-direction:column;gap:3px;pointer-events:auto}
.debug-tools button,#debug-tools #debug-reset{position:static;inset:auto;min-width:0;width:100%;height:26px;padding:2px 4px;border:1px solid #ffe4bc;border-radius:8px;background:linear-gradient(#a64a69,#692d4e);box-shadow:0 2px 4px #4e163b55;color:#fffceb;font:800 10px/20px system-ui;touch-action:manipulation}
#debug-tools #debug-start{background:linear-gradient(#68b9a3,#297a72)}
#debug-tools #jpc-mode{background:linear-gradient(#ae74d7,#6c439b)}
#debug-tools #jpc-mode[aria-pressed="true"]{background:linear-gradient(#ffcf6e,#b76c26);color:#4d2540}
.debug-tools button:disabled{opacity:.5;filter:saturate(.5)}
body.mobile-landscape #debug-tools{right:491px}
body.mobile-landscape #debug-tools #debug-reset{right:auto}
.round-result-layer{inset:0 0 72px;padding:18px 12px 8px;overflow:hidden;background:radial-gradient(ellipse at 50% 34%,#fff6dc88,#633052a6),url('assets/candy-roulette-world.svg') center/cover;align-items:center;isolation:isolate}
.round-result-layer:not([hidden]){animation:sweet-result-scenery .4s ease-out both}
.round-result{width:450px;max-width:100%;box-sizing:border-box;padding:22px 14px 16px;border:8px solid #d39159;border-image:none;border-radius:36px;background:linear-gradient(#fff7e9e8,#ffebf4ed 60%,#fff3c7ee),var(--candy-land) center/cover;box-shadow:inset 0 0 0 3px #fffbdc,inset 0 0 0 7px #e5b271,0 0 0 2px #894b41,0 9px 0 #874539,0 15px 30px #3d123461;text-align:center;position:relative;isolation:isolate}
.round-result-layer:not([hidden]) .round-result{animation:sweet-result-enter .68s cubic-bezier(.2,.8,.2,1.15) both}
.round-result:before{content:"";position:absolute;inset:8px;border:2px dashed #e5ac7c;border-radius:23px;pointer-events:none;z-index:-1}
.result-candy-corners{position:absolute;inset:0;pointer-events:none;z-index:3}
.result-candy-corners svg{position:absolute;width:54px;height:54px;filter:drop-shadow(0 3px 2px #8a4f4d66)}
.result-candy-corners svg:nth-child(1){left:-18px;top:30px;transform:rotate(-22deg)}
.result-candy-corners svg:nth-child(2){right:-18px;top:30px;transform:rotate(19deg)}
.result-candy-corners svg:nth-child(3){left:-16px;bottom:18px;transform:rotate(15deg)}
.result-candy-corners svg:nth-child(4){right:-16px;bottom:18px;transform:rotate(-16deg)}
.result-pennants{position:absolute;top:7px;left:28px;right:28px;display:flex;justify-content:space-around;gap:8px;border-top:2px solid #d1a158;pointer-events:none}
.result-pennants i{display:block;width:20px;height:21px;background:#f48eae;clip-path:polygon(0 0,100% 0,50% 100%)}
.result-pennants i:nth-child(3n+2){background:#83d4c7}.result-pennants i:nth-child(3n){background:#f5cc73}
.round-result .result-logo{width:210px;height:73px;margin:0 auto -3px}
.round-result h2{display:block;width:72%;margin:2px auto 0;padding:6px 16px 7px;border-radius:45% 45% 15px 15px;border:2px solid #ffedb5;background:linear-gradient(#c85b83,#863055);box-shadow:0 3px #c99357;font:900 31px/39px CookieLabels,system-ui;color:#fff6c9;-webkit-text-stroke:.6px #8e4751;letter-spacing:5px;text-shadow:0 2px #7c3547}
.result-subtitle{display:block;margin:5px 0 0;font:800 8px/13px system-ui;letter-spacing:3.4px;color:#a36356}
.round-result .result-total{display:flex;flex-direction:column;gap:0;margin:10px 12px 15px;padding:12px 8px 13px;min-height:92px;border:3px solid #edc66f;border-radius:28px;background:radial-gradient(ellipse at 50% 0,#ffe9c9 0,#fff5d9 44%,#edbfa2 100%);box-shadow:inset 0 0 0 2px #fffbe1,0 4px 0 #bd7955,0 7px 12px #a75b6c33;position:relative}
.result-total:before,.result-total:after{content:"";position:absolute;top:14px;width:22px;height:22px;border-radius:50%;background:radial-gradient(circle at 35% 25%,#fff8e8 0,#eaae64 35%,#a95538 100%);box-shadow:inset 0 0 0 3px #efc48b;pointer-events:none}
.result-total:before{left:-11px}.result-total:after{right:-11px}
.result-total-label{font:900 12px/17px system-ui;letter-spacing:3px;color:#9b5740}
.result-total-amount{display:flex;align-items:baseline;justify-content:center;gap:7px;min-height:60px;line-height:1.1;white-space:nowrap}
.result-total-amount .win-word{font-size:22px}
#result-total-win{display:inline-block;min-width:0;filter:drop-shadow(0 2px 0 #ffffffd9)}
#result-games{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;padding:0 0 3px}
#result-games .result-game{display:flex;min-width:0;flex-direction:column;align-items:center;justify-content:flex-start;gap:5px;margin:0;padding:10px 5px 9px;text-align:center;border:2px solid #d0a06a;border-radius:18px;background:linear-gradient(#fffbe9,#ffe2d6);box-shadow:inset 0 0 0 2px #fff7db,0 4px #bf8659}
#result-games .result-game:nth-child(2){background:linear-gradient(#f9fff0,#d5f1de)}
#result-games .result-game:nth-child(3){background:linear-gradient(#fff8ff,#ead8f9)}
.round-result-layer:not([hidden]) .result-game{animation:sweet-card-enter .52s cubic-bezier(.18,.8,.25,1.14) both;animation-delay:.26s}
.round-result-layer:not([hidden]) .result-game:nth-child(2){animation-delay:.39s}.round-result-layer:not([hidden]) .result-game:nth-child(3){animation-delay:.52s}
.result-game-emblem{width:36px;height:36px;filter:drop-shadow(0 2px 1px #9b69454d)}
#result-games .result-game-name{font:900 11px/15px CookieLabels,system-ui;white-space:nowrap;color:#824333}
.result-game-name small{display:block;font:800 8px/12px system-ui;color:#986c56}
#result-games .result-game-award{display:flex;min-width:0;flex-direction:column;align-items:center;gap:1px;text-align:center;font-size:11px;line-height:17px}
#result-games .result-game-details{display:flex;min-width:0;flex-direction:column;align-items:center;gap:0;font:700 8px/13px system-ui;white-space:normal;color:#78523c}
#result-games .result-game.no-bet{opacity:.6;filter:saturate(.35)}
.round-result .result-status{font:800 11px/16px CookieLabels,system-ui;margin:13px 0 2px;color:#8a4c53}
.result-next-info{margin:1px 0 6px;font:800 10px/17px system-ui;color:#9c6a58}
.result-next-info strong{font-size:16px;color:#bf5572;font-variant-numeric:tabular-nums}
.result-countdown-track{height:5px;max-width:180px;margin:0 auto;border-radius:5px;background:#debfae;overflow:hidden}
#result-countdown-fill{display:block;height:100%;width:100%;transform-origin:left center;background:linear-gradient(90deg,#eb809d,#f0bc67,#8bc9ba);border-radius:5px}
#result-next[hidden]{display:none!important}
@keyframes sweet-result-scenery{from{opacity:0}to{opacity:1}}
@keyframes sweet-result-enter{0%{opacity:0;transform:translateY(48px) scale(.78)}72%{opacity:1;transform:translateY(-4px) scale(1.015)}100%{opacity:1;transform:none}}
@keyframes sweet-card-enter{from{opacity:0;transform:translateY(28px) rotate(-3deg) scale(.92)}to{opacity:1;transform:none}}
#screen.jpc-active>.game,#screen.jpc-active>.games-deck{visibility:hidden;pointer-events:none}
.jpc-dashboard{position:absolute;z-index:150;box-sizing:border-box;padding:14px 20px 11px;display:flex;flex-direction:column;gap:6px;min-height:0;border:7px solid #b78153;border-radius:27px;background:linear-gradient(#fff7e8f5,#f1e1f6ef),var(--candy-land) center/cover;box-shadow:inset 0 0 0 3px #ffecb5,0 4px #754a3d;color:#713b53;text-align:center}
.jpc-dashboard[hidden]{display:none!important}
.jpc-dashboard header{flex:none}.jpc-kicker{font:800 8px/10px system-ui;letter-spacing:3px;color:#a17159}
.jpc-dashboard h2{margin:2px 0;font:1000 24px/28px CookieLabels,system-ui;color:#a44d83;-webkit-text-stroke:1px #fff3c7;paint-order:stroke fill;text-shadow:0 2px #ddae6d}
.jpc-dashboard header p{font:800 10px/13px system-ui;margin:1px 0;color:#936c50}
.jpc-summary{flex:none;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
.jpc-summary>span{padding:5px 2px;background:#fffaf0;border:1px solid #e0bb94;border-radius:10px;font:900 12px/21px system-ui}
.jpc-summary small{display:block;font:800 8px/11px system-ui;color:#9a6857}.jpc-summary b{font:900 25px/29px ArcadePayout,system-ui;color:#90557f}.jpc-summary em{font:800 9px/12px system-ui;margin-left:2px}
.jpc-progress{flex:none;height:5px;border-radius:6px;overflow:hidden;background:#dbc1d1}.jpc-progress i{height:100%;display:block;background:linear-gradient(90deg,#d68cd4,#f3bd7a,#8cd5c4);width:0;transition:width .15s linear}
.jpc-grid{display:grid;flex:1;min-height:90px;grid-template-columns:repeat(5,minmax(0,1fr));grid-template-rows:repeat(5,minmax(0,1fr));gap:6px;padding:4px}
.jpc-pocket{--pocket-color:#e5e0e7;display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:0;min-height:0;border:2px solid #fff8dd;border-radius:11px;background:linear-gradient(#fffef9,var(--pocket-color));box-shadow:0 0 0 1px #cba081,0 3px 0 #b88765;font:900 21px/23px SweetMedal,system-ui;color:#76505c;position:relative}
.jpc-pocket small{font:800 8px/10px system-ui}.jpc-pocket.hit{color:#4e3154;box-shadow:0 0 0 1px #cba081,0 3px 0 #b88765,inset 0 0 8px #fff9df}
.jpc-pocket[data-count="1"]{--pocket-color:#9fc6ff}.jpc-pocket[data-count="2"]{--pocket-color:#98e0a2}.jpc-pocket[data-count="3"]{--pocket-color:#ffe88e}.jpc-pocket[data-count="4"]{--pocket-color:#d4a5f6}.jpc-pocket[data-count="5"]{--pocket-color:#f6a0b4}
.jpc-pocket.just-hit{animation:jpc-cookie-hit .55s ease-out}.jpc-pocket.is-reach{outline:3px solid #f589a9;outline-offset:1px;animation:jpc-reach-pulse 1.1s ease-in-out infinite}
.jpc-dashboard.is-jackpot .jpc-pocket{background:linear-gradient(125deg,#ffd3e2,#ffeaaa,#b7ebd5,#c2ddff,#e0c2f5);box-shadow:0 0 6px #ffe1a4,0 2px #c58a69}
.jpc-message{flex:none;font:900 12px/18px CookieLabels,system-ui;margin:0;min-height:18px;color:#a34d72}
.jpc-last{flex:none;display:flex;align-items:center;justify-content:center;gap:5px;min-height:22px}.jpc-last>small{font:800 8px/12px system-ui;white-space:nowrap}.jpc-last>div{display:flex;gap:3px;align-items:center;justify-content:flex-end;min-width:0}
.jpc-last b{width:21px;height:21px;flex:none;display:grid;place-items:center;font:900 11px/21px system-ui;background:radial-gradient(circle at 30% 20%,#fff,#ffddb4);border:1px solid #d5a56d;border-radius:50%;color:#864c51}
.jpc-dashboard footer{font:700 8px/11px system-ui;color:#a57b6f;flex:none}
body.mobile-landscape #screen.jpc-active>.arena{grid-row:1 / 3}
body.mobile-landscape .round-result{display:grid;grid-template-columns:1fr 1.4fr;width:760px;max-width:calc(100% - 60px);padding:24px 22px 15px;column-gap:20px;align-items:center}
body.mobile-landscape .round-result .result-logo{grid-column:1;height:57px;width:176px;margin:0 auto}
body.mobile-landscape .round-result h2{grid-column:1;font-size:27px;line-height:31px}
body.mobile-landscape .result-subtitle{grid-column:1}
body.mobile-landscape .result-total{grid-column:1;margin:8px 0}
body.mobile-landscape #result-games{grid-column:2;grid-row:1 / 6;align-items:stretch}
body.mobile-landscape .result-status,body.mobile-landscape .result-next-info,body.mobile-landscape .result-countdown-track{grid-column:1 / -1;margin-top:2px}
body.mobile-landscape .result-countdown-track{width:180px}
body.mobile-landscape .jpc-dashboard{padding:9px 16px 8px;gap:4px}
body.mobile-landscape .jpc-dashboard h2{font-size:20px;line-height:23px}body.mobile-landscape .jpc-dashboard header p{font-size:9px;line-height:11px}body.mobile-landscape .jpc-summary>span{padding:2px}body.mobile-landscape .jpc-summary b{font-size:20px;line-height:23px}
body.mobile-landscape .jpc-grid{gap:5px}.mobile-landscape .jpc-pocket{font-size:16px;line-height:18px}
@keyframes jpc-cookie-hit{0%{transform:scale(.85);filter:brightness(1.5)}45%{transform:scale(1.08);filter:brightness(1.3)}100%{transform:none;filter:none}}
@keyframes jpc-reach-pulse{50%{filter:brightness(1.3);box-shadow:0 0 12px #ffbc9c}}
.paused .round-result,.paused .result-game,.paused .round-result-layer,.paused .jpc-pocket{animation-play-state:paused!important}
@media(prefers-reduced-motion:reduce){.round-result-layer,.round-result,.result-game,.jpc-pocket{animation:none!important}.jpc-progress i{transition:none}}
@media(forced-colors:active){.round-result,.result-total,#result-games .result-game,.jpc-dashboard,.jpc-pocket,.jpc-summary>span,.debug-tools button{background:Canvas!important;color:CanvasText!important;border:2px solid CanvasText!important;box-shadow:none!important}.result-candy-corners,.result-pennants{display:none}.jpc-pocket.is-reach{outline:3px solid Highlight}}
'''
replace('</style></head><body>',css+'</style></head><body>')

replace('let resultInert=[];',r'''const RESULT_DISPLAY_MS=8000;
let resultInert=[],resultAutoTimer=null,resultAutoToken=-1,resultAutoElapsed=0,resultAutoStamp=null;
const jpcSession={active:false,timer:null,key:'',previousCounts:Array(25).fill(0),previousHits:0,inert:[]};
function stopResultAuto(){if(resultAutoTimer!==null)clearTimeout(resultAutoTimer);resultAutoTimer=null;resultAutoStamp=null;}
function syncResultAuto(a){
 if(!a.result||!['result','paying','complete'].includes(a.phase)||jpcSession.active){stopResultAuto();resultAutoToken=-1;return;}
 if(resultAutoToken!==a.token){stopResultAuto();resultAutoToken=a.token;resultAutoElapsed=0;}
 if(resultAutoTimer===null)resultAutoTimer=setTimeout(tickResultAuto,100);
}
function tickResultAuto(){
 resultAutoTimer=null;
 if(!app.result||app.token!==resultAutoToken||!['result','paying','complete'].includes(app.phase)||jpcSession.active){stopResultAuto();return;}
 const now=performance.now(),available=!document.hidden&&inView&&!app.paused&&!menuOpen&&!userPaused;
 if(available){if(resultAutoStamp!==null)resultAutoElapsed+=Math.max(0,now-resultAutoStamp);resultAutoStamp=now;}else resultAutoStamp=null;
 const remaining=Math.max(0,RESULT_DISPLAY_MS-resultAutoElapsed);
 put('result-seconds',String(Math.ceil(remaining/1000)));$('result-countdown-fill').style.transform='scaleX('+(remaining/RESULT_DISPLAY_MS)+')';
 if(remaining===0&&app.phase==='complete'&&available){nextFromResult();return;}
 resultAutoTimer=setTimeout(tickResultAuto,100);
}
''')
replace("function renderRoundResult(a){\n", "function renderRoundResult(a){\n syncResultAuto(a);syncDebugButtons();\n")
old="   $('result-games').innerHTML=a.engines.map((e,i)=>a.enabled[i]?'<div class=\"result-game\"><strong class=\"result-game-name\">ゲーム '+(i+1)+' <small>'+num(a.locked[i])+' BET</small></strong><div class=\"result-game-award\"><b class=\"result-value\" data-value=\"'+a.roundWins[i]+'\"></b><em class=\"win-word\">WIN</em></div><div class=\"result-game-details\"><span>'+e.maxLink+' LINK · '+e.maxChain+'連鎖'+(e.allClears?' · 全消し'+e.allClears+'回':'')+'</span>'+(e.wonderCollected?'<span><i class=\"sugar-gem\" data-value=\"'+(e.wonderToken?.value||a.locked[i])+'\"></i> GET!</span>':'')+'</div></div>':'').join('');"
new="   $('result-games').innerHTML=a.engines.map((e,i)=>'<div class=\"result-game'+(a.enabled[i]?'':' no-bet')+'\"><svg class=\"result-game-emblem\" viewBox=\"0 0 64 64\" aria-hidden=\"true\"><use href=\"#candy'+[0,2,4][i]+'\"/></svg><strong class=\"result-game-name\">ゲーム '+(i+1)+' <small>'+(a.enabled[i]?num(a.locked[i])+' BET':'NO BET')+'</small></strong><div class=\"result-game-award\"><b class=\"result-value\" data-value=\"'+(a.enabled[i]?a.roundWins[i]:0)+'\"></b><em class=\"win-word\">WIN</em></div><div class=\"result-game-details\"><span>'+(a.enabled[i]?e.maxLink+' LINK':'—')+'</span><span>'+(a.enabled[i]?e.maxChain+'連鎖'+(e.allClears?' · 全消し'+e.allClears+'回':''):'参加なし')+'</span>'+(a.enabled[i]&&e.wonderCollected?'<span><i class=\"sugar-gem\" data-value=\"'+(e.wonderToken?.value||a.locked[i])+'\"></i> GET!</span>':'')+'</div></div>').join('');"
replace(old.lstrip(),new.lstrip())
replace("fitGoldenNumber(el,num(Number(el.dataset.value)),22,100);","fitGoldenNumber(el,num(Number(el.dataset.value)),26,94);")
replace("fitGoldenNumber($('result-total-win'),num(a.totalWin),32,186);","fitGoldenNumber($('result-total-win'),num(a.totalWin),52,250);")
replace("function nextFromResult(){if(app.phase!=='complete')return;", "function nextFromResult(){if(app.phase!=='complete'||jpcSession.active)return;stopResultAuto();resultAutoToken=-1;")
replace("function syncBetPreview(a){", "function syncBetPreview(a){\n if(jpcSession.active){stopBetPreview();return;}")
replace("function startReadyRound(){\n", "function startReadyRound(){\n if(jpcSession.active)return false;\n")
replace("function scheduleAutoRound(){\n", "function scheduleAutoRound(){\n syncDebugButtons();if(jpcSession.active){stopAutoRound();countdownText('JPC','デバッグ抽選');return;}\n")
replace("function debugResetRound(){\n", "function debugResetRound(){\n if(jpcSession.active){restartJpcRound();return;}stopResultAuto();resultAutoToken=-1;\n")
replace("payoutStamp=null;app.pause(menuOpen||userPaused||document.hidden||!inView);", "payoutStamp=null;resultAutoStamp=null;app.pause(menuOpen||userPaused||document.hidden||!inView||jpcSession.active);if(jpcSession.active)rouletteDriver?.setPaused(menuOpen||userPaused||document.hidden||!inView);")
# Normal retry logic must not create extra balls in the now-exposed 70-ball mode.
replace("if(draw.state==='complete'&&physics.hits.length<8&&!physics.active&&physics.time>=retryAt)", "if(draw.mode==='eight'&&draw.state==='complete'&&physics.hits.length<8&&!physics.active&&physics.time>=retryAt)")
replace("status.textContent=physics.hits.length<8?'未入賞の球を再発射します':jpc?", "status.textContent=eight&&physics.hits.length<8?'未入賞の球を再発射します':jpc?")
replace("el('[data-count]').textContent=`${physics.hits.length} / 8`;", "el('[data-count]').textContent=`${physics.hits.length} / ${draw.mode==='jpc'?70:8}`;")
replace("physics.onFault=id=>{launchPlanner.recordFault(id);retryAt=physics.time+1.5;status.textContent='未入賞の球を再発射します';};", "physics.onFault=id=>{launchPlanner.recordFault(id);retryAt=physics.time+1.5;status.textContent=draw.mode==='jpc'?'未入賞の球があります':'未入賞の球を再発射します';};")

js=r'''
function syncDebugButtons(){
 const start=$('debug-start'),mode=$('jpc-mode');if(!start||!mode||!app)return;
 const ready=rouletteReady&&!!rouletteDriver,state=rouletteDriver?.draw.state;
 start.disabled=!ready||menuOpen||(jpcSession.active?!['ready','complete'].includes(state):app.phase!=='ready'||!app.bets.some(n=>n>0));
 start.textContent=jpcSession.active?(state==='complete'?'もう一度':state==='ready'?'JPC開始':'抽選中'):'すぐ開始';
 mode.disabled=!ready||menuOpen||(!jpcSession.active&&!['ready','complete'].includes(app.phase));
 mode.textContent=jpcSession.active?'通常モード':'JPCモード';mode.setAttribute('aria-pressed',String(jpcSession.active));
 mode.title=!jpcSession.active&&app.phase!=='ready'&&app.phase!=='complete'?'通常ゲーム終了後、または即リセット後に切り替えられます':'暫定JPC。通常ゲームの配当と成績には加算しません';
}
function positionJpcDashboard(){
 const screen=$('screen'),panel=$('jpc-dashboard');if(!jpcSession.active||!panel)return;
 const sr=screen.getBoundingClientRect(),scale=sr.width/screen.offsetWidth;
 const targets=document.body.classList.contains('mobile-landscape')?[screen.querySelector('.game')]:[screen.querySelector('.games-deck'),screen.querySelector('.game')];
 const rects=targets.map(n=>n.getBoundingClientRect()),left=Math.min(...rects.map(r=>r.left)),right=Math.max(...rects.map(r=>r.right)),top=Math.min(...rects.map(r=>r.top)),bottom=Math.max(...rects.map(r=>r.bottom));
 panel.style.left=(left-sr.left)/scale+'px';panel.style.top=(top-sr.top)/scale+'px';panel.style.width=(right-left)/scale+'px';panel.style.height=(bottom-top)/scale+'px';
}
function ensureJpcCells(){
 const grid=$('jpc-grid');if(grid.children.length===25)return;
 for(let n=1;n<=25;n++){const cell=document.createElement('div');cell.className='jpc-pocket';cell.setAttribute('role','listitem');cell.innerHTML='<b>'+n+'</b><small>0 HIT</small>';cell.dataset.count='0';grid.append(cell);}
}
function stopJpcTicker(){if(jpcSession.timer!==null)clearTimeout(jpcSession.timer);jpcSession.timer=null;}
function paintJpcDashboard(){
 if(!jpcSession.active||!rouletteDriver)return;
 ensureJpcCells();const driver=rouletteDriver,counts=driver.jpcCounts,launched=driver.physics.serial,hits=driver.physics.hits,filled=counts.filter(n=>n>0).length,state=driver.draw.state;
 const key=[launched,state,...counts].join(',');if(key===jpcSession.key){syncDebugButtons();return;}jpcSession.key=key;
 const reach=filled===24?counts.findIndex(n=>n===0):-1;
 put('jpc-launched',String(launched));put('jpc-landed',String(hits.length));put('jpc-filled',String(filled));put('jpc-round','ROUND '+Math.min(4,Math.ceil(Math.max(1,launched)/20))+' / 4');
 $('jpc-progress-fill').style.width=Math.min(100,launched/70*100)+'%';$('jpc-progress-fill').parentNode.setAttribute('aria-valuenow',String(launched));
 [...$('jpc-grid').children].forEach((cell,i)=>{const count=counts[i];cell.dataset.count=String(Math.min(5,count));cell.classList.toggle('hit',count>0);cell.classList.toggle('is-reach',i===reach);cell.querySelector('small').textContent=count+' HIT';cell.setAttribute('aria-label',(i+1)+'番 '+count+'球入賞'+(i===reach?' リーチ':''));if(count>jpcSession.previousCounts[i]){cell.classList.remove('just-hit');void cell.offsetWidth;cell.classList.add('just-hit');}});
 $('jpc-dashboard').classList.toggle('is-jackpot',filled===25);
 const ended=state==='complete',remaining=25-filled;
 put('jpc-message',filled===25?'JACKPOT! 全25ポケット達成':reach>=0?(ended?'JPC終了・':'')+(reach+1)+'番 リーチ！':ended?'JPC終了・'+filled+' / 25 ポケット入賞':'あと '+remaining+' ポケットで JACKPOT!');
 $('jpc-history').replaceChildren(...hits.slice(-10).map(hit=>{const b=document.createElement('b');b.textContent=String(hit.pocket);return b;}));
 if(hits.length>jpcSession.previousHits&&!document.hidden&&!menuOpen&&!userPaused&&inView)playArrivalSound();
 jpcSession.previousCounts=[...counts];jpcSession.previousHits=hits.length;syncDebugButtons();
}
function runJpcTicker(){
 stopJpcTicker();if(!jpcSession.active)return;
 paintJpcDashboard();jpcSession.timer=setTimeout(runJpcTicker,150);
}
function restartJpcRound(){
 if(!jpcSession.active||!rouletteReady||!rouletteDriver)return false;
 stopAutoRound();stopResultAuto();stopSounds();stopBgm();stopBetPreview();rouletteDrawSource.callbacks=null;
 jpcSession.key='';jpcSession.previousCounts=Array(25).fill(0);jpcSession.previousHits=0;
 $('a8-mode').value='jpc';rouletteDriver.draw.select('jpc');rouletteDriver.start();
 app.paused=true;for(const e of app.engines)e.paused=true;
 rouletteDriver.setPaused(document.hidden||menuOpen||userPaused||!inView);countdownText('JPC','デバッグ抽選');runJpcTicker();return true;
}
function toggleJpcMode(){
 if(!rouletteReady||!rouletteDriver||menuOpen)return false;
 if(jpcSession.active){
  stopJpcTicker();stopSounds();jpcSession.active=false;$('screen').classList.remove('jpc-active');$('jpc-dashboard').hidden=true;
  for(const [el,was] of jpcSession.inert)el.inert=was;jpcSession.inert=[];
  $('a8-mode').value='eight';rouletteDriver.draw.select('eight');userPaused=false;app.prepare();syncPause();scheduleAutoRound();scheduleUI(app);requestFit();return true;
 }
 if(!['ready','complete'].includes(app.phase))return false;
 debugResetRound();jpcSession.active=true;stopAutoRound();stopResultAuto();stopBetPreview();stopBgm();stopSounds();
 $('screen').classList.add('jpc-active');$('jpc-dashboard').hidden=false;jpcSession.inert=[];
 for(const el of [$('screen').querySelector('.games-deck'),$('screen').querySelector('.game')]){jpcSession.inert.push([el,el.inert]);el.inert=true;}
 positionJpcDashboard();requestFit();restartJpcRound();syncDebugButtons();return true;
}
'''
replace('function wakeAudioFromGesture(event){',js+'\nfunction wakeAudioFromGesture(event){')
replace("$('debug-reset').onclick=()=>{debugResetRound();activateGameAudio({gesture:true});};", "$('debug-reset').onclick=()=>{debugResetRound();if(!jpcSession.active)activateGameAudio({gesture:true});};\n$('debug-start').onclick=()=>{if(jpcSession.active)restartJpcRound();else{activateGameAudio({gesture:true});startReadyRound();}syncDebugButtons();};\n$('jpc-mode').onclick=toggleJpcMode;")
replace("document.documentElement.style.setProperty('--game-viewport-height',h+'px');", "document.documentElement.style.setProperty('--game-viewport-height',h+'px');positionJpcDashboard();")
# Ensure existing core state machine, all Engine rules and physics remain byte-for-byte.
for start,end in [('class Engine{','class Arcade{'),('class Arcade{','const recordStorage'),('const PHYSICS=(()=>{','const DRAW=(()=>{')]:
 if start in original and end in original:
  a=original[original.index(start):original.index(end,original.index(start))]
  b=s[s.index(start):s.index(end,s.index(start))]
  assert a==b,'Unexpected core change: '+start
p.write_text(s)
with tempfile.TemporaryDirectory() as folder:
 for i,m in enumerate(re.finditer(r'<script\b([^>]*)>([\s\S]*?)</script>',s)):
  attrs,code=m.groups()
  if not code.strip() or re.search(r'type=[\"\x27](?:application/json|importmap)',attrs):continue
  f=Path(folder)/('script'+str(i)+('.mjs' if 'module' in attrs else '.js'));f.write_text(code);subprocess.run(['node','--check',str(f)],check=True)
print('RESULT_JPC_PATCH_AND_SYNTAX_OK')

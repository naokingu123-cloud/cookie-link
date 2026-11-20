/* Server-owned Sugar Challenge. This file presents state; it never draws balls,
 * consumes server Sugar or changes a wallet. */
(()=>{
'use strict';
if(window.SweetsSugarChallengeV254)return;
const R=window.SugarChallengeRulesV254,query=new URLSearchParams(location.search);
if(!R||query.get('serverHost')==='1')return;
const worker=query.get('serverSettlementWorker')==='1'||query.get('downloadWorker')==='1',clone=x=>JSON.parse(JSON.stringify(x)),clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
let client=null,server=null,challenge=null,expanded=false,frame=0,lastStamp=null,intro=0,fillSum=0,fromSum=0,fillAge=900,seenBank='',announceAge=5000,celebrateAge=5000,paintKey='',syncing=false;
const announced=new Set(),celebrated=new Set(),media=matchMedia('(prefers-reduced-motion: reduce)');
const BASE_END=3250,REEL_START=3450,REEL_STOP=6500,INTRO_END=7200;
// This is the visual reel only. The authoritative multiplier comes from the server.
const REEL_SEQUENCE=Object.freeze([1,2,1,3,4,1,2,5,1,3,2,4,1,10]);
const MULTIPLIER_TIERS=Object.freeze({1:'',2:'ハイパー',3:'スペシャル',4:'ウルトラ',5:'ミラクル',10:'ギャラクシー'});
const multiplierLabel=value=>(MULTIPLIER_TIERS[value]?MULTIPLIER_TIERS[value]+' ':'')+value+'倍';
const AWARD_COLORS=Object.freeze({20:'#ffce72',10:'#ff9db7',5:'#d6a0ff',3:'#94a9ff',2:'#74d4ee',1:'#73e4c3'});
let overlay,dock,announcement,celebration,main,bottle,scale,amount,scaleAmount,multiplier,dockAmount,sumNode,history,targets,table,reachText,phaseText,cardName,fill,gauge,gaugeAxis,gaugeColumn,stage,reel,reelTrack,reelBase,resultFace;
const currentRound=()=>String(app.__sugarWorkRoundId||app.__sharedRound?.roundId||window.SweetsSharedMachine?.active?.roundId||client?.round?.id||'');
function stampBank(){
 if(syncing||!Array.isArray(app.wonderBank))return app.wonderBank||[];
 const round=currentRound(),occurrences=new Map();
 for(const token of app.wonderBank){
  const game=Number(token.game)||0,key=game+':'+String(token.id??'sugar'),ordinal=occurrences.get(key)||0;occurrences.set(key,ordinal+1);
  if(token.sugarId)continue;
  const earned=round&&app.phase!=='ready';
  token.sourceRoundId=earned?round:'legacy';token.sourceGame=String(app.engines?.[game]?.kind||SweetsLineup?.ids?.[game]||game);
  token.sugarId=(earned?round:'legacy')+':'+key+':'+ordinal;
  token.sourceBet=Math.max(1,Math.floor(Number(earned?app.locked?.[game]:token.value)||Number(token.value)||1));
 }
 if(!worker){const eligible=app.wonderBank.filter(t=>!t.directJpc&&!t.jpcRedeemed);if(eligible.length>=5){const key=eligible.slice(0,5).map(t=>t.sugarId).join('|');if(!announced.has(key)){announced.add(key);seenBank=key;announceAge=0;wake();}}}
 return app.wonderBank;
}
function payload(){return {version:254,tokens:clone(stampBank())};}
function paused(){return document.hidden||!!app.paused||typeof menuOpen!=='undefined'&&menuOpen||typeof userPaused!=='undefined'&&userPaused||typeof inView!=='undefined'&&!inView;}
function num(node,value,size=30,width=180){if(!node)return;const text=String(Math.max(0,Math.floor(Number(value)||0))),available=Math.max(1,Math.min(width,node.clientWidth||width)),key=text+'/'+size+'/'+available;if(node.dataset.amountFit===key)return;node.dataset.amount=text;node.dataset.amountFit=key;if(typeof fitGoldenNumber==='function')fitGoldenNumber(node,text,size,available);else node.textContent=text;}
function setExpanded(value){expanded=!!value;paintKey='';render();if(!expanded)dock?.focus({preventScroll:true});wake();}
function restore(raw){const next=raw?.version===254?raw:null;if(!next)return false;
 if(server&&Number(next.revision)<Number(server.revision))return false;
 const old=challenge,nextChallenge=next.challenge?.phase==='cancelled'?null:R.restore(next.challenge);
 if(old&&nextChallenge?.id===old.id&&nextChallenge.draws.length<old.draws.length)return false;
 stampBank();const accepted=new Set(next.acceptedIds||[]),pending=app.wonderBank.filter(t=>t.sugarId&&!accepted.has(t.sugarId));
 syncing=true;const merged=new Map();for(const t of [...(next.bank||[]),...pending])merged.set(t.sugarId||String(t.game)+':'+String(t.id),clone(t));app.wonderBank=[...merged.values()];app.wonderSteps=app.wonderBank.length;app.wonderValue=app.wonderBank.reduce((n,t)=>n+(Number(t.value)||0),0);syncing=false;
 server=clone(next);challenge=nextChallenge;
 if(challenge&&challenge.id!==old?.id){
  const opened=Number(next.startedAt||next.openedAt||next.challenge?.openedAt||next.challenge?.startedAt)||Date.now();
  intro=challenge.draws.length?INTRO_END:clamp(Date.now()+(Number(client?.clockOffset)||0)-opened,0,INTRO_END);fillSum=fromSum=0;fillAge=900;expanded=true;paintKey='';
 }
 if(challenge&&(challenge.sum!==(old?.sum||0)||challenge.id!==old?.id&&challenge.draws.length>0)){fromSum=fillSum;fillAge=0;}
 if(challenge?.jpcQualified&&!celebrated.has(challenge.id)){celebrated.add(challenge.id);celebrateAge=0;try{sceneSound('bonus',{volume:.65});}catch{}}
 if(!challenge&&old){expanded=false;paintKey='';}
 if(next.queued&&next.bank?.length>=5)stampBank();
 if(!worker){render();wake();try{scheduleUI(app);}catch{}}
 return true;
}
function mount(){
 if(worker)return;
 const game=document.querySelector('#screen > .game'),roulette=document.getElementById('cookie-roulette'),screen=document.getElementById('screen');if(!game||!roulette||!screen)return;
 game.classList.add('sc254-host');
 overlay=document.createElement('section');overlay.className='sc254-overlay';overlay.hidden=true;overlay.tabIndex=0;overlay.setAttribute('role','button');overlay.setAttribute('aria-label','シュガーチャレンジ。タップで小さく表示');
 overlay.innerHTML=`<div class="sc254-sparkles" aria-hidden="true"></div>
 <header class="sc254-head"><div><small>SWEETS KINGDOM</small><h2>シュガーチャレンジ</h2></div><div class="sc254-jp"><span>JACKPOT</span><b data-sc-amount></b></div></header>
 <div class="sc254-content">
  <div class="sc270-summary"><div class="sc254-card-name"></div><div class="sc254-targets"></div><p class="sc254-reach" aria-live="polite"></p></div>
  <div class="sc270-stage">
   <div class="sc254-magic">
    <div class="sc254-scale"><img src="assets/sugar-art-v254/scale.webp" alt="シュガーを量る魔法の秤"><div class="sc254-five" aria-hidden="true">${Array.from({length:5},(_,i)=>'<i class="sugar-gem" data-i="'+i+'"></i>').join('')}</div><div class="sc254-sugar-stream" aria-hidden="true"></div><b data-sc-scale-amount></b></div>
    <div class="sc254-bottle"><div class="sc254-fill-shell"><div class="sc254-fill"></div></div><img src="assets/sugar-art-v254/bottle.webp" alt="数字の量だけシュガーが入る魔法の瓶"><div class="sc254-sugar-stream" aria-hidden="true"></div><div class="sc254-sum"><small>シュガー投入量</small><b data-sc-sum></b><span data-sc-ball-count></span></div><b class="sc254-last-hit"></b></div>
    <div class="sc254-digital" role="img" aria-label="1倍"><img data-sc-result-face src="assets/sugar-art-v270/multiplier-1.png" alt="1倍"><b data-sc-multiplier aria-hidden="true">1倍</b></div>
   </div>
   <div class="sc270-gauge-column"><div class="sc270-gauge-caption">合計ゲージ</div><div class="sc270-gauge-axis" aria-hidden="true"></div><div class="sc270-gauge" role="img" aria-label="シュガー合計 0から172"><div class="sc270-gauge-bands"></div><div class="sc270-gauge-pins"></div><div class="sc270-gauge-marker"><b data-sc-gauge-current>0</b></div></div></div>
   <div class="sc254-card"><table class="sc254-payouts" aria-label="配当"><colgroup><col style="width:13px"><col></colgroup><thead><tr><th colspan="2">配当</th></tr></thead><tbody></tbody></table></div>
   <div class="sc270-reel" aria-label="JP倍率ルーレット"><div class="sc270-reel-caption">JP倍率ルーレット</div><div class="sc270-reel-window"><div class="sc270-reel-track" aria-hidden="true">${Array.from({length:6},(_,lap)=>REEL_SEQUENCE.map((value,index)=>'<div class="sc270-reel-card" data-multiplier="'+value+'" data-lap="'+lap+'" data-index="'+index+'"><img src="assets/sugar-art-v270/multiplier-'+value+'.png" alt="'+multiplierLabel(value)+'"></div>').join('')).join('')}</div><div class="sc270-reel-pointer" aria-hidden="true"></div></div><div class="sc270-base"><span>JPベース</span><b data-sc-reel-base></b></div><p class="sc270-reel-state" role="status" aria-live="polite"></p></div>
  </div>
  <div class="sc270-bottom"><p class="sc254-phase"></p><div class="sc254-history" aria-label="このゲームの8球"></div></div>
 </div><footer>タップしてルーレット右下へしまう</footer>`;
 game.append(overlay);main=overlay.querySelector('.sc254-content');stage=overlay.querySelector('.sc270-stage');bottle=overlay.querySelector('.sc254-bottle');scale=overlay.querySelector('.sc254-scale');amount=overlay.querySelector('[data-sc-amount]');scaleAmount=overlay.querySelector('[data-sc-scale-amount]');multiplier=overlay.querySelector('[data-sc-multiplier]');resultFace=overlay.querySelector('[data-sc-result-face]');sumNode=overlay.querySelector('[data-sc-sum]');history=overlay.querySelector('.sc254-history');targets=overlay.querySelector('.sc254-targets');table=overlay.querySelector('tbody');reachText=overlay.querySelector('.sc254-reach');phaseText=overlay.querySelector('.sc254-phase');cardName=overlay.querySelector('.sc254-card-name');fill=overlay.querySelector('.sc254-fill');gauge=overlay.querySelector('.sc270-gauge');gaugeAxis=overlay.querySelector('.sc270-gauge-axis');gaugeColumn=overlay.querySelector('.sc270-gauge-column');reel=overlay.querySelector('.sc270-reel');reelTrack=overlay.querySelector('.sc270-reel-track');reelBase=overlay.querySelector('[data-sc-reel-base]');
 scale.querySelectorAll('.sugar-gem').forEach((el,i)=>{if(typeof applySugarTier==='function')applySugarTier(el,i);});
 dock=document.createElement('button');dock.type='button';dock.className='sc254-dock';dock.hidden=true;dock.setAttribute('aria-label','シュガーチャレンジを大きく表示');dock.innerHTML='<img src="assets/sugar-art-v254/bottle.webp" alt=""><span><small>シュガーチャレンジ</small><b class="sc254-dock-sum"></b><em></em></span>';roulette.append(dock);dockAmount=dock.querySelector('b');
 announcement=document.createElement('div');announcement.className='sc254-announcement';announcement.hidden=true;announcement.setAttribute('role','status');announcement.innerHTML='<div class="sc254-announcement-rays"></div><div class="sc254-announcement-badge"><small>5 SUGAR GET!</small><strong>シュガーチャレンジ</strong><span>次のBETタイムでJP・倍率を決定！</span></div>';screen.append(announcement);
 celebration=document.createElement('div');celebration.className='sc254-celebration';celebration.hidden=true;celebration.setAttribute('role','status');celebration.innerHTML='<div class="sc254-celebration-rays"></div><img src="assets/sugar-art-v254/jpc-title.webp" alt="JACKPOT CHANCE獲得"><div><span>JACKPOT</span><b></b><small>JPC挑戦権を獲得！</small></div>';screen.append(celebration);
 overlay.addEventListener('click',()=>setExpanded(false));overlay.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '||event.key==='Escape'){event.preventDefault();setExpanded(false);}});dock.addEventListener('click',event=>{event.stopPropagation();setExpanded(true);overlay.focus({preventScroll:true});});
 const resize=()=>{if(!overlay)return;overlay.style.setProperty('--sc254-unit',Math.max(1,Math.min(game.clientWidth/700,game.clientHeight/440)).toFixed(4));paintKey='';render();wake();};
 new ResizeObserver(resize).observe(game);addEventListener('resize',resize);
}
// One shared vertical numeric scale: every band and lucky mark uses 0..172.
function verticalBand(min,max,attributes=''){
 const bottom=clamp((min-.5)/R.MAX_SUM)*100,top=clamp((max+.5)/R.MAX_SUM)*100;
 return '<i class="sc270-gauge-band" data-min="'+min+'" data-max="'+max+'" '+attributes+' style="bottom:'+bottom.toFixed(6)+'%;height:'+(top-bottom).toFixed(6)+'%"></i>';
}
function paintGauge(s,card){
 const bands=[verticalBand(R.MIN_SUM,card.lowMax,'data-jpc="true"'),verticalBand(card.highMin,R.MAX_SUM,'data-jpc="true"')];
 for(const row of R.payoutRows(s.cardId))for(const range of row.ranges)bands.push(verticalBand(range.min,range.max,'data-hundredths="'+row.hundredths+'"'));
 gauge.querySelector('.sc270-gauge-bands').innerHTML=bands.join('');
 gauge.querySelector('.sc270-gauge-pins').innerHTML=card.luckySums.map(n=>'<i class="sc270-lucky-pin" data-total="'+n+'" style="bottom:'+(n/R.MAX_SUM*100).toFixed(6)+'%" title="合計 '+n+' でJPC"></i>').join('');
 const ticks=[0,R.MIN_SUM,card.lowMax,R.CENTER_SUM||104,card.highMin,R.MAX_SUM];
 gaugeAxis.innerHTML=ticks.map(n=>'<span class="sc270-gauge-tick" style="bottom:'+(n/R.MAX_SUM*100).toFixed(6)+'%">'+n+'</span>').join('');
 gauge.setAttribute('aria-label','合計0から'+R.MAX_SUM+'。8球後のJPCは'+R.MIN_SUM+'から'+card.lowMax+'、'+card.highMin+'から'+R.MAX_SUM+'。途中のラッキーナンバーは'+card.luckySums.join('、')+'。現在'+s.sum);
}
function fitVessels(){
 if(!expanded||overlay.hidden)return;
 const magic=overlay.querySelector('.sc254-magic'),w=magic.clientWidth,h=magic.clientHeight;
 const bottleWidth=Math.max(1,Math.min(w,h*.75)),bottleHeight=bottleWidth/.75;
 bottle.style.width=bottleWidth+'px';bottle.style.height=bottleHeight+'px';
 // Both controls are in the same stage, so CSS pixels remain correct under
 // the outer arcade's responsive transform; no viewport-unit mismatch.
 const top=(h-bottleHeight)/2+bottleHeight*.35,height=bottleHeight*.53;
 stage.style.setProperty('--sc270-reel-card-size',Math.max(64,Math.min(136,Math.floor(h-96)))+'px');
 stage.style.setProperty('--sc270-gauge-top',top.toFixed(4)+'px');stage.style.setProperty('--sc270-gauge-height',height.toFixed(4)+'px');
 const legend=overlay.querySelector('.sc254-payouts'),legendTop=Math.max(0,Math.min(h-legend.offsetHeight,top+height/2-legend.offsetHeight/2));
 legend.style.top=legendTop.toFixed(4)+'px';
}
function paintReel(s,introDone){
 const ready=intro>=BASE_END,spinning=!introDone&&intro>=REEL_START&&intro<REEL_STOP;
 stage.dataset.reelReady=String(ready&&!introDone);reel.dataset.tier=!introDone&&intro>=REEL_STOP?String(s.multiplier):'';
 reel.hidden=introDone;reel.dataset.ready=String(ready);reel.dataset.spinning=String(spinning);reel.dataset.settled=String(!introDone&&intro>=REEL_STOP);
 const winningIndex=REEL_SEQUENCE.indexOf(s.multiplier),target=REEL_SEQUENCE.length*3+Math.max(0,winningIndex),progress=clamp((intro-REEL_START)/(REEL_STOP-REEL_START));
 const position=progress>=1?target:target*(1-(1-progress)**4),cardWidth=reelTrack.firstElementChild?.offsetWidth||136,windowWidth=reel.querySelector('.sc270-reel-window').clientWidth;
 reelTrack.style.transform='translate3d('+(windowWidth/2-(position+.5)*cardWidth).toFixed(3)+'px,0,0)';
 reelTrack.dataset.position=position.toFixed(6);reelTrack.dataset.target=String(target);
 const face='assets/sugar-art-v270/multiplier-'+s.multiplier+'.png';if(resultFace.getAttribute('src')!==face)resultFace.setAttribute('src',face);
 const label=multiplierLabel(s.multiplier),result=overlay.querySelector('.sc254-digital');
 resultFace.alt=label;multiplier.textContent=label;result.hidden=!introDone;result.setAttribute('aria-label',label);
 reel.setAttribute('aria-label',!ready?'JPベース計測中。倍率ルーレットは計測後に開始':intro<REEL_STOP?'JPベース'+s.jpBase+'、倍率ルーレット抽選中':'JP倍率 '+label+' に決定');
 num(reelBase,ready?s.jpBase:0,24,160);reelBase.parentElement.hidden=!ready;
 reel.querySelector('.sc270-reel-state').textContent=!ready?'5個のシュガーを計測中…':intro<REEL_START?'JPベース確定！':intro<REEL_STOP?'倍率を決定中…':multiplierLabel(s.multiplier)+'に決定！';
}
function render(){
 if(!overlay)return;
 const blocked=paused(),reduced=media.matches;overlay.dataset.paused=String(blocked);overlay.dataset.reduced=String(reduced);dock.dataset.paused=String(blocked);announcement.dataset.paused=String(blocked);celebration.dataset.paused=String(blocked);
 announcement.hidden=announceAge>=3700||!!challenge&&intro<INTRO_END;announcement.style.setProperty('--sc254-announce-time',Math.max(0,announceAge)+'ms');
 celebration.hidden=celebrateAge>=4400||!challenge?.jpcQualified;celebration.style.setProperty('--sc254-celebrate-time',Math.max(0,celebrateAge)+'ms');
 if(!challenge){overlay.hidden=true;dock.hidden=true;return;}
 const s=challenge,card=R.cards.find(c=>c.id===s.cardId),introDone=reduced||intro>=INTRO_END||s.draws.length>0||app.phase==='playing';
 overlay.style.setProperty('--sc270-progress',(clamp((reduced?s.sum:fillSum)/R.MAX_SUM)*100).toFixed(6)+'%');
 overlay.dataset.beforeRange=String(s.sum<R.MIN_SUM);overlay.querySelector('[data-sc-gauge-current]').textContent=String(Math.round(reduced?s.sum:fillSum));
 overlay.hidden=!expanded;dock.hidden=expanded;dock.setAttribute('aria-expanded',String(expanded));overlay.dataset.card=s.cardId;overlay.dataset.phase=s.phase;overlay.dataset.jpc=String(s.jpcQualified);dock.dataset.jpc=String(s.jpcQualified);
 overlay.dataset.compact=String(overlay.clientHeight<340);overlay.dataset.narrow=String(overlay.clientWidth<360);
 main.dataset.intro=String(!introDone);scale.hidden=introDone;bottle.hidden=!introDone;
 let shownJP=s.jpAmount;
 if(!introDone){
  const position=clamp(intro/650,0,5),whole=Math.min(5,Math.floor(position)),part=position-whole,raw=s.sugarValues.slice(0,whole).reduce((n,x)=>n+x,0)+(s.sugarValues[whole]||0)*part;
  shownJP=intro>=BASE_END?s.jpBase:Math.min(s.jpBase,Math.round(raw/500)*500);num(scaleAmount,shownJP,27,160);
  if(intro>=REEL_STOP){const p=clamp((intro-REEL_STOP)/600),rawAmount=s.jpBase+(s.jpAmount-s.jpBase)*p;shownJP=p===1?s.jpAmount:Math.min(s.jpAmount,Math.round(rawAmount/500)*500);}
  scale.dataset.pouring=String(intro<BASE_END);scale.querySelectorAll('.sugar-gem').forEach((el,i)=>{el.dataset.poured=String(position>=i+1);el.dataset.active=String(Math.floor(position)===i);});
 }
 fitVessels();paintReel(s,introDone);
 num(amount,shownJP,26,112);num(sumNode,reduced?s.sum:fillSum,overlay.dataset.compact==='true'?40:48,160);num(dockAmount,s.sum,23,110);num(celebration.querySelector('b'),s.jpAmount,48,260);
 fill.style.height=(clamp((reduced?s.sum:fillSum)/172)*100).toFixed(3)+'%';bottle.dataset.pouring=String(fillAge<800&&s.draws.length>0&&!reduced);bottle.querySelector('[data-sc-ball-count]').textContent=s.draws.length+' / 8球';bottle.querySelector('.sc254-last-hit').textContent=s.draws.length?'＋'+s.draws.at(-1):'';
 dock.querySelector('em').textContent=s.jpcQualified?'JPC獲得！':s.phase==='complete'?String(s.cashWin)+' WIN':s.draws.length+' / 8球 · JP '+String(s.jpAmount);dock.setAttribute('aria-label','シュガーチャレンジ 合計'+s.sum+'、'+s.draws.length+'球。タップして大きく表示');
 phaseText.textContent=!introDone?intro<BASE_END?'BET TIME · 5個のシュガーを秤へ…':intro<REEL_STOP?'BET TIME · JP倍率決定！':multiplierLabel(s.multiplier)+' · JACKPOT '+s.jpAmount+' に決定！':s.jpcQualified?'JACKPOT CHANCE 確定！':s.phase==='complete'?String(s.cashWin)+' WIN GET!':s.draws.length?'HITした数字の量だけシュガーを投入！':'BET TIME · '+multiplierLabel(s.multiplier)+'に決定';
 overlay.setAttribute('aria-label','シュガーチャレンジ 合計'+s.sum+'、'+(introDone||intro>=REEL_STOP?multiplierLabel(s.multiplier):'倍率決定前')+'、JP '+Math.floor(shownJP)+'。タップで小さく表示');
 const key=s.id+'/'+s.draws.join(',')+'/'+s.jpAmount+'/'+s.cardId+'/'+s.jpcQualified;if(key===paintKey)return;paintKey=key;
 cardName.textContent=(card.rarity==='rare'?'★ RARE CARD ★　':'')+card.name;
 targets.replaceChildren();const low=document.createElement('div'),lucky=document.createElement('div');low.className='sc254-extremes';low.innerHTML='<small>8球後 JPC</small><b>LOW '+card.lowMax+'</b><b>HIGH '+card.highMin+'</b>';lucky.className='sc254-lucky';lucky.innerHTML='<small>途中の一致でもJPC</small>'+card.luckySums.map(n=>'<b data-acquired="'+String(s.jpcQualified&&s.qualifyingSum===n)+'">'+n+'</b>').join('');targets.append(low,lucky);
 table.innerHTML=R.payoutRows(s.cardId).map(row=>'<tr data-current="'+String(s.phase==='complete'&&!s.jpcQualified&&s.award?.payoutHundredths===row.hundredths)+'" data-hundredths="'+row.hundredths+'" style="--sc270-award:'+AWARD_COLORS[row.hundredths]+'"><td class="sc270-award-key"><i aria-hidden="true"></i></td><td><b data-sc-win="'+R.cashFor(s.jpAmount,row.hundredths)+'"></b><span class="sc270-win-unit">WIN</span></td></tr>').join('');
 table.querySelectorAll('[data-sc-win]').forEach(node=>num(node,Number(node.dataset.scWin),overlay.dataset.compact==='true'?17:21,112));paintGauge(s,card);fitVessels();
 history.innerHTML=Array.from({length:8},(_,i)=>'<span data-hit="'+String(i<s.draws.length)+'">'+(s.draws[i]??'·')+'</span>').join('');
 const reaches=R.reaches(s);reachText.textContent=s.jpcQualified?'合計 '+(s.qualifyingSum??s.sum)+' でJPC確定！'+(s.qualifyingDrawCount?'（'+s.qualifyingDrawCount+'球目）':''):reaches.length?'JPCリーチ　'+reaches.map(r=>r.number).join('・'):s.phase==='complete'?'合計 '+s.sum+' → '+s.cashWin+' WIN':'';
}
function wake(){if(!worker&&!frame)frame=requestAnimationFrame(tick);}
function tick(now){frame=0;const blocked=paused();if(!blocked){const dt=lastStamp===null?0:Math.min(100,Math.max(0,now-lastStamp));intro=Math.min(INTRO_END,intro+dt);fillAge=Math.min(900,fillAge+dt);announceAge+=dt;celebrateAge+=dt;if(challenge){const p=clamp(fillAge/700);fillSum=fromSum+(challenge.sum-fromSum)*(1-(1-p)**3);}}lastStamp=blocked?null:now;render();if(!blocked&&(challenge&&intro<INTRO_END||fillAge<900||announceAge<3700||celebrateAge<4400))wake();}
function bind(){
 if(worker||query.get('edition')==='download'||query.get('edition')==='local')return;
 const c=window.SweetsSharedMachine?.client;if(!c){setTimeout(bind,80);return;}client=c;
 c.on(message=>{if(message?.sugarV254)restore(message.sugarV254);else if(message?.payoutControlV3?.sugarV254)restore(message.payoutControlV3.sugarV254);});
 c.getState?.().then(msg=>{const data=msg?.sugarV254||msg?.payoutControlV3?.sugarV254;if(data)restore(data);}).catch(()=>{});
}
window.SweetsSugarChallengeV254={version:254,presentationRevision:270,accept:restore,payload,stampBank,setExpanded,snapshot:()=>server?clone(server):null,describe:()=>({version:254,presentationRevision:270,expanded,challenge:challenge?clone(challenge):null,bankCount:app.wonderBank?.length||0,revision:server?.revision??null,intro,multiplierTier:challenge?{multiplier:challenge.multiplier,name:MULTIPLIER_TIERS[challenge.multiplier],label:multiplierLabel(challenge.multiplier)}:null,reelSequence:REEL_SEQUENCE.slice(),reelTarget:reelTrack?Number(reelTrack.dataset.target):null,reelPosition:reelTrack?Number(reelTrack.dataset.position):null,paused:paused(),announceAge,celebrateAge,artLoaded:overlay?[...overlay.querySelectorAll('img'),celebration.querySelector('img')].every(i=>i.complete&&i.naturalWidth>0):false})};
const nativeWonder=updateWonderHud;updateWonderHud=function(...args){stampBank();return nativeWonder.apply(this,args);};
mount();stampBank();if(!worker){bind();document.addEventListener('visibilitychange',()=>{lastStamp=null;render();wake();});media.addEventListener?.('change',()=>{render();wake();});const nativePause=syncPause;syncPause=function(...args){const result=nativePause.apply(this,args);lastStamp=null;render();wake();return result;};}
})();

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
let overlay,dock,announcement,celebration,main,bottle,scale,amount,scaleAmount,multiplier,dockAmount,sumNode,history,targets,table,reachText,phaseText,cardName,fill;
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
  intro=challenge.draws.length?5400:clamp(Date.now()+(Number(client?.clockOffset)||0)-opened,0,5400);fillSum=fromSum=0;fillAge=900;expanded=true;paintKey='';
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
 overlay.innerHTML='<div class="sc254-sparkles" aria-hidden="true"></div><header class="sc254-head"><div><small>SWEETS KINGDOM</small><h2>シュガーチャレンジ</h2></div><div class="sc254-jp"><span>JACKPOT</span><b data-sc-amount></b></div></header><div class="sc254-content"><div class="sc254-magic"><div class="sc254-scale"><img src="assets/sugar-art-v254/scale.webp" alt="シュガーを量る魔法の秤"><div class="sc254-five" aria-hidden="true">'+Array.from({length:5},(_,i)=>'<i class="sugar-gem" data-i="'+i+'"></i>').join('')+'</div><div class="sc254-sugar-stream" aria-hidden="true"></div><b data-sc-scale-amount></b></div><div class="sc254-bottle"><div class="sc254-fill-shell"><div class="sc254-fill"></div></div><img src="assets/sugar-art-v254/bottle.webp" alt="数字の量だけシュガーが入る魔法の瓶"><div class="sc254-sugar-stream" aria-hidden="true"></div><div class="sc254-sum"><small>シュガー投入量</small><b data-sc-sum></b><span data-sc-ball-count></span></div><b class="sc254-last-hit"></b></div><div class="sc254-digital"><span>JP MULTIPLIER</span><b data-sc-multiplier>×1</b></div><p class="sc254-phase"></p><div class="sc254-history" aria-label="このゲームの8球"></div></div><div class="sc254-card"><div class="sc254-card-name"></div><div class="sc254-targets"></div><p class="sc254-reach" aria-live="polite"></p><div class="sc268-gauge-caption"><b>合計ゲージ</b><span data-sc-gauge-current>現在 0</span></div><table class="sc254-payouts" aria-label="合計ゲージとJP配当"><thead><tr><th><div class="sc268-gauge-axis"><span>36</span><span>104</span><span>172</span></div></th><th>配当</th></tr></thead><tbody></tbody></table><p class="sc254-rule">通常配当は8球の合計で決定。<span>途中でもラッキーナンバーに一致でJPC確定！</span></p></div></div><footer>タップしてルーレット右下へしまう</footer>';
 game.append(overlay);main=overlay.querySelector('.sc254-content');bottle=overlay.querySelector('.sc254-bottle');scale=overlay.querySelector('.sc254-scale');amount=overlay.querySelector('[data-sc-amount]');scaleAmount=overlay.querySelector('[data-sc-scale-amount]');multiplier=overlay.querySelector('[data-sc-multiplier]');sumNode=overlay.querySelector('[data-sc-sum]');history=overlay.querySelector('.sc254-history');targets=overlay.querySelector('.sc254-targets');table=overlay.querySelector('tbody');reachText=overlay.querySelector('.sc254-reach');phaseText=overlay.querySelector('.sc254-phase');cardName=overlay.querySelector('.sc254-card-name');fill=overlay.querySelector('.sc254-fill');
 scale.querySelectorAll('.sugar-gem').forEach((el,i)=>{if(typeof applySugarTier==='function')applySugarTier(el,i);});
 dock=document.createElement('button');dock.type='button';dock.className='sc254-dock';dock.hidden=true;dock.setAttribute('aria-label','シュガーチャレンジを大きく表示');dock.innerHTML='<img src="assets/sugar-art-v254/bottle.webp" alt=""><span><small>シュガーチャレンジ</small><b class="sc254-dock-sum"></b><em></em></span>';roulette.append(dock);dockAmount=dock.querySelector('b');
 announcement=document.createElement('div');announcement.className='sc254-announcement';announcement.hidden=true;announcement.setAttribute('role','status');announcement.innerHTML='<div class="sc254-announcement-rays"></div><div class="sc254-announcement-badge"><small>5 SUGAR GET!</small><strong>シュガーチャレンジ</strong><span>次のBETタイムでJP・倍率を決定！</span></div>';screen.append(announcement);
 celebration=document.createElement('div');celebration.className='sc254-celebration';celebration.hidden=true;celebration.setAttribute('role','status');celebration.innerHTML='<div class="sc254-celebration-rays"></div><img src="assets/sugar-art-v254/jpc-title.webp" alt="JACKPOT CHANCE獲得"><div><span>JACKPOT</span><b></b><small>JPC挑戦権を獲得！</small></div>';screen.append(celebration);
 overlay.addEventListener('click',()=>setExpanded(false));overlay.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '||event.key==='Escape'){event.preventDefault();setExpanded(false);}});dock.addEventListener('click',event=>{event.stopPropagation();setExpanded(true);overlay.focus({preventScroll:true});});
 const resize=()=>{if(!overlay)return;overlay.style.setProperty('--sc254-unit',Math.max(1,Math.min(game.clientWidth/700,game.clientHeight/440)).toFixed(4));paintKey='';render();wake();};
 new ResizeObserver(resize).observe(game);addEventListener('resize',resize);
}
// Every award uses the same numeric axis. Disjoint bands remain separate,
// so the gauge never suggests that an excluded lucky total pays cash.
function gaugeMarkup(ranges,{lucky=[]}={}){
 const min=R.MIN_SUM,max=R.MAX_SUM,span=max-min+1;
 const text=ranges.map(r=>r.min===r.max?String(r.min):r.min+'から'+r.max).join('、');
 const bands=ranges.map(r=>'<i class="sc268-gauge-band" data-min="'+r.min+'" data-max="'+r.max+'" style="left:'+((r.min-min)/span*100).toFixed(5)+'%;width:'+((r.max-r.min+1)/span*100).toFixed(5)+'%"></i>').join('');
 const pins=lucky.map(n=>'<i class="sc268-lucky-pin" data-total="'+n+'" style="left:'+((n-min+.5)/span*100).toFixed(5)+'%"></i>').join('');
 return '<div class="sc268-gauge" role="img" aria-label="合計 '+text+(lucky.length?'、ラッキーナンバー '+lucky.join('・'):'')+'" title="合計 '+text+'">'+bands+pins+'<i class="sc268-gauge-marker" aria-hidden="true"></i></div>';
}
function render(){
 if(!overlay)return;
 const blocked=paused(),reduced=media.matches;overlay.dataset.paused=String(blocked);overlay.dataset.reduced=String(reduced);dock.dataset.paused=String(blocked);announcement.dataset.paused=String(blocked);celebration.dataset.paused=String(blocked);
 announcement.hidden=announceAge>=3700||!!challenge&&intro<5400;announcement.style.setProperty('--sc254-announce-time',Math.max(0,announceAge)+'ms');
 celebration.hidden=celebrateAge>=4400||!challenge?.jpcQualified;celebration.style.setProperty('--sc254-celebrate-time',Math.max(0,celebrateAge)+'ms');
 if(!challenge){overlay.hidden=true;dock.hidden=true;return;}
 const s=challenge,card=R.cards.find(c=>c.id===s.cardId),introDone=reduced||intro>=5400||s.draws.length>0||app.phase==='playing';
 overlay.style.setProperty('--sc268-progress',(clamp((s.sum-R.MIN_SUM+.5)/(R.MAX_SUM-R.MIN_SUM+1))*100).toFixed(5)+'%');
 overlay.dataset.beforeRange=String(s.sum<R.MIN_SUM);overlay.querySelector('[data-sc-gauge-current]').textContent='現在 '+s.sum;
 overlay.hidden=!expanded;dock.hidden=expanded;dock.setAttribute('aria-expanded',String(expanded));overlay.dataset.card=s.cardId;overlay.dataset.phase=s.phase;overlay.dataset.jpc=String(s.jpcQualified);dock.dataset.jpc=String(s.jpcQualified);
 main.dataset.intro=String(!introDone);scale.hidden=introDone;bottle.hidden=!introDone;overlay.querySelector('.sc254-digital').hidden=false;
 let shownJP=s.jpAmount;
 if(!introDone){const position=clamp(intro/650,0,5),whole=Math.min(5,Math.floor(position)),part=position-whole;shownJP=s.sugarValues.slice(0,whole).reduce((n,x)=>n+x,0)+(s.sugarValues[whole]||0)*part;if(intro>=3250)shownJP=s.jpBase;num(scaleAmount,shownJP,27,160);if(intro>=4600)shownJP=s.jpBase+(s.jpAmount-s.jpBase)*clamp((intro-4600)/650);const ms=[1,2,3,5,10];multiplier.textContent='×'+(intro<3350?'?':intro<4600?ms[Math.floor(intro/80)%5]:s.multiplier);scale.dataset.pouring=String(intro<3250);scale.querySelectorAll('.sugar-gem').forEach((el,i)=>{el.dataset.poured=String(position>=i+1);el.dataset.active=String(Math.floor(position)===i);});}
 else multiplier.textContent='×'+s.multiplier;
 num(amount,shownJP,26,112);num(sumNode,reduced?s.sum:fillSum,48,160);num(dockAmount,s.sum,23,110);num(celebration.querySelector('b'),s.jpAmount,48,260);
 fill.style.height=(clamp((reduced?s.sum:fillSum)/172)*100).toFixed(3)+'%';bottle.dataset.pouring=String(fillAge<800&&s.draws.length>0&&!reduced);bottle.querySelector('[data-sc-ball-count]').textContent=s.draws.length+' / 8球';bottle.querySelector('.sc254-last-hit').textContent=s.draws.length?'＋'+s.draws.at(-1):'';
 dock.querySelector('em').textContent=s.jpcQualified?'JPC獲得！':s.phase==='complete'?String(s.cashWin)+' WIN':s.draws.length+' / 8球 · JP '+String(s.jpAmount);dock.setAttribute('aria-label','シュガーチャレンジ 合計'+s.sum+'、'+s.draws.length+'球。タップして大きく表示');
 phaseText.textContent=!introDone?intro<3250?'BET TIME · 5個のシュガーを秤へ…':intro<4600?'BET TIME · JP倍率決定！':'JACKPOT ×'+s.multiplier+' に決定！':s.jpcQualified?'JACKPOT CHANCE 確定！':s.phase==='complete'?String(s.cashWin)+' WIN GET!':s.draws.length?'HITした数字の量だけシュガーを投入！':'BET TIME · JP・倍率決定済み';
 const key=s.id+'/'+s.draws.join(',')+'/'+s.jpAmount+'/'+s.cardId+'/'+s.jpcQualified;if(key===paintKey)return;paintKey=key;
 cardName.textContent=(card.rarity==='rare'?'★ RARE CARD ★　':'')+card.name;
 targets.replaceChildren();const low=document.createElement('div'),lucky=document.createElement('div');low.className='sc254-extremes';low.innerHTML='<small>8球後 JPC</small><b>LOW '+card.lowMax+'</b><b>HIGH '+card.highMin+'</b>'+gaugeMarkup([{min:R.MIN_SUM,max:card.lowMax},{min:card.highMin,max:R.MAX_SUM}],{lucky:card.luckySums});lucky.className='sc254-lucky';lucky.innerHTML='<small>途中の一致でもJPC確定</small>'+card.luckySums.map(n=>'<b data-acquired="'+String(s.jpcQualified&&s.qualifyingSum===n)+'">'+n+'</b>').join('');targets.append(low,lucky);
 table.innerHTML=R.payoutRows(s.cardId).map(row=>'<tr data-current="'+String(s.phase==='complete'&&!s.jpcQualified&&s.award?.payoutHundredths===row.hundredths)+'" data-hundredths="'+row.hundredths+'"><td>'+gaugeMarkup(row.ranges)+'</td><td><span>JP ×'+row.fraction+'</span><b data-sc-win="'+R.cashFor(s.jpAmount,row.hundredths)+'"></b></td></tr>').join('');
 table.querySelectorAll('[data-sc-win]').forEach(node=>num(node,Number(node.dataset.scWin),18,112));
 history.innerHTML=Array.from({length:8},(_,i)=>'<span data-hit="'+String(i<s.draws.length)+'">'+(s.draws[i]??'·')+'</span>').join('');
 const reaches=R.reaches(s);reachText.textContent=s.jpcQualified?'合計 '+(s.qualifyingSum??s.sum)+' でJPC確定！'+(s.qualifyingDrawCount?'（'+s.qualifyingDrawCount+'球目）':''):reaches.length?'JPCリーチ　'+reaches.map(r=>r.number).join('・'):s.phase==='complete'?'合計 '+s.sum+' → JP ×'+s.award.payoutFraction:'';
 overlay.setAttribute('aria-label','シュガーチャレンジ 合計'+s.sum+'、JP '+s.jpAmount+'。タップで小さく表示');
}
function wake(){if(!worker&&!frame)frame=requestAnimationFrame(tick);}
function tick(now){frame=0;const blocked=paused();if(!blocked){const dt=lastStamp===null?0:Math.min(100,Math.max(0,now-lastStamp));intro=Math.min(5400,intro+dt);fillAge=Math.min(900,fillAge+dt);announceAge+=dt;celebrateAge+=dt;if(challenge){const p=clamp(fillAge/700);fillSum=fromSum+(challenge.sum-fromSum)*(1-(1-p)**3);}}lastStamp=blocked?null:now;render();if(!blocked&&(challenge&&intro<5400||fillAge<900||announceAge<3700||celebrateAge<4400))wake();}
function bind(){
 if(worker||query.get('edition')==='download'||query.get('edition')==='local')return;
 const c=window.SweetsSharedMachine?.client;if(!c){setTimeout(bind,80);return;}client=c;
 c.on(message=>{if(message?.sugarV254)restore(message.sugarV254);else if(message?.payoutControlV3?.sugarV254)restore(message.payoutControlV3.sugarV254);});
 c.getState?.().then(msg=>{const data=msg?.sugarV254||msg?.payoutControlV3?.sugarV254;if(data)restore(data);}).catch(()=>{});
}
window.SweetsSugarChallengeV254={version:254,presentationRevision:268,accept:restore,payload,stampBank,setExpanded,snapshot:()=>server?clone(server):null,describe:()=>({version:254,presentationRevision:268,expanded,challenge:challenge?clone(challenge):null,bankCount:app.wonderBank?.length||0,revision:server?.revision??null,intro,paused:paused(),announceAge,celebrateAge,artLoaded:overlay?[...overlay.querySelectorAll('img'),celebration.querySelector('img')].every(i=>i.complete&&i.naturalWidth>0):false})};
const nativeWonder=updateWonderHud;updateWonderHud=function(...args){stampBank();return nativeWonder.apply(this,args);};
mount();stampBank();if(!worker){bind();document.addEventListener('visibilitychange',()=>{lastStamp=null;render();wake();});media.addEventListener?.('change',()=>{render();wake();});const nativePause=syncPause;syncPause=function(...args){const result=nativePause.apply(this,args);lastStamp=null;render();wake();return result;};}
})();

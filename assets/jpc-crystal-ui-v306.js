/* Crystal JPC presentation. Native draw/settlement owns every counter and award. */
(()=>{
 'use strict';
 const VERSION=306,root=document.getElementById('jpc-dashboard');
 if(!root||window.SweetsCrystalJpcUIV306)return;
 const rules=window.SweetsCrystalJpcV306;
 if(!rules?.config)throw Error('Crystal JPC rules must load before its presentation');
 const config=rules.config,colors=config.colors,bonuses=config.bonuses;
 const levelNames=['未入賞','青','青緑','緑','黄緑','黄','橙','赤','紫'];
 const fmt=new Intl.NumberFormat('ja-JP'),format=n=>fmt.format(Math.max(0,Number(n)||0));
 const bonusByPocket=new Map(config.bonusPockets.map((p,i)=>[p,bonuses[i]]));
 const el=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;};
 const panel=el('div','cj306-panel');panel.id='cj306-panel';panel.hidden=true;panel.tabIndex=-1;
 panel.innerHTML='<header class="cj306-header"><div><span class="cj306-kicker">CRYSTAL JACKPOT CHANCE</span><h2 id="cj306-title">クリスタルJPC</h2></div><button type="button" class="cj306-change" aria-label="JPCの種類を選び直す">JPC変更</button></header>'+
  '<div class="cj306-summary"><div class="cj306-bank"><small>残り球</small><b id="cj306-remaining">30</b><em>球</em></div><div><small>抽選中</small><b id="cj306-active">0</b><em>球</em></div><div><small>JP穴</small><b id="cj306-jp-hits">0</b><em>HIT</em></div><div><small>追加球 合計</small><b id="cj306-bonus-total">+0</b><em>球</em></div></div>'+
  '<div class="cj306-gate"><strong id="cj306-gate-label">5 HITでJP</strong><div id="cj306-jp-progress" class="cj306-jp-progress" role="progressbar" aria-label="JP成立までの入賞回数" aria-valuemin="0" aria-valuemax="5" aria-valuenow="0"></div><b id="cj306-jp-level">あと5 HIT</b></div>'+
  '<div class="cj306-award"><div class="cj306-base"><small>基礎配当</small><b id="cj306-base">0</b></div><span class="cj306-equation"><b id="cj306-multiplier">×1</b><i>＝</i></span><div class="cj306-total"><small id="cj306-total-label">現在の配当</small><div><strong id="cj306-payout">0</strong><em>WIN</em></div></div></div>'+
  '<div class="cj306-grid" id="cj306-grid" role="list" aria-label="25ポケットの累計配当とHIT数"></div>'+
  '<div class="cj306-legend-wrap"><div class="cj306-legend-heading">同じ穴の累計HIT → 配当</div><div class="cj306-legend" role="list" aria-label="通常ポケットの累計配当表"></div><small class="cj306-cumulative-note">各穴の現在値を合算</small></div>'+
  '<p class="cj306-message" id="cj306-message" role="status" aria-live="polite">JP穴5 HITで、基礎配当の5倍</p>'+
  '<footer class="cj306-footer"><div class="cj306-history"><span>入賞</span><div id="cj306-history" aria-label="最近の入賞番号"></div></div><span id="cj306-draw-total">0 球入賞</span></footer>'+
  '<div class="cj306-notice" hidden aria-hidden="true"><div><strong></strong><span></span></div></div>';
 root.append(panel);
 const ui=Object.fromEntries([...panel.querySelectorAll('[id]')].map(n=>[n.id.replace('cj306-',''),n]));
 const cells=[];
 for(let index=0;index<25;index++){
  const pocket=index+1,kind=pocket===config.jpPocket?'jp':bonusByPocket.has(pocket)?'bonus':'ordinary';
  const cell=el('div','cj306-pocket');cell.dataset.pocket=String(pocket);cell.dataset.kind=kind;cell.dataset.level='0';cell.setAttribute('role','listitem');
  const no=el('span','cj306-pocket-no',String(pocket).padStart(2,'0')),value=el('b','cj306-pocket-value',kind==='jp'?'JP':kind==='bonus'?'+'+bonusByPocket.get(pocket):'0'),hit=el('small','cj306-pocket-hits','0 HIT');
  const label=el('span','cj306-pocket-kind',kind==='jp'?'JACKPOT':kind==='bonus'?'BALLS':'');
  cell.append(no,label,value,hit);ui.grid.append(cell);cells.push({cell,value,hit,no});
 }
 for(let i=0;i<5;i++){const gem=el('i');gem.setAttribute('aria-hidden','true');ui['jp-progress'].append(gem);}
 const legend=panel.querySelector('.cj306-legend');
 for(let count=1;count<=8;count++){
  const item=el('span','cj306-legend-item');item.dataset.level=String(count);item.style.setProperty('--cj306-tone',colors[count]||colors.at(-1));item.setAttribute('role','listitem');
  item.setAttribute('aria-label',levelNames[count]+' '+(count===8?'8回以上':count+'回')+'で'+config.payouts[count]+' WIN');
  item.append(el('i'),el('small','',count===8?'8+':String(count)),el('b','',String(config.payouts[count])));legend.append(item);
 }
 const overlay=el('div','cj306-chooser-layer');overlay.id='cj306-chooser';overlay.hidden=true;
 overlay.innerHTML='<section class="cj306-chooser" role="dialog" aria-modal="true" aria-labelledby="cj306-chooser-title" aria-describedby="cj306-chooser-intro"><header><div><small>JACKPOT CHANCE</small><h2 id="cj306-chooser-title">JPCを選択</h2></div><button type="button" class="cj306-chooser-close" aria-label="JPC選択を閉じる">×</button></header><p id="cj306-chooser-intro">遊び方を選ぶと抽選が始まります</p><div class="cj306-choices"><button type="button" class="cj306-choice cj306-choice-classic" data-variant="classic"><span class="cj306-choice-art" aria-hidden="true"></span><span class="cj306-choice-kicker">CLASSIC</span><strong>従来JPC</strong><span class="cj306-choice-lead">70球で、全25ポケットを目指す</span><span class="cj306-choice-rule">全ポケット入賞でJACKPOT<br>500ベースの累積HIT配当</span><span class="cj306-choice-cta">従来JPCを開始 <i aria-hidden="true">›</i></span></button><button type="button" class="cj306-choice cj306-choice-crystal" data-variant="crystal"><span class="cj306-choice-art" aria-hidden="true"></span><span class="cj306-choice-kicker">NEW · CRYSTAL</span><strong>クリスタルJPC</strong><span class="cj306-choice-lead">30球から、追加球でチャンスが続く</span><span class="cj306-choice-rule">JP穴5 HITで基礎配当×5<br>6 HITで×10、7 HITで×15…</span><span class="cj306-choice-cta">クリスタルJPCを開始 <i aria-hidden="true">›</i></span></button></div><details class="cj306-rules"><summary>クリスタルJPCの配当・追加球</summary><div><p class="cj306-rules-bonuses"></p><p>通常20穴は、それぞれの累計HIT数で配当が育ちます。1〜8 HIT以上の配当は <strong>1・2・3・4・6・8・10・15</strong>。各穴の最後の値を合算します。たとえば、同じ穴の7 HITは合計10 WINです。</p><p>JP穴が4 HIT以下なら基礎配当、5 HITなら基礎配当の5倍。以後、JP穴への入賞ごとに10倍・15倍…と増えます。球がなくなり、抽選中の球もすべて入賞すると終了です。</p><p class="cj306-reference"></p></div></details><p class="cj306-choice-error" role="status" aria-live="polite"></p></section>';
 document.body.append(overlay);
 overlay.querySelector('.cj306-rules-bonuses').textContent='初期 '+config.initialBalls+' 球。1番がJP穴、'+config.bonusPockets.map((p,i)=>p+'番が+'+bonuses[i]+'球').join('、')+'。追加球は入賞するたびに加わります。';
 overlay.querySelector('.cj306-reference').textContent='参考JP '+format(config.referenceJP)+' ／ 平均配当の目安 約'+format(Math.round(config.targetEV))+' WIN（各抽選が独立・25穴等確率の場合）';
 let callbacks={},installed=false,previous=null,lastSignature='',lastRoundId=null,noticeTimer=null,noticeRemaining=0,noticeStamp=0,screenInert=null,focusBefore=null,shown=false;
 const prefersReduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const isCrystal=()=>typeof jpcSession!=='undefined'&&jpcSession.active&&jpcSession.variant==='crystal';
 const canChoose=()=>typeof callbacks.canChoose==='function'&&callbacks.canChoose();
 function setText(node,value){const text=String(value);if(node.textContent!==text)node.textContent=text;}
 function setAmount(node,value,maxSize,minSize,budget){const text=format(value);setText(node,text);node.dataset.amount=String(value);node.style.setProperty('--cj306-value-size',Math.max(minSize,Math.min(maxSize,budget/Math.max(1,text.length)))+'px');}
 function resetNotice(){if(noticeTimer!==null)clearTimeout(noticeTimer);noticeTimer=null;noticeRemaining=0;panel.querySelector('.cj306-notice').hidden=true;}
 function tickNotice(){
  noticeTimer=null;const now=performance.now(),paused=document.hidden||document.body.classList.contains('paused')||(typeof userPaused!=='undefined'&&userPaused)||(typeof menuOpen!=='undefined'&&menuOpen)||(typeof inView!=='undefined'&&!inView);
  if(!paused)noticeRemaining-=Math.max(0,Math.min(250,now-noticeStamp));noticeStamp=now;
  if(noticeRemaining<=0||!isCrystal()){resetNotice();return;}
  noticeTimer=setTimeout(tickNotice,100);
 }
 function flash(title,subtitle,kind){
  const node=panel.querySelector('.cj306-notice');if(kind==='bonus'&&!node.hidden&&node.dataset.kind==='jackpot'&&noticeRemaining>0)return;node.dataset.kind=kind;setText(node.querySelector('strong'),title);setText(node.querySelector('span'),subtitle);node.hidden=false;noticeRemaining=kind==='bonus'?1300:2600;noticeStamp=performance.now();if(noticeTimer!==null)clearTimeout(noticeTimer);noticeTimer=setTimeout(tickNotice,100);
  if(!prefersReduced())node.animate?.([{opacity:0,transform:'translateY(8px) scale(.92)'},{opacity:1,transform:'none'}],{duration:280,easing:'cubic-bezier(.2,.8,.2,1)'});
 }
 function sync(){
  const active=isCrystal();panel.hidden=!active;
  if(active){root.dataset.variant='crystal';root.setAttribute('aria-labelledby','cj306-title');}
  else{delete root.dataset.variant;root.setAttribute('aria-labelledby','jpc-heading');previous=null;lastSignature='';lastRoundId=null;resetNotice();}
  panel.querySelector('.cj306-change').disabled=!canChoose();
  if(shown){for(const button of overlay.querySelectorAll('[data-variant]'))button.disabled=!canChoose();}
 }
 function render(state,meta={}){
  if(!state||!Array.isArray(state.counts)||state.counts.length!==25||state.counts.some(n=>!Number.isSafeInteger(n)||n<0)||![state.remaining,state.launched,state.landed,state.jpHits,state.base,state.payout,state.multiplier,state.bonusTotal].every(n=>Number.isFinite(n)&&n>=0))return false;
  sync();if(!isCrystal())return false;
  const paused=!!meta.paused||document.hidden;
  panel.dataset.paused=String(paused);panel.dataset.state=meta.drawState||'running';panel.dataset.jp=String(state.jpHits>=5);
  const activeBalls=Math.max(0,Math.floor(Number(meta.activeBalls)||0)),complete=meta.drawState==='complete';
  if(meta.roundId!==undefined&&meta.roundId!==lastRoundId){previous=null;lastSignature='';resetNotice();lastRoundId=meta.roundId;}
  const signature=[meta.drawState,!!meta.awarded,activeBalls,state.remaining,state.launched,state.landed,state.jpHits,state.base,state.payout,state.multiplier,state.bonusTotal,...state.counts].join('|');
  if(signature===lastSignature)return true;lastSignature=signature;
  if(previous&&(state.launched<previous.launched||state.landed<previous.landed)){previous=null;resetNotice();}
  setAmount(ui.remaining,state.remaining,35,17,100);setAmount(ui.active,activeBalls,24,14,88);setAmount(ui['jp-hits'],state.jpHits,24,14,88);setText(ui['bonus-total'],'+'+format(state.bonusTotal));
  setAmount(ui.base,state.base,24,13,120);const compact=document.body.classList.contains('mobile-landscape');setAmount(ui.payout,state.payout,compact?20:36,compact?9:15,compact?80:172);setText(ui.multiplier,'×'+format(state.multiplier));setText(ui['total-label'],complete?'確定配当':'現在の配当');
  const jpLevel=Math.max(0,state.jpHits-4),left=Math.max(0,5-state.jpHits);
  setText(ui['gate-label'],jpLevel?'JACKPOT!':'5 HITでJP');setText(ui['jp-level'],jpLevel?'JP ×'+format(jpLevel):'あと'+left+' HIT');
  ui['jp-progress'].setAttribute('aria-valuenow',String(Math.min(5,state.jpHits)));ui['jp-progress'].setAttribute('aria-valuetext',state.jpHits+' HIT'+(jpLevel?'、JP '+jpLevel+'倍獲得中':'、あと'+left+' HITでJP'));
  [...ui['jp-progress'].children].forEach((gem,index)=>gem.classList.toggle('lit',index<state.jpHits));
  cells.forEach(({cell,value,hit},index)=>{
   const count=state.counts[index],pocket=index+1,level=Math.min(8,count),bonus=bonusByPocket.get(pocket),jp=pocket===config.jpPocket;
   cell.dataset.level=String(level);cell.classList.toggle('cj306-reach',jp&&count===4&&!complete);cell.classList.toggle('cj306-won',jp&&count>=5);
   if(!jp&&!bonus){cell.style.setProperty('--cj306-tone',colors[level]||colors.at(-1));setText(value,config.payouts[level]);}
   setText(hit,format(count)+' HIT');cell.setAttribute('aria-label',pocket+'番 '+(jp?'JP穴、'+count+' HIT'+(count>=5?'、JP '+(count-4)+'倍':'、あと'+(5-count)+' HITでJP'):bonus?'追加球穴、入賞ごとに'+bonus+'球、'+count+' HIT':levelNames[level]+'、'+count+' HIT、累計'+config.payouts[level]+' WIN'));
   if(previous&&count>previous.counts[index]&&!paused&&!prefersReduced())cell.animate?.([{transform:'scale(.88)',filter:'brightness(1.6)'},{transform:'scale(1.07)',filter:'brightness(1.2)',offset:.45},{transform:'none',filter:'none'}],{duration:520,easing:'ease-out'});
  });
  const message=complete?(jpLevel?'JP成立！ '+format(state.payout)+' WIN':'抽選終了 · 基礎配当 '+format(state.base)+' WIN'):state.remaining===0&&activeBalls>0?'残りの'+format(activeBalls)+'球を抽選中 · 追加球HITで続行':jpLevel?'JP ×'+format(jpLevel)+' 獲得中 · 配当は最後の球で確定':state.jpHits===4?'JPリーチ！ あと1 HITで基礎配当×5':'JP穴まであと'+left+' HIT · 通常穴の色を育てよう';
  setText(ui.message,message);setText(ui['draw-total'],format(state.landed)+' 球入賞');
  const recent=(Array.isArray(meta.history)?meta.history:[]).slice(-8).map(hit=>typeof hit==='number'?hit:Number(hit?.pocket)).filter(p=>Number.isInteger(p)&&p>=1&&p<=25);
  const historySignature=recent.join(',');if(ui.history.dataset.key!==historySignature){ui.history.dataset.key=historySignature;ui.history.replaceChildren(...recent.map(p=>{const node=el('b','',String(p));node.dataset.kind=p===config.jpPocket?'jp':bonusByPocket.has(p)?'bonus':'ordinary';return node;}));}
  if(previous&&!paused){
   if(complete&&!previous.complete&&jpLevel)flash('JACKPOT!',format(state.payout)+' WIN · JP ×'+format(jpLevel),'jackpot');
   else if(!complete&&state.jpHits>previous.jpHits&&state.jpHits>=5)flash(state.jpHits===5?'JACKPOT!':'MULTIPLIER UP!','JP ×'+format(jpLevel)+' · 基礎配当 ×'+format(state.multiplier),'jackpot');
   else if(!complete&&state.bonusTotal>previous.bonusTotal)flash('+'+format(state.bonusTotal-previous.bonusTotal)+' BALLS','チャンス継続 · 残り '+format(state.remaining)+' 球','bonus');
  }
  if(complete&&!jpLevel)resetNotice();
  previous={counts:state.counts.slice(),launched:state.launched,landed:state.landed,jpHits:state.jpHits,bonusTotal:state.bonusTotal,base:state.base,payout:state.payout,multiplier:state.multiplier,remaining:state.remaining,activeBalls,complete,awarded:!!meta.awarded};
  return true;
 }
 function closeChooser({starting=false,variant=null}={}){
  if(!shown)return false;shown=false;overlay.hidden=true;
  const screen=document.getElementById('screen');if(screen&&screenInert!==null)screen.inert=screenInert;screenInert=null;
  callbacks.onChooserClose?.({starting,variant});
  if(!starting&&focusBefore?.isConnected)focusBefore.focus({preventScroll:true});focusBefore=null;
  return true;
 }
 function showChooser(){
  if(shown||!canChoose())return false;
  focusBefore=document.activeElement;callbacks.onChooserOpen?.();
  const screen=document.getElementById('screen');screenInert=screen?.inert??null;if(screen)screen.inert=true;
  shown=true;overlay.hidden=false;overlay.querySelector('.cj306-choice-error').textContent='';sync();
  overlay.querySelector('[data-variant="crystal"]').focus({preventScroll:true});return true;
 }
 overlay.querySelector('.cj306-chooser-close').addEventListener('click',()=>closeChooser());
 overlay.addEventListener('click',event=>{
  if(event.target===overlay){closeChooser();return;}
  const choice=event.target.closest('[data-variant]');if(!choice)return;
  if(!canChoose())return;const variant=choice.dataset.variant;
  closeChooser({starting:true,variant});const started=callbacks.startVariant?.(variant);
  if(started===false){showChooser();overlay.querySelector('.cj306-choice-error').textContent='現在の抽選が終了してから選択できます';}
  else if(variant==='crystal')panel.focus({preventScroll:true});
 });
 overlay.addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();closeChooser();return;}
  if(event.key!=='Tab')return;
  const focusable=[...overlay.querySelectorAll('button:not(:disabled),summary')].filter(n=>n.getClientRects().length);
  const first=focusable[0],last=focusable.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
 });
 panel.querySelector('.cj306-change').addEventListener('click',showChooser);
 function install(next){
  callbacks={...callbacks,...next};
  if(!installed){
   installed=true;const nativeSync=syncDebugButtons;syncDebugButtons=function(...args){const result=nativeSync.apply(this,args);sync();return result;};
   const button=document.getElementById('jpc-mode'),nativeClick=button.onclick;
   button.onclick=function(event){if(typeof jpcSession!=='undefined'&&jpcSession.active)return nativeClick?.call(this,event);return showChooser();};
  }
  sync();return true;
 }
 window.SweetsCrystalJpcUIV306={version:VERSION,render,sync,showChooser,closeChooser,install,describe:()=>({version:VERSION,visible:!panel.hidden,chooserOpen:shown,variant:root.dataset.variant||'classic',notice:panel.querySelector('.cj306-notice').hidden?null:panel.querySelector('.cj306-notice').textContent,shown:previous?{...previous,counts:previous.counts.slice()}:null,config:{initialBalls:config.initialBalls,bonuses:[...bonuses],payouts:[...config.payouts],targetEV:config.targetEV,referenceJP:config.referenceJP}})};
 install({startVariant:startJpcVariantV306,canChoose:canChooseJpcVariantV306,onChooserOpen:openJpcChooserV306,onChooserClose:closeJpcChooserV306});
})();

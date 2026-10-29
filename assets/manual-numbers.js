// Manual draw source shares Arcade.acceptNumber, including queued Canyon hits.
function setupManualNumbers(){
 const root=$('cookie-roulette'),panel=document.createElement('section');panel.id='manual-number-panel';panel.hidden=true;panel.setAttribute('aria-label','番号指定モード');panel.innerHTML='<header><b>番号指定</b><span id="manual-count">0 / 8球</span><button id="manual-start" type="button">開始</button></header><div id="manual-number-grid"></div><p id="manual-history" aria-live="polite">開始後、番号をタップ</p>';
 for(let n=1;n<=25;n++){const b=document.createElement('button');b.type='button';b.textContent=n;b.dataset.number=n;b.setAttribute('aria-label',n+'番を入賞');b.onclick=()=>{if(!manualNumbers||app.phase!=='playing'||app.paused||app.draws.includes(n)||app.draws.length>=8)return;rouletteDrawSource.callbacks?.onNumber(n);syncManualNumbers();};panel.querySelector('#manual-number-grid').append(b);}root.append(panel);
 const toggle=document.createElement('button');toggle.id='manual-number-toggle';toggle.type='button';toggle.title='番号指定／ルーレットを切替。進行中の場合は現在のゲームをリセット';toggle.onclick=()=>{if(jpcSession.active)return;manualNumbers=!manualNumbers;if(app.phase!=='ready')debugResetRound();else{rouletteDrawSource.reset();stopAutoRound();}syncPause();syncManualNumbers();scheduleAutoRound();scheduleUI(app);};root.append(toggle);
 $('manual-start').onclick=()=>{activateGameAudio({gesture:true});startReadyRound();syncManualNumbers();};syncManualNumbers();
}
function syncManualNumbers(){
 const panel=$('manual-number-panel'),toggle=$('manual-number-toggle');if(!panel||!app)return;
 panel.hidden=!manualNumbers;toggle.textContent=manualNumbers?'ルーレットに戻す':'番号指定モード';toggle.setAttribute('aria-pressed',String(manualNumbers));toggle.disabled=jpcSession.active;document.body.classList.toggle('manual-number-mode',manualNumbers);
 $('manual-count').textContent=app.draws.length+' / 8球';$('manual-start').disabled=app.phase!=='ready'||!app.bets.some(n=>n>0)||menuOpen;
 for(const b of $('manual-number-grid').children){const hit=app.draws.includes(Number(b.dataset.number));b.disabled=!manualNumbers||app.phase!=='playing'||app.paused||hit||app.draws.length>=8;b.classList.toggle('selected',hit);b.setAttribute('aria-pressed',String(hit));}
 $('manual-history').textContent=app.draws.length?app.draws.join(' → ')+(app.draws.length===8?' ／ 抽選終了':''):app.phase==='ready'?'開始後、番号をタップ':'1球目の番号を選択';
 $('roulette-speed').disabled=manualNumbers;
}

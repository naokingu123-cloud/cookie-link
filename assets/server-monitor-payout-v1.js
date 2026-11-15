(()=>{'use strict';
const query=new URLSearchParams(location.search),machine=query.get('machine')||'public-01',adminToken=query.get('adminToken')||'';
const $=id=>document.getElementById(id),frame=$('host-frame'),tbody=$('players'),empty=$('empty');
let hostLastReload=0,hostActionBusy=false,lastRoundId='',lastBallCount=-1,lastSnapshot=null,controlsInitialized=false,drawDeferred=false;
const openDetails=new Set();
const GAME_NAMES={cookie:'クッキーリンク',choco:'チョコレートキャニオン',candy:'シックスドロップ',gelato:'ジェラートプリズム',winery:'ジュースピラミッド',jelly:'ジェリービンゴ',popcorn:'ポップコーンスプラッシュ',stick:'ワッフルリバーシ',waffle:'ワッフルリバーシ',castella:'パーティカステラ'};

function hostUrl(){
 const url=new URL('/index.html',location.origin);
 url.searchParams.set('serverHost','1');url.searchParams.set('lightRoulette','1');url.searchParams.set('machine',machine);
 if(adminToken)url.searchParams.set('adminToken',adminToken);
 url.searchParams.set('hostBoot',String(Date.now()));
 return url.href;
}
function injectHostView(){
 try{
  const doc=frame.contentDocument;if(!doc||!doc.documentElement)return false;
  let style=doc.getElementById('server-monitor-host-view');
  if(!style){style=doc.createElement('style');style.id='server-monitor-host-view';style.textContent=
   'html,body{margin:0!important;width:100%!important;height:100%!important;overflow:hidden!important;background:#02070b!important}'+
   '#viewport,#screen,.arena{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;max-width:none!important;max-height:none!important;margin:0!important;transform:none!important}'+
   '#screen>*:not(.arena){display:none!important}.arena>*:not(#cookie-roulette){display:none!important}'+
   '#cookie-roulette{display:block!important;position:absolute!important;inset:0!important;width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;margin:0!important;transform:none!important;background:#02070b!important}'+
   '#manual-number-toggle,#manual-number-panel,#bet-countdown,.roulette-info-strip{display:none!important}';
   doc.head.append(style);
  }
  return true;
 }catch{return false;}
}
async function ensurePhysicalHost(){
 injectHostView();let win;try{win=frame.contentWindow;}catch{return;}
 const shared=win?.SweetsSharedMachine;
 if(!shared||!shared.client){$('host-state').textContent='HOST LOADING…';if(Date.now()-hostLastReload>12000){hostLastReload=Date.now();frame.src=hostUrl();}return;}
 if(hostActionBusy)return;hostActionBusy=true;
 try{
  if(!shared.online){$('host-state').textContent='HOST CONNECTING…';await shared.client.connect({timeout:12000});}
  if(shared.role!=='host'){$('host-state').textContent='HOST REGISTERING…';shared.client.accept(await shared.client.registerHost());}
  const state=await shared.client.getState();shared.client.accept(state);
  const round=state.round,balls=round?.balls?.length||0;
  $('host-state').textContent='HOST ONLINE · '+(round?.phase||'WAITING')+' · '+balls+' / 8';
 }catch(error){$('host-state').textContent='HOST ERROR · '+(error?.message||'retrying');}
 finally{hostActionBusy=false;}
}

const num=value=>Math.max(0,Number(value)||0);
const fmt=value=>Math.floor(num(value)).toLocaleString('ja-JP');
const fmtRate=value=>value==null||!Number.isFinite(Number(value))?'-':Number(value).toFixed(1)+'%';
const gameName=id=>GAME_NAMES[id]||String(id||'GAME').replace(/[-_]/g,' ').toUpperCase();
const actual=(win,bet)=>num(bet)>0?num(win)/num(bet)*100:null;
function phaseLabel(round,serverTime){
 if(!round||!round.phase)return 'WAITING';
 if(round.phase==='BETTING'){const ms=Math.max(0,Number(round.betClosesAt||0)-Number(serverTime||Date.now()));return 'BETTING '+(ms/1000).toFixed(1)+'s';}
 if(round.phase==='PLAYING'&&round.drawSource==='server-fallback')return 'PLAYING · SERVER FALLBACK';
 return round.phase;
}
function controlMap(data){return new Map((data?.payoutControl?.players||[]).map(item=>[String(item.playerId),item]));}
function currentPlayers(data){
 const roundPlayers=Array.isArray(data?.round?.players)?data.round.players:[],map=new Map(roundPlayers.map(player=>[String(player.playerId),player]));
 for(const control of data?.payoutControl?.players||[]){const id=String(control.playerId||'');if(id&&!map.has(id))map.set(id,{playerId:id,displayName:id.slice(0,8),connected:false,settled:false,totalBet:0,currentCredit:0,roundWin:0,checkpointBall:0,games:{}});}
 return [...map.values()].sort((a,b)=>Number(!!b.connected)-Number(!!a.connected)||String(a.displayName||a.playerId).localeCompare(String(b.displayName||b.playerId),'ja'));
}
function element(tag,className,text){const node=document.createElement(tag);if(className)node.className=className;if(text!=null)node.textContent=String(text);return node;}
function cell(row,className,text){const td=element('td',className,text);row.append(td);return td;}
function focusedControl(){return document.activeElement?.closest?.('[data-control]');}

function updateOverview(data){
 const payout=data.payoutControl||{},config=payout.config||{},totals=payout.totals||{};
 $('metric-target').textContent=fmtRate(config.targetRate);
 $('metric-actual').textContent=fmtRate(totals.actualRate);
 $('metric-bet').innerHTML=fmt(totals.bet)+'<span class="suffix">BET</span>';
 $('metric-win').innerHTML=fmt(totals.win)+'<span class="suffix">WIN</span>';
 if(!controlsInitialized&&!focusedControl()){
  $('target-rate').value=config.targetRate??90;$('min-rate').value=config.minRate??50;$('max-rate').value=config.maxRate??150;
  $('max-step').value=config.maxStepPerBall??1.5;$('maturity-bet').value=config.maturityBet??5000;controlsInitialized=true;
 }
 const games=totals.games||{},box=$('global-games');box.replaceChildren();
 for(const id of Object.keys(games).sort()){
  const values=games[id],pill=element('div','game-pill');pill.append(element('b','',gameName(id)),element('span','',`BET ${fmt(values.bet)} / WIN ${fmt(values.win)}`),element('span','',`実測 ${fmtRate(values.actualRate)}`));box.append(pill);
 }
}

function buildGameDetail(player,control){
 const card=element('section','detail-card'),title=element('div','detail-title','GAME BET / WIN · 現在ラウンドと実測累計'),table=element('table','mini');
 const head=document.createElement('thead');head.innerHTML='<tr><th>GAME</th><th>ROUND BET</th><th>ROUND WIN</th><th>ROUND PO</th><th>CUM BET</th><th>CUM WIN</th><th>CUM PO</th></tr>';table.append(head);
 const body=document.createElement('tbody'),roundGames=player.games||{},totalGames=control?.totals?.games||{},ids=new Set([...Object.keys(roundGames),...Object.keys(totalGames)]);
 if(!ids.size){const tr=document.createElement('tr');const td=element('td','', 'ゲーム別データ待ち');td.colSpan=7;tr.append(td);body.append(tr);}
 for(const id of [...ids].sort()){
  const current=roundGames[id]||{},total=totalGames[id]||{},tr=document.createElement('tr');
  cell(tr,'',gameName(id));cell(tr,'money',fmt(current.bet));cell(tr,'money win',fmt(current.win));cell(tr,'po',fmtRate(actual(current.win,current.bet)));
  cell(tr,'money',fmt(total.bet));cell(tr,'money win',fmt(total.win));cell(tr,'po',fmtRate(total.actualRate));body.append(tr);
 }
 table.append(body);card.append(title,table);return card;
}
function buildBallDetail(control){
 const card=element('section','detail-card'),title=element('div','detail-title','BALL-BY-BALL · 各球終了時の実績（1～8球）'),grid=element('div','ball-grid');
 const byBall=new Map((control?.ballHistory||[]).map(item=>[Number(item.ball),item]));
 for(let ball=1;ball<=8;ball++){
  const item=byBall.get(ball),box=element('div','ball'+(item?'':' missing'));box.append(element('b','',ball+' BALL'));
  if(item){
   box.append(element('span','',`BET ${fmt(item.roundBet)} / WIN ${fmt(item.roundWin)}`),element('span','ball-po',`ROUND ${fmtRate(item.roundActualRate)}`),element('span','',`CUM ${fmtRate(item.cumulativeActualRate)}`),element('span','',`SET ${fmtRate(item.effectiveRate)}`),element('span','',`CREDIT ${fmt(item.currentCredit)}`));
   for(const [gameId,game] of Object.entries(item.games||{}))box.append(element('span','ball-game',`${gameName(gameId)} ${fmt(game.bet)} / ${fmt(game.win)}`));
  }else box.append(element('span','','未到達'));
  grid.append(box);
 }
 card.append(title,grid);return card;
}
function buildDetailRow(player,control){
 const tr=element('tr','detail-row'),td=document.createElement('td'),detail=element('div','detail');td.colSpan=12;detail.append(buildGameDetail(player,control),buildBallDetail(control));td.append(detail);tr.append(td);return tr;
}

function drawPlayers(data){
 if(focusedControl()){drawDeferred=true;return;}
 drawDeferred=false;
 const controls=controlMap(data),players=currentPlayers(data);tbody.replaceChildren();empty.style.display=players.length?'none':'block';
 for(const player of players){
  const id=String(player.playerId||''),control=controls.get(id)||{},tr=document.createElement('tr'),status=player.settled?'SETTLED':(player.connected?(player.phase||'PLAYING'):'OFFLINE');
  const nameCell=cell(tr,'','');nameCell.append(element('span','online '+(player.connected?'':'offline')),element('span','player-name',player.displayName||id.slice(0,8)),element('span','player-id',id));
  cell(tr,'money',fmt(player.totalBet));cell(tr,'money',fmt(player.currentCredit));cell(tr,'money win',fmt(player.roundWin));
  cell(tr,'money',fmt(control?.totals?.bet));cell(tr,'money win',fmt(control?.totals?.win));cell(tr,'po',fmtRate(control?.totals?.actualRate));
  const effectiveCell=cell(tr,'effective',fmtRate(control.effectiveRate));effectiveCell.append(element('span','mode-note',control.mode==='manual'?'MANUAL':'AUTO'));
  const controlCell=cell(tr,'',''),box=element('div','control-box');box.dataset.control='';
  const mode=document.createElement('select');mode.setAttribute('aria-label','調整モード');mode.innerHTML='<option value="auto">AUTO</option><option value="manual">MANUAL</option>';mode.value=control.mode==='manual'?'manual':'auto';
  const input=document.createElement('input');input.type='number';input.min=String(data?.payoutControl?.config?.minRate??50);input.max=String(data?.payoutControl?.config?.maxRate??150);input.step='0.1';input.value=String(control.manualRate??control.effectiveRate??data?.payoutControl?.config?.targetRate??90);input.disabled=mode.value!=='manual';
  mode.addEventListener('change',()=>{input.disabled=mode.value!=='manual';});
  const save=element('button','','保存');save.type='button';save.addEventListener('click',()=>savePlayer(id,mode.value,input.value,save));box.append(mode,input,save);controlCell.append(box);
  cell(tr,'',fmt(player.checkpointBall)+' / 8');cell(tr,player.settled?'ok':'pending',status);
  const detailCell=cell(tr,'',''),button=element('button','details-btn',openDetails.has(id)?'閉じる':'詳細');button.type='button';button.addEventListener('click',()=>{openDetails.has(id)?openDetails.delete(id):openDetails.add(id);drawPlayers(lastSnapshot);});detailCell.append(button);
  tbody.append(tr);if(openDetails.has(id))tbody.append(buildDetailRow(player,control));
 }
}

function draw(data){
 lastSnapshot=data;$('dot').classList.remove('off');$('conn').textContent='ONLINE';
 const round=data.round,balls=round?.balls?.length||0,phase=phaseLabel(round,data.serverTime);
 $('round-state').textContent='ROUND '+(round?.sequence||'-')+' · '+phase+' · '+balls+' / 8';
 const hostOnline=!!data.machine?.hostConnected;$('host-state').textContent=hostOnline?'HOST ONLINE · '+phase+' · '+balls+' / 8':'HOST OFFLINE · '+phase;
 updateOverview(data);drawPlayers(data);
 if(round?.id!==lastRoundId||balls!==lastBallCount){lastRoundId=round?.id||'';lastBallCount=balls;ensurePhysicalHost();}
}

async function request(path,body){
 const url=new URL(path,location.origin);if(adminToken)url.searchParams.set('adminToken',adminToken);
 const headers={'content-type':'application/json'};if(adminToken)headers['x-admin-token']=adminToken;
 const response=await fetch(url,{method:'POST',headers,body:JSON.stringify(body),cache:'no-store'});
 const payload=await response.json().catch(()=>({}));if(!response.ok)throw Error(payload.error||('HTTP '+response.status));return payload;
}
function message(text,error=false){const node=$('control-message');node.textContent=text;node.classList.toggle('error',error);}
async function saveGlobal(){
 const button=$('save-global');button.disabled=true;message('全体設定を保存中…');
 try{
  await request('/api/admin/machines/'+encodeURIComponent(machine)+'/payout/global',{targetRate:Number($('target-rate').value),minRate:Number($('min-rate').value),maxRate:Number($('max-rate').value),maxStepPerBall:Number($('max-step').value),maturityBet:Number($('maturity-bet').value)});
  controlsInitialized=false;message('全体設定を保存しました。AUTO設定は各球終了時に段階補正されます。');await poll();
 }catch(error){message('保存失敗: '+error.message,true);}finally{button.disabled=false;}
}
async function savePlayer(playerId,mode,manualRate,button){
 button.disabled=true;message(playerId.slice(0,8)+' の設定を保存中…');
 try{await request('/api/admin/machines/'+encodeURIComponent(machine)+'/payout/players/'+encodeURIComponent(playerId),{mode,manualRate:Number(manualRate)});message(playerId.slice(0,8)+' を '+mode.toUpperCase()+' に設定しました。');await poll();}
 catch(error){message('保存失敗: '+error.message,true);}finally{button.disabled=false;}
}
async function poll(){
 try{
  const url='/api/admin/machines/'+encodeURIComponent(machine)+'?adminToken='+encodeURIComponent(adminToken)+'&_='+Date.now(),response=await fetch(url,{cache:'no-store'});
  if(!response.ok)throw Error('HTTP '+response.status);draw(await response.json());
 }catch(error){$('dot').classList.add('off');$('conn').textContent='OFFLINE / '+error.message;}
}

$('save-global').addEventListener('click',saveGlobal);
document.addEventListener('focusout',()=>setTimeout(()=>{if(drawDeferred&&lastSnapshot&&!focusedControl())drawPlayers(lastSnapshot);},0));
frame.addEventListener('load',()=>{hostLastReload=Date.now();injectHostView();setTimeout(ensurePhysicalHost,400);});
frame.src=hostUrl();poll();setInterval(poll,700);setInterval(ensurePhysicalHost,1500);
})();

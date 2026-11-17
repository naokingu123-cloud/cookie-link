/* Preserve the v3 operator/host lifecycle; replace only its display projection. */
(function(root){
'use strict';
const model=root.SweetsMonitorLedgerV241;
if(!model)throw Error('Monitor ledger model unavailable');
const signatures=new WeakMap();
const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!=null)node.textContent=String(text);return node;};
function cell(tr,cls,text,title){const node=el('td',cls,text);if(title)node.title=title;tr.append(node);return node;}
function header(tbody){
 const table=tbody.closest('table'),head=table?.querySelector('thead');if(!head||head.dataset.version==='241')return;
 const tr=el('tr');
 for(let i=0;i<model.COLUMNS.length;i++){
  const th=el('th',i===0?'player-heading':i>=10&&i<35?'number-heading':'',model.COLUMNS[i]);th.scope='col';
  if(i>=10&&i<35)th.dataset.number=String(i-9);
  if(i===6)th.title='H/G = IN − OUT（マイナスも表示）';
  if(i===7)th.title='確定累計OUT ÷ 確定累計IN × 100';
  if(i===8)th.title='補正前の目標P/O。個別設定を優先し、未指定なら全体設定';
  if(i===9)th.title='現在サーバーが返すプレイヤー別の補正済みP/O';
  tr.append(th);
 }
 head.replaceChildren(tr);head.dataset.version='241';
}
function metricCells(tr,row){
 cell(tr,'money',model.fmt(row.bet));cell(tr,'money win',model.fmt(row.win));cell(tr,'money',model.fmt(row.credit));
 cell(tr,'money',model.fmt(row.input));cell(tr,'money win',model.fmt(row.output));
 cell(tr,'money hg '+(row.hg<0?'negative':''),model.fmt(row.hg));
 cell(tr,'money po',model.rate(row.actual));
 cell(tr,'money configured',model.rate(row.setting));cell(tr,'money effective',model.rate(row.corrected));
}
function numberCells(tr,row,data){
 for(let n=1;n<=25;n++){
  const value=model.numberCell(row,data,n),td=cell(tr,'gain-cell','',value.hint);td.dataset.number=String(n);td.dataset.tier=value.color;
  td.append(el('b','gain-value',value.text));if(value.ratio)td.append(el('small','gain-ratio',value.ratio));
  td.setAttribute('aria-label',n+'番 '+value.text+(value.ratio?'、'+value.ratio:''));
 }
}
function render(data,{tbody,empty,openDetails,detail,refresh}){
 if(root.SweetsMonitorCompactV242)return root.SweetsMonitorCompactV242.render(data,{tbody,empty,openDetails,detail,refresh});
 const rows=model.rows(data),total=model.total(rows,data);
 header(tbody);
 const signature=JSON.stringify([rows.map(r=>[r.id,r.player.displayName,r.connected,r.bet,r.win,r.credit,r.input,r.output,r.setting,r.corrected,r.ballCount,r.state,r.forecast?.baseWin,r.forecast?.gains,openDetails.has(r.id)?r.control:null]),data.round?.phase,data.round?.balls,total.setting,total.corrected,[...openDetails]]);
 if(signatures.get(tbody)===signature)return;
 signatures.set(tbody,signature);const fragment=document.createDocumentFragment();
 const summary=el('tr','player-total-v241'),name=cell(summary,'total-name','');
 name.append(el('span','player-name','全プレイヤー合計'),el('small','player-id',rows.length+'名 ／ 接続 '+total.connected+'名'));
 metricCells(summary,total);
 summary.children[8].title='現在のBETを重みにした設定P/Oの加重平均。BETなしは未算出';
 summary.children[9].title='現在のBETを重みにした補正P/Oの加重平均。BETなしは未算出';
 numberCells(summary,total,data);
 cell(summary,'','—');cell(summary,'',total.ballCount+' / 8');cell(summary,'','全体集計');cell(summary,'','');fragment.append(summary);
 for(const row of rows){
  const tr=el('tr','player-ledger-row');tr.dataset.playerId=row.id;
  const name=cell(tr,'','');name.append(el('span','online '+(row.connected?'':'offline')),el('span','player-name',row.player.displayName||row.id.slice(0,8)),el('span','player-id',row.id));
  metricCells(tr,row);numberCells(tr,row,data);
  cell(tr,'',row.control.mode==='manual'?'手動':'自動');cell(tr,'',row.ballCount+' / 8');cell(tr,'player-state '+(row.settled?'ok':''),row.state);
  const td=cell(tr,'',''),button=el('button','details-btn',openDetails.has(row.id)?'閉じる':'詳細');button.type='button';
  button.onclick=()=>{openDetails.has(row.id)?openDetails.delete(row.id):openDetails.add(row.id);refresh();};td.append(button);fragment.append(tr);
  if(openDetails.has(row.id))fragment.append(detail(row.player,row.control,data));
 }
 tbody.replaceChildren(fragment);empty.style.display=rows.length?'none':'block';
}
function patch(source){
 const once=(from,to)=>{if(source.split(from).length!==2)throw Error('[Monitor241] source contract changed: '+from.slice(0,60));source=source.replace(from,to);};
 function replaceFunction(name,next,body){
  const start=source.indexOf('function '+name+'('),end=source.indexOf('\nfunction '+next+'(',start);
  if(start<0||end<start)throw Error('[Monitor241] missing '+name);
  source=source.slice(0,start)+body+source.slice(end);
 }
 replaceFunction('updateOverview','playerControl',`function updateOverview(data){
  const config=payout(data).config||{};
  if(!controlsInitialized&&!focusedControl()){
   $('target-rate').value=config.targetRate??90;$('min-rate').value=config.minRate??50;$('max-rate').value=config.maxRate??150;
   $('max-step').value=config.maxStepPerRound??5;$('recovery-rounds').value=config.recoveryRounds??6;
   $('max-bias').value=config.maxBias??35;$('bet-shock').value=config.betShockRatio??2;controlsInitialized=true;
  }
 }`);
 replaceFunction('drawPlayers','draw',`function drawPlayers(data){
  if(focusedControl()){drawDeferred=true;return;}drawDeferred=false;
  window.SweetsMonitorViewV241.render(data,{tbody,empty,openDetails,detail:buildDetailRow,refresh:()=>drawPlayers(lastSnapshot)});
 }`);
 once('td.colSpan=12;','td.colSpan=39;');
 source=source.replaceAll('現在の設定PO','現在の補正P/O').replaceAll('実測累計PO','実測累計P/O').replaceAll('設定POは全ゲーム共通','補正P/Oは全ゲーム共通');
 once("return round.phase;}\nfunction payout", "return '待機中';}\nfunction payout");
 return source;
}
async function boot(){
 try{
  const response=await fetch('/assets/server-monitor-payout-v3.js?v=241',{cache:'no-store'});
  if(!response.ok)throw Error('monitor source HTTP '+response.status);
  const script=el('script');script.textContent=patch(await response.text())+'\n//# sourceURL=server-monitor-payout-v3-v241.js';document.body.append(script);
 }catch(error){console.error('[Monitor241]',error);const status=document.getElementById('conn');if(status)status.textContent='管理画面の読み込みに失敗しました。再読み込みしてください。';}
}
root.SweetsMonitorViewV241={render,patch,boot};
if(typeof document!=='undefined'&&document.currentScript?.dataset.boot==='1')boot();
})(typeof window!=='undefined'?window:globalThis);

/* A fitted six-station projection. The persistent host iframe is never moved. */
(function(root){
'use strict';
const model=root.SweetsMonitorLedgerV241;if(!model)throw Error('ledger model missing');
const signatures=new WeakMap(),titles=['プレイヤー','BET','WIN','CREDIT','IN','OUT','H/G','実測P/O','設定P/O','補正P/O','1〜25番：増加WINグラフ／倍率','制御','進行度','状態','詳細'];
const widths=[8.5,3.2,3.2,3.2,3.2,3.2,3.2,3.2,3.2,3.2,52,2.4,1.9,5.1,1.3];
const node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=String(text);return e;};
function td(tr,cls,text,title){const e=node('td',cls,text);if(title)e.title=title;tr.append(e);return e;}
function init(tbody){
 const table=tbody.closest('table');if(table.dataset.compact==='242')return;
 table.dataset.compact='242';const head=table.querySelector('thead'),tr=node('tr'),cols=node('colgroup');
 titles.forEach((t,i)=>{tr.append(node('th',i===10?'forecast-heading':'',t));const c=node('col');c.style.width=widths[i]+'%';cols.append(c);});
 head.replaceChildren(tr);table.prepend(cols);
}
function tintRate(element,value){
 const color=model.spectrum(value);
 if(!color)return;
 element.style.color=color;
 element.style.textShadow='0 0 5px '+color;
 element.style.fontWeight='800';
}
function tintSettings(){
 for(const id of ['target-rate','min-rate','max-rate']){
  const input=document.getElementById(id);
  if(input&&input.value!=='')tintRate(input,Number(input.value));
 }
}
for(const id of ['target-rate','min-rate','max-rate']){
 const input=document.getElementById(id);
 input?.addEventListener('input',tintSettings);
 input?.addEventListener('change',tintSettings);
}
function metrics(tr,r){
 for(const key of ['bet','win','credit','input','output','hg'])td(tr,'money '+(key==='win'||key==='output'?'win':key==='hg'&&r.hg<0?'negative':''),model.fmt(r[key]),model.fmt(r[key]));
 for(const key of ['actual','setting','corrected']){
  const el=td(tr,'money po',model.rate(r[key]));
  tintRate(el,r[key]);
 }
}
function forecasts(tr,r,data){
 const cell=td(tr,'forecast-cell-v242',''),grid=node('div','forecast-grid-v242');
 // Bar heights and labels are aggregate medal gains. Their shared color is
 // separately derived from a confirmed individual game's incremental award.
 const values=Array.from({length:25},(_,i)=>model.numberCell(r,data,i+1));
 const maxGain=Math.max(0,...values.map(v=>Number.isFinite(v.gain)?v.gain:0));
 for(let n=1;n<=25;n++){
  const v=values[n-1],tile=node('div','forecast-tile-v242');
  const gain=Number.isFinite(v.gain)&&v.gain>0?v.gain:0;
  tile.dataset.number=String(n);tile.dataset.tier=v.color||'';tile.dataset.partial=v.partial?'1':'0';tile.title=v.hint;
  const bar=node('span','forecast-bar-v245');
  bar.setAttribute('aria-hidden','true');
  bar.style.height=gain&&maxGain?Math.max(4,100*gain/maxGain).toFixed(2)+'%':'0%';
  tile.append(node('i','forecast-number-v242',n),bar,node('b','forecast-value-v242',v.text),node('small','forecast-ratio-v242',v.ratio||' '));
  tile.setAttribute('aria-label',n+'番 '+v.text+' '+(v.ratio||''));grid.append(tile);
 }
 cell.append(grid);
}
function dialog(title,content,onClose){
 document.getElementById('monitor-detail-v242')?.close();
 const d=node('dialog','monitor-detail-v242');d.id='monitor-detail-v242';const head=node('div','dialog-heading-v242'),close=node('button','', '閉じる');close.type='button';close.onclick=()=>d.close();head.append(node('b','',title),close);d.append(head,content);
 d.addEventListener('close',()=>{d.remove();onClose?.();},{once:true});document.body.append(d);d.showModal();
}
function fitNumbers(tbody){
 const candidates=[...tbody.querySelectorAll('.money,.forecast-value-v242,.forecast-ratio-v242')];
 for(const e of candidates)e.style.fontSize='';
 const changes=[];
 for(const e of candidates){const available=e.clientWidth-1;if(available>0&&e.scrollWidth>e.clientWidth){const size=parseFloat(getComputedStyle(e).fontSize);changes.push([e,Math.max(2.5,size*available/e.scrollWidth)]);}}
 for(const [e,size] of changes)e.style.fontSize=size.toFixed(2)+'px';
}
function render(data,{tbody,empty,openDetails,detail,refresh}){
 root.SweetsMonitorSnapshotV242=data;root.SweetsPayoutTrendV242?.update(data.payoutTrendV242);tintSettings();
 init(tbody);const all=model.rows(data),byId=new Map(all.map(r=>[r.id,r]));
 const seats=Array.from({length:6},(_,i)=>data.stations?.seats?.find(s=>s.station===i+1&&!s.empty&&!s.test)||{station:i+1,empty:true});
 const visible=seats.map(s=>s.empty?null:byId.get(String(s.playerId))||null),total=model.total(all,data);
 const signature=JSON.stringify([visible.map(r=>r&&[r.id,r.player.displayName,r.connected,r.bet,r.win,r.credit,r.input,r.output,r.setting,r.corrected,r.ballCount,r.state,r.forecast]),total,data.round?.phase,data.round?.balls]);
 if(signatures.get(tbody)===signature)return;signatures.set(tbody,signature);
 const fragment=document.createDocumentFragment(),sum=node('tr','compact-total-v242'),name=td(sum,'','');
 name.append(node('b','player-name','全プレイヤー合計'),node('small','player-id','在席 '+visible.filter(Boolean).length+'名／台帳 '+all.length+'名'));
 metrics(sum,total);forecasts(sum,total,data);td(sum,'','—');td(sum,'',String(total.ballCount));td(sum,'player-state','全体集計');
 const totalDetails=td(sum,'',''),history=node('button','details-btn','一覧');history.onclick=()=>{
  const list=node('div','history-list-v242');for(const r of all){const line=node('div');line.append(node('b','',r.player.displayName||r.id),node('small','player-id',r.id),node('span','', 'IN '+model.fmt(r.input)+'　OUT '+model.fmt(r.output)+'　H/G '+model.fmt(r.hg)+'　CREDIT '+model.fmt(r.credit)));list.append(line);}dialog('全プレイヤー台帳',list);
 };totalDetails.append(history);fragment.append(sum);
 visible.forEach((r,i)=>{
  const tr=node('tr','compact-player-v242');tr.dataset.station=String(i+1);
  if(!r){td(tr,'empty-station-v242','st.'+(i+1)+'　空席');for(let k=1;k<15;k++)td(tr,'','—');fragment.append(tr);return;}
  tr.dataset.playerId=r.id;const name=td(tr,'','');name.append(node('b','player-name','st.'+(i+1)+' '+(r.player.displayName||r.id.slice(0,8))),node('small','player-id',r.id));
  metrics(tr,r);forecasts(tr,r,data);td(tr,'',r.control.mode==='manual'?'手動':'自動');td(tr,'',String(r.ballCount));td(tr,'player-state',r.state);
  const end=td(tr,'',''),button=node('button','details-btn','詳細');button.type='button';button.onclick=()=>{
   openDetails.add(r.id);const row=detail(r.player,r.control,data),content=node('div','operator-detail-body-v242');while(row.firstElementChild?.firstChild)content.append(row.firstElementChild.firstChild);
   dialog((r.player.displayName||r.id)+' 詳細・個別設定',content,()=>{openDetails.delete(r.id);refresh();});
  };end.append(button);fragment.append(tr);
 });
 tbody.replaceChildren(fragment);empty.style.display='none';requestAnimationFrame(()=>fitNumbers(tbody));
}
root.SweetsMonitorCompactV242={render,titles,widths};
let resizeTimer;addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{const t=document.getElementById('players');if(t)fitNumbers(t);},150);});
})(window);

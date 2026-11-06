(()=>{
'use strict';
const {catalog,chosen,ids,mode}=window.SweetsLineup;
for(const s of slots){
 const key=ids[s.i];s.holder.hidden=!key;
 if(!key)continue;
 s.engine=app.engines[s.i];s.engine.recordGame=catalog[key].record;
 s.holder.dataset.gameKind=s.tab.dataset.gameKind=s.panel.dataset.gameKind=key;
 s.holder.style.setProperty('order',String(chosen.indexOf(key)),'important');
}
$('tabs').style.setProperty('grid-template-columns','repeat('+chosen.length+', minmax(0,1fr))','important');
select(ids.indexOf(chosen[0]));

const pick=document.createElement('dialog');pick.className='lineup-picker';pick.setAttribute('aria-labelledby','lineup-heading');
pick.innerHTML='<div class="lineup-paper"><header><span>SWEETS LINK</span><button type="button" class="lineup-close" aria-label="閉じる">×</button></header>'+
 '<h2 id="lineup-heading">ゲーム自由選択</h2><p>1〜3作を選択。選んだゲームをもう一度押すと外せます。</p>'+
 '<div class="lineup-grid"></div><footer><span class="lineup-count" aria-live="polite"></span><a class="lineup-play" target="_blank" rel="noopener">この組み合わせで遊ぶ ↗</a></footer><small>選んだゲームを別タブで開きます。</small></div>';
document.body.append(pick);
let draft=[];
const grid=pick.querySelector('.lineup-grid'),play=pick.querySelector('.lineup-play'),count=pick.querySelector('.lineup-count');
for(const [key,game] of Object.entries(catalog)){
 const button=document.createElement('button');button.type='button';button.dataset.key=key;button.setAttribute('aria-label',game.name);
 const img=new Image();img.src=game.logo;img.alt='';const title=document.createElement('span');title.textContent=game.name;
 button.append(img,title);grid.append(button);
 button.onclick=()=>{if(draft.includes(key))draft=draft.filter(id=>id!==key);else if(draft.length<3)draft.push(key);showDraft();};
}
function showDraft(){
 for(const b of grid.children){const pos=draft.indexOf(b.dataset.key);b.setAttribute('aria-pressed',String(pos>=0));b.dataset.order=pos>=0?String(pos+1):'';b.disabled=pos<0&&draft.length===3;}
 count.textContent=draft.length+' / 3 ゲーム';play.setAttribute('aria-disabled',String(!draft.length));
 if(draft.length){const url=new URL(location.href);url.searchParams.delete('set');url.searchParams.delete('pick');url.searchParams.set('games',draft.join(','));play.href=url.href;}
 else play.removeAttribute('href');
}
$('open-lineup-picker').onclick=()=>{
 draft=chosen.slice();
 if(mode!=='custom')try{const last=JSON.parse(localStorage.getItem('sweets-lineup-v91'));if(Array.isArray(last)&&last.length&&last.length<=3&&new Set(last).size===last.length&&last.every(k=>Object.hasOwn(catalog,k)))draft=last;}catch{}
 showDraft();pick.showModal();
};
pick.querySelector('.lineup-close').onclick=()=>pick.close();
if(new URLSearchParams(location.search).get('pick')==='1'){
 openRecordMenu();$('open-lineup-picker').click();
}

pick.addEventListener('click',e=>{if(e.target===pick)pick.close();});
play.addEventListener('click',e=>{if(!draft.length){e.preventDefault();return;}try{localStorage.setItem('sweets-lineup-v91',JSON.stringify(draft));}catch{}pick.close();});

const layer=$('round-result-layer'),logo=layer.querySelector('.result-logo'),rows=$('result-games');
rows.style.gridTemplateColumns='repeat('+chosen.length+',minmax(0,1fr))';
let resultToken=-1;
function highlight(i){
 const key=ids[i];if(!key)return;
 layer.dataset.gameKind=key;layer.querySelector('.round-result').dataset.gameKind=key;
 logo.style.setProperty('background','url("'+catalog[key].logo+'") center/contain no-repeat','important');
 logo.setAttribute('aria-label',catalog[key].name);
 layer.querySelector('.result-subtitle').textContent='選択中　'+catalog[key].name;
 for(const row of rows.children){const on=Number(row.dataset.gameIndex)===i;row.setAttribute('aria-pressed',String(on));row.classList.toggle('is-selected',on);}
}
function selectResult(e){const row=e.target.closest('.result-game[data-game-index]');if(row&&rows.contains(row))highlight(Number(row.dataset.gameIndex));}
rows.addEventListener('click',selectResult);
rows.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectResult(e);}});
const previousResult=renderRoundResult;
renderRoundResult=function(a){
 previousResult(a);
 if(layer.hidden||resultToken===a.token)return;
 resultToken=a.token;
 for(const row of [...rows.children]){
  const i=Number(row.dataset.gameIndex),key=ids[i];
  if(!key){row.remove();continue;}
  const game=catalog[key];
  row.dataset.gameKind=key;row.setAttribute('role','button');row.tabIndex=0;row.setAttribute('aria-label',game.name+'の結果');
  row.style.order=String(chosen.indexOf(key));
  const icon=new Image();icon.className='result-game-emblem';icon.src=game.logo;icon.alt='';
  row.querySelector('.result-game-emblem')?.replaceWith(icon);
  const badge=document.createElement('span');badge.className='result-chosen-mark';badge.textContent='選択中';row.append(badge);
 }
 highlight(ids[active]?active:ids.indexOf(chosen[0]));
};
})();

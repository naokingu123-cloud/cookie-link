(()=>{
'use strict';
const {catalog,chosen,ids,mode}=window.SweetsLineup;
for(const s of slots){
 const key=ids[s.i];s.holder.hidden=!key;
 if(!key)continue;
 s.engine=app.engines[s.i];s.engine.recordGame=catalog[key].record;
 s.holder.dataset.gameKind=s.tab.dataset.gameKind=s.panel.dataset.gameKind=key;
 s.holder.style.setProperty('order',String(chosen.indexOf(key)),'important');
 if(mode==='all'&&!s.holder.querySelector('.all-tab-frame-overlay')){
  const frame=document.createElement('span');
  frame.className='all-tab-frame-overlay';
  frame.setAttribute('aria-hidden','true');
  s.holder.append(frame);
 }
}
$('tabs').style.setProperty('grid-template-columns',mode==='all'?'repeat(5,minmax(0,1fr))':'repeat('+chosen.length+',minmax(0,1fr))','important');
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
rows.style.removeProperty('grid-template-columns');
let resultToken=-1;
const resultRows=()=>[...rows.querySelectorAll('.result-game[data-game-index]')];
function highlight(i){
 const key=ids[i];if(!key)return;
 layer.dataset.gameKind=key;layer.querySelector('.round-result').dataset.gameKind=key;
 logo.style.setProperty('background','url("'+catalog[key].logo+'") center/contain no-repeat','important');
 logo.setAttribute('aria-label',catalog[key].name);
 for(const row of resultRows()){const on=Number(row.dataset.gameIndex)===i;row.setAttribute('aria-pressed',String(on));row.classList.toggle('is-selected',on);}
}
function resultColumnTotal(a,indexes){
 return indexes.reduce((sum,i)=>sum+(a.enabled[i]?Number(a.roundWins[i]||0):0),0);
}
function layoutReferenceResult(a){
 const gameRows=resultRows();
 if(!gameRows.length)return;
 const byIndex=new Map(gameRows.map(row=>[Number(row.dataset.gameIndex),row]));
 const ordered=chosen.map(key=>ids.indexOf(key)).filter(i=>i>=0&&byIndex.has(i));
 for(const row of gameRows)if(!ordered.includes(Number(row.dataset.gameIndex)))ordered.push(Number(row.dataset.gameIndex));
 const cut=Math.ceil(ordered.length/2),groups=[ordered.slice(0,cut),ordered.slice(cut)];
 rows.replaceChildren();
 rows.dataset.columns=groups[1].length?'2':'1';
 groups.forEach((indexes,column)=>{
  if(!indexes.length)return;
  const group=document.createElement('section');group.className='result-side result-side-'+(column?'b':'a');
  group.dataset.side=column?'b':'a';
  const head=document.createElement('header');head.className='result-side-head';
  head.innerHTML='<b>'+(column+1)+'</b><span>RESULT</span>';
  group.append(head);
  for(const i of indexes){const row=byIndex.get(i);if(row){row.style.order='';group.append(row);}}
  const total=document.createElement('div');total.className='result-side-total';
  total.innerHTML='<span>TOTAL</span><strong>'+String(resultColumnTotal(a,indexes))+'</strong>';
  group.append(total);rows.append(group);
 });
 const heading=layer.querySelector('#result-heading');if(heading)heading.textContent='RESULT';
 const subtitle=layer.querySelector('.result-subtitle');if(subtitle)subtitle.textContent='SWEETS LINK';
 const total=layer.querySelector('#result-total-win');
 if(total&&typeof fitGoldenNumber==='function')fitGoldenNumber(total,String(Math.max(0,Math.round(Number(a.totalWin)||0))),52,250);
}
function selectResult(e){const row=e.target.closest('.result-game[data-game-index]');if(row&&rows.contains(row))highlight(Number(row.dataset.gameIndex));}
rows.addEventListener('click',selectResult);
rows.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectResult(e);}});
const previousResult=renderRoundResult;
renderRoundResult=function(a){
 previousResult(a);
 if(layer.hidden||resultToken===a.token)return;
 resultToken=a.token;
 for(const row of resultRows()){
  const i=Number(row.dataset.gameIndex),key=ids[i];
  if(!key){row.remove();continue;}
  const game=catalog[key];
  row.dataset.gameKind=key;row.setAttribute('role','button');row.tabIndex=0;row.setAttribute('aria-label',game.name+'の結果');
  const oldIcon=row.querySelector('.result-game-emblem');
  if(!oldIcon||oldIcon.tagName!=='IMG'||oldIcon.getAttribute('src')!==game.logo){
   const icon=new Image();icon.className='result-game-emblem';icon.src=game.logo;icon.alt='';
   oldIcon?.replaceWith(icon);
  }
  if(!row.querySelector('.result-chosen-mark')){const badge=document.createElement('span');badge.className='result-chosen-mark';badge.textContent='選択中';row.append(badge);}
 }
 layoutReferenceResult(a);
 highlight(ids[active]?active:ids.indexOf(chosen[0]));
};
})();

/* The reference-inspired cabinet is loaded as an additive shell after every
   existing game skin. Original images and all gameplay renderers stay active. */
(()=>{
 'use strict';
 document.documentElement.classList.add('arcade-candy-world');
 const styles=[
  ['arcade-candy-world-v156-css','assets/arcade-candy-world-v156.css?v=156'],
  ['arcade-candy-world-v157-css','assets/arcade-candy-world-v157.css?v=157'],
  ['result-board-v170-css','assets/result-board-v170.css?v=170'],
  ['waffle-pow-v159-css','assets/waffle-pow-v159.css?v=163']
 ];
 for(const [id,href] of styles){
  if(document.getElementById(id))continue;
  const link=document.createElement('link');
  link.id=id;
  link.rel='stylesheet';
  link.href=href;
  document.head.append(link);
 }
 const scripts=[
  ['arcade-candy-world-v156-js','assets/arcade-candy-world-v156.js?v=156'],
  ['arcade-candy-world-v157-js','assets/arcade-candy-world-v157.js?v=160'],
  ['waffle-pow-v159-js','assets/waffle-pow-v159.js?v=162']
 ];
 for(const [id,src] of scripts){
  if(document.getElementById(id))continue;
  const script=document.createElement('script');
  script.id=id;
  script.src=src;
  script.async=false;
  document.head.append(script);
 }
})();

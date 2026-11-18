/* v249: one illustrated identity for each game, shared by its tab, menu and result.
   The game engines and payout furniture remain the owners of their layout/state. */
(()=>{
'use strict';
if(window.SweetsArcadeBrandV249)return;
const lineup=window.SweetsLineup;if(!lineup?.catalog)return;
const palettes={
 cookie:['#e8a32d','#fff1ba','#6d3519'],
 choco:['#c87a44','#ffe0bd','#603025'],
 candy:['#ed78b5','#ffe1f0','#7d305c'],
 gelato:['#52bde0','#e3fbff','#225979'],
 winery:['#aa78d9','#f2e2ff','#623b88'],
 popcorn:['#efbd35','#fff7bc','#825325'],
 jelly:['#72cc97','#e4ffde','#2d765e'],
 stick:['#dfa15d','#ffe7c1','#81502b'],
 castella:['#eea34b','#ffe8c3','#8c491d']
};
const compactTitleLines={
 choco:['チョコレート','キャニオン'],
 gelato:['ジェラート','プリズム'],
 winery:['ワイナリー','ピラミッド'],
 popcorn:['ポップコーン','スプラッシュ']
};
const catalog=Object.fromEntries(Object.entries(palettes).map(([kind,[accent,pale,ink]])=>{
 const game=lineup.catalog[kind],logo='assets/arcade-v249/logo-'+kind+'.webp';
 if(game)game.logo=logo;
 return [kind,Object.freeze({kind,name:game?.name||kind,logo,accent,pale,ink})];
}));
const titleImages=[];
window.SweetsArcadeBrandV249=Object.freeze({
 version:250,catalog:Object.freeze(catalog),
 describe(){return {games:Object.keys(catalog).length,titles:titleImages.length,loaded:titleImages.filter(img=>img.complete&&img.naturalWidth>0).length};}
});
const params=new URLSearchParams(location.search);
if(params.get('serverHost')==='1'||params.get('serverSettlementWorker')==='1')return;
document.documentElement.classList.add('arcade-brand-v249');
if(!document.getElementById('arcade-brand-v249-css')){
 const link=document.createElement('link');link.id='arcade-brand-v249-css';link.rel='stylesheet';
 link.href='assets/arcade-brand-v249.css?v=250';document.head.append(link);
}
function tint(element,game){
 if(!element||!game)return;
 element.dataset.v249Brand=game.kind;
 element.style.setProperty('--v249-brand-accent',game.accent);
 element.style.setProperty('--v249-brand-pale',game.pale);
 element.style.setProperty('--v249-brand-ink',game.ink);
}
function illustration(game,className='v249-game-logo'){
 const img=new Image();img.className=className;img.src=game.logo;
 img.alt='';img.setAttribute('aria-hidden','true');img.width=768;img.height=384;
 img.decoding='async';img.draggable=false;img.dataset.logoKind=game.kind;
 return img;
}
for(const slot of slots){
 const kind=slot.holder?.dataset.gameKind,game=catalog[kind];if(!game||slot.holder.hidden)continue;
 const title=slot.tab.querySelector('.tab-game-name');if(!title)continue;
 const img=illustration(game),caption=document.createElement('span');
 const proposed=compactTitleLines[kind],lines=proposed?.join('')===game.name?proposed:[game.name];
 caption.className='v249-game-caption';caption.setAttribute('aria-hidden','true');
 caption.dataset.lines=String(lines.length);caption.dataset.compact=String(lines.length===1&&Array.from(game.name).length>7);
 for(const text of lines){const line=document.createElement('span');line.textContent=text;caption.append(line);}
 title.replaceChildren(img,caption);titleImages.push(img);
 title.setAttribute('role','img');title.setAttribute('aria-label',game.name);
 title.dataset.logoKind=kind;
 // Some old titles used a background sprite as well as their child artwork.
 title.style.setProperty('background-image','none','important');
 title.style.setProperty('background-color','transparent','important');
 tint(slot.holder,game);
}
for(const button of document.querySelectorAll('.lineup-grid button[data-key]')){
 const game=catalog[button.dataset.key];if(!game)continue;tint(button,game);
 const img=button.querySelector('img');if(img){img.src=game.logo;img.alt='';img.width=768;img.height=384;img.decoding='async';img.classList.add('v249-menu-logo');img.dataset.logoKind=game.kind;}
 button.setAttribute('aria-label',game.name);
}

// Reuse only existing main-title furniture. The current Six Drop heading is
// its progressive payout display; it deliberately receives no logo or new row.
const gelatoTitle=document.querySelector('.gp-head');
if(gelatoTitle){gelatoTitle.replaceChildren(illustration(catalog.gelato,'v249-main-logo'));gelatoTitle.setAttribute('role','img');gelatoTitle.setAttribute('aria-label',catalog.gelato.name);}
for(const img of document.querySelectorAll('img.canyon-logo')){img.src=catalog.choco.logo;img.alt=catalog.choco.name;}
if(typeof chocoMineImages!=='undefined'&&chocoMineImages.logo)chocoMineImages.logo.src=catalog.choco.logo;

function refreshResults(){
 for(const row of document.querySelectorAll('#result-games .result-game[data-game-index]')){
  const index=Number(row.dataset.gameIndex),game=catalog[lineup.ids[index]];if(!game)continue;
  const old=row.querySelector('.result-game-emblem');if(!old)continue;
  if(old.tagName==='IMG'){
   if(old.getAttribute('src')!==game.logo)old.src=game.logo;
   if(old.alt!=='')old.alt='';
   if(old.dataset.logoKind!==game.kind)old.dataset.logoKind=game.kind;
   if(!old.classList.contains('v249-result-logo'))old.classList.add('v249-result-logo');
  }else old.replaceWith(illustration(game,'result-game-emblem v249-result-logo'));
 }
}
const nativeResult=renderRoundResult;
renderRoundResult=function(...args){const result=nativeResult.apply(this,args);refreshResults();return result;};
refreshResults();
})();

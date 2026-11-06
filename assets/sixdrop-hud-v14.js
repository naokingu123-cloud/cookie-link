/* Six Drop v14: restore top ROUND labels to the ALL CLEAR row,
 * use actual candy-style role examples, and install the candy clear logo.
 * All official score/round logic remains in the existing HUD.
 */
(()=>{
 'use strict';
 try{
  if(!slots?.[2] || typeof carnivalHud!=='function')return;
  const card=slots[2];
  const roles=['line','triangle','hexagon'];
  function ensureRolePictures(){
   const root=card.sixOdds?.querySelector('.six-glass-ui');
   if(!root)return;
   for(const type of roles){
     const row=root.querySelector('[data-simple-role="'+type+'"]');
     if(!row)return;
     const label=row.querySelector('.six-glass-role-label');
     const newLabel=({line:'直線\n同色4個以上',triangle:'トライアングル\n同色6個',hexagon:'ヘキサゴン\n同色6個'})[type];
     if(label && label.textContent!==newLabel)label.textContent=newLabel;
   }
  }
  let lastRoundMarkup='';
  function syncTop(){
    const heading=document.getElementById('carnival-heading');
    const source=heading?.querySelector('.six-round-cards');
    const banner=heading?.querySelector('.six-allclear-banner');
    if(!heading||!banner)return;
    if(!banner.querySelector('.six-clear-candy-logo')){
      const logo=document.createElement('img');
      logo.className='six-clear-candy-logo';
      logo.src='assets/sixdrop-allclear-candy-v14.svg?v=1';
      logo.alt='全消し';
      logo.decoding='async';
      banner.insertBefore(logo,banner.firstChild);
    }
    if(!source)return;
    let host=heading.querySelector('.six-top-rounds');
    if(!host){
      host=document.createElement('div');
      host.className='six-top-rounds';
      host.setAttribute('aria-label','現在と次のラウンド');
      heading.appendChild(host);
    }
    const originals=Array.from(source.querySelectorAll('.six-round-card')).slice(-2);
    const marker=originals.map(x=>x.outerHTML).join('~~');
    if(marker===lastRoundMarkup && host.childElementCount===originals.length)return;
    lastRoundMarkup=marker;
    host.replaceChildren(...originals.map(original=>{
      const clone=original.cloneNode(true);
      clone.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
      const bold=clone.querySelector('b');
      if(bold){
        const match=(bold.textContent||'').trim().match(/^R\s*(\d+)$/i);
        if(match)bold.textContent='Round'+match[1];
      }
      return clone;
    }));
  }
  function refresh(){
    syncTop();
    // v6 used to mirror PREV/NOW/NEXT inside the odds column on every
    // official HUD update. Remove the duplicate AFTER its wrapper runs.
    // The top Round1/Round2 indicators stay bound to the real HUD.
    card.sixOdds?.querySelectorAll('.six-side-round-cards').forEach(el=>el.remove());
    ensureRolePictures();
  }
  const previousHud=carnivalHud;
  carnivalHud=function(a){const output=previousHud(a);refresh();return output;};
  refresh();
  scheduleUI(app);
  console.info('[SixDropV14] candy logo, real-candy role samples and top Round labels enabled');
 }catch(err){console.error('[SixDropV14]',err);}
})();
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
  const geom={
    line:[[18,42],[54,42],[90,42],[126,42]],
    triangle:[[72,10],[48,39],[96,39],[24,68],[72,68],[120,68]],
    hexagon:Array.from({length:6},(_,i)=>{
      const angle=-Math.PI/2+i*Math.PI/3;
      return [72+36*Math.cos(angle),42+32*Math.sin(angle)];
    })
  };
  // A sample uses a SINGLE colour, just like the real same-colour awards:
  // cyan-blue peppermint (line), grape-green (triangle), deep blue (hexagon).
  // Lime-green remains the fourth active candy palette colour.
  function candySample(type){
   const centers=geom[type];
   const shade=type==='line'
     ? ['#ffffff','#98faff','#17c8eb','#168ed3']
     :type==='triangle'
     ? ['#fff','#c4ffd9','#38d786','#159657']
     :['#ffffff','#9acaee','#3c79cf','#23428b'];
   const id='six-sample-'+type;
   let connections='';
   if(type==='line')connections='M18 42H126';
   else if(type==='triangle')connections='M72 10L24 68H120Z';
   else connections=centers.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join('')+'Z';
   const pieces=centers.map(p=>{
    const x=p[0].toFixed(1),y=p[1].toFixed(1);
    let symbol='';
    if(type==='line'){
     // Four-curl peppermint, like the blue-white drops on the board.
     symbol='<g fill="#e9fdff" opacity=".92">'+
       '<path d="M0 0Q-8-10-3-12Q8-9 6-3Z"/>'+
       '<path d="M0 0Q10-8 12-3Q9 8 3 6Z"/>'+
       '<path d="M0 0Q8 10 3 12Q-8 9-6 3Z"/>'+
       '<path d="M0 0Q-10 8-12 3Q-9-8-3-6Z"/></g>';
    }else if(type==='triangle'){
     // Glossy bunch of green grape candy as in the current board.
     symbol='<g fill="#198b4c" stroke="#a8ffd8" stroke-width=".55">'+
       '<circle cx="-3" cy="-5" r="4"/><circle cx="3" cy="-5" r="4"/>'+
       '<circle cx="-6" cy="1" r="4"/><circle cx="0" cy="1" r="4"/>'+
       '<circle cx="6" cy="1" r="4"/><circle cx="-3" cy="7" r="4"/>'+
       '<circle cx="3" cy="7" r="4"/></g>';
    }else{
     // Deep-blue pinwheel candy.
     symbol='<g fill="#203c8d" opacity=".87">'+
       '<path d="M0 0Q-10-11-3-12Q9-10 5-3Z"/>'+
       '<path d="M0 0Q11-10 12-3Q10 9 3 5Z"/>'+
       '<path d="M0 0Q10 11 3 12Q-9 10-5 3Z"/>'+
       '<path d="M0 0Q-11 10-12 3Q-10-9-3-5Z"/></g>';
    }
    return '<g transform="translate('+x+' '+y+')">'+
      '<circle r="13.1" fill="url(#'+id+')" stroke="#fff2c8" stroke-width="1.6"/>'+
      '<circle r="10.9" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width=".75"/>'+
      symbol+'<ellipse cx="-4.5" cy="-7" rx="4.4" ry="2.6" fill="#fff" opacity=".57"/>'+
      '</g>';
   }).join('');
   return '<svg class="six-glass-role-icon six-real-candy-role" viewBox="0 0 144 84" role="img" aria-label="'+
    ({line:'青色キャンディ4個の直線',triangle:'緑色キャンディ6個のトライアングル',hexagon:'青色キャンディ6個のヘキサゴン'}[type])+
    '" xmlns="http://www.w3.org/2000/svg">'+
    '<defs><radialGradient id="'+id+'" cx=".32" cy=".2" r=".85">'+
    '<stop stop-color="'+shade[0]+'"/><stop offset=".21" stop-color="'+shade[1]+'"/>'+
    '<stop offset=".68" stop-color="'+shade[2]+'"/><stop offset="1" stop-color="'+shade[3]+'"/>'+
    '</radialGradient></defs>'+
    '<path d="'+connections+'" fill="none" stroke="#ffd07b" stroke-width="3.3" stroke-linejoin="round" stroke-linecap="round"/>'+
    pieces+'</svg>';
  }
  function ensureRolePictures(){
   const root=card.sixOdds?.querySelector('.six-glass-ui');
   if(!root)return;
   for(const type of roles){
     const row=root.querySelector('[data-simple-role="'+type+'"]');
     if(!row)return;
     const label=row.querySelector('.six-glass-role-label');
     const newLabel=({line:'直線\n同色4個以上',triangle:'トライアングル\n同色6個',hexagon:'ヘキサゴン\n同色6個'})[type];
     if(label && label.textContent!==newLabel)label.textContent=newLabel;
     const icon=row.querySelector('.six-glass-role-icon');
     if(!icon || icon.classList.contains('six-real-candy-role'))continue;
     icon.outerHTML=candySample(type);
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
  function refresh(){syncTop();ensureRolePictures();}
  const previousHud=carnivalHud;
  carnivalHud=function(a){const output=previousHud(a);refresh();return output;};
  refresh();
  scheduleUI(app);
  console.info('[SixDropV14] candy logo, real-candy role samples and top Round labels enabled');
 }catch(err){console.error('[SixDropV14]',err);}
})();
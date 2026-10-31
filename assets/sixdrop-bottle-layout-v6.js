/* Six Drop v6: larger real drop geometry and live ROUND preview in payout column.
 * Included INSIDE the game's existing IIFE, after the glass theme.
 * Existing scoring, game state, animations and official HUD are left intact.
 */
(()=>{
 'use strict';
 try{
  if(typeof sixLayout!=='function'||typeof carnivalHud!=='function'||!slots?.[2])return;
  // The 320x320 game canvas has a usable center opening of about x=39..281.
  // 29.6 makes the standard 8-row drops 5.7% larger without covering edges.
  // For 10+ rows the step is limited so top/bottom remain clear of bottle lips.
  sixLayout=function(rows=SIX_ROWS){
   const count=Number.isFinite(+rows)?Math.max(1,+rows):SIX_ROWS;
   const verticalLimit=250/(1+(count-1)*SIX_SQRT3_2);
   const step=Math.max(28,Math.min(29.6,verticalLimit));
   return {step,top:164-(count-1)*step*SIX_SQRT3_2/2,radius:step*.5};
  };
  function syncRound(){
   const source=document.querySelector('#carnival-heading .six-round-cards');
   const visible=slots[2]?.sixOdds?.querySelector('.six-glass-ui');
   if(!source||!visible)return;
   let destination=visible.querySelector('.six-side-round-cards');
   if(!destination){
    destination=document.createElement('div');
    destination.className='six-side-round-cards';
    destination.setAttribute('aria-label','シックスドロップ ROUND 前回・現在・次回');
    visible.insertBefore(destination,visible.firstChild);
   }
   const next=source.innerHTML;
   if(destination._sixHtml!==next){
    destination.innerHTML=next;
    destination.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
    destination._sixHtml=next;
   }
   document.body.classList.add('six-bottle-v6');
  }
  const previousHud=carnivalHud;
  carnivalHud=function(a){const result=previousHud(a);syncRound();return result;};
  syncRound();
  carnivalQueueFrame(slots[2]);
  scheduleUI(app);
  console.info('[SixDropBottleV6] larger candy grid and synchronized ROUND panel');
 }catch(error){console.error('[SixDropBottleV6]',error);}
})();

/* Six Drop v6: larger real drop geometry and live ROUND preview in payout column.
 * Included INSIDE the game's existing IIFE, after the glass theme.
 * Existing scoring, game state, animations and official HUD are left intact.
 */
(()=>{
 'use strict';
 try{
  if(typeof sixLayout!=='function'||typeof carnivalHud!=='function'||!slots?.[2])return;
  // Render geometry, rather than CSS-only resizing:
  // the default 8-row game is +7.9% in step and +11.1% in diameter
  // compared with the old 28px radius=14 layout.
  // Cap taller debug grids to stay inside the glass bottle aperture.
  sixLayout=function(rows=SIX_ROWS){
   const count=Number.isFinite(+rows)?Math.max(1,+rows):SIX_ROWS;
   const verticalLimit=250/(1+(count-1)*SIX_SQRT3_2);
   const step=Math.min(30.2,verticalLimit);
   return {step,top:164-(count-1)*step*SIX_SQRT3_2/2,radius:step*.515};
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
  slots[2].candyKey=''; // invalidate cached board image at the new draw geometry
  carnivalQueueFrame(slots[2]);
  scheduleUI(app);
  console.info('[SixDropBottleV6] larger candy grid and synchronized ROUND panel');
 }catch(error){console.error('[SixDropBottleV6]',error);}
})();

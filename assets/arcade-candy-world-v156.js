/* SWEETS LINK v156 — non-destructive candy arcade cabinet decorations. */
(()=>{
'use strict';

function ensure(parent,className,{prepend=false}={}){
  if(!parent)return null;
  const key=className.trim().split(/\s+/)[0];
  const existing=[...parent.children].find(el=>el.classList?.contains(key));
  if(existing)return existing;
  const el=document.createElement('span');
  el.className=className;
  el.setAttribute('aria-hidden','true');
  if(prepend)parent.prepend(el);else parent.append(el);
  return el;
}

function install(){
  document.documentElement.classList.add('arcade-candy-world');
  document.documentElement.dataset.arcadeWorld='candy-v156';

  const screen=document.getElementById('screen');
  if(!screen)return false;

  ensure(screen,'arcade-world-backdrop',{prepend:true});
  ensure(screen,'arcade-world-glass');

  const festival=screen.querySelector('.festival-top');
  ensure(festival,'arcade-world-roulette-glass');

  const deck=screen.querySelector(':scope > .games-deck')||screen.querySelector('.games-deck');
  ensure(deck,'arcade-world-tab-ribbon');

  const game=screen.querySelector(':scope > .game')||screen.querySelector('.game');
  ensure(game,'arcade-world-game-canopy');
  ensure(game,'arcade-world-game-rail arcade-world-game-rail-left');
  ensure(game,'arcade-world-game-rail arcade-world-game-rail-right');

  const consolePanel=document.getElementById('console');
  ensure(consolePanel,'arcade-world-console-trim');

  return true;
}

if(!install()){
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',install,{once:true});
  }else{
    requestAnimationFrame(install);
  }
}

console.info('[SweetsWorldV156] candy arcade cabinet shell enabled; gameplay and original art unchanged');
})();

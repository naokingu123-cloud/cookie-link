(()=>{
'use strict';
if(window.__sweetsHostSpeedV219)return;
window.__sweetsHostSpeedV219=true;
if(new URLSearchParams(location.search).get('serverHost')!=='1')return;
let timer=0,lastRound='';
let attemptedButton=null,attemptedState='';
// Compatibility for a page that was already using the old speed control.
// A lock marker or stale 2× label must never toggle a native 1× clock to 2×.
const isTwo=button=>{
 const pressed=button?.getAttribute('aria-pressed');
 if(pressed==='true'||pressed==='false')return pressed==='true';
 return /^(?:2|2\.0)\s*[×x]$/i.test(String(button?.textContent||'').trim());
};
function directOne(){
 try{if(typeof rouletteTimeScale!=='undefined'){rouletteTimeScale=1;return true;}}catch{}
 try{if(typeof rouletteDriver!=='undefined'&&rouletteDriver){
  if(typeof rouletteDriver.setTimeScale==='function'){rouletteDriver.setTimeScale(1);return true;}
  if('timeScale'in rouletteDriver){rouletteDriver.timeScale=1;return Number(rouletteDriver.timeScale)===1;}
 }}catch{}
 return false;
}
function apply(){
 clearTimeout(timer);
 lastRound=String(window.SweetsSharedMachine?.client?.round?.id||'');
 const button=document.getElementById('roulette-speed');
 const applied=directOne();
 if(applied&&button){button.textContent='1×';button.setAttribute('aria-pressed','false');}
 if(!applied&&button&&isTwo(button)){
  const state=String(button.getAttribute('aria-pressed'))+'|'+String(button.textContent||'');
  if(button!==attemptedButton||state!==attemptedState){
   attemptedButton=button;attemptedState=state;
   // The previous tick hides/disables the control. Restore an existing 2×
   // setting once; repeated clicks against unchanged UI could toggle it back.
   button.disabled=false;
   try{button.click();}catch(error){console.warn('[HostSpeedV219] speed button',error?.message||error);}
  }
 }else{attemptedButton=null;attemptedState='';}
 if(button){button.dataset.serverLockedSpeed='1';button.setAttribute('title','標準速度固定');button.hidden=true;button.disabled=true;button.style.pointerEvents='none';}
 timer=setTimeout(apply,180);
}
apply();
addEventListener('beforeunload',()=>clearTimeout(timer),{once:true});
window.SweetsHostSpeedV219={apply,get roundId(){return lastRound;},get speed(){return 1;}};
console.info('[HostSpeedV219] physical roulette uses standard 1x speed; legacy speed control disabled');
})();


(()=>{
'use strict';
if(window.__sweetsHostSpeedV219)return;
window.__sweetsHostSpeedV219=true;
if(new URLSearchParams(location.search).get('serverHost')!=='1')return;
let timer=0,lastRound='',appliedRound='';
const isTwo=button=>button?.getAttribute('aria-pressed')==='true'||/^(?:2|2\.0)\s*[×x]$/i.test(String(button?.textContent||'').trim())||button?.dataset?.serverLockedSpeed==='2';
function directTwo(){
 try{if(typeof rouletteTimeScale!=='undefined'){rouletteTimeScale=2;return true;}}catch{}
 try{if(typeof rouletteDriver!=='undefined'&&rouletteDriver){
  if('timeScale'in rouletteDriver)rouletteDriver.timeScale=2;
  if(typeof rouletteDriver.setTimeScale==='function')rouletteDriver.setTimeScale(2);
  return true;
 }}catch{}
 return false;
}
function apply(){
 clearTimeout(timer);
 const round=window.SweetsSharedMachine?.client?.round,roundId=String(round?.id||''),playing=round?.phase==='PLAYING';
 const button=document.getElementById('roulette-speed');
 if(roundId!==lastRound){lastRound=roundId;appliedRound='';}
 if(playing){
  directTwo();
  if(button&&!isTwo(button)&&appliedRound!==roundId){
   try{button.click();}catch(error){console.warn('[HostSpeedV219] speed button',error?.message||error);}
  }
  appliedRound=roundId;
 }
 if(button){button.dataset.serverLockedSpeed='2';button.setAttribute('title','サーバー物理抽選は2倍速固定');button.style.pointerEvents='none';button.style.opacity='.78';}
 timer=setTimeout(apply,180);
}
apply();
addEventListener('beforeunload',()=>clearTimeout(timer),{once:true});
window.SweetsHostSpeedV219={apply,get roundId(){return lastRound;},get speed(){return 2;}};
console.info('[HostSpeedV219] physical roulette locked to isolated 2x speed; browser clocks unchanged');
})();

(()=>{
'use strict';
if(window.__sweetsHostSpeedV217)return;
window.__sweetsHostSpeedV217=true;
if(new URLSearchParams(location.search).get('serverHost')!=='1')return;
let timer=0,locked=false;
function apply(){
 timer=0;
 const button=document.getElementById('roulette-speed');
 if(!button){timer=setTimeout(apply,80);return;}
 const isDouble=button.getAttribute('aria-pressed')==='true'||/^2(?:\.0)?×$/.test(String(button.textContent||'').trim());
 if(!isDouble){
  try{button.click();}catch(error){console.warn('[HostSpeedV217] speed click',error?.message||error);}
 }
 button.dataset.serverLockedSpeed='2';
 button.setAttribute('title','サーバー物理抽選は2倍速固定');
 button.style.pointerEvents='none';button.style.opacity='.78';
 locked=true;
 timer=setTimeout(apply,700);
}
apply();
addEventListener('beforeunload',()=>clearTimeout(timer),{once:true});
window.SweetsHostSpeedV217={apply,get locked(){return locked;}};
console.info('[HostSpeedV217] server physical roulette locked to 2x');
})();

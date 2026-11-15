(()=>{
'use strict';
if(window.__sweetsHostSpeedV218)return;
window.__sweetsHostSpeedV218=true;
if(new URLSearchParams(location.search).get('serverHost')!=='1')return;
let timer=0,lastRound='',lastClick=0;
function isDouble(button){return button?.getAttribute('aria-pressed')==='true'||/^2(?:\.0)?[×x]$/.test(String(button?.textContent||'').trim());}
function tick(){
 timer=0;const round=window.SweetsSharedMachine?.client?.round,button=document.getElementById('roulette-speed');
 if(!button){timer=setTimeout(tick,100);return;}
 const roundId=String(round?.id||'');
 if(roundId!==lastRound){lastRound=roundId;lastClick=0;}
 if(round?.phase==='PLAYING'&&!isDouble(button)&&Date.now()-lastClick>700){
  lastClick=Date.now();try{button.click();}catch(error){console.warn('[HostSpeedV218]',error?.message||error);}
 }
 button.dataset.serverLockedSpeed='2';button.setAttribute('title','サーバー物理抽選は2倍速固定');button.style.pointerEvents='none';button.style.opacity='.78';
 timer=setTimeout(tick,500);
}
tick();addEventListener('beforeunload',()=>clearTimeout(timer),{once:true});
window.SweetsHostSpeedV218={apply:tick,get roundId(){return lastRound;}};
console.info('[HostSpeedV218] physical roulette uses 2x once per authoritative round');
})();

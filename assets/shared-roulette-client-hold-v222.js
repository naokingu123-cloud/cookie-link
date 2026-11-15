(()=>{
'use strict';
if(window.__sweetsRouletteHoldV222)return;window.__sweetsRouletteHoldV222=true;
const params=new URLSearchParams(location.search);if(params.get('serverHost')==='1'||params.get('serverSettlementWorker')==='1')return;
let lastGood=null,lastRequest=0,timer=0;
const lastTimes=new WeakMap(),lastAdvance=new WeakMap();
function installCss(){
 if(document.getElementById('shared-roulette-hold-v222-css'))return;
 const style=document.createElement('style');style.id='shared-roulette-hold-v222-css';style.textContent=`
  body.shared-roulette-hold-v222 #cookie-roulette .shared-roulette-v219[data-hold-v222="1"]{opacity:1!important;z-index:10013!important}
  body.shared-roulette-hold-v222 #cookie-roulette .a8-stage>canvas{visibility:hidden!important}
  #cookie-roulette .shared-roulette-mirror{display:none!important}`;document.head.append(style);
}
function videos(){return [...document.querySelectorAll('#cookie-roulette .shared-roulette-v219')];}
function cleanupLegacy(){
 document.body.classList.remove('shared-roulette-live');
 for(const node of document.querySelectorAll('#cookie-roulette .shared-roulette-mirror')){node.dataset.live='0';node.remove();}
}
function tick(){
 installCss();cleanupLegacy();const now=Date.now(),items=videos();let freshest=null,freshAt=0;
 for(const video of items){
  const time=Number(video.currentTime)||0,previous=lastTimes.get(video);
  if(video.readyState>=2&&previous!=null&&time>previous+.003)lastAdvance.set(video,now);
  lastTimes.set(video,time);const at=Number(lastAdvance.get(video)||0);
  if(at>freshAt){freshAt=at;freshest=video;}
 }
 if(freshest&&now-freshAt<2200)lastGood=freshest;
 for(const video of items)video.dataset.holdV222='0';
 if(lastGood?.isConnected&&lastGood.readyState>=2){
  lastGood.dataset.holdV222='1';document.body.classList.add('shared-roulette-hold-v222');
 }else document.body.classList.remove('shared-roulette-hold-v222');
 if((!freshAt||now-freshAt>1800)&&now-lastRequest>900){lastRequest=now;try{window.SweetsRouletteClientV219?.request?.(0,true);}catch{}}
 timer=setTimeout(tick,180);
}
function boot(){if(!document.body){setTimeout(boot,50);return;}tick();}
boot();addEventListener('beforeunload',()=>clearTimeout(timer),{once:true});
console.info('[RouletteHoldV222] last-good remote frame continuity enabled');
})();

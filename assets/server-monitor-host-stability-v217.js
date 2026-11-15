(()=>{
'use strict';
if(window.__sweetsMonitorHostStabilityV217)return;
window.__sweetsMonitorHostStabilityV217=true;
const frame=document.getElementById('host-frame');
if(!frame)return;
let assigned='',booted=false;
function normalize(value){
 const url=new URL(String(value||'/index.html'),location.href);
 url.searchParams.set('serverHost','1');
 url.searchParams.set('smoothRoulette','1');
 url.searchParams.delete('lightRoulette');
 url.searchParams.set('hostBoot','v217');
 return url.href;
}
try{
 Object.defineProperty(frame,'src',{
  configurable:true,
  get(){return assigned||frame.getAttribute('src')||'';},
  set(value){
   const next=normalize(value);
   // The original monitor periodically assigned a new hostBoot URL while the
   // iframe was still initializing. Keep one physical-host document alive so
   // WebGL, WebRTC peers and the capture track survive across every round.
   if(booted)return;
   booted=true;assigned=next;frame.setAttribute('src',next);
  }
 });
}catch(error){console.warn('[MonitorHostStabilityV217] src guard',error?.message||error);}
window.SweetsMonitorHostStabilityV217={
 get url(){return assigned;},
 reload(){
  const current=assigned||normalize('/index.html');
  booted=false;assigned='';frame.removeAttribute('src');
  setTimeout(()=>{frame.src=current;},0);
 }
};
console.info('[MonitorHostStabilityV217] persistent smooth host iframe enabled');
})();

(()=>{
'use strict';
function load(url){
 const x=new XMLHttpRequest();x.open('GET',url,false);x.send(null);
 if(x.status<200||x.status>=300)throw Error('shared extension load failed: '+url+' (HTTP '+x.status+')');
 return x.responseText;
}
try{
 eval(load('assets/shared-machine-core-v196.js?v=205')+'\n//# sourceURL=shared-machine-core-v196.js');
 const host=new URLSearchParams(location.search).get('serverHost')==='1';
 if(host){
  eval(load('assets/shared-host-keepalive-v205.js?v=205')+'\n//# sourceURL=shared-host-keepalive-v205.js');
  eval(load('assets/shared-roulette-webrtc-host-v197.js?v=205')+'\n//# sourceURL=shared-roulette-webrtc-host-v197.js');
 }else{
  eval(load('assets/shared-roulette-webrtc-client-v197.js?v=205')+'\n//# sourceURL=shared-roulette-webrtc-client-v197.js');
  eval(load('assets/shared-roulette-client-watchdog-v205.js?v=205')+'\n//# sourceURL=shared-roulette-client-watchdog-v205.js');
 }
}catch(error){console.error('[SharedMachineLoaderV205]',error);throw error;}
})();

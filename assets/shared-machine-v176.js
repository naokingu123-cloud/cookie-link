(()=>{
'use strict';
function load(url){
 const x=new XMLHttpRequest();x.open('GET',url,false);x.send(null);
 if(x.status<200||x.status>=300)throw Error('shared extension load failed: '+url+' (HTTP '+x.status+')');
 return x.responseText;
}
try{
 const params=new URLSearchParams(location.search),worker=params.get('serverSettlementWorker')==='1',host=params.get('serverHost')==='1';
 if(worker){
  eval(load('assets/server-offline-settlement-worker-v3.js?v=210')+'\n//# sourceURL=server-offline-settlement-worker-v3.js');
 }else{
  eval(load('assets/shared-machine-core-v196.js?v=210')+'\n//# sourceURL=shared-machine-core-v196.js');
  if(host){
   eval(load('assets/shared-host-keepalive-v206.js?v=210')+'\n//# sourceURL=shared-host-keepalive-v206.js');
   eval(load('assets/shared-roulette-webrtc-host-v197.js?v=210')+'\n//# sourceURL=shared-roulette-webrtc-host-v197.js');
  }else{
   eval(load('assets/server-payout-control-v3.js?v=210')+'\n//# sourceURL=server-payout-control-v3.js');
   eval(load('assets/shared-recovery-replay-v207.js?v=210')+'\n//# sourceURL=shared-recovery-replay-v207.js');
   eval(load('assets/shared-roulette-webrtc-client-v197.js?v=210')+'\n//# sourceURL=shared-roulette-webrtc-client-v197.js');
   eval(load('assets/shared-roulette-client-watchdog-v205.js?v=210')+'\n//# sourceURL=shared-roulette-client-watchdog-v205.js');
   eval(load('assets/shared-recovery-completion-v206.js?v=210')+'\n//# sourceURL=shared-recovery-completion-v206.js');
  }
 }
}catch(error){console.error('[SharedMachineLoaderV210]',error);throw error;}
})();

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
  eval(load('assets/server-offline-settlement-worker-v3.js?v=217')+'\n//# sourceURL=server-offline-settlement-worker-v3.js');
 }else{
  eval(load('assets/shared-core-patch-v216.js?v=217')+'\n//# sourceURL=shared-core-patch-v216.js');
  const coreSource=window.SweetsSharedCorePatchV216.patch(load('assets/shared-machine-core-v196.js?v=217'));
  eval(coreSource+'\n//# sourceURL=shared-machine-core-v196-v217-patched.js');
  if(host){
   eval(load('assets/shared-host-keepalive-v206.js?v=217')+'\n//# sourceURL=shared-host-keepalive-v206.js');
   eval(load('assets/shared-host-speed-v217.js?v=217')+'\n//# sourceURL=shared-host-speed-v217.js');
   eval(load('assets/shared-roulette-webrtc-host-v217.js?v=217')+'\n//# sourceURL=shared-roulette-webrtc-host-v217.js');
  }else{
   eval(load('assets/shared-connection-gate-v217.js?v=217')+'\n//# sourceURL=shared-connection-gate-v217.js');
   eval(load('assets/server-payout-control-v3.js?v=217')+'\n//# sourceURL=server-payout-control-v3.js');
   eval(load('assets/shared-client-flow-v212.js?v=217')+'\n//# sourceURL=shared-client-flow-v217.js');
   eval(load('assets/shared-client-lifecycle-v217.js?v=217')+'\n//# sourceURL=shared-client-lifecycle-v217.js');
   eval(load('assets/shared-next-bet-join-v217.js?v=217')+'\n//# sourceURL=shared-next-bet-join-v217.js');
   eval(load('assets/shared-roulette-webrtc-client-v197.js?v=217')+'\n//# sourceURL=shared-roulette-webrtc-client-v217.js');
  }
 }
}catch(error){console.error('[SharedMachineLoaderV217]',error);throw error;}
})();

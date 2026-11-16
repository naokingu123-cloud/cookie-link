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
  eval(load('assets/server-offline-settlement-worker-v3.js?v=227')+'\n//# sourceURL=server-offline-settlement-worker-v3.js');
 }else{
  eval(load('assets/shared-core-patch-v221.js?v=227')+'\n//# sourceURL=shared-core-patch-v221.js');
  eval(load('assets/shared-core-patch-v224.js?v=227')+'\n//# sourceURL=shared-core-patch-v224.js');
  const coreSource=window.SweetsSharedCorePatchV224.patch(load('assets/shared-machine-core-v196.js?v=227'));
  eval(coreSource+'\n//# sourceURL=shared-machine-core-v196-v227-patched.js');
  if(host){
   eval(load('assets/shared-host-keepalive-v206.js?v=227')+'\n//# sourceURL=shared-host-keepalive-v206.js');
   eval(load('assets/shared-host-speed-v219.js?v=227')+'\n//# sourceURL=shared-host-speed-v219.js');
   eval(load('assets/shared-roulette-webrtc-host-v224.js?v=227')+'\n//# sourceURL=shared-roulette-webrtc-host-v224.js');
  }else{
   eval(load('assets/server-payout-control-v3.js?v=227')+'\n//# sourceURL=server-payout-control-v3.js');
   eval(load('assets/shared-roulette-client-v224.js?v=227')+'\n//# sourceURL=shared-roulette-client-v224.js');
   eval(load('assets/shared-client-controller-v224.js?v=227')+'\n//# sourceURL=shared-client-controller-v224.js');
  }
 }
}catch(error){console.error('[SharedMachineLoaderV227]',error);throw error;}
})();


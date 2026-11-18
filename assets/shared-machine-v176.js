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
  eval(load('assets/server-offline-settlement-worker-v3.js?v=250')+'\n//# sourceURL=server-offline-settlement-worker-v3.js');
 }else{
  eval(load('assets/shared-core-patch-v221.js?v=250')+'\n//# sourceURL=shared-core-patch-v221.js');
  eval(load('assets/shared-core-patch-v224.js?v=250')+'\n//# sourceURL=shared-core-patch-v224.js');
  eval(load('assets/guest-entry-v237.js?v=250')+'\n//# sourceURL=guest-entry-v237.js');
  const coreSource=window.SweetsGuestEntryV237.patch(window.SweetsSharedCorePatchV224.patch(load('assets/shared-machine-core-v196.js?v=250')));
  eval(coreSource+'\n//# sourceURL=shared-machine-core-v196-v243-patched.js');
  if(host){
   eval(load('assets/shared-host-keepalive-v206.js?v=250')+'\n//# sourceURL=shared-host-keepalive-v206.js');
   eval(load('assets/shared-host-speed-v219.js?v=250')+'\n//# sourceURL=shared-host-speed-v219.js');
   eval(load('assets/shared-roulette-webrtc-host-v224.js?v=250')+'\n//# sourceURL=shared-roulette-webrtc-host-v224.js');
   eval(load('assets/stations-reach-host-v239.js?v=250')+'\n//# sourceURL=stations-reach-host-v239.js');
  }else{
   eval(load('assets/server-payout-control-v3.js?v=250')+'\n//# sourceURL=server-payout-control-v3.js');
   eval(load('assets/shared-roulette-client-v224.js?v=250')+'\n//# sourceURL=shared-roulette-client-v224.js');
   eval(load('assets/shared-client-controller-v224.js?v=250')+'\n//# sourceURL=shared-client-controller-v224.js');
   eval(load('assets/shared-client-background-v240.js?v=250')+'\n//# sourceURL=shared-client-background-v240.js');
   eval(load('assets/shared-client-hidden-v246.js?v=250')+'\n//# sourceURL=shared-client-hidden-v246.js');
   try{
    if(!document.getElementById('stations-v235-css')){const link=document.createElement('link');link.id='stations-v235-css';link.rel='stylesheet';link.href='assets/stations-v235.css?v=250';document.head.append(link);}
    eval(load('assets/stations-number-preview-v241.js?v=250')+'\n//# sourceURL=stations-number-preview-v241.js');
    eval(load('assets/stations-progressive-v246.js?v=250')+'\n//# sourceURL=stations-progressive-v246.js');
    eval(window.SweetsStationProgressiveV246.patch(window.SweetsStationNumbersV241.patch(window.SweetsGuestEntryV237.patchStations(load('assets/stations-v235.js?v=250'))))+'\n//# sourceURL=stations-v235.js');
   }catch(error){console.warn('[Stations238] display unavailable',error);}
  }
 }
}catch(error){console.error('[SharedMachineLoaderV243]',error);throw error;}
})();

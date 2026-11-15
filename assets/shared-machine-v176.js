(()=>{
'use strict';
function load(url){
 const x=new XMLHttpRequest();x.open('GET',url,false);x.send(null);
 if(x.status<200||x.status>=300)throw Error('shared extension load failed: '+url+' (HTTP '+x.status+')');
 return x.responseText;
}
try{
 eval(load('assets/shared-machine-core-v196.js?v=200')+'\n//# sourceURL=shared-machine-core-v196.js');
 const host=new URLSearchParams(location.search).get('serverHost')==='1';
 const file=host?'assets/shared-roulette-webrtc-host-v197.js?v=200':'assets/shared-roulette-webrtc-client-v197.js?v=200';
 eval(load(file)+'\n//# sourceURL='+file.split('?')[0]);
}catch(error){console.error('[SharedMachineLoaderV200]',error);throw error;}
})();

(()=>{
'use strict';
if(window.__sweetsSharedLoaderV179)return;
window.__sweetsSharedLoaderV176=true;
window.__sweetsPrecomputedRoundV174=true;

(async()=>{
 try{
  const response=await fetch('assets/shared-machine-v176.js?v=179',{cache:'no-store'});
  if(!response.ok)throw Error('shared-machine-v176.js '+response.status);
  const source=await response.text();
  eval(source);
 }catch(error){
  console.warn('[SharedMachineLoaderV179] shared mode unavailable; native local draw remains active',error);
 }
})();
})();

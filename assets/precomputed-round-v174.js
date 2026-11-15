(()=>{
'use strict';
if(window.__sweetsSharedLoaderV180)return;
window.__sweetsSharedLoaderV180=true;
window.__sweetsPrecomputedRoundV174=true;

(async()=>{
 try{
  const response=await fetch('assets/shared-machine-v176.js?v=180',{cache:'no-store'});
  if(!response.ok)throw Error('shared-machine-v176.js '+response.status);
  const source=await response.text();
  eval(source);
 }catch(error){
  console.error('[SharedMachineLoaderV180] server client unavailable; local roulette is blocked',error);
  const blockLocal=()=>{
   try{
    if(typeof rouletteDrawSource==='undefined'||!rouletteDrawSource)return false;
    rouletteDrawSource.start=function(){try{typeof countdownText==='function'&&countdownText('サーバー抽選機に接続できません','共有抽選 SERVER');}catch{}console.error('[SharedMachineLoaderV180] draw blocked: server client unavailable');};
    return true;
   }catch{return false;}
  };
  if(!blockLocal()){let attempts=0;const timer=setInterval(()=>{if(blockLocal()||++attempts>=200)clearInterval(timer);},50);}
 }
})();
})();

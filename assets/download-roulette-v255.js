/* Draw recorded server motion with the existing cabinet; no local lottery. */
(()=>{
'use strict';
if(window.SweetsDownloadRouletteV255)return;
let recording=null,driver=null,index=0;
function validate(value){
 if(value?.version!==255||value.kind!=='production-physics-frames'||!Array.isArray(value.frames)||!value.frames.length||value.frames.length>30000||value.hits?.length!==8||new Set(value.hits.map(hit=>hit.number)).size!==8)throw Error('invalid_download_recording');
 if(value.hits.some(hit=>!Number.isInteger(hit.number)||hit.number<1||hit.number>25||!Number.isFinite(hit.atMs)))throw Error('invalid_download_hits');
 return value;
}
function mount(value){
 recording=validate(value);index=0;
 const root=document.getElementById('cookie-roulette');
 if(!driver){
  rouletteDriver?.dispose?.();
  root.querySelector('.a8-pocket-grid').replaceChildren();
  driver=createCookieRoulette(root,{onLaunch(){},onNumber(){},getAllClearNumbers:rouletteAllClearNumbers,getReachTiers:rouletteReachTiers,getSelectedBoard:rouletteSelectedBoard},THREE,CANNON);
  driver.setPaused(true);rouletteDriver=driver;
 }
 root.dataset.rouletteSource='download-recording';
 root.querySelector('.a8-loading').hidden=true;
 const retry=document.getElementById('roulette-retry');if(retry)retry.hidden=true;
 renderAt(0);return driver;
}
function renderAt(milliseconds){
 if(!driver||!recording)return false;
 const t=Math.max(0,Math.min(recording.durationMs,Number(milliseconds)||0)),frames=recording.frames;
 while(index>0&&frames[index][0]>t)index--;
 while(index+1<frames.length&&frames[index+1][0]<=t)index++;
 // Render immutable captured transforms. No physics, random number or input
 // is consulted, including after pause, resize, hidden tab or reconnect.
 driver.applyRecordedFrame(frames[index],recording.hits.filter(hit=>hit.atMs<=frames[index][0]));return true;
}
function dispose(){driver?.dispose?.();if(rouletteDriver===driver)rouletteDriver=null;driver=null;recording=null;index=0;}
window.SweetsDownloadRouletteV255={version:255,mount,renderAt,dispose,validate,get driver(){return driver;},get recording(){return recording;}};
})();

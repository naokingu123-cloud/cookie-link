/* Versioned offline shell. Private API replies and tickets never enter this cache. */
(()=>{
'use strict';
const VERSION='20261125-v301-waffle-atelier',CACHE='sweets-download-assets-'+VERSION;
const base=new URL('./',location.href),manifestUrl=new URL('assets/download-assets-v255.json',base),marker=new URL('__download_ready_v255__',base).href;
let task=null,progress={ready:false,done:0,total:0,bytes:0,totalBytes:0,version:VERSION};
const hex=buffer=>[...new Uint8Array(buffer)].map(value=>value.toString(16).padStart(2,'0')).join('');
function notify(onProgress){const snapshot={...progress};onProgress?.(snapshot);window.dispatchEvent(new CustomEvent('sweets:download-cache',{detail:snapshot}));}
async function ready(){
 try{
  if(!('caches' in window))return false;
  const cache=await caches.open(CACHE),response=await cache.match(marker);
  if(!response)return false;
  const saved=await response.json();if(saved.version!==VERSION)return false;
  const entries=await cache.keys();if(entries.length<saved.files+2)return false;
  progress={...progress,...saved,ready:true,done:saved.files,total:saved.files,bytes:saved.bytes,totalBytes:saved.bytes};return true;
 }catch{return false;}
}
async function prepare({onProgress}={}){
 if(task){notify(onProgress);return task;}
 task=(async()=>{
  if(!window.isSecureContext||!navigator.serviceWorker||!window.caches||!crypto.subtle)throw Error('オフライン保存にはHTTPSで開いてください。');
  const registration=await navigator.serviceWorker.register(new URL('download-sw-v255.js',base),{scope:base.pathname,updateViaCache:'none'});
  await navigator.serviceWorker.ready;
  const cache=await caches.open(CACHE);
  let manifestResponse;
  try{manifestResponse=await fetch(manifestUrl,{cache:'no-store',signal:AbortSignal.timeout(30000)});if(!manifestResponse.ok)throw Error('asset_manifest_http_'+manifestResponse.status);}
  catch(error){manifestResponse=await cache.match(manifestUrl.href);if(!manifestResponse)throw error;}
  const manifest=await manifestResponse.clone().json();
  if(manifest.version!==VERSION||!Array.isArray(manifest.files)||manifest.files.some(file=>!/^([a-zA-Z0-9._-]+\/)*[a-zA-Z0-9._-]+$/.test(file.path)||file.path.startsWith('api/')))throw Error('ダウンロード資産の版が一致しません。オンラインで再読み込みしてください。');
  await cache.put(manifestUrl.href,manifestResponse);
  progress={ready:false,version:VERSION,done:0,total:manifest.files.length,bytes:0,totalBytes:manifest.files.reduce((n,file)=>n+file.bytes,0)};notify(onProgress);
  let cursor=0,failed=null;
  async function download(){
   while(!failed&&cursor<manifest.files.length){
    const file=manifest.files[cursor++],url=new URL(file.path,base).href;
    try{
     const existing=await cache.match(url);
     if(existing?.headers.get('x-sweets-sha256')!==file.sha256){
      const response=await fetch(url,{cache:'reload',signal:AbortSignal.timeout(90000)});
      if(!response.ok)throw Error('HTTP '+response.status+' '+file.path);
      const bytes=await response.arrayBuffer();
      if(bytes.byteLength!==file.bytes||hex(await crypto.subtle.digest('SHA-256',bytes))!==file.sha256)throw Error('ファイル検証に失敗しました: '+file.path);
      const headers=new Headers(response.headers);headers.delete('content-encoding');headers.delete('content-length');headers.set('x-sweets-sha256',file.sha256);
      await cache.put(url,new Response(bytes,{status:200,headers}));
     }
     progress.done++;progress.bytes+=file.bytes;progress.path=file.path;notify(onProgress);
    }catch(error){failed=error;}
   }
  }
  await Promise.all(Array.from({length:4},download));
  if(failed)throw failed;
  const saved={ready:true,version:VERSION,files:manifest.files.length,bytes:progress.totalBytes,savedAt:Date.now()};
  await cache.put(marker,new Response(JSON.stringify(saved),{headers:{'content-type':'application/json'}}));
  progress={...progress,...saved};notify(onProgress);
  try{await navigator.storage?.persist?.();}catch{}
  // Claiming is asynchronous; the initial page may finish without a reload.
  registration.active?.postMessage({type:'download-cache-ready',version:VERSION});return saved;
 })().finally(()=>{task=null;});return task;
}
window.SweetsDownloadCacheV255={version:VERSION,prepare,ready,status:()=>({...progress})};
})();

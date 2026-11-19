/* Only public, version-verified app files are stored here. Never cache APIs,
 * authorization, profile data, admin pages, or prepared private game packages. */
'use strict';
const VERSION='20261119-v255-download-edition',CACHE='sweets-download-assets-'+VERSION;
const base=new URL('./',self.location.href),marker=new URL('__download_ready_v255__',base).href;
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('message',event=>{if(event.data?.type==='download-cache-ready')event.waitUntil(self.clients.claim());});
async function range(response,header){
 if(!header)return response;
 const match=/^bytes=(\d*)-(\d*)$/.exec(header);if(!match)return response;
 const buffer=await response.arrayBuffer(),length=buffer.byteLength;
 let start=match[1]?Number(match[1]):Math.max(0,length-Number(match[2])),end=match[1]&&match[2]?Math.min(length-1,Number(match[2])):length-1;
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>end||start>=length)return new Response(null,{status:416,headers:{'content-range':'bytes */'+length}});
 const headers=new Headers(response.headers);headers.set('content-range',`bytes ${start}-${end}/${length}`);headers.set('content-length',String(end-start+1));headers.set('accept-ranges','bytes');
 return new Response(buffer.slice(start,end+1),{status:206,headers});
}
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==base.origin||!url.pathname.startsWith(base.pathname))return;
 const relative=url.pathname.slice(base.pathname.length);
 if(relative==='app-version.json'||relative==='shared-endpoint.json'||relative.startsWith('api/')||relative.startsWith('ws')||relative.includes('monitor')||relative.includes('server')||relative.endsWith('.mjs'))return;
 const allowed=relative===''||relative==='index.html'||relative.startsWith('assets/')||relative.startsWith('optimized/');if(!allowed)return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE),key=new URL(relative===''?'index.html':relative,base).href;
  const client=event.clientId?await self.clients.get(event.clientId):null;
  const pageUrl=new URL(request.mode==='navigate'?request.url:client?.url||base.href);
  const download=pageUrl.searchParams.get('edition')==='download';
  const version=pageUrl.searchParams.get('appv');
  const pinned=download&&(!version||version===VERSION)&&!!await cache.match(marker);
  if(pinned&&request.cache!=='reload'){const cached=await cache.match(key);if(cached)return range(cached,request.headers.get('range'));}
  try{return await fetch(request);}
  catch(error){
   if(version&&version!==VERSION)throw error;
   const cached=await cache.match(key);if(cached)return range(cached,request.headers.get('range'));throw error;
  }
 })());
});

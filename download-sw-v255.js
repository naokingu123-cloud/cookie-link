/* Only public, version-verified app files are stored here. Never cache APIs,
 * authorization, profile data, admin pages, or prepared private game packages. */
'use strict';
const VERSION='20261124-v298-winery-crystal',LEGACY_VERSIONS=['20261124-v297-gelato-prism','20261124-v296-sixdrop-candy-atelier','20261124-v295-fruit-canyon','20261124-v294-wide-main-playfields','20261124-v293-cookie-patisserie','20261124-v292-sixdrop-clear-illustration','20261123-v291-illustrated-png-awards','20261123-v290-themed-awards-ambient-lines','20261121-v289-canyon-fruit-sixdrop-fixed-palette','20261121-v288-dango-jelly-pale-glow','20261121-v287-dango-probability-payouts','20261121-v286-dango-cyan-mochi-green-hit','20261121-v285-dango-plus-free-and-board','20261121-v284-sixdrop-compact-200-rtp','20261121-v283-single-hit-and-fixed-sixdrop-layout','20261120-v278-sixdrop-bottle-and-carry','20261120-v277-illustrated-awards-and-sound','20261120-v276-hit-and-roulette-polish-r2','20261120-v276-hit-and-roulette-polish','20261120-v275-illustrated-board-pieces','20261120-v274-ornate-game-art','20261120-v273-cartoon-game-art','20261120-v272-cartoon-game-art','20261120-v271-sugar-jpc-ten-percent','20261120-v270-dango-sugar-art','20261120-v269-dango-layout','20261119-v268-dango-sugar','20261119-v266-contested-free','20261119-v265-individual-free','20261119-v264-line-free','20261119-v263-dango-balanced','20261119-v262-dango-payout','20261119-v262-dango-trial','20261119-v258-local-debug-edition','20261119-v255-download-edition','20261119-v256-download-connect','20261119-v257-download-identity'],CACHE='sweets-download-assets-'+VERSION;
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
  const key=new URL(relative===''?'index.html':relative,base).href;
  const client=event.clientId?await self.clients.get(event.clientId):null;
  const pageUrl=new URL(request.mode==='navigate'?request.url:client?.url||base.href);
  const download=pageUrl.searchParams.get('edition')==='download';
  const version=pageUrl.searchParams.get('appv');
  // Existing v255 games keep their own shell; v256 has a separate cache.
  const cacheVersion=LEGACY_VERSIONS.includes(version)?version:VERSION;
  const cache=await caches.open('sweets-download-assets-'+cacheVersion);
  const pinned=download&&(!version||version===VERSION||LEGACY_VERSIONS.includes(version))&&!!await cache.match(marker);
  if(pinned&&request.cache!=='reload'){const cached=await cache.match(key);if(cached)return range(cached,request.headers.get('range'));}
  try{return await fetch(request);}
  catch(error){
   if(version&&version!==VERSION&&!LEGACY_VERSIONS.includes(version))throw error;
   const cached=await cache.match(key);if(cached)return range(cached,request.headers.get('range'));throw error;
  }
 })());
});

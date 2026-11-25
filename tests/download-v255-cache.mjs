// Execute the production Service Worker's fetch handler without network or a
// browser. The real browser suite covers registration/cache installation.
import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=await fs.readFile(new URL('../download-sw-v255.js',import.meta.url),'utf8');
const build=JSON.parse(await fs.readFile(new URL('../app-version.json',import.meta.url),'utf8')).version;
for(const pathname of ['/','/cookie-link/'])for(const version of [build,'20261125-v301-paytable-fit','20261124-v294-wide-main-playfields','20261124-v293-cookie-patisserie','20261124-v292-sixdrop-clear-illustration','20261123-v291-illustrated-png-awards','20261120-v270-dango-sugar-art','20261120-v269-dango-layout','20261119-v268-dango-sugar','20261119-v262-dango-trial','20261119-v258-local-debug-edition','20261119-v257-download-identity','20261119-v256-download-connect','20261119-v255-download-edition']){
 const origin='https://offline.fixture',base=origin+pathname,cache=new Map(),events={},network=[],opened=[];
 const pageUrl=base+'?edition=download&appv='+version;
 const put=(relative,body,type='text/plain')=>cache.set(base+relative,new Response(body,{headers:{'content-type':type}}));
 put('__download_ready_v255__','{"ready":true}');
 put('index.html','cached index','text/html');
 put('assets/client.js','cached code','text/javascript');
 put('assets/audio/test.mp3',new Uint8Array([0,1,2,3,4,5,6,7,8,9]),'audio/mpeg');
 const context=vm.createContext({URL,Response,Headers,Number,console,
  self:{location:{href:base+'download-sw-v255.js'},addEventListener:(name,fn)=>events[name]=fn,
   clients:{get:async()=>({url:pageUrl}),claim:async()=>{}},skipWaiting:async()=>{}},
  caches:{open:async name=>{opened.push(name);return {match:async key=>cache.get(typeof key==='string'?key:key.url)?.clone()};}},
  fetch:async request=>{network.push(request.url);throw Error('offline');}
 });
 vm.runInContext(source,context,{filename:'download-sw-v255.js'});
 async function get(relative,{method='GET',navigate=false,range='',auth=false}={}){
  let promise;
  const request={url:new URL(relative,base).href,method,mode:navigate?'navigate':'cors',cache:'default',
   headers:new Headers({...(range?{range}:{}),...(auth?{Authorization:'Bearer PRIVATE'}:{})})};
  events.fetch({request,clientId:'test',respondWith:value=>promise=value});
  return promise?await promise:null;
 }
 assert.equal(await(await get('./?edition=download&appv='+version,{navigate:true})).text(),'cached index');
 assert.equal(await(await get('index.html?edition=download&appv='+version,{navigate:true})).text(),'cached index');
 assert.equal(await(await get('assets/client.js?v=255')).text(),'cached code');
 for(const relative of ['api/machines/public-01/download-v255/active','app-version.json?t=1','shared-endpoint.json','monitor.html','assets/server-payout-control-v3.js','server.mjs','https://external.fixture/api/session']){
  assert.equal(await get(relative,{auth:true}),null,pathname+relative+' must bypass the asset cache');
 }
 assert.equal(await get('assets/client.js',{method:'POST'}),null);
 for(const [range,start,end] of [['bytes=2-5',2,5],['bytes=6-',6,9],['bytes=-3',7,9],['bytes=0-99',0,9]]){
  const response=await get('assets/audio/test.mp3',{range});
  assert.equal(response.status,206);assert.equal(response.headers.get('content-range'),`bytes ${start}-${end}/10`);
  assert.equal(response.headers.get('content-length'),String(end-start+1));assert.equal(response.headers.get('content-type'),'audio/mpeg');
  assert.deepEqual([...new Uint8Array(await response.arrayBuffer())],Array.from({length:end-start+1},(_,i)=>start+i));
 }
 assert.equal((await get('assets/audio/test.mp3',{range:'bytes=10-'})).status,416);
 assert.equal((await get('assets/audio/test.mp3',{range:'bytes=-0'})).status,416);
 assert.equal(network.length,0,'pinned shell/audio must not attempt a network request');
 assert(opened.includes('sweets-download-assets-'+version),'pinned edition selects its original cache');
}
console.log('Download v255 cache: root/subpath offline navigation, private/API exclusion and bounded/open/suffix audio ranges passed');

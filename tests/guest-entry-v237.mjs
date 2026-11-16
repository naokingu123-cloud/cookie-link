import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const load=p=>fs.readFile(new URL('../'+p,import.meta.url),'utf8');
const release=JSON.parse(await load('app-version.json')).version.match(/-v(\d+)-/)?.[1];
assert.ok(release&&Number(release)>=237,'app release version is present');
const [entry,core,p221,p224,loader,station,endpoint]=await Promise.all([
 'assets/guest-entry-v237.js','assets/shared-machine-core-v196.js','assets/shared-core-patch-v221.js','assets/shared-core-patch-v224.js','assets/shared-machine-v176.js','assets/stations-v235.js','shared-endpoint.json'
].map(load));
function context({denied=false,quota=false,fetcher}={}){
 const values=new Map(),calls=[];
 const c={URL,URLSearchParams,AbortController,setTimeout,clearTimeout,console,Map,
  location:new URL('https://naokingu123-cloud.github.io/cookie-link/'),
  localStorage:{getItem(k){if(denied)throw Error('denied');return values.get(k)??null;},setItem(k,v){if(denied||quota)throw Error('quota');values.set(k,v);}},
  fetch:async(...args)=>{calls.push(args);return fetcher?fetcher(...args):{ok:true,json:async()=>JSON.parse(endpoint)};}
 };c.window=c;vm.createContext(c);vm.runInContext(entry,c);return {c,values,calls,api:c.SweetsGuestEntryV237};
}
const h=context(),a=h.api;
assert.equal(a.DEFAULT_SERVER,JSON.parse(endpoint).server,'fallback must match current deployment');
assert.equal(await a.discover(),a.DEFAULT_SERVER);
assert.equal(h.calls[0][1].credentials,'omit');
assert.match(h.calls[0][0],/cookie-link\/shared-endpoint.json\?_=/);
h.values.set('sweets-shared-machine-v176','previous-private-room');
assert.equal(a.machine(new URLSearchParams(),false),'public-01');
assert.equal(a.machine(new URLSearchParams('machine=room2'),false),'room2');
assert.equal(a.machine(new URLSearchParams(),true),'previous-private-room');
const canonical='https://naokingu123-cloud.github.io/cookie-link/';
assert.equal(a.shareUrl(),canonical);
assert.equal(a.shareUrl('public-01',a.DEFAULT_SERVER),canonical);
assert.ok(!a.shareUrl().includes('token'));
assert.equal(new URL(a.shareUrl('two','https://custom.example')).searchParams.get('machine'),'two');
assert.ok(!a.shareUrl('public-01','https://user:secret@custom.example').includes('secret'));
for(const value of ['javascript:alert(1)','https://user:pw@evil.example','https://evil.example/?token=x'])await assert.rejects(a.discover({explicit:value}),/invalid_shared_server/);
assert.equal(await a.discover({sameOrigin:true,origin:'http://127.0.0.1:3000'}),'http://127.0.0.1:3000');
const slow=context({fetcher:()=>new Promise(()=>{})});
assert.equal(await slow.api.discover({timeoutMs:10}),a.DEFAULT_SERVER,'first-ever device recovers when manifest fetch hangs');
const bad=context({fetcher:async()=>({ok:true,json:async()=>({server:'http://192.168.1.3',machine:'public-01'})})});
assert.equal(await bad.api.discover(),a.DEFAULT_SERVER);
const changed=context({fetcher:async()=>({ok:true,json:async()=>({server:'https://new.example',machine:'public-01'})})});
assert.equal(await changed.api.discover(),'https://new.example','fresh configuration overrides bundled fallback');
assert.equal(await bad.api.discover({machine:'other'}),'');
for(const options of [{},{denied:true},{quota:true}]){
 const t=context(options),key='sweets-shared-session-v176',identity={playerId:'existing',token:'private'};
 t.api.writeSession(key,a.DEFAULT_SERVER,identity);
 assert.equal(t.api.readSession(key,a.DEFAULT_SERVER).playerId,'existing');
 assert.equal(t.api.readSession(key,'https://unrelated.example').token,undefined,'credentials never forwarded to another server');
 t.api.writeSession(key,'http://localhost:3000',identity,true);
 assert.equal(t.api.readSession(key,'http://localhost:3000',true).playerId,'existing');
}
a.write('sweets-shared-session-v176',{playerId:'legacy-player',token:'legacy-token'});
assert.equal(a.readSession('sweets-shared-session-v176',a.DEFAULT_SERVER).playerId,'legacy-player','existing public identity retained');
vm.runInContext(p221,h.c);vm.runInContext(p224,h.c);
const patched=a.patch(h.c.SweetsSharedCorePatchV224.patch(core));
new vm.Script(patched);
assert.match(patched,/SweetsGuestEntryV237\.readSession\(SESSION_KEY,BASE,SERVER_HOST\)/);
assert.match(patched,/body:\{playerId:this.playerId,displayName\}/,'automatic server-issued guest registration remains unchanged');
assert.match(patched,/if\(SERVER_HOST\)\{const host=await this.registerHost\(\)/,'guest never registers as the physical host');
assert.ok(loader.includes('guest-entry-v237.js?v='+release));
assert.ok(loader.includes('SweetsGuestEntryV237.patch('));
new vm.Script(a.patchStations(station));
assert.throws(()=>a.patch('different core'),/source drift/);
console.log('PUBLIC_GUEST_ENTRY_V237_PASS: bare link, fresh storage, bounded discovery, private session reuse and host separation');

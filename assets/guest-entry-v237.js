/* Public invitation entry. No password, shared player token, or admin privilege. */
(function(root){
'use strict';
if(root.SweetsGuestEntryV237)return;
const PLAYER_URL='https://naokingu123-cloud.github.io/cookie-link/';
const DEFAULT_SERVER='https://sweets.sweetslink-game.com',DEFAULT_MACHINE='public-01';
const memory=new Map();
function get(key,fallback=''){
 try{const value=root.localStorage.getItem(key);if(value!==null){memory.set(key,value);return value;}}catch{}
 return memory.has(key)?memory.get(key):fallback;
}
function set(key,value){
 const text=String(value);memory.set(key,text);
 try{root.localStorage.setItem(key,text);}catch{}
}
function read(key,fallback){try{return JSON.parse(get(key,''))??fallback;}catch{return fallback;}}
function write(key,value){set(key,JSON.stringify(value));}
function cleanMachine(value){return String(value||'').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,64)||DEFAULT_MACHINE;}
function machine(query,sameOrigin){
 // A plain invitation always opens the public room, never a recipient's stale room.
 return cleanMachine(query.get('machine')||(sameOrigin?get('sweets-shared-machine-v176'):DEFAULT_MACHINE));
}
function serverOrigin(value,allowHttp=false){
 try{
  const u=new URL(String(value||''));
  if(u.username||u.password||u.search||u.hash||u.pathname!=='/')return '';
  if(u.protocol!=='https:'&&!(allowHttp&&u.protocol==='http:'))return '';
  return u.origin;
 }catch{return '';}
}
async function discover({explicit='',sameOrigin=false,origin='',machine:room=DEFAULT_MACHINE,timeoutMs=5000}={}){
 if(explicit){const server=serverOrigin(explicit,root.location?.protocol==='http:');if(!server)throw Error('invalid_shared_server');return server;}
 if(sameOrigin)return serverOrigin(origin,true);
 const controller=new AbortController();let timer;
 try{
  const url=new URL('shared-endpoint.json',root.location.href);url.searchParams.set('_',String(Date.now()));
  const load=(async()=>{
   const response=await root.fetch(url.href,{cache:'no-store',credentials:'omit',signal:controller.signal});
   if(!response.ok)return '';
   const data=await response.json();
   return cleanMachine(data?.machine)===room?serverOrigin(data?.server):'';
  })();
  const timeout=new Promise(resolve=>{timer=setTimeout(()=>{controller.abort();resolve('');},timeoutMs);});
  const server=await Promise.race([load,timeout]);if(server)return server;
 }catch{}finally{clearTimeout(timer);}
 // Only the published public service may be a fallback for a bare link.
 // Never silently send saved credentials to a stale/local cached endpoint.
 return room===DEFAULT_MACHINE?DEFAULT_SERVER:'';
}
function sessionKey(key,server,host){return host?key:key+'@'+String(server);}
function readSession(key,server,host=false){
 const scoped=read(sessionKey(key,server,host),null);if(scoped)return scoped;
 // Preserve existing public players when upgrading, without sharing identity
 // with a different server supplied in another invitation.
 if(!host&&server===DEFAULT_SERVER){const legacy=read(key,null);if(legacy?.playerId&&legacy?.token){writeSession(key,server,legacy);return legacy;}}
 return {};
}
function writeSession(key,server,value,host=false){write(sessionKey(key,server,host),value);}
function shareUrl(room=DEFAULT_MACHINE,server=''){
 const url=new URL(PLAYER_URL),id=cleanMachine(room),base=serverOrigin(server);
 if(id!==DEFAULT_MACHINE)url.searchParams.set('machine',id);
 if(base&&base!==DEFAULT_SERVER)url.searchParams.set('sharedServer',base);
 return url.href;
}
function patch(source){
 const once=(before,after,label)=>{if(source.split(before).length!==2)throw Error('[GuestEntry237] source drift: '+label);source=source.replace(before,after);};
 once("const MACHINE=String(query.get('machine')||localStorage.getItem(MACHINE_KEY)||'public-01').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,64)||'public-01';",
  'const MACHINE=window.SweetsGuestEntryV237.machine(query,sameOriginServer);','default room');
 const start=source.indexOf('async function resolveServerBase(){'),end=source.indexOf('// v180 server-only client:',start);
 if(start<0||end<start)throw Error('[GuestEntry237] discovery boundary');
 source=source.slice(0,start)+`async function resolveServerBase(){
 BASE=await window.SweetsGuestEntryV237.discover({explicit,sameOrigin:sameOriginServer,origin:location.origin,machine:MACHINE});
 if(BASE)window.SweetsGuestEntryV237.set(SERVER_KEY,BASE);
 return BASE;
}
`+source.slice(end);
 once("const read=(key,fallback)=>{try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback;}catch{return fallback;}};",
  'const read=(key,fallback)=>window.SweetsGuestEntryV237.read(key,fallback);','storage read');
 once('const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{}};',
  'const write=(key,value)=>window.SweetsGuestEntryV237.write(key,value);','storage write');
 once("const saved=read(SESSION_KEY,{});let profileName='';",
  "const saved=window.SweetsGuestEntryV237.readSession(SESSION_KEY,BASE,SERVER_HOST);let profileName='';",'guest session');
 once('write(SESSION_KEY,{playerId:this.playerId,token:this.token,displayName:session.player.displayName});',
  'window.SweetsGuestEntryV237.writeSession(SESSION_KEY,BASE,{playerId:this.playerId,token:this.token,displayName:session.player.displayName},SERVER_HOST);','save identity');
 return source;
}
function patchStations(source){
 const before="localStorage.getItem('sweets-shared-machine-v176')";
 return source.replace(before,"window.SweetsGuestEntryV237.get('sweets-shared-machine-v176')");
}
root.SweetsGuestEntryV237={PLAYER_URL,DEFAULT_SERVER,DEFAULT_MACHINE,get,set,read,write,machine,discover,readSession,writeSession,shareUrl,patch,patchStations};
})(typeof window!=='undefined'?window:globalThis);

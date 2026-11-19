/* Verify player ownership without a live public account. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const source=await fs.readFile(new URL('../assets/download-mode-v255.js',import.meta.url),'utf8');
const helper=source.slice(source.indexOf('async function negotiateSession('),source.indexOf('async function initialize('));
assert(helper.startsWith('async function negotiateSession('));
let legacy={playerId:'original-player',token:'legacy-token'},calls=[];
const replies=new Map();
const context={
 playerId:'original-player',token:'original-secret',pack:null,base:'https://sweets.sweetslink-game.com',
 G:{DEFAULT_SERVER:'https://sweets.sweetslink-game.com',read:(key)=>key==='sweets-shared-session-v176'?legacy:null},
 initialProfile:{name:'NEW'},
 api:async(action,options={})=>{
  calls.push({action,options,playerId:context.playerId,token:context.token});
  if(action==='profile'){
   const reply=replies.get(context.playerId+':'+context.token);
   if(!reply)throw Object.assign(Error('unauthorized'),{status:401});
   return reply;
  }
  if(options.sessionEndpoint&&options.method==='POST')return {player:{id:'new-player',displayName:'NEW'},token:'new-token'};
  throw Error('unexpected_api_call');
 }
};
vm.runInNewContext(helper+';globalThis.negotiateSessionTest=negotiateSession;',context);
const negotiate=context.negotiateSessionTest;
replies.set('original-player:original-secret',{playerId:'original-player',profile:{name:'PERSISTED'},wallet:{credit:6789}});
let result=await negotiate({playerId:'original-player',token:'original-secret'});
assert.equal(result.identity.player.id,'original-player');assert.equal(result.profile.wallet.credit,6789);
assert.equal(calls.some(c=>c.options.sessionEndpoint),false,'existing login never creates another player');
replies.delete('original-player:original-secret');
replies.set('original-player:legacy-token',{playerId:'original-player',profile:{name:'LEGACY'},wallet:{credit:1234}});
result=await negotiate({playerId:'original-player',token:'original-secret'});
assert.equal(result.identity.player.id,'original-player');assert.equal(result.profile.wallet.credit,1234);
assert.equal(context.playerId,'original-player');assert.equal(context.token,'legacy-token');assert.equal(calls.some(c=>c.options.sessionEndpoint),false);
context.playerId='original-player';context.token='original-secret';replies.delete('original-player:legacy-token');
await assert.rejects(negotiate({playerId:'original-player',token:'original-secret'}),/download_identity_invalid/);
assert.equal(context.playerId,'original-player');assert.equal(context.token,'original-secret');assert.equal(calls.some(c=>c.options.sessionEndpoint),false);
legacy={playerId:'different-player',token:'different-token'};
replies.set('different-player:different-token',{playerId:'different-player',wallet:{credit:9999}});
await assert.rejects(negotiate({playerId:'original-player',token:'original-secret'}),/download_identity_invalid/);
assert.equal(context.playerId,'original-player','different valid player must not be silently substituted');
await assert.rejects(negotiate({playerId:'original-player',token:''}),/download_identity_incomplete/);
context.playerId='';context.token='';
result=await negotiate({});assert.equal(result.identity.player.id,'new-player');
assert.equal(calls.filter(c=>c.options.sessionEndpoint).length,1,'brand-new devices can create once');
context.playerId='original-player';context.token='original-secret';context.pack={sessionId:'saved-round'};
await assert.rejects(negotiate({playerId:'original-player',token:'original-secret'}),/unauthorized/);
assert.equal(context.playerId,'original-player','unfinished recording cannot migrate to another identity');
assert.equal(calls.filter(c=>c.options.sessionEndpoint).length,1);
console.log('v257 Download session ownership, legacy fallback, explicit new registration PASS');

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

// Run the actual index loader, including its source transformations and await
// boundaries. The fake DOM captures the final script instead of executing the
// full UI. This catches a late Waffle install resetting an already-started game.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const files=new Map();
const source=file=>{
 if(!files.has(file))files.set(file,fs.readFileSync(path.join(root,file),'utf8'));
 return files.get(file);
};
const html=source('index.html');
const loader=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
 .map(match=>match[1]).find(code=>code.includes('const responses=await Promise.all(common.concat(extras)'));
assert(loader,'the real index game loader must be found');
const WAFFLE='assets/waffle-pow-v159.js';
const SHARED='assets/shared-machine-v176.js';
const ALL=['cookie','choco','candy','gelato','winery','popcorn','stick','castella','jelly'];
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};};
const flush=()=>new Promise(resolve=>setImmediate(resolve));

function fixture({chosen=ALL,search='?set=all',edition='streaming',holdWaffle=false,failWaffle=false}={}){
 const fetchGate=deferred(),bodyGate=deferred();
 const requests=[],scripts=[],alerts=[],errors=[],warnings=[];
 let waffleTextCalls=0;
 const element=tag=>({tagName:tag.toUpperCase(),style:{},textContent:'',setAttribute(){},remove(){}});
 const switcher=element('a');
 const location=new URL('https://fixture.invalid/'+search);
 const context={URL,URLSearchParams,location,SweetsLineup:{mode:'all',chosen:[...chosen]},SweetsEditionV255:{value:edition},
  console:{info(){},warn:(...args)=>warnings.push(args),error:(...args)=>errors.push(args)},
  document:{
   getElementById:id=>{assert.equal(id,'lineup-link');return switcher;},
   createElement:element,
   body:{appendChild(node){
    if(node.tagName==='SCRIPT')scripts.push(node.textContent);
    else alerts.push(node);
    return node;
   }}
  },
  fetch:async(url,options)=>{
   const file=String(url).split('?')[0];
   requests.push({file,url:String(url),options});
   if(file===WAFFLE&&holdWaffle)await fetchGate.promise;
   return {ok:!(file===WAFFLE&&failWaffle),text:async()=>{
    if(file===WAFFLE){waffleTextCalls++;if(holdWaffle)await bodyGate.promise;}
    return source(file);
   }};
  }
 };
 context.window=context;vm.createContext(context);
 vm.runInContext(source('assets/cookie-upgrade-patches.js'),context,{filename:'cookie-upgrade-patches.js'});
 vm.runInContext(source('assets/client-render-patch-v246.js'),context,{filename:'client-render-patch-v246.js'});
 const done=vm.runInContext(loader,context,{filename:'index.html:game-loader'});
 return {done,requests,scripts,alerts,errors,warnings,fetchGate,bodyGate,get waffleTextCalls(){return waffleTextCalls;}};
}

function validateAssembly(fixture,{withWaffle=true}={}){
 assert.deepEqual(fixture.errors,[],'the real loader must finish without its catch path');
 assert.equal(fixture.alerts.length,0);
 assert.equal(fixture.scripts.length,1,'boot must insert exactly one combined game script');
 const assembled=fixture.scripts[0];
 // Parsing the actual source catches private-scope declaration conflicts while
 // avoiding WebGL, animation timers, server connections, and the full DOM.
 new vm.Script(assembled,{filename:'index.html:assembled-game'});
 const position=file=>{
  const found=assembled.indexOf(source(file));
  assert(found>=0,file+' must be in the combined private-scope script');
  return found;
 };
 const shared=position(SHARED);
 for(const request of fixture.requests){
  assert.equal(request.options.cache,'no-store');
  if(request.file.startsWith('assets/')&&request.file!==SHARED)
   assert(position(request.file)<shared,request.file+' must finish installing before shared startup');
 }
 if(withWaffle){
  const rules=position('assets/bingo-stick-rules.js');
  const host=position('assets/bingo-stick-host.js');
  const lesson=position('assets/waffle-lesson.js');
  const patch=position(WAFFLE);
  assert(rules<host&&host<lesson&&lesson<patch&&patch<shared,
   'Waffle rules, host, lesson, and payout patch must install before shared startup');
  assert.equal(fixture.requests.filter(request=>request.file===WAFFLE).length,1);
 }else{
  assert(!fixture.requests.some(request=>request.file===WAFFLE));
  assert(!assembled.includes(source(WAFFLE)));
 }
 return assembled;
}

// Choosing an edition is an intentional boot boundary, not a failed fetch.
{
 const f=fixture({edition:null});await f.done;
 assert.deepEqual(f.requests,[]);assert.deepEqual(f.scripts,[]);assert.deepEqual(f.errors,[]);assert.deepEqual(f.alerts,[]);
}

for(const [name,search] of [['client','?set=all'],['settlement worker','?set=all&serverSettlementWorker=1']]){
 const f=fixture({search,holdWaffle:true});
 await flush();
 assert(f.requests.some(request=>request.file===WAFFLE),name+': Waffle must be a required index fetch');
 assert.equal(f.scripts.length,0,name+': shared boot must wait for the delayed Waffle HTTP response');
 assert.equal(f.waffleTextCalls,0);
 f.fetchGate.resolve();await flush();
 assert.equal(f.waffleTextCalls,1);
 assert.equal(f.scripts.length,0,name+': shared boot must also wait for the delayed Waffle response body');
 f.bodyGate.resolve();await f.done;
 const assembled=validateAssembly(f);
 for(const file of ['assets/gelato-prism-v28.js','assets/winery-pyramid-core-v1.js',
  'assets/popcorn-engine.js','assets/party-castella-rules.js','assets/jelly-rules.js'])
  assert(assembled.includes(source(file)),name+': '+file+' must use the current source');
 for(const marker of ['function debugCookieNumberOrder','const CHOCO_INITIAL_PATTERNS','SIX_START_GAP_TEMPLATES'])
  assert(assembled.includes(marker),name+': the current classic rules must survive source transformations');
}

// A missing required patch must not start an unpatched Waffle round.
{
 const f=fixture({chosen:['stick'],failWaffle:true});await f.done;
 assert(f.requests.some(request=>request.file===WAFFLE));
 assert.equal(f.scripts.length,0);
 assert.equal(f.alerts.length,1);
 assert.match(f.alerts[0].textContent,/ゲームの読み込みに失敗/);
 assert.equal(f.errors.length,1);
}

// Other lineups must not gain an unnecessary Waffle dependency.
{
 const f=fixture({chosen:['cookie','choco','candy'],search:'?set=classic'});await f.done;
 validateAssembly(f,{withWaffle:false});
}

// The old child loader could install or reset Waffle after shared startup even
// when script.async=false. Keep gameplay patches out of that external queue.
assert(!/['"]assets\/waffle-pow-v\d+\.js(?:\?[^'"]*)?['"]/.test(source('assets/game-menu-v91.js')),
 'game-menu must not append a second, asynchronous Waffle gameplay script');
console.log('v232 bootstrap: real index loader waits for Waffle response/body, ordered assembly parses, failed fetch blocks boot, client/worker/classic paths passed');

/* Shared recording/checkpoint contract. No transport, wallet writes or draws. */
(function(root){
'use strict';
if(root.SweetsRecordedRoundV255)return;
const VERSION=255,controllers=new WeakMap();
const CONTROL=new Set(['onEvent','onChange','beforeComplete','sleep','random','rng','view','canvas','ctx','context','storage','persistence','drawSource']);
const APP_FIELDS=['phase','bets','locked','enabled','paid','draws','roundWins','totalWin','wonderBank','wonderSteps','wonderValue','colorCount','dealing','fastForward','debugRainbowIssued','payout','result'];
const METHOD_NAMES=['reset','start','previewDraw','enqueueBatch','enqueue','setRainbowSugar','finishThinkingV251'];
const gameId=(app,index)=>String(root.SweetsLineup?.ids?.[index]||app.engines[index]?.kind||app.engines[index]?.id||'game-'+index);
function clone(value,seen=new WeakSet(),depth=0){
 if(value===null||typeof value==='string'||typeof value==='boolean')return value;
 if(typeof value==='number')return Number.isFinite(value)?value:{$number:String(value)};
 if(value===undefined||typeof value==='function'||typeof value==='symbol')return undefined;
 if(depth>40)throw Error('recorded_checkpoint_too_deep');
 if(typeof value!=='object'||(typeof Node!=='undefined'&&value instanceof Node))return undefined;
 if(seen.has(value))throw Error('recorded_checkpoint_cycle');seen.add(value);
 let result;
 if(value instanceof Map)result={$map:[...value].map(([k,v])=>[clone(k,seen,depth+1),clone(v,seen,depth+1)])};
 else if(value instanceof Set)result={$set:[...value].map(v=>clone(v,seen,depth+1))};
 else if(ArrayBuffer.isView(value)&&!(value instanceof DataView))result={$typed:value.constructor.name,values:Array.from(value)};
 else if(Array.isArray(value))result=value.map(v=>clone(v,seen,depth+1)??null);
 else if(Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null){result={};for(const [key,item] of Object.entries(value)){
  // Engine-level RNG providers are control objects, but a plain state's
  // numeric RNG cursor is deterministic game data needed by every refill.
  if((CONTROL.has(key)&&!(key==='rng'&&typeof item==='number'&&Number.isFinite(item)))||key.startsWith('__recorded'))continue;
  const saved=clone(item,seen,depth+1);if(saved!==undefined)result[key]=saved;
 }}
 seen.delete(value);return result;
}
function revive(value){
 if(value===null||typeof value!=='object')return value;
 if(Array.isArray(value))return value.map(revive);
 if(value.$number)return value.$number==='Infinity'?Infinity:value.$number==='-Infinity'?-Infinity:NaN;
 if(Array.isArray(value.$map))return new Map(value.$map.map(([k,v])=>[revive(k),revive(v)]));
 if(Array.isArray(value.$set))return new Set(value.$set.map(revive));
 if(value.$typed){const C=root[value.$typed];if(typeof C!=='function'||!/^((Int|Uint)(8|16|32)|Uint8Clamped|Float(32|64))Array$/.test(value.$typed))throw Error('recorded_typed_array_invalid');return new C(value.values||[]);}
 const result={};for(const [key,item] of Object.entries(value)){if(key==='__proto__'||key==='constructor'||key==='prototype')continue;result[key]=revive(item);}return result;
}
function engineSnapshot(engine){
 const data={};for(const key of Object.keys(engine)){
  if(CONTROL.has(key)||key==='paused'||key.startsWith('__recorded'))continue;
  const descriptor=Object.getOwnPropertyDescriptor(engine,key);if(descriptor?.get&&!descriptor.set)continue;
  const value=clone(engine[key]);if(value!==undefined)data[key]=value;
 }return data;
}
function capture(app,extra={}){
 const state={version:VERSION,gameIds:app.engines.map((_,i)=>gameId(app,i))};
 for(const key of APP_FIELDS)if(key in app)state[key]=clone(app[key]);
 state.credit=Number(app.credit)||0;state.displayCredit=Number(app.displayCredit)||0;
 state.engines=app.engines.map(engineSnapshot);
 const rng=controllers.get(app);if(rng)state.randomOffsets=rng.positions();
 const sugar=root.SweetsSugarChallengeV254?.snapshot?.();if(sugar)state.sugarV254=clone(sugar);
 return Object.assign(state,clone(extra)||{});
}
function writable(target,key){
 for(let object=target;object;object=Object.getPrototypeOf(object)){const descriptor=Object.getOwnPropertyDescriptor(object,key);if(descriptor)return !!descriptor.set||!!descriptor.writable;}
 return true;
}
function restore(app,state,{wallet=false,notify=true,random=true,invalidate=true}={}){
 if(!state||state.version!==VERSION||!Array.isArray(state.engines)||state.engines.length!==app.engines.length)throw Error('recorded_checkpoint_invalid');
 if(state.gameIds?.some((id,i)=>id!==gameId(app,i)))throw Error('recorded_checkpoint_lineup_mismatch');
 for(const key of APP_FIELDS)if(key in state)app[key]=revive(state[key]);
 if(wallet){app.credit=Number(state.credit)||0;app.displayCredit=Number(state.displayCredit)||0;}
 state.engines.forEach((saved,i)=>{
  const engine=app.engines[i],generation=Math.max(0,Number(engine.version)||0)+(invalidate?1:0);
  for(const [key,value] of Object.entries(saved)){if(CONTROL.has(key)||key==='paused'||key==='version'||key.startsWith('__recorded')||typeof engine[key]==='function'||!writable(engine,key))continue;engine[key]=revive(value);}
  if('version' in engine&&writable(engine,'version'))engine.version=generation;
 });
 if(random&&state.randomOffsets)controllers.get(app)?.seek(state.randomOffsets);
 // These hooks reconstruct view-local counters and invalidate pending completion
 // jobs. The caller starts the native round once before restoring a checkpoint.
 for(const engine of app.engines)engine.afterCheckpointRestoreV247?.();
 if(state.sugarV254)root.SweetsSugarChallengeV254?.accept?.(revive(state.sugarV254));
 if(notify)app.onChange?.(app);return true;
}
function hash(value){let n=2166136261;for(const ch of String(value)){n^=ch.charCodeAt(0);n=Math.imul(n,16777619);}return n>>>0;}
function seeded(seed){let value=seed>>>0;return()=>{value=(value+0x6D2B79F5)>>>0;let n=value;n=Math.imul(n^(n>>>15),n|1);n^=n+Math.imul(n^(n>>>7),n|61);return ((n^(n>>>14))>>>0)/4294967296;};}
function install(app,{seed,tapes,offsets}={}){
 controllers.get(app)?.dispose();
 const replay=!!tapes,ids=app.engines.map((_,i)=>gameId(app,i)),streams={},positions={},generators={},originals=[],nativeRandom=app.random;
 let context='app',disposed=false;
 for(const id of ['app',...ids]){streams[id]=replay?[...(tapes.streams?.[id]||[])]:[];positions[id]=0;generators[id]=seeded(hash(String(seed)+'/'+id));}
 function next(id){
  const index=positions[id]||0;let value;
  if(replay){if(index>=streams[id].length)throw Error('recorded_rng_exhausted:'+id+':'+index);value=streams[id][index];}
  else{value=generators[id]();streams[id].push(value);}
  if(!Number.isFinite(value)||value<0||value>=1)throw Error('recorded_rng_invalid:'+id+':'+index);
  positions[id]=index+1;return value;
 }
 app.random=()=>next(context);
 app.engines.forEach((engine,index)=>{
  const id=ids[index],hadRandom=Object.prototype.hasOwnProperty.call(engine,'random'),oldRandom=engine.random;
  engine.random=()=>next(id);originals.push(()=>{if(hadRandom)engine.random=oldRandom;else delete engine.random;});
  // Several native hosts call app.random synchronously in reset/start/draw.
  // Routing those calls by engine avoids interleaving different games' tapes.
  for(const name of METHOD_NAMES){const method=engine[name];if(typeof method!=='function')continue;const own=Object.prototype.hasOwnProperty.call(engine,name);
   engine[name]=function(...args){const before=context;context=id;try{return method.apply(this,args);}finally{context=before;}};
   originals.push(()=>{if(own)engine[name]=method;else delete engine[name];});
  }
 });
 const controller={
  version:VERSION,replay,
  positions:()=>({...positions}),
  seek(next){for(const id of ['app',...ids]){const value=Number(next?.[id]??0);if(!Number.isSafeInteger(value)||value<0||value>streams[id].length)throw Error('recorded_rng_offset_invalid:'+id);positions[id]=value;}return controller;},
  export:()=>({version:VERSION,gameIds:[...ids],streams:Object.fromEntries(Object.entries(streams).map(([id,list])=>[id,[...list]]))}),
  dispose(){if(disposed)return;disposed=true;for(const undo of originals.reverse())undo();app.random=nativeRandom;if(controllers.get(app)===controller)controllers.delete(app);}
 };
 controllers.set(app,controller);if(offsets)controller.seek(offsets);return controller;
}
function stable(app,ball=app.draws.length){
 return app.engines.every((engine,i)=>{
  if(app.enabled?.[i]===false)return true;
  const needed=engine.drawMode==='single'?ball:ball<3?0:ball<5?3:ball;
  return !engine.opening&&!engine.busy&&!engine.trace&&!engine.fx&&!(engine.queue?.length)&&(Number(engine.processed)||0)>=needed;
 });
}
root.SweetsRecordedRoundV255={version:VERSION,clone,revive,capture,restore,stable,gameId,installRecording:(app,options)=>install(app,options),installReplayTapes:(app,tapes,offsets)=>install(app,{tapes,offsets}),randomController:app=>controllers.get(app)||null};
})(typeof window!=='undefined'?window:globalThis);

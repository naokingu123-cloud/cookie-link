(()=>{
'use strict';
if(window.__sweetsSharedLoaderV185)return;
window.__sweetsSharedLoaderV185=true;
window.__sweetsPrecomputedRoundV174=true;

/*
 * Hard barrier installed synchronously inside the bundled game's lexical scope.
 * Until the shared/server client is ready, the local 8-ball roulette is never
 * allowed to start. The native physical start/reset are saved only for the
 * dedicated serverHost=1 page.
 */
try{
 if(typeof rouletteDrawSource!=='undefined'&&rouletteDrawSource&&!window.__sweetsSharedDrawBarrier){
  const nativeStart=rouletteDrawSource.start.bind(rouletteDrawSource);
  const nativeReset=rouletteDrawSource.reset.bind(rouletteDrawSource);
  const readyDescriptor=Object.getOwnPropertyDescriptor(rouletteDrawSource,'ready');
  const nativeReady=readyDescriptor?.get?readyDescriptor.get.bind(rouletteDrawSource):()=>true;
  const barrier={
   nativeStart,nativeReset,nativeReady,pending:null,installed:false,
   block(callbacks){this.pending=callbacks||null;try{nativeReset();}catch{}try{typeof stopAutoRound==='function'&&stopAutoRound();}catch{}try{typeof countdownText==='function'&&countdownText('SERVER','共有抽選 接続待ち');}catch{}},
   take(){const value=this.pending;this.pending=null;return value;}
  };
  window.__sweetsSharedDrawBarrier=barrier;
  window.__sweetsSharedClientReady=false;
  Object.defineProperty(rouletteDrawSource,'ready',{configurable:true,get:()=>window.__sweetsSharedClientReady===true});
  rouletteDrawSource.start=function(callbacks){barrier.block(callbacks);};
  rouletteDrawSource.reset=function(...args){barrier.pending=null;return nativeReset(...args);};
 }
}catch(error){console.error('[SharedMachineLoaderV185] barrier install failed',error);}

(async()=>{
 try{
  const response=await fetch('assets/shared-machine-v176.js?v=185',{cache:'no-store'});
  if(!response.ok)throw Error('shared-machine-v176.js '+response.status);
  const source=await response.text();
  eval(source);
 }catch(error){
  console.error('[SharedMachineLoaderV185] server client unavailable; local roulette stays blocked',error);
  try{
   window.__sweetsSharedDrawBarrier?.block(null);
   if(typeof countdownText==='function')countdownText('SERVER ERROR','共有抽選');
  }catch{}
 }
})();
})();

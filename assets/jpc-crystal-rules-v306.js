/* Crystal JPC: one accepted physical ball, one cumulative update. */
(function(root){
 'use strict';
 const config=Object.freeze({
  version:306,pocketCount:25,initialBalls:30,jpPocket:1,
  bonusPockets:Object.freeze([6,11,16,21]),bonuses:Object.freeze([1,1,4,8]),
  payouts:Object.freeze([0,1,2,3,4,6,8,10,15]),
  colors:Object.freeze(['#b9c7e8','#4097ff','#36d6ce','#43dc79','#b1e54c','#ffe34e','#ff9c39','#ff5468','#c178ff']),
  jpThreshold:5,jpMultiplierStep:5,referenceJP:500,hasDrawLimit:false,targetEV:251.70108590454686,
  jpProbability:.1642039746,meanDraws:68.1818181818
 });
 const validId=id=>Number.isSafeInteger(id)&&id>0;
 const validPocket=n=>Number.isInteger(n)&&n>=1&&n<=config.pocketCount;
 const pocketValue=hits=>config.payouts[Math.max(0,Math.min(8,Math.floor(Number(hits)||0)))];
 const pocketColor=hits=>config.colors[Math.max(0,Math.min(8,Math.floor(Number(hits)||0)))];
 function pocketKind(pocket){return pocket===config.jpPocket?'jp':config.bonusPockets.includes(pocket)?'bonus':'normal';}
 function bonusFor(pocket){const at=config.bonusPockets.indexOf(pocket);return at<0?0:config.bonuses[at];}
 function createSession(){
  return {version:306,counts:Array(25).fill(0),remaining:config.initialBalls,launched:0,landed:0,
   jpHits:0,base:0,payout:0,multiplier:1,jpMultiplier:0,bonusTotal:0,refunded:0,
   pending:Object.create(null),accepted:Object.create(null),history:[],revision:0};
 }
 function launch(state,id){
  if(!state||state.remaining<=0||!validId(id)||state.pending[id]||state.accepted[id])return false;
  state.pending[id]=true;state.remaining--;state.launched++;state.revision++;return true;
 }
 function refresh(state){
  state.jpHits=state.counts[config.jpPocket-1];state.base=0;
  for(let i=0;i<25;i++)if(pocketKind(i+1)==='normal')state.base+=pocketValue(state.counts[i]);
  state.jpMultiplier=state.jpHits>=config.jpThreshold?state.jpHits-config.jpThreshold+1:0;
  state.multiplier=state.jpMultiplier?config.jpMultiplierStep*state.jpMultiplier:1;
  state.payout=state.base*state.multiplier;
 }
 function acceptHit(state,hit){
  const id=hit?.ball??hit?.id,pocket=hit?.pocket;
  if(!state||!validId(id)||!validPocket(pocket)||!state.pending[id]||state.accepted[id])return false;
  delete state.pending[id];state.accepted[id]='hit';state.counts[pocket-1]++;state.landed++;
  const added=bonusFor(pocket),before=state.payout;
  state.remaining+=added;state.bonusTotal+=added;refresh(state);state.revision++;
  state.history.push({ball:id,pocket,added,count:state.counts[pocket-1],delta:state.payout-before});
  if(state.history.length>25)state.history.shift();return true;
 }
 function acceptFault(state,id){
  if(!state||!validId(id)||!state.pending[id]||state.accepted[id])return false;
  delete state.pending[id];state.accepted[id]='fault';state.remaining++;state.refunded++;state.revision++;return true;
 }
 function isComplete(state){return !!state&&state.remaining===0&&Object.keys(state.pending).length===0;}
 root.SweetsCrystalJpcV306=Object.freeze({version:306,config,createSession,launch,acceptHit,acceptFault,isComplete,pocketValue,pocketColor,pocketKind,bonusFor});
})(typeof window==='object'?window:globalThis);

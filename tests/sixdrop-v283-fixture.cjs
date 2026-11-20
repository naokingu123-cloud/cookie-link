'use strict';
// Reuse the real native host/geometry adapters while keeping the historical
// v278/v280 helper's default revision fixed for its existing witness tests.
const assert=require('node:assert/strict');
const historical=require('./sixdrop-v278-fixture.cjs');
const {R,clone,NUMBERS}=historical;
function batches(numbers,stateOrRevision=R.CURRENT_REVISION){
 const groups=[];let offset=0;
 while(offset<numbers.length){
  const size=R.batchSize(offset,stateOrRevision);assert(size>0&&offset+size<=numbers.length,'complete revisioned draw group');
  groups.push(numbers.slice(offset,offset+size));offset+=size;
 }
 return groups;
}
function fullRound(seed,{bet=100,rate=90,carry=null,numbers=NUMBERS,rulesRevision=R.CURRENT_REVISION,trace=true}={}){
 let state=R.newGame({seed,bet,rate,carry,rulesRevision});
 const initial=clone(state),plans=[];
 for(const group of batches(numbers,state)){
  const plan=R.isGrouped(state)?R.hitBatch(state,group,{trace}):R.hit(state,group[0],{trace});
  assert(plan,'valid revisioned draw step');plans.push(plan);state=plan.state;
 }
 return {seed,bet,rate,carry,initial,state,plans,numbers:[...numbers],win:R.totalMedals(state)};
}
module.exports={...historical,batches,fullRound};

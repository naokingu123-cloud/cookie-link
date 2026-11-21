'use strict';
// Exercise the production meter and presentation functions with real rule
// timelines. Fractional credits must never become fractional/missing drops.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {R,clone,fullRound}=require('./sixdrop-v283-fixture.cjs');
const hostSource=fs.readFileSync('assets/sixdrop-progressive-host-v247.js','utf8');
const uiSource=fs.readFileSync('assets/sixdrop-ui-v278.js','utf8');
function block(source,start,end){
 const a=source.indexOf(start),b=source.indexOf(end,a);
 assert(a>=0&&b>a,'production source block exists: '+start);return source.slice(a,b);
}
function node(){return {dataset:{},clientWidth:164,attributes:{},classList:{toggle(){}},setAttribute(key,value){this.attributes[key]=value;}};}
function meter(initial){
 const source=node();source.parentElement=node();
 const nodes={bank:node(),continuation:node(),removedTotal:node(),removed:node()};nodes.bank.parentElement=node();
 const e={version:1,state:clone(initial),processed:0,running:true};
 const context=vm.createContext({R,rules:R,e,engine:e,slot:{candyTime:0},committed:clone(initial.carryAtStart),motionReduced:false,
  $:id=>id==='sd247-bank'?source:null,fitGoldenNumber:(el,text)=>{el.textContent=text;},
  money:n=>String(Math.floor(Math.max(0,Number(n)||0))),document:{getElementById:id=>id==='sd247-bank'?source:null},
  nodes,bankSpace:()=>164,amount:(el,value)=>{el.textContent=String(Math.floor(value));},window:{SixDropV247:{carry:clone(initial.carryAtStart)}}});
 vm.runInContext(block(hostSource,'let bankView=','function sync(')+
  '\nglobalThis.meter={resetBank,bankStage,bankAt,paintBank,view:()=>bankView};',context,{filename:'production-sixdrop-meter.js'});
 vm.runInContext(block(uiSource,'function paintBank(d){','function paintReceipt(')+
  '\nglobalThis.paintUi=paintBank;',context,{filename:'production-sixdrop-bank-ui.js'});
 context.meter.resetBank(initial.bankUnits,initial.removedTotal);
 return {context,e,source,nodes,api:context.meter,
  at(time){context.slot.candyTime=time;context.meter.paintBank();return {bank:Number(source.dataset.displayUnits),removed:Number(source.dataset.displayRemoved)};},
  ui({legacy=false,earned=true}={}){
   if(legacy)delete source.dataset.displayRemoved;
   context.paintUi({bankUnits:e.state.bankUnits,earnedContinuation:earned,continuationActive:true,inheritedContinuation:true});
   return {count:Number(nodes.removedTotal.dataset.count),target:Number(nodes.removedTotal.dataset.targetCount),bank:Number(nodes.bank.dataset.units)};
  }};
}
const close=(actual,expected,message)=>assert(Math.abs(actual-expected)<1e-7,message+': '+actual+' vs '+expected);
let stageCount=0,zeroCreditIntervals=0,overlapCount=0;
function checkRound(round,{legacy=false,overlap=false}={}){
 const h=meter(round.initial);let clock=0,last={bank:round.initial.bankUnits,removed:round.initial.removedTotal};
 for(const plan of round.plans){
  // The host commits the canonical result before replaying the visual stages.
  h.e.state=clone(plan.state);
  for(const stage of plan.timeline.filter(item=>item.progressiveCredits?.length)){
   h.context.slot.candyTime=clock;h.api.bankStage(stage);stageCount++;
   const tween=h.api.view().tween;assert(tween,'normal removal creates a tween');
   const from=h.at(clock);close(from.bank,last.bank,'new stage starts at displayed bank');close(from.removed,last.removed,'new stage starts at displayed count');
   const points=overlap?[0,.05,.25,.5]:[0,.05,.25,.5,.75];
   let prior=from;
   for(const fraction of points){
    const seen=h.at(clock+tween.ms*fraction),presented=h.ui({legacy});
    assert(seen.bank>=prior.bank-1e-7,'bank cannot decrease within a removal');
    assert(seen.removed>=prior.removed-1e-7,'removed count cannot decrease within a removal');
    close(presented.count,Math.floor(seen.removed+1e-7),'visible count follows actual host progress');
    assert.equal(presented.target,plan.state.removedTotal,'UI target is canonical total');prior=seen;
   }
   if(!legacy&&!overlap){
    // Inspect actual zero-delta credit spans in this real removal stage, not
    // a hand-authored fake state. Count movement must survive a flat bank.
    for(let i=0;i<tween.targets.length;i++){
     const previous=i?tween.targets[i-1]:tween.from;
     if(tween.targets[i]!==previous)continue;
     const a=h.at(clock+tween.ms*(i+.25)/tween.targets.length),b=h.at(clock+tween.ms*(i+.75)/tween.targets.length);
     close(a.bank,b.bank,'zero-credit interval keeps bank constant');assert(b.removed>a.removed,'zero-credit drop still animates');zeroCreditIntervals++;
    }
   }
   if(overlap){clock+=tween.ms*.5;last=h.at(clock);overlapCount++;}
   else{
    clock+=tween.ms;last=h.at(clock);
    assert.equal(last.bank,stage.bankUnits,'stage reaches exact integer bank');
    const expectedRemoved=legacy?round.initial.removedTotal+(stage.bankUnits-round.initial.bankUnits)/(round.initial.bet*5):stage.removedTotal;
    close(last.removed,expectedRemoved,'stage reaches exact actual count');assert.equal(h.api.view().tween,null);
   }
  }
 }
 if(h.api.view().tween){clock=h.api.view().tween.start+h.api.view().tween.ms;last=h.at(clock);}
 assert.equal(last.bank,round.state.bankUnits,'completed trace converges to canonical bank');
 close(last.removed,round.state.removedTotal,'completed trace converges to canonical count');
 assert.equal(h.ui({legacy}).count,round.state.removedTotal,'final UI count is exact');
 // Completing a zero-WIN round resets both visible meters without altering
 // the canonical checkpoint that result screens still need.
 h.e.processed=8;h.e.running=false;
 const reset=h.ui({earned:false});assert.equal(reset.bank,0);assert.equal(reset.count,0);assert.equal(reset.target,0);
 assert.deepEqual(h.e.state,round.state,'meter rendering cannot mutate rule state');
 return h;
}
assert.equal(R.CURRENT_REVISION,284);
const inherited={bankUnits:123456,removed:199,feed:450};
const rounds=[1,5,100].map(bet=>fullRound(10,{bet,carry:inherited,rulesRevision:284}));
for(const round of rounds)checkRound(round);
assert(zeroCreditIntervals>0,'BET1 actually contains zero-unit drops');
checkRound(rounds[0],{overlap:true});
// Change BET against an actual positive completed result. Only new drops
// accrue at the new BET; a prior bank is neither revalued nor reverse-counted.
const carry=R.carryOut(rounds[2].state,'actual-positive-round');assert(carry.bankUnits>0&&carry.removed>0);
const changed=fullRound(73,{bet:5,carry,rulesRevision:284});
assert.equal(changed.initial.bankUnits,carry.bankUnits);assert.equal(changed.initial.removedTotal,carry.removed);checkRound(changed);
// Old 283 emits neither per-credit nor per-stage actual counts. Keep its
// constant-credit fallback valid in both host and UI, including changed BET.
const old=fullRound(10,{bet:5,carry,rulesRevision:283});
assert(old.plans.every(plan=>plan.timeline.every(stage=>!Object.hasOwn(stage,'removedTotal'))));checkRound(old,{legacy:true});
const stage=rounds[0].plans.flatMap(plan=>plan.timeline).find(item=>item.progressiveCredits?.length);
for(const mode of ['reduced','hidden']){
 const h=meter(rounds[0].initial);h.e.state=clone(rounds[0].state);
 h.context.motionReduced=mode==='reduced';h.api.bankStage(stage,mode==='hidden');
 const seen=h.at(0);assert.equal(seen.bank,stage.bankUnits);assert.equal(seen.removed,stage.removedTotal);assert.equal(h.api.view().tween,null);
 assert.equal(h.ui().count,stage.removedTotal,mode+' mode snaps both meters together');
}
// Version changes during restore must seed the new timeline's own start,
// rather than borrowing a stale displayed counter from an earlier engine.
const restored=meter(rounds[0].initial);restored.api.resetBank(999999,999999);restored.e.version++;
restored.e.state=clone(rounds[0].state);restored.api.bankStage(stage);
const seen=restored.at(0);assert.equal(seen.bank,stage.bankUnitsBefore);assert.equal(seen.removed,stage.progressiveCredits[0].removedTotal-1);
console.log('SIXDROP_V284_METER_PASS',JSON.stringify({bets:[1,5,100],changedBet:5,stageCount,zeroCreditIntervals,overlapCount,legacyRevision:283,reduced:true,hidden:true,restored:true,scope:'Production host + UI functions; actual eight-ball core timelines; no renderer state mutation'}));

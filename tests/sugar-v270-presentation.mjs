/* Presentation invariants: the animated reel must stop on the server outcome,
 * and its visual distribution must not become a second lottery. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../assets/sugar-challenge-v254.js',import.meta.url),'utf8');
const constants=source.slice(source.indexOf('const BASE_END='),source.indexOf('const AWARD_COLORS='));
const helpers=source.slice(source.indexOf('function paintReel('),source.indexOf('function render(){'));
const elements={digital:{hidden:false,attributes:{},setAttribute(n,v){this.attributes[n]=v;}},window:{clientWidth:412},state:{textContent:''}};
const attributes={};
const context={
 clamp:(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),intro:0,
 stage:{dataset:{}},reel:{hidden:false,dataset:{},attributes:{},setAttribute(n,v){this.attributes[n]=v;},querySelector:s=>s==='.sc270-reel-window'?elements.window:elements.state},
 reelTrack:{dataset:{},style:{},firstElementChild:{offsetWidth:136}},
 resultFace:{alt:'',getAttribute:n=>attributes[n],setAttribute:(n,v)=>{attributes[n]=v;}},
 multiplier:{textContent:''},overlay:{querySelector:()=>elements.digital},
 reelBase:{parentElement:{hidden:false},value:0},
 num:(node,value)=>{node.value=value;}
};
vm.createContext(context);vm.runInContext(constants+helpers+'\nglobalThis.cycle=REEL_SEQUENCE;globalThis.end=INTRO_END;',context);
assert.equal(context.cycle.length,14);
assert.deepEqual(Object.fromEntries([1,2,3,4,5,10].map(n=>[n,context.cycle.filter(v=>v===n).length])),{1:5,2:3,3:2,4:2,5:1,10:1});
for(const multiplier of [1,2,3,4,5,10]){
 const state={multiplier,jpBase:10500,jpAmount:10500*multiplier};
 context.intro=3200;context.paintReel(state,false);
 assert.equal(context.reel.dataset.ready,'false');assert.equal(context.reelBase.parentElement.hidden,true);
 assert.equal(Number(context.reelTrack.dataset.position),0,'the reel waits until the base is fixed');
 context.intro=3400;context.paintReel(state,false);
 assert.equal(context.reel.dataset.ready,'true');assert.equal(context.stage.dataset.reelReady,'true');assert.equal(context.reelBase.value,10500);
 assert.equal(Number(context.reelTrack.dataset.position),0);
 let previous=-1;
 for(const time of [3450,3650,4050,4650,5350,6050,6500]){
  context.intro=time;context.paintReel(state,false);
  const position=Number(context.reelTrack.dataset.position);assert.ok(position>=previous,'reel always moves in one direction');previous=position;
  assert.equal(context.reelBase.value,state.jpBase,'base stays fixed during the multiplier animation');
 }
 const target=Number(context.reelTrack.dataset.target),position=Number(context.reelTrack.dataset.position);
 assert.equal(position,target);assert.equal(context.cycle[target%14],multiplier,'centered image matches server multiplier');
 const translation=Number(context.reelTrack.style.transform.match(/translate3d\(([-.\d]+)/)[1]);
 assert.equal(translation+(target+.5)*136,412/2,'the winning card is exactly under the center pointer');
 const before=JSON.stringify(context.reelTrack);
 context.paintReel(state,false);assert.equal(JSON.stringify(context.reelTrack),before,'duplicate snapshots do not reroll');
 assert.equal(attributes.src,'assets/sugar-art-v270/multiplier-'+multiplier+'.png');
 context.paintReel(state,true);assert.equal(context.reel.hidden,true);assert.equal(elements.digital.hidden,false);const label=({1:'',2:'ハイパー ',3:'スペシャル ',4:'ウルトラ ',5:'ミラクル ',10:'ギャラクシー '}[multiplier])+multiplier+'倍';assert.equal(context.multiplier.textContent,label);assert.equal(context.resultFace.alt,label);assert.equal(elements.digital.attributes['aria-label'],label);assert.equal(context.stage.dataset.reelReady,'false');
}
assert.doesNotMatch(source,/JP ×|JP \*/,'cash awards never show fractional JP expressions');
assert.equal((source.match(/class="sc270-gauge"/g)||[]).length,1,'there is one actual vertical gauge');
console.log('SUGAR_V270_PRESENTATION_PASS: exact 14-card cycle; all 6 server results stop at center; base precedes spin; replay deterministic; one gauge; n WIN labels.');

/* Presentation invariants: the animated reel must stop on the server outcome,
 * and its visual distribution must not become a second lottery. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../assets/sugar-challenge-v254.js',import.meta.url),'utf8');
const constants=source.slice(source.indexOf('const BASE_END='),source.indexOf('const AWARD_COLORS='));
const helpers=source.slice(source.indexOf('function paintReel('),source.indexOf('function render(){'));
const style=()=>({setProperty(n,v){this[n]=v;}});
const badge=()=>({hidden:true,textContent:'',dataset:{},style:style(),attributes:{},setAttribute(n,v){this.attributes[n]=v;}});
const elements={digital:{hidden:false,attributes:{},setAttribute(n,v){this.attributes[n]=v;}},window:{clientWidth:412},state:{textContent:''}};
const attributes={};
const context={
 clamp:(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),intro:0,
 window:{SweetsAudioV277:{sugarReel(){}}},paused:()=>false,
 stage:{dataset:{}},reel:{hidden:false,dataset:{},style:style(),attributes:{},setAttribute(n,v){this.attributes[n]=v;},querySelector:s=>s==='.sc270-reel-window'?elements.window:elements.state},
 reelTrack:{dataset:{},style:{},firstElementChild:{offsetWidth:136}},reelMultiplier:badge(),
 resultFace:{alt:'',getAttribute:n=>attributes[n],setAttribute:(n,v)=>{attributes[n]=v;}},
 multiplier:{textContent:''},overlay:{querySelector:()=>elements.digital},
 reelBase:{parentElement:{hidden:false},value:0},
 num:(node,value)=>{node.value=value;}
};
vm.createContext(context);vm.runInContext(constants+helpers+'\nglobalThis.cycle=REEL_SEQUENCE;globalThis.timing={baseEnd:BASE_END,start:REEL_START,stop:REEL_STOP,end:INTRO_END};',context);
const timing=context.timing;
assert.equal(context.cycle.length,14);
assert.deepEqual(Object.fromEntries([1,2,3,4,5,10].map(n=>[n,context.cycle.filter(v=>v===n).length])),{1:5,2:3,3:2,4:2,5:1,10:1});
assert.ok(timing.stop-timing.start>=6000,'the reel now takes at least six seconds');assert.ok(timing.end<20000,'the ceremony fits inside the existing twenty-second BET time');
const velocity=p=>(context.reelMotion(p+.00001).position-context.reelMotion(p-.00001).position)/.00002;
assert.ok(velocity(.02)<velocity(.07)&&velocity(.07)<velocity(.13),'the first phase accelerates smoothly');
assert.ok(Math.abs(velocity(.25)-velocity(.4))<1e-8,'the middle includes sustained circulation');
assert.ok(velocity(.5)>velocity(.65)&&velocity(.65)>velocity(.79),'the braking phase decelerates');
assert.ok(velocity(.82)>velocity(.9)&&velocity(.9)>velocity(.99),'the final card glides to rest');
assert.equal(context.reelMotion(0).position,0);assert.equal(context.reelMotion(1).position,1);
for(const boundary of [.14,.46,.8])assert.ok(Math.abs(velocity(boundary-1e-4)-velocity(boundary+1e-4))<1e-5,'speed is continuous at phase changes');
for(const multiplier of [1,2,3,4,5,10]){
 const state={rulesRevision:271,multiplier,jpBase:10500,jpAmount:10500*multiplier,cashBase:10500};
 context.intro=3200;context.paintReel(state,false);
 assert.equal(context.reel.dataset.ready,'false');assert.equal(context.reelBase.parentElement.hidden,true);
 assert.equal(Number(context.reelTrack.dataset.position),0,'the reel waits until the base is fixed');assert.equal(context.reelMultiplier.hidden,true);
 context.intro=3400;context.paintReel(state,false);
 assert.equal(context.reel.dataset.ready,'true');assert.equal(context.stage.dataset.reelReady,'true');assert.equal(context.reelBase.value,10500);
 assert.equal(Number(context.reelTrack.dataset.position),0);
 let previous=-1;
 for(let time=timing.start;time<timing.stop;time+=8){
  context.intro=time;context.paintReel(state,false);
  const position=Number(context.reelTrack.dataset.position);assert.ok(position>=previous,'the reel never reverses or invents a near miss');previous=position;
  assert.equal(context.reelBase.value,state.jpBase,'base stays fixed during the multiplier animation');assert.equal(context.reelMultiplier.hidden,true,'multiplier reveal waits for the actual stop');
 }
 context.intro=timing.stop;context.paintReel(state,false);
 const target=Number(context.reelTrack.dataset.target),position=Number(context.reelTrack.dataset.position);
 assert.ok(target>=70,'at least five full14-card cycles pass');assert.equal(position,target);assert.equal(context.cycle[target%14],multiplier,'centered image matches server multiplier');
 const translation=Number(context.reelTrack.style.transform.match(/translate3d\(([-.\d]+)/)[1]);
 assert.equal(translation+(target+.5)*136,412/2,'the winning card is exactly under the center pointer');
 assert.equal(context.reelMultiplier.hidden,multiplier===1);assert.equal(context.reelMultiplier.textContent,'×'+multiplier);assert.equal(context.reelBase.value,10500,'the stopped display never replaces base with multiplied JP');
 context.intro=timing.stop+720;context.paintReel(state,false);assert.equal(context.reelMultiplier.style['--sc271-pop-scale'],'1');assert.equal(context.reelMultiplier.style['--sc271-pop-opacity'],'1');
 const before=JSON.stringify(context.reelTrack);
 context.paintReel(state,false);assert.equal(JSON.stringify(context.reelTrack),before,'duplicate snapshots do not reroll');
 assert.equal(attributes.src,'assets/sugar-art-v279/multiplier-'+multiplier+'-transparent.png');
 context.paintReel(state,true);assert.equal(context.reel.hidden,true);assert.equal(elements.digital.hidden,false);const label=({1:'',2:'ハイパー ',3:'スペシャル ',4:'ウルトラ ',5:'ミラクル ',10:'ギャラクシー '}[multiplier])+multiplier+'倍';assert.equal(context.multiplier.textContent,label);assert.equal(context.resultFace.alt,label);assert.equal(elements.digital.attributes['aria-label'],label);assert.equal(context.stage.dataset.reelReady,'false');
 assert.equal(context.displayAmounts(state).cashBase,10500,'miss awards do not change with multiplier');
 assert.equal(context.displayAmounts({...state,cashBase:undefined}).cashBase,10500,'new-revision fallback also uses the base');
 assert.equal(context.displayAmounts({...state,rulesRevision:270,cashBase:undefined}).cashBase,state.jpAmount,'legacy payout display preserves its persisted award calculation');
}
vm.runInContext('globalThis.artworkFor=multiplierArtwork;',context);
for(const value of [1,2,3,4,5,10]){
 const descriptor=context.artworkFor(value),imageAttributes={},label={textContent:''};
 assert.ok(Object.isFrozen(descriptor),'reusable artwork descriptors cannot be changed by a JPC consumer');
 assert.equal(descriptor.multiplier,value);assert.equal(descriptor.transparentSrc,'assets/sugar-art-v279/multiplier-'+value+'-transparent.png');
 assert.equal(descriptor.reelSrc,'assets/sugar-art-v270/multiplier-'+value+'.png','the original reel still uses its full-background card');
 const image={getAttribute:n=>imageAttributes[n],setAttribute:(n,v)=>{imageAttributes[n]=v;}},node=badge();node.querySelector=s=>s==='[data-sc-multiplier-art]'?image:label;
 context.paintMultiplier(node,{multiplier:value},false);assert.equal(node.hidden,true,'transparent multiplier stays hidden until the result is known');
 context.paintMultiplier(node,{multiplier:value},true);assert.equal(node.hidden,value===1,'the base-one JP amount has no extra multiplier popup');
 assert.equal(imageAttributes.src,descriptor.transparentSrc);assert.equal(image.alt,descriptor.label);assert.equal(label.textContent,'×'+value);assert.equal(node.attributes['aria-label'],'JP '+value+'倍');
}
for(const value of [0,6,NaN,'toString'])assert.equal(context.artworkFor(value),null,'unsupported artwork does not silently select a different multiplier');
const bands={innerHTML:''},pins={innerHTML:''},gaugeAxis={innerHTML:''};
context.R={MIN_SUM:36,MAX_SUM:172,CENTER_SUM:104,payoutRows:s=>{assert.ok(s.rulesRevision,'payout rows are resolved with their saved revision');return [];}};
context.gauge={attributes:{},querySelector:selector=>selector.includes('bands')?bands:pins,setAttribute(n,v){this.attributes[n]=v;}};context.gaugeAxis=gaugeAxis;
vm.runInContext(source.slice(source.indexOf('function verticalBand('),source.indexOf('function fitVessels(')),context);
context.paintGauge({sum:77,cardId:'standard',rulesRevision:271},{lowMax:null,highMin:139,luckySums:[77]});
assert.equal((bands.innerHTML.match(/data-jpc/g)||[]).length,1);assert.match(bands.innerHTML,/data-min="139"/);assert.doesNotMatch(gaugeAxis.innerHTML,/null|NaN/);assert.match(context.gauge.attributes['aria-label'],/合計139以上でJPC確定/);
context.paintGauge({sum:77,cardId:'standard',rulesRevision:270},{lowMax:70,highMin:138,luckySums:[77,88,120,131]});
assert.equal((bands.innerHTML.match(/data-jpc/g)||[]).length,2);assert.match(context.gauge.attributes['aria-label'],/8球後のJPCは36から70/);
assert.doesNotMatch(source,/JP ×|JP \*/,'cash awards never show fractional JP expressions');
assert.equal((source.match(/class="sc270-gauge"/g)||[]).length,1,'there is one actual vertical gauge');
assert.match(source,/R\.cashFor\(money\.cashBase,row\.hundredths\)/);assert.doesNotMatch(source,/R\.cashFor\(s\.jpAmount,row\.hundredths\)/);
assert.doesNotMatch(source,/Math\.random|selectMultiplier\(/,'presentation never draws a second outcome');
console.log('SUGAR_V279_PRESENTATION_PASS: unchanged 6.25s spin and six original reel cards; all server results centered; transparent settled/JPC artwork descriptors; JP base plus multiplier popup; cash independent of multiplier; deterministic replay.');

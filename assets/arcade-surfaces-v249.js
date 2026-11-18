/* v249 presentation: nine confectionery cabinets and bounded semantic effects.
   Loaded in the existing private game scope after all game hosts. No RNG,
   board, timing, BET, payout, reservation, or checkpoint writes. */
(()=>{
'use strict';
if(window.SweetsArcadeSurfacesV249)return;
const query=new URLSearchParams(location.search);
if(query.get('serverSettlementWorker')==='1')return;
const kinds=new Set(['cookie','choco','candy','gelato','winery','popcorn','jelly','stick','castella']);
const stages=new Map(),motions=window.matchMedia('(prefers-reduced-motion: reduce)');
const root=document.documentElement;
root.classList.add('arcade-v249');root.dataset.arcadeSurfaces='v249';
const kindOf=(slot,engine)=>kinds.has(engine?.kind)?engine.kind:window.SweetsLineup?.ids?.[slot.i]||'cookie';
const settledKinds=new Set(['jelly','stick','castella']);
function kindCue(kind,phase,detail,engine,previous){
 if(phase==='allclear'||phase==='pyramidAllClear'||phase==='wineryAllFull'||phase==='reversal'||phase==='reversalBonus')return ['clear',4];
 if(phase==='sugaraward')return ['sugar',3];
 if(phase==='hit')return detail.cells?.length?['hit',1]:null;
 if(phase==='link')return detail.groups?.length?['chain',Number(detail.depth)>=5?3:2]:null;
 if(phase==='pyramidHit')return detail.cells?.length?['hit',1]:null;
 if(phase==='pyramidShape')return ['chain',detail.hexagons||detail.forms?.some(f=>f.type==='hexagon')?3:2];
 if(phase==='canyonDrill')return ['drill',1];
 if(phase==='canyonMelt')return ['crumble',2];
 if(phase==='canyonPower')return [detail.kind==='clear'?'clear':'drill',detail.kind==='clear'?4:2];
 if(phase==='canyonAll'||phase==='canyonBonus')return ['treasure',3];
 if(phase==='gelatoHit')return detail.newHit?['hit',1]:null;
 if(phase==='gelatoFill')return detail.full?['clear',4]:detail.newFaces?.length?['prism',detail.newFaces.length>=6?3:2]:null;
 if(phase==='wineryPour')return ['pour',1];
 if(phase==='wineryOddsUp'||phase==='wineryBoost')return ['mix',2];
 if(phase==='wineryAward')return detail.justFilled?.length?['pour',detail.justFilled.length>=5?3:2]:null;
 if(phase==='jellyPour')return ['pour',1];
 if(phase==='flipping')return ['flip',1];
 if(phase==='settled'&&settledKinds.has(kind)){
  // Final-board repaint/settlement acknowledgements can emit the same
  // settled phase again. Celebrate a received draw once, not a repaint.
  if((Number(engine.processed)||0)<=previous.processed)return null;
  const state=engine.state||{};
  if(kind==='jelly'){
   const count=state.lines?.length||0;
   return count>previous.lines?['bingo',count===12?4:count>=7?3:2]:null;
  }
  if(kind==='stick')return state.reversalThisMove?['clear',4]:state.flipped?.length?['flip',state.flipped.length>=8?3:2]:null;
  if(kind==='castella')return state.bakedCount>previous.baked?['bake',state.highestRole?4:state.bakedCount-previous.baked>=6?3:2]:['hit',1];
 }
 return null;
}
function remember(state,engine){state.version=engine.version;state.processed=Number(engine.processed)||0;state.lines=engine.state?.lines?.length||0;state.baked=engine.state?.bakedCount||0;}
function clear(stage){
 if(stage.timer){clearTimeout(stage.timer);stage.timer=0;}
 for(const animation of stage.animations)animation.cancel();
 stage.animations.length=0;stage.el.hidden=true;stage.el.dataset.active='false';stage.priority=0;stage.until=0;
}
function mount(slot,engine){
 const kind=kindOf(slot,engine),panel=slot.panel;
 panel.classList.add('v249-game-surface');panel.dataset.v249Kind=kind;
 const el=document.createElement('div');el.className='v249-event-stage';el.hidden=true;el.setAttribute('aria-hidden','true');
 el.dataset.eventCount='0';el.dataset.active='false';
 const rim=document.createElement('i');rim.className='v249-event-rim';
 const bloom=document.createElement('i');bloom.className='v249-event-bloom';
 const sparkBox=document.createElement('span');sparkBox.className='v249-event-sparks';
 const sparks=[];
 for(let n=0;n<12;n++){
  const spark=document.createElement('i');spark.style.setProperty('--v249-n',n);
  // Precomputed edge origins keep all particles away from board hit targets.
  const right=n%2===1;spark.style.left=right?'94%':'6%';spark.style.top=(15+Math.floor(n/2)*13)+'%';
  sparkBox.append(spark);sparks.push(spark);
 }
 el.append(rim,bloom,sparkBox);panel.append(el);
 const stage={el,rim,bloom,sparks,animations:[],timer:0,priority:0,until:0,count:0,lines:0,baked:0,version:engine?.version};
 remember(stage,engine||{});stages.set(slot,stage);return stage;
}
function play(slot,cue,level){
 const stage=stages.get(slot);
 if(!stage||slot.i!==active||slot.panel.hidden||app.phase!=='playing'||app.paused||document.hidden)return;
 const now=performance.now();
 if(now<stage.until&&stage.priority>level)return;
 clear(stage);stage.priority=level;stage.until=now+(level>=3?220:80);
 const duration=motions.matches?170:level===1?220:level===2?430:level===3?620:820;
 const el=stage.el;el.dataset.cue=cue;el.dataset.level=String(level);el.dataset.active='true';
 el.dataset.eventCount=String(++stage.count);el.hidden=false;
 const ease='cubic-bezier(.16,.66,.28,1)';
 if(typeof el.animate==='function'){
  stage.animations.push(el.animate([{opacity:0},{opacity:1,offset:.12},{opacity:level===1?.3:.82,offset:.5},{opacity:0}],{duration,fill:'both',easing:'linear'}));
  if(!motions.matches&&level>1){
   stage.animations.push(stage.rim.animate([{opacity:.9,transform:'scale(.986)'},{opacity:1,transform:'scale(1)',offset:.2},{opacity:0,transform:'scale(1)'}],{duration,fill:'both',easing:ease}));
   for(let n=0;n<stage.sparks.length;n++){
    const direction=n%2===1?-1:1,distance=(level>=3?31:19)+(n%3)*5,dy=-11-(n%4)*5;
    stage.animations.push(stage.sparks[n].animate([
     {opacity:0,transform:'translate(0,5px) scale(.35) rotate(0deg)'},
     {opacity:1,transform:'translate('+direction*distance*.25+'px,-2px) scale(1.1) rotate('+direction*15+'deg)',offset:.22},
     {opacity:0,transform:'translate('+direction*distance+'px,'+dy+'px) scale(.18) rotate('+direction*80+'deg)'}
    ],{duration:duration-(n%3)*28,delay:(n%3)*14,fill:'both',easing:ease}));
   }
  }
 }
 stage.timer=setTimeout(()=>clear(stage),duration+65);
}
function theme(){
 const slot=slots[active];
 if(slot)document.body.dataset.v249Game=kindOf(slot,app.engines[slot.i]);
 for(const [other,stage]of stages)if(other.i!==active)clear(stage);
}
for(const slot of slots){
 const engine=app.engines[slot.i];if(!engine||!window.SweetsLineup?.ids?.[slot.i])continue;
 const state=mount(slot,engine),emit=engine.emit;
 if(typeof emit!=='function')continue;
 engine.emit=function(phase,detail={},...args){
  const previous={lines:state.lines,baked:state.baked,processed:state.processed};
  if(this.version!==state.version){previous.lines=previous.baked=previous.processed=0;clear(state);}
  const result=emit.call(this,phase,detail,...args);
  if(phase==='ready'||phase==='error'){clear(state);remember(state,this);return result;}
  const cue=kindCue(kindOf(slot,this),phase,detail||{},this,previous);
  if(cue)play(slot,cue[0],cue[1]);
  // Modern games calculate a trace ahead of its animation. Remember rewards
  // only at the native settled boundary, so effects never reveal them early.
  if(phase==='settled'||!settledKinds.has(kindOf(slot,this)))remember(state,this);
  return result;
 };
}
const nativeSelect=select;
select=function(...args){const result=nativeSelect.apply(this,args);theme();return result;};
const show=window.SweetsArcadeShow;
if(show?.popcornWave){
 const wave=show.popcornWave;
 show.popcornWave=function(engine,trace,index,power,...args){
  const result=wave.call(this,engine,trace,index,power,...args);
  const slot=slots.find(s=>s.engine===engine);
  if(slot){const full=trace?.clear&&index===trace.waves.length-1;play(slot,full?'clear':power>=4?'burst':'pop',full?4:power>=4||index>=4?3:index>0?2:1);}
  return result;
 };
}
const resetEffects=()=>{for(const stage of stages.values())clear(stage);};
document.addEventListener('visibilitychange',()=>{if(document.hidden)resetEffects();});
window.addEventListener('pagehide',resetEffects);
motions.addEventListener?.('change',resetEffects);
new MutationObserver(()=>{if(document.body.classList.contains('paused'))resetEffects();}).observe(document.body,{attributes:true,attributeFilter:['class']});
theme();
window.SweetsArcadeSurfacesV249=Object.freeze({version:249,describe(){return {activeGame:document.body.dataset.v249Game,stages:[...stages].map(([slot,state])=>({index:slot.i,kind:slot.panel.dataset.v249Kind,events:state.count,active:!state.el.hidden,animations:state.animations.length})),reducedMotion:motions.matches};}});
})();

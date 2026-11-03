/* Event-driven cabinet lighting and foley. The playfield engine owns timing and awards. */
(()=>{
 'use strict';
 const layers=new WeakMap(),observed=new WeakSet();
 const tones={cookie:[1.01,'cookie-hit','chain'],choco:[.91,'drill','melt'],candy:[1.10,'six-hit','triangle'],gelato:[1.20,'glass','hexagon'],winery:[.89,'glass','transfer'],popcorn:[1.07,'pop','chain']};
 const rawSound=sceneSound;
 let source=null;
 function kindOf(e){return tones[e.kind]?e.kind:'cookie';}
 function light(slot,kind,level,caption){
  if(slot.i!==active||app.phase!=='playing'||app.paused||document.hidden)return;
  let state=layers.get(slot);
  if(!state){
   const el=document.createElement('div');el.className='v91-board-show';el.setAttribute('aria-hidden','true');
   const sparks=document.createElement('span');sparks.className='v91-sparks';
   for(let j=0;j<8;j++){const spark=document.createElement('i');spark.style.setProperty('--j',j);sparks.appendChild(spark);}
   const title=document.createElement('b');el.append(sparks,title);slot.panel.appendChild(el);
   state={el,title,until:0,priority:0};layers.set(slot,state);
  }
  const now=performance.now();if(now<state.until&&level<state.priority)return;
  state.priority=level;state.until=now+[0,90,170,420,650][level];
  const el=state.el;el.classList.remove('v91-on');el.dataset.gameKind=kind;el.dataset.accent=String(level);
  state.title.textContent=level>=3?caption:'';
  // At most one local animation tree per visible cabinet, restarted only by a semantic game event.
  void el.offsetWidth;el.classList.add('v91-on');
 }
 function readCue(ev,e){
  const phase=ev.phase,high=+ev.gain>=1000;
  switch(phase){
   case 'hit':return ev.cells?.length?[1]:null;
   case 'link':return ev.groups?.length?[ev.depth>=5?3:2,ev.depth+' LINK!']:null;
   case 'allclear':case 'pyramidAllClear':return [4,'ALL CLEAR!','allclear'];
   case 'canyonDrill':case 'pyramidHit':case 'wineryPour':return [1];
   case 'canyonMelt':return [2];
   case 'canyonPower':return [ev.kind==='clear'?4:2,ev.kind==='clear'?'全層掘削！':'POWER!'];
   case 'canyonAll':return [3,'ALL DRILL!'];
   case 'canyonBonus':return [3,'BONUS!'];
   case 'canyonCollect':return high?[3,'BIG WIN!']:null;
   case 'pyramidShape':return [ev.hexagons?3:2,ev.hexagons?'HEXAGON!':'CHAIN!'];
   case 'pyramidAward':return high?[3,'BIG WIN!']:null;
   case 'gelatoHit':return ev.newHit?[1]:null;
   case 'gelatoFill':return ev.full?[4,'全埋め！','allclear']:ev.newFaces?.length?[high?3:2,ev.newFaces.length+'枚 GET!']:null;
   case 'wineryOddsUp':return [2,'ODDS UP!','rank'];
   case 'wineryBoost':return [2,'注入量UP!','level'];
   case 'wineryAward':return ev.full<21&&ev.justFilled?.length?[high?3:2,ev.justFilled.length+'杯 FULL!']:null;
   case 'wineryAllFull':return [4,'ALL FULL!','allclear'];
   default:return null;
  }
 }
 // Existing engine foley wins. Adjust that same sound's pitch instead of playing it twice.
 sceneSound=function(key,options={}){
  if(!source)return rawSound(key,options);
  const {slot,kind,cue}=source;if(slot.i!==active)return false;
  source.played=true;
  if(!cue)return rawSound(key,options);
  return rawSound(key,{...options,rate:(options.rate||1)*tones[kind][0]*(1+.025*(cue[0]-1))});
 };
 function observe(slot,e){
  if(!e||observed.has(e)||typeof e.onEvent!=='function')return;
  observed.add(e);const original=e.onEvent;
  e.onEvent=function(ev,...args){
   const previous=source,kind=kindOf(e),cue=readCue(ev,e),ctx={slot,kind,cue,played:false};source=ctx;
   try{
    const result=original.call(this,ev,...args);
    if(cue&&slot.i===active&&app.phase==='playing'&&!app.paused&&!document.hidden){
     light(slot,kind,cue[0],cue[1]||'BIG WIN!');
     if(!ctx.played){const key=cue[2]||(cue[0]===4?'allclear':cue[0]===3?'big-bonus':tones[kind][cue[0]]);
      sceneSound(key,{volume:cue[0]>=3?.68:.49});}
    }
    return result;
   }finally{source=previous;}
  };
 }
 for(const slot of slots)observe(slot,app.engines[slot.i]);
 // Popcorn schedules its native wave sounds against the animation clock. Keep the same cue boundary.
 window.SweetsArcadeShow={attach:observe,popcornWave(e,trace,wave,power){
  const slot=slots.find(s=>s.engine===e);if(!slot)return;
  const clear=trace.clear&&wave===trace.waves.length-1;
  light(slot,'popcorn',clear?4:power>=4||wave>=4?3:wave>0?2:1,clear?'ALL CLEAR!':power===5?'RAINBOW!':power===4?'THUNDER!':(wave+1)+' CHAIN!');
 }};
})();

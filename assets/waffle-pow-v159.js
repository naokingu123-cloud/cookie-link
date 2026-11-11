/* SWEETS LINK v161 — scheduled Waffle POW turns, adjacent-rank strikes,
   exact payout ladder and restrained board animation. */
(()=>{
'use strict';
const VERSION='v161';
if(window.SweetsLineup&&!window.SweetsLineup.chosen?.includes('stick'))return;
if(window.WafflePowV159?.version===VERSION)return;
window.WafflePowV159={version:VERSION};

function addStyle(){
 if(document.getElementById('waffle-pow-v159-css'))return;
 const link=document.createElement('link');
 link.id='waffle-pow-v159-css';link.rel='stylesheet';
 link.href='assets/waffle-pow-v159.css?v=161';
 document.head.append(link);
}
addStyle();

function install(){
 const R=window.BingoStickRules,W=window.BingoStick;
 if(!R||!W?.engine){setTimeout(install,40);return;}
 if(R.__powV161)return;
 R.__powV161=true;

 const baseCreate=R.create,baseProject=R.project,baseCreateDemo=R.createDemo;
 // Values are hundredths of BET. At 3000 BET these are exactly:
 // 600,600,1200,1200,3000,3000,4500,6000,9000,12000,15000,30000,45000.
 const baseRack=[0,20,20,40,40,100,100,150,200,300,400,500,1000,1500];
 const REVERSAL_BONUS=300000; // fixed 3000x
 const topSequence=[2000,2500,3000,4000,5000,7500,10000];
 // At 3000 BET: 60000,75000,90000,120000,150000,225000,300000,
 // then +75000 forever (that is +2500 hundredths).
 const topPrizeHundredths=index=>{
  const i=Math.max(0,Math.trunc(index));
  return i<topSequence.length?topSequence[i]:topSequence.at(-1)+2500*(i-topSequence.length+1);
 };

 const drawOrders=43609104000;
 // No-POW ordinary rates and the additional return per scheduled POW turn are
 // Monte-Carlo calibration anchors for the new rack. They keep the existing
 // target-rate mold mixer useful while POW frequency changes with the target.
 const molds=[
  {name:'千鳥',normal:36.0,powDelta:1.5,events:233424/drawOrders,games:233424/drawOrders},
  {name:'小花',normal:41.1,powDelta:1.1,events:14512/drawOrders,games:14512/drawOrders},
  {name:'飛石',normal:61.5,powDelta:6.0,events:25920/drawOrders,games:25920/drawOrders},
  {name:'小紋',normal:127.0,powDelta:21.2,events:979056/drawOrders,games:967464/drawOrders},
  {name:'双葉',normal:176.0,powDelta:39.4,events:2880/drawOrders,games:2880/drawOrders},
  {name:'花菱',normal:245.0,powDelta:50.4,events:171720/drawOrders,games:171720/drawOrders},
  {name:'風車',normal:332.0,powDelta:114.2,events:8/drawOrders,games:8/drawOrders},
  {name:'花窓',normal:412.0,powDelta:113.9,events:720/drawOrders,games:720/drawOrders},
  {name:'組市松',normal:362.0,powDelta:98.0,events:4844/drawOrders,games:4844/drawOrders}
 ];
 const clampRate=value=>Math.max(50,Math.min(150,Number.isFinite(Number(value))?Number(value):90));
 const expectedPowCount=rate=>Math.min(3,.25+(clampRate(rate)-50)*.0175+Math.max(0,clampRate(rate)-120)/150);
 const effectiveNormal=(m,rate)=>m.normal+m.powDelta*expectedPowCount(rate);
 const moldTotal=(m,rate)=>effectiveNormal(m,rate)+m.events*REVERSAL_BONUS;
 function mixtureFor(target){
  const desired=clampRate(target);
  let left=-1,right=1;
  for(let i=0;i<52;i++){
   const t=(left+right)/2,raw=molds.map(m=>Math.exp((moldTotal(m,desired)-90)*t)),sum=raw.reduce((a,b)=>a+b,0);
   const mean=raw.reduce((a,w,j)=>a+w*moldTotal(molds[j],desired),0)/sum;
   if(mean<desired)left=t;else right=t;
  }
  const t=(left+right)/2,raw=molds.map(m=>Math.exp((moldTotal(m,desired)-90)*t)),sum=raw.reduce((a,b)=>a+b,0);
  return raw.map(w=>w/sum);
 }
 const mixtures=Array.from({length:101},(_,i)=>mixtureFor(i+50));
 const weightsFor=rate=>Number.isInteger(rate)?mixtures[rate-50]:mixtureFor(rate);
 function calibration(target=90){
  const rate=clampRate(target),weights=weightsFor(rate);
  const normalPercent=molds.reduce((sum,m,i)=>sum+effectiveNormal(m,rate)*weights[i],0);
  const eventsPerGame=molds.reduce((sum,m,i)=>sum+m.events*weights[i],0);
  const gameProbability=molds.reduce((sum,m,i)=>sum+m.games*weights[i],0);
  const bonusHundredths=REVERSAL_BONUS,bonusPercent=eventsPerGame*bonusHundredths;
  return {rate,weights,normalPercent,eventsPerGame,gameProbability,bonusHundredths,
   bonusPercent,totalPercent:normalPercent+bonusPercent,fairMultiplier:bonusHundredths/100};
 }
 function pickMold(rate,rng){
  let pick=rng(),chosen=molds.at(-1).name;
  const weights=weightsFor(rate);
  for(let i=0;i<molds.length;i++){pick-=weights[i];if(pick<0){chosen=molds[i].name;break;}}
  return chosen;
 }
 function shuffle(values,rng){
  for(let i=values.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[values[i],values[j]]=[values[j],values[i]];}
  return values;
 }
 function selectPowTurns(rate,rng){
  const expected=expectedPowCount(rate),whole=Math.floor(expected);
  let count=whole+Number(rng()<expected-whole);
  count=Math.max(0,Math.min(3,count));
  const picked=new Set(shuffle(Array.from({length:8},(_,i)=>i),rng).slice(0,count));
  return Array.from({length:8},(_,i)=>picked.has(i));
 }
 function normalizePowTurns(value,rate,rng){
  return Array.isArray(value)&&value.length===8?value.map(Boolean):selectPowTurns(rate,rng);
 }
 function prepare(state,rate,rng=Math.random,forcedPowTurns=null){
  const c=calibration(rate??state.target),powTurns=normalizePowTurns(forcedPowTurns??state.powTurns,c.rate,rng);
  R.sweepBonusHundredths=REVERSAL_BONUS;
  return {...state,target:c.rate,
   rack:(state.rack||baseRack).slice(),lastRack:(state.lastRack||state.rack||baseRack).slice(),
   powTurns,lastPowActive:false,lastHammerRange:0,lastKnockRows:[],lastPowerGain:false,
   reversalBonusHundredths:REVERSAL_BONUS,
   bonusHundredths:(state.reversalCount||0)*REVERSAL_BONUS,
   totalHundredths:(state.baseHundredths||0)+(state.reversalCount||0)*REVERSAL_BONUS};
 }
 function create(options={}){
  const rng=options.rng||Math.random,rate=clampRate(options.target);
  const patternName=options.patternName||pickMold(rate,rng);
  const state=baseCreate({...options,rng,target:rate,patternName});
  const powTurns=selectPowTurns(rate,rng);
  return prepare({...state,rack:baseRack.slice(),lastRack:baseRack.slice(),grade:0,lastGrade:0},rate,rng,powTurns);
 }
 function knockRowsFor(row,powActive){
  if(!row)return [];
  return (powActive?[row+1,row,row-1]:[row]).filter(n=>n>=1&&n<=13).sort((a,b)=>b-a);
 }
 function project(state,number){
  const move=baseProject(state,number);if(!move)return null;
  const row=Math.min(13,move.lastFlips||0),powActive=!!state.powTurns?.[state.draws.length];
  const lastKnockRows=knockRowsFor(row,powActive);
  return {...move,powActive,lastPowActive:powActive,lastKnockRows,hammerRange:lastKnockRows.length};
 }
 function nextRack(rack,rows,grade){
  if(!rows.length)return rack;
  const next=rack.slice();
  for(const row of rows)next.splice(row,1);
  for(let i=0;i<rows.length;i++)next.push(topPrizeHundredths(grade+i));
  return next;
 }
 function draw(state,number){
  if(state.phase!=='playing')return null;
  const move=baseProject(state,number);if(!move)return null;
  const turnIndex=state.draws.length,powActive=!!state.powTurns?.[turnIndex];
  const {placed,flipped,lastFlips,lastColor,lastReversal}=move;
  const row=Math.min(13,lastFlips||0),lastKnockRows=knockRowsFor(row,powActive);
  const lastRack=state.rack,lastGrade=state.grade||0,rack=nextRack(lastRack,lastKnockRows,lastGrade);
  const colors=placed.length?state.colors.slice():state.colors;
  if(placed.length)colors[placed[0]]=lastColor;
  for(const i of flipped)colors[i]=lastColor;
  const draws=[...state.draws,number],lastBaseHundredths=R.award(lastFlips,lastRack);
  const baseHundredths=state.baseHundredths+lastBaseHundredths;
  const bonusEvents=lastReversal?[...state.bonusEvents,lastReversal]:state.bonusEvents;
  R.sweepBonusHundredths=REVERSAL_BONUS;
  const bonusHundredths=bonusEvents.length*REVERSAL_BONUS,totalHundredths=baseHundredths+bonusHundredths;
  return {...state,...move,colors,draws,rack,lastRack,lastKnockRow:row||null,lastKnockRows,lastHammerRange:lastKnockRows.length,
   lastGrade,grade:lastGrade+lastKnockRows.length,lastPowActive:powActive,lastPowerGain:false,
   turnTotals:[...state.turnTotals,totalHundredths],previousMaxFlips:state.maxFlips,maxFlips:Math.max(state.maxFlips,lastFlips),
   bonusEvents,reversalCount:bonusEvents.length,reversalThisMove:!!lastReversal,highestRole:bonusEvents.length>0,
   lastBaseHundredths,baseHundredths,bonusHundredths,totalHundredths,reversalBonusHundredths:REVERSAL_BONUS,
   phase:draws.length===8?'done':'playing'};
 }
 R.create=create;R.project=project;R.draw=draw;
 R.balance=target=>{
  const c=calibration(target);
  return {normalPercent:c.normalPercent,bonusPercent:c.bonusPercent,totalPercent:c.totalPercent,
   eventsPerGame:c.eventsPerGame,gameProbability:c.gameProbability,fairMultiplier:c.fairMultiplier,
   bonusHundredths:REVERSAL_BONUS,powExpected:expectedPowCount(c.rate)};
 };
 R.payRows=baseRack.slice(1).map((hundredths,i)=>({count:i+1,hundredths}));
 R.topRefills=Array.from({length:64},(_,i)=>topPrizeHundredths(i));
 R.topPrizeHundredths=topPrizeHundredths;
 R.reversalBonusForTarget=()=>REVERSAL_BONUS;
 R.sweepBonusHundredths=REVERSAL_BONUS;
 R.createDemo=()=>{
  const demo=baseCreateDemo(),powTurns=[false,true,false,false,true,false,false,true];
  return {...demo,state:prepare({...demo.state,rack:baseRack.slice(),lastRack:baseRack.slice()},demo.state.target,Math.random,powTurns)};
 };

 const engine=W.engine;
 if(!engine.state?.draws?.length)engine.reset();
 else engine.state=prepare(engine.state,engine.state.target);

 function medal(bet,odds){return typeof window.medalWin==='function'?window.medalWin(bet,odds):Math.floor((bet||0)*odds/100);}
 function gainForTurn(state,index,bet){
  const accrued=state.turnTotals?.[index]||0,previous=index?state.turnTotals?.[index-1]||0:0;
  return Math.max(0,medal(bet,accrued)-medal(bet,previous));
 }
 function ensureTopRule(root){
  const pay=root.querySelector('.bs-pay');if(!pay)return;
  let rule=pay.querySelector('.bs-top-rule');
  if(!rule){rule=document.createElement('small');rule.className='bs-top-rule';pay.querySelector('.bs-pay-title')?.after(rule);}
  rule.textContent='新規上段 60000→75000→90000→120000→150000→225000→300000→以後+75000';
 }
 function ensureTurnMarkers(root,state){
  const rows=[...root.querySelectorAll('.bs-turn')],drawCount=state.draws.length;
  const activeIndex=engine.phase==='flipping'?Math.max(0,drawCount-1):drawCount;
  rows.forEach((row,i)=>{
   let mark=row.querySelector('.bs-turn-pow');
   if(!mark){mark=document.createElement('em');mark.className='bs-turn-pow';row.append(mark);}
   const scheduled=!!state.powTurns?.[i],active=scheduled&&i===activeIndex&&state.phase==='playing';
   row.classList.toggle('pow-scheduled',scheduled);
   row.classList.toggle('pow-active',active);
   row.classList.toggle('pow-used',scheduled&&i<drawCount&&!active);
   mark.hidden=!scheduled;mark.textContent=i<drawCount&&!active?'POW':'POW UP';
  });
 }
 function updateLadder(root,state){
  const ladder=root.querySelector('.bs-pay');if(!ladder)return;
  const rankStep=Number(ladder.dataset.rankStep||0),rows=state.lastKnockRows||[];
  const activeStrike=rankStep===1&&rows.length>0,maxRow=rows.length?Math.max(...rows):0,powStrike=!!state.lastPowActive&&rows.length>1;
  ladder.querySelectorAll('tbody tr[data-count]').forEach(tr=>{
   const count=Number(tr.dataset.count),hit=activeStrike&&rows.includes(count);
   tr.classList.toggle('pow-knock',powStrike&&hit);
   if(activeStrike)tr.dataset.motion=hit?'kick':count>maxRow?'fall':'stay';
   else if(rankStep>=3||!rows.length)tr.dataset.motion='stay';
  });
  const name=ladder.querySelector('.bs-ladder-name');
  if(name&&powStrike&&rankStep===1)name.textContent='POW UP　'+rows.length+'枠 HIT!';
  else if(name&&powStrike&&rankStep===2)name.textContent='POW MULTI GRADE UP!';
  else if(name&&rankStep>=3&&/^POW/.test(name.textContent))name.textContent='反転配当';
 }
 function rawDigits(text){
  return String(text||'').replace(/(\d+(?:\.\d+)?)万/g,(_,n)=>String(Math.round(Number(n)*10000))).replace(/,/g,'');
 }
 function normalizeNumberLabels(root){
  root.querySelectorAll('.bs-block span,.bs-turn-win,.bs-bonus strong,.bs-burst span').forEach(el=>{
   const text=rawDigits(el.textContent);if(text!==el.textContent)el.textContent=text;
  });
 }
 function removeLegacyPowPanel(root){root.querySelectorAll('.bs-pow-panel,.bs-pow-meter').forEach(el=>el.remove());}

 const fx={canvas:null,ctx:null,grid:null,timer:0,lastTick:0,lastPaint:0,drawCount:-1,moveStart:0,moveState:null,preview:new WeakMap()};
 const flipSpectrum=['#3f86ff','#24baff','#20dde7','#2ee7ad','#68e86b','#b4eb4e','#ffe45a','#ffbd43','#ff873e','#ff5d55','#ff4e91','#d956db','#8b55e8'];
 const clamp=x=>Math.max(0,Math.min(1,x));
 function ensureFx(root){
  const grid=root.querySelector('.bs-grid');if(!grid)return false;
  if(!fx.canvas||fx.grid!==grid){
   fx.canvas?.remove();fx.grid=grid;fx.canvas=document.createElement('canvas');fx.canvas.className='bs-fx-overlay';fx.canvas.setAttribute('aria-hidden','true');
   grid.append(fx.canvas);fx.ctx=fx.canvas.getContext('2d');
  }
  const rect=grid.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
  const w=Math.max(1,Math.round(rect.width*dpr)),h=Math.max(1,Math.round(rect.height*dpr));
  if(fx.canvas.width!==w||fx.canvas.height!==h){fx.canvas.width=w;fx.canvas.height=h;}
  return true;
 }
 function previewCells(state){
  let cached=fx.preview.get(state);if(cached)return cached;
  cached=new Map();
  if(state.phase==='playing')for(let number=1;number<=25;number++){
   const move=baseProject(state,number);if(!move?.flipped?.length)continue;
   for(const id of move.flipped)cached.set(id,(cached.get(id)||0)+1);
  }
  fx.preview.set(state,cached);return cached;
 }
 function rounded(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
 function drawIdleFx(ctx,state,now,size,rim,u){
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  ctx.save();rounded(ctx,rim,rim,size-2*rim,size-2*rim,u*.14);ctx.clip();
  if(!reduced){
   const phase=(now%7200)/7200,x=-size*.42+phase*size*1.84;
   const glow=ctx.createLinearGradient(x-size*.24,0,x+size*.24,0);
   glow.addColorStop(0,'rgba(255,255,255,0)');glow.addColorStop(.5,'rgba(255,247,199,.075)');glow.addColorStop(1,'rgba(255,255,255,0)');
   ctx.fillStyle=glow;ctx.fillRect(rim,rim,size-2*rim,size-2*rim);
  }
  ctx.restore();
  const candidates=previewCells(state),max=Math.max(1,...candidates.values());
  for(const [id,count] of candidates){
   const cx=rim+(id%8+.5)*u,cy=rim+((id>>3)+.5)*u;
   const wave=reduced?.55:.52+.48*Math.sin(now/780+id*.71),strength=count/max;
   ctx.save();ctx.translate(cx,cy);ctx.globalAlpha=.20+.22*wave+.10*strength;
   ctx.strokeStyle='#72eaff';ctx.lineWidth=Math.max(1,u*.045);rounded(ctx,-u*.39,-u*.39,u*.78,u*.78,u*.16);ctx.stroke();
   if(!reduced){
    ctx.rotate(now/2400+id*.37);ctx.strokeStyle='#fff4bd';ctx.lineWidth=Math.max(1,u*.026);ctx.setLineDash([u*.18,u*1.15]);
    ctx.lineDashOffset=-now/520;rounded(ctx,-u*.34,-u*.34,u*.68,u*.68,u*.14);ctx.stroke();
   }
   ctx.restore();
  }
 }
 function drawFlipPopups(ctx,state,now,size,rim,u){
  if(!state.flipSteps?.length)return;
  const elapsed=now-fx.moveStart,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  state.flipSteps.forEach((step,index)=>{
   const start=180+index*110+48,age=elapsed-start;if(age<0||age>620)return;
   const p=clamp(age/620),rise=reduced?0:u*(.16+.62*(1-(1-p)*(1-p))),alpha=(1-p)**1.25;
   const cx=rim+(step.id%8+.5)*u,cy=rim+((step.id>>3)+.44)*u-rise,color=flipSpectrum[Math.min(index,flipSpectrum.length-1)];
   ctx.save();ctx.translate(cx,cy);ctx.globalAlpha=alpha;
   const scale=reduced?1:.72+.42*Math.sin(Math.min(1,p*1.45)*Math.PI);ctx.scale(scale,scale);
   ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='1000 '+Math.max(11,u*.53)+'px SweetReachRounded,system-ui,sans-serif';
   ctx.lineJoin='round';ctx.lineWidth=Math.max(2,u*.095);ctx.strokeStyle='rgba(31,18,44,.88)';ctx.strokeText(String(index+1),0,0);
   ctx.lineWidth=Math.max(1,u*.045);ctx.strokeStyle='#fff8db';ctx.strokeText(String(index+1),0,0);
   ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=u*.20;ctx.fillText(String(index+1),0,0);ctx.restore();
  });
 }
 function paintFx(now){
  const root=document.querySelector('.bs-scene');if(!root||!ensureFx(root))return;
  const ctx=fx.ctx,canvas=fx.canvas,state=engine.state,w=canvas.width,h=canvas.height,size=Math.min(w,h),ox=(w-size)/2,oy=(h-size)/2,rim=size*.064,u=(size-2*rim)/8;
  ctx.clearRect(0,0,w,h);ctx.save();ctx.translate(ox,oy);
  if(engine.running&&engine.phase!=='flipping'&&state.phase==='playing')drawIdleFx(ctx,state,now,size,rim,u);
  if(engine.phase==='flipping')drawFlipPopups(ctx,state,now,size,rim,u);
  ctx.restore();
 }
 function scheduleFx(delay=55){
  clearTimeout(fx.timer);fx.timer=setTimeout(()=>requestAnimationFrame(fxTick),delay);
 }
 function fxTick(now){
  const root=document.querySelector('.bs-scene'),active=document.body.classList.contains('bs-active');
  if(!root){scheduleFx(250);return;}
  const state=engine.state,delta=fx.lastTick?Math.max(0,now-fx.lastTick):0;fx.lastTick=now;
  if(document.hidden||engine.paused){if(fx.moveStart)fx.moveStart+=delta;scheduleFx(140);return;}
  if(state.draws.length!==fx.drawCount){
   fx.drawCount=state.draws.length;fx.moveState=state;fx.moveStart=now;
  }else if(engine.phase==='flipping'&&fx.moveState!==state){fx.moveState=state;fx.moveStart=now;}
  if(active&&now-fx.lastPaint>=45){fx.lastPaint=now;paintFx(now);}
  else if(!active&&fx.ctx)fx.ctx.clearRect(0,0,fx.canvas.width,fx.canvas.height);
  scheduleFx(active?45:220);
 }

 let lastVersion=engine.version,lastStatusKey='';
 function decorate(){
  const state=engine.state,root=document.querySelector('.bs-scene');if(!state||!root)return;
  if(lastVersion!==engine.version){lastVersion=engine.version;lastStatusKey='';fx.preview=new WeakMap();fx.drawCount=state.draws.length;fx.moveState=state;}
  removeLegacyPowPanel(root);ensureTopRule(root);ensureTurnMarkers(root,state);updateLadder(root,state);normalizeNumberLabels(root);ensureFx(root);

  const bet=engine.roundBet||0,bonus=REVERSAL_BONUS,bonusLabel='3000倍';
  const prize=root.querySelector('.bs-bonus');
  if(prize){
   prize.title='リバーサルボーナス　固定'+bonusLabel;
   const strong=prize.querySelector('strong');
   if(strong)strong.textContent=(state.reversalCount?'獲得 '+state.reversalCount+'回 · ':'')+String(medal(bet,bonus))+' WIN';
  }
  const burst=root.querySelector('.bs-burst:not([hidden]) span');
  if(burst)burst.textContent=bonusLabel+'！ ＋'+String(medal(bet,bonus))+' WIN';
  normalizeNumberLabels(root);

  const balance=R.balance(state.target),statusKey=[state.target,REVERSAL_BONUS,state.powTurns?.join('')].join('/');
  if(statusKey!==lastStatusKey){
   lastStatusKey=statusKey;
   const note=document.getElementById('waffle-payout-status');
   if(note)note.textContent='ワッフルリバーシ　通常・POW抽選込み '+balance.normalPercent.toFixed(1)+'% ／ リバーサル '+balance.bonusPercent.toFixed(1)+'% ／ 合計 '+balance.totalPercent.toFixed(1)+'%';
  }

  // Base view may rewrite the turn result after this extension; restore raw digits and POW markers.
  const gains=state.turnTotals||[];
  root.querySelectorAll('.bs-turn').forEach((row,i)=>{
   const win=row.querySelector('.bs-turn-win');if(!win||i>=state.draws.length)return;
   const gain=gainForTurn(state,i,bet);win.textContent=gain>0?String(gain):'';
  });
 }
 const lesson=window.SweetsAttractLessons?.stick;
 if(lesson?.steps?.[3]){
  lesson.steps[3].title='POW UP球は前後の枠も破壊';
  lesson.steps[3].caption='8球の順番表でPOW UPと表示された球だけ、反転枚数の枠と上下1枠を破壊。盤面外番号ではPOWは増えない。';
 }
 decorate();setInterval(decorate,80);scheduleFx(20);
 window.WafflePowV159={version:VERSION,topPrizeHundredths,expectedPowCount,refresh:decorate};
}
install();
})();

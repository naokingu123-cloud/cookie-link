/* SWEETS LINK v158 — Waffle Reversi POW hammer and calibrated reversal bonus. */
(()=>{
'use strict';
const VERSION='v158';
if(window.SweetsLineup&&!window.SweetsLineup.chosen?.includes('stick'))return;
if(window.WafflePowV158?.version===VERSION)return;
window.WafflePowV158={version:VERSION};

function addStyle(){
 if(document.getElementById('waffle-pow-v158-css'))return;
 const link=document.createElement('link');
 link.id='waffle-pow-v158-css';link.rel='stylesheet';
 link.href='assets/waffle-pow-v158.css?v=158';
 document.head.append(link);
}
addStyle();

function install(){
 const R=window.BingoStickRules,W=window.BingoStick;
 if(!R||!W?.engine){setTimeout(install,40);return;}
 if(R.__powV158)return;
 R.__powV158=true;

 const baseCreate=R.create,baseProject=R.project,baseCreateDemo=R.createDemo;
 const baseRack=[0,10,20,30,40,50,60,70,80,90,100,120,140,150];
 const topRefills=[200,500,1000,2000,5000,7500,10000,15000];
 const drawOrders=43609104000;
 const molds=[
  {name:'千鳥',normal:26.0020,events:233424/drawOrders,games:233424/drawOrders},
  {name:'小花',normal:27.7750,events:14512/drawOrders,games:14512/drawOrders},
  {name:'飛石',normal:46.1582,events:25920/drawOrders,games:25920/drawOrders},
  {name:'小紋',normal:88.1422,events:979056/drawOrders,games:967464/drawOrders},
  {name:'双葉',normal:111.5682,events:2880/drawOrders,games:2880/drawOrders},
  {name:'花菱',normal:139.1506,events:171720/drawOrders,games:171720/drawOrders},
  {name:'風車',normal:201.1714,events:8/drawOrders,games:8/drawOrders},
  {name:'花窓',normal:211.7878,events:720/drawOrders,games:720/drawOrders},
  {name:'組市松',normal:191.6288,events:4844/drawOrders,games:4844/drawOrders}
 ];
 const clampRate=value=>Math.max(50,Math.min(150,Number.isFinite(Number(value))?Number(value):90));
 function mixtureFor(target){
  const desired=clampRate(target)-5;
  let left=-1,right=1;
  for(let i=0;i<48;i++){
   const t=(left+right)/2,raw=molds.map(m=>Math.exp((m.normal-90)*t)),sum=raw.reduce((a,b)=>a+b,0);
   const mean=raw.reduce((a,w,j)=>a+w*molds[j].normal,0)/sum;
   if(mean<desired)left=t;else right=t;
  }
  const t=(left+right)/2,raw=molds.map(m=>Math.exp((m.normal-90)*t)),sum=raw.reduce((a,b)=>a+b,0);
  return raw.map(w=>w/sum);
 }
 const mixtures=Array.from({length:101},(_,i)=>mixtureFor(i+50));
 const weightsFor=rate=>Number.isInteger(rate)?mixtures[rate-50]:mixtureFor(rate);
 function calibration(target=90){
  const rate=clampRate(target),weights=weightsFor(rate);
  const mean=key=>molds.reduce((sum,m,i)=>sum+m[key]*weights[i],0);
  const normalPercent=mean('normal'),eventsPerGame=mean('events'),gameProbability=mean('games');
  const bonusHundredths=eventsPerGame>0?Math.max(10,Math.round((5/eventsPerGame)/10)*10):5000;
  const bonusPercent=eventsPerGame*bonusHundredths;
  return {rate,weights,normalPercent,eventsPerGame,gameProbability,bonusHundredths,
   bonusPercent,totalPercent:normalPercent+bonusPercent,fairMultiplier:bonusHundredths/100};
 }
 function pickMold(rate,rng){
  let pick=rng(),chosen=molds.at(-1).name;
  const weights=weightsFor(rate);
  for(let i=0;i<molds.length;i++){pick-=weights[i];if(pick<0){chosen=molds[i].name;break;}}
  return chosen;
 }
 function prepare(state,rate){
  const c=calibration(rate??state.target),powerTurns=Array.isArray(state.powerTurns)?state.powerTurns.slice():
   (state.draws||[]).map(n=>(state.offBoardNumbers||[]).includes(n));
  const pow=Math.min(5,Number.isFinite(state.pow)?state.pow:powerTurns.filter(Boolean).length);
  R.sweepBonusHundredths=c.bonusHundredths;
  return {...state,target:c.rate,rack:(state.rack||baseRack).slice(),lastRack:(state.lastRack||state.rack||baseRack).slice(),
   pow,powMax:5,powerTurns,lastPowerGain:false,lastHammerRange:0,lastKnockRows:[],
   reversalBonusHundredths:c.bonusHundredths,
   bonusHundredths:(state.reversalCount||0)*c.bonusHundredths,
   totalHundredths:(state.baseHundredths||0)+(state.reversalCount||0)*c.bonusHundredths};
 }
 function create(options={}){
  const rng=options.rng||Math.random,rate=clampRate(options.target);
  const patternName=options.patternName||pickMold(rate,rng);
  const state=baseCreate({...options,rng,target:rate,patternName});
  return prepare({...state,rack:baseRack.slice(),lastRack:baseRack.slice(),grade:0,lastGrade:0},rate);
 }
 function project(state,number){
  const move=baseProject(state,number);if(!move)return null;
  const powerGain=!move.placed.length&&(state.offBoardNumbers||[]).includes(number);
  const row=Math.min(13,move.lastFlips||0),hammerRange=row?Math.min(row,Math.min(5,1+(state.pow||0))):0;
  return {...move,powerGain,hammerRange};
 }
 function nextRack(rack,rows,grade){
  if(!rows.length)return rack;
  const next=rack.slice();
  for(const row of rows)next.splice(row,1);
  for(let i=0;i<rows.length;i++)next.push(topRefills[Math.min(topRefills.length-1,grade+i)]);
  return next;
 }
 function draw(state,number){
  if(state.phase!=='playing')return null;
  const move=baseProject(state,number);if(!move)return null;
  const powerGain=!move.placed.length&&(state.offBoardNumbers||[]).includes(number);
  const previousPow=state.pow||0,pow=Math.min(5,previousPow+Number(powerGain));
  const {placed,flipped,lastFlips,lastColor,lastReversal}=move;
  const row=Math.min(13,lastFlips||0),range=row?Math.min(row,Math.min(5,1+previousPow)):0;
  const lastKnockRows=Array.from({length:range},(_,i)=>row-i);
  const lastRack=state.rack,lastGrade=state.grade||0,rack=nextRack(lastRack,lastKnockRows,lastGrade);
  const colors=placed.length?state.colors.slice():state.colors;
  if(placed.length)colors[placed[0]]=lastColor;
  for(const i of flipped)colors[i]=lastColor;
  const draws=[...state.draws,number],lastBaseHundredths=R.award(lastFlips,lastRack);
  const baseHundredths=state.baseHundredths+lastBaseHundredths;
  const bonusEvents=lastReversal?[...state.bonusEvents,lastReversal]:state.bonusEvents;
  const reversalBonusHundredths=state.reversalBonusHundredths||calibration(state.target).bonusHundredths;
  R.sweepBonusHundredths=reversalBonusHundredths;
  const bonusHundredths=bonusEvents.length*reversalBonusHundredths,totalHundredths=baseHundredths+bonusHundredths;
  return {...state,...move,colors,draws,rack,lastRack,lastKnockRow:row||null,lastKnockRows,lastHammerRange:range,
   lastGrade,grade:lastGrade+lastKnockRows.length,pow,powMax:5,lastPowerGain:powerGain,
   powerTurns:[...(state.powerTurns||[]),powerGain],turnTotals:[...state.turnTotals,totalHundredths],
   previousMaxFlips:state.maxFlips,maxFlips:Math.max(state.maxFlips,lastFlips),bonusEvents,
   reversalCount:bonusEvents.length,reversalThisMove:!!lastReversal,highestRole:bonusEvents.length>0,
   lastBaseHundredths,baseHundredths,bonusHundredths,totalHundredths,reversalBonusHundredths,
   phase:draws.length===8?'done':'playing'};
 }
 R.create=create;R.project=project;R.draw=draw;
 R.balance=target=>{
  const c=calibration(target);
  return {normalPercent:c.normalPercent,bonusPercent:c.bonusPercent,totalPercent:c.totalPercent,
   eventsPerGame:c.eventsPerGame,gameProbability:c.gameProbability,fairMultiplier:c.fairMultiplier,
   bonusHundredths:c.bonusHundredths};
 };
 R.payRows=baseRack.slice(1).map((hundredths,i)=>({count:i+1,hundredths}));
 R.topRefills=topRefills.slice();
 R.reversalBonusForTarget=target=>calibration(target).bonusHundredths;
 R.createDemo=()=>{const demo=baseCreateDemo();return {...demo,state:prepare(demo.state,demo.state.target)};};

 const engine=W.engine;
 if(!engine.state?.draws?.length)engine.reset();
 else engine.state=prepare(engine.state,engine.state.target);

 let lastVersion=engine.version,lastDrawCount=engine.state.draws.length,lastStatusKey='';
 function medal(bet,odds){return typeof window.medalWin==='function'?window.medalWin(bet,odds):Math.floor((bet||0)*odds/100);}
 function decorate(){
  const state=engine.state,root=document.querySelector('.bs-scene');if(!state||!root)return;
  if(lastVersion!==engine.version){lastVersion=engine.version;lastDrawCount=state.draws.length;}
  const status=root.querySelector('.bs-status');
  let meter=root.querySelector('.bs-pow-meter');
  if(!meter&&status){
   meter=document.createElement('span');meter.className='bs-pow-meter';meter.innerHTML='<small>HAMMER</small><strong>POW</strong><b>0</b><i>/5</i>';
   status.append(meter);
  }
  if(meter){meter.querySelector('b').textContent=state.pow||0;meter.dataset.pow=state.pow||0;meter.title='次回以降、最大'+Math.min(5,1+(state.pow||0))+'枠を吹き飛ばします';}
  const powerTurns=state.powerTurns||[];
  root.querySelectorAll('.bs-turn').forEach((row,i)=>{
   const on=!!powerTurns[i],win=row.querySelector('.bs-turn-win');row.classList.toggle('pow-gain',on);
   if(on&&win){win.textContent='POW+1';win.style.fontSize='';}
  });
  const ladder=root.querySelector('.bs-pay'),rankStep=Number(ladder?.dataset.rankStep||0),rows=state.lastKnockRows||[];
  if(ladder){
   ladder.querySelectorAll('tbody tr[data-count]').forEach(tr=>{
    const count=Number(tr.dataset.count),hit=rankStep>0&&rows.includes(count);
    tr.classList.toggle('pow-knock',hit);
    if(rankStep>0&&rows.length){tr.dataset.motion=hit?'kick':count>Math.max(...rows)?'fall':'stay';}
   });
   const name=ladder.querySelector('.bs-ladder-name');
   if(name&&rankStep===1&&rows.length)name.textContent='POW '+rows.length+'　'+Math.min(...rows)+'〜'+Math.max(...rows)+'枚枠 HIT!';
   else if(name&&rankStep===2&&rows.length>1)name.textContent='MULTI GRADE UP!';
  }
  const bonus=state.reversalBonusHundredths||R.sweepBonusHundredths,bet=engine.roundBet||0;
  const bonusLabel=(bonus/100).toLocaleString('ja-JP',{maximumFractionDigits:1})+'倍';
  const prize=root.querySelector('.bs-bonus');
  if(prize){
   prize.title='リバーサルボーナス　'+bonusLabel+'（期待値 約5%）';
   const strong=prize.querySelector('strong');
   if(strong)strong.textContent=(state.reversalCount?'獲得 '+state.reversalCount+'回 · ':'')+medal(bet,bonus).toLocaleString('ja-JP')+' WIN';
  }
  const burst=root.querySelector('.bs-burst:not([hidden]) span');
  if(burst)burst.textContent=bonusLabel+'！ ＋'+medal(bet,bonus).toLocaleString('ja-JP')+' WIN';
  const balance=R.balance(state.target),statusKey=[state.target,balance.bonusHundredths].join('/');
  if(statusKey!==lastStatusKey){
   lastStatusKey=statusKey;
   const note=document.getElementById('waffle-payout-status');
   if(note)note.textContent='ワッフルリバーシ　通常 '+balance.normalPercent.toFixed(1)+'% ／ リバーサル '+balance.bonusPercent.toFixed(1)+'%（'+bonusLabel+'）／ 合計 '+balance.totalPercent.toFixed(1)+'%';
  }
  if(state.draws.length>lastDrawCount){
   lastDrawCount=state.draws.length;
   if(state.lastPowerGain){
    const text='ワッフルリバーシ　POW+1！ 次回は最大'+Math.min(5,1+(state.pow||0))+'枠を粉砕！';
    if(window.SweetsEventTicker?.enqueue)window.SweetsEventTicker.enqueue(text,{key:'waffle-pow:'+engine.version+':'+state.draws.length,badge:'POW+1',level:'hot',priority:55,duration:3600,cooldown:0});
    else if(typeof window.announceAchievement==='function')window.announceAchievement(text);
   }
  }
 }
 const lesson=window.SweetsAttractLessons?.stick;
 if(lesson?.steps?.[3]){
  lesson.steps[3].title='盤面外の5番号でPOW+1';
  lesson.steps[3].caption='次回以降、反転枚数の枠から下方向へ吹き飛ばす範囲が拡大。最大5枠。';
 }
 decorate();setInterval(decorate,100);
}
install();
})();

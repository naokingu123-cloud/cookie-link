/* SWEETS LINK v159 — Waffle Reversi POW gauge, unlimited top ladder and fixed 3000x reversal bonus. */
(()=>{
'use strict';
const VERSION='v160';
if(window.SweetsLineup&&!window.SweetsLineup.chosen?.includes('stick'))return;
if(window.WafflePowV159?.version===VERSION)return;
window.WafflePowV159={version:VERSION};

function addStyle(){
 if(document.getElementById('waffle-pow-v159-css'))return;
 const link=document.createElement('link');
 link.id='waffle-pow-v159-css';link.rel='stylesheet';
 link.href='assets/waffle-pow-v159.css?v=159';
 document.head.append(link);
}
addStyle();

function install(){
 const R=window.BingoStickRules,W=window.BingoStick;
 if(!R||!W?.engine){setTimeout(install,40);return;}
 if(R.__powV159)return;
 R.__powV159=true;

 const baseCreate=R.create,baseProject=R.project,baseCreateDemo=R.createDemo;
 const baseRack=[0,10,20,30,40,50,60,70,80,90,100,120,140,150];
 const REVERSAL_BONUS=300000; // 3000.0x; odds are stored in hundredths.
 const TOP_START=5000;        // 50x: 150,000 WIN at 3,000 BET.
 const TOP_STEP=2500;         // +25x: +75,000 WIN at 3,000 BET, with no cap.
 const topPrizeHundredths=index=>TOP_START+TOP_STEP*Math.max(0,Math.trunc(index));
 const drawOrders=43609104000;
 const molds=[
  {name:'千鳥',normal:26.0885,events:233424/drawOrders,games:233424/drawOrders},
  {name:'小花',normal:27.7561,events:14512/drawOrders,games:14512/drawOrders},
  {name:'飛石',normal:46.6106,events:25920/drawOrders,games:25920/drawOrders},
  {name:'小紋',normal:88.9441,events:979056/drawOrders,games:967464/drawOrders},
  {name:'双葉',normal:163.5310,events:2880/drawOrders,games:2880/drawOrders},
  {name:'花菱',normal:162.8194,events:171720/drawOrders,games:171720/drawOrders},
  {name:'風車',normal:334.3881,events:8/drawOrders,games:8/drawOrders},
  {name:'花窓',normal:378.9882,events:720/drawOrders,games:720/drawOrders},
  {name:'組市松',normal:340.3721,events:4844/drawOrders,games:4844/drawOrders}
 ];
 const clampRate=value=>Math.max(50,Math.min(150,Number.isFinite(Number(value))?Number(value):90));
 const moldTotal=m=>m.normal+m.events*REVERSAL_BONUS;
 function mixtureFor(target){
  const desired=clampRate(target);
  let left=-1,right=1;
  for(let i=0;i<52;i++){
   const t=(left+right)/2,raw=molds.map(m=>Math.exp((moldTotal(m)-90)*t)),sum=raw.reduce((a,b)=>a+b,0);
   const mean=raw.reduce((a,w,j)=>a+w*moldTotal(molds[j]),0)/sum;
   if(mean<desired)left=t;else right=t;
  }
  const t=(left+right)/2,raw=molds.map(m=>Math.exp((moldTotal(m)-90)*t)),sum=raw.reduce((a,b)=>a+b,0);
  return raw.map(w=>w/sum);
 }
 const mixtures=Array.from({length:101},(_,i)=>mixtureFor(i+50));
 const weightsFor=rate=>Number.isInteger(rate)?mixtures[rate-50]:mixtureFor(rate);
 function calibration(target=90){
  const rate=clampRate(target),weights=weightsFor(rate);
  const mean=key=>molds.reduce((sum,m,i)=>sum+m[key]*weights[i],0);
  const normalPercent=mean('normal'),eventsPerGame=mean('events'),gameProbability=mean('games');
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
 function prepare(state,rate){
  const c=calibration(rate??state.target),powerTurns=Array.isArray(state.powerTurns)?state.powerTurns.slice():
   (state.draws||[]).map(n=>(state.offBoardNumbers||[]).includes(n));
  const pow=Math.min(5,Number.isFinite(state.pow)?state.pow:powerTurns.filter(Boolean).length);
  R.sweepBonusHundredths=REVERSAL_BONUS;
  return {...state,target:c.rate,rack:(state.rack||baseRack).slice(),lastRack:(state.lastRack||state.rack||baseRack).slice(),
   pow,powMax:5,powerTurns,lastPowerGain:false,lastHammerRange:0,lastKnockRows:[],
   reversalBonusHundredths:REVERSAL_BONUS,
   bonusHundredths:(state.reversalCount||0)*REVERSAL_BONUS,
   totalHundredths:(state.baseHundredths||0)+(state.reversalCount||0)*REVERSAL_BONUS};
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
  // Rows arrive from the hit row downward, so their indices are descending and safe to splice.
  for(const row of rows)next.splice(row,1);
  for(let i=0;i<rows.length;i++)next.push(topPrizeHundredths(grade+i));
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
  R.sweepBonusHundredths=REVERSAL_BONUS;
  const bonusHundredths=bonusEvents.length*REVERSAL_BONUS,totalHundredths=baseHundredths+bonusHundredths;
  return {...state,...move,colors,draws,rack,lastRack,lastKnockRow:row||null,lastKnockRows,lastHammerRange:range,
   lastGrade,grade:lastGrade+lastKnockRows.length,pow,powMax:5,lastPowerGain:powerGain,
   powerTurns:[...(state.powerTurns||[]),powerGain],turnTotals:[...state.turnTotals,totalHundredths],
   previousMaxFlips:state.maxFlips,maxFlips:Math.max(state.maxFlips,lastFlips),bonusEvents,
   reversalCount:bonusEvents.length,reversalThisMove:!!lastReversal,highestRole:bonusEvents.length>0,
   lastBaseHundredths,baseHundredths,bonusHundredths,totalHundredths,reversalBonusHundredths:REVERSAL_BONUS,
   phase:draws.length===8?'done':'playing'};
 }
 R.create=create;R.project=project;R.draw=draw;
 R.balance=target=>{
  const c=calibration(target);
  return {normalPercent:c.normalPercent,bonusPercent:c.bonusPercent,totalPercent:c.totalPercent,
   eventsPerGame:c.eventsPerGame,gameProbability:c.gameProbability,fairMultiplier:c.fairMultiplier,
   bonusHundredths:REVERSAL_BONUS};
 };
 R.payRows=baseRack.slice(1).map((hundredths,i)=>({count:i+1,hundredths}));
 // Compatibility preview only; actual runtime values use topPrizeHundredths and never cap.
 R.topRefills=Array.from({length:64},(_,i)=>topPrizeHundredths(i));
 R.topPrizeHundredths=topPrizeHundredths;
 R.reversalBonusForTarget=()=>REVERSAL_BONUS;
 R.sweepBonusHundredths=REVERSAL_BONUS;
 R.createDemo=()=>{const demo=baseCreateDemo();return {...demo,state:prepare(demo.state,demo.state.target)};};

 const engine=W.engine;
 if(!engine.state?.draws?.length)engine.reset();
 else engine.state=prepare(engine.state,engine.state.target);

 let lastVersion=engine.version,lastDrawCount=engine.state.draws.length,lastStatusKey='';
 function medal(bet,odds){return typeof window.medalWin==='function'?window.medalWin(bet,odds):Math.floor((bet||0)*odds/100);}
 function gainForTurn(state,index,bet){
  const accrued=state.turnTotals?.[index]||0,previous=index?state.turnTotals?.[index-1]||0:0;
  return Math.max(0,medal(bet,accrued)-medal(bet,previous));
 }
 function ensurePowPanel(root,status){
  root.querySelector('.bs-pow-meter')?.remove();
  let panel=root.querySelector('.bs-pow-panel');
  const board=root.querySelector('.bs-board');
  if(!board)return panel;
  if(!panel){
   panel=document.createElement('section');panel.className='bs-pow-panel';panel.setAttribute('aria-label','ハンマーPOW');
   panel.innerHTML='<div class="bs-pow-targets"><small>POW番号</small><span class="bs-pow-target-list"></span></div>'+
    '<div class="bs-pow-gauge-row"><strong>HAMMER POW</strong><span class="bs-pow-gauge" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span><b class="bs-pow-count">0/5</b></div>'+
    '<div class="bs-pow-next"><small>次回効果</small><span>最大1枠破壊</span></div>';
  }
  // Keep POW UI out of .bs-tools/.bs-status. The view computes board size from
  // the tool height, so placing it there can collapse the canvas on narrow phones.
  if(panel.parentElement!==board)board.append(panel);
  return panel;
 }
 function updatePowPanel(panel,state){
  if(!panel)return;
  const pow=Math.min(5,state.pow||0),drawn=new Set(state.draws||[]),targets=state.offBoardNumbers||[];
  const list=panel.querySelector('.bs-pow-target-list');
  const key=targets.join('/');
  if(list.dataset.key!==key){
   list.dataset.key=key;list.replaceChildren(...targets.map(number=>{
    const chip=document.createElement('b');chip.dataset.number=number;chip.textContent=number;return chip;
   }));
  }
  list.querySelectorAll('b').forEach(chip=>chip.classList.toggle('is-hit',drawn.has(Number(chip.dataset.number))));
  panel.querySelectorAll('.bs-pow-gauge i').forEach((cell,i)=>cell.classList.toggle('is-on',i<pow));
  panel.querySelector('.bs-pow-count').textContent=pow+'/5';
  panel.querySelector('.bs-pow-next span').textContent='最大'+Math.min(5,1+pow)+'枠破壊';
  panel.dataset.pow=pow;
  panel.title='POW対象 '+targets.join('・')+'。現在POW '+pow+'/5。次回以降は最大'+Math.min(5,1+pow)+'枠を吹き飛ばします';
 }
 function ensureTopRule(root){
  const pay=root.querySelector('.bs-pay');if(!pay||pay.querySelector('.bs-top-rule'))return;
  const rule=document.createElement('small');rule.className='bs-top-rule';
  rule.textContent='新規上段 50倍 → 75倍 → 100倍…　以後＋25倍・上限なし';
  pay.querySelector('.bs-pay-title')?.after(rule);
 }
 function decorate(){
  const state=engine.state,root=document.querySelector('.bs-scene');if(!state||!root)return;
  if(lastVersion!==engine.version){lastVersion=engine.version;lastDrawCount=state.draws.length;lastStatusKey='';}
  const status=root.querySelector('.bs-status'),panel=ensurePowPanel(root,status);
  updatePowPanel(panel,state);ensureTopRule(root);

  const bet=engine.roundBet||0,powerTurns=state.powerTurns||[];
  root.querySelectorAll('.bs-turn').forEach((row,i)=>{
   const on=!!powerTurns[i],win=row.querySelector('.bs-turn-win');row.classList.toggle('pow-gain',on);
   if(!win)return;
   if(on){win.dataset.powLabel='1';win.textContent='POW+1';win.style.fontSize='';}
   else if(win.dataset.powLabel){delete win.dataset.powLabel;const gain=gainForTurn(state,i,bet);win.textContent=gain>0?String(gain):'';}
  });

  const ladder=root.querySelector('.bs-pay'),rankStep=Number(ladder?.dataset.rankStep||0),rows=state.lastKnockRows||[];
  if(ladder){
   const activeStrike=rankStep===1&&rows.length>0,maxRow=rows.length?Math.max(...rows):0;
   ladder.querySelectorAll('tbody tr[data-count]').forEach(tr=>{
    const count=Number(tr.dataset.count),hit=activeStrike&&rows.includes(count);
    tr.classList.toggle('pow-knock',hit);
    if(activeStrike)tr.dataset.motion=hit?'kick':count>maxRow?'fall':'stay';
    else if(rankStep>=3||!rows.length)tr.dataset.motion='stay';
   });
   const name=ladder.querySelector('.bs-ladder-name');
   if(name&&rankStep===1&&rows.length)name.textContent='POW '+rows.length+'　'+Math.min(...rows)+'〜'+Math.max(...rows)+'枚枠 HIT!';
   else if(name&&rankStep===2&&rows.length>1)name.textContent='MULTI GRADE UP!';
   else if(name&&rankStep>=3&&/^(POW|MULTI)/.test(name.textContent))name.textContent='反転配当';
  }

  const bonus=REVERSAL_BONUS,bonusLabel='3,000倍';
  const prize=root.querySelector('.bs-bonus');
  if(prize){
   prize.title='リバーサルボーナス　固定'+bonusLabel;
   const strong=prize.querySelector('strong');
   if(strong)strong.textContent=(state.reversalCount?'獲得 '+state.reversalCount+'回 · ':'')+medal(bet,bonus).toLocaleString('ja-JP')+' WIN';
  }
  const burst=root.querySelector('.bs-burst:not([hidden]) span');
  if(burst)burst.textContent=bonusLabel+'！ ＋'+medal(bet,bonus).toLocaleString('ja-JP')+' WIN';
  const balance=R.balance(state.target),statusKey=[state.target,REVERSAL_BONUS].join('/');
  if(statusKey!==lastStatusKey){
   lastStatusKey=statusKey;
   const note=document.getElementById('waffle-payout-status');
   if(note)note.textContent='ワッフルリバーシ　通常 '+balance.normalPercent.toFixed(1)+'% ／ リバーサル '+balance.bonusPercent.toFixed(1)+'%（固定3,000倍）／ 合計 '+balance.totalPercent.toFixed(1)+'%';
  }
  if(state.draws.length>lastDrawCount){
   lastDrawCount=state.draws.length;
   if(state.lastPowerGain){
    const targets=(state.offBoardNumbers||[]).join('・');
    const text='ワッフルリバーシ　POW+1！ 対象番号 '+targets+' ／ 次回は最大'+Math.min(5,1+(state.pow||0))+'枠を粉砕！';
    if(window.SweetsEventTicker?.enqueue)window.SweetsEventTicker.enqueue(text,{key:'waffle-pow:'+engine.version+':'+state.draws.length,badge:'POW+1',level:'hot',priority:55,duration:3900,cooldown:0});
    else if(typeof window.announceAchievement==='function')window.announceAchievement(text);
   }
  }
 }
 const lesson=window.SweetsAttractLessons?.stick;
 if(lesson?.steps?.[3]){
  lesson.steps[3].title='盤面外の5番号でPOW+1';
  lesson.steps[3].caption='表示された5番号でゲージ上昇。次回以降、該当枠から下へ最大5枠を破壊。新規上段は50倍から25倍ずつ上昇し、上限なし。';
 }
 decorate();setInterval(decorate,100);
}
install();
})();

/* v248: stream already-computed per-game next-HIT increases and their
 * own-BET award tiers, without treating unfinished boards as zero. */
(()=>{
'use strict';
function patch(source){
 const begin=source.indexOf('function currentDetail('),end=source.indexOf('\nfunction readReachCache(',begin);
 if(begin<0||end<=begin||source.includes('SweetsStationProgressiveV246_SOURCE'))throw Error('[StationsProgressive246] unexpected source boundary');
 const replacement=`// SweetsStationProgressiveV246_SOURCE: all sums are independently confirmed
// by each game's existing reach cache.  A partial sum is a lower bound, never
// a claim that unfinished games contribute zero.
function currentDetail(a,round,active,boardSlots,readCache,calculate){
 if(!a||!round?.participant||active?.roundId!==round.id||a.phase==='ready'||round.phase==='BETTING')return null;
 const balls=Array.isArray(round.balls)?round.balls:[],used=new Set(balls.map(b=>Number(b.number)));
 const localDraws=Array.isArray(a.draws)?a.draws:[],count=balls.length;
 const aligned=localDraws.length===count&&localDraws.every(n=>used.has(Number(n)))&&!a.paused;
 const detail={version:238,roundId:round.id,ballCount:count,prediction:'updating',best:null,
  numberGains:null,numberColorTiers:null,colorBasis:'per-game-new-award-v248',predictionBaseWin:null,readyGames:0,totalGames:0,
  highestReachNumbers:[],achievedTier:0,highestGames:[],paused:!!a.paused};
 const sums=new Map(),highestReach=new Set();
 let eligible=0,ready=0,baseWin=0;
 for(let i=0;i<(a.engines||[]).length;i++){
  if(a.enabled?.[i]===false)continue;
  const e=a.engines[i],bet=amount(a.locked?.[i]??a.bets?.[i]);if(!e||bet<=0)continue;
  const award=observeAward(a,e),hundredths=a.paid?.[i]?amount(a.roundWins?.[i])*100/bet:amount(e.totalHundredths);
  detail.achievedTier=Math.max(detail.achievedTier,hundredths>=1000?2:hundredths>=300?1:0);
  if(award?.highest){detail.achievedTier=3;const id=e.kind||'cookie';if(GAME_NAMES[id]&&!detail.highestGames.includes(id))detail.highestGames.push(id);}
  if(a.paid?.[i]){baseWin+=amount(a.roundWins?.[i]);continue;}
  if(count>=8||round.phase!=='PLAYING')continue;
  eligible++;
  // During an animation or a newly received ball the particular board is
  // unknown. It must not suppress other games whose next-HIT values are fixed.
  const s=(boardSlots||[]).find(slot=>slot?.engine===e),noGain=groupedNoGainV243(e,a);
  let entries=noGain?[]:null;
  if(aligned&&!noGain&&s&&s.tabReachVersion===e.version&&s.reachStatus==='ready'){
   try{entries=readCache?.(s,a);}catch{}
  }
  if(!aligned||typeof calculate!=='function'||!Array.isArray(entries)){
   try{baseWin+=amount(calculate?.(bet,amount(e.totalHundredths)));}catch{}
   continue;
  }
  const base=noGain?amount(e.totalHundredths):Number(s?.tabReachBase);
  if(!Number.isFinite(base)||base<0){continue;}
  let before;try{before=calculate(bet,base);}catch{continue;}
  if(!Number.isFinite(before)||before<0)continue;
  const perGame=new Map();let valid=true;
  for(const hit of entries){
   const n=Number(hit?.number);
   if(!Number.isInteger(n)||n<1||n>25||used.has(n))continue;
   if(!Number.isFinite(Number(hit.total))||Number(hit.total)<0){valid=false;break;}
   let after;try{after=calculate(bet,Number(hit.total));}catch{valid=false;break;}
   if(!Number.isFinite(after)||after<0){valid=false;break;}
   const gain=Math.max(0,after-before);
   if(!(gain>0))continue;
   // Each known predictor marks a NEW all-clear/reversal/full-board role.
   // Canyon instead supplies the newly resolved depth bonus explicitly.
   // Never promote an already-earned total, or infer highest role from 50x.
   const bonusDepth=Number(hit.bonusDepth),resolvedDepth=Number(e.bonusResolvedDepth)||0;
   const highest=hit.allClear===true||(e.kind==='choco'&&hit.highestRole==='canyonBonus'&&Number.isInteger(bonusDepth)&&bonusDepth>=500&&bonusDepth>resolvedDepth&&bonusDepth%100===0);
   const tier=highest?3:gain>=bet*10?2:gain>=bet*3?1:0,old=perGame.get(n);
   perGame.set(n,{gain:Math.max(gain,old?.gain||0),tier:Math.max(tier,old?.tier||0)});
  }
  if(!valid)continue;
  ready++;baseWin+=amount(before);
  for(const [n,item] of perGame){
   const old=sums.get(n)||{gain:0,tier:0};
   sums.set(n,{gain:Math.min(1e12,old.gain+item.gain),tier:Math.max(old.tier,item.tier)});
   if(item.tier===3)highestReach.add(n);
  }
 }
 if(count>=8||round.phase==='COMPLETE'||round.participant.settlement){detail.prediction='complete';return detail;}
 detail.totalGames=eligible;detail.readyGames=ready;
 if(!aligned||ready===0||!eligible)return detail;
 // Every number has an exact subtotal from the ready games. The remaining
 // games are explicitly flagged as pending on the server and in the monitor.
 detail.predictionBaseWin=Math.floor(Math.min(1e12,amount(baseWin)));
 detail.numberGains=Array.from({length:25},(_,i)=>used.has(i+1)?null:Math.floor(amount(sums.get(i+1)?.gain)));
 detail.numberColorTiers=Array.from({length:25},(_,i)=>used.has(i+1)?null:sums.get(i+1)?.tier||0);
 detail.highestReachNumbers=[...highestReach].sort((a,b)=>a-b);
 if(ready<eligible){detail.prediction='partial';return detail;}
 const largest=Math.max(0,...[...sums.values()].map(v=>v.gain));
 if(largest>0){
  const numbers=[...sums].filter(([,v])=>v.gain===largest).map(([n])=>n).sort((a,b)=>a-b);
  detail.prediction='ready';detail.best={numbers,gain:Math.floor(largest),tier:Math.max(...numbers.map(n=>sums.get(n).tier))};
 }else detail.prediction='none';
 return detail;
}
`;
 return source.slice(0,begin)+replacement+source.slice(end);
}
window.SweetsStationProgressiveV246={patch};
})();

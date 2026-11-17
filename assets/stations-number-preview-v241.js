/* Reuse the already computed next-HIT cache; never simulate another board. */
(()=>{
'use strict';
function patch(source){
 const once=(from,to)=>{if(source.split(from).length!==2)throw Error('[StationNumbers241] source contract changed');source=source.replace(from,to);};
 once("prediction:'updating',best:null,highestReachNumbers:[]","prediction:'updating',best:null,numberGains:null,predictionBaseWin:null,highestReachNumbers:[]");
 once(' const largest=Math.max(0,...[...sums.values()].map(v=>v.gain));',`
 // All game caches above must be ready for this exact board and ball count.
 // Preserve each game's medal rounding and include already-paid game awards.
 let baseWin=0,validBase=typeof calculate==='function';
 for(let i=0;i<(a.engines||[]).length;i++){
  if(a.enabled?.[i]===false)continue;
  const bet=amount(a.locked?.[i]??a.bets?.[i]);if(!bet)continue;
  if(a.paid?.[i]){baseWin+=amount(a.roundWins?.[i]);continue;}
  const slot=(boardSlots||[]).find(s=>s?.engine===a.engines[i]);
  if(!Number.isFinite(Number(slot?.tabReachBase))){validBase=false;break;}
  try{const value=calculate(bet,amount(slot.tabReachBase));if(!Number.isFinite(value)||value<0){validBase=false;break;}baseWin+=value;}catch{validBase=false;break;}
 }
 if(validBase){
  detail.predictionBaseWin=Math.floor(amount(baseWin));
  detail.numberGains=Array.from({length:25},(_,i)=>used.has(i+1)?null:Math.floor(amount(sums.get(i+1)?.gain)));
 }
 const largest=Math.max(0,...[...sums.values()].map(v=>v.gain));`);
 return source;
}
window.SweetsStationNumbersV241={patch};
})();

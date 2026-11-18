/* Sugar Challenge — pure shared-round rules. No draw source, wallet or DOM.
 * The owner persists five quoted Sugar values and chooses the card/multiplier
 * before any challenge ball. Only the eighth distinct shared number settles.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.SugarChallengeRulesV254=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const REVISION=254,SUGAR_COUNT=5,BALL_COUNT=8,MIN_SUM=36,MAX_SUM=172,CENTER_SUM=104,OUTCOME_COUNT=1081575;
 const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
 const regularBands=[{distance:30,hundredths:20},{distance:24,hundredths:10},{distance:18,hundredths:5},{distance:12,hundredths:3},{distance:6,hundredths:2},{distance:0,hundredths:1}];
 const cards=freeze([
  {id:'standard',name:'シュガーカード',rarity:'normal',weightBps:9000,lowMax:70,highMin:138,luckySums:[77,88,120,131],bands:regularBands},
  {id:'lucky',name:'ラッキーシュガーカード',rarity:'rare',weightBps:500,lowMax:70,highMin:138,luckySums:[77,88,99,109,120,131],bands:regularBands},
  {id:'wide',name:'ワイドシュガーカード',rarity:'rare',weightBps:500,lowMax:78,highMin:130,luckySums:[88,120],bands:[{distance:23,hundredths:20},{distance:19,hundredths:10},{distance:15,hundredths:5},{distance:10,hundredths:3},{distance:5,hundredths:2},{distance:0,hundredths:1}]}
 ]);
 const multipliers=freeze([{multiplier:1,weightBps:8000},{multiplier:2,weightBps:1500},{multiplier:3,weightBps:400},{multiplier:5,weightBps:90},{multiplier:10,weightBps:10}]);
 const cardFor=id=>cards.find(card=>card.id===(typeof id==='object'?id?.cardId??id?.id:id))||null;
 const isMedal=n=>Number.isSafeInteger(n)&&n>0;
 const isNumber=n=>Number.isInteger(n)&&n>=1&&n<=25;
 const isId=value=>typeof value==='string'&&value.length>0&&value.length<=240;
 const validDraws=draws=>Array.isArray(draws)&&draws.length<=BALL_COUNT&&draws.every(isNumber)&&new Set(draws).size===draws.length;
 function safeNumber(value){if(value<0n||value>BigInt(Number.MAX_SAFE_INTEGER))throw new RangeError('Sugar Challenge medal amount exceeds the safe integer range.');return Number(value);}
 function seededRandom(seed){
  let value=Number(seed)>>>0;
  return ()=>{value=(value+0x6D2B79F5)>>>0;let t=value;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
 }
 function randomFor(options){return typeof options.rng==='function'?options.rng:options.seed!==undefined?seededRandom(options.seed):Math.random;}
 function sample(rng){const n=Number(rng());if(!Number.isFinite(n)||n<0||n>1)throw new RangeError('Sugar Challenge RNG must return a value in [0,1].');return Math.min(1-Number.EPSILON,n);}
 function weighted(items,rng){const bucket=Math.floor(sample(rng)*10000);let cursor=0;for(const item of items){cursor+=item.weightBps;if(bucket<cursor)return item;}throw new RangeError('Invalid Sugar Challenge probability weights.');}
 function selectCard(rng=Math.random){return weighted(cards,rng).id;}
 function selectMultiplier(rng=Math.random){return weighted(multipliers,rng).multiplier;}
 function quoteSugar(options={}){
  const bet=options.bet,rate=Number(options.payoutRate??100);
  if(!isMedal(bet))throw new RangeError('Sugar source BET must be a positive safe integer.');
  if(!Number.isFinite(rate))throw new RangeError('Sugar payout rate must be finite.');
  const payoutRateBps=Math.round(Math.max(50,Math.min(150,rate))*100),jitterBps=8000+Math.floor(sample(randomFor(options))*4001);
  const numerator=BigInt(bet)*10n*BigInt(payoutRateBps)*BigInt(jitterBps),denominator=100000000n;
  return {rulesRevision:REVISION,sourceBet:bet,payoutRate:payoutRateBps/100,payoutRateBps,jitterBps,challengeValue:safeNumber((numerator+denominator/2n)/denominator)};
 }
 function evaluate(cardId,sum){
  const card=cardFor(cardId);
  if(!card||!Number.isInteger(sum)||sum<MIN_SUM||sum>MAX_SUM)return null;
  const reason=sum<=card.lowMax?'low':sum>=card.highMin?'high':card.luckySums.includes(sum)?'lucky':null;
  const payoutHundredths=reason?0:card.bands.find(band=>Math.abs(sum-CENTER_SUM)>=band.distance).hundredths;
  return {sum,cardId:card.id,jpc:!!reason,reason,payoutHundredths,payoutFraction:payoutHundredths/100};
 }
 function cashFor(jpAmount,hundredths){
  if(!isMedal(jpAmount)||!Number.isInteger(hundredths)||hundredths<0||hundredths>100)throw new RangeError('Invalid Sugar Challenge cash calculation.');
  return safeNumber(BigInt(jpAmount)*BigInt(hundredths)/100n);
 }
 function canonical(raw){
  if(!raw||typeof raw!=='object'||raw.rulesRevision!==REVISION||!isId(raw.id)||!isId(raw.roundId)||!Number.isInteger(raw.station)||raw.station<1||raw.station>6)return null;
  if(!Array.isArray(raw.sugarValues)||raw.sugarValues.length!==SUGAR_COUNT||!raw.sugarValues.every(isMedal)||typeof raw.cardId!=='string'||!cardFor(raw.cardId)||!multipliers.some(row=>row.multiplier===raw.multiplier)||!validDraws(raw.draws))return null;
  return {rulesRevision:REVISION,id:raw.id,roundId:raw.roundId,station:raw.station,sugarValues:raw.sugarValues.slice(),cardId:raw.cardId,multiplier:raw.multiplier,seed:Number.isInteger(raw.seed)?raw.seed>>>0:null,draws:raw.draws.slice()};
 }
 function derive(input){
  const state=canonical(input);if(!state)return null;
  const jpBase=safeNumber(state.sugarValues.reduce((sum,value)=>sum+BigInt(value),0n)),jpAmount=safeNumber(BigInt(jpBase)*BigInt(state.multiplier)),sum=state.draws.reduce((total,n)=>total+n,0),complete=state.draws.length===BALL_COUNT;
  const outcome=complete?evaluate(state.cardId,sum):null,cashWin=outcome?cashFor(jpAmount,outcome.payoutHundredths):0,jpcQualified=!!outcome?.jpc;
  const award=outcome?{...outcome,jpAmount,cashWin,qualifyingNumber:jpcQualified?state.draws[BALL_COUNT-1]:null}:null;
  const jpcTicket=jpcQualified?{id:state.id+':jpc',challengeId:state.id,roundId:state.roundId,station:state.station,jpAmount,sum,number:state.draws[BALL_COUNT-1],reason:outcome.reason,status:'pending-implementation'}:null;
  return {...state,type:'sugar-challenge',phase:complete?'complete':state.draws.length?'drawing':'ready',drawCount:state.draws.length,remaining:BALL_COUNT-state.draws.length,sum,jpBase,jpAmount,award,cashWin,jpcQualified,jpcTicket};
 }
 function create(options={}){
  const rng=randomFor(options),raw={rulesRevision:REVISION,id:options.id,roundId:options.roundId,station:options.station??1,sugarValues:options.sugarValues,cardId:options.cardId??selectCard(rng),multiplier:options.multiplier??selectMultiplier(rng),seed:options.seed??null,draws:[]};
  const state=derive(raw);if(!state)throw new RangeError('Invalid Sugar Challenge identity, station, Sugar values, card or multiplier.');return state;
 }
 function restore(raw){try{return derive(raw);}catch{return null;}}
 function snapshot(state){const restored=restore(state);return restored?canonical(restored):null;}
 function advance(source,number,options={}){
  const state=restore(source);if(!state||!isNumber(number)||options.roundId!==undefined&&String(options.roundId)!==state.roundId)return null;
  const index=options.ballIndex;
  if(index!==undefined){
   if(!Number.isInteger(index)||index<1||index>BALL_COUNT)return null;
   if(index<=state.draws.length)return state.draws[index-1]===number?state:null;
   if(index!==state.draws.length+1)return null;
  }
  if(state.draws.includes(number))return index===undefined?state:null;
  if(state.draws.length===BALL_COUNT)return null;
  return derive({...state,draws:[...state.draws,number]});
 }
 function reaches(source){
  const state=restore(source);if(!state||state.draws.length!==BALL_COUNT-1)return [];
  const result=[];
  for(let number=1;number<=25;number++)if(!state.draws.includes(number)){
   const sum=state.sum+number,outcome=evaluate(state.cardId,sum);
   if(outcome?.jpc)result.push({number,n:number,sum,reason:outcome.reason,cardId:state.cardId,station:state.station,jpAmount:state.jpAmount});
  }
  return result;
 }
 function finalSumDistribution(draws=[]){
  if(!validDraws(draws))throw new RangeError('A Sugar Challenge history contains at most eight distinct numbers from 1 to 25.');
  const used=new Set(draws),sum=draws.reduce((n,x)=>n+x,0),remaining=BALL_COUNT-draws.length,dp=Array.from({length:remaining+1},()=>Array(MAX_SUM+1).fill(0));dp[0][0]=1;
  for(let number=1;number<=25;number++)if(!used.has(number))for(let k=remaining;k>=1;k--)for(let subtotal=MAX_SUM;subtotal>=number;subtotal--)dp[k][subtotal]+=dp[k-1][subtotal-number];
  const rows=[];for(let extra=0;extra+sum<=MAX_SUM;extra++)if(dp[remaining][extra])rows.push({sum:sum+extra,count:dp[remaining][extra]});
  return {drawCount:draws.length,remaining,sum,outcomeCount:rows.reduce((n,row)=>n+row.count,0),minFinalSum:rows[0].sum,maxFinalSum:rows[rows.length-1].sum,rows};
 }
 function forecast(source){
  const state=restore(source);if(!state)return null;
  const distribution=finalSumDistribution(state.draws),rows=distribution.rows.map(row=>({...row,...evaluate(state.cardId,row.sum)}));
  const jpcOutcomes=rows.reduce((n,row)=>n+(row.jpc?row.count:0),0),cashNumerator=rows.reduce((n,row)=>n+BigInt(cashFor(state.jpAmount,row.payoutHundredths))*BigInt(row.count),0n);
  return {...distribution,rows,cardId:state.cardId,jpcOutcomes,jpcProbability:jpcOutcomes/distribution.outcomeCount,expectedCash:Number(cashNumerator)/distribution.outcomeCount,expectedCashNumerator:cashNumerator.toString(),reaches:reaches(state)};
 }
 function payoutRows(cardId){
  const card=cardFor(cardId);if(!card)return [];
  return [20,10,5,3,2,1].map(hundredths=>{
   const ranges=[];
   for(let sum=MIN_SUM;sum<=MAX_SUM;sum++)if(evaluate(card.id,sum).payoutHundredths===hundredths){const last=ranges[ranges.length-1];if(last&&last.max===sum-1)last.max=sum;else ranges.push({min:sum,max:sum});}
   return {hundredths,fraction:hundredths/100,ranges};
  });
 }
 return freeze({REVISION,version:REVISION,SUGAR_COUNT,BALL_COUNT,MIN_SUM,MAX_SUM,CENTER_SUM,OUTCOME_COUNT,cards,CARDS:cards,multipliers,MULTIPLIERS:multipliers,cardFor,seededRandom,selectCard,selectMultiplier,quoteSugar,evaluate,cashFor,create,advance,draw:advance,restore,snapshot,reaches,finalSumDistribution,forecast,payoutRows});
});

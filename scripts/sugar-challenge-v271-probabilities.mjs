import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import '../assets/sugar-challenge-rules-v254.js';

const R=globalThis.SugarChallengeRulesV254;
const destination=new URL('../docs/sugar-challenge-v271-probabilities.json',import.meta.url);
const REFERENCE_CASH_BASE=10000;
const gcd=(a,b)=>b?gcd(b,a%b):a;
function ratio(n,d){
 n=BigInt(n);d=BigInt(d);const divisor=gcd(n,d);
 return {numerator:String(n),denominator:String(d),simplifiedNumerator:String(n/divisor),simplifiedDenominator:String(d/divisor),value:Number(n)/Number(d)};
}

export function buildReport(){
 const cards=R.cardsFor(271).map(card=>{
  const state=R.create({rulesRevision:271,id:'probabilities-v271',roundId:'probabilities-v271',station:1,sugarValues:[2000,2000,2000,2000,2000],cardId:card.id,multiplier:1});
  const forecast=R.forecast(state);
  return {
   id:card.id,weightBps:card.weightBps,lowMax:card.lowMax,highMin:card.highMin,luckySums:card.luckySums,
   outcomeCount:forecast.outcomeCount,jpcOutcomes:forecast.jpcOutcomes,cashOutcomes:forecast.outcomeCount-forecast.jpcOutcomes,
   jpcProbability:ratio(forecast.jpcOutcomes,forecast.outcomeCount),jpcPercent:100*forecast.jpcProbability,
   referenceCashBase:state.cashBase,expectedCashNumerator:forecast.expectedCashNumerator,
   expectedCashFractionOfBase:ratio(forecast.expectedCashNumerator,BigInt(forecast.outcomeCount)*BigInt(state.cashBase)),
   rows:forecast.rows.map(({sum,count,jpcOutcomes,cashOutcomes,payoutHundredths})=>({sum,count,jpcOutcomes,cashOutcomes,payoutHundredths}))
  };
 });
 const denominator=BigInt(cards[0].outcomeCount)*10000n;
 const jpcNumerator=cards.reduce((total,card)=>total+BigInt(card.weightBps)*BigInt(card.jpcOutcomes),0n);
 const cashNumerator=cards.reduce((total,card)=>total+BigInt(card.weightBps)*BigInt(card.expectedCashNumerator),0n);
 return {
  schema:'sweets-link-sugar-challenge-probabilities-v271',rulesRevision:271,
  reproduction:'node scripts/sugar-challenge-v271-probabilities.mjs',
  verification:'node scripts/sugar-challenge-v271-probabilities.mjs --check && node tests/sugar-v271-rules.mjs',
  method:'Exact subset dynamic programming counts every ordered eight-number history without replacement. For each subset, count permutations that have never hit a lucky running total. At eight balls, all high totals also qualify. An earlier high qualification has the same final probability because every drawn number is positive. The complete distributions are independently checked against a separate C++ implementation.',
  assumptions:[
   'The shared physical draw is modeled as uniform without replacement from 1 through 25. These rules never generate or change its numbers.',
   'These are probabilities per started Sugar Challenge. The frequency or cost of earning five Sugars and future JPC execution/value are excluded.',
   'Card selection weights remain standard 90%, lucky 5%, and wide 5%; card and JP multiplier are fixed during BET before any shared ball.',
   'A cumulative total of 77 qualifies immediately for every card. The lucky card additionally qualifies at 88. The first qualification remains valid for the rest of the challenge.',
   'A cumulative total of at least 139 qualifies immediately on standard and lucky cards; the wide card qualifies at 130. Low totals do not qualify JPC.',
   'The exact mixed JPC rate is 9.94993835048755%, approximately the requested 10%.',
   'Cash is zero after any JPC qualification. Otherwise the final payout band applies to the rounded, unmultiplied JP base; the JP multiplier never changes this cash.',
   'A reference cash base of 10000 medals makes every percentage band integral. Reported cash fractions precede any flooring needed for other valid JP bases.',
   'Saved revisions 254, 268, and 270 retain their previously issued qualification and cash rules; they are not included in this new-revision mixture.'
  ],
  drawModel:{population:25,draws:8,replacement:false,orderMatters:true,combinationCount:R.OUTCOME_COUNT,outcomeCount:cards[0].outcomeCount},
  referenceCashBase:REFERENCE_CASH_BASE,multipliers:R.multipliers,
  meanJpMultiplier:R.multipliers.reduce((n,row)=>n+row.multiplier*row.weightBps,0)/10000,
  cashAffectedByMultiplier:false,cards,
  mixture:{jpcProbability:ratio(jpcNumerator,denominator),jpcPercent:100*Number(jpcNumerator)/Number(denominator),expectedCashFractionOfBase:ratio(cashNumerator,denominator*BigInt(REFERENCE_CASH_BASE)),jpcFutureValueIncluded:false}
 };
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const report=buildReport(),json=JSON.stringify(report,null,2)+'\n';
 if(process.argv.includes('--check')){
  if(fs.readFileSync(destination,'utf8')!==json)throw new Error('Stale Sugar v271 probability report. Run node scripts/sugar-challenge-v271-probabilities.mjs');
 }else fs.writeFileSync(destination,json);
 console.log(JSON.stringify({outcomeCount:report.drawModel.outcomeCount,cards:report.cards.map(card=>({id:card.id,jpcOutcomes:card.jpcOutcomes,jpcPercent:card.jpcPercent})),jpcPercent:report.mixture.jpcPercent,expectedCashFractionOfBase:report.mixture.expectedCashFractionOfBase.value,cashAffectedByMultiplier:report.cashAffectedByMultiplier}));
}

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import '../assets/sugar-challenge-rules-v254.js';
const R=globalThis.SugarChallengeRulesV254,destination=new URL('../docs/sugar-challenge-v268-probabilities.json',import.meta.url);
const ratio=(n,d)=>({numerator:String(n),denominator:String(d),value:Number(n)/Number(d)});
export function buildReport(){
 const cards=R.cardsFor(268).map(card=>{
  const state=R.create({id:'probabilities-v268',roundId:'probabilities-v268',station:1,rulesRevision:268,sugarValues:[20,20,20,20,20],cardId:card.id,multiplier:1}),forecast=R.forecast(state);
  return {id:card.id,weightBps:card.weightBps,luckySums:card.luckySums,lowMax:card.lowMax,highMin:card.highMin,outcomeCount:forecast.outcomeCount,jpcOutcomes:forecast.jpcOutcomes,jpcProbability:ratio(forecast.jpcOutcomes,forecast.outcomeCount),jpcPercent:100*forecast.jpcProbability,cashHundredthsNumerator:forecast.expectedCashNumerator,expectedCashFractionOfFinalJp:ratio(forecast.expectedCashNumerator,BigInt(forecast.outcomeCount)*100n),rows:forecast.rows.map(({sum,count,jpcOutcomes,cashOutcomes,payoutHundredths})=>({sum,count,jpcOutcomes,cashOutcomes,payoutHundredths}))};
 });
 const total=BigInt(cards[0].outcomeCount)*10000n,jpc=cards.reduce((n,c)=>n+BigInt(c.weightBps)*BigInt(c.jpcOutcomes),0n),cash=cards.reduce((n,c)=>n+BigInt(c.weightBps)*BigInt(c.cashHundredthsNumerator),0n),meanMultiplier=R.multipliers.reduce((n,c)=>n+c.multiplier*c.weightBps,0)/10000;
 return {schema:'sweets-link-sugar-challenge-probabilities-v268',rulesRevision:268,reproduction:'node scripts/sugar-challenge-v268-probabilities.mjs',method:'Exact subset dynamic programming counts all ordered eight-number draws without replacement. For each subset, sum safe permutations from its one-number-smaller predecessors, excluding any lucky cumulative total. At ball 8, final low/high tails also qualify.',assumptions:['The shared physical draw is modeled as uniform without replacement; no draw is generated or changed by these rules.','JP, card and multiplier are fixed in BET time before any shared ball.','A lucky cumulative total on any ball immediately and permanently qualifies JPC; low/high tails qualify only after ball 8.','The previous final-sum-only approximately 10% target does not apply to v268. Card targets and selection weights were kept while adding the requested early qualification.','These probabilities are per started Sugar Challenge. Future JPC execution/value and the cost/frequency of earning five Sugars are excluded.','Cash fractions are before per-award integer flooring. Cash is zero whenever JPC qualifies.'],drawModel:{population:25,draws:8,replacement:false,orderMatters:true,outcomeCount:cards[0].outcomeCount},multipliers:R.multipliers,meanMultiplier,cards,mixture:{jpcProbability:ratio(jpc,total),jpcPercent:100*Number(jpc)/Number(total),expectedCashFractionOfFinalJp:ratio(cash,total*100n),jpcFutureValueIncluded:false}};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const report=buildReport(),json=JSON.stringify(report,null,2)+'\n';
 if(process.argv.includes('--check')){if(fs.readFileSync(destination,'utf8')!==json)throw Error('Stale Sugar v268 probability report');}
 else fs.writeFileSync(destination,json);
 console.log(JSON.stringify({outcomeCount:report.drawModel.outcomeCount,cards:report.cards.map(c=>({id:c.id,jpcPercent:c.jpcPercent})),jpcPercent:report.mixture.jpcPercent,expectedCashFractionOfFinalJp:report.mixture.expectedCashFractionOfFinalJp}));
}

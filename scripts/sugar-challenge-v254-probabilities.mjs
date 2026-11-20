import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import '../assets/sugar-challenge-rules-v254.js';

const R=globalThis.SugarChallengeRulesV254;
const destination=new URL('../docs/sugar-challenge-v254-probabilities.json',import.meta.url);
const exactRatio=(numerator,denominator)=>({numerator:String(numerator),denominator:String(denominator),value:Number(numerator)/Number(denominator)});

export function buildReport(){
 const distribution=R.finalSumDistribution(),total=distribution.outcomeCount;
 const cards=R.cardsFor(254).map(card=>{
  const reasons={low:0,high:0,lucky:0},cashCounts=Object.fromEntries([20,10,5,3,2,1].map(n=>[n,0]));
  let cashHundredthsNumerator=0;
  for(const {sum,count} of distribution.rows){
   const outcome=R.evaluate(card.id,sum,254);
   if(outcome.jpc)reasons[outcome.reason]+=count;
   else{cashCounts[outcome.payoutHundredths]+=count;cashHundredthsNumerator+=outcome.payoutHundredths*count;}
  }
  const jpcOutcomes=Object.values(reasons).reduce((a,b)=>a+b,0);
  return {
   id:card.id,name:card.name,rarity:card.rarity,weightBps:card.weightBps,
   lowJpc:{min:R.MIN_SUM,max:card.lowMax},highJpc:{min:card.highMin,max:R.MAX_SUM},
   luckySums:card.luckySums,luckySumCounts:card.luckySums.map(sum=>({sum,count:distribution.rows.find(row=>row.sum===sum).count})),
   jpcCounts:reasons,jpcOutcomes,jpcProbability:exactRatio(jpcOutcomes,total),jpcPercent:100*jpcOutcomes/total,
   cashBandsByDistanceFrom104:card.bands,
   cashTiers:R.payoutRows(card.id,254).map(row=>({...row,outcomeCount:cashCounts[row.hundredths],probability:cashCounts[row.hundredths]/total})),
   cashHundredthsNumerator,expectedCashFractionOfFinalJp:exactRatio(cashHundredthsNumerator,total*100)
  };
 });
 const mixedJpcNumerator=cards.reduce((n,card)=>n+card.weightBps*card.jpcOutcomes,0),weightedDenominator=total*10000;
 const mixedCashNumerator=cards.reduce((n,card)=>n+card.weightBps*card.cashHundredthsNumerator,0),mixedCashDenominator=weightedDenominator*100;
 const multiplierNumerator=R.multipliers.reduce((n,row)=>n+row.multiplier*row.weightBps,0);
 const mixedJpc=mixedJpcNumerator/weightedDenominator,meanMultiplier=multiplierNumerator/10000;
 return {
  schema:'sweets-link-sugar-challenge-probabilities-v254',rulesRevision:254,
  reproduction:'node scripts/sugar-challenge-v254-probabilities.mjs',verification:'node tests/sugar-challenge-v254-rules.mjs',
  method:'Exact integer dynamic programming for 8 distinct uniform numbers from 1..25. The native test independently enumerates every 8-number combination.',
  assumptions:[
   'Shared numbers are modeled as uniformly drawn without replacement; this module never selects or changes the shared draw.',
   'The card, multiplier and Sugar-value jitter are chosen before the challenge and independently of the shared numbers.',
   'A lucky number means the FINAL SUM of all eight numbers, never an individual drawn number. Every lucky sum lies strictly outside its card\'s two JPC tail intervals.',
   'JPC earns an entitlement only. Future JPC execution and its expected monetary value are not implemented or included in cash expectations.',
   'Displayed cash expectations are before integer-medal payout flooring. Each actual cash award floors JP multiplied by its stated fraction, losing less than one medal.',
   'The Sugar rate factor is the owning game\'s P/O setting at Sugar acquisition, clamped to 50..150 percent. Existing visual token.value is retained separately from challengeValue.',
   'These probabilities are conditional on starting a Sugar Challenge; they do not represent total arcade P/O or include the frequency/cost of earning five Sugar.'
  ],
  drawModel:{population:25,draws:8,replacement:false,orderMattersForSum:false,outcomeCount:total,minSum:R.MIN_SUM,maxSum:R.MAX_SUM,centerSum:R.CENTER_SUM},
  sugarValue:{sourceBet:'The Sugar\'s own game BET locked for the round where it was acquired.',sugarRequired:5,baseBetMultiplier:10,payoutRatePercent:{min:50,max:150},jitterBasisPoints:{min:8000,max:12000,uniformSteps:4001,mean:10000},rounding:'Nearest integer medal; halves round up. At most 0.5 medal error per Sugar.',equalBetBaseJpExpectationBeforeRoundingAt100Percent:50},
  multiplier:{rows:R.multipliers,mean:exactRatio(multiplierNumerator,10000),equalBetFinalJpExpectationBeforeRoundingAt100Percent:50*meanMultiplier},
  cards,
  mixture:{
   weightBasisPoints:10000,jpcProbability:exactRatio(mixedJpcNumerator,weightedDenominator),jpcPercent:mixedJpc*100,targetJpcPercent:10,targetDifferencePercentagePoints:mixedJpc*100-10,
   expectedCashFractionOfFinalJp:exactRatio(mixedCashNumerator,mixedCashDenominator),
   expectedCashFractionOfBaseJp:exactRatio(BigInt(mixedCashNumerator)*BigInt(multiplierNumerator),BigInt(mixedCashDenominator)*10000n),
   expectedCashInSourceBetUnitsAt100PercentBeforeRounding:50*meanMultiplier*mixedCashNumerator/mixedCashDenominator,
   jpcFutureValueIncluded:false
  },
  sumDistribution:distribution.rows
 };
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const report=buildReport(),json=JSON.stringify(report,null,2)+'\n';
 if(process.argv.includes('--check')){
  if(fs.readFileSync(destination,'utf8')!==json)throw new Error('Sugar Challenge probability report is stale; run the reproduction command.');
  console.log('Sugar Challenge v254 probability report matches the exact rules.');
 }else{
  fs.writeFileSync(destination,json);
  console.log(JSON.stringify({file:fileURLToPath(destination),outcomeCount:report.drawModel.outcomeCount,jpcPercent:report.mixture.jpcPercent,cardPercents:report.cards.map(c=>({id:c.id,percent:c.jpcPercent})),meanMultiplier:report.multiplier.mean.value}));
 }
}

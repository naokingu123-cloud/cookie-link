import fs from 'node:fs/promises';
import vm from 'node:vm';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const root=new URL('../',import.meta.url),read=path=>fs.readFile(new URL(path,root),'utf8');
const source=await read('assets/dango-bingo-rules.js'),ctx=vm.createContext({});vm.runInContext(source,ctx);
const R=ctx.DangoBingoRules,P=x=>JSON.parse(JSON.stringify(x)),hash=value=>crypto.createHash('sha256').update(value).digest('hex');
assert.equal(R.REVISION,285);
const data=JSON.parse(await read('docs/qa-v285/dango-final-profiles.json'));
const original=JSON.parse(await read('docs/qa-v285/dango-exact-profiles.json'));
const search=JSON.parse(await read('docs/qa-v285/dango-layout-search.json'));
const D=BigInt(data.denominator),N=data.profiles.map(p=>BigInt(p.automaticNumerator));
const gap=N[1]-N[0],weightDenominator=200n*gap;
const settings=Array.from({length:101},(_,i)=>{
  const target=i+50,hi=200n*BigInt(target)*D-3n*N[2]-197n*N[0],featured=3n*gap,lo=197n*gap-hi;
  assert.ok(lo>0n&&hi>0n);assert.equal(lo+hi+featured,weightDenominator);
  assert.equal(lo*N[0]+hi*N[1]+featured*N[2],BigInt(target)*D*weightDenominator);
  const c=R.calibrationForTarget(target);
  return {target,weights:P(c.weights).map(w=>w.weight),lowWeightNumerator:String(lo),highWeightNumerator:String(hi),
    featuredWeightNumerator:String(featured),weightDenominator:String(weightDenominator),automaticReturnPercent:c.automaticReturnPercent};
});
const profiles=data.profiles.map((p,i)=>{
  const m=R.molds[i];assert.equal(m.automaticNumerator,p.automaticNumerator);
  assert.deepEqual(P(m.initialFreeCells),p.initialFreeCells);
  return {...p,id:m.id,name:m.name,automaticReturnPercent:m.automaticReturnPercent,
    conditionalBudgetReturnPercent:p.budgetNumerators.map(n=>n/data.drawDenominator)};
});
const report={
  revision:285,reference:R.calibrationForTarget(90).reference,
  sources:{rules:'assets/dango-bingo-rules.js',rulesSha256:hash(source),
    evaluator:'scripts/dango-v285-enumerate.cpp',evaluatorSha256:hash(await read('scripts/dango-v285-enumerate.cpp')),
    evaluatorSharedIntegerGeometry:'scripts/dango-v268-enumerate.cpp',sharedIntegerGeometrySha256:hash(await read('scripts/dango-v268-enumerate.cpp')),
    rawFinalProfiles:'docs/qa-v285/dango-final-profiles.json'},
  scope:{policy:'Sequential AUTO: each FREE maximizes exact conditional expected payout; ties choose the lowest cell ID.',
    globallyOptimalManualStrategy:false,uniformNumbers:true,uniformCyanTriplet:true,cyanPlacementIndependentOfTarget:true,
    futureNumbersConsulted:false,includesSugar:false,payoutBasis:'Hundredths of BET, before the existing whole-medal floor.',
    exactWholeMedalBetMultiple:10,
    lowBetCaveat:'For BET values not divisible by 10, floor(BET * totalHundredths / 100) can reduce the paid return. No per-BET correction is claimed.',
    manualPlayCaveat:'Other legal FREE choices can produce a different expected return.',
    finiteSessionCaveat:'These are exact expectations, not a guarantee for an individual session.'},
  mechanics:{initialGreenFree:3,startingPlacementBudget:1,numberedCyanCells:3,cyanGrantBalls:[1,2,3,4,5],
    cyanExpiresAt:'Thinking begins after ball five',lineCompletionGrantsFree:false,maxPlacementBudget:4,
    oddsSources:['Place yellow FREE on an initial green FREE.','A numbered HIT lands on a placed yellow FREE.']},
  approvedPaytableHundredths:data.paytableHundredths,
  impossiblePaytableCells:[{length:7,count:3,minimumMarkedCells:18,maximumMarkedCells:15,presentation:'—'}],
  roleMinimumDistinctCells:{2:[2,4,6],3:[3,6,9],4:[4,7,9],5:[5,9,13],6:[6,11,15],7:[7,13,18]},
  triggerDistribution:data.triggerWays.map((ways,k)=>({cyanHits:k,placementBudget:k+1,ways,denominator:data.triggerDenominator,probability:ways/data.triggerDenominator})),
  expectedPlacementBudget:1.6,
  method:{earlySetsPerMold:53130,budgetsEvaluatedPerEarlySet:4,lateSetsIntegratedPerPlacement:1140,
    triggerTripletsIntegratedPerEarlySet:2300,explicitEarlySetsAcrossProductionMolds:159390,
    drawDenominator:data.drawDenominator,triggerDenominator:data.triggerDenominator,probabilityDenominator:data.denominator,
    description:'Enumerate all C(25,5) early sets for each initial layout, evaluate sequential AUTO at budgets 1–4, integrate all C(20,3) late sets using integer inclusion/exclusion, then weight budgets by Hypergeometric(25,3,5).',
    noMonteCarloOrConfidenceInterval:'Every component of this AUTO expectation is exact; independent brute-force late-set vectors check the evaluator.'},
  profiles,featuredLayoutWeight:.015,settings,
  preliminarySearch:{status:'Diagnostic only; never used as current calibration.',paytableRevision:268,
    originalProfiles:original.profiles.map(p=>({initialFreeCells:p.initialFreeCells,automaticReturnPercent:p.automaticNumerator/original.denominator})),
    additionalLayouts:search.profiles.map(p=>({initialFreeCells:p.initialFreeCells,automaticReturnPercent:p.automaticNumerator/search.denominator})),
    decision:'The old table gave a minimum of 77.866990820% among the bounded 23-layout search, so ordinary payouts were reduced and current profiles were re-enumerated. Special 6×2=30× and 7×2=50× remain.'},
  reproduction:[
    'g++ -O3 -std=c++20 scripts/dango-v285-enumerate.cpp -o /tmp/dango-v285-enumerate',
    '/tmp/dango-v285-enumerate > /tmp/dango-v285-fresh.json',
    'node tests/dango-v285-calibration.mjs /tmp/dango-v285-fresh.json',
    'node tests/dango-v285-rules.mjs'
  ]
};
await fs.writeFile(new URL('docs/dango-v285-calibration.json',root),JSON.stringify(report,null,2)+'\n');
console.log('DANGO_V285_REPORT_WRITTEN',JSON.stringify({profiles:profiles.map(p=>p.automaticReturnPercent),settings:settings.length,rulesSha256:report.sources.rulesSha256}));

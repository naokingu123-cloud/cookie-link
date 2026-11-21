import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const root=new URL('../',import.meta.url),read=path=>fs.readFile(new URL(path,root),'utf8');
const data=JSON.parse(await read('docs/dango-v285-calibration.json')),ctx=vm.createContext({console});
vm.runInContext(await read('assets/dango-bingo-rules.js'),ctx);
const R=ctx.DangoBingoRules.legacy285,P=x=>JSON.parse(JSON.stringify(x)),D=BigInt(data.method.probabilityDenominator);
const N=data.profiles.map(p=>BigInt(p.automaticNumerator)),lengths=[2,3,4,5,6,7];
const bit=id=>1<<id,mask=ids=>ids.reduce((m,id)=>m|bit(id),0),pop=x=>{let n=0;for(;x;x&=x-1)n++;return n;};
assert.equal(R.REVISION,285);assert.equal(data.revision,285);assert.equal(data.profiles.length,3);
assert.equal(Number(D),53130*1140*2300);
assert.deepEqual(P(lengths.map(l=>R.tiers[l].slice(1))),data.approvedPaytableHundredths);
assert.equal(data.scope.globallyOptimalManualStrategy,false);
assert.equal(R.calibrationForTarget(90).optimalReturnPercent,null);
assert.equal(R.calibrationForTarget(90).exactWholeMedalBetMultiple,10);

// Brute-force every late set by counting final lines directly, without the
// runtime/C++ inclusion-exclusion scorer or simulated future-dependent AUTO.
function bruteFinalThree(s,manual){
  const initial=mask(s.initialFreeCells),early=mask(s.hitCells),placed=mask(manual),covered=initial|early|placed;
  const remaining=R.cells.filter(c=>!(initial&bit(c.id))&&!(early&bit(c.id))).map(c=>c.id);
  assert.equal(remaining.length,20);
  const groups=lengths.map(length=>P(R.gradeLines.filter(l=>l.length===length).map(l=>l.cells)).map(mask));
  let numerator=0;
  for(let a=0;a<18;a++)for(let b=a+1;b<19;b++)for(let c=b+1;c<20;c++){
    const late=bit(remaining[a])|bit(remaining[b])|bit(remaining[c]),marked=covered|late;
    let payout=0;
    for(let li=0;li<6;li++){
      const count=groups[li].filter(line=>(line&marked)===line).length;
      if(count)payout+=data.approvedPaytableHundredths[li][count-1];
    }
    numerator+=payout*(1+pop(placed&initial)+pop(placed&late));
  }
  return numerator;
}
let vectors=0,bruteCases=0;
for(let i=0;i<3;i++){
  const p=data.profiles[i],m=R.molds[i];
  assert.equal(m.id,p.id);assert.equal(m.automaticNumerator,p.automaticNumerator);
  assert.deepEqual(P(m.initialFreeCells),p.initialFreeCells);assert.ok(R.isValidInitialFree(p.initialFreeCells));
  const weighted=p.budgetNumerators.reduce((sum,n,q)=>sum+BigInt(n)*BigInt(data.triggerDistribution[q].ways),0n);
  assert.equal(weighted,BigInt(p.automaticNumerator));
  for(const [index,v] of p.vectors.entries()){
    const outside=R.cells.filter(c=>!p.initialFreeCells.includes(c.id)&&!v.earlyCells.includes(c.id)).map(c=>c.id);
    const triggers=[...v.earlyCells.slice(0,v.freeBudget-1),...outside.slice(0,4-v.freeBudget)];
    assert.equal(triggers.length,3);
    let s=R.create({moldIndex:i,numbers:Array.from({length:25},(_,n)=>n+1),triggerCells:triggers});
    for(const id of v.earlyCells)s=R.draw(s,s.numbers[id]);
    assert.equal(s.freeBudget,v.freeBudget);
    const snapshot=JSON.stringify(s),automatic=R.autoPlace(s);
    assert.equal(JSON.stringify(s),snapshot);
    assert.deepEqual(P(automatic.manualFreeCells.slice().sort((a,b)=>a-b)),v.manualCells);
    assert.equal(R.expectedNumeratorForPlacement(s,automatic.manualFreeCells),v.expectedNumerator);
    assert.equal(bruteFinalThree(s,v.manualCells),v.expectedNumerator);bruteCases++;vectors++;
    if(index===0)for(const id of R.availableCenters(s)){
      assert.equal(R.expectedNumeratorForCenter(s,id),bruteFinalThree(s,[id]));bruteCases++;
    }
  }
}

// Every one of the 101 integer settings is an exact rational mixture; the
// current implementation only rounds that final mixture to JS doubles.
assert.equal(data.settings.length,101);
for(const s of data.settings){
  const lo=BigInt(s.lowWeightNumerator),hi=BigInt(s.highWeightNumerator),featured=BigInt(s.featuredWeightNumerator),den=BigInt(s.weightDenominator);
  assert.equal(lo+hi+featured,den);assert.equal(featured*200n,3n*den);assert.ok(lo>0n&&hi>0n);
  assert.equal(lo*N[0]+hi*N[1]+featured*N[2],BigInt(s.target)*D*den);
  const c=R.calibrationForTarget(s.target);
  assert.ok(Math.abs(c.automaticReturnPercent-s.target)<1e-10);
  assert.ok(Math.abs(c.weights[1].weight-Number(hi)/Number(den))<1e-13);
  assert.equal(c.weights[2].weight,.015);assert.equal(c.uniformDraws,true);assert.equal(c.uniformTriggerTriplet,true);
}
for(const target of [50.5,75.25,99.99,149.75])
  assert.ok(Math.abs(R.calibrationForTarget(target).automaticReturnPercent-target)<1e-10);
assert.equal(R.calibrationForTarget(-1).target,50);assert.equal(R.calibrationForTarget(999).target,150);

// Enumerate all possible cyan triples for one fixed early set to validate the
// conditional hypergeometric weights instead of assuming the observed count.
const ways=[0,0,0,0];
for(let a=0;a<23;a++)for(let b=a+1;b<24;b++)for(let c=b+1;c<25;c++)ways[Number(a<5)+Number(b<5)+Number(c<5)]++;
assert.deepEqual(ways,[1140,950,200,10]);
assert.equal(ways.reduce((a,b)=>a+b),2300);
assert.equal(ways.reduce((sum,n,k)=>sum+n*(1+k),0)/2300,1.6);

if(process.argv[2]){
  const fresh=JSON.parse(await fs.readFile(process.argv[2],'utf8'));
  assert.equal(fresh.revision,285);assert.equal(fresh.denominator,Number(D));
  assert.deepEqual(fresh.paytableHundredths,data.approvedPaytableHundredths);
  assert.equal(fresh.profiles.length,3);
  for(let i=0;i<3;i++)for(const key of ['initialFreeCells','automaticNumerator','budgetNumerators','vectors'])
    assert.deepEqual(fresh.profiles[i][key],data.profiles[i][key]);
}
console.log('DANGO_V285_CALIBRATION_PASS',JSON.stringify({exactSettings:101,fractionalSettings:4,molds:3,
  earlySetsPerMold:53130,budgetsPerEarlySet:4,triggerTriplets:2300,vectors,directLateSetVectors:bruteCases,
  directLateSetOutcomes:bruteCases*1140,independentCpp:!!process.argv[2]}));

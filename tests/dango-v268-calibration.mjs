import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const root=new URL('..',import.meta.url),data=JSON.parse(await fs.readFile(new URL('docs/dango-v268-calibration.json',root),'utf8'));
const ctx=vm.createContext({console});
vm.runInContext(await fs.readFile(new URL('assets/dango-bingo-rules.js',root),'utf8'),ctx);
const R=ctx.DangoBingoRules,D=BigInt(data.probabilityDenominator),N=data.profiles.map(p=>BigInt(p.optimalNumerator)),P=x=>JSON.parse(JSON.stringify(x));
const lengths=[2,3,4,5,6,7],bit=id=>1<<id,mask=ids=>ids.reduce((m,id)=>m|bit(id),0),pop=x=>{let n=0;for(;x;x&=x-1)n++;return n;};
assert.equal(R.REVISION,268);assert.equal(data.revision,268);assert.equal(data.profiles.length,3);
assert.deepEqual(lengths.map(l=>P(R.tiers[l].slice(1))),data.approvedPaytableHundredths);

// This direct final-three enumerator shares no inclusion/exclusion score code.
// It counts completed skewers and late manual-FREE hits in each of the 1,140 sets.
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
let vectorCount=0,bruteCases=0;
for(let i=0;i<3;i++){
  const p=data.profiles[i],m=R.molds[i];
  assert.equal(m.id,p.id);assert.equal(m.optimalNumerator,p.optimalNumerator);
  assert.deepEqual(P(m.initialFreeCells),p.initialFreeCells);
  assert.equal(R.isValidInitialFree(p.initialFreeCells),true);
  for(const row of p.finalLineCounts)assert.equal(row.reduce((a,b)=>a+b),Number(D));
  assert.equal(p.gradeCounts.slice(1).reduce((a,b)=>a+b),53130);
  assert.equal(p.jackpotOutcomeCount,[3,0,2][i]);
  for(const [index,v] of p.vectors.entries()){
    let s=R.create({moldIndex:i,numbers:Array.from({length:25},(_,i)=>i+1)});
    for(const id of v.earlyCells)s=R.draw(s,s.numbers[id]);
    assert.equal(s.freeBudget,v.freeBudget);
    const automatic=R.autoPlace(s);
    assert.deepEqual(P(automatic.manualFreeCells.slice().sort((a,b)=>a-b)),v.manualCells);
    assert.equal(R.expectedNumeratorForPlacement(s,automatic.manualFreeCells),v.expectedNumerator);
    assert.equal(bruteFinalThree(s,v.manualCells),v.expectedNumerator);
    bruteCases++;vectorCount++;
    if(index===0)for(const id of R.availableCenters(s)){
      assert.equal(R.expectedNumeratorForCenter(s,id),bruteFinalThree(s,[id]));bruteCases++;
    }
  }
}
assert.equal(data.settings.length,101);
for(const item of data.settings){
  const lo=BigInt(item.lowWeightNumerator),hi=BigInt(item.highWeightNumerator),mid=BigInt(item.featuredWeightNumerator),den=BigInt(item.weightDenominator);
  assert.equal(lo+hi+mid,den);assert.equal(mid*200n,3n*den);
  assert.ok(lo>0n&&hi>0n);
  assert.equal(lo*N[0]+hi*N[1]+mid*N[2],BigInt(item.target)*D*den);
  const c=R.calibrationForTarget(item.target);
  assert.ok(Math.abs(c.automaticReturnPercent-item.target)<1e-10);
  assert.ok(Math.abs(c.weights[1].weight-item.weights[1])<1e-13);
}
for(const target of [50,90,150]){
  const e=data.exampleProbabilities[target],w=R.weightsForTarget(target).map(x=>x.weight);
  assert.deepEqual(P(w.map(v=>v.toPrecision(13))),e.weights.map(v=>v.toPrecision(13)));
  for(const row of e.rows)for(const [count,key]of [[1,'one'],[2,'two'],[3,'three']]){
    const p=data.profiles.reduce((sum,profile,i)=>sum+w[i]*profile.finalLineCounts[row.length-2][count]/Number(D),0);
    assert.ok(Math.abs(p-row[key])<1e-14,row.length+' '+count);
  }
}
if(process.argv[2]){
  const fresh=JSON.parse(await fs.readFile(process.argv[2],'utf8'));assert.equal(fresh.revision,268);
  assert.equal(fresh.denominator,Number(D));assert.equal(fresh.profiles.length,3);
  for(let i=0;i<3;i++){
    const f=fresh.profiles[i],p=data.profiles[i];
    for(const key of ['initialFreeCells','optimalNumerator','finalLineCounts','gradeCounts','earlyTwoLineCounts','jackpotOutcomeCount','vectors'])assert.deepEqual(f[key],p[key]);
  }
}
console.log('DANGO_V268_CALIBRATION_PASS',JSON.stringify({settings:101,molds:3,casesPerMold:Number(D),vectors:vectorCount,directFinalThreeCases:bruteCases,independent:!!process.argv[2]}));

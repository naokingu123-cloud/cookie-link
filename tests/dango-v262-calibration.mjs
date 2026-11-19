import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const root=new URL('..',import.meta.url),data=JSON.parse(await fs.readFile(new URL('docs/dango-v262-calibration.json',root),'utf8'));
const context=vm.createContext({console});vm.runInContext(await fs.readFile(new URL('assets/dango-bingo-rules.js',root),'utf8'),context);
const R=context.DangoBingoRules,plain=value=>JSON.parse(JSON.stringify(value)),lengths=[3,4,5,6,7];
assert.equal(data.rulesRevision,R.REVISION);
assert.equal(data.integerMethod.drawSpaceDenominator,R.DENOMINATOR);
assert.deepEqual(lengths.map(length=>plain(R.tiers[length].slice(1))),data.candidatePaytableHundredths);
assert.deepEqual(lengths.map(length=>plain(R.requestedTiers[length].slice(1))),data.requestedPaytableHundredths);
assert.equal(data.profiles.length,2);
for(const [i,p]of data.profiles.entries()){
 assert.equal(R.molds[i].id,p.id);
 assert.deepEqual(plain(R.molds[i].initialFreeCells),p.initialFreeCells);
 assert.deepEqual(plain(R.molds[i].triggerCells),p.triggerCells);
 assert.equal(R.molds[i].optimalNumerator,p.optimalNumerator);
 assert.equal(R.molds[i].optimalReturnPercent,p.optimalNumerator/p.denominator);
 assert.equal(R.molds[i].automaticReturnPercent,R.molds[i].optimalReturnPercent);
 assert.equal(p.activationSetCounts.reduce((a,b)=>a+b,0),53130);
 assert.equal(p.activationOptimalNumerators.reduce((a,b)=>a+b,0),p.optimalNumerator);
}
assert.equal(data.settings.length,101);
const low=BigInt(data.profiles[0].optimalNumerator),high=BigInt(data.profiles[1].optimalNumerator),D=BigInt(R.DENOMINATOR);
for(const s of data.settings){
 const lo=BigInt(s.lowWeightNumerator),hi=BigInt(s.highWeightNumerator),den=BigInt(s.weightDenominator);
 assert.equal(lo+hi,den);assert.ok(lo>0n&&hi>0n);
 assert.equal(lo*low+hi*high,BigInt(s.targetPercent)*D*den,'the exact rational mean equals the requested percentage');
 const c=R.calibrationForTarget(s.targetPercent);
 assert.ok(Math.abs(c.weights[1].weight-s.highWeight)<1e-13);
 assert.ok(Math.abs(c.automaticReturnPercent-s.targetPercent)<1e-10);
}

assert.equal(data.crossLanguageVectors.length,32);
let centerChecks=0;
for(const v of data.crossLanguageVectors){
 let s=R.create({moldIndex:v.moldIndex,numbers:v.numbers,seed:262});
 for(const number of v.firstFiveNumbers)s=R.draw(s,number);
 assert.equal(s.expansionLevel,v.activationCount,v.id);
 for(const expected of v.allCenterNumerators){assert.equal(R.expectedNumeratorForCenter(s,expected.center),expected.numerator,v.id+' center '+expected.center);centerChecks++;}
 const auto=R.autoPlace(s);assert.equal(auto.expansionCenter,v.bestCenter,v.id+' AUTO center');
 assert.equal(R.expectedNumeratorForCenter(s,v.bestCenter),v.bestExpectedNumerator,v.id+' optimal mean');
 if(v.center!==null)s=R.placeFree(s,v.center);
 assert.deepEqual([...s.expansionCells].sort((a,b)=>a-b),[...v.footprint].sort((a,b)=>a-b),v.id+' footprint');
 assert.deepEqual([...s.overlapFreeCells].sort((a,b)=>a-b),[...v.initialFreeOverlap].sort((a,b)=>a-b),v.id+' overlap');
 s=R.commitFree(s,{autoFill:false});assert.ok(s,v.id+' commitment');
 for(const number of v.lateNumbers)s=R.draw(s,number);
 assert.equal(s.oddsMultiplier,v.finalOdds,v.id+' ODDS');
 assert.deepEqual(plain(s.oddsHits),v.lateOddsHitNumbers,v.id+' late hits');
 assert.deepEqual(lengths.map(length=>s.lineCounts[length]),v.lineCounts,v.id+' line counts');
 assert.equal(s.totalHundredths,v.payoutHundredths,v.id+' payout');
}

if(process.argv[2]){
 const independent=JSON.parse(await fs.readFile(process.argv[2],'utf8'));
 for(const key of ['rulesRevision','model','candidatePaytableHundredths','requestedPaytableHundredths','integerMethod','profiles','settings','crossLanguageVectors'])assert.deepEqual(independent[key],data[key],'fresh C++ calculation: '+key);
}
console.log('DANGO_V262_CALIBRATION_PASS',JSON.stringify({exactProfiles:2,exactSettings:data.settings.length,
 vectors:data.crossLanguageVectors.length,centerChecks,independentRecompiled:!!process.argv[2]}));

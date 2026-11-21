import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const ctx=vm.createContext({});
vm.runInContext(await fs.readFile(new URL('../assets/dango-bingo-rules.js',import.meta.url),'utf8'),ctx);
const R=ctx.DangoBingoRules.legacy268??ctx.DangoBingoRules,P=value=>JSON.parse(JSON.stringify(value));
assert.equal(R.REVISION,268,'presentation does not revise the calibrated payout algorithm');
let seven=R.create({moldIndex:1,numbers:Array.from({length:25},(_,i)=>i+1)});
for(const id of [2,7,11,16,22])seven=R.draw(seven,seven.numbers[id]);
for(const id of [1,8,13,15,17,18])seven=R.placeFree(seven,id);
seven=R.commitFree(seven,{autoFill:false});
for(const id of [19,20])seven=R.draw(seven,seven.numbers[id]);
assert.equal(seven.draws.length,7);
assert.deepEqual(P(R.presentationReaches(seven)),P(R.reaches(seven)));
const prior=R.reaches(seven),priorNumbers=new Set(prior.map(hit=>hit.number));
let checked=0;
for(const eighthCell of [6,26]){
 const final=R.draw(seven,seven.numbers[eighthCell]),before=JSON.stringify(final),payout=R.payout(final);
 const projected=R.presentationReaches(final);
 assert.equal(final.phase,'done');assert.equal(final.draws.length,8);
 assert.deepEqual(P(R.reaches(final)),[],'ordinary gameplay reaches end at eight balls');
 assert.equal(JSON.stringify(final),before,'presentation leaves the complete state untouched');
 assert.equal(R.payout(final),payout);
 assert.ok(projected.every(hit=>hit.visualOnly===true&&hit.afterFinal===true&&!final.draws.includes(hit.number)));
 const desired=[];
 // Independent set-based final-board calculation; no ninth draw exists.
 for(let number=1;number<=25;number++)if(!final.draws.includes(number)){
  const marked=new Set([...final.initialFreeCells,...final.manualFreeCells,...final.draws.map(n=>final.numbers.indexOf(n)),final.numbers.indexOf(number)]);
  const counts={2:0,3:0,4:0,5:0,6:0,7:0};
  for(const line of R.gradeLines)if(line.cells.every(id=>marked.has(id)))counts[line.length]++;
  const oddsUp=final.manualFreeCells.includes(final.numbers.indexOf(number)),odds=final.oddsMultiplier+Number(oddsUp);
  const total=[2,3,4,5,6,7].reduce((sum,l)=>sum+R.tiers[l][counts[l]],0)*odds;
  if(total>payout||oddsUp)desired.push(number);
  const hit=projected.find(hit=>hit.number===number);
  if(hit){assert.deepEqual(P(hit.lineCounts),counts);assert.equal(hit.totalHundredths,total);assert.equal(hit.gainHundredths,total-payout);checked++;}
 }
 assert.deepEqual(P(projected.map(hit=>hit.number)),desired);
 if(eighthCell===6){
  assert.ok(projected.some(hit=>!priorNumbers.has(hit.number)),'ball eight introduces genuinely new final-board reaches');
  assert.equal(projected.find(hit=>hit.number===final.numbers[26]).lineCounts[6],3);
 }else{
  assert.ok(priorNumbers.has(seven.numbers[26]));
  assert.ok(!projected.some(hit=>hit.number===seven.numbers[26]),'eighth-ball GET does not remain a stale seventh-ball reach');
  assert.equal(final.lineCounts[6],3);
 }
 const unused=Array.from({length:25},(_,i)=>i+1).find(n=>!final.draws.includes(n));
 assert.equal(R.draw(final,unused),null,'a ninth gameplay draw is still rejected');
 assert.deepEqual(P(R.presentationReaches(final)),P(projected));
 assert.equal(JSON.stringify(final),before);
}
let legacy=R.create({rulesRevision:266,moldIndex:1,numbers:Array.from({length:25},(_,i)=>i+1)});
for(const n of [1,2,3,4,5])legacy=R.draw(legacy,n);
legacy=R.commitFree(legacy);for(const n of [6,7,8])legacy=R.draw(legacy,n);
assert.deepEqual(P(R.presentationReaches(legacy)),P(R.reaches(legacy)));
console.log('DANGO_V269_PRESENTATION_RULES_PASS',JSON.stringify({rulesRevision:R.REVISION,finalBoards:2,independentProjections:checked,ordinaryFinalReachEmpty:true,ninthDrawRejected:true,payoutUnchanged:true}));

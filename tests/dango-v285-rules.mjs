import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const ctx=vm.createContext({console});
vm.runInContext(await fs.readFile(new URL('../assets/dango-bingo-rules.js',import.meta.url),'utf8'),ctx);
const R=ctx.DangoBingoRules,P=x=>JSON.parse(JSON.stringify(x));
const numbers=Array.from({length:25},(_,i)=>i+1),lengths=[2,3,4,5,6,7];
const base=options=>R.create({moldIndex:0,numbers,triggerCells:[1,2,3],...options});
const drawCells=(s,ids)=>ids.reduce((state,id)=>R.draw(state,state.numbers[id]),s);
assert.equal(R.REVISION,285);assert.equal(R.legacy268.REVISION,268);
assert.deepEqual(P(lengths.map(l=>R.tiers[l].slice(1))),[
  [0,10,500],[10,40,1000],[20,60,2500],[40,150,5000],[80,3000,25000],[100,5000,200000]
]);
assert.equal(R.TRIGGER_COUNT,3);assert.equal(R.BASE_FREE_BUDGET,1);assert.equal(R.MAX_FREE_BUDGET,4);
assert.equal(base().freeBudget,1);
assert.deepEqual(P(base().triggerNumbers),[1,2,3]);

// Every early cyan count has its own budget; the fifth ball ends the cyan phase.
for(let hitCount=0;hitCount<=3;hitCount++){
  let s=base(),early=[1,2,3].slice(0,hitCount).concat([4,5,6,7,8].slice(0,5-hitCount));
  for(let i=0;i<5;i++){
    const before=s;s=R.draw(s,s.numbers[early[i]]);
    assert.equal(s.freeBudget,1+Math.min(hitCount,i+1));
    assert.equal(s.lastBonusGain,i<hitCount?1:0);
    assert.equal(s.triggerActive,i<4);
    assert.equal(s.oddsMultiplier,1,'cyan is a FREE gain, never an odds gain');
    assert.deepEqual(P(before.draws),early.slice(0,i).map(id=>before.numbers[id]));
    assert.equal(R.draw(s,s.numbers[early[i]]),s,'duplicate numbers do not award again');
  }
  assert.equal(s.phase,'placing');assert.equal(s.freeBudget,1+hitCount);
  assert.equal(s.cells.some(c=>c.triggerActive),false);
  assert.deepEqual(P(s.triggerHits),early.slice(0,hitCount).map(id=>s.numbers[id]));
  assert.deepEqual(P(s.bonusHits),P(s.triggerHits));
  assert.equal(s.cells.filter(c=>c.triggerHit).length,hitCount);
  assert.equal(R.draw(s,s.numbers[9]),null,'ball six requires placement commitment');
  assert.equal(R.commitFree(s,{autoFill:false}),null);
  const before=JSON.stringify(s),automatic=R.autoPlace(s);
  assert.equal(JSON.stringify(s),before,'AUTO must not mutate its input');
  assert.equal(automatic.manualFreeCells.length,1+hitCount);
  const committed=R.commitFree(automatic,{autoFill:false});
  assert.equal(committed.phase,'draw-final');assert.equal(committed.freeRemaining,0);
  assert.equal(R.commitFree(committed),committed,'placement commitment is idempotent');
}
let fifth=drawCells(base(),[4,5,6,7,1]);
assert.equal(fifth.freeBudget,2);assert.equal(fifth.lastBonusGain,1);assert.equal(fifth.triggerActive,false);

// Completing early lines no longer awards any FREE.
let line=R.create({moldIndex:0,numbers,triggerCells:[6,7,8]});
line=drawCells(line,[1,2,3,4,5]);
assert.ok(line.qualifiedEarlyLengths.includes(3));
assert.equal(line.freeBudget,1);assert.equal(line.lastBonusGain,0);assert.deepEqual(P(line.triggerHits),[]);
line=R.commitFree(R.placeFree(line,0),{autoFill:false});
line=R.draw(line,line.numbers[6]);
assert.equal(line.freeBudget,1);assert.equal(line.lastBonusGain,0,'cyan after the fifth ball is inactive');
assert.equal(line.oddsMultiplier,2,'an ordinary late cyan HIT cannot raise odds');

// The two and only two odds sources: yellow on green; numbered HIT on yellow.
let odds=drawCells(base(),[1,2,4,5,6]);
assert.equal(odds.freeBudget,3);assert.equal(R.placeFree(odds,1),null,'pink early HIT is ineligible');
odds=R.placeFree(odds,0);assert.equal(odds.oddsMultiplier,2);assert.equal(odds.lastOddsGain,1);
odds=R.undoFree(odds,0);assert.equal(odds.oddsMultiplier,1);
odds=R.placeFree(odds,0);odds=R.placeFree(odds,3);odds=R.placeFree(odds,7);
assert.equal(odds.oddsMultiplier,2);assert.equal(odds.lastOddsGain,0);
assert.equal(odds.cells[3].trigger,true);assert.equal(odds.cells[3].triggerActive,false);
odds=R.commitFree(odds,{autoFill:false});
odds=R.draw(odds,odds.numbers[3]);assert.equal(odds.oddsMultiplier,3);assert.equal(odds.lastOddsGain,1);
assert.equal(odds.freeBudget,3);assert.equal(odds.lastBonusGain,0);
odds=R.draw(odds,odds.numbers[7]);assert.equal(odds.oddsMultiplier,4);
odds=R.draw(odds,odds.numbers[8]);assert.equal(odds.oddsMultiplier,4);assert.equal(odds.phase,'done');
assert.equal(R.draw(odds,odds.numbers[9]),null);assert.deepEqual(P(R.reaches(odds)),[]);
assert.deepEqual(P(odds.oddsHits),[odds.numbers[3],odds.numbers[7]]);
const doneBefore=JSON.stringify(odds);R.presentationReaches(odds);
assert.equal(JSON.stringify(odds),doneBefore,'final presentation cannot draw a ninth ball');

// All current payouts except 7×3 have a constructive, legal round.
function* combinations(pool,count,start=0,prefix=[]){
  if(count===0){yield prefix;return;}
  for(let i=start;i<=pool.length-count;i++)yield*combinations(pool,count-1,i+1,[...prefix,pool[i]]);
}
const bit=id=>1<<id,mask=ids=>ids.reduce((m,id)=>m|bit(id),0);
const contains=(m,line)=>(m&line.mask)===line.mask;
const proofs=[];
for(const length of lengths)for(let count=1;count<=3;count++){
  const row=R.payRows.find(r=>r.length===length&&r.count===count);
  if(length===7&&count===3){assert.equal(row.possible,false);continue;}
  assert.equal(row.possible,true);let witness=null;
  for(let moldIndex=0;moldIndex<R.molds.length&&!witness;moldIndex++){
    const initial=P(R.molds[moldIndex].initialFreeCells),group=R.gradeLines.filter(l=>l.length===length);
    for(const selected of combinations(P(group),count)){
      const required=[...new Set([...initial,...selected.flatMap(l=>l.cells)])];
      if(required.length>15)continue;
      const spare=Array.from({length:28},(_,i)=>i).filter(id=>!required.includes(id));
      for(const added of combinations(spare,Math.max(0,11-required.length))){
        const marked=[...required,...added],m=mask(marked);
        if(group.filter(l=>contains(m,l)).length!==count)continue;
        const pool=marked.filter(id=>!initial.includes(id)),early=pool.slice(0,5),late=pool.slice(-3);
        const manual=pool.slice(5,-3),overlaps=[...initial,...late];
        while(manual.length<4)manual.push(overlaps.shift());
        let s=R.create({moldIndex,numbers,triggerCells:early.slice(0,3)});
        s=drawCells(s,early);assert.equal(s.freeBudget,4);
        for(const id of manual){s=R.placeFree(s,id);assert.ok(s);}
        s=R.commitFree(s,{autoFill:false});s=drawCells(s,late);
        assert.equal(s.phase,'done');assert.equal(s.lineCounts[length],count);
        witness={length,count,moldIndex,early,manual,late};break;
      }
      if(witness)break;
    }
  }
  assert.ok(witness,`${length}×${count} needs a legal route`);proofs.push(witness);
}
const perimeter=new Set(R.lines.filter(l=>l.length===7).flatMap(l=>P(l.cells)));
assert.equal(perimeter.size,18);assert.ok(3+8+R.MAX_FREE_BUDGET<perimeter.size);
assert.equal(R.isHighestRole(7,3,{rulesRevision:285}),false);
assert.equal(R.isHighestRole(7,2,{rulesRevision:285}),true);
assert.equal(R.isHighestRole(6,3,{rulesRevision:285}),true);
assert.equal(R.isHighestRole(7,3,{rulesRevision:268}),true);

// Uniform cyan selection consumes the same RNG algorithm at every payout target.
for(let seed=1;seed<=100;seed++)for(let moldIndex=0;moldIndex<3;moldIndex++){
  const s=R.create({moldIndex,seed,target:50}),higher=R.create({moldIndex,seed,target:150});
  assert.equal(s.triggerCells.length,3);assert.equal(new Set(s.triggerCells).size,3);
  assert.ok(s.triggerCells.every(id=>s.numbers[id]>0));
  assert.deepEqual(P(s.triggerCells),P(higher.triggerCells));assert.deepEqual(P(s.numbers),P(higher.numbers));
  assert.equal(s.lineCounts[2],0);assert.equal(s.completedLines.length,0);
}
for(const triggerCells of [[1,1,2],[1,2],[0,1,2],[1,2,28],null])
  assert.throws(()=>base({triggerCells}),/three distinct numbered/);

// New revision dispatch retains unknown and historical routing unchanged.
for(const revision of [254,262,263,264,265,266,268]){
  const options={rulesRevision:revision,seed:28501,target:90};
  let current=R.create(options),legacy=R.legacy268.create(options);
  assert.deepEqual(P(current),P(legacy));
  for(const number of [1,2,3]){
    current=R.draw(current,number);legacy=R.legacy268.draw(legacy,number);
    assert.deepEqual(P(current),P(legacy));
  }
  assert.equal(R.payout(current),R.legacy268.payout(legacy));
  assert.deepEqual(P(R.payRowsFor(current)),P(R.legacy268.payRowsFor(legacy)));
}
for(const revision of [251,253,999]){
  const errors=[];
  for(const api of [R,R.legacy268]){
    try{api.create({rulesRevision:revision,seed:28501,target:90});assert.fail('unsupported creation must throw');}
    catch(error){errors.push({name:error.name,message:error.message});}
  }
  assert.equal(errors[0].name,'RangeError');assert.deepEqual(errors[0],errors[1]);
}
console.log('DANGO_V285_RULES_PASS',JSON.stringify({budgets:[1,2,3,4],firstFiveOnly:true,oddsSources:2,
  legalPayoutRoutes:proofs.length,unreachable:[[7,3]],cyanDeterminismBoards:300,unknownRevisionPreserved:true,proofs}));

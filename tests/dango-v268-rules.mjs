import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const ctx=vm.createContext({console});
vm.runInContext(await fs.readFile(new URL('../assets/dango-bingo-rules.js',import.meta.url),'utf8'),ctx);
// Historical v268 guarantees stay pinned when a later engine becomes current.
const R=ctx.DangoBingoRules.legacy268??ctx.DangoBingoRules,P=x=>JSON.parse(JSON.stringify(x));
const lengths=[2,3,4,5,6,7],numbers=Array.from({length:25},(_,i)=>i+1);
const pay=[[0,20,1000],[20,80,2000],[40,120,5000],[80,300,10000],[150,3000,50000],[200,5000,200000]];
assert.equal(R.REVISION,268);
assert.equal(R.legacy266.REVISION,266);
assert.deepEqual(P(lengths.map(l=>R.tiers[l].slice(1))),pay);
assert.deepEqual(P(R.highestRoleMinimums),{4:3,5:3,6:2,7:2});
const highest=[];
for(const length of lengths)for(let count=1;count<=3;count++)
  if(R.isHighestRole(length,count,{rulesRevision:268}))highest.push([length,count]);
assert.deepEqual(highest,[[4,3],[5,3],[6,2],[6,3],[7,2],[7,3]]);

// No new board begins with a completed short line or three consecutive FREE.
for(const bad of [[3,4,5],[14,19,25],[10,16,23],[1,2,7],[15,22,0],[20,26,0],[10,11,12],[1,3,6]]){
  assert.equal(R.isValidInitialFree(bad),false,JSON.stringify(bad));
  assert.throws(()=>R.create({initialFreeCells:bad,numbers}),/Starting FREE/);
}
for(let moldIndex=0;moldIndex<3;moldIndex++){
  const s=R.create({moldIndex,numbers});
  assert.equal(s.freeBudget,1);
  assert.equal(s.completedLines.length,0);
  assert.equal(s.lineCounts[2],0);
  assert.equal(s.totalHundredths,0);
  assert.equal(R.isValidInitialFree(P(s.initialFreeCells)),true);
  assert.deepEqual(P(s.numbers.filter(n=>n>0).sort((a,b)=>a-b)),numbers);
}
for(let target=50;target<=150;target++){
  const calibration=R.calibrationForTarget(target);
  assert.ok(calibration.weights.every(w=>w.weight>0&&w.weight<1));
  assert.equal(calibration.weights[2].weight,.015);
  assert.ok(Math.abs(calibration.automaticReturnPercent-target)<1e-10);
}

// A legal six-FREE game reaches two six-cell skewers, then the third.
let six=R.create({moldIndex:1,numbers});
for(const id of [2,7,11,16,22])six=R.draw(six,six.numbers[id]);
assert.equal(six.freeBudget,6);
for(const id of [1,8,13,15,17,18])six=R.placeFree(six,id);
six=R.commitFree(six,{autoFill:false});
six=R.draw(six,six.numbers[19]);
assert.equal(six.lineCounts[6],1);
let reach=R.reaches(six).find(r=>r.number===six.numbers[20]);
assert.ok(reach);
assert.equal(reach.lineCounts[6],2);
assert.deepEqual(P(reach.newHighestRoles),[6]);
assert.equal(reach.nextPayRows.find(row=>row.length===6).hundredths,3000);
six=R.draw(six,six.numbers[20]);
assert.equal(six.lineCounts[6],2);
assert.equal(six.highestRole,true);
assert.ok(six.newHighestRoles.includes(6));
reach=R.reaches(six).find(r=>r.number===six.numbers[26]);
assert.equal(reach.lineCounts[6],3);
assert.ok(reach.newHighestRoles.includes(6),'three-line upgrade must emit a new highest-role event');
six=R.draw(six,six.numbers[26]);
assert.equal(six.lineCounts[6],3);
assert.ok(six.newHighestRoles.includes(6));
assert.equal(six.phase,'done');
assert.equal(R.payRowsFor(six).find(row=>row.length===6&&row.count===3).hundredths,50000);

// AUTO can still complete all three seven-cell lines from a nonline start.
let perimeter=R.create({moldIndex:0,numbers});
for(const n of [1,3,6,10,15])perimeter=R.draw(perimeter,n);
assert.equal(perimeter.freeBudget,7);
perimeter=R.autoPlace(perimeter);
assert.equal(perimeter.manualFreeCells.length,7);
const allPerimeter=new Set(R.lines.filter(line=>line.length===7).flatMap(line=>P(line.cells)));
const marked=new Set(P(perimeter.markedCells));
const remaining=[...allPerimeter].filter(id=>!marked.has(id));
assert.equal(remaining.length,3);
perimeter=R.commitFree(perimeter,{autoFill:false});
for(const id of remaining)perimeter=R.draw(perimeter,perimeter.numbers[id]);
assert.equal(perimeter.lineCounts[7],3);
assert.ok(perimeter.highestRoles.includes(7));
assert.ok(perimeter.totalHundredths>=200000);

// Restored games retain their own exact payout/starting-layout semantics.
for(const revision of [262,263,264,265,266]){
  const old=R.create({rulesRevision:revision,moldIndex:0,numbers});
  assert.equal(old.rulesRevision,revision);
  assert.equal(R.tiersFor(old)[6][2],({262:1500,263:2000,264:2000,265:2000,266:500})[revision]);
}
const oldTriple=R.create({rulesRevision:266,moldIndex:1,numbers});
assert.equal(oldTriple.lineCounts[3],1);
assert.equal(R.isHighestRole(3,3,oldTriple),true);
assert.equal(R.tiersFor(oldTriple)[7][2],2000);
assert.equal(R.legacy266.autoPlace(R.draw(R.draw(R.draw(R.draw(R.draw(oldTriple,1),2),3),4),5)).rulesRevision,266);

console.log('DANGO_V268_RULES_PASS',JSON.stringify({highestRoles:highest,legacy:[262,263,264,265,266],safeInitialLayouts:3,sixLineUpgrade:true,perimeterJackpot:true,allTargets:101}));

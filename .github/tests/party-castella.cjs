'use strict';
const assert=require('node:assert/strict');
const R=require('../../assets/party-castella-rules.js');
const all=R.cells.map(c=>c.id),numbers=Array.from({length:25},(_,i)=>i+1),spokes=[0,1,2,3,4,5,6,7,9,11,13,15,17,19,22,25,28,31,34];
const sorted=a=>[...a].sort((x,y)=>x-y);
const locations=new Map(R.cells.map(c=>[c.q+','+c.r,c.id]));
const oddsGroups=[20,40,60,80,100,120,140,160,180,200,250,300,400,500,750,1000,2000,5000];
const proofs=[[0,19,25,28,34],[0,19,25,28,34],[0,2,19,25,31],[0,2,19,25,31],[0,9,26,31,36],[0,2,19,25,31],[0,9,26,31,36],[0,9,26,31,36],[0,7,23,28,34],[0,1,19,25,31]];
const rates=[100.329207274,106.956627207,111.914012832,112.097422872,116.196845671,131.510620292,133.323314214,134.965883748,148.456562222,160.042278423];
function symmetrical(ids){
  const set=new Set(ids);
  for(const i of ids){
    const {q,r}=R.cells[i];
    assert(set.has(locations.get((-q-r)+','+r)),'left-right reflected cell missing '+i);
    assert(set.has(locations.get((-q)+','+(-r))),'half-turn cell missing '+i);
  }
}
function distance(a,b){return Math.max(Math.abs(a.q-b.q),Math.abs(a.r-b.r),Math.abs(a.q+a.r-b.q-b.r));}
assert.equal(R.molds.length,10);
assert.deepEqual(R.payRows.map(x=>x.hundredths),oddsGroups);
assert.equal(R.effectiveTarget(50),rates[0]);
assert.equal(R.effectiveTarget(150),150);
assert.equal(R.effectiveTarget(180),rates[9]);
const seen=new Set();
for(const [k,mold] of R.molds.entries()){
  assert(Math.abs(mold.returnPercent-rates[k])<1e-7);
  const s=R.create({target:mold.returnPercent,rng:()=>.5});
  assert.equal(s.moldIndex,k);
  assert.equal(s.wetCount,6);
  assert.equal(s.fireLevel,1);
  assert.equal(s.oddsHits,0);
  assert.equal(s.oddsMultiplier,100);
  assert.equal(s.cells.filter(c=>c.number!=null).length,25);
  assert.deepEqual(sorted(s.cells.map(c=>c.number).filter(Boolean)),numbers);
  assert(spokes.every(i=>s.cells[i].number));
  assert.deepEqual(s.edges,R.originalEdges);
  assert.equal(s.edges.length,54);
  assert.equal(s.zones.length,20);
  assert.equal(new Set(s.zones.map(z=>z.anchor)).size,20);
  assert.equal(s.specials.fire.length,2);
  assert.equal(s.specials.odds.length,4);
  const starters=all.filter(i=>s.wet[i]);
  symmetrical(starters);
  symmetrical(all.filter(i=>s.cells[i].number));
  symmetrical(s.zones.map(z=>z.anchor));
  const specials=[...s.specials.fire,...s.specials.odds];
  assert.equal(new Set(specials).size,6);
  assert(specials.every(i=>s.cells[i].number===null&&!s.wet[i]));
  const key=JSON.stringify([starters,all.filter(i=>s.cells[i].number),specials,s.zones.map(z=>z.anchor)]);
  assert(!seen.has(key));seen.add(key);
  let after=s;
  for(const id of proofs[k]){
    const next=R.draw(after,s.cells[id].number);
    assert(next,'proof should use opening number');
    assert.equal(next.draws.length,after.draws.length+1);
    assert(next.wetCount>=after.wetCount);
    assert(next.fireLevel>=after.fireLevel);
    assert(next.oddsHits>=after.oddsHits);
    assert(next.wave.length===3);
    after=next;
  }
  assert.equal(after.wetCount,37,'every layout must permit a full first-stage pour');
  assert.equal(after.fireLevel,3,'both fire tiles activate');
  assert.equal(after.oddsHits,4,'all odds tiles activate');
  assert.equal(after.oddsMultiplier,180);
  assert.deepEqual(sorted(after.zones.flatMap(z=>z.numbers)),numbers.filter(n=>!after.draws.includes(n)));
  for(const z of after.zones){
    assert.equal(z.radius,3);
    assert.deepEqual(sorted(z.cells),all.filter(i=>distance(s.cells[z.anchor],s.cells[i])<=3));
    assert.equal(z.numbers.length,1);
  }
  let winner;
  outer:for(let i=0;i<20;i++)for(let j=i+1;j<20;j++)for(let k2=j+1;k2<20;k2++){
    const z=[after.zones[i],after.zones[j],after.zones[k2]];
    if(new Set(z.flatMap(x=>x.cells)).size===37){winner=z;break outer;}
  }
  assert(winner,'every layout must allow a complete three-ball bake');
  let end=after;
  for(const z of winner)end=R.draw(end,z.numbers[0]);
  assert.equal(end.draws.length,8);
  assert.equal(end.phase,'done');
  assert.equal(end.bakedCount,37);
  assert(end.highestRole);
  assert.equal(end.totalHundredths,9000,'50x base plus four +0.2x odds-up should pay 90x');
  assert.equal(R.draw(end,end.lastNumber),null);
  // Verify a cold bake before any fire tile is activated is radius one.
  const cold=R.create({target:mold.returnPercent,rng:()=>.5});
  assert(cold.zones.every(z=>z.radius===1&&z.cells.every(i=>distance(cold.cells[z.anchor],cold.cells[i])<=1)));
}
const d=R.createDemo();let state=d.state;
assert.equal(d.draws.length,8);
for(const n of d.draws){state=R.draw(state,n);assert(state);}
assert.equal(state.bakedCount,37);
assert.equal(state.totalHundredths,9000);
for(let i=20;i<=37;i++)assert.equal(R.payout(i),oddsGroups[i-20]);
assert.equal(R.payout(37,4),9000);
assert.equal(R.payout(35,2),1400);
assert.equal(R.payout(19,4),0);
console.log('Party Castella: 10 symmetric six-batter layouts, heat Lv1/2/3, four honey odds tiles, 8-ball sweeps and golden WIN table validated.');

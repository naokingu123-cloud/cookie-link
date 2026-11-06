'use strict';
const assert=require('node:assert/strict'),R=require('../../assets/party-castella-rules.js');
assert.equal(R.molds.length,10);
assert.equal(R.ODDS_STEP,50);
assert.equal(R.payout(19,4),0,'below threshold never pays');
assert.equal(R.payout(20,0),20);
assert.equal(R.payout(20,4),60,'0.2x base × 3 = 0.6x');
assert.equal(R.payout(35,0),1000);
assert.equal(R.payout(35,1),1500,'10x base × 1.5 = 15x');
assert.equal(R.payout(35,2),2000,'10x base × 2 = 20x');
assert.equal(R.payout(35,3),2500,'10x base × 2.5 = 25x');
assert.equal(R.payout(35,4),3000,'10x base × 3 = 30x');
assert.equal(R.payout(37,0),5000);
assert.equal(R.payout(37,4),15000,'50x base × 3 = 150x');
assert.equal(R.effectiveTarget(50),R.minReturn);
assert.equal(R.effectiveTarget(150),R.maxReturn);
const exactRates=[259.74898230425,277.05386522961,284.05237880604,283.83253638048,289.45312094465,279.3882794932,286.34481444058,291.21287754961,322.66830812208,333.06314171463];
for(let i=0;i<10;i++){
 assert(Math.abs(R.molds[i].returnPercent-exactRates[i])<1e-8,'exact new RTP not in mold '+i);
 const s=R.createBoard(i,90,()=>.37);
 assert.equal(s.wetCount,6);assert.equal(s.zones.length,0);
 assert.equal(s.oddsMultiplier,100);
 const orig=new Map(s.cells.filter(c=>c.number!==null).map(c=>[c.number,c.id]));
 let poured=s;for(const n of [1,2,3,4,5])poured=R.draw(poured,n);
 assert.equal(poured.zones.length,20);
 for(const zone of poured.zones){
  assert.equal(orig.get(zone.numbers[0]),zone.anchor);
  assert(!poured.draws.includes(zone.numbers[0]));
 }
 assert.equal(poured.oddsMultiplier,100+poured.oddsHits*50);
 let played=poured;for(const zone of poured.zones.slice(0,3))played=R.draw(played,zone.numbers[0]);
 assert.equal(played.draws.length,8);
 assert.equal(played.phase,'done');
 assert.equal(played.totalHundredths,R.payout(played.bakedCount,played.oddsHits));
}
const demo=R.createDemo();let d=demo.state;for(const n of demo.draws)d=R.draw(d,n);
assert.equal(d.bakedCount,37);assert.equal(d.oddsHits,4);
assert.equal(d.totalHundredths,15000);
// Project every unused number without spending a ball. Give an eighth-ball
// snapshot a ninth oven action only in the oracle by freeing an old bake draw.
let sawZeroOdds=false,sawFinal=false,sawSmallGain=false;
for(let seed=1;seed<=48;seed++){
 let x=seed;const rng=()=>((x=(Math.imul(x,1664525)+1013904223)>>>0)/2**32);
 let s=R.create({rng}),deck=Array.from({length:25},(_,i)=>i+1);
 for(let i=24;i>0;i--){const j=Math.floor(rng()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
 for(let count=0;count<=8;count++){
  const base=R.payout(s.bakedCount,s.oddsHits),saved=JSON.stringify(s),hits=R.reaches(s);
  assert.equal(JSON.stringify(s),saved);
  for(const n of Array.from({length:25},(_,i)=>i+1)){
   const hit=hits.find(h=>h.number===n);
   if(s.draws.includes(n)){assert(!hit);continue;}
   const next=R.draw(count===8?{...s,draws:s.draws.slice(0,7)}:s,n);
   const pay=R.payout(next.bakedCount,next.oddsHits),oddsUp=next.oddsHits>s.oddsHits;
   assert.equal(Boolean(hit),pay>base||oddsUp);
   if(hit){
    assert.equal(hit.total,pay);assert.equal(hit.gain,pay-base);assert.equal(hit.oddsUp,oddsUp);
    assert.equal(hit.allClear,s.bakedCount<37&&next.bakedCount===37);
    assert.equal(s.cells[hit.anchor].number,n);
    sawZeroOdds ||= !base&&!pay&&oddsUp;sawFinal ||= count===8;
    sawSmallGain ||= pay>base&&pay<100;
   }
  }
  if(count<8)s=R.draw(s,deck[count]);
 }
 assert.equal(R.draw(s,deck[8]),null);
}
const almost=demo.draws.slice(0,7).reduce(R.draw,demo.state);
const sawSweep=R.reaches(almost).some(h=>h.number===demo.draws[7]&&h.allClear);
assert(sawZeroOdds&&sawFinal&&sawSweep&&sawSmallGain);assert.deepEqual(R.reaches(d),[]);
console.log('Castella: 0–4 honey spots multiply the ORIGINAL base odds by 1.0–3.0; board RTP and payouts verified.');

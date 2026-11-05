'use strict';
const assert=require('node:assert/strict');
const R=require('../../assets/party-castella-rules.js');
assert.equal(R.molds.length,10);
assert.equal(R.payout(19,4),0);
assert.equal(R.payout(35,1),1050);
assert.equal(R.payout(37,4),5200);
for(let i=0;i<10;i++){
 const s=R.createBoard(i,90,()=>.37);
 assert.equal(s.wetCount,6);
 assert.equal(s.zones.length,0);
 const prev=new Map(s.cells.filter(c=>c.number!==null).map(c=>[c.number,c.id]));
 let poured=s;
 for(const n of [1,2,3,4,5])poured=R.draw(poured,n);
 assert.equal(poured.zones.length,20);
 for(const zone of poured.zones){
  assert.equal(prev.get(zone.numbers[0]),zone.anchor);
  assert(!poured.draws.includes(zone.numbers[0]));
  assert.equal(zone.radius,poured.fireLevel);
 }
}
const demo=R.createDemo();let end=demo.state;
for(const n of demo.draws)end=R.draw(end,n);
assert.equal(end.bakedCount,37);
assert.equal(end.totalHundredths,5200);
console.log('Castella: persistent original bake sites and additive +0.5x ODDS passed');

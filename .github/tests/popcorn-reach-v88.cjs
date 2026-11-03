'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const K=require('../../assets/popcorn-engine.js');
const read=file=>fs.readFileSync(path.join(__dirname,'../..',file),'utf8');
const host=read('assets/popcorn-host.js'),shared=read('optimized/app-01.js');
function section(source,start,end){
 const i=source.indexOf(start),j=source.indexOf(end,i+start.length);
 assert.ok(i>=0&&j>i,start);return source.slice(i,j);
}
const bind=new Function('K','slot','engine','app',[
 'const id=2;',
 section(shared,'const medalWin=','\n'),
 section(shared,'const reachTier=','\n'),
 section(shared,'const paidReachDrawAllowed=','\n'),
 section(shared,'function invalidateReach(s,','// Final refill'),
 section(shared,'function reachBoardSettled(','function failReachPreview('),
 section(shared,'function reachAvailable(','function visibleReachResults('),
 section(shared,'function visibleTabReachResults(','function finishReachSlide('),
 section(host,'const reachKinds=','slot.updatePopcornReach=updateReach;'),
 'return {update:()=>updateReach(app),strip:()=>visibleTabReachResults(slot,app)};'
].join('\n'));
let n=4728;
const random=()=>((n=Math.imul(n,1664525)+1013904223|0)>>>0)/2**32;
function board(clears,popped=0,power=5,balls=2){
 const s=K.create({rng:random,bet:1});
 s.clears=clears;s.popped=popped;s.firstPopAward=120;
 s.board=s.board.map((p,i)=>{
   const v=K.cells[i].q===0&&K.cells[i].r===0?power:0;
   return {...p,power:v,bomb:v>0,color:v};
 });
 const engine={state:s,kind:'popcorn',drawMode:'single',queue:[],phase:'settled',running:true,version:1,
   processed:balls,accepted:balls,allClears:clears,totalHundredths:K.payout(popped,clears,100,120)};
 const app={phase:'playing',bet:()=>1,token:1,draws:Array.from({length:25},(_,i)=>i+1).filter(v=>!s.numbers.includes(v)).slice(0,balls)};
 const slot={i:2,engine};
 const api=bind(K,slot,engine,app);
 const run=()=>{api.update();return slot;};
 return {s,slot,app,engine,run,strip:api.strip,match:(array,index)=>array.find(p=>p.number===s.numbers[index])};
}
for(const [before,tier,kind] of [[0,0,'reach'],[1,1,'high'],[2,3,'all'],[7,3,'all']]){
 const f=board(before),snap=JSON.stringify(f.s),slot=f.run();
 for(const index of [4,f.s.allIndex]){ // ordinary lane into a rainbow, or ALL ignition
   const main=f.match(slot.reachResults,index),mini=f.match(slot.tabReachResults,index);
   assert.deepEqual([main.allClear,main.tier,main.kind],[true,3,'all']);
   assert.deepEqual([mini.allClear,mini.tier,mini.kind],[true,tier,kind]);
   assert.equal(main.total,mini.total);
   assert.ok(f.match(f.strip(),index),'even the one-credit wager receives the clear bonus');
 }
 assert.ok(!f.match(slot.reachResults,f.s.boostIndex));
 assert.deepEqual(slot.tabReachResults.map(r=>r.number),slot.tabReachResults.map(r=>r.number).sort((a,b)=>a-b));
 f.run();assert.equal(JSON.stringify(f.s),snap);
}
// An early clear can carry a super-sized award: it gets that mini tier rather than rainbow.
const early=board(1,419),earlySlot=early.run();
assert.deepEqual([early.match(earlySlot.reachResults,4).kind,early.match(earlySlot.tabReachResults,4).kind],['all','super']);
// Match ordinary and high/super rings by incremental odds, not total accrued WIN.
for(const [popped,power,want] of [[119,0,'reach'],[425,4,'high'],[425,3,'super']]){
 const f=board(2,popped,power),s=f.run();
 const m=f.match(s.reachResults,4),b=f.match(s.tabReachResults,4);
 assert.ok(!m.allClear);assert.equal(m.kind,want);assert.equal(b.kind,want);
}
// Popcorn shows paid reaches before the first ball and after every settled ball.
for(const balls of [0,1,2,3,4,5,6,7,8]){
 const f=board(0,0,5,balls);f.run();assert.ok(f.slot.reachResults.length);
 assert.ok(f.strip().length);
 const other=board(0,0,5,balls);other.engine.kind='gelato';other.run();
 assert.equal(!!other.strip().length,[2,4,5,6,7,8].includes(balls));
}
const prebet=board(0,0,5,0);prebet.app.phase='ready';prebet.run();assert.equal(prebet.strip().length,0);
const noBet=board(0,0,5,0);noBet.app.bet=()=>0;noBet.run();assert.equal(noBet.slot.reachResults.length,0);
const animation=board(0,0,5,1);animation.engine.phase='popcornDraw';animation.run();assert.equal(animation.strip().length,0);
const lag=board(0,0,5,2);lag.engine.processed=1;lag.run();assert.equal(lag.strip().length,0);
const busy=board(0);busy.run();busy.engine.queue.push(7);busy.run();
assert.equal(busy.slot.reachResults.length,0);assert.equal(busy.slot.tabReachResults.length,0);
const used=board(0);used.app.draws[0]=used.s.numbers[4];used.run();assert.ok(!used.match(used.slot.reachResults,4));
console.log('Popcorn main and mini reach tiers, actual one-credit results, shared timing, stale results and pending/used numbers passed.');
// The selected cabinet alone controls the actual roulette's 25 pocket LEDs
// and the same derived tier-3 set controls its highest-role illumination.
const roulette=new Function('slots','active','app','jpcSession','reachAvailable','chocoReachReady',
 section(shared,'function rouletteReachTiers()','function rouletteSelectedBoard()')+
 'return {leds:rouletteReachTiers(),rainbow:rouletteAllClearNumbers()};');
for(const count of [0,1,2,3,4,5,6,7]){
 const f=board(count);f.run();f.engine.drawn=new Set();const n=f.s.numbers[4];
 const current=roulette([f.slot],0,f.app,{active:false},()=>true,()=>true);
 assert.equal(current.leds.get(n)||0,count===0?0:count===1?1:3);
 assert.equal(current.rainbow.has(n),count>=2);
 assert.equal(f.match(f.slot.reachResults,4).tier,3);
}
const cabinets=[undefined,'choco','candy','gelato','winery','popcorn'].map(kind=>({
 engine:{kind,drawn:new Set([10])},
 reachResults:[{number:7,tier:3},{number:8,tier:2},{number:10,tier:1}],
 tabReachResults:[{number:7,tier:1},{number:8,tier:2},{number:10,tier:1}]
}));
for(let i=0;i<cabinets.length;i++){
 const flags=[cabinets,i,{phase:'playing',draws:[8]}];
 const result=roulette(...flags,{active:false},()=>true,()=>true);
 assert.deepEqual([...result.leds],[[7,i===5?1:3]]);
 assert.equal(result.rainbow.has(7),i!==5);
 assert.equal(roulette(...flags,{active:true},()=>true,()=>true).leds.size,0);
 assert.equal(roulette(...flags,{active:false},()=>false,()=>false).leds.size,0);
}
console.log('Selected roulette pockets and highest-role set use compact popcorn tiers and native results for the other five games.');

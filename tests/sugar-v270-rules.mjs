import assert from 'node:assert/strict';
import '../assets/sugar-challenge-rules-v254.js';
import {createSugarChallengeLedger} from '../server-sugar-challenge-v254.mjs';

const R=globalThis.SugarChallengeRulesV254;
const copy=value=>JSON.parse(JSON.stringify(value));
const valuesFor=total=>[total-4,1,1,1,1];
const make=(total=725,extra={})=>R.create({id:'sc270',roundId:'round270',station:1,sugarValues:valuesFor(total),rulesRevision:270,cardId:'standard',multiplier:3,...extra});
const drawAll=(state,draws)=>draws.reduce((s,number)=>R.advance(s,number,{roundId:s.roundId,ballIndex:s.drawCount+1}),state);
const cashBalls=[1,2,3,8,20,21,24,25];
const earlyLuckyBalls=[20,19,18,15,5,3,7,17];

assert.equal(R.REVISION,271);assert.equal(R.PREVIOUS_REVISION,270);assert.equal(R.EARLY_REVISION,268);assert.equal(R.JP_STEP,500);

// User-facing rounding boundaries: half a 500-medal step rounds upward, and
// a positive five-Sugar challenge never displays a zero JP.
for(const [sum,expected] of [[5,500],[249,500],[250,500],[499,500],[500,500],[749,500],[750,1000],[999,1000],[1000,1000],[1249,1000],[1250,1500],[5001,5000]]){
 for(const multiplier of [1,2,3,4,5,10]){
  const state=make(sum,{multiplier});
  assert.equal(state.rulesRevision,270);
  assert.equal(state.jpBase,expected,`base for ${sum}`);
  assert.equal(state.jpAmount,expected*multiplier);
  assert.equal(state.jpAmount%500,0);
  assert.deepEqual(state.sugarValues,valuesFor(sum),'quote inputs are never rounded independently');
  const saved=copy(R.snapshot(state));
  assert.deepEqual(R.restore(saved),state);
  assert.deepEqual(R.restore({...state,jpBase:1,jpAmount:1,cashWin:999999}),state);
 }
}

// Already issued revisions keep every monetary amount during restore, replay,
// cash settlement and early JPC qualification, even when they are not multiples500.
for(const revision of [254,268]){
 let state=make(725,{rulesRevision:revision});
 assert.equal(state.jpBase,725);assert.equal(state.jpAmount,2175);
 for(const number of cashBalls){
  const before=copy(R.snapshot(state));
  state=R.advance(R.restore(before),number,{roundId:state.roundId,ballIndex:state.drawCount+1});
  assert.equal(state.rulesRevision,revision);assert.equal(state.jpBase,725);assert.equal(state.jpAmount,2175);
 }
 assert.equal(state.cashWin,21);assert.equal(state.jpcQualified,false);
 assert.deepEqual(R.restore(copy(R.snapshot(state))),state);
 assert.equal(R.restore({...R.snapshot(state),multiplier:4}),null,'4x is not a valid old checkpoint');
 const lucky=drawAll(make(725,{rulesRevision:revision}),earlyLuckyBalls);
 assert.equal(lucky.jpAmount,2175);
 assert.equal(lucky.jpcQualified,revision===268);
 assert.equal(lucky.cashWin,revision===268?0:21);
 if(revision===268){assert.equal(lucky.jpcTicket.jpAmount,2175);assert.equal(lucky.jpcTicket.drawCount,5);}
}
const currentCash=drawAll(make(),cashBalls);assert.equal(currentCash.cashWin,15);
const currentLucky=drawAll(make(),earlyLuckyBalls);assert.equal(currentLucky.jpcTicket.jpAmount,1500);assert.equal(currentLucky.jpcTicket.drawCount,5);
assert.equal(drawAll(make(750,{multiplier:4}),cashBalls).cashWin,40);

// The fourteen picture cards do not assign probabilities. Validate every RNG
// bucket independently so the additional 4x artwork cannot alter payouts.
const bins={};
for(let bucket=0;bucket<10000;bucket++){
 const value=R.selectMultiplier(()=>(bucket+.5)/10000);
 bins[value]=(bins[value]||0)+1;
}
assert.deepEqual(bins,{1:8000,2:1500,3:400,5:90,10:10});
let rngCalls=0;
let chosen=R.create({id:'rng270',roundId:'rng-round',station:2,rulesRevision:270,sugarValues:valuesFor(750),rng:()=>{rngCalls++;return .85;}});
assert.equal(rngCalls,2);assert.equal(chosen.multiplier,2);assert.equal(chosen.jpBase,1000);
chosen=drawAll(R.restore(copy(R.snapshot(chosen))),cashBalls);
assert.equal(rngCalls,2);assert.equal(chosen.jpAmount,2000);

// Exact BigInt arithmetic rejects overflow instead of rounding an imprecise
// floating-point sum or accepting a new JP beyond the safe integer limit.
const maxSafe=BigInt(Number.MAX_SAFE_INTEGER),largestBase=maxSafe/500n*500n;
assert.equal(make(Number(largestBase+249n),{multiplier:1}).jpBase,Number(largestBase));
assert.throws(()=>make(Number(largestBase+250n),{multiplier:1}),RangeError);
assert.throws(()=>make(Number.MAX_SAFE_INTEGER,{multiplier:1}),RangeError);
assert.equal(make(Number.MAX_SAFE_INTEGER,{rulesRevision:268,multiplier:1}).jpBase,Number.MAX_SAFE_INTEGER);
assert.throws(()=>make(Number(largestBase),{multiplier:2}),RangeError);
assert.equal(R.restore({...R.snapshot(make()),sugarValues:[Number.MAX_SAFE_INTEGER,1,1,1,1]}),null);

// A persisted authoritative legacy round survives a server restart under270.
// The next round uses500 steps and pays only once; no restore path redraws it.
let seedCalls=0;
const makeLedger=(revision=270)=>createSugarChallengeLedger({
 now:()=>1000,randomSeed:()=>{seedCalls++;return 254;},
 rules:{...R,create:options=>R.create({...options,rulesRevision:revision,cardId:'standard',multiplier:3})}
});
const legacyLedger=makeLedger(268),player={playerId:'v270-regression',wallet:{credit:10000,revision:1},games:{},lifetimeWin:0};
const earn=(ledger,source,offset=0)=>ledger.ingest(player,{roundId:source,locked:[101],tokens:Array.from({length:5},(_,i)=>({id:i+offset,sugarId:'token-'+(i+offset),sourceRoundId:source,game:0,value:1}))});
earn(legacyLedger,'source-old');
const old=legacyLedger.start(player,{roundId:'old-round',station:1}).challenge;
assert.equal(old.rulesRevision,268);assert.notEqual(old.jpBase%500,0);
const restarted=makeLedger(),frozen=copy(player),callsBeforeRestore=seedCalls;
assert.equal(restarted.publicState(player).challenge.jpAmount,old.jpAmount);
assert.equal(restarted.start(player,{roundId:'old-round',station:1}).changed,false);
assert.deepEqual(player,frozen);assert.equal(seedCalls,callsBeforeRestore);
const oldPaid=restarted.advance(player,{roundId:'old-round',balls:cashBalls});
assert.equal(oldPaid.cashPaid,Math.floor(old.jpAmount/100));
const oldCredit=player.wallet.credit;
assert.equal(restarted.advance(player,{roundId:'old-round',balls:cashBalls}).changed,false);assert.equal(player.wallet.credit,oldCredit);
earn(restarted,'source-new',5);
const fresh=restarted.start(player,{roundId:'new-round',station:1}).challenge;
assert.equal(fresh.rulesRevision,270);assert.equal(fresh.jpBase%500,0);assert.equal(fresh.jpAmount%500,0);
const freshSnapshot=copy(player),freshSeeds=seedCalls;
assert.equal(makeLedger().publicState(player).challenge.jpAmount,fresh.jpAmount);assert.deepEqual(player,freshSnapshot);assert.equal(seedCalls,freshSeeds);
assert.equal(restarted.advance(player,{roundId:'new-round',balls:cashBalls}).cashPaid,Math.floor(fresh.jpAmount/100));

console.log('SUGAR_V270_RULES_PASS: 500-step JP boundaries, legacy254/268 amounts, authoritative4x compatibility, unchanged selection odds, safe-integer overflow, durable restart and single settlement');

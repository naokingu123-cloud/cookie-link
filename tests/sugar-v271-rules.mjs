import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import '../assets/sugar-challenge-rules-v254.js';
import {createSugarChallengeLedger} from '../server-sugar-challenge-v254.mjs';
import {buildReport} from '../scripts/sugar-challenge-v271-probabilities.mjs';

const R=globalThis.SugarChallengeRulesV254,copy=value=>JSON.parse(JSON.stringify(value));
const valuesFor=total=>[total-4,1,1,1,1];
const create=(extra={})=>R.create({id:'sc271',roundId:'round271',station:2,sugarValues:valuesFor(725),cardId:'standard',multiplier:3,...extra});
const draw=(state,history)=>history.reduce((s,number)=>R.advance(s,number,{roundId:s.roundId,ballIndex:s.drawCount+1}),state);
const CASH=[1,2,3,8,20,21,24,25],LOW=[1,2,3,4,5,6,7,8];
const LUCKY77=[20,19,18,15,5,3,7,17],LUCKY_THEN_HIGH=[20,19,18,15,5,25,24,23];
const HIGH139=[25,24,23,22,21,20,4,1];
const SPEC={standard:{high:139,lucky:[77]},lucky:{high:139,lucky:[77,88]},wide:{high:130,lucky:[77]}};

assert.equal(R.REVISION,271);assert.deepEqual(R.SUPPORTED_REVISIONS,[254,268,270,271]);
for(const card of R.cards){
 assert.equal(card.lowMax,null);assert.equal(card.highMin,SPEC[card.id].high);assert.deepEqual(card.luckySums,SPEC[card.id].lucky);
 assert.equal(R.evaluate(card.id,36).jpc,false);assert.equal(R.evaluate(card.id,36).payoutHundredths,20);
 assert.equal(R.evaluate(card.id,card.highMin-1).jpc,false);
 assert.equal(R.evaluate(card.id,card.highMin).reason,'high');
 assert.equal(R.evaluate(card.id,172).reason,'high');
}
const cardBins={};
for(let bucket=0;bucket<10000;bucket++){const id=R.selectCard(()=>(bucket+.5)/10000);cardBins[id]=(cardBins[id]||0)+1;}
assert.deepEqual(cardBins,{standard:9000,lucky:500,wide:500});

// Cash must use the rounded base at every supported multiplier. The JP amount
// and ticket retain the actual multiplied entitlement for eventual JPC use.
for(const multiplier of [1,2,3,4,5,10]){
 for(const [total,base] of [[5,500],[725,500],[750,1000],[1249,1000],[1250,1500]]){
  const ready=create({sugarValues:valuesFor(total),multiplier}),cash=draw(ready,CASH),low=draw(ready,LOW),lucky=draw(ready,LUCKY77);
  assert.equal(ready.rulesRevision,271);assert.equal(ready.jpBase,base);assert.equal(ready.cashBase,base);assert.equal(ready.jpAmount,base*multiplier);
  assert.equal(cash.sum,104);assert.equal(cash.cashWin,base/100);assert.equal(cash.award.cashWin,base/100);assert.equal(cash.jpcQualified,false);
  assert.equal(low.sum,36);assert.equal(low.jpcQualified,false);assert.equal(low.cashWin,base/5);
  assert.equal(lucky.cashWin,0);assert.equal(lucky.jpcTicket.jpAmount,base*multiplier);assert.equal(lucky.jpcTicket.jpBase,base);assert.equal(lucky.jpcTicket.multiplier,multiplier);
  assert.deepEqual(R.restore(copy(R.snapshot(cash))),cash);
  assert.deepEqual(R.restore({...cash,jpBase:1,jpAmount:1,cashBase:999999,cashWin:999999,award:{cashWin:999999}}),cash,'cached monetary fields cannot change payment');
 }
}

// Real ordered histories exercise both boundary values before the eighth ball.
for(const cardId of ['standard','lucky']){
 let state=draw(create({cardId}),[25,24,23,22,21,19,4]);
 assert.equal(state.sum,138);assert.equal(state.jpcQualified,false);
 state=R.advance(state,1,{ballIndex:8});assert.equal(state.sum,139);assert.equal(state.jpcTicket.reason,'high');
 const early=draw(create({cardId}),HIGH139.slice(0,7));
 assert.equal(early.phase,'drawing');assert.equal(early.qualifyingDrawCount,7);assert.equal(early.qualifyingSum,139);assert.equal(early.qualifyingNumber,4);assert.equal(early.jpcTicket.reason,'high');
 assert.equal(early.award,null);assert.equal(early.cashWin,0);assert.deepEqual(R.reaches(early),[]);
 assert.deepEqual(draw(early,[1]).jpcTicket,early.jpcTicket);
}
let wide=draw(create({cardId:'wide'}),[25,24,23,22,21,14]);
assert.equal(wide.sum,129);assert.equal(wide.jpcQualified,false);
wide=R.advance(wide,1,{ballIndex:7});assert.equal(wide.sum,130);assert.equal(wide.qualifyingDrawCount,7);assert.equal(wide.jpcTicket.reason,'high');
const beforeLucky=draw(create(),LUCKY77.slice(0,4));
assert.deepEqual(R.reaches(beforeLucky).map(row=>[row.number,row.sum,row.reason]),[[5,77,'lucky']]);
assert.deepEqual(R.reaches(draw(create({cardId:'lucky'}),LUCKY77.slice(0,4))).map(row=>[row.number,row.sum]),[[5,77],[16,88]]);
assert.equal(draw(create(),[25,24,23,16]).jpcQualified,false);
const at88=draw(create({cardId:'lucky'}),[25,24,23,16]);assert.equal(at88.qualifyingSum,88);assert.equal(at88.qualifyingDrawCount,4);
const beforeHigh=draw(create(),HIGH139.slice(0,6));
assert.deepEqual(R.reaches(beforeHigh).map(row=>row.number),Array.from({length:16},(_,i)=>i+4),'next-ball high reaches exclude used numbers');
assert(R.reaches(beforeHigh).every(row=>row.reason==='high'&&row.jpAmount===beforeHigh.jpAmount));

// The first actual qualification is reconstructed from ordered history. Later
// high sums, fabricated tickets, and replays must not replace it or pay twice.
const first=draw(create(),LUCKY_THEN_HIGH.slice(0,5)),ticket=copy(first.jpcTicket);
assert.equal(first.qualifyingSum,77);assert.equal(first.qualifyingNumber,5);assert.equal(first.qualifyingDrawCount,5);
const latched=draw(R.restore(copy(R.snapshot(first))),LUCKY_THEN_HIGH.slice(5));
assert.equal(latched.sum,149);assert.equal(latched.award.reason,'lucky');assert.equal(latched.cashWin,0);assert.deepEqual(latched.jpcTicket,ticket);
assert.deepEqual(R.restore({...latched,jpcQualified:false,jpcTicket:null,qualifyingDrawCount:8,qualifyingSum:149,qualifyingNumber:23}),latched);
assert.equal(R.restore({...create(),jpcQualified:true,jpcTicket:ticket,qualifyingSum:77}).jpcQualified,false);
assert.deepEqual(R.advance(latched,23,{ballIndex:8}),latched);assert.equal(R.advance(latched,1),null);
assert.equal(R.advance(first,8,{ballIndex:7}),null);assert.equal(R.advance(first,5,{ballIndex:6}),null);
assert.equal(R.advance(first,8,{roundId:'wrong'}),null);
assert.equal(R.restore({...R.snapshot(first),rulesRevision:272}),null);
assert.equal(R.restore({...R.snapshot(first),draws:[1,1]}),null);

// Issued old checkpoints retain low-tail JPC, old lucky targets, delayed high
// qualification, old rounding and multiplier-based cash. A rollout cannot
// silently reprice or retarget a challenge already in progress.
for(const revision of [254,268,270]){
 const old=create({rulesRevision:revision}),cash=draw(old,CASH),early=draw(old,LUCKY77.slice(0,5));
 assert.equal(R.cardFor(old).lowMax,70);assert.equal(R.cardFor(old).highMin,138);
 assert.deepEqual(R.cardFor(old).luckySums,[77,88,120,131]);
 assert.equal(R.evaluate(old,36).reason,'low');assert.equal(R.evaluate(old,138).reason,'high');
 assert.equal(old.jpBase,revision<270?725:500);assert.equal(old.cashBase,old.jpAmount);assert.equal(cash.cashWin,revision<270?21:15);
 assert.equal(early.jpcQualified,revision>=268);assert.equal(draw(old,LOW).jpcQualified,true);
 assert.equal(draw(old,HIGH139.slice(0,7)).jpcQualified,false,'old high thresholds qualify only at ball 8');
 assert.equal(draw(old,HIGH139).jpcQualified,true);
 assert.deepEqual(R.restore(copy(R.snapshot(cash))),cash);
 assert.equal(R.restore({...R.snapshot(old),multiplier:4})!==null,revision===270);
}
assert.equal(draw(create({rulesRevision:254}),LUCKY77).cashWin,21,'legacy254 ignores intermediate lucky totals');
assert.equal(draw(create({rulesRevision:268}),LUCKY77).cashWin,0);
assert.equal(draw(create({rulesRevision:270}),LUCKY77).cashWin,0);
for(const revision of [254,268,270,271])for(const card of R.cardsFor(revision)){
 const ranges=R.payoutRows(card.id,revision);
 for(let sum=36;sum<=172;sum++){
  const matches=ranges.filter(row=>row.ranges.some(range=>sum>=range.min&&sum<=range.max)),expected=R.evaluate(card.id,sum,revision);
  assert.equal(matches.length,expected.jpc?0:1);if(matches.length)assert.equal(matches[0].hundredths,expected.payoutHundredths);
 }
}

// This oracle does not call R.advance/evaluate or read R.cards. It enumerates
// ordered suffixes and independently applies the published thresholds, lucky
// sums and cash bands, including already-qualified and near-threshold prefixes.
function oracle(cardId,history,base){
 const spec=SPEC[cardId];let sum=0,jpc=false;
 for(const number of history){sum+=number;if(spec.lucky.includes(sum)||sum>=spec.high)jpc=true;}
 const bands=cardId==='wide'?[[23,20],[19,10],[15,5],[10,3],[5,2],[0,1]]:[[30,20],[24,10],[18,5],[12,3],[6,2],[0,1]];
 const hundredths=history.length===8&&!jpc?bands.find(([distance])=>Math.abs(sum-104)>=distance)[1]:0;
 return {sum,jpc,cash:Math.floor(base*hundredths/100)};
}
for(const cardId of Object.keys(SPEC))for(const prefix of [[1,2,3,10,15],[25,24,23,22,21],[20,19,18,15,5],[24,23,22,21,20]]){
 const state=draw(create({cardId,sugarValues:[300,300,300,300,300],multiplier:10}),prefix),forecast=R.forecast(state),rows=new Map();
 let count=0,jpc=0,cash=0;
 const walk=history=>{
  if(history.length===8){
   const outcome=oracle(cardId,history,1500),row=rows.get(outcome.sum)||{count:0,jpcOutcomes:0,cashOutcomes:0};
   count++;jpc+=Number(outcome.jpc);cash+=outcome.cash;row.count++;row.jpcOutcomes+=Number(outcome.jpc);row.cashOutcomes+=Number(!outcome.jpc);rows.set(outcome.sum,row);return;
  }
  for(let number=1;number<=25;number++)if(!history.includes(number))walk([...history,number]);
 };
 walk(prefix);
 assert.equal(forecast.outcomeCount,6840);assert.equal(forecast.outcomeCount,count);assert.equal(forecast.jpcOutcomes,jpc);
 assert.equal(forecast.expectedCashNumerator,String(cash));assert.equal(forecast.expectedCash,cash/count);
 assert.equal(forecast.jpcProbability,jpc/count);
 for(const row of forecast.rows)assert.deepEqual({count:row.count,jpcOutcomes:row.jpcOutcomes,cashOutcomes:row.cashOutcomes},rows.get(row.sum));
 const expected=state.jpcQualified?[]:Array.from({length:25},(_,i)=>i+1).filter(number=>!prefix.includes(number)&&oracle(cardId,[...prefix,number],1500).jpc);
 assert.deepEqual(R.reaches(state).map(row=>row.number),expected);
 const unmultiplied=R.forecast(R.restore({...R.snapshot(state),multiplier:1}));
 assert.equal(unmultiplied.expectedCashNumerator,forecast.expectedCashNumerator);assert.equal(unmultiplied.jpcOutcomes,forecast.jpcOutcomes);
}

// Frozen values and whole-distribution hashes from a separately implemented
// C++ DP over all subsets of 1..25 (43,609,104,000 complete ordered histories).
// These expected values are not generated from the JavaScript rules under test.
const independent={
 standard:{jpcOutcomes:4100851872,sha256:'b3c8e9a2f6e46ebac2358e27f88fb0276cc299aaa44fa871db8769d40b83921e'},
 lucky:{jpcOutcomes:6868032912,sha256:'4efc9916c2e403fe1c85c3c82ecd961adbe4e38b8e2f360a6fca4fa6755363f1'},
 wide:{jpcOutcomes:6098212656,sha256:'cb9c0081924e63d796752ad67c412efb7278bd1885f576c06f14e19395b6d86b'}
};
const report=buildReport(),saved=JSON.parse(fs.readFileSync(new URL('../docs/sugar-challenge-v271-probabilities.json',import.meta.url),'utf8'));
assert.deepEqual(report,saved,'checked-in probability report must reproduce exactly');
for(const card of report.cards){
 assert.equal(card.outcomeCount,43609104000);assert.equal(card.jpcOutcomes,independent[card.id].jpcOutcomes);
 const rows=card.rows.map(row=>[row.sum,row.count,row.jpcOutcomes,row.cashOutcomes]);
 assert.equal(createHash('sha256').update(JSON.stringify(rows)).digest('hex'),independent[card.id].sha256);
 assert.equal(card.cashOutcomes+card.jpcOutcomes,card.outcomeCount);
 assert.equal(card.referenceCashBase,10000);
}
assert.equal(report.mixture.jpcProbability.numerator,'43390789632000');assert.equal(report.mixture.jpcProbability.denominator,'436091040000000');
assert.equal(report.mixture.jpcProbability.simplifiedNumerator,'18832808');assert.equal(report.mixture.jpcProbability.simplifiedDenominator,'189275625');
assert(Math.abs(report.mixture.jpcPercent-9.94993835048755)<1e-12);assert.equal(report.cashAffectedByMultiplier,false);

// Exercise the actual server ledger across JSON persistence boundaries. Money
// enters the existing wallet once, including the newly payable lowest total.
let seedCalls=0,clock=1000;
const ledger=(revision=271,multiplier=3,cardId='standard')=>createSugarChallengeLedger({now:()=>clock,randomSeed:()=>{seedCalls++;return 271;},rules:{...R,create:options=>R.create({...options,rulesRevision:revision,multiplier,cardId})}});
const player=id=>({playerId:id,wallet:{credit:10000,revision:7,reservedRoundId:'native-bet'},lifetimeWin:200,games:{cookie:{bet:100,win:200}}});
const earn=(L,p,source)=>L.ingest(p,{roundId:source,locked:[101],tokens:Array.from({length:5},(_,i)=>({id:i,sugarId:source+':'+i,sourceRoundId:source,game:0,value:1}))});
for(const multiplier of [1,2,3,4,5,10]){
 let p=player('cash-'+multiplier),L=ledger(271,multiplier);
 earn(L,p,'earned-'+multiplier);const opened=L.start(p,{roundId:'cash-'+multiplier,station:2,openedAt:900});
 assert.equal(opened.started,true);assert.equal(opened.challenge.cashBase,opened.challenge.jpBase);
 assert.equal(opened.challenge.jpAmount,opened.challenge.jpBase*multiplier);
 const base=opened.challenge.cashBase,roundId=opened.challenge.roundId;
 L.advance(p,{roundId,balls:CASH.slice(0,7)});assert.equal(p.wallet.credit,10000);
 const savedProgress=copy(p),randomBeforeRestart=seedCalls;p=copy(p);L=ledger(271,multiplier);
 const current=L.publicState(p).challenge;assert.equal(current.cashBase,base);assert.equal(current.jpAmount,base*multiplier);
 assert.equal(L.start(p,{roundId,station:2}).changed,false);assert.deepEqual(p,savedProgress);assert.equal(seedCalls,randomBeforeRestart);
 clock++;const paid=L.advance(p,{roundId,balls:CASH.map((number,index)=>({number,index:index+1}))});
 assert.equal(paid.settled,true);assert.equal(paid.cashPaid,base/100);assert.equal(paid.challenge.cashBase,base);
 assert.equal(p.wallet.credit,10000+base/100);assert.equal(p.wallet.revision,8);assert.equal(p.wallet.reservedRoundId,'native-bet');
 assert.equal(p.lifetimeWin,200+base/100);assert.equal(p.games['sugar-challenge'].win,base/100);assert.deepEqual(p.games.cookie,{bet:100,win:200});
 const after=copy(p),randomAfter=seedCalls;p=copy(p);L=ledger(271,multiplier);
 assert.equal(L.advance(p,{roundId,balls:CASH}).changed,false);assert.equal(L.advance(p,{roundId,balls:CASH}).cashPaid,0);
 assert.equal(L.start(p,{roundId}).changed,false);assert.deepEqual(p,after);assert.equal(seedCalls,randomAfter);
}
{
 let p=player('low-cash'),L=ledger(271,10);earn(L,p,'low-earned');const opened=L.start(p,{roundId:'low-round'}),base=opened.challenge.cashBase;
 const result=L.advance(p,{roundId:'low-round',balls:LOW});assert.equal(result.cashPaid,base/5);assert.equal(result.jpcTickets.length,0);
 p=copy(p);L=ledger();assert.equal(L.advance(p,{roundId:'low-round',balls:LOW}).cashPaid,0);
 const cancelled=L.cancel(p,'low-round');assert.equal(cancelled.cashReversed,base/5);assert.equal(cancelled.restoredCount,5);assert.equal(p.wallet.credit,10000);
 assert.equal(L.cancel(p,'low-round').changed,false);
}
for(const [cardId,history] of [['standard',LUCKY_THEN_HIGH],['standard',HIGH139],['lucky',[25,24,23,16,1,2,3,4]],['wide',[25,24,23,22,21,14,1,2]]]){
 let p=player('ticket-'+cardId+'-'+history[0]+'-'+history[3]),L=ledger(271,10,cardId);earn(L,p,'ticket-earned');L.start(p,{roundId:'ticket-round'});
 const qualifyCount=history===LUCKY_THEN_HIGH?5:cardId==='lucky'?4:7;
 const early=L.advance(p,{roundId:'ticket-round',balls:history.slice(0,qualifyCount)});
 assert.equal(early.settled,false);assert.equal(early.jpcTickets.length,1);assert.equal(early.challenge.award,null);assert.equal(p.wallet.credit,10000);
 const firstTicket=copy(early.jpcTickets[0]);assert.equal(firstTicket.jpAmount,firstTicket.jpBase*10);
 const seeds=seedCalls;p=copy(p);L=ledger(271,10,cardId);
 assert.equal(L.advance(p,{roundId:'ticket-round',balls:history.slice(0,qualifyCount)}).changed,false);
 assert.deepEqual(L.publicState(p).jpcTickets,[firstTicket]);
 const done=L.advance(p,{roundId:'ticket-round',balls:history});assert.equal(done.cashPaid,0);assert.equal(done.settled,true);assert.deepEqual(done.jpcTickets,[firstTicket]);
 assert.equal(p.wallet.credit,10000);assert.equal(seedCalls,seeds);
 assert.equal(L.advance(p,{roundId:'ticket-round',balls:history}).changed,false);
}
for(const revision of [254,268,270]){
 let p=player('old-'+revision),L=ledger(revision,3);earn(L,p,'old-earned-'+revision);const old=L.start(p,{roundId:'old-round'}).challenge;
 L.advance(p,{roundId:'old-round',balls:CASH.slice(0,5)});p=copy(p);L=ledger();
 const restored=L.publicState(p).challenge;assert.equal(restored.rulesRevision,revision);assert.equal(restored.cashBase,old.jpAmount);
 const paid=L.advance(p,{roundId:'old-round',balls:CASH});assert.equal(paid.cashPaid,Math.floor(old.jpAmount/100));
 const balance=p.wallet.credit;p=copy(p);assert.equal(ledger().advance(p,{roundId:'old-round',balls:CASH}).changed,false);assert.equal(p.wallet.credit,balance);
 earn(L,p,'new-earned-'+revision);const next=L.start(p,{roundId:'new-round'}).challenge;
 assert.equal(next.rulesRevision,271);assert.equal(next.cashBase,next.jpBase);
 assert.equal(L.advance(p,{roundId:'new-round',balls:CASH}).cashPaid,next.jpBase/100);
}

console.log('SUGAR_V271_RULES_PASS: exact 9.949938% entry; 139/130 and early77/88; unmultiplied cash at all six multipliers; immutable first entitlement; independent ordered-suffix and full-distribution oracle; legacy254/268/270; one-time server cash and tickets across restarts');

import assert from 'node:assert/strict';
import {createSugarChallengeLedger} from '../server-sugar-challenge-v254.mjs';

const R=globalThis.SugarChallengeRulesV254,copy=value=>JSON.parse(JSON.stringify(value));
const CASH_BALLS=[1,2,3,8,20,21,24,25],LUCKY_BALLS=[1,2,3,10,15,19,21,6];
let clock=1000,seedCalls=0,createCalls=0;
const deterministicRules={...R,create:options=>{createCalls++;return R.create({...options,cardId:'standard',multiplier:2});}};
const factory=()=>createSugarChallengeLedger({rules:deterministicRules,now:()=>clock,randomSeed:()=>{seedCalls++;return 254;}});
const L=factory();
const player=(name='p1')=>({playerId:name,wallet:{credit:1000000,revision:7,reservedRoundId:'r2',source:'bet'},lifetimeBet:1000,lifetimeWin:120,games:{cookie:{bet:1000,win:120}}});
const tokens=(round,count,start=0,game=0)=>Array.from({length:count},(_,i)=>({id:`s${i+start}`,sugarId:`${round}:${game}:s${i+start}:${i+start}`,sourceRoundId:round,sourceGame:game===0?'cookie':'dango',game,value:7,tier:0}));
const earn=(p,round,count,start=0,extra={})=>L.ingest(p,{roundId:round,tokens:tokens(round,count,start),locked:[100],payoutRate:100,...extra});
const open=(p,round,extra={})=>L.start(p,{roundId:round,station:2,openedAt:clock,...extra});
const finish=(p,round,balls=CASH_BALLS)=>L.advance(p,{roundId:round,balls});

// Five tokens retain visual values, freeze their own BET/rate quote, and can
// first enter a challenge in a different BET round. No current-round wager is needed.
let p=player();assert.equal(L.publicState(p).queued,false);
let receipt=earn(p,'r1',6);assert.equal(receipt.acceptedCount,6);assert.equal(receipt.bank.length,6);assert.equal(receipt.queued,true);
assert.equal(receipt.acceptedIds.length,6);assert.equal(receipt.bank[0].value,7);assert.equal(receipt.bank[0].sourceBet,100);
const fixedQuote=R.quoteSugar({bet:100,payoutRate:100,seed:254});assert.equal(receipt.bank[0].challengeValue,fixedQuote.challengeValue);
assert.equal(new Set(receipt.bank.map(token=>token.serverSugarId)).size,6);
assert.equal(open(p,'r1').reason,'wait-for-next-round');assert.equal(p.sugarV254.bank.length,6);
const issuedValues=p.sugarV254.bank.map(token=>token.challengeValue),seedsBefore=seedCalls;
assert.equal(earn(p,'r1',6,0,{locked:[99999],payoutRate:150}).changed,false);assert.equal(seedCalls,seedsBefore);
assert.deepEqual(p.sugarV254.bank.map(token=>token.challengeValue),issuedValues);
clock=2000;const started=open(p,'r2');assert.equal(started.started,true);assert.equal(started.current.phase,'ready');assert.equal(started.bank.length,1);
assert.equal(started.startedAt,2000);assert.equal(started.openedAt,2000);assert.equal(started.challenge.sugarTokens.length,5);
assert.deepEqual(started.challenge.sugarValues,issuedValues.slice(0,5));assert.equal(started.challenge.jpBase,issuedValues.slice(0,5).reduce((a,b)=>a+b,0));
assert.equal(started.challenge.jpAmount,started.challenge.jpBase*2);assert.equal(p.wallet.credit,1000000);
assert.equal(p.wallet.reservedRoundId,'r2');assert.equal(open(p,'r2').reason,'already-started');assert.equal(createCalls,1);
earn(p,'r2',4,6);assert.equal(L.publicState(p).queued,true);assert.equal(open(p,'r3').reason,'previous-challenge-pending');

// Only a prefix of the real shared history is accepted. JPC reach marks only
// the remaining last-ball numbers whose FINAL SUM is a qualifying value.
const beforeDraw=copy(p);
assert.equal(L.advance(p,{roundId:'other',balls:[1]}).changed,false);
assert.equal(L.advance(p,{roundId:'r2',balls:[{number:1,index:2}]}).reason,'invalid-history');
assert.equal(L.advance(p,{roundId:'r2',balls:[1,1]}).reason,'invalid-history');assert.deepEqual(p,beforeDraw);
let progress=L.advance(p,{roundId:'r2',balls:LUCKY_BALLS.slice(0,7).map((number,index)=>({index:index+1,number}))});
assert.equal(progress.advanced,7);assert.equal(progress.settled,false);assert.equal(progress.challenge.sum,71);assert.equal(p.wallet.credit,1000000);
assert.deepEqual(L.publicReach(p,'r2').map(row=>[row.number,row.sum]),[[6,77],[17,88]]);
assert.equal(L.advance(p,{roundId:'r2',balls:[2]}).reason,'history-mismatch');assert.equal(L.advance(p,{roundId:'r2',balls:[1,2]}).reason,'stale-history');
assert.equal(L.advance(p,{roundId:'r2',balls:LUCKY_BALLS.slice(0,7)}).changed,false);
clock=3000;const jpc=finish(p,'r2',LUCKY_BALLS);assert.equal(jpc.settled,true);assert.equal(jpc.cashPaid,0);assert.equal(jpc.jpcTickets.length,1);
assert.equal(jpc.challenge.jpcQualified,true);assert.equal(jpc.challenge.paymentStatus,'paid');assert.equal(jpc.jpcTickets[0].status,'pending-implementation');
assert.equal(jpc.current,null);assert.equal(jpc.last.roundId,'r2');assert.equal(p.wallet.credit,1000000);assert.deepEqual(L.publicReach(p,'r2'),[]);
assert.equal(finish(p,'r2',LUCKY_BALLS).changed,false);assert.equal(finish(p,'r2',LUCKY_BALLS).jpcTickets.length,1);
assert.equal(L.advance(p,{roundId:'r2',balls:[...LUCKY_BALLS,25]}).reason,'invalid-history');

// New challenges preserve FIFO leftover Sugar across source rounds and pay
// exactly once into the same wallet, independent of the reserved native BET.
clock=4000;const next=open(p,'r3');assert.equal(next.started,true);assert.equal(next.bank.length,0);assert.equal(next.challenge.sugarTokens[0].sourceRoundId,'r1');
const expectedCash=R.cashFor(next.challenge.jpAmount,1),priorNative=copy(p.games.cookie),priorLifetimeBet=p.lifetimeBet;
p.wallet.credit+=200;p.lifetimeWin+=200;p.games.cookie.win+=200; // A normal game settled independently.
const nativeCredit=p.wallet.credit,nativeLifetime=p.lifetimeWin,walletRevision=p.wallet.revision;
const payout=finish(p,'r3');assert.equal(payout.settled,true);assert.equal(payout.cashPaid,expectedCash);
assert.equal(p.wallet.credit,nativeCredit+expectedCash);assert.equal(p.lifetimeWin,nativeLifetime+expectedCash);
assert.equal(p.games['sugar-challenge'].win,expectedCash);assert.equal(p.games['sugar-challenge'].bet,0);assert.equal(p.wallet.reservedRoundId,'r2');
assert.equal(p.wallet.revision,walletRevision+1);assert.equal(p.lifetimeBet,priorLifetimeBet);assert.equal(p.games.cookie.bet,priorNative.bet);
const final=copy(p),randomBeforeRestart=seedCalls;p=copy(p);const restarted=factory();
assert.equal(restarted.start(p,{roundId:'r3',station:2}).changed,false);assert.equal(restarted.advance(p,{roundId:'r3',balls:CASH_BALLS}).changed,false);
assert.deepEqual(p,final);assert.equal(seedCalls,randomBeforeRestart);assert.equal(restarted.publicState(p).acceptedIds.length,10);
assert.equal(restarted.ingest(p,{roundId:'r2',tokens:tokens('r2',4,6),locked:[100]}).changed,false,'consumed receipt IDs cannot resurrect their tokens');

// Client-visible views are detached. Changing them cannot alter money, cards,
// bank values or authoritative history stored in the payout database.
const view=restarted.publicState(p);view.challenge.sugarValues[0]=999999;view.challenge.multiplier=10;view.acceptedIds.length=0;
assert.deepEqual(p,final);

// Cancel a completed challenge once: reverse ONLY its bonus, restore its five
// old tokens in FIFO order and keep all receipt IDs acknowledged.
clock=5000;const cancelled=restarted.cancel(p,'r3');assert.equal(cancelled.cancelled,true);assert.equal(cancelled.cashReversed,expectedCash);assert.equal(cancelled.restoredCount,5);
assert.equal(p.wallet.credit,nativeCredit);assert.equal(p.lifetimeWin,nativeLifetime);assert.equal(p.games['sugar-challenge'].win,0);
assert.equal(cancelled.challenge.phase,'cancelled');assert.equal(cancelled.challenge.cashWin,0);assert.equal(cancelled.bank.length,5);assert.equal(cancelled.acceptedIds.length,10);
assert.equal(restarted.cancel(p,'r3').changed,false);assert.equal(restarted.start(p,{roundId:'r3'}).reason,'cancelled-round');
assert.equal(restarted.advance(p,{roundId:'r3',balls:CASH_BALLS}).changed,false);
assert.equal(restarted.ingest(p,{roundId:'r3',tokens:tokens('r3',1),locked:[100]}).reason,'cancelled-round');
assert.equal(restarted.start(p,{roundId:'r4',station:2}).started,true);

// A cancelled source round removes Sugar even for nonparticipants and voids
// any dependent completed challenge before restoring its other source tokens.
let q=player('dependency');earn(q,'source-a',2);earn(q,'source-b',4);open(q,'dependent');const dependentPayout=finish(q,'dependent').cashPaid;
const beforeSourceCancel=q.wallet.credit;const sourceCancel=L.cancel(q,'source-a');
assert.equal(sourceCancel.cashReversed,dependentPayout);assert.deepEqual(sourceCancel.cancelledChallenges,['dependent']);assert.equal(sourceCancel.removedCount,2);
assert.equal(sourceCancel.bank.length,4);assert(sourceCancel.bank.every(token=>token.sourceRoundId==='source-b'));assert.equal(q.wallet.credit,beforeSourceCancel-dependentPayout);
assert.equal(L.cancel(q,'source-a').changed,false);assert.equal(earn(q,'source-a',2).changed,false);
let idle=player('no-native-participant');earn(idle,'no-bet-challenge-old',5);open(idle,'no-bet-challenge');earn(idle,'no-bet-challenge',2,5);
const noBetCancel=L.cancel(idle,'no-bet-challenge');assert.equal(noBetCancel.restoredCount,5);assert.equal(noBetCancel.removedCount,2);assert.equal(noBetCancel.bank.length,5);
assert.equal(idle.lifetimeBet,1000);assert.equal(noBetCancel.jpcTickets.length,0);

// Legacy import happens once. It uses each old visual value only when no
// authoritative source BET is present; a zero locked BET never falls back.
let legacy=player('legacy');const old=[{id:1,game:0,value:30,tier:0},{id:2,game:1,value:70,tier:0}];
const migrated=L.ingest(legacy,{roundId:'migration',tokens:old,legacy:true,payoutRate:80});assert.equal(migrated.acceptedCount,2);assert.equal(migrated.legacyImported,true);
assert.deepEqual(migrated.bank.map(token=>token.sourceBet),[30,70]);assert(migrated.bank.every(token=>token.payoutRate===80));
assert.equal(L.ingest(legacy,{roundId:'migration',tokens:[...old,{id:3,value:90}],legacy:true}).reason,'legacy-already-imported');assert.equal(legacy.sugarV254.bank.length,2);
let invalid=player('invalid');let bad=earn(invalid,'i1',1,0,{locked:[0],bets:[999]});assert.equal(bad.rejected[0].reason,'missing-source-bet');assert.equal(bad.acceptedCount,0);
bad=earn(invalid,'i1',1,0,{tokens:tokens('wrong',1)});assert.equal(bad.rejected[0].reason,'source-round-mismatch');
bad=earn(invalid,'i1',1,0,{tokens:[{id:1,game:0,sourceRoundId:'i1',value:10}]});assert.equal(bad.rejected[0].reason,'missing-sugar-id');
bad=earn(invalid,'i1',1,0,{tokens:[{...tokens('i1',1)[0],value:0}]});assert.equal(bad.rejected[0].reason,'invalid-visual-value');
const forgedToken={...tokens('i1',1)[0],challengeValue:999999,sourceBet:999999,multiplier:10};
const clean=earn(invalid,'i1',1,0,{tokens:[forgedToken],locked:[10],payoutRate:50});assert.equal(clean.bank[0].sourceBet,10);assert.notEqual(clean.bank[0].challengeValue,999999);
let gamesByName=player('named');const named=L.ingest(gamesByName,{roundId:'n1',tokens:tokens('n1',1,0,7),games:[{id:'dango',bet:333}],payoutRate:150});assert.equal(named.bank[0].sourceBet,333);
let lockedByName=player('mapped');const mapped=L.ingest(lockedByName,{roundId:'n1',tokens:tokens('n1',1),locked:{cookie:44},bets:[999]});assert.equal(mapped.bank[0].sourceBet,44);

// Rainbow/direct-JPC Sugar and already redeemed tokens remain in the bank,
// are excluded from the five ordinary Sugar, and preserve legacy redemption.
let rainbow=player('rainbow');const colorful=tokens('colors',7);colorful[0].directJpc=true;colorful[1].jpcRedeemed=true;
let colors=earn(rainbow,'colors',7,0,{tokens:colorful});assert.equal(colors.queued,true);
const rainbowStart=open(rainbow,'colors-next');assert.equal(rainbowStart.started,true);assert.deepEqual(rainbowStart.bank.map(token=>token.sugarId),colorful.slice(0,2).map(token=>token.sugarId));
assert.equal(rainbowStart.queued,false);assert(rainbowStart.challenge.sugarTokens.every(token=>!token.directJpc&&!token.jpcRedeemed));
const redeemed=L.ingest(rainbow,{roundId:'colors-next',tokens:[{...colorful[0],jpcRedeemed:true}],locked:[999]});assert.equal(redeemed.changed,true);assert.equal(redeemed.bank[0].jpcRedeemed,true);
assert.equal(L.ingest(rainbow,{roundId:'colors-next',tokens:[colorful[0]],locked:[999]}).bank[0].jpcRedeemed,true);

// A failed integer-money adjustment is atomic, including the consumed tokens
// and paid/cancelled guard. Retrying after a valid wallet can settle exactly once.
let money=player('money');earn(money,'m1',5);open(money,'m2');money.wallet.credit=Number.MAX_SAFE_INTEGER;
const overflowing=copy(money);assert.throws(()=>finish(money,'m2'),RangeError);assert.deepEqual(money,overflowing);
money.wallet.credit=10000;const recovered=finish(money,'m2');assert.equal(recovered.settled,true);
money.wallet.credit=0;const cannotReverse=copy(money);assert.throws(()=>L.cancel(money,'m2'),RangeError);assert.deepEqual(money,cannotReverse);
money.wallet.credit=recovered.cashPaid;assert.equal(L.cancel(money,'m2').cashReversed,recovered.cashPaid);assert.equal(money.wallet.credit,0);

// JSON object special keys are receipts, not prototype mutations.
let special=player('special');const specialToken={...tokens('safe',1)[0],sugarId:'__proto__'};
assert.equal(earn(special,'safe',1,0,{tokens:[specialToken]}).acceptedCount,1);assert(L.publicState(special).acceptedIds.includes('__proto__'));
assert.equal(earn(special,'safe',1,0,{tokens:[specialToken]}).changed,false);assert.equal({}.sourceRoundId,undefined);
assert.throws(()=>createSugarChallengeLedger({rules:{REVISION:1}}));
assert.throws(()=>createSugarChallengeLedger({randomSeed:()=>NaN}).ingest(player('bad-seed'),{roundId:'seed',tokens:tokens('seed',1),locked:[100]}),RangeError);

console.log('Sugar Challenge v254 ledger: source-BET quotes, FIFO/next-round eligibility, restart receipts, shared-ball prefixes, one-time bonus/JPC, atomic rollback and rainbow exclusions passed.');

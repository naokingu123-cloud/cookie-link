import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import '../assets/sugar-challenge-rules-v254.js';
import {buildReport} from '../scripts/sugar-challenge-v254-probabilities.mjs';

const R=globalThis.SugarChallengeRulesV254,plain=value=>JSON.parse(JSON.stringify(value));
const source=fs.readFileSync(new URL('../assets/sugar-challenge-rules-v254.js',import.meta.url),'utf8');
const freezeDeep=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freezeDeep);Object.freeze(value);}return value;};
const options={id:'challenge:r42:st2',roundId:'r42',station:2,sugarValues:[100,110,95,105,90],cardId:'standard',multiplier:2,seed:254};
const create=overrides=>R.create({...options,...overrides});
const advanceAll=(state,draws)=>draws.reduce((s,n)=>R.advance(s,n,{roundId:s.roundId,ballIndex:s.draws.length+1}),state);
const combinations=(values,k,visit,start=0,chosen=[])=>{
 if(chosen.length===k){visit(chosen);return;}
 for(let i=start;i<=values.length-(k-chosen.length);i++){chosen.push(values[i]);combinations(values,k,visit,i+1,chosen);chosen.pop();}
};
const choose=(n,k)=>{let count=1;for(let i=1;i<=k;i++)count=count*(n-i+1)/i;return Math.round(count);};

// Independent enumeration proves the complete sum distribution, extremes and symmetry.
const histogram=Array(173).fill(0),witnesses=new Map(),numbers=Array.from({length:25},(_,i)=>i+1);
let visited=0;
combinations(numbers,8,draws=>{const sum=draws.reduce((a,b)=>a+b,0);histogram[sum]++;visited++;if(!witnesses.has(sum))witnesses.set(sum,draws.slice());});
assert.equal(visited,1081575);assert.equal(visited,choose(25,8));
const distribution=R.finalSumDistribution();
assert.equal(distribution.outcomeCount,visited);assert.equal(distribution.minFinalSum,36);assert.equal(distribution.maxFinalSum,172);
assert.equal(histogram[36],1);assert.equal(histogram[172],1);
for(let sum=36;sum<=172;sum++){assert.equal(distribution.rows.find(row=>row.sum===sum).count,histogram[sum]);assert.equal(histogram[sum],histogram[208-sum]);}

// A separate small oracle expresses the published boundaries, not the implementation bands.
const oracle=(cardId,sum)=>{
 const wide=cardId==='wide',low=wide?78:70,high=wide?130:138;
 const lucky=wide?[88,120]:cardId==='lucky'?[77,88,99,109,120,131]:[77,88,120,131];
 const reason=sum<=low?'low':sum>=high?'high':lucky.includes(sum)?'lucky':null,d=Math.abs(sum-104);
 const payout=reason?0:wide?(d>=23?20:d>=19?10:d>=15?5:d>=10?3:d>=5?2:1):(d>=30?20:d>=24?10:d>=18?5:d>=12?3:d>=6?2:1);
 return {reason,payout};
};
const expectedJpc={standard:101646,lucky:148922,wide:184154};
for(const card of R.cards){
 assert(card.luckySums.every(sum=>sum>card.lowMax&&sum<card.highMin));
 let jpcCount=0;
 for(let sum=36;sum<=172;sum++){
  const expected=oracle(card.id,sum),actual=R.evaluate(card.id,sum),final=advanceAll(create({cardId:card.id}),witnesses.get(sum));
  assert.equal(actual.reason,expected.reason);assert.equal(actual.payoutHundredths,expected.payout);
  assert.equal(final.sum,sum);assert.equal(final.phase,'complete');assert.equal(final.cashWin,10*expected.payout);
  assert.equal(final.jpcQualified,!!expected.reason);assert.equal(final.jpcTicket?.status??null,expected.reason?'pending-implementation':null);
  if(expected.reason)jpcCount+=histogram[sum];
 }
 assert.equal(jpcCount,expectedJpc[card.id]);
 const tiers=R.payoutRows(card.id),seen=new Set();assert.deepEqual(tiers.map(row=>row.hundredths),[20,10,5,3,2,1]);
 for(const row of tiers){assert(row.ranges.length>0);for(const range of row.ranges)for(let sum=range.min;sum<=range.max;sum++){assert(!seen.has(sum));seen.add(sum);assert.equal(oracle(card.id,sum).payout,row.hundredths);}}
 for(let sum=36;sum<=172;sum++)assert.equal(seen.has(sum),!oracle(card.id,sum).reason);
}
assert.equal(R.evaluate('missing',100),null);assert.equal(R.evaluate('standard',35),null);assert.equal(R.evaluate('standard',173),null);

// The 10,000 equal-probability bins exactly realize all documented rare/multiplier rates.
const cardBins={},multiplierBins={};
for(let i=0;i<10000;i++){const rng=()=>((i+.5)/10000),card=R.selectCard(rng),multiplier=R.selectMultiplier(rng);cardBins[card]=(cardBins[card]||0)+1;multiplierBins[multiplier]=(multiplierBins[multiplier]||0)+1;}
assert.deepEqual(cardBins,{standard:9000,lucky:500,wide:500});assert.deepEqual(multiplierBins,{1:8000,2:1500,3:400,5:90,10:10});
assert.equal(R.selectCard(()=>0),'standard');assert.equal(R.selectCard(()=>1),'wide');assert.equal(R.selectMultiplier(()=>1),10);
for(const invalid of [-1,1.1,NaN,Infinity])assert.throws(()=>R.selectCard(()=>invalid),RangeError);
assert.deepEqual(create({cardId:undefined,multiplier:undefined}),create({cardId:undefined,multiplier:undefined}));
const randomA=R.seededRandom(254),randomB=R.seededRandom(254);for(let i=0;i<100;i++)assert.equal(randomA(),randomB());

// Every uniform jitter value is included once; value belongs to source BET/P/O and is immutable after quote.
let quoteTotal=0;
for(let i=0;i<4001;i++){
 const quote=R.quoteSugar({bet:1000,payoutRate:100,rng:()=>((i+.5)/4001)});
 assert.equal(quote.challengeValue,8000+i);assert.equal(quote.sourceBet,1000);assert.equal(quote.payoutRate,100);assert.equal(quote.jitterBps,8000+i);quoteTotal+=quote.challengeValue;
}
assert.equal(quoteTotal/4001,10000);
assert.equal(R.quoteSugar({bet:1000,payoutRate:50,rng:()=>.5}).challengeValue,5000);
assert.equal(R.quoteSugar({bet:1000,payoutRate:150,rng:()=>.5}).challengeValue,15000);
assert.equal(R.quoteSugar({bet:1,payoutRate:0,rng:()=>0}).challengeValue,4);
assert.equal(R.quoteSugar({bet:1000,payoutRate:200,rng:()=>1}).challengeValue,18000);
assert.equal(R.quoteSugar({bet:1000,payoutRate:90.126,rng:()=>.5}).payoutRate,90.13);
for(const bet of [0,-1,NaN,Infinity,.5,'10',Number.MAX_SAFE_INTEGER+1])assert.throws(()=>R.quoteSugar({bet}),RangeError);
assert.throws(()=>R.quoteSugar({bet:1,payoutRate:NaN}),RangeError);
assert.throws(()=>R.quoteSugar({bet:Number.MAX_SAFE_INTEGER}),RangeError);
assert.equal(R.cashFor(Number.MAX_SAFE_INTEGER,20),Number(BigInt(Number.MAX_SAFE_INTEGER)*20n/100n));
assert.equal(R.cashFor(101,3),3);

// No randomness after creation, no mutation, no wrong-round/gapped/duplicate settlement.
let rngCalls=0,state=R.create({...options,cardId:undefined,multiplier:undefined,rng:()=>{rngCalls++;return .4;}});
assert.equal(rngCalls,2);assert.equal(state.phase,'ready');assert.equal(state.jpBase,500);assert.equal(state.jpAmount,500);
const initial=plain(state);freezeDeep(state);
assert.equal(R.advance(state,1,{roundId:'wrong'}),null);assert.equal(R.advance(state,1,{ballIndex:2}),null);
state=R.advance(state,1,{roundId:'r42',ballIndex:1});assert.deepEqual(initial,plain(create({cardId:'standard',multiplier:1})));
assert.deepEqual(R.advance(state,1,{ballIndex:1}),state);assert.deepEqual(R.advance(state,1),state);
assert.equal(R.advance(state,2,{ballIndex:1}),null);assert.equal(R.advance(state,1,{ballIndex:2}),null);
assert.equal(R.advance(state,0),null);assert.equal(R.advance(state,26),null);assert.equal(R.advance(state,1.1),null);
state=advanceAll(state,[2,3,10,15,19,21]);assert.equal(state.sum,71);assert.equal(state.cashWin,0);assert.equal(state.jpcTicket,null);
assert.deepEqual(R.reaches(state).map(row=>[row.number,row.sum,row.reason]),[[6,77,'lucky'],[17,88,'lucky']]);
const jpc=R.advance(state,6,{ballIndex:8});assert.equal(jpc.sum,77);assert.equal(jpc.cashWin,0);assert.equal(jpc.jpcQualified,true);assert.equal(jpc.jpcTicket.number,6);
assert.equal(R.advance(jpc,25),null);assert.deepEqual(R.advance(jpc,6),jpc);assert.deepEqual(R.reaches(jpc),[]);
assert.equal(rngCalls,2);

// Restore treats saved inputs as canonical and discards caller-supplied derived money/reach values.
const forged={...plain(jpc),sum:104,jpBase:99999999,jpAmount:999999999,cashWin:888888888,phase:'ready',jpcTicket:null};
assert.deepEqual(R.restore(forged),jpc);assert.deepEqual(R.advance(forged,6),jpc);
assert.deepEqual(R.restore(R.snapshot(jpc)),jpc);
for(const corrupt of [
 {...jpc,rulesRevision:253},{...jpc,station:0},{...jpc,station:7},{...jpc,roundId:''},
 {...jpc,sugarValues:[1,2,3,4]},{...jpc,sugarValues:[1,2,3,4,-1]},{...jpc,sugarValues:[Number.MAX_SAFE_INTEGER,1,1,1,1]},
 {...jpc,cardId:'unknown'},{...jpc,cardId:{id:'standard'}},{...jpc,multiplier:4},{...jpc,draws:[1,1]},{...jpc,draws:[26]}
])assert.equal(R.restore(corrupt),null);
assert.throws(()=>create({sugarValues:Array(5).fill(Number.MAX_SAFE_INTEGER)}),RangeError);

// Independent conditional combinations validate forecast probabilities and final-ball markers.
for(const history of [[],[13],[1,25],[3,7,14],[2,8,15,23],[1,2,3,10,15],[1,2,3,10,15,19],[1,2,3,10,15,19,21],[1,2,3,10,15,19,21,6]]){
 const available=numbers.filter(n=>!history.includes(n)),expected=new Map(),observed=history.reduce((a,b)=>a+b,0);
 combinations(available,8-history.length,extra=>{const sum=observed+extra.reduce((a,b)=>a+b,0);expected.set(sum,(expected.get(sum)||0)+1);});
 for(const card of R.cards){
  const round=advanceAll(create({cardId:card.id}),history),forecast=R.forecast(freezeDeep(round));
  assert.equal(forecast.outcomeCount,choose(25-history.length,8-history.length));
  assert.deepEqual(forecast.rows.map(({sum,count})=>({sum,count})),[...expected].sort((a,b)=>a[0]-b[0]).map(([sum,count])=>({sum,count})));
  let jpcCount=0,cash=0n;
  for(const [sum,count] of expected){const outcome=oracle(card.id,sum);if(outcome.reason)jpcCount+=count;cash+=BigInt(count)*BigInt(outcome.payout*10);}
  assert.equal(forecast.jpcOutcomes,jpcCount);assert.equal(forecast.expectedCashNumerator,cash.toString());assert.equal(forecast.jpcProbability,jpcCount/forecast.outcomeCount);
  if(history.length===7){const wanted=available.filter(n=>oracle(card.id,observed+n).reason);assert.deepEqual(forecast.reaches.map(row=>row.number),wanted);}
  else assert.deepEqual(forecast.reaches,[]);
 }
}
assert.throws(()=>R.finalSumDistribution([1,1]),RangeError);assert.equal(R.forecast(null),null);

// The exact serialized report is reproducible, and classic browser/CJS contexts require no DOM.
const report=buildReport(),saved=JSON.parse(fs.readFileSync(new URL('../docs/sugar-challenge-v254-probabilities.json',import.meta.url),'utf8'));
assert.deepEqual(report,saved);assert.equal(report.mixture.jpcProbability.numerator,'1081352000');assert.equal(report.mixture.jpcProbability.denominator,'10815750000');
assert(Math.abs(report.mixture.jpcPercent-10)<.02);assert.equal(report.multiplier.mean.value,1.275);
const browser=vm.createContext({}),common=vm.createContext({module:{exports:{}}});
vm.runInContext(source,browser);vm.runInContext(source,common);
assert.deepEqual(plain(browser.SugarChallengeRulesV254.create(options)),create());assert.equal(common.module.exports.REVISION,254);
assert(Object.isFrozen(R));assert(Object.isFrozen(R.cards[0].luckySums));
console.log(`Sugar Challenge v254: ${visited} combinations, ${R.cards.length} cards, exact 9.997938191988535% JPC, persisted input validation, conditional reach and integer cash checks passed.`);

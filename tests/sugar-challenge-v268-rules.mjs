import assert from 'node:assert/strict';
import '../assets/sugar-challenge-rules-v254.js';
import {createSugarChallengeLedger} from '../server-sugar-challenge-v254.mjs';
const R=globalThis.SugarChallengeRulesV254;
const create=(extra={})=>R.create({id:'s268',roundId:'r268',station:3,sugarValues:[100,100,100,100,100],cardId:'standard',multiplier:2,...extra});
const advance=(s,draws)=>draws.reduce((state,n)=>R.advance(state,n,{roundId:state.roundId,ballIndex:state.draws.length+1}),s);
assert.equal(R.REVISION,268);
const draw=[20,19,18,15,5,3,7,17]; // 77 on ball 5, final 104 normally pays cash.
let s=advance(create(),draw.slice(0,4));
assert.equal(s.sum,72);assert.equal(s.jpcQualified,false);
assert.deepEqual(R.reaches(s).map(r=>[r.number,r.sum]),[[5,77],[16,88]]);
s=R.advance(s,5,{ballIndex:5});assert.equal(s.phase,'drawing');assert.equal(s.jpcQualified,true);assert.equal(s.qualifyingDrawCount,5);assert.equal(s.qualifyingNumber,5);assert.equal(s.qualifyingSum,77);assert.equal(s.cashWin,0);assert.equal(s.award,null);assert.deepEqual(R.reaches(s),[]);
const ticket=structuredClone(s.jpcTicket),saved=R.snapshot(s);
assert.deepEqual(R.restore({...s,jpcQualified:false,jpcTicket:null,qualifyingDrawCount:8}),s);
s=advance(s,draw.slice(5));assert.equal(s.sum,104);assert.equal(s.phase,'complete');assert.equal(s.cashWin,0);assert.deepEqual(s.jpcTicket,ticket);assert.equal(s.award.qualifyingNumber,5);
assert.deepEqual(R.advance(s,17,{ballIndex:8}),s);assert.equal(R.advance(s,2),null);
const legacy=advance(create({rulesRevision:254}),draw);assert.equal(legacy.jpcQualified,false);assert.equal(legacy.cashWin,10);assert.equal(R.snapshot(legacy).rulesRevision,254);
const reversed=advance(create(),draw.toReversed());assert.equal(reversed.jpcQualified,false,'same set with a different order may avoid every lucky total');
const forged=R.restore({...create(),jpcQualified:true,jpcTicket:ticket,qualifyingDrawCount:1});assert.equal(forged.jpcQualified,false);
for(const n of [1,2,3])assert.equal(advance(create(),Array.from({length:n},(_,i)=>i+1)).jpcQualified,false,'small partial totals are not the final low-tail award');
assert.equal(advance(create(),[1,2,3,4,5,6,7,8]).jpcQualified,true);
const restored=R.restore(saved);assert.equal(restored.jpcQualified,true);assert.equal(restored.drawCount,5);
assert.equal(R.forecast(restored).jpcProbability,1);assert.equal(R.forecast(restored).expectedCash,0);

// Independent ordered oracle checks next-ball reaches and all suffixes for
// three remaining balls. It tracks prefix luck instead of calling R.advance.
function oracle(card,history){
 let sum=0,hit=false;for(const n of history){sum+=n;if(card.luckySums.includes(sum))hit=true;}
 const complete=history.length===8,tail=complete&&(sum<=card.lowMax||sum>=card.highMin),jpc=hit||tail;
 const band=complete&&!jpc?card.bands.find(row=>Math.abs(sum-104)>=row.distance).hundredths:0;
 return {sum,jpc,cash:10*band};
}
for(const card of R.cards)for(const prefix of [[1,2,3,10,15],[20,19,18,15,5],[25,24,23,22,21]]){
 const state=advance(create({cardId:card.id}),prefix),f=R.forecast(state),rows=new Map();let count=0,jpc=0,cash=0;
 const walk=history=>{if(history.length===8){const o=oracle(card,history);count++;jpc+=Number(o.jpc);cash+=o.cash;const row=rows.get(o.sum)||{count:0,jpc:0,cash:0};row.count++;row.jpc+=Number(o.jpc);row.cash+=o.cash;rows.set(o.sum,row);return;}for(let n=1;n<=25;n++)if(!history.includes(n))walk([...history,n]);};walk(prefix);
 assert.equal(f.outcomeCount,count);assert.equal(f.jpcOutcomes,jpc);assert.equal(f.expectedCashNumerator,String(cash));assert.equal(f.jpcProbability,jpc/count);
 for(const row of f.rows){assert.equal(row.count,rows.get(row.sum).count);assert.equal(row.jpcOutcomes,rows.get(row.sum).jpc);}
 const expected=state.jpcQualified?[]:Array.from({length:25},(_,i)=>i+1).filter(n=>!prefix.includes(n)&&oracle(card,[...prefix,n]).jpc);
 assert.deepEqual(R.reaches(state).map(row=>row.number),expected);
}

// The server publishes the entitlement immediately and durably, but never pays
// ordinary cash early or duplicates the ticket on replay/restart.
const ledger=createSugarChallengeLedger({randomSeed:()=>268,now:()=>1000,rules:{...R,create:o=>R.create({...o,cardId:'standard',multiplier:2})}});
let p={playerId:'early',wallet:{credit:10000,revision:1},games:{},lifetimeWin:0};
ledger.ingest(p,{roundId:'earned',tokens:Array.from({length:5},(_,i)=>({id:i,sugarId:'s'+i,sourceRoundId:'earned',game:0,value:100})),locked:[100]});
const opened=ledger.start(p,{roundId:'r268',station:3,openedAt:900});assert.equal(opened.started,true);assert.equal(opened.challenge.phase,'ready');
const quote=opened.challenge.jpAmount;
let result=ledger.advance(p,{roundId:'r268',balls:draw.slice(0,5)});assert.equal(result.settled,false);assert.equal(result.jpcTickets.length,1);assert.equal(result.challenge.jpcQualified,true);assert.equal(p.wallet.credit,10000);
const firstTicket=structuredClone(result.jpcTickets[0]);p=JSON.parse(JSON.stringify(p));
result=ledger.advance(p,{roundId:'r268',balls:draw.slice(0,5)});assert.equal(result.changed,false);assert.deepEqual(result.jpcTickets,[firstTicket]);
result=ledger.advance(p,{roundId:'r268',balls:draw});assert.equal(result.settled,true);assert.equal(result.cashPaid,0);assert.deepEqual(result.jpcTickets,[firstTicket]);assert.equal(result.challenge.jpAmount,quote);assert.equal(p.wallet.credit,10000);
assert.equal(ledger.advance(p,{roundId:'r268',balls:draw}).changed,false);
const cancelled=ledger.cancel(p,'r268');assert.equal(cancelled.jpcTickets.length,0);assert.equal(cancelled.bank.length,5);
console.log('SUGAR_V268_RULES_PASS: BET quote, early cumulative lucky entitlement, exact ordered suffix probabilities, legacy checkpoints, durable one-time JPC and cancellation');

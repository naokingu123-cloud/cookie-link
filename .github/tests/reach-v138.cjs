/* Pure final-board and projection checks. The matched UI must never accept a ninth real draw. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8'),main=read('optimized/app-01.js');
function part(src,from,to){
 const i=src.indexOf(from),j=src.indexOf(to,i+from.length);assert(i>=0&&j>i,from);return src.slice(i,j);
}
const tierSrc=part(main,'const reachTier=','\n');
const tier=new Function(tierSrc+';return reachTier')();
for(const [total,expected] of [[299,0],[300,1],[999,1],[1000,2]])assert.equal(tier(total,false),expected);
assert.equal(tier(2000,true),3);

// End-of-game Cookie snapshots use the same numbered and WILD HIT rules as real play.
const cookie=new Function(part(main,'const SPECIAL_RATE=','const elixirGlyphs=')+
 part(main,'function copyReachState','// Keep the numeral height')+';return {predictNextHit,payoutHundredths}')();
for(const previous of [0,1]){
 const board=Array.from({length:8},()=>Array(8).fill(null));board[7][3]={id:5,number:null,color:2,wild:true};
 const s={board,maxLink:0,maxChain:0,allClears:previous,totalHundredths:cookie.payoutHundredths(0,0,previous)};
 const before=structuredClone(s),p=cookie.predictNextHit(s,25);
 assert.equal(p.tier,3);assert(p.gain>0);assert.deepEqual(s,before);
 board[7][3].wild=false;assert.equal(cookie.predictNextHit(s,25),null);
}
// Six Drop recognizes a newly cleared board, including a fresh board after a prior clear.
const six=new Function('Engine','motionReduced','reachTier',read('assets/six-candy-rounds-engine.js')+
 ';return {empty:sixEmpty,predict:SixBallCandyEngine.prototype.predict}')(class{},false,tier);
const pyr=six.empty(10);pyr.at(-1)[0]={id:1,number:25,color:2};
const sixState={initialPyramid:true,pyramid:pyr,drawn:new Set([1,2,3,4,5,6,7,8]),totalHundredths:10000,allClears:1,roundIndex:2,clearedRounds:new Set([1])};
const beforeSix=structuredClone(sixState),nextSix=six.predict.call(sixState,25);
assert(nextSix.allClear&&nextSix.tier===3&&nextSix.gain>=10000);assert.equal(six.predict.call(sixState,14).gain,0);assert.deepEqual(sixState,beforeSix);

// Exercise the live Canyon mapping with four drill outcomes on a settled eighth board.
const canyon=read('assets/highest-role-reach-v18.js');
const runCanyon=new Function('chocoPlan','reachTier','chocoQueueFrame','scheduleUI','failReachPreview','setTimeout',
 'let chocoRequestReach;'+part(canyon,' chocoRequestReach=function',' const oldLabel=')+';return chocoRequestReach');
const outcomes={21:{gain:10,oddsCount:0,bonusResolvedDepth:500},22:{gain:0,oddsCount:1,bonusResolvedDepth:500},
 23:{gain:0,oddsCount:0,bonusResolvedDepth:500},24:{gain:100,oddsCount:0,bonusResolvedDepth:600}};
const choco={processed:8,accepted:8,queue:[],version:3,seed:1,totalHundredths:990,
  drills:[{numbers:[21,22,23,24]}],lucky:{numbers:[]},world:()=>({strata:[],bonusResolvedDepth:500})};
const cs={engine:choco,i:0};
runCanyon((grid,[n])=>outcomes[n],tier,()=>{},()=>{},(s,e,err)=>{throw err},f=>f())(cs,choco,{phase:'playing',bet:()=>1,draws:[1,2,3,4,5,6,7,8]});
assert.deepEqual(cs.reachResults.map(p=>p.number),[21,22,24]);
assert.deepEqual(cs.reachResults.map(p=>p.tier),[2,1,3]);
assert(cs.reachResults[1].oddsUp);assert.equal(cs.reachAfterBall,8);

// Ninth green on a not-yet-green blue seed gives an odds-only Jelly reach even at 0 WIN.
const J=require('../../assets/jelly-rules.js'),host=read('assets/jelly-host.js');
const rawNumbers=Array.from({length:25},(_,i)=>i+1);
const js={numbers:rawNumbers,draws:rawNumbers.slice(0,8),open:new Set(),colors:rawNumbers.map(n=>n===25?'blue':null),lines:[],oddsMultiplier:1};
const je={state:js,i:0,totalHundredths:0,version:3},slot={};
new Function('engine','slot','K','reachTier','reachContext','id','clock',
 'let reachStarted;'+part(host,'slot.updateJellyReach=function','function collectSugar')+';slot.updateJellyReach({bet:()=>1})')(
 je,slot,J,tier,()=>({key:'8',count:8,used:new Set(js.draws)}),0,0);
const jo=slot.tabReachResults.find(p=>p.number===25);assert(jo.oddsUp&&jo.gain===0&&jo.total===0);
assert.equal(slot.tabReachResults.length,1);assert.equal(slot.reachAfterBall,8);assert.equal(J.draw(js,25),null);

require('./visual_reach_v76.cjs'); // Actual Gelato 24/24 and Winery 21/21 plus 0-WIN MIX.
require('./popcorn-reach-v88.cjs'); // Early ordinary clears and 3rd/later repeatable top awards.
console.log('Seven games: aggregate tiers, raw gain, zero-pay odds, final reach and fresh/repeatable top events passed.');

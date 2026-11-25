/* Reachable Waffle v232 rounds for v301 artwork verification. The real base
 * rules and the real POW wrapper create every fixture. A separate coordinate
 * oracle supplies brackets, rack removal, prizes, timing and rounded receipts.
 * No fixture selects a mold or edits an opening/POW schedule. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';

export const BASELINE_CORE_SHA256='dc834375e3058b0b2434a2008c9f7c600c07d9131f809c7396ddd3e7ec7eabdb';
export const BASELINE_HOST_SHA256='32e3ec5379c475d8a36ebb1edbcd2747de7d4da58030523a887c93c65e6c256d';
export const BASELINE_POW_PREFIX_SHA256='f3e4cced1eb16741ed3f19110d6034a82722fd5c03c7189c11a07b54878e6b25';
export const coreFile=new URL('../assets/bingo-stick-rules.js',import.meta.url);
export const hostFile=new URL('../assets/bingo-stick-host.js',import.meta.url);
export const powFile=new URL('../assets/waffle-pow-v159.js',import.meta.url);
export const nativeCore=()=>fs.readFileSync(coreFile,'utf8');
export const nativeHost=()=>fs.readFileSync(hostFile,'utf8');
export const nativePow=()=>fs.readFileSync(powFile,'utf8');
export function nativePowPrefix(source=nativePow()){
 const end=source.indexOf(' function medal(');assert(end>0,'native/UI wrapper boundary remains explicit');return source.slice(0,end);
}
export const sha256=value=>createHash('sha256').update(value).digest('hex');
export const plain=value=>JSON.parse(JSON.stringify(value));
export function random(seed,position){
 const initial=Number(seed)>>>0;let state=initial,calls=0;
 const rng=()=>{calls++;state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 rng.snapshot=()=>({seed:initial,state,calls});
 if(position){assert.equal(position.seed,initial);assert(Number.isSafeInteger(position.calls)&&position.calls>=0);for(let i=0;i<position.calls;i++)rng();assert.equal(state,position.state);}
 return rng;
}
export function loadWaffleRuntime({coreSource=nativeCore(),powSource=nativePow(),checkpoint=null,ambientRng=null}={}){
 const math=Object.create(Math);math.random=ambientRng||(()=>{throw Error('Waffle sampled ambient RNG');});
 const window={console,Math:math,performance:{now:()=>0},document:{getElementById:()=>null,querySelector:()=>null,createElement:()=>({}),head:{append(){}}},
  setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){}};
 window.window=window;vm.createContext(window);vm.runInContext(coreSource,window,{filename:'assets/bingo-stick-rules.js'});
 const R=window.BingoStickRules,engine={version:0,roundBet:100,state:checkpoint?plain(checkpoint):null,
  reset(){this.state=R.create({target:90,rng:random(0xc0ffee)});}};
 window.BingoStick={engine};vm.runInContext(powSource,window,{filename:'assets/waffle-pow-v159.js'});
 assert.equal(window.WafflePowV159.version,'v232');assert.equal(R.__powV161,true);
 return {R,window,engine};
}
export const loadWaffle=options=>loadWaffleRuntime(options).R;

export const BASE_RACK=Object.freeze([0,20,20,40,40,100,100,150,200,300,400,500,1000,1500]);
export const REVERSAL_BONUS=300000;
export const TOP_PRIZES=Object.freeze([2000,2500,3000,4000,5000,7500,10000]);
export const topPrize=grade=>grade<TOP_PRIZES.length?TOP_PRIZES[grade]:10000+(grade-6)*2500;
export const clampTarget=value=>Math.max(50,Math.min(150,Number.isFinite(Number(value))?Number(value):90));
export const ORACLE_MOLDS=Object.freeze([
 ['千鳥','BBB.BBB.BB.W..WW',38.06,233424,233424],
 ['小花','W.WW.WWWB.WWBB..',42.8442,14512,14512],
 ['飛石','.WBBWW.BB.B.B.BB',66.6022,25920,25920],
 ['小紋','BBB.BBW..B.WB.WB',145.6448,979056,967464],
 ['双葉','.BWWBB.WBWW.B..W',210.817,2880,2880],
 ['花菱','.BBBBW.B.WWWB.W.',292.6372,171720,171720],
 ['風車','WW...BWWBWW.B.BB',434.6322,8,8],
 ['花窓','.BBBBWW.B.BW.W.W',527.631,720,720],
 ['組市松','WW..B.WWBWB..BWB',453.082,4844,4844]
].map(([name,quarter,normal,events,games])=>Object.freeze({name,quarter,normal,events,games,orders:43609104000})));
const cells=Array.from({length:64},(_,i)=>i),weightsCache=new Map();
export function independentWeights(target=90){
 const rate=clampTarget(target);if(weightsCache.has(rate))return weightsCache.get(rate).slice();
 const returns=ORACLE_MOLDS.map(m=>m.normal+m.events/m.orders*REVERSAL_BONUS);let low=-1,high=1,weights;
 // Solve the target mean independently, using a different precision budget.
 for(let i=0;i<64;i++){
  const t=(low+high)/2,raw=returns.map(v=>Math.exp((v-90)*t)),sum=raw.reduce((a,b)=>a+b,0);
  weights=raw.map(v=>v/sum);if(weights.reduce((a,w,j)=>a+w*returns[j],0)<rate)low=t;else high=t;
 }
 weightsCache.set(rate,weights);return weights.slice();
}
function shuffled(values,rng){
 const deck=values.slice();for(let length=deck.length;length>1;length--){const j=Math.trunc(rng()*length),last=length-1;[deck[last],deck[j]]=[deck[j],deck[last]];}return deck;
}
export function verifyNativeOpening(state,seed,target,rngAfter){
 const rng=random(seed),rate=clampTarget(target),weights=independentWeights(rate),pick=rng();let cumulative=0,mold=ORACLE_MOLDS.at(-1);
 for(let i=0;i<weights.length;i++){cumulative+=weights[i];if(pick<cumulative){mold=ORACLE_MOLDS[i];break;}}
 rng(); // baseCreate consumes its own unused mold roll before its override.
 const transpose=rng()<.5,colors=cells.map(id=>{
  const x=Math.min(id%8,7-id%8),y=Math.min(Math.floor(id/8),7-Math.floor(id/8)),value=mold.quarter[transpose?4*x+y:4*y+x];
  return value==='B'?'black':value==='W'?'white':null;
 });
 const deck=shuffled(Array.from({length:25},(_,i)=>i+1),rng),numbers=colors.map(color=>color?null:deck.pop());
 const hasPow=rng()<.95,turnOrder=shuffled(Array.from({length:8},(_,i)=>i),rng),powTurns=Array.from({length:8},(_,i)=>hasPow&&i===turnOrder[0]);
 const counts={black:colors.filter(c=>c==='black').length,white:colors.filter(c=>c==='white').length};
 const expected={colors,numbers,offBoardNumbers:deck.sort((a,b)=>a-b),counts,phase:'playing',draws:[],target:rate,patternName:mold.name,
  rack:[...BASE_RACK],lastRack:[...BASE_RACK],lastKnockRow:null,grade:0,lastGrade:0,turnTotals:[],placed:[],flipped:[],flipSteps:[],lastColor:null,lastFlips:0,previousMaxFlips:0,maxFlips:0,
  bonusEvents:[],lastReversal:null,reversalCount:0,reversalThisMove:false,highestRole:false,lastBaseHundredths:0,baseHundredths:0,bonusHundredths:0,totalHundredths:0,
  powTurns,lastPowActive:false,lastHammerRange:0,lastKnockRows:[],lastPowerGain:false,reversalBonusHundredths:REVERSAL_BONUS};
 assert.deepEqual(plain(state),expected,'all initial native fields, mold, color symmetry, number deck and POW schedule match the independent opening');
 assert.deepEqual(rngAfter,rng.snapshot());assert.equal(rngAfter.calls,35);
 return {mold:mold.name,transpose,patternForced:false,randomCalls:35,powTurns,weights,rate};
}
export function independentMove(before,number){
 if(!Number.isInteger(number)||number<1||number>25||before.draws.includes(number))return null;
 const origin=before.numbers.indexOf(number);if(origin<0?!before.offBoardNumbers.includes(number):before.colors[origin])return null;
 const ball=before.draws.length+1,color=ball%2?'black':'white',other=color==='black'?'white':'black',directions=[];
 if(origin>=0)for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(dx||dy){
  const run=[];let x=origin%8+dx,y=Math.floor(origin/8)+dy,distance=1;
  while(x>=0&&x<8&&y>=0&&y<8){
   const id=y*8+x,value=before.colors[id];
   if(value===other)run.push({id,distance,dx,dy});
   else {if(value===color&&run.length)directions.push(run);break;}
   x+=dx;y+=dy;distance++;
  }
 }
 const flipSteps=directions.flat().sort((a,b)=>a.distance-b.distance),flipped=flipSteps.map(p=>p.id),placed=origin>=0?[origin]:[],colors=before.colors.slice();
 for(const id of [...placed,...flipped])colors[id]=color;
 const counts={black:colors.filter(v=>v==='black').length,white:colors.filter(v=>v==='white').length},lastReversal=before.counts[other]>0&&counts[other]===0?{ball,number,color}:null;
 const lastFlips=flipped.length,row=lastFlips?Math.min(13,lastFlips):null,pow=!!before.powTurns?.[ball-1];
 // Filtering surviving row IDs is independent of the production descending
 // splice implementation. Only the hit row pays; adjacent POW rows just drop.
 const knockRows=row?Array.from({length:13},(_,i)=>13-i).filter(i=>pow?Math.abs(i-row)<=1:i===row):[];
 return {origin,ball,color,other,colors,placed,flipSteps,flipped,counts,lastColor:color,lastFlips,lastBaseHundredths:before.rack[lastFlips?Math.min(13,lastFlips):0],
  lastReversal,row,pow,knockRows,directions:directions.map(ray=>ray.map(p=>p.id))};
}
export function independentStep(before,number,bet=100){
 if(before.phase!=='playing')return null;const move=independentMove(before,number);if(!move)return null;
 const {ball,color,placed,flipped,flipSteps,counts,lastFlips,lastBaseHundredths,lastReversal,row,pow,knockRows}=move;
 const lastGrade=before.grade||0,rack=before.rack.filter((_,id)=>!knockRows.includes(id));
 for(let i=0;i<knockRows.length;i++)rack.push(topPrize(lastGrade+i));
 const bonusEvents=lastReversal?[...before.bonusEvents,lastReversal]:before.bonusEvents.slice(),baseHundredths=before.baseHundredths+lastBaseHundredths;
 const bonusHundredths=bonusEvents.length*REVERSAL_BONUS,totalHundredths=baseHundredths+bonusHundredths,previousTotalHundredths=before.totalHundredths;
 const previousTotalWin=Math.floor(bet*previousTotalHundredths/100),totalWin=Math.floor(bet*totalHundredths/100),deltaWin=totalWin-previousTotalWin,gain=totalHundredths-previousTotalHundredths;
 const delay=180+lastFlips*110,rankStart=delay+390,dropStart=rankStart+190,land=dropStart+310,nativeDuration=row!==null?land+210:placed.length?420:0;
 const after={...plain(before),placed,flipped,flipSteps,counts,lastColor:color,lastFlips,lastBaseHundredths,lastReversal,colors:move.colors,draws:[...before.draws,number],
  rack,lastRack:before.rack.slice(),lastKnockRow:row,lastKnockRows:knockRows,lastHammerRange:knockRows.length,lastGrade,grade:lastGrade+knockRows.length,lastPowActive:pow,lastPowerGain:false,
  turnTotals:[...before.turnTotals,totalHundredths],previousMaxFlips:before.maxFlips,maxFlips:Math.max(before.maxFlips,lastFlips),
  bonusEvents,reversalCount:bonusEvents.length,reversalThisMove:!!lastReversal,highestRole:!!bonusEvents.length,baseHundredths,bonusHundredths,totalHundredths,
  reversalBonusHundredths:REVERSAL_BONUS,phase:ball===8?'done':'playing'};
 const award=lastFlips>0&&(gain>0||!!lastReversal),role=award?(lastReversal?'reversal':pow?'pow':'flip'):null;
 return {number,ball,origin:move.origin,color,placed,flipped,flipSteps,counts,flips:lastFlips,rows:knockRows,row,pow,oldGrade:lastGrade,grade:after.grade,
  oldRack:before.rack.slice(),rack:after.rack.slice(),baseGainHundredths:lastBaseHundredths,bonusGainHundredths:lastReversal?REVERSAL_BONUS:0,
  previousTotalHundredths,totalHundredths,previousTotalWin,totalWin,deltaWin,independentlyRoundedGain:Math.floor(bet*gain/100),gain,award,role,
  reversalThisMove:!!lastReversal,reversalCount:bonusEvents.length,highestRole:!!bonusEvents.length,previousMaxFlips:before.maxFlips,maxFlips:after.maxFlips,
  tier:lastReversal?4:gain>=1000?3:gain>=300?2:1,delay,nativeDuration,rankStart,dropStart,land,lastFlipAt:lastFlips?180+(lastFlips-1)*110+55:0,
  phase:after.phase,sugarEligible:after.maxFlips>=8||!!bonusEvents.length,sugarCollected:ball===8&&(after.maxFlips>=8||!!bonusEvents.length),
  paths:move.directions.map(ray=>[move.origin,...ray]),after};
}
export function verifyNativeStep(before,after,number,rngBefore,rngAfter,bet=100){
 const oracle=independentStep(before,number,bet);assert(oracle);
 assert.deepEqual(after,oracle.after,'complete native state matches independent bounded rays, color recount, removed rows, append-only prizes and exact totals');
 assert.deepEqual(rngAfter,rngBefore,'every native Waffle draw consumes zero RNG');
 assert.equal(new Set(oracle.flipped).size,oracle.flipped.length);assert.equal(after.counts.black+after.counts.white,44+after.draws.filter(n=>after.numbers.includes(n)).length);
 assert.equal(after.rack.length,14);assert.equal(after.totalHundredths,after.baseHundredths+after.bonusHundredths);
 return oracle;
}

const consecutive=[1,2,3,4,5,6,7,8];
export const WAFFLE_FIXTURES=Object.freeze([
 {id:'carry-seven',seed:1,rate:90,bet:7,draws:consecutive,focusTurns:[4,5,7,8],purpose:'True per-ball receipt 3 WIN versus independently rounded 2; final total 7.'},
 {id:'zero-one',seed:1,rate:90,bet:1,draws:consecutive,focusTurns:[5,7,8],purpose:'Positive native prizes legitimately pay 0, 0, then 1 WIN.'},
 {id:'pow-middle',seed:38,rate:90,bet:7,draws:consecutive,focusTurns:[2,3],purpose:'POW knocks [4,3,2], pays only row 3, and preserves the real rounding carry.'},
 {id:'pow-lower',seed:5,rate:90,bet:3000,draws:consecutive,focusTurns:[3,5,8],purpose:'POW on one flip knocks exactly [2,1]; no row zero or double prize.'},
 {id:'black-reversal',seed:1,rate:90,bet:300000,draws:[12,3,1,6,14,17,7,21],focusTurns:[4,5,7,8],purpose:'Off-board scheduled POW has no award; a reachable black reversal pays base plus 3000x.'},
 {id:'white-reversal',seed:106,rate:90,bet:3000,draws:[1,15,2,14,3,13,4,19],focusTurns:[5,8],purpose:'The eighth legal white turn reverses every opposing stone and settles once.'},
 {id:'no-pow-half',seed:7,rate:90,bet:5,draws:[1,2,24,3,8,13,5,16],focusTurns:[5,7,8],purpose:'A legitimate no-POW round and the single 150-hundredths half-medal boundary at BET 5.'}
].map(spec=>Object.freeze({...spec,draws:Object.freeze(spec.draws.slice()),focusTurns:Object.freeze(spec.focusTurns),patternForced:false})));
export function replayWaffleFixture(fixture,{bet}={}){
 const spec=typeof fixture==='string'?WAFFLE_FIXTURES.find(f=>f.id===fixture):fixture;assert(spec,'known reachable Waffle fixture');bet??=spec.bet;
 assert(Number.isSafeInteger(bet)&&bet>0,'the real Start/setBet accepts every positive integer, including 1 and 7');
 const R=loadWaffle(),rng=random(spec.seed);let state=R.create({target:spec.rate,rng});const rngInitial=rng.snapshot(),opening=verifyNativeOpening(state,spec.seed,spec.rate,rngInitial),initial=plain(state),steps=[];
 assert(spec.draws.length<=8&&new Set(spec.draws).size===spec.draws.length);
 for(const number of spec.draws){
  const before=plain(state),rngBefore=rng.snapshot(),prediction=R.project(state,number),predicted=independentMove(before,number);assert(prediction);assert(predicted);
  assert.deepEqual(plain(state),before);assert.deepEqual(rng.snapshot(),rngBefore);
  const projectExpected={placed:predicted.placed,flipSteps:predicted.flipSteps,flipped:predicted.flipped,counts:predicted.counts,lastColor:predicted.color,lastFlips:predicted.lastFlips,
   lastBaseHundredths:predicted.lastBaseHundredths,lastReversal:predicted.lastReversal,powActive:predicted.pow,lastPowActive:predicted.pow,lastKnockRows:predicted.knockRows,hammerRange:predicted.knockRows.length};
  assert.deepEqual(plain(prediction),projectExpected,'preview reads the same actual rays and old payout row without sampling randomness');
  const next=R.draw(state,number);assert(next);const after=plain(next),rngAfter=rng.snapshot();assert.deepEqual(plain(state),before,'draw cannot alter a previous animation or checkpoint snapshot');
  const oracle=verifyNativeStep(before,after,number,rngBefore,rngAfter,bet);
  steps.push({number,ball:oracle.ball,before,after,rngBefore,rngAfter,oracle});state=next;
 }
 return {...plain(spec),bet,metadata:{nativeVersion:'v232',patternForced:false,openingRngCalls:35,drawRngCalls:0,money:'per-ball difference of native rounded cumulative WIN',
  betContract:'positive integer: native 1 BET control and app.setBet/start; not restricted to five-medal denominations',sugar:'collected only after ball eight completes'},
  initial,opening,steps,rngInitial,rngFinal:rng.snapshot(),coreSha256:sha256(nativeCore()),hostSha256:sha256(nativeHost()),powPrefixSha256:sha256(nativePowPrefix())};
}
export const buildWaffleFixtures=options=>WAFFLE_FIXTURES.map(spec=>replayWaffleFixture(spec,options));
export function fixtureSummary(fixture){return {id:fixture.id,seed:fixture.seed,rate:fixture.rate,bet:fixture.bet,draws:fixture.draws,focusTurns:fixture.focusTurns,metadata:fixture.metadata,
 rngInitial:fixture.rngInitial,rngFinal:fixture.rngFinal,pattern:fixture.initial.patternName,powTurns:fixture.initial.powTurns,
 steps:fixture.steps.map(({number,ball,oracle:o})=>({number,ball,origin:o.origin,color:o.color,flips:o.flips,pow:o.pow,rows:o.rows,oldGrade:o.oldGrade,grade:o.grade,counts:o.counts,
  baseGainHundredths:o.baseGainHundredths,bonusGainHundredths:o.bonusGainHundredths,totalHundredths:o.totalHundredths,previousTotalWin:o.previousTotalWin,totalWin:o.totalWin,deltaWin:o.deltaWin,
  independentlyRoundedGain:o.independentlyRoundedGain,reversalThisMove:o.reversalThisMove,reversalCount:o.reversalCount,highestRole:o.highestRole,award:o.award,role:o.role,
  phase:o.phase,delay:o.delay,nativeDuration:o.nativeDuration,rankStart:o.rankStart,dropStart:o.dropStart,land:o.land,sugarCollected:o.sugarCollected}))};}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 assert.equal(sha256(nativeCore()),BASELINE_CORE_SHA256);assert.equal(sha256(nativeHost()),BASELINE_HOST_SHA256);assert.equal(sha256(nativePowPrefix()),BASELINE_POW_PREFIX_SHA256);
 console.log(JSON.stringify({coreSha256:BASELINE_CORE_SHA256,hostSha256:BASELINE_HOST_SHA256,powPrefixSha256:BASELINE_POW_PREFIX_SHA256,fixtures:buildWaffleFixtures().map(fixtureSummary)},null,2));
}

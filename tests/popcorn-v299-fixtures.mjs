/* Reached Popcorn v232 checkpoints for the v299 presentation release.
 * Every fixture starts with native create and uses eight distinct legal draws.
 * The independent observer below owns the BFS, prize arithmetic, refill RNG,
 * number replacement and state accounting; it does not invoke preview/payout
 * to manufacture expected results. No DOM, image, browser or service is used. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';

export const BASELINE_CORE_SHA256='d2f0f602e9fb10ad4bbed81f4cb6cce556a4ae23a70a53e5423de98d4e05af42';
export const coreFile=new URL('../assets/popcorn-engine.js',import.meta.url);
export const nativeCore=()=>fs.readFileSync(coreFile,'utf8');
export const sha256=value=>createHash('sha256').update(value).digest('hex');
export const plain=value=>JSON.parse(JSON.stringify(value));
export function loadPopcorn(source=nativeCore(),{forbidAmbientRandom=false}={}){
 const module={exports:{}};
 const math=Object.create(Math);
 math.random=forbidAmbientRandom?()=>{throw Error('native preview or explicitly seeded draw sampled ambient RNG');}:Math.random;
 new Function('window','module','Math',source)({},module,math);
 return module.exports;
}

/** Browser replay uses the same unsigned word and exact call count. */
export function random(seed,position){
 const initial=Number(seed)>>>0;
 let state=initial,calls=0;
 const rng=()=>{calls++;state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 rng.snapshot=()=>({seed:initial,state,calls});
 if(position){
  assert.equal(position.seed,initial);
  assert(Number.isSafeInteger(position.calls)&&position.calls>=0);
  for(let i=0;i<position.calls;i++)rng();
  assert.equal(state,position.state,'saved RNG word agrees with its actual seed and call count');
 }
 return rng;
}

const cells=[];
for(let r=-4;r<=4;r++)for(let q=-4;q<=4;q++)if(Math.abs(q+r)<=4)cells.push({q,r,x:q+r/2,y:r*Math.sqrt(3)/2});
const byAxial=new Map(cells.map((p,id)=>[p.q+','+p.r,id]));
const at=(q,r)=>byAxial.get(q+','+r);
const ports=[];
for(let bank=0;bank<3;bank++)for(let lane=0;lane<5;lane++){
 const points=[];
 if(bank===0)for(let k=0;k<5+lane;k++)points.push(at(-4+k,lane-k));
 if(bank===1)for(let k=0;k<5;k++)points.push(at(-4+lane+k,4-2*k));
 if(bank===2){const level=4-lane;for(let k=0;k<5+level;k++)points.push(at(4-level,level-k));}
 ports.push(points);
}
export const ORACLE_CELLS=Object.freeze(cells.map(Object.freeze));
export const ORACLE_PORTS=Object.freeze(ports.map(points=>Object.freeze(points)));
const topRow=cells.flatMap((p,id)=>p.r===-4?[id]:[]);

/** Fixed hundredths avoid deriving the oracle from the production paytable. */
export const CLEAR_MULTIPLIERS=Object.freeze([1,3,20,50,200,500,1000,2000]);
const popHundredths=[];
for(const [lo,hi,step] of [[10,100,10],[120,200,20],[250,500,50],[600,1000,100],[1250,3000,250],[3500,5000,500]]){
 for(let amount=lo;amount<=hi;amount+=step)popHundredths.push(amount);
}
export function independentHundredths(popped,clears,first=120){
 const step=Math.floor((popped-first)/10);
 const pop=step<0?0:step<popHundredths.length?popHundredths[step]:5000+500*(step-popHundredths.length+1);
 return pop+CLEAR_MULTIPLIERS.slice(0,Math.min(clears,8)).reduce((sum,value)=>sum+value*100,0);
}
export function independentPayout(popped,clears,bet=100,first=120){
 return Math.floor(independentHundredths(popped,clears,first)*bet/100+1e-8);
}
export function independentProbabilities(level){
 const base=[0,.15,.03,.02,.01,.001],factor=1.5**(level-1),p=Array(6).fill(0);
 let reserved=0;
 for(const grade of [5,4,3,2,1]){p[grade]=Math.min(1-reserved,base[grade]*factor);reserved+=p[grade];}
 p[0]=1-reserved;return p;
}
function gradeFor(roll,level){
 const p=independentProbabilities(level);let boundary=0;
 for(const grade of [5,4,3,2,1]){boundary+=p[grade];if(roll<boundary)return grade;}
 return 0;
}
export function independentBlast(source,power){
 const a=cells[source];
 return cells.flatMap((b,id)=>{
  if(source===id||!power)return [];
  const dq=b.q-a.q,dr=b.r-a.r;
  const hit=power===5||power===4&&(dq===0||dr===0||dq+dr===0)||power<=3&&Math.max(Math.abs(dq),Math.abs(dr),Math.abs(dq+dr))<=power;
  return hit?[id]:[];
 });
}
export function independentIgnition(before,number){
 const port=before.numbers.indexOf(number),all=port===15,boost=port===16;
 const first=all?before.board.flatMap((piece,id)=>piece?.bomb?[id]:[]):port<0||boost?[]:ports[port].filter(id=>before.board[id]);
 const seen=new Set(first),waves=[];let wave=first;
 while(wave.length){
  waves.push(wave);const next=[];
  for(const id of wave){
   const piece=before.board[id];if(!piece.bomb)continue;
   for(const target of independentBlast(id,piece.power))if(before.board[target]&&!seen.has(target)){seen.add(target);next.push(target);}
  }
  wave=next;
 }
 const count=seen.size,occupied=before.board.filter(Boolean).length,clear=count>0&&count===occupied;
 const popped=before.popped+count,clears=before.clears+Number(clear);
 const grades=Array.from({length:6},(_,grade)=>[...seen].filter(id=>before.board[id].power===grade).length);
 const totalHundredths=independentHundredths(popped,clears,before.firstPopAward);
 const priorHundredths=independentHundredths(before.popped,before.clears,before.firstPopAward),gain=totalHundredths-priorHundredths;
 const nativeOldWin=independentPayout(before.popped,before.clears,before.bet,before.firstPopAward);
 const nativeTotalWin=independentPayout(popped,clears,before.bet,before.firstPopAward),nativeWinDelta=nativeTotalWin-nativeOldWin;
 return {port,all,boost,count,chains:waves.length,waves,waveCounts:waves.map(w=>w.length),grades,occupied,clear,popped,clears,
  oldLevel:before.level,newLevel:before.level+Number(boost),gain,totalHundredths,nativeOldWin,nativeTotalWin,nativeWinDelta,
  legacyWin:Math.floor(before.bet*gain/100),award:count>0&&(gain>0||clear),role:clear?(clears>=3?'grand':'clear'):'pop',
  sugarCrossed:!before.sugarAwarded&&before.popped<before.sugarTarget&&popped>=before.sugarTarget};
}

/** Reconstruct the returned motion frames without trusting their after boards.
 * The immutable source hash guards the physical solver itself; this observer
 * independently checks piece lineage, downward motion, top-only spawning,
 * correct per-piece PRNG grade, occupied-cell accounting and final state. */
export function verifyNativeStep(before,after,trace,number,rngBefore,rngAfter){
 const expected=independentIgnition(before,number),rng=random(rngBefore.seed,rngBefore);
 assert(trace,'one valid unused number has a native trace');
 assert.deepEqual(trace.waves.map(w=>w.slice().sort((a,b)=>a-b)),expected.waves.map(w=>w.slice().sort((a,b)=>a-b)),'independent axial BFS agrees with every wave');
 const removed=new Set(expected.waves.flat());
 assert.equal(trace.waves.flat().length,removed.size,'no cell can be popped twice by crossing blast fronts');
 for(const key of ['port','all','boost','count','clear','oldLevel','newLevel','sugarCrossed'])assert.equal(trace[key],expected[key],key);
 assert.equal(trace.oldWin,expected.nativeOldWin);assert.equal(trace.win,expected.nativeTotalWin);
 assert.equal(trace.firstPopAward,before.firstPopAward);assert.equal(trace.sugarTarget,before.sugarTarget);
 assert.deepEqual(trace.before,before.board);assert.deepEqual(trace.beforeNumbers,before.numbers);
 let board=before.board.map((piece,id)=>removed.has(id)?null:piece),spawned=0,firstEmpty=!board.some(Boolean);
 const born=[];
 function apply(step,spawn=false){
  assert.deepEqual(step.before,board,'motion frame starts with the independently reconstructed board');
  const next=board.slice(),moves=step.moves,sources=moves.map(m=>m.from),destinations=moves.map(m=>m.to);
  assert.equal(new Set(destinations).size,destinations.length,'no two kernels claim the same cell');
  assert(destinations.every(id=>Number.isInteger(id)&&id>=0&&id<61));
  if(spawn){
   const inlets=firstEmpty?[topRow[2]]:topRow;firstEmpty=false;
   assert.deepEqual(destinations,inlets.filter(id=>!board[id]),'refill uses only the real five-slot top mouth (center first after clear)');
   for(const move of moves){
    assert.equal(move.from,-1);assert.equal(board[move.to],null);
    const power=gradeFor(rng(),expected.newLevel),piece={id:61+before.refilled+spawned++,bomb:power>0,power,color:power};
    assert.deepEqual(move.piece,piece,'each native refill uses the next independent RNG grade and unique ID');
    assert.equal(move.x,cells[move.to].x);assert.equal(move.y,-5);next[move.to]=piece;born.push(piece);
   }
  }else{
   assert.equal(new Set(sources).size,sources.length,'a kernel moves at most once per native frame');
   for(const move of moves){
    assert(Number.isInteger(move.from)&&move.from>=0&&move.from<61);assert(board[move.from]);
    assert.deepEqual(move.piece,board[move.from]);assert.equal(move.path.from,move.from);assert.equal(move.path.to,move.to);
    const a=cells[move.from],b=cells[move.to];
    assert(b.r>a.r&&b.r-a.r<=2&&Math.abs(b.x-a.x)<=.5,'gravity never teleports upward or outside a neighboring support lane');
    assert(!board[move.to]||sources.includes(move.to),'a destination is empty or vacated in the same synchronous frame');
    next[move.from]=null;
   }
   for(const move of moves)next[move.to]=board[move.from];
  }
  assert.deepEqual(step.after,next,'native after frame exactly matches the stated legal moves');board=next;
 }
 for(const step of trace.fallSteps)apply(step);
 assert.deepEqual(trace.settled,board);
 for(const step of trace.refillSteps)apply(step,step.kind==='spawn');
 assert(topRow.every(id=>board[id]),'refill stops only when every mouth slot is occupied');
 assert.deepEqual(trace.after,board);assert.deepEqual(after.board,board);
 assert.equal(trace.moves.length,spawned);
 for(const move of trace.moves){assert.equal(move.from,-1);assert.deepEqual(board[move.to],move.piece);assert(born.some(piece=>piece.id===move.piece.id));}
 const numbers=before.numbers.slice(),drawn=[...before.drawn,number];let newNumber=null;
 if(expected.port>=0){
  const pool=Array.from({length:25},(_,id)=>id+1).filter(n=>!drawn.includes(n)&&!before.numbers.includes(n));
  assert(pool.length);newNumber=pool[Math.floor(rng()*pool.length)];numbers[expected.port]=newNumber;
 }
 assert.equal(trace.oldNumber,expected.port<0?null:number);assert.equal(trace.newNumber,newNumber);
 assert.deepEqual(trace.afterNumbers,numbers);assert.deepEqual(rngAfter,rng.snapshot(),'native RNG consumes only real refills plus one numbered-port replacement');
 const next={...plain(before),board,numbers,drawn,level:expected.newLevel,turn:before.turn+1,popped:expected.popped,
  refilled:before.refilled+spawned,clears:expected.clears,win:expected.nativeTotalWin,sugarAwarded:before.sugarAwarded||expected.sugarCrossed};
 assert.deepEqual(after,next,'full native state agrees with the independent event, accounting and RNG reconstruction');
 assert.equal(board.filter(Boolean).length,61+after.refilled-after.popped,'holes are conserved rather than silently filled');
 assert.equal(new Set(board.filter(Boolean).map(p=>p.id)).size,board.filter(Boolean).length);
 assert.equal(new Set(numbers).size,17);assert(numbers.every(n=>!drawn.includes(n)));
 return {...expected,spawned,rngCalls:rngAfter.calls-rngBefore.calls};
}

export const POPCORN_FIXTURES=Object.freeze([
 {id:'pops-lowbet',seed:7919,rate:90,bet:5,draws:[9,1,8,24,3,17,12,15],focusTurns:[1,3,4,5,6,8]},
 {id:'clear-ladder',seed:7919,rate:90,bet:3000,draws:[23,1,9,2,16,3,18,21],focusTurns:[1,2,4,5,6,8]},
 {id:'rainbow',seed:15838,rate:90,bet:3000,draws:[22,20,16,8,19,10,21,3],focusTurns:[3,4,8]}
].map(spec=>Object.freeze({...spec,draws:Object.freeze(spec.draws),focusTurns:Object.freeze(spec.focusTurns)})));

export function replayPopcornFixture(fixture,{bet=fixture.bet,firstPopAward}={}){
 const spec=typeof fixture==='string'?POPCORN_FIXTURES.find(f=>f.id===fixture):fixture;assert(spec,'known reachable fixture');
 if(bet===undefined)bet=spec.bet;
 const K=loadPopcorn(),rng=random(spec.seed),state=K.create({rng,bet,rate:spec.rate});
 // Only explicit legacy-checkpoint tests use this documented saved field.
 if(firstPopAward!==undefined)state.firstPopAward=firstPopAward;
 const initial=plain(state),rngInitial=rng.snapshot(),steps=[];
 assert.equal(rngInitial.calls,27,'native opening uses 24 shuffle + pattern + mirror + Sugar RNG calls');
 assert(spec.draws.length<=8&&new Set(spec.draws).size===spec.draws.length);
 for(const number of spec.draws){
  const before=plain(state),rngBefore=rng.snapshot(),saved=JSON.stringify(state);
  const prediction=K.preview(state,number);
  assert.equal(JSON.stringify(state),saved,'native preview changes no state');assert.deepEqual(rng.snapshot(),rngBefore,'native preview consumes no RNG');
  const trace=K.draw(state,number,rng),after=plain(state),rngAfter=rng.snapshot();
  const oracle=verifyNativeStep(before,after,trace,number,rngBefore,rngAfter);
  assert.equal(prediction.count,oracle.count);assert.equal(prediction.clear,oracle.clear);assert.equal(prediction.win,oracle.nativeTotalWin);
  steps.push({number,ball:after.turn,before,after,trace:plain(trace),rngBefore,rngAfter,oracle});
 }
 return {...plain(spec),bet,initial,steps,rngInitial,rngFinal:rng.snapshot(),coreSha256:sha256(nativeCore())};
}
export function buildPopcornFixtures(options={}){return POPCORN_FIXTURES.map(spec=>replayPopcornFixture(spec,options));}
export function fixtureSummary(replay){
 return {id:replay.id,seed:replay.seed,rate:replay.rate,bet:replay.bet,draws:replay.draws,focusTurns:replay.focusTurns,
  rngInitial:replay.rngInitial,rngFinal:replay.rngFinal,steps:replay.steps.map(({number,ball,oracle,rngBefore,rngAfter})=>({number,ball,
   count:oracle.count,chains:oracle.chains,popped:oracle.popped,clears:oracle.clears,clear:oracle.clear,all:oracle.all,boost:oracle.boost,
   oldLevel:oracle.oldLevel,newLevel:oracle.newLevel,grades:oracle.grades,gain:oracle.gain,nativeWin:oracle.nativeWinDelta,
   legacyWin:oracle.legacyWin,totalWin:oracle.nativeTotalWin,role:oracle.award?oracle.role:null,rngBefore,rngAfter}))};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 assert.equal(sha256(nativeCore()),BASELINE_CORE_SHA256,'native core stays byte-identical to published v298 base 5fabe4f');
 console.log(JSON.stringify({coreSha256:BASELINE_CORE_SHA256,fixtures:buildPopcornFixtures().map(fixtureSummary)},null,2));
}

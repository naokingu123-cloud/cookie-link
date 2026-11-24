/* Reachable Jelly v232 states for the v300 artwork release. Every visual
 * fixture starts at native create and advances only by eight legal numbers.
 * Expected graph connectivity, waves, recipes, lines, prizes and RNG are
 * reconstructed independently; no production payout/preview supplies them. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';

export const BASELINE_CORE_SHA256='f055494e593737bc4fd48a51af50403858bd164d26aa42f817500e9563369a15';
export const BASELINE_HOST_SHA256='d236f5a648ab0fecfa6eeff6e8c4534ad2501096608fc026dfdb728fd216b052';
export const coreFile=new URL('../assets/jelly-rules.js',import.meta.url);
export const hostFile=new URL('../assets/jelly-host.js',import.meta.url);
export const nativeCore=()=>fs.readFileSync(coreFile,'utf8');
export const nativeHost=()=>fs.readFileSync(hostFile,'utf8');
export const sha256=value=>createHash('sha256').update(value).digest('hex');
export const plain=value=>JSON.parse(JSON.stringify(value));
export function loadJelly(source=nativeCore(),{forbidAmbientRandom=false}={}){
 const module={exports:{}},math=Object.create(Math);
 math.random=forbidAmbientRandom?()=>{throw Error('Jelly rules sampled ambient RNG');}:Math.random;
 new Function('module','Math',source)(module,math);
 return module.exports;
}
export function random(seed,position){
 const initial=Number(seed)>>>0;let state=initial,calls=0;
 const rng=()=>{calls++;state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 rng.snapshot=()=>({seed:initial,state,calls});
 if(position){assert.equal(position.seed,initial);assert(Number.isSafeInteger(position.calls)&&position.calls>=0);for(let i=0;i<position.calls;i++)rng();assert.equal(state,position.state);}
 return rng;
}

// Set data has an explicit JSON contract for browser checkpoint restoration.
export function serializeJellyState(state){return plain({...state,open:[...state.open].sort()});}
export function reviveJellyState(state){return {...plain({...state,open:[]}),open:new Set(state.open)};}
export function serializeJellyTrace(trace){return plain({...trace,before:serializeJellyState(trace.before)});}

const lineIds=[];
for(let row=0;row<5;row++)lineIds.push(Array.from({length:5},(_,col)=>row*5+col));
for(let col=0;col<5;col++)lineIds.push(Array.from({length:5},(_,row)=>row*5+col));
lineIds.push([0,6,12,18,24],[4,8,12,16,20]);
export const ORACLE_LINES=Object.freeze(lineIds.map(Object.freeze));
const cellIds=Array.from({length:25},(_,i)=>i);
const edgeKey=(a,b)=>Math.min(a,b)+'-'+Math.max(a,b);
export const ORACLE_EDGES=Object.freeze(cellIds.flatMap(i=>[...(i%5<4?[[i,i+1]]:[]),...(i<20?[[i,i+5]]:[])]).map(Object.freeze));
const edgeNames=new Set(ORACLE_EDGES.map(([a,b])=>edgeKey(a,b)));
export const CURRENT_AWARDS=Object.freeze([0,16,24,40,80,160,400,800,1600,4000,8000,0,30000]);
export const LEGACY_AWARDS=Object.freeze([0,20,30,50,100,200,500,1000,2000,5000,10000,0,30000]);
export const ORACLE_MOLDS=Object.freeze([
 ['四葉',[7,11,13,17],48.233743779739,3,.026460628610656782],
 ['小窓',[6,8,16,18],61.98506833619,4,.5872723073388691],
 ['十字',[2,11,13,22],64.457063343471,4,.5996524515041127],
 ['双翼',[5,9,15,19],79.111849584435,4,.23002501632581554],
 ['格子',[1,3,21,23],79.111849584435,4,.23002501632581554],
 ['四隅',[0,4,20,24],155.23668750268,5,.2451171906601272]
].map(([name,seeds,returnPercent,sugarFirst,sugarChance])=>Object.freeze({name,seeds:Object.freeze(seeds),returnPercent,sugarFirst,sugarChance})));
export const RECIPES=Object.freeze(Array.from({length:15},(_,n)=>['blue','red','yellow','green'].filter((_,i)=>(n+1)&(1<<i)).join('+')));
export function independentHundredths(lines,odds=1,version=232){return ((version>=232?CURRENT_AWARDS:LEGACY_AWARDS)[lines]??0)*odds;}
export function independentPayout(lines,odds=1,bet=100,version=232){return Math.floor(bet*independentHundredths(lines,odds,version)/100);}

const weightsCache=new Map();
export function independentWeights(rate){
 rate=Math.min(150,Math.max(50,Number(rate)||90));
 if(weightsCache.has(rate))return weightsCache.get(rate).slice();
 let low=-1,high=1,weights;
 // A separate precision/iteration budget solves the documented mean-return
 // constraint; no production mixture or random selector is called.
 for(let n=0;n<64;n++){
  const exponent=(low+high)/2,raw=ORACLE_MOLDS.map(m=>Math.exp((m.returnPercent-90)*exponent)),sum=raw.reduce((a,b)=>a+b,0);
  weights=raw.map(v=>v/sum);const mean=weights.reduce((v,w,i)=>v+w*ORACLE_MOLDS[i].returnPercent,0);
  if(mean<rate)low=exponent;else high=exponent;
 }
 weightsCache.set(rate,weights);return weights.slice();
}
export function verifyNativeOpening(state,seed,rate,rngAfter){
 const rng=random(seed),target=Math.min(150,Math.max(50,Number(rate)||90)),weights=independentWeights(target);
 const choice=rng();let sum=0,mold=ORACLE_MOLDS.at(-1);
 for(let i=0;i<weights.length;i++){sum+=weights[i];if(choice<sum){mold=ORACLE_MOLDS[i];break;}}
 const transform=Math.floor(rng()*8),seeds=mold.seeds.map(i=>{
  let x=i%5-2,y=Math.floor(i/5)-2;if(transform&1)x=-x;
  for(let n=0;n<Math.floor(transform/2);n++)[x,y]=[-y,x];
  return (y+2)*5+x+2;
 }).sort((a,b)=>a-b),numbers=cellIds.map(i=>i+1);
 for(let i=24;i>0;i--){const j=Math.floor(rng()*(i+1));[numbers[i],numbers[j]]=[numbers[j],numbers[i]];}
 const sugarLines=mold.sugarFirst+Number(rng()>=mold.sugarChance),colors=cellIds.map(i=>seeds.includes(i)?'blue':null);
 assert.deepEqual(serializeJellyState(state),{numbers,seeds,sugarLines,colors,draws:[],open:[],lines:[],oddsMultiplier:1,target,patternName:mold.name,payoutVersion:232});
 assert.deepEqual(rngAfter,rng.snapshot(),'opening consumes only mold, orientation, 24 shuffle and Sugar rolls');
 assert.equal(rngAfter.calls,27);return {mold:mold.name,transform,weights};
}

export function independentComponents(open){
 const parents=cellIds.slice(),find=i=>{while(parents[i]!==i)i=parents[i];return i;};
 for(const name of open){assert(edgeNames.has(name),'only neighboring, nonwrapping partitions exist');const [a,b]=name.split('-').map(Number);parents[find(b)]=find(a);}
 return cellIds.map(find);
}
function distances(open,sources){
 const links=Array.from({length:25},()=>[]);
 for(const name of open){const [a,b]=name.split('-').map(Number);links[a].push(b);links[b].push(a);}
 const distance=Array(25).fill(Infinity),queue=[];
 for(const id of sources){distance[id]=0;queue.push(id);}
 for(let head=0;head<queue.length;head++){const i=queue[head];for(const j of links[i])if(distance[j]===Infinity){distance[j]=distance[i]+1;queue.push(j);}}
 return distance;
}
export function independentStep(before,number,bet=100){
 const index=before.numbers.indexOf(number),ball=before.draws.length+1;
 if(index<0||before.draws.includes(number)||ball>8)return null;
 const opening=ball<=5,open=new Set(before.open),opened=[];
 if(opening)for(const [a,b] of ORACLE_EDGES)if(a===index||b===index){const name=edgeKey(a,b);if(!open.has(name)){open.add(name);opened.push([index,a===index?b:a]);}}
 const sources=opening?cellIds.filter(i=>before.colors[i]):[index],distance=distances(open,sources),start=opening?1:0;
 const waves=[];for(let d=start;d<=24;d++){const layer=cellIds.filter(i=>distance[i]===d);if(layer.length)waves.push(layer);}
 const colors=before.colors.slice(),color=opening?'blue':['red','yellow','green'][ball-6],mixedIds=[],newWetIds=[];
 for(const id of waves.flat()){
  if(!colors[id]){colors[id]=color;newWetIds.push(id);}
  else if(!colors[id].split('+').includes(color)){colors[id]+='+'+color;mixedIds.push(id);}
 }
 const oddsReason=mixedIds.length?'color':null,oddsMultiplier=before.oddsMultiplier+Number(!!oddsReason)*.5;
 const lineIds=ORACLE_LINES.flatMap((line,id)=>line.every(i=>colors[i])?[id]:[]),newLineIds=lineIds.filter(id=>!before.lines.includes(id));
 const payoutVersion=before.payoutVersion??0,totalHundredths=independentHundredths(lineIds.length,oddsMultiplier,payoutVersion);
 const previousTotalHundredths=independentHundredths(before.lines.length,before.oddsMultiplier,payoutVersion);
 const payoutWin=Math.floor(bet*totalHundredths/100),previousTotalWin=Math.floor(bet*previousTotalHundredths/100),waveCounts=waves.map(w=>w.length);
 const oddsRevealAt=opening?500:130,delay=waves.length?oddsRevealAt+(waves.length-1)*92+400:opening?520:470;
 const full12=lineIds.length===12,nativeDuration=Math.max(delay+(newLineIds.length?(full12?1750:lineIds.length>=6?1100:850):170),oddsReason?oddsRevealAt+1600:0);
 return {number,index,ball,color,opening,opened,open:[...open].sort(),colors,waves,waveCounts,lineIds,newLineIds,newLineCount:newLineIds.length,
  totalLines:lineIds.length,previousLines:before.lines.length,full12,wetCells:colors.filter(Boolean).length,previousWetCells:before.colors.filter(Boolean).length,
  newWetCells:newWetIds.length,mixedCells:mixedIds.length,newWetIds,mixedIds,beforeRecipe:before.colors[index],afterRecipe:colors[index],
  previousOdds:before.oddsMultiplier,oddsMultiplier,oddsReason,payoutVersion,totalHundredths,previousTotalHundredths,payoutWin,previousTotalWin,deltaWin:payoutWin-previousTotalWin,
  gain:totalHundredths,award:!!newLineIds.length,role:newLineIds.length?(full12?'all':'bingo'):null,tier:full12?4:totalHundredths>=1000?3:totalHundredths>=300?2:1,
  delay,nativeDuration,oddsRevealAt,sugarLines:before.sugarLines};
}
export function verifyNativeStep(before,after,trace,number,rngBefore,rngAfter,bet=100){
 const expected=independentStep(before,number,bet);assert(expected);assert(trace);
 const next={...plain(before),open:expected.open,colors:expected.colors,draws:[...before.draws,number],lines:expected.lineIds,oddsMultiplier:expected.oddsMultiplier};
 assert.deepEqual(after,next,'complete native state matches independent graph, color and line accounting');
 assert.deepEqual(trace.before,before,'the trace retains the exact preceding state');
 for(const key of ['number','index','ball','color','oddsReason'])assert.equal(trace[key],expected[key],key);
 assert.deepEqual(trace.opened.map(([a,b])=>edgeKey(a,b)).sort(),expected.opened.map(([a,b])=>edgeKey(a,b)).sort());
 assert.deepEqual(trace.wave.map(w=>w.slice().sort((a,b)=>a-b)),expected.waves,'distance layers use only actually open edges');
 assert.deepEqual(trace.newLines,expected.newLineIds);
 assert.deepEqual(rngAfter,rngBefore,'an accepted Jelly number consumes no RNG');
 assert.notEqual(expected.totalLines,11);assert.equal(new Set(trace.wave.flat()).size,trace.wave.flat().length);
 assert(!(expected.oddsReason&&expected.newLineCount),'a legal wet section recolors, a dry section adds coverage; they do not do both');
 const groups=independentComponents(expected.open);
 for(let i=0;i<25;i++)for(let j=0;j<25;j++)if(groups[i]===groups[j])assert.equal(!!after.colors[i],!!after.colors[j],'a connected section is wholly wet or wholly dry');
 assert.equal(expected.wetCells,expected.previousWetCells+expected.newWetCells);
 return expected;
}

export const JELLY_FIXTURES=Object.freeze([
 {id:'all-line',seed:1314,rate:90,bet:300000,draws:[15,7,12,17,19,13,4,3],focusTurns:[4,5,6,7,8]},
 {id:'ten-line-odds',seed:1314,rate:90,bet:300000,draws:[15,7,12,17,19,13,4,21],focusTurns:[7,8]},
 {id:'low-bet',seed:1,rate:90,bet:5,draws:[1,2,3,4,5,6,7,8],focusTurns:[3,5,6,7,8]},
 {id:'four-color-odds',seed:5,rate:90,bet:3000,draws:[1,2,3,4,5,6,7,8],focusTurns:[2,5,6,7,8]},
 {id:'multi-line',seed:3,rate:90,bet:3000,draws:[1,2,3,4,5,6,7,8],focusTurns:[3,5,6,7,8]}
].map(spec=>Object.freeze({...spec,draws:Object.freeze(spec.draws),focusTurns:Object.freeze(spec.focusTurns)})));
export function replayJellyFixture(fixture,{bet,legacyCheckpoint=false,payoutVersion}={}){
 const spec=typeof fixture==='string'?JELLY_FIXTURES.find(f=>f.id===fixture):fixture;assert(spec,'known reachable Jelly fixture');bet??=spec.bet;
 const K=loadJelly(nativeCore(),{forbidAmbientRandom:true}),rng=random(spec.seed);let state=K.create({rate:spec.rate,rng});
 const rngInitial=rng.snapshot(),opening=verifyNativeOpening(state,spec.seed,spec.rate,rngInitial);
 // Only explicit compatibility tests model an older saved paytable field.
 if(legacyCheckpoint)delete state.payoutVersion;else if(payoutVersion!==undefined)state.payoutVersion=payoutVersion;
 const initial=serializeJellyState(state),steps=[];
 assert(spec.draws.length<=8&&new Set(spec.draws).size===spec.draws.length);
 for(const number of spec.draws){
  const before=serializeJellyState(state),rngBefore=rng.snapshot(),openOrder=[...state.open],prediction=K.preview(state,number);
  assert.deepEqual(serializeJellyState(state),before);assert.deepEqual([...state.open],openOrder);assert.deepEqual(rng.snapshot(),rngBefore);
  const next=K.draw(state,number);assert(next);const after=serializeJellyState(next.state),trace=serializeJellyTrace(next.trace),rngAfter=rng.snapshot();
  assert.deepEqual(serializeJellyState(state),before,'native draw does not mutate any previous animation/checkpoint data');assert.deepEqual([...state.open],openOrder);
  const oracle=verifyNativeStep(before,after,trace,number,rngBefore,rngAfter,bet);
  assert.equal(prediction.lines,oracle.totalLines);assert.equal(prediction.oddsReason,oracle.oddsReason);assert.equal(prediction.oddsMultiplier,oracle.oddsMultiplier);assert.equal(prediction.totalHundredths,oracle.totalHundredths);
  assert.equal(K.previewLines(state,number),oracle.totalLines);assert.deepEqual(rng.snapshot(),rngBefore);
  steps.push({number,ball:oracle.ball,before,after,trace,rngBefore,rngAfter,oracle});state=next.state;
 }
 return {...plain(spec),bet,legacyCheckpoint,initial,opening,steps,rngInitial,rngFinal:rng.snapshot(),coreSha256:sha256(nativeCore()),hostSha256:sha256(nativeHost())};
}
export const buildJellyFixtures=options=>JELLY_FIXTURES.map(spec=>replayJellyFixture(spec,options));
export function fixtureSummary(fixture){return {id:fixture.id,seed:fixture.seed,rate:fixture.rate,bet:fixture.bet,draws:fixture.draws,focusTurns:fixture.focusTurns,
 rngInitial:fixture.rngInitial,rngFinal:fixture.rngFinal,steps:fixture.steps.map(({number,ball,oracle:o})=>({number,ball,totalLines:o.totalLines,newLineIds:o.newLineIds,
  wetCells:o.wetCells,oddsMultiplier:o.oddsMultiplier,oddsReason:o.oddsReason,totalHundredths:o.totalHundredths,payoutWin:o.payoutWin,previousTotalWin:o.previousTotalWin,deltaWin:o.deltaWin,
  award:o.award,role:o.role,delay:o.delay,nativeDuration:o.nativeDuration,waveCounts:o.waveCounts}))};}

/** Exhaustive independent geometry proof, not a simulation or edited state.
 * Rotation/reflection preserve these component counts. */
export function enumerateOpeningBounds(){
 const minima=ORACLE_MOLDS.map(m=>({name:m.name,seeds:[...m.seeds],minDry:25,witness:null}));let combinations=0;
 for(let a=0;a<21;a++)for(let b=a+1;b<22;b++)for(let c=b+1;c<23;c++)for(let d=c+1;d<24;d++)for(let e=d+1;e<25;e++){
  const hits=[a,b,c,d,e],parents=cellIds.slice(),find=i=>{while(parents[i]!==i)i=parents[i];return i;};
  for(const [i,j] of ORACLE_EDGES)if(hits.includes(i)||hits.includes(j))parents[find(j)]=find(i);
  const components=new Map();for(const id of cellIds){const root=find(id);if(!components.has(root))components.set(root,[]);components.get(root).push(id);}
  for(const item of minima){const wet=new Set(item.seeds.map(find)),dry=[...components].filter(([root])=>!wet.has(root)).map(([,ids])=>ids);
   if(dry.length<item.minDry){item.minDry=dry.length;item.witness={openingCells:hits,wetCells:25-dry.flat().length,dry};}
  }
  combinations++;
 }
 return {combinations,minima};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 assert.equal(sha256(nativeCore()),BASELINE_CORE_SHA256);assert.equal(sha256(nativeHost()),BASELINE_HOST_SHA256);
 console.log(JSON.stringify({coreSha256:BASELINE_CORE_SHA256,hostSha256:BASELINE_HOST_SHA256,fixtures:buildJellyFixtures().map(fixtureSummary)},null,2));
}

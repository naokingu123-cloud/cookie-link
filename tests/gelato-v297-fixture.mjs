/* Native Gelato witnesses. The source region is the actual shipped engine;
 * only CPU fixture waits are omitted. Browser consumers restore a reached
 * checkpoint and let the real manual draw, engine and clocks produce awards. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';

const root=new URL('../',import.meta.url);
const read=file=>fs.readFileSync(new URL(file,root),'utf8');
export const BASELINE_CORE_SHA256='56264afb1ae0b48c50e2eb6b917347d44ae753162a874c1916b807b85927331d';
export const random=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
export const sha256=value=>createHash('sha256').update(value).digest('hex');
export const encode=value=>JSON.parse(JSON.stringify(value,(_key,v)=>v instanceof Set?{$set:[...v]}:v instanceof Map?{$map:[...v]}:v));
export const decode=value=>JSON.parse(JSON.stringify(value),(_key,v)=>v&&Array.isArray(v.$set)?new Set(v.$set):v&&Array.isArray(v.$map)?new Map(v.$map):v);
export function nativeCore(source=read('assets/gelato-prism-v28.js')){
 const start=source.indexOf(' const H=106,'),end=source.indexOf(' const path=nodes=>',start);
 assert(start>=0&&end>start,'actual Gelato native source boundaries exist');
 return source.slice(start,end);
}
export function loadGelato({source,target=90}={}){
 const core=source===undefined?nativeCore():source.includes(' const path=nodes=>')?nativeCore(source):source;
 return new Function('wonderTier','debugPayoutTarget',core+';return {GelatoEngine,P,RAW,LINES,EDGES,FACES,PATTERNS,RATE_PATTERNS,FACE_TRANSFORMS,COUNT_MULT,LEGACY_COUNT_MULT,COLLECTOR_MULT,GRADE_COLORS,GRADE_NAMES,link,fill,evaluatePrize,patternMix};')(()=>1,target);
}
const skipFields=new Set(['version','cycle','phase','running','busy','paused','presentationRate','roundBet','beforeComplete','onEvent','random','sleep','wait']);
export const engineFields=e=>encode(Object.fromEntries(Object.entries(e).filter(([key,value])=>typeof value!=='function'&&!skipFields.has(key))));
export const nativeState=e=>({
 nodeNumbers:e.nodeNumbers.slice(),faceGrades:e.faceGrades.slice(),pattern:encode(e.pattern),patternTransform:e.patternTransform,
 hits:[...e.hits].sort((a,b)=>a-b),links:[...e.links].sort((a,b)=>a-b),filled:[...e.filled].sort((a,b)=>a-b),
 counts:e.collectorCounts.slice(),collectorMult:e.collectorMult,countMult:e.countMult,totalHundredths:e.totalHundredths,
 sugarTarget:e.sugarTarget,sugarAwarded:e.sugarAwarded,allComplete:e.allComplete,accepted:e.accepted,processed:e.processed,
 drawn:[...e.drawn],seen:[...e.seen],queue:encode(e.queue)
});
export async function drawNative(e,number){
 assert(Number.isInteger(number)&&number>=1&&number<=25,'normal 1–25 manual draw');
 assert(e.enqueueBatch([number]),'native engine accepts this unused number');
 for(let spins=0;e.busy||e.queue.length;spins++){
  assert(spins<10000,'native witness drain has a finite microtask budget');
  await Promise.resolve();
 }
 assert.notEqual(e.phase,'error');
}
export async function buildWitnesses(){
 const started=Date.now(),q=loadGelato(),sourceSha256=sha256(nativeCore()),witnesses={};
 let drawsTried=0;
 const plans=[
  {seed:2977919,nodeIds:[0,1,2,17],wanted:['panel']},
  {seed:2977919,nodeIds:[0,1,5,13,17,18],wanted:['collector','full']},
  {seed:277,nodeIds:[0,1,5,13,17],wanted:['collectorMultiple']}
 ];
 for(const plan of plans){
  const events=[],e=new q.GelatoEngine(random(plan.seed),(event,engine)=>events.push({
   ...encode(event),filledCount:engine.filled.size,counts:engine.collectorCounts.slice(),totalHundredths:engine.totalHundredths
  }),async()=>{});
  // This override is confined to CPU fixtures. Browser tests never install it.
  e.wait=async(_ms,token)=>token===e.version;e.start();
  const draws=[];
  for(const nodeId of plan.nodeIds){
   assert(Date.now()-started<5000,'fixed native witness search is bounded to five seconds');
   const next=e.nodeNumbers[nodeId],beforeCounts=e.collectorCounts.slice();
   const checkpoint={fields:engineFields(e),state:nativeState(e),draws:draws.slice(),next,
    provenance:{constructorSeed:plan.seed,target:90,nodeIds:plan.nodeIds.slice(0,draws.length+1),policy:'draw actual assigned node numbers in the recorded order'}};
   events.length=0;await drawNative(e,next);drawsTried++;
   assert.equal(e.processed,draws.length+1);
   assert(!events.some(event=>event.phase==='error'));
   const event=events.find(event=>event.phase==='gelatoFill'&&event.gain>0);
   if(event){
    const newlyCompleted=[1,2,3,4].filter(color=>beforeCounts[color]<4&&event.counts[color]===4);
    const mode=event.full&&event.filledCount===24?'full':newlyCompleted.length?'collector':'panel';
    const key=mode==='collector'&&newlyCompleted.length>1?'collectorMultiple':mode;
    if(plan.wanted.includes(key)&&!witnesses[key])witnesses[key]={...checkpoint,proof:{
     ...event,mode,beforeCounts,newlyCompleted,sourceSha256,stateAfter:nativeState(e),
     countMultiplier:e.countMult,collectorMultiplier:e.collectorMult,afterDraws:draws.length+1
    }};
   }
   draws.push(next);
  }
 }
 for(const key of ['panel','collector','collectorMultiple','full'])assert(witnesses[key],'reachable native '+key+' witness exists');
 assert.equal(witnesses.panel.proof.newlyCompleted.length,0);
 assert.equal(witnesses.collector.proof.newlyCompleted.length,1);
 assert(witnesses.collectorMultiple.proof.newlyCompleted.length>1);
 assert.equal(witnesses.full.proof.filledCount,24);
 assert.equal(witnesses.full.proof.totalHundredths,11900);
 return {witnesses,search:{drawsTried,maxDraws:15,elapsedMs:Date.now()-started,policy:'three fixed native constructor-seed/node-order replays; no manufactured fills or payouts'}};
}

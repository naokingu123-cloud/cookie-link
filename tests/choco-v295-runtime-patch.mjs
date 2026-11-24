/* Exercise the actual browser source transformer, including runtime-only
 * scroll/seam behavior that standalone Canyon tests deliberately exclude. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {loadChoco,nativeCore,productionBundle,worldFor,plain} from './choco-v295-fixture.mjs';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const patchSource=read('assets/cookie-upgrade-patches.js'),bundle=read('optimized/app-01.js');
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function transform(source){
 const scope={},warnings=[];
 new Function('window','console',patchSource)(scope,{info(){},warn:message=>warnings.push(message)});
 return {source:scope.CookieUpgradePatch.patch(source),history:scope.CookieUpgradePatch.history,warnings};
}
const transformed=transform(bundle),served=transformed.source;
assert.equal(served,productionBundle(),'fixtures execute the same complete production transform');
new vm.Script(served,{filename:'actual-post-loader-game.js'});
const labels=['defer Canyon scrolling until settlement','block scroll during Canyon gravity and ore processing',
 'commit Canyon scroll only after full cascade and ore award','allow limited stable geological connections across refill seam'];
for(const label of labels)assert.equal(transformed.history.filter(item=>item===label).length,1,label+' applies exactly once');
assert(!transformed.warnings.some(message=>/Canyon|geological/.test(message)),'no Canyon rewrite silently skips');

// Missing or ambiguous members must leave the entire scroll transaction out.
// The untransformed game remains usable instead of acquiring a free variable.
const anchors=['let flights=[],digging=true,','if(digging||!refill||!w.strata[0].every(t=>!t))return null;','digging=false;settle(pendingJoins);'];
for(const [index,anchor]of anchors.entries())for(const ambiguous of [false,true]){
 const changed=ambiguous?bundle+'\n/* '+anchor+' */':bundle.replace(anchor,anchor.replace(index===0?'digging=true':index===1?'digging||':'digging=false',index===0?'digging=Boolean(1)':index===1?'Boolean(digging)||':'digging=Boolean(0)'));
 const result=transform(changed);
 assert(!result.source.includes('scrollDeferred'),'partial transaction never introduces scrollDeferred');
 assert(!result.history.some(label=>labels.slice(0,3).includes(label)),'no deferral member applies alone');
 new vm.Script(result.source,{filename:'changed-anchor-game.js'});
}

// Both initializer generations are supported; adding future counters does not
// make the variable declaration depend on the full historical initializer.
const gate=anchors[1],commit=anchors[2];
for(const suffix of ['clock=0,bonusPending=0,bonusKinds=[];const pendingJoins=[],digEffects=[];',
 'clock=0,bonusPending=0,bonusKinds=[],gravityChain=0;const pendingJoins=[],digEffects=[],bonusPendingDepths=[];']){
 const fragment='function fixture(){let flights=[],digging=true,'+suffix+'function shift(){'+gate+'}'+commit+'}';
 const result=transform(fragment);
 assert(labels.slice(0,3).every(label=>result.history.includes(label)));new vm.Script(result.source);
}

// Golden full-world/full-trace hashes from the actual v294 served bundle,
// after its own CookieUpgradePatch (commit 423787724ff00ab4e06040b205ef08a968b86907).
// The refill-heavy seed differs from the raw-source golden suite on purpose.
const historical=[
 [7,902,'cbca074429e17726c0021c81e5b133c58f823be83cb3d0656c5914e40b56f91a','5ff9731036b079c9621561b06888848bd4b45c67b5e86f25b58e39970915abe1'],
 [7,7919,'0287817aa5279d5624fb328cd24a046c0867cd78ac2d95a6962f7a8836a09d15','e46aefd80137a9ab44a1620ed0b85693f1daff8fa9adb800b07b2e7e51c51552'],
 [7,75319,'41827a664445f5b5af944d63f2a4d6a8798f64377cc8e0242a6e845c3a995be6','0360879e042d8122b564cd6f196de4104718df3ef325e0366232bca468706db1'],
 [8,902,'e825dce9a7a807eecd1191d54acfbc913914209fc97813e0259a351ac4e3f673','08114b863d0fedc03d5e50db4c2290e5be6ffc951f45b0437f4323be995993b9'],
 [8,7919,'e9a795041e6398fd5343aed63e664b0c0486a0455183be785365107009628e49','d9c75582d3d46d00f1817111d558d59e10f3d31083cbd93bd7b5e28f379483e8'],
 [8,75319,'1bd979f006504ebb1f75b107b19161d49f96fd5fc5d501c8419dbb6596a05394','ce77f6b19277d245a9260a8c196c9367206445a50b95a9e306170b09dae1ae68']
];
const q=loadChoco();
for(const [revision,seed,worldHash,planHash]of historical){
 const e=worldFor(q,seed,revision);assert.equal(hash(e.world()),worldHash);
 assert.equal(hash(e.plan([1,2,3,4,5,6,7,8],{trace:true})),planHash,'served v'+revision+' preserves historical refill RNG and full trace');
}

// Native first-ball and eight-ball completion, including a persisted depth17.
// Only presentation waits are omitted; generated board, RNG and payouts stay native.
let engine;
for(const seed of [7919,902,75319,2957919]){
 const e=worldFor(q,seed,9);Object.assign(e,{depth:17,startDepth:17,nextSugar:35,strata:[]});e.ensureRows();e.assignDrills();
 if([...e.drills.flatMap(d=>d.numbers),...e.lucky.numbers].includes(5)){engine=e;break;}
}
assert(engine,'a native depth17 board assigns ball5');
const checkpoint=plain(engine.world()),events=[],errors=[];
async function play(e,draws){
 e.visualWait=async(_ms,token)=>token===e.version;
 e.onEvent=event=>{events.push(event);if(event.phase==='error')errors.push(event.message);};
 assert(e.enqueueBatch(draws));for(let n=0;n<100000&&(e.busy||e.queue.length);n++)await Promise.resolve();
 assert.deepEqual(errors,[],'actual post-loader native engine completes without a runtime exception');
 assert(!e.busy&&!e.queue.length,'native queue completes within the bounded microtask budget');
}
engine.start();await play(engine,[5]);assert.equal(engine.processed,1);
const remaining=[1,2,3,4,6,7,8],previousWin=engine.totalHundredths,expected=engine.plan(remaining);
await play(engine,remaining);assert.equal(engine.phase,'complete');assert.equal(engine.processed,8);
assert.equal(engine.totalHundredths,previousWin+expected.gain);assert.deepEqual(engine.strata,expected.grid);assert.equal(engine.seed,expected.seed);
assert(engine.validWorld(engine.world()));assert(events.some(event=>event.phase==='canyonScroll'));
for(const [index,event]of events.entries())if(event.phase==='canyonScroll'){
 assert(!events.slice(index+1).some(later=>later.number===event.number&&['canyonFall','canyonMelt','canyonCollect','canyonBonus'].includes(later.phase)),
  'camera scrolling follows the ball\'s complete native settlement');
}

// Explicit sampler source overrides use the unchanged raw base Engine. Verify
// its inherited Canyon methods match the fully transformed default base.
const explicit=loadChoco({source:nativeCore()}),replay=worldFor(explicit,1,9);replay.restoreWorld(checkpoint);replay.start();
await play(replay,[5,...remaining]);assert.deepEqual(replay.world(),engine.world());assert.equal(replay.totalHundredths,engine.totalHundredths);
console.log('CHOCO_V295_RUNTIME_PATCH_PASS',JSON.stringify({sourceSha256:createHash('sha256').update(nativeCore()).digest('hex'),
 canyonPatches:labels.length,atomicAnchorCases:6,legacyServedReplays:historical.length,firstBall:5,startDepth:17,completedBalls:engine.processed,
 finalDepth:engine.depth,totalHundredths:engine.totalHundredths,explicitSourceBaseParity:true}));

/* Exercise the real generic recording and offline-worker restore consumers.
 * Their envelope version255 is independent of Canyon world revisions7–9. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadChoco,worldFor,plain} from './choco-v295-fixture.mjs';

const q=loadChoco(),root={SweetsLineup:{ids:['choco']}},source=fs.readFileSync(new URL('../assets/recorded-round-v255.js',import.meta.url),'utf8');
new Function('window',source)(root);
const recording=root.SweetsRecordedRoundV255,worker=fs.readFileSync(new URL('../assets/server-offline-settlement-worker-v3.js',import.meta.url),'utf8');
const begin=worker.indexOf('function revive(value){'),end=worker.indexOf('async function api(',begin);
assert(begin>=0&&end>begin,'native offline restore boundary exists');
const offlineRestore=new Function(worker.slice(begin,end)+';return restore;')();
const appFor=engine=>({engines:[engine],phase:'playing',bets:[100],locked:[100],enabled:[true],paid:[false],draws:[1,2],roundWins:[0],totalWin:0,credit:1000,displayCredit:1000});
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const item of Object.values(value))freeze(item);Object.freeze(value);}return value;};
async function play(engine,numbers){
 engine.visualWait=async(_ms,token)=>token===engine.version;
 engine.onEvent=event=>{if(event.phase==='error')throw Error(event.message);};
 assert(engine.enqueueBatch(numbers));
 for(let n=0;n<100000&&(engine.busy||engine.queue.length);n++)await Promise.resolve();
 assert(!engine.busy&&!engine.queue.length,'bounded native queue completed');
}
let consumers=0;
for(const revision of [7,8,9]){
 const engine=worldFor(q,revision*29519,revision);engine.start();await play(engine,[1,2]);
 const app=appFor(engine),checkpoint=recording.capture(app),saved=plain(checkpoint),expected=engine.plan([3,4,5,6,7,8],{trace:true}),previousWin=engine.totalHundredths;
 assert.equal(checkpoint.version,255);assert.equal(checkpoint.engines[0].rulesRevision,revision);
 // Changing a live tile after capture cannot rewrite a saved fruit/ore identity.
 const live=engine.strata.flat().find(t=>t?.item==='fruit-prize'||t?.item==='ore');
 if(live){live.value+=100;if(live.fruit)live.fruit='melon';else live.ore='diamond';}
 assert.deepEqual(checkpoint,saved);freeze(checkpoint);
 for(const [name,restore]of [['recorded',(a,s)=>recording.restore(a,s,{notify:false})],['offline',offlineRestore]]){
  const resumed=worldFor(q,1,9),host=appFor(resumed);assert(restore(host,checkpoint));
  assert.equal(resumed.rulesRevision,revision,name+' preserves explicit world revision');assert(resumed.validWorld(resumed.world()));
  assert.deepEqual(resumed.plan([3,4,5,6,7,8],{trace:true}),expected,name+' replays exact native remaining trace');
  await play(resumed,[3,4,5,6,7,8]);assert.equal(resumed.processed,8);assert.equal(resumed.phase,'complete');
  assert.equal(resumed.totalHundredths,previousWin+expected.gain);assert.deepEqual(resumed.strata,expected.grid);assert.equal(resumed.seed,expected.seed);
  assert.deepEqual(checkpoint,saved,'resuming cannot mutate the frozen source checkpoint');consumers++;
 }
}
console.log('CHOCO_V295_RECORDING_PASS',JSON.stringify({consumerReplays:consumers,worldRevisions:[7,8,9],frozenFruitIdentity:true,nativeRemainingBalls:6}));

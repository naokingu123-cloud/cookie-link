import assert from 'node:assert/strict';
import '../assets/recorded-round-v255.js';

const R=globalThis.SweetsRecordedRoundV255;
globalThis.SweetsLineup={ids:['cookie','dango']};
function cabinet(){
 const app={token:41,phase:'playing',credit:900,displayCredit:800,bets:[10,20],locked:[10,20],enabled:[true,true],paid:[false,false],draws:[7],roundWins:[0,0],totalWin:0,wonderBank:[],wonderSteps:0,wonderValue:0,random:Math.random,onChange(){this.changes=(this.changes||0)+1;},engines:[]};
 app.engines=[{version:8,kind:'cookie',drawMode:'batch',processed:0,accepted:0,busy:false,opening:false,queue:[],pendingDraws:new Set([7]),seen:new Set(),drawn:new Set(),map:new Map([[7,{value:2}]]),typed:new Uint16Array([2,700]),nonfinite:-Infinity,random:Math.random,reset(){this.seed=this.random();},start(){return this.random();}},
 {version:12,kind:'dango',drawMode:'single',processed:1,accepted:1,busy:false,queue:[],draws:[7],reset(){this.seed=app.random();},start(){return app.random();},afterCheckpointRestoreV247(){this.restored=(this.restored||0)+1;}}];
 return app;
}
function tape(seed,reverse=false){const app=cabinet(),rng=R.installRecording(app,{seed});for(const e of reverse?[...app.engines].reverse():app.engines){e.reset();e.start();}app.random();const result=rng.export();rng.dispose();return result;}
assert.deepEqual(tape('same-secret'),tape('same-secret',true),'independent game streams must survive cross-game scheduling changes');
assert.notDeepEqual(tape('same-secret'),tape('another-secret'));

const source=cabinet(),record=R.installRecording(source,{seed:'round-001'});
source.engines.forEach(e=>e.reset());source.random();
const initial=R.capture(source,{ballIndex:1});
const expected=[source.engines[0].start(),source.engines[1].start(),source.random()],all=record.export();
record.dispose();
const restored=cabinet();restored.credit=12345;restored.displayCredit=12000;
const replay=R.installReplayTapes(restored,all);
R.restore(restored,JSON.parse(JSON.stringify(initial)));
assert.equal(restored.credit,12345,'a cached board cannot authorize a wallet balance');
assert.equal(restored.displayCredit,12000);
assert.equal(restored.token,41,'native onNumber token remains valid across restore');
assert.equal(restored.engines[0].version,9,'pending old engine work is invalidated');
assert.equal(restored.engines[1].restored,1);
assert.deepEqual(restored.engines[0].pendingDraws,new Set([7]));
assert.deepEqual(restored.engines[0].map,new Map([[7,{value:2}]]));
assert.deepEqual(restored.engines[0].typed,new Uint16Array([2,700]));
assert.equal(restored.engines[0].nonfinite,-Infinity);
assert.deepEqual([restored.engines[0].start(),restored.engines[1].start(),restored.random()],expected,'resume consumes the next recorded values, not the initial values again');
assert.throws(()=>restored.engines[0].start(),/recorded_rng_exhausted/,'never invent replacement game randomness');
assert.throws(()=>replay.seek({cookie:999}),/recorded_rng_offset_invalid/);
replay.dispose();

const batch=cabinet();
assert.equal(R.stable(batch,1),true,'first classic ball may be stable while still pending the three-ball batch');
batch.draws=[7,13];batch.engines[0].pendingDraws.add(13);batch.engines[1].processed=2;
assert.equal(R.stable(batch,2),true);
batch.draws.push(21);batch.engines[1].processed=3;
assert.equal(R.stable(batch,3),false,'the third ball must finish its native batch');
batch.engines[0].processed=3;batch.engines[0].accepted=3;
assert.equal(R.stable(batch,3),true);
batch.draws.push(8);batch.engines[1].processed=4;batch.engines[0].pendingDraws=new Set([8]);
assert.equal(R.stable(batch,4),true,'the fourth ball remains pending the five-ball batch');
batch.engines[0].busy=true;assert.equal(R.stable(batch,4),false);
batch.engines[0].busy=false;batch.engines[1].trace={};assert.equal(R.stable(batch,4),false);
assert.throws(()=>R.restore(batch,{...initial,gameIds:['dango','cookie']}),/lineup_mismatch/);
console.log('recorded-round-v255: deterministic streams, offset resume, stable batches and wallet isolation PASS');

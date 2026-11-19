import assert from 'node:assert/strict';
import {computeRecordingV255} from '../server-download-recording-v255.mjs';
const started = Date.now();
const first = await computeRecordingV255({seed:25519});
const second = await computeRecordingV255({seed:25519});
assert.deepEqual(first, second, 'a restarted job must reproduce the exact motion and numbers');
assert.equal(first.hits.length, 8);assert.equal(new Set(first.hits.map(hit=>hit.number)).size,8);
assert.ok(first.hits.every(hit=>Number.isInteger(hit.number)&&hit.number>=1&&hit.number<=25));
assert.equal(first.physicsHz,120);assert.equal(first.fps,30);
assert.ok(first.frames.length > 300);assert.ok(first.durationMs>10000);
for (let i=1;i<first.frames.length;i++) assert.ok(first.frames[i][0]>first.frames[i-1][0]);
for (const hit of first.hits) {
  const frame=first.frames.find(frame=>frame[0]>=hit.atMs);
  assert.ok(frame?.[2].some(ball=>ball[0]===hit.ball&&ball[8]===1),'recorded physical ball actually reaches its pocket');
}
assert.equal(first.frames.at(-1)[2].filter(ball=>ball[8]).length,8);
await assert.rejects(computeRecordingV255({seed:-1}),/invalid_recording_seed/);
console.log(JSON.stringify({ok:true,ms:Date.now()-started,durationMs:first.durationMs,frames:first.frames.length,hits:first.hits,faults:first.faults,bytes:Buffer.byteLength(JSON.stringify(first))}));

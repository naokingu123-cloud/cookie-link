import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const patchSource=await readFile(new URL('../assets/shared-core-patch-v221.js',import.meta.url),'utf8');
const coreSource=await readFile(new URL('../assets/shared-machine-core-v196.js',import.meta.url),'utf8');
const loaderSource=await readFile(new URL('../assets/shared-machine-v176.js',import.meta.url),'utf8');

const context={window:{},console};
vm.runInNewContext(patchSource,context,{filename:'shared-core-patch-v221.js'});
assert.equal(typeof context.window.SweetsSharedCorePatchV221?.patch,'function');
const patched=context.window.SweetsSharedCorePatchV221.patch(coreSource);
new vm.Script(patched,{filename:'shared-machine-core-v196-v221-patched.js'});

assert.ok(patched.includes("const VERSION='v221'"),'patched core must expose v221');
assert.ok(patched.includes("if(typeof inView!=='undefined')inView=true"),'physical host must remain in view');
assert.ok(patched.includes('hostProgressAt=0'),'physical host must track real ball progress');
assert.ok(patched.includes('idle<15000'),'zero-progress draw must have a watchdog');
assert.ok(patched.includes('無進行を検知・抽選機再起動'),'stalled physical draw must restart');
assert.ok(patched.includes("hostRetryTimer=setTimeout(()=>syncHost(client.round),500)"),'watchdog must continuously re-check the host draw');
assert.ok(patched.includes("client.getState();client.accept(state)"),'each physical result must resynchronise the authoritative index');
assert.ok(patched.includes('物理抽選を再開'),'partial physical rounds must resume');
assert.ok(!patched.includes('SERVER FALLBACKへ移行'),'partial rounds must never change to random fallback');
assert.ok(!patched.includes("round.phase!=='PLAYING'||Number(round.participantCount||0)<1"),'empty server-clock rounds must still start the physical machine');
assert.ok(loaderSource.includes('shared-core-patch-v221.js?v=221'),'runtime loader must select v221');
assert.ok(loaderSource.includes('shared-machine-core-v196-v221-patched.js'),'runtime source label must identify v221');

console.log('v221 physical host start/progress/resume watchdog patch applied and parsed successfully');

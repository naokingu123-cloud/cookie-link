import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const patchSource=await readFile(new URL('../assets/shared-core-patch-v221.js',import.meta.url),'utf8');
const reconnectPatch=await readFile(new URL('../assets/shared-core-patch-v222.js',import.meta.url),'utf8');
const coreSource=await readFile(new URL('../assets/shared-machine-core-v196.js',import.meta.url),'utf8');
const loaderSource=await readFile(new URL('../assets/shared-machine-v176.js',import.meta.url),'utf8');

const context={window:{},console};
vm.runInNewContext(patchSource,context,{filename:'shared-core-patch-v221.js'});
vm.runInNewContext(reconnectPatch,context,{filename:'shared-core-patch-v222.js'});
assert.equal(typeof context.window.SweetsSharedCorePatchV221?.patch,'function');
assert.equal(typeof context.window.SweetsSharedCorePatchV222?.patch,'function');
const hostPatched=context.window.SweetsSharedCorePatchV221.patch(coreSource);
const runtimePatched=context.window.SweetsSharedCorePatchV222.patch(coreSource);
new vm.Script(runtimePatched,{filename:'shared-machine-core-v196-v223-patched.js'});

assert.ok(hostPatched.includes("if(typeof inView!=='undefined')inView=true"),'physical host must remain in view');
assert.ok(hostPatched.includes('hostProgressAt=0'),'physical host must track real ball progress');
assert.ok(hostPatched.includes('idle<15000'),'zero-progress draw must have a watchdog');
assert.ok(hostPatched.includes('無進行を検知・抽選機再起動'),'stalled physical draw must restart');
assert.ok(hostPatched.includes("hostRetryTimer=setTimeout(()=>syncHost(client.round),500)"),'watchdog must continuously re-check the host draw');
assert.ok(hostPatched.includes("client.getState();client.accept(state)"),'each physical result must resynchronise the authoritative index');
assert.ok(hostPatched.includes('物理抽選を再開'),'partial physical rounds must resume');
assert.ok(!hostPatched.includes('SERVER FALLBACKへ移行'),'partial rounds must never change to random fallback');
assert.ok(!hostPatched.includes("round.phase!=='PLAYING'||Number(round.participantCount||0)<1"),'empty server-clock rounds must still start the physical machine');
assert.ok(runtimePatched.includes("const VERSION='v222'"),'v223 delivery must retain the v222 patched runtime');
assert.ok(loaderSource.includes('shared-core-patch-v221.js?v=223'),'v223 loader must retain the physical host watchdog base');
assert.ok(loaderSource.includes('shared-core-patch-v222.js?v=223'),'v223 loader must add reconnect catch-up');
assert.ok(loaderSource.includes('shared-machine-core-v196-v223-patched.js'),'runtime source label must identify v223 delivery');

console.log('v221 physical host start/progress/resume watchdog retained by v223 delivery');

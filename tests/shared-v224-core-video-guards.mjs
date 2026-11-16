import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const basePatch=await readFile(new URL('../assets/shared-core-patch-v221.js',import.meta.url),'utf8');
const patch=await readFile(new URL('../assets/shared-core-patch-v224.js',import.meta.url),'utf8');
const core=await readFile(new URL('../assets/shared-machine-core-v196.js',import.meta.url),'utf8');
const loader=await readFile(new URL('../assets/shared-machine-v176.js',import.meta.url),'utf8');
const host=await readFile(new URL('../assets/shared-roulette-webrtc-host-v224.js',import.meta.url),'utf8');
const client=await readFile(new URL('../assets/shared-roulette-client-v224.js',import.meta.url),'utf8');

const context={window:{},console};
vm.runInNewContext(basePatch,context);
vm.runInNewContext(patch,context);
const patched=context.window.SweetsSharedCorePatchV224.patch(core);
new vm.Script(patched,{filename:'shared-machine-core-v196-v224-patched.js'});
assert.ok(patched.includes('One owner only: SharedClientControllerV224 reserves authoritative BETs'));
assert.ok(patched.includes('One owner only: SharedClientControllerV224 starts a round'));
assert.ok(patched.includes('never replays or resumes an interrupted round'));
assert.ok(patched.includes("if(message.type==='visual_frame'){hideRouletteMirror();return;}"));
assert.ok(!patched.includes("showRouletteMirror(message.image)"),'legacy JPEG first-HIT still image must be disabled');
assert.ok(loader.includes('shared-core-patch-v224.js?v=227'));
assert.ok(loader.includes('shared-client-controller-v224.js?v=227'));
assert.ok(loader.includes('shared-roulette-webrtc-host-v224.js?v=227'));
assert.ok(loader.includes('shared-roulette-client-v224.js?v=227'));
assert.ok(!loader.includes('shared-core-patch-v222.js'));
assert.ok(!loader.includes('shared-client-controller-v222.js'));
assert.ok(!loader.includes('shared-roulette-client-hold-v222.js'));
assert.ok(host.indexOf("document.querySelector('#cookie-roulette .a8-stage>canvas')")<host.indexOf('rouletteDriver?.mirrorCanvas'),'visible live canvas must be preferred over one-frame mirrorCanvas');
assert.ok(host.includes('track?.requestFrame?.()'),'host must pump canvas capture frames');
assert.ok(host.includes("next!==canvas||track?.readyState!=='live'"),'host must rebuild a replaced or ended capture source');
assert.ok(client.includes('.shared-roulette-hold-v222,.shared-roulette-mirror'),'legacy static overlays must be removed');
assert.ok(client.includes('function isFresh()'),'video freshness must remain observable independently of BET readiness');
assert.ok(client.includes('round boundaries never rebuild the video'),'P2P/relay stream must persist across round boundaries');
assert.ok(!client.includes("'ball_result'"),'ball events must not renegotiate video');
console.log('v224 single lifecycle owner + live-canvas video continuity guards passed');


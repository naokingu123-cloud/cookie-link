import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const shared=await readFile(new URL('../assets/shared-machine-v176.js',import.meta.url),'utf8');
const app=await readFile(new URL('../optimized/app-01.js',import.meta.url),'utf8');

// Server-delivered balls must stay queued until Arcade.acceptNumber accepts them.
assert.match(shared,/current\.callbacks\.onNumber\?\.\(item\.number\\)!==false/);
assert.match(shared,/if\(!current\|\|current\.stopped\|\|!accepted\)break;/);
const deletePos=shared.indexOf('current.queue.delete(item.index)');
const acceptedPos=shared.indexOf("if(!current||current.stopped||!accepted)break;");
assert.ok(deletePos>acceptedPos,'shared queue must delete a ball only after acceptance');
assert.match(shared,/!app\.paused&&!app\.drawHeld&&Number\(app\.draws\?\.length\|\|0\)===current\.delivered/);

// Server-host rendering must retain the WebGL frame for mirroring and expose the exact renderer canvas.
assert.match(app,/preserveDrawingBuffer:serverHostRender/);
assert.match(app,/get mirrorCanvas\(\)\{return renderer\.domElement;\}/);
assert.match(shared,/rouletteDriver\?\.mirrorCanvas\|\|document\.querySelector\('#cookie-roulette canvas'\)/);

console.log('shared late-ball delivery + roulette mirror guards passed');

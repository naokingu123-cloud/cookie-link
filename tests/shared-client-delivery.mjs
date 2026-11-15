import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const shared=await readFile(new URL('../assets/shared-machine-v176.js',import.meta.url),'utf8');
const app=await readFile(new URL('../optimized/app-01.js',import.meta.url),'utf8');

assert.ok(shared.includes("current.callbacks.onNumber?.(item.number)!==false"),'shared delivery must observe Arcade.acceptNumber result');
assert.ok(shared.includes("if(!current||current.stopped||!accepted)break;"),'shared delivery must retain a rejected ball');
const deletePos=shared.indexOf("current.queue.delete(item.index)");
const acceptedPos=shared.indexOf("if(!current||current.stopped||!accepted)break;");
assert.ok(deletePos>acceptedPos,'shared queue must delete a ball only after acceptance');
assert.ok(shared.includes("!app.paused&&!app.drawHeld&&Number(app.draws?.length||0)===current.delivered"),'shared delivery must wait through draw holds');

assert.ok(app.includes("preserveDrawingBuffer:serverHostRender"),'server host WebGL frame must remain readable for mirroring');
assert.ok(app.includes("get mirrorCanvas(){return renderer.domElement;}"),'roulette must expose its actual WebGL canvas');
assert.ok(shared.includes("rouletteDriver?.mirrorCanvas||document.querySelector('#cookie-roulette canvas')"),'mirror capture must prefer the real roulette WebGL canvas');

console.log('shared late-ball delivery + roulette mirror guards passed');

import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const source=await readFile(new URL('../optimized/app-01.js',import.meta.url),'utf8');

assert.match(source,/const LOCAL_EIGHT_DRAW_ALLOWED=new URLSearchParams\(location\.search\)\.get\('serverHost'\)==='1'/);
assert.match(source,/if\(this\.mode==='eight'&&!localEightAllowed\)\{this\.setState\('external'\);return false;\}/);
assert.match(source,/if\(this\.mode==='eight'&&!localEightAllowed\)return null;/);
assert.match(source,/if\(this\.mode==='eight'&&!localEightAllowed\)\{if\(this\.state!=='ready'&&this\.state!=='external'\)this\.setState\('external'\);return;\}/);
assert.match(source,/if\(!LOCAL_EIGHT_DRAW_ALLOWED\)\{rouletteDriver\.setPaused\(true\);return false;\}/);
assert.match(source,/number\(n\)\{if\(LOCAL_EIGHT_DRAW_ALLOWED&&!manualNumbers\)this\.callbacks\?\.onNumber\(n\);\}/);
assert.match(source,/start:\(\)=>\{if\(draw\.mode==='eight'&&!localEightAllowed\)\{setPaused\(true\);draw\.setState\('external'\);return false;\}/);

const physicsLaunches=[...source.matchAll(/physics\.launch\(/g)].length;
assert.equal(physicsLaunches,1,'all physics launches must remain behind DrawController.launch()');

console.log('client local eight-ball hard guard test passed');

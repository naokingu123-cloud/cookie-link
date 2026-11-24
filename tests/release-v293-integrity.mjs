/* Offline-release gate: verify the bytes that the installer will receive,
 * including the Cookie Link artwork, against one coherent build identity. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';

const version=JSON.parse(await fs.readFile('app-version.json','utf8')).version;
const manifest=JSON.parse(await fs.readFile('assets/download-assets-v255.json','utf8'));
assert.equal(manifest.version,version,'offline inventory matches the app build');
for(const [file,constant] of [
 ['assets/download-cache-v255.js','VERSION'],
 ['assets/edition-choice-v255.js','BUILD_VERSION'],
 ['download-sw-v255.js','VERSION']
]){
 const source=await fs.readFile(file,'utf8');
 const value=source.match(new RegExp('\\b'+constant+"='([^']+)'"))?.[1];
 assert.equal(value,version,file+' selects the current build');
}

const entries=new Map();let total=0;
for(const file of manifest.files){
 assert(!entries.has(file.path),'duplicate offline entry: '+file.path);
 assert(/^(?:[a-zA-Z0-9._-]+\/)*[a-zA-Z0-9._-]+$/.test(file.path),'safe inventory path');
 const data=await fs.readFile(file.path);
 assert.equal(data.length,file.bytes,file.path+' byte length');
 assert.equal(createHash('sha256').update(data).digest('hex'),file.sha256,file.path+' SHA-256');
 total+=data.length;entries.set(file.path,file);
}
assert.equal(total,manifest.totalBytes,'reported download size is the sum of actual files');

const cookieRuntime=[
 'assets/cookie-board-v293.js','assets/cookie-board-v293.css',
 'assets/cookie-payout-v293.js','assets/cookie-payout-v293.css',
 'assets/cookie-award-v293.js'
];
for(const file of cookieRuntime)assert(entries.has(file),file+' is available offline');
const art=await fs.readdir('assets/cookie-art-v293',{withFileTypes:true});
const bitmaps=art.filter(file=>file.isFile()&&/\.(?:png|webp|avif)$/.test(file.name));
assert(bitmaps.length>=3,'Cookie Link ships dedicated board, payout and award artwork');
for(const file of bitmaps)assert(entries.has('assets/cookie-art-v293/'+file.name),file.name+' is available offline');

console.log('V293_RELEASE_INTEGRITY_PASS',JSON.stringify({version,files:entries.size,totalBytes:total,cookieBitmaps:bitmaps.length}));

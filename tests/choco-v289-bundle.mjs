/* Keep the historical workflow entry point, but verify the current native
 * Canyon block and its explicit legacy revisions rather than stale text. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {loadChoco,worldFor,empty,cake} from './choco-v295-fixture.mjs';

const root=new URL('../',import.meta.url),[bundled,individual,html]=await Promise.all(['optimized/app-01.js','assets/choco-dig.js','index.html'].map(path=>fs.readFile(new URL(path,root),'utf8')));
const marker='const CHOCO_SAVE_KEY=',start=bundled.indexOf(marker),end=bundled.indexOf('/* Six Candy rules v4.',start);
assert(start>=0&&end>start,'production Canyon block boundaries exist');
assert.equal(bundled.indexOf(marker,start+marker.length),-1,'the runtime contains exactly one Canyon implementation');
const production=bundled.slice(start,end).trim(),standalone=individual.slice(individual.indexOf(marker)).trim();
const media=['chocoCakeSources','chocoOreSources','chocoMineSources'];
function normalize(source){
 for(const name of media){
  // Match a complete line: data-URL MIME separators are not JS terminators.
  const pattern=new RegExp('^const '+name+'=.*;$','gm'),matches=[...source.matchAll(pattern)];
  assert.equal(matches.length,1,name+' has one isolated source declaration');
  source=source.replace(pattern,'const '+name+'="<externalized-media>";');
 }
 return source;
}
const sha=source=>createHash('sha256').update(source).digest('hex'),normalized=normalize(standalone);
assert.equal(sha(normalize(production)),sha(normalized),'native core and renderer must mirror standalone source; only the three media declarations may differ');
assert.equal(production.split('const chocoSprites=')[0].trim(),standalone.split('const chocoSprites=')[0].trim(),'economy, physics and replay rules are exactly the production code');
new vm.Script(bundled,{filename:'optimized/app-01.js'});new vm.Script(individual,{filename:'assets/choco-dig.js'});

// Externalized legacy art remains real local media, not a dropped fallback.
let mediaFiles=0;
for(const name of media){
 const declaration=production.match(new RegExp('^const '+name+'=.*;$','m'))?.[0];
 const values=new Function(declaration+';return '+name+';')();
 for(const path of Object.values(values)){
  assert(typeof path==='string'&&!path.startsWith('data:'),name+' is externalized in the browser bundle');
  assert((await fs.stat(new URL(path,root))).size>0,'existing production media exists: '+path);mediaFiles++;
 }
}

const q=loadChoco({source:production.split('const chocoSprites=')[0]}),current=worldFor(q,902,9);
assert.equal(q.CHOCO_WORLD_REVISION,9);assert.equal(current.world().version,9);assert(current.validWorld(current.world()));
assert.deepEqual(Object.keys(q.CHOCO_FRUITS),['apple','mandarin','lemon','blueberry','grape','melon']);
const treasures=current.strata.flat().filter(t=>t?.item==='fruit-prize');assert(treasures.length>0);
assert(treasures.every(t=>q.CHOCO_FRUITS[t.fruit]&&t.ore===undefined&&t.encased),'production worlds contain native six-tier encased fruit');
for(const revision of [7,8]){
 const old=worldFor(q,902,revision),world=old.world();assert(old.validWorld(world));
 current.restoreWorld(world);assert.equal(current.rulesRevision,revision);assert.deepEqual(current.world(),world);
 assert(old.strata.flat().some(t=>t?.item===(revision===8?'fruit-prize':'ore')&&q.CHOCO_ORES[t.ore]),'historical reward schema remains replayable');
}
const grid=empty();for(let c=0;c<3;c++)grid[2][c]=cake(c+1,0,'original');
assert.equal(q.chocoExcavate(grid,[],{rulesRevision:8,refill:false}).removed.length,3,'explicit v8 keeps its small-section melt');
assert.equal(q.chocoExcavate(grid,[],{rulesRevision:9,refill:false}).removed.length,0,'new v9 keeps fallen groups below four');
assert.match(production,/const chainSections=e.rulesRevision>=CHOCO_FRUIT_REVISION\?new Set\(\):chocoChainSections/);
assert.match(production,/const chocoGanache=new Image\(\)/,'existing painted background retained');
assert.match(production,/ChocoArtV295/,'new native art adapter is integrated');
const pin=html.match(/optimized\/app-01\.js\?v=(\d+)/);assert(pin&&Number(pin[1])>=295,'changed browser bundle has a fresh cache pin');
assert.match(html,/assets\/choco-art-v295\.js\?v=295/);assert.match(html,/assets\/choco-award-v295\.js\?v=295/);
assert.match(html,/sixdrop-progressive-core-v247\.js\?v=285/,'unchanged Six Drop core retains its existing pin');
console.log('CHOCO_V289_BUNDLE_PASS',JSON.stringify({currentRevision:9,legacyRevisions:[7,8],fruitTiers:6,normalizedSha256:sha(normalized),externalizedMedia:mediaFiles,bundleBytes:Buffer.byteLength(bundled),standaloneBytes:Buffer.byteLength(individual)}));

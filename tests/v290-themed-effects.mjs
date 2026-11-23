/* v290 themed visuals: contract tests for identity, cache integrity, bounds.
 * No game result, bet, RNG or physical draw is computed here. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
const read=path=>fs.readFile(path,'utf8');
const [award,hit,dango,css,manifestText,versionText,html,serviceWorker,artLoader,artCss]=await Promise.all([
 read('assets/award-presentation-v277.js'),
 read('assets/hit-presentation-v276.js'),
 read('assets/dango-bingo-view.js'),
 read('assets/award-presentation-v277.css'),
 read('assets/download-assets-v255.json'),
 read('app-version.json'),read('index.html'),read('download-sw-v255.js'),read('assets/sweets-art-v291.js'),read('assets/sweets-art-v291.css')
]);
const names=['cookie','choco','candy','gelato','winery','popcorn','jelly','stick','castella','dango'];
const config=award.match(/const BADGE_THEMES=Object.freeze\(([\s\S]*?)\);/);
assert(config,'theme silhouettes belong to the real award renderer');
const sandbox={};vm.runInNewContext('globalThis.cfg='+config[1],sandbox);
const themes=sandbox.cfg;
assert.deepEqual(Object.keys(themes),names);
assert.equal(new Set(Object.values(themes).map(t=>t.shape)).size,10,'all ten badges have unique silhouettes');
assert.deepEqual(names.filter(id=>!themes[id].frame),['winery','dango'],'two awards have no enclosing plaque');
for(const game of names)assert.match(award,new RegExp(game+':\\{edge:'),'every game owns custom colour');
assert(award.includes('function paintGameBadge('));
assert(award.includes('award-spritesheet.png?v=291'),'real award PNG sheet is the popup art');
assert(award.includes('c.detail'),'dynamic line/role detail stays live');
assert(artLoader.includes('tile-paytable-spritesheet.png?v=291'),'real tile and paytable PNG sheet is loaded');
assert(artCss.includes('--v291-pay-dango'),'dynamic dango paytable frame is installed');
assert(award.includes('onPath(traced.segments,traced.total,fraction)'),'line highlight follows actual awarded path');
assert.match(hit,/IDLE_FRAME_MS=108/);
assert.match(hit,/record.slot.i===active/,'idle only selected board');
assert.match(hit,/if\(ambient\)paintIdle/);
assert.match(hit,/idleCells:2/);
assert.match(hit,/if\(!mini&&level>=2&&!still\)/);
assert.match(dango,/Math.round\(252-12\*shade\)/);
assert.match(dango,/Math.round\(255-7\*shade\)/);
assert.match(dango,/Math.round\(255-1\*shade\)/);
for(const shade of [0,.3,.6,1]){
 const r=Math.round(252-12*shade),g=Math.round(255-7*shade),b=Math.round(255-shade);
 assert(r>=240&&g>=248&&b>=254,'plus FREE is nearly-white');
 assert(b-r>=3&&b-r<=15,'plus FREE retains faint icy-blue hue');
}
for(const motif of ['.link-pay-row','.canyon-fleet-card','.sd278-payout-card','.gp-collector-panel','.wp-sidebar','.bs-pay','.pct-pay','.dgb-pay'])assert(css.includes(motif),motif+' stays shaped');
const version=JSON.parse(versionText).version,manifest=JSON.parse(manifestText);
assert.equal(version,'20261123-v291-image-based-awards');
assert.equal(manifest.version,version);
const listed=new Map(manifest.files.map(x=>[x.path,x]));
for(const file of ['index.html','app-version.json','assets/dango-bingo-view.js','assets/hit-presentation-v276.js','assets/award-presentation-v277.js','assets/award-presentation-v277.css','assets/download-cache-v255.js','assets/edition-choice-v255.js','assets/sweets-v291/award-spritesheet.png','assets/sweets-v291/tile-paytable-spritesheet.png','assets/sweets-art-v291.js','assets/sweets-art-v291.css']){
 const bytes=await fs.readFile(file),record=listed.get(file);
 assert(record,file+' in download manifest');
 assert.equal(bytes.length,record.bytes,file+' size pinned');
 assert.equal(createHash('sha256').update(bytes).digest('hex'),record.sha256,file+' hash pinned');
}
assert(html.includes('assets/award-presentation-v277.js?v=291'));
assert(html.includes('assets/hit-presentation-v276.js?v=291'));
assert(html.includes('assets/dango-bingo-view.js?v=291'));
assert(serviceWorker.includes(version)&&serviceWorker.includes('20261121-v289-canyon-fruit-sixdrop-fixed-palette'));
console.log('V291_IMAGE_BASED_EFFECTS_PASS',JSON.stringify({games:10,silhouettes:10,frameless:['winery','dango'],idleFPS:10,idleCells:2,cacheFiles:listed.size,paytableOrnaments:true,nearWhitePlusFree:true}));

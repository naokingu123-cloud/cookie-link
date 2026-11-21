import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const bundled=await fs.readFile(new URL('../optimized/app-01.js',import.meta.url),'utf8');
const individual=await fs.readFile(new URL('../assets/choco-dig.js',import.meta.url),'utf8');
const html=await fs.readFile(new URL('../index.html',import.meta.url),'utf8');
const checks=[
 'CHOCO_WORLD_REVISION=8',
 'function chocoClassicCakeSprite(color,mask){',
 'function chocoFruitPrizeArt(kind){',
 "item:w.rulesRevision>=CHOCO_WORLD_REVISION?'fruit-prize':'ore'",
 "rulesRevision>=CHOCO_WORLD_REVISION||g.length>=4",
 "const chainSections=e.rulesRevision>=CHOCO_WORLD_REVISION?new Set():chocoChainSections(grid);",
 "function chocoOreTable(x,L,W,bet,time,revision=7){"
];
for(const code of checks)for(const [name,content]of [['optimized runtime',bundled],['standalone source',individual]])
 assert.ok(content.includes(code),name+' missing production rule: '+code);
assert.match(bundled,/const chocoGanache=new Image\(\)/,'existing optimized painted background retained');
assert.match(bundled,/assets\/sweet-skins\/canyon-/,'original cake source URLs preserved');
assert.match(html,/optimized\/app-01\.js\?v=289/,'actual browser cache pin replaced');
assert.match(html,/sixdrop-progressive-core-v247\.js\?v=285/,'current new Six Drop core loaded');
new vm.Script(bundled,{filename:'optimized/app-01.js'});
console.log('CHOCO_V289_BUNDLE_PASS',JSON.stringify({checks:checks.length,bundleBytes:Buffer.byteLength(bundled),standaloneBytes:Buffer.byteLength(individual),classicTextures:true,savedV7:true,fruitV8:true}));

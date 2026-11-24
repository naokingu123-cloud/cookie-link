/* Keep the served Canyon engine/renderer identical to its standalone source.
 * Only the three historical inline image declarations are externalized. */
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const sourcePath=new URL('../assets/choco-dig.js',import.meta.url);
const bundlePath=new URL('../optimized/app-01.js',import.meta.url);
const start='const CHOCO_SAVE_KEY=',end='/* Six Candy rules v4.';
const source=await fs.readFile(sourcePath,'utf8');
const bundle=await fs.readFile(bundlePath,'utf8');
const replacements={
 chocoCakeSources:"const chocoCakeSources=['canyon-milk','canyon-berry','canyon-ivory','canyon-dark'].map(name=>'assets/sweet-skins/'+name+'.webp');",
 chocoOreSources:'const chocoOreSources={"copper":"optimized/media/82e7965c3fa4648b.webp","silver":"optimized/media/46a45cf2e915077c.webp","gold":"optimized/media/6e829c60f267d0f6.webp","diamond":"optimized/media/69b8afc83cbbd6bc.webp"};',
 chocoMineSources:'const chocoMineSources={"mine":"optimized/media/fbcd2f7c5115795e.webp","cart":"optimized/media/d923367f03c3232d.webp","logo":"optimized/media/c05f7a6c993af123.webp"};'
};
assert(source.indexOf(start)>=0,'standalone Canyon starts at its save key');
let compiled=source.slice(source.indexOf(start)).trimEnd()+'\n';
for(const [name,replacement]of Object.entries(replacements)){
 const pattern=new RegExp('^const '+name+'=[^\\n]*;\\r?$','gm');
 assert.equal([...compiled.matchAll(pattern)].length,1,name+' has one complete declaration');
 compiled=compiled.replace(pattern,replacement);
}
const a=bundle.indexOf(start),b=bundle.indexOf(end,a);
assert(a>=0&&b>a,'production Canyon segment has unambiguous boundaries');
assert.equal(bundle.indexOf(start,a+start.length),-1,'production contains one Canyon engine');
if(process.argv.includes('--check')){
 assert.equal(bundle.slice(a,b),compiled,'served Canyon mirrors standalone source and external assets');
 console.log('CHOCO_BUNDLE_SYNC_PASS');
}else{
 await fs.writeFile(bundlePath,bundle.slice(0,a)+compiled+bundle.slice(b));
 console.log('CHOCO_BUNDLE_SYNCED',JSON.stringify({bytes:Buffer.byteLength(compiled)}));
}

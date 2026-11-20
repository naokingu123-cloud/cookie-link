/* Actual generated cake pixels through the production Canvas autotile painter.
 * Run with @napi-rs/canvas@0.1.100 (QA-only dependency, never shipped to players).
 * No game engine, RNG, board number or reward is replaced by this fixture. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url);
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const root=path.resolve(new URL('..',import.meta.url).pathname);
const source=await fs.readFile(path.join(root,'assets/choco-dig.js'),'utf8');
const adapter=await fs.readFile(path.join(root,'assets/illustrated-boards-a-v275.js'),'utf8');
const art=await fs.readFile(path.join(root,'assets/illustrated-art-v275.js'),'utf8');
const begin='function chocoCanonicalMask(',end='function chocoBoardLayout(';
const section=text=>text.slice(text.indexOf(begin),text.indexOf(end));
assert.ok(section(source).length>3000,'real autotile functions are present');
if(!process.argv.includes('--source-only')){
 const runtime=await fs.readFile(path.join(root,'optimized/app-01.js'),'utf8');
 assert.equal(section(runtime),section(source),'the deployed runtime uses the tested painter');
}
const profileMatch=adapter.match(/\.chocoAutotileBodyV276=Object\.freeze\((\{[^}]+\})\)/);
assert.ok(profileMatch,'adapter describes the actual painted sponge');
const profile=vm.runInNewContext('('+profileMatch[1]+')');
const rects=JSON.parse(art.match(/const sourceRects=(\{[^\n]+\});/)[1]);
const atlas=await loadImage(path.join(root,'assets/illustrated-art-v275/biscuits-cakes.png'));
const names=['choco-milk','choco-berry','choco-ivory','choco-dark'];
const imageLike=image=>{if(!('complete'in image))image.complete=true;if(!('naturalWidth'in image))image.naturalWidth=image.width;if(!('naturalHeight'in image))image.naturalHeight=image.height;return image;};
const cakes=names.map(name=>{
 const [x,y,right,bottom]=rects[name],canvas=createCanvas(256,256);
 canvas.getContext('2d').drawImage(atlas,x,y,right-x,bottom-y,0,0,256,256);
 canvas.chocoAutotileBodyV276=Object.freeze({...profile});return imageLike(canvas);
});
const gemNames=['sapphire','emerald','topaz','ruby','amethyst','diamond'];
const gems=await Promise.all(gemNames.map(async name=>{
 const image=await loadImage(path.join(root,'assets/canyon-cakes/'+name+'.webp'));
 return imageLike(image);
}));
const digest=image=>createHash('sha256').update(image.getContext('2d').getImageData(0,0,image.width,image.height).data).digest('hex');
const inputs=cakes.map(digest);
function painter(code){
 const document={createElement:tag=>{assert.equal(tag,'canvas');return createCanvas(1,1);}};
 // Use the real JS realm, like the browser bundle. A vm global proxy makes
 // millions of unchanged pixel reads much slower than the production painter.
 const create=new Function('document','chocoCakeImages','chocoGemCakeImages','CHOCO_BONUS_GEMS','chocoSprites','chocoSourcePixels',section(code)+'\nreturn {canonical:chocoCanonicalMask,mask:chocoTileMask,sprite:chocoAutoSprite,cache:chocoSprites};');
 return create(document,cakes,gems,gemNames,new Map(),new WeakMap());
}
const api=painter(source);
const canonical=[...new Set(Array.from({length:256},(_,mask)=>api.canonical(mask)))];
assert.equal(canonical.length,47,'all eight-neighbour corner combinations remain available');
for(let mask=0;mask<256;mask++){
 const canonical=api.canonical(mask);
 assert.equal(api.canonical(canonical),canonical);
 for(const [diagonal,a,b]of [[16,8,1],[32,2,1],[64,2,4],[128,8,4]])if(canonical&diagonal)assert.ok((canonical&a)&&(canonical&b));
}
const data=new WeakMap();
const pixels=sprite=>{if(!data.has(sprite))data.set(sprite,sprite.getContext('2d').getImageData(0,0,96,96).data);return data.get(sprite);};
const different=(a,b,ia,ib)=>Math.max(...Array.from({length:4},(_,k)=>Math.abs(a[ia+k]-b[ib+k])));
const cell=(color,fruitIndex=1)=>({color,fruitIndex});
const report={version:276,dependency:'@napi-rs/canvas@0.1.100',materials:names,canonicalMasks:canonical.length,verticalPairs:0,horizontalPairs:0,verticalMaxDelta:0,horizontalCakeMaxDelta:0,retainedFruitHorizontalDecorMaxDelta:0,variationChecks:0,cornerChecks:0,legacyGemSprites:0,sourcePixelsUnchanged:false};
// Every possible neighbourhood around a pair of vertically connected cells.
// The diagonal bits include L/T junctions with unequal neighbours on each row.
const surrounding=[[0,0],[0,1],[0,2],[1,0],[1,2],[2,0],[2,2],[3,0],[3,1],[3,2]];
for(let color=0;color<5;color++)for(let pattern=0;pattern<1024;pattern++){
 const grid=Array.from({length:4},()=>Array.from({length:3},()=>cell((color+1)%5)));
 grid[1][1]=cell(color);grid[2][1]=cell(color);
 surrounding.forEach(([row,column],index)=>{if(pattern&(1<<index))grid[row][column]=cell(color);});
 const topMask=api.mask(grid,1,1),bottomMask=api.mask(grid,2,1);
 const upper=pixels(api.sprite(color,topMask,pattern%6)),lower=pixels(api.sprite(color,bottomMask,(pattern*5+3)%6));
 for(let x=4;x<92;x++){
  const delta=different(upper,lower,(95*96+x)*4,x*4);
  report.verticalMaxDelta=Math.max(report.verticalMaxDelta,delta);
  assert.equal(delta,0,'continuous vertical join: material '+color+', neighbourhood '+pattern+', x '+x);
 }
 report.verticalPairs++;
}
// Horizontal runs with all four upper/lower contexts and varied surface grains.
for(let color=0;color<5;color++)for(let vertical=0;vertical<4;vertical++)for(let variant=0;variant<6;variant++){
 const grid=Array.from({length:3},()=>Array.from({length:4},()=>cell((color+1)%5)));
 for(let col=0;col<4;col++){grid[1][col]=cell(color);if(vertical&1)grid[0][col]=cell(color);if(vertical&2)grid[2][col]=cell(color);}
 const left=pixels(api.sprite(color,api.mask(grid,1,1),variant)),right=pixels(api.sprite(color,api.mask(grid,1,2),(variant+3)%6));
 for(let y=4;y<92;y++){
  const delta=different(left,right,(y*96+95)*4,(y*96)*4);
  if(color<4)report.horizontalCakeMaxDelta=Math.max(report.horizontalCakeMaxDelta,delta);
  else report.retainedFruitHorizontalDecorMaxDelta=Math.max(report.retainedFruitHorizontalDecorMaxDelta,delta);
  // Fruit's retained decorative gradient is intentionally asymmetric; the
  // actual cake must remain seamless, and its vertical glaze is checked above.
  if(color<4)assert.equal(delta,0,'continuous horizontal cake join');
 }
 report.horizontalPairs++;
}
for(let color=0;color<4;color++){
 const one=api.sprite(color,5,0),two=api.sprite(color,5,5),a=pixels(one),b=pixels(two);
 assert.strictEqual(api.sprite(color,5,6),one,'surface variants reuse their existing cache');
 assert.ok(a.some((v,i)=>i%4!==3&&v!==b[i]),'interior painted surface variants remain distinct');
 // The shared row keeps real texture across the sponge, not a flat colour band.
 const center=new Set();for(let x=28;x<68;x++)center.add(Array.from(a.subarray(x*4,x*4+3)).join(','));
 assert.ok(center.size>24,'connected body retains painted pores across its width');
 report.variationChecks++;
 const isolated=pixels(api.sprite(color,0)),concave=pixels(api.sprite(color,3)),filled=pixels(api.sprite(color,35));
 assert.equal(isolated[3],0,'isolated outer corner stays rounded');
 assert.equal(concave[(95)*4+3],0,'missing upper-right diagonal cuts an inner corner');
 assert.equal(filled[(95)*4+3],255,'filled diagonal closes the inner corner');
 report.cornerChecks+=3;
}
for(let color=5;color<11;color++)for(const mask of canonical){
 const sprite=api.sprite(color,mask,2);assert.ok(sprite);assert.equal(sprite.width,96);assert.equal(sprite.height,96);
 assert.ok(pixels(sprite)[(48*96+48)*4+3]>0,'legacy gem cake still renders');report.legacyGemSprites++;
}
assert.deepEqual(cakes.map(digest),inputs,'source images are never modified');report.sourcePixelsUnchanged=true;
// A deterministic visual fixture through the exact painter: caps, vertical
// columns, L/T joins, a concave corner, and a connected block for each material.
const output=path.resolve(process.env.CHOCOV276_OUTPUT||path.join(root,'qa-canyon-v276'));
await fs.mkdir(output,{recursive:true});
const patterns=['01000','01011','11111','01110','01010'];
const proof=createCanvas(1400,410),ctx=proof.getContext('2d');
ctx.fillStyle='#142033';ctx.fillRect(0,0,proof.width,proof.height);
ctx.font='bold 24px sans-serif';ctx.fillStyle='#fff3d6';ctx.fillText('v276 · Continuous painted cake strata',24,34);
ctx.font='17px sans-serif';ctx.fillStyle='#bddce8';ctx.fillText('Production painter · vertical columns / T and L joins / concave corners · unchanged generated PNG',24,63);
for(let color=0;color<5;color++){
 const grid=patterns.map(row=>[...row].map(char=>cell(char==='1'?color:-1)));
 const left=24+color*276,top=107,size=50;
 ctx.fillStyle='#fff4d3';ctx.font='bold 17px sans-serif';ctx.fillText([...names,'fruit-glaze'][color],left,95);
 for(let r=0;r<grid.length;r++)for(let c=0;c<grid[r].length;c++)if(grid[r][c].color>=0){
  const sprite=api.sprite(color,api.mask(grid,r,c),(r*7+c)%6);
  ctx.drawImage(sprite,left+c*size,top+r*size,size,size);
 }
}
await fs.writeFile(path.join(output,'vertical-junctions.png'),proof.toBuffer('image/png'));
report.cachedSprites=api.cache.size;
await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
export {painter,report};

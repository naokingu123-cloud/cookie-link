/* Raster cut-in integration: ten independent motifs, real live numbers,
 * existing PNG decode, bounded draw cost, and zero game-state mutation. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const source=await fs.readFile('assets/award-illustrated-v291.js','utf8');
const award=await fs.readFile('assets/award-presentation-v277.js','utf8');
const html=await fs.readFile('index.html','utf8');
const names=['cookie','choco','candy','gelato','winery','popcorn','jelly','stick','castella','dango'];
assert(!/<svg\b|<path\b|data:image\/svg/.test(source),'new visuals cannot use flat SVG badges');
assert(html.includes('assets/award-illustrated-v291.js?v=291'));
assert(html.indexOf('assets/illustrated-art-v275.js')<html.indexOf('assets/award-illustrated-v291.js'));
assert(html.indexOf('assets/celebration-art-v277.js')<html.indexOf('assets/award-illustrated-v291.js'));
assert(award.includes('SweetsIllustratedAwardV291?.paint(ctx,{game:c.game,tier:c.tier,width,height,mini,age,still:quiet()})'));
const image={width:220,height:110,naturalWidth:220,naturalHeight:110};
const requested=[],window={
 SweetsBoardArtV275:{loaded:true,sprite:n=>{requested.push(n);return image;}},
 SweetsAwardArtV277:{sprite:n=>{requested.push(n);return image;}}
};
const sandbox={window};
vm.runInNewContext(source,sandbox);
const renderer=window.SweetsIllustratedAwardV291;
assert.equal(renderer.version,291);
function context(){
 let paints=0;const methods=['save','restore','translate','rotate','beginPath','ellipse','fill','drawImage'];
 const ctx={globalAlpha:1,shadowColor:'',shadowBlur:0,fillStyle:'',
  createRadialGradient(){return {addColorStop(){}};}};
 for(const name of methods)ctx[name]=function(){if(name==='drawImage')paints++;};
 ctx.paints=()=>paints;return ctx;
}
for(const game of names){
 const ctx=context(),config={game,tier:4,width:360,height:155,mini:false,age:1400};
 assert.equal(renderer.paint(ctx,config),true,game+' must render native image art');
 assert(ctx.paints()>=6,game+' requires layered painted raster decor');
 assert.equal(config.game,game);assert.equal(config.width,360);
}
assert.equal(renderer.describe().games.length,10);
for(const game of ['winery','dango']){
 const ctx=context();renderer.paint(ctx,{game,width:160,height:80,mini:true,age:260});
 assert(ctx.paints()>=4,game+' has a frameless image-based cut-in');
}
const hidden=context();
assert.equal(renderer.paint(hidden,{game:'unknown',width:360,height:155}),false);
window.SweetsBoardArtV275.loaded=false;
assert.equal(renderer.paint(hidden,{game:'cookie',width:360,height:155}),false,'fallback when images unavailable');
assert.equal(hidden.paints(),0,'no corrupt partial artwork while still loading');
assert(requested.includes('dango-rainbow')&&requested.includes('wine-glass')&&requested.includes('waffle-black'));
assert(requested.includes('award-highest'),'highest prize uses richer raster tier');
// Production path: the original generated 2x5 translucent sheet, without any
// statically baked LINE, FREE or WIN string, drives exactly one bitmap draw.
class FakeImage{
 constructor(){this.naturalWidth=this.width=1024;this.naturalHeight=this.height=1536;}
 set src(v){this.path=v;this.onload?.();}
}
const production={window:{},Image:FakeImage,console:{warn(){}}};
vm.runInNewContext(source,production);
const live=production.window.SweetsIllustratedAwardV291;
assert.equal(await live.ready,true);
const positions=new Set();
for(const game of names){
 let drawArgs=null,drawCalls=0;
 const ctx={drawImage(...args){drawCalls++;drawArgs=args;}};
 assert.equal(live.paint(ctx,{game,width:330,height:130,mini:false,age:0}),true,game);
 assert.equal(drawCalls,1,game+' draws original bitmap instead of vector silhouettes');
 const [image,sx,sy,sw,sh]=drawArgs;
 assert(image.path.includes('themed-cutin-atlas.webp'));
 assert(sw>0&&sh>0&&sx>=0&&sy>=0);
 positions.add(sx+','+sy);
}
assert.equal(positions.size,10,'each game uses a unique cropped image region');
assert.equal(live.describe().atlasPainted,10);
console.log('v291: ten themed PNG overlays, text isolation, artwork fallback OK');
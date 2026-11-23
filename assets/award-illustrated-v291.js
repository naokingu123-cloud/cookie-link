/* v291: game-specific, raster illustrated award furniture.
 * Composes the original generated high-resolution PNG sweets with the
 * existing transparent award PNGs. No SVG, labels baked into the images,
 * new network assets, or changes to credits, draw RNG, or engine state.
 * Existing award renderer owns the lifecycle and accessible status text. */
(()=>{
'use strict';
if(window.SweetsIllustratedAwardV291)return;
const PROPS=Object.freeze({
 cookie:{left:'cookie-berry',right:'cookie-honey',crest:'sugar-star',lower:'cookie-pistachio',scatter:'cookie-grape',glow:'#ffcb6d',dark:'#4b1b43'},
 choco:{left:'choco-dark',right:'choco-milk',crest:'choco-berry',lower:'choco-ivory',scatter:'gold-medal',glow:'#ffb26d',dark:'#461a32'},
 candy:{left:'candy-blue',right:'candy-pink',crest:'candy-diamond',lower:'candy-gold',scatter:'sugar-star',glow:'#a4f3ff',dark:'#341c69'},
 gelato:{left:'gelato-blue',right:'gelato-purple',crest:'gelato-yellow',lower:'gelato-green',scatter:'sugar-star',glow:'#b4f3ff',dark:'#292a6a'},
 winery:{left:'wine-glass',right:'wine-glass',crest:'wine-plaque',lower:'candy-red',scatter:'candy-violet',glow:'#e6a4ed',dark:'#381945',frameless:true},
 popcorn:{left:'popcorn-cream',right:'popcorn-gold',crest:'sugar-star',lower:'popcorn-red',scatter:'popcorn-blue',glow:'#ffe18f',dark:'#71334a'},
 jelly:{left:'jelly-mold',right:'candy-pink',crest:'candy-aqua',lower:'candy-violet',scatter:'candy-red',glow:'#ffc4fa',dark:'#571c66'},
 stick:{left:'waffle-black',right:'waffle-white',crest:'waffle-cell',lower:'cookie-berry',scatter:'sugar-star',glow:'#ffd778',dark:'#5a2b37'},
 castella:{left:'castella-baked',right:'castella-raw',crest:'sugar-star',lower:'castella-baked',scatter:'cookie-honey',glow:'#ffe0a4',dark:'#5a2b36'},
 dango:{left:'dango-pink',right:'dango-green',crest:'dango-rainbow',lower:'dango-white',scatter:'dango-yellow',glow:'#ffb9df',dark:'#53234d',frameless:true}
});
const ATLAS_FILE='assets/award-art-v291/themed-cutin-atlas.webp?v=291';
const ATLAS_CELLS=Object.freeze({
 cookie:[0,0],choco:[1,0],candy:[0,1],jelly:[1,1],
 gelato:[0,2],winery:[1,2],popcorn:[0,3],stick:[1,3],
 castella:[0,4],dango:[1,4]
});
let atlasImage=null;
const ready=typeof Image==='function'?new Promise(resolve=>{
 const image=new Image();image.decoding='async';
 image.onload=()=>{atlasImage=image;resolve(true);};
 image.onerror=()=>{console.warn('v291: generated cut-in atlas unavailable; using existing PNG motifs');resolve(false);};
 image.src=ATLAS_FILE;
}):Promise.resolve(false);
const counters={painted:0,atlasPainted:0,missing:0,used:new Set()};
function bitmap(id){return window.SweetsBoardArtV275?.sprite?.(id)||null;}
function baseArt(tier){return window.SweetsAwardArtV277?.sprite?.(
 tier>=4?'award-highest':tier>=3?'award-super':tier>=2?'award-high':'award-normal'
)||null;}
function draw(ctx,id,x,y,limitW,limitH,angle,alpha){
 const img=bitmap(id);
 if(!img)return false;
 const iw=img.width||img.naturalWidth,ih=img.height||img.naturalHeight;
 if(!(iw>0&&ih>0))return false;
 const k=Math.min(limitW/iw,limitH/ih),w=iw*k,h=ih*k;
 ctx.save();ctx.translate(x,y);ctx.rotate(angle||0);ctx.globalAlpha*=alpha??1;
 ctx.shadowColor='#ffecbc';ctx.shadowBlur=Math.min(12,Math.max(w,h)*.08);
 ctx.drawImage(img,-w/2,-h/2,w,h);
 ctx.restore();return true;
}
function paint(ctx,o){
 const {game,tier=1,width:w,height:h,mini=false,age=0,still=false}=o||{};
 const model=PROPS[game],ready=window.SweetsBoardArtV275?.loaded;
 if(!model||!ctx||!(w>0&&h>0)){counters.missing++;return false;}
 // The v291 production path uses the actual generated transparent artwork:
 // one detailed illustrated plaque per game, with no baked-in text.
 // The title, LINE count, FREE and WIN are painted separately by v277.
 const cell=ATLAS_CELLS[game],sheet=atlasImage;
 if(sheet&&cell&&sheet.naturalWidth>0&&sheet.naturalHeight>0){
  const aw=sheet.naturalWidth,ah=sheet.naturalHeight;
  const sx=Math.round(cell[0]*aw/2),ex=Math.round((cell[0]+1)*aw/2);
  const sy=Math.round(cell[1]*ah/5),ey=Math.round((cell[1]+1)*ah/5);
  const cw=ex-sx,ch=ey-sy;
  const iw=Math.min(w*1.08,h*(cw/ch)*1.55),ih=iw*ch/cw;
  ctx.drawImage(sheet,sx,sy,cw,ch,-iw/2,-ih/2,iw,ih);
  counters.painted++;counters.atlasPainted++;counters.used.add(game);
  return true;
 }
 if(!ready){counters.missing++;return false;}
 const img=baseArt(tier);
 if(!model.frameless&&!img){counters.missing++;return false;}
 // Painted 2.5D decorations replace the synthetic geometry from v290.
 // Keep the central dark-plum text space unobstructed for exact live amounts.
 const swing=still?0:Math.sin(age/590)*.022,shine=still?1:.95+.05*Math.sin(age/420);
 ctx.save();
 if(model.frameless){
  // Wine and mochi are borderless in the approved reference artwork.
  const aura=ctx.createRadialGradient(0,0,w*.04,0,0,w*.49);
  aura.addColorStop(0,model.dark);aura.addColorStop(.62,model.dark+'ed');
  aura.addColorStop(.82,model.glow+'66');aura.addColorStop(1,model.glow+'00');
  ctx.fillStyle=aura;ctx.beginPath();ctx.ellipse(0,0,w*.51,h*.51,0,0,Math.PI*2);ctx.fill();
 }else{
  const ratio=(img.naturalWidth||img.width)/(img.naturalHeight||img.height);
  const aw=w*1.06,ah=Math.min(h*1.20,aw/ratio);
  ctx.save();ctx.shadowColor=model.glow;ctx.shadowBlur=mini?3:10;
  ctx.drawImage(img,-aw/2,-ah/2,aw,ah);ctx.restore();
  const center=ctx.createRadialGradient(0,-h*.08,0,0,0,w*.37);
  center.addColorStop(0,model.dark+'de');center.addColorStop(.63,model.dark+'ca');
  center.addColorStop(1,model.dark+'00');
  ctx.fillStyle=center;ctx.beginPath();ctx.ellipse(0,-h*.015,w*.33,h*.28,0,0,Math.PI*2);ctx.fill();
 }
 const edge=w*.43,top=-h*.40,lower=h*.39,s=h*(mini?.45:.58);
 const drawn=[
  draw(ctx,model.left,-edge,-h*.02,s*1.02,s*1.04,-.16+swing,shine),
  draw(ctx,model.right,edge,-h*.01,s*1.02,s*1.04,.15-swing,shine),
  draw(ctx,model.crest,0,top,s*.77,s*.70,swing*.5,.97),
  draw(ctx,model.lower,0,lower,s*.55,s*.42,-swing*.2,.82),
  draw(ctx,model.scatter,-w*.32,-h*.37,s*.35,s*.35,-.2,.93),
  draw(ctx,model.scatter,w*.32,h*.32,s*.29,s*.29,.33,.8)
 ];
 // Focus only on the ready-made glossy raster art; the text is rendered by
 // the existing event owner, so LINE, FREE, BINGO and WIN never go stale.
 if(drawn.some(Boolean)){counters.painted++;counters.used.add(game);}
 ctx.restore();
 return drawn.some(Boolean);
}
window.SweetsIllustratedAwardV291=Object.freeze({
 version:291,ready,paint,describe:()=>({version:291,painted:counters.painted,
 atlasPainted:counters.atlasPainted,atlasReady:!!atlasImage,
 missing:counters.missing,games:[...counters.used],rasterSource:atlasImage?ATLAS_FILE:'assets/illustrated-art-v275/*.png'})
});
})();
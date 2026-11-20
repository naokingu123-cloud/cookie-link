/* Painted confectionery pieces for the three original games.
 * Install inside the game scope after v247 and before v274 role artwork.
 * Only image sources change: native boards, motion, numbers, backgrounds,
 * neighbour masks, state, payouts and input targets retain their owners. */
(()=>{
'use strict';
if(window.SweetsIllustratedBoardsAV275)return;
const art=window.SweetsBoardArtV275;
if(!art?.loaded)return;
const selected=new Set(window.SweetsLineup?.chosen||[]);
if(!['cookie','choco','candy'].some(id=>selected.has(id)))return;
const flavors=['berry','honey','pistachio','soda','grape'];
const sprites=new Map(),urls=new Map(),sources=new WeakMap(),sourceImages=new WeakMap();
const canvas=(width,height=width)=>{const c=document.createElement('canvas');c.width=width;c.height=height;return c;};
function imageLike(bitmap){
 // Native miniature and shatter renderers use Image-style readiness checks.
 bitmap.complete=true;bitmap.naturalWidth=bitmap.width;bitmap.naturalHeight=bitmap.height;
 return bitmap;
}
function contain(ctx,source,x,y,w,h){
 if(!source)return false;
 const sw=source.naturalWidth||source.width,sh=source.naturalHeight||source.height;
 if(!(sw>0&&sh>0))return false;
 const scale=Math.min(w/sw,h/sh),dw=sw*scale,dh=sh*scale;
 ctx.drawImage(source,x+(w-dw)/2,y+(h-dh)/2,dw,dh);return true;
}
function cookieSprite(color,special=false){
 const index=((Number(color)||0)%flavors.length+flavors.length)%flavors.length;
 const name='cookie-'+flavors[index],key=name+'/'+Number(!!special);
 if(sprites.has(key))return sprites.get(key);
 const base=art.sprite(name),hammer=special&&art.sprite('hammer');
 if(!base||special&&!hammer)return null;
 const out=canvas(128),ctx=out.getContext('2d');
 contain(ctx,base,1,1,126,126);
 // Retain the full flavor rim around the sculpted candy mallet, so the
 // special piece still clearly belongs to its normal-color cookie group.
 if(special)contain(ctx,hammer,19,10,90,108);
 sources.set(out,Object.freeze([name,...(special?['hammer']:[])]));
 sourceImages.set(out,Object.freeze([base,...(special?[hammer]:[])]));
 sprites.set(key,imageLike(out));return out;
}
function cookieURL(color,special=false){
 const key=String(color)+'/'+Number(!!special);
 if(urls.has(key))return urls.get(key);
 const bitmap=cookieSprite(color,special);if(!bitmap)return '';
 const url=bitmap.toDataURL('image/png');urls.set(key,url);return url;
}
function resolveSources(bitmap){
 if(!bitmap||sources.has(bitmap)||!selected.has('choco'))return;
 // The native sampler writes ImageData, which severs drawImage lineage.
 // Inspect its existing cache by object identity only when QA requests
 // provenance. Nothing wraps the sampler or runs on the painting path.
 for(const [key,cached] of chocoSprites){
  if(cached!==bitmap)continue;
  const color=String(key).startsWith('fruit/')?2:Number(String(key).split('/')[0]);
  if(Number.isInteger(color)&&color>=0&&color<4){
   const name=['choco-milk','choco-berry','choco-ivory','choco-dark'][color];
   sources.set(bitmap,Object.freeze([name]));
   sourceImages.set(bitmap,Object.freeze([chocoCakeImages[color]]));
  }
  break;
 }
}
const api={
 version:275,cookieURL,
 sourcesOf:bitmap=>{resolveSources(bitmap);return sources.get(bitmap)||[];},
 sourceImagesOf:bitmap=>{resolveSources(bitmap);return sourceImages.get(bitmap)||[];},
 describe:()=>({games:[...selected].filter(id=>['cookie','choco','candy'].includes(id)),
  cachedSprites:sprites.size,generatedURLs:urls.size,
  cookiePieces:selected.has('cookie')?'painted-v275':'unused',
  canyonMaterial:selected.has('choco')?'painted-v275-native-autotile':'unused',
  candyPieces:selected.has('candy')?'painted-v275-native-palette':'unused',
  backgrounds:'native',geometry:'native',rules:'unchanged'})
};
// cookieFaceSrc resolves this URL factory for future board tiles, hammers,
// paytable icons and flying fragments. The initial board is refreshed below.
window.SweetsIllustratedBoardsAV275=Object.freeze(api);
document.documentElement.classList.add('illustrated-boards-a-v275');

if(selected.has('cookie')){
 for(let color=0;color<flavors.length;color++)for(let special=0;special<2;special++){
  const bitmap=cookieSprite(color,!!special);
  if(bitmap)cookieSprites[color*2+special]=bitmap;
 }
 const nativeDecor=syncTileDecor;
 syncTileDecor=function(el,t){
  const result=nativeDecor.apply(this,arguments);
  const image=el?.querySelector('.cookie-face'),url=cookieURL(t.color,!!t.special);
  if(image&&url){
   if(image.getAttribute('src')!==url)image.setAttribute('src',url);
   image.dataset.boardArt='v275';
  }
  return result;
 };
 const nativeBetCookie=betCookie;
 betCookie=function(ctx,color,x,y,size,hammer=false){
  const bitmap=cookieSprite(color,hammer);
  if(!bitmap)return nativeBetCookie.apply(this,arguments);
  contain(ctx,bitmap,x-size/2,y-size/2,size,size);
 };
 const oldPath=/(?:^|\/)sweet-skins\/(cookie|hammer)-(berry|honey|pistachio|soda|grape)\.webp(?:[?#].*)?$/;
 for(const image of document.querySelectorAll('img')){
  const match=(image.getAttribute('src')||'').match(oldPath);if(!match)continue;
  const url=cookieURL(flavors.indexOf(match[2]),match[1]==='hammer');
  if(url){image.setAttribute('src',url);image.dataset.boardArt='v275';}
 }
}

if(selected.has('choco')){
 // Feed the new paintings to the original source-image sampler. It still
 // removes shared side bevels, keeps connected strata continuous, applies
 // the native six surface variants and owns every melt/fall animation.
 const names=['choco-milk','choco-berry','choco-ivory','choco-dark'];
 for(let color=0;color<names.length;color++){
  const bitmap=art.sprite(names[color]);if(!bitmap)continue;
  const out=canvas(256),ctx=out.getContext('2d');
  ctx.drawImage(bitmap,0,0,256,256);
  sources.set(out,Object.freeze([names[color]]));
  sourceImages.set(out,Object.freeze([bitmap]));
  chocoCakeImages[color]=imageLike(out);
 }
 chocoSprites.clear();chocoItemCakeCache.clear();
}

if(selected.has('candy')){
 // The v247 palette resolves the shared paintings at its source, covering
 // both its private tutorial and all live/miniature consumers. Clearing
 // role art here ensures v274 builds its original diagrams from new drops.
 if(typeof sixTutorialIconCache!=='undefined')sixTutorialIconCache.clear();
}
for(const slot of slots){
 if(!['cookie','choco','candy'].includes(slot.engine?.kind))continue;
 slot.dirtyMain=slot.dirtyMini=true;
 if(slot.engine.kind==='choco'){slot.chocoReachKey='';chocoQueueFrame(slot);}
 if(slot.engine.kind==='candy'){slot.candyKey='';carnivalQueueFrame(slot);}
}
window.sweets12FrameScheduler?.markAll();
scheduleUI(app);
})();

/* Rich confectionery trim for the three original games.
 * Run inside the game scope after the v247 Six Drop adapter. The native
 * biscuit/cake/candy caches, number glyphs, backgrounds and geometry stay
 * with their original renderers. This file only decorates existing panels. */
(()=>{
'use strict';
if(window.SweetsOrnateBoardsAV274)return;
const art=window.SweetsOrnateArtV274;
if(!art?.loaded)return;
const selected=new Set(window.SweetsLineup?.chosen||[]);
if(!['cookie','choco','candy'].some(id=>selected.has(id)))return;
document.documentElement.classList.add('ornate-boards-a-v274');

/* The old cacao/ganache paytable remains visible. Only its narrow outer
 * rail receives the new gold-and-chocolate trim; the native function still
 * owns every ore, amount and their exact coordinates. The rail stays clear
 * of the 6.5 px icon inset and the 5 px amount inset. */
if(selected.has('choco')&&typeof chocoOreTable==='function'){
 const nativeOreTable=chocoOreTable;
 chocoOreTable=function(ctx,layout,width,bet,time){
  const result=nativeOreTable.apply(this,arguments);
  const x=layout.left+7*layout.w+5,w=width-x-4;
  if(w>0){
   ctx.save();
   art.frame(ctx,'choco',x,3,w,112,Math.min(3.5,w*.045),'pay');
   ctx.restore();
  }
  return result;
 };
}

/* Role diagrams share the v247 palette with the live board and miniature.
 * v275 supplies its painted drops to that same palette; otherwise wait for
 * the original PNG so a temporary vector fallback cannot become the icon.
 * In both cases retain the existing role positions and number-free layout. */
const roleURLs=new Map();
function roleURL(type){
 if(!['line','triangle','hexagon'].includes(type)||
    typeof sixDrawRoleIcon!=='function'||
    (!window.SweetsBoardArtV275?.loaded&&
     (typeof sixCandyPngState==='undefined'||!sixCandyPngState.loaded)))return '';
 if(roleURLs.has(type))return roleURLs.get(type);
 const canvas=document.createElement('canvas');canvas.width=120;canvas.height=80;
 sixDrawRoleIcon(canvas,type,1);
 const url=canvas.toDataURL('image/png');roleURLs.set(type,url);return url;
}
function refreshRoleImages(node){
 if(!selected.has('candy')||node?.nodeType!==1)return;
 const images=node.matches('img')?[node]:node.querySelectorAll('.sd247-roles img,.six-glass-role-icon');
 for(const image of images){
  const row=image.closest('[data-sd247],[data-simple-role]');
  const type=row?.dataset.sd247||row?.dataset.simpleRole;
  const url=roleURL(type);
  if(url&&image.getAttribute('src')!==url){
   image.setAttribute('src',url);
   image.dataset.ornateRole=window.SweetsBoardArtV275?.loaded?'painted-v275':'native-v247';
  }
 }
}
if(selected.has('candy')){
 refreshRoleImages(document.body);
 if(!window.SweetsBoardArtV275?.loaded&&typeof sixCandyPng!=='undefined'&&typeof sixCandyPngState!=='undefined'&&!sixCandyPngState.loaded)
  sixCandyPng.addEventListener('load',()=>refreshRoleImages(document.body),{once:true});
 const observer=new MutationObserver(records=>{
  for(const record of records)for(const node of record.addedNodes)refreshRoleImages(node);
 });
 observer.observe(document.getElementById('odds-panel')||document.body,{childList:true,subtree:true});
}

window.SweetsOrnateBoardsAV274=Object.freeze({
 version:274,
 describe:()=>({games:[...selected].filter(id=>['cookie','choco','candy'].includes(id)),
  pieces:'native',backgrounds:'native',geometry:'native',rules:'unchanged',
  candyRoles:roleURLs.size,chocoPayTrim:selected.has('choco')})
});
})();

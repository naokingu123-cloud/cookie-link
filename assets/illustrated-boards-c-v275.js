/* v275 detailed illustrated sweets: painters only; native geometry, worlds,
 * raised waffle lattice, honey griddle, channels, tray and effects stay intact. */
(()=>{
'use strict';
const art=window.SweetsBoardArtV275;
if(!art||window.SweetsIllustratedBoardsCV275)return;
const usage={waffleCells:0,wafflePieces:0,castellaMaterials:0,dangoCells:0};
let castellaCache=null;
const epoch=()=>String(art.epoch??art.version)+':'+Number(!!art.loaded);
function waffleCell(c,x,y,w,h){
 const drawn=!!art.loaded&&art.draw(c,'waffle-cell',x,y,w,h);
 if(drawn)usage.waffleCells++;return drawn;
}
function wafflePiece(c,color,x,y,w,h){
 const drawn=!!art.loaded&&art.draw(c,'waffle-'+color,x,y,w,h);
 if(drawn)usage.wafflePieces++;return drawn;
}
function castellaMaterials(){
 if(!art.loaded)return null;
 const key=epoch();if(castellaCache?.key===key)return castellaCache.images;
 const names=['castella-hole','castella-raw','castella-baked'];
 if(!names.every(name=>art.sprite(name)))return null;
 const images=names.map(name=>{
  const image=document.createElement('canvas');image.width=image.height=160;
  const c=image.getContext('2d');c.beginPath();c.arc(80,80,79.5,0,Math.PI*2);c.clip();
  art.draw(c,name,0,0,160,160);return image;
 });
 castellaCache={key,images};usage.castellaMaterials++;return images;
}
function dangoBitmap(c,key,x,y,w,h){
 if(key==='stand'||key==='skewer')return false;
 const drawn=!!art.loaded&&art.draw(c,'dango-'+key,x,y,w,h);
 if(drawn)usage.dangoCells++;return drawn;
}
const api={version:275,get epoch(){return epoch();},get loaded(){return !!art.loaded;},
 waffleCell,wafflePiece,castellaMaterials,dangoBitmap,
 url:name=>art.loaded?art.url(name):'',
 describe:()=>({version:275,ready:!!art.loaded,epoch:epoch(),usage:{...usage},preserved:['waffle-tray','waffle-lattice','castella-griddle','castella-channels','castella-dispenser','dango-stand','dango-skewer']})};
window.SweetsIllustratedBoardsCV275=Object.freeze(api);
})();

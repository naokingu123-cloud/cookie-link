/* v272 generated arcade artwork. Only painters and decorative image sources:
   Waffle, Castella and Dango retain their native state, geometry and clocks. */
(()=>{
'use strict';
const art=window.SweetsCartoonArt;
if(!art?.loaded||window.SweetsCartoonBoardsC)return;
const root=document.documentElement,waffleCache=new WeakMap();
const usage={waffleBoards:0,wafflePieces:0,castellaBoards:0,castellaMaterials:0,castellaDispensers:0,dangoCells:0,dangoStands:0,dangoSkewers:0};
let castellaCache=null;
const epoch=()=>String(art.epoch)+':'+Number(!!art.loaded);
function rounded(c,x,y,w,h,r,fill){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();}
function canvas(w,h){const image=document.createElement('canvas');image.width=Math.max(1,Math.round(w));image.height=Math.max(1,Math.round(h));return image;}
function waffleBoard(context,size,rim,unit){
 const key=[size,rim,unit,epoch()].join('/'),cached=waffleCache.get(context);
 if(cached?.key===key)return cached.image;
 const image=canvas(size,size),c=image.getContext('2d');
 rounded(c,0,0,size,size,size*.055,'#f5b946');
 rounded(c,rim*.73,rim*.73,size-rim*1.46,size-rim*1.46,unit*.18,'#a85827');
 for(let row=0;row<8;row++)for(let col=0;col<8;col++){
  const x=rim+col*unit,y=rim+row*unit,pad=unit*.018;
  art.draw(c,'waffle-cell',x+pad,y+pad,unit-pad*2,unit-pad*2);
 }
 art.frame(c,'stick',0,0,size,size,Math.max(2,rim*.78));
 waffleCache.set(context,{key,image});usage.waffleBoards++;return image;
}
function wafflePiece(c,color,x,y,w,h){usage.wafflePieces++;return art.draw(c,'waffle-'+color,x,y,w,h);}
function castellaMaterials(){
 const key=epoch();if(castellaCache?.key===key)return castellaCache.images;
 const images=['castella-hole','castella-raw','castella-baked'].map(name=>{
  const image=canvas(160,160);art.draw(image.getContext('2d'),name,0,0,160,160);return image;
 });
 castellaCache={key,images};usage.castellaMaterials++;return images;
}
function castellaGriddle(c,x,y,w,h,unit){
 rounded(c,x,y,w,h,Math.max(2,unit*.39),'#ffd66a');
 rounded(c,x+unit*.15,y+unit*.15,w-unit*.30,h-unit*.30,unit*.27,'#e49b3b');
 art.frame(c,'castella',x,y,w,h,Math.max(2,unit*.31));usage.castellaBoards++;return true;
}
function castellaDispenser(c,x,y,w,h){
 // The atlas bottle is upright, with its nozzle at the upper center. Pivot
 // that nozzle onto the native pouring tip rather than the old sprite corner.
 c.save();c.translate(x,y);c.rotate(Math.PI*.75);
 const width=w*.66,height=h*.66;
 const drawn=art.draw(c,'castella-dispenser',-width/2,0,width,height);
 c.restore();usage.castellaDispensers++;return drawn;
}
function dispenserRatio(){const image=art.sprite('castella-dispenser');return image?.width?image.height/image.width:1;}
function dangoBitmap(c,key,x,y,w,h){
 if(key==='stand'){
  // The former photographic plinth becomes a low illustrated sweet tray, in
  // the exact same bounds. Board centers and FREE hit targets never move.
  rounded(c,x,y,w,h,Math.min(w,h)*.23,'#ffb6c8');
  art.frame(c,'dango',x,y,w,h,Math.max(2,h*.30));usage.dangoStands++;return true;
 }
 if(key==='skewer'){usage.dangoSkewers++;return art.draw(c,'bamboo',x,y,w,h);}
 usage.dangoCells++;return art.draw(c,'dango-'+key,x,y,w,h);
}
function frameUrl(game,w,h,thickness){
 const image=canvas(w,h);art.frame(image.getContext('2d'),game,0,0,w,h,thickness);return image.toDataURL();
}
function decorate(){
 root.classList.add('cartoon-boards-c-v272');
 const set=(key,url)=>{if(url)root.style.setProperty(key,'url("'+url+'")');};
 for(const game of ['stick','castella']){
  set('--c272-'+game+'-panel',frameUrl(game,240,640,24));
 }
 for(const name of ['waffle-cell','waffle-black','waffle-white','castella-baked','dango-yellow'])set('--c272-'+name,art.url(name));
}
const api={version:272,get epoch(){return epoch();},waffleBoard,wafflePiece,castellaMaterials,castellaGriddle,castellaDispenser,dispenserRatio,dangoBitmap,
 url:name=>art.url(name),describe:()=>({version:272,ready:!!art.loaded,epoch:epoch(),usage:{...usage}})};
window.SweetsCartoonBoardsC=Object.freeze(api);
if(art.loaded)decorate();else art.ready.then(()=>{if(art.loaded)decorate();});
})();

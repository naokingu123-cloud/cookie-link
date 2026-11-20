/* v275: detailed painted board pieces. Image placement only; native game
 * geometry, input, rules, numbers, payout and background renderers stay in charge. */
(()=>{
'use strict';
if(window.SweetsBoardArtV275)return;
const sheets=[
 {
  "file": "assets/illustrated-art-v275/biscuits-cakes.png",
  "cols": 4,
  "rows": 3,
  "names": [
   "cookie-berry",
   "cookie-honey",
   "cookie-pistachio",
   "cookie-soda",
   "cookie-grape",
   "hammer",
   "choco-milk",
   "choco-berry",
   "choco-ivory",
   "choco-dark",
   "sugar-star",
   "gold-medal"
  ]
 },
 {
  "file": "assets/illustrated-art-v275/sugar-drops.png",
  "cols": 4,
  "rows": 3,
  "names": [
   "candy-blue",
   "candy-aqua",
   "candy-green",
   "candy-lime",
   "candy-yellow",
   "candy-orange",
   "candy-red",
   "candy-violet",
   "candy-pink",
   "candy-gold",
   "candy-silver",
   "candy-diamond"
  ]
 },
 {
  "file": "assets/illustrated-art-v275/crystals-glass.png",
  "cols": 4,
  "rows": 3,
  "names": [
   "gelato-blue",
   "gelato-green",
   "gelato-yellow",
   "gelato-red",
   "gelato-purple",
   "gelato-socket",
   "wine-glass",
   "wine-plaque",
   "jelly-surface",
   "jelly-rib",
   "popcorn-liner",
   "jelly-mold"
  ]
 },
 {
  "file": "assets/illustrated-art-v275/popcorn-kernels.png",
  "cols": 3,
  "rows": 2,
  "names": [
   "popcorn-cream",
   "popcorn-gold",
   "popcorn-red",
   "popcorn-purple",
   "popcorn-blue",
   "popcorn-rainbow"
  ]
 },
 {
  "file": "assets/illustrated-art-v275/bakery-mochi.png",
  "cols": 4,
  "rows": 3,
  "names": [
   "waffle-cell",
   "waffle-black",
   "waffle-white",
   "castella-hole",
   "castella-raw",
   "castella-baked",
   "dango-white",
   "dango-green",
   "dango-pink",
   "dango-yellow",
   "dango-rainbow",
   "castella-dispenser"
  ]
 }
];
// Measured full-sheet bounds keep ornaments that cross a grid boundary while
// excluding unrelated neighboring sprites. PNG pixels are never rewritten.
const sourceRects={"cookie-berry":[49,10,365,317],"cookie-honey":[422,5,737,317],"cookie-pistachio":[794,10,1112,317],"cookie-soda":[1169,5,1486,317],"cookie-grape":[51,348,367,663],"hammer":[445,338,715,671],"choco-milk":[788,342,1112,661],"choco-berry":[1163,345,1488,662],"choco-ivory":[45,685,367,1008],"choco-dark":[413,690,741,1008],"sugar-star":[794,682,1105,1018],"gold-medal":[1162,689,1487,1015],"candy-blue":[32,3,370,335],"candy-aqua":[407,3,746,336],"candy-green":[786,3,1124,336],"candy-lime":[1165,3,1503,335],"candy-yellow":[30,341,371,675],"candy-orange":[406,341,746,674],"candy-red":[784,341,1124,674],"candy-violet":[1165,341,1505,674],"candy-pink":[30,679,371,1014],"candy-gold":[401,678,747,1017],"candy-silver":[778,679,1124,1018],"candy-diamond":[1160,678,1506,1017],"gelato-blue":[27,11,357,313],"gelato-green":[411,10,742,316],"gelato-yellow":[796,10,1126,315],"gelato-red":[1180,10,1509,314],"gelato-purple":[30,351,356,654],"gelato-socket":[404,339,747,666],"wine-glass":[770,347,1138,665],"wine-plaque":[1145,400,1533,593],"jelly-surface":[31,686,354,1005],"jelly-rib":[383,791,768,899],"popcorn-liner":[796,694,1123,998],"jelly-mold":[1162,672,1524,1010],"popcorn-cream":[14,7,489,478],"popcorn-gold":[528,0,1004,476],"popcorn-red":[1035,7,1516,479],"popcorn-purple":[14,510,494,988],"popcorn-blue":[526,510,1004,993],"popcorn-rainbow":[1033,518,1515,1002],"waffle-cell":[38,6,365,333],"waffle-black":[404,3,748,335],"waffle-white":[766,2,1128,332],"castella-hole":[1142,3,1526,337],"castella-raw":[23,343,369,665],"castella-baked":[397,343,743,666],"dango-white":[771,349,1122,658],"dango-green":[1158,348,1504,657],"dango-pink":[15,683,378,1010],"dango-yellow":[393,684,750,1008],"dango-rainbow":[765,683,1135,1009],"castella-dispenser":[1166,660,1491,1016]};
const entries=new Map(),crops=new Map(),urls=new Map(),origins=new WeakMap();
let drawCalls=0;
for(const sheet of sheets)sheet.names.forEach((name,index)=>entries.set(name,{sheet,index}));
const api={version:'v275',epoch:'v275',loaded:false,ready:null,entries:Object.freeze([...entries.keys()]),sprite,url,draw,stats,describe:stats,sourcesOf:source=>origins.get(source)||[]};
window.SweetsBoardArtV275=api;
function canvas(w,h){
 const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w));c.height=Math.max(1,Math.round(h));return c;
}
function sprite(name){
 if(crops.has(name))return crops.get(name);
 const entry=entries.get(name);if(!api.loaded||!entry?.sheet.image)return null;
 const {sheet,index}=entry,image=sheet.image;
 const col=index%sheet.cols,row=Math.floor(index/sheet.cols),rect=sourceRects[name];
 const x=Math.round(rect?rect[0]*image.naturalWidth/1536:col*image.naturalWidth/sheet.cols);
 const y=Math.round(rect?rect[1]*image.naturalHeight/1024:row*image.naturalHeight/sheet.rows);
 const right=Math.round(rect?rect[2]*image.naturalWidth/1536:(col+1)*image.naturalWidth/sheet.cols);
 const bottom=Math.round(rect?rect[3]*image.naturalHeight/1024:(row+1)*image.naturalHeight/sheet.rows);
 const cell=canvas(right-x,bottom-y),ctx=cell.getContext('2d',{willReadFrequently:true});
 ctx.drawImage(image,x,y,cell.width,cell.height,0,0,cell.width,cell.height);
 // Measure the transparent gutter for placement, then copy unchanged pixels.
 // Keep the original painted highlights, texture and alpha; no reillustration.
 const data=ctx.getImageData(0,0,cell.width,cell.height).data;
 let l=cell.width,t=cell.height,r=-1,b=-1;
 for(let yy=0;yy<cell.height;yy++)for(let xx=0;xx<cell.width;xx++)if(data[(yy*cell.width+xx)*4+3]>32){
  l=Math.min(l,xx);r=Math.max(r,xx);t=Math.min(t,yy);b=Math.max(b,yy);
 }
 if(r<l)return null;
 l=Math.max(0,l-2);t=Math.max(0,t-2);r=Math.min(cell.width-1,r+2);b=Math.min(cell.height-1,b+2);
 const out=canvas(r-l+1,b-t+1);
 out.getContext('2d').drawImage(cell,l,t,out.width,out.height,0,0,out.width,out.height);
 // Some original painters also accept decoded Image-like canvas sources.
 out.complete=true;out.naturalWidth=out.width;out.naturalHeight=out.height;
 origins.set(out,Object.freeze([sheet.file]));crops.set(name,out);return out;
}
function url(name){
 if(urls.has(name))return urls.get(name);
 const bitmap=sprite(name);if(!bitmap)return '';
 const value=bitmap.toDataURL('image/png');urls.set(name,value);return value;
}
function draw(ctx,name,x,y,w,h){
 const bitmap=sprite(name);if(!ctx||!bitmap||!(w>0&&h>0))return false;
 ctx.drawImage(bitmap,x,y,w,h);drawCalls++;return true;
}
function stats(){return {version:api.version,loaded:api.loaded,sprites:entries.size,files:sheets.map(s=>s.file),cached:crops.size,drawCalls};}
async function load(sheet){
 const image=new Image();image.decoding='async';
 await new Promise((resolve,reject)=>{
  image.onload=resolve;image.onerror=()=>reject(new Error('Painted board artwork unavailable: '+sheet.file));
  image.src=sheet.file+'?v=275';
 });
 if(image.decode)await image.decode();sheet.image=image;
}
api.ready=Promise.all(sheets.map(load)).then(()=>{
 api.loaded=true;
 for(const name of entries.keys())if(!sprite(name))throw new Error('Empty painted board sprite: '+name);
 document.documentElement.classList.add('illustrated-art-v275');
 document.documentElement.dataset.boardArt='v275';
 return true;
}).catch(error=>{api.loaded=false;console.warn(error);return false;});
})();


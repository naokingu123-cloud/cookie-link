/* Original generated award art. PNG originals stay intact: only renderer
 * source rectangles are used to reuse the jeweled line and its star tip. */
(()=>{
'use strict';
if(window.SweetsAwardArtV277)return;
const root='assets/celebration-art-v277/';
const layouts=Object.freeze({
 'award-normal':Object.freeze({x:.21,y:.33,w:.58,h:.36,ribbonY:.78,ribbonWidth:.43}),
 'award-high':Object.freeze({x:.20,y:.36,w:.60,h:.33,ribbonY:.78,ribbonWidth:.42}),
 'award-super':Object.freeze({x:.25,y:.39,w:.50,h:.34,ribbonY:.81,ribbonWidth:.40}),
 'award-highest':Object.freeze({x:.22,y:.44,w:.56,h:.29,ribbonY:.81,ribbonWidth:.40})
});
const files=[...Object.keys(layouts),'line-ornament'];
const sources=new Map(),sprites=new Map(),origins=new WeakMap();
const params=new URLSearchParams(location.search);
const worker=params.get('serverSettlementWorker')==='1'||params.get('downloadWorker')==='1';
const api={version:277,loaded:false,ready:null,
 sprite:id=>sprites.get(id)||null,
 layout:id=>layouts[id]||null,
 sourcesOf:source=>origins.get(source)||[],
 describe:()=>({version:277,loaded:api.loaded,worker,files:files.map(id=>root+id+'.png'),sprites:[...sprites.keys()]})
};
window.SweetsAwardArtV277=api;
function crop(image,rect,square=false){
 const [x,y,w,h]=rect,side=square?Math.max(w,h):0;
 const canvas=document.createElement('canvas');canvas.width=side||w;canvas.height=side||h;
 canvas.getContext('2d').drawImage(image,x,y,w,h,(canvas.width-w)/2,(canvas.height-h)/2,w,h);
 canvas.complete=true;canvas.naturalWidth=canvas.width;canvas.naturalHeight=canvas.height;
 origins.set(canvas,Object.freeze([root+'line-ornament.png']));return canvas;
}
async function load(id){
 const image=new Image();image.decoding='async';
 await new Promise((resolve,reject)=>{
  image.onload=resolve;image.onerror=()=>reject(new Error('Award artwork unavailable: '+id));
  image.src=root+id+'.png?v=277';
 });
 if(image.decode)await image.decode();sources.set(id,image);origins.set(image,Object.freeze([root+id+'.png']));
 if(layouts[id])sprites.set(id,image);
}
api.ready=worker?Promise.resolve(false):Promise.all(files.map(load)).then(()=>{
 const line=sources.get('line-ornament');
 // Pixels are copied unchanged at runtime. The long strip contains both
 // decorative rails; the star crop keeps its entire original alpha edge.
 sprites.set('line-ribbon',crop(line,[440,292,1290,168]));
 const star=crop(line,[8,124,404,464],true);
 sprites.set('line-tip',star);sprites.set('spark-star',star);
 api.loaded=true;document.documentElement.classList.add('celebration-art-v277');return true;
}).catch(error=>{console.warn(error);return false;});
})();

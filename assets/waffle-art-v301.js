/* Waffle Atelier: generated pastry materials and live native furniture.
 * Reversi, the rack and the shared flip/knock/drop clock remain native. */
(()=>{
'use strict';
if(window.WaffleArtV301)return;
const query=new URLSearchParams(location.search);
if(query.get('serverSettlementWorker')==='1'||query.get('downloadWorker')==='1')return;
if(window.SweetsLineup?.chosen&&!window.SweetsLineup.chosen.includes('stick'))return;
const ROOT='assets/waffle-art-v301/';
const FILES=Object.freeze({pieces:'pieces.webp',board:'board-kit.webp',cabinet:'payout-cabinet.webp',furniture:'furniture-atlas.webp',grade:'award-grade-up.webp'});
const COLORS=Object.freeze(['black','white']),PIECE_SIZES=Object.freeze([18,64,256]),BOARD_LIMIT=8;
const FURNITURE=Object.freeze(['waffle','silver','gold','rail','bonus','pow']);
const images=new Map(),sprites=new Map(),rects=new Map(),sourceFiles=new Map(),pieceCache=new Map(),boards=new Map(),urls=new Map(),dom=new WeakMap(),errors=[];
const native={fitNumber:null,medal:null};
const stats={board:0,boardsBuilt:0,piece:0,pocket:0,rim:0,furniture:0,grade:0,decorate:0,amount:0};
let loaded=false,cachedPixels=0,decodedPixels=0,lastGrade=null;
function canvas(w,h=w){const out=document.createElement('canvas');out.width=Math.max(1,Math.round(w));out.height=Math.max(1,Math.round(h));return out;}
function crop(file,name,index=0,cols=1,rows=1,tight=true){
 const image=images.get(file),col=index%cols,row=Math.floor(index/cols);
 const x0=Math.round(col*image.naturalWidth/cols),x1=Math.round((col+1)*image.naturalWidth/cols);
 const y0=Math.round(row*image.naturalHeight/rows),y1=Math.round((row+1)*image.naturalHeight/rows);
 let left=0,top=0,right=x1-x0-1,bottom=y1-y0-1;
 if(tight){
  const probe=canvas(x1-x0,y1-y0),c=probe.getContext('2d',{willReadFrequently:true});
  if(!c)throw Error('Waffle sprite canvas unavailable');
  c.drawImage(image,x0,y0,probe.width,probe.height,0,0,probe.width,probe.height);
  const pixels=c.getImageData(0,0,probe.width,probe.height).data;
  left=probe.width;top=probe.height;right=bottom=-1;
  for(let y=0;y<probe.height;y++)for(let x=0;x<probe.width;x++)if(pixels[(y*probe.width+x)*4+3]>=18){
   left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
  }
  if(right<left||bottom<top)throw Error('Empty Waffle sprite '+name);
  left=Math.max(0,left-2);top=Math.max(0,top-2);right=Math.min(probe.width-1,right+2);bottom=Math.min(probe.height-1,bottom+2);
 }
 const box=Object.freeze([x0+left,y0+top,right-left+1,bottom-top+1]),out=canvas(box[2],box[3]);
 out.getContext('2d').drawImage(image,...box,0,0,out.width,out.height);
 sprites.set(name,out);rects.set(name,box);sourceFiles.set(name,ROOT+FILES[file]);cachedPixels+=out.width*out.height;
 return out;
}
function resize(source,w,h=w){const out=canvas(w,h),c=out.getContext('2d');c.imageSmoothingQuality='high';c.drawImage(source,0,0,out.width,out.height);cachedPixels+=out.width*out.height;return out;}
function bands(c,image,x,y,w,h,src,dst){
 for(let i=0;i<src.length-1;i++){
  const a=Math.round(image.height*src[i]),b=Math.round(image.height*src[i+1]);
  c.drawImage(image,0,a,image.width,b-a,x,y+h*dst[i],w,h*(dst[i+1]-dst[i]));
 }
}
function paintFurniture(c,role,x,y,w,h){
 const image=sprites.get(role);if(!image||!(w>0&&h>0))return false;
 if(role==='cabinet')bands(c,image,x,y,w,h,[0,.14,.975,1],[0,.085,.975,1]);
 else if(['waffle','silver','gold'].includes(role))bands(c,image,x,y,w,h,[0,.25,.80,1],[0,.12,.88,1]);
 else c.drawImage(image,x,y,w,h);
 return true;
}
function imageUrl(name){
 if(urls.has(name))return urls.get(name);
 let image;
 if(COLORS.includes(name))image=pieceCache.get(name+'/256');
 else if(name==='cabinet'){
  image=canvas(312,1065);paintFurniture(image.getContext('2d'),name,0,0,image.width,image.height);cachedPixels+=image.width*image.height;
 }else if(FURNITURE.includes(name)){
  const size=name==='rail'?[1024,128]:name==='bonus'?[320,160]:name==='pow'?[192,72]:[300,75];
  image=canvas(...size);paintFurniture(image.getContext('2d'),name,0,0,image.width,image.height);cachedPixels+=image.width*image.height;
 }else image=sprites.get(name);
 if(!image)return null;
 const url=image.toDataURL('image/png');urls.set(name,url);return url;
}
const ready=Promise.all(Object.entries(FILES).map(([name,file])=>new Promise(resolve=>{
 const image=new Image();image.decoding='async';
 image.onload=()=>{
  if(!(image.naturalWidth>0&&image.naturalHeight>0)){errors.push('Invalid '+file);resolve(false);return;}
  images.set(name,image);decodedPixels+=image.naturalWidth*image.naturalHeight;resolve(true);
 };
 image.onerror=()=>{errors.push('Missing '+ROOT+file);resolve(false);};image.src=ROOT+file+'?v=301';
}))).then(results=>{
 if(!results.every(Boolean))return false;
 try{
  COLORS.forEach((color,i)=>crop('pieces',color,i,2,1));
  crop('board','pocket',0,2,2);crop('board','rim',1,2,2);crop('board','floor',2,2,2);crop('board','button',3,2,2);
  crop('cabinet','cabinet');FURNITURE.forEach((name,i)=>crop('furniture',name,i,3,2));crop('grade','grade');
  for(const color of COLORS)for(const size of PIECE_SIZES)pieceCache.set(color+'/'+size,resize(sprites.get(color),size));
  for(const name of ['cabinet',...FURNITURE])document.documentElement.style.setProperty('--wf301-'+name,'url("'+imageUrl(name)+'")');
  loaded=true;document.documentElement.classList.add('waffle-art-v301');document.body?.classList.add('waffle-art-v301');
 }catch(error){errors.push(String(error?.message||error));}
 return loaded;
});
function piece(c,color,x,y,w,h){
 if(!loaded||!c||!COLORS.includes(color)||!(w>0&&h>0))return false;
 const need=Math.max(w,h),size=need<=18?18:need<=64?64:256;
 c.drawImage(pieceCache.get(color+'/'+size),x,y,w,h);stats.piece++;return true;
}
function pocket(c,x,y,w,h){
 if(!loaded||!c||!(w>0&&h>0))return false;
 c.drawImage(sprites.get('pocket'),x,y,w,h);stats.pocket++;return true;
}
function rim(c,x,y,w,h,t){
 if(!loaded||!c||!(w>0&&h>0))return false;
 const image=sprites.get('rim'),a=Math.round(Math.min(image.width,image.height)*.18),edge=Math.min(t,w/2,h/2);
 const sx=[0,a,image.width-a,image.width],sy=[0,a,image.height-a,image.height];
 const dx=[x,x+edge,x+w-edge,x+w],dy=[y,y+edge,y+h-edge,y+h];
 for(let row=0;row<3;row++)for(let col=0;col<3;col++){
  if(row===1&&col===1)continue;
  c.drawImage(image,sx[col],sy[row],sx[col+1]-sx[col],sy[row+1]-sy[row],dx[col],dy[row],dx[col+1]-dx[col],dy[row+1]-dy[row]);
 }
 stats.rim++;return true;
}
function board(context,size,rimSize,unit){
 if(!loaded||!(size>0&&unit>0))return null;
 const key=[size,rimSize,unit].join('/');stats.board++;
 if(boards.has(key))return boards.get(key);
 const out=canvas(size),c=out.getContext('2d');c.imageSmoothingQuality='high';
 c.drawImage(sprites.get('floor'),0,0,size,size);
 for(let row=0;row<8;row++)for(let col=0;col<8;col++){
  const pad=unit*.018;pocket(c,rimSize+col*unit+pad,rimSize+row*unit+pad,unit-pad*2,unit-pad*2);
 }
 rim(c,0,0,size,size,rimSize);boards.set(key,out);cachedPixels+=out.width*out.height;stats.boardsBuilt++;
 if(boards.size>BOARD_LIMIT){const old=boards.keys().next().value,item=boards.get(old);cachedPixels-=item.width*item.height;boards.delete(old);}
 return out;
}
function furniture(c,role,x,y,w,h){if(!loaded||!c||!paintFurniture(c,role,x,y,w,h))return false;stats.furniture++;return true;}
function grade(c,{state,motion:move,x=0,y=0,w,h,still=false}={}){
 if(!loaded||!c||!state||!move||!move.active||!(move.rankStep===1||move.rankStep===2)||!(w>0&&h>0))return false;
 c.drawImage(sprites.get('grade'),x,y,w,h);stats.grade++;
 const rows=(state.lastKnockRows||[state.lastKnockRow]).filter(Number.isFinite);
 c.save();c.textAlign='center';c.textBaseline='middle';c.fillStyle='#fff0bf';
 c.font='900 '+h*.22+'px ArcadePayout,Georgia,serif';c.fillText('G'+state.lastGrade+' → G'+state.grade,x+w*.73,y+h*.55,w*.40);
 c.font='900 '+h*.17+'px system-ui,sans-serif';c.fillText(rows.length+'枠入替',x+w*.73,y+h*.77,w*.38);c.restore();
 lastGrade={ball:state.draws.length,from:state.lastGrade,to:state.grade,rows:[...rows],pow:!!state.lastPowActive,rankStep:move.rankStep,win:false,still:!!still};
 return true;
}
function bindNative({fitNumber,medal}={}){
 if(typeof fitNumber==='function')native.fitNumber=fitNumber;
 if(typeof medal==='function')native.medal=medal;
 return {fitNumber:!!native.fitNumber,medal:!!native.medal};
}
function fittedAmount(node,amount,size,width){
 if(!loaded||!node)return false;
 const text=String(Math.max(0,Math.floor(Number(amount)||0))),available=Math.max(1,width||node.clientWidth||64),key=text+'/'+size+'/'+available;
 if(node.dataset.wf301Fit!==key||!node.querySelector('.gold-number')){
  node.dataset.wf301Fit=key;node.dataset.wf301Amount=text;node.style.fontSize='';
  if(native.fitNumber)native.fitNumber(node,text,size,available);else node.textContent=text;
  stats.amount++;
 }
 node.setAttribute('aria-label',text+' WIN');return true;
}
function fitTurn(node,amount){
 if(!loaded||!node)return false;
 if(!(amount>0)){if(node.textContent)node.textContent='';node.dataset.wf301Fit='';node.dataset.wf301Amount='0';node.setAttribute('aria-label','');return true;}
 return fittedAmount(node,amount,8.5,node.clientWidth||28);
}
function bonus(prize,{amount,count=0}={}){
 if(!loaded||!prize)return false;
 let total=prize.querySelector('.wf301-bonus-value'),unit=prize.querySelector('.wf301-bonus-unit'),caption=prize.querySelector('.wf301-bonus-count');
 if(!total){
  const strong=prize.querySelector('strong');if(!strong)return false;
  strong.textContent='';total=document.createElement('span');total.className='wf301-bonus-value';unit=document.createElement('small');unit.className='wf301-bonus-unit';unit.textContent='WIN';strong.append(total,unit);
 }
 if(!caption){caption=document.createElement('small');caption.className='wf301-bonus-count';prize.append(caption);}
 const value=String(Math.max(0,Math.floor(Number(count)||0)));
 if(caption.dataset.count!==value){caption.dataset.count=value;caption.textContent=count?value+'回':'';caption.setAttribute('aria-label',count?'リバーサル獲得 '+value+'回':'');}
 fittedAmount(total,amount,10,total.clientWidth||72);prize.setAttribute('aria-label','リバーサルボーナス '+String(amount)+' WIN'+(count?'、獲得 '+value+'回':''));return true;
}
function install(scene){
 if(!loaded||!scene)return null;
 let record=dom.get(scene);if(record)return record;
 scene.dataset.wf301Art='ready';
 const pay=scene.querySelector('.bs-pay'),heading=scene.querySelector('.bs-pay-title');if(!pay||!heading)return null;
 const unit=pay.querySelector('thead th:last-child');if(unit)unit.textContent='配当 WIN';
 for(const image of scene.querySelectorAll('.bs-turn-piece')){
  const color=image.closest('.bs-turn')?.dataset.color;if(COLORS.includes(color))image.src=imageUrl(color);
 }
 const logo=scene.querySelector('.bs-bonus img');if(logo)logo.src=imageUrl('bonus');
 const gradeImage=document.createElement('img');gradeImage.className='wf301-grade-art';gradeImage.alt='';gradeImage.src=imageUrl('grade');gradeImage.setAttribute('aria-hidden','true');
 const gradeLive=document.createElement('b');gradeLive.className='wf301-grade-live';heading.append(gradeImage,gradeLive);
 let top=pay.querySelector('.bs-top-rule');if(!top){top=document.createElement('small');top.className='bs-top-rule';heading.after(top);}
 top.replaceChildren();const label=document.createElement('span'),amount=document.createElement('b'),topUnit=document.createElement('small');
 label.textContent='次の上段';amount.className='wf301-next-amount';topUnit.textContent='WIN';top.append(label,amount,topUnit);
 record={pay,heading,gradeImage,gradeLive,top,nextAmount:amount,gradeKey:'',topKey:'',bet:0};dom.set(scene,record);return record;
}
function decorate(scene,state,options={}){
 if(!loaded||!scene||!state)return false;
 const record=install(scene);if(!record)return false;
 if(Number.isFinite(options.bet))record.bet=options.bet;
 const R=window.BingoStickRules,bet=record.bet,rankStep=options.motion?.rankStep??Number(record.pay.dataset.rankStep||0);
 const baseline=options.baseline??(state.totalHundredths-(rankStep<3?(state.lastBaseHundredths||0)+(state.reversalThisMove?(R?.sweepBonusHundredths||0):0):0));
 const currentGrade=options.grade??Number(record.pay.dataset.grade||0),rows=(state.lastKnockRows||[state.lastKnockRow]).filter(Number.isFinite);
 const active=!!(options.motion?.active??(rankStep===1||rankStep===2))&&rows.length>0&&(rankStep===1||rankStep===2);
 const gradeKey=[active,state.lastGrade,state.grade,rows,rankStep,!!state.lastPowActive].join('/');
 if(record.gradeKey!==gradeKey){
  record.gradeKey=gradeKey;record.heading.dataset.wf301Grade=String(active);
  record.gradeLive.textContent=active?'G'+state.lastGrade+' → G'+state.grade+'\n'+rows.length+'枠入替':'';
  record.gradeLive.setAttribute('aria-label',active?'グレード '+state.lastGrade+' から '+state.grade+'、'+rows.length+'枠入れ替え':'');
  if(active)lastGrade={ball:state.draws.length,from:state.lastGrade,to:state.grade,rows:[...rows],pow:!!state.lastPowActive,rankStep,win:false,still:!!options.still};
 }
 const odds=R?.topPrizeHundredths?.(currentGrade)??R?.topRefills?.[currentGrade]??0;
 const won=(value)=>native.medal?native.medal(bet,value):Math.floor(bet*value/100);
 const next=won(baseline+odds)-won(baseline),topKey=[bet,currentGrade,baseline,next].join('/');
 if(record.topKey!==topKey){
  record.topKey=topKey;record.top.title='現在の BET '+bet+'：次に補充する上段は '+next+' WIN';
  record.top.setAttribute('aria-label','次の上段 '+next+' WIN');fittedAmount(record.nextAmount,next,8,record.nextAmount.clientWidth||52);
 }
 stats.decorate++;return true;
}
window.WaffleArtV301=Object.freeze({
 version:301,ready,get loaded(){return loaded;},get epoch(){return loaded?'301-ready':'301-pending';},
 board,piece,pocket,rim,furniture,grade,decorate,install,bindNative,fitAmount:fittedAmount,fitTurn,bonus,
 url:name=>loaded?imageUrl(name):null,sprite:name=>loaded?sprites.get(name)||null:null,
 asset:name=>loaded&&FILES[name]?ROOT+FILES[name]+'?v=301':null,
 describe:()=>({version:301,loaded,files:Object.values(FILES).map(file=>ROOT+file),errors:[...errors],...stats,
  sourceRects:Object.fromEntries([...rects].map(([name,box])=>[name,[...box]])),sourceFiles:Object.fromEntries(sourceFiles),
  pieceSizes:[...PIECE_SIZES],pieceCacheCount:pieceCache.size,pieceCacheLimit:6,boardCacheCount:boards.size,boardCacheLimit:BOARD_LIMIT,
  spriteCacheCount:sprites.size,urlCacheCount:urls.size,cachedPixels,decodedPixels,lastGrade:lastGrade?{...lastGrade,rows:[...lastGrade.rows]}:null,
  nativeBound:{fitNumber:!!native.fitNumber,medal:!!native.medal},
  geometry:{cells:64,numberedOpening:20,offBoardNumbers:5,rimRatio:.064,pieceRatio:.90,payoutRows:13,turns:8},numbers:'native',timing:'native-shared-clock'})
});
})();

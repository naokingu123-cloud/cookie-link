/* Generated bitmap artwork for Cookie Link, Chocolate Canyon and Six Drop.
 * Loaded at the end of the game's private scope, after the v247 adapter.
 * Rendering only: no engine, RNG, board geometry or payout changes. */
(()=>{
'use strict';
const A=window.SweetsCartoonArt;
if(!A?.loaded)return;
const selected=new Set(window.SweetsLineup?.chosen||[]);
if(!['cookie','choco','candy'].some(id=>selected.has(id)))return;
const cache=new Map(),urls=new Map(),derivedSources=new WeakMap();
const flavor=['berry','honey','pistachio','soda','grape'];
const candyColors=['blue','aqua','green','lime','yellow','orange','red','violet','pink'];
const root=document.documentElement;
root.classList.add('cartoon-boards-a-v272');
function canvas(w,h=w){const cv=document.createElement('canvas');cv.width=w;cv.height=h;return cv;}
function contain(ctx,source,x,y,w,h){
 if(!source)return false;
 const sw=source.naturalWidth||source.width,sh=source.naturalHeight||source.height;
 if(!(sw>0&&sh>0))return false;
 const k=Math.min(w/sw,h/sh),dw=sw*k,dh=sh*k;
 ctx.drawImage(source,x+(w-dw)/2,y+(h-dh)/2,dw,dh);return true;
}
function bitmapURL(key,source){if(!source)return '';if(!urls.has(key))urls.set(key,source.toDataURL('image/png'));return urls.get(key);}
function frameURL(game,w,h,thickness,fill=''){
 const key='frame/'+game+'/'+w+'/'+h+'/'+thickness+'/'+fill;
 if(urls.has(key))return urls.get(key);
 const cv=canvas(w,h),ctx=cv.getContext('2d');
 if(fill){ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(1,1,w-2,h-2,Math.min(14,thickness));ctx.fill();}
 if(!A.frame(ctx,game,0,0,w,h,thickness))return '';
 return bitmapURL(key,cv);
}
for(const [game,w,h,t] of [['cookie',322,322,12],['candy',320,320,8],['choco',430,520,9]]){
 const src=frameURL(game,w,h,t);if(src)root.style.setProperty('--cb272-frame-'+game,'url("'+src+'")');
}
const panelSrc=frameURL('candy',160,120,7,'#473073');
if(panelSrc)root.style.setProperty('--cb272-candy-panel','url("'+panelSrc+'")');

/* The same generated biscuit is used by DOM tiles, miniatures, shards,
 * flying hammers and the deterministic BET tutorial. */
function cookieSprite(color,special=false){
 const index=((Number(color)||0)%5+5)%5,key='cookie/'+index+'/'+Number(special);
 if(cache.has(key))return cache.get(key);
 const body=A.sprite('cookie-'+flavor[index]);if(!body)return null;
 const cv=canvas(128),ctx=cv.getContext('2d');contain(ctx,body,1,1,126,126);
 if(special)contain(ctx,A.sprite('hammer'),13,7,102,110);
 derivedSources.set(cv,Object.freeze(['cookie-'+flavor[index],...(special?['hammer']:[])]));
 cache.set(key,cv);return cv;
}
function cookieURL(color,special=false){return bitmapURL('cookie/'+color+'/'+Number(special),cookieSprite(color,special));}
const originalDecor=syncTileDecor;
if(selected.has('cookie')){
 syncTileDecor=function(el,t){
  const result=originalDecor.apply(this,arguments),img=el?.querySelector('.cookie-face'),src=cookieURL(t.color,!!t.special);
  if(img&&src&&img.getAttribute('src')!==src)img.setAttribute('src',src);
  if(img)img.dataset.cartoonArt='cookie-'+flavor[t.color%5];
  return result;
 };
 for(let c=0;c<5;c++)for(let special=0;special<2;special++){
  const sprite=cookieSprite(c,!!special);if(!sprite)continue;
  // Legacy canvas consumers check Image-like readiness before drawImage.
  // These already decoded canvases avoid a blank frame during data-URL decode.
  sprite.complete=true;sprite.naturalWidth=sprite.width;sprite.naturalHeight=sprite.height;
  cookieSprites[c*2+special]=sprite;
 }
 const originalBetCookie=betCookie;
 betCookie=function(ctx,color,x,y,size,hammer=false){
  const sprite=cookieSprite(color,hammer);
  if(!sprite)return originalBetCookie.apply(this,arguments);
  contain(ctx,sprite,x-size/2,y-size/2,size,size);
 };
}

/* Keep same-color strata joined. Connected edges sample the interior of
 * the generated cake; disconnected edges retain the drawn outline.
 * The 96 px surface is required by the native melting-strip animation. */
const chocoBaseNames=['choco-milk','choco-berry','choco-ivory','choco-dark'];
const chocoMid=['#ba794b','#ed8caf','#f6df99','#71404d'];
function cakeSprite(color,mask=0,variant=0,kind='fruit'){
 const baseIndex=color<4?Math.max(0,color):2,source=A.sprite(chocoBaseNames[baseIndex]);
 if(!source)return null;
 const canonical=typeof chocoCanonicalMask==='function'?chocoCanonicalMask(mask):mask;
 const key='cake/'+color+'/'+canonical+'/'+kind;if(cache.has(key))return cache.get(key);
 let base=cache.get('cake-base/'+baseIndex);
 if(!base){
  base=canvas(96);const b=base.getContext('2d');
  b.fillStyle=chocoMid[baseIndex];b.beginPath();b.roundRect(1,1,94,94,8);b.fill();
  b.drawImage(source,0,0,96,96);cache.set('cake-base/'+baseIndex,base);
 }
 const cv=canvas(96),ctx=cv.getContext('2d'),from=base.getContext('2d').getImageData(0,0,96,96).data,out=ctx.createImageData(96,96),pixels=out.data;
 const connectedCoord=(p,lo,hi)=>lo&&p<18?48+(p/18)*(18-48):hi&&p>77?77+((p-77)/18)*(48-77):p;
 for(let y=0;y<96;y++)for(let x=0;x<96;x++){
  const sx=Math.round(connectedCoord(x,canonical&8,canonical&2)),sy=Math.round(connectedCoord(y,canonical&1,canonical&4)),src=(sy*96+sx)*4,dst=(y*96+x)*4;
  for(let k=0;k<4;k++)pixels[dst+k]=from[src+k];
  for(const [hb,vb,diag,cx,cy] of [[8,1,16,0,0],[2,1,32,95,0],[8,4,128,0,95],[2,4,64,95,95]]){
   const dx=Math.abs(x-cx),dy=Math.abs(y-cy);
   if(!(canonical&hb)&&!(canonical&vb)&&dx<6&&dy<6)pixels[dst+3]=Math.min(pixels[dst+3],Math.max(0,Math.min(255,(6-Math.hypot(6-dx,6-dy))*255)));
   if((canonical&hb)&&(canonical&vb)&&!(canonical&diag)&&dx<4&&dy<4)pixels[dst+3]=Math.min(pixels[dst+3],Math.max(0,Math.min(255,(Math.hypot(dx,dy)-3)*255)));
  }
 }
 ctx.putImageData(out,0,0);
 // Keep a read-only provenance label for the image-data autotile path.
 // Unlike drawImage, putImageData itself cannot retain source identity.
 derivedSources.set(cv,Object.freeze([chocoBaseNames[baseIndex]]));
 if(color>=4){
  const gemKinds=['candy-blue','candy-green','candy-yellow','gem-red','gem-violet','ore-diamond'];
  const gemIndex=color>=5?color-5:CHOCO_BONUS_GEMS.indexOf(kind);
  if(gemIndex>=0)contain(ctx,A.sprite(gemKinds[gemIndex%gemKinds.length]),27,25,42,45);
  else for(const [name,x] of [['candy-pink',9],['candy-yellow',37],['candy-green',65]])contain(ctx,A.sprite(name),x,8,23,23);
 }
 cache.set(key,cv);return cv;
}
if(selected.has('choco')){
 const originalAuto=chocoAutoSprite;
 chocoAutoSprite=function(color,mask,variant=0,kind='fruit'){return cakeSprite(color,mask,variant,kind)||originalAuto.apply(this,arguments);};
 chocoSprites.clear();chocoItemCakeCache.clear();
 const originalItem=chocoDrawItem;
 chocoDrawItem=function(ctx,t,cx,cy,size,time=0,label=true,bet=100){
  const name=t.item==='ore'?'ore-'+t.ore:t.item==='sugar'?'sugar-star':null,art=name&&A.sprite(name);
  if(!art)return originalItem.apply(this,arguments);
  ctx.save();contain(ctx,art,cx-size/2,cy-size/2,size,size);
  if(t.item==='ore')chocoSparkle(ctx,cx,cy,size,time,t.id||0,Object.keys(CHOCO_ORES).indexOf(t.ore)+1);
  else if(label)chocoText(ctx,'S',cx,cy+size*.04,size*.35,'#fff9d8');
  ctx.restore();
 };
 chocoDepthBackground=function(ctx,W,H,depth,travel){
  const scene=chocoDepthBlend(depth),tones=['#38505e','#526775','#785577','#5d414d','#3e344c','#354b70','#2e5b60','#66553f','#6d3f59','#50416b','#4c6477'];
  ctx.save();ctx.fillStyle=tones[scene.a%tones.length];ctx.fillRect(0,0,W,H);
  const shift=((Number(travel)||0)*.18)%78;
  ctx.globalAlpha=.2;
  for(let i=-1;i<Math.ceil(H/78)+1;i++){
   const y=i*78-shift;A.draw(ctx,'choco-milk',1,y,50,62);A.draw(ctx,'choco-dark',W-49,y+28,48,62);
  }
  ctx.globalAlpha=.44;
  for(const [name,x,y] of [['gem-violet',W-39,H*.43],['ore-gold',9,H*.35],['ore-diamond',W-30,H*.72]])A.draw(ctx,name,x,y,25,26);
  ctx.globalAlpha=1;A.frame(ctx,'choco',0,0,W,H,7);ctx.restore();
 };
 chocoCavity=function(ctx,L){
  const {left,top,w,h}=L;ctx.save();ctx.fillStyle='#2f2944';ctx.fillRect(left,top,w*7,h*12);
  const seat=A.sprite('choco-seat');
  if(seat){ctx.globalAlpha=.55;for(let r=0;r<12;r++)for(let c=0;c<7;c++)ctx.drawImage(seat,left+c*w,top+r*h,w,h);}
  ctx.restore();
 };
 chocoDetectorFrame=function(ctx,x,y,w,h){
  ctx.save();ctx.fillStyle='#29364b';ctx.beginPath();ctx.roundRect(x,y,w,h,7);ctx.fill();A.frame(ctx,'choco',x,y,w,h,5);ctx.restore();
 };
 const payout=frameURL('choco',180,224,12,'#30324b');if(payout)chocoPayoutFrame.src=payout;
}

/* v247 uses absolute colors. Legacy rounds retain their existing palettes;
 * exact numbers and all physics continue through the native renderer. */
function candySprite(name){
 const key='drop/'+name;if(cache.has(key))return cache.get(key);
 const source=A.sprite('candy-'+name)||A.sprite(name==='diamond'?'ore-diamond':name==='silver'?'ore-silver':'ore-gold');
 if(!source)return null;
 const cv=canvas(128);contain(cv.getContext('2d'),source,2,2,124,124);
 derivedSources.set(cv,Object.freeze([A.sprite('candy-'+name)?'candy-'+name:name==='diamond'?'ore-diamond':name==='silver'?'ore-silver':'ore-gold']));
 cache.set(key,cv);return cv;
}
function roleURL(type){
 const key='role/'+type;if(urls.has(key))return urls.get(key);
 const cv=canvas(120),ctx=cv.getContext('2d'),positions=type==='line'?[[23,95],[47,71],[71,47],[95,23]]:type==='triangle'?[[60,24],[43,53],[77,53],[26,82],[60,82],[94,82]]:Array.from({length:6},(_,i)=>[60+36*Math.cos(i*Math.PI/3-Math.PI/2),60+36*Math.sin(i*Math.PI/3-Math.PI/2)]);
 const art=candySprite(type==='line'?'blue':type==='triangle'?'green':'pink');
 if(!art)return '';
 for(const [x,y] of positions)ctx.drawImage(art,x-17,y-17,34,34);
 return bitmapURL(key,cv);
}
if(selected.has('candy')){
 const originalCandy=sixArtCandySprite,originalTutorial=sixDrawTutorial;
 sixArtCandySprite=function(color,round=1,sugar=false,chance=false){
  const progressive=window.SixDropV247?.engine?.rulesVersion===247;
  const theme=chance?SIX_CHANCE_THEME:sixRoundTheme(round),name=progressive?candyColors[Math.max(0,Math.min(8,Number(color)|0))]:theme.colors[color%theme.colors.length];
  return candySprite(name)||originalCandy.apply(this,arguments);
 };
 const backdropCache=new Map();
 sixArtBackdrop=function(rows){
  const layout=sixLayout(rows),key=rows+'/'+layout.step;if(backdropCache.has(key))return backdropCache.get(key);
  const cv=canvas(640),ctx=cv.getContext('2d');ctx.scale(2,2);ctx.fillStyle='#293968';ctx.fillRect(0,0,320,320);
  const seat=A.sprite('hex-seat');ctx.globalAlpha=.42;
  if(seat)for(let r=0;r<rows;r++)for(let c=0;c<sixRowWidth(r,rows);c++){
   const p=sixXY(r,c,rows),diameter=layout.radius*1.95;contain(ctx,seat,p.x-diameter/2,p.y-diameter/2,diameter,diameter);
  }
  ctx.globalAlpha=1;backdropCache.set(key,cv);return cv;
 };
 sixDrawTutorial=function(s,time,bet){
  const machine=window.SixDropV247;
  if(s.engine?.rulesVersion!==247||!machine)return originalTutorial.apply(this,arguments);
  const ctx=s.candyCtx;ctx.setTransform(2,0,0,2,0,0);ctx.clearRect(0,0,320,320);ctx.drawImage(sixArtBackdrop(10),0,0,320,320);
  const page=Math.floor(time/3500)%4,lines=[['同色4個以上で消去','曲がったつながりでもOK'],['役の色を全部消去！','直線 → △ → ⬡ で高配当'],['1個消去でBET×0.05','100個ごとに次ゲームから新色'],['全消しで総取り！','獲得後も継続・0 WINでリセット']][page];
  ctx.save();ctx.fillStyle='#233451';ctx.beginPath();ctx.roundRect(18,65,284,190,18);ctx.fill();A.frame(ctx,'candy',18,65,284,190,9);
  const colors=s.engine.state?.palette||machine.rules.palette(machine.carry.removed);
  for(let i=0;i<4;i++){const art=candySprite(candyColors[colors[i]]);if(art)ctx.drawImage(art,40+i*62,90+Math.sin(time/400+i)*8,48,48);}
  sixText(ctx,lines[0],160,177,page===3?18:20,'#fff2ad');sixText(ctx,lines[1],160,210,12,'#e6faff');ctx.restore();
 };
 sixArtCache.clear();
}

/* Existing HUDs may create new icons after a bet/tab update. Only replace
 * recognized legacy artwork paths; event handlers and live labels survive. */
const cookiePath=/(?:^|\/)sweet-skins\/(cookie|hammer)-(berry|honey|pistachio|soda|grape)\.webp(?:[?#].*)?$/;
const rolePath=/(?:^|\/)sweet-skins\/six-(line|triangle|hexagon)\.webp(?:[?#].*)?$/;
function refreshImage(img){
 const old=img.getAttribute('src')||'',match=old.match(cookiePath),role=old.match(rolePath);
 let src='';if(match&&selected.has('cookie'))src=cookieURL(flavor.indexOf(match[2]),match[1]==='hammer');
 else if(role&&selected.has('candy'))src=roleURL(role[1]);
 if(src&&src!==old){img.setAttribute('src',src);img.dataset.cartoonArt=match?'cookie':'candy-role';}
}
function refreshNode(node){
 if(node?.nodeType!==1)return;
 if(node.matches('img'))refreshImage(node);node.querySelectorAll('img').forEach(refreshImage);
 if(selected.has('cookie'))for(const svg of node.querySelectorAll('.basket>svg:not([data-cartoon-art])')){
  const src=A.url('cookie-basket');if(!src)continue;
  const im=document.createElementNS('http://www.w3.org/2000/svg','image');im.setAttribute('href',src);im.setAttribute('x','0');im.setAttribute('y','0');im.setAttribute('width','40');im.setAttribute('height','36');im.setAttribute('preserveAspectRatio','xMidYMid meet');svg.replaceChildren(im);svg.dataset.cartoonArt='cookie-basket';
 }
}
refreshNode(document.body);
const observer=new MutationObserver(records=>{
 for(const record of records){if(record.type==='attributes')refreshImage(record.target);else for(const node of record.addedNodes)refreshNode(node);}
});
observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['src']});
for(const s of slots){
 s.dirtyMain=s.dirtyMini=true;
 if(s.engine?.kind==='choco'){s.chocoReachKey='';chocoQueueFrame(s);}
 if(s.engine?.kind==='candy'){s.candyKey='';carnivalQueueFrame(s);}
}
scheduleUI(app);
window.SweetsCartoonBoardsAV272=Object.freeze({version:272,sourcesOf:bitmap=>derivedSources.get(bitmap)||[],describe:()=>({art:A.epoch,games:[...selected].filter(id=>['cookie','choco','candy'].includes(id)),cachedSprites:cache.size,generatedURLs:urls.size,geometry:'native',rules:'unchanged'})});
})();

/* SWEETS LINK v24 - mini board performance pass
 * ③ Canyon: original cake art / auto-tile / falling, without the
 *   full-size mine compositor, left/right scenery or payout panel.
 * ④ Six Drop: real full-resolution candy textures and movement,
 *   skipping per-piece glow and spark particle work in miniature only.
 * ⑤ Static boards repaint only on engine state / asset changes.
 * ⑥ Reuse precomposited candy+number sprites, bottle frame and background.
 * Shared draw numbers/odds/engine state are NOT touched by this module.
 */
(()=>{
'use strict';
try{
 const oldPaint=window.sweets12ThumbnailRenderer;
 if(typeof oldPaint!=='function')throw Error('v22 mini renderer not loaded');
 const SIZE=80,SPRITE_SIZE=48,CACHE_LIMIT=288;
 const views=new Map(),candyTiles=new Map(),backdrops=new Map();
 let assetEpoch=0,painted=0,skipped=0,failed=0;
 let originalPngReady=!!sixCandyPngState.loaded;
 const artSrc={
  land:'assets/sixdrop-candy-kingdom-20261031.webp?v=1',
  side:'assets/sixdrop_glass_sideframe.png?v=8',
  cap:'assets/sixdrop_candy_lid.png?v=8'
 };
 const imgs={};
 // Assets can finish loading after the last gameplay event. Explicitly
 // wake the event-driven mini scheduler instead of restoring old polling.
 if(typeof sixCandyPng!=='undefined'&&sixCandyPng?.addEventListener)
   sixCandyPng.addEventListener('load',()=>{
     candyTiles.clear();assetEpoch++;
     window.sweets12FrameScheduler?.markAll();
   });
 for(const [name,src] of Object.entries(artSrc)){
  const img=new Image();imgs[name]=img;
  img.onload=()=>{assetEpoch++;backdrops.clear();
    window.sweets12FrameScheduler?.markAll();};
  img.onerror=()=>{assetEpoch++;backdrops.clear();
    window.sweets12FrameScheduler?.markAll();};
  img.decoding='async';img.src=src;
 }
 const cv=(w=SIZE,h=w)=>{
  const c=document.createElement('canvas');
  c.width=w;c.height=h;return c;
 };
 const isLoaded=img=>!!img?.complete&&!!img.naturalWidth;
 const clamp=(n,a=0,b=1)=>Math.min(b,Math.max(a,n));
 const getSprites=(tile,engine,bet)=>{
  const round=engine.roundIndex||1,chance=engine.chanceRound===engine.roundIndex;
  const level=tile.sugar?Math.max(0,Math.min(6,wonderTier(bet))):0;
  const number=tile.number==null?0:tile.number;
  const key=[round,chance?1:0,tile.color,number,level].join('/');
  if(candyTiles.has(key))return candyTiles.get(key);
  const src=sixArtCandySprite(tile.color,round,!!tile.sugar,chance);
  if(!src)return null;
  // One pre-scaled 48px sprite for all twelve boards; the original
  // 128px image remains in the shared main-game cache.
  const c=cv(SPRITE_SIZE),ctx=c.getContext('2d');
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.drawImage(src,0,0,SPRITE_SIZE,SPRITE_SIZE);
  if(tile.sugar){
   const sugar=getSugarSprite(level);
   if(sugar)ctx.drawImage(sugar,6,6,36,36);
  }
  if(number){
   // The same number artwork used on the main bottle's candy.
   sixPaintCandyNumber(ctx,number,24,25,24);
  }
  // Bound all shared sprites to ~5 MiB; keep recently used ones.
  if(candyTiles.size>=CACHE_LIMIT){
   const oldest=candyTiles.keys().next().value;
   candyTiles.delete(oldest);
  }
  candyTiles.set(key,c);
  return c;
 };
 const getBackdrop=(rows)=>{
  const key=rows+'/'+assetEpoch;
  if(backdrops.has(key))return backdrops.get(key);
  const bg=cv(),bc=bg.getContext('2d'),glass=cv(),gc=glass.getContext('2d');
  bc.imageSmoothingEnabled=gc.imageSmoothingEnabled=true;
  const original=sixArtBackdrop(rows);
  if(original)bc.drawImage(original,0,0,SIZE,SIZE);
  if(isLoaded(imgs.land)){
   bc.save();
   bc.globalAlpha=.18;
   bc.drawImage(imgs.land,0,0,SIZE,SIZE);
   bc.restore();
  }
  if(isLoaded(imgs.side)){
   gc.globalAlpha=.75;
   gc.drawImage(imgs.side,0,0,SIZE,SIZE);
   gc.globalAlpha=1;
  }
  if(isLoaded(imgs.cap)){
   gc.globalAlpha=.90;
   gc.drawImage(imgs.cap,0,0,SIZE,SIZE*.18);
   gc.globalAlpha=1;
  }
  const result={bg,glass};
  backdrops.set(key,result);
  if(backdrops.size>4)backdrops.delete(backdrops.keys().next().value);
  return result;
 };
 function getFx(e,view,now){
  const src=e.fx;
  if(view.lastFx!==src){
   view.lastFx=src;view.fxBegin=now;
   view.fxStart=src?.elapsed||0;
   // Allocate once per effect stage, not once per preview frame.
   view.fxFrame=src?{...src}:null;
  }
  if(!src)return null;
  const ms=Math.max(1,Number(src.ms)||1);
  // Engine playback remains authoritative; local interpolation can
  // only paint a copy, not mutate the original animation timestamp.
  const elapsed=Math.max(Number(src.elapsed)||0,
    view.fxStart+(app.paused?0:(now-view.fxBegin)*Math.min(3,Math.max(1,e.speed||1))));
  view.fxFrame.elapsed=clamp(elapsed,0,ms);
  return view.fxFrame;
 }
 function canyonPaint(item,e,view,fx,now){
  const g=item.ctx,physical=g.canvas.width||48;
  const factor=physical/48;
  const cw=5.9,ch=3.8,left=3.35,top=1.05;
  const old=fx?.before;
  const stage=fx?.phase||'';
  const grid=old&&['canyonFall','canyonMelt','canyonSoften','canyonScroll'].includes(stage)
    ?old:e.strata;
  if(!Array.isArray(grid))return false;
  const progress=fx?.ms?clamp(fx.elapsed/fx.ms):1;
  const moves=view.canyonMoves||(view.canyonMoves=new Map());
  const gone=view.canyonGone||(view.canyonGone=new Set());
  const softened=view.canyonSoft||(view.canyonSoft=new Set());
  moves.clear();gone.clear();softened.clear();
  if(stage==='canyonFall')for(const m of fx.moves||[])moves.set(m.id,m);
  if(stage==='canyonMelt')for(const v of fx.targets||[])
    if(v.tile?.id!=null)gone.add(v.tile.id);
  if(stage==='canyonSoften')for(const v of fx.targets||[])
    if(v.tile?.id!=null)softened.add(v.tile.id);
  const scroll=stage==='canyonScroll'?(fx.advanced||0)*progress:0;
  g.save();
  g.setTransform(factor,0,0,factor,0,0);
  g.clearRect(0,0,48,48);
  g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
  g.fillStyle='#31212b';g.fillRect(0,0,48,48);
  g.beginPath();g.rect(left,top,cw*7,ch*12);g.clip();
  const paint=(t,r,c,grid,row,alpha=1)=>{
   if(!t)return;
   const x=left+c*cw,y=top+row*ch;
   if(y>48||y+ch<0)return;
   if(alpha<1)g.globalAlpha=alpha;
   if(t.color<0||t.encased||softened.has(t.id)){
     chocoPaintTile(g,t,r,c,grid,x,y,cw,ch,now,view.bet);
   }else{
     // Same original cake/auto-tile asset as chocoPaintTile, but skip
     // all offscreen depth shading, payouts, walls and glints.
     const image=chocoAutoSprite(t.color,chocoTileMask(grid,r,c),
       (t.id||0)%6,t.bonusKind||'fruit');
     if(image)g.drawImage(image,x,y,cw,ch);
   }
   if(alpha<1)g.globalAlpha=1;
  };
  for(let r=0;r<12;r++)for(let c=0;c<7;c++){
   const t=grid[r]?.[c];if(!t)continue;
   const move=moves.get(t.id);
   const row=(move?move.from[0]+(move.to[0]-move.from[0])*progress:r)-scroll;
   paint(t,r,c,grid,row,gone.has(t.id)?Math.max(.07,1-progress):1);
  }
  if(stage==='canyonScroll'&&scroll>0){
   const start=Math.max(0,12-Math.ceil(fx.advanced||0));
   for(let r=start;r<12;r++)for(let c=0;c<7;c++){
    paint(e.strata[r]?.[c],r,c,e.strata,r+(fx.advanced||0)*(1-progress));
   }
  }
  g.restore();
  painted++;
  return true;
 }
 function dropPaint(item,e,view,fx,now){
  const g=item.ctx,dim=g.canvas.width||SIZE;
  const k=dim/320,rows=e.rows||10,layout=sixLayout(rows);
  const progress=fx?.ms?clamp(fx.elapsed/fx.ms):1;
  const phase=fx?.phase||'';
  const falling=phase==='pyramidFall'?sixFallFrame(fx,progress):null;
  const transitioning=phase==='pyramidSweep'||phase==='pyramidRefill';
  const grid=transitioning?(fx.grid||e.pyramid):falling?.grid||e.pyramid;
  if(!Array.isArray(grid))return false;
  const moveMap=view.dropMoves||(view.dropMoves=new Map());
  const lit=view.dropLit||(view.dropLit=new Set());
  const formed=view.dropForms||(view.dropForms=new Set());
  moveMap.clear();lit.clear();formed.clear();
  for(const m of falling?.moves||[])moveMap.set(m.id,m);
  if(phase==='pyramidHit')for(const p of fx.cells||[])lit.add(sixKey(...p));
  for(const form of fx?.forms||[])for(const p of form.cells||[])
    formed.add(sixKey(...p));
  const {bg,glass}=getBackdrop(rows);
  g.save();
  g.setTransform(1,0,0,1,0,0);
  g.clearRect(0,0,dim,dim);
  g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
  g.drawImage(bg,0,0,dim,dim);
  g.scale(k,k);
  for(let r=0;r<grid.length;r++)for(let c=0;c<(grid[r]?.length||0);c++){
   const t=grid[r][c];if(!t)continue;
   let pos=sixXY(r,c,rows);
   const m=moveMap.get(t.id);
   if(m && falling){
    const pt=sixMotionPoint(m,falling.progress);
    pos={x:160+pt.x*layout.step,y:layout.top+pt.y*layout.step};
   }
   if(phase==='pyramidTopUp'&&fx.added?.some(a=>a.tile?.id===t.id)){
    const pose=sixGlassPose(fx.rowOrder||sixGlassRows(fx.added,rows),
      r,progress*fx.ms,false);
    if(!pose.visible)continue;pos.y+=pose.offset;
   }
   const tp=transitioning?sixTransitionPose(fx,r,c,t,rows,progress,false):null;
   if(tp&&!tp.visible)continue;
   if(tp)pos=tp;
   const image=getSprites(t,e,view.bet);
   if(!image)continue;
   const radius=layout.radius;
   // Preserve fall, sweep, refill and hit bounce. Per-candy shadowBlur,
   // animated glow particles, repeated gradients and gleams are omitted.
   g.save();
   g.translate(pos.x,pos.y);
   if(tp){g.globalAlpha=tp.alpha;g.rotate(tp.rotation);g.scale(tp.scale,tp.scale);}
   if(m&&falling){
    const a=sixPoint(...m.from,rows),b=sixPoint(...m.to,rows);
    g.rotate(Math.sign(b.x-a.x||1)*.16*Math.sin(Math.PI*falling.progress));
   }
   if(lit.has(sixKey(r,c))&&phase==='pyramidHit'){
    const bounce=Math.sin(Math.PI*progress);
    g.scale(1+.06*bounce,1-.07*bounce);
   }
   g.drawImage(image,-radius,-radius,radius*2,radius*2);
   if(lit.has(sixKey(r,c))||formed.has(sixKey(r,c))){
    g.strokeStyle=formed.has(sixKey(r,c))?'#fff2af':'#ffffff';
    g.lineWidth=1.1;
    g.beginPath();g.arc(0,0,radius*.92,0,Math.PI*2);g.stroke();
   }
   g.restore();
  }
  g.setTransform(1,0,0,1,0,0);
  g.drawImage(glass,0,0,dim,dim);
  g.restore();
  painted++;
  return true;
 }
 function smartPaint(item,data){
  if(!data?.engine)return false;
  // The main artwork switches from temporary vectors to the user's
  // approved PNG asynchronously. Drop *all* composite fallback sprites
  // when that source becomes ready so none stay simplified forever.
  const pngReady=!!sixCandyPngState.loaded;
  if(pngReady!==originalPngReady){
    originalPngReady=pngReady;
    candyTiles.clear();
    assetEpoch++;
  }
  if(item.game===0)return oldPaint(item,data); // Cookie main-art renderer
  const e=data.engine,id=data.id;
  let view=views.get(id);
  if(!view||view.engine!==e){
   view={engine:e,stamp:0,lastKey:'',lastEvent:null,lastFx:null,
     fxBegin:0,fxStart:0,bet:data.bet,paintCost:0,failed:false};
   views.set(id,view);
  }
  view.bet=data.bet;
  const now=performance.now();
  const phase=e.phase||'',fx=e.fx;
  const fxChanged=view.lastFx!==fx;
  const elapsed=fxChanged?0:now-view.fxBegin;
  const activeFx=!!fx&&!!e.busy&&elapsed<Math.min(600,(fx.ms||0)+100);
  const pending=!!e.pendingDraws?.size;
  // No 750-ms polling redraws for completely static boards.
  const key=[e.version,phase,e.processed||0,e.boardGeneration||0,
    e.totalHundredths||0,e.depth||0,e.roundIndex||0,data.bet,
    e.pendingDraws?.size||0,data.event?.phase||'',assetEpoch].join('/');
  const changed=view.lastKey!==key||fxChanged||view.lastEvent!==data.event;
  if(!changed&&!activeFx&&!pending){skipped++;return true;}
  // Up to ~10fps while moving in the active game, less in other groups.
  const penalty=Math.min(300,Math.max(0,view.paintCost-6)*14);
  const interval=(item.game===active?100:220)+penalty;
  if(!changed&&now-view.stamp<interval){skipped++;return true;}
  const originalFx=e.fx;const frameFx=getFx(e,view,now);
  const t0=performance.now();
  let ok=false;
  try{
   if(item.game===1)ok=canyonPaint(item,e,view,frameFx,now);
   else ok=dropPaint(item,e,view,frameFx,now);
  }catch(error){
   if(!view.failed||now-(view.warnAt||0)>15000){
    console.warn('[Sweets12MiniV24] mini paint fallback '+id,error);
    view.warnAt=now;
   }
   view.failed=true;failed++;
   return oldPaint(item,data);
  }
  if(!ok)return oldPaint(item,data);
  view.stamp=now;view.lastKey=key;view.lastEvent=data.event;
  view.paintCost=view.paintCost*.8+(performance.now()-t0)*.2;
  view.failed=false;
  // The actual e.fx must remain untouched by the thumbnail animation.
  if(e.fx!==originalFx)console.warn('[Sweets12MiniV24] unexpected engine FX mutation');
  return true;
 }
 window.sweets12ThumbnailRenderer=smartPaint;
 window.sweets12MiniPerformance={
  get renders(){return painted;},
  get skipped(){return skipped;},
  get errors(){return failed;},
  get cachedCandySprites(){return candyTiles.size;},
  get cachedBackdrops(){return backdrops.size;},
  get activeViews(){return views.size;},
  get outputPixels(){return SIZE;},
  get spritePixels(){return SPRITE_SIZE;}
 };
 console.info('[Sweets12MiniV24] cake-only draw, cached glossy candy PNGs, static redraw skipping');
}catch(error){console.error('[Sweets12MiniV24]',error);}
})();
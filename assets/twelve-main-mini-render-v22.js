/* SWEETS LINK v22 -- genuine game renderer for the 12 real mini boards.
 * Uses the SAME renderer and art primitives as the full main game.
 * Each offscreen paint buffer is only 112px (instead of 640/860px).
 * Decouples mini animation timestamps from the live engine state.
 * Important: do NOT allocate full-size 860x1040 background canvases for
 * individual mini screens; the spoofed CSS-coordinate canvas leaves the
 * physical backing store at a tiny, explicitly bounded resolution.
 */
(()=>{
'use strict';
try{
 const NUM_PIXELS=64;
 const views=new Map();
 const imageCache=new Map();
 const cheapCanvas=(width,height,cssWidth,cssHeight,modelScale)=>{
   const canvas=document.createElement('canvas');
   canvas.width=width;canvas.height=height;
   const context=canvas.getContext('2d',{alpha:true});
   if(!context)throw Error('Small Canvas context unavailable');
   // Main renderers draw at 430x520 (Canyon) or 320x320 (Six).
   // Preserve their coordinate systems while reducing physical pixels.
   const native=context.setTransform.bind(context);
   context.setTransform=function(a,b,c,d,e,f){
     if(arguments.length===6)
       return native(a*modelScale,b*modelScale,c*modelScale,d*modelScale,e*modelScale,f*modelScale);
     return native(a);
   };
   if(cssWidth){
     // drawChoco uses width to decide if it must allocate 860x1040.
     // The backing store is still 112x136 physically, not 860x1040.
     Object.defineProperty(canvas,'width',{configurable:true,get:()=>cssWidth,set(){}});
     Object.defineProperty(canvas,'height',{configurable:true,get:()=>cssHeight,set(){}});
   }
   return {canvas,context};
 };
 const approx=(a,b)=>Math.max(1,Math.round(a*b));
 const createBase=(data,kind)=>{
   const group=data.game;
   const mini=document.createElement('canvas');
   mini.width=160;mini.height=160;
   const base={
     __sweetsThumbnail:true,
     i:100+data.id,engine:data.engine,
     event:{phase:'ready'},miniCanvas:mini,mini:mini.getContext('2d'),
     miniLogo:{hidden:false},candyStatus:{textContent:''},
     chocoStatus:{textContent:''},sugarAwardMini:null,
     reachResults:[],sixSparkleIds:new Set(),
     sixSparkleVersion:null, chocoPayoutFlights:[],
     tabDepth:document.createElement('span'),
     chocoCart:document.createElement('canvas'),
     cookieMiniSurface:null
   };
   base.chocoCart.width=190;base.chocoCart.height=150;
   if(group===0){
     // Original Cookie Link miniature(s) renders real cookie PNGs,
     // numbers, sugar, cracks and falling motion from cookieMiniEvent.
     const c=cheapCanvas(96,96,0,0,96/640);
     base.cookieMiniSurface=c.canvas;
     base.cookieMiniScalePatched=true;
     base.cookieMiniEventVersion=null;
     return {base,mode:'cookie',stamp:0,failed:false,phase:''};
   }
   if(group===1){
     const size=40,ht=approx(size,520/430),factor=(size/430)/2;
     const surface=cheapCanvas(size,ht,860,1040,factor);
     const board=cheapCanvas(size,ht,860,1040,factor);
     surface.canvas.getBoundingClientRect=()=>({width:430,height:520,left:0,top:0,right:430,bottom:520});
     base.chocoCanvas=surface.canvas;base.chocoCtx=surface.context;
     base.chocoBoardLayer=board.canvas;
     // The main renderer crops its large offscreen board into its old
     // 160px tab thumbnail. Translate those source coordinates to our
     // reduced backing store to prevent a clipped drawImage exception.
     const miniDraw=base.mini.drawImage.bind(base.mini);
     base.mini.drawImage=function(source,...args){
       if(source===base.chocoBoardLayer && args.length===8){
         const shrink=size/860;
         return miniDraw(source,
           args[0]*shrink,args[1]*shrink,args[2]*shrink,args[3]*shrink,
           args[4],args[5],args[6],args[7]);
       }
       return miniDraw(source,...args);
     };
     // Helpers query this canvas for the mini's own 7-segment display.
     return {base,mode:'canyon',stamp:0,failed:false,phase:''};
   }
   const size=64;
   const surface=cheapCanvas(size,size,0,0,(size/320)/2);
   base.candyCanvas=surface.canvas;
   base.candyCtx=surface.context;
   base.sixReachLayer={
     parentElement:{clientWidth:size,clientHeight:size},
     classList:{toggle(){}},replaceChildren(){}
   };
   return {base,mode:'drop',stamp:0,failed:false,phase:''};
 };
 function loadArt(src){
   if(imageCache.has(src))return imageCache.get(src);
   const img=new Image();
   img.decoding='async';
   img.src=src;
   imageCache.set(src,img);
   return img;
 }
 const bottleBackground=loadArt('assets/sixdrop-candy-kingdom-20261031.webp?v=1');
 const bottleRails=loadArt('assets/sixdrop_glass_sideframe_slim.png?v=11');
 const bottleCap=loadArt('assets/sixdrop_candy_lid.png?v=8');
 function applyBottle(ctx,w,h){
   // The main Six Drop jar is assembled from layered images via CSS.
   // Composite those very same images onto the reduced-size render.
   if(bottleBackground.complete&&bottleBackground.naturalWidth){
     ctx.save();
     ctx.globalCompositeOperation='destination-over';
     ctx.globalAlpha=.50;
     ctx.drawImage(bottleBackground,0,0,w,h);
     ctx.restore();
   }
   if(bottleRails.complete&&bottleRails.naturalWidth){
     ctx.save();ctx.globalAlpha=.82;
     ctx.drawImage(bottleRails,0,0,w,h);ctx.restore();
   }
   if(bottleCap.complete&&bottleCap.naturalWidth){
     ctx.save();ctx.globalAlpha=.94;
     ctx.drawImage(bottleCap,0,0,w,Math.max(7,h*.19));ctx.restore();
   }
 }
 // BET-time Canyon and rare renderer-failure fallback: still use the
 // exact main-game cake auto-tiles and connected-surface masks.
 function paintCanyonCenterOnly(g,e,now,bet){
   const fx=e.fx,grid=fx?.phase==='canyonFall'&&fx.before?fx.before:
      fx?.phase==='canyonMelt'&&fx.before?fx.before:e.strata;
   if(!Array.isArray(grid))return false;
   const cw=5.9,ch=3.8,left=3.35,top=1.05;
   const elapsed=Number(fx?.elapsed)||0;
   const p=fx?.ms?Math.max(0,Math.min(1,elapsed/fx.ms)):1;
   const moving=new Map((fx?.phase==='canyonFall'?(fx.moves||[]):[]).map(v=>[v.id,v]));
   const shifted=fx?.phase==='canyonScroll'?(fx.advanced||0)*p:0;
   g.save();
   const scale=g.canvas.width/48;
   g.setTransform(scale,0,0,scale,0,0);
   g.clearRect(0,0,48,48);
   g.fillStyle='#302026';g.fillRect(0,0,48,48);
   g.beginPath();g.rect(left,top,cw*7,ch*12);g.clip();
   for(let r=0;r<Math.min(12,grid.length);r++)
     for(let c=0;c<7;c++){
       const t=grid[r]?.[c];if(!t)continue;
       const m=moving.get(t.id);
       const row=m?m.from[0]+(m.to[0]-m.from[0])*p:r;
       const x=left+c*cw,y=top+(row-shifted)*ch;
       if(y+ch<0||y>48)continue;
       if(fx?.phase==='canyonMelt'&&fx.targets?.some(v=>v.tile?.id===t.id))
         g.globalAlpha=Math.max(.05,1-p);
       chocoPaintTile(g,t,r,c,grid,x,y,cw,ch,now,bet);
       g.globalAlpha=1;
     }
   g.restore();
   return true;
 }
 // Keep full renderer's own RAF loops from inadvertently starting
 // twelve more continuous 60fps animation loops.
 const originalCookieFrame=requestMiniFrame;
 requestMiniFrame=function(s){if(s?.__sweetsThumbnail)return;return originalCookieFrame(s);};
 const originalChocoFrame=chocoQueueFrame;
 chocoQueueFrame=function(s){if(s?.__sweetsThumbnail)return;return originalChocoFrame(s);};
 const originalCandyFrame=carnivalQueueFrame;
 carnivalQueueFrame=function(s){if(s?.__sweetsThumbnail)return;return originalCandyFrame(s);};
 const originalChocoSlot=setupChocoSlot;
 setupChocoSlot=function(s){
   if(s?.__sweetsThumbnail)return;
   return originalChocoSlot(s);
 };
 const originalCounter=sixArcadeCounter;
 sixArcadeCounter=function(s){
   if(s?.__sweetsThumbnail)return;
   return originalCounter(s);
 };
 const originalPresentation=sixReachPresentation;
 sixReachPresentation=function(s,...rest){
   if(s?.__sweetsThumbnail)return;
   return originalPresentation(s,...rest);
 };
 function captureFx(engine,view,now){
   // The full-size selected board also reads engine.fx. Never let an
   // offscreen render modify its elapsed or stamp fields.
   const engineFx=engine.fx;
   if(!engineFx)return null;
   if(view.fxSource!==engineFx){
     view.fxSource=engineFx;
     view.fxClock=now;
     view.fxElapsed=Number(engineFx.elapsed)||0;
   }else if(!app.paused){
     const dt=Math.min(100,Math.max(0,now-(view.fxClock||now)));
     view.fxElapsed=Math.min(Number(engineFx.ms)||1e6,view.fxElapsed+dt*Math.max(1,engine.speed||1));
     view.fxClock=now;
   }
   // The FX timeline comes from the real engine; its interpolation clock
   // advances independently so previews cannot speed up the paid round.
   return {...engineFx,elapsed:Math.max(Number(engineFx.elapsed)||0,view.fxElapsed),stamp:now};
 }
 function paintOne(item,data){
   if(!data?.engine)return false;
   const group=item.game,id=data.id,e=data.engine;
   // Only the currently selected mini button is hidden by the caller.
   // A board with the same index in either inactive game STILL renders.
   let view=views.get(id);
   if(!view||view.base.engine!==e){
     view=createBase(data,group);views.set(id,view);
   }
   // Some browser image decoders report incomplete sprites on the very
   // first frame. Retry occasionally rather than locking into simple
   // geometric fallbacks for the rest of the entire game.
   if(view.failed){
     if(performance.now()<(view.retryAt||0))return false;
     view.failed=false;
   }
   const now=performance.now();
   const key=[e.version,e.phase,e.fx?.phase,e.fx?.ms,e.boardGeneration||0,
     e.processed||0,e.totalHundredths||0,e.depth||0,e.roundIndex||0].join('/');
   const animation=!!e.busy||!!e.opening||!!e.pendingDraws?.size||
     !!e.queue?.length||!!(e.fx&&e.fx.elapsed<e.fx.ms&&e.busy);
   const changed=view.lastKey!==key||view.lastPaintEvent!==data.event
     ||view.lastPaintFx!==e.fx;
   const activeGroup=group===active;
   // Freeze a settled mini board until its engine/event actually changes.
   // Only ongoing refill, falling or clearing animation spends frames.
   if(!changed&&!animation)return true;
   const costPenalty=Math.min(300,Math.max(0,(view.paintCost||0)-8)*12);
   const cadence=app.paused?650:(activeGroup?50:100)+costPenalty;
   if(!changed&&now-view.stamp<cadence)return true;
   view.stamp=now;view.lastKey=key;view.lastPaintEvent=data.event;
   view.lastPaintFx=e.fx;
   const v=view.base;
   v.engine=e;v.event=data.event||{phase:e.phase||'waiting'};
   const fx=captureFx(e,view,now);
   const originalFx=e.fx;
   const proxy=Object.create(e);
   // Renderer-level animation mutations go to this local proxy.
   if(fx)proxy.fx=fx;
   v.engine=proxy;
   const prevBet=app.bet,offscreenId=v.i;
   app.bet=function(i){return i===offscreenId?data.bet:prevBet.call(this,i);};
   try{
     if(group===0){
       // Legacy mini painting uses 48px logical coordinates; the user
       // visible buffer is now 40px. Scale before drawing, never crop.
       item.ctx.save();
       const k=item.ctx.canvas.width/48;
       item.ctx.setTransform(k,0,0,k,0,0);
       const phase=v.event?.phase||e.phase||'waiting';
       const evId=v.event;
       if(view.lastEvent!==evId||view.phase!==phase){
         cookieMiniEvent(v,v.event,proxy);
         view.lastEvent=evId;view.phase=phase;
       }
       if(app.phase==='ready'){
         const g=item.ctx,board=e.board||[],count=board.length||6;
         const step=44/count;
         g.clearRect(0,0,48,48);
         g.fillStyle='#382017';g.fillRect(0,0,48,48);
         for(let row=0;row<board.length;row++)for(let col=0;col<(board[row]?.length||0);col++){
           const tile=board[row][col];if(!tile)continue;
           const image=cookieSprites[tile.color*2+Number(!!tile.special)];
           if(image?.complete&&image.naturalWidth)
             g.drawImage(image,2+col*step,2+row*step,step,step);
           if(tile.step){g.fillStyle='#fff6a8';g.beginPath();
             g.arc(2+(col+.5)*step,2+(row+.5)*step,step*.22,0,7);g.fill();}
         }
       }else{
         miniature(v);
         // Cookie miniature uses the exact full PNG, numbered glyphs,
         // sugar and shatter drawing pipeline at a reduced 160px buffer.
         item.ctx.clearRect(0,0,48,48);
         item.ctx.drawImage(v.miniCanvas,0,0,48,48);
       }
       item.ctx.restore();
     }else if(group===1){
       const g=item.ctx;
       if(app.phase==='ready'){
         // The main renderer stops after the BET tutorial, before it
         // updates its mini tab crop. Render real cake auto-tiles directly.
         paintCanyonCenterOnly(g,e,now,data.bet);
       }else{
         drawChoco(v,now);
         g.save();g.setTransform(1,0,0,1,0,0);
         g.clearRect(0,0,48,48);
         // Exact mini board crop from the full Canyon renderer:
         // no left/right wall scenery, payouts, scale or side meters.
         g.imageSmoothingEnabled=true;
         g.imageSmoothingQuality='medium';
         g.drawImage(v.miniCanvas,0,0,48,48);
         g.restore();
       }
     }else{
       drawCarnival(v,now);
       const g=item.ctx;
       const res=item.canvas?.width||item.ctx?.canvas?.width||96;
       g.save();
       g.setTransform(1,0,0,1,0,0);
       g.clearRect(0,0,res,res);
       g.imageSmoothingEnabled=true;
       g.imageSmoothingQuality='medium';
       g.drawImage(v.candyCanvas,0,0,res,res);
       // Same crown/rails artwork as the full-size jar, but overlay
       // at native mini resolution for polished candy detail.
       applyBottle(g,res,res);
       g.restore();
     }
     view.paintCost=view.paintCost==null
       ?performance.now()-now
       :view.paintCost*.76+(performance.now()-now)*.24;
     return true;
   }catch(error){
     view.failed=true;
     view.retryAt=now+1800;
     if(!view.lastErrorAt||now-view.lastErrorAt>10000){
       view.lastErrorAt=now;
       console.warn('[Sweets12Thumbnail] Retrying full-art renderer for '+id,error);
     }
     return false;
   }finally{
     app.bet=prevBet;
     v.engine=e;
     // No actual round state, payout or animation timer was changed.
     if(e.fx!==originalFx)console.warn('[Sweets12Thumbnail] fx replaced unexpectedly');
   }
 }
 window.sweets12ThumbnailRenderer=paintOne;
 window.sweets12MiniRenderStats={
   get activeViews(){return views.size;},
   get physicalResolution(){return NUM_PIXELS;},
   get mode(){return 'shared-main-renderers-compact';}
 };
 console.info('[Sweets12Thumbnail] exact shared main renderer and game art, ≤112px backing stores');
}catch(error){console.error('[Sweets12Thumbnail]',error);}
})();
/* Six Drop v8: native +20% drop geometry and optional PNG art activation.
 * Loaded after v6, inside the original game IIFE.
 * PNG uploads are intentionally manual: the old approved bottle remains
 * visible until BOTH sixdrop_candy_lid.png and sixdrop_glass_sideframe.png exist.
 */
(()=>{
 'use strict';
 try{
  if(typeof sixLayout!=='function' || !slots?.[2])return;
  sixLayout=function(rows=SIX_ROWS){
    const count=Number.isFinite(+rows)?Math.max(1,+rows):SIX_ROWS;
    // 33.6px is exactly 1.20x the original 28px spacing/diameter.
    // On the default 10-row staggered board the outermost candies
    // end 12.3px inside the 320px canvas, clearing the new thin rails.
    // Tall debug layouts reduce step as needed without hiding rows.
    const step=Math.min(33.6,296/(1+(count-1)*SIX_SQRT3_2));
    const top=160-(count-1)*step*SIX_SQRT3_2/2;
    return {step,top,radius:step*.5};
  };
  const candy=slots[2];
  candy.candyKey='';
  carnivalQueueFrame(candy);
  scheduleUI(app);
  const files=[
    'assets/sixdrop_candy_lid.png?v=8',
    'assets/sixdrop_glass_sideframe.png?v=8'
  ];
  const ready=files.map(src=>new Promise((resolve,reject)=>{
    const im=new Image();
    im.onload=()=>resolve(src);
    im.onerror=()=>reject(new Error('Missing Six Drop artwork: '+src));
    im.src=src;
  }));
  Promise.all(ready).then(()=>{
    document.body.classList.add('six-v8-art-ready');
    console.info('[SixDropV8] high-gloss candy lid and proportionate frame enabled');
  }).catch(error=>{
    console.info('[SixDropV8] old artwork retained pending GitHub PNG uploads',error.message);
  });
  // Optional user-uploaded narrow frame. The CSS already crops the
  // existing frame safely until this file becomes available.
  const slimFrame=new Image();
  slimFrame.onload=()=>{
    document.body.classList.add('six-v11-slim-ready');
    console.info('[SixDropV11] proportionate narrow candy frame enabled');
  };
  slimFrame.onerror=()=>console.info('[SixDropV11] waiting for slim frame PNG upload');
  slimFrame.src='assets/sixdrop_glass_sideframe_slim.png?v=11';
  console.info('[SixDropV11] native 1.2x geometry and board cache refreshed',sixLayout(SIX_ROWS));
 }catch(error){console.error('[SixDropV8]',error);}
})();

/* Winery v1 boot: direct eval intentionally retains the shared game scope.
 * Never replace a game during an active round. All assets are fetched first.
 */
(()=>{
 'use strict';
 if(window.SweetsLineup||window.__wineryBootV1)return;
 window.__wineryBootV1=true;
 Promise.resolve().then(async()=>{
  const read=async path=>{const r=await fetch(path,{cache:'no-store'});if(!r.ok)throw Error(path+' HTTP '+r.status);return r.text();};
  const [core,ui]=await Promise.all([
   read('assets/winery-pyramid-core-v1.js?v=1'),
   read('assets/winery-pyramid-v1.js?v=1')
  ]);
  const install=()=>{
   if(window.WineryPyramid?.installed)return;
   if(app.phase!=='ready'){setTimeout(install,500);return;}
   try{
    eval(core+'\n//# sourceURL=winery-pyramid-core-v1.js');
    eval(ui+'\n//# sourceURL=winery-pyramid-v1.js');
   }catch(error){console.error('[WineryPyramid] install failed',error);window.__wineryInstallError=String(error);}
  };
  install();
 }).catch(error=>{console.error('[WineryPyramid] load failed',error);window.__wineryInstallError=String(error);});
})();

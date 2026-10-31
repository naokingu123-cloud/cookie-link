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
    // 10 rows: prior 250px cap forced ~28.43 steps. 300px now gives
    // 34.11 (~20% larger) with center at y=160 and both edges inside 320.
    const step=Math.min(34.2,300/(1+(count-1)*SIX_SQRT3_2));
    const top=160-(count-1)*step*SIX_SQRT3_2/2;
    return {step,top,radius:step*.515};
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
  console.info('[SixDropV8] native candy spacing enabled',sixLayout(SIX_ROWS));
 }catch(error){console.error('[SixDropV8]',error);}
})();

/* SWEETS LINK v16 — 4-in-1 tab composition trial.
 * The THREE original tab slots each become a 2x2 group of board panels.
 * Every panel has: mini-board, round state, reachable numbers, projected
 * payout field and sugar-collected indicator. No new big playfield.
 *
 * Board #1 of each game mirrors the existing live tab where available.
 * Boards #2-#4 are DEMO layout fixtures (not independent betting engines).
 * Existing tab selection, gameplay and scoring remain untouched.
 */
(()=>{
'use strict';
try{
 const root=document.getElementById('tabs');
 if(!root)throw Error('SWEETS LINK tabs not found');
 const names=['クッキーリンク','チョコレートキャニオン','シックスドロップ'];
 const keys=['C','CH','D'];
 const hosts=[...root.querySelectorAll('.tab-slot')].slice(0,3);
 const palette={
   cookie:['#eab765','#e28da2','#a16d49','#69bc83','#7396d4','#ae75cf'],
   canyon:['#f1e4cf','#e9a5ba','#b77e61','#593730'],
   drop:['#25b9d8','#1b62c3','#87e735','#13b775']
 };
 const ITEMS=[];
 let installed=false,period=null;
 // Only one mini board is selected within the currently active game;
 // extra trial cells remain layout samples, not paid engines.
 const selectedByGame=[0,0,0];
 const seedRandom=n=>{let x=n|0;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296;}};
 const text=(v,max=12)=>String(v??'').replace(/\s+/g,' ').trim().slice(0,max);
 function makeEl(tag,cls,contents){
  const el=document.createElement(tag);el.className=cls||'';
  if(contents!=null)el.textContent=contents;
  return el;
 }
 function sampleCanvas(ctx,game,id){
  const W=48,H=48,rng=seedRandom(970000+game*30029+id*17027);
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle=game===0?'#3e282a':game===1?'#33262c':'#ebd8fb';
  ctx.fillRect(0,0,W,H);
  if(game===0){
   for(let y=0;y<7;y++)for(let x=0;x<7;x++){
     const index=Math.floor(rng()*6);
     ctx.fillStyle=palette.cookie[index];
     ctx.fillRect(3+x*6,3+y*6,5.3,5.3);
     ctx.fillStyle='rgba(255,255,255,.36)';
     ctx.fillRect(4+x*6,4+y*6,2,1);
   }
  }else if(game===1){
   for(let y=0;y<12;y++)for(let x=0;x<7;x++){
     if(rng()<.05)continue;
     ctx.fillStyle=palette.canyon[Math.floor(rng()*4)];
     ctx.fillRect(10+x*4,1+y*3.7,3.6,3.4);
     ctx.fillStyle='rgba(255,255,255,.19)';
     ctx.fillRect(10+x*4,1+y*3.7,3.6,.5);
   }
  }else{
   for(let y=0;y<10;y++){
    const cols=y%2?7:8;
    for(let x=0;x<cols;x++){
      if(rng()<.08)continue;
      const cx=5+x*5.3+(y%2?2.65:0),cy=4.4+y*4.25;
      ctx.beginPath();ctx.arc(cx,cy,2.45,0,Math.PI*2);
      ctx.fillStyle=palette.drop[Math.floor(rng()*4)];ctx.fill();
      ctx.strokeStyle='#fff8e4';ctx.lineWidth=.65;ctx.stroke();
      ctx.beginPath();ctx.arc(cx-.75,cy-.6,.65,0,Math.PI*2);
      ctx.fillStyle='rgba(255,255,255,.7)';ctx.fill();
    }
   }
  }
 }
 function reachNumbers(host,game){
  // The live tab numbers are SVG PATH glyphs: their textContent is empty.
  // Collect the FULL prediction set, not only the current 4-number page.
  // Sorted ascending; a separate slow, continuous animation reveals 5+.
  // Tier 3 comes from the genuine engine predictor.
  const slot=slots?.[game];
  if(slot?.reachStrip && !slot.reachStrip.hidden){
    const page=slot.reachPageResults||[];
    if(page.length)return page
      .filter(p=>Number.isInteger(Number(p.number))&&Number(p.number)>0)
      .map(p=>({value:String(p.number),tier:String(p.tier||0)}))
      .sort((a,b)=>Number(a.value)-Number(b.value));
  }
  // Fallback for an older HUD: use its accessible label, not SVG text.
  const rows=[...host.querySelectorAll('.reach-num')]
    .filter(el=>!el.closest('.mini-four-grid'))
    .map(el=>{
      const label=el.getAttribute('aria-label')||'';
      const match=label.match(/^(\d{1,2})番/);
      return {value:match?match[1]:el.textContent.trim(),
        tier:el.dataset.reachTier||'0'};
    })
    .filter(v=>/^\d{1,2}$/.test(v.value));
  const unique=[],used=new Set();
  for(const value of rows){
    if(used.has(value.value))continue;
    used.add(value.value);unique.push(value);
  }
  return unique.sort((a,b)=>Number(a.value)-Number(b.value));
 }
 function stateFor(host,game){
  const tab=host.querySelector('.tab');
  const source=tab?.querySelector('.mini-wrap canvas')||tab?.querySelector('canvas');
  const stateText=tab?.querySelector('.tabstate')?.textContent||host.querySelector('.tabstate')?.textContent;
  const winText=host.querySelector('.tabwin')?.textContent||'';
  const win=winText.match(/[\d,]+/);
  const sugar=!!host.querySelector('.tab-sugar.collected, .tab-sugar.is-collected, .tab-sugar.earned');
  return {
    source, status:text(stateText||(app.phase==='ready'?'準備':'進行'),5),
    reach:reachNumbers(host,game),
    pay:win?win[0]:'0',sugar
  };
 }
 function build(){
  if(installed)return true;
  if(hosts.length!==3)return false;
  if(hosts.some(h=>!h.querySelector('.tab')))return false;
  for(let game=0;game<3;game++){
   const host=hosts[game],original=host.querySelector('.tab');
   const grid=makeEl('div','mini-four-grid');
   grid.setAttribute('aria-label',names[game]+'、4面表示試験');
   for(let index=0;index<4;index++){
    const cell=makeEl('button','mini-four-cell'+(index===0?' is-live':' is-demo'));
    cell.type='button';
    cell.title=index===0?'現在のゲーム盤面':'配置試験用の見本盤面（独立抽選なし）';
    cell.setAttribute('aria-label',names[game]+' '+(index+1)+'番小盤面。'+(index===0?'本番盤面の表示':'配置見本'));
    const head=makeEl('span','mini-four-head');
    const badge=makeEl('b','mini-four-number',keys[game]+(index+1));
    const phase=makeEl('small','mini-four-phase',index===0?'準備':'見本');
    const sugar=makeEl('span','mini-four-sugar');
    // Reuse the same sugar-gem artwork/class used by the original 3-tab UI.
    const sourceGem=host.querySelector('.tab-sugar .sugar-gem');
    const gem=sourceGem?sourceGem.cloneNode(true):makeEl('span','sugar-gem');
    gem.removeAttribute('id');sugar.append(gem);
    sugar.title='シュガー未獲得';
    head.append(badge,phase,sugar);
    const canvas=document.createElement('canvas');
    canvas.width=game===2?80:40;canvas.height=game===2?80:40;canvas.className='mini-four-canvas';canvas.setAttribute('aria-hidden','true');
    const chosenLabel=makeEl('span','mini-four-selected-label','選択中');
    chosenLabel.setAttribute('aria-hidden','true');
    const reach=makeEl('span','mini-four-reach');
    const reachBadge=makeEl('span','mini-four-reach-badge','リーチ');
    const reachDigits=makeEl('span','mini-four-reach-digits');
    reach.append(reachBadge,reachDigits);
    // Small blinking payout bubble remains at the TOP LEFT, as in the
    // original three-tab version. No payout strip below the board.
    const pay=makeEl('span','mini-four-pay');
    pay.setAttribute('aria-label','現在の配当');
    pay.style.setProperty('--mini-bubble-delay',(-.28*(index+game*4)).toFixed(2)+'s');
    const payAmount=makeEl('b','mini-four-pay-amount','0');
    const payUnit=makeEl('small','mini-four-pay-unit','WIN');
    pay.append(payAmount,payUnit);
    cell.append(pay,head,canvas,chosenLabel,reach);grid.append(cell);
    const ctx=canvas.getContext('2d',{alpha:false});
    const item={host,original,game,index,cell,ctx,phase,reach,pay,payAmount,reachDigits,sugar,seed:(index+1)*1009+game*307};
    ITEMS.push(item);
    cell.addEventListener('click',event=>{
      event.preventDefault();event.stopPropagation();
      // The other nine panels are still visual DEMO boards, so this
      // changes the highlighted preview, NOT the underlying paid engine.
      selectedByGame[game]=index;
      if(original?.getAttribute('aria-selected')!=='true')original?.click();
      window.sweets12Live?.selectBoard(game,index);
      updateSelection();
      window.sweets12FrameScheduler?.markAll('board-selected');
    });
   }
   host.append(grid);
  }
  // Mode visibility is now controlled by the 3/12-menu service.
  installed=true;return true;
 }
 function renderReach(node,numbers,pageIndex=0){
  // Match the native 3-tab pager: numeric order, FOUR digits per page,
  // 2-second page cadence, 650ms horizontal page-swap animation.
  const best=new Map();
  for(const item of numbers||[]){
    const value=Number(item?.value);
    if(!Number.isInteger(value)||value<1||value>25)continue;
    const tier=Math.max(0,Math.min(3,Number(item?.tier)||0));
    best.set(value,Math.max(tier,best.get(value)||0));
  }
  const all=[...best].sort((a,b)=>a[0]-b[0])
    .map(([value,tier])=>({value:String(value),tier:String(tier)}));
  const pages=Math.max(1,Math.ceil(all.length/4));
  const index=((Math.floor(pageIndex)||0)%pages+pages)%pages;
  const current=all.slice(index*4,index*4+4);
  const highest=Math.max(0,...all.map(n=>Number(n.tier)));
  const badge=node.parentElement?.querySelector('.mini-four-reach-badge');
  if(badge)badge.dataset.tier=String(highest); // native 3-tab rule
  node.parentElement?.setAttribute('data-reach-tier',String(highest));
  node.setAttribute('aria-label',all.length
    ?'リーチ '+all.map(n=>n.value+'番').join('、')
    :'リーチなし');
  node.classList.remove('mini-four-reach-scrolling');
  node.style.removeProperty('--mini-reach-duration');
  const sig=all.map(n=>n.value+':'+n.tier).join('|')||'-';
  const key=sig+'@'+index;
  if(node.dataset.pageKey===key)return;
  const hadPage=!!node.querySelector('.mini-four-reach-page:not(.mini-four-reach-page-leave)');
  // Cancel any older exiting pages before starting a new transition.
  node.querySelectorAll('.mini-four-reach-page-leave').forEach(el=>el.remove());
  const old=node.querySelector('.mini-four-reach-page');
  const incoming=makeEl('span','mini-four-reach-page');
  if(!current.length)incoming.append(makeEl('span','mini-four-no-reach','—'));
  else for(const n of current){
    const digit=makeEl('b','mini-four-reach-digit',n.value);
    digit.dataset.tier=n.tier;
    incoming.append(digit);
  }
  node.dataset.pageKey=key;
  if(old&&hadPage&&all.length>4){
    old.classList.add('mini-four-reach-page-leave');
    incoming.classList.add('mini-four-reach-page-enter');
    node.append(incoming);
    old.addEventListener('animationend',()=>old.remove(),{once:true});
    incoming.addEventListener('animationend',
      ()=>incoming.classList.remove('mini-four-reach-page-enter'),{once:true});
  }else node.replaceChildren(incoming);
 }
 /* Authentic mini-rendering uses engine-owned boards, not seeded demo art. */
 function setMiniPayout(node,value){
  const raw=String(value??0).replace(/[，,\s]/g,'');
  const n=Number(raw);
  // The original coin count, but without thousands separators. A
  // tiny 12-board corner badge must fit four or more digits.
  const result=Number.isFinite(n)?String(Math.max(0,Math.round(n))):raw;
  if(node.textContent!==result)node.textContent=result;
  node.dataset.digits=String((result.match(/\d/g)||[]).length);
 }
 function paintReal(item,data,skipCanvas=false){
  const {game,ctx,phase,reachDigits,payAmount,sugar,cell}=item;
  const {engine:e,enabled,bet,score}=data;
  if(!e)return;
  // The shared full-game renderer is the primary source. Keep the previous
  // lightweight renderer only as a fallback if an image is unavailable.
  const exactDrawn=!skipCanvas&&
    window.sweets12ThumbnailRenderer?.(item,data)===true;
  if(!skipCanvas&&!exactDrawn){
   // All legacy fallback paint coordinates use 48x48 logical units.
   // Scale them into the selected 40px/80px physical backing store.
   ctx.save();
   const sx=ctx.canvas.width/48,sy=ctx.canvas.height/48;
   ctx.setTransform(sx,0,0,sy,0,0);
   const w=48,h=48;
   ctx.clearRect(0,0,w,h);
   ctx.fillStyle=game===0?'#372a2c':game===1?'#34252e':'#d8b8ee';
   ctx.fillRect(0,0,w,h);
   if(game===0 && Array.isArray(e.board)){
    const a=Array.isArray(e.board)?e.board:[];
    const count=a.length||6,cellSize=44/count;
    for(let row=0;row<a.length;row++)for(let col=0;col<(a[row]?.length||0);col++){
      const t=a[row][col];if(!t)continue;
      let c=palette.cookie[(Number(t.color)||0)%palette.cookie.length]||'#dca36f';
      ctx.fillStyle=c;
      ctx.beginPath();ctx.roundRect(2+col*cellSize,2+row*cellSize,cellSize-.5,cellSize-.5,1);ctx.fill();
      if(t.step){ctx.fillStyle='#fff8ab';ctx.fillRect(3+col*cellSize,3+row*cellSize,Math.max(1,cellSize-3),1.5);}
      if(t.number!=null){ctx.font='bold 3.8px system-ui';ctx.fillStyle='#54263e';ctx.textAlign='center';ctx.fillText(String(t.number),2+(col+.5)*cellSize,2+(row+.66)*cellSize);}
    }
   }else if(game===1&&Array.isArray(e.strata)){
    // Main-game cake sprite + auto-tiles even when full renderer is
    // temporarily unavailable. No sidewalls, payout table or drill HUD.
    const fx=e.fx,grid=fx?.before&&
      ['canyonFall','canyonMelt','canyonSoften'].includes(fx.phase)
      ?fx.before:e.strata;
    const ww=5.9,hh=3.8,left=3.35,top=1.05;
    const progress=Math.max(0,Math.min(1,(fx?.elapsed||0)/Math.max(1,fx?.ms||1)));
    const moves=new Map((fx?.phase==='canyonFall'?(fx.moves||[]):[]).map(m=>[m.id,m]));
    const offset=fx?.phase==='canyonScroll'?(fx.advanced||0)*progress:0;
    ctx.save();
    ctx.beginPath();ctx.rect(left,top,ww*7,hh*12);ctx.clip();
    for(let row=0;row<Math.min(12,grid.length);row++)
     for(let col=0;col<7;col++){
      const t=grid[row]?.[col];if(!t)continue;
      const move=moves.get(t.id),yrow=move
        ?move.from[0]+(move.to[0]-move.from[0])*progress:row;
      const x=left+col*ww,y=top+(yrow-offset)*hh;
      if(y>48||y+hh<0)continue;
      if(fx?.phase==='canyonMelt'&&fx.targets?.some(v=>v.tile?.id===t.id))
        ctx.globalAlpha=Math.max(.06,1-progress);
      chocoPaintTile(ctx,t,row,col,grid,x,y,ww,hh,performance.now(),bet);
      ctx.globalAlpha=1;
     }
    ctx.restore();
   }else if(game===2&&Array.isArray(e.pyramid)){
    // Fallback itself uses the APPROVED main-game candy art, never flat
    // colored dots. Render at 112 physical pixels but 48 logical units.
    const fx=e.fx,fall=fx?.phase==='pyramidFall'?sixFallFrame(fx,
      Math.min(1,(fx.elapsed||0)/Math.max(1,fx.ms||1))):null;
    const grid=fall?.grid||e.pyramid;
    const moves=new Map((fall?.moves||[]).map(move=>[move.id,move]));
    const rows=e.rows||grid.length||10,layout=sixLayout(rows);
    const physical=ctx.canvas.width;
    ctx.save();
    ctx.setTransform(physical/48,0,0,physical/48,0,0);
    ctx.clearRect(0,0,48,48);
    ctx.fillStyle='#efd5ee';ctx.fillRect(0,0,48,48);
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    for(let row=0;row<grid.length;row++){
      const tiles=grid[row]||[];
      for(let col=0;col<tiles.length;col++){
        const tile=tiles[col];if(!tile)continue;
        let pos=sixXY(row,col,rows);
        const move=moves.get(tile.id);
        if(move&&fall){
          const p=sixMotionPoint(move,fall.progress);
          pos={x:160+p.x*layout.step,y:layout.top+p.y*layout.step};
        }
        const cx=pos.x*48/320,cy=pos.y*48/320,r=Math.max(2.1,layout.radius*48/320);
        const img=sixArtCandySprite(tile.color,e.roundIndex||1,!!tile.sugar,
          e.chanceRound===e.roundIndex);
        if(img)ctx.drawImage(img,cx-r,cy-r,r*2,r*2);
        if(tile.number!=null) {
          try{sixPaintCandyNumber(ctx,tile.number,cx,cy,r*.93);}
          catch{ctx.font='bold 3px sans-serif';ctx.fillStyle='#fff';ctx.fillText(String(tile.number),cx,cy);}
        }
      }
    }
    ctx.restore();
   }
   ctx.restore();
  }
  item.phase.textContent=String(data.status||'準備').slice(0,5);
  item.cell.classList.toggle('is-disabled-mini',!enabled);
  // Real calculated reward, original Gold/SweetMedal text.
  setMiniPayout(payAmount,score);
  sugar.classList.toggle('is-collected',!!data.sugar);
  sugar.title=data.sugar?'シュガー獲得済み':'シュガー未獲得';
  renderReach(reachDigits,data.reach||[],Math.floor(Date.now()/2000));
  // Header remains distinguishable when users rename individual boards.
  const badge=cell.querySelector('.mini-four-number');
  if(badge){
    const v=String(data.name||'').trim();
    badge.textContent=v?v.slice(0,5):keys[game]+(item.index+1);
    badge.title=v;
  }
 }
 function paint(item,live,skipCanvas=false){
  const {ctx,index,game,phase,reachDigits,payAmount,sugar,host}=item;
  if(index>0){
   // Sample data explicitly labelled as layout fixtures.
   if(!skipCanvas)sampleCanvas(ctx,game,item.seed);
   const v=seedRandom(item.seed+4421);
   const values=[...new Set(Array.from({length:25},(_,n)=>n+1)
     .sort(()=>v()-.5).slice(0,index===2?7:4))]
     .map((number,j)=>({value:String(number),tier:j===1?'1':'0'}));
   phase.textContent='見本';
   renderReach(reachDigits,values,Math.floor(Date.now()/2000));
   setMiniPayout(payAmount,[0,100,200,500][(index+game)%4]);
   sugar.classList.toggle('is-collected',index===2);
   sugar.title=index===2?'見本：シュガー獲得':'見本：シュガー未獲得';
   return;
  }
  if(!skipCanvas){
    ctx.clearRect(0,0,48,48);
    const src=live.source;
    if(src?.width>0&&src?.height>0){
      try{ctx.drawImage(src,0,0,48,48);}
      catch{sampleCanvas(ctx,game,item.seed);}
    }else sampleCanvas(ctx,game,item.seed);
  }
  phase.textContent=live.status;
  renderReach(reachDigits,live.reach,slots?.[game]?.reachPage||0);
  setMiniPayout(payAmount,live.pay);
  sugar.classList.toggle('is-collected',live.sugar);
  sugar.title=live.sugar?'シュガー獲得済み':'シュガー未獲得';
 }
 function updateSelection(){
  if(!installed)return;
  hosts.forEach((host,game)=>{
    const gameSelected=host.querySelector('.tab')?.getAttribute('aria-selected')==='true';
    host.querySelector('.mini-four-grid')?.classList.toggle('game-selected',gameSelected);
    for(const item of ITEMS){
      if(item.game!==game)continue;
      const selectedIndex=window.sweets12Live?.selected?.[game]??selectedByGame[game];
      const chosen=gameSelected&&item.index===selectedIndex;
      item.cell.classList.toggle('is-selected-mini',chosen);
      item.cell.setAttribute('aria-pressed',String(chosen));
      const previewOnly=chosen&&item.index>0;
      item.cell.title=chosen
        ?(previewOnly?'選択中（配置見本・独立抽選なし）':'選択中')
        :(item.index===0?'現在のゲーム盤面':'配置試験用の見本盤面（独立抽選なし）');
    }
  });
 }
 // Event-driven miniature scheduler; no 125ms scan of all twelve boards.
 // The roulette and the full-size board have rendering priority.
 const pendingBoards=[];
 const queuedBoards=new Set();
 const movingBoards=new Set();
 let idleRequest=0,urgentTimer=0,motionTimer=0,reachTimer=0,animationCursor=0;
 // Independently deadline each moving thumbnail. This gives moving boards
 // ~70ms in the active game and ~130ms elsewhere when idle CPU allows.
 const motionDue=new Map();
 let activePaintStreak=0;
 let processedFrames=0,skippedFrames=0,lastCost=0;
 let lastRouletteFrame=0,rouletteFrameGap=0,rouletteJankUntil=0,lastMiniPaint=0;
 function noteRouletteFrame(now){
   if(!liveMode()||document.hidden)return;
   if(lastRouletteFrame>0){
     const gap=Math.max(0,now-lastRouletteFrame);
     rouletteFrameGap=rouletteFrameGap*.78+gap*.22;
     // A 30fps roulette normally paints every ~33ms.
     // Defer miniature graphics briefly when frames miss that budget.
     if(gap>58&&gap<1000)rouletteJankUntil=performance.now()+175;
   }
   lastRouletteFrame=now;
 }
 const liveMode=()=>window.sweets12Live?.mode==='12';
 const itemId=item=>item.game*4+item.index;
 const getItemById=id=>ITEMS.find(item=>itemId(item)===id);
 function enqueue(id){
   if(!Number.isInteger(id)||id<0||id>=12)return;
   if(!queuedBoards.has(id)){
     queuedBoards.add(id);
     pendingBoards.push(id);
   }
   scheduleBoard();
 }
 function invalidateAll(){
   if(!installed&&!build())return;
   updateSelection();
   for(const item of ITEMS)enqueue(itemId(item));
 }
 function markBoard(index){
   // Real engine IDs are 0,3,4,5 / 1,6,7,8 / 2,9,10,11.
   const g=index===0||index===3||index===4||index===5?0:
           index===1||index===6||index===7||index===8?1:
           index===2||index===9||index===10||index===11?2:-1;
   const mini=index<3?0:g===0?index-2:g===1?index-5:index-8;
   if(g>=0)enqueue(g*4+mini);
 }
 function scheduleBoard(){
   if(idleRequest||urgentTimer||!liveMode()||document.hidden)return;
   if(typeof requestIdleCallback==='function'){
     // Avoid waiting for an arbitrary 240ms timeout while animations move.
     idleRequest=requestIdleCallback(drainBoards,{timeout:110});
   }else{
     // Safari fallback: never process in the same rAF as roulette physics.
     // Defer to a task after the next paint and only draw one mini.
     urgentTimer=setTimeout(()=>{
       urgentTimer=0;
       idleRequest=requestAnimationFrame(()=>{
         idleRequest=0;
         urgentTimer=setTimeout(()=>{urgentTimer=0;drainBoards(null);},0);
       });
     },12);
   }
 }
 function drainBoards(deadline){
   idleRequest=0;
   if(!liveMode()||document.hidden||!installed)return;
   const now=performance.now();
   if(now<rouletteJankUntil&&now-lastMiniPaint<850){
     skippedFrames++;
     urgentTimer=setTimeout(()=>{urgentTimer=0;scheduleBoard();},55);
     return;
   }
   if(deadline&&!deadline.didTimeout&&deadline.timeRemaining()<3){
     skippedFrames++;
     urgentTimer=setTimeout(()=>{urgentTimer=0;scheduleBoard();},24);
     return;
   }
   // Exactly one thumbnail per idle slice even when 12 boards change in
   // the same draw. No burst of 9 Canvas renders before a roulette frame.
   // Spend most idle slices on the visible game's three thumbnails,
   // but give at least every fourth slice to other games.
   let idx=pendingBoards.findIndex(id=>(Math.floor(id/4)===active)===(activePaintStreak<3));
   if(idx<0)idx=0;
   const [id]=pendingBoards.splice(idx,1);
   if(id==null)return;
   activePaintStreak=Math.floor(id/4)===active?Math.min(3,activePaintStreak+1):0;
   queuedBoards.delete(id);
   const item=getItemById(id);
   if(!item){if(pendingBoards.length)scheduleBoard();return;}
   const live=window.sweets12Live;
   const started=performance.now();
   const selected=live?.selected?.[item.game]===item.index&&
      item.host.querySelector('.tab')?.getAttribute('aria-selected')==='true';
   // No expensive stateFor() DOM scans or prediction calls for other tabs.
   const data=live?.getBoard(item.game,item.index);
   if(data)paintReal(item,data,selected);
   else paint(item,stateFor(item.host,item.game),selected);
   const duration=performance.now()-started;
   lastCost=lastCost*.8+duration*.2;
   lastMiniPaint=performance.now();
   processedFrames++;
   const engine=data?.engine;
   if(!selected&&(engine?.busy||engine?.opening||engine?.queue?.length||
       engine?.pendingDraws?.size)){
     movingBoards.add(id);
     // The next render is based on the last actually painted frame,
     // not on an accumulating timer that causes bursty redraws.
     motionDue.set(id,performance.now()+(item.game===active?70:130));
     scheduleMotion();
   }else{
     movingBoards.delete(id);
     motionDue.delete(id);
   }
   if((data?.reach?.length||0)>4){
     item.pagedReach=data.reach;
     scheduleReachPager();
   }else item.pagedReach=null;
   if(pendingBoards.length)scheduleBoard();
 }
 function scheduleMotion(){
   if(motionTimer||!movingBoards.size||!liveMode()||document.hidden)return;
   // A menu or user pause must not cause an 8ms expired-timer loop.
   if(app?.paused){
     motionTimer=setTimeout(()=>{motionTimer=0;scheduleMotion();},240);
     return;
   }
   const now=performance.now();
   let earliest=Infinity;
   for(const id of movingBoards){
     // A queued thumbnail is already committed for a future idle slice.
     if(queuedBoards.has(id))continue;
     earliest=Math.min(earliest,motionDue.get(id)??now);
   }
   if(!Number.isFinite(earliest))return; // drainBoards will re-arm it
   motionTimer=setTimeout(()=>{
     motionTimer=0;
     if(!liveMode()||document.hidden)return;
     if(app?.paused){scheduleMotion();return;}
     const current=performance.now();
     const due=[];
     for(const id of movingBoards){
       if(queuedBoards.has(id))continue;
       const target=motionDue.get(id)??current;
       if(current>=target)due.push({id,target,visible:Math.floor(id/4)===active});
     }
     due.sort((a,b)=>Number(b.visible)-Number(a.visible)||a.target-b.target);
     // At most two changes are queued in one pulse. Idle scheduler
     // still draws only one mini per task, never two in one render call.
     for(const {id} of due.slice(0,2)){
       motionDue.set(id,current+(Math.floor(id/4)===active?70:130));
       enqueue(id);
     }
     if(movingBoards.size)scheduleMotion();
   },Math.max(8,Math.min(80,earliest-now)));
 }
 function scheduleReachPager(){
   if(reachTimer||!liveMode()||document.hidden)return;
   const due=2000-Date.now()%2000+8;
   reachTimer=setTimeout(()=>{
     reachTimer=0;
     if(!liveMode()||document.hidden)return;
     let paged=false;
     for(const item of ITEMS){
       if(!item.pagedReach||item.pagedReach.length<=4)continue;
       renderReach(item.reachDigits,item.pagedReach,Math.floor(Date.now()/2000));
       paged=true;
     }
     if(paged)scheduleReachPager();
   },due);
 }
 function wake(){
   if(!installed&&!build())return;
   if(!liveMode())return;
   invalidateAll();
   if(movingBoards.size)scheduleMotion();
 }
 // The live engine reports each phase change. A Set coalesces all those
 // notifications; neither the engine nor the 3D physics is delayed.
 window.sweets12FrameScheduler={
   markBoard,markAll:invalidateAll,selectionChanged:invalidateAll,noteRouletteFrame,
   get rouletteGapMs(){return rouletteFrameGap;},
   get pending(){return queuedBoards.size;},
   get frames(){return processedFrames;},
   get paintCostMs(){return lastCost;},
   get droppedPolls(){return skippedFrames;}
 };
 setTimeout(wake,60);
 document.addEventListener('visibilitychange',()=>{
   if(!document.hidden)wake();
 });
 window.addEventListener('pagehide',()=>{
   if(typeof cancelIdleCallback==='function'&&idleRequest)cancelIdleCallback(idleRequest);
   if(urgentTimer)clearTimeout(urgentTimer);
   if(motionTimer)clearTimeout(motionTimer);
   if(reachTimer)clearTimeout(reachTimer);
 },{once:true});
 window.sweetsTab12Layout={get boards(){return ITEMS.length;},get trial(){return false;}};
 console.info('[Sweets12Tab] Event-triggered, one-board-per-idle miniature scheduler enabled');

}catch(error){console.error('[Sweets12Tab]',error);}
})();
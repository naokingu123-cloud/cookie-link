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
    canvas.width=48;canvas.height=48;canvas.className='mini-four-canvas';canvas.setAttribute('aria-hidden','true');
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
 function paintReal(item,data,skipCanvas=false){
  const {game,ctx,phase,reachDigits,payAmount,sugar,cell}=item;
  const {engine:e,enabled,bet,score}=data;
  if(!e)return;
  if(!skipCanvas){
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
    const ww=6.05,hh=3.56,top=3.5;
    for(let row=0;row<Math.min(12,e.strata.length);row++)
     for(let col=0;col<7;col++){
      const t=e.strata[row]?.[col];if(!t)continue;
      let c=Number(t.color)<0?'#ffe099':
        palette.canyon[Math.max(0,(Number(t.color)||0)%palette.canyon.length)];
      ctx.fillStyle=c;ctx.fillRect(3+col*ww,top+row*hh,ww-.35,hh-.25);
      if(t.item==='fruit'||t.item==='ore'||t.item==='sugar'){
       ctx.fillStyle=t.item==='sugar'?'#de93ff':'#ffe48a';
       ctx.fillRect(4+col*ww,top+row*hh+.7,Math.max(1,ww-2),Math.max(1,hh-1.6));
      }
     }
    ctx.textAlign='right';ctx.font='bold 5px system-ui';ctx.fillStyle='#ffda97';
    ctx.fillText((e.depth||0)+'m',46,47);
   }else if(game===2&&Array.isArray(e.pyramid)){
    const rows=e.pyramid.length||10,dy=41/Math.max(1,rows-1);
    for(let row=0;row<rows;row++){
      const a=e.pyramid[row]||[],cols=a.length||8;
      const diam=4.7,step=5.15;
      const left=24-(cols-1)*step/2;
      for(let col=0;col<a.length;col++){
       const t=a[col];if(!t)continue;
       let n=Number(t.color);
       if(!Number.isFinite(n))n=['lime','green','aqua','navy','yellow','orange'].indexOf(t.color);
       const colors=palette.drop;
       ctx.beginPath();ctx.arc(left+col*step,3+row*dy,diam*.5,0,Math.PI*2);
       ctx.fillStyle=colors[Math.abs(n||0)%colors.length];ctx.fill();
       ctx.strokeStyle='#fff1e1';ctx.lineWidth=.35;ctx.stroke();
       if(t.sugar){ctx.fillStyle='#fff8bb';ctx.fillRect(left+col*step-.6,3+row*dy-.6,1.2,1.2);}
      }
    }
   }
  }
  item.phase.textContent=String(data.status||'準備').slice(0,5);
  item.cell.classList.toggle('is-disabled-mini',!enabled);
  // Real calculated reward, original Gold/SweetMedal text.
  payAmount.textContent=Number(score||0).toLocaleString('ja-JP');
  sugar.classList.toggle('is-collected',!!data.sugar);
  sugar.title=data.sugar?'シュガー獲得済み':'シュガー未獲得';
  renderReach(reachDigits,data.reach||[],Math.floor(Date.now()/2000));
  // Header remains distinguishable when users rename individual boards.
  const badge=cell.querySelector('.mini-four-number');
  if(badge){
    const v=String(data.name||'').trim();
    badge.textContent=(v.length<=5?v:keys[game]+(item.index+1));
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
   payAmount.textContent=String([0,100,200,500][(index+game)%4]);
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
  payAmount.textContent=live.pay;
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
 function update(){
  if(!installed&&!build())return;
  const liveService=window.sweets12Live;
  if(liveService?.mode!=='12')return;
  updateSelection();
  if(document.hidden)return;
  const states=hosts.map((h,g)=>stateFor(h,g));
  for(const item of ITEMS){
    const isCurrent=item.cell.classList.contains('is-selected-mini');
    const actual=liveService.getBoard(item.game,item.index);
    if(actual)paintReal(item,actual,isCurrent);
    else paint(item,states[item.game],isCurrent);
  }
 }
 // Deferred until the main Arcade and v21 independent board service exist.
 setTimeout(update,35);
 period=setInterval(update,350);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)update();});
 window.addEventListener('pagehide',()=>clearInterval(period),{once:true});
 window.sweetsTab12Layout={get boards(){return ITEMS.length;},get trial(){return true;}};
 console.info('[Sweets12Tab] 3 existing tab slots replaced by 2x2 miniature layouts; independent engines remain unchanged');
}catch(error){console.error('[Sweets12Tab]',error);}
})();
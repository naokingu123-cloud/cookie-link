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
 function reachNumbers(host){
  const rows=[...host.querySelectorAll('.reach-num')]
    .filter(el=>!el.closest('.mini-four-grid'))
    .map(el=>el.textContent.trim())
    .filter(v=>/^\d{1,2}$/.test(v));
  return [...new Set(rows)].slice(0,2);
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
    reach:reachNumbers(host),
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
    const sugar=makeEl('i','mini-four-sugar','◇');
    sugar.title='シュガー未獲得';
    head.append(badge,phase,sugar);
    const canvas=document.createElement('canvas');
    canvas.width=48;canvas.height=48;canvas.className='mini-four-canvas';canvas.setAttribute('aria-hidden','true');
    const reach=makeEl('span','mini-four-reach','リーチ —');
    const pay=makeEl('span','mini-four-pay','配当 0 WIN');
    cell.append(head,canvas,reach,pay);grid.append(cell);
    const ctx=canvas.getContext('2d',{alpha:false});
    const item={host,original,game,index,cell,ctx,phase,reach,pay,sugar,seed:(index+1)*1009+game*307};
    ITEMS.push(item);
    cell.addEventListener('click',event=>{
      event.preventDefault();event.stopPropagation();
      // Choosing any small board still selects the original GAME only.
      // It does not claim a separate paid engine for the DEMO cells.
      if(original?.getAttribute('aria-selected')!=='true')original?.click();
    });
   }
   host.append(grid);
  }
  document.body.classList.add('twelve-mini-tabs-v16');
  installed=true;return true;
 }
 function paint(item,live){
  const {ctx,index,game,phase,reach,pay,sugar,host}=item;
  if(index>0){
   // Sample data explicitly labelled as layout fixtures.
   sampleCanvas(ctx,game,item.seed);
   const v=seedRandom(item.seed+4421);
   const a=1+Math.floor(v()*25),b=1+Math.floor(v()*25);
   phase.textContent='見本';
   reach.textContent='リーチ '+String(a).padStart(2,'0')+'·'+String(b).padStart(2,'0');
   pay.textContent='配当 '+[0,100,200,500][(index+game)%4]+' WIN';
   sugar.textContent=index===2?'◆':'◇';
   sugar.classList.toggle('is-collected',index===2);
   sugar.title=index===2?'見本：シュガー獲得':'見本：シュガー未獲得';
   return;
  }
  ctx.clearRect(0,0,48,48);
  const src=live.source;
  if(src?.width>0&&src?.height>0){
    try{ctx.drawImage(src,0,0,48,48);}
    catch{sampleCanvas(ctx,game,item.seed);}
  }else sampleCanvas(ctx,game,item.seed);
  phase.textContent=live.status;
  reach.textContent='リーチ '+(live.reach.length?live.reach.join('·'):'—');
  pay.textContent='配当 '+live.pay+' WIN';
  sugar.textContent=live.sugar?'◆':'◇';
  sugar.classList.toggle('is-collected',live.sugar);
  sugar.title=live.sugar?'シュガー獲得済み':'シュガー未獲得';
 }
 function update(){
  if(!installed&&!build())return;
  if(document.hidden)return;
  const states=hosts.map((h,g)=>stateFor(h,g));
  for(const item of ITEMS)paint(item,states[item.game]);
  hosts.forEach((host,g)=>{
    const selected=host.querySelector('.tab')?.getAttribute('aria-selected')==='true';
    host.querySelector('.mini-four-grid')?.classList.toggle('game-selected',selected);
  });
 }
 update();
 period=setInterval(update,650);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)update();});
 window.addEventListener('pagehide',()=>clearInterval(period),{once:true});
 window.sweetsTab12Layout={get boards(){return ITEMS.length;},get trial(){return true;}};
 console.info('[Sweets12Tab] 3 existing tab slots replaced by 2x2 miniature layouts; independent engines remain unchanged');
}catch(error){console.error('[Sweets12Tab]',error);}
})();
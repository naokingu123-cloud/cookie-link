/* Waffle Reversi uses the same per-disc clock for the main board, mini board, payout ladder and sound. */
(()=>{
'use strict';
const R=window.BingoStickRules,reduce=matchMedia('(prefers-reduced-motion: reduce)');
const names={black:'黒・小倉あん',white:'白・バター'},opposite=c=>c==='white'?'black':'white';
const clamp=x=>Math.max(0,Math.min(1,x));
function motion(s,age=Infinity){
 const count=s.flipped.length,end=180+count*110,duration=s.draws.length?end+560:0;
 const t=Math.min(duration,Math.max(0,age)),index=Math.floor((t-180)/110),progress=clamp((t-180-index*110)/110);
 return {index,progress,beat:Math.min(count,Math.max(0,index+Number(progress>=.5))),duration,active:t<duration,holding:t>=end&&t<end+400,returning:t>=end+400&&t<duration};
}
function texture(file){const im=new Image();im.src='assets/'+file;return im;}
const art={black:texture('waffle-reversi-ogura.webp'),white:texture('waffle-reversi-butter.webp'),board:texture('waffle-reversi-tray.webp')};
function usable(im){return im.complete&&im.naturalWidth;}
const frames=new WeakMap();
function drawBoard(ctx,s,o,main){
 const w=ctx.canvas.width,h=ctx.canvas.height;if(!w||!h)return;
 const t=o.age??Infinity,m=motion(s,t),size=Math.min(w,h),rim=size*(main?.064:.035),u=(size-2*rim)/8;
 const key=[w,h,m.active?Math.floor(t/16):-1,art.black.naturalWidth,art.white.naturalWidth,art.board.naturalWidth,main].join('/');
 const frame=frames.get(ctx);if(frame?.state===s&&frame.key===key)return;
 frames.set(ctx,{state:s,key});ctx.save();ctx.clearRect(0,0,w,h);ctx.translate((w-size)/2,(h-size)/2);
 if(usable(art.board))ctx.drawImage(art.board,0,0,size,size);else{ctx.fillStyle='#d6944d';ctx.fillRect(0,0,size,size);}
 ctx.translate(rim,rim);
 const steps=s.flipSteps,source=s.placed[0];
 for(let i=0;i<64;i++){
  const x=i%8*u,y=(i>>3)*u,cx=x+u*.5,cy=y+u*.5;
  ctx.save();ctx.translate(cx,cy);
  const glass=ctx.createLinearGradient(-u*.5,-u*.5,u*.38,u*.5);glass.addColorStop(0,'#723904a8');glass.addColorStop(.27,'#aa641f60');glass.addColorStop(1,'#ffdd8655');
  ctx.fillStyle=glass;ctx.beginPath();ctx.roundRect(-u*.472,-u*.472,u*.944,u*.944,u*.13);ctx.fill();
  ctx.strokeStyle='#a1612b';ctx.lineWidth=u*.039;ctx.stroke();
  let color=s.colors[i],number=color?null:s.numbers[i];
  const idx=m.active?steps.findIndex(f=>f.id===i):-1,isFlipping=idx>=0&&idx===m.index,placed=source===i;
  if(idx>=0&&idx>=m.beat)color=opposite(color);
  if(placed&&m.active&&t<90){color=null;number=s.numbers[i]??s.draws.at(-1);}
  if(color){
   ctx.save();const dim=u*.90;
   if(isFlipping&&!reduce.matches){
    const rot=Math.atan2(steps[idx].dy,steps[idx].dx),stretch=Math.sin(Math.PI*m.progress);
    ctx.translate(0,-u*.08*stretch);ctx.rotate(rot);ctx.scale(Math.max(.055,Math.abs(Math.cos(Math.PI*m.progress))),1+.045*stretch);ctx.rotate(-rot);
   }else if(placed&&m.active&&t<180&&!reduce.matches){const p=clamp((t-90)/90);ctx.scale(.45+.55*p,.45+.55*p);}
   const im=art[color];
   if(usable(im))ctx.drawImage(im,-dim/2,-dim/2,dim,dim);
   else{ctx.fillStyle=color==='black'?'#512a38':'#fff2ae';ctx.beginPath();ctx.ellipse(0,0,dim*.46,dim*.44,0,0,Math.PI*2);ctx.fill();}
   ctx.restore();
  }else if(number!=null){
   const font=u*.63;
   if(typeof drawElixirNumber==='function')drawElixirNumber(ctx,number,0,0,font,'#593015','#ffe7ab',u*.048);
   else{ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='900 '+font+'px system-ui';ctx.lineWidth=u*.065;ctx.strokeStyle='#ffedb9';ctx.strokeText(number,0,0);ctx.fillStyle='#542715';ctx.fillText(number,0,0);}
  }
  if(m.active&&(placed||isFlipping)){
   ctx.strokeStyle=isFlipping?'#fffbb7':'#e83665';ctx.lineWidth=u*(isFlipping?.077:.065);
   ctx.beginPath();ctx.roundRect(-u*.443,-u*.443,u*.886,u*.886,u*.13);ctx.stroke();
  }
  ctx.restore();
 }
 ctx.restore();
}
function drawMini(ctx,s,o={}){drawBoard(ctx,s,o,false);}
const won=(bet,odds)=>typeof medalWin==='function'?medalWin(bet,odds):Math.floor(bet*odds/100);
function mount(panel){
 const root=document.createElement('section');root.className='bs-scene';root.setAttribute('aria-label','ワッフルリバーシ');
 root.innerHTML=`<div class="bs-left"><div class="bs-pay"><div class="bs-pay-title">フリップ配当</div><table><thead><tr><th>反転</th><th>WIN</th></tr></thead><tbody></tbody></table><div class="bs-bonus">リバーサルボーナス<strong></strong></div></div></div><div class="bs-tray"><div class="bs-tools"><strong class="bs-status"></strong><span class="bs-guide"></span></div><div class="bs-board"><div class="bs-grid" role="img"><canvas></canvas></div><div class="bs-burst" hidden><b>REVERSAL BONUS!</b><span></span></div></div><div class="bs-counts"><div>今回 <b class="bs-hand">0</b>枚</div><div>最高 <b class="bs-record">0</b>枚</div></div></div>`;
 panel.append(root);const q=k=>root.querySelector(k),canvas=q('canvas'),ctx=canvas.getContext('2d'),grid=q('.bs-grid'),tray=q('.bs-tray');
 const rows=[...R.payRows].sort((a,b)=>a.count-b.count);if(rows[0]?.count!==0)rows.unshift({count:0,hundredths:0});
 const table=q('tbody'),tiers=rows.map(({count,hundredths},i)=>{
  const row=table.insertRow(0),head=document.createElement('th');head.scope='row';
  const next=rows[i+1]?.count;head.textContent=next===undefined?count+'+':next>count+1?count+'–'+(next-1):String(count);row.append(head);const cell=row.insertCell(),value=document.createElement('span'),unit=document.createElement('small');unit.textContent='WIN';cell.append(value,unit);
  row.title=(hundredths/100)+'倍';return {row,value,count,hundredths};
 });
 function fit(){const w=root.clientWidth,h=root.clientHeight;if(!w||!h)return;
  root.style.setProperty('--bs-w',w+'px');root.style.setProperty('--bs-h',h+'px');
  root.style.setProperty('--bs-board',Math.max(1,Math.min(tray.clientWidth,tray.clientHeight-q('.bs-tools').offsetHeight-q('.bs-counts').offsetHeight-4))+'px');
  const resolution=Math.max(1,Math.round(grid.clientWidth*Math.min(devicePixelRatio||1,2)));if(canvas.width!==resolution||canvas.height!==resolution)canvas.width=canvas.height=resolution;
 }
 const observer=new ResizeObserver(fit);observer.observe(root);observer.observe(grid);fit();
 let lastBet,lastKey;
 function draw(s,o={}){
  const bet=o.bet||0,m=motion(s,o.age??Infinity),hand=m.active?m.beat:s.lastFlips,record=m.active?Math.max(s.previousMaxFlips,hand):s.maxFlips;
  if(lastBet!==bet){for(const {value,hundredths} of tiers){const amount=won(bet,hundredths);value.textContent=amount;value.dataset.long=String(amount).length>6;value.setAttribute('aria-label',amount+' WIN');}lastBet=bet;}
  const live=m.active&&!m.returning,turn=s.draws.length,bonus=s.bonusEvents.length-Number(!!s.lastReversal&&m.active&&m.beat<s.lastFlips);
  const burstAt=180+Math.max(0,s.lastFlips-1)*110+55,burst=!!s.lastReversal&&m.active&&(o.age??Infinity)>=burstAt&&!m.returning;
  const key=[burst,turn,hand,record,m.active,live,m.index,bonus,s.lastColor,s.draws.at(-1),bet,o.demo,s.phase].join('/');
  if(key!==lastKey){lastKey=key;
   const num=s.draws.at(-1),next=turn%2?'white':'black',color=m.active?s.lastColor:next;
   q('.bs-status').textContent=(o.demo?'デモ · ':'')+(m.active?'第'+turn+'球 '+num+'番':s.phase==='done'?'抽選終了':'第'+(turn+1)+'球')+(s.phase==='done'&&!m.active?'':'　'+names[color]);
   q('.bs-status').dataset.color=color;
   const total=won(bet,R.award(record)+bonus*R.sweepBonusHundredths);
   q('.bs-guide').textContent=m.active?(hand?'反転 '+hand+'枚':s.lastFlips?'ワッフルを配置':'配置　反転0枚'):s.phase==='done'?'最終配当 '+won(bet,s.totalHundredths)+' WIN':bonus?'リバーサル獲得　合計 '+total+' WIN':'番号のマスへ配置';
   q('.bs-hand').textContent=hand;q('.bs-record').textContent=record;
   const focus=live?hand:record,focusTier=tiers.findLast(t=>t.count<=focus),bestTier=tiers.findLast(t=>t.count<=record);
   for(const item of tiers){item.row.classList.toggle('current',item===focusTier);item.row.classList.toggle('best',item===bestTier);}
   const ladder=q('.bs-pay');ladder.classList.toggle('live',live);ladder.dataset.beat=live?String(hand%2):'';
   const flag=q('.bs-burst');flag.hidden=!burst;if(burst)flag.querySelector('span').textContent='リバーサルボーナス　＋'+won(bet,R.sweepBonusHundredths)+' WIN';
   const prize=q('.bs-bonus');prize.classList.toggle('earned',bonus>0);prize.querySelector('strong').textContent=(bonus>0?'獲得 '+bonus+'回 · ':'')+won(bet,R.sweepBonusHundredths)+' WIN';
   grid.setAttribute('aria-label','8行8列のワッフル盤。'+q('.bs-status').textContent+'。今回'+hand+'枚、最高'+record+'枚');
  }
  const pulse=live&&hand>0?Math.max(0,1-((o.age??0)-(180+(hand-1)*110+55))/110):0;
  root.style.setProperty('--bs-pulse',reduce.matches?'0':pulse.toFixed(2));
  drawBoard(ctx,s,o,true);
 }
 return {draw,drawMini};
}
window.BingoStickView={mount,drawMini,motion};
})();

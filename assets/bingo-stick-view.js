/* Waffle Reversi uses the same per-disc clock for the main board, mini board, payout ladder and sound. */
(()=>{
'use strict';
const R=window.BingoStickRules,reduce=matchMedia('(prefers-reduced-motion: reduce)');
const names={black:'黒・小倉あん',white:'白・バター'},opposite=c=>c==='white'?'black':'white';
const clamp=x=>Math.max(0,Math.min(1,x));
function motion(s,age=Infinity){
 const count=s.flipped.length,end=180+count*110,rankStart=end+390,dropStart=rankStart+190,land=dropStart+310;
 const duration=s.draws.length?land+210:0,t=Math.min(duration,Math.max(0,age));
 const index=Math.floor((t-180)/110),progress=clamp((t-180-index*110)/110);
 const rankStep=t<rankStart?0:t<dropStart?1:t<land?2:3;
 const kick=clamp((t-rankStart)/(dropStart-rankStart)),fall=clamp((t-dropStart)/(land-dropStart));
 // Accelerate into the landing and make one small rebound, measured in row heights.
 const drop=fall<.72?(fall/.72)**2:1-.12*Math.sin((fall-.72)/.28*Math.PI);
 return {index,progress,beat:Math.min(count,Math.max(0,index+Number(progress>=.5))),duration,active:t<duration,
  holding:t>=end&&t<rankStart,returning:t>=rankStart&&t<duration,rankStart,dropStart,land,rankStep,kick,drop};
}
function texture(file){const im=new Image();im.src='assets/'+file;return im;}
const art={black:texture('waffle-reversi-ogura-v128.png'),white:texture('waffle-reversi-butter-v128.png'),board:texture('waffle-reversi-tray.webp')};
function usable(im){return im.complete&&im.naturalWidth;}
const frames=new WeakMap(),waffles=new WeakMap();
function waffle(ctx,size,rim,u){
 const cached=waffles.get(ctx),key=[size,rim,art.board.naturalWidth].join('/');
 if(cached?.key===key)return cached.image;
 const image=document.createElement('canvas');image.width=image.height=size;
 const c=image.getContext('2d');
 if(usable(art.board))c.drawImage(art.board,0,0,size,size);else{c.fillStyle='#d6944d';c.fillRect(0,0,size,size);}
 c.translate(rim,rim);c.scale(u,u);
 // Toast the recessed pockets. A single connected lattice sits above them and casts a shadow.
 for(let y=0;y<8;y++)for(let x=0;x<8;x++){
  const shade=c.createLinearGradient(x,y,x+.58,y+1);
  shade.addColorStop(0,'#692d07e5');shade.addColorStop(.28,'#a75a2075');shade.addColorStop(.8,'#f0ad4f25');shade.addColorStop(1,'#fff4a5bb');
  c.fillStyle=shade;c.beginPath();c.roundRect(x+.05,y+.05,.90,.90,.16);c.fill();
 }
 c.lineCap='round';c.lineJoin='round';
 for(const [offset,width,color] of [[.045,.176,'#834714'],[.015,.149,'#b96b23'],[-.013,.112,'#e99e41'],[-.035,.055,'#ffdc89']]){
  c.save();c.translate(offset,offset);c.beginPath();c.rect(0,0,8,8);
  for(let j=1;j<8;j++){c.moveTo(j,0);c.lineTo(j,8);c.moveTo(0,j);c.lineTo(8,j);}
  c.lineWidth=width;c.strokeStyle=color;c.stroke();c.restore();
 }
 waffles.set(ctx,{key,image});return image;
}
const reachInks=['#84f8fa','#ff637d','#d78aff'],reachNames=['リーチ','高額','超高額','リバーサル'];
const spectrum=['#ff7499','#ffce71','#c0ff9a','#66f0ff','#c493ff','#ff99cb'];
function reachFrame(c,u,tier,time,id,main){
 const rainbow=tier===3,pulse=reduce.matches?.84:.74+.26*Math.cos(time/210+id),half=u*.423;
 let ink=reachInks[tier];
 if(rainbow){
  ink=c.createLinearGradient(-half,-half,half,half);spectrum.forEach((color,i)=>ink.addColorStop(i/(spectrum.length-1),color));
 }
 c.save();c.beginPath();c.roundRect(-half,-half,2*half,2*half,u*.12);
 c.strokeStyle='#362839';c.lineWidth=u*(main?.11:.15);c.stroke();
 c.strokeStyle=ink;c.globalAlpha=pulse;c.lineWidth=u*(main?.07:.10);c.stroke();
 // Short, light-tipped streaks follow the same rounded perimeter as the stationary trim.
 if(!reduce.matches){
  const lap=8*half-(8-2*Math.PI)*u*.12,heads=tier>=2?2:1;
  c.globalAlpha=.92;c.setLineDash([u*.18,lap/heads-u*.18]);c.lineDashOffset=-lap*((time/(1600-tier*130)+id*.17)%1);
  c.strokeStyle='#fff9d5';c.lineWidth=u*.058;c.lineCap='round';c.stroke();
 }
 c.restore();
 if(main){
  const title=tier&&(reduce.matches||Math.floor(time/1400)%2)?reachNames[tier]:reachNames[0],y=u*.26;
  c.save();c.fillStyle='#3a2939';c.beginPath();c.roundRect(-u*.405,y-u*.125,u*.81,u*.25,u*.075);c.fill();
  c.font='950 '+u*.235+'px SweetReachRounded,system-ui,sans-serif';c.textAlign='center';c.textBaseline='middle';
  c.fillStyle=ink;c.fillText(title,0,y,u*.77);c.restore();
 }
}
function drawBoard(ctx,s,o,main){
 const w=ctx.canvas.width,h=ctx.canvas.height;if(!w||!h)return;
 const t=o.age??Infinity,m=motion(s,t),size=Math.min(w,h),rim=size*(main?.064:.035),u=(size-2*rim)/8;
 const reach=new Map();
 if(!m.active&&s.phase!=='done')for(const hit of o.reach||[]){
  const id=hit.cells?.[0];
  if(id!=null&&!s.colors[id]&&s.numbers[id]===hit.number&&!s.draws.includes(hit.number))reach.set(id,hit.allClear?3:hit.tier);
 }
 const reachTime=reduce.matches?0:(o.reachTime??o.time??0);
 const key=[w,h,m.active?Math.floor(t/16):-1,art.black.naturalWidth,art.white.naturalWidth,art.board.naturalWidth,main,
  reach.size?Math.floor(reachTime/75):-1,[...reach].join('|')].join('/');
 const frame=frames.get(ctx);if(frame?.state===s&&frame.key===key)return;
 frames.set(ctx,{state:s,key});ctx.save();ctx.clearRect(0,0,w,h);ctx.translate((w-size)/2,(h-size)/2);
 ctx.drawImage(waffle(ctx,size,rim,u),0,0);
 ctx.translate(rim,rim);
 const steps=s.flipSteps,source=s.placed[0];
 for(let i=0;i<64;i++){
  const x=i%8*u,y=(i>>3)*u,cx=x+u*.5,cy=y+u*.5;
  ctx.save();ctx.translate(cx,cy);
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
   const tier=reach.get(i),tag=main&&tier!==undefined,font=u*(tag?.55:.63),baseline=tag?-u*.095:0;
   if(tier!==undefined)reachFrame(ctx,u,tier,reachTime,i,main);
   if(typeof drawElixirNumber==='function')drawElixirNumber(ctx,number,0,baseline,font,'#593015','#ffe7ab',u*.048);
   else{ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='900 '+font+'px system-ui';ctx.lineWidth=u*.065;ctx.strokeStyle='#ffedb9';ctx.strokeText(number,0,baseline);ctx.fillStyle='#542715';ctx.fillText(number,0,baseline);}
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
const materialFor=odds=>odds>=5000?'gold':odds>=1000?'silver':'waffle';
function mount(panel){
 const root=document.createElement('section');root.className='bs-scene';root.setAttribute('aria-label','ワッフルリバーシ');
 root.innerHTML=`<div class="bs-left"><div class="bs-pay">
  <div class="bs-pay-title"><i aria-hidden="true"></i><span><strong class="bs-ladder-name">反転配当</strong><b class="bs-grade"></b></span></div>
  <table><thead><tr><th>枚数</th><th>配当</th></tr></thead><tbody></tbody></table>
  <div class="bs-bonus">リバーサルボーナス<small></small><strong></strong></div></div></div>
  <div class="bs-tray"><div class="bs-tools">
   <div class="bs-status"><img class="bs-turn-piece" alt=""><div class="bs-turn-copy"><small></small><strong></strong></div><span class="bs-next"></span></div>
   <div class="bs-info"><span class="bs-specials"></span><span class="bs-guide"><span class="bs-guide-text"></span><b class="bs-hand">0</b>枚反転</span></div>
  </div><div class="bs-board"><div class="bs-grid" role="img"><canvas></canvas></div><div class="bs-burst" hidden><b>REVERSAL BONUS!</b><span></span></div></div>
  <div class="bs-counts"><div>今回 <b class="bs-gain">+0</b><small> WIN</small></div><div>累計 <b class="bs-total">0</b><small> WIN</small></div></div></div>`;
 panel.append(root);const q=k=>root.querySelector(k),canvas=q('canvas'),ctx=canvas.getContext('2d'),grid=q('.bs-grid'),tray=q('.bs-tray');
 const status=q('.bs-status'),piece=q('.bs-turn-piece'),ball=q('.bs-turn-copy small'),player=q('.bs-turn-copy strong'),nextLabel=q('.bs-next');
 const guide=q('.bs-guide-text'),flips=q('.bs-hand'),gain=q('.bs-gain'),total=q('.bs-total'),ladder=q('.bs-pay'),gradeTag=q('.bs-grade');
 const prize=q('.bs-bonus'),bonusLabel=(R.sweepBonusHundredths/100).toFixed(1)+'倍';
 prize.dataset.material=materialFor(R.sweepBonusHundredths);prize.querySelector('small').textContent='共通 '+bonusLabel;
 const rows=[...R.payRows].sort((a,b)=>a.count-b.count);if(rows[0]?.count!==0)rows.unshift({count:0});
 const table=q('tbody');
 function block(cell,extra=false){
  const tile=document.createElement('div'),value=document.createElement('span'),unit=document.createElement('small');
  tile.className='bs-block'+(extra?' bs-incoming':'');if(extra)tile.setAttribute('aria-hidden','true');
  unit.textContent='WIN';tile.append(value,unit);cell.append(tile);return {tile,value};
 }
 const tiers=rows.map(({count},i)=>{
  const row=table.insertRow(0),head=document.createElement('th');head.scope='row';row.dataset.count=count;
  head.textContent=i===rows.length-1?count+'+':String(count);row.append(head);const cell=row.insertCell();
  return {row,block:block(cell),count,incoming:i===rows.length-1?block(cell,true):null};
 });
 function fit(){const w=root.clientWidth,h=root.clientHeight;if(!w||!h)return;
  root.style.setProperty('--bs-w',w+'px');root.style.setProperty('--bs-h',h+'px');
  root.style.setProperty('--bs-board',Math.max(1,Math.min(tray.clientWidth,tray.clientHeight-q('.bs-tools').offsetHeight-q('.bs-counts').offsetHeight-4))+'px');
  const resolution=Math.max(1,Math.round(grid.clientWidth*Math.min(devicePixelRatio||1,2)));if(canvas.width!==resolution||canvas.height!==resolution)canvas.width=canvas.height=resolution;
 }
 const observer=new ResizeObserver(fit);observer.observe(root);observer.observe(grid);observer.observe(q('.bs-tools'));fit();
 function quote({tile,value},odds,bet,baseline){
  const amount=won(bet,baseline+odds)-won(bet,baseline);
  const label=amount>=1000000&&amount%10000===0?amount/10000+'万':String(amount);
  value.textContent=label;value.style.fontSize=label.length>8?(8/label.length)+'em':'';
  value.setAttribute('aria-label',amount+' WIN');
  tile.dataset.material=materialFor(odds);
 }
 let lastBet,lastBaseline,lastRack,lastState,lastKey,lastSpecialKey;
 function draw(s,o={}){
  const bet=o.bet||0,m=motion(s,o.age??Infinity),hand=m.active?m.beat:s.lastFlips,turn=s.draws.length;
  const bonus=s.reversalThisMove?R.sweepBonusHundredths:0,before=s.totalHundredths-s.lastBaseHundredths-bonus;
  const revealed=!!bonus&&(!m.active||hand===s.lastFlips);
  const shown=before+R.award(hand,s.lastRack)+(revealed?bonus:0);
  const totalWin=won(bet,shown),handWin=totalWin-won(bet,before);
  const settled=!m.active||m.rankStep===3,grade=settled?s.grade:s.lastGrade,baseline=settled?s.totalHundredths:before;
  const rack=settled?s.rack:s.lastRack,live=m.active&&m.rankStep===0&&turn>0;
  const knock=turn?s.lastKnockRow:null;
  if(lastState!==s){
   ladder.dataset.knockRow=knock??'';
   for(const {row,count} of tiers)row.dataset.motion=knock===null||count<knock?'stay':count===knock?'kick':'fall';
  }
  // Each tile previews whole medals after including the fraction carried from earlier balls.
  if(lastBet!==bet||lastBaseline!==baseline||lastRack!==rack||lastState!==s){
   for(const {row,block,count,incoming} of tiers){
    const odds=R.award(count,rack);
    quote(block,odds,bet,baseline);
    if(incoming)quote(incoming,R.award(count,s.rack),bet,s.totalHundredths);
    row.title=count+(count===tiers.length-1?'枚以上':'枚')+'・'+(odds/100).toFixed(1)+'倍';
    row.dataset.zero=String(!odds);
   }
   gradeTag.textContent='G'+grade;gradeTag.title='グレード '+grade;ladder.dataset.grade=grade;
   lastBet=bet;lastBaseline=baseline;lastRack=rack;lastState=s;
  }
  const specials=s.offBoardNumbers||[],specialKey=specials.join(',')+'/'+s.draws.join(',');
  if(lastSpecialKey!==specialKey){
   const band=q('.bs-specials');band.textContent='特殊↑';
   for(const n of specials){const badge=document.createElement('b');badge.textContent=n;badge.className=s.draws.at(-1)===n?'last':s.draws.includes(n)?'used':'';band.append(badge);}
   band.title='特殊番号 '+specials.join('・')+'。0WINでグレードが1段アップ';band.setAttribute('aria-label',band.title);lastSpecialKey=specialKey;
  }
  const earnedBonuses=s.reversalCount-Number(!!bonus&&!revealed);
  const burstAt=180+Math.max(0,s.lastFlips-1)*110+55,burst=!!bonus&&m.active&&(o.age??Infinity)>=burstAt&&m.rankStep===0;
  const key=[burst,turn,hand,handWin,totalWin,m.active,live,m.rankStep,earnedBonuses,s.lastColor,s.draws.at(-1),bet,o.demo,s.phase].join('/');
  if(key!==lastKey){lastKey=key;
   const done=s.phase==='done'&&!m.active,current=m.active||done?turn:turn+1,color=current%2?'black':'white';
   if(status.dataset.color!==color){status.dataset.color=color;piece.src=art[color].src;}
   ball.textContent=(o.demo?'デモ　':'')+'第'+current+'球'+(m.active||done?'　'+s.draws.at(-1)+'番':'');
   player.textContent=done?'抽選終了':names[color]+'の番';
   nextLabel.textContent=current<8?'次 '+(color==='white'?'黒':'白'):'';
   const miss=turn>0&&!s.placed.length;
   guide.textContent=miss?(m.active?'特殊 HIT!　':'特殊 '+s.draws.at(-1)+'番　'):turn?(m.active?'HIT!　':'前球　'):'';
   flips.textContent=hand;gain.textContent='+'+handWin;total.textContent=totalWin;
   const focusTier=live?tiers.findLast(t=>t.count<=hand):null;
   for(const item of tiers)item.row.classList.toggle('current',item===focusTier);
   ladder.classList.toggle('live',live);ladder.dataset.beat=live?String(hand%2):'';ladder.dataset.rankStep=m.rankStep;
   q('.bs-ladder-name').textContent=m.active&&m.rankStep===1?(knock===13?'13+':knock)+'枚枠 HIT!':m.active&&m.rankStep===2?'GRADE UP!':'反転配当';
   const flag=q('.bs-burst');flag.hidden=!burst;if(burst)flag.querySelector('span').textContent=bonusLabel+'！ ＋'+won(bet,R.sweepBonusHundredths)+' WIN';
   prize.classList.toggle('earned',earnedBonuses>0);prize.querySelector('strong').textContent=(earnedBonuses?'獲得 '+earnedBonuses+'回 · ':'')+won(bet,R.sweepBonusHundredths)+' WIN';
   grid.setAttribute('aria-label','8行8列のワッフル盤。'+q('.bs-status').textContent+'。今回'+hand+'枚反転、'+handWin+' WIN。累計'+totalWin+' WIN');
  }
  const pulse=live&&hand>0?Math.max(0,1-((o.age??0)-(180+(hand-1)*110+55))/110):0;
  root.style.setProperty('--bs-pulse',reduce.matches?'0':pulse.toFixed(2));
  if(m.rankStep===1||m.rankStep===2){
   ladder.style.setProperty('--bs-kick',m.kick.toFixed(3));ladder.style.setProperty('--bs-drop',m.drop.toFixed(3));
  }
  drawBoard(ctx,s,o,true);
 }
 return {draw,drawMini};
}
window.BingoStickView={mount,drawMini,motion};
})();

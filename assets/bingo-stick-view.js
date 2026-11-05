/* Waffle Reversi shares its move animation between the playfield and the mini board. */
(()=>{
'use strict';
const R=window.BingoStickRules,reduce=matchMedia('(prefers-reduced-motion: reduce)');
const names={black:'小倉あん',white:'バター'},short={black:'黒',white:'白'};
const opposite=c=>c==='black'?'white':'black';
const multiple=v=>(v/100).toLocaleString('ja-JP',{maximumFractionDigits:2})+'倍';
const texture=file=>{const image=new Image();image.src='assets/'+file;return image;};
const art={black:texture('waffle-ogura.webp'),white:texture('waffle-butter.webp')};
const moves=new WeakMap(),clamp=x=>Math.max(0,Math.min(1,x));
function nextColor(s){
 if(s.phase==='last'||s.phase==='done')return s.chosen;
 return s.draws.length%2?opposite(s.firstColor):s.firstColor;
}
function prepare(ctx,s,o){
 let move=moves.get(ctx);
 if(move&&move.state===s)return move;
 const last=move?.state,sameRound=last?.numbers===s.numbers;
 if(sameRound&&last.draws===s.draws){move.state=s;return move;}
 const placed=new Set(s.placed),flips=new Set(s.flipped),delays=new Uint16Array(64);
 for(const i of flips){
  const d=Math.min(...s.placed.map(j=>Math.max(Math.abs((i>>3)-(j>>3)),Math.abs(i%8-j%8))));
  delays[i]=110+Math.min(7,d)*65;
 }
 const prev=sameRound&&last.draws.length+1===s.draws.length?last.colors:null;
 move={state:s,prev,placed,flips,delays,start:o.time||0,lastFrame:null};
 moves.set(ctx,move);return move;
}
function paint(ctx,s,o,main){
 const w=ctx.canvas.width,h=ctx.canvas.height,size=Math.min(w,h),unit=size/8;
 if(!w||!h)return;
 const move=prepare(ctx,s,o),age=Math.max(0,o.age??((o.time||0)-move.start));
 const justChosen=s.phase==='last'&&s.draws.length===5;
 const moving=!reduce.matches&&!justChosen&&s.draws.length&&age<1050;
 const key=[w,h,moving?Math.floor(age/35):-1,art.black.naturalWidth,art.white.naturalWidth,main].join('/');
 if(move.lastFrame===key)return;
 move.lastFrame=key;
 ctx.save();ctx.clearRect(0,0,w,h);ctx.fillStyle='#65371e';ctx.fillRect(0,0,w,h);
 ctx.translate((w-size)/2,(h-size)/2);
 const tile=unit*.948;
 for(let i=0;i<64;i++){
  const cx=(i%8+.5)*unit,cy=((i>>3)+.5)*unit,isFlip=move.flips.has(i),isDirect=move.placed.has(i);
  let color=s.colors[i],sx=1,sy=1;
  if(moving&&isFlip){
   const u=clamp((age-move.delays[i])/410);
   sx=Math.max(.06,Math.abs(Math.cos(Math.PI*u)));
   sy=1+.065*Math.sin(Math.PI*u);
   if(u<.5)color=opposite(color);
  }else if(moving&&isDirect){
   const u=clamp(age/235);
   sy=1-.22*Math.sin(Math.PI*u);
   sx=1+.04*Math.sin(Math.PI*u);
   if(u<.25&&move.prev)color=move.prev[i];
  }
  const tw=tile*sx,th=tile*sy,img=art[color],x=cx-tw/2,y=cy-th/2;
  if(img.complete&&img.naturalWidth)ctx.drawImage(img,x,y,tw,th);
  else{ctx.fillStyle=color==='black'?'#392423':'#fff6df';ctx.fillRect(x,y,tw,th);}
  if(moving&&isDirect&&age<590){
   ctx.globalAlpha=Math.sin(Math.PI*clamp(age/590))*.86;
   ctx.fillStyle='#ffdf79';ctx.beginPath();ctx.arc(cx+tile*.32,cy-tile*.31,tile*.081,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  }
  if(!main&&unit>=7){
   const light=color==='white',fill=light?'#372319':'#fff7df',stroke=light?'#fffce9':'#261512';
   if(typeof drawElixirNumber==='function')drawElixirNumber(ctx,s.numbers[i],cx,cy,unit*.72,fill,stroke,unit*.045);
   else{
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='900 '+(unit*.65)+'px system-ui';ctx.lineWidth=unit*.06;ctx.strokeStyle=stroke;ctx.strokeText(s.numbers[i],cx,cy);ctx.fillStyle=fill;ctx.fillText(s.numbers[i],cx,cy);
   }
  }
 }
 ctx.restore();
}
function drawMini(ctx,s,o={}){paint(ctx,s,o,false);}
function mount(panel,actions){
 const root=document.createElement('section');root.className='bs-scene';root.setAttribute('aria-label','ワッフルリバーシ');
 root.innerHTML=`<div class="bs-left"><div class="bs-counts" aria-label="現在のマス数">
 <div data-color="black"><i></i><span>黒 小倉あん</span><strong></strong></div>
 <div data-color="white"><i></i><span>白 バター</span><strong></strong></div></div>
 <div class="bs-pay"><table aria-label="選んだ色の最終マス数と配当倍率"><thead><tr><th scope="col">マス数</th><th scope="col">配当</th></tr></thead><tbody></tbody></table></div></div>
 <div class="bs-tray"><div class="bs-board"><div class="bs-grid" role="group" aria-label="8行8列のワッフル盤"><canvas aria-hidden="true"></canvas></div></div>
 <div class="bs-tools"><strong class="bs-status"></strong><span class="bs-guide"></span>
 <div class="bs-actions" role="group" aria-label="配当対象の色を選択" hidden>
 <button type="button" data-color="black">黒 小倉あん</button><button type="button" data-color="white">白 バター</button></div>
 <span class="bs-readout" hidden></span></div></div>`;
 panel.append(root);
 const q=sel=>root.querySelector(sel),grid=q('.bs-grid'),canvas=grid.querySelector('canvas'),ctx=canvas.getContext('2d');
 const cells=Array.from({length:64},()=>{const el=document.createElement('span');el.className='bs-cell';grid.append(el);return el;});
 const counters={},picker=q('.bs-actions');
 for(const color of ['black','white']){
  counters[color]=q('.bs-counts [data-color="'+color+'"]');
  const button=picker.querySelector('[data-color="'+color+'"]');
  button.setAttribute('aria-label',short[color]+' '+names[color]+'を配当色に選ぶ');
  button.onclick=()=>actions.choose(color);
 }
 const table=q('tbody'),bands=[...R.payRows].sort((a,b)=>a.count-b.count);
 if(bands[0].count>0)bands.unshift({count:0,hundredths:0});
 const tierRows=bands.map(({count},i)=>{
  const max=(bands[i+1]?.count??65)-1,row=table.insertRow(0),label=document.createElement('th');
  label.scope='row';label.textContent=count===64?'64 独占':count===max?String(count):count+'～'+max;
  row.append(label);row.insertCell().textContent=multiple(R.award(count));return row;
 });
 const status=q('.bs-status'),guide=q('.bs-guide'),readout=q('.bs-readout');
 let shown,shownText='',tickSecond=-1,shownChoices=false,lastOffers,offer;
 function fit(){
  const tools=q('.bs-tools'),tray=q('.bs-tray'),w=root.clientWidth,h=root.clientHeight;
  if(!w||!h)return;
  root.style.setProperty('--bs-w',w+'px');root.style.setProperty('--bs-h',h+'px');
  root.style.setProperty('--bs-board',Math.max(1,Math.min(tray.clientWidth,tray.clientHeight-tools.offsetHeight-2))+'px');
  const resolution=Math.max(1,Math.round(grid.clientWidth*Math.min(devicePixelRatio||1,2)));
  if(canvas.width!==resolution||canvas.height!==resolution){canvas.width=canvas.height=resolution;}
 }
 const observer=new ResizeObserver(fit);observer.observe(root);observer.observe(q('.bs-tools'));fit();
 function draw(s,o={}){
  if(shown!==s){
   s.colors.forEach((color,i)=>{
    const e=cells[i],n=s.numbers[i];e.dataset.color=color;e.textContent=n;
    e.setAttribute('aria-label',((i>>3)+1)+'行'+(i%8+1)+'列 '+n+'番 '+short[color]);
   });
   for(const color of ['black','white']){
    counters[color].querySelector('strong').textContent=s.counts[color];
    counters[color].classList.toggle('chosen',s.chosen===color);
   }
   const idx=s.chosen?bands.findLastIndex(row=>row.count<=s.counts[s.chosen]):-1;
   tierRows.forEach((row,i)=>row.classList.toggle('current',i===idx));
   shown=s;
  }
  if(o.reach!==lastOffers){
   lastOffers=o.reach;offer=null;
   for(const candidate of o.reach||[]){
    if(!offer||candidate.tier>offer.tier||candidate.tier===offer.tier&&candidate.gain>offer.gain)offer=candidate;
   }
  }
  const thinking=s.phase==='thinking',done=s.phase==='done',interactive=thinking&&!o.demo;
  const seconds=Math.ceil(Math.max(0,o.remainingMs??15000)/1000);
  const showingMove=!thinking&&!(s.phase==='last'&&s.draws.length===5)&&s.lastColor&&(o.age??Infinity)<1050;
  const presentation=[s.phase,s.draws.length,s.chosen,s.countChosen,s.totalHundredths,o.bet,!!o.demo,s.patternName,!!showingMove,offer?.number].join('/');
  if(presentation!==shownText||thinking&&seconds!==tickSecond||interactive!==shownChoices){
   const color=nextColor(s),turn=s.draws.length;
   const prefix=o.demo?'デモ　':'';
   status.textContent=prefix+(thinking?'配当色を選択　'+seconds+'秒':done?'抽選終了　'+short[s.chosen]+'を集計':(turn+1)+'球目　'+short[color]+'を置く');
   delete guide.dataset.tier;
   if(showingMove&&!done){
    status.textContent=prefix+'第'+turn+'球　'+s.draws.at(-1)+'番に'+short[s.lastColor];
    guide.textContent='配置 '+s.placed.length+'マス　反転 '+s.flipped.length+'マス';
   }else if(thinking){
    guide.textContent=o.demo?'5球後に黒か白を選びます':s.counts.black===s.counts.white?'同数のため時間切れは'+short[s.firstColor]:'時間切れは多い色を自動選択';
   }else if(done){
    guide.textContent=s.highestRole?'64マス独占！　ボーナス ＋'+multiple(R.sweepBonusHundredths):short[s.chosen]+' '+names[s.chosen]+'　'+s.countChosen+'マス';
   }else if(s.chosen){
    if(offer){
     guide.dataset.tier=offer.tier;
     guide.textContent=['リーチ','高額','超高額','最高役'][offer.tier]+'　'+offer.number+'番で'+offer.counts[s.chosen]+'マス';
    }else guide.textContent='配当色　'+short[s.chosen]+' '+names[s.chosen]+'　残り'+(8-turn)+'球';
   }else{
    guide.textContent=!turn?'前半5球は黒・白を交互に置く':'縦・横・斜めに挟んだ色が反転';
   }
   picker.hidden=!interactive;
   readout.hidden=!s.chosen;
   if(s.chosen){
    const win=o.bet&&!o.demo?Math.floor(o.bet*s.totalHundredths/100).toLocaleString('ja-JP')+' WIN':multiple(s.totalHundredths);
    readout.textContent=(done?'最終配当　':'見込配当　')+win;
   }
   shownText=presentation;tickSecond=seconds;shownChoices=interactive;
  }
  paint(ctx,s,o,true);
 }
 return {draw,drawMini};
}
window.BingoStickView={mount,drawMini};
})();

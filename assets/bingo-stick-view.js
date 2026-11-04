/* Host API: BingoStickView.mount(panel,{toggle(index),confirm()}) returns
   {draw(state,{time,bet,remainingMs,demo,reach,latestNumber,age}),drawMini(ctx,state,opts)}. */
(()=>{
'use strict';
const R=window.BingoStickRules, lengths=[8,7,6,5];
const multiple=n=>`${(n/100).toFixed(n%10?2:1)}倍`;
const tierLabels=['リーチ','高額','超高額','8個ライン'];
const tierInks=['#8cfaff','#ff7089','#db9cff','#ffeaa3'];
const spectrum=['#ff7d9a','#ffca70','#bdff97','#75f5ff','#c797ff','#ff96b5'];
const noReach=[],reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
const label=r=>tierLabels[r.tier||0];
const ink=r=>tierInks[r.tier||0];
const plans=new WeakMap();
function reachPlan(items){
 if(plans.has(items))return plans.get(items);
 const paths=[],cells=new Map();
 for(const item of [...items].sort((a,b)=>b.tier-a.tier||b.gain-a.gain)){
  for(const i of item.cells||[])cells.set(i,item);
  for(const l of item.lines||[])paths.push({item,line:l.cells});
 }
 const plan={cells,paths};plans.set(items,plan);return plan;
}
function segment(line){
 const a=line[0],b=line.at(-1),dx=b%8-a%8,dy=(b>>3)-(a>>3);
 return {x:a%8+.5,y:(a>>3)+.5,width:Math.hypot(dx,dy)+.9,angle:Math.atan2(dy,dx)};
}
function drawMini(ctx,state,o={}){
 const {width:w,height:h}=ctx.canvas, size=Math.min(w,h), x=(w-size)/2, y=(h-size)/2, cell=size/8;
 const free=new Set([...state.initialFree,...state.placedFree]),hits=new Set(state.hits),wins=new Set(state.lines.flatMap(l=>l.cells));
 const p=reachPlan(o.reach||noReach),t=reduced.matches?0:(o.time||0);
 ctx.save();ctx.clearRect(0,0,w,h);ctx.fillStyle='#492034';ctx.fillRect(0,0,w,h);
 for(let i=0;i<64;i++){
  ctx.fillStyle=free.has(i)?'#71e4cb':wins.has(i)?'#ffd363':hits.has(i)?'#fa8497':'#f2d6aa';
  const left=x+i%8*cell,top=y+Math.floor(i/8)*cell;
  ctx.fillRect(left+cell*.06,top+cell*.06,cell*.88,cell*.88);
  if(cell>=7){
   if(typeof drawElixirNumber==='function')drawElixirNumber(ctx,state.numbers[i],left+cell/2,top+cell/2,cell*.72,'#4d2635','#fff1cf',cell*.035);
   else{ctx.fillStyle='#452432';ctx.font=`bold ${cell*.64}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(state.numbers[i],left+cell/2,top+cell*.53);}
  }
 }
 ctx.translate(x,y);ctx.scale(cell,cell);
 function paintFrame(item){
  let paint=ink(item);
  if(item.tier===3){paint=ctx.createLinearGradient(-.45,-.45,.45,.45);spectrum.forEach((c,i)=>paint.addColorStop(i/5,c));}
  ctx.lineWidth=.17;ctx.strokeStyle='#472b4e';ctx.stroke();ctx.lineWidth=.105;ctx.strokeStyle=paint;ctx.stroke();
  if(!reduced.matches){ctx.setLineDash([.32,.94]);ctx.lineDashOffset=-t/720;ctx.lineWidth=.054;ctx.strokeStyle='#ffffe4';ctx.stroke();ctx.setLineDash([]);}
 }
 if(p.paths.length){const {item,line}=p.paths[Math.floor(t/1800)%p.paths.length],g=segment(line);ctx.save();ctx.translate(g.x,g.y);ctx.rotate(g.angle);ctx.beginPath();ctx.roundRect(-.45,-.4,g.width,.8,.15);paintFrame(item);ctx.restore();}
 for(const [i,r] of p.cells){ctx.save();ctx.translate(i%8+.5,(i>>3)+.5);ctx.beginPath();ctx.roundRect(-.41,-.41,.82,.82,.12);paintFrame(r);ctx.restore();}
 ctx.restore();
}
function mount(panel,actions){
 const root=document.createElement('section');root.className='bs-scene';root.setAttribute('aria-label','ビンゴスティック');
 root.innerHTML=`<header class="bs-head"><div class="bs-brand"><small>BISCUIT CLUB</small><strong>ビンゴスティック</strong></div><div class="bs-total"><small><span>合計配当</span> <em></em></small><b></b></div></header><div class="bs-body"><div class="bs-tray"><div class="bs-board"><svg class="bs-sticks" viewBox="0 0 8 8" aria-hidden="true"></svg><svg class="bs-rails" viewBox="0 0 8 8" aria-hidden="true"><defs><linearGradient id="bs-spectrum" x2="1" y2="1">${spectrum.map((c,i)=>`<stop offset="${i/5}" stop-color="${c}"/>`).join('')}</linearGradient></defs><g class="bs-forecast"></g><g class="bs-candidates"></g></svg></div><div class="bs-guide" hidden><b>空きマスをタップ・もう一度で解除</b><span>時間切れで残りを自動配置</span></div></div><aside class="bs-side"><div class="bs-info"><small class="bs-kicker"></small><strong class="bs-phase"></strong><span class="bs-note"></span><span class="bs-forecast-label" hidden></span><button type="button" class="bs-confirm">配置を確定</button></div><section class="bs-pay"><div class="bs-pay-title">配当表 <button class="bs-open" type="button" aria-expanded="false">拡大</button></div><div class="bs-scroll" tabindex="0" aria-label="ライン長と成立本数ごとの配当表。横にスクロールできます"><table><thead></thead><tbody></tbody></table></div><div class="bs-pages"><button type="button" aria-label="少ない本数へ">‹</button><span class="bs-pager-label">成立本数</span><button type="button" aria-label="多い本数へ">›</button></div></section></aside></div><section class="bs-full" role="dialog" aria-label="配当早見表" hidden><div class="bs-full-head"><div><small>BISCUIT CLUB</small><strong>配当早見表</strong></div><button type="button" class="bs-close">閉じる</button></div><p>横は成立本数。金色は現在の配当。8個ラインでシュガー！</p><table></table><div class="bs-full-foot"><button type="button" aria-label="前の6本">‹ 前へ</button><b></b><button type="button" aria-label="次の6本">次へ ›</button></div></section>`;
 panel.append(root);
 const q=k=>root.querySelector(k),board=q('.bs-board'),confirm=q('.bs-confirm'),scroll=q('.bs-scroll');
 const guide=q('.bs-guide'),sticks=q('.bs-sticks');
 const fit=()=>{const w=root.clientWidth,h=root.clientHeight;if(!w||!h)return;root.style.setProperty('--bs-w',`${w}px`);root.style.setProperty('--bs-h',`${h}px`);const tray=q('.bs-tray');root.style.setProperty('--bs-board',`${Math.max(1,Math.min(tray.clientWidth,tray.clientHeight-guide.offsetHeight))}px`);};new ResizeObserver(fit).observe(root);fit();
 // Each stick lies near one edge of its winning run, below every cell label.
 function drawSticks(lines){
  sticks.innerHTML=lines.map(({cells})=>{
   const first=cells[0],last=cells[cells.length-1],dx=Math.sign(last%8-first%8),dy=Math.sign((last>>3)-(first>>3));
   const x=first%8+.5+dy*.30,y=(first>>3)+.5-dx*.30;
   const endX=last%8+.5+dy*.30,endY=(last>>3)+.5-dx*.30;
   const coat=!dy?'#a04e55':!dx?'#408473':dx>0?'#995c36':'#7b577c';
   return `<g stroke-linecap="round"><line x1="${x}" y1="${y}" x2="${endX}" y2="${endY}" stroke="#783e32" stroke-width=".105"/><line x1="${x}" y1="${y}" x2="${endX}" y2="${endY}" stroke="#ffd88f" stroke-width=".073"/><line x1="${x}" y1="${y}" x2="${endX-dx*.4}" y2="${endY-dy*.4}" stroke="${coat}" stroke-width=".057"/></g>`;
  }).join('');
 }
 const buttons=Array.from({length:64},(_,i)=>{const b=document.createElement('button');b.type='button';b.className='bs-cell';b.innerHTML='<span></span><small></small>';b.onclick=()=>actions.toggle(i);board.append(b);return b;});
 const cols=Array.from({length:6},(_,i)=>i+1);q('thead').innerHTML='<tr><th scope="col">ライン長</th>'+cols.map(n=>`<th scope="col">${n}本</th>`).join('')+'</tr>';
 const payRows=lengths.map(len=>{const tr=document.createElement('tr');tr.innerHTML=`<th scope="row">${len}個</th>`+cols.map(n=>`<td>${multiple(R.award(len,n))}</td>`).join('');q('tbody').append(tr);return tr;});
 function extend(to){for(let n=cols.length+1;n<=to;n++){cols.push(n);const th=document.createElement('th');th.scope='col';th.textContent=`${n}本`;q('thead tr').append(th);payRows.forEach((row,i)=>{row.insertCell().textContent=n<=16+2*(17-2*lengths[i])?multiple(R.award(lengths[i],n)):'—';});}}
 const [prev,next]=root.querySelectorAll('.bs-pages button');function nav(){prev.disabled=scroll.scrollLeft<1;next.disabled=cols.length>=30&&scroll.scrollLeft+scroll.clientWidth>=scroll.scrollWidth-1;q('.bs-pager-label').textContent=scroll.scrollLeft+scroll.clientWidth>=scroll.scrollWidth-1&&cols.length<30?`${cols.length+1}本以上 ›`:'成立本数';}
 prev.onclick=()=>scroll.scrollBy({left:-Math.max(45,scroll.clientWidth-45)});next.onclick=()=>{if(scroll.scrollLeft+scroll.clientWidth>=scroll.scrollWidth-1)extend(Math.min(30,cols.length+6));scroll.scrollBy({left:Math.max(45,scroll.clientWidth-45)});nav();};scroll.addEventListener('scroll',nav); confirm.onclick=()=>actions.confirm();
 const full=q('.bs-full'),opener=q('.bs-open'),closer=q('.bs-close');
 const [back,forward]=full.querySelectorAll('.bs-full-foot button');
 let page=0;
 function fillOverview(s){
  const numbers=Array.from({length:6},(_,i)=>page*6+i+1);
  full.querySelector('table').innerHTML='<thead><tr><th>ライン長</th>'+numbers.map(n=>`<th>${n}本</th>`).join('')+'</tr></thead><tbody>'+
   lengths.map(len=>`<tr><th>${len}個</th>`+numbers.map(n=>`<td class="${s?.counts[len]===n?'current':''}">${n<=16+2*(17-2*len)?multiple(R.award(len,n)).replace(/\.0倍$/,'倍'):'—'}</td>`).join('')+'</tr>').join('')+'</tbody>';
  full.querySelector('.bs-full-foot b').textContent=`${numbers[0]}〜${numbers[5]}本`;back.disabled=page===0;forward.disabled=page===4;
 }
 function closeOverview(){full.hidden=true;opener.setAttribute('aria-expanded','false');q('.bs-body').inert=false;opener.focus({preventScroll:true});}
 opener.onclick=()=>{page=0;fillOverview(lastState);full.hidden=false;q('.bs-body').inert=true;opener.setAttribute('aria-expanded','true');closer.focus({preventScroll:true});};
 closer.onclick=closeOverview;back.onclick=()=>{page--;fillOverview(lastState);};forward.onclick=()=>{page++;fillOverview(lastState);};
 full.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();closeOverview();}});
 const candidates=q('.bs-candidates'),forecast=q('.bs-forecast'),forecastLabel=q('.bs-forecast-label');
 function frame(rect,r){
  const paint=r.tier===3?'url(#bs-spectrum)':ink(r);
  return `<g data-tier="${r.tier}" fill="none"><rect ${rect} class="bs-edge"/><rect ${rect} pathLength="100" stroke="${paint}" class="bs-trace"/><rect ${rect} pathLength="100" class="bs-spark"/></g>`;
 }
 let lastPath=null;
 function drawReach(p,t,changed){
  if(p.cells.size)forecast.parentElement.style.setProperty('--bs-travel',String(-(t%2200)/22));
  if(changed)candidates.innerHTML=[...p.cells].map(([i,r])=>frame(`x="${i%8+.06}" y="${(i>>3)+.06}" width=".88" height=".88" rx=".16"`,r)).join('');
  const choice=p.paths[Math.floor(t/1800)%p.paths.length]||null;
  if(choice===lastPath)return;
  lastPath=choice;forecastLabel.hidden=!choice;forecast.innerHTML='';
  if(choice){
   const {item,line}=choice,g=segment(line);
   forecast.setAttribute('transform',`translate(${g.x} ${g.y}) rotate(${g.angle*180/Math.PI})`);
   forecast.innerHTML=frame(`x="-.44" y="-.42" width="${g.width}" height=".84" rx=".19"`,item);
   forecastLabel.style.setProperty('--forecast-ink',ink(item));forecastLabel.textContent=`${item.number}番で${line.length}個ライン`;
  }
 }
 let lastState=null,lastReach=null,lastDemo,lastNumber,lastTime=-1,lastBet,lastSugar;
 function draw(s,o={}){
  const thinking=s.phase==='thinking',interactive=thinking&&!o.demo,ms=Math.max(0,Math.ceil((o.remainingMs??15000)/1000));
  const items=o.reach||noReach,p=reachPlan(items);
  drawReach(p,reduced.matches?0:o.time||0,items!==lastReach);
  if(s===lastState&&items===lastReach&&lastDemo===!!o.demo&&lastNumber===o.latestNumber&&lastTime===ms&&lastBet===o.bet&&lastSugar===o.sugarCollected)return;
  if(interactive&&(lastDemo||lastState?.phase!=='thinking')&&!full.hidden)closeOverview();
  if(!full.hidden&&s!==lastState)fillOverview(s);
  if(s.lines!==lastState?.lines)drawSticks(s.lines);
  if(guide.hidden===thinking){guide.hidden=!thinking;fit();}
  lastState=s;lastReach=items;lastDemo=!!o.demo;lastNumber=o.latestNumber;lastTime=ms;lastBet=o.bet;lastSugar=o.sugarCollected;
  const hits=new Set(s.hits),initial=new Set(s.initialFree),placed=new Set(s.placedFree),wins=new Set(s.lines.flatMap(l=>l.cells));

  root.classList.toggle('thinking',thinking); q('.bs-total small span').textContent=thinking?'見込配当':'合計配当';q('.bs-total b').textContent=multiple(s.totalHundredths);q('.bs-total em').textContent=!o.demo&&o.bet?`${Math.floor(o.bet*s.totalHundredths/100)}枚`:'';
  q('.bs-kicker').textContent=(o.demo?'デモ  ·  ':'')+(thinking?'FREE配置':s.phase==='done'?'RESULT':`${s.draws.length} / 8 球`);
  q('.bs-phase').textContent=thinking?`残り ${ms} 秒`:s.phase==='done'?'抽選終了':s.phase==='first'?'前半抽選':'後半抽選';
  q('.bs-note').textContent=thinking?`FREE ${placed.size} / ${s.freeBudget} 個選択`:`最長 ${s.longest} 個ライン`;
  confirm.hidden=!interactive;confirm.textContent=placed.size<s.freeBudget?'残りを自動配置':'配置を確定';confirm.title='時間切れになると残りのFREEを自動配置します';
  for(let i=0;i<64;i++){
   const b=buttons[i],f=initial.has(i)||placed.has(i),marked=hits.has(i),r=!f&&!marked&&p.cells.get(i);
   const tag=f?'FREE':r?label(r):'';
   b.className=['bs-cell',f?'free':'',placed.has(i)?'placed':'',marked?'hit':'',wins.has(i)?'win':'',r?'reach':'',!f&&marked&&s.numbers[i]===o.latestNumber?'latest':''].filter(Boolean).join(' ');
   if(typeof setElixirNumber==='function')setElixirNumber(b.firstChild,s.numbers[i]);else b.firstChild.textContent=s.numbers[i];
   if(r){b.dataset.tier=r.tier;b.style.setProperty('--reach-ink',ink(r));}else{delete b.dataset.tier;}
   b.lastChild.textContent=tag;
   b.disabled=!interactive||initial.has(i)||marked&&!placed.has(i)||!placed.has(i)&&placed.size>=s.freeBudget;
   b.setAttribute('aria-label',`${Math.floor(i/8)+1}行${i%8+1}列、${s.numbers[i]}${f?'、フリー':''}${placed.has(i)?'、選択済み':''}`);b.setAttribute('aria-pressed',String(placed.has(i)));
  }
  q('.bs-total small').title=o.sugarCollected?'シュガー獲得':'8個でシュガー';extend(Math.max(...Object.values(s.counts)));payRows.forEach((row,i)=>{const n=s.counts[lengths[i]]||0;for(let j=1;j<row.cells.length;j++)row.cells[j].className=j===n?'current':j===n+1?'next':'';});nav();
 }
 return {draw,drawMini};
}
window.BingoStickView={mount,drawMini};
})();

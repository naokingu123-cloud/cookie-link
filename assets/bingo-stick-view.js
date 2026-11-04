/* The waffle cabinet and miniature use the same cell coordinates and reach painter. */
(()=>{
'use strict';
const R=window.BingoStickRules,lengths=[8,7,6,5];
const colors=['#87f7ff','#ff7288','#dba0ff','#ffeaa2'],labels=['リーチ','高額','超高額','8個ライン'];
const rainbow=['#ff879e','#ffd56d','#bffd92','#72eeff','#d09cff','#ffa6d7'];
const empty=[],plans=new WeakMap(),reduce=matchMedia('(prefers-reduced-motion: reduce)');
function art(name){const image=new Image();image.src='assets/waffle-'+name+'.webp';return image;}
const tileArt=art('cell'),effectArt=art('effect');
const loaded=image=>image.complete&&image.naturalWidth>0;
const number=n=>Number.isInteger(n/100)?(n/100).toFixed(1):String(Math.round(n)/100);
const multiple=n=>number(n)+'倍';
const odds=s=>s.oddsMultiplier??1;
const color=r=>r.oddsUp?'#96ffac':colors[r.tier||0];
function forecast(items){
 if(plans.has(items))return plans.get(items);
 const cells=new Map(),paths=[];
 for(const r of [...items].sort((a,b)=>b.tier-a.tier||b.gain-a.gain)){
  for(const i of r.cells||[])if(!cells.has(i))cells.set(i,r);
  for(const line of r.lines||[])paths.push({r,cells:line.cells});
 }
 const plan={cells,paths};plans.set(items,plan);return plan;
}
function bounds(cells){
 const a=cells[0],b=cells.at(-1),x=Math.min(a%8,b%8),y=Math.min(a>>3,b>>3);
 return [x+.065,y+.065,Math.abs(a%8-b%8)+.87,Math.abs((a>>3)-(b>>3))+.87];
}
function ring(ctx,box,r,time,section){
 const [x,y,w,h]=box;
 let paint=color(r);
 if(r.tier===3&&!r.oddsUp){paint=ctx.createLinearGradient(x,y,x+w,y+h);rainbow.forEach((c,i)=>paint.addColorStop(i/5,c));}
 ctx.beginPath();ctx.roundRect(x,y,w,h,section?.23:.16);
 ctx.lineWidth=.13;ctx.strokeStyle='#402a35';ctx.stroke();
 ctx.lineWidth=.082;ctx.strokeStyle=paint;ctx.stroke();
 ctx.setLineDash([section?.37:.2,section?.85:.65]);ctx.lineDashOffset=-time/570;
 ctx.lineWidth=.043;ctx.strokeStyle='#ffffec';ctx.stroke();ctx.setLineDash([]);
}
function boardMarks(ctx,s,p,t){
 for(const {cells} of s.lines){
  const [x,y,w,h]=bounds(cells);ctx.beginPath();ctx.roundRect(x+.02,y+.02,w-.04,h-.04,.18);
  ctx.lineWidth=.09;ctx.strokeStyle='#93521e';ctx.stroke();ctx.lineWidth=.045;ctx.strokeStyle='#ffdf79';ctx.stroke();
 }
 const active=p.paths.length?p.paths[Math.floor(t/1900)%p.paths.length]:null;
 if(active)ring(ctx,bounds(active.cells),active.r,t,true);
 for(const [i,r] of p.cells)ring(ctx,bounds([i]),r,t,false);
 return active;
}
function popup(o){return o.oddsPopupTime!=null&&o.oddsPopupTime>=0&&o.oddsPopupTime<1900;}
function drawMini(ctx,s,o={}){
 const {width:w,height:h}=ctx.canvas,flash=popup(o),foot=flash?h*.22:0,size=Math.min(w,h-foot),x=(w-size)/2,y=(h-foot-size)/2,u=size/8;
 const free=new Set([...s.initialFree,...s.placedFree]),hits=new Set(s.hits);
 ctx.save();ctx.clearRect(0,0,w,h);ctx.fillStyle='#572c1a';ctx.fillRect(0,0,w,h);
 for(let i=0;i<64;i++){
  const left=x+i%8*u,top=y+(i>>3)*u;
  ctx.fillStyle='#edc383';ctx.fillRect(left+.035*u,top+.035*u,.93*u,.93*u);
  if(loaded(tileArt))ctx.drawImage(tileArt,left+.04*u,top+.04*u,.92*u,.92*u);
  if(free.has(i)||hits.has(i)){ctx.fillStyle=free.has(i)?'#8fe6bdbc':'#ff7c9baa';ctx.fillRect(left+.04*u,top+.04*u,.92*u,.92*u);}
  if(u<7)continue;
  if(typeof drawElixirNumber==='function')drawElixirNumber(ctx,s.numbers[i],left+u*.5,top+u*.5,u*.8,'#452719','#fff0c8',u*.065);
  else{ctx.font=`900 ${u*.66}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#372015';ctx.fillText(s.numbers[i],left+.5*u,top+.5*u);}
 }
 ctx.save();ctx.translate(x,y);ctx.scale(u,u);boardMarks(ctx,s,forecast(o.reach||empty),reduce.matches?0:o.time||0);ctx.restore();
 if(flash){
  ctx.fillStyle='#143c2e';ctx.fillRect(0,h-foot,w,foot);
  if(loaded(effectArt)){ctx.globalAlpha=.22;ctx.drawImage(effectArt,0,h-foot,w,foot);ctx.globalAlpha=1;}
  ctx.fillStyle='#b1ffaf';ctx.font=`900 ${Math.min(foot*.57,w*.116)}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('オッズアップ',w/2,h-foot*.5);
 }
 ctx.restore();
}
function mount(panel,actions){
 const root=document.createElement('section');root.className='bs-scene';root.setAttribute('aria-label','ビンゴワッフル');
 root.innerHTML=`<header class="bs-head"><div class="bs-brand"><img src="assets/waffle-logo.webp" alt="ビンゴワッフル"></div><div class="bs-total"><small><span>合計配当</span> <em></em></small><b></b></div></header>
 <div class="bs-body"><div class="bs-tray"><div class="bs-board"><div class="bs-grid"><canvas class="bs-effects" aria-hidden="true"></canvas></div></div><div class="bs-guide" hidden></div></div>
 <aside class="bs-side"><section class="bs-info"><small class="bs-kicker"></small><div class="bs-detail"><strong class="bs-phase"></strong><span class="bs-note"></span><span class="bs-forecast-label" hidden></span><div class="bs-toast" role="status" hidden><b>オッズアップ</b><span></span></div></div><button type="button" class="bs-confirm" hidden>配置を確定</button></section>
 <section class="bs-pay"><div class="bs-pay-title"><b>配当表</b><button type="button" class="bs-open" aria-expanded="false">拡大</button></div><div class="bs-rate"></div><div class="bs-scroll" tabindex="0" aria-label="成立本数ごとの基本配当。横にスクロールできます"><table><thead></thead><tbody></tbody></table></div><div class="bs-pages"><button aria-label="少ない本数へ">‹</button><span>成立本数</span><button aria-label="多い本数へ">›</button></div></section></aside></div>
 <section class="bs-full" role="dialog" aria-label="配当早見表" hidden><div class="bs-full-head"><div><small>WAFFLE BINGO</small><strong>配当早見表</strong></div><button type="button" class="bs-close">閉じる</button></div><p></p><table></table><div class="bs-full-foot"><button type="button">‹ 前へ</button><b></b><button type="button">次へ ›</button></div></section>`;
 panel.append(root);const q=k=>root.querySelector(k);
 const grid=q('.bs-grid'),guide=q('.bs-guide'),effects=q('.bs-effects'),ctx=effects.getContext('2d'),confirm=q('.bs-confirm'),toast=q('.bs-toast');
 const buttons=Array.from({length:64},(_,i)=>{
  const b=document.createElement('button');b.type='button';b.className='bs-cell';b.innerHTML='<span></span><small></small>';b.onclick=()=>actions.toggle(i);grid.append(b);return b;
 });
 let lastState=null,lastItems,lastDemo,lastNumber,lastTime,lastBet,lastSugar,lastFlash,lastChoice=null,lastPaint='',serial=0;
 function fit(){
  const w=root.clientWidth,h=root.clientHeight;if(!w||!h)return;
  root.style.setProperty('--bs-w',w+'px');root.style.setProperty('--bs-h',h+'px');
  const tray=q('.bs-tray'),side=Math.max(1,Math.min(tray.clientWidth,tray.clientHeight-guide.offsetHeight));
  root.style.setProperty('--bs-board',side+'px');
  const px=Math.max(1,Math.round(grid.clientWidth*Math.min(devicePixelRatio||1,2)));
  if(effects.width!==px||effects.height!==px){effects.width=px;effects.height=px;lastPaint='';}
 }
 new ResizeObserver(fit).observe(root);fit();
 const scroll=q('.bs-scroll'),full=q('.bs-full'),opener=q('.bs-open'),closer=q('.bs-close');
 const [prev,next]=q('.bs-pages').querySelectorAll('button'),[back,forward]=q('.bs-full-foot').querySelectorAll('button');
 const head=nums=>'<tr><th scope="col">ライン長</th>'+nums.map(n=>`<th scope="col">${n}本</th>`).join('')+'</tr>';
 const nums=(start,n)=>Array.from({length:n},(_,i)=>start+i);
 const inline=nums(1,16);q('.bs-pay thead').innerHTML=head(inline);
 q('.bs-pay tbody').innerHTML=lengths.map(l=>`<tr><th scope="row">${l}個</th>`+inline.map(n=>`<td>${multiple(R.award(l,n))}</td>`).join('')+'</tr>').join('');
 const payRows=[...q('.bs-pay tbody').rows];let page=0;
 function nav(){prev.disabled=scroll.scrollLeft<1;next.disabled=scroll.scrollLeft+scroll.clientWidth>=scroll.scrollWidth-1;}
 prev.onclick=()=>scroll.scrollBy({left:-Math.max(50,scroll.clientWidth-36)});next.onclick=()=>scroll.scrollBy({left:Math.max(50,scroll.clientWidth-36)});scroll.onscroll=nav;
 function overview(s){
  const columns=nums(page*6+1,Math.min(6,16-page*6));
  full.querySelector('p').textContent=`表示は基本配当。成立した行の合計 × 現在オッズ ${odds(s).toFixed(1)}。`;
  full.querySelector('table').innerHTML='<thead>'+head(columns)+'</thead><tbody>'+lengths.map(l=>`<tr><th scope="row">${l}個</th>`+columns.map(n=>`<td class="${s.counts[l]===n?'current':''}">${multiple(R.award(l,n)).replace(/\.0倍$/,'倍')}</td>`).join('')+'</tr>').join('')+'</tbody>';
  q('.bs-full-foot b').textContent=`${columns[0]}〜${columns.at(-1)}本`;back.disabled=page===0;forward.disabled=page===2;
 }
 function close(){full.hidden=true;q('.bs-body').inert=false;opener.setAttribute('aria-expanded','false');opener.focus({preventScroll:true});}
 opener.onclick=()=>{if(!lastState)return;page=0;overview(lastState);full.hidden=false;q('.bs-body').inert=true;opener.setAttribute('aria-expanded','true');closer.focus({preventScroll:true});};
 closer.onclick=close;back.onclick=()=>{page--;overview(lastState);};forward.onclick=()=>{page++;overview(lastState);};
 full.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();close();}};confirm.onclick=()=>actions.confirm();
 function draw(s,o={}){
  const thinking=s.phase==='thinking',interactive=thinking&&!o.demo,ms=Math.max(0,Math.ceil((o.remainingMs??15000)/1000));
  const items=o.reach||empty,p=forecast(items),flash=popup(o),t=reduce.matches?0:o.time||0;
  const needsContent=s!==lastState||items!==lastItems||!!o.demo!==lastDemo||o.latestNumber!==lastNumber||ms!==lastTime||o.bet!==lastBet||o.sugarCollected!==lastSugar||flash!==lastFlash;
  if(needsContent){
   if(interactive&&(lastDemo||lastState?.phase!=='thinking')&&!full.hidden)close();
   if(!full.hidden&&s!==lastState)overview(s);
   const help=o.demo?'ラインは縦・横のみ（斜めなし）<br>FREEに入賞でオッズ＋0.5':thinking?'空きマスをタップ・もう一度で解除<br>時間切れで残りを自動配置':'';
   if(guide.innerHTML!==help){guide.innerHTML=help;guide.hidden=!help;fit();}
   root.classList.toggle('thinking',thinking);q('.bs-total small span').textContent=thinking?'見込配当':'合計配当';q('.bs-total b').textContent=multiple(s.totalHundredths);q('.bs-total em').textContent=!o.demo&&o.bet?Math.floor(o.bet*s.totalHundredths/100)+'枚':'';
   q('.bs-kicker').textContent=(o.demo?'デモ · ':'')+(thinking?'FREE配置':s.phase==='done'?'RESULT':s.draws.length+' / 8 球');
   q('.bs-phase').textContent=thinking?'残り '+ms+' 秒':s.phase==='done'?'抽選終了':s.phase==='first'?'前半抽選':'後半抽選';
   q('.bs-note').textContent=thinking?`FREE ${s.placedFree.length} / ${s.freeBudget} 個`:`最長 ${s.longest} 個ライン`;
   confirm.hidden=!interactive;confirm.textContent=s.placedFree.length<s.freeBudget?'残りを自動配置':'配置を確定';
   toast.hidden=!flash;toast.lastChild.textContent='＋'+((s.oddsUpCells?.length||1)/2).toFixed(1)+' → ×'+odds(s).toFixed(1);q('.bs-info').classList.toggle('boost',flash);
   q('.bs-rate').textContent='基本配当 × '+odds(s).toFixed(1);q('.bs-rate').title='成立した行の基本配当を合計し、現在のオッズを掛けます';
   const starts=new Set(s.initialFree),placed=new Set(s.placedFree),hits=new Set(s.hits),wins=new Set(s.lines.flatMap(l=>l.cells));
   buttons.forEach((b,i)=>{
    const f=starts.has(i)||placed.has(i),hit=hits.has(i),r=!hit&&p.cells.get(i),n=s.numbers[i];
    b.className=['bs-cell',f?'free':'',placed.has(i)?'placed':'',hit?'hit':'',wins.has(i)?'win':'',hit&&n===o.latestNumber?'latest':'',r?'reach':'',flash&&f&&n===o.latestNumber?'boosted':''].filter(Boolean).join(' ');
    b.firstChild.textContent=n;b.lastChild.textContent=r?.oddsUp?'オッズアップ':f?'FREE':r?labels[r.tier]:'';
    b.dataset.odds=String(!!r?.oddsUp);if(r){b.style.setProperty('--reach-ink',color(r));b.dataset.tier=r.tier;}else{delete b.dataset.tier;}
    b.disabled=!interactive||starts.has(i)||hit||(!placed.has(i)&&placed.size>=s.freeBudget);
    b.setAttribute('aria-label',`${(i>>3)+1}行${i%8+1}列、${n}${f?'、フリー':''}${placed.has(i)?'、選択済み':''}`);b.setAttribute('aria-pressed',String(placed.has(i)));
   });
   payRows.forEach((row,i)=>{const count=s.counts[lengths[i]];for(let n=1;n<row.cells.length;n++)row.cells[n].classList.toggle('current',n===count);});nav();
   lastState=s;lastItems=items;lastDemo=!!o.demo;lastNumber=o.latestNumber;lastTime=ms;lastBet=o.bet;lastSugar=o.sugarCollected;lastFlash=flash;serial++;
  }
  const key=serial+'_'+(p.cells.size||p.paths.length?Math.floor(t/40):0);
  if(key===lastPaint)return;lastPaint=key;
  ctx.setTransform(effects.width/8,0,0,effects.height/8,0,0);ctx.clearRect(0,0,8,8);
  const active=boardMarks(ctx,s,p,t);
  if(active!==lastChoice){const el=q('.bs-forecast-label');el.hidden=!active;if(active){el.style.color=color(active.r);el.textContent=`${active.r.number}番で${active.cells.length}個ライン`;}lastChoice=active;}
 }
 return {draw,drawMini};
}
window.BingoStickView={mount,drawMini};
})();

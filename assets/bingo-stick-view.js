/* The waffle cabinet and miniature use the same cell coordinates and reach painter. */
(()=>{
'use strict';
const R=window.BingoStickRules,lengths=[8,7,6,5];
const colors=['#87f7ff','#ff7288','#dba0ff','#ffeaa2'],labels=['リーチ','高額','超高額','最高役'];
const rainbow=['#ff879e','#ffd56d','#bffd92','#72eeff','#d09cff','#ffa6d7'];
const empty=[],plans=new WeakMap(),reduce=matchMedia('(prefers-reduced-motion: reduce)');
function art(name){const image=new Image();image.src='assets/waffle-'+name+'.webp';return image;}
const tileArt=art('cell'),butterArt=art('butter'),effectArt=art('effect');
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
// The butter photograph supplies the highlights and knife marks. Only its pale
// interior is tinted; the baked rim is transparent in these reusable overlays.
const flavors={5:'#68b7ff',6:'#79d58a',7:'#ffdc53',8:'#ff7974'},brushes={};
butterArt.addEventListener('load',prepareBrushes,{once:true});
function prepareBrushes(){
 if(brushes[5]||!loaded(butterArt))return;
 const source=document.createElement('canvas');source.width=source.height=112;
 const g=source.getContext('2d');g.drawImage(butterArt,0,0,112,112);
 const original=g.getImageData(0,0,112,112).data;
 for(const n of lengths){
  const tile=document.createElement('canvas');tile.width=tile.height=112;
  const c=tile.getContext('2d'),image=c.createImageData(112,112),pixels=image.data;
  const rgb=flavors[n].slice(1).match(/../g).map(v=>parseInt(v,16));
  for(let i=0;i<pixels.length;i+=4){
   const r=original[i],g=original[i+1],b=original[i+2],light=(g/237)**1.8;
   pixels[i]=rgb[0]*light;pixels[i+1]=rgb[1]*light;pixels[i+2]=rgb[2]*light;
   pixels[i+3]=255*Math.min(1,Math.max(0,(105-(r-b))/48));
  }
  c.putImageData(image,0,0);brushes[n]=tile;
 }
}
prepareBrushes();
const butterFrames=new WeakMap(),spreadMs=540;
function butterFrame(ctx,s,o){
 const t=o.time||0,previous=butterFrames.get(ctx);
 if(previous?.state===s)return previous;
 const level=new Uint8Array(64),order=new Uint8Array(64);
 for(const line of s.lines)line.cells.forEach((cell,k)=>{
  if(line.length>level[cell]){level[cell]=line.length;order[cell]=k;}
 });
 const sameRound=previous&&s.numbers===previous.state.numbers&&s.draws.length>=previous.state.draws.length&&!!o.demo===previous.demo;
 const changed=sameRound&&level.some((n,i)=>n!==previous.level[i]);
 // Confirming a hand-placed group can produce a new snapshot with identical
 // runs. Let its spread finish instead of restarting it at confirmation.
 const frame=sameRound&&!changed?previous:{
  level,order,from:changed?previous.level:level,start:changed?t:-Infinity,demo:!!o.demo
 };
 frame.state=s;butterFrames.set(ctx,frame);return frame;
}
function butterCell(c,f,i,x,y,w,t){
 const n=f.level[i],old=f.from[i],age=t-f.start;
 const p=!reduce.matches&&n>old?Math.max(0,Math.min(1,(age-f.order[i]*32)/spreadMs)):1;
 const mix=p*p*(3-2*p);
 function coat(k,a){
  if(!k||!a)return;
  c.globalAlpha=a;
  if(brushes[k])c.drawImage(brushes[k],x,y,w,w);
  else{c.fillStyle=flavors[k];c.fillRect(x+w*.12,y+w*.12,w*.76,w*.76);}
 }
 if(p<1)coat(old,1-mix);coat(n,mix);c.globalAlpha=1;
 if(p>0&&p<1){
  c.save();c.beginPath();c.rect(x+.13*w,y+.13*w,.74*w,.74*w);c.clip();
  const sweep=x+(1.22*p-.13)*w;c.strokeStyle='rgba(255,255,241,'+(.62*Math.sin(Math.PI*p))+')';c.lineWidth=w*.10;
  c.beginPath();c.moveTo(sweep-.16*w,y+w*.92);c.lineTo(sweep+.16*w,y+w*.08);c.stroke();c.restore();
 }
}
function placedFrame(c,x,y,w){
 c.lineJoin='miter';
 for(const [inset,width,ink] of [[.10,.11,'#57321d'],[.10,.045,'#fff4cf'],[.16,.025,'#6a401e']]){
  c.strokeStyle=ink;c.lineWidth=width*w;c.strokeRect(x+w*inset,y+w*inset,w*(1-2*inset),w*(1-2*inset));
 }
}
function boardMarks(ctx,s,p,t){
 const active=p.paths.length?p.paths[Math.floor(t/1900)%p.paths.length]:null;
 if(active)ring(ctx,bounds(active.cells),active.r,t,true);
 for(const [i,r] of p.cells)ring(ctx,bounds([i]),r,t,false);
 return active;
}
function popup(o){return o.oddsPopupTime!=null&&o.oddsPopupTime>=0;}
function overlapEvent(s,o){
 if(o.oddsEvent)return o.oddsEvent;
 const cells=s.oddsUpCells||[];
 return {number:o.latestNumber??s.draws.at(-1),cells,fromOdds:odds(s)-cells.length*.5,toOdds:odds(s)};
}
function drawMini(ctx,s,o={}){
 const {width:w,height:h}=ctx.canvas,flash=popup(o),foot=flash?h*.22:0,size=Math.min(w,h-foot),x=(w-size)/2,y=(h-foot-size)/2,u=size/8;
 const placed=new Set(s.placedFree),free=new Set([...s.initialFree,...placed]),hits=new Set(s.hits),frame=butterFrame(ctx,s,o);
 ctx.save();ctx.clearRect(0,0,w,h);ctx.fillStyle='#572c1a';ctx.fillRect(0,0,w,h);
 for(let i=0;i<64;i++){
  const left=x+i%8*u,top=y+(i>>3)*u;
  const buttered=free.has(i)||hits.has(i),sprite=buttered?butterArt:tileArt;
  ctx.fillStyle=buttered?'#fff9eb':'#edc383';ctx.fillRect(left+.035*u,top+.035*u,.93*u,.93*u);
  if(loaded(sprite))ctx.drawImage(sprite,left+.04*u,top+.04*u,.92*u,.92*u);
  butterCell(ctx,frame,i,left+.04*u,top+.04*u,.92*u,o.time||0);
  if(placed.has(i))placedFrame(ctx,left,top,u);
  if(flash&&s.oddsUpCells.includes(i)&&loaded(effectArt))ctx.drawImage(effectArt,left,top,u,u);
  if(u<7)continue;
  if(typeof drawElixirNumber==='function')drawElixirNumber(ctx,s.numbers[i],left+u*.5,top+u*.5,u*.8,'#452719','#fff0c8',u*.065);
  else{ctx.font=`900 ${u*.66}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#372015';ctx.fillText(s.numbers[i],left+.5*u,top+.5*u);}
 }
 ctx.save();ctx.translate(x,y);ctx.scale(u,u);boardMarks(ctx,s,forecast(o.reach||empty),reduce.matches?0:o.time||0);ctx.restore();
 if(flash){
  ctx.fillStyle='#143c2e';ctx.fillRect(0,h-foot,w,foot);
  if(loaded(effectArt)){ctx.globalAlpha=.22;ctx.drawImage(effectArt,0,h-foot,w,foot);ctx.globalAlpha=1;}
  const e=overlapEvent(s,o),delta=(e.toOdds-e.fromOdds).toFixed(1);
  ctx.fillStyle='#b1ffaf';ctx.font=`900 ${Math.min(foot*.72,w*.1)}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(e.number+'番 FREE ＋'+delta,w/2,h-foot*.5,w*.97);
 }
 ctx.restore();
}
function mount(panel,actions){
 const root=document.createElement('section');root.className='bs-scene';root.setAttribute('aria-label','ビンゴワッフル');
 root.innerHTML=`<header class="bs-head"><div class="bs-brand"><img src="assets/waffle-logo.webp" alt="ビンゴワッフル"></div><div class="bs-total"><small><span>合計配当</span> <em></em></small><b></b></div><div class="bs-toast" role="status" hidden><div><b>オッズアップ</b><span class="bs-trigger"></span></div><div><strong class="bs-boost-value"></strong><span class="bs-boost-step"></span></div></div></header>
 <div class="bs-body"><div class="bs-tray"><div class="bs-board"><div class="bs-grid"><canvas class="bs-effects" aria-hidden="true"></canvas></div></div><div class="bs-guide" hidden></div></div>
 <aside class="bs-side"><section class="bs-info"><small class="bs-kicker"></small><div class="bs-detail"><strong class="bs-phase"></strong><span class="bs-note"></span><span class="bs-forecast-label" hidden></span></div><button type="button" class="bs-confirm" hidden>配置を確定</button></section>
 <section class="bs-pay"><div class="bs-pay-title"><b>配当表</b><button type="button" class="bs-open" aria-expanded="false">拡大</button></div><div class="bs-rate"></div><div class="bs-quick-matrix" tabindex="0" aria-label="成立本数ごとの基本配当"><table><thead></thead><tbody></tbody></table></div><div class="bs-top-role">8個ライン2本以上で最高役</div></section></aside></div>
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
 const full=q('.bs-full'),opener=q('.bs-open'),closer=q('.bs-close');
 const [back,forward]=q('.bs-full-foot').querySelectorAll('button');
 const head=nums=>'<tr><th scope="col">ライン長</th>'+nums.map(n=>`<th scope="col">${n}本</th>`).join('')+'</tr>';
 const nums=(start,n)=>Array.from({length:n},(_,i)=>start+i);
 // Show the normal one/two-line awards and any larger count on this board or one draw away.
 let page=0,inlineKey='';
 function compactTable(s,items){
  const high=new Set();
  for(const counts of [s.counts,...items.map(item=>item.counts).filter(Boolean)]){
   for(const n of lengths)if(counts[n]>2)high.add(counts[n]);
  }
  const highCounts=[...high].sort((a,b)=>a-b);
  const columns=[1,2,...highCounts],key=columns.join('/');
  if(key!==inlineKey){
   const compact=q('.bs-quick-matrix'),table=compact.querySelector('table');
   // Exceptionally, one draw can bring several different rare counts into play.
   table.style.minWidth=columns.length>3?`calc(var(--bs-w) * ${(columns.length+1)*.103})`:'';
   q('.bs-pay thead').innerHTML=head(columns);
   q('.bs-pay tbody').innerHTML=lengths.map(l=>`<tr><th scope="row" data-length="${l}">${l}個</th>`+
     columns.map(n=>`<td>${multiple(R.award(l,n)).replace(/\.0倍$/,'倍')}</td>`).join('')+'</tr>').join('');
   if(columns.length>3)compact.scrollLeft=compact.scrollWidth;
   inlineKey=key;
  }
  [...q('.bs-pay tbody').rows].forEach((row,i)=>columns.forEach((n,j)=>row.cells[j+1].classList.toggle('current',s.counts[lengths[i]]===n)));
  const role=q('.bs-top-role'),earned=s.counts[8]>=2;
  role.classList.toggle('earned',earned);role.textContent=earned?(s.phase==='thinking'?'最高役の見込み':'最高役達成')+' · 8個×'+s.counts[8]+'本':'8個ライン2本以上で最高役';
 }
 function overview(s){
  const columns=nums(page*6+1,Math.min(6,16-page*6));
  full.querySelector('p').textContent=`基本配当の合計 × 現在オッズ ${odds(s).toFixed(1)}。8個ライン2本以上で最高役。`;
  full.querySelector('table').innerHTML='<thead>'+head(columns)+'</thead><tbody>'+lengths.map(l=>`<tr><th scope="row" data-length="${l}">${l}個</th>`+columns.map(n=>`<td class="${s.counts[l]===n?'current':''}">${multiple(R.award(l,n)).replace(/\.0倍$/,'倍')}</td>`).join('')+'</tr>').join('')+'</tbody>';
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
  const frame=butterFrame(ctx,s,o);
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
   toast.hidden=!flash;
   if(flash){
    const e=overlapEvent(s,o),delta=e.toOdds-e.fromOdds;
    q('.bs-trigger').textContent=`${e.number}番がFREE ${e.cells.length}マスにHIT`;
    q('.bs-boost-value').textContent=`×${e.fromOdds.toFixed(1)} → ×${e.toOdds.toFixed(1)}`;
    q('.bs-boost-step').textContent=`＋0.5 × ${e.cells.length} ＝ ＋${delta.toFixed(1)}`;
   }
   q('.bs-rate').textContent='基本配当 × '+odds(s).toFixed(1);q('.bs-rate').title='成立した行の基本配当を合計し、現在のオッズを掛けます';
   const starts=new Set(s.initialFree),placed=new Set(s.placedFree),hits=new Set(s.hits);
   buttons.forEach((b,i)=>{
    const f=starts.has(i)||placed.has(i),hit=hits.has(i),r=!hit&&p.cells.get(i),n=s.numbers[i];
    b.className=['bs-cell',f?'free':'',placed.has(i)?'placed':'',hit?'hit':'',frame.level[i]?'win':'',hit&&n===o.latestNumber?'latest':'',r?'reach':'',flash&&f&&n===o.latestNumber?'boosted':''].filter(Boolean).join(' ');
    b.dataset.line=String(frame.level[i]);
    b.firstChild.textContent=n;b.lastChild.textContent=r?.oddsUp?'オッズアップ':f?'FREE':r?labels[r.tier]:'';
    b.dataset.odds=String(!!r?.oddsUp);if(r){b.style.setProperty('--reach-ink',color(r));b.dataset.tier=r.tier;}else{delete b.dataset.tier;}
    b.disabled=!interactive||starts.has(i)||hit||(!placed.has(i)&&placed.size>=s.freeBudget);
    b.setAttribute('aria-label',`${(i>>3)+1}行${i%8+1}列、${n}${f?'、フリー':''}${placed.has(i)?'、選択済み':''}`);b.setAttribute('aria-pressed',String(placed.has(i)));
   });
   if(s!==lastState||items!==lastItems)compactTable(s,items);
   lastState=s;lastItems=items;lastDemo=!!o.demo;lastNumber=o.latestNumber;lastTime=ms;lastBet=o.bet;lastSugar=o.sugarCollected;lastFlash=flash;serial++;
  }
  const spreading=!reduce.matches&&t-frame.start<spreadMs+7*32;
  const key=serial+'_'+(spreading||p.cells.size||p.paths.length?Math.floor(t/40):0)+'_'+!!brushes[5];
  if(key===lastPaint)return;lastPaint=key;
  ctx.setTransform(effects.width/8,0,0,effects.height/8,0,0);ctx.clearRect(0,0,8,8);
  // CSS grid gap is .75% of its width: .06 in this 8-unit coordinate system.
  const gap=.06,w=(8-7*gap)/8;
  for(let i=0;i<64;i++)if(frame.level[i])butterCell(ctx,frame,i,(i%8)*(w+gap),(i>>3)*(w+gap),w,t);
  for(const i of s.placedFree)placedFrame(ctx,(i%8)*(w+gap),(i>>3)*(w+gap),w);
  const active=boardMarks(ctx,s,p,t);
  if(flash&&loaded(effectArt))for(const i of s.oddsUpCells)ctx.drawImage(effectArt,(i%8)*(w+gap)-w*.07,(i>>3)*(w+gap)-w*.07,w*1.14,w*1.14);
  if(active!==lastChoice){const el=q('.bs-forecast-label');el.hidden=!active;if(active){el.style.color=color(active.r);el.textContent=`${active.r.number}番で${active.cells.length}個ライン`;}lastChoice=active;}
 }
 return {draw,drawMini};
}
window.BingoStickView={mount,drawMini};
})();

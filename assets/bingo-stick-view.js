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
// Each number gets one preview. New forecasts begin with the highest line reach.
function forecast(items,time){
 if(plans.has(items))return plans.get(items);
 const ordered=[...items].sort((a,b)=>Number(a.oddsUp)-Number(b.oddsUp)||b.tier-a.tier||b.gain-a.gain||a.number-b.number);
 const paths=[];
 for(const r of ordered){
  const line=r.lines?.reduce((longest,line)=>!longest||line.length>longest.length?line:longest,null);
  const cells=line?.cells||(r.oddsCells?.length?[r.oddsCells[0]]:null);
  if(cells)paths.push({r,cells});
 }
 const plan={paths,start:time||0};plans.set(items,plan);return plan;
}
function bounds(cells){
 const a=cells[0],b=cells.at(-1),x=Math.min(a%8,b%8),y=Math.min(a>>3,b>>3);
 return [x+.065,y+.065,Math.abs(a%8-b%8)+.87,Math.abs((a>>3)-(b>>3))+.87];
}
function ring(ctx,box,r,time){
 const [x,y,w,h]=box,radius=.17;
 let paint=color(r);
 if(r.tier===3&&!r.oddsUp){paint=ctx.createLinearGradient(x,y,x+w,y+h);rainbow.forEach((c,i)=>paint.addColorStop(i/5,c));}
 ctx.beginPath();ctx.roundRect(x,y,w,h,radius);
 ctx.lineWidth=.11;ctx.strokeStyle='#302238';ctx.stroke();
 ctx.lineWidth=.067;ctx.strokeStyle=paint;ctx.stroke();
 if(!reduce.matches){
  const lap=2*(w+h)-(8-2*Math.PI)*radius;
  ctx.setLineDash([.40,lap-.40]);ctx.lineDashOffset=-time/410;
  ctx.lineWidth=.045;ctx.strokeStyle='#ffffec';ctx.stroke();ctx.setLineDash([]);
 }
}
// The butter photograph supplies the highlights and knife marks. Only its pale
// interior is tinted; the baked rim is transparent in these reusable overlays.
const flavors={1:'#ffffff',5:'#2094ff',6:'#14de56',7:'#ffe000',8:'#ff343d'},brushes={};
butterArt.addEventListener('load',prepareBrushes,{once:true});
function prepareBrushes(){
 if(brushes[5]||!loaded(butterArt))return;
 const source=document.createElement('canvas');source.width=source.height=112;
 const g=source.getContext('2d');g.drawImage(butterArt,0,0,112,112);
 const original=g.getImageData(0,0,112,112).data;
 for(const n of [1,...lengths]){
  const tile=document.createElement('canvas');tile.width=tile.height=112;
  const c=tile.getContext('2d'),image=c.createImageData(112,112),pixels=image.data;
  const rgb=flavors[n].slice(1).match(/../g).map(v=>parseInt(v,16));
  for(let i=0;i<pixels.length;i+=4){
   const r=original[i],g=original[i+1],b=original[i+2];
   const light=n===1?.82+.18*(g/240)**2:(g/237)**1.5;
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
 for(const list of [s.initialFree,s.placedFree,s.hits])for(const i of list)level[i]=1;
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
 for(const [inset,width,ink] of [[.105,.095,'#57321d'],[.105,.035,'#fff4cf']]){
  c.strokeStyle=ink;c.lineWidth=width*w;c.strokeRect(x+w*inset,y+w*inset,w*(1-2*inset),w*(1-2*inset));
 }
}
function boardMarks(ctx,p,t){
 if(!p.paths.length)return null;
 const elapsed=Math.max(0,t-p.start),active=p.paths[Math.floor(elapsed/2500)%p.paths.length];
 ring(ctx,bounds(active.cells),active.r,elapsed);return active;
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
  if(free.has(i)){
   ctx.font=`900 ${u*.29}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';
   ctx.fillStyle='#382016';ctx.fillText('FREE',left+u*.5,top+u*.51,u*.75);
  }else if(typeof drawElixirNumber==='function')drawElixirNumber(ctx,s.numbers[i],left+u*.5,top+u*.5,u*.8,'#452719','#fff0c8',u*.065);
  else{ctx.font=`900 ${u*.66}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#372015';ctx.fillText(s.numbers[i],left+.5*u,top+.5*u);}
 }
 ctx.save();ctx.translate(x,y);ctx.scale(u,u);if(!flash)boardMarks(ctx,forecast(o.reach||empty,o.time),reduce.matches?0:o.time||0);ctx.restore();
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
 root.innerHTML=`<div class="bs-body"><div class="bs-tray"><div class="bs-board"><div class="bs-grid"><canvas class="bs-effects" aria-hidden="true"></canvas></div></div>
 <div class="bs-tools"><div class="bs-guide" hidden></div><div class="bs-actions" hidden><strong class="bs-timer"></strong><button type="button" class="bs-confirm">配置を確定</button></div><span class="bs-forecast-label" hidden></span><output class="bs-readout" hidden></output></div></div>
 <div class="bs-pay"><div class="bs-quick-matrix"><table aria-label="現在のオッズを反映した配当倍率"><thead></thead><tbody></tbody></table></div></div></div>
 <div class="bs-toast" role="status" hidden><b>オッズアップ</b><span class="bs-trigger"></span><span class="bs-boost-step"></span><strong class="bs-boost-value"></strong></div>`;
 panel.append(root);const q=k=>root.querySelector(k);
 const grid=q('.bs-grid'),guide=q('.bs-guide'),effects=q('.bs-effects'),ctx=effects.getContext('2d'),confirm=q('.bs-confirm'),toast=q('.bs-toast');
 const buttons=Array.from({length:64},(_,i)=>{
  const b=document.createElement('button');b.type='button';b.className='bs-cell';b.innerHTML='<span></span>';b.onclick=()=>actions.toggle(i);grid.append(b);return b;
 });
 let lastState=null,lastItems,lastDemo,lastNumber,lastTime,lastBet,lastSugar,lastFlash,lastChoice=null,lastPaint='',serial=0;
 function fit(){
  const w=root.clientWidth,h=root.clientHeight;if(!w||!h)return;
  root.style.setProperty('--bs-w',w+'px');root.style.setProperty('--bs-h',h+'px');
  const tray=q('.bs-tray'),side=Math.max(1,Math.min(tray.clientWidth,tray.clientHeight-q('.bs-tools').offsetHeight));
  root.style.setProperty('--bs-board',side+'px');
  const px=Math.max(1,Math.round(grid.clientWidth*Math.min(devicePixelRatio||1,2)));
  if(effects.width!==px||effects.height!==px){effects.width=px;effects.height=px;lastPaint='';}
 }
 const resize=new ResizeObserver(fit);resize.observe(root);resize.observe(q('.bs-tools'));fit();
 confirm.onclick=()=>actions.confirm();
 function compactTable(s,items){
  // Three five/six-cell runs recur in play. Show rarer combinations when
  // earned or one ball away, and apply FREE odds to the actual posted amounts.
  const counts=[s.counts,...items.map(item=>item.counts).filter(Boolean)];
  const columns=[...new Set([1,2,3,...counts.flatMap(row=>lengths.map(l=>row[l]).filter(n=>n>3))])].sort((a,b)=>a-b);
  const factor=odds(s),table=q('.bs-pay table');
  table.style.minWidth=columns.length>3?`calc(var(--bs-w) * ${(columns.length+1)*.115})`:'';
  table.tHead.innerHTML='<tr><th scope="col">ライン</th>'+columns.map(n=>`<th scope="col">${n}本</th>`).join('')+'</tr>';
  table.tBodies[0].innerHTML=lengths.map(l=>`<tr><th scope="row" data-length="${l}">${l}個</th>`+columns.map(n=>{
   const relevant=n<=2||(l<=6&&n===3)||counts.some(row=>row[l]===n);
   const amount=relevant?multiple(Math.round(R.award(l,n)*factor)).replace(/\.0倍$/,'倍'):'—';
   return `<td${s.counts[l]===n?' class="current"':''}>${amount}</td>`;
  }).join('')+'</tr>').join('');
 }
 function draw(s,o={}){
  const thinking=s.phase==='thinking',interactive=thinking&&!o.demo,ms=Math.max(0,Math.ceil((o.remainingMs??15000)/1000));
  const items=o.reach||empty,p=forecast(items,o.time),flash=popup(o),t=reduce.matches?0:o.time||0;
  const needsContent=s!==lastState||items!==lastItems||!!o.demo!==lastDemo||o.latestNumber!==lastNumber||ms!==lastTime||o.bet!==lastBet||o.sugarCollected!==lastSugar||flash!==lastFlash;
  const frame=butterFrame(ctx,s,o);
  if(needsContent){
   const help=o.demo?'ラインは縦・横のみ（斜めなし）<br>FREEに入賞でオッズ＋0.5':thinking?'空きマスをタップ · 再タップで解除':'';
   if(guide.innerHTML!==help){guide.innerHTML=help;guide.hidden=!help;}
   const tools=q('.bs-actions');tools.hidden=!thinking;
   if(thinking)q('.bs-timer').textContent=`残り${ms}秒 ／ FREE ${s.placedFree.length}/${s.freeBudget}`;
   confirm.hidden=!interactive;confirm.textContent=s.placedFree.length<s.freeBudget?'残りを自動配置':'配置を確定';
   const readout=q('.bs-readout');readout.hidden=!s.totalHundredths;
   if(!readout.hidden){
    const role=s.highestRole?(thinking?'最高役見込み · ':'最高役達成 · '):'';
    const total=!o.demo&&o.bet?Math.floor(o.bet*s.totalHundredths/100).toLocaleString('ja-JP')+' WIN':multiple(s.totalHundredths);
    readout.textContent=role+(thinking?'見込 ':'合計 ')+total;
   }
   toast.hidden=!flash;
   if(flash){
    const e=overlapEvent(s,o),delta=e.toOdds-e.fromOdds;
    q('.bs-trigger').textContent=`${e.number}番がFREE ${e.cells.length}マスにHIT`;
    q('.bs-boost-value').textContent=`×${e.fromOdds.toFixed(1)} → ×${e.toOdds.toFixed(1)}`;
    q('.bs-boost-step').textContent=`＋0.5 × ${e.cells.length} ＝ ＋${delta.toFixed(1)}`;
   }
   const starts=new Set(s.initialFree),placed=new Set(s.placedFree),hits=new Set(s.hits);
   buttons.forEach((b,i)=>{
    const f=starts.has(i)||placed.has(i),hit=hits.has(i),n=s.numbers[i];
    b.className=['bs-cell',f?'free':'',placed.has(i)?'placed':'',hit?'hit':'',flash&&f&&n===o.latestNumber?'boosted':''].filter(Boolean).join(' ');
    b.dataset.line=String(frame.level[i]>=5?frame.level[i]:0);
    b.firstChild.textContent=f?'FREE':n;
    b.disabled=!interactive||starts.has(i)||hit||(!placed.has(i)&&placed.size>=s.freeBudget);
    b.setAttribute('aria-label',`${(i>>3)+1}行${i%8+1}列、${f?'FREE':n}${placed.has(i)?'、選択済み':''}`);b.setAttribute('aria-pressed',String(placed.has(i)));
   });
   if(s!==lastState||items!==lastItems)compactTable(s,items);
   lastState=s;lastItems=items;lastDemo=!!o.demo;lastNumber=o.latestNumber;lastTime=ms;lastBet=o.bet;lastSugar=o.sugarCollected;lastFlash=flash;serial++;
  }
  const spreading=!reduce.matches&&t-frame.start<spreadMs+7*32;
  const key=serial+'_'+(spreading||p.paths.length?Math.floor(t/40):0)+'_'+!!brushes[5];
  if(key===lastPaint)return;lastPaint=key;
  ctx.setTransform(effects.width/8,0,0,effects.height/8,0,0);ctx.clearRect(0,0,8,8);
  // CSS grid gap is .75% of its width: .06 in this 8-unit coordinate system.
  const gap=.06,w=(8-7*gap)/8;
  for(let i=0;i<64;i++)if(frame.level[i])butterCell(ctx,frame,i,(i%8)*(w+gap),(i>>3)*(w+gap),w,t);
  for(const i of s.placedFree)placedFrame(ctx,(i%8)*(w+gap),(i>>3)*(w+gap),w);
  const active=flash?null:boardMarks(ctx,p,t);
  if(flash&&loaded(effectArt))for(const i of s.oddsUpCells)ctx.drawImage(effectArt,(i%8)*(w+gap)-w*.07,(i>>3)*(w+gap)-w*.07,w*1.14,w*1.14);
  if(active!==lastChoice){const el=q('.bs-forecast-label');el.hidden=!active;if(active){el.style.color=color(active.r);el.textContent=active.r.oddsUp?'FREE オッズアップ':`${labels[active.r.tier]}　${active.r.number}番で${active.cells.length}個ライン`;}lastChoice=active;}
 }
 return {draw,drawMini};
}
window.BingoStickView={mount,drawMini};
})();

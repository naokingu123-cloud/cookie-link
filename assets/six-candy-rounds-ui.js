/* Host-compatible renderer for Six Candy v2. Uses the retained original candy sprites. */
function sixShapeIcon(type){
 const cells=type==='hexagon'?[[0,0],[0,1],[1,2],[2,2],[2,1],[1,0]]:type==='line'?[[1,0],[1,1],[1,2],[1,3]]:[[0,1],[1,1],[1,2],[2,1],[2,2],[2,3]];
 return '<svg viewBox="0 0 66 52" aria-hidden="true">'+cells.map(([r,c])=>'<circle cx="'+(12+(c-r/2)*16)+'" cy="'+(9+r*15)+'" r="6.8" fill="'+(type==='hexagon'?'#aa73e8':type==='line'?'#48bfd8':'#ee749d')+'" stroke="#fff4cd" stroke-width="2"/>').join('')+'</svg>';
}
function setupCarnivalSlot(s){
 if(s.candyCanvas)return;s.panel.classList.add('carnival-panel','six-ball-panel');s.tab.classList.add('carnival-tab');s.holder.classList.add('carnival-slot');
 s.tab.querySelector('.tab-game-name').innerHTML='<span class="carnival-tab-title six-candy-wordmark">シックスキャンディ<small>SIX CANDY</small></span>';s.tab.querySelector('.tab-game-name').setAttribute('aria-label','シックスキャンディ');
 const wrap=document.createElement('div');wrap.className='carnival-surface six-ball-surface';wrap.innerHTML='<div class="carnival-topline"><span class="six-round-label">Round 1</span><label class="six-rows-control">段数 <select aria-label="シックスキャンディの段数・デバッグ用" id="six-row-select"><option value="7">7段</option><option value="8">8段</option><option value="9">9段</option><option value="10" selected>10段</option></select></label></div><canvas class="carnival-canvas" width="640" height="640" role="img" aria-label="キャンディピラミッド"></canvas><div class="carnival-status" role="status"></div><div class="carnival-reward" role="status" hidden></div>';
 s.panel.append(wrap);s.candyCanvas=wrap.querySelector('canvas');s.candyCtx=s.candyCanvas.getContext('2d');s.candyStatus=wrap.querySelector('.carnival-status');s.candyReward=wrap.querySelector('.carnival-reward');s.rowSelect=wrap.querySelector('select');s.roundLabel=wrap.querySelector('.six-round-label');
 s.rowSelect.onchange=()=>{if(!app||app.phase!=='ready'){s.rowSelect.value=String(s.engine.rows);return;}if(s.engine.setRows(Number(s.rowSelect.value))){s.candyKey='';s.dirtyMain=s.dirtyMini=true;invalidateReach(s);scheduleUI(app);}};
 const heading=document.createElement('div');heading.id='carnival-heading';heading.innerHTML='<strong class="six-candy-wordmark">シックスキャンディ<small>SIX CANDY · SWEET PUZZLE</small></strong><span>Round <b id="carnival-complete">1</b></span>';document.querySelector('.festival-top').append(heading);
 const odds=document.createElement('div');odds.id='carnival-odds';odds.innerHTML='<div class="carnival-odds-title">SIX CANDY<small>役ごとに配当を累積</small></div><section><span>今回の獲得</span><b id="carnival-win">0</b><em>WIN</em></section>'+[['hexagon','ヘキサゴン','0.5 / 1.0 / 1.5…'],['triangle','トライアングル','0.3 / 0.6 / 0.9…'],['line','直線 4個以上','0.1 / 0.2 / 0.3…']].map(([type,label,table])=>'<div class="six-pay-track" data-role="'+type+'">'+sixShapeIcon(type)+'<span>'+label+'<small>'+table+'倍</small><b>0役・0倍</b></span></div>').join('')+'<div class="six-clear-bonus">ALL CLEAR <b>60 × BET</b></div><div class="carnival-sugar-goal">ヘキサゴン完成で<br><b>シュガーGET</b></div><p>4個以上の連結も消去<br>通常連結だけは配当なし<br>役の連鎖終了で次Roundへ</p><footer>Round 3：4色 / Round 5：3色<br>0 BETは参加なし</footer>';$('odds-panel').append(odds);
}
function carnivalEvent(s,ev,e,a){
 setupCarnivalSlot(s);s.event=ev;s.dirtyMain=true;s.dirtyMini=true;
 if(['ready','error'].includes(ev.phase)){stopSugarAward(s);clearMiniResult(s);s.candyReward.hidden=true;if(s.candyFrame)cancelAnimationFrame(s.candyFrame);s.candyFrame=0;s.candyLastDraw=0;invalidateReach(s);}
 if(ev.phase==='sugaraward')showSugarAward(s,ev.steps);
 if(ev.phase.startsWith('pyramid')){s.candyReward.hidden=true;s.candyReward.classList.remove('six-round-callout');invalidateReach(s);}
 if(ev.phase==='pyramidRound'){
  clearMiniResult(s);s.candyReward.hidden=false;s.candyReward.classList.add('six-round-callout');s.candyReward.dataset.tier='1';s.candyReward.innerHTML='<small>ROUND CLEAR!</small><strong>Round '+ev.nextRound+'</strong><span>次のキャンディピラミッドへ</span>';
 }
 if(ev.phase==='pyramidAward'||ev.phase==='pyramidAllClear'){
  const gain=ev.gain||0;s.candyReward.hidden=!gain;s.candyReward.dataset.tier=gain>=1000?'2':gain>=300?'1':'0';
  if(gain){const title=ev.phase==='pyramidAllClear'?'ALL CLEAR BONUS!':[ev.hexagons?'HEXAGON ×'+ev.hexagons:'',ev.triangles?'TRIANGLE ×'+ev.triangles:'',ev.lines?'LINE ×'+ev.lines:''].filter(Boolean).join(' + ');s.candyReward.innerHTML='<small>'+title+'</small><strong>＋'+num(medalWin(a.bet(s.i),gain))+' <em>WIN</em></strong><span>'+num(gain/100)+' × BET</span>';if(s.i===active)sound('confirm',{volume:1});}
 }
 if(['pyramidBreak','pyramidAward'].includes(ev.phase)&&s.i===active)sound('crack',{volume:.75});
 if(ev.phase==='pyramidShape'&&s.i===active)sound('magic',{volume:.6});
 if(ev.phase==='settled'){
  s.candyReward.hidden=true;clearMiniResult(s);
  if(ev.batchChain>0||ev.batchShapes>0){s.miniLastResult=(ev.batchShapes||0)+'役 · '+(ev.batchChain||0)+'連鎖';s.miniResult.innerHTML='<strong>'+(ev.batchShapes||0)+' SHAPES</strong><small>'+(ev.batchChain||0)+'連鎖</small>';s.miniResultState={remaining:MINI_RESULT_MS,stamp:null,version:e.version};}
 }
 if(['waiting','settled','complete'].includes(ev.phase))requestReach(s,e,a);
 s.message=e.candyMessage;carnivalQueueFrame(s);scheduleUI(a);
}
function carnivalQueueFrame(s){if(s.candyFrame||document.hidden||!inView)return;const version=s.engine.version;s.candyFrame=requestAnimationFrame(now=>{s.candyFrame=0;if(s.engine.version!==version)return;if(s.candyLastDraw&&now-s.candyLastDraw<32){carnivalQueueFrame(s);return;}s.candyLastDraw=now;drawCarnival(s,now);});}
const sixDemoCache=new Map();
function sixDemo(rows){if(!sixDemoCache.has(rows))sixDemoCache.set(rows,Array.from({length:rows},(_,r)=>Array.from({length:r+1},(_,c)=>({id:sixKey(r,c),number:null,color:(r+c)%5}))));return sixDemoCache.get(rows);}
function sixFallFrame(fx,progress){
 const steps=fx.steps||[];if(!steps.length)return {grid:fx.grid,moves:[],progress:1};const total=steps.reduce((n,f)=>n+f.ms,0);let t=Math.min(total,progress*total);
 for(let i=0;i<steps.length;i++){const f=steps[i];if(t<=f.ms||i===steps.length-1)return {grid:f.grid,moves:f.moves,progress:Math.min(1,t/f.ms)};t-=f.ms;}
 return {grid:fx.grid,moves:[],progress:1};
}
function drawCarnival(s,now=performance.now()){
 if(s.engine?.kind!=='candy')return;setupCarnivalSlot(s);const e=s.engine,x=s.candyCtx,paused=!app||app.paused||document.hidden||!inView,bet=app?.bet(s.i)||0,ready=app?.phase==='ready',rows=e.rows,layout=sixLayout(rows),fx=e.fx;
 if(!paused)s.candyTime=now;const time=s.candyTime||now;x.setTransform(2,0,0,2,0,0);x.clearRect(0,0,320,320);
 const progress=fx?(()=>{if(!paused){if(fx.stamp!==null)fx.elapsed+=Math.max(0,now-fx.stamp)*(e.presentationRate||1);fx.stamp=now;}else fx.stamp=null;return Math.min(1,fx.elapsed/Math.max(1,fx.ms));})():0;
 const fall=fx?.phase==='pyramidFall'?sixFallFrame(fx,motionReduced?1:progress):null,grid=ready?sixDemo(rows):fall?.grid||e.pyramid,moving=new Map((fall?.moves||[]).map(m=>[m.id,m]));
 const bg=x.createLinearGradient(0,0,320,320);bg.addColorStop(0,'#493955');bg.addColorStop(.55,'#674257');bg.addColorStop(1,'#35445f');x.fillStyle=bg;x.fillRect(0,0,320,320);
 // Candy-stick rails and lollipops frame an uncluttered playable triangle.
 for(const side of [8,312]){x.save();x.beginPath();x.roundRect(side-4,30,8,254,4);x.clip();x.fillStyle='#fff4df';x.fillRect(side-4,30,8,254);x.strokeStyle='#f18bb4';x.lineWidth=6;for(let y=20;y<290;y+=18){x.beginPath();x.moveTo(side-10,y);x.lineTo(side+10,y+14);x.stroke();}x.restore();}
 for(const [px,py,color] of [[14,17,0],[306,17,3]]){x.drawImage(sixCandySprite(color),px-12,py-12,24,24);}
 x.fillStyle='#f9daab';x.beginPath();x.roundRect(13,285,294,8,4);x.fill();
 x.strokeStyle='#eec7a01e';x.lineWidth=1;for(let r=0;r<rows;r++){const a=sixXY(r,0,rows),b=sixXY(r,r,rows);x.beginPath();x.moveTo(a.x-layout.radius,a.y+layout.radius);x.lineTo(b.x+layout.radius,b.y+layout.radius);x.stroke();}
 const lit=new Set((fx?.phase==='pyramidHit'?fx.cells:[]).map(p=>sixKey(...p))),shaped=new Set((fx?.forms||[]).flatMap(f=>f.cells).map(p=>sixKey(...p))),byNumber=new Map((ready?[]:visibleReachResults(s,app)).map(p=>[p.number,p]));
 for(let r=0;r<grid.length;r++)for(let c=0;c<=r;c++){
  const t=grid[r][c];if(!t)continue;let pos=sixXY(r,c,rows);const m=moving.get(t.id);
  if(m&&!motionReduced){const p=sixMotionPoint(m,fall.progress);pos={x:160+p.x*layout.step,y:layout.top+p.y*layout.step};}
  const pending=t.number!=null&&(e.pendingDraws.has(t.number)||lit.has(sixKey(r,c))),reach=t.number!=null?byNumber.get(t.number):null,shape=shaped.has(sixKey(r,c)),radius=layout.radius;
  x.save();if(!ready&&pending)x.globalAlpha=motionReduced?1:.55+.45*(.5+.5*Math.sin(time/115));if(shape||reach){x.shadowBlur=shape?12:6;x.shadowColor=shape?'#ffe39a':reach.tier>=2?'#eb93ff':'#fff3b6';}
  x.drawImage(sixCandySprite(t.color),pos.x-radius,pos.y-radius,radius*2,radius*2);x.shadowBlur=0;
  if(!ready&&t.number!=null){const font=Math.max(11,layout.step*.41);x.fillStyle='#442141c8';x.beginPath();x.ellipse(pos.x,pos.y+1,font*(t.number>=10?.94:.68),font*.7,0,0,7);x.fill();sixText(x,String(t.number),pos.x,pos.y+1,font,'#fffdf4');}
  if(shape||pending||reach){x.strokeStyle=shape?'#fff6b3':pending?'#fff9e7':reach.tier>=2?'#f0a2ff':'#fff3b6';x.lineWidth=shape?2.3:1.5;x.beginPath();x.arc(pos.x,pos.y,radius,0,Math.PI*2);x.stroke();}x.restore();
 }
 if(fx?.phase==='pyramidShape')for(const form of fx.forms){const points=form.cells.map(p=>sixXY(...p,rows));x.save();x.strokeStyle=form.type==='hexagon'?'#edb3ff':form.type==='line'?'#83f5ef':'#ffec98';x.shadowColor=x.strokeStyle;x.shadowBlur=12;x.lineWidth=3;x.beginPath();if(form.type==='line'){x.moveTo(points[0].x,points[0].y);x.lineTo(points.at(-1).x,points.at(-1).y);}else{sixHull(points).forEach((p,i)=>i?x.lineTo(p.x,p.y):x.moveTo(p.x,p.y));x.closePath();}x.stroke();x.restore();}
 sixText(x,'Round '+e.roundIndex+'  ·  '+(ready?5:e.sixColorCount)+' COLORS',160,19,12,'#fff3b9');
 if(fx?.removed&&progress<.75&&!motionReduced){const t=Math.min(1,progress/.75);x.save();x.globalAlpha=1-t;for(const v of fx.removed){const p=sixXY(v.r,v.c,rows);for(let k=0;k<4;k++){const a=v.tile.id*.7+k*Math.PI/2;x.save();x.translate(p.x+Math.cos(a)*t*24,p.y+Math.sin(a)*t*20+t*t*19);x.rotate(a+t*2);x.fillStyle=SIX_COLORS[v.tile.color].light;x.beginPath();x.moveTo(-3,-4);x.lineTo(5,-2);x.lineTo(2,5);x.lineTo(-4,2);x.closePath();x.fill();x.restore();}}x.restore();}
 sixText(x,'⬡ '+e.hexagons+'  △ '+e.triangles+'  LINE '+e.lines,17,307,10,'#ffdfb1','left');sixText(x,'残り '+(ready?rows*(rows+1)/2:e.remainingCandies),304,307,10,'#e3d9ff','right');
 if(!bet){x.fillStyle='#231b3ba8';x.fillRect(0,0,320,320);sixText(x,'0 BET',160,140,29);sixText(x,'BETして キャンディを落とそう',160,172,11);}
 s.miniCanvas.hidden=false;s.miniLogo.hidden=true;s.mini.setTransform(1,0,0,1,0,0);s.mini.clearRect(0,0,160,160);s.mini.drawImage(s.candyCanvas,0,0,160,160);
 s.candyCanvas.setAttribute('aria-label','シックスキャンディ・Round '+e.roundIndex+'、'+rows+'段、'+e.remainingCandies+'個、ヘキサゴン'+e.hexagons+'、トライアングル'+e.triangles+'、直線'+e.lines);
 s.candyStatus.textContent=!bet?'0 BET・このゲームは参加しません':ready?'1〜25は各1個・空白も使って役を作ろう！':e.candyMessage;
 if((fx||e.pendingDraws.size)&&!paused&&!jpcSession.active)carnivalQueueFrame(s);
}
function carnivalHud(a){
 const s=slots[2],e=s.engine;if(e?.kind!=='candy')return;setupCarnivalSlot(s);const selected=active===2;document.body.classList.toggle('carnival-active',selected);s.tab.setAttribute('aria-label','シックスキャンディ・Round '+e.roundIndex+'・'+a.bet(2)+' BET');s.miniCanvas.hidden=false;s.miniLogo.hidden=true;
 s.rowSelect.disabled=a.phase!=='ready';s.rowSelect.value=String(e.rows);s.roundLabel.textContent='Round '+e.roundIndex+' · '+(a.phase==='ready'?5:e.sixColorCount)+'色';
 if(selected){put('carnival-complete',e.roundIndex);fitGoldenNumber($('carnival-win'),num(medalWin(a.bet(2),e.totalHundredths)),23,80);for(const [role,count] of [['hexagon',e.hexagons],['triangle',e.triangles],['line',e.lines]]){const el=$('carnival-odds').querySelector('[data-role="'+role+'"] b');el.textContent=count+'役・'+num(count*SIX_PAY[role]/100)+'倍';}}
 const key=[e.version,e.phase,e.processed,e.rows,e.roundIndex,e.boardGeneration,e.remainingCandies,e.totalHundredths,a.bet(2),s.reachEpoch,s.reachStatus,a.paused,e.pendingDraws.size].join('/');if(s.candyKey!==key){s.candyKey=key;carnivalQueueFrame(s);}
}

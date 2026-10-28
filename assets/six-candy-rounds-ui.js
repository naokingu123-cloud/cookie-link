/* Host-compatible renderer for Six Candy v2. Uses the retained original candy sprites. */
function sixShapeIcon(type){
 const cells=type==='hexagon'?[[0,0],[0,1],[1,2],[2,2],[2,1],[1,0]]:type==='line'?[[1,0],[1,1],[1,2],[1,3]]:[[0,1],[1,1],[1,2],[2,1],[2,2],[2,3]];
 return '<svg viewBox="0 0 66 52" aria-hidden="true">'+cells.map(([r,c])=>'<circle cx="'+(12+(c-r/2)*16)+'" cy="'+(9+r*15)+'" r="6.8" fill="'+(type==='hexagon'?'#aa73e8':type==='line'?'#48bfd8':'#ee749d')+'" stroke="#fff4cd" stroke-width="2"/>').join('')+'</svg>';
}
function sixRoleTrack(type,label){
 return '<div class="six-role" data-role="'+type+'"><div class="six-role-head">'+sixShapeIcon(type)+'<strong>'+label+'</strong></div><div class="six-role-window"><div class="six-role-reel">'+Array.from({length:161},(_,n)=>'<div class="six-role-row" data-count="'+n+'"><span>'+n+'個</span><b>'+(n*SIX_PAY[type]/100).toFixed(1)+'×</b></div>').join('')+'</div></div></div>';
}
function setupCarnivalSlot(s){
 if(s.candyCanvas)return;s.panel.classList.add('carnival-panel','six-ball-panel');s.tab.classList.add('carnival-tab');s.holder.classList.add('carnival-slot');
 s.tab.querySelector('.tab-game-name').innerHTML=sixArtLogoMarkup('tab');s.tab.querySelector('.tab-game-name').setAttribute('aria-label','シックスドロップ');
 const wrap=document.createElement('div');wrap.className='carnival-surface six-ball-surface';wrap.innerHTML='<div class="six-board-viewport"><canvas class="carnival-canvas" width="640" height="640" role="img" aria-label="キャンディボード"></canvas><div class="six-reach-layer" aria-hidden="true"></div></div><div class="carnival-status" role="status"></div><div class="carnival-reward" role="status" hidden></div>';
 s.panel.append(wrap);s.candyCanvas=wrap.querySelector('canvas');s.candyCtx=s.candyCanvas.getContext('2d');s.candyStatus=wrap.querySelector('.carnival-status');s.candyReward=wrap.querySelector('.carnival-reward');s.sixReachLayer=wrap.querySelector('.six-reach-layer');
 const heading=document.createElement('div');heading.id='carnival-heading';heading.innerHTML='<strong>シックスドロップ'+sixArtLogoMarkup('main')+'</strong><span>Round <b id="carnival-complete">1</b></span>';document.querySelector('.festival-top').append(heading);
 const odds=document.createElement('div');odds.id='carnival-odds';odds.innerHTML='<div class="six-refill-note">盤面の番号にHITしなければ補充！<br>未抽選番号付きドロップも上から追加</div><section class="six-total"><span>TOTAL WIN</span><b id="carnival-win">0</b></section><div class="six-role-tables">'+sixRoleTrack('line','直線')+sixRoleTrack('triangle','トライアングル')+sixRoleTrack('hexagon','ヘキサゴン')+'</div><div class="six-clear-bonus">全消し <b>＋100×BET</b></div><div class="six-round-rail"><strong>ROUND CLEAR BONUS</strong><div class="six-round-cards">'+[-1,0,1].map(offset=>'<div class="six-round-card" data-offset="'+offset+'"><small>ROUND</small><b></b><em></em><span class="six-round-sugar sugar-gem" hidden></span></div>').join('')+'</div></div><div class="six-bonus-total">クリア累計 <b>0.0×</b></div><div class="six-bonus-list">'+Array.from({length:8},(_,i)=>'<span data-round="'+(i+1)+'">R'+(i+1)+' <b>'+ (sixRoundClearBonus(i+1)/100).toFixed(1)+'×</b></span>').join('')+'</div>';
 $('odds-panel').append(odds);s.sixOdds=odds;
}
function sixDropReachCometMarkup(tier){return reachCometMarkup(tier).replaceAll('<rect','<circle').replaceAll('x="4" y="4" width="92" height="92" rx="11"','cx="50" cy="50" r="46"');}
function sixReachPresentation(s,results,grid,ready){
 const layer=s.sixReachLayer,w=layer.parentElement.clientWidth,h=layer.parentElement.clientHeight,k=Math.min(w,h)/320,layout=sixLayout(s.engine.rows),list=ready?[]:results;
 const key=[w,h,s.engine.version,s.engine.boardGeneration,s.engine.fx?.phase,list.map(p=>p.number+'/'+p.tier+'/'+p.total).join(',')].join('|');
 layer.classList.toggle('is-paused',!!app?.paused);if(key===s.sixReachKey)return;s.sixReachKey=key;layer.replaceChildren();
 const lookup=new Map(grid.flatMap((row,r)=>row.map((t,c)=>t?[t.number,[r,c]]:null)).filter(Boolean));
 for(const result of list){const pos=lookup.get(result.number);if(!pos)continue;const p=sixXY(...pos,s.engine.rows),el=document.createElement('div');el.className='six-reach-cell';el.style.cssText='left:'+((w-320*k)/2+(p.x-layout.radius)*k)+'px;top:'+((h-320*k)/2+(p.y-layout.radius)*k)+'px;width:'+layout.step*k+'px;height:'+layout.step*k+'px';
  const tier=result.tier;el.innerHTML='<span class="reach-glints" data-tier="'+tier+'"><i></i><i></i><i></i></span>'+(tier===1||tier===2?'<span class="reach-orbit" data-tier="'+tier+'">'+sixDropReachCometMarkup(tier)+'</span>':'')+(tier===3?'<span class="allclear-reach-aura"><svg class="allclear-reach-perimeter" viewBox="0 0 100 100"><circle class="perimeter-rail" cx="50" cy="50" r="44" pathLength="100"/><circle class="perimeter-trail" cx="50" cy="50" r="44" pathLength="100"/><circle class="perimeter-core" cx="50" cy="50" r="44" pathLength="100"/></svg></span>':'')+'<span class="tile-reach '+(tier?'alternating':'')+'" data-tier="'+tier+'"><span class="reach-first">リーチ</span>'+(tier?'<span class="reach-second">'+REACH_WORDS[tier]+'</span>':'')+'</span>';layer.append(el);
 }
}
// Deterministic PCM effects share the existing unlocked context, mute and reset bus.
let sixCandyAudioLast={break:-100,fall:-100,role:-100,pop:-100};
function sixCandyAudio(kind,amount=1){
 if(!audio||audio.state!=='running'||!$('sound').checked||app?.paused||document.hidden||!inView)return;
 const at=audio.currentTime;if(at-sixCandyAudioLast[kind]<(kind==='fall'?.055:.035))return;sixCandyAudioLast[kind]=at;
 const names=kind==='glass'?['six-glass-contact']:kind==='fall'?['six-marble-0','six-marble-1','six-marble-2']:kind==='triangle'?['six-triangle-chime']:kind==='hexagon'?['six-hexagon-fanfare']:kind==='role'?['six-role-rush']:kind==='clear'?['six-round-fanfare']:kind==='refill'?['six-refill-shower']:kind==='pop'?['six-cluster-pop']:['six-hard-candy'];
 names.forEach((name,j)=>{
  if(sfxBuffers.has(name))return;const duration=kind==='glass'?.24:kind==='triangle'?.85:kind==='hexagon'?1.15:kind==='fall'?.09:kind==='role'?.32:kind==='refill'?.72:kind==='clear'?.55:.19,buffer=audio.createBuffer(1,Math.ceil(audio.sampleRate*duration),audio.sampleRate),d=buffer.getChannelData(0);
  let seed=71527+j*977,prev=0;for(let i=0;i<d.length;i++){
   const t=i/audio.sampleRate;seed=(Math.imul(seed,1664525)+1013904223)>>>0;const n=seed/2147483648-1,high=n-prev;prev=n;
   if(kind==='fall'){const f=[1250,940,1510][j];d[i]=Math.min(1,t/.0015)*(Math.exp(-t*110)*high*.21+Math.sin(2*Math.PI*f*t)*Math.exp(-t*75)*.35+Math.sin(2*Math.PI*f*2.73*t)*Math.exp(-t*120)*.13);}
   else if(kind==='glass'){const env=Math.min(1,t/.0015)*Math.exp(-t*29);d[i]=(Math.sin(2*Math.PI*1760*t)*.28+Math.sin(2*Math.PI*2873*t)*.15+Math.sin(2*Math.PI*4211*t)*.08+high*Math.exp(-t*90)*.12)*env;}
   else if(kind==='role'){const envelope=Math.sin(Math.PI*Math.min(1,t/.32))*Math.exp(-t*3);d[i]=(high*.16+Math.sin(2*Math.PI*(440*t+2400*t*t))*.30+Math.sin(2*Math.PI*(660*t+3200*t*t))*.12)*envelope;}
   else if(kind==='triangle'||kind==='hexagon'){const hex=kind==='hexagon',notes=hex?[523,659,784,1047,1319,1568]:[659,831,988,1319],step=hex?.12:.13,note=Math.min(notes.length-1,Math.floor(t/step)),f=notes[note],u=t-note*step,env=Math.min(1,u/.008)*Math.exp(-u*8)*Math.min(1,(duration-t)/.12);d[i]=(Math.sin(2*Math.PI*f*u)*.23+Math.sin(2*Math.PI*f*2*u)*.07+Math.sin(2*Math.PI*f*1.5*u)*.06)*env;}
   else if(kind==='clear'){const note=Math.min(3,Math.floor(t/.12)),f=[784,988,1175,1568][note],u=t-note*.12;d[i]=(Math.sin(2*Math.PI*f*u)*.25+Math.sin(2*Math.PI*f*2*u)*.08)*Math.exp(-u*15)*Math.min(1,u/.006);}
   else if(kind==='refill'){const env=Math.sin(Math.PI*t/.72);d[i]=(Math.sin(2*Math.PI*(1800*t-650*t*t))*.23+Math.sin(2*Math.PI*2700*t)*.12+high*.07)*env;}
   else if(kind==='pop'){d[i]=(Math.sin(2*Math.PI*(900*t-1500*t*t))*.55+high*.08)*Math.exp(-t*32)*Math.min(1,t/.002);}
   else{const burst=[0,.014,.033].reduce((v,b)=>v+(t>=b?Math.exp(-(t-b)*110):0),0);d[i]=Math.min(1,t/.001)*(high*burst*.19+(Math.sin(2*Math.PI*2340*t)+Math.sin(2*Math.PI*3710*t))*.10*Math.exp(-t*24));}
  }sfxBuffers.set(name,buffer);
 });
 const count=kind==='fall'?Math.min(3,Math.max(1,amount)):1;
 for(let i=0;i<count;i++)sound(names[i%names.length],{delay:i*18,volume:kind==='glass'?.68*amount:kind==='fall'?.55/(1+i*.4):.72});
}

function carnivalEvent(s,ev,e,a){
 setupCarnivalSlot(s);s.event=ev;s.dirtyMain=true;s.dirtyMini=true;
  if(['ready','error'].includes(ev.phase)){s.sixSparkleIds=new Set();s.sixSparkleVersion=null;s.sixSparkleKey=null;stopSugarAward(s);clearMiniResult(s);s.candyReward.hidden=true;if(s.candyFrame)cancelAnimationFrame(s.candyFrame);s.candyFrame=0;s.candyLastDraw=0;s.candyClockStamp=null;s.sixFallSoundFx=null;s.sixRefillFx=null;s.candyTime=0;invalidateReach(s);}
 if(ev.phase==='drawpending'){requestSixSparkles(s,e,a);clearMiniResult(s);invalidateReach(s);requestReach(s,e,a);s.message=e.candyMessage;carnivalQueueFrame(s);scheduleUI(a);return;}
 if(ev.phase==='sugaraward')showSugarAward(s,ev.steps);
 if(ev.phase.startsWith('pyramid')){s.candyReward.hidden=true;s.candyReward.classList.remove('six-round-callout','six-special-award');invalidateReach(s);}
 if(['pyramidAward','pyramidAllClear','pyramidRoundBonus'].includes(ev.phase)&&ev.gain>0){
  const gain=ev.gain;s.candyReward.hidden=false;s.candyReward.classList.add('six-special-award');s.candyReward.dataset.tier=gain>=1000?'2':gain>=300?'1':'0';
  const title=ev.phase==='pyramidAllClear'?'ALL CLEAR BONUS':ev.phase==='pyramidRoundBonus'?'ROUND '+ev.roundIndex+' CLEAR BONUS':[ev.lines?'直線 ×'+ev.lines:'',ev.triangles?'トライアングル ×'+ev.triangles:'',ev.hexagons?'ヘキサゴン ×'+ev.hexagons:''].filter(Boolean).join(' / ');
  const remain=e.processed+(ev.numbers?.length||0)<8,advance=e.roundIndex<5&&remain;
  s.candyReward.innerHTML='<small>'+title+'</small><strong>＋'+num(medalWin(a.bet(s.i),gain))+' <em>WIN</em></strong><span>'+ (ev.chain?ev.chain+' CHAIN':'') +'</span><b class="six-next">'+(advance?'NEXT ROUND '+(e.roundIndex+1)+' 進出':e.roundIndex===5?'ALL ROUNDS CLEAR':'ROUND CLEAR')+'</b>';if(s.i===active)sound('confirm',{volume:1});
 }
 if(ev.phase==='pyramidRound'){clearMiniResult(s);s.candyReward.hidden=false;s.candyReward.classList.add('six-round-callout');s.candyReward.dataset.tier='1';s.candyReward.innerHTML='<small>NEXT ROUND</small><strong>Round '+ev.nextRound+'</strong>';}
 if(ev.phase==='pyramidBreak'&&ev.removed?.length&&s.i===active)sixCandyAudio('break');
 if(ev.phase==='pyramidAward'&&ev.removed?.length&&s.i===active&&!ev.forms?.length)sixCandyAudio('pop');
 if(ev.phase==='pyramidFall'&&motionReduced&&s.i===active)sixCandyAudio('fall',ev.moves?.length||1);
 if(ev.phase==='pyramidTopUp'&&s.i===active)sixCandyAudio('refill');
 if(ev.phase==='pyramidSweep'&&s.i===active)sound('magic',{volume:.35});
 if(ev.phase==='pyramidShape'&&ev.forms?.length&&s.i===active)sixCandyAudio(ev.forms.some(f=>f.type==='hexagon')?'hexagon':ev.forms.some(f=>f.type==='triangle')?'triangle':'role');
 if(ev.phase==='settled'){if(!ev.advance)s.candyReward.hidden=true;clearMiniResult(s);if(ev.batchChain>0||ev.batchShapes>0){s.miniLastResult=(ev.batchShapes||0)+'役 · '+(ev.batchChain||0)+'連鎖';s.miniResult.innerHTML='<strong>'+(ev.batchShapes||0)+' SHAPES</strong><small>'+(ev.batchChain||0)+'連鎖</small>';s.miniResultState={remaining:MINI_RESULT_MS,stamp:null,version:e.version};}}
 if(['waiting','settled'].includes(ev.phase))requestSixSparkles(s,e,a);
 if(['waiting','settled','complete'].includes(ev.phase))requestReach(s,e,a);s.message=e.candyMessage;carnivalQueueFrame(s);scheduleUI(a);
}
function carnivalQueueFrame(s){if(s.candyFrame||document.hidden||!inView)return;const version=s.engine.version;s.candyFrame=requestAnimationFrame(now=>{s.candyFrame=0;if(s.engine.version!==version)return;if(s.candyLastDraw&&now-s.candyLastDraw<32){carnivalQueueFrame(s);return;}s.candyLastDraw=now;drawCarnival(s,now);});}
const sixDemoCache=new Map();
function sixDemo(rows,round=1){const key=rows+'/'+round;if(!sixDemoCache.has(key)){const holes=new Set(SIX_START_GAP_TEMPLATES[0].map(p=>sixKey(...p))),colors=sixRoundColorCount(round);sixDemoCache.set(key,sixEmpty(rows).map((row,r)=>row.map((_,c)=>holes.has(sixKey(r,c))?null:{id:sixKey(r,c),number:null,color:(r+c+Math.floor((r+rows%2)/2))%colors})));}return sixDemoCache.get(key);}
function sixFallFrame(fx,progress){
 const steps=fx.steps||[];if(!steps.length)return {grid:fx.grid,moves:[],progress:1};const total=steps.reduce((n,f)=>n+f.ms,0),motionMs=fx.motionMs||total,visualProgress=fx.motionMs?Math.min(1,(fx.elapsed||0)/Math.max(1,motionMs)):progress;let t=Math.min(total,visualProgress*total);
 for(let i=0;i<steps.length;i++){const f=steps[i];if(t<=f.ms||i===steps.length-1)return {grid:f.grid,moves:f.moves,progress:Math.min(1,t/f.ms),index:i};t-=f.ms;}
 return {grid:fx.grid,moves:[],progress:1};
}
function drawCarnival(s,now=performance.now()){
 if(s.engine?.kind!=='candy')return;setupCarnivalSlot(s);const e=s.engine,x=s.candyCtx,paused=!app||app.paused||document.hidden||!inView,bet=app?.bet(s.i)||0,ready=app?.phase==='ready',rows=e.rows,layout=sixLayout(rows),fx=e.fx;
 if(s.candyClockStamp==null)s.candyClockStamp=now;if(!paused)s.candyTime=(s.candyTime||0)+Math.min(100,Math.max(0,now-s.candyClockStamp));s.candyClockStamp=now;const time=s.candyTime||0;x.setTransform(2,0,0,2,0,0);x.clearRect(0,0,320,320);
 if(ready){const guideTime=Math.min(SIX_TUTORIAL_DURATION-1,autoRoundRemaining>=0&&autoRoundRemaining<=BET_DURATION_MS?BET_DURATION_MS-autoRoundRemaining:time);sixDrawTutorial(s,guideTime,bet);if(!paused&&!jpcSession.active)carnivalQueueFrame(s);return;}s.candyCanvas.dataset.mode='playing';
 const progress=fx?(()=>{const critical=['pyramidFall','pyramidShape','pyramidBreak','pyramidTopUp','pyramidRefill'].includes(fx.phase),rate=critical?1:(e.presentationRate||1);if(!paused){if(fx.stamp!==null)fx.elapsed+=Math.max(0,now-fx.stamp)*rate;fx.stamp=now;}else fx.stamp=null;return Math.min(1,fx.elapsed/Math.max(1,fx.ms));})():0;
 const sweep=fx?.phase==='pyramidSweep',refill=fx?.phase==='pyramidRefill',transition=sweep||refill;
 const fall=fx?.phase==='pyramidFall'?sixFallFrame(fx,motionReduced?1:progress):null,grid=transition?fx.grid:fall?.grid||e.pyramid,moving=new Map((fall?.moves||[]).map(m=>[m.id,m]));
 if(fall&&!paused&&!motionReduced&&s.i===active){
  if(s.sixFallSoundFx!==fx){s.sixFallSoundFx=fx;s.sixFallSoundIndex=-1;}
  const landed=fall.progress>=.82?fall.index:fall.index-1;
  if(landed>s.sixFallSoundIndex){s.sixFallSoundIndex=landed;sixCandyAudio('fall',fall.moves.length);}
 }
 if((refill||fx?.phase==='pyramidTopUp')&&!paused&&s.i===active){const order=fx.rowOrder||sixGlassRows(fx.added,rows),elapsed=progress*fx.ms;if(s.sixRefillFx!==fx){s.sixRefillFx=fx;s.sixGlassSounds=new Set();}for(let i=0;i<order.length;i++)for(const [tap,delay] of [[0,0],[1,110]]){const key=i+'/'+tap;if(elapsed>=i*SIX_REFILL_ROW_MS+SIX_REFILL_FALL_MS+delay&&!s.sixGlassSounds.has(key)){s.sixGlassSounds.add(key);sixCandyAudio('glass',tap?0.35:1);}}}
 x.drawImage(sixArtBackdrop(rows),0,0,320,320);
 const lit=new Set((fx?.phase==='pyramidHit'?fx.cells:[]).map(p=>sixKey(...p))),shaped=new Set((fx?.forms||[]).flatMap(f=>f.cells).map(p=>sixKey(...p))),byNumber=new Map((ready?[]:visibleReachResults(s,app)).map(p=>[p.number,p]));
 for(let r=0;r<grid.length;r++)for(let c=0;c<grid[r].length;c++){
  const t=grid[r][c];if(!t)continue;let pos=sixXY(r,c,rows);const m=moving.get(t.id);
  if(m&&!motionReduced){const p=sixMotionPoint(m,fall.progress);pos={x:160+p.x*layout.step,y:layout.top+p.y*layout.step};}
  const topping=fx?.phase==='pyramidTopUp',added=topping&&fx.added.some(a=>a.tile.id===t.id),glass=added?sixGlassPose(fx.rowOrder||sixGlassRows(fx.added,rows),r,progress*fx.ms,motionReduced):null;if(glass&&!glass.visible)continue;if(glass)pos.y+=glass.offset;
  const pose=sixTransitionPose(fx,r,c,t,rows,progress,motionReduced);if(!pose.visible)continue;if(transition)pos={x:pose.x,y:pose.y};
  const pending=!transition&&t.number!=null&&(e.pendingDraws.has(t.number)||lit.has(sixKey(r,c))),reach=t.number!=null?byNumber.get(t.number):null,shape=shaped.has(sixKey(r,c)),radius=layout.radius;
  x.save();if(fx?.phase==='pyramidHit'&&lit.has(sixKey(r,c))&&!motionReduced){const bounce=Math.sin(Math.PI*progress);x.translate(pos.x,pos.y);x.scale(1+.09*bounce,1-.10*bounce);x.translate(-pos.x,-pos.y);}x.globalAlpha=pose.alpha;if(!ready&&pending)x.globalAlpha=motionReduced?1:.55+.45*(.5+.5*Math.sin(time/115));if(shape||reach){x.shadowBlur=shape?12:6;x.shadowColor=shape?'#ffe39a':reach.tier>=2?'#eb93ff':'#fff3b6';}
  const ordinarySparkle=s.sixSparkleVersion===e.version&&s.sixSparkleIds?.has(t.id);
  const candyR=radius,idleLift=!m&&!transition&&!topping&&!motionReduced?Math.sin(time/780+t.id*.67)*.85:0,idleBreath=!m&&!transition&&!topping&&!motionReduced?1+.017*Math.sin(time/930+t.id*.41):1,idleSway=!m&&!transition&&!topping&&!motionReduced?1+.012*Math.sin(time/1110+t.id*.59):1;
  // Keep centres and outer radii fixed so resting candies stay in contact.
  // Resting candy artwork breathes slightly; the number remains upright.
  x.save();x.translate(pos.x,pos.y+idleLift);
  if(transition){x.rotate(pose.rotation);x.scale(pose.scale,pose.scale);}else if(glass){x.rotate(glass.rotation);}else if(!m&&!topping&&!motionReduced){x.rotate(Math.sin(time/1400+t.id*.53)*.016);x.scale(idleBreath,idleSway);}
  if(m&&!motionReduced){const a=sixPoint(...m.from,rows),b=sixPoint(...m.to,rows);x.rotate(Math.sign(b.x-a.x||((t.id&1)?1:-1))*.22*Math.sin(Math.PI*fall.progress));}
  x.drawImage(sixArtCandySprite(t.color,ready?1:e.roundIndex,!!t.sugar,e.chanceRound===e.roundIndex),-candyR,-candyR,candyR*2,candyR*2);x.restore();
  if(!motionReduced&&!m&&!paused&&!transition){x.fillStyle='rgba(255,255,245,'+(.12+.11*(.5+.5*Math.sin(time/1050+t.id*2.1)))+')';x.beginPath();x.ellipse(pos.x-radius*.32,pos.y-radius*.42+idleLift*.28,radius*.16,radius*.07,-.55,0,Math.PI*2);x.fill();}
  x.shadowBlur=0;
  if(t.sugar){const img=getSugarSprite(wonderTier(bet));if(img)x.drawImage(img,pos.x-radius*.75,pos.y-radius*.75,radius*1.5,radius*1.5);}
  if(e.chanceRound===e.roundIndex&&!motionReduced&&!transition){const spark=.5+.5*Math.sin(time/350+t.id*2.4);x.globalAlpha*=spark;sixArtStar(x,pos.x+radius*.55,pos.y-radius*.55,1.4+spark*2,'#fff','#fff');x.globalAlpha=1;}
  if(ordinarySparkle&&!m&&!transition){for(let k=0;k<3;k++){const a=k*2.094+t.id*.37,twinkle=motionReduced?.7:.3+.7*(.5+.5*Math.sin(time/240+k*2.1));sixArtStar(x,pos.x+Math.cos(a)*radius*.78,pos.y+Math.sin(a)*radius*.78,1.5+twinkle*2.3,'#fffce1','#e6f9ff');}}
  if(!ready&&t.number!=null)sixPaintCandyNumber(x,t.number,pos.x,pos.y+1,radius,t.color,e.roundIndex,e.chanceRound===e.roundIndex);
  if(shape||pending||reach){x.strokeStyle=shape?'#fff6b3':pending?'#fff9e7':reach.tier>=2?'#f0a2ff':'#fff3b6';x.lineWidth=shape?2.3:1.5;x.beginPath();x.arc(pos.x,pos.y,radius,0,Math.PI*2);x.stroke();}x.restore();
 }
 sixStageEffects(x,fx,progress,e.roundIndex,rows,motionReduced);
 sixArcadeAccents(s,x,time);
 if(!bet){x.fillStyle='#231b3ba8';x.fillRect(0,0,320,320);sixText(x,'0 BET',160,140,29);sixText(x,'BETして キャンディを落とそう',160,172,11);}
 s.miniCanvas.hidden=false;s.miniLogo.hidden=true;s.mini.setTransform(1,0,0,1,0,0);s.mini.clearRect(0,0,160,160);s.mini.drawImage(s.candyCanvas,0,0,160,160);
 s.candyCanvas.setAttribute('aria-label','シックスドロップ・Round '+e.roundIndex+'、'+rows+'段、'+e.remainingCandies+'個、ヘキサゴン'+e.hexagons+'、トライアングル'+e.triangles+'、直線'+e.lines);
 sixReachPresentation(s,transition?[]:visibleReachResults(s,app),grid,transition);
 s.candyStatus.textContent=!bet?'0 BET・このゲームは参加しません':ready?'1〜25は各1個・空白も使って役を作ろう！':e.candyMessage;
 if((fx||e.pendingDraws.size||(!motionReduced&&bet))&&!paused&&!jpcSession.active)carnivalQueueFrame(s);
}
function carnivalHud(a){
 const s=slots[2],e=s.engine;if(e?.kind!=='candy')return;setupCarnivalSlot(s);document.body.classList.toggle('carnival-active',active===2);s.tab.setAttribute('aria-label','シックスドロップ・Round '+e.roundIndex+'・'+a.bet(2)+' BET');s.miniCanvas.hidden=false;s.miniLogo.hidden=true;
 put('carnival-complete',e.roundIndex);fitGoldenNumber($('carnival-win'),num(medalWin(a.bet(2),e.totalHundredths)),23,100);
 for(const [role,count] of [['line',e.lines],['triangle',e.triangles],['hexagon',e.hexagons]]){const col=s.sixOdds.querySelector('[data-role="'+role+'"]');if(col.dataset.count===String(count))continue;col.dataset.count=String(count);col.querySelector('.six-role-reel').style.transform='translateX('+(-Math.max(0,count-1)*62)+'px)';col.querySelectorAll('.six-role-row').forEach(row=>row.classList.toggle('chosen',Number(row.dataset.count)===count));}
 for(const el of s.sixOdds.querySelectorAll('.six-round-card')){const offset=Number(el.dataset.offset),r=e.roundIndex+offset,valid=r>=1&&r<=5;el.classList.toggle('current',offset===0);el.classList.toggle('disabled',!valid);el.querySelector('b').textContent=valid?r:'—';el.querySelector('em').textContent=valid?'+'+(sixRoundClearBonus(r)/100).toFixed(1)+'×':'';const sugar=el.querySelector('.six-round-sugar');sugar.hidden=!valid||e.sugarRound!==r||e.wonderCollected;if(!sugar.hidden)applySugarTier(sugar,wonderTier(a.bet(2)));}
 s.sixOdds.querySelector('.six-bonus-total b').textContent=(e.clearBonusHundredths/100).toFixed(1)+'×';s.sixOdds.querySelectorAll('.six-bonus-list span').forEach(el=>{el.classList.toggle('current',Number(el.dataset.round)===e.roundIndex);el.classList.toggle('cleared',e.clearedRounds.has(Number(el.dataset.round)));});
 const key=[e.version,e.phase,e.processed,e.roundIndex,e.boardGeneration,e.totalHundredths,e.clearBonusHundredths,a.bet(2),s.reachEpoch,s.reachStatus,a.paused,e.pendingDraws.size].join('/');if(s.candyKey!==key){s.candyKey=key;carnivalQueueFrame(s);}
}

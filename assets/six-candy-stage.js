/* Six Candy presentation v5: no gameplay RNG, no scoring, no board mutation. */
const SIX_STAGE_VERSION='bet-guide-stage-v5',SIX_TUTORIAL_DURATION=18000;
const sixV4Setup=setupCarnivalSlot,sixV4Backdrop=sixArtBackdrop;
const sixStageTone=round=>round>=5?'hot':round>=3?'citrus':round>=2?'fresh':'cool';
const sixCandyBackdropCache=new Map(),sixFrameImage=new Image(),sixFrameState={loaded:false,error:false};
sixFrameImage.onload=()=>{sixFrameState.loaded=true;sixCandyBackdropCache.clear();try{slots[2].candyKey='';carnivalQueueFrame(slots[2]);}catch{}};
sixFrameImage.onerror=()=>{sixFrameState.error=true;};
sixFrameImage.src='assets/six-candy-png/frame.webp?v=stage-v5';
function sixBackdropCandyMotifs(x){
 const wrapped=(cx,cy,scale,rot,color)=>{x.save();x.translate(cx,cy);x.rotate(rot);x.scale(scale,scale);x.fillStyle=color;x.strokeStyle='rgba(255,255,255,.55)';x.lineWidth=1.2;x.beginPath();x.roundRect(-9,-6,18,12,6);x.fill();x.stroke();x.beginPath();x.moveTo(-9,-4);x.lineTo(-18,-10);x.lineTo(-17,8);x.closePath();x.fill();x.beginPath();x.moveTo(9,-4);x.lineTo(18,-10);x.lineTo(17,8);x.closePath();x.fill();x.restore();};
 const pop=(cx,cy,r,color)=>{x.save();x.strokeStyle=color;x.lineWidth=2;x.beginPath();x.arc(cx,cy,r,0,Math.PI*2);x.stroke();for(let a=0;a<Math.PI*4;a+=Math.PI/4){const rr=r*(.18+.68*a/(Math.PI*4));x.beginPath();x.arc(cx,cy,rr,a,a+Math.PI/2);x.stroke();}x.beginPath();x.moveTo(cx-r*.2,cy+r);x.lineTo(cx-r*.75,cy+r*2.15);x.stroke();x.restore();};
 x.save();x.globalAlpha=.10;
 wrapped(32,72,.75,-.28,'#ffd2e7');wrapped(288,86,.68,.32,'#fff0ad');wrapped(39,224,.62,.18,'#cceeff');wrapped(278,242,.72,-.22,'#e0ccff');
 pop(286,150,12,'#ffd0e6');pop(34,154,10,'#d4eef7');
 x.fillStyle='#fff0c9';for(const [cx,cy,r] of [[74,42,3],[246,42,2],[66,276,2.5],[252,286,3],[20,118,2],[300,196,2]]){x.beginPath();x.arc(cx,cy,r,0,Math.PI*2);x.fill();}
 x.restore();
}
sixArtBackdrop=function(rows){
 const key=rows+'/'+sixFrameState.loaded;if(sixCandyBackdropCache.has(key))return sixCandyBackdropCache.get(key);
 const cv=document.createElement('canvas');cv.width=cv.height=320;const x=cv.getContext('2d'),base=sixFrameState.loaded?sixFrameImage:sixV4Backdrop(rows);x.drawImage(base,0,0,320,320);sixBackdropCandyMotifs(x);sixCandyBackdropCache.set(key,cv);return cv;
};
setupCarnivalSlot=function(s){
 sixV4Setup(s);if(s.sixStageSetup)return;s.sixStageSetup=true;
 const heading=$('carnival-heading'),cards=s.sixOdds.querySelector('.six-round-cards'),banner=document.createElement('div');
 banner.className='six-allclear-banner';banner.innerHTML='<strong>ALL CLEAR BONUS</strong><b></b><em>WIN</em>';
 heading.replaceChildren(cards,banner);s.sixHeading=heading;
 cards.querySelectorAll('.six-round-card').forEach(el=>{const n=Number(el.dataset.offset);el.querySelector('small').textContent=n<0?'PREV':n===0?'NOW':'NEXT';});
 s.sixOdds.querySelectorAll('.six-clear-bonus,.six-round-rail,.six-bonus-total,.six-bonus-list').forEach(el=>el.remove());
 const wrap=s.sixOdds.querySelector('.six-role-tables');wrap.className='six-role-summary';
 wrap.innerHTML=[['line','直線'],['triangle','△'],['hexagon','ヘキサゴン']].map(([role,label])=>'<div class="six-role-summary-row" data-role="'+role+'" aria-label="'+label+'"><div class="six-role-summary-icon"><canvas width="120" height="80" aria-hidden="true"></canvas><strong>'+label+'</strong></div><div class="six-role-summary-formula"><span class="unit">0 WIN</span><span class="times">×</span><span class="count">0個</span></div><b class="subtotal">0 WIN</b></div>').join('')+'<div class="six-role-summary-total"><span>TOTAL</span><b>0 WIN</b></div>';
 s.sixRoleSummary=wrap;s.candyCanvas.dataset.version=SIX_STAGE_VERSION;
};
carnivalHud=function(a){
 const s=slots[2],e=s.engine;if(e?.kind!=='candy')return;setupCarnivalSlot(s);document.body.classList.toggle('carnival-active',active===2);s.tab.setAttribute('aria-label','シックスドロップ・Round '+e.roundIndex+'・'+a.bet(2)+' BET');s.miniCanvas.hidden=false;s.miniLogo.hidden=true;
 const bet=a.bet(2);fitGoldenNumber($('carnival-win'),num(medalWin(bet,e.totalHundredths)),23,100);
 const artKey=e.roundIndex+'/'+sixCandyPngState.loaded+'/'+(e.chanceRound===e.roundIndex);let roleTotal=0;
 for(const [role,count] of [['line',e.lines],['triangle',e.triangles],['hexagon',e.hexagons]]){
  const row=s.sixOdds.querySelector('.six-role-summary-row[data-role="'+role+'"]');if(!row)continue;
  if(row.dataset.art!==artKey){row.dataset.art=artKey;sixDrawRoleIcon(row.querySelector('canvas'),role,e.roundIndex);}
  const unit=medalWin(bet,SIX_PAY[role]),subtotal=medalWin(bet,SIX_PAY[role]*count);roleTotal+=subtotal;
  row.querySelector('.unit').textContent=num(unit)+' WIN';row.querySelector('.count').textContent=count+'個';row.querySelector('.subtotal').textContent=num(subtotal)+' WIN';row.classList.toggle('hot',count>0);
 }
 const totalRow=s.sixOdds.querySelector('.six-role-summary-total b');if(totalRow)totalRow.textContent=num(roleTotal)+' WIN';
 for(const el of s.sixHeading.querySelectorAll('.six-round-card')){const offset=Number(el.dataset.offset),r=e.roundIndex+offset,valid=r>=1&&r<=5;el.classList.toggle('current',offset===0);el.classList.toggle('disabled',!valid);el.querySelector('b').textContent=valid?'R'+r:'—';el.querySelector('em').textContent=valid?(e.chanceRound===r&&r===e.roundIndex+1?'CHANCE! 3色':num(medalWin(bet,sixRoundClearBonus(r)))+' WIN'):'';el.dataset.level=valid?String(r):'0';el.dataset.tone=valid?sixStageTone(r):'';el.dataset.chance=valid&&e.chanceRound===r?'1':'0';const sugar=el.querySelector('.six-round-sugar');sugar.hidden=!valid||e.sugarRound!==r||e.wonderCollected;if(!sugar.hidden)applySugarTier(sugar,wonderTier(bet));}
 s.sixHeading.dataset.roundTone=sixStageTone(e.roundIndex);s.sixOdds.dataset.roundTone=sixStageTone(e.roundIndex);
 const banner=s.sixHeading.querySelector('.six-allclear-banner');banner.querySelector('b').textContent=num(medalWin(bet,SIX_PAY.allClear));banner.classList.toggle('celebrate',e.phase==='pyramidAllClear');banner.dataset.tone=sixStageTone(e.roundIndex);
 const key=[e.version,e.phase,e.processed,e.roundIndex,e.boardGeneration,e.totalHundredths,e.clearBonusHundredths,bet,s.reachEpoch,s.reachStatus,a.paused,e.pendingDraws.size].join('/');if(s.candyKey!==key){s.candyKey=key;carnivalQueueFrame(s);}
};
function sixTransitionPose(fx,r,c,t,rows,p,reduced=false){
 const pos=sixXY(r,c,rows),out={...pos,alpha:1,rotation:0,scale:1,visible:true};
 if(fx?.phase==='pyramidSweep'){
  if(reduced)return {...out,alpha:1-p,visible:p<1};
  const dx=pos.x-160,dy=pos.y-164,a=Math.atan2(dy||-1,dx||.1),d=520*p*p;
  return {x:pos.x+Math.cos(a)*d,y:pos.y+Math.sin(a)*d-55*p,alpha:Math.max(0,1-Math.max(0,p-.65)/.35),rotation:(t.id%2?1:-1)*(3+t.id%4)*p,scale:1-.12*p,visible:p<1};
 }
 if(fx?.phase==='pyramidRefill'){
  if(reduced)return {...out,alpha:p,visible:p>0};
  const age=p*(480+(rows-1)*96)-(rows-1-r)*96;
  if(age<0)return {...out,visible:false};
  const q=Math.min(1,age/400),bounce=age>400&&age<480?-Math.sin((age-400)/80*Math.PI)*2:0;
  return {...out,y:-40+(pos.y+40)*q*q+bounce,rotation:Math.sin(q*Math.PI)*.12*(c%2?1:-1)};
 }
 return out;
}
function sixDrawRoleIcon(canvas,type,round){
 const x=canvas.getContext('2d');x.clearRect(0,0,120,80);
 const ps=type==='line'?[[18,40],[46,40],[74,40],[102,40]]:type==='triangle'?[[60,13],[45,39],[75,39],[30,65],[60,65],[90,65]]:[[45,14],[75,14],[90,40],[75,66],[45,66],[30,40]];
 const color=type==='line'?2:type==='triangle'?0:Math.min(3,sixRoundColorCount(round)-1),sprite=sixArtCandySprite(color,round);
 for(const [cx,cy] of ps)x.drawImage(sprite,cx-15,cy-15,30,30);
}
function sixStageEffects(x,fx,p,round,rows,reduced){
 if(!fx)return;
 const crack=(pos,r,seed,alpha=1)=>{x.save();x.translate(pos.x,pos.y);x.rotate((seed%7-.3)*.09);x.globalAlpha=alpha;x.strokeStyle='rgba(255,248,218,.95)';x.lineWidth=1.5;x.shadowColor='#fff3ad';x.shadowBlur=7;x.beginPath();for(let k=0;k<4;k++){const a=(seed*.71+k*1.57)%6.28,inner=r*.16,outer=r*(.48+(k%2)*.16);x.moveTo(Math.cos(a)*inner,Math.sin(a)*inner);x.lineTo(Math.cos(a+.10)*r*.32,Math.sin(a+.10)*r*.32);x.lineTo(Math.cos(a-.05)*outer,Math.sin(a-.05)*outer);}x.stroke();x.restore();};
 if(fx.phase==='pyramidShape'){
  const warn=.42+.58*(.5+.5*Math.sin(p*Math.PI*10));
  for(const cell of fx.cells||[]){const pos=sixXY(...cell,rows),r=sixLayout(rows).radius;x.save();x.globalAlpha=.28+.48*warn;x.strokeStyle='#fff6ad';x.lineWidth=2+warn*1.3;x.shadowColor='#fff0a2';x.shadowBlur=10+warn*8;x.beginPath();x.arc(pos.x,pos.y,r*(1.01+.045*warn),0,Math.PI*2);x.stroke();x.restore();crack(pos,r,cell[0]*17+cell[1]*31,.65+.3*warn);}
  for(const form of fx.forms||[]){
   const ps=form.cells.map(cell=>sixXY(...cell,rows)),hull=form.type==='line'?ps:sixHull(ps),color=form.type==='line'?'#99f7ff':form.type==='triangle'?'#ffec94':'#f2b5ff';
   x.save();x.strokeStyle=color;x.fillStyle=color+'24';x.shadowColor=color;x.shadowBlur=reduced?0:18;x.lineWidth=4;x.beginPath();hull.forEach((v,i)=>i?x.lineTo(v.x,v.y):x.moveTo(v.x,v.y));if(form.type!=='line'){x.closePath();x.fill();}x.stroke();const cx=ps.reduce((n,v)=>n+v.x,0)/ps.length,cy=ps.reduce((n,v)=>n+v.y,0)/ps.length;if(!reduced){if(form.type==='hexagon'){x.lineWidth=2;x.beginPath();x.arc(cx,cy,35+16*Math.sin(p*Math.PI),0,Math.PI*2);x.stroke();}for(let k=0;k<ps.length;k++){const a=p*Math.PI*2+k*Math.PI*2/ps.length,v=ps[k];sixArtStar(x,v.x+Math.cos(a)*6,v.y+Math.sin(a)*6,3.5,'#fffbe4',color);}}x.restore();
  }
 }
 if(fx.phase==='pyramidBreak'&&fx.removed&&p<.38){
  const pulse=.45+.55*(.5+.5*Math.sin(p*Math.PI*18));for(const v of fx.removed){const pos=sixXY(v.r,v.c,rows),r=sixLayout(rows).radius,sprite=sixArtCandySprite(v.tile.color,round);x.save();x.globalAlpha=.7+.3*pulse;x.shadowColor='#fff2a5';x.shadowBlur=12+8*pulse;x.drawImage(sprite,pos.x-r,pos.y-r,r*2,r*2);x.strokeStyle='#fff7b6';x.lineWidth=2.5;x.beginPath();x.arc(pos.x,pos.y,r*(1.02+.04*pulse),0,Math.PI*2);x.stroke();x.restore();crack(pos,r,v.tile.id,.65+.3*pulse);}
 }
 if(fx.removed&&p<.92){
  const delay=fx.phase==='pyramidBreak'?.30:0,q=Math.max(0,Math.min(1,(p-delay)/Math.max(.01,.90-delay))),tiles=fx.removed;if(q<=0)return;x.save();x.globalAlpha=1-q;
  for(const v of tiles){const pos=sixXY(v.r,v.c,rows),r=sixLayout(rows).radius;if(reduced){x.fillStyle='#fff7c9';x.beginPath();x.arc(pos.x,pos.y,r,0,7);x.fill();continue;}const sprite=sixArtCandySprite(v.tile.color,round),pieces=tiles.length>28?4:7;x.strokeStyle='#fff6ce';x.lineWidth=1.3;x.beginPath();x.arc(pos.x,pos.y,r*(.45+q),0,7);x.stroke();for(let k=0;k<pieces;k++){const a=k*Math.PI*2/pieces+(v.tile.id%13)*.11,d=(18+k%3*9)*q;x.save();x.translate(pos.x+Math.cos(a)*d,pos.y+Math.sin(a)*d+q*q*16);x.rotate(a+q*(k%2?2.4:-2.4));x.beginPath();x.moveTo(-4,-5);x.lineTo(7,-2);x.lineTo(3,6);x.lineTo(-5,3);x.closePath();x.clip();x.drawImage(sprite,-r,-r,r*2,r*2);x.restore();}if(v.tile.id%3===0)sixArtStar(x,pos.x+Math.sin(v.tile.id)*q*30,pos.y-q*25,3*(1-q),'#fff','#ffdc89');}
  x.restore();
 }
}
function sixTutorialScene(time){const t=((time%SIX_TUTORIAL_DURATION)+SIX_TUTORIAL_DURATION)%SIX_TUTORIAL_DURATION;return {index:t<4500?0:t<9000?1:t<14000?2:3,t};}
const sixTutorialIconCache=new Map();
function sixTutorialIcon(role){const key=role+'/'+sixCandyPngState.loaded;if(!sixTutorialIconCache.has(key)){const cv=document.createElement('canvas');cv.width=120;cv.height=80;sixDrawRoleIcon(cv,role,1);sixTutorialIconCache.set(key,cv);}return sixTutorialIconCache.get(key);}
function sixDrawTutorial(s,time,bet){
 const x=s.candyCtx,{index,t}=sixTutorialScene(time),clamp=v=>Math.max(0,Math.min(1,v)),smooth=v=>{v=clamp(v);return v*v*(3-2*v)};x.drawImage(sixArtBackdrop(10),0,0,320,320);x.fillStyle='rgba(255,247,238,.80)';x.beginPath();x.roundRect(28,20,264,278,18);x.fill();sixText(x,'BET TIME',160,38,10,'#fff1ba');
 const candy=(c,px,py,r=22,alpha=1,n=null,scale=1)=>{x.save();x.globalAlpha=alpha;x.translate(px,py);x.scale(scale,scale);x.drawImage(sixArtCandySprite(c,1),-r,-r,r*2,r*2);x.restore();if(n!==null)sixText(x,String(n),px,py+1,20);};
 if(index===0){
  const p=t/4500,fall=smooth(p/.42),flash=p>.44&&p<.66?.45+.55*(.5+.5*Math.sin(p*45)):1,fade=p>.64?1-smooth((p-.64)/.25):1;
  candy(0,90,190,22,1,3);candy(3,230,190,22,1,11);candy(2,160,92+(190-92)*fall,22,fade,7,1+.04*(1-fall));if(p<.44){x.strokeStyle='#ffc15b';x.lineWidth=3;x.beginPath();x.moveTo(160,74);x.lineTo(160,116);x.stroke();}else if(p<.72){x.save();x.globalAlpha=flash;x.strokeStyle='#fff1a6';x.lineWidth=3;x.shadowBlur=14;x.shadowColor='#fff1a6';x.beginPath();x.arc(160,190,28,0,7);x.stroke();x.restore();}if(p>.72)for(let k=0;k<6;k++){const a=k*1.047,q=smooth((p-.72)/.25);sixArtStar(x,160+Math.cos(a)*q*42,190+Math.sin(a)*q*34,3.5*(1-q),'#fff','#f4bd68');}
 }else if(index===1){
  const p=(t-4500)/4500,drop=smooth(p/.34),warn=p>.36&&p<.68?.45+.55*(.5+.5*Math.sin(p*42)):1,fade=p>.66?1-smooth((p-.66)/.25):1,ys=[196,196,154,96+(154-96)*drop],xs=[92,140,116,164];
  for(let i=0;i<4;i++)candy(0,xs[i],ys[i],23,fade,null,1+.025*Math.sin(p*18+i));if(p>.36&&p<.72){for(let i=0;i<4;i++){x.save();x.globalAlpha=warn;x.strokeStyle='#f4ffab';x.lineWidth=3;x.shadowBlur=12;x.shadowColor='#f7ffb2';x.beginPath();x.arc(xs[i],ys[i],28,0,7);x.stroke();x.restore();}sixText(x,'4+',160,112,20,'#f2ffb7');}if(p>.72)for(let k=0;k<8;k++){const a=k*.785,q=smooth((p-.72)/.24);sixArtStar(x,128+Math.cos(a)*q*60,174+Math.sin(a)*q*40,3.2*(1-q),'#fff','#c9f6ff');}
 }else if(index===2){
  const p=(t-9000)/5000,join=smooth(p/.32),shine=.5+.5*Math.sin(p*30),spots=[[86,184],[134,184],[182,184],[230,184]];for(let i=0;i<4;i++){const fromY=92+i%2*18,y=fromY+(184-fromY)*join;candy(1,spots[i][0],y,22,1);}if(p>.34){x.save();x.globalAlpha=.55+.4*shine;x.strokeStyle='#adf6ff';x.lineWidth=4;x.shadowBlur=14;x.shadowColor='#9df6ff';x.beginPath();x.moveTo(65,184);x.lineTo(251,184);x.stroke();x.restore();}if(p>.55){sixText(x,'+'+num(medalWin(bet,SIX_PAY.line)),112,224,14,'#ffe89f');x.strokeStyle='#ffd58a';x.lineWidth=3;x.beginPath();x.moveTo(176,224);x.lineTo(238,224);x.lineTo(229,217);x.moveTo(238,224);x.lineTo(229,231);x.stroke();x.save();x.globalAlpha=.85;x.fillStyle='#ffe2f1';x.beginPath();x.roundRect(242,209,46,30,12);x.fill();x.restore();sixText(x,'R2',265,224,12,'#fff');}
 }else{
  const p=(t-14000)/4000,q=smooth(p/.55);for(let k=0;k<4;k++)candy(0,92+(k%2)*48,154+Math.floor(k/2)*42,22,1-Math.max(0,q-.72)*2);const sugar=getSugarSprite(wonderTier(bet));if(sugar)x.drawImage(sugar,72+q*70,124-q*10,34,34);if(p>.62){sixText(x,'ALL CLEAR',160,120,18,'#ffe786');for(let k=0;k<6;k++)sixArtStar(x,52+k*43,165+Math.sin(time/300+k)*7,4,'#fff7b9','#e9a25e');}
 }
 for(let k=0;k<4;k++){x.fillStyle=k===index?'#ed67a4':'#d7c1cf';x.beginPath();x.arc(139+k*14,286,k===index?4:3,0,7);x.fill();}
 s.candyCanvas.dataset.mode='tutorial';s.candyCanvas.dataset.scene=String(index);s.candyCanvas.setAttribute('aria-label','シックスドロップ・遊び方デモ');s.sixReachLayer.replaceChildren();s.sixReachKey='';s.candyReward.hidden=true;s.candyStatus.textContent='BET待機中・遊び方デモ';s.miniCanvas.hidden=false;s.miniLogo.hidden=true;s.mini.setTransform(1,0,0,1,0,0);s.mini.clearRect(0,0,160,160);s.mini.drawImage(s.candyCanvas,0,0,160,160);
}

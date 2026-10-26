/* Six Candy presentation v5: no gameplay RNG, no scoring, no board mutation. */
const SIX_STAGE_VERSION='bet-guide-stage-v5',SIX_TUTORIAL_DURATION=18000;
const sixV4Setup=setupCarnivalSlot,sixV4Backdrop=sixArtBackdrop;
const sixStageTone=round=>round>=5?'hot':round>=3?'citrus':round>=2?'fresh':'cool';
const sixFrameImage=new Image(),sixFrameState={loaded:false,error:false};
sixFrameImage.onload=()=>{sixFrameState.loaded=true;try{slots[2].candyKey='';carnivalQueueFrame(slots[2]);}catch{}};
sixFrameImage.onerror=()=>{sixFrameState.error=true;};
sixFrameImage.src='assets/six-candy-png/frame.webp?v=stage-v5';
sixArtBackdrop=function(rows){return sixFrameState.loaded?sixFrameImage:sixV4Backdrop(rows);};
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
 const s=slots[2],e=s.engine;if(e?.kind!=='candy')return;setupCarnivalSlot(s);document.body.classList.toggle('carnival-active',active===2);s.tab.setAttribute('aria-label','シックスキャンディ・Round '+e.roundIndex+'・'+a.bet(2)+' BET');s.miniCanvas.hidden=false;s.miniLogo.hidden=true;
 const bet=a.bet(2);fitGoldenNumber($('carnival-win'),num(medalWin(bet,e.totalHundredths)),23,100);
 const artKey=e.roundIndex+'/'+sixCandyPngState.loaded+'/'+(e.chanceRound===e.roundIndex);let roleTotal=0;
 for(const [role,count] of [['line',e.lines],['triangle',e.triangles],['hexagon',e.hexagons]]){
  const row=s.sixOdds.querySelector('.six-role-summary-row[data-role="'+role+'"]');if(!row)continue;
  if(row.dataset.art!==artKey){row.dataset.art=artKey;sixDrawRoleIcon(row.querySelector('canvas'),role,e.roundIndex);}
  const unit=medalWin(bet,SIX_PAY[role]),subtotal=medalWin(bet,SIX_PAY[role]*count);roleTotal+=subtotal;
  row.querySelector('.unit').textContent=num(unit)+' WIN';row.querySelector('.count').textContent=count+'個';row.querySelector('.subtotal').textContent=num(subtotal)+' WIN';row.classList.toggle('hot',count>0);
 }
 const totalRow=s.sixOdds.querySelector('.six-role-summary-total b');if(totalRow)totalRow.textContent=num(roleTotal)+' WIN';
 for(const el of s.sixHeading.querySelectorAll('.six-round-card')){const offset=Number(el.dataset.offset),r=e.roundIndex+offset,valid=r>=1&&r<=5;el.classList.toggle('current',offset===0);el.classList.toggle('disabled',!valid);el.querySelector('b').textContent=valid?'R'+r:'—';el.querySelector('em').textContent=valid?(e.chanceRound===r&&r===e.roundIndex+1?'CHANCE! 3色':num(medalWin(bet,sixRoundClearBonus(r)))+' WIN'):'';el.dataset.tone=valid?sixStageTone(r):'';el.dataset.chance=valid&&e.chanceRound===r?'1':'0';const sugar=el.querySelector('.six-round-sugar');sugar.hidden=!valid||e.sugarRound!==r||e.wonderCollected;if(!sugar.hidden)applySugarTier(sugar,wonderTier(bet));}
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
 if(fx.phase==='pyramidShape')for(const form of fx.forms||[]){
  const ps=form.cells.map(cell=>sixXY(...cell,rows)),hull=form.type==='line'?ps:sixHull(ps),color=form.type==='line'?'#99f7ff':form.type==='triangle'?'#ffec94':'#f2b5ff';
  x.save();x.strokeStyle=color;x.fillStyle=color+'33';x.shadowColor=color;x.shadowBlur=reduced?0:18;x.lineWidth=4;x.beginPath();hull.forEach((v,i)=>i?x.lineTo(v.x,v.y):x.moveTo(v.x,v.y));if(form.type!=='line'){x.closePath();x.fill();}x.stroke();
  const cx=ps.reduce((n,v)=>n+v.x,0)/ps.length,cy=ps.reduce((n,v)=>n+v.y,0)/ps.length;
  if(!reduced){if(form.type==='hexagon'){x.lineWidth=2;x.beginPath();x.arc(cx,cy,35+16*Math.sin(p*Math.PI),0,Math.PI*2);x.stroke();}for(let k=0;k<ps.length;k++){const a=p*Math.PI*2+k*Math.PI*2/ps.length,v=ps[k];sixArtStar(x,v.x+Math.cos(a)*6,v.y+Math.sin(a)*6,3.5,'#fffbe4',color);}}
  x.restore();
 }
 if(fx.removed&&p<.9){
  const q=Math.min(1,p/.9),tiles=fx.removed;x.save();x.globalAlpha=1-q;
  for(const v of tiles){const pos=sixXY(v.r,v.c,rows),r=sixLayout(rows).radius;
   if(reduced){x.fillStyle='#fff7c9';x.beginPath();x.arc(pos.x,pos.y,r,0,7);x.fill();continue;}
   const sprite=sixArtCandySprite(v.tile.color,round),pieces=tiles.length>28?4:7;x.strokeStyle='#fff6ce';x.lineWidth=1.3;x.beginPath();x.arc(pos.x,pos.y,r*(.4+q),0,7);x.stroke();
   for(let k=0;k<pieces;k++){const a=k*Math.PI*2/pieces+(v.tile.id%13)*.11,d=(16+k%3*8)*q;x.save();x.translate(pos.x+Math.cos(a)*d,pos.y+Math.sin(a)*d+q*q*14);x.rotate(a+q*(k%2?2:-2));x.beginPath();x.moveTo(-4,-5);x.lineTo(7,-2);x.lineTo(3,6);x.lineTo(-5,3);x.closePath();x.clip();x.drawImage(sprite,-r,-r,r*2,r*2);x.restore();}
   if(v.tile.id%3===0)sixArtStar(x,pos.x+Math.sin(v.tile.id)*q*28,pos.y-q*24,3*(1-q),'#fff','#ffdc89');
  }x.restore();
 }
}
function sixTutorialScene(time){const t=((time%SIX_TUTORIAL_DURATION)+SIX_TUTORIAL_DURATION)%SIX_TUTORIAL_DURATION;return {index:t<4500?0:t<9000?1:t<14000?2:3,t};}
const sixTutorialIconCache=new Map();
function sixTutorialIcon(role){const key=role+'/'+sixCandyPngState.loaded;if(!sixTutorialIconCache.has(key)){const cv=document.createElement('canvas');cv.width=120;cv.height=80;sixDrawRoleIcon(cv,role,1);sixTutorialIconCache.set(key,cv);}return sixTutorialIconCache.get(key);}
function sixDrawTutorial(s,time,bet){
 const x=s.candyCtx,{index,t}=sixTutorialScene(time),ease=v=>Math.max(0,Math.min(1,v));
 x.drawImage(sixArtBackdrop(10),0,0,320,320);x.fillStyle='#fff4e9ee';x.beginPath();x.roundRect(20,16,280,289,14);x.fill();
 const title=['同じ番号に HIT!','４個以上つながると消える','役成立で配当 + NEXT ROUND!','シュガーと全消しをねらおう'][index];
 sixText(x,'BET TIME · 遊び方の例',160,37,12,'#fff6ae');sixText(x,title,160,65,index===2?12:14,'#ffcfec');
 const candy=(c,px,py,r=23,alpha=1,n=null)=>{x.save();x.globalAlpha=alpha;x.drawImage(sixArtCandySprite(c,1),px-r,py-r,r*2,r*2);if(n!==null)sixText(x,String(n),px,py+1,24);x.restore();};
 const caption=(a,b)=>{sixText(x,a,160,247,12,'#fff8d5');if(b)sixText(x,b,160,269,10,'#fff5e8');};
 if(index===0){
  const p=t/4500,hit=p>.40,fade=hit?1-ease((p-.4)*6):1;candy(0,83,195,26,1,3);candy(2,160,195,26,fade,7);candy(3,237,195,26,1,11);sixText(x,'抽選番号 ７',160,108,18,'#ffe899');
  if(!hit){x.strokeStyle='#ffba46';x.lineWidth=4;x.beginPath();x.moveTo(160,125);x.lineTo(160,155);x.moveTo(151,146);x.lineTo(160,155);x.lineTo(169,146);x.stroke();}else{const q=ease((p-.4)*3);for(let k=0;k<7;k++){const a=k*6.28/7;sixArtStar(x,160+Math.cos(a)*q*52,195+Math.sin(a)*q*36,4*(1-q),'#fff','#e8a24e');}sixText(x,'HIT!',160,154,22,'#ffc2e7');}
  caption('入った番号のキャンディが割れる','番号がないキャンディは HIT しない');
 }else if(index===1){
  const p=(t-4500)/4500,q=ease(p/.30),alpha=p>.55?1-ease((p-.55)*4):1;candy(0,90,203,25,alpha);candy(0,140,203,25,alpha);candy(0,115,160,25,alpha);candy(0,165,96+(160-96)*q*q,25,alpha);
  if(p>.30&&p<.70){for(const [cx,cy] of [[90,203],[140,203],[115,160],[165,96+(160-96)*q*q]]){x.strokeStyle='#f8ffb6';x.lineWidth=3;x.beginPath();x.arc(cx,cy,29,0,Math.PI*2);x.stroke();}sixText(x,'４個つながった！',160,115,17,'#e7ffb0');}
  if(p>.70){const z=ease((p-.70)*5);for(let k=0;k<4;k++)candy(2,100+(k%2)*50,110+Math.floor(k/2)*43+z*30,23,1-z*.6);sixText(x,'つながると消去！',160,118,19,'#bff7ff');}
  caption('同じ色が４個以上つながると消える','落下後にまたつながると連鎖！');
 }else if(index===2){
  const p=(t-9000)/5000,glow=.5+.5*Math.sin(time/220);[[88,182],[136,182],[184,182],[232,182],[112,138],[208,138]].forEach(([px,py],i)=>candy(i<4?1:(i===4?0:2),px,py,23,1));
  if(p>.15){x.strokeStyle='#c2fbff';x.lineWidth=4;x.shadowColor='#c2fbff';x.shadowBlur=12;x.beginPath();x.moveTo(66,182);x.lineTo(254,182);x.stroke();x.shadowBlur=0;sixText(x,'直線成立!',160,118,20,'#c8fbff');}
  if(p>.42){sixText(x,'+'+num(medalWin(bet,SIX_PAY.line))+' WIN',110,222,14,'#ffe99c');x.fillStyle='rgba(255,255,190,'+(.18+.18*glow)+')';x.fillRect(77,210,66,23);}
  if(p>.60){x.strokeStyle='#ffd883';x.lineWidth=3;x.beginPath();x.roundRect(176,206,96,28,12);x.stroke();sixText(x,'NEXT ROUND',224,220,12,'#ffd7f2');}
  caption('役ができると配当を獲得','はじめて役が成立したRoundは次へ進出');
 }else{
  const p=(t-14000)/4000;if(p<.55){const q=ease(p/.5);for(let k=0;k<4;k++)candy(0,86+(k%2)*50,143+Math.floor(k/2)*43,23,1-Math.max(0,q-.65)*2);const sugar=getSugarSprite(wonderTier(bet));if(sugar)x.drawImage(sugar,67+q*75,124-q*13,38,38);sixText(x,p>.3?'SUGAR GET!':'シュガー入り',160,113,19,'#ffe5a1');caption('シュガー入りを含めて消すと GET!','同色４個以上、または役の成立で獲得');}else{sixText(x,'ALL CLEAR!',160,133,30,'#ffe686');sixText(x,num(medalWin(bet,SIX_PAY.allClear))+' WIN',160,188,26,'#ffd4ef');for(let k=0;k<6;k++)sixArtStar(x,48+k*45,96+Math.sin(time/450+k)*8,5,'#fff7b9','#e9a25e');caption('盤面を全部消すと大きなボーナス','本番の番号はゲーム開始時に決まる');}
 }
 for(let k=0;k<4;k++){x.fillStyle=k===index?'#ed67a4':'#d6b8ca';x.beginPath();x.arc(139+k*14,291,k===index?4:3,0,7);x.fill();}
 s.candyCanvas.dataset.mode='tutorial';s.candyCanvas.dataset.scene=String(index);s.candyCanvas.setAttribute('aria-label','シックスキャンディ・遊び方の例・'+title);s.sixReachLayer.replaceChildren();s.sixReachKey='';s.candyReward.hidden=true;s.candyStatus.textContent='BET待機中・18秒の遊び方';s.miniCanvas.hidden=false;s.miniLogo.hidden=true;s.mini.setTransform(1,0,0,1,0,0);s.mini.clearRect(0,0,160,160);s.mini.drawImage(s.candyCanvas,0,0,160,160);
}

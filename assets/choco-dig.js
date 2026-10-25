/* Chocolate digging prototype: inserted after Engine in the existing app scope. */
const CHOCO_SAVE_KEY='cookie-link-choco-dig-v1';
const CHOCO_TYPES=[
 {name:'ミルク',top:'#bd7c4a',mid:'#855030',edge:'#4e2c23',hp:1},
 {name:'いちご',top:'#f5acbe',mid:'#c46d89',edge:'#7b3d59',hp:1},
 {name:'ホワイト',top:'#fff3cc',mid:'#dfc18c',edge:'#9c7449',hp:1},
 {name:'抹茶',top:'#a7c782',mid:'#6f8f52',edge:'#3d5837',hp:1},
 {name:'ビター',top:'#785044',mid:'#48302c',edge:'#241b20',hp:2},
 {name:'ウエハース',top:'#e7bb7f',mid:'#a26a3b',edge:'#633d2d',hp:1},
 {name:'フォンダン',top:'#b76946',mid:'#703b32',edge:'#402329',hp:1},
 {name:'宝箱',top:'#ffe09b',mid:'#c98b3a',edge:'#794529',hp:2}
];
class ChocoDigEngine extends Engine{
 reset(){
  this.kind='choco';
  // Abandoning an unfinished round restores its checkpoint, not a new random map.
  if(this.checkpoint&&this.phase!=='complete')this.restoreWorld(this.checkpoint);
  if(!this.strata){this.seed=(Math.floor(this.random()*0xffffffff)||19351)>>>0;this.depth=0;this.dugTotal=0;this.chestsTotal=0;this.nextSugar=10;this.strata=[];this.ensureRows();}
  this.version++;this.presentationRate=1;this.roundBet=this.roundBet||100;
  this.queue=[];this.pendingDraws=new Set();this.seen=new Set();this.drawn=new Set();
  this.history=[];this.accepted=0;this.processed=0;this.busy=false;this.running=false;this.opening=false;this.paused=false;
  this.totalHundredths=0;this.maxLink=0;this.maxChain=0;this.lastChain=0;this.allClears=0;
  this.roundSteps=0;this.roundHammers=0;this.roundCleared=0;this.roundBlocks=0;this.roundChests=0;this.roundDepth=0;this.roundCombo=0;this.startDepth=this.depth;
  this.wonderCollected=false;this.wonderIssued=false;this.wonderToken=null;this.wonderColumn=0;this.pendingSugarAward=[];
  this.basketState=Array.from({length:SIZE},()=>({goal:10,remaining:10,weight:0,pending:[]}));
  this.hammerQueue=[];this.hammerPreview=Array.from({length:65},()=>[]);this.hammerPreviewVersion=0;
  this.board=Array.from({length:SIZE},()=>Array(SIZE).fill(null));
  this.fx=null;this.hitColumns=[];this.checkpoint=null;this.digMessage='番号の列を掘って お菓子の地下へ！';this.emit('ready');
 }
 rng(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
 makeRow(level){return Array.from({length:5},(_,c)=>{const p=this.rng();let kind=p<.24?0:p<.43?1:p<.61?2:p<.77?3:p<.88?4:p<.96?5:6;if(level%6===4&&c===Math.floor(level/6)%5)kind=7;const hp=CHOCO_TYPES[kind].hp;return {id:level*5+c+1,kind,hp,maxHp:hp};});}
 ensureRows(){while(this.strata.length<12)this.strata.push(this.makeRow(this.depth+this.strata.length));}
 world(){return JSON.parse(JSON.stringify({version:1,seed:this.seed,depth:this.depth,dugTotal:this.dugTotal,chestsTotal:this.chestsTotal,nextSugar:this.nextSugar,strata:this.strata}));}
 restoreWorld(w){this.seed=w.seed>>>0;this.depth=w.depth;this.dugTotal=w.dugTotal;this.chestsTotal=w.chestsTotal;this.nextSugar=w.nextSugar;this.strata=w.strata.map(row=>row.map(t=>t?{...t}:null));}
 validWorld(w){return w?.version===1&&Number.isInteger(w.seed)&&['depth','dugTotal','chestsTotal','nextSugar'].every(k=>Number.isSafeInteger(w[k])&&w[k]>=0&&w[k]<10000000)&&w.nextSugar>w.depth&&Array.isArray(w.strata)&&w.strata.length===12&&w.strata.every(row=>Array.isArray(row)&&row.length===5&&row.every(t=>t===null||(Number.isSafeInteger(t.id)&&Number.isInteger(t.kind)&&t.kind>=0&&t.kind<8&&Number.isInteger(t.hp)&&t.hp>0&&t.hp<=CHOCO_TYPES[t.kind].hp&&t.maxHp===CHOCO_TYPES[t.kind].hp)));}
 enablePersistence(storage){this.storage=storage;try{const text=storage?.getItem(CHOCO_SAVE_KEY);if(text){const w=JSON.parse(text);if(this.validWorld(w)){this.restoreWorld(w);this.startDepth=this.depth;this.emit('ready');}}}catch{}}
 persist(){try{this.storage?.setItem(CHOCO_SAVE_KEY,JSON.stringify(this.world()));this.saveFailed=false;}catch{this.saveFailed=true;}}
 start(){if(this.running||this.roundBet<=0)return;this.checkpoint=this.world();this.startDepth=this.depth;this.running=true;this.opening=false;this.busy=false;this.digMessage='入賞した番号の列にドリル！';this.emit('waiting');}
 frontier(c,grid=this.strata){return grid.findIndex(row=>row[c]);}
 previewDraw(n){const ok=super.previewDraw(n);if(ok)this.hitColumns=[...this.pendingDraws].map(v=>(v-1)%5);return ok;}
 plan(numbers){
  const grid=this.strata.map(row=>row.map(t=>t?{...t}:null)),removed=new Map(),cracked=new Set(),explosions=[];let combo=0;
  const remove=(r,c)=>{const t=grid[r]?.[c];if(!t)return;removed.set(r*5+c,{r,c,t:{...t}});grid[r][c]=null;if(t.kind===6)explosions.push([r,c]);};
  const linked=(r,c,kind)=>{const found=[],seen=new Set(),stack=[[r,c]];while(stack.length){const [y,x]=stack.pop(),key=y*5+x,t=grid[y]?.[x];if(y<0||x<0||x>=5||seen.has(key)||!t||t.kind!==kind)continue;seen.add(key);found.push([y,x]);for(const [dy,dx] of [[0,1],[0,-1],[1,0],[-1,0]])stack.push([y+dy,x+dx]);}return found;};
  for(const n of numbers){const c=(n-1)%5,r=this.frontier(c,grid);if(r<0)continue;const t=grid[r][c];cracked.add(r*5+c);t.hp--;if(t.hp<=0){const cluster=t.kind<4||t.kind===5?linked(r,c,t.kind):[[r,c]];if(cluster.length>=3){combo+=cluster.length;for(const [y,x] of cluster)remove(y,x);}else remove(r,c);}}
  for(let i=0;i<explosions.length;i++){const [r,c]=explosions[i];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)remove(r+dy,c+dx);}
  return {grid,removed:[...removed.values()],cracked:[...cracked],combo,treasures:[...removed.values()].filter(v=>v.t.kind===7).length};
 }
 async drain(){
  const token=this.version;if(this.busy)return;this.busy=true;
  try{
   while(this.queue.length&&token===this.version){
    const numbers=this.queue.shift();this.hitColumns=numbers.map(n=>(n-1)%5);for(const n of numbers){this.pendingDraws.delete(n);this.drawn.add(n);}
    this.emit('digHit',{numbers});if(!await this.wait(400*this.speed,token))return;
    const plan=this.plan(numbers);this.fx={phase:'crack',plan,elapsed:0,stamp:null};this.emit('digCrack',{numbers});if(!await this.wait(260*this.speed,token))return;
    this.strata=plan.grid;this.roundBlocks+=plan.removed.length;this.dugTotal+=plan.removed.length;this.roundChests+=plan.treasures;this.chestsTotal+=plan.treasures;this.roundCombo=Math.max(this.roundCombo,plan.combo);
    const gain=plan.treasures*100+Math.max(0,plan.combo-2)*5;this.totalHundredths+=gain;
    this.fx={phase:'break',plan,elapsed:0,stamp:null};this.digMessage=plan.treasures?'宝箱発見！ ＋'+plan.treasures+'倍':plan.combo>=3?plan.combo+' BLOCKS！ チョコがつながった！':plan.removed.length?'チョコを砕いて深部へ！':plan.cracked.length?'硬いチョコにひびが入った！':'この列は深部に到達・ほかの列を待機';
    this.emit('digBreak',{numbers,broken:plan.removed.length,combo:plan.combo,treasures:plan.treasures,gain});if(!await this.wait(620*this.speed,token))return;
    let advanced=0;while(this.strata.length&&this.strata[0].every(t=>!t)){this.strata.shift();this.depth++;advanced++;}
    this.totalHundredths+=advanced*20;this.roundDepth=this.depth-this.startDepth;this.ensureRows();this.fx=null;this.hitColumns=[];
    this.processed+=numbers.length;this.emit('settled',{numbers,dig:true,advanced,broken:plan.removed.length,combo:plan.combo});if(!await this.wait(750*this.speed,token))return;
   }
   if(token!==this.version)return;this.busy=false;
   if(this.processed===8){
    if(this.depth>=this.nextSugar){this.nextSugar=(Math.floor(this.depth/10)+1)*10;this.wonderCollected=true;this.wonderIssued=true;this.roundSteps=1;this.wonderToken={id:'dig-'+this.depth+'-'+this.version,value:this.roundBet,tier:wonderTier(this.roundBet)};this.emit('stepcollect',{steps:[this.wonderToken]});this.emit('sugaraward',{steps:[this.wonderToken]});}
    this.running=false;this.checkpoint=null;this.persist();this.emit('complete');
   }else this.emit('waiting');
  }catch(error){if(token===this.version){this.busy=false;this.running=false;this.emit('error',{message:error.message});}}
 }
}
const chocoSprites=new Map();
function chocoTile(kind,hp){
 const key=kind+'/'+hp;if(chocoSprites.has(key))return chocoSprites.get(key);
 const cv=document.createElement('canvas');cv.width=120;cv.height=92;const x=cv.getContext('2d'),p=CHOCO_TYPES[kind];
 x.fillStyle=p.edge;x.beginPath();x.roundRect(3,7,114,82,11);x.fill();
 const g=x.createLinearGradient(0,4,0,80);g.addColorStop(0,p.top);g.addColorStop(.46,p.mid);g.addColorStop(1,p.edge);x.fillStyle=g;x.beginPath();x.roundRect(5,3,110,78,10);x.fill();x.strokeStyle=p.top;x.lineWidth=2;x.stroke();
 x.strokeStyle='#fff4c04d';x.lineWidth=2;x.beginPath();x.moveTo(17,10);x.lineTo(102,10);x.stroke();x.strokeStyle=p.edge;x.lineWidth=4;
 if(kind<5){
  for(let row=0;row<2;row++)for(let col=0;col<3;col++){x.fillStyle=p.top;x.globalAlpha=.3;x.beginPath();x.roundRect(14+col*31,16+row*29,26,24,4);x.fill();x.globalAlpha=1;x.strokeStyle=p.edge;x.lineWidth=1.4;x.stroke();}
  if(kind===1){x.fillStyle='#a7365c';for(let i=0;i<8;i++){x.beginPath();x.ellipse(17+i*12,26+(i%3)*12,1.5,2.8,.5,0,Math.PI*2);x.fill();}}
  if(kind===2||kind===3){x.strokeStyle=kind===2?'#fffce0':'#e4efbd';x.lineWidth=2;x.beginPath();for(let i=0;i<=100;i++){const y=32+Math.sin(i*.12)*10;i?x.lineTo(10+i,y):x.moveTo(10+i,y);}x.stroke();}
 }else if(kind===5){for(let i=0;i<5;i++){x.fillStyle=i%2?'#efcf97':'#9d633a';x.fillRect(8,42+i*8,104,6);}x.strokeStyle='#6f412b';x.lineWidth=2;for(let i=-70;i<140;i+=16){x.beginPath();x.moveTo(i,8);x.lineTo(i+30,38);x.stroke();}}
 else if(kind===6){const core=x.createRadialGradient(61,39,1,61,39,35);core.addColorStop(0,'#ffdd74');core.addColorStop(.4,'#f49c48');core.addColorStop(1,'#632f25');x.fillStyle=core;x.beginPath();x.ellipse(60,39,32,25,0,0,Math.PI*2);x.fill();x.fillStyle='#ffcb63';x.beginPath();x.roundRect(52,36,16,39,7);x.fill();}
 else{x.fillStyle='#b27437';x.beginPath();x.roundRect(16,20,88,47,7);x.fill();x.strokeStyle='#ffde83';x.lineWidth=5;x.stroke();x.beginPath();x.moveTo(18,39);x.lineTo(102,39);x.stroke();x.fillStyle='#fff0a0';x.fillRect(31,21,6,44);x.fillRect(83,21,6,44);x.fillRect(51,34,18,17);x.fillStyle='#794529';x.beginPath();x.arc(60,42,3,0,7);x.fill();}
 if(hp<p.hp){x.strokeStyle='#fff0c5';x.lineWidth=4;x.beginPath();x.moveTo(20,9);x.lineTo(47,31);x.lineTo(38,46);x.lineTo(72,58);x.lineTo(87,80);x.stroke();x.strokeStyle='#271a1c';x.lineWidth=2;x.stroke();}
 chocoSprites.set(key,cv);return cv;
}
function setupChocoSlot(s){
 if(s.chocoCanvas)return;s.panel.classList.add('choco-panel');s.tab.classList.add('choco-tab');s.holder.classList.add('choco-slot');
 s.tab.querySelector('.tab-game-name').innerHTML='<span class="choco-tab-title">ショコラディグ<small>CHOCOLATE EXPEDITION</small></span>';s.tab.querySelector('.tab-game-name').setAttribute('aria-label','ショコラディグ');
 const wrap=document.createElement('div');wrap.className='choco-surface';wrap.innerHTML='<div class="choco-topline"><span>CHOCOLATE EXPEDITION</span><b class="choco-save">継続式</b></div><canvas class="choco-canvas" width="640" height="640" role="img" aria-label="ショコラディグ・5本の縦穴とチョコの地層"></canvas><div class="choco-status" role="status"></div>';
 s.panel.append(wrap);s.chocoCanvas=wrap.querySelector('canvas');s.chocoCtx=s.chocoCanvas.getContext('2d');s.chocoStatus=wrap.querySelector('.choco-status');s.chocoSave=wrap.querySelector('.choco-save');
 const info=document.createElement('div');info.id='choco-heading';info.innerHTML='<strong>ショコラディグ<small>おかしの地下へ、もう一段。</small></strong><span>DEPTH <b id="choco-depth">0</b> m</span>';document.querySelector('.festival-top').append(info);
 const odds=document.createElement('div');odds.id='choco-odds';odds.innerHTML='<div class="choco-odds-title">DIG REWARDS<small>試作版・仮配当</small></div><section><span>今回の獲得</span><b id="choco-win">0</b><em>WIN</em></section><dl><dt>1段を掘り抜く</dt><dd>BET × 0.2</dd><dt>宝箱をこわす</dt><dd>BET × 1.0</dd><dt>同色3個以上</dt><dd>3個から1個ごと<br>BET × 0.05</dd></dl><div class="choco-sugar-goal">次のシュガー<br><b id="choco-sugar-depth">10 m</b></div><p>番号 → その列を掘る<br>硬いチョコは2HIT<br>同色3個以上が連結崩し<br>フォンダンは周囲も消去</p><footer>地形は次のゲームへ継続<br>0 BETは掘削しません</footer>';$('odds-panel').append(odds);
}
function chocoEvent(s,ev,e,a){
 setupChocoSlot(s);s.event=ev;s.dirtyMain=true;s.dirtyMini=true;s.reachResults=[];s.tabReachResults=[];s.reachStatus='ready';s.reachBoardKey=e.version+'/'+e.processed;
 if(['ready','error'].includes(ev.phase)){stopSugarAward(s);clearMiniResult(s);if(s.chocoFrame)cancelAnimationFrame(s.chocoFrame);s.chocoFrame=0;}
 if(ev.phase==='sugaraward')showSugarAward(s,ev.steps);
 if(ev.phase==='digBreak'&&s.i===active){sound('crack',{volume:.85});if(ev.treasures)sound('confirm',{delay:80,volume:.8});else if(ev.combo>=3)sound('magic',{volume:.5});}
 s.message=e.digMessage;chocoQueueFrame(s);scheduleUI(a);
}
function chocoQueueFrame(s){if(s.chocoFrame||document.hidden||!inView)return;s.chocoFrame=requestAnimationFrame(now=>{s.chocoFrame=0;if(s.chocoLastDraw&&now-s.chocoLastDraw<32){chocoQueueFrame(s);return;}s.chocoLastDraw=now;drawChoco(s,now);});}
function chocoText(x,text,px,py,size,color='#fff1c9',align='center'){x.font='900 '+size+'px system-ui,sans-serif';x.textAlign=align;x.textBaseline='middle';x.lineJoin='round';x.strokeStyle='#311d24';x.lineWidth=Math.max(2,size*.15);x.strokeText(text,px,py);x.fillStyle=color;x.fillText(text,px,py);}
function drawChoco(s,now=performance.now()){
 if(!s.engine||s.engine.kind!=='choco')return;setupChocoSlot(s);
 const e=s.engine,x=s.chocoCtx,paused=!app||app.paused||document.hidden||!inView,bet=app?.bet(s.i)||0;
 if(!paused)s.chocoTime=now;const time=s.chocoTime||now;x.setTransform(2,0,0,2,0,0);x.clearRect(0,0,320,320);
 const bg=x.createLinearGradient(0,0,0,320);bg.addColorStop(0,'#251928');bg.addColorStop(1,'#5b3035');x.fillStyle=bg;x.fillRect(0,0,320,320);
 const pending=new Set([...e.pendingDraws].map(n=>(n-1)%5)),activeCols=new Set(e.hitColumns||[]);
 for(let c=0;c<5;c++){
  const left=20+c*56,pulse=(Math.sin(time/130)+1)*.5,hot=pending.has(c)||(['digHit','digCrack','digBreak'].includes(e.phase)&&activeCols.has(c));
  x.fillStyle=hot?'#c88d50':'#594036';x.beginPath();x.roundRect(left,2,53,35,6);x.fill();x.strokeStyle=hot?'#ffe39c':'#bc9465';x.lineWidth=hot?2:1;x.stroke();
  chocoText(x,[1+c,6+c,11+c].join('・'),left+26,13,8);chocoText(x,[16+c,21+c].join('・'),left+26,26,8);
  x.fillStyle='#fff4c4';x.globalAlpha=hot?.4+.6*pulse:.35;x.beginPath();x.moveTo(left+19,39);x.lineTo(left+33,39);x.lineTo(left+26,47);x.closePath();x.fill();x.globalAlpha=1;
  const top=e.frontier(c);
  for(let r=0;r<8;r++){
   const tile=e.strata[r]?.[c],y=48+r*30;if(!tile){x.fillStyle='#1a132150';x.fillRect(left,y,53,27);continue;}
   x.globalAlpha=r>top?.8:1;if(hot&&r===top)x.globalAlpha=.48+.52*pulse;x.drawImage(chocoTile(tile.kind,tile.hp),left,y,53,28);x.globalAlpha=1;
   if(r===top){x.strokeStyle=hot?'#fff4a8':'#f6d398';x.lineWidth=hot?2:1;x.beginPath();x.roundRect(left,y,53,28,4);x.stroke();}
   if(tile.maxHp>1){x.fillStyle='#ffdf9e';for(let i=0;i<tile.hp;i++){x.beginPath();x.arc(left+43-i*7,y+6,2,0,7);x.fill();}}
   if(e.fx?.phase==='crack'&&e.fx.plan.cracked.includes(r*5+c)){x.strokeStyle='#ffe4a5';x.lineWidth=2;x.beginPath();x.moveTo(left+17,y);x.lineTo(left+28,y+12);x.lineTo(left+20,y+20);x.lineTo(left+34,y+28);x.stroke();}
  }
  if(top>=8)chocoText(x,'▼ 深部',left+26,288,8,'#ffdf8b');
 }
 for(let r=0;r<8;r++)chocoText(x,String(e.depth+r+1),9,61+r*30,7,'#d0b18f');
 if(['digHit','digCrack'].includes(e.phase))for(const c of activeCols){const r=Math.min(7,Math.max(0,e.frontier(c))),px=46+c*56,py=48+r*30;x.save();x.translate(px,py+5+Math.sin(time/35)*2);x.fillStyle='#f3d788';x.beginPath();x.moveTo(-9,-24);x.lineTo(9,-24);x.lineTo(2,0);x.lineTo(-2,0);x.closePath();x.fill();x.strokeStyle='#765544';x.lineWidth=3;for(let i=0;i<4;i++){x.beginPath();x.moveTo(-8+i,-22+i*5);x.lineTo(7-i,-18+i*5);x.stroke();}x.restore();}
 if(e.fx?.phase==='break'){
  const fx=e.fx;if(!paused){if(fx.stamp!==null)fx.elapsed+=Math.max(0,now-fx.stamp);fx.stamp=now;}else fx.stamp=null;const t=Math.min(1,fx.elapsed/620);x.globalAlpha=1-t;
  for(const v of fx.plan.removed){if(v.r>=8)continue;const px=46+v.c*56,py=61+v.r*30;for(let k=0;k<5;k++){const a=k*1.256+v.t.id*.71;x.save();x.translate(px+Math.cos(a)*t*39,py+Math.sin(a)*t*26+t*t*22);x.rotate(a+t*2);x.fillStyle=CHOCO_TYPES[v.t.kind].top;x.beginPath();x.moveTo(-4,-5);x.lineTo(6,-3);x.lineTo(4,5);x.lineTo(-5,3);x.closePath();x.fill();x.restore();}}x.globalAlpha=1;
 }
 x.fillStyle='#231722e6';x.fillRect(0,294,320,26);chocoText(x,e.depth+' m',24,307,12,'#ffe49c','left');const stage=['ミルク鉱山','ベリー洞窟','ビター岩盤','黄金の菓子遺跡'][Math.floor(e.depth/20)%4];chocoText(x,stage,188,307,9,'#e4c3a4');
 if(!bet){x.fillStyle='#1b15249c';x.fillRect(0,0,320,320);chocoText(x,'0 BET',160,144,28);chocoText(x,'BETして 探検を再開',160,175,12);}
 s.miniCanvas.hidden=false;s.miniLogo.hidden=true;s.mini.clearRect(0,0,160,160);s.mini.drawImage(s.chocoCanvas,0,0,160,160);
 s.chocoStatus.textContent=!bet?'0 BET・この地形を保持して待機':app?.phase==='ready'?'地形は継続！ 次の抽選でさらに深く':e.phase==='complete'?'探検を保存しました・次ゲームへ継続':e.digMessage;s.chocoSave.textContent=e.saveFailed?'保存不可・今回のみ':'継続式';
 if((pending.size||e.fx||e.phase==='digHit')&&!paused&&!jpcSession.active)chocoQueueFrame(s);
}
function chocoHud(a){
 const s=slots[1],e=s.engine;if(!e||e.kind!=='choco')return;const selected=active===1;document.body.classList.toggle('choco-active',selected);s.tab.setAttribute('aria-label','ショコラディグ・深さ'+e.depth+'m・'+a.bet(1)+' BET');s.miniCanvas.hidden=false;s.miniLogo.hidden=true;
 if(selected){put('choco-depth',e.depth);put('choco-win',num(medalWin(a.bet(1),e.totalHundredths)));put('choco-sugar-depth',e.nextSugar+' m');}
 const key=[e.version,e.phase,e.processed,e.depth,e.totalHundredths,a.bet(1)].join('/');if(s.chocoKey!==key){s.chocoKey=key;chocoQueueFrame(s);}
}

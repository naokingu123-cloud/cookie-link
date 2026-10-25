/* Original third-tab prototype. Included in the existing app scope after Engine. */
const CARNIVAL_FLAVORS=[
 {name:'いちご',light:'#ffd0de',color:'#f04485',dark:'#9b2456'},
 {name:'レモン',light:'#fff3af',color:'#f4c322',dark:'#a66a16'},
 {name:'ミント',light:'#cbf9d7',color:'#38bf8a',dark:'#23785c'},
 {name:'ソーダ',light:'#cdf1ff',color:'#40b7ed',dark:'#246ba5'},
 {name:'ぶどう',light:'#ecd6ff',color:'#aa6ee3',dark:'#6a3697'}
];
const CARNIVAL_TARGET=4;
class CandyCarnivalEngine extends Engine{
 reset(){
  this.kind='candy';this.drawMode='single';this.reachMode='single';this.version++;this.presentationRate=1;this.roundBet=this.roundBet||100;
  this.queue=[];this.pendingDraws=new Set();this.seen=new Set();this.drawn=new Set();this.history=[];
  this.accepted=0;this.processed=0;this.busy=false;this.running=false;this.opening=false;this.paused=false;
  this.totalHundredths=0;this.maxLink=0;this.maxChain=0;this.lastChain=0;this.allClears=0;this.roundSteps=0;this.roundHammers=0;this.roundCleared=0;
  this.wonderCollected=false;this.wonderIssued=false;this.wonderToken=null;this.wonderColumn=0;this.pendingSugarAward=[];
  this.basketState=Array.from({length:SIZE},()=>({goal:10,remaining:10,weight:0,pending:[]}));this.hammerQueue=[];this.hammerPreview=Array.from({length:65},()=>[]);this.hammerPreviewVersion=0;
  this.board=Array.from({length:SIZE},()=>Array(SIZE).fill(null));this.jars=[0,0,0,0,0];this.filled=[false,false,false,false,false];this.completedJars=0;this.partyAwarded=false;this.grandAwarded=false;this.roundCandies=0;this.rainbowHits=0;this.lastGain=0;this.lastNumber=0;this.fx=null;this.deck=[];
  this.candyMessage='5色のキャンディをビンに集めよう！';this.emit('ready');
 }
 makeDeck(){
  const cards=[];for(let color=0;color<5;color++)for(const amount of [1,1,2,2,3])cards.push({color,amount,rainbow:false});
  const magic=Math.floor(this.random()*5)*5;cards[magic]={color:-1,amount:1,rainbow:true};
  for(let i=cards.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];}
  return cards.map((v,i)=>({...v,number:i+1}));
 }
 start(){if(this.running||this.roundBet<=0)return;this.deck=this.makeDeck();this.running=true;this.opening=false;this.busy=false;this.candyMessage='番号にHIT → キャンディをビンへ！';this.emit('waiting');}
 plan(numbers){
  const jars=[...this.jars],filled=[...this.filled],added=[],newly=[];let candies=0,rainbows=0;
  for(const n of numbers){const card=this.deck[n-1];if(!card)continue;const colors=card.rainbow?[0,1,2,3,4]:[card.color];if(card.rainbow)rainbows++;
   for(const color of colors){const amount=Math.min(card.amount,CARNIVAL_TARGET-jars[color]);if(amount>0){jars[color]+=amount;added.push({number:n,color,amount});candies+=amount;}}
  }
  for(let i=0;i<5;i++)if(!filled[i]&&jars[i]>=CARNIVAL_TARGET){filled[i]=true;newly.push(i);}
  const count=filled.filter(Boolean).length,party=count>=3&&!this.partyAwarded,grand=count===5&&!this.grandAwarded;
  return {jars,filled,count,added,newly,candies,rainbows,party,grand,gain:newly.length*50+(party?300:0)+(grand?1000:0)};
 }
 predict(number){if(this.drawn.has(number)||!this.deck.length)return null;const p=this.plan([number]);return {number,total:this.totalHundredths+p.gain,gain:p.gain,maxLink:0,chain:0,allClear:false,tier:reachTier(this.totalHundredths+p.gain,false),completed:p.count,grand:p.grand};}
 async drain(){
  if(this.busy)return;const token=this.version;this.busy=true;
  try{
   while(this.queue.length&&token===this.version){
    const numbers=this.queue.shift(),plan=this.plan(numbers);for(const n of numbers){this.pendingDraws.delete(n);this.drawn.add(n);}this.lastNumber=numbers.at(-1);this.lastGain=0;
    this.fx={phase:'fly',numbers:[...numbers],plan,elapsed:0,stamp:null};this.candyMessage=plan.rainbows?'スターキャンディ！ すべてのビンに＋1！':'キャンディがビンへ飛んでいく！';this.emit('candyFly',{numbers,plan});
    if(!await this.wait(650*this.speed,token))return;
    this.jars=plan.jars;this.filled=plan.filled;this.completedJars=plan.count;this.roundCandies+=plan.candies;this.rainbowHits+=plan.rainbows;this.totalHundredths+=plan.gain;this.lastGain=plan.gain;
    this.partyAwarded||=plan.party;this.grandAwarded||=plan.grand;
    this.fx={phase:'award',numbers:[...numbers],plan,elapsed:0,stamp:null};
    this.candyMessage=plan.grand?'GRAND CARNIVAL！ 5色コンプリート！':plan.party?'CANDY PARTY！ 3色完成ボーナス！':plan.newly.length?plan.newly.length+'本のビンが完成！':plan.candies?'あと少し！ キャンディを集めよう':'この色は完成済み・次の番号を待とう';
    this.emit('candyAward',{numbers,plan,gain:plan.gain});if(!await this.wait((plan.grand?1550:plan.gain>=300?1300:plan.gain?1050:350)*this.speed,token))return;
    this.processed+=numbers.length;this.fx=null;this.emit('settled',{numbers,candy:true,filled:this.completedJars});
   }
   if(token!==this.version)return;this.busy=false;
   if(this.processed===8){
    if(this.grandAwarded&&!this.wonderCollected){this.wonderCollected=true;this.wonderIssued=true;this.roundSteps=1;this.wonderToken={id:'carnival-'+this.version,value:this.roundBet,tier:wonderTier(this.roundBet)};this.emit('stepcollect',{steps:[this.wonderToken]});this.emit('sugaraward',{steps:[this.wonderToken]});}
    this.running=false;this.candyMessage='完成 '+this.completedJars+'本！ 次のゲームは新しいキャンディで';this.emit('complete');
   }else this.emit('waiting');
  }catch(error){if(token===this.version){this.busy=false;this.running=false;this.emit('error',{message:error.message});}}
 }
}
function carnivalCandy(x,cx,cy,size,color=0,star=false,angle=0){
 x.save();x.translate(cx,cy);x.rotate(angle);const p=CARNIVAL_FLAVORS[(color+5)%5];x.lineJoin='round';
 if(star){const g=x.createLinearGradient(-size,-size,size,size);['#ff6393','#ffd54d','#73e3a7','#64cfff','#c08aff'].forEach((v,i)=>g.addColorStop(i/4,v));x.fillStyle=g;x.strokeStyle='#fff8d0';x.lineWidth=size*.16;x.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=size*(i%2?.48:1);i?x.lineTo(Math.cos(a)*r,Math.sin(a)*r):x.moveTo(Math.cos(a)*r,Math.sin(a)*r);}x.closePath();x.fill();x.stroke();}
 else{
  x.fillStyle=p.light;x.strokeStyle=p.dark;x.lineWidth=Math.max(.7,size*.08);
  for(const sign of [-1,1]){x.beginPath();x.moveTo(sign*size*.62,0);x.lineTo(sign*size*1.25,-size*.55);x.lineTo(sign*size*1.13,0);x.lineTo(sign*size*1.25,size*.55);x.closePath();x.fill();x.stroke();}
  const g=x.createLinearGradient(0,-size,0,size);g.addColorStop(0,p.light);g.addColorStop(.35,p.color);g.addColorStop(1,p.dark);x.fillStyle=g;x.beginPath();x.ellipse(0,0,size*.85,size*.66,0,0,Math.PI*2);x.fill();x.stroke();
  x.save();x.clip();x.strokeStyle='#fff9e9a0';x.lineWidth=size*.24;x.beginPath();x.moveTo(-size*.6,-size);x.lineTo(size*.1,size);x.moveTo(size*.15,-size);x.lineTo(size*.85,size);x.stroke();x.restore();
  x.fillStyle='#ffffffb0';x.beginPath();x.ellipse(-size*.25,-size*.31,size*.3,size*.11,-.25,0,7);x.fill();
 }x.restore();
}
function setupCarnivalSlot(s){
 if(s.candyCanvas)return;s.panel.classList.add('carnival-panel');s.tab.classList.add('carnival-tab');s.holder.classList.add('carnival-slot');
 s.tab.querySelector('.tab-game-name').innerHTML='<span class="carnival-tab-title">キャンディカーニバル<small>CANDY CARNIVAL</small></span>';s.tab.querySelector('.tab-game-name').setAttribute('aria-label','キャンディカーニバル');
 const wrap=document.createElement('div');wrap.className='carnival-surface';wrap.innerHTML='<div class="carnival-topline"><span>CANDY CARNIVAL</span><b>4個でビン完成</b></div><canvas class="carnival-canvas" width="640" height="640" role="img" aria-label="5色のキャンディをビンに集めるゲーム"></canvas><div class="carnival-status" role="status"></div><div class="carnival-reward" role="status" hidden></div>';
 s.panel.append(wrap);s.candyCanvas=wrap.querySelector('canvas');s.candyCtx=s.candyCanvas.getContext('2d');s.candyStatus=wrap.querySelector('.carnival-status');s.candyReward=wrap.querySelector('.carnival-reward');
 const heading=document.createElement('div');heading.id='carnival-heading';heading.innerHTML='<strong>キャンディカーニバル<small>あつめて、そろえて、おかしのお祭り！</small></strong><span>COMPLETE <b id="carnival-complete">0</b> / 5</span>';document.querySelector('.festival-top').append(heading);
 const odds=document.createElement('div');odds.id='carnival-odds';odds.innerHTML='<div class="carnival-odds-title">CANDY REWARDS<small>試作版・仮配当</small></div><section><span>今回の獲得</span><b id="carnival-win">0</b><em>WIN</em></section><dl><dt>ビン1本完成</dt><dd>BET × 0.5</dd><dt>3色完成 PARTY</dt><dd>さらに BET × 3</dd><dt>5色コンプリート</dt><dd>さらに BET × 10</dd></dl><div class="carnival-sugar-goal">5色完成で<br><b>シュガーGET</b></div><p>入賞ごとに1〜3個GET<br>4個でその色のビン完成<br>★は全色に1個ずつ<br>あふれた分は加算なし</p><footer>ビンは1ゲームごとに更新<br>0 BETでは参加しません</footer>';$('odds-panel').append(odds);
}
function carnivalEvent(s,ev,e,a){
 setupCarnivalSlot(s);s.event=ev;s.dirtyMain=true;s.dirtyMini=true;
 if(['ready','error'].includes(ev.phase)){stopSugarAward(s);clearMiniResult(s);s.candyReward.hidden=true;if(s.candyFrame)cancelAnimationFrame(s.candyFrame);s.candyFrame=0;invalidateReach(s);}
 if(ev.phase==='sugaraward')showSugarAward(s,ev.steps);
 if(ev.phase==='candyFly'){s.candyReward.hidden=true;invalidateReach(s);if(s.i===active)sound('magic',{volume:.42});}
 if(ev.phase==='candyAward'){
  const gain=ev.gain||0;s.candyReward.hidden=!gain;s.candyReward.dataset.tier=gain>=1000?'2':gain>=300?'1':'0';
  if(gain){const title=ev.plan.grand?'GRAND CARNIVAL!':ev.plan.party?'CANDY PARTY!':'BOTTLE COMPLETE!';s.candyReward.innerHTML='<small>'+title+'</small><strong>＋'+num(medalWin(a.bet(s.i),gain))+' <em>WIN</em></strong><span>'+num(gain/100)+' × BET</span>';if(s.i===active)sound('confirm',{volume:1});}
 }
 if(ev.phase==='settled')s.candyReward.hidden=true;
 if(['waiting','settled','complete'].includes(ev.phase))requestReach(s,e);
 s.message=e.candyMessage;carnivalQueueFrame(s);scheduleUI(a);
}
function carnivalQueueFrame(s){
 if(s.candyFrame||document.hidden||!inView)return;const version=s.engine.version;
 s.candyFrame=requestAnimationFrame(now=>{s.candyFrame=0;if(s.engine.version!==version)return;if(s.candyLastDraw&&now-s.candyLastDraw<32){carnivalQueueFrame(s);return;}s.candyLastDraw=now;drawCarnival(s,now);});
}
function carnivalText(x,text,px,py,size,color='#6f3e67',align='center'){
 x.font='900 '+size+'px system-ui,sans-serif';x.textAlign=align;x.textBaseline='middle';x.lineJoin='round';x.strokeStyle='#fff8ec';x.lineWidth=Math.max(1,size*.12);x.strokeText(text,px,py);x.fillStyle=color;x.fillText(text,px,py);
}
function drawCarnival(s,now=performance.now()){
 if(s.engine?.kind!=='candy')return;setupCarnivalSlot(s);const e=s.engine,x=s.candyCtx,paused=!app||app.paused||document.hidden||!inView,bet=app?.bet(s.i)||0,ready=app?.phase==='ready';
 if(!paused)s.candyTime=now;const time=s.candyTime||now;x.setTransform(2,0,0,2,0,0);x.clearRect(0,0,320,320);
 const bg=x.createLinearGradient(0,0,320,320);bg.addColorStop(0,'#fff3da');bg.addColorStop(.45,'#ffe0ed');bg.addColorStop(1,'#c9f0ed');x.fillStyle=bg;x.fillRect(0,0,320,320);
 x.save();x.translate(160,107);for(let i=0;i<16;i++){x.rotate(Math.PI/8);x.fillStyle=i%2?'#fff9ec45':'#e5bcdf21';x.beginPath();x.moveTo(0,0);x.lineTo(-42,-350);x.lineTo(42,-350);x.closePath();x.fill();}x.restore();
 for(let i=0;i<16;i++){x.fillStyle=i%2?'#ec91b4':'#fff3de';x.fillRect(i*20,0,20,11);x.beginPath();x.ellipse(i*20+10,11,10,7,0,0,Math.PI);x.fill();}
 x.strokeStyle='#ba8e6f';x.lineWidth=1;x.beginPath();x.moveTo(7,29);x.quadraticCurveTo(160,70,313,29);x.stroke();
 for(let i=0;i<10;i++){const px=18+i*31,py=31+Math.sin(i/9*Math.PI)*14;x.fillStyle=CARNIVAL_FLAVORS[i%5].color;x.beginPath();x.moveTo(px,py);x.lineTo(px+15,py);x.lineTo(px+8,py+13);x.closePath();x.fill();}
 carnivalText(x,ready?'5色のビンをキャンディでいっぱいに！':e.grandAwarded?'GRAND CARNIVAL!':e.partyAwarded?'CANDY PARTY!':'COLLECT THE SWEETS',160,30,11);
 const cols=e.fx?.plan?.added.map(v=>v.color)||[];
 for(let c=0;c<5;c++){
  const p=CARNIVAL_FLAVORS[c],px=13+c*61,full=e.filled[c],hot=cols.includes(c)&&e.fx?.phase==='award';
  if(hot){x.fillStyle=p.color+'55';x.beginPath();x.ellipse(px+25,116,32,55,0,0,7);x.fill();}
  x.fillStyle='#a8777940';x.beginPath();x.ellipse(px+26,165,27,6,0,0,7);x.fill();
  const glass=x.createLinearGradient(px,0,px+52,0);glass.addColorStop(0,'#ffffffeb');glass.addColorStop(.24,p.light+'b5');glass.addColorStop(.66,'#ffffff70');glass.addColorStop(1,p.color+'70');
  x.fillStyle=glass;x.strokeStyle=full?'#daa440':p.dark+'b5';x.lineWidth=full?2.5:1.7;x.beginPath();x.moveTo(px+13,74);x.lineTo(px+39,74);x.lineTo(px+39,85);x.quadraticCurveTo(px+51,89,px+51,102);x.lineTo(px+51,151);x.quadraticCurveTo(px+51,162,px+41,162);x.lineTo(px+11,162);x.quadraticCurveTo(px+1,162,px+1,151);x.lineTo(px+1,102);x.quadraticCurveTo(px+1,89,px+13,85);x.closePath();x.fill();x.stroke();
  const lid=x.createLinearGradient(0,65,0,80);lid.addColorStop(0,'#fff4bf');lid.addColorStop(.5,'#dba756');lid.addColorStop(1,'#b9793b');x.fillStyle=lid;x.beginPath();x.roundRect(px+9,65,34,14,4);x.fill();x.strokeStyle='#a77d4e';x.lineWidth=1;x.stroke();
  for(let k=0;k<4;k++){const cy=146-Math.floor(k/2)*24,cx=px+15+k%2*23;if(k<e.jars[c])carnivalCandy(x,cx,cy,9,c,false,(k%2?1:-1)*.25);else{x.fillStyle=p.color+'18';x.beginPath();x.arc(cx,cy,7,0,7);x.fill();}}
  x.strokeStyle='#ffffffd9';x.lineWidth=3;x.beginPath();x.moveTo(px+8,103);x.lineTo(px+8,142);x.stroke();
  carnivalText(x,CARNIVAL_FLAVORS[c].name,px+26,56,8,p.dark);carnivalText(x,full?'FULL!':e.jars[c]+' / 4',px+26,101,11,full?'#b77522':p.dark);
  if(full)carnivalCandy(x,px+26,74,9,c,true,0);
 }
 x.fillStyle='#fff6e4';x.strokeStyle='#dab78e';x.lineWidth=1;x.beginPath();x.roundRect(10,169,300,18,8);x.fill();x.stroke();
 carnivalText(x,ready?'番号の配置はゲーム開始時に決定':e.completedJars+'色完成  /  3色でPARTY・5色でGRAND',160,178,8);
 for(let n=1;n<=25;n++){
  const c=(n-1)%5,r=Math.floor((n-1)/5),px=11+c*60,py=193+r*24,card=e.deck[n-1],known=!ready&&card,used=e.drawn.has(n),hot=e.fx?.numbers?.includes(n),p=CARNIVAL_FLAVORS[known&&card.color>=0?card.color:(n-1)%5];
  x.globalAlpha=used&&!hot?.42:1;x.fillStyle=known?(card.rainbow?'#fff0c9':p.light):'#fff5e9';x.strokeStyle=hot?'#fffdf0':known?p.color:'#d5b9b1';x.lineWidth=hot?2.5:1;x.beginPath();x.roundRect(px,py,56,21,6);x.fill();x.stroke();
  carnivalCandy(x,px+28,py+10,6,known?card.color:c,!!(known&&card.rainbow),0);carnivalText(x,ready?'?':String(n),px+10,py+10,10,used?'#886b83':p.dark);
  carnivalText(x,known?(card.rainbow?'★':'×'+card.amount):'',px+45,py+11,7);x.globalAlpha=1;
 }
 if(e.fx){const fx=e.fx;if(!paused){if(fx.stamp!==null)fx.elapsed+=Math.max(0,now-fx.stamp)/(e.speed||1)*(e.presentationRate||1);fx.stamp=now;}else fx.stamp=null;
  if(fx.phase==='fly'){const t=motionReduced?1:Math.min(1,fx.elapsed/650),ease=1-Math.pow(1-t,3);for(const v of fx.plan.added)for(let k=0;k<v.amount;k++){const sx=39+(v.number-1)%5*60,sy=203+Math.floor((v.number-1)/5)*24,tx=39+v.color*61,ty=120-k*10;const px=sx+(tx-sx)*ease+Math.sin(t*Math.PI)*(k-1)*12,py=sy+(ty-sy)*ease-Math.sin(t*Math.PI)*48;carnivalCandy(x,px,py,9,v.color,false,t*2+k);}}
  else if(fx.plan.gain){const t=Math.min(1,fx.elapsed/1300);for(let i=0;i<24;i++){const a=i*2.399+fx.numbers[0],radius=35+t*110,px=160+Math.cos(a)*radius,py=104+Math.sin(a)*radius*.55+t*t*45;x.globalAlpha=1-t;carnivalCandy(x,px,py,4+i%3,i%5,i%4===0,a+t);}x.globalAlpha=1;}
 }
 if(!bet){x.fillStyle='#40304a8f';x.fillRect(0,0,320,320);carnivalText(x,'0 BET',160,112,28,'#fff6df');carnivalText(x,'BETしてキャンディを集めよう',160,142,12,'#fff6df');}
 s.miniCanvas.hidden=false;s.miniLogo.hidden=true;s.mini.clearRect(0,0,160,160);s.mini.drawImage(s.candyCanvas,0,0,160,160);
 s.candyStatus.textContent=!bet?'0 BET・参加していません':ready?'1球ごとにGET！ 4個でビンが完成':e.candyMessage;
 s.candyCanvas.setAttribute('aria-label','キャンディのビン '+e.jars.map((n,i)=>CARNIVAL_FLAVORS[i].name+' '+n+'/4').join('、')+'。完成'+e.completedJars+'本');
 if(e.fx&&!paused&&!jpcSession.active)carnivalQueueFrame(s);
}
function carnivalHud(a){
 const s=slots[2],e=s.engine;if(e?.kind!=='candy')return;document.body.classList.toggle('carnival-active',active===2);s.tab.setAttribute('aria-label','キャンディカーニバル・完成'+e.completedJars+'本・'+a.bet(2)+' BET');s.miniCanvas.hidden=false;s.miniLogo.hidden=true;
 if(active===2){put('carnival-complete',e.completedJars);put('carnival-win',num(medalWin(a.bet(2),e.totalHundredths)));}
 const key=[e.version,e.phase,e.processed,e.totalHundredths,a.bet(2),active].join('/');if(s.candyKey!==key){s.candyKey=key;carnivalQueueFrame(s);}
}

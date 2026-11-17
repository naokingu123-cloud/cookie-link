/* Six Drop single-HIT adapter. Reuses the live cabinet, approved candy art,
   server draw channel, original result/credit flow and checkpoint serializer. */
(()=>{
'use strict';
const id=window.SweetsLineup?.ids?.indexOf('candy');if(!(id>=0))return;
const slot=slots[id],e=app.engines[id],R=window.SweetsSixDropV247.create({empty:sixEmpty,clone:sixClone,count:sixCount,valid:sixValid,step:sixStep,neighbors:sixNeighbors,patterns:sixPatterns,findShapes:sixFindShapes,drop:sixDrop,point:sixPoint,gapTemplates:SIX_START_GAP_TEMPLATES});
let committed=R.cleanCarry(null),carryRevision=-1,carryPlayer='',inNewRenderer=false;
const nativeReset=e.reset.bind(e),nativeEvent=carnivalEvent,nativeDraw=drawCarnival,nativeSprite=sixArtCandySprite,nativePose=sixGlassPose,nativeSparkles=requestSixSparkles;
const money=n=>Math.floor(Math.max(0,Number(n)||0)).toLocaleString('ja-JP',{useGrouping:false});
const colorNames={navy:'紺',aqua:'青',green:'緑',lime:'黄緑',yellow:'黄',orange:'橙',red:'赤',violet:'紫'};
const swatches=['#5671e7','#32ceee','#2ab96d','#9cda31','#ffe353','#ff963a','#f34b7c','#b274f1'];
const spriteMap=[[3,1],[2,1],[1,1],[0,1],[0,2],[0,3],[0,4],[0,5]];
function sync(engine){
 const s=engine.state;if(!s||s.version!==247)return;
 engine.totalHundredths=R.asHundredths(R.totalMedals(s),s.bet);engine.lines=s.counts.line;engine.triangles=s.counts.triangle;engine.hexagons=s.counts.hexagon;engine.shapes=engine.lines+engine.triangles+engine.hexagons;
 engine.allClears=s.allClears;engine.roundsCleared=s.allClears;engine.clearBonusHundredths=R.asHundredths(s.bonusMedals,s.bet);
 engine.removedCandies=s.roundRemoved;engine.roundCleared=s.roundRemoved;engine.bestCascade=engine.maxChain=s.maxChain;
 engine.progressiveUnits=s.bankUnits;engine.removedTotal=s.removedTotal;engine.feedRows=Math.floor(s.feed*10/75);engine.roundIndex=Math.floor(s.feed/75)+1;
 engine.remainingCandies=sixCount(s.grid);engine.boardGeneration=s.processed+1;engine.pyramidCleared=s.allClears>0;
}
e.reset=function(...args){
 nativeReset(...args);
 this.rulesVersion=247;this.drawMode=this.reachMode='single';this.state=null;this.seed247=0;this.roundId247='';this.progressiveUnits=committed.bankUnits;this.removedTotal=committed.removed;this.feedRows=Math.floor(committed.feed*10/75);
 this.chanceRound=null;this.maxRounds=Infinity;this.transitionPending=false;this.queue=[];this.phase='ready';this.candyMessage='1球ずつHIT！ 役の色をすべて消してプログレッシブを育てよう';
};
e.start=function(){
 if(this.running||!(this.roundBet>0))return;
 this.seed247=(this.random()*4294967296)>>>0;
 this.state=R.newGame({bet:this.roundBet,rate:typeof debugPayoutTarget==='number'?debugPayoutTarget:90,seed:this.seed247,carry:committed});
 this.roundId247=String(window.SweetsSharedMachine?.client?.round?.id||'');
 this.running=true;this.busy=false;this.opening=false;this.processed=this.accepted=0;this.queue=[];
 this.drawn=new Set();this.seen=new Set();this.pendingDraws=new Set();this.pyramid=sixClone(this.state.grid);this.initialPyramid=sixClone(this.pyramid);sync(this);
 this.candyMessage='1球ごとに落下 → 同色一斉消去 → 10段まで補充';this.emit('waiting');
};
e.previewDraw=function(number){if(!this.running||this.drawn.has(number))return false;this.pendingDraws.add(number);this.emit('drawpending',{number});return true;};
e.enqueueBatch=function(numbers){
 if(!this.running||!Array.isArray(numbers))return false;
 for(const number of numbers){if(!Number.isInteger(number)||number<1||number>25||this.seen.has(number)||this.accepted>=8)continue;this.seen.add(number);this.queue.push([number]);this.accepted++;}
 this.emit('queued',{numbers});if(!this.busy)this.drain();return true;
};
e.reachSnapshot=function(){const state=JSON.parse(JSON.stringify(this.state));return {totalHundredths:this.totalHundredths,predict(number){
 const plan=R.hit(state,number,{preview:true});if(!plan)return null;
 return {number,gain:R.asHundredths(plan.gain,state.bet),total:R.asHundredths(plan.totalWin,state.bet),allClear:plan.allClear,tier:reachTier(R.asHundredths(plan.totalWin,state.bet),plan.allClear),chain:plan.chain,...plan.counts};
}};};
e.predict=function(number){return this.state?this.reachSnapshot().predict(number):null;};
e.progressiveCarryV247=function(){return this.state?R.carryOut(this.state,this.roundId247):R.cleanCarry(committed);};
e.afterCheckpointRestoreV247=function(){
 if(this.state?.version!==247)return;
 this.processed=this.state.draws.length;this.drawn=new Set(this.state.draws);this.seen=new Set([...this.drawn,...this.queue.flat().filter(Number.isInteger)]);
 this.queue=this.queue.map(x=>Array.isArray(x)?x:[x]).filter(x=>x.length===1&&!this.drawn.has(x[0]));this.busy=false;this.fx=null;this.pyramid=sixClone(this.state.grid);this.initialPyramid??=sixClone(this.pyramid);sync(this);
 if(this.processed>=8){this.running=false;this.emit('complete');}else{this.running=true;if(this.queue.length)this.drain();else this.emit('waiting');}
};
e.drain=async function(){
 if(this.busy)return;const token=this.version;this.busy=true;
 try{
  while(this.queue.length&&token===this.version){
   const [number]=this.queue.shift();if(this.state.draws.includes(number))continue;
   const plan=R.hit(this.state,number,{trace:true});if(!plan)continue;
   // Canonical result is computed only from this received number. Store it
   // before presentation, so checkpoints cannot lose a half-animated award.
   this.state=plan.state;this.drawn.add(number);this.pendingDraws.delete(number);this.lastNumber=number;sync(this);
   this.cascade=plan.chain;this.lastGain=R.asHundredths(plan.gain,this.roundBet);
   for(const stage of plan.timeline){
    if(token!==this.version)return;
    this.pyramid=sixClone(stage.grid);this.fx={...stage,elapsed:0,stamp:null};this.remainingCandies=sixCount(this.pyramid);
    this.candyMessage=stage.phase==='pyramidShape'?'役成立！ 同じ色を全部消去':stage.phase==='pyramidAllClear'?'全消し！ プログレッシブ総取り':stage.phase==='pyramidTopUp'?'10段の高さまで注入中':stage.phase==='pyramidFall'?'連鎖落下！':number+'番 HIT';
    this.emit(stage.phase,{numbers:[number],...stage});
    const fast=typeof document!=='undefined'&&document.hidden||new URLSearchParams(location.search).get('serverSettlementWorker')==='1';
    if(!fast&&!await this.waitVisual(Math.max(35,stage.ms)*this.speed,token))return;
   }
   this.pyramid=sixClone(this.state.grid);this.fx=null;this.processed=this.state.draws.length;this.remainingCandies=sixCount(this.pyramid);this.initialPyramid=sixClone(this.pyramid);
   this.candyMessage=plan.chain?plan.chain+'連鎖・次の1球へ！':'次の1球で役をねらおう';
   if(plan.sugarAward&&!this.wonderCollected){
    this.wonderCollected=true;this.roundSteps=1;this.wonderToken??={id:'six247-'+this.version,value:this.roundBet,tier:wonderTier(this.roundBet)};
    this.emit('stepcollect',{steps:[this.wonderToken]});this.emit('sugaraward',{steps:[this.wonderToken]});
   }
   this.emit('settled',{numbers:[number],candy:true,batchChain:plan.chain,batchShapes:plan.counts.line+plan.counts.triangle+plan.counts.hexagon,batchGain:this.lastGain,advance:false});
  }
  if(token!==this.version)return;
  this.busy=false;
  if(this.processed===8){
   if(this.beforeComplete)await this.beforeComplete(token);if(token!==this.version)return;
   this.running=false;this.fx=null;this.candyMessage=R.totalMedals(this.state)>0?'配当獲得！ プログレッシブを次ゲームへ継続':'0 WIN・プログレッシブと投入段数をリセット';this.emit('complete');
  }else this.emit('waiting');
 }catch(error){if(token===this.version){this.busy=false;this.running=false;this.emit('error',{message:String(error?.message||error)});}}
};
// Existing single-HIT cache contract, not the old candy 3+2+1 batch schedule.
const oldReachContext=reachContext;
reachContext=function(engine,a=app){
 if(engine?.rulesVersion!==247)return oldReachContext(engine,a);
 if(!a||a.bet(id)<=0||a.phase==='ready'||!engine.state||engine.busy||engine.queue.length||engine.processed!==a.draws.length)return null;
 return {count:a.draws.length,pending:[],used:new Set(a.draws),key:[engine.version,engine.processed,a.draws.length,a.token,'six247',engine.boardGeneration].join('/')};
};
requestSixSparkles=function(s,engine,a){if(engine?.rulesVersion===247){s.sixSparkleIds=new Set();return;}return nativeSparkles(s,engine,a);};
sixArtCandySprite=function(color,round,sugar,chance){if(inNewRenderer){const pair=spriteMap[((Number(color)%8)+8)%8];return nativeSprite(pair[0],pair[1],sugar,false);}return nativeSprite(color,round,sugar,chance);};
sixGlassPose=function(order,r,elapsed,reduced){if(!inNewRenderer)return nativePose(order,r,elapsed,reduced);const i=order.indexOf(r),age=elapsed-i*32;if(i<0)return {visible:true,offset:0,rotation:0};if(age<0)return {visible:false,offset:0,rotation:0};const u=Math.min(1,age/220);return {visible:true,offset:reduced?0:-350*(1-u*u),rotation:reduced?0:Math.sin(Math.PI*u)*.04};};
drawCarnival=function(s,now){if(s.engine?.rulesVersion!==247)return nativeDraw(s,now);inNewRenderer=true;try{const result=nativeDraw(s,now);if(s.candyCanvas)s.candyCanvas.setAttribute('aria-label','シックスドロップ・1球抽選・投入'+e.feedRows+'段・累計消去'+e.removedTotal+'個');return result;}finally{inNewRenderer=false;}};
function ensureHud(){
 setupCarnivalSlot(slot);const heading=$('carnival-heading');if(heading.dataset.progressive247==='1')return;
 heading.dataset.progressive247='1';heading.innerHTML='<div class="sd247-progressive"><small>全消しでプログレッシブ総取り</small><strong id="sd247-bank">0</strong><em>WIN</em><span id="sd247-progress"></span></div><div class="sd247-colors" id="sd247-colors"></div>';
 const box=slot.sixOdds;box.classList.add('sd247-odds');box.querySelectorAll('.six-role-summary,.six-round-cards,.six-glass-ui').forEach(n=>n.hidden=true);
 const panel=document.createElement('div');panel.className='sd247-roles';panel.innerHTML=['line','triangle','hexagon'].map(type=>'<section data-sd247="'+type+'"><img src="assets/sweet-skins/six-'+type+'.webp" alt=""><b>'+({line:'直線',triangle:'トライアングル',hexagon:'ヘキサゴン'})[type]+'</b><small class="sd247-count"></small><strong class="sd247-next"></strong><small class="sd247-subtotal"></small></section>').join('')+'<div class="sd247-footer">消去1個ごとにBETの0.01倍を蓄積<br>同じ役の次回配当がアップ<br>全消し後も継続／0 WINでリセット</div>';box.append(panel);
}
const previousHud=carnivalHud;
carnivalHud=function(a){
 if(slot.engine?.rulesVersion!==247)return previousHud(a);ensureHud();document.body.classList.toggle('carnival-active',active===id);
 const s=e.state,bet=a.bet(id),bank=s?.bankUnits??committed.bankUnits,feed=s?.feed??committed.feed,removed=s?.removedTotal??committed.removed;
 const set=(node,text)=>{if(node&&node.textContent!==String(text))node.textContent=String(text);};
 set($('sd247-bank'),money(bank/100));set($('sd247-progress'),'累計消去 '+removed+'個 ・ 投入 '+Math.floor(feed*10/75)+'段');
 const band=Math.floor(feed/75),colorBox=$('sd247-colors'),key=band+'/'+e.version;
 if(colorBox.dataset.key!==key){colorBox.dataset.key=key;colorBox.innerHTML='<small>次に注ぐ色</small>'+R.palette(feed).map(c=>'<i style="--drop-color:'+swatches[c]+'" title="'+colorNames[R.RING[c]]+'"></i>').join('')+'<span>次の色変化 '+((band+1)*10)+'段</span>';}
 for(const type of Object.keys(R.BASE_PAY)){const row=slot.sixOdds.querySelector('[data-sd247="'+type+'"]'),count=s?.counts[type]||0;set(row.querySelector('.sd247-count'),'成立 '+count+'回');set(row.querySelector('.sd247-next'),'次 +'+money(bet*R.roleAward(type,count)/100)+' WIN');set(row.querySelector('.sd247-subtotal'),'役合計 '+money(bet*R.roleAward(type,0,count)/100)+' WIN');}
 fitGoldenNumber($('carnival-win'),money(s?R.totalMedals(s):0),23,100);slot.tab.setAttribute('aria-label','シックスドロップ '+bet+' BET・1球抽選');
 if(active===id){put('best',s?R.totalMedals(s)+' WIN':'プログレッシブ '+money(bank/100)+' WIN');put('ballinfo','進行 '+(a.draws?.length||0)+' ／ 投入 '+Math.floor(feed*10/75)+'段');}
 const stamp=[e.version,e.phase,e.processed,e.boardGeneration,e.totalHundredths,bank,s?.counts.line,s?.counts.triangle,s?.counts.hexagon].join('/');if(slot.candyKey!==stamp){slot.candyKey=stamp;carnivalQueueFrame(slot);}
};
carnivalEvent=function(s,event,engine,a){
 const out=nativeEvent(s,event,engine,a);if(engine.rulesVersion!==247)return out;
 if(['pyramidAward','pyramidAllClear'].includes(event.phase)){
  const label=event.phase==='pyramidAllClear'?'プログレッシブ総取り！':'同色ドロップ一斉消去！';
  s.candyReward.innerHTML='<small>'+label+'</small><strong>+'+money(event.winMedals)+' <em>WIN</em></strong><span>'+ (event.chain?event.chain+' CHAIN':'')+'</span><b class="six-next">'+(event.phase==='pyramidAllClear'?'蓄積はそのまま継続':'連鎖でさらに配当UP')+'</b>';
 }
 if(event.phase==='complete'||event.phase==='ready')s.candyReward.hidden=true;
 carnivalHud(a);return out;
};
// Replace the old round-based tutorial with a rule explanation, retaining jar art.
const oldTutorial=sixDrawTutorial;
sixDrawTutorial=function(s,time,bet){
 if(s.engine?.rulesVersion!==247)return oldTutorial(s,time,bet);
 const ctx=s.candyCtx;ctx.setTransform(2,0,0,2,0,0);ctx.clearRect(0,0,320,320);ctx.drawImage(sixArtBackdrop(10),0,0,320,320);
 const page=Math.floor(time/3500)%4,lines=[['1球ずつ抽選','番号HITでドロップが落下'],['役の色を全部消去！','直線 → △ → ⬡ で高配当'],['同じ役の成立で配当UP','消えた数でボーナスも育つ'],['全消しで総取り！','獲得後も継続・0 WINでリセット']][page];
 ctx.save();ctx.fillStyle='#12243cdd';ctx.beginPath();ctx.roundRect(18,65,284,190,18);ctx.fill();
 for(let i=0;i<4;i++){const c=R.palette(0)[i],pair=spriteMap[c];ctx.drawImage(nativeSprite(...pair),40+i*62,90+Math.sin(time/400+i)*8,48,48);}
 sixText(ctx,lines[0],160,177,page===3?18:20,'#fff2ad');sixText(ctx,lines[1],160,210,12,'#e6faff');ctx.restore();
};
const oldResult=renderRoundResult;
renderRoundResult=function(a){oldResult(a);if(!a.result)return;const row=$('result-games').querySelector('[data-game-index="'+id+'"]');if(!row)return;const detail=row.querySelector('.result-game-details');if(detail)detail.textContent='直線 '+e.lines+'回 ／ △ '+e.triangles+'回 ／ ⬡ '+e.hexagons+'回 ／ 全消し '+e.allClears+'回 ／ BONUS '+money(e.state?.bonusMedals)+' WIN'+(a.roundWins[id]>0?' ／ プログレッシブ継続':' ／ プログレッシブ0');};
window.addEventListener('sweets:payout-control-v3',event=>{
 const control=event.detail||{},value=control.sixDropV247;if(!value)return;
 if(carryPlayer===control.playerId&&Number(value.revision)<carryRevision)return;
 carryPlayer=control.playerId;carryRevision=Number(value.revision)||0;committed=R.cleanCarry(value);
 if(app.phase==='ready'){e.progressiveUnits=committed.bankUnits;e.removedTotal=committed.removed;e.feedRows=Math.floor(committed.feed*10/75);scheduleUI(app);}
});
window.SixDropV247={engine:e,rules:R,get carry(){return {...committed};}};
e.reset();ensureHud();carnivalHud(app);scheduleUI(app);
})();

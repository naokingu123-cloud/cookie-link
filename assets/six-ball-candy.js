/* Six Ball Candy. Original roulette-driven, finite 55-candy pyramid prototype.
 * Editing source; installer embeds it in index.html. No external art or runtime dependencies.
 * Grid coordinates: row r has r+1 slots; down-left=(r+1,c), down-right=(r+1,c+1).
 */
const SIX_ROWS=10;
const SIX_COLORS=[
 {name:'いちご',light:'#ffcbdc',color:'#f34c86',dark:'#a22353'},
 {name:'レモン',light:'#fff6b1',color:'#f6cc32',dark:'#aa741b'},
 {name:'ミント',light:'#cbffe4',color:'#44c695',dark:'#247e60'},
 {name:'ソーダ',light:'#d2f5ff',color:'#43bde8',dark:'#286ba9'},
 {name:'ぶどう',light:'#efdcff',color:'#b77bea',dark:'#71369d'}
];
const sixEmpty=()=>Array.from({length:SIX_ROWS},(_,r)=>Array(r+1).fill(null));
const sixClone=g=>g.map(row=>row.map(t=>t?{...t}:null));
const sixXY=(r,c)=>({x:160+(c-r/2)*28,y:43+r*24.2487113});
const sixKey=(r,c)=>r*10+c;
const SIX_PATTERNS=(()=>{
 const out=[],seen=new Set();
 function add(type,cells){
  if(cells.some(([r,c])=>r<0||r>=SIX_ROWS||c<0||c>r))return;
  const key=cells.map(([r,c])=>sixKey(r,c)).sort((a,b)=>a-b).join(',');if(seen.has(key))return;seen.add(key);out.push({type,cells,key});
 }
 for(let r=0;r<SIX_ROWS;r++)for(let c=0;c<=r;c++){
  add('triangle',[[r,c],[r+1,c],[r+1,c+1],[r+2,c],[r+2,c+1],[r+2,c+2]]);
  add('triangle',[[r,c],[r,c+1],[r,c+2],[r+1,c+1],[r+1,c+2],[r+2,c+2]]);
  add('hexagon',[[r-1,c-1],[r-1,c],[r,c+1],[r+1,c+1],[r+1,c],[r,c-1]]);
 }
 return out;
})();
function sixFindShapes(grid){
 const out=[];for(const p of SIX_PATTERNS){const t=grid[p.cells[0][0]]?.[p.cells[0][1]];if(t&&p.cells.every(([r,c])=>grid[r]?.[c]?.color===t.color))out.push({...p,color:t.color});}return out;
}
function sixDrop(grid){
 const paths=new Map();let moved=true,passes=0;
 while(moved){
  moved=false;if(++passes>100)throw Error('Pyramid gravity failed to settle');
  for(let r=SIX_ROWS-2;r>=0;r--){
   const cols=Array.from({length:r+1},(_,c)=>c);if(passes%2===0)cols.reverse();
   for(const c of cols){const t=grid[r][c];if(!t)continue;const options=[c,c+1].filter(n=>!grid[r+1][n]);if(!options.length)continue;
    const dest=options.length===1?options[0]:options[(t.id+r)%2];
    let path=paths.get(t.id);if(!path){path={id:t.id,tile:{...t},points:[[r,c]]};paths.set(t.id,path);}path.points.push([r+1,dest]);
    grid[r+1][dest]=t;grid[r][c]=null;moved=true;
   }
  }
 }
 return [...paths.values()];
}
function sixPlan(input,numbers,{trace=false}={}){
 const grid=sixClone(input),timeline=[],hit=[],used=new Set(numbers);let triangles=0,hexagons=0,chain=0,gain=0,removedCount=0;
 const snapshot=()=>sixClone(grid);
 const push=(phase,detail={},ms=400)=>{if(trace)timeline.push({phase,...detail,grid:snapshot(),ms});};
 const remove=cells=>{const removed=[];for(const [r,c] of cells){const t=grid[r]?.[c];if(t){removed.push({r,c,tile:{...t}});grid[r][c]=null;}}removedCount+=removed.length;return removed;};
 const drop=()=>{const moves=sixDrop(grid);if(moves.length)push('pyramidFall',{moves},motionReduced?80:Math.min(720,330+Math.max(...moves.map(m=>m.points.length-1))*46));};
 for(let r=0;r<SIX_ROWS;r++)for(let c=0;c<=r;c++)if(grid[r][c]&&used.has(grid[r][c].number))hit.push([r,c]);
 if(!hit.length){push('pyramidMiss',{},320);return {grid,timeline,gain,triangles,hexagons,chain,removedCount,hit:0,cleared:false};}
 push('pyramidHit',{cells:hit},340);const broken=remove(hit);push('pyramidBreak',{removed:broken},330);drop();
 for(;;){
  const forms=sixFindShapes(grid);if(!forms.length)break;
  if(++chain>9)throw Error('Pyramid cascade exceeded finite candy bound');
  const nt=forms.filter(f=>f.type==='triangle').length,nh=forms.length-nt,multiplier=Math.min(5,1+(chain-1)*.5),award=Math.round((nt*50+nh*200)*multiplier);
  const union=[...new Map(forms.flatMap(f=>f.cells).map(cell=>[sixKey(...cell),cell])).values()];
  push('pyramidShape',{forms,chain,multiplier},600);
  const removed=remove(union);triangles+=nt;hexagons+=nh;gain+=award;
  push('pyramidAward',{forms,chain,multiplier,gain:award,triangles:nt,hexagons:nh,removed},award>=1000?1750:award>=300?1450:1150);
  drop();
 }
 return {grid,timeline,gain,triangles,hexagons,chain,removedCount,hit:hit.length,cleared:grid.every(row=>row.every(t=>!t))};
}
class SixBallCandyEngine extends Engine{
 reset(){
  this.kind='candy';this.gameName='シックスボールキャンディ';this.drawMode='single';this.reachMode='single';
  this.version++;this.presentationRate=1;this.roundBet=this.roundBet||3000;
  this.queue=[];this.pendingDraws=new Set();this.seen=new Set();this.drawn=new Set();this.history=[];
  this.accepted=0;this.processed=0;this.busy=false;this.running=false;this.opening=false;this.paused=false;
  this.totalHundredths=0;this.maxLink=0;this.maxChain=0;this.lastChain=0;this.allClears=0;this.roundSteps=0;this.roundHammers=0;this.roundCleared=0;
  this.wonderCollected=false;this.wonderIssued=false;this.wonderToken=null;this.wonderColumn=0;this.pendingSugarAward=[];
  this.basketState=Array.from({length:SIZE},()=>({goal:10,remaining:10,weight:0,pending:[]}));this.hammerQueue=[];this.hammerPreview=Array.from({length:65},()=>[]);this.hammerPreviewVersion=0;
  // Shared cookie-only helpers keep an empty rectangular compatibility board.
  this.board=Array.from({length:SIZE},()=>Array(SIZE).fill(null));this.pyramid=sixEmpty();this.initialPyramid=null;
  this.triangles=0;this.hexagons=0;this.shapes=0;this.bestCascade=0;this.cascade=0;this.removedCandies=0;this.remainingCandies=55;this.pyramidCleared=false;this.lastGain=0;this.lastNumber=0;this.fx=null;
  this.candyMessage='10段55個のキャンディから 図形をつくろう！';this.emit('ready');
 }
 makePyramid(){
  const g=sixEmpty(),pool=Array.from({length:55},(_,i)=>i%25+1),colorCount=Math.max(3,Math.min(5,this.colorCount||5));
  for(let i=pool.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
  let at=0;
  for(let r=0;r<SIX_ROWS;r++)for(let c=0;c<=r;c++){
   const neighbors=[[r,c-1],[r-1,c-1],[r-1,c]].map(([y,x])=>g[y]?.[x]).filter(Boolean),prefer=neighbors.length&&this.random()<.72?neighbors[Math.floor(this.random()*neighbors.length)].color:Math.floor(this.random()*colorCount);
   const tile={id:++this.uid,color:prefer,number:pool[at++]};g[r][c]=tile;
   // Seed near-matches without an already completed payable shape before the first HIT.
   const choices=[prefer,...Array.from({length:colorCount},(_,i)=>i).filter(n=>n!==prefer)];let ok=false;
   for(const color of choices){tile.color=color;if(!sixFindShapes(g).length){ok=true;break;}}
   if(!ok){for(let y=0;y<=r;y++)for(let x=0;x<=y;x++)if(g[y][x])g[y][x].color=(x+2*y)%colorCount;}
  }
  if(sixFindShapes(g).length)throw Error('Initial pyramid contains completed shapes');return g;
 }
 start(){
  if(this.running||this.roundBet<=0)return;this.pyramid=this.makePyramid();this.initialPyramid=sixClone(this.pyramid);this.running=true;this.opening=false;this.busy=false;
  this.remainingCandies=55;this.candyMessage='入賞番号が消える → 落下して図形を作ろう！';this.emit('waiting');
 }
 reachSnapshot(){
  return Object.assign(Object.create(SixBallCandyEngine.prototype),{pyramid:sixClone(this.pyramid),drawn:new Set(this.drawn),totalHundredths:this.totalHundredths,initialPyramid:!!this.initialPyramid});
 }
 predict(number){
  if(!this.initialPyramid||this.drawn.has(number))return null;const p=sixPlan(this.pyramid,[number]);
  return {number,total:this.totalHundredths+p.gain,gain:p.gain,maxLink:0,chain:p.chain,allClear:p.cleared,tier:reachTier(this.totalHundredths+p.gain,p.cleared),triangles:p.triangles,hexagons:p.hexagons};
 }
 async drain(){
  if(this.busy)return;const token=this.version;this.busy=true;
  try{
   while(this.queue.length&&token===this.version){
    const numbers=this.queue.shift();for(const n of numbers){this.pendingDraws.delete(n);this.drawn.add(n);}this.lastNumber=numbers.at(-1);this.cascade=0;this.lastGain=0;
    const plan=sixPlan(this.pyramid,numbers,{trace:true});
    for(const stage of plan.timeline){
     if(token!==this.version)return;this.pyramid=sixClone(stage.grid);this.remainingCandies=this.pyramid.flat().filter(Boolean).length;
     this.fx={...stage,elapsed:0,stamp:null};this.cascade=stage.chain||this.cascade;
     if(stage.phase==='pyramidHit')this.candyMessage=numbers.join('・')+'番 HIT！ 同じ番号のキャンディが消える！';
     if(stage.phase==='pyramidMiss')this.candyMessage=numbers.join('・')+'番は消去済み・次の番号を待とう';
     if(stage.phase==='pyramidFall')this.candyMessage='空いたところへ キャンディがころころ落下！';
     if(stage.phase==='pyramidShape')this.candyMessage=(stage.forms.some(f=>f.type==='hexagon')?'HEXAGON':'TRIANGLE')+'！ '+stage.chain+'連鎖';
     if(stage.phase==='pyramidAward'){
      this.totalHundredths+=stage.gain;this.lastGain=stage.gain;this.triangles+=stage.triangles;this.hexagons+=stage.hexagons;this.shapes=this.triangles+this.hexagons;this.bestCascade=Math.max(this.bestCascade,stage.chain);
      this.candyMessage=stage.chain+'連鎖！ 図形消去 → さらに落下';
     }
     this.emit(stage.phase,{numbers,...stage});if(!await this.wait(stage.ms*this.speed,token))return;
    }
    this.pyramid=sixClone(plan.grid);this.remainingCandies=this.pyramid.flat().filter(Boolean).length;this.removedCandies+=plan.removedCount;this.pyramidCleared=plan.cleared;
    this.processed+=numbers.length;this.fx=null;this.candyMessage=plan.cleared?'PYRAMID CLEAR！ 全てのキャンディを消した！':'残り '+this.remainingCandies+'個・次の番号で図形をねらおう';
    this.emit('settled',{numbers,candy:true,batchShapes:plan.triangles+plan.hexagons,batchChain:plan.chain,batchGain:plan.gain});
    if(!await this.wait(200*this.speed,token))return;
   }
   if(token!==this.version)return;this.busy=false;
   if(this.processed===8){
    if(this.hexagons>0&&!this.wonderCollected){
     this.wonderCollected=true;this.wonderIssued=true;this.roundSteps=1;this.wonderToken={id:'six-ball-'+this.version,value:this.roundBet,tier:wonderTier(this.roundBet)};
     this.emit('stepcollect',{steps:[this.wonderToken]});this.emit('sugaraward',{steps:[this.wonderToken]});if(!await this.wait(SUGAR_GET_WAIT*this.speed*(this.presentationRate||1),token))return;
    }
    this.running=false;this.candyMessage='TRIANGLE '+this.triangles+' / HEXAGON '+this.hexagons+'・最大'+this.bestCascade+'連鎖';this.emit('complete');
   }else this.emit('waiting');
  }catch(error){if(token===this.version){this.busy=false;this.running=false;this.emit('error',{message:error.message});}}
 }
}
// Preserve host integration entry points; the old bottle game is not instantiated.
const CandyCarnivalEngine=SixBallCandyEngine;
const sixSprites=new Map();
function sixCandySprite(color){
 if(sixSprites.has(color))return sixSprites.get(color);const p=SIX_COLORS[color],cv=document.createElement('canvas');cv.width=96;cv.height=96;const x=cv.getContext('2d');
 const g=x.createRadialGradient(30,22,2,49,50,46);g.addColorStop(0,p.light);g.addColorStop(.34,p.color);g.addColorStop(1,p.dark);x.fillStyle=g;x.beginPath();x.arc(48,47,43,0,Math.PI*2);x.fill();x.strokeStyle=p.dark;x.lineWidth=3;x.stroke();
 x.save();x.clip();x.strokeStyle='#fff8e66e';x.lineWidth=7;
 if(color%3===0){x.beginPath();for(let i=0;i<100;i++){const a=i*.19,r=i*.48;i?x.lineTo(48+Math.cos(a)*r,47+Math.sin(a)*r):x.moveTo(48,47);}x.stroke();}
 else if(color%3===1){for(let k=-60;k<140;k+=22){x.beginPath();x.moveTo(k,0);x.lineTo(k+90,96);x.stroke();}}
 else{for(const r of [17,31,41]){x.beginPath();x.arc(48,47,r,0,7);x.stroke();}}
 x.restore();x.fillStyle='#fff9e9bf';x.beginPath();x.ellipse(31,20,16,7,-.4,0,7);x.fill();x.strokeStyle='#fff8daaa';x.lineWidth=1.5;x.beginPath();x.arc(48,47,40,-2.9,-.6);x.stroke();sixSprites.set(color,cv);return cv;
}
function sixText(x,text,px,py,size,color='#fff1d6',align='center'){
 x.font='900 '+size+'px system-ui,sans-serif';x.textAlign=align;x.textBaseline='middle';x.lineJoin='round';x.strokeStyle='#46294c';x.lineWidth=Math.max(1.2,size*.2);x.strokeText(text,px,py);x.fillStyle=color;x.fillText(text,px,py);
}
function sixHull(points){
 const list=points.map(p=>({...p})).sort((a,b)=>a.x-b.x||a.y-b.y),cross=(o,a,b)=>(a.x-o.x)*(b.y-o.y)-(a.y-o.y)*(b.x-o.x);if(list.length<3)return list;
 const low=[],high=[];for(const p of list){while(low.length>1&&cross(low.at(-2),low.at(-1),p)<=0)low.pop();low.push(p);}for(const p of [...list].reverse()){while(high.length>1&&cross(high.at(-2),high.at(-1),p)<=0)high.pop();high.push(p);}return low.slice(0,-1).concat(high.slice(0,-1));
}
function sixShapeIcon(type){
 const cells=type==='hexagon'?[[0,0],[0,1],[1,2],[2,2],[2,1],[1,0]]:[[0,1],[1,1],[1,2],[2,1],[2,2],[2,3]];
 return '<svg viewBox="0 0 64 52" aria-hidden="true">'+cells.map(([r,c])=>'<circle cx="'+(12+(c-r/2)*16)+'" cy="'+(9+r*15)+'" r="7" fill="'+(type==='hexagon'?'#aa73e8':'#ee749d')+'" stroke="#fff4cd" stroke-width="2"/>').join('')+'</svg>';
}
function setupCarnivalSlot(s){
 if(s.candyCanvas)return;s.panel.classList.add('carnival-panel','six-ball-panel');s.tab.classList.add('carnival-tab');s.holder.classList.add('carnival-slot');
 s.tab.querySelector('.tab-game-name').innerHTML='<span class="carnival-tab-title">シックスボールキャンディ<small>SIX BALL CANDY</small></span>';s.tab.querySelector('.tab-game-name').setAttribute('aria-label','シックスボールキャンディ');
 const wrap=document.createElement('div');wrap.className='carnival-surface six-ball-surface';wrap.innerHTML='<div class="carnival-topline"><span>SIX BALL CANDY</span><b>10段・55 CANDIES</b></div><canvas class="carnival-canvas" width="640" height="640" role="img" aria-label="10段55個のキャンディピラミッド"></canvas><div class="carnival-status" role="status"></div><div class="carnival-reward" role="status" hidden></div>';
 s.panel.append(wrap);s.candyCanvas=wrap.querySelector('canvas');s.candyCtx=s.candyCanvas.getContext('2d');s.candyStatus=wrap.querySelector('.carnival-status');s.candyReward=wrap.querySelector('.carnival-reward');
 const heading=document.createElement('div');heading.id='carnival-heading';heading.innerHTML='<strong>シックスボールキャンディ<small>ころがる、そろう、図形がつながる。</small></strong><span>SHAPES <b id="carnival-complete">0</b></span>';document.querySelector('.festival-top').append(heading);
 const odds=document.createElement('div');odds.id='carnival-odds';odds.innerHTML='<div class="carnival-odds-title">SIX BALL REWARDS<small>試作版・仮配当</small></div><section><span>今回の獲得</span><b id="carnival-win">0</b><em>WIN</em></section><div class="six-shape-guide">'+sixShapeIcon('triangle')+'<span>トライアングル<small>同色6個・BET ×0.5</small></span></div><div class="six-shape-guide">'+sixShapeIcon('hexagon')+'<span>ヘキサゴン<small>同色6個の輪・BET ×2</small></span></div><div class="six-chain-guide">図形連鎖<br>×1 → ×1.5 → ×2…<br><small>最大×5・同時図形は合算</small></div><div class="carnival-sugar-goal">ヘキサゴン完成で<br><b>シュガーGET</b></div><p>番号HIT → 消去・落下<br>図形が完成 → 配当・消去<br>さらに落下して連鎖！</p><footer>途中補充なし・毎ゲーム55個<br>0 BETは参加なし</footer>';$('odds-panel').append(odds);
}
function carnivalEvent(s,ev,e,a){
 setupCarnivalSlot(s);s.event=ev;s.dirtyMain=true;s.dirtyMini=true;
 if(['ready','error'].includes(ev.phase)){stopSugarAward(s);clearMiniResult(s);s.candyReward.hidden=true;if(s.candyFrame)cancelAnimationFrame(s.candyFrame);s.candyFrame=0;s.candyLastDraw=0;invalidateReach(s);}
 if(ev.phase==='sugaraward')showSugarAward(s,ev.steps);
 if(ev.phase.startsWith('pyramid')){s.candyReward.hidden=true;invalidateReach(s);}
 if(ev.phase==='pyramidAward'){
  const gain=ev.gain||0;s.candyReward.hidden=!gain;s.candyReward.dataset.tier=gain>=1000?'2':gain>=300?'1':'0';
  if(gain){const title=(ev.hexagons?'HEXAGON':'TRIANGLE')+(ev.triangles&&ev.hexagons?' + TRIANGLE':'');s.candyReward.innerHTML='<small>'+title+' · '+ev.chain+' CHAIN</small><strong>＋'+num(medalWin(a.bet(s.i),gain))+' <em>WIN</em></strong><span>'+num(gain/100)+' × BET</span>';if(s.i===active)sound('confirm',{volume:1});}
 }
 if(['pyramidBreak','pyramidAward'].includes(ev.phase)&&s.i===active)sound('crack',{volume:.75});
 if(ev.phase==='pyramidShape'&&s.i===active)sound('magic',{volume:.6});
 if(ev.phase==='settled'){
  s.candyReward.hidden=true;clearMiniResult(s);
  if(ev.batchShapes>0){s.miniLastResult=ev.batchShapes+' SHAPES · '+ev.batchChain+'連鎖';s.miniResult.innerHTML='<strong>'+ev.batchShapes+' SHAPES</strong><small>'+ev.batchChain+'連鎖</small>';s.miniResult.setAttribute('aria-label',s.miniLastResult);s.miniResultState={remaining:MINI_RESULT_MS,stamp:null,version:e.version};}
 }
 if(['waiting','settled','complete'].includes(ev.phase))requestReach(s,e,a);
 s.message=e.candyMessage;carnivalQueueFrame(s);scheduleUI(a);
}
function carnivalQueueFrame(s){
 if(s.candyFrame||document.hidden||!inView)return;const version=s.engine.version;
 s.candyFrame=requestAnimationFrame(now=>{s.candyFrame=0;if(s.engine.version!==version)return;if(s.candyLastDraw&&now-s.candyLastDraw<32){carnivalQueueFrame(s);return;}s.candyLastDraw=now;drawCarnival(s,now);});
}
const SIX_DEMO=Array.from({length:SIX_ROWS},(_,r)=>Array.from({length:r+1},(_,c)=>({id:r*10+c+1,number:0,color:(r+Math.floor(c/2))%5})));
function drawCarnival(s,now=performance.now()){
 if(s.engine?.kind!=='candy')return;setupCarnivalSlot(s);const e=s.engine,x=s.candyCtx,paused=!app||app.paused||document.hidden||!inView,bet=app?.bet(s.i)||0,ready=app?.phase==='ready';
 if(!paused)s.candyTime=now;const time=s.candyTime||now,grid=ready?SIX_DEMO:e.pyramid,fx=e.fx;x.setTransform(2,0,0,2,0,0);x.clearRect(0,0,320,320);
 const bg=x.createLinearGradient(0,0,320,320);bg.addColorStop(0,'#342549');bg.addColorStop(.55,'#593954');bg.addColorStop(1,'#273b55');x.fillStyle=bg;x.fillRect(0,0,320,320);
 // Confectionery display case: quiet background so 55 small numerals remain legible.
 x.strokeStyle='#eec7a02b';x.lineWidth=1;for(let r=0;r<10;r++){const a=sixXY(r,0),b=sixXY(r,r);x.beginPath();x.moveTo(a.x-16,a.y+13);x.lineTo(b.x+16,b.y+13);x.stroke();}
 x.fillStyle='#f6d9af';x.beginPath();x.roundRect(15,278,290,9,4);x.fill();x.fillStyle='#ac6c53';x.fillRect(21,287,278,5);
 for(let i=0;i<11;i++){x.fillStyle=i%2?'#d287a8':'#ffdfac';x.beginPath();x.arc(20+i*28,6,13,0,Math.PI);x.fill();}
 const progress=fx?(()=>{if(!paused){if(fx.stamp!==null)fx.elapsed+=Math.max(0,now-fx.stamp)*(e.presentationRate||1);fx.stamp=now;}else fx.stamp=null;return Math.min(1,fx.elapsed/Math.max(1,fx.ms));})():0;
 const moving=new Map((fx?.phase==='pyramidFall'?fx.moves:[]).map(m=>[m.id,m]));
 const lit=new Set((fx?.phase==='pyramidHit'?fx.cells:[]).map(v=>sixKey(...v)));
 const shaped=new Set((fx?.forms||[]).flatMap(f=>f.cells).map(v=>sixKey(...v)));
 const reaches=ready?[]:visibleReachResults(s,app),byNumber=new Map(reaches.map(p=>[p.number,p]));
 for(let r=0;r<grid.length;r++)for(let c=0;c<grid[r].length;c++){
  const t=grid[r][c];if(!t)continue;let pos=sixXY(r,c);const m=moving.get(t.id);
  if(m&&!motionReduced){const z=Math.min(m.points.length-1,progress*(m.points.length-1)),at=Math.min(m.points.length-2,Math.floor(z)),v=z-at,a=sixXY(...m.points[at]),b=sixXY(...m.points[at+1]);pos={x:a.x+(b.x-a.x)*v,y:a.y+(b.y-a.y)*v-2*Math.sin(Math.PI*v)};}
  const pending=e.pendingDraws.has(t.number)||lit.has(sixKey(r,c)),reach=byNumber.get(t.number),shape=shaped.has(sixKey(r,c));
  x.save();if(!ready&&pending)x.globalAlpha=motionReduced?1:.55+.45*(.5+.5*Math.sin(time/115));
  if(shape||reach){x.shadowBlur=shape?12:6;x.shadowColor=shape?'#ffe39a':reach.tier>=2?'#eb93ff':'#fff3b6';}
  x.drawImage(sixCandySprite(t.color),pos.x-13.6,pos.y-13.6,27.2,27.2);x.shadowBlur=0;
  if(!ready){x.fillStyle='#442141b8';x.beginPath();x.ellipse(pos.x,pos.y+1,t.number>=10?10:7.5,7.7,0,0,7);x.fill();sixText(x,String(t.number),pos.x,pos.y+1,11.2,'#fffdf4');}
  if(shape||pending||reach){x.strokeStyle=shape?'#fff6b3':pending?'#fff9e7':reach.tier>=2?'#f0a2ff':'#fff3b6';x.lineWidth=shape?2.3:1.5;x.beginPath();x.arc(pos.x,pos.y,14,0,Math.PI*2);x.stroke();}x.restore();
 }
 if(fx?.phase==='pyramidShape'){
  for(const form of fx.forms){const hull=sixHull(form.cells.map(v=>sixXY(...v)));x.save();x.strokeStyle=form.type==='hexagon'?'#f3beff':'#ffec98';x.fillStyle=form.type==='hexagon'?'#be7bff28':'#ffe06c28';x.shadowColor=x.strokeStyle;x.shadowBlur=12;x.lineWidth=3;x.beginPath();hull.forEach((p,i)=>i?x.lineTo(p.x,p.y):x.moveTo(p.x,p.y));x.closePath();x.fill();x.stroke();x.restore();}
  sixText(x,(fx.forms.some(f=>f.type==='hexagon')?'HEXAGON':'TRIANGLE')+'  '+fx.chain+' CHAIN',160,23,12);
 }else sixText(x,ready?'同色6個で TRIANGLE / HEXAGON':e.bestCascade?'BEST '+e.bestCascade+' CHAIN':'SWEET SHAPE PUZZLE',160,23,9.5,'#ffe9c3');
 if(fx?.removed&&progress<.75&&!motionReduced){const t=Math.min(1,progress/.75);x.save();x.globalAlpha=1-t;for(const v of fx.removed){const p=sixXY(v.r,v.c);for(let k=0;k<4;k++){const a=v.tile.id*.7+k*Math.PI/2;x.save();x.translate(p.x+Math.cos(a)*t*24,p.y+Math.sin(a)*t*20+t*t*19);x.rotate(a+t*2);x.fillStyle=SIX_COLORS[v.tile.color].light;x.beginPath();x.moveTo(-3,-4);x.lineTo(5,-2);x.lineTo(2,5);x.lineTo(-4,2);x.closePath();x.fill();x.restore();}}x.restore();}
 sixText(x,'△ '+e.triangles+'   ⬡ '+e.hexagons,16,307,11,'#ffdfb1','left');sixText(x,'残り '+(ready?55:e.remainingCandies)+' / 55',304,307,10,'#e3d9ff','right');
 if(!bet){x.fillStyle='#231b3ba8';x.fillRect(0,0,320,320);sixText(x,'0 BET',160,140,29);sixText(x,'BETして キャンディを落とそう',160,172,11);}
 s.miniCanvas.hidden=false;s.miniLogo.hidden=true;s.mini.setTransform(1,0,0,1,0,0);s.mini.clearRect(0,0,160,160);s.mini.drawImage(s.candyCanvas,0,0,160,160);
 s.candyCanvas.setAttribute('aria-label','シックスボールキャンディ・'+(ready?'10段55個のピラミッド':e.remainingCandies+'個残り、トライアングル'+e.triangles+'個、ヘキサゴン'+e.hexagons+'個、最大'+e.bestCascade+'連鎖'));
 s.candyStatus.textContent=!bet?'0 BET・このゲームは参加しません':ready?'番号HIT → 落下 → 図形完成で配当！':e.candyMessage;
 if((fx||e.pendingDraws.size)&&!paused&&!jpcSession.active)carnivalQueueFrame(s);
}
function carnivalHud(a){
 const s=slots[2],e=s.engine;if(e?.kind!=='candy')return;const selected=active===2;document.body.classList.toggle('carnival-active',selected);
 s.tab.setAttribute('aria-label','シックスボールキャンディ・図形'+e.shapes+'個・'+a.bet(2)+' BET');s.miniCanvas.hidden=false;s.miniLogo.hidden=true;
 if(selected){put('carnival-complete',e.shapes);fitGoldenNumber($('carnival-win'),num(medalWin(a.bet(2),e.totalHundredths)),23,80);}
 const key=[e.version,e.phase,e.processed,e.remainingCandies,e.totalHundredths,a.bet(2),s.reachEpoch,s.reachStatus,a.paused,e.pendingDraws.size].join('/');if(s.candyKey!==key){s.candyKey=key;carnivalQueueFrame(s);}
}

/* Illustrated awards and illuminated winning paths. This observer never
 * changes a draw, game clock, engine result, payout or gameplay RNG. */
(()=>{
'use strict';
if(window.SweetsAwardsV277)return;
const query=new URLSearchParams(location.search);
if(query.get('serverSettlementWorker')==='1'||query.get('downloadWorker')==='1')return;
const GAMES=['cookie','choco','candy','gelato','winery','popcorn','jelly','stick','castella','dango'];
const TIER_ART=['','award-normal','award-high','award-super','award-highest'];
const BADGE_THEMES=Object.freeze({
 cookie:{edge:'#b77839',core:'#fff1b9',mid:'#e2aa5d',glow:'#ffe088',shape:'scallop',frame:true},
 choco:{edge:'#7d3f39',core:'#f7bf97',mid:'#ad6454',glow:'#ffd39b',shape:'melt',frame:true},
 candy:{edge:'#5187bc',core:'#ecffff',mid:'#6fe2d8',glow:'#a9fbff',shape:'hex',frame:true},
 gelato:{edge:'#6488ca',core:'#f5ffff',mid:'#9bd7f5',glow:'#b7e6ff',shape:'diamond',frame:true},
 winery:{edge:'#a671c5',core:'#fff4ff',mid:'#d8a8ee',glow:'#eecbff',shape:'wine',frame:false},
 popcorn:{edge:'#b76534',core:'#fff7c4',mid:'#f7cb58',glow:'#ffe08a',shape:'burst',frame:true},
 jelly:{edge:'#4ba6a2',core:'#f1fff3',mid:'#81e8d5',glow:'#affff2',shape:'bubble',frame:true},
 stick:{edge:'#aa6334',core:'#fff2b6',mid:'#d99d61',glow:'#ffe1a6',shape:'waffle',frame:true},
 castella:{edge:'#aa6136',core:'#fff3be',mid:'#df9b50',glow:'#ffd598',shape:'loaf',frame:true},
 dango:{edge:'#c47fa4',core:'#fffaf2',mid:'#f1accd',glow:'#ffe0f2',shape:'mochi',frame:false}
});

const DURATIONS=[0,1800,2200,2600,3100],MAX_PENDING=4,MAX_MAIN_PATHS=12,MAX_MINI_PATHS=4;
const records=new Map(),attached=new WeakSet(),history=[],eventCounts={};
const stats={received:0,suppressed:0,errors:0,renderFrames:0,mainImages:0,miniImages:0,maxPending:0,maxMainPaths:0,maxMiniPaths:0,maxMainParticles:0,maxMiniParticles:0};
const reducedMedia=matchMedia('(prefers-reduced-motion: reduce)');
let frame=0,timer=0,lastStamp=0,miniStamp=-Infinity,serial=0;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const quiet=()=>!!(reducedMedia.matches||(typeof motionReduced!=='undefined'&&motionReduced));
const visiblePhase=()=>['playing','result','paying','complete'].includes(app.phase);
const kindOf=(slot,e=slot.engine)=>e?.kind||window.SweetsLineup?.ids?.[slot.i]||'cookie';
const ids=values=>(values||[]).map(id=>({id:Number(id)})).filter(p=>Number.isInteger(p.id)&&p.id>=0);
const rc=value=>Array.isArray(value)?{r:value[0],c:value[1]}:Number.isFinite(value?.r)&&Number.isFinite(value?.c)?{r:value.r,c:value.c}:null;
const sparse=(values,max)=>values.length<=max?values.slice():Array.from({length:max},(_,i)=>values[Math.round(i*(values.length-1)/(max-1))]);
const cellPaths=anchors=>anchors.map(p=>({anchors:[p],cell:true,closed:true}));
const groupPath=(anchors,closed=false,hull=false)=>({anchors,closed,hull});
const amount=(slot,value)=>typeof medalWin==='function'?medalWin(Number(app.locked?.[slot.i]||slot.engine.roundBet||0),Math.max(0,Number(value)||0)):Math.floor(Number(app.locked?.[slot.i]||slot.engine.roundBet||0)*Math.max(0,Number(value)||0)/100);
const tierFor=(hundredths,highest=false)=>highest?4:hundredths>=1000?3:hundredths>=300?2:1;
const pretty=n=>Number(n).toLocaleString('ja-JP');
function target(slot,mini){
 const kind=kindOf(slot);
 if(mini)return kind==='gelato'?slot.tab.querySelector('.gp-raster-board'):slot.miniCanvas;
 return kind==='cookie'?slot.board:kind==='choco'?slot.chocoCanvas:kind==='candy'?slot.candyCanvas:
  slot.panel.querySelector({gelato:'.gp-raster-board',winery:'.wp-canvas',popcorn:'.pc-scene',jelly:'.jb-scene',stick:'.bs-grid canvas',castella:'.pct-pan>canvas',dango:'.dgb-pan>canvas'}[kind]||'canvas');
}
function project(slot,p,width,height,mini,state){
 const kind=kindOf(slot);
 if(kind==='cookie')return {x:(p.c+.5)/8*width,y:(p.r+.5)/8*height,r:Math.min(width,height)/8*.46};
 if(kind==='choco'){
  if(mini){const u=Math.min(width/7,height/12);return {x:(width-u*7)/2+(p.c+.5)*u,y:(height-u*12)/2+(p.r+.5)*u,r:u*.47};}
  const h=430*height/width,L=chocoBoardLayout(430,h);return {x:(L.left+(p.c+.5)*L.w)/430*width,y:(L.top+(p.r+.5)*L.h)/h*height,r:L.w/430*width*.47};
 }
 if(kind==='candy'){
  const rows=state?.awardRows||slot.engine.rows||10,L=sixLayout(rows),a=sixXY(p.r,p.c,rows);
  if(mini){const first=sixXY(0,0,rows),last=sixXY(rows-1,0,rows),w=Math.max(sixRowWidth(0,rows),sixRowWidth(1,rows))*L.step,h=last.y-first.y+L.radius*2,k=Math.min(width/w,height/h);return {x:width/2+(a.x-160)*k,y:(height-h*k)/2+(a.y-first.y+L.radius)*k,r:L.radius*k};}
  return {x:a.x/320*width,y:a.y/320*height,r:L.radius*Math.min(width,height)/320};
 }
 const view={gelato:window.GelatoPrism,winery:window.WineryPyramid,popcorn:window.PopcornView,jelly:window.JellyView}[kind];
 if(view?.hitGeometryV276)return view.hitGeometryV276(width,height,mini,p);
 if(kind==='stick'){const side=Math.min(width,height),rim=side*.064,u=(side-2*rim)/8;return {x:(width-side)/2+rim+(p.id%8+.5)*u,y:(height-side)/2+rim+(Math.floor(p.id/8)+.5)*u,r:u*.46};}
 if(kind==='castella'){const cell=state?.cells?.[p.id];if(!cell)return null;const g=window.PartyCastellaView.geometry(state),u=Math.min(width/g.panW,height/g.panH);return {x:width/2+cell.x*u,y:height/2+cell.y*u,r:u*.42};}
 if(kind==='dango'){const g=window.DangoBingoView.geometry(width,height,{layout:mini?'compact':'main',state}),a=g.centers[p.id];return a?{x:a.x,y:a.y,r:g.radius*.9}:null;}
 return null;
}
function convexHull(points){
 if(points.length<4)return points;
 const sorted=points.slice().sort((a,b)=>a.x-b.x||a.y-b.y),cross=(o,a,b)=>(a.x-o.x)*(b.y-o.y)-(a.y-o.y)*(b.x-o.x),low=[],high=[];
 for(const p of sorted){while(low.length>1&&cross(low.at(-2),low.at(-1),p)<=0)low.pop();low.push(p);}
 for(const p of sorted.slice().reverse()){while(high.length>1&&cross(high.at(-2),high.at(-1),p)<=0)high.pop();high.push(p);}
 return low.slice(0,-1).concat(high.slice(0,-1));
}
function projectedPath(slot,path,w,h,mini,state){
 let points=path.anchors.map(a=>project(slot,a,w,h,mini,state)).filter(p=>p&&Number.isFinite(p.x+p.y+p.r));
 if(path.cell&&points[0]){const p=points[0],count=kindOf(slot)==='stick'?4:8,rotation=count===4?Math.PI/4:0;points=Array.from({length:count},(_,i)=>({x:p.x+Math.cos(i*Math.PI*2/count+rotation)*p.r,y:p.y+Math.sin(i*Math.PI*2/count+rotation)*p.r,r:p.r}));}
 else if(path.hull)points=convexHull(points);
 return points;
}
function geometry(slot,path,mini,state){const t=target(slot,mini);return t?projectedPath(slot,path,t.clientWidth||t.width||320,t.clientHeight||t.height||320,mini,state):[];}
function semantic(slot,ev,r){
 const e=slot.engine,s=e.state,game=kindOf(slot),phase=ev.phase;
 let kind='bonus',label='',detail='',gain=0,total=false,highest=false,paths=[],delay=0,retained=false;
 const number=ev.number??ev.numbers?.at(-1)??s?.draws?.at(-1)??e.lastNumber??null;
 if(game==='cookie'){
  if(phase==='link'&&(ev.gain>0||ev.newRecord)){
   kind='shape';label=e.maxLink+' LINK!';detail=(ev.depth||1)+'連鎖'+(ev.newRecord?' ・ 最大LINK更新':'');gain=e.totalHundredths;total=true;
   paths=(ev.groups||[]).filter(g=>g.cells?.length).slice(0,6).map(g=>groupPath(g.cells.map(rc).filter(Boolean),true,true));
  }else if(phase==='allclear'){kind='clear';label='ALL CLEAR!';detail='クッキー 全消し';gain=e.totalHundredths;total=true;highest=true;}
  else return null;
 }else if(game==='choco'){
  if(phase==='canyonMelt'){r.bonusCells=(ev.targets||[]).filter(v=>v.tile?.item==='fruit').map(rc).filter(Boolean);return null;}
  if(phase==='canyonCollect'&&ev.gain>0){label='TREASURE GET!';detail='鉱石の配当を獲得';gain=ev.gain;paths=cellPaths((ev.items||[]).filter(v=>v.gain>0).map(rc).filter(Boolean));}
  else if(phase==='canyonBonus'&&ev.gain>0){label='CAKE BONUS!';detail=typeof CHOCO_BONUS_NAMES!=='undefined'?(CHOCO_BONUS_NAMES[ev.bonusKinds?.[0]]||'ケーキ')+'ボーナス':'ケーキボーナス';gain=ev.gain;paths=cellPaths(r.bonusCells||[]);}
  else return null;
 }else if(game==='candy'){
  if(phase==='pyramidAward'&&ev.forms?.length){
   const forms=ev.forms,hex=forms.filter(f=>f.type==='hexagon').length,tri=forms.filter(f=>f.type==='triangle').length,lines=forms.filter(f=>f.type==='line').length;
   kind='shape';label=hex?'HEXAGON!':tri?'TRIANGLE!':lines+' LINE!';detail=[hex?'六角形 ×'+hex:'',tri?'三角形 ×'+tri:'',lines?'直線 ×'+lines:''].filter(Boolean).join(' ・ ');
   // The progressive engine owns cumulative role values and medal rounding.
   // Its preceding shape event only identifies geometry, before the award is
   // booked; use the actual award event rather than the legacy fixed SIX_PAY.
   gain=ev.gain;
   paths=forms.map(f=>groupPath(f.cells.map(rc).filter(Boolean),f.type!=='line',f.type!=='line'));
  }else if(phase==='pyramidAllClear'){kind='clear';label='ALL CLEAR!';detail='シックスドロップ 全消し';gain=ev.gain;highest=true;}
  else if(phase==='pyramidRoundBonus'&&ev.gain>0){label='ROUND '+ev.roundIndex+' CLEAR!';detail=ev.nextRound?'次は ROUND '+ev.nextRound:'全ラウンド突破';gain=ev.gain;}
  else return null;
 }else if(game==='gelato'){
  if(phase!=='gelatoFill'||!ev.newFaces?.length)return null;
  kind=ev.full?'clear':'shape';label=ev.full?'ALL COMPLETE!':'TRIANGLE GET!';detail=ev.full?'24パネル 全埋め':e.filled.size+' / 24パネル 完成';gain=ev.gain;highest=!!ev.full;retained=true;
  paths=ev.newFaces.map(id=>groupPath(ids(window.GelatoPrism.awardFaceNodesV277(id)),true));
 }else if(game==='winery'){
  if(phase!=='wineryAward'||!ev.justFilled?.length||!(ev.gain>0||ev.full===21))return null;
  highest=ev.full===21;kind=highest?'clear':'bonus';label=highest?'ALL FULL!':ev.full+' GLASSES!';detail=highest?'21グラス 全満':ev.justFilled.length+'グラス満杯 ・ MIX '+ev.mix;gain=ev.gain;paths=cellPaths(ids(ev.justFilled).map(p=>({...p,type:'bowl'})));
 }else if(game==='popcorn'){
  if(phase!=='popcornDraw'||!e.trace?.count)return null;
  const tr=e.trace,K=window.PopcornEngine;
  gain=K.payout(s.popped,s.clears,100,s.firstPopAward)-K.payout(s.popped-tr.count,s.clears-Number(tr.clear),100,s.firstPopAward);
  if(!(gain>0||tr.clear))return null;
  highest=!!tr.clear;kind=highest?'clear':'bonus';label=highest?'ALL POP!':tr.count+' POP!';detail=tr.waves.length+'連鎖 ・ 合計 '+s.popped+'個';
  const waves=window.PopcornView.hitSequenceV276(tr);delay=waves.at(-1)?.at||0;paths=cellPaths(ids(sparse([...new Set(tr.waves.flat())],12)));
 }else if(game==='jelly'){
  if(phase!=='jellyPour'||!e.trace?.newLines?.length)return null;
  const tr=e.trace,count=s.lines.length;kind='bingo';highest=count===12;label=count+' LINE BINGO!';detail=highest?'12ライン 全完成':'今回 '+tr.newLines.length+'ライン完成';gain=window.JellyRules.payout(count,s.oddsMultiplier,s.payoutVersion??0);total=true;retained=true;delay=window.JellyView.lineRevealAt(tr);
  paths=tr.newLines.map(id=>groupPath(ids(window.JellyRules.LINES[id])));
 }else if(game==='stick'){
  if(phase!=='flipping'||!s.flipped?.length)return null;
  gain=Math.max(0,(s.turnTotals?.at(-1)||0)-(s.turnTotals?.at(-2)||0));if(!(gain>0||s.reversalThisMove))return null;
  highest=!!s.reversalThisMove;kind=highest?'clear':'shape';label=highest?'REVERSAL BONUS!':s.flipped.length+' FLIP!';detail=highest?'相手のワッフルを全反転':s.flipped.length+'枚のワッフルを反転';delay=180+s.flipped.length*110;
  const rays=new Map();for(const step of s.flipSteps||[]){const key=step.dx+','+step.dy;if(!rays.has(key))rays.set(key,[]);rays.get(key).push(step);}
  paths=[...rays.values()].map(ray=>groupPath(ids([s.placed[0],...ray.sort((a,b)=>a.distance-b.distance).map(p=>p.id)])));
 }else if(game==='castella'){
  if(phase!=='settled'||!r.liveDepth||s?.draws?.length<=r.beforeDraws||s.phase!=='done'||!(s.totalHundredths>0))return null;
  highest=!!s.highestRole;kind=highest?'clear':'bonus';label=highest?'ALL BAKED!':'BAKE COMPLETE!';detail=s.bakedCount+'個 焼き上がり';gain=s.totalHundredths;total=true;delay=850;
  paths=cellPaths(ids(sparse(s.baked.flatMap((b,i)=>b?[i]:[]),12)));
 }else if(game==='dango'){
  const realDraw=r.liveDepth&&s?.draws?.length>r.beforeDraws,committed=r.commitDepth&&s?.freeCommitted;
  if(phase!=='settled'||!(realDraw||committed))return null;
  const lineIds=committed?(e.animationLines||[]):(s.newLines||[]),roles=committed?window.DangoBingoRules.highestRolesFor(s).filter(n=>!r.beforeRoles.includes(n)):(s.newHighestRoles||[]);
  if(!lineIds.length&&!roles.length&&!(realDraw&&s.lastBonusGain))return null;
  const g=window.DangoBingoRules.geometryFor?.(s)||window.DangoBingoRules.geometry;
  highest=roles.length>0;kind=lineIds.length?'bingo':'bonus';label=highest?'最高役 成立！':lineIds.length?s.completedLines.length+' LINE BINGO!':'FREE EVOLUTION!';
  detail=highest?roles.map(n=>n+'個ライン '+s.lineCounts[n]+'本').join(' ・ '):lineIds.length?'今回 '+lineIds.length+'ライン完成':'配置FREE '+s.freeBudget+'個に進化';
  gain=lineIds.length||highest?s.totalHundredths:0;total=true;delay=lineIds.length?180:0;retained=true;
  paths=lineIds.map(id=>groupPath(ids(g.lines.find(line=>line.id===id)?.cells||g.lines[id]?.cells)));
 }
 if(!label)return null;
 const nativeWin=game==='candy'?ev.winMedals:undefined;
 return {game,phase,number,kind,label,detail,gain:Math.max(0,Number(gain)||0),win:Number.isSafeInteger(nativeWin)&&nativeWin>=0?nativeWin:amount(slot,gain),total,tier:tierFor(gain,highest),highest,paths,delay:Math.min(15000,Math.max(0,delay)),retained,state:game==='candy'?{awardRows:e.rows}:s,
  ...(game==='cookie'?{cookie:Object.freeze({link:e.maxLink,depth:ev.depth||0,clears:e.allClears})}:{}),
  ...(game==='candy'?{candy:Object.freeze({
   forms:Object.freeze(Object.fromEntries(['line','triangle','hexagon'].map(role=>[role,(ev.forms||[]).filter(form=>form.type===role).length]))),
   allClears:Number(ev.allClears??s?.allClears)||0
  })}:{})};
}
function recordFor(slot){let r=records.get(slot);if(r)return r;r={slot,version:slot.engine.version,round:app.token,liveDepth:0,beforeDraws:0,commitDepth:0,beforeRoles:[],restoring:false,pending:[],current:null,retained:[],seen:new Set(),main:null,mini:null};records.set(slot,r);return r;}
function ownsClass(r,on){r.slot.panel.classList.toggle('award-v277-owned',on);r.slot.tab.classList.toggle('award-v277-owned',on);r.slot.panel.dataset.awardKind=on?(r.current?.kind||r.pending[0]?.kind||'bonus'):'';}
function clear(r){r.pending=[];r.current=null;r.retained=[];r.seen.clear();r.bonusCells=[];ownsClass(r,false);for(const out of [r.main,r.mini])if(out){out.ctx.clearRect(0,0,out.canvas.width,out.canvas.height);out.canvas.hidden=true;}if(r.status)r.status.textContent='';}
function signature(c){return c.paths.map(p=>p.anchors.map(a=>[a.id,a.r,a.c].join(':')).join(',')).join(';');}
function describeCue(r,c){return {game:c.game,phase:c.phase,key:c.key,kind:c.kind,tier:c.tier,label:c.label,detail:c.detail,win:c.win,total:c.total,gain:c.gain,age:c.age??-c.delay,duration:c.duration,pathsVisible:c.pathsVisible!==false,paths:c.paths.map(path=>({closed:!!path.closed,mainPoints:geometry(r.slot,path,false,c.state),miniPoints:geometry(r.slot,path,true,c.state)}))};}
function receive(slot,ev){
 const r=recordFor(slot),e=slot.engine;
 if(ev.phase==='ready'||r.version!==e.version||r.round!==app.token){clear(r);r.version=e.version;r.round=app.token;if(ev.phase==='ready')r.restoring=false;}
 if(app.phase!=='playing'||app.enabled?.[slot.i]===false||app.paused||e.paused||document.hidden||!inView||r.restoring){stats.suppressed++;return;}
 // A match path belongs to the board that formed it. The reward picture can
 // finish reading while the native board falls or advances to its next round.
 const moving={cookie:['fall','refill'],choco:['canyonFall','canyonScroll'],candy:['pyramidFall','pyramidSweep','pyramidRound']}[kindOf(slot)];
 if(moving?.includes(ev.phase))for(const c of [r.current,...r.pending])if(c)c.pathsVisible=false;
 const c=semantic(slot,ev,r);if(!c)return;
 c.key=[app.token,e.version,c.phase,c.number,e.processed,e.roundIndex,ev.chain,ev.depth,c.gain,signature(c)].join('/');
 if(r.seen.has(c.key)){stats.suppressed++;return;}r.seen.add(c.key);if(r.seen.size>256)r.seen.delete(r.seen.values().next().value);
 c.serial=++serial;c.wait=c.delay;c.age=0;c.duration=quiet()?Math.max(1800,DURATIONS[c.tier]-250):DURATIONS[c.tier];c.sounded=false;
 stats.received++;eventCounts[c.game]=(eventCounts[c.game]||0)+1;
 history.push(describeCue(r,c));if(history.length>64)history.shift();
 r.pending.push(c);
 if(r.pending.length>MAX_PENDING){const low=r.pending.reduce((idx,a,i,list)=>a.tier<list[idx].tier?i:idx,0);r.pending.splice(low,1);stats.suppressed++;}
 stats.maxPending=Math.max(stats.maxPending,r.pending.length);ownsClass(r,true);wake();
}
function attach(slot,e){
 if(!e||attached.has(e)||!GAMES.includes(kindOf(slot,e))||typeof e.emit!=='function')return;
 attached.add(e);const r=recordFor(slot),emit=e.emit;
 e.emit=function(phase,detail={}){const result=Reflect.apply(emit,this,arguments);try{receive(slot,{phase,...detail});}catch(error){stats.errors++;if(stats.errors===1)console.warn('[Awards v277]',error);}return result;};
 if(typeof e.enqueueBatch==='function'){
  const enqueue=e.enqueueBatch;
  e.enqueueBatch=function(){r.restoring=false;r.liveDepth++;r.beforeDraws=this.state?.draws?.length||0;try{return Reflect.apply(enqueue,this,arguments);}finally{r.liveDepth--;}};
 }
 if(typeof e.finishThinkingV251==='function'){
  const finish=e.finishThinkingV251;
  e.finishThinkingV251=function(options={}){
   const safe=app.phase==='playing'&&!r.restoring&&!/restore|worker/.test(options.reason||'')&&this.liveBoard&&this.state?.phase==='placing';
   if(safe){
    r.commitDepth++;
    // The five-ball board is the immutable baseline. Editable FREE previews
    // can already contain a highest role, but have never earned an award.
    const R=window.DangoBingoRules,s=this.state,g=R.geometryFor?.(s)||R.geometry,counts=Object.fromEntries(Object.keys(s.lineCounts||{}).map(key=>[key,0]));
    for(const id of this.placementStartLines||[]){const line=g.lines.find(line=>line.id===id)||g.lines[id];if(line)counts[line.length]=(counts[line.length]||0)+1;}
    r.beforeRoles=R.highestRolesFor({...s,lineCounts:counts,counts});
   }
   try{return Reflect.apply(finish,this,arguments);}finally{if(safe)r.commitDepth--;}
  };
 }
 if(typeof e.afterCheckpointRestoreV247==='function'){
  const restore=e.afterCheckpointRestoreV247;
  e.afterCheckpointRestoreV247=function(){clear(r);r.restoring=true;return Reflect.apply(restore,this,arguments);};
 }
}
function layer(r,mini){
 const key=mini?'mini':'main';if(r[key])return r[key];
 const parent=mini?r.slot.tab.querySelector('.mini-wrap'):target(r.slot,false)?.parentElement;if(!parent)return null;
 const canvas=document.createElement('canvas');canvas.className='award-presentation-v277 '+(mini?'award-presentation-mini':'award-presentation-main');canvas.dataset.game=kindOf(r.slot);canvas.hidden=true;canvas.setAttribute('aria-hidden','true');parent.append(canvas);
 r[key]={canvas,parent,ctx:canvas.getContext('2d')};
 if(!r.status){const status=document.createElement('span');status.className='award-v277-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.setAttribute('aria-atomic','true');r.slot.panel.append(status);r.status=status;}
 return r[key];
}
function art(id){const sprite=window.SweetsAwardArtV277?.sprite?.(id);return sprite&&(sprite.naturalWidth||sprite.width)>0?sprite:null;}
function star(ctx,x,y,size,angle=0,alpha=1){const sprite=art('spark-star')||art('line-tip');if(!sprite)return;ctx.save();ctx.globalAlpha*=alpha;ctx.translate(x,y);ctx.rotate(angle);ctx.drawImage(sprite,-size/2,-size/2,size,size);ctx.restore();}
function ray(ctx,points,closed,progress,width,alpha,mini,active,tier,game){
 if(points.length<2)return;
 const segments=points.slice(1).map((p,i)=>({a:points[i],b:p}));if(closed)segments.push({a:points.at(-1),b:points[0]});
 for(const s of segments)s.len=Math.hypot(s.b.x-s.a.x,s.b.y-s.a.y);
 const total=segments.reduce((n,s)=>n+s.len,0);let travel=total*progress,walk=0;
 const ribbon=art('line-ribbon'),tip=art('line-tip'),tone=tier===4?'#ffe0ff':tier===3?'#fff0ad':'#fff3a9';
 ctx.save();ctx.globalAlpha=alpha;ctx.lineCap='round';ctx.lineJoin='round';
 for(const s of segments){
  const length=Math.min(s.len,Math.max(0,travel-walk));walk+=s.len;if(length<=0||!s.len)continue;
  const angle=Math.atan2(s.b.y-s.a.y,s.b.x-s.a.x);ctx.save();ctx.translate(s.a.x,s.a.y);ctx.rotate(angle);
  ctx.strokeStyle='#68324a';ctx.lineWidth=width*1.5;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(length,0);ctx.stroke();
  ctx.shadowColor=tone;ctx.shadowBlur=mini?2:active&&!quiet()?width*1.5:width*.6;
  ctx.strokeStyle=BADGE_THEMES[game]?.glow||'#ffc95a';ctx.lineWidth=width*1.18;ctx.stroke();ctx.shadowBlur=0;
  if(ribbon)ctx.drawImage(ribbon,0,0,ribbon.naturalWidth||ribbon.width,(ribbon.naturalHeight||ribbon.height),0,-width*.65,length,width*1.3);
  ctx.strokeStyle='#fffbe8';ctx.lineWidth=Math.max(.65,width*.14);ctx.beginPath();ctx.moveTo(0,-width*.15);ctx.lineTo(length,-width*.15);ctx.stroke();ctx.restore();
 }
 if(tip&&!closed){const a=points[0],b=points.at(-1),size=width*(mini?2.1:2.6);ctx.drawImage(tip,a.x-size/2,a.y-size/2,size,size);if(progress>=1)ctx.drawImage(tip,b.x-size/2,b.y-size/2,size,size);}
 ctx.restore();
 return {segments,total};
}
function onPath(segments,total,fraction){let length=total*clamp(fraction);for(const s of segments){if(length<=s.len){const p=s.len?length/s.len:0;return {x:s.a.x+(s.b.x-s.a.x)*p,y:s.a.y+(s.b.y-s.a.y)*p};}length-=s.len;}return segments.at(-1)?.b;}
function paintPaths(ctx,r,c,w,h,mini,ox,oy,staticOnly=false){
 const max=mini?MAX_MINI_PATHS:MAX_MAIN_PATHS,paths=sparse(c.paths,max),progress=staticOnly||quiet()?1:clamp(c.age/430),fade=staticOnly?.37:Math.min(1,clamp((c.duration-c.age)/420)),lineWidth=Math.max(mini?1.25:3.6,Math.min(w,h)*(mini?.022:.018));
 let particles=0;
 for(const [index,path] of paths.entries()){
  const points=projectedPath(r.slot,path,w,h,mini,c.state).map(p=>({...p,x:p.x+ox,y:p.y+oy}));
  const traced=ray(ctx,points,path.closed,progress,lineWidth*(path.cell?.60:1),fade,mini,!staticOnly,c.tier,c.game);
  if(!traced||staticOnly||quiet())continue;
  // One bright moving glint runs along each awarded line, not only the endpoints.
  // It is scoped to the event lifetime and the same 12/4 path caps as the
  // native payout observer; no perpetual repaint or new DOM canvas is used.
  if(!mini&&traced.total>3){
   const fraction=(c.age/(c.tier>=3?870:1120)+index*.19)%1;
   if(fraction<=progress){
    const p=onPath(traced.segments,traced.total,Math.max(0,fraction-.13));
    const q=onPath(traced.segments,traced.total,fraction);
    if(p&&q){ctx.save();ctx.globalAlpha=fade*.88;ctx.lineCap='round';
     ctx.shadowColor=BADGE_THEMES[c.game]?.glow||'#ffefbb';ctx.shadowBlur=Math.min(14,lineWidth*1.9);
     ctx.strokeStyle='#ffffff';ctx.lineWidth=Math.max(2,lineWidth*.61);
     ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();ctx.restore();}
   }
  }
  const count=mini?1:Math.min(2,c.tier),speed=mini?1900:1300;
  for(let j=0;j<count;j++){
   const f=(c.age/speed+index*.163+j/count)%1;if(f>progress)continue;const p=onPath(traced.segments,traced.total,f);if(!p)continue;
   star(ctx,p.x,p.y,lineWidth*(mini?2.5:3.2),c.age/1900,fade*.95);particles++;
  }
 }
 if(mini){stats.maxMiniPaths=Math.max(stats.maxMiniPaths,paths.length);stats.maxMiniParticles=Math.max(stats.maxMiniParticles,particles);}else{stats.maxMainPaths=Math.max(stats.maxMainPaths,paths.length);stats.maxMainParticles=Math.max(stats.maxMainParticles,particles);}
 return particles;
}
function goldText(ctx,text,x,y,size,maxWidth,ink='#fff2a0'){
 ctx.save();ctx.font='1000 '+size+'px "M PLUS Rounded 1c","Noto Sans JP",system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';
 const measured=ctx.measureText(text).width,scale=measured>maxWidth?maxWidth/measured:1;ctx.translate(x,y);ctx.scale(scale,1);
 ctx.strokeStyle='#48204f';ctx.lineWidth=Math.max(2.5,size*.22);ctx.strokeText(text,0,0);ctx.strokeStyle='#fff9dc';ctx.lineWidth=Math.max(1,size*.10);ctx.strokeText(text,0,0);
 const gold=ctx.createLinearGradient(0,-size/2,0,size/2);gold.addColorStop(0,'#ffffff');gold.addColorStop(.35,ink);gold.addColorStop(.72,'#ffcb47');gold.addColorStop(1,'#ffebad');ctx.fillStyle=gold;ctx.fillText(text,0,0);ctx.restore();
}

// Themed award badges are independent of gameplay. They use ten different
// silhouettes rather than a shared rectangular award image and remain bounded
// to the original display slot; real credits still come from the native event.
function badgeOutline(ctx,shape,w,h){
 const x=w*.5,y=h*.5;
 ctx.beginPath();
 if(shape==='scallop'){
  const n=18;for(let j=0;j<=n*2;j++){const a=j*Math.PI/n-Math.PI/2,rr=j%2?.93:1;
   const px=Math.cos(a)*x*rr,py=Math.sin(a)*y*rr;j?ctx.lineTo(px,py):ctx.moveTo(px,py);}
 }else if(shape==='melt'){
  ctx.moveTo(-x*.84,-y*.82);ctx.quadraticCurveTo(-x,-y*.68,-x,-y*.30);
  ctx.lineTo(-x*.97,y*.33);ctx.quadraticCurveTo(-x*.96,y*.66,-x*.73,y*.52);
  ctx.lineTo(-x*.65,y*.76);ctx.quadraticCurveTo(-x*.48,y*1.1,-x*.35,y*.67);
  ctx.lineTo(-x*.16,y*.65);ctx.quadraticCurveTo(0,y*1.26,x*.10,y*.64);
  ctx.lineTo(x*.43,y*.64);ctx.quadraticCurveTo(x*.55,y*.95,x*.71,y*.59);
  ctx.lineTo(x*.85,y*.36);ctx.quadraticCurveTo(x*1.06,0,x*.87,-y*.70);
  ctx.quadraticCurveTo(0,-y*1.15,-x*.84,-y*.82);
 }else if(shape==='hex'){
  for(let j=0;j<=6;j++){const a=j*Math.PI/3-Math.PI/6,px=Math.cos(a)*x,py=Math.sin(a)*y;j?ctx.lineTo(px,py):ctx.moveTo(px,py);}
 }else if(shape==='diamond'){
  ctx.moveTo(0,-y);ctx.lineTo(x*.62,-y*.72);ctx.lineTo(x,y*.1);
  ctx.lineTo(0,y);ctx.lineTo(-x,y*.1);ctx.lineTo(-x*.62,-y*.72);
 }else if(shape==='burst'){
  for(let j=0;j<=32;j++){const a=j*Math.PI/16-Math.PI/2,rx=j%2?x*.75:x,ry=j%2?y*.78:y;j?ctx.lineTo(Math.cos(a)*rx,Math.sin(a)*ry):ctx.moveTo(Math.cos(a)*rx,Math.sin(a)*ry);}
 }else if(shape==='bubble'){
  ctx.ellipse(0,0,x,y*.95,0,0,Math.PI*2);
 }else if(shape==='waffle'){
  const t=x*.16;ctx.moveTo(-x+t,-y);ctx.lineTo(x-t,-y);ctx.quadraticCurveTo(x,-y,x,-y+t);
  ctx.lineTo(x,y-t);ctx.quadraticCurveTo(x,y,x-t,y);ctx.lineTo(-x+t,y);
  ctx.quadraticCurveTo(-x,y,-x,y-t);ctx.lineTo(-x,-y+t);ctx.quadraticCurveTo(-x,-y,-x+t,-y);
 }else if(shape==='loaf'){
  ctx.moveTo(-x*.98,y*.46);ctx.lineTo(-x*.81,-y*.66);
  ctx.quadraticCurveTo(-x*.56,-y*1.05,-x*.27,-y*.83);
  ctx.quadraticCurveTo(0,-y*1.24,x*.26,-y*.84);
  ctx.quadraticCurveTo(x*.61,-y*1.10,x*.86,-y*.57);
  ctx.lineTo(x,y*.47);ctx.lineTo(x*.84,y*.88);ctx.lineTo(-x*.83,y*.88);
 }else{
  ctx.ellipse(0,0,x,y,0,0,Math.PI*2);
 }
 ctx.closePath();
}
function ornament(ctx,theme,w,h,mini,age){
 const x=w*.5,y=h*.5,shape=theme.shape;
 ctx.save();ctx.lineCap=ctx.lineJoin='round';ctx.shadowColor=theme.glow;ctx.shadowBlur=mini?3:Math.min(18,h*.12);
 if(theme.frame){
  badgeOutline(ctx,shape,w,h);const g=ctx.createLinearGradient(0,-y,0,y);
  g.addColorStop(0,theme.core);g.addColorStop(.45,theme.mid);g.addColorStop(.78,theme.edge);g.addColorStop(1,'#4a2849');
  ctx.fillStyle=g;ctx.fill();ctx.shadowBlur=0;ctx.lineWidth=Math.max(2,h*.055);ctx.strokeStyle='#fff9d9';ctx.stroke();
  ctx.save();ctx.scale(.94,.88);badgeOutline(ctx,shape,w,h);ctx.globalAlpha=.85;ctx.strokeStyle=theme.glow;ctx.lineWidth=Math.max(1,h*.024);ctx.stroke();ctx.restore();
 }else{
  // Grape-glow and mochi awards float free of a rectangle.
  const aura=ctx.createRadialGradient(0,0,h*.06,0,0,x*.93);
  aura.addColorStop(0,'#fff6e1d9');aura.addColorStop(.58,theme.mid+'7c');aura.addColorStop(1,theme.glow+'00');
  ctx.fillStyle=aura;ctx.fillRect(-x,-y,w,h);ctx.shadowBlur=0;
 }
 if(shape==='waffle'){
  ctx.globalAlpha=.24;ctx.strokeStyle='#75452a';ctx.lineWidth=Math.max(1,h*.018);
  for(let j=-2;j<=2;j++){const at=j*w*.125;ctx.beginPath();ctx.moveTo(at-y*.35,-y*.7);ctx.lineTo(at+y*.35,y*.7);ctx.moveTo(at+y*.35,-y*.7);ctx.lineTo(at-y*.35,y*.7);ctx.stroke();}
 }else if(shape==='diamond'||shape==='hex'){
  ctx.globalAlpha=.24;ctx.fillStyle='#ffffff';
  ctx.beginPath();ctx.moveTo(0,-y*.93);ctx.lineTo(x*.64,-y*.62);ctx.lineTo(x*.13,y*.04);ctx.closePath();ctx.fill();
 }else if(shape==='wine'){
  for(let j=-1;j<=1;j++){
   const dx=j*w*.23+Math.sin(age/900+j)*w*.018;
   const rr=h*(j===0?.30:.24);
   ctx.globalAlpha=j===0?.52:.31;ctx.beginPath();ctx.ellipse(dx,-h*.08,rr*.65,rr,0,0,Math.PI*2);ctx.fillStyle=theme.mid;ctx.fill();
   ctx.globalAlpha=.8;ctx.strokeStyle='#fff9fd';ctx.lineWidth=Math.max(1,h*.017);ctx.stroke();
  }
 }else if(shape==='mochi'){
  ctx.globalAlpha=.74;ctx.strokeStyle='#a77550';ctx.lineWidth=Math.max(2,h*.05);
  ctx.beginPath();ctx.moveTo(-w*.41,h*.15);ctx.lineTo(w*.44,-h*.05);ctx.stroke();
  for(let j=-1;j<=1;j++){
   const xx=j*w*.24,yy=-j*h*.065;
   ctx.beginPath();ctx.ellipse(xx,yy,h*.34,h*.31,0,0,Math.PI*2);
   ctx.fillStyle=j===0?'#fffdf4':j<0?'#b6e4b0':'#ffd8ec';ctx.fill();
   ctx.strokeStyle='#fffaf8';ctx.lineWidth=Math.max(1,h*.02);ctx.stroke();
  }
 }
 ctx.restore();
}
function paintGameBadge(ctx,r,c,w,h,mini,ox,oy){
 const start=quiet()?0:125,age=c.age-start;if(age<0)return 0;
 const enter=quiet()?1:clamp(age/270),leave=clamp((c.duration-c.age)/360);
 const fade=Math.min(1,enter*2)*leave;
 const theme=BADGE_THEMES[c.game];if(!theme)return 0;
 if(c.game==='cookie'&&window.CookieAwardV293?.loaded){
  const width=Math.min(w*.98,h*(mini?1.48:1.28)),height=width/1.5;
  const zoom=quiet()?1:.82+.18*(1-(1-enter)**3);
  ctx.save();ctx.globalAlpha=fade;ctx.translate(ox+w/2,oy+h*.51+(1-enter)*h*.035);ctx.scale(zoom,zoom);
  const painted=window.CookieAwardV293.paint(ctx,{cue:c,width,height,mini,age,still:quiet()});
  ctx.restore();
  if(painted){if(mini)stats.miniImages++;else stats.mainImages++;return quiet()?0:mini?2:c.tier>=3?5:3;}
 }
 if(c.game==='candy'&&window.SixDropAwardV296?.loaded){
  const aspect=window.SixDropAwardV296.aspectFor?.(c)||window.SixDropAwardV296.aspect||1.5;
  const width=Math.min(w*.99,h*(mini?.98:.86)*aspect),height=width/aspect;
  const zoom=quiet()?1:.82+.18*(1-(1-enter)**3);
  ctx.save();ctx.globalAlpha=fade;ctx.translate(ox+w/2,oy+h*.51+(1-enter)*h*.035);ctx.scale(zoom,zoom);
  const painted=window.SixDropAwardV296.paint(ctx,{cue:c,width,height,mini,age,still:quiet()});
  ctx.restore();
  if(painted){if(mini)stats.miniImages++;else stats.mainImages++;return quiet()?0:mini?2:6;}
 }
 const width=Math.min(w*(mini?.93:.84),h*(mini?1.16:1.28)),height=Math.min(h*(mini?.72:.54),width*.67);
 const cx=ox+w/2,cy=oy+h*(mini?.53:.53),zoom=quiet()?1:.80+.20*(1-(1-enter)**3);
 ctx.save();ctx.globalAlpha=fade;ctx.translate(cx,cy+(1-enter)*h*.05);ctx.scale(zoom,zoom);
 // v291: compose original painted PNG game pieces over tier artwork.
 // The native payout event continues to own all text and amounts.
 if(!window.SweetsIllustratedAwardV291?.paint(ctx,{game:c.game,tier:c.tier,width,height,mini,age,still:quiet()}))
  ornament(ctx,theme,width,height,mini,age);
 if(c.tier>=3&&!quiet()){
  // Sparkling slow halo only around the award, not a full-board flash.
  ctx.save();ctx.strokeStyle=theme.glow;ctx.globalAlpha=.32+.18*Math.sin(age/420);
  ctx.lineWidth=Math.max(1,height*.022);ctx.shadowColor=theme.glow;ctx.shadowBlur=mini?2:12;
  badgeOutline(ctx,theme.shape,width*1.04,height*1.05);ctx.stroke();ctx.restore();
 }
 // Short, readable title + native WIN, both fitted to the themed silhouette.
 const titleY=c.win>0?-height*.14:0,awardY=height*.23;
 goldText(ctx,c.label,0,titleY,Math.max(mini?10:16,Math.min(width*.10,height*.24)),width*.77,theme.core);
 if(c.win>0)goldText(ctx,(c.total?'':'＋')+pretty(c.win)+' WIN',0,awardY,
  Math.max(mini?12:19,Math.min(width*.145,height*.29)),width*.80,'#fff9c9');
 else if(!mini&&c.detail)goldText(ctx,c.detail,0,height*.27,Math.max(9,width*.035),width*.66);
 if(!mini&&c.detail&&c.win>0)goldText(ctx,c.detail,0,height*.41,
  Math.max(9,Math.min(width*.039,12)),width*.74,theme.core);
 if(!quiet()){
  const n=mini?2:Math.min(12,5+c.tier*2),radius=width*.48;
  for(let j=0;j<n;j++){
   const a=j*Math.PI*2/n+c.serial*.33,phase=(age/1550+j*.23)%1;
   const spark=3+(j%3)*(mini?1:2);
   star(ctx,Math.cos(a)*radius,Math.sin(a)*height*.48,spark,age/1700+j,
    leave*(.35+.65*Math.sin(Math.PI*phase)));
  }
 }else{
  star(ctx,width*.41,-height*.28,mini?4:7,0,.74);
 }
 ctx.restore();if(mini)stats.miniImages++;else stats.mainImages++;
 return quiet()?0:mini?2:Math.min(12,5+c.tier*2);
}

function paintBadge(ctx,r,c,w,h,mini,ox,oy){
 if(!(c.game==='candy'&&c.kind==='clear')||window.SixDropAwardV296?.loaded||window.SweetsIllustratedAwardV291?.describe?.().atlasReady)return paintGameBadge(ctx,r,c,w,h,mini,ox,oy);
 const custom=c.game==='candy'&&c.kind==='clear'?window.SixDropUiV278?.awardArt?.():null;
 const badge=custom?.image||art(TIER_ART[c.tier]);if(!badge)return 0;
 const start=quiet()?0:170,age=c.age-start;if(age<0)return 0;
 const rise=quiet()?1:clamp(age/260),leave=clamp((c.duration-c.age)/350),ease=quiet()?1:rise<1?1-Math.pow(1-rise,3):1;
 const aspect=(badge.naturalWidth||badge.width)/(badge.naturalHeight||badge.height);
 let bw=w*(mini?.98:.94),bh=bw/aspect,maxHeight=h*(mini?.84:.64);if(bh>maxHeight){bh=maxHeight;bw=bh*aspect;}
 const cx=ox+w/2,cy=oy+h*(mini?.52:.53),scale=quiet()?1:.75+.25*ease+(rise<1?Math.sin(rise*Math.PI)*.045:0);
 ctx.save();ctx.globalAlpha=Math.min(1,rise*2)*leave;ctx.translate(cx,cy+(quiet()?0:(1-ease)*h*.07));ctx.scale(scale,scale);
 if(!mini&&!quiet()){
  const halo=ctx.createRadialGradient(0,0,bw*.12,0,0,bw*.56);halo.addColorStop(0,c.tier===4?'rgba(230,140,255,.16)':'rgba(255,219,120,.15)');halo.addColorStop(1,'rgba(255,235,160,0)');ctx.fillStyle=halo;ctx.fillRect(-bw*.6,-bh*.75,bw*1.2,bh*1.5);
  if(c.tier>=3){
   // A single slow sweep has no white strobe or repeated full-board flash.
   const count=c.tier===4?16:10,outer=Math.min(bw*.57,h*.49),inner=bw*.17;
   ctx.save();ctx.rotate(age/(c.tier===4?6200:8800));ctx.scale(1,.78);
   const light=ctx.createRadialGradient(0,0,inner,0,0,outer);light.addColorStop(0,c.tier===4?'rgba(255,227,150,.24)':'rgba(255,232,160,.15)');light.addColorStop(1,'rgba(255,225,150,0)');ctx.fillStyle=light;
   for(let i=0;i<count;i++){const angle=i*Math.PI*2/count,width=c.tier===4?.07:.045;ctx.beginPath();ctx.moveTo(Math.cos(angle-width)*inner,Math.sin(angle-width)*inner);ctx.lineTo(Math.cos(angle-width)*outer,Math.sin(angle-width)*outer);ctx.lineTo(Math.cos(angle+width)*outer,Math.sin(angle+width)*outer);ctx.lineTo(Math.cos(angle+width)*inner,Math.sin(angle+width)*inner);ctx.closePath();ctx.fill();}
   ctx.restore();
  }
 }
 ctx.drawImage(badge,-bw/2,-bh/2,bw,bh);
 if(custom?.image)custom.onPaint?.();
 // Art defines a safe dark middle; numeric values always come from the event.
 const content=custom?.image?custom.layout:window.SweetsAwardArtV277.layout?.(TIER_ART[c.tier])||{x:.17,y:.34,w:.66,h:.40};
 const box={x:(content.x-.5)*bw,y:(content.y-.5)*bh,w:content.w*bw,h:content.h*bh},x=box.x+box.w/2;
 const titleSize=Math.min(bw*(mini?.108:.105),box.h*(c.win>0?.43:.55));
 if(custom?.image&&custom.logo){
  const height=box.h*(c.win>0?.48:.7),width=Math.min(box.w, height*custom.logo.naturalWidth/custom.logo.naturalHeight),logoHeight=width*custom.logo.naturalHeight/custom.logo.naturalWidth;
  ctx.drawImage(custom.logo,x-width/2,box.y+box.h*(c.win>0?.25:.40)-logoHeight/2,width,logoHeight);
 }else goldText(ctx,c.label,x,box.y+box.h*(c.win>0?.25:.40),Math.max(mini?10:15,titleSize),box.w);
 if(c.win>0){
  const label=(c.total?'':'＋')+pretty(c.win)+' WIN';goldText(ctx,label,x,box.y+box.h*.77,Math.max(mini?12:20,Math.min(bw*(mini?.15:.14),box.h*.48)),box.w,'#fffac8');
 }else if(!mini)goldText(ctx,c.detail,x,box.y+box.h*.86,Math.max(10,bw*.037),box.w,'#d8fbff');
 if(!mini&&c.win>0&&c.detail){
  const textY=((content.ribbonY??.79)-.5)*bh,textWidth=bw*(content.ribbonWidth??.43),fontSize=Math.max(10,bw*.032);
  ctx.save();ctx.font='1000 '+fontSize+'px "M PLUS Rounded 1c","Noto Sans JP",system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';ctx.translate(0,textY);ctx.scale(Math.min(1,textWidth/Math.max(1,ctx.measureText(c.detail).width)),1);ctx.strokeStyle='#fff5d7';ctx.lineWidth=Math.max(1,fontSize*.14);ctx.strokeText(c.detail,0,0);ctx.fillStyle='#5a274a';ctx.fillText(c.detail,0,0);ctx.restore();
 }
 let particles=0;
 if(!quiet()){
  const count=mini?2:Math.min(12,5+c.tier*2);
  for(let i=0;i<count;i++){
   const angle=i*Math.PI*2/count+c.serial*.37,rad=bw*(.35+(i%3)*.055),q=(age/1300+i*.17)%1,size=(mini?5:9)+(i%3)*(mini?1:2.4),xx=Math.cos(angle)*rad,yy=Math.sin(angle)*Math.min(bh*.43,h*.25)-(mini?3:10)*q;
   star(ctx,xx,yy,size,age/1800+i,leave*(.45+.45*Math.sin(Math.PI*q)));particles++;
  }
 }
 ctx.restore();if(mini)stats.miniImages++;else stats.mainImages++;return particles;
}
function paint(r,mini){
 const slot=r.slot,t=target(slot,mini),visible=mini?slot.i!==active:slot.i===active&&!slot.panel.hidden;
 let out=r[mini?'mini':'main'];if(!visible||!t||t.hidden){if(out)out.canvas.hidden=true;return;}
 const c=r.current,hasRetained=r.retained.length>0;
 if(!c&&!hasRetained){if(out){out.ctx.clearRect(0,0,out.canvas.width,out.canvas.height);out.canvas.hidden=true;}return;}
 out=layer(r,mini);if(!out)return;
 const pr=out.parent.getBoundingClientRect(),tr=t.getBoundingClientRect(),w=out.parent.clientWidth,h=out.parent.clientHeight;
 if(!(w>0&&h>0&&pr.width>0&&pr.height>0&&tr.width>0&&tr.height>0)){out.canvas.hidden=true;return;}
 const dpr=Math.min(mini?1.5:2,window.devicePixelRatio||1),pw=Math.max(1,Math.round(w*dpr)),ph=Math.max(1,Math.round(h*dpr));if(out.canvas.width!==pw)out.canvas.width=pw;if(out.canvas.height!==ph)out.canvas.height=ph;
 const ctx=out.ctx;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);out.canvas.hidden=false;
 const sx=w/pr.width,sy=h/pr.height,ox=(tr.left-pr.left)*sx,oy=(tr.top-pr.top)*sy,tw=tr.width*sx,th=tr.height*sy;
 if(r.retained.length){const prior=r.retained.at(-1),unique=new Map();for(const award of r.retained)for(const path of award.paths)unique.set(path.anchors.map(p=>[p.id,p.r,p.c].join(':')).join(','),path);paintPaths(ctx,r,{...prior,paths:[...unique.values()]},tw,th,mini,ox,oy,true);}
 if(c){const paths=c.pathsVisible===false?0:paintPaths(ctx,r,c,tw,th,mini,ox,oy),sparks=paintBadge(ctx,r,c,tw,th,mini,ox,oy);if(mini)stats.maxMiniParticles=Math.max(stats.maxMiniParticles,paths+sparks);else stats.maxMainParticles=Math.max(stats.maxMainParticles,paths+sparks);}
}
function activate(r,c){
 r.current=c;c.age=0;
 if(r.slot.i===active){window.SweetsAudioV277?.award({game:c.game,tier:c.tier,key:c.key,kind:c.kind,win:c.win});c.sounded=true;}
 layer(r,r.slot.i!==active);if(r.status)r.status.textContent=c.label+'。'+c.detail+(c.win>0?'。'+(c.total?'現在の配当 ':'獲得配当 ')+pretty(c.win)+' WIN':'');
 ownsClass(r,true);
}
function finishCurrent(r){
 const c=r.current;if(c?.retained&&c.paths.length){r.retained.push({...c,paths:c.paths.slice(0,24)});if(r.retained.length>4)r.retained.shift();}
 r.current=null;
}
function tick(now){
 frame=0;const stopped=app.paused||document.hidden||!inView,dt=lastStamp?Math.min(100,Math.max(0,now-lastStamp)):0;lastStamp=now;let pending=false;const miniDue=now-miniStamp>=40;
 for(const r of records.values()){
  if(r.version!==r.slot.engine.version||r.round!==app.token||!visiblePhase()||document.hidden){clear(r);continue;}
  if(!stopped&&!r.slot.engine.paused){
   for(const c of r.pending)c.wait-=dt*Math.max(.25,Number(r.slot.engine.presentationRate)||1);
   if(r.current){r.current.age+=dt;if(r.current.age>=r.current.duration)finishCurrent(r);}
   const ready=r.pending.filter(c=>c.wait<=0).sort((a,b)=>b.tier-a.tier||a.serial-b.serial),next=ready[0];
   // A higher role replaces a smaller one; equal awards queue for readable text.
   if(next&&(!r.current||next.tier>r.current.tier&&r.current.age>300)){
    if(r.current)finishCurrent(r);r.pending.splice(r.pending.indexOf(next),1);activate(r,next);
   }
   ownsClass(r,!!(r.current||r.pending.length));paint(r,false);if(miniDue)paint(r,true);
  }
  pending||=!!(r.current||r.pending.length);
 }
 if(miniDue)miniStamp=now;stats.renderFrames++;
 if(pending){if(stopped)timer=setTimeout(()=>{timer=0;wake();},120);else frame=requestAnimationFrame(tick);}else lastStamp=0;
}
function wake(){if(!frame&&!timer){lastStamp=lastStamp||performance.now();frame=requestAnimationFrame(tick);}}
function cancel(){if(frame)cancelAnimationFrame(frame);if(timer)clearTimeout(timer);frame=timer=lastStamp=0;for(const r of records.values())clear(r);}
for(const slot of slots)attach(slot,app.engines[slot.i]);
if(typeof select==='function'){
 const previousSelect=select;
 select=function(){const result=Reflect.apply(previousSelect,this,arguments);for(const r of records.values()){paint(r,false);paint(r,true);}return result;};
}
window.addEventListener('resize',()=>{for(const r of records.values()){paint(r,false);paint(r,true);}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();});reducedMedia.addEventListener?.('change',cancel);
Promise.resolve(window.SweetsAwardArtV277?.ready).then(()=>{for(const r of records.values()){paint(r,false);paint(r,true);}});
window.SweetsAwardsV277=Object.freeze({
 version:277,attach,
 owns(game){for(const r of records.values())if(r.slot.i===active&&kindOf(r.slot)===game&&app.phase==='playing'&&!r.restoring)return !!(r.current?.sounded||r.pending.length);return false;},
 describe(){return {version:277,attached:[...records.values()].map(r=>kindOf(r.slot)),reducedMotion:quiet(),...stats,eventCounts:{...eventCounts},artReady:[...TIER_ART.slice(1),'line-ribbon','line-tip','spark-star'].every(id=>!!art(id)),
  badgeThemes:Object.fromEntries(Object.entries(BADGE_THEMES).map(([game,theme])=>[game,{shape:theme.shape,frame:theme.frame}])),limits:{pendingPerGame:MAX_PENDING,mainPaths:MAX_MAIN_PATHS,miniPaths:MAX_MINI_PATHS,mainParticles:48,miniParticles:6},
  active:[...records.values()].flatMap(r=>r.current?[describeCue(r,r.current)]:[]),pending:[...records.values()].flatMap(r=>r.pending.map(c=>({...describeCue(r,c),delayRemaining:c.wait}))),history:history.map(item=>({...item,paths:item.paths.map(p=>({...p,mainPoints:p.mainPoints.map(v=>({...v})),miniPoints:p.miniPoints.map(v=>({...v}))}))}))};}
});
})();

/* Event-driven confectionery HIT effects. The engines retain ownership of
 * every draw, clock, payout and native animation. No game RNG is consumed. */
(()=>{
'use strict';
if(window.SweetsHitPresentationV276)return;
const query=new URLSearchParams(location.search);
if(query.get('serverSettlementWorker')==='1'||query.get('downloadWorker')==='1')return;
const TAU=Math.PI*2,MAX_BURSTS=24,MAX_MAIN=8,MAX_MINI=4,IDLE_FRAME_MS=108;
const themes={
 cookie:{ink:'#ffd568',edge:'#ff89c2',style:'crumb',sprite:'cookie-honey'},
 choco:{ink:'#ffc45b',edge:'#ff9460',style:'crumb',sprite:'choco-milk'},
 candy:{ink:'#8dfff0',edge:'#55bcff',style:'prism',sprite:'candy-aqua'},
 gelato:{ink:'#b4f8ff',edge:'#9a8cff',style:'prism',sprite:'gelato-blue'},
 winery:{ink:'#efb2ff',edge:'#ab7bff',style:'ripple',sprite:null},
 popcorn:{ink:'#fff29c',edge:'#ffad3e',style:'pop',sprite:'popcorn-gold'},
 jelly:{ink:'#9cf9ff',edge:'#4ce3c5',style:'ripple',sprite:null},
 stick:{ink:'#ffe6a0',edge:'#f49d67',style:'flip',sprite:'waffle-white'},
 castella:{ink:'#ffdc7b',edge:'#ff9853',style:'crumb',sprite:'castella-baked'},
 dango:{ink:'#ffd8f4',edge:'#ff8fc5',style:'petal',sprite:'dango-pink'}
};
const records=new Map(),attached=new WeakSet(),history=[],eventCounts={},stats={received:0,suppressed:0,renderFrames:0,drawnBursts:0,maxQueued:0,maxMainParticles:0,maxMiniParticles:0,ambientFrames:0,errors:0};
const reducedMedia=matchMedia('(prefers-reduced-motion: reduce)');
let frame=0,timer=0,lastStamp=0,miniStamp=-Infinity,serial=0;
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const reduced=()=>!!(reducedMedia.matches||(typeof motionReduced!=='undefined'&&motionReduced));
const kindOf=(slot,e=slot.engine)=>e?.kind||window.SweetsLineup?.ids?.[slot.i]||'cookie';
const visualHash=value=>{let h=2166136261;for(const c of String(value))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;};
const noise=(seed,index)=>{let n=(seed+Math.imul(index+1,0x9e3779b9))>>>0;n^=n>>>16;n=Math.imul(n,0x7feb352d);n^=n>>>15;return (n>>>0)/4294967296;};
function sparse(values,max){if(values.length<=max)return values.slice();return Array.from({length:max},(_,i)=>values[Math.floor(i*(values.length-1)/(max-1))]);}
function target(slot,mini){
 const kind=kindOf(slot);
 if(mini)return kind==='gelato'?slot.tab.querySelector('.gp-raster-board'):slot.miniCanvas;
 return kind==='cookie'?slot.board:kind==='choco'?slot.chocoCanvas:kind==='candy'?slot.candyCanvas:
  slot.panel.querySelector({gelato:'.gp-raster-board',winery:'.wp-canvas',popcorn:'.pc-scene',jelly:'.jb-scene',stick:'.bs-grid canvas',castella:'.pct-pan>canvas',dango:'.dgb-pan>canvas'}[kind]||'canvas');
}
function projected(slot,anchor,width,height,mini,state){
 const kind=kindOf(slot);
 if(kind==='cookie')return {x:(anchor.c+.5)/8*width,y:(anchor.r+.5)/8*height,r:Math.min(width,height)/8*.48};
 if(kind==='choco'){
  if(mini){const u=Math.min(width/7,height/12);return {x:(width-u*7)/2+(anchor.c+.5)*u,y:(height-u*12)/2+(anchor.r+.5)*u,r:u*.48};}
  const h=430*height/width,L=chocoBoardLayout(430,h);return {x:(L.left+(anchor.c+.5)*L.w)/430*width,y:(L.top+(anchor.r+.5)*L.h)/h*height,r:L.w/430*width*.48};
 }
 if(kind==='candy'){
  const rows=slot.engine.rows||10,L=sixLayout(rows),p=sixXY(anchor.r,anchor.c,rows);
  if(mini){const first=sixXY(0,0,rows),last=sixXY(rows-1,0,rows),w=Math.max(sixRowWidth(0,rows),sixRowWidth(1,rows))*L.step,h=last.y-first.y+L.radius*2,k=Math.min(width/w,height/h);
   return {x:width/2+(p.x-160)*k,y:(height-h*k)/2+(p.y-first.y+L.radius)*k,r:L.radius*k};}
  return {x:p.x/320*width,y:p.y/320*height,r:L.radius*Math.min(width,height)/320};
 }
 const projection={gelato:window.GelatoPrism,winery:window.WineryPyramid,popcorn:window.PopcornView,jelly:window.JellyView}[kind];
 if(projection?.hitGeometryV276)return projection.hitGeometryV276(width,height,mini,anchor);
 if(kind==='stick'){
  const size=Math.min(width,height),rim=size*.064,u=(size-2*rim)/8;
  return {x:(width-size)/2+rim+(anchor.id%8+.5)*u,y:(height-size)/2+rim+(Math.floor(anchor.id/8)+.5)*u,r:u*.46};
 }
 if(kind==='castella'){
  const c=state?.cells?.[anchor.id];if(!c)return null;
  const g=window.PartyCastellaView.geometry(state),u=Math.min(width/g.panW,height/g.panH);
  return {x:width/2+c.x*u,y:height/2+c.y*u,r:u*.42};
 }
 if(kind==='dango'){
  const g=window.DangoBingoView.geometry(width,height,{layout:mini?'compact':'main',state}),p=g.centers[anchor.id];
  return p?{x:p.x,y:p.y,r:g.radius*.9}:null;
 }
 return null;
}
function geometry(slot,anchor,mini,state=slot.engine.state){
 const canvas=target(slot,mini);if(!canvas)return null;
 const width=canvas.clientWidth||canvas.width||320,height=canvas.clientHeight||canvas.height||320;
 return projected(slot,anchor,width,height,mini,state);
}
const rc=p=>Array.isArray(p)?{r:p[0],c:p[1]}:Number.isFinite(p?.r)&&Number.isFinite(p?.c)?{r:p.r,c:p.c}:null;
const ids=values=>(values||[]).map(id=>({id:Number(id)})).filter(p=>Number.isInteger(p.id)&&p.id>=0);
function cue(slot,ev,record){
 const e=slot.engine,s=e.state,phase=ev.phase,kind=kindOf(slot,e);
 let anchors=[],level=1,number=ev.number??ev.numbers?.[0]??s?.draws?.at(-1),state=s;
 if(kind==='cookie'){
  if(phase!=='hit'&&phase!=='link')return null;
  anchors=(ev.cells||[]).map(rc).filter(Boolean);level=phase==='link'?Math.min(3,1+Math.floor((ev.depth||1)/3)):1;
 }else if(kind==='choco'){
  if(phase==='canyonSoften')anchors=(ev.impacts||ev.contacts||[]).map(rc).filter(Boolean);
  else if(phase==='canyonMelt'&&!ev.drill){anchors=(ev.targets||[]).map(rc).filter(Boolean);level=2;}
  else if(phase==='canyonPower'||phase==='canyonTransform'){anchors=(ev.targets||[]).map(rc).filter(Boolean);level=3;}
  else return null;
 }else if(kind==='candy'){
  if(phase!=='pyramidHit'&&phase!=='pyramidShape')return null;
  anchors=(ev.cells||[]).map(rc).filter(Boolean);level=phase==='pyramidShape'?(ev.forms?.length?3:2):1;
 }else if(kind==='gelato'){
  if(phase==='gelatoHit'&&ev.newHit)anchors=[{id:ev.index}];
  else if(phase==='gelatoFill'){anchors=ids(ev.newFaces).map(p=>({...p,type:'face'}));level=ev.full?3:2;}
  else return null;
 }else if(kind==='winery'){
  if(phase==='wineryPour'&&Number.isInteger(e.fx?.source))anchors=[{id:e.fx.source}];
  else if(phase==='wineryAward'){anchors=ids(ev.justFilled).map(p=>({...p,type:'bowl'}));level=ev.gain>=1000?3:2;}
  else return null;
 }else if(kind==='popcorn'){
  if(phase!=='popcornDraw'||!e.trace)return null;
  const tr=e.trace,port=tr.boost?16:tr.all?15:tr.port;
  if(port>=0)anchors.push({id:port,type:'port'});
  const waves=window.PopcornView.hitSequenceV276?.(tr)||[];
  for(const wave of sparse(waves,6))for(const p of sparse(ids(wave.ids),3))anchors.push({...p,delay:wave.at,level:wave.index>=3?3:2});
  level=tr.clear?3:1;
 }else if(kind==='jelly'){
  if(phase!=='jellyPour'||!e.trace)return null;
  const tr=e.trace;number=tr.number;anchors=[{id:tr.index}];
  if(tr.ball<=5){for(const id of [...new Set(tr.opened.flat())].filter(id=>id!==tr.index))anchors.push({id,delay:180,level:1});}
  else for(const wave of sparse(tr.wave||[],4))for(const p of sparse(ids(wave),2))if(p.id!==tr.index)anchors.push({...p,delay:window.JellyView.oddsRevealAt(tr)+120,level:2});
  level=tr.newLines?.length?2:1;
 }else if(kind==='stick'){
  if(phase!=='flipping')return null;
  const source=s.placed?.[0];anchors=ids(s.placed);
  for(const [i,step] of (s.flipSteps||[]).entries())anchors.push({id:step.id,delay:235+i*110,from:Number.isInteger(source)?{id:source}:null,level:i>=4?3:2});
  level=s.reversalThisMove?3:1;
 }else if(kind==='castella'||kind==='dango'){
  // These hosts also emit settled while hydrating or changing FREE placement.
  // Only a newly accepted draw inside the real enqueue call is a HIT.
  if(phase!=='settled'||!record.liveDepth||s?.draws?.length<=record.beforeDraws)return null;
  if(kind==='castella'){
   const bake=s.draws.length>5,zone=s.zones?.[(s.lastZone||1)-1];
   anchors=bake?ids([zone?.anchor]):ids(s.sources);
   const spread=bake?s.wave:s.wave?.slice(1);
   for(const [i,wave] of (spread||[]).entries())for(const p of sparse(ids(wave),2))anchors.push({...p,delay:180+i*180,level:bake?2:1});
   level=bake?2:1;
  }else{
   anchors=ids([s.lastCell]);level=s.lastOddsGain||s.newLines?.length?2:1;
   const lines=window.DangoBingoRules.geometryFor?.(s)?.lines||window.DangoBingoRules.geometry?.lines||[];
   for(const [i,lineId] of (s.newLines||[]).slice(0,4).entries())for(const [j,p] of sparse(ids(lines[lineId]?.cells),4).entries())if(p.id!==s.lastCell)anchors.push({...p,delay:180+i*150+j*70,from:{id:s.lastCell},level:2});
  }
 }else return null;
 anchors=anchors.filter(p=>Number.isFinite(p.id)||Number.isFinite(p.r)&&Number.isFinite(p.c));
 if(!anchors.length)return null;
 // Sample large simultaneous clears evenly; do not let one event hide its board.
 anchors=sparse(anchors,MAX_BURSTS).map(p=>({...p,delay:reduced()?0:Math.min(7000,p.delay||0),level:p.level||level}));
 return {phase,number,level,anchors,state};
}
function clear(record){record.bursts=[];record.seen.clear();for(const layer of [record.main,record.mini])if(layer){layer.ctx.clearRect(0,0,layer.canvas.width,layer.canvas.height);layer.canvas.hidden=true;}}
function recordFor(slot){
 let r=records.get(slot);if(r)return r;
 r={slot,version:slot.engine.version,round:app.token,liveDepth:0,beforeDraws:0,restoring:false,bursts:[],seen:new Set(),main:null,mini:null};records.set(slot,r);return r;
}
function receive(slot,ev){
 const r=recordFor(slot),e=slot.engine,kind=kindOf(slot,e);
 if(ev.phase==='ready'||r.version!==e.version||r.round!==app.token){clear(r);r.version=e.version;r.round=app.token;}
 if(app.phase!=='playing'||app.enabled?.[slot.i]===false||app.paused||e.paused||document.hidden||!inView||r.restoring){stats.suppressed++;return;}
 const c=cue(slot,ev,r);if(!c)return;
 const key=[e.version,app.token,c.phase,c.number,e.processed,ev.chain,ev.depth,ev.layer,c.anchors.map(p=>[p.id,p.r,p.c,p.type,p.delay].join(':')).join(',')].join('/');
 if(r.seen.has(key)){stats.suppressed++;return;}r.seen.add(key);if(r.seen.size>256)r.seen.delete(r.seen.values().next().value);
 stats.received++;eventCounts[kind]=(eventCounts[kind]||0)+1;
 const snapshot={game:kind,phase:c.phase,number:c.number??null,level:c.level,anchors:c.anchors.map(p=>({...p})),mainPoints:c.anchors.map(p=>geometry(slot,p,false,c.state)),miniPoints:c.anchors.map(p=>geometry(slot,p,true,c.state))};
 history.push(snapshot);if(history.length>64)history.shift();
 const serialNow=++serial;
 for(const [i,a] of c.anchors.entries())r.bursts.push({anchor:a,state:c.state,phase:c.phase,age:-(a.delay||0),duration:reduced()?300:540+80*a.level,seed:visualHash(key+'/'+i),serial:serialNow,level:a.level,number:c.number});
 // Old effects yield to new physical impacts; delayed trails stay bounded too.
 if(r.bursts.length>MAX_BURSTS)r.bursts.splice(0,r.bursts.length-MAX_BURSTS);
 stats.maxQueued=Math.max(stats.maxQueued,r.bursts.length);wake();
}
function attach(slot,e){
 if(!e||attached.has(e)||!themes[kindOf(slot,e)]||typeof e.emit!=='function')return;
 attached.add(e);const r=recordFor(slot),emit=e.emit;
 e.emit=function(phase,detail={}){
  const result=Reflect.apply(emit,this,arguments);
  try{receive(slot,{phase,...detail});}catch(error){stats.errors++;if(stats.errors===1)console.warn('[HIT v276]',error);}
  return result;
 };
 if(typeof e.enqueueBatch==='function'){
  const enqueue=e.enqueueBatch;
  e.enqueueBatch=function(){r.restoring=false;r.liveDepth++;r.beforeDraws=this.state?.draws?.length||0;try{return Reflect.apply(enqueue,this,arguments);}finally{r.liveDepth--;}};
 }
 if(typeof e.afterCheckpointRestoreV247==='function'){
  const restore=e.afterCheckpointRestoreV247;
  e.afterCheckpointRestoreV247=function(){clear(r);r.restoring=true;return Reflect.apply(restore,this,arguments);};
 }
}
function layer(record,mini){
 const name=mini?'mini':'main';if(record[name])return record[name];
 const parent=mini?record.slot.tab.querySelector('.mini-wrap'):target(record.slot,false)?.parentElement;if(!parent)return null;
 const canvas=document.createElement('canvas');canvas.className='hit-presentation-v276 '+(mini?'hit-presentation-mini':'hit-presentation-main');canvas.setAttribute('aria-hidden','true');canvas.dataset.game=kindOf(record.slot);canvas.hidden=true;
 parent.append(canvas);record[name]={canvas,parent,ctx:canvas.getContext('2d')};return record[name];
}
function star(ctx,x,y,r,angle,color){
 ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4,d=i%2?r*.22:r;if(i)ctx.lineTo(Math.cos(a)*d,Math.sin(a)*d);else ctx.moveTo(d,0);}ctx.closePath();ctx.fillStyle=color;ctx.fill();ctx.restore();
}
function outline(ctx,x,y,r,style,t){
 ctx.beginPath();
 if(style==='flip'){ctx.roundRect(x-r,y-r,r*2,r*2,r*.24);}
 else if(style==='prism'){for(let i=0;i<6;i++){const a=i*TAU/6-Math.PI/2+t*.25;if(i)ctx.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);else ctx.moveTo(x+Math.cos(a)*r,y+Math.sin(a)*r);}ctx.closePath();}
 else if(style==='ripple')ctx.ellipse(x,y,r,r*.72,0,0,TAU);
 else ctx.arc(x,y,r,0,TAU);
}
function paintBurst(ctx,b,p,from,theme,mini){
 const t=clamp(b.age/b.duration),still=reduced(),ease=1-(1-t)**3,fade=(1-t)**1.3,r=Math.max(mini?1.6:4,p.r),level=b.level;
 const ring=r*(still?1.08:.88+ease*(.72+level*.08));
 ctx.save();ctx.globalAlpha=fade*(mini?.92:1);ctx.lineCap=ctx.lineJoin='round';
 // Hollow light follows the rim; the numeral/fruit at the centre stays clear.
 outline(ctx,p.x,p.y,ring,theme.style,t);ctx.lineWidth=Math.max(mini?.9:1.5,r*.15);ctx.strokeStyle=theme.edge;ctx.stroke();
 outline(ctx,p.x,p.y,ring*.94,theme.style,t);ctx.lineWidth=Math.max(mini?.6:.9,r*.058);ctx.strokeStyle=theme.ink;ctx.stroke();
 if(!still&&!mini){
  outline(ctx,p.x,p.y,r*(.8+ease*.35),theme.style,-t);ctx.globalAlpha=fade*.6;ctx.lineWidth=Math.max(.8,r*.045);ctx.strokeStyle='#fff9dc';ctx.stroke();
 }
 if(still){ctx.restore();return 0;}
 if(from&&!mini&&t<.67){
  const q=clamp(t/.67),dx=p.x-from.x,dy=p.y-from.y,cx=(from.x+p.x)/2-dy*.12,cy=(from.y+p.y)/2+dx*.12;
  ctx.globalAlpha=fade*.72;ctx.beginPath();ctx.moveTo(from.x,from.y);ctx.quadraticCurveTo(cx,cy,p.x,p.y);ctx.lineWidth=Math.max(1,r*.07);ctx.strokeStyle=theme.edge;ctx.stroke();
  const xx=(1-q)**2*from.x+2*(1-q)*q*cx+q*q*p.x,yy=(1-q)**2*from.y+2*(1-q)*q*cy+q*q*p.y;star(ctx,xx,yy,r*.24,0,theme.ink);
 }
 const count=mini?4:Math.min(12,6+level*2),painted=!mini&&theme.sprite&&window.SweetsBoardArtV275?.sprite(theme.sprite),seed=b.seed;
 for(let i=0;i<count;i++){
  const a=TAU*i/count+(noise(seed,0)-.5)*.8,dist=r*(1.05+ease*(.6+noise(seed,i+1)*.8)),lift=theme.style==='ripple'?-r*t*.85:theme.style==='crumb'?r*t*t*.42:0;
  const x=p.x+Math.cos(a)*dist,y=p.y+Math.sin(a)*dist*(theme.style==='ripple'?.68:1)+lift,size=r*(mini?.17:.15+noise(seed,i+31)*.12)*(1-t*.5);
  ctx.globalAlpha=fade*(i%2?.9:.8);
  if(painted&&i%3===0){ctx.save();ctx.translate(x,y);ctx.rotate(a+t*(i%2?-2:2));ctx.drawImage(painted,-size,-size,size*2,size*2);ctx.restore();}
  else if(theme.style==='ripple'){ctx.strokeStyle=i%2?theme.ink:'#fff8e8';ctx.lineWidth=Math.max(.7,size*.25);ctx.beginPath();ctx.arc(x,y,size,0,TAU);ctx.stroke();}
  else if(theme.style==='petal'){ctx.save();ctx.translate(x,y);ctx.rotate(a+t);ctx.fillStyle=i%2?theme.ink:'#fff4d4';ctx.beginPath();ctx.ellipse(0,0,size,size*.48,0,0,TAU);ctx.fill();ctx.restore();}
  else star(ctx,x,y,size,a+t, i%2?theme.ink:'#fff7df');
 }
 if(!mini&&level>=2){
  ctx.globalAlpha=fade*.6;ctx.strokeStyle=theme.ink;ctx.lineWidth=r*.055;
  for(let i=0;i<4;i++){const a=i*TAU/4+seed%7;ctx.beginPath();ctx.moveTo(p.x+Math.cos(a)*r*(1.12+ease*.4),p.y+Math.sin(a)*r*(1.12+ease*.4));ctx.lineTo(p.x+Math.cos(a)*r*(1.48+ease*.9),p.y+Math.sin(a)*r*(1.48+ease*.9));ctx.stroke();}
 }
 if(!mini&&level>=2&&!still){
   ctx.globalAlpha=fade*.83;ctx.shadowColor=theme.ink;ctx.shadowBlur=Math.min(9,r*.5);
   for(let k=0;k<2;k++){
    const a=t*TAU*(k?-.78:1.12)+seed*.00009+k*Math.PI;
    star(ctx,p.x+Math.cos(a)*ring,p.y+Math.sin(a)*ring,Math.max(2,r*.13),a,'#fffefa');
   }
 }
 ctx.restore();return count;
}
// Only the selected full-size board receives two small ~9fps idle reflections.
// No game RNG, state writes, mini-board timers or added DOM tiles.
function idleAllowed(record){
 return !reduced()&&!document.hidden&&inView&&!app.paused&&!record.slot.engine.paused&&
  (app.phase==='ready'||app.phase==='playing'||app.phase==='result')&&
  record.slot.i===active&&!record.slot.panel.hidden;
}
function idleAnchor(slot,index){
 const kind=kindOf(slot),state=slot.engine.state;
 const total=({cookie:64,choco:84,candy:70,gelato:19,winery:37,popcorn:61,jelly:25,stick:64,castella:state?.cells?.length||37,dango:state?.cells?.length||28})[kind]||0;
 if(total<=0)return null;const id=index%total;
 if(kind==='cookie')return {r:id>>3,c:id%8};
 if(kind==='choco')return {r:Math.floor(id/7),c:id%7};
 if(kind==='candy'){
  const rows=slot.engine.rows||10,r=Math.floor(id/7)%rows;
  return {r,c:id%Math.max(1,typeof sixRowWidth==='function'?sixRowWidth(r,rows):7)};
 }
 return {id,...(kind==='winery'?{type:'bowl'}:{})};
}
function paintIdle(ctx,record,ox,oy,tw,th,now){
 const kind=kindOf(record.slot),theme=themes[kind],period=2800,step=Math.floor(now/period);
 for(let i=0;i<2;i++){
  const anchor=idleAnchor(record.slot,(step*23+i*17+kind.length*7)>>>0);if(!anchor)continue;
  const p=projected(record.slot,anchor,tw,th,false,record.slot.engine.state);
  if(!p||!Number.isFinite(p.x+p.y+p.r)||p.r<2)continue;
  const phase=(now/period+i*.47)%1,alpha=Math.sin(Math.PI*phase)**2;
  if(alpha<.04)continue;
  const angle=step*.7+i*2.39+phase*.6,r=Math.min(14,Math.max(2.5,p.r*.23));
  const x=ox+p.x+Math.cos(angle)*p.r*.57,y=oy+p.y+Math.sin(angle)*p.r*.57;
  ctx.save();ctx.globalAlpha=.15+.50*alpha;ctx.shadowColor=theme.ink;ctx.shadowBlur=Math.min(7,p.r*.33);
  star(ctx,x,y,r,angle,'#fffefa');ctx.shadowBlur=0;
  ctx.globalAlpha=.21*alpha;ctx.lineWidth=Math.max(.8,p.r*.055);ctx.strokeStyle=theme.edge;
  ctx.beginPath();ctx.arc(ox+p.x,oy+p.y,p.r*.92,angle-.32,angle+.55);ctx.stroke();
  ctx.restore();
 }
 stats.ambientFrames++;
}
function paint(record,mini){
 const slot=record.slot,canvasTarget=target(slot,mini),visible=mini?slot.i!==active:slot.i===active&&!slot.panel.hidden;
 let out=record[mini?'mini':'main'];
 if(!visible||!canvasTarget||canvasTarget.hidden){if(out)out.canvas.hidden=true;return;}
 const bursts=record.bursts.filter(b=>b.age>=0&&b.age<b.duration).slice(-(mini?MAX_MINI:MAX_MAIN));
 const ambient=!mini&&!bursts.length&&idleAllowed(record);
 if(!bursts.length&&!ambient){if(out){out.ctx.clearRect(0,0,out.canvas.width,out.canvas.height);out.canvas.hidden=true;}return;}
 out=layer(record,mini);if(!out)return;
 const parent=out.parent,pr=parent.getBoundingClientRect(),tr=canvasTarget.getBoundingClientRect(),w=parent.clientWidth,h=parent.clientHeight;
 if(!(w>0&&h>0&&pr.width>0&&pr.height>0&&tr.width>0&&tr.height>0)){out.canvas.hidden=true;return;}
 const dpr=Math.min(mini?1.5:2,window.devicePixelRatio||1),pw=Math.max(1,Math.round(w*dpr)),ph=Math.max(1,Math.round(h*dpr));
 if(out.canvas.width!==pw)out.canvas.width=pw;if(out.canvas.height!==ph)out.canvas.height=ph;
 out.canvas.hidden=false;const ctx=out.ctx;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
 const sx=w/pr.width,sy=h/pr.height,ox=(tr.left-pr.left)*sx,oy=(tr.top-pr.top)*sy,tw=tr.width*sx,th=tr.height*sy;
 const theme=themes[kindOf(slot)];let particles=0;
 for(const b of bursts){
  const p=projected(slot,b.anchor,tw,th,mini,b.state);if(!p||!Number.isFinite(p.x+p.y+p.r))continue;
  const from=b.anchor.from?projected(slot,b.anchor.from,tw,th,mini,b.state):null;
  particles+=paintBurst(ctx,b,{x:ox+p.x,y:oy+p.y,r:p.r},from?{x:ox+from.x,y:oy+from.y}:null,theme,mini);stats.drawnBursts++;
 }
 if(mini)stats.maxMiniParticles=Math.max(stats.maxMiniParticles,particles);
 else{
  stats.maxMainParticles=Math.max(stats.maxMainParticles,particles);
  if(ambient)paintIdle(ctx,record,ox,oy,tw,th,performance.now());
 }
}
function tick(now){
 frame=0;const paused=app.paused||document.hidden||!inView,dt=lastStamp?Math.min(100,Math.max(0,now-lastStamp)):0;
 lastStamp=now;let pending=false,idleAny=false;const miniDue=now-miniStamp>=33;
 for(const r of records.values()){
  if(r.version!==r.slot.engine.version||r.round!==app.token||!['playing','ready','result'].includes(app.phase)||document.hidden){clear(r);continue;}
  if(app.phase!=='playing'&&r.bursts.length)clear(r);
  if(!paused&&!r.slot.engine.paused)for(const b of r.bursts)b.age+=dt*Math.max(.25,Number(r.slot.engine.presentationRate)||1);
  r.bursts=r.bursts.filter(b=>b.age<b.duration);pending||=r.bursts.length>0;
  idleAny||=idleAllowed(r);
  if(!paused){paint(r,false);if(miniDue)paint(r,true);}
 }
 if(miniDue)miniStamp=now;stats.renderFrames++;
 if(pending){if(paused)timer=setTimeout(()=>{timer=0;wake();},120);else frame=requestAnimationFrame(tick);}
 else if(idleAny&&!paused){timer=setTimeout(()=>{timer=0;wake();},IDLE_FRAME_MS);}
 else lastStamp=0;
}
function wake(){if(!frame&&!timer){lastStamp=lastStamp||performance.now();frame=requestAnimationFrame(tick);}}
function cancel(){if(frame)cancelAnimationFrame(frame);if(timer)clearTimeout(timer);frame=timer=lastStamp=0;for(const r of records.values())clear(r);}
for(const slot of slots)attach(slot,app.engines[slot.i]);
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();else wake();});
reducedMedia.addEventListener?.('change',cancel);
window.SweetsHitPresentationV276=Object.freeze({
 version:276,attach,
 geometry(kind,anchor,mini=false){const s=slots.find(s=>kindOf(s)===kind);return s?geometry(s,anchor,mini):null;},
 describe(){return {version:276,attached:[...records.keys()].map(s=>kindOf(s)),reducedMotion:reduced(),...stats,eventCounts:{...eventCounts},effectRevision:290,limits:{queuedPerGame:MAX_BURSTS,mainBursts:MAX_MAIN,miniBursts:MAX_MINI,mainParticles:96,miniParticles:16,idleFPS:Math.ceil(1000/IDLE_FRAME_MS),idleCells:2},
  active:JSON.parse(JSON.stringify([...records.values()].filter(r=>r.bursts.length).map(r=>({game:kindOf(r.slot),bursts:r.bursts.map(b=>({phase:b.phase,number:b.number,age:b.age,duration:b.duration,anchor:b.anchor}))})))),history:JSON.parse(JSON.stringify(history))};}
});
wake();
})();

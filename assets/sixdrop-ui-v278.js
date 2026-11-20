/* Six Drop v280 cabinet. Observes the shared rule adapter; never computes a
 * result, advances an engine, changes a carry, or samples game randomness. */
(()=>{
'use strict';
if(window.SixDropUiV278)return;
const query=new URLSearchParams(location.search);
if(query.get('serverSettlementWorker')==='1'||query.get('downloadWorker')==='1')return;
const id=window.SweetsLineup?.ids?.indexOf('candy');if(!(id>=0)||!window.SixDropV247)return;
const slot=slots[id],engine=app.engines[id],rules=window.SixDropV247.rules;
const ART_ROOT='assets/sixdrop-art-v278/';
const ART_FILES=['bottle','allclear-logo','progressive-frame','payout-frame','allclear-award'];
const roles=['line','triangle','hexagon'],labels={line:'直線',triangle:'三角',hexagon:'ヘキサゴン'};
const images=new Map(),errors=[],stats={mainPaints:0,miniPaints:0,receiptEvents:0,allClearBadgePaints:0};
const nodes={roles:new Map()};
let receipt={epoch:'',count:0,win:0,lastWin:0},lastInfo=null,lastRows={};
const money=value=>Math.floor(Math.max(0,Number(value)||0)).toLocaleString('ja-JP',{useGrouping:false});
const putText=(node,text)=>{if(node&&node.textContent!==String(text))node.textContent=String(text);};
const epoch=()=>String(app.token)+'/'+String(engine.version);
const image=id=>{const im=images.get(id);return im?.complete&&im.naturalWidth>0?im:null;};
function info(){
 const shared=window.SixDropV247.describeV278?.();if(shared)return shared;
 const s=engine.state;
 return {rulesRevision:s?.rulesRevision||247,batchSizes:rules.BATCH_SIZES||[3,2,1,1,1],receivedBalls:app.draws?.length||0,
  processedBalls:engine.processed||0,pendingNumbers:[],bankUnits:s?.bankUnits??window.SixDropV247.carry?.bankUnits??0,
  inheritedContinuation:false,earnedContinuation:false,continuationActive:false,
  allClearCount:s?.allClears||0,allClearWin:s?.bonusMedals||0,lastAllClearWin:s?.lastAllClearWin||0,counts:s?.counts||{}};
}
function resetReceipt(){receipt={epoch:epoch(),count:0,win:0,lastWin:0};}
function canonicalReceipt(d){
 if(receipt.epoch!==epoch())resetReceipt();
 receipt.count=Math.max(0,Number(d.allClearCount)||0);receipt.win=Math.max(0,Number(d.allClearWin)||0);
 receipt.lastWin=Math.max(0,Number(d.lastAllClearWin)||0);
}
function observe(event){
 if(receipt.epoch!==epoch())resetReceipt();
 if(event.phase==='ready'){resetReceipt();return;}
 if(event.phase==='pyramidAllClear'){
  receipt.count=Math.max(receipt.count,Number(event.allClears)||receipt.count+1);
  receipt.win=Number.isFinite(event.bonusMedals)?event.bonusMedals:receipt.win+Math.max(0,Number(event.winMedals)||0);
  receipt.lastWin=Math.max(0,Number(event.winMedals)||0);stats.receiptEvents++;
 }else if(['waiting','settled','complete'].includes(event.phase)&&!engine.fx)canonicalReceipt(info());
}
function makeImage(name,className,alt=''){
 const im=document.createElement('img');im.className=className;im.src=ART_ROOT+name+'.png?v=278';im.alt=alt;im.decoding='async';return im;
}
function ensure(){
 if(nodes.heading)return;
 setupCarnivalSlot(slot);document.body.classList.add('sixdrop-v278');slot.panel.classList.add('sd278-surface');
 const heading=document.getElementById('carnival-heading');heading.dataset.ui278='1';
 const hud=document.createElement('div');hud.className='sd278-hud';
 hud.innerHTML='<div class="sd278-progressive"><canvas class="sd278-progressive-frame" width="1248" height="176" aria-hidden="true"></canvas><span class="sd278-bank-logo"></span><strong id="sd278-bank" aria-label="全消し獲得可能金額"></strong><em>WIN</em><b id="sd278-continuation" hidden>継続</b></div><div class="sd278-underbar"><div id="sd278-clear-earned" role="status" hidden><b>全消し獲得済み</b><span>今回 <strong class="sd278-earned-win"></strong> WIN<span class="sd278-earned-count"></span></span></div></div>';
 hud.querySelector('.sd278-bank-logo').append(makeImage('allclear-logo','sd278-clear-logo','全消し'));
 heading.append(hud);
 nodes.heading=heading;nodes.hud=hud;nodes.frame=hud.querySelector('canvas');nodes.bank=hud.querySelector('#sd278-bank');
 nodes.continuation=hud.querySelector('#sd278-continuation');nodes.earned=hud.querySelector('#sd278-clear-earned');nodes.earnedWin=hud.querySelector('.sd278-earned-win');
 nodes.earnedCount=hud.querySelector('.sd278-earned-count');
 const odds=document.createElement('div');odds.id='sd278-payouts';odds.className='sd278-payouts';odds.setAttribute('aria-label','シックスドロップの成立個数別累計配当');
 for(const role of roles){
  const section=document.createElement('section');section.className='sd278-payout-card';section.dataset.role=role;
  section.append(makeImage('payout-frame','sd278-payout-frame'));
  const content=document.createElement('div');content.className='sd278-payout-content';
  content.innerHTML='<header><canvas class="sd278-role-icon" width="168" height="112" role="img" aria-label="'+({line:'同色4個の直線',triangle:'同色6個を1・2・3個に並べた三角',hexagon:'同色6個を輪に並べたヘキサゴン'}[role])+'"></canvas><b>'+labels[role]+'</b><span class="sd278-role-count">×0</span></header><table><thead><tr><th scope="col">個数</th><th scope="col">累計配当</th></tr></thead><tbody></tbody></table>';
  section.append(content);odds.append(section);nodes.roles.set(role,{section,body:content.querySelector('tbody'),count:content.querySelector('.sd278-role-count'),icon:content.querySelector('canvas'),iconSource:null,key:''});
 }
 slot.sixOdds.append(odds);slot.sixOdds.dataset.ui278='1';nodes.odds=odds;
 const viewport=slot.candyCanvas.parentElement;viewport.classList.add('sd278-bottle');
 const bottle=makeImage('bottle','sd278-bottle-art');viewport.append(bottle);nodes.bottle=bottle;
 const removed=document.createElement('div');removed.className='sd280-removed';removed.setAttribute('aria-label','消したドロップ 合計0個');
 removed.innerHTML='<span>消したドロップ</span><span class="sd280-removed-value">合計 <strong id="sd280-removed-total">0</strong><em>個</em></span>';
 viewport.after(removed);nodes.removed=removed;nodes.removedTotal=removed.querySelector('strong');
 const mini=slot.tab.querySelector('.mini-wrap'),badge=document.createElement('span');badge.className='sd278-mini-earned';badge.hidden=true;mini.append(badge);nodes.miniBadge=badge;
}
function amount(node,value,size,width){
 const text=money(value),fitWidth=Math.max(14,Number(width)||node.clientWidth||120),key=text+'/'+size+'/'+Math.floor(fitWidth);
 if(node.dataset.amountFit!==key){node.dataset.amountFit=key;fitGoldenNumber(node,text,size,fitWidth);}
}
function paintFrame(){
 const art=image('progressive-frame');if(!art||nodes.frame.dataset.painted==='1')return;
 const x=nodes.frame.getContext('2d');x.clearRect(0,0,nodes.frame.width,nodes.frame.height);
 // Keep the generated pixels intact; omit only the transparent top/bottom
 // margins from the source rectangle when fitting the cabinet's long strip.
 x.drawImage(art,0,160,art.naturalWidth,395,0,0,nodes.frame.width,nodes.frame.height);nodes.frame.dataset.painted='1';
}
function paintBank(d){
 const source=document.getElementById('sd247-bank'),animated=Number(source?.dataset.displayUnits);
 // A completed zero-WIN game relinquishes its meter. Preserve the canonical
 // state for result/checkpoint records while showing the committed reset.
 const resetAtEnd=Number(engine.processed)>=8&&!engine.running&&!d.earnedContinuation;
 const target=resetAtEnd?0:d.bankUnits,units=resetAtEnd?0:Number.isFinite(animated)?animated:target;
 nodes.bank.dataset.units=String(units);nodes.bank.dataset.targetUnits=String(target);
 nodes.continuation.hidden=!d.continuationActive;
 nodes.continuation.dataset.inherited=String(!!d.inheritedContinuation);nodes.continuation.dataset.earned=String(!!d.earnedContinuation);
 // Size against the available space, not the previous number's width. The
 // logo, live amount and continuation badge stay together in the bottle width.
 const available=d.continuationActive?146:184;
 nodes.bank.style.maxWidth=available+'px';amount(nodes.bank,units/100,29,available);
 nodes.bank.parentElement.setAttribute('aria-label','全消し獲得可能 '+money(target/100)+' WIN'+(d.continuationActive?' 継続':''));
 // Every removed drop adds exactly BET*5 bank units. Reuse that same visual
 // tween so the count and progressive increase together, including pauses,
 // restored games and a changed BET in the next game. No second clock/RNG.
 const state=engine.state,canonical=state?.removedTotal??window.SixDropV247.carry?.removed??0;
 const perDrop=Number(state?.bet)*rules.CREDIT_PER_DROP;
 const displayed=resetAtEnd?0:state&&perDrop>0?Math.max(0,Math.min(canonical,canonical-(state.bankUnits-units)/perDrop)):canonical;
 const removedCount=Math.floor(displayed+1e-7),removedTarget=resetAtEnd?0:canonical;
 nodes.removedTotal.dataset.count=String(removedCount);nodes.removedTotal.dataset.targetCount=String(removedTarget);
 amount(nodes.removedTotal,removedCount,18,136);nodes.removed.setAttribute('aria-label','消したドロップ 合計'+money(removedTarget)+'個');
}
function paintReceipt(){
 const earned=receipt.count>0;nodes.earned.hidden=!earned;
 nodes.earned.dataset.count=String(receipt.count);nodes.earned.dataset.win=String(receipt.win);nodes.earned.dataset.lastWin=String(receipt.lastWin);
 amount(nodes.earnedWin,receipt.win,12,nodes.earnedWin.clientWidth||78);putText(nodes.earnedCount,'・'+receipt.count+'回');
 nodes.earned.setAttribute('aria-label',earned?'全消し獲得済み。今回 '+money(receipt.win)+' WIN、'+receipt.count+'回':'全消し未獲得');
 nodes.hud.classList.toggle('has-clear',earned);
 nodes.miniBadge.hidden=!earned;putText(nodes.miniBadge,'全消し獲得'+(receipt.count>1?' ×'+receipt.count:''));
 nodes.miniBadge.dataset.count=String(receipt.count);nodes.miniBadge.dataset.win=String(receipt.win);
 nodes.miniBadge.title='全消し獲得済み '+money(receipt.win)+' WIN・'+receipt.count+'回';
}
function paintRoleDiagram(role,record){
 const color={line:3,triangle:8,hexagon:7}[role],sprite=sixArtCandySprite(color,1,false,false);
 if(!sprite||record.iconSource===sprite)return;record.iconSource=sprite;
 // Read the real staggered-grid patterns. A triangle is six drops in 1/2/3
 // rows; a hexagon is the six neighbours around an empty centre.
 const cells=role==='line'?[[4,1],[4,2],[4,3],[4,4]]:sixPatterns(10).find(pattern=>pattern.type===role).cells;
 const points=cells.map(([r,c])=>sixPoint(r,c,10)),xs=points.map(p=>p.x),ys=points.map(p=>p.y);
 const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
 const cv=record.icon,x=cv.getContext('2d'),step=Math.min((cv.width-12)/(maxX-minX+1),(cv.height-12)/(maxY-minY+1));
 x.clearRect(0,0,cv.width,cv.height);record.icon.dataset.drops=String(cells.length);
 for(const p of points){const cx=cv.width/2+(p.x-(minX+maxX)/2)*step,cy=cv.height/2+(p.y-(minY+maxY)/2)*step;
  x.drawImage(sprite,cx-step*.5,cy-step*.5,step,step);
 }
}
function paintTables(d){
 const counts=engine.fx?.counts||d.counts||{},bet=app.bet(id)||0;
 for(const role of roles){
  const record=nodes.roles.get(role),count=Math.max(0,Math.floor(Number(counts[role])||0));paintRoleDiagram(role,record);
  const first=count<5?1:count-3,list=Array.from({length:5},(_,i)=>first+i);
  const rows=list.map(n=>{const hundredths=typeof rules.roleTotal==='function'?rules.roleTotal(role,n,engine.state||rules.CURRENT_REVISION):rules.roleAward(role,0,n);return {count:n,hundredths,win:Math.floor(bet*hundredths/100)};});
  const key=[bet,count,engine.state?.rulesRevision||rules.CURRENT_REVISION,record.section.clientWidth,...rows.map(row=>row.hundredths)].join('/');
  if(record.key===key)continue;record.key=key;record.section.dataset.earnedCount=String(count);putText(record.count,'×'+count);record.body.replaceChildren();
  for(const row of rows){
   const tr=document.createElement('tr');tr.dataset.count=String(row.count);tr.dataset.payoutHundredths=String(row.hundredths);tr.dataset.win=String(row.win);
   tr.classList.toggle('is-earned',row.count<=count);tr.classList.toggle('is-current',row.count===count);tr.classList.toggle('is-next',row.count===count+1);
   if(row.count===count)tr.setAttribute('aria-current','true');
   const number=document.createElement('th');number.scope='row';number.textContent='×'+row.count;
   const value=document.createElement('td'),span=document.createElement('span');span.className='sd278-table-amount';value.append(span);tr.append(number,value);record.body.append(tr);
   amount(span,row.win,11,span.clientWidth||62);
  }
  lastRows[role]={count,rows};
 }
}
function refresh(){
 ensure();const d=info();lastInfo=d;
 if(receipt.epoch!==epoch())resetReceipt();
 if(!engine.fx&&!engine.busy)canonicalReceipt(d);
 paintFrame();paintBank(d);paintReceipt();paintTables(d);stats.mainPaints++;
 slot.candyCanvas.dataset.presentation='v280';
 slot.candyCanvas.setAttribute('aria-label','シックスドロップ。'+(d.receivedBalls||0)+'球抽選済み。消したドロップ合計'+nodes.removedTotal.dataset.targetCount+'個。'+(receipt.count?'全消し獲得済み '+money(receipt.win)+' WIN。':''));
}

// Fit the existing candies inside the generated bottle's clear window. Every
// renderer, fall path, reach and award uses these same native coordinates.
sixLayout=function(rows=SIX_ROWS){
 const count=Math.max(1,Number(rows)||SIX_ROWS),step=Math.min(29.5,259.5/(1+(count-1)*SIX_SQRT3_2));
 return {step,top:158-(count-1)*step*SIX_SQRT3_2/2,radius:step*.5};
};
// The generated bottle already contains its glass highlights. Retire the
// previous canvas rectangle as well as the old CSS bottle ornaments.
const clearBackdrop=document.createElement('canvas');clearBackdrop.width=clearBackdrop.height=320;
sixArtBackdrop=()=>clearBackdrop;
const previousHud=carnivalHud,previousDraw=drawCarnival,previousEvent=carnivalEvent,previousThumbnail=paintSixThumbnail;
carnivalHud=function(a){const result=Reflect.apply(previousHud,this,arguments);refresh();return result;};
drawCarnival=function(s,now){const result=Reflect.apply(previousDraw,this,arguments);if(s?.i===id)refresh();return result;};
carnivalEvent=function(s,event,e,a){
 if(s?.i===id)observe(event);
 const result=Reflect.apply(previousEvent,this,arguments);if(s?.i===id)refresh();return result;
};
paintSixThumbnail=function(s,rows){
 const result=Reflect.apply(previousThumbnail,this,arguments),art=image('bottle');
 if(s?.i===id&&art){
  const ctx=s.mini,w=ctx.canvas.width,h=ctx.canvas.height,edge=Math.min(w,h)*.045;
  // Compress the generated glass border into the miniature's outer rim.
  // This retains its ribbon/candy ornaments without moving native numbers,
  // HIT projections or award paths, and adds no miniature scene background.
  const sx=[0,art.naturalWidth*.14,art.naturalWidth*.86,art.naturalWidth],sy=[0,art.naturalHeight*.14,art.naturalHeight*.90,art.naturalHeight];
  const dx=[0,edge,w-edge,w],dy=[0,edge,h-edge,h];
  ctx.save();ctx.setTransform(1,0,0,1,0,0);
  for(let r=0;r<3;r++)for(let c=0;c<3;c++)if(r!==1||c!==1)ctx.drawImage(art,sx[c],sy[r],sx[c+1]-sx[c],sy[r+1]-sy[r],dx[c],dy[r],dx[c+1]-dx[c],dy[r+1]-dy[r]);
  ctx.restore();stats.miniPaints++;
 }
 return result;
};
const api={version:280,ready:null,
 awardArt:()=>({image:image('allclear-award'),logo:image('allclear-logo'),layout:{x:.19,y:.34,w:.62,h:.36,ribbonY:.79,ribbonWidth:.40},onPaint:()=>{stats.allClearBadgePaints++;}}),
 describe:()=>({version:280,artLoaded:ART_FILES.every(name=>!!image(name)),imageFiles:ART_FILES.map(name=>ART_ROOT+name+'.png'),errors:errors.slice(),
  receipt:{...receipt},progressive:{units:Number(nodes.bank?.dataset.units)||0,targetUnits:Number(nodes.bank?.dataset.targetUnits)||0},
  removed:{count:Number(nodes.removedTotal?.dataset.count)||0,targetCount:Number(nodes.removedTotal?.dataset.targetCount)||0},
  continuation:!!lastInfo?.continuationActive,batchSizes:(lastInfo?.batchSizes||[3,2,1,1,1]).slice(),receivedBalls:lastInfo?.receivedBalls||0,processedBalls:lastInfo?.processedBalls||0,
  roles:JSON.parse(JSON.stringify(lastRows)),geometry:{...sixLayout(engine.rows||10)},...stats})};
window.SixDropUiV278=api;
api.ready=Promise.all(ART_FILES.map(name=>new Promise(resolve=>{
 const im=new Image();im.decoding='async';images.set(name,im);
 im.onload=()=>resolve(true);im.onerror=()=>{errors.push('Missing '+ART_ROOT+name+'.png');resolve(false);};im.src=ART_ROOT+name+'.png?v=278';
}))).then(()=>{refresh();slot.candyKey='';slot.sixReachKey='';slot.dirtyMain=slot.dirtyMini=true;carnivalQueueFrame(slot);return ART_FILES.every(name=>!!image(name));});
Object.freeze(api);
window.addEventListener('resize',()=>{for(const item of nodes.roles.values())item.key='';refresh();});
document.fonts?.ready?.then(()=>{for(const item of nodes.roles.values())item.key='';refresh();});
refresh();slot.candyKey='';slot.sixReachKey='';slot.dirtyMain=slot.dirtyMini=true;carnivalQueueFrame(slot);scheduleUI(app);
if(typeof requestFit==='function')requestFit();
})();

/* v238: side station cards, cached next-HIT increases, actual earned awards.
 * Metadata only: no new prediction simulation, WebGL renderer or video stream. */
(()=>{
'use strict';
if(window.SweetsStationsV235)return;
const FALLBACK='assets/pets/strawberry-mochi.png',FLAVORS=['strawberry','vanilla','mint','chocolate','grape'];
const GAME_NAMES={cookie:'クッキーリンク',choco:'チョコレートキャニオン',candy:'シックスドロップ',gelato:'ジェラートプリズム',winery:'ワイナリーピラミッド',popcorn:'ポップコーンスプラッシュ',jelly:'ジェリービンゴ',stick:'ワッフルリバーシ',castella:'パーティカステラ'};
const params=new URLSearchParams(location.search),monitor=!!document.getElementById('host-frame');
if(!monitor&&(params.get('serverHost')==='1'||params.get('serverSettlementWorker')==='1'))return;
let savedMachine='';try{savedMachine=localStorage.getItem('sweets-shared-machine-v176')||'';}catch{}
const machine=String(params.get('machine')||savedMachine||'public-01').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,64)||'public-01';
const cards=new Map(),photos=new Map(),awards=new WeakMap(),observed=new WeakSet();
let roster=null,client=null,root=null,selfLabel=null,timer=0,disposed=false,lastSocket=null,profileKey='',lastProfileAt=0,lastProgress='',lastProgressAt=0,lastHelloAt=0,fetching=false,resizeObserver=null;
const amount=value=>{const n=Number(value);return Number.isFinite(n)?Math.min(1e12,Math.max(0,n)):0;};
const make=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
const setText=(el,text)=>{text=String(text);if(el.textContent!==text)el.textContent=text;};
const fmt=value=>Math.floor(amount(value)).toLocaleString('ja-JP');
function card(station){
 if(cards.has(station))return cards.get(station);
 const node=make('article','station-card-v235'),img=make('img'),id=make('b','station-id'),name=make('span','station-name'),win=make('b','station-win');
 const best=make('div','station-best'),number=make('b','station-best-number'),gain=make('b','station-best-gain'),state=make('span','station-state');
 img.alt='お菓子アバター';best.append(number,gain);node.append(img,id,name,win,best,state);
 const result={node,img,id,name,win,best,number,gain,state,key:''};cards.set(station,result);return result;
}
function mount(){
 if(root?.isConnected)return true;
 if(monitor){
  const frame=document.getElementById('host-frame');if(!frame)return false;
  // Keep the live physical-host iframe in its original parent and position.
  // Reparenting it would reload the draw machine.
  frame.parentNode?.classList.add('station-host-card-v238');
  const section=make('section','stations-monitor-v235'),head=make('header'),title=make('h3','','STATION PLAYERS · 6席');
  head.append(title);root=make('div','station-list');
  const note=make('p','station-note','実プレイヤーのみ · ＋は次の番号による増加見込み · 獲得状態とリーチは別表示');
  section.append(head,root,note);frame.after(section);selfLabel=note;
 }else{
  const arena=document.querySelector('#screen>.arena');if(!arena)return false;
  arena.classList.add('stations-reserved-v235');root=make('aside','stations-strip-v235');root.setAttribute('aria-label','同じ抽選機の他プレイヤー・次HIT最大増加');
  selfLabel=make('span','station-self-v235','ST 接続中');arena.append(root,selfLabel);
  if(typeof ResizeObserver==='function'){
   resizeObserver=new ResizeObserver(entries=>{const h=entries[0]?.contentRect?.height||0;arena.dataset.stationDensity=h&&h<255?'compact':'normal';});
   resizeObserver.observe(arena);
  }
 }
 return true;
}
function accept(value){
 if(!value||value.version<235||value.machineId!==machine||!Array.isArray(value.seats))return;
 if(roster&&Number(value.revision)<Number(roster.revision))return;
 for(const s of value.seats)if(s.playerId&&typeof s.photo==='string')photos.set(s.playerId,s.photo);
 roster=value;paint();
}
function rowPresentation(row){
 const detail=row.detail?.version===238&&row.detail.roundId===row.roundId?row.detail:null;
 let label=row.empty?'空席':!row.connected?'再接続待ち':row.phase==='WAITING'?'次ゲーム待ち':row.phase==='BETTING'?'BET TIME':row.settled?'精算完了':row.phase==='COMPLETE'?'抽選終了':'プレイ中';
 let tier=0;
 if(!row.empty&&row.connected&&row.phase!=='WAITING'&&row.phase!=='BETTING'){
  tier=row.settled&&amount(row.win)===0?0:Math.min(3,Math.max(0,Number(detail?.achievedTier)||0));
  if(tier)label=['','高配当獲得','超高配当獲得','最高役獲得'][tier];
  else if(detail?.paused&&!row.settled)label='演出一時停止';
 }
 const best=!row.empty&&row.connected&&!row.settled&&row.phase==='PLAYING'&&detail?.prediction==='ready'?detail.best:null;
 const numbers=Array.isArray(best?.numbers)?best.numbers.filter(n=>Number.isInteger(n)&&n>=1&&n<=25):[];
 const gain=amount(best?.gain);
 const predictionText=row.empty?'':row.phase==='WAITING'||row.phase==='BETTING'?'次HIT待ち':row.settled||row.phase==='COMPLETE'?'抽選終了':detail?.prediction==='none'?'増加なし':'更新中';
 const roleNames=(detail?.highestGames||[]).map(id=>GAME_NAMES[id]).filter(Boolean);
 return {label,tier,number:numbers.length&&gain>0?numbers[0]+'番'+(numbers.length>1?'ほか'+(numbers.length-1):''):predictionText,
  gain:numbers.length&&gain>0?'＋'+fmt(gain):'',
  bestTitle:numbers.length&&gain>0?'次の'+numbers.join('・')+'番で、全ゲーム合計 ＋'+fmt(gain)+' WIN（現在からの増加見込み）'+(best.tier===3?'／最高役リーチ':''):'次のHITで最も配当が増える番号。盤面更新中と抽選終了後は表示しません。',
  stateTitle:label+(roleNames.length?'：'+roleNames.join('・'):'')+(tier===1?'（いずれかのゲームで3倍以上）':tier===2?'（いずれかのゲームで10倍以上）':'')};
}
function paint(){
 if(!mount()||!roster)return;
 const own=client?.playerId,seat=roster.seats.find(s=>s.playerId===own);
 if(!monitor)setText(selfLabel,seat?'あなた st.'+seat.station:client?.online?'満席・観戦中':'再接続中');
 const list=monitor?roster.seats:roster.seats.filter(s=>s.playerId!==own).slice(0,seat?5:6);
 const visible=new Set();
 for(let i=0;i<list.length;i++){
  const row=list[i],c=card(row.station);visible.add(row.station);
  c.node.style.gridColumn=i%2?'3':'1';c.node.style.gridRow=String(Math.floor(i/2)+1);
  const photo=photos.get(row.playerId)||'',hue=photo?0:Math.max(0,FLAVORS.indexOf(row.pet?.flavor))*55,p=rowPresentation(row);
  const key=JSON.stringify([row,photo,hue,p]);
  if(c.key!==key){
   c.key=key;c.fitWidth=0;c.node.dataset.empty=row.empty?'1':'0';c.node.dataset.offline=!row.empty&&!row.connected?'1':'0';c.node.dataset.self=row.playerId===own?'1':'0';c.node.dataset.award=String(p.tier);
   c.id.replaceChildren(document.createTextNode('st.'+row.station));if(row.test)c.id.append(make('small','station-test','TEST'));
   setText(c.name,row.empty?'空席':row.name||'プレイヤー');c.name.title=row.empty?'空席':row.name||'';
   const src=photo||FALLBACK;if(c.img.getAttribute('src')!==src)c.img.src=src;
   c.img.style.filter=hue?'hue-rotate('+hue+'deg)':'none';c.img.hidden=!!row.empty;
   setText(c.win,row.empty?'':fmt(row.win)+' WIN');
   c.win.title=row.empty?'':row.settled?'今回の確定WIN':'今回の獲得WIN（進行中）';
   setText(c.number,p.number);setText(c.gain,p.gain);c.best.title=p.bestTitle;c.best.dataset.tier=String(row.detail?.best?.tier||0);
   setText(c.state,p.label);c.state.title=p.stateTitle;
   c.node.setAttribute('aria-label','st.'+row.station+' '+(row.empty?'空席':(row.name||'')+' '+fmt(row.win)+' WIN、'+p.stateTitle+'、'+(p.gain?p.bestTitle:p.number)));
  }
  if(c.node.parentNode!==root)root.append(c.node);
  const width=c.win.clientWidth;
  if(width>0&&width!==c.fitWidth){const size=monitor?18:11;c.win.style.fontSize=size+'px';if(c.win.scrollWidth>width)c.win.style.fontSize=Math.max(monitor?10:7,size*(width-1)/c.win.scrollWidth).toFixed(2)+'px';c.fitWidth=width;}
 }
 for(const [station,c] of cards)if(!visible.has(station))c.node.remove();
 for(const row of list){const node=cards.get(row.station).node,next=root.children[list.indexOf(row)];if(next!==node)root.insertBefore(node,next||null);}
}
function profile(){let saved={};try{saved=JSON.parse(localStorage.getItem('sweets-player-v1')||'{}');}catch{}return {name:saved.name||'プレイヤー',pet:saved.pet||{}};}
function thumbnail(){
 try{
  const source=document.getElementById('avatar');if(!source?.width||!source?.height)return '';
  const canvas=document.createElement('canvas');canvas.width=64;canvas.height=72;const ctx=canvas.getContext('2d');ctx.drawImage(source,0,0,64,72);
  const pixels=ctx.getImageData(0,0,64,72).data;let alpha=0;for(let i=3;i<pixels.length;i+=4)alpha+=pixels[i];if(alpha<255*40)return '';
  const data=canvas.toDataURL('image/png');return data.length<=24000?data:'';
 }catch{return '';}
}
function currentWin(a,round,active,calculate){
 if(!a||a.phase==='ready'||!round?.participant||round.phase==='BETTING'||active?.roundId!==round.id)return null;
 let earned=0;
 for(let index=0;index<(a.engines||[]).length;index++){
  if(a.enabled?.[index]===false)continue;
  const engine=a.engines[index],bet=amount(a.locked?.[index]??a.bets?.[index]);if(bet<=0)continue;
  let win=amount(a.roundWins?.[index]);
  if(!a.paid?.[index]&&typeof calculate==='function'){try{win=amount(calculate(bet,amount(engine?.totalHundredths)));}catch{}}
  earned+=win;
 }
 const paid=(Array.isArray(a.roundWins)?a.roundWins:[]).reduce((sum,value,index)=>sum+(a.enabled?.[index]===false?0:amount(value)),0);
 return Math.min(1e12,Math.floor(Math.max(earned,paid,amount(a.totalWin))));
}
function observeAward(a,e){
 if(!a||!e)return null;
 const depth=amount(e.bonusResolvedDepth);let r=awards.get(e);
 if(!r||r.version!==e.version||r.token!==a.token){
  const baseline=r&&r.version===e.version?r.resolved:depth;
  r={version:e.version,token:a.token,resolved:baseline,highest:false};awards.set(e,r);
 }
 if(a.phase==='ready'||e.phase==='ready'){r.highest=false;r.resolved=depth;return r;}
 if(e.kind==='choco'){
  if(depth>r.resolved&&depth>=500&&depth%100===0)r.highest=true;
  r.resolved=Math.max(r.resolved,depth);
 }else if(e.kind==='popcorn')r.highest=r.highest||Number(e.state?.clears??e.allClears)>=3;
 else if(e.kind==='candy')r.highest=r.highest||e.pyramidCleared===true;
 else if(Number(e.allClears)>0||e.state?.highestRole===true)r.highest=true;
 return r;
}
function attachAwards(a){
 for(const e of a?.engines||[]){
  observeAward(a,e);
  if(!e||observed.has(e)||typeof e.emit!=='function')continue;
  observed.add(e);const original=e.emit;
  // Observe actual events only. This preserves the return value, arguments,
  // physics, RNG and original event handler, including its exceptions.
  e.emit=function(...args){const result=original.apply(this,args);try{observeAward(a,this);}catch{}return result;};
 }
}
function currentDetail(a,round,active,boardSlots,readCache,calculate){
 if(!a||!round?.participant||active?.roundId!==round.id||a.phase==='ready'||round.phase==='BETTING')return null;
 const balls=Array.isArray(round.balls)?round.balls:[],used=new Set(balls.map(b=>Number(b.number)));
 const localDraws=Array.isArray(a.draws)?a.draws:[],count=balls.length;
 const detail={version:238,roundId:round.id,ballCount:count,prediction:'updating',best:null,achievedTier:0,highestGames:[],paused:!!a.paused};
 const sums=new Map();let pending=false,eligible=0;
 for(let i=0;i<(a.engines||[]).length;i++){
  if(a.enabled?.[i]===false)continue;
  const e=a.engines[i],bet=amount(a.locked?.[i]??a.bets?.[i]);if(!e||bet<=0)continue;
  const award=observeAward(a,e),hundredths=a.paid?.[i]?amount(a.roundWins?.[i])*100/bet:amount(e.totalHundredths);
  detail.achievedTier=Math.max(detail.achievedTier,hundredths>=1000?2:hundredths>=300?1:0);
  if(award?.highest){detail.achievedTier=3;const id=e.kind||'cookie';if(GAME_NAMES[id]&&!detail.highestGames.includes(id))detail.highestGames.push(id);}
  if(a.paid?.[i]||count>=8||round.phase!=='PLAYING')continue;
  eligible++;
  const s=(boardSlots||[]).find(slot=>slot?.engine===e);
  let entries=null;
  if(s&&s.tabReachVersion===e.version&&s.reachStatus==='ready')try{entries=readCache?.(s,a);}catch{}
  if(!Array.isArray(entries)){pending=true;continue;}
  // Each game may list only increasing numbers. Missing entries add zero.
  // Convert total and baseline independently to preserve medal rounding.
  const perGame=new Map(),base=amount(s.tabReachBase);
  for(const hit of entries){
   const n=Number(hit?.number);if(!Number.isInteger(n)||n<1||n>25||used.has(n))continue;
   let gain=0;try{gain=amount(calculate(bet,amount(hit.total)))-amount(calculate(bet,base));}catch{pending=true;continue;}
   if(!(gain>0))continue;
   const tier=Math.min(3,Math.max(0,Math.floor(Number(hit.tier)||0))),old=perGame.get(n);
   if(!old||gain>old.gain)perGame.set(n,{gain,tier});
  }
  for(const [n,item] of perGame){const old=sums.get(n)||{gain:0,tier:0};sums.set(n,{gain:Math.min(1e12,old.gain+item.gain),tier:Math.max(old.tier,item.tier)});}
 }
 if(count>=8||round.phase==='COMPLETE'||round.participant.settlement){detail.prediction='complete';return detail;}
 // Do not label a partial set of game predictions as the global maximum.
 if(pending||localDraws.length!==count||localDraws.some(n=>!used.has(Number(n)))||a.paused||!eligible)return detail;
 const largest=Math.max(0,...[...sums.values()].map(v=>v.gain));
 if(largest>0){
  const numbers=[...sums].filter(([,v])=>v.gain===largest).map(([n])=>n).sort((a,b)=>a-b);
  detail.prediction='ready';detail.best={numbers,gain:Math.floor(largest),tier:Math.max(...numbers.map(n=>sums.get(n).tier))};
 }else detail.prediction='none';
 return detail;
}
function readReachCache(s,a){
 if(s.engine?.kind==='choco'){
  if(typeof chocoReachReady!=='function'||!chocoReachReady(s,a))return null;
 }else if(typeof reachAvailable!=='function'||!reachAvailable(s,a))return null;
 return typeof visibleTabReachResults==='function'?visibleTabReachResults(s,a):null;
}
function playerTick(){
 if(disposed)return;
 if(!client){client=window.SweetsSharedMachine?.client;if(client)client.on(message=>{if(message.stations)accept(message.stations);if(message.type==='snapshot'&&client.ws!==lastSocket)lastSocket=null;});}
 const a=(()=>{try{return typeof app==='undefined'?null:app;}catch{return null;}})();
 attachAwards(a);
 if(client?.online){
  const t=Date.now(),p=profile(),key=JSON.stringify(p),newSocket=client.ws!==lastSocket;
  if(newSocket){lastSocket=client.ws;roster=null;profileKey='';lastProgress='';}
  if((newSocket||key!==profileKey||!roster||t-lastProfileAt>15000)&&t-lastHelloAt>=2000){p.photo=thumbnail();if(client.send({type:'station_hello',profile:p})){profileKey=key;lastProfileAt=t;lastHelloAt=t;}}
  const round=client.round,active=window.SweetsSharedMachine?.active,calculate=typeof medalWin==='function'?medalWin:null;
  const win=currentWin(a,round,active,calculate);
  if(win!==null){
   const boardSlots=typeof slots==='undefined'?[]:slots,detail=currentDetail(a,round,active,boardSlots,readReachCache,calculate),stamp=JSON.stringify([round.id,win,detail]);
   if((stamp!==lastProgress||t-lastProgressAt>=8000)&&client.send({type:'station_progress',roundId:round.id,win,detail})){lastProgress=stamp;lastProgressAt=t;}
  }
 }
 paint();timer=setTimeout(playerTick,1000);
}
const adminUrl=()=>'/api/admin/machines/'+encodeURIComponent(machine)+'/stations'+(params.get('adminToken')?'?adminToken='+encodeURIComponent(params.get('adminToken')):'');
async function poll(){
 if(disposed||fetching)return;fetching=true;
 try{const response=await fetch(adminUrl(),{cache:'no-store'});if(response.ok){const data=await response.json();roster=null;accept(data.stations);}}
 catch{}finally{fetching=false;if(!disposed)timer=setTimeout(poll,2000);}
}
window.SweetsStationsV235={accept,get roster(){return roster;},paint,currentWin,currentDetail,rowPresentation};
mount();if(monitor)poll();else playerTick();
addEventListener('beforeunload',()=>{disposed=true;clearTimeout(timer);resizeObserver?.disconnect();},{once:true});
})();

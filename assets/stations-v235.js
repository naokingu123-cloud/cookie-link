/* Six-seat roster: DOM updates only, no extra video or 3D renderers. */
(()=>{
'use strict';
if(window.SweetsStationsV235)return;
const FALLBACK='assets/pets/strawberry-mochi.png',FLAVORS=['strawberry','vanilla','mint','chocolate','grape'];
const params=new URLSearchParams(location.search),monitor=!!document.getElementById('host-frame');
if(!monitor&&(params.get('serverHost')==='1'||params.get('serverSettlementWorker')==='1'))return;
const machine=String(params.get('machine')||localStorage.getItem('sweets-shared-machine-v176')||'public-01').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,64)||'public-01';
const cards=new Map(),photos=new Map();let roster=null,client=null,root=null,selfLabel=null,timer=0,disposed=false,lastSocket=null,profileKey='',lastProfileAt=0,lastProgress='',lastHelloAt=0,fetching=false;
const make=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
const setText=(el,text)=>{text=String(text);if(el.textContent!==text)el.textContent=text;};
function card(station){
 if(cards.has(station))return cards.get(station);
 const node=make('article','station-card-v235'),img=make('img'),id=make('b','station-id'),name=make('span','station-name'),win=make('b','station-win');
 img.alt='お菓子アバター';node.append(img,id,name,win);const result={node,img,id,name,win,key:''};cards.set(station,result);return result;
}
function mount(){
 if(root?.isConnected)return true;
 if(monitor){
  const frame=document.getElementById('host-frame');if(!frame)return false;
  const section=make('section','stations-monitor-v235'),head=make('header'),title=make('h3','','STATION PLAYERS · 6席'),controls=make('div');
  for(const [label,count] of [['テスト参加5名',5],['テスト参加OFF',0]]){const button=make('button','',label);button.type='button';button.onclick=()=>configure(count,button);controls.append(button);}
  head.append(title,controls);root=make('div','station-list');
  const note=make('p','station-note','TESTは共通8球で遊ぶジェリービンゴの疑似参加者です。実プレイヤーのCREDIT・PO集計には含めません。');
  section.append(head,root,note);frame.after(section);selfLabel=note;
 }else{
  const arena=document.querySelector('#screen>.arena');if(!arena)return false;
  arena.classList.add('stations-reserved-v235');root=make('aside','stations-strip-v235');root.setAttribute('aria-label','同じ抽選機の他プレイヤー');
  selfLabel=make('span','station-self-v235','ST 接続中');arena.append(root,selfLabel);
 }
 return true;
}
function accept(value){
 if(!value||value.version<235||value.machineId!==machine||!Array.isArray(value.seats))return;
 if(roster&&Number(value.revision)<Number(roster.revision))return;
 for(const s of value.seats)if(s.playerId&&typeof s.photo==='string')photos.set(s.playerId,s.photo);
 roster=value;paint();
}
function paint(){
 if(!mount()||!roster)return;
 const own=client?.playerId,seat=roster.seats.find(s=>s.playerId===own);
 if(!monitor)setText(selfLabel,seat?'あなた st.'+seat.station:client?.online?'満席・観戦中':'再接続中');
 const list=monitor?roster.seats:roster.seats.filter(s=>s.playerId!==own).slice(0,seat?5:6);
 if(!monitor)root.style.gridTemplateColumns='repeat('+Math.max(1,list.length)+',minmax(0,1fr))';
 const visible=new Set();
 for(const row of list){
  const c=card(row.station);visible.add(row.station);
  const photo=photos.get(row.playerId)||'',hue=photo?0:Math.max(0,FLAVORS.indexOf(row.pet?.flavor))*55;
  const key=JSON.stringify([row,photo,hue]);
  if(c.key!==key){
   c.key=key;c.fitWidth=0;c.node.dataset.empty=row.empty?'1':'0';c.node.dataset.offline=!row.empty&&!row.connected?'1':'0';c.node.dataset.self=row.playerId===own?'1':'0';
   c.id.replaceChildren(document.createTextNode('st.'+row.station));if(row.test)c.id.append(make('small','station-test','TEST'));
   setText(c.name,row.empty?'空席':row.name||'プレイヤー');c.name.title=row.empty?'空席':row.name||'';
   const src=photo||FALLBACK;if(c.img.getAttribute('src')!==src)c.img.src=src;
   c.img.style.filter=hue?'hue-rotate('+hue+'deg)':'none';c.img.hidden=!!row.empty;
   const amount=Math.max(0,Math.floor(Number(row.win)||0));setText(c.win,row.empty?'':amount.toLocaleString('ja-JP')+' WIN');
   c.node.setAttribute('aria-label','st.'+row.station+' '+(row.empty?'空席':(row.name||'')+(row.test?' テスト参加':'')+' '+amount+' WIN'+(!row.connected?' 再接続待ち':'')));
  }
  if(c.node.parentNode!==root)root.append(c.node);
  const width=c.win.clientWidth;
  if(width>0&&width!==c.fitWidth){const size=monitor?17:10;c.win.style.fontSize=size+'px';if(c.win.scrollWidth>width)c.win.style.fontSize=(size*(width-1)/c.win.scrollWidth).toFixed(2)+'px';c.fitWidth=width;}
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
function playerTick(){
 if(disposed)return;
 if(!client){client=window.SweetsSharedMachine?.client;if(client)client.on(message=>{if(message.stations)accept(message.stations);if(message.type==='snapshot'&&client.ws!==lastSocket)lastSocket=null;});}
 if(client?.online){
  const t=Date.now(),p=profile(),key=JSON.stringify(p),newSocket=client.ws!==lastSocket;
  if(newSocket){lastSocket=client.ws;roster=null;profileKey='';lastProgress='';}
  if((newSocket||key!==profileKey||!roster||t-lastProfileAt>15000)&&t-lastHelloAt>=2000){p.photo=thumbnail();if(client.send({type:'station_hello',profile:p})){profileKey=key;lastProfileAt=t;lastHelloAt=t;}}
  // Only the current local game's earned WIN; never the previous result or a reach prediction.
  const a=(()=>{try{return typeof app==='undefined'?null:app;}catch{return null;}})(),round=client.round,active=window.SweetsSharedMachine?.active;
  if(a&&round?.participant&&round.phase!=='BETTING'&&active?.roundId===round.id){
   const win=Math.max(0,Number(a.totalWin)||0,(Array.isArray(a.roundWins)?a.roundWins:[]).reduce((sum,v)=>sum+(Number(v)||0),0)),stamp=round.id+'|'+Math.floor(win);
   if(stamp!==lastProgress&&client.send({type:'station_progress',roundId:round.id,win:Math.floor(win)}))lastProgress=stamp;
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
async function configure(count,button){
 button.disabled=true;
 try{const url=adminUrl().replace('/stations','/stations/demo'),response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({count})});const data=await response.json();if(!response.ok)throw Error(data.error);roster=null;accept(data.stations);}
 catch(error){setText(selfLabel,'テスト参加の変更に失敗しました: '+String(error.message||error));}finally{button.disabled=false;}
}
window.SweetsStationsV235={accept,get roster(){return roster;},paint};
mount();if(monitor)poll();else playerTick();
addEventListener('beforeunload',()=>{disposed=true;clearTimeout(timer);},{once:true});
})();

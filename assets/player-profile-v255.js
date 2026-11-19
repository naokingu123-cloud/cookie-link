/* Same server player profile in both editions; local storage is only a cache. */
(()=>{
'use strict';
if(window.SweetsPlayerProfileV255||new URLSearchParams(location.search).get('serverHost')==='1'||new URLSearchParams(location.search).get('serverSettlementWorker')==='1')return;
let transport=null,playerId='',server='',hydrated=false,applying=false,sending=false,timer=0,last='',pending=null,stats=null,error='';
const store=playerLounge?.store;if(!store)return;
const nativeSave=store.save.bind(store),copy=value=>JSON.parse(JSON.stringify(value));
const queueKey=()=>`sweets-profile-pending-v255@${server}@${playerId}`;
function readPending(){try{return JSON.parse(localStorage.getItem(queueKey())||'null');}catch{return null;}}
function writePending(){try{if(pending)localStorage.setItem(queueKey(),JSON.stringify(pending));else localStorage.removeItem(queueKey());}catch{}}
function current(){return {name:store.data.name,pet:copy(store.data.pet),photo:String(store.data.photo||'')};}
function status(){return !hydrated?'サーバーのプロフィールを確認中…':pending?(error?'接続できたときにプロフィールを同期します':'プロフィールをサーバーへ保存中…'):'プロフィールはサーバーに保存されています';}
function refresh(){
 playerLounge.refreshPet?.();const name=document.getElementById('player-display-name');if(name)name.textContent=store.data.name;
 const input=document.getElementById('player-name');if(input&&document.activeElement!==input)input.value=store.data.name;
 for(const node of document.querySelectorAll('.profile255-sync'))node.textContent=status();
 for(const node of document.querySelectorAll('.profile255-photo')){node.hidden=!store.data.photo;if(store.data.photo)node.src=store.data.photo;else node.removeAttribute('src');}
 const records=document.querySelector('.profile255-records');if(records&&stats){const games=Object.values(stats.games||{}).reduce((n,item)=>n+(Number(item.rounds)||0),0);records.textContent=`サーバー保存のダウンロード成績：${Number(stats.rounds)||0}ラウンド・${games}ゲーム ／ 合計 ${Number(stats.win)||0} WIN ／ 最高 ${Number(stats.maxRoundWin)||0} WIN`;}
}
function hydrate(response,{keepPending=true}={}){
 const profile=response?.profile;if(!profile)return false;
 if(response.playerId&&playerId&&response.playerId!==playerId)return false;
 applying=true;
 try{
  const name=store.validName?.(profile.name);if(name)store.data.name=name;
  if(profile.pet&&typeof profile.pet==='object')store.data.pet={...store.data.pet,...profile.pet};
  store.data.photo=typeof profile.photo==='string'?profile.photo:'';nativeSave();last=JSON.stringify(current());
  stats=response.stats||stats;hydrated=true;error='';
  if(keepPending&&pending){store.data.name=pending.name;store.data.pet=copy(pending.pet);store.data.photo=pending.photo||'';nativeSave();}
 }finally{applying=false;}
 refresh();return true;
}
async function flush(){
 clearTimeout(timer);timer=0;if(!transport||!hydrated||!pending||sending||!navigator.onLine)return false;
 sending=true;const value=copy(pending),stamp=JSON.stringify(value);
 try{
  const response=await transport('POST',{profile:value});
  if(JSON.stringify(pending)===stamp){pending=null;writePending();hydrate(response,{keepPending:false});}else{last=JSON.stringify(response.profile||value);}
  error='';return true;
 }catch(problem){error=String(problem?.message||problem);return false;}
 finally{sending=false;refresh();if(pending&&!error)timer=setTimeout(flush,300);}
}
store.save=function(){const result=nativeSave();if(hydrated&&!applying){const value=current();if(JSON.stringify(value)!==last){pending=value;writePending();clearTimeout(timer);timer=setTimeout(flush,500);refresh();}}return result;};
async function setTransport(fn,{id='',base='',response=null}={}){
 transport=fn;playerId=String(id);server=String(base);pending=readPending();
 if(response)hydrate(response);else try{hydrate(await transport('GET'));}catch(problem){error=String(problem?.message||problem);refresh();}
 if(hydrated&&pending)flush();return hydrated;
}
function mountProfileExtras(){
 const page=document.getElementById('record-page'),form=document.getElementById('player-form');
 if(form&&!page.querySelector('.profile255-sync')){
  const line=document.createElement('p');line.className='profile255-sync';line.setAttribute('role','status');form.after(line);
  const label=document.createElement('label');label.textContent='プロフィール写真 ';label.className='profile255-photo-label';
  const input=document.createElement('input');input.type='file';input.accept='image/jpeg,image/png,image/webp';input.className='profile255-photo-input';input.setAttribute('aria-label','プロフィール写真を選ぶ');
  const image=document.createElement('img');image.className='profile255-photo';image.alt='プロフィール写真';image.hidden=true;
  const remove=document.createElement('button');remove.type='button';remove.textContent='写真を外す';
  label.append(input);line.after(label,image,remove);
  input.addEventListener('change',async()=>{
   const file=input.files?.[0];if(!file)return;
   if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>5*1024*1024){line.textContent='JPEG・PNG・WebPの5MB以下の画像を選んでください。';return;}
   try{
    const bitmap=await createImageBitmap(file),canvas=document.createElement('canvas'),scale=Math.min(1,240/Math.max(bitmap.width,bitmap.height));canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();store.data.photo=canvas.toDataURL('image/jpeg',.82);store.save();refresh();
   }catch{line.textContent='画像を読み込めませんでした。別の画像を選んでください。';}
  });
  remove.onclick=()=>{store.data.photo='';store.save();refresh();};
 }
 if(page&&stats&&!page.querySelector('.profile255-records')){const line=document.createElement('p');line.className='profile255-records';page.append(line);}
 const bottom=document.querySelector('.lineup-actions');if(bottom&&!bottom.querySelector('.profile255-edition')){const button=document.createElement('button');button.type='button';button.className='profile255-edition';button.textContent='版を選び直す';button.onclick=()=>{if(window.SweetsDownloadV255)window.SweetsDownloadV255.chooseEdition();else window.SweetsEditionV255?.show();};bottom.append(button);}
 refresh();
}
const observer=new MutationObserver(()=>mountProfileExtras());observer.observe(document.getElementById('record-page'),{childList:true});
window.addEventListener('online',flush);
window.SweetsPlayerProfileV255={version:255,setTransport,hydrate,flush,status,describe:()=>({hydrated,pending:!!pending,playerId,stats:stats?copy(stats):null,error})};
mountProfileExtras();
if(window.SweetsEditionV255?.value==='streaming'){
 const bind=()=>{const client=window.SweetsSharedMachine?.client;if(!client?.playerId||!client?.token){setTimeout(bind,300);return;}
  const query=new URLSearchParams(location.search),machine=window.SweetsGuestEntryV237?.machine(query,location.pathname.includes('/player'))||query.get('machine')||'public-01';
  const path=`/api/machines/${encodeURIComponent(machine)}/download-v255/profile`;
  setTransport((method,body)=>client.raw(path,{method,body}),{id:client.playerId,base:window.SweetsGuestEntryV237?.get('sweets-shared-server-v176')||''});
 };bind();
}
})();

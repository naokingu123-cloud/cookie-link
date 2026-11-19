/* Download administration never becomes a physical roulette host. */
(function(root){
'use strict';
const query=new URLSearchParams(location.search),machine=query.get('machine')||'public-01',adminToken=query.get('adminToken')||'';
const explicitDownload=query.get('edition')==='download';
const byId=id=>document.getElementById(id),card=byId('download-v255-admin');
const label={preparing:'録画を準備中',ready:'再生できます',failed:'準備失敗',complete:'再生完了'};
const number=value=>Number.isFinite(Number(value))?Math.max(0,Math.floor(Number(value))):0;
const money=value=>value==null?'—':number(value).toLocaleString('ja-JP');
const node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=String(text);return e;};
let downloadOnly=explicitDownload,prepared=null,timer=null,inFlight=false,disposed=false,last=null,signature='';
function applyEdition(value){
 downloadOnly=!!value;
 document.documentElement.dataset.serverEdition=downloadOnly?'download':'streaming';
 if(card)card.hidden=!downloadOnly;
 if(downloadOnly){
  const host=byId('host-frame'),worker=byId('settlement-worker');
  host?.removeAttribute('src');worker?.removeAttribute('src');
  if(host)host.hidden=true;if(worker)worker.hidden=true;
  const hostCard=host?.closest('.host-card');if(hostCard)hostCard.hidden=true;
 }
}
function writeStatus(download,error){
 if(!card)return;
 const state=byId('download-v255-worker-state'),ready=download?.ready===true;
 state.textContent=error||download?.error||(ready?'録画の準備完了':download?.enabled===false?'ダウンロード機能は停止中':'録画の準備を待っています');
 state.dataset.state=error||download?.error?'error':ready?'ready':'waiting';
 byId('download-v255-active-jobs').textContent=String(number(download?.activeJobs));
 card.hidden=!downloadOnly;
}
async function getJson(path,authenticated=false){
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),6000);
 try{
  const response=await fetch(path,{cache:'no-store',credentials:'same-origin',headers:authenticated&&adminToken?{'x-admin-token':adminToken}:{},signal:controller.signal});
  if(!response.ok)throw Object.assign(Error(response.status===401||response.status===403?'管理トークンを確認してください':'サーバーに接続できません（HTTP '+response.status+'）'),{status:response.status});
  return await response.json();
 }finally{clearTimeout(timeout);}
}
function sessionOf(player){return player.active||player.session||player.last||null;}
function detailEntry(list,title,value){
 list.append(node('dt','',title),node('dd','',value==null||value===''?'—':value));
}
function details(player,session,opened){
 const wrap=node('details','download-v255-player-detail');wrap.dataset.playerId=String(player.playerId||'');wrap.open=opened;
 wrap.append(node('summary','','プロフィール・成績・保存位置'));
 const list=node('dl'),profile=player.profile||{},pet=profile.pet||{},stats=player.stats||{},progress=session?.progress||player.progress||{};
 detailEntry(list,'プレイヤー ID',player.playerId);
 detailEntry(list,'名前',profile.name||player.displayName);
 detailEntry(list,'アバター',[pet.flavor,pet.top,pet.outfit,pet.accent].filter(Boolean).join(' / '));
 detailEntry(list,'ダウンロード版のプレイ数',money(stats.rounds));
 detailEntry(list,'累計 BET',money(stats.bet));
 detailEntry(list,'累計 WIN',money(stats.win));
 detailEntry(list,'うちシュガー WIN',money(stats.sugarWin));
 detailEntry(list,'録画 ID',session?.id);
 detailEntry(list,'保存位置',number(progress.ballIndex)+' / 8球 ・ '+(number(progress.playbackMs)/1000).toFixed(1)+'秒');
 detailEntry(list,'保存回数',money(progress.seq));
 detailEntry(list,'更新日時',session?.updatedAt?new Date(session.updatedAt).toLocaleString('ja-JP'):'—');
 if(session?.error)detailEntry(list,'準備エラー',session.error);
 const games=Object.entries(stats.games||{});
 for(const [id,game] of games)detailEntry(list,id,'BET '+money(game.bet)+' / WIN '+money(game.win));
 wrap.append(list);return wrap;
}
function render(data){
 last=data;writeStatus(data.download||data.status);
 const players=Array.isArray(data.players)?data.players:[];
 byId('download-v255-player-count').textContent=String(players.length);
 byId('download-v255-session-count').textContent=String(players.filter(p=>p.active||p.session&&p.session.status!=='complete').length);
 const next=JSON.stringify(players);if(signature===next)return;signature=next;
 const body=byId('download-v255-players'),opened=new Set([...body.querySelectorAll('details[open]')].map(e=>e.dataset.playerId)),fragment=document.createDocumentFragment();
 for(const player of players){
  const session=sessionOf(player),progress=session?.progress||player.progress||{},row=node('tr');
  row.dataset.playerId=String(player.playerId||'');
  const name=node('td','download-v255-name');name.append(node('b','',player.profile?.name||player.displayName||String(player.playerId||'').slice(0,8)));
  name.append(details(player,session,opened.has(String(player.playerId||''))));row.append(name);
  row.append(node('td','money',money(player.wallet?.credit??player.credit)),node('td','',label[session?.status||player.status]||'待機中'));
  row.append(node('td','money',money(session?.totalBet)),node('td','money',money(session?.totalWin)));
  row.append(node('td','',session?number(progress.ballIndex)+' / 8球':'—'),node('td','',session?(number(progress.playbackMs)/1000).toFixed(1)+'秒':'—'));
  fragment.append(row);
 }
 body.replaceChildren(fragment);byId('download-v255-empty').hidden=players.length>0;
}
function schedule(){
 clearTimeout(timer);timer=null;
 if(downloadOnly&&!disposed&&!document.hidden)timer=setTimeout(refresh,4000);
}
async function refresh(){
 if(!downloadOnly||disposed||inFlight)return;
 inFlight=true;
 try{
  const data=await getJson('/api/admin/machines/'+encodeURIComponent(machine)+'/download-v255/state',true);
  if(!disposed)render(data);
 }catch(error){
  if(!disposed)writeStatus(last?.download||last?.status,error.status===404?'このサーバーはダウンロード版に対応していません':error.message);
 }finally{inFlight=false;schedule();}
}
function prepare(){
 if(prepared)return prepared;
 prepared=(async()=>{
  try{
   const health=await getJson('/api/health');
   applyEdition(explicitDownload||health.serverEdition==='download');
   writeStatus(health.download);
  }catch(error){writeStatus(null,error.message);}
  void refresh();
 })();return prepared;
}
applyEdition(downloadOnly);
root.SweetsDownloadMonitorV255={prepare,refresh,render,get downloadOnly(){return downloadOnly;},describe(){return {version:255,downloadOnly,ready:last?.download?.ready===true,players:last?.players?.length||0,inFlight};}};
addEventListener('pagehide',()=>{disposed=true;clearTimeout(timer);timer=null;});
addEventListener('pageshow',event=>{if(event.persisted){disposed=false;void refresh();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimeout(timer);timer=null;}else void refresh();});
})(window);

/* Operator-only early BET control. Never bypass admin authentication or
 * interrupt a physical draw / release existing wagers. */
(()=>{
 'use strict';
 if(window.SweetsServerBetNowV240)return;
 const button=document.getElementById('server-bet-now'),status=document.getElementById('server-bet-now-status');
 if(!button||!status)return;
 const query=new URLSearchParams(location.search);
 const machine=String(query.get('machine')||'public-01').replace(/[^A-Za-z0-9_-]/g,'').slice(0,64)||'public-01';
 const token=query.get('adminToken')||'';
 let busy=false;
 const route='/api/admin/machines/'+encodeURIComponent(machine)+'/bet-now'+(token?'?adminToken='+encodeURIComponent(token):'');
 const descriptions={started:'BET TIMEを開始しました',extended:'現在のBET TIMEを20秒に更新しました',queued:'抽選終了後にBET TIMEを開始します',waiting_host:'抽選機の再接続後にBET TIMEを開始します'};
 async function request(){
  if(busy)return;
  busy=true;button.disabled=true;status.textContent='送信中…';
  try{
   const response=await fetch(route,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json',...(token?{'X-Admin-Token':token}:{})}}),data=await response.json();
   if(!response.ok||!data.ok)throw Error(data.error||'HTTP '+response.status);
   status.textContent=descriptions[data.action]||'BET TIMEを受け付けました';
   status.dataset.state=data.action;
  }catch(error){status.textContent='開始できません: '+String(error?.message||error);status.dataset.state='error';}
  finally{busy=false;button.disabled=false;}
 }
 button.addEventListener('click',request);
 window.SweetsServerBetNowV240={request,button,status};
})();

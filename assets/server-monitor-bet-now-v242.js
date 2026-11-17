/* Explicit operator cancellation, bound to the displayed round and retry ID. */
(()=>{
'use strict';const button=document.getElementById('server-bet-now'),status=document.getElementById('server-bet-now-status');if(!button||!status)return;
const q=new URLSearchParams(location.search),machine=String(q.get('machine')||'public-01').replace(/[^A-Za-z0-9_-]/g,'').slice(0,64)||'public-01',token=q.get('adminToken')||'';
const route='/api/admin/machines/'+encodeURIComponent(machine),suffix=token?'?adminToken='+encodeURIComponent(token):'';
let busy=false,pending=null;
button.title='現在のゲームを取り消して全参加者のBETを返却します。途中WINは無効になり、新しいBETへ即時復帰します。';
async function request(){
 if(busy)return;busy=true;button.disabled=true;status.textContent='取消・返却処理中…';
 try{
  if(!pending){
   let state=window.SweetsMonitorSnapshotV242;
   if(!state){const res=await fetch(route+suffix,{cache:'no-store'});if(!res.ok)throw Error('管理者認証または状態取得に失敗');state=await res.json();}
   pending={requestId:'force-'+(globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)),roundId:state.round?.id||null};
  }
  const res=await fetch(route+'/bet-now'+suffix,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json',...(token?{'X-Admin-Token':token}:{})},body:JSON.stringify(pending)}),data=await res.json();
  if(!res.ok||!data.ok){if(['operator_round_changed','request_id_required'].includes(data.error))pending=null;throw Error(data.error==='operator_round_changed'?'ゲームが切り替わりました。表示更新後に押してください。':data.error||'HTTP '+res.status);}
  pending=null;status.dataset.state=data.action;status.textContent=(data.refundedPlayers?data.refundedPlayers+'名へ '+Number(data.refundedTotal).toLocaleString('ja-JP')+'枚返却・':'')+'BET TIME開始';
 }catch(error){status.dataset.state='error';status.textContent='未完了: '+String(error.message||error)+(pending?'（同じ操作として再試行できます）':'');}
 finally{busy=false;button.disabled=false;}
}
button.addEventListener('click',request);window.SweetsServerBetNowV242={request,get pending(){return pending;}};
})();

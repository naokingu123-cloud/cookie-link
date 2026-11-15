(()=>{
'use strict';
const params=new URLSearchParams(location.search);
if(params.get('serverHost')==='1')return;
const nativeFetch=window.fetch.bind(window);
let pendingControl=null,lastApplied=null,applyTimer=0;

function finite(value){const n=Number(value);return Number.isFinite(n)?n:null;}
function applyControl(control){
 if(!control||typeof control!=='object')return;
 const effective=finite(control.effectiveRate);
 if(effective==null)return;
 pendingControl=control;
 clearTimeout(applyTimer);
 applyTimer=setTimeout(()=>{
  const input=document.getElementById('debug-payout-rate');
  const button=document.getElementById('debug-payout-apply');
  if(!input||!button){applyControl(pendingControl);return;}
  const next=Math.max(50,Math.min(150,Math.round(effective*10)/10));
  input.step='0.1';
  input.dataset.serverManaged='1';
  input.title='サーバー管理中: '+String(control.mode||'auto').toUpperCase();
  if(lastApplied==null||Math.abs(next-lastApplied)>=0.05||Math.abs(Number(input.value)-next)>=0.05){
   input.value=String(next);
   input.dispatchEvent(new Event('input',{bubbles:true}));
   input.dispatchEvent(new Event('change',{bubbles:true}));
   button.click();
   lastApplied=next;
  }
  const status=document.getElementById('debug-payout-status');
  if(status){
   const actual=finite(control.playerActualRate);
   const mode=control.mode==='manual'?'MANUAL':'AUTO';
   status.textContent='SERVER '+mode+' '+next.toFixed(1)+'%'+(actual==null?'':' ／ 実測累計 '+actual.toFixed(1)+'%')+'（次ゲームから適用）';
  }
  window.dispatchEvent(new CustomEvent('sweets:payout-control',{detail:control}));
 },80);
}

window.fetch=async function serverManagedFetch(input,init){
 const response=await nativeFetch(input,init);
 try{
  const url=typeof input==='string'?input:(input&&input.url)||'';
  if(String(url).includes('/round/checkpoint')){
   response.clone().json().then(payload=>applyControl(payload&&payload.payoutControl)).catch(()=>{});
  }
 }catch{}
 return response;
};
})();

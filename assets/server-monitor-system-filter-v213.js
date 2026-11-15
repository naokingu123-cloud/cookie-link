(()=>{
'use strict';
if(window.__sweetsSystemPlayerFilterV213)return;window.__sweetsSystemPlayerFilterV213=true;
const SYSTEM_NAMES=['SERVER CLOCK','SERVER FALLBACK HOST'];
function hideSystemRows(){
 const body=document.getElementById('players');if(!body)return;
 const rows=[...body.children];
 for(let index=0;index<rows.length;index++){
  const row=rows[index],text=String(row.textContent||'').toUpperCase();
  if(!SYSTEM_NAMES.some(name=>text.includes(name)))continue;
  row.style.display='none';
  const next=rows[index+1];if(next?.classList?.contains('detail-row'))next.style.display='none';
 }
}
const start=()=>{hideSystemRows();const body=document.getElementById('players');if(body)new MutationObserver(hideSystemRows).observe(body,{childList:true,subtree:true,characterData:true});};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

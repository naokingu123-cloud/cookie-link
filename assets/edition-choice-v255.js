/* Select a transport before any player session or round controller is started. */
(()=>{
'use strict';
const query=new URLSearchParams(location.search);
const internal=['serverHost','serverSettlementWorker','downloadWorker','admin'].some(key=>query.get(key)==='1');
let edition=query.get('edition');
if(!['download','streaming'].includes(edition))edition=internal?'streaming':'';
if((edition==='download'||query.get('downloadWorker')==='1')&&(query.has('games')||query.has('set'))){
 const url=new URL(location.href);url.searchParams.delete('games');url.searchParams.delete('set');history.replaceState(null,'',url.href);
}
document.documentElement.dataset.edition=edition||'choice';
function editionUrl(value){const url=new URL(location.href);url.searchParams.delete('edition');if(value)url.searchParams.set('edition',value);if(value==='download'){url.searchParams.delete('games');url.searchParams.delete('set');url.searchParams.delete('pick');}return url.href;}
window.SweetsEditionV255={version:255,value:edition,internal,url:editionUrl,choose:value=>{if(['download','streaming'].includes(value))location.assign(editionUrl(value));},show:()=>location.assign(editionUrl(''))};
if(edition||internal)return;
function mount(){
 const page=document.createElement('main');page.id='edition-choice-v255';page.className='edition255';
 page.innerHTML='<section class="edition255-card" aria-labelledby="edition255-heading"><span class="edition255-brand">SWEETS LINK</span><h1 id="edition255-heading">あそび方を選ぼう</h1><p class="edition255-lead">同じプレイヤーで、2つのあそび方。<br>クレジットとプロフィールはサーバーに保存します。</p><div class="edition255-options"><a class="edition255-option edition255-streaming" data-edition-choice="streaming"><span class="edition255-icon" aria-hidden="true">LIVE</span><span><strong>Streaming版</strong><small>サーバーの抽選映像を見ながらプレイ</small><em>安定した通信環境におすすめ</em></span><b aria-hidden="true">↗</b></a><a class="edition255-option edition255-download" data-edition-choice="download"><span class="edition255-icon" aria-hidden="true">DL</span><span><strong>ダウンロード版</strong><small>1ゲーム分を受け取ってからプレイ</small><em>受信後は圏外でも再生・途中から再開</em></span><b aria-hidden="true">↗</b></a></div><p class="edition255-note">ダウンロード版のダンゴデビンゴはおまかせ配置です。</p><p class="edition255-foot">10のお菓子ゲームを、いつものBETで。</p></section>';
 for(const link of page.querySelectorAll('[data-edition-choice]'))link.href=editionUrl(link.dataset.editionChoice);
 document.body.append(page);page.querySelector('a')?.focus({preventScroll:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();

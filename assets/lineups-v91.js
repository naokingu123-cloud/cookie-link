/* A game keeps its identity when it moves to a different tab. */
(()=>{
'use strict';
const catalog={
 cookie:{name:'クッキーリンク',logo:'optimized/media/b5233a1ce9f3d8f4.webp',home:0,record:5},
 choco:{name:'チョコレートキャニオン',logo:'assets/canyon-title-v2.webp',home:1,record:6},
 candy:{name:'シックスドロップ',logo:'assets/six-drop-title-v2.webp',home:2,record:3},
 gelato:{name:'ジェラートプリズム',logo:'assets/gelato-prism-tab-art-v51.webp',home:0,record:1},
 winery:{name:'ワイナリーピラミッド',logo:'assets/winery-pyramid-tab-art-v51.webp',home:1,record:2},
 popcorn:{name:'ポップコーンスプラッシュ',logo:'assets/popcorn-art/popcorn-logo-v88.webp',home:2,record:4},
 jelly:{name:'ジェリービンゴ',logo:'assets/jelly-emblem.svg',home:0,record:7},
 stick:{name:'ワッフルリバーシ',logo:'assets/waffle-reversi-logo.webp',home:0,record:8},
 castella:{name:'パーティカステラ',logo:'assets/party-castella-logo.webp',home:0,record:9}
};
const classic=['cookie','choco','candy'],festival=['jelly','stick','castella'];
const legacyMounts=['gelato','winery','popcorn'];
const params=new URLSearchParams(location.search),custom=params.get('games')?.split(',').map(id=>['waffle','reversi'].includes(id)?'stick':id)||[];
const valid=custom.length>=1&&custom.length<=3&&new Set(custom).size===custom.length&&custom.every(id=>Object.hasOwn(catalog,id));
const mode=valid?'custom':params.get('set')==='classic'?'classic':'festival';
const chosen=valid?custom:mode==='classic'?classic:festival;
const ids=[null,null,null];
// The original cabinet mounts use a baking tray, mine and jar in fixed slots.
// Newer cabinets can fill any remaining mount. Tab order follows the player's picks.
for(const id of classic.filter(g=>chosen.includes(g)))ids[catalog[id].home]=id;
for(const id of legacyMounts.filter(g=>chosen.includes(g)&&!ids[catalog[g].home]))ids[catalog[id].home]=id;
for(const id of chosen.filter(g=>!ids.includes(g)))ids[ids.indexOf(null)]=id;
document.documentElement.dataset.lineup=mode;
document.documentElement.toggleAttribute('data-has-classic',chosen.some(id=>classic.includes(id)));
window.SweetsLineup={catalog,chosen,ids,mode};
if(mode!=='festival')document.title='SWEETS LINK｜'+chosen.map(id=>catalog[id].name).join('・');

// Remount only game-specific legacy ID selectors, retaining each stylesheet's
// relative artwork URLs, cascade order and breakpoint rules.
const moved=legacyMounts.filter(id=>ids.includes(id)&&ids.indexOf(id)!==catalog[id].home);
if(!moved.length)return;
const done=new WeakSet();
function remap(sheet){
 if(!sheet||done.has(sheet))return;
 const file=sheet.href?.split('/').pop()||'',inline=sheet.ownerNode?.textContent||'';
 const names=moved.filter(id=>file.startsWith(id+'-')||file.startsWith(id+'.')||
   (file.startsWith('prism-winery')&&id!=='popcorn')||(!file&&inline.includes('body.'+id+'-enabled')));
 if(!names.length)return;
 const mapping=new Map(names.map(id=>[String(catalog[id].home),ids.indexOf(id)]));
 const rewrite=rules=>{for(const rule of rules){
   if(rule.selectorText){const old=rule.selectorText,updated=old.replace(/#(tab|panel)([012])\b/g,(all,type,n)=>mapping.has(n)?'#'+type+mapping.get(n):all);if(old!==updated)rule.selectorText=updated;}
   if(rule.cssRules)rewrite(rule.cssRules);
 }};
 try{rewrite(sheet.cssRules);done.add(sheet);}catch{}
}
document.addEventListener('load',e=>remap(e.target.sheet),true);
new MutationObserver(records=>{for(const r of records)for(const n of r.addedNodes)if(n.tagName==='STYLE')remap(n.sheet);}).observe(document.head,{childList:true});
})();

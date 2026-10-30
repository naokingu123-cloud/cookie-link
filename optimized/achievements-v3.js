/* New titles v3: replaces old titles, keeps game data. */
(()=>{
'use strict';
const defs=[{"id": "new-c01", "name": "見習い採掘師", "metric": "gamesChoco", "target": 1, "condition": "チョコレートキャニオンを1ゲーム遊ぶ", "rarity": 0, "icon": 0}, {"id": "new-c02", "name": "ランタンの灯", "metric": "gamesChoco", "target": 10, "condition": "10ゲーム遊ぶ", "rarity": 0, "icon": 1}, {"id": "new-c03", "name": "坑道のベテラン", "metric": "gamesChoco", "target": 100, "condition": "100ゲーム遊ぶ", "rarity": 1, "icon": 2}, {"id": "new-c04", "name": "地底の地図職人", "metric": "gamesChoco", "target": 300, "condition": "300ゲーム遊ぶ", "rarity": 2, "icon": 3}, {"id": "new-c05", "name": "地下100mの旅人", "metric": "bestDepth", "target": 100, "condition": "最高到達深度100m", "rarity": 0, "icon": 4}, {"id": "new-c06", "name": "地下300mの冒険者", "metric": "bestDepth", "target": 300, "condition": "最高到達深度300m", "rarity": 1, "icon": 5}, {"id": "new-c07", "name": "地下500mの探検家", "metric": "bestDepth", "target": 500, "condition": "最高到達深度500m", "rarity": 2, "icon": 6}, {"id": "new-c08", "name": "千メートルの伝説", "metric": "bestDepth", "target": 1000, "condition": "最高到達深度1000m", "rarity": 3, "icon": 7}, {"id": "new-c09", "name": "一気に50m", "metric": "bestAdvance", "target": 50, "condition": "1ゲームで50m掘削", "rarity": 0, "icon": 8}, {"id": "new-c10", "name": "一気に100m", "metric": "bestAdvance", "target": 100, "condition": "1ゲームで100m掘削", "rarity": 1, "icon": 9}, {"id": "new-c11", "name": "ドリル初心者", "metric": "drillHits", "target": 10, "condition": "ドリルが累計10回発動", "rarity": 0, "icon": 10}, {"id": "new-c12", "name": "最強ドリル", "metric": "level5", "target": 1, "condition": "Lv5ドリルを1回達成", "rarity": 2, "icon": 11}, {"id": "new-c13", "name": "幸運の3", "metric": "lucky3", "target": 1, "condition": "Lucky 3を1回成立", "rarity": 1, "icon": 12}, {"id": "new-c14", "name": "全方位ドリル", "metric": "allDrills", "target": 1, "condition": "全ドリルを1回発動", "rarity": 2, "icon": 13}, {"id": "new-c15", "name": "岩盤ブレイカー", "metric": "blocks", "target": 100, "condition": "チョコを累計100マス破壊", "rarity": 0, "icon": 14}, {"id": "new-c16", "name": "チョコの大瀑布", "metric": "blocks", "target": 1000, "condition": "チョコを累計1000マス破壊", "rarity": 2, "icon": 15}, {"id": "new-c17", "name": "鉱石運搬人", "metric": "ores", "target": 10, "condition": "鉱石を累計10個回収", "rarity": 0, "icon": 16}, {"id": "new-c18", "name": "銅の採掘者", "metric": "copper", "target": 10, "condition": "銅鉱石を10個回収", "rarity": 0, "icon": 17}, {"id": "new-c19", "name": "銀の採掘者", "metric": "silver", "target": 10, "condition": "銀鉱石を10個回収", "rarity": 1, "icon": 18}, {"id": "new-c20", "name": "金の採掘者", "metric": "gold", "target": 10, "condition": "金鉱石を10個回収", "rarity": 2, "icon": 19}, {"id": "new-c21", "name": "ダイヤモンドハンター", "metric": "diamond", "target": 1, "condition": "ダイヤモンド鉱石を1個回収", "rarity": 2, "icon": 20}, {"id": "new-c22", "name": "鉱石の収集王", "metric": "ores", "target": 100, "condition": "鉱石を累計100個回収", "rarity": 2, "icon": 21}, {"id": "new-c23", "name": "大発掘の記録", "metric": "bestOres", "target": 10, "condition": "1ゲームで鉱石を10個回収", "rarity": 2, "icon": 22}, {"id": "new-c24", "name": "宝石の宝箱", "metric": "rareOres", "target": 10, "condition": "レア鉱石を累計10個回収", "rarity": 3, "icon": 23}, {"id": "new-c25", "name": "はじめての大配当", "metric": "maxChocoWin", "target": 3000, "condition": "1ゲーム3000WIN以上獲得", "rarity": 1, "icon": 24}, {"id": "new-c26", "name": "スイーツボーナス", "metric": "bonusCakes", "target": 1, "condition": "ボーナスケーキを1個獲得", "rarity": 1, "icon": 25}, {"id": "new-c27", "name": "虹色の結晶", "metric": "rainbowSugar", "target": 1, "condition": "虹色シュガーを1個獲得", "rarity": 3, "icon": 26}, {"id": "new-c28", "name": "レアな瞬間", "metric": "rareBonus", "target": 1, "condition": "レア配当を1回獲得", "rarity": 3, "icon": 27}, {"id": "new-c29", "name": "ノーミスの職人", "metric": "successGames", "target": 10, "condition": "配当ありで10ゲーム終了", "rarity": 1, "icon": 28}, {"id": "new-c30", "name": "復活の冒険者", "metric": "continuedGames", "target": 10, "condition": "続きから10ゲーム開始", "rarity": 1, "icon": 29}, {"id": "new-c31", "name": "地底の常連", "metric": "gamesChoco", "target": 500, "condition": "500ゲーム遊ぶ", "rarity": 3, "icon": 30}, {"id": "new-c32", "name": "黄金の大当たり", "metric": "maxChocoWin", "target": 30000, "condition": "1ゲーム30000WIN以上獲得", "rarity": 3, "icon": 31}, {"id": "new-c33", "name": "峡谷の探検家", "metric": "bestDepth", "target": 200, "condition": "最高到達深度200m", "rarity": 1, "icon": 32}, {"id": "new-c34", "name": "超速掘削", "metric": "bestAdvance", "target": 200, "condition": "1ゲームで200m掘削", "rarity": 3, "icon": 33}, {"id": "new-c35", "name": "チョコ粉砕王", "metric": "blocks", "target": 5000, "condition": "チョコを累計5000マス破壊", "rarity": 3, "icon": 34}, {"id": "new-c36", "name": "神秘の晶洞", "metric": "bestDepth", "target": 800, "condition": "最高到達深度800m", "rarity": 3, "icon": 35}, {"id": "new-c37", "name": "ブロンズ採掘師", "metric": "ores", "target": 30, "condition": "鉱石を累計30個回収", "rarity": 0, "icon": 36}, {"id": "new-c38", "name": "シルバー採掘師", "metric": "ores", "target": 60, "condition": "鉱石を累計60個回収", "rarity": 1, "icon": 37}, {"id": "new-c39", "name": "ゴールド採掘師", "metric": "ores", "target": 200, "condition": "鉱石を累計200個回収", "rarity": 2, "icon": 38}, {"id": "new-c40", "name": "レインボー採掘王", "metric": "ores", "target": 1000, "condition": "鉱石を累計1000個回収", "rarity": 3, "icon": 39}];
const KEY='cookie-link-achievements-v3';
const fresh=()=>({titles:{},equipped:null,stats:{},version:3});
let store=fresh();try{const data=JSON.parse(localStorage.getItem(KEY)||'null');if(data?.version===3)store={...fresh(),...data,stats:data.stats||{},titles:data.titles||{}};}catch{}
const valid=new Set(defs.map(x=>x.id));
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(store));}catch{}};
// Existing records are preserved; previous title IDs are no longer valid.
TITLE_DEFS.splice(0,TITLE_DEFS.length,...defs);
const records=recordBook.data.records;
records.titles={...store.titles};
recordBook.data.equipped=store.equipped&&valid.has(store.equipped.id)&&store.titles[store.equipped.id]?store.equipped:null;
let changed=false;
const bump=(key,delta=1)=>{if(!Number.isFinite(delta)||delta<=0)return;store.stats[key]=(store.stats[key]||0)+delta;changed=true;};
const peak=(key,value)=>{if(!Number.isFinite(value)||value<=(store.stats[key]||0))return;store.stats[key]=value;changed=true;};
const flush=()=>{
 if(!changed)return;
 changed=false;const now=Date.now(),unlocked=[];
 for(const d of defs)if(!store.titles[d.id]&&(store.stats[d.metric]||0)>=d.target){store.titles[d.id]=now;unlocked.push({id:d.id});}
 records.titles={...store.titles};save();
 if(unlocked.length){showTitleToast(unlocked);if(menuOpen)renderRecordMenu();}
 updateEquippedTitle();
};
const originalCapture=recordBook.capture.bind(recordBook),track=new WeakMap();
recordBook.capture=function(a){
 const result=originalCapture(a);
 if(!a?.engines)return result;
 let seen=track.get(a);if(!seen||seen.token!==a.token){seen={token:a.token,done:false};track.set(a,seen);}
 const e=a.engines[1];
 if(!seen.done&&a.paid?.[1]&&e?.processed===8&&a.enabled?.[1]){
   seen.done=true;bump('gamesChoco');
   peak('bestDepth',e.depth||0);peak('bestAdvance',Math.max(0,(e.depth||0)-(e.startDepth||0)));
   bump('blocks',e.roundBlocks||0);bump('ores',e.roundChests||0);peak('bestOres',e.roundChests||0);
   peak('maxChocoWin',a.roundWins?.[1]||0);
   if((a.roundWins?.[1]||0)>0)bump('successGames');
   // Ore type, bonus and drill milestones are recorded by event handler below.
   result.changed=true;
 }
 flush();return result;
};
const originalEvent=recordEvent;
recordEvent=function(i,ev,e,a){
 if(i===1&&ev){
  if(ev.phase==='canyonCollect'&&Array.isArray(ev.items))for(const item of ev.items){
    const tile=item.tile||{};if(tile.item!=='ore')continue;
    const label=String(tile.kind||tile.ore||tile.type||tile.grade||'').toLowerCase();
    if(['copper','silver','gold','diamond'].includes(label)){bump(label);if(['gold','diamond'].includes(label))bump('rareOres');}
  }
  if(ev.phase==='canyonBonus'){bump('bonusCakes');if((ev.gain||0)>=1000)bump('rareBonus');}
  if(ev.phase==='canyonAll')bump('allDrills');
  if(ev.phase==='canyonUpgrade'){bump('drillHits');if((e.drills||[]).some(d=>d.level>=5))bump('level5');}
  if(ev.phase==='canyonPower'||ev.phase==='canyonTransform')bump('lucky3');
  if(ev.phase==='sugaraward'&&(ev.steps||[]).some(x=>x.tier===4))bump('rainbowSugar');
  if(ev.phase==='complete'&&e.startDepth>0)bump('continuedGames');
  if(ev.phase==='complete')flush();
 }
 return originalEvent(i,ev,e,a);
};
const originalUpdate=updateEquippedTitle;
updateEquippedTitle=function(){
 originalUpdate();
 const def=defs.find(x=>x.id===recordBook.data.equipped?.id),profile=document.getElementById('record-equipped');
 if(!profile)return;
 let emblem=document.getElementById('v3-equipped-icon');
 if(!emblem){emblem=document.createElement('span');emblem.id='v3-equipped-icon';profile.parentElement?.insertBefore(emblem,profile);}
 emblem.innerHTML=def?icon(def):'';emblem.hidden=!def;
};
const originalEquip=recordBook.equip.bind(recordBook);
recordBook.equip=function(id){
 if(id!==null&&(!valid.has(id)||!store.titles[id]))return false;
 store.equipped=id?{id}:null;records.titles={...store.titles};
 const ok=originalEquip(id);save();return ok;
};
const rarity=['★ かんたん','★★ ふつう','★★★ むずかしい','★★★★ 伝説'];
const icon=(d,locked=false)=>'<i class="v3-icon'+(locked?' v3-locked':'')+'" style="background-position:'+(d.icon%8*100/7).toFixed(4)+'% '+(Math.floor(d.icon/8)*25)+'%" aria-hidden="true"></i>';
renderTitles=function(){
 const eq=recordBook.data.equipped;
 recordOffset=Math.min(recordOffset,Math.ceil(defs.length/8)-1);
 const list=defs.slice(recordOffset*8,recordOffset*8+8);
 const selected=defs.find(x=>x.id===selectedTitle)||list[0],has=!!store.titles[selected.id];
 const rows=list.map(d=>{const unlocked=!!store.titles[d.id],equipped=eq?.id===d.id;return '<button class="v3-title-row '+(unlocked?'unlocked':'locked')+(equipped?' equipped':'')+'" data-title="'+d.id+'" aria-pressed="'+(selected.id===d.id)+'">'+icon(d,!unlocked)+'<span class="v3-desc"><strong>'+(unlocked?d.name:'？？？')+'</strong><small>'+rarity[d.rarity]+'</small><small>'+(unlocked?'取得 '+recordDate(store.titles[d.id]):'未取得 · '+d.condition)+'</small></span>'+(equipped?'<b>装備中</b>':'')+'</button>';}).join('');
 const current=store.stats[selected.metric]||0,progress=Math.min(selected.target,current);
 document.getElementById('record-page').innerHTML='<div class="v3-header">称号コレクション　'+Object.keys(store.titles).length+' / '+defs.length+'</div><div class="v3-list">'+rows+'</div><div class="v3-detail">'+icon(selected,!has)+'<div><strong>'+selected.name+'</strong><span>'+rarity[selected.rarity]+' · '+selected.condition+'</span><small>'+(has?'獲得日 '+recordDate(store.titles[selected.id]):'進捗 '+progress+' / '+selected.target)+'</small></div></div><div class="title-actions"><button id="title-equip" '+(!has||eq?.id===selected.id?'disabled':'')+'>称号とアイコンをセット</button><button id="title-unset" '+(!eq?'disabled':'')+'>はずす</button></div>'+recordPager(defs.length,8);
 for(const el of document.querySelectorAll('#record-page [data-title]'))el.onclick=()=>{selectedTitle=el.dataset.title;renderRecordMenu();};
 document.getElementById('title-equip').onclick=()=>{recordBook.equip(selected.id);updateEquippedTitle();renderRecordMenu();};
 document.getElementById('title-unset').onclick=()=>{recordBook.equip(null);updateEquippedTitle();renderRecordMenu();};
 const max=Math.ceil(defs.length/8)-1;
 document.getElementById('record-prev').disabled=recordOffset===0;
 document.getElementById('record-next').disabled=recordOffset===max;
 document.getElementById('record-prev').onclick=()=>{recordOffset--;selectedTitle=defs[recordOffset*8].id;renderRecordMenu();};
 document.getElementById('record-next').onclick=()=>{recordOffset++;selectedTitle=defs[recordOffset*8].id;renderRecordMenu();};
};
// Override selection of old ID when opening the menu.
const previousOpen=openRecordMenu;
openRecordMenu=function(){previousOpen();if(recordPage==='titles'&&!valid.has(selectedTitle)){selectedTitle=defs[0].id;renderRecordMenu();}};
selectedTitle=defs[0].id;
updateEquippedTitle();
})();
/* New titles v3: replaces old titles, keeps game data. */
(()=>{
'use strict';
const defs=[{"id":"v4-001","name":"はじめの習慣","category":"全般","metric":"loginStreak","target":2,"condition":"2日連続ログイン","rarity":1,"icon":0},{"id":"v4-002","name":"三日坊主卒業","category":"全般","metric":"loginStreak","target":3,"condition":"3日連続ログイン","rarity":2,"icon":1},{"id":"v4-003","name":"おかしな常連","category":"全般","metric":"loginStreak","target":4,"condition":"4日連続ログイン","rarity":2,"icon":2},{"id":"v4-004","name":"甘い日課","category":"全般","metric":"loginStreak","target":5,"condition":"5日連続ログイン","rarity":2,"icon":3},{"id":"v4-005","name":"皆勤目前","category":"全般","metric":"loginStreak","target":6,"condition":"6日連続ログイン","rarity":3,"icon":4},{"id":"v4-006","name":"一週間の常連","category":"全般","metric":"loginStreak","target":7,"condition":"7日連続ログイン","rarity":3,"icon":5},{"id":"v4-007","name":"おかしな時間旅行","category":"全般","metric":"playHours","target":24,"condition":"総プレイ24時間","rarity":2,"icon":6},{"id":"v4-008","name":"時を忘れた冒険者","category":"全般","metric":"playHours","target":168,"condition":"総プレイ168時間","rarity":4,"icon":7},{"id":"v4-009","name":"時間の支配者","category":"全般","metric":"playHours","target":720,"condition":"総プレイ720時間","rarity":5,"icon":8},{"id":"v4-010","name":"永遠のおかし職人","category":"全般","metric":"playHours","target":1000,"condition":"総プレイ1000時間","rarity":5,"icon":9},{"id":"v4-011","name":"連鎖のはじまり","category":"クッキーリンク","metric":"cookieChain","target":5,"condition":"5連鎖以上","rarity":2,"icon":10},{"id":"v4-012","name":"連鎖の達人","category":"クッキーリンク","metric":"cookieChain","target":8,"condition":"8連鎖以上","rarity":4,"icon":11},{"id":"v4-013","name":"無限のクッキー","category":"クッキーリンク","metric":"cookieChain","target":10,"condition":"10連鎖以上","rarity":5,"icon":12},{"id":"v4-014","name":"小さなつながり","category":"クッキーリンク","metric":"cookieLink","target":4,"condition":"4LINK以上で配当","rarity":1,"icon":13},{"id":"v4-015","name":"おかしな大家族","category":"クッキーリンク","metric":"cookieLink","target":8,"condition":"8LINK以上で配当","rarity":3,"icon":14},{"id":"v4-016","name":"絆の伝説","category":"クッキーリンク","metric":"cookieLink","target":12,"condition":"12LINK以上で配当","rarity":4,"icon":15},{"id":"v4-017","name":"五色の奇跡","category":"クッキーリンク","metric":"fiveHammers","target":1,"condition":"全5色ハンマー登場","rarity":4,"icon":16},{"id":"v4-018","name":"紅蓮の一撃","category":"クッキーリンク","metric":"hammerRed","target":1,"condition":"赤ハンマー作動","rarity":2,"icon":17},{"id":"v4-019","name":"黄金の一撃","category":"クッキーリンク","metric":"hammerYellow","target":1,"condition":"黄ハンマー作動","rarity":2,"icon":18},{"id":"v4-020","name":"翠緑の一撃","category":"クッキーリンク","metric":"hammerGreen","target":1,"condition":"緑ハンマー作動","rarity":2,"icon":19},{"id":"v4-021","name":"蒼天の一撃","category":"クッキーリンク","metric":"hammerBlue","target":1,"condition":"青ハンマー作動","rarity":2,"icon":20},{"id":"v4-022","name":"紫電の一撃","category":"クッキーリンク","metric":"hammerPurple","target":1,"condition":"紫ハンマー作動","rarity":2,"icon":21},{"id":"v4-023","name":"早起きクッキー","category":"クッキーリンク","metric":"earlyCookieWin","target":1,"condition":"最初の3球で配当","rarity":1,"icon":22},{"id":"v4-024","name":"全員集合","category":"クッキーリンク","metric":"allCookieBoardsWin","target":1,"condition":"全盤面で配当","rarity":3,"icon":23},{"id":"v4-025","name":"おそうじ名人","category":"クッキーリンク","metric":"cookieClear","target":1,"condition":"全消し1回","rarity":2,"icon":24},{"id":"v4-026","name":"ピカピカ職人","category":"クッキーリンク","metric":"cookieClear","target":2,"condition":"全消し2回","rarity":3,"icon":25},{"id":"v4-027","name":"全消しの伝説","category":"クッキーリンク","metric":"cookieClear","target":3,"condition":"全消し3回以上","rarity":4,"icon":26},{"id":"v4-028","name":"クッキークラッシャー","category":"クッキーリンク","metric":"cookieBroken","target":100,"condition":"累計100個破壊","rarity":1,"icon":27},{"id":"v4-029","name":"破壊の職人","category":"クッキーリンク","metric":"cookieBroken","target":1000,"condition":"累計1000個破壊","rarity":1,"icon":28},{"id":"v4-030","name":"おかしな破壊王","category":"クッキーリンク","metric":"cookieBroken","target":10000,"condition":"累計10000個破壊","rarity":2,"icon":29},{"id":"v4-031","name":"百万のかけら","category":"クッキーリンク","metric":"cookieBroken","target":100000,"condition":"累計100000個破壊","rarity":4,"icon":30},{"id":"v4-032","name":"究極の破壊者","category":"クッキーリンク","metric":"cookieBroken","target":200000,"condition":"累計200000個破壊","rarity":5,"icon":31},{"id":"v4-033","name":"クッキーの終焉","category":"クッキーリンク","metric":"cookieBroken","target":500000,"condition":"累計500000個破壊","rarity":5,"icon":32},{"id":"v4-034","name":"はじめてのごほうび","category":"クッキーリンク","metric":"cookieWinTotal","target":1000,"condition":"配当累計1000","rarity":1,"icon":33},{"id":"v4-035","name":"甘い貯金箱","category":"クッキーリンク","metric":"cookieWinTotal","target":10000,"condition":"配当累計10000","rarity":1,"icon":34},{"id":"v4-036","name":"スイーツ長者","category":"クッキーリンク","metric":"cookieWinTotal","target":100000,"condition":"配当累計100000","rarity":2,"icon":35},{"id":"v4-037","name":"ミリオンクッキー","category":"クッキーリンク","metric":"cookieWinTotal","target":1000000,"condition":"配当累計1000000","rarity":4,"icon":36},{"id":"v4-038","name":"おかしの大富豪","category":"クッキーリンク","metric":"cookieWinTotal","target":5000000,"condition":"配当累計5000000","rarity":5,"icon":37},{"id":"v4-039","name":"クッキー界の王","category":"クッキーリンク","metric":"cookieWinTotal","target":10000000,"condition":"配当累計10000000","rarity":5,"icon":38},{"id":"v4-040","name":"ドリル三段活用","category":"チョコレートキャニオン","metric":"drill3","target":1,"condition":"Lv3ドリルで掘削","rarity":1,"icon":39},{"id":"v4-041","name":"最強の掘削機","category":"チョコレートキャニオン","metric":"level5","target":1,"condition":"Lv5ドリルで掘削","rarity":2,"icon":0},{"id":"v4-042","name":"完全貫通","category":"チョコレートキャニオン","metric":"level5All","target":1,"condition":"Lv5で全掘削","rarity":4,"icon":1},{"id":"v4-043","name":"チョコの大掃除","category":"チョコレートキャニオン","metric":"chocoBoardClear","target":1,"condition":"ケーキを全消し","rarity":3,"icon":2},{"id":"v4-044","name":"鉱石の錬金術師","category":"チョコレートキャニオン","metric":"upgradedOre","target":1,"condition":"ランクアップ鉱石獲得","rarity":2,"icon":3},{"id":"v4-045","name":"トロッコいっぱい","category":"チョコレートキャニオン","metric":"bestOres","target":5,"condition":"1ゲームで鉱石5個","rarity":2,"icon":4},{"id":"v4-046","name":"宝石の大収穫","category":"チョコレートキャニオン","metric":"bestOres","target":10,"condition":"1ゲームで鉱石10個","rarity":3,"icon":5},{"id":"v4-047","name":"奇跡の発掘者","category":"チョコレートキャニオン","metric":"bestOres","target":15,"condition":"1ゲームで鉱石15個","rarity":5,"icon":6},{"id":"v4-048","name":"ブロンズハンター","category":"チョコレートキャニオン","metric":"copper","target":1,"condition":"銅鉱石を採掘","rarity":1,"icon":7},{"id":"v4-049","name":"シルバーハンター","category":"チョコレートキャニオン","metric":"silver","target":1,"condition":"銀鉱石を採掘","rarity":1,"icon":8},{"id":"v4-050","name":"ゴールドハンター","category":"チョコレートキャニオン","metric":"gold","target":1,"condition":"金鉱石を採掘","rarity":2,"icon":9},{"id":"v4-051","name":"ダイヤモンドハンター","category":"チョコレートキャニオン","metric":"diamond","target":1,"condition":"ダイヤを採掘","rarity":3,"icon":10},{"id":"v4-052","name":"赤い奇跡","category":"チョコレートキャニオン","metric":"rareBonus","target":1,"condition":"赤文字レア配当","rarity":4,"icon":11},{"id":"v4-053","name":"虹色の奇跡","category":"チョコレートキャニオン","metric":"rainbowBonus","target":1,"condition":"虹文字超レア配当","rarity":5,"icon":12},{"id":"v4-054","name":"伝説のダイヤモンド","category":"チョコレートキャニオン","metric":"diamond100","target":1,"condition":"ダイヤから100倍","rarity":5,"icon":13},{"id":"v4-055","name":"地底への第一歩","category":"チョコレートキャニオン","metric":"bestAdvance","target":10,"condition":"1ゲーム10m掘削","rarity":1,"icon":14},{"id":"v4-056","name":"掘削エキスパート","category":"チョコレートキャニオン","metric":"bestAdvance","target":20,"condition":"1ゲーム20m掘削","rarity":2,"icon":15},{"id":"v4-057","name":"地底への大進撃","category":"チョコレートキャニオン","metric":"bestAdvance","target":50,"condition":"1ゲーム50m掘削","rarity":4,"icon":16},{"id":"v4-058","name":"百メートルの旅人","category":"チョコレートキャニオン","metric":"bestDepth","target":100,"condition":"深度100m","rarity":2,"icon":17},{"id":"v4-059","name":"地底の探検家","category":"チョコレートキャニオン","metric":"bestDepth","target":500,"condition":"深度500m","rarity":4,"icon":18},{"id":"v4-060","name":"青き地底の支配者","category":"チョコレートキャニオン","metric":"bestDepth","target":600,"condition":"深度600m","rarity":5,"icon":19},{"id":"v4-061","name":"翠緑の深淵","category":"チョコレートキャニオン","metric":"bestDepth","target":700,"condition":"深度700m","rarity":5,"icon":20},{"id":"v4-062","name":"黄金の深淵","category":"チョコレートキャニオン","metric":"bestDepth","target":800,"condition":"深度800m","rarity":5,"icon":21},{"id":"v4-063","name":"深淵の征服者","category":"チョコレートキャニオン","metric":"bestDepth","target":900,"condition":"深度900m","rarity":5,"icon":22},{"id":"v4-064","name":"地底世界の伝説","category":"チョコレートキャニオン","metric":"bestDepth","target":1000,"condition":"深度1000m","rarity":5,"icon":23},{"id":"v4-065","name":"鉱石コレクター","category":"チョコレートキャニオン","metric":"ores","target":10,"condition":"鉱石累計10個","rarity":1,"icon":24},{"id":"v4-066","name":"鉱石マニア","category":"チョコレートキャニオン","metric":"ores","target":100,"condition":"鉱石累計100個","rarity":2,"icon":25},{"id":"v4-067","name":"千の輝きを持つ者","category":"チョコレートキャニオン","metric":"ores","target":1000,"condition":"鉱石累計1000個","rarity":4,"icon":26},{"id":"v4-068","name":"宝石の大富豪","category":"チョコレートキャニオン","metric":"ores","target":10000,"condition":"鉱石累計10000個","rarity":5,"icon":27},{"id":"v4-069","name":"地底の財宝王","category":"チョコレートキャニオン","metric":"ores","target":20000,"condition":"鉱石累計20000個","rarity":5,"icon":28},{"id":"v4-070","name":"鉱石の神話","category":"チョコレートキャニオン","metric":"ores","target":50000,"condition":"鉱石累計50000個","rarity":5,"icon":29},{"id":"v4-071","name":"はじめてのお宝","category":"チョコレートキャニオン","metric":"chocoWinTotal","target":1000,"condition":"配当累計1000","rarity":1,"icon":30},{"id":"v4-072","name":"チョコの財宝","category":"チョコレートキャニオン","metric":"chocoWinTotal","target":10000,"condition":"配当累計10000","rarity":1,"icon":31},{"id":"v4-073","name":"地底の資産家","category":"チョコレートキャニオン","metric":"chocoWinTotal","target":100000,"condition":"配当累計100000","rarity":2,"icon":32},{"id":"v4-074","name":"ミリオンマイナー","category":"チョコレートキャニオン","metric":"chocoWinTotal","target":1000000,"condition":"配当累計1000000","rarity":4,"icon":33},{"id":"v4-075","name":"ダイヤモンド富豪","category":"チョコレートキャニオン","metric":"chocoWinTotal","target":5000000,"condition":"配当累計5000000","rarity":5,"icon":34},{"id":"v4-076","name":"キャニオンの王者","category":"チョコレートキャニオン","metric":"chocoWinTotal","target":10000000,"condition":"配当累計10000000","rarity":5,"icon":35},{"id":"v4-077","name":"空振りの贈り物","category":"シックスドロップ","metric":"dropRefill","target":1,"condition":"未HITでドロップ補充","rarity":1,"icon":36},{"id":"v4-078","name":"まっすぐな気持ち","category":"シックスドロップ","metric":"dropLine","target":4,"condition":"直線4以上","rarity":1,"icon":37},{"id":"v4-079","name":"ロングストレート","category":"シックスドロップ","metric":"dropLine","target":6,"condition":"直線6以上","rarity":2,"icon":38},{"id":"v4-080","name":"究極の一直線","category":"シックスドロップ","metric":"dropLine","target":8,"condition":"直線8以上","rarity":4,"icon":39},{"id":"v4-081","name":"三角形の魔法","category":"シックスドロップ","metric":"dropTriangle","target":1,"condition":"トライアングル成立","rarity":2,"icon":0},{"id":"v4-082","name":"六角形の奇跡","category":"シックスドロップ","metric":"dropHex","target":1,"condition":"ヘキサゴン成立","rarity":3,"icon":1},{"id":"v4-083","name":"三位一体","category":"シックスドロップ","metric":"dropAllPatterns","target":1,"condition":"同じ盤面で3役成立","rarity":5,"icon":2},{"id":"v4-084","name":"小さな一歩","category":"シックスドロップ","metric":"dropRound","target":1,"condition":"ラウンド1クリア","rarity":1,"icon":3},{"id":"v4-085","name":"甘い挑戦者","category":"シックスドロップ","metric":"dropRound","target":2,"condition":"ラウンド2クリア","rarity":1,"icon":4},{"id":"v4-086","name":"おかしな冒険者","category":"シックスドロップ","metric":"dropRound","target":3,"condition":"ラウンド3クリア","rarity":2,"icon":5},{"id":"v4-087","name":"スイーツマスター","category":"シックスドロップ","metric":"dropRound","target":4,"condition":"ラウンド4クリア","rarity":3,"icon":6},{"id":"v4-088","name":"ドロップの伝説","category":"シックスドロップ","metric":"dropRound","target":5,"condition":"ラウンド5クリア","rarity":4,"icon":7},{"id":"v4-089","name":"金銀ダイヤの祝福","category":"シックスドロップ","metric":"dropRareBoard","target":1,"condition":"レア盤面に遭遇","rarity":3,"icon":8},{"id":"v4-090","name":"おかしなお掃除","category":"シックスドロップ","metric":"dropNormalClear","target":1,"condition":"通常盤面で全消し","rarity":4,"icon":9},{"id":"v4-091","name":"奇跡の全消し","category":"シックスドロップ","metric":"dropRareClear","target":1,"condition":"レア盤面で全消し","rarity":5,"icon":10},{"id":"v4-092","name":"ドロップ初心者","category":"シックスドロップ","metric":"dropRemoved","target":100,"condition":"累計100個消去","rarity":1,"icon":11},{"id":"v4-093","name":"ドロップ職人","category":"シックスドロップ","metric":"dropRemoved","target":1000,"condition":"累計1000個消去","rarity":1,"icon":12},{"id":"v4-094","name":"甘い消去魔","category":"シックスドロップ","metric":"dropRemoved","target":10000,"condition":"累計10000個消去","rarity":2,"icon":13},{"id":"v4-095","name":"ドロップの破壊王","category":"シックスドロップ","metric":"dropRemoved","target":100000,"condition":"累計100000個消去","rarity":4,"icon":14},{"id":"v4-096","name":"無限のドロップ","category":"シックスドロップ","metric":"dropRemoved","target":200000,"condition":"累計200000個消去","rarity":5,"icon":15},{"id":"v4-097","name":"ドロップ界の神","category":"シックスドロップ","metric":"dropRemoved","target":500000,"condition":"累計500000個消去","rarity":5,"icon":16},{"id":"v4-098","name":"はじめての甘い報酬","category":"シックスドロップ","metric":"dropWinTotal","target":1000,"condition":"配当累計1000","rarity":1,"icon":17},{"id":"v4-099","name":"小さなお菓子屋さん","category":"シックスドロップ","metric":"dropWinTotal","target":10000,"condition":"配当累計10000","rarity":1,"icon":18},{"id":"v4-100","name":"スイーツの富豪","category":"シックスドロップ","metric":"dropWinTotal","target":100000,"condition":"配当累計100000","rarity":2,"icon":19},{"id":"v4-101","name":"ミリオンドロップ","category":"シックスドロップ","metric":"dropWinTotal","target":1000000,"condition":"配当累計1000000","rarity":4,"icon":20},{"id":"v4-102","name":"お菓子の大富豪","category":"シックスドロップ","metric":"dropWinTotal","target":5000000,"condition":"配当累計5000000","rarity":5,"icon":21},{"id":"v4-103","name":"ドロップ界の王","category":"シックスドロップ","metric":"dropWinTotal","target":10000000,"condition":"配当累計10000000","rarity":5,"icon":22}];
// Semantic matching avoids assigning a random sprite when the title catalog grows.
const iconForMetric={
 loginStreak:29,playHours:30,cookieChain:14,cookieLink:15,fiveHammers:13,
 hammerRed:34,hammerYellow:34,hammerGreen:34,hammerBlue:34,hammerPurple:34,
 earlyCookieWin:24,allCookieBoardsWin:28,cookieClear:28,cookieBroken:34,cookieWinTotal:24,
 drill3:10,level5:11,level5All:13,chocoBoardClear:15,upgradedOre:22,
 bestOres:16,copper:17,silver:18,gold:19,diamond:20,rareBonus:27,
 rainbowBonus:26,diamond100:20,bestAdvance:8,bestDepth:7,ores:21,
 chocoWinTotal:24,dropRefill:9,dropLine:14,dropTriangle:12,dropHex:35,
 dropAllPatterns:26,dropRound:32,dropRareBoard:21,dropNormalClear:28,
 dropRareClear:26,dropRemoved:14,dropWinTotal:24
};
for(const d of defs){
 d.icon=Object.prototype.hasOwnProperty.call(iconForMetric,d.metric)?iconForMetric[d.metric]:d.icon;
 if(d.metric==='bestDepth')d.icon=d.target>=1000?7:d.target>=500?6:d.target>=300?5:4;
 if(d.metric==='ores')d.icon=d.target>=10000?39:d.target>=1000?38:d.target>=100?22:16;
 if(d.metric==='dropRound')d.icon=d.target>=5?39:d.target>=4?38:d.target>=3?37:36;
}
const KEY='cookie-link-achievements-v4';
const fresh=()=>({titles:{},equipped:null,stats:{},version:4});
let store=fresh();try{const data=JSON.parse(localStorage.getItem(KEY)||'null');if(data?.version===4)store={...fresh(),...data,stats:data.stats||{},titles:data.titles||{}};}catch{}
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
 let seen=track.get(a);if(!seen||seen.token!==a.token){seen={token:a.token,paid:[false,false,false]};track.set(a,seen);}
 for(let i=0;i<3;i++){
  const engine=a.engines[i];
  if(seen.paid[i]||!a.paid?.[i]||!a.enabled?.[i]||engine?.processed!==8)continue;
  seen.paid[i]=true;
  const amount=Math.max(0,Number(a.roundWins?.[i])||0);
  bump(['cookieWinTotal','chocoWinTotal','dropWinTotal'][i],amount);
  if(i===1){
   bump('gamesChoco');
   peak('bestDepth',engine.depth||0);
   peak('bestAdvance',Math.max(0,(engine.depth||0)-(engine.startDepth||0)));
   bump('blocks',engine.roundBlocks||0);
   bump('ores',engine.roundChests||0);
   peak('bestOres',engine.roundChests||0);
   peak('maxChocoWin',amount);
   if(amount>0)bump('successGames');
  }
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
  if(ev.phase==='canyonAll'){bump('allDrills');if((e.drills||[]).some(d=>d.level>=5))bump('level5All');}
  if(ev.phase==='canyonUpgrade'){bump('drillHits');if((e.drills||[]).some(d=>d.level>=3))bump('drill3');if((e.drills||[]).some(d=>d.level>=5))bump('level5');}
  if(ev.phase==='canyonPower'||ev.phase==='canyonTransform')bump('lucky3');if(ev.phase==='canyonOdds')bump('upgradedOre');
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
const rarity=['','★ かんたん','★★ やさしい','★★★ ふつう','★★★★ むずかしい','★★★★★ 伝説'];
const icon=(d,locked=false)=>'<i class="v3-icon'+(locked?' v3-locked':'')+'" style="background-position:'+(d.icon%8*100*146/(144*7)).toFixed(4)+'% '+(Math.floor(d.icon/8)*100*148/(144*4)).toFixed(4)+'%" aria-hidden="true"></i>';
renderTitles=function(){
 const eq=recordBook.data.equipped, perPage=20;
 recordOffset=Math.min(recordOffset,Math.ceil(defs.length/perPage)-1);
 const list=defs.slice(recordOffset*perPage,recordOffset*perPage+perPage);
 const selected=defs.find(x=>x.id===selectedTitle)||list[0],has=!!store.titles[selected.id];
 const rows=list.map(d=>{
  const unlocked=!!store.titles[d.id],equipped=eq?.id===d.id;
  return '<button type="button" class="v3-title-row '+(unlocked?'unlocked':'locked')+(equipped?' equipped':'')+'" data-title="'+d.id+'" aria-label="'+(unlocked?d.name:'未獲得 '+d.condition)+'" aria-pressed="'+(selected.id===d.id)+'">'
   +icon(d,!unlocked)+'<span class="v3-desc"><strong>'+(unlocked?d.name:'？？？')+'</strong><small class="v3-stars">'+('★'.repeat(d.rarity))+'</small><small class="v3-date">'+(unlocked?recordDate(store.titles[d.id]):'未獲得')+'</small></span>'
   +(equipped?'<b>SET</b>':'')+'</button>';
 }).join('');
 const current=store.stats[selected.metric]||0,progress=Math.min(selected.target,current),percent=selected.target?Math.min(100,100*progress/selected.target):0;
 document.getElementById('record-page').innerHTML='<div class="v3-header"><span>称号コレクション</span><span>獲得 '+Object.keys(store.titles).length+' / '+defs.length+'</span></div>'
 +'<div class="v3-list">'+rows+'</div>'
 +'<div class="v3-detail">'+icon(selected,!has)+'<div class="v3-detail-text"><strong>'+selected.name+'</strong><span class="v3-detail-stars">'+('★'.repeat(selected.rarity))+'　'+selected.category+'</span><span>'+selected.condition+'</span><small>'+(has?'獲得日 '+recordDate(store.titles[selected.id]):'進捗 '+progress.toLocaleString('ja-JP')+' / '+selected.target.toLocaleString('ja-JP'))+'</small><div class="v3-progress"><i style="width:'+percent.toFixed(2)+'%"></i></div></div></div>'

 +'<div class="title-actions"><button id="title-equip" '+(!has||eq?.id===selected.id?'disabled':'')+'>称号とアイコンをセット</button><button id="title-unset" '+(!eq?'disabled':'')+'>はずす</button></div>'+recordPager(defs.length,perPage);
 for(const el of document.querySelectorAll('#record-page [data-title]'))el.onclick=()=>{selectedTitle=el.dataset.title;renderRecordMenu();};
 document.getElementById('title-equip').onclick=()=>{recordBook.equip(selected.id);updateEquippedTitle();renderRecordMenu();};
 document.getElementById('title-unset').onclick=()=>{recordBook.equip(null);updateEquippedTitle();renderRecordMenu();};
 const max=Math.ceil(defs.length/perPage)-1;
 document.getElementById('record-prev').disabled=recordOffset===0;
 document.getElementById('record-next').disabled=recordOffset===max;
 document.getElementById('record-prev').onclick=()=>{recordOffset--;selectedTitle=defs[recordOffset*perPage].id;renderRecordMenu();};
 document.getElementById('record-next').onclick=()=>{recordOffset++;selectedTitle=defs[recordOffset*perPage].id;renderRecordMenu();};
};
// Debug-only tab, with existing controls moved (never cloned) to preserve listeners.
const debugPanel=document.querySelector('.debug-colors');
const debugDock=document.createElement('div');debugDock.hidden=true;debugDock.id='v4-debug-dock';
document.body.appendChild(debugDock);
if(debugPanel){debugDock.appendChild(debugPanel);debugPanel.hidden=false;}
const debugTab=document.getElementById('menu-page-debug');
const previousRenderRecordMenu=renderRecordMenu;
function showV4Debug(){
 if(debugPanel&&!document.getElementById('record-page').contains(debugPanel)){
  document.getElementById('record-page').replaceChildren(debugPanel);
 }
 const page=document.getElementById('record-page');
 let tools=page.querySelector('.v4-debug-achievements');
 if(!tools){
  tools=document.createElement('section');tools.className='v4-debug-achievements';
  tools.innerHTML='<h3>称号デバッグ</h3><button type="button" id="v4-debug-unlock">全103称号を開放</button><small>デバッグ操作で獲得扱いにします。プレイ記録は変更しません。</small>';
  page.appendChild(tools);
  tools.querySelector('button').onclick=()=>{
   if(!confirm('全103称号をデバッグ開放しますか？'))return;
   const now=Date.now();for(const d of defs)if(!store.titles[d.id])store.titles[d.id]=now;
   records.titles={...store.titles};save();updateEquippedTitle();
   tools.querySelector('small').textContent='全称号を開放しました';
  };
 }
 document.querySelectorAll('.record-nav button').forEach(b=>b.setAttribute('aria-pressed',String(b===debugTab)));
}
renderRecordMenu=function(){
 if(recordPage==='debug'){showV4Debug();return;}
 if(debugPanel&&!debugDock.contains(debugPanel))debugDock.appendChild(debugPanel);
 previousRenderRecordMenu();
};
if(debugTab)debugTab.addEventListener('click',e=>{
 e.preventDefault();e.stopImmediatePropagation();recordPage='debug';renderRecordMenu();
},true);
// Override selection of old ID when opening the menu.
const previousOpen=openRecordMenu;
openRecordMenu=function(){previousOpen();if(recordPage==='titles'&&!valid.has(selectedTitle)){selectedTitle=defs[0].id;renderRecordMenu();}};
selectedTitle=defs[0].id;

// Login streak and active foreground play time, saved independently from the old titles.
try {
 const day=()=>new Date().toLocaleDateString('sv-SE');
 const today=day(),prev=localStorage.getItem('cl-v4-last-day');
 if(prev!==today){let streak=1;if(prev){const delta=(new Date(today+'T12:00:00')-new Date(prev+'T12:00:00'))/86400000;if(delta===1)streak=(Number(localStorage.getItem('cl-v4-streak'))||0)+1;}localStorage.setItem('cl-v4-last-day',today);localStorage.setItem('cl-v4-streak',String(streak));peak('loginStreak',streak);flush();}
 let last=Date.now();setInterval(()=>{const now=Date.now();if(!document.hidden){bump('playHours',Math.min(20,(now-last)/1000)/3600);flush();}last=now;},15000);
}catch(err){console.warn('Title v4 clock',err)}
updateEquippedTitle();
})();
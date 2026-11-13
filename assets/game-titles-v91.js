/* Modern game titles. Round records use the actual board and paid credit count. */
(()=>{
'use strict';
const defs=[], gameNames={gelato:'ジェラートプリズム',winery:'ワイナリーピラミッド',popcorn:'ポップコーンスプラッシュ'};
const seq={gelato:0,winery:0,popcorn:0};
function add(game,name,metric,target,condition,rarity){
 const id=game+'-'+String(++seq[game]).padStart(2,'0');
 defs.push({id,name,metric:game+'.'+metric,target,condition,rarity,game,category:gameNames[game],atlas:defs.length});
}
function career(game,unit,names,limits){
 limits.forEach((limit,i)=>add(game,names[i],'lifetimeCount',limit+1,
   unit+'の通算'+(game==='winery'?'完成数':game==='popcorn'?'消去数':'獲得数')+'が'+limit.toLocaleString('ja-JP')+(game==='winery'?'杯':'個')+'を超える',[1,2,3,4,5,5][i]));
 const medals=[1000,10000,100000,1000000,5000000,10000000];
 const stamp={gelato:'氷晶',winery:'果樹園',popcorn:'コーン'}[game];
 medals.forEach((limit,i)=>add(game,stamp+'の'+['貯金箱','宝箱','金庫','大金庫','宝物庫','王冠'][i],
   'lifetimeWin',limit+1,'このゲームの通算配当が'+limit.toLocaleString('ja-JP')+'枚を超える',[1,2,3,4,5,5][i]));
}
const g=(...args)=>add('gelato',...args),w=(...args)=>add('winery',...args),p=(...args)=>add('popcorn',...args);
g('からっぽのコーン','empty',1,'1ゲームをアイス0個で終える',2);
g('氷晶のハート','inner',12,'1ゲームで中央の12個をすべて獲得',3);
g('ひとすくいの奇跡','burst',18,'1球で18個以上のアイスを獲得',5);
['ミントの四つ葉','レモンの四つ星','紅玉のカルテット','すみれの花束'].forEach((name,i)=>
 g(name,'color'+(i+1),4,'1ゲームで'+['緑','黄','赤','紫'][i]+'のアイスを4個獲得',2+i%2));
g('四彩のジェラティエ','collectors',4,'1ゲームで緑・黄・赤・紫を各4個獲得',5);
g('山盛りスクープ','roundCount',15,'1ゲームで15個以上のアイスを獲得',2);
g('氷菓のパーティー','roundCount',20,'1ゲームで20個以上のアイスを獲得',3);
g('二十二の氷晶','exact22',1,'1ゲームをアイスちょうど22個で終える',4);
g('プリズムの王冠','roundCount',24,'1ゲームで全24個のアイスを獲得',5);
career('gelato','アイス',['街角のアイス屋','ジェラート職人','氷菓工房の親方','氷の宮廷菓子師','氷晶の名匠','ジェラート王'],[100,1000,10000,100000,200000,500000]);
w('こぼれる果実の泉','spilled',10,'1ゲームで最下段から合計10杯分以上のジュースをこぼす',2);
[2,3,4,5].forEach((n,i)=>w(['ふたりの果実','三色カクテル','四季のブレンド','五彩のソムリエ'][i],
 'colors'+n,1,'1つのグラスを'+n+'色'+(n===5?'以上':'')+'のミックスジュースで満たす',i+1));
w('ミックスの晩餐','mixCount',10,'1ゲームでミックスジュースを10杯以上完成',4);
w('十杯の乾杯','burst',10,'1回の注入で10杯以上のグラスを満たす',4);
[2,4,8,16].forEach((n,i)=>w(['ダブルの注ぎ手','四倍の給仕','八倍の噴水','十六倍の大瀑布'][i],
 'pour'+n,1,'注入量'+n+'倍でグラスに注ぐ',i+1));
[10,15,20,21].forEach((n,i)=>w(['果樹園のテーブル','豊穣の宴','星のレセプション','ピラミッドの祝杯'][i],
 'roundCount',n,'1ゲームで'+(n===21?'全21杯':n+'杯以上')+'のグラスを満たす',i+2));
career('winery','グラス',['見習いの給仕','果実酒房の主人','葡萄畑の名士','宮廷のソムリエ','果樹園の巨匠','ワイナリー王'],[100,1000,10000,100000,200000,500000]);
p('静かなひと球','quiet',1,'1球で起爆コーンが1つも作動しない',1);
p('点火のマエストロ','allBombs',1,'1球で開始時の盤面にある起爆コーンをすべて起動',3);
p('虹の導火線','rainbow',1,'全消しコーンを起動',4);
[3,4,5].forEach((n,i)=>p(['熱々の釜','火花の工房','灼熱のポッパー'][i],'level',n,'補充レベルがLv.'+n+'以上になる',i+2));
p('火花でいっぱい','bombBoard',1,'盤面に残っているコーンがすべて起爆コーンになる',5);
p('ちいさなポップ袋','small',1,'1ゲームの消去が50個以下',2);
[200,300,400].forEach((n,i)=>p(['山盛りバケット','はじける大行列','コーンの大洪水'][i],
 'roundCount',n,'1ゲームで'+n+'個以上のコーンを消去',i+3));
[1,2,3,4,5].forEach((n,i)=>p(['空っぽのバケット','おかわり全消し','三連の祝砲','四連の花火','五連の大花火'][i],
 'clearCount',n,'1ゲームで全消しを'+n+'回以上達成',i+1));
career('popcorn','コーン',['屋台のポッパー','劇場の売れっ子','コーン工房の親方','祝祭の花火師','黄金のポップ職人','ポップコーン王'],[1000,10000,100000,1000000,2000000,5000000]);

// Record transient events only for a live, paid board. Lifetime counters commit
// once per paid eight-ball game, regardless of how often the shared UI captures.
function tracker(innerFaces=[]){
 const rounds=new WeakMap(), attached=new WeakSet();
 function round(app,e){
   let r=rounds.get(e);
   if(!r||r.token!==app.token){r={token:app.token,values:{},paid:false};rounds.set(e,r);}
   return r;
 }
 function mark(r,key,value){r.values[key]=Math.max(r.values[key]||0,Number(value)||0);}
 function event(app,i,e,phase,data={}){
   if(app.phase!=='playing'||!app.enabled[i]||!(app.locked[i]>0)||app.engines[i]!==e||!gameNames[e.kind])return;
   const r=round(app,e);
   if(e.kind==='gelato'&&phase==='gelatoFill')mark(r,'burst',data.newFaces.length);
   if(e.kind==='winery'){
     if(phase==='wineryPour')mark(r,'pour'+data.volume,1);
     if(phase==='wineryAward')mark(r,'burst',data.justFilled.length);
   }
   if(e.kind==='popcorn'&&phase==='popcornDraw'){
     const t=e.trace,hit=t.waves.flat().map(i=>t.before[i]);
     const fired=hit.filter(k=>k.bomb),bombs=t.before.filter(k=>k?.bomb);
     mark(r,'quiet',fired.length===0);
     mark(r,'allBombs',bombs.length>0&&fired.length===bombs.length);
     mark(r,'rainbow',fired.some(k=>k.power===5));
     for(const board of [t.before,t.after]){
       const occupied=board.filter(Boolean);
       mark(r,'bombBoard',occupied.length>0&&occupied.every(k=>k.bomb));
     }
   }
 }
 function attach(app){
   app.engines.forEach((e,i)=>{
     if(!gameNames[e.kind]||attached.has(e))return;
     attached.add(e);const emit=e.emit;
     e.emit=function(phase,data){event(app,i,this,phase,data);return emit.call(this,phase,data);};
   });
 }
 function capture(app,i,peak,bump){
   const e=app.engines[i],game=e?.kind;
   if(!gameNames[game]||!app.enabled[i]||!(app.locked[i]>0)||!app.paid[i]||e.processed!==8)return;
   const r=round(app,e);if(r.paid)return;r.paid=true;
   if(game==='gelato'){
     mark(r,'roundCount',e.filled.size);
     mark(r,'empty',e.filled.size===0);mark(r,'exact22',e.filled.size===22);
     mark(r,'inner',innerFaces.filter(id=>e.filled.has(id)).length);
     const colors=e.collectorCounts.slice(1);
     colors.forEach((n,i)=>mark(r,'color'+(i+1),n));
     mark(r,'collectors',colors.filter(n=>n===4).length);
   }else if(game==='winery'){
     mark(r,'spilled',Math.floor(e.wasted+1e-9));mark(r,'roundCount',e.fullCount);mark(r,'mixCount',e.mixCount);
     for(const glass of e.glasses)if(glass.volume>=1-1e-9){
       const colors=new Set(glass.layers.filter(l=>l.amount>1e-9).map(l=>l.flavor)).size;
       if(colors>=2)mark(r,'colors'+Math.min(5,colors),1);
     }
   }else{
     mark(r,'level',e.state.level);mark(r,'small',e.state.popped<=50);
     mark(r,'roundCount',e.state.popped);mark(r,'clearCount',e.state.clears);
   }
   for(const [metric,n] of Object.entries(r.values))peak(game+'.'+metric,n);
   bump(game+'.lifetimeCount',r.values.roundCount);
   bump(game+'.lifetimeWin',Number(app.roundWins[i])||0);
 }
 return {attach,capture,event};
}
const api={defs,tracker};
if(typeof module==='object'&&module.exports)module.exports=api;
if(typeof recordBook!=='undefined'){
 const center=window.GelatoPrism?.faces.filter(f=>f.nodes.includes(9)).map(f=>f.id)||[];
 recordBook.registerGameTitles(defs,tracker(center));
}
})();

/* Load round recovery synchronously so the first BET is protected too. */
(()=>{
 try{
  const request=new XMLHttpRequest();
  request.open('GET','assets/round-recovery-v1.js?v=1',false);
  request.send(null);
  if(!((request.status>=200&&request.status<300)||request.status===0))throw new Error('HTTP '+request.status);
  eval(request.responseText);
 }catch(error){console.error('[round-plan] module load failed',error);}
})();

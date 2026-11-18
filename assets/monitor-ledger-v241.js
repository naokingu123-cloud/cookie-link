/* Display projections only. No wager, wallet, RNG or payout-control writes. */
(function(root){
'use strict';
const finite=v=>Number.isFinite(Number(v))?Number(v):0;
const money=v=>Math.max(0,finite(v));
const present=v=>v!==null&&v!==undefined&&Number.isFinite(Number(v));
const fmt=v=>finite(v).toLocaleString('ja-JP',{useGrouping:false,maximumFractionDigits:1});
const rate=v=>present(v)?finite(v).toFixed(1)+'%':'—';
const multiple=(gain,bet)=>bet>0?(gain>0&&gain/bet<.005?'+0.01倍未満':'+'+(gain/bet).toFixed(2)+'倍'):'—';
// Visible-light hue: 50%=blue (240°), 75%=cyan, 100%=green,
// 125%=yellow, 150%=red (0°). Clamp only the COLOR, never the value.
const spectrum=value=>present(value)?'hsl('+(240-2.4*Math.max(0,Math.min(100,Number(value)-50))).toFixed(1)+' 100% 65%)':null;
const SYSTEM=new Set(['SERVER CLOCK','SERVER FALLBACK HOST','SERVER ROULETTE']);
const COLUMNS=['プレイヤー','BET','WIN','CREDIT','IN','OUT','H/G','実測P/O','設定P/O','補正P/O',...Array.from({length:25},(_,i)=>(i+1)+'番'),'制御','進行度','状態','詳細'];
function configured(control,config){
 // The existing individual operator control is manualRate. Auto players
 // display the current global target, not a historical normalized targetRate.
 if(control.mode==='manual'&&present(control.manualRate))return Number(control.manualRate);
 return present(config.targetRate)?Number(config.targetRate):present(control.targetRate)?Number(control.targetRate):null;
}
// A tier is produced from each participating game's own BET and this HIT's
// incremental award. Never reconstruct it from the aggregate WIN or BET.
const validTier=value=>Number.isInteger(value)&&value>=0&&value<=3?value:0;
const tier=value=>['','red','purple','rainbow'][validTier(value)];
const COLOR_BASIS='per-game-new-award-v248';
const colorTier=(forecast,index)=>forecast?.colorBasis===COLOR_BASIS&&Array.isArray(forecast.colorTiers)&&forecast.colorTiers.length===25?validTier(forecast.colorTiers[index]):0;
function status(row,data){
 const round=data.round||{},phase=String(round.phase||'WAITING').toUpperCase();
 if(row.control.offlinePending)return row.connected?'サーバー精算中':'切断・サーバー精算中';
 if(!row.connected)return row.seat?'再接続待ち（席保持）':'未接続';
 if(!row.seat&&data.stations?.seats?.filter(s=>!s.empty).length>=6)return '満席・観戦中';
 if(!round.id||phase==='WAITING')return '合流待機中';
 if(phase==='BETTING')return row.bet>0?'BET受付中・登録済み':'BET待機中';
 if(!(row.bet>0))return '合流待機中';
 if(row.settled)return '精算完了';
 if(phase==='COMPLETE')return row.ballCount>=8?'WIN確定・精算待ち':'最終球の反映待ち';
 if(data.machine?.hostConnected===false)return '抽選機の再接続待ち';
 if(row.seat?.detail?.paused)return '演出一時停止';
 const achieved=validTier(row.seat?.detail?.achievedTier);
 const suffix=achieved===3?'・最高役獲得':achieved===2?'・超高配当獲得':achieved===1?'・高配当獲得':'';
 if(row.ballCount<(round.balls||[]).length)return '入賞反映中'+suffix;
 return '抽選中'+suffix;
}
function rows(data){
 const payout=data.payoutControlV3||{},config=payout.config||{},round=data.round||{};
 const cmap=new Map((payout.players||[]).map(c=>[String(c.playerId),c]));
 const smap=new Map((data.stations?.seats||[]).filter(s=>!s.empty&&!s.test).map(s=>[String(s.playerId),s]));
 const map=new Map((round.players||[]).map(p=>[String(p.playerId),p]));
 for(const [id,c] of cmap)if(id&&!map.has(id))map.set(id,{playerId:id,displayName:smap.get(id)?.name||id.slice(0,8),connected:false});
 for(const [id,s] of smap)if(!map.has(id))map.set(id,{playerId:id,displayName:s.name,connected:s.connected});
 const result=[];
 for(const [id,p] of map){
  if(id===data.machine?.hostPlayerId||id.startsWith('station-test-')||SYSTEM.has(String(p.displayName).toUpperCase()))continue;
  const c=cmap.get(id)||{},seat=smap.get(id),current=!!round.id&&c.currentRoundId===round.id;
  const sameSeat=seat?.roundId===round.id?seat:null;
  const bet=current?money(c.currentRoundBet):money(p.totalBet??sameSeat?.bet);
  const settled=!!p.settled||!!sameSeat?.settled;
  const win=p.settled&&p.settlement?money(p.settlement.totalWin):sameSeat?.settled?money(sameSeat.win):Math.max(money(p.roundWin),current?money(c.currentRoundWin):0,money(sameSeat?.win));
  const input=money(c.lifetimeBet),output=money(c.lifetimeWin),candidate=data.hitForecasts?.[id];
  const forecast=round.phase==='PLAYING'&&!settled&&candidate?.roundId===round.id&&candidate.ballCount===(round.balls||[]).length&&candidate.bet===bet&&Array.isArray(candidate.gains)&&candidate.gains.length===25&&finite(data.serverTime||Date.now())-finite(candidate.at)<=12000?candidate:null;
  const row={id,player:p,control:c,seat:sameSeat,connected:!!(p.connected||seat?.connected),bet,win,credit:money(c.wallet?.credit??p.currentCredit),input,output,hg:input-output,actual:input>0?output/input*100:null,setting:configured(c,config),corrected:present(c.effectiveRate)?Number(c.effectiveRate):null,ballCount:Math.max(money(p.checkpointBall),current?money(c.lastBall):0,money(sameSeat?.ballCount)),settled,forecast};
  row.state=status(row,data);result.push(row);
 }
 return result.sort((a,b)=>Number(b.connected)-Number(a.connected)||String(a.player.displayName||a.id).localeCompare(String(b.player.displayName||b.id),'ja'));
}
function numberCell(row,data,n){
 const r=data.round||{};
 if((r.balls||[]).some(b=>Number(b.number)===n))return {text:'入賞済',hint:'このラウンドですでに入賞しています',ratio:'',color:''};
 if(r.phase!=='PLAYING'||(r.balls||[]).length>=8||row.settled)return {text:'—',hint:'抽選中の次の1球のみを予測します',ratio:'',color:''};
 if(!(row.bet>0))return {text:'—',hint:'このラウンドはBETしていません',ratio:'',color:''};
 const gain=row.forecast?.gains?.[n-1];
 if(!present(gain)||Number(gain)<0)return {text:'—',hint:'予測の更新待ち（旧クライアントは再読み込みしてください）',ratio:'更新待ち',color:''};
 const amount=money(gain),semantic=colorTier(row.forecast,n-1);
 const partial=row.forecast?.partial===true;
 const coverage=partial?('　【暫定 '+(row.forecast.readyGames||0)+'/'+(row.forecast.totalGames||'?')+'ゲーム確定、残り更新中】'):'';
 const reason=semantic===3?'いずれかのゲームで最高役を新規獲得':semantic===2?'いずれかのゲームの増加WINがそのゲームのBETの10倍以上':semantic===1?'いずれかのゲームの増加WINがそのゲームのBETの3倍以上':'色は各ゲームの増加WIN／そのゲームのBET・新規最高役で判定';
 return {text:'+'+fmt(amount),ratio:multiple(amount,row.bet),color:tier(semantic),colorTier:semantic,gain:amount,partial,
  hint:n+'番入賞で確認済み増加WIN '+fmt(amount)+'／合計BET '+fmt(row.bet)+'に対して増加 '+multiple(amount,row.bet)+coverage+'　【色：'+reason+'】'};
}
function total(list,data){
 const sum=key=>list.reduce((a,r)=>a+finite(r[key]),0),bet=sum('bet'),input=sum('input'),output=sum('output');
 const weighted=key=>bet>0&&list.filter(r=>r.bet>0).every(r=>present(r[key]))?list.reduce((a,r)=>a+(r.bet>0?r.bet*r[key]:0),0)/bet:null;
 const row={id:'total',bet,win:sum('win'),credit:sum('credit'),input,output,hg:input-output,actual:input>0?output/input*100:null,setting:weighted('setting'),corrected:weighted('corrected'),connected:list.filter(r=>r.connected).length,settled:false,ballCount:(data.round?.balls||[]).length,forecast:null};
 const active=list.filter(r=>r.bet>0&&!r.settled);
 const available=active.filter(r=>r.forecast);
 // The aggregate shares confirmed per-game subtotals immediately, even when
 // another player or game remains pending. A known individual-game threshold
 // remains true even while other contributions are pending.
 if(data.round?.phase==='PLAYING'&&row.ballCount<8&&available.length){
  const partial=available.length!==active.length||available.some(r=>r.forecast.partial);
  const readyGames=available.reduce((n,r)=>n+(r.forecast.readyGames||0),0);
  const totalGames=active.reduce((n,r)=>n+(r.forecast?.totalGames||0),0);
  row.forecast={partial,readyGames,totalGames,colorBasis:COLOR_BASIS,
   baseWin:list.reduce((a,r)=>a+(r.forecast?money(r.forecast.baseWin):r.win),0),
   gains:Array.from({length:25},(_,i)=>{
    const values=available.map(r=>r.forecast.gains[i]);
    return values.every(present)?values.reduce((a,n)=>a+money(n),0):null;
   }),
   colorTiers:Array.from({length:25},(_,i)=>available.every(r=>present(r.forecast.gains[i]))?Math.max(0,...available.map(r=>colorTier(r.forecast,i))):null)};
 }

 return row;
}
root.SweetsMonitorLedgerV241={rows,total,numberCell,status,tier,configured,fmt,rate,multiple,spectrum,COLUMNS};
})(typeof window!=='undefined'?window:globalThis);

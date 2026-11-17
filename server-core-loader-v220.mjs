import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {patchStationCore} from './server-stations-v235.mjs';

const ROOT=process.cwd();
const SOURCE=path.join(ROOT,'server-core.mjs');
const OUTPUT_DIR=path.join(ROOT,'.runtime');
const OUTPUT=path.join(OUTPUT_DIR,'server-core-v220-generated.mjs');

function replaceExact(source,from,to,expected,label){
 const count=source.split(from).length-1;
 if(count!==expected)throw new Error(`[ServerCoreLoaderV220] ${label} matches=${count}, expected=${expected}`);
 return source.split(from).join(to);
}
function once(source,from,to,label){return replaceExact(source,from,to,1,label);}

// Display-only forecasts are ephemeral, bounded to the six authenticated seats,
// and exposed solely through the already protected administrator snapshot.
function createMonitorForecastsV241({connected,now}){
 const rooms=new WeakMap(),valid=n=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=0&&n<=1e12;
 function eligible(m,id){return id!==m.hostPlayerId&&m.stationsV235?.seats?.some(s=>s?.kind==='human'&&s.playerId===id);}
 function record(m,id,msg){
  const r=m.round,d=msg?.detail,p=r?.participants?.[id];
  if(!eligible(m,id)||!p||msg?.roundId!==r.id)return false;
  let map=rooms.get(m);if(!map){map=new Map();rooms.set(m,map);}
  const count=(r.balls||[]).length;
  const isPartial=d?.prediction==='partial';
  const readyGames=Number(d?.readyGames),totalGames=Number(d?.totalGames);
  const validProgress=!isPartial||(Number.isInteger(readyGames)&&Number.isInteger(totalGames)&&readyGames>=1&&totalGames<=9&&readyGames<totalGames);
  if(r.phase!=='PLAYING'||p.settlement||count>=8||d?.version!==238||d.roundId!==r.id||d.ballCount!==count||d.paused||!['ready','none','partial'].includes(d.prediction)||!validProgress||!valid(d.predictionBaseWin)||!Array.isArray(d.numberGains)||d.numberGains.length!==25){map.delete(id);return false;}
  const used=new Set((r.balls||[]).map(b=>Number(b.number)));
  const gains=d.numberGains.map((n,i)=>used.has(i+1)?null:n);
  if(gains.some((n,i)=>!used.has(i+1)&&!valid(n))){map.delete(id);return false;}
  for(const key of map.keys())if(!eligible(m,key))map.delete(key);
  map.set(id,{roundId:r.id,ballCount:count,baseWin:d.predictionBaseWin,gains,partial:isPartial,readyGames:isPartial?readyGames:totalGames||0,totalGames:totalGames||0,at:now()});return true;
 }
 function snapshot(m){
  const result={},map=rooms.get(m),r=m.round;
  if(!map)return result;
  for(const [id,value] of map){
   const p=r?.participants?.[id];
   if(!eligible(m,id)||!p||!connected(m.id,id)||r.phase!=='PLAYING'||p.settlement||(r.balls||[]).length>=8||value.roundId!==r.id||value.ballCount!==r.balls.length||now()-value.at>12000){map.delete(id);continue;}
   result[id]={roundId:r.id,ballCount:value.ballCount,baseWin:value.baseWin,gains:[...value.gains],partial:value.partial===true,readyGames:value.readyGames,totalGames:value.totalGames,bet:Number(p.totalBet)||0,at:value.at};
  }
  return result;
 }
 return {record,snapshot};
}

let source=await fs.readFile(SOURCE,'utf8');
source=once(source,
 "const ROOT=path.dirname(fileURLToPath(import.meta.url));",
 "const ROOT=process.cwd();",
 'generated module root');
source=once(source,
 "const HOST_FALLBACK_DELAY_MS=Math.max(300,Number(process.env.SWEETS_HOST_FALLBACK_DELAY_MS||3500));",
 "const HOST_FALLBACK_DELAY_MS=Math.max(300,Number(process.env.SWEETS_HOST_FALLBACK_DELAY_MS||3500));\nconst PLAYER_STABLE_MS=Math.max(500,Number(process.env.SWEETS_PLAYER_STABLE_MS||2800));\nconst CONTINUOUS_PHYSICAL_ROUNDS=String(process.env.SWEETS_CONTINUOUS_PHYSICAL_ROUNDS??'1')!=='0';",
 'server timing controls');
source=once(source,
 "function connected(machineId,playerId){const set=socketMap(machineId).get(playerId);return !!set&&[...set].some(ws=>ws.readyState===WebSocket.OPEN);}",
 "function connected(machineId,playerId){const set=socketMap(machineId).get(playerId);return !!set&&[...set].some(ws=>ws.readyState===WebSocket.OPEN);}\nfunction stablyConnected(machineId,playerId){const set=socketMap(machineId).get(playerId),time=now();return !!set&&[...set].some(ws=>ws.readyState===WebSocket.OPEN&&Number(ws.connectedAt)>0&&time-Number(ws.connectedAt)>=PLAYER_STABLE_MS);}",
 'stable socket helper');
source=once(source,
`function connectedPlayerIds(m){
 return [...socketMap(m.id).keys()].filter(id=>id!==m.hostPlayerId&&connected(m.id,id));
}`,
`function connectedPlayerIds(m){
 // A socket that merely opened for an instant is observation-only. It may
 // become eligible only when a later BET round is created after remaining
 // continuously connected for PLAYER_STABLE_MS.
 return [...socketMap(m.id).keys()].filter(id=>id!==m.hostPlayerId&&stablyConnected(m.id,id));
}`,
 'stable BET eligibility');
source=once(source,
 " ws.isAlive=true;ws.missedPongs=0;",
 " ws.isAlive=true;ws.missedPongs=0;ws.connectedAt=now();",
 'socket connected timestamp');
source=once(source,
`   if(msg.type==='host_fallback_request'){
    if(player.id===m.hostPlayerId&&m.round?.phase==='PLAYING'&&(!msg.roundId||msg.roundId===m.round.id))activateServerFallback(m,m.round,'host_requested');
    return;
   }`,
`   if(msg.type==='host_fallback_request'){
    // The authoritative server never invents random balls. A physical round
    // remains paused until the real host resumes.
    return;
   }`,
 'disable requested random fallback');
source=once(source,
 "  if(t-round.hostMissingSince>=HOST_FALLBACK_DELAY_MS)activateServerFallback(m,round,'host_offline');",
 "  if(t-round.hostMissingSince>=HOST_FALLBACK_DELAY_MS)round.hostMissingSince=t; // physical host wait; never fabricate balls",
 'disable automatic random fallback');
source=once(source,
` const eligible=eligiblePlayerIds(m);
 if(!eligible.length){m.round=null;m.revision++;m.updatedAt=t;scheduleSave();return null;}
 const round={`,
` const eligible=eligiblePlayerIds(m);
 if(!eligible.length&&!CONTINUOUS_PHYSICAL_ROUNDS){m.round=null;m.revision++;m.updatedAt=t;scheduleSave();return null;}
 const round={`,
 'allow an empty authoritative BET round');
source=once(source,
` if(!round){
  if(hostOnline&&eligiblePlayerIds(m).length)createBettingRound(m);
  return;
 }`,
` if(!round){
  if(hostOnline&&(CONTINUOUS_PHYSICAL_ROUNDS||eligiblePlayerIds(m).length))createBettingRound(m);
  return;
 }`,
 'open server clock without players');
source=once(source,
`  if(!Object.keys(round.participants||{}).length){
   round.phase='COMPLETE';round.completedAt=t-RESULT_GRACE_MS+800;round.drawSource='no-bets';
   m.revision++;m.updatedAt=t;scheduleSave();broadcast(m.id,{type:'betting_closed',round:publicRound(round,null),reason:'no_bets'});return;
  }`,
`  if(!Object.keys(round.participants||{}).length&&!CONTINUOUS_PHYSICAL_ROUNDS){
   round.phase='COMPLETE';round.completedAt=t-RESULT_GRACE_MS+800;round.drawSource='no-bets';
   m.revision++;m.updatedAt=t;scheduleSave();broadcast(m.id,{type:'betting_closed',round:publicRound(round,null),reason:'no_bets'});return;
  }`,
 'let an empty BET proceed to the physical draw');
source=once(source,
`  if(hostOnline&&eligiblePlayerIds(m).length)createBettingRound(m);
 }`,
`  if(hostOnline&&(CONTINUOUS_PHYSICAL_ROUNDS||eligiblePlayerIds(m).length))createBettingRound(m);
 }`,
 'open the next continuous physical round');
source=once(source,
 " if(STATIC_DENY.has(relative)||first==='data'||first==='.git')return reply(res,404,{ok:false,error:'not_found'});",
 " if(STATIC_DENY.has(relative)||first==='data'||first==='.git'||first==='.runtime')return reply(res,404,{ok:false,error:'not_found'});",
 'hide generated runtime source');
source=patchStationCore(source);
source=once(source,'await loadDb();',createMonitorForecastsV241.toString()+'\nconst monitorForecastsV241=createMonitorForecastsV241({connected,now});\nawait loadDb();','monitor forecast service');
source=once(source,'stations.progress(m,player.id,msg);return;','stations.progress(m,player.id,msg);monitorForecastsV241.record(m,player.id,msg);return;','authenticated forecast telemetry');
source=once(source,'stations:stations.snapshot(m,null,false),machine:{','stations:stations.snapshot(m,null,false),hitForecasts:monitorForecastsV241.snapshot(m),machine:{','admin-only number forecasts');


// v242: applied after the established station/forecast patch contracts.
source=once(source,'function tickMachine(m){','function tickMachine(m){\n if(operatorBusyV242.has(m))return;recoverOperatorCancellationV242(m);','operator transition lock');
source=once(source,'return reply(res,200,{ok:true,...requestServerBetNow(m),serverTime:now()});','const input=await bodyJson(req);return reply(res,200,{ok:true,...await forceServerBetV242(m,input),serverTime:now()});','forced BET transaction');
source=once(source,'stations:stationView};','stations:stationView,operatorRefundsV242:payoutWallet?.operatorNotices?.(m.id,playerId)||[]};','personalized refunds');
source=once(source,'hitForecasts:monitorForecastsV241.snapshot(m),machine:{','hitForecasts:monitorForecastsV241.snapshot(m),payoutTrendV242:payoutWallet?.operatorTrend?.(m.id)||null,machine:{','operator trend');

await fs.mkdir(OUTPUT_DIR,{recursive:true});
await fs.writeFile(OUTPUT,source,'utf8');
await import(pathToFileURL(OUTPUT).href+'?v=235-'+Date.now());
console.info('[ServerCoreLoaderV220] continuous physical clock and six stations loaded; no random fallback');

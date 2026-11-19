import {randomBytes,randomUUID} from 'node:crypto';

export const DOWNLOAD_GAME_IDS_V255=Object.freeze(['cookie','choco','candy','gelato','winery','popcorn','jelly','stick','castella','dango']);
const copy=value=>value==null?value:JSON.parse(JSON.stringify(value));
const own=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
const money=value=>Number.isSafeInteger(value)&&value>=0;
const fail=(code,status=409)=>{throw Object.assign(Error(code),{status});};
const amount=(value,code='invalid_download_amount')=>money(value)?value:fail(code,400);
const add=(a,b)=>amount(a+b);
const dictionary=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};

// This ledger is owned by the existing payout document. The injected
// transaction persists the download lock, normal wallet, Sugar and trusted
// continuation together. Presentation progress never supplies a money value.
export function createDownloadLedgerV255({getPlayer,getMachine,listMachineIds=()=>[],transaction,ensureWallet,quoteRate,coreRounds,sugarLedger,now=Date.now,randomSeed=()=>randomBytes(4).readUInt32LE(0),newId=()=>`dl255-${randomUUID()}`}={}){
 if(!getPlayer||!transaction||!sugarLedger)throw Error('download_ledger_dependencies_missing');
 function normalize(player){
  const d=player.downloadV255=player.downloadV255&&typeof player.downloadV255==='object'?player.downloadV255:{};
  if(d.version!=null&&d.version!==255)fail('unsupported_download_version');
  d.version=255;d.revision=money(d.revision)?d.revision:0;d.sessions=dictionary(d.sessions);d.requests=dictionary(d.requests);
  d.activeId=typeof d.activeId==='string'?d.activeId:null;d.lastId=typeof d.lastId==='string'?d.lastId:null;d.gameState=d.gameState||null;
  const s=d.stats=dictionary(d.stats);for(const key of ['rounds','bet','win','sugarWin','maxRoundWin'])s[key]=money(s[key])?s[key]:0;s.games=dictionary(s.games);
  return d;
 }
 function sessionFor(d,id){return typeof id==='string'&&own(d.sessions,id)?d.sessions[id]:null;}
 function current(player){const d=normalize(player);return sessionFor(d,d.activeId);}
 function locked(machineId,playerId){const p=getPlayer(machineId,playerId);if(!p.downloadV255)return false;const s=current(p);return !!s&&s.status!=='complete';}
 function summary(s){
  if(!s)return null;
  return {id:s.id,sessionId:s.id,status:s.status,requestId:s.requestId,seed:s.input.seed,bets:copy(s.input.bets),gameIds:[...DOWNLOAD_GAME_IDS_V255],rate:s.input.rate,creditBefore:s.input.creditBefore,totalBet:s.input.totalBet,totalWin:s.totalWin??null,sugarWin:s.sugarWin??null,creditAfter:s.creditAfter??null,createdAt:s.createdAt,updatedAt:s.updatedAt,preparedAt:s.preparedAt||null,completedAt:s.completedAt||null,progress:copy(s.progress),error:s.error||null,package:s.package?{sha256:s.package.sha256,bytes:s.package.bytes}:null};
 }
 function state(machineId,playerId,{sessionId}={}){
  const p=getPlayer(machineId,playerId);ensureWallet(machineId,playerId,p);const d=normalize(p);
  const s=sessionId?sessionFor(d,sessionId):sessionFor(d,d.activeId)||sessionFor(d,d.lastId);
  if(sessionId&&!s)fail('download_session_not_found',404);
  return {version:255,playerId,revision:d.revision,session:summary(s),wallet:copy(p.wallet),stats:copy(d.stats),sugarState:sugarLedger.publicState(p)};
 }
 function prepare(machineId,playerId,{requestId,bets,gameIds,profile}={}){
  if(typeof requestId!=='string'||!/^[A-Za-z0-9_.:-]{16,160}$/.test(requestId))fail('download_request_id_required',400);
  if(!Array.isArray(bets)||bets.length!==DOWNLOAD_GAME_IDS_V255.length||bets.some(n=>!money(n)))fail('invalid_download_bets',400);
  if(gameIds!==undefined&&JSON.stringify(gameIds)!==JSON.stringify(DOWNLOAD_GAME_IDS_V255))fail('invalid_download_games',400);
  const totalBet=bets.reduce((sum,n)=>add(sum,n),0);if(totalBet<=0)fail('download_bet_required',400);
  const p=getPlayer(machineId,playerId);if(!ensureWallet(machineId,playerId,p))fail('wallet_migration_pending');const d=normalize(p);
  const previousId=own(d.requests,requestId)?d.requests[requestId]:null;
  if(previousId){const previous=sessionFor(d,previousId);if(!previous)fail('download_receipt_unavailable');if(JSON.stringify(previous.input.bets)!==JSON.stringify(bets))fail('download_request_conflict');return {created:false,id:previous.id,...state(machineId,playerId,{sessionId:previous.id})};}
  const active=current(p);if(active&&active.status!=='complete')return {created:false,id:active.id,...state(machineId,playerId,{sessionId:active.id})};
  const streamPending=Object.values(p.rounds||{}).some(r=>!r.committed&&r.reservation?.status==='reserved')||(coreRounds(machineId)||[]).some(r=>Number(r.participants?.[playerId]?.totalBet)>0&&!r.participants[playerId].settlement&&!p.rounds?.[r.id]?.committed);
  if(streamPending)fail('streaming_round_unsettled');
  if(sugarLedger.publicState(p).current)fail('streaming_sugar_unsettled');
  if(!money(p.wallet?.credit)||p.wallet.credit<totalBet)fail('insufficient_credit');
  let id;
  transaction(machineId,()=>{
   const at=now(),seed=randomSeed();if(!money(seed)||seed>0xffffffff)fail('invalid_download_seed',500);
   id=newId();if(typeof id!=='string'||!/^dl255-[A-Za-z0-9-]{16,100}$/.test(id)||own(d.sessions,id))fail('invalid_download_session_id',500);
   const rate=quoteRate(p,id,totalBet);
   // The existing bank may open one Sugar challenge for this private round.
   // Its random card/multiplier is persisted before any worker computation.
   sugarLedger.start(p,{roundId:id,station:1,openedAt:at});
   const input={version:255,sessionId:id,machineId,playerId,requestId,seed,createdAt:at,bets:[...bets],gameIds:[...DOWNLOAD_GAME_IDS_V255],rate,creditBefore:p.wallet.credit,totalBet,previousState:copy(d.gameState),sixDropCarry:copy(p.sixDropV247),sugarState:sugarLedger.publicState(p),profile:copy(profile)};
   const record={id,status:'preparing',requestId,input,walletRevisionBefore:p.wallet.revision,createdAt:at,updatedAt:at,progress:{seq:0,ballIndex:0,playbackMs:0},attempts:0,error:null,package:null};
   Object.defineProperty(d.sessions,id,{value:record,enumerable:true,writable:true,configurable:true});Object.defineProperty(d.requests,requestId,{value:id,enumerable:true,writable:true,configurable:true});
   d.activeId=id;d.revision++;p.updatedAt=at;
  });
  return {created:true,id,...state(machineId,playerId,{sessionId:id})};
 }
 function work(machineId,playerId,sessionId){
  const p=getPlayer(machineId,playerId),d=normalize(p),s=sessionFor(d,sessionId);
  if(!s)fail('download_session_not_found',404);
  if(s.status==='ready'||s.status==='complete')return null;
  if(d.activeId!==s.id)fail('download_session_not_active');
  transaction(machineId,()=>{s.status='preparing';s.attempts++;s.error=null;s.updatedAt=now();d.revision++;});
  return copy(s.input);
 }
 function validateOutput(input,result){
  if(!result||result.version!==255||!Array.isArray(result.numbers)||result.numbers.length!==8||result.numbers.some(n=>!Number.isInteger(n)||n<1||n>25)||new Set(result.numbers).size!==8)fail('download_invalid_computed_numbers',500);
  if(!result.initialState||!result.finalState||typeof result.playback!=='object'||!result.playback)fail('download_incomplete_computed_state',500);
  if(!Array.isArray(result.games))fail('download_invalid_computed_games',500);
  const games={},seen=new Set();let totalWin=0;
  for(const row of result.games){
   const index=DOWNLOAD_GAME_IDS_V255.indexOf(row?.id);
   if(index<0||seen.has(row.id)||row.bet!==input.bets[index]||!money(row.win)||row.bet===0&&row.win!==0)fail('download_invalid_computed_award',500);
   seen.add(row.id);totalWin=add(totalWin,row.win);games[row.id]=copy(row);
  }
  for(let i=0;i<input.bets.length;i++)if(input.bets[i]>0&&!seen.has(DOWNLOAD_GAME_IDS_V255[i]))fail('download_missing_computed_game',500);
  const draws=result.finalState.draws;
  if(!Array.isArray(draws)||JSON.stringify(draws)!==JSON.stringify(result.numbers))fail('download_state_draw_mismatch',500);
  return {games,totalWin};
 }
 function finish(machineId,playerId,sessionId,result,storePackage){
  const p=getPlayer(machineId,playerId),d=normalize(p),s=sessionFor(d,sessionId);
  if(!s)fail('download_session_not_found',404);
  if(s.status==='ready'||s.status==='complete')return state(machineId,playerId,{sessionId});
  if(d.activeId!==sessionId)fail('download_session_not_active');
  const checked=validateOutput(s.input,result);
  transaction(machineId,()=>{
   if(p.wallet.revision!==s.walletRevisionBefore||p.wallet.credit!==s.input.creditBefore)fail('download_wallet_changed');
   const at=now(),before=p.wallet.credit,oldSugar=sugarLedger.publicState(p),sugar=sugarLedger.advance(p,{roundId:sessionId,balls:result.numbers});
   const sugarWin=sugar.cashPaid||0;
   const accepted=new Set(oldSugar.acceptedIds||[]),tokens=(Array.isArray(result.sugarTokens)?result.sugarTokens:[]).filter(t=>t&&(!t.sugarId||!accepted.has(t.sugarId))&&(!t.sourceRoundId||t.sourceRoundId===sessionId)).map((t,i)=>({...copy(t),sugarId:typeof t.sugarId==='string'?t.sugarId:sessionId+':'+String(t.game)+':'+i,sourceRoundId:sessionId}));
   if(tokens.length){const ingested=sugarLedger.ingest(p,{roundId:sessionId,tokens,locked:s.input.bets,bets:s.input.bets,games:checked.games,payoutRate:s.input.rate});if(ingested.rejectedCount)fail('download_invalid_computed_sugar',500);}
   const credit=amount(p.wallet.credit-s.input.totalBet+checked.totalWin),roundWin=add(checked.totalWin,sugarWin);
   p.lifetimeBet=add(amount(p.lifetimeBet||0),s.input.totalBet);p.lifetimeWin=add(amount(p.lifetimeWin||0),checked.totalWin);
   p.games=p.games||{};
   for(const [id,row] of Object.entries(checked.games)){
    const old=p.games[id]||{bet:0,win:0};p.games[id]={...old,bet:add(amount(old.bet||0),row.bet),win:add(amount(old.win||0),row.win)};
    if(row.bet>0){const oldStats=d.stats.games[id]||{rounds:0,bet:0,win:0,maxWin:0};d.stats.games[id]={rounds:add(oldStats.rounds,1),bet:add(oldStats.bet,row.bet),win:add(oldStats.win,row.win),maxWin:Math.max(oldStats.maxWin,row.win)};}
   }
   const candy=checked.games.candy;
   if(candy?.bet>0&&candy.rulesVersion===247&&candy.carryV247){const c=candy.win>0?candy.carryV247:{};p.sixDropV247={version:247,revision:(p.sixDropV247?.revision||0)+1,roundId:sessionId,bankUnits:amount(c.bankUnits||0),removed:amount(c.removed||0),feed:amount(c.feed||0)};}
   p.wallet={...p.wallet,credit,revision:(p.wallet.revision||0)+1,lastRoundId:sessionId,source:'download-v255',reservedRoundId:null,updatedAt:at};p.currentRoundId=sessionId;p.currentRoundBet=s.input.totalBet;p.currentRoundWin=checked.totalWin;p.lastBall=8;p.updatedAt=at;
   const sugarState=sugarLedger.publicState(p),finalState={...copy(result.finalState),credit,displayCredit:credit,wonderBank:copy(sugarState.bank),wonderSteps:sugarState.bank.length,wonderValue:sugarState.bank.reduce((sum,t)=>sum+Number(t.value||0),0)};
   d.gameState=copy(finalState);d.stats.rounds=add(d.stats.rounds,1);d.stats.bet=add(d.stats.bet,s.input.totalBet);d.stats.win=add(d.stats.win,roundWin);d.stats.sugarWin=add(d.stats.sugarWin,sugarWin);d.stats.maxRoundWin=Math.max(d.stats.maxRoundWin,roundWin);
   const saved={...copy(result),sessionId,requestId:s.requestId,seed:s.input.seed,bets:[...s.input.bets],gameIds:[...DOWNLOAD_GAME_IDS_V255],profile:copy(s.input.profile),rate:s.input.rate,creditBefore:before,creditAfter:credit,totalBet:s.input.totalBet,totalWin:checked.totalWin,sugarWin,finalState,sugarState,wallet:copy(p.wallet),stats:copy(d.stats)};
   if(Array.isArray(saved.playback.checkpoints)&&saved.playback.checkpoints.length===9)saved.playback.checkpoints[8]=copy(finalState);
   const packageInfo=storePackage(saved);
   if(!packageInfo||typeof packageInfo.file!=='string'||typeof packageInfo.sha256!=='string'||!money(packageInfo.bytes))fail('download_package_not_saved',500);
   s.package=packageInfo;s.status='ready';s.preparedAt=at;s.updatedAt=at;s.totalWin=checked.totalWin;s.sugarWin=sugarWin;s.creditAfter=credit;s.durationMs=Math.max(0,Number(result.playback.recording?.durationMs)||Number(result.playback.durationMs)||0);s.error=null;d.lastId=sessionId;d.revision++;
   const record={id:sessionId,bet:s.input.totalBet,win:checked.totalWin,games:copy(checked.games),phase:'COMPLETE',lastBall:8,balls:result.numbers.map((number,index)=>({index:index+1,number})),committed:true,updatedAt:at,reservation:{roundId:sessionId,status:'settled',bet:s.input.totalBet,creditBefore:before,creditAfterBet:before-s.input.totalBet},settlement:{totalWin:checked.totalWin,creditAfter:credit,source:'download-v255',settledAt:at},wasOffline:false};
   p.rounds=p.rounds||{};p.rounds[sessionId]=record;
  });
  return state(machineId,playerId,{sessionId});
 }
 function failed(machineId,playerId,sessionId,error){
  const p=getPlayer(machineId,playerId),d=normalize(p),s=sessionFor(d,sessionId);if(!s||s.status==='ready'||s.status==='complete')return;
  transaction(machineId,()=>{s.status='failed';s.error=String(error?.message||error||'download_generation_failed').slice(0,240);s.updatedAt=now();d.revision++;});
 }
 function progress(machineId,playerId,{sessionId,seq,ballIndex,playbackMs}={}){
  const p=getPlayer(machineId,playerId),d=normalize(p),s=sessionFor(d,sessionId);if(!s)fail('download_session_not_found',404);
  if(!money(seq)||!Number.isInteger(ballIndex)||ballIndex<0||ballIndex>8||!Number.isFinite(playbackMs)||playbackMs<0)fail('invalid_download_progress',400);
  if(!['ready','complete'].includes(s.status))fail('download_not_ready');
  if(seq>s.progress.seq&&s.status!=='complete')transaction(machineId,()=>{s.progress={seq,ballIndex:Math.max(s.progress.ballIndex,ballIndex),playbackMs:Math.max(s.progress.playbackMs,Math.min(s.durationMs,playbackMs))};s.updatedAt=now();d.revision++;});
  return state(machineId,playerId,{sessionId});
 }
 function complete(machineId,playerId,{sessionId}={}){
  const p=getPlayer(machineId,playerId),d=normalize(p),s=sessionFor(d,sessionId);if(!s)fail('download_session_not_found',404);
  if(!['ready','complete'].includes(s.status))fail('download_not_ready');
  if(s.status!=='complete')transaction(machineId,()=>{s.status='complete';s.completedAt=now();s.updatedAt=s.completedAt;s.progress={seq:s.progress.seq+1,ballIndex:8,playbackMs:s.durationMs};if(d.activeId===sessionId)d.activeId=null;d.lastId=sessionId;d.revision++;});
  return state(machineId,playerId,{sessionId});
 }
 function packageInfo(machineId,playerId,sessionId){const p=getPlayer(machineId,playerId),d=normalize(p),s=sessionFor(d,sessionId);if(!s)fail('download_session_not_found',404);return copy(s.package);}
 function pending(machineId){
  const m=getMachine(machineId),jobs=[];
  for(const p of Object.values(m?.players||{})){const s=current(p);if(s&&['preparing','failed'].includes(s.status))jobs.push({machineId,playerId:p.playerId,sessionId:s.id});}return jobs;
 }
 function list(machineId){return Object.values(getMachine(machineId)?.players||{}).filter(p=>p.downloadV255).map(p=>{const d=normalize(p);return {playerId:p.playerId,wallet:copy(p.wallet),stats:copy(d.stats),active:summary(sessionFor(d,d.activeId)),last:summary(sessionFor(d,d.lastId))};});}
 return {normalize,state,locked,prepare,work,finish,failed,progress,complete,packageInfo,pending,list,machines:listMachineIds};
}

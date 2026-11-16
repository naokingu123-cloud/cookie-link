import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {WebSocketServer} from 'ws';

const VERSION=3;
const DATA_DIR=process.env.SWEETS_DATA_DIR||path.join(process.cwd(),'data');
const DATA_FILE=path.join(DATA_DIR,'payout-control-v3.json');
const LEGACY_FILE=path.join(DATA_DIR,'payout-control-v2.json');
const ADMIN_TOKEN=String(process.env.SWEETS_ADMIN_TOKEN||'');
const DEFAULT_CONFIG={
 targetRate:90,minRate:50,maxRate:150,maxStepPerRound:5,recoveryRounds:6,
 maxBias:35,betShockRatio:2,minimumQuoteBet:10,workLockMs:90000
};
const requestBodies=new WeakMap(),deferredHeads=new WeakMap();
let dirty=false,saveTimer=0;

const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));
const finite=value=>Number.isFinite(Number(value))?Number(value):0;
const safeId=value=>String(value||'').replace(/[^A-Za-z0-9._-]/g,'').slice(0,160);
const round1=value=>Math.round(Number(value)*10)/10;
const payoutRate=(win,bet)=>bet>0?win/bet*100:null;
const now=()=>Date.now();

function blank(){return {version:VERSION,config:{...DEFAULT_CONFIG},machines:{},updatedAt:now()};}
function normalizeGame(game={}){
 game.bet=finite(game.bet);game.win=finite(game.win);return game;
}
function normalizeRound(round={}){
 round.id=safeId(round.id);round.bet=finite(round.bet);round.win=finite(round.win);round.lastBall=Math.max(0,Math.min(8,Number(round.lastBall)||0));
 round.games=round.games||{};for(const game of Object.values(round.games))normalizeGame(game);
 round.balls=Array.isArray(round.balls)?round.balls.slice(0,8):[];round.ballHistory=Array.isArray(round.ballHistory)?round.ballHistory.slice(-8):[];
 round.wasOffline=!!round.wasOffline;round.phase=round.phase||'BETTING';round.settlement=round.settlement||null;round.committed=!!round.committed;
 round.stableBall=Math.max(0,Math.min(8,Number(round.stableBall)||0));round.stableState=round.stableState&&typeof round.stableState==='object'?round.stableState:null;
 round.work=round.work&&typeof round.work==='object'?round.work:null;return round;
}
function normalizePlayer(player={},config=DEFAULT_CONFIG){
 player.mode=player.mode==='manual'?'manual':'auto';player.manualRate=clamp(player.manualRate||config.targetRate,config.minRate,config.maxRate);
 player.targetRate=clamp(player.targetRate||config.targetRate,config.minRate,config.maxRate);player.effectiveRate=clamp(player.effectiveRate||player.targetRate,config.minRate,config.maxRate);
 player.lifetimeBet=finite(player.lifetimeBet);player.lifetimeWin=finite(player.lifetimeWin);player.games=player.games||{};for(const game of Object.values(player.games))normalizeGame(game);
 player.rounds=player.rounds||{};for(const round of Object.values(player.rounds))normalizeRound(round);
 player.currentRoundId=safeId(player.currentRoundId);player.currentRoundBet=finite(player.currentRoundBet);player.currentRoundWin=finite(player.currentRoundWin);
 player.lastBall=Math.max(0,Math.min(8,Number(player.lastBall)||0));player.lastQuotedBet=finite(player.lastQuotedBet);player.lastQuoteKey=String(player.lastQuoteKey||'');
 player.wallet=player.wallet&&typeof player.wallet==='object'?player.wallet:{credit:null,revision:0,lastRoundId:null,updatedAt:0};
 player.wallet.credit=Number.isFinite(Number(player.wallet.credit))?Number(player.wallet.credit):null;player.wallet.revision=Number(player.wallet.revision)||0;
 player.updatedAt=finite(player.updatedAt)||now();return player;
}
function migrateV2(){
 try{
  const old=JSON.parse(fs.readFileSync(LEGACY_FILE,'utf8')),next=blank();
  for(const [machineId,oldMachine] of Object.entries(old.machines||{})){
   const target=next.machines[machineId]={id:machineId,players:{},updatedAt:now()};
   for(const [playerId,oldPlayer] of Object.entries(oldMachine.players||{})){
    const p=normalizePlayer({playerId,games:{},rounds:{}},next.config);let weighted=0,weight=0;
    for(const [gameId,oldGame] of Object.entries(oldPlayer.games||{})){
     const g=p.games[gameId]=normalizeGame({bet:finite(oldGame.bet),win:finite(oldGame.win)});p.lifetimeBet+=g.bet;p.lifetimeWin+=g.win;
     const w=Math.max(1,g.bet);weighted+=finite(oldGame.effectiveRate||next.config.targetRate)*w;weight+=w;
    }
    p.effectiveRate=clamp(weight?weighted/weight:next.config.targetRate,next.config.minRate,next.config.maxRate);target.players[playerId]=p;
   }
  }
  return next;
 }catch{return blank();}
}
function load(){
 try{const parsed=JSON.parse(fs.readFileSync(DATA_FILE,'utf8'));return normalizeDb(parsed);}catch{return migrateV2();}
}
function normalizeDb(input){
 const db=input&&typeof input==='object'?input:blank();db.version=VERSION;db.config={...DEFAULT_CONFIG,...(db.config||{})};db.machines=db.machines||{};
 for(const [id,machine] of Object.entries(db.machines)){machine.id=safeId(machine.id||id)||'public-01';machine.players=machine.players||{};for(const player of Object.values(machine.players))normalizePlayer(player,db.config);}
 return db;
}
const db=load();
function scheduleSave(){dirty=true;clearTimeout(saveTimer);saveTimer=setTimeout(save,100);saveTimer.unref?.();}
function save(){if(!dirty)return;dirty=false;db.updatedAt=now();try{fs.mkdirSync(DATA_DIR,{recursive:true});fs.writeFileSync(DATA_FILE,JSON.stringify(db,null,2));}catch(error){console.error('[PayoutV3] save',error);}}
process.on('exit',save);process.on('SIGINT',()=>{save();process.exit(0);});process.on('SIGTERM',()=>{save();process.exit(0);});

function machine(id){id=safeId(id)||'public-01';return db.machines[id]||(db.machines[id]={id,players:{},updatedAt:now()});}
function player(machineId,playerId){const m=machine(machineId);playerId=safeId(playerId);const p=m.players[playerId]||(m.players[playerId]={playerId,games:{},rounds:{}});return normalizePlayer(p,db.config);}
function roundRecord(machineId,playerId,roundId){const p=player(machineId,playerId);roundId=safeId(roundId)||'round';const round=p.rounds[roundId]||(p.rounds[roundId]={id:roundId,games:{},ballHistory:[],balls:[]});return normalizeRound(round);}
function targetFor(p){return clamp(p.targetRate||db.config.targetRate,db.config.minRate,db.config.maxRate);}
function monetaryDebt(p){return targetFor(p)*p.lifetimeBet/100-p.lifetimeWin;}
function desiredForBet(p,bet){
 const target=targetFor(p),stake=Math.max(finite(db.config.minimumQuoteBet),finite(bet)),horizon=Math.max(1,finite(db.config.recoveryRounds));
 const bias=clamp(monetaryDebt(p)/stake/horizon*100,-finite(db.config.maxBias),finite(db.config.maxBias));
 return round1(clamp(target+bias,db.config.minRate,db.config.maxRate));
}
function quoteRate(p,roundId,bet){
 if(p.mode==='manual'){p.effectiveRate=round1(clamp(p.manualRate,db.config.minRate,db.config.maxRate));return p.effectiveRate;}
 const key=safeId(roundId)+':'+round1(bet);if(p.lastQuoteKey===key)return p.effectiveRate;
 const desired=desiredForBet(p,bet),previousBet=Math.max(0,p.lastQuotedBet),ratio=previousBet>0&&bet>0?Math.max(bet/previousBet,previousBet/bet):Infinity;
 if(ratio>=Math.max(1.01,finite(db.config.betShockRatio)))p.effectiveRate=desired;
 else{
  const step=Math.max(.1,finite(db.config.maxStepPerRound));p.effectiveRate=round1(clamp(p.effectiveRate+clamp(desired-p.effectiveRate,-step,step),db.config.minRate,db.config.maxRate));
 }
 p.lastQuotedBet=finite(bet);p.lastQuoteKey=key;return p.effectiveRate;
}
function trimRounds(p){
 const rounds=Object.values(p.rounds).sort((a,b)=>finite(b.updatedAt)-finite(a.updatedAt));
 for(const round of rounds.slice(30))if(round.settlement||round.committed)delete p.rounds[round.id];
}
function gameRowsFromBet(body){
 const rows=body?.payoutV3Bet?.games;return Array.isArray(rows)?rows.map(item=>({id:safeId(item.id||item.kind||'game'),bet:Math.max(0,finite(item.bet))})).filter(item=>item.id):[];
}
function processJoin(machineId,playerId,body,response){
 const roundId=safeId(response?.round?.id||body?.roundId);if(!roundId)return null;
 const p=player(machineId,playerId),bet=Math.max(0,finite(body.totalBet)),round=roundRecord(machineId,playerId,roundId);
 if(p.currentRoundId!==roundId){p.currentRoundId=roundId;p.currentRoundWin=0;p.lastBall=0;}
 p.currentRoundBet=bet;round.bet=bet;round.phase=response?.round?.phase||round.phase;round.updatedAt=now();round.quotedRate=quoteRate(p,roundId,bet);
 for(const item of gameRowsFromBet(body)){const g=round.games[item.id]||(round.games[item.id]={bet:0,win:0});g.bet=item.bet;}
 p.updatedAt=now();machine(machineId).updatedAt=now();trimRounds(p);scheduleSave();return publicControl(machineId,playerId);
}
function telemetryFrom(payload){const telemetry=payload?.state?.payoutV3;return telemetry&&Number(telemetry.version)===VERSION?telemetry:null;}
function processTelemetry(machineId,playerId,payload){
 const telemetry=telemetryFrom(payload);if(!telemetry)return null;
 const roundId=safeId(payload.roundId),ball=Math.max(0,Math.min(8,Number(payload.ballIndex)||Number(telemetry.ball)||0)),p=player(machineId,playerId),round=roundRecord(machineId,playerId,roundId);
 round.phase=telemetry.phase||round.phase;round.lastBall=Math.max(round.lastBall,ball);round.win=Math.max(0,finite(telemetry.roundWin));round.updatedAt=now();
 p.currentRoundId=roundId;p.currentRoundBet=Math.max(0,finite(telemetry.roundBet||round.bet));p.currentRoundWin=round.win;p.lastBall=ball;p.currentCredit=finite(telemetry.credit);p.updatedAt=now();
 const games={};for(const item of Array.isArray(telemetry.games)?telemetry.games:[]){
  const id=safeId(item.id||item.kind||'game');if(!id)continue;const g=round.games[id]||(round.games[id]={bet:0,win:0});g.bet=Math.max(0,finite(item.bet));g.win=Math.max(0,finite(item.win));g.appliedRate=Number.isFinite(Number(item.appliedRate))?Number(item.appliedRate):g.appliedRate;games[id]={bet:g.bet,win:g.win,appliedRate:g.appliedRate};
 }
 const history={roundId,ball,number:Number(telemetry.number)||null,roundBet:p.currentRoundBet,roundWin:round.win,currentCredit:p.currentCredit,games,updatedAt:now()};
 const pos=round.ballHistory.findIndex(item=>Number(item.ball)===ball);if(pos>=0)round.ballHistory[pos]=history;else round.ballHistory.push(history);round.ballHistory.sort((a,b)=>a.ball-b.ball);round.ballHistory=round.ballHistory.slice(-8);
 if(telemetry.complete&&payload.state&&typeof payload.state==='object'&&ball>=round.stableBall){round.stableState=payload.state;round.stableBall=ball;}
 scheduleSave();return publicControl(machineId,playerId);
}
function finalGames(payload,round){
 const telemetry=payload?.payoutV3;const rows=Array.isArray(telemetry?.games)?telemetry.games:[];const out={};
 for(const item of rows){const id=safeId(item.id||item.kind||'game');if(id)out[id]={bet:Math.max(0,finite(item.bet)),win:Math.max(0,finite(item.win)),appliedRate:Number.isFinite(Number(item.appliedRate))?Number(item.appliedRate):null};}
 if(!Object.keys(out).length)for(const [id,g] of Object.entries(round.games||{}))out[id]={bet:finite(g.bet),win:finite(g.win),appliedRate:g.appliedRate??null};
 return out;
}
function commitSettlement(machineId,playerId,roundId,{totalWin,creditAfter,games,source='client',digest=null}={}){
 const p=player(machineId,playerId),round=roundRecord(machineId,playerId,roundId);if(round.committed)return round.settlement;
 const win=Math.max(0,finite(totalWin)),bet=Math.max(0,finite(round.bet||Object.values(games||{}).reduce((sum,g)=>sum+finite(g.bet),0)));
 round.win=win;round.phase='COMPLETE';round.committed=true;round.settlement={totalWin:round1(win),creditAfter:round1(creditAfter),source,digest:digest||null,settledAt:now()};
 p.lifetimeBet+=bet;p.lifetimeWin+=win;p.currentRoundId=round.id;p.currentRoundBet=bet;p.currentRoundWin=win;p.lastBall=8;
 for(const [id,item] of Object.entries(games||{})){const total=p.games[id]||(p.games[id]={bet:0,win:0});total.bet+=Math.max(0,finite(item.bet));total.win+=Math.max(0,finite(item.win));const rg=round.games[id]||(round.games[id]={});Object.assign(rg,item);}
 const credit=Number.isFinite(Number(creditAfter))?Number(creditAfter):p.wallet.credit;
 p.wallet={credit:credit==null?null:round1(credit),revision:(Number(p.wallet.revision)||0)+1,lastRoundId:round.id,source,updatedAt:now()};p.updatedAt=now();quoteRate(p,'post-'+round.id,Math.max(bet,p.lastQuotedBet||bet));
 round.work=null;trimRounds(p);scheduleSave();return round.settlement;
}
function processSettle(machineId,playerId,body,response){
 const roundId=safeId(body.roundId);if(!roundId)return null;const round=roundRecord(machineId,playerId,roundId),games=finalGames(body,round);
 commitSettlement(machineId,playerId,roundId,{totalWin:finite(body.totalWin),creditAfter:finite(body.creditAfter),games,source:'client',digest:body.digest});return publicControl(machineId,playerId);
}
function markOffline(machineId,playerId){
 const p=player(machineId,playerId);for(const round of Object.values(p.rounds))if(!round.settlement&&!round.committed&&['PLAYING','COMPLETE'].includes(round.phase))round.wasOffline=true;p.updatedAt=now();scheduleSave();
}
function observeRound(machineId,round){
 if(!round?.id)return;const m=machine(machineId),roundId=safeId(round.id),balls=Array.isArray(round.balls)?round.balls.slice(0,8):[];
 for(const p of Object.values(m.players)){const record=p.rounds?.[roundId];if(!record)continue;record.phase=round.phase||record.phase;record.balls=balls.length?balls:record.balls;record.updatedAt=now();if(round.phase==='COMPLETE')record.lastBall=8;}
 scheduleSave();
}
function observeSocketMessage(machineId,message){
 if(message?.type==='snapshot'){observeRound(machineId,message.round);observeRound(machineId,message.pendingRound);return;}
 if(message?.type==='ball_result'){
  const m=machine(machineId),roundId=safeId(message.roundId);for(const p of Object.values(m.players)){const r=p.rounds?.[roundId];if(!r)continue;const ball=message.ball;if(ball&&!r.balls.some(item=>Number(item.index)===Number(ball.index)))r.balls.push(ball);r.balls.sort((a,b)=>a.index-b.index);r.lastBall=Math.max(r.lastBall,Number(ball?.index)||0);r.phase=message.phase||r.phase;r.updatedAt=now();}scheduleSave();return;
 }
 if(message?.type==='round_complete')observeRound(machineId,message.round);
}
function offlineCandidate(machineId){
 const m=machine(machineId),t=now();for(const p of Object.values(m.players))for(const round of Object.values(p.rounds||{})){
  if(round.work&&round.work.status==='running'&&t-finite(round.work.lockedAt)>finite(db.config.workLockMs))round.work=null;
  if(round.wasOffline&&!round.committed&&!round.settlement&&round.phase==='COMPLETE'&&round.balls.length>=8&&round.stableState&&(!round.work||round.work.status!=='running'))return {p,round};
 }return null;
}
function claimOfflineWork(machineId){
 const found=offlineCandidate(machineId);if(!found)return null;const {p,round}=found,token=randomUUID();round.work={status:'running',token,lockedAt:now(),attempts:(Number(round.work?.attempts)||0)+1};scheduleSave();
 return {version:VERSION,token,machineId:safeId(machineId),playerId:p.playerId,roundId:round.id,rate:round1(p.mode==='manual'?p.manualRate:p.effectiveRate),stableBall:round.stableBall,state:round.stableState,balls:round.balls,bet:round.bet};
}
function completeOfflineWork(machineId,body){
 const p=player(machineId,body.playerId),round=roundRecord(machineId,p.playerId,body.roundId);if(!round.work||round.work.token!==body.token)throw Object.assign(Error('work_lock_mismatch'),{status:409});
 const games={};for(const item of Array.isArray(body.games)?body.games:[]){const id=safeId(item.id||item.kind||'game');if(id)games[id]={bet:Math.max(0,finite(item.bet)),win:Math.max(0,finite(item.win)),appliedRate:Number.isFinite(Number(item.appliedRate))?Number(item.appliedRate):null};}
 return commitSettlement(machineId,p.playerId,round.id,{totalWin:body.totalWin,creditAfter:body.creditAfter,games,source:'server-worker',digest:body.digest});
}
function failOfflineWork(machineId,body){const p=player(machineId,body.playerId),round=roundRecord(machineId,p.playerId,body.roundId);if(round.work?.token===body.token)round.work=null;scheduleSave();}
function pendingOffline(p){return Object.values(p.rounds||{}).some(round=>round.wasOffline&&!round.committed&&!round.settlement&&round.phase==='COMPLETE');}
function publicControl(machineId,playerId){
 const p=player(machineId,playerId),games={};for(const [id,g] of Object.entries(p.games))games[id]={bet:round1(g.bet),win:round1(g.win),actualRate:g.bet>0?round1(g.win/g.bet*100):null};
 const current=p.rounds?.[p.currentRoundId]||null;return {version:VERSION,source:'per-player-common',playerId:p.playerId,updatedAt:p.updatedAt,mode:p.mode,manualRate:round1(p.manualRate),targetRate:round1(targetFor(p)),effectiveRate:round1(p.mode==='manual'?p.manualRate:p.effectiveRate),desiredRate:round1(desiredForBet(p,p.currentRoundBet||p.lastQuotedBet||db.config.minimumQuoteBet)),actualRate:p.lifetimeBet>0?round1(p.lifetimeWin/p.lifetimeBet*100):null,debt:round1(monetaryDebt(p)),lifetimeBet:round1(p.lifetimeBet),lifetimeWin:round1(p.lifetimeWin),currentRoundId:p.currentRoundId||null,currentRoundBet:round1(p.currentRoundBet),currentRoundWin:round1(p.currentRoundWin),lastBall:p.lastBall,wallet:{...p.wallet},offlinePending:pendingOffline(p),games,ballHistory:current?.ballHistory||[],currentGames:current?.games||{}};
}
function aggregateMachine(machineId){
 const m=machine(machineId),players=[],gameTotals={};let totalBet=0,totalWin=0;
 for(const p of Object.values(m.players)){const control=publicControl(machineId,p.playerId);players.push(control);totalBet+=p.lifetimeBet;totalWin+=p.lifetimeWin;for(const [id,g] of Object.entries(p.games)){const t=gameTotals[id]||(gameTotals[id]={bet:0,win:0});t.bet+=g.bet;t.win+=g.win;}}
 for(const t of Object.values(gameTotals)){t.bet=round1(t.bet);t.win=round1(t.win);t.actualRate=t.bet>0?round1(t.win/t.bet*100):null;}
 return {version:VERSION,config:{...db.config},totals:{bet:round1(totalBet),win:round1(totalWin),actualRate:totalBet>0?round1(totalWin/totalBet*100):null,games:gameTotals},players};
}
function overlayPlayerState(machineId,playerId,response){
 const p=player(machineId,playerId),settledIds=new Set(Object.values(p.rounds).filter(r=>r.committed||r.settlement).map(r=>r.id));
 if(response?.pendingRound?.id&&(settledIds.has(response.pendingRound.id)||p.rounds[response.pendingRound.id]?.wasOffline)){response.pendingRound=null;}
 if(response?.round?.participant&&settledIds.has(response.round.id))response.round.participant.settlement=p.rounds[response.round.id].settlement;
 response.payoutControlV3=publicControl(machineId,playerId);return response;
}
function parseJson(value){try{return JSON.parse(Buffer.isBuffer(value)?value.toString('utf8'):String(value||''));}catch{return null;}}
function setJson(response,payload,status=200){const text=JSON.stringify(payload);response.statusCode=status;try{response.removeHeader('content-length');response.setHeader('content-type','application/json; charset=utf-8');response.setHeader('content-length',Buffer.byteLength(text));}catch{}return text;}
function adminAllowed(req,url){const supplied=String(req.headers['x-admin-token']||url.searchParams.get('adminToken')||'');return !!ADMIN_TOKEN&&supplied===ADMIN_TOKEN;}
async function readBody(req){const chunks=[];for await(const chunk of req)chunks.push(Buffer.from(chunk));return parseJson(Buffer.concat(chunks))||{};}

const nativeIterator=http.IncomingMessage.prototype[Symbol.asyncIterator];
http.IncomingMessage.prototype[Symbol.asyncIterator]=async function* capture(){const chunks=[];for await(const chunk of nativeIterator.call(this)){chunks.push(Buffer.from(chunk));yield chunk;}requestBodies.set(this,Buffer.concat(chunks).toString('utf8'));};

const nativeWssEmit=WebSocketServer.prototype.emit;
WebSocketServer.prototype.emit=function(type,...args){
 if(type==='connection'){
  const [ws,req]=args;try{
   const url=new URL(req?.url||'/',`http://${req?.headers?.host||'localhost'}`),machineId=safeId(url.searchParams.get('machineId'))||'public-01',playerId=safeId(url.searchParams.get('playerId'));
   if(playerId){const nativeSend=ws.send.bind(ws);ws.send=function(data,...rest){try{observeSocketMessage(machineId,parseJson(data));}catch{}return nativeSend(data,...rest);};ws.on('close',()=>markOffline(machineId,playerId));}
  }catch{}
 }
 return nativeWssEmit.call(this,type,...args);
};

const nativeEmit=http.Server.prototype.emit;
http.Server.prototype.emit=function(type,...args){
 if(type==='request'){
  const [req,res]=args,url=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`),parts=url.pathname.split('/').filter(Boolean);
  if(parts[0]==='api'&&parts[1]==='admin'&&parts[2]==='machines'&&parts[4]==='payout-v3'){
   if(!adminAllowed(req,url)){res.statusCode=403;res.end(JSON.stringify({ok:false,error:'admin_required'}));return true;}
   const machineId=safeId(parts[3]);(async()=>{try{
    const body=req.method==='GET'?{}:await readBody(req);
    if(req.method==='POST'&&parts[5]==='global'){
     for(const key of Object.keys(DEFAULT_CONFIG))if(Number.isFinite(Number(body[key])))db.config[key]=Number(body[key]);
     db.config.minRate=clamp(db.config.minRate,40,150);db.config.maxRate=clamp(db.config.maxRate,db.config.minRate,180);db.config.targetRate=clamp(db.config.targetRate,db.config.minRate,db.config.maxRate);scheduleSave();res.end(setJson(res,{ok:true,payoutControlV3:aggregateMachine(machineId)}));return;
    }
    if(req.method==='POST'&&parts[5]==='players'&&parts[6]){
     const p=player(machineId,parts[6]);p.mode=body.mode==='manual'?'manual':'auto';if(Number.isFinite(Number(body.manualRate)))p.manualRate=clamp(body.manualRate,db.config.minRate,db.config.maxRate);if(Number.isFinite(Number(body.targetRate)))p.targetRate=clamp(body.targetRate,db.config.minRate,db.config.maxRate);p.effectiveRate=p.mode==='manual'?p.manualRate:desiredForBet(p,p.currentRoundBet||p.lastQuotedBet||db.config.minimumQuoteBet);p.lastQuoteKey='';scheduleSave();res.end(setJson(res,{ok:true,control:publicControl(machineId,p.playerId)}));return;
    }
    if(req.method==='GET'&&parts[5]==='offline-work'){res.end(setJson(res,{ok:true,work:claimOfflineWork(machineId)}));return;}
    if(req.method==='POST'&&parts[5]==='offline-work'&&parts[6]==='complete'){const settlement=completeOfflineWork(machineId,body);res.end(setJson(res,{ok:true,settlement}));return;}
    if(req.method==='POST'&&parts[5]==='offline-work'&&parts[6]==='fail'){failOfflineWork(machineId,body);res.end(setJson(res,{ok:true}));return;}
    res.end(setJson(res,{ok:false,error:'not_found'},404));
   }catch(error){res.end(setJson(res,{ok:false,error:error?.message||'payout_v3_error'},error?.status||500));}})();return true;
  }
 }
 return nativeEmit.call(this,type,...args);
};

const nativeWriteHead=http.ServerResponse.prototype.writeHead,nativeEnd=http.ServerResponse.prototype.end;
function intercepted(url){return /\/round\/(checkpoint|settle|join)$/.test(url.pathname)||/^\/api\/machines\/[^/]+\/state$/.test(url.pathname)||/^\/api\/admin\/machines\/[^/]+$/.test(url.pathname);}
http.ServerResponse.prototype.writeHead=function(...args){const req=this.req,url=req?new URL(req.url||'/',`http://${req.headers.host||'localhost'}`):null;if(url&&intercepted(url)){deferredHeads.set(this,args);this.statusCode=Number(args[0])||this.statusCode;return this;}return nativeWriteHead.apply(this,args);};
http.ServerResponse.prototype.end=function(chunk,encoding,callback){
 const req=this.req,url=req?new URL(req.url||'/',`http://${req.headers.host||'localhost'}`):null;let output=chunk;
 try{if(url&&this.statusCode<400){
  const checkpoint=url.pathname.match(/^\/api\/machines\/([^/]+)\/round\/checkpoint$/),settle=url.pathname.match(/^\/api\/machines\/([^/]+)\/round\/settle$/),join=url.pathname.match(/^\/api\/machines\/([^/]+)\/round\/join$/),state=url.pathname.match(/^\/api\/machines\/([^/]+)\/state$/),admin=url.pathname.match(/^\/api\/admin\/machines\/([^/]+)$/);
  const payload=parseJson(requestBodies.get(req)),response=parseJson(chunk),playerId=safeId(req.headers['x-player-id']);
  if(response&&checkpoint){response.payoutControlV3=processTelemetry(decodeURIComponent(checkpoint[1]),playerId,payload);output=JSON.stringify(response);}
  else if(response&&settle){response.payoutControlV3=processSettle(decodeURIComponent(settle[1]),playerId,payload,response);output=JSON.stringify(response);}
  else if(response&&join){response.payoutControlV3=processJoin(decodeURIComponent(join[1]),playerId,payload,response);output=JSON.stringify(response);}
  else if(response&&state){output=JSON.stringify(overlayPlayerState(decodeURIComponent(state[1]),playerId,response));}
  else if(response&&admin){observeRound(decodeURIComponent(admin[1]),response.round);response.payoutControlV3=aggregateMachine(decodeURIComponent(admin[1]));output=JSON.stringify(response);}
 }}catch(error){console.error('[PayoutV3] response',error);}
 const pending=deferredHeads.get(this);if(pending){deferredHeads.delete(this);const args=[...pending],headerIndex=typeof args[1]==='string'?2:1,headers={...(args[headerIndex]||{})};for(const key of Object.keys(headers))if(key.toLowerCase()==='content-length')delete headers[key];if(output!=null)headers['Content-Length']=Buffer.byteLength(Buffer.isBuffer(output)?output:typeof output==='string'?output:String(output));headers['Content-Type']=headers['Content-Type']||headers['content-type']||'application/json; charset=utf-8';args[headerIndex]=headers;nativeWriteHead.apply(this,args);}
 return nativeEnd.call(this,output,encoding,callback);
};

console.info('[PayoutV3] common per-player control, bet-shock repricing and server offline settlement queue loaded');


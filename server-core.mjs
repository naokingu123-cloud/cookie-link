import http from 'node:http';
import {createReadStream, promises as fs} from 'node:fs';
import {createHash, randomUUID, randomInt, timingSafeEqual} from 'node:crypto';
import {isIP} from 'node:net';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {WebSocketServer, WebSocket} from 'ws';

const ROOT=path.dirname(fileURLToPath(import.meta.url));
const PORT=Number(process.env.PORT||3000);
const DATA_FILE=process.env.SWEETS_DATA_FILE||path.join(ROOT,'data','shared-machine.json');
const ADMIN_TOKEN=String(process.env.SWEETS_ADMIN_TOKEN||'');
const payoutWallet=globalThis[Symbol.for('sweets-link.payout-v3.wallet')];
const BALLS_PER_ROUND=8;
const BET_DURATION_MS=Math.max(300,Number(process.env.SWEETS_BET_DURATION_MS||20000));
const ROUND_START_DELAY_MS=Math.max(300,Number(process.env.SWEETS_ROUND_START_DELAY_MS||2200));
const BALL_INTERVAL_MS=Math.max(300,Number(process.env.SWEETS_BALL_INTERVAL_MS||1800));
const RESULT_GRACE_MS=Math.max(300,Number(process.env.SWEETS_RESULT_GRACE_MS||5000));
const HOST_FALLBACK_DELAY_MS=Math.max(300,Number(process.env.SWEETS_HOST_FALLBACK_DELAY_MS||3500));
const ROUND_STALE_MS=45*60*1000;
const HISTORY_LIMIT=20;
const MAX_BODY=2*1024*1024;
const MACHINE_DEFAULT='public-01';
const STATIC_DENY=new Set(['server.mjs','package.json','package-lock.json']);

const now=()=>Date.now();
const hash=value=>createHash('sha256').update(String(value)).digest('hex');
const safeId=value=>String(value||'').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,64);
const safeText=(value,max=80)=>String(value||'').slice(0,max);

let db={version:2,players:{},machines:{},updatedAt:now()};
let saveTimer=null;
const socketsByMachine=new Map();
const requestBuckets=new Map();
const API_RATE_WINDOW_MS=10000,API_RATE_LIMIT=240;
let lastRequestBucketSweep=0;
const visualRelayAt=new Map();

function normalizeRound(round){
 if(!round)return null;
 round.participants=round.participants||{};
 round.balls=Array.isArray(round.balls)?round.balls:[];
 round.eligiblePlayerIds=Array.isArray(round.eligiblePlayerIds)?round.eligiblePlayerIds.map(safeId).filter(Boolean):[];
 round.hostPlayerId=safeId(round.hostPlayerId)||null;
 round.settlementCount=Number(round.settlementCount)||0;
 round.lastBallAt=Number(round.lastBallAt)||0;
 round.betOpenedAt=Number(round.betOpenedAt)||0;
 round.betClosesAt=Number(round.betClosesAt)||0;
 round.drawStartsAt=Number(round.drawStartsAt)||0;
 round.completedAt=Number(round.completedAt)||null;
 round.drawSource=round.drawSource||'physical';
 round.hostMissingSince=Number(round.hostMissingSince)||0;
 round.nextFallbackBallAt=Number(round.nextFallbackBallAt)||0;
 return round;
}
function normalizeMachine(m,id){
 m.id=safeId(m.id||id)||MACHINE_DEFAULT;
 m.revision=Number(m.revision)||0;
 m.sequence=Number(m.sequence)||0;
 m.hostPlayerId=safeId(m.hostPlayerId)||null;
 m.hostRegisteredAt=Number(m.hostRegisteredAt)||0;
 m.round=normalizeRound(m.round);
 m.history=(Array.isArray(m.history)?m.history:[]).map(normalizeRound).filter(Boolean).slice(-HISTORY_LIMIT);
 m.updatedAt=Number(m.updatedAt)||now();
 return m;
}
async function loadDb(){
 try{
  const parsed=JSON.parse(await fs.readFile(DATA_FILE,'utf8'));
  if(parsed&&parsed.players&&parsed.machines){
   db={version:2,players:parsed.players,machines:parsed.machines,updatedAt:parsed.updatedAt||now()};
   for(const [id,m] of Object.entries(db.machines))normalizeMachine(m,id);
  }
 }catch(error){if(error?.code!=='ENOENT')console.warn('[SharedMachine] database load failed',error);}
}
let saveQueue=Promise.resolve();
function flushDb(){
 clearTimeout(saveTimer);saveTimer=null;db.updatedAt=now();const serialized=JSON.stringify(db,null,2);
 const pending=saveQueue.catch(()=>{}).then(async()=>{
  await fs.mkdir(path.dirname(DATA_FILE),{recursive:true});
  const temporary=DATA_FILE+'.tmp';await fs.writeFile(temporary,serialized);await fs.rename(temporary,DATA_FILE);
 });
 saveQueue=pending;return pending;
}
function scheduleSave(){
 db.updatedAt=now();if(saveTimer)return;
 saveTimer=setTimeout(()=>{saveTimer=null;flushDb().catch(error=>console.error('[SharedMachine] database save failed',error));},40);
}
function machine(id=MACHINE_DEFAULT){
 id=safeId(id)||MACHINE_DEFAULT;
 return db.machines[id]||(db.machines[id]=normalizeMachine({id,revision:0,sequence:0,round:null,history:[],updatedAt:now()},id));
}
function publicParticipant(participant,{includeState=true}={}){
 if(!participant)return null;
 const out={
  playerId:participant.playerId,joinedAt:participant.joinedAt,lastSeen:participant.lastSeen,
  clientRoundToken:participant.clientRoundToken||null,bets:participant.bets||[],locked:participant.locked||[],
  enabled:participant.enabled||[],totalBet:Number(participant.totalBet)||0,creditAfterBet:Number(participant.creditAfterBet)||0,
  checkpointBall:Number(participant.checkpointBall)||0,settlement:participant.settlement||null,appVersion:participant.appVersion||null
 };
 if(includeState){out.initialState=participant.initialState||null;out.checkpoint=participant.checkpoint||null;}
 return out;
}
function publicRound(round,playerId){
 if(!round)return null;
 return {
  id:round.id,sequence:round.sequence,phase:round.phase,balls:[...(round.balls||[])],
  betOpenedAt:round.betOpenedAt||null,betClosesAt:round.betClosesAt||null,drawStartsAt:round.drawStartsAt||null,
  startedAt:round.startedAt||null,completedAt:round.completedAt||null,hostPlayerId:round.hostPlayerId||null,
  participant:playerId?publicParticipant(round.participants?.[playerId]):null,
  participantCount:Object.keys(round.participants||{}).length,
  eligibleCount:(round.eligiblePlayerIds||[]).length,
  canBet:!!playerId&&round.phase==='BETTING'&&(round.eligiblePlayerIds||[]).includes(playerId),
  drawSource:round.drawSource||'physical'
 };
}
function pendingRoundForPlayer(m,playerId){
 const rounds=[m.round,...(m.history||[])].filter(Boolean).sort((a,b)=>Number(b.sequence)-Number(a.sequence));
 return rounds.find(round=>round.phase==='COMPLETE'&&round.participants?.[playerId]&&!round.participants[playerId].settlement)||null;
}
function lookupRound(m,roundId){
 roundId=safeText(roundId,160);
 if(m.round?.id===roundId)return m.round;
 return (m.history||[]).find(round=>round?.id===roundId)||null;
}
function snapshot(m,playerId){
 const isHost=!!playerId&&m.hostPlayerId===playerId;
 const pending=isHost?null:pendingRoundForPlayer(m,playerId);
 return {type:'snapshot',serverTime:now(),machine:{id:m.id,revision:m.revision,hostPlayerId:m.hostPlayerId||null,hostConnected:!!m.hostPlayerId&&connected(m.id,m.hostPlayerId),source:'physical-host'},round:publicRound(m.round,playerId),pendingRound:pending?publicRound(pending,playerId):null,role:isHost?'host':'player'};
}
function socketMap(machineId){let map=socketsByMachine.get(machineId);if(!map){map=new Map();socketsByMachine.set(machineId,map);}return map;}
function connected(machineId,playerId){const set=socketMap(machineId).get(playerId);return !!set&&[...set].some(ws=>ws.readyState===WebSocket.OPEN);}
function broadcast(machineId,message){
 const payload=JSON.stringify({...message,serverTime:now()});
 for(const set of socketMap(machineId).values())for(const ws of set)if(ws.readyState===WebSocket.OPEN)try{ws.send(payload);}catch{}
}
function connectedPlayerIds(m){
 return [...socketMap(m.id).keys()].filter(id=>id!==m.hostPlayerId&&connected(m.id,id));
}
function archiveRound(m,round){
 if(!round)return;
 m.history=m.history||[];
 if(!m.history.some(item=>item?.id===round.id))m.history.push(round);
 m.history=m.history.slice(-HISTORY_LIMIT);
}
function eligiblePlayerIds(m){
 // BET eligibility is based only on being connected when the server opens the window.
 // Previous settlement/recovery never blocks the global server clock.
 return connectedPlayerIds(m);
}
function createBettingRound(m){
 if(m.round?.phase==='COMPLETE')archiveRound(m,m.round);
 const t=now(),sequence=(Number(m.sequence)||0)+1;m.sequence=sequence;
 const eligible=eligiblePlayerIds(m);
 if(!eligible.length){m.round=null;m.revision++;m.updatedAt=t;scheduleSave();return null;}
 const round={
  id:m.id+'-'+sequence+'-'+randomUUID().slice(0,8),sequence,phase:'BETTING',balls:[],
  betOpenedAt:t,betClosesAt:t+BET_DURATION_MS,drawStartsAt:0,startedAt:null,completedAt:null,
  hostPlayerId:m.hostPlayerId||null,participants:{},eligiblePlayerIds:eligible,settlementCount:0,lastBallAt:0,
  drawSource:'physical',hostMissingSince:0,nextFallbackBallAt:0
 };
 m.round=round;m.revision++;m.updatedAt=t;scheduleSave();broadcast(m.id,{type:'betting_started',round:publicRound(round,null)});
 return round;
}
function randomUnusedNumber(round){
 const used=new Set((round.balls||[]).map(ball=>Number(ball.number)));
 const pool=[];for(let n=1;n<=25;n++)if(!used.has(n))pool.push(n);
 return pool.length?pool[randomInt(pool.length)]:null;
}
function finishRound(m,round,at=now()){
 if(!round||round.phase==='COMPLETE')return;
 round.phase='COMPLETE';round.completedAt=at;round.nextFallbackBallAt=0;round.hostMissingSince=0;
 m.revision++;m.updatedAt=at;scheduleSave();broadcast(m.id,{type:'round_complete',round:publicRound(round,null)});
}
function appendBall(m,round,number,reportedBy,eventId){
 const index=round.balls.length+1;if(index>BALLS_PER_ROUND)return null;
 number=Number(number);if(!Number.isInteger(number)||number<1||number>25||round.balls.some(ball=>Number(ball.number)===number))return null;
 const landedAt=now(),ball={index,number,eventId:safeText(eventId||round.id+':'+index,160),landedAt,reportedBy};
 round.balls.push(ball);round.lastBallAt=landedAt;m.revision++;m.updatedAt=landedAt;
 scheduleSave();broadcast(m.id,{type:'ball_result',roundId:round.id,ball,phase:index>=BALLS_PER_ROUND?'COMPLETE':round.phase});
 if(index>=BALLS_PER_ROUND)finishRound(m,round,landedAt);
 return ball;
}
function activateServerFallback(m,round,reason='host_offline'){
 if(!round||round.phase!=='PLAYING'||round.drawSource==='server-fallback')return;
 round.drawSource='server-fallback';round.fallbackReason=reason;round.nextFallbackBallAt=now()+400;round.hostMissingSince=0;
 m.revision++;m.updatedAt=now();scheduleSave();broadcast(m.id,{type:'server_fallback_started',roundId:round.id,reason,round:publicRound(round,null)});
}
function tickMachine(m){
 const t=now(),round=m.round,hostOnline=!!m.hostPlayerId&&connected(m.id,m.hostPlayerId);
 if(!round){
  if(hostOnline&&eligiblePlayerIds(m).length)createBettingRound(m);
  return;
 }
 if(round.phase==='BETTING'){
  if(t<Number(round.betClosesAt||0))return;
  for(const [id,p] of Object.entries(round.participants||{}))if(!(Number(p.totalBet)>0))delete round.participants[id];
  if(!Object.keys(round.participants||{}).length){
   round.phase='COMPLETE';round.completedAt=t-RESULT_GRACE_MS+800;round.drawSource='no-bets';
   m.revision++;m.updatedAt=t;scheduleSave();broadcast(m.id,{type:'betting_closed',round:publicRound(round,null),reason:'no_bets'});return;
  }
  round.phase='PLAYING';round.startedAt=t;round.drawStartsAt=t+ROUND_START_DELAY_MS;round.hostPlayerId=m.hostPlayerId||null;
  round.drawSource='physical';round.hostMissingSince=hostOnline?0:t;m.revision++;m.updatedAt=t;scheduleSave();
  broadcast(m.id,{type:'round_started',round:publicRound(round,null)});
  return;
 }
 if(round.phase==='PLAYING'){
  if(round.balls.length>=BALLS_PER_ROUND){finishRound(m,round,t);return;}
  if(t<Number(round.drawStartsAt||round.startedAt||0))return;
  if(round.drawSource==='server-fallback'){
   if(t>=Number(round.nextFallbackBallAt||0)){
    const number=randomUnusedNumber(round);if(number!=null)appendBall(m,round,number,'server-fallback',round.id+':fallback:'+(round.balls.length+1));
    if(round.phase==='PLAYING')round.nextFallbackBallAt=now()+BALL_INTERVAL_MS;
   }
   return;
  }
  if(hostOnline){round.hostMissingSince=0;return;}
  if(!round.hostMissingSince)round.hostMissingSince=t;
  if(t-round.hostMissingSince>=HOST_FALLBACK_DELAY_MS)activateServerFallback(m,round,'host_offline');
  return;
 }
 if(round.phase==='COMPLETE'&&t-Number(round.completedAt||t)>=RESULT_GRACE_MS){
  archiveRound(m,round);m.round=null;m.revision++;m.updatedAt=t;scheduleSave();
  if(hostOnline&&eligiblePlayerIds(m).length)createBettingRound(m);
 }
}
function auth(req,url){
 const raw=(req.headers.authorization||'').replace(/^Bearer\s+/i,'')||url.searchParams.get('token')||'';
 const playerId=safeId(url.searchParams.get('playerId')||req.headers['x-player-id']);
 if(!raw||!playerId)return null;
 const player=db.players[playerId];if(!player)return null;
 const a=Buffer.from(hash(raw)),b=Buffer.from(player.tokenHash||'');
 if(a.length!==b.length||!timingSafeEqual(a,b))return null;
 player.lastSeen=now();return player;
}
function isLoopback(address){return address==='127.0.0.1'||address==='::1'||address==='::ffff:127.0.0.1';}
function adminAllowed(req,url){
 if(ADMIN_TOKEN)return (url.searchParams.get('adminToken')||req.headers['x-admin-token']||'')===ADMIN_TOKEN;
 return isLoopback(req.socket.remoteAddress||'');
}
function requestClientKey(req){
 const remote=req.socket.remoteAddress||'unknown';
 // The supported Cloudflare Tunnel runs on this machine. Only its loopback
 // connection may supply the visitor IP; direct clients cannot choose a bucket.
 const forwarded=req.headers['cf-connecting-ip'];
 if(isLoopback(remote)&&typeof forwarded==='string'&&isIP(forwarded.trim()))return 'cloudflare:'+forwarded.trim().toLowerCase();
 return 'direct:'+remote;
}
function apiRetryAfter(req){
 const time=now();
 if(time-lastRequestBucketSweep>=API_RATE_WINDOW_MS){
  for(const [key,bucket] of requestBuckets)if(time-bucket.time>=API_RATE_WINDOW_MS)requestBuckets.delete(key);
  lastRequestBucketSweep=time;
 }
 const key=requestClientKey(req);
 let bucket=requestBuckets.get(key);
 if(!bucket||time-bucket.time>=API_RATE_WINDOW_MS){bucket={time,count:0};requestBuckets.set(key,bucket);}
 if(bucket.count>=API_RATE_LIMIT)return Math.max(1,API_RATE_WINDOW_MS-(time-bucket.time));
 bucket.count++;return 0;
}
function cors(req,res){
 const origin=req.headers.origin||'*';res.setHeader('Access-Control-Allow-Origin',origin==='null'?'*':origin);res.setHeader('Vary','Origin');
 res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization, X-Player-Id, X-Admin-Token');
 res.setHeader('Access-Control-Expose-Headers','Retry-After');
 res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');res.setHeader('Access-Control-Max-Age','86400');
}
function reply(res,status,payload){
 const body=JSON.stringify(payload);res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Content-Length':Buffer.byteLength(body)});res.end(body);
}
async function bodyJson(req){
 const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>MAX_BODY)throw Object.assign(Error('payload_too_large'),{status:413});chunks.push(chunk);}
 if(!chunks.length)return {};
 try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw Object.assign(Error('invalid_json'),{status:400});}
}
function parts(pathname){return pathname.split('/').filter(Boolean).map(decodeURIComponent);}
function monitorParticipant(m,round,playerId){
 const p=round?.participants?.[playerId]||null,player=db.players[playerId]||{},state=p?.checkpoint||{},settlement=p?.settlement||null;
 const currentCredit=settlement?Number(settlement.creditAfter)||0:Number(state.credit??p?.creditAfterBet)||0;
 const roundWin=settlement?Number(settlement.totalWin)||0:Number(state.totalWin)||0;
 return {
  playerId,displayName:player.displayName||'PLAYER',connected:connected(m.id,playerId),joinedAt:p?.joinedAt||null,lastSeen:p?.lastSeen||player.lastSeen||null,
  totalBet:Number(p?.totalBet)||0,bets:p?.bets||[],enabled:p?.enabled||[],checkpointBall:Number(p?.checkpointBall)||0,currentCredit,roundWin,
  roundWins:Array.isArray(state.roundWins)?state.roundWins:[],phase:state.phase||(p?'PLAYING':'WAITING'),settled:!!settlement,settlement,appVersion:p?.appVersion||null
 };
}
function monitorSnapshot(m){
 const round=m.round,ids=new Set(Object.keys(round?.participants||{}));for(const id of socketMap(m.id).keys())if(id!==m.hostPlayerId)ids.add(id);
 const players=[...ids].map(id=>monitorParticipant(m,round,id)).sort((a,b)=>Number(b.connected)-Number(a.connected)||(a.displayName||'').localeCompare(b.displayName||''));
 return {
  ok:true,serverTime:now(),machine:{
   id:m.id,revision:m.revision,source:'physical-host',hostPlayerId:m.hostPlayerId||null,
   hostConnected:!!m.hostPlayerId&&connected(m.id,m.hostPlayerId),
   connectedPlayers:[...socketMap(m.id).keys()].filter(id=>id!==m.hostPlayerId&&connected(m.id,id)).length
  },
  round:round?{
   id:round.id,sequence:round.sequence,phase:round.phase,balls:[...(round.balls||[])],
   betOpenedAt:round.betOpenedAt||null,betClosesAt:round.betClosesAt||null,drawStartsAt:round.drawStartsAt||null,startedAt:round.startedAt||null,
   completedAt:round.completedAt||null,participantCount:Object.keys(round.participants||{}).length,eligibleCount:(round.eligiblePlayerIds||[]).length,
   settlements:Number(round.settlementCount)||0,hostPlayerId:round.hostPlayerId||null,drawSource:round.drawSource||'physical',players
  }:{id:null,sequence:0,phase:'WAITING',balls:[],betOpenedAt:null,betClosesAt:null,drawStartsAt:null,startedAt:null,completedAt:null,participantCount:0,eligibleCount:0,settlements:0,hostPlayerId:m.hostPlayerId||null,drawSource:null,players}
 };
}

async function api(req,res,url){
 const p=parts(url.pathname);
 if(req.method==='GET'&&url.pathname==='/api/health')return reply(res,200,{ok:true,service:'sweets-link-shared-machine',version:204,source:'physical-host',time:now(),betDurationMs:BET_DURATION_MS});
 if(req.method==='GET'&&p[0]==='api'&&p[1]==='admin'&&p[2]==='machines'){
  if(!adminAllowed(req,url))return reply(res,403,{ok:false,error:'admin_required'});
  const m=machine(safeId(p[3])||MACHINE_DEFAULT);return reply(res,200,monitorSnapshot(m));
 }
 if(req.method==='POST'&&url.pathname==='/api/session'){
  const input=await bodyJson(req),suppliedToken=(req.headers.authorization||'').replace(/^Bearer\s+/i,''),existingId=safeId(input.playerId);
  if(existingId&&suppliedToken){
   const existing=db.players[existingId];
   if(existing&&existing.tokenHash===hash(suppliedToken)){
    existing.lastSeen=now();existing.displayName=safeText(input.displayName||existing.displayName||'PLAYER',32);scheduleSave();
    return reply(res,200,{ok:true,player:{id:existing.id,displayName:existing.displayName,createdAt:existing.createdAt,lastSeen:existing.lastSeen},token:suppliedToken});
   }
  }
  const id=randomUUID(),token=randomUUID()+randomUUID();
  const player={id,tokenHash:hash(token),displayName:safeText(input.displayName||'PLAYER',32),createdAt:now(),lastSeen:now()};
  db.players[id]=player;scheduleSave();return reply(res,201,{ok:true,player:{id,displayName:player.displayName,createdAt:player.createdAt,lastSeen:player.lastSeen},token});
 }
 if(req.method==='POST'&&p[0]==='api'&&p[1]==='admin'&&p[2]==='machines'&&p[4]==='host'&&p[5]==='register'){
  if(!adminAllowed(req,url))return reply(res,403,{ok:false,error:'admin_required'});
  const hostPlayer=auth(req,url);if(!hostPlayer)return reply(res,401,{ok:false,error:'unauthorized'});
  const m=machine(safeId(p[3])||MACHINE_DEFAULT);
  m.hostPlayerId=hostPlayer.id;m.hostRegisteredAt=now();m.revision++;m.updatedAt=now();
  if(m.round)m.round.hostPlayerId=hostPlayer.id;
  scheduleSave();broadcast(m.id,{type:'host_changed',hostPlayerId:hostPlayer.id,roundId:m.round?.id||null,hostConnected:connected(m.id,hostPlayer.id)});
  tickMachine(m);
  return reply(res,200,{ok:true,...snapshot(m,hostPlayer.id),role:'host'});
 }
 const player=auth(req,url);if(!player)return reply(res,401,{ok:false,error:'unauthorized'});
 if(p[0]!=='api'||p[1]!=='machines')return reply(res,404,{ok:false,error:'not_found'});
 const machineId=safeId(p[2])||MACHINE_DEFAULT,m=machine(machineId);
 if(req.method==='GET'&&p[3]==='state')return reply(res,200,{ok:true,...snapshot(m,player.id),role:m.hostPlayerId===player.id?'host':'player'});
 if(req.method==='POST'&&p[3]==='round'&&p[4]==='join'){
  const input=await bodyJson(req);tickMachine(m);const round=m.round;
  if(!round||round.phase!=='BETTING'||now()>=Number(round.betClosesAt||0))return reply(res,409,{ok:false,error:'wait_next_bet',...snapshot(m,player.id)});
  if(input.roundId&&String(input.roundId)!==round.id)return reply(res,409,{ok:false,error:'round_mismatch',...snapshot(m,player.id)});
  if(!(round.eligiblePlayerIds||[]).includes(player.id))return reply(res,409,{ok:false,error:'wait_next_bet',...snapshot(m,player.id)});
  const reservation=payoutWallet?.reserve(m.id,player.id,round,input),total=reservation?reservation.totalBet:Math.max(0,Number(input.totalBet)||0);
  if(total<=0){
   delete round.participants[player.id];m.revision++;scheduleSave();await flushDb();broadcast(m.id,{type:'bet_updated',roundId:round.id,playerId:player.id,participantCount:Object.keys(round.participants).length,round:publicRound(round,null)});
   return reply(res,200,{ok:true,...snapshot(m,player.id),role:'player'});
  }
  const previous=round.participants[player.id];
  const participant=round.participants[player.id]=previous||{playerId:player.id,joinedAt:now(),settlement:null,checkpoint:null,checkpointBall:0,initialState:null};
  participant.lastSeen=now();participant.clientRoundToken=safeText(input.clientRoundToken,120);
  participant.bets=Array.isArray(input.bets)?input.bets:[];participant.locked=Array.isArray(input.locked)?input.locked:participant.bets;
  participant.enabled=Array.isArray(input.enabled)?input.enabled:participant.bets.map(value=>Number(value)>0);
  participant.totalBet=total;participant.creditAfterBet=reservation?reservation.creditAfterBet:Number(input.creditAfterBet)||0;participant.appVersion=safeText(input.appVersion,80);
  m.revision++;scheduleSave();await flushDb();broadcast(m.id,{type:'bet_updated',roundId:round.id,playerId:player.id,participantCount:Object.keys(round.participants).length,round:publicRound(round,null)});
  return reply(res,200,{ok:true,...snapshot(m,player.id),role:'player'});
 }
 if(req.method==='POST'&&p[3]==='round'&&p[4]==='heartbeat'){
  const input=await bodyJson(req),round=lookupRound(m,input.roundId);if(!round)return reply(res,409,{ok:false,error:'round_mismatch',...snapshot(m,player.id)});
  const participant=round.participants?.[player.id];if(participant)participant.lastSeen=now();return reply(res,200,{ok:true,source:'physical-host'});
 }
 if(req.method==='POST'&&p[3]==='round'&&p[4]==='leave'){
  const input=await bodyJson(req),round=lookupRound(m,input.roundId);
  if(!round)return reply(res,200,{ok:true,left:false,roundId:safeText(input.roundId,160)});
  // Once BET closes, the reservation survives disconnect/reset so the server can finish it offline.
  const canRemove=round.phase==='BETTING';
  const existed=!!round.participants?.[player.id];if(existed&&canRemove){payoutWallet?.release(m.id,player.id,round);delete round.participants[player.id];}
  if(existed&&round.participants?.[player.id])round.participants[player.id].lastSeen=now();
  m.revision++;m.updatedAt=now();scheduleSave();await flushDb();
  const remaining=Object.keys(round.participants||{}).length;
  if(canRemove)broadcast(m.id,{type:'participant_left',roundId:round.id,playerId:player.id,participantCount:remaining,round:publicRound(round,null)});
  return reply(res,200,{ok:true,left:existed&&canRemove,retained:existed&&!canRemove,roundId:round.id,phase:round.phase,participantCount:remaining});
 }
 if(req.method==='POST'&&p[3]==='round'&&p[4]==='ball'){
  const input=await bodyJson(req),round=m.round;
  if(player.id!==m.hostPlayerId)return reply(res,403,{ok:false,error:'physical_host_required',hostPlayerId:m.hostPlayerId||null});
  if(!round||round.id!==input.roundId)return reply(res,409,{ok:false,error:'round_mismatch',...snapshot(m,player.id)});
  if(round.phase!=='PLAYING')return reply(res,409,{ok:false,error:'round_not_playing',...snapshot(m,player.id)});
  if(round.drawSource==='server-fallback')return reply(res,409,{ok:false,error:'server_fallback_active',...snapshot(m,player.id)});
  if(now()<Number(round.drawStartsAt||0))return reply(res,409,{ok:false,error:'draw_not_started',drawStartsAt:round.drawStartsAt});
  const index=Number(input.ballIndex),number=Number(input.number);
  if(!Number.isInteger(index)||index<1||index>BALLS_PER_ROUND||!Number.isInteger(number)||number<1||number>25)return reply(res,400,{ok:false,error:'invalid_ball'});
  const existing=round.balls[index-1];
  if(existing){if(Number(existing.number)===number)return reply(res,200,{ok:true,idempotent:true,ball:existing,phase:round.phase});return reply(res,409,{ok:false,error:'ball_conflict',ball:existing});}
  if(index!==round.balls.length+1)return reply(res,409,{ok:false,error:'ball_out_of_order',expected:round.balls.length+1});
  if(round.balls.some(ball=>Number(ball.number)===number))return reply(res,409,{ok:false,error:'duplicate_number',number});
  const ball=appendBall(m,round,number,player.id,safeText(input.eventId||round.id+':'+index,160));
  return reply(res,200,{ok:true,idempotent:false,ball,phase:round.phase});
 }
 if(req.method==='POST'&&p[3]==='round'&&p[4]==='checkpoint'){
  const input=await bodyJson(req),round=lookupRound(m,input.roundId);
  if(!round)return reply(res,409,{ok:false,error:'round_mismatch',...snapshot(m,player.id)});
  const participant=round.participants?.[player.id];if(!participant)return reply(res,404,{ok:false,error:'not_participating'});
  const ballIndex=Math.max(0,Math.min(round.balls.length,Number(input.ballIndex)||0));
  if(ballIndex>=Number(participant.checkpointBall||0)&&input.state){
   participant.checkpoint=input.state;participant.checkpointBall=ballIndex;participant.lastSeen=now();
   if(ballIndex===0&&!participant.initialState)participant.initialState=input.state;
   scheduleSave();
  }
  return reply(res,200,{ok:true,checkpointBall:participant.checkpointBall});
 }
 if(req.method==='POST'&&p[3]==='round'&&p[4]==='settle'){
  const input=await bodyJson(req),round=lookupRound(m,input.roundId);
  if(!round)return reply(res,409,{ok:false,error:'round_mismatch',...snapshot(m,player.id)});
  const participant=round.participants?.[player.id];if(!participant)return reply(res,404,{ok:false,error:'not_participating'});
  if(participant.settlement){await flushDb();return reply(res,200,{ok:true,idempotent:true,settlement:participant.settlement});}
  const authoritative=payoutWallet?.settle(m.id,player.id,round,input),totalWin=authoritative?authoritative.totalWin:Math.max(0,Math.floor(Number(input.totalWin)||0));
  const settlement={id:round.id+':'+player.id,roundId:round.id,playerId:player.id,totalWin,creditAfter:authoritative?authoritative.creditAfter:Number(input.creditAfter)||0,digest:safeText(input.digest,160),settledAt:now()};
  participant.settlement=settlement;round.settlementCount=(Number(round.settlementCount)||0)+1;scheduleSave();await flushDb();broadcast(m.id,{type:'player_settled',roundId:round.id,playerId:player.id,totalWin});
  tickMachine(m);
  return reply(res,200,{ok:true,idempotent:false,settlement});
 }
 if(req.method==='POST'&&p[3]==='round'&&p[4]==='next'){
  return reply(res,409,{ok:false,error:'server_controls_rounds',...snapshot(m,player.id)});
 }
 return reply(res,404,{ok:false,error:'not_found'});
}

const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.mp3':'audio/mpeg','.wav':'audio/wav','.woff2':'font/woff2','.ico':'image/x-icon'};
async function staticFile(req,res,url){
 let pathname=decodeURIComponent(url.pathname);if(pathname==='/'||pathname==='')pathname=url.searchParams.has('adminToken')?'/monitor.html':'/index.html';
 const relative=pathname.replace(/^\/+/,''),first=relative.split('/')[0];
 if(STATIC_DENY.has(relative)||first==='data'||first==='.git')return reply(res,404,{ok:false,error:'not_found'});
 const file=path.resolve(ROOT,relative);if(!file.startsWith(ROOT+path.sep))return reply(res,403,{ok:false,error:'forbidden'});
 try{
  const stat=await fs.stat(file);if(!stat.isFile())throw Object.assign(Error('not_file'),{code:'ENOENT'});
  const ext=path.extname(file).toLowerCase();res.writeHead(200,{'Content-Type':MIME[ext]||'application/octet-stream','Content-Length':stat.size,'Cache-Control':ext==='.html'||ext==='.js'||ext==='.json'?'no-cache':'public, max-age=86400'});createReadStream(file).pipe(res);
 }catch(error){if(error?.code==='ENOENT')reply(res,404,{ok:false,error:'not_found'});else reply(res,500,{ok:false,error:'static_error'});}
}

await loadDb();
payoutWallet?.attachCore(db);
const server=http.createServer(async(req,res)=>{
 cors(req,res);if(req.method==='OPTIONS'){res.writeHead(204);return res.end();}
 const url=new URL(req.url||'/', 'http://'+(req.headers.host||'localhost'));
 try{
  if(url.pathname.startsWith('/api/')){
   const retryAfterMs=apiRetryAfter(req);
   if(retryAfterMs){res.setHeader('Retry-After',String(Math.ceil(retryAfterMs/1000)));return reply(res,429,{ok:false,error:'rate_limited',retryAfterMs});}
   await api(req,res,url);
  }else await staticFile(req,res,url); // Page assets must not consume or be blocked by the API budget.
 }
 catch(error){console.error('[SharedMachine] request failed',error);reply(res,error.status||500,{ok:false,error:error.message||'server_error',...(error.payoutControlV3?{payoutControlV3:error.payoutControlV3}:{})});}
});
const wss=new WebSocketServer({noServer:true});
server.on('upgrade',(req,socket,head)=>{
 const url=new URL(req.url||'/', 'http://'+(req.headers.host||'localhost'));
 if(url.pathname!=='/ws'){socket.destroy();return;}
 const player=auth(req,url),machineId=safeId(url.searchParams.get('machineId'))||MACHINE_DEFAULT;
 if(!player){socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');socket.destroy();return;}
 wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,{player,machineId}));
});
wss.on('connection',(ws,{player,machineId})=>{
 const m=machine(machineId),map=socketMap(machineId);let set=map.get(player.id);if(!set){set=new Set();map.set(player.id,set);}set.add(ws);
 ws.isAlive=true;ws.missedPongs=0;
 ws.on('pong',()=>{ws.isAlive=true;ws.missedPongs=0;player.lastSeen=now();});
 tickMachine(m);
 ws.send(JSON.stringify({...snapshot(m,player.id),role:m.hostPlayerId===player.id?'host':'player'}));
 ws.on('message',raw=>{
  try{
   const msg=JSON.parse(String(raw));
   if(msg.type==='ping'){ws.send(JSON.stringify({type:'pong',serverTime:now()}));return;}
   if(msg.type==='host_fallback_request'){
    if(player.id===m.hostPlayerId&&m.round?.phase==='PLAYING'&&(!msg.roundId||msg.roundId===m.round.id))activateServerFallback(m,m.round,'host_requested');
    return;
   }
   if(msg.type==='visual_frame'){
    if(player.id!==m.hostPlayerId)return;
    const image=String(msg.image||''),roundId=safeText(msg.roundId,160);
    if(!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(image)||image.length>220000)return;
    const relayNow=now(),lastRelay=Number(visualRelayAt.get(machineId))||0;
    if(relayNow-lastRelay<700)return;
    visualRelayAt.set(machineId,relayNow);
    const payload=JSON.stringify({type:'visual_frame',roundId,image,capturedAt:Number(msg.capturedAt)||relayNow,serverTime:relayNow});
    for(const [pid,sockets] of socketMap(machineId))if(pid!==player.id)for(const peer of sockets)if(peer.readyState===WebSocket.OPEN)try{peer.send(payload);}catch{}
   }
  }catch{}
 });
 ws.on('close',()=>{set.delete(ws);if(!set.size)map.delete(player.id);if(m.hostPlayerId===player.id&&!connected(machineId,player.id))broadcast(machineId,{type:'host_status',hostPlayerId:player.id,online:false,roundId:m.round?.id||null});tickMachine(m);});
});
setInterval(()=>{for(const m of Object.values(db.machines||{}))tickMachine(normalizeMachine(m,m.id));},250).unref();
setInterval(()=>{
 for(const ws of wss.clients){
  if(ws.isAlive===false){
   ws.missedPongs=(Number(ws.missedPongs)||0)+1;
   if(ws.missedPongs>=3){try{ws.terminate();}catch{}continue;}
  }else ws.missedPongs=0;
  ws.isAlive=false;try{ws.ping();}catch{}
 }
},15000).unref();
server.listen(PORT,'0.0.0.0',()=>console.log('[SharedMachine] physical roulette host server listening on http://0.0.0.0:'+PORT));


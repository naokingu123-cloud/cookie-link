import http from 'node:http';
import {createReadStream, promises as fs} from 'node:fs';
import {createHash, randomUUID, timingSafeEqual} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {WebSocketServer, WebSocket} from 'ws';

const ROOT=path.dirname(fileURLToPath(import.meta.url));
const PORT=Number(process.env.PORT||3000);
const DATA_FILE=process.env.SWEETS_DATA_FILE||path.join(ROOT,'data','shared-machine.json');
const ADMIN_TOKEN=String(process.env.SWEETS_ADMIN_TOKEN||'');
const BALLS_PER_ROUND=8;
const ROUND_START_DELAY_MS=Math.max(300,Number(process.env.SWEETS_ROUND_START_DELAY_MS||2200));
const BALL_INTERVAL_MS=Math.max(300,Number(process.env.SWEETS_BALL_INTERVAL_MS||1800));
const CHECKPOINT_WAIT_MS=Math.max(1000,Number(process.env.SWEETS_CHECKPOINT_WAIT_MS||7000));
const ROUND_STALE_MS=45*60*1000;
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

function normalizeRound(round){
 if(!round)return null;
 round.participants=round.participants||{};
 round.balls=Array.isArray(round.balls)?round.balls:[];
 round.hostPlayerId=safeId(round.hostPlayerId)||null;
 round.settlementCount=Number(round.settlementCount)||0;
 round.lastBallAt=Number(round.lastBallAt)||0;
 return round;
}
function normalizeMachine(m,id){
 m.id=safeId(m.id||id)||MACHINE_DEFAULT;
 m.revision=Number(m.revision)||0;
 m.sequence=Number(m.sequence)||0;
 m.hostPlayerId=safeId(m.hostPlayerId)||null;
 m.hostRegisteredAt=Number(m.hostRegisteredAt)||0;
 m.round=normalizeRound(m.round);
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
function scheduleSave(){
 db.updatedAt=now();if(saveTimer)return;
 saveTimer=setTimeout(async()=>{
  saveTimer=null;
  try{
   await fs.mkdir(path.dirname(DATA_FILE),{recursive:true});
   const temp=DATA_FILE+'.tmp';await fs.writeFile(temp,JSON.stringify(db,null,2));await fs.rename(temp,DATA_FILE);
  }catch(error){console.error('[SharedMachine] database save failed',error);}
 },40);
}
function machine(id=MACHINE_DEFAULT){
 id=safeId(id)||MACHINE_DEFAULT;
 return db.machines[id]||(db.machines[id]=normalizeMachine({id,revision:0,sequence:0,round:null,updatedAt:now()},id));
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
  startedAt:round.startedAt,completedAt:round.completedAt||null,hostPlayerId:round.hostPlayerId||null,
  participant:playerId?publicParticipant(round.participants?.[playerId]):null,
  participantCount:Object.keys(round.participants||{}).length
 };
}
function snapshot(m,playerId){
 const isHost=!!playerId&&m.hostPlayerId===playerId;
 return {type:'snapshot',serverTime:now(),machine:{id:m.id,revision:m.revision,hostPlayerId:m.hostPlayerId||null,hostConnected:!!m.hostPlayerId&&connected(m.id,m.hostPlayerId),source:'physical-host'},round:publicRound(m.round,playerId),role:isHost?'host':'player'};
}
function socketMap(machineId){let map=socketsByMachine.get(machineId);if(!map){map=new Map();socketsByMachine.set(machineId,map);}return map;}
function connected(machineId,playerId){const set=socketMap(machineId).get(playerId);return !!set&&[...set].some(ws=>ws.readyState===WebSocket.OPEN);}
function broadcast(machineId,message){
 const payload=JSON.stringify({...message,serverTime:now()});
 for(const set of socketMap(machineId).values())for(const ws of set)if(ws.readyState===WebSocket.OPEN)try{ws.send(payload);}catch{}
}
function createRound(m){
 const sequence=(Number(m.sequence)||0)+1;m.sequence=sequence;
 const round={
  id:m.id+'-'+sequence+'-'+randomUUID().slice(0,8),sequence,phase:'PLAYING',balls:[],
  startedAt:now(),completedAt:null,hostPlayerId:m.hostPlayerId||null,participants:{},settlementCount:0,lastBallAt:0
 };
 m.round=round;m.revision++;m.updatedAt=now();scheduleSave();broadcast(m.id,{type:'round_started',round:publicRound(round,null)});
 return round;
}
function activeOrNewRound(m){
 const r=m.round;
 if(!r||r.phase!=='PLAYING'||now()-Number(r.startedAt||0)>ROUND_STALE_MS)return createRound(m);
 return r;
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
function rateAllowed(req){
 const key=req.socket.remoteAddress||'unknown',time=now(),bucket=requestBuckets.get(key)||{time,count:0};
 if(time-bucket.time>10000){bucket.time=time;bucket.count=0;}bucket.count++;requestBuckets.set(key,bucket);return bucket.count<=240;
}
function cors(req,res){
 const origin=req.headers.origin||'*';res.setHeader('Access-Control-Allow-Origin',origin==='null'?'*':origin);res.setHeader('Vary','Origin');
 res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization, X-Player-Id, X-Admin-Token');
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
   id:round.id,sequence:round.sequence,phase:round.phase,balls:[...(round.balls||[])],startedAt:round.startedAt,
   completedAt:round.completedAt||null,participantCount:Object.keys(round.participants||{}).length,
   settlements:Number(round.settlementCount)||0,hostPlayerId:round.hostPlayerId||null,players
  }:{id:null,sequence:0,phase:'WAITING',balls:[],startedAt:null,completedAt:null,participantCount:0,settlements:0,hostPlayerId:m.hostPlayerId||null,players}
 };
}

async function api(req,res,url){
 const p=parts(url.pathname);
 if(req.method==='GET'&&url.pathname==='/api/health')return reply(res,200,{ok:true,service:'sweets-link-shared-machine',version:181,source:'physical-host',time:now()});
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
  if(m.round?.phase==='PLAYING')m.round.hostPlayerId=hostPlayer.id;
  scheduleSave();broadcast(m.id,{type:'host_changed',hostPlayerId:hostPlayer.id,roundId:m.round?.id||null,hostConnected:connected(m.id,hostPlayer.id)});
  return reply(res,200,{ok:true,...snapshot(m,hostPlayer.id),role:'host'});
 }
 const player=auth(req,url);if(!player)return reply(res,401,{ok:false,error:'unauthorized'});
 if(p[0]!=='api'||p[1]!=='machines')return reply(res,404,{ok:false,error:'not_found'});
 const machineId=safeId(p[2])||MACHINE_DEFAULT,m=machine(machineId);
 if(req.method==='GET'&&p[3]==='state')return reply(res,200,{ok:true,...snapshot(m,player.id),role:m.hostPlayerId===player.id?'host':'player'});
 if(req.method==='POST'&&p[3]==='round'&&p[4]==='join'){
  const input=await bodyJson(req),avoidRoundId=safeText(input.avoidRoundId,160);
  if(avoidRoundId&&m.round?.phase==='PLAYING'&&m.round.id===avoidRoundId)return reply(res,409,{ok:false,error:'round_in_progress',round:publicRound(m.round,player.id)});
  const round=activeOrNewRound(m),previous=round.participants[player.id];
  round.hostPlayerId=m.hostPlayerId;
  const participant=round.participants[player.id]=previous||{
   playerId:player.id,joinedAt:now(),lastSeen:now(),clientRoundToken:safeText(input.clientRoundToken,120),
   bets:Array.isArray(input.bets)?input.bets:[],locked:Array.isArray(input.locked)?input.locked:[],enabled:Array.isArray(input.enabled)?input.enabled:[],
   totalBet:Number(input.totalBet)||0,creditAfterBet:Number(input.creditAfterBet)||0,initialState:input.initialState||null,
   checkpoint:input.initialState||null,checkpointBall:0,settlement:null,appVersion:safeText(input.appVersion,80)
  };
  participant.lastSeen=now();if(!participant.initialState&&input.initialState)participant.initialState=input.initialState;if(!participant.checkpoint&&input.initialState)participant.checkpoint=input.initialState;
  m.revision++;scheduleSave();broadcast(m.id,{type:'participant_joined',roundId:round.id,playerId:player.id,participantCount:Object.keys(round.participants).length,round:publicRound(round,null)});
  return reply(res,200,{ok:true,...snapshot(m,player.id),role:'player'});
 }
 if(req.method==='POST'&&p[3]==='round'&&p[4]==='heartbeat'){
  const input=await bodyJson(req);if(m.round?.id!==input.roundId)return reply(res,409,{ok:false,error:'round_mismatch',...snapshot(m,player.id)});
  const participant=m.round.participants?.[player.id];if(participant)participant.lastSeen=now();return reply(res,200,{ok:true,source:'physical-host'});
 }
 if(req.method==='POST'&&p[3]==='round'&&p[4]==='leave'){
  const input=await bodyJson(req),round=m.round;
  if(!round||round.id!==safeText(input.roundId,160))return reply(res,200,{ok:true,left:false,roundId:safeText(input.roundId,160)});
  const existed=!!round.participants?.[player.id];if(existed)delete round.participants[player.id];
  m.revision++;m.updatedAt=now();
  const remaining=Object.keys(round.participants||{}).length;
  if(round.phase==='PLAYING'&&remaining===0){
   round.phase='ABORTED';round.completedAt=now();scheduleSave();
   broadcast(m.id,{type:'round_cancelled',round:publicRound(round,null),reason:'no_participants'});
  }else{
   scheduleSave();broadcast(m.id,{type:'participant_left',roundId:round.id,playerId:player.id,participantCount:remaining,round:publicRound(round,null)});
  }
  return reply(res,200,{ok:true,left:existed,roundId:round.id,phase:round.phase,participantCount:remaining});
 }
 if(req.method==='POST'&&p[3]==='round'&&p[4]==='ball'){
  const input=await bodyJson(req),round=m.round;
  if(player.id!==m.hostPlayerId)return reply(res,403,{ok:false,error:'physical_host_required',hostPlayerId:m.hostPlayerId||null});
  if(!round||round.id!==input.roundId)return reply(res,409,{ok:false,error:'round_mismatch',...snapshot(m,player.id)});
  if(round.phase!=='PLAYING')return reply(res,409,{ok:false,error:'round_not_playing',...snapshot(m,player.id)});
  const index=Number(input.ballIndex),number=Number(input.number);
  if(!Number.isInteger(index)||index<1||index>BALLS_PER_ROUND||!Number.isInteger(number)||number<1||number>25)return reply(res,400,{ok:false,error:'invalid_ball'});
  const existing=round.balls[index-1];
  if(existing){
   if(Number(existing.number)===number)return reply(res,200,{ok:true,idempotent:true,ball:existing,phase:round.phase});
   return reply(res,409,{ok:false,error:'ball_conflict',ball:existing});
  }
  if(index!==round.balls.length+1)return reply(res,409,{ok:false,error:'ball_out_of_order',expected:round.balls.length+1});
  if(round.balls.some(ball=>Number(ball.number)===number))return reply(res,409,{ok:false,error:'duplicate_number',number});
  const landedAt=now(),ball={index,number,eventId:safeText(input.eventId||round.id+':'+index,160),landedAt,reportedBy:player.id};
  round.balls.push(ball);round.lastBallAt=landedAt;m.revision++;m.updatedAt=landedAt;
  if(round.balls.length>=BALLS_PER_ROUND){round.phase='COMPLETE';round.completedAt=landedAt;}
  scheduleSave();broadcast(m.id,{type:'ball_result',roundId:round.id,ball,phase:round.phase});
  if(round.phase==='COMPLETE')broadcast(m.id,{type:'round_complete',round:publicRound(round,null)});
  return reply(res,200,{ok:true,idempotent:false,ball,phase:round.phase});
 }
 if(req.method==='POST'&&p[3]==='round'&&p[4]==='checkpoint'){
  const input=await bodyJson(req),round=m.round;
  if(!round||round.id!==input.roundId)return reply(res,409,{ok:false,error:'round_mismatch',...snapshot(m,player.id)});
  const participant=round.participants?.[player.id];if(!participant)return reply(res,404,{ok:false,error:'not_participating'});
  const ballIndex=Math.max(0,Math.min(round.balls.length,Number(input.ballIndex)||0));
  if(ballIndex>=Number(participant.checkpointBall||0)&&input.state){participant.checkpoint=input.state;participant.checkpointBall=ballIndex;participant.lastSeen=now();scheduleSave();}
  return reply(res,200,{ok:true,checkpointBall:participant.checkpointBall});
 }
 if(req.method==='POST'&&p[3]==='round'&&p[4]==='settle'){
  const input=await bodyJson(req),round=m.round;
  if(!round||round.id!==input.roundId)return reply(res,409,{ok:false,error:'round_mismatch',...snapshot(m,player.id)});
  const participant=round.participants?.[player.id];if(!participant)return reply(res,404,{ok:false,error:'not_participating'});
  if(participant.settlement)return reply(res,200,{ok:true,idempotent:true,settlement:participant.settlement});
  const totalWin=Math.max(0,Math.floor(Number(input.totalWin)||0));
  const settlement={id:round.id+':'+player.id,roundId:round.id,playerId:player.id,totalWin,creditAfter:Number(input.creditAfter)||0,digest:safeText(input.digest,160),settledAt:now()};
  participant.settlement=settlement;round.settlementCount=(Number(round.settlementCount)||0)+1;scheduleSave();broadcast(m.id,{type:'player_settled',roundId:round.id,playerId:player.id,totalWin});
  return reply(res,200,{ok:true,idempotent:false,settlement});
 }
 if(req.method==='POST'&&p[3]==='round'&&p[4]==='next'){
  if(m.round&&m.round.phase!=='COMPLETE')return reply(res,409,{ok:false,error:'round_not_complete'});
  const next=createRound(m);return reply(res,201,{ok:true,round:publicRound(next,player.id),role:'player'});
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
const server=http.createServer(async(req,res)=>{
 cors(req,res);if(req.method==='OPTIONS'){res.writeHead(204);return res.end();}if(!rateAllowed(req))return reply(res,429,{ok:false,error:'rate_limited'});
 const url=new URL(req.url||'/', 'http://'+(req.headers.host||'localhost'));
 try{if(url.pathname.startsWith('/api/'))await api(req,res,url);else await staticFile(req,res,url);}
 catch(error){console.error('[SharedMachine] request failed',error);reply(res,error.status||500,{ok:false,error:error.message||'server_error'});}
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
 ws.send(JSON.stringify({...snapshot(m,player.id),role:m.hostPlayerId===player.id?'host':'player'}));
 ws.on('message',raw=>{
  try{
   const msg=JSON.parse(String(raw));
   if(msg.type==='ping'){ws.send(JSON.stringify({type:'pong',serverTime:now()}));return;}
   if(msg.type==='visual_frame'){
    if(player.id!==m.hostPlayerId)return;
    const image=String(msg.image||''),roundId=safeText(msg.roundId,160);
    if(!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(image)||image.length>480000)return;
    const payload=JSON.stringify({type:'visual_frame',roundId,image,capturedAt:Number(msg.capturedAt)||now(),serverTime:now()});
    for(const [pid,sockets] of socketMap(machineId))if(pid!==player.id)for(const peer of sockets)if(peer.readyState===WebSocket.OPEN)try{peer.send(payload);}catch{}
   }
  }catch{}
 });
 ws.on('close',()=>{set.delete(ws);if(!set.size)map.delete(player.id);if(m.hostPlayerId===player.id)broadcast(machineId,{type:'host_status',hostPlayerId:player.id,online:false,roundId:m.round?.id||null});});
});
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

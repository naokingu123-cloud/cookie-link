import http from 'node:http';
import {createReadStream, promises as fs} from 'node:fs';
import {createHash, randomUUID, timingSafeEqual} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {WebSocketServer, WebSocket} from 'ws';

const ROOT=path.dirname(fileURLToPath(import.meta.url));
const PORT=Number(process.env.PORT||3000);
const DATA_FILE=process.env.SWEETS_DATA_FILE||path.join(ROOT,'data','shared-machine.json');
const MAX_BODY=2*1024*1024;
const HOST_GRACE_MS=4000;
const ROUND_STALE_MS=45*60*1000;
const BALLS_PER_ROUND=8;
const MACHINE_DEFAULT='public-01';
const STATIC_DENY=new Set(['server.mjs','package.json','package-lock.json']);

const now=()=>Date.now();
const hash=value=>createHash('sha256').update(String(value)).digest('hex');
const safeId=value=>String(value||'').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,64);
const validNumber=value=>Number.isInteger(Number(value))&&Number(value)>=1&&Number(value)<=25?Number(value):null;

let db={version:1,players:{},machines:{},updatedAt:now()};
let saveTimer=null;
const socketsByMachine=new Map();
const requestBuckets=new Map();

async function loadDb(){
 try{
  const parsed=JSON.parse(await fs.readFile(DATA_FILE,'utf8'));
  if(parsed&&parsed.version===1)db=parsed;
 }catch(error){
  if(error?.code!=='ENOENT')console.warn('[SharedMachine] database load failed',error);
 }
}
function scheduleSave(){
 db.updatedAt=now();
 if(saveTimer)return;
 saveTimer=setTimeout(async()=>{
  saveTimer=null;
  try{
   await fs.mkdir(path.dirname(DATA_FILE),{recursive:true});
   const temp=DATA_FILE+'.tmp';
   await fs.writeFile(temp,JSON.stringify(db,null,2));
   await fs.rename(temp,DATA_FILE);
  }catch(error){console.error('[SharedMachine] database save failed',error);}
 },40);
}
function machine(id=MACHINE_DEFAULT){
 id=safeId(id)||MACHINE_DEFAULT;
 return db.machines[id]||(db.machines[id]={id,revision:0,sequence:0,hostPlayerId:null,hostLeaseUntil:0,round:null,updatedAt:now()});
}
function publicPlayer(player){
 if(!player)return null;
 return {id:player.id,displayName:player.displayName||'PLAYER',createdAt:player.createdAt,lastSeen:player.lastSeen};
}
function publicParticipant(participant,{includeState=true}={}){
 if(!participant)return null;
 const result={
  playerId:participant.playerId,joinedAt:participant.joinedAt,lastSeen:participant.lastSeen,
  clientRoundToken:participant.clientRoundToken||null,bets:participant.bets||[],locked:participant.locked||[],
  enabled:participant.enabled||[],totalBet:Number(participant.totalBet)||0,creditAfterBet:Number(participant.creditAfterBet)||0,
  checkpointBall:Number(participant.checkpointBall)||0,settlement:participant.settlement||null,appVersion:participant.appVersion||null
 };
 if(includeState){result.initialState=participant.initialState||null;result.checkpoint=participant.checkpoint||null;}
 return result;
}
function publicRound(round,playerId){
 if(!round)return null;
 return {
  id:round.id,sequence:round.sequence,phase:round.phase,balls:[...(round.balls||[])],
  startedAt:round.startedAt,completedAt:round.completedAt||null,hostPlayerId:round.hostPlayerId||null,
  participant:publicParticipant(round.participants?.[playerId]),participantCount:Object.keys(round.participants||{}).length
 };
}
function snapshot(m,playerId){
 return {type:'snapshot',serverTime:now(),machine:{id:m.id,revision:m.revision,hostPlayerId:m.hostPlayerId},round:publicRound(m.round,playerId)};
}
function socketMap(machineId){
 let map=socketsByMachine.get(machineId);
 if(!map){map=new Map();socketsByMachine.set(machineId,map);}
 return map;
}
function connected(machineId,playerId){
 const set=socketMap(machineId).get(playerId);
 return !!set&&[...set].some(ws=>ws.readyState===WebSocket.OPEN);
}
function broadcast(machineId,message){
 const payload=JSON.stringify({...message,serverTime:now()});
 for(const set of socketMap(machineId).values())for(const ws of set){
  if(ws.readyState===WebSocket.OPEN)try{ws.send(payload);}catch{}
 }
}
function electHost(m){
 const candidates=[];
 for(const [playerId,set] of socketMap(m.id)){
  if(![...set].some(ws=>ws.readyState===WebSocket.OPEN))continue;
  const joined=m.round?.participants?.[playerId]?.joinedAt||db.players[playerId]?.createdAt||now();
  candidates.push({playerId,joined});
 }
 candidates.sort((a,b)=>a.joined-b.joined||a.playerId.localeCompare(b.playerId));
 const next=candidates[0]?.playerId||null,changed=m.hostPlayerId!==next;
 m.hostPlayerId=next;m.hostLeaseUntil=next?now()+15000:0;
 if(m.round?.phase==='PLAYING')m.round.hostPlayerId=next;
 if(changed){m.revision++;m.updatedAt=now();scheduleSave();broadcast(m.id,{type:'host_changed',hostPlayerId:next,roundId:m.round?.id||null});}
 return next;
}
function ensureHost(m){
 if(m.hostPlayerId&&connected(m.id,m.hostPlayerId)){m.hostLeaseUntil=now()+15000;return m.hostPlayerId;}
 return electHost(m);
}
function createRound(m,hostPlayerId){
 const sequence=(Number(m.sequence)||0)+1;m.sequence=sequence;
 m.hostPlayerId=hostPlayerId||m.hostPlayerId||null;m.hostLeaseUntil=m.hostPlayerId?now()+15000:0;
 const round={
  id:`${m.id}-${sequence}-${randomUUID().slice(0,8)}`,sequence,phase:'PLAYING',balls:[],
  startedAt:now(),completedAt:null,hostPlayerId:m.hostPlayerId,participants:{},settlementCount:0
 };
 m.round=round;m.revision++;m.updatedAt=now();scheduleSave();
 broadcast(m.id,{type:'round_started',round:publicRound(round,null)});
 return round;
}
function activeOrNewRound(m,playerId){
 const r=m.round;
 if(!r||r.phase==='COMPLETE'||now()-Number(r.startedAt||0)>ROUND_STALE_MS)return createRound(m,playerId);
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
function rateAllowed(req){
 const key=req.socket.remoteAddress||'unknown',time=now();
 const bucket=requestBuckets.get(key)||{time,count:0};
 if(time-bucket.time>10000){bucket.time=time;bucket.count=0;}
 bucket.count++;requestBuckets.set(key,bucket);
 return bucket.count<=180;
}
function cors(req,res){
 const origin=req.headers.origin||'*';
 res.setHeader('Access-Control-Allow-Origin',origin==='null'?'*':origin);
 res.setHeader('Vary','Origin');
 res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization, X-Player-Id');
 res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
 res.setHeader('Access-Control-Max-Age','86400');
}
function reply(res,status,payload){
 const body=JSON.stringify(payload);
 res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Content-Length':Buffer.byteLength(body)});
 res.end(body);
}
async function bodyJson(req){
 const chunks=[];let size=0;
 for await(const chunk of req){
  size+=chunk.length;
  if(size>MAX_BODY)throw Object.assign(Error('payload_too_large'),{status:413});
  chunks.push(chunk);
 }
 if(!chunks.length)return {};
 try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}
 catch{throw Object.assign(Error('invalid_json'),{status:400});}
}
function parts(pathname){return pathname.split('/').filter(Boolean).map(decodeURIComponent);}

async function api(req,res,url){
 const p=parts(url.pathname);
 if(req.method==='GET'&&url.pathname==='/api/health')return reply(res,200,{ok:true,service:'sweets-link-shared-machine',version:176,time:now()});
 if(req.method==='POST'&&url.pathname==='/api/session'){
  const input=await bodyJson(req),suppliedToken=(req.headers.authorization||'').replace(/^Bearer\s+/i,''),existingId=safeId(input.playerId);
  if(existingId&&suppliedToken){
   const existing=db.players[existingId];
   if(existing&&existing.tokenHash===hash(suppliedToken)){
    existing.lastSeen=now();existing.displayName=String(input.displayName||existing.displayName||'PLAYER').slice(0,32);scheduleSave();
    return reply(res,200,{ok:true,player:publicPlayer(existing),token:suppliedToken});
   }
  }
  const id=randomUUID(),token=randomUUID()+randomUUID();
  const player={id,tokenHash:hash(token),displayName:String(input.displayName||'PLAYER').slice(0,32),createdAt:now(),lastSeen:now()};
  db.players[id]=player;scheduleSave();return reply(res,201,{ok:true,player:publicPlayer(player),token});
 }
 const player=auth(req,url);if(!player)return reply(res,401,{ok:false,error:'unauthorized'});
 if(p[0]!=='api'||p[1]!=='machines')return reply(res,404,{ok:false,error:'not_found'});
 const machineId=safeId(p[2])||MACHINE_DEFAULT,m=machine(machineId);
 ensureHost(m);
 if(req.method==='GET'&&p[3]==='state')return reply(res,200,{ok:true,...snapshot(m,player.id),role:m.hostPlayerId===player.id?'host':'follower'});
 if(req.method==='POST'&&p[3]==='round'&&p[4]==='join'){
  const input=await bodyJson(req),round=activeOrNewRound(m,player.id),previous=round.participants[player.id];
  const participant=round.participants[player.id]=previous||{
   playerId:player.id,joinedAt:now(),lastSeen:now(),clientRoundToken:String(input.clientRoundToken||''),
   bets:Array.isArray(input.bets)?input.bets:[],locked:Array.isArray(input.locked)?input.locked:[],enabled:Array.isArray(input.enabled)?input.enabled:[],
   totalBet:Number(input.totalBet)||0,creditAfterBet:Number(input.creditAfterBet)||0,initialState:input.initialState||null,
   checkpoint:input.initialState||null,checkpointBall:0,settlement:null,appVersion:String(input.appVersion||'').slice(0,80)
  };
  participant.lastSeen=now();
  if(!participant.initialState&&input.initialState)participant.initialState=input.initialState;
  if(!participant.checkpoint&&input.initialState)participant.checkpoint=input.initialState;
  if(!round.hostPlayerId||!connected(m.id,round.hostPlayerId)){round.hostPlayerId=ensureHost(m)||player.id;m.hostPlayerId=round.hostPlayerId;}
  m.revision++;scheduleSave();broadcast(m.id,{type:'participant_joined',roundId:round.id,playerId:player.id,participantCount:Object.keys(round.participants).length});
  return reply(res,200,{ok:true,...snapshot(m,player.id),role:round.hostPlayerId===player.id?'host':'follower'});
 }
 if(req.method==='POST'&&p[3]==='round'&&p[4]==='heartbeat'){
  const input=await bodyJson(req);if(m.round?.id!==input.roundId)return reply(res,409,{ok:false,error:'round_mismatch',...snapshot(m,player.id)});
  if(m.hostPlayerId===player.id)m.hostLeaseUntil=now()+15000;
  const participant=m.round.participants?.[player.id];if(participant)participant.lastSeen=now();
  return reply(res,200,{ok:true,hostPlayerId:m.hostPlayerId});
 }
 if(req.method==='POST'&&p[3]==='round'&&p[4]==='ball'){
  const input=await bodyJson(req),round=m.round;
  if(!round||round.id!==input.roundId)return reply(res,409,{ok:false,error:'round_mismatch',...snapshot(m,player.id)});
  ensureHost(m);
  if(round.hostPlayerId!==player.id)return reply(res,403,{ok:false,error:'host_required',hostPlayerId:round.hostPlayerId,...snapshot(m,player.id)});
  const index=Number(input.ballIndex),number=validNumber(input.number);
  if(!Number.isInteger(index)||index<1||index>BALLS_PER_ROUND||number==null)return reply(res,400,{ok:false,error:'invalid_ball'});
  const existing=round.balls[index-1];
  if(existing)return reply(res,200,{ok:true,idempotent:true,ball:existing,...snapshot(m,player.id)});
  if(index!==round.balls.length+1)return reply(res,409,{ok:false,error:'ball_order',expected:round.balls.length+1,...snapshot(m,player.id)});
  if(round.balls.some(ball=>ball.number===number))return reply(res,409,{ok:false,error:'duplicate_number',...snapshot(m,player.id)});
  const ball={index,number,eventId:String(input.eventId||`${round.id}:${index}`),landedAt:now(),reportedBy:player.id};
  round.balls.push(ball);m.revision++;m.updatedAt=now();m.hostLeaseUntil=now()+15000;
  if(round.balls.length>=BALLS_PER_ROUND){round.phase='COMPLETE';round.completedAt=now();}
  scheduleSave();broadcast(m.id,{type:'ball_result',roundId:round.id,ball,phase:round.phase});
  if(round.phase==='COMPLETE')broadcast(m.id,{type:'round_complete',round:publicRound(round,null)});
  return reply(res,200,{ok:true,ball,...snapshot(m,player.id)});
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
  const settlement={id:`${round.id}:${player.id}`,roundId:round.id,playerId:player.id,totalWin,creditAfter:Number(input.creditAfter)||0,digest:String(input.digest||''),settledAt:now()};
  participant.settlement=settlement;round.settlementCount=(Number(round.settlementCount)||0)+1;scheduleSave();
  broadcast(m.id,{type:'player_settled',roundId:round.id,playerId:player.id,totalWin});
  return reply(res,200,{ok:true,idempotent:false,settlement});
 }
 if(req.method==='POST'&&p[3]==='round'&&p[4]==='next'){
  ensureHost(m);
  if(m.hostPlayerId!==player.id)return reply(res,403,{ok:false,error:'host_required',hostPlayerId:m.hostPlayerId});
  if(m.round&&m.round.phase!=='COMPLETE')return reply(res,409,{ok:false,error:'round_not_complete'});
  const next=createRound(m,player.id);return reply(res,201,{ok:true,round:publicRound(next,player.id),role:'host'});
 }
 return reply(res,404,{ok:false,error:'not_found'});
}

const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.mp3':'audio/mpeg','.wav':'audio/wav','.woff2':'font/woff2','.ico':'image/x-icon'};
async function staticFile(req,res,url){
 let pathname=decodeURIComponent(url.pathname);if(pathname==='/'||pathname==='')pathname='/index.html';
 const relative=pathname.replace(/^\/+/,''),first=relative.split('/')[0];
 if(STATIC_DENY.has(relative)||first==='data'||first==='.git')return reply(res,404,{ok:false,error:'not_found'});
 const file=path.resolve(ROOT,relative);if(!file.startsWith(ROOT+path.sep))return reply(res,403,{ok:false,error:'forbidden'});
 try{
  const stat=await fs.stat(file);if(!stat.isFile())throw Object.assign(Error('not_file'),{code:'ENOENT'});
  const ext=path.extname(file).toLowerCase();
  res.writeHead(200,{'Content-Type':MIME[ext]||'application/octet-stream','Content-Length':stat.size,'Cache-Control':ext==='.html'||ext==='.js'||ext==='.json'?'no-cache':'public, max-age=86400'});
  createReadStream(file).pipe(res);
 }catch(error){
  if(error?.code==='ENOENT')reply(res,404,{ok:false,error:'not_found'});
  else reply(res,500,{ok:false,error:'static_error'});
 }
}

await loadDb();
const server=http.createServer(async(req,res)=>{
 cors(req,res);if(req.method==='OPTIONS'){res.writeHead(204);return res.end();}
 if(!rateAllowed(req))return reply(res,429,{ok:false,error:'rate_limited'});
 const url=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`);
 try{if(url.pathname.startsWith('/api/'))await api(req,res,url);else await staticFile(req,res,url);}
 catch(error){console.error('[SharedMachine] request failed',error);reply(res,error.status||500,{ok:false,error:error.message||'server_error'});}
});
const wss=new WebSocketServer({noServer:true});
server.on('upgrade',(req,socket,head)=>{
 const url=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`);
 if(url.pathname!=='/ws'){socket.destroy();return;}
 const player=auth(req,url),machineId=safeId(url.searchParams.get('machineId'))||MACHINE_DEFAULT;
 if(!player){socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');socket.destroy();return;}
 wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,{player,machineId}));
});
wss.on('connection',(ws,{player,machineId})=>{
 const m=machine(machineId),map=socketMap(machineId);let set=map.get(player.id);
 if(!set){set=new Set();map.set(player.id,set);}set.add(ws);
 ws.isAlive=true;ws.on('pong',()=>{ws.isAlive=true;player.lastSeen=now();});
 ensureHost(m);ws.send(JSON.stringify({...snapshot(m,player.id),role:m.hostPlayerId===player.id?'host':'follower'}));
 ws.on('message',raw=>{
  try{
   const msg=JSON.parse(String(raw));
   if(msg.type==='ping'){ws.send(JSON.stringify({type:'pong',serverTime:now()}));return;}
   if(msg.type==='host_heartbeat'&&m.hostPlayerId===player.id)m.hostLeaseUntil=now()+15000;
  }catch{}
 });
 ws.on('close',()=>{
  set.delete(ws);if(!set.size)map.delete(player.id);
  setTimeout(()=>{if(!connected(machineId,player.id)&&m.hostPlayerId===player.id)electHost(m);},HOST_GRACE_MS);
 });
});
setInterval(()=>{
 for(const ws of wss.clients){if(ws.isAlive===false){ws.terminate();continue;}ws.isAlive=false;try{ws.ping();}catch{}}
 for(const m of Object.values(db.machines))ensureHost(m);
},10000).unref();
server.listen(PORT,'0.0.0.0',()=>console.log(`[SharedMachine] listening on http://0.0.0.0:${PORT}`));

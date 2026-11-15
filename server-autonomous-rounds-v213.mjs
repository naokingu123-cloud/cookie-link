import fs from 'node:fs';
import path from 'node:path';
import {WebSocket} from 'ws';

const ENABLED=String(process.env.SWEETS_AUTONOMOUS_ROUNDS??'1')!=='0';
const PORT=Number(process.env.PORT||3000);
const BASE=`http://127.0.0.1:${PORT}`;
const WS_BASE=`ws://127.0.0.1:${PORT}`;
const MACHINE=String(process.env.SWEETS_MACHINE_ID||'public-01').replace(/[^A-Za-z0-9_-]/g,'')||'public-01';
const ADMIN_TOKEN=String(process.env.SWEETS_ADMIN_TOKEN||'');
const DATA_DIR=process.env.SWEETS_DATA_DIR||path.dirname(process.env.SWEETS_DATA_FILE||path.join(process.cwd(),'data','shared-machine.json'));
const SESSION_FILE=path.join(DATA_DIR,'autonomous-rounds-v213.json');
const EPSILON_BET=5e-324;

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const jsonHeaders=session=>({
 'content-type':'application/json',
 ...(session?{authorization:`Bearer ${session.token}`,'x-player-id':session.player.id}:{})
});

async function request(pathname,{session=null,method='GET',body,timeout=5000}={}){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
 try{
  const response=await fetch(BASE+pathname,{method,headers:jsonHeaders(session),body:body===undefined?undefined:JSON.stringify(body),signal:controller.signal,cache:'no-store'});
  const payload=await response.json().catch(()=>({}));
  if(!response.ok)throw Object.assign(Error(payload.error||`HTTP ${response.status}`),{status:response.status,payload});
  return payload;
 }finally{clearTimeout(timer);}
}

function loadSessions(){try{return JSON.parse(fs.readFileSync(SESSION_FILE,'utf8'))||{};}catch{return {};}}
function saveSessions(value){try{fs.mkdirSync(DATA_DIR,{recursive:true});fs.writeFileSync(SESSION_FILE,JSON.stringify(value,null,2));}catch(error){console.warn('[AutonomousRoundsV213] session save',error?.message||error);}}

async function waitForServer(){
 for(let attempt=0;attempt<120;attempt++){
  try{const response=await fetch(BASE+'/api/health',{cache:'no-store'});if(response.ok)return;}
  catch{}
  await sleep(100);
 }
 throw Error('shared server did not become ready');
}

async function ensureSession(store,key,displayName){
 const saved=store[key];
 if(saved?.player?.id&&saved?.token){
  try{
   const session=await request('/api/session',{session:saved,method:'POST',body:{playerId:saved.player.id,displayName}});
   store[key]=session;saveSessions(store);return session;
  }catch{}
 }
 const session=await request('/api/session',{method:'POST',body:{displayName}});
 store[key]=session;saveSessions(store);return session;
}

function socketUrl(session){
 const url=new URL('/ws',WS_BASE);url.searchParams.set('machineId',MACHINE);url.searchParams.set('playerId',session.player.id);url.searchParams.set('token',session.token);return url.href;
}
function connectSocket(session,onMessage){
 let stopped=false,ws=null,retry=0;
 const open=()=>{
  if(stopped)return;
  ws=new WebSocket(socketUrl(session));
  ws.on('open',()=>{retry=0;});
  ws.on('message',raw=>{try{onMessage(JSON.parse(String(raw)),ws);}catch(error){console.warn('[AutonomousRoundsV213] message',error?.message||error);}});
  ws.on('error',()=>{});
  ws.on('close',()=>{if(stopped)return;const delay=Math.min(3000,200*Math.pow(1.5,retry++));setTimeout(open,delay);});
 };
 open();
 return {get ws(){return ws;},close(){stopped=true;try{ws?.close();}catch{}}};
}

async function startRunner(session){
 let socket=null,refreshTimer=0,busy=false,lastJoined='',lastSettled='';
 const refresh=delay=>{clearTimeout(refreshTimer);refreshTimer=setTimeout(sync,delay);};
 const settleRound=async round=>{
  if(!round?.id||!round.participant||round.participant.settlement||lastSettled===round.id)return;
  lastSettled=round.id;
  try{await request(`/api/machines/${MACHINE}/round/settle`,{session,method:'POST',body:{roundId:round.id,totalWin:0,creditAfter:0,digest:'server-clock:'+round.id}});}
  catch(error){lastSettled='';if(error.status!==404&&error.status!==409)console.warn('[AutonomousRoundsV213] settle',error?.message||error);}
 };
 const sync=async()=>{
  if(busy)return;busy=true;
  try{
   const state=await request(`/api/machines/${MACHINE}/state`,{session});
   const round=state.round;
   if(round?.phase==='BETTING'&&round.canBet&&lastJoined!==round.id){
    lastJoined=round.id;
    try{
     await request(`/api/machines/${MACHINE}/round/join`,{session,method:'POST',body:{
      clientRoundToken:'server-clock:'+round.id,bets:[0],locked:[0],enabled:[false],totalBet:EPSILON_BET,creditAfterBet:0,appVersion:'server-autonomous-v213'
     }});
    }catch(error){if(error.status===409)lastJoined='';else console.warn('[AutonomousRoundsV213] join',error?.message||error);}
   }
   await settleRound(state.pendingRound);
   if(round?.phase==='COMPLETE')await settleRound(round);
  }catch(error){console.warn('[AutonomousRoundsV213] runner state',error?.message||error);}
  finally{busy=false;refresh(150);}
 };
 socket=connectSocket(session,()=>refresh(0));
 refresh(0);
 return ()=>{clearTimeout(refreshTimer);socket.close();};
}

async function startFallbackHost(session){
 let socket=null,pollTimer=0,busy=false,missingSince=0,lastFallbackRound='';
 const adminSuffix=ADMIN_TOKEN?`?adminToken=${encodeURIComponent(ADMIN_TOKEN)}`:'';
 const sendFallback=round=>{
  if(!round?.id||lastFallbackRound===round.id)return;
  const ws=socket?.ws;if(ws?.readyState!==WebSocket.OPEN)return;
  lastFallbackRound=round.id;
  try{ws.send(JSON.stringify({type:'host_fallback_request',roundId:round.id}));}catch{lastFallbackRound='';}
 };
 const poll=async()=>{
  if(busy)return;busy=true;
  try{
   let state=await request(`/api/machines/${MACHINE}/state`,{session});
   const hostConnected=!!state.machine?.hostConnected;
   const sentinelIsHost=state.machine?.hostPlayerId===session.player.id;
   if(!hostConnected){
    if(!missingSince)missingSince=Date.now();
    if(Date.now()-missingSince>=900){
     try{state=await request(`/api/admin/machines/${MACHINE}/host/register${adminSuffix}`,{session,method:'POST',body:{autonomous:true}});missingSince=0;}
     catch(error){console.warn('[AutonomousRoundsV213] host register',error?.message||error);}
    }
   }else missingSince=0;
   const round=state.round;
   const isHost=state.machine?.hostPlayerId===session.player.id||sentinelIsHost;
   if(isHost&&round?.phase==='PLAYING'&&round.drawSource!=='server-fallback'&&Date.now()>=Number(round.drawStartsAt||0))sendFallback(round);
   if(round?.id!==lastFallbackRound&&round?.drawSource==='server-fallback')lastFallbackRound=round.id;
   if(!round||round.phase==='COMPLETE'||round.phase==='BETTING')lastFallbackRound='';
  }catch(error){console.warn('[AutonomousRoundsV213] host state',error?.message||error);}
  finally{busy=false;pollTimer=setTimeout(poll,180);}
 };
 socket=connectSocket(session,()=>{clearTimeout(pollTimer);pollTimer=setTimeout(poll,0);});
 pollTimer=setTimeout(poll,0);
 return ()=>{clearTimeout(pollTimer);socket.close();};
}

async function start(){
 if(!ENABLED)return;
 await waitForServer();
 const store=loadSessions();
 const runner=await ensureSession(store,'runner','SERVER CLOCK');
 const fallback=await ensureSession(store,'fallbackHost','SERVER FALLBACK HOST');
 const stopRunner=await startRunner(runner),stopHost=await startFallbackHost(fallback);
 const stop=()=>{try{stopRunner();}catch{}try{stopHost();}catch{}};
 process.once('SIGINT',stop);process.once('SIGTERM',stop);process.once('exit',stop);
 console.info('[AutonomousRoundsV213] server clock active: continuous 3-second BET and 8-ball rounds; late clients join next BET');
}

start().catch(error=>console.error('[AutonomousRoundsV213] failed',error));

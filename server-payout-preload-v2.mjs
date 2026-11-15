import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const VERSION=2;
const DATA_DIR=process.env.SWEETS_DATA_DIR||path.join(process.cwd(),'data');
const DATA_FILE=path.join(DATA_DIR,'payout-control-v2.json');
const ADMIN_TOKEN=String(process.env.SWEETS_ADMIN_TOKEN||'');
const DEFAULT_CONFIG={
 targetRate:90,minRate:50,maxRate:150,maxStepPerBall:1.0,maturityBet:4000,
 rollingHorizonBet:12000,maxBias:22,deadband:0.75,gain:0.65
};
const requestBodies=new WeakMap(),deferredHeads=new WeakMap();
let dirty=false,saveTimer=0;

const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));
const finite=value=>Number.isFinite(Number(value))?Number(value):0;
const safeId=value=>String(value||'').replace(/[^A-Za-z0-9._-]/g,'').slice(0,160);
const rate=(win,bet)=>bet>0?win/bet*100:null;
const round1=value=>Math.round(Number(value)*10)/10;

function blank(){return {version:VERSION,config:{...DEFAULT_CONFIG},machines:{},updatedAt:Date.now()};}
function load(){
 try{const parsed=JSON.parse(fs.readFileSync(DATA_FILE,'utf8'));return normalize(parsed);}catch{return blank();}
}
function normalize(input){
 const db=input&&typeof input==='object'?input:blank();db.version=VERSION;db.config={...DEFAULT_CONFIG,...(db.config||{})};db.machines=db.machines||{};
 for(const machine of Object.values(db.machines)){
  machine.players=machine.players||{};machine.updatedAt=finite(machine.updatedAt)||Date.now();
  for(const player of Object.values(machine.players)){
   player.games=player.games||{};player.ballHistory=Array.isArray(player.ballHistory)?player.ballHistory.slice(-64):[];
   for(const game of Object.values(player.games))normalizeGame(game,db.config);
  }
 }
 return db;
}
function normalizeGame(game,config){
 game.mode=game.mode==='manual'?'manual':'auto';game.manualRate=clamp(game.manualRate||config.targetRate,config.minRate,config.maxRate);
 game.effectiveRate=clamp(game.effectiveRate||config.targetRate,config.minRate,config.maxRate);
 game.targetRate=clamp(game.targetRate||config.targetRate,config.minRate,config.maxRate);
 game.bet=finite(game.bet);game.win=finite(game.win);game.rollingBet=finite(game.rollingBet);game.rollingWin=finite(game.rollingWin);
 game.rounds=game.rounds||{};game.lastAdjustedKey=String(game.lastAdjustedKey||'');game.lastAppliedRate=Number.isFinite(Number(game.lastAppliedRate))?Number(game.lastAppliedRate):null;
 return game;
}
const db=load();
function scheduleSave(){dirty=true;clearTimeout(saveTimer);saveTimer=setTimeout(save,120);saveTimer.unref?.();}
function save(){if(!dirty)return;dirty=false;try{fs.mkdirSync(DATA_DIR,{recursive:true});fs.writeFileSync(DATA_FILE,JSON.stringify(db,null,2));}catch(error){console.error('[PayoutV2] save',error);}}
process.on('exit',save);process.on('SIGINT',()=>{save();process.exit(0);});process.on('SIGTERM',()=>{save();process.exit(0);});

function machine(id){id=safeId(id)||'public-01';return db.machines[id]||(db.machines[id]={id,players:{},updatedAt:Date.now()});}
function player(machineId,playerId){const m=machine(machineId);playerId=safeId(playerId);return m.players[playerId]||(m.players[playerId]={playerId,games:{},ballHistory:[],updatedAt:Date.now()});}
function game(machineId,playerId,gameId){const p=player(machineId,playerId);gameId=safeId(gameId)||'game';return p.games[gameId]||(p.games[gameId]=normalizeGame({},db.config));}
function targetFor(gameState){return clamp(gameState.targetRate||db.config.targetRate,db.config.minRate,db.config.maxRate);}
function actualWithPrior(gameState){
 const target=targetFor(gameState),prior=Math.max(1,finite(db.config.maturityBet));
 return (gameState.rollingWin+target*prior/100)/(gameState.rollingBet+prior)*100;
}
function desiredRate(gameState){
 const target=targetFor(gameState),observed=actualWithPrior(gameState),error=target-observed;
 if(Math.abs(error)<finite(db.config.deadband))return target;
 return clamp(target+clamp(error*finite(db.config.gain),-finite(db.config.maxBias),finite(db.config.maxBias)),db.config.minRate,db.config.maxRate);
}
function adjust(gameState,key){
 if(gameState.mode==='manual'){gameState.effectiveRate=clamp(gameState.manualRate,db.config.minRate,db.config.maxRate);return;}
 if(gameState.lastAdjustedKey===key)return;
 gameState.lastAdjustedKey=key;
 const desired=desiredRate(gameState),step=Math.max(.1,finite(db.config.maxStepPerBall));
 gameState.effectiveRate=round1(clamp(gameState.effectiveRate+clamp(desired-gameState.effectiveRate,-step,step),db.config.minRate,db.config.maxRate));
}
function processGame(machineId,playerId,roundId,ball,item){
 const id=safeId(item.id||item.kind||'game'),g=game(machineId,playerId,id),bet=Math.max(0,finite(item.bet)),win=Math.max(0,finite(item.win));
 const roundKey=safeId(roundId)||'round',record=g.rounds[roundKey]||(g.rounds[roundKey]={bet:0,win:0,lastBall:0});
 if(record.bet!==bet){const delta=bet-record.bet;g.bet+=delta;const horizon=Math.max(100,finite(db.config.rollingHorizonBet));const decay=Math.exp(-Math.max(0,delta)/horizon);g.rollingBet=g.rollingBet*decay+Math.max(0,delta);g.rollingWin*=decay;record.bet=bet;}
 if(record.win!==win){const delta=win-record.win;g.win+=delta;g.rollingWin+=delta;record.win=win;}
 record.lastBall=Math.max(record.lastBall,ball);g.lastAppliedRate=Number.isFinite(Number(item.appliedRate))?Number(item.appliedRate):g.lastAppliedRate;
 adjust(g,roundKey+':'+ball);return {id,bet,win,actualRate:rate(g.win,g.bet),rollingRate:actualWithPrior(g),targetRate:targetFor(g),effectiveRate:g.mode==='manual'?g.manualRate:g.effectiveRate,mode:g.mode,manualRate:g.manualRate,appliedRate:g.lastAppliedRate};
}
function processTelemetry(machineId,playerId,payload){
 const telemetry=payload?.state?.payoutV2;if(!telemetry||Number(telemetry.version)!==VERSION)return null;
 const roundId=safeId(payload.roundId),ball=Math.max(0,Math.min(8,Number(payload.ballIndex)||Number(telemetry.ball)||0)),p=player(machineId,playerId),games={};
 for(const item of Array.isArray(telemetry.games)?telemetry.games:[])games[safeId(item.id||item.kind)]=processGame(machineId,playerId,roundId,ball,item);
 p.currentCredit=finite(telemetry.credit);p.roundWin=finite(telemetry.roundWin);p.lastRoundId=roundId;p.lastBall=ball;p.updatedAt=Date.now();
 const roundBet=Object.values(games).reduce((sum,item)=>sum+finite(item.bet),0),roundWin=Object.values(games).reduce((sum,item)=>sum+finite(item.win),0);
 const history={roundId,ball,number:Number(telemetry.number)||null,roundBet,roundWin,currentCredit:p.currentCredit,games:Object.fromEntries(Object.entries(games).map(([id,g])=>[id,{bet:g.bet,win:g.win,effectiveRate:g.effectiveRate,appliedRate:g.appliedRate}])),updatedAt:Date.now()};
 const pos=p.ballHistory.findIndex(item=>item.roundId===roundId&&item.ball===ball);if(pos>=0)p.ballHistory[pos]=history;else p.ballHistory.push(history);p.ballHistory=p.ballHistory.slice(-64);
 machine(machineId).updatedAt=Date.now();scheduleSave();return publicControl(machineId,playerId);
}
function publicControl(machineId,playerId){
 const p=player(machineId,playerId),games={};let weighted=0,weight=0,totalBet=0,totalWin=0;
 for(const [id,g] of Object.entries(p.games)){
  normalizeGame(g,db.config);const effective=g.mode==='manual'?g.manualRate:g.effectiveRate;
  games[id]={mode:g.mode,manualRate:round1(g.manualRate),effectiveRate:round1(effective),targetRate:round1(targetFor(g)),actualRate:g.bet>0?round1(g.win/g.bet*100):null,rollingRate:round1(actualWithPrior(g)),bet:round1(g.bet),win:round1(g.win),appliedRate:g.lastAppliedRate==null?null:round1(g.lastAppliedRate)};
  const w=Math.max(1,g.bet);weighted+=effective*w;weight+=w;totalBet+=g.bet;totalWin+=g.win;
 }
 return {version:VERSION,source:'per-player-game',playerId:safeId(playerId),weightedRate:round1(weight?weighted/weight:db.config.targetRate),playerActualRate:totalBet>0?round1(totalWin/totalBet*100):null,currentCredit:round1(p.currentCredit),roundWin:round1(p.roundWin),lastBall:Number(p.lastBall)||0,lastRoundId:p.lastRoundId||null,games};
}
function aggregateMachine(machineId){
 const m=machine(machineId),players=[];let totalBet=0,totalWin=0;const gameTotals={};
 for(const [playerId,p] of Object.entries(m.players)){
  const control=publicControl(machineId,playerId);let bet=0,win=0;
  for(const [id,g] of Object.entries(control.games)){bet+=g.bet;win+=g.win;const t=gameTotals[id]||(gameTotals[id]={bet:0,win:0});t.bet+=g.bet;t.win+=g.win;}
  totalBet+=bet;totalWin+=win;players.push({...control,totals:{bet:round1(bet),win:round1(win),actualRate:bet>0?round1(win/bet*100):null,games:control.games},ballHistory:p.ballHistory.filter(item=>!p.lastRoundId||item.roundId===p.lastRoundId).slice(-8)});
 }
 for(const t of Object.values(gameTotals))t.actualRate=t.bet>0?round1(t.win/t.bet*100):null;
 return {version:VERSION,config:{...db.config},totals:{bet:round1(totalBet),win:round1(totalWin),actualRate:totalBet>0?round1(totalWin/totalBet*100):null,games:gameTotals},players};
}

function parseJson(value){try{return JSON.parse(Buffer.isBuffer(value)?value.toString('utf8'):String(value||''));}catch{return null;}}
function setJson(response,payload,status=200){const text=JSON.stringify(payload);response.statusCode=status;try{response.removeHeader('content-length');response.setHeader('content-type','application/json; charset=utf-8');response.setHeader('content-length',Buffer.byteLength(text));}catch{}return text;}
function adminAllowed(req,url){const supplied=String(req.headers['x-admin-token']||url.searchParams.get('adminToken')||'');return !!ADMIN_TOKEN&&supplied===ADMIN_TOKEN;}
async function readBody(req){const chunks=[];for await(const chunk of req)chunks.push(Buffer.from(chunk));return parseJson(Buffer.concat(chunks))||{};}

const nativeIterator=http.IncomingMessage.prototype[Symbol.asyncIterator];
http.IncomingMessage.prototype[Symbol.asyncIterator]=async function* capture(){const chunks=[];for await(const chunk of nativeIterator.call(this)){chunks.push(Buffer.from(chunk));yield chunk;}requestBodies.set(this,Buffer.concat(chunks).toString('utf8'));};

const nativeEmit=http.Server.prototype.emit;
http.Server.prototype.emit=function(type,...args){
 if(type==='request'){
  const [req,res]=args,url=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`),parts=url.pathname.split('/').filter(Boolean);
  if(parts[0]==='api'&&parts[1]==='admin'&&parts[2]==='machines'&&parts[4]==='payout-v2'){
   if(!adminAllowed(req,url)){res.statusCode=403;res.end(JSON.stringify({ok:false,error:'admin_required'}));return true;}
   const machineId=safeId(parts[3]);
   (async()=>{
    try{
     const body=await readBody(req);
     if(req.method==='POST'&&parts[5]==='global'){
      for(const key of ['targetRate','minRate','maxRate','maxStepPerBall','maturityBet','rollingHorizonBet','maxBias','deadband','gain'])if(Number.isFinite(Number(body[key])))db.config[key]=Number(body[key]);
      db.config.minRate=clamp(db.config.minRate,40,150);db.config.maxRate=clamp(db.config.maxRate,db.config.minRate,180);db.config.targetRate=clamp(db.config.targetRate,db.config.minRate,db.config.maxRate);scheduleSave();res.end(setJson(res,{ok:true,payoutControlV2:aggregateMachine(machineId)}));return;
     }
     if(req.method==='POST'&&parts[5]==='players'&&parts[7]==='games'){
      const playerId=safeId(parts[6]),gameId=safeId(parts[8]),g=game(machineId,playerId,gameId);g.mode=body.mode==='manual'?'manual':'auto';if(Number.isFinite(Number(body.manualRate)))g.manualRate=clamp(body.manualRate,db.config.minRate,db.config.maxRate);if(Number.isFinite(Number(body.targetRate)))g.targetRate=clamp(body.targetRate,db.config.minRate,db.config.maxRate);if(g.mode==='manual')g.effectiveRate=g.manualRate;scheduleSave();res.end(setJson(res,{ok:true,control:publicControl(machineId,playerId)}));return;
     }
     res.end(setJson(res,{ok:false,error:'not_found'},404));
    }catch(error){res.end(setJson(res,{ok:false,error:error?.message||'payout_v2_error'},500));}
   })();return true;
  }
 }
 return nativeEmit.call(this,type,...args);
};

const nativeWriteHead=http.ServerResponse.prototype.writeHead,nativeEnd=http.ServerResponse.prototype.end;
http.ServerResponse.prototype.writeHead=function(...args){
 const req=this.req,url=req?new URL(req.url||'/',`http://${req.headers.host||'localhost'}`):null;
 if(url&&(url.pathname.includes('/round/checkpoint')||url.pathname.match(/^\/api\/machines\/[^/]+\/state$/)||url.pathname.match(/^\/api\/admin\/machines\/[^/]+$/))){deferredHeads.set(this,args);this.statusCode=Number(args[0])||this.statusCode;return this;}
 return nativeWriteHead.apply(this,args);
};
http.ServerResponse.prototype.end=function(chunk,encoding,callback){
 const req=this.req,url=req?new URL(req.url||'/',`http://${req.headers.host||'localhost'}`):null;let output=chunk;
 try{
  if(url&&this.statusCode<400){
   const checkpoint=url.pathname.match(/^\/api\/machines\/([^/]+)\/round\/checkpoint$/);
   const state=url.pathname.match(/^\/api\/machines\/([^/]+)\/state$/);
   const admin=url.pathname.match(/^\/api\/admin\/machines\/([^/]+)$/);
   if(checkpoint){const payload=parseJson(requestBodies.get(req)),response=parseJson(chunk);if(payload&&response){response.payoutControlV2=processTelemetry(decodeURIComponent(checkpoint[1]),req.headers['x-player-id'],payload);output=JSON.stringify(response);}}
   else if(state){const response=parseJson(chunk);if(response){response.payoutControlV2=publicControl(decodeURIComponent(state[1]),req.headers['x-player-id']);output=JSON.stringify(response);}}
   else if(admin){const response=parseJson(chunk);if(response){response.payoutControlV2=aggregateMachine(decodeURIComponent(admin[1]));output=JSON.stringify(response);}}
  }
 }catch(error){console.error('[PayoutV2] response',error);}
 const pending=deferredHeads.get(this);if(pending){
  deferredHeads.delete(this);const args=[...pending],headerIndex=typeof args[1]==='string'?2:1,headers={...(args[headerIndex]||{})};
  for(const key of Object.keys(headers))if(key.toLowerCase()==='content-length')delete headers[key];
  if(output!=null)headers['Content-Length']=Buffer.byteLength(Buffer.isBuffer(output)?output:typeof output==='string'?output:String(output));
  headers['Content-Type']=headers['Content-Type']||headers['content-type']||'application/json; charset=utf-8';args[headerIndex]=headers;nativeWriteHead.apply(this,args);
 }
 return nativeEnd.call(this,output,encoding,callback);
};

console.info('[PayoutV2] per-player x game control loaded; global statistics are display-only');

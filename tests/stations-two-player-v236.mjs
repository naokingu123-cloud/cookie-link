import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import os from 'node:os';
import path from 'node:path';
import {WebSocket} from 'ws';
import {stationView} from './stations-view-fixture-v236.mjs';
// Real HTTP/WS server and actual roster UI code. Payout numbers below are
// deterministic protocol fixtures, not a statement about random game odds.
const root=fileURLToPath(new URL('..',import.meta.url)),source=await readFile(new URL('../assets/stations-v235.js',import.meta.url),'utf8');
const temp=await mkdtemp(path.join(os.tmpdir(),'sweets-real-win236-')),port=42000+Math.floor(Math.random()*900),base='http://127.0.0.1:'+port,admin='real-win236';
const child=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,PORT:String(port),SWEETS_DATA_FILE:path.join(temp,'db.json'),SWEETS_DATA_DIR:temp,SWEETS_ADMIN_TOKEN:admin,SWEETS_BET_DURATION_MS:'2000',SWEETS_PLAYER_STABLE_MS:'500',SWEETS_ROUND_START_DELAY_MS:'300',SWEETS_RESULT_GRACE_MS:'3000'},stdio:['ignore','pipe','pipe']});
let logs='';child.stdout.on('data',x=>logs+=x);child.stderr.on('data',x=>logs+=x);
const sockets=[],delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function call(route,{session,body,expect=200}={}){
 const response=await fetch(base+route,{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json',...(session?{authorization:'Bearer '+session.token,'x-player-id':session.player.id}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(5000)});
 const data=await response.json();assert.equal(response.status,expect,route+': '+JSON.stringify(data));return data;
}
async function until(fn,label,timeout=9000){const end=Date.now()+timeout;while(Date.now()<end){if(child.exitCode!==null)throw Error(logs);const value=await fn();if(value)return value;await delay(80);}throw Error(label+' timeout\n'+logs);}
const state=session=>call('/api/machines/public-01/state',{session});
const create=name=>call('/api/session',{body:{displayName:name},expect:201});
async function connect(session){
 const socket=new WebSocket(`ws://127.0.0.1:${port}/ws?machineId=public-01&playerId=${session.player.id}&token=${session.token}`);
 sockets.push(socket);session.socket=socket;session.messages=[];
 socket.on('message',raw=>{const message=JSON.parse(String(raw));session.messages.push(message);session.view?.receive(message);});
 socket.on('error',()=>{});await once(socket,'open');return socket;
}
const makeModel=()=>({phase:'playing',token:1,totalWin:0,roundWins:[0,0],paid:[false,false],enabled:[true,true],locked:[100,200],engines:[{totalHundredths:0},{totalHundredths:0}]});
const games=(w1,w2)=>[{id:'cookie',bet:100,win:w1},{id:'choco',bet:200,win:w2}];
try{
 await until(async()=>{try{return(await fetch(base+'/api/health')).ok;}catch{return false;}},'health');
 const host=await create('SERVER ROULETTE'),a=await create('実プレイヤーA'),b=await create('実プレイヤーB');
 for(const session of [host,a,b])await connect(session);
 await delay(620);
 await call('/api/admin/machines/public-01/host/register?adminToken='+admin,{session:host,body:{}});
 const betting=await state(a);assert.equal(betting.stations.demoCount,0);assert.equal(betting.stations.selfStation,1);
 assert.equal((await state(b)).stations.selfStation,2);assert.equal(betting.stations.seats.filter(s=>s.test).length,0);
 const roundId=betting.round.id;
 for(const session of [a,b]){
  const joined=await call('/api/machines/public-01/round/join',{session,body:{roundId,totalBet:300,bets:[100,200],locked:[100,200],enabled:[true,true],creditAfterBet:999700,clientRoundToken:session.player.id+':'+roundId,payoutV3Bet:{version:3,games:games(0,0)}}});
  assert.equal(joined.payoutControlV3.wallet.credit,999700);
 }
 const playing=await until(async()=>{const s=await state(a);return s.round?.phase==='PLAYING'?s:null;},'playing');
 for(const session of [a,b]){
  const observed=await state(session);
  session.view=stationView(source,{id:session.player.id,model:makeModel(),round:observed.round,send(message){session.socket.send(JSON.stringify(message));return true;}});
  session.view.receive({stations:observed.stations});
 }
 await delay(Math.max(550,playing.round.drawStartsAt-Date.now()+40));
 const ball=number=>call('/api/machines/public-01/round/ball',{session:host,body:{roundId,ballIndex:number,number,eventId:roundId+':'+number}});
 await ball(1);
 Object.assign(a.view.model.engines[0],{totalHundredths:100});Object.assign(a.view.model.engines[1],{totalHundredths:50});
 Object.assign(b.view.model.engines[0],{totalHundredths:250});Object.assign(b.view.model.engines[1],{totalHundredths:250});
 a.view.tick();b.view.tick();
 await until(()=>a.view.otherText(2).includes('750 WIN')&&b.view.otherText(1).includes('200 WIN'),'each real player sees the OTHER earned WIN');
 assert.equal(a.view.model.totalWin,0);assert.equal(b.view.model.totalWin,0);
 let monitor=await call('/api/admin/machines/public-01/stations?adminToken='+admin);
 assert.deepEqual(monitor.stations.seats.filter(s=>!s.empty).map(s=>s.win),[200,750]);
 // Existing checkpoint transport must work even with a v235 client that only
 // reported zero in station_progress. No extra state polling is added.
 for(const [session,w1,w2] of [[a,150,100],[b,500,400]]){
  await call('/api/machines/public-01/round/checkpoint',{session,body:{roundId,ballIndex:1,state:{phase:'playing',totalWin:0,roundWins:[0,0],credit:999700,payoutV3:{version:3,ball:1,complete:true,roundBet:300,roundWin:w1+w2,phase:'PLAYING',games:games(w1,w2)}}}});
 }
 await until(()=>a.view.otherText(2).includes('900 WIN')&&b.view.otherText(1).includes('250 WIN'),'checkpoint fallback broadcast');
 for(let n=2;n<=8;n++)await ball(n);
 for(const [session,w1,w2] of [[a,150,100],[b,500,400]]){
  const body={roundId,totalWin:w1+w2,creditAfter:999700+w1+w2,digest:'v236:'+session.player.id,payoutV3:{version:3,roundWin:w1+w2,games:games(w1,w2)}};
  const settled=await call('/api/machines/public-01/round/settle',{session,body});
  assert.equal(settled.settlement.totalWin,w1+w2);assert.equal(settled.payoutControlV3.wallet.credit,999700+w1+w2);
  const duplicate=await call('/api/machines/public-01/round/settle',{session,body:{...body,totalWin:999999}});
  assert.equal(duplicate.idempotent,true);assert.equal(duplicate.settlement.totalWin,w1+w2);
 }
 monitor=await call('/api/admin/machines/public-01?adminToken='+admin);
 assert.equal(monitor.round.settlements,2);
 assert.equal(monitor.payoutControlV3.totals.bet,600);assert.equal(monitor.payoutControlV3.totals.win,1150);
 assert.deepEqual(monitor.stations.seats.filter(s=>!s.empty).map(s=>[s.win,s.settled]),[[250,true],[900,true]]);
 for(const session of [a,b]){
  const observed=await state(session);session.view.receive({stations:observed.stations});
  assert.deepEqual(session.messages.filter(m=>m.type==='ball_result').map(m=>m.ball.number),[1,2,3,4,5,6,7,8]);
 }
 assert.match(a.view.otherText(2),/900 WIN/);assert.match(b.view.otherText(1),/250 WIN/);
 const next=await until(async()=>{const s=await state(a);return s.round?.id!==roundId&&s.round?.phase==='BETTING'?s:null;},'next BET');
 assert.equal(next.stations.seats.filter(s=>!s.empty).length,2);
 assert.ok(next.stations.seats.filter(s=>!s.empty).every(s=>s.win===0));assert.equal(next.stations.demoCount,0);
 assert.equal((await state(b)).payoutControlV3.wallet.credit,1000600);
 console.log('STATIONS_V236_TWO_REAL_PLAYERS_PASS',JSON.stringify({live:[200,750],checkpoint:[250,900],final:[250,900],credits:[999950,1000600],testPlayers:0,orderedBalls:8,nextBet:true}));
}finally{
 for(const socket of sockets)try{socket.terminate();}catch{}
 if(child.exitCode===null){const done=once(child,'exit');child.kill('SIGTERM');await Promise.race([done,delay(2000)]);if(child.exitCode===null)child.kill('SIGKILL');}
 await rm(temp,{recursive:true,force:true});
}

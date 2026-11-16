import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import os from 'node:os';
import path from 'node:path';
import {WebSocket} from 'ws';
const root=fileURLToPath(new URL('..',import.meta.url));
const temp=await mkdtemp(path.join(os.tmpdir(),'sweets-stations235-'));
const port=40200+Math.floor(Math.random()*700),base='http://127.0.0.1:'+port,admin='station-qa';
const child=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,PORT:String(port),SWEETS_DATA_FILE:path.join(temp,'db.json'),SWEETS_DATA_DIR:temp,SWEETS_ADMIN_TOKEN:admin,SWEETS_BET_DURATION_MS:'1200',SWEETS_PLAYER_STABLE_MS:'500',SWEETS_ROUND_START_DELAY_MS:'300',SWEETS_RESULT_GRACE_MS:'1000'},stdio:['ignore','pipe','pipe']});
let output='';child.stdout.on('data',x=>output+=x);child.stderr.on('data',x=>output+=x);
const sockets=[],sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function call(url,{method='GET',body,session,expect=200}={}){
 const response=await fetch(base+url,{method,headers:{'content-type':'application/json',...(session?{authorization:'Bearer '+session.token,'x-player-id':session.player.id}:{})},body:body===undefined?undefined:JSON.stringify(body)});
 const result=await response.json();assert.equal(response.status,expect,JSON.stringify(result));return result;
}
const session=name=>call('/api/session',{method:'POST',body:{displayName:name},expect:201});
function connect(s){return new Promise((resolve,reject)=>{const ws=new WebSocket(`ws://127.0.0.1:${port}/ws?machineId=public-01&playerId=${s.player.id}&token=${s.token}`);sockets.push(ws);ws.once('open',()=>resolve(ws));ws.once('error',reject);});}
async function wait(s,predicate){for(let i=0;i<150;i++){const data=await call('/api/machines/public-01/state',{session:s});if(predicate(data))return data;await sleep(60);}throw Error('state timed out '+output);}
async function eight(s,round){await sleep(Math.max(0,round.drawStartsAt-Date.now()+30));for(let i=1;i<=8;i++)await call('/api/machines/public-01/round/ball',{method:'POST',session:s,body:{roundId:round.id,ballIndex:i,number:i,eventId:round.id+':'+i}});}
try{
 let started=false;for(let i=0;i<120;i++){try{if((await fetch(base+'/api/health')).ok){started=true;break;}}catch{}await sleep(50);}assert.ok(started,output);
 const host=await session('SERVER ROULETTE');await connect(host);
 await call('/api/admin/machines/public-01/host/register?adminToken='+admin,{method:'POST',session:host,body:{}});
 let monitor=await call('/api/admin/machines/public-01/stations?adminToken='+admin);
 assert.ok(monitor.stations.seats.every(s=>s.empty),'host does not consume st.1');
 const player=await session('人間1');const ws=await connect(player);
 let state=await wait(player,s=>s.stations?.selfStation===1);
 assert.equal(state.stations.seats.filter(s=>s.test).length,5);
 ws.send(JSON.stringify({type:'station_profile',profile:{name:'もちうさ',pet:{flavor:'mint',top:'crown',outfit:'cape',accent:'#67c6de'},photo:'data:image/svg+xml,<svg onload=x>'}}));
 state=await wait(player,s=>s.stations.seats[0].name==='もちうさ');
 assert.equal(state.stations.seats[0].photo,'');assert.equal(state.stations.seats[0].pet.flavor,'mint');
 await connect(player);state=await wait(player,s=>s.stations.selfStation===1);assert.equal(state.stations.seats.filter(s=>!s.empty&&!s.test).length,1);
 const current=await wait(host,s=>s.round?.phase==='PLAYING');await eight(host,current.round);
 const next=await wait(player,s=>s.round?.id!==current.round.id&&s.round?.phase==='BETTING'&&s.round.canBet);
 await call('/api/machines/public-01/round/join',{method:'POST',session:player,body:{roundId:next.round.id,totalBet:100,bets:[100],locked:[100],enabled:[true],creditAfterBet:999900}});
 const play=await wait(host,s=>s.round?.id===next.round.id&&s.round.phase==='PLAYING');await eight(host,play.round);
 state=await wait(player,s=>s.round?.phase==='COMPLETE');
 const testRows=state.stations.seats.filter(s=>s.test);assert.equal(testRows.length,5);assert.ok(testRows.every(s=>s.ballCount===8&&s.settled));
 assert.equal(state.round.participantCount,1,'TEST users never affect wallet or PO participants');
 const others=[];for(let i=2;i<=7;i++){const s=await session('人間'+i);await connect(s);others.push(s);state=await wait(s,v=>i===7?v.stations?.waiting:v.stations?.selfStation===i);}
 state=await call('/api/machines/public-01/state',{session:others[5]});assert.equal(state.stations.selfStation,null);
 await call('/api/machines/public-01/round/join',{method:'POST',session:others[5],body:{bets:[100],totalBet:100},expect:409});
 await call('/api/admin/machines/public-01/stations/demo',{method:'POST',body:{count:0},session:player,expect:403});
 await call('/api/admin/machines/public-01/stations/demo?adminToken='+admin,{method:'POST',body:{count:0}});
 monitor=await call('/api/admin/machines/public-01?adminToken='+admin);assert.equal(monitor.stations.capacity,6);assert.equal(monitor.stations.seats.filter(s=>!s.empty).length,6);
 assert.ok(!JSON.stringify(state.stations).includes(host.token));
 console.log('STATIONS_V235_INTEGRATION_PASS',JSON.stringify({seats:6,testPlayers:5,commonBalls:8,fullSpectator:true,hostExcluded:true}));
}finally{for(const ws of sockets)try{ws.close();}catch{}child.kill('SIGTERM');await sleep(250);await rm(temp,{recursive:true,force:true});}

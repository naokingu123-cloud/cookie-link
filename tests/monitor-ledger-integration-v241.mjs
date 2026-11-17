import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp,rm} from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {WebSocket} from 'ws';
import '../assets/monitor-ledger-v241.js';
const model=globalThis.SweetsMonitorLedgerV241;
const root=fileURLToPath(new URL('..',import.meta.url)),temp=await mkdtemp(path.join(os.tmpdir(),'monitor241-'));
const listener=net.createServer();listener.listen(0,'127.0.0.1');await once(listener,'listening');const port=listener.address().port;await new Promise(r=>listener.close(r));
const base='http://127.0.0.1:'+port,admin='monitor-241-test',sockets=[],wire=[];
const child=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,PORT:String(port),SWEETS_DATA_FILE:path.join(temp,'db.json'),SWEETS_DATA_DIR:temp,SWEETS_ADMIN_TOKEN:admin,SWEETS_BET_DURATION_MS:'1800',SWEETS_PLAYER_STABLE_MS:'500',SWEETS_ROUND_START_DELAY_MS:'300',SWEETS_RESULT_GRACE_MS:'12000'},stdio:['ignore','pipe','pipe']});
let logs='';child.stdout.on('data',b=>logs+=b);child.stderr.on('data',b=>logs+=b);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function request(route,{session,body,expect=200}={}){
 const res=await fetch(base+route,{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json',...(session?{authorization:'Bearer '+session.token,'x-player-id':session.player.id}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(5000)});
 const d=await res.json();assert.equal(res.status,expect,route+': '+JSON.stringify(d));return d;
}
const state=s=>request('/api/machines/public-01/state',{session:s});
const monitor=()=>request('/api/admin/machines/public-01?adminToken='+admin);
async function until(fn,label,ms=9000){const end=Date.now()+ms;while(Date.now()<end){if(child.exitCode!==null)throw Error(logs);const value=await fn();if(value)return value;await sleep(70);}throw Error(label+' timeout\n'+logs);}
async function session(name){return request('/api/session',{body:{displayName:name},expect:201});}
async function connect(s){const ws=new WebSocket(`ws://127.0.0.1:${port}/ws?machineId=public-01&playerId=${s.player.id}&token=${s.token}`);sockets.push(ws);ws.on('message',b=>{try{wire.push(JSON.parse(String(b)));}catch{}});ws.on('error',()=>{});await once(ws,'open');return ws;}
try{
 await until(async()=>{try{return (await fetch(base+'/api/health')).ok;}catch{return false;}},'server');
 const host=await session('SERVER ROULETTE'),a=await session('参加A'),b=await session('参加B');
 await connect(host);const sa=await connect(a),sb=await connect(b);await sleep(650);
 await request('/api/admin/machines/public-01/host/register?adminToken='+admin,{session:host,body:{}});
 const bet=(await until(async()=>{const d=await state(a);return d.round?.phase==='BETTING'&&d.round.canBet?d:null;},'BET')).round;
 for(const [s,totalBet] of [[a,27000],[b,10000]])await request('/api/machines/public-01/round/join',{session:s,body:{roundId:bet.id,clientRoundToken:'test-'+s.player.id,bets:[totalBet],locked:[totalBet],enabled:[true],totalBet,creditBefore:1000000,creditAfterBet:1000000-totalBet,payoutV3Bet:{version:3,games:[{id:'cookie',bet:totalBet}]}}});
 const playing=(await until(async()=>{const d=await state(a);return d.round?.phase==='PLAYING'?d:null;},'PLAYING')).round;await sleep(Math.max(0,playing.drawStartsAt-Date.now()+30));
 async function ball(index,number){await request('/api/machines/public-01/round/ball',{session:host,body:{roundId:bet.id,ballIndex:index,number,eventId:bet.id+':'+index}});}
 await ball(1,1);
 const gains=Array.from({length:25},()=>0);gains[0]=null;gains[6]=27000;gains[7]=216000;gains[8]=1296000;gains[9]=2700;
 const detail={version:238,roundId:bet.id,ballCount:1,phase:'PLAYING',paused:false,prediction:'ready',predictionBaseWin:54000,numberGains:gains,highestReachNumbers:[]};
 sa.send(JSON.stringify({type:'station_progress',roundId:bet.id,win:54000,detail}));
 sb.send(JSON.stringify({type:'station_progress',roundId:bet.id,win:1000,detail:{...detail,predictionBaseWin:1000,numberGains:gains.map((v,i)=>i===0?null:100)}}));
 const d=await until(async()=>{const d=await monitor();return d.hitForecasts?.[a.player.id]&&d.hitForecasts?.[b.player.id]?d:null;},'both forecasts');
 const rows=model.rows(d),ar=rows.find(r=>r.id===a.player.id);assert.ok(ar);
 assert.equal(model.numberCell(ar,d,7).color,'red');assert.equal(model.numberCell(ar,d,8).color,'purple');assert.equal(model.numberCell(ar,d,9).color,'rainbow');assert.equal(model.numberCell(ar,d,10).ratio,'+0.10倍');
 assert.equal(model.total(rows,d).bet,37000);
 const publicState=await state(b);assert.equal(publicState.hitForecasts,undefined);assert.ok(!JSON.stringify(publicState.stations).includes('numberGains'),'forecasts are admin-only');
 assert.ok(wire.every(msg=>!JSON.stringify(msg).includes('numberGains')&&!msg.hitForecasts),'public WebSocket cannot disclose admin forecasts');
 await request('/api/admin/machines/public-01',{session:a,expect:403});
 await ball(2,7);assert.deepEqual((await monitor()).hitForecasts,{},'new ball invalidates old forecasts');
 await sleep(430);sa.send(JSON.stringify({type:'station_progress',roundId:bet.id,win:54000,detail}));await sleep(100);
 assert.deepEqual((await monitor()).hitForecasts,{},'stale-ball report is rejected');
 for(const [i,n] of [2,3,4,5,6,8].entries())await ball(i+3,n);
 for(const [s,amount,win] of [[a,27000,60000],[b,10000,0]])await request('/api/machines/public-01/round/settle',{session:s,body:{roundId:bet.id,totalWin:win,creditAfter:1000000-amount+win,digest:'monitor241-'+s.player.id,payoutV3:{version:3,roundWin:win,games:[{id:'cookie',bet:amount,win}]}}});
 const end=await monitor(),final=model.rows(end),total=model.total(final,end);
 assert.deepEqual(end.hitForecasts,{});assert.equal(final.find(r=>r.id===b.player.id).win,0,'zero settlement overrides provisional WIN');
 assert.equal(total.input,37000);assert.equal(total.output,60000);assert.equal(total.hg,-23000);assert.equal(total.credit,2023000);assert.equal(total.win,60000);
 console.log('MONITOR_LEDGER_V241_INTEGRATION_PASS: two players, 25 gains, admin privacy, invalidation, 3/10/50 crossing, exact zero settlement and negative H/G');
}finally{for(const ws of sockets)try{ws.terminate();}catch{}if(child.exitCode===null){const ended=once(child,'exit');child.kill('SIGTERM');await ended;}await rm(temp,{recursive:true,force:true});}

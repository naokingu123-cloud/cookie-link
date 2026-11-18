import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {once} from 'node:events';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {WebSocket} from 'ws';

const ROOT=fileURLToPath(new URL('..',import.meta.url)),temporary=await fs.mkdtemp(path.join(os.tmpdir(),'sweets-wallet-v228-'));
const dataDir=path.join(temporary,'data'),ADMIN='wallet-v228-test',delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let child,base,port,logs='';const sockets=[];
const hash=value=>createHash('sha256').update(value).digest('hex');
const seeded=id=>({player:{id},token:id+'-token'});
const legacy=seeded('legacy-player'),legacyHost=seeded('legacy-host'),idle=seeded('idle-player'),migrated=seeded('migrated-player'),poor=seeded('poor-player');

async function request(route,{session,body,machine='public-01'}={}){
 const response=await fetch(base+route.replaceAll('{machine}',machine),{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json',...(session?{authorization:'Bearer '+session.token,'x-player-id':session.player.id}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(5000)});
 return {status:response.status,data:await response.json()};
}
async function json(route,options){const result=await request(route,options);assert.ok(result.status<400,route+': '+JSON.stringify(result));return result.data;}
const state=(session,machine='public-01')=>json('/api/machines/{machine}/state',{session,machine});
async function until(fn,label,timeout=9000){const deadline=Date.now()+timeout;while(Date.now()<deadline){const value=await fn();if(value)return value;await delay(120);}throw Error(label+' timeout\n'+logs);}
async function connect(session,machine='public-01'){
 const socket=new WebSocket(`ws://127.0.0.1:${port}/ws?machineId=${machine}&playerId=${session.player.id}&token=${session.token}`);socket.on('error',()=>{});sockets.push(socket);await once(socket,'open');return socket;
}
async function start(){
 const listener=net.createServer();listener.listen(0,'127.0.0.1');await once(listener,'listening');port=listener.address().port;await new Promise(resolve=>listener.close(resolve));base='http://127.0.0.1:'+port;
 child=spawn(process.execPath,['server.mjs'],{cwd:temporary,env:{...process.env,PORT:String(port),SWEETS_ADMIN_TOKEN:ADMIN,SWEETS_DATA_DIR:dataDir,SWEETS_DATA_FILE:path.join(dataDir,'db.json'),SWEETS_PLAYER_STABLE_MS:'500',SWEETS_BET_DURATION_MS:'5000',SWEETS_ROUND_START_DELAY_MS:'300',SWEETS_RESULT_GRACE_MS:'350',SWEETS_CONTINUOUS_PHYSICAL_ROUNDS:'1'},stdio:['ignore','pipe','pipe']});
 child.stdout.on('data',chunk=>{logs+=chunk;});child.stderr.on('data',chunk=>{logs+=chunk;});
 await until(async()=>{if(child.exitCode!==null)throw Error(logs);try{return(await request('/api/health')).status===200;}catch{return false;}},'server readiness');
}
async function stop(signal='SIGTERM'){for(const socket of sockets.splice(0))try{socket.terminate();}catch{}if(child){const exited=child.exitCode!==null?Promise.resolve():once(child,'exit');child.kill(signal);await exited;child=null;}}
const register=(session,machine='public-01')=>json('/api/admin/machines/{machine}/host/register?adminToken='+ADMIN,{session,machine,body:{}});
const joinBody=(roundId,bet=27000,token='reservation')=>({roundId,clientRoundToken:token,bets:[bet],locked:[bet],enabled:[bet>0],totalBet:bet,creditBefore:1000000,creditAfterBet:1000000-bet,appVersion:'v228-credit-rebet',payoutV3Bet:{version:3,games:[{id:'cookie',bet}]}});
const join=(session,roundId,bet=27000,token='reservation',machine='public-01')=>json('/api/machines/{machine}/round/join',{session,machine,body:joinBody(roundId,bet,token)});
async function waitPhase(session,phase,machine='public-01',different=''){
 return until(async()=>{const current=await state(session,machine);return current.round?.phase===phase&&(!different||current.round.id!==different)?current:null;},phase);
}
async function finish(host,roundId,machine='public-01'){
 const current=await waitPhase(host,'PLAYING',machine);assert.equal(current.round.id,roundId);await delay(Math.max(0,current.round.drawStartsAt-Date.now()+20));
 for(let index=1;index<=8;index++)await json('/api/machines/{machine}/round/ball',{session:host,machine,body:{roundId,ballIndex:index,number:index,eventId:roundId+':'+index}});
}
const settle=(session,roundId,totalWin=0,machine='public-01',creditAfter=123)=>json('/api/machines/{machine}/round/settle',{session,machine,body:{roundId,totalWin,creditAfter,digest:'wallet-test',payoutV3:{version:3,games:[{id:'cookie',bet:27000,win:totalWin}]}}});

try{
 for(const name of ['server.mjs','server-core.mjs','server-core-loader-v220.mjs','server-thinking-v251.mjs','server-sugar-core-v254.mjs','server-sugar-challenge-v254.mjs','server-startup-sanitize-v217.mjs','server-rtc-preload.mjs','server-payout-preload-v3.mjs','server-stations-v235.mjs','package.json'])await fs.copyFile(path.join(ROOT,name),path.join(temporary,name));
 await fs.mkdir(path.join(temporary,'assets'),{recursive:true});
 await fs.copyFile(path.join(ROOT,'assets','jelly-rules.js'),path.join(temporary,'assets','jelly-rules.js'));
 await fs.copyFile(path.join(ROOT,'assets','sugar-challenge-rules-v254.js'),path.join(temporary,'assets','sugar-challenge-rules-v254.js'));
 const require=createRequire(import.meta.url);await fs.cp(path.dirname(require.resolve('ws/package.json')),path.join(temporary,'node_modules','ws'),{recursive:true});await fs.mkdir(dataDir,{recursive:true});
 const players=Object.fromEntries([legacy,legacyHost,idle,migrated,poor].map(session=>[session.player.id,{id:session.player.id,tokenHash:hash(session.token),displayName:session.player.id,createdAt:Date.now(),lastSeen:Date.now()}]));
 await fs.writeFile(path.join(dataDir,'db.json'),JSON.stringify({version:2,players,machines:{legacy:{id:'legacy',revision:1,sequence:1,hostPlayerId:legacyHost.player.id,history:[],round:{id:'legacy-old-round',sequence:1,phase:'PLAYING',drawSource:'physical',startedAt:Date.now()-1000,drawStartsAt:Date.now()-1000,balls:[],eligiblePlayerIds:[legacy.player.id],participants:{[legacy.player.id]:{playerId:legacy.player.id,totalBet:300,bets:[300],locked:[300],enabled:[true],creditAfterBet:700,clientRoundToken:'old-page',settlement:null}}}}}}));
 const payoutSeed={version:3,machines:{legacy:{id:'legacy',players:{
  [legacy.player.id]:{playerId:legacy.player.id,wallet:{credit:1000,revision:7,lastRoundId:'older',source:'client'},rounds:{'legacy-old-round':{id:'legacy-old-round',phase:'PLAYING',bet:300,games:{cookie:{bet:300,win:0}}}}},
  [idle.player.id]:{playerId:idle.player.id,wallet:{credit:1000,revision:3,source:'client'},rounds:{}},
  [migrated.player.id]:{playerId:migrated.player.id,wallet:{credit:765432,revision:23,source:'client',initializationVersion:228},rounds:{}}
 }},'public-01':{id:'public-01',players:{[poor.player.id]:{playerId:poor.player.id,wallet:{credit:20000,revision:9,source:'client',initializationVersion:228},rounds:{}}}}}};
 await fs.writeFile(path.join(dataDir,'payout-control-v3.json'),JSON.stringify(payoutSeed));
 await start();

 const oldIdle=await state(idle,'legacy');assert.equal(oldIdle.payoutControlV3.wallet.credit,1000000);assert.equal(oldIdle.payoutControlV3.wallet.revision,4);
 assert.equal((await state(idle,'legacy')).payoutControlV3.wallet.revision,4,'migration must occur once');
 assert.equal((await state(migrated,'legacy')).payoutControlV3.wallet.credit,765432,'an initialized wallet must never be reset on reload');
 const heldLegacy=await state(legacy,'legacy');assert.equal(heldLegacy.payoutControlV3.wallet.credit,1000);assert.equal(heldLegacy.payoutControlV3.wallet.revision,7);assert.equal(heldLegacy.payoutControlV3.wallet.initializationPending,true);

 const host=await json('/api/session',{body:{displayName:'HOST'}}),player=await json('/api/session',{body:{displayName:'PLAYER'}});
 await connect(host);await connect(player);await connect(poor);await delay(600);
 const initial=await state(player);assert.equal(initial.payoutControlV3.wallet.credit,1000000);assert.equal(initial.payoutControlV3.wallet.revision,1);assert.equal(initial.payoutControlV3.wallet.source,'initial');
 await register(host);const first=(await waitPhase(player,'BETTING')).round;
 const genuineShortfall=await request('/api/machines/{machine}/round/join',{session:poor,body:joinBody(first.id)});
 assert.equal(genuineShortfall.status,409);assert.equal(genuineShortfall.data.error,'insufficient_credit');assert.equal(genuineShortfall.data.payoutControlV3.wallet.credit,20000);assert.equal(genuineShortfall.data.payoutControlV3.wallet.revision,9,'an initialized low balance must not receive a second million');
 let accepted=await join(player,first.id);assert.equal(accepted.round.participant.creditAfterBet,973000);assert.equal(accepted.payoutControlV3.wallet.credit,973000);assert.equal(accepted.payoutControlV3.wallet.revision,2);assert.equal(accepted.payoutControlV3.wallet.source,'bet');assert.equal(accepted.payoutControlV3.wallet.reservedRoundId,first.id);
 for(const token of ['reservation','different-token']){
  accepted=await json('/api/machines/{machine}/round/join',{session:player,body:{...joinBody(first.id,27000,token),creditBefore:973000,creditAfterBet:946000}});
  assert.equal(accepted.round.participant.creditAfterBet,973000,'client-supplied double-debited credit must be ignored');assert.equal(accepted.payoutControlV3.wallet.credit,973000);assert.equal(accepted.payoutControlV3.wallet.revision,2);
 }
 accepted=await join(player,first.id,30000);assert.equal(accepted.payoutControlV3.wallet.credit,970000);assert.equal(accepted.payoutControlV3.wallet.revision,3);
 accepted=await join(player,first.id);assert.equal(accepted.payoutControlV3.wallet.credit,973000);assert.equal(accepted.payoutControlV3.wallet.revision,4);
 for(const body of [{...joinBody(first.id),totalBet:-1},{...joinBody(first.id),creditAfterBet:-1},{...joinBody(first.id),bets:[-27000]}]){
  const rejected=await request('/api/machines/{machine}/round/join',{session:player,body});assert.equal(rejected.status,400);assert.equal(rejected.data.payoutControlV3.wallet.credit,973000);
 }
 const tooMuch=await request('/api/machines/{machine}/round/join',{session:player,body:{...joinBody(first.id,1000001),creditAfterBet:0}});
 assert.equal(tooMuch.status,409);assert.equal(tooMuch.data.error,'insufficient_credit');assert.equal(tooMuch.data.payoutControlV3.wallet.credit,973000);assert.equal(tooMuch.data.payoutControlV3.wallet.revision,4);
 assert.equal((await state(player)).round.participant.totalBet,27000,'a rejected update must preserve the accepted reservation');
 accepted=await join(player,first.id,0);assert.equal(accepted.payoutControlV3.wallet.credit,1000000);assert.equal(accepted.round.participant,null);
 await join(player,first.id);await json('/api/machines/{machine}/round/leave',{session:player,body:{roundId:first.id}});
 assert.equal((await state(player)).payoutControlV3.wallet.credit,1000000,'BET-window cancellation must release its reservation');
 accepted=await join(player,first.id);const reservedRevision=accepted.payoutControlV3.wallet.revision;

 // Persisted reservation identity, rather than a client process's memory,
 // prevents a second charge after the server process itself is restarted.
 await stop('SIGKILL');await start();await connect(host);await connect(player);await register(host);
 accepted=await join(player,first.id,27000,'after-server-restart');assert.equal(accepted.payoutControlV3.wallet.credit,973000);assert.equal(accepted.payoutControlV3.wallet.revision,reservedRevision);
 await finish(host,first.id);
 const firstSettlement=await settle(player,first.id,5000,'public-01',999999999);assert.equal(firstSettlement.settlement.creditAfter,978000);assert.equal(firstSettlement.payoutControlV3.wallet.credit,978000);assert.equal(firstSettlement.payoutControlV3.wallet.revision,reservedRevision+1);assert.equal(firstSettlement.payoutControlV3.wallet.reservedRoundId,null);
 await stop('SIGKILL');await start();await connect(player);await delay(600);await connect(host);await register(host);
 const duplicate=await settle(player,first.id,999999,'public-01',999999999);assert.equal(duplicate.idempotent,true);assert.equal(duplicate.settlement.creditAfter,978000);assert.equal(duplicate.payoutControlV3.wallet.revision,reservedRevision+1);
 const second=(await waitPhase(player,'BETTING','public-01',first.id)).round;
 accepted=await join(player,second.id);assert.equal(accepted.round.participant.creditAfterBet,951000);assert.equal(accepted.payoutControlV3.wallet.credit,951000);
 await finish(host,second.id);const secondSettlement=await settle(player,second.id,2000);
 assert.equal(secondSettlement.settlement.creditAfter,953000);assert.equal(secondSettlement.payoutControlV3.lifetimeBet,54000);assert.equal(secondSettlement.payoutControlV3.lifetimeWin,7000);
 console.log('v228 wallet: 1,000,000 -> 973,000, idempotent reservation/restart, repricing/refund, insufficient/negative rejection and two WIN cycles passed');

 // An old unfinished round is settled against its old reserved base. Only
 // after it closes does the one-time initialization become available.
 await connect(legacyHost,'legacy');await connect(legacy,'legacy');await delay(600);await register(legacyHost,'legacy');
 await finish(legacyHost,'legacy-old-round','legacy');
 const legacyBet=(await waitPhase(legacy,'BETTING','legacy','legacy-old-round')).round;
 const blocked=await request('/api/machines/{machine}/round/join',{session:legacy,machine:'legacy',body:joinBody(legacyBet.id)});
 assert.equal(blocked.status,409);assert.equal(blocked.data.error,'wallet_migration_pending');assert.equal(blocked.data.payoutControlV3.wallet.credit,1000);
 const closed=await settle(legacy,'legacy-old-round',50,'legacy',750);assert.equal(closed.settlement.creditAfter,1000000);assert.equal(closed.payoutControlV3.wallet.credit,1000000);assert.equal(closed.payoutControlV3.wallet.source,'initial');assert.equal(closed.payoutControlV3.wallet.initializationPending,false);assert.ok(closed.payoutControlV3.wallet.revision>7);
 const migratedJoin=await join(legacy,legacyBet.id,27000,'new-wallet','legacy');assert.equal(migratedJoin.payoutControlV3.wallet.credit,973000);assert.equal(migratedJoin.round.participant.creditAfterBet,973000);
 const saved=JSON.parse(await fs.readFile(path.join(dataDir,'payout-control-v3.json'),'utf8'));
 assert.equal(saved.machines.legacy.players[legacy.player.id].wallet.initializationVersion,228);assert.equal(saved.machines.legacy.players[legacy.player.id].wallet.credit,973000);
 console.log('v228 wallet migration: idle legacy initializes once, live legacy waits for settlement, initialized accounts retain their balance, and migration persists passed');
}finally{await stop();await fs.rm(temporary,{recursive:true,force:true});}

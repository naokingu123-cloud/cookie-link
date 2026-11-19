import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {once} from 'node:events';
import fs from 'node:fs/promises';
import http from 'node:http';
import {createRequire} from 'node:module';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import './download-v255-ledger.mjs';

const ROOT=fileURLToPath(new URL('..',import.meta.url)),temporary=await fs.mkdtemp(path.join(os.tmpdir(),'sweets-download-v255-'));
const dataDir=path.join(temporary,'data'),ADMIN='download-v255-test',machine='public-01',prefix='/api/machines/'+machine+'/download-v255/';
const games=['cookie','choco','candy','gelato','winery','popcorn','jelly','stick','castella','dango'],bets=games.map(()=>100);
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms)),hash=value=>createHash('sha256').update(value).digest('hex');
let child,base,logs='',messages=[],bridgeSequence=0;
const headers=session=>session?{authorization:'Bearer '+session.token,'x-player-id':session.player.id}:{};
async function request(route,{session,body,admin=false}={}){
 const response=await fetch(base+route,{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json',...headers(session),...(admin?{'x-admin-token':ADMIN}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(5000)});
 return {status:response.status,data:await response.json(),headers:response.headers};
}
async function json(route,options){const r=await request(route,options);assert.ok(r.status<400,route+': '+JSON.stringify(r.data));return r.data;}
async function until(fn,label,timeout=8000){const end=Date.now()+timeout;while(Date.now()<end){const value=await fn();if(value)return value;await delay(35);}throw Error(label+' timeout\n'+logs);}
const active=(session,extra='')=>json(prefix+'active'+extra,{session});
const jobStarted=id=>until(()=>messages.find(m=>m.type==='compute'&&m.input.sessionId===id),'compute '+id);
const release=(id,mode='valid')=>child.send({type:'release',sessionId:id,mode});
const prepare=(session,requestId,amounts=bets)=>request(prefix+'prepare',{session,body:{requestId,bets:amounts,gameIds:games}});
const ready=session=>until(async()=>{const value=await active(session,'?metadata=1');return value.session?.status==='ready'?value:null;},'ready session');
async function bridge(method,args){const requestId='bridge-'+(++bridgeSequence);child.send({type:'bridge',requestId,method,args});return until(()=>messages.find(m=>m.type==='bridge-result'&&m.requestId===requestId),'bridge reply');}
async function start(edition='streaming'){
 messages=[];const listener=net.createServer();listener.listen(0,'127.0.0.1');await once(listener,'listening');const port=listener.address().port;await new Promise(resolve=>listener.close(resolve));base='http://127.0.0.1:'+port;
 child=spawn(process.execPath,['fixture-bootstrap.mjs'],{cwd:temporary,env:{...process.env,PORT:String(port),SWEETS_SERVER_EDITION:edition,SWEETS_ADMIN_TOKEN:ADMIN,SWEETS_DATA_DIR:dataDir,SWEETS_DATA_FILE:path.join(dataDir,'db.json')},stdio:['ignore','pipe','pipe','ipc']});
 child.stdout.on('data',chunk=>{logs+=chunk;});child.stderr.on('data',chunk=>{logs+=chunk;});child.on('message',message=>messages.push(message));
 await until(async()=>{if(child.exitCode!==null)throw Error(logs);try{return(await request('/api/health')).status===200;}catch{return false;}},'server startup');
 const health=await json('/api/health');assert.equal(health.serverEdition,edition);assert.equal(health.download.enabled,true);assert.equal(health.download.ready,true);
}
async function stop(signal='SIGTERM'){if(!child)return;const running=child;child=null;const exited=running.exitCode!==null?Promise.resolve():once(running,'exit');running.kill(signal);await exited;}
async function register(name){return json('/api/session',{body:{displayName:name}});}
async function profile(session,name){return json(prefix+'profile',{session,body:{profile:{name,pet:{flavor:'vanilla',top:'none',outfit:'none',accent:'pink'},photo:''}}});}
async function compressed(session){
 return new Promise((resolve,reject)=>{
  http.get(base+prefix+'active',{headers:{...headers(session),'accept-encoding':'gzip'}},res=>{const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('error',reject);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,raw:Buffer.concat(chunks)}));}).on('error',reject);
 });
}

try{
 for(const name of ['server.mjs','server-core.mjs','server-core-loader-v220.mjs','server-thinking-v251.mjs','server-sugar-core-v254.mjs','server-sugar-challenge-v254.mjs','server-download-core-v255.mjs','server-download-ledger-v255.mjs','server-download-v255.mjs','server-startup-sanitize-v217.mjs','server-rtc-preload.mjs','server-payout-preload-v3.mjs','server-stations-v235.mjs','package.json'])await fs.copyFile(path.join(ROOT,name),path.join(temporary,name));
 await fs.mkdir(path.join(temporary,'assets'),{recursive:true});await fs.mkdir(dataDir,{recursive:true});
 for(const name of ['jelly-rules.js','sugar-challenge-rules-v254.js'])await fs.copyFile(path.join(ROOT,'assets',name),path.join(temporary,'assets',name));
 await fs.copyFile(path.join(ROOT,'tests/download-v255-fixture.mjs'),path.join(temporary,'fixture-engine.mjs'));
 const require=createRequire(import.meta.url);await fs.cp(path.dirname(require.resolve('ws/package.json')),path.join(temporary,'node_modules','ws'),{recursive:true});
 // Dependency injection exists ONLY in this test process, outside production
 // HTTP/auth. The ordinary server.mjs, API router and real payout DB run below.
 await fs.writeFile(path.join(temporary,'fixture-bootstrap.mjs'),`import {computedFixtureV255} from './fixture-engine.mjs';
const pending=new Map();let busy=false,completed=0;
globalThis[Symbol.for('sweets-link.download-v255.computer')]={ready:async()=>true,status:()=>({enabled:true,ready:true,busy,completed}),
 async compute(input){if(busy)throw Error('overlapping_compute');busy=true;try{const wait=new Promise(resolve=>pending.set(input.sessionId,resolve));process.send({type:'compute',input});const mode=await wait;pending.delete(input.sessionId);if(mode==='abort')throw Error('test shutdown');const output=computedFixtureV255(input);if(mode==='invalid')output.numbers[1]=output.numbers[0];completed++;return output;}finally{busy=false;}},
 async close(){for(const resolve of pending.values())resolve('abort');pending.clear();}
};
process.on('message',message=>{if(message.type==='release')pending.get(message.sessionId)?.(message.mode);if(message.type==='bridge'){try{const wallet=globalThis[Symbol.for('sweets-link.payout-v3.wallet')];const value=wallet[message.method](...message.args);process.send({type:'bridge-result',requestId:message.requestId,value});}catch(error){process.send({type:'bridge-result',requestId:message.requestId,error:error.message,status:error.status});}}});
await import('./server.mjs');
`);
 await start();
 const alice=await register('ALICE'),bob=await register('BOB');
 const empty=await json(prefix+'profile',{session:alice});assert.equal(empty.profileReady,false);assert.equal(empty.wallet.credit,1000000);assert.equal(empty.session,null);
 assert.equal((await prepare(alice,'request-alice-profile')).data.error,'download_profile_required');
 assert.equal((await request(prefix+'profile')).status,401);assert.equal((await request(prefix+'profile',{session:{...alice,token:'forged'}})).status,401);
 const savedProfile=await profile(alice,'A\u202eLICE');assert.equal(savedProfile.profileReady,true);assert.equal(savedProfile.profile.name,'ALICE');await profile(bob,'BOB');
 assert.equal((await request(prefix+'profile',{session:alice,body:{profile:{name:'HACK'},wallet:{credit:999999999}}})).data.error,'download_client_result_forbidden');
 for(const key of ['seed','credit','totalWin','wallet','previousState','finalState','sugarState','games']){
  const r=await request(prefix+'prepare',{session:alice,body:{requestId:'request-forged-'+key,bets,[key]:key==='wallet'?{credit:999999999}:999999}});assert.equal(r.status,400);assert.equal(r.data.error,'download_client_result_forbidden');
 }
 for(const amounts of [[],bets.map(()=>0),bets.map(()=>-1),[1000001,...bets.slice(1)]])assert.ok((await prepare(alice,'request-invalid-bets',amounts)).status>=400);
 const accepted=await prepare(alice,'request-alice-000001');assert.equal(accepted.status,202);const aid=accepted.data.session.id;
 assert.equal(accepted.data.wallet.credit,1000000);assert.equal(accepted.data.session.status,'preparing');assert.equal(accepted.data.session.totalBet,1000);
 const firstInput=(await jobStarted(aid)).input;assert.equal(firstInput.previousState,null);assert.equal(firstInput.creditBefore,1000000);
 const duplicates=await Promise.all([prepare(alice,'request-alice-000001'),prepare(alice,'request-alice-another')]);assert.ok(duplicates.every(r=>r.data.session.id===aid&&r.data.session.seed===firstInput.seed));
 assert.equal((await prepare(alice,'request-alice-000001',bets.map(n=>n+1))).data.error,'download_request_conflict');
 assert.equal((await request(prefix+'active?sessionId='+aid,{session:bob})).status,404);
 for(const action of ['join','settle','checkpoint','leave']){
  const r=await request('/api/machines/'+machine+'/round/'+action,{session:alice,body:{roundId:aid,totalBet:100,totalWin:99999999,state:{credit:99999999}}});assert.equal(r.status,409);assert.equal(r.data.error,'download_session_active');
 }
 for(const method of ['reserve','settle']){
  const blocked=await bridge(method,[machine,alice.player.id,{id:'streaming-probe',participants:{}},{totalBet:100,bets:[100],totalWin:99999999}]);assert.equal(blocked.error,'download_session_active');
 }
 const noRefund=await bridge('operatorCancel',[machine,{id:'streaming-probe',participants:{[alice.player.id]:{totalBet:100}}},'probe-cancel']);assert.equal(noRefund.error,'download_session_active');
 const baccepted=await prepare(bob,'request-bob-0000001',games.map(()=>20)),bid=baccepted.data.session.id;assert.equal(baccepted.status,202);
 assert.equal(messages.filter(m=>m.type==='compute').length,1,'different player jobs queue behind the one headless computer');
 assert.equal((await json('/api/health')).download.activeJobs,2);
 assert.equal((await request('/api/admin/machines/'+machine+'/download-v255/state')).status,403);
 const summary=await json('/api/admin/machines/'+machine+'/download-v255/state',{admin:true});assert.equal(summary.players.length,2);assert.equal(summary.players.find(p=>p.playerId===alice.player.id).session.id,aid);

 // Kill between persisted BET lock and computing. Add an old authenticated
 // worker receipt to the private fixture DB to probe that monetary path too.
 await stop('SIGKILL');
 const walletFile=path.join(dataDir,'payout-control-v3.json'),disk=JSON.parse(await fs.readFile(walletFile,'utf8'));
 assert.deepEqual(disk.machines[machine].players[alice.player.id].downloadV255.sessions[aid].input,firstInput);
 disk.machines[machine].players[alice.player.id].rounds['old-worker-probe']={id:'old-worker-probe',bet:0,phase:'COMPLETE',work:{token:'private-test-worker-token',status:'running'},games:{}};
 await fs.writeFile(walletFile,JSON.stringify(disk));await start('download');
 assert.deepEqual((await jobStarted(aid)).input,firstInput,'restart must not sample another seed, rate, bank, profile or initial board');
 const offline=await request('/api/admin/machines/'+machine+'/payout-v3/offline-work/complete',{admin:true,body:{playerId:alice.player.id,roundId:'old-worker-probe',token:'private-test-worker-token',totalWin:99999999,games:[]}});
 assert.equal(offline.status,409);assert.equal(offline.data.error,'download_session_active');
 assert.equal((await active(alice,'?metadata=1')).wallet.credit,1000000);
 release(aid);const settledA=await ready(alice);assert.equal(settledA.wallet.credit,1004500);assert.equal(settledA.stats.win,5500);assert.equal(settledA.stats.rounds,1);assert.equal(settledA.sugarState.bank.length,5);
 await jobStarted(bid);assert.equal(messages.filter(m=>m.type==='compute').length,2);
 const zipped=await compressed(alice);assert.equal(zipped.status,200);assert.equal(zipped.headers['content-encoding'],'gzip');assert.equal(zipped.headers['cache-control'],'no-store');
 const downloaded=JSON.parse(gunzipSync(zipped.raw));assert.equal(downloaded.package.sessionId,aid);assert.equal(downloaded.package.totalWin,5500);assert.equal(downloaded.package.finalState.credit,1004500);assert.equal(downloaded.package.playback.checkpoints.length,9);
 assert.equal(zipped.raw.length<gunzipSync(zipped.raw).length,true);
 const persisted=JSON.parse(await fs.readFile(walletFile,'utf8')),meta=persisted.machines[machine].players[alice.player.id].downloadV255.sessions[aid].package;
 const packageFile=path.join(dataDir,'download-v255',meta.file),packageBytes=await fs.readFile(packageFile);assert.equal(hash(packageBytes),downloaded.session.package.sha256);assert.equal(packageBytes.length,downloaded.session.package.bytes);
 const forbiddenStatic=await request('/data/download-v255/'+meta.file);assert.equal(forbiddenStatic.status,404);
 const onceWallet=downloaded.wallet;
 await json(prefix+'progress',{session:alice,body:{sessionId:aid,seq:7,ballIndex:3,playbackMs:3200}});
 await json(prefix+'progress',{session:alice,body:{sessionId:aid,seq:6,ballIndex:2,playbackMs:2000}});
 const progressing=await active(alice,'?metadata=1');assert.deepEqual(progressing.session.progress,{seq:7,ballIndex:3,playbackMs:3200});assert.deepEqual(progressing.wallet,onceWallet);
 assert.equal((await request(prefix+'complete',{session:alice,body:{sessionId:aid,totalWin:99999999}})).status,400);
 const ack=await json(prefix+'complete',{session:alice,body:{sessionId:aid}}),repeatAck=await json(prefix+'complete',{session:alice,body:{sessionId:aid}});assert.deepEqual(repeatAck.wallet,onceWallet);assert.equal(repeatAck.revision,ack.revision);
 const prohibitedReplay=await bridge('settle',[machine,alice.player.id,{id:aid,participants:{}},{totalWin:99999999}]);assert.equal(prohibitedReplay.error,'download_session_result_forbidden');
 const second=await prepare(alice,'request-alice-000002'),secondId=second.data.session.id;assert.notEqual(secondId,aid);assert.equal(second.data.wallet.credit,1004500);assert.equal(second.data.sugarState.current.roundId,secondId);
 const dependentRefund=await bridge('operatorCancel',[machine,{id:aid,participants:{}},'probe-dependent-sugar-cancel']);assert.equal(dependentRefund.error,'download_session_active','a non-bettor Sugar dependency must remain locked too');
 const unrelatedRefund=await bridge('operatorCancel',[machine,{id:'unrelated-empty-round',participants:{}},'probe-unrelated-cancel']);assert.equal(unrelatedRefund.error,undefined,'unrelated operator actions are not locked');
 release(bid);assert.equal((await ready(bob)).wallet.credit,1000900);
 const carryInput=(await jobStarted(secondId)).input;assert.equal(carryInput.previousState.trustedRounds,1);assert.equal(carryInput.previousState.credit,1004500);assert.equal(carryInput.sixDropCarry.bankUnits,1234);assert.equal(carryInput.sugarState.bank.length,0);
 await profile(alice,'ALICE NEW');assert.equal(carryInput.profile.name,'ALICE','a profile edit cannot mutate the frozen round input');
 release(secondId);const secondReady=await ready(alice);assert.equal(secondReady.wallet.credit,1004500-1000+5500+secondReady.session.sugarWin);assert.equal(secondReady.stats.rounds,2);assert.equal(secondReady.stats.bet,2000);assert.equal(secondReady.stats.win,11000+secondReady.stats.sugarWin);
 const secondPackage=await active(alice);assert.equal(secondPackage.package.finalState.trustedRounds,2);assert.deepEqual(secondPackage.package.finalState.sugarV254,secondReady.sugarState);
 await json(prefix+'progress',{session:alice,body:{sessionId:secondId,seq:3,ballIndex:5,playbackMs:5000}});
 const trustedAfterSecond=secondReady.wallet;await stop('SIGKILL');await start();
 const resumed=await active(alice);assert.equal(resumed.session.id,secondId);assert.deepEqual(resumed.wallet,trustedAfterSecond);assert.equal(resumed.session.progress.ballIndex,5);assert.equal(resumed.session.progress.playbackMs,5000);assert.equal(resumed.profile.name,'ALICE NEW');assert.equal(messages.filter(m=>m.type==='compute').length,0,'ready recordings must be read, never recalculated after restart');
 await json(prefix+'complete',{session:alice,body:{sessionId:secondId}});const oldReceipt=await prepare(alice,'request-alice-000001');assert.equal(oldReceipt.data.session.id,aid);assert.deepEqual(oldReceipt.data.wallet,trustedAfterSecond);

 const carol=await register('CAROL');await profile(carol,'CAROL');const retry=await prepare(carol,'request-carol-000001'),cid=retry.data.session.id;
 const retryInput=(await jobStarted(cid)).input;release(cid,'invalid');
 const failed=await until(async()=>{const value=await active(carol,'?metadata=1');return value.session?.status==='failed'?value:null;},'computed-contract failure');
 assert.equal(failed.wallet.credit,1000000);assert.match(failed.session.error,/download_invalid_computed_numbers/);
 assert.equal((await request('/api/machines/'+machine+'/round/settle',{session:carol,body:{roundId:'fake',totalWin:1}})).data.error,'download_session_active');
 const beforeCount=messages.filter(m=>m.type==='compute'&&m.input.sessionId===cid).length;const retried=await prepare(carol,'request-carol-000001');assert.equal(retried.data.session.id,cid);
 const retriedInput=await until(()=>messages.filter(m=>m.type==='compute'&&m.input.sessionId===cid)[beforeCount]?.input,'same-seed retry');assert.deepEqual(retriedInput,retryInput);release(cid);await ready(carol);
 const corruptionDb=JSON.parse(await fs.readFile(walletFile,'utf8')),corruptionPath=path.join(dataDir,'download-v255',corruptionDb.machines[machine].players[carol.player.id].downloadV255.sessions[cid].package.file),original=await fs.readFile(corruptionPath);
 await fs.writeFile(corruptionPath,Buffer.concat([original,Buffer.from(' ')]));const corrupt=await request(prefix+'active',{session:carol});assert.equal(corrupt.status,503);assert.equal(corrupt.data.error,'download_package_integrity_error');await fs.writeFile(corruptionPath,original);
 assert.equal((await active(carol)).wallet.credit,1004500);await json(prefix+'complete',{session:carol,body:{sessionId:cid}});
 const stream=await register('STREAM');await profile(stream,'STREAM');const reserve=await bridge('reserve',[machine,stream.player.id,{id:'pending-stream',participants:{}},{totalBet:100,bets:[100]}]);assert.equal(reserve.value.creditAfterBet,999900);
 assert.equal((await prepare(stream,'request-stream-00001')).data.error,'streaming_round_unsettled');assert.equal((await active(stream,'?metadata=1')).wallet.credit,999900);
 console.log('Download v255 HTTP: real auth/profile, one queued job/player, durable crash recovery, all wallet locks, gzip/private integrity, exactly-once payout, resume/ACK and same-seed retry passed');
}finally{await stop();await fs.rm(temporary,{recursive:true,force:true});}

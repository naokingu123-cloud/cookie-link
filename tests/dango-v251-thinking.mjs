import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import http from 'node:http';
import vm from 'node:vm';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {WebSocket} from 'ws';
import {createThinkingServiceV251,isStaleCheckpointV251} from '../server-thinking-v251.mjs';

const root=new URL('..',import.meta.url).pathname;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const flush=async()=>{for(let i=0;i<15;i++)await Promise.resolve();};
const quiet={info(){},warn(){},error(){}};
const [thinkingSource,coreSource,v221,v224,guest,appSource]=await Promise.all([
 'assets/dango-thinking-v251.js','assets/shared-machine-core-v196.js',
 'assets/shared-core-patch-v221.js','assets/shared-core-patch-v224.js',
 'assets/guest-entry-v237.js','optimized/app-01.js'
].map(file=>fs.readFile(path.join(root,file),'utf8')));

// An accepted fifth ball, rather than a client clock or a launch, owns the
// single immutable placement deadline. Recovery keeps that same deadline.
let now=100000,saves=0;const events=[];
const service=createThinkingServiceV251({now:()=>now,scheduleSave:()=>saves++,broadcast:(_id,event)=>events.push(event),publicRound:r=>({...r})});
const participant={totalBet:100};
service.noteParticipant(participant,{payoutV3Bet:{games:[{id:'cookie',bet:100},{id:'dango',bet:0}]}});
const unit={id:'unit',phase:'PLAYING',participants:{player:participant},balls:[]},machine={id:'public-01',revision:0};
service.startRound(unit);assert.equal(unit.thinkingEnabled,false);
service.noteParticipant(participant,{payoutV3Bet:{games:[{id:'dango',bet:100}]}});
service.startRound(unit);assert.equal(unit.thinkingEnabled,true);assert.equal(unit.thinkingDurationMs,15000);
for(let i=1;i<=5;i++){const ball={index:i,number:i,landedAt:now};unit.balls.push(ball);service.onBall(unit,ball);service.afterBroadcast(machine,unit,ball);}
assert.equal(unit.thinkingClosesAt,115000);assert.equal(service.active(unit),true);
now+=1000;service.onBall(unit,{index:5,landedAt:now});assert.equal(unit.thinkingClosesAt,115000,'duplicate fifth result cannot restart thinking');
const recovered=service.normalize(JSON.parse(JSON.stringify(unit)));assert.equal(recovered.thinkingClosesAt,115000);
const oldShape={...recovered,thinkingClosesAt:0,thinkingStartedAt:0};service.normalize(oldShape);assert.equal(oldShape.thinkingClosesAt,115000,'reconstruction uses persisted fifth-ball landing time');
assert.equal(service.tick(machine,unit),true);now=115000;
assert.equal(service.tick(machine,unit),false);assert.equal(service.tick(machine,unit),false);
assert.equal(events.filter(event=>event.type==='thinking_started').length,1);
assert.equal(events.filter(event=>event.type==='thinking_complete').length,1);assert.equal(saves,1);
const cancelled={...unit,id:'next',phase:'BETTING',balls:[]};service.startRound(cancelled);assert.equal(cancelled.thinkingClosesAt,0);

// Apply the real patch chain so a changed upstream anchor fails this test.
const patchContext={window:{},console:quiet,setTimeout:()=>1,clearTimeout(){}};
vm.createContext(patchContext);
for(const source of [v221,v224,guest,thinkingSource])vm.runInContext(source,patchContext);
const patched=patchContext.window.SweetsDangoThinkingV251.patch(
 patchContext.window.SweetsGuestEntryV237.patch(patchContext.window.SweetsSharedCorePatchV224.patch(coreSource)));
new vm.Script(patched);
assert.ok(patched.includes('if(item.index===6)await window.SweetsDangoThinkingV251?.beforeSix?.'));
const clockStart=patched.indexOf('let lastCheckpointSavedAtV251=0;'),clockEnd=patched.indexOf('\nfunction restore(a,state){',clockStart);
assert.ok(clockStart>=0&&clockEnd>clockStart);
let snapshotNow=123456;
const clockContext={Date:class extends Date{static now(){return snapshotNow;}},clone:value=>value===undefined?undefined:JSON.parse(JSON.stringify(value)),engineSnapshot:value=>value};
vm.createContext(clockContext);vm.runInContext(patched.slice(clockStart,clockEnd)+'\nglobalThis.makeCheckpoint=checkpoint;',clockContext);
const clockApp={phase:'playing',engines:[]};
const clockOne=clockContext.makeCheckpoint(clockApp),clockTwo=clockContext.makeCheckpoint(clockApp);
assert.equal(clockOne.savedAt,123456);assert.equal(clockTwo.savedAt,123457,'two snapshots in one millisecond retain their creation order');
snapshotNow=100000;assert.equal(clockContext.makeCheckpoint(clockApp).savedAt,123458,'a wall-clock correction cannot reverse checkpoint order');
assert.equal(isStaleCheckpointV251(5,{savedAt:20},5,{savedAt:21}),true);
assert.equal(isStaleCheckpointV251(5,{savedAt:21},5,{savedAt:21}),true,'duplicate timestamps are idempotent');
assert.equal(isStaleCheckpointV251(5,{},5,{savedAt:21}),true);
assert.equal(isStaleCheckpointV251(5,{savedAt:22},5,{savedAt:21}),false);
assert.equal(isStaleCheckpointV251(6,{savedAt:20},5,{savedAt:21}),false,'ball advancement takes priority over a timestamp');
assert.equal(isStaleCheckpointV251(4,{savedAt:22},5,{savedAt:21}),true);

// The launch budget includes real in-flight balls and unacknowledged results.
// Exercise the actual DrawController launch entry, including its retry path.
const gateFunction=thinkingSource.slice(thinkingSource.indexOf('function allowHostLaunchV251(){'),thinkingSource.indexOf('\nfunction patch(source){'));
let gateNow=100000;
const driver={physics:{active:0},draw:{}};
const gateClient={clockOffset:0,round:{id:'gate',phase:'PLAYING',thinkingEnabled:true,thinkingClosesAt:115000,balls:[]}};
const gateContext={client:gateClient,hostRoundId:'gate',hostRunning:true,hostReportsPending:0,rouletteDriver:driver,Date:class extends Date{static now(){return gateNow;}}};
vm.createContext(gateContext);vm.runInContext(gateFunction+'\nglobalThis.allow=allowHostLaunchV251;',gateContext);
const allow=()=>gateContext.allow();
assert.equal(allow(),true);driver.physics.active=5;assert.equal(allow(),false);
gateClient.round.balls=Array.from({length:3},(_,i)=>({index:i+1}));driver.physics.active=1;gateContext.hostReportsPending=1;assert.equal(allow(),false);
gateContext.hostReportsPending=0;assert.equal(allow(),true);
gateClient.round.balls=Array.from({length:5},(_,i)=>({index:i+1}));driver.physics.active=0;assert.equal(allow(),false);
gateNow=115000;assert.equal(allow(),true);driver.physics.active=3;assert.equal(allow(),false);
gateClient.round.thinkingEnabled=false;assert.equal(allow(),true,'non-Dango rounds retain their original launch schedule');
gateClient.round.id='replacement';assert.equal(allow(),false,'stale host attempt cannot launch into a replacement round');
const drawStart=appSource.indexOf('class DrawController{'),drawEnd=appSource.indexOf('\n// Lightweight online timing',drawStart);
assert.ok(drawStart>=0&&drawEnd>drawStart);
const drawContext={localEightAllowed:true,NORMAL_DRAW_GROUPS:[3,2,1,1,1]};vm.createContext(drawContext);
vm.runInContext(appSource.slice(drawStart,drawEnd)+'\nglobalThis.DrawController=DrawController;',drawContext);
let launches=0,open=false;
const physics={settings:{},active:0,time:10,hits:[],reset(){this.active=0;this.hits=[];},launch(){launches++;return {id:launches};}};
const draw=new drawContext.DrawController(physics);draw.canLaunchNormal=()=>open;
draw.start();draw.update();assert.equal(launches,0);
draw.waiting=true;draw.retryDue=1;draw.update();assert.equal(launches,0,'physical fault retry must respect thinking');
open=true;draw.update();assert.equal(launches,1);draw.reset();open=false;assert.equal(draw.launch(),null,'reset retains the server gate');

// Save only after every enabled board has consumed five. The sixth number
// stays hidden until auto-fill and a durable checkpoint acknowledgement.
const checkpointFunction=thinkingSource.slice(thinkingSource.indexOf('function checkpointNowV251(options={}){'),thinkingSource.indexOf('\nfunction allowHostLaunchV251(){'));
const order=[],saveCalls=[];let acknowledge;
const engine={kind:'dango',processed:4,selected:[7],confirmed:false,finishThinkingV251(){order.push('finalize');this.confirmed=true;this.selected.push(11);}};
const app={phase:'playing',token:1,draws:[1,2,3,4,5],engines:[engine],enabled:[true],locked:[100],bets:[100]};
const localSession={roundId:'placement',stopped:false};
const localClient={online:true,clockOffset:0,round:{id:'placement',phase:'PLAYING',thinkingEnabled:true,thinkingClosesAt:Date.now()-1,balls:[1,2,3,4,5]},on(){},save(body){order.push('save');saveCalls.push(body);return new Promise(resolve=>{acknowledge=()=>{order.push('ack');resolve({ok:true,checkpointBall:5});};});}};
const checkpointContext={window:{},app,current:localSession,client:localClient,Date,console:quiet,setTimeout:()=>1,clearTimeout(){},wait:()=>sleep(2),checkpoint:()=>({draws:[...app.draws],selected:[...engine.selected],confirmed:engine.confirmed})};
vm.createContext(checkpointContext);vm.runInContext(checkpointFunction+'\nwindow.SweetsSharedMachine={client,active:current,checkpointNowV251};\n'+thinkingSource,checkpointContext);
let deliveredSix=false;
const barrier=checkpointContext.window.SweetsDangoThinkingV251.beforeSix({roundId:'placement'}).then(()=>{deliveredSix=true;order.push('six');});
await sleep(10);assert.equal(saveCalls.length,0,'do not snapshot a partially processed fifth ball');assert.equal(engine.confirmed,false);
engine.processed=5;await sleep(10);assert.equal(saveCalls.length,1);assert.equal(deliveredSix,false);
assert.deepEqual(saveCalls[0].state.selected,[7,11]);assert.equal(saveCalls[0].dangoPlacementV251,true);
assert.equal(saveCalls[0].state.confirmed,true);acknowledge();await barrier;
assert.deepEqual(order,['finalize','save','ack','six']);
const pendingSave=checkpointContext.window.SweetsDangoThinkingV251.checkpointPlacement();await flush();
assert.equal(saveCalls.length,2);assert.deepEqual(saveCalls[1].state.selected,[7,11],'pending selection checkpoints do not finalize again');
acknowledge();await pendingSave;
checkpointContext.current={roundId:'replacement',stopped:false};
const stale=await checkpointContext.window.SweetsSharedMachine.checkpointNowV251({roundId:'placement',ballIndex:5});assert.equal(stale.skipped,true);

// Exercise the production HTTP/WS server, persistence and disabled fallback.
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'dango-thinking-v251-')),dbFile=path.join(temp,'core.json'),admin='thinking-test-v251';
let child,base,port,logs='';const sockets=[];
async function start(){
 const socket=net.createServer();socket.listen(0,'127.0.0.1');await once(socket,'listening');port=socket.address().port;await new Promise(resolve=>socket.close(resolve));base='http://127.0.0.1:'+port;
 child=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,PORT:String(port),SWEETS_DATA_FILE:dbFile,SWEETS_DATA_DIR:temp,SWEETS_ADMIN_TOKEN:admin,SWEETS_PLAYER_STABLE_MS:'500',SWEETS_BET_DURATION_MS:'1400',SWEETS_ROUND_START_DELAY_MS:'300',SWEETS_RESULT_GRACE_MS:'5000',SWEETS_DANGO_THINKING_MS:'3000',SWEETS_HOST_FALLBACK_DELAY_MS:'300'},stdio:['ignore','pipe','pipe']});
 child.stdout.on('data',value=>logs+=value);child.stderr.on('data',value=>logs+=value);
 for(let i=0;i<120;i++){if(child.exitCode!==null)throw Error(logs);try{if((await fetch(base+'/api/health')).ok)return;}catch{}await sleep(25);}throw Error('server startup '+logs);
}
async function stop(){for(const ws of sockets.splice(0))ws.terminate();if(child&&child.exitCode===null){const done=once(child,'exit');child.kill('SIGKILL');await done;}child=null;}
async function call(route,{session,body,expect=200,token=false}={}){
 const response=await fetch(base+route+(token?(route.includes('?')?'&':'?')+'adminToken='+admin:''),{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(session?{'X-Player-Id':session.player.id,Authorization:'Bearer '+session.token}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(5000)});
 const data=await response.json();assert.equal(response.status,expect,route+' '+JSON.stringify(data));return data;
}
function delayedCheckpoint(session,body){
 const bytes=Buffer.from(JSON.stringify(body)),split=Math.floor(bytes.length/2);let request;
 const response=new Promise((resolve,reject)=>{
  request=http.request(base+'/api/machines/public-01/round/checkpoint',{method:'POST',headers:{'Content-Type':'application/json','Content-Length':bytes.length,'X-Player-Id':session.player.id,Authorization:'Bearer '+session.token}},res=>{
   const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>{try{assert.equal(res.statusCode,200);resolve(JSON.parse(Buffer.concat(chunks).toString()));}catch(error){reject(error);}});res.on('error',reject);
  });request.on('error',reject);request.write(bytes.subarray(0,split));
 });
 return {response,finish:()=>request.end(bytes.subarray(split))};
}
const state=session=>call('/api/machines/public-01/state',{session});
const session=displayName=>call('/api/session',{body:{displayName},expect:201});
async function connect(session){
 const ws=new WebSocket('ws://127.0.0.1:'+port+'/ws?machineId=public-01&playerId='+session.player.id+'&token='+session.token),messages=[];
 ws.on('message',value=>{try{messages.push(JSON.parse(String(value)));}catch{}});ws.on('error',()=>{});sockets.push(ws);await once(ws,'open');return {ws,messages};
}
async function until(fn,label){for(let i=0;i<180;i++){if(child.exitCode!==null)throw Error(logs);const value=await fn();if(value)return value;await sleep(30);}throw Error(label+' '+logs);}
const register=host=>call('/api/admin/machines/public-01/host/register',{session:host,body:{},token:true});
const force=(roundId,requestId)=>call('/api/admin/machines/public-01/bet-now',{body:{roundId,requestId},token:true});
const join=(player,id,game)=>call('/api/machines/public-01/round/join',{session:player,body:{roundId:id,clientRoundToken:'thinking-'+id,bets:[100],locked:[100],enabled:[true],totalBet:100,payoutV3Bet:{version:3,games:[{id:game,bet:100}]}}});
const playing=(host,id)=>until(async()=>{const value=await state(host);return value.round?.id===id&&value.round.phase==='PLAYING'?value.round:null;},'PLAYING');
async function ball(host,round,index,expect=200,number=index){await sleep(Math.max(0,round.drawStartsAt-Date.now()+2));return call('/api/machines/public-01/round/ball',{session:host,body:{roundId:round.id,ballIndex:index,number,eventId:round.id+':'+index},expect});}
try{
 await start();const host=await session('SERVER ROULETTE'),player=await session('DANGO PLAYER');const hw=await connect(host),pw=await connect(player);await sleep(550);await register(host);
 let round=(await state(player)).round;await join(player,round.id,'dango');round=await playing(host,round.id);
 assert.equal(round.thinkingEnabled,true);assert.equal(round.thinkingDurationMs,3000);assert.equal(round.thinkingClosesAt,null);
 for(let i=1;i<5;i++)await ball(host,round,i);
 const fifth=await ball(host,round,5),deadline=fifth.round.thinkingClosesAt;
 assert.equal(deadline-fifth.ball.landedAt,3000);assert.equal(fifth.round.balls.length,5);
 const rejection=await ball(host,round,6,409);assert.equal(rejection.error,'thinking_active');assert.ok(rejection.retryAfterMs>0);
 const duplicate=await ball(host,round,5);assert.equal(duplicate.idempotent,true);
 const conflict=await ball(host,round,5,409,15);assert.equal(conflict.error,'ball_conflict');
 const currentRound=(await state(player)).round;assert.equal(currentRound.thinkingClosesAt,deadline);assert.equal(currentRound.balls.length,5);
 await until(()=>pw.messages.some(message=>message.type==='thinking_started'&&message.roundId===round.id),'thinking notification');
 assert.equal(pw.messages.filter(message=>message.type==='thinking_started'&&message.roundId===round.id).length,1);
 const fifthMessage=pw.messages.find(message=>message.type==='ball_result'&&message.ball?.index===5);assert.equal(fifthMessage.round.thinkingClosesAt,deadline);
 const placement={savedAt:Date.now(),draws:[1,2,3,4,5],engines:[{kind:'dango',state:{free:[7,11],freeConfirmed:true}}],payoutV3:{version:3,ball:5,complete:true,phase:'PLAYING',credit:999900,roundBet:100,roundWin:12,games:[{id:'dango',bet:100,win:12,appliedRate:90}]}};
 const stalePlacement=JSON.parse(JSON.stringify(placement));stalePlacement.savedAt--;stalePlacement.engines[0].state={free:[],freeConfirmed:false};stalePlacement.payoutV3.roundWin=0;stalePlacement.payoutV3.games[0].win=0;
 // Start an older automatic request first, but leave its body in flight. A
 // timeout/proxy delay can allow the newer manual save to arrive and ACK first.
 const lateAutomatic=delayedCheckpoint(player,{roundId:round.id,ballIndex:5,state:stalePlacement});
 await call('/api/machines/public-01/round/checkpoint',{session:player,body:{roundId:round.id,ballIndex:5,state:placement,dangoPlacementV251:true}});
 const persisted=JSON.parse(await fs.readFile(dbFile,'utf8')).machines['public-01'].round;
 assert.equal(persisted.thinkingClosesAt,deadline);assert.deepEqual(persisted.participants[player.player.id].checkpoint,placement,'checkpoint ACK follows durable save');
 lateAutomatic.finish();const ignored=await lateAutomatic.response;
 assert.equal(ignored.checkpointIgnoredV251,true,'a delayed old automatic save cannot undo manual FREE placement');
 assert.equal(ignored.payoutControlV3.currentRoundWin,12,'old telemetry cannot roll the displayed WIN back');
 assert.deepEqual((await state(player)).round.participant.checkpoint,placement);
 const duplicatePlacement=await call('/api/machines/public-01/round/checkpoint',{session:player,body:{roundId:round.id,ballIndex:5,state:placement,dangoPlacementV251:true}});
 assert.equal(duplicatePlacement.checkpointIgnoredV251,true);
 const savedPayout=await until(async()=>{
  try{const record=JSON.parse(await fs.readFile(path.join(temp,'payout-control-v3.json'),'utf8')).machines['public-01'].players[player.player.id].rounds[round.id];return record.stableState?.savedAt===placement.savedAt?record:null;}catch{return null;}
 },'payout stable checkpoint');
 assert.deepEqual(savedPayout.stableState,placement);assert.equal(savedPayout.win,12);
 // Host fallback requests remain disabled both during and after the window.
 hw.ws.send(JSON.stringify({type:'host_fallback_request',roundId:round.id}));await sleep(60);
 assert.equal((await state(player)).round.drawSource,'physical');
 await stop();await start();await connect(host);const resumed=await connect(player);await register(host);
 const restored=(await state(player)).round;assert.equal(restored.id,round.id);assert.equal(restored.thinkingClosesAt,deadline);assert.deepEqual(restored.balls.map(ball=>ball.number),[1,2,3,4,5]);
 assert.deepEqual(restored.participant.checkpoint,placement);
 if(Date.now()<deadline-100){const early=await ball(host,restored,6,409);assert.equal(early.error,'thinking_active');}
 await sleep(Math.max(0,deadline-Date.now()+50));
 const afterWindow=(await state(player)).round;assert.equal(afterWindow.balls.length,5,'expiry does not generate a substitute sixth number');
 await ball(host,restored,6);await ball(host,restored,7);await ball(host,restored,8);
 assert.deepEqual((await state(player)).round.balls.map(ball=>ball.number),[1,2,3,4,5,6,7,8]);
 await until(()=>resumed.messages.some(message=>message.type==='thinking_complete'&&message.roundId===round.id),'thinking completion');
 assert.equal(resumed.messages.filter(message=>message.type==='thinking_complete'&&message.roundId===round.id).length,1);
 // Ordinary nine-game BETs have no new delay; cancellation starts a fresh gate.
 const next=await force(round.id,'ordinary-no-thinking');await sleep(550);await join(player,next.roundId,'cookie');round=await playing(host,next.roundId);
 assert.equal(round.thinkingEnabled,false);for(let i=1;i<=6;i++)await ball(host,round,i);assert.equal((await state(player)).round.balls.length,6);
 const fresh=await force(round.id,'cancel-clears-thinking');await join(player,fresh.roundId,'dango');round=await playing(host,fresh.roundId);
 for(let i=1;i<=5;i++)await ball(host,round,i);assert.ok((await state(player)).round.thinkingClosesAt>Date.now());
 const replacement=await force(round.id,'cancel-active-thinking');const replacementState=(await state(player)).round;
 assert.equal(replacementState.id,replacement.roundId);assert.equal(replacementState.thinkingClosesAt,null);assert.equal(replacementState.thinkingEnabled,false);
 const stale=await ball(host,round,6,409);assert.equal(stale.error,'round_mismatch');
 console.log('DANGO_V251_THINKING_PASS',JSON.stringify({serverDeadline:true,defaultSeconds:15,earlySixRejected:true,fifthIdempotent:true,physicalLaunchBudget:true,retryGate:true,durablePlacement:true,monotonicSnapshots:true,delayedOldSnapshotIgnored:true,payoutCheckpointPreserved:true,sixthCheckpointBarrier:true,restartSameDeadline:true,noSyntheticFallback:true,noDangoUnchanged:true,cancelResets:true}));
}finally{await stop();await fs.rm(temp,{recursive:true,force:true});}

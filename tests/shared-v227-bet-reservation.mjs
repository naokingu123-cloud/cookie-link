import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import {WebSocket} from 'ws';

// Use real server eligibility, HTTP responses, public WebSocket notifications,
// Client.accept/stale-state checks, Arcade.start, and the lifecycle controller.
// Rendering and video are outside this test; the video remains fresh throughout.
async function runScenario(scenario){
const ROOT=fileURLToPath(new URL('..',import.meta.url));
const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'sweets-v227-bet-'));
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const timers=new Set(),sockets=[],events=[],errors=[];
const ADMIN='isolated-v227-bet';
let child,base,port,logs='',disposed=false;

function later(callback,ms){
 if(disposed)return 0;
 const id=setTimeout(()=>{timers.delete(id);callback();},ms);timers.add(id);return id;
}
function cancel(id){clearTimeout(id);timers.delete(id);}
async function request(route,{session,body}={}){
 const response=await fetch(base+route,{
  method:body===undefined?'GET':'POST',
  headers:{'content-type':'application/json',...(session?{authorization:'Bearer '+session.token,'x-player-id':session.player.id}:{})},
  body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(5000)
 });
 return {status:response.status,data:await response.json()};
}
async function json(route,options){
 const result=await request(route,options);assert.ok(result.status<400,route+': '+JSON.stringify(result));return result.data;
}
async function connect(session){
 const socket=new WebSocket(`ws://127.0.0.1:${port}/ws?machineId=public-01&playerId=${session.player.id}&token=${session.token}`);
 socket.on('error',()=>{});sockets.push(socket);await once(socket,'open');return socket;
}
async function until(predicate,label,timeout=11000){
 const deadline=Date.now()+timeout;
 while(Date.now()<deadline){const result=await predicate();if(result)return result;await delay(50);}
 throw new Error(label+' timed out\n'+JSON.stringify(events.slice(-12))+'\n'+logs);
}

try{
 for(const name of ['server.mjs','server-core.mjs','server-core-loader-v220.mjs','server-thinking-v251.mjs','server-sugar-core-v254.mjs','server-sugar-challenge-v254.mjs','server-download-core-v255.mjs','server-download-ledger-v255.mjs','server-download-v255.mjs','server-startup-sanitize-v217.mjs','server-rtc-preload.mjs','server-payout-preload-v3.mjs','server-stations-v235.mjs','package.json'])await fs.copyFile(path.join(ROOT,name),path.join(temporary,name));
 await fs.mkdir(path.join(temporary,'assets'),{recursive:true});
 await fs.copyFile(path.join(ROOT,'assets','jelly-rules.js'),path.join(temporary,'assets','jelly-rules.js'));
 await fs.copyFile(path.join(ROOT,'assets','sugar-challenge-rules-v254.js'),path.join(temporary,'assets','sugar-challenge-rules-v254.js'));
 const require=createRequire(import.meta.url);
 await fs.cp(path.dirname(require.resolve('ws/package.json')),path.join(temporary,'node_modules','ws'),{recursive:true});
 const listener=net.createServer();listener.listen(0,'127.0.0.1');await once(listener,'listening');port=listener.address().port;await new Promise(resolve=>listener.close(resolve));base='http://127.0.0.1:'+port;
 child=spawn(process.execPath,['server.mjs'],{
  cwd:temporary,
  env:{...process.env,PORT:String(port),SWEETS_ADMIN_TOKEN:ADMIN,SWEETS_DATA_FILE:path.join(temporary,'data','db.json'),SWEETS_DATA_DIR:path.join(temporary,'data'),SWEETS_PLAYER_STABLE_MS:'500',SWEETS_BET_DURATION_MS:'8000',SWEETS_ROUND_START_DELAY_MS:'300',SWEETS_RESULT_GRACE_MS:'350',SWEETS_CONTINUOUS_PHYSICAL_ROUNDS:'1'},
  stdio:['ignore','pipe','pipe']
 });
 child.stdout.on('data',chunk=>{logs+=chunk;});child.stderr.on('data',chunk=>{logs+=chunk;});
 await until(async()=>{if(child.exitCode!==null)throw new Error(logs);try{return(await request('/api/health')).status===200;}catch{return false;}},'server readiness');
 const host=await json('/api/session',{body:{displayName:'HOST'}}),player=await json('/api/session',{body:{displayName:'PLAYER'}});
 await connect(host);const socket=await connect(player);await delay(600);

 const [core,patch221,patch224,bundle,controller]=await Promise.all([
  'assets/shared-machine-core-v196.js','assets/shared-core-patch-v221.js','assets/shared-core-patch-v224.js','optimized/app-01.js',
  process.env.SWEETS_TEST_CONTROLLER_SOURCE||'assets/shared-client-controller-v224.js'
 ].map(filename=>fs.readFile(path.resolve(ROOT,filename),'utf8')));
 const patchContext={window:{},console};vm.createContext(patchContext);vm.runInContext(patch221,patchContext);vm.runInContext(patch224,patchContext);
 const patched=patchContext.window.SweetsSharedCorePatchV224.patch(core);
 const resultLayer={hidden:true,classList:{remove(){}}},storage=new Map();
 const context={
  window:null,globalThis:null,Date,URLSearchParams,URL,AbortController,WebSocket,location:{search:''},BASE:base,MACHINE:'public-01',SERVER_HOST:false,
  console:{info(){},warn(...args){events.push({kind:'warn',args:args.map(String)});},error(...args){errors.push(args.map(String));}},fetch,
  setTimeout:later,clearTimeout:cancel,queueMicrotask,requestAnimationFrame:callback=>{callback();return 1;},addEventListener(){},
  localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)},
  document:{body:{classList:{add(){},remove(){}}},getElementById:id=>id==='round-result-layer'?resultLayer:null,querySelectorAll:()=>[],querySelector:()=>null},
  getComputedStyle:node=>({display:node.hidden?'none':'block',visibility:node.hidden?'hidden':'visible'}),
  debugForceRainbowSugar:false,RAINBOW_SUGAR_CHANCE:0,LOCAL_EIGHT_DRAW_ALLOWED:false,medalWin:(bet,hundredths)=>bet*hundredths/100,
  stopAutoRound(){},stopResultAuto(){},autoRoundStamp:null,resultAutoToken:0,roundStarting:false,
  countdownText(text,label){events.push({kind:'status',text,label});},scheduleUI(){},renderRoundResult(){},renderGameTabs(){},requestFit(){},
  current:null,pendingStart:null,resumeId:null,recoveryOpen:false,startPermitId:null,
  closeServerGate(){},serverRequired(){},badge(){},rouletteDriver:{setPaused(){}},checkpoint:target=>({phase:target.phase,draws:[...target.draws]}),
  status(text,label){events.push({kind:'core-status',text,label});},wait:delay
 };
 context.window=context;context.globalThis=context;vm.createContext(context);
 const arcadeStart=bundle.indexOf('class Arcade{'),arcadeEnd=bundle.indexOf('// Only the next HIT is simulated.',arcadeStart);
 assert.ok(arcadeStart>=0&&arcadeEnd>arcadeStart);
 vm.runInContext(bundle.slice(arcadeStart,arcadeEnd)+'\nglobalThis.Arcade=Arcade;',context);
 class Engine{
  constructor(){this.kind='cookie';this.processed=0;this.accepted=0;this.queue=[];this.running=false;this.busy=false;this.holdDraws=false;this.totalHundredths=0;}
  reset(){this.processed=0;this.accepted=0;this.queue=[];this.running=false;this.busy=false;}
  start(){this.running=true;}previewDraw(){}enqueueBatch(values){this.processed+=values.length;this.accepted+=values.length;}
 }
 const app=new context.Arcade({initialEngines:[Engine],random:()=>1,sleep:delay,onChange(){}});
 app.bets=[10];app.locked=[10];context.app=app;context.slots=[];
 const clientStart=patched.indexOf('class Client{'),clientEnd=patched.indexOf('\nlet blockedRoundId',clientStart);
 assert.ok(clientStart>=0&&clientEnd>clientStart);
 vm.runInContext(patched.slice(clientStart,clientEnd)+'\nglobalThis.Client=Client;',context);
 const client=Object.assign(Object.create(context.Client.prototype),{
  online:true,ws:socket,ready:Promise.resolve(true),clockOffset:0,playerId:player.player.id,token:player.token,role:'player',round:null,pendingRound:null,
  listeners:new Set(),stateStamp:null,httpRetryAt:0,httpFailures:0,stateRequest:null
 });
 context.client=client;
 const deferredResponses=new WeakSet(),accept=client.accept.bind(client);
 client.accept=message=>{
  const accepted=accept(message);
  if(deferredResponses.has(message))events.push({kind:'delayed-join-accepted',accepted,participant:!!client.round?.participant});
  return accepted;
 };
 const originalJoin=client.join.bind(client);
 client.join=async payload=>{
  events.push({kind:'join-request',roundId:payload.roundId,token:payload.clientRoundToken});
  const response=await originalJoin(payload);
  if(scenario==='lost-ack'){
   // The server accepted this token, but the HTTP response is lost. A later
   // personalized GET must restore the exact reservation before loss cleanup.
   await delay(40);assert.equal(client.round.participant,null);
   events.push({kind:'lost-join-response',roundId:response.round.id});
   throw new TypeError('simulated_join_response_lost');
  }
  // The POST completed, but an independent, newer personalized GET reaches
  // accept() before its delayed response. All snapshots come from the server.
  await delay(40);const newer=await client.getState();assert.ok(newer.serverTime>response.serverTime);
  assert.equal(client.accept(newer),true);await delay(250);
  deferredResponses.add(response);return response;
 };
 const originalSettle=client.settle.bind(client);
 client.settle=payload=>{events.push({kind:'settle',payload});return originalSettle(payload);};
 socket.on('message',raw=>{
  const message=JSON.parse(String(raw)),wireParticipant=!!message.round?.participant;
  const accepted=client.accept(message);
  events.push({kind:'ws',type:message.type,id:message.round?.id,wireParticipant,afterParticipant:!!client.round?.participant,accepted});
 });
 const nativeReset=()=>{context.pendingStart=null;context.current=null;app.__sharedRound=null;};
 const queueStart=patched.indexOf('function queueBall('),queueEnd=patched.indexOf('function serverSettlement()',queueStart);
 assert.ok(queueStart>=0&&queueEnd>queueStart);vm.runInContext(patched.slice(queueStart,queueEnd),context);
 context.rouletteDrawSource={get ready(){return client.online&&client.round?.phase==='PLAYING'&&!!client.round?.participant;},start:callbacks=>context.startShared(callbacks,nativeReset),reset:nativeReset,pause(){}};
 app.drawSource=context.rouletteDrawSource;
 context.SweetsSharedMachine={client,get active(){return context.current;},get pendingStart(){return context.pendingStart;}};
 context.SweetsRouletteClientV224={isFresh:()=>true};
 client.on(message=>{
  if(scenario==='lost-ack'&&message.type==='bet_updated')return;
  if(['betting_started','bet_updated','round_started'].includes(message.type))client.getState().then(state=>client.accept(state)).catch(()=>{});
 });

 // Isolate lost-response handling from initial stabilization: this scenario
 // is already stable before BET opens, as it is after an ordinary first round.
 if(scenario==='lost-ack'){vm.runInContext(controller,context);await delay(4300);}
 await json('/api/admin/machines/public-01/host/register?adminToken='+ADMIN,{session:host,body:{}});
 const first=await client.getState();client.accept(first);
 assert.equal(first.round.phase,'BETTING');assert.equal(first.round.canBet,true);
 // Unlike the old VM fixture, boot while this eligible BET is already open.
 // The controller must acquire stability and reserve it before the deadline.
 if(scenario!=='lost-ack')vm.runInContext(controller,context);

 // A genuinely late observer must remain ineligible for this same BET. The
 // controller fix must not broaden the authoritative server admission rule.
 const late=await json('/api/session',{body:{displayName:'LATE OBSERVER'}});await connect(late);await delay(650);
 const lateState=await json('/api/machines/public-01/state',{session:late});
 assert.equal(lateState.round.id,first.round.id);assert.equal(lateState.round.canBet,false);
 const refused=await request('/api/machines/public-01/round/join',{session:late,body:{roundId:first.round.id,totalBet:10,bets:[10],creditAfterBet:990}});
 assert.equal(refused.status,409);assert.equal(refused.data.error,'wait_next_bet');

 await until(()=>client.round?.phase==='PLAYING','authoritative round start');
 await delay(1000);
 const description=context.SweetsSharedControllerV224.describe();
 if(scenario==='lost-ack')assert.equal(events.filter(event=>event.kind==='lost-join-response').length,1,'the test must lose the accepted POST response');
 assert.equal(events.filter(event=>event.kind==='settle').length,0,'a valid pending reservation must not be classified as an abandoned zero-WIN loss');
 assert.equal(description.joinedRoundId,first.round.id,scenario==='lost-ack'?'a lost POST acknowledgement must be recovered from its exact server token':'an initially blocked but server-eligible BET must be reserved once stable');
 assert.equal(app.phase,'playing','the accepted BET must start instead of returning to NEXT');
 assert.equal(context.current?.roundId,first.round.id,'the actual shared attachment must own this round');
 assert.equal(events.filter(event=>event.kind==='join-request').length,1,'one accepted BET must not be posted twice');
 if(scenario==='lost-ack'){
  assert.equal(client.round.participant.clientRoundToken,events.find(event=>event.kind==='join-request').token,'snapshot recovery must refer to this exact reservation token');
 }else assert.ok(events.some(event=>event.kind==='delayed-join-accepted'&&event.accepted===false&&event.participant),'an older join response must not erase the newer personalized participant');
 const started=events.find(event=>event.kind==='ws'&&event.type==='round_started'&&event.id===first.round.id);
 assert.equal(started.wireParticipant,false,'the fixture must consume the server publicRound(null) notification');
 assert.equal(started.afterParticipant,true,'Client.accept must preserve the personalized participant across round_started');
 assert.deepEqual(errors,[]);
 console.log('v227 real server BET admission ('+scenario+'): eligible BET, late observer exclusion, POST reconciliation, public WS participant merge, and actual client start passed');
}finally{
 disposed=true;
 for(const id of timers)clearTimeout(id);
 for(const socket of sockets)try{socket.terminate();}catch{}
 if(child){const exited=child.exitCode!==null?Promise.resolve():once(child,'exit');child.kill('SIGTERM');await exited;}
 await fs.rm(temporary,{recursive:true,force:true});
}
}

for(const scenario of process.env.SWEETS_TEST_JOIN_SCENARIO?[process.env.SWEETS_TEST_JOIN_SCENARIO]:['stale-ack','lost-ack'])await runScenario(scenario);

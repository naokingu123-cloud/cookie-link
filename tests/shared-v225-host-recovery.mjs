import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const core=await fs.readFile(process.env.HOST_RECOVERY_CORE||new URL('../assets/shared-machine-core-v196.js',import.meta.url),'utf8');
const v221=await fs.readFile(process.env.HOST_RECOVERY_V221||new URL('../assets/shared-core-patch-v221.js',import.meta.url),'utf8');
const v224=await fs.readFile(new URL('../assets/shared-core-patch-v224.js',import.meta.url),'utf8');
const patchContext={window:{},console};vm.createContext(patchContext);vm.runInContext(v221,patchContext);vm.runInContext(v224,patchContext);
const source=patchContext.window.SweetsSharedCorePatchV224.patch(core);
const classStart=source.indexOf('class Client{'),classEnd=source.indexOf('\nlet blockedRoundId',classStart);
assert.ok(classStart>=0&&classEnd>classStart,'test the actual V221/V224 patched Client');
const clientSource=source.slice(classStart,classEnd)+'\nglobalThis.TestClient=Client;';
const flush=async()=>{for(let i=0;i<45;i++)await Promise.resolve();};

function harness({healthFailures=0,stateFailures=0,registrationFailures=0}={}){
 let now=100000,nextId=0,registered=false;const timers=new Map(),sockets=[],storage=new Map(),calls={health:0,state:0,registration:0};
 const later=(fn,ms=0)=>{const id=++nextId;timers.set(id,{fn,at:now+Math.max(0,Number(ms)||0)});return id;};
 const snapshot=()=>({type:'snapshot',role:registered?'host':'player',serverTime:now,machine:{revision:1,hostConnected:registered},round:null});
 class Socket{
  static OPEN=1;
  constructor(){this.readyState=0;this.closes=0;sockets.push(this);queueMicrotask(()=>{this.readyState=1;this.onopen?.();this.onmessage?.({data:JSON.stringify(snapshot())});});}
  close(){this.closes++;this.readyState=3;this.onclose?.();}send(){}
 }
 const context={
  console:{info(){},warn(){},error(){}},Date:class extends Date{static now(){return now;}},setTimeout:later,clearTimeout:id=>timers.delete(id),AbortController,WebSocket:Socket,URL,
  SERVER_HOST:true,BASE:'https://server.example',DISCOVERY_MODE:false,MACHINE:'public-01',SESSION_KEY:'session',ADMIN_TOKEN:'admin',window:{},badge(){},closeServerGate(){},resolveServerBase:async()=>{},
  read:(key,fallback)=>storage.get(key)||fallback,write:(key,value)=>storage.set(key,value),localStorage:{getItem(){return null;}},crypto:{randomUUID:()=> 'uuid'},wait:ms=>new Promise(resolve=>later(resolve,ms)),
  async fetch(url){
   let data;
   if(url.endsWith('/api/health')){calls.health++;if(healthFailures-->0)throw Error('health_unavailable');data={ok:true};}
   else if(url.endsWith('/api/session'))data={player:{id:'player',displayName:'host'},token:'token'};
   else if(url.includes('/host/register')){calls.registration++;if(registrationFailures-->0)throw Error('registration_unavailable');registered=true;data=snapshot();}
   else {calls.state++;if(stateFailures-->0)throw Error('state_unavailable');data=snapshot();}
   return{ok:true,status:200,json:async()=>data,headers:{get(){return null;}}};
  }
 };
 vm.createContext(context);vm.runInContext(clientSource,context);
 async function advance(ms){
  const end=now+ms;
  for(let steps=0;steps<500;steps++){
   await flush();const next=[...timers].filter(([,v])=>v.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];
   if(!next){now=end;await flush();return;}
   now=next[1].at;timers.delete(next[0]);next[1].fn();
  }
  throw Error('retry timers did not remain bounded');
 }
 return{context,calls,sockets,advance,newClient:()=>new context.TestClient(),forgetHost(){registered=false;}};
}

const stateHarness=harness();
const client=Object.assign(Object.create(stateHarness.context.TestClient.prototype),{online:true,role:'host',round:null,listeners:new Set(),syncReady(){}});
const round=(id,sequence,phase,balls=[])=>({id,sequence,phase,balls});
client.accept({type:'betting_started',serverTime:2000,round:round('round-8',8,'BETTING')});
const oldAccepted=client.accept({type:'snapshot',serverTime:1000,machine:{revision:7,hostConnected:false},round:round('round-7',7,'COMPLETE')});
assert.equal(client.round.id,'round-8','old HTTP rounds must not overwrite newer WS state');assert.equal(oldAccepted,false);
client.accept({type:'round_started',serverTime:3000,round:round('round-9',9,'PLAYING')});
const phaseAccepted=client.accept({type:'snapshot',serverTime:3000,machine:{revision:8},round:round('round-9',9,'BETTING')});
assert.equal(client.round.phase,'PLAYING','same-millisecond snapshots must not move a round back to BETTING');assert.equal(phaseAccepted,false);
client.accept({type:'ball_result',serverTime:3100,roundId:'round-9',ball:{index:1,number:4},phase:'PLAYING'});
assert.equal(client.accept({type:'snapshot',serverTime:3100,machine:{revision:9},round:round('round-9',9,'PLAYING')}),false,'old snapshots must not remove an accepted physical ball');
client.accept({type:'rtc_watch',serverTime:999999});
assert.equal(client.accept({type:'snapshot',serverTime:3200,machine:{revision:10},round:round('round-9',9,'PLAYING',[{index:1,number:4}]),role:'host'}),true,'RTC traffic must not advance the game-state watermark');

const transient=harness({stateFailures:1}),live=transient.newClient();await flush();
assert.equal(await live.ready,true);assert.equal(live.online,true);assert.equal(transient.sockets[0].closes,0,'HTTP failure must keep a healthy result/video socket open');
assert.ok(live.stateRetryTimer);await transient.advance(1100);
assert.equal(live.lastError,'');assert.equal(transient.sockets[0].closes,0);assert.equal(transient.calls.state,2);

const startup=harness({healthFailures:3}),retry=startup.newClient();await startup.advance(2500);
assert.ok(retry.initTimer,'three failed initial attempts must leave an automatic retry scheduled');
await startup.advance(2000);assert.equal(await retry.ready,true);assert.equal(retry.online,true);assert.equal(startup.sockets.length,1);

const registration=harness({registrationFailures:1}),host=registration.newClient();await flush();assert.equal(await host.ready,true);
assert.equal(host.hostRegistered,false);assert.equal(host.role,'player');
host.accept({type:'rtc_watch',serverTime:999999});
assert.equal(host.role,'player','an RTC notification must not invent the host role');
await registration.advance(1100);
assert.equal(registration.calls.registration,2,'failed host registration must retry despite incoming RTC traffic');
assert.equal(host.hostRegistered,true);assert.equal(host.role,'host');assert.equal(registration.sockets[0].closes,0);
registration.forgetHost();registration.sockets[0].close();await registration.advance(1200);
assert.equal(host.online,true);assert.equal(host.hostRegistered,true);assert.equal(registration.calls.registration,3,'a reconnected physical host must register again when the server has lost the registration');

// Run the actual generated physical-host callback. The HTTP reconciliation
// response can be old even though Client.accept correctly refuses to apply it.
const reportStart=source.indexOf('  function reportPhysical(number){'),reportEnd=source.indexOf('\n  function captureMirrorFrame',reportStart);
assert.ok(reportStart>=0&&reportEnd>reportStart);
for(const old of [
 {type:'snapshot',serverTime:1000,machine:{revision:1},round:round('old-round',8,'PLAYING')},
 {type:'snapshot',serverTime:3100,machine:{revision:10},round:round('round-9',9,'PLAYING')}
]){
 const reports=[],context=stateHarness.context;
 client.getState=async()=>old;client.report=async payload=>{reports.push(payload);return{ball:{index:payload.ballIndex}};};
 Object.assign(context,{client,hostRoundId:'round-9',hostIndex:1,hostRunning:true,hostProgressAt:0,hostAttempt:1,reportChain:Promise.resolve(),hostRetryTimer:0,hostBanner(){},captureMirrorFrame(){},stopMirrorCapture(){},status(){},syncHost(){}});
 vm.runInContext(source.slice(reportStart,reportEnd)+'\nglobalThis.testReportPhysical=reportPhysical;',context);
 context.testReportPhysical(9);await context.reportChain;
 assert.equal(reports.length,1,'a rejected HTTP snapshot must not discard the current physical HIT');
 assert.equal(reports[0].roundId,'round-9');assert.equal(reports[0].ballIndex,2,'physical reporting must use the newest accepted ball count');assert.equal(reports[0].number,9);
}
console.log('v225 host recovery: stale snapshots rejected, healthy WS preserved, startup/register retries and authoritative physical HIT reporting passed');

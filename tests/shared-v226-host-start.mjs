import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const [speedSource,appSource,coreSource,basePatch,nextPatch]=await Promise.all([
 fs.readFile(process.env.HOST_START_SPEED||new URL('../assets/shared-host-speed-v219.js',import.meta.url),'utf8'),
 fs.readFile(new URL('../optimized/app-01.js',import.meta.url),'utf8'),
 fs.readFile(new URL('../assets/shared-machine-core-v196.js',import.meta.url),'utf8'),
 fs.readFile(process.env.HOST_START_V221||new URL('../assets/shared-core-patch-v221.js',import.meta.url),'utf8'),
 fs.readFile(new URL('../assets/shared-core-patch-v224.js',import.meta.url),'utf8')
]);
const quiet={info(){},warn(){},error(){}};
const flush=async()=>{for(let i=0;i<35;i++)await Promise.resolve();};

function speedHarness({phase='BETTING',initialSpeed=1,updateButton=true,buttonText,buttonPressed,buttonDisabled=true,nativeApi=false}={}){
 let actualSpeed=initialSpeed,clicks=0;
 const attributes={'aria-pressed':buttonPressed??String(initialSpeed===2)};
 const button={
  textContent:buttonText??initialSpeed+'×',dataset:{},style:{},hidden:false,disabled:buttonDisabled,
  getAttribute:key=>attributes[key],setAttribute:(key,value)=>{attributes[key]=value;},
  click(){
   if(this.disabled)return;
   clicks++;
   actualSpeed=actualSpeed===1?2:1;
   if(updateButton){this.textContent=actualSpeed+'×';attributes['aria-pressed']=String(actualSpeed===2);}
  }
 };
 const client={round:{id:'first-round',phase}};
 // The real driver exposes physics/draw/setPaused, but keeps rouletteTimeScale
 // inside createCookieRoulette. An existing driver is not a working speed API.
 const context={window:{SweetsSharedMachine:{client}},location:{search:'?serverHost=1'},URLSearchParams,
  document:{getElementById:()=>button},rouletteDriver:{physics:{},draw:{},setPaused(){}},
  console:quiet,setTimeout:()=>1,clearTimeout(){},addEventListener(){}};
 if(nativeApi)context.rouletteDriver.setTimeScale=value=>{actualSpeed=value;};
 vm.runInNewContext(speedSource,context);
 return{client,button,apply:()=>context.window.SweetsHostSpeedV219.apply(),
  get speed(){return actualSpeed;},get clicks(){return clicks;},get advertisedSpeed(){return context.window.SweetsHostSpeedV219.speed;}};
}

const playingSpeed=speedHarness({phase:'PLAYING',buttonDisabled:false});
assert.equal(playingSpeed.speed,1,'entering PLAYING must never enable the retired 2× speed');
assert.equal(playingSpeed.clicks,0);
const betSpeed=speedHarness();
assert.equal(betSpeed.button.dataset.serverLockedSpeed,'1');
assert.equal(betSpeed.speed,1);
betSpeed.client.round.phase='PLAYING';betSpeed.apply();
assert.equal(betSpeed.speed,1,'BETTING and PLAYING must use the same standard speed');
for(let i=0;i<10;i++)betSpeed.apply();
betSpeed.client.round={id:'second-round',phase:'BETTING'};betSpeed.apply();
betSpeed.client.round.phase='PLAYING';betSpeed.apply();
assert.equal(betSpeed.clicks,0,'an existing 1× setting must never be toggled');
assert.equal(betSpeed.advertisedSpeed,1);
assert.equal(betSpeed.button.hidden,true);assert.equal(betSpeed.button.disabled,true);

const legacySpeed=speedHarness({initialSpeed:2});
assert.equal(legacySpeed.speed,1,'an existing native 2× setting must return to standard speed');
legacySpeed.apply();assert.equal(legacySpeed.clicks,1);
const staleLabel=speedHarness({buttonText:'2×',buttonPressed:'false'});
staleLabel.apply();assert.equal(staleLabel.speed,1);assert.equal(staleLabel.clicks,0,'a stale 2× label must not override the native false state');
const staleAfterReset=speedHarness({initialSpeed:2,updateButton:false});
for(let i=0;i<10;i++)staleAfterReset.apply();
assert.equal(staleAfterReset.speed,1);assert.equal(staleAfterReset.clicks,1,'unchanged 2× UI after a restore must not toggle the clock back');
const apiSpeed=speedHarness({initialSpeed:2,nativeApi:true});
apiSpeed.apply();assert.equal(apiSpeed.speed,1);assert.equal(apiSpeed.clicks,0,'an actual speed API must not be followed by a reversing button click');

// Execute the bundled Cannon engine and the unchanged production physics/draw
// controllers. No shortened flight, fabricated HIT, or altered physics settings.
const cannonStart=appSource.indexOf('CANNON=(()=>{');
const cannonEnd=appSource.indexOf('})();',cannonStart)+5;
const physicsStart=appSource.indexOf('const PHYSICS=(()=>{');
const drawStart=appSource.indexOf('\nconst DRAW=',physicsStart)+1;
const drawEnd=appSource.indexOf('\nconst PIXELS=',drawStart);
assert.ok(cannonStart>=0&&cannonEnd>cannonStart&&physicsStart>cannonEnd&&drawStart>physicsStart&&drawEnd>drawStart);
const drawGroups=appSource.match(/^const NORMAL_DRAW_GROUPS=.*;$/m)?.[0];
assert.ok(drawGroups,'retain the native first-three-ball group schedule');
const simulation={console:quiet,performance};vm.createContext(simulation);
vm.runInContext('const '+appSource.slice(cannonStart,cannonEnd)+
 '\nconst localEightAllowed=true;\n'+drawGroups+'\n'+
 appSource.slice(physicsStart,drawEnd)+'\nglobalThis.test={CANNON,PHYSICS,DRAW};',simulation);
const {CANNON,PHYSICS,DRAW}=simulation.test;
const physics=new PHYSICS.RoulettePhysics(CANNON),draw=new DRAW.DrawController(physics);

const patchContext={window:{},console:quiet};vm.createContext(patchContext);
vm.runInContext(basePatch,patchContext);vm.runInContext(nextPatch,patchContext);
const patched=patchContext.window.SweetsSharedCorePatchV224.patch(coreSource);
const hostStart=patched.indexOf(' if(SERVER_HOST){',patched.indexOf('function install(){'));
const hostEnd=patched.indexOf('\n rememberBlockedRound(null);',hostStart);
assert.ok(hostStart>=0&&hostEnd>hostStart,'exercise the complete production host branch after both patches');
const hostSource=patched.slice(hostStart,hostEnd);

function hostHarness({physical=null,reportFailures=0,retryAfterMs=0}={}){
 let now=100000,nextId=0,callbacks=null;
 const timers=new Map(),listeners=[],reports=[],launches=[],hits=[],calls={reset:0,start:0,resume:0};
 const later=(fn,ms=0)=>{const id=++nextId;timers.set(id,{fn,at:now+Math.max(0,Number(ms)||0)});return id;};
 const driver=physical||{physics:{time:0,serial:0,active:0,hits:[],faults:0},draw:{state:'ready',group:0,sent:0}};
 driver.setPaused=value=>{if(!value)calls.resume++;};
 const client={online:true,role:'host',clockOffset:0,httpRetryAt:0,ready:Promise.resolve(true),
  round:{id:'round-1',phase:'PLAYING',participantCount:1,drawStartsAt:now,balls:[]},
  on:fn=>listeners.push(fn),send(){},
  async getState(){return{round:this.round};},accept(){return true;},
  async report(payload){
   reports.push({...payload});
   if(reportFailures-->0){const error=Error('rate_limited');error.status=429;error.retryAfterMs=retryAfterMs;error.data={error:'rate_limited',retryAfterMs};throw error;}
   const ball={index:payload.ballIndex,number:payload.number};this.round.balls.push(ball);return{ball};
  }
 };
 const banner={textContent:''};
 const context={window:{},console:quiet,client,SERVER_HOST:true,VERSION:'v226',query:new URLSearchParams(),
  barrier:null,rouletteReady:true,rouletteDrawSource:{},rouletteDriver:driver,manualNumbers:false,inView:true,
  app:{paused:false,bets:[],engines:[]},slots:[],stopAutoRound(){},status(){},serverRequired(){},
  document:{hidden:false,getElementById:id=>id==='server-roulette-host-css'?{}:null,querySelector:selector=>selector==='.server-host-banner'?banner:null},
  Date:class extends Date{static now(){return now;}},setTimeout:later,clearTimeout:id=>timers.delete(id),
  wait:ms=>new Promise(resolve=>later(resolve,ms)),
  nativeReset(){
   calls.reset++;
   if(physical)driver.draw.reset();
   else{
    Object.assign(driver.physics,{serial:0,active:0,hits:[],faults:0});
    Object.assign(driver.draw,{state:'ready',group:0,sent:0});
   }
  },
  nativeStart(value){
   calls.start++;callbacks=value;
   if(physical){
    driver.draw.onLaunch=ball=>launches.push({id:ball.id,time:driver.physics.time});
    driver.physics.onHit=hit=>{hits.push({...hit});callbacks.onNumber(hit.pocket);};
    driver.draw.start();
   }else driver.draw.state='running';
  }
 };
 vm.createContext(context);vm.runInContext('function installHost(){\n'+hostSource+'\n}\ninstallHost();',context);
 async function advance(ms,onAdvance){
  const end=now+ms;
  for(let count=0;count<2000;count++){
   await flush();
   const next=[...timers].filter(([,timer])=>timer.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];
   const at=next?next[1].at:end,elapsed=at-now;now=at;
   if(elapsed>0)onAdvance?.(elapsed);
   await flush();
   if(!next)return;
   timers.delete(next[0]);next[1].fn();
  }
  throw Error('host timers exceeded the bounded test schedule');
 }
 return{context,client,driver,calls,reports,launches,hits,advance,
  emitNumber:number=>callbacks.onNumber(number),snapshot:()=>listeners.forEach(fn=>fn({type:'snapshot',round:client.round}))};
}

const flight=hostHarness({physical:{physics,draw}});await flush();
let accumulator=0;
const stepPhysics=ms=>{
 accumulator+=ms/1000;
 while(accumulator>=1/120){draw.update();physics.step(1/120);accumulator-=1/120;}
};
await flight.advance(15000,stepPhysics);
assert.equal(flight.calls.start,1,'a moving first group must survive the former 15-second no-HIT deadline');
assert.equal(flight.calls.reset,1);
assert.equal(physics.serial,3);assert.equal(physics.active,3);assert.equal(physics.hits.length,0);
assert.equal(flight.calls.resume,1,'healthy watchdog ticks must not repeatedly clear the renderer clock');
await flight.advance(5000,stepPhysics);
assert.equal(flight.hits.length,3,'all three original balls must land without being replaced');
assert.ok(flight.hits[0].time>15,'the unmodified native first HIT really can occur after 15 seconds');
assert.deepEqual(flight.launches.map(ball=>ball.id),[1,2,3]);
assert.ok(flight.launches[1].time>=2&&flight.launches[1].time<2.02);
assert.ok(flight.launches[2].time>=4&&flight.launches[2].time<4.04);
assert.deepEqual(flight.client.round.balls.map(ball=>ball.number),flight.hits.map(hit=>hit.pocket));
assert.equal(flight.calls.start,1);assert.equal(flight.calls.reset,1);assert.equal(flight.calls.resume,1);

const hidden=hostHarness();await flush();hidden.context.document.hidden=true;
await hidden.advance(90000);
assert.equal(hidden.calls.start,1,'a hidden browser may suspend frames without invalidating the physical balls');
assert.equal(hidden.calls.reset,1);assert.equal(hidden.calls.resume,1);
hidden.context.document.hidden=false;await hidden.advance(1000);
assert.equal(hidden.calls.reset,1,'returning to the visible tab must get a fresh recovery window');

const frozen=hostHarness();await flush();await frozen.advance(59000);
assert.equal(frozen.calls.start,1);assert.equal(frozen.calls.reset,1);
assert.equal(frozen.calls.resume,2,'a genuine non-advancing driver gets one wake attempt, not one per watchdog tick');
await frozen.advance(2000);
assert.equal(frozen.calls.start,2,'a driver still frozen after the recovery window must restart');
assert.equal(frozen.calls.reset,2);

const partial=hostHarness();await flush();
partial.client.round.balls=[{index:1,number:4},{index:2,number:9}];
partial.driver.draw.state='complete';partial.driver.physics.time=20;
partial.driver.physics.hits=Array.from({length:8},(_,index)=>({pocket:index+1}));
await partial.advance(500,ms=>{partial.driver.physics.time+=ms/1000;});
assert.equal(partial.calls.start,2,'a completed duplicate-filled physical attempt must continue the remaining authoritative draws');
assert.deepEqual(partial.client.round.balls.map(ball=>ball.number),[4,9]);

const delayed=hostHarness({reportFailures:1,retryAfterMs:70000});await flush();
delayed.driver.draw.state='complete';delayed.emitNumber(17);await flush();
assert.equal(delayed.reports.length,1);
await delayed.advance(69000);
assert.equal(delayed.calls.start,1,'a completed draw with an unacknowledged HIT must retain that result throughout HTTP backoff');
assert.equal(delayed.calls.reset,1);assert.equal(delayed.calls.resume,1);
assert.equal(delayed.reports.length,1,'429 Retry-After must be respected');
await delayed.advance(1000);
assert.equal(delayed.reports.length,2);assert.deepEqual(delayed.reports[1],delayed.reports[0],'retry must send the same physical HIT and event identity');
assert.deepEqual(delayed.client.round.balls.map(ball=>ball.number),[17]);
assert.equal(delayed.calls.start,2,'only after the pending HIT is acknowledged may a completed partial attempt restart');

console.log('v226 physical host start passed',JSON.stringify({
 firstGroupLaunchSeconds:flight.launches.map(ball=>Number(ball.time.toFixed(4))),
 firstGroupHitSeconds:flight.hits.map(hit=>Number(hit.time.toFixed(4))),
 standardSpeedThroughout:true,legacyDoubleSpeedRestored:true,noPrematureReset:true,hiddenTabPreserved:true,
 frozenDriverRecovery:true,completedPartialRecovery:true,rateLimitedHitRetained:true
}));

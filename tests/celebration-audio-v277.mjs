/* Exercise the production sound module with a deterministic AudioContext model.
 * This verifies ownership/lifecycle decisions; real decode/playback is covered
 * by celebration-v277-browser.mjs and actual PCM data by the Python companion. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const root=new URL('../',import.meta.url);
const source=await fs.readFile(new URL('assets/celebration-audio-v277.js',root),'utf8');
const bank='assets/audio/casino-v281/';
const manifest=JSON.parse(await fs.readFile(new URL(bank+'manifest.json',root),'utf8'));
const legacyManifest=JSON.parse(await fs.readFile(new URL('assets/audio/celebration-v277/manifest.json',root),'utf8'));
const sampleCount=Object.keys(manifest.cues).length;
const host=await fs.readFile(new URL('optimized/app-01.js',root),'utf8');
const sceneKeys=JSON.parse(host.match(/const SCENE_SOUND_KEYS=(\[[^;]+\]);/)[1]);
const kinds=['cookie','choco','candy','gelato','winery','popcorn','jelly','stick','castella','dango'];
const plain=value=>JSON.parse(JSON.stringify(value));

function harness({search='',cold=false,unavailable=[],primaryFailures={}}={}){
 let now=1000,serial=0,context,unlocks=0;
 const timers=new Map(),events=new Map(),primaryAttempts=new Map(),sources=[],fallback=[],loads=[],owned=new Set();
 const checkbox={checked:true};
 function parameter(value=1){return {value,calls:[],cancelScheduledValues(t){this.calls.push(['cancel',t]);},setValueAtTime(v,t){this.value=v;this.calls.push(['set',v,t]);},linearRampToValueAtTime(v,t){this.value=v;this.calls.push(['ramp',v,t]);}};}
 function gain(){return {gain:parameter(),outputs:[],connect(out){this.outputs.push(out);},disconnect(out){this.outputs=out?this.outputs.filter(o=>o!==out):[];}};}
 const audio={state:'running',get currentTime(){return now/1000;},destination:{},createGain:gain,
  createBufferSource(){const s={onended:null,buffer:null,playbackRate:{value:1},outputs:[],stopped:false,
   connect(out){this.outputs.push(out);},disconnect(){this.outputs=[];},
   start(at){this.at=at;this.until=at+this.buffer.duration/this.playbackRate.value;sources.push(this);},
   stop(){this.stopped=true;}};return s;}};
 const bgmGain=gain();bgmGain.connect(audio.destination);
 const app={token:1,phase:'playing',paused:false,draws:[1],engines:kinds.map(kind=>({kind})),random(){throw Error('audio touched game RNG');}};
 const math=Object.create(Math);math.random=()=>{throw Error('audio touched Math.random');};
 const window={SweetsLineup:{ids:kinds},SweetsAwardsV277:{owns:game=>owned.has(game)},addEventListener:(n,fn)=>events.set('window:'+n,fn),SugarChallengeRulesV254:{reaches:()=>[]}};
 const legacyStop=()=>{for(const voice of context.sfxVoices){voice.source.stop();voice.source.disconnect();voice.gain.disconnect();}context.sfxVoices.clear();};
 context=vm.createContext({window,app,active:0,audio:cold?null:audio,sfxBus:gain(),sfxBuffers:new Map(),sfxVoices:new Set(),
  SCENE_SOUND_FILES:Object.fromEntries(sceneKeys.map(k=>[k,'legacy/'+k+'.wav'])),
  prepareSceneSounds(){},sceneSoundsReady(){},prepareArrival(){},prepareHammerImpact(){},arrivalBuffer:null,hammerImpactBuffer:null,
  sound:(...args)=>fallback.push(args),stopSounds:legacyStop,
  loadEffectSample:async file=>{loads.push(file);const name=file.split('/').pop().replace(/\.wav$/,'');
   const current=file.startsWith(bank);if(current){
    const attempt=primaryAttempts.get(name)||0;primaryAttempts.set(name,attempt+1);
    const planned=primaryFailures[name],failure=Array.isArray(planned)?planned[attempt]:planned;
    if(failure)throw Object.assign(Error(failure.message),{name:failure.name||'Error'});
    if(unavailable.includes(name))throw Error(file+' HTTP 404');
   }
   const entry=(current?manifest:legacyManifest).cues[name];assert(entry,file);return {name,duration:entry.seconds};},
  unlock:()=>{unlocks++;context.audio=audio;context.prepareSceneSounds();return Promise.resolve(true);},
  inView:true,userPaused:false,menuOpen:false,bgmGain,bgmRole:'game',bgmFadeFrame:0,jpcSession:{active:false,previousCounts:[],jackpotShown:false},
  celebrateJpc(){context.jpcSession.jackpotShown=true;return 'native-jackpot';},
  paintJpcDashboard(count){context.jpcSession.previousCounts=Array.from({length:25},(_,i)=>Number(i<count));return 'native-dashboard';},
  document:{hidden:false,addEventListener:(n,fn)=>events.set(n,fn)},$:id=>id==='sound'?checkbox:null,
  location:{search},URLSearchParams,performance:{now:()=>now},console,Math:math,
  setTimeout:(fn,ms)=>{const id=++serial;timers.set(id,{fn,at:now+ms});return id;},clearTimeout:id=>timers.delete(id)});
 vm.runInContext(source,context);
 const advance=ms=>{now+=ms;for(const [id,t]of [...timers])if(t.at<=now){timers.delete(id);t.fn();}for(const s of sources)if(!s.stopped&&s.until<=now/1000){s.stopped=true;s.onended?.();}};
 return {context,app,window,api:window.SweetsAudioV277,checkbox,audio,bgmGain,events,sources,loads,fallback,owned,timers,advance,unlocks:()=>unlocks};
}

const h=harness();await h.context.prepareSceneSounds();
const d=h.api.describe();
assert.deepEqual(Object.keys(plain(d.sceneRoutes)).sort(),sceneKeys.slice().sort(),'every existing scene route is replaced');
assert.deepEqual(plain(d.samples).sort(),Object.keys(manifest.cues).sort(),'every routed sound exists, with no unused shipped cue');
assert.equal(d.version,281);assert.equal(sampleCount,97);assert.equal(d.soundBank,bank);
assert.equal(d.loadedSamples,sampleCount);assert.equal(d.totalSamples,sampleCount);assert.equal(d.errors,0);
assert.equal(h.loads.length,sampleCount,'parallel preparation shares each decode');
for(const [key,name]of Object.entries(d.sceneRoutes)){
 assert.equal(h.context.SCENE_SOUND_FILES[key],`${bank}${name}.wav`);
 assert.equal(h.context.sfxBuffers.get('scene-'+key).name,name);
 await fs.access(new URL(bank+name+'.wav',root));
}
await h.context.prepareArrival();await h.context.prepareHammerImpact();
assert.equal(h.context.arrivalBuffer.name,'arrival');assert.equal(h.context.hammerImpactBuffer.name,'hammer-impact');
assert.equal(h.loads.length,sampleCount,'warm arrival and hammer gates reuse decoded buffers');

// Selected materials route through actual sound() calls, not diagnostics alone.
for(const [index,key,name]of [[0,'crack','hit-cookie'],[1,'scene-stratum','hit-canyon'],[2,'scene-six-hit','hit-candy'],[3,'scene-glass','hit-prism'],[4,'scene-glass','hit-water'],[5,'scene-pop','hit-popcorn'],[6,'scene-glass','hit-jelly'],[7,'crack','hit-waffle'],[8,'scene-cookie-hit','hit-castella'],[9,'scene-cookie-hit','hit-dango']]){
 h.context.active=index;h.context.stopSounds();h.advance(250);h.context.sound(key);
 assert.equal(h.api.describe().lastEvents.at(-1).sample,name);
}
assert.equal(h.fallback.length,0,'mapped material sounds never use legacy synthesis');
h.context.active=0;h.context.stopSounds();h.advance(500);

// The illustrated award replaces its queued legacy counterpart exactly once.
h.context.sound('scene-line');assert.equal(h.api.describe().pendingAwards,1);
assert(h.api.award({game:'cookie',tier:2,key:'native:line',delayMs:120}));
h.advance(90);assert.equal(h.api.describe().awardStarts,0);
h.advance(40);assert.equal(h.api.describe().awardStarts,1);
assert.equal(h.api.describe().lastEvents.filter(e=>e.event==='start'&&e.award).at(-1).sample,'award-cookie-2');
assert.equal(h.api.award({game:'cookie',tier:2,key:'native:line'}),false,'same award never sounds twice');
assert.equal(h.context.sound('scene-role'),false,'legacy audio cannot layer over explicit award');
assert.equal(h.api.award({game:'jelly',tier:4,key:'other-game'}),false,'nonselected game remains quiet');
assert(h.api.award({game:'cookie',tier:4,key:'higher-role'}),'a higher award can replace the lower voice');
assert.equal(h.api.describe().activeVoices,1);
assert.equal(h.api.award({game:'cookie',tier:1,key:'lower-role'}),false,'ordinary award cannot interrupt highest award');
assert.equal(h.bgmGain.gain.calls.length,0,'duck stage does not change native music fade parameters');
h.context.stopSounds();assert.equal(h.api.describe().activeVoices,0);assert.equal(h.api.describe().pendingAwards,0);

// Voice bound is measured against a real sequence of distinct source starts.
for(const key of ['crack','confirm','magic','sugar','hammer','sugar-spawn','scene-drill','scene-melt','scene-ore','scene-pop','scene-refill']){h.advance(80);h.context.sound(key);assert(h.api.describe().activeVoices<=8);}
assert(h.api.describe().maxActiveVoices<=8);h.context.stopSounds();
h.owned.add('cookie');assert.equal(h.context.sound('scene-allclear'),false);assert.equal(h.api.play('high-win'),false);h.owned.clear();

for(const reason of ['mute','pause','hidden','menu','offscreen']){
 h.app.token++;h.advance(500);h.api.award({game:'cookie',tier:2,key:'queued:'+reason,delayMs:200});
 if(reason==='mute')h.checkbox.checked=false;
 if(reason==='pause')h.app.paused=true;
 if(reason==='hidden')h.context.document.hidden=true;
 if(reason==='menu')h.context.menuOpen=true;
 if(reason==='offscreen')h.context.inView=false;
 const starts=h.api.describe().starts;h.context.stopSounds();
 assert.equal(h.api.play('ui'),false);assert.equal(h.api.award({game:'cookie',tier:4,key:'blocked:'+reason}),false);
 h.advance(400);assert.equal(h.api.describe().starts,starts);assert.equal(h.api.describe().activeVoices,0);assert.equal(h.api.describe().pendingAwards,0);
 h.checkbox.checked=true;h.app.paused=false;h.context.document.hidden=false;h.context.menuOpen=false;h.context.inView=true;
 h.advance(400);assert.equal(h.api.describe().starts,starts,'unblocking does not replay queued sound');
}
h.app.token++;h.api.award({game:'cookie',tier:2,key:'stale-round',delayMs:100});const starts=h.api.describe().starts;h.app.token++;h.advance(150);assert.equal(h.api.describe().starts,starts);
h.api.award({game:'cookie',tier:2,key:'stale-selection',delayMs:100});h.context.active=1;h.advance(150);assert.equal(h.api.describe().starts,starts);h.context.active=0;h.context.stopSounds();

// A ticker reports a reach only after a new draw; it never owns a confirmed win.
assert.equal(h.api.play('high-win',{source:'ticker'}),false);
assert.equal(h.api.play('reach',{source:'ticker',reach:true,game:0,queuedAt:0,key:'old'}),false);
h.app.draws.push(2);assert(h.api.play('reach',{source:'ticker',reach:true,game:0,queuedAt:h.audio.currentTime*1000,key:'reach-2'}));
assert.equal(h.api.play('reach',{source:'ticker',reach:true,game:0,queuedAt:h.audio.currentTime*1000,key:'reach-2'}),false);h.context.stopSounds();

// Restore snapshots and repeated sugar frames cannot generate an earned fanfare.
const sugar=harness();await sugar.context.prepareSceneSounds();
const a={id:'sugar-A',draws:[1,2],jpcQualified:true};
assert.equal(sugar.api.sugarTransition(null,a),false);assert.equal(sugar.api.sugarTransition(a,a),false);assert.equal(sugar.api.describe().awardStarts,0);
const b={id:'sugar-B',draws:[1],jpcQualified:false},c={...b,draws:[1,2],jpcQualified:true};
sugar.api.sugarTransition(null,b);assert(sugar.api.sugarTransition(b,c));assert.equal(sugar.api.sugarTransition(c,c),false);assert.equal(sugar.api.describe().awardStarts,1);
sugar.context.stopSounds();sugar.api.sugarReel({id:'restored-reel',intro:9800,position:14,multiplier:10});assert.equal(sugar.api.describe().awardStarts,1);

const cold=harness({cold:true});assert.equal(cold.api.unlock({isTrusted:false}),false);assert.equal(cold.unlocks(),0);
cold.checkbox.checked=false;assert.equal(cold.api.unlock({isTrusted:true}),false);assert.equal(cold.unlocks(),0);
cold.checkbox.checked=true;await cold.api.unlock({isTrusted:true});await cold.context.prepareSceneSounds();assert.equal(cold.unlocks(),1);assert.equal(cold.api.describe().loadedSamples,sampleCount);assert.equal(cold.api.describe().starts,0,'unlock itself is silent');
for(const search of ['?serverSettlementWorker=1','?downloadWorker=1']){const worker=harness({search});assert.equal(worker.api,undefined);assert.equal(worker.context.sound('crack'),false);assert.equal(worker.loads.length,0);}
// All ten cabinets use their own actual chain and four actual award buffers.
const themed=harness();await themed.context.prepareSceneSounds();
for(const [index,game]of kinds.entries()){
 themed.context.active=index;themed.context.stopSounds();themed.advance(500);
 themed.context.sound('scene-chain',{volume:.45});
 assert.equal(themed.api.describe().lastEvents.at(-1).sample,'chain-'+game);
 themed.context.stopSounds();themed.advance(500);assert(themed.api.play('chain'));
 assert.equal(themed.api.describe().lastEvents.at(-1).sample,'chain-'+game);
 for(let tier=1;tier<=4;tier++){
  themed.context.stopSounds();themed.advance(500);
  assert(themed.api.award({game,tier,key:game+':'+tier}));
  assert.equal(themed.api.describe().lastEvents.at(-1).sample,'award-'+game+'-'+tier);
  assert.equal(themed.api.describe().activeVoices,1,'a composed fanfare is one runtime voice');
 }
}
themed.context.stopSounds();themed.advance(500);
for(const [multiplier,expected]of [[2,'multiplier'],[5,'multiplier-high'],[10,'multiplier-galaxy']]){
 themed.context.stopSounds();themed.advance(500);const id='multiplier-'+multiplier;
 themed.api.sugarReel({id,intro:9600,position:13,spinning:true,multiplier});
 themed.api.sugarReel({id,intro:9800,position:14,spinning:false,multiplier});
 assert.equal(themed.api.describe().lastEvents.at(-1).sample,expected);
 const count=themed.api.describe().starts;themed.api.sugarReel({id,intro:9900,position:14,spinning:false,multiplier});
 assert.equal(themed.api.describe().starts,count,'the same multiplier stop cannot replay');
}
themed.context.stopSounds();themed.advance(500);
themed.context.jpcSession.active=true;themed.app.paused=true;
assert.equal(themed.context.paintJpcDashboard(23),'native-dashboard');
themed.context.paintJpcDashboard(24);assert.equal(themed.api.describe().lastEvents.at(-1).sample,'jpc-reach');
const reachStarts=themed.api.describe().starts;themed.context.paintJpcDashboard(24);assert.equal(themed.api.describe().starts,reachStarts);
assert.equal(themed.context.celebrateJpc(),'native-jackpot');assert.equal(themed.api.describe().lastEvents.at(-1).sample,'jackpot');
const jackpotStarts=themed.api.describe().awardStarts;themed.context.celebrateJpc();assert.equal(themed.api.describe().awardStarts,jackpotStarts);

// New cache misses recover the matching legacy cue without extra voice starts.
const missing={'hit-jelly':{message:bank+'hit-jelly.wav HTTP 404'},'award-candy-4':{message:bank+'award-candy-4.wav HTTP 410'}};
const recovered=harness({primaryFailures:missing});await recovered.context.prepareSceneSounds();
assert.equal(recovered.api.describe().loadedSamples,sampleCount);assert.equal(recovered.api.describe().fallbackLoads,2);assert.equal(recovered.api.describe().errors,0);
assert.equal(recovered.api.describe().primaryRetries,0,'known 404/410 misses use legacy immediately');
for(const name of Object.keys(missing))assert.equal(recovered.loads.filter(file=>file===bank+name+'.wav').length,1);
assert(recovered.loads.includes('assets/audio/celebration-v277/hit-water.wav'));
assert(recovered.loads.includes('assets/audio/celebration-v277/award-4.wav'));
assert(recovered.api.describe().lastEvents.filter(event=>event.event==='fallback').every(event=>event.primaryAttempts===1&&event.errorName==='Error'&&event.firstError.errorMessage===missing[event.sample].message));
recovered.context.active=2;assert(recovered.api.award({game:'candy',tier:4,key:'recovered-clear'}));
assert.equal(recovered.api.describe().activeVoices,1);assert.equal(recovered.api.describe().awardStarts,1);

// A cold transient abort must not permanently substitute a shipped current cue.
const coldNames=['drill','hit-canyon','melt','ore','arrival','hammer-impact'];
const aborted={name:'AbortError',message:'The operation was aborted.'};
const retried=harness({primaryFailures:Object.fromEntries(coldNames.map(name=>[name,[aborted]]))});
await Promise.all([retried.context.prepareSceneSounds(),retried.context.prepareArrival(),retried.context.prepareHammerImpact()]);
assert.equal(retried.api.describe().loadedSamples,sampleCount);assert.equal(retried.api.describe().primaryRetries,6);
assert.equal(retried.api.describe().fallbackLoads,0);assert.equal(retried.api.describe().errors,0);assert.equal(retried.api.describe().starts,0);
assert(retried.loads.every(file=>file.startsWith(bank)),'a recovered primary load never requests a legacy cue');
for(const name of coldNames)assert.equal(retried.loads.filter(file=>file===bank+name+'.wav').length,2,'concurrent ready gates share the single retry');
const retryEvents=retried.api.describe().lastEvents.filter(event=>event.event==='retry');
assert.equal(retryEvents.length,6);assert(retryEvents.every(event=>event.attempt===2&&event.errorName==='AbortError'&&event.errorMessage===aborted.message));

// Persistent transient errors still have a strict two-primary-attempt ceiling.
const bounded=harness({primaryFailures:{'award-cookie-4':aborted}});await bounded.context.prepareSceneSounds();
assert.equal(bounded.loads.filter(file=>file===bank+'award-cookie-4.wav').length,2);
assert.equal(bounded.loads.filter(file=>file==='assets/audio/celebration-v277/award-4.wav').length,1);
assert.equal(bounded.api.describe().primaryRetries,1);assert.equal(bounded.api.describe().fallbackLoads,1);
assert.equal(bounded.api.describe().loadedSamples,sampleCount);assert.equal(bounded.api.describe().errors,0);assert.equal(bounded.api.describe().starts,0);
const boundedEvent=bounded.api.describe().lastEvents.find(event=>event.event==='fallback');
assert.equal(boundedEvent.primaryAttempts,2);assert.equal(boundedEvent.errorName,'AbortError');assert.equal(boundedEvent.firstError.errorMessage,aborted.message);
assert.equal(h.api.describe().errors+sugar.api.describe().errors+cold.api.describe().errors+themed.api.describe().errors,0);
console.log(JSON.stringify({ok:true,version:281,samples:sampleCount,sceneRoutes:sceneKeys.length,nativeMaterialRoutes:10,themedAwardRoutes:40,themedChains:10,multiplierTiers:3,jpcAndJackpot:true,legacyFallback:true,boundedPrimaryRetry:true,missing404And410SkipRetry:true,sharedContext:true,singleAwardOwner:true,maxVoices:8,muteAndPause:true,staleRoundAndSelectionSuppressed:true,restoreIsSilent:true,trustedUnlock:true,workerDisabled:true}));

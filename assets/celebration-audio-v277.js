/* v281 casino palette, retaining the v277 public API and event ownership.
 * CC0 / public-domain source layers are rendered into single-voice cues.
 * Loaded inside the host's private scope after game
 * modules: one existing AudioContext, one bounded SFX bus, one award at a time.
 * BGM and spoken-number/character recordings are never replaced. */
(()=>{
'use strict';
if(window.SweetsAudioV277)return;
const query=new URLSearchParams(location.search);
if(query.get('serverSettlementWorker')==='1'||query.get('downloadWorker')==='1'){
 sound=()=>false;
 return;
}
const VERSION=281,ROOT='assets/audio/casino-v281/',LEGACY_ROOT='assets/audio/celebration-v277/',MAX_VOICES=8,AWARD_WAIT=70;
const gameKinds=['cookie','choco','candy','gelato','winery','popcorn','jelly','stick','castella','dango'];
const gameAwards=Object.fromEntries(gameKinds.map(game=>[game,Array.from({length:4},(_,i)=>'award-'+game+'-'+(i+1))]));
const gameChains=Object.fromEntries(gameKinds.map(game=>[game,'chain-'+game]));
const extraFallbacks={'hit-jelly':'hit-water','reel-tick':'count','multiplier-high':'multiplier','multiplier-galaxy':'multiplier','jpc-reach':'reach-high',jackpot:'award-4'};
const sceneMap={
 drill:'drill',stratum:'hit-canyon',melt:'melt',ore:'ore',sugar:'sugar',random:'transform',transform:'transform',
 glass:'hit-prism',landing:'land',refill:'refill',pop:'hit-popcorn',triangle:'award-1',hexagon:'award-2',role:'award-1',
 candy:'hit-candy',cookie:'hit-cookie',record:'award-2',gift:'sugar',delivery:'refill',
 'cookie-hit':'hit-cookie','cookie-fall':'drop','cookie-land':'land','cookie-refill':'refill',chain:'chain','color-burst':'sweep',
 'hammer-launch':'hammer-launch','hammer-impact':'hammer-impact',arrival:'arrival','canyon-fall':'drop','canyon-land':'land',
 scroll:'scroll',return:'round',renew:'refill','all-drills':'award-2','six-hit':'hit-candy','six-miss':'miss',sweep:'sweep',
 line:'award-1',finish:'finish',allclear:'award-4',bonus:'award-2','credit-tick':'count','credit-done':'count-done',
 'pay-step':'count','pay-lock':'count-done',launch:'launch',continue:'award-2','scale-tick':'count','six-count':'count',
 'big-bonus':'award-3',level:'level',rank:'level',round:'round',transfer:'transfer',clear:'award-4'
};
const nativeMap={crack:'hit-cookie',confirm:'confirm',magic:'transform',sugar:'sugar',hammer:'hammer-impact','sugar-spawn':'sugar'};
const eventMap={notice:'ui',reach:'reach','high-reach':'reach-high','high-win':'award-2',special:'award-4',sugar:'sugar',level:'level',chain:'chain',miss:'miss',ui:'ui',confirm:'confirm'};
const allSamples=[...new Set([...Object.values(sceneMap),...Object.values(nativeMap),...Object.values(eventMap),
 'hit-water','hit-jelly','hit-waffle','hit-castella','hit-dango','jpc-qualified','multiplier',
 'reel-tick','multiplier-high','multiplier-galaxy','jpc-reach','jackpot',...Object.values(gameChains),...Object.values(gameAwards).flat()])];
const aliases=new Map(),samples=new Map(),loading=new Map(),ownVoices=new Set(),lastStart=new Map(),seenAwards=new Set(),reachSeen=new Set(),sugarSeen=new Map();
const history=[],stats={starts:0,suppressed:0,awardStarts:0,legacyAwardsSuppressed:0,voiceEvictions:0,maxActiveVoices:0,primaryRetries:0,fallbackLoads:0,errors:0};
let prepared=null,pending=null,awardVoice=null,scopeToken=app?.token,scopeActive=active,epoch=0,chainStep=0,lastFoley=-Infinity,reachFloorCount=app?.draws?.length||0;
let duckBus=null,duckSource=null;
const coreSound=sound,coreStop=stopSounds;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const selected=()=>app?.engines?.[active]?.kind||window.SweetsLineup?.ids?.[active]||'cookie';
const time=()=>audio?.currentTime||0;
const gameId=game=>typeof game==='number'||/^\d+$/.test(String(game))?(app?.engines?.[Number(game)]?.kind||window.SweetsLineup?.ids?.[Number(game)]||'cookie'):String(game||selected());
const isJpc=()=>typeof jpcSession!=='undefined'&&!!jpcSession.active;
function allowed(options={}){
 return !!audio&&audio.state==='running'&&!!$('sound')?.checked&&!document.hidden&&!!inView&&
  !userPaused&&!menuOpen&&(!app?.paused||(options.jpc&&isJpc()));
}
function record(event){history.push({...event,at:Math.round(time()*1000)});if(history.length>64)history.shift();}
function denied(reason,key){stats.suppressed++;record({event:'suppressed',reason,key});return false;}
function owns(game){try{return !!window.SweetsAwardsV277?.owns?.(game);}catch{return false;}}
function disconnect(voice){
 if(!voice)return;
 voice.source.onended=null;
 try{voice.source.disconnect();}catch{}
 try{voice.gain.disconnect();}catch{}
 ownVoices.delete(voice);sfxVoices.delete(voice);
 if(awardVoice===voice)awardVoice=null;
}
function endVoice(voice){
 if(!voice)return;
 try{voice.source.stop();}catch{}
 disconnect(voice);
}
function cancelPending(){if(pending){clearTimeout(pending.timer);pending=null;}}
function restoreDuck(){
 if(!duckBus||!audio)return;
 const p=duckBus.gain,t=time();
 try{p.cancelScheduledValues(t);p.setValueAtTime(p.value,t);p.linearRampToValueAtTime(1,t+.07);}catch{}
}
function stop(){
 epoch++;cancelPending();
 for(const voice of [...ownVoices])endVoice(voice);
 awardVoice=null;lastStart.clear();chainStep=0;lastFoley=-Infinity;restoreDuck();
}
function syncScope(){
 if(scopeToken!==app?.token){stop();scopeToken=app?.token;scopeActive=active;seenAwards.clear();reachSeen.clear();reachFloorCount=app?.draws?.length||0;return;}
 if(scopeActive!==active){stop();scopeActive=active;reachFloorCount=app?.draws?.length||0;}
}
// A separate, unity-gain duck stage leaves the host's BGM fade/transport values
// intact. It is only inserted into the known existing same-context BGM route.
function duck(duration){
 if(!audio||!bgmGain||bgmRole==='transition'||bgmFadeFrame)return;
 try{
  if(duckSource!==bgmGain){
   const next=audio.createGain();next.gain.value=1;next.connect(audio.destination);
   try{bgmGain.disconnect(audio.destination);}catch{next.disconnect();return;}
   bgmGain.connect(next);duckBus=next;duckSource=bgmGain;
  }
  const p=duckBus.gain,t=time();p.cancelScheduledValues(t);p.setValueAtTime(p.value,t);
  p.linearRampToValueAtTime(.62,t+.045);p.setValueAtTime(.62,t+Math.max(.12,duration-.25));
  p.linearRampToValueAtTime(1,t+duration+.18);
 }catch{stats.errors++;}
}
function rememberAliases(){
 for(const [key,sample] of Object.entries(sceneMap)){
  SCENE_SOUND_FILES[key]=ROOT+sample+'.wav';aliases.set('scene-'+key,sample);
 }
 for(const [key,sample] of Object.entries(nativeMap))aliases.set(key,sample);
}
rememberAliases();
function installSample(name,buffer){
 samples.set(name,buffer);
 for(const [alias,sample] of aliases)if(sample===name)sfxBuffers.set(alias,buffer);
}
function loadError(error){return {errorName:String(error?.name||'Error'),errorMessage:String(error?.message||error||'Unknown sample error')};}
function load(name){
 if(samples.has(name))return Promise.resolve(samples.get(name));
 if(loading.has(name))return loading.get(name);
 const fallback=extraFallbacks[name]||(name.startsWith('chain-')?'chain':/^award-[a-z]+-[1-4]$/.test(name)?'award-'+name.slice(-1):name);
 let primaryAttempts=0,firstFailure=null;
 async function primary(){
  primaryAttempts++;
  try{return await loadEffectSample(ROOT+name+'.wav');}
  catch(error){
   const info=loadError(error);if(!firstFailure)firstFailure=info;
   // A cold first load can time out while the host prepares the whole game.
   // Retry once inside this same worker; known missing files go straight to
   // the legacy bank. The host's timeout and decode cache stay authoritative.
   if(primaryAttempts>=2||/\bHTTP\s+(?:404|410)\b/i.test(info.errorMessage))throw error;
   stats.primaryRetries++;record({event:'retry',sample:name,attempt:2,...info});
   return primary();
  }
 }
 const task=primary().catch(async error=>{
  // A new bank may be temporarily absent from a restored/offline cache. Keep
  // the same event, priority and voice identity while decoding the old sound.
  const buffer=await loadEffectSample(LEGACY_ROOT+fallback+'.wav');
  stats.fallbackLoads++;record({event:'fallback',sample:name,fallback,primaryAttempts,...loadError(error),firstError:firstFailure});return buffer;
 }).then(buffer=>{installSample(name,buffer);return buffer;})
  .catch(error=>{stats.errors++;console.warn('[SweetsAudioV277] sample unavailable: '+name,error);return null;})
  .finally(()=>loading.delete(name));
 loading.set(name,task);return task;
}
prepareSceneSounds=function(){
 if(!audio)return Promise.resolve([]);
 if(prepared)return prepared;
 const names=allSamples.filter(name=>!samples.has(name));let cursor=0;
 async function worker(){while(cursor<names.length)await load(names[cursor++]);}
 prepared=Promise.all(Array.from({length:Math.min(4,names.length)},worker))
  .then(()=>allSamples.map(name=>samples.has(name))).finally(()=>{prepared=null;});
 return prepared;
};
sceneSoundsReady=function(){return allSamples.every(name=>samples.has(name));};
// arrivalFile is a const captured before this extension, so replacing its
// loader also prevents an obsolete sample request during the host's ready gate.
prepareArrival=function(){
 if(!audio)return Promise.resolve(null);
 return load('arrival').then(buffer=>arrivalBuffer=buffer);
};
prepareHammerImpact=function(){
 if(!audio)return Promise.resolve(null);
 return load('hammer-impact').then(buffer=>hammerImpactBuffer=buffer);
};

function playSample(name,options={}){
 syncScope();
 if(!allowed(options))return denied('inactive',name);
 const buffer=samples.get(name);
 if(!buffer){prepareSceneSounds();return denied('loading',name);}
 const now=time(),delay=Math.max(0,Number(options.delay)||0)/(app?.fastForward&&app.phase==='playing'?3:1),at=now+delay/1000;
 const gap=options.gap??(name==='count'?.068:name==='ui'?.065:.065);
 const last=lastStart.get(name)??-Infinity;
 if(Math.abs(at-last)<gap)return denied('cooldown',name);
 const priority=options.award?3:clamp(Number(options.priority)||0,0,2);
 while(sfxVoices.size>=MAX_VOICES){
  const old=[...sfxVoices].sort((a,b)=>(a.priority||0)-(b.priority||0)||(a.started||0)-(b.started||0))[0];
  if((old.priority||0)>priority)return denied('voice-limit',name);
  endVoice(old);stats.voiceEvictions++;
 }
 const source=audio.createBufferSource(),gain=audio.createGain();
 const rate=options.award?1:clamp(Number(options.rate)||1,.65,4);
 // Native scene ceilings still apply before this point. A small, bounded
 // material correction restores their transient detail; the shared output
 // compressor/ceiling, UI counters and music gains are unchanged.
 const materialBoost=/^(hit-|chain-)/.test(name)?1.35:1;
 const volume=clamp(Number(options.volume??.7)*materialBoost,0,options.award?1:.9)*(awardVoice&&!options.award?.38:1);
 if(volume<=0)return denied('zero-volume',name);
 const voice={source,gain,priority,started:at,name,award:!!options.award,tier:options.tier||0,explicit:!!options.explicit,game:options.game||selected(),until:at+buffer.duration/rate};
 source.buffer=buffer;source.playbackRate.value=rate;gain.gain.value=volume;source.connect(gain);gain.connect(sfxBus);
 ownVoices.add(voice);sfxVoices.add(voice);
 source.onended=()=>disconnect(voice);
 try{source.start(at);}catch{disconnect(voice);stats.errors++;return false;}
 lastStart.set(name,at);stats.starts++;stats.maxActiveVoices=Math.max(stats.maxActiveVoices,sfxVoices.size);
 if(options.award){
  awardVoice=voice;stats.awardStarts++;
  for(const other of ownVoices)if(other!==voice&&other.priority<3){
   const p=other.gain.gain;p.cancelScheduledValues(now);p.setValueAtTime(p.value,now);p.linearRampToValueAtTime(p.value*.38,now+.035);
  }
  duck(Math.min(3.5,buffer.duration));
 }else if(priority===0)lastFoley=now;
 record({event:'start',sample:name,game:voice.game,award:voice.award,tier:voice.tier,explicit:voice.explicit,key:options.key||'',voices:sfxVoices.size});
 return true;
}
function legacySuppressed(game,key){
 if(owns(game)||(awardVoice?.explicit&&awardVoice.game===game&&time()<awardVoice.until)){
  stats.legacyAwardsSuppressed++;denied('award-owner',key);return true;
 }
 return false;
}
function queueAward({game=selected(),tier=1,key='',kind='role',win=0,delayMs=0,explicit=false,sample,volume=.84,jpc=false}={}){
 syncScope();game=gameId(game);tier=clamp(Math.floor(Number(tier)||1),1,4);
 if(!['sugar','jpc'].includes(game)&&game!==selected())return denied('unselected',key);
 if(!allowed({jpc}))return denied('inactive-award',key);
 if(!explicit&&legacySuppressed(game,key))return false;
 const id=String(app?.token)+':'+game+':'+String(key||kind+':'+win).slice(0,180);
 if(explicit&&seenAwards.has(id))return denied('duplicate-award',key);
 if(explicit){seenAwards.add(id);if(seenAwards.size>192)seenAwards.delete(seenAwards.values().next().value);}
 if(pending){
  if(!explicit&&pending.explicit){stats.legacyAwardsSuppressed++;return denied('explicit-pending',key);}
  if(pending.explicit===explicit&&pending.tier>tier)return denied('lower-pending-tier',key);
  cancelPending();
 }
 const job={game,tier,key,kind,win,explicit,sample:sample||gameAwards[game]?.[tier-1]||'award-'+tier,volume,jpc,token:app?.token,selection:active,epoch,timer:0};
 const wait=Math.max(0,Number(delayMs)||0)+(explicit?0:AWARD_WAIT);
 pending=job;
 const start=()=>{
  if(pending!==job)return;pending=null;
  if(job.token!==app?.token||job.selection!==active||job.epoch!==epoch)return denied('stale-award',key);
  if(!allowed({jpc:job.jpc}))return denied('inactive-award',key);
  if(!job.explicit&&(owns(game)||(awardVoice?.explicit&&awardVoice.game===game&&time()<awardVoice.until))){stats.legacyAwardsSuppressed++;return denied('award-owner',key);}
  if(awardVoice){
   // A scene preview may sound before its later native award is booked.
   // Native authority replaces that legacy voice; confirmed awards retain
   // their tier protection against other confirmed awards.
   if(time()<awardVoice.until-.08&&job.tier<=awardVoice.tier&&(!job.explicit||awardVoice.explicit))return denied('higher-active-tier',key);
   endVoice(awardVoice);
  }
  return playSample(job.sample,{award:true,explicit:job.explicit,tier:job.tier,game:job.game,key:job.key,volume:job.volume,jpc:job.jpc,gap:.1});
 };
 if(wait>0)job.timer=setTimeout(start,wait);else return start();
 return true;
}
function sceneSample(key){
 const game=selected();
 if(key==='chain')return gameChains[game]||'chain';
 if(['cookie-hit','cookie','crack'].includes(key)&&['castella','dango','stick'].includes(game))return {castella:'hit-castella',dango:'hit-dango',stick:'hit-waffle'}[game];
 if(key==='glass'&&['winery','jelly'].includes(game))return game==='jelly'?'hit-jelly':'hit-water';
 if(key==='pop'&&game==='candy')return 'hit-candy';
 if(key==='landing'&&game==='stick')return 'hit-waffle';
 return sceneMap[key];
}
sound=function(kind,options={}){
 const key=String(kind).startsWith('scene-')?String(kind).slice(6):null;
 const sample=key?sceneSample(key):(kind==='crack'?sceneSample(kind):null)||nativeMap[kind];
 if(!sample)return coreSound(kind,options);
 if(sample.startsWith('award-'))return queueAward({game:selected(),tier:Number(sample.slice(-1)),key:'legacy:'+key,
  kind:key,delayMs:options.delay||0,volume:Math.max(.45,Number(options.volume??.8)),jpc:!!options.jpc});
 return playSample(sample,options);
};
stopSounds=function(...args){stop();return coreStop.apply(this,args);};

function play(name='notice',options={}){
 syncScope();
 if(options.source==='ticker'){
  // The scrolling copy is often shown seconds after its event. It cannot own
  // a win fanfare, and a reach label must never sound like a confirmed win.
  if(!options.reach)return denied('ticker-not-owner',name);
  if(options.game===undefined||gameId(options.game)!==selected())return denied('unselected-reach',name);
  if(!Number.isFinite(options.queuedAt)||performance.now()-options.queuedAt>1500)return denied('stale-ticker',name);
  if(!(app?.draws?.length>reachFloorCount)||app.phase!=='playing')return denied('reach-outside-play',name);
  const key=String(app.token)+':'+String(options.key||name);
  if(reachSeen.has(key))return denied('duplicate-reach',name);
  reachSeen.add(key);if(reachSeen.size>128)reachSeen.delete(reachSeen.values().next().value);
  name=name==='reach'?'reach':'high-reach';
 }
 const sample=name==='chain'?(gameChains[selected()]||'chain'):eventMap[name];if(!sample)return false;
 if(sample.startsWith('award-'))return queueAward({game:selected(),tier:Number(sample.slice(-1)),key:'event:'+name,kind:name});
 if(pending||awardVoice||owns(selected())){
  if(['chain','level','sugar','notice','reach','high-reach'].includes(name))return denied('award-accent',name);
 }
 if(['chain','level','sugar','notice'].includes(name)&&time()-lastFoley<.075)return denied('native-foley-owner',name);
 const gap={notice:.18,reach:1.1,'high-reach':1.8,sugar:.8,level:.4,chain:.18,miss:.35}[name]??.08;
 const rate=name==='chain'?1+Math.min(6,chainStep++%7)*.035:1;
 return playSample(sample,{...options,volume:options.volume??(['reach','high-reach'].includes(name)?.67:.58),priority:['reach','high-reach','sugar','level'].includes(name)?1:0,rate,gap});
}
function award(options={}){return queueAward({...options,explicit:true});}
function unlockFromGesture(event){
 if(!event?.isTrusted||!$('sound')?.checked||document.hidden||!inView)return false;
 return unlock();
}
function sugarState(id){
 let state=sugarSeen.get(id);if(!state){state={intro:null,position:null,qualified:false,multiplier:false};sugarSeen.set(id,state);}
 if(sugarSeen.size>32)sugarSeen.delete(sugarSeen.keys().next().value);return state;
}
function sugarTransition(previous,next){
 if(!next?.id)return false;
 const state=sugarState(next.id),same=previous?.id===next.id;
 // A first/restored snapshot is a baseline, including an already earned JPC.
 if(!same){state.qualified=!!next.jpcQualified;return false;}
 const added=Array.isArray(next.draws)&&next.draws.length>(previous.draws?.length||0);
 if(!added)return false;
 if(next.jpcQualified&&!previous.jpcQualified&&!state.qualified){
  state.qualified=true;
  return award({game:'sugar',tier:3,key:'sugar:'+next.id+':qualified',kind:'bonus',sample:'jpc-qualified',volume:.86});
 }
 if(!next.jpcQualified){
  const R=window.SugarChallengeRulesV254,reaches=R?.reaches?.(next)||[];
  if(reaches.length)return play('high-reach',{volume:.6});
  return playSample('sugar',{volume:.35,rate:.92+Math.min(8,next.draws.length)*.025,priority:1,gap:.2});
 }
 return false;
}
function sugarReel({id,intro,position,spinning,multiplier,baseEnd=3250,reelStop=9700,blocked=false}={}){
 if(!id||!Number.isFinite(intro))return false;
 const state=sugarState(id),oldIntro=state.intro,oldPosition=state.position;
 state.intro=intro;state.position=position;
 if(oldIntro===null||intro<oldIntro||blocked||!allowed())return false;
 if(oldIntro<baseEnd&&intro>=baseEnd)return playSample('confirm',{volume:.55,priority:1});
 if(oldIntro<reelStop&&intro>=reelStop&&!state.multiplier){
  state.multiplier=true;
  if(multiplier>=5)return award({game:'sugar',tier:multiplier>=10?3:2,key:'sugar:'+id+':multiplier',kind:'bonus',sample:multiplier>=10?'multiplier-galaxy':'multiplier-high',volume:.8});
  return playSample('multiplier',{volume:multiplier>1?.68:.5,priority:2,gap:.6});
 }
 if(spinning&&oldPosition!==null&&Math.floor(oldPosition)!==Math.floor(position))return playSample('reel-tick',{volume:.25,rate:.9+Math.min(1,(intro-baseEnd)/6000)*.22,gap:.075});
 return false;
}
// Real JPC transitions; the existing render/ticker remains authoritative.
if(typeof celebrateJpc==='function'){
 const nativeCelebrate=celebrateJpc;
 celebrateJpc=function(...args){const already=jpcSession.jackpotShown,result=nativeCelebrate.apply(this,args);
  if(!already&&jpcSession.jackpotShown)award({game:'jpc',tier:4,key:'jpc:'+app.token+':jackpot',kind:'clear',sample:'jackpot',jpc:true,volume:.9});
  return result;
 };
}
if(typeof paintJpcDashboard==='function'){
 const nativePaint=paintJpcDashboard;
 paintJpcDashboard=function(...args){
  const before=jpcSession.active?jpcSession.previousCounts?.filter(n=>n>0).length:0;
  const result=nativePaint.apply(this,args);
  const after=jpcSession.active?jpcSession.previousCounts?.filter(n=>n>0).length:0;
  if(before<24&&after===24)playSample('jpc-reach',{volume:.68,priority:2,jpc:true,gap:2});
  return result;
 };
}
const api={version:VERSION,award,play,unlock:unlockFromGesture,sugarTransition,sugarReel,stop,
 describe:()=>({version:VERSION,enabled:allowed({jpc:isJpc()}),unlocked:!!audio&&audio.state==='running',
  loadedSamples:samples.size,totalSamples:allSamples.length,activeVoices:sfxVoices.size,maxVoices:MAX_VOICES,
  pendingAwards:pending?1:0,...stats,lastEvents:history.map(event=>({...event})),
  sceneRoutes:{...sceneMap},nativeRoutes:{...nativeMap},samples:allSamples.slice(),soundBank:ROOT,
  gameAwardRoutes:Object.fromEntries(Object.entries(gameAwards).map(([game,names])=>[game,names.slice()])),gameChainRoutes:{...gameChains},
  musicDucked:!!duckBus&&duckBus.gain.value<.99,sharedContext:true})};
window.SweetsAudioV277=Object.freeze(api);
window.SweetsEventSound={version:'v281',play:(name,options)=>api.play(name,options),unlock:event=>api.unlock(event)};
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
window.addEventListener('pagehide',stop);
document.addEventListener('click',event=>{
 if(!event.isTrusted||!event.target?.closest?.('button,[role="tab"]')||event.target.closest('#sound'))return;
 play('ui',{volume:.35});
},{capture:false,passive:true});
if(audio)prepareSceneSounds();
})();

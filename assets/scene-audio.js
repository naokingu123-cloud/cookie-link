// Scene-specific samples selected from the supplied SE.rar. Music never enters this bus.
const SCENE_SOUND_KEYS=["drill", "stratum", "melt", "ore", "sugar", "random", "transform", "glass", "landing", "refill", "pop", "triangle", "hexagon", "role", "candy", "cookie", "record", "gift", "delivery", "cookie-hit", "cookie-fall", "cookie-land", "cookie-refill", "chain", "color-burst", "hammer-launch", "hammer-impact", "arrival", "canyon-fall", "canyon-land", "scroll", "return", "renew", "all-drills", "six-hit", "six-miss", "sweep", "line", "finish", "allclear", "bonus", "credit-tick", "credit-done", "pay-step", "pay-lock", "launch", "continue", "scale-tick", "six-count", "big-bonus", "level", "rank", "round", "transfer", "clear"];
const SCENE_AUDIO_REVISION="v5";
const SCENE_SOUND_FILES={"drill": "assets/audio/scenes/drill.wav", "stratum": "assets/audio/scenes/stratum.wav", "melt": "assets/audio/scenes/melt.wav", "ore": "assets/audio/scenes/ore-v5.wav", "sugar": "assets/audio/scenes/sugar-v5.wav", "random": "assets/audio/scenes/random.wav", "transform": "assets/audio/scenes/transform.wav", "glass": "assets/audio/scenes/glass.wav", "landing": "assets/audio/scenes/landing.wav", "refill": "assets/audio/scenes/refill.wav", "pop": "assets/audio/scenes/pop.wav", "triangle": "assets/audio/scenes/triangle-v5.wav", "hexagon": "assets/audio/scenes/hexagon-v5.wav", "role": "assets/audio/scenes/role.wav", "candy": "assets/audio/scenes/candy.wav", "cookie": "assets/audio/scenes/cookie.wav", "record": "assets/audio/scenes/record-v5.wav", "gift": "assets/audio/scenes/gift.wav", "delivery": "assets/audio/scenes/delivery.wav", "cookie-hit": "assets/audio/scenes/cookie-hit.wav", "cookie-fall": "assets/audio/scenes/cookie-fall.wav", "cookie-land": "assets/audio/scenes/cookie-land.wav", "cookie-refill": "assets/audio/scenes/cookie-refill.wav", "chain": "assets/audio/scenes/chain.wav", "color-burst": "assets/audio/scenes/color-burst.wav", "hammer-launch": "assets/audio/scenes/hammer-launch.wav", "hammer-impact": "assets/audio/scenes/hammer-impact.wav", "arrival": "assets/audio/scenes/arrival-v3.wav", "canyon-fall": "assets/audio/scenes/canyon-fall.wav", "canyon-land": "assets/audio/scenes/canyon-land.wav", "scroll": "assets/audio/scenes/scroll.wav", "return": "assets/audio/scenes/return.wav", "renew": "assets/audio/scenes/renew.wav", "all-drills": "assets/audio/scenes/all-drills.wav", "six-hit": "assets/audio/scenes/six-hit.wav", "six-miss": "assets/audio/scenes/six-miss.wav", "sweep": "assets/audio/scenes/sweep.wav", "line": "assets/audio/scenes/line-v5.wav", "finish": "assets/audio/scenes/finish.wav", "allclear": "assets/audio/scenes/allclear-v5.wav", "bonus": "assets/audio/scenes/bonus-v5.wav", "credit-tick": "assets/audio/scenes/credit-tick-v5.wav", "credit-done": "assets/audio/scenes/credit-done-v5.wav", "pay-step": "assets/audio/scenes/pay-step-v5.wav", "pay-lock": "assets/audio/scenes/pay-lock-v5.wav", "launch": "assets/audio/scenes/launch-v4.wav", "continue": "assets/audio/scenes/continue-v5.wav", "scale-tick": "assets/audio/scenes/scale-tick-v5.wav", "six-count": "assets/audio/scenes/six-count-v5.wav", "big-bonus": "assets/audio/scenes/big-bonus-v5.wav", "level": "assets/audio/scenes/level-v4.wav", "rank": "assets/audio/scenes/rank-v4.wav", "round": "assets/audio/scenes/round-v5.wav", "transfer": "assets/audio/scenes/transfer-v5.wav", "clear": "assets/audio/scenes/clear-v4.wav"};
const sceneSoundFile=key=>SCENE_SOUND_FILES[key]+"?rev="+SCENE_AUDIO_REVISION;
const sceneSoundLoads=new Map();let sceneSoundPreparation=null;
function sceneSoundsReady(){return SCENE_SOUND_KEYS.every(key=>sfxBuffers.has('scene-'+key));}
function prepareSceneSounds(){
 if(!audio)return Promise.resolve([]);if(sceneSoundPreparation)return sceneSoundPreparation;
 const pending=SCENE_SOUND_KEYS.filter(key=>!sfxBuffers.has('scene-'+key));let cursor=0;
 async function worker(){while(cursor<pending.length){const key=pending[cursor++];for(let attempt=0;attempt<2;attempt++){
  try{const buffer=await loadEffectSample(sceneSoundFile(key));sfxBuffers.set('scene-'+key,buffer);break;}
  catch(error){effectBytes.delete(sceneSoundFile(key));if(attempt===1)console.warn('Scene sound unavailable: '+key,error);}
 }}}
 sceneSoundPreparation=Promise.all(Array.from({length:Math.min(3,pending.length)},worker)).then(()=>SCENE_SOUND_KEYS.map(key=>sfxBuffers.has('scene-'+key))).finally(()=>{sceneSoundPreparation=null;});return sceneSoundPreparation;
}
// [gain ceiling, retrigger interval in milliseconds, priority]. Only effects are balanced.
const SCENE_SOUND_PROFILES={"drill": [0.45, 120, 0], "stratum": [0.45, 90, 0], "melt": [0.45, 90, 0], "ore": [0.45, 120, 0], "sugar": [0.7, 180, 1], "level": [0.45, 120, 0], "rank": [0.7, 180, 1], "random": [0.7, 180, 1], "transform": [0.7, 180, 1], "transfer": [0.45, 120, 0], "glass": [0.45, 90, 0], "landing": [0.45, 90, 0], "refill": [0.45, 90, 0], "pop": [0.45, 90, 0], "triangle": [0.7, 180, 1], "hexagon": [0.7, 180, 1], "role": [0.45, 120, 0], "round": [0.7, 180, 1], "candy": [0.45, 90, 0], "cookie": [0.45, 90, 0], "record": [0.7, 180, 1], "gift": [0.7, 180, 1], "delivery": [0.45, 120, 0], "cookie-hit": [0.45, 90, 0], "cookie-fall": [0.45, 90, 0], "cookie-land": [0.45, 90, 0], "cookie-refill": [0.45, 90, 0], "chain": [0.45, 90, 0], "color-burst": [0.7, 180, 1], "hammer-launch": [0.45, 120, 0], "hammer-impact": [0.65, 120, 0], "arrival": [0.65, 40, 0], "canyon-fall": [0.45, 90, 0], "canyon-land": [0.45, 90, 0], "scroll": [0.45, 90, 0], "return": [0.45, 90, 0], "renew": [0.45, 90, 0], "all-drills": [0.7, 180, 1], "six-hit": [0.45, 90, 0], "six-miss": [0.45, 90, 0], "sweep": [0.45, 120, 0], "line": [0.7, 180, 1], "finish": [0.45, 120, 0], "allclear": [1, 600, 2], "clear": [1, 600, 2], "bonus": [1, 600, 2], "credit-tick": [0.2, 110, 0], "credit-done": [0.65, 300, 1], "pay-step": [0.3, 90, 0], "pay-lock": [0.65, 200, 1], "launch": [0.55, 120, 1], "continue": [0.8, 700, 2], "scale-tick": [0.17, 120, 0], "six-count": [0.18, 120, 0], "big-bonus": [1, 600, 2]};
const sceneSoundLast=new Map(),sceneSoundBursts=new Map();let sceneAccentUntil=0;
function sceneSound(key,options={}){
 const jpc=!!options.jpc&&jpcSession.active&&!userPaused&&!menuOpen;
 if(!audio||audio.state!=='running'||!$('sound').checked||(app?.paused&&!jpc)||document.hidden||!inView)return false;
 const name='scene-'+key;if(!sfxBuffers.has(name)){prepareSceneSounds();return false;}
 const [ceiling,gap,priority]=SCENE_SOUND_PROFILES[key]||[.25,120,0],now=audio.currentTime,at=now+(options.delay||0)/1000;
 if(at-(sceneSoundLast.get(key)??-Infinity)<gap/1000)return false;
 const previous=sceneSoundLast.get(key)??-Infinity,burst=priority===0&&at-previous<.38?(sceneSoundBursts.get(key)||0)+1:0;
 sceneSoundBursts.set(key,burst);sceneSoundLast.set(key,at);
 if(priority===2)sceneAccentUntil=at+Math.min(3,sfxBuffers.get(name).duration);
 const continuous=['credit-tick','scale-tick','six-count','pay-step'].includes(key);
 const volume=(continuous?1:Math.max(.35,.7**burst))*ceiling*Math.min(1,Math.max(0,options.volume??1))*(priority===0&&at<sceneAccentUntil?.4:1);
 sound(name,{...options,volume,priority});return true;
}
function cookieSceneEvent(s,ev,e){
 const rows=new Map(e.board.flatMap((row,r)=>row.filter(Boolean).map(t=>[t.id,r]))),previous=s.cookieSoundRows;s.cookieSoundRows=rows;
 if(s.i!==active)return;
 if(ev.phase==='hit'&&ev.cells?.length)sceneSound('cookie-hit');
 if(ev.phase==='link')sceneSound('chain',{rate:1+Math.min(6,ev.depth||0)*.025});
 if(ev.phase==='fall'&&previous&&[...rows].some(([id,r])=>previous.has(id)&&previous.get(id)<r)){sceneSound('cookie-fall');sceneSound('cookie-land',{delay:180/e.speed});}
 if(ev.phase==='refill'&&ev.freshCells?.length){sceneSound('cookie-refill');sceneSound('cookie-land',{delay:Math.max(100,(ev.duration||350)-60)});}
}

// Tick only when the displayed counter changes; never replay values after a pause/reset.
function sceneCountSound(owner,key,value,version,enabled=true){
 const counts=owner.sceneCounts||(owner.sceneCounts={}),previous=counts[key];counts[key]={value,version,pulses:previous?.version===version?(previous.pulses||0):0};
 if(enabled&&previous?.version===version&&Number.isFinite(value)&&value>previous.value){const n=counts[key].pulses;if(sceneSound(key,{rate:.96+Math.min(12,n)*.018}))counts[key].pulses++;}
}
function creditPresentationAudio(a){
 const previous=a.audioPayoutPhase;a.audioPayoutPhase=a.phase;
 sceneCountSound(a,'credit-tick',a.displayCredit,a.token,a.phase==='paying');
 if(previous==='paying'&&a.phase==='complete'&&a.payout?.amount>0)sceneSound('credit-done');
}

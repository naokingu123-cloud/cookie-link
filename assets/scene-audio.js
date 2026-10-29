// Scene-specific samples selected from the supplied SE.rar. Music never enters this bus.
const SCENE_SOUND_KEYS=["drill", "stratum", "melt", "ore", "sugar", "level", "rank", "random", "transform", "transfer", "glass", "landing", "refill", "pop", "triangle", "hexagon", "role", "round", "candy", "cookie", "record", "gift", "delivery", "cookie-hit", "cookie-fall", "cookie-land", "cookie-refill", "chain", "color-burst", "hammer-launch", "hammer-impact", "arrival", "canyon-fall", "canyon-land", "scroll", "return", "renew", "all-drills", "six-hit", "six-miss", "sweep", "line", "finish", "allclear", "clear", "bonus"];
const sceneSoundLoads=new Map();
function prepareSceneSounds(){
 if(!audio)return Promise.resolve([]);
 return Promise.all(SCENE_SOUND_KEYS.map(key=>{
  if(sfxBuffers.has('scene-'+key))return Promise.resolve(true);
  if(sceneSoundLoads.has(key))return sceneSoundLoads.get(key);
  const task=loadEffectSample('assets/audio/scenes/'+key+'.wav').then(buffer=>{sfxBuffers.set('scene-'+key,buffer);return true;}).catch(error=>{console.warn('Scene sound unavailable: '+key,error);return false;}).finally(()=>sceneSoundLoads.delete(key));sceneSoundLoads.set(key,task);return task;
 }));
}
// [gain ceiling, retrigger interval in milliseconds, priority]. Only effects are balanced.
const SCENE_SOUND_PROFILES={"drill": [0.28, 120, 0], "stratum": [0.16, 90, 0], "melt": [0.16, 90, 0], "ore": [0.28, 120, 0], "sugar": [0.52, 180, 1], "level": [0.28, 120, 0], "rank": [0.52, 180, 1], "random": [0.52, 180, 1], "transform": [0.52, 180, 1], "transfer": [0.28, 120, 0], "glass": [0.16, 90, 0], "landing": [0.16, 90, 0], "refill": [0.16, 90, 0], "pop": [0.16, 90, 0], "triangle": [0.52, 180, 1], "hexagon": [0.52, 180, 1], "role": [0.32, 120, 0], "round": [0.52, 180, 1], "candy": [0.16, 90, 0], "cookie": [0.16, 90, 0], "record": [0.52, 180, 1], "gift": [0.52, 180, 1], "delivery": [0.28, 120, 0], "cookie-hit": [0.16, 90, 0], "cookie-fall": [0.16, 90, 0], "cookie-land": [0.16, 90, 0], "cookie-refill": [0.16, 90, 0], "chain": [0.16, 90, 0], "color-burst": [0.52, 180, 1], "hammer-launch": [0.28, 120, 0], "hammer-impact": [0.28, 120, 0], "arrival": [0.18, 40, 0], "canyon-fall": [0.16, 90, 0], "canyon-land": [0.16, 90, 0], "scroll": [0.16, 90, 0], "return": [0.16, 90, 0], "renew": [0.16, 90, 0], "all-drills": [0.52, 180, 1], "six-hit": [0.16, 90, 0], "six-miss": [0.16, 90, 0], "sweep": [0.28, 120, 0], "line": [0.52, 180, 1], "finish": [0.28, 120, 0], "allclear": [1, 600, 2], "clear": [1, 600, 2], "bonus": [1, 600, 2]};
const sceneSoundLast=new Map();let sceneAccentUntil=0;
function sceneSound(key,options={}){
 const jpc=!!options.jpc&&jpcSession.active&&!userPaused&&!menuOpen;
 if(!audio||audio.state!=='running'||!$('sound').checked||(app?.paused&&!jpc)||document.hidden||!inView)return false;
 const name='scene-'+key;if(!sfxBuffers.has(name)){prepareSceneSounds();return false;}
 const [ceiling,gap,priority]=SCENE_SOUND_PROFILES[key]||[.25,120,0],now=audio.currentTime,at=now+(options.delay||0)/1000;
 if(at-(sceneSoundLast.get(key)??-Infinity)<gap/1000)return false;
 sceneSoundLast.set(key,at);
 if(priority===2)sceneAccentUntil=at+Math.min(3,sfxBuffers.get(name).duration);
 const volume=ceiling*Math.min(1,Math.max(0,options.volume??1))*(priority===0&&at<sceneAccentUntil?.4:1);
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

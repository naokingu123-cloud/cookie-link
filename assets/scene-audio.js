// Scene-specific samples selected from the supplied SE.rar. Music never enters this bus.
const SCENE_SOUND_KEYS=["drill", "stratum", "melt", "ore", "sugar", "level", "rank", "random", "transform", "clear", "bonus", "transfer", "glass", "landing", "refill", "pop", "triangle", "hexagon", "role", "round", "candy", "cookie", "record", "gift", "allclear", "delivery"];
const sceneSoundLoads=new Map();
function prepareSceneSounds(){
 if(!audio)return Promise.resolve([]);
 return Promise.all(SCENE_SOUND_KEYS.map(key=>{
  if(sfxBuffers.has('scene-'+key))return Promise.resolve(true);
  if(sceneSoundLoads.has(key))return sceneSoundLoads.get(key);
  const task=loadEffectSample('assets/audio/scenes/'+key+'.wav').then(buffer=>{sfxBuffers.set('scene-'+key,buffer);return true;}).catch(error=>{console.warn('Scene sound unavailable: '+key,error);return false;}).finally(()=>sceneSoundLoads.delete(key));sceneSoundLoads.set(key,task);return task;
 }));
}
function sceneSound(key,options={}){
 const name='scene-'+key;
 if(!sfxBuffers.has(name)){prepareSceneSounds();return false;}
 sound(name,options);return true;
}

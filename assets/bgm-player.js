/* A single music transport. Managed tracks loop on the AudioContext sample clock;
   the existing BET track keeps its HTML media transport. No timeupdate seeking. */
class LoopingBgmPlayer {
 constructor(){this.media=new Audio();this._src='';this._loop=true;this._rate=1;this._offset=0;this._serial=0;this._paused=true;this._source=null;this._buffer=null;this._cache=new Map();this._loads=new Map();this._metadata=fetch('assets/audio/bgm-loops.json').then(r=>{if(!r.ok)throw Error('BGM loop metadata unavailable');return r.json();});this._metadata.catch(()=>{});}
 managed(src=this._src){return /assets\/audio\/(vocal-\d-\d|jpc-(?:[1-4]|reach))\.mp3$/.test(src);}
 connect(context,gain){this.context=context;this.gain=gain;if(!this.mediaSource){this.mediaSource=context.createMediaElementSource(this.media);this.mediaSource.connect(gain);}}
 set src(v){this.pause();this._src=v;this._offset=0;this._buffer=null;this._points=null;this.error=null;if(!this.managed())this.media.src=v;}
 get src(){return this._src;}
 setAttribute(k,v){this.media.setAttribute(k,v);}
 getAttribute(k){return k==='src'?this._src:this.media.getAttribute(k);}
 set preload(v){this.media.preload=v;}
 set volume(v){this.media.volume=v;}
 get volume(){return this.media.volume;}
 set muted(v){this.media.muted=v;}
 get muted(){return this.media.muted;}
 set loop(v){this._loop=v;this.media.loop=v;if(this._source)this._source.loop=v;}
 get loop(){return this._loop;}
 set playbackRate(v){this._rate=v;this.media.playbackRate=v;}
 get playbackRate(){return this._rate;}
 get paused(){return this.managed()?this._paused:this.media.paused;}
 get readyState(){return this.managed()?(this._buffer?4:0):this.media.readyState;}
 get duration(){return this.managed()?(this._buffer?.duration||NaN):this.media.duration;}
 get currentTime(){if(!this.managed())return this.media.currentTime;let t=this._offset;if(!this._paused&&this._source)t+=(this.context.currentTime-this._started)*this._rate;const p=this._points;if(this._loop&&p&&t>=p.end)t=p.start+(t-p.end)%(p.end-p.start);return t;}
 set currentTime(v){if(!this.managed()){this.media.currentTime=v;return;}const running=!this._paused;this.pause();this._offset=Math.max(0,v);if(running)this.play().catch(()=>{});}
 load(){if(!this.managed())this.media.load();else if(this.context)this.prepare(this._src).catch(()=>{});}
 async prepare(src){
  if(!this.managed(src)||!this.context)return null;
  if(this._cache.has(src))return this._cache.get(src);
  if(this._loads.has(src))return this._loads.get(src);
  const task=Promise.all([this._metadata,fetch(src).then(r=>{if(!r.ok)throw Error('BGM download failed: '+src);return r.arrayBuffer();})]).then(async([meta,bytes])=>{
   const buffer=await this.context.decodeAudioData(bytes),m=meta[src];if(!m)throw Error('Missing BGM loop: '+src);
   const sr=buffer.sampleRate,start=Math.max(0,Math.min(buffer.duration-.1,m.start)),end=Math.min(buffer.duration,m.end);
   if(end-start<1)throw Error('Invalid BGM loop: '+src);
   const n=Math.min(Math.round(m.crossfade*sr),Math.floor(start*sr)),e=Math.round(end*sr),s=Math.round(start*sr);
   // Blend into the pre-roll immediately before loopStart, preserving loop length/beat.
   for(let c=0;c<buffer.numberOfChannels;c++){const d=buffer.getChannelData(c);for(let k=0;k<n;k++){const w=(k+1)/n;d[e-n+k]=d[e-n+k]*(1-w)+d[s-n+k]*w;}}
   const value={buffer,points:{start,end}};this._cache.set(src,value);
   while(this._cache.size>2){const key=[...this._cache.keys()].find(k=>k!==this._src&&k!==src);if(!key)break;this._cache.delete(key);}
   return value;
  }).finally(()=>this._loads.delete(src));this._loads.set(src,task);return task;
 }
 async play(){
  if(!this.managed())return this.media.play();
  if(!this.context||!this.gain)throw Error('BGM audio context not connected');
  if(!this._paused&&this._source)return;
  const serial=++this._serial,src=this._src;this._paused=false;
  try{
   const value=await this.prepare(src);if(serial!==this._serial||src!==this._src||this._paused)return;
   this._buffer=value.buffer;this._points=value.points;
   const source=this.context.createBufferSource();source.buffer=value.buffer;source.loop=this._loop;source.loopStart=value.points.start;source.loopEnd=value.points.end;source.playbackRate.value=this._rate;source.connect(this.gain);
   let offset=this._offset;if(source.loop&&offset>=source.loopEnd)offset=source.loopStart+(offset-source.loopEnd)%(source.loopEnd-source.loopStart);
   this._offset=offset;this._started=this.context.currentTime;this._source=source;
   source.onended=()=>{source.disconnect();if(this._source===source){this._source=null;this._paused=true;}};source.start(0,offset);
  }catch(error){if(serial===this._serial){this._paused=true;this.error=error;}throw error;}
 }
 pause(){
  if(this.managed()){
   const offset=this.currentTime;this._serial++;this._paused=true;this._offset=offset;
   if(this._source){const s=this._source;this._source=null;s.onended=null;try{s.stop();}catch{}s.disconnect();}
  }
  this.media.pause();
 }
}
window.LoopingBgmPlayer=LoopingBgmPlayer;

/* SWEETS LINK v158 — original scene-aware arcade cue synthesizer.
   No copyrighted game recording is embedded or streamed. */
(()=>{
'use strict';
const VERSION='v158';
if(window.SweetsEventSound?.version===VERSION)return;
const state={audio:null,lastCue:new Map(),chainStep:0};

function enabled(){
 const toggle=document.getElementById('sound');
 return !!toggle?.checked&&!document.hidden;
}
function ensureAudio(fromGesture=false){
 const AudioContextClass=window.AudioContext||window.webkitAudioContext;
 if(!AudioContextClass||!enabled())return null;
 if(!state.audio){
  const context=new AudioContextClass(),master=context.createGain(),compressor=context.createDynamicsCompressor();
  master.gain.value=.72;compressor.threshold.value=-18;compressor.knee.value=20;compressor.ratio.value=5;compressor.attack.value=.004;compressor.release.value=.22;
  master.connect(compressor);compressor.connect(context.destination);state.audio={context,master,compressor};
 }
 const {context}=state.audio;
 if(fromGesture&&context.state==='suspended')context.resume().catch(()=>{});
 return context.state==='running'?state.audio:null;
}
const midi=number=>440*Math.pow(2,(number-69)/12);
function tone(bus,frequency,start,duration,volume=.04,type='sine',endFrequency=0){
 const {context,master}=bus,oscillator=context.createOscillator(),gain=context.createGain();
 oscillator.type=type;oscillator.frequency.setValueAtTime(Math.max(30,frequency),start);
 if(endFrequency>0)oscillator.frequency.exponentialRampToValueAtTime(Math.max(30,endFrequency),start+duration*.82);
 gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),start+.008);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
 oscillator.connect(gain);gain.connect(master);oscillator.start(start);oscillator.stop(start+duration+.035);
}
function bell(bus,frequency,start,duration=.48,volume=.038){
 tone(bus,frequency,start,duration,volume,'sine');tone(bus,frequency*2.01,start,duration*.70,volume*.31,'sine');tone(bus,frequency*3.98,start,duration*.48,volume*.13,'sine');
}
function shimmer(bus,start,duration=.36,volume=.011){
 const {context,master}=bus,length=Math.max(1,Math.floor(context.sampleRate*duration)),buffer=context.createBuffer(1,length,context.sampleRate),data=buffer.getChannelData(0);
 for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/length,2.2);
 const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();
 filter.type='bandpass';filter.frequency.value=5600;filter.Q.value=.8;gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(volume,start+.012);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
 source.buffer=buffer;source.connect(filter);filter.connect(gain);gain.connect(master);source.start(start);source.stop(start+duration+.02);
}
function play(name='notice'){
 if(!enabled())return;
 const cooldown={notice:220,reach:650,'high-reach':1050,'high-win':1100,special:1800,sugar:1300,level:650,chain:220,miss:500}[name]||500;
 const now=performance.now(),last=state.lastCue.get(name)||0;if(now-last<cooldown)return;
 const bus=ensureAudio(false);if(!bus)return;state.lastCue.set(name,now);const t=bus.context.currentTime+.018;
 switch(name){
  case 'reach':bell(bus,midi(76),t,.34,.032);bell(bus,midi(81),t+.13,.46,.043);break;
  case 'high-reach':[72,76,79,84].forEach((n,i)=>bell(bus,midi(n),t+i*.085,.50-i*.035,.036+i*.004));shimmer(bus,t+.16,.43,.010);break;
  case 'high-win':[67,72,76,79,84].forEach((n,i)=>bell(bus,midi(n),t+i*.075,.56,.032+i*.003));[72,76,79].forEach(n=>tone(bus,midi(n),t+.36,.62,.020,'triangle'));shimmer(bus,t+.26,.52,.012);break;
  case 'special':[60,64,67,72,76,79,84].forEach((n,i)=>bell(bus,midi(n),t+i*.072,.65,.029+i*.003));[72,76,79,84].forEach(n=>tone(bus,midi(n),t+.43,.86,.023,'triangle'));shimmer(bus,t+.18,.72,.016);tone(bus,midi(48),t,.32,.028,'sine',midi(55));break;
  case 'sugar':[84,88,91,96,100].forEach((n,i)=>bell(bus,midi(n),t+i*.09,.48-i*.025,.030+i*.002));shimmer(bus,t+.12,.58,.014);break;
  case 'level':[67,71,74,79].forEach((n,i)=>bell(bus,midi(n),t+i*.065,.34,.030+i*.003));break;
  case 'chain':bell(bus,midi(76+Math.min(12,state.chainStep++%13)),t,.28,.034);break;
  case 'miss':tone(bus,midi(62),t,.34,.026,'triangle',midi(55));break;
  default:bell(bus,midi(81),t,.28,.028);
 }
}
function unlock(event){if(event&&!event.isTrusted)return;ensureAudio(true);}
for(const type of ['pointerdown','touchend','keydown'])document.addEventListener(type,unlock,{capture:true,passive:true});
document.getElementById('sound')?.addEventListener('change',event=>{if(event.target.checked)unlock(event);});
window.SweetsEventSound={version:VERSION,play,unlock};
console.info('[SweetsSfxV158] original reach, high-win, level, sugar and special cues enabled');
})();

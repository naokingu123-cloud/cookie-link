/* Feed the real Gelato engine into the production observer and raster helper.
 * CPU-only DOM/image stubs verify event ownership and exact semantic amounts;
 * browser evidence separately verifies the actual generated pixels/layout. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {loadGelato,random,buildWitnesses,decode,nativeState,drawNative} from './gelato-v297-fixture.mjs';

const read=file=>fs.readFile(new URL('../'+file,import.meta.url),'utf8');
const [awardSource,presenterSource]=await Promise.all([read('assets/gelato-award-v297.js'),read('assets/award-presentation-v277.js')]);
const plain=value=>JSON.parse(JSON.stringify(value));
const q=loadGelato();
async function harness({seed=2977919,fields,reduced=false,search='',bet=333,originalRestore}={}){
 let now=100,next=0,rngCalls=0;const frames=new Map(),timers=new Map(),listeners=new Map(),draws=[],events=[],sounds=[];
 const rng=random(seed),engine=new q.GelatoEngine(()=>{rngCalls++;return rng();},event=>events.push(plain(event)),async()=>{});
 engine.wait=async(_ms,token)=>token===engine.version;engine.roundBet=bet;
 if(fields)Object.assign(engine,decode(fields));
 if(originalRestore)engine.afterCheckpointRestoreV247=originalRestore;
 const noop=()=>{},gradient={addColorStop:noop};
 class Element{
  constructor(tag='div',w=320,h=320){
   const classes=new Set();Object.assign(this,{tagName:tag.toUpperCase(),clientWidth:w,clientHeight:h,width:w,height:h,hidden:false,dataset:{},children:[],parentElement:null,
    classList:{toggle(name,on){on?classes.add(name):classes.delete(name);},contains:name=>classes.has(name)},classes});
  }
  append(child){child.parentElement=this;this.children.push(child);}setAttribute(){}
  getBoundingClientRect(){return {left:0,top:0,right:this.clientWidth,bottom:this.clientHeight,width:this.clientWidth,height:this.clientHeight};}
  querySelector(selector){return selector==='.mini-wrap'?this.wrap:this.surface||null;}
  getContext(){
   const self=this;return new Proxy({canvas:self,globalAlpha:1,
    drawImage(source,...args){draws.push({source:source.src||'existing-gelato-raster',args});},measureText:value=>({width:String(value).length*12}),
    createLinearGradient:()=>gradient,createRadialGradient:()=>gradient,
    getImageData(_x,_y,w,h){
     const data=new Uint8ClampedArray(w*h*4);
     for(let y=0;y<h;y++)for(let x=0;x<w;x++)if((x%(w/4))>w/4*.22&&(x%(w/4))<w/4*.78&&(y%(h/3))>h/3*.18&&(y%(h/3))<h/3*.82)data[(y*w+x)*4+3]=255;
     return {data};
    }
   },{get:(o,key)=>key in o?o[key]:noop});
  }
 }
 class FakeImage{
  set src(url){this._src=url;this.naturalWidth=120;this.naturalHeight=url.includes('digits.webp')?90:80;this.onload?.();}
  get src(){return this._src;}
 }
 const board=new Element('canvas'),parent=new Element(),panel=new Element('div',640,520),tab=new Element('div',160,160),wrap=new Element('div',160,160),mini=new Element('canvas',160,160),sugar=new Element('div',80,30);
 parent.append(board);panel.append(parent);panel.surface=board;tab.append(wrap);wrap.append(mini);tab.wrap=wrap;tab.surface=mini;
 const slot={i:0,engine,panel,tab,sugarAwardScreen:sugar};
 // Match the real UI adapter: only a native sugaraward makes its existing
 // receipt active. This is separate from the engine's native prize fields.
 const onEvent=engine.onEvent;engine.onEvent=function(event,...args){if(event.phase==='sugaraward')slot.sugarAwardActive=true;return Reflect.apply(onEvent,this,[event,...args]);};
 const app={engines:[engine],phase:'playing',token:1,paused:false,enabled:[true],locked:[bet],random:()=>{throw Error('award sampled game RNG');}};
 const sprite={width:300,height:280,naturalWidth:300,naturalHeight:280};
 const window={devicePixelRatio:1,SweetsLineup:{ids:['gelato'],chosen:['gelato']},addEventListener:(name,callback)=>listeners.set('window:'+name,callback),
  SweetsBoardArtV275:{loaded:true,ready:Promise.resolve(true),sprite:()=>sprite},
  SweetsAwardArtV277:{ready:Promise.resolve(true),sprite:()=>sprite},SweetsAudioV277:{award:cue=>sounds.push(plain(cue))},
  GelatoPrism:{geometry:{faces:q.FACES.length},awardFaceNodesV277:id=>q.FACES[id]?.nodes.slice()||[],
   hitGeometryV276:(w,h,_mini,anchor)=>{const p=q.RAW[anchor.id];return p?{x:p[0]/500*w,y:p[1]/500*h,r:Math.min(w,h)*.04}:null;}}
 };
 const safeMath=Object.create(Math);safeMath.random=()=>{throw Error('award sampled ambient RNG');};
 const media={matches:reduced,addEventListener:(name,callback)=>listeners.set('media:'+name,callback)};
 const context=vm.createContext({window,app,slots:[slot],active:0,inView:true,motionReduced:false,location:{search},URLSearchParams,console,Math:safeMath,Image:FakeImage,
  document:{hidden:false,createElement:tag=>new Element(tag),addEventListener:(name,callback)=>listeners.set(name,callback)},
  performance:{now:()=>now},matchMedia:()=>media,medalWin:(bet,hundredths)=>Math.floor(bet*hundredths/100),
  requestAnimationFrame:callback=>{const id=++next;frames.set(id,callback);return id;},cancelAnimationFrame:id=>frames.delete(id),
  setTimeout:(callback,ms)=>{const id=++next;timers.set(id,{callback,at:now+ms});return id;},clearTimeout:id=>timers.delete(id)
 });
 vm.runInContext(awardSource,context);await window.GelatoAwardV297?.ready;vm.runInContext(presenterSource,context);
 const advance=ms=>{for(let i=0;i<ms;i+=16){now+=16;const active=[...frames.values()];frames.clear();for(const fn of active)fn(now);for(const [id,timer]of [...timers])if(timer.at<=now){timers.delete(id);timer.callback();}}};
 engine.start();events.length=0;
 return {engine,app,slot,context,window,events,draws,sounds,listeners,frames,timers,advance,rngCalls:()=>rngCalls,
  art:window.GelatoAwardV297,api:window.SweetsAwardsV277,ctx:board.getContext('2d')};
}

const {witnesses}=await buildWitnesses(),results=[];
for(const [name,fixture]of Object.entries(witnesses)){
 const h=await harness({fields:fixture.fields}),proof=fixture.proof,rngBefore=h.rngCalls();
 assert.deepEqual(nativeState(h.engine),fixture.state,'observer leaves the native '+name+' checkpoint unchanged');
 await drawNative(h.engine,fixture.next);
 assert.deepEqual(nativeState(h.engine),proof.stateAfter,'observer leaves the exact native '+name+' result unchanged');
 assert.equal(h.rngCalls(),rngBefore,'no presentation RNG consumption');
 const native=h.events.filter(event=>event.phase==='gelatoFill');assert.equal(native.length,1,'one native award event');
 const history=h.api.describe().history;assert.equal(history.length,1,'one illustrated cue per fill, including combined count/collector awards');
 const cue=history[0],data=cue.gelato;
 assert.equal(cue.game,'gelato');assert.equal(cue.phase,'gelatoFill');assert.equal(cue.number,fixture.next);
 assert.equal(cue.gain,proof.gain);assert.equal(cue.total,false);assert.equal(cue.win,Math.floor(333*proof.gain/100),'exact single native gain converted once');
 assert.equal(data.mode,proof.mode);assert.equal(data.filledCount,proof.filledCount);assert.equal(data.totalFaces,24);
 assert.deepEqual(plain(data.counts),proof.counts);assert.deepEqual(plain(data.newFaces),proof.newFaces);
 assert.deepEqual(plain(data.newlyCompleted),proof.newlyCompleted);
 assert.equal(data.countMultiplier,proof.countMultiplier);assert.equal(cue.tier,proof.full?4:proof.gain>=1000?3:proof.gain>=300?2:1);
 for(const color of data.colors){
  assert.equal(color.count,proof.counts[color.grade]);
  assert.equal(color.acquired,proof.newFaces.filter(id=>h.engine.faceGrades[id]===color.grade).length);
  assert.equal(color.newlyComplete,proof.newlyCompleted.includes(color.grade));
  assert.equal(color.complete,color.grade>0&&proof.counts[color.grade]===4);
 }
 assert(Object.isFrozen(data)&&Object.isFrozen(data.counts)&&Object.isFrozen(data.colors)&&data.colors.every(Object.isFrozen));
 assert.throws(()=>{data.counts[0]=99;},TypeError,'diagnostics cannot change a queued cue');
 h.engine.emit('gelatoFill',native[0]);assert.equal(h.api.describe().history.length,1,'exact native duplicate cannot create another badge');
 h.advance(500);
 assert(h.art.describe().mainPaints>0);assert.equal(h.art.describe().last.mode,proof.mode);
 assert.equal(h.art.describe().last.win,cue.win);assert.equal(h.art.describe().last.source,'assets/gelato-art-v297/award-'+proof.mode+'.webp');
 assert(h.art.describe().last.rasterNumbers);assert.equal(h.art.describe().digitSource,'gelato-v297');
 assert.deepEqual(plain(h.art.describe().failures),[]);
 assert(h.draws.some(draw=>draw.source.includes('/digits.webp')),'the generated digits atlas renders the live numeric amount');
 assert(h.slot.sugarAwardScreen.classList.contains('gelato-v297-compact'),'real Sugar receipt is compact while loaded Gelato artwork owns center');
 assert(h.slot.panel.classList.contains('gelato-v297-award-owned'),'one owner suppresses the duplicate native flash');
 assert.equal(h.slot.panel.classList.contains('gelato-v297-sugar-owned'),h.events.some(event=>event.phase==='sugaraward'),'Sugar flash is suppressed only with a genuine active shared receipt');
 assert(!h.slot.sugarAwardScreen.classList.contains('choco-v295-compact'));
 h.context.active=1;h.advance(64);assert(h.art.describe().miniPaints>0,'same exact amount and color snapshot renders in the miniature');
 assert(h.art.describe().last.label.includes(data.filledCount+' / '+data.totalFaces),'miniature keeps the actual collected/total panel count');
 assert.equal(h.sounds.length,1,'selection/miniature rendering cannot duplicate fanfare');
 const totalCue={...cue,total:true,win:Math.floor(333*h.engine.totalHundredths/100)};
 assert(h.art.paint(h.ctx,{cue:totalCue,width:480,height:320,still:true}));
 assert.equal(h.art.describe().last.mode,proof.mode);assert.match(h.art.describe().last.label,/獲得合計/);
 if(name!=='full'){
  assert(h.art.paint(h.ctx,{cue:{...totalCue,gelato:{...data,mode:'full',full:true}},width:480,height:320,still:true}));
  assert.notEqual(h.art.describe().last.mode,'full','partial native board cannot falsely acquire a full-completion frame');
 }
 const reported=h.art.describe().last;reported.counts[0]=99;reported.colors[0].count=99;
 assert.notEqual(h.art.describe().last.counts[0],99,'paint diagnostics are defensive copies');
 h.advance(4000);assert(!h.slot.sugarAwardScreen.classList.contains('gelato-v297-compact'));assert(!h.slot.panel.classList.contains('gelato-v297-award-owned'));
 assert.equal(h.api.describe().errors,0);
 results.push({name,mode:data.mode,gain:cue.gain,win:cue.win,filled:data.filledCount,newlyCompleted:plain(data.newlyCompleted)});
}

// Full after a hidden real collector event must announce only the three
// remaining colors. No replay, reset, repaint or restoration awards anything.
const hidden=await harness({fields:witnesses.collector.fields});
hidden.context.document.hidden=true;hidden.listeners.get('visibilitychange')();
await drawNative(hidden.engine,witnesses.collector.next);assert.equal(hidden.api.describe().received,0);
hidden.context.document.hidden=false;await drawNative(hidden.engine,witnesses.full.next);
assert.deepEqual(plain(hidden.api.describe().history.at(-1).gelato.newlyCompleted),[2,3,4]);
assert.equal(hidden.api.describe().history.at(-1).gelato.mode,'full');

const restored=await harness({fields:witnesses.collector.fields});
assert.equal(typeof restored.engine.afterCheckpointRestoreV247,'function','Gelato participates in the existing optional presentation restore hook');
Object.assign(restored.engine,decode(witnesses.full.fields));restored.engine.version++;
const afterRestore=nativeState(restored.engine);
assert.equal(restored.engine.afterCheckpointRestoreV247(),undefined);
restored.engine.emit('gelatoFill',witnesses.collector.proof);
assert.equal(restored.api.describe().received,0,'restored snapshots cannot replay a prior award');
assert.deepEqual(nativeState(restored.engine),afterRestore,'restore observer changes no native data');
await drawNative(restored.engine,witnesses.full.next);
assert.deepEqual(plain(restored.api.describe().history.at(-1).gelato.newlyCompleted),[2,3,4]);
restored.advance(500);assert(restored.slot.panel.classList.contains('gelato-v297-award-owned'));
restored.engine.reset();assert(!restored.slot.panel.classList.contains('gelato-v297-award-owned'));
assert.equal(restored.api.describe().active.length,0);assert.equal(restored.api.describe().pending.length,0);
restored.engine.start();
for(const id of [0,1,5,13,17])await drawNative(restored.engine,restored.engine.nodeNumbers[id]);
const lastNative=restored.events.filter(event=>event.phase==='gelatoFill').at(-1),lastCue=restored.api.describe().history.at(-1);
assert.equal(lastCue.gain,lastNative.gain);assert.deepEqual(plain(lastCue.gelato.counts),restored.engine.collectorCounts,'new board reseeds native color counts');

let restoreCalls=0;const forwarding=await harness({originalRestore:function(value){restoreCalls++;assert.equal(this.kind,'gelato');return value+1;}});
assert.equal(forwarding.engine.afterCheckpointRestoreV247(732),733);assert.equal(restoreCalls,1,'an existing native restore hook forwards exactly once');

const reduced=await harness({fields:witnesses.panel.fields,reduced:true});await drawNative(reduced.engine,witnesses.panel.next);reduced.advance(500);
assert(reduced.art.describe().mainPaints>0);assert.equal(reduced.api.describe().maxMainParticles,0,'reduced motion keeps art without extra particles');
reduced.context.document.hidden=true;reduced.listeners.get('visibilitychange')();assert.equal(reduced.frames.size,0);assert.equal(reduced.timers.size,0);
for(const search of ['?downloadWorker=1','?serverSettlementWorker=1']){
 const worker=await harness({search});assert.equal(worker.art,undefined);assert.equal(worker.api,undefined);assert.equal(worker.frames.size,0);
}
console.log('GELATO_V297_AWARDS_PASS',JSON.stringify({nativeWitnesses:results,exactNativeGain:true,immutableColorFlags:true,hiddenRestoreReset:true,forwarding:true,totalNeverFalselyFull:true,mainAndMini:true,compactSugar:true,reducedMotion:true,workerDisabled:true}));

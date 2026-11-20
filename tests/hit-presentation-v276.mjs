/* Contract checks for the real overlay: native event forwarding, inert game
 * state/RNG, checkpoint suppression, actual anchor routing and bounded work. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const source=await fs.readFile(new URL('../assets/hit-presentation-v276.js',import.meta.url),'utf8');
const kinds=['cookie','choco','candy','gelato','winery','popcorn','jelly','stick','castella','dango'];
const copy=x=>JSON.parse(JSON.stringify(x));
function makeHarness({search='',reduced=false}={}){
 let time=100,next=0,draws=0;const frames=new Map(),timers=new Map(),listeners=new Map(),nativeCalls=[];
 const noop=()=>{};
 class Element{
  constructor(tag='div',w=320,h=320){this.tagName=tag.toUpperCase();this.clientWidth=w;this.clientHeight=h;this.width=w;this.height=h;this.hidden=false;this.dataset={};this.children=[];this.parentElement=null;this.className='';this.rect={left:0,top:0,width:w,height:h,right:w,bottom:h};}
  append(el){el.parentElement=this;this.children.push(el);}
  setAttribute(){}
  getBoundingClientRect(){return {...this.rect};}
  querySelector(selector){if(selector==='.mini-wrap')return this.wrap;return this.surface||this.canvas||null;}
  getContext(){return new Proxy({canvas:this,drawImage(){draws++;}},{get:(o,k)=>k in o?o[k]:noop});}
 }
 const media={matches:reduced,addEventListener:(name,fn)=>listeners.set('media:'+name,fn)};
 const states=kinds.map((kind,i)=>({draws:kind==='stick'?[7]:[],cells:Array.from({length:61},(_,id)=>({id,x:id%9-4,y:Math.floor(id/9)-3})),sources:[3],zones:[{anchor:3,cells:[3,4]}],lastZone:1,wave:[[3],[4]],placed:[27],flipSteps:[{id:28,dx:1,dy:0}],flipped:[28],lastCell:8,newLines:[0],numbers:Array.from({length:25},(_,n)=>n+1)}));
 const engines=kinds.map((kind,i)=>({...(i?{kind}:{}),version:1,processed:0,paused:false,presentationRate:1,rows:10,state:states[i],fx:kind==='winery'?{source:3}:null,
  trace:kind==='popcorn'?{port:2,waves:[[1,2]],clear:false}:kind==='jelly'?{index:12,number:7,ball:1,opened:[[12,11],[12,13]],wave:[],newLines:[]}:null,
  emit(phase,detail){nativeCalls.push({kind,phase,detail});if(phase==='nativeError')throw Error('native-only');return 317;},
  enqueueBatch(numbers){if(kind==='castella'||kind==='dango'){for(const n of numbers){if(this.state.draws.includes(n))continue;this.state={...this.state,draws:[...this.state.draws,n]};this.emit('settled');}}return 911;},
  afterCheckpointRestoreV247(){this.emit('settled');return 733;}
 }));
 const slots=engines.map((engine,i)=>{
  const panel=new Element('div',640,520),surfaceParent=new Element('div'),surface=new Element('canvas'),tab=new Element('div',160,160),wrap=new Element('div',160,160),miniCanvas=new Element('canvas',160,160),board=new Element('div');
  panel.hidden=i!==0;panel.append(surfaceParent);surfaceParent.append(surface);surfaceParent.append(board);panel.surface=surface;
  tab.wrap=wrap;tab.append(wrap);wrap.append(miniCanvas);tab.surface=miniCanvas;
  return {i,engine,panel,tab,miniCanvas,board,chocoCanvas:surface,candyCanvas:surface};
 });
 const app={engines,phase:'playing',token:1,paused:false,enabled:kinds.map(()=>true),random:()=>{throw Error('game RNG must never be sampled');}};
 const projection=(w,h,mini,a)=>({x:(a.id%5+.5)/5*w,y:(Math.floor(a.id/5)%5+.5)/5*h,r:Math.min(w,h)*.08});
 const window={devicePixelRatio:1,SweetsLineup:{ids:kinds},SweetsBoardArtV275:{sprite:()=>({width:24,height:24})},addEventListener:noop,
  GelatoPrism:{hitGeometryV276:projection},WineryPyramid:{hitGeometryV276:projection},PopcornView:{hitGeometryV276:projection,hitSequenceV276:tr=>tr.waves.map((ids,index)=>({ids,index,at:625+index*480}))},JellyView:{hitGeometryV276:projection,oddsRevealAt:()=>400},
  PartyCastellaView:{geometry:()=>({panW:10,panH:8})},DangoBingoView:{geometry:(w,h)=>({centers:Array.from({length:61},(_,id)=>projection(w,h,false,{id})),radius:20})},DangoBingoRules:{geometryFor:()=>({lines:[{cells:[0,1,2]}]})}
 };
 const context=vm.createContext({window,app,slots,active:0,inView:true,motionReduced:false,location:{search},URLSearchParams,console,
  document:{hidden:false,createElement:tag=>new Element(tag),addEventListener:(n,f)=>listeners.set(n,f)},
  performance:{now:()=>time},matchMedia:()=>media,requestAnimationFrame:cb=>{const id=++next;frames.set(id,cb);return id;},cancelAnimationFrame:id=>frames.delete(id),setTimeout:cb=>{const id=++next;timers.set(id,cb);return id;},clearTimeout:id=>timers.delete(id),
  chocoBoardLayout:(w,h)=>({left:90,top:57,w:25,h:25}),sixLayout:()=>({step:35,radius:17.5}),sixXY:(r,c)=>({x:25+c*35,y:22+r*29}),sixRowWidth:()=>8
 });
 vm.runInContext(source,context);
 const advance=ms=>{for(let n=0;n<ms;n+=16){time+=16;const callbacks=[...frames.values()];frames.clear();for(const cb of callbacks)cb(time);}};
 return {context,window,app,slots,engines,nativeCalls,frames,timers,media,listeners,advance,draws:()=>draws,api:window.SweetsHitPresentationV276};
}
const h=makeHarness();
assert.equal(h.engines[0].kind,undefined,'real Cookie engines have no kind property');
assert.deepEqual(copy(h.api.describe().attached),kinds);
const immutable=()=>h.engines.map(e=>copy({state:e.state,fx:e.fx,trace:e.trace,processed:e.processed,version:e.version}));
const before=immutable();
const events=[
 [0,'hit',{number:7,cells:[[3,4]]}],
 [1,'canyonSoften',{number:7,impacts:[{r:3,c:2}],layer:1}],
 [2,'pyramidHit',{numbers:[7],cells:[[3,4]]}],
 [3,'gelatoHit',{number:7,index:9,newHit:true}],
 [4,'wineryPour',{number:7}],
 [5,'popcornDraw',{number:7}],
 [6,'jellyPour',{}],
 [7,'flipping',{}]
];
for(const [i,phase,ev] of events)assert.equal(h.engines[i].emit(phase,ev),317);
assert.deepEqual(immutable(),before,'visual event routing cannot alter native state');
assert.equal(h.nativeCalls.length,events.length,'each native event forwarded exactly once');
assert.equal(h.api.describe().history[0].mainPoints[0].x,180);
assert.equal(h.api.describe().history[0].mainPoints[0].y,140);
for(const i of [8,9]){
 const state=copy(h.engines[i].state);assert.equal(h.engines[i].enqueueBatch([7]),911);
 assert.deepEqual(copy(h.engines[i].state),{...state,draws:[7]},'only the native accepted HIT changes state');
}
assert.deepEqual(Object.keys(copy(h.api.describe().eventCounts)).sort(),kinds.slice().sort());
for(const event of h.api.describe().history)for(const p of [...event.mainPoints,...event.miniPoints])assert(p&&Number.isFinite(p.x+p.y+p.r)&&p.r>0,'all actual anchors project');
const received=h.api.describe().received;
h.engines[0].emit('hit',{number:7,cells:[[3,4]]});
assert.equal(h.api.describe().received,received,'duplicate presentation suppressed');
for(const i of [8,9]){
 h.engines[i].emit('settled');h.engines[i].enqueueBatch([7]);
 assert.equal(h.engines[i].afterCheckpointRestoreV247(),733);
 h.engines[i].emit('settled');
}
assert.equal(h.api.describe().received,received,'restore and FREE/settled repaint cannot replay HIT');
h.engines[9].enqueueBatch([8]);assert.equal(h.api.describe().received,received+1,'new accepted HIT re-arms after restore');
const snapshot=h.api.describe();snapshot.history[0].anchors[0].r=999;
assert.equal(h.api.describe().history[0].anchors[0].r,3,'diagnostics have no writable live references');
assert.throws(()=>h.engines[0].emit('nativeError'),/native-only/);
assert.equal(h.api.describe().errors,0,'native errors retain original behavior');
const pausedAt=h.api.describe().received;h.app.paused=true;
h.engines[0].emit('hit',{number:9,cells:[[1,1]]});assert.equal(h.api.describe().received,pausedAt);
h.app.paused=false;
for(let n=0;n<90;n++)h.engines[0].emit('link',{number:n,cells:Array.from({length:64},(_,id)=>[id>>3,id%8]),depth:7});
h.advance(400);
let status=h.api.describe();assert(status.maxQueued<=24);assert(status.maxMainParticles<=96);assert(status.maxMiniParticles<=16);assert(h.draws()>0);
assert(status.history.length<=64);assert.equal(status.errors,0);
h.context.document.hidden=true;h.listeners.get('visibilitychange')();assert.equal(h.frames.size,0);assert.equal(h.timers.size,0);assert.equal(h.api.describe().active.length,0);
h.engines[0].emit('hit',{number:22,cells:[[2,2]]});assert.equal(h.frames.size,0,'hidden page creates no work');
const low=makeHarness({reduced:true});low.engines[0].emit('hit',{number:1,cells:[[1,1]]});low.advance(150);
assert.equal(low.api.describe().maxMainParticles,0);assert.equal(low.api.describe().maxMiniParticles,0);
assert.equal(low.api.describe().active[0].bursts[0].duration,300);
for(const search of ['?downloadWorker=1','?serverSettlementWorker=1']){const worker=makeHarness({search});assert.equal(worker.api,undefined);assert.equal(worker.frames.size,0);assert.equal(worker.nativeCalls.length,0);}
console.log(JSON.stringify({ok:true,games:kinds,kindlessCookie:true,nativeForwarding:true,statePreserved:true,gameRngCalls:0,duplicateAndRestoreSuppressed:true,reducedMotion:true,workerDisabled:true,mainParticles:status.maxMainParticles,miniParticles:status.maxMiniParticles,maxQueued:status.maxQueued}));

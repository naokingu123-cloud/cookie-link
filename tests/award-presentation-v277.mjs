/* Presentation contract tests. The native methods are deliberately observable:
 * forwarding, return values, throws, state and RNG must remain unchanged. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const source=await fs.readFile(new URL('../assets/award-presentation-v277.js',import.meta.url),'utf8');
const kinds=['cookie','choco','candy','gelato','winery','popcorn','jelly','stick','castella','dango'],plain=v=>JSON.parse(JSON.stringify(v));
function harness({search='',reduced=false}={}){
 let time=100,next=0,images=0;const frames=new Map(),timers=new Map(),listeners=new Map(),nativeCalls=[],audioCalls=[];
 const noop=()=>{},gradient={addColorStop:noop};
 class Element{
  constructor(tag='div',w=320,h=320){Object.assign(this,{tagName:tag.toUpperCase(),clientWidth:w,clientHeight:h,width:w,height:h,hidden:false,dataset:{},children:[],parentElement:null,className:'',rect:{left:0,top:0,width:w,height:h,right:w,bottom:h},classList:{toggle:noop}});}
  append(e){e.parentElement=this;this.children.push(e);}setAttribute(){}getBoundingClientRect(){return {...this.rect};}
  querySelector(selector){if(selector==='.mini-wrap')return this.wrap;return this.surface||this.canvas||null;}
  getContext(){return new Proxy({canvas:this,globalAlpha:1,drawImage(){images++;},measureText:text=>({width:text.length*12}),createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(o,k)=>k in o?o[k]:noop});}
 }
 const media={matches:reduced,addEventListener:(name,fn)=>listeners.set('media:'+name,fn)};
 const states=kinds.map((kind,i)=>({draws:i===8?[1,2,3,4,5,6,7]:i===9?[1,2,3,4,5,6]:[],phase:'playing',cells:Array.from({length:61},(_,id)=>({id,x:(id%9-4)*.4,y:(Math.floor(id/9)-3)*.4})),numbers:Array.from({length:25},(_,n)=>n+1),
  lines:[0],oddsMultiplier:1,payoutVersion:232,popped:140,clears:0,firstPopAward:120,placed:[27],flipped:[28,29],flipSteps:[{id:28,dx:1,dy:0,distance:1},{id:29,dx:1,dy:0,distance:2}],turnTotals:[20],reversalThisMove:false,
  baked:Array(61).fill(true),bakedCount:61,totalHundredths:20000,newLines:[],completedLines:[],newHighestRoles:[],highestRoles:[],lineCounts:{6:2},freeCommitted:false,freeBudget:6}));
 const engines=kinds.map((kind,i)=>({...(i?{kind}:{}),version:1,processed:states[i].draws.length,paused:false,presentationRate:1,rows:10,state:states[i],totalHundredths:20,maxLink:4,roundBet:3000,filled:new Set([0,1,2]),liveBoard:true,
  trace:kind==='popcorn'?{count:42,waves:[[0,1],[2,3]],clear:false}:kind==='jelly'?{newLines:[0],ball:6}:null,
  emit(phase,detail){nativeCalls.push({kind,phase,detail});if(phase==='nativeError')throw Error('native-only');return 317;},
  enqueueBatch(numbers){for(const n of numbers){if(this.state.draws.includes(n))continue;if(kind==='castella'||kind==='dango'){
   this.state={...this.state,draws:[...this.state.draws,n],phase:kind==='castella'?'done':'playing',newLines:kind==='dango'?[0]:[],completedLines:kind==='dango'?[0]:[],newHighestRoles:kind==='dango'?[6]:[],highestRoles:kind==='dango'?[6]:[],highestRole:true};this.emit('settled');
  }}return 911;},
  finishThinkingV251(){this.state={...this.state,phase:'playing',freeCommitted:true,completedLines:[0],highestRoles:[6]};this.animationLines=[0];this.emit('settled');return this.state;},
  afterCheckpointRestoreV247(){this.emit('settled');return 733;}
 }));
 const slots=engines.map((engine,i)=>{const panel=new Element('div',640,520),parent=new Element('div'),surface=new Element('canvas'),board=new Element('div'),tab=new Element('div',160,160),wrap=new Element('div',160,160),miniCanvas=new Element('canvas',160,160);panel.hidden=i!==0;panel.append(parent);parent.append(surface);parent.append(board);panel.surface=surface;tab.wrap=wrap;tab.append(wrap);wrap.append(miniCanvas);tab.surface=miniCanvas;return {i,engine,panel,tab,miniCanvas,board,chocoCanvas:surface,candyCanvas:surface};});
 const app={engines,phase:'playing',token:1,paused:false,enabled:kinds.map(()=>true),locked:kinds.map(()=>3000),random:()=>{throw Error('game RNG sampled by presentation');}};
 const projection=(w,h,mini,a)=>({x:(a.id%5+.5)/5*w,y:(Math.floor(a.id/5)%5+.5)/5*h,r:Math.min(w,h)*.07});
 const sprite={width:900,height:600,naturalWidth:900,naturalHeight:600};
 const window={devicePixelRatio:1,SweetsLineup:{ids:kinds},SweetsAwardArtV277:{sprite:()=>sprite,layout:()=>({x:.17,y:.34,w:.66,h:.4}),ready:Promise.resolve()},SweetsAudioV277:{award:cue=>{audioCalls.push(plain(cue));return true;}},addEventListener:(n,f)=>listeners.set('window:'+n,f),
  GelatoPrism:{hitGeometryV276:projection,awardFaceNodesV277:()=>[0,1,2]},WineryPyramid:{hitGeometryV276:projection},PopcornView:{hitGeometryV276:projection,hitSequenceV276:tr=>tr.waves.map((ids,index)=>({ids,index,at:400+index*150}))},PopcornEngine:{payout:(count,clears)=>Math.max(0,count-120)+clears*100},
  JellyView:{hitGeometryV276:projection,lineRevealAt:()=>300},JellyRules:{LINES:[[0,1,2,3,4]],payout:count=>count*16},PartyCastellaView:{geometry:()=>({panW:5,panH:4})},DangoBingoView:{geometry:(w,h)=>({centers:Array.from({length:61},(_,id)=>projection(w,h,false,{id})),radius:20})},DangoBingoRules:{geometryFor:()=>({lines:[{id:0,length:6,cells:[0,1,2]}]}),highestRolesFor:s=>s.highestRoles||[]}
 };
 const safeMath=Object.create(Math);safeMath.random=()=>{throw Error('presentation RNG must be deterministic');};
 class MockImage{constructor(){this.width=this.naturalWidth=1122;this.height=this.naturalHeight=1402;this.onload=null;this.onerror=null;}set src(value){this._src=value;this.onload?.();}}
 let context;context=vm.createContext({window,app,slots,active:0,inView:true,motionReduced:false,location:{search},URLSearchParams,console,Image:MockImage,Math:safeMath,
  document:{hidden:false,createElement:tag=>new Element(tag),addEventListener:(n,f)=>listeners.set(n,f)},performance:{now:()=>time},matchMedia:()=>media,
  requestAnimationFrame:fn=>{const id=++next;frames.set(id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id),setTimeout:(fn,ms)=>{const id=++next;timers.set(id,{fn,at:time+ms});return id;},clearTimeout:id=>timers.delete(id),
  select:i=>{context.active=i;slots.forEach((s,n)=>s.panel.hidden=n!==i);return 811;},chocoBoardLayout:()=>({left:90,top:57,w:25,h:25}),sixLayout:()=>({step:35,radius:17.5}),sixXY:(r,c)=>({x:25+c*35,y:22+r*29}),sixRowWidth:()=>8
 });vm.runInContext(source,context);
 const advance=ms=>{for(let n=0;n<ms;n+=16){time+=16;const callbacks=[...frames.values()];frames.clear();for(const cb of callbacks)cb(time);for(const [id,t]of [...timers])if(t.at<=time){timers.delete(id);t.fn();}}};
 return {context,window,app,slots,engines,nativeCalls,audioCalls,frames,timers,media,listeners,advance,images:()=>images,api:window.SweetsAwardsV277};
}
const h=harness();assert.equal(h.engines[0].kind,undefined);assert.deepEqual(plain(h.api.describe().attached),kinds);
const snapshot=()=>h.engines.map(e=>plain({state:e.state,trace:e.trace,total:e.totalHundredths,processed:e.processed,version:e.version})),before=snapshot();
const events=[
 [0,'link',{number:7,gain:20,depth:2,newRecord:true,groups:[{cells:[[3,3],[3,4],[4,4],[4,3]]}]}],
 [1,'canyonCollect',{number:7,gain:10,items:[{r:3,c:2,gain:10}]}],
 [2,'pyramidAward',{number:7,gain:30,winMedals:900,forms:[{type:'triangle',cells:[[3,3],[4,3],[4,4]]}]}],
 [3,'gelatoFill',{number:7,newFaces:[0],gain:100,full:false}],
 [4,'wineryAward',{number:7,gain:420,full:15,mix:3,justFilled:[3,4]}],
 [5,'popcornDraw',{number:7}],
 [6,'jellyPour',{}],
 [7,'flipping',{}]
];
for(const [i,phase,detail]of events)assert.equal(h.engines[i].emit(phase,detail),317);
assert.deepEqual(snapshot(),before,'observer preserves state, payout, native trace and counters');assert.equal(h.nativeCalls.length,8,'native forwarding exactly once');
for(const i of [8,9]){const before=plain(h.engines[i].state);assert.equal(h.engines[i].enqueueBatch([8]),911);assert.deepEqual(plain(h.engines[i].state.draws),[...before.draws,8]);}
assert.deepEqual(Object.keys(plain(h.api.describe().eventCounts)).sort(),kinds.slice().sort());
let received=h.api.describe().received;h.engines[0].emit(...events[0].slice(1));assert.equal(h.api.describe().received,received,'duplicate exact award ignored');
for(const i of [8,9]){h.engines[i].emit('settled');h.engines[i].enqueueBatch([8]);assert.equal(h.engines[i].afterCheckpointRestoreV247(),733);h.engines[i].emit('settled');}
assert.equal(h.api.describe().received,received,'repaint, duplicate draw and checkpoint restore do not replay award');
h.engines[9].enqueueBatch([9]);assert.equal(h.api.describe().received,received+1,'a new native draw re-arms after restore');
assert.throws(()=>h.engines[0].emit('nativeError'),/native-only/);assert.equal(h.api.describe().errors,0,'native exception behavior retained');
h.advance(1200);assert(h.images()>0);let status=h.api.describe();assert(status.artReady&&status.imageArtReady&&status.mainImages>0&&status.miniImages>0);assert.equal(h.audioCalls.length,1,'only selected game owns its fanfare');
assert.equal(h.audioCalls[0].game,'cookie');assert(h.api.owns('cookie'));assert(!h.api.owns('jelly'));
for(let i=0;i<8;i++){assert.equal(h.context.select(i),811);assert(h.api.describe().mainImages>0);}
assert.equal(h.audioCalls.length,1,'changing selection cannot replay a fanfare');
for(const event of status.history)for(const line of event.paths)for(const p of [...line.mainPoints,...line.miniPoints])assert(p&&Number.isFinite(p.x+p.y+p.r)&&p.r>0,'every native geometry anchor projects');
const first=plain(h.api.describe().history[0].paths[0].mainPoints[0]);status.history[0].paths[0].mainPoints[0].x=999;assert.deepEqual(plain(h.api.describe().history[0].paths[0].mainPoints[0]),first,'diagnostics cannot mutate live paths');
const pausedAt=h.api.describe().received;h.app.paused=true;h.engines[0].emit('allclear',{number:21});assert.equal(h.api.describe().received,pausedAt);h.app.paused=false;
// Editable FREE placement is quiet; final commit is a genuine separate event.
const free=harness();free.context.select(9);free.engines[9].state={...free.engines[9].state,phase:'placing',newLines:[0],completedLines:[0]};free.engines[9].emit('settled');assert.equal(free.api.describe().received,0);
free.engines[9].finishThinkingV251({reason:'deadline'});assert.equal(free.api.describe().received,1);assert.equal(free.api.describe().history[0].tier,4);
for(const reason of ['worker','thinking-restore']){const restored=harness();restored.engines[9].state.phase='placing';restored.engines[9].finishThinkingV251({reason});assert.equal(restored.api.describe().received,0,'automatic restore/worker commit has no cue');}
// Feed the observer real progressive timelines. Repeated lines have increasing
// payouts, and a 333-medal BET exposes the core's cumulative rounding boundary.
const sixRules=require('./sixdrop-v247-fixture.cjs').R;
function observeSixTimeline(h,plan,number){
 const engine=h.engines[2],awards=[];
 engine.state=plan.state;engine.processed=plan.state.processed;
 for(const stage of plan.timeline){
  engine.pyramid=stage.grid;
  const event={numbers:[number],...stage},before=plain({state:engine.state,event}),received=h.api.describe().received;
  engine.emit(stage.phase,event);
  assert.deepEqual(plain({state:engine.state,event}),before,'award observes the real Six state/event without changing either');
  if(stage.phase==='pyramidShape')assert.equal(h.api.describe().received,received,'shape detection cannot duplicate the committed award');
  if(stage.phase==='pyramidAward'&&stage.forms.length){
   assert.equal(h.api.describe().received,received+1);
   const cue=h.api.describe().history.at(-1);
   assert.equal(cue.phase,'pyramidAward');assert.equal(cue.gain,stage.gain);
   assert.equal(cue.win,stage.winMedals,'badge uses the exact newly awarded medals, including cumulative rounding');
   assert.equal(cue.total,false);assert.equal(cue.paths.length,stage.forms.length);
   assert.equal(cue.tier,stage.gain>=1000?3:stage.gain>=300?2:1,'tier follows the actual cumulative award');
   awards.push({win:cue.win,types:stage.forms.map(f=>f.type),counts:stage.counts});
  }
 }
 assert.equal(h.api.describe().errors,0);return awards;
}
const cumulative=harness();cumulative.context.select(2);cumulative.app.locked[2]=333;cumulative.engines[2].roundBet=333;
let sixState=sixRules.newGame({bet:333,rate:90,seed:1});const actualLines=[];
for(const number of [19,1,2,3,16,8,18,13]){
 const plan=sixRules.hit(sixState,number,{trace:true});
 for(const award of observeSixTimeline(cumulative,plan,number))if(award.types.length===1&&award.types[0]==='line')actualLines.push(award.win);
 sixState=plan.state;
}
assert.deepEqual(actualLines.slice(0,3),[33,66,100],'first, second and third genuine lines use progressive and rounded awards');
assert.equal(actualLines.length,8);
for(const witness of [{seed:5,number:11,type:'triangle',win:100},{seed:77,number:23,type:'hexagon',win:199}]){
 const sample=harness();sample.context.select(2);sample.app.locked[2]=333;sample.engines[2].roundBet=333;
 const state=sixRules.newGame({bet:333,rate:90,seed:witness.seed}),plan=sixRules.hit(state,witness.number,{trace:true});
 const award=observeSixTimeline(sample,plan,witness.number).find(a=>a.types.includes(witness.type));
 assert(award,'the seeded production rules actually form '+witness.type);assert.equal(award.win,witness.win);
}
// A bounded queue prioritizes a real top role over a stream of ordinary awards.
const priority=harness();priority.engines[0].emit('link',events[0][2]);priority.advance(400);priority.engines[0].emit('allclear',{number:8});priority.advance(32);assert.equal(priority.api.describe().active[0].tier,4);
for(let n=0;n<80;n++)priority.engines[0].emit('link',{...events[0][2],number:n+10,groups:Array.from({length:18},()=>({cells:[[0,0],[0,1],[1,1],[1,0]]}))});
priority.advance(200);status=priority.api.describe();assert.equal(status.active[0].tier,4);assert(status.maxPending<=status.limits.pendingPerGame);assert(status.history.length<=64);assert(status.maxMainPaths<=status.limits.mainPaths);assert(status.maxMiniPaths<=status.limits.miniPaths);assert(status.maxMainParticles<=status.limits.mainParticles);assert(status.maxMiniParticles<=status.limits.miniParticles);assert.equal(status.errors,0);
const age=status.active[0].age;priority.app.paused=true;priority.advance(600);assert.equal(priority.api.describe().active[0].age,age,'paused award does not consume its display time');
priority.app.paused=false;priority.app.token++;priority.advance(160);assert.equal(priority.api.describe().active.length,0);assert.equal(priority.api.describe().pending.length,0,'new round clears pending awards');
h.context.document.hidden=true;h.listeners.get('visibilitychange')();assert.equal(h.frames.size,0);assert.equal(h.timers.size,0);assert.equal(h.api.describe().active.length,0);
h.engines[0].emit('allclear',{number:24});assert.equal(h.frames.size,0,'hidden document does not create render work');
const low=harness({reduced:true});low.engines[0].emit('link',events[0][2]);low.advance(500);assert(low.api.describe().mainImages>0,'reduced motion preserves the substantial award image');assert.equal(low.api.describe().maxMainParticles,0);assert.equal(low.api.describe().maxMiniParticles,0);
for(const search of ['?downloadWorker=1','?serverSettlementWorker=1']){const worker=harness({search});assert.equal(worker.api,undefined);assert.equal(worker.frames.size,0);assert.equal(worker.nativeCalls.length,0);}
console.log(JSON.stringify({ok:true,games:kinds,nativeForwarding:true,stateAndPayoutPreserved:true,gameRngCalls:0,duplicateAndRestoreSuppressed:true,freeCommit:true,sixProgressiveAwards:true,sixActualMedalRounding:true,priorityAndBounds:true,reducedImages:true,workerDisabled:true}));

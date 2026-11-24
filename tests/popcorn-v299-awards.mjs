/* Real native traces -> the actual shared semantic adapter. These CPU tests
 * verify exact receipt amounts and immutable event facts, not raster pixels.
 * Generated image/layout evidence belongs to the browser/native-render tests. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {pathToFileURL} from 'node:url';
import {buildPopcornFixtures,replayPopcornFixture,loadPopcorn,nativeCore,plain} from './popcorn-v299-fixtures.mjs';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
function section(source,start,end){
 const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
 assert(a>=0&&b>a,'actual production source boundaries exist: '+start+' / '+end);
 return source.slice(a,b);
}
export function loadPopcornOwner({bet=3000}={}){
 const owner=read('assets/award-presentation-v277.js'),view=read('assets/popcorn-view.js');
 const timing=view.match(/^\s*const LIGHT=.*;$/m)?.[0],sequence=view.match(/^\s*const hitSequenceV276=.*;$/m)?.[0];
 assert(timing&&sequence,'the native wave clock and hit sequence remain accessible');
 const hitSequenceV276=new Function(timing+'\n'+sequence+'\nreturn hitSequenceV276;')();
 const K=loadPopcorn(nativeCore(),{forbidAmbientRandom:true});
 const app={locked:[bet]},window={PopcornEngine:K,PopcornView:{hitSequenceV276},SweetsLineup:{ids:['popcorn']}};
 const safeMath=Object.create(Math);safeMath.random=()=>{throw Error('presentation sampled ambient RNG');};
 const context=vm.createContext({window,app,console,Math:safeMath,medalWin:(wager,hundredths)=>Math.floor(wager*hundredths/100)});
 const program=[section(owner,'const clamp=','function target('),section(owner,'function semantic(','function recordFor('),
  section(owner,'function ownsClass(','function clear('),'globalThis.__popcornOwner={semantic,popcornSnapshot,ownsClass};'].join('\n');
 vm.runInContext(program,context,{filename:'production-popcorn-semantic-v299.js'});
 return {...context.__popcornOwner,window,app,K,hitSequenceV276,source:owner};
}
function element(){
 const classes=new Set();return {dataset:{},classes,classList:{toggle(name,on){on?classes.add(name):classes.delete(name);},contains:name=>classes.has(name)}};
}
function nativeSlot(step,bet){
 return {i:0,engine:{kind:'popcorn',state:plain(step.after),trace:plain(step.trace),roundBet:bet,processed:step.ball-1,accepted:step.ball},panel:element(),tab:element()};
}
function inspect(h,step,bet){
 h.app.locked[0]=bet;const slot=nativeSlot(step,bet),before=structuredClone(slot.engine);
 const cue=h.semantic(slot,{phase:'popcornDraw',number:step.number},{});
 assert.deepEqual(slot.engine,before,'creating the actual semantic cue changes no native state or trace');
 return {slot,cue};
}
function verifyCue(h,step,bet){
 const {cue,slot}=inspect(h,step,bet),want=step.oracle;
 if(!want.award){assert.equal(cue,null,'zero-gain hits and UP are not monetary awards');return null;}
 assert(cue);assert.equal(cue.game,'popcorn');assert.equal(cue.phase,'popcornDraw');assert.equal(cue.number,step.number);
 assert.equal(cue.gain,want.gain,'native hundredths gain is preserved');assert.equal(cue.total,false);assert.equal(cue.retained,false);
 assert.equal(cue.win,want.nativeWinDelta,'shown WIN is the actual rounded cumulative delta');
 assert.equal(cue.tier,want.clear?4:want.gain>=1000?3:want.gain>=300?2:1,'legacy audio tier remains based on the same gain/clear event');
 assert.equal(cue.highest,want.clear);assert.equal(cue.kind,want.clear?'clear':'bonus');
 assert.equal(cue.label,want.clear?'ALL POP!':want.count+' POP!');assert.equal(cue.detail,want.chains+'連鎖 ・ 合計 '+want.popped+'個');
 const sequence=h.hitSequenceV276(step.trace),expectedDelay=625+(want.chains-1)*480;
 assert.equal(sequence.at(-1).at,expectedDelay,'the unmodified native wave clock supplies the delay');assert.equal(cue.delay,Math.min(15000,expectedDelay));
 const nativeCells=[...new Set(step.trace.waves.flat())],sample=nativeCells.length<=12?nativeCells:Array.from({length:12},(_,i)=>nativeCells[Math.round(i*(nativeCells.length-1)/11)]);
 assert.deepEqual(plain(cue.paths).map(p=>p.anchors[0].id),sample,'existing winning-path sampling is unchanged');
 assert(cue.paths.every(p=>p.cell&&p.closed&&p.anchors.length===1));
 const data=cue.popcorn;assert(data,'the real Popcorn event has a dedicated snapshot');
 for(const key of ['count','chains','popped','clears','clear','all','boost','oldLevel','newLevel','nativeOldWin','nativeTotalWin','nativeWinDelta'])assert.equal(data[key],want[key],key);
 assert.equal(data.number,step.number);assert.equal(data.firstPopAward,step.after.firstPopAward);
 assert.deepEqual(plain(data.waveCounts),want.waveCounts);assert.deepEqual(plain(data.grades),want.grades);
 assert(Object.isFrozen(data)&&Object.isFrozen(data.waveCounts)&&Object.isFrozen(data.grades));
 assert.notEqual(data.waveCounts,slot.engine.trace.waves);assert.throws(()=>{data.count=999;},TypeError);assert.throws(()=>{data.grades[0]=999;},TypeError);
 const captured=JSON.stringify(data);
 slot.engine.state.popped+=99;slot.engine.state.clears+=9;slot.engine.trace.waves[0].length=0;slot.engine.trace.before[0]=null;
 assert.equal(JSON.stringify(data),captured,'later native animation/state changes cannot rewrite the queued event facts');
 return cue;
}

export function testPopcornAwards(){
 const fixtures=buildPopcornFixtures(),h=loadPopcornOwner(),events=[];
 for(const fixture of fixtures)for(const step of fixture.steps){
  const cue=verifyCue(h,step,fixture.bet);
  if(cue)events.push({fixture:fixture.id,ball:step.ball,gain:cue.gain,win:cue.win,clears:cue.popcorn.clears,chains:cue.popcorn.chains});
  if(step.oracle.boost){
   const status=h.popcornSnapshot(step.after,step.trace,step.number);
   assert(status.boost);assert.equal(status.count,0);assert.equal(status.oldLevel,step.before.level);assert.equal(status.newLevel,step.after.level);
  }
 }
 const low=fixtures.find(f=>f.id==='pops-lowbet').steps[4],lowCue=verifyCue(h,low,5);
 assert.deepEqual([lowCue.gain,lowCue.win,low.oracle.legacyWin],[90,5,4]);
 const grand=replayPopcornFixture('clear-ladder',{bet:5}).steps[5],grandCue=verifyCue(h,grand,5);
 assert.deepEqual([grandCue.gain,grandCue.win,grand.oracle.legacyWin],[2090,105,104]);assert.equal(grandCue.tier,4);
 const large=replayPopcornFixture('clear-ladder',{bet:300000}).steps[7],largeCue=verifyCue(h,large,300000);
 assert.equal(largeCue.win,61350000);assert.equal(largeCue.popcorn.nativeTotalWin,84600000);

 // Compatibility-only unit inputs: these deliberately malformed/old traces
 // are not claimed as reachable fixtures. They retain the prior cue fallback.
 const invalidAmounts=[
  {name:'missing old',oldWin:undefined},{name:'missing total',win:undefined},{name:'null old',oldWin:null},{name:'null total',win:null},
  {name:'NaN old',oldWin:NaN},{name:'infinite total',win:Infinity},{name:'fractional total',win:8.5},{name:'negative old',oldWin:-1},
  {name:'decreasing total',oldWin:8,win:3},{name:'unsafe total',win:Number.MAX_SAFE_INTEGER+1},{name:'numeric strings',oldWin:'3',win:'8'}
 ];
 for(const {name,...override} of invalidAmounts){
  h.app.locked[0]=5;const slot=nativeSlot(low,5);Object.assign(slot.engine.trace,override);
  const cue=h.semantic(slot,{phase:'popcornDraw',number:low.number},{});
  assert.equal(cue.win,low.oracle.legacyWin,name+' falls back to the old hundredths conversion');assert.equal(cue.popcorn.nativeWinDelta,null);
  assert.equal(cue.gain,low.oracle.gain);assert.equal(cue.tier,lowCue.tier);assert.equal(cue.delay,lowCue.delay);
 }
 const oldSlot=nativeSlot(low,5);delete oldSlot.engine.trace.oldWin;delete oldSlot.engine.trace.win;delete oldSlot.engine.trace.before;
 const old=h.semantic(oldSlot,{phase:'popcornDraw',number:low.number},{});
 assert.equal(old.win,4);assert.deepEqual(plain(old.popcorn.grades),[0,0,0,0,0,0],'legacy traces without artwork grades remain renderable');
 const zeroSlot=nativeSlot(low,5);Object.assign(zeroSlot.engine.trace,{oldWin:0,win:0});
 const zero=h.semantic(zeroSlot,{phase:'popcornDraw',number:low.number},{});
 assert.equal(zero.win,0,'valid native zero must not be treated as missing and fall back to a positive amount');
 assert.equal(zero.popcorn.nativeWinDelta,0);assert.equal(zero.gain,90);
 for(const phase of ['ready','settled','complete'])assert.equal(h.semantic(nativeSlot(low,5),{phase,number:low.number},{}),null);

 // Only current loaded artwork owns the center. A queued cue or failed image
 // leaves the existing native all-clear text available; clearing restores it.
 const slot={panel:element(),tab:element()},record={slot,current:null,pending:[lowCue]};
 h.window.PopcornAwardV299={loaded:true};h.ownsClass(record,true);assert(!slot.panel.classes.has('popcorn-v299-award-owned'));
 record.current=lowCue;h.ownsClass(record,true);assert(slot.panel.classes.has('popcorn-v299-award-owned'));
 h.window.PopcornAwardV299.loaded=false;h.ownsClass(record,true);assert(!slot.panel.classes.has('popcorn-v299-award-owned'));
 h.window.PopcornAwardV299.loaded=true;h.ownsClass(record,false);assert(!slot.panel.classes.has('popcorn-v299-award-owned'));
 return {nativeDraws:24,monetaryCues:events.length,events,rounding5:{pop:[lowCue.win,low.oracle.legacyWin],thirdClear:[grandCue.win,grand.oracle.legacyWin]},
  largeWin:largeCue.win,legacyFallbacks:invalidAmounts.length+1,immutable:true,nativeGainTierTiming:true,currentArtworkOwnership:true};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 console.log('POPCORN_V299_AWARDS_PASS',JSON.stringify(testPopcornAwards()));
}
